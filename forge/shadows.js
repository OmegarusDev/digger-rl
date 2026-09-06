const PAD = 10;
const MAX_SIDE = 340;
const MAX_ENTRIES = 240;
const TINT = "#181a10";

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

function makeShim(cam, spec, ax, ay, s0) {
  const rate = cam.scale * s0;
  return {
    scale: cam.scale,
    V: cam.V,
    screenW: 1e6,
    screenH: 1e6,
    project(wx, wy) {
      return { x: ax + (wx - spec.x) * rate, y: ay + (wy - spec.y) * rate, s: s0, v: 0.45 };
    },
  };
}

function blobShadow(ctx, A, spec, dirx, diry, k, alpha, deck, rate) {
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
  const deck = cam.V.deckRatio;
  const dirx = sp.dirx;
  const diry = sp.diry * deck;
  const k = sp.k / cam.V.vExag;
  const alpha = Math.min(1, spec.alpha ?? 1) * sp.alphaMul * 0.82;
  if (alpha <= 0.012) return;
  const hMul = spec.hMul ?? cam.V.vExag;
  const w = Math.ceil(spec.fp * 2 * rate) + PAD * 2;
  const hUp = Math.ceil(spec.h * rate * hMul * 1.14);
  const ax = PAD + Math.ceil(spec.fp * rate);
  const ay = PAD + Math.ceil(spec.fp * rate * deck * 0.5);
  const h = ay + hUp + PAD;
  if (w > MAX_SIDE || h > MAX_SIDE) {
    blobShadow(ctx, A, spec, dirx, diry, k, alpha, deck, rate);
    return;
  }
  const bw = Math.ceil(w / 16) * 16;
  const bh = Math.ceil(h / 16) * 16;
  const e = getEntry(`${spec.key}@${bw}x${bh}`, bw, bh);
  if (!e.ready) {
    const g = e.cnv.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, bw, bh);
    spec.draw(g, makeShim(cam, spec, ax, ay, A.s));
    g.globalCompositeOperation = "source-in";
    g.fillStyle = TINT;
    g.fillRect(0, 0, bw, bh);
    g.globalCompositeOperation = "source-over";
    e.ready = true;
  }
  const c = -dirx * k;
  const d = 1 - diry * k;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.transform(1, 0, c, d, A.ax - ax - c * ay, A.ay - ay - (d - 1) * ay);
  ctx.drawImage(e.cnv, 0, 0);
  ctx.restore();
  ctx.globalAlpha = Math.min(1, alpha * 1.2 + 0.05);
  ctx.fillStyle = TINT;
  ctx.beginPath();
  ctx.ellipse(A.ax, A.ay, spec.fp * rate * 0.85, spec.fp * rate * deck * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function clearShadowCache() {
  for (const key of Array.from(cache.keys())) drop(key);
}
