import { fitProbit, predictProbit, aucMannWhitney, brier, bss, splitProbitRows } from "../engine/probit.js";
import { NBER_PRE2000 } from "../reportFacts.js";
import { el, fmt, figure, figs, strip, setStrip, chips, slider, axisX, axisY, recBands, tip, parseD } from "../ui/kit.js";
import { pageHero } from "../ui/conclusion.js";
import { explainBox, methodDetails, resetLink, term } from "../ui/glossary.js";
import { readingSteps } from "../ui/formulaCard.js";
import { modelFormula } from "../content/attach.js";
import { label } from "../content/labels.js";
import { t } from "../i18n.js";

const MODELS = ["spread", "dummy"];

function roc(y, p) {
  const idx = Array.from(y.keys()).sort((a, b) => p[b] - p[a]);
  const P = y.reduce((s, v) => s + v, 0), N = y.length - P; let tp = 0, fp = 0; const pts = [{ f: 0, t: 0, thr: 1 }];
  for (const i of idx) { if (y[i] === 1) tp++; else fp++; pts.push({ f: fp / N, t: tp / P, thr: p[i] }); }
  return pts;
}
function reliability(y, p, bins = 8) {
  const out = [];
  for (let b = 0; b < bins; b++) {
    const lo = b / bins, hi = (b + 1) / bins, ids = [];
    for (let i = 0; i < p.length; i++) if (p[i] >= lo && (p[i] < hi || (b === bins - 1 && p[i] <= 1))) ids.push(i);
    if (ids.length) out.push({ pm: ids.reduce((s, i) => s + p[i], 0) / ids.length, fo: ids.reduce((s, i) => s + y[i], 0) / ids.length, n: ids.length });
  }
  return out;
}
function mcfadden(fit, y, x) {
  // approx from loglik if available; else NaN
  if (fit?.mcfadden_r2 != null) return fit.mcfadden_r2;
  if (fit?.r2 != null) return fit.r2;
  return NaN;
}

export async function mountProbit(ctx) {
  const { state, data, hero: heroEl, controls, viz, lang, persist, isDefaults, resetToDefaults } = ctx;
  const vi = lang !== "en", s = state.probit, ds = data.probitDataset.rows, golden = data.probitGolden;
  if (!["spread", "dummy"].includes(s.model)) s.model = "spread";
  const page = pageHero(heroEl, {
    eyebrow: vi ? "05 · RQ4 · Probit" : "05 · RQ4 · Probit",
    title: t(lang, "h2Probit"),
    status: "supported",
    lang,
    headline: "…",
    body: "…",
  });
  const chg = () => { persist(); update(); };
  const trainSl = slider({
    label: vi ? "Mẫu huấn luyện đến hết năm" : "Train until",
    min: 1985, max: 2015, value: Number(String(s.trainEnd).slice(0, 4)),
    format: (v) => vi ? `${v} (kiểm định từ ${v + 2})` : `${v}-12 → test ${v + 2}-01`,
    onInput: (v) => { s.trainEnd = `${v}-12`; chg(); },
  });
  const thrSl = slider({ label: vi ? "Ngưỡng cảnh báo: xác suất ≥" : "Alarm threshold P ≥", min: 5, max: 90, step: 5, value: Math.round(s.threshold * 100), format: (v) => v + "%", onInput: (v) => { s.threshold = v / 100; chg(); } });
  controls.append(
    chips({ label: vi ? "Biến giải thích" : "Predictor", options: MODELS.map((id) => ({ id, label: label("probit." + id, lang) })), value: s.model, onPick: (v) => { s.model = v; chg(); } }),
    chips({ label: vi ? "Loại bỏ các tháng đang suy thoái" : "Drop in-recession months", options: [{ id: "true", label: vi ? "Có (chính)" : "Yes" }, { id: "false", label: vi ? "Không" : "No" }], value: String(!s.noRecessionFilter), onPick: (v) => { s.noRecessionFilter = v === "false"; chg(); } }),
    trainSl, thrSl,
  );
  const rst = resetLink(lang, !isDefaults(), () => resetToDefaults());
  if (rst) controls.append(rst);

  const kpi = strip([]);
  const fTime = figure({ title: "​", sub: "", height: 330, margin: { r: 60 } });
  const fCurve = figure({ title: vi ? "Từ spread đến xác suất" : "From spread to probability", sub: "", height: 300, margin: { r: 20 } });
  const fRoc = figure({ title: "ROC", sub: "", height: 300, margin: { l: 44, r: 20 } });
  const fRel = figure({ title: vi ? "Xác suất dự báo so với tần suất thực tế" : "Calibration", sub: "", height: 300, margin: { l: 44, r: 20 } });
  const stepsHost = el("div");
  const formulaHost = el("div");
  const explainHost = el("div");
  const compareBox = el("div", { class: "report-compare" });
  viz.append(kpi, fTime.root, el("div", { style: "height:28px" }), figs("three", fCurve.root, fRoc.root, fRel.root), stepsHost, formulaHost, explainHost, compareBox);
  const T = tip();

  // T8: report comparison as a 3-row table at bottom
  const cmpRows = [
    ["spread_10y2y_fixed", "probit.spread_10y2y_fixed"],
    ["inversion_dummy_fixed", "probit.inversion_dummy_fixed"],
    ["spread_10y3m_fixed", "probit.spread_10y3m_fixed"],
  ].filter(([k]) => golden[k]);
  compareBox.append(
    el("h3", { class: "fig-title" }, vi ? "So sánh các biến thể mô hình" : "Report model comparison"),
    el("p", { class: "fig-sub" }, vi ? "Kết quả tính sẵn trên mẫu của đề án, không thay đổi theo thanh điều khiển." : "Frozen report numbers — independent of the sliders."),
    el("table", { class: "data-table" },
      el("thead", {}, el("tr", {},
        el("th", {}, vi ? "Mô hình" : "Model"),
        el("th", {}, "AUC"),
        el("th", {}, vi ? "McFadden R²" : "McFadden R²"),
        el("th", {}, vi ? "Số tháng có suy thoái sau đó (huấn luyện)" : "Positive months (train)"),
      )),
      el("tbody", {}, ...cmpRows.map(([k, lab]) => {
        const g = golden[k];
        return el("tr", {},
          el("td", {}, label(lab, lang)),
          el("td", { class: "num" }, fmt.n(g.auc, 3)),
          el("td", { class: "num" }, g.mcfadden_r2_train != null ? fmt.n(g.mcfadden_r2_train, 3) : "—"),
          el("td", { class: "num" }, g.train_positive != null ? String(g.train_positive) : "—"),
        );
      })),
    ),
  );

  function update() {
    const ty = Number(String(s.trainEnd).slice(0, 4)), testStart = `${ty + 2}-01`;
    const rows = (s.model === "dummy" ? ds.map((r) => ({ ...r, spread: r.spread < 0 ? 1 : 0 })) : ds);
    const filt = !s.noRecessionFilter;
    const { train, test } = splitProbitRows(rows, s.trainEnd, testStart, filt);
    if (train.length < 20 || test.length < 20) {
      page.setConclusion({ status: "notSupported", headline: vi ? "Mẫu quá ngắn." : "Sample too short.", body: "" });
      return;
    }
    const yTr = Float64Array.from(train.map((r) => r.recession_ahead)), xTr = Float64Array.from(train.map((r) => r.spread));
    const fit = fitProbit(yTr, xTr);
    const base = yTr.reduce((a, b) => a + b, 0) / yTr.length;
    const yTe = Float64Array.from(test.map((r) => r.recession_ahead)), pTe = Float64Array.from(test.map((r) => predictProbit(fit.b0, fit.b1, r.spread)));
    const auc = aucMannWhitney(yTe, pTe), bm = brier(yTe, pTe), bn = brier(yTe, Float64Array.from(yTe.map(() => base))), sk = bss(bm, bn);
    const thr = s.threshold, nPos = yTe.reduce((a, b) => a + b, 0), nNeg = yTe.length - nPos;
    let tp = 0, fp = 0; yTe.forEach((v, i) => { if (pTe[i] >= thr) { if (v === 1) tp++; else fp++; } });
    const tpr = tp / nPos, fpr = fp / nNeg;
    const fa22 = test.filter((r, i) => String(r.date).slice(0, 7) >= "2022-01" && pTe[i] >= thr && r.recession_ahead === 0).length;
    const nPosTrain = yTr.reduce((a, b) => a + b, 0);
    const status = auc > 0.7 && sk < 0 ? "supported" : "fragile";
    const r2 = mcfadden(fit, yTr, xTr);

    const basisTxt = vi
      ? `trên tập kiểm định ngoài mẫu, AUC = ${fmt.n(auc, 3)} (${auc > 0.7 ? "đạt" : "chưa đạt"} ngưỡng 0,7) và BSS = ${fmt.sgpct(sk)} (${sk < 0 ? "âm" : "không âm"}). Kết luận “xếp hạng rủi ro tốt nhưng xác suất chưa chính xác” được xem là vững khi đồng thời AUC lớn hơn 0,7 và BSS âm.`
      : `on the out-of-sample test set, AUC = ${fmt.n(auc, 3)} (${auc > 0.7 ? "above" : "below"} 0.7) and BSS = ${fmt.sgpct(sk)} (${sk < 0 ? "negative" : "not negative"}). The conclusion “ranks risk well but probabilities are inaccurate” is rated robust when AUC exceeds 0.7 and BSS is negative.`;
    page.setConclusion({
      status,
      basis: basisTxt,
      headline: vi
        ? `Đường cong đảo ngược <b>xếp hạng</b> rủi ro suy thoái tốt (${term("AUC", lang).outerHTML} <span class="num">${fmt.n(auc, 3)}</span>) nhưng <b>xác suất</b> mô hình đưa ra kém chính xác hơn mô hình đối chứng luôn dự báo bằng tỷ lệ suy thoái trung bình (${term("BSS", lang).outerHTML} <span class="num">${fmt.sgpct(sk)}</span>).`
        : `An inverted curve <b>ranks</b> recession risk well (${term("AUC", lang).outerHTML} <span class="num">${fmt.n(auc, 3)}</span>) but model <b>probabilities</b> are less accurate than always forecasting the base rate (${term("BSS", lang).outerHTML} <span class="num">${fmt.sgpct(sk)}</span>).`,
      body: vi
        ? `<p>AUC trả lời câu hỏi: nếu chọn ngẫu nhiên một tháng đứng trước suy thoái và một tháng bình thường, mô hình gán xác suất cao hơn cho tháng đứng trước suy thoái trong bao nhiêu phần trăm số lần? Ở đây là <span class="num">${fmt.pct(auc, 0)}</span>. BSS trả lời câu hỏi khác: bản thân con số xác suất có sát với thực tế không?</p><p>Tập huấn luyện chỉ có <span class="num">${nPosTrain}</span> tháng có suy thoái trong 12 tháng sau, trên tổng số <span class="num">${yTr.length}</span> tháng (tần suất nền <span class="num">${fmt.pct(base)}</span>). Ở ngưỡng <span class="num">${Math.round(thr * 100)}%</span> mô hình bắt <span class="num">${tp}</span>/<span class="num">${nPos}</span> tháng suy thoái và báo nhầm <span class="num">${fmt.pct(fpr, 0)}</span> tháng bình thường. Từ 2022 có <span class="num">${fa22}</span> tháng vượt ngưỡng mà ${term("NBER", lang).outerHTML} chưa xác nhận suy thoái.</p>`
        : `<p>AUC asks how often a pre-recession month ranks above a normal one — here <span class="num">${fmt.pct(auc, 0)}</span>. BSS asks whether probability levels are calibrated.</p><p>Training has only <span class="num">${nPosTrain}</span> positives in <span class="num">${yTr.length}</span> months (base rate <span class="num">${fmt.pct(base)}</span>). At <span class="num">${Math.round(thr * 100)}%</span> the model catches <span class="num">${tp}</span>/<span class="num">${nPos}</span> recession months with <span class="num">${fmt.pct(fpr, 0)}</span> false alarms. Since 2022, <span class="num">${fa22}</span> months exceed the threshold without an ${term("NBER", lang).outerHTML} recession.</p>`,
    });

    setStrip(kpi, [
      { k: "AUC", v: fmt.n(auc, 3), d: vi ? "Khả năng xếp hạng rủi ro" : "Ranks positive above negative" },
      { k: "BSS", v: fmt.sgpct(sk), cls: sk < 0 ? "neg" : "pos", d: vi ? "Âm: kém hơn mô hình đối chứng" : "Negative = worse than base rate" },
      { k: vi ? `Phát hiện đúng (ngưỡng ${Math.round(thr * 100)}%)` : `Hit @${Math.round(thr * 100)}%`, v: `${tp}/${nPos}`, d: vi ? `báo nhầm ${fmt.pct(fpr, 0)} số tháng bình thường` : `false alarm ${fmt.pct(fpr, 0)}` },
      { k: vi ? "Số tháng báo nhầm từ 2022" : "False alarms 2022→", v: String(fa22), cls: fa22 ? "warn" : "" },
    ]);

    const all = rows.filter((r) => (filt ? !r.recession_at_t : true)).map((r) => ({ x: parseD(r.date), date: r.date, p: predictProbit(fit.b0, fit.b1, r.spread), y: r.recession_ahead, train: String(r.date).slice(0, 7) <= s.trainEnd }));
    fTime.setTitle(vi ? "Xác suất suy thoái trong 12 tháng tới theo thời gian" : "Probability of recession within 12 months over time");
    fTime.setSub(vi ? "Vùng xám: suy thoái theo NBER. Đường mảnh: giai đoạn huấn luyện; đường đậm: giai đoạn kiểm định; nét đứt: ngưỡng cảnh báo." : "Grey: NBER. Thin = train; bold = test. Dashed = threshold.");
    fTime.render((g, { w, h }) => {
      const x = d3.scaleTime().domain(d3.extent(all, (d) => d.x)).range([0, w]), y = d3.scaleLinear().domain([0, 1]).range([h, 0]);
      recBands(g, x, h, [...NBER_PRE2000, ...data.recessions.spells]);
      axisY(g, y, w, { tickFormat: (d) => fmt.pct(d, 0) });
      axisX(g, x, h, { ticks: 8 });
      const tr = all.filter((d) => d.train), te = all.filter((d) => !d.train && d.date >= testStart);
      const ln = d3.line().x((d) => x(d.x)).y((d) => y(d.p));
      g.append("path").datum(tr).attr("fill", "none").attr("stroke", "var(--ink-muted)").attr("stroke-width", 1.2).attr("d", ln);
      g.append("path").datum(te).attr("fill", "none").attr("stroke", "var(--series-slope)").attr("stroke-width", 2).attr("d", ln);
      g.append("line").attr("x1", 0).attr("x2", w).attr("y1", y(thr)).attr("y2", y(thr)).attr("stroke", "var(--ink)").attr("stroke-dasharray", "4 3");
      g.append("line").attr("x1", x(parseD(testStart))).attr("x2", x(parseD(testStart))).attr("y1", 0).attr("y2", h).attr("stroke", "var(--ink)").attr("opacity", 0.4);
      const bis = d3.bisector((d) => d.x).center;
      g.append("rect").attr("width", w).attr("height", h).attr("fill", "transparent").on("mousemove", (ev) => {
        const [px] = d3.pointer(ev, g.node()); const d = all[bis(all, x.invert(px))];
        T.show(`<b>${String(d.date).slice(0, 7)}</b><br>P <span class="m">${fmt.pct(d.p)}</span> · ${d.y ? t(lang, "hasRecession") : t(lang, "noRecession")}`, ev);
      }).on("mouseleave", T.hide);
    });

    const xs = d3.range(-3, 4.01, 0.05);
    const todaySpread = (() => {
      const yy = data.yields, i10 = yy.maturities.findIndex((m) => m === 10), i2 = yy.maturities.findIndex((m) => m === 2);
      const v = yy.yields[i10][yy.dates.length - 1] - yy.yields[i2][yy.dates.length - 1];
      return s.model === "dummy" ? (v < 0 ? 1 : 0) : v;
    })();
    fCurve.setSub(`P = Φ(${fmt.n(fit.b0, 2)} ${fit.b1 < 0 ? "−" : "+"} ${fmt.n(Math.abs(fit.b1), 2)}·spread)`);
    fCurve.render((g, { w, h }) => {
      const dom = s.model === "dummy" ? [-0.2, 1.2] : [-3, 4];
      const x = d3.scaleLinear().domain(dom).range([0, w]), y = d3.scaleLinear().domain([0, 1]).range([h, 0]);
      axisY(g, y, w, { tickFormat: (d) => fmt.pct(d, 0) });
      axisX(g, x, h, { ticks: 7 });
      const jit = (i) => ((i * 9301 + 49297) % 233280) / 233280 - 0.5;
      g.selectAll(null).data(train.map((r, i) => ({ x: r.spread, y: r.recession_ahead, j: jit(i) }))).join("circle")
        .attr("cx", (d) => x(d.x)).attr("cy", (d) => (d.y ? y(0.96) : y(0.04)) + d.j * 14).attr("r", 2.2)
        .attr("fill", (d) => (d.y ? "var(--series-slope)" : "var(--ink-muted)")).attr("opacity", 0.55);
      const cur = s.model === "dummy" ? [0, 1].map((v) => ({ x: v, p: predictProbit(fit.b0, fit.b1, v) })) : xs.map((v) => ({ x: v, p: predictProbit(fit.b0, fit.b1, v) }));
      if (s.model === "dummy") g.selectAll(null).data(cur).join("circle").attr("cx", (d) => x(d.x)).attr("cy", (d) => y(d.p)).attr("r", 6).attr("fill", "var(--ink)");
      else g.append("path").datum(cur).attr("fill", "none").attr("stroke", "var(--ink)").attr("stroke-width", 2.4).attr("d", d3.line().x((d) => x(d.x)).y((d) => y(d.p)));
      const tp0 = predictProbit(fit.b0, fit.b1, todaySpread);
      g.append("circle").attr("cx", x(todaySpread)).attr("cy", y(tp0)).attr("r", 6).attr("fill", "var(--series-level)").attr("stroke", "var(--paper)").attr("stroke-width", 2);
      g.append("text").attr("class", "lbl").attr("x", x(todaySpread) + 9).attr("y", y(tp0) - 8).style("fill", "var(--series-level)").text((vi ? "hôm nay " : "today ") + fmt.pct(tp0));
    });

    const rp = roc(yTe, pTe);
    fRoc.setSub(`AUC = ${fmt.n(auc, 3)}`);
    fRoc.render((g, { w, h }) => {
      const sz = Math.min(w, h), x = d3.scaleLinear().domain([0, 1]).range([0, sz]), y = d3.scaleLinear().domain([0, 1]).range([sz, 0]);
      axisY(g, y, sz, { tickFormat: (d) => fmt.n(d, 1) });
      axisX(g, x, sz, { ticks: 5, tickFormat: (d) => fmt.n(d, 1) });
      g.append("line").attr("x1", 0).attr("y1", sz).attr("x2", sz).attr("y2", 0).attr("stroke", "var(--ink-muted)").attr("stroke-dasharray", "3 3");
      g.append("path").datum(rp).attr("fill", "var(--series-level)").attr("opacity", 0.12).attr("d", d3.area().x((d) => x(d.f)).y0(sz).y1((d) => y(d.t)));
      g.append("path").datum(rp).attr("fill", "none").attr("stroke", "var(--series-level)").attr("stroke-width", 2.2).attr("d", d3.line().x((d) => x(d.f)).y((d) => y(d.t)));
      g.append("circle").attr("cx", x(fpr)).attr("cy", y(tpr)).attr("r", 5.5).attr("fill", "var(--ink)").attr("stroke", "var(--paper)").attr("stroke-width", 1.5);
    });

    const rl = reliability(yTe, pTe);
    fRel.render((g, { w, h }) => {
      const sz = Math.min(w, h), x = d3.scaleLinear().domain([0, 1]).range([0, sz]), y = d3.scaleLinear().domain([0, 1]).range([sz, 0]);
      axisY(g, y, sz, { tickFormat: (d) => fmt.pct(d, 0) });
      axisX(g, x, sz, { ticks: 5, tickFormat: (d) => fmt.pct(d, 0) });
      g.append("line").attr("x1", 0).attr("y1", sz).attr("x2", sz).attr("y2", 0).attr("stroke", "var(--ink-muted)").attr("stroke-dasharray", "3 3");
      g.append("path").datum(rl).attr("fill", "none").attr("stroke", "var(--series-slope)").attr("stroke-width", 1.6).attr("d", d3.line().x((d) => x(d.pm)).y((d) => y(d.fo)));
      g.selectAll(null).data(rl).join("circle").attr("cx", (d) => x(d.pm)).attr("cy", (d) => y(d.fo)).attr("r", (d) => 3 + Math.sqrt(d.n) * 0.6).attr("fill", "var(--series-slope)").attr("opacity", 0.85)
        .on("mousemove", (ev, d) => T.show(`P <span class="m">${fmt.pct(d.pm)}</span> → ${fmt.pct(d.fo)} · n=${d.n}`, ev)).on("mouseleave", T.hide);
    });

    stepsHost.replaceChildren(readingSteps(lang, vi ? [
      `Huấn luyện đến <span class="num">${s.trainEnd}</span>, kiểm tra từ <span class="num">${testStart}</span> (${label("probit." + s.model, lang)}).`,
      `Tỷ lệ tháng có suy thoái trong 12 tháng sau ở tập huấn luyện: <span class="num">${fmt.pct(base)}</span> (<span class="num">${nPosTrain}</span> tháng).`,
      `Trên tập kiểm định: AUC <span class="num">${fmt.n(auc, 3)}</span>, BSS <span class="num">${fmt.sgpct(sk)}</span>.`,
      `Ngưỡng <span class="num">${Math.round(thr * 100)}%</span>: bắt <span class="num">${tp}/${nPos}</span>, báo nhầm <span class="num">${fmt.pct(fpr, 0)}</span>.`,
      `Từ 2022: <span class="num">${fa22}</span> tháng vượt ngưỡng chưa có nhãn suy thoái NBER.`,
    ] : [
      `Train through <span class="num">${s.trainEnd}</span>, test from <span class="num">${testStart}</span> (${label("probit." + s.model, lang)}).`,
      `Training base rate <span class="num">${fmt.pct(base)}</span> with <span class="num">${nPosTrain}</span> positives.`,
      `OOS: AUC <span class="num">${fmt.n(auc, 3)}</span>, BSS <span class="num">${fmt.sgpct(sk)}</span>.`,
      `At <span class="num">${Math.round(thr * 100)}%</span>: hit <span class="num">${tp}/${nPos}</span>, false alarm <span class="num">${fmt.pct(fpr, 0)}</span>.`,
      `Since 2022: <span class="num">${fa22}</span> threshold breaches without an NBER recession label.`,
    ]));

    formulaHost.replaceChildren(modelFormula(lang, "probit", vi
      ? `Cấu hình đang xem: AUC ${fmt.n(auc, 3)}, BSS ${fmt.sgpct(sk)}, số tháng có suy thoái sau đó trong tập huấn luyện = ${nPosTrain}${Number.isFinite(r2) ? `, McFadden R² ≈ ${fmt.n(r2, 3)}` : ""}.`
      : `Current: AUC ${fmt.n(auc, 3)}, BSS ${fmt.sgpct(sk)}, n⁺ train = ${nPosTrain}${Number.isFinite(r2) ? `, McFadden R² ≈ ${fmt.n(r2, 3)}` : ""}.`));

    explainHost.replaceChildren(
      explainBox(lang, {
        meaning: vi
          ? `<p>${term("AUC", lang).outerHTML}: xác suất xếp tháng suy thoái cao hơn tháng bình thường.</p><p>${term("BSS", lang).outerHTML}: âm = kém hơn luôn dự báo tần suất nền.</p>`
          : `<p>${term("AUC", lang).outerHTML}: chance a recession month ranks above a normal one.</p><p>${term("BSS", lang).outerHTML}: negative = worse than always forecasting the base rate.</p>`,
        confidence: vi
          ? `Huấn luyện chỉ vài đợt suy thoái — hệ số ${term("Probit", lang).outerHTML} bất định lớn.`
          : `Training covers few recessions — ${term("Probit", lang).outerHTML} coefficients are noisy.`,
        limits: vi
          ? "<ul><li>Nhãn NBER công bố sau sự kiện.</li><li>Tháng vượt ngưỡng từ 2022 chưa chắc báo nhầm vĩnh viễn.</li></ul>"
          : "<ul><li>NBER labels are ex post.</li><li>Post-2022 alarms may still get recession labels later.</li></ul>",
      }),
      methodDetails(lang, {
        methodHtml: vi
          ? `<p>Chi tiết công thức và mã tái lập nằm ở tab Phương pháp.</p>`
          : `<p>Full formulas and reproduce code live on the Methods tab.</p>`,
      }),
    );
  }
  update();
}
