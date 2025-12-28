/**
 * CLS Debugger (dev-only)
 *
 * Usage:
 *  - Automatically enabled when NODE_ENV !== 'production'
 *  - Force-enable anywhere (including production builds) by appending `?debugCls=1` to the URL
 *  - Open DevTools console; you'll see grouped logs whenever a layout shift >= 0.01 occurs
 *    or when the cumulative CLS crosses 0.05. Each entry lists the affected nodes plus
 *    their previous/current bounding boxes so you can pinpoint which element moved.
 *
 * Disable by removing the query flag or building for production.
 */

function shouldEnableDebug() {
  if (typeof window === 'undefined') return false;
  const isDev = process.env.NODE_ENV !== 'production';
  let forced = false;
  try {
    const params = new URLSearchParams(window.location.search);
    forced = params.has('debugCls');
  } catch (error) {
    forced = false;
  }
  return isDev || forced;
}

function nearestElement(node) {
  let current = node;
  while (current && current.nodeType !== Node.ELEMENT_NODE) {
    current = current.parentElement || current.parentNode || null;
  }
  return current && current.nodeType === Node.ELEMENT_NODE ? current : null;
}

function describeNode(node) {
  if (!node) return 'unknown node';
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = nearestElement(node);
    if (parent) {
      return `${parent.tagName.toLowerCase()}#text`;
    }
    return '#text';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return node.nodeName ? node.nodeName.toLowerCase() : 'node';
  }
  if (node.id) {
    return `${node.tagName.toLowerCase()}#${node.id}`;
  }
  const classList = Array.from(node.classList || []).slice(0, 3).join('.');
  return classList ? `${node.tagName.toLowerCase()}.${classList}` : node.tagName.toLowerCase();
}

function describeElementSelector(el) {
  if (!el) return '';
  if (el.id) return `#${el.id}`;
  const testId = el.getAttribute && el.getAttribute('data-testid');
  if (testId) return `[data-testid="${testId}"]`;
  const aria = el.getAttribute && el.getAttribute('aria-label');
  if (aria) return `[aria-label="${aria.slice(0, 40)}"]`;
  const cls = Array.from(el.classList || []).slice(0, 2).join('.');
  return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
}

function formatRect(rect) {
  if (!rect) return {};
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

function clampToViewport(value, max) {
  if (Number.isNaN(value)) return null;
  return Math.min(Math.max(value, 0), Math.max(0, max - 1));
}

function probeElementFromRect(rect) {
  if (!rect || typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') {
    return null;
  }
  const centerX = rect.x + (rect.width || 0) / 2;
  const centerY = rect.y + (rect.height || 0) / 2;
  const safeX = clampToViewport(centerX, window.innerWidth || 0);
  const safeY = clampToViewport(centerY, window.innerHeight || 0);
  if (safeX === null || safeY === null) return null;
  try {
    return document.elementFromPoint(safeX, safeY);
  } catch (error) {
    return null;
  }
}

function describeAncestry(el, depth = 3) {
  const list = [];
  let current = el;
  let count = 0;
  while (current && count < depth) {
    const selector = describeElementSelector(current);
    if (selector) {
      list.push(selector);
    }
    current = current.parentElement;
    count += 1;
  }
  return list;
}

function captureRootSnapshot(tag = 'snapshot') {
  if (typeof window === 'undefined' || !document?.documentElement || !document?.body) {
    return null;
  }
  const docEl = document.documentElement;
  const body = document.body;
  const htmlStyle = window.getComputedStyle(docEl);
  const bodyStyle = window.getComputedStyle(body);
  const snapshot = {
    tag,
    timestamp: performance.now(),
    route: window.location?.pathname || '/',
    html: {
      overflow: htmlStyle.overflow,
      overflowX: htmlStyle.overflowX,
      overflowY: htmlStyle.overflowY,
      scrollbarGutter: htmlStyle.scrollbarGutter,
      margin: htmlStyle.margin,
      padding: htmlStyle.padding,
      clientWidth: Math.round(docEl.clientWidth),
      clientHeight: Math.round(docEl.clientHeight),
      scrollHeight: Math.round(docEl.scrollHeight)
    },
    body: {
      overflow: bodyStyle.overflow,
      overflowX: bodyStyle.overflowX,
      overflowY: bodyStyle.overflowY,
      scrollbarGutter: bodyStyle.scrollbarGutter,
      margin: bodyStyle.margin,
      padding: bodyStyle.padding,
      clientWidth: Math.round(body.clientWidth),
      clientHeight: Math.round(body.clientHeight),
      scrollHeight: Math.round(body.scrollHeight)
    },
    window: {
      innerWidth: Math.round(window.innerWidth),
      innerHeight: Math.round(window.innerHeight)
    }
  };
  snapshot.meta = {
    htmlHasVerticalScrollbar: snapshot.html.scrollHeight > snapshot.html.clientHeight,
    bodyHasVerticalScrollbar: snapshot.body.scrollHeight > snapshot.html.clientHeight
  };
  return snapshot;
}

function diffSnapshots(prevSnapshot, nextSnapshot) {
  if (!prevSnapshot || !nextSnapshot) return {};
  const diff = {};
  const compare = (prevObj, nextObj, prefix = '') => {
    const keys = new Set([
      ...Object.keys(prevObj || {}),
      ...Object.keys(nextObj || {})
    ]);
    keys.forEach((key) => {
      const prevVal = prevObj ? prevObj[key] : undefined;
      const nextVal = nextObj ? nextObj[key] : undefined;
      const path = prefix ? `${prefix}.${key}` : key;
      if (prevVal && typeof prevVal === 'object' && !Array.isArray(prevVal)
        && nextVal && typeof nextVal === 'object' && !Array.isArray(nextVal)) {
        compare(prevVal, nextVal, path);
      } else if (prevVal !== nextVal) {
        diff[path] = { previous: prevVal, next: nextVal };
      }
    });
  };
  compare(prevSnapshot, nextSnapshot);
  return diff;
}

function logSnapshot(label, snapshot, diff) {
  if (!snapshot) return;
  // eslint-disable-next-line no-console
  console.log(`[CLS Debug] root snapshot: ${label}`, snapshot);
  if (diff && Object.keys(diff).length) {
    // eslint-disable-next-line no-console
    console.log('[CLS Debug] root snapshot diff', diff);
  }
}

function initRootSnapshotSchedule() {
  const captureAndStore = (label) => {
    const snap = captureRootSnapshot(label);
    if (snap) {
      const diff = diffSnapshots(lastRootSnapshot, snap);
      logSnapshot(label, snap, diff);
      lastRootSnapshot = snap;
    }
  };
  captureAndStore('init');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => captureAndStore('domcontentloaded'), { once: true });
  } else {
    captureAndStore('domcontentloaded');
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => captureAndStore('window-load'), { once: true });
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => captureAndStore('first-raf'));
    }
  }
}

function startOverflowWatch() {
  if (typeof MutationObserver === 'undefined' || overflowObserver || !document?.body || !document?.documentElement) return;
  const targets = [document.documentElement, document.body];
  const cache = new WeakMap();
  const captureStyles = (el) => {
    const styles = window.getComputedStyle(el);
    return {
      overflow: styles.overflow,
      overflowX: styles.overflowX,
      overflowY: styles.overflowY,
      scrollbarGutter: styles.scrollbarGutter
    };
  };
  targets.forEach((el) => cache.set(el, captureStyles(el)));
  overflowObserver = new MutationObserver(() => {
    targets.forEach((el) => {
      const latest = captureStyles(el);
      const prev = cache.get(el) || {};
      if (
        latest.overflow !== prev.overflow
        || latest.overflowX !== prev.overflowX
        || latest.overflowY !== prev.overflowY
        || latest.scrollbarGutter !== prev.scrollbarGutter
      ) {
        // eslint-disable-next-line no-console
        console.warn('[CLS Debug] overflow mutation', {
          target: el === document.documentElement ? 'html' : 'body',
          previous: prev,
          next: latest,
          stack: new Error().stack
        });
        cache.set(el, latest);
      }
    });
  });
  targets.forEach((el) => overflowObserver.observe(el, { attributes: true, attributeFilter: ['style', 'class'] }));
}

let observer;
let overflowObserver;
let lastRootSnapshot = null;
let lastViewportSnapshot = null;
let viewportLoggingStarted = false;

function captureViewportSnapshot(label = 'event') {
  if (typeof window === 'undefined' || !document?.documentElement || !document?.body) return null;
  const docEl = document.documentElement;
  const body = document.body;
  const vv = window.visualViewport || null;
  return {
    label,
    timestamp: performance.now(),
    route: window.location?.pathname || '/',
    window: {
      innerWidth: Math.round(window.innerWidth),
      innerHeight: Math.round(window.innerHeight)
    },
    html: {
      clientWidth: Math.round(docEl.clientWidth),
      clientHeight: Math.round(docEl.clientHeight)
    },
    body: {
      clientWidth: Math.round(body.clientWidth),
      clientHeight: Math.round(body.clientHeight)
    },
    devicePixelRatio: window.devicePixelRatio,
    visualViewport: vv
      ? {
        width: Math.round(vv.width),
        height: Math.round(vv.height),
        scale: vv.scale
      }
      : null
  };
}

function extractWidthMetrics(snapshot) {
  if (!snapshot) return null;
  return {
    windowInnerWidth: snapshot.window?.innerWidth ?? null,
    htmlClientWidth: snapshot.html?.clientWidth ?? null,
    bodyClientWidth: snapshot.body?.clientWidth ?? null,
    visualViewportWidth: snapshot.visualViewport ? snapshot.visualViewport.width : null
  };
}

function analyzeWidthDelta(prevSnapshot, nextSnapshot) {
  const prev = extractWidthMetrics(prevSnapshot);
  const next = extractWidthMetrics(nextSnapshot);
  if (!prev || !next) {
    return { changed: false, deltas: {} };
  }
  const deltas = {};
  let changed = false;
  Object.keys(next).forEach((key) => {
    const prevVal = prev[key];
    const nextVal = next[key];
    if (typeof prevVal === 'number' && typeof nextVal === 'number' && prevVal !== nextVal) {
      deltas[key] = { previous: prevVal, next: nextVal };
      changed = true;
    }
  });
  return { changed, deltas };
}

function logViewportEvent(label, extra = {}) {
  const snapshot = captureViewportSnapshot(label);
  if (!snapshot) return;
  const delta = analyzeWidthDelta(lastViewportSnapshot, snapshot);
  lastViewportSnapshot = snapshot;
  // eslint-disable-next-line no-console
  console.log('[CLS Debug] viewport event', {
    label,
    snapshot,
    widthChanged: delta.changed,
    widthDelta: delta.deltas,
    extra
  });
}

function initViewportEventLogging() {
  if (viewportLoggingStarted || typeof window === 'undefined') return;
  viewportLoggingStarted = true;
  logViewportEvent('init');
  window.addEventListener('resize', () => logViewportEvent('window-resize'));
  document.addEventListener('visibilitychange', () => logViewportEvent(`visibility:${document.visibilityState}`));
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => logViewportEvent('visualViewport-resize'));
    window.visualViewport.addEventListener('scroll', () => logViewportEvent('visualViewport-scroll'));
  }
}

export function initClsDebug() {
  if (!shouldEnableDebug()) return;
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;
  if (observer) return;

  initRootSnapshotSchedule();
  initViewportEventLogging();
  startOverflowWatch();

  let cumulative = 0;
  observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      cumulative += entry.value;
      if (entry.value < 0.01 && cumulative < 0.05) continue;
      const beforeSnapshot = captureRootSnapshot('before-shift');
      if (beforeSnapshot) {
        const beforeDiff = diffSnapshots(lastRootSnapshot, beforeSnapshot);
        logSnapshot('before-shift', beforeSnapshot, beforeDiff);
        const widthChange = analyzeWidthDelta(lastRootSnapshot, beforeSnapshot);
        if (widthChange.changed) {
          // eslint-disable-next-line no-console
          console.warn('[CLS Debug] LIKELY VIEWPORT CHANGE detected near shift', widthChange.deltas);
        }
      }
      const header = `[CLS Debug][${window.location?.pathname || '/'}] shift=${entry.value.toFixed(4)} cumulative=${cumulative.toFixed(4)}`;
      // eslint-disable-next-line no-console
      console.groupCollapsed(header);
      (entry.sources || []).forEach((source, index) => {
        const rawNode = source?.node || null;
        const element = nearestElement(rawNode);
        const descriptor = describeNode(rawNode);
        const selector = describeElementSelector(element);
        const rectSnapshot = {
          previousRect: formatRect(source?.previousRect),
          currentRect: formatRect(source?.currentRect)
        };
        // eslint-disable-next-line no-console
        console.log(
          `source ${index + 1}: ${descriptor}${selector ? ` -> ${selector}` : ''}`,
          {
            elementTag: element?.tagName?.toLowerCase() || null,
            elementId: element?.id || null,
            elementClasses: element ? Array.from(element.classList || []) : [],
            ...rectSnapshot
          }
        );
        if (!element) {
          const probeTarget = probeElementFromRect(source?.currentRect || source?.previousRect);
          if (probeTarget) {
            const ancestry = describeAncestry(probeTarget, 5);
            // eslint-disable-next-line no-console
            console.log('[CLS Debug] probed elementFromPoint', {
              primary: describeElementSelector(probeTarget),
              ancestry
            });
          }
        }
      });
      const afterSnapshot = captureRootSnapshot('after-shift');
      if (afterSnapshot) {
        const diff = diffSnapshots(beforeSnapshot, afterSnapshot);
        logSnapshot('after-shift', afterSnapshot, diff);
        lastRootSnapshot = afterSnapshot;
      }
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  });
  observer.observe({ type: 'layout-shift', buffered: true });
  // eslint-disable-next-line no-console
  console.info('[CLS Debug] Layout shift logging enabled. Add ?debugCls=1 to force on production builds.');
}
