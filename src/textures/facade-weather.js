import * as THREE from 'three';
import { mulberry32 } from './noise.js';

let runoff;
export function acRunoffTexture() {
  if (runoff) return runoff;
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const g = canvas.getContext('2d'), rnd = mulberry32(12085);
  for (let i = 0; i < 55; i++) {
    const x = 22 + rnd() * 84, start = rnd() * 30, end = 50 + rnd() * 198;
    const gradient = g.createLinearGradient(0, start, 0, end);
    gradient.addColorStop(0, 'rgba(48,43,29,0.10)');
    gradient.addColorStop(0.2, 'rgba(52,48,33,0.065)');
    gradient.addColorStop(1, 'rgba(60,57,40,0)');
    g.strokeStyle = gradient; g.lineWidth = 1 + rnd() * 5;
    g.beginPath(); g.moveTo(x, start); g.bezierCurveTo(x + 2, end * 0.3, x - 3, end * 0.6, x + rnd() * 3, end); g.stroke();
  }
  runoff = new THREE.CanvasTexture(canvas);
  runoff.name = 'ac-runoff'; runoff.colorSpace = THREE.SRGBColorSpace;
  runoff.userData.size = [128, 256];
  return runoff;
}
