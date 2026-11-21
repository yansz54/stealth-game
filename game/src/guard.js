// guard.js — a patrolling guard with a vision cone and a three-step mind:
// PATROL the waypoints, SUSPICIOUS when something half-seen pulls it over
// to look, CHASE when it is sure. A detection meter fills while the
// courier is inside the cone with a clear line of sight, faster up close,
// slower when the courier hides in a bush or walks; it drains in cover.
// Getting caught ends the level, so the meter always gives a way back.
import { TILE } from './config.js';
import { clamp, dist, angleTo, angleDiff } from './util.js';

export const GUARD_STATE = { PATROL: 'patrol', SUSPICIOUS: 'suspicious', CHASE: 'chase' };

export class Guard {
  constructor(def, level, cfg) {
    this.level = level;
    this.cfg = cfg;
    this.waypoints = def.waypoints.map(([tx, ty]) => ({
      x: (tx + 0.5) * TILE,
      y: (ty + 0.5) * TILE,
    }));
    this.pauseTime = def.pause || 1;
    this.wpIndex = 0;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.facing = 0;
    this.state = GUARD_STATE.PATROL;
    this.meter = 0;            // 0..1, 1 = sure
    this.pauseLeft = 0;
    this.lookTimer = 0;        // looking around while suspicious
    this.lookAngle = 0;
    this.chaseLost = 0;        // seconds without sight while chasing
    this.investigate = null;   // {x,y} point to walk to while suspicious
    this.lastSeen = null;
    this.caught = false;
    this.stepPhase = 0;
  }

  // Is the courier visible right now? Returns a visibility factor 0..1.
  visibilityOf(player) {
    const d = dist(this.x, this.y, player.x, player.y);
    if (d > this.cfg.coneRange) return 0;
    const ang = angleTo(this.x, this.y, player.x, player.y);
    if (Math.abs(angleDiff(this.facing, ang)) > this.cfg.coneHalfAngle) return 0;
    if (!this.level.clearSight(this.x, this.y, player.x, player.y)) return 0;
    // Closer and better lit means easier to spot; bushes hide well.
    let v = 1 - (d / this.cfg.coneRange) * 0.65;
    if (player.inBush) v *= 0.14;
    if (player.running) v *= 1.5;
    return clamp(v, 0.05, 1);
  }

  update(dt, player, sounds) {
    const vis = this.visibilityOf(player);
    const wasMeter = this.meter;
    if (vis > 0) {
      this.meter = clamp(this.meter + vis * 1.35 * dt, 0, 1);
      this.lastSeen = { x: player.x, y: player.y };
    } else {
      this.meter = clamp(this.meter - 0.45 * dt, 0, 1);
    }
    // Crossing the "noticed" line makes the guard turn and look.
    if (wasMeter < 0.35 && this.meter >= 0.35 && this.state === GUARD_STATE.PATROL) {
      this.state = GUARD_STATE.SUSPICIOUS;
      this.investigate = this.lastSeen ? { ...this.lastSeen } : { x: player.x, y: player.y };
      this.lookTimer = 0;
      sounds.noticed();
    }
    if (this.meter >= 1 && this.state !== GUARD_STATE.CHASE) {
      this.state = GUARD_STATE.CHASE;
      this.chaseLost = 0;
      sounds.alert();
    }
    if (this.state === GUARD_STATE.PATROL) this.updatePatrol(dt);
    else if (this.state === GUARD_STATE.SUSPICIOUS) this.updateSuspicious(dt);
    else this.updateChase(dt, player);

    // Touching the courier while chasing ends the level.
    if (this.state === GUARD_STATE.CHASE && dist(this.x, this.y, player.x, player.y) < 24) {
      this.caught = true;
    }
  }

  moveToward(tx, ty, speed, dt) {
    const d = dist(this.x, this.y, tx, ty);
    if (d < 2) return true;
    const step = Math.min(d, speed * dt);
    const nx = this.x + ((tx - this.x) / d) * step;
    const ny = this.y + ((ty - this.y) / d) * step;
    this.facing = angleTo(this.x, this.y, tx, ty);
    if (!this.level.circleHitsSolid(nx, this.y, 13)) this.x = nx;
    if (!this.level.circleHitsSolid(this.x, ny, 13)) this.y = ny;
    this.stepPhase += dt * speed * 0.06;
    return d <= speed * dt + 2;
  }

  updatePatrol(dt) {
    if (this.pauseLeft > 0) {
      this.pauseLeft -= dt;
      // Slow scan while waiting at a waypoint.
      this.facing += Math.sin(performance.now() / 1400 + this.wpIndex) * 0.35 * dt;
      return;
    }
    const wp = this.waypoints[this.wpIndex];
    if (this.moveToward(wp.x, wp.y, this.cfg.patrolSpeed, dt)) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.pauseLeft = this.pauseTime;
    }
  }

  updateSuspicious(dt) {
    if (this.investigate) {
      if (this.moveToward(this.investigate.x, this.investigate.y, this.cfg.patrolSpeed * 1.25, dt)) {
        this.investigate = null;
        this.lookTimer = 2.2;
        this.lookAngle = this.facing;
      }
      return;
    }
    // Look around, then give up and go back to the route.
    this.lookTimer -= dt;
    this.facing = this.lookAngle + Math.sin((2.2 - this.lookTimer) * 2.4) * 1.1;
    if (this.lookTimer <= 0) {
      this.state = GUARD_STATE.PATROL;
      this.meter = Math.min(this.meter, 0.3);
    }
  }

  updateChase(dt, player) {
    const vis = this.visibilityOf(player);
    if (vis > 0) {
      this.chaseLost = 0;
      this.lastSeen = { x: player.x, y: player.y };
    } else {
      this.chaseLost += dt;
    }
    const target = this.lastSeen || { x: player.x, y: player.y };
    this.moveToward(target.x, target.y, this.cfg.chaseSpeed, dt);
    if (this.chaseLost > 2.5) {
      // Lost the trail: go and check where the courier was last seen.
      this.state = GUARD_STATE.SUSPICIOUS;
      this.investigate = this.lastSeen ? { ...this.lastSeen } : null;
      this.lookTimer = 0;
      this.meter = 0.55;
    }
  }

  // Cone colour and label for the renderer.
  coneStyle() {
    if (this.state === GUARD_STATE.CHASE) return { fill: '255,64,64', edge: '255,120,120', label: '!' };
    if (this.state === GUARD_STATE.SUSPICIOUS || this.meter > 0.35) return { fill: '255,170,40', edge: '255,200,90', label: '?' };
    return { fill: '255,220,90', edge: '255,235,150', label: '' };
  }
}
