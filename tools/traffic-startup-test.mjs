// Live-scene startup checks with the shipped cars and crowd, including a saved vehicle
// occupying a traffic spawn. Start Vite, then BROWSER_CHANNEL=chrome node this file.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true, channel: process.env.BROWSER_CHANNEL || undefined, args: ['--mute-audio'],
});
try {
  for (const fixture of [
    { name: 'desktop', quality: 'high', width: 1100, height: 700, count: 30 },
    { name: 'mobile', quality: 'low', width: 390, height: 844, count: 8, mobile: true },
    { name: 'restored car', quality: 'high', width: 1100, height: 700, count: 30, restored: true },
  ]) {
    const context = await browser.newContext({
      viewport: { width: fixture.width, height: fixture.height },
      isMobile: !!fixture.mobile, hasTouch: !!fixture.mobile,
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      if (fixture.restored) await page.addInitScript(() => {
        // The traffic is built before saved vehicles load: put a saved car exactly on a
        // spawn, using the actual model lengths / random dealer of this scene.
        let traffic;
        Object.defineProperty(window, '__traffic', {
          configurable: true, get: () => traffic, set: (value) => {
            traffic = value;
            const c = value.cars.find((c) => c.dir === -1 && Math.abs(c.z) < 200);
            window.__savedTrafficFixture = { x: c.x, z: c.z };
            localStorage.setItem('ocean-drive.car', JSON.stringify({ body: 'hero', origin: 'hero', x: c.x, z: c.z, yaw: 0 }));
          },
        });
      });
      const url = process.env.BASE_URL || 'http://127.0.0.1:5173/';
      await page.goto(`${url}?autostart&quality=${fixture.quality}&lowshadow`);
      await page.waitForFunction(() => window.__sceneReady && !document.getElementById('loader'), null, { timeout: 120000 });
      const result = await page.evaluate(({ restored }) => {
        const T = window.__traffic, P = window.__people, V = window.__vehicles;
        T.debug.freeze = true;
        const obstacles = V.list.flatMap((e) => e.v.circlesWorld.map((c) => ({ x: c.x, z: c.z, r: c.r, v: 0 })));
        const hits = () => T.cars.filter((c) => !c.hidden && obstacles.some((o) => Math.abs(c.x - o.x) < 0.9 + o.r && Math.abs(c.z - o.z) < c.len / 2 + o.r)).length;
        const initialHits = hits();
        const progress = new Map(T.cars.map((c) => [c, 0]));
        let collisions = 0, passes = 0;
        for (let t = 0; t < (restored ? 240 : 20); t += 0.1) {
          const before = T.cars.map((c) => ({ z: c.z, dir: c.dir, hidden: c.hidden }));
          P.update(0.1, window.__camera);
          T.sim.update(0.1, { peds: P.peds(), obstacles, viewer: { x: -26, z: 40 } });
          collisions += hits();
          T.cars.forEach((c, i) => {
            const b = before[i];
            if (c.hidden || b.hidden || c.dir !== b.dir) return;
            progress.set(c, progress.get(c) + Math.abs(c.z - b.z));
            const savedZ = window.__savedTrafficFixture?.z;
            if (restored && c.dir === -1 && b.z > savedZ && c.z < savedZ) passes++;
          });
        }
        return {
          count: T.cars.length, initialHits, collisions, passes,
          minProgress: Math.min(...progress.values()), saved: V.saved && { x: V.saved.v.x, z: V.saved.v.z },
          fixture: window.__savedTrafficFixture,
        };
      }, { restored: !!fixture.restored });
      assert.deepEqual(errors, [], `${fixture.name}: browser errors`);
      assert.equal(result.count, fixture.count, `${fixture.name}: fleet size`);
      assert.equal(result.initialHits, 0, `${fixture.name}: startup overlap`);
      assert.equal(result.collisions, 0, `${fixture.name}: traffic intersects a parked vehicle`);
      assert.ok(result.minProgress > 5, `${fixture.name}: traffic keeps moving`);
      if (fixture.restored) {
        assert.deepEqual(result.saved, result.fixture, 'saved car stays at its restored pose');
        assert.ok(result.passes >= 8, 'traffic passes the restored car repeatedly');
      }
      console.log(`PASS ${fixture.name}: ${JSON.stringify(result)}`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
