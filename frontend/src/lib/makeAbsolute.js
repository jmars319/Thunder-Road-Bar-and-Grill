/*
  makeAbsolute

  Purpose:
  - Convert a possibly-relative media/file URL into an absolute URL using the
    configured API base. Falls back to localhost API base during development.

  Contract:
  - export default function makeAbsolute(fileUrl: string) -> string

  Notes:
  - If `fileUrl` is already absolute (starts with http[s]), it is returned
    unchanged. Otherwise the function prepends the API origin (REACT_APP_API_BASE
    without the trailing `/api`). This helper is small and safe to call in both
    browser and test environments.
*/

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

export default function makeAbsolute(fileUrl) {
  if (!fileUrl) return '';
  // already absolute
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const base = API_BASE.replace(/\/api$/, '');
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
