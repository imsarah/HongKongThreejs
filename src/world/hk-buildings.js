// Causeway Bay frontage: both sides of the street, generated in code.
// Tong lau (old walk-up tenements with balconies), slim residential towers, older commercial
// blocks with ribbon windows and glass office towers; on every one a ground floor of shops
// under a concrete canopy, with a lit fascia sign. Projecting vertical neon signs hang out
// over the sidewalks, air conditioners sit under the windows, water tanks on the roofs.
//
// The windows are drawn in the facade shader (from world position, per style), so a
// 100 m tower costs a box. Everything is merged per block (chunk) for culling; the small
// parts register with lod.js.
//
// The shop and sign names are invented. No real business, brand or logo is used.
import * as THREE from 'three';
import { HOTEL, EAST, CURB_HEIGHT, CROSS, CROSS_STREETS, DISTRICT, SIDEWALK_W, SIDEWALK_E } from './layout.js';
import { registerLod } from './lod.js';
import { QUALITY } from '../quality.js';
import { mulberry32 } from '../textures/noise.js';

// height of the shop storey (the canopy sits on top of it)
export const SHOP_H = CURB_HEIGHT + 4.6;
const Z_FAR = 900;                 // the frontage runs this far each way
const Z_DETAIL = DISTRICT.zMax + 25;   // signs, balconies and AC units this far

export const HK_FONT = '"PingFang HK","PingFang TC","Noto Sans CJK TC","Noto Sans TC","Microsoft JhengHei","Heiti TC","Source Han Sans TC","WenQuanYi Zen Hei",sans-serif';

// ---------------------------------------------------------------------------
// Invented names. [Chinese, English]
const SHOPS = [
  ['永記茶餐廳', 'WING KEE CAFE'], ['金鳳燒臘', 'GOLDEN PHOENIX BBQ'], ['興隆粥麵', 'HING LUNG CONGEE'],
  ['好運珠寶金行', 'LUCKY STAR JEWELLERY'], ['新華藥房', 'SUN WAH PHARMACY'], ['德昌找換', 'TAK CHEONG EXCHANGE'],
  ['利興電器', 'LEE HING ELECTRICAL'], ['明亮眼鏡', 'BRIGHT OPTICAL'], ['祥記涼茶', 'CHEUNG KEE HERBAL TEA'],
  ['東方表行', 'ORIENT WATCH CO.'], ['美華時裝', 'MEI WAH FASHION'], ['發記雲吞麵', 'FAT KEE WONTON'],
  ['海景酒樓', 'SEA VIEW RESTAURANT'], ['寶麗髮廊', 'POLLY HAIR SALON'], ['福來旅行社', 'FOOK LOI TRAVEL'],
  ['綠洲甜品', 'OASIS DESSERTS'], ['華聲琴行', 'WAH SING MUSIC'], ['銀河卡拉OK', 'GALAXY KARAOKE'],
  ['大利文具', 'TAI LEE STATIONERY'], ['富記士多', 'FU KEE STORE'], ['金山海味', 'GOLD HILL DRIED SEAFOOD'],
  ['百合花店', 'LILY FLORIST'], ['同心鞋莊', 'TUNG SUM SHOES'], ['悅來冰室', 'YUET LOI ICE CAFE'],
  ['天天水果', 'DAILY FRUIT'], ['嘉麗化妝品', 'KA LAI COSMETICS'], ['長城手機', 'GREAT WALL MOBILE'],
  ['萬豐米舖', 'MAN FUNG RICE'], ['添好麵家', 'TIM HO NOODLES'], ['合興五金', 'HOP HING HARDWARE'],
  ['新潮影音', 'NEW WAVE AUDIO'], ['安康醫務所', 'ON HONG CLINIC'],
];
const VERTS = [
  '酒家', '押', '麻雀', '大藥房', '金行', '冰室', '時裝', '眼鏡', '找換', '表行', '涼茶', '髮廊',
  '卡拉OK', '旅行社', '海鮮', '火鍋', '燒臘', '茶餐廳', '電器', '賓館', '牙科醫生', '補習中心',
  '跌打', '夜粥', '醫務所', '酒店', '桑拿', '粥麵', '當舖', '中醫', '雀館', '鐘錶',
];
const ADS = [['週年大減價', 'ANNIVERSARY SALE'], ['夏日新品', 'SUMMER COLLECTION'], ['全場半價', 'HALF PRICE'], ['盛大開幕', 'GRAND OPENING']];

const NEON = ['#ff3b5c', '#ffd23f', '#36f1cd', '#5fb0ff', '#ff7a2f', '#f45dff', '#7dff6a', '#ffffff'];
const BOARD_BG = ['#c8102e', '#f7d117', '#0b6e4f', '#ffffff', '#163b7a', '#e45d1f', '#111111', '#7a1f6e'];

// ---------------------------------------------------------------------------
// Sign atlas: 32 vertical signs (top half) and 32 horizontal boards (bottom half).
function signAtlas() {
  const S = QUALITY.signAtlas < 1 ? 1024 : 2048, k = S / 2048;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#1a1a1a';
  g.fillRect(0, 0, S, S);
  const rnd = mulberry32(8888);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const uvRect = (x, y, w, h) => [x / S, 1 - (y + h) / S, (x + w) / S, 1 - y / S];
  const vert = [], board = [];
  const VW = 128 * k, VH = 512 * k, HW = 512 * k, HH = 128 * k;
  for (let i = 0; i < 32; i++) {
    const x = (i % 16) * VW, y = Math.floor(i / 16) * VH;
    const text = VERTS[i % VERTS.length];
    const lightbox = rnd() < 0.45;
    const bg = lightbox ? pick(['#ffffff', '#ffe14d', '#d4142e', '#0e5aa7']) : pick(['#151515', '#24131c', '#0f1a24']);
    const fg = lightbox ? (bg === '#ffffff' || bg === '#ffe14d' ? pick(['#c8102e', '#0b3d91', '#111111']) : '#ffffff') : pick(NEON);
    g.fillStyle = bg;
    g.fillRect(x + 4 * k, y + 4 * k, VW - 8 * k, VH - 8 * k);
    // the neon tube border
    g.save();
    g.strokeStyle = lightbox ? 'rgba(0,0,0,0.25)' : pick(NEON);
    g.lineWidth = 5 * k;
    if (!lightbox) { g.shadowColor = g.strokeStyle; g.shadowBlur = 10 * k; }
    g.strokeRect(x + 12 * k, y + 12 * k, VW - 24 * k, VH - 24 * k);
    g.restore();
    const chars = [...text.replace('OK', '\u0001')].map((c) => (c === '\u0001' ? 'OK' : c));
    const n = chars.length;
    const fs = Math.min(VW * 0.7, (VH - 50 * k) / n * 0.92);
    g.save();
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 ${fs}px ${HK_FONT}`;
    if (!lightbox) { g.shadowColor = fg; g.shadowBlur = 14 * k; }
    const step = (VH - 40 * k) / n;
    chars.forEach((c, j) => {
      const sz = c.length > 1 ? fs * 0.55 : fs;
      g.font = `900 ${sz}px ${HK_FONT}`;
      g.fillText(c, x + VW / 2, y + 20 * k + step * (j + 0.5));
    });
    g.restore();
    vert.push(uvRect(x + 4 * k, y + 4 * k, VW - 8 * k, VH - 8 * k));
  }
  for (let i = 0; i < 32; i++) {
    const x = (i % 4) * HW, y = 1024 * k + Math.floor(i / 4) * HH;
    const ad = i >= 28;
    const [zh, en] = ad ? ADS[i - 28] : SHOPS[i % SHOPS.length];
    const bg = ad ? null : pick(BOARD_BG);
    if (ad) {
      const gr = g.createLinearGradient(x, y, x + HW, y + HH);
      const pal = [['#ff2d6f', '#ffb13b'], ['#1fc8db', '#2c77ff'], ['#ffe600', '#ff3d00'], ['#8e2de2', '#ff4b8b']][i - 28];
      gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]);
      g.fillStyle = gr;
    } else g.fillStyle = bg;
    g.fillRect(x + 3 * k, y + 3 * k, HW - 6 * k, HH - 6 * k);
    const light = !ad && (bg === '#ffffff' || bg === '#f7d117');
    const fg = ad ? '#ffffff' : light ? pick(['#c8102e', '#163b7a', '#111111', '#0b6e4f']) : pick(['#ffffff', '#ffe14d', '#ffffff']);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const fs = Math.min(HH * 0.56, (HW - 30 * k) / [...zh].length * 0.95);
    g.font = `900 ${fs}px ${HK_FONT}`;
    g.fillText(zh, x + HW / 2, y + HH * 0.4);
    g.font = `700 ${HH * 0.17}px Arial, Helvetica, sans-serif`;
    g.fillText(en, x + HW / 2, y + HH * 0.82, HW - 30 * k);
    board.push(uvRect(x + 3 * k, y + 3 * k, HW - 6 * k, HH - 6 * k));
  }
  // a dark patch for the sign boxes' edges
  g.fillStyle = '#202020';
  g.fillRect(S - 8, S - 8, 8, 8);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.userData.size = [S, S];
  return { tex: t, vert, board, edge: [1 - 3 / S, 3 / S, 1 - 3 / S, 3 / S] };
}

// ---------------------------------------------------------------------------
// Geometry builder: quads with normal, colour, uv and a per-vertex facade code
// aFac = (style, floor height, bay width, seed).
class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.f = []; this.idx = []; }
  // o: corner; u, v: edges (n = u x v points at the viewer); uvr: [u0, v0, u1, v1]
  quad(o, u, v, col, fac = FAC0, uvr = null) {
    const b = this.p.length / 3;
    const nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0];
    const l = Math.hypot(nx, ny, nz) || 1;
    const P = [o, [o[0] + u[0], o[1] + u[1], o[2] + u[2]], [o[0] + u[0] + v[0], o[1] + u[1] + v[1], o[2] + u[2] + v[2]], [o[0] + v[0], o[1] + v[1], o[2] + v[2]]];
    const r = uvr ?? [0, 0, 1, 1];
    const UV = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
    for (let i = 0; i < 4; i++) {
      this.p.push(...P[i]); this.n.push(nx / l, ny / l, nz / l);
      this.c.push(col.r, col.g, col.b); this.uv.push(...UV[i]); this.f.push(...fac);
    }
    this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  // axis-aligned box; faces: per-face { col, fac, uv, skip } overrides by key px nx py ny pz nz
  box(x0, x1, y0, y1, z0, z1, col, fac = FAC0, faces = {}) {
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    const F = {
      px: [[x1, y0, z1], [0, 0, -dz], [0, dy, 0]], nx: [[x0, y0, z0], [0, 0, dz], [0, dy, 0]],
      pz: [[x0, y0, z1], [dx, 0, 0], [0, dy, 0]], nz: [[x1, y0, z0], [-dx, 0, 0], [0, dy, 0]],
      py: [[x0, y1, z0], [0, 0, dz], [dx, 0, 0]], ny: [[x0, y0, z0], [dx, 0, 0], [0, 0, dz]],
    };
    for (const k in F) {
      const o = faces[k] ?? {};
      if (o.skip) continue;
      this.quad(...F[k], o.col ?? col, o.fac ?? fac, o.uv ?? null);
    }
  }
  get empty() { return this.p.length === 0; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aFac', new THREE.Float32BufferAttribute(this.f, 4));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}
const FAC0 = [5, 3, 3, 0];
const ST = { tong: 0, resi: 1, glass: 2, ribbon: 3, shop: 4, blank: 5 };

// ---------------------------------------------------------------------------
// The facade material: windows, frames, curtains, lit rooms, shopfronts, tile grain and
// rain streaks, all from world position.
function facadeMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.0 });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aFac;\nvarying vec4 vHkF;\nvarying vec3 vHkP;\nvarying vec3 vHkN;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vHkF = aFac;
        vHkP = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vHkN = normal;`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec4 vHkF;
        varying vec3 vHkP;
        varying vec3 vHkN;
        float hkH(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        float hkN1(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hkH(i), hkH(i + vec2(1, 0)), u.x), mix(hkH(i + vec2(0, 1)), hkH(i + vec2(1, 1)), u.x), u.y); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float hkGlass = 0.0;
        {
          vec3 hN = normalize(vHkN);
          float hkV = 1.0 - abs(hN.y);
          float st = vHkF.x, fh = vHkF.y, bay = vHkF.z;
          // (the seed rounded: an interpolated float fed to the hashes sparkles per pixel)
          float sd = floor(vHkF.w * 997.0 + 0.5) * 0.0371;
          float along = abs(hN.x) > abs(hN.z) ? vHkP.z : vHkP.x;
          vec3 wall = diffuseColor.rgb;
          // mosaic tile grain, rain streaks and grime at the foot of each floor
          wall *= 0.95 + 0.07 * hkH(floor(vec2(along, vHkP.y) * 9.0) + sd);
          float sk = hkN1(vec2(along * 1.3 + sd * 50.0, vHkP.y * 0.08));
          wall *= 1.0 - 0.28 * smoothstep(0.55, 0.95, sk) * (0.5 + 0.5 * hkN1(vec2(along * 6.0, vHkP.y * 0.7)));
          wall *= 0.9 + 0.1 * smoothstep(0.0, 25.0, vHkP.y);
          vec3 col = wall;
          float y = vHkP.y - ${SHOP_H.toFixed(3)};
          float f = fract(y / fh), fl = floor(y / fh);
          float bx = fract(along / bay), bi = floor(along / bay);
          float r1 = hkH(vec2(bi, fl) + sd * 17.0), r2 = hkH(vec2(bi + 7.1, fl * 1.3) + sd * 3.0);
          vec3 glass = vec3(0.06, 0.075, 0.09) * (0.7 + 0.6 * r2);
          vec3 lit = mix(vec3(1.0, 0.7, 0.4), vec3(0.8, 0.92, 1.0), step(0.45, r2)) * (0.55 + 0.6 * r1);
          float isLit = step(0.8, hkH(vec2(bi * 0.37, fl) + sd * 31.0));
          float win = 0.0;
          if (hN.y > 0.5) {
            col = wall * 0.5;   // roofs: weathered concrete
          } else if (hkV > 0.5 && st < 3.5 && y > 0.0) {
            float frame = 0.0;
            if (st < 0.5) {
              // tong lau: a window per bay with a frame and a centre mullion, a sill
              float wx = step(0.16, bx) * step(bx, 0.84), wy = step(0.3, f) * step(f, 0.88);
              float inner = step(0.19, bx) * step(bx, 0.81) * step(0.33, f) * step(f, 0.85);
              float mull = step(abs(bx - 0.5), 0.012) * inner;
              frame = wx * wy * (1.0 - inner) + mull;
              win = inner - mull;
              col = mix(col, wall * 1.15, step(0.27, f) * step(f, 0.3) * step(0.13, bx) * step(bx, 0.87));
              col = mix(col, vec3(0.74, 0.76, 0.76) * (0.85 + 0.2 * r2), frame);
            } else if (st < 1.5) {
              // residential tower: narrow bays, a solid pier every fourth
              float pier = step(mod(bi, 4.0), 0.5);
              float wy = step(0.2, f) * step(f, 0.9);
              float inner = step(0.12, bx) * step(bx, 0.88) * step(0.23, f) * step(f, 0.87);
              frame = step(0.09, bx) * step(bx, 0.91) * wy * (1.0 - inner) * (1.0 - pier);
              win = inner * (1.0 - pier);
              col = mix(col, vec3(0.7, 0.72, 0.72), frame);
            } else if (st < 2.5) {
              // curtain wall: tinted glass, mullions and spandrels
              float mull = 1.0 - step(0.035, bx) * step(bx, 0.965);
              float span = 1.0 - step(0.14, f);
              win = (1.0 - mull) * (1.0 - span);
              col = mix(col * 0.75, col * 1.05, mull);
              glass = mix(vec3(0.12, 0.2, 0.22), vec3(0.16, 0.2, 0.26), step(0.5, fract(sd * 9.0))) * (0.85 + 0.3 * r2);
              isLit *= step(0.4, r2);
            } else {
              // ribbon windows of the older commercial blocks
              float mull = step(bx, 0.035);
              float wy = step(0.34, f) * step(f, 0.86);
              win = wy * (1.0 - mull);
              col = mix(col, vec3(0.62, 0.64, 0.64), wy * mull);
            }
            // curtains and blinds in the dark rooms
            float curtain = step(0.6, r2) * (1.0 - isLit) * step(st, 1.5);
            vec3 cc = mix(vec3(0.78, 0.7, 0.55), vec3(0.55, 0.62, 0.72), step(0.82, r2)) * 0.5;
            col = mix(col, mix(glass, cc, curtain), win);
            hkGlass = win * (1.0 - curtain);
            totalEmissiveRadiance += win * isLit * lit * 0.9;
          } else if (hkV > 0.5 && st > 3.5 && st < 4.5) {
            // shopfront: glazing into a lit shop (the vertex colour is the shop's light),
            // mullions, a transom; a roller shutter down here and there
            float sb = fract(along / 2.3);
            float mull = step(sb, 0.025);
            float yy = vHkP.y;
            float transom = step(3.0, yy) * step(yy, 3.12);
            float shutter = step(0.84, hkH(vec2(floor(along / 4.6), sd)));
            float glassA = (1.0 - mull) * (1.0 - transom) * (1.0 - shutter);
            // inside: a lit ceiling, shelves of goods in all colours, a dim back wall
            // (small packs on the shelves, darker gaps between them)
            vec2 gc = vec2(along * 6.5, yy * 7.0);
            float cell = hkH(floor(gc) + sd * 5.0);
            float pack = step(0.18, fract(gc.x)) * step(0.12, fract(gc.y)) * step(0.25, cell);
            vec3 goods = vec3(0.3 + 0.7 * fract(cell * 3.1), 0.25 + 0.6 * fract(cell * 7.3), 0.25 + 0.7 * fract(cell * 13.7));
            float shelves = step(0.4, yy) * step(yy, 2.25) * step(0.3, fract(along * 0.45 + sd));
            float ceiling = smoothstep(2.6, 2.9, yy) * (0.7 + 0.3 * step(0.5, fract(along * 0.8)));
            vec3 inside = wall * (0.12 + ceiling * 1.4 + 0.1 * smoothstep(2.3, 0.3, yy)) + goods * wall * shelves * pack * 0.38;
            col = mix(vec3(0.16, 0.16, 0.17), wall * 0.12, glassA);
            totalEmissiveRadiance += inside * glassA * smoothstep(0.05, 0.4, yy);
            vec3 shut = vec3(0.5, 0.52, 0.52) * (0.82 + 0.18 * step(0.5, fract(yy * 9.0)));
            col = mix(col, shut, shutter);
            hkGlass = glassA * 0.6;
          } else if (hkV > 0.5 && st > 4.5) {
            // blank party walls and backs: a small window here and there
            float sm = step(0.42, bx) * step(bx, 0.58) * step(0.4, f) * step(f, 0.7) * step(0.86, r1) * step(0.0, y);
            col = mix(col * 0.92, glass, sm);
            hkGlass = sm;
          }
          diffuseColor.rgb = col;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.28, hkGlass);`);
  };
  m.customProgramCacheKey = () => 'hk-facade-v1';
  return m;
}

// ---------------------------------------------------------------------------
// Palettes (sRGB hex)
const TONG = [0xe6d8b8, 0xbcd2b4, 0xa9c4d2, 0xe0b8ae, 0xe6d08e, 0xbab6ae, 0xa6d2c2, 0xd9c7a9, 0xc9b4c9, 0xe8e0d0];
const TOWER = [0xe8e4dc, 0xdacab0, 0xe2c8c0, 0xc8c8c4, 0xb4a08c, 0xd8dcd8, 0xece6d6, 0xc2ccd0];
const OFFICE = [0x9aa8ac, 0x8f9ea6, 0xb0b8b6, 0x7e8f94];
const SHOPLIGHT = [0xfff1d6, 0xffe0b0, 0xe8f2ff, 0xfff8ee, 0xffd0c8, 0xd8ffe8, 0xfff4c0];
const GRANITE = [0x8c8680, 0x6e6a66, 0xa49890, 0x5a5652, 0xb0a89c];

const col = (hex) => new THREE.Color(hex);

// ---------------------------------------------------------------------------
// Plan: building specs along one side. side -1 west (faces +x), +1 east (faces -x).
function plan(side) {
  const rnd = mulberry32(side < 0 ? 85201 : 85202);
  const breaks = side < 0 ? CROSS_STREETS.map((c) => [c.z - CROSS.gap, c.z + CROSS.gap]) : [];
  const specs = [];
  let z = -Z_FAR;
  while (z < Z_FAR) {
    const br = breaks.find(([a, b]) => z >= a - 0.01 && z < b);
    if (br) { z = br[1]; continue; }
    const r = rnd();
    const kind = r < 0.45 ? 'tong' : r < 0.78 ? 'resi' : r < 0.9 ? 'ribbon' : 'glass';
    let w = kind === 'tong' ? 5.5 + rnd() * 4 : kind === 'resi' ? 12 + rnd() * 10 : 14 + rnd() * 12;
    const next = breaks.find(([a]) => a > z);
    if (next && z + w > next[0] - 4) w = next[0] - z;             // the corner building runs to the cross street
    if (z + w > Z_FAR) w = Z_FAR - z;
    const floors = kind === 'tong' ? 5 + Math.floor(rnd() * 4)
      : kind === 'resi' ? 16 + Math.floor(rnd() * 22)
        : kind === 'ribbon' ? 7 + Math.floor(rnd() * 8) : 14 + Math.floor(rnd() * 20);
    const fh = kind === 'tong' ? 3.25 : kind === 'glass' ? 3.8 : kind === 'ribbon' ? 3.4 : 2.95;
    const pal = kind === 'tong' ? TONG : kind === 'glass' ? OFFICE : TOWER;
    specs.push({
      side, z0: z, z1: z + w, kind, floors, fh,
      H: SHOP_H + floors * fh,
      color: pal[Math.floor(rnd() * pal.length)],
      bay: kind === 'tong' ? 2.4 + rnd() * 0.5 : kind === 'resi' ? 1.5 + rnd() * 0.3 : kind === 'glass' ? 1.5 : 2.6,
      setback: kind === 'resi' && rnd() < 0.6 ? 1.5 + rnd() * 2.5 : kind === 'glass' && rnd() < 0.5 ? 2 : 0,
      podium: kind === 'resi' || kind === 'glass' ? 1 + Math.floor(rnd() * 3) : 0,
      balcony: kind === 'tong' && rnd() < 0.6,
      seed: rnd(),
      rnd: mulberry32(Math.floor(rnd() * 1e9)),
    });
    // a narrow back lane between some buildings on the east side
    z += w + (side > 0 && rnd() < 0.12 ? 2.2 + rnd() : 0);
  }
  return specs;
}

// ---------------------------------------------------------------------------
function buildOne(S, C, atlas) {
  const s = S.side, R = S.rnd;
  const xF = s < 0 ? HOTEL.frontX : EAST.frontX;
  const ox = -s;                                  // outward (toward the street)
  const D = s < 0 ? xF - HOTEL.backX : EAST.backX - xF;
  // local depth d (outward from the facade line) -> world x range
  const X = (d0, d1) => { const a = xF + ox * d0, b = xF + ox * d1; return [Math.min(a, b), Math.max(a, b)]; };
  const front = s < 0 ? 'px' : 'nx';              // the face looking at the street
  const back = s < 0 ? 'nx' : 'px';
  const { z0, z1, fh } = S;
  const near = Math.abs((z0 + z1) / 2) < Z_DETAIL;
  const wallCol = col(S.color);
  const style = ST[S.kind];
  const fac = [style, fh, S.bay, S.seed];
  const blank = [ST.blank, fh, 3.2, S.seed];
  const B = C.base;

  // --- shop storey: a recessed glazed core, granite piers between the shops, a fascia board
  // with the shop's sign and the concrete canopy over the sidewalk
  const shopLight = col(SHOPLIGHT[Math.floor(R() * SHOPLIGHT.length)]);
  {
    const [cx0, cx1] = X(-D, -0.45);
    B.box(cx0, cx1, 0, SHOP_H, z0, z1, shopLight, [ST.shop, fh, 2.3, S.seed], { [back]: { skip: true }, py: { skip: true }, ny: { skip: true }, pz: { col: wallCol, fac: blank }, nz: { col: wallCol, fac: blank } });
    const granite = col(GRANITE[Math.floor(R() * GRANITE.length)]);
    const w = z1 - z0;
    const nShops = Math.max(1, Math.round(w / (4 + R() * 2.5)));
    const sw = w / nShops;
    for (let i = 0; i <= nShops; i++) {
      const zc = z0 + i * sw;
      const [px0, px1] = X(-0.45, 0.02);
      B.box(px0, px1, 0, SHOP_H, Math.max(z0, zc - 0.25), Math.min(z1, zc + 0.25), granite, [ST.blank, 9, 9, 0]);
    }
    // fascia board per shop (under the canopy) with an atlas sign
    for (let i = 0; i < nShops; i++) {
      const za = z0 + i * sw + 0.3, zb = z0 + (i + 1) * sw - 0.3;
      if (zb - za < 1.2) continue;
      const [fx0, fx1] = X(-0.05, 0.12);
      const slot = atlas.board[Math.floor(R() * 28)];
      C.boards.box(fx0, fx1, 3.3, SHOP_H - 0.1, za, zb, WHITE, FAC0, { [front]: { uv: slot }, [back]: { skip: true }, py: { uv: atlas.edge }, ny: { uv: atlas.edge }, pz: { uv: atlas.edge }, nz: { uv: atlas.edge } });
    }
    // the canopy: a concrete slab over the sidewalk, its edge painted
    const swW = s < 0 ? SIDEWALK_W.x1 - SIDEWALK_W.x0 : SIDEWALK_E.x1 - SIDEWALK_E.x0;
    const depth = Math.min(swW - 2.2, 1.4 + R() * 1.0);
    const [kx0, kx1] = X(0, depth);
    const edge = col(R() < 0.5 ? 0xe8e4dc : S.color).multiplyScalar(0.92);
    B.box(kx0, kx1, SHOP_H, SHOP_H + 0.28, z0 + 0.05, z1 - 0.05, edge, [ST.blank, 9, 9, S.seed], { [back]: { skip: true } });
  }

  // --- the body above the shops
  const H = S.H;
  if (S.podium && S.setback > 0) {
    const yP = SHOP_H + S.podium * fh;
    const [ax0, ax1] = X(-D, 0);
    B.box(ax0, ax1, SHOP_H, yP, z0, z1, wallCol.clone().multiplyScalar(0.92), [ST.ribbon, fh, 2.6, S.seed], { [back]: { fac: blank }, pz: { fac: blank }, nz: { fac: blank }, ny: { skip: true } });
    const [tx0, tx1] = X(-D + 2, -S.setback);
    B.box(tx0, tx1, yP, H, z0 + 0.6, z1 - 0.6, wallCol, fac, { [back]: { fac: blank }, pz: { fac: blank }, nz: { fac: blank }, ny: { skip: true } });
  } else {
    const [ax0, ax1] = X(-D, 0);
    B.box(ax0, ax1, SHOP_H, H, z0, z1, wallCol, fac, { [back]: { fac: blank }, pz: { fac: blank }, nz: { fac: blank }, ny: { skip: true } });
  }
  // parapet and roof clutter: water tanks, a lift motor room, an antenna
  {
    const [rx0, rx1] = X(-D + 0.5, -(S.setback || 0) - 0.3);
    const top = H;
    const tank = col(R() < 0.5 ? 0xc9c4b6 : 0x8f9a9e);
    const tw = Math.min(4, (z1 - z0) * 0.4);
    const tz = z0 + 0.6 + R() * Math.max(0, z1 - z0 - tw - 1.2);
    const tx = rx0 + R() * Math.max(0, rx1 - rx0 - 4);
    B.box(tx, tx + 3.5, top, top + 2.2 + R(), tz, tz + tw, tank);
    if (S.kind !== 'tong' && R() < 0.8) {
      const hx = rx0 + 2 + R() * Math.max(0, rx1 - rx0 - 8);
      B.box(hx, hx + 5, top, top + 3.2, z0 + 1, Math.min(z1 - 1, z0 + 6), wallCol.clone().multiplyScalar(0.85), blank);
    }
    if (R() < 0.35) {
      const ax = (rx0 + rx1) / 2, az = (z0 + z1) / 2;
      B.box(ax - 0.06, ax + 0.06, top, top + 6 + R() * 6, az - 0.06, az + 0.06, col(0x555555));
    }
    // a big rooftop billboard on some of the shorter buildings facing the street
    if (near && S.kind !== 'resi' && R() < 0.25 && z1 - z0 > 8) {
      const [bx0, bx1] = X(-1.2, -0.9);
      const slot = atlas.board[28 + Math.floor(R() * 4)];
      C.boards.box(bx0, bx1, top + 0.8, top + 0.8 + (z1 - z0 - 1) * 0.25, z0 + 0.5, z1 - 0.5, WHITE, FAC0, { [front]: { uv: slot }, py: { uv: atlas.edge }, ny: { uv: atlas.edge }, pz: { uv: atlas.edge }, nz: { uv: atlas.edge }, [back]: { uv: atlas.edge } });
      const [sx0, sx1] = X(-1.6, -1.2);
      for (const zz of [z0 + 1, z1 - 1.4]) C.detail.box(sx0, sx1, top, top + 0.9, zz, zz + 0.3, col(0x3c3c3c));
    }
  }
  if (!near) return;

  // --- balconies of the tong lau: a slab and a solid parapet every floor
  if (S.balcony) {
    const par = wallCol.clone().multiplyScalar(1.06);
    for (let k = 1; k < S.floors; k++) {
      const y = SHOP_H + k * fh;
      const [bx0, bx1] = X(0, 0.9);
      B.box(bx0, bx1, y - 0.14, y, z0 + 0.12, z1 - 0.12, par, blank, { [back]: { skip: true } });
      const [qx0, qx1] = X(0.8, 0.9);
      B.box(qx0, qx1, y, y + 1.05, z0 + 0.12, z1 - 0.12, par, blank, { [back]: { skip: true } });
      // the side walls of the balcony
      for (const zz of [z0 + 0.12, z1 - 0.22]) B.box(bx0, bx1, y, y + 1.05, zz, zz + 0.1, par, blank, { [back]: { skip: true } });
    }
  }

  // --- air conditioners under the windows, a few laundry poles on the tong lau
  {
    const ac = col(0xdedbd2), grille = col(0x5d5f60);
    const setback = S.podium && S.setback ? S.setback : 0;
    const k0 = S.podium && S.setback ? S.podium : 0;
    const bays = Math.floor((z1 - z0) / S.bay);
    const share = S.kind === 'glass' ? 0 : S.kind === 'tong' ? 0.35 : 0.25;
    const maxF = Math.min(S.floors, 40);
    for (let k = k0; k < maxF; k++) for (let b = 0; b < bays; b++) {
      if (R() > share) continue;
      const zc = z0 + (b + 0.5) * S.bay + (R() - 0.5) * 0.3;
      if (zc < z0 + 0.7 || zc > z1 - 0.7) continue;
      const y = SHOP_H + k * fh + 0.25;
      const d0 = -setback + (S.balcony && k > 0 ? 0.9 : 0);
      const [ax0, ax1] = X(d0, d0 + 0.5);
      C.detail.box(ax0, ax1, y, y + 0.55, zc - 0.4, zc + 0.4, ac, FAC0, { [back]: { skip: true } });
      const [gx0, gx1] = X(d0 + 0.5, d0 + 0.51);
      C.detail.box(gx0, gx1, y + 0.07, y + 0.48, zc - 0.25, zc + 0.25, grille, FAC0, { [back]: { skip: true } });
      // an outdoor unit's drip stain? no: a laundry pole with clothes on some tong lau floors
      if (S.kind === 'tong' && R() < 0.12) {
        const [lx0, lx1] = X(d0, d0 + 1.6);
        C.detail.box(lx0, lx1, y + 1.6, y + 1.64, zc - 0.02, zc + 0.02, col(0x9c8a5a));
        for (let c = 0; c < 3; c++) {
          const dd = d0 + 0.4 + c * 0.4;
          const [cx0, cx1] = X(dd, dd + 0.3);
          C.detail.box(cx0, cx1, y + 0.9 + R() * 0.2, y + 1.6, zc - 0.015, zc + 0.015, col(LAUNDRY[Math.floor(R() * LAUNDRY.length)]));
        }
      }
    }
  }

  // --- projecting vertical neon signs over the sidewalk, and flat boards on the facade
  {
    const swW = s < 0 ? SIDEWALK_W.x1 - SIDEWALK_W.x0 : SIDEWALK_E.x1 - SIDEWALK_E.x0;
    const n = S.kind === 'tong' ? (R() < 0.75 ? 1 + Math.floor(R() * 2) : 0) : S.kind === 'glass' ? 0 : Math.floor(R() * 2.4);
    for (let i = 0; i < n; i++) {
      const zc = z0 + 0.6 + R() * Math.max(0.1, z1 - z0 - 1.2);
      const h = Math.min(S.H - SHOP_H - 1.5, 3 + R() * 6);
      if (h < 2.5) continue;
      const yb = SHOP_H + 0.9 + R() * Math.max(0.1, Math.min(S.H - SHOP_H - h - 1, 6));
      const out = Math.min(swW - 1.0, 1.0 + R() * 1.2);
      const d0 = (S.balcony ? 1.0 : 0.3) + (S.podium && S.setback ? 0 : 0);
      const [sx0, sx1] = X(d0, d0 + out);
      const slot = atlas.vert[Math.floor(R() * atlas.vert.length)];
      C.signs.box(sx0, sx1, yb, yb + h, zc - 0.16, zc + 0.16, WHITE, FAC0,
        { pz: { uv: slot }, nz: { uv: slot }, px: { uv: atlas.edge }, nx: { uv: atlas.edge }, py: { uv: atlas.edge }, ny: { uv: atlas.edge } });
      // the steel frame holding it off the wall
      const [hx0, hx1] = X(0, d0 + 0.05);
      for (const yy of [yb + 0.4, yb + h - 0.5]) C.detail.box(hx0, hx1, yy, yy + 0.08, zc - 0.05, zc + 0.05, col(0x3a3a3a));
    }
    // a flat board across the first floors of the older commercial blocks
    if ((S.kind === 'ribbon' || (S.kind === 'resi' && S.podium)) && R() < 0.6 && z1 - z0 > 6) {
      const yb = SHOP_H + 0.5, h = Math.min(2.6, fh * 0.8);
      const slot = atlas.board[Math.floor(R() * 28)];
      const [fx0, fx1] = X(0.02, 0.22);
      C.boards.box(fx0, fx1, yb, yb + h, z0 + 0.6, z1 - 0.6, WHITE, FAC0, { [front]: { uv: slot }, [back]: { skip: true }, py: { uv: atlas.edge }, ny: { uv: atlas.edge }, pz: { uv: atlas.edge }, nz: { uv: atlas.edge } });
    }
  }
}
const WHITE = new THREE.Color(1, 1, 1);
const LAUNDRY = [0xf2f2f0, 0x3d6fb6, 0xd8453c, 0xf0d24a, 0x3a3a3a, 0xe58fb0, 0x6fb36a];

// ---------------------------------------------------------------------------
// pause(): optional async yield so the loader can paint
export async function buildHkBuildings(scene, pause = null) {
  const group = new THREE.Group();
  group.name = 'hotels';   // (the name the mirror and the people code know the frontage by)
  const atlas = signAtlas();
  const facade = facadeMaterial();
  const detailMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
  const signMat = new THREE.MeshStandardMaterial({ map: atlas.tex, emissiveMap: atlas.tex, emissive: 0xffffff, emissiveIntensity: 2.2, roughness: 0.45 });
  const boardMat = new THREE.MeshStandardMaterial({ map: atlas.tex, emissiveMap: atlas.tex, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.5 });

  const edges = [-Z_FAR - 1, ...CROSS_STREETS.map((c) => c.z).sort((a, b) => a - b), Z_FAR + 1];
  const chunks = edges.slice(0, -1).map((min, i) => ({ min, max: edges[i + 1], base: new Geo(), detail: new Geo(), signs: new Geo(), boards: new Geo() }));
  const footprints = [];
  let tYield = performance.now();
  for (const side of [-1, 1]) {
    for (const S of plan(side)) {
      if (pause && performance.now() - tYield > 120) { await pause(); tYield = performance.now(); }
      const zc = (S.z0 + S.z1) / 2;
      footprints.push({ z0: S.z0, z1: S.z1, fx: side < 0 ? HOTEL.frontX : EAST.frontX, side, h: S.H });
      if (Math.abs(zc) > QUALITY.hotelFar) continue;
      const C = chunks.find((c) => zc < c.max) ?? chunks[chunks.length - 1];
      buildOne(S, C, atlas);
    }
  }
  for (const c of chunks) {
    const add = (geo, mat, cast, lod) => {
      if (geo.empty) return;
      const m = new THREE.Mesh(geo.geometry(), mat);
      m.castShadow = cast;
      m.receiveShadow = true;
      group.add(m);
      if (lod) registerLod(m, Math.max(c.min, -5000), Math.min(c.max, 5000), 'detail');
    };
    add(c.base, facade, true, false);
    add(c.detail, detailMat, true, true);
    add(c.signs, signMat, true, true);
    add(c.boards, boardMat, false, false);
  }
  group.userData = { footprints, chairs: [], tables: [] };
  scene.add(group);
  return group;
}
