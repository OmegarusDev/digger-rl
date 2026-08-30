import { floraAtCell, fellTree, completeBuilding, depositPoints, buildingAtCell } from "./state.js";
import { nearestWalkable, pathTo } from "./grid.js";
import { steerAlong } from "../../forge/paths.js";
import { mulberry32 } from "../../forge/rng.js";

const NAMES = ["Rowan", "Aldwin", "Bram", "Cedric", "Dunstan", "Edric", "Godric", "Wystan"];
export const WORK_RANGE = 1.45;
const REACH = 1.6;
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
    stuckT: 0,
    detour: null,
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

export function updateFounder(state, dt) {
  const f = state.founder;
  f.moving = false;

  autoDeposit(state, f);

  const cmd = f.cmd || { dx: 0, dy: 0 };
  if (cmd.dx !== 0 || cmd.dy !== 0) {
    if (f.workLatch || f.workTarget) {
      f.workLatch = false;
      f.workTarget = null;
      f.action = null;
    }
    const len = Math.hypot(cmd.dx, cmd.dy) || 1;
    const dirx = cmd.dx / len;
    const diry = cmd.dy / len;
    if (f.detour && dirx * f.detour.dx + diry * f.detour.dy < 0.5) f.detour = null;

    if (f.detour) {
      const bx = f.x;
      const by = f.y;
      const done = steerAlong(f, f.detour.path, f.speed, dt);
      f.phase += dt * f.speed * 0.62;
      f.moving = true;
      const stepped = Math.hypot(f.x - bx, f.y - by);
      if (done || stepped < f.speed * dt * 0.3) f.detour = null;
      return;
    }

    const sp = f.speed * dt;
    const bx = f.x;
    const by = f.y;
    tryMove(state, f, dirx * sp, diry * sp);
    f.dir = Math.atan2(diry, dirx);
    f.phase += dt * f.speed * 0.62;
    f.moving = true;
    f.action = null;
    const stepped = Math.hypot(f.x - bx, f.y - by);
    if (stepped < sp * 0.35) {
      f.stuckT += dt;
      if (f.stuckT > 0.3) {
        f.stuckT = 0;
        const tgt = detourTarget(state, f, dirx, diry);
        if (tgt) {
          const p = pathTo(state, f.x, f.y, tgt.x, tgt.y);
          if (p && p.length > 1) f.detour = { path: p, wp: 0, dx: dirx, dy: diry };
        }
      }
    } else {
      f.stuckT = 0;
    }
    return;
  }

  if (f.workLatch && !f.workTarget) acquireWork(state, f, REACH);
  if (f.workTarget && !resolveTarget(state, f.workTarget)) {
    const wasLatch = f.workLatch;
    f.workTarget = null;
    if (wasLatch) acquireWork(state, f, REACH);
  }

  if (f.workTarget) {
    const t = resolveTarget(state, f.workTarget);
    const d = Math.hypot(t.x - f.x, t.y - f.y);
    if (d > WORK_RANGE) {
      f.workTarget = null;
      f.workLatch = false;
      f.action = null;
      return;
    }
    doWork(state, dt, f.workTarget, t);
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

function detourTarget(state, f, dirx, diry) {
  const cx = Math.floor(f.x);
  const cy = Math.floor(f.y);
  let best = null;
  let bestScore = 0.25;
  for (let r = 2; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const cellx = cx + dx;
        const celly = cy + dy;
        if (!isWalkableCell(state, cellx, celly)) continue;
        const len = Math.hypot(dx, dy) || 1;
        const score = (dx / len) * dirx + (dy / len) * diry;
        if (score > bestScore) {
          bestScore = score;
          best = { x: cellx + 0.5, y: celly + 0.5 };
        }
      }
    }
  }
  return best;
}

function isWalkableCell(state, cx, cy) {
  const n = state.size;
  if (cx < 0 || cy < 0 || cx >= n || cy >= n) return false;
  return state.walk[cy * n + cx] === 1;
}

function handsFull(state, f) {
  f.workLatch = false;
  f.workTarget = null;
  f.action = null;
  state.bus.emit("handsFull", { x: f.x, y: f.y });
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
    if (carryTotal(f) >= f.carryMax) {
      handsFull(state, f);
      return;
    }
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
      f.workTarget = null;
      f.action = null;
      if (f.workLatch) acquireWork(state, f, REACH);
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
      f.workTarget = null;
      f.action = null;
      if (f.workLatch) acquireWork(state, f, REACH);
    }
  } else if (b.kind === "hut") {
    const room = f.carryMax - carryTotal(f);
    if (room <= 0) {
      handsFull(state, f);
      return;
    }
    const add = Math.min(1, room);
    f.carry.wood += add;
    state.bus.emit("saw", { x: b.x, y: b.y, n: add });
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
  if (carryTotal(f) >= f.carryMax) {
    handsFull(state, f);
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
        if (d <= range && (!best || d < best.d)) best = { wt: { type: "flora", id: item.id }, d };
      }
      const b = buildingAtCell(state, cx + dx, cy + dy);
      if (b) {
        const workable = b.state === "site" || (b.state === "built" && b.kind === "hut");
        if (workable) {
          const d = Math.hypot(b.x - f.x, b.y - f.y);
          if (d <= range && (!best || d < best.d)) best = { wt: { type: "building", id: b.id, x: b.x, y: b.y }, d };
        }
      }
    }
  }
  if (best) f.workTarget = best.wt;
  else f.workLatch = false;
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
