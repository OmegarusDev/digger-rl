import { drawVisual } from "../../forge/visuals.js";
import { drawSunShadow } from "../../forge/sun.js";

const defCache = new Map();

function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function pineDef(v) {
  const tint = ["#3d5a34", "#4c6c3e", "#456238"][v % 3];
  return [
    ["cyl", { r: 0.06, h: 0.28, top: "#b09468", side: "#6e5236", bottom: "#54402a" }],
    ["cone", { y: 0.22, w: 0.74, h: 0.44, c: shadeHex(tint, -16) }],
    ["cone", { y: 0.5, w: 0.56, h: 0.4, c: tint }],
    ["cone", { y: 0.78, w: 0.38, h: 0.36, c: shadeHex(tint, 16) }],
    ["blob", { y: 0.98, r: 0.09, c: shadeHex(tint, 24) }],
  ];
}

function oakDef(v) {
  const tint = ["#5d7c40", "#6f8c4c", "#54713c"][v % 3];
  return [
    ["cyl", { r: 0.07, h: 0.3, top: "#b09468", side: "#6e5236", bottom: "#54402a" }],
    ["blob", { y: 0.28, x: -0.14, r: 0.2, c: shadeHex(tint, -20) }],
    ["blob", { y: 0.3, x: 0.16, r: 0.18, c: shadeHex(tint, -14) }],
    ["blob", { y: 0.42, x: -0.02, r: 0.24, c: tint }],
    ["blob", { y: 0.46, x: 0.15, r: 0.16, c: shadeHex(tint, 4) }],
    ["blob", { y: 0.44, x: -0.16, r: 0.15, c: shadeHex(tint, 8) }],
    ["blob", { y: 0.58, x: -0.04, r: 0.16, c: shadeHex(tint, 22) }],
    ["blob", { y: 0.54, x: 0.08, r: 0.11, c: shadeHex(tint, 30) }],
  ];
}

function rockDef(v) {
  const r = 0.2 + (v % 3) * 0.04;
  return [
    ["diamond", { r, h: r * 0.75, top: "stoneHi", side: "stone", dark: "stoneDark" }],
    ["diamond", { x: r * 0.85, y: -0.02, r: r * 0.42, h: r * 0.4, top: "stoneHi", side: "stone", dark: "stoneDark" }],
  ];
}

const bushDef = [
  ["blob", { y: 0.04, x: -0.12, r: 0.17, c: "#42603a" }],
  ["blob", { y: 0.05, x: 0.12, r: 0.15, c: "#4a6c40" }],
  ["blob", { y: 0.12, r: 0.18, c: "#4c6c3e" }],
];

const berryDef = [
  ...bushDef,
  ["dots", { y: 0.18, r: 0.2, c: "#b8452f", pts: [[-0.5, -0.2], [0.4, -0.5], [0.1, -0.1], [-0.2, -0.7], [0.55, 0.1]] }],
];

const stumpDef = [["cyl", { r: 0.12, h: 0.12, top: "#c0a274", side: "#8a6a44", bottom: "#685032" }]];

const SHAPES = {
  tree: { fp: 0.4, h: 1.15 },
  rock: { fp: 0.38, h: 0.32 },
  bush: { fp: 0.28, h: 0.24 },
  berry: { fp: 0.28, h: 0.24 },
  stump: { fp: 0.18, h: 0.14 },
};

function cached(key, make) {
  let d = defCache.get(key);
  if (!d) {
    d = make();
    defCache.set(key, d);
  }
  return d;
}

export function floraVisual(item, alive) {
  switch (item.kind) {
    case "tree":
      return cached(`${item.species}:${item.variant}`, () => (item.species === "pine" ? pineDef(item.variant) : oakDef(item.variant)));
    case "rock":
      return cached(`rock:${item.variant}`, () => rockDef(item.variant));
    case "bush":
      return cached("bush", () => bushDef);
    case "berry":
      return alive ? cached("berry", () => berryDef) : cached("bush", () => bushDef);
    case "stump":
      return cached("stump", () => stumpDef);
    default:
      return bushDef;
  }
}

export function drawFlora(ctx, cam, P, item, t, sun) {
  const p = cam.project(item.x, item.y);
  if (p.y < -160 || p.y > cam.screenH + 160 || p.x < -160 || p.x > cam.screenW + 160) return;
  const scale = item.scale * cam.scale * p.s;

  let kind = item.kind;
  if (item.state === "stump") kind = "stump";
  const alive = item.state === "alive";
  const shape = SHAPES[kind] || SHAPES.bush;

  if (item.state !== "falling") {
    drawSunShadow(ctx, cam, sun, item.x, item.y, shape.fp, shape.h * item.scale);
  }

  const shake = item.shakeT > 0 ? Math.sin(t * 55) * 2.2 * item.shakeT * scale : 0;
  const fall = item.state === "falling" ? Math.min(1, 1 - item.fallT / 0.9) : 0;

  ctx.save();
  ctx.translate(p.x + shake, p.y);
  if (fall > 0) {
    ctx.rotate(fall * fall * 1.45 * (item.variant % 2 === 0 ? 1 : -1));
    ctx.globalAlpha = fall > 0.85 ? (1 - fall) / 0.15 : 1;
  }
  drawVisual(ctx, cam.V, floraVisual(item, alive), 0, 0, scale, P.flora);
  ctx.restore();
}
