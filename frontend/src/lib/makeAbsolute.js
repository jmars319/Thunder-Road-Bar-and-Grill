/*
  makeAbsolute - utility to normalize relative paths to absolute URLs

  Purpose:
  - Converts relative paths (e.g. '/uploads/image.png') to full URLs using
    the configured API_BASE origin. This ensures images and uploads reference
    the correct backend origin when the app is deployed.

  Usage:
  - import makeAbsolute from './makeAbsolute';
  - const fullUrl = makeAbsolute('/uploads/hero.jpg');
    // => 'http://localhost:3304/uploads/hero.jpg'

  Notes:
  - The function checks whether the path is already absolute. If yes, returns
    unchanged. Otherwise the function prepends the API origin (REACT_APP_API_BASE
    without the /api suffix).
*/

import { getApiOrigin } from '../config/api';

export default function makeAbsolute(fileUrl) {
  if (!fileUrl) return '';
  // already absolute
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const base = getApiOrigin();
  return base + (fileUrl.startsWith('/') ? fileUrl : '/' + fileUrl);
}

// CommonJS fallback for Node/Jest tests that use require()
try {
  // `module` may be undefined in browser bundlers; allow the typeof check but
  // suppress eslint's no-undef for this one-line CommonJS fallback.
  // eslint-disable-next-line no-undef
  if (typeof module !== 'undefined' && module.exports) module.exports = makeAbsolute;
} catch (e) {
  // ignore in browsers
}
