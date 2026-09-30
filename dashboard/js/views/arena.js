import { selectArLag, runArVsRw, mse } from "../engine/ar.js";
import { dieboldMariano } from "../engine/dm.js";
import { el, fmt, figure, figs, chips, slider, lineChart, parseD, tip } from "../ui/kit.js";
import { pageHero } from "../ui/conclusion.js";
import { explainBox, methodDetails, resetLink, term } from "../ui/glossary.js";
import { readingSteps } from "../ui/formulaCard.js";
import { modelFormula } from "../content/attach.js";
import { label } from "../content/labels.js";
import { t } from "../i18n.js";

function factors(fm) {
  const c = fm.columns || {};
  return { dates: fm.dates, level: Float64Array.from(c.level), slope: Float64Array.from(c.slope), curvature: Float64Array.from(c.curvature) };
}
function splitIndex(dates, split) {
  const tg = split.slice(0, 7); let idx = -1;
  dates.forEach((d, i) => { if (String(d).slice(0, 7) <= tg) idx = i; });
  return idx;
}
const FIDS = ["level", "slope", "curvature"];
const HS = [1, 3, 6, 12];

function evalCell(fm, a, factor, h) {
  const series = fm[factor], sp = splitIndex(fm.dates, a.split);
  const p = selectArLag(series, 12, sp, a.lag);
  const oos = runArVsRw(series, sp, p, [h], a.window === "rolling", a.rollingN || 120)[h];
  const act = Float64Array.from(oos.actual), ar = Float64Array.from(oos.arPred), rw = Float64Array.from(oos.rwPred);
  const dm = dieboldMariano(act, ar, rw, h, a.loss === "ae" ? "ae" : "se", a.hln);
  return { p, oos, dm, rmseAr: Math.sqrt(mse(oos.actual, oos.arPred)), rmseRw: Math.sqrt(mse(oos.actual, oos.rwPred)), n: act.length };
}

/** Diverging fill by RMSE ratio: blue AR better (<1), red RW better (>1). */
function ratioFill(ratio) {
  const ln = Math.log(Math.max(0.5, Math.min(2, ratio)));
  const t = Math.max(-1, Math.min(1, ln / Math.log(1.25)));
  if (t < 0) {
    const u = -t;
    return d3.interpolateRgb("#f7f6f2", "#2a6f97")(u);
  }
  return d3.interpolateRgb("#f7f6f2", "#9b2226")(t);
}
function heatTextColor(bg) {
  const c = d3.color(bg);
  if (!c) return "#212529";
  const L = 0.2126 * (c.r / 255) + 0.7152 * (c.g / 255) + 0.0722 * (c.b / 255);
  return L < 0.45 ? "#fff" : "#212529";
}
function ratioLegend(vi) {
  return el("div", { class: "heat-legend" },
    el("span", {}, vi ? "AR tốt hơn" : "AR better"),
    el("span", { class: "heat-grad", title: "RMSE AR/RW" }),
    el("span", {}, vi ? "RW tốt hơn" : "RW better"),
    el("span", {}, vi ? "· Viền đậm: p < 0.05" : "· Bold border: p < 0.05"),
  );
}

export async function mountArena(ctx) {
  const { state, data, hero: heroEl, controls, viz, lang, persist, isDefaults, resetToDefaults } = ctx;
  const vi = lang !== "en", a = state.arena, fm = factors(data.factorsMonthly);
  const page = pageHero(heroEl, {
    eyebrow: vi ? "03 · RQ2 · Dự báo" : "03 · RQ2 · Forecast",
    title: t(lang, "h2Arena"),
    status: "supported",
    lang,
    headline: "…",
    body: "…",
  });
  const chg = () => { persist(); update(); };

  controls.append(
    chips({ label: vi ? "Nhân tố" : "Factor", options: FIDS.map((id) => ({ id, label: label("factor", id, lang) })), value: a.factor, onPick: (v) => { a.factor = v; chg(); } }),
    chips({ label: vi ? "Chân trời" : "Horizon", options: HS.map((h) => ({ id: h, label: label(`h.${h}`, lang) })), value: a.h, onPick: (v) => { a.h = Number(v); chg(); } }),
    chips({ label: vi ? "Chọn độ trễ" : "Lag choice", options: ["bic", "aic"].map((id) => ({ id, label: label("lag", id, lang) })), value: a.lag, onPick: (v) => { a.lag = v; chg(); } }),
    chips({ label: vi ? "Cửa sổ" : "Window", options: [{ id: "expanding", label: label("window.expanding", lang) }, { id: "rolling", label: label("window.rolling", lang) }], value: a.window, onPick: (v) => { a.window = v; chg(); } }),
    chips({ label: vi ? "Hàm mất mát" : "Loss", options: [{ id: "se", label: label("loss.se", lang) }, { id: "ae", label: label("loss.ae", lang) }], value: a.loss, onPick: (v) => { a.loss = v; chg(); } }),
    slider({ label: vi ? "Cuối mẫu huấn luyện" : "Train ends", min: 2005, max: 2022, value: Number(a.split.slice(0, 4)), format: (v) => v + "-12", onInput: (v) => { a.split = `${v}-12-31`; chg(); } }),
  );
  const rst = resetLink(lang, !isDefaults(), () => resetToDefaults());
  if (rst) controls.append(rst);

  const fPath = figure({ title: "​", sub: "", height: 320, margin: { r: 70 } });
  const fCsfe = figure({ title: "​", sub: "", height: 320, margin: { r: 60 } });
  const fHeat = figure({ title: vi ? "Ở đâu AR và random walk khác nhau có ý nghĩa?" : "Where do AR and the random walk differ significantly?", sub: "", height: 200, margin: { l: 110, r: 10, t: 24, b: 26 } });
  const fRat = figure({ title: vi ? "Tỷ lệ RMSE: ai nhỏ hơn?" : "RMSE ratio: who is smaller?", sub: vi ? "Trái = AR tốt hơn; phải = random walk tốt hơn." : "Left = AR better; right = random walk better.", height: 190, margin: { l: 110, r: 30, t: 20, b: 26 } });
  viz.append(figs("two", fPath.root, fCsfe.root), el("div", { style: "height:28px" }), figs("two", fHeat.root, fRat.root));
  const legendHost = el("div");
  viz.append(legendHost);
  const yieldSec = el("div", { class: "yield-section", style: "margin-top:36px" });
  viz.append(yieldSec);
  const stepsHost = el("div");
  const formulaHost = el("div");
  const explainHost = el("div");
  viz.append(stepsHost, formulaHost, explainHost);

  function update() {
    const h = Number(a.h), cur = evalCell(fm, a, a.factor, h);
    const { dm, oos } = cur, pv = dm.p_value;
    const cells = [];
    for (const f of FIDS) for (const hh of HS) {
      const e = f === a.factor && hh === h ? cur : evalCell(fm, a, f, hh);
      cells.push({ f, h: hh, p: e.dm.p_value, dmv: e.dm.DM_stat, ratio: e.rmseAr / e.rmseRw });
    }
    const sig = cells.filter((q) => q.p < 0.05);
    const yRows = data.yieldForecast?.rows || [];
    const ySig = yRows.filter((r) => r.DM_pvalue < 0.05);
    const yRw = ySig.filter((r) => r.DM_stat > 0);
    const fname = label("factor", a.factor, lang);
    const sp = splitIndex(fm.dates, a.split);
    const nTrain = sp + 1, nTest = cur.n;

    let status = "supported", headline;
    if (pv >= 0.05) {
      headline = vi
        ? `AR <b>không</b> dự báo tốt hơn random walk cho ${fname} ${h} tháng tới (p = <span class="num">${fmt.p(pv)}</span>).`
        : `AR does <b>not</b> beat the random walk for ${fname} ${h} months ahead (p = <span class="num">${fmt.p(pv)}</span>).`;
    } else if (dm.DM_stat > 0) {
      status = "fragile";
      headline = vi ? `Ở cấu hình này random walk thắng AR có ý nghĩa thống kê.` : `In this config the random walk beats AR significantly.`;
    } else {
      status = "fragile";
      headline = vi ? `AR thắng random walk — nhưng xem cảnh báo đa kiểm định.` : `AR beats the random walk — but see the multiple-testing caveat.`;
    }

    page.setConclusion({
      status,
      headline,
      body: vi
        ? `<p>${term("RW", lang).outerHTML} dự báo tháng sau bằng đúng giá trị hôm nay. Nếu mô hình phức tạp hơn mà không thắng nó về sai số, mô hình đó chưa thêm được thông tin.</p>
           <p>${term("RMSE", lang).outerHTML} của AR là <span class="num">${fmt.n(cur.rmseAr, 3)}</span>, của random walk là <span class="num">${fmt.n(cur.rmseRw, 3)}</span>; ${term("DM", lang).outerHTML} cho p = <span class="num">${fmt.p(pv)}</span>.</p>
           <p>Trong 12 cấu hình (3 nhân tố × 4 chân trời) có <span class="num">${sig.length}</span> ô p dưới 0.05 (kỳ vọng ~0.6 do ngẫu nhiên). Theo kỳ hạn: <span class="num">${ySig.length}</span> ô p dưới 0.05 và <span class="num">${yRw.length}</span> trong số đó random walk thắng.</p>`
        : `<p>The ${term("RW", lang).outerHTML} forecasts next month as today’s value. If a richer model cannot beat it on error, it adds no forecast information.</p>
           <p>${term("RMSE", lang).outerHTML} AR <span class="num">${fmt.n(cur.rmseAr, 3)}</span> vs RW <span class="num">${fmt.n(cur.rmseRw, 3)}</span>; ${term("DM", lang).outerHTML} p = <span class="num">${fmt.p(pv)}</span>.</p>
           <p>Across 12 configs <span class="num">${sig.length}</span> cells have p below 0.05 (~0.6 expected by chance). By maturity: <span class="num">${ySig.length}</span> significant, of which <span class="num">${yRw.length}</span> favour RW.</p>`,
    });

    const actLbl = t(lang, "actual");
    fPath.setTitle(vi
      ? `Từ ${a.split.slice(0, 4)}, AR không đi sát thực tế hơn random walk (RMSE <span class="num">${fmt.n(cur.rmseAr, 2)}</span> so với <span class="num">${fmt.n(cur.rmseRw, 2)}</span>)`
      : `From ${a.split.slice(0, 4)}, AR is no closer than the random walk (RMSE <span class="num">${fmt.n(cur.rmseAr, 2)}</span> vs <span class="num">${fmt.n(cur.rmseRw, 2)}</span>)`);
    fPath.setSub(vi ? `Đường đen = thực tế; xanh = random walk; cam = AR. Dự báo tại t cho t+${h}.` : `Black = actual; blue = random walk; orange = AR.`);

    const dts = oos.idx.map((ti) => parseD(fm.dates[ti + h]));
    const rows = dts.map((d, i) => ({ x: d, act: oos.actual[i], ar: oos.arPred[i], rw: oos.rwPred[i], date: fm.dates[oos.idx[i] + h] }));
    lineChart(fPath, {
      series: [
        { values: rows.map((r) => ({ x: r.x, y: r.act })), color: "var(--ink)", width: 2, label: vi ? "Thực tế" : "Actual" },
        { values: rows.map((r) => ({ x: r.x, y: r.rw })), color: "var(--series-level)", width: 1.3, label: vi ? "Random walk" : "Random walk" },
        { values: rows.map((r) => ({ x: r.x, y: r.ar })), color: "var(--series-slope)", width: 1.3, label: "AR" },
      ],
      xDomain: d3.extent(rows, (r) => r.x), zero: true, yFmt: (d) => fmt.n(d, 1), bands: data.recessions.spells, hoverRows: rows,
      hoverFmt: (r) => `<b>${fmt.dateISO(r.date)}</b><br>${actLbl} <span class="m">${fmt.n(r.act)}</span><br>AR <span class="m">${fmt.n(r.ar)}</span><br>RW <span class="m">${fmt.n(r.rw)}</span>`,
    });

    let csum = 0;
    const cs = rows.map((r) => { csum += (r.rw - r.act) ** 2 - (r.ar - r.act) ** 2; return { x: r.x, y: csum, date: r.date }; });
    fCsfe.setTitle(vi ? "Đường CSFE đi xuống nghĩa là AR tích lũy thêm sai số" : "A falling CSFE means AR keeps adding extra error");
    fCsfe.setSub(vi ? "Σ(e²_RW − e²_AR). Đi lên = AR đang thắng." : "Σ(e²_RW − e²_AR). Up = AR ahead.");
    lineChart(fCsfe, {
      series: [{ values: cs, color: csum >= 0 ? "var(--series-slope)" : "var(--series-level)", width: 2 }],
      xDomain: d3.extent(cs, (r) => r.x), zero: true, yFmt: (d) => fmt.n(d, 1), bands: data.recessions.spells, hoverRows: cs,
      hoverFmt: (r) => `<b>${fmt.dateISO(r.date)}</b><br>CSFE <span class="m">${fmt.sg(r.y, 3)}</span>`,
      decorate: (g, { x, y, h: hh }) => {
        const l = cs[cs.length - 1];
        g.append("text").attr("class", "lbl").attr("x", 6).attr("y", 12).style("fill", "var(--ink-muted)").text(vi ? "↑ AR tốt hơn" : "↑ AR better");
        g.append("text").attr("class", "lbl").attr("x", 6).attr("y", hh - 6).style("fill", "var(--ink-muted)").text(vi ? "↓ RW tốt hơn" : "↓ RW better");
        g.append("text").attr("class", "lbl").attr("x", x(l.x) + 6).attr("y", y(l.y) + 4).style("fill", "var(--ink)").text(fmt.sg(l.y, 2));
      },
    });

    fHeat.setSub(vi
      ? `Màu theo tỷ lệ RMSE (xanh = AR tốt hơn). Viền đậm khi p dưới 0.05. ${sig.length}/12 ô đạt ngưỡng.`
      : `Colour by RMSE ratio (blue = AR better). Bold border when p < 0.05. ${sig.length}/12 significant.`);
    const T = tip();
    fHeat.render((g, { w, h: hh }) => {
      const x = d3.scaleBand().domain(HS).range([0, w]).padding(0.06);
      const yb = d3.scaleBand().domain(FIDS).range([0, hh]).padding(0.08);
      g.append("g").attr("class", "axis").attr("transform", `translate(0,${hh})`).call(d3.axisBottom(x).tickFormat((d) => label(`h.${d}`, lang)).tickSize(0)).select(".domain").remove();
      FIDS.forEach((f) => g.append("text").attr("x", -10).attr("y", yb(f) + yb.bandwidth() / 2 + 4).attr("text-anchor", "end").style("font-size", "12px").style("font-family", "var(--font-sans)").style("fill", "var(--ink)").text(label("factor", f, lang)));
      const grp = g.selectAll(null).data(cells).join("g").style("cursor", "pointer")
        .on("click", (ev, d) => { a.factor = d.f; a.h = d.h; persist(); ctx.onChange({}); })
        .on("mousemove", (ev, d) => T.show(`<b>${label("factor", d.f, lang)} · ${label(`h.${d.h}`, lang)}</b><br>p <span class="m">${fmt.p(d.p)}</span> · RMSE AR/RW <span class="m">${fmt.n(d.ratio, 3)}</span>`, ev))
        .on("mouseleave", T.hide);
      grp.append("rect").attr("x", (d) => x(d.h)).attr("y", (d) => yb(d.f)).attr("width", x.bandwidth()).attr("height", yb.bandwidth())
        .attr("fill", (d) => ratioFill(d.ratio))
        .attr("stroke", (d) => (d.p < 0.05 || (d.f === a.factor && d.h === h) ? "var(--ink)" : "var(--paper)"))
        .attr("stroke-width", (d) => (d.p < 0.05 ? 2.5 : d.f === a.factor && d.h === h ? 2 : 1));
      grp.append("text").attr("x", (d) => x(d.h) + x.bandwidth() / 2).attr("y", (d) => yb(d.f) + yb.bandwidth() / 2 + 4)
        .attr("text-anchor", "middle").style("font-size", "12px").style("font-family", "var(--font-sans)")
        .style("fill", (d) => heatTextColor(ratioFill(d.ratio)))
        .text((d) => fmt.p(d.p));
    });
    legendHost.replaceChildren(ratioLegend(vi));

    fRat.render((g, { w, h: hh }) => {
      const x = d3.scaleLinear().domain([Math.min(0.85, d3.min(cells, (q) => q.ratio) - 0.03), Math.max(1.15, d3.max(cells, (q) => q.ratio) + 0.03)]).range([0, w]);
      const yb = d3.scaleBand().domain(FIDS).range([0, hh]).padding(0.3);
      g.append("line").attr("class", "zero-line").attr("x1", x(1)).attr("x2", x(1)).attr("y1", 0).attr("y2", hh);
      g.append("g").attr("class", "axis").attr("transform", `translate(0,${hh})`).call(d3.axisBottom(x).ticks(5).tickSizeOuter(0));
      FIDS.forEach((f) => { g.append("text").attr("x", -10).attr("y", yb(f) + yb.bandwidth() / 2 + 4).attr("text-anchor", "end").style("font-size", "12px").style("fill", "var(--ink)").text(label("factor", f, lang)); });
      const cc = { 1: "#9aa0a6", 3: "#6a7f9a", 6: "#3a68a8", 12: "#2a78d6" };
      g.selectAll(null).data(cells).join("circle")
        .attr("cx", (d) => x(d.ratio)).attr("cy", (d) => yb(d.f) + yb.bandwidth() / 2)
        .attr("r", (d) => 3 + HS.indexOf(d.h) * 1.4)
        .attr("fill", (d) => (d.p < 0.05 ? cc[d.h] : "var(--paper)"))
        .attr("stroke", (d) => cc[d.h]).attr("stroke-width", 1.6)
        .on("mousemove", (ev, d) => T.show(`<b>${label("factor", d.f, lang)} · ${label(`h.${d.h}`, lang)}</b> · AR/RW <span class="m">${fmt.n(d.ratio, 3)}</span> · p <span class="m">${fmt.p(d.p)}</span>`, ev))
        .on("mouseleave", T.hide);
      g.append("text").attr("class", "lbl").attr("x", x(1) - 6).attr("y", 8).attr("text-anchor", "end").style("fill", "var(--ink-muted)").text(vi ? "← AR tốt hơn" : "← AR better");
      g.append("text").attr("class", "lbl").attr("x", x(1) + 6).attr("y", 8).style("fill", "var(--ink-muted)").text(vi ? "RW tốt hơn →" : "RW better →");
    });

    // Yield maturity — diverging by ratio
    yieldSec.innerHTML = "";
    yieldSec.append(el("h3", { class: "fig-title" }, vi ? "Theo từng kỳ hạn" : "By maturity"));
    yieldSec.append(el("p", { class: "fig-sub" }, vi
      ? "Ô ghi tỷ lệ RMSE AR/RW; màu xanh = AR tốt hơn, đỏ = random walk tốt hơn; viền đậm khi p dưới 0.05."
      : "Cell shows RMSE AR/RW; blue = AR better, red = RW better; bold border when p < 0.05."));
    if (!yRows.length) {
      yieldSec.append(el("p", { class: "callout" }, vi ? "Chưa có dữ liệu dự báo theo kỳ hạn." : "Maturity forecast file missing."));
    } else {
      const mats = [...new Map(yRows.map((r) => [r.tau_years, r.maturity])).entries()].sort((aa, bb) => aa[0] - bb[0]);
      const hs = [...new Set(yRows.map((r) => r.horizon))].sort((aa, bb) => aa - bb);
      const cell = (m, hh) => yRows.find((r) => r.maturity === m && r.horizon === hh);
      const fmtM = (m) => (/MO$/.test(m) ? m.replace("DGS", "").replace("MO", "M") : m.replace("DGS", "") + "Y");
      const fY = figure({ title: "", height: 60 + mats.length * 34, margin: { l: 54, r: 10, t: 26, b: 6 } });
      yieldSec.append(fY.root, ratioLegend(vi));
      fY.render((g, { w, h: H }) => {
        const x = d3.scaleBand().domain(hs).range([0, w]).padding(0.05);
        const y = d3.scaleBand().domain(mats.map((m) => m[1])).range([0, H]).padding(0.08);
        g.append("g").attr("class", "axis").call(d3.axisTop(x).tickFormat((d) => label(`h.${d}`, lang)).tickSize(0)).select(".domain").remove();
        g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickFormat(fmtM).tickSize(0)).select(".domain").remove();
        for (const [, m] of mats) for (const hhv of hs) {
          const r = cell(m, hhv); if (!r) continue;
          const ratio = r.RMSE_AR / r.RMSE_RW;
          const fill = ratioFill(ratio);
          const grp = g.append("g")
            .on("mousemove", (ev) => T.show(`<b>${fmtM(m)} · ${label(`h.${hhv}`, lang)}</b><br>AR/RW <span class="m">${fmt.n(ratio, 3)}</span> · p <span class="m">${fmt.p(r.DM_pvalue)}</span>`, ev))
            .on("mouseleave", T.hide);
          grp.append("rect").attr("x", x(hhv)).attr("y", y(m)).attr("width", x.bandwidth()).attr("height", y.bandwidth())
            .attr("fill", fill).attr("stroke", r.DM_pvalue < 0.05 ? "var(--ink)" : "var(--paper)").attr("stroke-width", r.DM_pvalue < 0.05 ? 2.5 : 1);
          grp.append("text").attr("x", x(hhv) + x.bandwidth() / 2).attr("y", y(m) + y.bandwidth() / 2 + 4)
            .attr("text-anchor", "middle").style("font-size", "12px").style("font-family", "var(--font-sans)")
            .style("fill", heatTextColor(fill)).text(fmt.n(ratio, 2));
        }
      });
    }

    stepsHost.replaceChildren(readingSteps(lang, vi ? [
      `Ta chia mẫu ở <span class="num">${a.split.slice(0, 7)}</span>: khoảng <span class="num">${nTrain}</span> tháng huấn luyện, <span class="num">${nTest}</span> điểm kiểm tra ngoài mẫu.`,
      `Mô hình AR được ước lượng với độ trễ <span class="num">${cur.p}</span> chọn bằng ${label("lag", a.lag, lang)}.`,
      `Mỗi tháng trong phần kiểm tra, cả hai mô hình dự báo <span class="num">${h}</span> tháng tới; random walk chỉ lặp lại giá trị hiện tại.`,
      `RMSE: AR <span class="num">${fmt.n(cur.rmseAr, 3)}</span>, random walk <span class="num">${fmt.n(cur.rmseRw, 3)}</span> — chênh khoảng <span class="num">${fmt.pct(Math.abs(cur.rmseAr / cur.rmseRw - 1), 1)}</span>.`,
      `Kiểm định Diebold–Mariano: thống kê <span class="num">${fmt.n(dm.DM_stat, 2)}</span>, p = <span class="num">${fmt.p(pv)}</span>.`,
      pv >= 0.05
        ? `Vì p lớn hơn 0.05, ta không bác bỏ giả thuyết hai mô hình chính xác như nhau.`
        : `Vì p dưới 0.05, có bằng chứng khác biệt — nhưng với 12 phép thử cần thận trọng đa kiểm định.`,
    ] : [
      `We split at <span class="num">${a.split.slice(0, 7)}</span>: about <span class="num">${nTrain}</span> training months and <span class="num">${nTest}</span> OOS points.`,
      `AR lag <span class="num">${cur.p}</span> chosen by ${label("lag", a.lag, lang)}.`,
      `Each test month, both models forecast <span class="num">${h}</span> months ahead; the random walk repeats today’s value.`,
      `RMSE: AR <span class="num">${fmt.n(cur.rmseAr, 3)}</span>, RW <span class="num">${fmt.n(cur.rmseRw, 3)}</span>.`,
      `Diebold–Mariano statistic <span class="num">${fmt.n(dm.DM_stat, 2)}</span>, p = <span class="num">${fmt.p(pv)}</span>.`,
      pv >= 0.05 ? `With p above 0.05 we do not reject equal accuracy.` : `With p below 0.05 there is a difference — but mind multiple testing across 12 cells.`,
    ]));

    formulaHost.replaceChildren(modelFormula(lang, "ar", vi
      ? `Cấu hình đang xem: ${fname}, ${label(`h.${h}`, lang)}, n = ${cur.n}, DM = ${fmt.n(dm.DM_stat, 3)}, p = ${fmt.p(pv)}.`
      : `Current: ${fname}, ${label(`h.${h}`, lang)}, n = ${cur.n}, DM = ${fmt.n(dm.DM_stat, 3)}, p = ${fmt.p(pv)}.`));

    explainHost.replaceChildren(
      explainBox(lang, {
        meaning: vi
          ? `<p>${term("RW", lang).outerHTML} = dự báo tháng sau bằng đúng giá trị hôm nay — mô hình ngây thơ nhất.</p><p>Nếu AR không thắng nó về sai số, AR chưa thêm thông tin dự báo.</p><p>Đường ${term("CSFE", lang).outerHTML} đi xuống nghĩa là AR liên tục tích lũy thêm sai số so với random walk.</p>`
          : `<p>The ${term("RW", lang).outerHTML} repeats today’s value — the most naïve forecast.</p><p>If AR cannot beat it on error, AR adds no forecast information.</p><p>A falling ${term("CSFE", lang).outerHTML} means AR keeps accumulating extra squared error.</p>`,
        confidence: vi
          ? `<p>Một điểm chia mẫu; đổi thanh “Cuối mẫu huấn luyện” để thấy độ nhạy.</p><p>12 phép thử không hiệu chỉnh đa kiểm định (Bonferroni: 0.05/12 = 0.0042).</p><p>Ở 40 cặp kỳ hạn × chân trời, các ô có ý nghĩa đều nghiêng về random walk.</p>`
          : `<p>Single split — move the train-end slider for sensitivity.</p><p>Twelve tests without multiple-testing correction (Bonferroni 0.0042).</p><p>Among maturity×horizon cells that are significant, all favour the random walk.</p>`,
        limits: vi
          ? `<ul><li>Sai số điểm không phải giá trị kinh tế của dự báo.</li><li>Không hiệu chỉnh đa kiểm định.</li><li>Kết quả phụ thuộc điểm chia mẫu.</li></ul>`
          : `<ul><li>Point forecast error is not economic value.</li><li>No multiple-testing correction.</li><li>Results depend on the split date.</li></ul>`,
      }),
      methodDetails(lang, {
        methodHtml: vi
          ? `<p>Cửa sổ ${label("window." + (a.window === "rolling" ? "rolling" : "expanding"), lang)}; hàm mất mát ${label("loss." + a.loss, lang)}. Chi tiết công thức và mã tái lập nằm ở tab Phương pháp.</p>`
          : `<p>Window ${label("window." + (a.window === "rolling" ? "rolling" : "expanding"), lang)}; loss ${label("loss." + a.loss, lang)}. Full formulas and reproduce code live on the Methods tab.</p>`,
      }),
    );
  }
  update();
}
