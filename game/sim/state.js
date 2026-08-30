import { mulberry32 } from "../../forge/rng.js";
import { createValley } from "../world/valley.js";
import { createBus } from "./bus.js";
import { BUILDINGS } from "../data/buildings.js";
import { DAY_LEN } from "./time.js";

const TREE_HP = 5;
const ROCK_HP = 8;
const BERRY_HP = 2;

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
    hp: f.kind === "tree" ? TREE_HP : f.kind === "rock" ? ROCK_HP : BERRY_HP,
    maxHp: f.kind === "tree" ? TREE_HP : f.kind === "rock" ? ROCK_HP : BERRY_HP,
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
    buildings: [],
    buildingMap: new Map(),
    nextBuildingId: 1,
    stores: { wood: 0, food: 0, stone: 0 },
    camp: valley.camp,
    time: { t: 0.3 * DAY_LEN, day: 1, season: 0, tod: 0.3 },
    tick: 0,
    founder: null,
    villagers: [],
    stats: { treesFelled: 0, built: 0 },
  };

  indexFlora(state);
  buildWalkable(state);
  return state;
}

const BLOCKING = new Set(["tree", "rock"]);

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
      if (arr && arr.some((id) => BLOCKING.has(state.flora[id].kind))) continue;
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
  unblockCell(state, item.x, item.y);
  state.stats.treesFelled++;
  state.bus.emit("fell", { x: item.x, y: item.y, id: item.id });
}

function unblockCell(state, wx, wy) {
  const n = state.size;
  const k = Math.floor(wy) * n + Math.floor(wx);
  if (!state.buildingMap.has(cellKey(Math.floor(wx), Math.floor(wy)))) state.walk[k] = 1;
}

export function blockCell(state, wx, wy) {
  const n = state.size;
  state.walk[Math.floor(wy) * n + Math.floor(wx)] = 0;
}

export function canPlace(state, kindId, wx, wy) {
  const def = BUILDINGS[kindId];
  if (!def) return { ok: false, reason: "Unknown building" };
  const n = state.size;
  const cx = Math.floor(wx);
  const cy = Math.floor(wy);
  if (cx < 1 || cy < 1 || cx >= n - 1 || cy >= n - 1) return { ok: false, reason: "Outside the valley" };
  if (state.walk[cy * n + cx] !== 1) return { ok: false, reason: "Blocked ground" };
  if (state.buildingMap.has(cellKey(cx, cy))) return { ok: false, reason: "Occupied" };
  const items = floraAtCell(state, cx, cy);
  if (items.some((f) => f.state === "alive")) return { ok: false, reason: "Clear the flora first" };
  for (const [good, cost] of Object.entries(def.cost)) {
    if ((state.stores[good] ?? 0) < cost) return { ok: false, reason: `Need ${cost} ${good}` };
  }
  return { ok: true, reason: "" };
}

export function placeBuilding(state, kindId, wx, wy) {
  const check = canPlace(state, kindId, wx, wy);
  if (!check.ok) return check;
  const def = BUILDINGS[kindId];
  for (const [good, cost] of Object.entries(def.cost)) state.stores[good] -= cost;
  const b = {
    id: state.nextBuildingId++,
    kind: kindId,
    name: def.name,
    x: Math.floor(wx) + 0.5,
    y: Math.floor(wy) + 0.5,
    state: "site",
    work: 0,
    maxWork: def.work,
  };
  state.buildings.push(b);
  state.buildingMap.set(cellKey(Math.floor(b.x), Math.floor(b.y)), b.id);
  blockCell(state, b.x, b.y);
  state.bus.emit("placed", { x: b.x, y: b.y, kind: kindId });
  return { ok: true, reason: "", building: b };
}

export function buildingById(state, id) {
  return state.buildings.find((b) => b.id === id) ?? null;
}

export function buildingAtCell(state, cx, cy) {
  const id = state.buildingMap.get(cellKey(cx, cy));
  return id ? buildingById(state, id) : null;
}

export function completeBuilding(state, b) {
  b.state = "built";
  state.stats.built++;
  state.bus.emit("built", { x: b.x, y: b.y, kind: b.kind });
}

export function depositPoints(state) {
  const pts = [{ x: state.camp.x + 0.5, y: state.camp.y + 0.5 }];
  for (const b of state.buildings) {
    if (b.state === "built" && BUILDINGS[b.kind].deposit) pts.push({ x: b.x, y: b.y });
  }
  return pts;
}
