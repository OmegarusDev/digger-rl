import assert from "node:assert/strict";
import { createValley } from "../../game/world/valley.js";

{
  const a = createValley(1234);
  const b = createValley(1234);
  assert.equal(a.riverPts.length, b.riverPts.length, "river deterministic");
  for (let i = 0; i < a.riverPts.length; i++) {
    assert.equal(a.riverPts[i].x, b.riverPts[i].x, "river x deterministic");
    assert.equal(a.riverPts[i].y, b.riverPts[i].y, "river y deterministic");
  }
  assert.equal(a.floraSeed.length, b.floraSeed.length, "flora count deterministic");
  assert.equal(a.camp.x, b.camp.x, "camp deterministic");
  assert.equal(a.camp.y, b.camp.y, "camp deterministic");
}

{
  const v = createValley(777);
  let water = 0;
  let forest = 0;
  let meadow = 0;
  let trees = 0;
  for (let i = 0; i < 4000; i++) {
    const x = (i * 7919) % v.size;
    const y = (i * 104729) % v.size;
    const t = v.typeAt(x + 0.5, y + 0.5);
    if (t === "water") water++;
    if (t === "forest") forest++;
    if (t === "meadow") meadow++;
  }
  trees = v.floraSeed.filter((f) => f.kind === "tree").length;
  assert.ok(water > 40, `has river water (${water})`);
  assert.ok(forest > 200, `has forest (${forest})`);
  assert.ok(meadow > 200, `has meadow (${meadow})`);
  assert.ok(trees > 150, `has trees (${trees})`);
}

{
  const v = createValley(777);
  const campT = v.typeAt(v.camp.x + 0.5, v.camp.y + 0.5);
  assert.ok(campT !== "water" && campT !== "shore", "camp on dry land");
  const d = v.riverDist(v.camp.x + 0.5, v.camp.y + 0.5);
  assert.ok(d >= 3 && d <= 9, `camp within reach of river (${d.toFixed(1)})`);
  for (const f of v.floraSeed) {
    const dc = Math.hypot(f.x - (v.camp.x + 0.5), f.y - (v.camp.y + 0.5));
    assert.ok(dc >= 3.3, "no flora inside camp clearing");
  }
}

{
  const v = createValley(55);
  const s1 = v.sample(10.3, 20.7);
  const s2 = v.sample(10.3, 20.7);
  assert.deepEqual(s1, s2, "sample pure function");
  assert.ok(s1.fertility >= 0 && s1.fertility <= 1, "fertility normalized");
}

{
  for (const seed of [1, 42, 90210]) {
    const v = createValley(seed);
    assert.ok(v.camp.x > 0 && v.camp.x < v.size, "camp in bounds x");
    assert.ok(v.camp.y > 0 && v.camp.y < v.size, "camp in bounds y");
  }
}

console.log("valley.test OK");
