export const KINDS = {
  adultM: { label: "Man", color: "#5f4128", trim: "#7a5836", scale: 1.0, worker: true },
  adultF: { label: "Woman", color: "#8a6240", trim: "#a37c50", scale: 0.94, worker: true },
  child: { label: "Child", color: "#a8845c", trim: "#c2a06c", scale: 0.72, worker: false },
  infant: { label: "Infant", color: "#e0b070", trim: "#f0cc8a", scale: 0.5, worker: false },
};

export const PROFESSIONS = {
  sawyer: { label: "Sawyer" },
  lumberjack: { label: "Lumberjack" },
  miner: { label: "Miner" },
  gatherer: { label: "Gatherer" },
  fisher: { label: "Fisher" },
  hunter: { label: "Hunter" },
  farmer: { label: "Farmer" },
  miller: { label: "Miller" },
  baker: { label: "Baker" },
  laborer: { label: "Laborer" },
};

export const NAMES_M = ["Aldwin", "Bram", "Cedric", "Dunstan", "Edric", "Godric", "Wystan", "Osmund", "Leofric", "Havelock", "Gareth", "Turstin"];
export const NAMES_F = ["Aldith", "Bess", "Clarice", "Dowsabel", "Edith", "Godgifu", "Wilmot", "Osanne", "Lettice", "Hawise", "Gundred", "Tibba"];

export function pickName(rng, sex) {
  const pool = sex === "F" ? NAMES_F : NAMES_M;
  return pool[Math.floor(rng() * pool.length)];
}
