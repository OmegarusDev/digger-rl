const SAVE_KEY = "truelevellers_save";
const SAVE_VERSION = 1;

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
      version: SAVE_VERSION,
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
    const data = JSON.parse(raw);
    if (data.version !== SAVE_VERSION) {
      localStorage.removeItem(SAVE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {}
}
