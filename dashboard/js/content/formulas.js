/** LaTeX + copy for formula cards (§5). Keys: ns, ar, var, probit, vn */

export const FORMULAS = {
  ns: {
    vi: {
      title: "Công thức Nelson–Siegel",
      tex: [
        String.raw`y_t(\tau)=\beta_{0,t}+\beta_{1,t}\,\frac{1-e^{-\lambda\tau}}{\lambda\tau}+\beta_{2,t}\left(\frac{1-e^{-\lambda\tau}}{\lambda\tau}-e^{-\lambda\tau}\right)`,
        String.raw`\hat{\boldsymbol\beta}_t=\arg\min_{\boldsymbol\beta}\sum_{i=1}^{N}\big(y_t(\tau_i)-\beta_0-\beta_1 f_1(\tau_i)-\beta_2 f_2(\tau_i)\big)^2`,
      ],
      symbols: [
        { sym: String.raw`y_t(\tau)`, meaning: "Lợi suất kỳ hạn τ (năm) vào ngày t" },
        { sym: String.raw`\beta_0`, meaning: "Level — mức dài hạn mà đường cong tiến tới" },
        { sym: String.raw`\beta_1`, meaning: "Slope — ngắn hạn trừ dài hạn: y(0)−y(∞). Âm = dốc lên; dương = đảo ngược" },
        { sym: String.raw`\beta_2`, meaning: "Curvature — độ võng ở kỳ hạn trung" },
        { sym: String.raw`\lambda`, meaning: "Tốc độ suy giảm; đề án dùng 0.7308 (= 0.0609×12)" },
      ],
      read: "y(0)=β₀+β₁ và y(∞)=β₀ nên β₁ = y(0)−y(∞). f₂ đạt cực đại gần τ* ≈ 1.793/λ (≈ 2.45 năm khi λ = 0.7308).",
    },
    en: {
      title: "Nelson–Siegel formula",
      tex: [
        String.raw`y_t(\tau)=\beta_{0,t}+\beta_{1,t}\,\frac{1-e^{-\lambda\tau}}{\lambda\tau}+\beta_{2,t}\left(\frac{1-e^{-\lambda\tau}}{\lambda\tau}-e^{-\lambda\tau}\right)`,
        String.raw`\hat{\boldsymbol\beta}_t=\arg\min_{\boldsymbol\beta}\sum_{i=1}^{N}\big(y_t(\tau_i)-\beta_0-\beta_1 f_1(\tau_i)-\beta_2 f_2(\tau_i)\big)^2`,
      ],
      symbols: [
        { sym: String.raw`y_t(\tau)`, meaning: "Yield at maturity τ (years) on day t" },
        { sym: String.raw`\beta_0`, meaning: "Level — long-run level the curve approaches" },
        { sym: String.raw`\beta_1`, meaning: "Slope — short minus long: y(0)−y(∞). Negative = upward; positive = inverted" },
        { sym: String.raw`\beta_2`, meaning: "Curvature — mid-maturity hump" },
        { sym: String.raw`\lambda`, meaning: "Decay; project uses 0.7308 (= 0.0609×12)" },
      ],
      read: "y(0)=β₀+β₁ and y(∞)=β₀ so β₁ = y(0)−y(∞). f₂ peaks near τ* ≈ 1.793/λ (≈ 2.45 years at λ = 0.7308).",
    },
  },
  ar: {
    vi: {
      title: "AR, random walk và Diebold–Mariano",
      tex: [
        String.raw`\text{AR}(p):\ y_t=c+\sum_{i=1}^{p}\varphi_i y_{t-i}+\varepsilon_t,\quad \text{RW}:\ \hat y^{RW}_{t+h|t}=y_t`,
        String.raw`d_t=(e^{AR}_t)^2-(e^{RW}_t)^2,\quad \mathrm{DM}=\bar d/\sqrt{\hat V/n}`,
        String.raw`\mathrm{CSFE}_T=\sum_{t\le T}\big[(e^{RW}_t)^2-(e^{AR}_t)^2\big]`,
      ],
      symbols: [
        { sym: String.raw`p^*`, meaning: "Độ trễ chọn bằng BIC (tối đa 12)" },
        { sym: String.raw`e^{M}`, meaning: "Sai số dự báo của mô hình M" },
        { sym: String.raw`\mathrm{DM}`, meaning: "Thống kê Diebold–Mariano (có hiệu chỉnh HLN khi h>1)" },
        { sym: String.raw`\mathrm{CSFE}`, meaning: "Tích lũy chênh lệch sai số bình phương" },
      ],
      read: "DM > 0 ⇒ AR có sai số lớn hơn ⇒ random walk tốt hơn; DM < 0 ⇒ AR tốt hơn. p là kiểm định hai phía.",
    },
    en: {
      title: "AR, random walk and Diebold–Mariano",
      tex: [
        String.raw`\text{AR}(p):\ y_t=c+\sum_{i=1}^{p}\varphi_i y_{t-i}+\varepsilon_t,\quad \text{RW}:\ \hat y^{RW}_{t+h|t}=y_t`,
        String.raw`d_t=(e^{AR}_t)^2-(e^{RW}_t)^2,\quad \mathrm{DM}=\bar d/\sqrt{\hat V/n}`,
        String.raw`\mathrm{CSFE}_T=\sum_{t\le T}\big[(e^{RW}_t)^2-(e^{AR}_t)^2\big]`,
      ],
      symbols: [
        { sym: String.raw`p^*`, meaning: "Lag chosen by BIC (max 12)" },
        { sym: String.raw`e^{M}`, meaning: "Forecast error of model M" },
        { sym: String.raw`\mathrm{DM}`, meaning: "Diebold–Mariano statistic (HLN when h>1)" },
        { sym: String.raw`\mathrm{CSFE}`, meaning: "Cumulative squared-error gap" },
      ],
      read: "DM > 0 ⇒ AR has larger errors ⇒ random walk wins; DM < 0 ⇒ AR wins. Two-sided p-value.",
    },
  },
  var: {
    vi: {
      title: "VAR, Cholesky và hàm phản ứng xung",
      tex: [
        String.raw`\mathbf{y}_t=\mathbf c+\sum_{i=1}^{p}A_i\mathbf y_{t-i}+\mathbf u_t,\quad \Sigma_u=PP'`,
        String.raw`\mathrm{IRF}(h)=\Phi_h\,P\,\mathbf e_j\quad(\text{cú sốc }+1\sigma\text{ của biến }j)`,
      ],
      symbols: [
        { sym: String.raw`P`, meaning: "Ma trận tam giác dưới Cholesky — thứ tự biến là giả định nhận diện" },
        { sym: String.raw`\mathrm{IRF}`, meaning: "Đường phản ứng sau cú sốc chuẩn hóa" },
        { sym: String.raw`Q_H`, meaning: "Portmanteau: p > 0.05 ⇒ không bác bỏ phần dư trắng" },
      ],
      read: "Biến xếp trước tác động tức thì lên biến xếp sau trong tháng; ngược lại chỉ sau một tháng. Slope tăng nghĩa là ngắn hạn tăng nhiều hơn dài hạn (đường cong bớt dốc).",
    },
    en: {
      title: "VAR, Cholesky and impulse responses",
      tex: [
        String.raw`\mathbf{y}_t=\mathbf c+\sum_{i=1}^{p}A_i\mathbf y_{t-i}+\mathbf u_t,\quad \Sigma_u=PP'`,
        String.raw`\mathrm{IRF}(h)=\Phi_h\,P\,\mathbf e_j\quad(+1\sigma\text{ shock to variable }j)`,
      ],
      symbols: [
        { sym: String.raw`P`, meaning: "Lower-triangular Cholesky — order is an identifying assumption" },
        { sym: String.raw`\mathrm{IRF}`, meaning: "Response path after a unit structural shock" },
        { sym: String.raw`Q_H`, meaning: "Portmanteau: p > 0.05 ⇒ fail to reject white residuals" },
      ],
      read: "Variables ordered earlier affect later ones within the month. A rise in Slope means short rates rise more than long rates (curve flattens).",
    },
  },
  probit: {
    vi: {
      title: "Probit suy thoái",
      tex: [
        String.raw`R_t^{(12)}=\mathbf 1\{\exists m\in[t+1,t+12]:\mathrm{NBER}_m=1\}`,
        String.raw`\Pr(R_t^{(12)}=1\mid s_t)=\Phi(\beta_0+\beta_1 s_t)`,
        String.raw`\mathrm{BSS}=1-B/B_0,\quad \mathrm{AUC}=\Pr(\hat p_{pos}>\hat p_{neg})`,
      ],
      symbols: [
        { sym: String.raw`s_t`, meaning: "Spread 10 năm − 2 năm" },
        { sym: String.raw`\Phi`, meaning: "Hàm phân phối chuẩn tắc (không phải logit)" },
        { sym: String.raw`\mathrm{BSS}`, meaning: "Âm ⇒ kém hơn dự báo luôn bằng tần suất nền huấn luyện" },
        { sym: String.raw`\mathrm{AUC}`, meaning: "0.5 = đoán bừa; 1 = xếp hạng hoàn hảo" },
      ],
      read: "AUC hỏi khả năng xếp hạng; BSS hỏi xác suất con số có sát thực tế không.",
    },
    en: {
      title: "Recession probit",
      tex: [
        String.raw`R_t^{(12)}=\mathbf 1\{\exists m\in[t+1,t+12]:\mathrm{NBER}_m=1\}`,
        String.raw`\Pr(R_t^{(12)}=1\mid s_t)=\Phi(\beta_0+\beta_1 s_t)`,
        String.raw`\mathrm{BSS}=1-B/B_0,\quad \mathrm{AUC}=\Pr(\hat p_{pos}>\hat p_{neg})`,
      ],
      symbols: [
        { sym: String.raw`s_t`, meaning: "10Y − 2Y spread" },
        { sym: String.raw`\Phi`, meaning: "Standard normal CDF (not logit)" },
        { sym: String.raw`\mathrm{BSS}`, meaning: "Negative ⇒ worse than always forecasting the training base rate" },
        { sym: String.raw`\mathrm{AUC}`, meaning: "0.5 = chance; 1 = perfect ranking" },
      ],
      read: "AUC asks about ranking; BSS asks whether probability levels are calibrated.",
    },
  },
  vn: {
    vi: {
      title: "Nelson–Siegel trên đường cong Việt Nam",
      tex: [
        String.raw`\lambda_{VN}=\arg\min_\lambda \overline{\mathrm{RMSE}}(\lambda)`,
        String.raw`\rho_k=\mathrm{corr}(\beta_{k,t}^{VN},\beta_{k,t}^{US}),\quad \rho_k^{\Delta}=\mathrm{corr}(\Delta\beta_k^{VN},\Delta\beta_k^{US})`,
      ],
      symbols: [
        { sym: String.raw`\lambda_{VN}`, meaning: "λ tối ưu trên lưới, trung bình RMSE mọi ngày (7 kỳ hạn)" },
        { sym: String.raw`\rho_k`, meaning: "Tương quan nhân tố VN–Mỹ theo mức (cùng λ = 0.7308)" },
        { sym: String.raw`\rho_k^{\Delta}`, meaning: "Tương quan theo thay đổi tháng" },
      ],
      read: "Fit tốt hơn ở λ_VN trên chính mẫu VN là điều hiển nhiên; không suy ra VN hành xử như Mỹ.",
    },
    en: {
      title: "Nelson–Siegel on the Vietnam curve",
      tex: [
        String.raw`\lambda_{VN}=\arg\min_\lambda \overline{\mathrm{RMSE}}(\lambda)`,
        String.raw`\rho_k=\mathrm{corr}(\beta_{k,t}^{VN},\beta_{k,t}^{US}),\quad \rho_k^{\Delta}=\mathrm{corr}(\Delta\beta_k^{VN},\Delta\beta_k^{US})`,
      ],
      symbols: [
        { sym: String.raw`\lambda_{VN}`, meaning: "Grid-optimal λ by mean daily RMSE (7 mats)" },
        { sym: String.raw`\rho_k`, meaning: "VN–US factor correlation in levels (shared λ = 0.7308)" },
        { sym: String.raw`\rho_k^{\Delta}`, meaning: "Correlation in monthly changes" },
      ],
      read: "A better in-sample fit at λ_VN is expected; it does not imply US-like behaviour.",
    },
  },
};

export function formulaFor(id, lang) {
  const block = FORMULAS[id];
  if (!block) return null;
  return block[lang] || block.vi;
}
