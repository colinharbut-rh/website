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

| Command | Purpose |
| --- | --- |
| `node build.js inject-nav` | Inject `assets/partials/nav.html` into all pages |
| `node build.js extract-nav` | Pull nav from index.html into the partial |
| `node build.js status` | Check nav consistency across pages |
| `node build.js extract-footer` | Extract main footer from `index.html` into `assets/partials/footer.html` |
| `node build.js inject-footer` | Inject footer partial into all pages |
| `node build.js footer-status` | Check footer consistency across pages |
| `node build.js inject-social-meta` | Add/update OG + Twitter Card meta from each page `title` + `meta description` |
| `npm run parity-live` | Compare local HTML URLs and `<title>` to `thereportinghub.com` (report gitignored) |
| `node cleanup.js --report` | Identify unused CSS classes and images |
| `node migrate.js` | One-time Webflow → static migration (don't re-run) |

**After editing the nav**, always run `node build.js inject-nav` to propagate changes.

**After bulk edits to `<title>` or meta description**, run `node build.js inject-social-meta` so Open Graph and Twitter tags stay aligned.

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

## Important Notes

- No runtime framework — avoid introducing npm dependencies or bundlers
- GTM (Google Tag Manager) is currently commented out in pages
- HubSpot forms are embedded via script tags; meetings iframe was removed (broken)
- `styles.css` is large (273KB) — avoid wholesale edits; prefer targeted additions
- When adding new pages, copy structure from an existing page at the same directory depth
