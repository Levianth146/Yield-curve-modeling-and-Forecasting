import { normCdf, normPdf } from "./dist.js";

const EPS = 1e-12;

/**
 * Binary Probit IRLS (Fisher scoring) — single regressor + intercept.
 * η = b0 + b1·x, μ = Φ(η), w = φ(η)²/(μ(1−μ)), z = η + (y−μ)/φ(η)
 */
export function fitProbit(y, x, maxIter = 50, tol = 1e-10) {
  const n = y.length;
  let b0 = 0;
  let b1 = 0;
  for (let iter = 0; iter < maxIter; iter++) {
    let sw = 0;
    let swx = 0;
    let swxx = 0;
    let swz = 0;
    let swxz = 0;
    for (let i = 0; i < n; i++) {
      const eta = b0 + b1 * x[i];
      let mu = normCdf(eta);
      mu = Math.min(1 - EPS, Math.max(EPS, mu));
      const phi = normPdf(eta);
      if (phi < 1e-300) continue;
      const w = (phi * phi) / (mu * (1 - mu));
      if (!(w > 0) || !Number.isFinite(w)) continue;
      const z = eta + (y[i] - mu) / phi;
      const xi = x[i];
      sw += w;
      swx += w * xi;
      swxx += w * xi * xi;
      swz += w * z;
      swxz += w * xi * z;
    }
    const det = sw * swxx - swx * swx;
    if (Math.abs(det) < 1e-18) break;
    const nb0 = (swz * swxx - swxz * swx) / det;
    const nb1 = (sw * swxz - swx * swz) / det;
    const d0 = nb0 - b0;
    const d1 = nb1 - b1;
    b0 = nb0;
    b1 = nb1;
    if (Math.abs(d0) + Math.abs(d1) < tol) break;
  }
  return { b0, b1 };
}

export function predictProbit(b0, b1, x) {
  return normCdf(b0 + b1 * x);
}

export function brier(y, p) {
  let s = 0;
  for (let i = 0; i < y.length; i++) s += (y[i] - p[i]) ** 2;
  return s / y.length;
}

export function aucMannWhitney(y, p) {
  let pos = 0;
  let neg = 0;
  for (let i = 0; i < y.length; i++) {
    if (y[i] === 1) pos++;
    else neg++;
  }
  if (!pos || !neg) return NaN;
  let conc = 0;
  for (let i = 0; i < y.length; i++) {
    if (y[i] !== 1) continue;
    for (let j = 0; j < y.length; j++) {
      if (y[j] !== 0) continue;
      if (p[i] > p[j]) conc += 1;
      else if (p[i] === p[j]) conc += 0.5;
    }
  }
  return conc / (pos * neg);
}

export function bss(brierModel, brierNaive) {
  if (!brierNaive) return NaN;
  return 1 - brierModel / brierNaive;
}

/** Split rows for main Probit design: no recession at t, skip gap year 1999. */
export function splitProbitRows(rows, trainEnd = "1998-12", testStart = "2000-01", filterNoRecession = true) {
  const filtered = filterNoRecession ? rows.filter((r) => !r.recession_at_t) : rows.slice();
  const train = filtered.filter((r) => String(r.date).slice(0, 7) <= trainEnd);
  const test = filtered.filter((r) => String(r.date).slice(0, 7) >= testStart);
  return { train, test };
}

export function evaluateProbitOos(train, test) {
  const yTr = Float64Array.from(train.map((r) => r.recession_ahead));
  const xTr = Float64Array.from(train.map((r) => r.spread));
  const fit = fitProbit(yTr, xTr);
  const base = yTr.reduce((s, v) => s + v, 0) / yTr.length;
  const yTe = Float64Array.from(test.map((r) => r.recession_ahead));
  const pTe = Float64Array.from(test.map((r) => predictProbit(fit.b0, fit.b1, r.spread)));
  const bMod = brier(yTe, pTe);
  const bNaive = brier(yTe, Float64Array.from(yTe.map(() => base)));
  return {
    b0: fit.b0,
    b1: fit.b1,
    n_train: train.length,
    n_test: test.length,
    train_positive: yTr.reduce((s, v) => s + v, 0),
    test_positive: yTe.reduce((s, v) => s + v, 0),
    train_base_rate: base,
    auc: aucMannWhitney(yTe, pTe),
    brier: bMod,
    brier_naive: bNaive,
    bss: bss(bMod, bNaive),
    probs: pTe,
    y: yTe,
  };
}

// Alias kept so accidental imports fail loudly toward Probit (not logit).
export const fitLogit = fitProbit;
