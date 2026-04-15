import { vendors } from '../vendors/index.js';

// Allowed hostnames for the optional URL override — prevents SSRF attacks
function isSafeUrl(urlString) {
  try {
    const { protocol, hostname } = new URL(urlString);
    if (protocol !== 'https:') return false;
    const allowed = Object.values(vendors).flatMap(v => {
      try { return [new URL(v.base_url).hostname]; } catch { return []; }
    });
    return allowed.some(h => hostname === h || hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

/**
 * scrape_gallery — fetch a vendor template gallery and return card data.
 *
 * Tries three methods in order:
 *   1. Vendor JSON API endpoint (fastest, most reliable)
 *   2. __NEXT_DATA__ extraction from SSR HTML
 *   3. HTML regex fallback
 *
 * Returns card data + the curl headers needed to download images locally.
 */
export async function scrapeGallery({ vendor: vendorId, category, url: overrideUrl }) {
  const config = vendors[vendorId];
  if (!config) {
    const available = Object.keys(vendors).join(', ');
    throw new Error(`Unknown vendor: "${vendorId}". Available vendors: ${available}`);
  }

  // Resolve target URL — validate override against known vendor hostnames
  if (overrideUrl && !isSafeUrl(overrideUrl)) {
    throw new Error(`URL override not allowed: must be an https URL on a supported vendor domain.`);
  }
  const targetUrl =
    overrideUrl ||
    (category && config.category_urls?.[category]) ||
    config.base_url;

  let cards = [];
  let scrapeMethod = null;
  let warning = null;

  // ─── Method 1: JSON API ───────────────────────────────────────────────────
  if (config.api_endpoint) {
    try {
      let apiUrl = config.api_endpoint;
      if (category && config.api_category_param) {
        apiUrl += `?${config.api_category_param}=${encodeURIComponent(category)}`;
      }

      const res = await fetch(apiUrl, {
        headers: { ...BROWSER_HEADERS, Accept: 'application/json' },
        cf: { cacheTtl: 300 }, // cache for 5 min in Cloudflare
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = config.parseApiResponse(data, category);
        if (parsed.length > 0) {
          cards = parsed;
          scrapeMethod = 'api';
        }
      }
    } catch {
      // fall through
    }
  }

  // ─── Method 2: SSR HTML (__NEXT_DATA__ + HTML regex) ─────────────────────
  if (cards.length === 0) {
    try {
      const res = await fetch(targetUrl, {
        headers: BROWSER_HEADERS,
        cf: { cacheTtl: 300 },
      });

      if (!res.ok) {
        warning = `Vendor page returned HTTP ${res.status} for ${targetUrl}`;
      } else {
        const html = await res.text();
        const htmlSnippet = html.slice(0, 500).replace(/\s+/g, ' ');

        // Try __NEXT_DATA__ (Next.js SSR)
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
        if (nextDataMatch && config.parseNextData) {
          try {
            const nextData = JSON.parse(nextDataMatch[1]);
            const parsed = config.parseNextData(nextData, category);
            if (parsed.length > 0) {
              cards = parsed;
              scrapeMethod = 'next_data';
            }
          } catch {
            // JSON parse failed — fall through
          }
        }

        // HTML regex fallback
        if (cards.length === 0 && config.parseHtml) {
          const parsed = config.parseHtml(html, category);
          if (parsed.length > 0) {
            cards = parsed;
            scrapeMethod = 'html_regex';
          }
        }

        // Store debug snippet around the first vendor-specific pattern
        if (cards.length === 0) {
          const anchors = ['dashboardsnapshots.s3', 'data-title=', '61f0f48a97255128fb175a87', 'ctfassets.net', '/template-gallery/', '/templates/dashboards/'];
          let debugSnippet = '';
          for (const anchor of anchors) {
            const idx = html.indexOf(anchor);
            if (idx >= 0) {
              debugSnippet = html.slice(Math.max(0, idx - 50), idx + 600).replace(/\s+/g, ' ');
              break;
            }
          }
          warning = `No cards parsed from ${targetUrl} (HTTP ${res.status}). Context: "${debugSnippet.slice(0, 600)}"`;
        }
      }
    } catch (err) {
      warning = `Failed to fetch ${targetUrl}: ${err.message}`;
    }
  }

  // ─── No results ───────────────────────────────────────────────────────────
  if (cards.length === 0) {
    warning =
      warning ||
      `No cards found for ${vendorId}${category ? ` / ${category}` : ''}. ` +
        `The vendor's page structure may have changed. ` +
        `Try providing a direct URL with the 'url' parameter, or check ` +
        `${config.base_url} and update the vendor config in mcp-server/src/vendors/${vendorId}.js`;
  }

  // Cap results and strip empty cards
  cards = cards
    .filter(c => c.title && c.image_url)
    .slice(0, 30);

  return {
    vendor: vendorId,
    vendor_name: config.name,
    category: category || null,
    source_url: targetUrl,
    scrape_method: scrapeMethod,
    total: cards.length,
    cards,
    // Pass these headers to curl when downloading images
    image_headers: config.image_headers,
    warning: cards.length === 0 ? (warning || 'No cards found') : null,
  };
}
