import { BUILDINGS } from "../data/buildings.js";
import { KINDS, PROFESSIONS } from "../data/villagers.js";

export function slotCap(state, b) {
  const def = BUILDINGS[b.kind];
  if (!def?.slots) return 0;
  return def.slots[Math.min(state.bonfire.workersLevel, def.slots.length - 1)];
}

export function pickApplicant(state, prof) {
  let best = null;
  let bestScore = -1;
  for (const v of state.villagers) {
    if (!KINDS[v.kind].worker || v.workplace) continue;
    const score = (v.skills[prof] ?? 0) + state.rng() * 0.05;
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}

export function assign(state, b, v) {
  const def = BUILDINGS[b.kind];
  v.workplace = { id: b.id, kind: b.kind, job: def.job };
  b.workers.push(v.id);
  state.bus.emit("assigned", { vId: v.id, bId: b.id, job: def.job });
}

export function unassign(state, b, vId) {
  const i = b.workers.indexOf(vId);
  if (i >= 0) b.workers.splice(i, 1);
  const v = state.villagers.find((vv) => vv.id === vId);
  if (v) v.workplace = null;
  state.bus.emit("unassigned", { vId, bId: b.id });
}

export function vacancyTick(state) {
  for (const b of state.buildings) {
    if (b.state !== "built" || !b.workers) continue;
    const cap = slotCap(state, b);
    while (b.workers.length < cap) {
      const def = BUILDINGS[b.kind];
      const v = pickApplicant(state, def.job);
      if (!v) break;
      assign(state, b, v);
    }
  }
}
