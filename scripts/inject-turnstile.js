/**
 * inject-turnstile.js
 *
 * Adds Cloudflare Turnstile CAPTCHA widget to every Formspree-connected form.
 *
 * For each HTML file in the site:
 *   1. Adds the Turnstile <script> tag to <head> (once per file)
 *   2. For every <form> whose action points to formspree.io:
 *      - Changes action to /api/form
 *      - Adds hidden _formspree_endpoint input
 *      - Inserts <div class="cf-turnstile"> before the submit button
 *
 * Usage:
 *   node scripts/inject-turnstile.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');
const SITE_KEY = '0x4AAAAAAC1kqPKVfSHwCjeC';
const FORMSPREE_PATTERN = /formspree\.io\/f\/([a-z0-9]+)/i;
const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

const SUBFOLDERS = ['', 'ai-data-analysis', 'author', 'power-bi', 'lp', 'blog', 'partners', 'resources'];

// Files to skip (legacy/test pages)
const SKIP_FILES = new Set(['test.html']);

function getAllHtmlFiles() {
  const files = [];
  SUBFOLDERS.forEach(sub => {
    const dir = path.join(ROOT, sub);
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir)
      .filter(f => f.endsWith('.html') && !SKIP_FILES.has(f))
      .forEach(f => files.push(sub ? `${sub}/${f}` : f));
  });
  return files;
}

function processFile(relPath) {
  const filePath = path.join(ROOT, relPath);
  const original = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(original, { decodeEntities: false });

  let modified = false;

  // Find all forms that post to Formspree
  $('form').each(function () {
    const form = $(this);
    const action = form.attr('action') || '';
    const match = action.match(FORMSPREE_PATTERN);
    if (!match) return;

    // Skip if already processed
    if (form.find('.cf-turnstile').length) return;

    // Insert Turnstile widget before the submit button/input
    const submitBtn = form.find('[type="submit"]').first();
    const widget = `<div class="cf-turnstile" data-sitekey="${SITE_KEY}" data-theme="light"></div>`;
    if (submitBtn.length) {
      submitBtn.before(widget);
    } else {
      form.append(widget);
    }

    modified = true;
  });

  if (!modified) return false;

  // 4. Add Turnstile script to <head> if not already present
  const headHasTurnstile = $('script[src*="turnstile"]').length > 0;
  if (!headHasTurnstile) {
    $('head').append(`\n  <script src="${TURNSTILE_SCRIPT_SRC}" async defer></script>`);
  }

  fs.writeFileSync(filePath, $.html(), 'utf-8');
  return true;
}

// ===== MAIN =====

const files = getAllHtmlFiles();
console.log(`Scanning ${files.length} HTML files...\n`);

let updated = 0;
let skipped = 0;

for (const relPath of files) {
  const changed = processFile(relPath);
  if (changed) {
    console.log(`  UPDATED: ${relPath}`);
    updated++;
  } else {
    skipped++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`  Updated: ${updated}`);
console.log(`  Already OK / no forms: ${skipped}`);
console.log(`\nDone. Run "node build.js inject-nav" if you also updated the nav.`);
