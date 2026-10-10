// Hong Kong number plates for the reused car models: black letters on yellow at the rear,
// on white at the front. The models' plates are blank panels with no UVs, so addPlateUvs()
// gives them planar ones (x across, y up; u + 1 marks a front-facing plate), and the plate
// material picks one of 16 numbers from an atlas: per material (traffic cars, the hero)
// through userData.plate.index, or from the instance's position (the parked fleet's batch).
// The numbers are invented.
import * as THREE from 'three';

const N = 16;
function plateAtlas() {
  const W = 1024, H = 1024, cw = W / 4, ch = H / 8;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  let seed = 73;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const L = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const nums = Array.from({ length: N }, () => `${L[Math.floor(rnd() * L.length)]}${L[Math.floor(rnd() * L.length)]} ${1 + Math.floor(rnd() * 9998)}`);
  for (let row = 0; row < 8; row++) for (let col = 0; col < 4; col++) {
    const front = row >= 4, i = (row % 4) * 4 + col;
    const x = col * cw, y = row * ch;
    g.fillStyle = front ? '#f4f4f0' : '#f6c61b';
    g.fillRect(x, y, cw, ch);
    g.strokeStyle = '#141414';
    g.lineWidth = 5;
    g.strokeRect(x + 7, y + 7, cw - 14, ch - 14);
    g.fillStyle = '#121212';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 62px "Arial Narrow", Arial, Helvetica, sans-serif';
    g.fillText(nums[i], x + cw / 2, y + ch / 2 + 3, cw - 30);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// planar UVs on every plate panel (material named 'plate') under root
export function addPlateUvs(root) {
  root?.traverse((o) => {
    if (!o.isMesh || o.material?.name !== 'plate' || o.geometry.userData.hkPlateUv) return;
    const g = o.geometry, p = g.attributes.position, n = g.attributes.normal;
    g.computeBoundingBox();
    const b = g.boundingBox, w = b.max.x - b.min.x || 1, h = b.max.y - b.min.y || 1;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const front = n ? n.getZ(i) > 0 : p.getZ(i) > 0;
      // (seen from behind the car its right is -x; from in front, +x)
      const u = front ? (p.getX(i) - b.min.x) / w : (b.max.x - p.getX(i)) / w;
      uv[i * 2] = u + (front ? 1 : 0);
      uv[i * 2 + 1] = (p.getY(i) - b.min.y) / h;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.userData.hkPlateUv = true;
  });
}

let ATLAS = null;
// opts: the plate's MeshStandardMaterial parameters; index: 0..15, or -1 (from the position)
export function plateMaterial(opts = {}, index = -1) {
  ATLAS ??= plateAtlas();
  const m = new THREE.MeshStandardMaterial({ roughness: 0.45, ...opts, color: 0xffffff, map: ATLAS });
  m.name = 'plate';
  m.userData.plate = { value: index };
  m.onBeforeCompile = (s) => {
    s.uniforms.uHkPlate = m.userData.plate;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uHkPlate;\nvarying float vHkPlate;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        {
          vec4 org = vec4(0.0, 0.0, 0.0, 1.0);
          #ifdef USE_BATCHING
            org = batchingMatrix * org;
          #endif
          #ifdef USE_INSTANCING
            org = instanceMatrix * org;
          #endif
          org = modelMatrix * org;
          float h = fract(sin(dot(floor(org.xz * 2.0), vec2(12.9898, 78.233))) * 43758.5453);
          vHkPlate = uHkPlate >= 0.0 ? uHkPlate : floor(h * ${N}.0);
        }`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vHkPlate;')
      .replace('#include <map_fragment>', `{
          // (vMapUv: the plate's own uv, the map's transform being the identity)
          float front = step(1.0, vMapUv.x);
          vec2 lu = clamp(vec2(vMapUv.x - front, vMapUv.y), 0.0, 1.0);
          float idx = mod(floor(vHkPlate + 0.5), ${N}.0);
          vec2 slot = vec2(mod(idx, 4.0), floor(idx / 4.0) + front * 4.0);
          // (canvas row 0 is the top: v counts down from 1)
          vec2 auv = vec2((slot.x + lu.x) / 4.0, 1.0 - (slot.y + 1.0 - lu.y) / 8.0);
          diffuseColor *= texture2D(map, auv);
        }`);
  };
  m.customProgramCacheKey = () => 'hk-plate-v1';
  return m;
}
export const PLATE_COUNT = N;
