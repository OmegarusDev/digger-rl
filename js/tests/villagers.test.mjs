import assert from "node:assert/strict";
import { createSim } from "../../game/sim/sim.js";
import { canPlace, placeBuilding } from "../../game/sim/state.js";
import { createVillager, hungerState } from "../../game/sim/villager.js";
import { unassign, slotCap } from "../../game/sim/jobs.js";
import { buildBed } from "../../game/sim/homes.js";
import { callVillager } from "../../game/sim/camp.js";

function run(sim, seconds) {
  const step = 1 / 30;
  const n = Math.round(seconds * 30);
  for (let i = 0; i < n; i++) sim.tick(step);
}

function findSpotNear(sim, kindId) {
  const state = sim.state;
  const f = state.founder;
  for (let r = 1; r < 12; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const cx = Math.floor(f.x) + dx;
        const cy = Math.floor(f.y) + dy;
        const check = canPlace(state, kindId, cx + 0.5, cy + 0.5);
        if (check.ok) return { x: cx + 0.5, y: cy + 0.5 };
      }
    }
  }
  return null;
}

function buildAt(sim, kindId, stores) {
  const state = sim.state;
  Object.assign(state.stores, stores);
  const spot = findSpotNear(sim, kindId);
  assert.ok(spot, `${kindId} spot found`);
  const res = placeBuilding(state, kindId, spot.x, spot.y);
  assert.ok(res.ok, `${kindId} placed (${res.reason})`);
  res.building.state = "built";
  return res.building;
}

{
  const sim = createSim(777);
  const state = sim.state;
  assert.ok(state.villagers.length === 2, "starting villagers exist");
  assert.ok(state.villagers.every((v) => !v.isFounder), "founder is not a villager");
  assert.ok(state.villagers.some((v) => v.kind === "adultM") && state.villagers.some((v) => v.kind === "adultF"), "man and woman at start");
  run(sim, 2);
  assert.ok(state.villagers.every((v) => v.x !== undefined), "villagers idle near camp");
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  state.stores.log = 60;
  state.stores.lumber = 10;
  const hut = buildAt(sim, "hut", {});
  assert.equal(slotCap(state, hut), 1, "one sawyer slot at bonfire level 0");
  run(sim, 3);
  const workers = state.villagers.filter((v) => v.workplace?.id === hut.id);
  assert.equal(workers.length, 1, "sawyer auto-assigned to the built hut");
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  const skilled = state.villagers[0];
  const other = state.villagers[1];
  skilled.skills.sawyer = 0.5;
  state.stores.log = 60;
  state.stores.lumber = 10;
  const hut = buildAt(sim, "hut", {});
  run(sim, 3);
  assert.equal(other.workplace, null, "unskilled villager stayed idle when a skilled one exists");
  assert.ok(skilled.workplace?.id === hut.id, "skilled villager took the sawyer slot");
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  state.stores.log = 200;
  state.stores.lumber = 20;
  const hut = buildAt(sim, "hut", {});
  run(sim, 3);
  const sawyer = state.villagers.find((v) => v.workplace?.id === hut.id);
  assert.ok(sawyer, "sawyer assigned");
  const before = state.stores.log + carryOf(sawyer);
  run(sim, 150);
  const after = state.stores.log + carryOf(sawyer);
  assert.ok(after > before, `sawyer produced net logs (${before} -> ${after})`);
  assert.ok(sawyer.skills.sawyer > 0, "sawyer skill grew with work");
  unassign(state, hut, sawyer.id);
  assert.equal(sawyer.workplace, null, "unassign releases the villager");
  run(sim, 2);
  assert.ok(sawyer.workplace?.id === hut.id, "vacancy refills from the pool");
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  const v = state.villagers[0];
  state.time.t = 360 - 2;
  run(sim, 4);
  assert.equal(v.state, "sleeping", "villager sleeps through the night");
  state.time.t = 360 + 90;
  run(sim, 3);
  assert.equal(v.state, "idle", "villager wakes at dawn");
  assert.ok(v.sleptRough, "sleeping without a bed marks slept rough");
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  state.stores.log = 60;
  state.stores.lumber = 10;
  const house = buildAt(sim, "house", {});
  assert.ok(buildBed(state, house).ok, "bed 1 built");
  assert.ok(buildBed(state, house).ok, "bed 2 built");
  assert.equal(house.beds, 2, "beds registered");
  state.time.t = 360 - 2;
  run(sim, 6);
  const inBed = state.villagers.filter((v) => v.home === house.id);
  assert.equal(inBed.length, 2, "both villagers claimed a bed");
  assert.ok(inBed.every((v) => v.state === "sleeping" || v.state === "toBed"), "sleeping after walking home");
  state.time.t = 360 + 90;
  run(sim, 3);
  assert.ok(inBed.every((v) => v.sleptRough === false), "a real bed clears the rough-sleep mark");
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  const v = state.villagers[0];
  v.meals = 0;
  v.hungerT = 0;
  state.stores.food = 0;
  state.time.t = 360 - 2;
  run(sim, 4);
  assert.equal(hungerState(v), "hungry", "missed one meal -> hungry");
  state.time.t = 2 * 360 - 2;
  run(sim, 4);
  assert.equal(hungerState(v), "starving", "missed two meals -> starving");
  const hpBefore = v.hp;
  assert.ok(hpBefore < 100, "starving drains health at dawn");
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  const v = state.villagers[0];
  v.meals = 0;
  v.hungerT = 2;
  v.hp = 10;
  state.stores.food = 0;
  state.time.t = 360 - 2;
  run(sim, 4);
  assert.equal(state.villagers.includes(v), false, "starving villager dies");
  assert.ok(state.villagers.length >= 1, "the other villager survives");
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  const seq = [0.1, 0.3, 0.5, 0.7, 0.2, 0.4, 0.6, 0.8];
  let i = 0;
  const origRng = state.rng;
  state.rng = () => seq[i++ % seq.length];
  const r = callVillager(state);
  assert.ok(r.ok, `call accepted (${r.reason})`);
  assert.ok(state.bonfire.pending, "arrival scheduled");
  const day = state.time.day;
  assert.equal(state.bonfire.pending.arriveDay, day + 1, "arrives tomorrow");
  const blocked = callVillager(state);
  assert.ok(!blocked.ok, "one call per day");
  state.rng = origRng;
  const before = state.villagers.length;
  state.time.t = (day + 1) * 360 + 200;
  run(sim, 90);
  assert.equal(state.villagers.length, before + 1, "called villager arrived and joined");
}

function carryOf(v) {
  let t = 0;
  for (const k of Object.keys(v.carry)) t += v.carry[k] ?? 0;
  return t;
}

console.log("villagers.test OK");
