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
  { id: 'long_white_tiles', meters: 1.27 },
  { id: 'concrete_wall_006', meters: 2 },
  { id: 'wood_floor', meters: 1.7 },
  { id: 'terrazzo_tiles', meters: 2 },
];
const requested = process.argv.slice(2);
if (requested.some(id => !selected.some(asset => asset.id === id))) throw new Error('Unknown texture ID');
const chosen = requested.length ? selected.filter(asset => requested.includes(asset.id)) : selected;
const surfaceIds = ['long_white_tiles', 'concrete_wall_006', 'wood_floor', 'terrazzo_tiles'];
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
let manifest = { license: 'CC0-1.0', licenseUrl: 'https://polyhaven.com/license', assets: [] };
try { manifest = JSON.parse(await fs.readFile(path.join(output, 'sources.json'), 'utf8')); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
try {
  const page = await browser.newPage();
  for (const asset of chosen) {
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
    manifest.assets = manifest.assets.filter(entry => entry.id !== asset.id);
    manifest.assets.push(record);
    console.log(`Imported ${asset.id} (${asset.meters} m tile)`);
  }
  if (surfaceIds.every(id => manifest.assets.some(asset => asset.id === id))) {
    const atlas = { id: 'building_surfaces', columns: 2, rows: 2, gutter: 1,
      slots: surfaceIds.map((id, index) => ({ id, index, meters: selected.find(asset => asset.id === id).meters })), maps: {} };
    for (const kind of Object.keys(maps)) {
      const tiers = {};
      for (const size of [1024, 512]) {
        const images = await Promise.all(surfaceIds.map(async id => (await fs.readFile(path.join(output, `${id}_${kind}_1024.webp`))).toString('base64')));
        const data = await page.evaluate(async ({ images, size, quality }) => {
          const sources = await Promise.all(images.map(async data => {
            const image = new Image(); image.src = `data:image/webp;base64,${data}`; await image.decode(); return image;
          }));
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
          const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
          const cell = size / 2, inner = cell - 2;
          sources.forEach((image, index) => {
            const x = (index % 2) * cell, y = Math.floor(index / 2) * cell, w = image.width, h = image.height;
            ctx.drawImage(image, x + 1, y + 1, inner, inner);
            // Wrap gutters around each scan independently for clean repeat boundaries.
            ctx.drawImage(image, w - 1, 0, 1, h, x, y + 1, 1, inner);
            ctx.drawImage(image, 0, 0, 1, h, x + cell - 1, y + 1, 1, inner);
            ctx.drawImage(image, 0, h - 1, w, 1, x + 1, y, inner, 1);
            ctx.drawImage(image, 0, 0, w, 1, x + 1, y + cell - 1, inner, 1);
            for (const [dx, dy, sx, sy] of [[0, 0, w - 1, h - 1], [cell - 1, 0, 0, h - 1], [0, cell - 1, w - 1, 0], [cell - 1, cell - 1, 0, 0]]) {
              ctx.drawImage(image, sx, sy, 1, 1, x + dx, y + dy, 1, 1);
            }
          });
          return canvas.toDataURL('image/webp', quality).split(',')[1];
        }, { images, size, quality: kind === 'color' ? 0.94 : 0.98 });
        const file = `building_surfaces_${kind}_${size}.webp`, bytes = Buffer.from(data, 'base64');
        await fs.writeFile(path.join(output, file), bytes);
        tiers[size] = { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
      }
      atlas.maps[kind] = { tiers };
    }
    manifest.atlases = [atlas];
    console.log('Packed building_surfaces atlas (1024/512 px)');
  }
  await fs.writeFile(path.join(output, 'sources.json'), JSON.stringify(manifest, null, 2) + '\n');
} finally {
  await browser.close();
}
