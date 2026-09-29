"""
nelson_siegel.py
================
Uoc luong mo hinh Nelson-Siegel (1987) cho tung ngay giao dich.

Hai cach uoc luong duoc cai dat song song de doi chieu (RQ1, theo B4.1):
  1. fit_ns_single_day()      - OLS voi lambda co dinh (Diebold-Li 2006)
  2. fit_ns_nls_single_day()  - NLS day du, uoc luong ca lambda (scipy.optimize,
                                 bound + multi-start - xem CHANGELOG ben duoi)

Cong voi ham danh gia do phu hop (RMSE/R2) - day la dau ra chinh cua RQ1.

CHANGELOG (audit fix, 2026-09-28):
  Ban dau fit_ns_nls_single_day() dung Nelder-Mead KHONG rang buoc cho ca
  4 tham so (beta0, beta1, beta2, lambda). Ket qua thuc te tren du lieu that:
  ~33% ngay khong hoi tu (bi am tham drop qua dropna), va trong so hoi tu,
  nhieu ngay cho beta/lambda lech cuc doan so voi OLS (vd level tu 4.3 nhay
  sang -10.6) du RMSE gan bang nhau - day la van de nhan dang (identifiability)
  kinh dien cua NS khi lambda tu do: nhieu bo tham so khac nhau cho gan nhu
  cung mot duong fit trong pham vi ky han quan sat (1 thang - 30 nam), nhung
  "curvature" khong con y nghia kinh te gi khi lambda troi ra ngoai vung hop ly.

  Sua: (1) bound lambda trong [0.02, 2.0] (tuong ung "buou" cong nam trong
  khoang ky han quan sat duoc), bound beta trong [-30, 30] de chan nghiem
  thoai hoa; (2) doi Nelder-Mead (khong bound) sang L-BFGS-B (co bound);
  (3) multi-start: thu nhieu lambda khoi tao khac nhau, chon nghiem SSE thap
  nhat trong so cac lan hoi tu, thay vi chi 1 diem khoi tao duy nhat.
  fit_ns_nls_single_day() gio tra ve THEM co "converged" (bool) o cuoi tuple;
  estimate_ns_timeseries() va compare_ols_vs_nls() da cap nhat theo.
"""

import numpy as np
import pandas as pd
from scipy.optimize import minimize

from . import config

NS_NLS_LAMBDA_BOUNDS = (0.02, 2.0)
NS_NLS_BETA_BOUND = 30.0
NS_NLS_LAMBDA_STARTS = (0.03, 0.15, 0.3, config.NS_LAMBDA_FIXED, 1.2, 1.8)  # tau theo nam


def nelson_siegel(tau, beta0, beta1, beta2, lam):
    """
    Cong thuc Nelson-Siegel.

    Parameters
    ----------
    tau : array-like, ky han (nam)
    beta0 : level (lai suat dai han)
    beta1 : slope (do doc)
    beta2 : curvature (do cong)
    lam : toc do phan ra (decay)
    """
    tau = np.asarray(tau, dtype=float)
    tau = np.where(tau == 0, 1e-6, tau)
    term1 = (1 - np.exp(-lam * tau)) / (lam * tau)
    term2 = term1 - np.exp(-lam * tau)
    return beta0 + beta1 * term1 + beta2 * term2


def fit_ns_single_day(maturities, observed_yields, lam=config.NS_LAMBDA_FIXED):
    """
    OLS 2 buoc (Diebold-Li): lambda co dinh -> NS tuyen tinh theo beta
    -> giai bang linear least squares. Nhanh va on dinh.

    Returns
    -------
    (beta0, beta1, beta2, lam) : tuple[float, float, float, float]
    """
    tau = np.asarray(maturities, dtype=float)
    y = np.asarray(observed_yields, dtype=float)

    mask = ~np.isnan(y)
    tau, y = tau[mask], y[mask]
    if len(y) < config.NS_MIN_OBS_PER_DAY:
        return np.nan, np.nan, np.nan, lam

    tau_safe = np.where(tau == 0, 1e-6, tau)
    X1 = (1 - np.exp(-lam * tau_safe)) / (lam * tau_safe)
    X2 = X1 - np.exp(-lam * tau_safe)
    X = np.column_stack([np.ones_like(tau), X1, X2])

    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    beta0, beta1, beta2 = beta
    return beta0, beta1, beta2, lam


def fit_ns_nls_single_day(maturities, observed_yields,
                           lam_init=config.NS_LAMBDA_INITIAL_GUESS,
                           lam_bounds=NS_NLS_LAMBDA_BOUNDS,
                           beta_bound=NS_NLS_BETA_BOUND,
                           lam_starts=NS_NLS_LAMBDA_STARTS):
    """
    NLS day du: uoc luong ca beta0, beta1, beta2 VA lambda, dung
    scipy.optimize.minimize(method="L-BFGS-B") CO BOUND, multi-start tren
    nhieu lambda khoi tao khac nhau, chon nghiem SSE thap nhat trong so cac
    lan hoi tu. Dung de doi chieu do vung voi OLS co dinh lambda.

    Bound (lam_bounds, beta_bound) ngan nghiem troi ra vung khong con y nghia
    kinh te (xem CHANGELOG dau file) - day la sua doi so voi ban Nelder-Mead
    khong bound truoc do.

    Returns
    -------
    (beta0, beta1, beta2, lam, converged) : tuple[float, float, float, float, bool]
        converged=False (tat ca NaN cho beta/lam) neu khong co lan khoi tao
        nao hoi tu, hoac khong du diem du lieu.
    """
    tau = np.asarray(maturities, dtype=float)
    y = np.asarray(observed_yields, dtype=float)

    mask = ~np.isnan(y)
    tau, y = tau[mask], y[mask]
    if len(y) < config.NS_MIN_OBS_PER_DAY:
        return np.nan, np.nan, np.nan, np.nan, False

    def objective(params):
        b0, b1, b2, lam = params
        fitted = nelson_siegel(tau, b0, b1, b2, lam)
        return np.sum((y - fitted) ** 2)

    bounds = [(-beta_bound, beta_bound)] * 3 + [lam_bounds]

    starts = sorted(set([lam_init, *lam_starts]))
    best_result = None
    for lam0 in starts:
        lam0_clamped = min(max(lam0, lam_bounds[0]), lam_bounds[1])
        b0_init, b1_init, b2_init, _ = fit_ns_single_day(tau, y, lam=lam0_clamped)
        if np.isnan(b0_init):
            b0_init, b1_init, b2_init = y[-1], y[0] - y[-1], 0.0
        b0_init = min(max(b0_init, -beta_bound), beta_bound)
        b1_init = min(max(b1_init, -beta_bound), beta_bound)
        b2_init = min(max(b2_init, -beta_bound), beta_bound)
        x0 = [b0_init, b1_init, b2_init, lam0_clamped]

        result = minimize(objective, x0, method="L-BFGS-B", bounds=bounds)
        if result.success and (best_result is None or result.fun < best_result.fun):
            best_result = result

    if best_result is None:
        return np.nan, np.nan, np.nan, np.nan, False

    beta0, beta1, beta2, lam_est = best_result.x
    return beta0, beta1, beta2, lam_est, True


def compute_fit_error(maturities, observed_yields, beta0, beta1, beta2, lam):
    """
    RMSE va R^2 giua yield quan sat va yield tai tao tu NS - dau ra chinh
    cua RQ1 (danh gia muc do phu hop cua mo hinh moi ngay).
    """
    tau = np.asarray(maturities, dtype=float)
    y = np.asarray(observed_yields, dtype=float)
    mask = ~np.isnan(y)
    tau, y = tau[mask], y[mask]

    if np.isnan(beta0) or len(y) == 0:
        return np.nan, np.nan

    fitted = nelson_siegel(tau, beta0, beta1, beta2, lam)
    resid = y - fitted
    rmse = np.sqrt(np.mean(resid ** 2))
    ss_res = np.sum(resid ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else np.nan
    return rmse, r2


def estimate_ns_timeseries(yields_df, maturities_years,
                            lam=config.NS_LAMBDA_FIXED, method="ols"):
    """
    Chay fit cho tung ngay trong yields_df.

    Parameters
    ----------
    method : "ols" (lambda co dinh, nhanh) hoac "nls" (uoc luong ca lambda,
              bound + multi-start, xem fit_ns_nls_single_day)

    Returns
    -------
    factors : pd.DataFrame [level, slope, curvature, lam, rmse, r2, converged],
               index=date. factors.attrs["nls_convergence_rate"] duoc set khi
               method="nls" (ty le ngay hoi tu tren tong so ngay thu fit,
               TRUOC khi dropna).
    """
    records = []
    n_total = 0
    n_converged = 0

    for date, row in yields_df.iterrows():
        n_total += 1
        if method == "ols":
            b0, b1, b2, lam_used = fit_ns_single_day(maturities_years, row.values, lam=lam)
            converged = not np.isnan(b0)
        else:
            b0, b1, b2, lam_used, converged = fit_ns_nls_single_day(maturities_years, row.values)

        if converged:
            n_converged += 1

        rmse, r2 = compute_fit_error(maturities_years, row.values, b0, b1, b2, lam_used)
        records.append({
            "date": date, "level": b0, "slope": b1, "curvature": b2,
            "lam": lam_used, "rmse": rmse, "r2": r2, "converged": converged,
            "n_maturities": int(np.isfinite(np.asarray(row.values, dtype=float)).sum()),
        })

    factors = pd.DataFrame(records).set_index("date").dropna(subset=["level"])
    if method == "nls" and n_total > 0:
        factors.attrs["nls_convergence_rate"] = n_converged / n_total
    return factors


def monthly_factors(factors_daily: pd.DataFrame, month_end_slack_days: int = 4):
    """
    Chuoi nhan to THANG = nhan to o ngay giao dich hop le cuoi cung cua thang
    (ngay hop le = du >= NS_MIN_OBS_PER_DAY ky han; ngay thieu da bi loai khi fit).
    Bo thang cuoi neu chua ket thuc (quan sat cuoi cach cuoi thang > slack ngay).
    Cot: level, slope, curvature, rmse (diem %), n_maturities - file ban giao cho
    cac thanh vien phu trach AR/VAR/Probit.
    """
    cols = [c for c in ("level", "slope", "curvature", "rmse", "n_maturities")
            if c in factors_daily.columns]
    out = factors_daily[cols].resample("ME").last()
    last_obs = factors_daily.index.max()
    month_end = last_obs + pd.offsets.MonthEnd(0)
    if last_obs < month_end - pd.Timedelta(days=month_end_slack_days):
        out = out.loc[out.index < month_end]
    return out


def compare_ols_vs_nls(yields_df, maturities_years, sample_size=252):
    """
    Doi chieu OLS (lambda co dinh) vs NLS (lambda tu do, bound + multi-start)
    tren mot mau ngay (mac dinh ~1 nam giao dich) de kiem tra do vung cua
    phuong phap - dung cho phan "danh gia phuong phap NS" trong RQ1.

    Returns
    -------
    (comparison, nls_convergence_rate) : (pd.DataFrame, float)
        comparison: so sanh beta0/1/2/lambda/RMSE/R2 giua hai phuong phap,
        CHI gom cac ngay ca hai phuong phap deu hoi tu (inner join).
        nls_convergence_rate: ty le ngay NLS hoi tu tren TOAN BO sample_size
        ngay thu fit (bao gom ca ngay bi drop) - de bao cao minh bach thay vi
        am tham bo qua cac ngay khong hoi tu.
    """
    sample = yields_df.tail(sample_size)
    ols = estimate_ns_timeseries(sample, maturities_years, method="ols")
    nls = estimate_ns_timeseries(sample, maturities_years, method="nls")
    nls_convergence_rate = nls.attrs.get("nls_convergence_rate", float("nan"))

    comparison = ols.join(nls, lsuffix="_ols", rsuffix="_nls", how="inner")
    return comparison, nls_convergence_rate
