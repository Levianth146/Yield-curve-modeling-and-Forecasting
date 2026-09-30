import { el } from "./kit.js";
import { math } from "./math.js";

function renderInlineMath(root) {
  root.querySelectorAll("[data-tex]").forEach((n) => {
    try { n.replaceWith(math(n.dataset.tex)); } catch { /* giữ nội dung fallback */ }
  });
}

/**
 * Formula card: công thức chính + bảng ký hiệu + cách đọc + ví dụ.
 * `symbols` là lựa chọn ưu tiên: mỗi ký hiệu được trình bày thành một hàng riêng.
 */
export function formulaCard({ title, tex, symbols = [], where = "", intro = "", read = "", example = "", open = true }) {
  const en = document.documentElement.lang === "en";
  const body = el("div", { class: "formula-card-body" });

  if (intro) body.append(el("p", { class: "formula-intro", html: intro }));

  const texList = Array.isArray(tex) ? tex : [tex];
  const equations = el("div", { class: `formula-equations ${texList.length > 1 ? "formula-equations-multi" : ""}` });
  for (const t of texList) equations.append(math(t, { display: true }));
  body.append(equations);

  if (symbols.length) {
    const symbolsBox = el("section", { class: "formula-symbols" },
      el("div", { class: "formula-section-label" }, en ? "Where" : "Trong đó"),
    );
    const rows = el("div", { class: "formula-symbol-list" });
    for (const s of symbols) {
      const meaning = el("div", { class: "formula-symbol-meaning", html: s.meaning });
      renderInlineMath(meaning);
      rows.append(el("div", { class: "formula-symbol-row" },
        el("div", { class: "formula-symbol-key" }, (() => {
          try { return math(s.sym); } catch { return s.sym; }
        })()),
        meaning,
      ));
    }
    symbolsBox.append(rows);
    body.append(symbolsBox);
  } else if (where) {
    // Backward-compatible fallback cho nội dung cũ chưa chuyển sang symbols.
    const raw = String(where).replace(/^Trong đó,?\s*/i, "").replace(/^where\s*/i, "");
    const parts = raw.split(/;\s*/).map((x) => x.trim()).filter(Boolean);
    const symbolsBox = el("section", { class: "formula-symbols" },
      el("div", { class: "formula-section-label" }, en ? "Where" : "Trong đó"),
    );
    const rows = el("div", { class: "formula-symbol-list formula-symbol-list-legacy" });
    for (const part of parts) {
      const row = el("div", { class: "formula-symbol-row formula-symbol-row-legacy" },
        el("div", { class: "formula-symbol-meaning", html: part }),
      );
      renderInlineMath(row);
      rows.append(row);
    }
    symbolsBox.append(rows);
    body.append(symbolsBox);
  }

  if (read) body.append(el("div", { class: "formula-note formula-read" },
    el("div", { class: "formula-section-label" }, en ? "How to read" : "Cách đọc"),
    el("p", { html: read }),
  ));

  if (example) body.append(el("div", { class: "formula-note formula-example" },
    el("div", { class: "formula-section-label" }, en ? "Example" : "Ví dụ"),
    el("p", { html: example }),
  ));

  if (open) return el("section", { class: "formula-card" }, el("h3", {}, title), body);
  return el("details", { class: "drawer formula-card" }, el("summary", {}, title), body);
}

/** Numbered reading steps. */
export function readingSteps(lang, steps, title) {
  const vi = lang !== "en";
  return el("section", { class: "reading-steps" },
    el("h3", {}, title || (vi ? "Đọc kết quả từng bước" : "Reading the result step by step")),
    el("ol", {}, steps.map((s) => el("li", { html: s }))),
  );
}
