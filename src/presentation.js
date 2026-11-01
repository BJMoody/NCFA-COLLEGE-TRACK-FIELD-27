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

  const skin = mat(0x9b6749, 0.8);
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

function placeOfficial(official, athletes) {
  if (!athletes.length) return;
  const center = athletes.reduce((sum, athlete) => sum.add(athlete.position), new THREE.Vector3()).multiplyScalar(1 / athletes.length);
  const lead = athletes[0];
  const forward = forwardOf(lead);
  const side = new THREE.Vector3(-forward.z, 0, forward.x);
  official.position.copy(center.clone().addScaledVector(forward, -5.2).addScaledVector(side, 7.6));
  official.position.y = 0.08;
  official.lookAt(center.x, 1.1, center.z);
}

function animateOfficial(official, time) {
  const rig = official.userData.rig;
  if (!rig) return;
  const talking = officialSpeech;
  const gesture = talking ? Math.sin(time * 5.2) : Math.sin(time * 1.1) * 0.10;
  rig.headRoot.rotation.y = talking ? Math.sin(time * 3.4) * 0.08 : Math.sin(time * 0.8) * 0.025;
  rig.headRoot.rotation.x = talking ? Math.sin(time * 4.8) * 0.035 : 0;
  rig.rightShoulder.rotation.x = talking ? -0.62 + gesture * 0.28 : -0.08;
  rig.rightShoulder.rotation.z = talking ? -0.30 + Math.cos(time * 3.1) * 0.14 : 0;
  rig.leftShoulder.rotation.x = talking ? 0.18 : 0.05;
  rig.torso.rotation.y = talking ? Math.sin(time * 2.2) * 0.035 : 0;
  rig.mouth.scale.y = talking ? 0.8 + Math.abs(Math.sin(time * 11.5)) * 2.0 : 0.7;
  rig.mouth.position.y = -0.055 - (talking ? Math.abs(Math.sin(time * 11.5)) * 0.012 : 0);
}

function setPreRaceShot(camera, athletes, official, seconds) {
  if (!athletes.length) return;

  if (officialSpeech && official.visible) {
    const f = forwardOf(official);
    const side = new THREE.Vector3(-f.z, 0, f.x);
    camera.position.copy(official.position.clone().addScaledVector(f, -3.3).addScaledVector(side, 1.5).add(new THREE.Vector3(0, 1.75, 0)));
    camera.lookAt(official.position.clone().add(new THREE.Vector3(0, 1.22, 0)));
    camera.fov = 36;
    camera.updateProjectionMatrix();
    return;
  }

  const shotLength = 2.15;
  const slots = athletes.length + 1;
  const slot = Math.floor(seconds / shotLength) % slots;
  const drift = (seconds % shotLength) / shotLength;

  if (slot === 0) {
    const center = athletes.reduce((sum, athlete) => sum.add(athlete.position), new THREE.Vector3()).multiplyScalar(1 / athletes.length);
    const f = forwardOf(athletes[0]);
    const side = new THREE.Vector3(-f.z, 0, f.x);
    camera.position.copy(center.clone().addScaledVector(f, -13 + drift).addScaledVector(side, 8.5).add(new THREE.Vector3(0, 4.4, 0)));
    camera.lookAt(center.clone().add(new THREE.Vector3(0, 1.15, 0)));
    camera.fov = 46;
    camera.updateProjectionMatrix();
    return;
  }

  const athlete = athletes[(slot - 1) % athletes.length];
  const f = forwardOf(athlete);
  const side = new THREE.Vector3(-f.z, 0, f.x);
  const sign = slot % 2 ? 1 : -1;
  camera.position.copy(athlete.position.clone().addScaledVector(f, -3.0 + drift * 0.28).addScaledVector(side, sign * 1.6).add(new THREE.Vector3(0, 1.62, 0)));
  camera.lookAt(athlete.position.clone().add(new THREE.Vector3(0, 1.25, 0)));
  camera.fov = 34;
  camera.updateProjectionMatrix();
}

const originalRender = THREE.WebGLRenderer.prototype.render;
const sceneStates = new WeakMap();

if (!THREE.WebGLRenderer.prototype.__ncfaPresentationV2) {
  Object.defineProperty(THREE.WebGLRenderer.prototype, '__ncfaPresentationV2', { value: true });
  THREE.WebGLRenderer.prototype.render = function patchedPresentation(scene, camera) {
    const mainPass = this.getRenderTarget() === null;
    if (mainPass && scene?.isScene && camera?.isPerspectiveCamera) {
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
