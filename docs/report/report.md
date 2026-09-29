# Mô hình hóa và dự báo đường cong lợi suất

**Project 04 — Fixed Income / Macroeconomics**  
Phạm vi chính: Trái phiếu Kho bạc Hoa Kỳ, 2000-01 → 2026-09 (dữ liệu FRED).  
Mở rộng: World Bank macro Việt Nam (không đưa vào VAR chính).

> Mọi con số dưới đây lấy từ `outputs/` do `scripts/run_pipeline.py` sinh ra. Chạy lại pipeline để tái tạo.

---

## 1. Introduction & Research Design

### 1.1 Vấn đề nghiên cứu

Đường cong lợi suất (yield curve) vừa phản ánh kỳ vọng lãi suất ngắn hạn, vừa chứa phần bù kỳ hạn, vừa là kênh quan sát chính sách tiền tệ. Phân tích trực tiếp hàng chục kỳ hạn gây dư thừa chiều và khó diễn giải. Cần một khung vừa **nén** đường cong thành ít nhân tố có nghĩa kinh tế, vừa **dự báo** được các nhân tố đó, vừa **liên kết** với vĩ mô, và cuối cùng kiểm định tín hiệu **đảo ngược → suy thoái**.

### 1.2 Research questions

| RQ | Câu hỏi |
|----|---------|
| **RQ1** | Nelson–Siegel có rút gọn cấu trúc kỳ hạn Mỹ thành Level/Slope/Curvature với độ phù hợp ra sao, và các nhân tố có phản ánh dạng chuẩn / phẳng / đảo ngược không? |
| **RQ2** | AR(p) trên từng nhân tố có vượt Random Walk theo RMSE/MAE và Diebold–Mariano ở horizon 1/3/6/12 tháng không? |
| **RQ3** | Có quan hệ động giữa L/S/C với CPI YoY và Fed Funds không? Cú sốc vĩ mô truyền dẫn qua IRF như thế nào? |
| **RQ4** | Spread 10Y–2Y (Probit, horizon 12 tháng, nhãn NBER USRECM) có năng lực dự báo suy thoái không — huấn luyện đến 1998, kiểm định 2000–2025 và phép thử 2022–2026? |

### 1.3 Mục tiêu

1. Hiểu term structure và phương pháp trích xuất nhân tố.  
2. Kết nối định giá tài sản với chính sách tiền tệ qua VAR/IRF.  
3. Đánh giá năng lực dự báo so với benchmark Random Walk và tín hiệu suy thoái so với giai đoạn “nghịch lý” 2022–2026.

### 1.4 Phạm vi

- **Không gian:** US Treasury (chính); VN chỉ robustness.  
- **Thời gian:** 2000-01 → dữ liệu gần nhất (pipeline: yields đến 2026-09-24).  
- **Mô hình:** Nelson–Siegel, AR, VAR+IRF, Probit.  
- **Ngoài phạm vi:** định giá phái sinh lãi suất, credit spread doanh nghiệp, giao dịch thời gian thực, Probit đa quốc gia.

### 1.5 Logic tổng thể

```
Yields (FRED, daily) → Nelson–Siegel (RQ1)
        → AR vs RW (RQ2)
        → VAR + IRF với CPI & Fed Funds (RQ3)
        → Spread 10Y–2Y → Probit suy thoái (RQ4)
```

---

## 2. Literature Review

### 2.1 Background theories

**Term structure / Yield Curve.** Lý thuyết kỳ vọng, liquidity premium và preferred habitat giải thích vì sao lợi suất dài hạn khác với chuỗi kỳ vọng ngắn hạn. Dạng *normal* (dốc lên), *flat* và *inverted* gắn với chu kỳ chính sách và kỳ vọng tăng trưởng/lạm phát.

**Nelson–Siegel (1987).** Ba nhân tố Level (\(β_0\)), Slope (\(β_1\)), Curvature (\(β_2\)) với tham số decay \(λ\):

\[
y(τ)=β_0+β_1\frac{1-e^{-λτ}}{λτ}+β_2\left(\frac{1-e^{-λτ}}{λτ}-e^{-λτ}\right)
\]

Diebold & Li (2006) cố định \(λ=0.0609\) cho kỳ hạn tính theo **tháng**; với kỳ hạn tính theo **năm** như trong đề án này, giá trị tương đương là \(λ=0.0609×12=0.7308\) (đỉnh hệ số tải Curvature ở khoảng 2,5 năm) — đây là đường chính của đề án (OLS hai bước ổn định theo ngày); NLS ước lượng \(λ\) dùng để đối chiếu độ vững.

**AR / VAR forecasting.** Diebold–Li động học hóa factors bằng AR/VAR; Diebold–Rudebusch–Aruoba (2006) mở rộng macro–finance. Random Walk là chuẩn mực khó vượt trong dự báo lãi suất.

**Yield curve và suy thoái.** Estrella & Mishkin (1998) dùng spread (thường 10Y–3M) trong Probit. Bauer & Mertens (2018), Rudebusch & Williams (2009) thảo luận độ bền của tín hiệu và các giai đoạn “false alarm”.

### 2.2 Empirical studies (nhóm ≥20 công trình)

Không liệt kê từng bài một đoạn; nhóm theo bốn cụm (bảng tóm tắt). Các trích dẫn nền tảng + mở rộng gần đây:

#### (a) Mô hình hóa yield curve / factor models

| Công trình | Phạm vi / method | Kết quả chính | Hạn chế liên quan |
|------------|------------------|---------------|-------------------|
| Nelson & Siegel (1987, *J. Business*) | Parametric curve | Fit tốt với 3 nhân tố | \(λ\) / động học chưa mô hình hóa |
| Diebold & Li (2006, *J. Econometrics*) | US, \(λ\) cố định, AR factors | Dự báo vượt một số benchmark | Giả định \(λ\) cố định |
| Svensson (1994) | Mở rộng 4 nhân tố | Fit tốt hơn NS ở một số mẫu | Overfitting / nhận diện |
| Christensen, Diebold, Rudebusch (2011) | AFNS | Nhất quán no-arbitrage | Phức tạp hơn cho đề án UG |
| Gürkaynak, Sack, Wright (2007) | Fed curve data | Bộ dữ liệu chuẩn US | Không phải mô hình dự báo |
| Annaert et al. (2013) | So sánh NS variants | Độ nhạy \(λ\) | Mẫu EU |

#### (b) Forecasting factors / rates

| Công trình | Method | Finding | Gap |
|------------|--------|---------|-----|
| Diebold & Li (2006) | AR on L/S/C | Cải thiện ở horizon dài hơn | Cần DM test tường minh |
| Duffee (2002) | Affine models | RW khó vượt out-of-sample | Affine nặng giả định |
| Bauer & Rudebusch (2020, *American Economic Review* 110(5)) | "Falling stars" / r* trend | Xu hướng lãi suất dài hạn suy giảm cấu trúc | Ước lượng r* nhạy đặc tả |
| Bauer, Rudebusch, Wu (2012/2014) | Bias-corrected VAR | Persistence bias | Kỹ thuật nâng cao |
| Exterkate, van Dijk, Heij, Groenen (2013, *J. Forecasting*) | Factor-augmented DNS | Bổ sung biến macro vào NS cải thiện dự báo | Yêu cầu bộ dữ liệu rộng |
| Diebold & Rudebusch (2013, sách *Yield Curve Modeling and Forecasting*, Princeton UP) | Tổng hợp DNS | Khung AR(1)/VAR trên factor là chuẩn so sánh | RW vẫn là benchmark khó vượt |

#### (c) Macro–yield relationship

| Công trình | Method | Finding | Gap |
|------------|--------|---------|-----|
| Diebold, Rudebusch, Aruoba (2006) | Macro-finance VAR | Feedback hai chiều | Ordering IRF nhạy |
| Ang & Piazzesi (2003) | No-arbitrage + macro | Macro factors quan trọng | Affine |
| Rudebusch & Wu (2008) | Macro-finance | Policy rule ↔ curve | US-centric |
| Bekaert, Hoerova, Lo Duca (2013, *J. Monetary Economics* 60(7)) | Uncertainty + policy | Bất định vĩ mô tác động premia | Nhận diện premia vẫn khó |
| Bauer & Rudebusch (2017, *Review of Finance*) | Spanning puzzle | Yield factors không phản ánh hết thông tin macro | Kỹ thuật ước lượng phức tạp |
| Altavilla, Brugnolini, Gürkaynak, Motto, Ragusa (2019, *J. Monetary Economics* 108) | Đo lường cú sốc CSTT qua đường cong | Tách shock theo đoạn kỳ hạn | Mẫu Eurozone, không phải US |

#### (d) Recession prediction / inversion

| Công trình | Spread / model | Finding | Gap |
|-------------|----------------|---------|-----|
| Estrella & Mishkin (1998, *REStat*) | 10Y–3M Probit | Spread dự báo tốt | Mẫu trước 2000s |
| Estrella & Trubin (2006) | Practical guide | Ngưỡng / horizon | Cần cập nhật |
| Bauer & Mertens (NY Fed 2018) | Multiple spreads | Tín hiệu bền | False positives |
| Rudebusch & Williams (2009) | Professional vs curve | Curve cạnh tranh survey | Cơ chế |
| Engstrom & Sharpe (2019, *Financial Analysts Journal* 75(4)) | Near-term forward spread | Spread ngắn hạn ít nhiễu hơn 10Y–3M truyền thống | Cần dữ liệu forward OIS |
| Engstrom & Sharpe, Fed *FEDS Notes* "(Don't Fear) The Yield Curve, Reprise" (2022) | Cập nhật hiking cycle | 2022 inversion do kỳ vọng hạ lãi suất nhanh, không hẳn báo suy thoái | 2022–24 inversion dài không kèm suy thoái NBER — **gap chính của đề án** |

### 2.3 Research gap & đóng góp

Gap bán hàng của đề án: giai đoạn đảo ngược kéo dài ~25 tháng (7/2022–8/2024 theo mẫu này) nhưng NBER chưa xác nhận suy thoái mới — kiểm định lại năng lực Probit in-sample vs 2022–2026. Đồng thời tích hợp một pipeline thống nhất NS → AR/RW → VAR/IRF → Probit (NS/AR/VAR trên 2000–2026; Probit huấn luyện từ 1976), có đối chiếu NLS và spread 10Y–3M.

### 2.4 Hypothesis development (tương ứng RQ)

- **H1:** NS OLS đạt fit cao trung bình (R² cao, RMSE thấp); NLS không đảo chiều diễn giải L/S/C.  
- **H2:** AR cải thiện RMSE so với RW ở horizon dài hơn. *(Kết quả: không được ủng hộ có ý nghĩa thống kê trên mẫu kiểm tra 2016–2026; chỉ curvature có RMSE thấp hơn RW ở mọi horizon.)*
- **H3:** Fed Funds Granger-cause Level/Slope; IRF Fed shock làm dịch chuyển slope/level theo hướng thắt chặt. *(Kết quả: Granger không ủng hộ chiều Fed→L/S mà ngược lại L/S và lạm phát→Fed; IRF cho slope tăng và curvature giảm có ý nghĩa sau cú sốc thắt chặt — H3 được ủng hộ một phần.)*
- **H4:** Hệ số spread Probit âm và có ý nghĩa; AUC ngoài mẫu 2000–2025 cao (xếp hạng đúng), nhưng xác suất không vượt hằng số theo Brier (BSS < 0); trong 2022–2026 mô hình phát tín hiệu sai kéo dài (không có suy thoái NBER).

---

## 3. Methodology & Data

### 3.1 Data

| Series | Mã FRED | Vai trò |
|--------|---------|---------|
| Treasury yields | DGS3MO…DGS30 (10 kỳ hạn cho NS; DGS1MO chỉ tải, không đưa vào NS) | Đầu vào NS (ngày) |
| CPI | CPIAUCSL | CPI YoY trong VAR |
| Fed Funds | FEDFUNDS | Chính sách tiền tệ |
| Recession | USRECM (NBER, gồm tháng đỉnh) | Nhãn Probit |

- Nguồn: FRED (`fredapi` nếu có key; không thì CSV công khai).  
- US sample chạy pipeline: **2000-01-03 → 2026-09-25**, 6 687 ngày giao dịch có yield (không điền tiến `ffill`; mỗi ngày cần ≥ 9/10 kỳ hạn NS), 320 tháng factor (tháng 9/2026 chưa kết thúc nên bị loại; chuỗi tháng kết thúc 2026-08).  
- Resample tháng: **cuối tháng** (`last`).  
- VN: World Bank REST (CPI inflation, GDP growth, real interest) — tần suất năm.

### 3.2 Empirical models

**RQ1 — Nelson–Siegel.** 10 kỳ hạn (3M–30Y, bỏ 1M theo thiết kế nhóm); OLS Diebold–Li \(λ=0.0609×12=0.7308\) (kỳ hạn theo năm); chuỗi tháng = ngày giao dịch hợp lệ cuối tháng, kèm cột `rmse`, `n_maturities`; NLS L-BFGS-B có biên, nhiều điểm khởi tạo, trên mẫu 60 ngày gần đây; RMSE/R² mỗi ngày.

**RQ2 — AR vs RW.** Chọn lag chỉ trên tập train bằng **BIC** (quét p=1..12; AIC là kiểm tra độ nhạy); train ≤ 2015-12-31 (test từ 2016-01; mẫu 2023-12-31 chỉ là kiểm tra phụ); expanding-window OOS; horizon 1/3/6/12; Diebold–Mariano (squared loss).

**RQ3 — VAR.** Biến: `cpi_yoy`, `fed_funds`, `level`, `slope`, `curvature` (đúng thứ tự Cholesky). ADF (hằng số + xu hướng): biến có p ≥ 0.05 được lấy sai phân bậc 1 rồi kiểm lại (quy tắc nhóm). Lag theo AIC trên chuỗi đã xử lý (kết quả: \(p=3\)). Kiểm định Portmanteau, ổn định, Granger, IRF trực giao Cholesky cộng dồn với biến sai phân, khoảng tin cậy 95% bootstrap phần dư (300 lần), VIF.

**RQ4 — Probit.** \(P(R_{t,t+12}=1)=Φ(α+β·\mathrm{spread}_t)\); spread chính 10Y–2Y; robustness 10Y–3M. Mẫu tháng từ 1976-06, chỉ giữ tháng chưa suy thoái tại t và đủ 12 tháng tương lai; nhãn = 1 nếu USRECM = 1 trong t+1..t+12. **Train ≤ 1998-12, bỏ 1999, test ≥ 2000-01**; 2022–2026 báo cáo riêng. Benchmark = hằng số bằng tỷ lệ nền của train; Brier Skill Score = 1 − Brier/Brier_naive.

---

## 4. Results & Discussion

### 4.1 Descriptive / RQ1

| Metric fit NS (OLS, daily) | Giá trị |
|----------------------------|---------|
| Số ngày | 6 687 |
| RMSE trung bình | **0.093** (9.3 bp) |
| R² trung bình | **0.930** |
| R² trung vị | 0.979 |

Chuỗi tháng bàn giao (`ns_factors_monthly.csv`): RMSE trung bình 9.4 bp, đạt ngưỡng ≤ 10 bp của nhóm (với 11 kỳ hạn gồm 1M là 10.3 bp — vượt ngưỡng).

Hình dạng curve quan sát vs NS tại ngày đại diện normal / flat / inverted: `outputs/rq1_ns_fit_shapes.png` (và bản sao trong thư mục report). Chuỗi L/S/C tháng: `rq1_factors_monthly.png`.

**Diễn giải:** NS mô tả tốt đường cong Mỹ trên mẫu dài (H1 được hỗ trợ). Median R² rất cao; đuôi trái R² thấp gắn các ngày cong méo cực đoan. Sau khi sửa đơn vị λ (0.0609 → 0.7308) và bỏ DGS1MO, RMSE trung bình giảm từ 0.136 xuống 0.093 và R² trung bình tăng từ 0.873 lên 0.930; NLS hội tụ 100% trên mẫu 60 ngày.

### 4.2 RQ2 — AR vs Random Walk

Thiết kế: train 2000-01 → 2015-12, test 2016-01 → 2026-08 (117–128 điểm ngoài mẫu tuỳ horizon), expanding window, lag AR chọn bằng BIC chỉ trên tập train (kết quả AR(1) cho cả ba nhân tố), DM có trọng số Bartlett và hiệu chỉnh HLN (t(n−1)).

| Factor | h | RMSE_AR | RMSE_RW | DM p |
|--------|---|---------|---------|------|
| level | 1 | 0.230 | 0.229 | 0.45 |
| level | 6 | 0.567 | 0.550 | 0.56 |
| level | 12 | 0.786 | 0.764 | 0.77 |
| slope | 1 | 0.313 | 0.311 | 0.45 |
| slope | 6 | 0.886 | 0.870 | 0.66 |
| slope | 12 | 1.399 | 1.392 | 0.94 |
| curvature | 1 | 0.701 | 0.705 | 0.72 |
| curvature | 6 | 1.568 | 1.634 | 0.48 |
| curvature | 12 | 2.129 | 2.368 | 0.21 |

**Dự báo đường cong theo kỳ hạn** (`rq2_yield_forecast_by_maturity.csv`; AR trên 3 nhân tố → tái dựng lợi suất, so với RW của chính lợi suất; 10 kỳ hạn):

| h | RMSE TB (AR) | RMSE TB (RW) | Số kỳ hạn AR tốt hơn (/10) | Số kỳ hạn DM<5% (RW tốt hơn) |
|---|---|---|---|---|
| 1 | 0.253 | 0.230 | 1 | 5 |
| 3 | 0.488 | 0.464 | 4 | 2 |
| 6 | 0.754 | 0.723 | 3 | 1 |
| 12 | 1.206 | 1.204 | 4 | 0 |

**Diễn giải:** trên mẫu kiểm tra đủ dài (2016–2026), **AR trên nhân tố không thắng Random Walk một cách có ý nghĩa** ở bất kỳ nhân tố hay horizon nào; RW cho RMSE thấp hơn ở h=1 (5/10 kỳ hạn RW thắng có ý nghĩa, chủ yếu đầu ngắn và 20Y–30Y), hai mô hình gần như hòa ở h=12 (1.206 vs 1.204). Curvature là nhân tố duy nhất AR có RMSE thấp hơn RW ở mọi horizon (giảm 10% ở h=12) nhưng chưa có ý nghĩa thống kê. Kết luận này khớp với bản E2E của thành viên khác (cùng split 2016: RMSE AR/RW = 0.252/0.229, 0.754/0.724, 1.211/1.209) — code của repo tái lập số liệu của họ trong ±0.005. Nó **không** xác nhận đầy đủ kết quả của Diebold–Li (2006) (AR vượt RW ở h=12) trên mẫu 2016–2026, phù hợp với nhận định "lãi suất gần bước ngẫu nhiên" ở chương 1.

**Độ nhạy:**
- *Tiêu chí lag* (`rq2_ar_vs_rw_lag_aic_sensitivity.csv`): AIC chọn AR(4)/AR(4)/AR(5) và cho kết luận tương tự (không có ý nghĩa).
- *Mẫu kiểm tra ngắn gần đây* (train ≤ 2023-12-31, chỉ 21–32 điểm; `rq2_ar_vs_rw_split2023_recent.csv`): curvature h=6, 12 (p=0.009, 0.012) và slope h=6 (p=0.044) có vẻ AR thắng, nhưng đây là hệ quả của cửa sổ 2024–2026 ngắn, ít điểm độc lập, **không** dùng làm kết luận chính; level ở h=6/12 thì RW thắng. Chênh lệch giữa hai cách chia mẫu cho thấy kết quả RQ2 nhạy với giai đoạn kiểm tra.

### 4.3 RQ3 — VAR / Granger / IRF

Mẫu: 2000-01 → 2026-08 (319 tháng; CPI được tải từ 1999-01 để tính lạm phát YoY cho cả năm 2000).

- **Tính dừng** (ADF hằng số + xu hướng, chuỗi gốc): `cpi_yoy` p=0.067, `level` p=0.908, `curvature` p=0.250 → I(1), lấy sai phân bậc 1 (ADF sau sai phân p<0.001); `fed_funds` p=0.025 và `slope` p=0.009 → dừng, giữ nguyên mức. Kết quả trùng khớp bản E2E của thành viên khác.  
- **VAR(4)** theo AIC; ổn định (nghiệm nghịch đảo lớn nhất 0.961 < 1, khá gần 1 nên phản ứng tắt chậm). Portmanteau p≈0 ở mọi p=1..12 (`rq3_lag_diagnostics.csv`): phần dư còn tự tương quan → diễn giải IRF thận trọng.  
- **Lưu ý kiểm định dừng:** KPSS bác bỏ tính dừng của `slope` (p≈0,01) trong khi ADF(ct) không bác bỏ (p=0,009 → dừng); `cpi_yoy` ở sát ngưỡng (ADF p=0,064). Quy tắc nhóm dựa trên ADF nên `slope` giữ mức; kết quả IRF cần đọc cùng phần độ nhạy bên dưới. CPI tháng 10/2025 không được BLS công bố (đóng cửa chính phủ) và được nội suy tuyến tính trên mức CPI giữa 2025-09 và 2025-11.  
- Thứ tự Cholesky: `cpi_yoy → fed_funds → level → slope → curvature`.  
- **Granger** (p<0.05): `cpi_yoy` → `fed_funds` (p=0.024); `level`, `slope`, `curvature` → `fed_funds` (p<0.001); `slope` → `curvature` (p=0.035). Không có bằng chứng `fed_funds` → các nhân tố.  
- VIF ≤ 2.3.

**IRF** (`rq3_irf_full.png`, `rq3_irf_table.csv`; cú sốc Cholesky 1 độ lệch chuẩn, biến sai phân được cộng dồn về mức, khoảng tin cậy 95% bootstrap):

| Cú sốc → phản ứng | Ngay lập tức | Sau 12 tháng (KTC 95%) |
|---|---|---|
| Fed Funds → Slope | +0.13 | **+0.21** (0.08; 0.30) |
| Fed Funds → Level | 0.00 | +0.02 (−0.03; 0.07), không ý nghĩa |
| Fed Funds → Curvature | −0.06 | **−0.22** (−0.37; −0.05) |
| Lạm phát → Level | +0.05 (có ý nghĩa) | +0.02, không ý nghĩa |
| Lạm phát → Slope | −0.06 (có ý nghĩa) | −0.09, không ý nghĩa |

Quy đổi sang cú sốc +1 điểm % của Fed Funds (chia cho độ lệch chuẩn 0.093): Slope +2.26, Level +0.21, Curvature −2.40 sau 12 tháng — trùng với số liệu của bản E2E kia.

**Diễn giải kinh tế:** cú sốc thắt chặt chính sách làm Slope tăng bền vững (lãi suất ngắn tăng nhanh hơn dài → đường cong phẳng dần) và làm Curvature giảm; Level không phản ứng có ý nghĩa. Chiều Granger đi từ lạm phát và từ đường cong sang lãi suất Fed — phù hợp với việc Fed điều chỉnh theo lạm phát và điều kiện thị trường (kiểu quy tắc Taylor) — chứ không đi từ Fed sang đường cong. H3 vì thế được ủng hộ một phần (qua IRF, không qua Granger).

**Độ nhạy của IRF** (`outputs/rq3_irf_robustness.csv`, hàm `va.irf_robustness`): IRF Fed Funds → Slope (h = 1/6/12 tháng) có ý nghĩa và cùng dấu, cùng cỡ với mọi lựa chọn độ trễ: VAR(4) theo AIC +0,14/+0,22/+0,21; VAR(2) theo BIC +0,18/+0,24/+0,20; VAR(6) +0,11/+0,19/+0,20. Đến h = 24 khoảng tin cậy đã chứa 0. Fed Funds → Level và Lạm phát → Level không có ý nghĩa ở mọi đặc tả. Tuy nhiên kết quả **phụ thuộc hoàn toàn vào thứ tự Cholesky**: nếu đặt các nhân tố đường cong trước biến vĩ mô (đảo ngược hoặc `level, slope, curvature, cpi_yoy, fed_funds`) thì IRF Fed → Slope xấp xỉ 0 và không có ý nghĩa ở mọi kỳ; nếu đặt `fed_funds` đầu tiên thì kết quả giữ nguyên (+0,13/+0,21/+0,19). Nói cách khác, kết luận "thắt chặt chính sách làm Slope tăng" đúng khi giả định lãi suất chính sách không phản ứng tức thời với đường cong trong cùng tháng và đường cong phản ứng tức thời với chính sách; giả định này hợp lý cho lãi suất ngắn nhưng phải được nêu rõ như một giả định nhận diện, không phải kết quả thực nghiệm.

### 4.4 RQ4 — Inversion & Probit

**Thiết kế.** Mẫu 1976-06 → 2025-08 (527 tháng sau khi loại tháng đang suy thoái và 12 tháng cuối chưa có nhãn). Train ≤ 1998-12 (238 tháng, 35 dương), bỏ 1999, test 2000-01 → 2025-08 (277 tháng, 36 dương). Spread tháng = quan sát giao dịch hợp lệ cuối tháng. Mẫu bắt đầu 1976 (không phải 2000) vì cần đủ chu kỳ suy thoái để huấn luyện; đây là điều chỉnh so với phạm vi 2000–2026 ban đầu, còn 2022–2026 được báo cáo riêng như phép thử.

**Giai đoạn đảo ngược (10Y–2Y < 0):** 13 đợt từ 1978; đợt gần nhất **2022-07 → 2024-08 (25 tháng)**. Trong mẫu, tháng đảo ngược có 45,1% (37/82) rơi vào 12 tháng trước suy thoái, so với 7,6% (34/445) tháng không đảo ngược.

| Mô hình (test 2000–2025) | AUC | Brier | Brier hằng số | BSS |
|---|---|---|---|---|
| Probit 10Y–2Y, train ≤ 1998-12 | **0,822** | 0,1307 | 0,1134 | −15,3% |
| Dummy đảo ngược | 0,610 | 0,1388 | 0,1134 | −22,5% |
| Probit 10Y–3M (train từ 1982-12) | 0,845 | 0,1399 | 0,1173 | −19,3% |
| Probit 10Y–2Y, ước lượng lại mở rộng | 0,809 | 0,1296 | 0,1171 | −10,6% |

Hệ số spread (10Y–2Y, train) = **−2,51** (z = −6,68; sai số chuẩn HAC 12 tháng cho nhãn chồng lấn: z = −4,99, vẫn có ý nghĩa), McFadden R² train = 0,559. Khi ước lượng lại theo cửa sổ mở rộng, hệ số dịch từ −2,51 về −1,39.

**Diễn giải.** (i) Spread **xếp hạng** rất tốt các tháng trước suy thoái (AUC ≈ 0,82), tốt hơn hẳn dummy đảo ngược. (ii) Nhưng xác suất **không được hiệu chỉnh tốt**: Brier không thắng hằng số ở mọi biến thể (BSS âm), vì hệ số ước lượng trên 1976–1998 không ổn định qua thời gian. Kết luận đúng là "spread cho thứ tự rủi ro tốt, chưa cho xác suất đáng tin", chứ không phải "Probit dự báo xuất sắc". (iii) 10Y–3M có AUC cao hơn nhưng train chỉ 12 tháng dương.

**Phép thử 2022–2026** (mô hình cố định fit ≤ 1998-12; 56 tháng, 44 tháng có nhãn): không có suy thoái NBER nào trong 44 tháng có nhãn. Xác suất trung bình 46,6%, đỉnh 98,3% (2023-06), 23 tháng có P > 50%. Brier trên 44 tháng này = 0,324 so với 0,022 của hằng số — tức tín hiệu **sai kéo dài** (false alarm), phù hợp với việc đảo ngược 2022–24 phản ánh kỳ vọng lãi suất và premium kỳ hạn hơn là báo suy thoái. Tháng mới nhất (2026-08, spread +0,41) cho P ≈ 5,9% (ước lượng tạm thời vì tháng chưa kết thúc). Hình: `outputs/rq4_probit_probs.png`, `outputs/rq4_probit_stress_2022_2026.png`.

**Độ nhạy.** Thiết kế cũ của repo (cửa sổ 2000–2026, split 2021-12-31, AUC full 0,638) được giữ trong `outputs/*_window2000*` chỉ để đối chiếu; không dùng cho kết luận vì mẫu ngắn và test không có nhãn dương.

### 4.5 Robustness

1. OLS vs NLS (mẫu gần): `outputs/rq1_ols_vs_nls.csv`.  
2. Spread 10Y–3M vs 10Y–2Y (bảng trên).  
3. IRF theo lag (AIC/BIC/6) và thứ tự Cholesky: xem cuối §4.3.  
4. VN: World Bank macro năm (`vn_worldbank_macro.csv`); **chưa** có TPCP đa kỳ hạn → không chạy NS VN.

### 4.6 Economic discussion (hàm ý)

- **L tăng:** mặt bằng lãi suất dài hạn / neo lạm phát cao hơn → chi phí vốn tăng.  
- **S âm sâu:** thị trường giá trước nới lỏng / suy yếu tăng trưởng — nhưng 2022–24 cho thấy S âm có thể đi kèm “soft landing”.  
- **Ngân hàng / ALM:** theo dõi slope và độ dài inversion spell, không chỉ một ngưỡng nhị phân.  
- **Nhà đầu tư:** dùng NS factors + Probit như **chỉ báo chế độ**, kết hợp macro (Fed path, CPI), tránh giao dịch máy móc theo một lần đảo ngược.

---

## 5. Conclusion, Recommendation, Limitation

### 5.1 Conclusion

1. **RQ1:** NS OLS (λ=0.7308, 10 kỳ hạn) phù hợp tốt (R² trung bình ~0.93, trung vị ~0.98; RMSE TB 9.3 bp, dưới ngưỡng 10 bp).  
2. **RQ2:** Trên mẫu kiểm tra 2016–2026, AR trên nhân tố không vượt Random Walk có ý nghĩa thống kê ở nhân tố hay horizon nào (RW thắng ở h=1; hòa ở h=12); curvature là nhân tố duy nhất AR có RMSE thấp hơn RW ở mọi horizon. Kết quả 'AR thắng' trên cửa sổ 2024–2026 ngắn không vững.  
3. **RQ3:** VAR(4) trên chuỗi đã xử lý tính dừng, ổn định; lạm phát và L/S/C Granger-cause Fed Funds (không ngược lại); IRF: cú sốc Fed Funds làm Slope tăng và Curvature giảm có ý nghĩa, Level không phản ứng; kết quả Fed→Slope bền theo độ trễ (AIC/BIC/6) nhưng phụ thuộc thứ tự Cholesky (mất ý nghĩa nếu nhân tố đường cong đứng trước biến vĩ mô); phần dư còn tự tương quan nên diễn giải thận trọng.
4. **RQ4:** Spread 10Y–2Y xếp hạng tốt rủi ro suy thoái ngoài mẫu (AUC 0,82 trên 2000–2025) nhưng xác suất chưa được hiệu chỉnh (Brier không thắng hằng số, BSS −15%), và cho tín hiệu sai kéo dài trong 2022–2026.

### 5.2 Recommendation

- Dùng NS factors làm dashboard nội bộ (level/slope/curvature + RMSE fit).  
- Với dự báo, coi RW là chuẩn khó vượt; AR trên nhân tố chưa cho lợi thế có ý nghĩa trên mẫu 2016–2026.  
- Đọc tín hiệu inversion kèm thời lượng spell, lạm phát và lập trường Fed — không chỉ dấu spread.  
- Bổ sung dữ liệu TPCP VN đa kỳ hạn nếu muốn generalization check đầy đủ.

### 5.3 Limitation & further research

- VAR chạy trên chuỗi sai phân (không xét đồng liên kết/VECM); phần dư còn tự tương quan (Portmanteau).  
- Probit: chỉ 35 tháng dương trong train (các đợt suy thoái tương quan mạnh, số mẫu độc lập ít); nhãn 12 tháng chồng lấn nên sai số chuẩn thực tế lớn hơn; hệ số không ổn định theo thời gian; 2022–2026 không có nhãn dương nên không tính được AUC.  
- Thiếu TPCP VN theo kỳ hạn.  
- Hướng mở: dynamic \(λ\), AFNS, machine-learning benchmarks, threshold Probit / yield-curve “near-inversion” indicators.

---

## Phụ lục — Cách tái tạo

```bash
pip install -r requirements.txt
python scripts/run_pipeline.py
```

Notebooks: `notebooks/01_ns_estimation.ipynb` … `05_vn_extension.ipynb`.  
Số liệu và hình: `outputs/`.
