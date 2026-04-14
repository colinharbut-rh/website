import { matchesCategory, normalizeCard, extractFromNextData, DEFAULT_BROWSER_UA } from './utils.js';

/**
 * bymarketers.co — templates appear to be on the homepage or a subpage.
 * Update base_url and category_urls if they add a dedicated template gallery page.
 */
export const bymarketersConfig = {
  id: 'bymarketers',
  name: 'bymarketers',
  base_url: 'https://bymarketers.co',

  category_urls: {
    'google-ads': 'https://bymarketers.co?category=google-ads',
    'facebook-ads': 'https://bymarketers.co?category=facebook-ads',
    'linkedin-ads': 'https://bymarketers.co?category=linkedin-ads',
    'google-analytics': 'https://bymarketers.co?category=google-analytics',
    'instagram': 'https://bymarketers.co?category=instagram',
  },

  image_headers: {
    'Referer': 'https://bymarketers.co/',
    'User-Agent': DEFAULT_BROWSER_UA,
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  api_endpoint: null,

  parseApiResponse: () => [],

  parseNextData(nextData, category) {
    return extractFromNextData(nextData, category, 'https://bymarketers.co');
  },

  parseHtml: () => [],
};
