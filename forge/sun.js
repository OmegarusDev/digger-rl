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

export function drawSunShadow(ctx, cam, sun, wx, wy, footprint, height, alpha = 0.26) {
  if (sun.day <= 0.03) return;
  const p = cam.project(wx, wy);
  const s = cam.scale * p.s;
  const len = clamp(height / Math.max(0.22, sun.alt), height * 0.55, height * 4.2) * s;
  const dirx = -Math.cos(sun.az);
  const diry = -Math.sin(sun.az) * 0.9;
  const cx = p.x + dirx * len * 0.45;
  const cy = p.y + diry * len * 0.45;
  const rx = len * 0.5 + footprint * s;
  const ry = Math.max(1.5, rx * 0.38);
  ctx.fillStyle = `rgba(16,18,10,${(alpha * (0.45 + 0.55 * sun.day)).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, Math.atan2(diry, dirx), 0, Math.PI * 2);
  ctx.fill();
}
