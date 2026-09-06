import { carryUnits, GOODS } from "../data/goods.js";
import { KINDS, PROFESSIONS } from "../data/villagers.js";
import { hungerState, professionLabel } from "../sim/villager.js";
import { slotCap } from "../sim/jobs.js";
import { usedBeds } from "../sim/homes.js";
import { BUILDINGS, SITE_POSTS, FIELD_PLACE } from "../data/buildings.js";
import { storageCount, capOf } from "../sim/storage.js";
import { BONFIRE_UPGRADES } from "../sim/camp.js";
import { CROPS } from "../data/crops.js";
import { fieldStatusLabel } from "../sim/fields.js";
import { drawVisual } from "../../forge/visuals.js";
import { makeView25 } from "../../forge/view25.js";
import { drawAgent } from "../../forge/agents.js";
import { floraVisual } from "../render/flora.js";
import { makeVillagerSkin } from "../render/villager.js";
import { makeFounderSkin } from "../render/camp.js";

const PV = makeView25({ pitchDeg: 26 });

const WAGON_VISUAL = [
  ["box", { w: 0.5, d: 0.4, h: 0.38, top: "woodHi", side: "wood", dark: "woodDark" }],
  ["box", { y: 0.38, w: 0.2, d: 0.24, h: 0.12, top: "canvasHi", side: "canvas", dark: "canvasDark" }],
];

const DESC = {
  founder: "You are the founder of this little commonwealth. Walk with WASD; SPACE or a click works whatever is in reach.",
  villager: "A soul of the commonwealth — rests by night, works a trade by day, and eats from the commons at dawn.",
  wagon: "The founding wagon, still holding the first stores. Anyone carrying goods may deposit here.",
  fire: "The heart of the camp. Call new souls to the valley, and gather more hands per trade.",
  field: "A tilled plot. Sow a crop and the barn's farmers will tend, water and harvest it.",
};

function floraDesc(item) {
  if (item.state === "stump") return "Cut down to the stump — given time, it will grow back.";
  if (item.kind === "tree") return "Standing timber. Chop it for logs — SPACE in reach, or click it.";
  if (item.kind === "rock") return "A boulder of good stone. Mine it for raw stone to square into blocks.";
  if (item.kind === "berry" && item.state === "picked") return "Picked clean — the bush will ripen again.";
  if (item.kind === "berry") return "A ripe berry bush. Pick it for food.";
  return "A common shrub. Good cover for rabbits, little else.";
}

export function createInfoPanel(root, onAction, { P } = {}) {
  const el = document.createElement("div");
  el.className = "info-panel";
  el.id = "infoPanel";
  el.innerHTML = `
    <div class="info-head">
      <canvas id="ipPrev" width="56" height="50"></canvas>
      <div class="info-title" id="ipTitle"></div>
    </div>
    <div class="info-desc" id="ipDesc"></div>
    <div class="info-rows" id="ipRows"></div>
    <div class="info-actions" id="ipActions"></div>
    <div class="info-bar" id="ipBarWrap"><div class="info-bar-fill" id="ipBar"></div></div>
  `;
  root.appendChild(el);

  const titleEl = el.querySelector("#ipTitle");
  const rowsEl = el.querySelector("#ipRows");
  const actionsEl = el.querySelector("#ipActions");
  const descEl = el.querySelector("#ipDesc");
  const barWrap = el.querySelector("#ipBarWrap");
  const bar = el.querySelector("#ipBar");
  const prevCnv = el.querySelector("#ipPrev");
  const pctx = prevCnv.getContext("2d");
  let lastRows = "";
  let lastActs = "";
  let lastDesc = "";
  let lastPrev = "";

  actionsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    onAction?.(btn.dataset.act, btn.dataset.arg);
  });

  function setRows(lines) {
    const key = lines.join("|");
    if (key === lastRows) return;
    lastRows = key;
    rowsEl.innerHTML = lines
      .map(([k, v]) => `<div class="info-row"><span>${k}</span><b>${v}</b></div>`)
      .join("");
  }

  function setActions(acts) {
    const key = acts.map((a) => `${a.act}:${a.arg ?? ""}:${a.label}`).join("|");
    if (key === lastActs) return;
    lastActs = key;
    actionsEl.innerHTML = acts
      .map((a) => `<button class="info-btn" data-act="${a.act}" data-arg="${a.arg ?? ""}">${a.label}</button>`)
      .join("");
  }

  function setDesc(text) {
    if (text === lastDesc) return;
    lastDesc = text;
    descEl.textContent = text;
    descEl.style.display = text ? "block" : "none";
  }

  function setPreview(key, paint) {
    if (key === lastPrev) return;
    lastPrev = key;
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, prevCnv.width, prevCnv.height);
    if (paint) paint(pctx);
  }

  function show(title, lines, acts, barFrac) {
    titleEl.textContent = title;
    setRows(lines);
    setActions(acts);
    if (barFrac == null) barWrap.style.display = "none";
    else {
      barWrap.style.display = "block";
      bar.style.width = `${Math.max(0, Math.min(1, barFrac)) * 100}%`;
    }
    el.classList.add("on");
  }

  function hide() {
    el.classList.remove("on");
    lastRows = "";
    lastActs = "";
  }

  function skillLines(v) {
    const lines = [];
    for (const [prof, val] of Object.entries(v.skills)) {
      if (val > 0.005 && PROFESSIONS[prof]) lines.push([PROFESSIONS[prof].label.toLowerCase(), `${Math.round(val * 100)}%`]);
    }
    return lines;
  }

  function agentPreview(skin) {
    return (g) => drawAgent(g, { x: 28, y: 44, s: 1 }, { moving: false, phase: 0, dir: 0.4, action: "idle", swing: 0, carry: 0, flash: 0 }, skin, PV, 50, null, false);
  }

  function fieldPreview(seeded) {
    return (g) => {
      g.fillStyle = "#6b5136";
      g.fillRect(8, 18, 40, 24);
      g.fillStyle = "#7d5f40";
      for (let i = 0; i < 4; i++) g.fillRect(8, 22 + i * 5, 40, 2);
      g.strokeStyle = seeded ? "#c8a03c" : "#6f8c4c";
      g.lineWidth = 1.6;
      g.lineCap = "round";
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const x = 14 + j * 10 + (i % 2) * 3;
          const y = 26 + i * 4;
          g.beginPath();
          g.moveTo(x, y + 3);
          g.lineTo(x, y - 2);
          if (seeded) {
            g.moveTo(x - 2, y - 1);
            g.lineTo(x, y - 4);
            g.moveTo(x + 2, y - 1);
            g.lineTo(x, y - 4);
          }
          g.stroke();
        }
      }
      g.lineCap = "butt";
    };
  }

  function firePreview() {
    return (g) => {
      g.fillStyle = "#5c544a";
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        g.beginPath();
        g.arc(28 + Math.cos(a) * 12, 36 + Math.sin(a) * 5, 2.4, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = "#54402a";
      g.lineWidth = 2.4;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(22, 37);
      g.lineTo(34, 33);
      g.moveTo(34, 37);
      g.lineTo(22, 33);
      g.stroke();
      g.fillStyle = "#e8862f";
      g.beginPath();
      g.moveTo(28, 14);
      g.quadraticCurveTo(34, 26, 28, 32);
      g.quadraticCurveTo(22, 26, 28, 14);
      g.fill();
      g.fillStyle = "#f7c04a";
      g.beginPath();
      g.moveTo(28, 21);
      g.quadraticCurveTo(31, 27, 28, 31);
      g.quadraticCurveTo(25, 27, 28, 21);
      g.fill();
      g.lineCap = "butt";
    };
  }

  return {
    hide,
    update(state, selected, f) {
      if (!selected) {
        hide();
        return;
      }
      let title = null;
      let lines = [];
      let acts = [];
      let barFrac = null;
      let desc = "";
      let prevKey = "";
      let prevPaint = null;

      if (selected.type === "founder") {
        title = `${f.name} — Founder`;
        desc = DESC.founder;
        prevKey = "founder";
        prevPaint = agentPreview(makeFounderSkin(P));
        lines = [
          ["carry", `${carryUnits(f.carry)} / ${f.carryMax}`],
          ["woodcraft", `${Math.round((f.skills.woodcraft || 0) * 100)}%`],
          ["health", `${f.hp} / ${f.maxHp}`],
        ];
      } else if (selected.type === "villager") {
        const v = state.villagers.find((vv) => vv.id === selected.id);
        if (!v) {
          hide();
          return;
        }
        title = `${v.name} — ${KINDS[v.kind].label}`;
        desc = DESC.villager;
        prevKey = `villager:${v.id}`;
        prevPaint = agentPreview(makeVillagerSkin(P, v));
        lines = [["role", professionLabel(v)]];
        const h = hungerState(v);
        if (h === "starving") lines.push(["status", "Starving"]);
        else if (h === "hungry") lines.push(["status", "Hungry"]);
        if (v.sleptRough) lines.push(["sleep", "Slept rough"]);
        lines.push(["health", `${Math.round(v.hp)}%`]);
        lines.push(...skillLines(v));
        barFrac = v.vigor / 100;
      } else if (selected.type === "wagon") {
        title = "Supply Wagon";
        desc = DESC.wagon;
        prevKey = "wagon";
        prevPaint = (g) => drawVisual(g, PV, WAGON_VISUAL, 28, 42, 30, P.building);
        lines = [
          ["role", "drop goods here"],
          ["food stored", String(state.stores.food)],
          ["logs stored", String(state.stores.log)],
          ["lumber stored", String(state.stores.lumber)],
          ["blocks stored", String(state.stores.stoneBlock)],
        ];
      } else if (selected.type === "fire") {
        title = "Campfire";
        desc = DESC.fire;
        prevKey = "fire";
        prevPaint = firePreview();
        const bf = state.bonfire;
        lines = [
          ["status", "the heart of camp"],
          ["souls", String(1 + state.villagers.length)],
          ["worksites", `+${bf.workersLevel} hands per trade`],
        ];
        if (bf.pending) lines.push(["called", `arriving day ${bf.pending.arriveDay}`]);
        else if (bf.callDay === state.time.day) lines.push(["called", "again tomorrow"]);
        if (!bf.pending && bf.callDay !== state.time.day) {
          acts.push({ act: "callVillager", label: "Call Villager" });
        }
        const nextUp = BONFIRE_UPGRADES[bf.workersLevel + 1];
        if (nextUp) {
          acts.push({ act: "upgradeBonfire", label: `${nextUp.label} — ${costLabel(nextUp.cost)}` });
        }
      } else if (selected.type === "field") {
        const field = (state.fields ?? []).find((ff) => ff.id === selected.id);
        if (!field) {
          hide();
          return;
        }
        title = field.seed ? `Field — ${CROPS[field.seed].name}` : "Field";
        desc = DESC.field;
        prevKey = `field:${field.id}:${field.seed ?? ""}`;
        prevPaint = fieldPreview(!!field.seed);
        lines = [
          ["crop", fieldStatusLabel(field)],
          ["tiles", `${field.tiles.length}`],
          ["soil", field.watered > 0 ? "watered" : "dry"],
        ];
        if (field.seed && field.stage >= 0 && field.stage <= 2 && field.queuedSeed) {
          lines.push(["next", CROPS[field.queuedSeed].name]);
        }
        const seeds = Object.keys(CROPS);
        if (!field.seed || field.stage === -1) {
          for (const sId of seeds) {
            acts.push({ act: "sowSeed", arg: `${field.id}:${sId}`, label: `Sow ${CROPS[sId].name}` });
          }
        } else {
          for (const sId of seeds) {
            if (sId !== field.seed) acts.push({ act: "sowSeed", arg: `${field.id}:${sId}`, label: `Replant ${CROPS[sId].name}` });
          }
        }
      } else if (selected.type === "flora") {
        const item = state.flora[selected.id];
        if (!item || item.state === "gone") {
          hide();
          return;
        }
        desc = floraDesc(item);
        prevKey = `flora:${item.id}:${item.state}:${item.variant}`;
        prevPaint = (g) => {
          const def = floraVisual(item, item.state === "alive");
          drawVisual(g, PV, def, 28, 43, 30, P.flora);
        };
        if (item.state === "stump") {
          title = "Tree Stump";
          lines = [["status", "regrowing"]];
        } else if (item.state === "picked") {
          title = "Berry Bush";
          lines = [["status", `regrows in ${Math.ceil(item.regrowT)}s`], ["yields", "food"]];
        } else if (item.kind === "tree") {
          title = item.species === "pine" ? "Pine Tree" : "Oak Tree";
          lines = [
            ["status", "standing"],
            ["chops left", `${item.hp}`],
            ["yields", "3 logs"],
          ];
        } else if (item.kind === "rock") {
          title = "Boulder";
          lines = [
            ["status", "quarryable"],
            ["hits left", `${item.hp}`],
            ["yields", "4 raw stone"],
          ];
        } else if (item.kind === "berry") {
          title = "Berry Bush";
          lines = [
            ["status", "ripe"],
            ["pick left", `${item.hp}`],
            ["yields", "2 food"],
          ];
        } else if (item.kind === "bush") {
          title = "Shrub";
          lines = [["status", "decorative"]];
        }
      } else if (selected.type === "placing") {
        const def = BUILDINGS[selected.kind] ?? FIELD_PLACE;
        const isField = !BUILDINGS[selected.kind];
        title = `${def.name} — placing`;
        desc = def.desc;
        prevKey = `placing:${selected.kind}`;
        prevPaint = isField
          ? fieldPreview(false)
          : (g) => drawVisual(g, PV, def.visual, 28, 43, 30, P.building);
        lines = [["cost", def.costNote ?? costLabel(def.cost)]];
        if (!isField) {
          if (def.slots) lines.push(["hands", `up to ${def.slots[def.slots.length - 1]} at the worksite`]);
          if (def.recipe) lines.push(["makes", recipeLabel(def.recipe)]);
          if (def.radius) lines.push(["roams", `within ~${def.radius} paces`]);
        }
      } else if (selected.type === "building") {
        const b = state.buildings.find((bb) => bb.id === selected.id);
        if (!b) {
          hide();
          return;
        }
        const def = BUILDINGS[b.kind];
        title = b.state === "site" ? `${b.name} — Site` : b.name;
        desc = def.desc;
        prevKey = `building:${b.id}:${b.state}:${b.kind}`;
        prevPaint = (g) =>
          drawVisual(g, PV, b.state === "site" ? SITE_POSTS : def.visual, 28, 43, 30, P.building);
        if (b.state === "site") {
          lines = [["builders", "work here to raise it"]];
          barFrac = b.work / b.maxWork;
        } else if (b.kind === "house") {
          const used = usedBeds(state, b);
          const cap = BUILDINGS.house.bedsCap;
          lines = [
            ["status", "built"],
            ["beds", `${b.beds} / ${cap}`],
            ["sleeping", `${used}`],
          ];
          if (b.beds < cap) acts.push({ act: "buildBed", arg: String(b.id), label: `Build Bed — ${bedCostLabel()}` });
        } else {
          lines = [["status", "built"]];
          if (def.storage && b.storage) {
            for (const good of Object.keys(def.storage)) {
              lines.push([GOODS[good].name.toLowerCase(), `${storageCount(b, good)} / ${capOf(b, good)}`]);
            }
          }
          if (def.recipe) lines.push(["makes", recipeLabel(def.recipe)]);
          if (def.slots) workerRows(state, b, lines, acts);
          const up = def.storageUpgrade;
          if (up && b.storageLvl < up.max) {
            acts.push({ act: "expandStorage", arg: String(b.id), label: `Expand Storage — ${costLabel(up.cost)}` });
          }
        }
      }

      if (!title) {
        hide();
        return;
      }
      setDesc(desc);
      setPreview(prevKey, prevPaint);
      show(title, lines, acts, barFrac);
    },
  };
}

function workerRows(state, b, lines, acts) {
  const cap = slotCap(state, b);
  lines.push(["workers", `${b.workers.length} / ${cap}`]);
  for (const vId of b.workers) {
    const v = state.villagers.find((vv) => vv.id === vId);
    if (!v) continue;
    lines.push([v.name, PROFESSIONS[v.workplace?.job ?? ""]?.label ?? ""]);
    acts.push({ act: "unassign", arg: `${b.id}:${vId}`, label: `✕ ${v.name}` });
  }
}

function bedCostLabel() {
  return costLabel(BUILDINGS.house.bedCost);
}

function costLabel(cost) {
  return Object.entries(cost)
    .map(([gg, c]) => `${c} ${GOODS[gg].name}`)
    .join(" · ");
}

function recipeLabel(recipe) {
  const side = (m) =>
    Object.entries(m)
      .map(([gg, c]) => `${c} ${GOODS[gg].name.toLowerCase()}`)
      .join(" + ");
  return `${side(recipe.in)} → ${side(recipe.out)}`;
}
