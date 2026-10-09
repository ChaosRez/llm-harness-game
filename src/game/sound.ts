/** WebAudio synth SFX (game.md §11) — no audio files, master −18dB. */

type SoundName = 'tick' | 'tool' | 'ok' | 'fail' | 'spawn' | '429';

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;

  /** must be called from a user gesture at least once (autoplay policy) */
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = Math.pow(10, -18 / 20); // −18dB
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  private tone(freq: number, durMs: number, type: OscillatorType, gain = 1, when = 0, slideTo?: number) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.linearRampToValueAtTime(slideTo, t0 + durMs / 1000);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + durMs / 1000 + 0.02);
  }

  play(name: SoundName) {
    if (!this.enabled || !this.ctx) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    switch (name) {
      case 'tick':
        this.tone(1400, 2, 'square', 0.12);
        break;
      case 'tool':
        this.tone(660, 60, 'sine', 0.5, 0, 990);
        break;
      case 'ok':
        this.tone(523, 70, 'sine', 0.5);
        this.tone(659, 70, 'sine', 0.5, 0.07);
        this.tone(784, 90, 'sine', 0.5, 0.14);
        break;
      case 'fail':
        this.tone(120, 150, 'sawtooth', 0.6);
        break;
      case 'spawn':
        this.tone(440, 120, 'sine', 0.5, 0, 880);
        break;
      case '429':
        this.tone(180, 90, 'square', 0.4);
        this.tone(180, 90, 'square', 0.4, 0.12);
        break;
    }
  }
}

export const sfx = new Sfx();
