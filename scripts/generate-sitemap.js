/**
 * Generate sitemap.xml (and robots.txt) for the static Reporting Hub site.
 *
 * Usage:
 *   node scripts/generate-sitemap.js
 *   SITE_BASE_URL=https://thereportinghub.com node scripts/generate-sitemap.js
 *
 * Default SITE_BASE_URL: https://reportinghub-website.reportinghub.workers.dev
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'scripts', 'mcp-server']);
const SKIP_FILES = new Set(['test.html']);

function walkHtml(relDir = '') {
  const out = [];
  const dir = relDir ? path.join(ROOT, relDir) : ROOT;
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(name.name)) continue;
    const sub = relDir ? `${relDir}/${name.name}` : name.name;
    const full = path.join(ROOT, sub);
    if (name.isDirectory()) {
      out.push(...walkHtml(sub));
    } else if (name.name.endsWith('.html')) {
      if (SKIP_FILES.has(name.name)) continue;
      out.push(sub.replace(/\\/g, '/'));
    }
  }
  return out;
}

function fileToUrlPath(rel) {
  const norm = rel.replace(/\\/g, '/');
  if (norm === 'index.html') return '/';
  if (norm.endsWith('.html')) return `/${norm.slice(0, -5)}`;
  return `/${norm}`;
}

function main() {
  const baseRaw = process.env.SITE_BASE_URL || 'https://reportinghub-website.reportinghub.workers.dev';
  const base = baseRaw.replace(/\/+$/, '');
  const files = walkHtml().sort();
  const now = new Date().toISOString().split('T')[0];

  const urlEntries = files.map((rel) => {
    const pathPart = fileToUrlPath(rel);
    const loc = `${base}${pathPart === '/' ? '/' : pathPart}`;
    return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${now}</lastmod>\n  </url>`;
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>
`;

  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
  console.log(`Wrote ${urlEntries.length} URLs to ${path.relative(process.cwd(), sitemapPath)}`);

  const robots = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots, 'utf-8');
  console.log(`Wrote robots.txt (Sitemap: ${base}/sitemap.xml)`);
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

main();
