import { evaluateClaims } from "../engine/claims.js";
import { splitProbitRows, evaluateProbitOos } from "../engine/probit.js";
import { REPORT } from "../reportFacts.js";
import { el, fmt } from "../ui/kit.js";
import { pageHero } from "../ui/conclusion.js";
import { t } from "../i18n.js";

const ST = {
  supported: ["✓", "claim-supported", "statusSupported"],
  fragile: ["!", "claim-fragile", "statusFragile"],
  notSupported: ["×", "claim-not", "statusNotSupported"],
};

/** B8: draw at measured client width like figure(). */
function svgHost(h = 72) {
  const box = el("div", { class: "summary-mini" });
  const redraws = [];
  const api = {
    root: box,
    render(draw) {
      const run = () => {
        if (!box.clientWidth) { requestAnimationFrame(run); return; }
        const W = Math.max(240, box.clientWidth);
        box.innerHTML = "";
        const svg = d3.create("svg").attr("viewBox", `0 0 ${W} ${h}`).attr("width", "100%").style("display", "block");
        draw(svg, W, h);
        box.append(svg.node());
      };
      run();
      const onRz = () => run();
      window.addEventListener("resize", onRz);
      redraws.push(() => window.removeEventListener("resize", onRz));
    },
  };
  return api;
}

function pStrip(ps, thr) {
  const host = svgHost(64);
  host.render((s, W) => {
    const x = d3.scaleLinear().domain([0, 1]).range([8, W - 8]);
    s.append("line").attr("x1", 8).attr("x2", W - 8).attr("y1", 40).attr("y2", 40).attr("stroke", "var(--ink-muted)");
    s.append("line").attr("x1", x(thr)).attr("x2", x(thr)).attr("y1", 18).attr("y2", 50).attr("stroke", "var(--status-serious)").attr("stroke-dasharray", "2 2");
    ps.forEach((p, i) => s.append("circle").attr("cx", x(Math.min(1, p))).attr("cy", 40 + ((i % 3) - 1) * 7).attr("r", 4.5).attr("fill", p < thr ? "var(--status-serious)" : "var(--ink)").attr("opacity", 0.8).attr("stroke", "var(--paper)"));
    s.append("text").attr("x", 8).attr("y", 14).attr("class", "lbl").style("fill", "var(--ink-muted)").style("font-size", "11px").text("p");
  });
  return host.root;
}
function barsThr(vals, labels, thr, max = 1) {
  const H = 24 * vals.length + 18;
  const host = svgHost(H);
  host.render((s, W) => {
    const x = d3.scaleLinear().domain([0, max]).range([70, W - 8]);
    vals.forEach((v, i) => {
      s.append("text").attr("x", 0).attr("y", 22 + i * 24).attr("class", "lbl").style("fill", "var(--ink-secondary)").style("stroke", "none").style("font-size", "11px").text(labels[i]);
      s.append("rect").attr("x", 70).attr("y", 10 + i * 24).attr("height", 16).attr("width", Math.max(0, x(v) - 70)).attr("fill", v < thr ? "var(--series-slope)" : "var(--series-level)").attr("opacity", 0.85);
      s.append("text").attr("x", x(v) + 5).attr("y", 22 + i * 24).attr("class", "lbl").style("fill", "var(--ink)").style("stroke", "none").style("font-size", "11px").text(fmt.n(v, 2));
    });
    s.append("line").attr("x1", x(thr)).attr("x2", x(thr)).attr("y1", 2).attr("y2", H - 6).attr("stroke", "var(--ink)").attr("stroke-dasharray", "3 2");
  });
  return host.root;
}
function auc_bss(auc, sk) {
  const host = svgHost(88);
  host.render((s, W) => {
    const xa = d3.scaleLinear().domain([0.5, 1]).range([70, W - 8]);
    const xb = d3.scaleLinear().domain([-0.3, 0.3]).range([70, W - 8]);
    s.append("text").attr("x", 0).attr("y", 24).attr("class", "lbl").style("stroke", "none").style("fill", "var(--ink-secondary)").style("font-size", "11px").text("AUC");
    s.append("rect").attr("x", 70).attr("y", 10).attr("height", 18).attr("width", Math.max(0, xa(auc) - 70)).attr("fill", "var(--series-level)").attr("opacity", 0.85);
    s.append("text").attr("x", xa(auc) + 5).attr("y", 24).attr("class", "lbl").style("stroke", "none").style("fill", "var(--ink)").style("font-size", "11px").text(fmt.n(auc, 3));
    s.append("text").attr("x", 0).attr("y", 66).attr("class", "lbl").style("stroke", "none").style("fill", "var(--ink-secondary)").style("font-size", "11px").text("BSS");
    s.append("rect").attr("x", Math.min(xb(0), xb(sk))).attr("y", 52).attr("height", 18).attr("width", Math.abs(xb(sk) - xb(0))).attr("fill", sk < 0 ? "var(--series-slope)" : "var(--status-good)").attr("opacity", 0.85);
    s.append("line").attr("x1", xb(0)).attr("x2", xb(0)).attr("y1", 44).attr("y2", 78).attr("stroke", "var(--ink)");
    s.append("text").attr("x", sk < 0 ? xb(sk) - 5 : xb(sk) + 5).attr("text-anchor", sk < 0 ? "end" : "start").attr("y", 66).attr("class", "lbl").style("stroke", "none").style("fill", "var(--ink)").style("font-size", "11px").text(fmt.sgpct(sk));
  });
  return host.root;
}
function splitBar(parts) {
  const host = svgHost(58);
  host.render((s, W) => {
    const tot = d3.sum(parts, (p) => p.n); let x0 = 0;
    const barW = Math.max(120, W - 16);
    parts.forEach((p) => {
      const w = (p.n / tot) * barW;
      s.append("rect").attr("x", 8 + x0).attr("y", 10).attr("width", w).attr("height", 22).attr("fill", p.c);
      if (w > 28) s.append("text").attr("x", 8 + x0 + 6).attr("y", 25).attr("class", "lbl").style("stroke", "none").style("fill", "#fff").style("font-size", "11px").text(p.n);
      x0 += w;
    });
    parts.forEach((p, i) => s.append("text").attr("x", 8 + i * Math.min(150, W / 3)).attr("y", 50).attr("class", "lbl").style("stroke", "none").style("fill", "var(--ink-secondary)").style("font-size", "11px").text(p.l));
  });
  return host.root;
}

const LINKS = { C1: "curve", C2: "arena", C3: "irf", C4: "probit", C5: "vietnam" };

export async function mountSummary(ctx) {
  const { data, hero: heroEl, viz, lang } = ctx;
  const vi = lang !== "en";
  const main = data.arGolden?.main || [], slope12 = main.find((r) => r.factor === "slope" && Number(r.horizon) === 12);
  const arP = main.map((r) => Number(r.DM_pvalue)).filter(Number.isFinite);
  const nSig = arP.filter((p) => p < 0.05).length;
  const sigShare = nSig / (arP.length || 1);
  const grid = await data.loadIrf();
  const cfgs = grid?.configs?.filter((c) => c.irf && !c.error) || [];
  const at = (c, h) => c.irf.find((r) => r.impulse === "fed_funds" && r.response === "slope" && r.h === h);
  const def = cfgs.find((c) => c.default) || cfgs[0];
  const fedCells = def ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => at(def, h)).filter(Boolean) : [];
  const g6 = cfgs.map((c) => at(c, 6)).filter(Boolean);
  const pos = g6.filter((q) => q.lo > 0).length, neg = g6.filter((q) => q.hi < 0).length;
  const { train, test } = splitProbitRows(data.probitDataset.rows, "1998-12", "2000-01", true);
  const pm = evaluateProbitOos(train, test);
  const vnRows = data.vn?.ar_vs_rw || [];
  const vnSig = vnRows.filter((r) => Number(r.DM_pvalue) < 0.05).length;
  const results = {
    factorCorr: Math.max(REPORT.nls.corrLevel, REPORT.nls.corrSlope, REPORT.nls.corrCurv),
    dmP: slope12?.DM_pvalue,
    specShareSig: sigShare,
    fedSlopeCells: fedCells,
    irfSharePos: cfgs.length ? pos / cfgs.length : null,
    auc: pm.auc,
    bss: pm.bss,
    vnArRows: vnRows,
  };
  const items = evaluateClaims(lang, results).map((i) => ({ id: i.id, status: i.status }));
  const by = Object.fromEntries(items.map((i) => [i.id, i]));
  const nSup = items.filter((i) => i.status === "supported").length;
  const nFrag = items.filter((i) => i.status === "fragile").length;
  const cell6 = at(def, 6);

  pageHero(heroEl, {
    eyebrow: vi ? "07 · Tổng kết" : "07 · Summary",
    title: t(lang, "h2Summary"),
    status: nSup >= 3 ? "supported" : "fragile",
    lang,
    headline: vi
      ? `<span class="num">${nSup}</span> trên 5 kết luận đứng vững, <span class="num">${nFrag}</span> mỏng manh.`
      : `<span class="num">${nSup}</span> of 5 claims stand, <span class="num">${nFrag}</span> fragile.`,
    body: vi
      ? "Mỗi thẻ tính lại từ dữ liệu dashboard. “Mỏng manh” = đúng ở cấu hình đề án nhưng yếu khi đổi đặc tả lân cận."
      : "Each card is recomputed from dashboard data. “Fragile” = holds at the report spec but weakens nearby.",
  });

  const titles = {
    C1: vi ? "NLS fit khít hơn nhưng nhân tố bất ổn" : "NLS fits tighter but factors are unstable",
    C2: vi ? "AR không thắng random walk" : "AR does not beat the random walk",
    C3: vi ? "Cú sốc Fed nâng Slope" : "A Fed shock lifts Slope",
    C4: vi ? "Probit: xếp hạng tốt, hiệu chuẩn kém" : "Probit: ranks well, calibrates poorly",
    C5: vi ? "Việt Nam: AR cũng không thắng RW" : "Vietnam: AR does not beat RW either",
  };

  // T9: full sentences, not log strings
  const caps = {
    C1: vi
      ? `Trên ${REPORT.nls.n} ngày NLS so với OLS, tương quan Level/Slope/Curvature chỉ ${fmt.n(REPORT.nls.corrLevel, 2)} / ${fmt.n(REPORT.nls.corrSlope, 2)} / ${fmt.n(REPORT.nls.corrCurv, 2)} — dưới ngưỡng ổn định 0.6 ở mọi nhân tố. Vì vậy đề án giữ λ cố định.`
      : `On ${REPORT.nls.n} NLS vs OLS days, Level/Slope/Curvature correlations are only ${fmt.n(REPORT.nls.corrLevel, 2)} / ${fmt.n(REPORT.nls.corrSlope, 2)} / ${fmt.n(REPORT.nls.corrCurv, 2)} — below the 0.6 stability bar for every factor. The project keeps fixed λ.`,
    C2: vi
      ? `Ở dự báo Slope 12 tháng, AR không hơn random walk (p = ${fmt.p(slope12?.DM_pvalue)}); ${nSig}/12 cấu hình có p dưới 0.05.`
      : `At the Slope 12-month forecast, AR does not beat the random walk (p = ${fmt.p(slope12?.DM_pvalue)}); ${nSig}/12 configurations have p below 0.05.`,
    C3: vi
      ? `Một cú sốc Fed +1σ làm Slope tăng ${fmt.n(cell6?.irf, 3)} điểm % sau 6 tháng (CI [${fmt.n(cell6?.lo, 3)}; ${fmt.n(cell6?.hi, 3)}]); ${pos}/${g6.length} cấu hình dương rõ — dưới ngưỡng 80% nên xếp mỏng manh.`
      : `A Fed +1σ shock lifts Slope by ${fmt.n(cell6?.irf, 3)} pp after 6 months (CI [${fmt.n(cell6?.lo, 3)}; ${fmt.n(cell6?.hi, 3)}]); ${pos}/${g6.length} specs are clearly positive — below the 80% bar, so Fragile.`,
    C4: vi
      ? `Đảo ngược xếp hạng rủi ro tốt (AUC ${fmt.n(pm.auc, 3)}) nhưng xác suất kém hơn tần suất nền (BSS ${fmt.sgpct(pm.bss)}).`
      : `Inversion ranks risk well (AUC ${fmt.n(pm.auc, 3)}) but probabilities underperform the base rate (BSS ${fmt.sgpct(pm.bss)}).`,
    C5: vi
      ? `Trên ${vnRows.length} ô AR so với random walk ở Việt Nam, chỉ ${vnSig} ô có p dưới 0.05, mỗi ô chỉ 21–32 quan sát ngoài mẫu.`
      : `Across ${vnRows.length} Vietnam AR vs random-walk cells, only ${vnSig} have p below 0.05, each with only 21–32 OOS observations.`,
  };

  const cards = [
    { id: "C1", viz: barsThr([REPORT.nls.corrLevel, REPORT.nls.corrSlope, REPORT.nls.corrCurv], ["Level", "Slope", "Curvature"], 0.6) },
    { id: "C2", viz: pStrip(arP, 0.05) },
    { id: "C3", viz: splitBar([{ n: pos, c: "var(--status-good)", l: vi ? "dương rõ" : "positive" }, { n: g6.length - pos - neg, c: "var(--ink-muted)", l: vi ? "mơ hồ" : "unclear" }, { n: neg, c: "var(--series-slope)", l: vi ? "âm rõ" : "negative" }]) },
    { id: "C4", viz: auc_bss(pm.auc, pm.bss) },
    { id: "C5", viz: pStrip(vnRows.map((r) => Number(r.DM_pvalue)), 0.05) },
  ];

  const grid2 = el("div", { class: "claim-grid" });
  for (const c of cards) {
    const it = by[c.id], [ic, cls, sk] = ST[it.status];
    grid2.append(el("section", { class: "claim-card" },
      el("div", { class: "st " + cls }, el("i", {}, ic), `${c.id} · ${t(lang, sk)}`),
      el("h3", { class: "fig-title", style: "margin-top:6px;font-size:1.05rem" }, titles[c.id]),
      c.viz,
      el("p", { class: "ev", html: caps[c.id] }),
      el("a", { href: `#/${LINKS[c.id]}` }, vi ? "Xem trang chi tiết →" : "Open detail →"),
    ));
  }
  viz.append(grid2);
}
