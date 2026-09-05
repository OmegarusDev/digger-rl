import { GOODS } from "../data/goods.js";

export function createBuildBar(root, BUILDINGS, { onPick, onCancel }) {
  const fab = document.createElement("button");
  fab.className = "build-fab clickable";
  fab.title = "Buildings (B)";
  const icon = document.createElement("canvas");
  icon.width = 30;
  icon.height = 30;
  const g = icon.getContext("2d");
  g.fillStyle = "#d8c8a2";
  g.beginPath();
  g.moveTo(15, 4);
  g.lineTo(27, 14);
  g.lineTo(24, 14);
  g.lineTo(24, 26);
  g.lineTo(6, 26);
  g.lineTo(6, 14);
  g.lineTo(3, 14);
  g.closePath();
  g.fill();
  g.fillStyle = "#8a713a";
  g.fillRect(12, 17, 6, 9);
  fab.appendChild(icon);
  const label = document.createElement("span");
  label.textContent = "BUILD";
  fab.appendChild(label);

  const menu = document.createElement("div");
  menu.className = "build-menu clickable";
  const cards = {};
  for (const [kindId, def] of Object.entries(BUILDINGS)) {
    const card = document.createElement("button");
    card.className = "build-card";
    const ic = document.createElement("canvas");
    ic.width = 44;
    ic.height = 36;
    paintBuildingIcon(ic.getContext("2d"), kindId);
    card.appendChild(ic);
    const txt = document.createElement("span");
    txt.className = "build-txt";
    txt.innerHTML = `<span class="build-name">${def.name}</span><span class="build-cost">${def.costNote ?? Object.entries(def.cost)
      .map(([gg, c]) => `${c} ${GOODS[gg].name}`)
      .join(" · ")}</span>`;
    card.appendChild(txt);
    card.addEventListener("click", (e) => {
      e.stopPropagation();
      const active = card.classList.contains("active");
      setActive(null);
      closeMenu();
      if (!active) {
        setActive(kindId);
        onPick?.(kindId);
      } else onCancel?.();
    });
    cards[kindId] = card;
    menu.appendChild(card);
  }
  menu.style.display = "none";
  root.appendChild(menu);
  root.appendChild(fab);

  let open = false;
  function openMenu() {
    open = true;
    menu.style.display = "flex";
  }
  function closeMenu() {
    open = false;
    menu.style.display = "none";
  }

  fab.addEventListener("click", (e) => {
    e.stopPropagation();
    fab.blur();
    if (open) {
      closeMenu();
      setActive(null);
      onCancel?.();
    } else openMenu();
  });

  function setActive(kindId) {
    for (const [k, card] of Object.entries(cards)) {
      card.classList.toggle("active", k === kindId);
    }
    if (kindId) fab.classList.add("active");
    else fab.classList.remove("active");
  }

  return {
    setActive,
    close: closeMenu,
    open: openMenu,
    get active() {
      for (const [k, card] of Object.entries(cards)) if (card.classList.contains("active")) return k;
      return null;
    },
    refresh(stores) {
      for (const [kindId, def] of Object.entries(BUILDINGS)) {
        if (kindId === "field") continue;
        const ok = Object.entries(def.cost).every(([gg, c]) => (stores[gg] ?? 0) >= c);
        cards[kindId].classList.toggle("poor", !ok);
      }
    },
  };
}

function paintBuildingIcon(g, kind) {
  g.fillStyle = "#c8b892";
  if (kind === "hut") {
    g.fillStyle = "#8a6a44";
    g.fillRect(8, 16, 28, 16);
    g.fillStyle = "#b0934a";
    g.beginPath();
    g.moveTo(4, 17);
    g.lineTo(22, 3);
    g.lineTo(40, 17);
    g.closePath();
    g.fill();
    g.fillStyle = "#5f4a2e";
    g.fillRect(19, 22, 6, 10);
    g.fillStyle = "#685032";
    g.fillRect(33, 8, 4, 9);
  } else if (kind === "house") {
    g.fillStyle = "#a88a5a";
    g.fillRect(10, 17, 24, 15);
    g.fillStyle = "#8a6a44";
    g.beginPath();
    g.moveTo(6, 18);
    g.lineTo(22, 5);
    g.lineTo(38, 18);
    g.closePath();
    g.fill();
    g.fillStyle = "#5f4a2e";
    g.fillRect(19, 22, 6, 10);
    g.fillStyle = "#685032";
    g.fillRect(30, 8, 4, 7);
  } else if (kind === "field") {
    g.fillStyle = "#6b5136";
    g.fillRect(6, 8, 32, 24);
    g.strokeStyle = "#8a6c48";
    g.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(9, 12 + i * 5);
      g.lineTo(35, 12 + i * 5);
      g.stroke();
    }
    g.fillStyle = "#c8a03c";
    g.fillRect(26, 6, 3, 8);
    g.fillRect(22, 4, 11, 3);
  } else {
    g.fillStyle = "#8a6a44";
    g.fillRect(9, 26, 26, 6);
    g.fillStyle = "#c8b892";
    g.beginPath();
    g.moveTo(22, 3);
    g.lineTo(37, 27);
    g.lineTo(7, 27);
    g.closePath();
    g.fill();
    g.fillStyle = "#a89878";
    g.beginPath();
    g.moveTo(22, 3);
    g.lineTo(30, 27);
    g.lineTo(22, 27);
    g.closePath();
    g.fill();
  }
}
