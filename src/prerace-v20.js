import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

window.__NCFA_PRERACE_V20_READY = true;

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

function preraceActive() {
  return Boolean(
    document.querySelector('#race-hud.screen--active') &&
    window.__NCFA_RACE_PHASE !== 'racing'
  );
}

function commandText() {
  return (document.querySelector('#starter-command')?.textContent || '').trim().toUpperCase();
}

function material(color, roughness = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function makeBoardTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#05070a';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#f2c318';
  ctx.fillRect(0, 0, c.width, 64);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 96px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('NCFA LIVE', 512, 222);
  ctx.fillStyle = '#f2c318';
  ctx.font = '900 52px Arial';
  ctx.fillText('COLLEGE TRACK & FIELD 27', 512, 310);
  ctx.fillStyle = '#b8c0ca';
  ctx.font = '700 34px Arial';
  ctx.fillText('MEET DAY', 512, 390);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBroadcastSet() {
  const group = new THREE.Group();
  group.name = 'NCFA V20 Prerace Stadium';

  const concrete = material(0x5b6570, 0.96);
  const dark = material(0x171c24, 0.93);
  const rail = material(0xa1a8b0, 0.60);

  for (const side of [-1, 1]) {
    for (let row = 0; row < 5; row++) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(134, 1.18, 3.0), row % 2 ? dark : concrete);
      stand.position.set(0, 0.68 + row * 1.38, side * (58.5 + row * 2.5));
      group.add(stand);
    }
    const railMesh = new THREE.Mesh(new THREE.BoxGeometry(134, 0.16, 0.16), rail);
    railMesh.position.set(0, 7.35, side * 69.5);
    group.add(railMesh);
  }

  const bodyGeo = new THREE.BoxGeometry(0.45, 0.74, 0.32);
  const headGeo = new THREE.SphereGeometry(0.17, 6, 5);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, vertexColors: true });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, vertexColors: true });
  const count = 144;
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
  const heads = new THREE.InstancedMesh(headGeo, headMat, count);
  const colors = [0xf2c318, 0xe8edf3, 0x244a79, 0x7d2834, 0x2f7045, 0x161a22, 0xc56f2d];
  const skins = [0x5f3827, 0x81543a, 0xa96f4f, 0xc88c68, 0xe0b08c, 0xf0c7aa];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const row = Math.floor(i / 28) % 5;
    const col = i % 28;
    const x = -59 + col * 4.35;
    const z = side * (59.8 + row * 2.5);
    const y = 1.9 + row * 1.38;
    dummy.position.set(x, y, z);
    dummy.rotation.y = side < 0 ? 0 : Math.PI;
    dummy.updateMatrix();
    bodies.setMatrixAt(i, dummy.matrix);
    bodies.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    dummy.position.y = y + 0.52;
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
    heads.setColorAt(i, new THREE.Color(skins[i % skins.length]));
  }
  bodies.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  group.add(bodies, heads);

  const poleMat = material(0x47515b, 0.62);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xf7f8ff, toneMapped: false });
  for (const x of [-54, 54]) {
    for (const z of [-63, 63]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 25, 6), poleMat);
      pole.position.set(x, 12.5, z);
      group.add(pole);
      const bank = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.82, 0.82), lampMat);
      bank.position.set(x, 25, z);
      group.add(bank);
    }
  }

  const bx = 42;
  const by = 17.5;
  const bz = 80;
  const yaw = Math.atan2(-bx, -bz);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(31, 17, 1.2), material(0x07090d, 0.62));
  shell.position.set(bx, by, bz);
  shell.rotation.y = yaw;
  group.add(shell);

  const normal = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(28.2, 12.1),
    new THREE.MeshBasicMaterial({ map: makeBoardTexture(), toneMapped: false })
  );
  screen.position.set(bx + normal.x * 0.64, by + 0.35, bz + normal.z * 0.64);
  screen.rotation.y = yaw;
  group.add(screen);

  for (const dx of [-8.8, 8.8]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(1.4, 15, 1.4), material(0x303741, 0.84));
    support.position.set(bx + dx, 7.0, bz);
    group.add(support);
  }

  return group;
}

function createOfficial() {
  const g = new THREE.Group();
  g.name = 'NCFA V20 Senior Starter';
  const skin = material(0xb77c58, 0.82);
  const shirt = material(0xe0e3e6, 0.72);
  const pants = material(0x13171d, 0.91);
  const grey = material(0xb8bcc1, 0.94);
  const brow = material(0x565b60, 0.96);

  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.04, 0.38), pants);
  legs.position.y = 0.54;
  g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.0, 0.45), shirt);
  torso.position.y = 1.48;
  g.add(torso);

  const headRoot = new THREE.Group();
  headRoot.position.y = 2.28;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), skin);
  headRoot.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.278, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), grey);
  hair.position.y = 0.065;
  hair.scale.y = 0.52;
  headRoot.add(hair);
  for (const side of [-1, 1]) {
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.11), grey);
    temple.position.set(side * 0.22, 0.025, -0.03);
    headRoot.add(temple);
    const browMesh = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.024, 0.02), brow);
    browMesh.position.set(side * 0.082, 0.055, -0.245);
    browMesh.rotation.z = side * -0.13;
    headRoot.add(browMesh);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.019, 0.019), material(0x53322c, 0.97));
  mouth.position.set(0, -0.08, -0.25);
  headRoot.add(mouth);
  g.add(headRoot);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.50, 1.79, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.68, 8), skin);
    arm.position.y = -0.34;
    shoulder.add(arm);
    g.add(shoulder);
    if (side > 0) g.userData.rightShoulder = shoulder;
  }
  const clipboard = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.045), material(0x3b3028, 0.92));
  clipboard.position.set(-0.56, 1.06, -0.10);
  clipboard.rotation.z = 0.10;
  g.add(clipboard);

  g.userData.headRoot = headRoot;
  g.userData.mouth = mouth;
  g.scale.setScalar(1.1);
  return g;
}

function athletesIn(scene) {
  const list = [];
  scene.traverse((o) => {
    if (o.userData?.isNCFAAthlete && o.userData?.rig && o.visible !== false) list.push(o);
  });
  return list.sort((a, b) => (a.userData.bibNumber || 0) - (b.userData.bibNumber || 0));
}

function centerOf(list) {
  return list.reduce((sum, a) => sum.add(a.position), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, list.length));
}

function forwardOf(object) {
  return new THREE.Vector3(0, 0, -1).applyQuaternion(object.quaternion).normalize();
}

function sideOf(object) {
  const f = forwardOf(object);
  return new THREE.Vector3(-f.z, 0, f.x);
}

function captureMarks(state, list) {
  for (const a of list) {
    if (!state.marks.has(a)) {
      state.marks.set(a, {
        position: a.position.clone(),
        forward: forwardOf(a).clone()
      });
    }
  }
}

function moodFor(a) {
  if (!a.userData.preRaceMood) {
    const n = (a.userData.bibNumber || 1) % 3;
    a.userData.preRaceMood = n === 0 ? 'nervous' : n === 1 ? 'tense' : 'calm';
  }
  return a.userData.preRaceMood;
}

function applyMood(a, t) {
  const r = a.userData.rig;
  if (!r) return;
  const seed = (a.userData.bibNumber || 1) * 0.71;
  const mood = moodFor(a);
  if (mood === 'nervous') {
    if (r.headRoot) r.headRoot.rotation.y = Math.sin(t * 2.7 + seed) * 0.16;
    if (r.torso) r.torso.rotation.z = Math.sin(t * 3.2 + seed) * 0.026;
  } else if (mood === 'tense') {
    if (r.headRoot) r.headRoot.rotation.x = -0.055;
    if (r.torso) r.torso.rotation.x = 0.095;
  } else {
    if (r.headRoot) r.headRoot.rotation.set(-0.015, 0, 0);
    if (r.torso) r.torso.rotation.x = 0.03 + Math.sin(t * 1.7 + seed) * 0.008;
  }
}

function applyWalkPose(a, progress, t) {
  if (progress <= 0.01 || progress >= 0.99) return;
  const r = a.userData.rig;
  if (!r) return;
  const cycle = t * 7.2 + (a.userData.bibNumber || 1) * 0.42;
  const swing = Math.sin(cycle) * 0.30;
  if (r.leftLeg?.hip) r.leftLeg.hip.rotation.x = swing;
  if (r.rightLeg?.hip) r.rightLeg.hip.rotation.x = -swing;
  if (r.leftLeg?.knee) r.leftLeg.knee.rotation.x = Math.max(0, -Math.sin(cycle)) * 0.32;
  if (r.rightLeg?.knee) r.rightLeg.knee.rotation.x = Math.max(0, Math.sin(cycle)) * 0.32;
  if (r.leftArm?.shoulder) r.leftArm.shoulder.rotation.x = -swing * 0.82;
  if (r.rightArm?.shoulder) r.rightArm.shoulder.rotation.x = swing * 0.82;
  if (r.torso) r.torso.rotation.x = 0.035;
}

function runnerProgress(state) {
  const phase = window.__NCFA_RACE_PHASE || 'presentation';
  const cmd = commandText();
  if (cmd === 'ON YOUR MARKS') {
    if (!state.onMarksAt) state.onMarksAt = performance.now();
    const raw = Math.max(0, Math.min(1, (performance.now() - state.onMarksAt) / 1400));
    return raw * raw * (3 - 2 * raw);
  }
  if (phase === 'ready' || phase === 'hold') return 1;
  state.onMarksAt = 0;
  return 0;
}

function stageRunners(state, list, t) {
  captureMarks(state, list);
  const progress = runnerProgress(state);
  for (const a of list) {
    const mark = state.marks.get(a);
    if (!mark) continue;
    const waiting = mark.position.clone().addScaledVector(mark.forward, -2.7);
    a.position.copy(waiting.lerp(mark.position, progress));
    if (progress > 0.01 && progress < 0.99) applyWalkPose(a, progress, t);
    else applyMood(a, t);
  }
}

function placeOfficial(state, list, t) {
  if (!state.official || !list.length) return;
  const c = centerOf(list);
  const f = forwardOf(list[0]);
  const s = sideOf(list[0]);
  state.official.position.copy(c.clone().addScaledVector(f, -4.2).addScaledVector(s, 5.5));
  state.official.position.y = 0.08;
  state.official.lookAt(c.x, 1.4, c.z);
  state.official.visible = true;
  const talking = officialSpeaking || /OFFICIAL|ON YOUR MARKS|SET/.test(commandText());
  state.official.userData.rightShoulder.rotation.x = talking ? -0.74 + Math.sin(t * 5.2) * 0.13 : -0.12;
  state.official.userData.rightShoulder.rotation.z = talking ? -0.22 : -0.03;
  state.official.userData.headRoot.rotation.y = talking ? Math.sin(t * 2.1) * 0.045 : 0;
  state.official.userData.mouth.scale.y = talking ? 0.72 + Math.abs(Math.sin(t * 10)) * 1.25 : 0.62;
}

function setCamera(camera, pos, target, fov = 40) {
  camera.position.copy(pos);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  camera.lookAt(target);
}

function lineupWide(camera, list, t) {
  const c = centerOf(list);
  const f = forwardOf(list[0]);
  const s = sideOf(list[0]);
  setCamera(camera, c.clone().addScaledVector(f, -6.2).addScaledVector(s, 4.8 + Math.sin(t * 0.55) * 0.5).add(new THREE.Vector3(0, 1.7, 0)), c.clone().add(new THREE.Vector3(0, 1.25, 0)), 38);
}

function lineupSide(camera, list) {
  const c = centerOf(list);
  const f = forwardOf(list[0]);
  const s = sideOf(list[0]);
  setCamera(camera, c.clone().addScaledVector(s, 7.1).addScaledVector(f, -1.0).add(new THREE.Vector3(0, 1.45, 0)), c.clone().add(new THREE.Vector3(0, 1.18, 0)), 34);
}

function closeRunner(camera, a, slot) {
  const f = forwardOf(a);
  const s = sideOf(a);
  setCamera(camera, a.position.clone().addScaledVector(f, -2.0).addScaledVector(s, slot % 2 ? 0.82 : -0.82).add(new THREE.Vector3(0, 1.6, 0)), a.position.clone().add(new THREE.Vector3(0, 1.48, 0)), 27);
}

function behindStart(camera, list) {
  const c = centerOf(list);
  const f = forwardOf(list[0]);
  setCamera(camera, c.clone().addScaledVector(f, -7.4).add(new THREE.Vector3(0, 1.85, 0)), c.clone().addScaledVector(f, 7.0).add(new THREE.Vector3(0, 1.1, 0)), 41);
}

function officialShot(camera, state) {
  const o = state.official;
  if (!o) return;
  const f = forwardOf(o);
  const s = sideOf(o);
  setCamera(camera, o.position.clone().addScaledVector(f, 2.6).addScaledVector(s, 0.9).add(new THREE.Vector3(0, 1.65, 0)), o.position.clone().add(new THREE.Vector3(0, 1.45, 0)), 27);
}

function directCamera(state, camera, list) {
  const now = performance.now();
  const elapsed = (now - state.introStart) / 1000;
  const cmd = commandText();
  const phase = window.__NCFA_RACE_PHASE || 'presentation';

  if (cmd === 'ON YOUR MARKS') {
    const age = state.onMarksAt ? (now - state.onMarksAt) / 1000 : 0;
    if (age < 0.45) officialShot(camera, state);
    else if (age < 1.05) lineupSide(camera, list);
    else behindStart(camera, list);
    return;
  }

  if (cmd === 'OFFICIAL INSTRUCTIONS' || cmd === 'SET' || officialSpeaking) {
    if ((elapsed % 2.0) < 1.6) officialShot(camera, state);
    else lineupWide(camera, list, elapsed);
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

  const cycle = elapsed % 7.6;
  if (cycle < 1.15) setCamera(camera, new THREE.Vector3(18 + Math.sin(elapsed * 0.35) * 6, 11.5, 92), new THREE.Vector3(0, 1.8, 0), 44);
  else if (cycle < 2.20) setCamera(camera, new THREE.Vector3(-39 + Math.sin(elapsed * 0.45) * 8, 4.2, 48), new THREE.Vector3(-15 + Math.sin(elapsed * 0.35) * 8, 3.7, 61), 30);
  else if (cycle < 3.05) setCamera(camera, new THREE.Vector3(20, 14.5, 53), new THREE.Vector3(42, 17.5, 80), 29);
  else if (cycle < 3.95) setCamera(camera, new THREE.Vector3(58, 4.6, -36 + Math.sin(elapsed * 0.45) * 5), new THREE.Vector3(18, 1.2, 2), 39);
  else if (cycle < 5.05) lineupWide(camera, list, elapsed);
  else if (cycle < 6.0) closeRunner(camera, list[0], 1);
  else if (cycle < 6.85) closeRunner(camera, list[Math.min(2, list.length - 1)], 2);
  else lineupSide(camera, list);
}

const sceneStates = new WeakMap();

function stateFor(scene) {
  let state = sceneStates.get(scene);
  if (!state) {
    const set = createBroadcastSet();
    const official = createOfficial();
    scene.add(set, official);
    state = {
      set,
      official,
      marks: new WeakMap(),
      introStart: performance.now(),
      onMarksAt: 0,
      wasPrerace: false
    };
    sceneStates.set(scene, state);
  }
  return state;
}

const proto = THREE.WebGLRenderer.prototype;
if (!proto.__ncfaPreraceV20) {
  Object.defineProperty(proto, '__ncfaPreraceV20', { value: true });
  const previousRender = proto.render;

  proto.render = function ncfaPreraceRender(scene, camera) {
    const mainPass = this.getRenderTarget?.() === null;
    if (mainPass && scene?.isScene && camera?.isPerspectiveCamera) {
      const state = stateFor(scene);
      const active = preraceActive();
      state.set.visible = active;
      state.official.visible = active;

      if (active) {
        if (!state.wasPrerace) {
          state.introStart = performance.now();
          state.onMarksAt = 0;
          state.marks = new WeakMap();
        }
        state.wasPrerace = true;
        const list = athletesIn(scene);
        if (list.length) {
          const t = performance.now() / 1000;
          stageRunners(state, list, t);
          placeOfficial(state, list, t);
          directCamera(state, camera, list);
        }
      } else {
        state.wasPrerace = false;
      }
    }

    return previousRender.call(this, scene, camera);
  };
}
