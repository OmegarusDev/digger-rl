import { buildingById } from "./state.js";
import { steerTo } from "./mover.js";
import { carryUnits } from "../data/goods.js";
import { depositCarry, nearestDeposit } from "./haul.js";
import { villagerSwingRate, gainSkill } from "./villager.js";

const HAUL_AT = 4;

export function workTick(state, v, dt) {
  const b = buildingById(state, v.workplace.id);
  if (!b || b.state !== "built") {
    v.workplace = null;
    return false;
  }
  const prof = v.workplace.job;
  if (prof === "sawyer") return sawyerTick(state, v, b, dt);
  return false;
}

function sawyerTick(state, v, b, dt) {
  if (carryUnits(v.carry) >= HAUL_AT) {
    const pt = nearestDeposit(state, v.x, v.y);
    if (!pt) return false;
    v.action = null;
    const arrived = steerTo(state, v, pt.x, pt.y + 0.55, dt, 0.8);
    if (arrived) depositCarry(state, v);
    return true;
  }
  const d = Math.hypot(b.x - v.x, b.y - v.y);
  if (d > 1.1) {
    v.action = null;
    steerTo(state, v, b.x, b.y + 0.55, dt, 0.3);
    return true;
  }
  v.action = "chop";
  v.dir = Math.atan2(b.y - v.y, b.x - v.x);
  v.swing += dt * villagerSwingRate(state, v, "sawyer");
  if (v.swing < 1) return true;
  v.swing = 0;
  gainSkill(v, "sawyer");
  v.carry.log = (v.carry.log ?? 0) + 1;
  state.bus.emit("saw", { x: b.x, y: b.y, n: 1 });
  return true;
}
