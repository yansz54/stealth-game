// main.js — Shadow Post: the game loop, the states (title, play, paused,
// caught, level clear, win), the level flow and the noise that gives the
// courier away. Wires keyboard, mouse, sound and the renderer together.
import { TILE, VIEW_W, VIEW_H, LEVELS, validateLevel } from './config.js';
import { Level } from './level.js';
import { Guard, GUARD_STATE } from './guard.js';
import { Player } from './player.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { applyShot } from './shots.js';
import { dist } from './util.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const game = {
  state: 'title',
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  input: new Input(canvas),
  sounds: new SoundBank(),
  renderer: new Renderer(canvas),
  elapsed: 0,
  totalElapsed: 0,
  clearText: '',
  totalTimeText: '',
  frozen: false, // set by a ?shot= preset: render one staged frame, no updates
};

function loadLevel(index) {
  const def = LEVELS[index];
  const problems = validateLevel(def);
  if (problems.length) console.warn('level ' + index + ' problems: ' + problems.join('; '));
  game.levelIndex = index;
  game.level = new Level(def);
  game.player = new Player(game.level);
  game.guards = def.guards.map((g) => new Guard(g, game.level, {
    coneRange: def.coneRange,
    coneHalfAngle: def.coneHalfAngle,
    patrolSpeed: def.patrolSpeed,
    chaseSpeed: def.chaseSpeed,
  }));
  game.elapsed = 0;
}

function startGame() {
  game.sounds.ensure();
  game.totalElapsed = 0;
  loadLevel(0);
  game.state = 'play';
}

function restartLevel() {
  game.sounds.ensure();
  loadLevel(game.levelIndex);
  game.state = 'play';
}

function nextLevel() {
  game.totalElapsed += game.elapsed;
  game.sounds.levelClear();
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.state = 'win';
    game.sounds.win();
    const t = game.totalElapsed;
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(Math.floor(t % 60)).padStart(2, '0');
    game.totalTimeText = mm + ':' + ss;
    return;
  }
  game.clearText = 'All three parcels — the next drop is ' + LEVELS[game.levelIndex + 1].name + '.';
  game.state = 'levelclear';
}

function update(dt) {
  if (game.state !== 'play' || game.frozen) return;
  game.elapsed += dt;
  game.player.update(dt, game.input, game.sounds);

  // Running noise: guards close enough turn to look at the sound.
  const noise = game.player.noiseEvent();
  if (noise) {
    for (const g of game.guards) {
      if (g.state === GUARD_STATE.PATROL && dist(g.x, g.y, noise.x, noise.y) < noise.radius) {
        g.state = GUARD_STATE.SUSPICIOUS;
        g.investigate = { x: noise.x, y: noise.y };
        g.lookTimer = 0;
        g.meter = Math.max(g.meter, 0.4);
      }
    }
  }

  for (const g of game.guards) g.update(dt, game.player, game.sounds);
  if (game.guards.some((g) => g.caught)) {
    game.state = 'caught';
    game.sounds.caught();
    return;
  }

  if (!game.level.exitOpen && game.level.parcelsLeft() === 0) {
    game.level.exitOpen = true;
    game.sounds.pickup();
  }
  if (game.level.exitOpen && game.player.atExit()) {
    nextLevel();
  }
}

function frame(time) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (time - (frame.last || time)) / 1000 || 0);
  frame.last = time;
  update(dt);
  game.renderer.draw(game, time);
}

// Keys that change state, whatever the screen shows.
game.input.onKey = (code) => {
  game.sounds.ensure();
  if (code === 'KeyM') {
    game.sounds.setMuted(!game.sounds.muted);
    return;
  }
  if (game.state === 'title' && (code === 'Enter' || code === 'Space')) startGame();
  else if (game.state === 'play' && (code === 'KeyP' || code === 'Escape')) game.state = 'paused';
  else if (game.state === 'paused' && (code === 'KeyP' || code === 'Escape')) game.state = 'play';
  else if (game.state === 'caught' && code === 'KeyR') restartLevel();
  else if (game.state === 'levelclear' && (code === 'Enter' || code === 'Space')) {
    loadLevel(game.levelIndex + 1);
    game.state = 'play';
  } else if (game.state === 'win' && code === 'KeyR') startGame();
};

game.input.onClick = (x, y) => {
  game.sounds.ensure();
  if (game.state === 'title') { startGame(); return; }
  if (game.state === 'levelclear') { loadLevel(game.levelIndex + 1); game.state = 'play'; return; }
  if (game.state !== 'play') return;
  // Clicking a floor tile walks the courier there; clicking a wall does nothing.
  if (!game.level.solidAt(x, y)) game.input.moveTarget = { x, y };
};

// A test / screenshot hook: the page's own state, readable from the console.
window.__game = game;

loadLevel(0);
applyShot(game, loadLevel, startGame);
requestAnimationFrame(frame);
