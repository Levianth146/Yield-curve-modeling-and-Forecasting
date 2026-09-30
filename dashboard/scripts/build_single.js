/**
 * Build a single-file snapshot for offline / file:// viewing (static benches).
 * Workers and ES-module fetch often fail on file:// — documented in README.
 *   node dashboard/scripts/build_single.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
fs.mkdirSync(dist, { recursive: true });

const css = ["tokens.css", "base.css", "bench.css"]
  .map((f) => fs.readFileSync(path.join(root, "css", f), "utf8"))
  .join("\n");

const note = `<!-- Single-file build ${new Date().toISOString()}. Open via http server for full Lab (workers). file://: static shells only. -->`;

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Yield Curve Lab (single)</title>
<style>${css}</style>
</head>
<body>
${note}
<header class="app-header"><h1>Yield Curve Lab</h1>
<p class="mono">Bản single-file tĩnh. Chạy <code>python -m http.server</code> trong <code>dashboard/</code> để dùng engine đầy đủ.</p>
</header>
<main style="padding:1.5rem;max-width:720px;margin:0 auto">
<p>Mở Lab đầy đủ: <a href="../index.html">index.html</a> qua HTTP.</p>
<p>Golden gate: <code>node dashboard/tests/run_all.mjs</code></p>
</main>
</body>
</html>`;

fs.writeFileSync(path.join(dist, "index.single.html"), html);
console.log("Wrote", path.join(dist, "index.single.html"));
