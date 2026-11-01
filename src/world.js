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
// Finish at the end of the home straight so 200/400/800 starts naturally fall on bends.
export const FINISH_COURSE = STRAIGHT;

function modLap(value) {
  return ((value % LAP) + LAP) % LAP;
}

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

function trackRibbon(inner, outer, color) {
  const segments = 420;
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
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshPhysicalMaterial({ color, roughness: 0.76, clearcoat: 0.04, clearcoatRoughness: 0.72 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

function makeSign(text, fg = '#ffffff', bg = '#11151c') {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = fg;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = '900 92px Arial';
  x.fillText(text.toUpperCase().slice(0, 20), 512, 128);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCrowd(world, venue) {
  const mobile = matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  const count = mobile ? 360 : 920;
  const bodyGeo = new THREE.CylinderGeometry(0.22, 0.27, 0.7, 5);
  const headGeo = new THREE.SphereGeometry(0.18, 6, 5);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, vertexColors: true });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, vertexColors: true });
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
  const heads = new THREE.InstancedMesh(headGeo, headMat, count);
  bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const colors = [0xf1c40f, 0xf2f2f2, 0x334f7c, 0x812f36, 0x3e7649, 0x151a20, 0xd98032];
  const skin = [0x5f3827, 0x81543a, 0xa96f4f, 0xc88c68, 0xe0b08c];
  const base = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const local = Math.floor(i / 2);
    const rows = mobile ? 7 : 10;
    const row = local % rows;
    const col = Math.floor(local / rows);
    const x = -70 + (col % 48) * 3.0 + (Math.random() - 0.5) * 0.5;
    const z = side * (59 + row * 2.25);
    const y = 2.0 + row * 1.42 + Math.random() * 0.15;
    const scale = 0.9 + Math.random() * 0.18;
    const phase = Math.random() * Math.PI * 2;
    base.push({ x, y, z, side, scale, phase });
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, side < 0 ? 0 : Math.PI, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    bodies.setMatrixAt(i, dummy.matrix);
    bodies.setColorAt(i, new THREE.Color(colors[(Math.random() * colors.length) | 0]));
    dummy.position.y = y + 0.52;
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
    heads.setColorAt(i, new THREE.Color(skin[(Math.random() * skin.length) | 0]));
  }
  world.add(bodies, heads);
  let reaction = 'idle';
  function setReaction(next) { reaction = next; }
  function update(time) {
    if (reaction === 'idle' && Math.floor(time * 10) % 3) return;
    for (let i = 0; i < count; i++) {
      const b = base[i];
      let bounce = 0, tilt = 0, scaleY = 1;
      if (reaction === 'win') { bounce = Math.abs(Math.sin(time * 8 + b.phase)) * 0.42; tilt = Math.sin(time * 5 + b.phase) * 0.16; scaleY = 1.06; }
      else if (reaction === 'mid') { bounce = Math.abs(Math.sin(time * 2.3 + b.phase)) * 0.045; tilt = Math.sin(time * 1.4 + b.phase) * 0.025; }
      else if (reaction === 'loss') { bounce = -0.08; tilt = Math.sin(b.phase) * 0.09; scaleY = 0.92; }
      else bounce = Math.abs(Math.sin(time * 1.6 + b.phase)) * 0.025;
      dummy.position.set(b.x, b.y + bounce, b.z);
      dummy.rotation.set(0, b.side < 0 ? 0 : Math.PI, tilt);
      dummy.scale.set(b.scale, b.scale * scaleY, b.scale);
      dummy.updateMatrix();
      bodies.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 0.52 * scaleY;
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
    }
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  }
  return { bodies, heads, setReaction, update, count, venue };
}

function addStands(world, venue) {
  const concrete = new THREE.MeshStandardMaterial({ color: 0x5b6068, roughness: 0.96 });
  const dark = new THREE.MeshStandardMaterial({ color: venue.theme === 'blue' ? 0x1a3559 : 0x1e242d, roughness: 0.9 });
  for (const side of [-1, 1]) for (let row = 0; row < 10; row++) {
    const width = venue.roof === 'compact' ? 126 : 150;
    const step = new THREE.Mesh(new THREE.BoxGeometry(width, 1.35, 2.5), row % 2 ? dark : concrete);
    step.position.set(0, 0.72 + row * 1.42, side * (59 + row * 2.25));
    step.castShadow = row < 5;
    step.receiveShadow = true;
    world.add(step);
  }
  if (venue.roof !== 'open') {
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x14181e, metalness: 0.45, roughness: 0.52 });
    for (const side of [-1, 1]) {
      const width = venue.roof === 'compact' ? 132 : 158;
      const depth = venue.roof === 'sweeping' ? 20 : 14;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(width, 0.7, depth), roofMat);
      roof.position.set(0, 18.2, side * 83);
      roof.rotation.x = venue.roof === 'sweeping' ? side * 0.06 : 0;
      roof.castShadow = true;
      world.add(roof);
    }
  }
}

function addVenueSignage(world, venue) {
  const texture = makeSign(venue.name.replace('Track Stadium', '').replace('Stadium', ''), '#ffffff', venue.theme === 'gold' ? '#3b2f05' : '#11151c');
  for (const side of [-1, 1]) {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(34, 8.5), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    sign.position.set(0, 20.5, side * 89);
    sign.rotation.y = side < 0 ? 0 : Math.PI;
    world.add(sign);
  }
}

function addLights(world) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x555d66, metalness: 0.55, roughness: 0.5 });
  for (const x of [-64, -22, 22, 64]) for (const z of [-58, 58]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 28, 10), poleMat); pole.position.set(x, 14, z); world.add(pole);
    const bank = new THREE.Mesh(new THREE.BoxGeometry(7, 1.1, 1.2), new THREE.MeshStandardMaterial({ color: 0xf4f7ff, emissive: 0xd7e4ff, emissiveIntensity: 0.55 })); bank.position.set(x, 28, z); world.add(bank);
  }
}

function add100mChute(world, trackColor) {
  const chute = new THREE.Mesh(
    new THREE.PlaneGeometry(110, LANE_WIDTH * 8),
    new THREE.MeshPhysicalMaterial({ color: trackColor, roughness: 0.78, clearcoat: 0.03 })
  );
  chute.rotation.x = -Math.PI / 2;
  chute.position.set(0, TRACK_Y - 0.018, CHUTE_Z);
  chute.receiveShadow = true;
  world.add(chute);

  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let lane = 0; lane <= 8; lane++) {
    const z = CHUTE_Z - LANE_WIDTH * 4 + lane * LANE_WIDTH;
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-55, TRACK_Y + 0.03, z),
      new THREE.Vector3(55, TRACK_Y + 0.03, z)
    ]), lineMat));
  }
  for (const x of [-50, 50]) {
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, TRACK_Y + 0.035, CHUTE_Z - LANE_WIDTH * 4),
      new THREE.Vector3(x, TRACK_Y + 0.035, CHUTE_Z + LANE_WIDTH * 4)
    ]), lineMat));
  }
}

function addEventStartMarks(world) {
  const matFor = (color) => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.98 });
  const laneEvents = [['200m', 0xffffff], ['400m', 0xd9e7ff], ['800m', 0x55e17c]];
  for (const [event, color] of laneEvents) {
    const cfg = EVENT_STARTS[event];
    const base = eventStartBase(event);
    for (let lane = 1; lane <= 8; lane++) {
      const course = base + (lane - 1) * cfg.stagger;
      const inner = INNER_RADIUS + (lane - 1) * LANE_WIDTH + 0.08;
      const outer = inner + LANE_WIDTH - 0.16;
      world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        stadiumPoint(course, inner), stadiumPoint(course, outer)
      ]), matFor(color)));
    }
  }

  const arcEvents = ['800m', '1500m', '3000m', '5000m', '10000m'];
  for (const event of arcEvents) {
    const base = eventStartBase(event);
    const points = [];
    for (let i = 0; i <= 36; i++) {
      const t = i / 36;
      const laneFloat = 0.65 + t * 7.7;
      const radius = INNER_RADIUS + laneFloat * LANE_WIDTH;
      points.push(stadiumPoint(base + t * 4.2, radius));
    }
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), matFor(event === '800m' ? 0x55e17c : 0xffffff)));
  }
}

function addFinish(world) {
  const finish = stadiumPoint(FINISH_COURSE, INNER_RADIUS + LANE_WIDTH * 4.3);
  const before = stadiumPoint(FINISH_COURSE - 0.5, INNER_RADIUS + LANE_WIDTH * 4.3);
  const after = stadiumPoint(FINISH_COURSE + 0.5, INNER_RADIUS + LANE_WIDTH * 4.3);
  const tangent = after.clone().sub(before).normalize();
  const angle = Math.atan2(tangent.z, tangent.x);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(OUTER_RADIUS - INNER_RADIUS, 0.72), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  line.rotation.x = -Math.PI / 2;
  line.rotation.z = angle + Math.PI / 2;
  line.position.set(finish.x, TRACK_Y + 0.045, finish.z);
  world.add(line);
}

function addFieldAreas(world) {
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.2), new THREE.MeshStandardMaterial({ color: 0xd9c596, roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.set(15, 0.03, 7); world.add(sand);
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(42, 1.2), new THREE.MeshStandardMaterial({ color: 0x7e2b2e, roughness: 0.85 })); runway.rotation.x = -Math.PI / 2; runway.position.set(-10, 0.035, 7); world.add(runway);
  const circle = new THREE.Mesh(new THREE.CircleGeometry(1.25, 32), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.92 })); circle.rotation.x = -Math.PI / 2; circle.position.set(-12, 0.035, -10); world.add(circle);
}

function makeClockTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  function draw(time = '0:00.00', event = 'NCFA') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(4,7,11,.94)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f1c40f';
    ctx.font = '900 44px Arial';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(event).toUpperCase(), 44, 80);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.font = '900 82px Arial';
    ctx.fillText(time, 980, 82);
    ctx.textAlign = 'left';
    texture.needsUpdate = true;
  }
  draw();
  return { canvas, texture, draw };
}

function addVideoBoard(world) {
  const boardX = 52;
  const boardZ = 92;
  const boardY = 18;
  const yaw = Math.atan2(-boardX, -boardZ);
  const normal = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));

  const shell = new THREE.Mesh(new THREE.BoxGeometry(27, 14, 1.5), new THREE.MeshStandardMaterial({ color: 0x11161d, metalness: 0.22, roughness: 0.7 }));
  shell.position.set(boardX, boardY, boardZ);
  shell.rotation.y = yaw;
  shell.castShadow = true;
  world.add(shell);

  const mat = new THREE.MeshBasicMaterial({ color: 0x0d2732, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(23.8, 10.2), mat);
  screen.position.set(boardX + normal.x * 0.82, boardY, boardZ + normal.z * 0.82);
  screen.rotation.y = yaw;
  world.add(screen);

  const support = new THREE.Mesh(new THREE.BoxGeometry(2.4, 12, 2.4), new THREE.MeshStandardMaterial({ color: 0x333a43, roughness: 0.8 }));
  support.position.set(boardX, 7, boardZ);
  world.add(support);

  const clock = makeClockTexture();
  const clockMaterial = new THREE.MeshBasicMaterial({ map: clock.texture, transparent: false, toneMapped: false });
  const clockPanel = new THREE.Mesh(new THREE.PlaneGeometry(20.2, 2.45), clockMaterial);
  clockPanel.position.set(boardX + normal.x * 0.88, boardY + 3.35, boardZ + normal.z * 0.88);
  clockPanel.rotation.y = yaw;
  clockPanel.renderOrder = 4;
  world.add(clockPanel);

  return { screen, material: mat, shell, support, clockPanel, clock };
}

export function createWorld(scene, venue) {
  const world = new THREE.Group();
  world.name = `venue-${venue.id}`;
  scene.add(world);

  const grass = new THREE.Mesh(new THREE.PlaneGeometry(430, 300), new THREE.MeshStandardMaterial({ color: 0x315d36, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.04;
  grass.receiveShadow = true;
  world.add(grass);

  world.add(trackRibbon(INNER_RADIUS, OUTER_RADIUS, venue.track));
  const apron = trackRibbon(OUTER_RADIUS, OUTER_RADIUS + 3.0, 0x3f454d);
  apron.position.y = -0.015;
  world.add(apron);

  for (let lane = 0; lane <= 8; lane++) {
    const r = INNER_RADIUS + lane * LANE_WIDTH;
    const pts = [];
    for (let i = 0; i < 420; i++) pts.push(stadiumPoint((i / 420) * LAP, r));
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xf7f2e8, transparent: true, opacity: 0.82 }));
    line.position.y = 0.035;
    world.add(line);
  }

  add100mChute(world, venue.track);
  addEventStartMarks(world);
  addFinish(world);

  const infield = new THREE.Mesh(new THREE.PlaneGeometry(126, 56), new THREE.MeshStandardMaterial({ color: 0x3f793f, roughness: 1 }));
  infield.rotation.x = -Math.PI / 2;
  infield.position.y = 0.02;
  infield.receiveShadow = true;
  world.add(infield);

  addStands(world, venue);
  const crowd = createCrowd(world, venue);
  const videoBoard = addVideoBoard(world);
  addLights(world);
  addFieldAreas(world);
  addVenueSignage(world, venue);

  return {
    group: world,
    crowd,
    videoBoard,
    venue,
    setBroadcastTexture(texture) {
      videoBoard.material.map = texture;
      videoBoard.material.color.set(0xffffff);
      videoBoard.material.needsUpdate = true;
    },
    setBroadcastClock(time, event) { videoBoard.clock.draw(time, event); },
    setCrowdReaction(mode) { crowd.setReaction(mode); },
    update(time) { crowd.update(time); },
    dispose() {
      scene.remove(world);
      world.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose?.());
      });
      videoBoard.clock.texture.dispose();
    }
  };
}
