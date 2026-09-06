import { createState } from "./state.js";
import { createFounder, updateFounder } from "./founder.js";
import { advanceTime } from "./time.js";
import { updateVillager, feedAllVillagers } from "./villager.js";
import { vacancyTick } from "./jobs.js";
import { updateArrivals, spawnStartingVillagers } from "./camp.js";
import { updateFauna } from "./fauna.js";
import { updateFields } from "./fields.js";

export const TICK_HZ = 60;

export function createSim(seed) {
  const state = createState(seed);
  state.founder = createFounder(state);
  spawnStartingVillagers(state);

  let vacancyT = 0;

  function tick(dt) {
    advanceTime(state, dt);
    updateFlora(state, dt);
    updateFauna(state, dt);
    updateFields(state, dt);
    updateArrivals(state);
    feedAllVillagers(state);
    for (let i = state.villagers.length - 1; i >= 0; i--) updateVillager(state, state.villagers[i], dt);
    vacancyT -= dt;
    if (vacancyT <= 0) {
      vacancyT = 1;
      vacancyTick(state);
    }
    updateFounder(state, dt);
    state.tick++;
  }

  function loadState(saved) {
    for (const k of Object.keys(saved)) {
      if (k !== "bus" && k !== "rng") state[k] = saved[k];
    }
  }

  return { state, tick, loadState, hz: TICK_HZ };
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
