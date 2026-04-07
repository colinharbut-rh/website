/**
 * revert-form-actions.js
 *
 * Reverts form actions from /api/form back to the original Formspree URL,
 * and removes the _formspree_endpoint hidden inputs added by inject-turnstile.js.
 *
 * Usage: node scripts/revert-form-actions.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');
const SUBFOLDERS = ['', 'ai-data-analysis', 'author', 'power-bi', 'lp', 'blog', 'partners', 'resources'];

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

const files = getAllHtmlFiles();
console.log(`Scanning ${files.length} HTML files...\n`);

let updated = 0;

for (const relPath of files) {
  const filePath = path.join(ROOT, relPath);
  const original = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(original, { decodeEntities: false });

  let modified = false;

  $('form[action="/api/form"]').each(function () {
    const form = $(this);
    const endpointInput = form.find('input[name="_formspree_endpoint"]');
    const endpointId = endpointInput.attr('value') || 'xvzvbpyd';

    // Restore original Formspree action
    form.attr('action', `https://formspree.io/f/${endpointId}`);

    // Remove the helper hidden input
    endpointInput.remove();

    modified = true;
  });

  if (modified) {
    fs.writeFileSync(filePath, $.html(), 'utf-8');
    console.log(`  REVERTED: ${relPath}`);
    updated++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`  Reverted: ${updated}`);
