import { WorldCamera } from "./forge/camera.js";
import { SmoothTerrain } from "./forge/terrain.js";
import { FxSystem } from "./forge/fx.js";
import { Input } from "./forge/input.js";
import { GameLoop } from "./forge/loop.js";
import { makePalette } from "./forge/palette.js";
import { createSim } from "./game/sim/sim.js";
import { findFloraNear, findBuildingNear, carryTotal } from "./game/sim/founder.js";
import { canPlace, placeBuilding } from "./game/sim/state.js";
import { WORK_RANGE } from "./game/sim/founder.js";
import { inspectableAt } from "./game/sim/inspect.js";
import { BUILDINGS } from "./game/data/buildings.js";
import { makeTerrainSampler } from "./game/render/terrainModel.js";
import { renderScene } from "./game/render/scene.js";
import { createHud } from "./game/ui/hud.js";
import { createBuildBar } from "./game/ui/buildbar.js";
import { createInfoPanel } from "./game/ui/panel.js";
import { createSplash } from "./game/ui/splash.js";

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

const input = new Input(canvas);
const hud = createHud(document.getElementById("ui"));
const panel = createInfoPanel(document.getElementById("ui"));

let placing = null;
let selected = null;
const buildbar = createBuildBar(document.getElementById("ui"), BUILDINGS, {
  onPick: (kindId) => {
    placing = kindId;
    hud.toast(`${BUILDINGS[kindId].name} — click a clear tile to place it, right-click to cancel`);
  },
  onCancel: () => {
    placing = null;
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
};

let follow = true;
let t = 0;

const loop = new GameLoop({
  hz: 30,
  update: (step) => sim.tick(step),
  render: (dt) => frame(dt),
});

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
    } else if (k === "Digit1") loop.speed = 1;
    else if (k === "Digit2") loop.speed = 2;
    else if (k === "Digit3") loop.speed = 4;
    else if (k === "KeyB") {
      placing = placing === "hut" ? null : "hut";
      buildbar.setActive(placing);
      if (placing) buildbar.open();
      else buildbar.close();
      cam._anchor = null;
      if (placing === "hut") hud.toast("Woodcutter's Hut — click a clear tile, right-click to cancel");
    } else if (k === "KeyV") {
      placing = placing === "store" ? null : "store";
      buildbar.setActive(placing);
      if (placing) buildbar.open();
      else buildbar.close();
      cam._anchor = null;
      if (placing === "store") hud.toast("Storehouse — click a clear tile, right-click to cancel");
    } else if (k === "KeyF") {
      follow = !follow;
      hud.toast(follow ? "Following the founder" : "Free camera");
    } else if (k === "Space") {
      if (f.workLatch) {
        f.workLatch = false;
        f.workTarget = null;
      } else {
        f.workLatch = true;
      }
    } else if (k === "Escape" || k === "RightClick") {
      placing = null;
      selected = null;
      buildbar.setActive(null);
      buildbar.close();
    }
  }

  if (io.zoom.delta) {
    const z = cam.targetZoom * Math.exp(-io.zoom.delta * 0.0014);
    if (follow) cam.setZoom(z);
    else cam.zoomAt(io.zoom.x, io.zoom.y, z);
  }
  if (io.drag.moved) {
    cam.panBy(io.drag.dx, io.drag.dy);
    if (follow && Math.abs(io.drag.dx) + Math.abs(io.drag.dy) > 3) follow = false;
  }

  let mdx = 0;
  let mdy = 0;
  if (input.isDown("KeyA") || input.isDown("ArrowLeft")) mdx -= 1;
  if (input.isDown("KeyD") || input.isDown("ArrowRight")) mdx += 1;
  if (input.isDown("KeyW") || input.isDown("ArrowUp")) mdy -= 1;
  if (input.isDown("KeyS") || input.isDown("ArrowDown")) mdy += 1;
  f.cmd = { dx: mdx, dy: mdy };

  let ghost = null;
  let hoverItem = null;
  let hoverBuilding = null;
  if (input.mouseInside) {
    const hw = cam.screenToWorld(input.mouseX, input.mouseY);
    if (placing) {
      const cx = Math.floor(hw.x);
      const cy = Math.floor(hw.y);
      const check = canPlace(sim.state, placing, cx + 0.5, cy + 0.5);
      ghost = { kind: placing, x: cx + 0.5, y: cy + 0.5, valid: check.ok, reason: check.reason };
    } else {
      hoverItem = findFloraNear(sim.state, hw.x, hw.y, 0.8);
      hoverBuilding = findBuildingNear(sim.state, hw.x, hw.y, 0.5);
    }
  }

  if (io.click && io.click.button === 0) {
    const w = cam.screenToWorld(io.click.x, io.click.y);
    if (placing) {
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
        const t = insp.type === "flora" ? state.flora[insp.id] : state.buildings.find((bb) => bb.id === insp.id);
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

  if (follow) cam.follow(f.x, f.y);
  cam.tick(dt);
  cam.clear(ctx, "#0f130a");
  renderScene(ctx, cam, P, sim, fx, t, (c, m) => terrain.render(c, m), { hoverItem, hoverBuilding, ghost });
  buildbar.refresh(sim.state.stores);
  panel.update(sim.state, selected, f);
  hud.update(sim.state, f);
}

loop.start();
