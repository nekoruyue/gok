// ============================================================
// 《戈克世界·鹿铃亭》M4.4 音效（WebAudio 合成，不依赖外部文件）
// ============================================================
const Sfx = {
  ctx: null,

  muted: (() => { try { return localStorage.getItem('luling_muted') === '1'; } catch (e) { return false; } })(),
  music: { kind: null, timer: null, step: 0 },

  setMuted(m) {
    this.muted = !!m;
    try { localStorage.setItem('luling_muted', m ? '1' : '0'); } catch (e) {}
    if (this.muted) this.stopMusic();
  },

  // 三段很轻的循环：白天 / 夜里 / 节日（合成，不引外部音频）
  startMusic(kind) {
    if (this.muted) return;
    if (this.music.kind === kind && this.music.timer) return;
    this.init();
    if (!this.ctx) return;
    this.stopMusic();
    this.music.kind = kind;
    this.music.step = 0;
    const bars = {
      day: [261.6, 329.6, 392.0, 523.3],
      night: [220.0, 261.6, 329.6, 392.0],
      festival: [293.7, 370.0, 440.0, 587.3]
    };
    const notes = bars[kind] || bars.day;
    const playBar = () => {
      if (this.muted || !this.ctx) return;
      notes.forEach((f, i) => this.tone(f, 1.1, 'triangle', 0.012, i * 0.42));
      this.tone(notes[0] / 2, 2.4, 'sine', 0.010, 0);
    };
    playBar();
    this.music.timer = setInterval(playBar, 6400);
  },

  stopMusic() {
    if (this.music.timer) clearInterval(this.music.timer);
    this.music.timer = null;
    this.music.kind = null;
  },

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;
    }
  },

  tone(freq, dur, type = 'sine', vol = 0.05, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },

  play(name) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    switch (name) {
      case 'click': this.tone(600, 0.03, 'square', 0.02); break;
      case 'coin': this.tone(990, 0.06, 'square', 0.03); this.tone(1320, 0.08, 'square', 0.03, 0.06); break;
      case 'deal': this.tone(660, 0.08, 'sine', 0.05); this.tone(880, 0.1, 'sine', 0.05, 0.08); break;
      case 'serve': this.tone(520, 0.1, 'sine', 0.04); this.tone(660, 0.12, 'sine', 0.04, 0.1); break;
      case 'perfect': this.tone(780, 0.08, 'sine', 0.05); this.tone(1040, 0.12, 'sine', 0.05, 0.08); break;
      case 'fail': this.tone(220, 0.18, 'sawtooth', 0.03); break;
      case 'harvest': this.tone(440, 0.08, 'sine', 0.04); this.tone(550, 0.1, 'sine', 0.04, 0.08); break;
      case 'unlock': this.tone(880, 0.1, 'sine', 0.05); this.tone(1175, 0.14, 'sine', 0.05, 0.1); break;
      case 'event': this.tone(330, 0.15, 'triangle', 0.04); this.tone(495, 0.18, 'triangle', 0.04, 0.12); break;
      case 'step': this.tone(100, 0.02, 'square', 0.008); break;
    }
  }
};
