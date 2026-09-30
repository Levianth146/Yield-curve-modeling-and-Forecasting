import { formulaCard } from "../ui/formulaCard.js";
import { formulaFor } from "./formulas.js";

/** Build an open formula card for a model id with optional live example HTML. */
export function modelFormula(lang, id, example = "") {
  const f = formulaFor(id, lang);
  if (!f) return null;
  return formulaCard({
    title: f.title,
    tex: f.tex,
    symbols: f.symbols || [],
    where: f.where || "",
    intro: f.intro || "",
    read: f.read,
    example,
    open: true,
  });
}
