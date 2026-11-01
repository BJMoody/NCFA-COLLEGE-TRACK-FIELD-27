import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const STRAIGHT = 84.39;
const BASE_RADIUS = 36.80;
const LAP = 2 * STRAIGHT + 2 * Math.PI * BASE_RADIUS;
const LANE_WIDTH = 1.22;
const INNER_RADIUS = BASE_RADIUS - 1.7;
const TRACK_Y = 0.08;

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

function stadiumPoint(metres, radius = BASE_RADIUS) {
  let d = ((metres % LAP) + LAP) % LAP;
  const curve = Math.PI * BASE_RADIUS;
  if (d < STRAIGHT) return new THREE.Vector3(-STRAIGHT / 2 + d, TRACK_Y, -radius);
  d -= STRAIGHT;
  if (d < curve) {
    const a = -Math.PI / 2 + d / BASE_RADIUS;
    return new THREE.Vector3(STRAIGHT / 2 + Math.cos(a) * radius, TRACK_Y, Math.sin(a) * radius);
  }
  d -= curve;
  if (d < STRAIGHT) return new THREE.Vector3(STRAIGHT / 2 - d, TRACK_Y, radius);
  d -= STRAIGHT;
  const a = Math.PI / 2 + d / BASE_RADIUS;
  return new THREE.Vector3(-STRAIGHT / 2 + Math.cos(a) * radius, TRACK_Y, Math.sin(a) * radius);
}

function mat(color, roughness = 0.72) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function limb(length, radius, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, length, 8), material);
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  return mesh;
}

function createOfficial() {
  const group = new THREE.Group();
  group.name = 'NCFA Starter Official';
  group.userData.isNCFAOfficial = true;

  const skin = mat(0x8b5b3f, 0.8);
  const shirt = mat(0xb9d4ef, 0.62);
  const pants = mat(0x171b22, 0.82);
  const cap = mat(0x10141a, 0.76);
  const clipboardMat = mat(0x44382e, 0.86);

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.88, 0.30), pants);
  legs.position.y = 0.48;
  group.add(legs);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.82, 0.34), shirt);
  torso.position.y = 1.27;
  torso.castShadow = true;
  group.add(torso);

  const headRoot = new THREE.Group();
  headRoot.position.y = 1.94;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), skin);
  headRoot.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.10, 16), cap);
  hat.position.y = 0.20;
  headRoot.add(hat);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.035, 0.18), cap);
  brim.position.set(0, 0.17, -0.15);
  headRoot.add(brim);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.018, 0.018), mat(0x432219, 0.9));
  mouth.position.set(0, -0.055, -0.215);
  headRoot.add(mouth);
  group.add(headRoot);

  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.40, 1.55, 0);
  leftShoulder.add(limb(0.58, 0.07, skin));
  leftShoulder.rotation.z = -0.10;
  group.add(leftShoulder);

  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.40, 1.55, 0);
  rightShoulder.add(limb(0.58, 0.07, skin));
  group.add(rightShoulder);

  const clipboard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.035), clipboardMat);
  clipboard.position.set(-0.48, 0.92, -0.12);
  clipboard.rotation.z = 0.16;
  group.add(clipboard);

  group.userData.rig = { torso, headRoot, mouth, leftShoulder, rightShoulder };
  group.scale.setScalar(1.04);
  group.visible = false;
  return group;
}

function getPresentationState(scene, map) {
  let state = map.get(scene);
  if (!state) {
    const official = createOfficial();
    scene.add(official);
    state = { official, introStart: 0, wasPrerace: false };
    map.set(scene, state);
  }
  return state;
}

function isPrerace() {
  const hud = document.querySelector('#race-hud.screen--active');
  const command = document.querySelector('#starter-command')?.textContent?.trim();
  const clock = document.querySelector('#race-clock')?.textContent?.trim();
  return Boolean(hud && command && clock === '0:00.00');
}

function sortedAthletes(scene) {
  const athletes = [];
  scene.traverse((object) => {
    if (object.userData?.isNCFAAthlete && object.userData?.rig) athletes.push(object);
  });
  athletes.sort((a, b) => (a.userData.bibNumber || 0) - (b.userData.bibNumber || 0));
  return athletes;
}

function lineupPose(index, total, startDetail, eventName) {
  const waterfall = /waterfall/i.test(startDetail);
  if (waterfall) {
    const front = index < Math.min(5, total);
    const slot = front ? index : index - 5 + 0.55;
    const laneFloat = 1.05 + slot * 0.72;
    const course = front ? 0 : -1.20;
    const radius = INNER_RADIUS + (laneFloat - 0.5) * LANE_WIDTH;
    return { course, radius };
  }

  const lane = index + 1;
  const staggered = /one-turn|stagger|lane/i.test(startDetail) || ['100m', '200m', '400m'].includes(eventName);
  const course = staggered ? (lane - 1) * Math.PI * LANE_WIDTH : 0;
  const radius = INNER_RADIUS + (lane - 0.5) * LANE_WIDTH;
  return { course, radius };
}

function setIdlePose(athlete, time, command, blocks) {
  const rig = athlete.userData.rig;
  if (!rig) return;
  const breath = Math.sin(time * 1.9 + (athlete.userData.bibNumber || 0)) * 0.012;
  const onMarks = /ON YOUR MARKS/i.test(command);
  const set = /^SET$/i.test(command);

  rig.torso.rotation.set(0.02 + breath, 0, 0);
  rig.pelvis.rotation.set(0, 0, 0);
  rig.headRoot.rotation.set(0, 0, 0);
  rig.leftArm.elbow.rotation.x = -0.15;
  rig.rightArm.elbow.rotation.x = -0.15;

  if (blocks && (onMarks || set)) {
    const crouch = set ? 0.82 : 0.58;
    rig.torso.rotation.x = 0.48 + crouch * 0.22;
    rig.leftLeg.hip.rotation.x = -0.76;
    rig.rightLeg.hip.rotation.x = 0.54;
    rig.leftLeg.knee.rotation.x = 1.02;
    rig.rightLeg.knee.rotation.x = 0.82;
    rig.leftArm.shoulder.rotation.x = 0.92;
    rig.rightArm.shoulder.rotation.x = 0.92;
    rig.leftArm.elbow.rotation.x = -0.38;
    rig.rightArm.elbow.rotation.x = -0.38;
    athlete.position.y += set ? -0.16 : -0.10;
    return;
  }

  if (onMarks) {
    rig.torso.rotation.x = 0.14;
    rig.leftLeg.hip.rotation.x = -0.28;
    rig.rightLeg.hip.rotation.x = 0.30;
    rig.leftLeg.knee.rotation.x = 0.28;
    rig.rightLeg.knee.rotation.x = 0.15;
    rig.leftArm.shoulder.rotation.x = 0.28;
    rig.rightArm.shoulder.rotation.x = -0.26;
  } else {
    const sway = Math.sin(time * 1.25 + (athlete.userData.bibNumber || 0) * 0.7) * 0.035;
    rig.leftLeg.hip.rotation.x = sway;
    rig.rightLeg.hip.rotation.x = -sway;
    rig.leftLeg.knee.rotation.x = 0.04;
    rig.rightLeg.knee.rotation.x = 0.04;
    rig.leftArm.shoulder.rotation.x = -sway * 1.8;
    rig.rightArm.shoulder.rotation.x = sway * 1.8;
  }
}

function arrangeLineup(athletes, time) {
  const detail = document.querySelector('#starter-detail')?.textContent || '';
  const eventName = document.querySelector('#race-event-label')?.textContent || '';
  const command = document.querySelector('#starter-command')?.textContent || '';
  const blocks = ['100m', '200m', '400m'].includes(eventName);

  athletes.forEach((athlete, index) => {
    const { course, radius } = lineupPose(index, athletes.length, detail, eventName);
    const p = stadiumPoint(course, radius);
    const ahead = stadiumPoint(course + 0.9, radius);
    athlete.position.copy(p);
    athlete.lookAt(ahead.x, p.y, ahead.z);
    setIdlePose(athlete, time, command, blocks);
  });
}

function placeOfficial(official, athletes) {
  if (!athletes.length) return;
  const p = stadiumPoint(-5.0, INNER_RADIUS + LANE_WIDTH * 8.8);
  official.position.copy(p);
  const center = athletes.reduce((sum, athlete) => sum.add(athlete.position), new THREE.Vector3()).multiplyScalar(1 / athletes.length);
  official.lookAt(center.x, official.position.y + 0.9, center.z);
}

function animateOfficial(official, time) {
  const rig = official.userData.rig;
  if (!rig) return;
  const talking = officialSpeech;
  const gesture = talking ? Math.sin(time * 5.2) : Math.sin(time * 1.1) * 0.10;
  rig.headRoot.rotation.y = talking ? Math.sin(time * 3.4) * 0.08 : Math.sin(time * 0.8) * 0.025;
  rig.headRoot.rotation.x = talking ? Math.sin(time * 4.8) * 0.035 : 0;
  rig.rightShoulder.rotation.x = talking ? -0.55 + gesture * 0.24 : -0.08;
  rig.rightShoulder.rotation.z = talking ? -0.25 + Math.cos(time * 3.1) * 0.12 : 0;
  rig.leftShoulder.rotation.x = talking ? 0.16 : 0.05;
  rig.torso.rotation.y = talking ? Math.sin(time * 2.2) * 0.025 : 0;
  rig.mouth.scale.y = talking ? 0.8 + Math.abs(Math.sin(time * 11.5)) * 1.8 : 0.7;
  rig.mouth.position.y = -0.055 - (talking ? Math.abs(Math.sin(time * 11.5)) * 0.012 : 0);
}

function forwardOf(object) {
  return new THREE.Vector3(0, 0, 1).applyQuaternion(object.quaternion).normalize();
}

function setBroadcastShot(camera, athletes, official, seconds) {
  if (!athletes.length) return;
  const shotLength = 2.35;
  const slots = athletes.length + 2;
  const slot = Math.floor(seconds / shotLength) % slots;
  const drift = (seconds % shotLength) / shotLength;

  if (slot === 0) {
    const center = athletes.reduce((sum, athlete) => sum.add(athlete.position), new THREE.Vector3()).multiplyScalar(1 / athletes.length);
    const first = athletes[0];
    const forward = forwardOf(first);
    const side = new THREE.Vector3(-forward.z, 0, forward.x);
    const pos = center.clone().addScaledVector(forward, -12 + drift * 1.4).addScaledVector(side, 9).add(new THREE.Vector3(0, 4.2, 0));
    camera.position.copy(pos);
    camera.lookAt(center.clone().add(new THREE.Vector3(0, 1.15, 0)));
    camera.fov = 47;
    camera.updateProjectionMatrix();
    return;
  }

  if (slot === slots - 1 && official.visible) {
    const forward = forwardOf(official);
    const side = new THREE.Vector3(-forward.z, 0, forward.x);
    const pos = official.position.clone().addScaledVector(forward, -3.4 + drift * 0.25).addScaledVector(side, 1.6).add(new THREE.Vector3(0, 1.7, 0));
    camera.position.copy(pos);
    camera.lookAt(official.position.clone().add(new THREE.Vector3(0, 1.25, 0)));
    camera.fov = 38;
    camera.updateProjectionMatrix();
    return;
  }

  const athlete = athletes[(slot - 1) % athletes.length];
  const forward = forwardOf(athlete);
  const side = new THREE.Vector3(-forward.z, 0, forward.x);
  const sideSign = slot % 2 ? 1 : -1;
  const pos = athlete.position.clone()
    .addScaledVector(forward, -3.1 + drift * 0.35)
    .addScaledVector(side, sideSign * 1.65)
    .add(new THREE.Vector3(0, 1.62, 0));
  camera.position.copy(pos);
  camera.lookAt(athlete.position.clone().add(new THREE.Vector3(0, 1.32, 0)));
  camera.fov = 34;
  camera.updateProjectionMatrix();
}

const originalRender = THREE.WebGLRenderer.prototype.render;
const sceneStates = new WeakMap();

if (!THREE.WebGLRenderer.prototype.__ncfaPresentationPatched) {
  Object.defineProperty(THREE.WebGLRenderer.prototype, '__ncfaPresentationPatched', { value: true });
  THREE.WebGLRenderer.prototype.render = function patchedRender(scene, camera) {
    const isMainPass = this.getRenderTarget() === null;
    if (isMainPass && scene?.isScene && camera?.isPerspectiveCamera) {
      const state = getPresentationState(scene, sceneStates);
      const preRace = isPrerace();
      const now = performance.now();
      const time = now / 1000;

      if (preRace) {
        if (!state.wasPrerace) state.introStart = now;
        const athletes = sortedAthletes(scene);
        arrangeLineup(athletes, time);
        placeOfficial(state.official, athletes);
        state.official.visible = true;
        animateOfficial(state.official, time);
        setBroadcastShot(camera, athletes, state.official, (now - state.introStart) / 1000);
      } else {
        state.official.visible = false;
      }
      state.wasPrerace = preRace;
    }
    return originalRender.call(this, scene, camera);
  };
}
