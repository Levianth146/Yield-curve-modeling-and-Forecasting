# Ghi chú chỉnh sửa giao diện dashboard (30/09/2026)

Bản chỉnh sửa này **giữ nguyên** toàn bộ phần tính toán (`js/engine/`), dữ liệu (`data/`),
các biểu đồ và bố cục 8 trang của tác giả. Bộ kiểm thử gốc (`node tests/run_all.mjs`,
435 phép kiểm tra khớp số với Python) vẫn đạt đủ.

## Những gì đã thay đổi

- **Giao diện:** nội dung rộng 1.360 px (trước 1.080 px), cỡ chữ 17 px (trước 15 px);
  thanh điều khiển mỏng hơn (`css/base.css`, phần cuối file).
- **Nhãn kết luận:** đổi thành "Kết luận vững / Kết luận chưa vững / Không được dữ liệu ủng hộ",
  và mỗi nhãn hiển thị **căn cứ đánh giá** (con số và ngưỡng) theo quy tắc C1–C5
  trong `js/engine/claims/registry.js`. Trang 1 và trang Phương pháp không gắn nhãn.
- **Công thức:** thống nhất ký hiệu L_t, S_t, C_t (thay cho β₀, β₁, β₂), chỉ giữ công thức cốt lõi
  của mỗi mô hình, giải thích ký hiệu bằng câu văn (`js/content/formulas.js`).
- **Trang 1:** thêm khối "Cơ sở lý thuyết" A1–A6 (`js/content/theory.js`).
- **Trang 2:** gộp thanh điều khiển 4 hàng còn 2 hàng; sửa lỗi nhãn λ = 0,7308 tràn khỏi biểu đồ.
- **Trang 3:** đổi tên điều khiển (Tầm dự báo, Cách ước lượng, Thước đo sai số, Tiêu chí chọn độ trễ);
  sửa quy tắc nhãn khi Random Walk thắng AR.
- **Trang 4:** chỉ giữ cú sốc lạm phát và lãi suất Fed, phản ứng của L, S, C; bỏ thanh "Độ lớn cú sốc"
  (cố định 1 độ lệch chuẩn); gom 288 cấu hình vào mục "Kiểm định độ bền"; sửa câu kết luận luôn ghi "lãi suất Fed".
- **Trang 5–8:** viết lại nhãn và câu chữ tiếng Việt theo văn phong học thuật.
- **Mở dashboard:** thêm `Mo_dashboard.bat` ở thư mục gốc dự án (bấm đúp để mở).
