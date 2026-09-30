/** Page copy (vi) — §3. Fill `{key}` via `fill(template, vars)`. */

export function fill(tpl, vars = {}) {
  return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
}

export const pages = {
  today: {
    meaning: [
      "Dốc lên: lãi suất dài hạn cao hơn ngắn hạn — nhà đầu tư đòi bù kỳ hạn.",
      "Phẳng: chênh lệch gần 0.",
      "Đảo ngược: dài hạn thấp hơn ngắn hạn — thường gắn kỳ vọng nới lỏng / suy thoái.",
    ],
    confidence: "Số liệu là lợi suất Kho bạc Mỹ do FRED công bố; đường liền là Nelson–Siegel khớp trên 10 kỳ hạn (sai số trung bình {rmse} bp).",
    limits: "<ul><li>Trang này chỉ mô tả, không dự báo lợi suất.</li><li>Chấm là quan sát; đường liền là mô hình.</li><li>Probit BSS âm nên mức % không phải xác suất chuẩn.</li></ul>",
  },
  curve: {
    whyLambda: "Diebold–Li (2006) cố định λ = 0.0609 cho kỳ hạn tính bằng tháng; đổi sang năm: 0.0609 × 12 = 0.7308. Với λ này Curvature đạt cực đại gần {tauStar} năm.",
    limits: "<ul><li>Fit đẹp ≠ dự báo tốt (xem Dự báo).</li><li>DGS1MO không dùng để fit; mỗi ngày cần ≥ 9/10 kỳ hạn.</li><li>Chuỗi tháng lấy ngày giao dịch hợp lệ cuối tháng.</li></ul>",
  },
  arena: {
    readChart: "Đường CSFE đi xuống nghĩa là AR liên tục tích lũy thêm sai số so với random walk.",
    limits: "<ul><li>Một điểm chia mẫu.</li><li>RMSE ≠ giá trị kinh tế.</li><li>Không hiệu chỉnh đa kiểm định (Bonferroni: 0.05/12 = 0.0042).</li></ul>",
  },
  irf: {
    cholesky: "VAR cho mỗi biến phụ thuộc vào quá khứ của tất cả biến. Cholesky giả định biến xếp trước tác động lên biến xếp sau ngay trong tháng; ngược lại chỉ sau một tháng — thứ tự là giả định nhận diện.",
    limits: "<ul><li>Không chứng minh nhân quả.</li><li>Mẫu ~315 tháng.</li><li>Đổi thứ tự có thể đổi dấu ở biến ít liên quan.</li><li>IRF của biến sai phân được cộng dồn để đọc về mức gốc.</li></ul>",
  },
  probit: {
    limits: "<ul><li>Nhãn NBER công bố sau sự kiện.</li><li>Ít đợt suy thoái trong mẫu huấn luyện.</li><li>Hai biến thể (dummy, 10Y−3M) chỉ có số đóng băng.</li></ul>",
  },
  vietnam: {
    data: "Nguồn Investing.com, giá tham khảo, không phải đường cong chính thức HNX/VBMA; 7 kỳ hạn 1–15Y.",
    limits: "<ul><li>Không so sánh mức tuyệt đối VN–Mỹ.</li><li>λ của VN chọn trên chính mẫu này nên fit tốt hơn là điều hiển nhiên.</li><li>Nhiều ngày lợi suất đứng nguyên.</li></ul>",
  },
  summary: {
    body: "Mỗi thẻ tính lại từ dữ liệu dashboard. “Mỏng manh” = đúng ở cấu hình đề án nhưng yếu khi đổi đặc tả lân cận.",
  },
};

export default pages;
