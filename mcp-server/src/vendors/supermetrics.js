import { DEFAULT_BROWSER_UA } from './utils.js';

/**
 * Supermetrics vendor config.
 *
 * Supermetrics uses Astro (v5) — no __NEXT_DATA__, no public JSON API.
 * Cards are rendered as static HTML:
 *   <a href="https://supermetrics.com/template-gallery/[slug]"
 *      data-title="Title" ...>
 *     <img src="https://supermetrics.com/cdn-cgi/image/.../https://cdn.sanity.io/...">
 *   </a>
 *
 * The title comes from data-title (reliable), image from the CDN-wrapped img src.
 * We extract the inner Sanity CDN URL to get a clean image URL.
 *
 * If the scraper stops working, check https://supermetrics.com/template-gallery
 * for changed card structure and update the regex below.
 */

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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  api_endpoint: null,
  parseApiResponse: () => [],
  parseNextData: () => [],

  parseHtml(html) {
    const cards = [];
    // Supermetrics (Astro): cards are <a> tags where href and data-title are both attributes.
    // Attribute order varies — match the full opening tag + inner content separately.
    const aTagPattern = /<a\s+([^>]+?)>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = aTagPattern.exec(html)) !== null) {
      const [, attrs, inner] = match;
      const hrefM = attrs.match(/href="(\/template-gallery\/[^"]+)"/);
      const titleM = attrs.match(/data-title="([^"]+)"/);
      if (!hrefM || !titleM) continue;

      const imgMatch = inner.match(/src="([^"]*cdn\.sanity\.io[^"]+)"/);
      if (!imgMatch) continue;

      const image_url = imgMatch[1].split('?')[0]; // strip query params
      const title = titleM[1]
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");

      cards.push({
        title: title.trim(),
        description: '',
        image_url,
        link: 'https://supermetrics.com' + hrefM[1],
        tags: [],
      });
    }
    return cards;
  },
};
