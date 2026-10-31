import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const canvas = document.querySelector('#game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1018);
scene.fog = new THREE.FogExp2(0x0b1018, 0.0027);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 62, 108);

const hemi = new THREE.HemisphereLight(0xcbdcff, 0x314423, 1.85);
scene.add(hemi);
const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
keyLight.position.set(-55, 85, -35);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -130;
keyLight.shadow.camera.right = 130;
keyLight.shadow.camera.top = 100;
keyLight.shadow.camera.bottom = -100;
scene.add(keyLight);

const world = new THREE.Group();
scene.add(world);

const STRAIGHT = 84.39;
const BASE_RADIUS = 36.80;
const LAP = 2 * STRAIGHT + 2 * Math.PI * BASE_RADIUS;
const LANE_WIDTH = 1.22;
const INNER_RADIUS = BASE_RADIUS - 1.7;
const OUTER_RADIUS = INNER_RADIUS + LANE_WIDTH * 8.6;
const TRACK_Y = 0.08;

function stadiumPoint(metres, radius = BASE_RADIUS) {
  let d = ((metres % LAP) + LAP) % LAP;
  const curve = Math.PI * BASE_RADIUS;
  if (d < STRAIGHT) {
    return new THREE.Vector3(-STRAIGHT / 2 + d, TRACK_Y, -radius);
  }
  d -= STRAIGHT;
  if (d < curve) {
    const a = -Math.PI / 2 + d / BASE_RADIUS;
    return new THREE.Vector3(STRAIGHT / 2 + Math.cos(a) * radius, TRACK_Y, Math.sin(a) * radius);
  }
  d -= curve;
  if (d < STRAIGHT) {
    return new THREE.Vector3(STRAIGHT / 2 - d, TRACK_Y, radius);
  }
  d -= STRAIGHT;
  const a = Math.PI / 2 + d / BASE_RADIUS;
  return new THREE.Vector3(-STRAIGHT / 2 + Math.cos(a) * radius, TRACK_Y, Math.sin(a) * radius);
}

function trackRibbon(inner, outer, color) {
  const segments = 320;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const d = (i / segments) * LAP;
    const a = stadiumPoint(d, inner);
    const b = stadiumPoint(d, outer);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    if (i < segments) {
      const n = i * 2;
      indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.79, metalness: 0.01 }));
  mesh.receiveShadow = true;
  return mesh;
}

world.add(trackRibbon(INNER_RADIUS, OUTER_RADIUS, 0x9e2e30));

const grass = new THREE.Mesh(
  new THREE.PlaneGeometry(360, 250),
  new THREE.MeshStandardMaterial({ color: 0x315d34, roughness: 1 })
);
grass.rotation.x = -Math.PI / 2;
grass.position.y = -0.03;
grass.receiveShadow = true;
world.add(grass);

for (let lane = 0; lane <= 8; lane++) {
  const r = INNER_RADIUS + lane * LANE_WIDTH;
  const pts = [];
  for (let i = 0; i < 320; i++) pts.push(stadiumPoint((i / 320) * LAP, r));
  const line = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0xf0e8df, transparent: true, opacity: 0.72 })
  );
  line.position.y = 0.025;
  world.add(line);
}

function createFinishLine() {
  const finish = stadiumPoint(0, INNER_RADIUS + LANE_WIDTH * 4.3);
  const geom = new THREE.PlaneGeometry(OUTER_RADIUS - INNER_RADIUS, 0.8);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geom, mat);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = Math.PI / 2;
  m.position.set(finish.x, TRACK_Y + 0.035, finish.z);
  return m;
}
world.add(createFinishLine());

function addStadium() {
  const standMat = new THREE.MeshStandardMaterial({ color: 0x343b46, roughness: 0.85 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x202730, roughness: 0.9 });
  const sides = [-1, 1];
  sides.forEach((side) => {
    for (let row = 0; row < 6; row++) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(118, 2.2, 5.2), row % 2 ? seatMat : standMat);
      stand.position.set(0, 1.2 + row * 2.3, side * (59 + row * 4.2));
      stand.castShadow = true;
      stand.receiveShadow = true;
      world.add(stand);
    }
  });

  const towerMat = new THREE.MeshStandardMaterial({ color: 0x171c23 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 1.2), towerMat);
  board.position.set(68, 11, 0);
  board.castShadow = true;
  world.add(board);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(19, 7.4), new THREE.MeshBasicMaterial({ color: 0x192b35 }));
  screen.position.set(67.35, 11, 0);
  screen.rotation.y = -Math.PI / 2;
  world.add(screen);

  for (let i = 0; i < 36; i++) {
    const x = -55 + (i % 12) * 10;
    const z = i < 18 ? -83 - Math.floor(i / 12) * 3 : 83 + Math.floor((i - 18) / 12) * 3;
    const person = new THREE.Mesh(new THREE.SphereGeometry(0.38, 6, 5), new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? 0xf1c40f : i % 3 === 1 ? 0xd8dbe0 : 0x596474 }));
    person.position.set(x, 14 + (i % 5) * 0.4, z);
    world.add(person);
  }
}
addStadium();

function createRunner(color, shorts = 0x15171a) {
  const group = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a583b, roughness: 0.7 });
  const kit = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const shortMat = new THREE.MeshStandardMaterial({ color: shorts, roughness: 0.8 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.29, 0.65, 4, 8), kit);
  torso.position.y = 1.45;
  torso.scale.set(1.05, 1, 0.72);
  torso.castShadow = true;
  group.add(torso);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.32), shortMat);
  hips.position.y = 0.9;
  hips.castShadow = true;
  group.add(hips);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin);
  head.position.y = 2.15;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.245, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.52), new THREE.MeshStandardMaterial({ color: 0x17120f }));
  hair.position.y = 2.22;
  group.add(hair);

  const limbs = [];
  for (let i = 0; i < 4; i++) {
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, i < 2 ? 0.63 : 0.55, 3, 6), skin);
    limb.castShadow = true;
    if (i < 2) limb.position.set(i === 0 ? -0.19 : 0.19, 0.47, 0);
    else limb.position.set(i === 2 ? -0.38 : 0.38, 1.48, 0);
    group.add(limb);
    limbs.push(limb);
  }
  group.userData.limbs = limbs;
  group.scale.setScalar(1.05);
  return group;
}

const runnerSeed = [
  { name: 'Jordan Carter', school: 'Hawthorne', color: 0xf1c40f, rating: 78, player: true },
  { name: 'Malik Reed', school: 'Metro State', color: 0x55a7ff, rating: 83 },
  { name: 'Evan Brooks', school: 'Central Plains', color: 0xdd5147, rating: 80 },
  { name: 'Andre Lewis', school: 'Lakeview', color: 0x5ac97b, rating: 77 },
  { name: 'Noah Grant', school: 'Cascadia Tech', color: 0xb06fff, rating: 82 },
  { name: 'Darius King', school: 'Atlantic A&M', color: 0xff7d33, rating: 79 },
  { name: 'Miles Bennett', school: 'North Valley', color: 0xe8edf3, rating: 76 },
  { name: 'Caleb Stone', school: 'Redwood State', color: 0x37c7c9, rating: 81 }
];

const runners = runnerSeed.map((seed, i) => {
  const mesh = createRunner(seed.color);
  mesh.visible = false;
  world.add(mesh);
  return {
    ...seed,
    mesh,
    lane: i + 1,
    laneFloat: i + 1,
    distance: 0,
    speed: 0,
    stamina: 1,
    effort: 0.68,
    finishTime: null,
    split400: null,
    phase: Math.random() * Math.PI * 2,
    talent: 0.96 + (seed.rating - 75) * 0.006 + (Math.random() - 0.5) * 0.012,
    kick: 0.96 + Math.random() * 0.09
  };
});
const player = runners[0];

const screens = [...document.querySelectorAll('.screen')];
function showScreen(id) {
  screens.forEach((screen) => screen.classList.toggle('screen--active', screen.id === id));
}

const ui = {
  raceClock: document.querySelector('#race-clock'),
  place: document.querySelector('#place-readout'),
  distance: document.querySelector('#distance-readout'),
  effortFill: document.querySelector('#effort-fill'),
  effortMarker: document.querySelector('#effort-marker'),
  split: document.querySelector('#split-toast'),
  results: document.querySelector('#results-list'),
  hubGroup: document.querySelector('#hub-event-group'),
  overall: document.querySelector('#overall-rating')
};

let appMode = 'menu';
let selectedCareer = 'Distance';
let raceActive = false;
let raceStarted = false;
let raceFinished = false;
let raceTime = 0;
let finishDelay = 0;
let playerEffort = 0.68;
let surgeTimer = 0;
let splitTimer = null;
const keys = new Set();

function setRunnerVisible(value) { runners.forEach((r) => { r.mesh.visible = value; }); }

function resetRace() {
  raceActive = true;
  raceStarted = false;
  raceFinished = false;
  raceTime = 0;
  finishDelay = 0;
  playerEffort = 0.68;
  surgeTimer = 0;
  runners.forEach((r, i) => {
    r.lane = i + 1;
    r.laneFloat = i + 1;
    r.distance = 0;
    r.speed = 0;
    r.stamina = 1;
    r.effort = 0.68;
    r.finishTime = null;
    r.split400 = null;
  });
  setRunnerVisible(true);
  showScreen('race-hud');
  appMode = 'race';
  showSplit('ON YOUR MARKS', 900);
  setTimeout(() => showSplit('SET', 700), 1100);
  setTimeout(() => {
    showSplit('GO!', 600);
    raceStarted = true;
  }, 2050);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '--:--.--';
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

function showSplit(text, duration = 1200) {
  ui.split.textContent = text;
  ui.split.classList.add('show');
  clearTimeout(splitTimer);
  splitTimer = setTimeout(() => ui.split.classList.remove('show'), duration);
}

function getRacePlace(target) {
  const ranked = [...runners].sort((a, b) => {
    if (a.finishTime !== null && b.finishTime !== null) return a.finishTime - b.finishTime;
    if (a.finishTime !== null) return -1;
    if (b.finishTime !== null) return 1;
    return b.distance - a.distance;
  });
  return ranked.indexOf(target) + 1;
}

function aiEffort(r) {
  const d = r.distance;
  let effort = 0.67;
  if (d < 120) effort = 0.73;
  else if (d < 500) effort = 0.665;
  else if (d < 650) effort = 0.71;
  else effort = 0.84 + (r.kick - 1) * 0.8;
  const raceNoise = Math.sin(r.distance * 0.041 + r.phase) * 0.015;
  return THREE.MathUtils.clamp(effort + raceNoise, 0.58, 0.96);
}

function draftingBenefit(r) {
  if (r.distance < 110) return 0;
  for (const other of runners) {
    if (other === r || other.finishTime !== null) continue;
    const gap = other.distance - r.distance;
    if (gap > 0.7 && gap < 5.2 && Math.abs(other.laneFloat - r.laneFloat) < 0.7) return 0.16;
  }
  return 0;
}

function updateRunner(r, dt) {
  if (!raceStarted || r.finishTime !== null) return;

  let effort = r.player ? playerEffort + (surgeTimer > 0 ? 0.11 : 0) : aiEffort(r);
  effort = THREE.MathUtils.clamp(effort, 0.42, 1);
  r.effort = effort;

  if (!r.player && r.distance > 105) {
    const leaders = [...runners].filter((x) => x !== r && x.finishTime === null).sort((a, b) => b.distance - a.distance);
    const nearby = leaders.find((x) => x.distance > r.distance && x.distance - r.distance < 9);
    const targetLane = nearby ? Math.max(1, Math.min(2.3, nearby.laneFloat + (Math.random() - 0.5) * 0.18)) : 1.15 + (r.lane % 3) * 0.18;
    r.laneFloat = THREE.MathUtils.damp(r.laneFloat, targetLane, 1.6, dt);
  }

  const draft = draftingBenefit(r);
  const highEffort = Math.max(0, effort - 0.55);
  const fatigueDrain = (0.00088 + highEffort * highEffort * 0.0065) * (1 - draft) * dt * 60;
  const lateStress = r.distance > 560 ? 1.12 : 1;
  r.stamina = Math.max(0, r.stamina - fatigueDrain * lateStress);

  const fatiguePenalty = r.stamina < 0.45 ? (0.45 - r.stamina) * 1.9 : 0;
  const targetSpeed = (4.58 + effort * 4.03) * r.talent * (1 - fatiguePenalty * 0.24);
  const accel = targetSpeed > r.speed ? 2.7 : 1.65;
  r.speed = THREE.MathUtils.damp(r.speed, targetSpeed, accel, dt);

  // Prevent impossible overlap in the same rail position without turning it into bumper cars.
  if (r.distance > 110) {
    for (const other of runners) {
      if (other === r || other.finishTime !== null) continue;
      const gap = other.distance - r.distance;
      if (gap > 0 && gap < 0.72 && Math.abs(other.laneFloat - r.laneFloat) < 0.28) r.speed = Math.min(r.speed, other.speed * 0.995);
    }
  }

  const previous = r.distance;
  r.distance += r.speed * dt;

  if (previous < 400 && r.distance >= 400) {
    r.split400 = raceTime;
    if (r.player) showSplit(`400m • ${formatTime(raceTime)}`, 1700);
  }

  if (r.distance >= 800) {
    r.distance = 800;
    r.finishTime = raceTime;
  }
}

function updatePlayerInput(dt) {
  if (!raceStarted || player.finishTime !== null) return;
  if (keys.has('KeyW') || keys.has('ArrowUp')) playerEffort += 0.24 * dt;
  if (keys.has('KeyS') || keys.has('ArrowDown')) playerEffort -= 0.24 * dt;
  playerEffort = THREE.MathUtils.clamp(playerEffort, 0.48, 0.97);

  if (player.distance > 100) {
    if (keys.has('KeyA')) player.laneFloat += 1.15 * dt;
    if (keys.has('KeyD')) player.laneFloat -= 1.15 * dt;
    player.laneFloat = THREE.MathUtils.clamp(player.laneFloat, 1.08, 3.4);
  } else {
    player.laneFloat = 1;
  }

  if (surgeTimer > 0) surgeTimer -= dt;
}

function updateRunnerMeshes(time) {
  runners.forEach((r) => {
    if (!r.mesh.visible) return;
    let laneFloat = r.laneFloat;
    if (r.distance < 100) laneFloat = r.lane;
    else if (r.distance < 145) {
      const t = (r.distance - 100) / 45;
      laneFloat = THREE.MathUtils.lerp(r.lane, r.laneFloat, t);
    }
    const radius = INNER_RADIUS + (laneFloat - 0.5) * LANE_WIDTH;
    const p = stadiumPoint(r.distance % LAP, radius);
    const ahead = stadiumPoint((r.distance + 0.5) % LAP, radius);
    r.mesh.position.copy(p);
    r.mesh.lookAt(ahead.x, p.y, ahead.z);

    const cadence = 6.4 + r.speed * 0.72;
    const swing = Math.sin(time * cadence + r.phase) * Math.min(0.9, r.speed / 8);
    const [leftLeg, rightLeg, leftArm, rightArm] = r.mesh.userData.limbs;
    leftLeg.rotation.x = swing * 0.72;
    rightLeg.rotation.x = -swing * 0.72;
    leftArm.rotation.x = -swing * 0.72;
    rightArm.rotation.x = swing * 0.72;
    leftArm.rotation.z = -0.08;
    rightArm.rotation.z = 0.08;
    r.mesh.position.y += Math.abs(Math.sin(time * cadence * 2 + r.phase)) * 0.035;
  });
}

function updateRaceCamera(dt) {
  const radius = INNER_RADIUS + (Math.max(1, player.laneFloat) - 0.5) * LANE_WIDTH;
  const p = stadiumPoint(player.distance % LAP, radius);
  const ahead = stadiumPoint((player.distance + 2) % LAP, radius);
  const tangent = ahead.clone().sub(p).normalize();
  const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
  const desired = p.clone().addScaledVector(tangent, -10.8).addScaledVector(side, 2.3).add(new THREE.Vector3(0, 4.2, 0));
  camera.position.lerp(desired, 1 - Math.exp(-4.5 * dt));
  const target = p.clone().addScaledVector(tangent, 7).add(new THREE.Vector3(0, 1.35, 0));
  camera.lookAt(target);
  camera.fov = THREE.MathUtils.damp(camera.fov, surgeTimer > 0 ? 61 : 55, 5, dt);
  camera.updateProjectionMatrix();
}

function updateHud() {
  ui.raceClock.textContent = formatTime(raceTime);
  ui.place.textContent = `${getRacePlace(player)} / 8`;
  ui.distance.textContent = `${Math.floor(player.distance)} / 800m`;
  const pct = playerEffort * 100;
  ui.effortFill.style.width = `${pct}%`;
  ui.effortMarker.style.left = `${pct}%`;
}

function renderResults() {
  const ranked = [...runners].sort((a, b) => (a.finishTime ?? 999) - (b.finishTime ?? 999));
  ui.results.innerHTML = ranked.map((r, i) => {
    const pr = r.player && r.finishTime < 111.92;
    const sb = r.player && !pr && r.finishTime < 112.84;
    return `<div class="result-row ${r.player ? 'player' : ''}">
      <div class="result-place">${i + 1}</div>
      <div class="result-name"><strong>${r.name}</strong><span>${r.school}</span></div>
      <div class="result-time">${formatTime(r.finishTime)}</div>
      <div class="result-badge">${pr ? 'PR' : sb ? 'SB' : ''}</div>
    </div>`;
  }).join('');
}

function finishRaceIfReady(dt) {
  if (!player.finishTime || raceFinished) return;
  finishDelay += dt;
  const everyoneDone = runners.every((r) => r.finishTime !== null);
  if (everyoneDone || finishDelay > 7) {
    runners.forEach((r) => { if (r.finishTime === null) r.finishTime = raceTime + (800 - r.distance) / Math.max(5.8, r.speed); });
    raceFinished = true;
    raceActive = false;
    raceStarted = false;
    renderResults();
    setTimeout(() => {
      showScreen('results-screen');
      appMode = 'results';
    }, 700);
  }
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'Space' && appMode === 'race' && raceStarted && surgeTimer <= 0.15 && player.stamina > 0.08) surgeTimer = 1.1;
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

function setCareer(name, events) {
  selectedCareer = name;
  ui.hubGroup.textContent = `${name.toUpperCase()} • ${events}`;
  ui.overall.textContent = name === 'Distance' ? '78' : name === 'Sprints' ? '79' : name === 'Jumps' ? '77' : name === 'Throws' ? '80' : '76';
  showScreen('career-hub');
  appMode = 'hub';
}

document.querySelector('#enter-game').addEventListener('click', () => {
  showScreen('main-menu');
  appMode = 'menu';
});

document.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.mode;
    if (mode === 'career') {
      showScreen('career-select');
      appMode = 'career-select';
    } else if (mode === 'quick' || mode === 'championship') {
      resetRace();
    } else {
      setCareer('Distance', '800m / 1500m');
      showSplit('DYNASTY PROTOTYPE • PROGRAM HUB', 1800);
    }
  });
});

document.querySelectorAll('.career-card').forEach((button) => {
  button.addEventListener('click', () => setCareer(button.dataset.career, button.dataset.events));
});

document.querySelectorAll('[data-back="menu"]').forEach((button) => button.addEventListener('click', () => {
  showScreen('main-menu');
  appMode = 'menu';
}));

document.querySelector('#race-now').addEventListener('click', resetRace);
document.querySelector('#race-again').addEventListener('click', resetRace);
document.querySelector('#return-hub').addEventListener('click', () => {
  setRunnerVisible(false);
  showScreen('career-hub');
  appMode = 'hub';
});

const clock = new THREE.Clock();
let attractAngle = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  if (appMode === 'race') {
    updatePlayerInput(dt);
    if (raceStarted) raceTime += dt;
    runners.forEach((r) => updateRunner(r, dt));
    updateRunnerMeshes(elapsed);
    updateRaceCamera(dt);
    updateHud();
    finishRaceIfReady(dt);
  } else {
    attractAngle += dt * 0.08;
    const radius = 118;
    const desired = new THREE.Vector3(Math.sin(attractAngle) * radius, 54 + Math.sin(attractAngle * 0.7) * 6, Math.cos(attractAngle) * radius);
    camera.position.lerp(desired, 1 - Math.exp(-1.1 * dt));
    camera.lookAt(0, 0, 0);
    camera.fov = THREE.MathUtils.damp(camera.fov, 55, 4, dt);
    camera.updateProjectionMatrix();
  }

  renderer.render(scene, camera);
}

setRunnerVisible(false);
animate();
