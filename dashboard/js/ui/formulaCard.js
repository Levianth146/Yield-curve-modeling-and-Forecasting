import { el } from "./kit.js";
import { math } from "./math.js";

/**
 * Formula card: title, KaTeX display, symbol table, how-to-read, numeric example.
 * @param {{ title: string, tex: string|string[], symbols: {sym:string, meaning:string}[], read: string, example?: string, open?: boolean }} opts
 */
export function formulaCard({ title, tex, symbols = [], read = "", example = "", open = true }) {
  const body = el("div", { class: "formula-card-body" });
  const texList = Array.isArray(tex) ? tex : [tex];
  for (const t of texList) body.append(math(t, { display: true }));
  if (symbols.length) {
    const table = el("table", { class: "formula-syms" });
    for (const s of symbols) {
      const row = el("tr", {},
        el("td", {}, (() => { try { return math(s.sym); } catch { return s.sym; } })()),
        el("td", { html: s.meaning }),
      );
      table.append(row);
    }
    body.append(table);
  }
  if (read) body.append(el("p", { class: "formula-read", html: `<b>${document.documentElement.lang === "en" ? "How to read:" : "Cách đọc:"}</b> ${read}` }));
  if (example) body.append(el("p", { class: "formula-ex", html: `<b>${document.documentElement.lang === "en" ? "Numeric example:" : "Ví dụ số:"}</b> ${example}` }));

  if (open) {
    return el("div", { class: "formula-card" }, el("h3", {}, title), body);
  }
  return el("details", { class: "drawer formula-card" }, el("summary", {}, title), body);
}

/** Numbered reading steps (§2.2). steps: string[] (may contain HTML). */
export function readingSteps(lang, steps, title) {
  const vi = lang !== "en";
  return el("div", { class: "reading-steps" },
    el("h3", {}, title || (vi ? "Đọc kết quả từng bước" : "Reading the result step by step")),
    el("ol", {}, steps.map((s) => el("li", { html: s }))),
  );
}
