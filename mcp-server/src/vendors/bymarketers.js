import { DEFAULT_BROWSER_UA } from './utils.js';

/**
 * bymarketers.co vendor config.
 *
 * ByMarketers is a WooCommerce shop. Template cards are product cards:
 *   <div class="product-card">
 *     <img src="https://bymarketers.co/wp-content/uploads/...jpg">
 *     <h3><a href="https://bymarketers.co/product/[slug]/">Title</a></h3>
 *   </div>
 *
 * If the scraper stops working, check https://bymarketers.co
 * and update the regex below.
 */

export const bymarketersConfig = {
  id: 'bymarketers',
  name: 'ByMarketers',
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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  // WooCommerce WP REST API — public product CPT with embedded featured media
  api_endpoint: 'https://bymarketers.co/wp-json/wp/v2/product?_embed=true&per_page=100',
  api_category_param: null,

  parseApiResponse(data) {
    if (!Array.isArray(data)) return [];
    return data
      .map(p => ({
        title: (p.title?.rendered || '').replace(/<[^>]+>/g, '').trim(),
        description: (p.excerpt?.rendered || '').replace(/<[^>]+>/g, '').trim(),
        image_url: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || '',
        link: p.link || '',
        tags: [],
      }))
      .filter(c => c.title && c.image_url);
  },

  parseNextData: () => [],
  parseHtml: () => [],
};
