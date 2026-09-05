import { buildingById } from "./state.js";
import { releaseTask } from "./work/common.js";
import * as sawyer from "./work/sawyer.js";
import * as yard from "./work/yard.js";
import * as mine from "./work/mine.js";
import * as gather from "./work/gather.js";
import * as fish from "./work/fish.js";
import * as hunt from "./work/hunt.js";

const HANDLERS = { sawyer, lumberjack: yard, miner: mine, gatherer: gather, fisher: fish, hunter: hunt };

export function workTick(state, v, dt) {
  const b = buildingById(state, v.workplace.id);
  if (!b || b.state !== "built") {
    releaseTask(state, v);
    v.task = null;
    v.workplace = null;
    return false;
  }
  const h = HANDLERS[v.workplace.job];
  if (!h) return false;
  if (!v.task) v.task = h.scan(state, v, b);
  if (!v.task) return false;
  if (h.run(state, v, b, v.task, dt)) return true;
  releaseTask(state, v);
  v.task = null;
  return false;
}
