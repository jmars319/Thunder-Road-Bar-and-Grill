#!/usr/bin/env node
/* eslint-disable no-console */
const { chromium } = require('playwright');

const BASE_URL = process.env.CLS_BASE_URL || 'http://localhost:3000';
const RAW_PATHS = process.env.CLS_PATHS || '/?debugCls=1';
const PATHS = RAW_PATHS.split(',').map((p) => p.trim()).filter(Boolean);
const DW_THROUGHPUT = Number(process.env.CLS_DOWNLOAD_BPS) || 50 * 1024; // bytes/sec (~400 kbps)
const UP_THROUGHPUT = Number(process.env.CLS_UPLOAD_BPS) || 50 * 1024;
const LATENCY = Number(process.env.CLS_LATENCY_MS) || 400;
const CPU_THROTTLE_RATE = Number(process.env.CLS_CPU_RATE) || 4;
const DWELL_MS = Number(process.env.CLS_DWELL_MS) || 15000;

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

async function runPath(browser, path) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
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
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(DWELL_MS);
  } catch (error) {
    console.error(`[CLS Debug] Failed to load ${url}`, error.message);
  }

  await context.close();
  return { path, url, ...parseClsLogs(logs) };
}

(async () => {
  if (!PATHS.length) {
    console.error('No CLS paths configured');
    process.exit(1);
  }
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const path of PATHS) {
    /* eslint-disable no-await-in-loop */
    const result = await runPath(browser, path);
    results.push(result);
  }
  await browser.close();

  console.log('=== CLS Headless Summary ===');
  results.forEach((res) => {
    console.log(`Path: ${res.path}`);
    console.log(`  URL: ${res.url}`);
    console.log(`  Cumulative CLS: ${res.cumulative ?? 'n/a'}`);
    if (res.viewportWarnings.length) {
      console.log('  Viewport warnings:');
      res.viewportWarnings.forEach((line) => console.log(`    ${line}`));
    }
    if (!res.viewportWarnings.length) {
      console.log('  Viewport warnings: none');
    }
  });
  process.exit(0);
})();
