import { AUDIO } from './audio.js';

export class CommentaryDirector {
  constructor(audio) {
    this.audio = audio;
    this.reset();
  }

  reset() {
    this.fired = new Set();
    this.lastPlace = null;
    this.lastSpeechAt = -999;
  }

  canFire(key, raceTime, cooldown = 7) {
    if (this.fired.has(key)) return false;
    if (raceTime - this.lastSpeechAt < cooldown) return false;
    this.fired.add(key);
    this.lastSpeechAt = raceTime;
    return true;
  }

  speak(path) {
    return this.audio.queueSpeech(path);
  }

  async preRace(eventName, startFormat) {
    const open = Math.random() < 0.5 ? 'race_open_01' : 'race_open_02';
    await this.speak(Math.random() < 0.5 ? AUDIO.female(open) : AUDIO.male(open));
    if (startFormat === 'Waterfall') await this.speak(Math.random() < 0.5 ? AUDIO.female('waterfall_01') : AUDIO.male('waterfall_01'));
    if (startFormat === 'One-Turn Stagger') await this.speak(Math.random() < 0.5 ? AUDIO.female('one_turn_01') : AUDIO.male('one_turn_01'));
  }

  update({ raceTime, eventDistance, playerDistance, place, leaderDistance, targetTime, split200, halfwaySplit, isBoxed, playerSpeed, leaderSpeed }) {
    if (!eventDistance) return;

    if (split200 && eventDistance >= 400 && this.canFire('first200', raceTime, 5)) {
      const expected = targetTime * Math.min(200 / eventDistance, 1);
      if (split200 < expected * 0.94) this.speak(AUDIO.female('pace_fast_01'));
      else this.speak(AUDIO.male('first_200_01'));
    }

    if (halfwaySplit && this.canFire('halfway', raceTime, 5)) {
      this.speak(AUDIO.male('halfway_01'));
    }

    if (isBoxed && this.canFire('boxed', raceTime, 9)) {
      this.speak(AUDIO.female('boxed_01'));
    }

    if (this.lastPlace !== null && place < this.lastPlace && this.canFire(`move-${place}`, raceTime, 8)) {
      this.speak(Math.random() < 0.5 ? AUDIO.female('move_up_01') : AUDIO.male('move_up_01'));
    }
    this.lastPlace = place;

    if (leaderDistance - playerDistance > eventDistance * 0.035 && leaderSpeed > playerSpeed * 1.02 && this.canFire('leader-pressing', raceTime, 10)) {
      this.speak(AUDIO.male('leader_pressing_01'));
    }

    const remaining = eventDistance - playerDistance;
    if (remaining <= 400 && eventDistance > 600 && this.canFire('bell', raceTime, 10)) {
      this.audio.bell();
      this.speak(Math.random() < 0.5 ? AUDIO.female('bell_01') : AUDIO.male('bell_01'));
    }

    if (remaining <= Math.min(170, eventDistance * 0.22) && this.canFire('kick', raceTime, 5)) {
      this.speak(AUDIO.male('kick_01'));
    }

    if (remaining <= Math.min(75, eventDistance * 0.1) && this.canFire('finalstretch', raceTime, 4)) {
      this.speak(Math.random() < 0.5 ? AUDIO.female('final_stretch_01') : AUDIO.male('final_stretch_01'));
    }
  }

  async finish({ place, pr = false, bigPr = false, upset = false }) {
    if (bigPr) await this.speak(AUDIO.male('big_pr_01'));
    else if (pr) await this.speak(Math.random() < 0.5 ? AUDIO.female('player_pr_01') : AUDIO.male('player_pr_01'));

    if (upset && place === 1) await this.speak(AUDIO.female('upset_01'));

    if (place === 1) return this.speak(Math.random() < 0.5 ? AUDIO.female('player_win_01') : AUDIO.male('player_win_01'));
    if (place <= 5) return this.speak(Math.random() < 0.5 ? AUDIO.female('player_mid_01') : AUDIO.male('player_mid_01'));
    return this.speak(Math.random() < 0.5 ? AUDIO.female('player_loss_01') : AUDIO.male('player_loss_01'));
  }
}
