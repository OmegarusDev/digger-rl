import { carryUnits, GOODS } from "../data/goods.js";
import { KINDS, PROFESSIONS } from "../data/villagers.js";
import { hungerState, professionLabel } from "../sim/villager.js";
import { slotCap } from "../sim/jobs.js";
import { usedBeds } from "../sim/homes.js";
import { BUILDINGS } from "../data/buildings.js";
import { storageCount, capOf } from "../sim/storage.js";
import { CROPS } from "../data/crops.js";
import { fieldStatusLabel } from "../sim/fields.js";

export function createInfoPanel(root, onAction) {
  const el = document.createElement("div");
  el.className = "info-panel";
  el.id = "infoPanel";
  el.innerHTML = `
    <div class="info-title" id="ipTitle"></div>
    <div class="info-rows" id="ipRows"></div>
    <div class="info-actions" id="ipActions"></div>
    <div class="info-bar" id="ipBarWrap"><div class="info-bar-fill" id="ipBar"></div></div>
  `;
  root.appendChild(el);

  const titleEl = el.querySelector("#ipTitle");
  const rowsEl = el.querySelector("#ipRows");
  const actionsEl = el.querySelector("#ipActions");
  const barWrap = el.querySelector("#ipBarWrap");
  const bar = el.querySelector("#ipBar");
  let lastRows = "";
  let lastActs = "";

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

      if (selected.type === "founder") {
        title = `${f.name} — Founder`;
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
        lines = [
          ["role", "drop goods here"],
          ["food stored", String(state.stores.food)],
          ["logs stored", String(state.stores.log)],
          ["lumber stored", String(state.stores.lumber)],
          ["blocks stored", String(state.stores.stoneBlock)],
        ];
      } else if (selected.type === "fire") {
        title = "Campfire";
        const bf = state.bonfire;
        lines = [["status", "the heart of camp"], ["souls", String(1 + state.villagers.length)]];
        if (bf.pending) lines.push(["called", `arriving day ${bf.pending.arriveDay}`]);
        else if (bf.callDay === state.time.day) lines.push(["called", "again tomorrow"]);
        if (!bf.pending && bf.callDay !== state.time.day) {
          acts.push({ act: "callVillager", label: "Call Villager" });
        }
      } else if (selected.type === "field") {
        const field = (state.fields ?? []).find((ff) => ff.id === selected.id);
        if (!field) {
          hide();
          return;
        }
        title = field.seed ? `Field — ${CROPS[field.seed].name}` : "Field";
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
      } else if (selected.type === "building") {
        const b = state.buildings.find((bb) => bb.id === selected.id);
        if (!b) {
          hide();
          return;
        }
        if (b.state === "site") {
          title = `${b.name} — Site`;
          lines = [["builders", "work here to raise it"]];
          barFrac = b.work / b.maxWork;
        } else if (b.kind === "house") {
          title = b.name;
          const used = usedBeds(state, b);
          const cap = BUILDINGS.house.bedsCap;
          lines = [
            ["status", "built"],
            ["beds", `${b.beds} / ${cap}`],
            ["sleeping", `${used}`],
          ];
          if (b.beds < cap) acts.push({ act: "buildBed", arg: String(b.id), label: `Build Bed — ${bedCostLabel()}` });
        } else {
          title = b.name;
          const def = BUILDINGS[b.kind];
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
