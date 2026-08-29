import { mulberry32 } from "./rng.js";

const TILE_WRAP = (g, S, fn) => {
  for (let ox = -1; ox <= 1; ox++)
    for (let oy = -1; oy <= 1; oy++) {
      g.save();
      g.translate(ox * S, oy * S);
      fn();
      g.restore();
    }
};

function buildPattern(ctx, seed, size, painters) {
  const rng = mulberry32(seed);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  painters(g, rng, size, TILE_WRAP);
  return ctx.createPattern(c, "repeat");
}

function grainPainters(light, dark) {
  return (g, rng, S, wrap) => {
    for (let i = 0; i < 1400; i++) {
      const x = rng() * S;
      const y = rng() * S;
      const isLight = rng() > 0.5;
      const style = isLight
        ? `rgba(${light},${(0.04 + rng() * 0.06).toFixed(3)})`
        : `rgba(${dark},${(0.05 + rng() * 0.07).toFixed(3)})`;
      const w = 1 + (rng() > 0.9 ? 1 : 0);
      wrap(g, S, () => {
        g.fillStyle = style;
        g.fillRect(x, y, w, 1);
      });
    }
    g.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const x = rng() * S;
      const y = rng() * S;
      const l = 6 + rng() * 16;
      const a = 0.55 + (rng() - 0.5) * 0.2;
      wrap(g, S, () => {
        g.strokeStyle = `rgba(${dark},0.05)`;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      });
    }
  };
}

function blotPainters(light, dark, count, rMin, rMax, aMin, aMax, size) {
  return (g, rng, S, wrap) => {
    for (let i = 0; i < count; i++) {
      const x = rng() * S;
      const y = rng() * S;
      const r = rMin + rng() * (rMax - rMin);
      const isLight = rng() > 0.5;
      const a = aMin + rng() * (aMax - aMin);
      const c0 = isLight ? `rgba(${light},${a})` : `rgba(${dark},${a})`;
      wrap(g, S, () => {
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, c0);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grad;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      });
    }
  };
}

export class SmoothTerrain {
  constructor(opts = {}) {
    this.sample = opts.sample ?? (() => ({ r: 90, g: 100, b: 60 }));
    this.step = opts.step ?? 48;
    this.light = opts.light ?? "255,244,214";
    this.dark = opts.dark ?? "26,32,14";
    this._patterns = null;
    this._grid = null;
    this._gridKey = "";
  }

  setSample(fn) {
    this.sample = fn;
    this._grid = null;
    this._gridKey = "";
  }

  setTints(light, dark) {
    this.light = light;
    this.dark = dark;
    this._patterns = null;
  }

  _ensurePatterns(ctx) {
    if (this._patterns) return;
    this._patterns = {
      grain: buildPattern(ctx, 0x51eed12, 192, grainPainters(this.light, this.dark)),
      mottle: buildPattern(ctx, 0xb10b880, 512, blotPainters(this.light, this.dark, 34, 40, 150, 0.03, 0.075, 512)),
      macro: buildPattern(ctx, 0x4d41435, 1536, blotPainters(this.light, this.dark, 22, 220, 640, 0.02, 0.05, 1536)),
    };
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
    this._ensurePatterns(ctx);
    const d = cam._d();
    const step = this.step;
    const f = d.f;
    const tapered = f < 0.999;
    const zoom = cam.zoom;

    const halfSpanX = cam.screenW / (2 * zoom) + step * 1.5;
    const ax = Math.floor((cam.x - halfSpanX) / step) * step;
    const cols = Math.ceil((2 * halfSpanX) / step) + 2;
    const nRows = Math.ceil(d.K / step) + 3;
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
          const c = this.sample(wx, wy);
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
        const xMid = cam.screenW / 2 + (cxWorld - cam.x) * zoom * sMid;
        const w = this._cols * step * zoom * sMid;
        ctx.drawImage(this._grid, 0, j, this._cols, 1, xMid - w / 2, yTop, w, yBot - yTop + 1);
      }
    }

    ctx.fillStyle = this._patterns.macro;
    ctx.fillRect(0, 0, cam.screenW, cam.screenH);
    ctx.fillStyle = this._patterns.mottle;
    ctx.fillRect(0, 0, cam.screenW, cam.screenH);
    ctx.fillStyle = this._patterns.grain;
    ctx.fillRect(0, 0, cam.screenW, cam.screenH);
  }
}
