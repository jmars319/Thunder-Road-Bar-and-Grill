/*
  cachedFetch

  Purpose:
  - Small helper that fetches JSON and caches the parsed response in localStorage
    for a short TTL (default 5 minutes). Useful for stale-while-revalidate UX.

  Contract:
  - default export: async function cachedFetch(url, { ttl?: number, fetchOptions?: object }) -> parsed JSON | null
  - named exports: clearCacheFor(url), clearAllCache()

  Notes:
  - Returns null on network or parse failure to keep callers simple. Avoid using
    this for sensitive data (localStorage is not secure). TTL is in milliseconds.
*/

const DEFAULT_TTL = 300000; // 5 minutes

function safeKey(url) {
  return `cachedFetch:${url}`;
}

const inflightRequests = new Map();

export default async function cachedFetch(url, options = {}) {
  const ttl = typeof options.ttl === 'number' ? options.ttl : DEFAULT_TTL;
  const key = safeKey(url);

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.ts && Date.now() - parsed.ts < ttl) {
        return parsed.value;
      }
    }
  } catch (e) {
    // ignore localStorage parse errors
  }

  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(url, options.fetchOptions || {});
      if (!res.ok) return null;
      const data = await res.json();
      try {
        localStorage.setItem(key, JSON.stringify({ ts: Date.now(), value: data }));
      } catch (e) {
        // ignore storage quota errors
      }
      return data;
    } catch (e) {
      return null;
    } finally {
      inflightRequests.delete(key);
    }
  })();

  inflightRequests.set(key, fetchPromise);
  return fetchPromise;
}

// Clear cached entry for an exact URL
export function clearCacheFor(url) {
  try {
    localStorage.removeItem(safeKey(url));
  } catch (e) {}
}

// Clear all cachedFetch entries (useful for complete invalidation)
export function clearAllCache() {
  try {
    Object.keys(localStorage).forEach(k => {
      if (k && k.startsWith('cachedFetch:')) localStorage.removeItem(k);
    });
  } catch (e) {}
}
