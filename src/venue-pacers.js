import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { EVENTS, EVENT_STARTS } from './data.js';
import { createAthlete, animateAthlete } from './athlete.js';
import { stadiumPoint, INNER_RADIUS, LANE_WIDTH } from './world.js';

// Capture the world group used by game.js when the normal race athletes are attached.
// This module no longer moves stadium geometry or race athletes.
let athleteParent = null;
const originalAdd = THREE.Object3D.prototype.add;
if (!THREE.Object3D.prototype.__ncfaPacerCapture) {
  Object.defineProperty(THREE.Object3D.prototype, '__ncfaPacerCapture', { value: true });
  THREE.Object3D.prototype.add = function ncfaPacerCapture(...objects) {
    const result = originalAdd.apply(this, objects);
    for (const object of objects) {
      if (object?.userData?.isNCFAAthlete && !object.userData.aiPacer) athleteParent = this;
    }
    return result;
  };
}

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
  const match = text.match(/(?:roughly|approximately)\s+(\d+)m/i);
  return match ? Number(match[1]) : null;
}

function hasPlayerPaceJob() {
  return window.__NCFA_PLAYER_ROLE === 'pace' && /PACER|pacing job|control the field/i.test(document.querySelector('#pace-assignment')?.textContent || '');
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
  const cfg = { ...PACER_LOOKS[index % PACER_LOOKS.length], rating: 80, player: false };
  const mesh = createAthlete(cfg, 90 + index);
  mesh.userData.isNCFAAthlete = false;
  mesh.userData.aiPacer = true;
  mesh.scale.multiplyScalar(0.995);
  athleteParent.add(mesh);

  const baseTime = Number(EVENTS[ev]?.baseTime || 120);
  const average = distance / baseTime;
  const speed = average * (1.00 + index * 0.003);
  const lane = 1.18 + index * 0.30;
  const radius = INNER_RADIUS + (lane - 0.5) * LANE_WIDTH;
  const baseCourse = EVENT_STARTS[ev]?.base ?? 0;

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

  // AI rabbits are independent of the player's role. Sometimes there is no rabbit at all.
  const chance = distance >= 3000 ? 0.50 : distance >= 1500 ? 0.38 : 0.30;
  if (Math.random() >= chance) {
    addPacerBanner('NO AI PACER ASSIGNED • OPEN RACE');
    return;
  }

  const playerTarget = hasPlayerPaceJob() ? assignmentTarget() : null;
  let targets = defaultTargets(distance);
  if (playerTarget) {
    targets = distance >= 3000
      ? [Math.max(400, Math.round(playerTarget * 0.68 / 100) * 100), Math.min(distance - 100, playerTarget)]
      : [Math.max(200, Math.round(playerTarget * 0.75 / 100) * 100)];
  }

  const count = distance >= 3000 && Math.random() < 0.38 ? 2 : 1;
  targets = [...new Set(targets.filter((x) => x > 0 && x < distance))].slice(0, count);
  activePacers = targets.map((target, i) => createPacer(i, ev, distance, target)).filter(Boolean);

  if (activePacers.length) {
    const details = activePacers.map((p) => `${p.name} to ${p.target}m`).join(' • ');
    addPacerBanner(`AI PACER${activePacers.length > 1 ? 'S' : ''} • ${details}`);
  }
}

function updatePacers(now) {
  if (!activePacers.length) return;
  const raceActive = Boolean(document.querySelector('#race-hud.screen--active'));
  const clockText = document.querySelector('#race-clock')?.textContent?.trim() || '0:00.00';
  if (!raceActive || clockText === '0:00.00' || window.__NCFA_RACE_PHASE !== 'racing') return;

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
    p.mesh.rotateY(Math.PI);
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

window.addEventListener('ncfa:gun', () => setTimeout(startAiPacers, 80));

function pacerLoop(now) {
  updatePacers(now);
  appendPacerResults();
  requestAnimationFrame(pacerLoop);
}
requestAnimationFrame(pacerLoop);
