import { matchesCategory, normalizeCard, extractFromNextData, DEFAULT_BROWSER_UA } from './utils.js';

/**
 * Databox vendor config.
 *
 * Databox hosts their template gallery at databox.com/templates.
 * It's a React app — check __NEXT_DATA__ or their public API.
 *
 * If the scraper stops working, open DevTools → Network → XHR on their
 * templates page and find the API call, then update api_endpoint below.
 */

export const databoxConfig = {
  id: 'databox',
  name: 'Databox',
  base_url: 'https://databox.com/dashboard-examples',

  category_urls: {
    'google-ads': 'https://databox.com/templates?category=Google+Ads',
    'facebook-ads': 'https://databox.com/templates?category=Facebook+Ads',
    'linkedin-ads': 'https://databox.com/templates?category=LinkedIn+Ads',
    'google-analytics': 'https://databox.com/templates?category=Google+Analytics',
    'shopify': 'https://databox.com/templates?category=Shopify',
    'instagram': 'https://databox.com/templates?category=Instagram',
    'hubspot': 'https://databox.com/templates?category=HubSpot',
  },

  image_headers: {
    'Referer': 'https://databox.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  api_endpoint: 'https://databox.com/wp-json/wp/v2/datatemplates',
  api_category_param: 'search',

  parseApiResponse(data, category) {
    const items = Array.isArray(data) ? data : (data?.items || data?.data || []);
    if (!Array.isArray(items)) return [];

    return items
      .filter(t => !category || matchesCategory(t, category))
      .map(t => normalizeCard(t, 'https://databox.com'))
      .filter(c => c.title && c.image_url);
  },

  parseNextData(nextData, category) {
    return extractFromNextData(nextData, category, 'https://databox.com');
  },

  parseHtml: () => [],
};
