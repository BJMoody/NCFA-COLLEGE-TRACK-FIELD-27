export class CommentaryDirector {
  constructor(audio) {
    this.audio = audio;
    this.reset();
  }

  reset() {
    this.eventName = null;
    this.eventDistance = 0;
    this.startFormat = null;
    this.playerPB = null;
    this.playerSeed = null;
    this.spoken = new Set();
    this.lastCueAt = -999;
  }

  setup({ eventName, eventDistance, startFormat, playerPB = null, playerSeed = null }) {
    this.reset();
    this.eventName = eventName;
    this.eventDistance = eventDistance || 0;
    this.startFormat = startFormat;
    this.playerPB = playerPB;
    this.playerSeed = playerSeed;
  }

  canSpeak(now, minimumGap = 4.0) {
    return now - this.lastCueAt >= minimumGap;
  }

  speakOnce(key, cue, voice = null, now = 0, minimumGap = 4.0) {
    if (this.spoken.has(key) || !this.canSpeak(now, minimumGap)) return false;
    this.spoken.add(key);
    this.lastCueAt = now;
    this.audio.playCommentary(cue, voice);
    return true;
  }

  preRace(now = 0) {
    if (this.startFormat === 'Waterfall') this.speakOnce('start-format', 'waterfall', 'male', now, 0);
    else if (this.startFormat === 'One-Turn Stagger') this.speakOnce('start-format', 'oneTurn', 'female', now, 0);
    else this.speakOnce('open', 'raceOpen', null, now, 0);
  }

  update({ raceTime, playerDistance, leaderDistance, playerPlace, fieldSize, playerSpeed, playerEffort }) {
    const d = playerDistance;
    const total = Math.max(1, this.eventDistance);
    const progress = d / total;
    const leaderGap = Math.max(0, leaderDistance - d);

    if (!this.spoken.has('open') && raceTime > 1.5) {
      this.speakOnce('open', 'raceOpen', null, raceTime, 0);
    }

    if (this.eventDistance === 800) {
      if (d >= 180 && d < 260) this.speakOnce('first200', 'first200', 'male', raceTime);
      if (d >= 360 && d < 460) {
        const fast = raceTime < 55.8;
        this.speakOnce('halfway', fast ? 'paceFast' : 'halfway', fast ? 'female' : 'male', raceTime);
      }
      if (d >= 560 && d < 650 && playerPlace > 3) this.speakOnce('move', 'moveUp', null, raceTime);
      if (d >= 690 && playerEffort > 0.82) this.speakOnce('kick', 'kick', 'male', raceTime);
      if (d >= 735) this.speakOnce('home', 'finalStretch', null, raceTime, 2.8);
      return;
    }

    if (this.eventDistance >= 1500) {
      if (progress >= 0.22 && progress < 0.3 && leaderGap > 10) this.speakOnce('stretching', 'leaderPressing', 'male', raceTime);
      if (progress >= 0.45 && progress < 0.56) this.speakOnce('mid', 'paceControlled', 'female', raceTime);
      if (total - d <= 410 && total - d > 320) {
        this.audio.playRandom('sfx', 'bell', { volume: 0.92 });
        this.speakOnce('bell', 'bell', null, raceTime, 0);
      }
      if (total - d <= 180 && playerEffort > 0.8) this.speakOnce('kick', 'kick', 'male', raceTime);
      if (total - d <= 90) this.speakOnce('home', 'finalStretch', null, raceTime, 2.8);
    }

    if (this.eventDistance <= 400 && progress >= 0.72) {
      this.speakOnce('home', 'finalStretch', null, raceTime, 2.4);
    }

    if (playerPlace === fieldSize && progress > 0.65 && playerSpeed < 6.5) {
      this.speakOnce('struggle', 'playerLoss', 'female', raceTime, 7.5);
    }
  }

  finish({ place, fieldSize, finishTime, previousPB }) {
    const pb = Number.isFinite(previousPB) && Number.isFinite(finishTime) && finishTime < previousPB;
    const bigPB = pb && previousPB - finishTime >= Math.max(0.8, previousPB * 0.006);

    if (place === 1) {
      this.audio.playCommentary('playerWin', Math.random() < 0.5 ? 'female' : 'male');
      this.audio.cheer(1);
    } else if (place <= Math.max(3, Math.ceil(fieldSize * 0.45))) {
      this.audio.playCommentary('playerMid', Math.random() < 0.5 ? 'female' : 'male');
      this.audio.cheer(0.48);
    } else {
      this.audio.playCommentary('playerLoss', Math.random() < 0.5 ? 'female' : 'male');
      this.audio.cheer(0.16);
    }

    if (bigPB) {
      setTimeout(() => this.audio.playCommentary('bigPR', 'male'), 1350);
    } else if (pb) {
      setTimeout(() => this.audio.playCommentary('playerPR', 'female'), 1350);
    }
  }
}
