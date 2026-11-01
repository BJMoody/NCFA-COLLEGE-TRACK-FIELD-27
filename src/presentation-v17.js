import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

window.__NCFA_PRESENTATION_V17_READY = true;

let speechPath = null;
let speechStartedAt = 0;
let speechDurationMs = 2200;
let officialSpeaking = false;
let onMarksSpeaking = false;

window.addEventListener('ncfa:speechstart', (event) => {
  speechPath = event.detail?.path || '';
  speechStartedAt = performance.now();
  speechDurationMs = Math.max(900, Number(event.detail?.duration || 2.2) * 1000);
  officialSpeaking = speechPath.startsWith('officials/');
  onMarksSpeaking = /officials\/on_your_marks_/.test(speechPath);
});

window.addEventListener('ncfa:speechend', (event) => {
  if (!event.detail?.path || event.detail.path === speechPath) {
    onMarksSpeaking = false;
    officialSpeaking = false;
    speechPath = null;
  }
});

const mat = (color, roughness = 0.75) => new THREE.MeshStandardMaterial({ color, roughness });

function limb(length, radius, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, length, 8), material);
  mesh.position.y = -length / 2;
  return mesh;
}

function createOfficial() {
  const g = new THREE.Group();
  g.name = 'NCFA Senior Starter Official';
  g.userData.isNCFAOfficial = true;

  const skin = mat(0xb97d59, 0.8);
  const shirt = mat(0xd9dde0, 0.68);
  const pants = mat(0x15181d, 0.9);
  const grey = mat(0xb8babd, 0.92);
  const browMat = mat(0x5e6165, 0.95);

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.94, 0.34), pants);
  legs.position.y = 0.5;
  g.add(legs);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.92, 0.4), shirt);
  torso.position.y = 1.34;
  g.add(torso);

  const headRoot = new THREE.Group();
  headRoot.position.y = 2.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), skin);
  head.scale.set(0.95, 1.06, 0.95);
  headRoot.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.247, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.54), grey);
  hair.position.y = 0.06;
  hair.scale.y = 0.53;
  headRoot.add(hair);

  for (const side of [-1, 1]) {
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.1), grey);
    temple.position.set(side * 0.205, 0.025, -0.03);
    headRoot.add(temple);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.02), browMat);
    brow.position.set(side * 0.075, 0.055, -0.22);
    brow.rotation.z = side * -0.11;
    headRoot.add(brow);
  }

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.018, 0.018), mat(0x56352e, 0.95));
  mouth.position.set(0, -0.075, -0.225);
  headRoot.add(mouth);
  g.add(headRoot);

  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.45, 1.63, 0);
  leftShoulder.add(limb(0.62, 0.075, skin));
  g.add(leftShoulder);

  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.45, 1.63, 0);
  rightShoulder.add(limb(0.62, 0.075, skin));
  g.add(rightShoulder);

  const clipboard = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.04), mat(0x3c3128, 0.9));
  clipboard.position.set(-0.52, 0.96, -0.12);
  clipboard.rotation.z = 0.1;
  g.add(clipboard);

  g.userData.rig = { torso, headRoot, mouth, leftShoulder, rightShoulder };
  g.visible = false;
  return g;
}

function sortedAthletes(scene) {
  const athletes = [];
  scene.traverse((o) => {
    if (o.userData?.isNCFAAthlete && o.userData?.rig) athletes.push(o);
  });
  athletes.sort((a, b) => (a.userData.bibNumber || 0) - (b.userData.bibNumber || 0));
  return athletes;
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

function isPrerace() {
  return Boolean(
    document.querySelector('#race-hud.screen--active') &&
    document.querySelector('#race-clock')?.textContent?.trim() === '0:00.00' &&
    window.__NCFA_RACE_PHASE !== 'racing'
  );
}

function moodFor(athlete) {
  if (!athlete.userData.preRaceMood) {
    const n = (athlete.userData.bibNumber || 1) % 3;
    athlete.userData.preRaceMood = n === 0 ? 'nervous' : n === 1 ? 'tense' : 'calm';
  }
  return athlete.userData.preRaceMood;
}

function animateMood(athlete, time) {
  const rig = athlete.userData.rig;
  if (!rig) return;
  const mood = moodFor(athlete);
  const seed = (athlete.userData.bibNumber || 1) * 0.71;
  const breathe = Math.sin(time * 1.7 + seed);
  const LArm = rig.leftArm?.shoulder;
  const RArm = rig.rightArm?.shoulder;
  const LLeg = rig.leftLeg?.hip;
  const RLeg = rig.rightLeg?.hip;

  if (mood === 'nervous') {
    if (rig.torso) {
      rig.torso.rotation.x = 0.045 + breathe * 0.018;
      rig.torso.rotation.z = Math.sin(time * 3.0 + seed) * 0.025;
    }
    if (rig.pelvis) rig.pelvis.rotation.z = -Math.sin(time * 3.0 + seed) * 0.014;
    if (rig.headRoot) rig.headRoot.rotation.y = Math.sin(time * 2.5 + seed) * 0.14;
    if (LArm) LArm.rotation.x = -0.18 + Math.sin(time * 4.8 + seed) * 0.1;
    if (RArm) RArm.rotation.x = 0.18 - Math.sin(time * 4.8 + seed) * 0.1;
    if (LLeg) LLeg.rotation.x = Math.sin(time * 3.1 + seed) * 0.08;
    if (RLeg) RLeg.rotation.x = -Math.sin(time * 3.1 + seed) * 0.08;
  } else if (mood === 'tense') {
    if (rig.torso) rig.torso.rotation.set(0.09, 0, 0);
    if (rig.headRoot) rig.headRoot.rotation.set(-0.05, Math.sin(time * 0.8 + seed) * 0.03, 0);
    if (LArm) LArm.rotation.x = -0.28;
    if (RArm) RArm.rotation.x = 0.28;
    if (LLeg) LLeg.rotation.x = -0.06;
    if (RLeg) RLeg.rotation.x = 0.06;
  } else {
    if (rig.torso) rig.torso.rotation.set(0.03 + breathe * 0.007, 0, 0);
    if (rig.headRoot) rig.headRoot.rotation.set(-0.015, 0, 0);
    if (LArm) LArm.rotation.x = -0.09;
    if (RArm) RArm.rotation.x = 0.09;
    if (LLeg) LLeg.rotation.x = 0;
    if (RLeg) RLeg.rotation.x = 0;
  }
}

function placeOfficial(official, athletes) {
  if (!athletes.length) return;
  const center = centerOf(athletes);
  const f = forwardOf(athletes[0]);
  const side = sideOf(athletes[0]);
  official.position.copy(center.clone().addScaledVector(f, -4.5).addScaledVector(side, 6.0));
  official.position.y = 0.08;
  official.lookAt(center.x, 1.25, center.z);
}

function animateOfficial(official, time) {
  const rig = official.userData.rig;
  if (!rig) return;
  const beat = Math.sin(time * 5.1);
  rig.torso.rotation.y = officialSpeaking ? Math.sin(time * 1.2) * 0.018 : 0;
  rig.headRoot.rotation.y = officialSpeaking ? Math.sin(time * 2.0) * 0.045 : 0;
  rig.headRoot.rotation.x = officialSpeaking ? -0.025 + Math.sin(time * 3.1) * 0.015 : -0.015;
  rig.rightShoulder.rotation.x = officialSpeaking ? -0.68 + beat * 0.13 : -0.1;
  rig.rightShoulder.rotation.z = officialSpeaking ? -0.22 : -0.03;
  rig.leftShoulder.rotation.x = officialSpeaking ? 0.08 : 0.03;
  rig.mouth.scale.y = officialSpeaking ? 0.7 + Math.abs(Math.sin(time * 10.0)) * 1.3 : 0.62;
}

function captureIntroBases(state, athletes) {
  if (state.introCaptured) return;
  athletes.forEach((a) => {
    a.userData.ncfaIntroBase = a.position.clone();
  });
  state.introCaptured = true;
}

function placeRunnersForIntro(state, athletes) {
  captureIntroBases(state, athletes);
  const isOnMarks = onMarksSpeaking || /ON YOUR MARKS/i.test(document.querySelector('#starter-command')?.textContent || '');
  let progress = 0;
  if (isOnMarks) {
    const raw = (performance.now() - speechStartedAt) / Math.max(900, speechDurationMs * 0.82);
    const t = Math.max(0, Math.min(1, raw));
    progress = t * t * (3 - 2 * t);
  }

  athletes.forEach((a) => {
    const base = a.userData.ncfaIntroBase;
    if (!base) return;
    const f = forwardOf(a);
    const waitPos = base.clone().addScaledVector(f, -2.6);
    a.position.copy(waitPos.lerp(base, progress));
  });
}

function lineupWide(camera, athletes, time) {
  const center = centerOf(athletes);
  const f = forwardOf(athletes[0]);
  const side = sideOf(athletes[0]);
  camera.position.copy(center.clone().addScaledVector(f, -6.4).addScaledVector(side, 5.0 + Math.sin(time * 0.5) * 0.65).add(new THREE.Vector3(0, 1.8, 0)));
  camera.lookAt(center.clone().add(new THREE.Vector3(0, 1.3, 0)));
  camera.fov = 40;
  camera.updateProjectionMatrix();
}

function lineupSide(camera, athletes) {
  const center = centerOf(athletes);
  const side = sideOf(athletes[0]);
  const f = forwardOf(athletes[0]);
  camera.position.copy(center.clone().addScaledVector(side, 7.4).addScaledVector(f, -1.1).add(new THREE.Vector3(0, 1.45, 0)));
  camera.lookAt(center.clone().add(new THREE.Vector3(0, 1.22, 0)));
  camera.fov = 36;
  camera.updateProjectionMatrix();
}

function closeAthlete(camera, athlete, slot, drift = 0) {
  const f = forwardOf(athlete);
  const side = sideOf(athlete);
  const sign = slot % 2 ? 1 : -1;
  camera.position.copy(athlete.position.clone().addScaledVector(f, -2.0).addScaledVector(side, sign * 0.85).add(new THREE.Vector3(0, 1.65, 0)));
  camera.position.addScaledVector(side, drift * 0.18);
  camera.lookAt(athlete.position.clone().add(new THREE.Vector3(0, 1.52, 0)));
  camera.fov = 28;
  camera.updateProjectionMatrix();
}

function behindStart(camera, athletes) {
  const center = centerOf(athletes);
  const f = forwardOf(athletes[0]);
  camera.position.copy(center.clone().addScaledVector(f, -7.8).add(new THREE.Vector3(0, 2.0, 0)));
  camera.lookAt(center.clone().addScaledVector(f, 7.0).add(new THREE.Vector3(0, 1.15, 0)));
  camera.fov = 43;
  camera.updateProjectionMatrix();
}

function officialShot(camera, official) {
  const f = forwardOf(official);
  const side = sideOf(official);
  camera.position.copy(official.position.clone().addScaledVector(f, -2.5).addScaledVector(side, 0.7).add(new THREE.Vector3(0, 1.7, 0)));
  camera.lookAt(official.position.clone().add(new THREE.Vector3(0, 1.45, 0)));
  camera.fov = 30;
  camera.updateProjectionMatrix();
}

function stadiumWide(camera, time) {
  const swing = Math.sin(time * 0.16) * 9;
  camera.position.set(15 + swing, 26, 92);
  camera.lookAt(0, 1.5, 0);
  camera.fov = 48;
  camera.updateProjectionMatrix();
}

function curveSweep(camera, time) {
  camera.position.set(60, 6.5, -38 + Math.sin(time * 0.25) * 8);
  camera.lookAt(18, 1.2, 2);
  camera.fov = 43;
  camera.updateProjectionMatrix();
}

function crowdSweep(camera, time) {
  camera.position.set(-42 + Math.sin(time * 0.3) * 12, 6.0, 46);
  camera.lookAt(-18 + Math.sin(time * 0.22) * 12, 4.0, 61);
  camera.fov = 34;
  camera.updateProjectionMatrix();
}

function boardShot(camera) {
  camera.position.set(22, 15.5, 52);
  camera.lookAt(42, 17.5, 80);
  camera.fov = 32;
  camera.updateProjectionMatrix();
}

function speechProgress() {
  return Math.max(0, Math.min(0.999, (performance.now() - speechStartedAt) / Math.max(900, speechDurationMs)));
}

function chooseCamera(camera, athletes, official, seconds) {
  if (!athletes.length) return;
  const phase = window.__NCFA_RACE_PHASE || 'presentation';
  const p = speechProgress();

  if (onMarksSpeaking) {
    if (p < 0.28) officialShot(camera, official);
    else if (p < 0.62) lineupSide(camera, athletes);
    else behindStart(camera, athletes);
    return;
  }

  if (officialSpeaking) {
    if (p < 0.72) officialShot(camera, official);
    else lineupWide(camera, athletes, seconds);
    return;
  }

  if (phase === 'ready' || phase === 'hold') {
    if (phase === 'hold') behindStart(camera, athletes);
    else lineupSide(camera, athletes);
    return;
  }

  const path = speechPath || '';
  if (path.startsWith('pa/') && /venue_welcome|welcome/i.test(path)) {
    const slot = Math.floor(p * 4);
    if (slot === 0) stadiumWide(camera, seconds);
    else if (slot === 1) crowdSweep(camera, seconds);
    else if (slot === 2) curveSweep(camera, seconds);
    else boardShot(camera);
    return;
  }

  if (path.startsWith('pa/') && /event_|call_/i.test(path)) {
    const slot = Math.floor(p * 5);
    if (slot === 0) lineupWide(camera, athletes, seconds);
    else if (slot === 1) closeAthlete(camera, athletes[0], 1, p);
    else if (slot === 2) closeAthlete(camera, athletes[Math.min(2, athletes.length - 1)], 2, p);
    else if (slot === 3) closeAthlete(camera, athletes[Math.min(5, athletes.length - 1)], 3, p);
    else lineupSide(camera, athletes);
    return;
  }

  if (path.startsWith('commentary/')) {
    const slot = Math.floor(p * 4);
    if (slot === 0) lineupWide(camera, athletes, seconds);
    else if (slot === 1) closeAthlete(camera, athletes[1 % athletes.length], 1, p);
    else if (slot === 2) closeAthlete(camera, athletes[4 % athletes.length], 2, p);
    else behindStart(camera, athletes);
    return;
  }

  const cycle = Math.floor(seconds / 2.0) % 6;
  if (cycle === 0) stadiumWide(camera, seconds);
  else if (cycle === 1) crowdSweep(camera, seconds);
  else if (cycle === 2) lineupWide(camera, athletes, seconds);
  else if (cycle === 3) closeAthlete(camera, athletes[0], 1, seconds % 1);
  else if (cycle === 4) boardShot(camera);
  else lineupSide(camera, athletes);
}

function enhanceBoard(scene) {
  if (scene.userData.ncfaBoardV17) return;
  let screen = null;
  let clock = null;
  scene.traverse((o) => {
    const p = o.geometry?.parameters;
    if (!o.isMesh || !p) return;
    if (Math.abs((p.width || 0) - 27) < 0.3 && Math.abs((p.height || 0) - 11.2) < 0.3) screen = o;
    if (Math.abs((p.width || 0) - 23.5) < 0.3 && Math.abs((p.height || 0) - 2.6) < 0.3) clock = o;
  });
  if (screen) {
    screen.scale.set(1.15, 1.12, 1);
    screen.renderOrder = 8;
    if (screen.material) {
      screen.material.toneMapped = false;
      screen.material.needsUpdate = true;
    }
  }
  if (clock) {
    clock.scale.set(1.18, 1.18, 1);
    clock.renderOrder = 9;
  }
  if (screen || clock) scene.userData.ncfaBoardV17 = true;
}

const previousRender = THREE.WebGLRenderer.prototype.render;
const sceneStates = new WeakMap();

if (!THREE.WebGLRenderer.prototype.__ncfaPresentationV17) {
  Object.defineProperty(THREE.WebGLRenderer.prototype, '__ncfaPresentationV17', { value: true });

  THREE.WebGLRenderer.prototype.render = function ncfaPresentationV17(scene, camera) {
    const mainPass = this.getRenderTarget() === null;
    if (mainPass && scene?.isScene && camera?.isPerspectiveCamera) {
      enhanceBoard(scene);
      let state = sceneStates.get(scene);
      if (!state) {
        const official = createOfficial();
        scene.add(official);
        state = { official, introStart: performance.now(), wasPrerace: false, introCaptured: false };
        sceneStates.set(scene, state);
      }

      const prerace = isPrerace();
      if (prerace) {
        if (!state.wasPrerace) {
          state.introStart = performance.now();
          state.introCaptured = false;
        }
        const athletes = sortedAthletes(scene);
        placeRunnersForIntro(state, athletes);
        const now = performance.now() / 1000;
        athletes.forEach((a) => animateMood(a, now));
        placeOfficial(state.official, athletes);
        state.official.visible = true;
        animateOfficial(state.official, now);
        chooseCamera(camera, athletes, state.official, (performance.now() - state.introStart) / 1000);
      } else {
        if (state.wasPrerace) {
          sortedAthletes(scene).forEach((a) => delete a.userData.ncfaIntroBase);
          state.introCaptured = false;
        }
        state.official.visible = false;
      }
      state.wasPrerace = prerace;
    }

    return previousRender.call(this, scene, camera);
  };
}
