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
from src import probit_recession as pr, utils, var_analysis as va, vn_extension as vnx

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

    # Mau phan tang: moi NLS_COMPARE_STEP-th ngay tren TOAN mau 2000-2026 (khong chi 60 ngay gan nhat)
    comparison, nls_convergence_rate = ns.compare_ols_vs_nls(yields[codes], maturities, step=config.NLS_COMPARE_STEP)
    comparison.to_csv(OUT / "rq1_ols_vs_nls.csv")
    nls_sum = ns.summarize_ols_vs_nls(comparison, long_yield=yields["DGS30"])
    nls_sum["convergence_rate"] = float(nls_convergence_rate)
    nls_sum["sample"] = f"moi {config.NLS_COMPARE_STEP} ngay giao dich tren toan mau ({comparison.index.min().date()} -> {comparison.index.max().date()})"
    with open(OUT / "rq1_ols_vs_nls_summary.json", "w", encoding="utf-8") as f:
        json.dump(nls_sum, f, indent=2, ensure_ascii=False)
    print(f"NLS convergence rate ({len(comparison)} ngay phan tang): {nls_convergence_rate:.1%}; "
          f"lambda cham can duoi {nls_sum['share_lam_at_lower_bound']:.0%}, "
          f"tuong quan level OLS~NLS {nls_sum['level_corr_ols_nls']:.2f}")
    with open(OUT / "rq1_nls_convergence_rate.txt", "w") as f:
        f.write(f"nls_convergence_rate={nls_convergence_rate:.4f}\n")
        f.write(f"Sample: {nls_sum['sample']} ({len(comparison)} ngay).\n")
        f.write("Hoi tu KHONG co nghia nhan to NLS on dinh/dien giai duoc - xem rq1_ols_vs_nls_summary.json.\n")
        f.write("See docs/fix_log.md (Van de #2, #12) for methodology (bounded L-BFGS-B, multi-start).\n")

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


def _rq3_core(factors_monthly, var_input, infl, tag=""):
    """Chay toan bo RQ3 cho MOT bien lam phat `infl`; tag = hau to file ('' = mo hinh chinh)."""
    sfx = f"_{tag}" if tag else ""
    data_check = factors_monthly[["level", "slope", "curvature"]].join(var_input, how="inner").dropna()
    stationarity = va.test_stationarity_all(data_check)            # ADF(ct) + KPSS tren chuoi goc
    stationarity.to_csv(OUT / f"rq3_stationarity{sfx}.csv", index=False)

    var_results, var_data = va.fit_var_model(factors_monthly, var_input, macro_cols=(infl, "fed_funds"))
    stability = va.check_var_stability(var_results)
    lag_tab = var_results.lag_table
    port_p = float(lag_tab.loc[lag_tab["p"] == var_results.k_ar, "portmanteau_p"].iloc[0])
    with open(OUT / f"rq3_var_stability{sfx}.json", "w", encoding="utf-8") as f:
        json.dump(
            {
                "inflation_variable": infl,
                "is_stable": stability["is_stable"],
                "n_roots": int(len(stability["roots"])),
                "max_abs_inv_root": float(1.0 / np.min(np.abs(stability["roots"]))),  # phai < 1
                "columns": list(var_data.columns),
                "lag_order": int(var_results.k_ar),
                "lag_rule": var_results.lag_rule,
                "portmanteau_p_at_lag": port_p,
                "whiteness_ok": bool(var_results.whiteness_ok),
                "n_obs": int(var_results.nobs),
            },
            f,
            indent=2,
        )
    with open(OUT / f"rq3_var_transforms{sfx}.json", "w", encoding="utf-8") as f:
        json.dump(var_results.transform_table.to_dict(orient="records"), f, indent=2)
    lag_tab.to_csv(OUT / f"rq3_lag_diagnostics{sfx}.csv", index=False)
    va.residual_ljungbox(var_results, 12).to_csv(OUT / f"rq3_ljungbox{sfx}.csv", index=False)

    granger = va.run_granger_causality_matrix(var_results, list(var_data.columns))
    granger.to_csv(OUT / f"rq3_granger{sfx}.csv", index=False)
    utils.compute_vif(var_data).to_csv(OUT / f"rq3_vif{sfx}.csv", index=False)

    irf = va.irf_with_bands(var_results, var_results.transform_table, periods=24, n_boot=300)
    va.irf_to_frame(irf).to_csv(OUT / f"rq3_irf_table{sfx}.csv", index=False)
    va.plot_irf_pairs(irf, save_path=str(OUT / f"rq3_irf_full{sfx}.png"))
    plt.close("all")
    if not tag:
        for impulse, response in [("fed_funds", "slope"), ("fed_funds", "level"), (infl, "level")]:
            va.plot_irf_pairs(irf, pairs=[(impulse, response)],
                              save_path=str(OUT / f"rq3_irf_{impulse}_to_{response}.png"))
            plt.close("all")
    var_data.to_csv(DATA / f"var_input_data{sfx}.csv")
    with open(OUT / f"rq3_var_summary{sfx}.txt", "w", encoding="utf-8") as f:
        f.write(str(var_results.summary()))
    print(f"  [{infl}] stable={stability['is_stable']} lag={var_results.k_ar} "
          f"portmanteau_p={port_p:.4f} ({var_results.lag_rule})")
    return var_results, var_data, stationarity, granger, irf


def run_rq3(factors_monthly: pd.DataFrame, macro: pd.DataFrame):
    print("=== RQ3 VAR + IRF ===")
    macro_monthly = utils.resample_to_monthly(macro)
    macro_monthly["cpi_mom_ann"] = data_fetch.compute_cpi_mom_annualized(
        macro_monthly, winsor=config.VAR_INFLATION_WINSOR)              # chinh
    macro_monthly["cpi_mom_ann_raw"] = data_fetch.compute_cpi_mom_annualized(macro_monthly)  # khong cat
    macro_monthly["cpi_yoy"] = data_fetch.compute_cpi_yoy(macro_monthly)
    main, alt = config.VAR_INFLATION, config.VAR_INFLATION_ALT
    in_main = utils.ensure_monthly_freq(macro_monthly[[main, "fed_funds"]])
    in_alt = utils.ensure_monthly_freq(macro_monthly[[alt, "fed_funds"]])
    in_raw = utils.ensure_monthly_freq(macro_monthly[["cpi_mom_ann_raw", "fed_funds"]])

    out = _rq3_core(factors_monthly, in_main, main)            # mo hinh chinh
    _rq3_core(factors_monthly, in_alt, alt, tag="yoy")         # doi chieu: cung ky
    _rq3_core(factors_monthly, in_raw, "cpi_mom_ann_raw", tag="mom_raw")  # doi chieu: m/m khong cat

    # Robustness: lag, thu tu Cholesky, bien lam phat
    base = [main, "fed_funds", "level", "slope", "curvature"]
    specs = {
        "co so (AIC + Portmanteau)": dict(macro_cols=(main, "fed_funds")),
        "lag=2 (BIC khong rang buoc)": dict(lag=2),
        "lag=12": dict(lag=12),
        "Cholesky dao nguoc": dict(order=base[::-1]),
        "Cholesky: nhan to truoc vi mo": dict(order=["level", "slope", "curvature", main, "fed_funds"]),
        "Cholesky: fed_funds dau": dict(order=["fed_funds", main, "level", "slope", "curvature"]),
        "Lam phat so voi cung ky (YoY)": dict(macro=in_alt, macro_cols=(alt, "fed_funds")),
        "M/M quy nam KHONG winsorize": dict(macro=in_raw, macro_cols=("cpi_mom_ann_raw", "fed_funds")),
        "Sai phan them fed_funds va slope (I(1))": dict(force_diff=("fed_funds", "slope")),
    }
    rob, _ = va.irf_robustness(factors_monthly, in_main, specs)
    rob.to_csv(OUT / "rq3_irf_robustness.csv", index=False)

    # Do nhay cua Portmanteau voi muc cat duoi (winsor) - ngưỡng 2% duoc chon SAU khi thay ket qua
    rows = []
    for w in (0.0, 0.01, 0.02, 0.03, 0.05):
        m_w = macro_monthly[["fed_funds"]].copy()
        m_w["x"] = data_fetch.compute_cpi_mom_annualized(macro_monthly, winsor=w)
        r_w, _ = va.fit_var_model(factors_monthly, utils.ensure_monthly_freq(m_w[["x", "fed_funds"]]),
                                  macro_cols=("x", "fed_funds"))
        lt = r_w.lag_table.set_index("p")
        rows.append({"winsor": w, "lag": int(r_w.k_ar), "portmanteau_p": float(lt.loc[r_w.k_ar, "portmanteau_p"]),
                     "whiteness_ok": bool(r_w.whiteness_ok), "aic_min_lag": int(lt["AIC"].idxmin()),
                     "n_lags_passing": int((lt["portmanteau_p"] > config.VAR_PORTMANTEAU_ALPHA).sum())})
    pd.DataFrame(rows).to_csv(OUT / "rq3_portmanteau_winsor_sensitivity.csv", index=False)
    return out[:4]


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

    oos = pd.DataFrame({"prob_fixed": p_fixed, "prob_expanding": p_exp}).join(
        full[["spread", "recession", "recession_ahead"]], how="left")
    oos.index = oos.index.astype(str); oos.index.name = "month"
    oos.to_csv(OUT / "rq4_oos_probabilities.csv")

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


def run_vn_ns():
    """RQ5: Nelson-Siegel + AR vs RW tren loi suat TPCP VN (data/vn_treasury_yields.csv)."""
    y, rep = vnx.load_vn_yields()
    with open(OUT / "vn_data_validation.json", "w", encoding="utf-8") as f:
        json.dump(rep, f, indent=2, ensure_ascii=False)
    for w in rep["warnings"]:
        print("  [VN warn]", w)
    if rep["errors"]:
        raise ValueError("; ".join(rep["errors"]))
    # Ngay thieu 1 ky han (vd 15Y) lam nhan to nhay gap doi -> neu >= 95% ngay day du thi chi fit ngay day du
    n_full = int(y.notna().sum(axis=1).max())
    full_share = float((y.notna().sum(axis=1) == n_full).mean())
    min_obs = n_full if full_share >= 0.95 else vnx.VN_MIN_MATURITIES_PER_DAY
    lam, grid = vnx.select_lambda(y, min_obs=min_obs)
    grid.to_csv(OUT / "vn_lambda_grid.csv", index=False)
    daily = vnx.fit_ns_daily(y, lam, min_obs=min_obs)
    daily_us = vnx.fit_ns_daily(y, config.NS_LAMBDA_FIXED, min_obs=min_obs)
    daily.to_csv(OUT / "vn_ns_factors_daily.csv")
    monthly = vnx.monthly_last(daily)
    monthly.to_csv(OUT / "vn_ns_factors_monthly.csv")
    out = {"vn_treasury_ns": True, "vn_lambda_selected": lam, "vn_rmse_mean_selected": float(daily["rmse"].mean()),
           "vn_rmse_mean_us_lambda": float(daily_us["rmse"].mean()), "vn_months": int(len(monthly)),
           "vn_min_maturities_per_day": min_obs, "vn_full_day_share": full_share, "vn_start": rep["start"], "vn_end": rep["end"], "vn_maturities": rep["maturities"]}

    # Hinh: 3 ngay dai dien + nhan to thang
    slope = daily["slope"]
    picks = {"normal": slope.idxmin(), "flat": slope.abs().idxmin(), "inverted": slope.idxmax()}
    tau = np.array(rep["maturities"])
    fig, axes = plt.subplots(1, 3, figsize=(12, 3.5), sharey=True)
    for ax, (lab, d) in zip(axes, picks.items()):
        row = y.loc[d]
        b0, b1, b2 = daily.loc[d, ["level", "slope", "curvature"]]
        tt = np.linspace(tau.min(), tau.max(), 100)
        ax.scatter(tau, row.values, label="Observed", zorder=3)
        ax.plot(tt, ns.nelson_siegel(tt, b0, b1, b2, lam), label="NS fit")
        ax.set_title(f"VN {lab}\n{d.date()}"); ax.set_xlabel("Maturity (years)"); ax.legend(fontsize=8)
    axes[0].set_ylabel("Yield (%)"); fig.tight_layout(); fig.savefig(OUT / "vn_ns_fit_shapes.png", dpi=150); plt.close(fig)
    fig, ax = plt.subplots(figsize=(10, 4)); monthly[["level", "slope", "curvature"]].plot(ax=ax)
    ax.set_title(f"VN Nelson-Siegel factors (month-end, lambda={lam})"); fig.tight_layout()
    fig.savefig(OUT / "vn_factors_monthly.png", dpi=150); plt.close(fig)

    # So voi US (nhan to thang cua repo, lambda US) - tuong quan trong phan chong lan
    try:
        us = pd.read_csv(DATA / "ns_factors_monthly.csv", index_col=0)
        us.index = pd.PeriodIndex(us.index, freq="M")
        vm = monthly[["level", "slope", "curvature"]].copy(); vm.index = vm.index.to_period("M")
        vm_us = vnx.monthly_last(daily_us)[["level", "slope", "curvature"]]; vm_us.index = vm_us.index.to_period("M")
        j = vm_us.join(us[["level", "slope", "curvature"]], how="inner", lsuffix="_vn", rsuffix="_us")
        out["vn_us_overlap_months"] = int(len(j))
        if len(j) >= 24:
            for k in ("level", "slope", "curvature"):
                out[f"corr_vn_us_{k}"] = float(j[f"{k}_vn"].corr(j[f"{k}_us"]))
                out[f"corr_vn_us_{k}_diff"] = float(j[f"{k}_vn"].diff().corr(j[f"{k}_us"].diff()))
    except Exception as exc:
        out["vn_us_compare_error"] = str(exc)

    # AR vs RW neu du mau (train = 70% dau)
    mp = utils.ensure_monthly_freq(monthly[["level", "slope", "curvature"]])
    if len(mp) >= 72:
        split = str(mp.index[int(len(mp) * 0.7) - 1].end_time.date())
        res = pd.concat([fc.run_ar_vs_rw_pipeline(mp, c, rolling=True, split_date=split) for c in ["level", "slope", "curvature"]],
                        ignore_index=True)
        res.to_csv(OUT / "vn_ar_vs_rw.csv", index=False)
        out["vn_ar_split"] = split
    else:
        out["vn_ar_skipped"] = f"chi {len(mp)} thang (< 72)"
    print("  VN NS:", {k: (round(v, 4) if isinstance(v, float) else v) for k, v in out.items() if not isinstance(v, list)})
    return out


def run_vn():
    print("=== VN extension (World Bank) ===")
    notes = {
        "status": "partial",
        "world_bank": False,
        "vn_treasury_ns": False,
        "limitation": (
            "Neu chua co data/vn_treasury_yields.csv thi chi chay World Bank macro hang nam "
            "(khong dua WB vao VAR chinh); neu co, run_vn_ns them NS/AR cho TPCP VN."
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

    if vnx.VN_YIELDS_PATH.exists():
        try:
            notes.update(run_vn_ns())
        except Exception as exc:                      # loi du lieu VN khong duoc lam hong pipeline US
            notes["vn_treasury_error"] = str(exc)
            print(f"  VN NS failed: {exc}")
    else:
        print("  No data/vn_treasury_yields.csv - skip VN NS (xem docs/vn_data_guide.md)")

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
    try:
        import make_interactive
        make_interactive.main()
    except Exception as exc:  # bieu do tuong tac khong lam hong pipeline chinh
        print(f"  (bo qua bieu do tuong tac: {exc})")
    print("DONE. See data/ and outputs/")


if __name__ == "__main__":
    main()
