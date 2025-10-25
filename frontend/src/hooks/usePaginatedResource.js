import { useState, useEffect, useRef, useCallback } from 'react';

/*
  usePaginatedResource

  Purpose:
  - Small hook to fetch paginated resources with optional infinite-scroll
    sentinel support (IntersectionObserver). Returns items, loading state,
    total count and helper methods to fetch/reset.

  Contract:
  - Input: baseUrl (string) - a URL that will be queried with `limit` and `offset` query params.
           options: { limit?: number }
  - Output: { items, loading, error, total, sentinelRef, fetchPage, reset }

  Notes:
  - Expects the server to return a JSON array and optionally set `X-Total-Count`
    header for total item count. The hook appends `&limit=...&offset=...` to the
    provided baseUrl when fetching pages.
*/
// Simple paginated fetch hook with optional infinite-scroll sentinel support.
// - fetcher(url) should behave like window.fetch
// - options: { limit }
export default function usePaginatedResource(baseUrl, { limit = 24 } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(null);
  const offsetRef = useRef(0);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  const fetchPage = useCallback(async (offset = 0, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}&limit=${limit}&offset=${offset}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const totalHeader = res.headers.get('X-Total-Count');
      setTotal(totalHeader ? parseInt(totalHeader, 10) : null);
      const data = await res.json();
      setItems(prev => append ? [...prev, ...(Array.isArray(data) ? data : [])] : (Array.isArray(data) ? data : []));
      offsetRef.current = offset + limit;
    } catch (err) {
      setError(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, limit]);

  const reset = useCallback(() => {
    offsetRef.current = 0;
    setItems([]);
    setTotal(null);
  }, []);

  useEffect(() => {
    // wire intersection observer for infinite scroll
    if (!sentinelRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && total !== null && items.length < total && !loading) {
          // fetch next page
          fetchPage(items.length, true);
        }
      });
    }, { root: null, rootMargin: '200px', threshold: 0.1 });
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current && observerRef.current.disconnect();
  }, [sentinelRef, total, items.length, loading, fetchPage]);

  return {
    items,
    loading,
    error,
    total,
    sentinelRef,
    fetchPage,
    reset,
  };
}
