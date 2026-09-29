"""
var_analysis.py
===============
RQ3: VAR giua Level/Slope/Curvature va bien vi mo (CPI YoY, Fed funds),
kiem dinh stationarity, VAR stability, Granger causality, va IRF.
"""

import warnings

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from statsmodels.tsa.api import VAR
from statsmodels.tsa.stattools import adfuller, kpss
from statsmodels.tools.sm_exceptions import InterpolationWarning

from . import config
from .utils import MONTHLY_FREQ, MONTHLY_PERIOD, ensure_monthly_freq


def _adf(series: pd.Series, regression: str = "ct"):
    """ADF wrapper; hang so + xu huong (ct) theo thiet ke nhom."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", category=FutureWarning)
        out = adfuller(series, regression=regression, autolag="AIC")
    return float(out[0]), float(out[1])


def _kpss(series: pd.Series, regression: str = "c"):
    """
    KPSS wrapper. statsmodels noi suy p-value tu bang look-up; khi statistic
    nam ngoai bang se canh bao InterpolationWarning va tra ve p bi cat bien
    (0.01 hoac 0.10). Ta nuot warning do va ghi note de doc dung Huong.
    """
    note = ""
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always", category=InterpolationWarning)
        warnings.simplefilter("ignore", category=FutureWarning)
        try:
            out = kpss(series, regression=regression, nlags="auto")
            stat, p = float(out[0]), float(out[1])
        except Exception:
            return float("nan"), float("nan"), "failed"
    for w in caught:
        if issubclass(w.category, InterpolationWarning):
            msg = str(w.message).lower()
            if "smaller" in msg:
                note = "p_actual<reported (stat outside table)"
            elif "greater" in msg:
                note = "p_actual>reported (stat outside table)"
            else:
                note = "p clipped (stat outside table)"
            break
    return stat, p, note


def test_stationarity(series: pd.Series, name: str = ""):
    """
    Chay ca ADF (H0: co unit root / khong dung) va KPSS (H0: dung)
    tren mot chuoi. Doc ket qua theo cap: ADF bac bo + KPSS khong bac bo
    -> dung; nguoc lai -> khong dung.

    Returns
    -------
    dict voi p-value cua ca hai test.
    """
    series = series.dropna()
    if series.nunique(dropna=True) <= 1:
        return {
            "series": name,
            "adf_stat": float("nan"), "adf_pvalue": float("nan"),
            "kpss_stat": float("nan"), "kpss_pvalue": float("nan"),
            "kpss_note": "skipped_constant",
            "likely_stationary": False,
        }

    adf_stat, adf_p = _adf(series, regression="ct")
    kpss_stat, kpss_p, kpss_note = _kpss(series, regression="c")

    return {
        "series": name,
        "adf_stat": adf_stat, "adf_pvalue": adf_p,
        "kpss_stat": kpss_stat, "kpss_pvalue": kpss_p,
        "kpss_note": kpss_note,
        "likely_stationary": bool(adf_p < 0.05 and kpss_p > 0.05),
    }


def test_stationarity_all(data: pd.DataFrame):
    """Chay test_stationarity cho tat ca cot trong DataFrame, tra ve bang tong hop."""
    rows = [test_stationarity(data[col], name=col) for col in data.columns]
    return pd.DataFrame(rows)


def prepare_var_data(data: pd.DataFrame, alpha: float = 0.05):
    """
    Quy tac nhom (bao cao, muc 3.1.1): ADF (hang so + xu huong) tren chuoi goc;
    p >= alpha -> I(1), lay sai phan bac 1 va kiem tra ADF lai.

    Returns
    -------
    (transformed, table): transformed co cac cot da sai phan (bo dong dau, cac
    cot khac cat cung index); table: series, adf_p_level, transform, adf_p_after.
    """
    cols, rows = {}, []
    for c in data.columns:
        x = data[c].astype(float).dropna()
        _, p_level = _adf(x, regression="ct")
        if p_level < alpha:
            cols[c] = x
            rows.append({"series": c, "adf_p_level": p_level, "transform": "level",
                         "adf_p_after": p_level})
        else:
            d = x.diff().dropna()
            _, p_after = _adf(d, regression="ct")
            cols[c] = d
            rows.append({"series": c, "adf_p_level": p_level, "transform": "diff1",
                         "adf_p_after": p_after})
    transformed = pd.concat(cols, axis=1).dropna()
    return ensure_monthly_freq(transformed), pd.DataFrame(rows)


def fit_var_model(factors_df: pd.DataFrame, macro_df: pd.DataFrame,
                   maxlags=config.VAR_MAX_LAG, ic=config.VAR_IC,
                   factor_cols=("level", "slope", "curvature"),
                   macro_cols=("cpi_yoy", "fed_funds"), difference: bool = True,
                   order=None, lag=None):
    """
    Ket hop 3 nhan to NS voi bien vi mo thanh he VAR, tu chon do tre bang
    AIC/BIC. difference=True: bien I(1) theo ADF duoc lay sai phan (xem
    prepare_var_data). Chi lay 3 cot nhan to (bo qua rmse/n_maturities).

    Cholesky ordering (da chot): cpi_yoy, fed_funds, level, slope, curvature.

    Returns
    -------
    (results, data) : (VARResultsWrapper, pd.DataFrame da bien doi).
    Bang bien doi: results.transform_table (neu difference=True).
    """
    factors_m = ensure_monthly_freq(factors_df[[c for c in factor_cols if c in factors_df.columns]])
    macro_m = ensure_monthly_freq(macro_df)
    joined = factors_m.join(macro_m, how="inner").dropna()
    ordered_cols = [c for c in (order if order is not None else list(macro_cols) + list(factor_cols)) if c in joined.columns]
    data = ensure_monthly_freq(joined[ordered_cols])
    table = None
    if difference:
        data, table = prepare_var_data(data)

    model = VAR(data)
    selected = model.select_order(maxlags=maxlags)
    lag_order = selected.aic if ic == "aic" else selected.bic
    lag_order = max(int(lag) if lag is not None else int(lag_order), 1)

    results = model.fit(lag_order)
    results.transform_table = table
    return results, data


def lag_diagnostics(data: pd.DataFrame, max_p: int = 12):
    """Bang p=1..max_p: AIC, BIC, Portmanteau (whiteness, lag 12) p-value, on dinh."""
    rows = []
    model = VAR(data)
    for p in range(1, max_p + 1):
        try:
            r = model.fit(p)
            w = r.test_whiteness(nlags=max(p + 1, 12), adjusted=True)
            rows.append({"p": p, "AIC": r.aic, "BIC": r.bic, "HQIC": r.hqic,
                         "portmanteau_p": float(w.pvalue),
                         "stable": bool(r.is_stable()),
                         "max_abs_inv_root": float(1.0 / np.min(np.abs(r.roots)))})
        except Exception:
            continue
    return pd.DataFrame(rows)


def _orth_irf(A_list, sigma_u, periods):
    """Orth IRF (Cholesky) tu ma tran he so A_1..A_p va Sigma_u -> (periods+1, k, k) [h, resp, shock]."""
    k = sigma_u.shape[0]
    p = len(A_list)
    P = np.linalg.cholesky(sigma_u)
    Phi = [np.eye(k)]
    for h in range(1, periods + 1):
        acc = np.zeros((k, k))
        for i in range(1, min(h, p) + 1):
            acc += Phi[h - i] @ A_list[i - 1]
        Phi.append(acc)
    return np.array([ph @ P for ph in Phi])


def irf_with_bands(var_results, transform_table=None, periods: int = 24,
                   n_boot: int = 300, seed: int = 0, level: float = 0.95):
    """
    IRF truc giao (Cholesky, cu soc 1 do lech chuan) + khoang tin cay bootstrap
    phan du. Bien nao bi sai phan (transform_table) thi phan ung duoc CONG DON
    de doc ve muc goc; bien giu nguyen muc thi khong cong don.

    Returns
    -------
    dict: point (H+1,k,k), lo, hi, names, cumulative (list bool theo bien phan ung)
    """
    names = list(var_results.names)
    k, p = len(names), var_results.k_ar
    cum = np.zeros(k, dtype=bool)
    if transform_table is not None:
        tmap = dict(zip(transform_table["series"], transform_table["transform"]))
        cum = np.array([tmap.get(n) == "diff1" for n in names])

    def build(A, sig):
        irf = _orth_irf(A, sig, periods)
        out = irf.copy()
        for r in range(k):
            if cum[r]:
                out[:, r, :] = np.cumsum(irf[:, r, :], axis=0)
        return out

    A = [var_results.coefs[i] for i in range(p)]
    point = build(A, np.asarray(var_results.sigma_u))

    rng = np.random.default_rng(seed)
    resid = var_results.resid.values
    T = resid.shape[0]
    y = var_results.endog
    const = var_results.intercept
    draws = []
    for _ in range(n_boot):
        e = resid[rng.integers(0, T, size=T)]
        e = e - e.mean(axis=0)
        sim = np.zeros((T + p, k))
        sim[:p] = y[:p]
        for t in range(p, T + p):
            v = const.copy()
            for i in range(1, p + 1):
                v = v + A[i - 1] @ sim[t - i]
            sim[t] = v + e[t - p]
        try:
            rb = VAR(sim).fit(p)
            Ab = [rb.coefs[i] for i in range(p)]
            draws.append(build(Ab, np.asarray(rb.sigma_u)))
        except Exception:
            continue
    draws = np.array(draws)
    a = (1 - level) / 2
    lo, hi = np.quantile(draws, a, axis=0), np.quantile(draws, 1 - a, axis=0)
    return {"point": point, "lo": lo, "hi": hi, "names": names, "cumulative": cum,
            "shock_sd": np.sqrt(np.diag(np.asarray(var_results.sigma_u)))}


def irf_robustness(factors_df, macro_df, specs, periods=24, n_boot=300):
    """
    Chay lai VAR/IRF theo nhieu dac ta. specs: {ten: dict(ic=, lag=, order=)}.
    Tra ve (summary_df, irf_frames): summary gom lag, on dinh, IRF Fed->Slope
    (h=1,6,12,24, cong don neu slope sai phan) va co dung khoang 95% khong chua 0.
    """
    rows, frames = [], {}
    for name, kw in specs.items():
        res, data = fit_var_model(factors_df, macro_df, **kw)
        irf = irf_with_bands(res, res.transform_table, periods=periods, n_boot=n_boot)
        st = check_var_stability(res)
        df = irf_to_frame(irf); df["spec"] = name; frames[name] = df
        for imp, resp in [("fed_funds", "slope"), ("fed_funds", "level"), ("cpi_yoy", "level")]:
            sub = df[(df.impulse == imp) & (df.response == resp)].set_index("h")
            for h in (1, 6, 12, 24):
                r = sub.loc[h]
                rows.append({"spec": name, "lag": int(res.k_ar), "stable": bool(st["is_stable"]),
                             "order": " > ".join(res.names), "impulse": imp, "response": resp, "h": h,
                             "irf": r["irf"], "lo": r["lo"], "hi": r["hi"],
                             "significant": bool(r["lo"] > 0 or r["hi"] < 0)})
    return pd.DataFrame(rows), pd.concat(frames.values(), ignore_index=True)


def irf_to_frame(irf: dict) -> pd.DataFrame:
    rows = []
    n = irf["names"]
    for h in range(irf["point"].shape[0]):
        for r, rn in enumerate(n):
            for sh, sn in enumerate(n):
                rows.append({"impulse": sn, "response": rn, "h": h,
                             "irf": irf["point"][h, r, sh], "lo": irf["lo"][h, r, sh],
                             "hi": irf["hi"][h, r, sh], "cumulative": bool(irf["cumulative"][r])})
    return pd.DataFrame(rows)


def plot_irf_pairs(irf: dict, pairs=None, save_path=None, ncols=None):
    """Ve IRF (kem khoang tin cay). pairs=None -> luoi k x k day du."""
    n = irf["names"]
    if pairs is None:
        pairs = [(sn, rn) for rn in n for sn in n]
        ncols = len(n)
    ncols = ncols or len(pairs)
    nrows = int(np.ceil(len(pairs) / ncols))
    fig, axes = plt.subplots(nrows, ncols, figsize=(3.2 * ncols, 2.4 * nrows), squeeze=False)
    for ax, (sn, rn) in zip(axes.ravel(), pairs):
        si, ri = n.index(sn), n.index(rn)
        h = np.arange(irf["point"].shape[0])
        ax.plot(h, irf["point"][:, ri, si], lw=1.5)
        ax.fill_between(h, irf["lo"][:, ri, si], irf["hi"][:, ri, si], alpha=0.2)
        ax.axhline(0, color="k", lw=0.5)
        ax.set_title(f"{sn} -> {rn}" + (" (cong don)" if irf["cumulative"][ri] else ""), fontsize=8)
    for ax in axes.ravel()[len(pairs):]:
        ax.axis("off")
    fig.tight_layout()
    if save_path:
        fig.savefig(save_path, dpi=150)
    return fig


def check_var_stability(var_results) -> dict:
    """
    Kiem tra VAR co on dinh khong (tat ca eigenvalue cua companion matrix
    nam trong unit circle). statsmodels co san method is_stable().
    """
    is_stable = var_results.is_stable(verbose=False)
    roots = var_results.roots
    return {"is_stable": bool(is_stable), "roots": roots}


def run_granger_causality(var_results, caused: str, causing, maxlag=None):
    """
    Kiem dinh Granger causality: `causing` co giup du bao `caused` khong
    (ngoai thong tin cua chinh `caused` trong qua khu)?

    `causing` co the la 1 ten cot hoac list nhieu cot.
    """
    result = var_results.test_causality(caused, causing, kind="f")
    return {
        "caused": caused, "causing": causing,
        "test_stat": result.test_statistic,
        "p_value": result.pvalue,
        "conclusion": result.conclusion,
    }


def run_granger_causality_matrix(var_results, variables):
    """Chay Granger causality cho tat ca cap bien, tra ve DataFrame p-value."""
    rows = []
    for caused in variables:
        for causing in variables:
            if caused == causing:
                continue
            res = run_granger_causality(var_results, caused, causing)
            rows.append(res)
    return pd.DataFrame(rows)


def forecast_factors(var_results, data: pd.DataFrame, steps=12):
    """Du bao nhan to va bien vi mo `steps` ky tiep theo."""
    data = ensure_monthly_freq(data)
    forecast = var_results.forecast(data.values[-var_results.k_ar:], steps=steps)
    start = data.index[-1] + 1
    forecast_df = pd.DataFrame(
        forecast,
        columns=data.columns,
        index=pd.period_range(start=start, periods=steps, freq=MONTHLY_PERIOD),
    )
    return forecast_df


def plot_impulse_response(var_results, periods=24, impulse=None, response=None,
                           save_path=None):
    """
    Ve ham phan ung xung (IRF), orthogonalized theo Cholesky.

    impulse/response=None -> ve toan bo luoi; chi dinh ten cot neu chi can
    mot cap cu the (vd impulse="fed_funds", response="slope").
    """
    irf = var_results.irf(periods)
    fig = irf.plot(orth=True, impulse=impulse, response=response)
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
    return irf
