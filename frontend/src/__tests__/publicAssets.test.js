/*
  publicAssets.test.js

  Purpose:
  - Sanity checks for public/ assets referenced by `index.html` and
    `site.webmanifest` to ensure required images exist in the `public/` folder.

  Notes:
  - Keeps the runtime public folder consistent for builds and deployment.
*/
/* eslint-env jest, node */
/* global require, __dirname, it, describe, expect */
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const INDEX_HTML = path.join(PUBLIC_DIR, 'index.html');
const MANIFEST = path.join(PUBLIC_DIR, 'manifest.json');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function findMatches(content, regex) {
  const set = new Set();
  let m;
  while ((m = regex.exec(content)) !== null) set.add(m[1]);
  return Array.from(set);
}

function checkExistence(paths) {
  const missing = [];
  for (const p of paths) {
    const clean = p.replace(/^%PUBLIC_URL%\//, '');
    const fp = path.join(PUBLIC_DIR, clean);
    if (!fs.existsSync(fp)) missing.push(clean);
  }
  return missing;
}

describe('public assets', () => {
  it('index.html and manifest exist', () => {
    expect(fs.existsSync(INDEX_HTML)).toBe(true);
    expect(fs.existsSync(MANIFEST)).toBe(true);
  });

  it('referenced OG images exist under public/og', () => {
    const html = read(INDEX_HTML);
    const manifest = read(MANIFEST);
    const ogRegex = /%PUBLIC_URL%\/([\w\-\/]+og[\w\-]*\.png)/g;
    const matches = findMatches(html + '\n' + manifest, ogRegex);
    const missing = checkExistence(matches);
    expect(missing).toEqual([]);
  });

  it('referenced apple-splash images exist under public/splash', () => {
    const html = read(INDEX_HTML);
    const splashRegex = /%PUBLIC_URL%\/([\w\-\/]*apple-splash[\w\-]*-?\d+x\d+\.png)/g;
    const matches = findMatches(html, splashRegex);
    const missing = checkExistence(matches);
    expect(missing).toEqual([]);
  });

  it('manifest icons and favicons exist', () => {
    const manifest = JSON.parse(read(MANIFEST));
    const iconSrcs = (manifest.icons || []).map(i => i.src || '').filter(Boolean);
    // common favicons to check
    const faviconFiles = [
      'favicon-16x16.png',
      'favicon-32x32.png',
      'favicon.ico',
      'apple-touch-icon.png'
    ];
    const all = [...iconSrcs, ...faviconFiles];
    const missing = checkExistence(all);
    expect(missing).toEqual([]);
  });
});
