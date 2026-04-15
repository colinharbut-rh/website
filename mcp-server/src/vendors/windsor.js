import { matchesCategory, normalizeCard, extractFromNextData, DEFAULT_BROWSER_UA } from './utils.js';

export const windsorConfig = {
  id: 'windsor',
  name: 'Windsor.ai',
  base_url: 'https://windsor.ai/template-gallery/',

  category_urls: {
    'google-ads': 'https://windsor.ai/template-gallery/?platform=google-ads',
    'facebook-ads': 'https://windsor.ai/template-gallery/?platform=facebook-ads',
    'linkedin-ads': 'https://windsor.ai/template-gallery/?platform=linkedin-ads',
    'google-analytics': 'https://windsor.ai/template-gallery/?platform=google-analytics',
    'instagram': 'https://windsor.ai/template-gallery/?platform=instagram',
    'tiktok': 'https://windsor.ai/template-gallery/?platform=tiktok',
    'shopify': 'https://windsor.ai/template-gallery/?platform=shopify',
  },

  image_headers: {
    'Referer': 'https://windsor.ai/',
    'User-Agent': DEFAULT_BROWSER_UA,
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  api_endpoint: null,

  parseApiResponse: () => [],

  parseNextData(nextData, category) {
    return extractFromNextData(nextData, category, 'https://windsor.ai');
  },

  parseHtml: () => [],
};
