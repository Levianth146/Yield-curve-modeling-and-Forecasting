import { fitNsDay, NS_LAMBDA_DEFAULT } from "../js/engine/ns.js";
import { selectArLag, runArVsRw, mse } from "../js/engine/ar.js";
import { dieboldMariano } from "../js/engine/dm.js";
import { fitLogit, predictProbit, aucMannWhitney, brier, bss } from "../js/engine/logit.js";

const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const lines = [];
let failed = 0;

function log(msg, ok = true) {
  lines.push((ok ? "PASS" : "FAIL") + " " + msg);
  if (!ok) failed += 1;
}

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(path + " " + res.status);
  return res.json();
}

async function testNs() {
  const golden = await loadJson("../data/ns_golden.json");
  for (const row of golden.days || []) {
    const fit = fitNsDay(row.tau, row.y, row.lam ?? NS_LAMBDA_DEFAULT, row.min_obs ?? 9);
    if (!fit) {
      log(`NS ${row.date} no fit`, false);
      continue;
    }
    for (const k of ["level", "slope", "curvature"]) {
      const d = Math.abs(fit[k] - row[k]);
      log(`NS ${row.date} ${k} err=${d.toExponential(2)}`, d <= 1e-6);
    }
    const dr = Math.abs(fit.rmse - row.rmse);
    log(`NS ${row.date} rmse`, dr <= 1e-6);
  }
}

async function testAr() {
  const golden = await loadJson("../data/ar_golden.json");
  const main = golden.main || [];
  const fm = await loadJson("../data/factors_monthly.json");
  const dates = fm.dates;
  const slope = Float64Array.from(fm.columns.slope);
  let splitIdx = -1;
  for (let i = 0; i < dates.length; i++) {
    if (String(dates[i]).slice(0, 7) <= "2015-12") splitIdx = i;
  }
  for (const row of main.filter((r) => r.factor === "slope" && Number(r.horizon) === 12)) {
    const p = selectArLag(slope, 12, splitIdx, "bic");
    const oos = runArVsRw(slope, splitIdx, p, [12], false, 120)[12];
    const rmseAr = Math.sqrt(mse(oos.actual, oos.arPred));
    const goldenRmse = row.RMSE_AR ?? row.rmse_ar;
    const tol = 0.08;
    log(`AR slope h=12 RMSE ${rmseAr.toFixed(4)} vs golden ${goldenRmse}`, Math.abs(rmseAr - goldenRmse) < tol);
  }
}

async function testProbit() {
  const golden = await loadJson("../data/probit_golden.json");
  const ds = await loadJson("../data/probit_dataset.json");
  const rows = ds.rows || [];
  const trainEnd = "1998-12";
  const x = [];
  const y = [];
  for (const r of rows) {
    if (String(r.date).slice(0, 7) > trainEnd) continue;
    if (!Number.isFinite(r.spread)) continue;
    x.push(r.spread);
    y.push(r.recession_ahead);
  }
  const model = fitLogit(y, x, 25);
  if (!model) {
    log("logit fit", false);
    return;
  }
  const probs = x.map((xi) => predictProbit(model.b0, model.b1, xi));
  const auc = aucMannWhitney(y, probs);
  const bMod = brier(y, probs);
  const fix = golden.spread_10y2y_fixed || golden;
  const targetAuc = fix.auc ?? 0.822;
  const targetBss = (fix.bss ?? -0.153) * 100;
  const bNaive = fix.brier_naive ?? 0.113;
  const bssPct = bss(bMod, bNaive) * 100;
  log(`Probit AUC ${auc.toFixed(3)} ~ ${targetAuc}`, Math.abs(auc - targetAuc) < 0.08);
  log(`Probit BSS ${bssPct.toFixed(1)}% ~ ${targetBss.toFixed(1)}%`, Math.abs(bssPct - targetBss) < 8);
}

async function run() {
  try {
    await testNs();
    await testAr();
    await testProbit();
  } catch (e) {
    log(String(e), false);
  }
  logEl.textContent = lines.join("\n");
  if (failed) {
    statusEl.textContent = `${failed} test(s) failed`;
    statusEl.className = "fail";
  } else {
    statusEl.textContent = "All golden checks passed";
    statusEl.className = "pass";
  }
}

run();
