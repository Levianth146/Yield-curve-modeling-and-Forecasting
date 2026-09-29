"""
probit_recession.py
====================
RQ4: duong cong dao nguoc (spread 10Y-2Y, doi chieu 10Y-3M) -> Probit
du bao xac suat suy thoai (Estrella-Mishkin 1998), danh gia bang
McFadden R^2, ROC/AUC, va kiem dinh in-sample vs out-of-sample.

CHANGELOG (2026-09-28, sau khi doi chieu voi mot ban phan tich Probit doc lap
cua nguoi khac tren cung chu de - xem docs/probit_review_external.md):
  1. build_probit_dataset() them tham so `condition_on_no_recession` (mac
     dinh False, GIU NGUYEN hanh vi cu de khong pha baseline theo PDF). Khi
     True, chi giu lai cac thang ma tai thoi diem t nen kinh te CHUA suy
     thoai (recession_t == 0) truoc khi gan nhan "recession_ahead" - dung
     tinh than goc Estrella-Mishkin: du bao KHOI PHAT mot dot suy thoai moi,
     khong lan cac thang dang o giua mot dot suy thoai dang dien ra (nhan de
     "quan tinh" cua suy thoai lam nhieu tin hieu spread). Dung nhu mot
     robustness check SONG SONG voi ban goc, khong thay the.
  2. evaluate_probit() va train_test_probit() them Brier score (va o
     train_test_probit them ca "naive constant benchmark" - xac suat khong
     doi bang ty le nen o tap train). Brier tinh duoc CA KHI tap test chi co
     1 lop nhan (khac AUC - vi du OOS 2022-2026 hien khong tinh duoc AUC vi
     chua co suy thoai NBER nao), nen bo sung duoc mot phan danh gia OOS ma
     truoc day de trong (`auc_test = null`).
"""

import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.discrete.discrete_model import Probit

from . import config
from .utils import MONTHLY_FREQ, ensure_monthly_freq


def build_probit_dataset(yields_df: pd.DataFrame, recession_series: pd.Series,
                          short_col=config.PROBIT_SHORT_COL_PRIMARY,
                          long_col=config.PROBIT_LONG_COL,
                          horizon_months=config.PROBIT_HORIZON_MONTHS,
                          condition_on_no_recession: bool = False):
    """
    spread(t) = long(t) - short(t)
    recession_ahead(t) = 1 neu co suy thoai trong [t+1, t+horizon_months] (rolling(h).max().shift(-h))

    Mac dinh dung 10Y-2Y (pham vi chinh theo PDF); doi short_col sang
    "DGS3MO" de chay robustness check theo Estrella-Mishkin goc.

    Parameters
    ----------
    condition_on_no_recession : bool, default False
        False (mac dinh, GIU NGUYEN baseline): dung moi thang co du lieu,
        ke ca thang dang o giua mot dot suy thoai.
        True (robustness check - xem CHANGELOG dau file): chi giu lai cac
        thang ma tai t nen kinh te CHUA suy thoai (recession_t == 0), dung
        tinh than goc Estrella-Mishkin (du bao KHOI PHAT suy thoai moi).
    """
    monthly = ensure_monthly_freq(yields_df.resample(MONTHLY_FREQ).last())
    spread = (monthly[long_col] - monthly[short_col]).rename("spread")

    rec_monthly = ensure_monthly_freq(recession_series.resample(MONTHLY_FREQ).max())
    target = (
        rec_monthly.rolling(horizon_months).max()
        .shift(-horizon_months)
        .rename("recession_ahead")
    )

    df = ensure_monthly_freq(pd.concat([spread, target], axis=1).dropna())

    if condition_on_no_recession:
        current_state = rec_monthly.reindex(df.index)
        df = ensure_monthly_freq(df[current_state == 0].copy())

    return df


def flag_inversion_periods(spread: pd.Series, min_run_months: int = 1):
    """
    Xac dinh cac giai doan dao nguoc lien tuc (spread < 0), tra ve DataFrame
    voi start/end/do dai (thang) cua tung giai doan - dung de doi chieu voi
    cac dot dao nguoc lich su (vd 7/2022-9/2024) neu trong PDF co de cap.
    """
    inverted = (spread < 0).astype(int)
    change = inverted.diff().fillna(inverted.iloc[0])
    starts = spread.index[(change == 1) & (inverted == 1)]
    if inverted.iloc[0] == 1:
        starts = starts.insert(0, spread.index[0])

    periods = []
    for start in starts:
        end_candidates = spread.index[(spread.index > start) & (inverted.loc[spread.index] == 0)]
        end = end_candidates[0] if len(end_candidates) else spread.index[-1]
        length = ((end.year - start.year) * 12 + (end.month - start.month))
        if length >= min_run_months:
            periods.append({"start": start, "end": end, "length_months": length})

    return pd.DataFrame(periods)


def fit_probit_recession(df: pd.DataFrame):
    """Uoc luong P(Recession) = Phi(a + b * spread)."""
    X = sm.add_constant(df["spread"])
    y = df["recession_ahead"]

    model = Probit(y, X)
    results = model.fit(disp=False)
    return results


def recession_probability(results, spread_value: float):
    """Tinh xac suat suy thoai tai mot gia tri spread cho truoc."""
    X_new = sm.add_constant(pd.DataFrame({"spread": [spread_value]}), has_constant="add")
    return results.predict(X_new)[0]


def evaluate_probit(results, df: pd.DataFrame):
    """
    Danh gia mo hinh Probit: McFadden pseudo-R^2 (co san trong statsmodels),
    ROC/AUC tren xac suat du bao vs nhan thuc te, va Brier score (danh gia
    do chinh xac cua XAC SUAT du bao, khac AUC chi danh gia kha nang XEP
    HANG - xem CHANGELOG dau file). Brier tinh duoc ke ca khi df chi co 1
    lop nhan (AUC thi khong), nen dung duoc cho ca truong hop OOS test set
    khong co suy thoai nao.
    """
    from sklearn.metrics import roc_auc_score, roc_curve, brier_score_loss

    X = sm.add_constant(df["spread"])
    y_true = df["recession_ahead"]
    y_pred_prob = results.predict(X)

    brier = brier_score_loss(y_true, y_pred_prob)

    if y_true.nunique() > 1:
        auc = roc_auc_score(y_true, y_pred_prob)
        fpr, tpr, thresholds = roc_curve(y_true, y_pred_prob)
        roc_curve_data = {"fpr": fpr, "tpr": tpr, "thresholds": thresholds}
    else:
        auc = None
        roc_curve_data = None

    return {
        "mcfadden_r2": results.prsquared,
        "auc": auc,
        "brier": brier,
        "roc_curve": roc_curve_data,
        "log_likelihood": results.llf,
    }


def train_test_probit(df: pd.DataFrame, split_date=config.PROBIT_TRAIN_END):
    """
    Chia in-sample (train) / out-of-sample (test) theo thoi gian. Fit tren
    train, danh gia tren test - day la "phep thu khac nghiet nhat" ma PDF
    nhan manh (giai doan dao nguoc dai nhat 2022-2026 nhung chua co suy thoai
    duoc NBER xac nhan).

    Ngoai AUC (co the la None neu test set chi co 1 lop nhan - vd OOS
    2022-2026 chua co suy thoai), ham nay LUON tinh duoc Brier score cho tap
    test, cong voi mot "naive constant benchmark": du bao xac suat KHONG DOI
    bang ty le nen (base rate) cua tap train cho moi thang trong test. So
    sanh Brier(Probit) vs Brier(naive) cho biet Probit co du bao XAC SUAT
    chinh xac hon mot chuan don gian hay khong - thong tin nay van co y
    nghia ke ca khi AUC khong tinh duoc (xem CHANGELOG dau file).

    Returns
    -------
    dict {"train_results", "train_metrics", "test_metrics", "test_predictions"}
        test_metrics them 2 khoa moi: "brier" va "brier_naive_benchmark".
    """
    from sklearn.metrics import roc_auc_score, brier_score_loss

    train = df[df.index <= split_date]
    test = df[df.index > split_date]

    train_results = fit_probit_recession(train)
    train_eval = evaluate_probit(train_results, train)

    X_test = sm.add_constant(test["spread"], has_constant="add")
    test_pred = train_results.predict(X_test)

    train_base_rate = train["recession_ahead"].mean()
    naive_pred = np.full(len(test), train_base_rate)

    test_metrics = {
        "brier": brier_score_loss(test["recession_ahead"], test_pred),
        "brier_naive_benchmark": brier_score_loss(test["recession_ahead"], naive_pred),
        "train_base_rate": train_base_rate,
    }
    if test["recession_ahead"].nunique() > 1:
        test_metrics["auc"] = roc_auc_score(test["recession_ahead"], test_pred)
    else:
        test_metrics["auc"] = None  # khong the tinh AUC neu test set chi co 1 lop

    return {
        "train_results": train_results,
        "train_metrics": train_eval,
        "test_metrics": test_metrics,
        "test_predictions": test_pred,
    }


def compare_spread_definitions(yields_df: pd.DataFrame, recession_series: pd.Series):
    """
    Chay Probit song song cho 10Y-2Y (chinh) va 10Y-3M (robustness),
    tra ve bang so sanh he so, McFadden R2, AUC.
    """
    rows = []
    for label, short_col in [
        ("10Y-2Y", config.PROBIT_SHORT_COL_PRIMARY),
        ("10Y-3M", config.PROBIT_SHORT_COL_ROBUSTNESS),
    ]:
        df = build_probit_dataset(yields_df, recession_series, short_col=short_col)
        results = fit_probit_recession(df)
        ev = evaluate_probit(results, df)
        rows.append({
            "spread_def": label,
            "coef_spread": results.params["spread"],
            "pvalue_spread": results.pvalues["spread"],
            "mcfadden_r2": ev["mcfadden_r2"],
            "auc": ev["auc"],
        })
    return pd.DataFrame(rows)


# ===========================================================================
# THIET KE CHINH (chot voi nhom, 2026-09-29): mau dai tu 1976, train <= 1998-12,
# bo 1999, test tu 2000-01. Xem docs/audit_team_report_raw.md muc C4.
#  - spread thang = quan sat hop le CUOI CUNG cua thang (khong phai trung binh)
#  - nhan = 1 neu co USRECM = 1 trong bat ky thang nao t+1..t+12
#  - chi giu thang chua suy thoai tai t (USRECM_t == 0) va da co du 12 thang tuong lai
#  - doi chung Brier: xac suat khong doi = ty le nen cua tap train
# ===========================================================================

def build_probit_monthly(spreads_daily: pd.DataFrame, recession: pd.Series,
                         spread_col: str = "T10Y2Y", horizon_months: int = 12):
    """
    Returns
    -------
    (full, sample): full = moi thang co spread (cot spread, inverted, recession,
    recession_ahead - NaN o 12 thang cuoi); sample = tap con chua suy thoai tai t
    va co nhan (dung de uoc luong/danh gia).
    """
    s = spreads_daily[spread_col].dropna()
    spread = s.groupby(s.index.to_period("M")).last().rename("spread")
    rec = recession.copy()
    rec.index = rec.index.to_period("M")
    rec = rec[~rec.index.duplicated(keep="last")].astype(float).rename("recession")
    full = pd.concat([spread, rec], axis=1, join="inner").dropna(subset=["spread"])
    # max(rec[t+1..t+h]); NaN cho h thang cuoi
    ahead = rec.reindex(full.index).rolling(horizon_months).max().shift(-horizon_months)
    full["recession_ahead"] = ahead
    full["inverted"] = (full["spread"] < 0).astype(int)
    sample = full[(full["recession"] == 0) & full["recession_ahead"].notna()].copy()
    return full, sample


def _fit_probit_col(frame: pd.DataFrame, col: str):
    X = sm.add_constant(frame[[col]].astype(float), has_constant="add")
    return Probit(frame["recession_ahead"].astype(float), X).fit(disp=False, maxiter=200)


def _predict_col(res, frame: pd.DataFrame, col: str):
    X = sm.add_constant(frame[[col]].astype(float), has_constant="add")
    return pd.Series(res.predict(X), index=frame.index)


def _scores(y, p, base_rate):
    from sklearn.metrics import roc_auc_score, brier_score_loss
    y = np.asarray(y, dtype=float)
    brier = float(brier_score_loss(y, p))
    brier_naive = float(brier_score_loss(y, np.full(len(y), base_rate)))
    return {
        "auc": float(roc_auc_score(y, p)) if len(np.unique(y)) > 1 else None,
        "brier": brier,
        "brier_naive": brier_naive,
        "bss": 1.0 - brier / brier_naive,   # Brier Skill Score so voi hang so; > 0 = tot hon
    }


def evaluate_fixed_split(sample: pd.DataFrame, col: str = "spread",
                         train_end: str = config.PROBIT_MAIN_TRAIN_END,
                         test_start: str = config.PROBIT_MAIN_TEST_START):
    """Fit 1 lan tren train (<= train_end), danh gia tren test (>= test_start)."""
    train = sample.loc[:train_end]
    test = sample.loc[test_start:]
    res = _fit_probit_col(train, col)
    p = _predict_col(res, test, col)
    base = float(train["recession_ahead"].mean())
    out = {
        "n_train": int(len(train)), "n_test": int(len(test)),
        "train_positive": int(train["recession_ahead"].sum()),
        "test_positive": int(test["recession_ahead"].sum()),
        "train_start": str(train.index.min()), "train_end": str(train.index.max()),
        "test_start": str(test.index.min()), "test_end": str(test.index.max()),
        "train_base_rate": base,
        "coef_const": float(res.params["const"]), "coef": float(res.params[col]),
        "pvalue_coef": float(res.pvalues[col]),
        "mcfadden_r2_train": float(res.prsquared),
    }
    out.update(_scores(test["recession_ahead"], p, base))
    return out, res, p


def evaluate_expanding(sample: pd.DataFrame, col: str = "spread",
                       test_start: str = config.PROBIT_MAIN_TEST_START,
                       horizon_months: int = 12):
    """
    Uoc luong lai moi thang: tai thang t chi dung cac quan sat s <= t - horizon
    (nhan cua s chi duoc biet sau s + horizon thang) - khong nhin truoc tuong lai.
    """
    test = sample.loc[test_start:]
    preds, coefs, bases = [], [], []
    for t in test.index:
        tr = sample.loc[: t - horizon_months]
        if tr["recession_ahead"].nunique() < 2:
            continue
        res = _fit_probit_col(tr, col)
        preds.append((t, float(_predict_col(res, test.loc[[t]], col).iloc[0])))
        coefs.append(float(res.params[col]))
        bases.append(float(tr["recession_ahead"].mean()))   # doi chung: ty le nen cua chinh du lieu da biet
    p = pd.Series(dict(preds))
    y = test.loc[p.index, "recession_ahead"].astype(float)
    b = np.array(bases)
    brier = float(np.mean((p.values - y.values) ** 2))
    brier_naive = float(np.mean((b - y.values) ** 2))
    from sklearn.metrics import roc_auc_score
    out = {"n_test": int(len(p)), "coef_first": coefs[0], "coef_last": coefs[-1],
           "coef_min": float(np.min(coefs)), "coef_max": float(np.max(coefs)),
           "auc": float(roc_auc_score(y, p)), "brier": brier, "brier_naive": brier_naive,
           "bss": 1.0 - brier / brier_naive}
    return out, p


def stress_path(full: pd.DataFrame, res, start: str = config.PROBIT_STRESS_START, col: str = "spread"):
    """Xac suat mo hinh (da fit tren train) cho MOI thang tu `start`, ke ca thang chua co nhan."""
    seg = full.loc[start:].copy()
    seg["prob"] = _predict_col(res, seg, col)
    return seg
