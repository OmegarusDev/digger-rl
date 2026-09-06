import { CROPS, STAGE_LABELS } from "../data/crops.js";
import { GOODS } from "../data/goods.js";
import { cellKey, floraAtCell } from "./state.js";

export const FIELD_TILE_CAP = 20;
export const FIELD_TILE_COST = 1;
export const HARVEST_SWINGS = 4;
export const SOW_SWINGS = 4;
export const WATER_SWINGS = 2;

export function fieldCost(tiles) {
  return { log: tiles.length * FIELD_TILE_COST };
}

export function fieldTilesValid(state, tiles) {
  if (!tiles.length || tiles.length > FIELD_TILE_CAP) return { ok: false, reason: `Fields hold up to ${FIELD_TILE_CAP} tiles` };
  const n = state.size;
  const claimed = new Set();
  for (const f of state.fields) for (const t of f.tiles) claimed.add(cellKey(t.x, t.y));
  for (const t of tiles) {
    const cx = t.x;
    const cy = t.y;
    if (cx < 1 || cy < 1 || cx >= n - 1 || cy >= n - 1) return { ok: false, reason: "Outside the valley" };
    if (state.walk[cy * n + cx] !== 1) return { ok: false, reason: "Blocked ground" };
    if (state.buildingMap.has(cellKey(cx, cy))) return { ok: false, reason: "Occupied" };
    if (claimed.has(cellKey(cx, cy))) return { ok: false, reason: "Already a field" };
    if (floraAtCell(state, cx, cy).some((f) => f.state === "alive")) return { ok: false, reason: "Clear the flora first" };
  }
  return { ok: true, reason: "" };
}

export function placeField(state, tiles) {
  const check = fieldTilesValid(state, tiles);
  if (!check.ok) return check;
  const cost = fieldCost(tiles);
  for (const [good, c] of Object.entries(cost)) {
    if ((state.stores[good] ?? 0) < c) return { ok: false, reason: `Need ${c} ${GOODS[good].name}` };
  }
  for (const [good, c] of Object.entries(cost)) state.stores[good] -= c;
  let sx = 0;
  let sy = 0;
  for (const t of tiles) {
    sx += t.x;
    sy += t.y;
  }
  const field = {
    id: state.nextFieldId++,
    tiles: tiles.map((t) => ({ x: t.x, y: t.y })),
    cx: sx / tiles.length + 0.5,
    cy: sy / tiles.length + 0.5,
    seed: null,
    stage: -1,
    stageT: 0,
    watered: 0,
    queuedSeed: null,
    claimedBy: null,
    progress: 0,
    lastDay: state.time.day,
  };
  state.fields.push(field);
  state.bus.emit("field", { x: field.cx, y: field.cy, tiles: tiles.length });
  return { ok: true, reason: "", field };
}

export function fieldById(state, id) {
  return state.fields.find((f) => f.id === id) ?? null;
}

export function fieldAt(state, wx, wy) {
  const cx = Math.floor(wx);
  const cy = Math.floor(wy);
  for (const f of state.fields) {
    for (const t of f.tiles) {
      if (t.x === cx && t.y === cy) return f;
    }
  }
  return null;
}

export function fieldAction(field) {
  if (field.stage === 3) return "harvest";
  if (field.seed && field.stage === -1) return "sow";
  if (field.seed && field.stage >= 0 && field.stage <= 2 && field.watered <= 0) return "water";
  return null;
}

export function fieldSwingHit(state, field) {
  const act = fieldAction(field);
  if (!act) return null;
  field.progress += 1;
  const need = act === "harvest" ? HARVEST_SWINGS : act === "sow" ? SOW_SWINGS : WATER_SWINGS;
  if (field.progress < need) return null;
  field.progress = 0;
  if (act === "sow") {
    field.stage = 0;
    field.stageT = 0;
    state.bus.emit("sown", { x: field.cx, y: field.cy, id: field.id, seed: field.seed });
  } else if (act === "water") {
    field.watered = 1;
    state.bus.emit("watered", { x: field.cx, y: field.cy, id: field.id });
  } else if (act === "harvest") {
    field.stage = -1;
    field.stageT = 0;
    if (field.queuedSeed) {
      field.seed = field.queuedSeed;
      field.queuedSeed = null;
    }
    state.bus.emit("harvested", { x: field.cx, y: field.cy, id: field.id, seed: field.seed });
  }
  return act;
}

export function harvestYield(field) {
  const crop = CROPS[field.seed];
  if (!crop) return { good: "grain", n: 0 };
  return { good: crop.yield.good, n: crop.yield.n * field.tiles.length };
}

export function updateFields(state, dt) {
  const season = state.time.season;
  for (const field of state.fields) {
    if (field.lastDay !== state.time.day) {
      field.lastDay = state.time.day;
      field.watered = Math.max(0, field.watered - 1);
    }
    if (!field.seed || field.stage < 0 || field.stage > 2) continue;
    const crop = CROPS[field.seed];
    if (!crop) continue;
    if (season === 3 && crop.diesInWinter) {
      field.stage = -1;
      field.stageT = 0;
      field.progress = 0;
      state.bus.emit("cropDied", { x: field.cx, y: field.cy, id: field.id, seed: field.seed });
      continue;
    }
    if (!crop.growSeasons.includes(season)) continue;
    field.stageT += dt * (field.watered > 0 ? 2 : 1);
    while (field.stage <= 2 && field.stageT >= crop.stages[field.stage]) {
      field.stageT -= crop.stages[field.stage];
      field.stage += 1;
      if (field.stage === 3) state.bus.emit("ripe", { x: field.cx, y: field.cy, id: field.id });
    }
  }
}

export function fieldsInRadius(state, x, y, radius) {
  const out = [];
  for (const f of state.fields) {
    if (Math.hypot(f.cx - x, f.cy - y) <= radius) out.push(f);
  }
  return out;
}

export function nearestFieldTask(state, v, b) {
  let best = null;
  for (const f of fieldsInRadius(state, b.x, b.y, b.radius ?? 10)) {
    if (f.claimedBy != null && f.claimedBy !== v.id) continue;
    const act = fieldAction(f);
    if (!act) continue;
    const d = Math.hypot(f.cx - v.x, f.cy - v.y);
    if (!best || d < best.d) best = { field: f, act, d };
  }
  return best;
}

export function claimField(state, v, task, field) {
  task.claims.push(`f${field.id}`);
  field.claimedBy = v.id;
}

export function fieldStatusLabel(field) {
  if (!field.seed) return "fallow";
  if (field.stage === -1) return field.queuedSeed ? `awaiting ${CROPS[field.queuedSeed].name.toLowerCase()}` : "awaiting sowing";
  return STAGE_LABELS[field.stage];
}
