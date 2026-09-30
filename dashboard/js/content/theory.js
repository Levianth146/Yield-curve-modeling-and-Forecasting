/**
 * Cơ sở lý thuyết của trang Tổng quan.
 * Thiết kế theo hierarchy thay vì sáu card ngang hàng:
 * 1) nền tảng -> 2) mô hình -> 3) ba nhân tố -> 4) fit/spread -> 5) roadmap.
 */
import { el } from "../ui/kit.js";
import { math } from "../ui/math.js";
import { fill } from "./pages.vi.js";

const COPY = {
  vi: {
    heading: "Cơ sở lý thuyết",
    sub: "Đọc từ trên xuống: đường cong lợi suất → Nelson–Siegel → ba nhân tố → cách đánh giá → chuỗi phân tích của đề án.",
    a1: {
      tag: "A1",
      title: "Đường cong lợi suất nói lên điều gì?",
      body: "Đường cong lợi suất biểu diễn lợi suất trái phiếu Kho bạc Mỹ theo kỳ hạn tại cùng một thời điểm. Lợi suất dài hạn phản ánh kỳ vọng về lãi suất ngắn hạn tương lai cùng phần bù kỳ hạn, vì vậy hình dạng đường cong mang thông tin về chính sách tiền tệ, lạm phát và triển vọng kinh tế.",
    },
    a2: {
      tag: "A2",
      title: "Nelson–Siegel: rút cả đường cong về ba nhân tố",
      lead: "Thay vì theo dõi riêng 10 mức lợi suất, Nelson–Siegel (1987) mô tả toàn bộ đường cong bằng Level, Slope và Curvature.",
      tex: String.raw`y_t(\tau)=L_t+S_t\left(\frac{1-e^{-\lambda\tau}}{\lambda\tau}\right)+C_t\left(\frac{1-e^{-\lambda\tau}}{\lambda\tau}-e^{-\lambda\tau}\right)+\varepsilon_t(\tau)`,
      symbols: [
        [String.raw`y_t(\tau)`, "Lợi suất ngày <i>t</i> tại kỳ hạn <i>τ</i>."],
        [String.raw`L_t`, "Level — mặt bằng lãi suất dài hạn."],
        [String.raw`S_t`, "Slope — độ dốc ngắn hạn so với dài hạn."],
        [String.raw`C_t`, "Curvature — độ gồ/võng ở kỳ hạn trung bình."],
        [String.raw`\lambda`, "Tham số suy giảm; đề án cố định ở 0,7308."],
        [String.raw`\varepsilon_t(\tau)`, "Sai số khớp tại kỳ hạn <i>τ</i>."],
      ],
    },
    a3: {
      tag: "A3",
      title: "Ba nhân tố được đọc như thế nào?",
      factors: [
        { key: "L", name: "Level", body: "Mức lãi suất dài hạn", detail: "y(∞) = Lₜ", value: "{level}" },
        { key: "S", name: "Slope", body: "Ngắn hạn − dài hạn", detail: "Sₜ = y(0) − y(∞)", value: "{slope}" },
        { key: "C", name: "Curvature", body: "Độ cong đoạn giữa", detail: "đỉnh tải ≈ 2,45 năm", value: "{curv}" },
      ],
      note: "Ngày {date}: Slope âm tương ứng đường cong dốc lên; Slope dương tương ứng đường cong đảo ngược.",
    },
    a4: {
      tag: "A4",
      title: "Độ khớp được kiểm tra bằng RMSE",
      lead: "Với λ cố định, ba nhân tố được ước lượng bằng OLS cho từng ngày. Sai số khớp được tóm tắt bằng RMSE.",
      tex: String.raw`\mathrm{RMSE}_t=\sqrt{\frac{1}{N_t}\sum_{i=1}^{N_t}\big(y_t(\tau_i)-\hat y_t(\tau_i)\big)^2}`,
      foot: "RMSE hiện tại: <b>{rmse} bp</b>. Giá trị càng nhỏ, đường Nelson–Siegel càng bám sát các lợi suất quan sát.",
    },
    a5: {
      tag: "A5",
      title: "Hình dạng đường cong được kiểm tra thêm bằng spread",
      lead: "Spread 10Y−2Y là số quan sát trực tiếp, độc lập với cách diễn giải Slope của Nelson–Siegel.",
      tex: String.raw`\mathit{Spread}_t=y_t(10\text{ năm})-y_t(2\text{ năm})`,
      states: [
        ["Spread > 0", "Dốc lên", "Lợi suất dài hạn cao hơn ngắn hạn."],
        ["Spread ≈ 0", "Phẳng", "Chênh lệch dài–ngắn rất nhỏ."],
        ["Spread < 0", "Đảo ngược", "Lợi suất ngắn hạn cao hơn dài hạn."],
      ],
      foot: "Hôm nay 10Y−2Y = <b>{spread} điểm %</b>.",
    },
    a6: {
      tag: "A6",
      title: "Từ lý thuyết đến các câu hỏi nghiên cứu",
      steps: [
        ["02", "Nhân tố", "Nelson–Siegel có mô tả tốt đường cong không?"],
        ["03", "Dự báo", "AR có dự báo tốt hơn Random Walk không?"],
        ["04", "Cú sốc Fed", "Fed và lạm phát làm đường cong phản ứng ra sao?"],
        ["05", "Suy thoái", "Đảo ngược có báo trước suy thoái không?"],
      ],
      foot: "Trang Việt Nam áp dụng cùng khung phương pháp như một phần mở rộng.",
    },
  },
  en: {
    heading: "Theoretical background",
    sub: "Read top to bottom: yield curve → Nelson–Siegel → three factors → diagnostics → the project’s analysis chain.",
    a1: { tag: "A1", title: "What does the yield curve tell us?", body: "The yield curve plots US Treasury yields by maturity at one point in time. Long yields reflect expectations of future short rates plus a term premium, so the curve carries information about monetary policy, inflation and the economic outlook." },
    a2: {
      tag: "A2", title: "Nelson–Siegel: compressing the curve into three factors", lead: "Rather than tracking 10 yields separately, Nelson and Siegel (1987) represent the curve with Level, Slope and Curvature.",
      tex: String.raw`y_t(\tau)=L_t+S_t\left(\frac{1-e^{-\lambda\tau}}{\lambda\tau}\right)+C_t\left(\frac{1-e^{-\lambda\tau}}{\lambda\tau}-e^{-\lambda\tau}\right)+\varepsilon_t(\tau)`,
      symbols: [[String.raw`y_t(\tau)`, "Yield on day <i>t</i> at maturity <i>τ</i>."], [String.raw`L_t`, "Level — long-run yield level."], [String.raw`S_t`, "Slope — short minus long end."], [String.raw`C_t`, "Curvature — the medium-maturity hump/trough."], [String.raw`\lambda`, "Decay parameter; fixed at 0.7308."], [String.raw`\varepsilon_t(\tau)`, "Fitting error at maturity <i>τ</i>."]],
    },
    a3: { tag: "A3", title: "How are the three factors read?", factors: [{ key: "L", name: "Level", body: "Long-run yield level", detail: "y(∞) = Lₜ", value: "{level}" }, { key: "S", name: "Slope", body: "Short minus long", detail: "Sₜ = y(0) − y(∞)", value: "{slope}" }, { key: "C", name: "Curvature", body: "Middle of the curve", detail: "loading peak ≈ 2.45y", value: "{curv}" }], note: "On {date}: negative Slope corresponds to an upward-sloping curve; positive Slope to an inverted one." },
    a4: { tag: "A4", title: "Fit is checked with RMSE", lead: "With λ fixed, the factors are estimated by OLS each day. RMSE summarises fitting error.", tex: String.raw`\mathrm{RMSE}_t=\sqrt{\frac{1}{N_t}\sum_{i=1}^{N_t}\big(y_t(\tau_i)-\hat y_t(\tau_i)\big)^2}`, foot: "Current RMSE: <b>{rmse} bp</b>. Lower values mean the fitted curve lies closer to observed yields." },
    a5: { tag: "A5", title: "Curve shape is also checked with the spread", lead: "The 10Y−2Y spread is directly observed and provides a model-free shape measure.", tex: String.raw`\mathit{Spread}_t=y_t(10\text{y})-y_t(2\text{y})`, states: [["Spread > 0", "Upward", "Long yields exceed short yields."], ["Spread ≈ 0", "Flat", "The long–short gap is small."], ["Spread < 0", "Inverted", "Short yields exceed long yields."]], foot: "Today 10Y−2Y = <b>{spread} pp</b>." },
    a6: { tag: "A6", title: "From theory to the research questions", steps: [["02", "Factors", "Does Nelson–Siegel describe the curve well?"], ["03", "Forecast", "Does AR beat the random walk?"], ["04", "Fed shock", "How does the curve react to Fed and inflation shocks?"], ["05", "Recession", "Does inversion warn of recession?"]], foot: "The Vietnam page applies the same framework as an extension." },
  },
};

function heading(tag, title) {
  return el("div", { class: "theory-title" },
    el("span", { class: "theory-tag" }, tag),
    el("h4", {}, title),
  );
}

function symbolRows(symbols) {
  const list = el("div", { class: "theory-symbol-list" });
  for (const [sym, meaning] of symbols) {
    list.append(el("div", { class: "theory-symbol-row" },
      el("div", { class: "theory-symbol-key" }, math(sym)),
      el("div", { class: "theory-symbol-meaning", html: meaning }),
    ));
  }
  return list;
}

export function theorySection(lang, vars = {}) {
  const c = COPY[lang] || COPY.vi;
  const root = el("section", { class: "theory theory-v2" },
    el("div", { class: "theory-heading" },
      el("h3", {}, c.heading),
      el("p", {}, c.sub),
    ),
  );

  // A1 — lead concept, compact and full width.
  root.append(el("article", { class: "theory-block theory-lead" },
    heading(c.a1.tag, c.a1.title),
    el("p", { html: fill(c.a1.body, vars) }),
  ));

  // A2 — equation left, symbols right: the main theoretical anchor.
  root.append(el("article", { class: "theory-block theory-model" },
    heading(c.a2.tag, c.a2.title),
    el("p", { class: "theory-lead-text", html: fill(c.a2.lead, vars) }),
    el("div", { class: "theory-model-grid" },
      el("div", { class: "theory-equation" }, math(c.a2.tex, { display: true })),
      el("div", { class: "theory-symbols" },
        el("div", { class: "theory-mini-label" }, lang === "en" ? "Where" : "Trong đó"),
        symbolRows(c.a2.symbols),
      ),
    ),
  ));

  // A3 — three factors as three concise equal cards.
  const factorGrid = el("div", { class: "factor-grid" });
  for (const f of c.a3.factors) {
    factorGrid.append(el("div", { class: "factor-card" },
      el("div", { class: "factor-head" },
        el("span", { class: "factor-key" }, f.key),
        el("strong", {}, f.name),
        el("span", { class: "factor-value mono" }, fill(f.value, vars)),
      ),
      el("div", { class: "factor-body" }, f.body),
      el("div", { class: "factor-detail mono" }, f.detail),
    ));
  }
  root.append(el("article", { class: "theory-block theory-factors" },
    heading(c.a3.tag, c.a3.title),
    factorGrid,
    el("p", { class: "theory-foot", html: fill(c.a3.note, vars) }),
  ));

  // A4 + A5 — paired diagnostics, deliberately shorter than A2.
  const pair = el("div", { class: "theory-pair" });
  pair.append(el("article", { class: "theory-block theory-compact" },
    heading(c.a4.tag, c.a4.title),
    el("p", { html: fill(c.a4.lead, vars) }),
    el("div", { class: "theory-equation compact" }, math(c.a4.tex, { display: true })),
    el("p", { class: "theory-foot", html: fill(c.a4.foot, vars) }),
  ));

  const states = el("div", { class: "spread-states" });
  for (const [range, name, desc] of c.a5.states) {
    states.append(el("div", { class: "spread-state" },
      el("span", { class: "spread-range mono" }, range),
      el("strong", {}, name),
      el("span", {}, desc),
    ));
  }
  pair.append(el("article", { class: "theory-block theory-compact" },
    heading(c.a5.tag, c.a5.title),
    el("p", { html: fill(c.a5.lead, vars) }),
    el("div", { class: "theory-equation compact" }, math(c.a5.tex, { display: true })),
    states,
    el("p", { class: "theory-foot", html: fill(c.a5.foot, vars) }),
  ));
  root.append(pair);

  // A6 — page roadmap, easier to scan than a paragraph.
  const roadmap = el("div", { class: "theory-roadmap" });
  for (const [no, name, question] of c.a6.steps) {
    roadmap.append(el("div", { class: "roadmap-step" },
      el("span", { class: "roadmap-no mono" }, no),
      el("div", {}, el("strong", {}, name), el("p", {}, question)),
    ));
  }
  root.append(el("article", { class: "theory-block theory-roadmap-block" },
    heading(c.a6.tag, c.a6.title),
    roadmap,
    el("p", { class: "theory-foot", html: fill(c.a6.foot, vars) }),
  ));

  return root;
}
