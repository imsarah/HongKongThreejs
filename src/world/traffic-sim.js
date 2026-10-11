// Ocean Drive traffic, pure maths (no three, no DOM: runs in Node tests). A steady slow line
// of cars cruises the two travel lanes at 20-30 km/h in loose platoons (2-4 car lengths
// apart, longer breaks between platoons) with the Intelligent Driver Model: each follows the
// nearest thing ahead in its lane - the car in front, a stop line, or an obstacle (the
// player on foot, the player's bike / ATV / convertible, the cyclist) - and so slows, stops
// short and pulls away smoothly. Pedestrians have right of way on the crosswalks: a car
// stops for anyone on one or stepping off the curb onto it. The 11 ST signal cycles and
// cars obey it (a yellow is run only when stopping would be too hard).
//
// Traffic keeps left (Hong Kong). The lanes form one loop: northbound (x -19.75, -z) and
// southbound (x -16.25, +z), joined
// out of sight beyond the district ends, where a car leaving one lane re-enters the other
// (with a new model and colour - never the model and colour of the car it follows - once the
// lane's next gap has opened behind the last car in, and only far from the viewer).
//
// Conventions: z grows southward; a car's `z` is its centre, `dir` +1 southbound / -1
// northbound, `len` its length.
import { LANES, CROSSWALK_Z, CROSS_STREETS, crossLegs, SIDEWALK_W, SIDEWALK_E } from './layout.js';

export const LANE_X = { 1: LANES.centerX + 1.75, [-1]: LANES.centerX - 1.75 };
export const END_Z = 460;             // loop ends: re-entry beyond the district, out of sight
export const LANE_HALF = 1.15;        // half width of a car's swept path (for obstacles)
export const IDM = { a: 1.0, b: 1.8, T: 1.5, s0: 2.4, s0Stop: 0.7, s0Obst: 2.2, delta: 4 };
const BRAKE_HARD = 5;                 // m/s2: beyond this a car can't stop for a line: it goes
const PREDICT = 1.2;                  // s: obstacles are also tested where they will be
const SWERVE = 0.9;                   // m: the most a car edges over round a partial block
export const PASS_AFTER = 6;          // s blocked by a static obstacle before going round it
const PASS_BATCH = 4;                // share a passing gap, then let the oncoming lane go
const MERGE_ROOM = 22;               // m beyond a block reserved for the return to our lane
const STARTLE = { closing: 6, cross: 1.5, every: 8 };   // startle beep: m/s, s, s
export const SIGNAL_Z = CROSS_STREETS.find((c) => c.signal)?.z ?? -190;
// Ocean Drive signal cycle (s): green, yellow, then red while the cross street runs
export const SIGNAL = { green: 22, yellow: 3.5, red: 14.5 };
export const SIGNAL_CYCLE = SIGNAL.green + SIGNAL.yellow + SIGNAL.red;
export function signalState(t) {
  const q = ((t % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  if (q < SIGNAL.green) return 'green';
  if (q < SIGNAL.green + SIGNAL.yellow) return 'yellow';
  return 'red';
}
// the cross street's heads: green inside Ocean Drive's red, less an all-red second each side
export function crossSignalState(t) {
  const q = ((t % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE, r0 = SIGNAL.green + SIGNAL.yellow + 1;
  if (q < r0 || q >= SIGNAL_CYCLE - 1) return 'red';
  return q < SIGNAL_CYCLE - 4 ? 'green' : 'yellow';
}

// crosswalks over Ocean Drive: [z0, z1] with the signal flag
export const CROSSWALKS = [
  { z0: CROSSWALK_Z - 2, z1: CROSSWALK_Z + 2, signal: false },
  ...CROSS_STREETS.filter((c) => !c.far).flatMap((c) => crossLegs(c.z).map(([z0, z1]) => ({ z0, z1, signal: !!c.signal }))),
].sort((a, b) => a.z0 - b.z0);
// pedestrian zone of a crosswalk: the roadway plus a step of sidewalk on each side
const PED_X0 = SIDEWALK_W.x1 - 1.2, PED_X1 = SIDEWALK_E.x0 + 1.2;
// the stop line a car heading `dir` holds before a crosswalk (its front stops here)
export const stopLine = (cw, dir) => (dir > 0 ? cw.z0 - 1.6 : cw.z1 + 1.6);
// the signal's stop lines (the outer legs of the intersection)
const SIG_LEGS = crossLegs(SIGNAL_Z);
export const signalLine = (dir) => (dir > 0 ? SIG_LEGS[0][0] - 1.8 : SIG_LEGS[1][1] + 1.8);

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Model / colour dealer for the traffic: bodies and paints are dealt from shuffled decks (every
// one before any repeats) and never match the car being followed; a classic convertible now
// and then (always one on the road while a classic is free). classicFree / classicOnRoad:
// counts supplied by the renderer.
export function createPicker({ kinds, lens, paints, classicLen = 5.76, classicShare = 0.15, classicFree = () => 0, classicOnRoad = () => 0 }) {
  const decks = new Map();
  const deal = (src, rnd) => {
    let d = decks.get(src);
    if (!d || !d.length) {
      d = src.slice();
      for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
      decks.set(src, d);
    }
    return d.pop();
  };
  return (rnd, prev) => {
    const classic = classicFree() > 0 && !prev?.classic && (classicOnRoad() === 0 || rnd() < classicShare);
    if (classic || !kinds.length) return { model: 'classic', len: classicLen, classic: true };
    let model = deal(kinds, rnd);
    for (let t = 0; t < 4 && kinds.length > 1 && model === prev?.model; t++) model = deal(kinds, rnd);
    let color = deal(paints, rnd);
    for (let t = 0; t < 6 && paints.length > 1 && color === prev?.color; t++) color = deal(paints, rnd);
    return { model, len: lens[model] + 0.1, color };
  };
}

// a lane's next entry gap (bumper to bumper, m): mostly 2-4 car lengths inside a platoon,
// now and then a break between platoons
export const nextGap = (rnd, len) => (rnd() < 0.8 ? (2 + 2 * rnd()) * len : 22 + rnd() * 36);

// opts: { count, seed, pickModel(rnd, prev) -> { model, len, classic, color } } (prev: the car
// the new one will follow in its lane, or null)
export function createTrafficSim({ count = 4, seed = 11, pickModel = () => ({ model: 'sedan', len: 4.8 }) } = {}) {
  const rnd = rng(seed);
  const cars = [];
  let t = 0, ids = 0;
  const clearT = new Map(CROSSWALKS.map((cw) => [cw, 0]));   // a short wait after a crosswalk clears
  // a platoon forms behind its slower leader (21-25 km/h): a car joining one would like 29-30,
  // so it closes up to a few car lengths and stays there (with a desired speed only just over
  // the leader's, the model's following gap stretches to five or more)
  const desired = (lead = null) => (lead ? 29 + rnd() : 21 + rnd() * 4) / 3.6;
  function makeCar(dir, z, v, prev = null, follow = false) {
    const m = pickModel(rnd, prev);
    return {
      id: ++ids, dir, z, x: LANE_X[dir], v, v0: desired(follow ? prev : null), a: 0, len: m.len, model: m.model, classic: !!m.classic, color: m.color, taxi: !!m.taxi,
      braking: false, brakeT: 0, reason: null, blockedT: 0, stunT: 0, honk: 0, honked: false, holdT: 0, hidden: false, respawns: 0,
      xOff: 0, xRate: 0, pass: null, returning: null, startleT: 0, honkAnim: 0,
      // (people.js / audio compatibility: the old audio car's fields)
      active: true, progress: 0.5, speed: v,
    };
  }
  // initial spread: per lane, platoons of 3-6 from the far end back, the breaks between them
  // sized so the lane's share of the fleet fills most of the loop
  for (const dir of [1, -1]) {
    const n = dir > 0 ? Math.ceil(count / 2) : Math.floor(count / 2);
    if (!n) continue;
    const sizes = [];
    for (let left = n; left > 0;) { const k = Math.min(left, 3 + Math.floor(rnd() * 4)); sizes.push(k); left -= k; }
    const inner = n * (4.8 + 3 * 4.8), span = 2 * END_Z * 0.92;
    const brk = Math.max(20, (span - inner) / sizes.length);
    let p = END_Z * 0.92, prev = null;
    for (const k of sizes) {
      for (let i = 0; i < k; i++) {
        const c = makeCar(dir, 0, 0, prev, i > 0);
        // Followers start at the platoon's speed, with enough headway for that speed.
        // Starting every follower at its higher desired speed makes the whole group brake
        // as soon as the scene loads, before it has encountered any obstruction.
        c.v = i > 0 ? prev.v : c.v0;
        c.speed = c.v;
        p -= c.len / 2;
        c.z = dir * p;
        const cruiseGap = (IDM.s0 + c.v * IDM.T) / Math.sqrt(1 - (c.v / (29 / 3.6)) ** IDM.delta);
        p -= c.len / 2 + (i < k - 1 ? Math.max((2 + 2 * rnd()) * c.len, cruiseGap) : brk * (0.6 + 0.8 * rnd()));
        cars.push(c);
        prev = c;
      }
    }
  }
  const gapNext = { 1: nextGap(rnd, 4.8), [-1]: nextGap(rnd, 4.8) };

  // the thing each car follows: gap to it (bumper to bumper) and its speed
  function leader(c, peds, obstacles, sig) {
    let gap = Infinity, vl = 0, s0 = IDM.s0, reason = null;
    const front = c.z + c.dir * c.len / 2;
    const ahead = (z) => (z - front) * c.dir;   // distance of a point ahead of the front
    for (const o of cars) {
      if (o === c || o.dir !== c.dir || o.hidden) continue;
      const d = ahead(o.z - o.dir * o.len / 2);
      if (d > -0.5 && d < gap && (o.z - c.z) * c.dir > 0) { gap = d; vl = o.v; s0 = IDM.s0; reason = 'car'; }
    }
    // obstacles in the lane (player, vehicles, cyclist): stop short of them - where they are
    // now, and where they will be in PREDICT s (a car about to cut into the lane)
    let obst = null, cutIn = null;
    for (const o of obstacles) {
      const r = o.r ?? 0.3;
      if (c.pass && passing(c, o)) continue;
      let x = o.x, z = o.z, pred = false;
      if (Math.abs(x - c.x) > LANE_HALF + r) {
        if (!o.vx && !o.vz) continue;
        x += (o.vx ?? 0) * PREDICT; z += (o.vz ?? 0) * PREDICT; pred = true;
        if (Math.abs(x - c.x) > LANE_HALF + r) continue;
      }
      const d = ahead(z - c.dir * r);
      if (d > -c.len * 0.6 && d < gap) {
        gap = Math.max(d, 0); s0 = IDM.s0Obst; reason = 'obstacle'; obst = o;
        // (its speed along the lane counts only while it is in it)
        vl = pred ? 0 : Math.max(0, o.vz !== undefined ? (o.vz ?? 0) * c.dir : (o.v ?? 0));
        cutIn = pred ? o : null;
      }
    }
    // an oncoming car out in this lane (passing something): wait for it
    if (!c.pass) for (const o of cars) {
      if (o.dir === c.dir || o.hidden) continue;
      // Reserve the lane as soon as a pass starts, before the car swings across it.
      const maneuver = o.pass ?? o.returning;
      const entering = maneuver && Math.abs(LANE_X[-o.dir] - c.x) <= 2 * LANE_HALF - 0.2;
      if (!entering && Math.abs(o.x - c.x) > 2 * LANE_HALF - 0.2) continue;
      // Stop outside the merge area; following the approaching car's front alone leaves
      // no room for it to steer home once its rear clears the parked car.
      const d = Math.min(ahead(o.z + o.dir * o.len / 2), entering ? ahead(maneuver.far + o.dir * MERGE_ROOM) : Infinity);
      if (d > -0.5 && d < gap) { gap = Math.max(d, 0); vl = 0; s0 = IDM.s0Obst; reason = 'oncoming'; obst = null; }
    }
    // crosswalks: pedestrians have right of way
    const brakeDist = (c.v * c.v) / (2 * BRAKE_HARD);
    for (const cw of CROSSWALKS) {
      const line = stopLine(cw, c.dir);
      const d = ahead(line);
      if (d < -0.3 || d > 70 || d > gap) continue;
      let busy = false;
      for (const p of peds) if (p.x > PED_X0 && p.x < PED_X1 && p.z > cw.z0 - 0.5 && p.z < cw.z1 + 0.5) { busy = true; break; }
      if (busy) clearT.set(cw, 0.9);
      if ((busy || clearT.get(cw) > 0) && d > brakeDist - 0.5) { gap = Math.max(d, 0); vl = 0; s0 = IDM.s0Stop; reason = 'crosswalk'; }
    }
    // the signal
    if (sig !== 'green') {
      const d = ahead(signalLine(c.dir));
      const need = sig === 'yellow' ? (c.v * c.v) / (2 * 3) : brakeDist;
      if (d > -0.3 && d < 90 && d < gap && d > need - 0.5) { gap = Math.max(d, 0); vl = 0; s0 = IDM.s0Stop; reason = 'signal'; }
    }
    return { gap, vl, s0, reason, obst: reason === 'obstacle' ? obst : null, cutIn: reason === 'obstacle' ? cutIn : null };
  }

  // passing: obstacles in the car's own lane near the one it is going round are ignored
  // once it has swung far enough out to clear them
  function passing(c, o) {
    const p = c.pass, r = o.r ?? 0.3;
    if (Math.abs(o.x - LANE_X[c.dir]) > LANE_HALF + r + 0.9 || Math.abs(o.z - p.z) > 10) return false;
    return Math.abs(o.x - c.x) > LANE_HALF + r - 0.05;
  }
  // the lateral offset wanted: round an obstacle that only partly blocks the lane (a swerve
  // of up to SWERVE), or out into the other lane while passing
  function swerveTarget(c, obstacles) {
    if (c.pass) return LANE_X[-c.dir] - LANE_X[c.dir];
    let best = 0;
    const front = c.z + c.dir * c.len / 2, back = c.z - c.dir * c.len / 2;
    for (const o of obstacles) {
      // (held until the tail is past it)
      if ((o.z - back) * c.dir < -(o.r ?? 0.3) - 0.5 || (o.z - front) * c.dir > 30 || Math.hypot(o.vx ?? 0, o.vz ?? 0) > 1) continue;
      const dx = o.x - LANE_X[c.dir], need = LANE_HALF + (o.r ?? 0.3) + 0.25 - Math.abs(dx);
      if (need > 0 && need <= SWERVE && need > Math.abs(best)) best = -Math.sign(dx || 1) * need;
    }
    return best;
  }
  const staticObstacle = (o) => Math.hypot(o.vx ?? 0, o.vz ?? 0) < 0.2 && !((o.v ?? 0) > 0.2);
  // A queued follower can use its leader's reserved gap. Only a small batch joins so
  // a long queue cannot keep the opposite direction waiting indefinitely.
  function passAhead(c, obstacles) {
    for (const q of cars) {
      if (q === c || q.hidden || q.dir !== c.dir || !q.pass || q.pass.batch.joined >= PASS_BATCH) continue;
      const gap = (q.z - c.z) * c.dir - (q.len + c.len) / 2;
      if (gap < IDM.s0 || gap > 30) continue;
      const o = obstacles.find((o) => staticObstacle(o) && Math.abs(o.z - q.pass.z) < 10
        && Math.abs(o.x - LANE_X[c.dir]) < LANE_HALF + (o.r ?? 0.3)
        && (o.z - c.z) * c.dir > 0 && (o.z - c.z) * c.dir < 35);
      if (o) return { o, pass: q.pass };
    }
    return null;
  }
  // A first pass needs the other lane clear 60 m both ways. Followers may also join
  // while oncoming cars are stopped beyond the space needed to merge back in.
  function canPass(c, o, follow = null) {
    for (const q of cars) {
      if (q === c || q.hidden) continue;
      if (q.dir !== c.dir && Math.abs(q.z - o.z) < 60) {
        const beyond = (q.z - (follow?.far ?? o.z)) * c.dir - q.len / 2;
        if (!follow || q.v >= 0.2 || beyond < c.len + 3.5 + 9 + IDM.s0Obst) return false;
      }
      const maneuver = q.pass ?? q.returning;
      if (maneuver && Math.abs(q.z - o.z) < MERGE_ROOM && (!follow || q.dir !== c.dir || maneuver.batch !== follow.batch)) return false;
    }
    return true;
  }

  function idm(c, L) {
    const { a, b, T, delta } = IDM;
    const free = 1 - Math.pow(c.v / c.v0, delta);
    if (!isFinite(L.gap)) return a * free;
    const ss = L.s0 + Math.max(0, c.v * T + (c.v * (c.v - L.vl)) / (2 * Math.sqrt(a * b)));
    const g = Math.max(L.gap - 0.0, 0.05);
    return a * (free - (ss / g) ** 2);
  }

  // re-entry at a loop end: the other lane, out of sight, once the lane's next gap has opened
  // behind the last car in (a new model and colour, unlike the car it follows)
  function tryRespawn(c, viewer) {
    const dir = -c.dir, z = -dir * END_Z;
    let last = null;
    for (const o of cars) if (o !== c && !o.hidden && o.dir === dir && (!last || o.z * dir < last.z * dir)) last = o;
    const far = !viewer || Math.hypot(viewer.x - LANE_X[dir], viewer.z - z) > 150;
    if (!far || (last && (last.z - z) * dir - last.len / 2 - 2.5 < gapNext[dir])) return false;
    const n = makeCar(dir, z, 0, last, gapNext[dir] < 5 * 4.8);
    const gap = last ? (last.z - z) * dir - (last.len + n.len) / 2 : Infinity;
    // Rejoining cars also match the lane's pace; a small entry gap needs a lower speed
    // rather than spawning a fast follower that immediately slams on the brakes.
    const v = Math.max(0, Math.min(n.v0 * 0.8, last?.v ?? Infinity,
      (gap * Math.sqrt(1 - 0.8 ** IDM.delta) - IDM.s0) / IDM.T));
    gapNext[dir] = nextGap(rnd, n.len);
    Object.assign(c, { ...n, id: c.id, respawns: c.respawns + 1, v, speed: v, hidden: false });
    return true;
  }

  const api = {
    cars,
    get time() { return t; },
    get signal() { return signalState(t); },
    // Saved vehicles are restored after traffic is built. Recycle any initial slot that
    // would occupy a restored vehicle, before the first frame; the saved car stays put.
    prepare(obstacles = []) {
      if (t !== 0) return;
      for (const c of cars) if (obstacles.some((o) => Math.abs(o.x - c.x) < LANE_HALF + (o.r ?? 0.3)
        && Math.abs(o.z - c.z) < c.len / 2 + (o.r ?? 0.3) + IDM.s0Obst)) api.detach(c);
    },
    // input: { peds: [{x, z}], obstacles: [{x, z, r, v?}], viewer: {x, z} }
    update(dt, { peds = [], obstacles = [], viewer = null } = {}) {
      dt = Math.min(dt, 0.1);
      t += dt;
      for (const cw of CROSSWALKS) clearT.set(cw, Math.max(0, clearT.get(cw) - dt));
      const sig = signalState(t);
      // two passes of half steps keep the hard stops short at low frame rates
      const n = dt > 0.034 ? 2 : 1, h = dt / n;
      for (let k = 0; k < n; k++) {
        for (const c of cars) {
          if (c.hidden) { c.holdT += h; if (tryRespawn(c, viewer)) c.holdT = 0; continue; }
          // bumped by the player: stopped, hazards on, for stunT seconds
          if (c.stunT > 0) {
            c.stunT = Math.max(0, c.stunT - h);
            c.v = 0; c.a = 0; c.braking = true; c.reason = 'stunned'; c.speed = 0;
            continue;
          }
          const L = leader(c, peds, obstacles, sig);
          // startle beep at the player: closing fast on them (hard braking needed), or they cut
          // across the lane just ahead; the driver's honk gesture with it
          c.startleT = Math.max(0, c.startleT - h);
          c.honkAnim = Math.max(0, c.honkAnim - h);
          if (c.startleT <= 0 && L.obst?.player) {
            const closing = c.v - L.vl;
            const fast = closing > STARTLE.closing && L.gap < (closing * closing) / 6 + 4;
            const cut = L.cutIn && c.v > 1.5 && L.gap / c.v < STARTLE.cross;
            if (fast || cut) { c.honk++; c.startleT = STARTLE.every; c.honkAnim = 1.1; c.startles = (c.startles ?? 0) + 1; }
          }
          // round a static obstacle it has waited behind: out into the other lane once that is
          // clear 60 m both ways, and back in past it
          if (!c.pass && !c.returning) {
            const follow = passAhead(c, obstacles);
            const join = follow && canPass(c, follow.o, follow.pass);
            const start = !join && L.obst && staticObstacle(L.obst) && c.blockedT > PASS_AFTER && canPass(c, L.obst);
            if (join || start) {
              const o = join ? follow.o : L.obst;
              const batch = join ? follow.pass.batch : { joined: 0 };
              batch.joined++;
              c.pass = { z: join ? follow.pass.z : o.z, far: join ? follow.pass.far : o.z, t: 0, batch };
              c.passes = (c.passes ?? 0) + 1;
            }
          }
          if (c.pass) {
            const p = c.pass;
            p.t += h;
            for (const o of obstacles) if (Math.abs(o.x - LANE_X[c.dir]) < LANE_HALF + (o.r ?? 0.3) + 0.9 && Math.abs(o.z - p.z) < 10 && (o.z - p.far) * c.dir > 0) p.far = o.z;
            // A signal or pedestrian can hold a pass for longer than 30 seconds. Keep
            // the lane reserved until the rear clears: a timer must not steer into the block.
            if ((c.z - c.dir * c.len / 2 - p.far) * c.dir > 3.5) { c.returning = p; c.pass = null; }
          }
          const want = swerveTarget(c, obstacles);
          const rate = (c.pass || Math.abs(want) < Math.abs(c.xOff) - 0.01 && Math.abs(c.xOff) > 1.5 ? 0.9 + 0.2 * c.v : 0.35 + 0.25 * c.v) * h;
          const dx = Math.max(-rate, Math.min(rate, want - c.xOff));
          c.xOff += dx;
          c.xRate = dx / h;
          c.x = LANE_X[c.dir] + c.xOff;
          if (c.returning && Math.abs(c.xOff) < 0.05) c.returning = null;
          let acc = idm(c, L);
          acc = Math.max(-7, Math.min(IDM.a, acc));
          c.v = Math.max(0, c.v + acc * h);
          // the last creep of the model's approach: at the stopping distance, stand still
          if (L.reason && acc < 0 && c.v < 0.4 && L.gap < L.s0 + 0.6) c.v = 0;
          // held at a light or crosswalk a little short of the line: stay put, don't creep up
          if ((L.reason === 'signal' || L.reason === 'crosswalk') && c.v < 0.4 && L.gap < L.s0 + 2.5) { c.v = 0; acc = Math.min(acc, 0); }
          // never into anything: hold short of the leader's bumper
          const step = c.v * h;
          if (L.reason && L.gap - step < (L.reason === 'car' ? 1.0 : L.reason === 'obstacle' ? 0.8 : 0.1)) {
            c.v = Math.min(c.v, Math.max(0, (L.gap - (L.reason === 'car' ? 1.0 : 0.8)) / h) * 0.5);
          }
          c.z += c.dir * c.v * h;
          c.a = acc;
          c.reason = L.reason;
          c.braking = acc < -0.35 || (c.v < 0.4 && !!L.reason && L.gap < 12);
          // blocked by an obstacle (not a light, crosswalk or car): honk once after 4 s
          if (L.reason === 'obstacle' && c.v < 0.2) c.blockedT += h; else { c.blockedT = 0; c.honked = false; }
          if (c.blockedT > 4 && !c.honked) { c.honked = true; c.honk++; c.honkAnim = 1.1; }
          if (c.dir * c.z > END_Z) { c.hidden = true; c.holdT = 0; c.v = 0; }
          c.speed = c.v;
          c.progress = c.hidden ? 1 : 0.5;
          c.active = !c.hidden;
        }
      }
      return api;
    },
    // the player takes car c (stopped): it leaves the lane; its slot re-enters from a loop end
    // later with a new model, as after running off the end
    detach(c) {
      if (!c || c.hidden) return false;
      Object.assign(c, { hidden: true, holdT: 0, v: 0, a: 0, pass: null, returning: null, xOff: 0, active: false, speed: 0 });
      return true;
    },
  };
  return api;
}
