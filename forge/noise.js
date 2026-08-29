import { mulberry32 } from "./rng.js";

function buildPerm(seed) {
  const rng = mulberry32(seed);
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 256; i++) p[i + 256] = p[i];
  return p;
}

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function grad(hash, x, y) {
  const h = hash & 3;
  return ((h & 1) === 0 ? x : -x) + ((h & 2) === 0 ? y : -y);
}

export function createNoise(seed = 42) {
  const perm = buildPerm(seed);
  return function noise2D(x, y) {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];
    const x1 = lerp3(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp3(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp3(x1, x2, v);
  };
}

function lerp3(a, b, t) {
  return a + (b - a) * t;
}

export function fbm(noise, x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return value / maxValue;
}

export function ridged(noise, x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    let n = noise(x * frequency, y * frequency);
    n = 1 - Math.abs(n);
    n = n * n;
    value += n * amplitude;
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return value / maxValue;
}

export function warp(noise, x, y, strength = 1.0) {
  const wx = noise(x + 5.2, y + 1.3) * strength;
  const wy = noise(x + 9.7, y + 2.8) * strength;
  return { x: x + wx, y: y + wy };
}
