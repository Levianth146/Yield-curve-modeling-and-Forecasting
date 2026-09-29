"""
scripts/run_pipeline.py
=======================
Chay toan bo RQ1-RQ4 (+ VN World Bank) va xuat ket qua vao data/ + outputs/.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src import config, data_fetch, forecasting as fc, nelson_siegel as ns
from src import probit_recession as pr, utils, var_analysis as va

DATA = ROOT / "data"
OUT = ROOT / "outputs"
DATA.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)


def _pick_shape_dates(yields: pd.DataFrame, factors: pd.DataFrame):
    """
    Chon 3 ngay dai dien: normal / flat / inverted theo slope NS (β1).

    Diebold-Li: y(∞) - y(0) = -β1
      - β1 am  -> long > short -> dang chuan (normal)
      - β1 duong -> short > long -> dao nguoc (inverted)
      - |β1| ~ 0 -> phang (flat)
    """
    monthly = yields.resample("ME").last()
    slope = factors["slope"].reindex(monthly.index).dropna()
    # Dung quy uoc Diebold-Li (KHONG dao: idxmin = normal, idxmax = inverted)
    normal = slope.idxmin()
    inverted = slope.idxmax()
    flat = slope.abs().idxmin()
    return {"normal": normal, "flat": flat, "inverted": inverted}


def run_rq1(yields: pd.DataFrame):
    print("=== RQ1 Nelson-Siegel ===")
    maturities = list(config.NS_SERIES.values())
    codes = list(config.NS_SERIES.keys())

    factors_ols = ns.estimate_ns_timeseries(yields[codes], maturities, method="ols")
    factors_ols.to_csv(DATA / "ns_factors_daily.csv")
    monthly_all = ns.monthly_factors(factors_ols)
    if len(monthly_all) < len(factors_ols[["level"]].resample("ME").last()):
        print(f"  Bo thang chua ket thuc (quan sat cuoi {factors_ols.index.max().date()})")
    factors_monthly = utils.ensure_monthly_freq(monthly_all)
    factors_monthly.to_csv(DATA / "ns_factors_monthly.csv")
    factors_ols[["rmse", "r2"]].describe().to_csv(OUT / "rq1_fit_summary.csv")

    comparison, nls_convergence_rate = ns.compare_ols_vs_nls(yields[codes], maturities, sample_size=60)
    comparison.to_csv(OUT / "rq1_ols_vs_nls.csv")
    print(f"NLS convergence rate (sample of 60 days): {nls_convergence_rate:.1%}")
    with open(OUT / "rq1_nls_convergence_rate.txt", "w") as f:
        f.write(f"nls_convergence_rate={nls_convergence_rate:.4f}\n")
        f.write("Sample: most recent 60 trading days used in compare_ols_vs_nls().\n")
        f.write("See docs/fix_log.md (Van de #2) for methodology (bounded L-BFGS-B, multi-start).\n")

    dates = _pick_shape_dates(yields[codes], factors_ols)
    fig, axes = plt.subplots(1, 3, figsize=(12, 3.5), sharey=True)
    for ax, (label, dt) in zip(axes, dates.items()):
        # align to nearest available trading day in factors
        if dt not in factors_ols.index:
            dt = factors_ols.index[factors_ols.index.get_indexer([dt], method="nearest")[0]]
        row = yields.loc[dt, codes]
        b0, b1, b2, lam = factors_ols.loc[dt, ["level", "slope", "curvature", "lam"]]
        tau = np.asarray(maturities, dtype=float)
        fitted = ns.nelson_siegel(tau, b0, b1, b2, lam)
        ax.scatter(tau, row.values, label="Observed", zorder=3)
        order = np.argsort(tau)
        ax.plot(tau[order], fitted[order], label="NS fit")
        ax.set_title(f"{label}\n{pd.Timestamp(dt).date()}")
        ax.set_xlabel("Maturity (years)")
        ax.legend(fontsize=8)
    axes[0].set_ylabel("Yield (%)")
    fig.tight_layout()
    fig.savefig(OUT / "rq1_ns_fit_shapes.png", dpi=150)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(10, 4))
    factors_monthly.plot(ax=ax)
    ax.set_title("Nelson-Siegel factors (month-end)")
    ax.set_ylabel("Factor value")
    fig.tight_layout()
    fig.savefig(OUT / "rq1_factors_monthly.png", dpi=150)
    plt.close(fig)

    print(f"  daily factors: {len(factors_ols)} | monthly: {len(factors_monthly)}")
    print(f"  mean RMSE={factors_ols['rmse'].mean():.4f} mean R2={factors_ols['r2'].mean():.4f}")
    return factors_ols, factors_monthly


def run_rq2(factors_monthly: pd.DataFrame):
    print("=== RQ2 AR vs RW ===")
    results, alt_results = [], []
    for col in ["level", "slope", "curvature"]:
        print(f"  factor={col} ...")
        res = fc.run_ar_vs_rw_pipeline(factors_monthly, col, rolling=True)
        results.append(res)
        # do nhay theo tieu chi chon lag: AIC
        alt = fc.run_ar_vs_rw_pipeline(factors_monthly, col, rolling=True, ic="aic")
        alt.insert(0, "lag_ic", "aic")
        alt_results.append(alt)
    summary = pd.concat(results, ignore_index=True)
    summary.to_csv(DATA / "ar_vs_rw_results.csv", index=False)
    summary.to_csv(OUT / "rq2_ar_vs_rw.csv", index=False)
    pd.concat(alt_results, ignore_index=True).to_csv(OUT / "rq2_ar_vs_rw_lag_aic_sensitivity.csv", index=False)
    print(summary.to_string(index=False))
    # kiem tra phu: chi giai doan gan day (train <= 2023-12-31)
    recent = pd.concat([fc.run_ar_vs_rw_pipeline(factors_monthly, c, rolling=True,
                        split_date=config.TRAIN_TEST_SPLIT_RECENT) for c in ["level", "slope", "curvature"]],
                       ignore_index=True)
    recent.to_csv(OUT / "rq2_ar_vs_rw_split2023_recent.csv", index=False)
    return summary


def run_rq2_yields(yields: pd.DataFrame, factors_monthly: pd.DataFrame):
    """RQ2 mo rong: du bao duong cong tai tung ky han (tai dung tu 3 nhan to)."""
    print("=== RQ2b Yield-curve forecast by maturity ===")
    codes = list(config.NS_SERIES.keys())
    ym = yields[codes].resample("ME").last()
    res = fc.run_yield_curve_forecast(factors_monthly, ym, config.NS_SERIES)
    res.to_csv(OUT / "rq2_yield_forecast_by_maturity.csv", index=False)
    fc.run_yield_curve_forecast(factors_monthly, ym, config.NS_SERIES,
                                split_date=config.TRAIN_TEST_SPLIT_RECENT).to_csv(
        OUT / "rq2_yield_forecast_by_maturity_split2023_recent.csv", index=False)
    fc.run_yield_curve_forecast(factors_monthly, ym, config.NS_SERIES, ic="aic").to_csv(
        OUT / "rq2_yield_forecast_by_maturity_lag_aic_sensitivity.csv", index=False)
    if len(res):
        g = res.groupby("horizon").agg(
            RMSE_AR=("RMSE_AR", "mean"), RMSE_RW=("RMSE_RW", "mean"),
            n_maturities_AR_better=("improve_pct", lambda x: int((x > 0).sum())),
            n_sig_5pct=("DM_pvalue", lambda x: int((x < 0.05).sum())),
        )
        print(g.round(3).to_string())
    return res


def run_rq3(factors_monthly: pd.DataFrame, macro: pd.DataFrame):
    print("=== RQ3 VAR + IRF ===")
    macro_monthly = utils.resample_to_monthly(macro)
    macro_monthly["cpi_yoy"] = data_fetch.compute_cpi_yoy(macro_monthly)
    var_input = utils.ensure_monthly_freq(macro_monthly[["cpi_yoy", "fed_funds"]])

    data_check = factors_monthly[["level", "slope", "curvature"]].join(var_input, how="inner").dropna()
    stationarity = va.test_stationarity_all(data_check)            # ADF(ct) + KPSS tren chuoi goc
    stationarity.to_csv(OUT / "rq3_stationarity.csv", index=False)

    var_results, var_data = va.fit_var_model(factors_monthly, var_input)
    stability = va.check_var_stability(var_results)
    with open(OUT / "rq3_var_stability.json", "w", encoding="utf-8") as f:
        json.dump(
            {
                "is_stable": stability["is_stable"],
                "n_roots": int(len(stability["roots"])),
                "max_abs_inv_root": float(1.0 / np.min(np.abs(stability["roots"]))),  # phai < 1
                "columns": list(var_data.columns),
                "lag_order": int(var_results.k_ar),
            },
            f,
            indent=2,
        )

    with open(OUT / "rq3_var_transforms.json", "w", encoding="utf-8") as f:
        json.dump(var_results.transform_table.to_dict(orient="records"), f, indent=2)
    va.lag_diagnostics(var_data).to_csv(OUT / "rq3_lag_diagnostics.csv", index=False)

    granger = va.run_granger_causality_matrix(var_results, list(var_data.columns))
    granger.to_csv(OUT / "rq3_granger.csv", index=False)

    vif = utils.compute_vif(var_data)
    vif.to_csv(OUT / "rq3_vif.csv", index=False)

    irf = va.irf_with_bands(var_results, var_results.transform_table, periods=24, n_boot=300)
    va.irf_to_frame(irf).to_csv(OUT / "rq3_irf_table.csv", index=False)
    va.plot_irf_pairs(irf, save_path=str(OUT / "rq3_irf_full.png"))
    plt.close("all")
    for impulse, response in [("fed_funds", "slope"), ("fed_funds", "level"), ("cpi_yoy", "level")]:
        if impulse in var_data.columns and response in var_data.columns:
            va.plot_irf_pairs(irf, pairs=[(impulse, response)],
                              save_path=str(OUT / f"rq3_irf_{impulse}_to_{response}.png"))
            plt.close("all")

    var_data.to_csv(DATA / "var_input_data.csv")
    with open(OUT / "rq3_var_summary.txt", "w", encoding="utf-8") as f:
        f.write(str(var_results.summary()))

    # Robustness: lag (AIC/BIC/6), thu tu Cholesky
    base = ["cpi_yoy", "fed_funds", "level", "slope", "curvature"]
    specs = {
        "co so (AIC)": dict(),
        "BIC": dict(ic="bic"),
        "lag=6": dict(lag=6),
        "Cholesky dao nguoc": dict(order=base[::-1]),
        "Cholesky: nhan to truoc vi mo": dict(order=["level", "slope", "curvature", "cpi_yoy", "fed_funds"]),
        "Cholesky: fed_funds dau": dict(order=["fed_funds", "cpi_yoy", "level", "slope", "curvature"]),
    }
    rob, _ = va.irf_robustness(factors_monthly, var_input, specs)
    rob.to_csv(OUT / "rq3_irf_robustness.csv", index=False)

    print(f"  stable={stability['is_stable']} lag={var_results.k_ar} cols={list(var_data.columns)}")
    return var_results, var_data, stationarity, granger


def run_rq4(spreads: pd.DataFrame, recession_full: pd.Series):
    """
    RQ4 - thiet ke chinh chot voi nhom: mau 1976-06 -> 2025-08 (nhan 12 thang),
    train <= 1998-12, bo 1999, test 2000-01 -> 2025-08; chi thang chua suy thoai tai t;
    danh gia AUC + Brier + BSS so voi hang so; 2022-2026 bao cao rieng.
    """
    print("=== RQ4 Probit (thiet ke nhom: train <=1998-12, test >=2000-01) ===")
    full, sample = pr.build_probit_monthly(spreads, recession_full, "T10Y2Y")
    full.to_csv(DATA / "probit_monthly_full.csv")
    sample.to_csv(DATA / "probit_dataset.csv")
    pr.flag_inversion_periods(full["spread"].dropna()).to_csv(OUT / "rq4_inversion_periods.csv", index=False)

    fixed, res, p_fixed = pr.evaluate_fixed_split(sample, "spread")
    dummy, _, _ = pr.evaluate_fixed_split(sample, "inverted")
    full3, sample3 = pr.build_probit_monthly(spreads, recession_full, "T10Y3M")
    alt3, _, _ = pr.evaluate_fixed_split(sample3, "spread")
    expanding, p_exp = pr.evaluate_expanding(sample, "spread")

    # Nhan 12 thang chong lan -> sai so chuan thuong bi danh gia thap; bao cao them z theo HAC (12 lag)
    import statsmodels.api as _sm
    _tr = sample.loc[: config.PROBIT_MAIN_TRAIN_END]
    _hac = _sm.Probit(_tr["recession_ahead"], _sm.add_constant(_tr["spread"])).fit(
        disp=0, cov_type="HAC", cov_kwds={"maxlags": 12})
    fixed["z_naive"] = float(res.tvalues["spread"])
    fixed["z_hac12"] = float(_hac.tvalues["spread"])

    grp = (sample.groupby("inverted")["recession_ahead"]
           .agg(months="size", recession_next12="sum", rate="mean").reset_index())
    grp.to_csv(OUT / "rq4_inversion_group_summary.csv", index=False)

    # Phep thu 2022-2026 (mo hinh da fit tren train <=1998-12)
    seg = pr.stress_path(full, res, config.PROBIT_STRESS_START)
    seg.to_csv(OUT / "rq4_stress_2022_2026.csv")
    labelled = seg["recession_ahead"].notna()
    stress = {
        "months": int(len(seg)),
        "months_with_label": int(labelled.sum()),
        "positives_in_labelled": int(seg.loc[labelled, "recession_ahead"].sum()),
        "mean_prob_labelled": float(seg.loc[labelled, "prob"].mean()),
        "max_prob": float(seg["prob"].max()), "max_prob_month": str(seg["prob"].idxmax()),
        "months_prob_above_train_base_rate": int((seg["prob"] > fixed["train_base_rate"]).sum()),
        "months_prob_above_0.5": int((seg["prob"] > 0.5).sum()),
        "brier_labelled": float(((seg.loc[labelled, "prob"] - seg.loc[labelled, "recession_ahead"]) ** 2).mean()),
        "brier_naive_labelled": float(((fixed["train_base_rate"] - seg.loc[labelled, "recession_ahead"]) ** 2).mean()),
    }

    # Thang moi nhat (tam thoi neu thang chua ket thuc)
    last_m = full.index.max()
    cur_spread = float(full["spread"].iloc[-1])
    res_all = pr._fit_probit_col(sample, "spread")
    current = {
        "month": str(last_m), "spread": cur_spread,
        "prob_model_train_le_1998": float(pr.recession_probability(res, cur_spread)),
        "prob_model_refit_all_labelled": float(pr.recession_probability(res_all, cur_spread)),
        "note": "thang moi nhat co the chua ket thuc -> uoc tinh tam thoi",
    }

    summary = {"design": "train 1976-06..1998-12, bo 1999, test 2000-01..2025-08; chi thang chua suy thoai tai t; nhan = co suy thoai trong t+1..t+12",
               "sample_n": int(len(sample)), "last_labelled_month": str(sample.index.max()),
               "spread_10y2y_fixed": fixed, "inversion_dummy_fixed": dummy,
               "spread_10y3m_fixed": alt3, "spread_10y2y_expanding": expanding,
               "inversion_groups": grp.to_dict(orient="records"),
               "stress_2022_2026": stress, "current": current}
    with open(OUT / "rq4_probit_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    with open(OUT / "rq4_probit_model.txt", "w", encoding="utf-8") as f:
        f.write(str(res.summary()))

    # Hinh 1: xac suat OOS (2000-2025) vs ty le nen, to bong giai doan suy thoai
    test = sample.loc[config.PROBIT_MAIN_TEST_START:]
    fig, ax = plt.subplots(figsize=(11, 4))
    rec_t = full["recession"].loc[config.PROBIT_MAIN_TEST_START:]
    xs = rec_t.index.to_timestamp()
    ax.fill_between(xs, 0, rec_t.values, color="grey", alpha=0.25, step="mid", label="Thang suy thoai (NBER)")
    ax.plot(p_fixed.index.to_timestamp(), p_fixed.values, label="Probit (train <=1998-12)")
    ax.plot(p_exp.index.to_timestamp(), p_exp.values, lw=1, ls=":", label="Probit uoc luong lai moi thang")
    ax.axhline(fixed["train_base_rate"], color="C3", ls="--", lw=1, label="Ty le nen train")
    ax.set_ylim(0, 1); ax.legend(fontsize=8, loc="upper right")
    ax.set_title("P(suy thoai trong 12 thang toi) - ngoai mau 2000-2025 (spread 10Y-2Y)")
    fig.tight_layout(); fig.savefig(OUT / "rq4_probit_probs.png", dpi=150); plt.close(fig)

    # Hinh 2: phep thu 2022-2026
    fig, ax = plt.subplots(figsize=(10, 3.8))
    ax.plot(seg.index.to_timestamp(), seg["prob"], label="P(suy thoai 12 thang)")
    ax.axhline(fixed["train_base_rate"], color="C3", ls="--", lw=1, label="Ty le nen train")
    ax2 = ax.twinx(); ax2.plot(seg.index.to_timestamp(), seg["spread"], color="k", lw=0.8, alpha=0.6)
    ax2.axhline(0, color="k", lw=0.4); ax2.set_ylabel("Spread 10Y-2Y (diem %)")
    if (~labelled).any():
        ax.axvspan(seg.index[~labelled][0].to_timestamp(), seg.index[-1].to_timestamp(), color="orange", alpha=0.12, label="Chua co nhan (<12 thang)")
    ax.set_ylim(0, 1); ax.legend(fontsize=8, loc="upper left")
    ax.set_title("Phep thu 2022-2026: khong co suy thoai NBER")
    fig.tight_layout(); fig.savefig(OUT / "rq4_probit_stress_2022_2026.png", dpi=150); plt.close(fig)

    def _r(d): return {k: (round(v, 4) if isinstance(v, float) else v) for k, v in d.items()}
    print("  fixed 10Y-2Y:", _r(fixed)); print("  dummy:", _r(dummy)); print("  10Y-3M:", _r(alt3))
    print("  expanding:", _r(expanding)); print("  stress:", _r(stress)); print("  current:", _r(current))
    return summary


def run_rq4_window2000(yields: pd.DataFrame, recession: pd.Series):
    """Do nhay: cua so 2000-2026, split 2021-12-31 (thiet ke truoc day cua repo)."""
    print("=== RQ4 (do nhay) cua so 2000-2026, split 2021-12-31 ===")
    probit_df = pr.build_probit_dataset(yields, recession)
    probit_df.to_csv(DATA / "probit_dataset_window2000.csv")

    inversions = pr.flag_inversion_periods(probit_df["spread"])
    inversions.to_csv(OUT / "rq4_inversion_periods_window2000.csv", index=False)

    results = pr.fit_probit_recession(probit_df)
    metrics = pr.evaluate_probit(results, probit_df)
    split_result = pr.train_test_probit(probit_df)
    compare = pr.compare_spread_definitions(yields, recession)
    compare.to_csv(OUT / "rq4_spread_compare_window2000.csv", index=False)

    # Predicted probs over time
    import statsmodels.api as sm

    X = sm.add_constant(probit_df["spread"])
    probs = results.predict(X)
    _px = probit_df.index.to_timestamp() if isinstance(probit_df.index, pd.PeriodIndex) else probit_df.index
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(_px, probs, label="P(recession within 12m)")
    ax.fill_between(
        _px,
        0,
        probit_df["recession_ahead"],
        alpha=0.2,
        step="pre",
        label="Recession ahead (label)",
    )
    ax.set_ylim(0, 1)
    ax.legend()
    ax.set_title("Probit recession probability (10Y-2Y)")
    fig.tight_layout()
    fig.savefig(OUT / "rq4_probit_probs_window2000.png", dpi=150)
    plt.close(fig)

    # Confusion matrix at 0.5
    cm = utils.summarize_confusion_matrix(
        probit_df["recession_ahead"], probs, threshold=0.5
    )

    summary = {
        "coef_spread": float(results.params["spread"]),
        "pvalue_spread": float(results.pvalues["spread"]),
        "mcfadden_r2": float(metrics["mcfadden_r2"]),
        "auc_full": float(metrics["auc"]),
        "auc_train": float(split_result["train_metrics"]["auc"]),
        "auc_test": (
            None
            if split_result["test_metrics"]["auc"] is None
            else float(split_result["test_metrics"]["auc"])
        ),
        "current_spread": float(probit_df["spread"].iloc[-1]),
        "current_prob": float(pr.recession_probability(results, float(probit_df["spread"].iloc[-1]))),
        "confusion_matrix": cm["confusion_matrix"].tolist(),
    }
    # them Brier score / naive benchmark vao summary chinh (backward-compatible:
    # chi them khoa moi, khong doi khoa cu)
    summary["brier_full"] = float(metrics.get("brier")) if metrics.get("brier") is not None else None
    summary["brier_test"] = (
        float(split_result["test_metrics"]["brier"])
        if split_result["test_metrics"].get("brier") is not None else None
    )
    summary["brier_test_naive_benchmark"] = (
        float(split_result["test_metrics"]["brier_naive_benchmark"])
        if split_result["test_metrics"].get("brier_naive_benchmark") is not None else None
    )

    with open(OUT / "rq4_probit_summary_window2000_split2021.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    with open(OUT / "rq4_probit_model_window2000.txt", "w", encoding="utf-8") as f:
        f.write(str(results.summary()))

    # --- Robustness check: dieu kien hoa "chua suy thoai tai t" ---------
    # Xem docs/probit_review_external.md va CHANGELOG trong src/probit_recession.py.
    # Chay SONG SONG voi ban goc, KHONG thay the baseline (cung cua so 2000-2026,
    # cung split 2021-12-31 nhu ban chinh - chi doi cach loc mau).
    print("--- RQ4 robustness: dieu kien 'chua suy thoai tai t' ---")
    probit_df_norec = pr.build_probit_dataset(yields, recession, condition_on_no_recession=True)
    probit_df_norec.to_csv(DATA / "probit_dataset_window2000_no_recession_filter.csv")

    results_norec = pr.fit_probit_recession(probit_df_norec)
    metrics_norec = pr.evaluate_probit(results_norec, probit_df_norec)
    split_result_norec = pr.train_test_probit(probit_df_norec)

    robustness_summary = {
        "note": "Robustness check: chi giu thang chua suy thoai tai t truoc khi gan nhan (xem docs/probit_review_external.md). Cung cua so 2000-2026 va split 2021-12-31 nhu ban chinh.",
        "n_obs_baseline": int(len(probit_df)),
        "n_obs_no_recession_filter": int(len(probit_df_norec)),
        "coef_spread": float(results_norec.params["spread"]),
        "pvalue_spread": float(results_norec.pvalues["spread"]),
        "mcfadden_r2": float(metrics_norec["mcfadden_r2"]),
        "auc_full": float(metrics_norec["auc"]) if metrics_norec["auc"] is not None else None,
        "brier_full": float(metrics_norec["brier"]),
        "auc_train": (
            float(split_result_norec["train_metrics"]["auc"])
            if split_result_norec["train_metrics"]["auc"] is not None else None
        ),
        "auc_test": (
            float(split_result_norec["test_metrics"]["auc"])
            if split_result_norec["test_metrics"]["auc"] is not None else None
        ),
        "brier_test": float(split_result_norec["test_metrics"]["brier"]),
        "brier_test_naive_benchmark": float(split_result_norec["test_metrics"]["brier_naive_benchmark"]),
        "train_base_rate": float(split_result_norec["test_metrics"]["train_base_rate"]),
    }
    with open(OUT / "rq4_probit_window2000_no_recession_filter.json", "w", encoding="utf-8") as f:
        json.dump(robustness_summary, f, indent=2)
    print(json.dumps(robustness_summary, indent=2))

    print(json.dumps(summary, indent=2))
    return summary, inversions, compare


def run_vn():
    print("=== VN extension (World Bank) ===")
    notes = {
        "status": "partial",
        "world_bank": False,
        "vn_treasury_ns": False,
        "limitation": (
            "Chua co file loi suat TPCP VN da ky han (HNX/VBMA) trong repo; "
            "chi chay World Bank macro hang nam. Khong dua WB vao VAR chinh."
        ),
    }
    try:
        wb = data_fetch.fetch_worldbank_data(country_codes=("VN",))
        wb.to_csv(OUT / "vn_worldbank_macro.csv")
        notes["world_bank"] = True
        notes["wb_rows"] = int(len(wb))
        notes["wb_start"] = str(wb.index.min().date())
        notes["wb_end"] = str(wb.index.max().date())
        print(f"  WB rows={len(wb)}")
    except Exception as exc:
        notes["world_bank_error"] = str(exc)
        print(f"  WB failed: {exc}")

    vn_path = DATA / "vn_treasury_yields.csv"
    if vn_path.exists():
        vn_yields = pd.read_csv(vn_path, index_col=0, parse_dates=True)
        maturities = [float(c) for c in vn_yields.columns]
        vn_factors = ns.estimate_ns_timeseries(vn_yields, maturities, method="nls")
        vn_factors.to_csv(OUT / "vn_ns_factors.csv")
        notes["vn_treasury_ns"] = True
    else:
        print("  No data/vn_treasury_yields.csv — skip VN NS")

    with open(OUT / "vn_extension_notes.json", "w", encoding="utf-8") as f:
        json.dump(notes, f, indent=2, ensure_ascii=False)
    return notes


def main():
    print("Fetching FRED data...")
    use_cache = "--refresh" not in sys.argv
    print("  (cache-first)" if use_cache else "  (--refresh: tai lai tu FRED, dung FRED_API_KEY neu co)")
    yields, macro, recession = data_fetch.fetch_fred_data(use_cache=use_cache)
    yields.to_csv(DATA / "yields_daily.csv")
    macro.to_csv(DATA / "macro_raw.csv")
    recession.to_frame().to_csv(DATA / "recession.csv")
    print(f"  yields {yields.shape} {yields.index.min().date()} -> {yields.index.max().date()}")

    _, factors_monthly = run_rq1(yields)
    run_rq2(factors_monthly)
    run_rq2_yields(yields, factors_monthly)
    run_rq3(factors_monthly, macro)
    spreads, recession_full = data_fetch.fetch_probit_data(use_cache=use_cache)
    spreads.to_csv(DATA / "probit_spreads_daily.csv")
    recession_full.to_frame().to_csv(DATA / "recession_full.csv")
    run_rq4(spreads, recession_full)
    run_rq4_window2000(yields, recession)
    run_vn()
    print("DONE. See data/ and outputs/")


if __name__ == "__main__":
    main()
