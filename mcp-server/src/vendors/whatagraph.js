import { DEFAULT_BROWSER_UA } from './utils.js';

/**
 * Whatagraph vendor config.
 *
 * Whatagraph's template gallery is a static HTML page — no API, no __NEXT_DATA__.
 * Cards are plain <a href="/templates/..."> elements containing an img + h3 + p.
 * The URL's ?integration= param filters the page server-side, so all returned
 * cards are already for the requested category.
 *
 * If the scraper stops working, fetch https://whatagraph.com/templates in a
 * browser, inspect a card element, and update the regex patterns below.
 */

export const whatagraphConfig = {
  id: 'whatagraph',
  name: 'Whatagraph',
  base_url: 'https://whatagraph.com/templates',

  category_urls: {
    'google-ads': 'https://whatagraph.com/templates?integration=Google+Ads',
    'facebook-ads': 'https://whatagraph.com/templates?integration=Facebook+Ads',
    'linkedin-ads': 'https://whatagraph.com/templates?integration=LinkedIn+Ads',
    'instagram': 'https://whatagraph.com/templates?integration=Instagram',
    'google-analytics': 'https://whatagraph.com/templates?integration=Google+Analytics+4',
    'shopify': 'https://whatagraph.com/templates?integration=Shopify',
    'tiktok': 'https://whatagraph.com/templates?integration=TikTok+Ads',
  },

  image_headers: {
    'Referer': 'https://whatagraph.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  // No JSON API — page is static HTML
  api_endpoint: null,
  parseApiResponse: () => [],

  // No Next.js SSR
  parseNextData: () => [],

  // Parse static HTML: <a href="/templates/..."><img src="..."><h3>...</h3><p>...</p></a>
  parseHtml(html) {
    const cards = [];

    // Match each template card anchor
    const cardPattern = /<a\s+href="(\/templates\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let match;

    while ((match = cardPattern.exec(html)) !== null) {
      const [, href, inner] = match;

      const imgMatch = inner.match(/<img\s+src="([^"]+)"[^>]*>/);
      if (!imgMatch) continue;

      const titleMatch = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
      if (!titleMatch) continue;

      const descMatch = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/);

      const title = titleMatch[1].trim().replace(/<[^>]+>/g, '');
      const description = descMatch
        ? descMatch[1].trim().replace(/<[^>]+>/g, '')
        : '';
      const image_url = imgMatch[1];
      const link = 'https://whatagraph.com' + href;

      if (title && image_url) {
        cards.push({ title, description, image_url, link, tags: [] });
      }
    }

    return cards;
  },
};
