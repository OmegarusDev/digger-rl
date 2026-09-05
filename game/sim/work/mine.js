import { carryUnits, FLORA_YIELD } from "../../data/goods.js";
import { capOf, storageCount, hasInputs, outputRoom, consumeInputs, produceOutputs, takeFromBuilding } from "../storage.js";
import { depositIntoBuilding, walkTask, swingTask, buildingWorkSpot, runCampRun, claimFlora, nearestFloraInRadius } from "./common.js";

const RECIPE = { in: { rawStone: 2 }, out: { stoneBlock: 1 }, swings: 4 };

export function scan(state, v, b) {
  if (carryUnits(v.carry) > 0) {
    if (buildingAcceptsAny(v, b)) return { kind: "store", claims: [] };
    return { kind: "campRun", claims: [] };
  }
  if (storageCount(b, "stoneBlock") >= 6) return { kind: "outbound", good: "stoneBlock", phase: 0, claims: [] };
  if (hasInputs(b, RECIPE) && outputRoom(b, RECIPE)) return { kind: "refine", swings: 0, claims: [] };
  if (storageCount(b, "rawStone") < capOf(b, "rawStone")) {
    const rock = nearestFloraInRadius(state, v, b.x, b.y, b.radius ?? 8, ["rock"]);
    if (rock) {
      const t = { kind: "quarry", targetId: rock.item.id, claims: [] };
      claimFlora(state, v, t, rock.item);
      return t;
    }
  }
  return null;
}

function buildingAcceptsAny(v, b) {
  return ((v.carry.rawStone ?? 0) > 0 && storageCount(b, "rawStone") < capOf(b, "rawStone")) || ((v.carry.stoneBlock ?? 0) > 0 && storageCount(b, "stoneBlock") < capOf(b, "stoneBlock"));
}

export function run(state, v, b, t, dt) {
  if (t.kind === "campRun") return runCampRun(state, v, t, dt);
  if (t.kind === "store") return storeRun(state, v, b, dt);
  if (t.kind === "refine") return refineRun(state, v, b, t, dt);
  if (t.kind === "outbound") return outboundRun(state, v, b, t, dt);
  if (t.kind === "quarry") return quarryRun(state, v, t, dt);
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
  const done = swingTask(state, v, "miner", "mine", b.x, b.y, dt, () => {
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

function quarryRun(state, v, t, dt) {
  const rock = state.flora[t.targetId];
  if (!rock || rock.state !== "alive") return false;
  const d = Math.hypot(rock.x - v.x, rock.y - v.y);
  if (d > 1.45) {
    v.action = null;
    const w = walkTask(state, v, rock.x, rock.y, 1.05, dt);
    return w === "walking";
  }
  swingTask(state, v, "miner", "mine", rock.x, rock.y, dt, () => {
    rock.hp -= 1;
    rock.shakeT = 0.22;
    state.bus.emit("mineHit", { x: rock.x, y: rock.y, id: rock.id });
    if (rock.hp <= 0) {
      rock.state = "gone";
      state.bus.emit("quarried", { x: rock.x, y: rock.y, id: rock.id });
      const y = FLORA_YIELD.rock;
      v.carry[y.good] = (v.carry[y.good] ?? 0) + Math.min(y.n, Math.max(0, v.carryMax - carryUnits(v.carry)));
      state.bus.emit("gather", { x: v.x, y: v.y, good: y.good, n: y.n });
      t.done = true;
    }
  });
  return !t.done;
}
