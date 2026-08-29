import { SEASONS } from "../sim/time.js";
import { clockLabel } from "../sim/time.js";

export function createHud(root) {
  root.innerHTML = `
    <div class="hud-top">
      <span class="date" id="hudDate">Spring, Day 1</span>
      <span class="clock" id="hudClock">07:12</span>
      <span class="sep"></span>
      <span class="store"><canvas id="hudWoodIcon" width="16" height="16"></canvas><span class="n" id="hudWood">0</span></span>
      <span class="store">carry <span class="n" id="hudCarry">0/6</span></span>
      <span class="sep"></span>
      <span class="store">souls <span class="n" id="hudPop">1</span></span>
    </div>
    <div class="hud-paused" id="hudPaused">PAUSED — P</div>
    <div class="hud-toast" id="hudToast"></div>
    <div class="hud-hint"><b>WASD</b> move · <b>SPACE</b> work nearest · <b>click</b> a tree to chop · wheel zoom · drag free-cam · <b>P</b> pause · <b>1/2/3</b> speed</div>
  `;

  const el = (id) => root.querySelector("#" + id);
  const dateEl = el("hudDate");
  const clockEl = el("hudClock");
  const woodEl = el("hudWood");
  const carryEl = el("hudCarry");
  const popEl = el("hudPop");
  const pausedEl = el("hudPaused");
  const toastEl = el("hudToast");

  const icon = el("hudWoodIcon");
  const g = icon.getContext("2d");
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

  let toastTimer = 0;
  let last = {};

  function setText(elx, key, val) {
    if (last[key] !== val) {
      last[key] = val;
      elx.textContent = val;
    }
  }

  return {
    update(state) {
      setText(dateEl, "date", `${SEASONS[state.time.season]}, Day ${state.time.day}`);
      setText(clockEl, "clock", clockLabel(state.time.tod));
      setText(woodEl, "wood", String(state.stores.wood));
      const f = state.founder;
      setText(carryEl, "carry", f ? `${f.carry}/${f.carryMax}` : "0");
      setText(popEl, "pop", String(1 + state.villagers.length));
    },
    setPaused(on) {
      pausedEl.classList.toggle("on", on);
    },
    toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add("on");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove("on"), 2400);
    },
  };
}
