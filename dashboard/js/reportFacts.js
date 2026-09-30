/* Số liệu đã đóng băng từ báo cáo (docs/report/report.md, outputs/*.json). Dùng cho phần sổ kết luận
   khi dashboard không tự tính lại được (ví dụ NLS λ tự do). Nguồn ghi ở từng khóa. */
export const REPORT = {
  // outputs/rq1_ols_vs_nls_summary.json — 268 ngày phân tầng, NLS L-BFGS-B có biên
  nls: { n: 268, corrLevel: 0.365, corrSlope: 0.554, corrCurv: 0.312, rmseOls: 9.27, rmseNls: 5.12, lamMedian: 0.4505 },
};

// NBER trước 2000 (ngày công bố công khai) — data/recessions.json chỉ chứa các đợt từ 2001.
export const NBER_PRE2000 = [
  { start: "1980-01-01", end: "1980-07-01" },
  { start: "1981-07-01", end: "1982-11-01" },
  { start: "1990-07-01", end: "1991-03-01" },
];
