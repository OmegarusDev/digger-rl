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
  const cam = makeCam({ taper: 1, zoom: 0.45 });
  assert.ok(Math.abs(cam.V.pitchDeg - 12) < 0.01, `min zoom -> min pitch (${cam.V.pitchDeg})`);
  const cam2 = makeCam({ taper: 1, zoom: 2.6 });
  assert.ok(Math.abs(cam2.V.pitchDeg - 54) < 0.01, `max zoom -> max pitch (${cam2.V.pitchDeg})`);
  const mid = makeCam({ taper: 1, zoom: 1.5 });
  const a = mid.V.pitchDeg;
  mid.setZoom(0.45);
  mid.tick(1);
  assert.ok(mid.V.pitchDeg < a, "pitch decreases as zoom decreases");
  const camHi = makeCam({ taper: 1, zoom: 2.2 });
  const camLo = makeCam({ taper: 1, zoom: 1.0 });
  assert.ok(camHi.V.vExag > camLo.V.vExag, "vertical exaggeration grows with pitch");
  assert.ok(camHi.farScale < camLo.farScale, "ground taper strengthens with pitch");
}

{
  const cam = makeCam({ taper: 1, zoom: 1 });
  cam.world = { minX: 0, minY: 0, maxX: 72, maxY: 72 };
  cam.panBy(-10000, -10000);
  assert.ok(cam.targetX >= 0 && cam.targetY >= 0, "pan clamps to world bounds");
}

{
  const cam = makeCam({ taper: 1, zoom: 1 });
  cam.world = { minX: 0, minY: 0, maxX: 72, maxY: 72 };
  cam.setZoom(1.6);
  cam.zoomAt(400, 300, 2.2);
  for (let i = 0; i < 180; i++) cam.tick(1 / 60);
  assert.ok(cam.x >= 0 && cam.x <= 72 && cam.y >= 0 && cam.y <= 72, `zoom anchor stays in world (${cam.x.toFixed(1)}, ${cam.y.toFixed(1)})`);
  assert.ok(Number.isFinite(cam.x) && Number.isFinite(cam.y), "zoom anchor finite");
  const p = cam.project(cam._anchor ? cam._anchor.wx : cam.unproject(400, 300).x, cam.unproject(400, 300).y);
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), "projection stays finite after zoom");
}

{
  const cam = makeCam({ taper: 1, zoom: 1 });
  cam.world = { minX: 0, minY: 0, maxX: 72, maxY: 72 };
  for (let i = 0; i < 40; i++) {
    cam.zoomAt(720 + (i % 7) * 30, 450 - (i % 5) * 20, 1 + Math.exp(-i * 0.1));
    cam.tick(1 / 60);
  }
  assert.ok(cam.x >= 0 && cam.x <= 72 && cam.y >= 0 && cam.y <= 72, "rapid wheel spam stays clamped");
}

console.log("camera.test OK");
