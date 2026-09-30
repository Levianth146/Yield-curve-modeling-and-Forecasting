import { selectArLag, runArVsRw } from "../engine/ar.js";
import { dieboldMariano } from "../engine/dm.js";

function splitIndex(dates, split) {
  let idx = -1;
  for (let i = 0; i < dates.length; i++) {
    if (String(dates[i]).slice(0, 7) <= split.slice(0, 7)) idx = i;
  }
  return idx;
}

self.onmessage = (ev) => {
  if (ev.data.type !== "rq2_spec") return;
  const { dates, splits, factorsBundle, series } = ev.data;
  const factorMap = factorsBundle || { single: series };
  const names = factorsBundle ? ["level", "slope", "curvature"] : ["single"];
  const hs = [1, 3, 6, 12];
  const lags = ["bic", "aic"];
  const windows = ["expanding", "rolling"];
  let n = 0;
  let k = 0;
  const pValues = [];
  for (const fname of names) {
    const y = Float64Array.from(factorMap[fname] || series);
    for (const split of splits) {
      const si = splitIndex(dates, split);
      if (si < 24) continue;
      for (const h of hs) {
        for (const lag of lags) {
          for (const win of windows) {
            n++;
            const p = selectArLag(y, 12, si, lag);
            const oos = runArVsRw(y, si, p, [h], win === "rolling", 120)[h];
            if (!oos.actual.length) continue;
            const dm = dieboldMariano(
              Float64Array.from(oos.actual),
              Float64Array.from(oos.arPred),
              Float64Array.from(oos.rwPred),
              h,
            );
            if (dm.p_value != null) {
              pValues.push(dm.p_value);
              if (dm.p_value < 0.05) k++;
            }
          }
        }
      }
    }
  }
  self.postMessage({ n, k, pValues });
};
