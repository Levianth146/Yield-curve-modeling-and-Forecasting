import { ols, rmse } from "./linalg.js";

export const NS_MIN_OBS = 9;
export const NS_LAMBDA_DEFAULT = 0.7308;

export function nsBasis(tau, lam) {
  const x = lam * tau;
  const e = Math.exp(-x);
  const f1 = (1 - e) / x;
  const f2 = f1 - e;
  return { f0: 1, f1, f2 };
}

export function fitNsDay(tauArr, yArr, lam, minObs = NS_MIN_OBS) {
  const tau = [];
  const y = [];
  for (let i = 0; i < yArr.length; i++) {
    if (Number.isFinite(yArr[i])) {
      tau.push(tauArr[i]);
      y.push(yArr[i]);
    }
  }
  if (tau.length < minObs) return null;
  const X = [];
  for (let i = 0; i < tau.length; i++) {
    const t = tau[i] === 0 ? 1e-6 : tau[i];
    const { f0, f1, f2 } = nsBasis(t, lam);
    X.push([f0, f1, f2]);
  }
  const beta = ols(X, Float64Array.from(y));
  const resid = y.map((yi, i) => yi - (X[i][0] * beta[0] + X[i][1] * beta[1] + X[i][2] * beta[2]));
  return {
    level: beta[0],
    slope: beta[1],
    curvature: beta[2],
    rmse: rmse(resid),
    n: tau.length,
    fitted: (t) => {
      const { f0, f1, f2 } = nsBasis(t === 0 ? 1e-6 : t, lam);
      return beta[0] * f0 + beta[1] * f1 + beta[2] * f2;
    },
  };
}

export function fitNsSeries(dates, maturities, yieldCols, lam, minObs = NS_MIN_OBS) {
  const nDays = dates.length;
  const out = [];
  for (let d = 0; d < nDays; d++) {
    const yRow = yieldCols.map((col) => col[d]);
    const fit = fitNsDay(maturities, yRow, lam, minObs);
    if (fit) out.push({ date: dates[d], ...fit });
  }
  return out;
}

export function profileLambdaDay(tauArr, yArr, grid, minObs = NS_MIN_OBS) {
  let bestLam = grid[0];
  let best = null;
  for (const lam of grid) {
    const f = fitNsDay(tauArr, yArr, lam, minObs);
    if (!f) continue;
    if (!best || f.rmse < best.rmse) {
      best = f;
      bestLam = lam;
    }
  }
  if (!best) return null;
  return { lam: bestLam, ...best };
}

export function monthlyLast(daily, slackDays = 4) {
  const byMonth = new Map();
  for (const row of daily) {
    const ym = row.date.slice(0, 7);
    byMonth.set(ym, row);
  }
  const keys = [...byMonth.keys()].sort();
  if (!keys.length) return [];
  const lastDate = daily[daily.length - 1].date;
  const last = new Date(lastDate + "T00:00:00");
  const monthEnd = new Date(last.getFullYear(), last.getMonth() + 1, 0);
  const slack = slackDays * 86400000;
  let dropLast = false;
  if (last.getTime() < monthEnd.getTime() - slack) dropLast = true;
  const use = dropLast ? keys.slice(0, -1) : keys;
  return use.map((k) => byMonth.get(k));
}
