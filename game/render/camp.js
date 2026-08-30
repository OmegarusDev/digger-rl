import { box25 } from "../../forge/prims.js";
import { mats, withAlpha } from "../../forge/draw.js";
import { drawAgent } from "../../forge/agents.js";
import { drawSunShadow } from "../../forge/sun.js";

export function makeFounderSkin(P) {
  return {
    tunic: P.agent.founder,
    trim: P.agent.founderTrim,
    hood: true,
    skin: P.agent.skin[1],
    hair: P.agent.hair[0],
    pants: "#4a3a28",
    outline: P.agent.outline,
    tool: P.agent.tool,
    toolDark: P.agent.toolDark,
    log: P.agent.log,
  };
}

export function drawFounder(ctx, cam, P, founder, sun) {
  const p = cam.project(founder.x, founder.y);
  const skin = makeFounderSkin(P);
  drawAgent(
    ctx,
    p,
    {
      moving: founder.moving,
      phase: founder.phase,
      dir: founder.dir,
      action: founder.action,
      swing: founder.swing,
      carry: carryCount(founder),
      flash: 0,
    },
    skin,
    cam.V,
    cam.scale,
    sun
  );
  ctx.strokeStyle = withAlpha(P.ui.accent, 0.35);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 2 * p.s, 0.34 * cam.scale * p.s, 0.34 * cam.scale * p.s * cam.V.deckRatio, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
}

function carryCount(f) {
  return (f.carry?.wood ?? 0) + (f.carry?.food ?? 0) + (f.carry?.stone ?? 0);
}

export function drawCamp(ctx, cam, P, state, t, sun) {
  const c = state.camp;
  const px = c.x + 0.5;
  const py = c.y + 0.5;
  const scale = cam.scale;

  const stash = cam.project(px + 1.15, py - 0.4);
  const m = mats(P.building.wood);
  const w = 0.62 * scale * stash.s;
  const d = 0.5 * scale * stash.s;
  const h = 0.52 * scale * stash.s * cam.V.vExag;
  drawSunShadow(ctx, cam, sun, px + 1.15, py - 0.4, 0.45, 0.6, 0.28);
  box25(cam.V, ctx, stash.x, stash.y - h, w, d, h, m);
  ctx.strokeStyle = "rgba(40,30,16,0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(stash.x - w * 0.18, stash.y - h * 0.72, w * 0.36, h * 0.4);
  ctx.fillStyle = "#3a3026";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(stash.x + side * w * 0.32, stash.y + 0.06 * scale * stash.s, 0.09 * scale * stash.s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = P.building.woodDark;
  ctx.lineWidth = Math.max(1.5, 0.05 * scale * stash.s);
  ctx.beginPath();
  ctx.moveTo(stash.x - w * 0.55, stash.y + 0.1 * scale * stash.s);
  ctx.lineTo(stash.x + w * 0.55, stash.y + 0.1 * scale * stash.s);
  ctx.stroke();

  const pile = Math.min(4, Math.ceil(state.stores.wood / 6));
  for (let i = 0; i < pile; i++) {
    const lp = cam.project(px + 1.15, py - 0.4 + 0.55);
    const ly = lp.y - i * 0.075 * cam.scale * stash.s;
    ctx.fillStyle = P.agent.log;
    ctx.fillRect(lp.x - w * 0.3, ly - 0.06 * cam.scale * stash.s, w * 0.6, 0.06 * cam.scale * stash.s);
    ctx.fillStyle = "rgba(255,240,200,0.14)";
    ctx.fillRect(lp.x - w * 0.3, ly - 0.06 * cam.scale * stash.s, w * 0.6, 0.02 * cam.scale * stash.s);
  }

  const fire = cam.project(px - 0.9, py + 0.55);
  const fr = 0.3 * scale * fire.s;
  drawSunShadow(ctx, cam, sun, px - 0.9, py + 0.55, 0.32, 0.12, 0.18);
  ctx.fillStyle = "#5c544a";
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(fire.x + Math.cos(a) * fr, fire.y + Math.sin(a) * fr * 0.55, fr * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = P.building.woodDark;
  ctx.lineWidth = 2.4 * fire.s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(fire.x - fr * 0.5, fire.y + fr * 0.15);
  ctx.lineTo(fire.x + fr * 0.5, fire.y - fr * 0.2);
  ctx.moveTo(fire.x + fr * 0.5, fire.y + fr * 0.15);
  ctx.lineTo(fire.x - fr * 0.5, fire.y - fr * 0.2);
  ctx.stroke();
  ctx.lineCap = "butt";

  const flick = 0.85 + Math.sin(t * 13) * 0.1 + Math.sin(t * 29 + 1.7) * 0.06;
  const fh = fr * 2.1 * flick;
  ctx.fillStyle = "#e8862f";
  ctx.beginPath();
  ctx.moveTo(fire.x, fire.y - fh);
  ctx.quadraticCurveTo(fire.x + fr * 0.5, fire.y - fh * 0.4, fire.x, fire.y + fr * 0.1);
  ctx.quadraticCurveTo(fire.x - fr * 0.5, fire.y - fh * 0.4, fire.x, fire.y - fh);
  ctx.fill();
  ctx.fillStyle = "#f7c04a";
  ctx.beginPath();
  ctx.moveTo(fire.x, fire.y - fh * 0.55);
  ctx.quadraticCurveTo(fire.x + fr * 0.26, fire.y - fh * 0.18, fire.x, fire.y + fr * 0.08);
  ctx.quadraticCurveTo(fire.x - fr * 0.26, fire.y - fh * 0.18, fire.x, fire.y - fh * 0.55);
  ctx.fill();
}

export function drawFireGlow(ctx, cam, P, state, darkness) {
  if (darkness <= 0.02) return;
  const c = state.camp;
  const fire = cam.project(c.x + 0.5 - 0.9, c.y + 0.5 + 0.55);
  const r = 2.1 * cam.scale * fire.s;
  const pulse = 0.8 + Math.sin(performance.now() / 320) * 0.08;
  const g = ctx.createRadialGradient(fire.x, fire.y, 4, fire.x, fire.y, r * pulse);
  g.addColorStop(0, withAlpha("#f0a050", 0.34 * darkness));
  g.addColorStop(0.5, withAlpha("#e8862f", 0.12 * darkness));
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(fire.x - r, fire.y - r, r * 2, r * 2);
}
