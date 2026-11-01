import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

window.__NCFA_PRESENTATION_V18_READY = true;

let speechPath = '';
let officialSpeaking = false;

window.addEventListener('ncfa:speechstart', (event) => {
  speechPath = event.detail?.path || '';
  officialSpeaking = speechPath.startsWith('officials/');
});
window.addEventListener('ncfa:speechend', (event) => {
  if (!event.detail?.path || event.detail.path === speechPath) {
    speechPath = '';
    officialSpeaking = false;
  }
});

const mat = (color, roughness = 0.76) => new THREE.MeshStandardMaterial({ color, roughness });

function limb(length, radius, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, length, 8), material);
  mesh.position.y = -length / 2;
  return mesh;
}

function createOfficial() {
  const g = new THREE.Group();
  g.name = 'NCFA Senior Starter';
  g.userData.isNCFAOfficial = true;

  const skin = mat(0xb77c58, 0.82);
  const shirt = mat(0xd8dde0, 0.7);
  const pants = mat(0x12161c, 0.9);
  const grey = mat(0xb9bcc0, 0.94);
  const darkGrey = mat(0x565b60, 0.96);

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.96, 0.34), pants);
  legs.position.y = 0.50;
  g.add(legs);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.94, 0.42), shirt);
  torso.position.y = 1.36;
  g.add(torso);

  const headRoot = new THREE.Group();
  headRoot.position.y = 2.08;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), skin);
  head.scale.set(0.95, 1.06, 0.95);
  headRoot.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.248, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.54), grey);
  hair.position.y = 0.06;
  hair.scale.y = 0.52;
  headRoot.add(hair);

  for (const side of [-1, 1]) {
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.17, 0.10), grey);
    temple.position.set(side * 0.205, 0.025, -0.03);
    headRoot.add(temple);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.02), darkGrey);
    brow.position.set(side * 0.075, 0.055, -0.22);
    brow.rotation.z = side * -0.12;
    headRoot.add(brow);
  }

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.018, 0.018), mat(0x56342d, 0.96));
  mouth.position.set(0, -0.075, -0.225);
  headRoot.add(mouth);
  g.add(headRoot);

  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.45, 1.65, 0);
  leftShoulder.add(limb(0.62, 0.075, skin));
  g.add(leftShoulder);
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.45, 1.65, 0);
  rightShoulder.add(limb(0.62, 0.075, skin));
  g.add(rightShoulder);

  const clipboard = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.50, 0.04), mat(0x3b3028, 0.92));
  clipboard.position.set(-0.52, 0.96, -0.12);
  clipboard.rotation.z = 0.10;
  g.add(clipboard);

  g.userData.rig = { torso, headRoot, mouth, leftShoulder, rightShoulder };
  g.visible = false;
  return g;
}

function isPrerace() {
  return Boolean(
    document.querySelector('#race-hud.screen--active') &&
    window.__NCFA_RACE_PHASE !== 'racing'
  );
}

function athletesIn(scene) {
  const out = [];
  scene.traverse((o) => {
    if (o.userData?.isNCFAAthlete && o.userData?.rig) out.push(o);
  });
  out.sort((a, b) => (a.userData.bibNumber || 0) - (b.userData.bibNumber || 0));
  return out;
}

function forwardOf(object) {
  return new THREE.Vector3(0, 0, -1).applyQuaternion(object.quaternion).normalize();
}
function sideOf(object) {
  const f = forwardOf(object);
  return new THREE.Vector3(-f.z, 0, f.x);
}
function centerOf(athletes) {
  return athletes.reduce((sum, a) => sum.add(a.position), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, athletes.length));
}

function moodFor(a) {
  if (!a.userData.preRaceMood) {
    const i = (a.userData.bibNumber || 1) % 3;
    a.userData.preRaceMood = i === 0 ? 'nervous' : i === 1 ? 'tense' : 'calm';
  }
  return a.userData.preRaceMood;
}

function animateMood(a, time) {
  const r = a.userData.rig;
  if (!r) return;
  const mood = moodFor(a);
  const seed = (a.userData.bibNumber || 1) * 0.71;
  const breath = Math.sin(time * 1.7 + seed);
  const la = r.leftArm?.shoulder;
  const ra = r.rightArm?.shoulder;
  const ll = r.leftLeg?.hip;
  const rl = r.rightLeg?.hip;

  if (mood === 'nervous') {
    r.torso?.rotation.set(0.04 + breath * 0.02, 0, Math.sin(time * 3 + seed) * 0.025);
    if (r.headRoot) r.headRoot.rotation.y = Math.sin(time * 2.5 + seed) * 0.15;
    if (la) la.rotation.x = -0.18 + Math.sin(time * 5 + seed) * 0.10;
    if (ra) ra.rotation.x = 0.18 - Math.sin(time * 5 + seed) * 0.10;
    if (ll) ll.rotation.x = Math.sin(time * 3.2 + seed) * 0.08;
    if (rl) rl.rotation.x = -Math.sin(time * 3.2 + seed) * 0.08;
  } else if (mood === 'tense') {
    r.torso?.rotation.set(0.09, 0, 0);
    r.headRoot?.rotation.set(-0.05, Math.sin(time * 0.8 + seed) * 0.03, 0);
    if (la) la.rotation.x = -0.28;
    if (ra) ra.rotation.x = 0.28;
    if (ll) ll.rotation.x = -0.06;
    if (rl) rl.rotation.x = 0.06;
  } else {
    r.torso?.rotation.set(0.03 + breath * 0.007, 0, 0);
    r.headRoot?.rotation.set(-0.015, 0, 0);
    if (la) la.rotation.x = -0.09;
    if (ra) ra.rotation.x = 0.09;
    if (ll) ll.rotation.x = 0;
    if (rl) rl.rotation.x = 0;
  }
}

function placeOfficial(official, athletes) {
  if (!athletes.length) return;
  const center = centerOf(athletes);
  const f = forwardOf(athletes[0]);
  const side = sideOf(athletes[0]);
  official.position.copy(center.clone().addScaledVector(f, -4.6).addScaledVector(side, 6.2));
  official.position.y = 0.08;
  official.lookAt(center.x, 1.2, center.z);
}

function animateOfficial(official, time) {
  const r = official.userData.rig;
  if (!r) return;
  const talking = officialSpeaking || /OFFICIAL|ON YOUR MARKS|SET/.test(document.querySelector('#starter-command')?.textContent || '');
  r.torso.rotation.y = talking ? Math.sin(time * 1.2) * 0.018 : 0;
  r.headRoot.rotation.y = talking ? Math.sin(time * 2.0) * 0.04 : 0;
  r.headRoot.rotation.x = talking ? -0.025 + Math.sin(time * 3.0) * 0.014 : -0.015;
  r.rightShoulder.rotation.x = talking ? -0.70 + Math.sin(time * 5.2) * 0.12 : -0.10;
  r.rightShoulder.rotation.z = talking ? -0.22 : -0.03;
  r.leftShoulder.rotation.x = talking ? 0.08 : 0.03;
  r.mouth.scale.y = talking ? 0.70 + Math.abs(Math.sin(time * 10.0)) * 1.25 : 0.62;
}

function captureBases(state, athletes) {
  if (state.basesCaptured) return;
  athletes.forEach((a) => { a.userData.ncfaStartMark = a.position.clone(); });
  state.basesCaptured = true;
}

function positionRunners(state, athletes) {
  captureBases(state, athletes);
  const command = (document.querySelector('#starter-command')?.textContent || '').trim().toUpperCase();
  if (command === 'ON YOUR MARKS' && !state.onMarksAt) state.onMarksAt = performance.now();
  if (command !== 'ON YOUR MARKS' && !['ready', 'hold'].includes(window.__NCFA_RACE_PHASE || '')) state.onMarksAt = 0;

  let progress = 0;
  if (state.onMarksAt) {
    const raw = (performance.now() - state.onMarksAt) / 1500;
    const t = Math.max(0, Math.min(1, raw));
    progress = t * t * (3 - 2 * t);
  }
  if (['ready', 'hold'].includes(window.__NCFA_RACE_PHASE || '')) progress = 1;

  athletes.forEach((a) => {
    const mark = a.userData.ncfaStartMark;
    if (!mark) return;
    const wait = mark.clone().addScaledVector(forwardOf(a), -2.7);
    a.position.copy(wait.lerp(mark, progress));
  });
}

function setCamera(camera, pos, target, fov = 40) {
  camera.position.copy(pos);
  camera.lookAt(target);
  camera.fov = fov;
  camera.updateProjectionMatrix();
}

function stadiumWide(camera, time) {
  setCamera(camera, new THREE.Vector3(16 + Math.sin(time * 0.25) * 8, 13.5, 96), new THREE.Vector3(0, 1.8, 0), 45);
}
function curveSweep(camera, time) {
  setCamera(camera, new THREE.Vector3(59, 4.7, -37 + Math.sin(time * 0.35) * 7), new THREE.Vector3(18, 1.2, 2), 40);
}
function crowdSweep(camera, time) {
  setCamera(camera, new THREE.Vector3(-42 + Math.sin(time * 0.35) * 10, 4.2, 47), new THREE.Vector3(-16 + Math.sin(time * 0.28) * 12, 3.6, 61), 31);
}
function boardShot(camera) {
  setCamera(camera, new THREE.Vector3(20, 14.5, 53), new THREE.Vector3(42, 17.5, 80), 30);
}
function lineupWide(camera, athletes, time) {
  const center = centerOf(athletes);
  const f = forwardOf(athletes[0]);
  const side = sideOf(athletes[0]);
  setCamera(camera, center.clone().addScaledVector(f, -6.2).addScaledVector(side, 4.7 + Math.sin(time * 0.6) * 0.5).add(new THREE.Vector3(0, 1.75, 0)), center.clone().add(new THREE.Vector3(0, 1.25, 0)), 38);
}
function lineupSide(camera, athletes) {
  const center = centerOf(athletes);
  const f = forwardOf(athletes[0]);
  const side = sideOf(athletes[0]);
  setCamera(camera, center.clone().addScaledVector(side, 7.2).addScaledVector(f, -1.0).add(new THREE.Vector3(0, 1.45, 0)), center.clone().add(new THREE.Vector3(0, 1.18, 0)), 34);
}
function closeRunner(camera, athlete, slot) {
  const f = forwardOf(athlete);
  const side = sideOf(athlete);
  const sign = slot % 2 ? 1 : -1;
  setCamera(camera, athlete.position.clone().addScaledVector(f, -2.05).addScaledVector(side, sign * 0.82).add(new THREE.Vector3(0, 1.62, 0)), athlete.position.clone().add(new THREE.Vector3(0, 1.50, 0)), 27);
}
function behindStart(camera, athletes) {
  const center = centerOf(athletes);
  const f = forwardOf(athletes[0]);
  setCamera(camera, center.clone().addScaledVector(f, -7.5).add(new THREE.Vector3(0, 1.9, 0)), center.clone().addScaledVector(f, 7.0).add(new THREE.Vector3(0, 1.1, 0)), 41);
}
function officialShot(camera, official) {
  const f = forwardOf(official);
  const side = sideOf(official);
  setCamera(camera, official.position.clone().addScaledVector(f, -2.45).addScaledVector(side, 0.70).add(new THREE.Vector3(0, 1.68, 0)), official.position.clone().add(new THREE.Vector3(0, 1.42, 0)), 29);
}

function directCamera(camera, athletes, official, state, seconds) {
  if (!athletes.length) return;
  const command = (document.querySelector('#starter-command')?.textContent || '').trim().toUpperCase();
  const phase = window.__NCFA_RACE_PHASE || 'presentation';

  if (command === 'ON YOUR MARKS') {
    const age = state.onMarksAt ? (performance.now() - state.onMarksAt) / 1000 : 0;
    if (age < 0.55) officialShot(camera, official);
    else if (age < 1.15) lineupSide(camera, athletes);
    else behindStart(camera, athletes);
    return;
  }

  if (command === 'OFFICIAL INSTRUCTIONS' || command === 'SET' || officialSpeaking) {
    if (Math.floor(seconds / 2.1) % 4 === 3) lineupWide(camera, athletes, seconds);
    else officialShot(camera, official);
    return;
  }

  if (phase === 'ready') {
    lineupSide(camera, athletes);
    return;
  }
  if (phase === 'hold') {
    behindStart(camera, athletes);
    return;
  }

  // Guaranteed broadcast package during PA/commentary. This does not depend on
  // metadata or speech events, so even a slow audio file cannot leave a dead shot.
  const t = seconds % 14.2;
  if (t < 2.4) stadiumWide(camera, seconds);
  else if (t < 4.3) crowdSweep(camera, seconds);
  else if (t < 5.7) boardShot(camera);
  else if (t < 7.2) curveSweep(camera, seconds);
  else if (t < 9.1) lineupWide(camera, athletes, seconds);
  else if (t < 10.5) closeRunner(camera, athletes[0], 1);
  else if (t < 11.9) closeRunner(camera, athletes[Math.min(2, athletes.length - 1)], 2);
  else if (t < 13.2) closeRunner(camera, athletes[Math.min(5, athletes.length - 1)], 3);
  else lineupSide(camera, athletes);
}

function enhanceBoard(scene) {
  if (scene.userData.ncfaBoardV18) return;
  let screen = null;
  let clock = null;
  scene.traverse((o) => {
    const p = o.geometry?.parameters;
    if (!o.isMesh || !p) return;
    if (Math.abs((p.width || 0) - 27) < 0.35 && Math.abs((p.height || 0) - 11.2) < 0.35) screen = o;
    if (Math.abs((p.width || 0) - 23.5) < 0.35 && Math.abs((p.height || 0) - 2.6) < 0.35) clock = o;
  });
  if (screen) {
    screen.scale.set(1.16, 1.13, 1);
    screen.renderOrder = 8;
    if (screen.material) {
      screen.material.toneMapped = false;
      screen.material.needsUpdate = true;
    }
  }
  if (clock) {
    clock.scale.set(1.2, 1.2, 1);
    clock.renderOrder = 9;
  }
  if (screen || clock) scene.userData.ncfaBoardV18 = true;
}

const previousRender = THREE.WebGLRenderer.prototype.render;
const states = new WeakMap();

if (!THREE.WebGLRenderer.prototype.__ncfaPresentationV18) {
  Object.defineProperty(THREE.WebGLRenderer.prototype, '__ncfaPresentationV18', { value: true });
  THREE.WebGLRenderer.prototype.render = function ncfaPresentationV18(scene, camera) {
    const mainPass = this.getRenderTarget() === null;
    if (mainPass && scene?.isScene && camera?.isPerspectiveCamera) {
      enhanceBoard(scene);
      let state = states.get(scene);
      if (!state) {
        const official = createOfficial();
        scene.add(official);
        state = { official, wasPrerace: false, introStart: performance.now(), basesCaptured: false, onMarksAt: 0 };
        states.set(scene, state);
      }

      const prerace = isPrerace();
      if (prerace) {
        if (!state.wasPrerace) {
          state.introStart = performance.now();
          state.basesCaptured = false;
          state.onMarksAt = 0;
        }
        const athletes = athletesIn(scene);
        positionRunners(state, athletes);
        const now = performance.now() / 1000;
        athletes.forEach((a) => animateMood(a, now));
        placeOfficial(state.official, athletes);
        state.official.visible = true;
        animateOfficial(state.official, now);
        directCamera(camera, athletes, state.official, state, (performance.now() - state.introStart) / 1000);
      } else {
        if (state.wasPrerace) {
          athletesIn(scene).forEach((a) => delete a.userData.ncfaStartMark);
          state.basesCaptured = false;
          state.onMarksAt = 0;
        }
        state.official.visible = false;
      }
      state.wasPrerace = prerace;
    }
    return previousRender.call(this, scene, camera);
  };
}
