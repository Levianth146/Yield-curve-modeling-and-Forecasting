"""
scripts/build_vn_yields.py
==========================
Ghep cac file CSV loi suat TPCP VN tai tu Investing.com (moi ky han mot file, ten dang
`Vietnam_10-Year_Bond_Yield_Historical_Data.csv`) thanh data/vn_treasury_yields.csv
(dinh dang o docs/vn_data_guide.md).

Dung:  python scripts/build_vn_yields.py <thu_muc_chua_csv> [--out data/vn_treasury_yields.csv]
"""
import argparse
import json
import re
import sys
from pathlib import Path

import pandas as pd


def read_one(path: Path) -> pd.Series:
    d = pd.read_csv(path, encoding="utf-8-sig")
    d["Date"] = pd.to_datetime(d["Date"], format="%m/%d/%Y")
    d["Price"] = pd.to_numeric(d["Price"].astype(str).str.replace(",", ""), errors="coerce")
    s = d.set_index("Date")["Price"].sort_index()
    return s[~s.index.duplicated(keep="last")]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parents[1] / "data" / "vn_treasury_yields.csv"))
    a = ap.parse_args()
    series, report = {}, {"files": {}, "warnings": []}
    for f in sorted(Path(a.folder).glob("*Vietnam*Bond*Yield*.csv")):
        m = re.search(r"Vietnam[_ ](\d+(?:\.\d+)?)[-_ ]?Year", f.name)
        if not m:
            report["warnings"].append(f"Bo qua (khong nhan ra ky han): {f.name}")
            continue
        tau = float(m.group(1)); s = read_one(f)
        if tau in series:                                     # cung ky han tai 2 lan
            same = series[tau].reindex(s.index).dropna().equals(s.reindex(series[tau].index).dropna()) \
                or (series[tau].combine_first(s).equals(series[tau]))
            report["warnings"].append(f"Ky han {tau:g}Y co nhieu file ({f.name}); giu ban day nhat, giong nhau={bool(same)}")
            if len(s) <= len(series[tau]):
                continue
        series[tau] = s
        report["files"][f"{tau:g}"] = {"file": f.name, "start": str(s.index.min().date()), "end": str(s.index.max().date()), "n": int(len(s))}
    if len(series) < 5:
        sys.exit(f"Chi tim thay {len(series)} ky han (< 5). Tai them file.")
    df = pd.DataFrame(series).sort_index()
    df = df[[c for c in sorted(df.columns)]]
    df.columns = [f"{c:g}" for c in df.columns]
    df = df[df.index.dayofweek < 5].dropna(how="all")          # bo cuoi tuan neu co
    df.index.name = "date"
    # Chat luong: ty le ngay khong doi theo tung ky han / nam; ngay ca ky han deu dung yen
    flat = df.diff().eq(0)
    report["flat_share_by_maturity"] = {c: round(float(flat[c][df[c].notna()].mean()), 3) for c in df.columns}
    report["flat_share_by_year"] = {str(y): round(float(v), 3) for y, v in flat.where(df.notna()).mean(axis=1).groupby(df.index.year).mean().items()}
    all_flat = (df.diff().abs().max(axis=1) == 0) & df.notna().sum(axis=1).ge(3)
    report["days_all_maturities_unchanged_by_year"] = {str(y): int(v) for y, v in all_flat.groupby(df.index.year).sum().items()}
    report["n_days"] = int(len(df)); report["start"] = str(df.index.min().date()); report["end"] = str(df.index.max().date())
    out = Path(a.out); out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out)
    out.with_name("vn_treasury_yields_build_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(report, indent=1, ensure_ascii=False)); print("->", out)


if __name__ == "__main__":
    main()
