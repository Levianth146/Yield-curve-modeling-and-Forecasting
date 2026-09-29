"""
forecasting.py
==============
RQ2: du bao Level / Slope / Curvature bang AR(p) rieng le, doi chung voi
Random Walk benchmark, kiem dinh Diebold-Mariano.

CHANGELOG (2026-09-28):
  1. Bo tham so `old_names=False` khoi cac loi goi `ar_select_order()`/
     `AutoReg()` - phat hien khi chay thu notebook 02_ar_forecast.ipynb that
     lan dau (truoc do chua tung chay, xem docs/audit_findings.md). Tham so
     nay da bi statsmodels 0.15.x go bo, goi voi no gay TypeError.
  2. diebold_mariano_test(): sua uoc luong phuong sai dai han (long-run
     variance) cua d_t tu tong KHONG TRONG SO cac tu hiep phuong sai
     (gamma_0 + 2*sum gamma_k, k=1..h-1) sang co trong so Bartlett
     (Newey-West-style, w_k = 1 - k/h) - CHUAN trong tai lieu Diebold-Mariano
     va cac ban mo rong sau nay (Harvey-Leybourne-Newbold 1997). Phat hien
     khi kiem tra tai sao bang so sanh AR vs RW o horizon=12 luon cho
     DM_stat/DM_pvalue = NaN cho CA 3 nhan to: ban khong trong so cong don
     nhieu hiep phuong sai AM o cac lag lon (voi n=22 quan sat, tu tuong quan
     manh do du bao chong lan tai h=12) khien tong phuong sai am (~-48.9),
     rơi vao nhanh `if var_d <= 0: return NaN`. Ban co trong so Bartlett giam
     dan anh huong cua cac lag xa, tra ve phuong sai duong hop ly (~37.1),
     cho phep tinh duoc DM test o h=12 thay vi bo trang.
"""

import numpy as np
import pandas as pd
from statsmodels.tsa.ar_model import AutoReg
from statsmodels.tsa.stattools import acf

from . import config
from .utils import MONTHLY_FREQ, MONTHLY_PERIOD, ensure_monthly_freq


def train_test_split_ts(series: pd.Series, split_date=config.TRAIN_TEST_SPLIT_DATE):
    """Chia chuoi thoi gian theo moc thoi gian (khong shuffle)."""
    series = ensure_monthly_freq(series)
    train = ensure_monthly_freq(series[series.index <= split_date])
    test = ensure_monthly_freq(series[series.index > split_date])
    return train, test


def select_ar_lag(series: pd.Series, maxlag=config.AR_MAX_LAG, ic=None):
    """Chon do tre AR toi uu bang AIC/BIC, dua tren AutoReg.ar_select_order."""
    from statsmodels.tsa.ar_model import ar_select_order
    ic = ic or config.AR_LAG_IC
    series = ensure_monthly_freq(series.dropna())
    sel = ar_select_order(series, maxlag=maxlag, ic=ic)
    return sel.ar_lags[-1] if sel.ar_lags else 1


def fit_ar_model(train_series: pd.Series, lag=None):
    """
    Fit AR(p) cho MOT nhan to (level/slope/curvature).

    Neu lag=None, tu chon bang AIC.
    """
    train_series = ensure_monthly_freq(train_series.dropna())
    if lag is None:
        lag = select_ar_lag(train_series)
    model = AutoReg(train_series, lags=lag)
    results = model.fit()
    return results, lag


def forecast_ar(ar_results, steps, freq=MONTHLY_PERIOD):
    """Du bao `steps` ky tiep theo tu mo hinh AR da fit."""
    forecast = ar_results.forecast(steps=steps)
    return forecast


def random_walk_forecast(series: pd.Series, steps: int, freq=MONTHLY_PERIOD):
    """Benchmark: du bao = gia tri quan sat cuoi cung, khong doi qua cac ky."""
    series = ensure_monthly_freq(series)
    last_value = series.iloc[-1]
    start = series.index[-1] + 1
    idx = pd.period_range(start=start, periods=steps, freq=MONTHLY_PERIOD)
    return pd.Series([last_value] * steps, index=idx)


def evaluate_forecast(actual: pd.Series, predicted: pd.Series):
    """RMSE / MAE giua du bao va gia tri thuc te (out-of-sample)."""
    common_idx = actual.index.intersection(predicted.index)
    err = actual.loc[common_idx] - predicted.loc[common_idx]
    rmse = np.sqrt((err ** 2).mean())
    mae = err.abs().mean()
    return {"RMSE": rmse, "MAE": mae, "n_obs": len(common_idx)}


def diebold_mariano_test(actual: pd.Series, pred1: pd.Series, pred2: pd.Series,
                          h: int = 1, loss="squared"):
    """
    Diebold-Mariano test so sanh nang luc du bao cua pred1 (vd AR) va
    pred2 (vd Random Walk). H0: hai mo hinh co do chinh xac nhu nhau.

    Statsmodels khong co san ham nay - cai dat tay theo Diebold & Mariano (1995).

    Returns
    -------
    dict {"DM_stat": float, "p_value": float}
    """
    common_idx = actual.index.intersection(pred1.index).intersection(pred2.index)
    e1 = (actual.loc[common_idx] - pred1.loc[common_idx]).values
    e2 = (actual.loc[common_idx] - pred2.loc[common_idx]).values

    if loss == "squared":
        d = e1 ** 2 - e2 ** 2
    else:
        d = np.abs(e1) - np.abs(e2)

    n = len(d)
    if n < 2:
        return {"DM_stat": np.nan, "p_value": np.nan}

    d_mean = d.mean()
    # Uoc luong phuong sai dai han co dieu chinh autocorrelation den lag h-1,
    # dung trong so Bartlett (Newey-West-style: w_k = 1 - k/h) de dam bao
    # uoc luong duong (positive semi-definite) - xem CHANGELOG dau file.
    # Khong co trong so nay, tong cac hiep phuong sai am o lag lon (thuong
    # gap khi n nho va du bao chong lan o horizon dai) co the lam phuong sai
    # uoc luong am mot cach gia tao.
    # gamma_k = (1/n) * sum_t (d_t - dbar)(d_{t-k} - dbar): chuan hoa CUNG mot cach (chia n,
    # tru trung binh toan mau) cho moi k, gamma_0 = var(ddof=0). (Ban truoc dung np.cov voi
    # ddof=1 va trung binh tung mau con cho k>=1, lech nhe so voi gamma_0.)
    dc = d - d_mean
    var_d = float(np.dot(dc, dc)) / n
    for lag in range(1, h):
        gamma_k = float(np.dot(dc[lag:], dc[:-lag])) / n
        weight = 1 - lag / h
        var_d += 2 * weight * gamma_k
    var_d /= n

    if var_d <= 0:
        return {"DM_stat": np.nan, "p_value": np.nan}

    dm_stat = d_mean / np.sqrt(var_d)

    # Hieu chinh mau nho Harvey-Leybourne-Newbold (1997): nhan sqrt((n+1-2h+h(h-1)/n)/n)
    # va dung phan phoi t(n-1). Bo qua neu he so khong duong (n qua nho so voi h).
    hln_factor = (n + 1 - 2 * h + h * (h - 1) / n) / n
    if hln_factor > 0:
        dm_stat = dm_stat * np.sqrt(hln_factor)
    else:
        return {"DM_stat": np.nan, "p_value": np.nan}

    from scipy.stats import t as t_dist
    p_value = 2 * (1 - t_dist.cdf(np.abs(dm_stat), df=n - 1))

    return {"DM_stat": dm_stat, "p_value": p_value, "n_obs": n}


def run_ar_vs_rw_pipeline(factors_df: pd.DataFrame, factor_col: str,
                           horizons=config.AR_FORECAST_HORIZONS,
                           split_date=config.TRAIN_TEST_SPLIT_DATE,
                           rolling: bool = True, ic=None):
    """
    Pipeline day du cho MOT nhan to: chia train/test, fit AR, forecast
    nhieu horizon, so sanh voi Random Walk, chay Diebold-Mariano.

    Neu rolling=True (mac dinh): expanding-window OOS — tai moi thoi diem
    trong tap test, fit lai AR tren lich su den t-1, du bao h buoc, thu thap
    loi tai horizon h. Day la danh gia dung hon one-shot 1 lan.

    Returns
    -------
    pd.DataFrame: mot dong / horizon, cot RMSE_AR, RMSE_RW, DM_stat, DM_pvalue
    """
    series = ensure_monthly_freq(factors_df[factor_col].dropna().astype(float))
    train, test = train_test_split_ts(series, split_date)
    if len(test) == 0:
        return pd.DataFrame()

    # Lag chon 1 lan tren train de on dinh so sanh
    lag = select_ar_lag(train, ic=ic)

    rows = []
    for h in horizons:
        if rolling:
            ar_preds, rw_preds, actuals = [], [], []
            # Can it nhat h quan sat sau moc origin
            for i in range(0, len(test) - h + 1):
                origin_loc = train.index[-1] if i == 0 else test.index[i - 1]
                hist = ensure_monthly_freq(series.loc[:origin_loc])
                if len(hist) < lag + 5:
                    continue
                try:
                    ar_res, _ = fit_ar_model(hist, lag=lag)
                    ar_fc = forecast_ar(ar_res, steps=h)
                    target_idx = test.index[i + h - 1]
                    ar_preds.append(float(ar_fc.iloc[h - 1]))
                    rw_preds.append(float(hist.iloc[-1]))
                    actuals.append(float(series.loc[target_idx]))
                except Exception:
                    continue

            if len(actuals) < 2:
                continue

            actual_s = pd.Series(actuals)
            ar_s = pd.Series(ar_preds)
            rw_s = pd.Series(rw_preds)
            eval_ar = {
                "RMSE": float(np.sqrt(np.mean((actual_s - ar_s) ** 2))),
                "MAE": float(np.mean(np.abs(actual_s - ar_s))),
                "n_obs": len(actual_s),
            }
            eval_rw = {
                "RMSE": float(np.sqrt(np.mean((actual_s - rw_s) ** 2))),
                "MAE": float(np.mean(np.abs(actual_s - rw_s))),
                "n_obs": len(actual_s),
            }
            dm = diebold_mariano_test(actual_s, ar_s, rw_s, h=h)
        else:
            if len(test) < h:
                continue
            ar_results, _ = fit_ar_model(train, lag=lag)
            ar_fc = forecast_ar(ar_results, steps=h)
            rw_fc = random_walk_forecast(train, steps=h)
            actual_h = test.iloc[:h]
            eval_ar = evaluate_forecast(actual_h, ar_fc)
            eval_rw = evaluate_forecast(actual_h, rw_fc)
            dm = diebold_mariano_test(actual_h, ar_fc, rw_fc, h=h)

        rows.append({
            "factor": factor_col, "horizon": h, "ar_lag": lag,
            "RMSE_AR": eval_ar["RMSE"], "RMSE_RW": eval_rw["RMSE"],
            "MAE_AR": eval_ar["MAE"], "MAE_RW": eval_rw["MAE"],
            "n_obs": eval_ar.get("n_obs"),
            "DM_stat": dm["DM_stat"], "DM_pvalue": dm.get("p_value"),
        })

    return pd.DataFrame(rows)


def run_yield_curve_forecast(factors_df: pd.DataFrame, yields_monthly: pd.DataFrame,
                             maturities: dict, horizons=config.AR_FORECAST_HORIZONS,
                             split_date=config.TRAIN_TEST_SPLIT_DATE,
                             lam: float = config.NS_LAMBDA_FIXED, ic=None):
    """
    Du bao DUONG CONG tai tung ky han: du bao 3 nhan to bang AR (lag chon tren
    train cho tung nhan to, expanding-window), tai dung loi suat
    y(tau) = b0 + b1*L1 + b2*L2, roi so voi Random Walk cua chinh loi suat
    (y_{t+h} = y_t). DM co hieu chinh HLN tren ham mat mat binh phuong.

    Parameters
    ----------
    factors_df : cot level/slope/curvature, index thang (Period hoac Datetime)
    yields_monthly : loi suat cuoi thang, cot = ma FRED, index thang
    maturities : {ma_FRED: ky_han_nam}
    """
    from .nelson_siegel import nelson_siegel

    cols = ["level", "slope", "curvature"]
    fac = ensure_monthly_freq(factors_df[cols].dropna().astype(float))
    ym = yields_monthly.copy()
    if not isinstance(ym.index, pd.PeriodIndex):
        ym.index = pd.DatetimeIndex(ym.index).to_period("M")
    ym = ym.reindex(fac.index)
    codes = [c for c in maturities if c in ym.columns]
    tau = np.array([maturities[c] for c in codes], dtype=float)

    train0, test0 = train_test_split_ts(fac["level"], split_date)
    if len(test0) == 0:
        return pd.DataFrame()
    lags = {c: select_ar_lag(train_test_split_ts(fac[c], split_date)[0], ic=ic) for c in cols}
    max_lag = max(lags.values())

    rows = []
    for h in horizons:
        preds_ar, preds_rw, acts = [], [], []
        for i in range(0, len(test0) - h + 1):
            origin = train0.index[-1] if i == 0 else test0.index[i - 1]
            target = test0.index[i + h - 1]
            hist = fac.loc[:origin]
            if len(hist) < max_lag + 5:
                continue
            try:
                f = []
                for c in cols:
                    res, _ = fit_ar_model(ensure_monthly_freq(hist[c]), lag=lags[c])
                    f.append(float(forecast_ar(res, steps=h).iloc[h - 1]))
                y_ar = nelson_siegel(tau, f[0], f[1], f[2], lam)
            except Exception:
                continue
            y_rw = ym.loc[origin, codes].to_numpy(dtype=float)
            y_act = ym.loc[target, codes].to_numpy(dtype=float)
            preds_ar.append(y_ar); preds_rw.append(y_rw); acts.append(y_act)
        if len(acts) < 3:
            continue
        A, R, Y = np.array(preds_ar), np.array(preds_rw), np.array(acts)
        for j, c in enumerate(codes):
            ok = ~np.isnan(Y[:, j]) & ~np.isnan(R[:, j])
            if ok.sum() < 3:
                continue
            a, r, y = A[ok, j], R[ok, j], Y[ok, j]
            dm = diebold_mariano_test(pd.Series(y), pd.Series(a), pd.Series(r), h=h)
            rmse_ar = float(np.sqrt(np.mean((y - a) ** 2)))
            rmse_rw = float(np.sqrt(np.mean((y - r) ** 2)))
            rows.append({
                "maturity": c, "tau_years": maturities[c], "horizon": h,
                "n_obs": int(ok.sum()),
                "RMSE_AR": rmse_ar, "RMSE_RW": rmse_rw,
                "MAE_AR": float(np.mean(np.abs(y - a))), "MAE_RW": float(np.mean(np.abs(y - r))),
                "improve_pct": 100 * (1 - rmse_ar / rmse_rw),
                "DM_stat": dm["DM_stat"], "DM_pvalue": dm.get("p_value"),
            })
    return pd.DataFrame(rows)
