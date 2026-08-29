import assert from "node:assert/strict";
import { createNoise, fbm, ridged } from "../../forge/noise.js";

{
  const a = createNoise(42);
  const b = createNoise(42);
  for (let i = 0; i < 200; i++) {
    const x = i * 0.137;
    const y = i * 0.071;
    assert.equal(a(x, y), b(x, y), "noise deterministic per seed");
  }
}

{
  const n = createNoise(7);
  for (let i = 0; i < 500; i++) {
    const v = n(i * 0.31, i * 0.17);
    assert.ok(v >= -1.01 && v <= 1.01, `noise in range: ${v}`);
  }
}

{
  const n = createNoise(99);
  const f = fbm(n, 0.5, 0.5, 4);
  assert.ok(f >= -1.01 && f <= 1.01, "fbm in range");
  const r = ridged(n, 0.5, 0.5, 4);
  assert.ok(r >= 0 && r <= 1.01, "ridged non-negative");
}

console.log("noise.test OK");
