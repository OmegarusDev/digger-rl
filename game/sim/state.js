import { mulberry32 } from "../../forge/rng.js";
import { createValley } from "../world/valley.js";
import { createBus } from "./bus.js";

const TREE_HP = 5;
const ROCK_HP = 8;

export function createState(seed) {
  const valley = createValley(seed);
  const rng = mulberry32((seed ^ 0x51ab3f) | 0);
  const flora = valley.floraSeed.map((f, i) => ({
    id: i,
    kind: f.kind,
    x: f.x,
    y: f.y,
    species: f.species || null,
    variant: f.variant || 0,
    scale: f.scale || 1,
    hp: f.kind === "tree" ? TREE_HP : f.kind === "rock" ? ROCK_HP : 3,
    maxHp: f.kind === "tree" ? TREE_HP : f.kind === "rock" ? ROCK_HP : 3,
    state: "alive",
    fallT: 0,
    shakeT: 0,
    regrowT: 0,
  }));

  const state = {
    seed,
    size: valley.size,
    valley,
    rng,
    bus: createBus(),
    flora,
    floraMap: new Map(),
    walk: null,
    stores: { wood: 0, food: 0 },
    camp: valley.camp,
    time: { t: 0, day: 1, season: 0, tod: 0.3 },
    tick: 0,
    founder: null,
    villagers: [],
    stats: { treesFelled: 0 },
  };

  indexFlora(state);
  buildWalkable(state);
  return state;
}

export function cellKey(cx, cy) {
  return cy * 512 + cx;
}

export function indexFlora(state) {
  state.floraMap.clear();
  for (const f of state.flora) {
    if (f.state === "alive") addFloraCell(state, f);
  }
}

function addFloraCell(state, f) {
  if (f.kind !== "tree" && f.kind !== "rock") return;
  const k = cellKey(Math.floor(f.x), Math.floor(f.y));
  let arr = state.floraMap.get(k);
  if (!arr) state.floraMap.set(k, (arr = []));
  arr.push(f.id);
}

function removeFloraCell(state, f) {
  const k = cellKey(Math.floor(f.x), Math.floor(f.y));
  const arr = state.floraMap.get(k);
  if (!arr) return;
  const i = arr.indexOf(f.id);
  if (i >= 0) arr.splice(i, 1);
  if (arr.length === 0) state.floraMap.delete(k);
}

export function floraAtCell(state, cx, cy) {
  const arr = state.floraMap.get(cellKey(cx, cy));
  if (!arr) return [];
  return arr.map((id) => state.flora[id]);
}

export function buildWalkable(state) {
  const n = state.size;
  const walk = new Uint8Array(n * n);
  for (let cy = 0; cy < n; cy++) {
    for (let cx = 0; cx < n; cx++) {
      const t = state.valley.typeAt(cx + 0.5, cy + 0.5);
      if (t === "water") continue;
      const arr = state.floraMap.get(cellKey(cx, cy));
      if (arr && arr.length > 0) continue;
      walk[cy * n + cx] = 1;
    }
  }
  state.walk = walk;
  return walk;
}

export function fellTree(state, item) {
  item.state = "falling";
  item.fallT = 0.9;
  item.shakeT = 0;
  removeFloraCell(state, item);
  const n = state.size;
  state.walk[Math.floor(item.y) * n + Math.floor(item.x)] = 1;
  state.stats.treesFelled++;
  state.bus.emit("fell", { x: item.x, y: item.y, id: item.id });
}
