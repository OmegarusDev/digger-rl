import { drawFlora } from "./flora.js";
import { drawBuilding, drawGhost } from "./buildings.js";
import { drawFounder, drawCamp, drawFireGlow } from "./camp.js";
import { drawVillager } from "./villager.js";
import { drawDeer, drawTrap } from "./fauna.js";
import { drawField, drawFieldGhost } from "./fields.js";
import { sunState } from "../../forge/sun.js";
import { withAlpha } from "../../forge/draw.js";
import { WORK_RANGE } from "../sim/founder.js";

const vig = { cache: "", fill: null };

export function renderScene(ctx, cam, P, sim, fx, t, terrainRenderer, opts = {}) {
  const state = sim.state;
  const sun = sunState(state.time);
  cam.begin(ctx);
  try {
    terrainRenderer(ctx, cam);

    const b = cam.getVisibleBounds();
    const drawList = [];
    for (const item of state.flora) {
      if (item.state === "gone") continue;
      if (item.x < b.left - 3 || item.x > b.right + 3 || item.y < b.top - 4 || item.y > b.bottom + 4) continue;
      drawList.push({ y: item.y, item });
    }
    for (const deer of state.fauna.deer) {
      if (deer.x < b.left - 3 || deer.x > b.right + 3 || deer.y < b.top - 4 || deer.y > b.bottom + 4) continue;
      drawList.push({ y: deer.y, deer });
    }
    for (const trap of state.fauna.traps) {
      if (trap.x < b.left - 3 || trap.x > b.right + 3 || trap.y < b.top - 4 || trap.y > b.bottom + 4) continue;
      drawTrap(ctx, cam, P, trap, trap.caught);
    }
    for (const field of state.fields) {
      if (field.cx < b.left - 24 || field.cx > b.right + 24 || field.cy < b.top - 24 || field.cy > b.bottom + 24) continue;
      drawField(ctx, cam, P, field, t);
    }
    for (const bd of state.buildings) {
      if (bd.x < b.left - 3 || bd.x > b.right + 3 || bd.y < b.top - 4 || bd.y > b.bottom + 4) continue;
      drawList.push({ y: bd.y, bd });
    }
    for (const v of state.villagers) {
      if (v.x < b.left - 3 || v.x > b.right + 3 || v.y < b.top - 4 || v.y > b.bottom + 4) continue;
      drawList.push({ y: v.y, villager: v });
    }
    drawList.push({ y: state.founder.y, founder: true });

    drawCamp(ctx, cam, P, state, t, sun);

    drawList.sort((a, c) => a.y - c.y);
    for (const e of drawList) {
      if (e.founder) drawFounder(ctx, cam, P, state.founder, sun);
      else if (e.villager) drawVillager(ctx, cam, P, e.villager, sun);
      else if (e.deer) drawDeer(ctx, cam, P, e.deer, sun);
      else if (e.bd) drawBuilding(ctx, cam, P, e.bd, opts.hoverBuilding?.id === e.bd.id, sun, t);
      else drawFlora(ctx, cam, P, e.item, t, sun);
    }

    drawSelection(ctx, cam, P, state, opts.selected, t);
    drawWorkTarget(ctx, cam, P, state, t);

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

    if (opts.ghostField) {
      drawFieldGhost(ctx, cam, opts.ghostField.tiles, opts.ghostField.valid);
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
    const wx = Math.cos(sun.az);
    const wy = Math.sin(sun.az) * 0.7;
    const cx = cam.screenW / 2;
    const cy = cam.screenH / 2;
    const R = Math.max(cam.screenW, cam.screenH) * 0.62;
    const g = ctx.createLinearGradient(cx + wx * R, cy + wy * R, cx - wx * R, cy - wy * R);
    const w = sun.warmth;
    g.addColorStop(0, `rgba(236,146,66,${(w * 0.17).toFixed(3)})`);
    g.addColorStop(0.55, `rgba(236,146,66,${(w * 0.05).toFixed(3)})`);
    g.addColorStop(1, "rgba(236,146,66,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cam.screenW, cam.screenH);
  }
  const vigKey = `${cam.screenW}x${cam.screenH}`;
  if (vigKey !== vig.cache) {
    vig.cache = vigKey;
    const cx = cam.screenW / 2;
    const cy = cam.screenH * 0.46;
    const r = Math.hypot(cx, Math.max(cy, cam.screenH - cy)) * 1.04;
    vig.fill = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
    vig.fill.addColorStop(0, "rgba(0,0,0,0)");
    vig.fill.addColorStop(1, "rgba(7,9,4,0.32)");
  }
  ctx.fillStyle = vig.fill;
  ctx.fillRect(0, 0, cam.screenW, cam.screenH);
  drawFireGlow(ctx, cam, P, state, dark);
  ctx.restore();
}

function selectionPos(state, sel) {
  if (!sel) return null;
  if (sel.type === "founder") return { x: state.founder.x, y: state.founder.y, r: 0.4 };
  if (sel.type === "villager") {
    const v = state.villagers.find((vv) => vv.id === sel.id);
    return v ? { x: v.x, y: v.y, r: 0.32 } : null;
  }
  if (sel.type === "building") {
    const b = state.buildings.find((bb) => bb.id === sel.id);
    return b ? { x: b.x, y: b.y, r: 0.58 } : null;
  }
  if (sel.type === "flora") {
    const it = state.flora[sel.id];
    return it && it.state !== "gone" ? { x: it.x, y: it.y, r: 0.44 } : null;
  }
  if (sel.type === "fire") {
    const c = state.camp;
    return { x: c.x - 0.4, y: c.y + 1.05, r: 0.36 };
  }
  if (sel.type === "wagon") {
    const c = state.camp;
    return { x: c.x + 1.65, y: c.y + 0.1, r: 0.52 };
  }
  if (sel.type === "field") {
    const fd = (state.fields ?? []).find((ff) => ff.id === sel.id);
    if (!fd || !fd.tiles.length) return null;
    let x0 = 1e9;
    let y0 = 1e9;
    let x1 = -1e9;
    let y1 = -1e9;
    for (const tl of fd.tiles) {
      x0 = Math.min(x0, tl.x);
      y0 = Math.min(y0, tl.y);
      x1 = Math.max(x1, tl.x + 1);
      y1 = Math.max(y1, tl.y + 1);
    }
    return { rect: { x0, y0, x1, y1 } };
  }
  return null;
}

function drawSelection(ctx, cam, P, state, sel, t) {
  const s = selectionPos(state, sel);
  if (!s) return;
  ctx.strokeStyle = withAlpha(P.ui.accent, 0.5 + Math.sin(t * 2.6) * 0.09);
  ctx.lineWidth = 1.5;
  if (s.rect) {
    const p0 = cam.project(s.rect.x0, s.rect.y0);
    const p1 = cam.project(s.rect.x1, s.rect.y0);
    const p2 = cam.project(s.rect.x1, s.rect.y1);
    const p3 = cam.project(s.rect.x0, s.rect.y1);
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    const p = cam.project(s.x, s.y);
    const r = s.r * cam.scale * p.s;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * cam.V.deckRatio, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}

function drawWorkTarget(ctx, cam, P, state, t) {
  const wt = state.founder.workTarget;
  if (!wt) return;
  let wx;
  let wy;
  if (wt.type === "flora") {
    const it = state.flora[wt.id];
    if (!it || it.state === "gone") return;
    wx = it.x;
    wy = it.y;
  } else {
    const b = state.buildings.find((bb) => bb.id === wt.id);
    if (!b) return;
    wx = b.x;
    wy = b.y;
  }
  const p = cam.project(wx, wy);
  const s = cam.scale * p.s;
  const y = p.y - (0.95 + Math.sin(t * 5) * 0.05) * s;
  const r = 0.1 * s;
  ctx.fillStyle = withAlpha(P.ui.accent, 0.9);
  ctx.strokeStyle = "rgba(20,14,6,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(p.x, y - r);
  ctx.lineTo(p.x + r * 0.85, y);
  ctx.lineTo(p.x, y + r);
  ctx.lineTo(p.x - r * 0.85, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
