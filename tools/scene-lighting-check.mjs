import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--mute-audio', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
try {
  await page.goto('http://127.0.0.1:5173/?shot=1&dynres=0');
  await page.waitForFunction(() => window.__sceneReady, null, { timeout: 180000 });
  await page.waitForTimeout(1200);
  const snapshot = () => page.evaluate(() => {
    const fixtures = window.__scene.getObjectByName('hotels').userData.canopyLights;
    const lights = window.__scene.children.filter(object => object.name === 'canopy-tube-light');
    return { render: window.__renderInfo(), budget: window.__gpuBudget(), fixtures: fixtures.length,
      lights: lights.map(light => ({ intensity: light.intensity, x: light.position.x,
        attached: fixtures.some(fixture => Math.hypot(fixture.x - light.position.x,
          fixture.y - 0.015 - light.position.y, fixture.z - light.position.z) < 0.01) })) };
  });
  const initial = await snapshot();
  assert(initial.render.contactAO && initial.budget.contactMB > 0, 'Contact shading is not active');
  assert(initial.fixtures > 100 && initial.lights.length === 6 && initial.lights.every(light => light.attached), 'Canopy lights are not attached to existing fixtures');
  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForTimeout(500);
  const resized = await snapshot();
  assert(resized.budget.contactMB > 0 && resized.budget.contactMB < initial.budget.contactMB, 'Contact targets failed to resize');
  await page.evaluate(() => window.__setCam(-12, 1.85, 40, 180, 4));
  await page.waitForTimeout(1600);
  const east = await snapshot();
  assert(east.lights.filter(light => light.intensity > 5 && light.x > -20).length >= 4, 'Light pool failed to follow the east sidewalk');
  assert(east.lights.every(light => light.attached), 'Moved lights left their physical fixtures');
  await page.goto('http://127.0.0.1:5173/?quality=medium&ao=0&dynres=0');
  await page.waitForFunction(() => window.__sceneReady, null, { timeout: 180000 });
  assert(!(await snapshot()).render.contactAO, 'Contact shading override failed');
  const guard = await page.evaluate(() => window.__gpuGuard());
  let guardCheck = 'timer unavailable';
  if (guard.timer) {
    await page.goto('http://127.0.0.1:5173/?quality=medium&dynres=0');
    await page.waitForFunction(() => window.__sceneReady, null, { timeout: 180000 });
    assert((await snapshot()).render.contactAO, 'Medium contact shading did not start');
    await page.evaluate(() => window.__gpuGuardFake(300));
    await page.waitForTimeout(400);
    const protectedState = await snapshot();
    assert(!protectedState.render.contactAO && protectedState.budget.contactMB === 0, 'GPU guard did not release contact shading');
    await page.setViewportSize({ width: 800, height: 500 });
    await page.waitForTimeout(400);
    guardCheck = 'passed';
  }
  assert(!errors.length && !(await page.evaluate(() => window.__contextLost)), errors.join('\n') || 'Context lost');
  const report = { errors, initial, resized, east, guardCheck };
  await fs.mkdir('shots/scene-final', { recursive: true });
  await fs.writeFile('shots/scene-final/lighting-check.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ errors, fixtures: initial.fixtures, resized: true, eastSidewalk: true, guardCheck }));
} finally { await browser.close(); }
