# Yield Curve Lab

Dashboard tĩnh (vanilla ES modules + D3 v7) để thí nghiệm lại RQ1–RQ4 và VN. Nguồn sự thật: `src/` + `scripts/export_dashboard_data.py`.

## Chạy local (PowerShell)

```powershell
python scripts/export_dashboard_data.py --skip-irf
cd dashboard
python -m http.server 8765
```

Mở `http://127.0.0.1:8765/?selftest=1` (banner xanh = engine khớp golden).

Golden gate:

```powershell
python scripts/check_dashboard_parity.py
# hoặc
node dashboard/tests/run_all.mjs
```

## Fixes (2026-09-30 revision)

- `dist.js`: incomplete beta Lentz + accurate Φ
- `ar.js`: origin inclusive + fit-once forecast; AIC hold_back=maxlag
- `dm.js`: dấu khớp Python (`d = e_AR² − e_RW²`; DM>0 ⇒ RW tốt hơn)
- `probit.js`: link Φ (không logit); train/test skip 1999
- Claims registry C1–C5; tab `#/today`; IRF shards `data/irf/<preset>.json`

## Pipeline

- Cuối `run_pipeline.py`: export trừ `--no-dashboard`; `--skip-irf-export` khi dev
- `python scripts/run_pipeline.py --check` → parity gate

## GitHub Pages

Workflow `.github/workflows/pages.yml`: job `parity` bắt buộc; `deploy` vẫn `if: false` đến khi bạn duyệt.

## Single file

`node dashboard/scripts/build_single.js` → `dist/index.single.html` (shell tĩnh; Lab đầy đủ cần HTTP vì workers).

## Palette

`node dashboard/scripts/validate_palette.js`
