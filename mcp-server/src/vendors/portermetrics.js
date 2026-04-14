import { matchesCategory, normalizeCard, extractFromNextData, DEFAULT_BROWSER_UA } from './utils.js';

export const portermetricsConfig = {
  id: 'portermetrics',
  name: 'Portermetrics',
  base_url: 'https://portermetrics.com/en/templates/',

  category_urls: {
    'google-ads': 'https://portermetrics.com/en/templates/google-ads/',
    'facebook-ads': 'https://portermetrics.com/en/templates/facebook-ads/',
    'linkedin-ads': 'https://portermetrics.com/en/templates/linkedin-ads/',
    'google-analytics': 'https://portermetrics.com/en/templates/google-analytics/',
    'instagram': 'https://portermetrics.com/en/templates/instagram/',
    'tiktok': 'https://portermetrics.com/en/templates/tiktok-ads/',
    'shopify': 'https://portermetrics.com/en/templates/shopify/',
    'hubspot': 'https://portermetrics.com/en/templates/hubspot/',
  },

  image_headers: {
    'Referer': 'https://portermetrics.com/',
    'User-Agent': DEFAULT_BROWSER_UA,
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  api_endpoint: null,

  parseApiResponse: () => [],

  parseNextData(nextData, category) {
    return extractFromNextData(nextData, category, 'https://portermetrics.com');
  },

  parseHtml: () => [],
};
