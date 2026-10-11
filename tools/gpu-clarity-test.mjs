// Deterministic GPU feedback: ordinary slow frames reduce effects first; timeout risk
// can still reduce resolution. Start Vite, then BROWSER_CHANNEL=chrome node this file.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined, args: ['--mute-audio'] });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // Feed only the app's synthetic GPU timings, independent of the test machine's GPU.
  await page.route(/\/src\/renderer\/gpu-timer\.js(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript', body: 'export function createGpuTimer() { return { begin() {}, end() {}, poll() { return []; } }; }',
  }));
  await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5173/'}?autostart&quality=medium&dynres=0&nofs`);
  await page.waitForFunction(() => window.__sceneReady && !document.getElementById('loader') && window.__dynres().pixelRatio === 1, null, { timeout: 120000 });
  assert.ok(await page.evaluate(() => window.__renderInfo().contactAO));
  await page.evaluate(() => window.__gpuGuardFake(60, 60, 60));
  await page.waitForFunction(() => window.__gpuGuard().drops.length === 1);
  const slow = await page.evaluate(() => ({ ...window.__dynres(), ...window.__gpuGuard(), contact: window.__renderInfo().contactAO }));
  assert.equal(slow.scale, 1, 'ordinary GPU load preserves density while effects can be reduced');
  assert.equal(slow.shadowMap, 1024);
  assert.equal(slow.contact, false);
  await page.evaluate(() => window.__gpuGuardFake(300));
  await page.waitForFunction(() => window.__gpuGuard().drops.length === 2);
  const emergency = await page.evaluate(() => window.__dynres());
  assert.equal(emergency.scale, 0.9, 'timeout risk can go below the ordinary clarity floor');
  assert.ok(emergency.scale < emergency.minScale);
  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForFunction(() => window.__renderer.domElement.clientWidth === 900 && window.__dynres().scale === 1);
  assert.deepEqual(errors, []);
  assert.ok(!(await page.evaluate(() => window.__contextLost)));
  console.log('PASS GPU effects-first fallback, emergency resolution reduction and clarity restoration on resize');
} finally { await browser.close(); }
