import { depositPoints } from "./state.js";
import { CARRY_GOODS, DEPOSIT_AS, DEPOSIT_VALUE } from "../data/goods.js";
import { BUILDINGS } from "../data/buildings.js";
import { addToBuilding } from "./storage.js";

export function depositCarry(state, agent) {
  let total = 0;
  for (const good of CARRY_GOODS) {
    const n = agent.carry[good] ?? 0;
    if (!n) continue;
    const target = DEPOSIT_AS[good];
    if (!target) continue;
    state.stores[target] = (state.stores[target] ?? 0) + n * (DEPOSIT_VALUE[good] ?? 1);
    total += n;
    agent.carry[good] = 0;
  }
  if (total > 0) state.bus.emit("deposit", { x: agent.x, y: agent.y, n: total });
  return total;
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

export function nearestDeposit(state, x, y) {
  let best = null;
  for (const pt of depositPoints(state)) {
    const d = Math.hypot(pt.x - x, pt.y - y);
    if (!best || d < best.d) best = { ...pt, d };
  }
  return best;
}
