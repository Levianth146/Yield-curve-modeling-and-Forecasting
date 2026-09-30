import { el, fmt, figure, figs, chips, slider, axisX, axisY, tip, drawer } from "../ui/kit.js";
import { pageHero } from "../ui/conclusion.js";
import { explainBox, methodDetails, resetLink, term } from "../ui/glossary.js";
import { readingSteps } from "../ui/formulaCard.js";
import { modelFormula } from "../content/attach.js";
import { label } from "../content/labels.js";
import { t } from "../i18n.js";

const VAR_KEYS = ["cpi_mom_ann", "fed_funds", "level", "slope", "curvature"];
const VCOL = { cpi_mom_ann: "var(--series-b)", fed_funds: "var(--series-level)", level: "var(--series-level)", slope: "var(--series-slope)", curvature: "var(--series-curv)" };
const PRESETS = ["cpi_fed_lsc", "fed_cpi_lsc", "cpi_fed_slc", "lsc_cpi_fed", "cpi_lsc_fed", "fed_lsc_cpi"];
const LAGS = ["p2", "p4", "p6", "p12", "aic_port", "bic"];
const INFL = ["cpi_mom_ann_w2", "cpi_mom_ann_w0", "cpi_mom_ann_w5", "cpi_yoy"];
const I1 = ["adf", "force_fed_slope"];

const cellOf = (cfg, imp, res, h) => cfg.irf.find((r) => r.impulse === imp && r.response === res && r.h === h);
const varLabel = (id, lang) => label("var." + id, lang);

const lcFirst = (x) => x.charAt(0).toLowerCase() + x.slice(1);

export async function mountIrf(ctx) {
  const { state, data, hero: heroEl, controls, viz, lang, persist, isDefaults, resetToDefaults } = ctx;
  const vi = lang !== "en", s = state.irf;
  const page = pageHero(heroEl, {
    eyebrow: vi ? "04 · RQ3 · VAR / IRF" : "04 · RQ3 · VAR / IRF",
    title: t(lang, "h2Irf"),
    status: "fragile",
    lang,
    headline: "…",
    body: "…",
  });
  viz.innerHTML = `<p class="spin">${vi ? "Đang tải lưới IRF…" : "Loading IRF grid…"}</p>`;
  const grid = await data.loadIrf();
  viz.innerHTML = "";
  if (!grid?.configs?.length) {
    viz.append(el("p", { class: "callout" }, vi ? "Chưa có irf_grid.json." : "irf_grid.json missing."));
    return;
  }
  const ok = grid.configs.filter((c) => c.irf && !c.error);
  const chg = () => { persist(); update(); };
  if (!s.lagMode) s.lagMode = "p4";

  // Câu hỏi nghiên cứu: cú sốc vĩ mô (lạm phát, lãi suất Fed) tác động lên ba nhân tố của đường cong.
  const SHOCKS = ["fed_funds", "cpi_mom_ann"], RESPONSES = ["level", "slope", "curvature"];
  if (!SHOCKS.includes(s.impulse)) s.impulse = "fed_funds";
  if (!RESPONSES.includes(s.response)) s.response = "slope";
  s.shock = 1; // cú sốc cố định bằng một độ lệch chuẩn, đúng phương pháp của đề án
  const opt = (ids) => ids.map((id) => ({ id, label: varLabel(id, lang) }));
  controls.append(
    chips({ label: vi ? "Cú sốc từ" : "Shock to", options: opt(SHOCKS), value: s.impulse, onPick: (v) => { s.impulse = v; chg(); } }),
    chips({ label: vi ? "Phản ứng của" : "Response of", options: opt(RESPONSES), value: s.response, onPick: (v) => { s.response = v; chg(); } }),
    slider({ label: vi ? "Số tháng sau cú sốc" : "Months after the shock", min: 1, max: 24, value: s.h, format: (v) => v + (vi ? " tháng" : "M"), onInput: (v) => { s.h = v; chg(); } }),
  );
  const specBox = el("div");
  const mk = (lab, ids, key, prefix) => chips({
    label: lab,
    options: ids.map((id) => ({ id, label: label(`${prefix}.${id}`, lang) })),
    value: s[key],
    onPick: (v) => { s[key] = v; chg(); },
  });
  specBox.append(
    el("p", { class: "fig-note", html: vi
      ? "Mặc định là mô hình chính của đề án (đánh dấu “chính”). Mỗi nhóm dưới đây thay đổi một giả định của mô hình; biểu đồ “Độ bền qua các cấu hình” bên dưới cho thấy kết quả dưới toàn bộ 288 cách kết hợp."
      : "Defaults are the project's main model (marked “main”). Each group changes one modelling assumption; the robustness chart below shows the result under all 288 combinations." }),
    mk(vi ? "Thứ tự Cholesky" : "Cholesky order", PRESETS, "preset", "irf.preset"),
    mk(vi ? "Số độ trễ" : "Lags", LAGS, "lagMode", "irf.lag"),
    mk(vi ? "Cách đo lạm phát" : "Inflation measure", INFL, "infl", "irf.infl"),
    mk(vi ? "Xử lý tính dừng" : "Stationarity treatment", I1, "i1", "irf.i1"),
  );
  controls.append(drawer(vi ? "Kiểm định độ bền: đổi lựa chọn mô hình" : "Robustness: change model choices", specBox));
  const rst = resetLink(lang, !isDefaults(), () => resetToDefaults());
  if (rst) controls.append(rst);

  const fPath = figure({ title: "​", sub: "", height: 300, margin: { r: 70 } });
  const fShock = figure({
    title: vi ? "Độ lớn của cú sốc lãi suất Fed" : "What is the shock? (Fed → Fed)",
    sub: vi ? "Phản ứng của chính lãi suất Fed sau cú sốc bằng một độ lệch chuẩn; giá trị tại tháng 0 là độ lớn của cú sốc." : "Fed funds response to its own 1σ shock.",
    height: 220, margin: { r: 20 },
  });
  const fSpec = figure({ title: "​", sub: "", height: 300, margin: { r: 20 } });
  const fMulti = el("div", { class: "figs irf-multi" });
  const captionBelow = el("p", { class: "fig-caption-below" });
  const stepsHost = el("div");
  const formulaHost = el("div");
  const explainHost = el("div");
  viz.append(
    figs("two", fPath.root, fShock.root),
    el("div", { style: "height:24px" }),
    fSpec.root, captionBelow,
    el("div", { style: "height:24px" }),
    el("h3", { class: "fig-title" }, vi ? "Cùng cú sốc, mọi biến phản ứng" : "Same shock, every response"),
    el("p", { class: "fig-sub" }, vi ? "Biến đang chọn được hiển thị rộng hơn. Vùng tô: khoảng tin cậy 95%." : "Selected response spans two columns. Band: 95% CI."),
    fMulti, stepsHost, formulaHost, explainHost,
  );
  const T = tip();

  function pickCfg() {
    return ok.find((c) => c.preset === s.preset && c.lag_mode === (s.lagMode || "p4") && c.infl === s.infl && c.i1_mode === s.i1) || null;
  }

  function slopeNote(resp, v) {
    if (resp !== "slope") return "";
    if (v > 0) return vi
      ? " Vì Slope = ngắn − dài, tăng nghĩa là ngắn hạn tăng nhiều hơn dài hạn: đường cong bớt dốc / phẳng lại."
      : " Because Slope = short − long, a rise means short rates rise more than long rates: the curve flattens.";
    if (v < 0) return vi
      ? " Slope giảm nghĩa là đường cong dốc lên hơn (ngắn tăng ít hơn dài)."
      : " A fall in Slope means a steeper upward curve (short rises less than long).";
    return "";
  }

  function update() {
    const cfg = pickCfg(), K = Number(s.shock), h0 = Number(s.h);
    if (!cfg) {
      page.setConclusion({ status: "notSupported", headline: vi ? "Cấu hình này chưa được tính sẵn." : "This configuration is not precomputed.", body: "" });
      return;
    }
    const sig = cellOf(cfg, s.impulse, s.impulse, 0)?.irf || 1;
    const path = d3.range(0, 25).map((h) => cellOf(cfg, s.impulse, s.response, h)).filter(Boolean).map((c) => ({ h: c.h, v: c.irf * K, lo: c.lo * K, hi: c.hi * K }));
    const c0 = path.find((p) => p.h === h0);
    const strong = c0 && (c0.lo > 0 || c0.hi < 0);
    const port = cfg.portmanteau_p, portOk = port > 0.05;

    const pts = ok.map((c) => {
      const q = cellOf(c, s.impulse, s.response, h0);
      return q ? { v: q.irf * K, lo: q.lo * K, hi: q.hi * K, clean: c.stable && (c.portmanteau_p ?? 1) > 0.05, cur: c === cfg, c } : null;
    }).filter(Boolean).sort((a, b) => a.v - b.v);
    const pos = pts.filter((q) => q.lo > 0).length, neg = pts.filter((q) => q.hi < 0).length, mid = pts.length - pos - neg;
    const status = pos / pts.length >= 0.8 ? "supported" : "fragile";
    const rName = varLabel(s.response, lang);
    const delta = c0 ? fmt.yieldChange(c0.v) : "—";

    const basisTxt = vi
      ? `trong ${pts.length} cách kết hợp lựa chọn mô hình (thứ tự Cholesky, độ trễ, cách đo lạm phát, xử lý tính dừng), ${pos} cách cho phản ứng dương với khoảng tin cậy 95% không chứa 0 (${fmt.pct(pos / pts.length, 0)}), ${mid} cách không rõ ràng và ${neg} cách âm rõ. Kết luận được xem là vững khi tỷ lệ này đạt ít nhất 80%.`
      : `across ${pts.length} combinations of model choices (Cholesky order, lags, inflation measure, stationarity treatment), ${pos} give a positive response with a 95% interval excluding 0 (${fmt.pct(pos / pts.length, 0)}), ${mid} are unclear and ${neg} clearly negative. The conclusion is rated robust when this share is at least 80%.`;
    page.setConclusion({
      status,
      basis: basisTxt,
      headline: vi
        ? (strong
          ? `Một cú sốc ${lcFirst(varLabel(s.impulse, lang))} bằng một độ lệch chuẩn (≈ <span class="num">${fmt.n(sig, 2)} điểm %</span>) làm ${rName} ${c0.v > 0 ? "tăng" : "giảm"} <span class="num">${delta}</span> sau ${h0} tháng (khoảng tin cậy 95%: <span class="num">${fmt.n(c0.lo, 3)}</span> đến <span class="num">${fmt.n(c0.hi, 3)}</span>).`
          : `Cú sốc ${lcFirst(varLabel(s.impulse, lang))} bằng một độ lệch chuẩn không làm ${rName} thay đổi có ý nghĩa sau ${h0} tháng.`)
        : (strong
          ? `A one-standard-deviation ${varLabel(s.impulse, lang)} shock (≈ <span class="num">${fmt.n(sig, 2)} pp</span>) moves ${rName} by <span class="num">${delta}</span> after ${h0} months (95% CI: <span class="num">${fmt.n(c0.lo, 3)}</span> to <span class="num">${fmt.n(c0.hi, 3)}</span>).`
          : `A one-standard-deviation ${varLabel(s.impulse, lang)} shock does not significantly move ${rName} after ${h0} months.`),
      body: c0 ? (vi
        ? `<p>${slopeNote(s.response, c0.v)}</p><p>VAR ${portOk ? "không bác bỏ" : "còn"} phần dư trắng (${term("Portmanteau", lang).outerHTML} p = <span class="num">${fmt.p(port)}</span>).</p>`
        : `<p>${slopeNote(s.response, c0.v)} Holds in <span class="num">${pos}</span>/${pts.length} VAR specs; <span class="num">${mid}</span> unclear; <span class="num">${neg}</span> clearly negative.</p><p>Residuals ${portOk ? "look white" : "show autocorrelation"} (${term("Portmanteau", lang).outerHTML} p = <span class="num">${fmt.p(port)}</span>).</p>`) : "",
    });
    captionBelow.textContent = vi
      ? `${pos} dương rõ · ${mid} mơ hồ · ${neg} âm rõ (trên ${pts.length} cấu hình)`
      : `${pos} clearly + · ${mid} unclear · ${neg} clearly − (of ${pts.length} specs)`;

    fPath.setTitle(vi
      ? `Phản ứng ${rName} sau cú sốc ${varLabel(s.impulse, lang)} +${K}σ`
      : `${rName} response after a ${varLabel(s.impulse, lang)} +${K}σ shock`);
    fPath.setSub(vi ? "Đơn vị: điểm phần trăm. Vùng tô: khoảng tin cậy 95%." : "Units: percentage points. Band: 95% CI.");
    fPath.render((g, { w, h }) => {
      const x = d3.scaleLinear().domain([0, 24]).range([0, w]);
      const y = d3.scaleLinear().domain([d3.min(path, (d) => d.lo), d3.max(path, (d) => d.hi)]).nice().range([h, 0]);
      axisY(g, y, w, { tickFormat: (d) => fmt.n(d, 2), zero: true });
      axisX(g, x, h, { ticks: 8, tickFormat: (d) => d + "M" });
      g.append("path").datum(path).attr("fill", VCOL[s.response]).attr("opacity", 0.18).attr("d", d3.area().x((d) => x(d.h)).y0((d) => y(d.lo)).y1((d) => y(d.hi)));
      g.append("path").datum(path).attr("fill", "none").attr("stroke", VCOL[s.response]).attr("stroke-width", 2.4).attr("d", d3.line().x((d) => x(d.h)).y((d) => y(d.v)));
      g.append("line").attr("x1", x(h0)).attr("x2", x(h0)).attr("y1", 0).attr("y2", h).attr("stroke", "var(--ink)").attr("stroke-dasharray", "3 3");
      if (c0) g.append("circle").attr("cx", x(h0)).attr("cy", y(c0.v)).attr("r", 5).attr("fill", VCOL[s.response]).attr("stroke", "var(--paper)").attr("stroke-width", 1.5);
      g.append("rect").attr("width", w).attr("height", h).attr("fill", "transparent")
        .on("mousemove", (ev) => { const [px] = d3.pointer(ev, g.node()); const p = path[Math.max(0, Math.min(path.length - 1, Math.round(x.invert(px))))]; T.show(`<b>h = ${p.h}M</b><br><span class="m">${fmt.sg(p.v, 3)}</span> [${fmt.n(p.lo, 3)}; ${fmt.n(p.hi, 3)}]`, ev); })
        .on("mouseleave", T.hide);
    });

    const shockPath = d3.range(0, 25).map((h) => cellOf(cfg, "fed_funds", "fed_funds", h)).filter(Boolean).map((c) => ({ h: c.h, v: c.irf * K, lo: c.lo * K, hi: c.hi * K }));
    fShock.render((g, { w, h }) => {
      if (!shockPath.length) return;
      const x = d3.scaleLinear().domain([0, 24]).range([0, w]);
      const y = d3.scaleLinear().domain([d3.min(shockPath, (d) => d.lo), d3.max(shockPath, (d) => d.hi)]).nice().range([h, 0]);
      axisY(g, y, w, { tickFormat: (d) => fmt.n(d, 2), zero: true });
      axisX(g, x, h, { ticks: 6, tickFormat: (d) => d + "M" });
      g.append("path").datum(shockPath).attr("fill", VCOL.fed_funds).attr("opacity", 0.15).attr("d", d3.area().x((d) => x(d.h)).y0((d) => y(d.lo)).y1((d) => y(d.hi)));
      g.append("path").datum(shockPath).attr("fill", "none").attr("stroke", VCOL.fed_funds).attr("stroke-width", 2).attr("d", d3.line().x((d) => x(d.h)).y((d) => y(d.v)));
      g.append("text").attr("class", "lbl").attr("x", 4).attr("y", 14).style("fill", "var(--ink-muted)").text(`1σ ≈ ${fmt.n(sig * 100, 1)} bp`);
    });

    // B7: CI as area + estimate path + current config dot
    fSpec.setTitle(vi ? `Độ bền qua ${pts.length} cấu hình tại tháng ${h0}` : `Robustness across ${pts.length} specs at month ${h0}`);
    fSpec.setSub(vi ? "Mỗi điểm trên trục ngang là một cách kết hợp lựa chọn mô hình, sắp theo giá trị ước lượng. Vùng mờ: khoảng tin cậy 95%; chấm đen: cấu hình đang xem." : "Faint band: 95% CI; line: point estimate; black dot: current spec.");
    fSpec.render((g, { w, h }) => {
      const x = d3.scaleLinear().domain([0, Math.max(1, pts.length - 1)]).range([0, w]);
      const y = d3.scaleLinear().domain([d3.min(pts, (d) => d.lo), d3.max(pts, (d) => d.hi)]).nice().range([h, 0]);
      axisY(g, y, w, { tickFormat: (d) => fmt.n(d, 2), zero: true });
      axisX(g, x, h, { ticks: 6, tickFormat: (d) => String(Math.round(d) + 1) });
      g.append("path").datum(pts).attr("fill", "var(--ink)").attr("opacity", 0.12)
        .attr("d", d3.area().x((d, i) => x(i)).y0((d) => y(d.lo)).y1((d) => y(d.hi)));
      g.append("path").datum(pts).attr("fill", "none").attr("stroke", "var(--ink)").attr("stroke-width", 1.6)
        .attr("d", d3.line().x((d, i) => x(i)).y((d) => y(d.v)));
      const cur = pts.find((d) => d.cur);
      pts.forEach((d, i) => {
        if (!d.cur) g.append("circle").attr("cx", x(i)).attr("cy", y(d.v)).attr("r", 1.6).attr("fill", d.lo > 0 ? "var(--status-good)" : d.hi < 0 ? "var(--series-slope)" : "var(--ink-muted)").attr("opacity", 0.55);
      });
      if (cur) {
        const i = pts.indexOf(cur);
        g.append("circle").attr("cx", x(i)).attr("cy", y(cur.v)).attr("r", 5.5).attr("fill", "var(--ink)").attr("stroke", "var(--paper)").attr("stroke-width", 1.5);
        g.append("text").attr("class", "lbl").attr("x", x(i) + 8).attr("y", y(cur.v) - 8).style("fill", "var(--ink)")
          .text(vi ? "đang xem" : "current");
      }
      g.append("rect").attr("width", w).attr("height", h).attr("fill", "transparent")
        .on("mousemove", (ev) => {
          const [px] = d3.pointer(ev, g.node());
          const i = Math.max(0, Math.min(pts.length - 1, Math.round(x.invert(px))));
          const d = pts[i];
          T.show(`<b>${label("irf.preset." + d.c.preset, lang)}</b> · ${label("irf.lag." + d.c.lag_mode, lang)}<br><span class="m">${fmt.sg(d.v, 3)}</span> [${fmt.n(d.lo, 3)}; ${fmt.n(d.hi, 3)}]`, ev);
        })
        .on("mouseleave", T.hide);
    });

    // B6: selected spans 2 cols; 3 per row
    fMulti.innerHTML = "";
    fMulti.className = "figs irf-multi";
    cfg.order.forEach((r) => {
      const focused = r === s.response;
      const f = figure({
        title: `<span style="color:${VCOL[r]}">${varLabel(r, lang)}</span>`,
        height: focused ? 200 : 160,
        margin: { l: 40, r: 10, t: 8, b: 26 },
      });
      if (focused) f.root.classList.add("irf-focus");
      fMulti.append(f.root);
      const pp = d3.range(0, 25).map((hh) => cellOf(cfg, s.impulse, r, hh)).filter(Boolean).map((c) => ({ h: c.h, v: c.irf * K, lo: c.lo * K, hi: c.hi * K }));
      f.render((g, { w, h }) => {
        const x = d3.scaleLinear().domain([0, 24]).range([0, w]);
        const y = d3.scaleLinear().domain([d3.min(pp, (d) => d.lo), d3.max(pp, (d) => d.hi)]).nice().range([h, 0]);
        axisY(g, y, w, { ticks: 3, tickFormat: (d) => fmt.n(d, 2), zero: true });
        axisX(g, x, h, { ticks: 4, tickFormat: (d) => d + "M" });
        g.append("path").datum(pp).attr("fill", VCOL[r]).attr("opacity", 0.2).attr("d", d3.area().x((d) => x(d.h)).y0((d) => y(d.lo)).y1((d) => y(d.hi)));
        g.append("path").datum(pp).attr("fill", "none").attr("stroke", VCOL[r]).attr("stroke-width", focused ? 2.4 : 1.6).attr("d", d3.line().x((d) => x(d.h)).y((d) => y(d.v)));
        g.append("rect").attr("width", w).attr("height", h).attr("fill", "transparent").style("cursor", "pointer").on("click", () => { s.response = r; persist(); ctx.onChange({}); });
      });
    });

    stepsHost.replaceChildren(readingSteps(lang, vi ? [
      `Cấu hình: ${label("irf.preset." + s.preset, lang)}; ${label("irf.lag." + s.lagMode, lang)}; ${label("irf.infl." + s.infl, lang)}.`,
      `Một độ lệch chuẩn của cú sốc tương đương <span class="num">${fmt.n(sig * 100, 1)}</span> điểm cơ bản.`,
      c0 ? `Tại tháng <span class="num">${h0}</span>, ${rName} ${c0.v > 0 ? "tăng" : "giảm"} <span class="num">${delta}</span> (khoảng tin cậy 95%: ${fmt.n(c0.lo, 3)} đến ${fmt.n(c0.hi, 3)}).` : "Không có điểm tại chân trời đang chọn.",
      `Trên lưới: <span class="num">${pos}</span> dương rõ / <span class="num">${mid}</span> mơ hồ / <span class="num">${neg}</span> âm rõ.`,
      `Portmanteau p = <span class="num">${fmt.p(port)}</span> ${portOk ? "(phần dư không còn tự tương quan)" : "(phần dư còn tự tương quan)"}.`,
    ] : [
      `Spec: ${label("irf.preset." + s.preset, lang)}; ${label("irf.lag." + s.lagMode, lang)}; ${label("irf.infl." + s.infl, lang)}.`,
      `1σ shock ≈ <span class="num">${fmt.n(sig * 100, 1)}</span> bp; multiplier <span class="num">${K}</span>.`,
      c0 ? `At month <span class="num">${h0}</span>, ${rName} moves <span class="num">${delta}</span> (CI [${fmt.n(c0.lo, 3)}; ${fmt.n(c0.hi, 3)}]).` : "No point at the selected horizon.",
      `Across the grid: <span class="num">${pos}</span> clearly + / <span class="num">${mid}</span> unclear / <span class="num">${neg}</span> clearly −.`,
      `Portmanteau p = <span class="num">${fmt.p(port)}</span>.`,
    ]));

    formulaHost.replaceChildren(modelFormula(lang, "var", vi
      ? `Fed→Slope h=6 trên cấu hình hiện tại: ước lượng ${c0 ? fmt.n(c0.v, 3) : "—"}; lưới ${pos}/${pts.length} dương rõ.`
      : `Fed→Slope-style read: current estimate ${c0 ? fmt.n(c0.v, 3) : "—"}; grid ${pos}/${pts.length} clearly positive.`));

    explainHost.replaceChildren(
      explainBox(lang, {
        meaning: vi
          ? `<p>${term("IRF", lang).outerHTML} là đường phản ứng sau một cú sốc chuẩn hóa.</p><p>${term("Cholesky", lang).outerHTML}: biến xếp trước tác động tức thì lên biến xếp sau trong tháng.</p>${s.response === "slope" ? "<p>Slope tăng = đường cong bớt dốc.</p>" : ""}`
          : `<p>${term("IRF", lang).outerHTML} is the path after a unit shock.</p><p>${term("Cholesky", lang).outerHTML}: earlier variables affect later ones within the month.</p>${s.response === "slope" ? "<p>A rise in Slope flattens the curve.</p>" : ""}`,
        confidence: vi
          ? `Tỷ lệ cách kết hợp cho phản ứng dương rõ: <span class="num">${fmt.pct(pos / pts.length, 0)}</span>, so với ngưỡng 80% cần để xếp là kết luận vững.`
          : `Share clearly positive for this pair: <span class="num">${fmt.pct(pos / pts.length, 0)}</span> — project bar is 80%.`,
        limits: vi
          ? "<ul><li>Cholesky là giả định nhận diện, không chứng minh nhân quả.</li><li>Đổi thứ tự có thể đổi kết quả.</li></ul>"
          : "<ul><li>Cholesky is an identifying assumption, not proof of causality.</li><li>Reordering can change results.</li></ul>",
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
