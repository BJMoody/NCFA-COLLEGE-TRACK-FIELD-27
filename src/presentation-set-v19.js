import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

window.__NCFA_PRESENTATION_SET_V19_READY = true;

const trackedAthletes = new Set();
let broadcastSet = null;
let fallbackOfficial = null;
let capturedScene = null;

function preraceVisible() {
  return Boolean(
    document.querySelector('#race-hud.screen--active') &&
    window.__NCFA_RACE_PHASE !== 'racing'
  );
}

function material(color, roughness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function makeBoardTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#07090d';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#f2c318';
  ctx.fillRect(0, 0, c.width, 58);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 92px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('NCFA LIVE', 512, 220);
  ctx.fillStyle = '#f2c318';
  ctx.font = '900 54px Arial';
  ctx.fillText('COLLEGE TRACK & FIELD 27', 512, 305);
  ctx.fillStyle = '#aeb7c4';
  ctx.font = '700 34px Arial';
  ctx.fillText('MEET DAY', 512, 385);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBroadcastSet() {
  const group = new THREE.Group();
  group.name = 'NCFA Prerace Broadcast Stadium Set';
  group.userData.ncfaPreraceSet = true;

  const concrete = material(0x59616c, 0.96);
  const dark = material(0x151a22, 0.92);
  const rail = material(0x9aa2ab, 0.58);

  for (const side of [-1, 1]) {
    for (let row = 0; row < 5; row++) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(132, 1.15, 2.8), row % 2 ? dark : concrete);
      stand.position.set(0, 0.65 + row * 1.35, side * (58 + row * 2.45));
      group.add(stand);
    }
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(132, 0.16, 0.16), rail);
    topRail.position.set(0, 7.2, side * 69.2);
    group.add(topRail);
  }

  const bodyGeo = new THREE.BoxGeometry(0.44, 0.74, 0.31);
  const headGeo = new THREE.SphereGeometry(0.17, 6, 5);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, vertexColors: true });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, vertexColors: true });
  const count = 120;
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
  const heads = new THREE.InstancedMesh(headGeo, headMat, count);
  const dummy = new THREE.Object3D();
  const colors = [0xf2c318, 0xe8edf3, 0x244a79, 0x7d2834, 0x2f7045, 0x161a22];
  const skins = [0x5f3827, 0x81543a, 0xa96f4f, 0xc88c68, 0xe0b08c, 0xf0c7aa];

  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const row = Math.floor(i / 24) % 5;
    const col = i % 24;
    const x = -52 + col * 4.5;
    const z = side * (59.3 + row * 2.45);
    const y = 1.85 + row * 1.35;
    dummy.position.set(x, y, z);
    dummy.rotation.y = side < 0 ? 0 : Math.PI;
    dummy.updateMatrix();
    bodies.setMatrixAt(i, dummy.matrix);
    bodies.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    dummy.position.y = y + 0.51;
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
    heads.setColorAt(i, new THREE.Color(skins[i % skins.length]));
  }
  bodies.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  bodies.instanceColor.needsUpdate = true;
  heads.instanceColor.needsUpdate = true;
  group.add(bodies, heads);

  const poleMat = material(0x48515b, 0.62);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xf7f8ff, toneMapped: false });
  for (const x of [-52, 52]) {
    for (const z of [-62, 62]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 24, 6), poleMat);
      pole.position.set(x, 12, z);
      group.add(pole);
      const bank = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.8, 0.8), lampMat);
      bank.position.set(x, 24, z);
      group.add(bank);
    }
  }

  const boardX = 42;
  const boardY = 17.5;
  const boardZ = 80;
  const yaw = Math.atan2(-boardX, -boardZ);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(31, 17, 1.2), material(0x07090d, 0.62));
  shell.position.set(boardX, boardY, boardZ);
  shell.rotation.y = yaw;
  group.add(shell);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(28.2, 12.1),
    new THREE.MeshBasicMaterial({ map: makeBoardTexture(), toneMapped: false })
  );
  const normal = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  screen.position.set(boardX + normal.x * 0.64, boardY + 0.35, boardZ + normal.z * 0.64);
  screen.rotation.y = yaw;
  group.add(screen);

  for (const dx of [-8.7, 8.7]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(1.4, 15, 1.4), material(0x303741, 0.84));
    support.position.set(boardX + dx, 7.0, boardZ);
    group.add(support);
  }

  return group;
}

function createFallbackOfficial() {
  const g = new THREE.Group();
  g.name = 'NCFA Visible Senior Starter';
  g.userData.ncfaFallbackOfficial = true;

  const skin = material(0xb77c58, 0.82);
  const shirt = material(0xe0e3e6, 0.72);
  const pants = material(0x13171d, 0.91);
  const grey = material(0xb8bcc1, 0.94);

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
  g.userData.headRoot = headRoot;
  g.scale.setScalar(1.07);
  g.visible = false;
  return g;
}

function activeAthletes() {
  return [...trackedAthletes]
    .filter((a) => a?.parent && a.visible !== false)
    .sort((a, b) => (a.userData?.bibNumber || 0) - (b.userData?.bibNumber || 0));
}

function centerOf(list) {
  return list.reduce((sum, a) => sum.add(a.position), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, list.length));
}

function forwardOf(object) {
  return new THREE.Vector3(0, 0, -1).applyQuaternion(object.quaternion).normalize();
}

function updateFallbackOfficial() {
  if (!fallbackOfficial || !capturedScene) return;
  const list = activeAthletes();
  const visible = preraceVisible() && list.length > 0;
  fallbackOfficial.visible = visible;
  if (!visible) return;

  const center = centerOf(list);
  const f = forwardOf(list[0]);
  const side = new THREE.Vector3(-f.z, 0, f.x);
  fallbackOfficial.position.copy(center.clone().addScaledVector(f, -4.3).addScaledVector(side, 5.8));
  fallbackOfficial.position.y = 0.08;
  fallbackOfficial.lookAt(center.x, 1.35, center.z);

  const command = (document.querySelector('#starter-command')?.textContent || '').toUpperCase();
  const talking = /OFFICIAL|ON YOUR MARKS|SET/.test(command);
  const t = performance.now() / 1000;
  fallbackOfficial.userData.rightShoulder.rotation.x = talking ? -0.72 + Math.sin(t * 5.2) * 0.13 : -0.12;
  fallbackOfficial.userData.rightShoulder.rotation.z = talking ? -0.22 : -0.03;
  fallbackOfficial.userData.headRoot.rotation.y = talking ? Math.sin(t * 2.1) * 0.045 : 0;
}

function ensureSceneSet(scene) {
  if (scene.userData.ncfaPresentationSetV19) return;
  scene.userData.ncfaPresentationSetV19 = true;
  capturedScene = scene;
  broadcastSet = createBroadcastSet();
  fallbackOfficial = createFallbackOfficial();
  previousAdd.call(scene, broadcastSet, fallbackOfficial);

  const priorBeforeRender = scene.onBeforeRender;
  scene.onBeforeRender = function ncfaSetVisibility(renderer, renderedScene, camera, geometry, material, group) {
    priorBeforeRender?.call?.(this, renderer, renderedScene, camera, geometry, material, group);
    const show = preraceVisible();
    if (broadcastSet) broadcastSet.visible = show;
    updateFallbackOfficial();
  };
}

const previousAdd = THREE.Object3D.prototype.add;
if (!THREE.Object3D.prototype.__ncfaPresentationSetV19) {
  Object.defineProperty(THREE.Object3D.prototype, '__ncfaPresentationSetV19', { value: true });
  THREE.Object3D.prototype.add = function ncfaPresentationSetCapture(...objects) {
    const result = previousAdd.apply(this, objects);
    if (this.isScene) ensureSceneSet(this);
    for (const object of objects) {
      if (object?.userData?.isNCFAAthlete) trackedAthletes.add(object);
    }
    return result;
  };
}
