import { darkness } from "./time.js";
import { makeMover, steerTo } from "./mover.js";
import { PROFESSIONS, pickName } from "../data/villagers.js";
import { carryUnits } from "../data/goods.js";
import { claimBed } from "./homes.js";
import { workTick } from "./tasks.js";
import { nearestWalkable } from "./grid.js";
import { nearestDeposit, depositCarry } from "./haul.js";

export const VILLAGER_SPEED = 2.1;
const WORK_SWING_RATE = 1.4;

export function createVillager(state, kind, x, y) {
  const sex = kind === "adultF" ? "F" : "M";
  return {
    id: state.nextVillagerId++,
    kind,
    name: pickName(state.rng, sex),
    sex,
    home: null,
    workplace: null,
    skills: {},
    vigor: 100,
    meals: 1,
    hungerT: 0,
    hp: 100,
    state: "idle",
    carry: {},
    carryMax: 6,
    swing: 0,
    action: null,
    wanderT: 0,
    wander: null,
    lastDay: state.time.day,
    sleptRough: false,
    ...makeMover(x, y, VILLAGER_SPEED),
  };
}

export function hungerState(v) {
  if (v.meals > 0) return null;
  if (v.hungerT >= 2) return "starving";
  if (v.hungerT >= 1) return "hungry";
  return null;
}

export function villagerDebuff(v) {
  let m = 1;
  const h = hungerState(v);
  if (h === "hungry") m *= 0.85;
  else if (h === "starving") m *= 0.5;
  if (v.sleptRough) m *= 0.6;
  return m;
}

export function professionLabel(v) {
  const prof = v.workplace?.job;
  return prof ? PROFESSIONS[prof].label : "Unemployed";
}

export function feedVillager(state, v) {
  if (v.lastDay === state.time.day) return;
  v.lastDay = state.time.day;
  v.meals = Math.max(0, v.meals - 1);
  if (v.meals <= 0) {
    if ((state.stores.food ?? 0) >= 1) {
      state.stores.food -= 1;
      v.meals = 1;
      v.hungerT = 0;
    } else {
      v.hungerT += 1;
      if (v.hungerT >= 2) {
        v.hp -= 15;
        if (v.hp <= 0) killVillager(state, v, "starved");
      }
    }
  } else {
    v.hungerT = 0;
  }
}

export function updateVillager(state, v, dt) {
  v.moving = false;
  if (v.state === "sleeping") return sleepTick(state, v, dt);
  if (v.state === "toBed") return toBedTick(state, v, dt);
  if (v.state === "arriving") return arriveTick(state, v, dt);
  if (darkness(state.time.tod) >= 0.5) return duskSleep(state, v, dt);
  if (v.workplace && workTick(state, v, dt)) return;
  idleTick(state, v, dt);
}

function sleepTick(state, v, dt) {
  v.vigor = Math.min(100, v.vigor + (v.home ? 30 : 8) * dt);
  if (darkness(state.time.tod) < 0.15) {
    v.sleptRough = !v.home;
    v.state = "idle";
  }
}

function toBedTick(state, v, dt) {
  const h = state.buildings.find((b) => b.id === v.home);
  if (!h) {
    v.state = "sleeping";
    return;
  }
  const arrived = steerTo(state, v, h.x, h.y + 1.0, dt, 0.55);
  if (arrived || v.noProgress > 4) v.state = "sleeping";
}

function duskSleep(state, v, dt) {
  if (carryUnits(v.carry) > 0) {
    const pt = nearestDeposit(state, v.x, v.y);
    if (!pt) return;
    if (!steerTo(state, v, pt.x, pt.y + 0.55, dt, 0.8)) return;
    depositCarry(state, v);
    return;
  }
  if (!v.home) claimBed(state, v);
  if (v.home) {
    v.state = "toBed";
    toBedTick(state, v, dt);
  } else {
    v.state = "sleeping";
  }
}

function arriveTick(state, v, dt) {
  const c = state.camp;
  const arrived = steerTo(state, v, c.x - 0.4, c.y + 1.05, dt, 0.7);
  if (arrived || v.noProgress > 8) {
    v.state = "idle";
    v.noProgress = 0;
    state.bus.emit("joined", { name: v.name, x: v.x, y: v.y });
  }
}

function idleTick(state, v, dt) {
  v.vigor = Math.min(100, v.vigor + 3 * dt);
  if (!v.wander && v.wanderT <= 0) {
    const c = state.camp;
    const spot = nearestWalkable(state, c.x + 0.5 + (state.rng() - 0.5) * 5, c.y + 0.5 + (state.rng() - 0.5) * 5, 3);
    if (spot) v.wander = { x: spot.x + 0.5, y: spot.y + 0.5 };
    else v.wanderT = 2 + state.rng() * 3;
  }
  if (v.wander) {
    const arrived = steerTo(state, v, v.wander.x, v.wander.y, dt, 0.35);
    if (arrived || v.noProgress > 4) {
      v.wander = null;
      v.wanderT = 2 + state.rng() * 6;
    }
  } else {
    v.wanderT -= dt;
  }
}

export function villagerSwingRate(state, v, prof) {
  return WORK_SWING_RATE * (1 + (v.skills[prof] ?? 0) * 0.5) * (v.vigor / 100) * villagerDebuff(v);
}

export function gainSkill(v, prof, amount = 0.004) {
  v.skills[prof] = Math.min(1, (v.skills[prof] ?? 0) + amount);
}

export function killVillager(state, v, why) {
  const i = state.villagers.indexOf(v);
  if (i >= 0) state.villagers.splice(i, 1);
  v.home = null;
  if (v.workplace) {
    const b = state.buildings.find((bb) => bb.id === v.workplace.id);
    if (b?.workers) {
      const wi = b.workers.indexOf(v.id);
      if (wi >= 0) b.workers.splice(wi, 1);
    }
    v.workplace = null;
  }
  state.bus.emit("died", { name: v.name, why, x: v.x, y: v.y });
}
