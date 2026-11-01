import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { CAREERS, EVENTS, EVENT_STARTS, VENUES, PLACE_POINTS, TEAM_POINTS, CLASSES, PRACTICES, SHOP_ITEMS, ROSTER, defaultCareerState } from './data.js';
import { createAthlete, animateAthlete } from './athlete.js';
import { createWorld, stadiumPoint, eventStartBase, INNER_RADIUS, LANE_WIDTH, CHUTE_Z } from './world.js';
import { GameAudio, AUDIO, delay } from './audio.js';
import { CommentaryDirector } from './commentary.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const canvas = $('#game-canvas');
const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x09101a);
scene.fog = new THREE.FogExp2(0x0b1018, 0.0022);
const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.1, 1200);
camera.position.set(0, 60, 112);
const broadcastCamera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 1000);
const renderTarget = new THREE.WebGLRenderTarget(mobile ? 384 : 768, mobile ? 216 : 432, { colorSpace: THREE.SRGBColorSpace });

scene.add(new THREE.HemisphereLight(0xd6e4ff, 0x334421, 1.8));
const sun = new THREE.DirectionalLight(0xffffff, 3.1);
sun.position.set(-58, 90, -42);
sun.castShadow = true;
sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
sun.shadow.camera.left = -145;
sun.shadow.camera.right = 145;
sun.shadow.camera.top = 110;
sun.shadow.camera.bottom = -110;
scene.add(sun);

const audio = new GameAudio();
const commentary = new CommentaryDirector(audio);
let state = defaultCareerState();
let selectedCareer = null;
let selectedEvent = null;
let selectedStart = null;
let mode = 'boot';
let quickMode = false;
let world = null;
let venue = VENUES[0];
let race = null;
let field = null;
let attractAngle = 0;
let cinematicStart = 0;
let cinematicPlace = 1;
let splitToastTimer = null;
let meetContext = { heatStrength: 1, form: 1, pacer: null };
const keys = new Set();
const tapTimes = [];
let lastTapKey = null;
let surgeTimer = 0;
const startState = { phase: 'idle', walkProgress: 1, falseStart: false };
let preRaceStartedAt = 0;
let starterOfficial = null;
window.__NCFA_RACE_PHASE = 'idle';
window.__NCFA_CORE_PRERACE_V22 = true;

function showScreen(id) {
  $$('.screen').forEach((x) => x.classList.toggle('screen--active', x.id === id));
}

function setMode(next, screen = next) {
  mode = next;
  showScreen(screen);
}

function formatTime(s) {
  if (!Number.isFinite(s)) return '--:--.--';
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`;
}

function randomVenue() {
  return VENUES[(Math.random() * VENUES.length) | 0];
}

function loadWorld(nextVenue) {
  if (world) world.dispose();
  venue = nextVenue;
  world = createWorld(scene, venue);
  world.setBroadcastTexture(renderTarget.texture);
  world.setBroadcastClock('0:00.00', state.event || 'NCFA');
  $('#hub-venue').textContent = `${venue.name} • ${venue.city}`;
}
loadWorld(venue);

function renderCareers() {
  $('#career-options').innerHTML = Object.entries(CAREERS).map(([name, data], i) => `
    <button class="career-card" data-career="${name}"><span>0${i + 1}</span><strong>${name.toUpperCase()}</strong><small>${data.events.join(' • ')}</small></button>`).join('');
  $$('#career-options [data-career]').forEach((button) => button.addEventListener('click', () => chooseCareer(button.dataset.career)));
}
renderCareers();

function chooseCareer(name) {
  selectedCareer = name;
  selectedEvent = null;
  selectedStart = null;
  const data = CAREERS[name];
  $('#setup-career-name').textContent = `${name} Career`;
  $('#setup-career-copy').textContent = data.tagline;
  $('#event-options').innerHTML = data.events.map((event) => `<button class="choice-card" data-event="${event}"><strong>${event}</strong><small>${EVENTS[event].kind === 'race' ? 'Track event' : EVENTS[event].kind === 'field' ? 'Field event' : 'Multi-event'}</small></button>`).join('');
  $$('#event-options [data-event]').forEach((button) => button.addEventListener('click', () => chooseEvent(button.dataset.event, button)));
  $('#start-format-wrap').classList.add('hidden');
  $('#create-career').disabled = true;
  $('#setup-status').textContent = 'Choose an event.';
  setMode('event-setup');
}

function chooseEvent(name, button) {
  selectedEvent = name;
  $$('#event-options .choice-card').forEach((x) => x.classList.remove('selected'));
  button.classList.add('selected');
  const event = EVENTS[name];
  selectedStart = event.startOptions?.[0] || null;
  if (event.startOptions?.length > 1) {
    $('#start-format-wrap').classList.remove('hidden');
    $('#start-options').innerHTML = event.startOptions.map((x) => `<button class="choice-card ${x === selectedStart ? 'selected' : ''}" data-start="${x}"><strong>${x}</strong></button>`).join('');
    $$('#start-options [data-start]').forEach((b) => b.addEventListener('click', () => {
      selectedStart = b.dataset.start;
      $$('#start-options .choice-card').forEach((x) => x.classList.remove('selected'));
      b.classList.add('selected');
      $('#setup-status').textContent = `${name} • ${selectedStart}`;
    }));
  } else {
    $('#start-format-wrap').classList.add('hidden');
  }
  $('#setup-status').textContent = `${name}${selectedStart ? ` • ${selectedStart}` : ''}`;
  $('#create-career').disabled = false;
}

function commitCareer() {
  const athleteName = $('#athlete-name-input').value.trim() || 'Jordan Carter';
  state.athleteName = athleteName;
  state.career = selectedCareer;
  state.event = selectedEvent;
  state.startFormat = selectedStart;
  if (!quickMode) localStorage.setItem('ncfaCareer', JSON.stringify(state));
  renderHub();
  setMode('hub', 'career-hub');
}

function renderHub() {
  const career = CAREERS[state.career] || CAREERS.Distance;
  $('#hub-athlete').textContent = state.athleteName;
  $('#hub-event-group').textContent = `${state.career?.toUpperCase() || 'CAREER'} • ${state.event || 'NO EVENT'}`;
  $('#points-readout').textContent = state.points;
  $('#overall-rating').textContent = Math.round(career.rating + Object.values(state.development || {}).reduce((a, b) => a + b, 0) * 0.16);
  $('#energy-stat').textContent = `${Math.round(state.energy)}%`;
  $('#energy-meter').style.width = `${Math.max(0, Math.min(100, state.energy))}%`;
  $('#trust-stat').textContent = `${Math.round(state.coachTrust)}%`;
  $('#trust-meter').style.width = `${Math.max(0, Math.min(100, state.coachTrust))}%`;
  $('#gpa-stat').textContent = state.gpa.toFixed(2);
  $('#academic-progress').textContent = `${Math.round(state.academicProgress)}%`;
  $('#classes-left').textContent = String(CLASSES.length - state.completedClasses.length);
  $('#eligibility-status').textContent = state.academicProgress >= 60 && state.gpa >= 2 ? 'ELIGIBLE' : 'AT RISK';
  $('#inventory-count').textContent = `${state.inventory.length} item${state.inventory.length === 1 ? '' : 's'}`;
  $('#hub-race-line').textContent = state.event ? `${state.event} • ${state.startFormat || 'standard competition start'}` : 'Choose an event';
  $('#hub-meet-name').textContent = state.meetNumber ? `NCFA Meet ${state.meetNumber + 1}` : 'NCFA Season Opener';
  $('#hub-venue').textContent = `${venue.name} • ${venue.city}`;
}

function renderClasses() {
  $('#class-list').innerHTML = CLASSES.map((c) => {
    const done = state.completedClasses.includes(c.id);
    return `<div class="list-card"><div class="eyebrow">${c.time} • ${c.room}</div><h3>${c.name}</h3><p>${c.description}</p><button class="${done ? 'secondary-btn' : 'primary-btn'}" data-class="${c.id}" ${done ? 'disabled' : ''}>${done ? 'ATTENDED' : 'ATTEND CLASS'}</button></div>`;
  }).join('');
  $$('#class-list [data-class]').forEach((button) => button.addEventListener('click', () => attendClass(button.dataset.class)));
}

function attendClass(id) {
  const c = CLASSES.find((x) => x.id === id);
  if (!c || state.completedClasses.includes(id)) return;
  state.completedClasses.push(id);
  state.academicProgress = Math.min(100, state.academicProgress + c.reward * 0.35);
  state.gpa = Math.min(4, state.gpa + 0.01);
  state.points += c.reward;
  persist();
  renderClasses();
  renderHub();
}

function renderPractice() {
  $('#practice-list').innerHTML = PRACTICES.filter((p) => p.groups.includes(state.career)).map((p) => `<div class="list-card"><div class="eyebrow">ENERGY ${p.energy > 0 ? '+' : ''}${p.energy}</div><h3>${p.name}</h3><p>${p.note}</p><button class="primary-btn" data-practice="${p.id}">DO SESSION</button></div>`).join('');
  $$('#practice-list [data-practice]').forEach((button) => button.addEventListener('click', () => doPractice(button.dataset.practice)));
}

function doPractice(id) {
  const p = PRACTICES.find((x) => x.id === id);
  if (!p) return;
  state.energy = Math.max(20, Math.min(100, state.energy + p.energy));
  state.coachTrust = Math.min(100, state.coachTrust + p.trust);
  Object.entries(p.development).forEach(([k, v]) => { state.development[k] = (state.development[k] || 0) + v; });
  state.practiceLog.push({ id, day: Date.now() });
  state.points += 4;
  persist();
  renderHub();
  renderPractice();
}

function renderShop() {
  $('#shop-points').textContent = state.points;
  $('#shop-list').innerHTML = SHOP_ITEMS.map((item) => {
    const owned = state.inventory.includes(item.id);
    return `<div class="shop-card"><div class="eyebrow">${item.category}</div><h3>${item.name}</h3><p>${item.description}</p><strong>${item.cost} PTS</strong><br><button class="${owned ? 'secondary-btn' : 'primary-btn'}" data-buy="${item.id}" ${owned || state.points < item.cost ? 'disabled' : ''}>${owned ? 'OWNED' : 'BUY'}</button></div>`;
  }).join('');
  $$('#shop-list [data-buy]').forEach((b) => b.addEventListener('click', () => buyItem(b.dataset.buy)));
}

function buyItem(id) {
  const item = SHOP_ITEMS.find((x) => x.id === id);
  if (!item || state.inventory.includes(id) || state.points < item.cost) return;
  state.points -= item.cost;
  state.inventory.push(id);
  persist();
  renderShop();
  renderHub();
}

function persist() {
  if (!quickMode) localStorage.setItem('ncfaCareer', JSON.stringify(state));
}

function supplementEffects() {
  const total = { buffer: 0, power: 0, recovery: 0, economy: 0, glycogen: 0, hydration: 0, focus: 0, durability: 0 };
  for (const id of state.inventory) {
    const item = SHOP_ITEMS.find((x) => x.id === id);
    if (item) Object.entries(item.effects).forEach(([k, v]) => { total[k] = (total[k] || 0) + v; });
  }
  return total;
}

function choosePaceTarget(event) {
  const fractions = event.distance <= 800 ? [0.5, 0.75] : event.distance <= 1500 ? [0.4, 0.53, 0.67] : [0.3, 0.4, 0.5, 0.66];
  const fraction = fractions[(Math.random() * fractions.length) | 0];
  return Math.max(100, Math.round(event.distance * fraction / 100) * 100);
}

function prepareMeet() {
  meetContext.heatStrength = 0.992 + Math.random() * 0.020;
  meetContext.form = 0.987 + Math.random() * 0.026;
  meetContext.pacer = null;
  const event = EVENTS[state.event];
  if (event?.kind === 'race' && event.distance >= 800 && window.__NCFA_PLAYER_ROLE === 'pace') {
    meetContext.pacer = { target: choosePaceTarget(event), resolved: false };
  }

  $('#meet-title').textContent = state.meetNumber ? `NCFA Meet ${state.meetNumber + 1}` : 'NCFA Season Opener';
  $('#meet-event').textContent = state.event;
  $('#meet-start').textContent = state.startFormat || 'Standard';
  $('#heat-strength').textContent = meetContext.heatStrength > 1.007 ? 'STRONG' : meetContext.heatStrength < .997 ? 'SOFT' : 'BALANCED';
  $('#daily-form').textContent = meetContext.form > 1.008 ? 'SHARP' : meetContext.form < .994 ? 'FLAT' : 'NORMAL';
  $('#venue-options').innerHTML = VENUES.map((v) => `<button class="choice-card ${v.id === venue.id ? 'selected' : ''}" data-venue="${v.id}"><strong>${v.name}</strong><small>${v.city} • ${v.seats.toLocaleString()} seats</small></button>`).join('');
  $$('#venue-options [data-venue]').forEach((b) => b.addEventListener('click', () => {
    venue = VENUES.find((v) => v.id === b.dataset.venue) || venue;
    $$('#venue-options .choice-card').forEach((x) => x.classList.remove('selected'));
    b.classList.add('selected');
  }));

  const assignment = $('#pace-assignment');
  if (meetContext.pacer) {
    assignment.classList.remove('hidden');
    assignment.innerHTML = `<strong>COACH ASSIGNMENT: PACER</strong><p>You accepted the pacing job. Control the field through roughly ${meetContext.pacer.target}m, then step off. You may keep racing, but coach trust can change.</p>`;
  } else if (event?.kind === 'race' && event.distance >= 800) {
    assignment.classList.remove('hidden');
    assignment.innerHTML = '<strong>RACE ROLE: COMPETE</strong><p>You are racing for place and time. The meet may still assign an AI rabbit, or there may be no pacer at all.</p>';
  } else {
    assignment.classList.add('hidden');
  }
  setMode('meet-setup');
}

function currentPlayerRating() {
  const base = CAREERS[state.career]?.rating || 78;
  const dev = state.development || {};
  return base + (dev.aerobic || 0) * 0.12 + (dev.speedEndurance || 0) * 0.14 + (dev.acceleration || 0) * 0.08 + (dev.power || 0) * 0.05;
}

function initialLaneFloat(event, i) {
  if (event.laneRules === 'straight-lanes' || event.laneRules === 'lanes' || state.startFormat === 'One-Turn Stagger') return i + 1;
  return 1.05 + (i / Math.max(1, ROSTER.length - 1)) * 6.3;
}

function createRaceRunners(event) {
  const effects = supplementEffects();
  const playerRating = currentPlayerRating();
  return ROSTER.map((seed, i) => {
    // Opponents keep their real roster ratings. They no longer scale to the
    // player's current rating, so player development actually creates separation.
    const config = { ...seed, rating: seed.player ? playerRating : seed.rating };
    const mesh = createAthlete(config, i + 1);
    world.group.add(mesh);
    const dayForm = seed.player ? meetContext.form : 0.990 + Math.random() * 0.020;
    const heatBias = seed.player ? 0 : (meetContext.heatStrength - 1) * 0.45;
    const fitnessFactor = 1 + (config.rating - playerRating) * 0.0058 + (dayForm - 1) * 0.65 + heatBias;
    return {
      ...config,
      seedIndex: i,
      mesh,
      lane: i + 1,
      laneFloat: initialLaneFloat(event, i),
      startLaneFloat: initialLaneFloat(event, i),
      distance: 0,
      speed: 0,
      finishTime: null,
      phase: Math.random() * Math.PI * 2,
      fitnessFactor,
      dayForm,
      science: { pcr: 1, glycogen: Math.min(1, .96 + effects.glycogen), lactate: 1.2, buffer: 0 },
      split200: null,
      halfway: null,
      dropped: false,
      contactPenalty: 0,
      startOffset: 2.6
    };
  });
}

function getPlace(target) {
  if (!race) return 1;
  const ranked = [...race.runners].sort((a, b) => {
    if (a.finishTime != null && b.finishTime != null) return a.finishTime - b.finishTime;
    if (a.finishTime != null) return -1;
    if (b.finishTime != null) return 1;
    return b.distance - a.distance;
  });
  return ranked.indexOf(target) + 1;
}

function recordTap(key) {
  if (mode !== 'race' && mode !== 'field') return;
  if (key === lastTapKey) return;
  lastTapKey = key;
  const now = performance.now();
  tapTimes.push(now);
  while (tapTimes.length && now - tapTimes[0] > 1100) tapTimes.shift();
  const light = key === 'q' ? $('#q-light') : $('#p-light');
  light?.classList.add('active');
  setTimeout(() => light?.classList.remove('active'), 90);
}

function tapRate() {
  const now = performance.now();
  while (tapTimes.length && now - tapTimes[0] > 1100) tapTimes.shift();
  if (tapTimes.length < 2) return 0;
  const span = (tapTimes.at(-1) - tapTimes[0]) / 1000;
  return span > 0 ? (tapTimes.length - 1) / span : 0;
}

function startStaggerFor(r) {
  if (state.event === '100m') return 0;
  const cfg = EVENT_STARTS[state.event];
  if (!cfg) return 0;
  if (cfg.type === 'stagger' || (state.event === '800m' && state.startFormat === 'One-Turn Stagger')) {
    return (r.lane - 1) * cfg.stagger;
  }
  return (r.startLaneFloat - 1) * 0.62;
}

function staggerDecayDistance() {
  if (state.event === '800m' && state.startFormat === 'One-Turn Stagger') return race.event.breakDistance || 100;
  if (race.event.laneRules === 'lanes') return race.event.distance;
  return Math.min(90, race.event.distance * 0.12);
}

function pathForRunner(r) {
  if (state.event === '100m') {
    const laneZ = CHUTE_Z - LANE_WIDTH * 4 + (r.lane - 0.5) * LANE_WIDTH;
    const x = -50 + r.distance - (r.startOffset || 0);
    return { p: new THREE.Vector3(x, 0.08, laneZ), ahead: new THREE.Vector3(x + 1.0, 0.08, laneZ), lane: r.laneFloat };
  }

  const base = eventStartBase(state.event);
  const stagger = startStaggerFor(r);
  const decayAt = Math.max(1, staggerDecayDistance());
  const staggerFactor = 1 - THREE.MathUtils.clamp(r.distance / decayAt, 0, 1);
  const course = base + r.distance + stagger * staggerFactor - (r.startOffset || 0);
  let lane = r.laneFloat;
  if (race.event.laneRules === 'lanes') lane = r.lane;
  if (state.event === '800m' && state.startFormat === 'One-Turn Stagger' && r.distance < (race.event.breakDistance || 100)) lane = r.lane;
  const radius = INNER_RADIUS + (lane - 0.5) * LANE_WIDTH;
  return { p: stadiumPoint(course, radius), ahead: stadiumPoint(course + 0.9, radius), lane };
}

function orientRunner(mesh, p, ahead) {
  mesh.lookAt(ahead.x, p.y, ahead.z);
  mesh.rotateY(Math.PI);
}

function stageRunners() {
  if (!race) return;
  race.runners.forEach((r) => {
    const { p, ahead } = pathForRunner(r);
    r.mesh.position.copy(p);
    orientRunner(r.mesh, p, ahead);
  });
}

function ensureStartUi() {
  let panel = $('#interactive-start');
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = 'interactive-start';
  panel.innerHTML = '<div class="is-title"></div><div class="is-copy"></div><div class="is-progress"><i></i></div><button class="is-action"></button>';
  $('#race-hud').appendChild(panel);
  const style = document.createElement('style');
  style.textContent = `#interactive-start{position:absolute;left:50%;bottom:18%;transform:translateX(-50%);z-index:45;width:min(430px,88vw);padding:14px 16px;background:rgba(5,7,10,.94);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(9px);text-align:center;pointer-events:auto;display:none;color:#fff}#interactive-start.show{display:block}.is-title{font:900 26px/1 'Barlow Condensed',Arial,sans-serif;color:#f1c40f;letter-spacing:.04em}.is-copy{font-size:12px;color:#c7ced7;margin:7px 0 10px}.is-progress{height:5px;background:rgba(255,255,255,.1);margin:8px 0 10px}.is-progress i{display:block;height:100%;width:0;background:#f1c40f}.is-action{width:100%;min-height:52px;border:0;background:#f1c40f;color:#171307;font-weight:900;touch-action:manipulation}@media(max-width:700px){#interactive-start{bottom:27%}.is-action{min-height:60px;font-size:16px}}`;
  document.head.appendChild(style);
  return panel;
}

function showStartUi(title, copy, action, progress = 1) {
  const panel = ensureStartUi();
  panel.classList.add('show');
  panel.querySelector('.is-title').textContent = title;
  panel.querySelector('.is-copy').textContent = copy;
  panel.querySelector('.is-action').textContent = action;
  panel.querySelector('.is-action').disabled = false;
  panel.querySelector('.is-progress i').style.width = `${Math.round(progress * 100)}%`;
  return panel;
}

function hideStartUi() { $('#interactive-start')?.classList.remove('show'); }

function walkRunnersToMarks(duration = 1550) {
  startState.phase = 'walk';
  window.__NCFA_RACE_PHASE = 'walk';
  startState.walkProgress = 0;
  race.runners.forEach((r) => { r.startOffset = 2.6; });
  return new Promise((resolve) => {
    const started = performance.now();
    const frame = (now) => {
      const raw = THREE.MathUtils.clamp((now - started) / duration, 0, 1);
      const eased = raw * raw * (3 - 2 * raw);
      startState.walkProgress = eased;
      race.runners.forEach((r) => { r.startOffset = 2.6 * (1 - eased); });
      if (raw < 1) requestAnimationFrame(frame);
      else {
        race.runners.forEach((r) => { r.startOffset = 0; });
        startState.walkProgress = 1;
        stageRunners();
        resolve();
      }
    };
    requestAnimationFrame(frame);
  });
}

function resetRunnersBehindMarks() {
  if (!race?.runners) return;
  race.runners.forEach((r) => { r.startOffset = 2.6; });
  startState.walkProgress = 0;
  stageRunners();
}

function waitForReady(blocks) {
  startState.phase = 'ready';
  window.__NCFA_RACE_PHASE = 'ready';
  return new Promise((resolve) => {
    const panel = showStartUi(blocks ? 'GET INTO THE BLOCKS' : 'SETTLE AT THE LINE', blocks ? 'Press SPACE / ENTER or tap READY once you are set in the blocks.' : 'Press SPACE / ENTER or tap READY when you are balanced and still.', blocks ? 'READY IN BLOCKS' : 'READY AT LINE', 1);
    const done = (e) => { e?.preventDefault?.(); e?.stopImmediatePropagation?.(); cleanup(); resolve(); };
    const key = (e) => { if (e.code === 'Space' || e.code === 'Enter') done(e); };
    const click = (e) => done(e);
    const cleanup = () => { window.removeEventListener('keydown', key, true); panel.querySelector('.is-action').removeEventListener('pointerdown', click); };
    window.addEventListener('keydown', key, true);
    panel.querySelector('.is-action').addEventListener('pointerdown', click);
  });
}

function waitForGunWindow(ms) {
  startState.phase = 'hold';
  window.__NCFA_RACE_PHASE = 'hold';
  startState.falseStart = false;
  const panel = showStartUi('HOLD STILL', 'Move before the gun and you can false start.', 'WAIT FOR THE GUN', 1);
  panel.querySelector('.is-action').disabled = true;
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => { if (settled) return; settled = true; cleanup(); resolve(value); };
    const key = (e) => {
      if (['KeyQ', 'KeyP', 'Space'].includes(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        done('false');
      }
    };
    const touch = (e) => {
      const control = e.target.closest?.('#touch-pace,#touch-push,#touch-kick,#mobile-q,#mobile-p,#mobile-surge');
      if (control) done('false');
    };
    const timer = setTimeout(() => done('gun'), ms);
    const cleanup = () => { clearTimeout(timer); window.removeEventListener('keydown', key, true); document.removeEventListener('pointerdown', touch, true); };
    window.addEventListener('keydown', key, true);
    document.addEventListener('pointerdown', touch, true);
  });
}

async function runStartProcedure() {
  const blocks = race.event.start === 'blocks';
  const format = state.startFormat || 'Standard';
  const instructionFile = format === 'One-Turn Stagger' ? 'officials/one_turn_instructions_01.mp3' : format === 'Waterfall' ? 'officials/waterfall_instructions_01.mp3' : 'officials/lane_instructions_01.mp3';
  resetRunnersBehindMarks();
  $('#starter-command').textContent = 'OFFICIAL INSTRUCTIONS';
  $('#starter-detail').textContent = `${state.event} • ${format}`;
  await Promise.all([delay(2300), audio.queueSpeech(instructionFile)]);
  await delay(250 + Math.random() * 300);

  const attemptStart = async () => {
    resetRunnersBehindMarks();
    $('#starter-command').textContent = 'ON YOUR MARKS';
    $('#starter-detail').textContent = `${state.event} • ${format}`;
    await Promise.all([
      audio.queueSpeech(blocks ? 'officials/on_your_marks_blocks_01.mp3' : 'officials/on_your_marks_standing_01.mp3'),
      walkRunnersToMarks(blocks ? 1750 : 1500)
    ]);
    await waitForReady(blocks);
    if (blocks) {
      $('#starter-command').textContent = 'SET';
      await audio.queueSpeech('officials/set_01.mp3');
    }
    const result = await waitForGunWindow((blocks ? 650 : 520) + Math.random() * (blocks ? 1200 : 1450));
    if (result === 'false') {
      hideStartUi();
      await audio.recallGun();
      $('#starter-command').textContent = 'FALSE START';
      await audio.queueSpeech('officials/false_start_01.mp3');
      await delay(800);
      return attemptStart();
    }
    hideStartUi();
    $('#starter-command').textContent = '';
    $('#starter-detail').textContent = '';
    await audio.gun();
    race.started = true;
    race.startClock = performance.now();
    window.__NCFA_RACE_PHASE = 'racing';
    window.dispatchEvent(new CustomEvent('ncfa:gun'));
    audio.startFootsteps();
    setMode('race', 'race-hud');
  };
  return attemptStart();
}

async function preRaceIntro() {
  setMode('prerace', 'race-hud');
  window.__NCFA_RACE_PHASE = 'presentation';
  preRaceStartedAt = performance.now();
  resetRunnersBehindMarks();
  ensureStarterOfficial();
  $('#starter-command').textContent = venue.name.toUpperCase();
  $('#starter-detail').textContent = `${state.event} • ${state.startFormat || 'standard start'}`;
  world.setCrowdReaction('idle');
  audio.startCrowd();
  await delay(220);
  const welcome = AUDIO.pa.welcome[(Math.random() * AUDIO.pa.welcome.length) | 0];
  await Promise.all([delay(1900), audio.queueSpeech(welcome)]);
  $('#starter-command').textContent = '';
  $('#starter-detail').textContent = '';
  if (AUDIO.pa.event[state.event]) await Promise.all([delay(2200), audio.queueSpeech(AUDIO.pa.event[state.event])]);
  if (meetContext.pacer) {
    $('#starter-command').textContent = 'PACE ASSIGNMENT';
    $('#starter-detail').textContent = `Lead through approximately ${meetContext.pacer.target}m`;
    await audio.queueSpeech('officials/pace_assignment_01.mp3');
  }
  await Promise.all([delay(1800), commentary.preRace(state.event, state.startFormat)]);
}

async function startRace() {
  const event = EVENTS[state.event];
  loadWorld(venue);
  race = {
    event,
    runners: createRaceRunners(event),
    player: null,
    started: false,
    time: 0,
    finished: false,
    pacePrompted: false,
    targetTime: state.personalBests[state.event] || event.baseTime,
    startClock: performance.now()
  };
  race.player = race.runners.find((r) => r.player);
  tapTimes.length = 0;
  lastTapKey = null;
  surgeTimer = 0;
  commentary.reset();
  updateRaceLabels();
  stageRunners();
  await preRaceIntro();
  await runStartProcedure();
}

function startField() {
  loadWorld(venue);
  field = { event: EVENTS[state.event], attempts: [], power: 0, rhythm: 0, active: true, startedAt: performance.now() };
  tapTimes.length = 0;
  lastTapKey = null;
  $('#field-event-name').textContent = state.event.toUpperCase();
  $('#field-action').textContent = field.event.action || 'ACTION';
  $('#field-mobile-action').textContent = field.event.action || 'ACTION';
  $('#field-attempts').innerHTML = '';
  setMode('field', 'field-screen');
  audio.startCrowd();
}

function startCompetition() {
  state.venueId = venue.id;
  state.meetNumber += 1;
  persist();
  if (EVENTS[state.event].kind === 'race') startRace(); else startField();
}

function updateRaceLabels() {
  $('#race-event-label').textContent = state.event;
  $('#distance-readout').textContent = `0 / ${EVENTS[state.event].distance}m`;
  $('#race-clock').textContent = '0:00.00';
  $('#place-readout').textContent = `1 / ${ROSTER.length}`;
  $('#cadence-readout').textContent = '0.0';
  world?.setBroadcastClock('0:00.00', state.event);
}

function boxed(r) {
  if (!race || race.event.laneRules === 'lanes' || race.event.laneRules === 'straight-lanes') return false;
  return race.runners.some((o) => o !== r && o.finishTime == null && o.distance > r.distance && o.distance - r.distance < 1.25 && Math.abs(o.laneFloat - r.laneFloat) < 0.42);
}

function draftingBonus(r) {
  if (!race || race.event.laneRules === 'lanes' || race.event.laneRules === 'straight-lanes') return 0;
  let bonus = 0;
  for (const o of race.runners) {
    if (o === r || o.finishTime != null || o.dropped) continue;
    const gap = o.distance - r.distance;
    const laneGap = Math.abs(o.laneFloat - r.laneFloat);
    if (gap >= 0.65 && gap <= 2.8 && laneGap <= 0.62) {
      const centered = 1 - Math.abs(gap - 1.45) / 1.35;
      bonus = Math.max(bonus, 0.006 + Math.max(0, centered) * 0.007);
    }
  }
  return bonus;
}

function updateScience(r, effort, dt) {
  const fx = supplementEffects();
  const s = r.science;
  const sprint = race.event.distance <= 400;
  const high = Math.max(0, effort - 0.82);
  const veryHigh = Math.max(0, effort - 1.05);
  const draft = draftingBonus(r);
  const effectiveEffort = Math.max(0, effort - draft * 0.55);
  const effectiveHigh = Math.max(0, effectiveEffort - 0.82);
  const effectiveVeryHigh = Math.max(0, effectiveEffort - 1.05);

  const pcrDrain = effectiveHigh * (sprint ? 0.085 : 0.045) + effectiveVeryHigh * 0.028;
  const pcrRecovery = effectiveEffort < 0.68 ? 0.022 : effectiveEffort < 0.80 ? 0.006 : 0;
  s.pcr = THREE.MathUtils.clamp(s.pcr - pcrDrain * dt + pcrRecovery * dt, 0, 1);

  const glycogenDrain = race.event.distance >= 3000 ? (0.00022 + effectiveEffort * 0.00016) : (0.000035 + effectiveEffort * 0.000035);
  s.glycogen = THREE.MathUtils.clamp(s.glycogen - glycogenDrain * dt, 0, 1);

  const threshold = 0.78 + fx.economy * 0.10;
  const production = Math.max(0, effectiveEffort - threshold) * (sprint ? 1.25 : 0.52);
  const clearance = effectiveEffort < 0.72 ? (0.20 + (0.72 - effectiveEffort) * 0.45) : 0.025;
  s.lactate = THREE.MathUtils.clamp(s.lactate + (production - clearance) * dt, 1.0, 16.0);

  const bufferProduction = Math.max(0, s.lactate - 6.5) * 0.005 + Math.max(0, effectiveEffort - 1.02) * (0.070 - fx.buffer * 0.35);
  const bufferRecovery = effectiveEffort < 0.68 ? 0.018 : 0;
  s.buffer = THREE.MathUtils.clamp(s.buffer + (bufferProduction - bufferRecovery) * dt, 0, 1);
}

function aiEffort(r) {
  const frac = r.distance / race.event.distance;
  const d = race.event.distance;
  let effort;
  if (d <= 200) effort = frac < 0.35 ? 1.06 : frac < 0.85 ? 1.00 : 1.08;
  else if (d <= 400) effort = frac < 0.25 ? 1.04 : frac < 0.78 ? 0.98 : 1.08;
  else if (d <= 800) effort = frac < 0.16 ? 1.03 : frac < 0.68 ? 0.97 : frac < 0.86 ? 1.01 : 1.10;
  else effort = frac < 0.15 ? 1.00 : frac < 0.75 ? 0.96 : frac < 0.90 ? 1.00 : 1.08;
  effort += Math.sin(r.phase + r.distance * 0.027) * 0.018;
  return THREE.MathUtils.clamp(effort, 0.90, 1.12);
}

function updateLaneDynamics(r, dt) {
  const event = race.event;
  if (event.laneRules === 'lanes' || event.laneRules === 'straight-lanes') return;
  if (r.player) return;

  if (state.event === '800m' && state.startFormat === 'One-Turn Stagger') {
    if (r.distance < (event.breakDistance || 100)) {
      r.laneFloat = r.lane;
      return;
    }
    const target = 1.10 + (r.seedIndex % 4) * 0.12;
    r.laneFloat = THREE.MathUtils.damp(r.laneFloat, target, 1.75, dt);
    return;
  }

  const target = 1.08 + (r.seedIndex % 5) * 0.14;
  const strength = r.distance < 80 ? 1.25 : 0.45;
  r.laneFloat = THREE.MathUtils.damp(r.laneFloat, target, strength, dt);
}

function updatePlayerLane(dt) {
  if (!race?.player || race.event.laneRules === 'lanes' || race.event.laneRules === 'straight-lanes') return;
  const breakDistance = race.event.breakDistance || 0;
  if (state.event === '800m' && state.startFormat === 'One-Turn Stagger' && race.player.distance < breakDistance) {
    race.player.laneFloat = race.player.lane;
    return;
  }
  let delta = 0;
  if (keys.has('KeyA')) delta += 1;
  if (keys.has('KeyD')) delta -= 1;
  race.player.laneFloat = THREE.MathUtils.clamp(race.player.laneFloat + delta * 1.45 * dt, 1.02, 4.2);
}

function updateRunner(r, dt) {
  if (!race.started || r.finishTime != null || r.dropped) return;
  if (r.contactPenalty > 0) r.contactPenalty = Math.max(0, r.contactPenalty - dt);
  updateLaneDynamics(r, dt);

  const isPlayer = r.player;
  const cadenceRatio = isPlayer ? tapRate() / race.event.cadence : aiEffort(r);
  let effort = isPlayer ? THREE.MathUtils.clamp(cadenceRatio, 0.30, 1.35) : cadenceRatio;
  if (isPlayer && surgeTimer > 0) effort = Math.min(1.38, effort + 0.08);
  updateScience(r, effort, dt);

  const s = r.science;
  const fatigue = Math.max(0, s.buffer - 0.55) * 0.30 + Math.max(0, s.lactate - 10.0) * 0.014 + Math.max(0, 0.16 - s.pcr) * 0.22 + Math.max(0, 0.20 - s.glycogen) * 0.18;
  const eventBaseSpeed = race.event.distance / race.event.baseTime;
  const baseSpeed = eventBaseSpeed * r.fitnessFactor;
  let paceFactor;
  if (isPlayer) {
    paceFactor = THREE.MathUtils.clamp(0.70 + effort * 0.31, 0.79, 1.12);
    if (surgeTimer > 0) paceFactor += 0.025;
  } else {
    paceFactor = 0.925 + effort * 0.075;
  }

  let target = baseSpeed * paceFactor * (1 - fatigue) * (1 + draftingBonus(r));
  if (boxed(r)) target *= 0.975;
  if (r.contactPenalty > 0) target *= 0.90;
  r.speed = THREE.MathUtils.damp(r.speed, target, target > r.speed ? 3.2 : 2.15, dt);

  const prev = r.distance;
  r.distance += Math.max(0, r.speed) * dt;
  if (prev < 200 && r.distance >= 200) r.split200 = race.time;
  if (prev < race.event.distance / 2 && r.distance >= race.event.distance / 2) r.halfway = race.time;
  if (r.distance >= race.event.distance) {
    r.distance = race.event.distance;
    r.finishTime = race.time;
    if (r.player) onPlayerFinish();
  }
}

function resolveContacts() {
  if (!race?.started || race.event.laneRules === 'lanes' || race.event.laneRules === 'straight-lanes') return;
  for (let i = 0; i < race.runners.length; i++) {
    for (let j = i + 1; j < race.runners.length; j++) {
      const a = race.runners[i];
      const b = race.runners[j];
      if (a.finishTime != null || b.finishTime != null || a.dropped || b.dropped) continue;
      const gap = Math.abs(a.distance - b.distance);
      const laneGap = Math.abs(a.laneFloat - b.laneFloat);
      if (gap > 0.62 || laneGap > 0.43) continue;
      const rear = a.distance <= b.distance ? a : b;
      const front = rear === a ? b : a;
      if (rear.contactPenalty <= 0.03) {
        rear.contactPenalty = 0.34;
        rear.speed *= 0.90;
        if (rear.player || front.player) showSplit('CONTACT — MOMENTUM LOST');
        navigator.vibrate?.(18);
      }
      const direction = a.laneFloat <= b.laneFloat ? -1 : 1;
      a.laneFloat = THREE.MathUtils.clamp(a.laneFloat + direction * 0.035, 1.02, 4.4);
      b.laneFloat = THREE.MathUtils.clamp(b.laneFloat - direction * 0.035, 1.02, 4.4);
    }
  }
}

function updateMeshes(t, preRace = false) {
  if (!race) return;
  const phase = window.__NCFA_RACE_PHASE || 'idle';
  const walking = preRace && phase === 'walk';
  const startPose = preRace && (phase === 'ready' || phase === 'hold');
  for (const r of race.runners) {
    const { p, ahead } = pathForRunner(r);
    r.mesh.position.copy(p);
    orientRunner(r.mesh, p, ahead);
    animateAthlete(r.mesh, t, walking ? 2.2 : r.speed, r.science.buffer, r.phase, startPose);
  }
}

function updateRaceHud() {
  if (!race?.player) return;
  const p = race.player;
  const place = getPlace(p);
  const time = formatTime(race.time);
  $('#race-clock').textContent = time;
  $('#place-readout').textContent = `${place} / ${race.runners.length}`;
  $('#distance-readout').textContent = `${Math.floor(p.distance)} / ${race.event.distance}m`;
  $('#cadence-readout').textContent = tapRate().toFixed(1);
  $('#pcr-value').textContent = `${Math.round(p.science.pcr * 100)}%`;
  $('#pcr-bar').style.width = `${p.science.pcr * 100}%`;
  $('#glycogen-value').textContent = `${Math.round(p.science.glycogen * 100)}%`;
  $('#glycogen-bar').style.width = `${p.science.glycogen * 100}%`;
  $('#lactate-value').textContent = p.science.lactate.toFixed(1);
  $('#lactate-bar').style.width = `${Math.min(100, p.science.lactate / 14 * 100)}%`;
  $('#buffer-value').textContent = `${Math.round(p.science.buffer * 100)}%`;
  $('#buffer-bar').style.width = `${p.science.buffer * 100}%`;
  world?.setBroadcastClock(time, state.event);
}

function maybePacerPrompt() {
  if (!meetContext.pacer || meetContext.pacer.resolved || !race?.player || race.player.distance < meetContext.pacer.target) return;
  meetContext.pacer.resolved = true;
  race.started = false;
  window.__NCFA_RACE_PHASE = 'pacer-choice';
  $('#pace-choice').classList.remove('hidden');
  audio.queueSpeech('officials/pace_drop_01.mp3');
}

function resolvePacer(drop) {
  $('#pace-choice').classList.add('hidden');
  if (drop) {
    race.player.dropped = true;
    race.player.finishTime = race.time;
    state.coachTrust = Math.min(100, state.coachTrust + 6);
    finishRaceAsPacer();
  } else {
    state.coachTrust = Math.max(0, state.coachTrust - 4);
    race.started = true;
    window.__NCFA_RACE_PHASE = 'racing';
  }
  persist();
}

function finishRaceAsPacer() {
  audio.stopFootsteps();
  race.finished = true;
  race.player.pacerDNF = true;
  finishCinematic(0, { pacer: true });
}

function projectedResults() {
  for (const r of race.runners) {
    if (r.finishTime == null && !r.dropped) {
      const remaining = Math.max(0, race.event.distance - r.distance);
      const eventBaseSpeed = race.event.distance / race.event.baseTime;
      const liveSpeed = Math.max(r.speed, eventBaseSpeed * r.fitnessFactor * 0.91);
      r.finishTime = race.time + remaining / liveSpeed;
    }
  }
  return [...race.runners].sort((a, b) => (a.finishTime ?? 999999) - (b.finishTime ?? 999999));
}

async function onPlayerFinish() {
  if (race.finished) return;
  race.finished = true;
  race.started = false;
  window.__NCFA_RACE_PHASE = 'finished';
  audio.stopFootsteps();
  const ranked = projectedResults();
  const place = ranked.indexOf(race.player) + 1;
  const pb = state.personalBests[state.event];
  const pr = Number.isFinite(pb) && race.player.finishTime < pb;
  const bigPr = pr && pb - race.player.finishTime > pb * 0.015;
  const upset = place === 1 && meetContext.heatStrength > 1.004;
  if (pr) state.personalBests[state.event] = race.player.finishTime;
  const sb = state.seasonBests[state.event];
  if (!sb || race.player.finishTime < sb) state.seasonBests[state.event] = race.player.finishTime;
  state.points += PLACE_POINTS[place - 1] || 15;
  state.teamPoints += TEAM_POINTS[place - 1] || 0;
  state.energy = Math.max(20, state.energy - Math.min(25, 8 + race.event.distance / 700));
  state.coachTrust = Math.min(100, state.coachTrust + (place <= 3 ? 3 : place >= 7 ? -1 : 1));
  persist();
  await finishCinematic(place, { pr, bigPr, upset });
}

async function finishCinematic(place, flags = {}) {
  cinematicPlace = place;
  cinematicStart = performance.now();
  world.setCrowdReaction(place === 1 ? 'win' : place === 0 ? 'mid' : place <= 5 ? 'mid' : 'loss');
  audio.crowdReaction(place || 4);
  $('#finish-headline').textContent = flags.pacer ? 'PACING JOB COMPLETE' : place === 1 ? 'HAWTHORNE WINS!' : place <= 5 ? 'SOLID FINISH' : 'TOUGH DAY';
  $('#finish-subline').textContent = flags.pacer ? 'Coach assignment complete. Official result: DNF • PACER.' : `${state.athleteName} • ${state.event} • ${place}${place === 1 ? 'ST' : place === 2 ? 'ND' : place === 3 ? 'RD' : 'TH'}`;
  setMode('cinematic', 'finish-cinematic');
  const speech = flags.pacer ? Promise.resolve() : commentary.finish({ place, ...flags });
  await Promise.all([delay(3000), speech]);
  renderResults(flags.pacer);
  setMode('results', 'results-screen');
  audio.queueSpeech(AUDIO.pa.results);
}

function renderResults(pacer = false) {
  $('#results-title').textContent = `${state.event} • OFFICIAL`;
  if (pacer) {
    $('#result-reward').textContent = 'Coach assignment completed • +6 coach trust';
    $('#results-list').innerHTML = `<div class="result-row player"><div class="result-place">—</div><div class="result-name"><strong>${state.athleteName}</strong><span>Hawthorne • PACER</span></div><div class="result-time">DNF</div><div class="result-badge">PACER</div></div>`;
    return;
  }
  const ranked = [...race.runners].sort((a, b) => a.finishTime - b.finishTime);
  const place = ranked.indexOf(race.player) + 1;
  const reward = PLACE_POINTS[place - 1] || 15;
  $('#result-reward').textContent = `+${reward} performance points • ${TEAM_POINTS[place - 1] || 0} team points`;
  $('#results-list').innerHTML = ranked.map((r, i) => {
    const pr = r.player && r.finishTime <= state.personalBests[state.event];
    return `<div class="result-row ${r.player ? 'player' : ''}"><div class="result-place">${i + 1}</div><div class="result-name"><strong>${r.player ? state.athleteName : r.name}</strong><span>${r.school}</span></div><div class="result-time">${formatTime(r.finishTime)}</div><div class="result-badge">${pr ? 'PR' : ''}</div></div>`;
  }).join('');
}

function attemptField() {
  if (!field?.active || field.attempts.length >= 3) return;
  const rate = tapRate();
  const rhythm = THREE.MathUtils.clamp(rate / 4.2, .25, 1.18);
  const timing = .72 + Math.random() * .32;
  const foul = rhythm > 1.14 && Math.random() < .28;
  const dev = state.development.technique || 0;
  const rating = (CAREERS[state.career]?.rating || 78) / 78;
  const form = meetContext.form;
  const mark = foul ? null : field.event.baseMark * rating * form * (.83 + rhythm * .12 + timing * .06 + dev * .002);
  field.attempts.push(mark);
  tapTimes.length = 0;
  $('#field-power').style.width = '0%';
  $('#field-attempts').innerHTML = field.attempts.map((x, i) => `<div class="field-attempt"><span>Attempt ${i + 1}</span><strong>${x == null ? 'FOUL' : field.event.unit === 'pts' ? Math.round(x) : `${x.toFixed(2)} m`}</strong></div>`).join('');
  if (field.attempts.length >= 3) setTimeout(finishField, 900);
}

async function finishField() {
  field.active = false;
  const valid = field.attempts.filter(Number.isFinite);
  const best = valid.length ? Math.max(...valid) : 0;
  const competitors = Array.from({ length: 7 }, () => field.event.baseMark * (0.97 + Math.random() * .06));
  const place = [best, ...competitors].sort((a, b) => b - a).indexOf(best) + 1;
  state.points += PLACE_POINTS[place - 1] || 15;
  state.teamPoints += TEAM_POINTS[place - 1] || 0;
  state.energy = Math.max(20, state.energy - 12);
  persist();
  cinematicPlace = place;
  world.setCrowdReaction(place === 1 ? 'win' : place <= 5 ? 'mid' : 'loss');
  audio.crowdReaction(place);
  $('#finish-headline').textContent = place === 1 ? 'HAWTHORNE WINS!' : place <= 5 ? 'IN THE MIX' : 'ROUGH SERIES';
  $('#finish-subline').textContent = `${state.event} • Best ${field.event.unit === 'pts' ? Math.round(best) : `${best.toFixed(2)} m`} • ${place} place`;
  setMode('cinematic', 'finish-cinematic');
  await delay(3000);
  $('#results-title').textContent = `${state.event} • OFFICIAL`;
  $('#result-reward').textContent = `+${PLACE_POINTS[place - 1] || 15} performance points`;
  $('#results-list').innerHTML = `<div class="result-row player"><div class="result-place">${place}</div><div class="result-name"><strong>${state.athleteName}</strong><span>Hawthorne</span></div><div class="result-time">${field.event.unit === 'pts' ? Math.round(best) : `${best.toFixed(2)}m`}</div><div class="result-badge"></div></div>`;
  setMode('results', 'results-screen');
}

function runnerCameraFrame(r) {
  const path = pathForRunner(r);
  const tangent = path.ahead.clone().sub(path.p).normalize();
  const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
  return { ...path, tangent, side };
}

function racePackCenter() {
  if (!race?.runners?.length) return new THREE.Vector3();
  return race.runners.reduce((sum, r) => sum.add(pathForRunner(r).p), new THREE.Vector3()).multiplyScalar(1 / race.runners.length);
}

function setMainCamera(position, target, fov = 42) {
  camera.position.copy(position);
  camera.lookAt(target);
  camera.fov = fov;
  camera.updateProjectionMatrix();
}

function buildStarterOfficial() {
  const g = new THREE.Group();
  g.name = 'NCFA Senior Starter';
  const skin = new THREE.MeshStandardMaterial({ color: 0xb77c58, roughness: .82 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0xd8dde0, roughness: .72 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15191f, roughness: .9 });
  const grey = new THREE.MeshStandardMaterial({ color: 0xb8bcc1, roughness: .94 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(.78, .95, .42), shirt); body.position.y = 1.35; g.add(body);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(.54, .95, .34), dark); legs.position.y = .48; g.add(legs);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.24, 14, 10), skin); head.position.y = 2.08; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.247, 14, 8, 0, Math.PI * 2, 0, Math.PI * .52), grey); hair.position.y = 2.15; hair.scale.y = .5; g.add(hair);
  const rightArm = new THREE.Group(); rightArm.position.set(.45, 1.62, 0); const arm = new THREE.Mesh(new THREE.CylinderGeometry(.07, .065, .62, 7), skin); arm.position.y = -.31; rightArm.add(arm); g.add(rightArm);
  const leftArm = rightArm.clone(); leftArm.position.x = -.45; g.add(leftArm);
  g.userData.rightArm = rightArm;
  return g;
}

function ensureStarterOfficial() {
  if (!race?.runners?.length || !world?.group) return null;
  if (!starterOfficial) starterOfficial = buildStarterOfficial();
  if (!starterOfficial.parent) world.group.add(starterOfficial);
  const center = racePackCenter();
  const frame = runnerCameraFrame(race.player || race.runners[0]);
  starterOfficial.position.copy(center.clone().addScaledVector(frame.tangent, -4.8).addScaledVector(frame.side, 6.4));
  starterOfficial.position.y = .08;
  starterOfficial.lookAt(center.x, 1.2, center.z);
  starterOfficial.visible = mode === 'prerace';
  return starterOfficial;
}

function updateStarterOfficial(elapsed) {
  const official = ensureStarterOfficial();
  if (!official) return;
  const command = ($('#starter-command').textContent || '').toUpperCase();
  const speaking = /OFFICIAL INSTRUCTIONS|ON YOUR MARKS|SET/.test(command);
  if (official.userData.rightArm) {
    official.userData.rightArm.rotation.x = speaking ? -.72 + Math.sin(elapsed * 5) * .10 : -.08;
    official.userData.rightArm.rotation.z = speaking ? -.18 : 0;
  }
}

function officialCamera() {
  const official = ensureStarterOfficial();
  if (!official) return;
  const center = racePackCenter();
  const direction = center.clone().sub(official.position).setY(0).normalize();
  const side = new THREE.Vector3(-direction.z, 0, direction.x);
  setMainCamera(official.position.clone().addScaledVector(direction, -2.5).addScaledVector(side, .65).add(new THREE.Vector3(0, 1.65, 0)), official.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 29);
}

function updatePreRaceCamera(elapsed) {
  if (!race?.runners?.length) return;
  const command = ($('#starter-command').textContent || '').toUpperCase();
  const phase = window.__NCFA_RACE_PHASE || 'presentation';
  const player = race.player || race.runners[0];
  const frame = runnerCameraFrame(player);
  const center = racePackCenter();

  if (command === 'OFFICIAL INSTRUCTIONS' || command === 'SET') {
    officialCamera();
    return;
  }
  if (command === 'ON YOUR MARKS' || phase === 'walk') {
    if (startState.walkProgress < .28) officialCamera();
    else if (startState.walkProgress < .72) setMainCamera(center.clone().addScaledVector(frame.side, 7.5).addScaledVector(frame.tangent, -1.0).add(new THREE.Vector3(0, 1.5, 0)), center.clone().add(new THREE.Vector3(0, 1.2, 0)), 35);
    else setMainCamera(center.clone().addScaledVector(frame.tangent, -7.8).add(new THREE.Vector3(0, 2.0, 0)), center.clone().addScaledVector(frame.tangent, 7).add(new THREE.Vector3(0, 1.15, 0)), 42);
    return;
  }
  if (phase === 'ready' || phase === 'hold') {
    setMainCamera(center.clone().addScaledVector(frame.tangent, -7.8).add(new THREE.Vector3(0, 2.0, 0)), center.clone().addScaledVector(frame.tangent, 8).add(new THREE.Vector3(0, 1.15, 0)), 42);
    return;
  }

  const t = Math.max(0, (performance.now() - preRaceStartedAt) / 1000);
  const cycle = t % 9.6;
  if (cycle < 1.6) setMainCamera(new THREE.Vector3(18, 16, 92), new THREE.Vector3(0, 1.5, 0), 47);
  else if (cycle < 3.1) setMainCamera(new THREE.Vector3(-42, 5.0, 48), new THREE.Vector3(-16, 4.0, 61), 33);
  else if (cycle < 4.4) setMainCamera(new THREE.Vector3(21, 15.0, 52), new THREE.Vector3(42, 17.5, 80), 31);
  else if (cycle < 5.8) setMainCamera(center.clone().addScaledVector(frame.side, 7.2).addScaledVector(frame.tangent, -1.1).add(new THREE.Vector3(0, 1.6, 0)), center.clone().add(new THREE.Vector3(0, 1.25, 0)), 35);
  else if (cycle < 7.0) setMainCamera(frame.p.clone().addScaledVector(frame.tangent, -2.1).addScaledVector(frame.side, .85).add(new THREE.Vector3(0, 1.65, 0)), frame.p.clone().add(new THREE.Vector3(0, 1.5, 0)), 28);
  else if (cycle < 8.2) {
    const other = race.runners[Math.min(2, race.runners.length - 1)];
    const of = runnerCameraFrame(other);
    setMainCamera(of.p.clone().addScaledVector(of.tangent, -2.1).addScaledVector(of.side, -.85).add(new THREE.Vector3(0, 1.65, 0)), of.p.clone().add(new THREE.Vector3(0, 1.5, 0)), 28);
  } else setMainCamera(center.clone().addScaledVector(frame.tangent, -6.3).addScaledVector(frame.side, 4.4).add(new THREE.Vector3(0, 1.8, 0)), center.clone().add(new THREE.Vector3(0, 1.25, 0)), 39);
}

function updateRaceCamera(dt) {
  const p = race.player;
  const path = pathForRunner(p);
  const tangent = path.ahead.clone().sub(path.p).normalize();
  const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
  const desired = path.p.clone().addScaledVector(tangent, -10).addScaledVector(side, 2.5).add(new THREE.Vector3(0, 4, 0));
  camera.position.lerp(desired, 1 - Math.exp(-4.7 * dt));
  camera.lookAt(path.p.clone().addScaledVector(tangent, 7).add(new THREE.Vector3(0, 1.3, 0)));
  camera.fov = 54;
  camera.updateProjectionMatrix();
}

function updateBroadcastCamera() {
  if (!race?.player) return;
  const athletes = race.runners.filter((r) => !r.dropped);
  if (!athletes.length) return;
  const center = athletes.reduce((sum, r) => sum.add(pathForRunner(r).p), new THREE.Vector3()).multiplyScalar(1 / athletes.length);
  const leader = [...athletes].sort((a, b) => b.distance - a.distance)[0];
  const leadPath = pathForRunner(leader);
  const tangent = leadPath.ahead.clone().sub(leadPath.p).normalize();
  const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
  broadcastCamera.position.copy(center.clone().addScaledVector(tangent, -26).addScaledVector(side, 20).add(new THREE.Vector3(0, 14, 0)));
  broadcastCamera.lookAt(center.clone().add(new THREE.Vector3(0, 1.2, 0)));
}

function renderBroadcast() {
  if (!world?.videoBoard?.screen) return;
  world.setBroadcastClock(formatTime(race?.time || 0), state.event || 'NCFA');
  world.videoBoard.screen.visible = false;
  world.videoBoard.clockPanel.visible = false;
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, broadcastCamera);
  renderer.setRenderTarget(null);
  world.videoBoard.screen.visible = true;
  world.videoBoard.clockPanel.visible = true;
}

function showSplit(text) {
  const el = $('#split-toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(splitToastTimer);
  splitToastTimer = setTimeout(() => el.classList.remove('show'), 1500);
}

function updateCommentary() {
  const p = race.player;
  const leader = [...race.runners].sort((a, b) => b.distance - a.distance)[0];
  commentary.update({ raceTime: race.time, eventDistance: race.event.distance, playerDistance: p.distance, place: getPlace(p), leaderDistance: leader.distance, targetTime: race.targetTime, split200: p.split200, halfwaySplit: p.halfway, isBoxed: boxed(p), playerSpeed: p.speed, leaderSpeed: leader.speed });
}

function handleRaceFrame(dt, elapsed) {
  if (!race) return;
  if (race.started) {
    race.time += dt;
    updatePlayerLane(dt);
    if (surgeTimer > 0) surgeTimer -= dt;
    race.runners.forEach((r) => updateRunner(r, dt));
    resolveContacts();
    maybePacerPrompt();
    updateCommentary();
  }
  updateMeshes(elapsed, false);
  updateRaceHud();
  updateRaceCamera(dt);
  updateBroadcastCamera();
  world.update(elapsed);
}

function handlePreRace(dt, elapsed) {
  if (!race) return;
  updateMeshes(elapsed, true);
  updateRaceHud();
  updateStarterOfficial(elapsed);
  updatePreRaceCamera(elapsed);
  updateBroadcastCamera();
  world.update(elapsed);
}

function handleCinematic(dt, elapsed) {
  const t = (performance.now() - cinematicStart) / 1000;
  const radius = cinematicPlace === 1 ? 100 : 82;
  const angle = .55 + t * (cinematicPlace === 1 ? .45 : .26);
  camera.position.set(Math.sin(angle) * radius, cinematicPlace === 1 ? 55 : 38, Math.cos(angle) * radius);
  camera.lookAt(0, 5, cinematicPlace === 1 ? 35 : 55);
  world.update(elapsed);
}

function handleAttract(dt, elapsed) {
  attractAngle += dt * .075;
  const radius = 122;
  camera.position.set(Math.sin(attractAngle) * radius, 52 + Math.sin(attractAngle * .7) * 5, Math.cos(attractAngle) * radius);
  camera.lookAt(0, 0, 0);
  world.update(elapsed);
  broadcastCamera.position.set(58, 25, 60);
  broadcastCamera.lookAt(0, 0, 0);
}

function handleField(elapsed) {
  const rate = tapRate();
  field.power = THREE.MathUtils.clamp(rate / 4.3, 0, 1.15);
  $('#field-power').style.width = `${Math.min(100, field.power * 100)}%`;
  camera.position.lerp(new THREE.Vector3(-35, 12, 28), .04);
  camera.lookAt(0, 0, 0);
  world.update(elapsed);
}

function onKeyDown(e) {
  keys.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (mode === 'race') {
    if (e.code === 'KeyQ') recordTap('q');
    if (e.code === 'KeyP') recordTap('p');
    if (e.code === 'Space' && race?.started) surgeTimer = 1.0;
  }
  if (mode === 'field') {
    if (e.code === 'KeyQ') recordTap('q');
    if (e.code === 'KeyP') recordTap('p');
    if (e.code === 'Space') attemptField();
  }
}
addEventListener('keydown', onKeyDown);
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 2));
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

function bindTapButton(id, key) {
  const el = $(id);
  if (el) el.addEventListener('pointerdown', (e) => { e.preventDefault(); recordTap(key); });
}
bindTapButton('#mobile-q', 'q');
bindTapButton('#mobile-p', 'p');
bindTapButton('#field-q', 'q');
bindTapButton('#field-p', 'p');
$('#mobile-out').addEventListener('pointerdown', () => { if (race?.player) race.player.laneFloat = Math.min(4.2, race.player.laneFloat + .18); });
$('#mobile-in').addEventListener('pointerdown', () => { if (race?.player) race.player.laneFloat = Math.max(1.02, race.player.laneFloat - .18); });
$('#mobile-surge').addEventListener('pointerdown', () => { if (race?.started) surgeTimer = 1.0; });
$('#field-action').addEventListener('click', attemptField);
$('#field-mobile-action').addEventListener('pointerdown', attemptField);
$('#pace-drop').addEventListener('click', () => resolvePacer(true));
$('#pace-continue').addEventListener('click', () => resolvePacer(false));

$('#enter-game').addEventListener('click', async () => { await audio.startCrowd(); setMode('menu', 'main-menu'); });
$('#audio-toggle').addEventListener('click', () => { audio.setEnabled(!audio.enabled); $('#audio-toggle').textContent = `SOUND: ${audio.enabled ? 'ON' : 'OFF'}`; });
$$('[data-mode]').forEach((b) => b.addEventListener('click', () => {
  quickMode = b.dataset.mode !== 'career';
  state = quickMode ? defaultCareerState() : state;
  setMode('career-select');
}));
$$('[data-back="menu"]').forEach((b) => b.addEventListener('click', () => setMode('menu', 'main-menu')));
$('#back-career').addEventListener('click', () => setMode('career-select'));
$('#create-career').addEventListener('click', commitCareer);
$('#change-event').addEventListener('click', () => { selectedCareer = state.career; chooseCareer(state.career); });
$('#race-now').addEventListener('click', prepareMeet);
$('#start-meet').addEventListener('click', startCompetition);
$('#open-classes').addEventListener('click', () => { renderClasses(); setMode('classes', 'classes-screen'); });
$('#open-practice').addEventListener('click', () => { renderPractice(); setMode('practice', 'practice-screen'); });
$('#open-shop').addEventListener('click', () => { renderShop(); setMode('shop', 'shop-screen'); });
$$('.back-hub').forEach((b) => b.addEventListener('click', () => { renderHub(); setMode('hub', 'career-hub'); }));
$('#return-hub').addEventListener('click', () => { cleanupCompetition(); venue = randomVenue(); loadWorld(venue); renderHub(); setMode('hub', 'career-hub'); });
$('#race-again').addEventListener('click', () => { cleanupCompetition(); prepareMeet(); });

function cleanupCompetition() {
  if (race?.runners) race.runners.forEach((r) => { if (r.mesh?.parent) r.mesh.parent.remove(r.mesh); });
  if (starterOfficial?.parent) starterOfficial.parent.remove(starterOfficial);
  starterOfficial = null;
  race = null;
  field = null;
  hideStartUi();
  audio.stopFootsteps();
  commentary.reset();
  world.setCrowdReaction('idle');
  window.__NCFA_RACE_PHASE = 'idle';
}

try {
  const saved = localStorage.getItem('ncfaCareer');
  if (saved) {
    const parsed = JSON.parse(saved);
    state = { ...defaultCareerState(), ...parsed, development: { ...defaultCareerState().development, ...(parsed.development || {}) } };
    if (state.venueId) venue = VENUES.find((v) => v.id === state.venueId) || venue;
    loadWorld(venue);
  }
} catch {}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .033);
  const elapsed = clock.elapsedTime;
  if (mode === 'race') handleRaceFrame(dt, elapsed);
  else if (mode === 'prerace') handlePreRace(dt, elapsed);
  else if (mode === 'cinematic') handleCinematic(dt, elapsed);
  else if (mode === 'field') handleField(elapsed);
  else handleAttract(dt, elapsed);
  renderBroadcast();
  renderer.render(scene, camera);
}
animate();
