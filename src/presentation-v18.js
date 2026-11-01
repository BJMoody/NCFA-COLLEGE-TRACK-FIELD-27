import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

window.__NCFA_PRESENTATION_V18_READY = true;

let mainCamera = null;
let official = null;
let introStart = 0;
let onMarksAt = 0;
let wasPrerace = false;
let speechPath = '';
let officialSpeaking = false;
const athletes = new Set();

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

function isPrerace() {
  return Boolean(document.querySelector('#race-hud.screen--active') && window.__NCFA_RACE_PHASE !== 'racing');
}

function starterCommand() {
  return (document.querySelector('#starter-command')?.textContent || '').trim().toUpperCase();
}

function activeAthletes() {
  return [...athletes]
    .filter((a) => a?.parent && a.visible !== false)
    .sort((a, b) => (a.userData?.bibNumber || 0) - (b.userData?.bibNumber || 0));
}

function makeMaterial(color, roughness = 0.78) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function createOfficial() {
  const g = new THREE.Group();
  g.name = 'NCFA Senior Starter';
  g.userData.isNCFAOfficial = true;
  const skin = makeMaterial(0xb77c58, 0.82);
  const shirt = makeMaterial(0xd8dde0, 0.7);
  const pants = makeMaterial(0x12161c, 0.9);
  const grey = makeMaterial(0xb9bcc0, 0.94);
  const dark = makeMaterial(0x565b60, 0.96);

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
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.02), dark);
    brow.position.set(side * 0.075, 0.055, -0.22);
    brow.rotation.z = side * -0.12;
    headRoot.add(brow);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.018, 0.018), makeMaterial(0x56342d, 0.96));
  mouth.position.set(0, -0.075, -0.225);
  headRoot.add(mouth);
  g.add(headRoot);

  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.45, 1.65, 0);
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.068, 0.62, 8), skin);
  leftArm.position.y = -0.31;
  leftShoulder.add(leftArm);
  g.add(leftShoulder);

  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.45, 1.65, 0);
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.068, 0.62, 8), skin);
  rightArm.position.y = -0.31;
  rightShoulder.add(rightArm);
  g.add(rightShoulder);

  const clipboard = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.50, 0.04), makeMaterial(0x3b3028, 0.92));
  clipboard.position.set(-0.52, 0.96, -0.12);
  clipboard.rotation.z = 0.10;
  g.add(clipboard);
  g.userData.rig = { torso, headRoot, mouth, leftShoulder, rightShoulder };
  g.visible = false;
  return g;
}

function moodFor(a) {
  if (!a.userData.preRaceMood) {
    const i = (a.userData.bibNumber || 1) % 3;
    a.userData.preRaceMood = i === 0 ? 'nervous' : i === 1 ? 'tense' : 'calm';
  }
  return a.userData.preRaceMood;
}

function animateMood(a, t) {
  const r = a.userData.rig;
  if (!r) return;
  const mood = moodFor(a);
  const seed = (a.userData.bibNumber || 1) * 0.71;
  if (mood === 'nervous') {
    if (r.headRoot) r.headRoot.rotation.y = Math.sin(t * 2.5 + seed) * 0.15;
    if (r.torso) r.torso.rotation.z = Math.sin(t * 3 + seed) * 0.025;
  } else if (mood === 'tense') {
    if (r.headRoot) r.headRoot.rotation.x = -0.05;
    if (r.torso) r.torso.rotation.x = 0.09;
  } else {
    if (r.headRoot) r.headRoot.rotation.set(-0.015, 0, 0);
    if (r.torso) r.torso.rotation.x = 0.03 + Math.sin(t * 1.7 + seed) * 0.007;
  }
}

function animateOfficial(t) {
  if (!official?.userData?.rig) return;
  const r = official.userData.rig;
  const talking = officialSpeaking || /OFFICIAL|ON YOUR MARKS|SET/.test(starterCommand());
  r.headRoot.rotation.y = talking ? Math.sin(t * 2.0) * 0.04 : 0;
  r.headRoot.rotation.x = talking ? -0.025 + Math.sin(t * 3.0) * 0.014 : -0.015;
  r.rightShoulder.rotation.x = talking ? -0.70 + Math.sin(t * 5.2) * 0.12 : -0.10;
  r.rightShoulder.rotation.z = talking ? -0.22 : -0.03;
  r.leftShoulder.rotation.x = talking ? 0.08 : 0.03;
  r.mouth.scale.y = talking ? 0.70 + Math.abs(Math.sin(t * 10.0)) * 1.25 : 0.62;
}

function centerOf(list) {
  return list.reduce((s, a) => s.add(a.position), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, list.length));
}

function directionFromLookAt(object, x, y, z) {
  const target = x?.isVector3 ? x.clone() : new THREE.Vector3(Number(x) || 0, Number(y) || 0, Number(z) || 0);
  return target.sub(object.position).setY(0).normalize();
}

function ensureOfficial(list) {
  if (!list.length) return;
  if (!official) official = createOfficial();
  if (!official.parent && list[0].parent) list[0].parent.add(official);
  const c = centerOf(list);
  const first = list[0];
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(first.quaternion).normalize();
  const side = new THREE.Vector3(-forward.z, 0, forward.x);
  official.position.copy(c.clone().addScaledVector(forward, -4.6).addScaledVector(side, 6.2));
  official.position.y = 0.08;
  official.visible = isPrerace();
  if (official.visible) official.lookAt(c.x, 1.2, c.z);
}

function cameraSet(pos, target, fov = 40) {
  if (!mainCamera) return;
  mainCamera.position.copy(pos);
  mainCamera.fov = fov;
  mainCamera.updateProjectionMatrix();
  rawLookAt.call(mainCamera, target);
}

function lineupWide(list, t) {
  const c = centerOf(list);
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(list[0].quaternion).normalize();
  const s = new THREE.Vector3(-f.z, 0, f.x);
  cameraSet(c.clone().addScaledVector(f, -6.3).addScaledVector(s, 4.8 + Math.sin(t * 0.6) * 0.5).add(new THREE.Vector3(0, 1.7, 0)), c.clone().add(new THREE.Vector3(0, 1.25, 0)), 38);
}

function lineupSide(list) {
  const c = centerOf(list);
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(list[0].quaternion).normalize();
  const s = new THREE.Vector3(-f.z, 0, f.x);
  cameraSet(c.clone().addScaledVector(s, 7.2).addScaledVector(f, -1.0).add(new THREE.Vector3(0, 1.45, 0)), c.clone().add(new THREE.Vector3(0, 1.18, 0)), 34);
}

function closeRunner(a, slot) {
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(a.quaternion).normalize();
  const s = new THREE.Vector3(-f.z, 0, f.x);
  cameraSet(a.position.clone().addScaledVector(f, -2.05).addScaledVector(s, slot % 2 ? 0.82 : -0.82).add(new THREE.Vector3(0, 1.62, 0)), a.position.clone().add(new THREE.Vector3(0, 1.50, 0)), 27);
}

function behindStart(list) {
  const c = centerOf(list);
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(list[0].quaternion).normalize();
  cameraSet(c.clone().addScaledVector(f, -7.5).add(new THREE.Vector3(0, 1.9, 0)), c.clone().addScaledVector(f, 7).add(new THREE.Vector3(0, 1.1, 0)), 41);
}

function officialShot() {
  if (!official) return;
  const f = new THREE.Vector3(0, 0, -1).applyQuaternion(official.quaternion).normalize();
  const s = new THREE.Vector3(-f.z, 0, f.x);
  cameraSet(official.position.clone().addScaledVector(f, -2.45).addScaledVector(s, 0.7).add(new THREE.Vector3(0, 1.68, 0)), official.position.clone().add(new THREE.Vector3(0, 1.42, 0)), 29);
}

function driveCamera() {
  if (!mainCamera || !isPrerace()) return;
  const list = activeAthletes();
  if (!list.length) return;
  ensureOfficial(list);
  const now = performance.now();
  const t = (now - introStart) / 1000;
  const command = starterCommand();
  const phase = window.__NCFA_RACE_PHASE || 'presentation';

  if (command === 'ON YOUR MARKS') {
    if (!onMarksAt) onMarksAt = now;
    const age = (now - onMarksAt) / 1000;
    if (age < 0.55) officialShot();
    else if (age < 1.15) lineupSide(list);
    else behindStart(list);
    return;
  }

  if (command === 'OFFICIAL INSTRUCTIONS' || command === 'SET' || officialSpeaking) {
    if (Math.floor(t / 2.1) % 4 === 3) lineupWide(list, t);
    else officialShot();
    return;
  }

  if (phase === 'ready') {
    lineupSide(list);
    return;
  }
  if (phase === 'hold') {
    behindStart(list);
    return;
  }

  const cycle = t % 14.2;
  if (cycle < 2.4) cameraSet(new THREE.Vector3(16 + Math.sin(t * 0.25) * 8, 13.5, 96), new THREE.Vector3(0, 1.8, 0), 45);
  else if (cycle < 4.3) cameraSet(new THREE.Vector3(-42 + Math.sin(t * 0.35) * 10, 4.2, 47), new THREE.Vector3(-16 + Math.sin(t * 0.28) * 12, 3.6, 61), 31);
  else if (cycle < 5.7) cameraSet(new THREE.Vector3(20, 14.5, 53), new THREE.Vector3(42, 17.5, 80), 30);
  else if (cycle < 7.2) cameraSet(new THREE.Vector3(59, 4.7, -37 + Math.sin(t * 0.35) * 7), new THREE.Vector3(18, 1.2, 2), 40);
  else if (cycle < 9.1) lineupWide(list, t);
  else if (cycle < 10.5) closeRunner(list[0], 1);
  else if (cycle < 11.9) closeRunner(list[Math.min(2, list.length - 1)], 2);
  else if (cycle < 13.2) closeRunner(list[Math.min(5, list.length - 1)], 3);
  else lineupSide(list);
}

const rawAdd = THREE.Object3D.prototype.add;
if (!THREE.Object3D.prototype.__ncfaBroadcastCaptureV18) {
  Object.defineProperty(THREE.Object3D.prototype, '__ncfaBroadcastCaptureV18', { value: true });
  THREE.Object3D.prototype.add = function ncfaBroadcastCapture(...objects) {
    const result = rawAdd.apply(this, objects);
    for (const object of objects) {
      if (object?.userData?.isNCFAAthlete) athletes.add(object);
    }
    return result;
  };
}

const rawLookAt = THREE.Object3D.prototype.lookAt;
if (!THREE.Object3D.prototype.__ncfaBroadcastLookAtV18) {
  Object.defineProperty(THREE.Object3D.prototype, '__ncfaBroadcastLookAtV18', { value: true });
  THREE.Object3D.prototype.lookAt = function ncfaBroadcastLookAt(x, y, z) {
    if (this.isPerspectiveCamera && Math.abs((this.fov || 0) - 54) < 0.5) mainCamera = this;

    const result = rawLookAt.call(this, x, y, z);

    if (this.userData?.isNCFAAthlete && isPrerace()) {
      const command = starterCommand();
      const phase = window.__NCFA_RACE_PHASE || 'presentation';
      let progress = 0;
      if (command === 'ON YOUR MARKS') {
        if (!onMarksAt) onMarksAt = performance.now();
        const u = Math.max(0, Math.min(1, (performance.now() - onMarksAt) / 1500));
        progress = u * u * (3 - 2 * u);
      } else if (phase === 'ready' || phase === 'hold') {
        progress = 1;
      } else {
        onMarksAt = 0;
      }
      const dir = directionFromLookAt(this, x, y, z);
      this.position.addScaledVector(dir, -2.7 * (1 - progress));
    }

    return result;
  };
}

function presentationLoop() {
  const prerace = isPrerace();
  if (prerace && !wasPrerace) {
    introStart = performance.now();
    onMarksAt = 0;
  }
  if (prerace) {
    const list = activeAthletes();
    const t = performance.now() / 1000;
    list.forEach((a) => animateMood(a, t));
    ensureOfficial(list);
    animateOfficial(t);
    driveCamera();
  } else if (official) {
    official.visible = false;
  }
  wasPrerace = prerace;
  requestAnimationFrame(presentationLoop);
}

// Register after game.js has created its own animation callback. That means the
// camera we set here persists into the next prerace frame, while the core does
// not overwrite the main prerace camera.
setTimeout(() => requestAnimationFrame(presentationLoop), 0);
