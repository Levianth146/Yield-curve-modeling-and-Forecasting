/**
 * Công thức cốt lõi cho từng trang.
 * Mỗi ký hiệu được khai báo riêng trong `symbols` để phần “Trong đó”
 * luôn hiển thị một biến / một ý trên một dòng, thay vì một đoạn văn dài.
 */

export const FORMULAS = {
  ns: {
    vi: {
      title: "Mô hình Nelson–Siegel",
      tex: [
        String.raw`y_t(\tau)=L_t+S_t\left(\frac{1-e^{-\lambda\tau}}{\lambda\tau}\right)+C_t\left(\frac{1-e^{-\lambda\tau}}{\lambda\tau}-e^{-\lambda\tau}\right)+\varepsilon_t(\tau)`,
      ],
      symbols: [
        { sym: String.raw`y_t(\tau)`, meaning: "Lợi suất quan sát tại ngày <i>t</i> của kỳ hạn <i>τ</i> (tính bằng năm)." },
        { sym: String.raw`L_t`, meaning: "<b>Level</b> — mặt bằng lãi suất dài hạn của đường cong." },
        { sym: String.raw`S_t`, meaning: "<b>Slope</b> — độ dốc ngắn hạn so với dài hạn; S<sub>t</sub> = y(0) − y(∞)." },
        { sym: String.raw`C_t`, meaning: "<b>Curvature</b> — độ gồ/võng của đoạn kỳ hạn trung bình." },
        { sym: String.raw`\lambda`, meaning: "Tham số suy giảm, cố định ở 0,7308 (0,0609 nếu kỳ hạn đo bằng tháng; Diebold & Li, 2006)." },
        { sym: String.raw`\varepsilon_t(\tau)`, meaning: "Sai số khớp của mô hình tại kỳ hạn <i>τ</i>." },
      ],
      read: "Khi kỳ hạn tiến tới vô cùng, lợi suất tiến về L<sub>t</sub>; khi kỳ hạn tiến về 0, lợi suất tiến về L<sub>t</sub> + S<sub>t</sub>. Vì vậy S<sub>t</sub> âm tương ứng đường cong dốc lên, còn S<sub>t</sub> dương tương ứng đường cong đảo ngược. Hệ số tải của Curvature đạt cực đại tại τ* ≈ 1,793/λ ≈ 2,45 năm.",
    },
    en: {
      title: "The Nelson–Siegel model",
      tex: [
        String.raw`y_t(\tau)=L_t+S_t\left(\frac{1-e^{-\lambda\tau}}{\lambda\tau}\right)+C_t\left(\frac{1-e^{-\lambda\tau}}{\lambda\tau}-e^{-\lambda\tau}\right)+\varepsilon_t(\tau)`,
      ],
      symbols: [
        { sym: String.raw`y_t(\tau)`, meaning: "Observed yield on day <i>t</i> at maturity <i>τ</i> (years)." },
        { sym: String.raw`L_t`, meaning: "<b>Level</b> — the long-run level of the curve." },
        { sym: String.raw`S_t`, meaning: "<b>Slope</b> — the short-versus-long slope; S<sub>t</sub> = y(0) − y(∞)." },
        { sym: String.raw`C_t`, meaning: "<b>Curvature</b> — the hump or trough at medium maturities." },
        { sym: String.raw`\lambda`, meaning: "Decay parameter fixed at 0.7308 (0.0609 with maturities in months; Diebold & Li, 2006)." },
        { sym: String.raw`\varepsilon_t(\tau)`, meaning: "Fitting error at maturity <i>τ</i>." },
      ],
      read: "As maturity goes to infinity the yield tends to L<sub>t</sub>; as maturity goes to zero it tends to L<sub>t</sub> + S<sub>t</sub>. Negative S<sub>t</sub> therefore means an upward-sloping curve, while positive S<sub>t</sub> means an inverted one. The Curvature loading peaks at τ* ≈ 1.793/λ ≈ 2.45 years.",
    },
  },

  ar: {
    vi: {
      title: "Mô hình AR(p), Random Walk và kiểm định Diebold–Mariano",
      tex: [
        String.raw`F_t=c+\sum_{j=1}^{p}\phi_jF_{t-j}+\varepsilon_t,\qquad \hat F^{RW}_{t+h|t}=F_t`,
        String.raw`d_t=\big(e^{AR}_{t+h}\big)^2-\big(e^{RW}_{t+h}\big)^2,\qquad \mathrm{DM}=\frac{\bar d}{\sqrt{\hat\sigma_d^2/T_h}}`,
      ],
      symbols: [
        { sym: String.raw`F_t`, meaning: "Một trong ba nhân tố L<sub>t</sub>, S<sub>t</sub> hoặc C<sub>t</sub> tại tháng <i>t</i>." },
        { sym: String.raw`c`, meaning: "Hằng số của mô hình AR." },
        { sym: String.raw`\phi_j`, meaning: "Hệ số tự hồi quy tại độ trễ <i>j</i>." },
        { sym: String.raw`p`, meaning: "Số độ trễ, chọn theo BIC trên tập huấn luyện; tối đa 12 tháng." },
        { sym: String.raw`\hat F^{RW}_{t+h|t}`, meaning: "Dự báo Random Walk: giá trị tương lai bằng đúng giá trị hiện tại F<sub>t</sub>." },
        { sym: String.raw`e_{t+h}`, meaning: "Sai số dự báo trước <i>h</i> tháng." },
        { sym: String.raw`d_t`, meaning: "Chênh lệch sai số bình phương giữa AR và Random Walk." },
        { sym: String.raw`T_h`, meaning: "Số quan sát dự báo dùng trong kiểm định DM." },
      ],
      read: "DM âm nghĩa là AR có sai số nhỏ hơn; DM dương nghĩa là Random Walk tốt hơn. Chỉ khi p-value < 0,05 mới có bằng chứng rằng sai số của hai mô hình khác nhau có ý nghĩa thống kê. Đường sai số tích lũy là tổng dồn d<sub>t</sub> theo thời gian.",
    },
    en: {
      title: "AR(p), the random walk and the Diebold–Mariano test",
      tex: [
        String.raw`F_t=c+\sum_{j=1}^{p}\phi_jF_{t-j}+\varepsilon_t,\qquad \hat F^{RW}_{t+h|t}=F_t`,
        String.raw`d_t=\big(e^{AR}_{t+h}\big)^2-\big(e^{RW}_{t+h}\big)^2,\qquad \mathrm{DM}=\frac{\bar d}{\sqrt{\hat\sigma_d^2/T_h}}`,
      ],
      symbols: [
        { sym: String.raw`F_t`, meaning: "One of the L<sub>t</sub>, S<sub>t</sub> or C<sub>t</sub> factors in month <i>t</i>." },
        { sym: String.raw`c`, meaning: "AR intercept." },
        { sym: String.raw`\phi_j`, meaning: "Autoregressive coefficient at lag <i>j</i>." },
        { sym: String.raw`p`, meaning: "Lag length chosen by BIC on the training sample, up to 12 months." },
        { sym: String.raw`\hat F^{RW}_{t+h|t}`, meaning: "Random-walk forecast: the future value equals today’s F<sub>t</sub>." },
        { sym: String.raw`e_{t+h}`, meaning: "Forecast error at horizon <i>h</i>." },
        { sym: String.raw`d_t`, meaning: "Squared-error difference between AR and the random walk." },
        { sym: String.raw`T_h`, meaning: "Number of forecasts used in the DM statistic." },
      ],
      read: "A negative DM means AR has smaller errors; a positive DM favours the random walk. A p-value below 0.05 is required for a statistically significant difference. The cumulative-error line is the running sum of d<sub>t</sub>.",
    },
  },

  var: {
    vi: {
      title: "Mô hình VAR và hàm phản ứng xung",
      tex: [
        String.raw`Y_t=A_0+\sum_{i=1}^{p}A_iY_{t-i}+\varepsilon_t,\qquad Y_t=\big[\pi_t,\ FF_t,\ L_t,\ S_t,\ C_t\big]'`,
      ],
      symbols: [
        { sym: String.raw`Y_t`, meaning: "Véc-tơ gồm lạm phát, lãi suất Fed và ba nhân tố Nelson–Siegel." },
        { sym: String.raw`\pi_t`, meaning: "Lạm phát tháng quy năm; cắt 2% giá trị cực đoan ở mỗi đầu phân phối." },
        { sym: String.raw`FF_t`, meaning: "Lãi suất Quỹ Liên bang (Federal Funds Rate)." },
        { sym: String.raw`L_t`, meaning: "Nhân tố Level của đường cong lợi suất." },
        { sym: String.raw`S_t`, meaning: "Nhân tố Slope của đường cong lợi suất." },
        { sym: String.raw`C_t`, meaning: "Nhân tố Curvature của đường cong lợi suất." },
        { sym: String.raw`A_i`, meaning: "Ma trận hệ số của VAR tại độ trễ <i>i</i>." },
        { sym: String.raw`\varepsilon_t`, meaning: "Véc-tơ phần dư/cú sốc chưa được giải thích bởi các độ trễ." },
        { sym: String.raw`p`, meaning: "Độ trễ chính bằng 4; chọn theo AIC trong nhóm mô hình vượt kiểm định Portmanteau." },
      ],
      read: "IRF cho biết mỗi biến lệch bao nhiêu so với kịch bản không có cú sốc sau <i>h</i> tháng khi một biến chịu cú sốc bất ngờ bằng một độ lệch chuẩn. Nhận diện Cholesky mặc định theo thứ tự lạm phát → lãi suất Fed → L → S → C; đây là giả định nhận diện nên dashboard cho phép so sánh các thứ tự khác.",
    },
    en: {
      title: "The VAR model and impulse responses",
      tex: [
        String.raw`Y_t=A_0+\sum_{i=1}^{p}A_iY_{t-i}+\varepsilon_t,\qquad Y_t=\big[\pi_t,\ FF_t,\ L_t,\ S_t,\ C_t\big]'`,
      ],
      symbols: [
        { sym: String.raw`Y_t`, meaning: "Vector containing inflation, the Fed rate and the three Nelson–Siegel factors." },
        { sym: String.raw`\pi_t`, meaning: "Annualised monthly inflation, winsorised at 2% in each tail." },
        { sym: String.raw`FF_t`, meaning: "Federal Funds Rate." },
        { sym: String.raw`L_t`, meaning: "Yield-curve Level factor." },
        { sym: String.raw`S_t`, meaning: "Yield-curve Slope factor." },
        { sym: String.raw`C_t`, meaning: "Yield-curve Curvature factor." },
        { sym: String.raw`A_i`, meaning: "VAR coefficient matrix at lag <i>i</i>." },
        { sym: String.raw`\varepsilon_t`, meaning: "Residual / unexpected shock vector." },
        { sym: String.raw`p`, meaning: "Main lag length is 4, selected by AIC among models passing the Portmanteau test." },
      ],
      read: "An IRF shows how far each variable moves from the no-shock path after an unexpected one-standard-deviation shock. The default Cholesky ordering is inflation → Fed rate → L → S → C; because this is an identifying assumption, the dashboard also shows alternative orderings.",
    },
  },

  probit: {
    vi: {
      title: "Mô hình Probit dự báo suy thoái",
      tex: [
        String.raw`P\big(R_{t+1:t+12}=1\mid \mathit{Spread}_t\big)=\Phi\big(\alpha+\beta\,\mathit{Spread}_t\big)`,
        String.raw`\mathrm{BSS}=1-\frac{\mathrm{Brier}_{\text{Probit}}}{\mathrm{Brier}_{\text{đối chứng}}}`,
      ],
      symbols: [
        { sym: String.raw`R_{t+1:t+12}`, meaning: "Bằng 1 nếu có ít nhất một tháng suy thoái NBER trong 12 tháng tiếp theo." },
        { sym: String.raw`\mathit{Spread}_t`, meaning: "Chênh lệch lợi suất 10 năm − 2 năm tại tháng <i>t</i>." },
        { sym: String.raw`\alpha`, meaning: "Hằng số của mô hình Probit." },
        { sym: String.raw`\beta`, meaning: "Hệ số của spread; β âm nghĩa là spread thấp hơn gắn với rủi ro suy thoái cao hơn." },
        { sym: String.raw`\Phi`, meaning: "Hàm phân phối tích lũy của phân phối chuẩn tắc." },
        { sym: String.raw`\mathrm{Brier}`, meaning: "Trung bình bình phương chênh lệch giữa xác suất dự báo và kết quả thực tế." },
        { sym: String.raw`\mathrm{BSS}`, meaning: "Brier Skill Score; BSS âm nghĩa là mô hình kém hơn dự báo tần suất nền." },
      ],
      read: "AUC đo khả năng xếp hạng rủi ro (0,5 tương đương ngẫu nhiên), còn BSS đánh giá mức xác suất dự báo có chính xác hơn mô hình đối chứng hay không. Hai thước đo trả lời hai câu hỏi khác nhau nên cần đọc cùng nhau.",
    },
    en: {
      title: "The recession Probit model",
      tex: [
        String.raw`P\big(R_{t+1:t+12}=1\mid \mathit{Spread}_t\big)=\Phi\big(\alpha+\beta\,\mathit{Spread}_t\big)`,
        String.raw`\mathrm{BSS}=1-\frac{\mathrm{Brier}_{\text{Probit}}}{\mathrm{Brier}_{\text{benchmark}}}`,
      ],
      symbols: [
        { sym: String.raw`R_{t+1:t+12}`, meaning: "Equals 1 if at least one NBER recession month occurs in the next 12 months." },
        { sym: String.raw`\mathit{Spread}_t`, meaning: "10-year minus 2-year Treasury yield spread in month <i>t</i>." },
        { sym: String.raw`\alpha`, meaning: "Probit intercept." },
        { sym: String.raw`\beta`, meaning: "Spread coefficient; a negative β links lower spreads to higher recession risk." },
        { sym: String.raw`\Phi`, meaning: "Standard normal cumulative distribution function." },
        { sym: String.raw`\mathrm{Brier}`, meaning: "Mean squared difference between forecast probabilities and outcomes." },
        { sym: String.raw`\mathrm{BSS}`, meaning: "Brier Skill Score; negative values are worse than the base-rate benchmark." },
      ],
      read: "AUC measures ranking ability (0.5 = chance), while BSS tests whether the probability levels themselves improve on the benchmark. They answer different questions and should be read together.",
    },
  },

  vn: {
    vi: {
      title: "Nelson–Siegel cho đường cong Việt Nam",
      tex: [String.raw`\lambda_{VN}=\arg\min_{\lambda}\ \overline{\mathrm{RMSE}}(\lambda)`],
      symbols: [
        { sym: String.raw`\lambda_{VN}`, meaning: "Giá trị λ cho sai số khớp trung bình nhỏ nhất trên dữ liệu Việt Nam." },
        { sym: String.raw`\overline{\mathrm{RMSE}}(\lambda)`, meaning: "RMSE trung bình của mô hình Nelson–Siegel ứng với từng λ." },
        { sym: String.raw`\lambda\in[0.2,2.0]`, meaning: "Khoảng dò λ dùng trong grid search." },
        { sym: String.raw`\tau`, meaning: "7 kỳ hạn trái phiếu Chính phủ từ 1 đến 15 năm." },
      ],
      read: "Mô hình Nelson–Siegel giữ nguyên dạng như với Mỹ, nhưng λ được chọn riêng trên mẫu Việt Nam. Việc λ nội mẫu khớp tốt hơn không tự chứng minh hai thị trường giống nhau; mức độ giống nhau được đánh giá tiếp bằng tương quan giữa các nhân tố, cả theo mức và theo thay đổi hằng tháng.",
    },
    en: {
      title: "Nelson–Siegel for the Vietnam curve",
      tex: [String.raw`\lambda_{VN}=\arg\min_{\lambda}\ \overline{\mathrm{RMSE}}(\lambda)`],
      symbols: [
        { sym: String.raw`\lambda_{VN}`, meaning: "Decay value with the lowest average fitting error on Vietnam data." },
        { sym: String.raw`\overline{\mathrm{RMSE}}(\lambda)`, meaning: "Average Nelson–Siegel fitting RMSE for each λ." },
        { sym: String.raw`\lambda\in[0.2,2.0]`, meaning: "Grid-search interval for λ." },
        { sym: String.raw`\tau`, meaning: "Seven Vietnamese government-bond maturities from 1 to 15 years." },
      ],
      read: "The Nelson–Siegel functional form is unchanged, but λ is selected separately for Vietnam. A better in-sample λ does not by itself show that the two markets behave alike; similarity is assessed separately through factor correlations in levels and monthly changes.",
    },
  },
};

export function formulaFor(id, lang) {
  const block = FORMULAS[id];
  if (!block) return null;
  return block[lang] || block.vi;
}
