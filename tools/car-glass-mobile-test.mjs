// Browser checks for usable phone/tablet layouts. Glass and grips: car-cockpit-test.mjs.
// Start npm run dev, then node tools/car-glass-mobile-test.mjs.
// BROWSER_CHANNEL=chrome uses an installed Chrome instead of Playwright's Chromium.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium, devices } from 'playwright';

const url = process.env.SHOT_URL || 'http://127.0.0.1:5173/';
const out = 'shots/glass-mobile';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined, args: ['--mute-audio', '--ignore-gpu-blocklist'] });
const names = process.argv.slice(2).length ? process.argv.slice(2) : ['iPhone SE', 'iPhone 13', 'Pixel 7', 'iPad (gen 7)'];
try {
  for (const name of names) {
    const device = devices[name];
    assert.ok(device, `Unknown device ${name}`);
    const context = await browser.newContext({ ...device });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    const response = await page.goto(`${url}?nofs`);
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => window.__sceneReady === true && !document.getElementById('loader'), null, { timeout: 120000 });
    const caption = await page.locator('#overlay .caption').boundingBox();
    const size = page.viewportSize();
    assert.ok(caption.x >= 0 && caption.y >= 0 && caption.x + caption.width <= size.width && caption.y + caption.height <= size.height, `${name}: start instructions fit`);
    await page.touchscreen.tap(size.width / 2, size.height / 2);
    await page.waitForTimeout(500);
    assert.ok(await page.evaluate(() => window.__touch.enabled && window.__walker.active), `${name}: tap starts the scene`);
    assert.ok(await page.locator('#touch .cam').evaluate(el => el.classList.contains('show')), `${name}: walking camera button available`);
    await page.locator('#touch .cam').tap();
    assert.ok(await page.evaluate(() => window.__avatar.enabled && window.__walker.third), `${name}: camera switches to third person`);
    await page.locator('#touch .cam').tap();
    assert.ok(await page.evaluate(() => window.__vehicles.mount('car')));
    await page.waitForTimeout(2200);
    const cdp = await context.newCDPSession(page);
    const touch = (type, points = []) => cdp.send('Input.dispatchTouchEvent', {
      type, touchPoints: points.map(([x, y, id]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 1 })),
    });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    for (const [orientation, width, height] of [['portrait', size.width, size.height], ['landscape', size.height, size.width]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        const v = window.__vehicles.current;
        window.__walker.yaw = v.yaw;
        window.__walker.pitch = -0.12;
      });
      await page.locator('#touch .radio').tap();
      await page.waitForTimeout(200);
      const state = await page.evaluate(() => {
        const boxes = [...document.querySelectorAll('#touch button, #drive-hud, #minimap, #radio-card')].filter(el => {
          const css = getComputedStyle(el);
          return css.visibility !== 'hidden' && Number(css.opacity) > 0.5;
        }).map(el => {
          const r = el.getBoundingClientRect();
          return { name: el.id || el.className, x: r.x, y: r.y, w: r.width, h: r.height, button: el.tagName === 'BUTTON' };
        });
        return { boxes, fov: window.__camera.fov, aspect: window.__camera.aspect,
          canvas: [window.__renderer.domElement.clientWidth, window.__renderer.domElement.clientHeight],
          pixels: window.__renderer.domElement.width * window.__renderer.domElement.height,
          budget: window.__quality.maxPixels, tier: window.__quality.tier, shadowMap: window.__quality.shadowMap };
      });
      assert.deepEqual(state.canvas, [width, height], `${name}: canvas follows orientation`);
      assert.ok(state.pixels <= state.budget, `${name}: render pixel budget`);
      if (!name.startsWith('iPad')) {
        assert.equal(state.tier, 'low');
        assert.deepEqual(state.shadowMap, [1024, 1024]);
      }
      if (width < height) {
        const horizontal = 2 * Math.atan(Math.tan(state.fov * Math.PI / 360) * state.aspect) * 180 / Math.PI;
        assert.ok(horizontal >= 44, `${name}: useful portrait field of view`);
      }
      else assert.ok(state.fov < 65, `${name}: landscape framing restored`);
      for (const box of state.boxes) {
        assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.w <= width + 1 && box.y + box.h <= height + 1, `${name} ${orientation}: ${box.name} fits ${JSON.stringify(box)}`);
        if (box.button) assert.ok(box.w >= 44 && box.h >= 44, `${name}: ${box.name} touch target`);
      }
      for (let i = 0; i < state.boxes.length; i++) for (let j = i + 1; j < state.boxes.length; j++) {
        const a = state.boxes[i], b = state.boxes[j];
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        assert.ok(!overlap, `${name} ${orientation}: ${a.name} overlaps ${b.name}`);
      }
      // Rotation must cancel both a held brake and a displaced joystick.
      const brake = await page.locator('#touch .jump').boundingBox();
      await touch('touchStart', [[width * 0.15, height * 0.75, 1]]);
      await touch('touchMove', [[width * 0.15, height * 0.75 - 45, 1]]);
      await touch('touchStart', [[width * 0.15, height * 0.75 - 45, 1], [brake.x + brake.width / 2, brake.y + brake.height / 2, 2]]);
      assert.ok(await page.evaluate(() => window.__walker.brakeHeld && window.__touch.stick.y > 0.5));
      await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
      assert.ok(await page.evaluate(() => !window.__walker.brakeHeld && Math.hypot(window.__touch.stick.x, window.__touch.stick.y) === 0));
      await touch('touchEnd');
      await page.screenshot({ path: `${out}/${slug}-${orientation}.png`, scale: 'css' });
      console.log(`PASS ${name} ${orientation}: camera, pixel budget, HUD, touch targets and rotation`);
    }
    assert.deepEqual(errors, [], `${name}: no browser errors`);
    await context.close();
  }
} finally { await browser.close(); }
