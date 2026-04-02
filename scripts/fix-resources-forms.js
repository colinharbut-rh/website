/**
 * fix-resources-forms.js
 * Fixes hero `email-form` forms in resources/*.html and detail_resources.html:
 *   - method="get" → method="POST"
 *   - adds action="https://formspree.io/f/xvzvbpyd"
 *   - adds _next hidden input pointing to the data-pdf-url on the parent wrapper
 *     (falls back to confirm page if no PDF URL found)
 * Run: node scripts/fix-resources-forms.js
 */
const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, '..');
const ENDPOINT = 'https://formspree.io/f/xvzvbpyd';

let changed = 0;

function fixFile(filePath, confirmUrl) {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');

  // Only process if there's still an unfixed email-form
  if (!html.includes('id="email-form"') || !html.includes('method="get"')) {
    return;
  }

  // Extract data-pdf-url from the nearest form-wrapper before the email-form
  const pdfMatch = html.match(/data-pdf-url="([^"]+)"[^>]*class="form-wrapper/);
  const pdfUrl   = pdfMatch ? pdfMatch[1] : '';
  const nextUrl  = pdfUrl || confirmUrl;

  // Replace the email-form opening tag: strip Webflow attrs, add POST+action
  html = html.replace(
    /<form\s+id="email-form"\s+name="email-form"\s+data-name="Email Form"\s+method="get"[^>]*>/,
    `<form id="email-form" name="email-form" method="POST" action="${ENDPOINT}"><input type="hidden" name="_next" value="${nextUrl}">`
  );

  // Strip leftover data-name / data-wait from inputs in this form
  // (safe to do globally — these attrs have no meaningful use)
  html = html.replace(/\s+data-name="[^"]*"/g, '');
  html = html.replace(/\s+data-wait="[^"]*"/g, '');

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`  OK [${pdfUrl ? 'PDF' : 'confirm'}]: ${path.relative(ROOT, filePath)}`);
  changed++;
}

// Resources subdirectory (one level deep — _next = ../confirm.html as fallback)
const resDir = path.join(ROOT, 'resources');
fs.readdirSync(resDir)
  .filter(f => f.endsWith('.html'))
  .forEach(f => fixFile(path.join(resDir, f), '../confirm.html'));

// Root-level detail_resources.html (one level up — _next = confirm.html)
fixFile(path.join(ROOT, 'detail_resources.html'), 'confirm.html');

console.log(`\nDone: ${changed} changed.\n`);
