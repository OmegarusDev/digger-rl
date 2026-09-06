import { clamp } from "./rng.js";

export class SmoothTerrain {
  constructor(opts = {}) {
    this.sample = opts.sample ?? (() => ({ r: 90, g: 100, b: 60 }));
    this.worldSize = opts.worldSize ?? 72;
    this.pad = opts.pad ?? 8;
    this.masterStep = opts.masterStep ?? 0.1;
    const span = this.worldSize + this.pad * 2;
    this.n = Math.ceil(span / this.masterStep);
    this._master = document.createElement("canvas");
    this._master.width = this._master.height = this.n;
    this._gctx = this._master.getContext("2d");
    this._origin = -this.pad;
    this._baked = 0;
    this.done = false;
  }

  bakeChunk(rows = 48) {
    if (this.done) return true;
    const start = this._baked;
    const end = Math.min(this.n, start + rows);
    const img = this._gctx.createImageData(this.n, end - start);
    const data = img.data;
    const st = this.masterStep;
    for (let j = 0; j < end - start; j++) {
      const wy = (start + j) * st + this._origin;
      for (let i = 0; i < this.n; i++) {
        const wx = i * st + this._origin;
        const c = this.sample(wx, wy);
        const k = (j * this.n + i) * 4;
        data[k] = c.r;
        data[k + 1] = c.g;
        data[k + 2] = c.b;
        data[k + 3] = 255;
      }
    }
    this._gctx.putImageData(img, 0, start);
    this._baked = end;
    this.done = this._baked >= this.n;
    return this.done;
  }

  render(ctx, cam) {
    const d = cam._d();
    const f = d.f;
    const tapered = f < 0.999;
    const st = this.masterStep;
    const span = this.n * st;

    ctx.fillStyle = "#22301e";
    ctx.fillRect(0, 0, cam.screenW, cam.screenH);
    if (!this.done) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";

    const worldToSrc = (w) => clamp((w - this._origin) / st, 0, this.n - 0.001);

    if (!tapered) {
      const p0 = cam.project(this._origin, this._origin);
      const p1 = cam.project(this._origin + span, this._origin + span);
      ctx.drawImage(this._master, p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
      return;
    }

    const halfSpanX = cam.screenW / (2 * cam.scale * Math.min(1, f)) + st * 2;
    const viewX0 = cam.x - halfSpanX;
    const viewX1 = cam.x + halfSpanX;
    const j0 = Math.max(0, Math.floor((d.y0 - this._origin) / st) - 1);
    const j1 = Math.min(this.n - 1, Math.ceil((d.y0 + d.K - this._origin) / st) + 1);
    const cxWorld = this._origin + span / 2;

    const BATCH = 8;
    let sj = j0;
    while (sj <= j1) {
      const wy0a = this._origin + (sj - 0.5) * st;
      const v0a = (wy0a - d.y0) / d.K;
      const sMida = f + (1 - f) * v0a;
      const yTopa = cam.screenH * (f * v0a + (1 - f) * v0a * v0a * 0.5) * d.invI1;
      const xMida = cam.screenW / 2 + (cxWorld - cam.x) * cam.scale * sMida;
      const wa = span * cam.scale * sMida;
      const sx0 = clamp(worldToSrc(viewX0), 0, this.n);
      const sx1 = clamp(worldToSrc(viewX1), 0, this.n);
      const sw = Math.max(1, sx1 - sx0);

      let ej = Math.min(sj + BATCH, j1);
      const wy1b = this._origin + (ej + 0.5) * st;
      const v1b = (wy1b - d.y0) / d.K;
      const yBotb = cam.screenH * (f * v1b + (1 - f) * v1b * v1b * 0.5) * d.invI1;

      if (yBotb < -8 || yTopa > cam.screenH + 8) {
        sj = ej + 1;
        continue;
      }

      ctx.drawImage(
        this._master,
        sx0,
        sj,
        sw,
        ej - sj + 1,
        xMida - wa / 2 + (sx0 / this.n) * wa,
        yTopa,
        (sw / this.n) * wa,
        yBotb - yTopa + 1
      );
      sj = ej + 1;
    }
  }
}
