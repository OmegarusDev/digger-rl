import { drawFlora } from "./flora.js";
import { drawFounder, drawCamp, drawFireGlow } from "./camp.js";
import { darkness } from "../sim/time.js";

export function renderScene(ctx, cam, P, sim, fx, t, terrainRenderer) {
  const state = sim.state;
  cam.begin(ctx);
  terrainRenderer(ctx, cam);
  drawCamp(ctx, cam, P, state, t);

  const b = cam.getVisibleBounds();
  const drawList = [];
  for (const item of state.flora) {
    if (item.state === "gone") continue;
    if (item.x < b.left - 3 || item.x > b.right + 3 || item.y < b.top - 4 || item.y > b.bottom + 4) continue;
    drawList.push({ y: item.y, item });
  }
  drawList.push({ y: state.founder.y, founder: true });
  drawList.sort((a, c) => a.y - c.y);
  for (const e of drawList) {
    if (e.founder) drawFounder(ctx, cam, P, state.founder);
    else drawFlora(ctx, cam, cam.V, P, e.item, t);
  }

  fx.draw(ctx, (x, y) => cam.project(x, y), cam.scale);
  cam.end(ctx);

  const tod = state.time.tod;
  const dark = darkness(tod);
  if (dark > 0.01) {
    ctx.fillStyle = `rgba(10,12,34,${(dark * 0.42).toFixed(3)})`;
    ctx.fillRect(0, 0, cam.screenW, cam.screenH);
  }
  const glow = Math.max(0, 1 - Math.abs(tod - 0.8) / 0.12);
  if (glow > 0.01) {
    ctx.fillStyle = `rgba(232,140,70,${(glow * 0.1).toFixed(3)})`;
    ctx.fillRect(0, 0, cam.screenW, cam.screenH);
  }
  drawFireGlow(ctx, cam, P, state, dark);
}
