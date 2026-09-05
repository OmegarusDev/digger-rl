import { carryUnits } from "../../data/goods.js";
import { walkTask, swingTask, buildingWorkSpot, runCampRun, depositIntoBuilding } from "./common.js";
import { hasInputs, outputRoom, consumeInputs, produceOutputs, takeFromBuilding, storageCount } from "../storage.js";
import { buildingById } from "../state.js";

const RECIPE = { in: { flour: 1 }, out: { bread: 1 }, swings: 4 };

export function scan(state, v, b) {
  if (carryUnits(v.carry) > 0) {
    if ((v.carry.bread ?? 0) > 0 && storageCount(b, "bread") >= 8) return { kind: "campRun", claims: [] };
    return { kind: "store", claims: [] };
  }
  if (storageCount(b, "bread") >= 6) return { kind: "outbound", good: "bread", phase: 0, claims: [] };
  if (hasInputs(b, RECIPE) && outputRoom(b, RECIPE)) return { kind: "refine", swings: 0, claims: [] };
  if (storageCount(b, "flour") < 1) {
    const mill = state.buildings.find((bb) => bb.kind === "mill" && bb.state === "built" && storageCount(bb, "flour") >= 1);
    if (mill) return { kind: "fetch", fromId: mill.id, good: "flour", n: 2, phase: 0, claims: [] };
  }
  return null;
}

export function run(state, v, b, t, dt) {
  if (t.kind === "campRun") return runCampRun(state, v, t, dt);
  if (t.kind === "store") return storeRun(state, v, b, dt);
  if (t.kind === "refine") return refineRun(state, v, b, t, dt);
  if (t.kind === "outbound") return outboundRun(state, v, b, t, dt);
  if (t.kind === "fetch") return fetchRun(state, v, b, t, dt);
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

function refineRun(state, v, b, t, dt) {
  const spot = buildingWorkSpot(b);
  const w = walkTask(state, v, spot.x, spot.y, 0.35, dt);
  if (w === "stuck") return false;
  if (w === "walking") {
    v.action = null;
    return true;
  }
  const done = swingTask(state, v, "baker", "chop", b.x, b.y, dt, () => {
    t.swings++;
  });
  if (done && t.swings >= RECIPE.swings) {
    if (!hasInputs(b, RECIPE) || !outputRoom(b, RECIPE)) return false;
    consumeInputs(state, b, RECIPE);
    produceOutputs(state, b, RECIPE);
    return false;
  }
  return true;
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

function fetchRun(state, v, b, t, dt) {
  if (t.phase === 0) {
    const from = buildingById(state, t.fromId);
    if (!from || from.state !== "built") return false;
    const spot = buildingWorkSpot(from);
    const w = walkTask(state, v, spot.x, spot.y, 0.4, dt);
    if (w === "stuck") return false;
    if (w === "walking") {
      v.action = null;
      return true;
    }
    const took = takeFromBuilding(state, from, t.good, t.n);
    if (!took) return false;
    v.carry[t.good] = (v.carry[t.good] ?? 0) + took;
    t.phase = 1;
    return true;
  }
  return storeRun(state, v, b, dt);
}
