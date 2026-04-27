/**
 * Rewrite static asset URLs in HTML to an absolute CDN base (e.g. public R2 URL).
 *
 * Prerequisites:
 * - Bucket objects mirror the same paths as in-repo under `assets/` (e.g.
 *   `assets/images/foo.webp`, `assets/css/styles.css`, `assets/js/main.js`).
 * - R2 bucket allows public reads (custom domain or r2.dev public URL).
 *
 * Usage:
 *   RH_ASSETS_BASE_URL=https://<your-public-host> node scripts/apply-assets-cdn-base.js
 *
 * If RH_ASSETS_BASE_URL is unset or empty, exits 0 without changing files.
 *
 * Switching base (e.g. Workers staging → public R2): set RH_ASSETS_BASE_URL to the
 * new origin. Any URL of the form `<knownOrigin>/assets/` is rewritten to the new base.
 * Optional comma-separated RH_ASSETS_PREVIOUS_ORIGINS adds more hosts to replace.
 */

const fs = require("fs");
const path = require("path");

/** Origins previously baked into HTML; replaced when RH_ASSETS_BASE_URL differs. */
const DEFAULT_PREVIOUS_ASSET_ORIGINS = [
  "https://reportinghub-website.reportinghub.workers.dev",
];

const ROOT = path.join(__dirname, "..");
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "scripts",
  "mcp-server",
  "reportinghub-origin",
]);
const SKIP_FILES = new Set(["test.html"]);

/** Subpaths under assets/ that appear in HTML (not partials templates). */
const ASSET_SEG = "(?:images|js|css|media)";

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
      if (SKIP_FILES.has(name.name)) continue;
      out.push(sub.replace(/\\/g, "/"));
    }
  }
  return out;
}

function normalizeBase(raw) {
  if (!raw || !String(raw).trim()) return null;
  let b = String(raw).trim().replace(/\/+$/, "");
  if (!/^https:\/\//i.test(b)) {
    console.error("RH_ASSETS_BASE_URL must start with https://");
    process.exit(1);
  }
  return b;
}

/**
 * Rewrite relative asset references to absolute CDN URLs.
 * Handles optional ../ chains and srcset comma-separated URLs.
 */
function rewriteHtml(html, base) {
  const prefix = `${base}/assets/`;
  let out = html;
  // srcset: "..., ../assets/images/x.webp 500w" or "..., assets/images/x 500w"
  out = out.replace(
    new RegExp(`(,\\s*)((?:\\.\\./)+)assets\\/(${ASSET_SEG}\\/)`, "g"),
    (_, comma, rel, rest) => `${comma}${prefix}${rest}`
  );
  out = out.replace(
    new RegExp(`(,\\s*)assets\\/(${ASSET_SEG}\\/)`, "g"),
    (_, comma, rest) => `${comma}${prefix}${rest}`
  );
  // Quoted attributes: src=".../assets/images/...", href=".../assets/css/..."
  out = out.replace(
    new RegExp(`(["'])((?:\\.\\./)+)assets\\/(${ASSET_SEG}\\/)`, "g"),
    (_, q, rel, rest) => `${q}${prefix}${rest}`
  );
  out = out.replace(
    new RegExp(`(["'])assets\\/(${ASSET_SEG}\\/)`, "g"),
    (_, q, rest) => `${q}${prefix}${rest}`
  );
  // Inline CSS url(../assets/...) or url(assets/...)
  out = out.replace(
    new RegExp(`url\\(((?:["']?))((?:\\.\\./)+)assets\\/(${ASSET_SEG}\\/)`, "g"),
    (_, open, rel, rest) => `url(${open}${prefix}${rest}`
  );
  out = out.replace(
    new RegExp(`url\\(((?:["']?))assets\\/(${ASSET_SEG}\\/)`, "g"),
    (_, open, rest) => `url(${open}${prefix}${rest}`
  );
  return out;
}

/** Nav partial: {{PREFIX}}assets/... -> absolute base (PREFIX stays for page links). */
function rewriteNavPartial(html, base) {
  return html.replace(
    /\{\{PREFIX\}\}assets\/(images|js|css|media)\//g,
    `${base}/assets/$1/`
  );
}

/** Replace absolute `/assets/...` URLs that already point at a known old origin. */
function retargetAbsoluteAssetOrigins(html, base) {
  const extra = (process.env.RH_ASSETS_PREVIOUS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  const origins = new Set([...DEFAULT_PREVIOUS_ASSET_ORIGINS, ...extra]);
  origins.delete(base);
  let out = html;
  for (const old of origins) {
    const needle = `${old}/assets/`;
    if (out.includes(needle)) out = out.split(needle).join(`${base}/assets/`);
  }
  return out;
}

function main() {
  const base = normalizeBase(process.env.RH_ASSETS_BASE_URL);
  if (!base) {
    console.log(
      "RH_ASSETS_BASE_URL not set; skipping CDN asset rewrite (HTML unchanged)."
    );
    return;
  }

  const files = walkHtml();
  let changed = 0;

  for (const rel of files) {
    const full = path.join(ROOT, ...rel.split("/"));
    const original = fs.readFileSync(full, "utf8");
    let s = retargetAbsoluteAssetOrigins(original, base);
    const next =
      rel === "assets/partials/nav.html"
        ? rewriteNavPartial(s, base)
        : rewriteHtml(s, base);
    if (next !== original) {
      fs.writeFileSync(full, next, "utf8");
      changed++;
    }
  }

  console.log(
    `RH_ASSETS_BASE_URL=${base} — updated ${changed} file(s) with absolute asset URLs.`
  );
}

main();
