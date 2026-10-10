// Download the selected CC0 scans, verify their source hashes, and make local WebP tiers.
// Run: node tools/import-polyhaven.mjs (requires Chrome and network access).
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const selected = [
  { id: 'asphalt_02', meters: 3 },
  { id: 'concrete_pavement', meters: 1.8 },
  { id: 'herringbone_brick_03', meters: 2 },
  { id: 'painted_plaster_wall', meters: 2 },
];
const maps = { color: 'Diffuse', normal: 'nor_gl', arm: 'arm' };
const output = path.resolve('public/textures/city');
const raw = path.resolve('.perf/polyhaven');
await fs.mkdir(output, { recursive: true });
await fs.mkdir(raw, { recursive: true });
const get = async url => {
  const response = await fetch(url, { headers: { 'User-Agent': 'OceanDrive-texture-import/1.0' }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const manifest = { license: 'CC0-1.0', licenseUrl: 'https://polyhaven.com/license', assets: [] };
try {
  const page = await browser.newPage();
  for (const asset of selected) {
    const files = await (await get(`https://api.polyhaven.com/files/${asset.id}`)).json();
    const info = await (await get(`https://api.polyhaven.com/info/${asset.id}`)).json();
    const record = { ...asset, name: info.name, authors: Object.keys(info.authors), source: `https://polyhaven.com/a/${asset.id}`, maps: {} };
    for (const [name, key] of Object.entries(maps)) {
      const source = files[key]['1k'].jpg;
      const bytes = Buffer.from(await (await get(source.url)).arrayBuffer());
      const md5 = createHash('md5').update(bytes).digest('hex');
      if (source.md5 && source.md5 !== md5) throw new Error(`Hash mismatch for ${asset.id}/${name}`);
      await fs.writeFile(path.join(raw, `${asset.id}_${name}.jpg`), bytes);
      const paths = {};
      for (const size of [1024, 512]) {
        const data = await page.evaluate(async ({ base64, size, quality }) => {
          const image = new Image(); image.src = `data:image/jpeg;base64,${base64}`;
          await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
          const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(image, 0, 0, size, size);
          return canvas.toDataURL('image/webp', quality).split(',')[1];
        }, { base64: bytes.toString('base64'), size, quality: name === 'color' ? 0.9 : 0.97 });
        const filename = `${asset.id}_${name}_${size}.webp`;
        const encoded = Buffer.from(data, 'base64');
        await fs.writeFile(path.join(output, filename), encoded);
        paths[size] = { file: filename, bytes: encoded.length };
      }
      record.maps[name] = { url: source.url, md5, tiers: paths };
    }
    manifest.assets.push(record);
    console.log(`Imported ${asset.id} (${asset.meters} m tile)`);
  }
  await fs.writeFile(path.join(output, 'sources.json'), JSON.stringify(manifest, null, 2) + '\n');
} finally {
  await browser.close();
}
