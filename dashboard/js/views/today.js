import { fitNsDay, NS_LAMBDA_DEFAULT } from "../engine/ns.js";
import { predictProbit } from "../engine/probit.js";
import { el, fmt, figure, figs, strip, axisY, endLabels, lineChart, tip } from "../ui/kit.js";
import { pageHero } from "../ui/conclusion.js";
import { explainBox, methodDetails, resetLink } from "../ui/glossary.js";
import { readingSteps } from "../ui/formulaCard.js";
import { modelFormula } from "../content/attach.js";
import { fill, pageCopy } from "../content/pages.js";
import { t } from "../i18n.js";

function nearestIdx(dates, iso) {
  let b = 0;
  for (let i = 0; i < dates.length; i++) if (dates[i] <= iso) b = i;
  return b;
}
function addMonths(iso, m) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + m);
  return d.toISOString().slice(0, 10);
}

export async function mountToday(ctx) {
  const { data, hero: heroEl, viz, controls, lang, isDefaults, resetToDefaults } = ctx;
  const vi = lang !== "en";
  const copy = pageCopy(lang).today;
  const y = data.yields, n = y.dates.length, last = n - 1, today = y.dates[last];
  const mi = (m) => y.maturities.findIndex((x) => Math.abs(x - m) < 1e-6);
  const i10 = mi(10), i2 = mi(2), i3m = mi(0.25);
  const nsIdx = y.maturities.map((m, i) => (Math.abs(m - 1 / 12) > 1e-6 ? i : -1)).filter((i) => i >= 0);
  const tau = nsIdx.map((i) => y.maturities[i]);
  const rowAt = (i) => nsIdx.map((j) => y.yields[j][i]);
  const idx1m = nearestIdx(y.dates, addMonths(today, -1));
  const idx1y = nearestIdx(y.dates, addMonths(today, -12));
  const y10 = y.yields[i10][last], y2 = y.yields[i2][last], y3m = y.yields[i3m][last];
  const s102 = y10 - y2, s103 = y10 - y3m;
  const g = data.probitGolden?.spread_10y2y_fixed;
  const pRec = g ? predictProbit(g.coef_const, g.coef, s102) : NaN;
  const fitToday = fitNsDay(tau, rowAt(last), NS_LAMBDA_DEFAULT);
  const rmseBp = fitToday ? fitToday.rmse * 100 : NaN;

  let lastInv = null;
  for (let i = last; i >= 0; i--) if (y.yields[i10][i] - y.yields[i2][i] < 0) { lastInv = y.dates[i]; break; }
  let lastInv3 = null;
  for (let i = last; i >= 0; i--) if (y.yields[i10][i] - y.yields[i3m][i] < 0) { lastInv3 = y.dates[i]; break; }

  const upward = s102 >= 0.15;
  const inverted = s102 < -0.05;
  const shape = inverted ? (vi ? "đảo ngược" : "inverted")
    : !upward ? (vi ? "phẳng" : "flat")
    : (vi ? "dốc lên" : "upward-sloping");

  pageHero(heroEl, {
    eyebrow: vi ? `01 · Hôm nay · ${fmt.dateText(today)}` : `01 · Today · ${fmt.dateISO(today)}`,
    title: t(lang, "h2Today"),
    status: "fragile",
    lang,
    headline: vi
      ? `Đường cong đang <b>${shape}</b>: lãi suất 10 năm <span class="num">${fmt.n(y10)}</span>% ${upward || inverted ? (s102 >= 0 ? "cao hơn" : "thấp hơn") : "gần bằng"} 2 năm <span class="num">${fmt.n(y2)}</span>% khoảng <span class="num">${fmt.n(Math.abs(s102))}</span> điểm %, và ${s103 >= 0 ? "cao hơn" : "thấp hơn"} 3 tháng khoảng <span class="num">${fmt.n(Math.abs(s103))}</span> điểm %.`
      : `The curve is <b>${shape}</b>: the 10-year yield <span class="num">${fmt.n(y10)}</span>% is ${s102 >= 0 ? "above" : "below"} the 2-year <span class="num">${fmt.n(y2)}</span>% by <span class="num">${fmt.n(Math.abs(s102))}</span> pp, and ${s103 >= 0 ? "above" : "below"} the 3-month by <span class="num">${fmt.n(Math.abs(s103))}</span> pp.`,
    body: vi
      ? `<p>Bình thường nhà đầu tư đòi lãi suất cao hơn khi cho vay lâu hơn, nên đường cong dốc lên. Khi lãi suất ngắn hạn vượt dài hạn, ta gọi là <i>đảo ngược</i>, và trong quá khứ tình trạng này thường đến trước suy thoái. Lần cuối 10Y−2Y âm là <span class="num">${lastInv ? fmt.dateText(lastInv) : "—"}</span>, 10Y−3M âm là <span class="num">${lastInv3 ? fmt.dateText(lastInv3) : "—"}</span>. Mô hình probit của đề án cho xác suất suy thoái trong 12 tháng tới là <span class="num">${fmt.pct(pRec)}</span>; đọc con số này như mức xếp hạng rủi ro chứ không phải xác suất chuẩn (xem trang Suy thoái).</p>`
      : `<p>Investors normally demand higher yields for longer loans, so the curve slopes up. When short rates exceed long rates we call it an <i>inversion</i>, which historically often precedes recessions. Last negative 10Y−2Y: <span class="num">${lastInv ? fmt.dateISO(lastInv) : "—"}</span>; 10Y−3M: <span class="num">${lastInv3 ? fmt.dateISO(lastInv3) : "—"}</span>. The project probit puts 12-month recession risk at <span class="num">${fmt.pct(pRec)}</span> — read as a ranking signal, not a calibrated probability (see Recession).</p>`,
  });

  const reset = resetLink(lang, !isDefaults(), () => resetToDefaults());
  if (reset) controls.append(reset);

  viz.append(strip([
    { k: "10Y", v: fmt.n(y10) + "%", d: vi ? `${fmt.sg(y10 - y.yields[i10][idx1m])} điểm % vs 1 tháng` : `${fmt.sg(y10 - y.yields[i10][idx1m])} pp vs 1M` },
    { k: "2Y", v: fmt.n(y2) + "%", d: vi ? `${fmt.sg(y2 - y.yields[i2][idx1m])} điểm % vs 1 tháng` : `${fmt.sg(y2 - y.yields[i2][idx1m])} pp vs 1M` },
    { k: "10Y − 2Y", v: fmt.sg(s102), cls: s102 < 0 ? "neg" : "", d: vi ? `Đảo ngược gần nhất: ${lastInv ? fmt.dateText(lastInv) : "—"}` : `Last inverted: ${lastInv || "—"}` },
    { k: "10Y − 3M", v: fmt.sg(s103), cls: s103 < 0 ? "neg" : "", d: vi ? `Đảo ngược gần nhất: ${lastInv3 ? fmt.dateText(lastInv3) : "—"}` : `Last inverted: ${lastInv3 || "—"}` },
  ]));

  const f1 = figure({
    title: vi
      ? `So sánh đường cong hôm nay với 1 tháng và 1 năm trước (RMSE hôm nay ${fmt.n(rmseBp, 1)} bp)`
      : `Today vs 1 month and 1 year ago (today’s RMSE ${fmt.n(rmseBp, 1)} bp)`,
    sub: vi ? "Đường liền: Nelson–Siegel khớp; chấm: quan sát." : "Solid: Nelson–Siegel fit; dots: observed.",
    height: 320, margin: { r: 78 },
  });
  const snaps = [
    { i: idx1y, c: "var(--ink-muted)", lbl: vi ? "1 năm trước" : "1Y ago", dash: "3 3", dots: false },
    { i: idx1m, c: "var(--series-level)", lbl: vi ? "1 tháng trước" : "1M ago", dots: false },
    { i: last, c: "var(--series-slope)", lbl: vi ? "Hôm nay" : "Today", w: 2.6, dots: true },
  ];
  f1.render((gg, { w, h }) => {
    const x = d3.scaleSqrt().domain([0.25, 30]).range([0, w]);
    const all = snaps.flatMap((s) => rowAt(s.i)).filter(Number.isFinite);
    const yy = d3.scaleLinear().domain([Math.min(...all) - 0.15, Math.max(...all) + 0.15]).nice().range([h, 0]);
    axisY(gg, yy, w, { tickFormat: (d) => fmt.n(d, 1) });
    gg.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`).call(d3.axisBottom(x).tickValues([0.25, 1, 2, 5, 10, 20, 30]).tickFormat(fmt.mat).tickSizeOuter(0));
    const grid = d3.range(0.25, 30.01, 0.25);
    const labs = [];
    for (const s of snaps) {
      const r = rowAt(s.i), f = fitNsDay(tau, r, NS_LAMBDA_DEFAULT);
      if (f) gg.append("path").datum(grid).attr("fill", "none").attr("stroke", s.c).attr("stroke-width", s.w || 1.5).attr("stroke-dasharray", s.dash || null).attr("d", d3.line().x((t) => x(t)).y((t) => yy(f.fitted(t))));
      if (s.dots) {
        gg.selectAll(null).data(tau.map((t, k) => [t, r[k]]).filter((d) => Number.isFinite(d[1]))).join("circle")
          .attr("cx", (d) => x(d[0])).attr("cy", (d) => yy(d[1])).attr("r", 3.2).attr("fill", s.c).attr("stroke", "var(--paper)").attr("stroke-width", 1);
      }
      labs.push({ x: x(30), y: yy(r[r.length - 1]), text: s.lbl, color: s.c });
    }
    endLabels(gg, labs);
    const T = tip();
    gg.append("rect").attr("width", w).attr("height", h).attr("fill", "transparent").on("mousemove", (ev) => {
      const [px] = d3.pointer(ev, gg.node()); const t0 = x.invert(px); let k = 0, bd = 1e9;
      tau.forEach((t, q) => { if (Math.abs(t - t0) < bd) { bd = Math.abs(t - t0); k = q; } });
      T.show(`<b>${fmt.mat(tau[k])}</b><br>` + snaps.map((s) => `${s.lbl}: <span class="m">${fmt.n(rowAt(s.i)[k], 2)}%</span>`).join("<br>"), ev);
    }).on("mouseleave", T.hide);
  });

  const rows = [];
  for (let i = 0; i < n; i++) {
    const v = y.yields[i10][i] - y.yields[i2][i];
    if (Number.isFinite(v)) rows.push({ x: new Date(y.dates[i]), y: v, d: y.dates[i] });
  }
  const f2 = figure({
    title: vi ? "Theo dõi spread 10Y−2Y từ 2000 kèm suy thoái NBER" : "Tracking the 10Y−2Y spread since 2000 with NBER recessions",
    sub: vi ? "Vùng xám: suy thoái. Dưới 0 = đảo ngược. Chỉ chấm điểm hôm nay." : "Shaded: recessions. Below zero = inversion. Only today’s point is dotted.",
    height: 320,
  });
  lineChart(f2, {
    series: [{ values: rows, color: "var(--series-slope)", width: 1.3 }],
    xDomain: d3.extent(rows, (d) => d.x), bands: data.recessions.spells, zero: true,
    yFmt: (d) => fmt.n(d, 1), ylabel: vi ? "điểm %" : "pp",
    hoverRows: rows, hoverFmt: (r) => `<b>${fmt.dateISO(r.d)}</b><br>10Y−2Y <span class="m">${fmt.sg(r.y)}</span>`,
    decorate: (gg, { x, y: sy }) => {
      const lr = rows[rows.length - 1];
      gg.append("circle").attr("cx", x(lr.x)).attr("cy", sy(lr.y)).attr("r", 4).attr("fill", "var(--series-slope)").attr("stroke", "var(--paper)").attr("stroke-width", 1.5);
    },
  });
  viz.append(figs("two", f1.root, f2.root));

  viz.append(readingSteps(lang, vi ? [
    `Ngày quan sát cuối: <span class="num">${fmt.dateText(today)}</span>.`,
    `Spread 10Y−2Y = <span class="num">${fmt.sg(s102)}</span> điểm % → hình dạng <b>${shape}</b>.`,
    `Sai số khớp Nelson–Siegel hôm nay ≈ <span class="num">${fmt.n(rmseBp, 1)}</span> bp.`,
    `Xác suất probit 12 tháng tới = <span class="num">${fmt.pct(pRec)}</span> (xếp hạng rủi ro, không phải xác suất chuẩn).`,
  ] : [
    `Latest observation: <span class="num">${fmt.dateISO(today)}</span>.`,
    `10Y−2Y spread = <span class="num">${fmt.sg(s102)}</span> pp → shape <b>${shape}</b>.`,
    `Today’s Nelson–Siegel fit error ≈ <span class="num">${fmt.n(rmseBp, 1)}</span> bp.`,
    `12-month probit probability = <span class="num">${fmt.pct(pRec)}</span> (ranking signal, not calibrated).`,
  ]));

  viz.append(modelFormula(lang, "ns", vi
    ? `Hôm nay: Level ≈ ${fmt.n(fitToday?.level)}, Slope ≈ ${fmt.n(fitToday?.slope)}, Curvature ≈ ${fmt.n(fitToday?.curvature)}, RMSE ${fmt.n(rmseBp, 1)} bp.`
    : `Today: Level ≈ ${fmt.n(fitToday?.level)}, Slope ≈ ${fmt.n(fitToday?.slope)}, Curvature ≈ ${fmt.n(fitToday?.curvature)}, RMSE ${fmt.n(rmseBp, 1)} bp.`));

  viz.append(explainBox(lang, {
    meaning: `<p>${copy.meaning.join("</p><p>")}</p>`,
    confidence: fill(copy.confidence, { rmse: fmt.n(rmseBp, 1) }),
    limits: copy.limits,
  }));
  viz.append(methodDetails(lang, {
    methodHtml: vi
      ? `<p>Chi tiết công thức và mã tái lập nằm ở tab <b>Phương pháp</b>.</p>`
      : `<p>Full formulas and reproduce code live on the <b>Methods</b> tab.</p>`,
  }));
}
