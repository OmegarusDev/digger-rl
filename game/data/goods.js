export const GOODS = {
  food: { name: "Food" },
  log: { name: "Logs" },
  lumber: { name: "Lumber" },
  rawStone: { name: "Raw Stone" },
  stoneBlock: { name: "Stone Blocks" },
  grain: { name: "Grain" },
  flour: { name: "Flour" },
  bread: { name: "Bread" },
};

export const CARRY_GOODS = ["food", "log", "lumber", "rawStone", "stoneBlock"];

export const DEPOSIT_AS = {
  food: "food",
  bread: "food",
  log: "log",
  lumber: "lumber",
  rawStone: "rawStone",
  stoneBlock: "stoneBlock",
};

export const DEPOSIT_VALUE = { food: 1, bread: 3 };

export const FLORA_YIELD = {
  tree: { good: "log", n: 3 },
  berry: { good: "food", n: 2 },
  rock: { good: "rawStone", n: 4 },
};

export function carryUnits(carry) {
  let total = 0;
  for (const g of CARRY_GOODS) total += carry[g] ?? 0;
  return total;
}
