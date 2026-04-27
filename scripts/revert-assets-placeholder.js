/**
 * Revert mistaken absolute asset URLs (e.g. RH_ASSETS_BASE_URL left as YOUR-PUBLIC-R2-ORIGIN)
 * back to relative paths so static hosting works without a CDN.
 *
 * Usage: node scripts/revert-assets-placeholder.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PLACEHOLDER = "https://YOUR-PUBLIC-R2-ORIGIN/assets/";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "scripts",
  "mcp-server",
  "reportinghub-origin",
]);

function walkHtml(relDir = "") {
  const out = [];
  const dir = relDir ? path.join(ROOT, relDir) : ROOT;
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(name.name)) continue;
    const sub = relDir ? `${relDir}/${name.name}` : name.name;
    const full = path.join(ROOT, sub);
    if (name.isDirectory()) {
      out.push(...walkHtml(sub));
    } else if (name.name.endsWith(".html")) {
      out.push(sub.replace(/\\/g, "/"));
    }
  }
  return out;
}

/** Relative path from HTML file to assets/ (nav partial uses {{PREFIX}}). */
function relativeAssetsPrefix(relPath) {
  if (relPath === "assets/partials/nav.html") return "{{PREFIX}}assets/";
  const parts = relPath.split("/").filter(Boolean);
  const depth = parts.length - 1;
  if (depth <= 0) return "assets/";
  return `${"../".repeat(depth)}assets/`;
}

function main() {
  const files = walkHtml();
  let changed = 0;

  for (const rel of files) {
    const full = path.join(ROOT, ...rel.split("/"));
    const original = fs.readFileSync(full, "utf8");
    if (!original.includes(PLACEHOLDER)) continue;
    const prefix = relativeAssetsPrefix(rel);
    const next = original.split(PLACEHOLDER).join(prefix);
    fs.writeFileSync(full, next, "utf8");
    changed++;
  }

  console.log(`Replaced ${PLACEHOLDER} → relative assets prefix in ${changed} file(s).`);
}

main();
