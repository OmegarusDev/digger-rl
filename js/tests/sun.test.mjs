import assert from "node:assert/strict";
import { sunState } from "../../forge/sun.js";
import { DAY_LEN } from "../../game/sim/time.js";

{
  const noon = sunState({ tod: 0.5, season: 1 });
  assert.ok(noon.day > 0.5, "sun is up at noon");
  const morning = sunState({ tod: 0.25, season: 1 });
  const evening = sunState({ tod: 0.75, season: 1 });
  assert.ok(morning.alt < noon.alt, "low sun in morning");
  assert.ok(morning.az !== evening.az, "sun sweeps east to west");
  const night = sunState({ tod: 0.99, season: 1 });
  assert.ok(night.day < 0.1, "dark past dusk");
  const summer = sunState({ tod: 0.5, season: 1 });
  const winter = sunState({ tod: 0.5, season: 3 });
  assert.ok(winter.alt < summer.alt, "winter noon sun sits lower");
}

{
  assert.ok(DAY_LEN > 400, "days pass slowly");
}

console.log("sun.test OK");
