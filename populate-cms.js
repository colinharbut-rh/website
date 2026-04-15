/**
 * CMS Content Population Script
 * Populates static HTML pages with content from Webflow CMS CSV exports.
 *
 * Usage:
 *   node populate-cms.js                 - Populate everything
 *   node populate-cms.js blogs           - Only blogs
 *   node populate-cms.js partners        - Only partners
 *   node populate-cms.js resources       - Only resources
 *   node populate-cms.js nav             - Only nav blog section
 *   node populate-cms.js --dry-run       - Report only
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = __dirname;
const ORIGIN_DIR = path.join(ROOT, '..', 'reportinghub-origin');
const CMS_DIR = path.join(ROOT, '..', 'reportinghub-cms');
const PARTIALS_DIR = path.join(ROOT, 'assets', 'partials');

// ===== CSV PARSER (RFC 4180 compliant) =====

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < content.length && content[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += ch;
        i++;
        continue;
      }
    }

    // Not in quotes
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ',') {
      currentRow.push(currentField);
      currentField = '';
      i++;
      continue;
    }

    if (ch === '\n' || (ch === '\r' && content[i + 1] === '\n')) {
      currentRow.push(currentField);
      currentField = '';
      rows.push(currentRow);
      currentRow = [];
      i += (ch === '\r') ? 2 : 1;
      continue;
    }

    if (ch === '\r') {
      currentRow.push(currentField);
      currentField = '';
      rows.push(currentRow);
      currentRow = [];
      i++;
      continue;
    }

    currentField += ch;
    i++;
  }

  // Last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());
  const data = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < 2) continue; // Skip empty rows

    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (row[c] || '').trim();
    }

    // Skip drafts and archived
    if (obj['Draft'] === 'true' || obj['Archived'] === 'true') continue;

    data.push(obj);
  }

  return data;
}

// ===== DATA LOADERS =====

function loadBlogs() {
  const csvFile = fs.readdirSync(CMS_DIR).find(f => f.includes('Blogs'));
  if (!csvFile) { console.error('Blogs CSV not found'); return []; }
  const data = parseCSV(path.join(CMS_DIR, csvFile));

  return data.map(row => ({
    name: row['Blog name'] || '',
    slug: row['Slug'] || '',
    heading: row['[Blog page/template] Blog heading'] || row['Blog name'] || '',
    authorName: row['[Blog page/template] Author name'] || '',
    readTime: row['[Blog page/template] Read time'] || '',
    authorBio: row['[Blog template] Author bio'] || '',
    category: row['[Blog Page] Category'] || '',
    tocHeading: row['[Blog template] Table of content heading'] || '',
    tocSubs: Array.from({ length: 10 }, (_, i) =>
      row[`[Blog template] Table of content subheading ${i + 1}`] || ''
    ).filter(s => s),
    description: row['[Blog Template] Blog description'] || '',
    thumbnail: row['[Blog page/template] Thumbnail'] || '',
    authorImage: row['[Blog page/template] Author image'] || '',
    authorUrl: row['[Blog Page/Template] Author URL'] || '',
    publishedOn: row['Published On'] || '',
    navbarLabel: row['navbar label number'] || '',
  })).filter(b => b.slug).sort((a, b) => {
    // Sort by published date, newest first
    const da = new Date(a.publishedOn);
    const db = new Date(b.publishedOn);
    return db - da;
  });
}

function loadPartners() {
  const csvFile = fs.readdirSync(CMS_DIR).find(f => f.includes('Partners'));
  if (!csvFile) { console.error('Partners CSV not found'); return []; }
  const data = parseCSV(path.join(CMS_DIR, csvFile));

  return data.map(row => ({
    name: row['Name'] || '',
    slug: row['Slug'] || '',
    image: row['Partners Image'] || '',
    shortDescription: row['Short Description'] || '',
    contactDetails1: row['Contact Details 1'] || '',
    contactDetails2: row['Contact Details 2'] || '',
    serviceProvided: row['Service Provided1'] || '',
    language: row['Language'] || '',
    regionsSupported: row['Regions Supported:'] || '',
    about: row['About'] || '',
    serviceFilter: row['Service provided for filter'] || '',
    locationRegion: row['Location/ Region'] || '',
    languageFilter: row['Language Filter'] || '',
    metaDescription: row['Meta description'] || '',
  })).filter(p => p.slug);
}

function loadResources() {
  const csvFile = fs.readdirSync(CMS_DIR).find(f => f.includes('Resources'));
  if (!csvFile) { console.error('Resources CSV not found'); return []; }
  const data = parseCSV(path.join(CMS_DIR, csvFile));

  return data.map(row => ({
    name: row['Name'] || '',
    slug: row['Slug'] || '',
    bannerImage: row['Banner Image'] || '',
    shortDescription: row['Short Description'] || '',
    category: row['Category'] || '',
    individualImage: row['Individual Page Image'] || '',
    bgImage: row['Bg Image'] || '',
    youtubeLink: row['Youtube Video Link'] || row['YT Video Link'] || '',
    pdfLink: row['PDF redirction link'] || '',
    whitepaperPdf: row['WhitePaper PDF'] || '',
    downloadVisible: row['Download button visibility'] || '',
  })).filter(r => r.slug);
}

// ===== HELPERS =====

function getAssetPrefix(relPath) {
  const depth = relPath.split('/').length - 1;
  return depth > 0 ? '../'.repeat(depth) : '';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function youtubeEmbedUrl(url) {
  if (!url) return '';
  // Handle youtu.be/ID and youtube.com/watch?v=ID
  let videoId = '';
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (shortMatch) videoId = shortMatch[1];
  else if (longMatch) videoId = longMatch[1];
  else return '';
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Apply migrate.js-style cleanup to HTML from origin templates
 */
function migrateCleanup(html, prefix) {
  // HTML tag
  html = html.replace(/<html[^>]*>/, '<html lang="en">');

  // Remove Webflow comments
  html = html.replace(/<!--\s*This site was created in Webflow.*?-->/g, '');
  html = html.replace(/<!--\s*Last Published:.*?-->/g, '');

  // Remove data attributes
  html = html.replace(/\s+data-wf--[a-z-]+--variant="[^"]*"/g, '');
  html = html.replace(/\s+data-wf-page="[^"]*"/g, '');
  html = html.replace(/\s+data-wf-site="[^"]*"/g, '');
  html = html.replace(/\s+data-w-id="[^"]*"/g, '');

  // Remove animation initial states
  html = html.replace(/\s+style="opacity:\s*0"/g, '');

  // Update image paths
  const imgPrefix = prefix + 'assets/images/';
  html = html.replace(/src="images\//g, `src="${imgPrefix}`);
  html = html.replace(/src="\.\.\/images\//g, `src="${imgPrefix}`);
  html = html.replace(/srcset="images\//g, `srcset="${imgPrefix}`);
  html = html.replace(/srcset="\.\.\/images\//g, `srcset="${imgPrefix}`);
  html = html.replace(/, images\//g, `, ${imgPrefix}`);
  html = html.replace(/, \.\.\/images\//g, `, ${imgPrefix}`);
  html = html.replace(/url\('\.\.\/images\//g, `url('${imgPrefix}`);
  html = html.replace(/url\('images\//g, `url('${imgPrefix}`);

  // Update CSS/JS paths
  html = html.replace(/href="css\//g, `href="${prefix}assets/css/`);
  html = html.replace(/href="\.\.\/css\//g, `href="${prefix}assets/css/`);

  // Fix page links for subfolder pages
  // Links like href="index.html" -> href="../index.html"
  if (prefix) {
    html = html.replace(/href="([a-z][a-z0-9-]*\.html)"/g, `href="${prefix}$1"`);
  }

  // Remove Webflow scripts
  html = html.replace(/<script\s+src="[^"]*webflow[^"]*\.js"[^>]*><\/script>/g, '');
  html = html.replace(/<script\s+src="Script\.js"[^>]*><\/script>/g, '');
  html = html.replace(/<script\s+src="[^"]*jquery[^"]*\.js[^"]*"[^>]*><\/script>/g, '');
  html = html.replace(/<script\s+src="[^"]*gsap[^"]*\.js"[^>]*><\/script>/g, '');
  html = html.replace(/<script[^>]*>gsap\.registerPlugin\(ScrollTrigger\);<\/script>/g, '');
  html = html.replace(/<script>\s*\/\/xllbp;[\s\S]*?<\/script>/g, '');
  html = html.replace(/window\.Webflow\s*=\s*window\.Webflow\s*\|\|\s*\[\];\s*\n\s*window\.Webflow\.push\((\w+)\);/g,
    "document.addEventListener('DOMContentLoaded', $1);");
  html = html.replace(/type="load"/g, '');
  html = html.replace(/type="lload"/g, '');

  // Clean up whitespace
  html = html.replace(/\n{3,}/g, '\n\n');

  return html;
}

/**
 * Build a clean <head> for a generated page
 */
function buildHead(prefix, title, description, ogImage) {
  return `<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta content="${description}" name="description">
  <meta content="${ogImage}" property="og:image">
  <meta content="${ogImage}" property="twitter:image">
  <meta content="width=device-width, initial-scale=1" name="viewport">

  <!-- Fonts -->
  <link href="https://fonts.googleapis.com" rel="preconnect">
  <link href="https://fonts.gstatic.com" rel="preconnect" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,300;1,400;1,600;1,700;1,800&display=swap" rel="stylesheet">

  <!-- Stylesheets -->
  <link href="${prefix}assets/css/base.css" rel="stylesheet" type="text/css">
  <link href="${prefix}assets/css/styles.css" rel="stylesheet" type="text/css">

  <!-- Favicon -->
  <link href="${prefix}assets/images/favicon.ico" rel="shortcut icon" type="image/x-icon">
  <link href="${prefix}assets/images/webclip.png" rel="apple-touch-icon">
</head>`;
}

// ===== BLOG DETAIL GENERATION =====

function generateBlogDetailPages(blogs) {
  const templatePath = path.join(ORIGIN_DIR, 'detail_blog.html');
  if (!fs.existsSync(templatePath)) {
    console.error('  ERROR: detail_blog.html template not found');
    return 0;
  }

  const templateHtml = fs.readFileSync(templatePath, 'utf-8');
  const blogDir = path.join(ROOT, 'blog');
  if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });

  const prefix = '../'; // blog/ is one level deep
  let count = 0;

  for (const blog of blogs) {
    // Apply migration cleanup
    let html = migrateCleanup(templateHtml, prefix);

    // Replace head
    const headStart = html.indexOf('<head>');
    const headEnd = html.indexOf('</head>') + '</head>'.length;
    if (headStart !== -1 && headEnd > headStart) {
      const desc = stripHtml(blog.description).substring(0, 160);
      const newHead = buildHead(prefix, blog.heading, desc, blog.thumbnail);
      html = html.substring(0, headStart) + newHead + html.substring(headEnd);
    }

    // Use cheerio for DOM manipulation
    const $ = cheerio.load(html, { decodeEntities: false });

    // Fill blog hero image
    $('img.human-centered-image').attr('src', blog.thumbnail).removeClass('w-dyn-bind-empty');

    // Fill title
    $('h1.heading-2').text(blog.heading).removeClass('w-dyn-bind-empty');

    // Fill author image & name
    $('a.writer-image-wrap img.writer-image').attr('src', blog.authorImage).removeClass('w-dyn-bind-empty');
    if (blog.authorUrl) {
      $('a.writer-image-wrap').attr('href', prefix + blog.authorUrl);
    }

    // Fill author name, date, read time - the divs after writer-image-wrap
    const grayDivs = $('a.writer-image-wrap').parent().find('.text-color-gray.w-dyn-bind-empty');
    if (grayDivs.length >= 1) {
      $(grayDivs[0]).text(blog.authorName).removeClass('w-dyn-bind-empty');
    }

    // Date and read time - find in the surrounding area
    $('a.writer-image-wrap').parent().find('.text-color-gray.w-dyn-bind-empty').each(function (i) {
      if (i === 0) {
        $(this).text(formatDate(blog.publishedOn)).removeClass('w-dyn-bind-empty');
      }
    });

    // Read time in time-icon div
    $('.time-icon .text-color-gray.w-dyn-bind-empty').text(blog.readTime).removeClass('w-dyn-bind-empty');

    // Fill blog content (rich text)
    $('div[fc-toc="content"].w-richtext').html(blog.description).removeClass('w-dyn-bind-empty');

    // Fill Table of Contents
    const tocList = $('ol[fc-toc="component"]');
    if (tocList.length && blog.tocSubs.length) {
      tocList.empty();
      blog.tocSubs.forEach(sub => {
        const anchorId = sub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        tocList.append(`<li class="blog-post_toc-list-item"><a href="#${anchorId}" fc-toc="h2" class="toc_h2">${sub}</a></li>\n`);
      });
    }

    // Fill related blogs (pick 2-3 other posts)
    const relatedList = $('.related-blogs .w-dyn-items');
    if (relatedList.length) {
      const relatedTemplate = relatedList.find('.w-dyn-item').first();
      if (relatedTemplate.length) {
        const templateClone = relatedTemplate.clone();
        relatedList.empty();

        const otherBlogs = blogs.filter(b => b.slug !== blog.slug).slice(0, 3);
        otherBlogs.forEach(rb => {
          const item = templateClone.clone();
          item.find('img.related-blog-img').attr('src', rb.thumbnail).removeClass('w-dyn-bind-empty');
          item.find('h3.related-blogs-h3').text(rb.heading).removeClass('w-dyn-bind-empty');
          item.find('a.related-blog-link').attr('href', `${rb.slug}.html`);
          relatedList.append(item);
        });
      }
    }
    // Remove w-dyn-empty
    $('.related-blogs .w-dyn-empty').remove();

    // Populate nav blog previews in this page
    populateNavBlogList($, blogs.slice(0, 3), prefix);

    // Add main.js if not present
    if (!$.html().includes('main.js')) {
      $('body').append(`<script src="${prefix}assets/js/main.js"></script>\n`);
    }

    // Write file
    const outputPath = path.join(blogDir, `${blog.slug}.html`);
    fs.writeFileSync(outputPath, $.html(), 'utf-8');
    count++;
    console.log(`  OK: blog/${blog.slug}.html`);
  }

  return count;
}

// ===== PARTNER DETAIL GENERATION =====

function generatePartnerDetailPages(partners) {
  const templatePath = path.join(ORIGIN_DIR, 'detail_partners.html');
  if (!fs.existsSync(templatePath)) {
    console.error('  ERROR: detail_partners.html template not found');
    return 0;
  }

  const templateHtml = fs.readFileSync(templatePath, 'utf-8');
  const partnersDir = path.join(ROOT, 'partners');
  if (!fs.existsSync(partnersDir)) fs.mkdirSync(partnersDir, { recursive: true });

  const prefix = '../';
  let count = 0;

  for (const partner of partners) {
    let html = migrateCleanup(templateHtml, prefix);

    // Replace head
    const headStart = html.indexOf('<head>');
    const headEnd = html.indexOf('</head>') + '</head>'.length;
    if (headStart !== -1 && headEnd > headStart) {
      const desc = partner.metaDescription || partner.shortDescription.substring(0, 160);
      const newHead = buildHead(prefix, `${partner.name} - Reporting Hub Partner`, desc, partner.image);
      html = html.substring(0, headStart) + newHead + html.substring(headEnd);
    }

    const $ = cheerio.load(html, { decodeEntities: false });

    // Partner name
    $('h1.heading-style-h1.w-dyn-bind-empty').text(partner.name).removeClass('w-dyn-bind-empty');

    // Partner hero image — target only images without a src (truly empty CMS bindings)
    const emptyPartnerImgs = $('img.w-dyn-bind-empty').filter(function () {
      const s = $(this).attr('src');
      return !s || s === '';
    });
    if (emptyPartnerImgs.length) {
      emptyPartnerImgs.first().attr('src', partner.image).removeClass('w-dyn-bind-empty');
    }
    // Remove w-dyn-bind-empty from any decorative images that already have a src
    $('img.w-dyn-bind-empty[src]').removeClass('w-dyn-bind-empty');

    // Contact details
    const contactLinks = $('.contact-details-1');
    if (contactLinks.length >= 1) {
      $(contactLinks[0]).attr('href', partner.contactDetails1).find('.w-dyn-bind-empty').text(partner.contactDetails1).removeClass('w-dyn-bind-empty');
    }
    if (contactLinks.length >= 2) {
      $(contactLinks[1]).attr('href', partner.contactDetails2).find('.w-dyn-bind-empty').text(partner.contactDetails2).removeClass('w-dyn-bind-empty');
    }

    // Services, regions, languages (rich text fields)
    const richTextDivs = $('.w-dyn-bind-empty.w-richtext');
    if (richTextDivs.length >= 1) $(richTextDivs[0]).html(partner.serviceProvided).removeClass('w-dyn-bind-empty');
    if (richTextDivs.length >= 2) $(richTextDivs[1]).html(partner.regionsSupported).removeClass('w-dyn-bind-empty');
    if (richTextDivs.length >= 3) $(richTextDivs[2]).html(partner.language).removeClass('w-dyn-bind-empty');
    if (richTextDivs.length >= 4) $(richTextDivs[3]).html(partner.about).removeClass('w-dyn-bind-empty');

    // Populate nav blog previews
    const blogs = loadBlogs();
    populateNavBlogList($, blogs.slice(0, 3), prefix);

    // Add main.js
    if (!$.html().includes('main.js')) {
      $('body').append(`<script src="${prefix}assets/js/main.js"></script>\n`);
    }

    const outputPath = path.join(partnersDir, `${partner.slug}.html`);
    fs.writeFileSync(outputPath, $.html(), 'utf-8');
    count++;
    console.log(`  OK: partners/${partner.slug}.html`);
  }

  return count;
}

// ===== RESOURCE DETAIL GENERATION =====

function generateResourceDetailPages(resources) {
  const templatePath = path.join(ORIGIN_DIR, 'detail_resources.html');
  if (!fs.existsSync(templatePath)) {
    console.error('  ERROR: detail_resources.html template not found');
    return 0;
  }

  const templateHtml = fs.readFileSync(templatePath, 'utf-8');
  const resourcesDir = path.join(ROOT, 'resources');
  if (!fs.existsSync(resourcesDir)) fs.mkdirSync(resourcesDir, { recursive: true });

  const prefix = '../';
  let count = 0;

  for (const resource of resources) {
    let html = migrateCleanup(templateHtml, prefix);

    // Replace head
    const headStart = html.indexOf('<head>');
    const headEnd = html.indexOf('</head>') + '</head>'.length;
    if (headStart !== -1 && headEnd > headStart) {
      const newHead = buildHead(prefix, resource.name, resource.shortDescription.substring(0, 160), resource.bannerImage);
      html = html.substring(0, headStart) + newHead + html.substring(headEnd);
    }

    const $ = cheerio.load(html, { decodeEntities: false });

    // Fill title(s)
    $('h1.heading-style-h1.w-dyn-bind-empty').text(resource.name).removeClass('w-dyn-bind-empty');

    // Fill description
    $('div.font-1.fw-500.large.w-dyn-bind-empty').text(resource.shortDescription).removeClass('w-dyn-bind-empty');

    // Fill images
    $('img.image-14.w-dyn-bind-empty').attr('src', resource.individualImage || resource.bannerImage).removeClass('w-dyn-bind-empty');
    $('img.w-dyn-bind-empty').each(function () {
      $(this).attr('src', resource.individualImage || resource.bannerImage).removeClass('w-dyn-bind-empty');
    });

    // Fill YouTube embed
    const videoDiv = $('div.video.w-dyn-bind-empty');
    if (videoDiv.length && resource.youtubeLink) {
      const embedUrl = youtubeEmbedUrl(resource.youtubeLink);
      if (embedUrl) {
        videoDiv.html(`<iframe width="100%" height="100%" src="${embedUrl}" title="${resource.name}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`);
        videoDiv.removeClass('w-dyn-bind-empty');
        // Set padding for 16:9 aspect ratio
        videoDiv.css('padding-bottom', '56.25%').css('position', 'relative').css('height', '0');
      }
    } else if (videoDiv.length) {
      // No YouTube link — strip the placeholder class so no empty binding remains
      videoDiv.removeClass('w-dyn-bind-empty');
    }

    // Handle PDF link - set on download form
    if (resource.pdfLink) {
      $('div[data-pdf-url]').attr('data-pdf-url', resource.pdfLink);
    }

    // Populate nav blog previews
    const blogs = loadBlogs();
    populateNavBlogList($, blogs.slice(0, 3), prefix);

    // Populate bottom blog section
    populateBlogCards($, blogs.slice(0, 3), prefix);

    // Add main.js
    if (!$.html().includes('main.js')) {
      $('body').append(`<script src="${prefix}assets/js/main.js"></script>\n`);
    }

    const outputPath = path.join(resourcesDir, `${resource.slug}.html`);
    fs.writeFileSync(outputPath, $.html(), 'utf-8');
    count++;
    console.log(`  OK: resources/${resource.slug}.html`);
  }

  return count;
}

// ===== LISTING PAGE POPULATION =====

function populateBlogListing(blogs) {
  const filePath = path.join(ROOT, 'blog.html');
  if (!fs.existsSync(filePath)) {
    console.error('  ERROR: blog.html not found');
    return;
  }

  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html, { decodeEntities: false });
  const prefix = ''; // Root level page

  // Featured blog (first list with is-single)
  const featuredList = $('.blog-list.is-single');
  if (featuredList.length && blogs.length > 0) {
    const template = featuredList.find('.w-dyn-item').first().clone();
    featuredList.empty();

    const blog = blogs[0];
    const item = fillBlogCard(template.clone(), blog, prefix);
    featuredList.append(item);
  }

  // Remove w-dyn-empty for featured
  featuredList.closest('.w-dyn-list').find('.w-dyn-empty').remove();

  // Grid blog list (second list without is-single)
  const gridList = $('.blog-list').not('.is-single');
  if (gridList.length && blogs.length > 1) {
    const template = gridList.find('.w-dyn-item').first().clone();
    gridList.empty();

    blogs.slice(1).forEach(blog => {
      const item = fillBlogCard(template.clone(), blog, prefix);
      gridList.append(item);
    });
  }

  // Remove w-dyn-empty for grid
  gridList.closest('.w-dyn-list').find('.w-dyn-empty').remove();

  // Populate nav blog previews
  populateNavBlogList($, blogs.slice(0, 3), prefix);

  fs.writeFileSync(filePath, $.html(), 'utf-8');
  console.log(`  OK: blog.html (${blogs.length} posts)`);
}

function fillBlogCard($template, blog, prefix) {
  // Thumbnail
  $template.find('img.blog-bannar-image').attr('src', blog.thumbnail).removeClass('w-dyn-bind-empty');

  // Category
  $template.find('.text-block-6').text(blog.category).removeClass('w-dyn-bind-empty');

  // Read time
  $template.find('.mins-to-read .text-color-gray.w-dyn-bind-empty').text(blog.readTime).removeClass('w-dyn-bind-empty');

  // Title
  $template.find('.text-size-large.text-color-white').text(blog.heading).removeClass('w-dyn-bind-empty');

  // Author image & name
  $template.find('img.writer-image').attr('src', blog.authorImage).removeClass('w-dyn-bind-empty');
  $template.find('.writer-tab-left .text-color-gray.w-dyn-bind-empty').text(blog.authorName).removeClass('w-dyn-bind-empty');

  // Links
  $template.find('a.blog-img-link').attr('href', `${prefix}blog/${blog.slug}.html`);
  $template.find('a.blog-link').attr('href', `${prefix}blog/${blog.slug}.html`);
  if (blog.authorUrl) {
    $template.find('a.writer-tab-left').attr('href', `${prefix}${blog.authorUrl}`);
  }

  return $template;
}

function populatePartnersListing(partners) {
  const filePath = path.join(ROOT, 'partners-partnerdirectory.html');
  if (!fs.existsSync(filePath)) {
    console.error('  ERROR: partners-partnerdirectory.html not found');
    return;
  }

  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html, { decodeEntities: false });
  const prefix = '';

  const partnerList = $('.partners-colection-list');
  if (partnerList.length) {
    const template = partnerList.find('.w-dyn-item').first().clone();
    partnerList.empty();

    partners.forEach(partner => {
      const item = template.clone();

      // Image
      item.find('img.image-22').attr('src', partner.image).removeClass('w-dyn-bind-empty');

      // Name
      item.find('.text-size-large.xlarge').text(partner.name).removeClass('w-dyn-bind-empty');

      // Short description
      item.find('.partners-short-dsc').text(partner.shortDescription).removeClass('w-dyn-bind-empty');

      // Service provided (nested collection) - populate with filter values
      const serviceList = item.find('.collection-list-wrapper-2').first();
      if (serviceList.length && partner.serviceFilter) {
        const services = partner.serviceFilter.split(';').map(s => s.trim()).filter(s => s);
        const svcItems = serviceList.find('.w-dyn-items');
        const svcTemplate = svcItems.find('.w-dyn-item').first().clone();
        svcItems.empty();
        services.forEach(svc => {
          const svcItem = svcTemplate.clone();
          svcItem.find('.w-dyn-bind-empty').text(svc.replace(/-/g, ' ')).removeClass('w-dyn-bind-empty');
          svcItems.append(svcItem);
        });
      }

      // Location (second nested collection)
      const locList = item.find('.collection-list-wrapper-2').last();
      if (locList.length && partner.locationRegion) {
        const locations = partner.locationRegion.split(';').map(s => s.trim()).filter(s => s);
        const locItems = locList.find('.w-dyn-items');
        const locTemplate = locItems.find('.w-dyn-item').first().clone();
        locItems.empty();
        locations.forEach(loc => {
          const locItem = locTemplate.clone();
          locItem.find('.w-dyn-bind-empty').text(loc.replace(/-/g, ' ')).removeClass('w-dyn-bind-empty');
          locItems.append(locItem);
        });
      }

      // Language
      item.find('.text-block-27').text(partner.languageFilter).removeClass('w-dyn-bind-empty');

      // Learn more link
      item.find('a.link-block-2').attr('href', `partners/${partner.slug}.html`);

      partnerList.append(item);
    });
  }

  // Remove w-dyn-empty
  partnerList.closest('.w-dyn-list').find('.w-dyn-empty').remove();

  // Populate nav blog previews
  const blogs = loadBlogs();
  populateNavBlogList($, blogs.slice(0, 3), prefix);

  fs.writeFileSync(filePath, $.html(), 'utf-8');
  console.log(`  OK: partners-partnerdirectory.html (${partners.length} partners)`);
}

function populateResourcesListing(resources) {
  const filePath = path.join(ROOT, 'resources.html');
  if (!fs.existsSync(filePath)) {
    console.error('  ERROR: resources.html not found');
    return;
  }

  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html, { decodeEntities: false });
  const prefix = '';

  // Tab mapping
  const tabMap = {
    'Tab 1': 'Solutions',
    'Tab 2': 'Case Studies',
    'Tab 3': 'White Papers',
    'Tab 4': 'Videos',
  };

  Object.entries(tabMap).forEach(([tabId, category]) => {
    const tabPane = $(`div[data-w-tab="${tabId}"]`);
    if (!tabPane.length) return;

    const list = tabPane.find('.w-dyn-list').first();
    if (!list.length) return;

    const itemsContainer = list.find('.w-dyn-items');
    if (!itemsContainer.length) return;

    const template = itemsContainer.find('.w-dyn-item').first().clone();
    itemsContainer.empty();

    const filtered = resources.filter(r => r.category === category);

    filtered.forEach(resource => {
      const item = template.clone();

      // Image
      item.find('img.resources-images').attr('src', resource.bannerImage).removeClass('w-dyn-bind-empty');

      // Title
      item.find('.heading-style-h4').text(resource.name).removeClass('w-dyn-bind-empty');

      // Description
      item.find('.w-dyn-bind-empty').first().text(resource.shortDescription).removeClass('w-dyn-bind-empty');

      // Link
      item.find('a.access-button').attr('href', `resources/${resource.slug}.html`);

      itemsContainer.append(item);
    });

    // Remove w-dyn-empty
    list.find('.w-dyn-empty').remove();
  });

  // Populate nav blog previews
  const blogs = loadBlogs();
  populateNavBlogList($, blogs.slice(0, 3), prefix);

  fs.writeFileSync(filePath, $.html(), 'utf-8');
  console.log(`  OK: resources.html (${resources.length} resources)`);
}

function populateIndexBlogSection(blogs) {
  const filePath = path.join(ROOT, 'index.html');
  if (!fs.existsSync(filePath)) {
    console.error('  ERROR: index.html not found');
    return;
  }

  const html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html, { decodeEntities: false });
  const prefix = '';

  // Find the blog list in the main content (not nav)
  // The blog section has class "blog-list" inside ".main"
  const blogList = $('.main .blog-list');
  if (blogList.length) {
    const template = blogList.find('.w-dyn-item').first().clone();
    blogList.empty();

    const postsToShow = blogs.slice(0, 4);
    postsToShow.forEach(blog => {
      const item = fillBlogCard(template.clone(), blog, prefix);
      blogList.append(item);
    });
  }

  // Remove w-dyn-empty in main section
  $('.main .w-dyn-empty').remove();

  fs.writeFileSync(filePath, $.html(), 'utf-8');
  console.log(`  OK: index.html blog section (${Math.min(blogs.length, 4)} posts)`);
}

// ===== NAV BLOG POPULATION =====

function populateNavBlogList($, blogs, prefix) {
  // Find all nav blog lists (uui-navbar01_dropdown-blog-list)
  $('.uui-navbar01_dropdown-blog-list').each(function () {
    const list = $(this);
    const template = list.find('.w-dyn-item').first().clone();
    list.empty();

    blogs.slice(0, 3).forEach(blog => {
      const item = template.clone();
      item.find('img.uui-navbar01_blog-image').attr('src', blog.thumbnail).removeClass('w-dyn-bind-empty');
      item.find('.uui-navbar01_item-heading').text(blog.heading).removeClass('w-dyn-bind-empty');
      item.find('a.uui-navbar01_blog-item').attr('href', `${prefix}blog/${blog.slug}.html`);
      list.append(item);
    });
  });

  // Remove w-dyn-empty in nav
  $('.uui-navbar01_dropdown-blog-list').closest('.w-dyn-list').find('.w-dyn-empty').remove();
}

function populateBlogCards($, blogs, prefix) {
  // For pages with blog card grids (like detail_resources bottom section)
  $('.blog-grid').each(function () {
    const grid = $(this);
    const template = grid.find('.w-dyn-item').first().clone();
    grid.empty();

    blogs.forEach(blog => {
      const item = template.clone();
      item.find('img.blog-thumbnail').attr('src', blog.thumbnail).removeClass('w-dyn-bind-empty');
      item.find('.heading-style-h3').text(blog.heading).removeClass('w-dyn-bind-empty');
      item.find('img.image-4').attr('src', blog.authorImage).removeClass('w-dyn-bind-empty');
      item.find('.text-block-4.w-dyn-bind-empty').first().text(blog.authorName).removeClass('w-dyn-bind-empty');
      item.find('.text-block-4.w-dyn-bind-empty').first().text(formatDate(blog.publishedOn)).removeClass('w-dyn-bind-empty');
      item.find('a').attr('href', `${prefix}blog/${blog.slug}.html`);
      grid.append(item);
    });
  });
  // Remove w-dyn-empty
  $('.blog-grid').closest('.w-dyn-list').find('.w-dyn-empty').remove();
}

function updateNavPartial(blogs) {
  const navPath = path.join(PARTIALS_DIR, 'nav.html');
  if (!fs.existsSync(navPath)) {
    console.error('  ERROR: nav.html partial not found');
    return;
  }

  const navHtml = fs.readFileSync(navPath, 'utf-8');
  const $ = cheerio.load(navHtml, { decodeEntities: false, xmlMode: false });

  // Use {{PREFIX}} for the partial template
  populateNavBlogList($, blogs.slice(0, 3).map(b => ({
    ...b,
    // Override paths for template partial
  })), '{{PREFIX}}');

  fs.writeFileSync(navPath, $.html(), 'utf-8');
  console.log(`  OK: assets/partials/nav.html updated`);
}

function injectNavToAllPages() {
  // Reuse build.js logic by requiring it or running the command
  console.log('  Injecting nav into all pages...');
  const { execSync } = require('child_process');
  try {
    const output = execSync('node build.js inject-nav', { cwd: ROOT, encoding: 'utf-8' });
    // Count updates
    const updated = (output.match(/UPDATED:/g) || []).length;
    console.log(`  Nav injected into ${updated} pages`);
  } catch (e) {
    console.error('  ERROR running build.js inject-nav:', e.message);
  }
}

// ===== MAIN =====

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const target = args.find(a => !a.startsWith('--')) || 'all';

console.log('=== CMS Content Population ===\n');

// Load all data
const blogs = loadBlogs();
const partners = loadPartners();
const resources = loadResources();

console.log(`Loaded: ${blogs.length} blogs, ${partners.length} partners, ${resources.length} resources\n`);

if (dryRun) {
  console.log('DRY RUN - no files will be written\n');
  console.log('Blogs:');
  blogs.forEach(b => console.log(`  - ${b.slug} (${b.heading})`));
  console.log('\nPartners:');
  partners.forEach(p => console.log(`  - ${p.slug} (${p.name})`));
  console.log('\nResources:');
  resources.forEach(r => console.log(`  - ${r.slug} (${r.name}) [${r.category}]`));
  process.exit(0);
}

if (target === 'all' || target === 'blogs') {
  console.log('--- Generating blog detail pages ---');
  const blogCount = generateBlogDetailPages(blogs);
  console.log(`  Generated ${blogCount} blog pages\n`);

  console.log('--- Populating blog listing ---');
  populateBlogListing(blogs);

  console.log('--- Populating index.html blog section ---');
  populateIndexBlogSection(blogs);
  console.log('');
}

if (target === 'all' || target === 'partners') {
  console.log('--- Generating partner detail pages ---');
  const partnerCount = generatePartnerDetailPages(partners);
  console.log(`  Generated ${partnerCount} partner pages\n`);

  console.log('--- Populating partners listing ---');
  populatePartnersListing(partners);
  console.log('');
}

if (target === 'all' || target === 'resources') {
  console.log('--- Generating resource detail pages ---');
  const resourceCount = generateResourceDetailPages(resources);
  console.log(`  Generated ${resourceCount} resource pages\n`);

  console.log('--- Populating resources listing ---');
  populateResourcesListing(resources);
  console.log('');
}

if (target === 'all' || target === 'nav') {
  console.log('--- Updating nav blog previews ---');
  updateNavPartial(blogs);
  injectNavToAllPages();
  console.log('');
}

console.log('Done.');
