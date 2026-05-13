import { API_BASE } from './config/api';

export function installApiFetchCredentials() {
  if (typeof window === 'undefined' || !window.fetch || window.__TRBG_API_FETCH_INSTALLED__) {
    return;
  }

  const origFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : (input && input.url);
      if (url && url.startsWith(API_BASE)) {
        if (!init || typeof init.credentials === 'undefined') {
          init = Object.assign({}, init, { credentials: 'include' });
        }
      }
    } catch {
      // Fall back to the default fetch behavior.
    }
    return origFetch(input, init);
  };
  window.__TRBG_API_FETCH_INSTALLED__ = true;
}
