export function createBuildBar(root, BUILDINGS, { onPick, onCancel }) {
  const bar = document.createElement("div");
  bar.className = "build-bar clickable";
  const buttons = {};
  for (const [kindId, def] of Object.entries(BUILDINGS)) {
    const btn = document.createElement("button");
    btn.className = "build-btn";
    btn.innerHTML = `<span class="build-name">${def.name}</span><span class="build-cost">${Object.entries(def.cost)
      .map(([g, c]) => `${c} ${g}`)
      .join(" · ")}</span>`;
    btn.title = def.desc;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const active = btn.classList.contains("active");
      setActive(null);
      if (!active) {
        setActive(kindId);
        onPick?.(kindId);
      } else onCancel?.();
    });
    buttons[kindId] = btn;
    bar.appendChild(btn);
  }
  root.appendChild(bar);

  function setActive(kindId) {
    for (const [k, btn] of Object.entries(buttons)) {
      btn.classList.toggle("active", k === kindId);
      void k;
    }
  }

  return {
    setActive,
    refresh(stores) {
      for (const [kindId, def] of Object.entries(BUILDINGS)) {
        const ok = Object.entries(def.cost).every(([g, c]) => (stores[g] ?? 0) >= c);
        buttons[kindId].classList.toggle("poor", !ok);
      }
    },
    get active() {
      for (const [k, btn] of Object.entries(buttons)) if (btn.classList.contains("active")) return k;
      return null;
    },
  };
}
