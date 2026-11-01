import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

window.__NCFA_PRESENTATION_V18_READY = true;

let introStart = 0;
let onMarksAt = 0;
let wasPrerace = false;
let speechPath = '';
let officialSpeaking = false;
let official = null;
const trackedAthletes = new Set();

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
  return [...trackedAthletes]
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
  const shirt = makeMaterial(0xd8dde0, 0.70);
  const pants = makeMaterial(0x12161c, 0.90);
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
  g.scale.setScalar(1.08);
  g.visible = false;
  return g;
}

function forwardOf(object) {
  return new THREE.Vector3(0, 0, -1).applyQuaternion(object.quaternion).normalize();
}
function sideOf(object) {
  const f = forwardOf(object);
  return new THREE.Vector3(-f.z, 0, f.x);
}
function centerOf(list) {
  return list.reduce((sum, a) => sum.add(a.position), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, list.length));
}

function moodFor(a) {
  if (!a.userData.preRaceMood) {
    const i = (a.userData.bibNumber || 1) % 3;
    a.userData.preRaceMood = i === 0 ? 'nervous' : i === 1 ? 'tense' : 'calm';
  }
  return a.userData.preRaceMood;
}

function applyMood(a, t) {
  const r = a.userData.rig;
  if (!r) return;
  const mood = moodFor(a);
  const seed = (a.userData.bibNumber || 1) * 0.71;
  if (mood === 'nervous') {
    if (r.headRoot) r.headRoot.rotation.y = Math.sin(t * 2.5 + seed) * 0.15;
    if (r.torso) r.torso.rotation.z = Math.sin(t * 3.0 + seed) * 0.025;
  } else if (mood === 'tense') {
    if (r.headRoot) r.headRoot.rotation.x = -0.05;
    if (r.torso) r.torso.rotation.x = 0.09;
  } else {
    if (r.headRoot) r.headRoot.rotation.set(-0.015, 0, 0);
    if (r.torso) r.torso.rotation.x = 0.03 + Math.sin(t * 1.7 + seed) * 0.007;
  }
}

function applyWalkPose(a, progress, t) {
  if (progress <= 0 || progress >= 1) return;
  const r = a.userData.rig;
  if (!r) return;
  const cycle = t * 7.2 + (a.userData.bibNumber || 1) * 0.4;
  const swing = Math.sin(cycle) * 0.30;
  if (r.leftLeg?.hip) r.leftLeg.hip.rotation.x = swing;
  if (r.rightLeg?.hip) r.rightLeg.hip.rotation.x = -swing;
  if (r.leftLeg?.knee) r.leftLeg.knee.rotation.x = Math.max(0, -Math.sin(cycle)) * 0.32;
  if (r.rightLeg?.knee) r.rightLeg.knee.rotation.x = Math.max(0, Math.sin(cycle)) * 0.32;
  if (r.leftArm?.shoulder) r.leftArm.shoulder.rotation.x = -swing * 0.8;
  if (r.rightArm?.shoulder) r.rightArm.shoulder.rotation.x = swing * 0.8;
  if (r.torso) r.torso.rotation.x = 0.035;
}

function ensureOfficial(scene, list) {
  if (!list.length) return;
  if (!official) official = createOfficial();
  if (!official.parent) scene.add(official);
  const center = centerOf(list);
  const f = forwardOf(list[0]);
  const side = sideOf(list[0]);
  official.position.copy(center.clone().addScaledVector(f, -4.3).addScaledVector(side, 5.8));
  official.position.y = 0.08;
  official.lookAt(center.x, 1.2, center.z);
  official.visible = true;
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

function captureTrueMarks(list) {
  for (const a of list) {
    if (!a.userData.ncfaTrueStartMark) {
      a.userData.ncfaTrueStartMark = a.position.clone();
      a.userData.ncfaTrueStartForward = forwardOf(a).clone();
    }
  }
}

function clearTrueMarks() {
  for (const a of trackedAthletes) {
    delete a.userData.ncfaTrueStartMark;
    delete a.userData.ncfaTrueStartForward;
  }
}

function markProgress() {
  const command = starterCommand();
  const phase = window.__NCFA_RACE_PHASE || 'presentation';
  if (command === 'ON YOUR MARKS') {
    if (!onMarksAt) onMarksAt = performance.now();
    const u = Math.max(0, Math.min(1, (performance.now() - onMarksAt) / 1350));
    return u * u * (3 - 2 * u);
  }
  if (phase === 'ready' || phase === 'hold') return 1;
  onMarksAt = 0;
  return 0;
}

function moveRunners(list, t) {
  captureTrueMarks(list);
  const progress = markProgress();
  for (const a of list) {
    const mark = a.userData.ncfaTrueStartMark;
    const forward = a.userData.ncfaTrueStartForward || forwardOf(a);
    if (!mark) continue;
    const wait = mark.clone().addScaledVector(forward, -2.7);
    a.position.copy(wait.clone().lerp(mark, progress));
    applyWalkPose(a, progress, t);
  }
}

function setCamera(camera, pos, target, fov) {
  camera.position.copy(pos);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  camera.lookAt(target);
}

function lineupWide(camera, list, t) {
  const c = centerOf(list);
  const f = forwardOf(list[0]);
  const s = sideOf(list[0]);
  setCamera(camera, c.clone().addScaledVector(f, -6.3).addScaledVector(s, 4.8 + Math.sin(t * 0.6) * 0.5).add(new THREE.Vector3(0, 1.7, 0)), c.clone().add(new THREE.Vector3(0, 1.25, 0)), 38);
}
function lineupSide(camera, list) {
  const c = centerOf(list);
  const f = forwardOf(list[0]);
  const s = sideOf(list[0]);
  setCamera(camera, c.clone().addScaledVector(s, 7.2).addScaledVector(f, -1.0).add(new THREE.Vector3(0, 1.45, 0)), c.clone().add(new THREE.Vector3(0, 1.18, 0)), 34);
}
function closeRunner(camera, a, slot) {
  const f = forwardOf(a);
  const s = sideOf(a);
  setCamera(camera, a.position.clone().addScaledVector(f, -2.05).addScaledVector(s, slot % 2 ? 0.82 : -0.82).add(new THREE.Vector3(0, 1.62, 0)), a.position.clone().add(new THREE.Vector3(0, 1.50, 0)), 27);
}
function behindStart(camera, list) {
  const c = centerOf(list);
  const f = forwardOf(list[0]);
  setCamera(camera, c.clone().addScaledVector(f, -7.5).add(new THREE.Vector3(0, 1.9, 0)), c.clone().addScaledVector(f, 7).add(new THREE.Vector3(0, 1.1, 0)), 41);
}
function officialShot(camera) {
  if (!official) return;
  const f = forwardOf(official);
  const s = sideOf(official);
  setCamera(camera, official.position.clone().addScaledVector(f, 2.55).addScaledVector(s, 0.8).add(new THREE.Vector3(0, 1.62, 0)), official.position.clone().add(new THREE.Vector3(0, 1.42, 0)), 28);
}

function directCamera(camera, list) {
  const now = performance.now();
  const t = (now - introStart) / 1000;
  const command = starterCommand();
  const phase = window.__NCFA_RACE_PHASE || 'presentation';

  if (command === 'ON YOUR MARKS') {
    const age = onMarksAt ? (now - onMarksAt) / 1000 : 0;
    if (age < 0.45) officialShot(camera);
    else if (age < 1.05) lineupSide(camera, list);
    else behindStart(camera, list);
    return;
  }

  if (command === 'OFFICIAL INSTRUCTIONS' || command === 'SET' || officialSpeaking) {
    const cut = (t % 2.0);
    if (cut < 1.55) officialShot(camera);
    else lineupWide(camera, list, t);
    return;
  }

  if (phase === 'ready') {
    lineupSide(camera, list);
    return;
  }
  if (phase === 'hold') {
    behindStart(camera, list);
    return;
  }

  // Compact 7.6s broadcast loop so every PA window shows several distinct shots.
  const cycle = t % 7.6;
  if (cycle < 1.15) setCamera(camera, new THREE.Vector3(18 + Math.sin(t * 0.35) * 6, 11.5, 92), new THREE.Vector3(0, 1.8, 0), 44);
  else if (cycle < 2.20) setCamera(camera, new THREE.Vector3(-39 + Math.sin(t * 0.45) * 8, 4.2, 48), new THREE.Vector3(-15 + Math.sin(t * 0.35) * 8, 3.7, 61), 30);
  else if (cycle < 3.05) setCamera(camera, new THREE.Vector3(20, 14.5, 53), new THREE.Vector3(42, 17.5, 80), 29);
  else if (cycle < 3.95) setCamera(camera, new THREE.Vector3(58, 4.6, -36 + Math.sin(t * 0.45) * 5), new THREE.Vector3(18, 1.2, 2), 39);
  else if (cycle < 5.05) lineupWide(camera, list, t);
  else if (cycle < 6.00) closeRunner(camera, list[0], 1);
  else if (cycle < 6.85) closeRunner(camera, list[Math.min(2, list.length - 1)], 2);
  else lineupSide(camera, list);
}

function installSceneHook(scene) {
  if (scene.userData.ncfaPresentationSceneV18) return;
  scene.userData.ncfaPresentationSceneV18 = true;
  const previous = scene.onBeforeRender;

  scene.onBeforeRender = function ncfaPreraceBeforeRender(renderer, renderedScene, camera, renderTarget) {
    previous?.call?.(this, renderer, renderedScene, camera, renderTarget);

    // Ignore the stadium's secondary broadcast-camera pass.
    if (!camera?.isPerspectiveCamera || Math.abs((camera.fov || 0) - 42) < 0.5) return;

    const prerace = isPrerace();
    if (!prerace) {
      if (official) official.visible = false;
      if (wasPrerace) clearTrueMarks();
      wasPrerace = false;
      return;
    }

    if (!wasPrerace) {
      introStart = performance.now();
      onMarksAt = 0;
      clearTrueMarks();
    }
    wasPrerace = true;

    const list = activeAthletes();
    if (!list.length) return;

    const t = performance.now() / 1000;
    moveRunners(list, t);
    list.forEach((a) => applyMood(a, t));
    ensureOfficial(renderedScene, list);
    animateOfficial(t);
    directCamera(camera, list);
  };
}

const originalAdd = THREE.Object3D.prototype.add;
if (!THREE.Object3D.prototype.__ncfaPresentationCaptureV18) {
  Object.defineProperty(THREE.Object3D.prototype, '__ncfaPresentationCaptureV18', { value: true });
  THREE.Object3D.prototype.add = function ncfaPresentationCapture(...objects) {
    const result = originalAdd.apply(this, objects);
    if (this.isScene) installSceneHook(this);
    for (const object of objects) {
      if (object?.userData?.isNCFAAthlete) trackedAthletes.add(object);
    }
    return result;
  };
}
