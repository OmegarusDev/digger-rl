import { carryUnits } from "../../data/goods.js";
import { capOf, storageCount, takeFromBuilding } from "../storage.js";
import { depositIntoBuilding, walkTask, swingTask, buildingWorkSpot, runCampRun, claimFlora, nearestFloraInRadius } from "./common.js";

export function scan(state, v, b) {
  if (carryUnits(v.carry) > 0) {
    if (storageCount(b, "food") < capOf(b, "food")) return { kind: "store", claims: [] };
    return { kind: "campRun", claims: [] };
  }
  if (storageCount(b, "food") >= 8) return { kind: "outbound", good: "food", phase: 0, claims: [] };
  const berry = nearestFloraInRadius(state, v, b.x, b.y, b.radius ?? 8, ["berry"]);
  if (berry) {
    const t = { kind: "pick", targetId: berry.item.id, claims: [] };
    claimFlora(state, v, t, berry.item);
    return t;
  }
  return null;
}

export function run(state, v, b, t, dt) {
  if (t.kind === "campRun") return runCampRun(state, v, t, dt);
  if (t.kind === "store") return storeRun(state, v, b, dt);
  if (t.kind === "outbound") return outboundRun(state, v, b, t, dt);
  if (t.kind === "pick") return pickRun(state, v, t, dt);
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

function pickRun(state, v, t, dt) {
  const bush = state.flora[t.targetId];
  if (!bush || bush.state !== "alive") return false;
  const d = Math.hypot(bush.x - v.x, bush.y - v.y);
  if (d > 1.2) {
    v.action = null;
    const w = walkTask(state, v, bush.x, bush.y, 0.9, dt);
    return w === "walking";
  }
  swingTask(state, v, "gatherer", "pick", bush.x, bush.y, dt, () => {
    bush.hp -= 1;
    bush.shakeT = 0.2;
    state.bus.emit("pickHit", { x: bush.x, y: bush.y, id: bush.id });
    if (bush.hp <= 0) {
      bush.state = "picked";
      bush.regrowT = 50 + state.rng() * 40;
      state.bus.emit("picked", { x: bush.x, y: bush.y, id: bush.id });
      v.carry.food = (v.carry.food ?? 0) + Math.min(2, Math.max(0, v.carryMax - carryUnits(v.carry)));
      state.bus.emit("gather", { x: v.x, y: v.y, good: "food", n: 2 });
      t.done = true;
    }
  });
  return !t.done;
}
