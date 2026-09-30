/** Schema version for URL hash state */
export const SCHEMA = 1;

/** @typedef {Object} AppState */
export const DEFAULTS = {
  schema: SCHEMA,
  lang: /** @type {'vi'|'en'} */ ("vi"),
  theme: /** @type {'light'|'dark'} */ ("light"),
  route: "today",
  curve: {
    dateIdx: -1,
    lambda: 0.7308,
    method: "ols_fixed",
    playing: false,
    playSpeed: 1,
    mats: null,
    compareReport: false,
  },
  arena: {
    factor: "slope",
    h: 12,
    lag: "bic",
    window: "expanding",
    rollingN: 120,
    split: "2015-12-31",
    loss: "se",
    hln: true,
    dmDist: "se",
  },
  irf: {
    preset: "cpi_fed_lsc",
    p: 4,
    lagMode: "p4",
    infl: "cpi_mom_ann_w2",
    i1: "adf",
    impulse: "fed_funds",
    response: "slope",
    h: 6,
    shock: 1,
  },
  probit: {
    spread: "T10Y2Y",
    model: "spread",
    horizon: 12,
    trainEnd: "1998-12",
    noRecessionFilter: false,
    threshold: 0.5,
  },
  vn: {
    mode: "vn",
    lambdaHighlight: 0.4,
    factor: "slope",
  },
};

/** @param {Partial<AppState>} patch @param {AppState} base */
export function mergeState(base, patch) {
  return deepMerge(structuredClone(base), patch);
}

function deepMerge(a, b) {
  if (!b || typeof b !== "object") return a;
  for (const k of Object.keys(b)) {
    if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k]) {
      deepMerge(a[k], b[k]);
    } else {
      a[k] = b[k];
    }
  }
  return a;
}

/** @param {AppState} state */
export function stateToHash(state) {
  let route = state.route || "today";
  if (route === "yield") route = "arena";
  const q = new URLSearchParams();
  q.set("s", String(state.schema));
  q.set("lang", state.lang);
  if (state.theme === "dark") q.set("theme", "dark");

  const bench = state[route];
  if (bench && typeof bench === "object") {
    for (const [k, v] of Object.entries(bench)) {
      if (v === null || v === undefined) continue;
      q.set(k, String(v));
    }
  }
  return `#/${route}?${q.toString()}`;
}

/** @param {string} hash @returns {AppState} */
export function hashToState(hash) {
  const base = structuredClone(DEFAULTS);
  const m = hash.match(/^#\/([^?]+)(?:\?(.*))?$/);
  if (!m) return base;
  let route = m[1] || "today";
  if (route === "yield") route = "arena";
  base.route = route;
  const q = new URLSearchParams(m[2] || "");
  const schema = Number(q.get("s"));
  if (schema && schema !== SCHEMA) {
    console.warn("Unknown schema", schema, "— using defaults");
    return structuredClone(DEFAULTS);
  }
  if (q.get("lang") === "en") base.lang = "en";
  if (q.get("theme") === "dark") base.theme = "dark";

  const benchKey = base.route;
  if (base[benchKey]) {
    for (const [k, v] of q.entries()) {
      if (["s", "lang", "theme", "pres"].includes(k)) continue;
      const cur = base[benchKey][k];
      if (typeof cur === "number") base[benchKey][k] = Number(v);
      else if (typeof cur === "boolean") base[benchKey][k] = v === "true" || v === "1";
      else base[benchKey][k] = v;
    }
  }
  return base;
}

/** @param {AppState} state */
export function isReportDefaults(state) {
  const d = DEFAULTS;
  return (
    state.arena.split === d.arena.split &&
    state.arena.lag === d.arena.lag &&
    state.curve.lambda === d.curve.lambda &&
    state.probit.trainEnd === d.probit.trainEnd &&
    state.probit.spread === d.probit.spread
  );
}
