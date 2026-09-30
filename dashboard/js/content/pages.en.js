/** Page copy (en) — §3. Fill `{key}` via `fill(template, vars)`. */

export function fill(tpl, vars = {}) {
  return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
}

export const pages = {
  today: {
    meaning: [
      "Upward: long rates above short — investors demand a term premium.",
      "Flat: spread near zero.",
      "Inverted: long below short — often tied to easing / recession expectations.",
    ],
    confidence: "Data are US Treasury yields from FRED; the solid line is a Nelson–Siegel fit on 10 maturities (mean error {rmse} bp).",
    limits: "<ul><li>This page describes; it does not forecast yields.</li><li>Dots are observed; the solid line is the model.</li><li>Negative probit BSS means the % level is not a calibrated probability.</li></ul>",
  },
  curve: {
    whyLambda: "Diebold–Li (2006) fix λ = 0.0609 with maturity in months; in years that is 0.0609 × 12 = 0.7308. At that λ, Curvature peaks near {tauStar} years.",
    limits: "<ul><li>Good fit ≠ good forecasts (see Forecast).</li><li>DGS1MO is not used in the fit; need ≥ 9/10 mats per day.</li><li>Monthly series use the last valid trading day of each month.</li></ul>",
  },
  arena: {
    readChart: "A falling CSFE means AR keeps accumulating extra squared error versus the random walk.",
    limits: "<ul><li>Single split date.</li><li>RMSE is not economic value.</li><li>No multiple-testing correction (Bonferroni: 0.05/12 = 0.0042).</li></ul>",
  },
  irf: {
    cholesky: "Each VAR equation depends on lags of all variables. Cholesky assumes earlier-ordered variables affect later ones within the month; the reverse only after one month — order is an identifying assumption.",
    limits: "<ul><li>Not causal proof.</li><li>~315 monthly observations.</li><li>Reordering can flip weakly related responses.</li><li>Differenced IRFs are cumulatively summed back to levels.</li></ul>",
  },
  probit: {
    limits: "<ul><li>NBER labels are dated after the fact.</li><li>Few recessions in the training sample.</li><li>Dummy and 10Y−3M variants are frozen report numbers.</li></ul>",
  },
  vietnam: {
    data: "Investing.com reference quotes — not the official HNX/VBMA curve; 7 maturities 1–15Y.",
    limits: "<ul><li>No absolute VN–US level comparison.</li><li>VN λ is chosen on this sample, so a better fit is expected.</li><li>Many stale quote days.</li></ul>",
  },
  summary: {
    body: "Each card is recomputed from dashboard data. “Fragile” = holds at the report spec but weakens nearby.",
  },
};

export default pages;
