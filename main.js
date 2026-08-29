import { WorldCamera } from "./forge/camera.js";
import { SmoothTerrain } from "./forge/terrain.js";
import { FxSystem } from "./forge/fx.js";
import { Input } from "./forge/input.js";
import { GameLoop } from "./forge/loop.js";
import { makePalette } from "./forge/palette.js";
import { createSim } from "./game/sim/sim.js";
import { makeTerrainSampler } from "./game/render/terrainModel.js";
import { renderScene } from "./game/render/scene.js";
import { createHud } from "./game/ui/hud.js";
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
  step: 0.4,
  light: P.fx.light,
  dark: P.fx.dark,
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
  fx.float(e.x, e.y - 0.5, `+${e.n} wood`, "#e9dfc6");
  fx.emit("pop", e.x, e.y, {});
});

const input = new Input(canvas);
const hud = createHud(document.getElementById("ui"));
createSplash(document.getElementById("ui"), {
  seed,
  onBegin: () => hud.toast(`Valley seed ${seed} — click to send the founder, F toggles follow`),
});

let follow = true;
let t = 0;

const loop = new GameLoop({
  hz: 30,
  update: (step) => sim.tick(step),
  render: (dt) => frame(dt),
});

function frame(dt) {
  t += dt;
  const ctx = canvas.getContext("2d");
  const io = input.consumeOneShots();

  for (const k of io.keys) {
    if (k === "Space") {
      loop.paused = !loop.paused;
      hud.setPaused(loop.paused);
    } else if (k === "Digit1") loop.speed = 1;
    else if (k === "Digit2") loop.speed = 2;
    else if (k === "Digit3") loop.speed = 4;
    else if (k === "KeyF") {
      follow = !follow;
      hud.toast(follow ? "Following the founder" : "Free camera");
    }
  }

  if (io.zoom.delta) {
    cam.zoomAt(io.zoom.x, io.zoom.y, cam.targetZoom * Math.exp(-io.zoom.delta * 0.0014));
  }
  if (io.drag.moved) {
    cam.panBy(io.drag.dx, io.drag.dy);
    if (follow && Math.abs(io.drag.dx) + Math.abs(io.drag.dy) > 3) follow = false;
  }
  const pan = 560 * dt;
  let pdx = 0;
  let pdy = 0;
  if (input.isDown("KeyA") || input.isDown("ArrowLeft")) pdx -= 1;
  if (input.isDown("KeyD") || input.isDown("ArrowRight")) pdx += 1;
  if (input.isDown("KeyW") || input.isDown("ArrowUp")) pdy -= 1;
  if (input.isDown("KeyS") || input.isDown("ArrowDown")) pdy += 1;
  if (pdx || pdy) {
    cam.panBy(-pdx * pan, -pdy * pan);
    follow = false;
  }
  if (io.click && io.click.button === 0) {
    const w = cam.screenToWorld(io.click.x, io.click.y);
    sim.state.founder.manualTarget = { x: w.x, y: w.y };
  }

  if (follow) cam.follow(sim.state.founder.x, sim.state.founder.y);
  cam.tick(dt);

  cam.clear(ctx, "#0f130a");
  renderScene(ctx, cam, P, sim, fx, t, (c, m) => terrain.render(c, m));
  hud.update(sim.state);
}

loop.start();
