/** Unified number/date formatting — decimal point everywhere (report/Python style). */

const MINUS = "\u2212"; // −

export function n(v, d = 2) {
  return Number.isFinite(v) ? v.toFixed(d) : "—";
}

export function sg(v, d = 2) {
  if (!Number.isFinite(v)) return "—";
  if (v > 0) return "+" + Math.abs(v).toFixed(d);
  if (v < 0) return MINUS + Math.abs(v).toFixed(d);
  return (0).toFixed(d);
}

export function pct(v, d = 1) {
  return Number.isFinite(v) ? (v * 100).toFixed(d) + "%" : "—";
}

export function sgpct(v, d = 1) {
  if (!Number.isFinite(v)) return "—";
  const x = v * 100;
  if (x > 0) return "+" + Math.abs(x).toFixed(d) + "%";
  if (x < 0) return MINUS + Math.abs(x).toFixed(d) + "%";
  return (0).toFixed(d) + "%";
}

/** p-value with decimal point */
export function p(v) {
  if (!Number.isFinite(v)) return "—";
  if (v < 0.001) return "<0.001";
  return v.toFixed(3);
}

/**
 * Yield/RMSE in percentage points → bp (e.g. 0.088 → "8.8 bp").
 * Pass already-bp values via `n(v) + " bp"` instead.
 */
export function bp(v, d = 1) {
  return Number.isFinite(v) ? (v * 100).toFixed(d) + " bp" : "—";
}

export function rmseBp(v, d = 1) {
  return bp(v, d);
}

/**
 * Yield / IRF change: use bp if |x| < 1 (percentage points), else điểm %.
 * x in percentage points (e.g. 0.234 = 0.234 pp = 23.4 bp).
 */
export function yieldChange(x, d = 2) {
  if (!Number.isFinite(x)) return "—";
  const abs = Math.abs(x);
  if (abs < 1) {
    const b = abs * 100;
    const s = x > 0 ? "+" : x < 0 ? MINUS : "";
    return s + b.toFixed(d > 1 ? 1 : d) + " bp";
  }
  return sg(x, d) + " điểm %";
}

export function mat(m) {
  return m < 1 ? Math.round(m * 12) + "M" : m + "Y";
}

/** ISO date for axes/tooltips */
export function dateISO(s) {
  if (!s) return "—";
  const t = String(s);
  return t.length >= 10 ? t.slice(0, 10) : t.length === 7 ? t + "-01" : t;
}

/** DD/MM/YYYY for prose */
export function dateText(s) {
  const iso = dateISO(s);
  if (iso === "—" || iso.length < 10) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export const fmt = {
  n,
  sg,
  pct,
  sgpct,
  p,
  bp,
  rmseBp,
  yieldChange,
  mat,
  dateISO,
  dateText,
};

export default fmt;
