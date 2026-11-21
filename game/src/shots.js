// shots.js — staged scenes for the entry's screenshots. A ?shot= query
// puts the game into one composed, frozen moment (title, a patrol in
// progress, the courier hidden in a bush, a guard in full chase, the
// level-clear card) and renders it with the game's own code — the
// screenshots are real renders, just composed. A ?seed= is accepted for
// determinism and ignored by the visuals, which are seeded already.
import { TILE } from './config.js';
import { GUARD_STATE } from './guard.js';

function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

export function applyShot(game, loadLevel, startGame) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return;
  game.frozen = true;
  if (shot === 'title') {
    game.state = 'title';
    return;
  }
  loadLevel(0);
  game.state = 'play';
  const p = game.player;
  const [g1, g2] = game.guards;

  if (shot === 'patrol') {
    // Courier mid-route with one parcel taken; both patrols sweeping
    // their cones across open floor, exit locked and glowing red.
    const a = tileCenter(7, 5);
    p.x = a.x; p.y = a.y; p.facing = Math.PI;
    game.level.parcels[0].taken = true;
    p.parcels = 1;
    g1.x = 9.5 * TILE; g1.y = 2 * TILE; g1.facing = Math.PI / 2; g1.meter = 0.12;
    g2.x = 5 * TILE; g2.y = 7.5 * TILE; g2.facing = -0.4; g2.meter = 0;
    game.elapsed = 47;
  } else if (shot === 'hide') {
    // The courier crouched in a bush while a guard's cone sweeps past
    // an arm's length away — the meter half full, the guard suspicious.
    const bush = tileCenter(3, 5);
    p.x = bush.x; p.y = bush.y; p.facing = 0; p.inBush = true;
    g1.x = 6.5 * TILE; g1.y = 5 * TILE; g1.facing = Math.PI;
    g1.state = GUARD_STATE.SUSPICIOUS;
    g1.meter = 0.48;
    g1.investigate = { x: bush.x, y: bush.y };
    g2.x = 11 * TILE; g2.y = 8 * TILE; g2.facing = Math.PI * 0.75;
    game.level.parcels[0].taken = true;
    p.parcels = 1;
    game.elapsed = 96;
  } else if (shot === 'alert') {
    // Two parcels in the bag, the exit still locked — and a guard in full chase,
    // red cone on the courier's heels.
    const near = tileCenter(15, 3);
    p.x = near.x; p.y = near.y; p.facing = 0; p.running = true; p.moving = true;
    game.level.parcels[0].taken = true;
    game.level.parcels[1].taken = true;
    p.parcels = 2;
    g1.x = 12.5 * TILE; g1.y = 3 * TILE; g1.facing = 0;
    g1.state = GUARD_STATE.CHASE;
    g1.meter = 1;
    g1.lastSeen = { x: p.x, y: p.y };
    g2.x = 8 * TILE; g2.y = 6 * TILE; g2.facing = -Math.PI / 2; g2.meter = 0.4;
    game.elapsed = 133;
  } else if (shot === 'win') {
    game.level.parcels.forEach((p) => { p.taken = true; });
    p.parcels = 3;
    game.level.exitOpen = true;
    game.clearText = 'All three parcels — the next drop is Level 2 — The Archive.';
    game.state = 'levelclear';
    game.elapsed = 154;
  }
}
