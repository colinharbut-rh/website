/**
 * Point resource/whitepaper PDF links at the public R2 bucket (objects at bucket root).
 *
 * The Cloudflare *dashboard* URL is not a file URL. Use the bucket’s **Public Bucket URL**
 * (r2.dev or a custom domain) from R2 → bucket "assets" → Settings → Public access.
 *
 * Usage:
 *   RH_RESOURCES_PDF_BASE=https://pub-xxxx.r2.dev node scripts/apply-resource-r2-pdfs.js
 *
 * Default base (override with env): https://assets.thereportinghub.com
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const RESOURCES_DIR = path.join(ROOT, "resources");

const DEFAULT_BASE = "https://assets.thereportinghub.com";

/** HubSpot Whitepapers path segment → exact R2 object key (bucket root). */
const HUBSPOT_FILE_TO_R2_OBJECT = {
  "Reporting-Hub-Bahler-Management-Case-Study.pdf":
    "Case Study - Bahler-Management + Reporting Hub.pdf",
  "Reporting-Hub-Overview.pdf": "Reporting Hub - Overview.pdf",
  "Reporting-Hub-Datasheet.pdf": "Reporting Hub Datasheet.pdf",
  "Reporting-Hub-Licensing-Cost-Comparison.pdf":
    "Reporting Hub Licensing Cost Comparison.pdf",
  "The-Definitive-Guide-to-Power-BI-Embedded.pdf":
    "The Definitive Guide to Power BI Embedded.pdf",
  "Why-Your-Organization-Should-Use-a-White-Label-Power-BI-Platform.pdf":
    "White Paper - Why Your Org Should Use a White Label Power BI Platform.pdf",
};

const HUBSPOT_PREFIX =
  "https://44531319.fs1.hubspotusercontent-na1.net/hubfs/44531319/Whitepapers/";

function normalizeBase(raw) {
  const b = (raw && String(raw).trim()) || DEFAULT_BASE;
  const trimmed = b.replace(/\/+$/, "");
  if (!/^https:\/\//i.test(trimmed)) {
    console.error("RH_RESOURCES_PDF_BASE must start with https://");
    process.exit(1);
  }
  return trimmed;
}

function r2Url(base, objectKey) {
  const enc = objectKey.split("/").map(encodeURIComponent).join("/");
  return `${base}/${enc}`;
}

function buildReplacements(base) {
  const out = [];
  for (const [hubFile, r2Object] of Object.entries(HUBSPOT_FILE_TO_R2_OBJECT)) {
    const from = `${HUBSPOT_PREFIX}${hubFile}`;
    const to = r2Url(base, r2Object);
    out.push([from, to]);
  }
  return out;
}

function main() {
  const base = normalizeBase(process.env.RH_RESOURCES_PDF_BASE || "");
  const pairs = buildReplacements(base);
  if (!fs.existsSync(RESOURCES_DIR)) {
    console.error("resources/ not found");
    process.exit(1);
  }

  const files = fs
    .readdirSync(RESOURCES_DIR)
    .filter((f) => f.endsWith(".html"))
    .map((f) => path.join(RESOURCES_DIR, f));

  const galateaCase = r2Url(
    base,
    "Case Study - Galatea Technologies + Reporting Hub.pdf"
  );
  const galateaHubDatasheet = `${HUBSPOT_PREFIX}Reporting-Hub-Datasheet.pdf`;

  let changed = 0;
  for (const full of files) {
    let html = fs.readFileSync(full, "utf8");
    const orig = html;
    const isGalatea = path.basename(full) === "galatea-technologies.html";

    for (const [from, to] of pairs) {
      if (isGalatea && from === galateaHubDatasheet) continue;
      if (html.includes(from)) html = html.split(from).join(to);
    }

    if (isGalatea && html.includes(galateaHubDatasheet)) {
      html = html.split(galateaHubDatasheet).join(galateaCase);
    }

    if (html !== orig) {
      fs.writeFileSync(full, html, "utf8");
      changed++;
      console.log(`  ${path.relative(ROOT, full)}`);
    }
  }

  console.log(`\nRH_RESOURCES_PDF_BASE=${base}`);
  console.log(`Updated ${changed} resource HTML file(s).`);
}

main();
