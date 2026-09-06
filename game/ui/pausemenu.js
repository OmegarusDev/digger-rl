import { settings } from "../settings.js";

export function createPauseMenu(root, { onResume, onSave }) {
  const wrap = document.createElement("div");
  wrap.className = "pause-wrap";

  const card = document.createElement("div");
  card.className = "pause-card";

  const title = document.createElement("div");
  title.className = "pause-title";
  title.textContent = "PAUSED";

  const menuView = document.createElement("div");
  menuView.className = "pause-view";

  const settingsView = document.createElement("div");
  settingsView.className = "pause-view";
  settingsView.style.display = "none";

  function btn(label, fn) {
    const b = document.createElement("button");
    b.className = "pause-btn";
    b.textContent = label;
    b.addEventListener("click", fn);
    return b;
  }

  menuView.appendChild(btn("Resume", () => onResume()));
  menuView.appendChild(btn("Save", () => {
    onSave?.();
  }));
  menuView.appendChild(btn("Settings", () => {
    menuView.style.display = "none";
    settingsView.style.display = "";
  }));
  menuView.appendChild(btn("Restart", () => { location.reload(); }));

  const shadowRow = document.createElement("label");
  shadowRow.className = "pause-setting";
  const shadowCheck = document.createElement("input");
  shadowCheck.type = "checkbox";
  shadowCheck.checked = settings.shadows;
  shadowCheck.addEventListener("change", () => {
    settings.shadows = shadowCheck.checked;
  });
  const shadowLabel = document.createElement("span");
  shadowLabel.textContent = "Shadows";
  shadowRow.appendChild(shadowCheck);
  shadowRow.appendChild(shadowLabel);
  settingsView.appendChild(shadowRow);

  const backBtn = btn("Back", () => {
    settingsView.style.display = "none";
    menuView.style.display = "";
  });
  settingsView.appendChild(backBtn);

  card.appendChild(title);
  card.appendChild(menuView);
  card.appendChild(settingsView);
  wrap.appendChild(card);
  root.appendChild(wrap);

  return {
    show() { wrap.classList.add("on"); },
    hide() { wrap.classList.remove("on"); },
    get isOpen() { return wrap.classList.contains("on"); },
  };
}
