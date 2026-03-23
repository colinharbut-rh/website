/**
 * Migration script: Webflow export -> Clean static HTML
 * Migrates all pages from reportinghub-origin to reportinghub
 *
 * Usage:
 *   node migrate.js                   - Migrate all pages
 *   node migrate.js index.html        - Migrate single page
 *   node migrate.js lp/               - Migrate all pages in a subfolder
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'reportinghub-origin');
const DEST_DIR = __dirname;

// Subfolders that contain HTML files
const SUBFOLDERS = ['', 'ai-data-analysis', 'author', 'power-bi', 'lp', 'blog', 'partners', 'resources'];

/**
 * Calculate the relative path prefix for assets based on page depth
 */
function getAssetPrefix(relPath) {
  const depth = relPath.split('/').length - 1;
  return depth > 0 ? '../'.repeat(depth) : '';
}

/**
 * Migrate a single HTML file
 */
function migratePage(relPath) {
  const srcFile = path.join(SRC_DIR, relPath);
  const destFile = path.join(DEST_DIR, relPath);

  if (!fs.existsSync(srcFile)) {
    console.log(`  SKIP: ${relPath} (not found)`);
    return null;
  }

  // Ensure destination directory exists
  const destDir = path.dirname(destFile);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  let html = fs.readFileSync(srcFile, 'utf-8');
  const prefix = getAssetPrefix(relPath);

  // --- HEAD REPLACEMENT ---
  const headStart = html.indexOf('<head>');
  const headEnd = html.indexOf('</head>') + '</head>'.length;

  if (headStart === -1 || headEnd === -1) {
    console.log(`  SKIP: ${relPath} (no <head> found)`);
    return null;
  }

  const oldHead = html.substring(headStart, headEnd);

  // Extract meta info from old head
  const titleMatch = oldHead.match(/<title>(.*?)<\/title>/s);
  const title = titleMatch ? titleMatch[1].trim() : 'The Reporting Hub';

  const descMatch = oldHead.match(/<meta content="(.*?)" name="description"/);
  const desc = descMatch ? descMatch[1] : '';

  const ogImageMatch = oldHead.match(/<meta content="(.*?)" property="og:image"/);
  const ogImage = ogImageMatch ? ogImageMatch[1] : '';

  // Check for noindex
  const hasNoindex = oldHead.includes('content="noindex"');

  const cleanHead = `<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta content="${desc}" name="description">
  <meta content="${ogImage}" property="og:image">
  <meta content="${ogImage}" property="twitter:image">
  <meta content="width=device-width, initial-scale=1" name="viewport">${hasNoindex ? '\n  <meta content="noindex" name="robots">' : ''}

  <!-- Fonts -->
  <link href="https://fonts.googleapis.com" rel="preconnect">
  <link href="https://fonts.gstatic.com" rel="preconnect" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400;1,600;1,700;1,800&display=swap" rel="stylesheet">

  <!-- Stylesheets -->
  <link href="${prefix}assets/css/base.css" rel="stylesheet" type="text/css">
  <link href="${prefix}assets/css/styles.css" rel="stylesheet" type="text/css">

  <!-- Favicon -->
  <link href="${prefix}assets/images/favicon.ico" rel="shortcut icon" type="image/x-icon">
  <link href="${prefix}assets/images/webclip.png" rel="apple-touch-icon">

  <!-- Google Tag Manager (disabled for local dev, re-enable for production)
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-MM9W9FH');</script>
  -->
</head>`;

  html = html.substring(0, headStart) + cleanHead + html.substring(headEnd);

  // --- HTML TAG ---
  html = html.replace(/<html[^>]*>/, '<html lang="en">');

  // --- REMOVE WEBFLOW COMMENTS ---
  html = html.replace(/<!--\s*This site was created in Webflow.*?-->/g, '');
  html = html.replace(/<!--\s*Last Published:.*?-->/g, '');

  // --- REMOVE WEBFLOW DATA ATTRIBUTES ---
  html = html.replace(/\s+data-wf--[a-z-]+--variant="[^"]*"/g, '');
  html = html.replace(/\s+data-wf-page="[^"]*"/g, '');
  html = html.replace(/\s+data-wf-site="[^"]*"/g, '');
  html = html.replace(/\s+data-w-id="[^"]*"/g, '');
  html = html.replace(/\s+data-w-node-[a-z0-9-]+="[^"]*"/g, '');

  // --- REMOVE ANIMATION INITIAL STATES ---
  html = html.replace(/\s+style="opacity:\s*0"/g, '');

  // --- UPDATE IMAGE PATHS ---
  // For root pages: images/ -> assets/images/
  // For subfolder pages: images/ -> ../assets/images/ (already handled by prefix)
  const imgPrefix = prefix + 'assets/images/';

  // Handle src attributes
  html = html.replace(/src="images\//g, `src="${imgPrefix}`);
  html = html.replace(/src="\.\.\/images\//g, `src="${imgPrefix}`);

  // Handle srcset attributes
  html = html.replace(/srcset="images\//g, `srcset="${imgPrefix}`);
  html = html.replace(/srcset="\.\.\/images\//g, `srcset="${imgPrefix}`);
  html = html.replace(/, images\//g, `, ${imgPrefix}`);
  html = html.replace(/, \.\.\/images\//g, `, ${imgPrefix}`);

  // Handle CSS url() in inline styles
  html = html.replace(/url\('\.\.\/images\//g, `url('${imgPrefix}`);
  html = html.replace(/url\('images\//g, `url('${imgPrefix}`);

  // Handle href to CSS/JS (for subfolders referencing ../css/)
  html = html.replace(/href="\.\.\/css\//g, `href="${prefix}assets/css/`);
  html = html.replace(/href="css\//g, `href="${prefix}assets/css/`);

  // --- REMOVE WEBFLOW SCRIPTS ---
  html = html.replace(/<script\s+src="[^"]*webflow[^"]*\.js"[^>]*><\/script>/g, '');
  html = html.replace(/<script\s+src="Script\.js"[^>]*><\/script>/g, '');

  // --- REMOVE JQUERY AND GSAP (Webflow animation dependencies) ---
  html = html.replace(/<script\s+src="[^"]*jquery[^"]*\.js[^"]*"[^>]*><\/script>/g, '<!-- jQuery removed -->');
  html = html.replace(/<script\s+src="[^"]*gsap[^"]*\.js"[^>]*><\/script>/g, '');
  html = html.replace(/<script[^>]*>gsap\.registerPlugin\(ScrollTrigger\);<\/script>/g, '');

  // --- REMOVE WEBFLOW OPTIMIZATION LOADER TRIGGER ---
  // Removes the xllbp interval script that depends on the removed xls class
  html = html.replace(/<script>\s*\/\/xllbp;[\s\S]*?<\/script>/g, '<!-- Removed: xls loader trigger -->');

  // --- FIX window.Webflow REFERENCES ---
  html = html.replace(/window\.Webflow\s*=\s*window\.Webflow\s*\|\|\s*\[\];\s*\n\s*window\.Webflow\.push\((\w+)\);/g,
    "document.addEventListener('DOMContentLoaded', $1);");

  // --- REMOVE DEFERRED LOADING TYPE ---
  html = html.replace(/type="load"/g, '');
  html = html.replace(/type="lload"/g, '');

  // --- ADD OUR MAIN.JS ---
  if (!html.includes('main.js')) {
    html = html.replace('</body>', `  <script src="${prefix}assets/js/main.js"></script>\n</body>`);
  }

  // --- CLEAN UP WHITESPACE ---
  html = html.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(destFile, html, 'utf-8');

  const srcSize = fs.statSync(srcFile).size;
  const destSize = fs.statSync(destFile).size;
  const saved = srcSize - destSize;

  return { relPath, srcSize, destSize, saved };
}

/**
 * Get all HTML files from a folder
 */
function getHtmlFiles(subfolder) {
  const dir = path.join(SRC_DIR, subfolder);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.html'))
    .map(f => subfolder ? `${subfolder}/${f}` : f);
}

// --- MAIN ---
const args = process.argv.slice(2);
let filesToMigrate = [];

if (args.length > 0) {
  // Migrate specific file or folder
  args.forEach(arg => {
    if (arg.endsWith('/')) {
      // It's a folder
      filesToMigrate.push(...getHtmlFiles(arg.replace(/\/$/, '')));
    } else {
      filesToMigrate.push(arg);
    }
  });
} else {
  // Migrate everything
  SUBFOLDERS.forEach(sub => {
    filesToMigrate.push(...getHtmlFiles(sub));
  });
}

console.log(`Migrating ${filesToMigrate.length} pages...\n`);

let totalSrcSize = 0;
let totalDestSize = 0;
let successCount = 0;

filesToMigrate.forEach(relPath => {
  const result = migratePage(relPath);
  if (result) {
    totalSrcSize += result.srcSize;
    totalDestSize += result.destSize;
    successCount++;
    const pct = ((1 - result.destSize / result.srcSize) * 100).toFixed(1);
    console.log(`  OK: ${result.relPath} (${(result.srcSize / 1024).toFixed(0)}KB -> ${(result.destSize / 1024).toFixed(0)}KB, -${pct}%)`);
  }
});

console.log(`\n=== Summary ===`);
console.log(`  Pages migrated: ${successCount}/${filesToMigrate.length}`);
console.log(`  Total original: ${(totalSrcSize / 1024).toFixed(0)} KB`);
console.log(`  Total cleaned:  ${(totalDestSize / 1024).toFixed(0)} KB`);
console.log(`  Total saved:    ${((totalSrcSize - totalDestSize) / 1024).toFixed(0)} KB (${((1 - totalDestSize / totalSrcSize) * 100).toFixed(1)}%)`);
