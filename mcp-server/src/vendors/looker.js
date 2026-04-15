import { matchesCategory, normalizeCard, DEFAULT_BROWSER_UA } from './utils.js';

/**
 * Looker Studio (Google) template gallery.
 * Uses a public search/browse API that returns JSON.
 * Gallery: https://lookerstudio.google.com/gallery
 *
 * Note: Looker Studio is a Google product with a public gallery API.
 * If this stops working, inspect XHR calls on the gallery page.
 */
export const lookerConfig = {
  id: 'looker',
  name: 'Looker Studio',
  base_url: 'https://lookerstudio.google.com/gallery',

  category_urls: {
    'google-ads': 'https://lookerstudio.google.com/gallery#search=google+ads',
    'facebook-ads': 'https://lookerstudio.google.com/gallery#search=facebook+ads',
    'linkedin-ads': 'https://lookerstudio.google.com/gallery#search=linkedin',
    'google-analytics': 'https://lookerstudio.google.com/gallery#search=google+analytics',
    'shopify': 'https://lookerstudio.google.com/gallery#search=shopify',
    'instagram': 'https://lookerstudio.google.com/gallery#search=instagram',
  },

  image_headers: {
    'Referer': 'https://lookerstudio.google.com/',
    'User-Agent': DEFAULT_BROWSER_UA,
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  // Looker Studio has a public template search API
  api_endpoint: 'https://lookerstudio.google.com/s/u/0/reporting/searchTemplates',
  api_category_param: 'query',

  parseApiResponse(data, category) {
    // Looker returns a list of template objects under various shapes
    const items =
      data?.templates || data?.items || data?.results ||
      data?.reports || (Array.isArray(data) ? data : []);
    if (!Array.isArray(items)) return [];

    return items
      .filter(t => matchesCategory(t, category))
      .map(t => {
        const base = 'https://lookerstudio.google.com';
        return {
          title: t.name || t.title || t.displayName || '',
          description: t.description || t.subtitle || '',
          image_url: t.thumbnailUrl || t.previewUrl || t.imageUrl || t.screenshot || '',
          link: t.url || (t.reportId ? `${base}/reporting/${t.reportId}/view` : '') || t.link || '',
          tags: [...(t.tags || []), ...(t.categories || [])].filter(Boolean),
        };
      })
      .filter(c => c.title && c.image_url);
  },

  parseNextData: () => [],

  parseHtml: () => [],
};
