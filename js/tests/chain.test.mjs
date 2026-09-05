import assert from "node:assert/strict";
import { createSim } from "../../game/sim/sim.js";
import { placeBuilding, buildingAtCell } from "../../game/sim/state.js";
import { isWalkable, pathTo } from "../../game/sim/grid.js";
import { placeField } from "../../game/sim/fields.js";
import { callVillager, bonfireUpgrade } from "../../game/sim/camp.js";
import { slotCap } from "../../game/sim/jobs.js";
import { buildBed } from "../../game/sim/homes.js";

function run(sim, seconds) {
  const step = 1 / 30;
  const n = Math.round(seconds * 30);
  for (let i = 0; i < n; i++) sim.tick(step);
}

function buildNear(sim, kindId, px, py, stores) {
  const state = sim.state;
  Object.assign(state.stores, stores);
  for (let r = 2; r < 14; r++) {
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const cx = Math.floor(px + Math.cos(ang) * r);
      const cy = Math.floor(py + Math.sin(ang) * r);
      if (!isWalkable(state, cx, cy)) continue;
      const res = placeBuilding(state, kindId, cx + 0.5, cy + 0.5);
      if (res.ok) {
        res.building.state = "built";
        return res.building;
      }
    }
  }
  throw new Error(`no spot for ${kindId}`);
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  assert.equal(state.villagers.length, 2, "two souls at the start");

  const seq = [0.1, 0.3, 0.5, 0.7, 0.2, 0.4, 0.6, 0.8];
  let i = 0;
  const origRng = state.rng;
  state.rng = () => seq[i++ % seq.length];
  assert.ok(callVillager(state).ok, "the call is answered");
  state.rng = origRng;
  const day = state.time.day;
  state.time.t = (day + 1) * 360 + 200;
  run(sim, 90);
  assert.equal(state.villagers.length, 3, "the called villager arrived");
  const newcomer = state.villagers.find((v) => v.state === "idle" && !v.workplace);
  assert.ok(newcomer, "newcomer joined the pool");

  state.stores.log = 400;
  state.stores.lumber = 120;
  state.stores.stoneBlock = 40;

  const tiles = [];
  outer: for (let r = 3; r < 12; r++) {
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const cx = Math.floor(state.camp.x + Math.cos(ang) * r);
      const cy = Math.floor(state.camp.y + Math.sin(ang) * r);
      const cand = [];
      let ok = true;
      for (let ty = cy; ty < cy + 2 && ok; ty++) {
        for (let tx = cx; tx < cx + 2 && ok; tx++) {
          if (!isWalkable(state, tx, ty)) ok = false;
          cand.push({ x: tx, y: ty });
        }
      }
      if (!ok) continue;
      tiles.push(...cand);
      break outer;
    }
  }
  assert.ok(tiles.length === 4, "field spot found");
  const field = placeField(state, tiles).field;
  field.seed = "wheat";

  const barn = buildNear(sim, "barn", field.cx, field.cy, {});
  const mill = buildNear(sim, "mill", barn.x, barn.y, {});
  const bakery = buildNear(sim, "bakery", mill.x, mill.y, {});
  state.villagers.forEach((v) => (v.x = state.camp.x + 1));

  run(sim, 420);
  assert.ok((barn.storage.grain ?? 0) > 0 || (mill.storage.grain ?? 0) > 0 || (mill.storage.flour ?? 0) > 0 || (bakery.storage.flour ?? 0) > 0 || (bakery.storage.bread ?? 0) > 0 || state.stores.food > 0, "the grain chain moves");
  run(sim, 480);
  assert.ok(state.stores.food > 0, `bread reached the commons (food ${state.stores.food})`);

  const dawnT = (Math.floor(state.time.t / 360) + 1) * 360 + 120;
  state.time.t = dawnT;
  run(sim, 6);
  const fed = state.villagers.filter((v) => v.meals > 0).length;
  assert.ok(fed >= 1, "someone ate from the commons at dawn");

  const r2 = bonfireUpgrade(state);
  assert.ok(r2.ok, `bonfire upgraded (${r2.reason})`);
  assert.equal(slotCap(state, { kind: "hut" }), 2, "second sawyer slot opens");

  const house = buildNear(sim, "house", state.camp.x, state.camp.y, {});
  assert.ok(buildBed(state, house).ok, "bed built");
  state.time.t = (Math.floor(state.time.t / 360) + 1) * 360 + 330;
  run(sim, 10);
  assert.ok(state.villagers.some((v) => v.home === house.id), "a villager claimed the bed at dusk");
}
console.log("chain.test OK");
