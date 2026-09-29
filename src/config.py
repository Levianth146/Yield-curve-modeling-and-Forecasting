"""
config.py
=========
Cau hinh dung chung cho toan bo project: API key, danh sach series FRED,
pham vi thoi gian, cac hang so mo hinh (lambda NS, horizon forecast, ...).

Khong import bat ky module noi bo nao khac o day (config phai la la thap
nhat trong dependency graph) de tranh circular import.
"""

import os

# ---------------------------------------------------------------------------
# API KEYS
# ---------------------------------------------------------------------------
# Uu tien doc tu bien moi truong, fallback ve chuoi rong de fail som va ro
# rang thay vi loi mo ho tu fredapi.
FRED_API_KEY = os.environ.get("FRED_API_KEY", "")

# ---------------------------------------------------------------------------
# PHAM VI DU LIEU (theo scope da chot trong PDF: 2000-01 -> 2026-08)
# ---------------------------------------------------------------------------
START_DATE = "2000-01-01"
# CPI YoY can 12 thang truoc => tai vi mo som hon 12 thang, neu khong VAR mat nam 2000
# (mau VAR 307 thang thay vi 319 thang theo pham vi 2000-01 -> 2026-08).
MACRO_START_DATE = "1999-01-01"
END_DATE = None  # None = lay den ngay gan nhat co san

# ---------------------------------------------------------------------------
# TREASURY SERIES (ma FRED -> ky han theo nam)
# ---------------------------------------------------------------------------
TREASURY_SERIES = {
    "DGS1MO": 1 / 12,
    "DGS3MO": 3 / 12,
    "DGS6MO": 6 / 12,
    "DGS1": 1,
    "DGS2": 2,
    "DGS3": 3,
    "DGS5": 5,
    "DGS7": 7,
    "DGS10": 10,
    "DGS20": 20,
    "DGS30": 30,
}

# Tap ky han dung cho Nelson-Siegel (thiet ke nhom: 10 ky han, bo DGS1MO vi chi co
# tu 2001-07 va lam nhieu Curvature; RMSE thang 9.4bp voi 10 ky han vs 10.3bp voi 11).
NS_SERIES = {k: v for k, v in TREASURY_SERIES.items() if k != "DGS1MO"}

# ---------------------------------------------------------------------------
# MACRO SERIES
# ---------------------------------------------------------------------------
MACRO_SERIES = {
    "CPIAUCSL": "cpi",        # CPI, theo thang -> tinh YoY sau
    "FEDFUNDS": "fed_funds",  # Lai suat dieu hanh Fed
}

RECESSION_SERIES = "USRECM"  # bien nhi phan NBER (peak->trough, gom ca thang dinh), theo thang - dung theo bao cao nhom

# ---------------------------------------------------------------------------
# NELSON-SIEGEL
# ---------------------------------------------------------------------------
# Diebold-Li (2006): lambda = 0.0609 khi ky han tinh theo THANG (dinh cua he so
# Curvature o 30 thang). Repo nay dung ky han theo NAM (TREASURY_SERIES) nen
# phai quy doi: 0.0609 * 12 = 0.7308 (dinh Curvature ~2.5 nam).
NS_LAMBDA_DIEBOLD_LI_MONTHS = 0.0609
NS_LAMBDA_FIXED = NS_LAMBDA_DIEBOLD_LI_MONTHS * 12   # = 0.7308, tau theo nam
NS_LAMBDA_INITIAL_GUESS = NS_LAMBDA_FIXED             # seed cho NLS
NS_MIN_OBS_PER_DAY = 9          # >= 9/11 ky han/ngay moi fit (khong ffill du lieu thieu)

# ---------------------------------------------------------------------------
# PROBIT / RECESSION
# ---------------------------------------------------------------------------
PROBIT_SHORT_COL_PRIMARY = "DGS2"    # spread chinh: 10Y - 2Y (theo pham vi PDF)
PROBIT_LONG_COL = "DGS10"
PROBIT_SHORT_COL_ROBUSTNESS = "DGS3MO"  # robustness check: 10Y - 3M (Estrella-Mishkin goc)
PROBIT_HORIZON_MONTHS = 12
PROBIT_TRAIN_END = "2021-12-31"  # in-sample train, out-of-sample test tu 2022 tro di
                                   # (giai doan "phep thu khac nghiet nhat" theo PDF)

# ---------------------------------------------------------------------------
# FORECASTING (AR / VAR)
# ---------------------------------------------------------------------------
AR_MAX_LAG = 12
AR_LAG_IC = "bic"  # chon lag chi tren tap train; BIC gon hon (AIC chon p=9 cho slope va du bao te hon - xem docs/fix_log.md #6)
AR_FORECAST_HORIZONS = [1, 3, 6, 12]  # thang
TRAIN_TEST_SPLIT_DATE = "2015-12-31"   # train <= date nay, test sau do (~128 diem OOS h=1; trung voi ban E2E khac: test tu 2016-01)
TRAIN_TEST_SPLIT_RECENT = "2023-12-31"  # kiem tra phu: chi giai doan gan day (~21-32 diem OOS, power thap)

VAR_MAX_LAG = 6
VAR_IC = "aic"

# World Bank (phan mo rong Viet Nam)
WB_INDICATORS = {
    "FP.CPI.TOTL.ZG": "cpi_inflation_yoy",
    "NY.GDP.MKTP.KD.ZG": "gdp_growth",
    "FR.INR.RINR": "real_interest_rate",
}


# ---------------------------------------------------------------------------
# PROBIT - THIET KE CHINH (chot voi nhom: train 1976-06 -> 1998-12, bo 1999, test 2000-01 ->)
# Xem docs/audit_team_report_raw.md (C4) va bao cao nhom (muc "Duong cong dao nguoc...").
# ---------------------------------------------------------------------------
PROBIT_SPREAD_SERIES = ("T10Y2Y", "T10Y3M")   # spread chinh + doi chieu (FRED, theo ngay, tinh san)
PROBIT_DATA_START = "1960-01-01"              # T10Y2Y bat dau 1976-06, T10Y3M 1982-01
PROBIT_MAIN_TRAIN_END = "1998-12"             # bo nam 1999 de moi nhan train da "chin" truoc khi test
PROBIT_MAIN_TEST_START = "2000-01"
PROBIT_STRESS_START = "2022-01"               # doi chieu rieng giai doan 2022-2026 (PDF)
