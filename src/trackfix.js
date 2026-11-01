import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { EVENTS, ROSTER } from './data.js';

const STRAIGHT = 84.39;
const BASE_RADIUS = 36.80;
const LAP = 2 * STRAIGHT + 2 * Math.PI * BASE_RADIUS;
const LANE_WIDTH = 1.22;
const INNER_RADIUS = BASE_RADIUS - 1.7;
const OUTER_RADIUS = INNER_RADIUS + LANE_WIDTH * 8.6;
const TRACK_Y = 0.08;

// Competition tuning: a fair collegiate heat should have athletes around the player's level,
// not a whole field getting a large multiplicative boost.
const playerRating = ROSTER.find((r) => r.player)?.rating ?? 78;
const ratingOffsets = [0, 1.6, 0.8, -0.8, 1.9, 0.3, -1.2, 1.1];
ROSTER.forEach((r, i) => {
  if (!r.player) r.rating = playerRating + (ratingOffsets[i] ?? 0);
});

// Make valid aggressive alternation matter more before fatigue becomes limiting.
for (const event of Object.values(EVENTS)) {
  if (event?.kind === 'race' && Number.isFinite(event.cadence)) event.cadence *= 0.89;
}

// Correct the 100m setup: common straight start, no stagger.
if (EVENTS['100m']) {
  EVENTS['100m'].startOptions = ['Straight Start'];
  EVENTS['100m'].laneRules = 'straight-lanes';
}

const nativeRandom = Math.random.bind(Math);
function installFairMeetRandom() {
  let call = 0;
  Math.random = () => {
    call += 1;
    if (call === 1) return 0.38 + nativeRandom() * 0.20; // heat strength ~= 1.00-1.04
    if (call === 2) return 0.30 + nativeRandom() * 0.38; // daily form stays realistic, not extreme
    return nativeRandom();
  };
  setTimeout(() => { Math.random = nativeRandom; }, 0);
}

addEventListener('DOMContentLoaded', () => {
  document.querySelector('#race-now')?.addEventListener('click', installFairMeetRandom, true);
  document.querySelector('#race-again')?.addEventListener('click', installFairMeetRandom, true);
});

// Trusted desktop Q/P inputs can sustain a drive phase when cadence is genuinely aggressive.
let realTapTimes = [];
let lastRealTap = null;
let lastDriveBoost = 0;
addEventListener('keydown', (e) => {
  if (!e.isTrusted || (e.code !== 'KeyQ' && e.code !== 'KeyP')) return;
  const side = e.code === 'KeyQ' ? 'q' : 'p';
  if (side === lastRealTap) return;
  lastRealTap = side;
  const now = performance.now();
  realTapTimes.push(now);
  realTapTimes = realTapTimes.filter((t) => now - t <= 1000);
  if (realTapTimes.length < 4) return;
  const rate = (realTapTimes.length - 1) / ((realTapTimes.at(-1) - realTapTimes[0]) / 1000);
  const eventName = document.querySelector('#race-event-label')?.textContent?.trim();
  const target = EVENTS[eventName]?.cadence || 3.5;
  const raceActive = document.querySelector('#race-hud.screen--active');
  if (raceActive && rate > target * 1.08 && now - lastDriveBoost > 780) {
    lastDriveBoost = now;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true })), 35);
  }
});

function stadiumPoint(metres, radius = BASE_RADIUS) {
  let d = ((metres % LAP) + LAP) % LAP;
  const curve = Math.PI * BASE_RADIUS;
  if (d < STRAIGHT) return new THREE.Vector3(-STRAIGHT / 2 + d, TRACK_Y, -radius);
  d -= STRAIGHT;
  if (d < curve) {
    const a = -Math.PI / 2 + d / BASE_RADIUS;
    return new THREE.Vector3(STRAIGHT / 2 + Math.cos(a) * radius, TRACK_Y, Math.sin(a) * radius);
  }
  d -= curve;
  if (d < STRAIGHT) return new THREE.Vector3(STRAIGHT / 2 - d, TRACK_Y, radius);
  d -= STRAIGHT;
  const a = Math.PI / 2 + d / BASE_RADIUS;
  return new THREE.Vector3(-STRAIGHT / 2 + Math.cos(a) * radius, TRACK_Y, Math.sin(a) * radius);
}

function inverseCourse(p) {
  const half = STRAIGHT / 2;
  const curve = Math.PI * BASE_RADIUS;
  if (p.x >= -half && p.x <= half) {
    if (p.z <= 0) return p.x + half;
    return STRAIGHT + curve + (half - p.x);
  }
  if (p.x > half) {
    const a = Math.atan2(p.z, p.x - half);
    return STRAIGHT + (a + Math.PI / 2) * BASE_RADIUS;
  }
  let a = Math.atan2(p.z, p.x + half);
  if (a < Math.PI / 2) a += Math.PI * 2;
  return 2 * STRAIGHT + curve + (a - Math.PI / 2) * BASE_RADIUS;
}

function radiusAt(p) {
  const half = STRAIGHT / 2;
  if (p.x >= -half && p.x <= half) return Math.abs(p.z);
  if (p.x > half) return Math.hypot(p.x - half, p.z);
  return Math.hypot(p.x + half, p.z);
}

const START_BASE = {
  '200m': 172,
  '400m': 360,
  '800m': 360,
  '1500m': 100,
  '3000m': 175,
  '5000m': 175,
  '10000m': 375
};

function startDetail() {
  return document.querySelector('#starter-detail')?.textContent || '';
}
function eventName() {
  return document.querySelector('#race-event-label')?.textContent?.trim() || '';
}
function raceClock() {
  return document.querySelector('#race-clock')?.textContent?.trim() || '0:00.00';
}
function raceActive() {
  return Boolean(document.querySelector('#race-hud.screen--active'));
}
function isPreRace() {
  return raceActive() && raceClock() === '0:00.00';
}

function curvedWaterfallStart(base, index, total) {
  const laneFloat = 1.0 + (index / Math.max(1, total - 1)) * 6.4;
  const radius = INNER_RADIUS + (laneFloat - 0.5) * LANE_WIDTH;
  const course = base + (laneFloat - 1) * 0.65;
  return { course, radius };
}

function laneStartCourse(event, lane) {
  const base = START_BASE[event] ?? 0;
  const stagger = (lane - 1) * 3.0;
  return base + stagger;
}

function buildMarkingGroup(scene) {
  const group = new THREE.Group();
  group.name = 'NCFA official track markings';
  group.userData.trackFixMarkings = true;

  const lineMat = (color = 0xffffff) => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.96 });

  // Dedicated 100m straight chute: common start line, no stagger.
  const chuteZ = -(OUTER_RADIUS + 5.4);
  const chute = new THREE.Mesh(
    new THREE.PlaneGeometry(110, LANE_WIDTH * 8),
    new THREE.MeshStandardMaterial({ color: 0x9b3035, roughness: 0.88 })
  );
  chute.rotation.x = -Math.PI / 2;
  chute.position.set(0, TRACK_Y - 0.012, chuteZ);
  chute.receiveShadow = true;
  group.add(chute);

  for (let lane = 0; lane <= 8; lane++) {
    const z = chuteZ - LANE_WIDTH * 4 + lane * LANE_WIDTH;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-55, TRACK_Y + 0.03, z),
      new THREE.Vector3(55, TRACK_Y + 0.03, z)
    ]);
    group.add(new THREE.Line(geo, lineMat()));
  }
  for (const x of [-50, 50]) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, TRACK_Y + 0.035, chuteZ - LANE_WIDTH * 4),
      new THREE.Vector3(x, TRACK_Y + 0.035, chuteZ + LANE_WIDTH * 4)
    ]);
    group.add(new THREE.Line(geo, lineMat()));
  }

  function laneMark(event, base, color) {
    for (let lane = 1; lane <= 8; lane++) {
      const course = base + (lane - 1) * 3.0;
      const inner = INNER_RADIUS + (lane - 1) * LANE_WIDTH + 0.08;
      const outer = inner + LANE_WIDTH - 0.16;
      const geo = new THREE.BufferGeometry().setFromPoints([
        stadiumPoint(course, inner), stadiumPoint(course, outer)
      ]);
      group.add(new THREE.Line(geo, lineMat(color)));
    }
  }

  function curvedMark(base, color) {
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28;
      const laneFloat = 0.6 + t * 8.0;
      const radius = INNER_RADIUS + laneFloat * LANE_WIDTH;
      pts.push(stadiumPoint(base + t * 4.3, radius));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(color)));
  }

  laneMark('200m', START_BASE['200m'], 0xffffff);
  laneMark('400m', START_BASE['400m'], 0xdfe8ff);
  laneMark('800m', START_BASE['800m'], 0x58d781);
  curvedMark(START_BASE['800m'], 0x58d781);
  curvedMark(START_BASE['1500m'], 0xffffff);
  curvedMark(START_BASE['3000m'], 0xffffff);
  curvedMark(START_BASE['5000m'], 0xffffff);
  curvedMark(START_BASE['10000m'], 0xffffff);

  scene.add(group);
  return group;
}

const athleteState = new WeakMap();
let currentSpeech = null;
addEventListener('ncfa:speechstart', (e) => { currentSpeech = e.detail?.path || null; });
addEventListener('ncfa:speechend', (e) => { if (!e.detail?.path || e.detail.path === currentSpeech) currentSpeech = null; });

function sortedAthletes(scene) {
  const athletes = [];
  scene.traverse((o) => {
    if (o.userData?.isNCFAAthlete && o.userData?.rig) athletes.push(o);
  });
  athletes.sort((a, b) => (a.userData.bibNumber || 0) - (b.userData.bibNumber || 0));
  return athletes;
}

function placePreRaceAthletes(scene, athletes) {
  const ev = eventName();
  const detail = startDetail();
  const chuteZ = -(OUTER_RADIUS + 5.4);
  athleteState.clear?.();

  athletes.forEach((athlete, i) => {
    const lane = i + 1;
    if (ev === '100m') {
      athlete.position.set(-50, TRACK_Y, chuteZ - LANE_WIDTH * 4 + (lane - 0.5) * LANE_WIDTH);
      athlete.lookAt(50, TRACK_Y, athlete.position.z);
      return;
    }

    let course;
    let radius;
    const waterfall = /waterfall/i.test(detail) || ['1500m', '3000m', '5000m', '10000m'].includes(ev);
    if (waterfall) {
      ({ course, radius } = curvedWaterfallStart(START_BASE[ev] ?? 0, i, athletes.length));
    } else {
      course = laneStartCourse(ev, lane);
      radius = INNER_RADIUS + (lane - 0.5) * LANE_WIDTH;
    }
    const p = stadiumPoint(course, radius);
    const ahead = stadiumPoint(course + 1.2, radius);
    athlete.position.copy(p);
    athlete.lookAt(ahead.x, p.y, ahead.z);
  });

  const official = scene.getObjectByProperty('name', 'NCFA Starter Official');
  if (official && athletes.length) {
    const evBase = ev === '100m' ? null : START_BASE[ev] ?? 0;
    if (ev === '100m') {
      official.position.set(-54, TRACK_Y, chuteZ + LANE_WIDTH * 5.2);
      official.lookAt(-50, 1.2, chuteZ);
    } else {
      const p = stadiumPoint(evBase - 5, OUTER_RADIUS + 3.0);
      official.position.copy(p);
      const center = athletes.reduce((sum, a) => sum.add(a.position), new THREE.Vector3()).multiplyScalar(1 / athletes.length);
      official.lookAt(center.x, 1.15, center.z);
    }
  }
}

function updateProgress(athlete) {
  const state = athleteState.get(athlete) || { lastRaw: null, progress: 0 };
  const raw = inverseCourse(athlete.position);
  if (state.lastRaw == null) {
    state.lastRaw = raw;
  } else {
    let delta = raw - state.lastRaw;
    if (delta < -LAP / 2) delta += LAP;
    if (delta > LAP / 2) delta -= LAP;
    if (delta > -0.25 && delta < 8) state.progress += Math.max(0, delta);
    state.lastRaw = raw;
  }
  athleteState.set(athlete, state);
  return state.progress;
}

function placeRaceAthlete(athlete, index) {
  const ev = eventName();
  const lane = index + 1;
  const progress = updateProgress(athlete);
  const chuteZ = -(OUTER_RADIUS + 5.4);

  if (ev === '100m') {
    const x = -50 + Math.min(100, progress);
    athlete.position.set(x, TRACK_Y, chuteZ - LANE_WIDTH * 4 + (lane - 0.5) * LANE_WIDTH);
    athlete.lookAt(x + 2, TRACK_Y, athlete.position.z);
    return;
  }

  const base = START_BASE[ev];
  if (!Number.isFinite(base)) return;
  const laneRace = ['200m', '400m'].includes(ev) || (ev === '800m' && /one-turn/i.test(startDetail()));
  const startCourse = laneRace ? laneStartCourse(ev, lane) : base;
  const targetEnd = Math.ceil((base + (EVENTS[ev]?.distance || 400)) / LAP) * LAP;
  const visualLength = targetEnd - startCourse;
  const scale = visualLength / Math.max(1, EVENTS[ev]?.distance || 400);
  const displayCourse = startCourse + progress * scale;
  const radius = radiusAt(athlete.position);
  const p = stadiumPoint(displayCourse, THREE.MathUtils.clamp(radius, INNER_RADIUS + 0.45, OUTER_RADIUS - 0.2));
  const ahead = stadiumPoint(displayCourse + 1.2, THREE.MathUtils.clamp(radius, INNER_RADIUS + 0.45, OUTER_RADIUS - 0.2));
  athlete.position.copy(p);
  athlete.lookAt(ahead.x, p.y, ahead.z);
}

function setPreRaceCamera(camera, athletes, scene) {
  if (!athletes.length) return;
  const elapsed = performance.now() / 1000;
  const official = scene.getObjectByProperty('name', 'NCFA Starter Official');
  const officialTalking = currentSpeech?.startsWith('officials/');

  if (officialTalking && official?.visible) {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(official.quaternion).normalize();
    const side = new THREE.Vector3(-forward.z, 0, forward.x);
    camera.position.copy(official.position.clone().addScaledVector(forward, -3.8).addScaledVector(side, 1.4).add(new THREE.Vector3(0, 1.8, 0)));
    camera.lookAt(official.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
    camera.fov = 36;
    camera.updateProjectionMatrix();
    return;
  }

  const slot = Math.floor(elapsed / 2.0) % (athletes.length + 1);
  if (slot === 0) {
    const center = athletes.reduce((sum, a) => sum.add(a.position), new THREE.Vector3()).multiplyScalar(1 / athletes.length);
    const first = athletes[0];
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(first.quaternion).normalize();
    const side = new THREE.Vector3(-forward.z, 0, forward.x);
    camera.position.copy(center.clone().addScaledVector(forward, -12).addScaledVector(side, 9).add(new THREE.Vector3(0, 4.2, 0)));
    camera.lookAt(center.clone().add(new THREE.Vector3(0, 1.1, 0)));
    camera.fov = 48;
  } else {
    const a = athletes[(slot - 1) % athletes.length];
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(a.quaternion).normalize();
    const side = new THREE.Vector3(-forward.z, 0, forward.x);
    const sign = slot % 2 ? 1 : -1;
    camera.position.copy(a.position.clone().addScaledVector(forward, -3.0).addScaledVector(side, sign * 1.55).add(new THREE.Vector3(0, 1.55, 0)));
    camera.lookAt(a.position.clone().add(new THREE.Vector3(0, 1.25, 0)));
    camera.fov = 34;
  }
  camera.updateProjectionMatrix();
}

function followCorrectedPlayer(camera, athletes) {
  const player = athletes.find((a) => a.userData?.config?.player) || athletes[0];
  if (!player) return;
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.quaternion).normalize();
  const side = new THREE.Vector3(-forward.z, 0, forward.x);
  camera.position.copy(player.position.clone().addScaledVector(forward, -9.5).addScaledVector(side, 2.2).add(new THREE.Vector3(0, 3.8, 0)));
  camera.lookAt(player.position.clone().addScaledVector(forward, 7).add(new THREE.Vector3(0, 1.2, 0)));
  camera.fov = 52;
  camera.updateProjectionMatrix();
}

const originalRender = THREE.WebGLRenderer.prototype.render;
const markedScenes = new WeakSet();
if (!THREE.WebGLRenderer.prototype.__ncfaTrackFixPatched) {
  Object.defineProperty(THREE.WebGLRenderer.prototype, '__ncfaTrackFixPatched', { value: true });
  THREE.WebGLRenderer.prototype.render = function patchedTrackRender(scene, camera) {
    const mainPass = this.getRenderTarget() === null;
    if (scene?.isScene) {
      if (!markedScenes.has(scene)) {
        buildMarkingGroup(scene);
        markedScenes.add(scene);
      }
      if (mainPass && raceActive()) {
        const athletes = sortedAthletes(scene);
        if (isPreRace()) {
          athleteState.clear?.();
          placePreRaceAthletes(scene, athletes);
          setPreRaceCamera(camera, athletes, scene);
        } else {
          athletes.forEach((a, i) => placeRaceAthlete(a, i));
          followCorrectedPlayer(camera, athletes);
        }
      }
    }
    return originalRender.call(this, scene, camera);
  };
}
