import { findFloraNear } from "./founder.js";

export function inspectableAt(state, wx, wy) {
  const f = state.founder;
  if (f && Math.hypot(f.x - wx, f.y - wy) < 0.55) return { type: "founder" };
  for (const b of state.buildings) {
    if (Math.hypot(b.x - wx, b.y - wy) < 0.6) return { type: "building", id: b.id };
  }
  const c = state.camp;
  if (Math.hypot(c.x + 1.65 - wx, c.y + 0.1 - wy) < 0.6) return { type: "wagon" };
  if (Math.hypot(c.x - 0.4 - wx, c.y + 1.05 - wy) < 0.55) return { type: "fire" };
  const flora = findFloraNear(state, wx, wy, 0.85);
  if (flora) return { type: "flora", id: flora.id };
  return null;
}
