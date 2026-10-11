// Shared pedestrian clearance, independent of rendering and animation.
export const PERSON_GAP = 0.04;

export function isFree(x, z, radius, obstacles, gap = PERSON_GAP) {
  return obstacles.every((o) => !(o.r > 0) || Math.hypot(x - o.x, z - o.z) >= radius + o.r + gap);
}

// Sweep the whole step, including sidesteps: safe endpoints alone can still pass through
// another person. Existing overlaps may move apart, but cannot move deeper into each other.
export function pedestrianStep(x, z, tx, tz, radius, obstacles) {
  const dx = tx - x, dz = tz - z, a = dx * dx + dz * dz;
  if (a < 1e-12) return 1;
  let fraction = 1;
  for (const o of obstacles) {
    if (!(o.r > 0)) continue;
    const ox = x - o.x, oz = z - o.z, r = radius + o.r + PERSON_GAP;
    const c = ox * ox + oz * oz - r * r, b = ox * dx + oz * dz;
    if (c < -1e-8) {
      if (b < 0 || Math.hypot(tx - o.x, tz - o.z) <= Math.hypot(ox, oz) + 1e-8) fraction = 0;
      continue;
    }
    if (b >= 0) continue;
    const discriminant = b * b - a * c;
    if (discriminant < 0) continue;
    const entry = (-b - Math.sqrt(discriminant)) / a;
    if (entry >= -1e-8 && entry < fraction) fraction = Math.max(0, entry - 1e-5 / Math.sqrt(a));
  }
  return fraction;
}

// Reserve a free point along the existing route, without moving someone off the sidewalk.
export function freePathSpawn(path, s, dir, lat, radius, obstaclesAt) {
  const q = {};
  for (let offset = 0; offset <= path.total; offset += 0.75) {
    for (const sign of offset ? [-1, 1] : [1]) {
      let candidate = s + sign * offset;
      if (path.closed) candidate = ((candidate % path.total) + path.total) % path.total;
      else if (candidate < 0 || candidate > path.total) continue;
      path.at(candidate, q);
      const x = q.x - q.dz * dir * lat, z = q.z + q.dx * dir * lat;
      if (isFree(x, z, radius, obstaclesAt(x, z))) return { s: candidate, x, z };
    }
  }
  return null;
}
