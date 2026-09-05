import { carryUnits } from "../../data/goods.js";
import { walkTask, swingTask, buildingWorkSpot, depositIntoBuilding, claimFlora } from "./common.js";
import { nearestFieldTask, claimField, fieldSwingHit, harvestYield, fieldAction } from "../fields.js";

export function scan(state, v, b) {
  if (carryUnits(v.carry) > 0) return { kind: "store", claims: [] };
  const ft = nearestFieldTask(state, v, b);
  if (ft) {
    const t = { kind: ft.act, fieldId: ft.field.id, claims: [] };
    claimField(state, v, t, ft.field);
    return t;
  }
  return null;
}

export function run(state, v, b, t, dt) {
  if (t.kind === "store") return storeRun(state, v, b, dt);
  if (t.kind === "sow" || t.kind === "water" || t.kind === "harvest") return fieldRun(state, v, t, dt);
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

function fieldRun(state, v, t, dt) {
  const field = (state.fields ?? []).find((f) => f.id === t.fieldId);
  if (!field) return false;
  const act = fieldAction(field);
  if (!act || act !== t.kind) return false;
  const d = Math.hypot(field.cx - v.x, field.cy - v.y);
  if (d > 0.9) {
    v.action = null;
    const w = walkTask(state, v, field.cx, field.cy, 0.8, dt);
    return w === "walking";
  }
  swingTask(state, v, "farmer", t.kind === "harvest" ? "chop" : "pick", field.cx, field.cy, dt, () => {
    const done = fieldSwingHit(state, field);
    if (done === "harvest") {
      const y = harvestYield(field);
      v.carry[y.good] = (v.carry[y.good] ?? 0) + Math.min(y.n, Math.max(0, v.carryMax - carryUnits(v.carry)));
      state.bus.emit("gather", { x: v.x, y: v.y, good: y.good, n: y.n });
    }
  });
  return true;
}
