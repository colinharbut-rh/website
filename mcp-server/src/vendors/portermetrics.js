import { DEFAULT_BROWSER_UA } from './utils.js';

/**
 * Portermetrics vendor config.
 *
 * Portermetrics uses WordPress + Elementor. Each template is an <article>:
 *   <article class="elementor-post elementor-grid-item">
 *     <a class="elementor-post__thumbnail__link" href="https://portermetrics.com/en/templates/...">
 *       <div class="elementor-post__thumbnail">
 *         <img src="...">
 *       </div>
 *     </a>
 *     ... (title in a separate <a> tag further down the article)
 *   </article>
 *
 * If the scraper stops working, check https://portermetrics.com/en/templates/
 * and update the regex below.
 */

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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  api_endpoint: null,
  parseApiResponse: () => [],
  parseNextData: () => [],

  parseHtml(html) {
    const cards = [];
    // Match each <article class="elementor-post elementor-grid-item">...</article>
    const articlePattern = /<article[^>]*class="[^"]*elementor-post[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
    let match;
    while ((match = articlePattern.exec(html)) !== null) {
      const inner = match[1];

      // Link — first href pointing to a portermetrics template URL
      const linkMatch = inner.match(/href="(https:\/\/portermetrics\.com\/en\/templates\/[^"]+)"/);
      if (!linkMatch) continue;

      // Image — first <img> inside the article (the thumbnail)
      const imgMatch = inner.match(/<img[^>]+src="([^"]+)"/);
      if (!imgMatch) continue;

      // Title — the text inside <a href="...portermetrics.com/en/templates/...">Title</a>
      // (the title link, not the thumbnail link)
      const titleMatch = inner.match(
        /href="https:\/\/portermetrics\.com\/en\/templates\/[^"]*"[^>]*>\s*([^<\n]{3,}?)\s*<\/a>/g
      );
      let title = '';
      if (titleMatch) {
        for (const t of titleMatch) {
          const txt = t.replace(/<[^>]+>/g, '').trim();
          if (txt.length > 5) { title = txt; break; }
        }
      }
      if (!title) continue;

      cards.push({
        title,
        description: '',
        image_url: imgMatch[1],
        link: linkMatch[1],
        tags: [],
      });
    }
    return cards;
  },
};
