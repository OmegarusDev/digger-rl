import { carryUnits } from "../../data/goods.js";
import { walkTask, swingTask, buildingWorkSpot, runCampRun } from "./common.js";
import { nearestDeposit } from "../haul.js";

export function scan(state, v, b) {
  if (carryUnits(v.carry) >= 4) {
    const pt = nearestDeposit(state, v.x, v.y);
    return pt ? { kind: "campRun", pt } : null;
  }
  return { kind: "saw" };
}

export function run(state, v, b, t, dt) {
  if (t.kind === "campRun") return runCampRun(state, v, t, dt);
  if (carryUnits(v.carry) >= v.carryMax) return false;
  const spot = buildingWorkSpot(b);
  const w = walkTask(state, v, spot.x, spot.y, 0.3, dt);
  if (w === "stuck") return false;
  if (w === "walking") {
    v.action = null;
    return true;
  }
  swingTask(state, v, "sawyer", "chop", b.x, b.y, dt, () => {
    v.carry.log = (v.carry.log ?? 0) + 1;
    state.bus.emit("saw", { x: b.x, y: b.y, n: 1 });
  });
  return true;
}
