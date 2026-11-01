import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

function material(color, roughness = 0.62, metalness = 0.0) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness,
    clearcoat: 0.08,
    clearcoatRoughness: 0.72
  });
}

function cylinderSegment(radiusTop, radiusBottom, length, mat) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, length, 10), mat);
  mesh.position.y = -length * 0.5;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeBibTexture(school, number) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 192;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f6f4ef';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#151515';
  ctx.textAlign = 'center';
  ctx.font = '700 24px Arial';
  ctx.fillText('NCFA', 128, 36);
  ctx.font = '900 72px Arial';
  ctx.fillText(String(number), 128, 112);
  ctx.font = '700 19px Arial';
  ctx.fillText(school.toUpperCase().slice(0, 18), 128, 158);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeLeg(side, skinMat, shoeMat) {
  const hip = new THREE.Group();
  hip.position.set(side * 0.17, 0.90, 0);

  const thigh = cylinderSegment(0.105, 0.09, 0.57, skinMat);
  hip.add(thigh);

  const knee = new THREE.Group();
  knee.position.y = -0.57;
  hip.add(knee);

  const shin = cylinderSegment(0.082, 0.065, 0.54, skinMat);
  knee.add(shin);

  const ankle = new THREE.Group();
  ankle.position.y = -0.54;
  knee.add(ankle);

  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.105, 0.37), shoeMat);
  shoe.position.set(0, -0.045, 0.10);
  shoe.rotation.x = -0.08;
  shoe.castShadow = true;
  ankle.add(shoe);

  return { root: hip, hip, knee, ankle };
}

function makeArm(side, skinMat) {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.38, 1.58, 0);

  const upper = cylinderSegment(0.075, 0.065, 0.43, skinMat);
  shoulder.add(upper);

  const elbow = new THREE.Group();
  elbow.position.y = -0.43;
  shoulder.add(elbow);

  const lower = cylinderSegment(0.064, 0.052, 0.39, skinMat);
  elbow.add(lower);

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.072, 9, 7), skinMat);
  hand.position.y = -0.43;
  elbow.add(hand);

  return { root: shoulder, shoulder, elbow };
}

export function createAthlete(config, bibNumber = 1) {
  const group = new THREE.Group();
  group.userData.config = config;

  const skinMat = material(config.skin ?? 0x8a583b, 0.7);
  const jerseyMat = material(config.color ?? 0xf1c40f, 0.48);
  const shortsMat = material(config.shorts ?? 0x15171a, 0.7);
  const shoeMat = material(0xf3f4f5, 0.42);
  const hairMat = material(0x17120f, 0.82);

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.30, 0.30), shortsMat);
  pelvis.position.y = 0.98;
  pelvis.castShadow = true;
  group.add(pelvis);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.30, 0.66, 8, 12), jerseyMat);
  torso.scale.set(1.08, 1, 0.72);
  torso.position.y = 1.47;
  torso.castShadow = true;
  group.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.15, 10), skinMat);
  neck.position.y = 1.93;
  neck.castShadow = true;
  group.add(neck);

  const headRoot = new THREE.Group();
  headRoot.position.y = 2.12;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12), skinMat);
  head.scale.set(0.92, 1.05, 0.92);
  head.castShadow = true;
  headRoot.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.236, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.53), hairMat);
  hair.position.y = 0.055;
  headRoot.add(hair);
  group.add(headRoot);

  const bib = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.31),
    new THREE.MeshStandardMaterial({ map: makeBibTexture(config.school ?? 'NCFA', bibNumber), roughness: 0.76 })
  );
  bib.position.set(0, 1.49, -0.224);
  bib.rotation.y = Math.PI;
  group.add(bib);

  const leftLeg = makeLeg(-1, skinMat, shoeMat);
  const rightLeg = makeLeg(1, skinMat, shoeMat);
  group.add(leftLeg.root, rightLeg.root);

  const leftArm = makeArm(-1, skinMat);
  const rightArm = makeArm(1, skinMat);
  group.add(leftArm.root, rightArm.root);

  group.userData.rig = {
    torso,
    pelvis,
    headRoot,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm
  };

  group.scale.setScalar(1.05);
  return group;
}

export function animateAthlete(group, time, speed, fatigue = 0, phase = 0, startPose = false) {
  const rig = group.userData.rig;
  if (!rig) return;

  if (startPose) {
    rig.torso.rotation.x = 0.12;
    rig.leftLeg.hip.rotation.x = -0.35;
    rig.rightLeg.hip.rotation.x = 0.38;
    rig.leftLeg.knee.rotation.x = 0.58;
    rig.rightLeg.knee.rotation.x = 0.42;
    rig.leftArm.shoulder.rotation.x = 0.55;
    rig.rightArm.shoulder.rotation.x = -0.45;
    rig.leftArm.elbow.rotation.x = -0.78;
    rig.rightArm.elbow.rotation.x = -0.78;
    return;
  }

  const normalized = THREE.MathUtils.clamp(speed / 9.5, 0, 1);
  const cadence = 4.7 + normalized * 5.1;
  const cycle = time * cadence + phase;
  const stride = Math.sin(cycle);
  const recover = Math.sin(cycle + Math.PI * 0.5);
  const arm = Math.sin(cycle + Math.PI);
  const fatigueSag = THREE.MathUtils.clamp(fatigue, 0, 1) * 0.09;

  rig.leftLeg.hip.rotation.x = stride * (0.58 + normalized * 0.22);
  rig.rightLeg.hip.rotation.x = -stride * (0.58 + normalized * 0.22);
  rig.leftLeg.knee.rotation.x = Math.max(0, -recover) * (0.72 + normalized * 0.58);
  rig.rightLeg.knee.rotation.x = Math.max(0, recover) * (0.72 + normalized * 0.58);
  rig.leftLeg.ankle.rotation.x = -0.10 - Math.max(0, stride) * 0.22;
  rig.rightLeg.ankle.rotation.x = -0.10 - Math.max(0, -stride) * 0.22;

  rig.leftArm.shoulder.rotation.x = arm * (0.58 + normalized * 0.18);
  rig.rightArm.shoulder.rotation.x = -arm * (0.58 + normalized * 0.18);
  rig.leftArm.elbow.rotation.x = -0.72 - Math.max(0, -arm) * 0.18;
  rig.rightArm.elbow.rotation.x = -0.72 - Math.max(0, arm) * 0.18;

  rig.torso.rotation.x = 0.035 + normalized * 0.04 + fatigueSag;
  rig.torso.rotation.z = Math.sin(cycle * 0.5) * 0.018;
  rig.pelvis.rotation.y = Math.sin(cycle) * 0.035;
  rig.headRoot.rotation.x = -fatigueSag * 0.4;
  group.position.y += Math.abs(Math.sin(cycle * 2)) * (0.012 + normalized * 0.026);
}
