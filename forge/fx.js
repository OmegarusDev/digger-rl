const MAX_ITEMS = 420;
const MAX_FLOATS = 90;

export class FxSystem {
  constructor() {
    this.items = [];
    this.floats = [];
  }

  clear() {
    this.items.length = 0;
    this.floats.length = 0;
  }

  _push(item) {
    if (this.items.length >= MAX_ITEMS) this.items.shift();
    this.items.push(item);
  }

  float(x, y, text, color = "#f5ecd2") {
    if (this.floats.length >= MAX_FLOATS) this.floats.shift();
    this.floats.push({
      x: x + (Math.random() - 0.5) * 0.2,
      y: y - 0.2,
      text,
      color,
      life: 0.85,
      max: 0.85,
      vy: -0.85,
    });
  }

  emit(name, x, y, opts = {}) {
    const n = opts.count ?? 1;
    for (let i = 0; i < n; i++) this._spawn(name, x, y, opts);
  }

  _spawn(name, x, y, opts) {
    const r = Math.random;
    switch (name) {
      case "chips":
        this._push({
          kind: "chip",
          x, y,
          vx: (r() - 0.5) * 2.4,
          vy: -1.2 - r() * 1.6,
          life: 0.4 + r() * 0.2,
          max: 0.6,
          color: opts.color ?? "#c9a25a",
          size: 1.4 + r() * 1.6,
          rot: r() * Math.PI,
        });
        break;
      case "leafPuff":
        this._push({
          kind: "leaf",
          x: x + (r() - 0.5) * 0.5,
          y: y - 0.8 - r() * 0.6,
          vx: (r() - 0.5) * 1.2,
          vy: 0.3 + r() * 0.5,
          life: 0.7 + r() * 0.5,
          max: 1.2,
          color: opts.color ?? "#7a9a4a",
          size: 2 + r() * 2,
          rot: r() * Math.PI * 2,
        });
        break;
      case "dust":
        this._push({
          kind: "puff",
          x, y,
          vx: (r() - 0.5) * 0.5,
          vy: -0.2 - r() * 0.3,
          life: 0.5 + r() * 0.3,
          max: 0.8,
          color: opts.color ?? "#c8b892",
          size: 2.5 + r() * 2.5,
        });
        break;
      case "smoke":
        this._push({
          kind: "puff",
          x: x + (r() - 0.5) * 0.2,
          y,
          vx: (r() - 0.5) * 0.25 + 0.12,
          vy: -0.55 - r() * 0.35,
          life: 1.2 + r() * 0.8,
          max: 2.0,
          color: opts.color ?? "#9a938a",
          size: 2.5 + r() * 3,
          grow: 1.6,
        });
        break;
      case "spark":
        this._push({
          kind: "spark",
          x, y,
          vx: (r() - 0.5) * 1.6,
          vy: -0.8 - r() * 1.4,
          life: 0.3 + r() * 0.25,
          max: 0.55,
          color: opts.color ?? "#f0b050",
          size: 1 + r() * 1.4,
        });
        break;
      case "splash":
        this._push({
          kind: "drop",
          x, y,
          vx: (r() - 0.5) * 1.4,
          vy: -1 - r() * 1.2,
          life: 0.4 + r() * 0.25,
          max: 0.65,
          color: opts.color ?? "#9ec8dd",
          size: 1.2 + r() * 1.2,
        });
        break;
      case "pop": {
        this._push({
          kind: "ring",
          x, y,
          life: 0.32,
          max: 0.32,
          color: opts.color ?? "#f5ecd2",
          r0: 0.1,
          r1: opts.r1 ?? 0.55,
        });
        break;
      }
      default:
        break;
    }
  }

  tick(dt) {
    for (let i = 0; i < this.items.length; ) {
      const it = this.items[i];
      it.life -= dt;
      if (it.kind === "chip" || it.kind === "leaf" || it.kind === "spark" || it.kind === "drop") {
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.vx *= 0.92;
        it.vy = it.kind === "leaf" ? it.vy * 0.95 + 0.4 * dt : it.vy + 3.2 * dt;
        if (it.rot !== undefined) it.rot += dt * 7;
      } else if (it.kind === "puff") {
        it.x += (it.vx || 0) * dt;
        it.y += (it.vy || 0) * dt;
        if (it.grow) it.size += it.grow * dt;
      }
      if (it.life <= 0) {
        const last = this.items.length - 1;
        this.items[i] = this.items[last];
        this.items.pop();
      } else i++;
    }
    for (let i = 0; i < this.floats.length; ) {
      const fl = this.floats[i];
      fl.life -= dt;
      fl.y += fl.vy * dt;
      fl.vy *= 0.94;
      if (fl.life <= 0) {
        const last = this.floats.length - 1;
        this.floats[i] = this.floats[last];
        this.floats.pop();
      } else i++;
    }
  }

  draw(ctx, project, unit) {
    for (const it of this.items) {
      const p = project(it.x, it.y);
      const a = Math.max(0, it.life / it.max);
      ctx.globalAlpha = a;
      if (it.kind === "chip" || it.kind === "leaf") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(it.rot);
        ctx.fillStyle = it.color;
        if (it.kind === "chip") ctx.fillRect(-it.size / 2, -it.size / 4, it.size, it.size / 2);
        else {
          ctx.beginPath();
          ctx.ellipse(0, 0, it.size, it.size * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (it.kind === "spark" || it.kind === "drop") {
        ctx.fillStyle = it.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, it.size * a, 0, Math.PI * 2);
        ctx.fill();
      } else if (it.kind === "puff") {
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = it.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, it.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (it.kind === "ring") {
        const r = (it.r0 + (it.r1 - it.r0) * (1 - a)) * unit;
        ctx.globalAlpha = a * 0.7;
        ctx.strokeStyle = it.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r, r * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    for (const fl of this.floats) {
      const p = project(fl.x, fl.y);
      const a = Math.max(0, fl.life / fl.max);
      ctx.globalAlpha = a;
      ctx.font = `600 ${Math.max(11, 13 * p.s)}px "Iowan Old Style", Georgia, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeStyle = "rgba(16,14,8,0.75)";
      ctx.lineWidth = 3;
      ctx.strokeText(fl.text, p.x, p.y);
      ctx.fillStyle = fl.color;
      ctx.fillText(fl.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }
}
