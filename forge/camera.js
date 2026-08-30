import { clamp, lerp } from "./rng.js";
import { makeView25 } from "./view25.js";

export class WorldCamera {
  constructor(canvas, opts = {}) {
    this.canvas = canvas ?? null;
    this.ctx = canvas ? canvas.getContext("2d") : null;
    this.V = makeView25({ pitchDeg: opts.pitchDeg ?? 24, trap: opts.trap ?? 0.42 });
    this.pitchDeg = this.V.pitchDeg;
    this.trap = this.V.trap;
    this.taper = clamp(opts.taper ?? 1, 0, 1);
    this.ppu = opts.ppu ?? 44;
    this.pitchZoom = opts.pitchZoom !== false;
    this.pitchMin = opts.pitchMin ?? 12;
    this.pitchMax = opts.pitchMax ?? 54;
    this.pitchCurve = opts.pitchCurve ?? 1.2;
    this.zoomMin = opts.zoomMin ?? 0.45;
    this.zoomMax = opts.zoomMax ?? 2.6;
    this.world = opts.world ?? null;
    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.targetX = this.x;
    this.targetY = this.y;
    this.zoom = opts.zoom ?? 1;
    this.targetZoom = this.zoom;
    this.shakeX = 0;
    this.shakeY = 0;
    this._shakeIntensity = 0;
    this._shakeDuration = 0;
    this._anchor = null;
    this._deriv = null;
    if (this.pitchZoom) {
      const t0 = clamp((this.zoom - this.zoomMin) / (this.zoomMax - this.zoomMin), 0, 1);
      this.V.setPitch(lerp(this.pitchMin, this.pitchMax, Math.pow(t0, this.pitchCurve)));
      this.pitchDeg = this.V.pitchDeg;
    }
    if (opts.viewport) {
      this.screenW = opts.viewport.width;
      this.screenH = opts.viewport.height;
      this.dpr = 1;
    } else {
      this._resize();
      if (typeof window !== "undefined") {
        window.addEventListener("resize", () => this._resize());
      }
    }
  }

  _resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.screenW = window.innerWidth;
    this.screenH = window.innerHeight;
    if (this.canvas) {
      this.canvas.width = Math.floor(this.screenW * this.dpr);
      this.canvas.height = Math.floor(this.screenH * this.dpr);
      this.canvas.style.width = this.screenW + "px";
      this.canvas.style.height = this.screenH + "px";
    }
    this._deriv = null;
  }

  setPitch(deg) {
    this.V.setPitch(deg);
    this.pitchDeg = this.V.pitchDeg;
    this._deriv = null;
  }

  get farScale() {
    return 1 + (this.V.farScale - 1) * this.taper;
  }

  get scale() {
    return this.zoom * this.ppu;
  }

  _frame() {
    const f = this.farScale;
    const I1 = f + (1 - f) / 2;
    const K = this.screenH / (this.scale * I1);
    const Ihalf = f * 0.5 + (1 - f) * 0.125;
    const y0 = this.y - (Ihalf / I1) * K;
    this._deriv = { f, I1, invI1: 1 / I1, K, y0 };
  }

  _d() {
    if (!this._deriv) this._frame();
    return this._deriv;
  }

  project(wx, wy) {
    const d = this._d();
    const v = (wy - d.y0) / d.K;
    const s = d.f + (1 - d.f) * v;
    const sy = this.screenH * (d.f * v + (1 - d.f) * v * v * 0.5) * d.invI1;
    return {
      x: this.screenW / 2 + (wx - this.x) * this.scale * s + this.shakeX,
      y: sy + this.shakeY,
      s,
      v,
    };
  }

  unproject(sx, sy) {
    const d = this._d();
    const t = clamp(sy / this.screenH, -0.5, 1.5);
    const target = t * d.I1;
    const a = (1 - d.f) / 2;
    const b = d.f;
    let v;
    if (a < 1e-9) v = target / b;
    else v = (-b + Math.sqrt(b * b + 4 * a * target)) / (2 * a);
    const s = d.f + (1 - d.f) * v;
    return {
      x: this.x + (sx - this.screenW / 2) / (this.scale * s),
      y: d.y0 + v * d.K,
    };
  }

  screenToWorld(sx, sy) {
    return this.unproject(sx, sy);
  }

  worldToScreen(wx, wy) {
    return this.project(wx, wy);
  }

  getVisibleBounds() {
    const tl = this.unproject(0, 0);
    const tr = this.unproject(this.screenW, 0);
    const br = this.unproject(this.screenW, this.screenH);
    const bl = this.unproject(0, this.screenH);
    return {
      left: Math.min(tl.x, bl.x),
      right: Math.max(tr.x, br.x),
      top: Math.min(tl.y, tr.y),
      bottom: Math.max(bl.y, br.y),
    };
  }

  isVisible(wx, wy, margin = 1) {
    const b = this.getVisibleBounds();
    return wx > b.left - margin && wx < b.right + margin && wy > b.top - margin && wy < b.bottom + margin;
  }

  follow(x, y) {
    this.targetX = x;
    this.targetY = y;
    this._clampTargets();
  }

  followAhead(x, y, vx, vy, panFactor = 0.3) {
    this.targetX = x + vx * panFactor;
    this.targetY = y + vy * panFactor;
  }

  setZoom(z) {
    this.targetZoom = clamp(z, this.zoomMin, this.zoomMax);
  }

  zoomAt(sx, sy, z) {
    const w = this.unproject(sx, sy);
    this.setZoom(z);
    this._anchor = { sx, sy, wx: w.x, wy: w.y };
  }

  nudgeZoom(factor) {
    this.setZoom(this.targetZoom * factor);
  }

  panBy(dxScreen, dyScreen) {
    const d = this._d();
    const Ihalf = d.f * 0.5 + (1 - d.f) * 0.125;
    const sC = d.f + (1 - d.f) * (Ihalf / d.I1);
    this.targetX -= dxScreen / (this.scale * sC);
    this.targetY -= (dyScreen * d.K) / (this.screenH * sC);
    this._clampTargets();
  }

  panTo(x, y) {
    this.targetX = x;
    this.targetY = y;
    this._clampTargets();
  }

  shake(intensity, duration = 0.18) {
    this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
    this._shakeDuration = Math.max(this._shakeDuration, duration);
  }

  _clampTargets() {
    if (!this.world) return;
    const m = 4;
    this.targetX = clamp(this.targetX, this.world.minX + m, this.world.maxX - m);
    this.targetY = clamp(this.targetY, this.world.minY + m, this.world.maxY - m);
    this.x = clamp(this.x, this.world.minX + m, this.world.maxX - m);
    this.y = clamp(this.y, this.world.minY + m, this.world.maxY - m);
  }

  tick(dt) {
    if (!Number.isFinite(this.x + this.y + this.zoom + this.targetX + this.targetY + this.targetZoom)) {
      this.x = this.targetX = this.world ? Math.max(this.world.minX + 4, this.world.maxX - 4) : 0;
      this.y = this.targetY = this.world ? Math.max(this.world.minY + 4, this.world.maxY - 4) : 0;
      this.zoom = this.targetZoom = 1;
      this._anchor = null;
      this._deriv = null;
    }
    const followT = 1 - Math.pow(1 - 0.14, dt * 60);
    const zoomT = 1 - Math.pow(1 - 0.1, dt * 60);
    this.x = lerp(this.x, this.targetX, followT);
    this.y = lerp(this.y, this.targetY, followT);
    this.zoom = lerp(this.zoom, this.targetZoom, zoomT);
    if (this.pitchZoom) {
      const t = clamp((this.zoom - this.zoomMin) / (this.zoomMax - this.zoomMin), 0, 1);
      this.V.setPitch(lerp(this.pitchMin, this.pitchMax, Math.pow(t, this.pitchCurve)));
      this.pitchDeg = this.V.pitchDeg;
      this._deriv = null;
    }
    this._frame();
    const a = this._anchor;
    if (a && Math.abs(this.targetZoom - this.zoom) > 0.0005) {
      const p = this.project(a.wx, a.wy);
      const dx = a.sx - p.x;
      const dy = a.sy - p.y;
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        const k = 1 / (this.scale * Math.max(0.2, p.s));
        this.x += dx * k;
        this.y += dy * k;
        this.targetX += dx * k;
        this.targetY += dy * k;
        this._clampTargets();
      } else this._anchor = null;
    } else this._anchor = null;
    if (this._shakeDuration > 0) {
      this._shakeDuration -= dt;
      const k = Math.max(0, this._shakeDuration) / 0.18;
      this.shakeX = (Math.random() - 0.5) * this._shakeIntensity * 2 * k;
      this.shakeY = (Math.random() - 0.5) * this._shakeIntensity * 2 * k;
    } else {
      this._shakeIntensity = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }
    this._frame();
  }

  begin(ctx) {
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.translate(this.shakeX, this.shakeY);
  }

  end(ctx) {
    ctx.restore();
  }

  clear(ctx, color = "#0c0e09") {
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.screenW, this.screenH);
    ctx.restore();
  }
}
