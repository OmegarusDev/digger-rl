import { makeView25 } from "./view25.js";

const PAD = 8;
const MAX_SIDE = 220;
const MIN_SIDE = 34;
const MAX_ENTRIES = 160;
const TINT = "#181a10";
const SV = makeView25({ pitchDeg: 26 });

const cache = new Map();
const spare = new Map();
let insertion = [];

function drop(key) {
  const e = cache.get(key);
  if (!e) return;
  cache.delete(key);
  const i = insertion.indexOf(key);
  if (i >= 0) insertion.splice(i, 1);
  const sk = `${e.w}x${e.h}`;
  if (spare.size < 48 && !spare.has(sk)) spare.set(sk, e.cnv);
}

function takeSpare(w, h) {
  const sk = `${w}x${h}`;
  const c = spare.get(sk);
  if (c) {
    spare.delete(sk);
    return c;
  }
  return null;
}

function getEntry(key, w, h) {
  const e = cache.get(key);
  if (e) return e;
  const cnv = takeSpare(w, h) ?? document.createElement("canvas");
  cnv.width = w;
  cnv.height = h;
  const entry = { cnv, w, h, ready: false };
  cache.set(key, entry);
  insertion.push(key);
  if (cache.size > MAX_ENTRIES) drop(insertion[0]);
  return entry;
}

function makeShim(spec, ax, ay, rs) {
  return {
    scale: rs,
    V: SV,
    screenW: 1e6,
    screenH: 1e6,
    project(wx, wy) {
      return { x: ax + (wx - spec.x) * rs, y: ay + (wy - spec.y) * rs, s: 1, v: 0.45 };
    },
  };
}

function blobShadow(ctx, A, spec, dirx, diry, k, alpha, rate) {
  const len = Math.min(spec.h * 4.2, Math.max(spec.h * 0.55, spec.h * k)) * rate;
  const cx = A.ax + dirx * len * 0.45;
  const cy = A.ay + diry * len * 0.45;
  const rx = len * 0.5 + spec.fp * rate;
  ctx.fillStyle = `rgba(16,18,10,${alpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, Math.max(1.5, rx * 0.38), Math.atan2(diry, dirx), 0, Math.PI * 2);
  ctx.fill();
}

export function castSilhouette(ctx, cam, sp, spec) {
  if (!sp || !sp.on || !spec || !(spec.fp > 0)) return;
  const A = cam.groundAffine(spec.x, spec.y);
  const rate = A.rate;
  if (!Number.isFinite(rate) || rate <= 0) return;
  const dirx = sp.dirx;
  const diry = sp.diry * cam.V.deckRatio;
  const k = sp.k / SV.vExag;
  const alpha = Math.min(1, spec.alpha ?? 1) * sp.alphaMul * 0.82;
  if (alpha <= 0.012) return;
  const hMul = spec.hMul ?? SV.vExag;
  let rs = 72;
  let w = Math.ceil(spec.fp * 2 * rs) + PAD * 2;
  let hUp = Math.ceil(spec.h * rs * hMul * 1.12);
  let ax = PAD + Math.ceil(spec.fp * rs);
  let ay = PAD + Math.ceil(spec.fp * rs * SV.deckRatio * 0.5);
  let h = ay + hUp + PAD;
  if (w > MAX_SIDE || h > MAX_SIDE) {
    rs = Math.max(10, (rs * MAX_SIDE) / Math.max(w, h));
    w = Math.ceil(spec.fp * 2 * rs) + PAD * 2;
    hUp = Math.ceil(spec.h * rs * hMul * 1.12);
    ax = PAD + Math.ceil(spec.fp * rs);
    ay = PAD + Math.ceil(spec.fp * rs * SV.deckRatio * 0.5);
    h = ay + hUp + PAD;
  }
  if (w < MIN_SIDE || h < MIN_SIDE) {
    blobShadow(ctx, A, spec, dirx, diry, k, alpha, rate);
    return;
  }
  const e = getEntry(spec.key, w, h);
  if (!e.ready) {
    const g = e.cnv.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, e.w, e.h);
    spec.draw(g, makeShim(spec, ax, ay, rs));
    g.globalCompositeOperation = "source-in";
    g.fillStyle = TINT;
    g.fillRect(0, 0, e.w, e.h);
    g.globalCompositeOperation = "source-over";
    e.ready = true;
  }
  const q = rate / rs;
  const k1 = q * k;
  const c = -dirx * k1;
  const d = q - diry * k1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.transform(q, 0, c, d, A.ax - q * ax - c * ay, A.ay - d * ay);
  ctx.drawImage(e.cnv, 0, 0);
  ctx.restore();
  ctx.globalAlpha = Math.min(1, alpha * 1.2 + 0.05);
  ctx.fillStyle = TINT;
  ctx.beginPath();
  ctx.ellipse(A.ax, A.ay, spec.fp * rate * 0.85, spec.fp * rate * cam.V.deckRatio * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
