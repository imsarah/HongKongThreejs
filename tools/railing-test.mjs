// Thin railing contacts, crash release and restoration through the real collision grid.
// Usage: node tools/railing-test.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDynProps } from '../src/world/props-dyn.js';
import { buildGrid, createVehicle, contact } from '../src/vehicles/sim.js';

const scene = new THREE.Scene(), mat = new THREE.MeshBasicMaterial();
const box = { min: { x: -0.03, y: 0.15, z: -2.03 }, max: { x: 0.03, y: 1.2, z: 2.03 } };
const P = createDynProps(scene, {
  kinds: { railing: { mass: 65, lie: 0.04, parts: [{ geo: new THREE.BoxGeometry(0.06, 1.05, 4.06), mat }] } },
  items: [{ kind: 'railing', x: 0, y: 0.15, z: 0, box }], groundAt: () => 0.15,
});
const world = {
  groundAt: () => 0.15, dynamic: () => [], grid: buildGrid(P.boxColliders, P.colliders),
  bounds: { x0: -100, x1: 100, z0: -100, z1: 100 }, edgeDistance: () => 100,
};
assert.equal(P.colliders.length, 0, 'no broad circles along a thin railing');
assert.equal(P.boxColliders.length, 1);
const rail = P.props[0];
let cases = 0;
for (const dt of [1 / 60, 1 / 20]) {
  for (const sign of [-1, 1]) {
    for (const z of [-2, -1, 0, 1, 2]) {
      P.reset(rail);
      const v = createVehicle('car', { x: sign * 0.88, z, yaw: 0 }, world);
      assert.ok(contact(v, v.x, v.z, v.yaw, world), 'solid contact along entire run from either side');
      v.vx = -sign; v.lon = 1;
      assert.equal(P.sweep(v, dt).length, 0, 'slow impact leaves railing standing');
      assert.equal(box.disabled, false);
      v.vx = -sign * 9; v.lon = 9;
      assert.equal(P.sweep(v, dt).length, 1, 'fast impact releases railing');
      assert.equal(box.disabled, true);
      assert.equal(contact(v, v.x, v.z, v.yaw, world), null, 'original grid no longer blocks gap');
      assert.ok(Math.abs(v.vx) < 9, 'car loses momentum');
      assert.ok(rail.vel.x * -sign > 0, 'railing flies away from impact');
      cases++;
    }
    P.reset(rail);
    const v = createVehicle('car', { x: 0, z: sign * 4.5, yaw: 0 }, world);
    assert.ok(contact(v, v.x, v.z, v.yaw, world), 'front or rear bumper touches the end post');
    v.vz = -sign * 9; v.lon = 9;
    assert.equal(P.sweep(v, dt).length, 1, 'end impacts are not rejected by the distance filter');
    assert.equal(box.disabled, true);
    cases++;
  }
}
for (let t = 0; t < 12; t += 1 / 60) P.update(1 / 60);
assert.equal(rail.state, 'down');
assert.ok(Math.abs(new THREE.Vector3(0, 1, 0).applyQuaternion(rail.q).y) < 0.3, 'lands on its side');
assert.ok(box.disabled, 'fallen rail does not leave invisible collision');
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(0, 2, -80); camera.lookAt(0, 2, -200); camera.updateMatrixWorld();
for (let t = 0; t < 95; t += 0.05) P.update(0.05, camera);
assert.equal(rail.state, 'rest', 'restores after delay out of view');
assert.equal(box.disabled, false);
const v = createVehicle('car', { x: 0.88, z: 0 }, world);
assert.ok(contact(v, v.x, v.z, v.yaw, world), 'restored rail works in the original grid');
console.log(`PASS ${cases} railing impacts, landing, gap clearance and restoration`);
