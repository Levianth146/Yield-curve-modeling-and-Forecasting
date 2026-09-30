import { el } from "./kit.js";
import { t } from "../i18n.js";

const STATUS_CLS = {
  supported: "conclusion-supported",
  fragile: "conclusion-fragile",
  notSupported: "conclusion-not",
};

const STATUS_ICON = {
  supported: "✓",
  fragile: "!",
  notSupported: "○",
};

/**
 * @param {HTMLElement} host
 * @param {{ status: 'supported'|'fragile'|'notSupported', headline: string, body: string, lang?: string }} opts
 */
export function conclusion(host, { status, headline, body, lang = "vi" }) {
  const key =
    status === "supported" ? "statusSupported" :
    status === "notSupported" ? "statusNotSupported" :
    "statusFragile";
  const tipKey =
    status === "supported" ? "statusTipSupported" :
    status === "notSupported" ? "statusTipNotSupported" :
    "statusTipFragile";
  const cls = STATUS_CLS[status] || STATUS_CLS.fragile;
  const icon = STATUS_ICON[status] || STATUS_ICON.fragile;
  host.innerHTML = "";
  const badgeRow = el("div", { class: "conclusion-badge-row" },
    el("span", { class: "conclusion-badge", title: t(lang, tipKey) },
      el("span", { class: "conclusion-icon", "aria-hidden": "true" }, icon),
      " ",
      t(lang, key),
    ),
    el("span", { class: "conclusion-tip-line" }, t(lang, tipKey)),
  );
  const box = el("div", {
    class: `conclusion ${cls}`,
    "aria-live": "polite",
  },
    badgeRow,
    el("p", { class: "conclusion-headline", html: headline }),
    el("div", { class: "conclusion-body", html: body }),
  );
  host.append(box);
  return {
    update({ status: st, headline: h, body: b }) {
      if (st) {
        const k = st === "supported" ? "statusSupported" : st === "notSupported" ? "statusNotSupported" : "statusFragile";
        const tk = st === "supported" ? "statusTipSupported" : st === "notSupported" ? "statusTipNotSupported" : "statusTipFragile";
        const ic = STATUS_ICON[st] || STATUS_ICON.fragile;
        box.className = `conclusion ${STATUS_CLS[st] || STATUS_CLS.fragile}`;
        const badge = box.querySelector(".conclusion-badge");
        badge.innerHTML = "";
        badge.append(el("span", { class: "conclusion-icon", "aria-hidden": "true" }, ic), document.createTextNode(" " + t(lang, k)));
        badge.title = t(lang, tk);
        const tip = box.querySelector(".conclusion-tip-line");
        if (tip) tip.textContent = t(lang, tk);
      }
      if (h != null) box.querySelector(".conclusion-headline").innerHTML = h;
      if (b != null) box.querySelector(".conclusion-body").innerHTML = b;
    },
  };
}

/**
 * Page shell: eyebrow + H2 + conclusion in hero.
 * @returns {{ setConclusion, setTitle }}
 */
export function pageHero(host, { eyebrow, title, status, headline, body, lang }) {
  host.innerHTML = "";
  host.className = "hero";
  const eb = el("div", { class: "eyebrow" }, eyebrow);
  const h2 = el("h2", {}, title);
  const slot = el("div", { class: "conclusion-slot" });
  host.append(eb, h2, slot);
  const api = conclusion(slot, { status, headline, body, lang });
  return {
    setTitle(s) { h2.textContent = s; },
    setConclusion: api.update,
  };
}
