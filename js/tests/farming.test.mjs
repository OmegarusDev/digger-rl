import assert from "node:assert/strict";
import { createSim } from "../../game/sim/sim.js";
import { placeBuilding } from "../../game/sim/state.js";
import { isWalkable } from "../../game/sim/grid.js";
import { placeField, fieldTilesValid, fieldAction, FIELD_TILE_CAP } from "../../game/sim/fields.js";

function run(sim, seconds) {
  const step = 1 / 30;
  const n = Math.round(seconds * 30);
  for (let i = 0; i < n; i++) sim.tick(step);
}

function fieldTiles(state, cx, cy, w, h) {
  const tiles = [];
  for (let y = cy; y < cy + h; y++) {
    for (let x = cx; x < cx + w; x++) tiles.push({ x, y });
  }
  return tiles;
}

function openRectNear(state, cx, cy, w, h) {
  for (let r = 0; r < 20; r++) {
    for (let dy = -r; dy <= r; dy += 2) {
      for (let dx = -r; dx <= r; dx += 2) {
        const tiles = fieldTiles(state, cx + dx, cy + dy, w, h);
        if (tiles.some((t) => !isWalkable(state, t.x, t.y))) continue;
        return tiles;
      }
    }
  }
  return null;
}

function buildBuiltNear(sim, kindId, stores, px, py) {
  const state = sim.state;
  Object.assign(state.stores, stores);
  const ax = px ?? state.founder.x;
  const ay = py ?? state.founder.y;
  for (let r = 2; r < 14; r++) {
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const cx = Math.floor(ax + Math.cos(ang) * r);
      const cy = Math.floor(ay + Math.sin(ang) * r);
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
  state.stores.log = 60;
  const tiles = openRectNear(state, Math.floor(state.camp.x) + 4, Math.floor(state.camp.y), 3, 2);
  assert.ok(tiles, "open rect found");
  const res = placeField(state, tiles);
  assert.ok(res.ok, `field placed (${res.reason})`);
  assert.equal(state.stores.log, 54, "tile cost deducted");
  assert.equal(res.field.tiles.length, 6, "tiles registered");
  const dup = placeField(state, tiles);
  assert.ok(!dup.ok, "no double-staking");
  const tooBig = [];
  for (let i = 0; i < FIELD_TILE_CAP + 5; i++) tooBig.push({ x: 3 + (i % 30), y: 3 + Math.floor(i / 30) });
  assert.ok(!fieldTilesValid(state, tooBig).ok, "cap enforced");
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  state.stores.log = 80;
  const field = placeField(state, openRectNear(state, Math.floor(state.camp.x) + 4, Math.floor(state.camp.y), 2, 2)).field;
  field.seed = "wheat";
  field.stage = 0;
  run(sim, 200);
  assert.equal(field.stage, 3, `wheat ripens (${field.stage})`);
  assert.ok(fieldAction(field) === "harvest", "ripe field wants harvest");
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  state.stores.log = 80;
  const dry = placeField(state, openRectNear(state, Math.floor(state.camp.x) + 4, Math.floor(state.camp.y), 2, 2)).field;
  const wet = placeField(state, openRectNear(state, Math.floor(state.camp.x) + 8, Math.floor(state.camp.y), 2, 2)).field;
  for (const f of [dry, wet]) {
    f.seed = "wheat";
    f.stage = 0;
  }
  wet.watered = 1;
  run(sim, 110);
  assert.ok(wet.stage > dry.stage, `watered field grows faster (wet ${wet.stage} vs dry ${dry.stage})`);
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  state.stores.log = 80;
  const field = placeField(state, openRectNear(state, Math.floor(state.camp.x) + 4, Math.floor(state.camp.y), 2, 2)).field;
  field.seed = "wheat";
  field.stage = 1;
  state.time.t = 13 * 360 + 2;
  run(sim, 2);
  assert.equal(state.time.season, 3, "season reached winter");
  assert.equal(field.stage, -1, "winter kills wheat");
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  state.stores.log = 200;
  state.stores.lumber = 40;
  const tiles = openRectNear(state, Math.floor(state.camp.x) + 5, Math.floor(state.camp.y), 2, 2);
  const field = placeField(state, tiles).field;
  field.seed = "wheat";
  const barn = buildBuiltNear(sim, "barn", {}, field.cx, field.cy);
  state.villagers.forEach((v) => (v.x = barn.x + 1));
  run(sim, 6);
  const farmer = state.villagers.find((v) => v.workplace?.id === barn.id);
  assert.ok(farmer, "farmer assigned");
  run(sim, 80);
  assert.ok(field.stage >= 0, `farmer sowed the field (stage ${field.stage})`);
  run(sim, 280);
  assert.ok((barn.storage.grain ?? 0) > 0 || (farmer.carry.grain ?? 0) > 0, `harvest delivered grain (barn ${JSON.stringify(barn.storage)} carry ${farmer.carry.grain})`);
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  state.stores.log = 300;
  state.stores.lumber = 60;
  state.stores.stoneBlock = 20;
  const barn = buildBuiltNear(sim, "barn", {});
  const mill = buildBuiltNear(sim, "mill", {}, barn.x, barn.y);
  barn.storage.grain = 10;
  run(sim, 6);
  const miller = state.villagers.find((v) => v.workplace?.id === mill.id);
  assert.ok(miller, "miller assigned");
  run(sim, 240);
  assert.ok((mill.storage.flour ?? 0) > 0 || (miller.carry.flour ?? 0) > 0, `mill produces flour (mill ${JSON.stringify(mill.storage)} carry ${JSON.stringify(miller.carry)})`);
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  state.stores.log = 300;
  state.stores.lumber = 80;
  state.stores.stoneBlock = 30;
  const mill = buildBuiltNear(sim, "mill", {});
  const bakery = buildBuiltNear(sim, "bakery", {}, mill.x, mill.y);
  mill.storage.flour = 6;
  run(sim, 6);
  const baker = state.villagers.find((v) => v.workplace?.id === bakery.id);
  assert.ok(baker, "baker assigned");
  run(sim, 300);
  const breadTotal = (bakery.storage.bread ?? 0) + (baker.carry.bread ?? 0) + state.stores.food;
  assert.ok(breadTotal > 0, `bakery bakes bread (bakery ${JSON.stringify(bakery.storage)} food ${state.stores.food})`);
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  state.stores.log = 80;
  const field = placeField(state, openRectNear(state, Math.floor(state.camp.x) + 4, Math.floor(state.camp.y), 2, 2)).field;
  const f = state.founder;
  f.x = field.cx;
  f.y = field.cy + 0.6;
  field.seed = "wheat";
  f.workTarget = { type: "field", id: field.id };
  f.workLatch = true;
  run(sim, 6);
  assert.equal(field.stage, 0, "founder sowed the field by hand");
  f.workLatch = false;
  f.workTarget = null;
}

console.log("farming.test OK");
