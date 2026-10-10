// The player's own body on foot, for the third-person view (V / C on foot, or the touch
// camera button): a Mixamo character at the walker's feet, turning to face where it is going,
// blending its idle, walk and run clips by ground speed (each clip's playback matched to the
// speed so the planted foot doesn't slide). Hidden in first person and while riding.
import * as THREE from 'three';
import { createPerson, playerCharacter } from '../world/mixamo.js';

const lin = (hex, a = 1) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b, a]; };
const smooth = (a, b, v) => { const t = THREE.MathUtils.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function createAvatar(scene, assets, walker) {
  const chars = assets?.chars ?? {};
  const name = playerCharacter(chars);
  if (!name) return null;
  const female = chars[name].fem;
  // (the same light-blue tee as the player's body at the wheel)
  const P = createPerson(chars[name], { tints: [lin(0xb9d3e3, 0.85), null, null], shadow: true });
  P.root.name = 'player-avatar';
  scene.add(P.root);
  if (P.shadow) scene.add(P.shadow);
  const clip = (...names) => { for (const n of names) { const a = P.action(n); if (a) return a; } return null; };
  const idle = clip('idle_standing', 'idle_breathing');
  const walk = clip(female ? 'walk_casual_f' : 'walk_casual_m', 'walk_casual_m', 'walk_casual_f');
  const run = clip(female ? 'run_f' : 'run_slow', 'run_slow', 'jog', 'run_f');
  for (const a of [idle, walk, run]) if (a) { a.play(); a.setEffectiveWeight(0); }
  idle?.setEffectiveWeight(1);
  const walkSpeed = walk ? P.speedOf(walk.getClip().name) : 1.3;
  const runSpeed = run ? P.speedOf(run.getClip().name) : 4;
  let heading = 0, shown = false;

  const api = {
    enabled: false,
    setShown(v) {
      if (v === shown) return;
      shown = v;
      P.setVisible(v);
    },
    update(dt, { hidden = false } = {}) {
      const on = api.enabled && !hidden;
      api.setShown(on);
      if (!on) return;
      const vx = walker.vel.x, vz = walker.vel.y, v = Math.hypot(vx, vz);
      // face the way it moves (standing: keep the last heading)
      if (v > 0.15) {
        const want = Math.atan2(vx, vz);
        let d = want - heading;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        heading += d * (1 - Math.exp(-dt * 10));
      }
      const air = walker.airY ?? 0;
      P.root.position.set(walker.pos.x, walker.feetY + air, walker.pos.y);
      P.root.rotation.set(0, heading, 0);
      if (P.per) P.per.uBaseY.value = walker.feetY;
      // idle -> walk -> run, playback matched to the ground speed
      const wMove = smooth(0.12, 0.8, v), wRun = smooth(2.0, 3.8, v);
      idle?.setEffectiveWeight(1 - wMove);
      walk?.setEffectiveWeight(wMove * (1 - wRun));
      run?.setEffectiveWeight(wMove * wRun);
      if (walk) walk.timeScale = THREE.MathUtils.clamp(v / walkSpeed, 0.5, 1.8);
      if (run) run.timeScale = THREE.MathUtils.clamp(v / runSpeed, 0.6, 1.5);
      P.setLevel(0);
      P.mixer.update(dt);
    },
  };
  P.setVisible(false);
  return api;
}
