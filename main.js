import { WorldCamera } from "./forge/camera.js";
import { SmoothTerrain } from "./forge/terrain.js";
import { FxSystem } from "./forge/fx.js";
import { Input } from "./forge/input.js";
import { GameLoop } from "./forge/loop.js";
import { makePalette } from "./forge/palette.js";
import { createSim } from "./game/sim/sim.js";
import { findFloraNear, findBuildingNear, carryTotal } from "./game/sim/founder.js";
import { canPlace, placeBuilding } from "./game/sim/state.js";
import { placeField, fieldTilesValid, FIELD_TILE_CAP } from "./game/sim/fields.js";
import { CROPS } from "./game/data/crops.js";
import { FIELD_PLACE } from "./game/data/buildings.js";
import { WORK_RANGE } from "./game/sim/founder.js";
import { inspectableAt } from "./game/sim/inspect.js";
import { unassign } from "./game/sim/jobs.js";
import { expandStorage } from "./game/sim/storage.js";
import { GOODS } from "./game/data/goods.js";
import { BUILDINGS } from "./game/data/buildings.js";
import { makeTerrainSampler } from "./game/render/terrainModel.js";
import { renderScene } from "./game/render/scene.js";
import { getShadowStats } from "./forge/shadows.js";
import { createHud } from "./game/ui/hud.js";
import { createBuildBar } from "./game/ui/buildbar.js";
import { createInfoPanel } from "./game/ui/panel.js";
import { createSplash } from "./game/ui/splash.js";
import { callVillager, bonfireUpgrade } from "./game/sim/camp.js";
import { buildBed } from "./game/sim/homes.js";

const params = new URLSearchParams(location.search);
const seedParam = Number(params.get("seed"));
const seed = Number.isFinite(seedParam) && seedParam > 0 ? seedParam : (Math.random() * 1e9) | 0;

const sim = createSim(seed);
const P = makePalette();
const canvas = document.getElementById("game");
const cam = new WorldCamera(canvas, {
  pitchDeg: 26,
  taper: 1,
  ppu: 44,
  zoom: 1.3,
  x: sim.state.camp.x + 0.5,
  y: sim.state.camp.y + 0.5,
  world: { minX: 0, minY: 0, maxX: sim.state.size, maxY: sim.state.size },
});

const terrain = new SmoothTerrain({
  sample: makeTerrainSampler(sim.state.valley, P, seed),
  worldSize: sim.state.size,
  masterStep: 0.1,
});

const fx = new FxSystem();
sim.state.bus.on("chop", (e) => {
  fx.emit("chips", e.x, e.y, { count: 4, color: P.fx.chip });
  if (Math.random() < 0.35) fx.emit("leafPuff", e.x, e.y, { count: 1 });
});
sim.state.bus.on("fell", (e) => {
  fx.emit("leafPuff", e.x, e.y, { count: 8 });
  cam.shake(2.2);
});
sim.state.bus.on("deposit", (e) => {
  fx.float(e.x, e.y - 0.5, `+${e.n}`, "#e9dfc6");
  fx.emit("pop", e.x, e.y, {});
});
sim.state.bus.on("build", (e) => fx.emit("dust", e.x, e.y - 0.2, { count: 3 }));
sim.state.bus.on("built", (e) => {
  fx.emit("dust", e.x, e.y, { count: 9 });
  fx.emit("pop", e.x, e.y, {});
  cam.shake(1.6);
});
sim.state.bus.on("saw", (e) => fx.emit("chips", e.x + 0.25, e.y - 0.35, { count: 3 }));
sim.state.bus.on("pickHit", (e) => fx.emit("leafPuff", e.x, e.y, { count: 3, color: "#b8452f" }));
sim.state.bus.on("mineHit", (e) => fx.emit("spark", e.x, e.y - 0.25, { count: 4, color: "#c8c2b4" }));
sim.state.bus.on("handsFull", (e) => fx.float(e.x, e.y - 0.6, "hands full", "#e9dfc6"));
sim.state.bus.on("hunt", (e) => fx.emit("pop", e.x, e.y, { color: "#8a3a2a" }));
sim.state.bus.on("trapSet", (e) => fx.emit("dust", e.x, e.y, { count: 4 }));
sim.state.bus.on("refined", (e) => fx.float(e.x, e.y - 0.6, `+${e.n} ${GOODS[e.good].name}`, "#e9dfc6"));
sim.state.bus.on("cropDied", (e) => hud.toast("The winter frost has killed the crop"));
sim.state.bus.on("field", (e) => fx.emit("dust", e.x, e.y, { count: 6 }));
sim.state.bus.on("sown", (e) => fx.emit("leafPuff", e.x, e.y, { count: 3, color: "#6f8c4c" }));
sim.state.bus.on("harvested", (e) => fx.emit("chips", e.x, e.y, { count: 4, color: "#c8a03c" }));
sim.state.bus.on("died", (e) => {
  hud.toast(`${e.name} has died`);
  fx.emit("pop", e.x, e.y, {});
});
sim.state.bus.on("joined", (e) => hud.toast(`${e.name} has joined the camp`));
sim.state.bus.on("bonfire", (e) => fx.emit("pop", e.x, e.y, {}));

const input = new Input(canvas);
const hud = createHud(document.getElementById("ui"), {
  onCamToggle: () => {
    follow = !follow;
    hud.toast(follow ? "Following the founder" : "Free camera — press F to follow again");
  },
  onSpeedCycle: () => setSpeed(speedIdx + 1),
});
const panel = createInfoPanel(document.getElementById("ui"), (act, arg) => {
  if (act === "callVillager") {
    const r = callVillager(sim.state);
    hud.toast(r.reason);
  } else if (act === "upgradeBonfire") {
    const r = bonfireUpgrade(sim.state);
    hud.toast(r.ok ? "The camp gathers closer — more hands at every worksite" : r.reason);
  } else if (act === "buildBed") {
    const b = sim.state.buildings.find((bb) => bb.id === Number(arg));
    if (b) {
      const r = buildBed(sim.state, b);
      hud.toast(r.ok ? `Bed built — ${b.beds} in the house` : r.reason);
    }
  } else if (act === "expandStorage") {
    const b = sim.state.buildings.find((bb) => bb.id === Number(arg));
    if (b) {
      const r = expandStorage(sim.state, b);
      hud.toast(r.ok ? `Storage expanded to level ${b.storageLvl}` : r.reason);
    }
  } else if (act === "sowSeed") {
    const [fId, seed] = arg.split(":");
    const field = sim.state.fields.find((ff) => ff.id === Number(fId));
    if (field) {
      if (!field.seed || field.stage === -1) {
        field.seed = seed;
        field.queuedSeed = null;
        hud.toast(`The field is sown with ${CROPS[seed].name}`);
      } else {
        field.queuedSeed = seed;
        hud.toast(`Will replant ${CROPS[seed].name} after the harvest`);
      }
    }
  } else if (act === "unassign") {
    const [bId, vId] = arg.split(":").map(Number);
    const b = sim.state.buildings.find((bb) => bb.id === bId);
    const v = sim.state.villagers.find((vv) => vv.id === vId);
    if (b && v) hud.toast(`${v.name} released from work`);
    if (b) unassign(sim.state, b, vId);
  }
}, { P });

let placing = null;
let fieldDrag = null;
let selected = null;
const buildbar = createBuildBar(document.getElementById("ui"), { ...BUILDINGS, field: FIELD_PLACE }, {
  onPick: (kindId) => {
    placing = kindId;
    const def = BUILDINGS[kindId] ?? FIELD_PLACE;
    hud.toast(`${def.name} — ${kindId === "field" ? "drag to till a plot" : "click a clear tile to place it, right-click to cancel"}`);
  },
  onCancel: () => {
    placing = null;
    fieldDrag = null;
  },
});

createSplash(document.getElementById("ui"), {
  seed,
  onBegin: () => hud.toast(`Valley seed ${seed} — WASD moves the founder, SPACE works the nearest thing`),
});

window.__game = {
  sim,
  cam,
  BUILDINGS,
  placeBuilding: (kind, x, y) => placeBuilding(sim.state, kind, x, y),
  setPlacing: (k) => {
    placing = k;
    buildbar.setActive(k);
  },
  get terrainDone() {
    return terrain.done;
  },
  lastError: null,
  _shadowSil: 0,
  _shadowBlob: 0,
  _frameMs: 0,
  get shadowStats() {
    return { silhouettes: window.__game._shadowSil, blobs: window.__game._shadowBlob };
  },
  get frameMs() {
    return window.__game._frameMs;
  },
};

let follow = true;
let t = 0;

const loop = new GameLoop({
  hz: 30,
  update: (step) => sim.tick(step),
  render: (dt) => frame(dt),
});

const SPEEDS = [1, 2, 4];
let speedIdx = 0;
function setSpeed(i) {
  speedIdx = ((i % SPEEDS.length) + SPEEDS.length) % SPEEDS.length;
  loop.speed = SPEEDS[speedIdx];
  hud.setSpeed(loop.speed);
}

function frame(dt) {
  try {
    frameInner(dt);
  } catch (e) {
    if (!window.__game.lastError) {
      const stack = (e.stack || "").split("\n").slice(1, 4).join(" | ");
      window.__game.lastError = `${e.message} @ ${stack}`;
      hud.toast(`Render error: ${e.message}`);
    }
  }
}

function frameInner(dt) {
  t += dt;
  if (!terrain.done) terrain.bakeChunk(64);
  const ctx = canvas.getContext("2d");
  const io = input.consumeOneShots();
  const f = sim.state.founder;

  for (const k of io.keys) {
    if (k === "KeyP") {
      loop.paused = !loop.paused;
      hud.setPaused(loop.paused);
    }     else if (k === "Digit1") setSpeed(0);
    else if (k === "Digit2") setSpeed(1);
    else if (k === "Digit3") setSpeed(2);
    else if (k === "KeyB") {
      placing = placing === "hut" ? null : "hut";
      buildbar.setActive(placing);
      if (placing) buildbar.open();
      else buildbar.close();
      if (placing === "hut") hud.toast("Woodcutter's Hut — click a clear tile, right-click to cancel");
    } else if (k === "KeyV") {
      placing = placing === "store" ? null : "store";
      buildbar.setActive(placing);
      if (placing) buildbar.open();
      else buildbar.close();
      if (placing === "store") hud.toast("Storehouse — click a clear tile, right-click to cancel");
    } else if (k === "KeyF") {
      follow = !follow;
      hud.toast(follow ? "Following the founder" : "Free camera — press F to follow again");
    } else if (k === "Space") {
      if (f.workLatch) {
        f.workLatch = false;
        f.workTarget = null;
      } else {
        f.workLatch = true;
      }
    } else if (k === "Escape" || k === "RightClick") {
      placing = null;
      fieldDrag = null;
      selected = null;
      buildbar.setActive(null);
      buildbar.close();
    } else if (k === "KeyR" && placing === "field") {
      placing = null;
      fieldDrag = null;
      buildbar.setActive(null);
    }
  }

  if (io.zoom.delta) {
    const z = cam.targetZoom * Math.exp(-io.zoom.delta * 0.0014);
    if (follow) cam.setZoom(z);
    else cam.zoomAt(io.zoom.x, io.zoom.y, z);
  }
  if (io.drag.moved) {
    cam.panBy(io.drag.dx, io.drag.dy);
    if (follow && !placing && Math.abs(io.drag.dx) + Math.abs(io.drag.dy) > 3) follow = false;
  }

  let mdx = 0;
  let mdy = 0;
  if (input.isDown("KeyA") || input.isDown("ArrowLeft")) mdx -= 1;
  if (input.isDown("KeyD") || input.isDown("ArrowRight")) mdx += 1;
  if (input.isDown("KeyW") || input.isDown("ArrowUp")) mdy -= 1;
  if (input.isDown("KeyS") || input.isDown("ArrowDown")) mdy += 1;
  f.cmd = { dx: mdx, dy: mdy };

  let ghost = null;
  let ghostField = null;
  let hoverItem = null;
  let hoverBuilding = null;
  if (input.mouseInside) {
    const hw = cam.screenToWorld(input.mouseX, input.mouseY);
    if (placing && placing !== "field") {
      const cx = Math.floor(hw.x);
      const cy = Math.floor(hw.y);
      const check = canPlace(sim.state, placing, cx + 0.5, cy + 0.5);
      ghost = { kind: placing, x: cx + 0.5, y: cy + 0.5, valid: check.ok, reason: check.reason };
    } else if (placing !== "field") {
      hoverItem = findFloraNear(sim.state, hw.x, hw.y, 0.8);
      hoverBuilding = findBuildingNear(sim.state, hw.x, hw.y, 0.5);
    }
  }

  if (placing === "field") {
    const origin = input.dragOrigin;
    if (origin && origin.button === 0 && !fieldDrag) {
      const w0 = cam.screenToWorld(origin.x, origin.y);
      fieldDrag = { ax: Math.floor(w0.x), ay: Math.floor(w0.y), tiles: null, reason: "" };
    }
    if (fieldDrag && input.mouseInside) {
      const hw = cam.screenToWorld(input.mouseX, input.mouseY);
      const tiles = rectTiles(fieldDrag.ax, fieldDrag.ay, Math.floor(hw.x), Math.floor(hw.y));
      const check = fieldTilesValid(sim.state, tiles);
      const afford = (sim.state.stores.log ?? 0) >= tiles.length;
      fieldDrag.tiles = tiles;
      fieldDrag.reason = afford ? check.reason : "Not enough logs";
      ghostField = { tiles, valid: check.ok && afford };
    }
  } else if (fieldDrag) {
    fieldDrag = null;
  }

  if (io.up && fieldDrag) {
    const tiles = fieldDrag.tiles ?? [];
    if (tiles.length) {
      const res = placeField(sim.state, tiles);
      hud.toast(res.ok ? `Field staked — ${tiles.length} tiles` : res.reason);
    }
    fieldDrag = null;
    ghostField = null;
  }

  if (io.click && io.click.button === 0) {
    const w = cam.screenToWorld(io.click.x, io.click.y);
    if (placing && placing !== "field") {
      const check = canPlace(sim.state, placing, w.x, w.y);
      if (check.ok) {
        placeBuilding(sim.state, placing, w.x, w.y);
        hud.toast(`${BUILDINGS[placing].name} site marked — work it to raise it`);
        placing = null;
        buildbar.setActive(null);
      } else {
        hud.toast(check.reason);
      }
    } else {
      const insp = inspectableAt(sim.state, w.x, w.y);
      selected = insp;
      if (insp && (insp.type === "flora" || insp.type === "building")) {
        const t = insp.type === "flora" ? sim.state.flora[insp.id] : sim.state.buildings.find((bb) => bb.id === insp.id);
        const d = Math.hypot(t.x - f.x, t.y - f.y);
        if (d <= WORK_RANGE + 0.15) {
          f.workLatch = false;
          f.workTarget = insp.type === "flora" ? { type: "flora", id: insp.id } : { type: "building", id: insp.id, x: t.x, y: t.y };
        } else {
          hud.toast("Out of reach — walk closer");
        }
      }
    }
  }

  if (follow && !(placing && input.dragging)) cam.follow(f.x, f.y);
  cam.tick(dt);
  const frameStart = performance.now();
  cam.clear(ctx, "#0f130a");
  renderScene(ctx, cam, P, sim, fx, t, (c, m) => terrain.render(c, m), { hoverItem, hoverBuilding, ghost, ghostField, selected });
  const ss = getShadowStats();
  window.__game._shadowSil = ss.silhouettes;
  window.__game._shadowBlob = ss.blobs;
  window.__game._frameMs = (performance.now() - frameStart).toFixed(1);
  canvas.classList.toggle("placing", !!placing);
  buildbar.refresh(sim.state.stores);
  panel.update(sim.state, placing ? { type: "placing", kind: placing } : selected, f);
  hud.update(sim.state, f, follow);
}

function rectTiles(ax, ay, bx, by) {
  const x0 = Math.min(ax, bx);
  const y0 = Math.min(ay, by);
  let w = Math.abs(bx - ax) + 1;
  let h = Math.abs(by - ay) + 1;
  if (w > FIELD_TILE_CAP) w = FIELD_TILE_CAP;
  if (w * h > FIELD_TILE_CAP) h = Math.max(1, Math.floor(FIELD_TILE_CAP / w));
  const tiles = [];
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) tiles.push({ x, y });
  }
  return tiles;
}

loop.start();
