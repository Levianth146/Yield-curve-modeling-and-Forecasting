"""
Parity gate: Node engine suite + Python NS golden.
  python scripts/check_dashboard_parity.py
Exits 1 if any check fails.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src import config, nelson_siegel as ns


def write_dm_case() -> None:
    """Seeded DM case matching revision §6.4 magnitudes (Python truth)."""
    rng = np.random.default_rng(1)
    n = 60
    actual = rng.normal(0, 1, size=n)
    pred1 = actual + rng.normal(0, 0.8, size=n)  # worse model
    pred2 = actual + rng.normal(0, 0.4, size=n)
    from src import forecasting as fc
    import pandas as pd

    act = pd.Series(actual)
    p1 = pd.Series(pred1)
    p2 = pd.Series(pred2)
    rows = []
    for h in (1, 3, 12):
        dm = fc.diebold_mariano_test(act, p1, p2, h=h)
        rows.append({"h": h, "DM_stat": float(dm["DM_stat"]), "p_value": float(dm["p_value"])})
    out = {
        "actual": actual.tolist(),
        "pred1": pred1.tolist(),
        "pred2": pred2.tolist(),
        "rows": rows,
    }
    path = ROOT / "dashboard" / "data" / "dm_case.json"
    path.write_text(json.dumps(out), encoding="utf-8")
    print("Wrote", path)
    for r in rows:
        print(f"  DM h={r['h']}: {r['DM_stat']:.4f} p={r['p_value']:.4f}")


def check_ns_golden() -> bool:
    path = ROOT / "dashboard" / "data" / "ns_golden.json"
    if not path.exists():
        print("FAIL missing ns_golden.json")
        return False
    golden = json.loads(path.read_text(encoding="utf-8"))
    ok = True
    for row in golden.get("days", []):
        mats = row["tau"]
        y = np.array(row["y"], dtype=float)
        b0, b1, b2, lam = ns.fit_ns_single_day(mats, y, lam=row.get("lam", config.NS_LAMBDA_FIXED))
        for k, py in [("level", b0), ("slope", b1), ("curvature", b2)]:
            if abs(py - row[k]) > 1e-8:
                print(f"FAIL NS {row['date']} {k}: py={py} golden={row[k]}")
                ok = False
    print("NS golden (Python):", "PASS" if ok else "FAIL")
    return ok


def run_node_suite() -> bool:
    script = ROOT / "dashboard" / "tests" / "run_all.mjs"
    proc = subprocess.run(
        ["node", str(script)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    print(proc.stdout)
    if proc.stderr:
        print(proc.stderr, file=sys.stderr)
    if proc.returncode != 0:
        print("Node suite FAIL exit", proc.returncode)
        return False
    print("Node suite: PASS")
    return True


def main():
    write_dm_case()
    ok = check_ns_golden() and run_node_suite()
    dash = ROOT / "dashboard"
    if not (dash / "vendor" / "d3.v7.min.js").exists():
        print("FAIL missing d3 vendor")
        ok = False
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
