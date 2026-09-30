import { t } from "./i18n.js";
import { DEFAULTS, hashToState, stateToHash, mergeState, isReportDefaults } from "./state.js";
import { loadDashboardData, footerLine } from "./data.js";
import { mountCurve } from "./views/curve.js";
import { mountArena } from "./views/arena.js";
import { mountIrf } from "./views/irf.js";
import { mountProbit } from "./views/probit.js";
import { mountVietnam } from "./views/vietnam.js";
import { mountSummary } from "./views/summary.js";
import { mountToday } from "./views/today.js";
import { mountMethods } from "./views/methods.js";
import { runSelfTest } from "./engine/selftest.js";
import { clearRedraws, el } from "./ui/kit.js";
import { resetGlossary } from "./ui/glossary.js";

/** @type {AppState} */
let state = structuredClone(DEFAULTS);
/** @type {any} */
let data = null;
let selftestOk = true;
let selftestRan = false;

const ROUTES = [
  { id: "today", labelKey: "navToday" },
  { id: "curve", labelKey: "navCurve" },
  { id: "arena", labelKey: "navArena" },
  { id: "irf", labelKey: "navIrf" },
  { id: "probit", labelKey: "navProbit" },
  { id: "vietnam", labelKey: "navVn" },
  { id: "summary", labelKey: "navSummary" },
  { id: "methods", labelKey: "navMethods" },
];

function applyTheme() {
  document.documentElement.lang = state.lang;
  document.documentElement.dataset.theme = state.theme === "dark" ? "dark" : "light";
}

function syncHash(replace = false) {
  const h = stateToHash(state);
  if (replace) history.replaceState(null, "", h);
  else history.pushState(null, "", h);
}

function parseHash() {
  state = mergeState(DEFAULTS, hashToState(location.hash || "#/today"));
  if (state.route === "yield") state.route = "arena";
  applyTheme();
}

function renderNav() {
  const nav = document.getElementById("nav");
  nav.innerHTML = "";
  for (const r of ROUTES) {
    const a = document.createElement("a");
    a.href = `#/${r.id}`;
    a.innerHTML = `<span class="no">${String(ROUTES.indexOf(r) + 1).padStart(2, "0")}</span><span>${t(state.lang, r.labelKey)}</span>`;
    if (state.route === r.id) a.classList.add("active");
    a.addEventListener("click", (e) => {
      e.preventDefault();
      state.route = r.id;
      syncHash();
      renderBench();
    });
    nav.appendChild(a);
  }
  document.getElementById("app-title").textContent = t(state.lang, "appTitle");
  document.getElementById("app-sub").textContent = t(state.lang, "appSub");
  const bl = document.getElementById("btn-lang");
  bl.textContent = t(state.lang, "lang");
  bl.setAttribute("aria-label", t(state.lang, "langAria"));
  const bt = document.getElementById("btn-theme");
  bt.textContent = t(state.lang, "theme");
  bt.setAttribute("aria-label", t(state.lang, "themeAria"));
  document.documentElement.lang = state.lang;
}

function updateFooter() {
  const foot = document.getElementById("footer");
  if (!data?.manifest) return;
  const fl = footerLine(data.manifest);
  const ok = selftestRan && selftestOk ? ` · ${t(state.lang, "selftestOk")}` : "";
  foot.innerHTML = "";
  const left = el("span", {}, fl.text + ok);
  left.title = fl.title;
  const copyBtn = el("button", {
    type: "button",
    class: "btn-copy",
    onclick: () => {
      navigator.clipboard?.writeText(location.href).then(() => {
        copyBtn.textContent = t(state.lang, "copied");
        setTimeout(() => { copyBtn.textContent = t(state.lang, "copyPermalink"); }, 1500);
      });
    },
  }, t(state.lang, "copyPermalink"));
  foot.append(left, copyBtn);
}

async function renderBench() {
  renderNav();
  clearRedraws();
  resetGlossary();
  const hero = document.getElementById("hero");
  hero.innerHTML = "";
  const controls = document.getElementById("controls");
  const viz = document.getElementById("viz");
  controls.innerHTML = "";
  viz.innerHTML = `<p class="spin">${t(state.lang, "loading")}</p>`;

  if (!data) {
    try {
      data = await loadDashboardData("data/");
      updateFooter();
    } catch (e) {
      viz.innerHTML = `<p>Lỗi tải dữ liệu: ${e.message}. Chạy <code>python scripts/export_dashboard_data.py</code>.</p>`;
      return;
    }
  }

  const ctx = {
    state,
    data,
    lang: state.lang,
    hero,
    controls,
    viz,
    ledger: { innerHTML: "" }, // stub — views must not rely on right column
    selftestOk,
    isDefaults: () => isReportDefaults(state),
    persist() { syncHash(true); },
    onChange(partial) {
      state = mergeState(state, partial);
      syncHash(true);
      renderBench();
    },
    setState(partial) {
      Object.assign(state, partial);
      syncHash(true);
    },
    resetToDefaults() {
      const lang = state.lang;
      const theme = state.theme;
      const route = state.route;
      state = structuredClone(DEFAULTS);
      state.lang = lang;
      state.theme = theme;
      state.route = route;
      syncHash();
      renderBench();
    },
  };

  const mounts = {
    today: mountToday,
    curve: mountCurve,
    arena: mountArena,
    irf: mountIrf,
    probit: mountProbit,
    vietnam: mountVietnam,
    summary: mountSummary,
    methods: mountMethods,
  };
  const fn = mounts[state.route] || mountToday;
  viz.innerHTML = "";
  try {
    await fn(ctx);
  } catch (e) {
    console.error(e);
    viz.innerHTML = `<p class="callout">Lỗi hiển thị bench: ${e.message}</p>`;
  }
}

function wireGlobal() {
  document.getElementById("btn-lang").onclick = () => {
    state.lang = state.lang === "vi" ? "en" : "vi";
    syncHash(true);
    renderBench();
  };
  document.getElementById("btn-theme").onclick = () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    syncHash(true);
  };
  window.addEventListener("popstate", () => {
    parseHash();
    renderBench();
  });
}

async function init() {
  parseHash();
  // Redirect legacy #/yield
  if ((location.hash || "").startsWith("#/yield")) {
    state.route = "arena";
    syncHash(true);
  }
  wireGlobal();
  if (new URLSearchParams(location.search).get("selftest") === "1") {
    selftestRan = true;
    const result = await runSelfTest();
    selftestOk = result.ok;
    const b = document.getElementById("selftest-banner");
    if (!selftestOk) {
      b.hidden = false;
      b.textContent = `${t(state.lang, "selftestFail")} (${result.failed} fail / ${result.passed} pass)`;
      b.className = "banner-selftest-fail";
    } else {
      b.hidden = true;
    }
  }
  await renderBench();
  updateFooter();
}

init();
