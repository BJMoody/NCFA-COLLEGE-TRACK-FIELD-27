import { GameAudio } from './audio.js';

const patched = Symbol.for('ncfa.audioSafetyV16');

function withTimeout(promise, ms, fallback) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

if (!GameAudio.prototype[patched]) {
  Object.defineProperty(GameAudio.prototype, patched, { value: true });

  const originalLoad = GameAudio.prototype.load;
  const originalPlay = GameAudio.prototype.play;
  const originalQueueSpeech = GameAudio.prototype.queueSpeech;
  const originalStartCrowd = GameAudio.prototype.startCrowd;

  GameAudio.prototype.load = function ncfaSafeLoad(relativePath) {
    return withTimeout(originalLoad.call(this, relativePath), 3500, null);
  };

  GameAudio.prototype.play = function ncfaSafePlay(relativePath, options = {}) {
    const wait = Boolean(options?.wait);
    return withTimeout(
      originalPlay.call(this, relativePath, options),
      wait ? 12000 : 4500,
      { played: false, duration: 0 }
    );
  };

  GameAudio.prototype.queueSpeech = function ncfaSafeQueueSpeech(relativePath, volume = this.volumes.speech) {
    const queued = originalQueueSpeech.call(this, relativePath, volume);
    // Speech clips are presentation, never a reason to hold the race hostage.
    return withTimeout(queued, 12000, undefined);
  };

  GameAudio.prototype.startCrowd = function ncfaSafeStartCrowd() {
    // Ambient crowd is optional. Resolve quickly even if the audio request stalls.
    return withTimeout(originalStartCrowd.call(this), 2500, undefined);
  };
}
