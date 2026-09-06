import { drawVisual } from "../../forge/visuals.js";

const deerDef = [
  ["box", { w: 0.36, d: 0.18, h: 0.2, top: "#8a6240", side: "#6e4c30", dark: "#54381f" }],
  ["box", { x: 0.2, w: 0.13, d: 0.13, h: 0.26, top: "#8a6240", side: "#6e4c30", dark: "#54381f" }],
  ["post", { x: 0.24, y: -0.05, h: 0.34 }],
  ["post", { x: 0.17, y: -0.05, h: 0.34 }],
];

const trapDef = [
  ["cyl", { r: 0.12, h: 0.03, top: "#54402a", side: "#3d2e1a", bottom: "#3d2e1a" }],
  ["post", { x: 0.16, y: 0.0, h: 0.12 }],
];

export function deerShadowSpec(P, deer) {
  let s = deer._ss;
  if (!s) {
    s = {
      x: 0,
      y: 0,
      fp: 0.32,
      h: 0.42,
      alpha: 0.9,
      key: "deer",
      draw: (g, m) => {
        const p = m.project(deer.x, deer.y);
        drawVisual(g, m.V, deerDef, p.x, p.y, m.scale * p.s, P.flora);
      },
    };
    deer._ss = s;
  }
  s.x = deer.x;
  s.y = deer.y;
  return s;
}

export function drawDeer(ctx, cam, P, deer, sun) {
  const p = cam.project(deer.x, deer.y);
  void sun;
  drawVisual(ctx, cam.V, deerDef, p.x, p.y, cam.scale * p.s, P.flora);
  if (deer.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(deer.flash * 1.5).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - cam.scale * p.s * 0.14, 0.3 * cam.scale * p.s, 0.3 * cam.scale * p.s * cam.V.deckRatio, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawTrap(ctx, cam, P, trap, caught) {
  const p = cam.project(trap.x, trap.y);
  ctx.strokeStyle = caught ? "rgba(184,69,47,0.8)" : "rgba(60,45,26,0.75)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 0.16 * cam.scale * p.s, 0.16 * cam.scale * p.s * cam.V.deckRatio, 0, 0, Math.PI * 2);
  ctx.stroke();
  drawVisual(ctx, cam.V, trapDef, 0, 0, cam.scale * p.s, P.flora);
  if (caught) {
    ctx.fillStyle = "#b8452f";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 4, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
