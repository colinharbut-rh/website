import { matchesCategory, normalizeCard, extractFromNextData, DEFAULT_BROWSER_UA } from './utils.js';

export const supermetricsConfig = {
  id: 'supermetrics',
  name: 'Supermetrics',
  base_url: 'https://supermetrics.com/template-gallery',

  category_urls: {
    'google-ads': 'https://supermetrics.com/template-gallery?connector=Google+Ads',
    'facebook-ads': 'https://supermetrics.com/template-gallery?connector=Facebook+Ads',
    'linkedin-ads': 'https://supermetrics.com/template-gallery?connector=LinkedIn+Ads',
    'instagram': 'https://supermetrics.com/template-gallery?connector=Instagram',
    'google-analytics': 'https://supermetrics.com/template-gallery?connector=Google+Analytics+4',
    'shopify': 'https://supermetrics.com/template-gallery?connector=Shopify',
    'tiktok': 'https://supermetrics.com/template-gallery?connector=TikTok+Ads',
    'hubspot': 'https://supermetrics.com/template-gallery?connector=HubSpot',
  },

  image_headers: {
    'Referer': 'https://supermetrics.com/',
    'User-Agent': DEFAULT_BROWSER_UA,
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  api_endpoint: 'https://supermetrics.com/api/template-gallery',
  api_category_param: 'connector',

  parseApiResponse(data, category) {
    const items = data?.templates || data?.items || data?.data || (Array.isArray(data) ? data : []);
    if (!Array.isArray(items)) return [];
    return items
      .filter(t => matchesCategory(t, category))
      .map(t => normalizeCard(t, 'https://supermetrics.com'))
      .filter(c => c.title && c.image_url);
  },

  parseNextData(nextData, category) {
    return extractFromNextData(nextData, category, 'https://supermetrics.com');
  },

  parseHtml: () => [],
};
