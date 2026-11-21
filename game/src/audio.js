// audio.js — every sound is synthesised with WebAudio: no audio files,
// no network. A soft night ambience hums under the game; footsteps tick,
// pickups chime, alerts sting, and winning plays a short phrase.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ambience = null;
  }

  // Browsers only allow audio after a user gesture; call from the first one.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.startAmbience();
  }

  startAmbience() {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    osc.start();
    lfo.start();
    this.ambience = gain;
  }

  setMuted(m) {
    this.muted = m;
    if (this.ambience) this.ambience.gain.value = m ? 0 : 0.035;
  }

  tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Short filtered-noise tick, like a soft footstep on concrete.
  footstep(running) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const dur = 0.05;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = running ? 900 : 480;
    const gain = ctx.createGain();
    gain.gain.value = running ? 0.16 : 0.07;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  pickup() {
    this.tone(660, 0.12, 'sine', 0.14);
    this.tone(990, 0.18, 'sine', 0.12, 0.08);
  }

  noticed() {
    this.tone(520, 0.14, 'triangle', 0.12);
  }

  alert() {
    this.tone(392, 0.16, 'sawtooth', 0.09);
    this.tone(311, 0.22, 'sawtooth', 0.09, 0.14);
  }

  caught() {
    this.tone(220, 0.3, 'sawtooth', 0.12, 0, 110);
    this.tone(165, 0.4, 'square', 0.07, 0.18, 82);
  }

  levelClear() {
    [523, 659, 784].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.13, i * 0.11));
  }

  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.28, 'sine', 0.13, i * 0.13));
  }

  click() {
    this.tone(880, 0.05, 'sine', 0.08);
  }
}
