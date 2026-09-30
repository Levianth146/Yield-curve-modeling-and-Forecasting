<div align="right"><a href="README.md">English</a> · <b>Tiếng Việt</b></div>

# Mô hình hóa và dự báo đường cong lợi suất

**Đề án 04 · Đường cong lợi suất trái phiếu Mỹ: Nelson–Siegel → dự báo → cú sốc Fed → tín hiệu suy thoái → mở rộng Việt Nam**

> Nói ngắn gọn: lấy lãi suất trái phiếu chính phủ Mỹ ở 10 kỳ hạn, nén cả đường cong thành ba con số dễ đọc (Level, Slope, Curvature), rồi hỏi bốn câu thực tế. Chúng có dự báo được không? Fed tác động lên chúng thế nào? Chúng có báo trước suy thoái không? Ý tưởng này có dùng được cho Việt Nam không?

---

## Mục lục

1. [Kết quả chính trong một trang](#1-kết-quả-chính-trong-một-trang)
2. [Bắt đầu từ đâu: chọn lối đi](#2-bắt-đầu-từ-đâu-chọn-lối-đi)
3. [Lối A. Chỉ xem kết quả (dashboard, 5 phút)](#3-lối-a-chỉ-xem-kết-quả-dashboard-5-phút)
4. [Lối B. Tự chạy lại toàn bộ](#4-lối-b-tự-chạy-lại-toàn-bộ)
5. [Lối C. Đọc nghiên cứu](#5-lối-c-đọc-nghiên-cứu)
6. [Khung phân tích từng bước (RQ1 → RQ5)](#6-khung-phân-tích-từng-bước-rq1--rq5)
7. [Từ điển dễ hiểu](#7-từ-điển-dễ-hiểu)
8. [Dùng dữ liệu Việt Nam của bạn](#8-dùng-dữ-liệu-việt-nam-của-bạn)
9. [Bản đồ thư mục](#9-bản-đồ-thư-mục)
10. [Gặp lỗi thì làm gì (FAQ)](#10-gặp-lỗi-thì-làm-gì-faq)
11. [Hạn chế cần nói thẳng](#11-hạn-chế-cần-nói-thẳng)
12. [Làm việc nhóm, tài liệu tham khảo](#12-làm-việc-nhóm-tài-liệu-tham-khảo)

---

## 1. Kết quả chính trong một trang

**Đường cong lợi suất** là đường biểu diễn lãi suất mà chính phủ trả khi vay 3 tháng, 1 năm, 2 năm … 30 năm. Hình dạng của nó chứa thông tin về kỳ vọng của thị trường. Đề án đặt năm câu hỏi, và đây là câu trả lời.

| # | Câu hỏi | Trả lời ngắn |
|---|---|---|
| **RQ1** | Ba con số có mô tả được cả đường cong không? | **Có.** Nelson–Siegel khớp với sai số trung bình khoảng **9 bp** (0.09 điểm %), dưới ngưỡng 10 bp đề ra. |
| **RQ2** | Mô hình thống kê AR có dự báo các con số đó tốt hơn quy tắc ngây thơ "tháng sau = tháng này" (random walk) không? | **Không, ít nhất là không có ý nghĩa thống kê.** Quy tắc ngây thơ thắng ở 1 tháng và hoà ở 12 tháng. Chỉ Curvature có lợi thế nhỏ cho AR, nhưng không đáng kể. |
| **RQ3** | Fed tăng lãi suất bất ngờ thì đường cong thay đổi ra sao? | **Slope tăng** (lãi suất ngắn hạn tăng nhanh hơn dài hạn nên đường cong phẳng lại), Curvature giảm, Level gần như không phản ứng. Kết quả **bền qua nhiều cấu hình nhưng phụ thuộc thứ tự biến giả định**, nên xếp mức *vừa phải*, chưa phải bằng chứng chắc. |
| **RQ4** | Đường cong đảo ngược (10Y − 2Y < 0) có báo trước suy thoái trong 12 tháng không? | **Xếp hạng rủi ro tốt** (AUC **0.82**) nhưng **xác suất chưa chuẩn** (kém hơn việc đoán hằng số, Brier skill score **−15%**) và đã báo động sai kéo dài giai đoạn 2022–2026. |
| **RQ5** | Cùng phương pháp áp cho Việt Nam được không? | **Một phần.** Ba nhân tố mô tả được đường cong VN, nhưng λ tốt nhất khác (**0.40** so với 0.7308 của Mỹ) và các nhân tố không đi cùng Mỹ. Dữ liệu là giá tham khảo, không phải đường cong chính thức. |

> **Cách đọc "bp":** 1 bp (điểm cơ bản) = 0.01 điểm phần trăm. 9 bp = 0.09%.
>
> **Quy ước dấu gặp ở mọi nơi:** trong đề án này **Slope = lãi suất ngắn hạn − lãi suất dài hạn**. **Slope âm = đường cong bình thường (dốc lên). Slope dương = đường cong đảo ngược.**

Toàn văn, bảng và hình: [`docs/report/report.md`](docs/report/report.md) (có cả bản Word: `docs/report/Yield_curve_report.docx`).

---

## 2. Bắt đầu từ đâu: chọn lối đi

| Tôi muốn… | Đi tới | Cần | Thời gian |
|---|---|---|---|
| **Xem và thử nghiệm kết quả** mà không cài nhiều | [Lối A](#3-lối-a-chỉ-xem-kết-quả-dashboard-5-phút) | Chỉ Python | ~5 phút |
| **Tái tạo mọi con số và biểu đồ** từ dữ liệu gốc | [Lối B](#4-lối-b-tự-chạy-lại-toàn-bộ) | Python + internet (lần đầu) | 10–60 phút |
| **Hiểu nghiên cứu** mà không chạy gì | [Lối C](#5-lối-c-đọc-nghiên-cứu) | Trình duyệt | – |

Chưa biết chọn gì thì bắt đầu bằng **Lối A**. Người chưa từng lập trình cũng làm được.

---

## 3. Lối A. Chỉ xem kết quả (dashboard, 5 phút)

Dashboard ("Yield Curve Lab") là một trang web nhỏ chạy ngay trên máy bạn. Nó đã chứa sẵn dữ liệu cần thiết (thư mục `dashboard/data/`), nên bạn **không cần** chạy phân tích trước.

### Bước 1: Cài Python (một lần)
- Tải Python **3.10 trở lên** tại <https://www.python.org/downloads/>.
- **Windows:** khi cài, nhớ tick **"Add python.exe to PATH"**.
- Kiểm tra: mở cửa sổ dòng lệnh (Windows: bấm phím Windows, gõ `PowerShell`, Enter; macOS: mở *Terminal*) rồi gõ `python --version`. Trên macOS/Linux dùng `python3` nếu `python` không chạy.

### Bước 2: Tải dự án về
- Dễ nhất: trên trang GitHub bấm nút xanh **Code** → **Download ZIP**, rồi giải nén.
- Hoặc dùng git: `git clone https://github.com/Levianth146/Yield-curve-modeling-and-Forecasting`

### Bước 3: Bật dashboard
Trong cửa sổ dòng lệnh, đi vào thư mục dự án rồi vào `dashboard`, và bật một máy chủ web nhỏ:

```bash
cd Yield-curve-modeling-and-Forecasting/dashboard
python -m http.server 8765
```

(Nếu cần, dùng `python3` thay `python`. Cứ để cửa sổ này mở, nó chính là máy chủ.)

### Bước 4: Mở
Mở trình duyệt và vào **<http://127.0.0.1:8765/>**.
Muốn tắt: bấm vào cửa sổ dòng lệnh và nhấn `Ctrl + C`.

### Cách dùng dashboard
Các tab trên cùng đi theo đúng thứ tự của nghiên cứu:

| Tab | Trả lời câu hỏi | Thử làm gì |
|---|---|---|
| **Hôm nay** | Đường cong bây giờ trông thế nào, có đảo ngược không? | Kéo thanh ngày về 2007, 2019, 2022 và xem hình dạng đổi. |
| **Nhân tố** | Level / Slope / Curvature mô tả đường cong ra sao? | Đổi λ và xem các nhân tố có giữ ổn định không. |
| **Dự báo** | AR có thắng "tháng sau = tháng này" không? | Đổi nhân tố và chân trời (1/3/6/12 tháng); đọc ô *p-value*. |
| **Cú sốc Fed** | Fed bất ngờ đổi lãi suất thì đường cong ra sao? | Đổi số độ trễ và thứ tự biến; vùng tô là khoảng bất định 95%. |
| **Suy thoái** | Đường cong đảo ngược có báo suy thoái không? | Kéo ngưỡng quyết định và xem đánh đổi giữa bắt đúng và báo nhầm. |
| **Việt Nam** | Phương pháp có dùng được cho Việt Nam không? | So λ của Việt Nam với λ của Mỹ. |
| **Tổng kết** | Kết luận nào vững, kết luận nào mong manh? | Chỉ có hai phút thì đọc tab này. |

Mọi trang có cùng bố cục: **câu hỏi → kết luận một câu → biểu đồ → "nghĩa là gì / độ tin cậy / giới hạn"**. Thiết lập bạn chọn được lưu vào địa chỉ web, nên chỉ cần sao chép đường link là gửi được đúng màn hình đang xem.

> Thêm `?selftest=1` vào địa chỉ (`http://127.0.0.1:8765/?selftest=1`) để dashboard tự kiểm tra phép tính của nó với kết quả Python. Banner xanh nghĩa là khớp.

---

## 4. Lối B. Tự chạy lại toàn bộ

### Bước 1: Cài thư viện (một lần)
```bash
cd Yield-curve-modeling-and-Forecasting
python -m venv .venv                 # tuỳ chọn, cho gọn gàng
# Windows PowerShell:  .venv\Scripts\Activate.ps1
# macOS / Linux:       source .venv/bin/activate
pip install -r requirements.txt
```

### Bước 2 (tuỳ chọn): khoá API FRED
Dữ liệu lấy từ FRED (Ngân hàng Dự trữ Liên bang St. Louis).
- **Không bắt buộc có khoá.** Nếu không có, code tự tải các file CSV công khai của FRED.
- Có khoá miễn phí sẽ nhanh và ổn định hơn: <https://fred.stlouisfed.org/docs/api/api_key.html>. Đặt khoá trước khi chạy:
  - Windows PowerShell: `$env:FRED_API_KEY="khoa_cua_ban"`
  - Windows cmd: `set FRED_API_KEY=khoa_cua_ban`
  - macOS / Linux: `export FRED_API_KEY=khoa_cua_ban`
- Không bao giờ viết khoá vào code hay commit nó. File `.env` đã bị git bỏ qua; `.env.example` chỉ ra định dạng.

### Bước 3: Chạy toàn bộ quy trình
```bash
python scripts/run_pipeline.py
```
Lệnh này lần lượt chạy RQ1 → RQ4, phần mở rộng Việt Nam, biểu đồ tương tác và xuất dữ liệu cho dashboard, đồng thời in tiến độ. Bước chậm nhất là lưới cú sốc Fed cho dashboard.

Các tuỳ chọn hữu ích:

| Lệnh | Tác dụng |
|---|---|
| `python scripts/run_pipeline.py` | Chạy bình thường, **dùng lại dữ liệu đã tải** trong `data/`. |
| `python scripts/run_pipeline.py --refresh` | Tải lại dữ liệu mới từ FRED trước. |
| `python scripts/run_pipeline.py --skip-irf-export` | Bỏ bước chậm nhất của dashboard (chạy thử nhanh). |
| `python scripts/run_pipeline.py --no-dashboard` | Không xuất dữ liệu cho dashboard. |
| `python scripts/run_pipeline.py --check` | Chỉ kiểm tra JavaScript của dashboard cho ra cùng số với Python. |

### Bước 4: Tìm kết quả
- Bảng và hình: **`outputs/`** (tên file bắt đầu bằng `rq1_`, `rq2_`, … `vn_`).
- Chuỗi trung gian: **`data/`**.
- Ý nghĩa từng file và từng cột: [`docs/data_dictionary.md`](docs/data_dictionary.md).
- Xem từng bước bằng notebook: `jupyter notebook`, rồi mở `notebooks/01_…` đến `05_…`.

> **Quy tắc:** không sửa tay file trong `data/` và `outputs/`. Muốn đổi số thì sửa code trong `src/` rồi chạy lại, nếu không số liệu, báo cáo và dashboard sẽ lệch nhau.

### Bước 5: Cập nhật dashboard bằng số mới
```bash
python scripts/export_dashboard_data.py          # thêm --skip-irf để cập nhật nhanh
cd dashboard
python -m http.server 8765
```

### Kiểm tra tự động
```bash
python scripts/run_pipeline.py --check     # Python so với dashboard
node dashboard/tests/run_all.mjs           # kiểm thử đơn vị của dashboard (cần Node.js)
```

---

## 5. Lối C. Đọc nghiên cứu

| Đọc gì | Ở đâu |
|---|---|
| Báo cáo đầy đủ (mở đầu, tổng quan, phương pháp, kết quả, kết luận) | [`docs/report/report.md`](docs/report/report.md) |
| Ý nghĩa mọi file dữ liệu | [`docs/data_dictionary.md`](docs/data_dictionary.md) |
| Hướng dẫn dữ liệu Việt Nam | [`docs/vn_data_guide.md`](docs/vn_data_guide.md) |

---

## 6. Khung phân tích từng bước (RQ1 → RQ5)

```
Lợi suất trái phiếu Mỹ (FRED, theo ngày, 2000 → nay)
        │
        ▼
 RQ1  Nelson–Siegel mỗi ngày  →  Level · Slope · Curvature
        │
   ┌────┴───────────────────────┐
   ▼                            ▼
 RQ2  AR so với random walk   RQ3  VAR với lạm phát + Fed funds → cú sốc (IRF)
   └────────────┬───────────────┘
                ▼
 RQ4  Spread 10Y − 2Y → Probit → suy thoái trong 12 tháng (nhãn NBER)
                ▼
 RQ5  Cùng ý tưởng cho trái phiếu chính phủ Việt Nam (mở rộng / kiểm tra độ vững)
```

### RQ1. Mô tả đường cong (Nelson–Siegel)
- **Ý tưởng:** mỗi ngày, đường cong được viết là `Level + Slope × (trọng số ngắn hạn) + Curvature × (trọng số trung hạn)`. Ba con số được ước lượng bằng bình phương tối thiểu với hệ số suy giảm cố định λ = 0.7308 (= 12 × 0.0609, giá trị Diebold–Li đổi từ tháng sang năm).
- **Code:** `src/nelson_siegel.py` · **Notebook:** `01_ns_estimation.ipynb` · **Kết quả:** `outputs/rq1_*`
- **Kết luận:** khớp tốt (sai số trung bình ≈ 9 bp). Cho λ tự do mỗi ngày thì khớp sát hơn (5.1 bp) nhưng các nhân tố trở nên **thiếu ổn định** (tương quan với nhân tố λ cố định chỉ 0.37 / 0.55 / 0.31), nên giữ λ cố định.

### RQ2. Dự báo các nhân tố (AR so với random walk)
- **Ý tưởng:** dự báo từng nhân tố trước 1, 3, 6, 12 tháng bằng AR (độ trễ chọn theo BIC, tối đa 12) và so với "không đổi". Kiểm định Diebold–Mariano cho biết chênh lệch sai số là thật hay do may rủi.
- **Code:** `src/forecasting.py` · **Notebook:** `02_ar_forecast.ipynb` · **Kết quả:** `outputs/rq2_*`
- **Kết luận:** AR **không** thắng random walk có ý nghĩa ở bất kỳ nhân tố hay chân trời nào. Hãy coi quy tắc ngây thơ là chuẩn khó vượt.

### RQ3. Cú sốc Fed và lạm phát (VAR và hàm phản ứng xung)
- **Ý tưởng:** mô hình chung lạm phát, lãi suất Fed funds và ba nhân tố (VAR). Sau đó cho lãi suất Fed một cú bất ngờ bằng một độ lệch chuẩn (≈ 9 bp) và theo dõi các nhân tố phản ứng từng tháng (IRF), kèm dải bất định 95% bằng bootstrap.
- **Code:** `src/var_analysis.py`, `src/dashboard_irf_grid.py` · **Notebook:** `03_var_irf.ipynb` · **Kết quả:** `outputs/rq3_*`
- **Kết luận:** sau cú sốc Fed, Slope tăng và Curvature giảm; Level không đổi. Kết quả Slope đúng ở phần lớn (182 trên 288) cấu hình đã thử nhưng **nhạy với thứ tự biến**, nên ở mức vừa phải, không phải chứng minh nhân quả.

### RQ4. Cảnh báo suy thoái (Probit)
- **Ý tưởng:** spread 10Y − 2Y thấp hoặc âm hôm nay có dự báo được suy thoái NBER trong 12 tháng tới không? Huấn luyện 1976–1998, kiểm tra 2000–2025, kèm phép thử áp lực 2022–2026.
- **Code:** `src/probit_recession.py` · **Notebook:** `04_probit_recession.ipynb` · **Kết quả:** `outputs/rq4_*`
- **Kết luận:** giỏi *xếp hạng* các tháng theo rủi ro (AUC 0.82), kém ở *độ chính xác của xác suất* (BSS −15%). Chỉ có 35 tháng dương trong huấn luyện từ 3 đợt suy thoái, nên cần khiêm tốn.

### RQ5. Mở rộng Việt Nam
- **Ý tưởng:** lặp lại Nelson–Siegel trên lợi suất trái phiếu chính phủ Việt Nam (7 kỳ hạn, 1–15 năm), chọn λ riêng cho Việt Nam, so nhân tố với Mỹ.
- **Code:** `src/vn_extension.py` · **Notebook:** `05_vn_extension.ipynb` · **Kết quả:** `outputs/vn_*`
- **Kết luận:** dùng tốt để mô tả; λ tốt nhất ≈ 0.40 (sai số 7.7 bp so với 9.9 bp khi dùng λ của Mỹ); nhân tố mức không đi cùng Mỹ. Dữ liệu là giá tham khảo Investing.com, không phải đường cong chính thức HNX/VBMA, và nhiều ngày lặp lại giá hôm trước.

---

## 7. Từ điển dễ hiểu

| Thuật ngữ | Nghĩa |
|---|---|
| **Lợi suất / lãi suất** | Mức sinh lời hằng năm của trái phiếu, tính bằng %. |
| **Kỳ hạn** | Bao lâu nữa trái phiếu được trả gốc (3M = 3 tháng, 10Y = 10 năm). |
| **Level** | Độ cao chung của đường cong; xấp xỉ lãi suất dài hạn. |
| **Slope** | *Lãi suất ngắn hạn − dài hạn.* **Âm = đường cong bình thường dốc lên; dương = đảo ngược.** |
| **Curvature** | Đoạn giữa (2–3 năm) phồng lên hay lõm xuống bao nhiêu so với đường thẳng nối hai đầu. |
| **Đường cong đảo ngược** | Lãi suất ngắn hạn cao hơn dài hạn; trong lịch sử thường đứng trước suy thoái. |
| **λ (lambda)** | Điều khiển tốc độ hiệu ứng của Slope/Curvature phai đi theo kỳ hạn. |
| **bp** | Điểm cơ bản = 0.01 điểm phần trăm. |
| **Random walk** | Dự báo ngây thơ "tháng sau = tháng này". |
| **AR(p)** | Dự báo từ *p* giá trị trước của chính chuỗi đó. |
| **Diebold–Mariano (DM), p-value** | Kiểm định hai dự báo có thật sự khác nhau không. p nhỏ (< 0.05) nghĩa là khó là do may rủi. Trong đề án này **DM > 0 nghĩa là random walk tốt hơn.** |
| **VAR** | Nhiều chuỗi được giải thích bằng quá khứ của chính nó và của nhau. |
| **IRF** | Hàm phản ứng xung: một biến phản ứng thế nào trong các tháng sau một cú sốc một lần. |
| **Thứ tự Cholesky** | Giả định biến nào phản ứng trước trong cùng một tháng; nó đổi kết quả, nên đề án thử nhiều thứ tự. |
| **Probit** | Mô hình biến một con số (spread) thành xác suất từ 0 đến 1. |
| **AUC** | 0.5 = tung đồng xu, 1 = xếp hạng hoàn hảo tháng rủi ro và tháng an toàn. |
| **Brier / BSS** | Độ chính xác của xác suất. BSS dưới 0 nghĩa là kém hơn việc luôn đoán theo tần suất lịch sử. |
| **NBER** | Tổ chức Mỹ xác định chính thức các đợt suy thoái (công bố trễ vài tháng). |

---

## 8. Dùng dữ liệu Việt Nam của bạn

Hướng dẫn đầy đủ: [`docs/vn_data_guide.md`](docs/vn_data_guide.md). Bản tóm tắt:

1. Đặt các file CSV lợi suất theo ngày (từ Investing.com, HNX, VBMA…) tên dạng `Vietnam_<n>-Year_Bond_Yield_Historical_Data.csv` vào một thư mục.
2. Ghép lại: `python scripts/build_vn_yields.py <thư_mục_đó>` → tạo `data/vn_treasury_yields.csv` và báo cáo chất lượng dữ liệu.
3. Chạy `python scripts/run_pipeline.py`, rồi mở `outputs/vn_data_validation.json` (đọc mục `warnings` trước) và notebook `05`.

Quy tắc: cột đầu là ngày `YYYY-MM-DD`; các cột còn lại là kỳ hạn theo năm (`1,2,3,5,7,10,15…`); giá trị là **% một năm** (3.25, không phải 0.0325); ô thiếu để trống; không trộn nhiều nguồn.

---

## 9. Bản đồ thư mục

```
Yield-curve-modeling-and-Forecasting/
├── README.md / README.vi.md     ← bạn đang ở đây (English / Tiếng Việt)
├── requirements.txt             ← thư viện Python
├── src/                         ← phần logic (sửa code ở đây)
│   ├── config.py                  thiết lập: ngày, kỳ hạn, λ, độ trễ
│   ├── data_fetch.py              tải từ FRED (ưu tiên cache)
│   ├── nelson_siegel.py           RQ1
│   ├── forecasting.py             RQ2
│   ├── var_analysis.py            RQ3
│   ├── probit_recession.py        RQ4
│   ├── vn_extension.py            RQ5
│   └── utils.py, interactive.py, dashboard_irf_grid.py
├── scripts/
│   ├── run_pipeline.py            ▶ chạy tất cả
│   ├── export_dashboard_data.py   ghi dữ liệu cho dashboard
│   ├── check_dashboard_parity.py  kiểm tra Python so với dashboard
│   ├── build_vn_yields.py         ghép các file CSV Việt Nam
│   └── make_interactive.py        biểu đồ tương tác
├── notebooks/01…05              ← mỗi RQ một notebook (đọc và trực quan hoá)
├── data/                        ← chuỗi trung gian (tự sinh)
├── outputs/                     ← bảng, hình, tóm tắt (tự sinh)
│   └── interactive/               biểu đồ HTML 2D/3D (mở bằng trình duyệt)
├── dashboard/                   ← website Yield Curve Lab (JavaScript + D3)
├── docs/                        ← báo cáo, kế hoạch, từ điển dữ liệu, hướng dẫn
└── input/                       ← đề bài gốc (PDF, sườn Excel)
```

---

## 10. Gặp lỗi thì làm gì (FAQ)

| Vấn đề | Cách xử lý |
|---|---|
| `python` không được nhận ra | Cài lại Python và tick **Add to PATH**, hoặc thử `py` (Windows) / `python3` (macOS, Linux). |
| `pip install` lỗi | Cập nhật pip: `python -m pip install --upgrade pip`. Dùng môi trường ảo (Bước 1 của Lối B). |
| Dashboard trắng trang hoặc báo "không tải được" | Mở qua `http://127.0.0.1:8765/`, **không** bấm đúp vào `index.html` (trình duyệt chặn module khi mở từ ổ đĩa). |
| "Address already in use" / cổng 8765 bận | Dùng cổng khác: `python -m http.server 8766`, rồi mở `…:8766`. |
| Đã sửa code mà dashboard vẫn như cũ | Tải lại cứng (`Ctrl + Shift + R`). Trình duyệt lưu đệm script. |
| Tải FRED thất bại | Kiểm tra mạng, hoặc đặt `FRED_API_KEY`. Quy trình sẽ dùng CSV công khai và file đã lưu trong `data/`. |
| Chạy quá lâu | Thêm `--skip-irf-export` để chạy nhanh. |
| Banner self-test màu đỏ | Chạy `python scripts/run_pipeline.py` rồi `python scripts/export_dashboard_data.py` để dữ liệu dashboard và Python cùng một lần chạy. |
| Kết quả Việt Nam có cảnh báo | Đọc `outputs/vn_data_validation.json`|
| Số hơi khác báo cáo | Ngày kết thúc dữ liệu dịch dần sau mỗi lần tải mới. So cùng ngày kết thúc, hoặc chạy không có `--refresh`. |

---

## 11. Hạn chế cần nói thẳng

- **Nhãn suy thoái được công bố trễ** (vài tháng đến hơn một năm), và bộ lọc của Probit dùng thông tin chỉ biết sau này, nên đây không phải kiểm định thời gian thực.
- **Chỉ có 3 đợt suy thoái** trong mẫu huấn luyện Probit; xác suất thiếu ổn định.
- **Kết quả VAR phụ thuộc thứ tự biến giả định** và cách đo lạm phát; không xét đồng liên kết.
- **Lệch thời điểm:** Fed funds là trung bình tháng còn nhân tố đường cong là giá trị cuối tháng.
- **Dữ liệu Việt Nam là giá tham khảo**, không phải đường cong chính thức; chỉ 7 kỳ hạn (1–15Y) và nhiều ngày giá đứng nguyên.
- Tương quan và hàm phản ứng xung **không chứng minh nhân quả**.
- Đây là **dự án nghiên cứu, không phải lời khuyên đầu tư**.

---

## 12. Tài liệu tham khảo

- **Tài liệu chính:** Nelson & Siegel (1987); Diebold & Li (2006); Diebold, Rudebusch & Aruoba (2006); Diebold & Mariano (1995); Harvey, Leybourne & Newbold (1997); Sims (1980); Estrella & Mishkin (1998); Bauer & Mertens (2018); Rudebusch & Williams (2009). Danh sách đầy đủ trong báo cáo.
- **Dữ liệu:** FRED (lợi suất Kho bạc Mỹ `DGS*`, CPI, Fed funds, NBER `USRECM`); Investing.com (Việt Nam, giá tham khảo).
