import { makeView25 } from "./view25.js";

const PAD = 8;
const MAX_SIDE = 220;
const MIN_SIDE = 34;
const MAX_ENTRIES = 128;
const SIL_BUDGET = 48;
const TINT = "#181a10";
const SV = makeView25({ pitchDeg: 26 });

const cache = new Map();
let insertion = [];

function drop(key) {
  cache.delete(key);
  const i = insertion.indexOf(key);
  if (i >= 0) insertion.splice(i, 1);
}

function getEntry(key, w, h) {
  let e = cache.get(key);
  if (e && e.w === w && e.h === h) return e;
  if (e) drop(key);
  e = cache.get(key);
  if (e && e.w === w && e.h === h) return e;
  const cnv = document.createElement("canvas");
  cnv.width = w;
  cnv.height = h;
  e = { cnv, w, h, ready: false };
  cache.set(key, e);
  insertion.push(key);
  if (cache.size > MAX_ENTRIES) drop(insertion[0]);
  return e;
}

function makeShim(spec, ax, ay, rs, camV) {
  return {
    scale: rs,
    V: camV,
    screenW: 1e6,
    screenH: 1e6,
    project(wx, wy) {
      return { x: ax + (wx - spec.x) * rs, y: ay + (wy - spec.y) * rs, s: 1, v: 0.45 };
    },
  };
}

const BLOB_COUNT = 256;
const blobPool = { cx: new Float64Array(BLOB_COUNT), cy: new Float64Array(BLOB_COUNT), rx: new Float64Array(BLOB_COUNT), ry: new Float64Array(BLOB_COUNT), angle: new Float64Array(BLOB_COUNT), alpha: new Float64Array(BLOB_COUNT), n: 0 };

function flushBlobs(ctx) {
  const b = blobPool;
  if (!b.n) return;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < b.n; i++) {
    ctx.globalAlpha = b.alpha[i];
    ctx.fillStyle = TINT;
    ctx.beginPath();
    ctx.ellipse(b.cx[i], b.cy[i], b.rx[i], b.ry[i], b.angle[i], 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function addBlob(A, spec, dirx, diry, k, alpha, rate) {
  const b = blobPool;
  if (b.n >= BLOB_COUNT) return;
  const len = Math.min(spec.h * 4.2, Math.max(spec.h * 0.55, spec.h * k)) * rate;
  const i = b.n;
  b.cx[i] = A.ax + dirx * len * 0.45;
  b.cy[i] = A.ay + diry * len * 0.45;
  b.rx[i] = len * 0.5 + spec.fp * rate;
  b.ry[i] = Math.max(1.5, b.rx[i] * 0.38);
  b.angle[i] = Math.atan2(diry, dirx);
  b.alpha[i] = alpha;
  b.n++;
}

export function clearShadowCache() {
  cache.clear();
  insertion = [];
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
  const screenW = spec.fp * 2 * rate;
  if (screenW < MIN_SIDE) {
    addBlob(A, spec, dirx, diry, k, alpha, rate);
    return;
  }
  if (silCount >= SIL_BUDGET) {
    addBlob(A, spec, dirx, diry, k, alpha, rate);
    return;
  }
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
    addBlob(A, spec, dirx, diry, k, alpha, rate);
    return;
  }
  const e = getEntry(spec.key, w, h);
  if (!e.ready) {
    const g = e.cnv.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    spec.draw(g, makeShim(spec, ax, ay, rs, cam.V));
    g.globalCompositeOperation = "source-in";
    g.fillStyle = TINT;
    g.fillRect(0, 0, w, h);
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
  if (screenW > 18) {
    ctx.globalAlpha = Math.min(1, alpha * 1.2 + 0.05);
    ctx.fillStyle = TINT;
    ctx.beginPath();
    ctx.ellipse(A.ax, A.ay, spec.fp * rate * 0.85, spec.fp * rate * cam.V.deckRatio * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  silCount++;
}

let silCount = 0;

export function getShadowStats() {
  return { silhouettes: silCount, blobs: blobPool.n };
}

export function beginShadowFrame() {
  silCount = 0;
  blobPool.n = 0;
}

export function endShadowFrame(ctx) {
  flushBlobs(ctx);
}
