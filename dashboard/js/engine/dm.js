import { tPvalueTwoSided } from "./dist.js";

/**
 * Diebold-Mariano — match src/forecasting.py (squared loss default, Bartlett, HLN)
 */
export function dieboldMariano(actual, pred1, pred2, h = 1, loss = "se", hln = true) {
  const n = actual.length;
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const e1 = actual[i] - pred1[i];
    const e2 = actual[i] - pred2[i];
    d[i] = loss === "ae" ? Math.abs(e1) - Math.abs(e2) : e1 * e1 - e2 * e2;
  }
  let mean = 0;
  for (let i = 0; i < n; i++) mean += d[i];
  mean /= n;
  let gamma0 = 0;
  for (let i = 0; i < n; i++) gamma0 += (d[i] - mean) ** 2;
  gamma0 /= n;
  let varLong = gamma0;
  for (let lag = 1; lag < h; lag++) {
    let gk = 0;
    for (let t = lag; t < n; t++) gk += (d[t] - mean) * (d[t - lag] - mean);
    gk /= n;
    const w = 1 - lag / h;
    varLong += 2 * w * gk;
  }
  if (varLong <= 0 || !Number.isFinite(varLong)) return { DM_stat: NaN, p_value: NaN, n_obs: n };
  let dm = mean / Math.sqrt(varLong / n);
  if (hln && n > 1) {
    const factor = (n + 1 - 2 * h + (h * (h - 1)) / n) / n;
    if (factor > 0) dm *= Math.sqrt(factor);
  }
  const df = n - 1;
  const p = tPvalueTwoSided(Math.abs(dm), df);
  return { DM_stat: dm, p_value: p, n_obs: n };
}
