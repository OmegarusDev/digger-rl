import { mulberry32, clamp, hash2 } from "../../forge/rng.js";
import { createNoise, fbm, ridged } from "../../forge/noise.js";

export const WORLD_SIZE = 72;

export function createValley(seed) {
  const elevN = createNoise(seed * 7 + 11);
  const moistN = createNoise(seed * 13 + 29);
  const fertN = createNoise(seed * 17 + 53);
  const warpN = createNoise(seed * 23 + 71);
  const rng = mulberry32((seed ^ 0x9e3779b9) | 0);

  const riverPts = [];
  {
    let y = 10 + rng() * (WORLD_SIZE - 20);
    let x = -5;
    let phase = rng() * Math.PI * 2;
    while (x < WORLD_SIZE + 5) {
      riverPts.push({ x, y });
      phase += 0.16 + fbm(warpN, x * 0.045, y * 0.045, 2) * 0.2;
      y += Math.sin(phase) * 0.85 + (fbm(warpN, x * 0.03 + 41, y * 0.03 + 17, 2) - 0.5) * 0.7;
      y = clamp(y, 5, WORLD_SIZE - 5);
      x += 0.85;
    }
  }

  const BUCKET = 4;
  const buckets = new Map();
  const bk = (cx, cy) => cx * 4096 + cy;
  riverPts.forEach((p, i) => {
    const cx = Math.floor(p.x / BUCKET);
    const cy = Math.floor(p.y / BUCKET);
    for (let ox = -1; ox <= 1; ox++)
      for (let oy = -1; oy <= 1; oy++) {
        const k = bk(cx + ox, cy + oy);
        let arr = buckets.get(k);
        if (!arr) buckets.set(k, (arr = []));
        arr.push(i);
      }
  });

  function riverDist(x, y) {
    const cx = Math.floor(x / BUCKET);
    const cy = Math.floor(y / BUCKET);
    const arr = buckets.get(bk(cx, cy));
    if (!arr) return 99;
    let best = 99;
    for (const i of arr) {
      const p = riverPts[i];
      const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }

  function riverHalfWidth(x) {
    return 1.45 + Math.sin(x * 0.09 + seed) * 0.45;
  }

  function moistureAt(x, y) {
    return fbm(moistN, x * 0.05, y * 0.05, 3);
  }

  function elevationAt(x, y) {
    return fbm(elevN, x * 0.03, y * 0.03, 3);
  }

  function typeAt(x, y) {
    const d = riverDist(x, y);
    const hw = riverHalfWidth(x);
    if (d < hw) return "water";
    const shoreW = 0.55 + fbm(warpN, x * 0.11 + 61, y * 0.11 + 23, 2) * 0.85;
    if (d < hw + Math.max(0.15, shoreW)) return "shore";
    const m = moistureAt(x, y);
    const edge = fbm(warpN, x * 0.09 + 91, y * 0.09 + 31, 2) * 0.12;
    if (m > 0.16 + edge) return "forest";
    if (m > -0.08 + edge) return "meadow";
    return "grass";
  }

  function fertilityAt(x, y) {
    const d = riverDist(x, y);
    const hw = riverHalfWidth(x);
    const flood = d < hw + 9 ? Math.max(0, 1 - (d - hw) / 9) : 0;
    const base = fbm(fertN, x * 0.06, y * 0.06, 3) * 0.5 + 0.5;
    return clamp(Math.max(base * 0.55, flood), 0, 1);
  }

  const camp = findCamp();

  function findCamp() {
    const cx = WORLD_SIZE / 2;
    const cy = WORLD_SIZE / 2;
    for (let r = 0; r < WORLD_SIZE; r += 1) {
      for (let a = 0; a < 24; a++) {
        const ang = (a / 24) * Math.PI * 2 + r * 0.35;
        const x = Math.floor(cx + Math.cos(ang) * r);
        const y = Math.floor(cy + Math.sin(ang) * r);
        if (x < 6 || y < 6 || x > WORLD_SIZE - 6 || y > WORLD_SIZE - 6) continue;
        const t = typeAt(x + 0.5, y + 0.5);
        if (t === "water" || t === "shore") continue;
        const d = riverDist(x + 0.5, y + 0.5);
        if (d < 3 || d > 9) continue;
        return { x, y };
      }
    }
    return { x: Math.floor(WORLD_SIZE / 2), y: Math.floor(WORLD_SIZE / 2) };
  }

  const floraSeed = placeFlora();

  function placeFlora() {
    const out = [];
    for (let gy = 2; gy < WORLD_SIZE - 2; gy += 0.8) {
      for (let gx = 2; gx < WORLD_SIZE - 2; gx += 0.8) {
        const jx = gx + (hash2(gx * 10, gy * 10, seed) - 0.5) * 0.7;
        const jy = gy + (hash2(gx * 10 + 7, gy * 10 + 3, seed) - 0.5) * 0.7;
        if (Math.hypot(jx - (camp.x + 0.5), jy - (camp.y + 0.5)) < 3.4) continue;
        const t = typeAt(jx, jy);
        const h = hash2(Math.floor(jx * 7), Math.floor(jy * 7), seed);
        if (t === "forest") {
          if (h < 0.58) {
            out.push({
              kind: "tree",
              x: jx,
              y: jy,
              species: moistureAt(jx, jy) > 0.3 ? "pine" : "oak",
              variant: Math.floor(hash2(Math.floor(jx * 31), Math.floor(jy * 17), seed) * 3),
              scale: 0.85 + h * 0.5,
            });
          }
        } else if (t === "meadow") {
          if (h < 0.045) {
            out.push({ kind: "rock", x: jx, y: jy, variant: Math.floor(h * 200) % 3, scale: 0.8 + h * 4 });
          } else if (h < 0.1) {
            out.push({ kind: "bush", x: jx, y: jy, variant: 0, scale: 0.9 + h * 2 });
          } else if (h < 0.115) {
            out.push({ kind: "berry", x: jx, y: jy, variant: 0, scale: 0.95 });
          }
        } else if (t === "grass") {
          if (h < 0.02) {
            out.push({ kind: "rock", x: jx, y: jy, variant: Math.floor(h * 300) % 3, scale: 0.9 + h * 6 });
          }
        }
      }
    }
    return out;
  }

  return {
    seed,
    size: WORLD_SIZE,
    riverPts,
    camp,
    floraSeed,
    sample(x, y) {
      return {
        type: typeAt(x, y),
        moisture: moistureAt(x, y),
        fertility: fertilityAt(x, y),
        elevation: elevationAt(x, y),
        riverDist: riverDist(x, y),
      };
    },
    typeAt,
    riverDist,
    riverHalfWidth,
    fertilityAt,
    ridgedAt(x, y) {
      return ridged(elevN, x * 0.05, y * 0.05, 3);
    },
  };
}
