import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { QUALITY } from '../quality.js';

// Illuminate the existing fluorescent fixtures rather than adding scene props.
// A fixed light pool keeps shader cost independent of the length of the street.
export function createCanopyLighting(scene, fixtures) {
  RectAreaLightUniformsLib.init();
  const count = { high: 6, medium: 4, low: 2 }[QUALITY.tier];
  const slots = Array.from({ length: count }, () => {
    const light = new THREE.RectAreaLight(0xfff0d2, 0, 0.08, 1.2);
    light.name = 'canopy-tube-light';
    light.rotation.x = -Math.PI / 2;
    scene.add(light);
    return { light, fixture: null, pending: null, target: 0 };
  });
  let selected = [], lastX = Infinity, lastZ = Infinity;
  return {
    get active() { return slots.filter(slot => slot.light.intensity > 0.1).length; },
    update(camera, dt = 1 / 60) {
      const { x, z } = camera.position;
      if (Math.hypot(x - lastX, z - lastZ) > 1) {
        lastX = x; lastZ = z;
        selected = fixtures.map(fixture => ({ fixture, distance: (fixture.x - x) ** 2 + (fixture.z - z) ** 2 }))
          .filter(item => item.distance < 24 ** 2).sort((a, b) => a.distance - b.distance)
          .slice(0, count).map(item => item.fixture);
        const missing = selected.filter(fixture => !slots.some(slot => slot.fixture === fixture));
        for (const slot of slots) {
          if (selected.includes(slot.fixture)) { slot.target = 42; slot.pending = null; }
          else { slot.target = 0; slot.pending = missing.shift() ?? null; }
        }
      }
      for (const slot of slots) {
        slot.light.intensity = THREE.MathUtils.damp(slot.light.intensity, slot.target, 8, Math.min(dt, 0.1));
        if (slot.target === 0 && slot.light.intensity < 0.15 && slot.pending) {
          slot.fixture = slot.pending; slot.pending = null;
          slot.light.position.set(slot.fixture.x, slot.fixture.y - 0.015, slot.fixture.z);
          slot.light.width = slot.fixture.width;
          slot.light.height = slot.fixture.height;
          slot.target = 42;
        }
      }
    },
  };
}
