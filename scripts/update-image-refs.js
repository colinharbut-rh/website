const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walkDir(dir, ext) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '_unused') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

function updateHtmlContent(content) {
  // Replace .png/.jpg/.jpeg extensions in src and srcset attributes (local paths only)
  return content.replace(
    /(src(?:set)?=["'])([^"']+)(["'])/g,
    (match, prefix, value, suffix) => {
      // For srcset, each entry may have a descriptor like "foo.png 500w"
      const updated = value.replace(
        /([^\s"',]+)\.(png|jpg|jpeg)/gi,
        (imgMatch) => {
          // Skip absolute URLs
          if (imgMatch.startsWith('http://') || imgMatch.startsWith('https://')) {
            return imgMatch;
          }
          // Skip webclip.png
          if (imgMatch.endsWith('webclip.png')) {
            return imgMatch;
          }
          return imgMatch.replace(/\.(png|jpg|jpeg)$/i, '.webp');
        }
      );
      return prefix + updated + suffix;
    }
  );
}

function updateCssContent(content) {
  return content.replace(
    /url\((['"]?)([^)'"]+)\.(png|jpg|jpeg)\1\)/gi,
    (match, quote, filepath) => {
      if (filepath.startsWith('http://') || filepath.startsWith('https://')) {
        return match;
      }
      return `url(${quote}${filepath}.webp${quote})`;
    }
  );
}

function updateRefs() {
  const htmlFiles = walkDir(ROOT, '.html');

  let htmlUpdated = 0;
  for (const filePath of htmlFiles) {
    const original = fs.readFileSync(filePath, 'utf8');
    const updated = updateHtmlContent(original);
    if (updated !== original) {
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log(`updated html: ${path.relative(ROOT, filePath)}`);
      htmlUpdated++;
    }
  }

  // Update CSS
  const cssPath = path.join(ROOT, 'assets/css/styles.css');
  const cssOriginal = fs.readFileSync(cssPath, 'utf8');
  const cssUpdated = updateCssContent(cssOriginal);
  if (cssUpdated !== cssOriginal) {
    fs.writeFileSync(cssPath, cssUpdated, 'utf8');
    console.log('updated css: assets/css/styles.css');
  }

  console.log(`\nDone. ${htmlUpdated} HTML files updated.`);
}

updateRefs();
