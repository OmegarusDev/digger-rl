import assert from "node:assert/strict";
import { chaikin, pathLength, pointAlong, steerAlong } from "../../forge/paths.js";
import { FxSystem } from "../../forge/fx.js";
import { mulberry32 } from "../../forge/rng.js";

{
  const pts = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];
  const out = chaikin(pts, 2);
  assert.ok(out.length > pts.length, "chaikin subdivides");
  assert.equal(out[0].x, 0, "chaikin keeps endpoints");
  assert.equal(out[out.length - 1].y, 10, "chaikin keeps endpoints");
}

{
  const pts = [
    { x: 0, y: 0 },
    { x: 3, y: 4 },
  ];
  assert.equal(pathLength(pts), 5, "path length 3-4-5");
  const mid = pointAlong(pts, 2.5);
  assert.ok(Math.abs(mid.x - 1.5) < 1e-9 && Math.abs(mid.y - 2) < 1e-9, "point along segment");
  const end = pointAlong(pts, 100);
  assert.equal(end.x, 3, "point along clamps to end");
}

{
  const agent = { x: 0, y: 0, wp: 0, dir: 0 };
  const pts = [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ];
  let done = steerAlong(agent, pts, 2, 0.25);
  assert.ok(!done, "not done mid path");
  assert.ok(agent.x > 0.4 && agent.x <= 0.6, `moved along x (${agent.x})`);
  assert.equal(agent.wp, 0, "waypoint consumed only on arrival");
  for (let i = 0; i < 50 && !done; i++) done = steerAlong(agent, pts, 2, 0.25);
  assert.ok(done, "completes path");
  assert.equal(agent.x, 2, "snaps to final point");
}

{
  const agent = { x: 0, y: 0, wp: 0, dir: 0 };
  const pts = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ];
  const done = steerAlong(agent, pts, 2, 0.5);
  assert.ok(!done, "budget exhausted before path end");
  assert.equal(agent.wp, 2, "start waypoint and first leg consumed");
  assert.equal(agent.x, 1, "stopped at consumed waypoint");
  const done2 = steerAlong(agent, pts, 2, 0.5);
  assert.ok(done2, "next frame completes path");
}

{
  const fx = new FxSystem();
  fx.emit("chips", 0, 0, { count: 50 });
  fx.emit("smoke", 0, 0, { count: 500 });
  assert.ok(fx.items.length <= 420, "particle cap enforced");
  for (let i = 0; i < 120; i++) fx.tick(1 / 30);
  assert.ok(fx.items.length < 420, "particles decay");
  fx.float(0, 0, "test");
  assert.equal(fx.floats.length, 1, "float registered");
  for (let i = 0; i < 60; i++) fx.tick(1 / 30);
  assert.equal(fx.floats.length, 0, "floats decay");
}

{
  const rng = mulberry32(5);
  const seq = [rng(), rng(), rng()];
  const rng2 = mulberry32(5);
  for (const v of seq) assert.equal(rng2(), v, "mulberry32 deterministic");
  assert.ok(seq.every((v) => v >= 0 && v < 1), "rng range");
}

console.log("engine.test OK");
