const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

function walkDir(dir, exts) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, exts));
    } else if (exts.some(ext => entry.name.toLowerCase().endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

async function convertToWebp() {
  const pngFiles = walkDir(path.join(ROOT, 'assets/images'), ['.png']);
  const jpgFiles = walkDir(path.join(ROOT, 'assets/videos'), ['.jpg', '.jpeg']);
  const allFiles = [...pngFiles, ...jpgFiles];

  let converted = 0;
  for (const inputPath of allFiles) {
    const basename = path.basename(inputPath);
    if (basename === 'webclip.png') {
      console.log(`skipped: ${path.relative(ROOT, inputPath)} (webclip exception)`);
      continue;
    }

    const outputPath = inputPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    await sharp(inputPath).webp({ quality: 85 }).toFile(outputPath);
    console.log(`converted: ${path.relative(ROOT, inputPath)} → ${path.relative(ROOT, outputPath)}`);
    converted++;
  }

  console.log(`\nDone. ${converted} files converted.`);
}

convertToWebp().catch(err => {
  console.error(err);
  process.exit(1);
});
