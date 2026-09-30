import { tPvalueTwoSided } from "../js/engine/dist.js";

/** Precise scipy.stats.t two-sided p; table in revision is rounded to 6 dp */
const CASES = [
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

let failed = 0;
for (const [t, df, expect] of CASES) {
  const got = tPvalueTwoSided(t, df);
  const ok = Math.abs(got - expect) <= 1e-9;
  if (!ok) {
    console.error(`FAIL t=${t} df=${df}: got ${got} expect ${expect} err=${Math.abs(got - expect)}`);
    failed++;
  } else {
    console.log(`PASS t=${t} df=${df}`);
  }
}
if (failed) {
  console.error(`${failed} dist tests failed`);
  process.exit(1);
}
console.log("dist.test.mjs: all PASS");
