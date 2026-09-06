const SAVE_KEY = "truelevellers_save";

export function hasSave() {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveGame(sim) {
  try {
    const data = {
      seed: sim.state.seed,
      savedAt: Date.now(),
      state: JSON.parse(JSON.stringify(sim.state, (k, v) => {
        if (k === "bus" || k === "rng") return undefined;
        return v;
      })),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {}
}
