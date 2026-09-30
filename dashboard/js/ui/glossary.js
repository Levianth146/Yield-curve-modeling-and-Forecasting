import { el } from "./kit.js";
import { t } from "../i18n.js";

const seen = new WeakMap();

/** Glossary term → <abbr> with ≤25-word definition from i18n. */
export function term(key, lang = "vi") {
  const label = t(lang, `gloss_${key}_label`) || key;
  const def = t(lang, `gloss_${key}`);
  const page = document.getElementById("viz") || document.body;
  let set = seen.get(page);
  if (!set) { set = new Set(); seen.set(page, set); }
  const first = !set.has(key);
  if (first) set.add(key);
  return el("abbr", {
    class: "gloss" + (first ? " gloss-first" : ""),
    title: def,
    tabindex: "0",
  }, label);
}

/** Reset first-occurrence underline when remounting a view. */
export function resetGlossary() {
  const page = document.getElementById("viz");
  if (page) seen.delete(page);
}

export function explainBox(lang, { meaning, confidence, limits }) {
  const vi = lang !== "en";
  return el("div", { class: "explain-box" },
    el("div", {},
      el("h4", {}, vi ? "Nghĩa là gì" : "What it means"),
      typeof meaning === "string" ? el("p", { html: meaning }) : meaning,
    ),
    el("div", {},
      el("h4", {}, vi ? "Độ tin cậy" : "Confidence"),
      typeof confidence === "string" ? el("p", { html: confidence }) : confidence,
    ),
    el("div", {},
      el("h4", {}, vi ? "Giới hạn" : "Limits"),
      typeof limits === "string" ? el("p", { html: limits }) : limits,
    ),
  );
}

export function methodDetails(lang, { methodHtml, reproduceText, onCopy }) {
  const vi = lang !== "en";
  // v3: reproduce lives on Methods tab; keep optional for backwards compat
  const kids = [
    el("details", { class: "drawer", open: false },
      el("summary", {}, vi ? "Đọc thêm" : "Read more"),
      el("div", { class: "drawer-body", html: methodHtml || "" }),
    ),
  ];
  if (reproduceText) {
    const pre = el("pre", { class: "reproduce-pre mono" }, reproduceText);
    const copyBtn = el("button", {
      type: "button",
      class: "btn-copy",
      onclick: () => {
        navigator.clipboard?.writeText(reproduceText || "").then(() => {
          copyBtn.textContent = vi ? "Đã chép" : "Copied";
          setTimeout(() => { copyBtn.textContent = vi ? "Sao chép" : "Copy"; }, 1500);
        });
        onCopy && onCopy();
      },
    }, vi ? "Sao chép" : "Copy");
    kids.push(el("details", { class: "drawer" },
      el("summary", {}, vi ? "Tái tạo bằng Python" : "Reproduce in Python"),
      el("div", { class: "drawer-body" }, el("div", { class: "reproduce-toolbar" }, copyBtn), pre),
    ));
  }
  return el("div", { class: "method-block" }, ...kids);
}

/** Attach formula card from content/formulas.js */
export function attachFormula(lang, id, example = "") {
  // lazy import avoided — caller passes card
  return null;
}

/** Small "↺ report defaults" control — only when off defaults. */
export function resetLink(lang, visible, onClick) {
  if (!visible) return null;
  return el("button", {
    type: "button",
    class: "btn-reset-inline",
    onclick: onClick,
  }, lang === "en" ? "↺ report defaults" : "↺ về cấu hình đề án");
}
