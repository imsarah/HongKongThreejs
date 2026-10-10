import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

// City cameras stay inside the walkable street, unlike the original beach harness.
const label = process.argv[2] || 'city';
const out = path.resolve('shots', label);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--mute-audio', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
try {
  const response = await page.goto('http://127.0.0.1:5173/?shot=1&dynres=0');
  if (!response.ok()) throw new Error(`Preview returned ${response.status()}`);
  await page.waitForFunction(() => window.__sceneReady, null, { timeout: 180000 });
  const views = [
    { name: 'street', pose: [-26, 1.85, 40, 342, 4] },
    { name: 'paving', pose: [-26, 1.85, 40, 342, -35] },
    { name: 'storefronts', pose: [-16, 1.85, 12, 285, 9] },
    { name: 'canyon', pose: [-19, 1.85, -45, 170, 15] },
    { name: 'sky', pose: [-19, 1.85, 40, 342, 60] },
  ];
  const shots = [];
  const cityMaps = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter(resource => resource.name.includes('/textures/city/')).map(resource => resource.name.split('/').pop()));
  const environment = await page.evaluate(() => ({ ...window.__scene.userData.environment,
    resources: performance.getEntriesByType('resource').filter(resource => resource.name.endsWith('.hdr')).map(resource => resource.name.split('/').pop()) }));
  for (const view of views) {
    await page.evaluate(pose => window.__setCam(...pose), view.pose);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(out, `${view.name}.png`) });
    shots.push({ ...view, render: await page.evaluate(() => window.__renderInfo()) });
  }
  // The same shaders must compile on lower tiers and after resizing the post chain.
  for (const tier of ['medium', 'low']) {
    await page.setViewportSize({ width: 720, height: 450 });
    await page.goto(`http://127.0.0.1:5173/?quality=${tier}&dynres=0&gpuguard=0`);
    await page.waitForFunction(() => window.__sceneReady, null, { timeout: 180000 });
    await page.evaluate(() => {
      document.getElementById('overlay')?.classList.add('hidden');
      document.getElementById('loader')?.remove();
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(out, `${tier}.png`) });
    const maps = await page.evaluate(() => performance.getEntriesByType('resource')
      .filter(resource => resource.name.includes('/textures/city/')).map(resource => resource.name.split('/').pop()));
    shots.push({ name: tier, maps, environment: await page.evaluate(() => window.__scene.userData.environment), render: await page.evaluate(() => window.__renderInfo()) });
  }
  const report = { errors, cityMaps, environment, shots, contextLost: await page.evaluate(() => !!window.__contextLost) };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (errors.length || report.contextLost) process.exitCode = 1;
} finally {
  await browser.close();
}
