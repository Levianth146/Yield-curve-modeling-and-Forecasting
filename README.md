# Yield Curve Modeling and Forecasting

Đề án Fixed Income / Macro: Nelson–Siegel → AR/VAR → Probit suy thoái (US 2000–nay), mở rộng VN (World Bank).

## Setup

```bash
pip install -r requirements.txt
# optional but recommended
set FRED_API_KEY=your_key_here
python scripts/run_pipeline.py
```

Nếu không có `FRED_API_KEY`, `src/data_fetch.py` tự fallback CSV công khai FRED.

## Cấu trúc

- `src/` — logic (config, fetch, NS, forecasting, VAR, probit)
- `notebooks/01..05` — gọi `src/`, trực quan hóa
- `data/` — chuỗi trung gian (factors, yields…)
- `outputs/` — bảng/hình cho báo cáo
- `docs/` — constitution, plan, report

## Research questions

| RQ | Nội dung |
|----|----------|
| RQ1 | NS có mô tả tốt yield curve không? |
| RQ2 | AR có vượt Random Walk trên L/S/C không? |
| RQ3 | CPI / Fed funds truyền dẫn tới factors thế nào (VAR/IRF)? |
| RQ4 | Spread 10Y–2Y có báo trước suy thoái (Probit) không? |