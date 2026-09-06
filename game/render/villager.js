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

export function agentShadowSpec(x, y, anim, skin, unitWorld) {
  const key = `agent:${anim.moving ? 1 : 0}:${Math.floor(anim.phase * 12)}:${anim.action}:${Math.round((anim.swing || 0) * 6)}:${anim.carry > 0 ? 1 : 0}`;
  return {
    x,
    y,
    fp: 0.24,
    h: 0.68 * unitWorld,
    hMul: 1,
    key,
    alpha: 0.92,
    draw: (g, m) => {
      const p = m.project(x, y);
      drawAgent(g, p, anim, skin, m.V, m.scale * unitWorld, null);
    },
  };
}

export function villagerShadowSpec(P, v) {
  return agentShadowSpec(v.x, v.y, {
    moving: v.moving,
    phase: v.phase,
    dir: v.dir,
    action: v.action,
    swing: v.swing,
    carry: carryUnits(v.carry),
    flash: 0,
  }, makeVillagerSkin(P, v), KINDS[v.kind].scale);
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
    sun
  );
}
