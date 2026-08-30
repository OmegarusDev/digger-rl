export function createInfoPanel(root) {
  const el = document.createElement("div");
  el.className = "info-panel";
  el.id = "infoPanel";
  el.innerHTML = `
    <div class="info-title" id="ipTitle"></div>
    <div class="info-rows" id="ipRows"></div>
    <div class="info-bar" id="ipBarWrap"><div class="info-bar-fill" id="ipBar"></div></div>
  `;
  root.appendChild(el);

  const titleEl = el.querySelector("#ipTitle");
  const rowsEl = el.querySelector("#ipRows");
  const barWrap = el.querySelector("#ipBarWrap");
  const bar = el.querySelector("#ipBar");
  let lastKey = "";

  function setRows(lines) {
    const key = lines.join("|");
    if (key === lastKey) return;
    lastKey = key;
    rowsEl.innerHTML = lines
      .map(([k, v]) => `<div class="info-row"><span>${k}</span><b>${v}</b></div>`)
      .join("");
  }

  return {
    hide() {
      el.classList.remove("on");
      lastKey = "";
    },
    update(state, selected, f) {
      if (!selected) {
        el.classList.remove("on");
        lastKey = "";
        return;
      }
      let lines = null;
      let barFrac = null;

      if (selected.type === "founder") {
        titleEl.textContent = `${f.name} — Founder`;
        lines = [
          ["carry", `${carrySum(f)} / ${f.carryMax}`],
          ["woodcraft", `${Math.round((f.skills.wood || 0) * 100)}%`],
          ["health", `${f.hp} / ${f.maxHp}`],
        ];
      } else if (selected.type === "wagon") {
        titleEl.textContent = "Supply Wagon";
        lines = [
          ["role", "drop goods here"],
          ["wood stored", String(state.stores.wood)],
        ];
      } else if (selected.type === "fire") {
        titleEl.textContent = "Campfire";
        lines = [
          ["status", "the heart of camp"],
          ["light", "burns through the night"],
        ];
      } else if (selected.type === "flora") {
        const item = state.flora[selected.id];
        if (!item || item.state === "gone") {
          el.classList.remove("on");
          return;
        }
        if (item.state === "stump") {
          titleEl.textContent = "Tree Stump";
          lines = [["status", "regrowing"]];
        } else if (item.state === "picked") {
          titleEl.textContent = "Berry Bush";
          lines = [["status", `regrows in ${Math.ceil(item.regrowT)}s`], ["yields", "food"]];
        } else if (item.kind === "tree") {
          titleEl.textContent = item.species === "pine" ? "Pine Tree" : "Oak Tree";
          lines = [
            ["status", "standing"],
            ["chops left", `${item.hp}`],
            ["yields", "3 wood"],
          ];
        } else if (item.kind === "rock") {
          titleEl.textContent = "Boulder";
          lines = [
            ["status", "quarryable"],
            ["hits left", `${item.hp}`],
            ["yields", "4 stone"],
          ];
        } else if (item.kind === "berry") {
          titleEl.textContent = "Berry Bush";
          lines = [
            ["status", "ripe"],
            ["pick left", `${item.hp}`],
            ["yields", "2 food"],
          ];
        } else if (item.kind === "bush") {
          titleEl.textContent = "Shrub";
          lines = [["status", "decorative"]];
        }
      } else if (selected.type === "building") {
        const b = state.buildings.find((bb) => bb.id === selected.id);
        if (!b) {
          el.classList.remove("on");
          return;
        }
        if (b.state === "site") {
          titleEl.textContent = `${b.name} — Site`;
          lines = [["builders", "work here to raise it"]];
          barFrac = b.work / b.maxWork;
        } else if (b.kind === "hut") {
          titleEl.textContent = b.name;
          lines = [["status", "built"], ["use", "SPACE nearby to split logs"]];
        } else {
          titleEl.textContent = b.name;
          lines = [["status", "built"], ["use", "drop goods here"]];
        }
      }

      if (!lines) {
        el.classList.remove("on");
        return;
      }
      el.classList.add("on");
      setRows(lines);
      if (barFrac == null) barWrap.style.display = "none";
      else {
        barWrap.style.display = "block";
        bar.style.width = `${Math.max(0, Math.min(1, barFrac)) * 100}%`;
      }
    },
  };
}

function carrySum(f) {
  return (f.carry.wood ?? 0) + (f.carry.food ?? 0) + (f.carry.stone ?? 0);
}
