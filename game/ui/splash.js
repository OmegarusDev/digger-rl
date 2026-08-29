export function createSplash(root, { seed, onBegin }) {
  const wrap = document.createElement("div");
  wrap.className = "title-wrap clickable";
  wrap.innerHTML = `
    <div class="title-card">
      <div class="title-brand">FORGE</div>
      <h1 class="title-name">DIGGER&nbsp;RL</h1>
      <div class="title-sub">a medieval village roguelite</div>
      <div class="title-rule"></div>
      <form class="title-form" id="titleForm">
        <label class="title-label" for="titleSeed">valley seed</label>
        <input id="titleSeed" type="number" value="${seed}" min="1" max="999999999" />
        <button type="submit" class="title-btn">Found the Village</button>
      </form>
      <div class="title-quote">“The earth is a common treasury for all.”</div>
      <div class="title-credit">— Gerrard Winstanley, 1649</div>
    </div>
  `;

  const form = wrap.querySelector("#titleForm");
  const input = wrap.querySelector("#titleSeed");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const s = Math.max(1, Math.floor(Number(input.value) || seed));
    if (s !== seed) {
      location.href = `${location.pathname}?seed=${s}`;
      return;
    }
    dismiss();
  });

  function dismiss() {
    wrap.classList.add("title-out");
    setTimeout(() => wrap.remove(), 450);
    onBegin?.();
  }

  root.appendChild(wrap);
  return { dismiss };
}
