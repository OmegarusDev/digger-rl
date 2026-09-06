import { drawAgent } from "../../forge/agents.js";
import { KINDS } from "../data/villagers.js";
import { carryUnits } from "../data/goods.js";
import { settings } from "../settings.js";

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
    sun,
    settings.shadows
  );
}
