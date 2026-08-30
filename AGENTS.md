# AGENTS.md — Digger RL

## Commands

```bash
node verify.mjs          # gate: parse-check all modules + headless test suite
python3 -m http.server 8080   # dev server, open http://localhost:8080
```

CI/publishing: none wired yet beyond the local gate. Run `node verify.mjs` before every commit.

## Non-negotiables

- **Zero runtime dependencies.** Vanilla ES modules only. Dev tooling must not leak into the game.
- **No DOM in `game/sim/*`, `game/world/*`, `forge/` math modules.** They must import cleanly under node (tests rely on this). The only DOM touches allowed: `forge/terrain.js`, `forge/sprites.js`, `forge/hud.js`, `game/render/*` painters, `game/ui/*`, `main.js`, `forge/input.js`, `forge/camera.js` (canvas binding only — use `opts.viewport` for headless).
- **Determinism in sim/world.** Seeded RNG only (`forge/rng.js`). Never `Math.random` in `game/sim` or `game/world`. View-side randomness (fx, shake) is fine.
- **All projection through `camera.project/unproject`.** Never hand-roll world→screen math in painters. `p.s` is the taper factor only — sprite pixel size is `world_units * cam.scale * p.s`. Never multiply sizes by `cam.zoom` alone.
- **Sprites are prim compositions, not baked billboards.** Build visuals as data defs (`[prim, params]`) drawn through `forge/visuals.js` per frame so pitch/zoom re-derive everything (TD lesson). Cache defs, never bake pitch-dependent geometry.
- **No `console.log`/`console.debug`/`debugger`** anywhere in `forge/` or `game/`.
- **No comments unless load-bearing.** Prefer names that explain; keep the file count flat.

## Architecture notes

- `forge/` must not import from `game/`. Ever. The engine grows with each game; the game consumes it.
- The camera blends Gunship's free transform with TD's pitch trickery: `farScale` (taper) blends
  toward 1 as `taper → 0`, giving pure affine ground. Terrain renders strip-wise when tapered.
- Sim ticks at 30 Hz fixed step (`GameLoop`); render is free-running. No interpolation yet —
  sim hz is high enough.
- Founder FSM lives in `game/sim/founder.js`; it mutates plain state and emits bus events.
  View subscribes to `sim.state.bus` — never polls game objects for effects.
- Flora occupancy: `state.floraMap` (cell → ids) and `state.walk` (Uint8Array) must be kept in
  sync by any system that adds/removes blockers. `fellTree` handles both.

## Adding content

- **New good:** entry in `state.stores` + painter/HUD when visible.
- **New flora species:** placement in `valley.placeFlora`, painter branch in `game/render/flora.js`
  (bake via `SpriteCache`), blocker behavior in `state.js` + `founder.js` work handling.
- **New fx emitter:** `_spawn` case in `forge/fx.js` + draw branch; emit from sim bus handlers in `main.js`.
- **New test file:** `js/tests/*.test.mjs`, plain node asserts, no framework; `verify.mjs` picks it up.
