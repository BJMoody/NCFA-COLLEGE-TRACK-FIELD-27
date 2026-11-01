import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { EVENTS, EVENT_STARTS } from './data.js';

export const STRAIGHT = 84.39;
export const BASE_RADIUS = 36.80;
export const LAP = 2 * STRAIGHT + 2 * Math.PI * BASE_RADIUS;
export const LANE_WIDTH = 1.22;
export const INNER_RADIUS = BASE_RADIUS - 1.7;
export const OUTER_RADIUS = INNER_RADIUS + LANE_WIDTH * 8.6;
export const TRACK_Y = 0.08;
export const CHUTE_Z = -(OUTER_RADIUS + 5.4);
export const FINISH_COURSE = STRAIGHT;

const modLap = (v) => ((v % LAP) + LAP) % LAP;

export function eventStartBase(eventName) {
  const distance = Number(EVENTS[eventName]?.distance || 0);
  return modLap(FINISH_COURSE - distance);
}

export function stadiumPoint(metres, radius = BASE_RADIUS) {
  let d = modLap(metres);
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

function ribbon(inner, outer, color, segments = 180) {
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segments; i++) {
    const d = (i / segments) * LAP;
    const a = stadiumPoint(d, inner);
    const b = stadiumPoint(d, outer);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    if (i < segments) {
      const n = i * 2;
      indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.76 }));
  mesh.receiveShadow = true;
  return mesh;
}

function addLaneLines(group) {
  const mat = new THREE.LineBasicMaterial({ color: 0xf8f8f5, transparent: true, opacity: 0.82 });
  for (let lane = 0; lane <= 8; lane++) {
    const radius = INNER_RADIUS + lane * LANE_WIDTH;
    const pts = [];
    for (let i = 0; i < 150; i++) pts.push(stadiumPoint((i / 150) * LAP, radius));
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
    line.position.y = 0.035;
    group.add(line);
  }
}

function addChute(group, trackColor) {
  const chute = new THREE.Mesh(new THREE.PlaneGeometry(110, LANE_WIDTH * 8), new THREE.MeshStandardMaterial({ color: trackColor, roughness: 0.76 }));
  chute.rotation.x = -Math.PI / 2;
  chute.position.set(0, TRACK_Y - 0.018, CHUTE_Z);
  group.add(chute);
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let lane = 0; lane <= 8; lane++) {
    const z = CHUTE_Z - LANE_WIDTH * 4 + lane * LANE_WIDTH;
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-55, TRACK_Y + 0.03, z), new THREE.Vector3(55, TRACK_Y + 0.03, z)
    ]), mat));
  }
}

function addEventMarks(group) {
  const mk = (color) => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.98 });
  for (const [event, color] of [['200m', 0xffffff], ['400m', 0xe6efff], ['800m', 0x54e77d]]) {
    const cfg = EVENT_STARTS[event];
    if (!cfg) continue;
    const base = eventStartBase(event);
    for (let lane = 1; lane <= 8; lane++) {
      const course = base + (lane - 1) * (cfg.stagger || 0);
      const inner = INNER_RADIUS + (lane - 1) * LANE_WIDTH + 0.08;
      const outer = inner + LANE_WIDTH - 0.16;
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        stadiumPoint(course, inner), stadiumPoint(course, outer)
      ]), mk(color)));
    }
  }
  for (const event of ['800m', '1500m', '3000m', '5000m', '10000m']) {
    const base = eventStartBase(event);
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const laneFloat = 0.65 + t * 7.7;
      pts.push(stadiumPoint(base + t * 4.2, INNER_RADIUS + laneFloat * LANE_WIDTH));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mk(event === '800m' ? 0x54e77d : 0xffffff)));
  }
}

function addFinish(group) {
  const finish = stadiumPoint(FINISH_COURSE, INNER_RADIUS + LANE_WIDTH * 4.3);
  const before = stadiumPoint(FINISH_COURSE - 0.5, INNER_RADIUS + LANE_WIDTH * 4.3);
  const after = stadiumPoint(FINISH_COURSE + 0.5, INNER_RADIUS + LANE_WIDTH * 4.3);
  const tangent = after.clone().sub(before).normalize();
  const line = new THREE.Mesh(new THREE.PlaneGeometry(OUTER_RADIUS - INNER_RADIUS, 0.72), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = Math.atan2(tangent.z, tangent.x) + Math.PI / 2;
  line.position.set(finish.x, TRACK_Y + 0.045, finish.z);
  group.add(line);
}

function addStands(group, venue, lowPower) {
  const rows = lowPower ? 5 : 7;
  const width = lowPower ? 118 : 142;
  const concrete = new THREE.MeshStandardMaterial({ color: 0x59616c, roughness: 0.96 });
  const dark = new THREE.MeshStandardMaterial({ color: venue.theme === 'blue' ? 0x18345a : 0x171c24, roughness: 0.9 });
  for (const side of [-1, 1]) {
    for (let row = 0; row < rows; row++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(width, 1.15, 2.5), row % 2 ? dark : concrete);
      step.position.set(0, 0.65 + row * 1.3, side * (59 + row * 2.2));
      step.receiveShadow = true;
      group.add(step);
    }
  }
}

function addCrowd(group, lowPower) {
  const count = lowPower ? 72 : 180;
  const bodyGeo = new THREE.CylinderGeometry(0.22, 0.27, 0.7, 5);
  const headGeo = new THREE.SphereGeometry(0.18, 6, 5);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, vertexColors: true });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, vertexColors: true });
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
  const heads = new THREE.InstancedMesh(headGeo, headMat, count);
  const colors = [0xf2c318, 0xf2f2f2, 0x254c80, 0x7c2933, 0x2f7045, 0x161a22];
  const skins = [0x5f3827, 0x81543a, 0xa96f4f, 0xc88c68, 0xe0b08c];
  const dummy = new THREE.Object3D();
  const base = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const row = Math.floor(i / 28) % (lowPower ? 4 : 6);
    const col = i % 28;
    const x = -60 + col * 4.5;
    const z = side * (60 + row * 2.2);
    const y = 1.9 + row * 1.3;
    const phase = Math.random() * Math.PI * 2;
    base.push({ x, y, z, side, phase });
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
  group.add(bodies, heads);
  let reaction = 'idle';
  function update(time) {
    if (lowPower && Math.floor(time * 8) % 2) return;
    for (let i = 0; i < count; i++) {
      const b = base[i];
      const amp = reaction === 'win' ? 0.32 : reaction === 'mid' ? 0.06 : reaction === 'loss' ? 0.01 : 0.02;
      const bounce = Math.abs(Math.sin(time * (reaction === 'win' ? 8 : 1.8) + b.phase)) * amp;
      dummy.position.set(b.x, b.y + bounce, b.z);
      dummy.rotation.y = b.side < 0 ? 0 : Math.PI;
      dummy.updateMatrix();
      bodies.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.52;
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
    }
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  }
  return { bodies, heads, count, setReaction(v) { reaction = v; }, update };
}

function makeClockTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 180;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  function draw(time = '0:00.00', event = 'NCFA') {
    ctx.fillStyle = '#080b10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f2c318';
    ctx.font = '900 42px Arial';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(event).toUpperCase(), 42, 90);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    ctx.font = '900 88px Arial';
    ctx.fillText(time, 982, 92);
    ctx.textAlign = 'left';
    texture.needsUpdate = true;
  }
  draw();
  return { texture, draw };
}

function addVideoBoard(group) {
  const x = 42, y = 17.5, z = 80;
  const yaw = Math.atan2(-x, -z);
  const normal = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const shell = new THREE.Mesh(new THREE.BoxGeometry(30, 16, 1.1), new THREE.MeshStandardMaterial({ color: 0x080b10, roughness: 0.62 }));
  shell.position.set(x, y, z); shell.rotation.y = yaw; group.add(shell);
  const material = new THREE.MeshBasicMaterial({ color: 0x122734, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(27, 11.2), material);
  screen.position.set(x + normal.x * 0.62, y + 0.6, z + normal.z * 0.62); screen.rotation.y = yaw; group.add(screen);
  const supportMat = new THREE.MeshStandardMaterial({ color: 0x303741, roughness: 0.84 });
  for (const dx of [-8.5, 8.5]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(1.4, 14, 1.4), supportMat);
    support.position.set(x + dx, 7, z); group.add(support);
  }
  const clock = makeClockTexture();
  const clockPanel = new THREE.Mesh(new THREE.PlaneGeometry(23.5, 2.6), new THREE.MeshBasicMaterial({ map: clock.texture, toneMapped: false }));
  clockPanel.position.set(x + normal.x * 0.66, y + 4.7, z + normal.z * 0.66); clockPanel.rotation.y = yaw; group.add(clockPanel);
  return { shell, screen, material, clockPanel, clock };
}

function addLights(group, lowPower) {
  const poles = lowPower ? [-52, 52] : [-62, -20, 20, 62];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x4c5560, metalness: 0.5, roughness: 0.5 });
  const bankMat = new THREE.MeshBasicMaterial({ color: 0xf4f7ff, toneMapped: false });
  for (const x of poles) for (const z of [-58, 58]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 26, 7), poleMat); pole.position.set(x, 13, z); group.add(pole);
    const bank = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.8, 0.8), bankMat); bank.position.set(x, 26, z); group.add(bank);
  }
}

export function createWorld(scene, venue) {
  const touch = navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
  const lowPower = document.documentElement.classList.contains('ncfa-low-power') || touch;
  const group = new THREE.Group();
  group.name = `venue-fast-${venue.id}`;
  scene.add(group);

  const grass = new THREE.Mesh(new THREE.PlaneGeometry(330, 230), new THREE.MeshStandardMaterial({ color: 0x315d36, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2; grass.position.y = -0.04; group.add(grass);
  group.add(ribbon(INNER_RADIUS, OUTER_RADIUS, venue.track, lowPower ? 120 : 180));
  const apron = ribbon(OUTER_RADIUS, OUTER_RADIUS + 2.4, 0x343b44, lowPower ? 100 : 150); apron.position.y = -0.012; group.add(apron);
  const infield = new THREE.Mesh(new THREE.PlaneGeometry(122, 54), new THREE.MeshStandardMaterial({ color: 0x3d783f, roughness: 1 }));
  infield.rotation.x = -Math.PI / 2; infield.position.y = 0.018; group.add(infield);

  addLaneLines(group);
  addChute(group, venue.track);
  addEventMarks(group);
  addFinish(group);
  addStands(group, venue, lowPower);
  const crowd = addCrowd(group, lowPower);
  const videoBoard = addVideoBoard(group);
  addLights(group, lowPower);

  return {
    group, crowd, videoBoard, venue,
    setBroadcastTexture(texture) {
      videoBoard.material.map = texture;
      videoBoard.material.color.set(0xffffff);
      videoBoard.material.needsUpdate = true;
    },
    setBroadcastClock(time, event) { videoBoard.clock.draw(time, event); },
    setCrowdReaction(mode) { crowd.setReaction(mode); },
    update(time) { crowd.update(time); },
    dispose() {
      scene.remove(group);
      group.traverse((obj) => {
        obj.geometry?.dispose?.();
        const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
        mats.forEach((m) => m.dispose?.());
      });
      videoBoard.clock.texture.dispose();
    }
  };
}
