"""
Precompute VAR/IRF grid for Yield Curve Lab (dashboard/data/irf_grid.json).
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

from . import config, data_fetch, var_analysis as va
from .utils import ensure_monthly_freq, resample_to_monthly

CHOLESKY_PRESETS = {
    "cpi_fed_lsc": ["cpi_mom_ann", "fed_funds", "level", "slope", "curvature"],
    "fed_cpi_lsc": ["fed_funds", "cpi_mom_ann", "level", "slope", "curvature"],
    "cpi_fed_slc": ["cpi_mom_ann", "fed_funds", "slope", "level", "curvature"],
    "lsc_cpi_fed": ["level", "slope", "curvature", "cpi_mom_ann", "fed_funds"],
    "cpi_lsc_fed": ["cpi_mom_ann", "level", "slope", "curvature", "fed_funds"],
    "fed_lsc_cpi": ["fed_funds", "level", "slope", "curvature", "cpi_mom_ann"],
}

LAG_MODES = {
    "p2": {"lag": 2},
    "p4": {"lag": 4},
    "aic_port": {},
    "bic": {"ic": "bic"},
    "p6": {"lag": 6},
    "p12": {"lag": 12},
}

INFLATION = {
    "cpi_mom_ann_w2": "cpi_mom_ann",
    "cpi_mom_ann_w0": "cpi_mom_ann_raw",
    "cpi_mom_ann_w5": "cpi_mom_ann_w5",
    "cpi_yoy": "cpi_yoy",
}

I1_MODES = {
    "adf": {"force_diff": ()},
    "force_fed_slope": {"force_diff": ("fed_funds", "slope")},
}


def _macro_frames(macro_m: pd.DataFrame) -> pd.DataFrame:
    mm = macro_m.copy()
    mm["cpi_mom_ann"] = data_fetch.compute_cpi_mom_annualized(mm, winsor=config.VAR_INFLATION_WINSOR)
    mm["cpi_mom_ann_raw"] = data_fetch.compute_cpi_mom_annualized(mm)
    mm["cpi_mom_ann_w5"] = data_fetch.compute_cpi_mom_annualized(mm, winsor=0.05)
    mm["cpi_yoy"] = data_fetch.compute_cpi_yoy(mm)
    return mm


def _macro_subset(macro_m: pd.DataFrame, infl_col: str) -> pd.DataFrame:
    """Two-column macro frame with inflation column named cpi_mom_ann for VAR join."""
    if infl_col not in macro_m.columns:
        infl_col = "cpi_mom_ann"
    out = macro_m[[infl_col, "fed_funds"]].copy()
    if infl_col != "cpi_mom_ann":
        out = out.rename(columns={infl_col: "cpi_mom_ann"})
    return ensure_monthly_freq(out)


def _config_key(preset: str, lag_name: str, infl_name: str, i1_name: str) -> str:
    raw = f"{preset}|{lag_name}|{infl_name}|{i1_name}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _run_one(
    factors: pd.DataFrame,
    macro_m: pd.DataFrame,
    preset: str,
    lag_name: str,
    lag_kw: dict,
    infl_name: str,
    infl_col: str,
    i1_name: str,
    i1_kw: dict,
    periods: int,
    n_boot: int,
    seed: int,
) -> dict:
    order = CHOLESKY_PRESETS[preset]
    macro_df = _macro_subset(macro_m, infl_col)
    kw = dict(lag_kw, order=order, macro_cols=("cpi_mom_ann", "fed_funds"), **i1_kw)
    res, _ = va.fit_var_model(factors, macro_df, **kw)
    irf = va.irf_with_bands(res, res.transform_table, periods=periods, n_boot=n_boot, seed=seed)
    df = va.irf_to_frame(irf)
    irf_rows = df.round(3).to_dict(orient="records")
    stab = va.check_var_stability(res)
    row = res.lag_table[res.lag_table["p"] == res.k_ar]
    port_p = float(row["portmanteau_p"].iloc[0]) if len(row) else float("nan")
    is_default = (
        preset == "cpi_fed_lsc"
        and lag_name == "aic_port"
        and infl_name == "cpi_mom_ann_w2"
        and i1_name == "adf"
        and int(res.k_ar) == 4
    )
    return {
        "preset": preset,
        "p": int(res.k_ar),
        "lag_mode": lag_name,
        "infl": infl_name,
        "i1_mode": i1_name,
        "order": order,
        "stable": bool(stab["is_stable"]),
        "portmanteau_p": port_p,
        "n_boot": n_boot,
        "n_obs": int(res.nobs),
        "default": is_default,
        "shock_sd": {n: float(v) for n, v in zip(irf["names"], irf.get("shock_sd", []))},
        "irf": irf_rows,
    }


def _all_jobs(macro_m: pd.DataFrame, periods, n_boot_default, n_boot_other, seed):
    jobs = []
    for preset in CHOLESKY_PRESETS:
        for lag_name, lag_kw in LAG_MODES.items():
            for infl_name, infl_col in INFLATION.items():
                for i1_name, i1_kw in I1_MODES.items():
                    is_default_cfg = (
                        preset == "cpi_fed_lsc"
                        and lag_name in ("p4", "aic_port")
                        and infl_name == "cpi_mom_ann_w2"
                        and i1_name == "adf"
                    )
                    n_boot = n_boot_default if is_default_cfg else n_boot_other
                    jobs.append((preset, lag_name, lag_kw, infl_name, infl_col, i1_name, i1_kw, n_boot))
    return jobs


def build_irf_grid(
    root: Path,
    periods: int = 24,
    n_boot_default: int = 300,
    n_boot_other: int = 200,
    seed: int = 0,
    cache_dir: Path | None = None,
    n_jobs: int = -1,
):
    factors = ensure_monthly_freq(
        pd.read_csv(root / "data" / "ns_factors_monthly.csv", index_col=0, parse_dates=True)
    )
    _, macro, _ = data_fetch.fetch_fred_data(use_cache=True)
    macro_m = _macro_frames(resample_to_monthly(macro))
    cache_dir = cache_dir or (root / "outputs" / "_irf_grid_cache")
    cache_dir.mkdir(parents=True, exist_ok=True)

    def run_job(job):
        preset, lag_name, lag_kw, infl_name, infl_col, i1_name, i1_kw, n_boot = job
        ckey = _config_key(preset, lag_name, infl_name, i1_name)
        cache_path = cache_dir / f"{ckey}.json"
        if cache_path.exists():
            return json.loads(cache_path.read_text(encoding="utf-8"))
        try:
            cfg = _run_one(
                factors,
                macro_m,
                preset,
                lag_name,
                lag_kw,
                infl_name,
                infl_col,
                i1_name,
                i1_kw,
                periods,
                n_boot,
                seed,
            )
            cache_path.write_text(json.dumps(cfg, ensure_ascii=False), encoding="utf-8")
            return cfg
        except Exception as exc:
            return {
                "preset": preset,
                "lag_mode": lag_name,
                "infl": infl_name,
                "i1_mode": i1_name,
                "error": str(exc),
            }

    jobs = _all_jobs(macro_m, periods, n_boot_default, n_boot_other, seed)
    try:
        from joblib import Parallel, delayed

        grid = Parallel(n_jobs=n_jobs, prefer="threads")(delayed(run_job)(j) for j in jobs)
    except ImportError:
        grid = [run_job(j) for j in jobs]

    for cfg in grid:
        if cfg.get("default"):
            cfg["default"] = True
    return {
        "configs": grid,
        "periods": periods,
        "n_configs": len(grid),
        "bootstrap_note": f"default configs n_boot={n_boot_default}, others {n_boot_other}",
    }
