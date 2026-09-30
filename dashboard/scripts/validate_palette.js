import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tokens = fs.readFileSync(path.join(__dirname, "../css/tokens.css"), "utf8");
const required = ["--accent", "--surface", "--text", "--hairline", "--recession", "--fragile"];
const missing = required.filter((v) => !tokens.includes(v));
if (missing.length) {
  console.error("Missing CSS tokens:", missing.join(", "));
  process.exit(1);
}
console.log("Palette tokens OK:", required.join(", "));
