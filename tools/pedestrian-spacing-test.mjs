import assert from 'node:assert/strict';
import { freePathSpawn, isFree, pedestrianStep } from '../src/world/pedestrian-spacing.js';

let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log(`PASS ${name}`); };
const r = 0.28;
check('forward movement stops before another person', () => {
  const f = pedestrianStep(0, 0, 0, 2, r, [{ x: 0, z: 1, r }]);
  assert.ok(f > 0 && f < 0.21);
  assert.ok(isFree(0, 2 * f, r, [{ x: 0, z: 1, r }]));
});
check('sideways movement cannot step into a person', () => {
  const f = pedestrianStep(0, 0, 2, 0, r, [{ x: 1, z: 0, r }]);
  assert.ok(f > 0 && f < 0.21);
  assert.ok(isFree(2 * f, 0, r, [{ x: 1, z: 0, r }]));
});
check('a long step cannot tunnel through a person despite a free destination', () => {
  assert.ok(isFree(0, 4, r, [{ x: 0, z: 2, r }]));
  assert.ok(pedestrianStep(0, 0, 0, 4, r, [{ x: 0, z: 2, r }]) < 0.36);
});
check('a person touching a neighbour can move away or alongside them', () => {
  const obstacles = [{ x: 0, z: 0.6, r }];
  assert.equal(pedestrianStep(0, 0, 0, -1, r, obstacles), 1);
  assert.equal(pedestrianStep(0, 0, 1, 0, r, obstacles), 1);
});
check('existing overlaps can separate but cannot deepen', () => {
  const obstacles = [{ x: 0, z: 0.2, r }];
  assert.equal(pedestrianStep(0, 0, 0, -0.1, r, obstacles), 1);
  assert.equal(pedestrianStep(0, 0, 0, 0.1, r, obstacles), 0);
  assert.equal(pedestrianStep(0, 0, 0, 1, r, obstacles), 0);
});
check('exactly coincident people can take a separating step', () => {
  assert.equal(pedestrianStep(0, 0, 0, 0.1, r, [{ x: 0, z: 0, r }]), 1);
});
check('inactive colliders do not block movement', () => {
  assert.equal(pedestrianStep(0, 0, 0, 1, r, [{ x: 0, z: 0.5, r: 0 }]), 1);
});
const path = { total: 10, closed: false, at(s, q) { Object.assign(q, { x: 0, z: s, dx: 0, dz: 1 }); } };
check('several requests for one spawn reserve distinct positions on their route', () => {
  const reserved = [];
  for (let i = 0; i < 6; i++) {
    const spawn = freePathSpawn(path, 5, 1, 0, r, () => reserved);
    assert.ok(spawn);
    assert.ok(isFree(spawn.x, spawn.z, r, reserved));
    reserved.push({ ...spawn, r });
  }
  assert.equal(new Set(reserved.map((s) => s.z)).size, 6);
});
check('spawn search respects open path endpoints and stationary occupants', () => {
  const spawn = freePathSpawn(path, 0, -1, 0, r, () => [{ x: 0, z: 0, r: 0.36 }]);
  assert.ok(spawn.s >= 0 && spawn.s <= path.total && spawn.z >= 0.75);
});
check('spawn search wraps a closed route', () => {
  const spawn = freePathSpawn({ ...path, closed: true }, 0, 1, 0, r, () => [{ x: 0, z: 0, r }]);
  assert.ok(spawn.s >= 0 && spawn.s < path.total);
  assert.ok(isFree(spawn.x, spawn.z, r, [{ x: 0, z: 0, r }]));
});
check('a full route has no overlapping fallback spawn', () => {
  assert.equal(freePathSpawn(path, 5, 1, 0, r, () => [{ x: 0, z: 5, r: 20 }]), null);
});
console.log(`${checks}/${checks} passed`);
