import { carryUnits } from "../../data/goods.js";
import { walkTask, swingTask, buildingWorkSpot, depositIntoBuilding } from "./common.js";
import { hasInputs, outputRoom, consumeInputs, produceOutputs, takeFromBuilding, storageCount } from "../storage.js";
import { buildingById } from "../state.js";

const RECIPE = { in: { grain: 1 }, out: { flour: 1 }, swings: 4 };

export function scan(state, v, b) {
  if (carryUnits(v.carry) > 0) return { kind: "store", claims: [] };
  if (hasInputs(b, RECIPE) && outputRoom(b, RECIPE)) return { kind: "refine", swings: 0, claims: [] };
  if (storageCount(b, "grain") < 1) {
    const barn = state.buildings.find((bb) => bb.kind === "barn" && bb.state === "built" && storageCount(bb, "grain") >= 1);
    if (barn) return { kind: "fetch", fromId: barn.id, good: "grain", n: 1, phase: 0, claims: [] };
  }
  return null;
}

export function run(state, v, b, t, dt) {
  if (t.kind === "store") return storeRun(state, v, b, dt);
  if (t.kind === "refine") return refineRun(state, v, b, t, dt);
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
  const done = swingTask(state, v, "miller", "chop", b.x, b.y, dt, () => {
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
