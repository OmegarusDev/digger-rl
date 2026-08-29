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
  run(sim, 1);
  const c = state.camp;
  const dx = c.x + 0.5 - f.x;
  const dy = c.y + 0.5 - f.y;
  const len = Math.hypot(dx, dy) || 1;
  f.cmd = { dx: dx / len, dy: dy / len };
  const d0 = Math.hypot(f.x - (c.x + 0.5), f.y - (c.y + 0.5));
  run(sim, 0.75);
  const d1 = Math.hypot(f.x - (c.x + 0.5), f.y - (c.y + 0.5));
  assert.ok(d1 <= Math.max(0.35, d0 - 0.5), `WASD moves founder toward intent (d0=${d0.toFixed(2)} d1=${d1.toFixed(2)})`);
  f.cmd = { dx: 0, dy: 0 };
}

{
  const sim = createSim(777);
  const state = sim.state;
  const f = state.founder;
  run(sim, 1);
  const tree = state.flora.find(
    (it) => it.kind === "tree" && it.state === "alive" && Math.hypot(it.x - f.x, it.y - f.y) < 16
  );
  assert.ok(tree, "test tree exists near spawn");
  f.workTargetId = tree.id;
  run(sim, 25);
  assert.ok(tree.state !== "alive", "clicked tree was felled");
  assert.ok(f.carry > 0 || state.stores.wood > 0, "wood gathered from clicked tree");
}

{
  const sim = createSim(777);
  const state = sim.state;
  const f = state.founder;
  run(sim, 1);
  const goal = state.flora.find(
    (it) => it.kind === "tree" && it.state === "alive" && Math.hypot(it.x - f.x, it.y - f.y) < 16
  );
  assert.ok(goal, "latch test tree exists");
  for (let i = 0; i < 200; i++) {
    const d = Math.hypot(goal.x - f.x, goal.y - f.y);
    if (d < 1.6) break;
    f.cmd = { dx: (goal.x - f.x) / d, dy: (goal.y - f.y) / d };
    run(sim, 0.25);
  }
  f.cmd = { dx: 0, dy: 0 };
  const tree = state.flora
    .filter((it) => it.kind === "tree" && it.state === "alive")
    .sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
  assert.ok(tree && Math.hypot(tree.x - f.x, tree.y - f.y) <= 1.9, "an alive tree is within acquire range");
  f.workLatch = true;
  run(sim, 15);
  assert.ok(tree.state !== "alive", "space latch felled nearest tree");
  assert.ok(f.carry > 0 || state.stores.wood > 0, "space latch gathered wood");
  f.workLatch = false;
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
