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
