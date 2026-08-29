# Digger RL

A medieval village roguelite. You are the Founder — an actual body in the world, not a
hand of god. Fell the first trees with your own axe, and build a commons where nobody
goes hungry. When you fall, the next Founder rises stronger.

Named for **The Diggers** (1649) — who settled common land and held that the earth was
"a common treasury for all". There is no coin here. If bread is made, people come and
take bread. Your job is to make sure it always is.

Built on the **Forge engine** — a hybrid graphics engine extracted from Project Tower
Defense (the 2.5D perspective trickery) and Gunship: Freedom Protocol (smooth sampled
terrain, cameras, noise). Zero runtime dependencies. Every sprite, sound and texture
is drawn or synthesized in code.

## Status

Early milestone build (M0–M2): valley generation, day/night cycle, and the Founder
living off the land — chopping, hauling, skill growth.

## Run

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Add `?seed=12345` to replay a specific valley.

## Controls

| Input | Action |
|---|---|
| drag / WASD / arrows | pan camera |
| wheel | zoom at cursor |
| left click | send the Founder |
| `Space` | pause |
| `1` / `2` / `3` | game speed ×1 / ×2 / ×4 |
| `F` | toggle founder follow cam |

## Verify

```bash
node verify.mjs
```

Parse-checks every module and runs the headless test suite (camera projection
roundtrips, world determinism, founder economy, pathfinding, FX caps).

## Layout

```
forge/            the graphics engine (portable, zero game imports)
  camera.js       WorldCamera: scroll/zoom/follow/shake + TD pitch + depth taper
  view25.js       two-factor faux-3D params (D depth / V vertical) from one pitch
  prims.js        cyl25/box25/frustum25/diamond/ring/rivet, ground shadows
  terrain.js      SmoothTerrain: sampled color grid + grain/mottle/macro patterns
  noise.js        perlin-style noise, fbm, ridged, warp
  paths.js        chaikin, arc-length sampling, steerAlong, overdraw path renderer
  fx.js           capped particle system (chips, leaf, smoke, spark, floats)
  hud.js          plates, headers, bars, offscreen markers
  input.js        pointer/keys/wheel with one-shot consumption
  agents.js       procedural 2.5D villager painter
  sprites.js      offscreen bake cache
  palette.js      role-nested color themes
  loop.js         fixed-timestep accumulator with speed multiplier
  draw.js rng.js  shared utilities
game/
  world/valley.js SSOT pure-function valley model (river → shore → forest → meadow)
  sim/            DOM-free deterministic simulation: state, time, A*, founder FSM
  render/         terrain sampler, flora painters, camp, scene compositor
  ui/hud.js       DOM HUD strip
js/tests/         headless test files (run by verify.mjs)
```

## Conventions

- **Zero runtime deps.** No frameworks, no bundler, no asset packs.
- **Determinism.** All world content and simulation flow through seeded RNG.
  No `Math.random` in `game/sim` or `game/world`.
- **No DOM in sim.** `game/sim/*` and `game/world/*` must stay headless-testable.
- **Camera is math.** Every world→screen conversion goes through `camera.project`;
  the pitch/taper projection can never drift.
- **Data over classes.** Content = new table entries, not new hierarchies.
