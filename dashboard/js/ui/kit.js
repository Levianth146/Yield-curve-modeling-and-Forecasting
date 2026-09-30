/* Bộ vẽ + UI dùng chung. Dùng D3 v7 (global `d3`). Mọi biểu đồ: viewBox theo bề rộng khung, vẽ lại khi resize. */
export { fmt } from "./fmt.js";
export { n, sg, pct, sgpct, p, bp, rmseBp, yieldChange, mat, dateISO, dateText } from "./fmt.js";

const NS = "http://www.w3.org/2000/svg";
const redraws = new Set();
let rzTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(rzTimer);
  rzTimer = setTimeout(() => redraws.forEach((f) => f()), 120);
});
export function clearRedraws() { redraws.clear(); }

/** Push end-labels so consecutive y positions stay ≥ minGap apart. */
export function placeLabels(items, { minGap = 14 } = {}) {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < minGap) {
      sorted[i].y = sorted[i - 1].y + minGap;
    }
  }
  return sorted;
}

export function endLabel(g, x, y, text, color, { dx = 6, dy = 4, cls = "lbl" } = {}) {
  g.append("text").attr("class", cls).attr("x", x + dx).attr("y", y + dy).style("fill", color).text(text);
}

/** Place multiple end labels without overlap. items: {x,y,text,color}[] */
export function endLabels(g, items, opts = {}) {
  const placed = placeLabels(items.map((it) => ({ ...it })), opts);
  for (const it of placed) endLabel(g, it.x, it.y, it.text, it.color, opts);
}

export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}

/* ---------- tooltip ---------- */
let tipEl = null;
export function tip() {
  if (!tipEl) { tipEl = el("div", { class: "tip", role: "status" }); document.body.appendChild(tipEl); }
  return {
    show(html, ev) {
      tipEl.innerHTML = html; tipEl.classList.add("on");
      const w = tipEl.offsetWidth, x = Math.min(ev.clientX + 14, innerWidth - w - 8);
      tipEl.style.left = Math.max(8, x) + "px"; tipEl.style.top = ev.clientY + 14 + "px";
    },
    hide() { tipEl.classList.remove("on"); },
  };
}

/* ---------- figure shell ---------- */
export function figure({ title, sub, note, height = 300, margin = {}, table }) {
  const box = el("div");
  const root = el("figure", { class: "fig", style: "margin:0" },
    title ? el("h3", { class: "fig-title", html: title }) : null,
    el("p", { class: "fig-sub", html: sub || "" }),
    box,
    el("p", { class: "fig-note", html: note || "" }));
  const m = { t: 20, r: 56, b: 30, l: 42, ...margin };
  const api = {
    root, box, m, height,
    setTitle(h) { const t = root.querySelector(".fig-title"); if (t) t.innerHTML = h; },
    setSub(h) { const t = root.querySelector(".fig-sub"); if (t) t.innerHTML = h; },
    setNote(h) { const t = root.querySelector(".fig-note"); if (t) t.innerHTML = h; },
    /** draw(g, {W,H,w,h}) — w,h là vùng vẽ sau margin */
    render(draw) {
      const run = () => {
        if (!box.clientWidth) { requestAnimationFrame(run); return; }
        const W = Math.max(260, box.clientWidth);
        const H = typeof height === "function" ? height(W) : height;
        box.innerHTML = "";
        const svg = d3.select(box).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img").attr("width", W).attr("height", H);
        const g = svg.append("g").attr("transform", `translate(${m.l},${m.t})`);
        draw(g, { W, H, w: W - m.l - m.r, h: H - m.t - m.b, svg });
      };
      api._run = run; redraws.add(run); run();
    },
    redraw() { api._run && api._run(); },
  };
  return api;
}

/* ---------- axes / grid ---------- */
export function axisX(g, x, h, { ticks = 6, tickFormat, grid = false } = {}) {
  const a = d3.axisBottom(x).ticks(ticks).tickSizeOuter(0);
  if (tickFormat) a.tickFormat(tickFormat);
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`).call(a);
  if (grid) g.append("g").selectAll("line").data(x.ticks(ticks)).join("line").attr("class", "gridline").attr("x1", (d) => x(d)).attr("x2", (d) => x(d)).attr("y1", 0).attr("y2", h);
}
export function axisY(g, y, w, { ticks = 5, tickFormat, label, zero = false } = {}) {
  g.append("g").selectAll("line").data(y.ticks(ticks)).join("line").attr("class", "gridline").attr("x1", 0).attr("x2", w).attr("y1", (d) => y(d)).attr("y2", (d) => y(d));
  const a = d3.axisLeft(y).ticks(ticks).tickSize(0).tickPadding(8);
  if (tickFormat) a.tickFormat(tickFormat);
  const ga = g.append("g").attr("class", "axis").call(a);
  ga.select(".domain").remove();
  if (label) g.append("text").attr("class", "axis").attr("x", 0).attr("y", -9).style("fill", "var(--ink-muted)").style("font-size", "10.5px").style("font-family", "var(--font-mono)").text(label);
  const [lo, hi] = y.domain();
  if (zero && lo < 0 && hi > 0) g.append("line").attr("class", "zero-line").attr("x1", 0).attr("x2", w).attr("y1", y(0)).attr("y2", y(0));
}
export function recBands(g, x, h, spells) {
  for (const s of spells || []) {
    const a = x(new Date(s.start)), b = x(new Date(s.end));
    if (b < 0 || a > x.range()[1]) continue;
    g.append("rect").attr("class", "rec-band").attr("x", Math.max(0, a)).attr("width", Math.max(1, Math.min(x.range()[1], b) - Math.max(0, a))).attr("y", 0).attr("height", h);
  }
}
/** Trục thời gian + hover crosshair trả về (date,index) */
export function hoverX(g, { w, h, x, find, onMove, onLeave }) {
  const line = g.append("line").attr("y1", 0).attr("y2", h).attr("stroke", "var(--ink)").attr("stroke-width", 1).style("opacity", 0);
  g.append("rect").attr("width", w).attr("height", h).attr("fill", "transparent").style("cursor", "crosshair")
    .on("mousemove touchmove", (ev) => {
      const e = ev.touches ? ev.touches[0] : ev; const [px] = d3.pointer(e, g.node());
      const r = find(x.invert(px)); if (!r) return;
      line.attr("x1", x(r.x)).attr("x2", x(r.x)).style("opacity", 0.5);
      onMove(r, e);
    })
    .on("mouseleave", () => { line.style("opacity", 0); onLeave && onLeave(); });
}

/* ---------- controls ---------- */
export function chips({ label, options, value, onPick, mono = false }) {
  const wrap = el("div", { class: "chips", role: "group", "aria-label": label });
  const btns = options.map((o) => {
    const id = typeof o === "object" ? o.id : o, txt = typeof o === "object" ? o.label : String(o);
    const b = el("button", { type: "button", class: "chip" + (mono ? " mono" : ""), onclick: () => { set(id); onPick(id); } }, txt);
    b.dataset.id = String(id); return b;
  });
  const set = (v) => btns.forEach((b) => { const on = b.dataset.id === String(v); b.classList.toggle("active", on); b.setAttribute("aria-pressed", on); });
  set(value); wrap.append(...btns);
  const grp = el("div", { class: "control-group" }, el("div", { class: "ctl-label" }, label), wrap);
  grp.set = set; return grp;
}
export function slider({ label, min, max, step = 1, value, format = String, onInput, grow = true }) {
  const val = el("span", { class: "val" }, format(value));
  const inp = el("input", { type: "range", min, max, step, value, "aria-label": label });
  inp.addEventListener("input", () => { const v = Number(inp.value); val.textContent = format(v); onInput(v); });
  const g = el("div", { class: "control-group" + (grow ? " grow" : "") }, el("div", { class: "ctl-label" }, el("span", {}, label), val), inp);
  g.set = (v) => { inp.value = v; val.textContent = format(Number(v)); };
  g.input = inp; return g;
}

/* ---------- hero, strip, ledger ---------- */
export function hero(host, { eyebrow, title, verdict }) {
  host.innerHTML = "";
  host.className = "hero";
  const parts = { eb: el("div", { class: "eyebrow" }, eyebrow), h: el("h2", {}, title), v: el("p", { class: "verdict", html: verdict || "" }) };
  host.append(parts.eb, parts.h, parts.v);
  return { title: (s) => (parts.h.textContent = s), verdict: (s) => (parts.v.innerHTML = s) };
}
export function strip(items) {
  return el("div", { class: "strip" }, items.map((i) => el("div", {}, el("div", { class: "k" }, i.k), el("div", { class: "v " + (i.cls || ""), html: i.v }), i.d ? el("div", { class: "d", html: i.d }) : null)));
}
export function setStrip(node, items) { const n = strip(items); node.replaceChildren(...n.children); }

const STAT = { supported: ["✓", "claim-supported", "Có cơ sở", "Supported"], fragile: ["!", "claim-fragile", "Mỏng manh", "Fragile"], notSupported: ["×", "claim-not", "Không có cơ sở", "Not supported"] };
export function ledger(host, items, { title = document.documentElement.lang === "en" ? "Claim ledger" : "Sổ kết luận" } = {}) {
  host.innerHTML = "";
  host.append(el("h4", { class: "ledger-h" }, title));
  for (const it of items) {
    const key = it.status || it.label || "fragile"; const S = STAT[key] || STAT.fragile, ic = S[0], cls = S[1], txt = document.documentElement.lang === "en" ? S[3] : S[2];
    host.append(el("div", { class: "ledger-item" },
      el("div", { class: "st " + cls }, el("i", {}, ic), (it.id ? it.id + " · " : "") + txt),
      el("p", { html: it.text }), it.ev ? el("p", { class: "ev", html: it.ev }) : null));
  }
}
export function figs(cols, ...items) { return el("div", { class: "figs " + cols }, items); }
export function drawer(summary, ...kids) { return el("details", { class: "drawer" }, el("summary", {}, summary), kids); }

export function table(cols, rows, { rowClass } = {}) {
  const t = el("table", { class: "tbl" });
  t.append(el("thead", {}, el("tr", {}, cols.map((c) => el("th", {}, c.h)))));
  t.append(el("tbody", {}, rows.map((r) => el("tr", { class: rowClass ? rowClass(r) : "" }, cols.map((c) => el("td", { html: c.f(r) }))))));
  return t;
}

/* ---------- reusable chart: line series ---------- */
export function lineChart(fig, { series, xDomain, yDomain, xTicks = 6, yFmt, bands, ylabel, zero = false, hoverRows, hoverFmt, decorate }) {
  fig.render((g, { w, h }) => {
    const x = d3.scaleTime().domain(xDomain).range([0, w]);
    const allY = series.flatMap((s) => s.values.map((v) => v.y).filter(Number.isFinite));
    const y = d3.scaleLinear().domain(yDomain || d3.extent(allY)).nice().range([h, 0]);
    if (bands) recBands(g, x, h, bands);
    axisY(g, y, w, { tickFormat: yFmt, label: ylabel, zero });
    axisX(g, x, h, { ticks: xTicks });
    for (const s of series) {
      const line = d3.line().defined((d) => Number.isFinite(d.y)).x((d) => x(d.x)).y((d) => y(d.y));
      g.append("path").datum(s.values).attr("fill", "none").attr("stroke", s.color).attr("stroke-width", s.width || 1.6).attr("stroke-dasharray", s.dash || null).attr("stroke-linejoin", "round").attr("d", line);
      const labelItems = [];
      for (const s of series) {
        if (!s.label) continue;
        const last = [...s.values].reverse().find((d) => Number.isFinite(d.y));
        if (last) labelItems.push({ x: x(last.x), y: y(last.y), text: s.label, color: s.color });
      }
      if (labelItems.length) endLabels(g, labelItems);
    }
    decorate && decorate(g, { x, y, w, h });
    if (hoverRows) {
      const T = tip(); const bis = d3.bisector((d) => d.x).center;
      hoverX(g, { w, h, x, find: (d) => { const i = bis(hoverRows, d); return hoverRows[i] && { x: hoverRows[i].x, row: hoverRows[i] }; }, onMove: (r, e) => T.show(hoverFmt(r.row), e), onLeave: T.hide });
    }
  });
}
export const parseD = (s) => new Date(String(s).length === 7 ? s + "-01" : s);
