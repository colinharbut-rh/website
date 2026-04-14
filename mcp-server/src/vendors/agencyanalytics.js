import { matchesCategory, normalizeCard, extractFromNextData, DEFAULT_BROWSER_UA } from './utils.js';

export const agencyanalyticsConfig = {
  id: 'agencyanalytics',
  name: 'AgencyAnalytics',
  base_url: 'https://agencyanalytics.com/templates',

  category_urls: {
    'google-ads': 'https://agencyanalytics.com/templates?category=Google+Ads',
    'facebook-ads': 'https://agencyanalytics.com/templates?category=Facebook+Ads',
    'linkedin-ads': 'https://agencyanalytics.com/templates?category=LinkedIn+Ads',
    'google-analytics': 'https://agencyanalytics.com/templates?category=Google+Analytics',
    'instagram': 'https://agencyanalytics.com/templates?category=Instagram',
    'tiktok': 'https://agencyanalytics.com/templates?category=TikTok',
    'shopify': 'https://agencyanalytics.com/templates?category=Shopify',
    'seo': 'https://agencyanalytics.com/templates?category=SEO',
  },

  image_headers: {
    'Referer': 'https://agencyanalytics.com/',
    'User-Agent': DEFAULT_BROWSER_UA,
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  api_endpoint: 'https://agencyanalytics.com/api/templates',
  api_category_param: 'category',

  parseApiResponse(data, category) {
    const items = data?.templates || data?.data || data?.items || (Array.isArray(data) ? data : []);
    if (!Array.isArray(items)) return [];
    return items
      .filter(t => matchesCategory(t, category))
      .map(t => normalizeCard(t, 'https://agencyanalytics.com'))
      .filter(c => c.title && c.image_url);
  },

  parseNextData(nextData, category) {
    return extractFromNextData(nextData, category, 'https://agencyanalytics.com');
  },

  parseHtml: () => [],
};
