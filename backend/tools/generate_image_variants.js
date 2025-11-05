#!/usr/bin/env node
// generate_image_variants.js
// Small script to generate resized JPEG and WebP variants for images in the uploads folder.
// Usage: node generate_image_variants.js [--src ./uploads] [--sizes 480,768,1024,1600]

const fs = require('fs');
const path = require('path');

const sharpAvailable = (() => {
  try {
    require.resolve('sharp');
    return true;
  } catch (e) {
    return false;
  }
})();

if (!sharpAvailable) {
  console.error('\nERROR: sharp module not found. Install it with `npm install sharp` in the backend folder.');
  process.exit(1);
}

const sharp = require('sharp');

const argv = require('minimist')(process.argv.slice(2));
const srcDir = path.resolve(argv.src || path.join(__dirname, '..', '..', 'uploads'));
// Include smaller variants (160,320) so tiny UI slots like logos can request
// small files instead of the larger originals.
const sizes = (argv.sizes || '160,320,480,768,1024,1600').split(',').map(s => parseInt(s, 10)).filter(Boolean);

console.log(`Scanning ${srcDir} for images...`);

if (!fs.existsSync(srcDir)) {
  console.error('Source directory does not exist:', srcDir);
  process.exit(1);
}

const exts = ['.jpg', '.jpeg', '.png'];

async function processFile(file) {
  const ext = path.extname(file).toLowerCase();
  if (!exts.includes(ext)) return;

  const base = path.basename(file, ext);
  const full = path.join(srcDir, file);

  for (const w of sizes) {
    const outJpg = path.join(srcDir, `${base}-${w}${ext}`);
    const outWebp = path.join(srcDir, `${base}-${w}.webp`);

    if (!fs.existsSync(outJpg)) {
      try {
        await sharp(full).resize({ width: w }).jpeg({ quality: 80 }).toFile(outJpg);
        console.log('Wrote', outJpg);
      } catch (e) {
        console.error('Error writing', outJpg, e.message);
      }
    }

    if (!fs.existsSync(outWebp)) {
      try {
        await sharp(full).resize({ width: w }).webp({ quality: 75 }).toFile(outWebp);
        console.log('Wrote', outWebp);
      } catch (e) {
        console.error('Error writing', outWebp, e.message);
      }
    }
  }
}

(async () => {
  const files = fs.readdirSync(srcDir);
  for (const f of files) {
    try {
      await processFile(f);
    } catch (e) {
      console.error('Failed for', f, e.message);
    }
  }
  console.log('Done.');
})();
