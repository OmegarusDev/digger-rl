import assert from "node:assert/strict";
import { createSim } from "../../game/sim/sim.js";
import { astar, isWalkable, pathTo } from "../../game/sim/grid.js";
import { SEASONS } from "../../game/sim/time.js";
import { carryTotal } from "../../game/sim/founder.js";

function run(sim, seconds) {
  const step = 1 / 30;
  const n = Math.round(seconds * 30);
  for (let i = 0; i < n; i++) sim.tick(step);
}

function walkTo(sim, f, x, y, within) {
  const path = pathTo(sim.state, f.x, f.y, x, y);
  if (!path) return false;
  const pts = [...path, { x, y }];
  for (const wp of pts) {
    for (let i = 0; i < 240; i++) {
      const d = Math.hypot(wp.x - f.x, wp.y - f.y);
      if (d <= 0.22) break;
      f.cmd = { dx: (wp.x - f.x) / d, dy: (wp.y - f.y) / d };
      run(sim, 0.05);
    }
  }
  f.cmd = { dx: 0, dy: 0 };
  return Math.hypot(x - f.x, y - f.y) <= within;
}

{
  const sim = createSim(777);
  const state = sim.state;
  assert.ok(state.founder, "founder exists");
  assert.ok(isWalkable(state, Math.floor(state.founder.x), Math.floor(state.founder.y)), "founder starts on walkable cell");
  run(sim, 3);
  assert.ok(state.time.t > 0, "time advances");
  assert.equal(state.stats.treesFelled, 0, "founder never works without player input");
  assert.equal(state.stores.wood, 0, "no autonomous production");
}

{
  const sim = createSim(777);
  run(sim, 1);
  const w1 = sim.state.stores.wood;
  const simB = createSim(777);
  run(simB, 1);
  assert.equal(simB.state.stores.wood, w1, "sim deterministic across instances");
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
    (it) => it.kind === "tree" && it.state === "alive" && pathTo(state, f.x, f.y, it.x, it.y)
  );
  assert.ok(tree, "reachable tree exists");
  assert.ok(walkTo(sim, f, tree.x, tree.y, 1.3), "founder walked to the tree");
  f.workTarget = { type: "flora", id: tree.id };
  run(sim, 12);
  assert.ok(tree.state !== "alive", "clicked tree was felled");
  assert.ok(carryTotal(f) > 0, "wood carried from clicked tree");

  assert.ok(walkTo(sim, f, state.camp.x + 0.5, state.camp.y + 0.5, 1.4), "walked back to camp");
  run(sim, 0.2);
  assert.ok(state.stores.wood > 0, `deposited wood at camp (${state.stores.wood})`);
}

{
  const sim = createSim(777);
  const state = sim.state;
  const f = state.founder;
  run(sim, 1);
  const goal = state.flora.find(
    (it) => it.kind === "tree" && it.state === "alive" && pathTo(state, f.x, f.y, it.x, it.y)
  );
  assert.ok(goal, "latch test tree exists");
  assert.ok(walkTo(sim, f, goal.x, goal.y, 1.3), "walked to the tree");
  const tree = state.flora
    .filter((it) => it.kind === "tree" && it.state === "alive")
    .sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
  assert.ok(tree && Math.hypot(tree.x - f.x, tree.y - f.y) <= 1.5, "an alive tree is within reach");
  f.workLatch = true;
  run(sim, 12);
  assert.ok(tree.state !== "alive", "space latch felled the tree in reach");
  assert.ok(carryTotal(f) > 0, "space latch gathered wood");
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
  const state = sim.state;
  const f = state.founder;
  run(sim, 1);
  const berry = state.flora.find(
    (it) => it.kind === "berry" && it.state === "alive" && pathTo(state, f.x, f.y, it.x, it.y)
  );
  const rock = state.flora.find(
    (it) => it.kind === "rock" && it.state === "alive" && pathTo(state, f.x, f.y, it.x, it.y)
  );
  assert.ok(berry || rock, "berries or rocks exist");
  if (berry) {
    assert.ok(walkTo(sim, f, berry.x, berry.y, 1.3), "walked to berries");
    f.workTarget = { type: "flora", id: berry.id };
    run(sim, 12);
    assert.ok(berry.state === "picked", "berries picked");
    assert.ok(f.carry.food > 0, "food gathered");
    f.workTarget = null;
    f.workLatch = false;
  }
  if (rock) {
    assert.ok(walkTo(sim, f, rock.x, rock.y, 1.3), "walked to rock");
    f.workTarget = { type: "flora", id: rock.id };
    run(sim, 15);
    assert.ok(rock.state === "gone", "rock quarried out");
    assert.ok(f.carry.stone > 0, "stone gathered");
  }
}

{
  const sim = createSim(777);
  run(sim, 60);
  const f = sim.state.founder;
  const tot = carryTotal(f);
  assert.ok(tot <= f.carryMax, "carry capped");
  assert.ok(tot >= 0, "carry non-negative");
}

console.log("sim.test OK");
