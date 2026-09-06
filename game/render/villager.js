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

export function villagerShadowSpec(P, v) {
  let s = v._ss;
  if (!s) {
    const skin = makeVillagerSkin(P, v);
    const unitW = KINDS[v.kind].scale;
    s = {
      x: v.x,
      y: v.y,
      fp: 0.24,
      h: 0.68 * unitW,
      hMul: 1,
      alpha: 0.92,
      key: "",
      draw: (g, m) => {
        const p = m.project(v.x, v.y);
        drawAgent(g, p, { moving: v.moving, phase: v.phase, dir: v.dir, action: v.action, swing: v.swing, carry: carryUnits(v.carry), flash: 0 }, skin, m.V, m.scale * unitW, null);
      },
    };
    v._ss = s;
  }
  s.key = `a:${v.moving ? 1 : 0}:${Math.floor(v.phase * 8)}:${v.action}:${Math.round((v.swing || 0) * 4)}:${carryUnits(v.carry) > 0 ? 1 : 0}`;
  s.x = v.x;
  s.y = v.y;
  return s;
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
