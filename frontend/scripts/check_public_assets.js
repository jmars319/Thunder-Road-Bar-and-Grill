#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-console */
/* global require, module, __dirname, Buffer */
const fs = require('fs');
const path = require('path');

// Paths
const FRONTEND_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(FRONTEND_DIR, 'public');
const INDEX_HTML = path.join(FRONTEND_DIR, 'index.html');
const MANIFEST = path.join(PUBLIC_DIR, 'manifest.json');
const PUBLIC_HOSTS = new Set(['trbgmidway.com', 'www.trbgmidway.com']);
const PUBLIC_ASSET_EXTENSIONS = /\.(?:css|html|ico|jpe?g|json|png|svg|txt|webp|woff2?|xml)$/i;

function read(file) {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function normalizePublicRef(ref) {
  if (!ref) return null;

  let clean = String(ref).trim();
  if (
    !clean ||
    clean.startsWith('#') ||
    /^data:/i.test(clean) ||
    /^mailto:/i.test(clean) ||
    /^tel:/i.test(clean)
  ) {
    return null;
  }

  clean = clean.replace(/^%PUBLIC_URL%\//, '');

  if (/^https?:\/\//i.test(clean)) {
    let url;
    try {
      url = new URL(clean);
    } catch {
      return null;
    }

    if (!PUBLIC_HOSTS.has(url.hostname)) {
      return null;
    }

    clean = url.pathname;
  }

  clean = clean.split('?')[0].split('#')[0].replace(/^\/+/, '');

  if (!clean || !PUBLIC_ASSET_EXTENSIONS.test(clean)) {
    return null;
  }

  return clean;
}

function extractHtmlRefs(html) {
  const refs = [];
  const attrRegex = /\b(href|src|content|imagesrcset)=["']([^"']+)["']/gi;
  let match;

  while ((match = attrRegex.exec(html)) !== null) {
    const attr = match[1].toLowerCase();
    const value = match[2];

    if (attr === 'imagesrcset') {
      value.split(',').forEach(srcSetPart => {
        const src = srcSetPart.trim().split(/\s+/)[0];
        refs.push(src);
      });
    } else {
      refs.push(value);
    }
  }

  const sameHostUrlRegex = /https?:\/\/(?:www\.)?trbgmidway\.com\/([^"'\s<>)\\]+)/gi;
  while ((match = sameHostUrlRegex.exec(html)) !== null) {
    refs.push(match[0]);
  }

  return refs.map(normalizePublicRef).filter(Boolean);
}

function checkFiles(baseDir, paths) {
  const missing = [];
  for (const p of paths) {
    const fp = path.join(baseDir, p);
    if (!fs.existsSync(fp)) missing.push(p);
  }
  return missing;
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function main() {
  let exitCode = 0;
  const html = read(INDEX_HTML);
  const manifestStr = read(MANIFEST);

  if (!html) {
    console.error('Missing file:', INDEX_HTML);
    process.exit(2);
  }
  if (!manifestStr) {
    console.error('Missing file:', MANIFEST);
    process.exit(2);
  }

  const htmlRefs = extractHtmlRefs(html);

  // manifest icons
  let manifestIcons = [];
  try {
    const manifest = JSON.parse(manifestStr);
    if (Array.isArray(manifest.icons)) manifestIcons = manifest.icons.map(i => i.src).filter(Boolean);
    // also check splash_screens or similar keys if present
    if (Array.isArray(manifest.splash_screens)) manifestIcons.push(...manifest.splash_screens.map(s => s.src).filter(Boolean));
  } catch (e) {
    console.error('manifest.json parse error:', e.message);
    process.exit(2);
  }

  // common favicons to assert exist at public root
  const favicons = [
    'favicon-16x16.png',
    'favicon-32x32.png',
    'favicon.ico',
    'apple-touch-icon.png',
    'safari-pinned-tab.svg',
    'mstile-150x150.png'
  ];

  const allRefs = uniq([]
    .concat(htmlRefs, manifestIcons.map(normalizePublicRef).filter(Boolean), favicons)
    .sort());

  if (allRefs.length === 0) {
    console.log('No asset references found to check.');
    return;
  }

  console.log('Checking', allRefs.length, 'public asset references...');
  const missing = checkFiles(PUBLIC_DIR, allRefs);
  if (missing.length) {
    console.error('\nMissing public assets (referenced but not present):');
    missing.forEach(m => console.error('  -', m));
    exitCode = 3;
  } else {
    console.log('All referenced public assets exist.');
  }

  // Dimension checks for PNG/JPEG images with an expected size in the filename.
  const dimErrors = [];
  const imagesToCheck = allRefs.filter(ref => /\.(?:png|jpe?g)$/i.test(ref) && extractSizeFromFilename(ref));
  for (const ref of imagesToCheck) {
    const fp = path.join(PUBLIC_DIR, ref);
    if (!fs.existsSync(fp)) continue; // already reported missing
    const expected = extractSizeFromFilename(ref);
    if (!expected) continue;
    const dims = tryGetImageDimensions(fp);
    if (!dims) {
      dimErrors.push({ file: ref, error: 'unsupported or unreadable format' });
      continue;
    }
    if (dims.width !== expected.width || dims.height !== expected.height) {
      dimErrors.push({ file: ref, expected, actual: dims });
    }
  }

  if (dimErrors.length) {
    console.error('\nImage dimension mismatches:');
    dimErrors.forEach(e => {
      if (e.error) console.error('  -', e.file, ':', e.error);
      else console.error('  -', e.file, ': expected', e.expected.width + 'x' + e.expected.height, 'but is', e.actual.width + 'x' + e.actual.height);
    });
    exitCode = 4;
  }

  process.exit(exitCode);
}

if (require.main === module) main();

// --- helpers for dimensions ---
function extractSizeFromFilename(filename) {
  // tries to find WxH in filename like 2048x2732 or -2048x2732
  const m = filename.match(/(\d+)x(\d+)/);
  if (!m) return null;
  return { width: parseInt(m[1], 10), height: parseInt(m[2], 10) };
}

function tryGetImageDimensions(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const header = Buffer.alloc(24);
  try {
    fs.readSync(fd, header, 0, 24, 0);
    // PNG signature
    if (header.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
      // width: bytes 16-19, height: 20-23 big-endian
      const width = header.readUInt32BE(16);
      const height = header.readUInt32BE(20);
      return { width, height };
    }
    // JPEG: need to scan markers
    if (header[0] === 0xff && header[1] === 0xd8) {
      // scan through file to find SOF0/2 marker
      let pos = 2;
      const buf = Buffer.alloc(4);
      while (true) {
        const n = fs.readSync(fd, buf, 0, 4, pos);
        if (n < 4) break;
        if (buf[0] !== 0xff) break;
        const marker = buf[1];
        const size = buf.readUInt16BE(2);
        pos += 4;
        // SOF0(0xc0), SOF2(0xc2)
        if (marker === 0xc0 || marker === 0xc2) {
          const sof = Buffer.alloc(5);
          fs.readSync(fd, sof, 0, 5, pos);
          const height = sof.readUInt16BE(1);
          const width = sof.readUInt16BE(3);
          return { width, height };
        }
        pos += size - 2;
      }
      return null;
    }
    return null;
  } catch (e) {
    return null;
  } finally {
    fs.closeSync(fd);
  }
}
