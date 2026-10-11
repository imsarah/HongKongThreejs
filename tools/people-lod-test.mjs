// Regression: distant crowd meshes must keep the animated body's footprint and textures.
// Run against npm run dev: node tools/people-lod-test.mjs
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const names = ['josh', 'shannon', 'suzie', 'martha'];
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--mute-audio', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route('**/favicon.ico', route => route.fulfill({ status: 204, body: '' }));
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
page.on('console', message => { if (message.type() === 'error' || message.text().startsWith('people:')) errors.push(message.text()); });
const results = [];
await fs.mkdir('shots/people-lod', { recursive: true });
try {
  for (const quality of ['high', 'low']) {
    for (const clip of ['idle_standing', 'walk_casual_m', 'walk_casual_f', 'drive_car']) {
      await page.goto(`http://127.0.0.1:5173/tools/people-debug.html?quality=${quality}&chars=${names.join(',')}&clip=${clip}&view=front&tint=1`);
      await page.waitForFunction(() => window.__ready, null, { timeout: 90000 });
      for (const time of [0, 0.3, 0.7]) {
        const samples = await page.evaluate(async time => {
          const { Box3, Vector3 } = await import('/node_modules/three/build/three.module.js');
          const samples = [];
          for (const level of [0, 1]) {
            for (const person of window.__people) person.setLevel(level);
            window.__render(time);
            samples.push(window.__people.map(person => {
              const box = new Box3();
              const untextured = [];
              for (const mesh of person.lod[level]) {
                mesh.computeBoundingBox();
                box.union(mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
                if (!mesh.material.map) untextured.push(mesh.name);
              }
              return { name: person.asset.name, size: box.getSize(new Vector3()).toArray(), untextured };
            }));
          }
          return samples;
        }, time);
        if (samples.some(sample => sample.length !== names.length)) throw new Error('A character failed to load');
        samples[0].forEach((near, i) => {
          const far = samples[1][i];
          if ([...near.untextured, ...far.untextured].length) throw new Error(`${near.name}: unexpected untextured surface`);
          for (let axis = 0; axis < 3; axis++) {
            if (!Number.isFinite(far.size[axis]) || far.size[axis] > near.size[axis] * 1.3 + 0.08) {
              throw new Error(`${quality}/${clip}/${time}: ${near.name} far mesh extends beyond the body (${far.size} vs ${near.size})`);
            }
          }
        });
        results.push({ quality, clip, time, near: samples[0], far: samples[1] });
      }
      await page.screenshot({ path: `shots/people-lod/${quality}-${clip}-far.png` });
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Passed ${results.length} animated near/far comparisons for ${names.length} characters in both texture tiers.`);
} finally {
  await fs.writeFile('shots/people-lod/report.json', JSON.stringify({ errors, results }, null, 2));
  await browser.close();
}
