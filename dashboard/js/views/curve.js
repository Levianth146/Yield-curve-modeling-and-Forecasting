import { fitNsDay, NS_LAMBDA_DEFAULT, nsBasis } from "../engine/ns.js";
import { REPORT } from "../reportFacts.js";
import { el, fmt, figure, figs, chips, slider, axisX, axisY, endLabels, placeLabels, lineChart, parseD, tip } from "../ui/kit.js";
import { pageHero } from "../ui/conclusion.js";
import { explainBox, methodDetails, resetLink, term } from "../ui/glossary.js";
import { readingSteps } from "../ui/formulaCard.js";
import { modelFormula } from "../content/attach.js";
import { label } from "../content/labels.js";
import { t } from "../i18n.js";

const GRID = d3.range(0.1, 3.0001, 0.05).map((v) => Math.round(v * 100) / 100);
const cache = new Map();
let meIdx = null;
function monthEndIdx(dates) {
  if (meIdx) return meIdx;
  const out = [];
  for (let i = 0; i < dates.length; i++) if (i === dates.length - 1 || dates[i].slice(0, 7) !== dates[i + 1].slice(0, 7)) out.push(i);
  const last = new Date(dates[dates.length - 1] + "T00:00:00Z"), eom = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 0));
  if (last.getTime() < eom.getTime() - 4 * 86400000) out.pop();
  return (meIdx = out);
}
function monthlyFactors(y, tau, cols, lam) {
  const k = lam.toFixed(3);
  if (!cache.has(k)) {
    const rows = [];
    for (const i of monthEndIdx(y.dates)) {
      const f = fitNsDay(tau, cols.map((c) => c[i]), lam);
      if (f) rows.push({ date: y.dates[i], level: f.level, slope: f.slope, curvature: f.curvature });
    }
    cache.set(k, rows);
  }
  return cache.get(k);
}
let profCache = null;
export function profileCorr(y, tau, cols) {
  if (profCache) return profCache;
  const fixed = monthlyFactors(y, tau, cols, NS_LAMBDA_DEFAULT), prof = [];
  for (const i of monthEndIdx(y.dates)) {
    const row = cols.map((c) => c[i]); let best = null;
    for (const l of GRID) { const f = fitNsDay(tau, row, l); if (f && (!best || f.rmse < best.rmse)) best = f; }
    if (best) prof.push(best);
  }
  const r = {
    level: corr(fixed.map((q) => q.level), prof.map((q) => q.level)),
    slope: corr(fixed.map((q) => q.slope), prof.map((q) => q.slope)),
    curvature: corr(fixed.map((q) => q.curvature), prof.map((q) => q.curvature)),
  };
  return (profCache = r);
}
function corr(a, b) {
  const n = Math.min(a.length, b.length); let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return sab / Math.sqrt(saa * sbb);
}

function slopeWord(s, vi) {
  // NS: β₁ = y(0) − y(∞). Negative ⇒ short < long ⇒ upward-sloping.
  if (s < -0.1) return vi ? "dốc lên" : "upward-sloping";
  if (s > 0.1) return vi ? "đảo ngược / dốc xuống" : "inverted / downward-sloping";
  return vi ? "gần phẳng" : "nearly flat";
}

export async function mountCurve(ctx) {
  const { state, data, hero: heroEl, controls, viz, lang, persist, isDefaults, resetToDefaults } = ctx;
  const vi = lang !== "en", cs = state.curve;
  const y = data.yields, n = y.dates.length;
  const nsIdx = y.maturities.map((m, i) => (Math.abs(m - 1 / 12) > 1e-6 ? i : -1)).filter((i) => i >= 0);
  const tau = nsIdx.map((i) => y.maturities[i]), cols = nsIdx.map((i) => y.yields[i]);
  if (cs.dateIdx < 0 || cs.dateIdx >= n) cs.dateIdx = n - 1;
  if (!["ols_fixed", "ols_profile", "compare"].includes(cs.method)) cs.method = "ols_fixed";

  const N = REPORT.nls;
  const page = pageHero(heroEl, {
    eyebrow: vi ? "02 · RQ1 · Nelson–Siegel" : "02 · RQ1 · Nelson–Siegel",
    title: t(lang, "h2Curve"),
    status: "supported",
    lang,
    headline: "…",
    body: "…",
  });

  const chg = () => { persist(); update(); };
  const grid = el("div", { class: "curve-ctl-grid" });

  // Row 1: date + play
  const dateSl = slider({ label: vi ? "Ngày" : "Date", min: 0, max: n - 1, value: cs.dateIdx, format: (i) => y.dates[i], onInput: (v) => { cs.dateIdx = v; chg(); } });
  const play = el("button", { class: "chip", type: "button" }, "▶ " + (vi ? "Chạy thời gian" : "Play"));
  let timer = null;
  play.onclick = () => {
    if (timer) { clearInterval(timer); timer = null; play.textContent = "▶ " + (vi ? "Chạy thời gian" : "Play"); return; }
    if (cs.dateIdx > n - 30) cs.dateIdx = 0;
    play.textContent = "❚❚ " + (vi ? "Dừng" : "Pause");
    timer = setInterval(() => {
      cs.dateIdx = Math.min(n - 1, cs.dateIdx + 10); dateSl.set(cs.dateIdx); chg();
      if (cs.dateIdx >= n - 1) play.click();
    }, 60);
  };
  const row1 = el("div", { class: "curve-ctl-row" }, dateSl, play);
  grid.append(row1);

  // Row 2: event chips
  const jumps = [["2008-09-15", "Lehman"], ["2020-03-16", "COVID"], ["2022-07-05", vi ? "Đảo ngược 2022" : "2022 inversion"], ["2000-03-10", "dot-com"]];
  const jumpChips = chips({
    label: vi ? "Sự kiện" : "Events",
    options: jumps.map(([d, l]) => ({ id: d, label: l })),
    value: null,
    onPick: (d) => { let b = 0; y.dates.forEach((x, i) => { if (x <= d) b = i; }); cs.dateIdx = b; dateSl.set(b); chg(); },
  });
  row1.append(jumpChips);

  // Row 3: λ slider with reset in label + compare chip
  const lamSl = slider({
    label: "λ",
    min: 0.1, max: 3, step: 0.01, value: cs.lambda,
    format: (v) => fmt.n(v, 4),
    onInput: (v) => { cs.lambda = v; chg(); },
  });
  const resetLam = el("button", {
    class: "chip mono", type: "button",
    onclick: () => { cs.lambda = NS_LAMBDA_DEFAULT; lamSl.set(cs.lambda); chg(); },
  }, "0.7308");
  lamSl.querySelector(".ctl-label").append(resetLam);
  const cmpChip = chips({
    label: vi ? "So với λ báo cáo" : "vs report λ",
    options: [{ id: "off", label: vi ? "Ẩn" : "Off" }, { id: "on", label: vi ? "Hiện nét mảnh" : "Show thin" }],
    value: cs.compareReport ? "on" : "off",
    onPick: (v) => { cs.compareReport = v === "on"; chg(); },
  });
  const row2 = el("div", { class: "curve-ctl-row" }, lamSl, cmpChip);
  grid.append(row2);

  // Row 4: method
  const meth = chips({
    label: vi ? "Phương pháp" : "Method",
    options: [
      { id: "ols_fixed", label: label("method.ols_fixed", lang) },
      { id: "ols_profile", label: label("method.ols_profile", lang) },
      { id: "compare", label: label("method.compare", lang) },
    ],
    value: cs.method,
    onPick: (m) => { cs.method = m; chg(); },
  });
  const rst = resetLink(lang, !isDefaults(), () => resetToDefaults());
  row2.append(meth);
  if (rst) row2.append(rst);
  controls.append(grid);

  const fCurve = figure({
    title: "\u200b",
    sub: vi ? "Chấm: quan sát; đường đậm: NS đầy đủ; nét đứt: Level và Level+Slope." : "Dots: observed; bold: full NS; dashed: Level and Level+Slope.",
    height: 330, margin: { r: 88 },
  });
  const fFac = figure({ title: vi ? "Ba nhân tố theo tháng (cuối tháng)" : "Monthly factors (month-end)", sub: "", height: 300, margin: { r: 78 } });
  const fDual = figure({
    title: vi ? "Sai số khớp và tương quan nhân tố theo λ" : "Fit RMSE and factor correlation vs λ",
    sub: vi ? "Trái: sai số khớp trung bình (bp) theo λ; chấm tím là λ cho sai số nhỏ nhất, chấm xanh là λ = 0,7308 của đề án. Phải: tương quan của từng nhân tố với nhân tố ước lượng bằng λ = 0,7308." : "Left: mean fit error (bp) by λ; purple = error-minimising λ, blue = the project's λ = 0.7308. Right: each factor's correlation with its λ = 0.7308 counterpart.",
    height: 300, margin: { r: 20, l: 42, b: 44 },
  });
  const fLoad = figure({
    title: vi ? "Hệ số tải của ba nhân tố theo kỳ hạn" : "Factor loadings by maturity",
    sub: vi ? "Level có hệ số tải bằng 1 ở mọi kỳ hạn; hệ số tải của Slope giảm dần theo kỳ hạn; hệ số tải của Curvature lớn nhất ở kỳ hạn trung bình (tính tại λ đang chọn)." : "Level loads 1 everywhere; the Slope loading decays with maturity; the Curvature loading peaks at medium maturities (at the chosen λ).",
    height: 180, margin: { r: 70, t: 10, b: 28 },
  });
  viz.append(figs("two", fCurve.root, fFac.root), el("div", { style: "height:28px" }), figs("two", fDual.root, fLoad.root));

  function update() {
    const i = cs.dateIdx, row = cols.map((c) => c[i]);
    const lamUse = cs.lambda;
    const fx = fitNsDay(tau, row, lamUse);
    const prof = GRID.map((l) => ({ l, r: fitNsDay(tau, row, l)?.rmse })).filter((d) => Number.isFinite(d.r));
    const best = prof.reduce((a, b) => (b.r < a.r ? b : a), prof[0]);
    const fp = fitNsDay(tau, row, best.l);
    const shown = cs.method === "ols_profile" ? { f: fp, l: best.l } : { f: fx, l: lamUse };
    if (!shown.f) return;
    const f = shown.f;
    const mo = monthlyFactors(y, tau, cols, lamUse), ref = monthlyFactors(y, tau, cols, NS_LAMBDA_DEFAULT);
    const cL = corr(mo.map((r) => r.level), ref.map((r) => r.level));
    const cS = corr(mo.map((r) => r.slope), ref.map((r) => r.slope));
    const cC = corr(mo.map((r) => r.curvature), ref.map((r) => r.curvature));

    const nlsMax = Math.max(N.corrLevel, N.corrSlope, N.corrCurv);
    const nlsStatus = nlsMax < 0.6 ? "supported" : "notSupported";
    const basisTxt = vi
      ? `khi để λ tự do (ước lượng phi tuyến trên ${N.n} ngày), tương quan giữa nhân tố thu được và nhân tố với λ = 0,7308 chỉ là ${fmt.n(N.corrLevel, 2)} / ${fmt.n(N.corrSlope, 2)} / ${fmt.n(N.corrCurv, 2)} (Level / Slope / Curvature), ${nlsMax < 0.6 ? "đều dưới" : "không dưới"} ngưỡng 0,6. Nghĩa là λ tự do làm nhân tố thay đổi thất thường giữa các ngày, nên cố định λ là lựa chọn hợp lý.`
      : `with λ left free (non-linear fit on ${N.n} days), the correlation between the resulting factors and the λ = 0.7308 factors is only ${fmt.n(N.corrLevel, 2)} / ${fmt.n(N.corrSlope, 2)} / ${fmt.n(N.corrCurv, 2)} (Level / Slope / Curvature), ${nlsMax < 0.6 ? "all below" : "not below"} the 0.6 threshold: a free λ makes the factors erratic, so fixing λ is justified.`;
    page.setConclusion({
      status: nlsStatus,
      basis: basisTxt,
      headline: vi
        ? `Tại ${fmt.dateText(y.dates[i])}, ba nhân tố mô tả đường cong với sai số <span class="num">${fmt.bp(f.rmse)}</span>.`
        : `On ${fmt.dateISO(y.dates[i])}, three factors describe the curve within <span class="num">${fmt.bp(f.rmse)}</span>.`,
      body: vi
        ? `${term("Level", lang).outerHTML} <span class="num">${fmt.n(f.level)}</span> là mức dài hạn, ${term("Slope", lang).outerHTML} <span class="num">${fmt.n(f.slope)}</span> cho biết đường cong ${slopeWord(f.slope, true)}, ${term("Curvature", lang).outerHTML} <span class="num">${fmt.n(f.curvature)}</span> đo độ gồ hoặc võng của đoạn trung hạn. Khi đổi λ từ 0,7308 sang <span class="num">${fmt.n(shown.l, 3)}</span>: Level/Slope gần giữ nguyên (tương quan <span class="num">${fmt.n(cL, 2)}</span>/<span class="num">${fmt.n(cS, 2)}</span>); Curvature đổi nhiều hơn (<span class="num">${fmt.n(cC, 2)}</span>).`
        : `${term("Level", lang).outerHTML} <span class="num">${fmt.n(f.level)}</span> is the long-run level; ${term("Slope", lang).outerHTML} <span class="num">${fmt.n(f.slope)}</span> says the curve is ${slopeWord(f.slope, false)}; ${term("Curvature", lang).outerHTML} <span class="num">${fmt.n(f.curvature)}</span> is the mid hump. Moving λ from 0.7308 to <span class="num">${fmt.n(shown.l, 3)}</span>: Level/Slope nearly unchanged (corr <span class="num">${fmt.n(cL, 2)}</span>/<span class="num">${fmt.n(cS, 2)}</span>); Curvature moves more (<span class="num">${fmt.n(cC, 2)}</span>).`,
    });

    fCurve.setTitle((vi ? "Đường cong " : "Curve ") + `<span class="num">${fmt.dateISO(y.dates[i])}</span> · RMSE <span class="num">${fmt.bp(f.rmse)}</span>`);
    fCurve.render((g, { w, h }) => {
      const x = d3.scaleSqrt().domain([0.25, 30]).range([0, w]);
      const fits = [];
      if (cs.method !== "ols_profile") fits.push({ f: fx, c: "var(--series-slope)", n: `λ=${fmt.n(lamUse, 2)}`, dash: null });
      if (cs.method !== "ols_fixed") fits.push({ f: fp, c: "var(--series-b)", n: `λ*=${fmt.n(best.l, 2)}`, dash: cs.method === "compare" ? "5 3" : null });
      const vals = row.filter(Number.isFinite);
      const yy = d3.scaleLinear().domain([Math.min(...vals, f.level - 0.2) - 0.3, Math.max(...vals, f.level) + 0.3]).nice().range([h, 0]);
      axisY(g, yy, w, { tickFormat: (d) => fmt.n(d, 1) });
      g.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).tickValues([0.25, 1, 2, 5, 10, 20, 30]).tickFormat(fmt.mat).tickSizeOuter(0));
      const gridT = d3.range(0.25, 30.01, 0.25);
      const lam = shown.l;
      const beta = [f.level, f.slope, f.curvature];
      g.append("path").datum(gridT).attr("fill", "none").attr("stroke", "var(--series-level)").attr("stroke-width", 1.2).attr("stroke-dasharray", "4 3").attr("d", d3.line().x((t) => x(t)).y(() => yy(beta[0])));
      g.append("path").datum(gridT).attr("fill", "none").attr("stroke", "var(--series-curv)").attr("stroke-width", 1.2).attr("stroke-dasharray", "4 3").attr("d", d3.line().x((t) => x(t)).y((t) => yy(beta[0] + beta[1] * nsBasis(t, lam).f1)));
      const labs = [
        { x: x(30), y: yy(beta[0]), text: "L", color: "var(--series-level)" },
        { x: x(30), y: yy(beta[0] + beta[1] * nsBasis(30, lam).f1), text: "L + S", color: "var(--series-curv)" },
      ];
      for (const ft of fits) {
        g.append("path").datum(gridT).attr("fill", "none").attr("stroke", ft.c).attr("stroke-width", 2.6).attr("stroke-dasharray", ft.dash).attr("d", d3.line().x((t) => x(t)).y((t) => yy(ft.f.fitted(t))));
      }
      if (fits.length) { const lf = fits[fits.length - 1]; labs.push({ x: x(30), y: yy(lf.f.fitted(30)), text: lf.n, color: lf.c }); }
      endLabels(g, labs);
      const T = tip();
      g.selectAll(null).data(tau.map((t, k) => ({ t, v: row[k] })).filter((d) => Number.isFinite(d.v))).join("circle")
        .attr("cx", (d) => x(d.t)).attr("cy", (d) => yy(d.v)).attr("r", 4).attr("fill", "var(--ink)").attr("stroke", "var(--paper)").attr("stroke-width", 1.5)
        .on("mousemove", (ev, d) => T.show(`<b>${fmt.mat(d.t)}</b> <span class="m">${fmt.n(d.v)}%</span><br>fit <span class="m">${fmt.n(f.fitted(d.t))}%</span> · err <span class="m">${fmt.sg((d.v - f.fitted(d.t)) * 100, 1)} bp</span>`, ev))
        .on("mouseleave", T.hide);
      g.selectAll(null).data(tau.map((t, k) => ({ t, v: row[k] })).filter((d) => Number.isFinite(d.v))).join("line")
        .attr("x1", (d) => x(d.t)).attr("x2", (d) => x(d.t)).attr("y1", (d) => yy(d.v)).attr("y2", (d) => yy(f.fitted(d.t))).attr("stroke", "var(--status-serious)").attr("stroke-width", 1.4);
    });

    fFac.setSub(vi ? `Đường dọc: ${fmt.dateISO(y.dates[i])}. λ = ${fmt.n(lamUse, 3)}.` : `Vertical: ${fmt.dateISO(y.dates[i])}. λ = ${fmt.n(lamUse, 3)}.`);
    const ser = (rows, k, c, lbl, extra = {}) => ({ values: rows.map((r) => ({ x: parseD(r.date), y: r[k] })), color: c, label: lbl, ...extra });
    const series = [ser(mo, "level", "var(--series-level)", "Level"), ser(mo, "slope", "var(--series-slope)", "Slope"), ser(mo, "curvature", "var(--series-curv)", "Curvature")];
    if (cs.compareReport && Math.abs(lamUse - NS_LAMBDA_DEFAULT) > 0.005) {
      series.push(ser(ref, "level", "var(--series-level)", "", { width: 0.8, dash: "2 2" }), ser(ref, "slope", "var(--series-slope)", "", { width: 0.8, dash: "2 2" }), ser(ref, "curvature", "var(--series-curv)", "", { width: 0.8, dash: "2 2" }));
    }
    const rowsHover = mo.map((r) => ({ x: parseD(r.date), ...r }));
    lineChart(fFac, {
      series, xDomain: d3.extent(rowsHover, (d) => d.x), zero: true, yFmt: (d) => fmt.n(d, 0), ylabel: "%",
      hoverRows: rowsHover,
      hoverFmt: (r) => `<b>${r.date.slice(0, 7)}</b><br>Level <span class="m">${fmt.n(r.level)}</span><br>Slope <span class="m">${fmt.n(r.slope)}</span><br>Curv <span class="m">${fmt.n(r.curvature)}</span>`,
      bands: data.recessions.spells,
      decorate: (g, { x, h }) => {
        const xx = x(new Date(y.dates[i]));
        g.append("line").attr("x1", xx).attr("x2", xx).attr("y1", 0).attr("y2", h).attr("stroke", "var(--ink)").attr("stroke-width", 1.5).attr("stroke-dasharray", "2 2");
      },
    });

    // Dual panel: RMSE + corr
    const sweep = GRID.filter((l, k) => k % 2 === 0 || Math.abs(l - lamUse) < 0.03).map((l) => {
      const m2 = monthlyFactors(y, tau, cols, l);
      return { l, L: corr(m2.map((r) => r.level), ref.map((r) => r.level)), S: corr(m2.map((r) => r.slope), ref.map((r) => r.slope)), C: corr(m2.map((r) => r.curvature), ref.map((r) => r.curvature)) };
    });
    fDual.render((g, { w, h }) => {
      const gap = 28, hw = (w - gap) / 2;
      const g1 = g.append("g"), g2 = g.append("g").attr("transform", `translate(${hw + gap},0)`);
      // left RMSE
      const x1 = d3.scaleLinear().domain([0.1, 3]).range([0, hw]);
      const y1 = d3.scaleLinear().domain([0, d3.max(prof, (d) => d.r * 100)]).nice().range([h, 0]);
      axisY(g1, y1, hw, { tickFormat: (d) => fmt.n(d, 0), label: "bp" });
      axisX(g1, x1, h, { ticks: 5, tickFormat: (d) => fmt.n(d, 1) });
      g1.append("path").datum(prof).attr("fill", "none").attr("stroke", "var(--ink)").attr("stroke-width", 1.6).attr("d", d3.line().x((d) => x1(d.l)).y((d) => y1(d.r * 100)));
      const axisLabs = [];
      const mark = (lv, c, lbl) => {
        const r = (fitNsDay(tau, row, lv)?.rmse ?? NaN) * 100;
        if (!Number.isFinite(r)) return;
        g1.append("circle").attr("cx", x1(lv)).attr("cy", y1(r)).attr("r", 4).attr("fill", c);
        g1.append("line").attr("x1", x1(lv)).attr("x2", x1(lv)).attr("y1", y1(r)).attr("y2", h).attr("stroke", c).attr("stroke-dasharray", "2 2").attr("opacity", 0.5);
        axisLabs.push({ x: x1(lv), y: y1(r) - 10, text: lbl, color: c });
      };
      mark(best.l, "var(--series-b)", vi ? `tối ưu ${fmt.n(best.l, 2)}` : `best ${fmt.n(best.l, 2)}`);
      mark(NS_LAMBDA_DEFAULT, "var(--series-level)", "0.7308");
      // Nhãn nằm ngay trên điểm đánh dấu; nhãn bên trái canh phải, nhãn bên phải canh trái để không chồng nhau.
      const lamMarks = axisLabs.slice().sort((a, b) => a.x - b.x);
      lamMarks.forEach((it, k) => {
        const anchor = lamMarks.length > 1 ? (k === 0 ? "end" : "start") : "middle";
        g1.append("text").attr("class", "lbl").attr("text-anchor", anchor)
          .attr("x", it.x + (anchor === "end" ? -4 : anchor === "start" ? 4 : 0)).attr("y", Math.max(12, it.y))
          .style("fill", it.color).text(it.text);
      });
      // right corr
      const x2 = d3.scaleLinear().domain([0.1, 3]).range([0, hw]);
      const lo = Math.min(0.5, d3.min(sweep, (d) => Math.min(d.L, d.S, d.C)) - 0.02);
      const y2 = d3.scaleLinear().domain([lo, 1]).range([h, 0]);
      axisY(g2, y2, hw, { tickFormat: (d) => fmt.n(d, 1) });
      axisX(g2, x2, h, { ticks: 5, tickFormat: (d) => fmt.n(d, 1) });
      const labs = [];
      [["L", "var(--series-level)", "Level"], ["S", "var(--series-slope)", "Slope"], ["C", "var(--series-curv)", "Curvature"]].forEach(([k, c, nm]) => {
        g2.append("path").datum(sweep).attr("fill", "none").attr("stroke", c).attr("stroke-width", 1.8).attr("d", d3.line().x((d) => x2(d.l)).y((d) => y2(d[k])));
        const e = sweep[sweep.length - 1];
        labs.push({ x: x2(e.l), y: y2(e[k]), text: nm, color: c });
      });
      endLabels(g2, labs);
      g2.append("line").attr("x1", x2(NS_LAMBDA_DEFAULT)).attr("x2", x2(NS_LAMBDA_DEFAULT)).attr("y1", 0).attr("y2", h).attr("stroke", "var(--ink-muted)").attr("stroke-dasharray", "3 3");
    });

    // Loadings f0, f1, f2
    fLoad.render((g, { w, h }) => {
      const x = d3.scaleSqrt().domain([0.25, 30]).range([0, w]);
      const taus = d3.range(0.25, 30.01, 0.25);
      const pts = taus.map((τ) => { const b = nsBasis(τ, lamUse); return { τ, f0: 1, f1: b.f1, f2: b.f2 }; });
      const y = d3.scaleLinear().domain([-0.2, 1.05]).range([h, 0]);
      axisY(g, y, w, { tickFormat: (d) => fmt.n(d, 1), zero: true });
      g.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).tickValues([0.25, 1, 2, 5, 10, 20, 30]).tickFormat(fmt.mat).tickSizeOuter(0));
      [["f0", "var(--series-level)", "Level"], ["f1", "var(--series-slope)", "Slope"], ["f2", "var(--series-curv)", "Curvature"]].forEach(([k, c, nm]) => {
        g.append("path").datum(pts).attr("fill", "none").attr("stroke", c).attr("stroke-width", 2).attr("d", d3.line().x((d) => x(d.τ)).y((d) => y(d[k])));
      });
      endLabels(g, [
        { x: x(30), y: y(1), text: "Level", color: "var(--series-level)" },
        { x: x(30), y: y(pts[pts.length - 1].f1), text: "Slope", color: "var(--series-slope)" },
        { x: x(30), y: y(pts[pts.length - 1].f2), text: "Curvature", color: "var(--series-curv)" },
      ]);
    });
    updateExtras();
  }

  const stepsHost = el("div");
  const formulaHost = el("div");
  const explainHost = el("div");
  viz.append(stepsHost, formulaHost, explainHost);

  function updateExtras() {
    const i = cs.dateIdx, row = cols.map((c) => c[i]);
    let lam = cs.lambda;
    if (cs.method === "ols_profile") {
      const prof = GRID.map((l) => ({ l, r: fitNsDay(tau, row, l)?.rmse })).filter((d) => Number.isFinite(d.r));
      if (prof.length) lam = prof.reduce((a, b) => (b.r < a.r ? b : a)).l;
    }
    const f = fitNsDay(tau, row, lam);
    if (!f) return;
    const tauStar = fmt.n(1.793 / 0.7308, 2);
    stepsHost.replaceChildren(readingSteps(lang, vi ? [
      `Ngày <span class="num">${fmt.dateText(y.dates[i])}</span>: RMSE khớp = <span class="num">${fmt.bp(f.rmse)}</span>.`,
      `${term("Level", lang).outerHTML} <span class="num">${fmt.n(f.level)}</span> = mức dài hạn; ${term("Slope", lang).outerHTML} <span class="num">${fmt.n(f.slope)}</span> = ngắn − dài (${slopeWord(f.slope, true)}).`,
      `${term("Curvature", lang).outerHTML} <span class="num">${fmt.n(f.curvature)}</span> đo độ võng trung hạn.`,
      `Với λ = 0,7308 của đề án, hệ số tải Curvature đạt cực đại tại khoảng <span class="num">${tauStar}</span> năm. Khi để λ tự do (${N.n} ngày), tương quan với nhân tố của λ cố định chỉ còn ${fmt.n(N.corrLevel, 2)} / ${fmt.n(N.corrSlope, 2)} / ${fmt.n(N.corrCurv, 2)}.`,
    ] : [
      `On <span class="num">${fmt.dateISO(y.dates[i])}</span>: fit RMSE = <span class="num">${fmt.bp(f.rmse)}</span>.`,
      `${term("Level", lang).outerHTML} <span class="num">${fmt.n(f.level)}</span> = long-run level; ${term("Slope", lang).outerHTML} <span class="num">${fmt.n(f.slope)}</span> = short − long (${slopeWord(f.slope, false)}).`,
      `${term("Curvature", lang).outerHTML} <span class="num">${fmt.n(f.curvature)}</span> is the mid hump.`,
      `Project λ = 0.7308 ⇒ Curvature peak ≈ <span class="num">${tauStar}</span> years. NLS vs OLS (${N.n} days): corr ${fmt.n(N.corrLevel, 2)}/${fmt.n(N.corrSlope, 2)}/${fmt.n(N.corrCurv, 2)}.`,
    ]));
    formulaHost.replaceChildren(modelFormula(lang, "ns", vi
      ? `Ngày đang xem: Level ${fmt.n(f.level)}, Slope ${fmt.n(f.slope)}, Curvature ${fmt.n(f.curvature)}, λ = ${fmt.n(lam, 3)}.`
      : `Current day: Level ${fmt.n(f.level)}, Slope ${fmt.n(f.slope)}, Curvature ${fmt.n(f.curvature)}, λ = ${fmt.n(lam, 3)}.`));
    explainHost.replaceChildren(
      explainBox(lang, {
        meaning: vi
          ? `<p>${term("Slope", lang).outerHTML} âm = đường cong dốc lên (ngắn &lt; dài). Dương = đảo ngược.</p><p>λ = 0.7308 (=0.0609×12); Curvature đỉnh ≈ ${tauStar} năm.</p>`
          : `<p>Negative ${term("Slope", lang).outerHTML} = upward-sloping (short &lt; long). Positive = inverted.</p><p>λ = 0.7308 (=0.0609×12); Curvature peaks near ${tauStar} years.</p>`,
        confidence: vi
          ? `So sánh trên ${N.n} ngày cho thấy khi ước lượng λ tự do, nhân tố thu được chỉ tương quan ${fmt.n(N.corrLevel, 2)} / ${fmt.n(N.corrSlope, 2)} / ${fmt.n(N.corrCurv, 2)} với nhân tố của λ cố định. Cố định λ cho chuỗi nhân tố ổn định hơn.`
          : `C1 uses report NLS vs OLS (${N.n} days): corr ${fmt.n(N.corrLevel, 2)}/${fmt.n(N.corrSlope, 2)}/${fmt.n(N.corrCurv, 2)}. Grid λ is stabler than true NLS.`,
        limits: vi
          ? "<ul><li>Fit đẹp ≠ dự báo tốt (xem Dự báo).</li><li>DGS1MO chỉ hiển thị; cần ≥9/10 kỳ hạn mỗi ngày.</li></ul>"
          : "<ul><li>Good fit ≠ good forecasts (see Forecast).</li><li>DGS1MO is display-only; need ≥9/10 mats/day.</li></ul>",
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