import { createVillager } from "./villager.js";
import { isWalkable, nearestWalkable } from "./grid.js";
import { GOODS } from "../data/goods.js";

export const CALL_CHANCE = 0.75;

export const BONFIRE_UPGRADES = [
  null,
  { cost: { log: 10 }, label: "Hearths and benches" },
  { cost: { log: 10, stoneBlock: 4 }, label: "The meeting stone" },
];

export function bonfireUpgrade(state) {
  const bf = state.bonfire;
  if (bf.workersLevel >= BONFIRE_UPGRADES.length - 1) return { ok: false, reason: "The bonfire burns as bright as it can" };
  const up = BONFIRE_UPGRADES[bf.workersLevel + 1];
  for (const [good, cost] of Object.entries(up.cost)) {
    if ((state.stores[good] ?? 0) < cost) return { ok: false, reason: `Need ${cost} ${GOODS[good].name}` };
  }
  for (const [good, cost] of Object.entries(up.cost)) state.stores[good] -= cost;
  bf.workersLevel += 1;
  state.bus.emit("bonfire", { x: state.camp.x, y: state.camp.y, level: bf.workersLevel });
  return { ok: true, reason: "" };
}

export function callVillager(state) {
  const bf = state.bonfire;
  if (bf.pending) return { ok: false, reason: "Someone is already on their way" };
  if (bf.callDay === state.time.day) return { ok: false, reason: "Call again tomorrow" };
  bf.callDay = state.time.day;
  const edge = randomEdgeSpawn(state);
  if (!edge) return { ok: false, reason: "No path into the valley" };
  if (state.rng() >= CALL_CHANCE) return { ok: false, reason: "No one answered the call" };
  bf.pending = {
    arriveDay: state.time.day + 1,
    arriveTod: 0.05 + state.rng() * 0.45,
    kind: state.rng() < 0.15 ? "adultF" : "adultM",
    x: edge.x,
    y: edge.y,
  };
  return { ok: true, reason: "Someone answered — watch for them tomorrow" };
}

function randomEdgeSpawn(state) {
  for (let tries = 0; tries < 60; tries++) {
    const side = Math.floor(state.rng() * 4);
    const t = state.rng();
    const along = 1 + Math.floor(t * (state.size - 2));
    const x = side === 0 ? 1 : side === 1 ? state.size - 2 : along;
    const y = side === 2 ? 1 : side === 3 ? state.size - 2 : along;
    if (isWalkable(state, x, y)) return { x: x + 0.5, y: y + 0.5 };
  }
  return null;
}

export function updateArrivals(state) {
  const bf = state.bonfire;
  if (!bf.pending) return;
  const p = bf.pending;
  if (state.time.day >= p.arriveDay && state.time.tod >= p.arriveTod) {
    bf.pending = null;
    const v = createVillager(state, p.kind, p.x, p.y);
    v.state = "arriving";
    state.villagers.push(v);
  }
}

export function spawnStartingVillagers(state) {
  const c = state.camp;
  for (const kind of ["adultM", "adultF"]) {
    const spot = nearestWalkable(state, c.x + 0.5 + (state.rng() - 0.5) * 3, c.y + 0.5 + (state.rng() - 0.5) * 3, 4) ?? { x: Math.floor(c.x), y: Math.floor(c.y) };
    state.villagers.push(createVillager(state, kind, spot.x + 0.5, spot.y + 0.5));
  }
}
