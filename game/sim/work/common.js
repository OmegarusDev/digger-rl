import { BUILDINGS } from "../../data/buildings.js";
import { carryUnits } from "../../data/goods.js";
import { steerTo } from "../mover.js";
import { depositCarry, nearestDeposit } from "../haul.js";
import { addToBuilding, capOf, storageCount } from "../storage.js";
import { villagerSwingRate, gainSkill } from "../villager.js";
import { floraAtCell } from "../state.js";
import { pathTo } from "../grid.js";

export function buildingWorkSpot(b) {
  return { x: b.x, y: b.y + 0.55 };
}

export function walkTask(state, v, x, y, tol, dt) {
  const arrived = steerTo(state, v, x, y, dt, tol);
  if (arrived) return "arrived";
  if (v.noProgress > 6) return "stuck";
  return "walking";
}

export function swingTask(state, v, prof, action, tx, ty, dt, onHit) {
  v.action = action;
  v.dir = Math.atan2(ty - v.y, tx - v.x);
  v.swing += dt * villagerSwingRate(state, v, prof);
  if (v.swing < 1) return false;
  v.swing = 0;
  gainSkill(v, prof);
  onHit();
  return true;
}

export function depositIntoBuilding(state, b, agent) {
  const def = BUILDINGS[b.kind];
  if (!def.storage || !b.storage) return depositCarry(state, agent);
  let moved = 0;
  for (const good of Object.keys(def.storage)) {
    const n = agent.carry[good] ?? 0;
    if (!n) continue;
    const accepted = addToBuilding(state, b, good, n);
    if (accepted > 0) {
      agent.carry[good] = n - accepted;
      moved += accepted;
    }
  }
  return moved;
}

export function buildingAccepts(v, b) {
  const def = BUILDINGS[b.kind];
  if (!def.storage || !b.storage) return false;
  for (const good of Object.keys(def.storage)) {
    if ((v.carry[good] ?? 0) > 0 && storageCount(b, good) < capOf(b, good)) return true;
  }
  return false;
}

export function runCampRun(state, v, task, dt) {
  const pt = task.pt ?? (task.pt = nearestDeposit(state, v.x, v.y));
  if (!pt) return false;
  const w = walkTask(state, v, pt.x, pt.y + 0.55, 0.8, dt);
  if (w === "arrived") {
    depositCarry(state, v);
    return false;
  }
  return w === "walking";
}

export function claimFlora(state, v, task, item) {
  task.claims.push(item.id);
  item.claimedBy = v.id;
}

export function releaseTask(state, v) {
  const t = v.task;
  if (!t?.claims) return;
  for (const id of t.claims) {
    const f = state.flora[id];
    if (f && f.claimedBy === v.id) f.claimedBy = null;
  }
}

export function nearestFloraInRadius(state, v, cx, cy, radius, kinds) {
  const r = Math.ceil(radius);
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const cands = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      for (const item of floraAtCell(state, x0 + dx, y0 + dy)) {
        if (item.state !== "alive" || !kinds.includes(item.kind)) continue;
        if (item.claimedBy != null && item.claimedBy !== v.id) continue;
        if (Math.hypot(item.x - cx, item.y - cy) > radius) continue;
        cands.push({ item, dv: Math.hypot(item.x - v.x, item.y - v.y) });
      }
    }
  }
  cands.sort((a, b) => a.dv - b.dv);
  for (const c of cands.slice(0, 8)) {
    if (pathTo(state, v.x, v.y, c.item.x, c.item.y)) return c;
  }
  return null;
}
