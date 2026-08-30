import { drawFlora } from "./flora.js";
import { drawBuilding, drawGhost } from "./buildings.js";
import { drawFounder, drawCamp, drawFireGlow } from "./camp.js";
import { WORK_RANGE } from "../sim/founder.js";
import { withAlpha } from "../../forge/draw.js";
import { sunState } from "../../forge/sun.js";

export function renderScene(ctx, cam, P, sim, fx, t, terrainRenderer, opts = {}) {
  const state = sim.state;
  const sun = sunState(state.time);
  cam.begin(ctx);
  try {
    terrainRenderer(ctx, cam);
    drawCamp(ctx, cam, P, state, t, sun);

  const b = cam.getVisibleBounds();
  const drawList = [];
  for (const item of state.flora) {
    if (item.state === "gone") continue;
    if (item.x < b.left - 3 || item.x > b.right + 3 || item.y < b.top - 4 || item.y > b.bottom + 4) continue;
    drawList.push({ y: item.y, item });
  }
  for (const bd of state.buildings) {
    if (bd.x < b.left - 3 || bd.x > b.right + 3 || bd.y < b.top - 4 || bd.y > b.bottom + 4) continue;
    drawList.push({ y: bd.y, bd });
  }
  drawList.push({ y: state.founder.y, founder: true });
  drawList.sort((a, c) => a.y - c.y);
  for (const e of drawList) {
    if (e.founder) drawFounder(ctx, cam, P, state.founder, sun);
    else if (e.bd) drawBuilding(ctx, cam, P, e.bd, opts.hoverBuilding?.id === e.bd.id, sun);
    else drawFlora(ctx, cam, P, e.item, t, sun);
  }

  const hov = opts.hoverItem;
  if (hov && hov.state === "alive") {
    const inRange = Math.hypot(hov.x - state.founder.x, hov.y - state.founder.y) <= WORK_RANGE;
    const hp = cam.project(hov.x, hov.y);
    ctx.strokeStyle = withAlpha(P.ui.accent, inRange ? 0.8 : 0.32);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(hp.x, hp.y, 0.44 * cam.scale * hp.s, 0.44 * cam.scale * hp.s * cam.V.deckRatio, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
  }

  if (opts.ghost) {
    drawGhost(ctx, cam, P, opts.ghost.kind, opts.ghost.x, opts.ghost.y, opts.ghost.valid);
  }

  fx.draw(ctx, (x, y) => cam.project(x, y), cam.scale);
  } finally {
    cam.end(ctx);
  }

  ctx.save();
  ctx.scale(cam.dpr, cam.dpr);
  const dark = 1 - sun.day;
  if (dark > 0.01) {
    ctx.fillStyle = `rgba(10,12,34,${(dark * 0.44).toFixed(3)})`;
    ctx.fillRect(0, 0, cam.screenW, cam.screenH);
  }
  if (sun.warmth > 0.01) {
    ctx.fillStyle = `rgba(236,146,66,${(sun.warmth * 0.13).toFixed(3)})`;
    ctx.fillRect(0, 0, cam.screenW, cam.screenH);
  }
  drawFireGlow(ctx, cam, P, state, dark);
  ctx.restore();
}
