import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

export const STRAIGHT = 84.39;
export const BASE_RADIUS = 36.80;
export const LAP = 2 * STRAIGHT + 2 * Math.PI * BASE_RADIUS;
export const LANE_WIDTH = 1.22;
export const INNER_RADIUS = BASE_RADIUS - 1.7;
export const OUTER_RADIUS = INNER_RADIUS + LANE_WIDTH * 8.6;
export const TRACK_Y = 0.08;

export function stadiumPoint(metres, radius = BASE_RADIUS) {
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

function ribbon(inner, outer, color, roughness = 0.82) {
  const segments = 420;
  const positions = [];
  const indices = [];
  const uvs = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const d = t * LAP;
    const a = stadiumPoint(d, inner);
    const b = stadiumPoint(d, outer);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    uvs.push(t * 10, 0, t * 10, 1);
    if (i < segments) {
      const n = i * 2;
      indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  const m = new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: 0.03, clearcoatRoughness: 0.8 });
  const mesh = new THREE.Mesh(g, m);
  mesh.receiveShadow = true;
  return mesh;
}

function trackLine(radius, color = 0xf5f1e8, opacity = 0.84) {
  const pts = [];
  for (let i = 0; i < 420; i++) pts.push(stadiumPoint((i / 420) * LAP, radius));
  const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  line.position.y = 0.035;
  return line;
}

function createCrowd(world) {
  const count = 920;
  const bodyGeo = new THREE.CylinderGeometry(0.23, 0.27, 0.72, 5);
  const headGeo = new THREE.SphereGeometry(0.18, 6, 5);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, vertexColors: true });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, vertexColors: true });
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
  const heads = new THREE.InstancedMesh(headGeo, headMat, count);
  const dummy = new THREE.Object3D();
  const colors = [0xf1c40f, 0xf1f1f1, 0x334f7c, 0x812f36, 0x3e7649, 0x151a20, 0xd98032];
  const skin = [0x5f3827, 0x81543a, 0xa96f4f, 0xc88c68, 0xe0b08c];
  let index = 0;
  for (const side of [-1, 1]) {
    for (let row = 0; row < 10 && index < count; row++) {
      const rowCount = 46;
      for (let i = 0; i < rowCount && index < count; i++, index++) {
        const x = -67 + i * 3.0 + (Math.random() - 0.5) * 0.45;
        const z = side * (59 + row * 2.25);
        const y = 2.0 + row * 1.42 + Math.random() * 0.18;
        dummy.position.set(x, y, z);
        dummy.rotation.y = side < 0 ? 0 : Math.PI;
        dummy.scale.setScalar(0.92 + Math.random() * 0.16);
        dummy.updateMatrix();
        bodies.setMatrixAt(index, dummy.matrix);
        bodies.setColorAt(index, new THREE.Color(colors[(Math.random() * colors.length) | 0]));
        dummy.position.y += 0.52;
        dummy.updateMatrix();
        heads.setMatrixAt(index, dummy.matrix);
        heads.setColorAt(index, new THREE.Color(skin[(Math.random() * skin.length) | 0]));
      }
    }
  }
  bodies.castShadow = false;
  heads.castShadow = false;
  world.add(bodies, heads);
}

function addStands(world) {
  const concrete = new THREE.MeshStandardMaterial({ color: 0x5b6068, roughness: 0.96 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1e242d, roughness: 0.9 });
  for (const side of [-1, 1]) {
    for (let row = 0; row < 10; row++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(145, 1.35, 2.5), row % 2 ? dark : concrete);
      step.position.set(0, 0.72 + row * 1.42, side * (59 + row * 2.25));
      step.castShadow = true;
      step.receiveShadow = true;
      world.add(step);
    }
  }
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x161a20, metalness: 0.4, roughness: 0.58 });
  for (const side of [-1, 1]) {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(154, 0.7, 14), roofMat);
    roof.position.set(0, 18.0, side * 83);
    roof.castShadow = true;
    world.add(roof);
  }
}

function addScoreboard(world) {
  const shell = new THREE.Mesh(new THREE.BoxGeometry(26, 13, 1.4), new THREE.MeshStandardMaterial({ color: 0x14191f, metalness: 0.2, roughness: 0.72 }));
  shell.position.set(72, 13, 0);
  shell.castShadow = true;
  world.add(shell);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(22.5, 9.4), new THREE.MeshBasicMaterial({ color: 0x0e2734 }));
  screen.position.set(71.28, 13, 0);
  screen.rotation.y = -Math.PI / 2;
  world.add(screen);
  const support = new THREE.Mesh(new THREE.BoxGeometry(2.4, 11, 2.4), new THREE.MeshStandardMaterial({ color: 0x333a43, roughness: 0.8 }));
  support.position.set(72, 6, 0);
  world.add(support);
}

function addLights(world) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x555d66, metalness: 0.55, roughness: 0.5 });
  for (const x of [-64, -22, 22, 64]) {
    for (const z of [-58, 58]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 28, 10), poleMat);
      pole.position.set(x, 14, z);
      pole.castShadow = true;
      world.add(pole);
      const bank = new THREE.Mesh(new THREE.BoxGeometry(7, 1.1, 1.2), new THREE.MeshStandardMaterial({ color: 0xdadfe4, emissive: 0xb9cbe0, emissiveIntensity: 0.2 }));
      bank.position.set(x, 28, z);
      world.add(bank);
    }
  }
}

function addStartFinish(world) {
  const finish = stadiumPoint(0, INNER_RADIUS + LANE_WIDTH * 4.3);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(OUTER_RADIUS - INNER_RADIUS, 0.72), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = Math.PI / 2;
  line.position.set(finish.x, TRACK_Y + 0.045, finish.z);
  world.add(line);
  for (let lane = 1; lane <= 8; lane++) {
    const stagger = (lane - 1) * Math.PI * LANE_WIDTH;
    const p = stadiumPoint(stagger, INNER_RADIUS + (lane - 0.5) * LANE_WIDTH);
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.08), new THREE.MeshBasicMaterial({ color: 0xf5f1e8, side: THREE.DoubleSide }));
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(p.x, TRACK_Y + 0.05, p.z);
    world.add(mark);
  }
}

export function createWorld(scene) {
  const world = new THREE.Group();
  scene.add(world);

  const grass = new THREE.Mesh(new THREE.PlaneGeometry(420, 290, 1, 1), new THREE.MeshStandardMaterial({ color: 0x315d36, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.04;
  grass.receiveShadow = true;
  world.add(grass);

  world.add(ribbon(INNER_RADIUS, OUTER_RADIUS, 0x9d2c31));
  const apron = ribbon(OUTER_RADIUS, OUTER_RADIUS + 3.0, 0x3f454d, 0.95);
  apron.position.y = -0.015;
  world.add(apron);
  for (let lane = 0; lane <= 8; lane++) world.add(trackLine(INNER_RADIUS + lane * LANE_WIDTH));

  const infield = new THREE.Mesh(new THREE.PlaneGeometry(126, 56), new THREE.MeshStandardMaterial({ color: 0x3f793f, roughness: 1 }));
  infield.rotation.x = -Math.PI / 2;
  infield.position.y = 0.02;
  infield.receiveShadow = true;
  world.add(infield);

  addStands(world);
  createCrowd(world);
  addScoreboard(world);
  addLights(world);
  addStartFinish(world);

  return world;
}
