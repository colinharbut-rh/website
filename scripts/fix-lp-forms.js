/**
 * fix-lp-forms.js — Fix remaining lp/ popup forms & Webflow form attrs
 * Run: node scripts/fix-lp-forms.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const LP = path.join(ROOT, 'lp');

let changed = 0;

function fix(filePath) {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  const before = html;

  // 1. Fix popup Download form: method="get" + Webflow attrs → Formspree POST
  html = html.replace(
    /<form\s+id="wf-form-Download-Popup-Form"\s+name="wf-form-Download-Popup-Form"\s+data-name="Download Popup Form"\s+method="get"\s+data-wf-page-id="[^"]*"\s+data-wf-element-id="[^"]*">/g,
    '<form id="wf-form-Download-Popup-Form" name="wf-form-Download-Popup-Form" method="POST" action="https://formspree.io/f/xvzvbpyd"><input type="hidden" name="_next" value="../confirm.html">'
  );

  // 2. Fix hero email-form: method="get" + Webflow attrs → Formspree POST
  html = html.replace(
    /<form\s+id="email-form"\s+name="email-form"\s+data-name="Email Form"\s+method="get"\s+class="([^"]*)"\s+data-wf-page-id="[^"]*"\s+data-wf-element-id="[^"]*">/g,
    '<form id="email-form" name="email-form" method="POST" action="https://formspree.io/f/xvzvbpyd" class="$1">'
  );

  // 3. Strip leftover Webflow input attrs: data-name, data-wait on inputs
  html = html.replace(/\s+data-name="[^"]*"/g, '');
  html = html.replace(/\s+data-wait="[^"]*"/g, '');

  if (html !== before) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('  OK: ' + path.relative(ROOT, filePath));
    changed++;
  } else {
    console.log('  SKIP (no change): ' + path.relative(ROOT, filePath));
  }
}

const files = fs.readdirSync(LP)
  .filter(f => f.endsWith('.html'))
  .map(f => path.join(LP, f));

files.forEach(fix);
console.log(`\nDone: ${changed} changed.\n`);
