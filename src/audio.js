export class StadiumAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.crowd = null;
    this.enabled = true;
    this.stepCooldown = 0;
  }

  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.65;
    this.master.connect(this.ctx.destination);
    this.startCrowdBed();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.master) this.master.gain.setTargetAtTime(enabled ? 0.65 : 0.0001, this.ctx.currentTime, 0.04);
  }

  noiseBuffer(seconds = 2) {
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = white * (0.42 + 0.58 * Math.sin(i * 0.00023) ** 2);
    }
    return buffer;
  }

  startCrowdBed() {
    if (!this.ctx || this.crowd) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer(3.8);
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 820;
    filter.Q.value = 0.58;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.026;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.17;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(gain.gain);

    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    lfo.start();
    this.crowd = { source, filter, gain, lfo };
  }

  crowdLevel(level) {
    if (!this.crowd || !this.ctx) return;
    const target = 0.018 + Math.max(0, Math.min(1, level)) * 0.075;
    this.crowd.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
  }

  starterGun() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(0.16);
    const high = this.ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 650;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.95, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    noise.connect(high).connect(gain).connect(this.master);
    noise.start(now);

    const crack = this.ctx.createOscillator();
    crack.type = 'square';
    crack.frequency.setValueAtTime(180, now);
    crack.frequency.exponentialRampToValueAtTime(55, now + 0.09);
    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.32, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    crack.connect(crackGain).connect(this.master);
    crack.start(now);
    crack.stop(now + 0.12);
  }

  falseStartTone() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    [0, 0.16].forEach((offset) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.value = 610;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);
      osc.connect(gain).connect(this.master);
      osc.start(now + offset);
      osc.stop(now + offset + 0.11);
    });
  }

  announcementChime() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25].forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.07, now + index * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.11 + 0.4);
      osc.connect(gain).connect(this.master);
      osc.start(now + index * 0.11);
      osc.stop(now + index * 0.11 + 0.42);
    });
  }

  cheer(intensity = 0.5) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer(1.5);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1050;
    filter.Q.value = 0.65;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08 + intensity * 0.14, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
  }

  footstep(strength = 0.5) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.045);
    gain.gain.setValueAtTime(0.018 + strength * 0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.06);
  }
}
