/*
  MenuSection

  Purpose:
  - Render the public menu. Loads menu categories and items from the API and
  - allows expanding/collapsing categories with measured panel animations.

  Contract:
  - Expects GET /api/menu to return an array of categories with `items` arrays.
  - Reads `site-settings.menu_intro` for the description.

  Notes:
  - Uses stale-while-revalidate via `cachedFetch` to provide instant content
  -   with background refresh.
  - Panel expansion uses JS measurements to animate `max-height` smoothly.
*/
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { normalizeMenuCategory } from '../../utils/menuDisplay';
import MenuDisplay from './MenuDisplay';
import { getApiUrl } from '../../config/api';

export default function MenuSection() {
  const [categories, setCategories] = useState([]);
  const [siteMenuDescription, setSiteMenuDescription] = useState('');
  const [siteMenuHeading, setSiteMenuHeading] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const panelsRef = useRef({});

  const measurePanel = (id) => {
    const el = panelsRef.current[id];
    if (!el) return;
    // Only adjust if this panel is currently expanded
    if (Number(expandedCategory) === Number(id)) {
      el.style.maxHeight = `${el.scrollHeight}px`;
    }
  };

  const debugEnabled = typeof window !== 'undefined' ? (() => {
    try {
      return new URLSearchParams(window.location.search).has('debug');
    } catch (error) {
      return false;
    }
  })() : false;

  const buildApiUrl = useCallback((path) => {
    const base = getApiUrl(path);
    if (!debugEnabled) return base;
    return base.includes('?') ? `${base}&debug=1` : `${base}?debug=1`;
  }, [debugEnabled]);

  // fetch latest menu/settings directly from API
  useEffect(() => {
    let mounted = true;
    const menuController = new AbortController();
    const settingsController = new AbortController();

    async function loadMenu() {
      try {
        const res = await fetch(buildApiUrl('/menu'), {
          cache: 'no-store',
          signal: menuController.signal
        });
        if (!res.ok) throw new Error('Failed to fetch menu');
        const data = await res.json();
        if (!mounted) return;
        const normalized = (Array.isArray(data) ? data : []).map(normalizeMenuCategory);
        setCategories(normalized);
        setMenuLoaded(true);
      } catch (e) {
        if (mounted) {
          setCategories([]);
          setMenuLoaded(true);
        }
      }
    }

    async function loadSettings() {
      try {
        const res = await fetch(buildApiUrl('/settings'), {
          cache: 'no-store',
          signal: settingsController.signal
        });
        if (!res.ok) throw new Error('Failed to fetch settings');
        const payload = await res.json();
        if (!mounted) return;
        const settings = payload?.settings || {};
        setSiteMenuDescription(settings.menu_intro || '');
        setSiteMenuHeading(settings.menu_heading || '');
        setSettingsLoaded(true);
      } catch (e) {
        if (!mounted) return;
        setSiteMenuDescription('');
        setSiteMenuHeading('');
        setSettingsLoaded(true);
      }
    }

    loadMenu();
    loadSettings();

    return () => {
      mounted = false;
      menuController.abort();
      settingsController.abort();
    };
  }, [buildApiUrl]);

  // Animate panels to exact height using JS measurement
  useEffect(() => {
    Object.keys(panelsRef.current).forEach(key => {
      const el = panelsRef.current[key];
      if (!el) return;
      if (Number(key) === Number(expandedCategory)) {
        el.style.transition = `max-height var(--panel-transition-duration, 360ms) var(--panel-transition-easing, cubic-bezier(0.2,0.8,0.2,1)), opacity var(--panel-fade-duration,240ms) linear, transform var(--panel-transition-duration,360ms) var(--panel-transition-easing, cubic-bezier(0.2,0.8,0.2,1))`;
        const target = el.scrollHeight;
        el.style.maxHeight = `${target}px`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      } else {
        el.style.transition = `max-height var(--panel-transition-duration, 360ms) var(--panel-transition-easing, cubic-bezier(0.2,0.8,0.2,1)), opacity var(--panel-fade-duration,240ms) linear, transform var(--panel-transition-duration,360ms) var(--panel-transition-easing, cubic-bezier(0.2,0.8,0.2,1))`;
        el.style.maxHeight = `${el.scrollHeight}px`;
        // force reflow
        // eslint-disable-next-line no-unused-expressions
        el.offsetHeight;
        el.style.maxHeight = '0';
        el.style.opacity = '0';
        el.style.transform = 'translateY(-6px)';
      }
    });
  }, [expandedCategory, categories]);

  // Re-measure helper used by image load handlers and resize
  useEffect(() => {
    const onResize = () => {
      if (!expandedCategory) return;
      const el = panelsRef.current[expandedCategory];
      if (!el) return;
      // apply current scrollHeight
      el.style.maxHeight = `${el.scrollHeight}px`;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [expandedCategory]);

  return (
  <div id="menu" className="py-12 bg-surface-warm min-h-[960px] md:min-h-[1200px]">
      <MenuDisplay
        categories={categories}
        menuHeading={siteMenuHeading}
        menuIntro={siteMenuDescription}
        expandedCategory={expandedCategory}
        onToggleCategory={(id) => setExpandedCategory(prev => (prev === id ? null : id))}
        panelsRef={panelsRef}
        measurePanel={measurePanel}
        isLoaded={menuLoaded && settingsLoaded}
      />
    </div>
  );
}
