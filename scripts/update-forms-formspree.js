/**
 * Update Webflow popup forms to Formspree.
 * Run with: node scripts/update-forms-formspree.js
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const FORMSPREE = 'https://formspree.io/f/xvzvbpyd';

const FILES = [
  { rel: 'index.html', isRoot: true },
  { rel: 'detail_resources.html', isRoot: true },
  { rel: 'resources/the-definitive-guide-to-power-bi-embedded.html', isRoot: false },
  { rel: 'resources/ai-in-bi-adoption-curve.html', isRoot: false },
  { rel: 'resources/bahler-management-reporting-hub.html', isRoot: false },
  { rel: 'resources/bi-genius-from-reporting-hub.html', isRoot: false },
  { rel: 'resources/bi-genius-product-demo-white-label-ai-agents-for-power-bi.html', isRoot: false },
  { rel: 'resources/galatea-technologies.html', isRoot: false },
  { rel: 'resources/licensing-cost-comparison.html', isRoot: false },
  { rel: 'resources/microsoft-fabric-reporting-hub-webinar-modernize-your-bi-strategy.html', isRoot: false },
  { rel: 'resources/optimizing-your-semantic-model-for-ai.html', isRoot: false },
  { rel: 'resources/power-bi-embedded-licensing-explained.html', isRoot: false },
  { rel: 'resources/reporting-hub---white-label-power-bi-portal.html', isRoot: false },
  { rel: 'resources/reporting-hub-datasheet.html', isRoot: false },
  { rel: 'resources/reporting-hub-explained---product-overview.html', isRoot: false },
  { rel: 'resources/reporting-hub-overview.html', isRoot: false },
  { rel: 'resources/sharing-power-bi-externally.html', isRoot: false },
  { rel: 'resources/the-importance-of-properly-configuring-your-semantic-model-for-ai-powered-insights.html', isRoot: false },
  { rel: 'resources/unlock-revenue-potential-how-to-productize-and-monetize-your-power-bi-assets.html', isRoot: false },
  { rel: 'resources/unlock-revenue-potential-how-to-productize-and-monetize-your-power-bi-assets-ug.html', isRoot: false },
  { rel: 'resources/white-label-ai-agents-for-power-bi.html', isRoot: false },
  { rel: 'resources/why-you-should-care-about-power-bi-embedded.html', isRoot: false },
  { rel: 'resources/why-your-organization-should-use-a-white-label-power-bi-platform.html', isRoot: false },
  { rel: 'lp/stop-paying-per-user-fees.html', isRoot: false },
  { rel: 'blog.html', isRoot: true },
];

function processFile({ rel, isRoot }) {
  const fullPath = path.join(BASE, rel);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${rel}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const confirmUrl = isRoot ? 'confirm.html' : '../confirm.html';
  let popupCount = 0;
  let emailCount = 0;

  // --- Replace wf-form-Download-Popup-Form opening tags ---
  content = content.replace(
    /<form(\s[^>]*)id="wf-form-Download-Popup-Form"([^>]*)>/g,
    (match) => {
      popupCount++;

      // Extract redirect URL if any (used in index.html popup)
      const redirectMatch = match.match(/\bredirect="([^"]*)"/);
      const pdfUrl = redirectMatch ? redirectMatch[1] : null;
      const nextVal = pdfUrl || confirmUrl;
      const hidden = `<input type="hidden" name="_next" value="${nextVal}">`;

      // Preserve id, name, class; drop all WF-specific attrs
      const nameMatch = match.match(/\bname="([^"]*)"/);
      const classMatch = match.match(/\bclass="([^"]*)"/);

      const nameStr = nameMatch ? ` name="${nameMatch[1]}"` : '';
      const classStr = classMatch ? ` class="${classMatch[1]}"` : '';

      const newTag = `<form id="wf-form-Download-Popup-Form"${nameStr}${classStr} method="POST" action="${FORMSPREE}">`;
      return newTag + hidden;
    }
  );

  // --- Replace email-form with redirect attr ---
  content = content.replace(
    /<form(\s[^>]*)id="email-form"([^>]*)\bredirect="([^"]*)"([^>]*)>/g,
    (match, p1, p2, pdfUrl) => {
      emailCount++;
      const hidden = `<input type="hidden" name="_next" value="${pdfUrl}">`;

      const nameMatch = match.match(/\bname="([^"]*)"/);
      const classMatch = match.match(/\bclass="([^"]*)"/);

      const nameStr = nameMatch ? ` name="${nameMatch[1]}"` : '';
      const classStr = classMatch ? ` class="${classMatch[1]}"` : '';

      const newTag = `<form id="email-form"${nameStr}${classStr} method="POST" action="${FORMSPREE}">`;
      return newTag + hidden;
    }
  );

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`DONE: ${rel} | popup=${popupCount} | email_with_redirect=${emailCount}`);
}

FILES.forEach(processFile);
console.log('\nAll files processed.');
