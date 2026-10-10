// The city ground: what beach.js was to Ocean Drive, for the Causeway Bay street. The
// street, curbs and sidewalks are street.js meshes; this module only answers height and
// water queries with the same API the walker, the people and the vehicles already use.
import { groundHeight } from './layout.js';

const DRY = { covered: false, depth: 0, foam: 0, front: Infinity, fresh: 0 };

export function buildGround() {
  const groundAt = (x, z) => groundHeight(x, z);
  const api = {
    // (no stairs or decks to climb: the walkable height is the ground)
    heightAt: (x, z) => groundAt(x, z),
    groundAt,
    colliders: [],
    surfaces: null,
    towers: [],
    swashAt: () => DRY,
    waterDepthAt: () => 0,
    update() {},
  };
  window.__beach = api;
  return api;
}
