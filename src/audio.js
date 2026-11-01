const AUDIO_ROOT = '../public/Audio/';

function assetUrl(relativePath) {
  return new URL(`${AUDIO_ROOT}${relativePath}`, import.meta.url).href;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GameAudio {
  constructor() {
    this.enabled = true;
    this.cache = new Map();
    this.speechChain = Promise.resolve();
    this.activeSpeech = null;
    this.ambient = null;
    this.footsteps = null;
    this.volumes = { speech: 0.92, crowd: 0.48, sfx: 0.78, footsteps: 0.24 };
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stopAll();
  }

  async load(relativePath) {
    if (this.cache.has(relativePath)) return this.cache.get(relativePath);
    const audio = new Audio(assetUrl(relativePath));
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';
    const promise = new Promise((resolve) => {
      const done = () => resolve(audio);
      audio.addEventListener('loadedmetadata', done, { once: true });
      audio.addEventListener('canplaythrough', done, { once: true });
      audio.addEventListener('error', () => resolve(null), { once: true });
      audio.load();
    });
    this.cache.set(relativePath, promise);
    return promise;
  }

  async duration(relativePath) {
    const audio = await this.load(relativePath);
    return audio && Number.isFinite(audio.duration) ? audio.duration : 0;
  }

  async play(relativePath, { volume = 1, loop = false, wait = false, restart = true } = {}) {
    if (!this.enabled) return { played: false, duration: 0 };
    const template = await this.load(relativePath);
    if (!template) return { played: false, duration: 0 };
    const audio = loop ? template : template.cloneNode(true);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.loop = loop;
    if (restart) audio.currentTime = 0;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    try {
      const playPromise = audio.play();
      if (playPromise) await playPromise;
    } catch {
      return { played: false, duration };
    }
    if (!wait) return { played: true, duration, audio };
    await new Promise((resolve) => {
      audio.addEventListener('ended', resolve, { once: true });
      audio.addEventListener('error', resolve, { once: true });
    });
    return { played: true, duration };
  }

  queueSpeech(relativePath, volume = this.volumes.speech) {
    this.speechChain = this.speechChain.then(async () => {
      if (!this.enabled) return;
      const audio = await this.load(relativePath);
      if (!audio) return;
      const clip = audio.cloneNode(true);
      clip.volume = volume;
      this.activeSpeech = clip;
      try {
        await clip.play();
      } catch {
        this.activeSpeech = null;
        return;
      }
      await new Promise((resolve) => {
        clip.addEventListener('ended', resolve, { once: true });
        clip.addEventListener('error', resolve, { once: true });
      });
      if (this.activeSpeech === clip) this.activeSpeech = null;
    });
    return this.speechChain;
  }

  async speakNow(relativePath, volume = this.volumes.speech) {
    await this.speechChain;
    return this.queueSpeech(relativePath, volume);
  }

  stopSpeech() {
    if (this.activeSpeech) {
      this.activeSpeech.pause();
      this.activeSpeech.currentTime = 0;
      this.activeSpeech = null;
    }
    this.speechChain = Promise.resolve();
  }

  async startCrowd() {
    if (this.ambient || !this.enabled) return;
    const result = await this.play('sfx/crowd_stadium_loop_01.mp3', { volume: this.volumes.crowd, loop: true });
    if (result.audio) this.ambient = result.audio;
  }

  setCrowdLevel(level) {
    if (!this.ambient) return;
    this.ambient.volume = Math.max(0.08, Math.min(0.8, this.volumes.crowd * level));
  }

  async startFootsteps() {
    if (this.footsteps || !this.enabled) return;
    const result = await this.play('sfx/spikes_track_loop_01.mp3', { volume: this.volumes.footsteps, loop: true });
    if (result.audio) this.footsteps = result.audio;
  }

  stopFootsteps() {
    if (!this.footsteps) return;
    this.footsteps.pause();
    this.footsteps.currentTime = 0;
    this.footsteps = null;
  }

  async gun() {
    return this.play('sfx/starter_gun_01.mp3', { volume: this.volumes.sfx, wait: false });
  }

  async recallGun() {
    return this.play('sfx/recall_gun_01.mp3', { volume: this.volumes.sfx, wait: false });
  }

  async bell() {
    return this.play('sfx/final_lap_bell_01.mp3', { volume: 0.68, wait: false });
  }

  async crowdReaction(place) {
    const file = place === 1 ? 'sfx/crowd_win_roar_01.mp3' : place <= 5 ? 'sfx/crowd_mid_reaction_01.mp3' : 'sfx/crowd_loss_reaction_01.mp3';
    return this.play(file, { volume: place === 1 ? 0.82 : 0.56, wait: false });
  }

  async starterSequence({ blocks = false, startFormat = 'Waterfall', onCommand, onGun }) {
    this.stopSpeech();
    const instructions = startFormat === 'One-Turn Stagger'
      ? 'officials/one_turn_instructions_01.mp3'
      : startFormat === 'Waterfall'
        ? 'officials/waterfall_instructions_01.mp3'
        : 'officials/lane_instructions_01.mp3';

    onCommand?.('OFFICIAL INSTRUCTIONS');
    await this.queueSpeech(instructions);
    await delay(350 + Math.random() * 650);

    onCommand?.('ON YOUR MARKS');
    await this.queueSpeech(blocks ? 'officials/on_your_marks_blocks_01.mp3' : 'officials/on_your_marks_standing_01.mp3');
    await delay(900 + Math.random() * 1500);

    if (blocks) {
      onCommand?.('SET');
      await this.queueSpeech('officials/set_01.mp3');
      await delay(700 + Math.random() * 1300);
    } else {
      await delay(350 + Math.random() * 900);
    }

    onCommand?.('');
    await this.gun();
    onGun?.();
  }

  stopAll() {
    this.stopSpeech();
    if (this.ambient) { this.ambient.pause(); this.ambient = null; }
    this.stopFootsteps();
  }
}

export const AUDIO = {
  pa: {
    welcome: ['pa/female/venue_welcome_01.mp3', 'pa/female/venue_welcome_02.mp3'],
    firstCall: 'pa/female/first_call_01.mp3',
    secondCall: 'pa/female/second_call_01.mp3',
    finalCall: 'pa/female/final_call_01.mp3',
    results: 'pa/female/Official results have been posted.mp3',
    event: {
      '100m': 'pa/female/event_100m_01.mp3', '200m': 'pa/female/event_200m_01.mp3', '400m': 'pa/female/event_400m_01.mp3',
      '800m': 'pa/female/event_800m_01.mp3', '1500m': 'pa/female/event_1500m_01.mp3', '3000m': 'pa/female/event_3000m_01.mp3',
      '5000m': 'pa/female/event_5000m_01.mp3', '10000m': 'pa/female/event_10000m_01.mp3'
    }
  },
  female: (name) => `commentary/female/${name}.mp3`,
  male: (name) => `commentary/male/${name}.mp3`
};

export { delay };
