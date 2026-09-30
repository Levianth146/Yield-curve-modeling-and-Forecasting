"""
Export dashboard/data/* from repo data/ and outputs/. Idempotent, no network.
  python scripts/export_dashboard_data.py
  python scripts/export_dashboard_data.py --irf-only
  python scripts/export_dashboard_data.py --skip-irf
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dashboard" / "data"
SCHEMA = 1
NULL_BP = -32768


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def write_json(path: Path, obj) -> dict:
    text = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    path.write_text(text, encoding="utf-8")
    return {"bytes": len(text.encode("utf-8")), "sha256": sha256_bytes(text.encode("utf-8"))}


def git_commit() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    except Exception:
        return "unknown"


def export_yields() -> dict:
    from src import config

    y = pd.read_csv(ROOT / "data" / "yields_daily.csv", index_col=0, parse_dates=True)
    start = str(y.index[0].date())
    deltas = [0]
    for i in range(1, len(y)):
        deltas.append(int((y.index[i] - y.index[i - 1]).days))
    compact_dates = {"start": start, "deltas": deltas}
    mats = {k: float(v) for k, v in config.TREASURY_SERIES.items()}
    mat_years = sorted(set(mats.values()))
    columns = []
    for tau in mat_years:
        col_name = next(k for k, v in mats.items() if v == tau)
        if col_name not in y.columns:
            columns.append([NULL_BP] * len(y))
            continue
        s = (y[col_name].astype(float) * 100).round(0).astype("Int64")
        columns.append([int(v) if pd.notna(v) else NULL_BP for v in s])
    payload = {
        "maturities": mat_years,
        "series_codes": {str(v): k for k, v in mats.items()},
        "dates": compact_dates,
        "columns": columns,
        "null_bp": NULL_BP,
    }
    return write_json(OUT / "yields.json", payload)


def export_factors_monthly() -> dict:
    fm = pd.read_csv(ROOT / "data" / "ns_factors_monthly.csv", index_col=0)
    dates = fm.index.astype(str).tolist()
    cols = {}
    for c in ["level", "slope", "curvature", "rmse", "n_maturities"]:
        if c in fm.columns:
            cols[c] = fm[c].astype(float).tolist()
    return write_json(OUT / "factors_monthly.json", {"dates": dates, "columns": cols})


def export_ns_golden() -> dict:
    from src import config, nelson_siegel as ns

    y = pd.read_csv(ROOT / "data" / "yields_daily.csv", index_col=0, parse_dates=True)
    codes = list(config.NS_SERIES.keys())
    mats = list(config.NS_SERIES.values())
    rng = np.random.default_rng(0)
    idx = rng.choice(len(y), size=min(40, len(y)), replace=False)
    days = []
    for i in sorted(idx):
        row = y.iloc[i]
        b0, b1, b2, lam = ns.fit_ns_single_day(mats, row[codes].values, lam=config.NS_LAMBDA_FIXED)
        _, rmse = ns.compute_fit_error(mats, row[codes].values, b0, b1, b2, lam)
        days.append(
            {
                "date": str(y.index[i].date()),
                "tau": mats,
                "y": [float(row[c]) if pd.notna(row[c]) else None for c in codes],
                "level": float(b0),
                "slope": float(b1),
                "curvature": float(b2),
                "lam": float(lam),
                "rmse": float(rmse),
                "min_obs": int(config.NS_MIN_OBS_PER_DAY),
            }
        )
    return write_json(OUT / "ns_golden.json", {"days": days})


def export_yield_by_maturity() -> dict:
    p = ROOT / "outputs" / "rq2_yield_forecast_by_maturity.csv"
    if not p.exists():
        return write_json(OUT / "yield_forecast_golden.json", {"rows": []})
    return write_json(OUT / "yield_forecast_golden.json", {"rows": pd.read_csv(p).to_dict(orient="records")})


def export_ar_golden() -> dict:
    paths = {
        "main": ROOT / "outputs" / "rq2_ar_vs_rw.csv",
        "lag_aic": ROOT / "outputs" / "rq2_ar_vs_rw_lag_aic_sensitivity.csv",
        "split2023": ROOT / "outputs" / "rq2_ar_vs_rw_split2023_recent.csv",
    }
    out = {}
    for k, p in paths.items():
        if p.exists():
            out[k] = pd.read_csv(p).to_dict(orient="records")
    return write_json(OUT / "ar_golden.json", out)


def export_probit_golden() -> dict:
    summ_path = ROOT / "outputs" / "rq4_probit_summary.json"
    summ = json.loads(summ_path.read_text(encoding="utf-8")) if summ_path.exists() else {}
    return write_json(OUT / "probit_golden.json", summ)


def export_probit_dataset() -> dict:
    p = ROOT / "data" / "probit_dataset.csv"
    if not p.exists():
        return write_json(OUT / "probit_dataset.json", {"rows": []})
    df = pd.read_csv(p, index_col=0, parse_dates=True)
    rows = []
    for idx, row in df.iterrows():
        rows.append(
            {
                "date": str(pd.Timestamp(idx).date())[:7] + "-01",
                "spread": float(row.get("spread", np.nan)),
                "recession_ahead": int(row.get("recession_ahead", 0)),
                "recession_at_t": int(row.get("recession", 0)),
            }
        )
    return write_json(OUT / "probit_dataset.json", {"rows": rows})


def export_recessions() -> dict:
    rec = pd.read_csv(ROOT / "data" / "recession.csv", index_col=0, parse_dates=True)
    spells = []
    s = rec.iloc[:, 0].astype(int)
    start = None
    for d, v in s.items():
        if v == 1 and start is None:
            start = d
        if v == 0 and start is not None:
            spells.append({"start": str(start.date()), "end": str(d.date())})
            start = None
    inv_path = ROOT / "outputs" / "rq4_inversion_periods.csv"
    inversions = pd.read_csv(inv_path).to_dict(orient="records") if inv_path.exists() else []
    return write_json(OUT / "recessions.json", {"spells": spells, "inversions": inversions})


def export_vn() -> dict:
    """VN: chi dua du lieu tong hop (nhan to thang, luoi lambda, AR vs RW, ty le ngay dung gia). Khong dua loi suat ngay tho."""
    import numpy as np

    lam_grid = []
    lg = ROOT / "outputs" / "vn_lambda_grid.csv"
    if lg.exists():
        lam_grid = pd.read_csv(lg).to_dict(orient="records")
    ar = []
    arp = ROOT / "outputs" / "vn_ar_vs_rw.csv"
    if arp.exists():
        ar = pd.read_csv(arp).to_dict(orient="records")
    fm = []
    fmp = ROOT / "outputs" / "vn_ns_factors_monthly.csv"
    if fmp.exists():
        fm = pd.read_csv(fmp).to_dict(orient="records")

    lam_sel, rmse_sel = None, None
    if lam_grid:
        best = min(lam_grid, key=lambda r: r["rmse_mean"])
        lam_sel, rmse_sel = float(best["lambda"]), float(best["rmse_mean"])

    stale_by_year, stale_heat, correlations = {}, {}, {}
    ypath = ROOT / "data" / "vn_treasury_yields.csv"
    if ypath.exists():
        try:
            yv = pd.read_csv(ypath, index_col=0, parse_dates=True)
            flat = yv.diff().eq(0) & yv.notna()
            valid = yv.notna()
            heat = (flat.groupby(yv.index.year).sum() / valid.groupby(yv.index.year).sum()).round(3)
            stale_heat = {"years": [int(i) for i in heat.index], "maturities": [float(c) for c in heat.columns],
                          "values": [[None if pd.isna(v) else float(v) for v in row] for row in heat.values]}
            stale_by_year = {str(int(k)): float(v) for k, v in heat.mean(axis=1).round(3).items()}
            # Tuong quan voi US (cung lambda US) - tinh lai tu du lieu, khong phu thuoc notes.json
            from src import config, vn_extension as vnx

            y, rep = vnx.load_vn_yields()
            n_full = int(y.notna().sum(axis=1).max())
            full_share = float((y.notna().sum(axis=1) == n_full).mean())
            min_obs = n_full if full_share >= 0.95 else vnx.VN_MIN_MATURITIES_PER_DAY
            vm = vnx.monthly_last(vnx.fit_ns_daily(y, config.NS_LAMBDA_FIXED, min_obs=min_obs))[["level", "slope", "curvature"]]
            vm.index = vm.index.to_period("M")
            us = pd.read_csv(ROOT / "data" / "ns_factors_monthly.csv", index_col=0)
            us.index = pd.PeriodIndex(us.index, freq="M")
            j = vm.join(us[["level", "slope", "curvature"]], how="inner", lsuffix="_vn", rsuffix="_us")
            correlations["overlap_months"] = int(len(j))
            for k in ("level", "slope", "curvature"):
                correlations[f"corr_{k}"] = float(j[f"{k}_vn"].corr(j[f"{k}_us"]))
                correlations[f"corr_{k}_diff"] = float(j[f"{k}_vn"].diff().corr(j[f"{k}_us"].diff()))
            correlations["full_day_share"] = full_share
        except Exception as exc:  # khong lam hong export
            correlations["error"] = str(exc)

    payload = {
        "banner": "Nguồn: Investing.com, giá tham khảo, không phải đường cong chính thức HNX/VBMA; 2018–2026, 7 kỳ hạn 1–15Y. Không đưa lợi suất ngày VN thô vào dashboard.",
        "lambda_selected": lam_sel,
        "rmse_mean_selected": rmse_sel,
        "lambda_us": 0.7308,
        "lambda_grid": lam_grid,
        "factors_monthly": fm,
        "ar_vs_rw": ar,
        "correlations": correlations,
        "stale_by_year": stale_by_year,
        "stale_heatmap": stale_heat,
    }
    return write_json(OUT / "vn.json", payload)


def export_irf_grid() -> dict:
    from src.dashboard_irf_grid import build_irf_grid

    grid = build_irf_grid(ROOT)
    meta = write_json(OUT / "irf_grid.json", grid)
    # Shard by preset for lazy load (first paint without 19MB)
    shard_dir = OUT / "irf"
    shard_dir.mkdir(parents=True, exist_ok=True)
    by_preset = {}
    for cfg in grid.get("configs", []):
        by_preset.setdefault(cfg.get("preset", "unknown"), []).append(cfg)
    for preset, cfgs in by_preset.items():
        # Slim: keep Fed→L/S/C and inflation→level for default panel; full matrix on demand via monolith
        slim = []
        for c in cfgs:
            if c.get("error"):
                slim.append(c)
                continue
            keep = []
            for row in c.get("irf") or []:
                if row["impulse"] == "fed_funds" and row["response"] in ("level", "slope", "curvature"):
                    keep.append(row)
                elif row["impulse"].startswith("cpi") and row["response"] == "level":
                    keep.append(row)
            slim.append({**c, "irf": keep, "irf_full": False})
        write_json(shard_dir / f"{preset}.json", {"configs": slim, "preset": preset})
    return meta


def export_irf_shards_from_existing() -> None:
    """Re-shard without re-bootstrap if irf_grid.json already exists."""
    path = OUT / "irf_grid.json"
    if not path.exists():
        return
    grid = json.loads(path.read_text(encoding="utf-8"))
    shard_dir = OUT / "irf"
    shard_dir.mkdir(parents=True, exist_ok=True)
    by_preset = {}
    for cfg in grid.get("configs", []):
        by_preset.setdefault(cfg.get("preset", "unknown"), []).append(cfg)
    for preset, cfgs in by_preset.items():
        slim = []
        for c in cfgs:
            if c.get("error") or not c.get("irf"):
                slim.append(c)
                continue
            keep = [
                row
                for row in c["irf"]
                if (row["impulse"] == "fed_funds" and row["response"] in ("level", "slope", "curvature"))
                or (str(row["impulse"]).startswith("cpi") and row["response"] == "level")
            ]
            slim.append({**c, "irf": keep, "irf_full": False})
        write_json(shard_dir / f"{preset}.json", {"configs": slim, "preset": preset})
    print(f"  sharded {len(by_preset)} presets -> {shard_dir}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--irf-only", action="store_true")
    parser.add_argument("--skip-irf", action="store_true")
    args = parser.parse_args()
    sys.path.insert(0, str(ROOT))
    OUT.mkdir(parents=True, exist_ok=True)

    files_meta = {}
    if args.irf_only:
        files_meta["irf_grid.json"] = export_irf_grid()
    else:
        exporters = [
            ("yields.json", export_yields),
            ("factors_monthly.json", export_factors_monthly),
            ("ns_golden.json", export_ns_golden),
            ("ar_golden.json", export_ar_golden),
            ("probit_golden.json", export_probit_golden),
            ("probit_dataset.json", export_probit_dataset),
            ("recessions.json", export_recessions),
            ("vn.json", export_vn),
            ("yield_forecast_golden.json", export_yield_by_maturity),
        ]
        for name, fn in exporters:
            files_meta[name] = fn()
            print(f"  {name}: {files_meta[name]['bytes']} bytes")
        if not args.skip_irf:
            print("  IRF grid (may take several minutes)...")
            files_meta["irf_grid.json"] = export_irf_grid()
            print(f"  irf_grid.json: {files_meta['irf_grid.json']['bytes']} bytes")
        else:
            export_irf_shards_from_existing()

    for p in sorted(OUT.glob("*.json")):
        if p.name == "manifest.json":
            continue
        raw = p.read_bytes()
        files_meta[p.name] = {"bytes": len(raw), "sha256": sha256_bytes(raw)}

    y = pd.read_csv(ROOT / "data" / "yields_daily.csv", index_col=0, parse_dates=True)
    from src import config as cfg

    manifest = {
        "schema": SCHEMA,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "git_commit": git_commit(),
        "data_end": str(y.index.max().date()),
        "params": {
            "AR_MAX_LAG": int(cfg.AR_MAX_LAG),
            "AR_LAG_IC": cfg.AR_LAG_IC,
            "NS_LAMBDA_FIXED": float(cfg.NS_LAMBDA_FIXED),
            "NS_MIN_OBS_PER_DAY": int(cfg.NS_MIN_OBS_PER_DAY),
            "TRAIN_TEST_SPLIT_DATE": cfg.TRAIN_TEST_SPLIT_DATE,
            "PROBIT_TRAIN_END": getattr(cfg, "PROBIT_TRAIN_END", "1998-12-31"),
        },
        "files": files_meta,
    }
    man_raw = json.dumps(manifest, ensure_ascii=False, separators=(",", ":"))
    (OUT / "manifest.json").write_text(man_raw, encoding="utf-8")
    files_meta["manifest.json"] = {"bytes": len(man_raw.encode()), "sha256": sha256_bytes(man_raw.encode())}
    print("Done ->", OUT)


if __name__ == "__main__":
    main()
