import assert from "node:assert/strict";
import { WorldCamera } from "../../forge/camera.js";

function makeCam(opts = {}) {
  return new WorldCamera(null, {
    viewport: { width: 1280, height: 800 },
    pitchDeg: 26,
    taper: opts.taper ?? 1,
    ppu: 44,
    zoom: opts.zoom ?? 1,
    x: opts.x ?? 36,
    y: opts.y ?? 36,
  });
}

for (const taper of [0, 0.5, 1]) {
  for (const zoom of [0.6, 1, 1.9]) {
    const cam = makeCam({ taper, zoom });
    const b = cam.getVisibleBounds();
    const ex = (b.right - b.left) * 0.4;
    const ey = (b.bottom - b.top) * 0.4;
    const cxw = (b.left + b.right) / 2;
    const cyw = (b.top + b.bottom) / 2;
    for (let i = 0; i < 50; i++) {
      const wx = cxw + (Math.random() - 0.5) * 2 * ex;
      const wy = cyw + (Math.random() - 0.5) * 2 * ey;
      const p = cam.project(wx, wy);
      const w = cam.unproject(p.x, p.y);
      assert.ok(Math.abs(w.x - wx) < 1e-6, `taper=${taper} zoom=${zoom} x roundtrip ${w.x} vs ${wx}`);
      assert.ok(Math.abs(w.y - wy) < 1e-6, `taper=${taper} zoom=${zoom} y roundtrip ${w.y} vs ${wy}`);
    }
  }
}

{
  const cam = makeCam({ taper: 1, zoom: 1 });
  const near = cam.project(36, 50);
  const far = cam.project(36, 22);
  assert.ok(near.y > far.y, "near rows draw lower on screen than far rows");
  assert.ok(near.s > far.s, "near sprites draw larger than far sprites");
  const bottomScale = cam.project(36, cam.unproject(0, 800).y).s;
  assert.ok(Math.abs(bottomScale - 1) < 0.02, "near edge scale ~1");
}

{
  const cam = makeCam({ taper: 1, zoom: 1 });
  const d = cam._d();
  const v1 = 1;
  const screenBottom = cam.screenH * (d.f * v1 + (1 - d.f) * v1 * v1 * 0.5) * d.invI1;
  assert.ok(Math.abs(screenBottom - cam.screenH) < 1e-6, "depth integral maps v=1 to screen bottom");
  const v0 = 0;
  const screenTop = cam.screenH * (d.f * v0 + (1 - d.f) * v0 * v0 * 0.5) * d.invI1;
  assert.ok(Math.abs(screenTop) < 1e-6, "depth integral maps v=0 to screen top");
}

{
  const cam = makeCam({ taper: 1, zoom: 1 });
  cam.setPitch(12);
  assert.ok(cam.farScale > 0.9, "low pitch barely tapers");
  cam.setPitch(56);
  assert.ok(cam.farScale < 0.7, "high pitch tapers strongly");
}

{
  const cam = makeCam({ taper: 1, zoom: 1 });
  const b = cam.getVisibleBounds();
  assert.ok(b.right > b.left && b.bottom > b.top, "visible bounds sane");
  assert.ok(b.top < 36 && b.bottom > 36 && b.left < 36 && b.right > 36, "bounds contain camera center");
}

{
  const cam = makeCam({ taper: 1, zoom: 1 });
  cam.world = { minX: 0, minY: 0, maxX: 72, maxY: 72 };
  cam.panBy(-10000, -10000);
  assert.ok(cam.targetX >= 0 && cam.targetY >= 0, "pan clamps to world bounds");
}

console.log("camera.test OK");
