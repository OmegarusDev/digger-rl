import { BUILDINGS } from "../data/buildings.js";
import { GOODS } from "../data/goods.js";

export function capOf(b, good) {
  const def = BUILDINGS[b.kind];
  const base = def.storage?.[good] ?? 0;
  const adds = def.storageUpgrade?.adds?.[good] ?? 0;
  return base + adds * (b.storageLvl ?? 0);
}

export function storageCount(b, good) {
  return b.storage?.[good] ?? 0;
}

export function addToBuilding(state, b, good, n) {
  if (!b.storage) return 0;
  const cur = storageCount(b, good);
  const accepted = Math.max(0, Math.min(n, capOf(b, good) - cur));
  if (accepted > 0) {
    b.storage[good] = cur + accepted;
    state.bus.emit("bstore", { x: b.x, y: b.y, id: b.id, good, n: accepted });
  }
  return accepted;
}

export function takeFromBuilding(state, b, good, n) {
  if (!b.storage) return 0;
  const cur = storageCount(b, good);
  const took = Math.min(cur, n);
  if (took > 0) b.storage[good] = cur - took;
  return took;
}

export function hasInputs(b, recipe) {
  for (const [good, n] of Object.entries(recipe.in)) {
    if (storageCount(b, good) < n) return false;
  }
  return true;
}

export function outputRoom(b, recipe) {
  for (const [good, n] of Object.entries(recipe.out)) {
    if (storageCount(b, good) + n > capOf(b, good)) return false;
  }
  return true;
}

export function consumeInputs(state, b, recipe) {
  for (const [good, n] of Object.entries(recipe.in)) takeFromBuilding(state, b, good, n);
}

export function produceOutputs(state, b, recipe) {
  for (const [good, n] of Object.entries(recipe.out)) {
    b.storage[good] = (b.storage[good] ?? 0) + n;
    state.bus.emit("refined", { x: b.x, y: b.y, id: b.id, good, n });
  }
}

export function expandStorage(state, b) {
  const def = BUILDINGS[b.kind];
  const up = def.storageUpgrade;
  if (!up) return { ok: false, reason: "No storage upgrade available" };
  if (b.storageLvl >= up.max) return { ok: false, reason: "Storage fully expanded" };
  for (const [good, cost] of Object.entries(up.cost)) {
    if ((state.stores[good] ?? 0) < cost) return { ok: false, reason: `Need ${cost} ${GOODS[good].name}` };
  }
  for (const [good, cost] of Object.entries(up.cost)) state.stores[good] -= cost;
  b.storageLvl += 1;
  state.bus.emit("expanded", { x: b.x, y: b.y, id: b.id, lvl: b.storageLvl });
  return { ok: true, reason: "" };
}
