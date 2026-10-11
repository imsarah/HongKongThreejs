// Verify shipped railings, crossing studs and driving integration on desktop and phone.
// Start Vite, then BROWSER_CHANNEL=chrome node tools/railing-scene-test.mjs.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined, args: ['--mute-audio'] });
try {
  for (const quality of ['high', 'low']) {
    const context = await browser.newContext({
      viewport: quality === 'low' ? { width: 390, height: 844 } : { width: 1100, height: 700 },
      isMobile: quality === 'low', hasTouch: quality === 'low',
    });
    try {
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:5173/'}?autostart&quality=${quality}&lowshadow`);
      await page.waitForFunction(() => window.__sceneReady && !document.getElementById('loader'), null, { timeout: 120000 });
      const result = await page.evaluate(() => {
        const P = window.__props, V = window.__vehicles, walker = window.__walker;
        window.__traffic.debug.freeze = true;
        // Keep this crash fixture clear of moving traffic and pedestrians.
        for (const c of [...window.__traffic.colliders, ...window.__people.colliders]) c.r = 0;
        const rails = P.props.filter(p => p.kind === 'railing');
        const studs = window.__scene.getObjectByName('crossing-studs');
        const bounds = studs.geometry.boundingBox;
        const matrix = studs.matrix.clone(), points = [];
        for (let i = 0; i < studs.count; i++) {
          studs.getMatrixAt(i, matrix);
          points.push({ x: matrix.elements[12], z: matrix.elements[14] });
        }
        const paired = [-22.4, -21.2, -20, -18.8, -17.6, -16.4].every(x =>
          [-11.85, -8.15].every(z => points.some(p => Math.abs(p.x - x) < 1e-4 && Math.abs(p.z - z) < 1e-4)));
        const rail = P.nearest(-14.25, 40, 'railing');
        const original = rail.pos.clone();
        const linked = walker.world.boxes.filter(b => b === rail.box).length;
        const width = rail.box.max.x - rail.box.min.x;
        V.mount('car'); V.simulate([], 2);
        const placed = V.place(rail.x - 4.5, rail.z, -Math.PI / 2, 'car');
        const v = V.list.find(e => e.origin === 'hero').v;
        Object.assign(v, { vx: 7, vz: 0, lon: 7, engineOn: true });
        V.simulate(['KeyW'], 1);
        const knocked = rail.state !== 'rest', cleared = rail.box.disabled;
        for (let t = 0; t < 12; t += 1 / 60) P.update(1 / 60);
        const fallen = rail.state === 'down', displacement = rail.pos.distanceTo(original);
        // The original footprint is removed from the walker's actual collision list.
        const gapClear = !walker.world.boxes.some(b => !b.disabled && b.min.x <= rail.x && b.max.x >= rail.x && b.min.z <= rail.z && b.max.z >= rail.z && b.max.y > 0.5);
        P.reset(rail);
        return { studs: studs.count, studWidth: bounds.max.x - bounds.min.x,
          studDepth: bounds.max.z - bounds.min.z, studHeight: bounds.max.y - bounds.min.y,
          paired, metalness: studs.material.metalness,
          rails: rails.length, bins: P.props.filter(p => p.kind === 'bin').length,
          linked, width, placed, knocked, cleared, fallen, displacement, gapClear, restored: !rail.box.disabled };
      });
      assert.equal(result.bins, 0);
      assert.equal(result.studs, 240, 'two studs per painted crossing stripe throughout district');
      assert.ok(Math.abs(result.studWidth - 0.14) < 1e-6 && Math.abs(result.studDepth - 0.14) < 1e-6);
      assert.ok(Math.abs(result.studHeight - 0.024) < 1e-6 && result.paired && result.metalness >= 0.8);
      assert.ok(result.rails > 100);
      assert.equal(result.linked, 1, 'one live box, no solid duplicate');
      assert.ok(result.width < 0.07, 'thin railing footprint');
      assert.ok(result.placed.ok, 'car starts in clear space');
      assert.ok(result.knocked && result.cleared && result.fallen && result.displacement > 1 && result.gapClear && result.restored, JSON.stringify(result));
      assert.deepEqual(errors, []);
      console.log(`PASS ${quality} scene: ${result.rails} railings, crash, fall, clear gap and reset; ${result.studs} square metal crossing studs; no bins or runtime errors`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
