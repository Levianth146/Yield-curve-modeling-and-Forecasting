"""
vn_extension.py
===============
RQ5 (mo rong Viet Nam): nap, kiem tra va ap dung Nelson-Siegel cho loi suat TPCP VN.

Dinh dang file dau vao `data/vn_treasury_yields.csv`:
  - cot dau = ngay (YYYY-MM-DD), MOI cot con lai = 1 ky han, TEN COT = ky han tinh bang NAM
    (vd 1, 2, 3, 5, 7, 10, 15, 20, 30; ky han thang: 0.25, 0.5),
  - gia tri = loi suat % nam (vd 3.25), de trong neu thieu (KHONG tu ffill).
Nguon goi y: duong cong loi suat TPCP cua HNX / VBMA (theo ngay), hoac bang loi suat TPCP
tren cac trang du lieu tai chinh. Xem docs/vn_data_guide.md.

Khac voi US: so ky han it hon (thuong 5-9) nen nguong so ky han toi thieu/ngay la
VN_MIN_MATURITIES_PER_DAY (khong dung config.NS_MIN_OBS_PER_DAY = 9).
"""

from pathlib import Path

import numpy as np
import pandas as pd

from . import config

VN_YIELDS_PATH = Path(__file__).resolve().parents[1] / "data" / "vn_treasury_yields.csv"
VN_MIN_MATURITIES_PER_DAY = 5
VN_MIN_MATURITIES_TOTAL = 5
VN_LAMBDA_GRID = np.round(np.arange(0.2, 2.01, 0.05), 2)   # tau theo nam (US co dinh: 0.7308)


def write_template(path=None):
    """Ghi file mau CHI CO tieu de (khong co so lieu gia)."""
    path = Path(path or VN_YIELDS_PATH.with_name("vn_treasury_yields_TEMPLATE.csv"))
    cols = ["date", "1", "2", "3", "5", "7", "10", "15", "20", "30"]
    path.write_text(",".join(cols) + "\n", encoding="utf-8")
    return path


def load_vn_yields(path=None):
    """Doc + chuan hoa + kiem tra. Tra ve (yields DataFrame cot float = ky han nam, report dict)."""
    path = Path(path or VN_YIELDS_PATH)
    raw = pd.read_csv(path, index_col=0)
    report = {"file": str(path), "errors": [], "warnings": []}
    try:
        raw.index = pd.to_datetime(raw.index)
    except Exception as exc:
        report["errors"].append(f"Cot ngay khong doc duoc: {exc}")
        return pd.DataFrame(), report
    try:
        raw.columns = [float(str(c).strip().lower().rstrip("y")) for c in raw.columns]
    except ValueError:
        report["errors"].append("Ten cot phai la ky han bang so NAM (vd 1, 2, 5, 10, 0.5).")
        return pd.DataFrame(), report
    y = raw.apply(pd.to_numeric, errors="coerce").sort_index()
    y = y.loc[:, sorted(y.columns)]
    dup = int(y.index.duplicated().sum())
    if dup:
        report["warnings"].append(f"{dup} ngay trung lap - giu dong cuoi.")
        y = y[~y.index.duplicated(keep="last")]
    y = y.dropna(how="all")
    if y.empty:
        report["errors"].append("File khong co so lieu.")
        return y, report
    if y.shape[1] < VN_MIN_MATURITIES_TOTAL:
        report["errors"].append(f"Chi co {y.shape[1]} ky han (< {VN_MIN_MATURITIES_TOTAL}).")
    vmax, vmin = float(np.nanmax(y.values)), float(np.nanmin(y.values))
    if vmax < 0.5:
        report["warnings"].append("Gia tri toi da < 0.5: co ve la dang thap phan (0.035) thay vi % (3.5)?")
    if vmax > 30:
        report["warnings"].append("Gia tri toi da > 30: co ve la don vi bps hoac sai don vi?")
    if vmin <= 0:
        report["warnings"].append(f"{int((y <= 0).sum().sum())} gia tri <= 0 se bi bo (coi la thieu).")
        y = y.mask(y <= 0)
    cnt = y.notna().sum(axis=1)
    thin = int((cnt < VN_MIN_MATURITIES_PER_DAY).sum())
    if thin:
        report["warnings"].append(f"{thin} ngay co < {VN_MIN_MATURITIES_PER_DAY} ky han se bi loai khi fit.")
    gaps = y.index.to_series().diff().dt.days
    report.update({
        "n_days": int(len(y)), "start": str(y.index.min().date()), "end": str(y.index.max().date()),
        "maturities": [float(c) for c in y.columns], "n_days_ok": int((cnt >= VN_MIN_MATURITIES_PER_DAY).sum()),
        "coverage_by_maturity": {str(c): float(y[c].notna().mean()) for c in y.columns},
        "max_gap_days": int(gaps.max()) if len(gaps) > 1 else 0,
        "min_yield": float(np.nanmin(y.values)), "max_yield": float(np.nanmax(y.values)),
    })
    if report["n_days_ok"] < 250:
        report["warnings"].append("Duoi 250 ngay hop le: du de mo ta, khong du de danh gia du bao AR/RW.")
    return y, report


def _loadings(tau, lam):
    tau = np.asarray(tau, float)
    e = np.exp(-lam * tau)
    l1 = (1 - e) / (lam * tau)
    return np.column_stack([np.ones_like(tau), l1, l1 - e])


def fit_ns_daily(yields: pd.DataFrame, lam: float, min_obs: int = VN_MIN_MATURITIES_PER_DAY):
    """OLS theo ngay voi lambda co dinh; chi dung cac ky han co so lieu; tra ve level/slope/curvature/rmse/n."""
    tau_all = np.array([float(c) for c in yields.columns])
    recs = []
    for d, row in yields.iterrows():
        v = row.values.astype(float)
        m = ~np.isnan(v)
        if m.sum() < min_obs:
            continue
        X = _loadings(tau_all[m], lam)
        b, *_ = np.linalg.lstsq(X, v[m], rcond=None)
        r = v[m] - X @ b
        recs.append({"date": d, "level": b[0], "slope": b[1], "curvature": b[2],
                     "rmse": float(np.sqrt(np.mean(r ** 2))), "n_maturities": int(m.sum())})
    return pd.DataFrame(recs).set_index("date")


def select_lambda(yields: pd.DataFrame, grid=VN_LAMBDA_GRID, min_obs: int = VN_MIN_MATURITIES_PER_DAY):
    """Lambda toi thieu hoa tong binh phuong sai so tren TOAN mau (profile). Tra ve (lam_best, bang)."""
    rows = []
    for lam in grid:
        f = fit_ns_daily(yields, float(lam), min_obs)
        rows.append({"lambda": float(lam), "rmse_mean": float(f["rmse"].mean()), "n_days": int(len(f))})
    tab = pd.DataFrame(rows)
    return float(tab.loc[tab["rmse_mean"].idxmin(), "lambda"]), tab


def monthly_last(factors: pd.DataFrame, slack_days: int = 4):
    """Nhan to cuoi thang; bo thang cuoi neu chua ket thuc (nhu ns.monthly_factors)."""
    out = factors.resample("ME").last().dropna(subset=["level"])
    last_obs = factors.index.max()
    month_end = last_obs + pd.offsets.MonthEnd(0)
    if last_obs < month_end - pd.Timedelta(days=slack_days):
        out = out.loc[out.index < month_end]
    return out
