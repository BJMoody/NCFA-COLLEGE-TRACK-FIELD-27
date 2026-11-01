import { GameAudio } from './audio.js';

const patched = Symbol.for('ncfa.audioSafetyV16');
const TIMEOUT = Symbol('timeout');

function raceTimeout(promise, ms) {
  return Promise.race([
    Promise.resolve(promise).catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(TIMEOUT), ms))
  ]);
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
    const queued = originalQueueSpeech.call(this, relativePath, volume);
    const result = await raceTimeout(queued, 9000);
    if (result === TIMEOUT) {
      this.stopSpeech?.();
      this.speechChain = Promise.resolve();
      this.cache?.delete?.(relativePath);
      return;
    }
    return result;
  };

  GameAudio.prototype.startCrowd = async function ncfaSafeStartCrowd() {
    const result = await raceTimeout(originalStartCrowd.call(this), 1800);
    if (result === TIMEOUT) return;
    return result;
  };
}
