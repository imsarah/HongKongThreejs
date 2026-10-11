// Live NPC regression: duplicate spawn requests, opposing walkers and ten minutes of
// crowd movement at low frame rates on every quality tier. Requires the dev server.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined, args: ['--mute-audio'] });
try {
  for (const quality of ['high', 'medium', 'low']) {
    const context = await browser.newContext({
      viewport: quality === 'low' ? { width: 390, height: 844 } : { width: 1100, height: 700 },
      isMobile: quality === 'low', hasTouch: quality === 'low',
    });
    try {
      const page = await context.newPage(), errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5173/'}?autostart&quality=${quality}&lowshadow`);
      await page.waitForFunction(() => window.__sceneReady && !document.getElementById('loader'), null, { timeout: 120000 });
      const result = await page.evaluate(() => {
        const C = window.__people, T = window.__traffic, V = window.__vehicles, E = window.__exitDrivers;
        T.debug.freeze = true;
        const radius = (a) => a.seat ? 0.36 : a.kind === 'skate' ? 0.35 : 0.28;
        function measure() {
          const agents = [...C.agents.filter((a) => !a.hidden), ...E.colliders.filter((c) => c.r > 0).map((c) => ({ ...c, radius: c.r }))];
          let clearance = Infinity;
          for (let i = 0; i < agents.length; i++) for (let j = i + 1; j < agents.length; j++) {
            const a = agents[i], b = agents[j];
            clearance = Math.min(clearance, Math.hypot(a.x - b.x, a.z - b.z) - (a.radius ?? radius(a)) - (b.radius ?? radius(b)));
          }
          return clearance;
        }
        const initial = measure(), count = C.agents.filter((a) => !a.hidden).length;
        const obstacles = V.list.flatMap((e) => e.v.circlesWorld.map((c) => ({ x: c.x, z: c.z, r: c.r, v: 0 })));
        let worst = initial;
        const progress = new Map(C.agents.filter((a) => a.path && !a.hidden).map((a) => [a, 0]));
        for (let t = 0; t < 600; t += 0.1) {
          const before = [...progress.keys()].map((a) => ({ x: a.x, z: a.z }));
          C.update(0.1, window.__camera);
          T.sim.update(0.1, { peds: C.peds(), obstacles, viewer: { x: -26, z: 40 } });
          [...progress.keys()].forEach((a, i) => progress.set(a, progress.get(a) + Math.hypot(a.x - before[i].x, a.z - before[i].z)));
          worst = Math.min(worst, measure());
        }
        // Mimic multiple spawn requests at one point of a shared sidewalk route.
        const route = C.agents.find((a) => a.path?.half === 0.8).path;
        const group = C.agents.filter((a) => a.path && !a.hidden).slice(0, 3);
        group.forEach((a, i) => Object.assign(a, { path: route, s: route.total / 2, lat: 0, dir: i === 1 ? -1 : 1, keep: 0.4, v0: 1.3, speed: 1.3 }));
        C.setVehicles(V);
        const duplicateSpawn = measure();
        let opposing = duplicateSpawn;
        for (let t = 0; t < 60; t += 0.1) { C.update(0.1, window.__camera); opposing = Math.min(opposing, measure()); }
        // Exercise the actual driver's hand-off and the main scene's crowd callback.
        // The accelerated simulation bypasses drawing, so bind the current models first.
        T.update(1 / 60, { camera: window.__camera });
        const car = { x: -25.5, z: 8, yaw: 0, len: 4.8, width: 1.9 };
        for (const c of T.cars.filter((c) => !c.classic && !c.hidden).slice(0, 3)) {
          c.v = 0;
          const info = T.handOff(c);
          if (!info?.driver) throw new Error('traffic car must hand off its driver');
          info.driver.matrix.elements[12] = car.x;
          info.driver.matrix.elements[13] = 0.6;
          info.driver.matrix.elements[14] = car.z;
          E.start(info.driver, car, { x: -26.8, z: 8 }, () => ({ x: -25.5, z: 10 }));
        }
        const exiting = E.live.length;
        let exitClearance = measure();
        for (let t = 0; t < 40; t += 0.1) {
          C.update(0.1, window.__camera);
          E.update(0.1, null);
          exitClearance = Math.min(exitClearance, measure());
        }
        return { count, total: C.agents.length, initial, worst, minProgress: Math.min(...progress.values()), duplicateSpawn, opposing, exiting, exitClearance, hidden: group.some((a) => a.hidden) };
      });
      assert.deepEqual(errors, []);
      assert.equal(result.count, result.total, `${quality}: keep the full crowd population`);
      assert.ok(result.initial >= 0.039, `${quality}: initial spawn overlap`);
      assert.ok(result.worst >= 0.039, `${quality}: NPC collision in long-running scene`);
      assert.ok(result.minProgress > 5, `${quality}: walkers must still move`);
      assert.ok(result.duplicateSpawn >= 0.039 && !result.hidden, `${quality}: duplicate requests need separate free spawns`);
      assert.ok(result.opposing >= 0.039, `${quality}: opposing walkers overlap`);
      assert.equal(result.exiting, 3, `${quality}: drivers still get out`);
      assert.ok(result.exitClearance >= 0.039, `${quality}: exiting drivers overlap the crowd`);
      console.log(`PASS ${quality}: ${JSON.stringify(result)}`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
