import assert from "node:assert/strict";
import { createSim } from "../../game/sim/sim.js";
import { astar, isWalkable } from "../../game/sim/grid.js";
import { SEASONS } from "../../game/sim/time.js";

function run(sim, seconds) {
  const step = 1 / 30;
  const n = Math.round(seconds * 30);
  for (let i = 0; i < n; i++) sim.tick(step);
}

{
  const sim = createSim(777);
  const state = sim.state;
  assert.ok(state.founder, "founder exists");
  assert.ok(isWalkable(state, Math.floor(state.founder.x), Math.floor(state.founder.y)), "founder starts on walkable cell");
  run(sim, 45);
  assert.ok(state.time.t > 0, "time advances");
  assert.ok(state.stores.wood > 0, `founder chopped and deposited wood (${state.stores.wood})`);
  assert.ok(state.founder.skills.wood > 0, "founder skill grew");
  assert.ok(state.stats.treesFelled > 0, "trees felled");
}

{
  const sim = createSim(777);
  run(sim, 1);
  const w1 = sim.state.stores.wood;
  const simB = createSim(777);
  run(simB, 1);
  assert.equal(simB.state.stores.wood, w1, "sim deterministic across instances");
  assert.equal(simB.state.stats.treesFelled, sim.state.stats.treesFelled, "felled count deterministic");
}

{
  const sim = createSim(777);
  run(sim, 150 * 9);
  const t = sim.state.time;
  assert.ok(t.day >= 9, `days advanced (${t.day})`);
  const season = SEASONS[t.season];
  assert.ok(season, "season defined");
  assert.ok(t.tod >= 0 && t.tod < 1, "tod normalized");
}

{
  const sim = createSim(777);
  const state = sim.state;
  const f = state.founder;
  run(sim, 2);
  const target = { x: f.x + 4, y: f.y + 3 };
  f.manualTarget = target;
  run(sim, 4);
  const d = Math.hypot(f.x - target.x, f.y - target.y);
  assert.ok(d < 1.6, `founder walks to manual target (d=${d.toFixed(2)})`);
}

{
  const sim = createSim(777);
  const state = sim.state;
  let pathFound = 0;
  for (let i = 0; i < 200; i++) {
    const sx = 8 + (i % 40);
    const sy = 8 + ((i * 7) % 40);
    if (!isWalkable(state, sx, sy)) continue;
    const p = astar(state, sx, sy, state.camp.x, state.camp.y);
    if (p) pathFound++;
  }
  assert.ok(pathFound > 50, `A* connects map to camp (${pathFound})`);
}

{
  const sim = createSim(777);
  run(sim, 60);
  const f = sim.state.founder;
  assert.ok(f.carry <= f.carryMax, "carry capped");
  assert.ok(f.carry >= 0, "carry non-negative");
}

console.log("sim.test OK");
