import { SEASONS } from "../sim/time.js";
import { clockLabel } from "../sim/time.js";
import { carryUnits } from "../data/goods.js";

export function createHud(root, opts = {}) {
  root.innerHTML = `
    <div class="hud-top">
      <span class="date" id="hudDate">Spring, Day 1</span>
      <span class="clock" id="hudClock">07:12</span>
      <span class="sep"></span>
      <span class="store"><canvas id="hudFoodIcon" width="16" height="16"></canvas><span class="n" id="hudFood">0</span></span>
      <span class="store"><canvas id="hudLogIcon" width="16" height="16"></canvas><span class="n" id="hudLog">0</span></span>
      <span class="store"><canvas id="hudLumberIcon" width="16" height="16"></canvas><span class="n" id="hudLumber">0</span></span>
      <span class="store"><canvas id="hudBlockIcon" width="16" height="16"></canvas><span class="n" id="hudBlock">0</span></span>
      <span class="sep"></span>
      <span class="store">carry <span class="n" id="hudCarry">0/6</span></span>
      <span class="sep"></span>
      <span class="store">souls <span class="n" id="hudPop">1</span></span>
      <span class="sep"></span>
      <button class="cam-chip" id="hudCam" title="Camera: follow / free (F)">◎ follow</button>
      <span class="sep"></span>
      <button class="cam-chip speed-chip" id="hudSpeed" title="Game speed — 1/2/3">×1</button>
    </div>
    <div class="hud-paused" id="hudPaused">PAUSED — P</div>
    <div class="hud-toast" id="hudToast"></div>
    <div class="hud-hint"><b>WASD</b> move · <b>SPACE</b> work what's in reach · <b>click</b> work a thing · <b>B/V</b> build · <b>F</b> follow/free-cam · drag free-cam · wheel zoom · <b>1/2/3</b> speed · <b>P</b> pause</div>
  `;

  const el = (id) => root.querySelector("#" + id);
  const dateEl = el("hudDate");
  const clockEl = el("hudClock");
  const logEl = el("hudLog");
  const foodEl = el("hudFood");
  const lumberEl = el("hudLumber");
  const blockEl = el("hudBlock");
  const carryEl = el("hudCarry");
  const popEl = el("hudPop");
  const camEl = el("hudCam");
  const speedEl = el("hudSpeed");
  const pausedEl = el("hudPaused");
  const toastEl = el("hudToast");

  camEl.addEventListener("click", (e) => {
    e.stopPropagation();
    opts.onCamToggle?.();
  });

  speedEl.addEventListener("click", (e) => {
    e.stopPropagation();
    opts.onSpeedCycle?.();
  });

  function icon(id, paint) {
    const c = el(id);
    paint(c.getContext("2d"));
  }
  icon("hudLogIcon", (g) => {
    g.fillStyle = "#7a5c3a";
    g.fillRect(2, 5, 12, 6);
    g.fillStyle = "#a88a5a";
    g.beginPath();
    g.ellipse(13.4, 8, 1.8, 3, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#6a4c2a";
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(13.4, 8, 0.8, 1.4, 0, 0, Math.PI * 2);
    g.stroke();
  });
  icon("hudFoodIcon", (g) => {
    g.fillStyle = "#4c6c3e";
    g.beginPath();
    g.arc(8, 9, 5.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#b8452f";
    for (const [x, y] of [[6, 7], [10, 8], [8, 11], [6.5, 10.5]]) {
      g.beginPath();
      g.arc(x, y, 1.4, 0, Math.PI * 2);
      g.fill();
    }
  });
  icon("hudLumberIcon", (g) => {
    g.fillStyle = "#b0934a";
    g.fillRect(3, 4, 10, 4);
    g.fillStyle = "#8a7136";
    g.fillRect(3, 4, 10, 1);
    g.fillStyle = "#c2a55e";
    g.fillRect(3, 9, 10, 4);
    g.fillStyle = "#8a7136";
    g.fillRect(3, 9, 10, 1);
  });
  icon("hudBlockIcon", (g) => {
    g.fillStyle = "#9a9284";
    g.fillRect(3, 6, 10, 7);
    g.fillStyle = "#b8b0a0";
    g.fillRect(3, 6, 10, 2);
    g.fillStyle = "#6e675c";
    g.fillRect(3, 11, 10, 2);
  });

  let toastTimer = 0;
  let last = {};

  function setText(elx, key, val) {
    if (last[key] !== val) {
      last[key] = val;
      elx.textContent = val;
    }
  }

  return {
    update(state, founder, follow) {
      setText(dateEl, "date", `${SEASONS[state.time.season]}, Day ${state.time.day}`);
      setText(clockEl, "clock", clockLabel(state.time.tod));
      setText(logEl, "log", String(state.stores.log));
      setText(foodEl, "food", String(state.stores.food));
      foodEl.classList.toggle("zero", state.stores.food === 0);
      setText(lumberEl, "lumber", String(state.stores.lumber));
      setText(blockEl, "block", String(state.stores.stoneBlock));
      const tot = founder ? carryUnits(founder.carry) : 0;
      setText(carryEl, "carry", `${tot}/${founder?.carryMax ?? 6}`);
      setText(popEl, "pop", String(1 + state.villagers.length));
      const camLabel = follow ? "◎ follow" : "✥ free";
      if (last.cam !== camLabel) {
        last.cam = camLabel;
        camEl.textContent = camLabel;
        camEl.classList.toggle("free", !follow);
      }
    },
    setPaused(on) {
      pausedEl.classList.toggle("on", on);
    },
    setSpeed(n) {
      const label = `×${n}`;
      if (last.speed === label) return;
      last.speed = label;
      speedEl.textContent = label;
    },
    toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add("on");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove("on"), 2400);
    },
  };
}
