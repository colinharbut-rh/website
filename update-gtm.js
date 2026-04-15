/**
 * GTM CAPI update script
 * Replaces the old commented-out GTM snippet (head) and old noscript URL (body)
 * with the new CAPI-enabled server-side GTM code.
 *
 * Usage: node update-gtm.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SUBFOLDERS = ['', 'ai-data-analysis', 'author', 'power-bi', 'lp', 'blog', 'partners', 'resources'];

const OLD_HEAD = /<!--\s*Google Tag Manager \(disabled for local dev.*?-->/s;

const NEW_HEAD = `<!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src="https://ss.thereportinghub.com/eszeqvibt.js?"+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','5mssr8=HQZUMSUoVz45Wz5PNy1cBUlQR0dXARROAAoMBBQVFQEACwcRGRAYXRcNBA%3D%3D');</script>
  <!-- End Google Tag Manager -->`;

const OLD_NOSCRIPT = `https://www.googletagmanager.com/ns.html?id=GTM-MM9W9FH`;
const NEW_NOSCRIPT = `https://ss.thereportinghub.com/ns.html?id=GTM-MM9W9FH`;

let totalFiles = 0;
let updatedFiles = 0;

for (const sub of SUBFOLDERS) {
  const dir = path.join(ROOT, sub);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    totalFiles++;

    let changed = false;

    // Replace commented-out head GTM block
    if (OLD_HEAD.test(content)) {
      content = content.replace(OLD_HEAD, NEW_HEAD);
      changed = true;
    }

    // Replace old noscript URL
    if (content.includes(OLD_NOSCRIPT)) {
      content = content.replaceAll(OLD_NOSCRIPT, NEW_NOSCRIPT);
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      updatedFiles++;
      console.log(`  updated: ${path.relative(ROOT, filePath)}`);
    }
  }
}

console.log(`\nDone: ${updatedFiles}/${totalFiles} files updated.`);
