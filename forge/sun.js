import { clamp } from "./rng.js";

const SEASON_SUN = [
  { dayFrac: 0.52, noon: 0.85 },
  { dayFrac: 0.6, noon: 1.0 },
  { dayFrac: 0.5, noon: 0.7 },
  { dayFrac: 0.4, noon: 0.48 },
];

const clamp01 = (v) => clamp(v, 0, 1);

export function sunState(time) {
  const s = SEASON_SUN[time.season] || SEASON_SUN[0];
  const dawn = (1 - s.dayFrac) / 2;
  const u = (time.tod - dawn) / s.dayFrac;
  const up = u >= 0 && u <= 1;
  const alt = up ? Math.sin(u * Math.PI) * s.noon : -0.35;
  const az = up ? Math.PI * (0.12 + 0.76 * clamp01(u)) : Math.PI * (u < 0.5 ? 0.94 : 0.06);
  const day = clamp01(alt * 8);
  const warmth = clamp01(1 - Math.abs(alt) * 4.5) * clamp01(alt * 8 + 0.5);
  return {
    alt,
    az,
    day,
    warmth,
    night: 1 - day,
    dawn,
    dusk: dawn + s.dayFrac,
    dayFrac: s.dayFrac,
    noon: s.noon,
  };
}

export function shadowParams(sun) {
  if (sun.day > 0.02) {
    return {
      on: true,
      moon: false,
      dirx: -Math.cos(sun.az),
      diry: -Math.sin(sun.az),
      k: clamp(1 / Math.max(0.22, sun.alt), 0.55, 4.2),
      alphaMul: (0.45 + 0.55 * sun.day) * clamp01(sun.day * 12),
      warm: sun.warmth,
    };
  }
  return { on: true, moon: true, dirx: -0.58, diry: -0.5, k: 0.6, alphaMul: 0.12, warm: 0 };
}
