import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve('shots/buildings');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--mute-audio', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => {
  if (message.type() === 'error' || /GL_INVALID|error X\d+|D3D shader compilation failed/.test(message.text())) {
    if (!errors.includes(message.text())) errors.push(message.text());
  }
});
await page.route('**/favicon.ico', route => route.fulfill({ status: 204 }));
const reports = [];
try {
  for (const tier of ['high', 'medium', 'low']) {
    await page.goto(`http://127.0.0.1:5173/?quality=${tier}&dynres=0&gpuguard=0${tier === 'high' ? '&shot=1' : ''}`);
    await page.waitForFunction(() => window.__sceneReady, null, { timeout: 180000 });
    const report = await page.evaluate(async () => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { SHOP_H, buildHkBuildings } = await import('/src/world/hk-buildings.js');
      const { QUALITY } = await import('/src/quality.js');
      // Inspect the live material's bound textures: importing a mutable module by
      // URL can create a separate instance when Vite adds an HMR timestamp.
      let liveFacade;
      window.__scene.traverse(object => {
        if (object.material?.defines?.HK_SCAN_SURFACES) liveFacade = object.material;
      });
      if (!liveFacade) throw new Error('Building surface atlas failed to load');
      const bound = { uniforms: {}, vertexShader: '', fragmentShader: '' };
      liveFacade.onBeforeCompile(bound);
      const surfaces = {
        color: bound.uniforms.hkSurfacesColor.value,
        normal: bound.uniforms.hkSurfacesNormal.value,
        arm: bound.uniforms.hkSurfacesArm.value,
      };
      const surfaceSize = QUALITY.tier === 'low' ? 512 : 1024;
      for (const [kind, texture] of Object.entries(surfaces)) {
        if (texture.image.width !== surfaceSize || texture.image.height !== surfaceSize) {
          throw new Error(`Wrong building surface resolution: ${kind}`);
        }
        if (texture.colorSpace !== (kind === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace)) {
          throw new Error(`Wrong building surface colour space: ${kind}`);
        }
      }
      // The live app releases CPU geometry after uploading it. Inspect a fresh build
      // before upload, while the live scene remains available for screenshots.
      const group = await buildHkBuildings(new THREE.Scene());
      // Pair the fresh CPU geometry with the live shader and its loaded scans.
      // Vite may give this fixture's imports a different module-cache identity.
      const fixtureFacade = group.children.find(object =>
        object.material.customProgramCacheKey() === liveFacade.customProgramCacheKey())?.material;
      if (!fixtureFacade) throw new Error('No facade material in building fixture');
      fixtureFacade.defines = { ...liveFacade.defines };
      fixtureFacade.onBeforeCompile = liveFacade.onBeforeCompile;
      const footprints = group.userData.footprints;
      let banners = 0;
      const faces = [], shops = [];
      for (const mesh of group.children) {
        const geo = mesh.geometry, p = geo.attributes.position, n = geo.attributes.normal;
        const fac = geo.attributes.aFac;
        const quads = [];
        for (let k = 0; k < geo.index.count;) {
          const i = geo.index.getX(k);
          if (k + 5 < geo.index.count && geo.index.getX(k + 3) === i
            && geo.index.getX(k + 4) === i + 2 && geo.index.getX(k + 5) === i + 3) {
            quads.push(i); k += 6;
          } else k += 3;
        }
        for (const i of quads) {
          if (Math.abs(n.getX(i)) < 0.99 || n.getY(i) !== 0) continue;
          const z0 = Math.min(...[0, 1, 2, 3].map(j => p.getZ(i + j)));
          const z1 = Math.max(...[0, 1, 2, 3].map(j => p.getZ(i + j)));
          const y0 = Math.min(...[0, 1, 2, 3].map(j => p.getY(i + j)));
          const y1 = Math.max(...[0, 1, 2, 3].map(j => p.getY(i + j)));
          if (mesh.material.emissiveIntensity === 0.9) {
            const lot = footprints.find(f => f.side === (p.getX(i) < -20 ? -1 : 1) && z0 >= f.z0 - 0.001 && z1 <= f.z1 + 0.001);
            if (!lot || (y1 > SHOP_H + 0.001 && y0 < lot.h)) throw new Error(`Banner overlaps upstairs facade: ${z0}, ${y0}–${y1}`);
            banners++;
          }
          const style = fac.getX(i);
          const outward = Math.sign(n.getX(i));
          if (style === 4 && Math.sign(p.getX(i) + 20) !== outward) {
            shops.push({ mesh, i, style, z0, z1, y0: 0.15, fh: 3, x: p.getX(i), outward, kind: fac.getY(i) - 1 });
          }
          if (!(style <= 3 || style === 7) || y0 < SHOP_H - 0.001 || Math.abs((z0 + z1) / 2) > 100) continue;
          // The bounds must describe the actual generated face, including setbacks.
          const bounds = geo.attributes.aBounds;
          if (!bounds) throw new Error('Facade is missing its own bounds');
          for (let j = 0; j < 4; j++) {
            const actual = [bounds.getX(i + j), bounds.getY(i + j), bounds.getZ(i + j), bounds.getW(i + j)];
            const expected = [z0, z1 - z0, y0, y1 - y0];
            if (actual.some((v, k) => Math.abs(v - expected[k]) > 0.001)) throw new Error('Facade bounds do not match geometry');
          }
          if (Math.sign(p.getX(i) + 20) === outward) continue; // party wall/back
          faces.push({ mesh, i, style, z0, z1, y0, fh: fac.getY(i), x: p.getX(i), outward });
        }
      }
      if (!banners) throw new Error('No storefront or rooftop signs checked');
      // Render the actual facade shader as a glass mask. Cropped openings at either
      // corner fail even if the geometry bounds themselves are correct.
      const selected = [0, 1, 2, 3, 7].map(style => faces.find(f => f.style === style));
      selected.push(faces.find(f => f.style === 1 && f.y0 > SHOP_H + 1));
      selected.push(...Array.from({ length: 8 }, (_, kind) => shops.find(f => f.kind === kind)));
      selected.push(shops.find(f => f.outward < 0), shops.find(f => f.outward > 0));
      if (selected.some(f => !f)) throw new Error('Missing building style or setback coverage');
      const renderer = new THREE.WebGLRenderer();
      const target = new THREE.WebGLRenderTarget(2048, 64);
      renderer.setRenderTarget(target);
      const masks = [];
      const shopMasks = [];
      for (const face of selected) {
        const geometry = new THREE.BufferGeometry();
        for (const [name, attribute] of Object.entries(face.mesh.geometry.attributes)) {
          geometry.setAttribute(name, new THREE.BufferAttribute(attribute.array.slice(face.i * attribute.itemSize, (face.i + 4) * attribute.itemSize), attribute.itemSize));
        }
        geometry.setIndex([0, 1, 2, 0, 2, 3]);
        const material = face.mesh.material.clone();
        material.defines = { ...face.mesh.material.defines };
        const previewMode = { value: 0 };
        material.onBeforeCompile = shader => {
          face.mesh.material.onBeforeCompile(shader);
          if (!material.defines.HK_SCAN_SURFACES || shader.uniforms.hkSurfacesColor?.value !== surfaces.color
            || shader.uniforms.hkSurfacesNormal?.value !== surfaces.normal
            || shader.uniforms.hkSurfacesArm?.value !== surfaces.arm) {
            throw new Error('Building shader is missing its scanned surface maps');
          }
          shader.uniforms.hkPreviewMode = previewMode;
          shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float hkPreviewMode;');
          shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', 'gl_FragColor = vec4(mix(vec3(hkGlass), totalEmissiveRadiance, hkPreviewMode), 1.0);');
          for (const chunk of ['tonemapping_fragment', 'colorspace_fragment', 'fog_fragment', 'premultiplied_alpha_fragment', 'dithering_fragment']) {
            shader.fragmentShader = shader.fragmentShader.replace(`#include <${chunk}>`, '');
          }
        };
        material.customProgramCacheKey = () => 'building-window-mask';
        const scene = new THREE.Scene();
        scene.add(new THREE.Mesh(geometry, material));
        const width = face.z1 - face.z0;
        const height = Math.min(face.fh, geometry.attributes.aBounds.getW(0));
        const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 100);
        camera.position.set(face.x + face.outward * 40, face.y0 + height / 2, (face.z0 + face.z1) / 2);
        camera.lookAt(face.x, camera.position.y, camera.position.z);
        await renderer.compileAsync(scene, camera);
        renderer.render(scene, camera);
        const pixels = new Uint8Array(2048 * 64 * 4);
        renderer.readRenderTargetPixels(target, 0, 0, 2048, 64, pixels);
        const edge = Math.max(1, Math.floor(0.12 / width * 2048));
        let opening = 0;
        for (let y = 0; y < 64; y++) for (let x = 0; x < 2048; x++) {
          const glass = pixels[(y * 2048 + x) * 4];
          if (face.style !== 4 && (x < edge || x >= 2048 - edge) && glass > 2) throw new Error(`Window reaches facade corner (style ${face.style})`);
          if (glass > 128) opening++;
        }
        if (face.style === 4) {
          // A shop is either open or shuttered across the whole pane. Pixel-dependent
          // hashes used to create hundreds of alternating horizontal shutter strips.
          for (const row of [18, 32, 45]) {
            let transitions = 0, previous = pixels[(row * 2048 + 2) * 4] > 128;
            for (let x = 3; x < 2046; x++) {
              const current = pixels[(row * 2048 + x) * 4] > 128;
              if (current !== previous) transitions++;
              previous = current;
            }
            if (transitions > 4) throw new Error(`Shop shutter flickers (kind ${face.kind}, ${transitions} transitions)`);
          }
          previewMode.value = 1;
          renderer.render(scene, camera);
          renderer.readRenderTargetPixels(target, 0, 0, 2048, 64, pixels);
          const colors = new Set();
          for (let i = 0; i < pixels.length; i += 32) colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
          if (opening > 100 && colors.size < 12) throw new Error(`Shop interior failed to render (kind ${face.kind})`);
          shopMasks.push({ kind: face.kind, side: face.outward > 0 ? 'west' : 'east', open: opening > 100, colors: colors.size });
        } else {
          if (opening < 100) throw new Error(`Facade mask has no windows (style ${face.style})`);
          masks.push({ style: face.style, setback: face.y0 > SHOP_H + 1, openingPixels: opening });
        }
        geometry.dispose(); material.dispose();
      }
      target.dispose(); renderer.dispose();
      const materials = new Set();
      for (const mesh of group.children) { mesh.geometry.dispose(); materials.add(mesh.material); }
      for (const material of materials) material.dispose();
      if (shopMasks.filter(f => f.open).length < 4) throw new Error('Too few open shop interiors verified');
      return { surfaceSize, banners, facades: faces.length, masks, shopMasks, contextLost: !!window.__contextLost };
    });
    if (report.contextLost) throw new Error(`${tier}: WebGL context lost`);
    reports.push({ tier, ...report });
    await page.evaluate(() => {
      document.getElementById('overlay')?.classList.add('hidden');
      document.getElementById('loader')?.remove();
    });
    for (const [name, pose] of [
      ['west', [-18, 1.85, 14, 270, 17]],
      ['east', [-24, 1.85, 25, 90, 17]],
      ['corner', [-18, 1.85, -76, 235, 25]],
      ['shops', [-24, 1.85, 14, 270, 0]],
    ]) {
      await page.evaluate(pose => window.__setCam(...pose), pose);
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(out, `${tier}-${name}.png`) });
    }
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ errors, reports }, null, 2));
  console.log(JSON.stringify({ errors, reports }, null, 2));
  if (errors.length) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ errors }, null, 2));
  throw error;
} finally {
  await browser.close();
}
