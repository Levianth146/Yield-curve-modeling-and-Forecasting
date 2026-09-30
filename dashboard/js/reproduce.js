/** @param {import('./state.js').DEFAULTS} state */
export function reproducePython(state) {
  const lines = ["# Sinh từ Yield Curve Lab — chạy tại gốc repo", "import pandas as pd", "from src import config, forecasting as fc, var_analysis as va, probit_recession as pr", "from src.utils import ensure_monthly_freq", ""];

  if (state.route === "curve" || state.route === "summary") {
    lines.push(`# RQ1 — λ = ${state.curve.lambda}`);
    lines.push("from src import nelson_siegel as ns");
    lines.push("yields = pd.read_csv('data/yields_daily.csv', index_col=0, parse_dates=True)");
    lines.push(`factors = ns.estimate_ns_timeseries(yields[list(config.NS_SERIES)], list(config.NS_SERIES.values()), lam=${state.curve.lambda})`);
  }
  if (state.route === "arena" || state.route === "summary") {
    const a = state.arena;
    lines.push(`# RQ2 — ${a.factor}, h=${a.h}, split ${a.split}`);
    lines.push("fm = ensure_monthly_freq(pd.read_csv('data/ns_factors_monthly.csv', index_col=0, parse_dates=True))");
    lines.push(`fc.run_ar_vs_rw_pipeline(fm, '${a.factor}', rolling=${a.window !== "expanding"}, split_date='${a.split}', ic='${a.lag}')`);
  }
  if (state.route === "irf" || state.route === "summary") {
    lines.push("# RQ3 — xem scripts/export_dashboard_data.py --irf-only");
    lines.push("va.fit_var_model(factors_monthly, var_input)  # cpi_mom_ann, order macro trước finance");
  }
  if (state.route === "probit" || state.route === "summary") {
    const p = state.probit;
    lines.push(`# RQ4 — train <= ${p.trainEnd}, spread ${p.spread}`);
    lines.push("spreads, rec = ...  # data/probit_spreads_daily.csv, recession_full.csv");
    lines.push(`full, sample = pr.build_probit_monthly(spreads, rec, '${p.spread}')`);
    lines.push(`pr.evaluate_fixed_split(sample, 'spread', train_end='${p.trainEnd}')`);
  }
  return lines.join("\n");
}
