export const DAY_LEN = 360;
export const SEASON_DAYS = 4;
export const SEASONS = ["Spring", "Summer", "Autumn", "Winter"];

export function advanceTime(state, dt) {
  const time = state.time;
  time.t += dt;
  time.tod = (time.t % DAY_LEN) / DAY_LEN;
  const day = Math.floor(time.t / DAY_LEN) + 1;
  if (day !== time.day) {
    time.day = day;
    time.season = Math.floor((day - 1) / SEASON_DAYS) % 4;
    state.bus.emit("day", { day, season: time.season });
  }
}

export function clockLabel(tod) {
  const mins = Math.floor(tod * 24 * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function darkness(tod) {
  const sstep = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const dawn = 1 - sstep(0.08, 0.24, tod);
  const dusk = sstep(0.76, 0.92, tod);
  return Math.max(dawn, dusk);
}
