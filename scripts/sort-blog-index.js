/**
 * Reorder the main blog grid on blog.html by publish date (newest first).
 * Reads each post's hero date: <div class="text-color-gray">Month DD, YYYY</div>
 * after the author line in the blog hero section.
 *
 * Also refreshes every nav megamenu “Latest from our blog” block in assets/partials/nav.html
 * with the three newest posts (run `node build.js inject-nav` afterward).
 *
 * Usage: node scripts/sort-blog-index.js
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const BLOG_HTML = path.join(ROOT, 'blog.html');
const NAV_PARTIAL = path.join(ROOT, 'assets', 'partials', 'nav.html');

const START =
  '<div fs-list-load="pagination" fs-list-element="list" role="list" class="blog-list w-dyn-items">';
/** Closing of last card + pagination wrapper (whitespace may be \\n or \\r\\n). */
const END_RE = /<\/div><\/div>\s*<div role="navigation" aria-label="List" class="w-pagination-wrapper pagination">/;

const DATE_RE =
  /<div class="text-color-gray">((?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4})<\/div>/;

function postDate(slug) {
  const fp = path.join(ROOT, 'blog', slug);
  if (!fs.existsSync(fp)) return 0;
  const html = fs.readFileSync(fp, 'utf8');
  const m = html.match(DATE_RE);
  if (!m) return 0;
  const t = new Date(m[1]).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function slugFromItem($, el) {
  const href = $(el).find('a.blog-img-link').attr('href') || $(el).find('a.blog-link').first().attr('href') || '';
  const m = href.match(/blog\/([^"?]+\.html)/);
  return m ? m[1] : '';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Pull title, image, link from a sorted blog grid card (same markup as blog.html). */
function extractCardMeta($, el) {
  const $el = $(el);
  const hrefRaw = ($el.find('a.blog-img-link').attr('href') || '').trim();
  const img =
    ($el.find('img.blog-bannar-image').attr('src') ||
      $el.find('a.blog-img-link img').first().attr('src') ||
      '').trim();
  let title = $el.find('.text-size-large.text-color-white').first().text().trim();
  if (!title) title = $el.find('.text-size-large').first().text().trim();
  return { hrefRaw, img, title };
}

function megamenuItemsHtml(items) {
  return items
    .map(({ hrefRaw, img, title }) => {
      const href =
        hrefRaw.indexOf('blog/') === 0 ? `{{PREFIX}}${hrefRaw}` : `{{PREFIX}}${hrefRaw.replace(/^\//, '')}`;
      return `<div role="listitem" class="w-dyn-item">
                              <a href="${href}" class="uui-navbar01_blog-item w-inline-block">
                                <div class="uui-navbar01_blog-image-wrapper"><img src="${img}" loading="eager" alt="" class="uui-navbar01_blog-image"></div>
                                <div class="uui-navbar01_large-item-content">
                                  <div class="uui-navbar01_item-heading">${escapeHtml(title)}</div>
                                  <div class="uui-navbar01_item-button-wrapper">
                                    <div class="uui-button-row">
                                      <div class="uui-button-link is-button-xsmall">
                                        <div class="color_primary">Learn More ➝</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </a>
                            </div>`;
    })
    .join('');
}

/** Keep Platform megamenu “Latest from our blog” in sync with the three newest posts. */
function syncNavMegamenu($, topThreeEls) {
  if (!fs.existsSync(NAV_PARTIAL)) return;
  const items = topThreeEls.map((el) => extractCardMeta($, el));
  if (items.some((i) => !i.hrefRaw || !i.title)) return;

  const navHtml = fs.readFileSync(NAV_PARTIAL, 'utf8');
  /** Wrap so cheerio preserves HTML5 void tags (xmlMode breaks <img>). */
  const $nav = cheerio.load(`<body>${navHtml}</body>`, { decodeEntities: false });
  const inner = megamenuItemsHtml(items);
  const $lists = $nav('.uui-navbar01_dropdown-blog-list.w-dyn-items');
  if (!$lists.length) return;

  $lists.each((_, el) => {
    $nav(el).html(inner);
  });
  const out = $nav('body').html();
  if (out) fs.writeFileSync(NAV_PARTIAL, out, 'utf8');
  console.log('Synced nav megamenu (assets/partials/nav.html) with top 3 posts by date.');
}

function main() {
  const html = fs.readFileSync(BLOG_HTML, 'utf8');
  const startIdx = html.indexOf(START);
  if (startIdx === -1) {
    console.error('Could not find main blog list start marker');
    process.exit(1);
  }
  const innerStart = startIdx + START.length;
  const rest = html.slice(innerStart);
  const endMatch = rest.match(END_RE);
  if (!endMatch || endMatch.index === undefined) {
    console.error('Could not find main blog list end marker');
    process.exit(1);
  }
  const endIdx = innerStart + endMatch.index;
  const inner = html.slice(innerStart, endIdx);
  const $ = cheerio.load(`<div id="__blog_sort_root__">${inner}</div>`, { decodeEntities: false });
  const $root = $('#__blog_sort_root__');
  const children = $root.children('.blog-item.w-dyn-item').toArray();
  if (children.length === 0) {
    console.error('No blog items found');
    process.exit(1);
  }

  const scored = children.map((el) => {
    const slug = slugFromItem($, el);
    const t = postDate(slug);
    return { el, t, slug };
  });

  scored.sort((a, b) => b.t - a.t);

  syncNavMegamenu($, scored.slice(0, 3).map(({ el }) => el));

  const newInner = scored.map(({ el }) => $.html(el)).join('');
  const out = html.slice(0, innerStart) + newInner + html.slice(endIdx);
  fs.writeFileSync(BLOG_HTML, out, 'utf8');
  console.log(`Sorted ${scored.length} blog cards by publish date (newest first).`);
}

main();
