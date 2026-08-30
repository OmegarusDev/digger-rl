import { createState } from "./state.js";
import { createFounder, updateFounder } from "./founder.js";
import { advanceTime } from "./time.js";

export const TICK_HZ = 30;

export function createSim(seed) {
  const state = createState(seed);
  state.founder = createFounder(state);

  function tick(dt) {
    advanceTime(state, dt);
    updateFlora(state, dt);
    updateFounder(state, dt);
    state.tick++;
  }

  return { state, tick, hz: TICK_HZ };
}

function updateFlora(state, dt) {
  for (const f of state.flora) {
    if (f.state === "falling") {
      f.fallT -= dt;
      if (f.fallT <= 0) {
        f.state = "stump";
        f.regrowT = 120 + state.rng() * 90;
        state.bus.emit("felled", { x: f.x, y: f.y, id: f.id });
      }
    } else if (f.state === "alive" && f.shakeT > 0) {
      f.shakeT = Math.max(0, f.shakeT - dt);
    } else if (f.state === "picked") {
      f.regrowT -= dt;
      if (f.regrowT <= 0) {
        f.state = "alive";
        f.hp = f.maxHp;
        state.bus.emit("regrew", { x: f.x, y: f.y, id: f.id });
      }
    }
  }
}
