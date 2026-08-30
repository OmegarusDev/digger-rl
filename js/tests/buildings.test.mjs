import assert from "node:assert/strict";
import { createSim } from "../../game/sim/sim.js";
import { canPlace, placeBuilding, depositPoints, buildingAtCell } from "../../game/sim/state.js";
import { BUILDINGS } from "../../game/data/buildings.js";

function run(sim, seconds) {
  const step = 1 / 30;
  const n = Math.round(seconds * 30);
  for (let i = 0; i < n; i++) sim.tick(step);
}

function findSpotNearFounder(sim) {
  const state = sim.state;
  const f = state.founder;
  for (let r = 1; r < 10; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const cx = Math.floor(f.x) + dx;
        const cy = Math.floor(f.y) + dy;
        const check = canPlace(state, "hut", cx + 0.5, cy + 0.5);
        if (check.ok) return { x: cx + 0.5, y: cy + 0.5 };
      }
    }
  }
  return null;
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  state.stores.wood = 40;
  const spot = findSpotNearFounder(sim);
  assert.ok(spot, "buildable spot exists near founder");
  const res = placeBuilding(state, "hut", spot.x, spot.y);
  assert.ok(res.ok, `hut placed (${res.reason})`);
  assert.equal(state.stores.wood, 28, "cost deducted");
  const cx = Math.floor(spot.x);
  const cy = Math.floor(spot.y);
  assert.equal(state.walk[cy * state.size + cx], 0, "site blocks its cell");
  assert.ok(buildingAtCell(state, cx, cy), "building map indexed");

  const dup = placeBuilding(state, "hut", spot.x, spot.y);
  assert.ok(!dup.ok, "cannot build on occupied cell");
  const broke = placeBuilding(state, "store", spot.x + 1, spot.y);
  if (broke.ok) assert.equal(state.stores.wood, 20, "second cost deducted");
}

{
  const sim = createSim(777);
  const state = sim.state;
  const f = state.founder;
  run(sim, 1);
  state.stores.wood = 60;
  const spot = findSpotNearFounder(sim);
  const res = placeBuilding(state, "hut", spot.x, spot.y);
  assert.ok(res.ok, "site placed");
  const b = res.building;

  for (let i = 0; i < 300 && b.state === "site"; i++) {
    const d = Math.hypot(b.x - f.x, b.y - f.y);
    if (d > 1.4) {
      f.cmd = { dx: (b.x - f.x) / d, dy: (b.y - f.y) / d };
    } else {
      f.cmd = { dx: 0, dy: 0 };
      f.workLatch = true;
      f.workTarget = { type: "building", id: b.id, x: b.x, y: b.y };
    }
    run(sim, 0.2);
  }
  f.cmd = { dx: 0, dy: 0 };
  f.workLatch = false;
  f.workTarget = null;
  assert.equal(b.state, "built", "founder constructed the hut");

  f.carry = { wood: 0, food: 0, stone: 0 };
  f.x = b.x - 1.1;
  f.y = b.y;
  f.workLatch = true;
  f.workTarget = { type: "building", id: b.id, x: b.x, y: b.y };
  const woodBefore = state.stores.wood + (f.carry.wood ?? 0);
  run(sim, 6);
  f.workLatch = false;
  f.workTarget = null;
  const woodAfter = state.stores.wood + (f.carry.wood ?? 0);
  assert.ok(woodAfter > woodBefore, `hut sawing yields wood (${woodBefore} -> ${woodAfter})`);
}

{
  const sim = createSim(777);
  const state = sim.state;
  const f = state.founder;
  run(sim, 1);
  state.stores.wood = 60;
  const spot = findSpotNearFounder(sim);
  const res = placeBuilding(state, "store", spot.x, spot.y);
  assert.ok(res.ok, "storehouse placed");
  const b = res.building;
  b.state = "built";
  const pts = depositPoints(state);
  assert.equal(pts.length, 2, "storehouse adds a deposit point");
  f.carry.wood = 4;
  f.x = b.x;
  f.y = b.y + 1.2;
  run(sim, 0.2);
  assert.equal(f.carry.wood, 0, "deposited at storehouse");
  assert.ok(state.stores.wood >= 4, "wood landed in stores");
}

{
  const sim = createSim(777);
  const state = sim.state;
  assert.ok(BUILDINGS.hut && BUILDINGS.store, "building defs exist");
  for (const def of Object.values(BUILDINGS)) {
    assert.ok(Array.isArray(def.visual) && def.visual.length > 0, `${def.name} has a visual`);
    for (const [prim] of def.visual) {
      assert.ok(
        ["shadow", "cyl", "box", "frustum", "diamond", "blob", "cone", "dots", "post", "roof"].includes(prim),
        `known prim ${prim}`
      );
    }
  }
  const check = canPlace(state, "hut", state.valley.camp.x + 0.5, state.valley.camp.y + 0.5);
  assert.ok(!check.ok, "cannot place on camp stash cell (not walkable or occupied)");
}

console.log("buildings.test OK");
