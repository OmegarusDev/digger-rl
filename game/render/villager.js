import { drawAgent } from "../../forge/agents.js";
import { KINDS } from "../data/villagers.js";
import { carryUnits } from "../data/goods.js";

export function makeVillagerSkin(P, v) {
  const kind = KINDS[v.kind];
  return {
    tunic: kind.color,
    trim: kind.trim,
    hood: false,
    skin: P.agent.skin[1],
    hair: P.agent.hair[v.sex === "F" ? 1 : 0],
    pants: "#4a3a28",
    outline: P.agent.outline,
    tool: P.agent.tool,
    toolDark: P.agent.toolDark,
    log: P.agent.log,
  };
}

export function drawVillager(ctx, cam, P, v, sun) {
  const p = cam.project(v.x, v.y);
  const kind = KINDS[v.kind];
  const s = cam.scale * kind.scale * p.s;
  ctx.fillStyle = "rgba(16,18,10,0.28)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 0.24 * s, 0.24 * s * cam.V.deckRatio * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  drawAgent(
    ctx,
    p,
    {
      moving: v.moving,
      phase: v.phase,
      dir: v.dir,
      action: v.action,
      swing: v.swing,
      carry: carryUnits(v.carry),
      flash: 0,
    },
    makeVillagerSkin(P, v),
    cam.V,
    cam.scale * kind.scale,
    sun
  );
}
