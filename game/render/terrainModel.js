import { createNoise, fbm } from "../../forge/noise.js";
import { clamp, lerp, hash2 } from "../../forge/rng.js";

export function makeTerrainSampler(valley, P, seed) {
  const detail = createNoise(seed * 31 + 5);
  const T = P.terrain;

  return (wx, wy, gx, gy) => {
    const s = valley.sample(wx, wy);
    let r, g, b;

    if (s.type === "water") {
      const hw = valley.riverHalfWidth(wx);
      const depth = clamp(1 - s.riverDist / hw, 0, 1);
      r = lerp(T.water[0], T.deepWater[0], depth);
      g = lerp(T.water[1], T.deepWater[1], depth);
      b = lerp(T.water[2], T.deepWater[2], depth);
    } else if (s.type === "shore") {
      const wet = clamp(1 - (s.riverDist - valley.riverHalfWidth(wx)) / 0.8, 0, 1);
      r = lerp(T.shore[0], T.shore[0] * 0.82, wet);
      g = lerp(T.shore[1], T.shore[1] * 0.82, wet);
      b = lerp(T.shore[2], T.shore[2] * 0.82, wet);
    } else {
      const m = clamp((s.moisture + 0.5) / 1.0, 0, 1);
      if (s.type === "forest") {
        r = lerp(T.forestFloor[0], T.grass[0], 0.1);
        g = lerp(T.forestFloor[1], T.grass[1], 0.1);
        b = lerp(T.forestFloor[2], T.grass[2], 0.1);
      } else if (s.type === "meadow") {
        r = lerp(T.meadow[0], T.shore[0], (1 - m) * 0.25);
        g = lerp(T.meadow[1], T.shore[1], (1 - m) * 0.25);
        b = lerp(T.meadow[2], T.shore[2], (1 - m) * 0.25);
      } else {
        r = lerp(T.grass[0], T.forestFloor[0], 0.35);
        g = lerp(T.grass[1], T.forestFloor[1], 0.35);
        b = lerp(T.grass[2], T.forestFloor[2], 0.35);
      }
      const fert = s.fertility * 0.5;
      r = lerp(r, T.fertile[0], fert);
      g = lerp(g, T.fertile[1], fert);
      b = lerp(b, T.fertile[2], fert);
    }

    const shade = s.elevation * 18;
    r += shade;
    g += shade;
    b += shade;

    const dCamp = Math.hypot(wx - (valley.camp.x + 0.5), wy - (valley.camp.y + 0.5));
    if (dCamp < 2.6 && s.type !== "water") {
      const k = (1 - dCamp / 2.6) * 0.8;
      r = lerp(r, T.camp[0], k);
      g = lerp(g, T.camp[1], k);
      b = lerp(b, T.camp[2], k);
    }

    const grain = fbm(detail, wx * 1.15, wy * 1.15, 2) * 11;
    r += grain;
    g += grain;
    b += grain * 0.85;

    const fine = (hash2(gx ?? Math.round(wx * 4), gy ?? Math.round(wy * 4), 91) - 0.5) * 15;
    r += fine;
    g += fine;
    b += fine * 0.85;

    return {
      r: Math.max(0, Math.min(255, Math.round(r))),
      g: Math.max(0, Math.min(255, Math.round(g))),
      b: Math.max(0, Math.min(255, Math.round(b))),
    };
  };
}
