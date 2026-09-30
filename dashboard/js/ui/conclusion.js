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
export function conclusion(host, { status, headline, body, basis = "", lang = "vi" }) {
  const key =
    status === "supported" ? "statusSupported" :
    status === "notSupported" ? "statusNotSupported" :
    "statusFragile";
  const tipKey =
    status === "supported" ? "statusTipSupported" :
    status === "notSupported" ? "statusTipNotSupported" :
    "statusTipFragile";
  const cls = status ? (STATUS_CLS[status] || STATUS_CLS.fragile) : "conclusion-neutral";
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
  // Căn cứ cụ thể của nhãn: hiển thị thay cho câu định nghĩa chung.
  const basisEl = el("div", { class: "conclusion-basis" });
  const setBasis = (b) => {
    if (b) {
      basisEl.innerHTML = `<b>${lang === "en" ? "Basis for this rating:" : "Căn cứ đánh giá:"}</b> ${b}`;
      basisEl.hidden = false;
      const tl = badgeRow.querySelector(".conclusion-tip-line"); if (tl) tl.hidden = true;
    } else {
      basisEl.hidden = true;
      const tl = badgeRow.querySelector(".conclusion-tip-line"); if (tl) tl.hidden = false;
    }
  };
  setBasis(basis);
  if (!status) badgeRow.hidden = true;
  const box = el("div", {
    class: `conclusion ${cls}`,
    "aria-live": "polite",
  },
    badgeRow,
    basisEl,
    el("p", { class: "conclusion-headline", html: headline }),
    el("div", { class: "conclusion-body", html: body }),
  );
  host.append(box);
  return {
    update({ status: st, headline: h, body: b, basis: bs }) {
      if (bs !== undefined) setBasis(bs);
      if (st) {
        badgeRow.hidden = false;
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
export function pageHero(host, { eyebrow, title, status, headline, body, basis = "", lang }) {
  host.innerHTML = "";
  host.className = "hero";
  const eb = el("div", { class: "eyebrow" }, eyebrow);
  const h2 = el("h2", {}, title);
  const slot = el("div", { class: "conclusion-slot" });
  host.append(eb, h2, slot);
  const api = conclusion(slot, { status, headline, body, basis, lang });
  return {
    setTitle(s) { h2.textContent = s; },
    setConclusion: api.update,
  };
}
