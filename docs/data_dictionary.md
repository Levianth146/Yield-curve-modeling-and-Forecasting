# Data dictionary — file nào chứa gì, đọc số liệu thế nào cho đúng

Dùng cho người KHÔNG đọc code (viết literature review, diễn giải, report) —
để hiểu output mà không cần mở `src/*.py`. Với mỗi file: nguồn gốc (script
nào sinh ra), ý nghĩa từng cột, đơn vị, và bẫy diễn giải cần tránh.

**Quy tắc chung:** tất cả file trong `data/` và `outputs/` do
`scripts/run_pipeline.py` sinh ra. KHÔNG sửa tay các file này — mọi thay đổi
số liệu phải đi qua sửa code trong `src/` rồi chạy lại pipeline (xem
`docs/team_workflow.md`).

---

## `data/` — dữ liệu trung gian (input cho các RQ sau, không phải kết quả cuối)

### `yields_daily.csv`
Nguồn: `data_fetch.fetch_fred_data()`. Lợi suất trái phiếu Mỹ theo ngày,
11 cột tải về (`DGS1MO` → `DGS30`, đơn vị: % năm, theo chuẩn FRED); Nelson–Siegel chỉ dùng 10 kỳ hạn `DGS3MO` → `DGS30` (`config.NS_SERIES`, bỏ `DGS1MO`). Không ffill; ngày lễ không có hàng. Ô trống =
NaN (thường ở `DGS1MO` — series này FRED không công bố đều đặn, đặc biệt
giai đoạn đầu 2000-2001). Cửa sổ: 2000-01-03 → hiện tại (tự động cập nhật
mỗi lần chạy lại pipeline).

### `macro_raw.csv`
Nguồn: `data_fetch.fetch_fred_data()`. `cpi` = CPI-U level (chưa phải %
lạm phát: dùng `compute_cpi_mom_annualized()` cho lạm phát tháng quy năm — mô
hình chính — hoặc `compute_cpi_yoy()` để đối chiếu; cả hai nội suy khoảng
trống 1 tháng 2025-10), `fed_funds` = lãi suất điều hành Fed (%, **trung bình
tháng**). Tần suất tháng, tải từ 1999-01 để tính lạm phát cho cả năm 2000.

### `recession.csv`
Nguồn: `data_fetch.fetch_fred_data()`, series FRED `USRECM` (peak→trough, gồm tháng đỉnh). `recession` =
1 nếu NBER xác nhận tháng đó là suy thoái, 0 nếu không. **Lưu ý:** đây là
dữ liệu LỊCH SỬ đã xác nhận — NBER công bố suy thoái có độ trễ (đôi khi hơn
1 năm), nên các tháng gần "hiện tại" trong file này luôn = 0 cho tới khi
NBER chính thức công nhận, KHÔNG có nghĩa là chắc chắn không có suy thoái.

### `ns_factors_daily.csv` / `ns_factors_monthly.csv`
Nguồn: `nelson_siegel.estimate_ns_timeseries()` (RQ1). Cột `level`, `slope`,
`curvature` = 3 nhân tố Nelson-Siegel (đơn vị: % năm, cùng thang với lợi
suất). File `_daily` có thêm `lam` (λ dùng khi fit — mặc định cố định
0.0609×12 = 0.7308 vì kỳ hạn tính theo NĂM; Diebold-Li), `rmse`/`r2` (độ khớp mô hình NGÀY đó), `converged`
(bool — luôn True cho nhánh OLS, chỉ có ý nghĩa phân biệt ở nhánh NLS). File
`_monthly` (bàn giao cho AR/VAR/Probit) có 5 cột: `level`, `slope`, `curvature`, `rmse` (độ khớp tháng đó, điểm %), `n_maturities` (9 hoặc 10); lấy ngày giao dịch hợp lệ cuối tháng; tháng chưa kết thúc bị loại (`ns.monthly_factors`).

### `var_input_data.csv`
Nguồn: `var_analysis.fit_var_model()` (RQ3, mô hình chính). Ghép `cpi_mom_ann` (m/m quy năm, cắt 2% hai đuôi), `fed_funds` (đã resample tháng) với `level/slope/curvature`, SAU KHI lấy sai phân bậc 1 các biến I(1) theo ADF(ct) (hiện `level` và `curvature`; mất 1 dòng đầu) — đây là dữ liệu đưa vào VAR, không phải mức. Bản đối chiếu: `var_input_data_yoy.csv`, `var_input_data_mom_raw.csv`. Thứ tự cột trong file KHÔNG
phải thứ tự Cholesky ordering dùng trong VAR/IRF (ordering thật nằm trong
code, xem `docs/plan.md`) — đừng suy luận nhân quả từ thứ tự cột ở đây.

### `probit_dataset.csv` / `probit_dataset_no_recession_filter.csv`
**Thiết kế chính (mới):** `probit_dataset.csv` do `probit_recession.build_probit_monthly()`
sinh ra (527 dòng, 1976-06 → 2025-08; xem mục "Probit (thiết kế 1998/2000)" cuối file);
`spread` = T10Y2Y quan sát hợp lệ cuối tháng, `recession_ahead` = 1 nếu USRECM = 1 trong
t+1..t+12, chỉ giữ tháng chưa suy thoái tại t. **Thiết kế cũ (chỉ để đối chiếu):**
`probit_dataset_window2000*.csv` (cửa sổ 2000–2026, `build_probit_dataset()`), bản
`_no_recession_filter` chỉ giữ tháng CHƯA suy thoái tại t (xem `docs/probit_review_external.md`);
không dùng cho kết luận RQ4. **Bẫy:** các tháng gần cuối file gần như luôn `recession_ahead=0`
— đây là dữ liệu đúng (NBER chưa xác nhận suy thoái mới từ 2020 tới nay),
không phải lỗi.

### `ar_vs_rw_results.csv`
Bản sao y hệt `outputs/rq2_ar_vs_rw.csv` (xem bên dưới) — giữ trong `data/`
để RQ khác có thể tái dùng nếu cần, không phải file kết quả để trích dẫn
trong report (dùng bản trong `outputs/`).

---

## `outputs/` — kết quả cuối cùng theo từng RQ (dùng để trích dẫn trong report)

### RQ1 — Nelson-Siegel (`rq1_*`)
- `rq1_fit_summary.csv`: thống kê mô tả (count/mean/std/min/25%/50%/75%/max)
  của `rmse`/`r2` trên TOÀN BỘ chuỗi ngày (OLS, λ cố định).
- `rq1_ols_vs_nls.csv`: so sánh OLS vs NLS trên mẫu phân tầng 268 ngày (mỗi 25 ngày
  giao dịch, 2000–2026; `compare_ols_vs_nls(step=config.NLS_COMPARE_STEP)`). Thống kê
  tóm tắt (λ, tương quan nhân tố, RMSE) ở `rq1_ols_vs_nls_summary.json`. Hậu tố `_ols`/`_nls` phân biệt
  2 phương pháp; `converged_nls` — xem `docs/fix_log.md` (Vấn đề #2) trước
  khi diễn giải cột `level_nls`/`slope_nls`/`curvature_nls`: các cột này
  KHÔNG nên dùng để diễn giải kinh tế trực tiếp (vấn đề nhận dạng khi λ tự
  do), chỉ dùng RMSE/hội tụ để đánh giá độ vững.
- `rq1_nls_convergence_rate.txt`: tỷ lệ hội tụ NLS trên mẫu trên.
- `rq1_ns_fit_shapes.png`, `rq1_factors_monthly.png`: biểu đồ minh hoạ.

### RQ2 — AR vs Random Walk (`rq2_ar_vs_rw.csv`)
Một dòng = 1 tổ hợp (nhân tố × horizon). `RMSE_AR`/`RMSE_RW`, `MAE_AR`/
`MAE_RW`: sai số dự báo (đơn vị % năm, cùng thang với factor). `n_obs`: số
điểm gốc (origin) trong expanding-window OOS — CÀNG NHỎ ở horizon dài (22 ở
h=12) vì cần chừa đủ 12 tháng tương lai để so sánh. `DM_stat`/`DM_pvalue`:
kiểm định Diebold-Mariano (H0: AR và RW có độ chính xác như nhau); `p<0.05`
= AR vượt trội RW có ý nghĩa thống kê. Xem `docs/fix_log.md` (Vấn đề #4) về
cách ước lượng phương sai (Bartlett-weighted) trước khi trích số liệu cũ.

### RQ3 — VAR / Granger / IRF (`rq3_*`)
- `rq3_irf_robustness.csv`: IRF Fed→Slope/Level, lạm phát→Level (h=1,6,12,24) theo 9 đặc tả
  (lag, thứ tự Cholesky, biến lạm phát, sai phân thêm `fed_funds`/`slope`);
  `rq3_portmanteau_winsor_sensitivity.csv`: Portmanteau theo mức cắt đuôi lạm phát.
- `rq3_stationarity.csv`: `likely_stationary=True` chỉ khi CẢ ADF (bác bỏ
  unit root, p<0.05) VÀ KPSS (không bác bỏ dừng, p>0.05) đồng thuận —
  `False` không có nghĩa chắc chắn non-stationary, chỉ là 2 test không đồng
  thuận hoặc đều cho kết quả non-stationary.
- `rq3_granger.csv`: `caused`/`causing` — `causing` Granger-cause `caused`
  nếu `conclusion="reject"` (bác bỏ H0 "không Granger-cause") ở `p_value`
  tương ứng.
- `rq3_vif.csv`: Variance Inflation Factor — VIF > 5-10 gợi ý
  multicollinearity đáng lo.
- `rq3_var_stability.json`, `rq3_var_summary.txt`: độ ổn định mô hình VAR
  (eigenvalue < 1 mọi root) và summary đầy đủ (coef, se, p-value).
- `rq3_irf_*.png`: impulse response — đọc theo Cholesky ordering đã chọn
  (lạm phát → fed_funds → level → slope → curvature), không đảo chiều diễn giải; biến sai phân
  được cộng dồn về mức.

### RQ4 — Probit / suy thoái (`rq4_*`)
- `rq4_probit_summary.json`: kết quả bản CHÍNH (thiết kế 1998/2000: train ≤ 1998-12, test ≥ 2000-01;
  10Y-2Y, dummy đảo ngược, 10Y-3M, ước lượng lại mở rộng, phép thử 2022–2026, tháng hiện tại). Mỗi
  mô hình có AUC, Brier, Brier hằng số, BSS. Phép thử 2022–2026 không có nhãn dương nên chỉ dùng Brier.
- `rq4_*_window2000*`: thiết kế cũ (cửa sổ 2000–2026, split 2021-12-31) và robustness "chưa suy thoái tại t"
  — chỉ để đối chiếu, không dùng cho kết luận (xem `docs/probit_review_external.md`).
- `rq4_inversion_periods.csv`: các giai đoạn đảo ngược liên tục
  (`spread < 0`), `length_months` = độ dài.
- `rq4_probit_model.txt`: `results.summary()` đầy đủ của statsmodels.

### VN extension (`vn_*`)
Khi có `data/vn_treasury_yields.csv` (định dạng ở `docs/vn_data_guide.md`), pipeline ghi thêm `vn_data_validation.json`,
`vn_lambda_grid.csv`, `vn_ns_factors_daily.csv`, `vn_ns_factors_monthly.csv`, `vn_ns_fit_shapes.png`, `vn_factors_monthly.png`,
`vn_ar_vs_rw.csv` và các khóa λ/RMSE/tương quan US trong `vn_extension_notes.json`. Phần dưới là World Bank:

### `vn_worldbank_macro.csv`, `vn_extension_notes.json`
Dữ liệu World Bank theo NĂM (không phải tháng) — **không join trực tiếp vào
VAR chính** (khác tần suất). Cột trống (`NaN`) là bình thường — World Bank
không có số liệu mọi năm cho mọi indicator ở Việt Nam giai đoạn đầu.
`vn_extension_notes.json` ghi trạng thái ("partial" — vì chưa có dữ liệu lợi
suất TPCP VN theo kỳ hạn trong repo, xem `limitation` trong file).

---

## Khi số liệu "trông sai" — checklist trước khi báo bug

1. Đọc mục tương ứng ở trên — nhiều thứ "trông sai" (toàn 0, `n/a`, NaN) là
   dữ liệu/logic ĐÚNG, đã giải thích sẵn.
2. Kiểm tra `docs/fix_log.md` — nếu vấn đề tương tự đã từng gặp và sửa.
3. Nếu vẫn nghi ngờ: hỏi người phụ trách code TRƯỚC khi tự diễn giải hoặc
   sửa tay số liệu trong report — tránh lặp lại tình huống report trích dẫn
   số liệu cũ/sai đã xảy ra ở RQ2 (xem `docs/fix_log.md`, Vấn đề #4).

## Probit (thiết kế 1998/2000)
| File | Nội dung |
|---|---|
| `data/probit_spreads_daily.csv` | T10Y2Y, T10Y3M hàng ngày từ 1976-06 (T10Y3M từ 1982-01) — `--refresh` tải lại từ FRED |
| `data/recession_full.csv` | USRECM hàng tháng từ 1960 |
| `data/probit_monthly_full.csv` | spread, recession, recession_ahead (NaN 12 tháng cuối), inverted |
| `data/probit_dataset.csv` | mẫu Probit: chỉ tháng chưa suy thoái tại t và có nhãn (527 dòng) |
| `outputs/rq4_probit_summary.json` | metric các mô hình, phép thử 2022–2026, tháng hiện tại |
| `outputs/rq4_stress_2022_2026.csv` | P(suy thoái 12 tháng) từng tháng từ 2022-01 |
| `outputs/*_window2000*` | thiết kế cũ (độ nhạy) |

| `outputs/rq3_irf_robustness.csv` | IRF Fed→Slope/Level, CPI→Level (h=1,6,12,24) theo 9 đặc tả (lag, thứ tự Cholesky, biến lạm phát, sai phân thêm fed_funds/slope) |

| `outputs/rq3_*_yoy.*`, `outputs/rq3_*_mom_raw.*` | Cùng bộ đầu ra RQ3 cho lạm phát YoY và m/m quy năm không cắt đuôi (đối chiếu) |
| `outputs/rq3_ljungbox.csv` | Ljung–Box (12 độ trễ) từng phương trình VAR |
| `outputs/rq4_oos_probabilities.csv` | Xác suất Probit ngoài mẫu từng tháng (cố định và mở rộng) |
| `outputs/interactive/*.html` | Biểu đồ 3D/2D tương tác (plotly); `index.html` liệt kê |
