import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { EVENTS } from './data.js';
import { createAthlete, animateAthlete } from './athlete.js';
import { stadiumPoint, INNER_RADIUS, LANE_WIDTH } from './world.js';

// This module intentionally loads before game.js. It fixes the scoreboard sightline
// as the venue is built, then adds non-scoring pace athletes to distance races.

const BOARD_X = 52;
const BOARD_Z = 92;
const BOARD_Y = 18;
const BOARD_YAW = Math.atan2(-BOARD_X, -BOARD_Z);
const boardNormal = new THREE.Vector3(Math.sin(BOARD_YAW), 0, Math.cos(BOARD_YAW));

let athleteParent = null;
const originalAdd = THREE.Object3D.prototype.add;

function near(a, b, eps = 0.06) { return Math.abs((a ?? 0) - b) < eps; }

function relocateVideoBoard(object) {
  const g = object?.geometry;
  const p = g?.parameters;
  if (!p) return;

  // Main 27 x 14 x 1.5 shell.
  if (g.type === 'BoxGeometry' && near(p.width, 27) && near(p.height, 14) && near(p.depth, 1.5)) {
    object.position.set(BOARD_X, BOARD_Y, BOARD_Z);
    object.rotation.y = BOARD_YAW;
    object.castShadow = true;
    object.userData.ncfaVideoBoard = 'shell';
  }

  // 23.8 x 10.2 display face. Move it slightly toward the infield so the shell
  // can never clip through the live screen or the career-hub camera.
  if (g.type === 'PlaneGeometry' && near(p.width, 23.8) && near(p.height, 10.2)) {
    object.position.set(
      BOARD_X + boardNormal.x * 0.82,
      BOARD_Y,
      BOARD_Z + boardNormal.z * 0.82
    );
    object.rotation.set(0, BOARD_YAW, 0);
    object.frustumCulled = true;
    object.userData.ncfaVideoBoard = 'screen';
  }

  // Main support column.
  if (g.type === 'BoxGeometry' && near(p.width, 2.4) && near(p.height, 12) && near(p.depth, 2.4)) {
    object.position.set(BOARD_X, 7.0, BOARD_Z);
    object.userData.ncfaVideoBoard = 'support';
  }
}

THREE.Object3D.prototype.add = function ncfaAdd(...objects) {
  const result = originalAdd.apply(this, objects);
  for (const object of objects) {
    relocateVideoBoard(object);
    if (object?.userData?.isNCFAAthlete && !object.userData.aiPacer) athleteParent = this;
  }
  return result;
};

const START_BASE = {
  '800m': 310,
  '1500m': 112,
  '3000m': 310,
  '5000m': 112,
  '10000m': 0
};

const PACER_LOOKS = [
  { name: 'Eli Navarro', school: 'METRO PACER', color: 0xf5f5f5, shorts: 0x111418, skin: 0xb97854, trim: '#ffcf33', hairStyle: 'fade' },
  { name: 'Jonah Price', school: 'NCFA PACE', color: 0x202735, shorts: 0x0d1117, skin: 0x704832, trim: '#f1c40f', hairStyle: 'buzz' }
];

let activePacers = [];
let completedPacers = [];
let raceSerial = 0;

function raceEvent() {
  return document.querySelector('#race-event-label')?.textContent?.trim() || '';
}
function eventDistance(name) {
  return Number(EVENTS[name]?.distance || Number(name.replace(/\D/g, '')) || 0);
}
function assignmentTarget() {
  const text = document.querySelector('#pace-assignment')?.textContent || '';
  const match = text.match(/through roughly\s+(\d+)m/i);
  return match ? Number(match[1]) : null;
}
function hasPlayerPaceJob() {
  return /PACER|PACING JOB|Lead or help control/i.test(document.querySelector('#pace-assignment')?.textContent || '');
}

function defaultTargets(distance) {
  if (distance <= 800) return [400];
  if (distance <= 1500) return [800];
  if (distance <= 3000) return [1200, 2000];
  if (distance <= 5000) return [1600, 3000];
  return [3000, 5000];
}

function addPacerBanner(text) {
  let banner = document.querySelector('#ai-pacer-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'ai-pacer-banner';
    banner.style.cssText = 'position:absolute;top:86px;left:50%;transform:translateX(-50%);z-index:26;padding:8px 13px;background:rgba(4,7,11,.88);border:1px solid rgba(241,196,15,.55);color:#fff;font:800 13px/1.2 Arial;letter-spacing:.05em;pointer-events:none;text-align:center;';
    document.querySelector('#race-hud')?.appendChild(banner);
  }
  banner.textContent = text;
  banner.style.display = 'block';
  clearTimeout(banner._timer);
  banner._timer = setTimeout(() => { banner.style.display = 'none'; }, 4200);
}

function createPacer(index, ev, distance, target) {
  if (!athleteParent) return null;
  const cfg = { ...PACER_LOOKS[index % PACER_LOOKS.length], rating: 81, player: false };
  const mesh = createAthlete(cfg, 90 + index);
  mesh.userData.isNCFAAthlete = false; // do not enter the scoring/collision roster
  mesh.userData.aiPacer = true;
  mesh.scale.multiplyScalar(0.995);
  athleteParent.add(mesh);

  const baseTime = Number(EVENTS[ev]?.baseTime || 120);
  const average = distance / baseTime;
  const paceBoost = index === 0 ? 1.025 : 1.015;
  const speed = average * paceBoost;
  const lane = 1.20 + index * 0.35;
  const radius = INNER_RADIUS + (lane - 0.5) * LANE_WIDTH;
  const baseCourse = START_BASE[ev] ?? 0;

  return {
    serial: raceSerial,
    mesh,
    name: cfg.name,
    school: cfg.school,
    event: ev,
    target,
    speed,
    radius,
    baseCourse,
    startedAt: performance.now(),
    phase: Math.random() * Math.PI * 2,
    dropped: false,
    dropStarted: 0,
    removed: false
  };
}

function startAiPacers() {
  const ev = raceEvent();
  const distance = eventDistance(ev);
  if (!athleteParent || distance < 800 || !EVENTS[ev]) return;

  raceSerial += 1;
  completedPacers = [];
  activePacers.forEach((p) => p.mesh?.parent?.remove(p.mesh));
  activePacers = [];

  const playerJobTarget = assignmentTarget();
  const playerJob = hasPlayerPaceJob();
  const shouldPace = playerJob || Math.random() < (distance >= 3000 ? 0.55 : 0.38);
  if (!shouldPace) return;

  let targets = defaultTargets(distance);
  if (playerJobTarget) {
    targets = distance >= 3000
      ? [Math.max(400, Math.round(playerJobTarget * 0.7 / 100) * 100), playerJobTarget]
      : [playerJobTarget];
  }
  targets = [...new Set(targets.filter((x) => x > 0 && x < distance))].slice(0, distance >= 3000 ? 2 : 1);

  activePacers = targets.map((target, i) => createPacer(i, ev, distance, target)).filter(Boolean);
  if (activePacers.length) {
    const details = activePacers.map((p) => `${p.name} to ${p.target}m`).join(' • ');
    addPacerBanner(`AI PACERS ASSIGNED • ${details}`);
  }
}

function updatePacers(now) {
  if (!activePacers.length) return;
  const raceActive = Boolean(document.querySelector('#race-hud.screen--active'));
  if (!raceActive) return;

  for (const p of activePacers) {
    if (p.removed || !p.mesh?.parent) continue;
    const elapsed = Math.max(0, (now - p.startedAt) / 1000);
    const travelled = Math.min(p.target, elapsed * p.speed);

    if (!p.dropped && travelled >= p.target - 0.01) {
      p.dropped = true;
      p.dropStarted = now;
      completedPacers.push({ name: p.name, school: p.school, target: p.target });
      addPacerBanner(`${p.name.toUpperCase()} • PACE JOB COMPLETE AT ${p.target}m • STEPPING OFF`);
    }

    let extraRadius = 0;
    let paceDistance = travelled;
    if (p.dropped) {
      const dropT = Math.min(1, (now - p.dropStarted) / 1500);
      extraRadius = THREE.MathUtils.smoothstep(dropT, 0, 1) * 7.5;
      paceDistance += dropT * 4;
      if (dropT >= 1) {
        p.mesh.visible = false;
        p.mesh.parent?.remove(p.mesh);
        p.removed = true;
        continue;
      }
    }

    const course = p.baseCourse + paceDistance;
    const radius = p.radius + extraRadius;
    const point = stadiumPoint(course, radius);
    const ahead = stadiumPoint(course + 1.4, radius);
    p.mesh.position.copy(point);
    p.mesh.lookAt(ahead.x, point.y, ahead.z);
    animateAthlete(p.mesh, now / 1000, p.dropped ? p.speed * 0.72 : p.speed, 0.08, p.phase, false);
  }
}

function appendPacerResults() {
  if (!completedPacers.length) return;
  const screen = document.querySelector('#results-screen');
  const list = document.querySelector('#results-list');
  if (!screen?.classList.contains('screen--active') || !list || list.dataset.pacersAdded === String(raceSerial)) return;
  for (const p of completedPacers) {
    const row = document.createElement('div');
    row.className = 'result-row';
    row.innerHTML = `<div class="result-place">—</div><div class="result-name"><strong>${p.name}</strong><span>${p.school}</span></div><div class="result-time">DNF @ ${p.target}m</div><div class="result-badge">PACER</div>`;
    list.appendChild(row);
  }
  list.dataset.pacersAdded = String(raceSerial);
}

window.addEventListener('ncfa:gun', () => setTimeout(startAiPacers, 60));

function pacerLoop(now) {
  updatePacers(now);
  appendPacerResults();
  requestAnimationFrame(pacerLoop);
}
requestAnimationFrame(pacerLoop);
