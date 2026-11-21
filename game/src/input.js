// input.js — keyboard (WASD / arrows, Shift to run, M mute, P pause,
// R restart, Enter confirm) and mouse (click a floor tile to walk there).
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.moveTarget = null; // {x,y} in world pixels, set by a mouse click
    this.onKey = null;      // fn(code) — the game wires state keys here
    this.onClick = null;    // fn(x,y) — the game wires clicks here
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) {
        this.keys.add(e.code);
        if (this.onKey) this.onKey(e.code);
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      if (this.onClick) this.onClick(x, y);
    });
  }

  // Normalised movement vector from the held keys, or {x:0,y:0}.
  moveVector() {
    let x = 0, y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv; y *= inv;
    }
    return { x, y };
  }

  get running() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  clearMoveTarget() {
    this.moveTarget = null;
  }
}
