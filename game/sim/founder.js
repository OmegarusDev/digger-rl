import { steerAlong } from "../../forge/paths.js";
import { floraAtCell, fellTree } from "./state.js";
import { pathTo, nearestWalkable } from "./grid.js";
import { mulberry32 } from "../../forge/rng.js";

const NAMES = ["Rowan", "Aldwin", "Bram", "Cedric", "Dunstan", "Edric", "Godric", "Wystan"];

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
    speed: 2.4,
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
    task: null,
    path: null,
    wp: 0,
    manualTarget: null,
    blacklist: new Map(),
    idleT: 0,
  };
}

export function updateFounder(state, dt) {
  const f = state.founder;
  f.moving = false;

  if (f.manualTarget) {
    const mt = f.manualTarget;
    f.manualTarget = null;
    const p = pathTo(state, f.x, f.y, mt.x, mt.y);
    if (p) {
      f.task = { type: "manual" };
      f.path = p;
      f.wp = 0;
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
      onArrive(state);
    }
    return;
  }

  if (f.task && f.task.type === "work") {
    doWork(state, dt);
    return;
  }

  decide(state, dt);
}

function onArrive(state) {
  const f = state.founder;
  if (!f.task) return;
  if (f.task.type === "deposit") {
    if (Math.hypot(f.x - (state.camp.x + 0.5), f.y - (state.camp.y + 0.5)) < 2.2) {
      const n = f.carry;
      state.stores.wood += n;
      state.bus.emit("deposit", { x: f.x, y: f.y, n });
      f.carry = 0;
    }
    f.task = null;
  } else if (f.task.type === "chop") {
    const item = state.flora[f.task.id];
    if (item && item.state === "alive") {
      f.task = { type: "work", id: item.id };
      f.action = "chop";
      f.swing = 0;
    } else {
      f.task = null;
    }
  } else if (f.task.type === "manual") {
    f.task = null;
  }
}

function doWork(state, dt) {
  const f = state.founder;
  const item = state.flora[f.task.id];
  if (!item || item.state !== "alive") {
    f.task = null;
    f.action = null;
    return;
  }
  f.action = f.task.action || "chop";
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
      f.task = null;
      f.action = null;
      f.blacklist.delete(item.id);
    } else {
      state.bus.emit(f.action === "mine" ? "mineHit" : "chop", { x: item.x, y: item.y, id: item.id });
    }
  }
}

function decide(state, dt) {
  const f = state.founder;
  f.action = null;
  f.idleT += dt;

  if (f.carry >= f.carryMax) {
    goDeposit(state);
    return;
  }

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

  if (f.idleT > 4) {
    f.idleT = 0;
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
