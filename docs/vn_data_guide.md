# RQ5 — Hướng dẫn dữ liệu lợi suất TPCP Việt Nam (Option A)

## Ghép file Investing.com
`python scripts/build_vn_yields.py <thư_mục_chứa_các_file_csv>` ghép các file `Vietnam_<n>-Year_Bond_Yield_Historical_Data.csv` thành file dưới đây và ghi báo cáo chất lượng (tỷ lệ ngày không đổi theo kỳ hạn/năm).

## File cần có
`data/vn_treasury_yields.csv` (mẫu tiêu đề: `data/vn_treasury_yields_TEMPLATE.csv`).

| Yêu cầu | Chi tiết |
|---|---|
| Cột đầu | ngày `YYYY-MM-DD` (tần suất **ngày**, ngày giao dịch) |
| Các cột còn lại | mỗi cột một kỳ hạn, **tên cột = số năm** (`1,2,3,5,7,10,15,20,30`; kỳ hạn tháng: `0.25`, `0.5`) |
| Giá trị | lợi suất **% năm** (3.25, không phải 0.0325 hay 325 bps); ô thiếu để trống, **không tự điền** |
| Số kỳ hạn | tối thiểu 5 kỳ hạn; mỗi ngày cần ≥ 5 kỳ hạn mới được fit. Nếu ≥ 95% số ngày có đủ mọi kỳ hạn thì pipeline chỉ fit các ngày đủ (tránh nhân tố nhảy do đổi tập kỳ hạn) |
| Độ dài | càng dài càng tốt: ≥ 250 ngày để mô tả, ≥ 72 tháng để chạy AR vs RW (khuyến nghị 2013 → nay) |
| Một định nghĩa duy nhất | không trộn lợi suất yết (par/YTM) với zero-coupon; không đổi nguồn giữa chừng |

## Nguồn gợi ý (cần bạn tự kiểm tra điều khoản sử dụng và định nghĩa)
- HNX: đường cong lợi suất TPCP theo ngày (hnx.vn).
- VBMA: bản tin/đường cong lợi suất TPCP theo ngày (vbma.org.vn).
- Trang dữ liệu tài chính có bảng lợi suất TPCP Việt Nam 1–30 năm (ví dụ investing.com) — tải lịch sử rồi ghép cột.
Ghi nguồn và định nghĩa vào báo cáo (mục Data).

## Chạy
1. Đặt file, rồi `python scripts/run_pipeline.py` (cache-first, không cần `--refresh` cho phần VN).
2. Kết quả trong `outputs/`: `vn_data_validation.json` (kiểm tra dữ liệu, đọc `warnings` trước), `vn_lambda_grid.csv`,
   `vn_ns_factors_daily.csv`, `vn_ns_factors_monthly.csv`, `vn_ns_fit_shapes.png`, `vn_factors_monthly.png`,
   `vn_ar_vs_rw.csv` (nếu ≥ 72 tháng), `vn_extension_notes.json` (λ chọn, RMSE, tương quan với US).
3. Mở `notebooks/05_vn_extension.ipynb` để xem bảng và hình.

## Phương pháp
- OLS Nelson–Siegel theo ngày; λ (theo năm) chọn trên lưới 0.2–2.0 sao cho RMSE trung bình nhỏ nhất, báo cáo song song với λ của US (0.7308).
- Nhân tố tháng = ngày hợp lệ cuối tháng; bỏ tháng chưa kết thúc.
- So với US: tương quan nhân tố ở mức và ở sai phân (chỉ mô tả, không phải nhân quả).
- AR(p) vs Random Walk: train 70% đầu, expanding window, DM–HLN như phần US.
- Ngoài phạm vi: Probit VN (không có nhãn suy thoái kiểu NBER) và VAR (thiếu CPI/lãi suất điều hành theo tháng).

## Cách đọc kết quả
- λ chọn nằm sát biên lưới (0.2 hoặc 2.0) → dữ liệu ít kỳ hạn, λ không nhận dạng được; ghi chú và ưu tiên λ của US.
- RMSE >> 10 bp thường do dữ liệu thanh khoản kém ở kỳ hạn dài hoặc nhập sai đơn vị.
- Thị trường VN có lợi suất ngắn hạn biến động theo thanh khoản liên ngân hàng; đừng diễn giải Slope giống hệt US.
