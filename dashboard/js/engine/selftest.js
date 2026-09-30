import { tPvalueTwoSided } from "./dist.js";
import { fitNsDay, NS_LAMBDA_DEFAULT } from "./ns.js";
import { selectArLag, runArVsRw, rmse } from "./ar.js";
import { dieboldMariano } from "./dm.js";
import { splitProbitRows, evaluateProbitOos } from "./probit.js";

/**
 * Browser selftest — returns { ok, passed, failed, lines }.
 * Fetches dashboard/data/* relative to page.
 */
export async function runSelfTest(base = "data/") {
  const lines = [];
  let passed = 0;
  let failed = 0;
  const ok = (name, cond, detail = "") => {
    if (cond) {
      passed++;
      lines.push(`PASS ${name}`);
    } else {
      failed++;
      lines.push(`FAIL ${name} ${detail}`);
    }
  };
  const near = (a, b, tol) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol;

  try {
    const distCases = [
      [1.0, 10, 0.34089313230206],
      [0.0826, 116, 0.934311964624025],
      [3.0, 50, 0.004201703187068],
    ];
    for (const [t, df, expect] of distCases) {
      ok(`dist t=${t}`, near(tPvalueTwoSided(t, df), expect, 1e-9));
    }

    const nsG = await (await fetch(`${base}ns_golden.json`)).json();
    for (const row of (nsG.days || []).slice(0, 10)) {
      const fit = fitNsDay(row.tau, row.y, row.lam ?? NS_LAMBDA_DEFAULT, row.min_obs ?? 9);
      ok(`ns ${row.date}`, fit && near(fit.level, row.level, 1e-6));
    }

    const fm = await (await fetch(`${base}factors_monthly.json`)).json();
    const arG = await (await fetch(`${base}ar_golden.json`)).json();
    let si = -1;
    for (let i = 0; i < fm.dates.length; i++) {
      if (String(fm.dates[i]).slice(0, 7) <= "2015-12") si = i;
    }
    for (const g of arG.main || []) {
      const y = Float64Array.from(fm.columns[g.factor]);
      const p = selectArLag(y, 12, si, "bic");
      const oos = runArVsRw(y, si, p, [Number(g.horizon)], false, 120)[Number(g.horizon)];
      const r = rmse(oos.actual, oos.arPred);
      const dm = dieboldMariano(
        Float64Array.from(oos.actual),
        Float64Array.from(oos.arPred),
        Float64Array.from(oos.rwPred),
        Number(g.horizon),
      );
      ok(`ar ${g.factor} h=${g.horizon}`, near(r, g.RMSE_AR, 1e-6));
      ok(`dm ${g.factor} h=${g.horizon}`, near(dm.p_value, g.DM_pvalue, 1e-4));
    }

    const ds = await (await fetch(`${base}probit_dataset.json`)).json();
    const pg = await (await fetch(`${base}probit_golden.json`)).json();
    const { train, test } = splitProbitRows(ds.rows, "1998-12", "2000-01", true);
    const m = evaluateProbitOos(train, test);
    const fix = pg.spread_10y2y_fixed;
    ok("probit auc", near(m.auc, fix.auc, 1e-6));
    ok("probit bss", near(m.bss, fix.bss, 1e-6));
    ok("probit b0", near(m.b0, fix.coef_const, 1e-5));
  } catch (e) {
    ok("selftest exception", false, String(e));
  }

  return { ok: failed === 0, passed, failed, lines };
}
