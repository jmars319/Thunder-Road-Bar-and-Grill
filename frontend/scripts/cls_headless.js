#!/usr/bin/env node
/* eslint-disable no-console */
const { chromium } = require('playwright');

const BASE_URL = process.env.CLS_BASE_URL || 'http://localhost:3204';
const RAW_PATHS = process.env.CLS_PATHS || '/?debugCls=1';
const PATHS = RAW_PATHS.split(',').map((p) => p.trim()).filter(Boolean);
const DW_THROUGHPUT = Number(process.env.CLS_DOWNLOAD_BPS) || 50 * 1024; // bytes/sec (~400 kbps)
const UP_THROUGHPUT = Number(process.env.CLS_UPLOAD_BPS) || 50 * 1024;
const LATENCY = Number(process.env.CLS_LATENCY_MS) || 400;
const CPU_THROTTLE_RATE = Number(process.env.CLS_CPU_RATE) || 4;
const DWELL_MS = Number(process.env.CLS_DWELL_MS) || 15000;
const MENU_TIMEOUT_MS = Number(process.env.CLS_MENU_TIMEOUT_MS) || 10000;
const RAW_COLOR_SCHEME = (process.env.CLS_COLOR_SCHEME || 'dark').toLowerCase();
const SUPPORTED_SCHEMES = new Set(['dark', 'light', 'no-preference']);
const COLOR_SCHEME = SUPPORTED_SCHEMES.has(RAW_COLOR_SCHEME) ? RAW_COLOR_SCHEME : 'dark';

function parseClsLogs(logs) {
  const summary = {
    cumulative: null,
    viewportWarnings: [],
    entries: []
  };
  logs.forEach((line) => {
    if (line.includes('[CLS Debug][') && line.includes('cumulative=')) {
      const match = line.match(/cumulative=([0-9.]+)/);
      if (match) {
        summary.cumulative = parseFloat(match[1]);
        summary.entries.push(line);
      }
    }
    if (line.includes('LIKELY VIEWPORT CHANGE')) {
      summary.viewportWarnings.push(line);
    }
  });
  return summary;
}

function evaluateMenuContrast(page) {
  return page.evaluate(() => {
    const card = document.querySelector('.menu-card');
    if (!card) {
      return { ok: false, ratio: null, error: 'Menu card not found' };
    }
    const heading = card.querySelector('h3') || card;
    const parseColor = (input) => {
      if (!input) return null;
      const match = input.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const [r, g, b] = match[1].split(',').slice(0, 3).map((part) => Number(part.trim()));
      if ([r, g, b].some((val) => Number.isNaN(val))) return null;
      return [r, g, b];
    };
    const srgbChannel = (value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    };
    const luminance = (rgb) => {
      const [r, g, b] = rgb.map(srgbChannel);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const bgColor = window.getComputedStyle(card).backgroundColor;
    const textColor = window.getComputedStyle(heading).color;
    const bg = parseColor(bgColor);
    const fg = parseColor(textColor);
    if (!bg || !fg) {
      return { ok: false, ratio: null, error: 'Unable to parse computed colors', colors: { textColor, backgroundColor: bgColor } };
    }
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = (lighter + 0.05) / (darker + 0.05);
    return {
      ok: ratio >= 4.5,
      ratio: Number(ratio.toFixed(2)),
      colors: { textColor, backgroundColor: bgColor }
    };
  });
}

async function runPath(browser, path) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: COLOR_SCHEME
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: LATENCY,
    downloadThroughput: DW_THROUGHPUT,
    uploadThroughput: UP_THROUGHPUT
  });
  await client.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE_RATE });

  const logs = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('[CLS Debug]')) {
      logs.push(text);
    }
  });

  const url = `${BASE_URL}${path}`;
  let menuCheck = null;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('#menu', { timeout: MENU_TIMEOUT_MS });
    await page.waitForTimeout(DWELL_MS);
    menuCheck = await evaluateMenuContrast(page);
  } catch (error) {
    const message = error && error.message ? error.message : 'Unknown error';
    menuCheck = { ok: false, ratio: null, error: message };
  }

  await context.close();
  return { path, url, menuCheck, ...parseClsLogs(logs) };
}

(async () => {
  if (!PATHS.length) {
    console.error('No CLS paths configured');
    process.exit(1);
  }
  const browser = await chromium.launch({ headless: true });
  const results = [];
  console.log(`=== CLS Headless Summary (color scheme: ${COLOR_SCHEME}) ===`);
  for (const path of PATHS) {
    /* eslint-disable no-await-in-loop */
    const result = await runPath(browser, path);
    results.push(result);
  }
  await browser.close();

  let hasContrastFailure = false;
  results.forEach((res) => {
    console.log(`Path: ${res.path}`);
    console.log(`  URL: ${res.url}`);
    console.log(`  Cumulative CLS: ${res.cumulative ?? 'n/a'}`);
    if (res.menuCheck) {
      if (res.menuCheck.error) {
        console.log(`  Menu contrast: ERROR (${res.menuCheck.error})`);
        hasContrastFailure = true;
      } else {
        console.log(`  Menu contrast ratio: ${res.menuCheck.ratio} (${res.menuCheck.ok ? 'pass' : 'FAIL'})`);
        if (!res.menuCheck.ok) {
          hasContrastFailure = true;
        }
      }
    }
    if (res.viewportWarnings.length) {
      console.log('  Viewport warnings:');
      res.viewportWarnings.forEach((line) => console.log(`    ${line}`));
    }
    if (!res.viewportWarnings.length) {
      console.log('  Viewport warnings: none');
    }
  });
  process.exit(hasContrastFailure ? 1 : 0);
})();
