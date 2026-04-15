/**
 * migrate-hubspot-forms.js
 * Replaces all remaining HubSpot SDK form embeds with native Formspree forms.
 * Run: node scripts/migrate-hubspot-forms.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENDPOINT = 'https://formspree.io/f/xvzvbpyd';

// ─── Form HTML snippets ──────────────────────────────────────────────────────

const FORM_FULL = `
                        <form action="${ENDPOINT}" method="POST" class="hs-form stacked">
                          <fieldset class="form-columns-2 fieldset-01">
                            <div class="hs_firstname hs-firstname hs-fieldtype-text field hs-form-field">
                              <label><span>First name</span><span class="hs-form-required">*</span></label>
                              <div class="input"><input name="firstname" type="text" class="hs-input" required autocomplete="given-name" placeholder="First name"></div>
                            </div>
                            <div class="hs_lastname hs-lastname hs-fieldtype-text field hs-form-field">
                              <label><span>Last name</span><span class="hs-form-required">*</span></label>
                              <div class="input"><input name="lastname" type="text" class="hs-input" required autocomplete="family-name" placeholder="Last name"></div>
                            </div>
                          </fieldset>
                          <fieldset class="form-columns-2 fieldset-02">
                            <div class="hs_email hs-email hs-fieldtype-text field hs-form-field">
                              <label><span>Email</span><span class="hs-form-required">*</span></label>
                              <div class="input"><input name="email" type="email" class="hs-input" required autocomplete="email" placeholder="Work email"></div>
                            </div>
                            <div class="hs_company hs-company hs-fieldtype-text field hs-form-field">
                              <label><span>Company name</span><span class="hs-form-required">*</span></label>
                              <div class="input"><input name="company" type="text" class="hs-input" required autocomplete="organization" placeholder="Company"></div>
                            </div>
                          </fieldset>
                          <fieldset class="form-columns-1 fieldset-03">
                            <div class="hs_message hs-message hs-fieldtype-textarea field hs-form-field">
                              <label><span>Message</span></label>
                              <div class="input"><textarea name="message" class="hs-input" placeholder="Tell us about your needs..."></textarea></div>
                            </div>
                          </fieldset>
                          <div class="hs_submit hs-submit">
                            <div class="actions"><input type="submit" class="hs-button primary large" value="Submit"></div>
                          </div>
                        </form>`;

const FORM_EMAIL_ONLY = `
                    <form action="${ENDPOINT}" method="POST" class="hs-form stacked">
                      <fieldset class="form-columns-1">
                        <div class="hs_email hs-email hs-fieldtype-text field hs-form-field">
                          <div class="input"><input name="email" type="email" class="hs-input" required autocomplete="off" placeholder="Your email address"></div>
                        </div>
                      </fieldset>
                      <div class="hs_submit hs-submit">
                        <div class="actions"><input type="submit" class="hs-button primary large" value="Subscribe"></div>
                      </div>
                    </form>`;

// ─── Replacement logic ───────────────────────────────────────────────────────

/**
 * Replaces the HubSpot SDK block (script tag + div.custom_hbs_form + style block)
 * with a native Formspree form.
 *
 * Pattern:
 *   <script ... src="https://js.hsforms.net/..."></script>
 *   <div class="custom_hbs_form ...">
 *     <script>hbspt.forms.create({...});</script>
 *     [optional inner div]
 *   </div>
 *   [optional <style>...</style>]
 */
function replaceHubspotBlock(html, formHtml, divClass) {
  // Match: hsforms script tag + custom_hbs_form div (with inner script) + optional style block
  // Using a regex with 's' (dotAll) flag
  const re = new RegExp(
    '<script[^>]+js\\.hsforms\\.net[^>]*><\\/script>\\s*' +
    '<div[^>]+custom_hbs_form[^>]*>' +
      '[\\s\\S]*?' +
    '<\\/div>' +
    '(?:\\s*<style>[\\s\\S]*?<\\/style>)?',
    'g'
  );

  const replacement = `<div class="${divClass}">${formHtml}\n                      </div>`;
  return html.replace(re, replacement);
}

/**
 * For blog posts: the style block ends with </style> and the div class is
 * "custom_hbs_form paidsearchpage blog-email-only"
 */
function replaceBlogForm(html) {
  const re = new RegExp(
    '<script[^>]+js\\.hsforms\\.net[^>]*><\\/script>\\s*' +
    '<div[^>]+blog-email-only[^>]*>' +
      '[\\s\\S]*?' +
    '<\\/div>' +
    '(?:\\s*<style>[\\s\\S]*?<\\/style>)?',
    'g'
  );
  const replacement = `<div class="custom_hbs_form paidsearchpage blog-email-only">${FORM_EMAIL_ONLY}\n                  </div>`;
  return html.replace(re, replacement);
}

/**
 * For standard hbspt.forms.create() embeds (LP-style):
 * replaces script tag + div with script + d-flex div
 */
function replaceStandardForm(html) {
  return replaceHubspotBlock(html, FORM_FULL, 'custom_hbs_form paidsearchpage');
}

// ─── File lists ───────────────────────────────────────────────────────────────

function getFiles(dir, ext) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(ext))
    .map(f => path.join(dir, f));
}

const blogFiles = getFiles(path.join(ROOT, 'blog'), '.html');

const standardFiles = [
  path.join(ROOT, 'community.html'),
  path.join(ROOT, 'bi-genius-trial.html'),
  path.join(ROOT, 'demo-bi-genius.html'),
  path.join(ROOT, 'detail_blog.html'),
  path.join(ROOT, 'power-bi', 'share-microsoft-power-bi.html'),
];

// ─── Process files ────────────────────────────────────────────────────────────

let changed = 0;
let skipped = 0;

function processFile(filePath, replaceFn, label) {
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP (not found): ${path.relative(ROOT, filePath)}`);
    skipped++;
    return;
  }
  const original = fs.readFileSync(filePath, 'utf8');
  if (!original.includes('js.hsforms.net')) {
    console.log(`  SKIP (no HubSpot): ${path.relative(ROOT, filePath)}`);
    skipped++;
    return;
  }
  const updated = replaceFn(original);
  if (updated === original) {
    console.log(`  WARN (no change):  ${path.relative(ROOT, filePath)}`);
    skipped++;
    return;
  }
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`  OK:                ${path.relative(ROOT, filePath)}`);
  changed++;
}

console.log('\n=== Blog posts (email-only subscribe) ===');
blogFiles.forEach(f => processFile(f, replaceBlogForm, 'blog'));

console.log('\n=== Standard pages (full form) ===');
standardFiles.forEach(f => processFile(f, replaceStandardForm, 'standard'));

console.log(`\nDone: ${changed} changed, ${skipped} skipped.\n`);
