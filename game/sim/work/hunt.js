import { carryUnits } from "../../data/goods.js";
import { capOf, storageCount, takeFromBuilding } from "../storage.js";
import { depositIntoBuilding, walkTask, swingTask, buildingWorkSpot, runCampRun } from "./common.js";
import { nearestDeer, lodgeTraps, addTrap, removeDeer } from "../fauna.js";
import { isWalkable } from "../grid.js";

export function scan(state, v, b) {
  if (carryUnits(v.carry) > 0) {
    if (storageCount(b, "food") < capOf(b, "food")) return { kind: "store", claims: [] };
    return { kind: "campRun", claims: [] };
  }
  if (storageCount(b, "food") >= 6) return { kind: "outbound", good: "food", phase: 0, claims: [] };
  const caught = lodgeTraps(state, b.id).find((t) => t.caught);
  if (caught) return { kind: "collect", trap: caught, claims: [] };
  if (lodgeTraps(state, b.id).length < 3 && (state.stores.log ?? 0) >= 1) {
    const spot = trapSpot(state, b);
    if (spot) return { kind: "trap", x: spot.x, y: spot.y, swings: 0, claims: [] };
  }
  const deer = nearestDeer(state, b.x, b.y, b.radius ?? 10);
  if (deer) return { kind: "hunt", targetId: deer.deer.id, claims: [] };
  return null;
}

function trapSpot(state, b) {
  for (let tries = 0; tries < 20; tries++) {
    const ang = state.rng() * Math.PI * 2;
    const dist = 3 + state.rng() * 6;
    const cx = Math.floor(b.x + Math.cos(ang) * dist);
    const cy = Math.floor(b.y + Math.sin(ang) * dist);
    if (!isWalkable(state, cx, cy)) continue;
    if (Math.hypot(cx + 0.5 - state.camp.x, cy + 0.5 - state.camp.y) < 5) continue;
    return { x: cx + 0.5, y: cy + 0.5 };
  }
  return null;
}

export function run(state, v, b, t, dt) {
  if (t.kind === "campRun") return runCampRun(state, v, t, dt);
  if (t.kind === "store") return storeRun(state, v, b, dt);
  if (t.kind === "outbound") return outboundRun(state, v, b, t, dt);
  if (t.kind === "collect") return collectRun(state, v, t, dt);
  if (t.kind === "trap") return trapRun(state, v, b, t, dt);
  if (t.kind === "hunt") return huntRun(state, v, b, t, dt);
  return false;
}

function storeRun(state, v, b, dt) {
  const spot = buildingWorkSpot(b);
  const w = walkTask(state, v, spot.x, spot.y, 0.35, dt);
  if (w === "stuck") return false;
  if (w === "walking") {
    v.action = null;
    return true;
  }
  depositIntoBuilding(state, b, v);
  return false;
}

function outboundRun(state, v, b, t, dt) {
  if (t.phase === 0) {
    const spot = buildingWorkSpot(b);
    const w = walkTask(state, v, spot.x, spot.y, 0.35, dt);
    if (w === "stuck") return false;
    if (w === "walking") {
      v.action = null;
      return true;
    }
    const took = takeFromBuilding(state, b, t.good, 4);
    if (!took) return false;
    v.carry[t.good] = (v.carry[t.good] ?? 0) + took;
    t.phase = 1;
    return true;
  }
  return runCampRun(state, v, t, dt);
}

function collectRun(state, v, t, dt) {
  const trap = t.trap;
  if (!state.fauna.traps.includes(trap)) return false;
  const d = Math.hypot(trap.x - v.x, trap.y - v.y);
  if (d > 0.6) {
    v.action = null;
    const w = walkTask(state, v, trap.x, trap.y, 0.35, dt);
    return w === "walking";
  }
  const i = state.fauna.traps.indexOf(trap);
  state.fauna.traps.splice(i, 1);
  v.carry.food = (v.carry.food ?? 0) + Math.min(1, Math.max(0, v.carryMax - carryUnits(v.carry)));
  state.bus.emit("gather", { x: v.x, y: v.y, good: "food", n: 1 });
  return false;
}

function trapRun(state, v, b, t, dt) {
  const d = Math.hypot(t.x - v.x, t.y - v.y);
  if (d > 0.6) {
    v.action = null;
    const w = walkTask(state, v, t.x, t.y, 0.35, dt);
    return w === "walking";
  }
  const done = swingTask(state, v, "hunter", "build", t.x, t.y, dt, () => {
    t.swings++;
  });
  if (done && t.swings >= 3) {
    if ((state.stores.log ?? 0) < 1) return false;
    state.stores.log -= 1;
    addTrap(state, b.id, t.x, t.y);
    state.bus.emit("trapSet", { x: t.x, y: t.y });
    return false;
  }
  return true;
}

function huntRun(state, v, b, t, dt) {
  const deer = state.fauna.deer.find((d) => d.id === t.targetId);
  if (!deer) return false;
  const d = Math.hypot(deer.x - v.x, deer.y - v.y);
  if (d > 1.0) {
    v.action = null;
    const w = walkTask(state, v, deer.x, deer.y, 0.7, dt);
    if (w === "stuck") return false;
    return true;
  }
  swingTask(state, v, "hunter", "attack", deer.x, deer.y, dt, () => {
    deer.hp -= 1;
    deer.flash = 0.3;
    state.bus.emit("chop", { x: deer.x, y: deer.y, id: deer.id });
    if (deer.hp <= 0) {
      removeDeer(state, deer);
      v.carry.food = (v.carry.food ?? 0) + Math.min(2, Math.max(0, v.carryMax - carryUnits(v.carry)));
      state.bus.emit("hunt", { x: v.x, y: v.y, good: "food", n: 2 });
      t.done = true;
    }
  });
  return !t.done;
}
