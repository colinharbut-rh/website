import { DEFAULT_BROWSER_UA } from './utils.js';

/**
 * Catchr vendor config.
 *
 * Catchr uses Webflow — static HTML with cards structured as:
 *   <div class="template-card">
 *     <img src="https://cdn.prod.website-files.com/61f0f48a97255128fb175a87/[id]...">
 *     <div class="template-info"><img src="...icon.svg"></div>
 *     <p class="template-category">Category</p>
 *     <h3>Title</h3>
 *     <a href="/template/[slug]">Use template</a>
 *   </div>
 *
 * Template preview images come from the content folder (site ID 61f0f48a97255128fb175a87).
 * Platform icons come from a different folder — we skip those.
 *
 * If the scraper stops working, check https://www.catchr.io/template
 * and update the regex below.
 */

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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  api_endpoint: null,
  api_category_param: null,
  parseApiResponse: () => [],

  parseHtml(html) {
    const cards = [];
    // Anchor on /template/ links, then search backwards for the preview image and title.
    // Catchr card structure (Webflow CMS):
    //   <img src="cdn.prod.website-files.com/61f0f48a97255128fb175a87/[id].png">
    //   ... (icon imgs, category span) ...
    //   <h3>Title</h3>
    //   <a href="/template/[slug]">Use template</a>
    const linkPattern = /href="(\/template\/[^"]+)"/g;
    const seen = new Set();
    let linkMatch;
    while ((linkMatch = linkPattern.exec(html)) !== null) {
      const href = linkMatch[1];
      if (seen.has(href)) continue;
      seen.add(href);
      const pos = linkMatch.index;
      const before = html.slice(Math.max(0, pos - 1200), pos);
      // Get LAST content-folder PNG image before the link
      const imgMatches = [...before.matchAll(/src="(https:\/\/cdn\.prod\.website-files\.com\/61f0f48a97255128fb175a87\/[^"]+\.png[^"]*)"/g)];
      if (!imgMatches.length) continue;
      const image_url = imgMatches[imgMatches.length - 1][1];
      // Get LAST h3 before the link
      const h3Matches = [...before.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)];
      if (!h3Matches.length) continue;
      const title = h3Matches[h3Matches.length - 1][1].replace(/<[^>]+>/g, '').trim();
      if (title && image_url) {
        cards.push({ title, description: '', image_url, link: 'https://www.catchr.io' + href, tags: [] });
      }
    }
    return cards;
  },
};
