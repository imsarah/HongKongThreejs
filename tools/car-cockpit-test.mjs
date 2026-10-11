// Start npm run dev, then run this with Playwright Chromium or BROWSER_CHANNEL=chrome.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

mkdirSync('shots/cockpit', { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || undefined, args: ['--mute-audio'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${process.env.SHOT_URL || 'http://127.0.0.1:5173/'}?autostart&quality=low`);
  await page.waitForFunction(() => window.__sceneReady, null, { timeout: 120000 });
  await page.evaluate(() => {
    window.__vehicles.mount('car');
    window.__traffic.debug.freeze = true;
    window.__people.debug.freeze = true;
  });
  for (const kind of ['convertible', 'sedan', 'hatch', 'suv', 'pickup', 'coupe', 'wagon', 'crossover']) {
    if (kind !== 'convertible') await page.evaluate(kind => {
      const V = window.__vehicles;
      V.dismount();
      const car = V.parkedNear(-22.75, 8, kind)[0];
      if (!car) throw new Error(`Missing parked ${kind}`);
      const d = V.doorsOf(car).find(d => d.side === 'driver');
      window.__walker.teleport(d.x, d.z, Math.atan2(car.x - d.x, -(car.z - d.z)) * 180 / Math.PI, -10);
      V.update(1 / 60); V.toggle();
      if (V.currentEntry.body !== kind) throw new Error(`Could not enter ${kind}`);
    }, kind);
    await page.waitForTimeout(1800);
    const contact = await page.evaluate(() => {
      const rig = window.__vehicles.currentEntry.drive.rig, v = window.__vehicles.current;
      const P = window.__people.drivingPlayer;
      const Vec = rig.wheel.position.constructor, Quat = rig.wheel.quaternion.constructor;
      const axis = new Vec(0, 1, 0), max = window.__vehicles.currentEntry.origin === 'hero' ? 2.5 * Math.PI : 1.5 * Math.PI;
      let wristError = 0, palmGap = 0, planeGap = 0, minCurl = 1;
      // Slow full-lock turns, return through centre, then a fast reversal.
      const angles = [];
      for (const [a, b] of [[0, max], [max, -max], [-max, 0]])
        for (let i = 0; i <= 180; i++) angles.push(a + (b - a) * i / 180);
      angles.push(max, -max, 0);
      for (const angle of angles) {
        rig.wheelAngle = angle; rig.t += 1 / 60;
        rig.wheel.quaternion.copy(rig.wheel.userData.q0).multiply(new Quat().setFromAxisAngle(axis, angle));
        rig.wheel.updateMatrixWorld(true); rig.update(rig, v);
        for (const side of ['Left', 'Right']) {
          const h = P.hold[side], grip = rig[side === 'Left' ? 'gripL' : 'gripR'];
          const wrist = P.bones[side + 'Hand'].getWorldPosition(new Vec());
          const knuckle = rig.wheel.worldToLocal(P.bones[side + 'HandMiddle1'].getWorldPosition(new Vec()));
          wristError = Math.max(wristError, wrist.distanceTo(h.W));
          palmGap = Math.max(palmGap, Math.abs(Math.hypot(knuckle.x, knuckle.z) - Math.hypot(grip.position.x, grip.position.z)));
          planeGap = Math.max(planeGap, Math.abs(knuckle.y - grip.position.y));
          minCurl = Math.min(minCurl, h.k);
        }
      }
      // Return the driver's animation clock to the simulation before rendering a screenshot.
      rig.t = v.t; rig.update(rig, v);
      return { wristError, palmGap, planeGap, minCurl };
    });
    console.log(kind, contact);
    assert.ok(contact.wristError < 0.02, `${kind}: both wrists reach the rim`);
    assert.ok(contact.palmGap < 0.025 && contact.planeGap < 0.02, `${kind}: both palms stay on the rim`);
    assert.equal(contact.minCurl, 1, `${kind}: fingers remain curled around the wheel`);
    await page.evaluate(() => { window.__walker.yaw = window.__vehicles.current.yaw; window.__walker.pitch = -0.25; });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `shots/cockpit/${kind}.png` });
    if (kind !== 'convertible' && kind !== 'sedan') continue;
    const withGlass = await page.screenshot();
    const panes = await page.evaluate(() => {
      window.__glassHidden = [];
      window.__vehicles.currentEntry.drive.root.traverse(o => {
        if (o.isMesh && o.material?.transparent && o.material.userData.uInside?.value === 1) {
          window.__glassHidden.push([o, o.visible]); o.visible = false;
        }
      });
      return window.__glassHidden.length;
    });
    assert.ok(panes > 0, `${kind}: glass has an inside material`);
    const withoutGlass = await page.screenshot();
    await page.evaluate(() => { for (const [o, visible] of window.__glassHidden) o.visible = visible; });
    const delta = await page.evaluate(async ({ a, b }) => {
      const read = async data => {
        const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
        return ctx.getImageData(450, 110, 250, 130).data;
      };
      const [aa, bb] = await Promise.all([read(a), read(b)]);
      let d = 0;
      for (let i = 0; i < aa.length; i += 4) for (let c = 0; c < 3; c++) d += Math.abs(aa[i + c] - bb[i + c]);
      return d / (aa.length / 4 * 3);
    }, { a: withGlass.toString('base64'), b: withoutGlass.toString('base64') });
    assert.ok(delta > 1.5, `${kind}: windshield visibly affects the view from inside`);
    console.log(`PASS ${kind}: visible inside glass (${delta.toFixed(1)} pixel difference)`);
  }
  const cameraDrift = await page.evaluate(() => {
    const V = window.__vehicles, car = V.currentEntry, eyeZ = car.drive.rig.eye.position.z;
    let drift = 0;
    for (let i = 0; i < 3; i++) {
      V.dismount();
      const d = V.doorsOf(car).find(d => d.side === 'driver');
      window.__walker.teleport(d.x, d.z, Math.atan2(car.v.x - d.x, -(car.v.z - d.z)) * 180 / Math.PI, -10);
      V.update(1 / 60); V.toggle();
      if (V.currentEntry !== car) throw new Error('Could not re-enter the same car');
      drift = Math.max(drift, Math.abs(car.drive.rig.eye.position.z - eyeZ));
    }
    return drift;
  });
  assert.ok(cameraDrift < 1e-7, 're-entering a car must not move the camera forward again');
  assert.deepEqual(errors, []);
  console.log('PASS all eight driver grips through full-lock steering and wheel return');
} finally { await browser.close(); }
