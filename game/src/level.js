// level.js — turns a config map into the world the game plays in:
// solid rectangles (walls and crates), bushes that block sight, parcels,
// the exit and the courier's start. Also answers "can this see that?"
import { TILE, COLS, ROWS } from './config.js';
import { segmentHitsRect } from './util.js';

export class Level {
  constructor(def) {
    this.def = def;
    this.solids = [];   // {x,y,w,h} in pixels — walls and crates, block movement and sight
    this.bushes = [];   // {x,y,w,h} — block sight, hide the courier, walkable
    this.parcels = [];  // {x,y,taken}
    this.exit = null;   // {x,y,w,h}
    this.start = { x: TILE * 1.5, y: TILE * 1.5 };
    this.exitOpen = false;
    def.map.forEach((row, ty) => {
      for (let tx = 0; tx < row.length; tx++) {
        const px = tx * TILE, py = ty * TILE;
        const c = row[tx];
        if (c === '#') this.solids.push({ x: px, y: py, w: TILE, h: TILE });
        else if (c === 'C') this.solids.push({ x: px + 4, y: py + 4, w: TILE - 8, h: TILE - 8, crate: true });
        else if (c === 'B') this.bushes.push({ x: px, y: py, w: TILE, h: TILE });
        else if (c === '*') this.parcels.push({ x: px + TILE / 2, y: py + TILE / 2, taken: false });
        else if (c === 'E') this.exit = { x: px, y: py, w: TILE, h: TILE };
        else if (c === 'P') this.start = { x: px + TILE / 2, y: py + TILE / 2 };
      }
    });
  }

  // Tile at pixel (x,y): '#', 'C', 'B' or '.'.
  tileAt(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
    return this.def.map[ty][tx];
  }

  // Is the pixel point inside a solid (wall or crate)?
  solidAt(x, y) {
    return this.tileAt(x, y) === '#' || this.tileAt(x, y) === 'C';
  }

  // Circle (x,y,r) overlaps any solid? Used for movement collision.
  circleHitsSolid(x, y, r) {
    const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
    const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
        const c = this.def.map[ty][tx];
        if (c !== '#' && c !== 'C') continue;
        const rx = tx * TILE + (c === 'C' ? 4 : 0);
        const ry = ty * TILE + (c === 'C' ? 4 : 0);
        const rw = TILE - (c === 'C' ? 8 : 0);
        const rh = TILE - (c === 'C' ? 8 : 0);
        const nx = Math.max(rx, Math.min(x, rx + rw));
        const ny = Math.max(ry, Math.min(y, ry + rh));
        const dx = x - nx, dy = y - ny;
        if (dx * dx + dy * dy < r * r) return true;
      }
    }
    return false;
  }

  // Is the courier standing in a bush (hidden)?
  inBush(x, y) {
    return this.tileAt(x, y) === 'B';
  }

  // Line of sight: nothing solid and no bush between (x1,y1) and (x2,y2).
  // Sampled along the segment — cheap and robust for this tile size.
  clearSight(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(len / 6));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const c = this.tileAt(x1 + dx * t, y1 + dy * t);
      if (c === '#' || c === 'C' || c === 'B') return false;
    }
    return true;
  }

  // The same test against the rectangle list (used by the renderer for cones).
  sightBlockedByRect(x1, y1, x2, y2) {
    for (const r of this.solids) {
      if (segmentHitsRect(x1, y1, x2, y2, r)) return true;
    }
    for (const r of this.bushes) {
      if (segmentHitsRect(x1, y1, x2, y2, r)) return true;
    }
    return false;
  }

  parcelsLeft() {
    return this.parcels.filter((p) => !p.taken).length;
  }
}
