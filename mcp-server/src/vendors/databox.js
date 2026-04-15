import { DEFAULT_BROWSER_UA } from './utils.js';

/**
 * Databox vendor config.
 *
 * Databox renders dashboard example cards as static HTML:
 *   <a href="https://databox.com/dashboard-examples/[slug]">
 *     <img class="dashboard-thumbnail" src="https://dashboardsnapshots.s3...jpg">
 *     <h4>Title</h4>
 *   </a>
 *
 * If the scraper stops working, inspect a card on https://databox.com/dashboard-examples
 * and update the regex patterns below.
 */

export const databoxConfig = {
  id: 'databox',
  name: 'Databox',
  base_url: 'https://databox.com/dashboard-examples',

  category_urls: {
    'google-ads': 'https://databox.com/dashboard-examples?category=Google+Ads',
    'facebook-ads': 'https://databox.com/dashboard-examples?category=Facebook+Ads',
    'linkedin-ads': 'https://databox.com/dashboard-examples?category=LinkedIn+Ads',
    'google-analytics': 'https://databox.com/dashboard-examples?category=Google+Analytics',
    'shopify': 'https://databox.com/dashboard-examples?category=Shopify',
    'instagram': 'https://databox.com/dashboard-examples?category=Instagram',
    'hubspot': 'https://databox.com/dashboard-examples?category=HubSpot',
  },

  image_headers: {
    'Referer': 'https://databox.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  // Databox uses WordPress — try custom post type 'dashboard-example' via WP REST API
  api_endpoint: 'https://databox.com/wp-json/wp/v2/dashboard-example?_embed=true&per_page=100',
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

  // HTML fallback: Databox card structure —
  //   <img class="dbx-template-card__img" src="https://dashboardsnapshots.s3...">
  //   <h4 class="dbx-template-card__title">Title</h4>
  //   <a class="dbx-container-anchor" href="https://databox.com/dashboard-examples/slug"></a>
  // The <a> is an EMPTY overlay link; img and h4 are SIBLINGS, not children of the <a>.
  // Anchor on the empty <a>, search backwards for the img and h4.
  parseHtml(html) {
    const cards = [];
    const linkPattern = /href="(https:\/\/databox\.com\/dashboard-examples\/[^"]+)"[^>]*><\/a>/g;
    let match;
    while ((match = linkPattern.exec(html)) !== null) {
      const link = match[1];
      const pos = match.index;
      const before = html.slice(Math.max(0, pos - 1500), pos);
      const imgMatch = before.match(/.*src="(https:\/\/dashboardsnapshots\.s3[^"]+)"/s);
      const titleMatch = before.match(/.*<h4[^>]*>([\s\S]*?)<\/h4>/s);
      if (!imgMatch || !titleMatch) continue;
      const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      if (title && imgMatch[1]) {
        cards.push({ title, description: '', image_url: imgMatch[1], link, tags: [] });
      }
    }
    return cards;
  },
};
