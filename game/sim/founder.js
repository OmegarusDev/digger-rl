import { steerAlong } from "../../forge/paths.js";
import { floraAtCell, fellTree, completeBuilding, depositPoints, buildingAtCell } from "./state.js";
import { pathTo, nearestWalkable } from "./grid.js";
import { mulberry32 } from "../../forge/rng.js";

const NAMES = ["Rowan", "Aldwin", "Bram", "Cedric", "Dunstan", "Edric", "Godric", "Wystan"];
export const WORK_RANGE = 1.45;
const ACQUIRE_RANGE = 1.9;
const DEPOSIT_RANGE = 1.7;
const FLORA_YIELD = { tree: { good: "wood", n: 3 }, berry: { good: "food", n: 2 }, rock: { good: "stone", n: 4 } };

export function carryTotal(f) {
  return (f.carry.wood ?? 0) + (f.carry.food ?? 0) + (f.carry.stone ?? 0);
}

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
    carry: { wood: 0, food: 0, stone: 0 },
    carryMax: 6,
    skills: { wood: 0 },
    hp: 100,
    maxHp: 100,
    cmd: { dx: 0, dy: 0 },
    workLatch: false,
    workTarget: null,
    _pathFor: null,
    path: null,
    wp: 0,
    blacklist: new Map(),
    idleT: 0,
  };
}

function resolveTarget(state, wt) {
  if (!wt) return null;
  if (wt.type === "flora") {
    const item = state.flora[wt.id];
    return item && item.state === "alive" ? item : null;
  }
  if (wt.type === "building") {
    const b = buildingAtCell(state, Math.floor(wt.x), Math.floor(wt.y));
    if (!b || b.id !== wt.id) return null;
    return b.state === "built" && b.kind !== "hut" ? null : b;
  }
  return null;
}

function targetPos(t) {
  return { x: t.x, y: t.y };
}

export function updateFounder(state, dt) {
  const f = state.founder;
  f.moving = false;

  autoDeposit(state, f);

  const cmd = f.cmd || { dx: 0, dy: 0 };
  if (cmd.dx !== 0 || cmd.dy !== 0) {
    if (f.workLatch || f.workTarget || f.path || f.task) {
      f.workLatch = false;
      f.workTarget = null;
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

  if (f.workLatch && !f.workTarget) acquireWork(state, f, ACQUIRE_RANGE);
  if (f.workTarget && !resolveTarget(state, f.workTarget)) {
    const wasLatch = f.workLatch;
    f.workTarget = null;
    f._pathFor = null;
    if (wasLatch) acquireWork(state, f, ACQUIRE_RANGE);
  }

  if (f.workTarget) {
    const t = resolveTarget(state, f.workTarget);
    const pos = targetPos(t);
    const d = Math.hypot(pos.x - f.x, pos.y - f.y);
    if (d <= WORK_RANGE) doWork(state, dt, f.workTarget, t);
    else walkToward(state, f, f.workTarget, pos, dt);
    return;
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
      doWork(state, dt, { type: "flora", id: item.id }, item);
    } else {
      f.task = null;
      f.action = null;
    }
    return;
  }

  if (carryTotal(f) >= f.carryMax) {
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
    if (carryTotal(f) > 0) {
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
  if (carryTotal(f) <= 0) return;
  for (const pt of depositPoints(state)) {
    if (Math.hypot(f.x - pt.x, f.y - pt.y) < DEPOSIT_RANGE) {
      let total = 0;
      for (const good of ["wood", "food", "stone"]) {
        if (f.carry[good] > 0) {
          state.stores[good] += f.carry[good];
          total += f.carry[good];
          f.carry[good] = 0;
        }
      }
      if (total > 0) state.bus.emit("deposit", { x: f.x, y: f.y, n: total });
      return;
    }
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

function walkToward(state, f, wt, pos, dt) {
  const key = `${wt.type}:${wt.id}`;
  if (f.path && f._pathFor !== key) f.path = null;
  if (!f.path) {
    if (f._pathFor === key) {
      f.workTarget = null;
      f.workLatch = false;
      return;
    }
    f._pathFor = key;
    const p = pathTo(state, f.x, f.y, pos.x, pos.y);
    if (!p) {
      f.workTarget = null;
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

function doWork(state, dt, wt, t) {
  const f = state.founder;
  if (wt.type === "flora") {
    f.action = t.kind === "rock" ? "mine" : t.kind === "berry" ? "pick" : "chop";
  } else if (t.state === "site") {
    f.action = "build";
  } else {
    f.action = "chop";
  }
  f.dir = Math.atan2(t.y - f.y, t.x - f.x);
  f.swing += dt * (f.swingRate + (f.skills.wood || 0) * 0.8);
  if (f.swing < 1) return;
  f.swing = 0;

  if (wt.type === "flora") {
    t.hp -= 1;
    t.shakeT = 0.22;
    f.skills.wood = Math.min(1, (f.skills.wood || 0) + 0.004);
    if (t.hp <= 0) {
      if (t.kind === "tree") {
        fellTree(state, t);
      } else if (t.kind === "berry") {
        t.state = "picked";
        t.regrowT = 50 + state.rng() * 40;
        state.bus.emit("picked", { x: t.x, y: t.y, id: t.id });
      } else if (t.kind === "rock") {
        t.state = "gone";
        state.bus.emit("quarried", { x: t.x, y: t.y, id: t.id });
      }
      const yieldInfo = FLORA_YIELD[t.kind];
      if (yieldInfo) {
        const before = carryTotal(f);
        const add = Math.min(yieldInfo.n, f.carryMax - before);
        f.carry[yieldInfo.good] = (f.carry[yieldInfo.good] || 0) + add;
        state.bus.emit("gather", { x: f.x, y: f.y, good: yieldInfo.good, n: add });
      }
      if (t.kind === "tree") f.blacklist.delete(t.id);
      f.workTarget = null;
      f._pathFor = null;
      f.action = null;
      if (f.workLatch) acquireWork(state, f, ACQUIRE_RANGE);
    } else {
      state.bus.emit(f.action === "mine" ? "mineHit" : f.action === "pick" ? "pickHit" : "chop", { x: t.x, y: t.y, id: t.id });
    }
    return;
  }

  const b = t;
  if (b.state === "site") {
    b.work += 1;
    state.bus.emit("build", { x: b.x, y: b.y, id: b.id, frac: b.work / b.maxWork });
    if (b.work >= b.maxWork) {
      completeBuilding(state, b);
      state.bus.emit("built", { x: b.x, y: b.y, kind: b.kind });
      f.workTarget = null;
      f.action = null;
      if (f.workLatch) acquireWork(state, f, ACQUIRE_RANGE);
    }
  } else if (b.kind === "hut") {
    const room = f.carryMax - carryTotal(f);
    const add = Math.min(1, room);
    f.carry.wood += add;
    state.bus.emit("saw", { x: b.x, y: b.y, n: add });
    if (carryTotal(f) >= f.carryMax) {
      f.workTarget = null;
      f.workLatch = false;
      goDeposit(state);
    }
  }
}

function acquireWork(state, f, range) {
  const foe = nearestEnemy(state, f, range);
  if (foe) {
    f.workTarget = { type: "enemy", id: foe.id };
    f.action = "attack";
    f.dir = Math.atan2(foe.y - f.y, foe.x - f.x);
    return;
  }
  let best = null;
  const cx = Math.floor(f.x);
  const cy = Math.floor(f.y);
  const r = Math.ceil(range) + 1;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      for (const item of floraAtCell(state, cx + dx, cy + dy)) {
        if (item.state !== "alive" || (item.kind !== "tree" && item.kind !== "rock" && item.kind !== "berry")) continue;
        const d = Math.hypot(item.x - f.x, item.y - f.y);
        if (d <= range && (!best || d < best.d)) best = { wt: { type: "flora", id: item.id }, pos: { x: item.x, y: item.y }, d };
      }
      const b = buildingAtCell(state, cx + dx, cy + dy);
      if (b) {
        const workable = b.state === "site" || (b.state === "built" && b.kind === "hut");
        if (workable) {
          const d = Math.hypot(b.x - f.x, b.y - f.y);
          if (d <= range && (!best || d < best.d)) best = { wt: { type: "building", id: b.id, x: b.x, y: b.y }, pos: { x: b.x, y: b.y }, d };
        }
      }
    }
  }
  if (best) {
    f.workTarget = best.wt;
    f._pathFor = null;
  } else {
    f.workLatch = false;
    f.workTarget = null;
  }
}

function nearestEnemy(state, f, range) {
  let best = null;
  for (const e of state.enemies ?? []) {
    if ((e.hp ?? 1) <= 0) continue;
    const d = Math.hypot(e.x - f.x, e.y - f.y);
    if (d <= range && (!best || d < best.d)) best = e;
  }
  return best;
}

export function findFloraNear(state, wx, wy, tol) {
  const cx = Math.floor(wx);
  const cy = Math.floor(wy);
  let best = null;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      for (const item of floraAtCell(state, cx + dx, cy + dy)) {
        if (item.state !== "alive") continue;
        const d = Math.hypot(item.x - wx, item.y - wy);
        if (d <= tol && (!best || d < best.d)) best = item;
      }
    }
  }
  return best;
}

export function findBuildingNear(state, wx, wy, tol) {
  let best = null;
  for (const b of state.buildings) {
    const workable = b.state === "site" || (b.state === "built" && b.kind === "hut");
    if (!workable) continue;
    const d = Math.hypot(b.x - wx, b.y - wy);
    if (d <= tol + 0.45 && (!best || d < best.d)) best = b;
  }
  return best;
}

function goDeposit(state) {
  const f = state.founder;
  const pts = depositPoints(state);
  let best = null;
  for (const pt of pts) {
    const spot = nearestWalkable(state, pt.x, pt.y, 3);
    if (!spot) continue;
    const p = pathTo(state, f.x, f.y, spot.x + 0.5, spot.y + 0.5);
    if (p && (!best || p.length < best.p.length)) best = { p };
  }
  if (best) {
    f.task = { type: "deposit" };
    f.path = best.p;
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
        for (const item of floraAtCell(state, cx + dx, cy + dy)) {
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
