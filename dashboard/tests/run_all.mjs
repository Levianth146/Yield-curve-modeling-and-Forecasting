/**
 * Node gate for Yield Curve Lab engines vs golden JSON.
 *   node dashboard/tests/run_all.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { tPvalueTwoSided } from "../js/engine/dist.js";
import { selectArLag, runArVsRw, rmse, mae } from "../js/engine/ar.js";
import { dieboldMariano } from "../js/engine/dm.js";
import { fitNsDay, NS_LAMBDA_DEFAULT } from "../js/engine/ns.js";
import { splitProbitRows, evaluateProbitOos } from "../js/engine/probit.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "../data");
const load = (name) => JSON.parse(readFileSync(join(DATA, name), "utf8"));

let passed = 0;
let failed = 0;
const lines = [];

function ok(name, cond, detail = "") {
  if (cond) {
    passed++;
    lines.push(`PASS ${name}`);
  } else {
    failed++;
    lines.push(`FAIL ${name} ${detail}`);
  }
}

function near(a, b, tol) {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;
}

function splitIdx(dates, split) {
  const target = String(split).slice(0, 7);
  let idx = -1;
  for (let i = 0; i < dates.length; i++) {
    if (String(dates[i]).slice(0, 7) <= target) idx = i;
  }
  return idx;
}

// --- dist §6.1 ---
const DIST = [
  [0.5, 20, 0.622531842281024],
  [1.0, 10, 0.34089313230206],
  [1.5, 59, 0.138946925379604],
  [2.0, 30, 0.054625044962983],
  [2.0, 100, 0.048212178731134],
  [2.5, 116, 0.013817019943451],
  [3.0, 50, 0.004201703187068],
  [0.0826, 116, 0.934311964624025],
  [1.96, 1e6, 0.04999606758527],
  [0, 10, 1],
];
for (const [t, df, expect] of DIST) {
  const got = tPvalueTwoSided(t, df);
  ok(`dist t=${t} df=${df}`, near(got, expect, 1e-9), `got=${got}`);
}

// --- NS golden ---
const nsG = load("ns_golden.json");
for (const row of nsG.days || []) {
  const fit = fitNsDay(row.tau, row.y, row.lam ?? NS_LAMBDA_DEFAULT, row.min_obs ?? 9);
  ok(`ns ${row.date}`, !!fit);
  if (fit) {
    for (const k of ["level", "slope", "curvature"]) {
      ok(`ns ${row.date} ${k}`, near(fit[k], row[k], 1e-8), `${fit[k]} vs ${row[k]}`);
    }
  }
}

// --- AR golden variants ---
const fm = load("factors_monthly.json");
const arG = load("ar_golden.json");
function checkArTable(name, rows, split, ic) {
  const si = splitIdx(fm.dates, split);
  for (const g of rows) {
    const factor = g.factor;
    const h = Number(g.horizon);
    const y = Float64Array.from(fm.columns[factor]);
    const p = selectArLag(y, 12, si, ic);
    const oos = runArVsRw(y, si, p, [h], false, 120)[h];
    const rAr = rmse(oos.actual, oos.arPred);
    const rRw = rmse(oos.actual, oos.rwPred);
    const mAr = mae(oos.actual, oos.arPred);
    const dm = dieboldMariano(
      Float64Array.from(oos.actual),
      Float64Array.from(oos.arPred),
      Float64Array.from(oos.rwPred),
      h,
    );
    ok(`${name} ${factor} h=${h} RMSE_AR`, near(rAr, g.RMSE_AR, 1e-6), `${rAr} vs ${g.RMSE_AR}`);
    ok(`${name} ${factor} h=${h} RMSE_RW`, near(rRw, g.RMSE_RW, 1e-6), `${rRw} vs ${g.RMSE_RW}`);
    ok(`${name} ${factor} h=${h} MAE_AR`, near(mAr, g.MAE_AR, 1e-6), `${mAr} vs ${g.MAE_AR}`);
    ok(`${name} ${factor} h=${h} n`, oos.actual.length === Number(g.n_obs), `${oos.actual.length} vs ${g.n_obs}`);
    ok(`${name} ${factor} h=${h} DM_stat`, near(dm.DM_stat, g.DM_stat, 1e-4), `${dm.DM_stat} vs ${g.DM_stat}`);
    ok(`${name} ${factor} h=${h} DM_p`, near(dm.p_value, g.DM_pvalue, 1e-4), `${dm.p_value} vs ${g.DM_pvalue}`);
    ok(`${name} ${factor} h=${h} lag`, p === Number(g.ar_lag), `p=${p} vs ${g.ar_lag}`);
  }
}
checkArTable("ar.main", arG.main || [], "2015-12", "bic");
if (arG.lag_aic?.length) checkArTable("ar.aic", arG.lag_aic, "2015-12", "aic");
if (arG.split2023?.length) checkArTable("ar.split2023", arG.split2023, "2023-12", "bic");

// --- Probit §6.3 ---
const ds = load("probit_dataset.json");
const pg = load("probit_golden.json");
const { train, test } = splitProbitRows(ds.rows, "1998-12", "2000-01", true);
const m = evaluateProbitOos(train, test);
const fix = pg.spread_10y2y_fixed;
ok("probit n_train", m.n_train === fix.n_train);
ok("probit n_test", m.n_test === fix.n_test);
ok("probit b0", near(m.b0, fix.coef_const, 1e-5), `${m.b0}`);
ok("probit b1", near(m.b1, fix.coef, 1e-5), `${m.b1}`);
ok("probit auc", near(m.auc, fix.auc, 1e-6), `${m.auc}`);
ok("probit brier", near(m.brier, fix.brier, 1e-6), `${m.brier}`);
ok("probit bss", near(m.bss, fix.bss, 1e-6), `${m.bss}`);

// --- DM seed case §6.4 ---
function seededSeries(seed, n) {
  let s = seed >>> 0;
  const y = new Float64Array(n);
  const a = new Float64Array(n);
  const b = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    s = (1664525 * s + 1013904223) >>> 0;
    y[i] = (s / 0xffffffff) * 2 - 1;
    s = (1664525 * s + 1013904223) >>> 0;
    a[i] = y[i] + ((s / 0xffffffff) - 0.5) * 0.4;
    s = (1664525 * s + 1013904223) >>> 0;
    b[i] = y[i] + ((s / 0xffffffff) - 0.5) * 0.8;
  }
  return { y, a, b };
}

// Build DM case from Python-compatible RNG output stored if present; else compute and check sign convention with known magnitudes from revision.
{
  const path = join(DATA, "dm_case.json");
  let caseData;
  try {
    caseData = load("dm_case.json");
  } catch {
    caseData = null;
  }
  if (caseData) {
    for (const row of caseData.rows) {
      const dm = dieboldMariano(
        Float64Array.from(caseData.actual),
        Float64Array.from(caseData.pred1),
        Float64Array.from(caseData.pred2),
        row.h,
      );
      ok(`dm h=${row.h} stat`, near(dm.DM_stat, row.DM_stat, 1e-4), `${dm.DM_stat} vs ${row.DM_stat}`);
      ok(`dm h=${row.h} p`, near(dm.p_value, row.p_value, 1e-4), `${dm.p_value} vs ${row.p_value}`);
    }
  } else {
    // Synthetic: ensure sign convention pred1 worse => positive DM when e1^2 > e2^2 on average
    const actual = Float64Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const pred1 = Float64Array.from([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]); // worse
    const pred2 = Float64Array.from([1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1]);
    const dm = dieboldMariano(actual, pred1, pred2, 1);
    ok("dm sign convention", dm.DM_stat > 0, `DM=${dm.DM_stat}`);
  }
}

console.log(lines.join("\n"));
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log("run_all.mjs: ALL GREEN");
