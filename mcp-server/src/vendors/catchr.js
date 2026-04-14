import { matchesCategory, normalizeCard, extractFromNextData, DEFAULT_BROWSER_UA } from './utils.js';

export const catchrConfig = {
  id: 'catchr',
  name: 'Catchr',
  base_url: 'https://www.catchr.io/template',

  category_urls: {
    'google-ads': 'https://www.catchr.io/template?source=google-ads',
    'facebook-ads': 'https://www.catchr.io/template?source=facebook-ads',
    'linkedin-ads': 'https://www.catchr.io/template?source=linkedin-ads',
    'google-analytics': 'https://www.catchr.io/template?source=google-analytics',
    'instagram': 'https://www.catchr.io/template?source=instagram',
    'tiktok': 'https://www.catchr.io/template?source=tiktok',
  },

  image_headers: {
    'Referer': 'https://www.catchr.io/',
    'User-Agent': DEFAULT_BROWSER_UA,
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  api_endpoint: null,

  parseApiResponse: () => [],

  parseNextData(nextData, category) {
    return extractFromNextData(nextData, category, 'https://www.catchr.io');
  },

  parseHtml: () => [],
};
