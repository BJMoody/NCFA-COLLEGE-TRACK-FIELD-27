import { GameAudio } from './audio.js';

const patched = Symbol.for('ncfa.audioSafetyV16');
const TIMEOUT = Symbol('timeout');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function raceTimeout(promise, ms) {
  return Promise.race([
    Promise.resolve(promise).catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(TIMEOUT), ms))
  ]);
}

function minimumPreraceHold(path = '') {
  // The browser may reject/skip an audio clip instantly. These minimums keep
  // the visual broadcast from collapsing into one frame when that happens.
  if (/^pa\/female\/venue_welcome_/i.test(path)) return 2400;
  if (/^pa\/female\/event_/i.test(path)) return 2400;
  if (/^commentary\/(male|female)\/race_open_/i.test(path)) return 3000;
  if (/^commentary\/(male|female)\/(waterfall|one_turn)_/i.test(path)) return 1400;
  if (/^officials\/(lane_instructions|one_turn_instructions|waterfall_instructions)_/i.test(path)) return 2600;
  if (/^officials\/on_your_marks_/i.test(path)) return 1500;
  if (/^officials\/set_/i.test(path)) return 950;
  if (/^officials\/pace_assignment_/i.test(path)) return 1800;
  return 0;
}

if (!GameAudio.prototype[patched]) {
  Object.defineProperty(GameAudio.prototype, patched, { value: true });

  const originalLoad = GameAudio.prototype.load;
  const originalPlay = GameAudio.prototype.play;
  const originalQueueSpeech = GameAudio.prototype.queueSpeech;
  const originalStartCrowd = GameAudio.prototype.startCrowd;

  GameAudio.prototype.load = async function ncfaSafeLoad(relativePath) {
    const result = await raceTimeout(originalLoad.call(this, relativePath), 3000);
    if (result === TIMEOUT) {
      this.cache?.delete?.(relativePath);
      return null;
    }
    return result;
  };

  GameAudio.prototype.play = async function ncfaSafePlay(relativePath, options = {}) {
    const result = await raceTimeout(originalPlay.call(this, relativePath, options), options?.wait ? 9000 : 4000);
    return result === TIMEOUT || !result ? { played: false, duration: 0 } : result;
  };

  GameAudio.prototype.queueSpeech = async function ncfaSafeQueueSpeech(relativePath, volume = this.volumes.speech) {
    const started = performance.now();
    const queued = originalQueueSpeech.call(this, relativePath, volume);
    const result = await raceTimeout(queued, 9000);

    if (result === TIMEOUT) {
      this.stopSpeech?.();
      this.speechChain = Promise.resolve();
      this.cache?.delete?.(relativePath);
    }

    const minimum = minimumPreraceHold(relativePath);
    const elapsed = performance.now() - started;
    if (minimum > elapsed) await sleep(minimum - elapsed);

    return result === TIMEOUT ? undefined : result;
  };

  GameAudio.prototype.startCrowd = async function ncfaSafeStartCrowd() {
    const result = await raceTimeout(originalStartCrowd.call(this), 1800);
    if (result === TIMEOUT) return;
    return result;
  };
}
