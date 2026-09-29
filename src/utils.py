"""
utils.py
========
Ham dung chung, khong thuoc rieng RQ nao: resample, vif check, format bang.
"""

import numpy as np
import pandas as pd

# Month-end / monthly period alias
MONTHLY_FREQ = "ME"
MONTHLY_PERIOD = "M"


def ensure_monthly_freq(obj, freq: str = MONTHLY_FREQ):
    """
    Chuyen index sang PeriodIndex thang (freq='M') de statsmodels AutoReg/VAR
    khong canh bao 'No frequency information...'.

    PeriodIndex giu freq ngay ca khi thieu 1-2 thang (khac DatetimeIndex).
    CSV load / slice van duoc chuan hoa ve period thang.
    """
    out = obj.copy()
    if isinstance(out.index, pd.PeriodIndex):
        if out.index.freq is None:
            out.index = out.index.asfreq(MONTHLY_PERIOD)
        return out

    out.index = pd.DatetimeIndex(pd.to_datetime(out.index))
    if len(out) == 0:
        return out

    out.index = out.index.to_period(MONTHLY_PERIOD)
    out = out[~out.index.duplicated(keep="last")].sort_index()
    return out


def resample_to_monthly(df: pd.DataFrame, method: str = "last") -> pd.DataFrame:
    """
    Resample DataFrame theo ngay ve tan suat thang. `method="last"` (gia
    tri cuoi thang) la lua chon nhat quan voi cach FRED bao cao yield -
    dung method nay xuyen suot project, khong tron voi "mean".

    Tra ve DatetimeIndex (uu tien gan freq ME). Goi ensure_monthly_freq()
    truoc khi fit AutoReg/VAR de doi sang PeriodIndex.
    """
    if method == "last":
        out = df.resample(MONTHLY_FREQ).last()
    elif method == "mean":
        out = df.resample(MONTHLY_FREQ).mean()
    else:
        raise ValueError(f"method khong ho tro: {method}")
    inferred = pd.infer_freq(out.index)
    if inferred is not None:
        out = out.copy()
        out.index = pd.DatetimeIndex(out.index, freq=inferred)
    return out


def compute_vif(df: pd.DataFrame) -> pd.DataFrame:
    """
    Variance Inflation Factor cho tung cot trong df - dung de kiem tra
    multicollinearity truoc khi dien giai he so VAR (Level/Slope/Curvature
    von khong truc giao hoan toan voi CPI/Fed funds).
    """
    from statsmodels.stats.outliers_influence import variance_inflation_factor

    X = df.dropna()
    X = sm_add_constant_safe(X)
    vif_data = pd.DataFrame()
    vif_data["variable"] = X.columns
    vif_data["VIF"] = [
        variance_inflation_factor(X.values, i) for i in range(X.shape[1])
    ]
    return vif_data[vif_data["variable"] != "const"]


def sm_add_constant_safe(df: pd.DataFrame) -> pd.DataFrame:
    import statsmodels.api as sm
    return sm.add_constant(df)


def summarize_confusion_matrix(y_true, y_pred_prob, threshold: float = 0.5):
    """
    Confusion matrix tai mot nguong xac suat cho truoc - bo sung cho AUC
    (quan trong vi lop "suy thoai" thieu can bang, ~15% so thang).
    """
    from sklearn.metrics import confusion_matrix, classification_report

    y_pred = (np.asarray(y_pred_prob) >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred)
    report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
    return {"confusion_matrix": cm, "report": report, "threshold": threshold}
