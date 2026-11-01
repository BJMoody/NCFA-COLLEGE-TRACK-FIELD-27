import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { EVENTS, ROSTER } from './data.js';
import { GameAudio, delay } from './audio.js';
import { stadiumPoint, INNER_RADIUS, LANE_WIDTH, LAP } from './world.js';

const OUTER_RADIUS = INNER_RADIUS + LANE_WIDTH * 8.6;
const touchDevice = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;

// --- Roster / visual variety -------------------------------------------------
const looks = [
  { skin: 0x8f5d42, hairStyle: 'fade', trim: '#f4d03f' },
  { skin: 0x5d3627, hairStyle: 'short-curls', trim: '#f4f6f7' },
  { skin: 0xc68862, hairStyle: 'waves', trim: '#d6eaf8' },
  { skin: 0xe1b38c, hairStyle: 'messy-short', trim: '#f5b7b1' },
  { skin: 0x704832, hairStyle: 'braids', trim: '#d2b4de' },
  { skin: 0xb97854, hairStyle: 'buzz', trim: '#fad7a0' },
  { skin: 0xd6a27c, hairStyle: 'side-part', trim: '#d5f5e3' },
  { skin: 0x4c2c20, hairStyle: 'twists', trim: '#a9cce3' }
];

const playerSeed = ROSTER.find((r) => r.player);
if (playerSeed) playerSeed.rating = Math.max(playerSeed.rating || 78, 80);
ROSTER.forEach((runner, i) => Object.assign(runner, looks[i % looks.length]));

// Keep heats competitive around the user instead of silently stacking the field.
const playerRating = playerSeed?.rating ?? 80;
const opponentOffsets = [0, 0.7, -0.4, 0.3, 1.0, -0.2, -0.8, 0.5];
ROSTER.forEach((runner, i) => {
  if (!runner.player) runner.rating = playerRating + (opponentOffsets[i] ?? 0);
});

// One-turn 800 needs a real target lane after the break. The stock engine only
// initialises laneFloat inward when the event is marked as waterfall-capable.
if (EVENTS['800m']) EVENTS['800m'].laneRules = 'waterfall';
if (EVENTS['100m']) {
  EVENTS['100m'].startOptions = ['Straight Start'];
  EVENTS['100m'].laneRules = 'straight-lanes';
}

// --- Start geometry -----------------------------------------------------------
// Course positions are chosen so the starts read correctly on this stadium model.
// 10,000m remains an arced non-lane start near the principal finish area rather
// than being incorrectly forced onto a bend simply because it is a long race.
const START_BASE = {
  '200m': 112,
  '400m': 310,
  '800m': 310,
  '1500m': 112,
  '3000m': 310,
  '5000m': 112,
  '10000m': 0
};

const startState = {
  phase: 'idle',
  walkProgress: 1,
  ready: false,
  gun: false,
  falseStart: false,
  falseStarts: 0,
  event: '',
  blocks: false
};
window.__NCFA_START_STATE = startState;

function eventName() {
  return document.querySelector('#race-event-label')?.textContent?.trim() || '';
}
function startDetail() {
  return document.querySelector('#starter-detail')?.textContent || '';
}
function raceClock() {
  return document.querySelector('#race-clock')?.textContent?.trim() || '0:00.00';
}
function raceHudActive() {
  return Boolean(document.querySelector('#race-hud.screen--active'));
}

function laneRadius(lane) {
  return INNER_RADIUS + (lane - 0.5) * LANE_WIDTH;
}
function curvedWaterfall(base, index, total) {
  const laneFloat = 1.0 + (index / Math.max(1, total - 1)) * 6.2;
  return {
    course: base + (laneFloat - 1) * 0.62,
    radius: INNER_RADIUS + (laneFloat - 0.5) * LANE_WIDTH
  };
}
function staggerCourse(base, lane, scale = 3.0) {
  return base + (lane - 1) * scale;
}

function athleteStartPose(ev, detail, index, total) {
  const lane = index + 1;
  if (ev === '100m') {
    const chuteZ = -(OUTER_RADIUS + 5.4);
    return {
      p: new THREE.Vector3(-50, 0.08, chuteZ - LANE_WIDTH * 4 + (lane - 0.5) * LANE_WIDTH),
      ahead: new THREE.Vector3(-48, 0.08, chuteZ - LANE_WIDTH * 4 + (lane - 0.5) * LANE_WIDTH)
    };
  }

  const base = START_BASE[ev] ?? 0;
  const waterfall = /waterfall/i.test(detail) || ['1500m', '3000m', '5000m', '10000m'].includes(ev);
  let course;
  let radius;
  if (waterfall) ({ course, radius } = curvedWaterfall(base, index, total));
  else {
    course = staggerCourse(base, lane, ev === '200m' ? 3.5 : 3.0);
    radius = laneRadius(lane);
  }
  return { p: stadiumPoint(course, radius), ahead: stadiumPoint(course + 1.2, radius) };
}

function sortedAthletes(scene) {
  const athletes = [];
  scene.traverse((o) => {
    if (o.userData?.isNCFAAthlete && o.userData?.rig) athletes.push(o);
  });
  athletes.sort((a, b) => (a.userData.bibNumber || 0) - (b.userData.bibNumber || 0));
  return athletes;
}

// --- Interactive start procedure ---------------------------------------------
function ensureStartUi() {
  let panel = document.querySelector('#interactive-start');
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'interactive-start';
  panel.innerHTML = `
    <div class="is-title"></div>
    <div class="is-copy"></div>
    <div class="is-progress"><i></i></div>
    <button class="is-action"></button>`;
  document.querySelector('#race-hud')?.appendChild(panel);
  const style = document.createElement('style');
  style.textContent = `
    #interactive-start{position:absolute;left:50%;bottom:18%;transform:translateX(-50%);z-index:30;width:min(430px,88vw);padding:14px 16px;background:rgba(5,7,10,.94);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(9px);text-align:center;pointer-events:auto;display:none;color:#fff}
    #interactive-start.show{display:block}.is-title{font:900 26px/1 'Barlow Condensed',sans-serif;color:#f1c40f;letter-spacing:.04em}.is-copy{font-size:12px;color:#c7ced7;margin:7px 0 10px}.is-progress{height:5px;background:rgba(255,255,255,.1);margin:8px 0 10px}.is-progress i{display:block;height:100%;width:0;background:#f1c40f}.is-action{width:100%;min-height:52px;border:0;background:#f1c40f;color:#171307;font-weight:900;touch-action:manipulation}.collision-flash{position:absolute;left:50%;top:38%;transform:translateX(-50%);z-index:28;background:rgba(160,22,22,.88);padding:8px 14px;font:900 16px 'Barlow Condensed';letter-spacing:.05em;pointer-events:none}
    @media(max-width:700px){#interactive-start{bottom:26%;}.is-action{min-height:62px;font-size:17px}}
  `;
  document.head.appendChild(style);
  return panel;
}

function showStartUi(title, copy, action, progress = null) {
  const panel = ensureStartUi();
  panel.classList.add('show');
  panel.querySelector('.is-title').textContent = title;
  panel.querySelector('.is-copy').textContent = copy;
  panel.querySelector('.is-action').textContent = action;
  panel.querySelector('.is-progress i').style.width = `${Math.round((progress ?? startState.walkProgress) * 100)}%`;
  return panel;
}
function hideStartUi() {
  document.querySelector('#interactive-start')?.classList.remove('show');
}

function waitForWalkUp() {
  startState.phase = 'walkup';
  startState.walkProgress = 0;
  startState.falseStart = false;
  return new Promise((resolve) => {
    let last = null;
    let steps = 0;
    const panel = showStartUi('WALK TO YOUR MARK', 'Alternate Q / P, or tap STEP, to walk up to the actual start line.', 'STEP TO LINE', 0);
    const finish = () => {
      cleanup();
      startState.walkProgress = 1;
      showStartUi('AT THE LINE', 'Wait for the starter command.', 'READY', 1);
      setTimeout(resolve, 180);
    };
    const step = (side = 'button') => {
      if (side !== 'button') {
        if (side === last) return;
        last = side;
      }
      steps += 1;
      startState.walkProgress = Math.min(1, steps / 4);
      panel.querySelector('.is-progress i').style.width = `${startState.walkProgress * 100}%`;
      navigator.vibrate?.(5);
      if (steps >= 4) finish();
    };
    const key = (e) => {
      if (e.code === 'KeyQ' || e.code === 'KeyP') {
        e.preventDefault();
        e.stopImmediatePropagation();
        step(e.code === 'KeyQ' ? 'q' : 'p');
      }
    };
    const click = (e) => { e.preventDefault(); e.stopPropagation(); step('button'); };
    const cleanup = () => {
      window.removeEventListener('keydown', key, true);
      panel.querySelector('.is-action').removeEventListener('pointerdown', click);
    };
    window.addEventListener('keydown', key, true);
    panel.querySelector('.is-action').addEventListener('pointerdown', click);
  });
}

function waitForReady(blocks) {
  startState.phase = 'ready';
  startState.ready = false;
  return new Promise((resolve) => {
    const panel = showStartUi(
      blocks ? 'GET INTO THE BLOCKS' : 'SETTLE AT THE LINE',
      blocks ? 'Press SPACE or tap READY once your feet and hands are set.' : 'Press SPACE or tap READY when you are balanced and still.',
      blocks ? 'READY IN BLOCKS' : 'READY AT LINE',
      1
    );
    const done = (e) => {
      e?.preventDefault?.();
      e?.stopImmediatePropagation?.();
      startState.ready = true;
      startState.phase = 'armed';
      cleanup();
      resolve();
    };
    const key = (e) => { if (e.code === 'Space' || e.code === 'Enter') done(e); };
    const click = (e) => done(e);
    const cleanup = () => {
      window.removeEventListener('keydown', key, true);
      panel.querySelector('.is-action').removeEventListener('pointerdown', click);
    };
    window.addEventListener('keydown', key, true);
    panel.querySelector('.is-action').addEventListener('pointerdown', click);
  });
}

function waitForGunWindow(ms) {
  startState.phase = 'hold';
  startState.falseStart = false;
  showStartUi('HOLD STILL', 'Any attempt to launch before the gun is a false start.', 'WAIT FOR THE GUN', 1);
  const panel = document.querySelector('#interactive-start');
  if (panel) panel.querySelector('.is-action').disabled = true;
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('keydown', key, true);
      clearTimeout(timer);
      resolve(result);
    };
    const key = (e) => {
      if (['KeyQ', 'KeyP', 'Space'].includes(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        startState.falseStart = true;
        done('false');
      }
    };
    window.addEventListener('keydown', key, true);
    const timer = setTimeout(() => done('gun'), ms);
  });
}

const originalStarter = GameAudio.prototype.starterSequence;
GameAudio.prototype.starterSequence = async function realisticStarter({ blocks = false, startFormat = 'Waterfall', onCommand, onGun }) {
  this.stopSpeech();
  startState.event = eventName();
  startState.blocks = blocks;
  startState.gun = false;
  startState.phase = 'instructions';

  const instructions = startFormat === 'One-Turn Stagger'
    ? 'officials/one_turn_instructions_01.mp3'
    : startFormat === 'Waterfall'
      ? 'officials/waterfall_instructions_01.mp3'
      : 'officials/lane_instructions_01.mp3';

  onCommand?.('OFFICIAL INSTRUCTIONS');
  await this.queueSpeech(instructions);
  await delay(250 + Math.random() * 350);
  await waitForWalkUp();

  const runStart = async () => {
    onCommand?.('ON YOUR MARKS');
    await this.queueSpeech(blocks ? 'officials/on_your_marks_blocks_01.mp3' : 'officials/on_your_marks_standing_01.mp3');
    await waitForReady(blocks);

    if (blocks) {
      onCommand?.('SET');
      await this.queueSpeech('officials/set_01.mp3');
    } else {
      onCommand?.('ON YOUR MARKS');
    }

    const result = await waitForGunWindow((blocks ? 650 : 500) + Math.random() * (blocks ? 1150 : 1350));
    if (result === 'false') {
      startState.falseStarts += 1;
      startState.phase = 'recall';
      hideStartUi();
      await this.recallGun();
      onCommand?.('FALSE START');
      await this.queueSpeech('officials/false_start_01.mp3');
      await delay(900);
      return runStart();
    }

    hideStartUi();
    startState.phase = 'gun';
    startState.gun = true;
    onCommand?.('');
    await this.gun();
    onGun?.();
    window.dispatchEvent(new CustomEvent('ncfa:gun'));
    startState.phase = 'racing';
  };

  return runStart();
};

// --- Contact / collision ------------------------------------------------------
let collisionPenaltyUntil = 0;
let collisionGate = false;
let lastCollisionFlash = 0;

function flashCollision() {
  const now = performance.now();
  if (now - lastCollisionFlash < 500) return;
  lastCollisionFlash = now;
  const el = document.createElement('div');
  el.className = 'collision-flash';
  el.textContent = 'CONTACT — MOMENTUM LOST';
  document.querySelector('#race-hud')?.appendChild(el);
  setTimeout(() => el.remove(), 480);
  navigator.vibrate?.(18);
}

window.addEventListener('keydown', (e) => {
  if (performance.now() < collisionPenaltyUntil && ['KeyQ', 'KeyP'].includes(e.code)) {
    collisionGate = !collisionGate;
    if (collisionGate) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }
}, true);

// --- Final render correction --------------------------------------------------
// This module is intentionally loaded before the other presentation patches.
// Its wrapper therefore runs last, immediately before the actual WebGL draw.
const nativeRender = THREE.WebGLRenderer.prototype.render;
const progressState = new WeakMap();

function rawCourseFromPosition(p) {
  const half = 84.39 / 2;
  const baseRadius = 36.80;
  const straight = 84.39;
  const curve = Math.PI * baseRadius;
  if (p.x >= -half && p.x <= half) {
    if (p.z <= 0) return p.x + half;
    return straight + curve + (half - p.x);
  }
  if (p.x > half) {
    const a = Math.atan2(p.z, p.x - half);
    return straight + (a + Math.PI / 2) * baseRadius;
  }
  let a = Math.atan2(p.z, p.x + half);
  if (a < Math.PI / 2) a += Math.PI * 2;
  return 2 * straight + curve + (a - Math.PI / 2) * baseRadius;
}

function updateProgress(athlete) {
  const raw = rawCourseFromPosition(athlete.position);
  const s = progressState.get(athlete) || { last: raw, distance: 0 };
  let d = raw - s.last;
  if (d < -LAP / 2) d += LAP;
  if (d > LAP / 2) d -= LAP;
  if (d >= -0.3 && d < 12) s.distance += Math.max(0, d);
  s.last = raw;
  progressState.set(athlete, s);
  return s.distance;
}

function enforcePreRaceLineup(scene) {
  if (!raceHudActive() || raceClock() !== '0:00.00' || startState.gun) return;
  const athletes = sortedAthletes(scene);
  const ev = eventName();
  const detail = startDetail();
  athletes.forEach((athlete, i) => {
    const pose = athleteStartPose(ev, detail, i, athletes.length);
    const forward = pose.ahead.clone().sub(pose.p).normalize();
    const isPlayer = athlete.userData.config?.player;
    const walkBack = isPlayer ? (1 - startState.walkProgress) * 3.0 : 0;
    athlete.position.copy(pose.p).addScaledVector(forward, -walkBack);
    athlete.lookAt(pose.ahead.x, pose.p.y, pose.ahead.z);
  });
}

function enforceContact(scene) {
  if (!raceHudActive() || raceClock() === '0:00.00' || !startState.gun) return;
  const athletes = sortedAthletes(scene);
  const player = athletes.find((a) => a.userData.config?.player);
  for (let i = 0; i < athletes.length; i++) {
    for (let j = i + 1; j < athletes.length; j++) {
      const a = athletes[i], b = athletes[j];
      const dx = b.position.x - a.position.x;
      const dz = b.position.z - a.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist >= 0.58) continue;
      const nx = dist > 0.001 ? dx / dist : 1;
      const nz = dist > 0.001 ? dz / dist : 0;
      const push = (0.58 - dist) * 0.52;
      a.position.x -= nx * push; a.position.z -= nz * push;
      b.position.x += nx * push; b.position.z += nz * push;
      if (a === player || b === player) {
        collisionPenaltyUntil = Math.max(collisionPenaltyUntil, performance.now() + 380);
        flashCollision();
      }
    }
  }
}

if (!THREE.WebGLRenderer.prototype.__ncfaCoreRealism) {
  Object.defineProperty(THREE.WebGLRenderer.prototype, '__ncfaCoreRealism', { value: true });
  THREE.WebGLRenderer.prototype.render = function realismRender(scene, camera) {
    if (this.getRenderTarget() === null && scene?.isScene) {
      enforcePreRaceLineup(scene);
      enforceContact(scene);
    }
    return nativeRender.call(this, scene, camera);
  };
}

// Touch devices get a small launch assist *after* the gun so UI latency does not
// hand the AI an automatic 2–3 metre advantage. It cannot trigger before the gun.
if (touchDevice) {
  window.addEventListener('ncfa:gun', () => {
    const seq = ['KeyQ', 'KeyP', 'KeyQ'];
    seq.forEach((code, i) => setTimeout(() => {
      const key = code === 'KeyQ' ? 'q' : 'p';
      window.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true }));
    }, 90 + i * 105));
  });
}
