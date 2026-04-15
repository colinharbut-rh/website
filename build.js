/**
 * Build script for Reporting Hub static site
 *
 * Manages shared components (nav) across all pages via a template system.
 * The nav partial uses {{PREFIX}} placeholder for asset/page path prefixes.
 *
 * Usage:
 *   node build.js extract-nav          - Extract nav from index.html into partial
 *   node build.js inject-nav           - Inject nav partial into all pages
 *   node build.js inject-nav about-us.html  - Inject into specific page
 *   node build.js status               - Show which pages have outdated nav
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PARTIALS_DIR = path.join(ROOT, 'assets', 'partials');
const NAV_PARTIAL = path.join(PARTIALS_DIR, 'nav.html');
const SUBFOLDERS = ['', 'ai-data-analysis', 'author', 'power-bi', 'lp', 'blog', 'partners', 'resources', 'marketing-dashboards', 'reporting-tools'];

// ===== HELPERS =====

function getAssetPrefix(relPath) {
  const depth = relPath.split('/').length - 1;
  return depth > 0 ? '../'.repeat(depth) : '';
}

function getAllHtmlFiles() {
  const files = [];
  SUBFOLDERS.forEach(sub => {
    const dir = path.join(ROOT, sub);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir)
      .filter(f => f.endsWith('.html'))
      .forEach(f => files.push(sub ? `${sub}/${f}` : f));
  });
  return files;
}

/**
 * Extract the nav block from HTML content.
 * Returns { navHtml, navStart, navEnd } or null if not found.
 */
function extractNavFromHtml(html) {
  // Find the nav opening tag
  const navOpenRegex = /<div[^>]*class="navbar w-nav"[^>]*id="nav">/;
  const match = html.match(navOpenRegex);
  if (!match) return null;

  const navStart = match.index;

  // Find the matching closing div by counting brace depth
  // We need to find the closing </div> that matches the opening <div...navbar>
  let depth = 0;
  let i = navStart;
  const divOpenRegex = /<div[\s>]/g;
  const divCloseRegex = /<\/div>/g;

  // Walk through the HTML character by character tracking div depth
  while (i < html.length) {
    // Check for opening div tag
    if (html.substring(i, i + 4) === '<div' && (html[i + 4] === ' ' || html[i + 4] === '>')) {
      depth++;
      // Skip to end of tag
      const tagEnd = html.indexOf('>', i);
      if (tagEnd === -1) break;
      i = tagEnd + 1;
      continue;
    }

    // Check for closing div tag
    if (html.substring(i, i + 6) === '</div>') {
      depth--;
      if (depth === 0) {
        const navEnd = i + 6;
        return {
          navHtml: html.substring(navStart, navEnd),
          navStart,
          navEnd
        };
      }
      i += 6;
      continue;
    }

    i++;
  }

  return null;
}

/**
 * Normalize the nav HTML to use {{PREFIX}} placeholders
 */
function normalizeNav(navHtml) {
  let normalized = navHtml;

  // Replace asset paths with placeholder
  // Handle both root (assets/) and subfolder (../assets/) patterns
  normalized = normalized.replace(/(?:\.\.\/)*assets\/images\//g, '{{PREFIX}}assets/images/');
  normalized = normalized.replace(/(?:\.\.\/)*assets\/css\//g, '{{PREFIX}}assets/css/');
  normalized = normalized.replace(/(?:\.\.\/)*assets\/js\//g, '{{PREFIX}}assets/js/');

  // Replace page links with placeholder
  // Handle both root (page.html) and subfolder (../page.html) patterns
  // But skip external links (http/https) and anchor-only links (#)
  normalized = normalized.replace(/href="(?:\.\.\/)*([a-z][a-z0-9-]*\.html)"/g, 'href="{{PREFIX}}$1"');

  // Remove aria-current and w--current (these are page-specific)
  normalized = normalized.replace(/\s*aria-current="page"/g, '');
  normalized = normalized.replace(/\s*w--current/g, '');

  // Clean up any double spaces in class attributes from w--current removal
  normalized = normalized.replace(/class="([^"]*)\s{2,}([^"]*)"/g, 'class="$1 $2"');
  normalized = normalized.replace(/class="([^"]*)\s"/g, 'class="$1"');

  return normalized;
}

/**
 * Apply prefix and current-page highlighting to nav partial
 */
function renderNav(navTemplate, prefix, currentPage) {
  let rendered = navTemplate.replace(/\{\{PREFIX\}\}/g, prefix);

  // Add aria-current="page" and w--current to the current page link
  if (currentPage) {
    // For the nav brand link (home)
    if (currentPage === 'index.html') {
      rendered = rendered.replace(
        /(<a href="[^"]*index\.html" class="brand w-nav-brand)/,
        '$1 w--current" aria-current="page'
      );
      // Also mark the Home nav link
      rendered = rendered.replace(
        /(<a href="[^"]*index\.html" class="nav-link w-nav-link)/,
        '$1 w--current" aria-current="page'
      );
    } else {
      // Mark the matching nav link as current
      const pageRegex = new RegExp(
        `(<a href="[^"]*${currentPage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" class="nav-link w-nav-link)`,
        'g'
      );
      rendered = rendered.replace(pageRegex, '$1 w--current" aria-current="page');
    }
  }

  return rendered;
}

// ===== COMMANDS =====

function cmdExtractNav() {
  console.log('Extracting nav from index.html...\n');

  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
  const result = extractNavFromHtml(indexHtml);

  if (!result) {
    console.error('ERROR: Could not find nav in index.html');
    process.exit(1);
  }

  const normalized = normalizeNav(result.navHtml);

  // Ensure partials directory exists
  if (!fs.existsSync(PARTIALS_DIR)) {
    fs.mkdirSync(PARTIALS_DIR, { recursive: true });
  }

  fs.writeFileSync(NAV_PARTIAL, normalized, 'utf-8');
  console.log(`  Extracted nav partial (${(normalized.length / 1024).toFixed(1)} KB)`);
  console.log(`  Saved to: assets/partials/nav.html`);
  console.log(`  Contains ${(normalized.match(/\{\{PREFIX\}\}/g) || []).length} path placeholders`);
}

function cmdInjectNav(targetFiles) {
  if (!fs.existsSync(NAV_PARTIAL)) {
    console.error('ERROR: Nav partial not found. Run "node build.js extract-nav" first.');
    process.exit(1);
  }

  const navTemplate = fs.readFileSync(NAV_PARTIAL, 'utf-8');
  const files = targetFiles.length > 0 ? targetFiles : getAllHtmlFiles();

  console.log(`Injecting nav into ${files.length} pages...\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const relPath of files) {
    const filePath = path.join(ROOT, relPath);
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP: ${relPath} (not found)`);
      skipped++;
      continue;
    }

    const html = fs.readFileSync(filePath, 'utf-8');
    const result = extractNavFromHtml(html);

    if (!result) {
      console.log(`  SKIP: ${relPath} (no nav found)`);
      skipped++;
      continue;
    }

    const prefix = getAssetPrefix(relPath);
    const pageName = path.basename(relPath);
    const rendered = renderNav(navTemplate, prefix, pageName);

    // Replace the old nav with the new one
    const newHtml = html.substring(0, result.navStart) + rendered + html.substring(result.navEnd);

    if (newHtml !== html) {
      fs.writeFileSync(filePath, newHtml, 'utf-8');
      console.log(`  UPDATED: ${relPath}`);
      updated++;
    } else {
      console.log(`  OK: ${relPath} (already up to date)`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  if (errors > 0) console.log(`  Errors: ${errors}`);
}

function cmdStatus() {
  if (!fs.existsSync(NAV_PARTIAL)) {
    console.error('No nav partial found. Run "node build.js extract-nav" first.');
    process.exit(1);
  }

  const navTemplate = fs.readFileSync(NAV_PARTIAL, 'utf-8');
  const files = getAllHtmlFiles();

  console.log(`Checking nav status across ${files.length} pages...\n`);

  let upToDate = 0;
  let outdated = 0;
  let missing = 0;

  for (const relPath of files) {
    const filePath = path.join(ROOT, relPath);
    const html = fs.readFileSync(filePath, 'utf-8');
    const result = extractNavFromHtml(html);

    if (!result) {
      console.log(`  NO NAV: ${relPath}`);
      missing++;
      continue;
    }

    const prefix = getAssetPrefix(relPath);
    const pageName = path.basename(relPath);
    const rendered = renderNav(navTemplate, prefix, pageName);

    // Normalize both for comparison (ignore w--current and aria-current differences)
    const currentNormalized = normalizeNav(result.navHtml);

    if (currentNormalized === navTemplate) {
      upToDate++;
    } else {
      console.log(`  OUTDATED: ${relPath}`);
      outdated++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Up to date: ${upToDate}`);
  console.log(`  Outdated: ${outdated}`);
  console.log(`  No nav: ${missing}`);
}

// ===== MAIN =====

const args = process.argv.slice(2);
const command = args[0] || 'status';

switch (command) {
  case 'extract-nav':
    cmdExtractNav();
    break;
  case 'inject-nav':
    cmdInjectNav(args.slice(1));
    break;
  case 'status':
    cmdStatus();
    break;
  default:
    console.log('Usage:');
    console.log('  node build.js extract-nav          - Extract nav from index.html');
    console.log('  node build.js inject-nav           - Inject nav into all pages');
    console.log('  node build.js inject-nav page.html - Inject into specific page');
    console.log('  node build.js status               - Check nav consistency');
}
