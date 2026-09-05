import { BUILDINGS } from "../data/buildings.js";
import { GOODS } from "../data/goods.js";

export function housesOf(state) {
  return state.buildings.filter((b) => b.kind === "house" && b.state === "built");
}

export function usedBeds(state, h) {
  let n = 0;
  for (const v of state.villagers) if (v.home === h.id) n++;
  return n;
}

export function buildBed(state, h) {
  const def = BUILDINGS.house;
  if (h.beds >= def.bedsCap) return { ok: false, reason: "No room for another bed" };
  for (const [good, cost] of Object.entries(def.bedCost)) {
    if ((state.stores[good] ?? 0) < cost) return { ok: false, reason: `Need ${cost} ${GOODS[good].name}` };
  }
  for (const [good, cost] of Object.entries(def.bedCost)) state.stores[good] -= cost;
  h.beds += 1;
  state.bus.emit("bedBuilt", { x: h.x, y: h.y, beds: h.beds });
  return { ok: true, reason: "" };
}

export function claimBed(state, v) {
  let best = null;
  let bestD = Infinity;
  for (const h of housesOf(state)) {
    if (usedBeds(state, h) >= h.beds) continue;
    const d = Math.hypot(h.x - v.x, h.y - v.y);
    if (d < bestD) {
      bestD = d;
      best = h;
    }
  }
  if (!best) return null;
  v.home = best.id;
  return best;
}

export function releaseBed(state, v) {
  v.home = null;
}
