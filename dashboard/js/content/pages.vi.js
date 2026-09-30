/** Nội dung chữ tiếng Việt của từng trang (ô "Nghĩa là gì / Độ tin cậy / Giới hạn"). Điền `{key}` bằng `fill(template, vars)`. */

export function fill(tpl, vars = {}) {
  return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
}

export const pages = {
  today: {
    meaning: [
      "Đường cong dốc lên: lợi suất dài hạn cao hơn ngắn hạn, do nhà đầu tư đòi phần bù khi cho vay dài hạn.",
      "Đường cong phẳng: chênh lệch giữa dài hạn và ngắn hạn gần bằng 0.",
      "Đường cong đảo ngược: lợi suất dài hạn thấp hơn ngắn hạn, thường phản ánh kỳ vọng lãi suất sẽ giảm và có liên hệ với nguy cơ suy thoái.",
    ],
    confidence: "Số liệu là lợi suất trái phiếu Kho bạc Mỹ do FRED công bố. Đường liền là đường cong Nelson–Siegel ước lượng trên 10 kỳ hạn, với sai số khớp trong ngày là {rmse} bp.",
    limits: "<ul><li>Trang này chỉ mô tả hiện trạng, không dự báo lợi suất.</li><li>Chấm tròn là lợi suất quan sát; đường liền là đường cong mô hình.</li><li>Xác suất suy thoái từ mô hình Probit nên được đọc như mức độ rủi ro tương đối, vì mô hình chưa dự báo xác suất chính xác hơn mô hình đối chứng (BSS âm).</li></ul>",
  },
  curve: {
    whyLambda: "Diebold và Li (2006) cố định λ = 0,0609 khi kỳ hạn đo bằng tháng; quy đổi sang năm được 0,0609 × 12 = 0,7308. Với giá trị này, hệ số tải của Curvature đạt cực đại tại khoảng {tauStar} năm.",
    limits: "<ul><li>Mô hình khớp tốt với dữ liệu hiện tại chưa có nghĩa là dự báo tốt (xem trang Dự báo).</li><li>Kỳ hạn 1 tháng không được dùng khi ước lượng; mỗi ngày cần ít nhất 9 trong 10 kỳ hạn có dữ liệu.</li><li>Chuỗi tháng lấy giá trị của ngày giao dịch hợp lệ cuối cùng trong tháng.</li></ul>",
  },
  arena: {
    readChart: "Đường sai số tích lũy đi xuống nghĩa là AR liên tục có sai số lớn hơn Random Walk trong giai đoạn đó.",
    limits: "<ul><li>Kết quả phụ thuộc vào thời điểm chia mẫu huấn luyện và kiểm định.</li><li>Sai số dự báo nhỏ hơn chưa chắc mang lại giá trị kinh tế.</li><li>Khi so sánh cùng lúc 12 ô, một vài ô có thể có p dưới 0,05 do ngẫu nhiên; với hiệu chỉnh Bonferroni, ngưỡng tương ứng là 0,05/12 ≈ 0,004.</li></ul>",
  },
  irf: {
    cholesky: "Trong mô hình VAR, mỗi biến phụ thuộc vào giá trị quá khứ của tất cả các biến. Phân rã Cholesky giả định biến đứng trước được phép tác động tức thời lên biến đứng sau trong cùng tháng, còn chiều ngược lại chỉ xảy ra từ tháng sau; thứ tự biến vì vậy là một giả định nhận diện.",
    limits: "<ul><li>Hàm phản ứng xung không chứng minh quan hệ nhân quả.</li><li>Mẫu ước lượng gồm khoảng 315 tháng.</li><li>Đổi thứ tự Cholesky có thể làm thay đổi kết quả, đặc biệt khi các nhân tố của đường cong được đặt trước các biến vĩ mô.</li><li>Với biến được lấy sai phân, phản ứng được cộng dồn để đọc theo mức gốc.</li></ul>",
  },
  probit: {
    limits: "<ul><li>Các mốc suy thoái của NBER được công bố sau khi sự kiện đã xảy ra.</li><li>Tập huấn luyện chỉ chứa ba cuộc suy thoái, nên số quan sát độc lập ít.</li><li>Hai biến thể (biến giả đảo ngược và chênh lệch 10 năm − 3 tháng) được hiển thị theo kết quả đã tính sẵn, không thay đổi theo thanh điều khiển.</li></ul>",
  },
  vietnam: {
    data: "Nguồn Investing.com, giá tham khảo, không phải đường cong chính thức của HNX hay VBMA; 7 kỳ hạn từ 1 đến 15 năm.",
    limits: "<ul><li>Không so sánh mức lợi suất tuyệt đối giữa Việt Nam và Mỹ, vì hai đường cong có dải kỳ hạn khác nhau.</li><li>λ của Việt Nam được chọn trên chính mẫu Việt Nam, nên việc khớp tốt hơn λ của Mỹ là điều đương nhiên.</li><li>Nhiều ngày có lợi suất không thay đổi so với ngày trước, đặc biệt từ năm 2024.</li></ul>",
  },
  summary: {
    body: "Mỗi thẻ được tính lại trực tiếp từ dữ liệu của dashboard. “Kết luận vững” nghĩa là kết luận đúng ở cấu hình của đề án và vẫn đúng khi thay đổi các lựa chọn mô hình lân cận; “Kết luận chưa vững” nghĩa là kết luận đúng ở cấu hình của đề án nhưng thay đổi khi đổi lựa chọn mô hình, hoặc mẫu quá nhỏ. Căn cứ cụ thể của từng thẻ được ghi ngay bên dưới.",
  },
};

export default pages;
