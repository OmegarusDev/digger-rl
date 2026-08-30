export const BUILDINGS = {
  hut: {
    name: "Woodcutter's Hut",
    desc: "Split logs at the sawhorse — steady wood without leaving the yard",
    cost: { wood: 12 },
    work: 14,
    job: "sawyer",
    visual: [
      ["box", { w: 0.78, d: 0.62, h: 0.4, top: "woodHi", side: "wood", dark: "woodDark" }],
      ["roof", { y: 0.4, w: 0.94, d: 0.78, h: 0.34, c: "roof", top: "roofDark", gable: "woodDark" }],
      ["box", { x: 0.26, y: 0.74, w: 0.08, d: 0.08, h: 0.14, top: "woodHi", side: "wood", dark: "woodDark" }],
    ],
  },
  store: {
    name: "Storehouse",
    desc: "An extra place to drop goods — the village will need the room",
    cost: { wood: 8 },
    work: 10,
    deposit: true,
    visual: [
      ["box", { w: 0.7, d: 0.55, h: 0.12, top: "woodHi", side: "wood", dark: "woodDark" }],
      ["frustum", { y: 0.12, rxBot: 0.48, rxTop: 0.1, h: 0.46, top: "canvasHi", side: "canvas", dark: "canvasDark" }],
    ],
  },
};

export const SITE_POSTS = [
  ["post", { x: -0.3, y: -0.28, h: 0.3 }],
  ["post", { x: 0.3, y: -0.28, h: 0.26 }],
  ["post", { x: -0.3, y: 0.28, h: 0.26 }],
  ["post", { x: 0.3, y: 0.28, h: 0.3 }],
];
