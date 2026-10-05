import { SONGS, noteFreq, type Song, type SongId, type Wave } from './songs';

export type SfxId =
  | 'select' | 'confirm' | 'cancel' | 'bump' | 'warp' | 'encounter'
  | 'hit' | 'hitSuper' | 'hitWeak' | 'miss' | 'faint' | 'levelUp' | 'run' | 'win' | 'lose';

const STORE_KEY = 'pokimon2.muted';
const MASTER = 0.5;
const LOOKAHEAD = 0.14;   // s programados por adelantado
const TICK_MS = 30;

function readMuted(): boolean {
  try { return localStorage.getItem(STORE_KEY) === '1'; } catch { return false; }
}

/**
 * Audio 100% procedural con Web Audio: osciladores de pulso/triángulo y ruido.
 * El AudioContext se crea en la primera interacción (política de autoplay de los navegadores).
 */
class AudioEngine {
  private ctx?: AudioContext;
  private master?: GainNode;
  private musicBus?: GainNode;
  private sfxBus?: GainNode;
  private noiseBuf?: AudioBuffer;
  private pulseCache = new Map<number, PeriodicWave>();
  private wanted: SongId | null = null;
  private seq?: { song: Song; id: SongId; step: number; next: number; timer: number };
  private notesPlayed = 0;
  muted = readMuted();

  /** Llamar desde un gesto del usuario. Idempotente. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.55; this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.wanted && !this.seq) this.startSeq(this.wanted);
  }

  getState() {
    return { ctx: this.ctx?.state ?? 'none', song: this.seq?.id ?? null, wanted: this.wanted, muted: this.muted, notes: this.notesPlayed };
  }

  // ------------------------------------------------------------------ mute

  setMuted(m: boolean): void {
    this.muted = m;
    try { localStorage.setItem(STORE_KEY, m ? '1' : '0'); } catch { /* sin almacenamiento: no pasa nada */ }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : MASTER, this.ctx.currentTime, 0.015);
  }
  toggleMute(): boolean { this.setMuted(!this.muted); return this.muted; }

  // ------------------------------------------------------------------ música

  playMusic(id: SongId | null): void {
    if (this.wanted === id && (this.seq?.id === id || !this.ctx)) return;
    this.wanted = id;
    this.stopSeq();
    if (id && this.ctx) this.startSeq(id);
  }

  /** Baja la música un momento (para que suenen los jingles). */
  duck(ms: number): void {
    if (!this.ctx || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(0.1, t, 0.05);
    this.musicBus.gain.setTargetAtTime(0.55, t + ms / 1000, 0.25);
  }

  private startSeq(id: SongId): void {
    if (!this.ctx) return;
    const song = SONGS[id];
    this.seq = { song, id, step: 0, next: this.ctx.currentTime + 0.08, timer: window.setInterval(() => this.tick(), TICK_MS) };
  }
  private stopSeq(): void {
    if (this.seq) window.clearInterval(this.seq.timer);
    this.seq = undefined;
  }

  private tick(): void {
    const s = this.seq, ctx = this.ctx;
    if (!s || !ctx) return;
    const stepDur = 60 / s.song.bpm / 2; // corcheas
    while (s.next < ctx.currentTime + LOOKAHEAD) {
      for (const ch of s.song.channels) {
        const tok = ch.steps[s.step % ch.steps.length];
        if (tok === '.') continue;
        if (ch.wave === 'noise') this.drum(tok, s.next, ch.vol, this.musicBus!);
        else {
          const f = noteFreq(tok);
          if (f) this.tone(f, s.next, stepDur * 0.9, ch.wave, ch.vol, this.musicBus!);
        }
      }
      s.next += stepDur;
      s.step = (s.step + 1) % s.song.channels[0].steps.length;
    }
  }

  // ------------------------------------------------------------------ síntesis

  private pulse(duty: number): PeriodicWave {
    let w = this.pulseCache.get(duty);
    if (!w) {
      const n = 32, real = new Float32Array(n), imag = new Float32Array(n);
      for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      w = this.ctx!.createPeriodicWave(real, imag);
      this.pulseCache.set(duty, w);
    }
    return w;
  }

  /** Una nota con envolvente de ataque rápido y caída; `endFreq` produce un barrido. */
  private tone(freq: number, t: number, dur: number, wave: Wave, vol: number, bus: GainNode, endFreq?: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    if (wave === 'triangle') osc.type = 'triangle';
    else osc.setPeriodicWave(this.pulse(wave === 'pulse12' ? 0.125 : wave === 'pulse25' ? 0.25 : 0.5));
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus);
    osc.start(t); osc.stop(t + dur + 0.02);
    this.notesPlayed++;
  }

  private noise(t: number, dur: number, vol: number, bus: GainNode, filter: BiquadFilterType, freq: number, endFreq?: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf!;
    const f = ctx.createBiquadFilter();
    f.type = filter; f.frequency.setValueAtTime(freq, t);
    if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
    this.notesPlayed++;
  }

  private drum(kind: string, t: number, vol: number, bus: GainNode): void {
    if (kind === 'k') this.tone(130, t, 0.12, 'triangle', vol * 2.2, bus, 40);
    else if (kind === 's') this.noise(t, 0.1, vol * 1.4, bus, 'highpass', 1800);
    else if (kind === 'h') this.noise(t, 0.04, vol * 0.8, bus, 'highpass', 7000);
  }

  // ------------------------------------------------------------------ efectos

  sfx(id: SfxId): void {
    const ctx = this.ctx, bus = this.sfxBus;
    if (!ctx || !bus) return;
    const t = ctx.currentTime + 0.005;
    const seq = (notes: number[], step: number, wave: Wave, vol: number, len = step * 1.4) =>
      notes.forEach((n, i) => this.tone(n, t + i * step, len, wave, vol, bus));
    switch (id) {
      case 'select': this.tone(880, t, 0.05, 'pulse50', 0.35, bus); break;
      case 'confirm': seq([660, 990], 0.055, 'pulse50', 0.4); break;
      case 'cancel': seq([520, 360], 0.055, 'pulse50', 0.35); break;
      case 'bump': this.tone(110, t, 0.07, 'pulse25', 0.4, bus, 70); break;
      case 'warp': seq([392, 523, 659, 784], 0.06, 'pulse25', 0.3); break;
      case 'encounter':
        seq([880, 660, 880, 660, 880, 1175], 0.055, 'pulse50', 0.35);
        this.tone(220, t + 0.3, 0.5, 'pulse25', 0.3, bus, 1400);
        break;
      case 'hit':
        this.noise(t, 0.13, 0.7, bus, 'lowpass', 3000, 300);
        this.tone(240, t, 0.12, 'pulse50', 0.4, bus, 60);
        break;
      case 'hitSuper':
        this.noise(t, 0.2, 0.9, bus, 'lowpass', 4500, 250);
        this.tone(320, t, 0.18, 'pulse50', 0.5, bus, 50);
        this.tone(1300, t + 0.02, 0.1, 'pulse25', 0.3, bus, 500);
        break;
      case 'hitWeak':
        this.noise(t, 0.08, 0.35, bus, 'lowpass', 1500, 300);
        this.tone(180, t, 0.08, 'pulse50', 0.25, bus, 90);
        break;
      case 'miss': this.noise(t, 0.16, 0.25, bus, 'bandpass', 3000, 800); break;
      case 'faint': this.tone(440, t, 0.7, 'triangle', 0.55, bus, 55); break;
      case 'levelUp': {
        const n = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
        n.forEach((f, i) => this.tone(f, t + i * 0.085, i === n.length - 1 ? 0.5 : 0.11, 'pulse25', 0.4, bus));
        break;
      }
      case 'run': seq([330, 440, 587, 784], 0.045, 'pulse25', 0.3); break;
      case 'win': {
        [[523.25, 0], [523.25, 0.12], [523.25, 0.24], [659.25, 0.36], [783.99, 0.6], [1046.5, 0.85]].forEach(([f, d], i, a) =>
          this.tone(f, t + d, i === a.length - 1 ? 0.6 : 0.16, 'pulse25', 0.4, bus));
        break;
      }
      case 'lose': seq([392, 349.23, 311.13, 261.63], 0.2, 'triangle', 0.5, 0.3); break;
    }
  }
}

export const audio = new AudioEngine();
