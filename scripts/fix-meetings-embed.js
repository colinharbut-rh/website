/**
 * fix-meetings-embed.js
 * Replaces old benjamin-cutler1 meetings iframe embed with jaime-lamy1 across all pages.
 * - Updates data-src to new URL
 * - Removes hardcoded <iframe> (HubSpot embed script creates it from data-src)
 * Run: node scripts/fix-meetings-embed.js
 */
const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const NEW_SRC = 'https://meetings.hubspot.com/jaime-lamy1?embed=true';

// New clean embed block
const NEW_EMBED = `<div class="meetings-iframe-container" data-src="${NEW_SRC}"></div>
          <script type="text/javascript" src="https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js"></script>`;

let changed = 0;

function processFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (!html.includes('meetings.hubspot.com/benjamin-cutler1') && !html.includes('meetings.hubspot.com/jaime-lamy1')) return;

  const before = html;

  // Replace: meetings-iframe-container div (with any embedded iframe inside) + optional script tag
  // Pattern covers both: container with hardcoded iframe, and bare container
  html = html.replace(
    /<div class="meetings-iframe-container"[^>]*data-src="[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?:<script[^>]*MeetingsEmbed[^>]*><\/script>)?/g,
    NEW_EMBED
  );

  // Also update any leftover bare data-src references pointing to old URL
  html = html.replace(
    /data-src="https:\/\/meetings\.hubspot\.com\/benjamin-cutler1[^"]*"/g,
    `data-src="${NEW_SRC}"`
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
