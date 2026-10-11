// Driver exits use the same clearance rules as the sidewalk crowd (no browser required).
import assert from 'node:assert/strict';
import * as THREE from 'three';
globalThis.window = globalThis;
globalThis.location = { search: '' };
globalThis.matchMedia = () => ({ matches: false });
globalThis.devicePixelRatio = 1;
globalThis.screen = { width: 1920, height: 1080 };
const { createExitDrivers } = await import('../src/world/exit-driver.js');
const action = () => ({ reset() { return this; }, play() { return this; }, setEffectiveWeight() {}, getClip: () => ({ name: 'walk', duration: 1 }) });
const person = () => ({ root: new THREE.Group(), asset: { fem: false }, mixer: { update() {}, stopAllAction() {} }, setVisible() {}, setLevel() {}, action, speedOf: () => 1.3 });
const scene = new THREE.Scene();
const pedestrian = { x: -26.8, z: 8, r: 0.28 };
const exits = createExitDrivers(scene, { heightAt: () => 0, getPedestrians: () => [pedestrian] });
const car = { x: -25.5, z: 8, yaw: 0, len: 4.8, width: 1.9 };
for (let i = 0; i < 3; i++) {
  const P = person();
  const D = exits.start({ P, matrix: new THREE.Matrix4().makeTranslation(car.x, 0.5, car.z), drive: action() }, car, { x: -26.8, z: 8 }, () => ({ x: -25.5, z: 10 }));
  assert.ok(D);
}
function checkSpacing() {
  const all = [...exits.colliders.filter((c) => c.r > 0), pedestrian];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    assert.ok(Math.hypot(all[i].x - all[j].x, all[i].z - all[j].z) >= all[i].r + all[j].r + 0.039, 'exiting drivers and crowd must stay apart');
  }
}
checkSpacing();
for (let i = 0; i < 400; i++) { exits.update(0.1); checkSpacing(); }
console.log('PASS driver exits reserve distinct spots and stay clear of each other and pedestrians');
