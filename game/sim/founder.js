import { steerAlong } from "../../forge/paths.js";
import { floraAtCell, fellTree } from "./state.js";
import { pathTo, nearestWalkable } from "./grid.js";
import { mulberry32 } from "../../forge/rng.js";

const NAMES = ["Rowan", "Aldwin", "Bram", "Cedric", "Dunstan", "Edric", "Godric", "Wystan"];
export const WORK_RANGE = 1.45;
const ACQUIRE_RANGE = 1.9;
const STASH_RANGE = 1.7;

export function createFounder(state) {
  const c = state.camp;
  const rng = mulberry32((state.seed ^ 0xfa11) | 0);
  const name = NAMES[Math.floor(rng() * NAMES.length)];
  const spot = nearestWalkable(state, c.x + 0.5, c.y + 0.5, 4) ?? { x: c.x, y: c.y };
  return {
    isFounder: true,
    name,
    x: spot.x + 0.5,
    y: spot.y + 0.5,
    dir: Math.PI / 2,
    speed: 2.6,
    phase: 0,
    moving: false,
    action: null,
    swing: 0,
    swingRate: 1.5,
    carry: 0,
    carryMax: 6,
    skills: { wood: 0 },
    hp: 100,
    maxHp: 100,
    cmd: { dx: 0, dy: 0 },
    workLatch: false,
    workTargetId: null,
    _pathFor: null,
    path: null,
    wp: 0,
    blacklist: new Map(),
    idleT: 0,
  };
}

export function updateFounder(state, dt) {
  const f = state.founder;
  f.moving = false;

  autoDeposit(state, f);

  const cmd = f.cmd || { dx: 0, dy: 0 };
  if (cmd.dx !== 0 || cmd.dy !== 0) {
    if (f.workLatch || f.workTargetId != null || f.path || f.task) {
      f.workLatch = false;
      f.workTargetId = null;
      f.path = null;
      f.task = null;
      f.action = null;
    }
    f.idleT = 0;
    const len = Math.hypot(cmd.dx, cmd.dy) || 1;
    const sp = f.speed * dt;
    tryMove(state, f, (cmd.dx / len) * sp, (cmd.dy / len) * sp);
    f.dir = Math.atan2(cmd.dy, cmd.dx);
    f.phase += dt * f.speed * 0.62;
    f.moving = true;
    f.action = null;
    return;
  }

  if (f.workLatch && f.workTargetId == null) acquireWork(state, f, ACQUIRE_RANGE);

  if (f.workTargetId != null) {
    const item = state.flora[f.workTargetId];
    if (!item || item.state !== "alive") {
      f.workTargetId = null;
      f._pathFor = null;
      if (f.workLatch) acquireWork(state, f, ACQUIRE_RANGE);
      if (f.workTargetId == null) {
        f.idleT += dt;
        f.action = null;
        return;
      }
    } else {
      const d = Math.hypot(item.x - f.x, item.y - f.y);
      if (d <= WORK_RANGE) {
        doWork(state, dt, item);
      } else {
        walkToward(state, f, item, dt);
      }
      return;
    }
  }

  if (f.path) {
    const done = steerAlong(f, f.path, f.speed, dt);
    f.phase += dt * f.speed * 0.62;
    f.moving = true;
    f.action = null;
    if (done) {
      f.path = null;
      if (f.task && f.task.type === "chop") {
        const item = state.flora[f.task.id];
        if (item && item.state === "alive" && Math.hypot(item.x - f.x, item.y - f.y) <= WORK_RANGE) {
          f.task = { type: "work", id: item.id };
          f.action = "chop";
          f.swing = 0;
        } else {
          f.task = null;
        }
      } else if (f.task) {
        f.task = null;
      }
    }
    return;
  }

  f.idleT += dt;

  if (f.task && f.task.type === "work") {
    const item = state.flora[f.task.id];
    if (item && item.state === "alive") {
      doWork(state, dt, item);
    } else {
      f.task = null;
      f.action = null;
    }
    return;
  }

  if (f.carry >= f.carryMax) {
    goDeposit(state);
    return;
  }

  if (f.idleT > 2.5) {
    f.idleT = 0;
    const target = findNearestTree(state, f);
    if (target) {
      const p = pathTo(state, f.x, f.y, target.px, target.py);
      if (p) {
        f.task = { type: "chop", id: target.item.id };
        f.path = p;
        f.wp = 0;
        return;
      }
      f.blacklist.set(target.item.id, state.tick + 240);
    }
    if (f.carry > 0) {
      goDeposit(state);
      return;
    }
    const ang = state.rng() * Math.PI * 2;
    const r = 1 + state.rng() * 2.5;
    const c = state.camp;
    const p = pathTo(state, f.x, f.y, c.x + 0.5 + Math.cos(ang) * r, c.y + 0.5 + Math.sin(ang) * r);
    if (p) {
      f.task = { type: "manual" };
      f.path = p;
      f.wp = 0;
    }
  }
}

function autoDeposit(state, f) {
  if (f.carry <= 0) return;
  const c = state.camp;
  if (Math.hypot(f.x - (c.x + 0.5), f.y - (c.y + 0.5)) < STASH_RANGE) {
    const n = f.carry;
    state.stores.wood += n;
    state.bus.emit("deposit", { x: f.x, y: f.y, n });
    f.carry = 0;
  }
}

function tryMove(state, f, dx, dy) {
  const n = state.size;
  const nx = f.x + dx;
  const ny = f.y + dy;
  const walk = (cx, cy) => cx >= 0 && cy >= 0 && cx < n && cy < n && state.walk[cy * n + cx] === 1;
  if (walk(Math.floor(nx), Math.floor(ny))) {
    f.x = nx;
    f.y = ny;
  } else if (walk(Math.floor(nx), Math.floor(f.y))) {
    f.x = nx;
  } else if (walk(Math.floor(f.x), Math.floor(ny))) {
    f.y = ny;
  }
}

function walkToward(state, f, item, dt) {
  if (!f.path) {
    if (f._pathFor === f.workTargetId) {
      f.workTargetId = null;
      f.workLatch = false;
      return;
    }
    f._pathFor = f.workTargetId;
    const p = pathTo(state, f.x, f.y, item.x, item.y);
    if (!p) {
      f.workTargetId = null;
      f.workLatch = false;
      return;
    }
    f.path = p;
    f.wp = 0;
  }
  const done = steerAlong(f, f.path, f.speed, dt);
  f.phase += dt * f.speed * 0.62;
  f.moving = true;
  f.action = null;
  if (done) f.path = null;
}

function doWork(state, dt, item) {
  const f = state.founder;
  f.action = item.kind === "rock" ? "mine" : "chop";
  f.dir = Math.atan2(item.y - f.y, item.x - f.x);
  f.swing += dt * (f.swingRate + f.skills.wood * 0.8);
  if (f.swing >= 1) {
    f.swing = 0;
    item.hp -= 1;
    item.shakeT = 0.22;
    f.skills.wood = Math.min(1, f.skills.wood + 0.004);
    if (item.hp <= 0) {
      fellTree(state, item);
      f.carry = Math.min(f.carryMax, f.carry + 3);
      state.bus.emit("gather", { x: f.x, y: f.y, good: "wood", n: 3 });
      f.workTargetId = null;
      f._pathFor = null;
      f.action = null;
      f.blacklist.delete(item.id);
      if (f.workLatch) acquireWork(state, f, ACQUIRE_RANGE);
    } else {
      state.bus.emit(f.action === "mine" ? "mineHit" : "chop", { x: item.x, y: item.y, id: item.id });
    }
  }
}

function acquireWork(state, f, range) {
  const foe = nearestEnemy(state, f, range);
  if (foe) {
    f.workTargetId = null;
    f.action = "attack";
    f.dir = Math.atan2(foe.y - f.y, foe.x - f.x);
    return;
  }
  const hit = findNearestAction(state, f, range);
  if (hit) {
    f.workTargetId = hit.item.id;
    f._pathFor = null;
  } else {
    f.workLatch = false;
    f.workTargetId = null;
  }
}

function nearestEnemy(state, f, range) {
  let best = null;
  for (const e of state.enemies ?? []) {
    if ((e.hp ?? 1) <= 0) continue;
    const d = Math.hypot(e.x - f.x, e.y - f.y);
    if (d <= range && (!best || d < best.d)) best = { foe: e, d };
  }
  return best ? best.foe : null;
}

function findNearestAction(state, f, range) {
  const cx = Math.floor(f.x);
  const cy = Math.floor(f.y);
  const r = Math.ceil(range) + 1;
  let best = null;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const items = floraAtCell(state, cx + dx, cy + dy);
      for (const item of items) {
        if (item.state !== "alive" || (item.kind !== "tree" && item.kind !== "rock")) continue;
        const d = Math.hypot(item.x - f.x, item.y - f.y);
        if (d <= range && (!best || d < best.d)) best = { item, d };
      }
    }
  }
  return best;
}

export function findFloraNear(state, wx, wy, tol) {
  const cx = Math.floor(wx);
  const cy = Math.floor(wy);
  let best = null;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const items = floraAtCell(state, cx + dx, cy + dy);
      for (const item of items) {
        if (item.state !== "alive") continue;
        const d = Math.hypot(item.x - wx, item.y - wy);
        if (d <= tol && (!best || d < best.d)) best = item;
      }
    }
  }
  return best;
}

function goDeposit(state) {
  const f = state.founder;
  const c = state.camp;
  const spot = nearestWalkable(state, c.x + 0.5, c.y + 0.5, 3);
  if (!spot) {
    f.task = null;
    return;
  }
  const p = pathTo(state, f.x, f.y, spot.x + 0.5, spot.y + 0.5);
  if (p) {
    f.task = { type: "deposit" };
    f.path = p;
    f.wp = 0;
  } else f.task = null;
}

function findNearestTree(state, f) {
  const cx = Math.floor(f.x);
  const cy = Math.floor(f.y);
  for (let r = 1; r <= 16; r++) {
    let best = null;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const items = floraAtCell(state, cx + dx, cy + dy);
        for (const item of items) {
          if (item.kind !== "tree" || item.state !== "alive") continue;
          const bl = f.blacklist.get(item.id);
          if (bl !== undefined && state.tick < bl) continue;
          const spot = adjacentSpot(state, item);
          if (!spot) continue;
          const d = Math.hypot(spot.x - f.x, spot.y - f.y);
          if (!best || d < best.d) best = { item, px: spot.x, py: spot.y, d };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

function adjacentSpot(state, item) {
  const cx = Math.floor(item.x);
  const cy = Math.floor(item.y);
  let best = null;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (!isWalkableCell(state, cx + dx, cy + dy)) continue;
      const wx = cx + dx + 0.5;
      const wy = cy + dy + 0.5;
      const d = Math.hypot(wx - item.x, wy - item.y);
      if (!best || d < best.d) best = { x: wx, y: wy, d };
    }
  }
  return best;
}

function isWalkableCell(state, cx, cy) {
  const n = state.size;
  if (cx < 0 || cy < 0 || cx >= n || cy >= n) return false;
  return state.walk[cy * n + cx] === 1;
}
