import { SEASONS } from "../sim/time.js";
import { clockLabel } from "../sim/time.js";

export function createHud(root) {
  root.innerHTML = `
    <div class="hud-top">
      <span class="date" id="hudDate">Spring, Day 1</span>
      <span class="clock" id="hudClock">07:12</span>
      <span class="sep"></span>
      <span class="store"><canvas id="hudWoodIcon" width="16" height="16"></canvas><span class="n" id="hudWood">0</span></span>
      <span class="store"><canvas id="hudFoodIcon" width="16" height="16"></canvas><span class="n" id="hudFood">0</span></span>
      <span class="store"><canvas id="hudStoneIcon" width="16" height="16"></canvas><span class="n" id="hudStone">0</span></span>
      <span class="sep"></span>
      <span class="store">carry <span class="n" id="hudCarry">0/6</span></span>
      <span class="sep"></span>
      <span class="store">souls <span class="n" id="hudPop">1</span></span>
    </div>
    <div class="hud-paused" id="hudPaused">PAUSED — P</div>
    <div class="hud-toast" id="hudToast"></div>
    <div class="hud-hint"><b>WASD</b> move · <b>SPACE</b> work nearest · <b>click</b> work a thing · <b>B/V</b> build · wheel zoom · drag free-cam · <b>1/2/3</b> speed · <b>P</b> pause</div>
  `;

  const el = (id) => root.querySelector("#" + id);
  const dateEl = el("hudDate");
  const clockEl = el("hudClock");
  const woodEl = el("hudWood");
  const foodEl = el("hudFood");
  const stoneEl = el("hudStone");
  const carryEl = el("hudCarry");
  const popEl = el("hudPop");
  const pausedEl = el("hudPaused");
  const toastEl = el("hudToast");

  function icon(id, paint) {
    const c = el(id);
    paint(c.getContext("2d"));
  }
  icon("hudWoodIcon", (g) => {
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
  icon("hudStoneIcon", (g) => {
    g.fillStyle = "#8d8578";
    g.beginPath();
    g.moveTo(3, 12);
    g.lineTo(5, 5);
    g.lineTo(11, 4);
    g.lineTo(13, 10);
    g.lineTo(10, 13);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,250,230,0.25)";
    g.beginPath();
    g.moveTo(5, 5);
    g.lineTo(11, 4);
    g.lineTo(8, 8);
    g.closePath();
    g.fill();
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
    update(state, founder) {
      setText(dateEl, "date", `${SEASONS[state.time.season]}, Day ${state.time.day}`);
      setText(clockEl, "clock", clockLabel(state.time.tod));
      setText(woodEl, "wood", String(state.stores.wood));
      setText(foodEl, "food", String(state.stores.food));
      setText(stoneEl, "stone", String(state.stores.stone));
      const tot = founder ? (founder.carry.wood ?? 0) + (founder.carry.food ?? 0) + (founder.carry.stone ?? 0) : 0;
      setText(carryEl, "carry", `${tot}/${founder?.carryMax ?? 6}`);
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
