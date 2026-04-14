import { matchesCategory, normalizeCard, extractFromNextData, ensureAbsoluteUrl, DEFAULT_BROWSER_UA } from './utils.js';

/**
 * Whatagraph vendor config.
 *
 * Whatagraph is a Next.js app — their template gallery embeds card data in
 * __NEXT_DATA__ or returns it from a JSON API. We try the API first (fastest),
 * then __NEXT_DATA__, then HTML regex as a last resort.
 *
 * If the scraper starts returning 0 cards, check:
 *   1. https://whatagraph.com/templates — has the URL changed?
 *   2. Open DevTools → Network → XHR/Fetch — find the templates API call
 *   3. Update api_endpoint and parseApiResponse below
 */

export const whatagraphConfig = {
  id: 'whatagraph',
  name: 'Whatagraph',
  base_url: 'https://whatagraph.com/templates',

  // Category filter URLs — add more as needed
  category_urls: {
    'google-ads': 'https://whatagraph.com/templates?integration=Google+Ads',
    'facebook-ads': 'https://whatagraph.com/templates?integration=Facebook+Ads',
    'linkedin-ads': 'https://whatagraph.com/templates?integration=LinkedIn+Ads',
    'instagram': 'https://whatagraph.com/templates?integration=Instagram',
    'google-analytics': 'https://whatagraph.com/templates?integration=Google+Analytics+4',
    'shopify': 'https://whatagraph.com/templates?integration=Shopify',
    'tiktok': 'https://whatagraph.com/templates?integration=TikTok+Ads',
  },

  // Headers to use when downloading images (bypasses hotlink protection)
  image_headers: {
    'Referer': 'https://whatagraph.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  // Method 1: JSON API endpoint (update if Whatagraph changes their API)
  // Find by: DevTools → Network tab → filter XHR → look for /api/templates or similar
  api_endpoint: 'https://whatagraph.com/api/public/templates',
  api_category_param: 'integration',

  parseApiResponse(data, category) {
    // Try common response shapes
    const items =
      data?.data ||
      data?.templates ||
      data?.items ||
      data?.results ||
      (Array.isArray(data) ? data : []);

    if (!Array.isArray(items)) return [];

    return items
      .filter(t => !category || matchesCategory(t, category))
      .map(t => normalizeCard(t, 'https://whatagraph.com'))
      .filter(c => c.title && c.image_url);
  },

  // Method 2: Parse Next.js __NEXT_DATA__ embedded in HTML
  parseNextData(nextData, category) {
    const props = nextData?.props?.pageProps;
    if (!props) return [];

    // Try common locations for template arrays in Next.js pageProps
    const candidates = [
      props.templates,
      props.data?.templates,
      props.items,
      props.data?.items,
      props.templateList,
      props.initialData?.templates,
    ];

    for (const list of candidates) {
      if (Array.isArray(list) && list.length > 0) {
        const cards = list
          .filter(t => !category || matchesCategory(t, category))
          .map(t => normalizeCard(t, 'https://whatagraph.com'))
          .filter(c => c.title && c.image_url);
        if (cards.length > 0) return cards;
      }
    }

    return [];
  },

  // Method 3: HTML regex fallback (best-effort)
  parseHtml(html, category) {
    const cards = [];

    // Try to extract JSON blobs that look like template arrays
    // Pattern: find arrays of objects with "title" and image-like fields
    const jsonPattern = /\[(\{[^[\]]*?"title"[^[\]]*?"(?:previewImage|thumbnail|image)"[^[\]]*?\}(?:,\{[^[\]]*?\})*)\]/g;
    let match;

    while ((match = jsonPattern.exec(html)) !== null) {
      try {
        const arr = JSON.parse(`[${match[1]}]`);
        if (arr.length > 0) {
          const parsed = arr
            .filter(t => !category || matchesCategory(t, category))
            .map(t => normalizeCard(t, 'https://whatagraph.com'))
            .filter(c => c.title && c.image_url);
          if (parsed.length > 0) {
            cards.push(...parsed);
            break;
          }
        }
      } catch {
        // continue scanning
      }
    }

    return cards;
  },
};
