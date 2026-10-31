const DEFAULT_ASSET_BASE = './public/audio';

export const AUDIO_FILES = {
  paFemale: {
    venueWelcome: ['pa/female/venue_welcome_01.mp3', 'pa/female/venue_welcome_02.mp3'],
    firstCall: ['pa/female/first_call_01.mp3'],
    secondCall: ['pa/female/second_call_01.mp3'],
    finalCall: ['pa/female/final_call_01.mp3'],
    event100: ['pa/female/event_100m_01.mp3'],
    event200: ['pa/female/event_200m_01.mp3'],
    event400: ['pa/female/event_400m_01.mp3'],
    event800: ['pa/female/event_800m_01.mp3'],
    event1500: ['pa/female/event_1500m_01.mp3'],
    event3000: ['pa/female/event_3000m_01.mp3'],
    event5000: ['pa/female/event_5000m_01.mp3'],
    event10000: ['pa/female/event_10000m_01.mp3'],
    fieldEvents: ['pa/female/field_events_01.mp3'],
    resultsPosted: ['pa/female/results_posted_01.mp3'],
    recordAlert: ['pa/female/record_alert_01.mp3']
  },
  commentaryFemale: {
    raceOpen: ['commentary/female/race_open_01.mp3', 'commentary/female/race_open_02.mp3'],
    waterfall: ['commentary/female/waterfall_01.mp3'],
    oneTurn: ['commentary/female/one_turn_01.mp3'],
    paceFast: ['commentary/female/pace_fast_01.mp3'],
    paceControlled: ['commentary/female/pace_controlled_01.mp3'],
    moveUp: ['commentary/female/move_up_01.mp3'],
    boxed: ['commentary/female/boxed_01.mp3'],
    bell: ['commentary/female/bell_01.mp3'],
    finalStretch: ['commentary/female/final_stretch_01.mp3'],
    playerWin: ['commentary/female/player_win_01.mp3'],
    playerMid: ['commentary/female/player_mid_01.mp3'],
    playerLoss: ['commentary/female/player_loss_01.mp3'],
    playerPR: ['commentary/female/player_pr_01.mp3'],
    upset: ['commentary/female/upset_01.mp3']
  },
  commentaryMale: {
    raceOpen: ['commentary/male/race_open_01.mp3', 'commentary/male/race_open_02.mp3'],
    waterfall: ['commentary/male/waterfall_01.mp3'],
    oneTurn: ['commentary/male/one_turn_01.mp3'],
    first200: ['commentary/male/first_200_01.mp3'],
    halfway: ['commentary/male/halfway_01.mp3'],
    moveUp: ['commentary/male/move_up_01.mp3'],
    leaderPressing: ['commentary/male/leader_pressing_01.mp3'],
    bell: ['commentary/male/bell_01.mp3'],
    kick: ['commentary/male/kick_01.mp3'],
    finalStretch: ['commentary/male/final_stretch_01.mp3'],
    playerWin: ['commentary/male/player_win_01.mp3'],
    playerMid: ['commentary/male/player_mid_01.mp3'],
    playerLoss: ['commentary/male/player_loss_01.mp3'],
    playerPR: ['commentary/male/player_pr_01.mp3'],
    bigPR: ['commentary/male/big_pr_01.mp3']
  },
  officials: {
    standingMarks: ['officials/on_your_marks_standing_01.mp3'],
    blocksMarks: ['officials/on_your_marks_blocks_01.mp3'],
    set: ['officials/set_01.mp3'],
    standUp: ['officials/stand_up_01.mp3'],
    falseStart: ['officials/false_start_01.mp3'],
    recall: ['officials/recall_01.mp3'],
    waterfallInstructions: ['officials/waterfall_instructions_01.mp3'],
    oneTurnInstructions: ['officials/one_turn_instructions_01.mp3'],
    laneInstructions: ['officials/lane_instructions_01.mp3'],
    paceAssignment: ['officials/pace_assignment_01.mp3'],
    paceDrop: ['officials/pace_drop_01.mp3']
  },
  sfx: {
    starterGun: ['sfx/starter_gun_01.wav'],
    recallGun: ['sfx/recall_gun_01.wav'],
    crowdLoop: ['sfx/crowd_stadium_loop_01.mp3'],
    crowdWin: ['sfx/crowd_win_roar_01.mp3'],
    crowdMid: ['sfx/crowd_mid_reaction_01.mp3'],
    crowdLoss: ['sfx/crowd_loss_reaction_01.mp3'],
    bell: ['sfx/final_lap_bell_01.wav'],
    spikes: ['sfx/spikes_track_loop_01.mp3']
  }
};

export class StadiumAudio {
  constructor(assetBase = DEFAULT_ASSET_BASE) {
    this.assetBase = assetBase.replace(/\/$/, '');
    this.ctx = null;
    this.master = null;
    this.crowd = null;
    this.enabled = true;
    this.stepCooldown = 0;
    this.htmlAudio = new Set();
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

  assetUrl(relativePath) {
    return `${this.assetBase}/${relativePath}`;
  }

  async fileExists(relativePath) {
    try {
      const response = await fetch(this.assetUrl(relativePath), { method: 'HEAD', cache: 'force-cache' });
      return response.ok;
    } catch {
      return false;
    }
  }

  playFile(relativePath, { volume = 1, loop = false } = {}) {
    if (!this.enabled || !relativePath) return null;
    const audio = new Audio(this.assetUrl(relativePath));
    audio.preload = 'auto';
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.loop = loop;
    this.htmlAudio.add(audio);
    const cleanup = () => this.htmlAudio.delete(audio);
    audio.addEventListener('ended', cleanup, { once: true });
    audio.addEventListener('error', cleanup, { once: true });
    audio.play().catch(cleanup);
    return audio;
  }

  playRandom(group, cue, options = {}) {
    const files = AUDIO_FILES[group]?.[cue] || [];
    if (!files.length) return null;
    const file = files[(Math.random() * files.length) | 0];
    return this.playFile(file, options);
  }

  playOfficial(cue, options = {}) {
    return this.playRandom('officials', cue, { volume: 0.96, ...options });
  }

  playPA(cue, options = {}) {
    return this.playRandom('paFemale', cue, { volume: 0.76, ...options });
  }

  playCommentary(cue, preferredVoice = null, options = {}) {
    const group = preferredVoice === 'female'
      ? 'commentaryFemale'
      : preferredVoice === 'male'
        ? 'commentaryMale'
        : (Math.random() < 0.5 ? 'commentaryFemale' : 'commentaryMale');
    return this.playRandom(group, cue, { volume: 0.86, ...options });
  }

  stopVoices() {
    for (const audio of this.htmlAudio) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.htmlAudio.clear();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.master) this.master.gain.setTargetAtTime(enabled ? 0.65 : 0.0001, this.ctx.currentTime, 0.04);
    if (!enabled) this.stopVoices();
  }

  noiseBuffer(seconds = 2) {
    if (!this.ctx) return null;
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
    if (this.playRandom('sfx', 'starterGun', { volume: 0.95 })) return;
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
  }

  falseStartTone() {
    if (this.playRandom('sfx', 'recallGun', { volume: 0.9 })) return;
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
    const cue = intensity > 0.8 ? 'crowdWin' : intensity < 0.3 ? 'crowdLoss' : 'crowdMid';
    if (this.playRandom('sfx', cue, { volume: 0.75 + intensity * 0.2 })) return;
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
