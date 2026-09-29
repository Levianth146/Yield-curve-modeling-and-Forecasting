"""
Tao bieu do tuong tac (HTML, plotly) tu file da luu. Chay sau run_pipeline.py:
    python scripts/make_interactive.py            # plotly.js tu CDN (file nho, can Internet khi mo)
    python scripts/make_interactive.py --offline  # nhung plotly.js vao file (~4.5 MB/file)
Ket qua: outputs/interactive/*.html + index.html
"""
import json
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pandas as pd

from src import config, interactive as ia

DATA, OUT = ROOT / "data", ROOT / "outputs"
DEST = OUT / "interactive"


def main(offline: bool = False):
    DEST.mkdir(parents=True, exist_ok=True)
    js = True if offline else "cdn"
    pages = []

    def save(fig, name, title, note):
        fig.write_html(DEST / f"{name}.html", include_plotlyjs=js, full_html=True)
        pages.append((name, title, note))
        print("  ", name)

    yields = pd.read_csv(DATA / "yields_daily.csv", index_col=0, parse_dates=True)
    fm = pd.read_csv(DATA / "ns_factors_monthly.csv", index_col=0)
    rec = pd.read_csv(DATA / "recession.csv", index_col=0, parse_dates=True).iloc[:, 0]

    save(ia.fig_yield_surface(yields), "3d_yield_surface", "3D - Be mat lai suat quan sat", "Ky han × thoi gian × lai suat; keo de xoay, cuon de zoom.")
    save(ia.fig_ns_surface(fm), "3d_ns_surface", "3D - Be mat Nelson-Siegel", "Be mat muot tu nhan to thang (λ = 0,7308).")
    save(ia.fig_factor_path_3d(fm, rec), "3d_factor_path", "3D - Quy dao Level/Slope/Curvature", "Mau theo nam; kim cuong do = thang suy thoai NBER.")
    save(ia.fig_factors_2d(fm, rec), "2d_factors", "2D - Nhan to theo thang", "Thanh keo thoi gian, vung xam = suy thoai.")

    irf = pd.read_csv(OUT / "rq3_irf_table.csv")
    save(ia.fig_irf_surface(irf, "fed_funds"), "3d_irf_fed_funds", "3D - IRF cu soc Fed Funds", "Chan troi × bien phan ung × phan ung (Cholesky).")
    save(ia.fig_irf_surface(irf, config.VAR_INFLATION), "3d_irf_inflation", "3D - IRF cu soc lam phat", "Lam phat m/m quy nam.")
    save(ia.fig_irf_grid(irf), "2d_irf_grid", "2D - Luoi IRF co khoang tin cay", "KTC 95% bootstrap; hover de doc gia tri.")

    oos = pd.read_csv(OUT / "rq4_oos_probabilities.csv", index_col=0)
    summ = json.load(open(OUT / "rq4_probit_summary.json", encoding="utf-8"))
    fx = summ["spread_10y2y_fixed"]
    rec_full = pd.read_csv(DATA / "recession_full.csv", index_col=0, parse_dates=True).iloc[:, 0]
    save(ia.fig_probit_2d(oos, fx["train_base_rate"], rec_full), "2d_probit", "2D - Xac suat Probit ngoai mau", "Thanh keo, vung xam = suy thoai, vung cam = 2022-2026.")
    save(ia.fig_probit_3d(oos), "3d_probit", "3D - Probit: thoi gian × spread × xac suat", "Mau = nhan thuc te.")
    save(ia.fig_probit_curve(fx["coef_const"], fx["coef"], oos), "2d_probit_curve", "2D - Ham Probit", "Duong Φ(α+β·spread) va quan sat.")

    li = "\n".join(f'<li><a href="{n}.html">{t}</a> - {d}</li>' for n, t, d in pages)
    (DEST / "index.html").write_text(
        f'<!doctype html><meta charset="utf-8"><title>Bieu do tuong tac</title>'
        f'<body style="font-family:sans-serif;max-width:760px;margin:2em auto"><h2>Bieu do tuong tac - De an 04</h2><ul>{li}</ul></body>',
        encoding="utf-8")
    print(f"DONE -> {DEST}")


if __name__ == "__main__":
    main("--offline" in sys.argv)
