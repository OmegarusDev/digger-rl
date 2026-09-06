import assert from "node:assert/strict";
import { sunState, shadowParams } from "../../forge/sun.js";
import { DAY_LEN } from "../../game/sim/time.js";

{
  const noon = shadowParams(sunState({ tod: 0.5, season: 1 }));
  assert.ok(noon.on && !noon.moon, "sun casts at noon");
  const morning = shadowParams(sunState({ tod: 0.25, season: 1 }));
  const evening = shadowParams(sunState({ tod: 0.75, season: 1 }));
  assert.ok(morning.k > noon.k * 1.5, "low sun casts long shadows");
  assert.ok(morning.dirx < 0 && evening.dirx > 0, "shadows sweep east to west");
  const night = shadowParams(sunState({ tod: 0.99, season: 1 }));
  assert.ok(night.moon && night.alphaMul < 0.25, "faint moonlight past dusk");
  const summer = shadowParams(sunState({ tod: 0.5, season: 1 }));
  const winter = shadowParams(sunState({ tod: 0.5, season: 3 }));
  assert.ok(winter.k > summer.k, "winter noon sun sits lower");
}

{
  assert.ok(DAY_LEN > 400, "days pass slowly");
}

console.log("sun.test OK");
