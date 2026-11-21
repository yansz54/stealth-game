// render.js — draws the whole night: floor tiles, walls, crates and
// bushes, the glowing parcels and exit, the courier and the guards with
// their vision cones, then a darkness layer with holes of light, dust
// motes, and the HUD. Everything is procedural canvas art — no images.
import { TILE, VIEW_W, VIEW_H } from './config.js';
import { mulberry32, clamp } from './util.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.floorCache = null;
    this.floorLevel = -1;
    this.motes = [];
    const rng = mulberry32(20261122);
    for (let i = 0; i < 70; i++) {
      this.motes.push({
        x: rng() * VIEW_W, y: rng() * VIEW_H,
        r: 0.6 + rng() * 1.6, s: 4 + rng() * 9, ph: rng() * Math.PI * 2,
      });
    }
  }

  // The floor is pre-rendered once per level: dark slate tiles with a
  // checker tint and a few speckles, so the frame stays cheap.
  buildFloor(level, levelIndex) {
    const off = document.createElement('canvas');
    off.width = VIEW_W; off.height = VIEW_H;
    const c = off.getContext('2d');
    const rng = mulberry32(1000 + levelIndex * 77);
    c.fillStyle = '#12141d';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let ty = 0; ty < 11; ty++) {
      for (let tx = 0; tx < 20; tx++) {
        const ch = level.def.map[ty][tx];
        if (ch === '#') continue;
        const px = tx * TILE, py = ty * TILE;
        c.fillStyle = (tx + ty) % 2 === 0 ? '#1d2133' : '#1a1e2e';
        c.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
        // faint tile seam
        c.strokeStyle = 'rgba(255,255,255,0.03)';
        c.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      }
    }
    // speckles
    for (let i = 0; i < 260; i++) {
      c.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.25)';
      c.fillRect(rng() * VIEW_W, rng() * VIEW_H, 2, 2);
    }
    this.floorCache = off;
    this.floorLevel = levelIndex;
  }

  draw(game, time) {
    const ctx = this.ctx;
    const { level, player, guards } = game;
    if (this.floorLevel !== game.levelIndex) this.buildFloor(level, game.levelIndex);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.drawImage(this.floorCache, 0, 0);

    this.drawBushes(ctx, level, time);
    this.drawWalls(ctx, level);
    this.drawCrates(ctx, level);
    this.drawParcels(ctx, level, time);
    this.drawExit(ctx, level, time);
    this.drawMoveTarget(ctx, game);
    this.drawPlayer(ctx, player, time);
    this.drawGuards(ctx, guards, level, time);
    this.drawLighting(ctx, player, guards, level);
    this.drawMotes(ctx, time);
    this.drawHud(ctx, game);
    if (game.state !== 'play') this.drawOverlay(ctx, game, time);
  }

  drawWalls(ctx, level) {
    for (const s of level.solids) {
      if (s.crate) continue;
      ctx.fillStyle = '#39415c';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#4a5470';
      ctx.fillRect(s.x, s.y, s.w, 5);
      ctx.fillStyle = '#1d2130';
      ctx.fillRect(s.x, s.y + s.h - 5, s.w, 5);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
    }
  }

  drawCrates(ctx, level) {
    for (const s of level.solids) {
      if (!s.crate) continue;
      ctx.fillStyle = '#6b4a26';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#7d5730';
      ctx.fillRect(s.x, s.y, s.w, 6);
      ctx.strokeStyle = '#3d2a14';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.w, s.y + s.h);
      ctx.moveTo(s.x + s.w, s.y); ctx.lineTo(s.x, s.y + s.h);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  drawBushes(ctx, level, time) {
    for (const b of level.bushes) {
      const cx = b.x + TILE / 2, cy = b.y + TILE / 2;
      const sway = Math.sin(time / 900 + cx) * 2;
      ctx.fillStyle = '#14291a';
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const r = 13 + ((i * 37) % 9);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 18 + sway, cy + Math.sin(a) * 14, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#1d3d24';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.6;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 12, cy + Math.sin(a) * 9, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawParcels(ctx, level, time) {
    for (const p of level.parcels) {
      if (p.taken) continue;
      const pulse = 0.7 + Math.sin(time / 300 + p.x) * 0.3;
      ctx.save();
      ctx.globalAlpha = 0.5 * pulse;
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20 + pulse * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#c98a2e';
      ctx.fillRect(p.x - 10, p.y - 8, 20, 16);
      ctx.fillStyle = '#e8b25a';
      ctx.fillRect(p.x - 10, p.y - 8, 20, 5);
      ctx.strokeStyle = '#5d3c0d';
      ctx.strokeRect(p.x - 10, p.y - 8, 20, 16);
      ctx.strokeStyle = '#fff2cf';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 8); ctx.lineTo(p.x, p.y + 8);
      ctx.stroke();
    }
  }

  drawExit(ctx, level, time) {
    const e = level.exit;
    const open = level.exitOpen;
    const glow = open ? 0.55 + Math.sin(time / 260) * 0.25 : 0.12;
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.fillStyle = open ? '#39d98a' : '#c0392b';
    ctx.fillRect(e.x - 6, e.y - 6, e.w + 12, e.h + 12);
    ctx.restore();
    ctx.fillStyle = open ? '#1e7d4f' : '#4a2320';
    ctx.fillRect(e.x + 4, e.y + 4, e.w - 8, e.h - 8);
    ctx.strokeStyle = open ? '#7dffa9' : '#7a3a34';
    ctx.lineWidth = 3;
    ctx.strokeRect(e.x + 4, e.y + 4, e.w - 8, e.h - 8);
    ctx.lineWidth = 1;
    ctx.fillStyle = open ? '#d8ffe9' : '#c98a84';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'EXIT' : 'LOCKED', e.x + e.w / 2, e.y + e.h / 2 + 5);
    if (open) {
      ctx.fillStyle = '#d8ffe9';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('▲', e.x + e.w / 2, e.y + e.h / 2 - 14);
    }
  }

  drawMoveTarget(ctx, game) {
    const t = game.input.moveTarget;
    if (!t || game.state !== 'play') return;
    ctx.strokeStyle = 'rgba(125,255,169,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(t.x - 13, t.y); ctx.lineTo(t.x - 5, t.y);
    ctx.moveTo(t.x + 5, t.y); ctx.lineTo(t.x + 13, t.y);
    ctx.moveTo(t.x, t.y - 13); ctx.lineTo(t.x, t.y - 5);
    ctx.moveTo(t.x, t.y + 5); ctx.lineTo(t.x, t.y + 13);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  drawPlayer(ctx, p, time) {
    const bob = p.moving ? Math.sin(time / 90) * 2 : 0;
    ctx.save();
    ctx.translate(p.x, p.y + bob * 0.4);
    if (p.inBush) ctx.globalAlpha = 0.75;
    // cloak
    ctx.fillStyle = '#1f6f6b';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(12, 12);
    ctx.lineTo(-12, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#27a39c';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(7, 6);
    ctx.lineTo(-7, 6);
    ctx.closePath();
    ctx.fill();
    // hood
    ctx.fillStyle = '#123f3c';
    ctx.beginPath();
    ctx.arc(0, -10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9b8';
    ctx.beginPath();
    ctx.arc(Math.cos(p.facing) * 3, -10 + Math.sin(p.facing) * 3, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // running noise ring
    if (p.running && p.moving) {
      ctx.strokeStyle = 'rgba(255,220,120,0.35)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 26 + Math.sin(time / 120) * 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // A guard's vision cone, clipped by walls: cast rays across the cone
  // and stop each one at the first solid, so the cone hugs the level.
  conePolygon(guard, level) {
    const cfg = guard.cfg;
    const rays = 36;
    const pts = [{ x: guard.x, y: guard.y }];
    for (let i = 0; i <= rays; i++) {
      const a = guard.facing - cfg.coneHalfAngle + (2 * cfg.coneHalfAngle * i) / rays;
      let r = cfg.coneRange;
      const step = 6;
      for (let d = step; d <= cfg.coneRange; d += step) {
        const px = guard.x + Math.cos(a) * d;
        const py = guard.y + Math.sin(a) * d;
        if (level.solidAt(px, py) || level.tileAt(px, py) === 'B') { r = d - step; break; }
      }
      pts.push({ x: guard.x + Math.cos(a) * Math.max(r, 10), y: guard.y + Math.sin(a) * Math.max(r, 10) });
    }
    return pts;
  }

  drawGuards(ctx, guards, level, time) {
    for (const g of guards) {
      const style = g.coneStyle();
      const poly = this.conePolygon(g, level);
      // cone fill
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.closePath();
      const grad = ctx.createRadialGradient(g.x, g.y, 10, g.x, g.y, g.cfg.coneRange);
      grad.addColorStop(0, `rgba(${style.fill},0.44)`);
      grad.addColorStop(1, `rgba(${style.fill},0.08)`);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = `rgba(${style.edge},0.65)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      // body
      const bob = Math.sin(g.stepPhase) * 1.5;
      ctx.save();
      ctx.translate(g.x, g.y + bob * 0.3);
      ctx.fillStyle = '#7a2430';
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a93242';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      // helmet + visor facing
      ctx.fillStyle = '#2c1116';
      ctx.beginPath();
      ctx.arc(Math.cos(g.facing) * 4, Math.sin(g.facing) * 4, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(Math.cos(g.facing) * 8, Math.sin(g.facing) * 8, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // detection meter arc + alert mark
      if (g.meter > 0.02) {
        ctx.strokeStyle = g.meter > 0.9 ? '#ff4040' : '#ffb020';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 19, -Math.PI / 2, -Math.PI / 2 + g.meter * Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      if (style.label) {
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = style.label === '!' ? '#ff5040' : '#ffb020';
        ctx.fillText(style.label, g.x, g.y - 24);
      }
    }
  }

  // Night darkness with holes of light around the courier and each cone.
  drawLighting(ctx, player, guards, level) {
    const off = document.createElement('canvas');
    off.width = VIEW_W; off.height = VIEW_H;
    const c = off.getContext('2d');
    c.fillStyle = 'rgba(3,5,12,0.60)';
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r) => {
      const g = c.createRadialGradient(x, y, r * 0.15, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,0.95)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    };
    hole(player.x, player.y, 205);
    for (const g of guards) {
      hole(g.x, g.y, 130);
      const poly = this.conePolygon(g, level);
      c.beginPath();
      c.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) c.lineTo(poly[i].x, poly[i].y);
      c.closePath();
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.fill();
    }
    const e = level.exit;
    if (level.exitOpen) hole(e.x + TILE / 2, e.y + TILE / 2, 110);
    ctx.drawImage(off, 0, 0);
    // vignette
    const v = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawMotes(ctx, time) {
    ctx.fillStyle = 'rgba(200,220,255,0.25)';
    for (const m of this.motes) {
      const x = (m.x + Math.sin(time / 2400 + m.ph) * 12 + VIEW_W) % VIEW_W;
      const y = (m.y + (time / 1000 * m.s) % VIEW_H) % VIEW_H;
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawHud(ctx, game) {
    const { level, player } = game;
    ctx.save();
    ctx.fillStyle = 'rgba(5,8,16,0.72)';
    ctx.fillRect(0, 0, VIEW_W, 44);
    ctx.fillStyle = '#e8ecf5';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(level.def.name, 14, 28);
    // parcels
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('◆ '.repeat(player.parcels) + '◇ '.repeat(3 - player.parcels) + '  ' + player.parcels + '/3 parcels', VIEW_W / 2, 28);
    // alert state
    const worst = game.guards.reduce((m, g) => Math.max(m, g.meter), 0);
    const anyChase = game.guards.some((g) => g.state === 'chase');
    ctx.textAlign = 'right';
    ctx.fillStyle = anyChase ? '#ff5040' : worst > 0.35 ? '#ffb020' : '#7dffa9';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(anyChase ? '● SPOTTED — RUN!' : worst > 0.35 ? '● SUSPICIOUS' : '● UNSEEN', VIEW_W - 14, 20);
    ctx.fillStyle = '#9fb2d8';
    ctx.font = '12px system-ui, sans-serif';
    const mm = String(Math.floor(game.elapsed / 60)).padStart(2, '0');
    const ss = String(Math.floor(game.elapsed % 60)).padStart(2, '0');
    ctx.fillText(mm + ':' + ss + '   WASD move · Shift run · Click to walk · M sound · P pause', VIEW_W - 14, 37);
    ctx.restore();
  }

  drawOverlay(ctx, game, time) {
    const { state } = game;
    ctx.save();
    if (state === 'title') {
      ctx.fillStyle = 'rgba(3,5,12,0.82)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#27a39c';
      ctx.font = 'bold 64px system-ui, sans-serif';
      ctx.fillText('SHADOW POST', VIEW_W / 2, 210);
      ctx.fillStyle = '#e8ecf5';
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText('a night courier, three parcels, and guards who never blink', VIEW_W / 2, 258);
      ctx.fillStyle = '#9fb2d8';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('Guards see in cones. Crates block their sight. Bushes hide you.', VIEW_W / 2, 320);
      ctx.fillText('Running is fast — and loud. Collect all 3 parcels, then reach the green EXIT.', VIEW_W / 2, 346);
      ctx.fillText('WASD / arrows to move · Shift to run · click a tile to walk there · M sound · P pause', VIEW_W / 2, 392);
      const pulse = 0.7 + Math.sin(time / 300) * 0.3;
      ctx.fillStyle = `rgba(255,215,106,${pulse})`;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('Press ENTER or click to start', VIEW_W / 2, 470);
      ctx.fillStyle = '#5a6b8c';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('An original game — art, sound and levels made for this bounty', VIEW_W / 2, 660);
      return;
    }
    // Dim the board behind the end cards.
    ctx.fillStyle = 'rgba(3,5,12,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    if (state === 'caught') {
      ctx.fillStyle = '#ff5040';
      ctx.font = 'bold 54px system-ui, sans-serif';
      ctx.fillText('CAUGHT!', VIEW_W / 2, 300);
      ctx.fillStyle = '#e8ecf5';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('A guard laid hands on the courier. The parcels stay where they are.', VIEW_W / 2, 348);
      ctx.fillStyle = '#ffb020';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('Press R to try the level again', VIEW_W / 2, 420);
    } else if (state === 'levelclear') {
      ctx.fillStyle = '#7dffa9';
      ctx.font = 'bold 54px system-ui, sans-serif';
      ctx.fillText('LEVEL CLEAR', VIEW_W / 2, 300);
      ctx.fillStyle = '#e8ecf5';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(game.clearText, VIEW_W / 2, 348);
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('Press ENTER for the next level', VIEW_W / 2, 420);
    } else if (state === 'win') {
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 54px system-ui, sans-serif';
      ctx.fillText('ALL PARCELS DELIVERED', VIEW_W / 2, 280);
      ctx.fillStyle = '#e8ecf5';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('Rin slipped through every patrol and vanished into the night.', VIEW_W / 2, 330);
      ctx.fillText('Total time ' + game.totalTimeText + ' — thank you for playing Shadow Post.', VIEW_W / 2, 360);
      ctx.fillStyle = '#7dffa9';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('Press R to play again from the start', VIEW_W / 2, 430);
    } else if (state === 'paused') {
      ctx.fillStyle = '#e8ecf5';
      ctx.font = 'bold 48px system-ui, sans-serif';
      ctx.fillText('PAUSED', VIEW_W / 2, 330);
      ctx.fillStyle = '#9fb2d8';
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText('Press P to keep sneaking', VIEW_W / 2, 372);
    }
    ctx.restore();
  }
}
