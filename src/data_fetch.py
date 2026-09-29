"""
data_fetch.py
=============
Lay du lieu tho tu FRED (loi suat, CPI, Fed funds, recession) va tu
World Bank DataBank (phan mo rong Viet Nam).

Day la lop duy nhat duoc phep goi network - cac module khac chi nhan
DataFrame lam input, khong tu fetch.

CHANGELOG (2026-09-28): them cache-first fallback (use_cache=True mac dinh)
cho ca fetch_fred_data() va fetch_worldbank_data() - doc tu file da fetch
san trong data/outputs (do scripts/run_pipeline.py::main()/run_vn() ghi ra)
neu co, chi goi network khi thieu cache hoac use_cache=False. Ly do: (1) moi
truong chay notebook/kiem thu khong phai luc nao cung co mang ra ngoai
(vd sandbox khong cho ket noi fred.stlouisfed.org), (2) tranh goi FRED/World
Bank lai tu dau moi lan mo notebook trong khi du lieu that da co san va
khong doi. Khong tu ghi cache sau khi fetch live - viec ghi file van do
scripts/run_pipeline.py dam nhiem nhu truoc, tranh trung logic ghi file.
"""

import io
import urllib.request
from pathlib import Path

import pandas as pd

from . import config

_FRED_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"

_ROOT = Path(__file__).resolve().parents[1]
_DATA_DIR = _ROOT / "data"
_OUT_DIR = _ROOT / "outputs"
_FRED_CACHE_FILES = {
    "yields": _DATA_DIR / "yields_daily.csv",
    "macro": _DATA_DIR / "macro_raw.csv",
    "recession": _DATA_DIR / "recession.csv",
}
_PROBIT_CACHE_FILES = {
    "spreads": _DATA_DIR / "probit_spreads_daily.csv",
    "recession": _DATA_DIR / "recession_full.csv",
}
_WB_CACHE_FILE = _OUT_DIR / "vn_worldbank_macro.csv"


def _load_fred_cache():
    yields = pd.read_csv(_FRED_CACHE_FILES["yields"], index_col=0, parse_dates=True)
    macro = pd.read_csv(_FRED_CACHE_FILES["macro"], index_col=0, parse_dates=True)
    recession = pd.read_csv(_FRED_CACHE_FILES["recession"], index_col=0, parse_dates=True).iloc[:, 0]
    recession.name = "recession"
    return yields, macro, recession


def _download_fred_csv(series_id: str, start=None) -> pd.Series:
    """Tai 1 series FRED qua CSV cong khai (khong can API key)."""
    url = _FRED_CSV_URL.format(series_id=series_id)
    with urllib.request.urlopen(url, timeout=60) as resp:
        raw = resp.read()
    df = pd.read_csv(io.BytesIO(raw))
    date_col = df.columns[0]
    value_col = df.columns[1]
    s = pd.to_numeric(df[value_col], errors="coerce")
    s.index = pd.to_datetime(df[date_col])
    s.name = series_id
    s = s.sort_index()
    start = pd.Timestamp(start or config.START_DATE)
    s = s[s.index >= start]
    if config.END_DATE:
        s = s[s.index <= pd.Timestamp(config.END_DATE)]
    return s


def _fetch_fred_via_csv():
    """Fallback khi FRED_API_KEY chua set."""
    yields = pd.DataFrame({
        code: _download_fred_csv(code) for code in config.TREASURY_SERIES
    })
    yields.index.name = "date"
    yields = yields.sort_index().dropna(how="all")  # KHONG ffill: khong tu che du lieu thieu

    macro = pd.DataFrame({
        name: _download_fred_csv(code, start=config.MACRO_START_DATE)
        for code, name in config.MACRO_SERIES.items()
    })
    macro.index.name = "date"

    recession = _download_fred_csv(config.RECESSION_SERIES)
    recession.name = "recession"
    return yields, macro, recession


def _fetch_fred_via_api():
    from fredapi import Fred

    fred = Fred(api_key=config.FRED_API_KEY)
    yields = pd.DataFrame({
        code: fred.get_series(
            code,
            observation_start=config.START_DATE,
            observation_end=config.END_DATE,
        )
        for code in config.TREASURY_SERIES
    })
    yields.index.name = "date"
    yields = yields.sort_index().dropna(how="all")  # KHONG ffill: khong tu che du lieu thieu

    macro = pd.DataFrame({
        name: fred.get_series(
            code,
            observation_start=config.MACRO_START_DATE,
            observation_end=config.END_DATE,
        )
        for code, name in config.MACRO_SERIES.items()
    })
    macro.index.name = "date"

    recession = fred.get_series(
        config.RECESSION_SERIES,
        observation_start=config.START_DATE,
        observation_end=config.END_DATE,
    )
    recession.name = "recession"
    return yields, macro, recession


def fetch_fred_data(use_cache: bool = True):
    """
    Ket noi FRED va tai ve:
      - yields: DataFrame loi suat da ky han, index = ngay
      - macro: DataFrame CPI + Fed funds, index = ngay
      - recession: Series nhi phan NBER (USRECM), index = ngay

    Uu tien FRED_API_KEY; neu thieu thi dung CSV cong khai FRED.

    Parameters
    ----------
    use_cache : bool, default True
        Neu True va ca 3 file `data/yields_daily.csv`, `data/macro_raw.csv`,
        `data/recession.csv` da ton tai (do `scripts/run_pipeline.py::main()`
        ghi ra tu lan fetch truoc), doc thang tu cache thay vi goi network.
        Dat False de bat buoc fetch lai tu FRED (vd khi muon cap nhat du lieu
        moi nhat).

    Returns
    -------
    (yields, macro, recession) : tuple[pd.DataFrame, pd.DataFrame, pd.Series]
    """
    if use_cache and all(p.exists() for p in _FRED_CACHE_FILES.values()):
        return _load_fred_cache()

    if config.FRED_API_KEY:
        return _fetch_fred_via_api()
    return _fetch_fred_via_csv()


def fetch_probit_data(use_cache: bool = True):
    """
    Du lieu cho thiet ke Probit chinh (mau dai tu 1976): spread T10Y2Y/T10Y3M theo
    ngay (FRED tinh san) va USRECM theo thang (toan bo lich su).

    Returns
    -------
    (spreads, recession_full) : (DataFrame[T10Y2Y, T10Y3M] index ngay, Series USRECM index thang)
    """
    cf = _PROBIT_CACHE_FILES
    if use_cache and all(p.exists() for p in cf.values()):
        spreads = pd.read_csv(cf["spreads"], index_col=0, parse_dates=True)
        rec = pd.read_csv(cf["recession"], index_col=0, parse_dates=True).iloc[:, 0]
        rec.name = "recession"
        return spreads, rec

    start = config.PROBIT_DATA_START
    if config.FRED_API_KEY:
        from fredapi import Fred
        fred = Fred(api_key=config.FRED_API_KEY)
        spreads = pd.DataFrame({
            c: fred.get_series(c, observation_start=start) for c in config.PROBIT_SPREAD_SERIES})
        rec = fred.get_series(config.RECESSION_SERIES, observation_start=start)
    else:
        spreads = pd.DataFrame({
            c: _download_fred_csv(c, start=start) for c in config.PROBIT_SPREAD_SERIES})
        rec = _download_fred_csv(config.RECESSION_SERIES, start=start)
    spreads.index.name = "date"
    rec.name = "recession"
    return spreads.sort_index(), rec.sort_index()


def fetch_worldbank_data(country_codes=("VN",), indicators=None, use_cache: bool = True):
    """
    Lay du lieu vi mo Viet Nam tu World Bank API (JSON theo indicator).

    Luu y: du lieu World Bank la theo NAM, khong join truc tiep vao VAR
    thang duoc - dung lam robustness check hoac noi suy neu chap nhan do tho.

    Parameters
    ----------
    use_cache : bool, default True
        Neu True, country_codes=("VN",) va `outputs/vn_worldbank_macro.csv`
        da ton tai (do `scripts/run_pipeline.py::run_vn()` ghi ra tu lan
        fetch truoc), doc thang tu cache thay vi goi network.
    """
    import json
    import urllib.request

    if (
        use_cache
        and country_codes == ("VN",)
        and _WB_CACHE_FILE.exists()
    ):
        return pd.read_csv(_WB_CACHE_FILE, index_col=0, parse_dates=True)

    if indicators is None:
        indicators = config.WB_INDICATORS

    country = country_codes[0] if country_codes else "VN"
    frames = []
    for code, name in indicators.items():
        url = (
            f"https://api.worldbank.org/v2/country/{country}/indicator/{code}"
            f"?format=json&per_page=300"
        )
        with urllib.request.urlopen(url, timeout=60) as resp:
            payload = json.load(resp)
        rows = payload[1] if isinstance(payload, list) and len(payload) > 1 else []
        series = pd.Series(
            {int(r["date"]): r["value"] for r in rows if r.get("value") is not None},
            name=name,
            dtype=float,
        )
        frames.append(series)

    df = pd.concat(frames, axis=1).sort_index()
    df.index = pd.to_datetime(df.index.astype(str), format="%Y")
    df.index.name = "date"
    return df


def compute_cpi_yoy(macro_monthly: pd.DataFrame, cpi_col: str = "cpi") -> pd.Series:
    """
    CPI YoY (%) tu chuoi CPI level theo thang. Thang thieu don le (vd 2025-10: BLS
    khong cong bo CPI do dong cua chinh phu) duoc noi suy tuyen tinh tren MUC CPI
    (limit=1, chi noi suy giua hai thang co so lieu) de chuoi VAR khong bi thung.
    """
    cpi = macro_monthly[cpi_col].interpolate(method="linear", limit=1, limit_area="inside")
    return (cpi.pct_change(12, fill_method=None) * 100).rename("cpi_yoy")
