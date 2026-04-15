import { DEFAULT_BROWSER_UA } from './utils.js';

/**
 * AgencyAnalytics vendor config.
 *
 * AgencyAnalytics (Next.js) renders template cards as static HTML:
 *   <a href="/templates/[type]/[slug]">
 *     <img src="https://images.ctfassets.net/..." loading="lazy">
 *     <h3>Title</h3>
 *   </a>
 *
 * Images are served from Contentful CDN in AVIF format.
 *
 * If the scraper stops working, check https://agencyanalytics.com/templates
 * and update the regex below.
 */

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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
  },

  api_endpoint: null,
  parseApiResponse: () => [],
  parseNextData: () => [],

  parseHtml(html) {
    const cards = [];

    // AgencyAnalytics uses Next.js RSC streaming which encodes < as \u003c and > as \u003e.
    // Decode those before applying HTML regex.
    const decoded = html
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\u0022/g, '"');

    // Cards: <a href="/templates/[type]/[slug]">
    //          <img src="https://images.ctfassets.net/...">
    //          <h3>Title</h3>
    //        </a>
    const cardPattern = /<a\s[^>]*href="(\/templates\/[^"]+)"[^>]*>([\s\S]{0,600}?)<\/a>/g;
    let match;
    const seen = new Set();
    while ((match = cardPattern.exec(decoded)) !== null) {
      const [, href, inner] = match;
      if (seen.has(href)) continue;
      const imgMatch = inner.match(/src="(https:\/\/images\.ctfassets\.net\/[^"]+)"/);
      const titleMatch = inner.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/);
      if (!imgMatch) continue;
      const title = titleMatch
        ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
        : href.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (title) {
        seen.add(href);
        cards.push({
          title,
          description: '',
          image_url: imgMatch[1],
          link: 'https://agencyanalytics.com' + href,
          tags: [],
        });
      }
    }
    return cards;
  },
};
