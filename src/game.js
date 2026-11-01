import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { CAREERS, EVENTS, VENUES, PLACE_POINTS, TEAM_POINTS, CLASSES, PRACTICES, SHOP_ITEMS, ROSTER, defaultCareerState } from './data.js';
import { createAthlete, animateAthlete } from './athlete.js';
import { createWorld, stadiumPoint, INNER_RADIUS, LANE_WIDTH, LAP } from './world.js';
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
const renderTarget = new THREE.WebGLRenderTarget(mobile ? 256 : 512, mobile ? 144 : 288, { colorSpace: THREE.SRGBColorSpace });

scene.add(new THREE.HemisphereLight(0xd6e4ff, 0x334421, 1.8));
const sun = new THREE.DirectionalLight(0xffffff, 3.1);
sun.position.set(-58, 90, -42);
sun.castShadow = true;
sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
sun.shadow.camera.left = -145; sun.shadow.camera.right = 145; sun.shadow.camera.top = 110; sun.shadow.camera.bottom = -110;
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
let introAngle = 0;
let cinematicStart = 0;
let cinematicPlace = 1;
let splitToastTimer = null;
let meetContext = { heatStrength: 1, form: 1, pacer: null };
const keys = new Set();
const tapTimes = [];
let lastTapKey = null;
let laneDelta = 0;
let surgeTimer = 0;

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
  persist(); renderClasses(); renderHub();
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
  persist(); renderHub(); renderPractice();
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
  persist(); renderShop(); renderHub();
}

function persist() { if (!quickMode) localStorage.setItem('ncfaCareer', JSON.stringify(state)); }

function supplementEffects() {
  const total = { buffer: 0, power: 0, recovery: 0, economy: 0, glycogen: 0, hydration: 0, focus: 0, durability: 0 };
  for (const id of state.inventory) {
    const item = SHOP_ITEMS.find((x) => x.id === id);
    if (item) Object.entries(item.effects).forEach(([k, v]) => { total[k] = (total[k] || 0) + v; });
  }
  return total;
}

function prepareMeet() {
  meetContext.heatStrength = 0.92 + Math.random() * 0.20;
  meetContext.form = 0.965 + Math.random() * 0.075;
  meetContext.pacer = null;
  const event = EVENTS[state.event];
  if (event?.kind === 'race' && event.distance >= 800 && Math.random() < 0.22) {
    const fractions = event.distance <= 800 ? [0.5, 0.75] : [0.4, 0.5, 0.66];
    const fraction = fractions[(Math.random() * fractions.length) | 0];
    meetContext.pacer = { target: Math.round(event.distance * fraction / 100) * 100, resolved: false };
  }
  $('#meet-title').textContent = state.meetNumber ? `NCFA Meet ${state.meetNumber + 1}` : 'NCFA Season Opener';
  $('#meet-event').textContent = state.event;
  $('#meet-start').textContent = state.startFormat || 'Standard';
  $('#heat-strength').textContent = meetContext.heatStrength > 1.06 ? 'LOADED' : meetContext.heatStrength > 1.0 ? 'STRONG' : meetContext.heatStrength < .96 ? 'SOFT' : 'BALANCED';
  $('#daily-form').textContent = meetContext.form > 1.025 ? 'FLYING' : meetContext.form < .985 ? 'FLAT' : 'NORMAL';
  $('#venue-options').innerHTML = VENUES.map((v) => `<button class="choice-card ${v.id === venue.id ? 'selected' : ''}" data-venue="${v.id}"><strong>${v.name}</strong><small>${v.city} • ${v.seats.toLocaleString()} seats</small></button>`).join('');
  $$('#venue-options [data-venue]').forEach((b) => b.addEventListener('click', () => {
    venue = VENUES.find((v) => v.id === b.dataset.venue) || venue;
    $$('#venue-options .choice-card').forEach((x) => x.classList.remove('selected')); b.classList.add('selected');
  }));
  const assignment = $('#pace-assignment');
  if (meetContext.pacer) {
    assignment.classList.remove('hidden');
    assignment.innerHTML = `<strong>COACH ASSIGNMENT: PACER</strong><p>Lead or help control the race through roughly ${meetContext.pacer.target}m, then step off. You may ignore the instruction and finish, but coach trust can change.</p>`;
  } else assignment.classList.add('hidden');
  setMode('meet-setup');
}

function createRaceRunners(event) {
  const effects = supplementEffects();
  return ROSTER.map((seed, i) => {
    const mesh = createAthlete(seed, i + 1);
    world.group.add(mesh);
    const ratingFactor = 1 + (seed.rating - 79) * 0.0042;
    const day = seed.player ? meetContext.form : 0.965 + Math.random() * 0.075;
    const fieldAdj = seed.player ? 1 : meetContext.heatStrength;
    const potential = event.baseTime / (ratingFactor * day * fieldAdj);
    return {
      ...seed, mesh, lane: i + 1, laneFloat: event.laneRules === 'waterfall' || state.startFormat === 'Waterfall' ? 1.15 + (i % 4) * 0.62 : i + 1,
      distance: 0, speed: 0, finishTime: null, phase: Math.random() * Math.PI * 2, potential,
      science: { pcr: 1, glycogen: Math.min(1, .92 + effects.glycogen), lactate: 1.2, buffer: 0 },
      split200: null, halfway: null, dropped: false
    };
  });
}

function getPlace(target) {
  if (!race) return 1;
  const ranked = [...race.runners].sort((a, b) => {
    if (a.finishTime != null && b.finishTime != null) return a.finishTime - b.finishTime;
    if (a.finishTime != null) return -1; if (b.finishTime != null) return 1;
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
  while (tapTimes.length && now - tapTimes[0] > 1400) tapTimes.shift();
  const light = key === 'q' ? $('#q-light') : $('#p-light');
  light?.classList.add('active');
  setTimeout(() => light?.classList.remove('active'), 90);
}

function tapRate() {
  const now = performance.now();
  while (tapTimes.length && now - tapTimes[0] > 1400) tapTimes.shift();
  if (tapTimes.length < 2) return 0;
  const span = (tapTimes.at(-1) - tapTimes[0]) / 1000;
  return span > 0 ? (tapTimes.length - 1) / span : 0;
}

async function preRaceIntro() {
  setMode('prerace', 'race-hud');
  $('#starter-command').textContent = venue.name.toUpperCase();
  $('#starter-detail').textContent = `${state.event} • ${state.startFormat || 'standard start'}`;
  introAngle = 0;
  world.setCrowdReaction('idle');
  await audio.startCrowd();
  const welcome = AUDIO.pa.welcome[(Math.random() * AUDIO.pa.welcome.length) | 0];
  await Promise.all([delay(2600), audio.queueSpeech(welcome)]);
  if (AUDIO.pa.event[state.event]) await audio.queueSpeech(AUDIO.pa.event[state.event]);
  await commentary.preRace(state.event, state.startFormat);
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
    targetTime: (state.personalBests[state.event] || event.baseTime) * 1.005,
    startClock: performance.now()
  };
  race.player = race.runners.find((r) => r.player);
  tapTimes.length = 0; lastTapKey = null; surgeTimer = 0; commentary.reset();
  updateRaceLabels();
  await preRaceIntro();
  await audio.starterSequence({
    blocks: event.start === 'blocks', startFormat: state.startFormat,
    onCommand: (text) => { $('#starter-command').textContent = text; $('#starter-detail').textContent = text ? `${state.startFormat || 'lane start'} • starter timing varies` : ''; },
    onGun: () => {
      race.started = true;
      race.startClock = performance.now();
      $('#starter-command').textContent = '';
      $('#starter-detail').textContent = '';
      audio.startFootsteps();
      setMode('race', 'race-hud');
    }
  });
}

function startField() {
  loadWorld(venue);
  field = { event: EVENTS[state.event], attempts: [], power: 0, rhythm: 0, active: true, startedAt: performance.now() };
  tapTimes.length = 0; lastTapKey = null;
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
  $('#place-readout').textContent = '1 / 8';
}

function pathForRunner(r) {
  const e = race.event;
  let lane = r.laneFloat;
  let course = r.distance;
  if (e.laneRules === 'lanes') {
    lane = r.lane;
    course += (r.lane - 1) * Math.PI * LANE_WIDTH;
  } else if (state.startFormat === 'One-Turn Stagger') {
    if (r.distance < 105) {
      lane = r.lane;
      course += (r.lane - 1) * Math.PI * LANE_WIDTH;
    } else if (r.distance < 150) {
      const t = (r.distance - 105) / 45;
      lane = THREE.MathUtils.lerp(r.lane, r.laneFloat, t);
      course += (1 - t) * (r.lane - 1) * Math.PI * LANE_WIDTH;
    }
  }
  const radius = INNER_RADIUS + (lane - .5) * LANE_WIDTH;
  return { p: stadiumPoint(course % LAP, radius), ahead: stadiumPoint((course + .7) % LAP, radius), lane };
}

function boxed(r) {
  if (!race || race.event.laneRules === 'lanes') return false;
  return race.runners.some((o) => o !== r && o.finishTime == null && o.distance > r.distance && o.distance - r.distance < 1.4 && Math.abs(o.laneFloat - r.laneFloat) < .32);
}

function updateScience(r, effort, dt) {
  const fx = supplementEffects();
  const s = r.science;
  const intensity = Math.max(0, effort - .55);
  s.pcr = THREE.MathUtils.clamp(s.pcr - intensity * .22 * dt + (effort < .62 ? .055 * dt : .008 * dt), 0, 1);
  s.glycogen = THREE.MathUtils.clamp(s.glycogen - (.0008 + effort * .0014) * dt * (race.event.distance >= 3000 ? 1.2 : .8), 0, 1);
  const production = Math.max(0, effort - (.66 + fx.economy * .12)) * 3.2;
  const clearance = Math.max(0, .72 - effort) * .62;
  s.lactate = THREE.MathUtils.clamp(s.lactate + (production - clearance) * dt, 1.0, 18);
  s.buffer = THREE.MathUtils.clamp(s.buffer + Math.max(0, effort - .72) * (.36 - fx.buffer * .9) * dt - (effort < .65 ? .07 * dt : 0), 0, 1);
}

function aiEffort(r) {
  const frac = r.distance / race.event.distance;
  let e = race.event.distance <= 400 ? .93 : frac < .15 ? .78 : frac < .7 ? .68 : frac < .88 ? .75 : .91;
  e += Math.sin(r.phase + r.distance * .035) * .016;
  return THREE.MathUtils.clamp(e, .58, 1);
}

function updateRunner(r, dt) {
  if (!race.started || r.finishTime != null || r.dropped) return;
  const isPlayer = r.player;
  const rate = isPlayer ? tapRate() : race.event.cadence * aiEffort(r);
  let effort = isPlayer ? THREE.MathUtils.clamp(rate / race.event.cadence, .28, 1.13) : aiEffort(r);
  if (isPlayer && surgeTimer > 0) effort = Math.min(1.18, effort + .10);
  updateScience(r, effort, dt);
  const s = r.science;
  const fatigue = Math.max(0, s.buffer - .52) * .32 + Math.max(0, .24 - s.pcr) * .13 + Math.max(0, .18 - s.glycogen) * .24;
  const baseSpeed = race.event.distance / r.potential;
  const cadenceFactor = isPlayer ? THREE.MathUtils.clamp(.55 + effort * .48, .55, 1.09) : .96 + effort * .045;
  let target = baseSpeed * cadenceFactor * (1 - fatigue);
  if (boxed(r)) target = Math.min(target, r.speed * .995 + .12);
  r.speed = THREE.MathUtils.damp(r.speed, target, target > r.speed ? 3.6 : 1.9, dt);
  const prev = r.distance;
  r.distance += r.speed * dt;
  if (prev < 200 && r.distance >= 200) r.split200 = race.time;
  if (prev < race.event.distance / 2 && r.distance >= race.event.distance / 2) r.halfway = race.time;
  if (r.distance >= race.event.distance) {
    r.distance = race.event.distance;
    r.finishTime = race.time;
    if (r.player) onPlayerFinish();
  }
}

function updateLaneInput(dt) {
  if (!race?.player || race.event.laneRules === 'lanes') return;
  const canBreak = state.startFormat !== 'One-Turn Stagger' || race.player.distance > 105;
  if (!canBreak) return;
  laneDelta = 0;
  if (keys.has('KeyA')) laneDelta += 1;
  if (keys.has('KeyD')) laneDelta -= 1;
  race.player.laneFloat = THREE.MathUtils.clamp(race.player.laneFloat + laneDelta * 1.2 * dt, 1.04, 3.5);
}

function updateMeshes(t) {
  for (const r of race.runners) {
    const { p, ahead } = pathForRunner(r);
    r.mesh.position.copy(p);
    r.mesh.lookAt(ahead.x, p.y, ahead.z);
    animateAthlete(r.mesh, t, r.speed, r.science.buffer, r.phase, !race.started);
  }
}

function updateRaceHud() {
  const p = race.player;
  const place = getPlace(p);
  $('#race-clock').textContent = formatTime(race.time);
  $('#place-readout').textContent = `${place} / ${race.runners.length}`;
  $('#distance-readout').textContent = `${Math.floor(p.distance)} / ${race.event.distance}m`;
  $('#cadence-readout').textContent = tapRate().toFixed(1);
  $('#pcr-value').textContent = `${Math.round(p.science.pcr * 100)}%`; $('#pcr-bar').style.width = `${p.science.pcr * 100}%`;
  $('#glycogen-value').textContent = `${Math.round(p.science.glycogen * 100)}%`; $('#glycogen-bar').style.width = `${p.science.glycogen * 100}%`;
  $('#lactate-value').textContent = p.science.lactate.toFixed(1); $('#lactate-bar').style.width = `${Math.min(100, p.science.lactate / 14 * 100)}%`;
  $('#buffer-value').textContent = `${Math.round(p.science.buffer * 100)}%`; $('#buffer-bar').style.width = `${p.science.buffer * 100}%`;
}

function maybePacerPrompt() {
  if (!meetContext.pacer || meetContext.pacer.resolved || !race?.player || race.player.distance < meetContext.pacer.target) return;
  meetContext.pacer.resolved = true;
  race.started = false;
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
  }
  persist();
}

function finishRaceAsPacer() {
  audio.stopFootsteps();
  race.finished = true;
  race.player.pacerDNF = true;
  finishCinematic(0, { pacer: true });
}

function predictedResults() {
  for (const r of race.runners) {
    if (r.finishTime == null && !r.dropped) {
      r.finishTime = race.time + Math.max(0, race.event.distance - r.distance) / Math.max(r.speed, race.event.distance / r.potential * .88);
    }
  }
  return [...race.runners].sort((a, b) => (a.finishTime ?? 999999) - (b.finishTime ?? 999999));
}

async function onPlayerFinish() {
  if (race.finished) return;
  race.finished = true;
  race.started = false;
  audio.stopFootsteps();
  const ranked = predictedResults();
  const place = ranked.indexOf(race.player) + 1;
  const pb = state.personalBests[state.event];
  const pr = Number.isFinite(pb) && race.player.finishTime < pb;
  const bigPr = pr && pb - race.player.finishTime > pb * .015;
  const upset = place === 1 && meetContext.heatStrength > 1.04;
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
  await audio.crowdReaction(place || 4);
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
  const competitors = Array.from({ length: 7 }, () => field.event.baseMark * meetContext.heatStrength * (.87 + Math.random() * .18));
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

function updateRaceCamera(dt) {
  const p = race.player;
  const path = pathForRunner(p);
  const tangent = path.ahead.clone().sub(path.p).normalize();
  const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
  const desired = path.p.clone().addScaledVector(tangent, -10).addScaledVector(side, 2.5).add(new THREE.Vector3(0, 4, 0));
  camera.position.lerp(desired, 1 - Math.exp(-4.7 * dt));
  camera.lookAt(path.p.clone().addScaledVector(tangent, 7).add(new THREE.Vector3(0, 1.3, 0)));
}

function updateBroadcastCamera() {
  if (!race?.player) return;
  const p = pathForRunner(race.player).p;
  broadcastCamera.position.set(p.x + 24, 15, p.z + 30);
  broadcastCamera.lookAt(p.x, 1.3, p.z);
}

function renderBroadcast() {
  if (!world?.videoBoard?.screen) return;
  world.videoBoard.screen.visible = false;
  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, broadcastCamera);
  renderer.setRenderTarget(null);
  world.videoBoard.screen.visible = true;
}

function showSplit(text) {
  const el = $('#split-toast');
  el.textContent = text; el.classList.add('show');
  clearTimeout(splitToastTimer); splitToastTimer = setTimeout(() => el.classList.remove('show'), 1500);
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
    updateLaneInput(dt);
    if (surgeTimer > 0) surgeTimer -= dt;
    race.runners.forEach((r) => updateRunner(r, dt));
    maybePacerPrompt();
    updateCommentary();
  }
  updateMeshes(elapsed);
  updateRaceHud();
  updateRaceCamera(dt);
  updateBroadcastCamera();
  world.update(elapsed);
}

function handlePreRace(dt, elapsed) {
  introAngle += dt * .28;
  const radius = 128 + Math.sin(introAngle * .7) * 8;
  camera.position.set(Math.sin(introAngle) * radius, 48 + Math.sin(introAngle * .5) * 10, Math.cos(introAngle) * radius);
  camera.lookAt(0, 0, 0);
  world.update(elapsed);
  broadcastCamera.position.set(45, 22, 68); broadcastCamera.lookAt(0, 0, 0);
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
  broadcastCamera.position.set(58, 25, 60); broadcastCamera.lookAt(0, 0, 0);
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
  if (e.code === 'KeyQ') recordTap('q');
  if (e.code === 'KeyP') recordTap('p');
  if (e.code === 'Space') {
    if (mode === 'race' && race?.started) surgeTimer = 1.0;
    if (mode === 'field') attemptField();
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

function bindTapButton(id, key) { const el = $(id); if (el) el.addEventListener('pointerdown', (e) => { e.preventDefault(); recordTap(key); }); }
bindTapButton('#mobile-q', 'q'); bindTapButton('#mobile-p', 'p'); bindTapButton('#field-q', 'q'); bindTapButton('#field-p', 'p');
$('#mobile-out').addEventListener('pointerdown', () => { if (race?.player) race.player.laneFloat = Math.min(3.5, race.player.laneFloat + .18); });
$('#mobile-in').addEventListener('pointerdown', () => { if (race?.player) race.player.laneFloat = Math.max(1.04, race.player.laneFloat - .18); });
$('#mobile-surge').addEventListener('pointerdown', () => { if (race?.started) surgeTimer = 1.0; });
$('#field-action').addEventListener('click', attemptField); $('#field-mobile-action').addEventListener('pointerdown', attemptField);
$('#pace-drop').addEventListener('click', () => resolvePacer(true)); $('#pace-continue').addEventListener('click', () => resolvePacer(false));

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
  race = null; field = null; audio.stopFootsteps(); commentary.reset(); world.setCrowdReaction('idle');
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
