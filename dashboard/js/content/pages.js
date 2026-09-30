/** Lang-aware page copy. */
import { pages as vi, fill as fillVi } from "./pages.vi.js";
import { pages as en, fill as fillEn } from "./pages.en.js";

export function fill(tpl, vars) {
  return fillVi(tpl, vars);
}

export function pageCopy(lang) {
  return lang === "en" ? en : vi;
}

export { vi as pagesVi, en as pagesEn };
