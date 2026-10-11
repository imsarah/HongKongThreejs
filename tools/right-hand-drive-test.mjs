// Check the shipped GLBs and entry points, including cars facing different directions.
// Usage: node tools/right-hand-drive-test.mjs
import assert from 'node:assert/strict';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { doorPoints } from '../src/player/fasttravel.js';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
let checked = 0;
for (const [file, kinds] of [
  ['convertible', ['convertible']],
  ['parked', ['sedan', 'hatch', 'suv', 'pickup', 'coupe', 'wagon', 'crossover']],
]) {
  const doc = await io.read(`public/models/${file}.glb`);
  const nodes = doc.getRoot().listNodes();
  const find = name => {
    const node = nodes.find(n => n.getName() === name);
    assert.ok(node, `Missing ${name}`);
    return node;
  };
  for (const kind of kinds) {
    const hero = kind === 'convertible';
    const root = find(kind);
    const names = hero ? ['driver_eye', 'driver_pelvis', 'driver_seat', 'steering_wheel', 'speedo_needle']
      : [`${kind}_eye`, `${kind}_driver_pelvis`, `${kind}_steer`, `${kind}_needle`];
    const positions = names.map(name => find(name).getWorldTranslation()[0] - root.getWorldTranslation()[0]);
    assert.ok(positions.every(x => x < -0.25), `${kind}: all driving controls must be on the right: ${positions}`);
    assert.ok(Math.abs(positions[0] - positions[2]) < 0.01, `${kind}: eye and wheel/seat must align`);
    const left = find(hero ? 'grip_L' : `${kind}_grip_L`).getWorldTranslation()[0];
    const right = find(hero ? 'grip_R' : `${kind}_grip_R`).getWorldTranslation()[0];
    assert.ok(left > right, `${kind}: anatomical hand grips must retain their orientation`);
    for (const suffix of ['', '_L1']) {
      const frontLeft = find(hero ? `wheel_FL${suffix}` : `${kind}_wheel_FL${suffix}`);
      const frontRight = find(hero ? `wheel_FR${suffix}` : `${kind}_wheel_FR${suffix}`);
      assert.ok(frontLeft.getWorldTranslation()[0] > frontRight.getWorldTranslation()[0], `${kind}${suffix}: wheel sides must retain their orientation`);
    }
    if (hero) assert.ok(find('steering_wheel_L1').getWorldTranslation()[0] < -0.25, 'distant convertible wheel must be on the right');
    console.log(`PASS ${kind}: right-hand cockpit, aligned camera, correctly oriented grips and wheels`);
    checked++;
  }
}
for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.73]) {
  const pose = { x: 4, z: 9, yaw };
  const [driver, passenger] = doorPoints(pose, 0.1, 2);
  const right = point => (point.x - pose.x) * Math.cos(yaw) - (point.z - pose.z) * Math.sin(yaw);
  assert.ok(driver.side === 'driver' && right(driver) > 1, `Driver door must be on the right at yaw ${yaw}`);
  assert.ok(passenger.side === 'passenger' && right(passenger) < -1, `Passenger door must be on the left at yaw ${yaw}`);
}
console.log(`PASS ${checked} shipped car cockpits and door sides at five headings`);
