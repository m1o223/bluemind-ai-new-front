const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(__dirname, "../src");
const JSX_TEXT_RE = />\s*[A-Za-z][^<>{}]*\s*</;
const HARDCODED_ATTR_RE = /\b(?:placeholder|aria-label|title)="[A-Za-z]/;
const ALLOWED_FILES = new Set([]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "build" || entry.name === "node_modules") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else if (/\.(jsx|tsx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

const findings = [];

for (const file of walk(SRC_DIR)) {
  const relative = path.relative(SRC_DIR, file).replace(/\\/g, "/");
  if (ALLOWED_FILES.has(relative)) continue;

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes("=>") || line.includes("?.") || line.includes("Math.")) return;
    if (JSX_TEXT_RE.test(line) || HARDCODED_ATTR_RE.test(line)) {
      findings.push(`${relative}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (findings.length) {
  console.error("Hardcoded user-facing strings found. Move them to i18n:");
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log("i18n audit passed.");
