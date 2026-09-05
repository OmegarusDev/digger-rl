import assert from "node:assert/strict";
import { createSim } from "../../game/sim/sim.js";
import { canPlace, placeBuilding } from "../../game/sim/state.js";
import { isWalkable, pathTo } from "../../game/sim/grid.js";
import { createVillager } from "../../game/sim/villager.js";
import { expandStorage, capOf } from "../../game/sim/storage.js";

function run(sim, seconds) {
  const step = 1 / 30;
  const n = Math.round(seconds * 30);
  for (let i = 0; i < n; i++) sim.tick(step);
}

function findSpotNearPoint(sim, kindId, px, py, maxR = 8) {
  const state = sim.state;
  const n = state.size;
  const cands = [];
  for (let r = 2; r < maxR; r++) {
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const cx = Math.floor(px + Math.cos(ang) * r);
      const cy = Math.floor(py + Math.sin(ang) * r);
      if (!isWalkable(state, cx, cy)) continue;
      if (!canPlace(state, kindId, cx + 0.5, cy + 0.5).ok) continue;
      cands.push({ cx, cy });
    }
  }
  cands.sort(
    (p, q) =>
      Math.hypot(p.cx - state.founder.x, p.cy - state.founder.y) - Math.hypot(q.cx - state.founder.x, q.cy - state.founder.y)
  );
  const sx = Math.floor(px);
  const sy = Math.floor(py);
  for (const c of cands) {
    const k = c.cy * n + c.cx;
    state.walk[k] = 0;
    const stillConnected = pathTo(state, sx + 0.5, sy + 0.5, state.founder.x, state.founder.y);
    state.walk[k] = 1;
    if (stillConnected) return { x: c.cx + 0.5, y: c.cy + 0.5 };
  }
  return null;
}

function buildAt(sim, kindId, stores, px, py) {
  const state = sim.state;
  Object.assign(state.stores, stores);
  const spot = px == null ? findSpotNearPoint(sim, kindId, state.founder.x, state.founder.y) : findSpotNearPoint(sim, kindId, px, py);
  assert.ok(spot, `${kindId} spot found`);
  const res = placeBuilding(state, kindId, spot.x, spot.y);
  assert.ok(res.ok, `${kindId} placed (${res.reason})`);
  res.building.state = "built";
  return res.building;
}

function addVillager(sim, kind, x, y) {
  const v = createVillager(sim.state, kind, x, y);
  sim.state.villagers.push(v);
  return v;
}

{
  const sim = createSim(777);
  const state = sim.state;
  const depositRocks = state.flora.filter(
    (f) => f.kind === "rock" && f.hp >= 20 && Math.hypot(f.x - (state.camp.x + 0.5), f.y - (state.camp.y + 0.5)) < 8
  );
  assert.ok(depositRocks.length >= 3, `quarry deposit rocks near camp (${depositRocks.length})`);
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  const yard = buildYardAtForestEdge(sim);
  assert.ok(yard, "a forest-edge yard spot with a reachable tree exists");
  assert.ok(yard.storageLvl === 0, "storage level starts at 0");
  run(sim, 3);
  const worker = state.villagers.find((v) => v.workplace?.id === yard.id);
  assert.ok(worker, "lumberjack assigned to the yard");
  run(sim, 240);
  assert.ok((yard.storage.log ?? 0) > 0 || (yard.storage.lumber ?? 0) > 0, `yard processes logs (${JSON.stringify(yard.storage)})`);
  assert.ok((yard.storage.log ?? 0) <= capOf(yard, "log"), "log storage respects caps");
  yard.storage.lumber = 6;
  run(sim, 120);
  assert.ok(state.stores.lumber >= 4, `yard hauls lumber to communal stores (${state.stores.lumber})`);
}

function buildYardAtForestEdge(sim) {
  const state = sim.state;
  const n = state.size;
  const f = state.founder;
  state.stores.log = Math.max(state.stores.log, 80);
  for (let r = 2; r < 16; r++) {
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const cx = Math.floor(f.x + Math.cos(ang) * r);
      const cy = Math.floor(f.y + Math.sin(ang) * r);
      if (!isWalkable(state, cx, cy)) continue;
      if (!canPlace(state, "lumberYard", cx + 0.5, cy + 0.5).ok) continue;
      const k = cy * n + cx;
      state.walk[k] = 0;
      let tree = null;
      for (const item of state.flora) {
        if (item.kind !== "tree" || item.state !== "alive") continue;
        if (Math.hypot(item.x - (cx + 0.5), item.y - (cy + 0.5)) > 9) continue;
        if (pathTo(state, cx + 0.5, cy + 0.5, item.x, item.y)) {
          tree = item;
          break;
        }
      }
      state.walk[k] = 1;
      if (!tree) continue;
      Object.assign(state.stores, { log: 80 });
      const res = placeBuilding(state, "lumberYard", cx + 0.5, cy + 0.5);
      if (!res.ok) continue;
      res.building.state = "built";
      return res.building;
    }
  }
  return null;
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  const rock = state.flora
    .filter((f) => f.kind === "rock" && f.hp >= 20 && pathTo(state, state.founder.x, state.founder.y, f.x, f.y))
    .sort((a, b) => Math.hypot(a.x - state.founder.x, a.y - state.founder.y) - Math.hypot(b.x - state.founder.x, b.y - state.founder.y))[0];
  assert.ok(rock, "a reachable deposit rock exists");
  const mine = buildAt(sim, "minersHut", { log: 80 }, rock.x, rock.y);
  run(sim, 3);
  assert.ok(state.villagers.some((v) => v.workplace?.id === mine.id), "miner assigned");
  run(sim, 300);
  assert.ok((mine.storage.rawStone ?? 0) > 0 || (mine.storage.stoneBlock ?? 0) > 0, `miner quarries rock (${JSON.stringify(mine.storage)})`);
  assert.ok(state.stores.stoneBlock > 0, `stone blocks reach communal stores (${state.stores.stoneBlock})`);
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  const hut = buildAt(sim, "gatherersHut", { log: 80 });
  let bx = null;
  outer: for (let r = 1; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const cx = Math.floor(hut.x) + dx;
        const cy = Math.floor(hut.y) + dy;
        if (isWalkable(state, cx, cy)) {
          bx = { x: cx, y: cy };
          break outer;
        }
      }
    }
  }
  assert.ok(bx, "walkable cell near hut found");
  state.flora.push({
    id: state.flora.length,
    kind: "berry",
    x: bx.x + 0.5,
    y: bx.y + 0.5,
    species: null,
    variant: 0,
    scale: 0.95,
    hp: 2,
    maxHp: 2,
    state: "alive",
    fallT: 0,
    shakeT: 0,
    regrowT: 0,
  });
  state.villagers.forEach((v) => (v.x = hut.x + 1));
  run(sim, 120);
  assert.ok((hut.storage.food ?? 0) > 0 || state.stores.food > 0, `gatherer brings berries in (${JSON.stringify(hut.storage)})`);
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 60);
  assert.ok(state.fauna.deer.length >= 1, `deer roam the forest (${state.fauna.deer.length})`);
  assert.ok(state.fauna.deer.length <= state.fauna.cap, "deer population respects its cap");
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  state.stores.log = 80;
  state.stores.lumber = 40;
  const lodge = buildAt(sim, "huntersLodge", { log: 80, lumber: 40 });
  run(sim, 200);
  const traps = state.fauna.traps.filter((t) => t.lodgeId === lodge.id);
  assert.ok(traps.length >= 1, "hunter set at least one trap");
  assert.ok(state.villagers.some((v) => v.workplace?.id === lodge.id), "hunter assigned");
  run(sim, 400);
  const food = (lodge.storage.food ?? 0) + state.stores.food;
  assert.ok(food > 0, `lodge brings in meat (${JSON.stringify(lodge.storage)} + camp ${state.stores.food})`);
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  const yard = buildAt(sim, "lumberYard", { log: 80 });
  yard.storage.log = 4;
  const f = state.founder;
  f.x = yard.x + 0.6;
  f.y = yard.y + 0.7;
  f.workLatch = true;
  f.workTarget = { type: "building", id: yard.id, x: yard.x, y: yard.y };
  run(sim, 8);
  const lumberSomewhere = (yard.storage.lumber ?? 0) + (f.carry.lumber ?? 0);
  assert.ok(lumberSomewhere >= 1 && (yard.storage.log ?? 0) < 4, `founder refines logs into lumber (storage ${JSON.stringify(yard.storage)} carry ${f.carry.lumber ?? 0})`);
  f.workLatch = false;
  f.workTarget = null;
}

{
  const sim = createSim(777);
  const state = sim.state;
  run(sim, 1);
  const yard = buildAt(sim, "lumberYard", { log: 80, lumber: 20 });
  const cap0 = capOf(yard, "log");
  const r = expandStorage(state, yard);
  assert.ok(r.ok, `expand storage (${r.reason})`);
  assert.equal(yard.storageLvl, 1, "storage level raised");
  assert.ok(capOf(yard, "log") > cap0, "caps grow with level");
  state.stores.lumber = 0;
  const blocked = expandStorage(state, yard);
  assert.ok(!blocked.ok, "cannot expand without paying");
}

console.log("workplaces.test OK");
