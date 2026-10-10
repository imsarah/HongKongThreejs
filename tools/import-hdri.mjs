// Import the original CC0 HDRI tiers and measure the sky for lighting alignment.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { FloatType } from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const id = 'modern_evening_street';
const output = path.resolve('public/environments');
await fs.mkdir(output, { recursive: true });
const get = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
};
const files = await (await get(`https://api.polyhaven.com/files/${id}`)).json();
const info = await (await get(`https://api.polyhaven.com/info/${id}`)).json();
const manifest = { id, name: info.name, authors: Object.keys(info.authors),
  source: `https://polyhaven.com/a/${id}`, license: 'CC0-1.0', licenseUrl: 'https://polyhaven.com/license', tiers: {} };
for (const size of ['1k', '2k', '4k']) {
  const source = files.hdri[size].hdr;
  const bytes = Buffer.from(await (await get(source.url)).arrayBuffer());
  const md5 = createHash('md5').update(bytes).digest('hex');
  if (source.md5 && source.md5 !== md5) throw new Error(`Hash mismatch: ${size}`);
  const file = `${id}_${size}.hdr`;
  await fs.writeFile(path.join(output, file), bytes);
  manifest.tiers[size] = { file, url: source.url, md5, bytes: bytes.length };
  if (size === '1k') {
    const image = new HDRLoader().setDataType(FloatType).parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    let peak = 0, peakX = 0, peakY = 0, total = 0, weights = 0;
    const horizon = [0, 0, 0]; let horizonWeight = 0;
    for (let y = 0; y < image.height / 2; y++) {
      const elevation = Math.PI / 2 - (y + 0.5) / image.height * Math.PI;
      const weight = Math.cos(elevation);
      for (let x = 0; x < image.width; x++) {
        const offset = (y * image.width + x) * 4;
        const rgb = image.data.subarray(offset, offset + 3);
        const luma = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        if (luma > peak) { peak = luma; peakX = x; peakY = y; }
        // Ignore the tiny solar disc when measuring the diffuse sky.
        if (elevation > Math.PI / 3 && luma < 20) { total += luma * weight; weights += weight; }
        if (elevation > 0.12 && elevation < 0.2 && luma < 20) {
          rgb.forEach((value, i) => { horizon[i] += value; }); horizonWeight++;
        }
      }
    }
    const phi = ((peakX + 0.5) / image.width * 2 - 1) * Math.PI;
    const elevation = Math.PI / 2 - (peakY + 0.5) / image.height * Math.PI;
    manifest.lighting = { hasDirectSun: false, sunDirection: [Math.cos(phi) * Math.cos(elevation), Math.sin(elevation), Math.sin(phi) * Math.cos(elevation)],
      sunElevationDeg: elevation * 180 / Math.PI, skyLuminance: total / weights,
      horizonColor: horizon.map(value => value / horizonWeight), peakLuminance: peak };
  }
  console.log(`Downloaded ${file}: ${(bytes.length / 1048576).toFixed(2)} MB`);
}
await fs.writeFile(path.join(output, 'source.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest.lighting));
