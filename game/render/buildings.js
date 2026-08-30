import { drawVisual } from "../../forge/visuals.js";
import { withAlpha } from "../../forge/draw.js";
import { BUILDINGS, SITE_POSTS } from "../data/buildings.js";
import { drawLabel } from "../../forge/draw.js";

export function drawBuilding(ctx, cam, P, b, hover) {
  const p = cam.project(b.x, b.y);
  if (p.y < -140 || p.y > cam.screenH + 140 || p.x < -140 || p.x > cam.screenW + 140) return;
  const s = cam.scale * p.s;
  const def = BUILDINGS[b.kind];

  if (b.state === "site") {
    drawVisual(ctx, cam.V, SITE_POSTS, p.x, p.y, s, P.building);
    const w = 0.7 * s;
    const frac = b.work / b.maxWork;
    const by = p.y - 0.85 * s * cam.V.vExag;
    ctx.fillStyle = "rgba(16,13,8,0.8)";
    ctx.fillRect(p.x - w / 2 - 1, by - 3, w + 2, 6);
    ctx.fillStyle = "#4a4030";
    ctx.fillRect(p.x - w / 2, by - 2, w, 4);
    ctx.fillStyle = P.ui.accent;
    ctx.fillRect(p.x - w / 2, by - 2, w * Math.max(0, Math.min(1, frac)), 4);
    drawLabel(ctx, def.name, p.x, by - 10 * p.s, Math.max(10, 11 * p.s), withAlpha("#e9dfc6", 0.85));
    return;
  }

  drawVisual(ctx, cam.V, def.visual, p.x, p.y, s, P.building);
  if (hover) {
    ctx.strokeStyle = withAlpha(P.ui.accent, 0.7);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 0.58 * s, 0.58 * s * cam.V.deckRatio, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

export function drawGhost(ctx, cam, P, kind, wx, wy, valid) {
  const def = BUILDINGS[kind];
  if (!def) return;
  const p = cam.project(wx, wy);
  const s = cam.scale * p.s;
  ctx.save();
  ctx.globalAlpha = 0.6;
  drawVisual(ctx, cam.V, def.visual, p.x, p.y, s, P.building);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = withAlpha(valid ? "#7ba05c" : "#c45a4a", 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 0.55 * s, 0.55 * s * cam.V.deckRatio, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  const q = [p.x - 0.5 * s, p.y - 0.5 * s * cam.V.deckRatio * 2];
  void q;
}
