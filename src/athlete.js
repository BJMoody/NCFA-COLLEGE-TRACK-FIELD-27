import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

function material(color, roughness = 0.62, metalness = 0.0) {
  return new THREE.MeshPhysicalMaterial({ color, roughness, metalness, clearcoat: 0.07, clearcoatRoughness: 0.72 });
}

function cylinderSegment(radiusTop, radiusBottom, length, mat, sides = 10) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, length, sides), mat);
  mesh.position.y = -length * 0.5;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function schoolAbbr(name = 'NCFA') {
  const words = name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
}

function makeBibTexture(school, number) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 192;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f7f6f1'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#d9d9d3'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 250, 186);
  ctx.fillStyle = '#111'; ctx.textAlign = 'center';
  ctx.font = '800 23px Arial'; ctx.fillText('NCFA', 128, 34);
  ctx.font = '900 72px Arial'; ctx.fillText(String(number), 128, 112);
  ctx.font = '700 18px Arial'; ctx.fillText(school.toUpperCase().slice(0, 18), 128, 157);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}

function makeJerseyGraphic(config, bibNumber) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  const trim = config.trim || '#ffffff';
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = trim;
  ctx.font = '900 76px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(schoolAbbr(config.school), 256, 98);
  ctx.font = '900 62px Arial'; ctx.fillText(String(bibNumber).padStart(2, '0'), 256, 178);
  ctx.fillRect(42, 18, 74, 10); ctx.fillRect(396, 18, 74, 10);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

function makeLeg(side, skinMat, shoeMat, shortsMat) {
  const hip = new THREE.Group(); hip.position.set(side * 0.17, 0.93, 0);
  const upperShort = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.115, 0.19, 10), shortsMat);
  upperShort.position.y = -0.095; upperShort.castShadow = true; hip.add(upperShort);
  const thigh = cylinderSegment(0.105, 0.09, 0.48, skinMat); thigh.position.y = -0.43; hip.add(thigh);
  const knee = new THREE.Group(); knee.position.y = -0.67; hip.add(knee);
  const shin = cylinderSegment(0.082, 0.062, 0.53, skinMat); knee.add(shin);
  const ankle = new THREE.Group(); ankle.position.y = -0.53; knee.add(ankle);
  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.10, 0.38), shoeMat);
  shoe.position.set(0, -0.045, 0.11); shoe.rotation.x = -0.08; shoe.castShadow = true; ankle.add(shoe);
  const spikePlate = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.025, 0.28), material(0x1b1d21, 0.35));
  spikePlate.position.set(0, -0.10, 0.12); ankle.add(spikePlate);
  return { root: hip, hip, knee, ankle };
}

function makeArm(side, skinMat, jerseyMat) {
  const shoulder = new THREE.Group(); shoulder.position.set(side * 0.39, 1.60, 0);
  const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 8), jerseyMat); sleeve.scale.set(1, 0.8, 1); shoulder.add(sleeve);
  const upper = cylinderSegment(0.075, 0.064, 0.38, skinMat); upper.position.y = -0.25; shoulder.add(upper);
  const elbow = new THREE.Group(); elbow.position.y = -0.50; shoulder.add(elbow);
  const lower = cylinderSegment(0.064, 0.052, 0.39, skinMat); elbow.add(lower);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.073, 10, 8), skinMat); hand.position.y = -0.43; elbow.add(hand);
  return { root: shoulder, shoulder, elbow };
}

function addHair(headRoot, style, hairMat) {
  const add = (mesh) => { mesh.castShadow = true; headRoot.add(mesh); return mesh; };
  if (style === 'buzz') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.231, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.47), hairMat);
    cap.scale.y = 0.45; cap.position.y = 0.13; add(cap); return;
  }
  if (style === 'fade' || style === 'waves' || style === 'side-part') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.238, 18, 11, 0, Math.PI * 2, 0, Math.PI * 0.54), hairMat);
    cap.position.y = 0.055; cap.scale.y = style === 'fade' ? 0.72 : 0.56; add(cap);
    if (style === 'side-part') {
      const part = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.20), material(0x4b3329, 0.9));
      part.position.set(0.055, 0.205, -0.05); part.rotation.z = 0.18; add(part);
    }
    return;
  }
  if (style === 'short-curls' || style === 'twists') {
    const count = style === 'twists' ? 12 : 18;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 0.13 + (i % 3) * 0.025;
      const curl = style === 'twists'
        ? new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.16 + (i % 2) * 0.05, 7), hairMat)
        : new THREE.Mesh(new THREE.SphereGeometry(0.065 + (i % 2) * 0.012, 8, 6), hairMat);
      curl.position.set(Math.cos(a) * r, 0.18 + (i % 3) * 0.025, Math.sin(a) * r);
      if (style === 'twists') curl.rotation.z = Math.cos(a) * 0.35;
      add(curl);
    }
    return;
  }
  if (style === 'braids') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.50), hairMat); cap.position.y = 0.07; add(cap);
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const braid = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.027, 0.31, 7), hairMat);
      braid.position.set(side * (0.09 + i * 0.038), 0.02, 0.07 - i * 0.04); braid.rotation.z = side * 0.12; add(braid);
    }
    return;
  }
  const messy = new THREE.Mesh(new THREE.SphereGeometry(0.248, 12, 9), hairMat);
  messy.scale.set(1.0, 0.70, 0.95); messy.position.y = 0.14; add(messy);
}

function addFace(headRoot, skinMat) {
  const eyeMat = material(0x1b1715, 0.7);
  for (const x of [-0.075, 0.075]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), eyeMat); eye.position.set(x, 0.025, -0.215); headRoot.add(eye);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.027, 0.07, 8), skinMat); nose.rotation.x = -Math.PI / 2; nose.position.set(0, -0.015, -0.23); headRoot.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.012, 0.012), material(0x5b2e2a, 0.9)); mouth.position.set(0, -0.085, -0.225); headRoot.add(mouth);
}

export function createAthlete(config, bibNumber = 1) {
  const group = new THREE.Group();
  group.userData.config = config; group.userData.bibNumber = bibNumber; group.userData.isNCFAAthlete = true;

  const skinMat = material(config.skin ?? 0x8a583b, 0.69);
  const jerseyMat = material(config.color ?? 0xf1c40f, 0.40); jerseyMat.clearcoat = 0.14; jerseyMat.clearcoatRoughness = 0.58;
  const shortsMat = material(config.shorts ?? 0x15171a, 0.58);
  const shoeColor = bibNumber % 3 === 0 ? 0x11151b : bibNumber % 3 === 1 ? 0xf2f3f5 : 0xe9d737;
  const shoeMat = material(shoeColor, 0.30);
  const hairMat = material(config.hairColor ?? 0x17120f, 0.83);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.31, 0.31), shortsMat); pelvis.position.y = 1.0; pelvis.castShadow = true; group.add(pelvis);
  const sideStripeMat = material(new THREE.Color(config.trim || '#ffffff'), 0.55);
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.29, 0.315), sideStripeMat); stripe.position.set(side * 0.247, 1.0, 0); group.add(stripe);
  }

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.30, 0.67, 8, 14), jerseyMat);
  torso.scale.set(1.08, 1, 0.72); torso.position.y = 1.49; torso.castShadow = true; group.add(torso);

  const chestGraphic = new THREE.Mesh(new THREE.PlaneGeometry(0.50, 0.28), new THREE.MeshBasicMaterial({ map: makeJerseyGraphic(config, bibNumber), transparent: true, toneMapped: false }));
  chestGraphic.position.set(0, 1.69, -0.225); chestGraphic.rotation.y = Math.PI; group.add(chestGraphic);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.087, 0.094, 0.15, 10), skinMat); neck.position.y = 1.95; neck.castShadow = true; group.add(neck);
  const headRoot = new THREE.Group(); headRoot.position.y = 2.14;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 14), skinMat); head.scale.set(0.92, 1.06, 0.92); head.castShadow = true; headRoot.add(head);
  addFace(headRoot, skinMat); addHair(headRoot, config.hairStyle || 'fade', hairMat); group.add(headRoot);

  const bib = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.28), new THREE.MeshStandardMaterial({ map: makeBibTexture(config.school ?? 'NCFA', bibNumber), roughness: 0.72 }));
  bib.position.set(0, 1.43, -0.229); bib.rotation.y = Math.PI; group.add(bib);

  const leftLeg = makeLeg(-1, skinMat, shoeMat, shortsMat); const rightLeg = makeLeg(1, skinMat, shoeMat, shortsMat); group.add(leftLeg.root, rightLeg.root);
  const leftArm = makeArm(-1, skinMat, jerseyMat); const rightArm = makeArm(1, skinMat, jerseyMat); group.add(leftArm.root, rightArm.root);

  group.userData.rig = { torso, pelvis, headRoot, leftLeg, rightLeg, leftArm, rightArm };
  group.scale.setScalar(1.05 + ((bibNumber % 3) - 1) * 0.018);
  return group;
}

function runningLegPose(leg, phase, normalized, fatigue) {
  const swing = Math.sin(phase);
  const recovery = Math.max(0, Math.sin(phase + 0.82));
  const drive = Math.max(0, -Math.sin(phase - 0.18));
  const hipAmplitude = 0.62 + normalized * 0.38;
  const kneeLift = (0.80 + normalized * 0.76) * (1 - fatigue * 0.14);
  leg.hip.rotation.x = swing * hipAmplitude;
  leg.knee.rotation.x = 0.06 + recovery * kneeLift + drive * 0.24;
  leg.ankle.rotation.x = -0.14 - recovery * 0.24 + drive * 0.12;
  leg.hip.rotation.z = Math.sin(phase * 0.5) * 0.018;
}

export function animateAthlete(group, time, speed, fatigue = 0, phase = 0, startPose = false) {
  const rig = group.userData.rig; if (!rig) return;
  const f = THREE.MathUtils.clamp(fatigue, 0, 1);
  if (startPose) {
    rig.torso.rotation.set(0.08, 0, 0); rig.pelvis.rotation.set(0, 0, 0);
    rig.leftLeg.hip.rotation.set(-0.30, 0, 0); rig.rightLeg.hip.rotation.set(0.34, 0, 0);
    rig.leftLeg.knee.rotation.x = 0.50; rig.rightLeg.knee.rotation.x = 0.28;
    rig.leftArm.shoulder.rotation.set(0.40, 0, -0.05); rig.rightArm.shoulder.rotation.set(-0.38, 0, 0.05);
    rig.leftArm.elbow.rotation.x = -1.18; rig.rightArm.elbow.rotation.x = -1.18; rig.headRoot.rotation.set(-0.02, 0, 0); return;
  }

  const normalized = THREE.MathUtils.clamp(speed / 10.5, 0, 1);
  const strideHz = 2.75 + normalized * 1.25;
  const cycle = time * strideHz * Math.PI * 2 + phase; const opposite = cycle + Math.PI;
  runningLegPose(rig.leftLeg, cycle, normalized, f); runningLegPose(rig.rightLeg, opposite, normalized, f);

  const armSwing = 0.67 + normalized * 0.38;
  const leftArm = Math.sin(opposite); const rightArm = Math.sin(cycle);
  rig.leftArm.shoulder.rotation.x = leftArm * armSwing; rig.rightArm.shoulder.rotation.x = rightArm * armSwing;
  rig.leftArm.elbow.rotation.x = -1.25 - Math.max(0, -leftArm) * 0.22; rig.rightArm.elbow.rotation.x = -1.25 - Math.max(0, -rightArm) * 0.22;
  rig.leftArm.shoulder.rotation.z = -0.06; rig.rightArm.shoulder.rotation.z = 0.06;

  const fatigueSag = f * 0.10;
  rig.torso.rotation.x = 0.05 + normalized * 0.06 + fatigueSag; rig.torso.rotation.z = Math.sin(cycle) * 0.014;
  rig.pelvis.rotation.y = Math.sin(cycle) * 0.062; rig.pelvis.rotation.z = Math.sin(cycle * 2) * 0.014;
  rig.headRoot.rotation.x = -fatigueSag * 0.34; rig.headRoot.rotation.y = Math.sin(cycle * 0.5) * 0.014;

  const flight = Math.pow(Math.max(0, Math.sin(cycle * 2 - 0.32)), 1.28);
  const contactCompression = Math.max(0, Math.cos(cycle * 2)) * 0.011;
  group.position.y += flight * (0.036 + normalized * 0.060) - contactCompression;
}
