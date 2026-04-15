/**
 * Cleanup script for Reporting Hub static site
 *
 * Tasks:
 *   1. Remove duplicate CSS rules from styles.css that exist in base.css
 *   2. Find unused CSS classes in styles.css (not referenced in any HTML)
 *   3. Find unused images (not referenced in any HTML or CSS)
 *
 * Usage:
 *   node cleanup.js --report          - Dry run, report only
 *   node cleanup.js --clean-css       - Remove duplicates + unused CSS rules
 *   node cleanup.js --unused-images   - List unused images
 *   node cleanup.js --all             - Do everything
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CSS_DIR = path.join(ROOT, 'assets', 'css');
const IMG_DIR = path.join(ROOT, 'assets', 'images');
const SUBFOLDERS = ['', 'ai-data-analysis', 'author', 'power-bi', 'lp', 'blog', 'partners', 'resources'];

// ===== HELPERS =====

function getAllHtmlFiles() {
  const files = [];
  SUBFOLDERS.forEach(sub => {
    const dir = path.join(ROOT, sub);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir)
      .filter(f => f.endsWith('.html'))
      .forEach(f => files.push(path.join(dir, f)));
  });
  return files;
}

function getAllHtmlContent() {
  return getAllHtmlFiles().map(f => fs.readFileSync(f, 'utf-8')).join('\n');
}

/**
 * Extract class selectors from CSS text
 * Returns a Set of class names (without the dot)
 */
function extractCssClasses(css) {
  const classes = new Set();
  // Match .class-name patterns (not inside strings or comments)
  // Remove comments first
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const matches = noComments.matchAll(/\.([a-zA-Z_][\w-]*)/g);
  for (const m of matches) {
    classes.add(m[1]);
  }
  return classes;
}

/**
 * Extract class names used in HTML (from class="" attributes)
 */
function extractHtmlClasses(html) {
  const classes = new Set();
  const matches = html.matchAll(/class="([^"]*)"/g);
  for (const m of matches) {
    m[1].split(/\s+/).forEach(c => {
      if (c) classes.add(c);
    });
  }
  return classes;
}

/**
 * Parse CSS into rule blocks (selector + declarations)
 * Returns array of { selector, body, start, end, raw }
 */
function parseCssBlocks(css) {
  const blocks = [];
  // This is a simplified parser for top-level rules
  let i = 0;
  const len = css.length;

  while (i < len) {
    // Skip whitespace
    while (i < len && /\s/.test(css[i])) i++;
    if (i >= len) break;

    // Skip comments
    if (css[i] === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end === -1) break;
      i = end + 2;
      continue;
    }

    // Read selector (up to {)
    const selectorStart = i;
    while (i < len && css[i] !== '{') i++;
    if (i >= len) break;

    const selector = css.substring(selectorStart, i).trim();

    // Read body (matching braces)
    let braceDepth = 0;
    const bodyStart = i;
    do {
      if (css[i] === '{') braceDepth++;
      else if (css[i] === '}') braceDepth--;
      i++;
    } while (i < len && braceDepth > 0);

    const raw = css.substring(selectorStart, i);
    const body = css.substring(bodyStart + 1, i - 1).trim();

    blocks.push({ selector, body, start: selectorStart, end: i, raw });
  }

  return blocks;
}

// ===== TASK 1: Find duplicate rules between base.css and styles.css =====

function findDuplicateRules() {
  const baseCss = fs.readFileSync(path.join(CSS_DIR, 'base.css'), 'utf-8');
  const stylesCss = fs.readFileSync(path.join(CSS_DIR, 'styles.css'), 'utf-8');

  const baseBlocks = parseCssBlocks(baseCss);
  const stylesBlocks = parseCssBlocks(stylesCss);

  // Build a set of selectors from base.css (normalized)
  const baseSelectors = new Set(baseBlocks.map(b => b.selector.replace(/\s+/g, ' ')));

  // Find styles.css blocks whose selectors are already in base.css
  const duplicates = [];

  // The first ~170 lines of styles.css contain Webflow utility duplicates
  // Only check those (the framework utility section before the site-specific body{} rule)
  for (const block of stylesBlocks) {
    const normalizedSelector = block.selector.replace(/\s+/g, ' ');

    // These are the known duplicate Webflow utility classes
    const isWebflowUtil = normalizedSelector.match(/^\.w-(layout-blockcontainer|layout-grid|form-formradioinput|pagination|page-count|layout-vflex|layout-hflex|checkbox)/);

    if (isWebflowUtil && baseSelectors.has(normalizedSelector)) {
      duplicates.push(block);
    }
  }

  return duplicates;
}

// ===== TASK 2: Find unused CSS classes =====

function findUnusedCssClasses() {
  const stylesCss = fs.readFileSync(path.join(CSS_DIR, 'styles.css'), 'utf-8');
  const allHtml = getAllHtmlContent();

  // Get all classes defined in styles.css
  const cssClasses = extractCssClasses(stylesCss);

  // Get all classes used in HTML
  const htmlClasses = extractHtmlClasses(allHtml);

  // Also check for classes referenced in JS
  const mainJs = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'main.js'), 'utf-8');
  const jsClassRefs = mainJs.matchAll(/['"]([a-zA-Z_][\w-]*)['"]/g);
  for (const m of jsClassRefs) {
    htmlClasses.add(m[1]);
  }

  // Classes in CSS but not in HTML
  const unused = [];
  for (const cls of cssClasses) {
    if (!htmlClasses.has(cls)) {
      // Also check if it's used as part of a compound selector (parent > .child)
      // or as a state class (.class.w--open)
      // Be conservative - skip w- prefixed utility classes (they might be inherited)
      if (cls.startsWith('w-') || cls.startsWith('w--')) continue;
      unused.push(cls);
    }
  }

  return { total: cssClasses.size, htmlUsed: htmlClasses.size, unused };
}

// ===== TASK 3: Find unused images =====

function findUnusedImages() {
  if (!fs.existsSync(IMG_DIR)) return { total: 0, unused: [], used: [] };

  const allImages = [];

  function walkDir(dir, prefix = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walkDir(path.join(dir, entry.name), prefix + entry.name + '/');
      } else if (entry.isFile()) {
        allImages.push(prefix + entry.name);
      }
    }
  }

  walkDir(IMG_DIR);

  // Get all references to images across HTML and CSS
  const allHtml = getAllHtmlContent();
  const stylesCss = fs.readFileSync(path.join(CSS_DIR, 'styles.css'), 'utf-8');
  const baseCss = fs.readFileSync(path.join(CSS_DIR, 'base.css'), 'utf-8');
  const allContent = allHtml + '\n' + stylesCss + '\n' + baseCss;

  const used = [];
  const unused = [];

  for (const img of allImages) {
    const imgName = path.basename(img);
    // Check both the full path and just the filename
    if (allContent.includes(imgName)) {
      used.push(img);
    } else {
      unused.push(img);
    }
  }

  return { total: allImages.length, used, unused };
}

// ===== TASK 4: Remove duplicate rules from styles.css =====

function removeDuplicatesFromStyles(dryRun = true) {
  const stylesCss = fs.readFileSync(path.join(CSS_DIR, 'styles.css'), 'utf-8');
  const duplicates = findDuplicateRules();

  if (duplicates.length === 0) {
    console.log('  No duplicate rules found.');
    return 0;
  }

  let cleaned = stylesCss;
  // Remove from end to start to preserve positions
  const sorted = [...duplicates].sort((a, b) => b.start - a.start);

  for (const dup of sorted) {
    // Remove the block + surrounding whitespace
    const before = cleaned.substring(0, dup.start);
    const after = cleaned.substring(dup.end);
    cleaned = before.trimEnd() + '\n\n' + after.trimStart();
  }

  // Clean up excessive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  const savedBytes = stylesCss.length - cleaned.length;

  if (!dryRun) {
    fs.writeFileSync(path.join(CSS_DIR, 'styles.css'), cleaned, 'utf-8');
    console.log(`  Removed ${duplicates.length} duplicate rules (saved ${savedBytes} bytes)`);
  } else {
    console.log(`  Would remove ${duplicates.length} duplicate rules (save ${savedBytes} bytes)`);
    duplicates.forEach(d => console.log(`    - ${d.selector}`));
  }

  return savedBytes;
}

// ===== TASK 5: Remove unused CSS rules from styles.css =====

function removeUnusedCssRules(dryRun = true) {
  const stylesCss = fs.readFileSync(path.join(CSS_DIR, 'styles.css'), 'utf-8');
  const allHtml = getAllHtmlContent();
  const htmlClasses = extractHtmlClasses(allHtml);

  // Also add JS-referenced classes
  const mainJs = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'main.js'), 'utf-8');
  const jsClassRefs = mainJs.matchAll(/['"]([a-zA-Z_][\w-]*)['"]/g);
  for (const m of jsClassRefs) {
    htmlClasses.add(m[1]);
  }

  const blocks = parseCssBlocks(stylesCss);
  const removableBlocks = [];

  for (const block of blocks) {
    // Skip @media blocks, :root, body, html, h1-h6, element selectors
    if (block.selector.startsWith('@') ||
        block.selector.startsWith(':root') ||
        /^(body|html|h[1-6]|p|a|img|ul|ol|table|td|th|label|input|textarea|select|button|fieldset|legend)\b/.test(block.selector)) {
      continue;
    }

    // Skip #w-node ID selectors (they're needed for grid layouts)
    if (block.selector.startsWith('#w-node-')) continue;

    // Skip w- prefixed utility classes (handled by base.css, but might still be needed)
    if (block.selector.match(/^\.w-/)) continue;

    // Extract classes from the selector
    const selectorClasses = [];
    const classMatches = block.selector.matchAll(/\.([a-zA-Z_][\w-]*)/g);
    for (const m of classMatches) {
      selectorClasses.push(m[1]);
    }

    if (selectorClasses.length === 0) continue;

    // Check if ANY of the classes in this selector are used in HTML
    const anyUsed = selectorClasses.some(c => htmlClasses.has(c));

    if (!anyUsed) {
      removableBlocks.push(block);
    }
  }

  if (removableBlocks.length === 0) {
    console.log('  No unused CSS rules found.');
    return 0;
  }

  let cleaned = stylesCss;
  const sorted = [...removableBlocks].sort((a, b) => b.start - a.start);

  for (const block of sorted) {
    const before = cleaned.substring(0, block.start);
    const after = cleaned.substring(block.end);
    cleaned = before.trimEnd() + '\n\n' + after.trimStart();
  }

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  const savedBytes = stylesCss.length - cleaned.length;

  if (!dryRun) {
    fs.writeFileSync(path.join(CSS_DIR, 'styles.css'), cleaned, 'utf-8');
    console.log(`  Removed ${removableBlocks.length} unused CSS rules (saved ${(savedBytes / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`  Would remove ${removableBlocks.length} unused CSS rules (save ${(savedBytes / 1024).toFixed(1)} KB)`);
    // Show first 20
    const show = removableBlocks.slice(0, 20);
    show.forEach(d => console.log(`    - ${d.selector.substring(0, 60)}`));
    if (removableBlocks.length > 20) {
      console.log(`    ... and ${removableBlocks.length - 20} more`);
    }
  }

  return savedBytes;
}

// ===== MAIN =====

const args = process.argv.slice(2);
const mode = args[0] || '--report';

console.log('=== Reporting Hub Cleanup ===\n');

if (mode === '--report' || mode === '--all') {
  console.log('1. Duplicate CSS Rules (styles.css vs base.css):');
  removeDuplicatesFromStyles(true);

  console.log('\n2. Unused CSS Classes:');
  removeUnusedCssRules(true);

  console.log('\n3. Image Usage:');
  const imgResult = findUnusedImages();
  console.log(`  Total images: ${imgResult.total}`);
  console.log(`  Used: ${imgResult.used.length}`);
  console.log(`  Unused: ${imgResult.unused.length}`);
  if (imgResult.unused.length > 0) {
    const show = imgResult.unused.slice(0, 20);
    show.forEach(img => console.log(`    - ${img}`));
    if (imgResult.unused.length > 20) {
      console.log(`    ... and ${imgResult.unused.length - 20} more`);
    }
  }

  // Size summary
  console.log('\n4. File Sizes:');
  const baseSize = fs.statSync(path.join(CSS_DIR, 'base.css')).size;
  const stylesSize = fs.statSync(path.join(CSS_DIR, 'styles.css')).size;
  console.log(`  base.css:   ${(baseSize / 1024).toFixed(1)} KB`);
  console.log(`  styles.css: ${(stylesSize / 1024).toFixed(1)} KB`);

  if (imgResult.unused.length > 0) {
    let unusedSize = 0;
    imgResult.unused.forEach(img => {
      const imgPath = path.join(IMG_DIR, img);
      if (fs.existsSync(imgPath)) {
        unusedSize += fs.statSync(imgPath).size;
      }
    });
    console.log(`  Unused images total: ${(unusedSize / 1024 / 1024).toFixed(1)} MB`);
  }
}

if (mode === '--clean-css' || mode === '--all') {
  console.log('\n--- Cleaning CSS ---');
  console.log('\nRemoving duplicate rules:');
  removeDuplicatesFromStyles(false);

  console.log('\nRemoving unused CSS rules:');
  removeUnusedCssRules(false);

  const newSize = fs.statSync(path.join(CSS_DIR, 'styles.css')).size;
  console.log(`\nNew styles.css size: ${(newSize / 1024).toFixed(1)} KB`);
}

if (mode === '--unused-images') {
  console.log('Unused Images:');
  const imgResult = findUnusedImages();
  let unusedSize = 0;
  imgResult.unused.forEach(img => {
    const imgPath = path.join(IMG_DIR, img);
    const size = fs.existsSync(imgPath) ? fs.statSync(imgPath).size : 0;
    unusedSize += size;
    console.log(`  ${img} (${(size / 1024).toFixed(1)} KB)`);
  });
  console.log(`\nTotal: ${imgResult.unused.length} files, ${(unusedSize / 1024 / 1024).toFixed(1)} MB`);
}

console.log('\nDone.');
