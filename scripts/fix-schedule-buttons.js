/**
 * fix-schedule-buttons.js
 * Replaces href="#" on "Schedule it Now" .primary-copy buttons with the real meetings URL.
 * Run: node scripts/fix-schedule-buttons.js
 */
const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const MEETINGS_URL = 'https://meetings.hubspot.com/jaime-lamy1';

let changed = 0;

function processFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (!html.includes('primary-copy')) return;

  const before = html;

  // Replace href="#" on any anchor with class primary-copy
  html = html.replace(
    /<a\s+href="#"\s+(class="[^"]*primary-copy[^"]*")/g,
    `<a href="${MEETINGS_URL}" target="_blank" $1`
  );

  if (html !== before) {
    fs.writeFileSync(filePath, html, 'utf8');
    console.log('  OK: ' + path.relative(ROOT, filePath));
    changed++;
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(function(name) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === '.git' || name === 'scripts') return;
      walkDir(full);
    } else if (name.endsWith('.html')) {
      processFile(full);
    }
  });
}

walkDir(ROOT);
console.log('\nDone: ' + changed + ' files updated.\n');
