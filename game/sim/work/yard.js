import { carryUnits, FLORA_YIELD } from "../../data/goods.js";
import { fellTree } from "../state.js";
import { capOf, storageCount, hasInputs, outputRoom, consumeInputs, produceOutputs, takeFromBuilding } from "../storage.js";
import { depositIntoBuilding, walkTask, swingTask, buildingWorkSpot, runCampRun, claimFlora, nearestFloraInRadius } from "./common.js";

const RECIPE = { in: { log: 2 }, out: { lumber: 1 }, swings: 4 };

export function scan(state, v, b) {
  if (carryUnits(v.carry) > 0) {
    if (buildingAcceptsAny(v, b)) return { kind: "store", claims: [] };
    return { kind: "campRun", claims: [] };
  }
  if (storageCount(b, "lumber") >= 6) return { kind: "outbound", good: "lumber", phase: 0, claims: [] };
  if (hasInputs(b, RECIPE) && outputRoom(b, RECIPE)) return { kind: "refine", swings: 0, claims: [] };
  if (storageCount(b, "log") < capOf(b, "log")) {
    const tree = nearestFloraInRadius(state, v, b.x, b.y, b.radius ?? 9, ["tree"]);
    if (tree) {
      const t = { kind: "chop", targetId: tree.item.id, claims: [] };
      claimFlora(state, v, t, tree.item);
      return t;
    }
  }
  return null;
}

function buildingAcceptsAny(v, b) {
  return ((v.carry.log ?? 0) > 0 && storageCount(b, "log") < capOf(b, "log")) || ((v.carry.lumber ?? 0) > 0 && storageCount(b, "lumber") < capOf(b, "lumber"));
}

export function run(state, v, b, t, dt) {
  if (t.kind === "campRun") return runCampRun(state, v, t, dt);
  if (t.kind === "store") return storeRun(state, v, b, dt);
  if (t.kind === "refine") return refineRun(state, v, b, t, dt);
  if (t.kind === "outbound") return outboundRun(state, v, b, t, dt);
  if (t.kind === "chop") return chopRun(state, v, b, t, dt);
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
  const done = swingTask(state, v, "lumberjack", "chop", b.x, b.y, dt, () => {
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

function chopRun(state, v, b, t, dt) {
  const tree = state.flora[t.targetId];
  if (!tree || tree.state !== "alive") return false;
  const d = Math.hypot(tree.x - v.x, tree.y - v.y);
  if (d > 1.45) {
    v.action = null;
    const w = walkTask(state, v, tree.x, tree.y, 1.05, dt);
    return w === "walking";
  }
  swingTask(state, v, "lumberjack", "chop", tree.x, tree.y, dt, () => {
    tree.hp -= 1;
    tree.shakeT = 0.22;
    state.bus.emit("chop", { x: tree.x, y: tree.y, id: tree.id });
    if (tree.hp <= 0) {
      fellTree(state, tree);
      const y = FLORA_YIELD.tree;
      v.carry[y.good] = (v.carry[y.good] ?? 0) + Math.min(y.n, Math.max(0, v.carryMax - carryUnits(v.carry)));
      state.bus.emit("gather", { x: v.x, y: v.y, good: y.good, n: y.n });
      t.done = true;
    }
  });
  return !t.done;
}
