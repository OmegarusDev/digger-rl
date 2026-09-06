import { hasSave, deleteSave } from "../save.js";

export function createSplash(root, { seed, onContinue, onDismiss }) {
  const wrap = document.createElement("div");
  wrap.className = "title-wrap clickable";
  const existing = hasSave();
  let wasContinue = false;
  wrap.innerHTML = `
    <div class="title-card">
      <div class="title-brand">FORGE</div>
      <h1 class="title-name">TRUE&nbsp;LEVELLERS</h1>
      <div class="title-sub">a medieval village roguelite</div>
      <div class="title-rule"></div>
      ${existing ? '<button type="button" class="title-btn pause-btn-row" id="titleContinue">Continue</button>' : ""}
      <form class="title-form" id="titleForm">
        <label class="title-label" for="titleSeed">valley seed</label>
        <input id="titleSeed" type="number" value="${seed}" min="1" max="999999999" />
        <button type="submit" class="title-btn">New Game</button>
      </form>
      <div class="title-quote">"The earth is a common treasury for all."</div>
      <div class="title-credit">— Gerrard Winstanley, 1649</div>
    </div>
  `;

  const form = wrap.querySelector("#titleForm");
  const input = wrap.querySelector("#titleSeed");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const s = Math.max(1, Math.floor(Number(input.value) || 0));
    if (s !== seed) {
      deleteSave();
      location.href = `${location.pathname}?seed=${s}`;
      return;
    }
    deleteSave();
    dismiss();
  });

  if (existing) {
    wrap.querySelector("#titleContinue").addEventListener("click", () => {
      wasContinue = true;
      onContinue?.();
      dismiss();
    });
  }

  function dismiss() {
    wrap.classList.add("title-out");
    setTimeout(() => wrap.remove(), 450);
    onDismiss?.(wasContinue);
  }

  root.appendChild(wrap);
  return { dismiss };
}
