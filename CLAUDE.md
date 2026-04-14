# Reporting Hub — Claude Code Guide

## Project Overview

Static HTML marketing/product site for **Reporting Hub**, a white-label Power BI analytics platform by Webthrive. Exported from Webflow and maintained as a hand-edited static site. Deployed to Cloudflare Workers.
Currently Migrating from ../reportinghub-origin which is previous webflow version of this site. When user requires fix by looking over previous site, search there.
But when using previous site's feature, don't use webflow's builtin files, webflow related files, use your own or create if it's essential.

## Tech Stack

- **HTML:** Static, 130+ pages (root, `/blog`, `/lp`, `/power-bi`, `/ai-data-analysis`, `/partners`, `/resources`)
- **CSS:** Webflow-generated (`assets/css/base.css` + `assets/css/styles.css`) — no Tailwind/Bootstrap
- **JS:** Vanilla ES5 (`assets/js/main.js`) — no framework, no build step
- **Fonts:** Inter + Open Sans (loaded via `<link>` tags in each page)
- **Deployment:** Cloudflare Workers static assets (`wrangler.toml`)
- **Local dev:** `npx serve .`

## Build Scripts (Node.js)

Run directly with `node <script>`:

| Command                     | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `node build.js inject-nav`  | Inject `assets/partials/nav.html` into all pages   |
| `node build.js extract-nav` | Pull nav from index.html into the partial          |
| `node build.js status`      | Check nav consistency across pages                 |
| `node cleanup.js --report`  | Identify unused CSS classes and images             |
| `node migrate.js`           | One-time Webflow → static migration (don't re-run) |

**After editing the nav**, always run `node build.js inject-nav` to propagate changes.

## Nav Partial System

- Shared navbar lives in `assets/partials/nav.html`
- Uses `{{PREFIX}}` placeholders for relative paths (e.g. `href="{{PREFIX}}index.html"`)
- Root pages get prefix `''`, one-level-deep pages get `../`, etc.
- Build script also sets `aria-current="page"` and `w--current` on the active nav link

## File/Naming Conventions

- Files: `kebab-case.html`
- CSS classes: mix of Webflow utilities (`w-nav`, `w-container`, `uui-*`) and custom classes
- CSS variables: `--variable-name` (e.g. `--_themes---accent-color`, `--inter`)
- Images: WebP format for production (Sharp converts from PNG/JPG source)

## Key Directories

```
assets/css/        — stylesheets (do not hand-edit base.css)
assets/js/         — main.js (vanilla JS for nav, tabs, modals, etc.)
assets/images/     — WebP images (PNG originals deleted after conversion)
assets/partials/   — nav.html partial
blog/              — 61 blog post pages
lp/                — 14 landing pages
power-bi/          — Power BI product pages
ai-data-analysis/  — AI analytics pages
partners/          — Partner profile pages
resources/         — Whitepapers, webinars, datasheets
scripts/           — Utility scripts
```

## Deployment

- **Platform:** Cloudflare Workers (`wrangler.toml`)
- **Deploy:** `npx wrangler deploy` (confirm with user before running)
- **Clean URLs** enabled — `/about-us` serves `about-us.html`
- `.assetsignore` excludes node_modules, .git, config files from upload

## Dashboard Card Imports (MCP Tool)

When the user asks to **add dashboard cards** from a vendor (e.g. "Add Whatagraph Google Ads dashboards to the marketing dashboards page"), use the **Dashboard Importer MCP tools** — do not try to fetch images yourself.

### Workflow

1. **Call `scrape_gallery`** with the vendor ID and category:
   ```
   scrape_gallery({ vendor: "whatagraph", category: "google-ads" })
   ```
   Returns: `cards[]` (title, description, image_url, link) + `image_headers` for curl.

2. **Download each image** via Bash curl using the returned headers:
   ```bash
   curl -L -s \
     -H "Referer: https://whatagraph.com/" \
     -H "User-Agent: Mozilla/5.0 ..." \
     -o "assets/images/dashboards/whatagraph-google-ads-1.webp" \
     "[image_url]"
   ```
   Save to `assets/images/dashboards/<vendor>-<slug>.webp`.

3. **Write the HTML page** at `marketing-dashboards/<vendor>-<category>.html` using the card template below. Copy page skeleton (head, nav placeholder, footer) from an existing `partners/` page — use `../assets/` relative paths.

4. **Card HTML template** (reuses existing CSS — no new styles needed):
   ```html
   <div role="list" class="resourcesb-cards w-dyn-items">
     <!-- repeat per card -->
     <div role="listitem" class="collection-item w-dyn-item">
       <div class="resources-card">
         <div class="div-block-94">
           <img loading="lazy" src="../assets/images/dashboards/<filename>.webp"
                alt="<title> dashboard template" class="resources-images">
         </div>
         <div class="space-1-5"></div>
         <div class="resources-cards-contents">
           <div class="heading-style-h4"><title></div>
           <div class="space-1"></div>
           <div><description></div>
           <div class="space-1"></div>
           <a href="<link>" class="text-color-primary access-button w-inline-block"
              target="_blank" rel="noopener"><div>Use Template ➞</div></a>
         </div>
       </div>
     </div>
   </div>
   ```

5. **Run** `node build.js inject-nav` to inject the shared nav.

6. **Report done** and wait for the user to say "push" before committing.

### Supported Vendors
Use `list_vendors` to see all vendor IDs and available category filters. Current vendors: `whatagraph`, `databox`, `supermetrics`, `windsor`, `looker`, `catchr`, `portermetrics`, `agencyanalytics`, `bymarketers`.

---

## Important Notes

- No runtime framework — avoid introducing npm dependencies or bundlers
- GTM (Google Tag Manager) is currently commented out in pages
- HubSpot forms are embedded via script tags; meetings iframe was removed (broken)
- `styles.css` is large (273KB) — avoid wholesale edits; prefer targeted additions
- When adding new pages, copy structure from an existing page at the same directory depth
