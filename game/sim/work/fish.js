import { isWalkable } from "../grid.js";
import { carryUnits } from "../../data/goods.js";
import { capOf, storageCount, takeFromBuilding } from "../storage.js";
import { depositIntoBuilding, walkTask, swingTask, buildingWorkSpot, runCampRun } from "./common.js";

export function scan(state, v, b) {
  if (carryUnits(v.carry) > 0) {
    if (storageCount(b, "food") < capOf(b, "food")) return { kind: "store", claims: [] };
    return { kind: "campRun", claims: [] };
  }
  if (storageCount(b, "food") >= 8) return { kind: "outbound", good: "food", phase: 0, claims: [] };
  const spot = findShoreSpot(state, b, b.radius ?? 8);
  if (spot) return { kind: "fish", x: spot.x, y: spot.y, claims: [] };
  return null;
}

export function run(state, v, b, t, dt) {
  if (t.kind === "campRun") return runCampRun(state, v, t, dt);
  if (t.kind === "store") return storeRun(state, v, b, dt);
  if (t.kind === "outbound") return outboundRun(state, v, b, t, dt);
  if (t.kind === "fish") return fishRun(state, v, t, dt);
  return false;
}

function findShoreSpot(state, b, radius) {
  const r = Math.ceil(radius);
  const x0 = Math.floor(b.x);
  const y0 = Math.floor(b.y);
  let best = null;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const cx = x0 + dx;
      const cy = y0 + dy;
      if (!isWalkable(state, cx, cy)) continue;
      if (Math.hypot(cx + 0.5 - b.x, cy + 0.5 - b.y) > radius) continue;
      let shore = false;
      for (const [nx, ny] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!isWalkable(state, cx + nx, cy + ny) && inBounds(state, cx + nx, cy + ny)) {
          shore = true;
          break;
        }
      }
      if (!shore) continue;
      const dv = Math.hypot(cx + 0.5 - v.x, cy + 0.5 - v.y);
      if (!best || dv < best.dv) best = { x: cx + 0.5, y: cy + 0.5, dv };
    }
  }
  return best;
}

function inBounds(state, cx, cy) {
  return cx >= 0 && cy >= 0 && cx < state.size && cy < state.size;
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

function fishRun(state, v, t, dt) {
  const d = Math.hypot(t.x - v.x, t.y - v.y);
  if (d > 0.7) {
    v.action = null;
    const w = walkTask(state, v, t.x, t.y, 0.35, dt);
    return w === "walking";
  }
  swingTask(state, v, "fisher", "fish", t.x + (v.x < t.x ? 1 : -1) * 0.8, t.y, dt, () => {
    v.carry.food = (v.carry.food ?? 0) + Math.min(2, Math.max(0, v.carryMax - carryUnits(v.carry)));
    state.bus.emit("gather", { x: v.x, y: v.y, good: "food", n: 2 });
  });
  return true;
}
