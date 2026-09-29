"""
interactive.py
==============
Bieu do tuong tac (plotly): 3D (be mat lai suat, quy dao nhan to NS, IRF, Probit) va 2D co
thanh keo/zoom/hover. Chi doc file da luu (data/, outputs/) -> chay doc lap sau pipeline:
    python scripts/make_interactive.py
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from . import config

_TEMPLATE = "plotly_white"


def _month_index(idx) -> pd.DatetimeIndex:
    return pd.PeriodIndex(idx, freq="M").to_timestamp() if not isinstance(idx, pd.DatetimeIndex) else idx


_CAMERA = dict(eye=dict(x=1.7, y=-1.7, z=0.8))
_ASPECT = dict(x=1, y=1.8, z=0.7)


def _recession_shapes(rec: pd.Series, y0=0, y1=1, yref="paper"):
    """Cac hinh chu nhat xam cho tung dot suy thoai (rec: Series 0/1 index DatetimeIndex thang)."""
    rec = rec.dropna().astype(int)
    shapes, start = [], None
    for d, v in rec.items():
        if v == 1 and start is None:
            start = d
        if v == 0 and start is not None:
            shapes.append(dict(type="rect", x0=start, x1=d, y0=y0, y1=y1, yref=yref,
                               fillcolor="rgba(120,120,120,0.22)", line_width=0, layer="below"))
            start = None
    if start is not None:
        shapes.append(dict(type="rect", x0=start, x1=rec.index[-1], y0=y0, y1=y1, yref=yref,
                           fillcolor="rgba(120,120,120,0.22)", line_width=0, layer="below"))
    return shapes


# ------------------------------------------------------------------ RQ1: 3D
def fig_yield_surface(yields: pd.DataFrame, series: dict | None = None) -> go.Figure:
    """Be mat lai suat quan sat: ky han x thoi gian x lai suat (cuoi thang, khong noi suy)."""
    series = series or config.NS_SERIES
    codes = list(series)
    tau = np.array([series[c] for c in codes], dtype=float)
    m = yields[codes].resample("ME").last().dropna(how="all")
    z = m.values
    fig = go.Figure(go.Surface(x=tau, y=m.index, z=z, colorscale="Turbo", colorbar=dict(title="%"),
                               hovertemplate="Ky han %{x:.2f}y<br>%{y|%Y-%m}<br>Lai suat %{z:.2f}%<extra></extra>"))
    fig.update_layout(template=_TEMPLATE, title="Be mat lai suat Kho bac My (quan sat, cuoi thang)",
                      scene=dict(xaxis_title="Ky han (nam)", yaxis_title="Thoi gian", zaxis_title="Lai suat (%)",
                                 aspectratio=_ASPECT, camera=_CAMERA),
                      margin=dict(l=0, r=0, t=50, b=0), height=650)
    return fig


def ns_curve(tau, level, slope, curv, lam=config.NS_LAMBDA_FIXED):
    x = lam * np.asarray(tau, float)
    a = (1 - np.exp(-x)) / x
    return level + slope * a + curv * (a - np.exp(-x))


def fig_ns_surface(factors_monthly: pd.DataFrame, lam: float = config.NS_LAMBDA_FIXED) -> go.Figure:
    """Be mat Nelson-Siegel ap dung nhan to thang: muot, 0.25-30 nam."""
    f = factors_monthly.copy(); f.index = _month_index(f.index)
    tau = np.linspace(0.25, 30, 120)
    z = np.array([ns_curve(tau, r.level, r.slope, r.curvature, lam) for r in f.itertuples()])
    fig = go.Figure(go.Surface(x=tau, y=f.index, z=z, colorscale="Turbo", colorbar=dict(title="%"),
                               hovertemplate="Ky han %{x:.1f}y<br>%{y|%Y-%m}<br>NS fit %{z:.2f}%<extra></extra>"))
    fig.update_layout(template=_TEMPLATE, title=f"Be mat Nelson-Siegel (λ = {lam:.4f}, OLS theo ngay, lay cuoi thang)",
                      scene=dict(xaxis_title="Ky han (nam)", yaxis_title="Thoi gian", zaxis_title="Lai suat (%)",
                                 aspectratio=_ASPECT, camera=_CAMERA),
                      margin=dict(l=0, r=0, t=50, b=0), height=650)
    return fig


def fig_factor_path_3d(factors_monthly: pd.DataFrame, recession: pd.Series | None = None) -> go.Figure:
    """Quy dao (Level, Slope, Curvature) theo thoi gian; mau = nam; danh dau thang suy thoai."""
    f = factors_monthly[["level", "slope", "curvature"]].copy(); f.index = _month_index(f.index)
    yrs = f.index.year + (f.index.month - 1) / 12
    fig = go.Figure()
    fig.add_trace(go.Scatter3d(x=f.level, y=f.slope, z=f.curvature, mode="lines+markers", name="Quy dao",
                               line=dict(color=yrs, colorscale="Viridis", width=4, colorbar=dict(title="Nam")),
                               marker=dict(size=3, color=yrs, colorscale="Viridis"),
                               customdata=f.index.strftime("%Y-%m"),
                               hovertemplate="%{customdata}<br>Level %{x:.2f}<br>Slope %{y:.2f}<br>Curv %{z:.2f}<extra></extra>"))
    if recession is not None:
        r = recession.copy(); r.index = _month_index(r.index)
        sub = f.loc[f.index.intersection(r.index[r == 1])]
        fig.add_trace(go.Scatter3d(x=sub.level, y=sub.slope, z=sub.curvature, mode="markers", name="Suy thoai NBER",
                                   marker=dict(size=5, color="crimson", symbol="diamond")))
    fig.update_layout(template=_TEMPLATE, title="Quy dao 3 nhan to Nelson-Siegel (thang)",
                      scene=dict(xaxis_title="Level β0", yaxis_title="Slope β1", zaxis_title="Curvature β2"),
                      margin=dict(l=0, r=0, t=50, b=0), height=650)
    return fig


def fig_factors_2d(factors_monthly: pd.DataFrame, recession: pd.Series | None = None) -> go.Figure:
    """3 nhan to theo thoi gian, co thanh keo, bong xam suy thoai."""
    f = factors_monthly[["level", "slope", "curvature"]].copy(); f.index = _month_index(f.index)
    fig = make_subplots(rows=3, cols=1, shared_xaxes=True, vertical_spacing=0.04,
                        subplot_titles=("Level β0", "Slope β1", "Curvature β2"))
    for i, c in enumerate(f.columns, 1):
        fig.add_trace(go.Scatter(x=f.index, y=f[c], name=c, mode="lines"), row=i, col=1)
    if recession is not None:
        r = recession.copy(); r.index = _month_index(r.index)
        for sh in _recession_shapes(r):
            fig.add_shape(**sh)
    fig.update_xaxes(rangeslider=dict(visible=True, thickness=0.05), row=3, col=1)
    fig.update_layout(template=_TEMPLATE, height=760, showlegend=False, hovermode="x unified",
                      title="Nhan to Nelson-Siegel theo thang (vung xam = suy thoai NBER)")
    return fig


# ------------------------------------------------------------------ RQ3
def fig_irf_surface(irf: pd.DataFrame, impulse: str = "fed_funds") -> go.Figure:
    """Be mat 3D: truc x = chân trời (thang), y = bien phan ung, z = IRF cho mot cu soc."""
    d = irf[irf.impulse == impulse]
    resp = list(dict.fromkeys(d.response))
    H = sorted(d.h.unique())
    z = np.array([[d[(d.response == r) & (d.h == h)].irf.iloc[0] for h in H] for r in resp])
    fig = go.Figure(go.Surface(x=H, y=resp, z=z, colorscale="RdBu", cmid=0, colorbar=dict(title="IRF"),
                               hovertemplate="h=%{x} thang<br>%{y}<br>IRF %{z:.3f}<extra></extra>"))
    fig.update_layout(template=_TEMPLATE, title=f"IRF 3D: cu soc 1 SD cua {impulse} (Cholesky)",
                      scene=dict(xaxis_title="Chan troi h (thang)", yaxis_title="Bien phan ung", zaxis_title="Phan ung"),
                      margin=dict(l=0, r=0, t=50, b=0), height=600)
    return fig


def fig_irf_grid(irf: pd.DataFrame) -> go.Figure:
    """Luoi IRF 2D tuong tac (KTC 95% bootstrap): hang = cu soc, cot = phan ung."""
    imp = list(dict.fromkeys(irf.impulse)); resp = list(dict.fromkeys(irf.response))
    fig = make_subplots(rows=len(imp), cols=len(resp), shared_xaxes=True,
                        subplot_titles=[f"{i} → {r}" for i in imp for r in resp], vertical_spacing=0.05)
    for a, i in enumerate(imp, 1):
        for b, r in enumerate(resp, 1):
            d = irf[(irf.impulse == i) & (irf.response == r)].sort_values("h")
            fig.add_trace(go.Scatter(x=d.h, y=d.hi, line=dict(width=0), showlegend=False, hoverinfo="skip"), row=a, col=b)
            fig.add_trace(go.Scatter(x=d.h, y=d.lo, fill="tonexty", fillcolor="rgba(70,130,180,0.25)",
                                     line=dict(width=0), showlegend=False, hoverinfo="skip"), row=a, col=b)
            fig.add_trace(go.Scatter(x=d.h, y=d.irf, line=dict(color="steelblue"), showlegend=False,
                                     hovertemplate="h=%{x}<br>IRF %{y:.3f}<extra></extra>"), row=a, col=b)
            fig.add_hline(y=0, line_width=0.5, line_color="grey", row=a, col=b)
    fig.update_layout(template=_TEMPLATE, height=230 * len(imp), title="IRF (Cholesky, KTC 95% bootstrap)")
    for ann in fig.layout.annotations:
        ann.font.size = 10
    return fig


# ------------------------------------------------------------------ RQ4
def fig_probit_2d(oos: pd.DataFrame, base_rate: float, recession: pd.Series | None = None) -> go.Figure:
    o = oos.copy(); o.index = _month_index(o.index)
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=o.index, y=o.prob_fixed, name="Probit (train ≤1998-12)", line=dict(color="royalblue")))
    fig.add_trace(go.Scatter(x=o.index, y=o.prob_expanding, name="Uoc luong lai mo rong",
                             line=dict(color="darkorange", dash="dot")))
    fig.add_hline(y=base_rate, line_dash="dash", line_color="crimson",
                  annotation_text=f"Ty le nen train {base_rate:.1%}", annotation_position="top left")
    if recession is not None:
        r = recession.copy(); r.index = _month_index(r.index)
        for sh in _recession_shapes(r.loc[o.index.min():]):
            fig.add_shape(**sh)
    fig.add_vrect(x0=pd.Timestamp(config.PROBIT_STRESS_START), x1=o.index.max(), fillcolor="orange", opacity=0.08, line_width=0,
                  annotation_text="Phep thu 2022-2026", annotation_position="top right")
    fig.update_yaxes(range=[0, 1], title="P(suy thoai trong 12 thang toi)")
    fig.update_xaxes(rangeslider=dict(visible=True, thickness=0.06))
    fig.update_layout(template=_TEMPLATE, height=520, hovermode="x unified",
                      title="Probit 10Y-2Y: xac suat ngoai mau (vung xam = suy thoai NBER)")
    return fig


def fig_probit_3d(oos: pd.DataFrame) -> go.Figure:
    """Scatter 3D: thoi gian x spread x xac suat; mau = nhan (co suy thoai trong 12 thang toi)."""
    o = oos.dropna(subset=["prob_fixed"]).copy(); o.index = _month_index(o.index)
    lab = o["recession_ahead"]
    fig = go.Figure()
    for val, name, col in [(0, "Khong suy thoai trong 12 thang", "steelblue"), (1, "Co suy thoai trong 12 thang", "crimson")]:
        s = o[lab == val]
        fig.add_trace(go.Scatter3d(x=s.index, y=s.spread, z=s.prob_fixed, mode="markers", name=name,
                                   marker=dict(size=3.5, color=col),
                                   hovertemplate="%{x|%Y-%m}<br>Spread %{y:.2f}<br>P %{z:.2f}<extra></extra>"))
    nl = o[lab.isna()]
    if len(nl):
        fig.add_trace(go.Scatter3d(x=nl.index, y=nl.spread, z=nl.prob_fixed, mode="markers", name="Chua co nhan",
                                   marker=dict(size=3.5, color="orange")))
    fig.update_layout(template=_TEMPLATE, title="Probit 3D: thoi gian × spread 10Y-2Y × xac suat",
                      scene=dict(xaxis_title="Thang", yaxis_title="Spread (diem %)", zaxis_title="P suy thoai"),
                      margin=dict(l=0, r=0, t=50, b=0), height=650)
    return fig


def fig_probit_curve(const: float, coef: float, oos: pd.DataFrame) -> go.Figure:
    """Ham Probit P = Φ(a + b·spread) va cac quan sat ngoai mau."""
    from scipy.stats import norm
    xs = np.linspace(-1, 4, 200)
    fig = go.Figure(go.Scatter(x=xs, y=norm.cdf(const + coef * xs), name="Φ(α+β·spread)"))
    o = oos.dropna(subset=["recession_ahead"])
    fig.add_trace(go.Scatter(x=o.spread, y=o.recession_ahead, mode="markers", name="Quan sat (0/1)",
                             marker=dict(size=5, opacity=0.4)))
    fig.update_layout(template=_TEMPLATE, height=450, xaxis_title="Spread 10Y-2Y (diem %)",
                      yaxis_title="P(suy thoai 12 thang)", title="Ham Probit da uoc luong (train ≤1998-12)")
    return fig
