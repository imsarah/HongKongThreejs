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
  // vertical cylinder (sides and top), seg facets
  cyl(x, z, r, y0, y1, col, seg = 12) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const p0 = [x + Math.cos(a0) * r, y0, z + Math.sin(a0) * r], p1 = [x + Math.cos(a1) * r, y0, z + Math.sin(a1) * r];
      this.quad(p1, [p0[0] - p1[0], 0, p0[2] - p1[2]], [0, y1 - y0, 0], col);
      this.tri([x, y1, z], [p1[0], y1, p1[2]], [p0[0], y1, p0[2]], col);
    }
  }
  tri(a, b, c, col) {
    const i = this.p.length / 3;
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0];
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const q of [a, b, c]) { this.p.push(...q); this.n.push(nx, ny, nz); this.c.push(col.r, col.g, col.b); this.uv.push(0, 0); this.f.push(...FAC0); }
    this.idx.push(i, i + 1, i + 2);
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
const ST = { tong: 0, resi: 1, glass: 2, ribbon: 3, shop: 4, blank: 5, rail: 6, bay: 7 };

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
          float finish = fract(vHkF.w * 13.7);
          bool xFace = abs(hN.x) > abs(hN.z);
          float along = xFace ? vHkP.z : vHkP.x;
          vec3 T = xFace ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
          vec3 wall = diffuseColor.rgb;
          vec2 sp = vec2(along, vHkP.y);
          // --- the wall finish: small mosaic tiles, painted render or large tiles
          if (abs(st - ${ST.shop.toFixed(1)}) > 0.5) {
            if (finish < 0.5) {
              vec2 tc = sp / 0.055;
              vec2 fw = fwidth(tc);
              vec2 g = abs(fract(tc) - 0.5);
              vec2 gl = smoothstep(vec2(0.42) - fw, vec2(0.42), g);
              float grout = max(gl.x, gl.y);
              float far = smoothstep(0.25, 0.8, max(fw.x, fw.y));
              grout = mix(grout, 0.3, far);
              float jit = mix(0.9 + 0.16 * hkH(floor(tc) + sd), 0.98, far);
              wall = mix(wall * jit, wall * 0.74, grout);
            } else if (finish < 0.78) {
              wall *= 0.9 + 0.14 * hkN1(sp * 0.35 + sd) + 0.05 * hkN1(sp * 3.1 + sd);
            } else {
              vec2 tc = sp / vec2(0.3, 0.15);
              vec2 fw = fwidth(tc);
              vec2 g = abs(fract(tc + vec2(0.5 * step(0.5, fract(floor(tc.y) * 0.5)), 0.0)) - 0.5);
              vec2 gl = smoothstep(vec2(0.46) - fw, vec2(0.46), g);
              float far = smoothstep(0.25, 0.8, max(fw.x, fw.y));
              wall = mix(wall * (0.94 + 0.1 * hkH(floor(tc) + sd)), wall * 0.8, mix(max(gl.x, gl.y), 0.15, far));
            }
            // rain streaks from the roof and the ledges, darker low down
            float sk = hkN1(vec2(along * 1.3 + sd * 50.0, vHkP.y * 0.06));
            wall *= 1.0 - 0.3 * smoothstep(0.5, 0.95, sk) * (0.45 + 0.55 * hkN1(vec2(along * 7.0, vHkP.y * 0.5)));
            wall *= 0.86 + 0.14 * smoothstep(0.0, 30.0, vHkP.y);
          }
          vec3 col = wall;
          float y = vHkP.y - ${SHOP_H.toFixed(3)};
          float f = fract(y / fh), fl = floor(y / fh);
          float bx = fract(along / bay), bi = floor(along / bay);
          float r1 = hkH(vec2(bi, fl) + sd * 17.0), r2 = hkH(vec2(bi + 7.1, fl * 1.3) + sd * 3.0);
          float isLit = step(0.78, hkH(vec2(bi * 0.37, fl) + sd * 31.0));
          // the view ray in the facade's frame: x along, y up, z into the wall
          vec3 V = vHkP - cameraPosition;
          vec3 rd = vec3(dot(V, T), V.y, dot(V, -hN));
          if (hN.y > 0.5) {
            col = wall * 0.48;   // roofs: weathered concrete
          } else if (hkV > 0.5 && (st < 3.5 || st > 6.5) && y > 0.0) {
            // --- windows: a rectangle in each bay x floor cell, per style
            vec4 wr = st < 0.5 ? vec4(0.17, 0.83, 0.3, 0.87)
              : st < 1.5 ? vec4(0.1, 0.9, 0.22, 0.88)
              : st < 2.5 ? vec4(0.035, 0.965, 0.14, 1.0)
              : st < 3.5 ? vec4(0.0, 1.0, 0.34, 0.86)
              : vec4(0.04, 0.96, 0.06, 0.94);
            float pier = st > 0.5 && st < 1.5 ? step(mod(bi + floor(sd * 3.0), 4.0), 0.5) : 0.0;
            float inWin = step(wr.x, bx) * step(bx, wr.y) * step(wr.z, f) * step(f, wr.w) * (1.0 - pier);
            // parallax reveal: the frame and glass sit rz back in the wall. Where the view ray
            // meets that plane is where frame / glass / room are looked up (bg, fg); a ray that
            // meets it outside the opening sees the reveal (jamb, head or sill) instead.
            float rz = st < 0.5 ? 0.2 : st < 1.5 ? 0.14 : st < 2.5 ? 0.02 : st < 3.5 ? 0.12 : 0.06;
            vec2 po = rd.xy / max(rd.z, 0.08) * rz;
            float bg = bx + po.x / bay, fg = f + po.y / fh;
            float openG = step(wr.x, bg) * step(bg, wr.y) * step(wr.z, fg) * step(fg, wr.w);
            float reveal = inWin * (1.0 - openG);
            float fwB = 0.05 / bay, fwF = 0.05 / fh;   // 5 cm frames
            float inner = step(wr.x + fwB, bg) * step(bg, wr.y - fwB) * step(wr.z + fwF, fg) * step(fg, wr.w - fwF);
            // mullions: one in the middle of the old windows, one per 1.25 m in the ribbons
            float alongG = along + po.x;
            float mullX = st < 0.5 ? step(abs(bg - 0.5), 0.012) : st > 2.5 && st < 3.5 ? step(fract(alongG / 1.25), 0.03) : st > 1.5 && st < 2.5 ? 0.0 : step(abs(bg - 0.62), 0.01);
            float transomY = st < 1.5 ? step(abs(fg - (wr.z + (wr.w - wr.z) * 0.72)), 0.012) : 0.0;
            float glassM = inWin * openG * inner * (1.0 - mullX) * (1.0 - transomY);
            float frameM = inWin * openG * (1.0 - glassM);
            vec3 frameC = st < 0.5 && r2 > 0.55 ? vec3(0.42, 0.5, 0.42) : vec3(0.76, 0.78, 0.78) * (0.85 + 0.2 * r2);
            // the sill and the dark stain that drips from it
            float under = step(wr.x - 0.02, bx) * step(bx, wr.y + 0.02) * (1.0 - pier);
            float sill = under * step(wr.z - 0.03, f) * step(f, wr.z) * step(st, 1.5);
            float drip = under * step(f, wr.z - 0.03) * smoothstep(0.0, wr.z, f) * (0.35 + 0.65 * hkN1(vec2(along * 22.0, y * 0.4 + sd))) * step(st, 3.5);
            col *= 1.0 - 0.28 * drip * (0.5 + 0.5 * fract(sd * 7.0));
            col = mix(col, wall * 1.12, sill);
            col = mix(col, frameC, frameM);
            // the reveal surfaces: the head (soffit) darkest, the jambs mid, the sill light
            float rvShade = fg > wr.w ? 0.45 : fg < wr.z ? 0.95 : 0.7;
            col = mix(col, wall * rvShade, reveal);
            vec3 emitW = vec3(0.0);
            if (glassM > 0.0) {
              // interior mapping: a room the size of the cell, 4.5 m deep, behind the glass
              float W = bay, H = fh, D = st > 1.5 && st < 2.5 ? 7.0 : 4.5;
              vec3 p0 = vec3(clamp(bg, 0.0, 1.0) * W, clamp(fg, 0.0, 1.0) * H, 0.0);
              vec3 d = rd;
              float tx = d.x > 0.0 ? (W - p0.x) / d.x : -p0.x / min(d.x, -1e-4);
              float ty = d.y > 0.0 ? (H - p0.y) / d.y : -p0.y / min(d.y, -1e-4);
              float tz = D / max(d.z, 1e-4);
              float t = min(min(tx, ty), tz);
              vec3 h = p0 + d * t;
              float rr = hkH(vec2(bi * 1.3, fl * 2.1) + sd * 9.0);
              vec3 paint = mix(vec3(0.86, 0.84, 0.78), mix(vec3(0.75, 0.82, 0.86), vec3(0.88, 0.78, 0.68), step(0.5, fract(rr * 5.0))), step(0.55, rr));
              vec3 rc;
              if (t == tz) {
                rc = paint;
                // furniture against the back wall, a picture or a door
                float fur = step(h.x, W * (0.25 + 0.6 * fract(rr * 3.0))) * step(h.x, W) * step(h.y, 0.9 + 0.8 * fract(rr * 11.0)) * step(0.3, fract(rr * 7.0));
                rc = mix(rc, mix(vec3(0.28, 0.2, 0.14), vec3(0.5, 0.44, 0.38), fract(rr * 17.0)), fur);
                rc = mix(rc, vec3(0.32, 0.25, 0.2), step(abs(h.x - W * 0.8), 0.45) * step(h.y, 2.1) * step(0.7, rr));
              } else if (t == tx) {
                rc = paint * 0.85;
                rc = mix(rc, vec3(0.45, 0.36, 0.28), step(h.y, 1.9) * step(1.2, h.z) * step(h.z, 2.6) * step(0.45, rr));   // a wardrobe
              } else {
                rc = d.y > 0.0 ? vec3(0.9, 0.9, 0.88) : mix(vec3(0.42, 0.33, 0.25), vec3(0.6, 0.58, 0.55), step(0.5, rr));
              }
              // light: a ceiling tube in the lit rooms (cool or warm), dim daylight in the rest
              vec3 lc = mix(vec3(1.0, 0.78, 0.52), vec3(0.86, 0.94, 1.0), step(0.4, r2));
              float tube = d.y > 0.0 && t == ty ? smoothstep(0.35, 0.1, abs(h.z - D * 0.45)) * smoothstep(W * 0.4, W * 0.2, abs(h.x - W * 0.5)) : 0.0;
              float fall = 1.0 - 0.55 * clamp(h.z / D, 0.0, 1.0);
              vec3 inside = rc * fall * mix(vec3(0.09), lc * 1.0, isLit) + tube * isLit * lc * 3.0;
              // curtains drawn part way, lit from behind in the lit rooms; grilles low on the tong lau
              float cw = fract(rr * 23.0);
              float curtain = step(0.45, cw) * (step(bg, wr.x + (wr.y - wr.x) * cw * 0.6) + step(wr.y - (wr.y - wr.x) * (cw - 0.45) * 0.8, bg)) * step(st, 1.5);
              vec3 cc = mix(vec3(0.8, 0.7, 0.52), mix(vec3(0.55, 0.62, 0.74), vec3(0.75, 0.45, 0.45), step(0.7, fract(rr * 31.0))), step(0.5, fract(rr * 13.0)));
              inside = mix(inside, cc * mix(vec3(0.12), lc * 0.85, isLit), clamp(curtain, 0.0, 1.0));
              // (the grille is on the wall face, in front of the recess)
              float grille = st < 0.5 && fl < 2.5 && r1 > 0.35 ? max(step(fract(along / 0.12), 0.12), step(fract(y / 0.45), 0.08)) : 0.0;
              // the pane itself: dark and glossy (the sky reflects from the PBR specular), the
              // room shows through it as emitted light
              col = mix(vec3(0.015, 0.018, 0.02), vec3(0.18, 0.2, 0.2), grille);
              emitW = inside * (1.0 - grille) * (st > 1.5 && st < 2.5 ? 0.6 : 1.0);
              hkGlass = 1.0 - grille;
            }
            // distance anti-aliasing: where a window cell shrinks to a few pixels the pattern
            // fades to its average (glass share, average room light), so it never shimmers
            float fwC = max(fwidth(along / bay), fwidth(y / fh));
            float far = smoothstep(0.12, 0.45, fwC);
            float share = (wr.y - wr.x) * (wr.w - wr.z) * (st > 0.5 && st < 1.5 ? 0.75 : 1.0);
            col = mix(col, mix(wall * 0.95, vec3(0.03), share * 0.85), far);
            emitW = mix(emitW, share * mix(vec3(0.06), vec3(0.95, 0.88, 0.78), 0.22) * 0.8, far);
            hkGlass = mix(hkGlass, share * 0.7, far);
            totalEmissiveRadiance += emitW;
          } else if (hkV > 0.5 && st > 3.5 && st < 4.5) {
            // --- shopfront: glazing into a deep lit shop (the vertex colour is its light)
            float shopW = 4.6;
            float sb = fract(along / 2.3);
            float mull = step(sb, 0.02);
            float yy = vHkP.y;
            float transom = step(3.0, yy) * step(yy, 3.14);
            float shopI = floor(along / shopW);
            float sh = hkH(vec2(shopI, sd));
            float shutter = step(0.86, sh);
            float glassA = (1.0 - mull) * (1.0 - transom) * (1.0 - shutter) * step(0.25, yy) * step(yy, 3.0);
            if (glassA > 0.0) {
              float W = shopW, H = 3.0, D = 7.0;
              vec3 p0 = vec3(fract(along / shopW) * W, yy - 0.15, 0.0);
              vec3 d = rd;
              float tx = d.x > 0.0 ? (W - p0.x) / d.x : -p0.x / min(d.x, -1e-4);
              float ty = d.y > 0.0 ? (H - p0.y) / d.y : -p0.y / min(d.y, -1e-4);
              float tz = D / max(d.z, 1e-4);
              float t = min(min(tx, ty), tz);
              vec3 h = p0 + d * t;
              vec3 rc;
              vec2 gc;
              if (t == tz) { gc = h.xy; rc = vec3(0.85); }
              else if (t == tx) { gc = vec2(h.z, h.y); rc = vec3(0.8); }
              else { gc = h.xz; rc = d.y > 0.0 ? vec3(1.0) : vec3(0.62, 0.6, 0.56); }
              // shelves of goods on the walls (small packs in every colour), a counter
              if (t != ty) {
                // (shelf bays 0.45 m high; packs of varied width, many muted, a few bright)
                float row = floor(gc.y / 0.45);
                float px = gc.x * (6.0 + 6.0 * hkH(vec2(row, sh)));
                float cell = hkH(vec2(floor(px), row) + sh * 40.0);
                float inRow = fract(gc.y / 0.45);
                float pack = step(0.1, fract(px)) * step(0.12, inRow) * step(inRow, 0.3 + 0.6 * cell) * step(0.15, cell) * step(0.3, gc.y) * step(gc.y, 2.3);
                vec3 goods = vec3(0.3 + 0.7 * fract(cell * 3.1), 0.25 + 0.65 * fract(cell * 7.3), 0.25 + 0.7 * fract(cell * 13.7));
                goods = mix(vec3(dot(goods, vec3(0.33))), goods, 0.55 + 0.45 * step(0.75, fract(cell * 19.0)));
                rc = mix(rc * 0.6, goods * 0.8, pack);
                rc = mix(rc, vec3(0.32, 0.3, 0.28), step(inRow, 0.06) * step(0.3, gc.y) * step(gc.y, 2.4));
              }
              float tube = d.y > 0.0 && t == ty ? step(0.85, fract(h.z * 0.7)) : 0.0;
              float fall = 1.0 - 0.4 * clamp(h.z / D, 0.0, 1.0);
              vec3 inside = rc * wall * fall * fall * 0.5 + tube * wall * 2.2;
              totalEmissiveRadiance += inside * glassA;
            }
            col = mix(vec3(0.17, 0.17, 0.18), vec3(0.015), glassA);
            vec3 shut = vec3(0.52, 0.54, 0.54) * (0.8 + 0.2 * step(0.5, fract(yy * 10.0))) * (0.85 + 0.15 * hkN1(vec2(along * 3.0, yy)));
            col = mix(col, shut, shutter * step(yy, 3.0));
            hkGlass = glassA;
          } else if (hkV > 0.5 && st > 5.5 && st < 6.5) {
            // --- balcony parapet: a solid upstand, then railing bars with the dark balcony behind
            float yb = fract((vHkP.y - ${SHOP_H.toFixed(3)}) / fh) * fh;
            float bars = step(0.55, yb) * step(yb, 0.98) * (1.0 - step(fract(along / 0.13), 0.22));
            col = mix(col, vec3(0.1, 0.1, 0.1), bars * step(0.4, fract(sd * 5.0)));
          } else if (hkV > 0.5 && st > 4.5 && st < 5.5) {
            // --- blank party walls and backs: a small window here and there
            float sm = step(0.42, bx) * step(bx, 0.58) * step(0.4, f) * step(f, 0.7) * step(0.86, r1) * step(0.0, y);
            col = mix(col * 0.92, vec3(0.03), sm);
            hkGlass = sm;
          }
          diffuseColor.rgb = col;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.06, hkGlass);`);
  };
  m.customProgramCacheKey = () => 'hk-facade-v3';
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
    if (R() < 0.55) {
      // round water tanks on a steel frame
      const n = 1 + Math.floor(R() * 3), r = 0.8 + R() * 0.4;
      for (let i = 0; i < n; i++) {
        const cz = Math.min(z1 - r - 0.4, tz + r + i * (2 * r + 0.3));
        B.box(tx + 0.4, tx + 0.4 + 2 * r, top, top + 0.6, cz - r, cz + r, col(0x4a4a48));
        B.cyl(tx + 0.4 + r, cz, r, top + 0.6, top + 2.4 + R() * 0.8, tank, 14);
      }
    } else B.box(tx, tx + 3.5, top, top + 2.2 + R(), tz, tz + tw, tank);
    // a rooftop hut of corrugated sheet on the old blocks
    if (S.kind === 'tong' && R() < 0.6) {
      const hz = z0 + 0.5, hw = Math.min(z1 - z0 - 1, 4 + R() * 3);
      const [hx0, hx1] = X(-D + 2, -D + 6 + R() * 4);
      B.box(hx0, hx1, top, top + 2.4, hz, hz + hw, col(R() < 0.5 ? 0x8d8a80 : 0x6f7f86), blank);
    }
    // a parapet round the roof
    {
      const pc = wallCol.clone().multiplyScalar(0.9);
      const [px0, px1] = X(-D, -(S.setback || 0));
      const [fx0, fx1] = X(-(S.setback || 0) - 0.2, -(S.setback || 0));
      B.box(fx0, fx1, top, top + 1.0, z0, z1, pc, blank, { ny: { skip: true } });
      B.box(px0, px1, top, top + 1.0, z0, z0 + 0.2, pc, blank, { ny: { skip: true } });
      B.box(px0, px1, top, top + 1.0, z1 - 0.2, z1, pc, blank, { ny: { skip: true } });
    }
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
      B.box(qx0, qx1, y, y + 1.05, z0 + 0.12, z1 - 0.12, par, blank, { [back]: { skip: true }, [front]: { fac: [ST.rail, fh, 3, S.seed] } });
      // the side walls of the balcony
      for (const zz of [z0 + 0.12, z1 - 0.22]) B.box(bx0, bx1, y, y + 1.05, zz, zz + 0.1, par, blank, { [back]: { skip: true } });
    }
  }

  // --- bay windows: glazed boxes 0.55 m out from the residential towers, two bays wide,
  // on every floor (cells aligned with the facade shader's: world z / bay)
  if (S.kind === 'resi' && S.seed > 0.3) {
    const k0 = S.podium && S.setback ? S.podium : 0;
    const d0 = -(S.podium && S.setback ? S.setback : 0);
    const b0 = Math.ceil((z0 + 0.8) / S.bay), b1 = Math.floor((z1 - 0.8) / S.bay);
    const skip = Math.floor(S.seed * 7) % 3;
    for (let b = b0; b + 2 <= b1; b += 3) {
      if ((b + skip) % 6 === 0) continue;
      const za = b * S.bay + 0.04, zb = (b + 2) * S.bay - 0.04;
      for (let k = k0; k < S.floors; k++) {
        const yf = SHOP_H + k * fh;
        const [bx0, bx1] = X(d0, d0 + 0.55);
        C.bays.box(bx0, bx1, yf + 0.5, yf + fh - 0.25, za, zb, wallCol, [ST.bay, fh, S.bay, S.seed], { [back]: { skip: true }, pz: { fac: blank }, nz: { fac: blank } });
        // the ledge under it and its hood
        const [lx0, lx1] = X(d0, d0 + 0.62);
        C.bays.box(lx0, lx1, yf + 0.42, yf + 0.5, za - 0.05, zb + 0.05, wallCol.clone().multiplyScalar(1.08), blank, { [back]: { skip: true } });
      }
    }
  }
  // --- under the canopy: fluorescent tubes, and a small lightbox sign per shop sticking out
  {
    const swW = s < 0 ? SIDEWALK_W.x1 - SIDEWALK_W.x0 : SIDEWALK_E.x1 - SIDEWALK_E.x0;
    const nTubes = Math.floor((z1 - z0) / 3);
    for (let i = 0; i < nTubes; i++) {
      const zc = z0 + (i + 0.5) * (z1 - z0) / nTubes;
      const [tx0, tx1] = X(0.5, 0.58);
      C.tubes.box(tx0, tx1, SHOP_H - 0.06, SHOP_H - 0.01, zc - 0.6, zc + 0.6, WHITE);
    }
    const nBox = Math.max(1, Math.round((z1 - z0) / 5));
    for (let i = 0; i < nBox; i++) {
      if (R() < 0.35) continue;
      const zc = z0 + (i + 0.5) * (z1 - z0) / nBox + (R() - 0.5);
      const out = Math.min(swW - 2.6, 0.9);
      const [lx0, lx1] = X(0.15, 0.15 + out);
      const slot = atlas.vert[Math.floor(R() * atlas.vert.length)];
      // (a short vertical lightbox: the top of a vertical sign's slot)
      const sl = [slot[0], slot[3] - (slot[3] - slot[1]) * 0.45, slot[2], slot[3]];
      C.signs.box(lx0, lx1, 2.6, 3.9, zc - 0.1, zc + 0.1, WHITE, FAC0, { pz: { uv: sl }, nz: { uv: sl }, px: { uv: atlas.edge }, nx: { uv: atlas.edge }, py: { uv: atlas.edge }, ny: { uv: atlas.edge } });
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
    // (cells the bay windows cover keep clear of units)
    const hasBays = S.kind === 'resi' && S.seed > 0.3, bb0 = Math.ceil((z0 + 0.8) / S.bay);
    for (let k = k0; k < maxF; k++) for (let b = 0; b < bays; b++) {
      if (R() > share) continue;
      const cell = Math.ceil(z0 / S.bay) + b;
      if (hasBays && cell >= bb0 && (cell - bb0) % 3 < 2) continue;
      const zc = (Math.ceil(z0 / S.bay) + b + 0.5) * S.bay;
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
  const tubeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf2f8ff).multiplyScalar(2.2) });
  const boardMat = new THREE.MeshStandardMaterial({ map: atlas.tex, emissiveMap: atlas.tex, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.5 });

  const edges = [-Z_FAR - 1, ...CROSS_STREETS.map((c) => c.z).sort((a, b) => a - b), Z_FAR + 1];
  const chunks = edges.slice(0, -1).map((min, i) => ({ min, max: edges[i + 1], base: new Geo(), detail: new Geo(), signs: new Geo(), boards: new Geo(), bays: new Geo(), tubes: new Geo() }));
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
    add(c.bays, facade, true, true);
    add(c.tubes, tubeMat, false, true);
  }
  group.userData = { footprints, chairs: [], tables: [] };
  scene.add(group);
  return group;
}
