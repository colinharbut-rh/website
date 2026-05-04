/**
 * Map each deployable .html file to https://thereportinghub.com/{clean path},
 * fetch live URL, compare HTTP status and <title> to the local file.
 *
 * Usage: node scripts/live-site-parity-check.js
 *
 * Excludes: assets/partials (fragments), dot-directories, node_modules, .git, scripts
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LIVE_ORIGIN = 'https://thereportinghub.com';

/** All deployable HTML except assets/ (partials live under assets/partials). Matches worker deploy scope. */
function walkAllSiteHtml() {
  const out = [];
  function walk(relDir) {
    const dir = relDir ? path.join(ROOT, relDir) : ROOT;
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
      if (name.name.startsWith('.')) continue;
      if (name.name === 'node_modules' || name.name === '.git' || name.name === 'scripts') continue;
      if (name.name === 'assets') continue;
      const sub = relDir ? `${relDir}/${name.name}` : name.name;
      const full = path.join(ROOT, sub);
      if (name.isDirectory()) {
        walk(sub);
      } else if (name.name.endsWith('.html')) {
        out.push(sub.replace(/\\/g, '/'));
      }
    }
  }
  walk('');
  return out;
}

function fileToLiveUrl(relPath) {
  if (relPath === 'index.html') return `${LIVE_ORIGIN}/`;
  const noExt = relPath.replace(/\.html$/, '');
  return `${LIVE_ORIGIN}/${noExt}`;
}

function readLocalTitle(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const m = raw.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? decodeBasicEntities(m[1].trim()) : '';
}

const CONCURRENCY = 8;

async function fetchWithTitle(url) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': 'ReportingHub-parity-check/1.0' }
      });
      const text = await res.text();
      const m = text.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = m ? decodeBasicEntities(m[1].trim()) : '';
      return { status: res.status, finalUrl: res.url, title };
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw lastErr;
}

async function runLimited(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  const files = walkAllSiteHtml().sort();
  console.log(`Files to check: ${files.length}\n`);

  const tasks = files.map(rel => {
    const liveUrl = fileToLiveUrl(rel);
    const localPath = path.join(ROOT, rel);
    const localTitle = readLocalTitle(localPath);
    return { rel, liveUrl, localTitle, localPath };
  });

  const results = await runLimited(tasks, CONCURRENCY, async t => {
    try {
      const live = await fetchWithTitle(t.liveUrl);
      const titleMatch =
        !t.localTitle && !live.title
          ? 'both-empty'
          : titlesEqual(t.localTitle, live.title)
            ? 'match'
            : 'mismatch';
      return { ...t, ...live, titleMatch, err: null };
    } catch (e) {
      return { ...t, status: 0, finalUrl: '', title: '', titleMatch: 'error', err: String(e.message) };
    }
  });

  const not200 = results.filter(r => r.status !== 200 && !r.err);
  const errors = results.filter(r => r.err);
  const titleMismatch = results.filter(r => r.status === 200 && r.titleMatch === 'mismatch');

  console.log('=== Summary ===');
  console.log(`  HTTP 200: ${results.filter(r => r.status === 200).length}`);
  console.log(`  Not 200:  ${not200.length}`);
  console.log(`  Fetch error: ${errors.length}`);
  console.log(`  Title match (200): ${results.filter(r => r.status === 200 && r.titleMatch === 'match').length}`);
  console.log(`  Title mismatch:    ${titleMismatch.length}\n`);

  if (not200.length) {
    console.log('--- Not HTTP 200 (path may differ on live or page removed) ---');
    not200.forEach(r => {
      console.log(`  ${r.status}\t${r.rel}\n\t${r.liveUrl}`);
    });
    console.log('');
  }

  if (errors.length) {
    console.log('--- Fetch errors ---');
    errors.forEach(r => console.log(`  ${r.rel}: ${r.err}`));
    console.log('');
  }

  if (titleMismatch.length) {
    console.log('--- Title mismatch (local vs live) — review content parity ---');
    titleMismatch.forEach(r => {
      console.log(`  ${r.rel}`);
      console.log(`    live:   ${r.title}`);
      console.log(`    local:  ${r.localTitle}`);
    });
    console.log('');
  }

  const reportPath = path.join(ROOT, 'scripts', 'live-site-parity-report.txt');
  const lines = [
    `Generated: ${new Date().toISOString()}`,
    `Origin: ${LIVE_ORIGIN}`,
    `Total files: ${files.length}`,
    '',
    '=== Not HTTP 200 ===',
    ...not200.map(r => `${r.status}\t${r.rel}\t${r.liveUrl}`),
    '',
    '=== Title mismatch ===',
    ...titleMismatch.map(r => `${r.rel}\n  LIVE: ${r.title}\n  LOCAL: ${r.localTitle}`),
    ''
  ];
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');
  console.log(`Wrote ${reportPath}`);
}

function decodeBasicEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Straight apostrophe vs curly ’ — treat as equal for parity. */
function curlApostrophe(s) {
  return (s || '').replace(/\u2019/g, "'");
}

function titlesEqual(local, live) {
  if (normalizeTitle(local) === normalizeTitle(live)) return true;
  if (
    normalizeTitle(curlApostrophe(local)) === normalizeTitle(curlApostrophe(live))
  ) {
    return true;
  }
  return false;
}

function normalizeTitle(s) {
  return (s || '')
    .replace(/\s+/g, ' ')
    .replace(/»/g, '')
    .trim()
    .toLowerCase();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
