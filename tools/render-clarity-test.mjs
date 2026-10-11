// Live phone/laptop rendering, resize and sustained slow-frame feedback.
// Start Vite, then BROWSER_CHANNEL=chrome node tools/render-clarity-test.mjs.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined, args: ['--mute-audio'] });
try {
  for (const fixture of [
    { name: 'iPhone', quality: 'low', dpr: 3, mobile: true, sizes: [[390, 844], [844, 390]] },
    { name: 'laptop', quality: 'medium', dpr: 1, mobile: false, sizes: [[1920, 1080], [1366, 768]] },
    { name: 'low-tier laptop', quality: 'low', dpr: 1, mobile: false, sizes: [[1920, 1080]] },
  ]) {
    const context = await browser.newContext({ viewport: { width: fixture.sizes[0][0], height: fixture.sizes[0][1] },
      deviceScaleFactor: fixture.dpr, isMobile: fixture.mobile, hasTouch: fixture.mobile });
    try {
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      // Access the real frame-feedback function without adding a production test API.
      await page.route(/\/src\/main\.js(?:\?.*)?$/, async route => {
        const response = await route.fetch();
        const source = await response.text();
        assert.ok(source.includes('window.__dynres = () =>'));
        await route.fulfill({ response, body: source.replace('window.__dynres = () =>',
          'window.__clarityLoad = dt => dynamicResolution(dt);\nwindow.__dynres = () =>') });
      });
      await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5173/'}?autostart&quality=${fixture.quality}&gpuguard=0&nofs`);
      await page.waitForFunction(() => window.__sceneReady && !document.getElementById('loader'), null, { timeout: 120000 });
      assert.ok(await page.evaluate(() => typeof window.__clarityLoad === 'function'), 'frame-feedback test hook installed');
      await page.waitForFunction(() => {
        const q = window.__quality;
        const base = Math.min(devicePixelRatio, q.maxDpr, Math.sqrt(q.maxPixels / (innerWidth * innerHeight)));
        return window.__dynres().pixelRatio / window.__dynres().scale >= base - 1e-5;
      }, null, { timeout: 30000 });
      for (const [width, height] of fixture.sizes) {
        await page.setViewportSize({ width, height });
        await page.waitForFunction(({ width, height }) => window.__renderer.domElement.clientWidth === width &&
          window.__renderer.domElement.clientHeight === height, { width, height });
        const result = await page.evaluate(() => {
          const before = window.__dynres(), beforeEffects = window.__renderInfo();
          // Sustained 30fps feedback must not drive normal quality below the clarity floor.
          for (let i = 0; i < 1000; i++) window.__clarityLoad(1 / 30);
          const q = window.__quality, r = window.__renderer;
          return { before, ...window.__dynres(), css: [r.domElement.clientWidth, r.domElement.clientHeight],
            pixels: r.domElement.width * r.domElement.height, budget: q.maxPixels,
            contactBefore: beforeEffects.contactAO, contactAfter: window.__renderInfo().contactAO,
            shadow: window.__gpuGuard().shadowMap, signAtlas: q.signAtlas };
        });
        assert.deepEqual(result.css, [width, height]);
        assert.ok(result.before.pixelRatio >= 1 - 1e-6);
        assert.ok(result.pixelRatio >= 1 - 1e-6 && result.scale >= result.minScale - 1e-6, JSON.stringify(result));
        assert.ok(result.pixels <= result.budget);
        assert.equal(result.signAtlas, 1, 'full-size sign lettering');
        if (fixture.quality === 'medium') { assert.equal(result.shadow, 1024); assert.equal(result.contactAfter, false); }
        console.log(`PASS ${fixture.name} ${width}x${height}: density ${result.before.pixelRatio.toFixed(2)} -> ${result.pixelRatio.toFixed(2)} under load, within pixel budget`);
      }
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
