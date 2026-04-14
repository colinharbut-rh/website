/**
 * Shared utilities for vendor scraping configs.
 */

export function ensureAbsoluteUrl(url, base) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${base}${url}`;
  return url;
}

export function matchesCategory(template, category) {
  if (!category) return true;
  const needle = category.toLowerCase().replace(/-/g, ' ');
  const haystack = [
    template.name,
    template.title,
    template.heading,
    template.description,
    template.subtitle,
    ...(template.tags || []),
    ...(template.integrations || []),
    ...(template.categories || []),
    ...(template.channels || []),
    ...(template.connectors || []),
    ...(template.platforms || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

/**
 * Map the many possible field names vendors use to our standard card shape.
 * Pass `base` (e.g. "https://whatagraph.com") to resolve relative URLs.
 */
export function normalizeCard(t, base = '') {
  const imageUrl =
    t.previewImage || t.preview_image || t.thumbnailUrl || t.thumbnail ||
    t.coverImage || t.cover_image || t.image || t.imageUrl || t.image_url ||
    t.screenshot || t.screenshotUrl || t.preview || t.featuredImage ||
    t.featured_media_src_url ||
    t._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';

  const link =
    t.url || t.link || t.href || t.templateUrl || t.template_url ||
    (t.slug ? `${base}/templates/${t.slug}` : '') || '';

  return {
    title: t.name || t.title || t.heading || t.title?.rendered || '',
    description:
      t.description || t.subtitle || t.excerpt || t.shortDescription ||
      t.short_description || t.excerpt?.rendered?.replace(/<[^>]+>/g, '') || '',
    image_url: ensureAbsoluteUrl(imageUrl, base),
    link: ensureAbsoluteUrl(link, base),
    tags: [
      ...(t.tags || []),
      ...(t.integrations || []),
      ...(t.categories || []),
      ...(t.connectors || []),
    ].filter(v => typeof v === 'string'),
  };
}

/** Try common Next.js pageProps paths for a template array. */
export function extractFromNextData(nextData, category, base) {
  const props = nextData?.props?.pageProps;
  if (!props) return [];

  const candidates = [
    props.templates, props.data?.templates, props.items, props.data?.items,
    props.templateList, props.initialData?.templates, props.gallery,
    props.data?.gallery, props.reports, props.dashboards,
  ];

  for (const list of candidates) {
    if (Array.isArray(list) && list.length > 0) {
      const cards = list
        .filter(t => matchesCategory(t, category))
        .map(t => normalizeCard(t, base))
        .filter(c => c.title && c.image_url);
      if (cards.length > 0) return cards;
    }
  }
  return [];
}

export const DEFAULT_BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
