import * as THREE from 'three';
import { QUALITY } from '../quality.js';
import { mulberry32 } from './noise.js';

// Eight invented shop interiors, painted into one atlas. Coordinates below use a
// 512 px design grid so the low tier can build the same art at half resolution.
export const SHOP_TYPES = [1, 1, 1, 6, 2, 7, 5, 6, 1, 6, 3, 1, 1, 4, 7, 1, 5, 1, 7, 0, 0, 7, 3, 1, 0, 6, 5, 0];
export const SHOP_KINDS = ['grocery', 'cafe', 'pharmacy', 'fashion', 'salon', 'electronics', 'jewellery', 'hardware'];
let atlas;
export function shopInteriorAtlas() {
  if (atlas) return atlas;
  const tile = QUALITY.tier === 'low' ? 256 : 512;
  const canvas = document.createElement('canvas');
  canvas.width = tile * 4; canvas.height = tile * 2;
  const g = canvas.getContext('2d');
  const backgrounds = ['#d3c9ad', '#d9c7a2', '#e0e5de', '#c5bbaa', '#a9b9b2', '#a6aeb3', '#c4b39b', '#b6ada1'];
  for (let kind = 0; kind < 8; kind++) {
    const rnd = mulberry32(4281 + kind * 197);
    const rect = (x, y, w, h, color) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
    const text = (label, x, y, size, color = '#e7e2d0') => {
      g.fillStyle = color; g.font = `600 ${size}px sans-serif`; g.fillText(label, x, y);
    };
    const wood = (x, y, w, h) => {
      rect(x, y, w, h, '#735943');
      for (let j = 0; j < 22; j++) rect(x, y + rnd() * h, w, 1 + rnd(), 'rgba(25,15,8,0.15)');
    };
    g.save();
    g.translate((kind % 4) * tile, Math.floor(kind / 4) * tile);
    g.scale(tile / 512, tile / 512);
    rect(0, 0, 512, 512, backgrounds[kind]);
    // Subtle wall grain and a painted skirting band.
    for (let j = 0; j < 1000; j++) rect(rnd() * 512, rnd() * 512, 1 + rnd() * 3, 1, 'rgba(50,35,22,0.035)');
    rect(0, 470, 512, 42, '#6c675c');
    if ([0, 2, 5, 7].includes(kind)) {
      const palette = kind === 2 ? ['#f0eee4', '#91b3a1', '#d9e0da', '#a9bcc3']
        : kind === 5 ? ['#45494b', '#c7cecd', '#809399', '#b6a58b']
          : kind === 7 ? ['#ad8664', '#595e5b', '#d1c1a4', '#787569']
            : ['#cfb54e', '#7c9b72', '#c77458', '#d3ccb2', '#77959b', '#b8a5bc'];
      rect(22, 95, 468, 359, '#736e62');
      for (let row = 0; row < 4; row++) {
        const y = 105 + row * 84;
        rect(31, y, 450, 71, '#353c38');
        let x = 38;
        while (x < 467) {
          const w = (kind === 5 ? 36 : 13) + rnd() * (kind === 5 ? 46 : 21);
          const h = 28 + rnd() * 35;
          const color = palette[Math.floor(rnd() * palette.length)];
          rect(x + 2, y + 70 - h, w - 4, h, color);
          rect(x + 4, y + 72 - h, 2, h - 4, 'rgba(255,255,255,0.25)');
          rect(x + 6, y + 77 - h, w - 12, Math.max(6, h * 0.26), '#e6e0d0');
          rect(x + 7, y + 80 - h, Math.max(3, w - 16), 2, '#626659');
          if (kind === 5) rect(x + 6, y + 94 - h, Math.max(6, w - 13), Math.max(6, h - 26), '#27363d');
          x += w;
        }
        rect(27, y + 71, 458, 8, kind === 2 ? '#adbcb2' : '#89745b');
        for (let x = 45; x < 450; x += 55) {
          rect(x, y + 73, 24, 5, '#ddd5b8');
          rect(x + 3, y + 74, 9, 1, '#8b7962');
        }
      }
      rect(130, 25, 252, 47, kind === 2 ? '#3b6c59' : '#464b42');
      text(['DAILY ESSENTIALS', '', 'HEALTH & CARE', '', '', 'AUDIO / DIGITAL', '', 'TOOLS & REPAIRS'][kind], 149, 55, 18);
    } else if (kind === 1) {
      // Tiled cafe wall, menu boards, a service opening, and timber wainscoting.
      for (let y = 150; y < 370; y += 32) for (let x = 0; x < 512; x += 64) {
        rect(x + 1, y + 1, 62, 30, rnd() < 0.12 ? '#b9bfae' : '#d5d7c5');
      }
      wood(0, 365, 512, 110);
      rect(35, 38, 210, 203, '#6f5540'); rect(42, 45, 196, 187, '#28372f');
      text('TODAY\'S MENU', 59, 74, 19);
      for (const [j, label] of ['MILK TEA', 'NOODLES', 'TOAST', 'RICE SET'].entries()) {
        text(label, 59, 108 + j * 28, 14); text(`${18 + j * 7}`, 195, 108 + j * 28, 14);
      }
      rect(293, 83, 181, 163, '#6b6658'); rect(301, 91, 165, 147, '#343a34');
      rect(289, 244, 187, 9, '#aa9879');
      for (let j = 0; j < 7; j++) { rect(311 + j * 21, 210, 14, 27, '#d8cfb5'); rect(311 + j * 21, 208, 14, 3, '#aba48f'); }
      text('FRESH DAILY', 302, 61, 17, '#685945');
    } else if (kind === 3) {
      wood(32, 59, 448, 12);
      rect(42, 118, 427, 6, '#6b6b62');
      const palette = ['#526b6d', '#a98277', '#e0d2b6', '#77705f', '#788d72', '#575c72'];
      for (let j = 0; j < 11; j++) {
        const x = 50 + j * 37, y = 141 + rnd() * 12;
        g.strokeStyle = '#897d6c'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x + 14, 120); g.lineTo(x + 2, 143); g.lineTo(x + 28, 143); g.closePath(); g.stroke();
        g.fillStyle = palette[Math.floor(rnd() * palette.length)];
        g.beginPath(); g.moveTo(x + 5, y); g.lineTo(x - 4, y + 23); g.lineTo(x + 2, y + 35);
        g.lineTo(x + 6, y + 29); g.lineTo(x + 6, y + 109); g.lineTo(x + 25, y + 109);
        g.lineTo(x + 25, y + 29); g.lineTo(x + 29, y + 35); g.lineTo(x + 35, y + 23);
        g.lineTo(x + 26, y); g.closePath(); g.fill();
      }
      wood(40, 336, 432, 90);
      for (let j = 0; j < 15; j++) rect(52 + j * 27, 312 + rnd() * 6, 24, 15, palette[j % palette.length]);
      text('NEW COLLECTION', 145, 44, 20, '#62564b');
    } else if (kind === 4) {
      for (let j = 0; j < 3; j++) {
        const x = 29 + j * 165;
        wood(x, 52, 127, 239);
        const mirror = g.createLinearGradient(x, 0, x + 115, 270);
        mirror.addColorStop(0, '#a6bcbc'); mirror.addColorStop(0.5, '#d3ddd6'); mirror.addColorStop(1, '#8b9b98');
        g.fillStyle = mirror; g.fillRect(x + 7, 59, 113, 225);
        rect(x + 19, 69, 6, 197, 'rgba(255,255,255,0.22)');
        wood(x - 3, 303, 135, 68);
        for (let k = 0; k < 4; k++) {
          rect(x + 10 + k * 16, 282, 10, 21, ['#637a64', '#cfb27b', '#788b98', '#dfd5b9'][k]);
          rect(x + 13 + k * 16, 278, 4, 5, '#434b44');
        }
      }
    } else {
      // Jewellery display: softly lit niches and velvet stands.
      rect(30, 64, 452, 346, '#72644f');
      for (let row = 0; row < 2; row++) for (let j = 0; j < 4; j++) {
        const x = 42 + j * 112, y = 80 + row * 157;
        rect(x, y, 103, 144, '#e3d5b1'); rect(x + 4, y + 5, 95, 3, '#f4e6bb');
        g.fillStyle = '#4c5754'; g.beginPath(); g.ellipse(x + 51, y + 91, 27, 39, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#cba962'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(x + 51, y + 92, 20, 27, 0, 0.2, Math.PI - 0.2); g.stroke();
        rect(x + 32, y + 128, 37, 7, '#9f8863');
      }
      text('FINE JEWELLERY', 154, 43, 19, '#64563e');
    }
    // Edge shading adds depth to shelves and corners without baking room lighting.
    const shade = g.createLinearGradient(0, 0, 512, 0);
    shade.addColorStop(0, 'rgba(30,25,15,0.16)'); shade.addColorStop(0.15, 'rgba(0,0,0,0)');
    shade.addColorStop(0.85, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(30,25,15,0.16)');
    g.fillStyle = shade; g.fillRect(0, 0, 512, 512);
    g.restore();
  }
  atlas = new THREE.CanvasTexture(canvas);
  atlas.name = 'shop-interior-atlas'; atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = QUALITY.tier === 'low' ? 2 : 4;
  atlas.userData.size = [canvas.width, canvas.height];
  return atlas;
}

// Interior props are ray-traced only inside shop glazing; they add no street meshes.
export const SHOP_INTERIOR_GLSL = /* glsl */`
uniform sampler2D hkShopAtlas;
vec3 hkShopWall(vec2 uv, float kind) {
  vec2 slot = vec2(mod(kind, 4.0), 1.0 - floor(kind / 4.0));
  return texture2D(hkShopAtlas, (slot + clamp(uv, 0.008, 0.992)) / vec2(4.0, 2.0)).rgb;
}
float hkProp(vec3 p, vec3 d, vec3 lo, vec3 hi, out vec3 normal) {
  vec3 safeD = mix(vec3(0.0001), d, step(vec3(0.0001), abs(d)));
  vec3 a = (lo - p) / safeD, b = (hi - p) / safeD;
  vec3 enter = min(a, b), leave = max(a, b);
  float t = max(max(enter.x, enter.y), enter.z);
  float end = min(min(leave.x, leave.y), leave.z);
  normal = t == enter.x ? vec3(-sign(d.x), 0.0, 0.0) : t == enter.y ? vec3(0.0, -sign(d.y), 0.0) : vec3(0.0, 0.0, -sign(d.z));
  return end >= max(t, 0.0) && t > 0.0 ? t : 1e5;
}
vec3 hkShopRoom(vec3 p, vec3 d, float W, float kind, float seed) {
  float H = 3.0, D = kind == 1.0 ? 5.5 : 6.5;
  float tx = d.x > 0.0 ? (W - p.x) / d.x : -p.x / min(d.x, -1e-4);
  float ty = d.y > 0.0 ? (H - p.y) / d.y : -p.y / min(d.y, -1e-4);
  float tz = D / max(d.z, 1e-4), t = min(min(tx, ty), tz);
  vec3 h = p + d * t;
  vec3 rc;
  float ceiling = 0.0;
  if (t == tz) rc = hkShopWall(vec2(h.x / W, h.y / H), kind);
  else if (t == tx) rc = hkShopWall(vec2(d.x > 0.0 ? 1.0 - h.z / D : h.z / D, h.y / H), kind) * 0.72;
  else if (d.y > 0.0) {
    rc = vec3(0.62, 0.6, 0.54);
    float lightRow = step(0.8, fract(h.z / 2.4));
    ceiling = lightRow * step(abs(h.x - W * 0.5), W * 0.3);
  } else {
    vec2 floorUv = h.xz / (kind == 1.0 ? 0.45 : 0.65);
    vec2 fw = max(fwidth(floorUv), vec2(0.001));
    vec2 cell = min(fract(floorUv), 1.0 - fract(floorUv));
    vec2 edge = smoothstep(vec2(0.035) - fw, vec2(0.035) + fw, cell);
    float grout = 1.0 - min(edge.x, edge.y);
    float check = mod(floor(floorUv.x) + floor(floorUv.y), 2.0);
    rc = kind == 1.0 ? mix(vec3(0.3, 0.32, 0.26), vec3(0.53, 0.51, 0.42), check)
      : kind == 3.0 || kind == 6.0 ? vec3(0.3, 0.21, 0.13) * (0.86 + 0.14 * hkN1(h.xz * vec2(10.0, 0.8)))
      : vec3(0.4, 0.43, 0.4);
    rc *= 1.0 - 0.25 * grout;
    #ifdef HK_SCAN_SURFACES
    if (kind == 3.0 || kind == 6.0) {
      rc = hkSurfaceAlbedo(h.xz / 1.7, 2.0) * 0.9;
      rc *= mix(0.84, 1.0, hkSurfaceArm(h.xz / 1.7, 2.0).r);
    } else if (kind != 1.0) {
      rc = hkSurfaceAlbedo(h.xz / 2.0, 3.0) * (kind == 2.0 ? vec3(1.0, 1.03, 1.0) : vec3(0.9));
      rc *= mix(0.85, 1.0, hkSurfaceArm(h.xz / 2.0, 3.0).r);
    }
    #endif
  }
  // A service counter, cafe table or salon chair sits in front of the back wall.
  vec3 lo = vec3(W * 0.12, 0.0, D * 0.58), hi = vec3(W * 0.78, 1.0, D * 0.74);
  vec3 propColor = kind == 2.0 ? vec3(0.45, 0.55, 0.47) : kind == 5.0 ? vec3(0.19, 0.23, 0.24) : vec3(0.32, 0.22, 0.14);
  if (kind == 1.0) { lo = vec3(W * 0.17, 0.71, 2.0); hi = vec3(W * 0.63, 0.81, 3.3); }
  if (kind == 4.0) { lo = vec3(W * 0.31, 0.35, D * 0.52); hi = vec3(W * 0.56, 1.18, D * 0.67); propColor = vec3(0.13, 0.17, 0.16); }
  if (kind == 3.0) { lo = vec3(W * 0.25, 0.0, D * 0.57); hi = vec3(W * 0.75, 0.85, D * 0.75); }
  vec3 normal;
  float tp = hkProp(p, d, lo, hi, normal);
  if (tp < t) {
    h = p + d * tp; t = tp; ceiling = 0.0;
    rc = propColor * (normal.y > 0.5 ? 1.25 : normal.x != 0.0 ? 0.7 : 0.88);
    rc *= 0.92 + 0.08 * hkN1(h.xz * vec2(2.0, 12.0));
    #ifdef HK_SCAN_SURFACES
    if (kind == 1.0 || kind == 3.0 || kind == 7.0) {
      vec2 grainUv = (abs(normal.y) > 0.5 ? h.xz : h.xy) / 1.7;
      rc = hkSurfaceAlbedo(grainUv, 2.0) * (normal.y > 0.5 ? 1.0 : 0.7);
    }
    #endif
    if (kind == 6.0 && normal.y > 0.5) rc = vec3(0.39, 0.46, 0.43);
  }
  // Cafe table legs / salon chair pedestal.
  if (kind == 1.0 || kind == 4.0) {
    vec3 legLo = vec3(W * 0.38, 0.0, kind == 1.0 ? 2.5 : D * 0.57);
    vec3 legHi = legLo + vec3(0.12, 0.74, 0.12);
    float tl = hkProp(p, d, legLo, legHi, normal);
    if (tl < t) { h = p + d * tl; rc = vec3(0.12, 0.12, 0.1); ceiling = 0.0; }
  }
  vec3 light = kind == 2.0 || kind == 5.0 ? vec3(0.9, 0.98, 1.0) : vec3(1.0, 0.86, 0.66);
  float fall = 1.0 - 0.38 * clamp(h.z / D, 0.0, 1.0);
  return rc * light * fall * (0.85 + 0.25 * seed) + ceiling * light * 1.5;
}
`;
