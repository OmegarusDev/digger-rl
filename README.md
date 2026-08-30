<p align="center">
  <a href="https://omegarusdev.github.io/digger-rl/" style="display:inline-block;padding:16px 52px;font:bold 26px sans-serif;color:#fff;background:#1f9d2f;border-radius:12px;text-decoration:none;">▶ PLAY DIGGER RL</a>
</p>
<p align="center">
  <a href="https://omegarusdev.github.io/digger-rl/">
    <img src="https://img.shields.io/badge/▶_PLAY_NOW-playable_in_browser-brightgreen?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Play Now" height="40" />
  </a>
</p>
<p align="center"><strong>No install.</strong> Works in the browser (desktop &amp; mobile).</p>

# Digger RL

A medieval village roguelite — be the Founder, work the commons, and hold the line when winter comes.

## What it is

You are the Founder — an actual body in the world, not a hand of god. Fell the first trees with your own axe, raise a village on common land, and keep every soul fed through the seasons. When you fall, the next Founder rises stronger.

- **Zero runtime dependencies.** No frameworks, no bundler, no asset packs.
- **All art drawn in code.** Procedural 2.5D prim sprites, smooth sampled terrain, dynamic sun shadows.
- **A living valley.** Day/night cycle with a seasonal sun — day length and shadow angle change as the year turns.
- **Commons economy.** No coin: if bread is made, people come and take bread. Production balance is the whole game.
- **Forge engine.** A standalone graphics engine hybridizing Project Tower Defense's faux-3D trickery with Gunship's smooth terrain.

Named for **The Diggers** (1649) — who settled common land and held that the earth was "a common treasury for all".

## Controls

| Input | Action |
|---|---|
| `WASD` / arrows | move the Founder |
| `SPACE` | work the closest thing in reach (enemies first) |
| Left click | inspect / work a thing · place buildings |
| `B` / `V` | build menu — Woodcutter's Hut / Storehouse |
| Wheel | zoom (camera pitches down as you zoom in) |
| Drag | free camera |
| `F` | toggle founder follow cam |
| `1` / `2` / `3` | game speed ×1 / ×2 / ×4 |
| `P` | pause |

## How to play

Chop trees and pick berries by hand → drop goods at the **Supply Wagon** → spend wood at the **BUILD** menu to raise buildings (work construction sites to build them) → keep food and firewood flowing before winter bites. More hands arrive when there is housing and food to spare. Bandits come for your stores — the Founder fights too.

## Run locally

```bash
npm run serve        # or: python3 tools/serve.py
# open http://localhost:8080
```

Add `?seed=12345` to replay a specific valley.

## Development

- `node verify.mjs` — the gate: parse-checks every module and runs the headless test suite (camera projection roundtrips, world determinism, founder economy, buildings, pathfinding, FX caps).
- `AGENTS.md` — architecture rules and conventions for contributing.
- The game is vanilla ES modules with no build step; `forge/` is the portable engine and must never import from `game/`.

## Links

- [PRESENTATION_STYLE.md](https://github.com/OmegarusDev/) — org presentation standard
- Related repos: [project-tower-defense](https://github.com/OmegarusDev/project-tower-defense), [Gunship](https://github.com/OmegarusDev/Gunship)
