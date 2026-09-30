import { el, fmt, figure, figs, strip, chips, axisX, axisY, lineChart, parseD, tip, table } from "../ui/kit.js";
import { pageHero } from "../ui/conclusion.js";
import { explainBox, methodDetails, resetLink, term } from "../ui/glossary.js";
import { readingSteps } from "../ui/formulaCard.js";
import { modelFormula } from "../content/attach.js";
import { label } from "../content/labels.js";
import { t } from "../i18n.js";

export async function mountVietnam(ctx) {
  const { state, data, hero: heroEl, controls, viz, lang, persist, isDefaults, resetToDefaults } = ctx;
  const vi = lang !== "en", vn = data.vn || {}, us = data.factorsMonthly;
  const grid = (vn.lambda_grid || []).map((r) => ({ l: Number(r.lambda ?? r.lam), r: Number(r.rmse_mean ?? r.rmse) })).filter((d) => Number.isFinite(d.l) && Number.isFinite(d.r)).sort((a, b) => a.l - b.l);
  const best = grid.length ? grid.reduce((a, b) => (b.r < a.r ? b : a)) : null;
  const lamVn = vn.lambda_selected ?? best?.l, US = vn.lambda_us ?? 0.7308;
  const atUs = (() => {
    if (!grid.length) return null;
    const i = grid.findIndex((d) => d.l >= US);
    if (i <= 0) return grid[Math.max(0, i)];
    const a = grid[i - 1], b = grid[i], k = (US - a.l) / (b.l - a.l);
    return { l: US, r: a.r + k * (b.r - a.r) };
  })();
  const cor = vn.correlations || {};
  const ar = vn.ar_vs_rw || [];
  const arSig = ar.filter((r) => Number(r.DM_pvalue) < 0.05).length;
  const nCommon = vn.n_common_months ?? cor.n ?? 104;

  pageHero(heroEl, {
    eyebrow: vi ? "06 · RQ5 · Việt Nam" : "06 · RQ5 · Vietnam",
    title: t(lang, "h2Vn"),
    status: "fragile",
    lang,
    headline: vi
      ? "Ba nhân tố Nelson–Siegel mô tả được đường cong Việt Nam, nhưng hành xử <b>khác</b> Mỹ."
      : "Nelson–Siegel factors describe Vietnam’s curve, but behaviour <b>differs</b> from the US.",
    body: vi
      ? `<p>${term("lambda", lang).outerHTML} tối ưu của VN là <span class="num">${fmt.n(lamVn, 2)}</span> (Mỹ 0.7308), cho sai số <span class="num">${fmt.n((best?.r ?? NaN) * 100, 1)} bp</span>; nếu dùng λ của Mỹ, sai số là <span class="num">${fmt.n((atUs?.r ?? NaN) * 100, 1)} bp</span>. Tương quan giữa nhân tố VN và Mỹ trên <span class="num">${nCommon}</span> tháng chung: Level <span class="num">${fmt.n(cor.corr_level, 2)}</span>, Slope <span class="num">${fmt.n(cor.corr_slope, 2)}</span>, Curvature <span class="num">${fmt.n(cor.corr_curvature, 2)}</span> (theo mức); theo thay đổi hàng tháng <span class="num">${fmt.n(cor.corr_level_diff, 2)}</span> / <span class="num">${fmt.n(cor.corr_slope_diff, 2)}</span> / <span class="num">${fmt.n(cor.corr_curvature_diff, 2)}</span>. Ở 12 ô AR so với random walk chỉ <span class="num">${arSig}</span> ô p &lt; 0.05.</p>`
      : `<p>VN best ${term("lambda", lang).outerHTML} is <span class="num">${fmt.n(lamVn, 2)}</span> (US 0.7308), RMSE <span class="num">${fmt.n((best?.r ?? NaN) * 100, 1)} bp</span> vs <span class="num">${fmt.n((atUs?.r ?? NaN) * 100, 1)} bp</span> at US λ. Level/Slope/Curvature correlations over <span class="num">${nCommon}</span> shared months: <span class="num">${fmt.n(cor.corr_level, 2)}</span> / <span class="num">${fmt.n(cor.corr_slope, 2)}</span> / <span class="num">${fmt.n(cor.corr_curvature, 2)}</span> in levels; diffs <span class="num">${fmt.n(cor.corr_level_diff, 2)}</span> / <span class="num">${fmt.n(cor.corr_slope_diff, 2)}</span> / <span class="num">${fmt.n(cor.corr_curvature_diff, 2)}</span>. Only <span class="num">${arSig}</span>/12 AR vs RW cells have p &lt; 0.05.</p>`,
  });

  viz.append(el("p", { class: "callout", html: vi
    ? "Nguồn Investing.com, giá tham khảo — không phải đường cong chính thức; 7 kỳ hạn 1–15Y."
    : "Investing.com reference quotes — not the official curve; 7 mats 1–15Y." }));

  if (Number.isFinite(cor.corr_level)) {
    // T4: full labels for level / Δ correlations
    viz.append(strip([
      { k: vi ? "Tương quan mức · Level" : "Level corr (levels)", v: fmt.n(cor.corr_level, 2), d: vi ? `Δ tháng: ${fmt.n(cor.corr_level_diff, 2)}` : `Monthly Δ: ${fmt.n(cor.corr_level_diff, 2)}` },
      { k: vi ? "Tương quan mức · Slope" : "Slope corr (levels)", v: fmt.n(cor.corr_slope, 2), d: vi ? `Δ tháng: ${fmt.n(cor.corr_slope_diff, 2)}` : `Monthly Δ: ${fmt.n(cor.corr_slope_diff, 2)}` },
      { k: vi ? "Tương quan mức · Curvature" : "Curvature corr (levels)", v: fmt.n(cor.corr_curvature, 2), d: vi ? `Δ tháng: ${fmt.n(cor.corr_curvature_diff, 2)}` : `Monthly Δ: ${fmt.n(cor.corr_curvature_diff, 2)}` },
      { k: vi ? "λ tối ưu VN" : "VN best λ", v: fmt.n(lamVn, 2), d: `vs US ${US}` },
    ]));
  }

  let fac = state.vn.factor || "slope";
  const rst = resetLink(lang, !isDefaults(), () => resetToDefaults());
  if (rst) controls.append(rst);

  const fLam = figure({
    title: vi ? "λ nào khớp đường cong VN tốt nhất?" : "Which λ fits Vietnam best?",
    sub: vi ? "RMSE trung bình (bp). Cam: tối ưu VN; xanh: λ Mỹ." : "Mean RMSE (bp). Orange: VN best; blue: US λ.",
    height: 300, margin: { r: 20 },
  });
  const fFac = figure({ title: "​", sub: "", height: 300, margin: { r: 70 } });
  const fHeat = figure({
    title: vi ? "Tỷ lệ ngày đứng giá theo năm và kỳ hạn" : "Share of stale quote days by year and maturity",
    sub: vi ? "Đậm hơn = nhiều ngày lợi suất không đổi so với hôm trước." : "Darker = more days with unchanged yields versus the previous day.",
    height: 300, margin: { l: 44, r: 10, b: 26 },
  });
  const fAr = el("div");
  const legendHost = el("div");
  const stepsHost = el("div");
  const formulaHost = el("div");
  const explainHost = el("div");
  viz.append(figs("two", fLam.root, fFac.root), el("div", { style: "height:28px" }), figs("two", fHeat.root, fAr), legendHost, stepsHost, formulaHost, explainHost);

  const facHost = el("div", { style: "margin:-8px 0 12px" });
  fFac.root.prepend(facHost);
  facHost.append(chips({
    label: vi ? "Nhân tố trong hình" : "Factor in chart",
    options: ["level", "slope", "curvature"].map((id) => ({ id, label: label("factor", id, lang) })),
    value: fac,
    onPick: (v) => { fac = v; state.vn.factor = v; persist(); drawFac(); },
  }));

  fLam.render((g, { w, h }) => {
    if (!grid.length) return;
    const x = d3.scaleLinear().domain(d3.extent(grid, (d) => d.l)).range([0, w]);
    const y = d3.scaleLinear().domain([0, d3.max(grid, (d) => d.r * 100) * 1.05]).nice().range([h, 0]);
    axisY(g, y, w, { tickFormat: (d) => fmt.n(d, 0), label: "bp" });
    axisX(g, x, h, { ticks: 6 });
    g.append("path").datum(grid).attr("fill", "none").attr("stroke", "var(--ink)").attr("stroke-width", 1.8).attr("d", d3.line().x((d) => x(d.l)).y((d) => y(d.r * 100)));
    if (best) {
      g.append("circle").attr("cx", x(best.l)).attr("cy", y(best.r * 100)).attr("r", 5).attr("fill", "var(--series-b)");
      g.append("text").attr("class", "lbl").attr("x", x(best.l) + 8).attr("y", y(best.r * 100) - 6).style("fill", "var(--series-b)").text(vi ? `tối ưu ${fmt.n(best.l, 2)}` : `best ${fmt.n(best.l, 2)}`);
    }
    if (atUs) {
      g.append("circle").attr("cx", x(atUs.l)).attr("cy", y(atUs.r * 100)).attr("r", 5).attr("fill", "var(--series-level)");
      g.append("text").attr("class", "lbl").attr("x", x(atUs.l) + 8).attr("y", y(atUs.r * 100) + 14).style("fill", "var(--series-level)").text("0.7308");
    }
  });

  function drawFac() {
    const name = label("factor", fac, lang);
    const vf = (vn.factors_monthly || []).map((r) => ({ x: parseD(r.date), y: r[fac], date: r.date })).filter((d) => Number.isFinite(d.y));
    const uMap = new Map((us?.dates || []).map((d, i) => [String(d).slice(0, 7), us.columns?.[fac]?.[i]]));
    const uf = vf.map((r) => ({ x: r.x, y: uMap.get(String(r.date).slice(0, 7)), date: r.date })).filter((d) => Number.isFinite(d.y));
    fFac.setTitle(vi ? `${name}: so sánh VN và Mỹ cùng kỳ` : `${name}: Vietnam vs US over the shared sample`);
    fFac.setSub(vi ? `VN λ=${fmt.n(lamVn, 2)}; Mỹ λ=${US}.` : `VN λ=${fmt.n(lamVn, 2)}; US λ=${US}.`);
    lineChart(fFac, {
      series: [
        { values: vf, color: "var(--series-slope)", label: "VN", width: 2 },
        { values: uf, color: "var(--series-level)", label: vi ? "Mỹ" : "US", width: 2 },
      ],
      xDomain: d3.extent(vf, (d) => d.x), zero: true, yFmt: (d) => fmt.n(d, 0), ylabel: "%",
      hoverRows: vf.map((r) => ({ ...r, us: uMap.get(String(r.date).slice(0, 7)) })),
      hoverFmt: (r) => `<b>${r.date}</b><br>VN <span class="m">${fmt.n(r.y)}</span><br>US <span class="m">${fmt.n(r.us)}</span>`,
    });
  }
  drawFac();

  // B10: stale heatmap + legend 0–60%
  const hm = vn.stale_heatmap;
  legendHost.replaceChildren();
  if (hm?.years?.length) {
    fHeat.render((g, { w, h }) => {
      const x = d3.scaleBand().domain(hm.maturities.map((m) => fmt.mat(m))).range([0, w]).padding(0.05);
      const yb = d3.scaleBand().domain(hm.years).range([0, h]).padding(0.05);
      const c = d3.scaleSequential(d3.interpolateRgb("#f7f6f2", "#b83232")).domain([0, 0.6]);
      const T = tip();
      hm.years.forEach((yr, i) => hm.maturities.forEach((m, j) => {
        const v = hm.values[i][j]; if (v == null) return;
        g.append("rect").attr("x", x(fmt.mat(m))).attr("y", yb(yr)).attr("width", x.bandwidth()).attr("height", yb.bandwidth()).attr("fill", c(Math.min(v, 0.6)))
          .on("mousemove", (ev) => T.show(`<b>${yr} · ${fmt.mat(m)}</b><br>${fmt.pct(v, 0)}`, ev)).on("mouseleave", T.hide);
      }));
      g.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).tickSize(0)).select(".domain").remove();
      g.append("g").attr("class", "axis").call(d3.axisLeft(yb).tickSize(0)).select(".domain").remove();
    });
    legendHost.append(el("div", { class: "heat-legend" },
      el("span", {}, "0%"),
      el("span", { class: "heat-grad stale", title: "0–60%" }),
      el("span", {}, "60%"),
      el("span", {}, vi ? "· Đậm hơn = nhiều ngày lợi suất không đổi so với hôm trước" : "· Darker = more unchanged quote days"),
    ));
  }

  fAr.append(
    el("h3", { class: "fig-title" }, vi ? "AR so với random walk ở Việt Nam" : "AR versus random walk in Vietnam"),
    el("p", { class: "fig-sub" }, vi ? "Mỗi ô chỉ 21–32 quan sát ngoài mẫu — sức kiểm định thấp." : "Each cell has only 21–32 OOS points — low power."),
    table(
      [
        { h: vi ? "Nhân tố" : "Factor", f: (r) => label("factor", r.factor, lang) },
        { h: vi ? "Chân trời" : "Horizon", f: (r) => label(`h.${r.horizon}`, lang) },
        { h: "n", f: (r) => r.n_obs },
        { h: "AR/RW", f: (r) => fmt.n(r.RMSE_AR / r.RMSE_RW, 3) },
        { h: "p", f: (r) => fmt.p(Number(r.DM_pvalue)) },
      ],
      ar,
    ),
  );

  stepsHost.replaceChildren(readingSteps(lang, vi ? [
    `λ tối ưu VN = <span class="num">${fmt.n(lamVn, 2)}</span> (RMSE <span class="num">${fmt.n((best?.r ?? NaN) * 100, 1)}</span> bp) so với λ Mỹ 0.7308 (<span class="num">${fmt.n((atUs?.r ?? NaN) * 100, 1)}</span> bp).`,
    `Tương quan mức Level/Slope/Curvature: <span class="num">${fmt.n(cor.corr_level, 2)}</span> / <span class="num">${fmt.n(cor.corr_slope, 2)}</span> / <span class="num">${fmt.n(cor.corr_curvature, 2)}</span>.`,
    `Tương quan Δ: <span class="num">${fmt.n(cor.corr_level_diff, 2)}</span> / <span class="num">${fmt.n(cor.corr_slope_diff, 2)}</span> / <span class="num">${fmt.n(cor.corr_curvature_diff, 2)}</span>.`,
    `AR vs RW: <span class="num">${arSig}</span>/${ar.length} ô có p &lt; 0.05.`,
  ] : [
    `VN best λ = <span class="num">${fmt.n(lamVn, 2)}</span> (RMSE <span class="num">${fmt.n((best?.r ?? NaN) * 100, 1)}</span> bp) vs US 0.7308 (<span class="num">${fmt.n((atUs?.r ?? NaN) * 100, 1)}</span> bp).`,
    `Level correlations: <span class="num">${fmt.n(cor.corr_level, 2)}</span> / <span class="num">${fmt.n(cor.corr_slope, 2)}</span> / <span class="num">${fmt.n(cor.corr_curvature, 2)}</span>.`,
    `Δ correlations: <span class="num">${fmt.n(cor.corr_level_diff, 2)}</span> / <span class="num">${fmt.n(cor.corr_slope_diff, 2)}</span> / <span class="num">${fmt.n(cor.corr_curvature_diff, 2)}</span>.`,
    `AR vs RW: <span class="num">${arSig}</span>/${ar.length} cells with p &lt; 0.05.`,
  ]));

  formulaHost.replaceChildren(modelFormula(lang, "vn", vi
    ? `λ_VN = ${fmt.n(lamVn, 2)}; corr mức Level ${fmt.n(cor.corr_level, 2)}.`
    : `λ_VN = ${fmt.n(lamVn, 2)}; Level corr ${fmt.n(cor.corr_level, 2)}.`));

  explainHost.replaceChildren(
    explainBox(lang, {
      meaning: vi
        ? "NS vẫn khớp được với 7 kỳ hạn, nhưng λ và tương quan với Mỹ khác rõ — mức lãi suất VN không đi cùng Mỹ."
        : "NS still fits with 7 mats, but λ and US correlation differ sharply — VN levels do not co-move with the US.",
      confidence: vi
        ? "Mẫu AR ngoài mẫu rất ngắn — sức kiểm định thấp."
        : "Very short AR OOS sample — low test power.",
      limits: vi
        ? "<ul><li>Không so sánh mức tuyệt đối VN–Mỹ.</li><li>λ của VN chọn trên chính mẫu này nên fit tốt hơn là điều hiển nhiên.</li><li>Nhiều ngày đứng giá.</li></ul>"
        : "<ul><li>No absolute VN–US level comparison.</li><li>VN λ is chosen on this sample, so a better fit is expected.</li><li>Many stale quote days.</li></ul>",
    }),
    methodDetails(lang, {
      methodHtml: vi
        ? `<p>Chi tiết công thức và mã tái lập nằm ở tab Phương pháp.</p>`
        : `<p>Full formulas and reproduce code live on the Methods tab.</p>`,
    }),
  );
}
