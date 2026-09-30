# Yield Curve Lab

Dashboard tĩnh (vanilla ES modules + D3 v7) cho RQ1–RQ4 và phần mở rộng Việt Nam. Nguồn sự thật của phép tính là `src/` và dữ liệu dashboard được sinh bởi `scripts/export_dashboard_data.py`.

## Mở dashboard

> Chạy các lệnh dưới đây từ **thư mục gốc của repository**, không phải từ `dashboard/`.

### Cách 1 — Windows, bấm đúp (khuyến nghị)

Bấm đúp file:

```text
Mo_dashboard.bat
```

File này gọi `scripts/serve_dashboard.py`, tự mở trình duyệt và dùng header **no-cache** để tránh tình trạng sửa JS/CSS nhưng trình duyệt vẫn hiện giao diện cũ.

### Cách 2 — PowerShell / Terminal

```powershell
py scripts\serve_dashboard.py
```

Nếu không có `py`:

```powershell
python scripts\serve_dashboard.py
```

Các tùy chọn hữu ích:

```powershell
py scripts\serve_dashboard.py --selftest
py scripts\serve_dashboard.py --port 8766
py scripts\serve_dashboard.py --no-open
```

Server ưu tiên cổng `8765`. Nếu cổng đó bận, nó tự chọn cổng kế tiếp còn trống và in URL chính xác ra terminal.

### Cách 3 — server tĩnh cơ bản

```powershell
cd dashboard
py -m http.server 8765
```

Sau đó mở `http://127.0.0.1:8765/`.

Cách này không gửi header no-cache, vì vậy khi đang chỉnh giao diện nên dùng Cách 1 hoặc Cách 2.

## Cập nhật dữ liệu dashboard

Từ thư mục gốc:

```powershell
python scripts/export_dashboard_data.py --skip-irf
py scripts\serve_dashboard.py --selftest
```

Bỏ `--skip-irf` nếu cần tái tạo đầy đủ lưới IRF.

## Cấu trúc giao diện hiện tại

1. **Tổng quan** — đường cong theo ngày + cơ sở lý thuyết A1–A6.
2. **Nhân tố** — Level / Slope / Curvature và độ nhạy với λ/phương pháp.
3. **Dự báo** — AR so với Random Walk, RMSE/MAE/DM.
4. **Cú sốc Fed** — VAR/IRF và kiểm tra độ nhạy.
5. **Suy thoái** — Probit, AUC/Brier và ngưỡng phân loại.
6. **Việt Nam** — Nelson–Siegel trên dữ liệu tham khảo Việt Nam.
7. **Tổng kết** — registry các kết luận chính.
8. **Phương pháp** — dữ liệu, công thức và cách tái lập.

Trang Tổng quan không lặp cột **“Nghĩa là gì”** ở cuối vì phần A1–A6 đã đảm nhiệm vai trò giải thích. Các formula card ở các trang còn lại trình bày phần **“Trong đó”** theo từng ký hiệu trên từng dòng.

## Kiểm tra tính nhất quán

```powershell
python scripts/check_dashboard_parity.py
# hoặc
node dashboard/tests/run_all.mjs
```

Thêm `--selftest` khi mở dashboard để chạy parity test phía trình duyệt.

## Ghi chú kỹ thuật

- Route nội bộ của trang Tổng quan vẫn là `#/today` để giữ tương thích với permalink cũ; nhãn hiển thị đã đổi thành **Tổng quan / Overview**.
- `dist.js`: incomplete beta Lentz + accurate Φ.
- `ar.js`: origin inclusive + fit-once forecast; AIC `hold_back=maxlag`.
- `dm.js`: dấu khớp Python (`d = e_AR² − e_RW²`; DM > 0 ⇒ RW tốt hơn).
- `probit.js`: link Φ, không dùng logit; train/test bỏ 1999.
- IRF shards: `data/irf/<preset>.json`.

## Single file

```powershell
node dashboard/scripts/build_single.js
```

Tạo `dist/index.single.html`. Bản single-file chỉ phù hợp cho shell tĩnh; dashboard đầy đủ vẫn nên chạy qua HTTP vì có workers/modules.
