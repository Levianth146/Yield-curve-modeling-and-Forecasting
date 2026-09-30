#!/usr/bin/env node
/** Fail if views use raw toFixed for display (prefer fmt.*). Allows cache keys. */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "js", "views");
const re = /\.toFixed\s*\(/g;
let bad = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".js"))) {
  const src = readFileSync(join(dir, f), "utf8");
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    if (!re.test(line)) return;
    re.lastIndex = 0;
    // allow lam.toFixed / cache keys
    if (/lam\.toFixed|toFixed\(3\)\s*[;,]/.test(line) && /cache|key|k\s*=/.test(line)) return;
    if (/\.toFixed\(3\)/.test(line) && line.includes("lam")) return;
    console.error(`${f}:${i + 1}: ${line.trim()}`);
    bad++;
  });
}
if (bad) {
  console.error(`validate_no_tofixed: ${bad} hit(s)`);
  process.exit(1);
}
console.log("validate_no_tofixed: ok");
