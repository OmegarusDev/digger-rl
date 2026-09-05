import { makeMover, steerTo, tryMove } from "./mover.js";
import { isWalkable } from "./grid.js";

const DEER_SPEED = 3.2;
const FLEE_RANGE = 2.0;

export function updateFauna(state, dt) {
  const F = state.fauna;
  if (!F.cap) F.cap = computeDeerCap(state);

  F.respawnT -= dt;
  if (F.deer.length < F.cap && F.respawnT <= 0) {
    const spot = randomForestSpawn(state);
    if (spot) {
      F.deer.push({ id: F.nextId++, hp: 3, flash: 0, wanderT: 0, target: null, ...makeMover(spot.x, spot.y, DEER_SPEED * 0.55) });
      F.respawnT = 45 + state.rng() * 60;
    }
  }

  for (const tr of F.traps) {
    if (tr.lastDay !== state.time.day) {
      tr.lastDay = state.time.day;
      if (!tr.caught && state.rng() < 0.4) tr.caught = true;
    }
  }

  for (const d of F.deer) {
    d.moving = false;
    if (d.flash > 0) d.flash = Math.max(0, d.flash - dt);
    const threat = nearestThreat(state, d);
    if (threat) {
      const dx = d.x - threat.x;
      const dy = d.y - threat.y;
      const len = Math.hypot(dx, dy) || 1;
      const sp = 2.4 * dt;
      tryMove(state, d, (dx / len) * sp, (dy / len) * sp);
      d.dir = Math.atan2(dy, dx);
      d.phase += dt * DEER_SPEED * 0.62;
      d.moving = true;
      d.target = null;
      continue;
    }
    d.wanderT -= dt;
    if (d.wanderT <= 0 || !d.target) {
      d.wanderT = 3 + state.rng() * 4;
      d.target = pickWanderCell(state, d);
    }
    if (d.target) steerTo(state, d, d.target.x, d.target.y, dt, 0.3);
  }
}

function computeDeerCap(state) {
  const v = state.valley;
  let forest = 0;
  let total = 0;
  for (let y = 2; y < state.size - 2; y += 3) {
    for (let x = 2; x < state.size - 2; x += 3) {
      total++;
      if (v.typeAt(x + 0.5, y + 0.5) === "forest") forest++;
    }
  }
  return Math.max(2, Math.min(10, Math.round((forest / total) * 24)));
}

function randomForestSpawn(state) {
  const c = state.camp;
  for (let tries = 0; tries < 40; tries++) {
    const x = 2 + Math.floor(state.rng() * (state.size - 4));
    const y = 2 + Math.floor(state.rng() * (state.size - 4));
    if (!isWalkable(state, x, y)) continue;
    if (state.valley.typeAt(x + 0.5, y + 0.5) !== "forest") continue;
    if (Math.hypot(x - c.x, y - c.y) < 14) continue;
    return { x: x + 0.5, y: y + 0.5 };
  }
  return null;
}

function pickWanderCell(state, d) {
  for (let tries = 0; tries < 12; tries++) {
    const x = Math.floor(d.x) + Math.round((state.rng() - 0.5) * 8);
    const y = Math.floor(d.y) + Math.round((state.rng() - 0.5) * 8);
    if (isWalkable(state, x, y)) return { x: x + 0.5, y: y + 0.5 };
  }
  return null;
}

function nearestThreat(state, d) {
  let best = null;
  let bestD = FLEE_RANGE;
  for (const v of state.villagers) {
    if (!v.workplace || v.workplace.kind !== "huntersLodge") continue;
    const dist = Math.hypot(v.x - d.x, v.y - d.y);
    if (dist < bestD) {
      bestD = dist;
      best = v;
    }
  }
  return best;
}

export function removeDeer(state, d) {
  const F = state.fauna;
  const i = F.deer.indexOf(d);
  if (i >= 0) F.deer.splice(i, 1);
  F.respawnT = Math.min(F.respawnT, 30 + state.rng() * 40);
}

export function nearestDeer(state, x, y, radius) {
  let best = null;
  for (const d of state.fauna.deer) {
    const dist = Math.hypot(d.x - x, d.y - y);
    if (dist <= radius && (!best || dist < best.dist)) best = { deer: d, dist };
  }
  return best;
}

export function lodgeTraps(state, lodgeId) {
  return state.fauna.traps.filter((t) => t.lodgeId === lodgeId);
}

export function addTrap(state, lodgeId, x, y) {
  state.fauna.traps.push({ id: state.fauna.nextId++, lodgeId, x, y, caught: false, lastDay: state.time.day });
}
