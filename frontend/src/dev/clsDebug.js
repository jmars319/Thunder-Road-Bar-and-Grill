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

let observer;

export function initClsDebug() {
  if (!shouldEnableDebug()) return;
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;
  if (observer) return;

  let cumulative = 0;
  observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      cumulative += entry.value;
      if (entry.value < 0.01 && cumulative < 0.05) continue;
      const header = `[CLS Debug][${window.location?.pathname || '/'}] shift=${entry.value.toFixed(4)} cumulative=${cumulative.toFixed(4)}`;
      // eslint-disable-next-line no-console
      console.groupCollapsed(header);
      (entry.sources || []).forEach((source, index) => {
        const rawNode = source?.node || null;
        const element = nearestElement(rawNode);
        const descriptor = describeNode(rawNode);
        const selector = describeElementSelector(element);
        // eslint-disable-next-line no-console
        console.log(
          `source ${index + 1}: ${descriptor}${selector ? ` -> ${selector}` : ''}`,
          {
            elementTag: element?.tagName?.toLowerCase() || null,
            elementId: element?.id || null,
            elementClasses: element ? Array.from(element.classList || []) : [],
            previousRect: formatRect(source?.previousRect),
            currentRect: formatRect(source?.currentRect)
          }
        );
      });
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  });
  observer.observe({ type: 'layout-shift', buffered: true });
  // eslint-disable-next-line no-console
  console.info('[CLS Debug] Layout shift logging enabled. Add ?debugCls=1 to force on production builds.');
}
