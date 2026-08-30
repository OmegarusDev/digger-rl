export class SmoothTerrain {
  constructor(opts = {}) {
    this.sample = opts.sample ?? (() => ({ r: 90, g: 100, b: 60 }));
    this.step = opts.step ?? 0.5;
    this._grid = null;
    this._gridKey = "";
  }

  setSample(fn) {
    this.sample = fn;
    this._grid = null;
    this._gridKey = "";
  }

  _ensureGrid(cols, rows) {
    if (!this._grid || this._grid.width !== cols || this._grid.height !== rows) {
      this._grid = document.createElement("canvas");
      this._grid.width = cols;
      this._grid.height = rows;
      this._gctx = this._grid.getContext("2d");
    }
  }

  render(ctx, cam) {
    const d = cam._d();
    const f = d.f;
    const tapered = f < 0.999;

    const sMid = f + (1 - f) * 0.5;
    let step = Math.min(this.step, Math.max(0.09, 13 / (cam.scale * sMid)));
    const halfSpanX = cam.screenW / (2 * cam.scale * Math.min(1, f)) + step * 2;
    let cols = Math.ceil((2 * halfSpanX) / step) + 2;
    let nRows = Math.ceil(d.K / step) + 3;
    const maxSamples = 9000;
    if (cols * nRows > maxSamples) {
      step = Math.max(0.06, Math.sqrt((2 * halfSpanX * d.K) / maxSamples));
      cols = Math.ceil((2 * halfSpanX) / step) + 2;
      nRows = Math.ceil(d.K / step) + 3;
    }
    const ax = Math.floor((cam.x - halfSpanX) / step) * step;
    const ay = Math.floor(d.y0 / step) * step;

    const gridKey = `${cols}x${nRows}@${ax},${ay}`;
    if (this._gridKey !== gridKey) {
      this._ensureGrid(cols, nRows);
      const img = this._gctx.createImageData(cols, nRows);
      const data = img.data;
      for (let j = 0; j < nRows; j++) {
        const wy = ay + j * step;
        for (let i = 0; i < cols; i++) {
          const wx = ax + i * step;
          const c = this.sample(wx, wy, i, j);
          const k = (j * cols + i) * 4;
          data[k] = c.r;
          data[k + 1] = c.g;
          data[k + 2] = c.b;
          data[k + 3] = 255;
        }
      }
      this._gctx.putImageData(img, 0, 0);
      this._gridKey = gridKey;
      this._ax = ax;
      this._ay = ay;
      this._cols = cols;
      this._rows = nRows;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (!tapered) {
      const p0 = cam.project(this._ax, this._ay);
      const p1 = cam.project(this._ax + this._cols * step, this._ay + this._rows * step);
      ctx.drawImage(this._grid, p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
    } else {
      for (let j = 0; j < this._rows; j++) {
        const wy0 = this._ay + (j - 0.5) * step;
        const wy1 = wy0 + step;
        const v0 = (wy0 - d.y0) / d.K;
        const v1 = (wy1 - d.y0) / d.K;
        const sMid = f + (1 - f) * ((v0 + v1) / 2);
        const yTop = cam.screenH * (f * v0 + (1 - f) * v0 * v0 * 0.5) * d.invI1;
        const yBot = cam.screenH * (f * v1 + (1 - f) * v1 * v1 * 0.5) * d.invI1;
        if (yBot < -8 || yTop > cam.screenH + 8) continue;
        const cxWorld = this._ax + (this._cols * step) / 2;
        const xMid = cam.screenW / 2 + (cxWorld - cam.x) * cam.scale * sMid;
        const w = this._cols * step * cam.scale * sMid;
        ctx.drawImage(this._grid, 0, j, this._cols, 1, xMid - w / 2, yTop, w, yBot - yTop + 1);
      }
    }
  }
}
