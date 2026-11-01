import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

let currentSpeechPath = null;
let officialSpeech = false;

window.addEventListener('ncfa:speechstart', (event) => {
  currentSpeechPath = event.detail?.path || null;
  officialSpeech = Boolean(currentSpeechPath?.startsWith('officials/'));
});
window.addEventListener('ncfa:speechend', (event) => {
  if (!event.detail?.path || event.detail.path === currentSpeechPath) {
    currentSpeechPath = null;
    officialSpeech = false;
  }
});

function mat(color, roughness = 0.72, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function limb(length, radius, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, length, 10), material);
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  return mesh;
}

function createOfficial() {
  const group = new THREE.Group();
  group.name = 'NCFA Starter Official';
  group.userData.isNCFAOfficial = true;

  const skin = mat(0xc38b68, 0.78);
  const shirt = mat(0xd5dde3, 0.68);
  const pants = mat(0x12161c, 0.84);
  const grey = mat(0xc5c8ca, 0.9);
  const darkGrey = mat(0x666b70, 0.92);
  const clipboardMat = mat(0x3b3128, 0.86);

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.90, 0.32), pants);
  legs.position.y = 0.49;
  group.add(legs);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.88, 0.38), shirt);
  torso.position.y = 1.30;
  torso.castShadow = true;
  group.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.40), mat(0x161616, 0.8));
  belt.position.y = 0.90;
  group.add(belt);

  const headRoot = new THREE.Group();
  headRoot.position.y = 2.00;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.235, 18, 14), skin);
  head.scale.set(0.94, 1.05, 0.95);
  headRoot.add(head);

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.242, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), grey);
  hairCap.position.y = 0.055;
  hairCap.scale.y = 0.55;
  headRoot.add(hairCap);
  for (const side of [-1, 1]) {
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.10), grey);
    temple.position.set(side * 0.205, 0.035, -0.035);
    headRoot.add(temple);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.018, 0.018), darkGrey);
    brow.position.set(side * 0.075, 0.055, -0.218);
    brow.rotation.z = side * -0.10;
    headRoot.add(brow);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.016, 0.018), mat(0x53332c, 0.95));
  mouth.position.set(0, -0.070, -0.225);
  headRoot.add(mouth);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.030, 0.075, 8), skin);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, -0.005, -0.238);
  headRoot.add(nose);
  group.add(headRoot);

  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.43, 1.60, 0);
  leftShoulder.add(limb(0.60, 0.073, skin));
  group.add(leftShoulder);

  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.43, 1.60, 0);
  rightShoulder.add(limb(0.60, 0.073, skin));
  group.add(rightShoulder);

  const clipboard = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.04), clipboardMat);
  clipboard.position.set(-0.50, 0.94, -0.12);
  clipboard.rotation.z = 0.10;
  group.add(clipboard);

  group.userData.rig = { torso, headRoot, mouth, leftShoulder, rightShoulder };
  group.scale.setScalar(1.05);
  group.visible = false;
  return group;
}

function isPrerace() {
  const hud = document.querySelector('#race-hud.screen--active');
  const clock = document.querySelector('#race-clock')?.textContent?.trim();
  return Boolean(hud && clock === '0:00.00' && window.__NCFA_RACE_PHASE !== 'racing');
}

function sortedAthletes(scene) {
  const athletes = [];
  scene.traverse((object) => {
    if (object.userData?.isNCFAAthlete && object.userData?.rig) athletes.push(object);
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

function placeOfficial(official, athletes) {
  if (!athletes.length) return;
  const center = athletes.reduce((sum, athlete) => sum.add(athlete.position), new THREE.Vector3()).multiplyScalar(1 / athletes.length);
  const lead = athletes[0];
  const forward = forwardOf(lead);
  const side = sideOf(lead);
  official.position.copy(center.clone().addScaledVector(forward, -4.7).addScaledVector(side, 6.6));
  official.position.y = 0.08;
  official.lookAt(center.x, 1.18, center.z);
}

function animateOfficial(official, time) {
  const rig = official.userData.rig;
  if (!rig) return;
  const talking = officialSpeech;
  const wordBeat = Math.sin(time * 5.4);
  rig.torso.rotation.set(0.015, talking ? Math.sin(time * 1.35) * 0.018 : 0, 0);
  rig.headRoot.rotation.y = talking ? Math.sin(time * 2.2) * 0.045 : 0;
  rig.headRoot.rotation.x = talking ? -0.025 + Math.sin(time * 3.6) * 0.018 : -0.015;
  rig.rightShoulder.rotation.x = talking ? -0.72 + wordBeat * 0.16 : -0.10;
  rig.rightShoulder.rotation.z = talking ? -0.24 + Math.cos(time * 2.7) * 0.07 : -0.03;
  rig.leftShoulder.rotation.x = talking ? 0.10 : 0.04;
  rig.mouth.scale.y = talking ? 0.72 + Math.abs(Math.sin(time * 10.8)) * 1.45 : 0.62;
}

function moodFor(athlete) {
  if (!athlete.userData.preRaceMood) {
    const index = (athlete.userData.bibNumber || 1) % 3;
    athlete.userData.preRaceMood = index === 0 ? 'nervous' : index === 1 ? 'tense' : 'calm';
  }
  return athlete.userData.preRaceMood;
}

function animateMood(athlete, time) {
  const rig = athlete.userData.rig;
  if (!rig) return;
  const phase = window.__NCFA_RACE_PHASE || 'presentation';
  if (!['presentation', 'walk'].includes(phase)) return;

  const mood = moodFor(athlete);
  const seed = (athlete.userData.bibNumber || 1) * 0.73;
  const breathe = Math.sin(time * 1.8 + seed);

  if (mood === 'nervous') {
    rig.torso.rotation.x = 0.045 + breathe * 0.022;
    rig.torso.rotation.z = Math.sin(time * 3.1 + seed) * 0.028;
    rig.pelvis.rotation.z = -rig.torso.rotation.z * 0.55;
    rig.headRoot.rotation.y = Math.sin(time * 2.7 + seed) * 0.16;
    rig.leftArm.shoulder.rotation.x = -0.18 + Math.sin(time * 5.2 + seed) * 0.11;
    rig.rightArm.shoulder.rotation.x = 0.16 - Math.sin(time * 5.2 + seed) * 0.11;
    rig.leftLeg.hip.rotation.x = Math.sin(time * 3.5 + seed) * 0.10;
    rig.rightLeg.hip.rotation.x = -Math.sin(time * 3.5 + seed) * 0.10;
  } else if (mood === 'tense') {
    rig.torso.rotation.x = 0.095;
    rig.torso.rotation.z = 0;
    rig.pelvis.rotation.z = 0;
    rig.headRoot.rotation.set(-0.055, Math.sin(time * 0.8 + seed) * 0.035, 0);
    rig.leftArm.shoulder.rotation.x = -0.30;
    rig.rightArm.shoulder.rotation.x = 0.30;
    rig.leftArm.shoulder.rotation.z = -0.10;
    rig.rightArm.shoulder.rotation.z = 0.10;
    rig.leftLeg.hip.rotation.x = -0.08;
    rig.rightLeg.hip.rotation.x = 0.08;
  } else {
    rig.torso.rotation.x = 0.035 + breathe * 0.008;
    rig.torso.rotation.z = 0;
    rig.pelvis.rotation.z = 0;
    rig.headRoot.rotation.set(-0.018, 0, 0);
    rig.leftArm.shoulder.rotation.x = -0.10;
    rig.rightArm.shoulder.rotation.x = 0.10;
    rig.leftArm.shoulder.rotation.z = -0.04;
    rig.rightArm.shoulder.rotation.z = 0.04;
    rig.leftLeg.hip.rotation.x = 0;
    rig.rightLeg.hip.rotation.x = 0;
  }
}

function closeAthleteShot(camera, athlete, slot, drift) {
  const f = forwardOf(athlete);
  const side = sideOf(athlete);
  const sign = slot % 2 ? 1 : -1;
  const target = athlete.position.clone().add(new THREE.Vector3(0, 1.62, 0));
  camera.position.copy(
    athlete.position.clone()
      .addScaledVector(f, -2.15 + drift * 0.16)
      .addScaledVector(side, sign * 0.92)
      .add(new THREE.Vector3(0, 1.66, 0))
  );
  camera.lookAt(target);
  camera.fov = 29;
  camera.updateProjectionMatrix();
}

function lineupShot(camera, athletes, seconds) {
  const center = athletes.reduce((sum, athlete) => sum.add(athlete.position), new THREE.Vector3()).multiplyScalar(1 / athletes.length);
  const first = athletes[0];
  const f = forwardOf(first);
  const side = sideOf(first);
  const slide = Math.sin(seconds * 0.45) * 0.65;
  camera.position.copy(center.clone().addScaledVector(f, -6.2).addScaledVector(side, 4.9 + slide).add(new THREE.Vector3(0, 1.72, 0)));
  camera.lookAt(center.clone().add(new THREE.Vector3(0, 1.35, 0)));
  camera.fov = 42;
  camera.updateProjectionMatrix();
}

function officialShot(camera, official) {
  const f = forwardOf(official);
  const side = sideOf(official);
  camera.position.copy(official.position.clone().addScaledVector(f, -2.45).addScaledVector(side, 0.72).add(new THREE.Vector3(0, 1.68, 0)));
  camera.lookAt(official.position.clone().add(new THREE.Vector3(0, 1.42, 0)));
  camera.fov = 30;
  camera.updateProjectionMatrix();
}

function setPreRaceShot(camera, athletes, official, seconds) {
  if (!athletes.length) return;
  if (officialSpeech && official.visible) {
    officialShot(camera, official);
    return;
  }

  const phase = window.__NCFA_RACE_PHASE || 'presentation';
  if (['ready', 'hold'].includes(phase)) {
    lineupShot(camera, athletes, seconds);
    return;
  }

  const shotLength = 1.75;
  const slots = athletes.length + 2;
  const slot = Math.floor(seconds / shotLength) % slots;
  const drift = (seconds % shotLength) / shotLength;
  if (slot === 0 || slot === slots - 1) lineupShot(camera, athletes, seconds);
  else closeAthleteShot(camera, athletes[(slot - 1) % athletes.length], slot, drift);
}

function enhanceVideoBoard(scene) {
  if (scene.userData.ncfaBoardEnhanced) return;
  let screen = null;
  let clock = null;
  scene.traverse((object) => {
    const p = object.geometry?.parameters;
    if (!object.isMesh || !p) return;
    if (Math.abs((p.width || 0) - 23.8) < 0.2 && Math.abs((p.height || 0) - 10.2) < 0.2) screen = object;
    if (Math.abs((p.width || 0) - 20.2) < 0.2 && Math.abs((p.height || 0) - 2.45) < 0.2) clock = object;
  });
  if (!screen) return;
  screen.scale.set(1.26, 1.22, 1);
  screen.renderOrder = 8;
  if (screen.material) {
    screen.material.toneMapped = false;
    screen.material.color?.set?.(0xffffff);
    screen.material.needsUpdate = true;
  }
  if (clock) {
    clock.scale.set(1.34, 1.34, 1);
    clock.position.y += 0.7;
    clock.renderOrder = 9;
  }
  scene.userData.ncfaBoardEnhanced = true;
}

const originalRender = THREE.WebGLRenderer.prototype.render;
const sceneStates = new WeakMap();

if (!THREE.WebGLRenderer.prototype.__ncfaPresentationV3) {
  Object.defineProperty(THREE.WebGLRenderer.prototype, '__ncfaPresentationV3', { value: true });
  THREE.WebGLRenderer.prototype.render = function patchedPresentation(scene, camera) {
    const mainPass = this.getRenderTarget() === null;
    if (mainPass && scene?.isScene && camera?.isPerspectiveCamera) {
      enhanceVideoBoard(scene);
      let state = sceneStates.get(scene);
      if (!state) {
        const official = createOfficial();
        scene.add(official);
        state = { official, introStart: performance.now(), wasPrerace: false };
        sceneStates.set(scene, state);
      }

      const preRace = isPrerace();
      if (preRace) {
        if (!state.wasPrerace) state.introStart = performance.now();
        const athletes = sortedAthletes(scene);
        athletes.forEach((athlete) => animateMood(athlete, performance.now() / 1000));
        placeOfficial(state.official, athletes);
        state.official.visible = true;
        animateOfficial(state.official, performance.now() / 1000);
        setPreRaceShot(camera, athletes, state.official, (performance.now() - state.introStart) / 1000);
      } else {
        state.official.visible = false;
      }
      state.wasPrerace = preRace;
    }
    return originalRender.call(this, scene, camera);
  };
}
