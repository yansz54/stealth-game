[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![make.fun · rank](https://make.fun/badge/best-stealth-game-20261121-1759/yansz54/stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![make.fun · reward](https://make.fun/badge/best-stealth-game-20261121-1759/yansz54/stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

# Shadow Post — Night Courier

A complete original top-down stealth game that plays offline in a desktop browser. You are Rin, a night courier: slip past patrolling guards, collect all three parcels, and reach the green EXIT unseen.

## How it plays

- **Vision cones** — guards see in a cone. Step into one and their suspicion meter fills; fill it and they give chase. Break line of sight and the meter drains, so a near miss is always recoverable.
- **Cover** — wooden crates block sight and movement; dark bushes block sight and hide you inside them.
- **Noise** — walking is quiet. Running (Shift) is faster but loud: nearby guards turn to investigate the sound.
- **Objectives** — 3 parcels per level. The exit stays locked until all three are in the bag, then it glows green.
- **Three levels** — The Depot, The Archive, The Vault: more guards, longer sightlines, tighter routes.
- **Feel** — night lighting with a pool of light around the courier, dust motes, footstep and alert sounds synthesised live with WebAudio (no audio files), HUD with parcels, alert state and timer, pause, restart and win screens.
- **Controls** — WASD / arrows to move, Shift to run, click a floor tile to walk there, M to mute, P to pause, R to retry a level, Enter to start.

## Play it

Serve `game/` with any static server, or run `node serve.ts` and open http://localhost:8080. No network requests: every file the game loads lives under `game/`.

## Files

- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library.
- `game/index.html` — the page; `game/src/` holds the game's own source, one job per file: `config.js` (levels), `level.js` (world and sight), `guard.js` (patrol, cone, suspicion, chase), `player.js` (movement, noise, parcels), `render.js` (procedural art, cones, lighting, HUD), `audio.js` (synthesised sounds), `input.js` (keyboard + mouse), `shots.js` (staged screenshot scenes), `main.js` (loop and states).
- `screenshots/` — 4 real renders of the game's own code: a patrol in progress, hiding in a bush, a guard in full chase, and the level-clear card.
- `vendor/makefun-game.ts` — the kit's library, copied unchanged.

## License

MIT — see `LICENSE`.
