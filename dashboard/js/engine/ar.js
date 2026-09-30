import { ols } from "./linalg.js";

export function bic(nEff, sse, k) {
  return nEff * Math.log(sse / nEff) + k * Math.log(nEff);
}

export function aic(nEff, sse, k) {
  return nEff * Math.log(sse / nEff) + 2 * k;
}

/**
 * Lag selection matching statsmodels ar_select_order (common sample hold_back=maxlag).
 * IC uses nEff = n - maxLag for every p; k = p + 1 (intercept).
 */
export function selectArLag(y, maxLag = 12, trainEndIdx, ic = "bic") {
  const train = y.subarray(0, trainEndIdx + 1);
  const n = train.length;
  if (n <= maxLag + 2) return 1;
  let bestP = 1;
  let bestScore = Infinity;
  for (let p = 1; p <= maxLag; p++) {
    const fit = fitArHoldBack(train, p, maxLag);
    if (!fit) continue;
    const nEff = fit.nEff;
    const k = p + 1;
    const score = ic === "aic" ? aic(nEff, fit.sse, k) : bic(nEff, fit.sse, k);
    if (score < bestScore) {
      bestScore = score;
      bestP = p;
    }
  }
  return bestP;
}

/** OLS AR(p) on observations t = holdBack .. n-1 (common sample). */
export function fitArHoldBack(y, p, holdBack) {
  const n = y.length;
  const start = Math.max(holdBack, p);
  if (n <= start + 1) return null;
  const rows = n - start;
  const X = [];
  const target = new Float64Array(rows);
  for (let i = 0; i < rows; i++) {
    const t = start + i;
    const row = [1];
    for (let j = 1; j <= p; j++) row.push(y[t - j]);
    X.push(row);
    target[i] = y[t];
  }
  const beta = ols(X, target);
  let sse = 0;
  for (let i = 0; i < rows; i++) {
    let pred = beta[0];
    for (let j = 1; j <= p; j++) pred += beta[j] * X[i][j];
    const e = target[i] - pred;
    sse += e * e;
  }
  return { beta, p, sse, nEff: rows };
}

export function fitAr(y, p) {
  const n = y.length;
  if (n <= p + 2) return null;
  const rows = n - p;
  const X = [];
  const target = new Float64Array(rows);
  for (let i = 0; i < rows; i++) {
    const t = i + p;
    const row = [1];
    for (let j = 1; j <= p; j++) row.push(y[t - j]);
    X.push(row);
    target[i] = y[t];
  }
  const beta = ols(X, target);
  let sse = 0;
  for (let i = 0; i < rows; i++) {
    let pred = beta[0];
    for (let j = 1; j <= p; j++) pred += beta[j] * X[i][j];
    const e = target[i] - pred;
    sse += e * e;
  }
  return { beta, p, sse, nEff: rows };
}

/** Fit once, iterate AR h steps (matches AutoReg.forecast). */
export function forecastArDirect(yHist, p, h) {
  const fit = fitAr(yHist, p);
  if (!fit) return NaN;
  const { beta } = fit;
  const buf = new Float64Array(yHist.length + h);
  buf.set(yHist);
  let n = yHist.length;
  for (let step = 0; step < h; step++) {
    let pred = beta[0];
    for (let j = 1; j <= p; j++) pred += beta[j] * buf[n - j];
    buf[n] = pred;
    n++;
  }
  return buf[yHist.length + h - 1];
}

export function rwForecast(yHist, _h) {
  return yHist[yHist.length - 1];
}

/**
 * Expanding/rolling OOS matching src/forecasting.run_ar_vs_rw_pipeline (rolling=True).
 * splitIdx = index of last train observation (inclusive).
 * For each origin t = splitIdx .. len-1-h: hist includes y[t], target is y[t+h].
 */
export function runArVsRw(y, splitIdx, p, horizons, rolling = false, rollWindow = 120) {
  const results = {};
  for (const h of horizons) {
    const arPred = [];
    const rwPred = [];
    const actual = [];
    const idx = [];
    for (let t = splitIdx; t <= y.length - 1 - h; t++) {
      const histStart = rolling ? Math.max(0, t + 1 - rollWindow) : 0;
      const hist = y.subarray(histStart, t + 1);
      if (hist.length < p + 5) continue;
      arPred.push(forecastArDirect(hist, p, h));
      rwPred.push(rwForecast(hist, h));
      actual.push(y[t + h]);
      idx.push(t);
    }
    results[h] = { arPred, rwPred, actual, idx };
  }
  return results;
}

export function mse(a, b) {
  let s = 0;
  let c = 0;
  for (let i = 0; i < a.length; i++) {
    if (Number.isFinite(a[i]) && Number.isFinite(b[i])) {
      s += (a[i] - b[i]) ** 2;
      c++;
    }
  }
  return c ? s / c : NaN;
}

export function mae(a, b) {
  let s = 0;
  let c = 0;
  for (let i = 0; i < a.length; i++) {
    if (Number.isFinite(a[i]) && Number.isFinite(b[i])) {
      s += Math.abs(a[i] - b[i]);
      c++;
    }
  }
  return c ? s / c : NaN;
}

export function rmse(a, b) {
  return Math.sqrt(mse(a, b));
}
