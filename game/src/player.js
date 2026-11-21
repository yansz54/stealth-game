// player.js — Rin, the night courier. Walks quietly, runs loudly:
// running is faster but the noise pulls nearby guards to look. Clicking
// a floor tile walks there. Collects parcels; the exit only opens once
// all three are in the bag.
import { PLAYER_WALK, PLAYER_RUN, PLAYER_RADIUS } from './config.js';
import { dist } from './util.js';

export class Player {
  constructor(level) {
    this.level = level;
    this.reset();
  }

  reset() {
    this.x = this.level.start.x;
    this.y = this.level.start.y;
    this.facing = 0;
    this.moving = false;
    this.running = false;
    this.inBush = false;
    this.parcels = 0;
    this.stepTimer = 0;
    this.noisePulse = 0; // seconds since the last noise burst
  }

  update(dt, input, sounds) {
    const vec = input.moveVector();
    let tx = 0, ty = 0;
    if (vec.x !== 0 || vec.y !== 0) {
      tx = vec.x; ty = vec.y;
      input.clearMoveTarget();
    } else if (input.moveTarget) {
      const d = dist(this.x, this.y, input.moveTarget.x, input.moveTarget.y);
      if (d < 8) {
        input.clearMoveTarget();
      } else {
        tx = (input.moveTarget.x - this.x) / d;
        ty = (input.moveTarget.y - this.y) / d;
      }
    }
    this.moving = tx !== 0 || ty !== 0;
    this.running = this.moving && input.running;
    const speed = this.running ? PLAYER_RUN : PLAYER_WALK;
    if (this.moving) {
      this.facing = Math.atan2(ty, tx);
      const nx = this.x + tx * speed * dt;
      const ny = this.y + ty * speed * dt;
      if (!this.level.circleHitsSolid(nx, this.y, PLAYER_RADIUS)) this.x = nx;
      if (!this.level.circleHitsSolid(this.x, ny, PLAYER_RADIUS)) this.y = ny;
      // Footsteps: quiet while walking, loud and regular while running.
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.running ? 0.28 : 0.42;
        sounds.footstep(this.running);
        if (this.running) this.noisePulse = 0;
      }
    }
    // A running courier leaves a noise trail guards can hear.
    this.noisePulse += dt;
    this.inBush = this.level.inBush(this.x, this.y);

    // Pick up parcels by walking over them.
    for (const p of this.level.parcels) {
      if (!p.taken && dist(this.x, this.y, p.x, p.y) < 26) {
        p.taken = true;
        this.parcels++;
        sounds.pickup();
      }
    }
  }

  // Noise events this frame for guards to hear: {x,y} while running.
  noiseEvent() {
    if (this.running && this.moving && this.noisePulse < 0.05) {
      return { x: this.x, y: this.y, radius: 135 };
    }
    return null;
  }

  atExit() {
    const e = this.level.exit;
    return this.x > e.x && this.x < e.x + e.w && this.y > e.y && this.y < e.y + e.h;
  }
}
