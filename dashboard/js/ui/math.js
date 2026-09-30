/** KaTeX helper — offline vendor; falls back to <code> on error. */

export function math(tex, { display = false } = {}) {
  const wrap = document.createElement(display ? "div" : "span");
  wrap.className = display ? "math-block" : "math-inline";
  try {
    if (typeof katex === "undefined") throw new Error("katex missing");
    katex.render(tex, wrap, { displayMode: display, throwOnError: false, strict: "ignore" });
  } catch (e) {
    const code = document.createElement("code");
    code.className = "formula-fallback";
    code.textContent = tex;
    wrap.appendChild(code);
  }
  return wrap;
}

export function mathHtml(tex, { display = false } = {}) {
  try {
    if (typeof katex === "undefined") throw new Error("katex missing");
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore" });
  } catch {
    return `<code class="formula-fallback">${tex.replace(/</g, "&lt;")}</code>`;
  }
}
