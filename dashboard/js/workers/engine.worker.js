import { fitNsSeries, profileLambdaDay } from "../engine/ns.js";

const LAM_GRID = [];
for (let lam = 0.1; lam <= 3.001; lam += 0.05) LAM_GRID.push(Math.round(lam * 100) / 100);

self.onmessage = (ev) => {
  const { type, payload } = ev.data || {};
  if (type === "profile_series") {
    const { dates, maturities, yieldCols, sampleEvery } = payload;
    const cols = yieldCols.map((c) => Float64Array.from(c));
    const n = dates.length;
    const rmses = [];
    for (let d = 0; d < n; d += sampleEvery || 1) {
      const yRow = cols.map((col) => col[d]);
      const best = profileLambdaDay(maturities, yRow, LAM_GRID);
      if (best) rmses.push({ d, lam: best.lam, rmse: best.rmse });
    }
    self.postMessage({ type: "profile_series", rmses });
    return;
  }
  if (type === "ns_series_fixed") {
    const { dates, maturities, yieldCols, lam } = payload;
    const cols = yieldCols.map((c) => Float64Array.from(c));
    const series = fitNsSeries(dates, maturities, cols, lam);
    self.postMessage({ type: "ns_series_fixed", n: series.length, meanRmse: series.reduce((s, r) => s + r.rmse, 0) / (series.length || 1) });
  }
};
