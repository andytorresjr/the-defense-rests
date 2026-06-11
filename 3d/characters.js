// Procedural low-poly people for the 3D courtroom. Each person is a THREE.Group
// with named parts so the scene can animate talking, gestures, moods, and the
// objection point. Visual specs reuse the 2D game's portrait data (skin, hair,
// hairColor, outfit).
import * as THREE from 'three';

const OUTFIT_COLORS = {
  robe: 0x16161d,
  suit: 0x2b3447,
  detective: 0x4a4238,
  prosecutor: 0x3d2330,
  labcoat: 0xe8eaec,
  apron: 0x3c332b,
  casual: 0x6b7d5e,
  defense: 0x32405e,
  juror: null, // varied per juror
};

function mat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05 });
}

export function makePerson(spec = {}) {
  const {
    skin = '#c68863', hair = 'short', hairColor = '#33291f',
    outfit = 'casual', outfitColor = null, seated = false, scale = 1,
  } = spec;

  const skinMat = mat(new THREE.Color(skin));
  const hairMat = mat(new THREE.Color(hairColor));
  const clothMat = mat(outfitColor != null ? outfitColor : (OUTFIT_COLORS[outfit] ?? 0x6b7d5e));

  const g = new THREE.Group();
  const parts = {};
  const drop = seated ? 0.42 : 0;

  if (!seated) {
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.78, 0.22), mat(0x23201c));
    legs.position.y = 0.39;
    legs.castShadow = true;
    g.add(legs);
  }

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.27), clothMat);
  torso.position.y = 1.08 - drop;
  torso.castShadow = true;
  g.add(torso);
  parts.torso = torso;

  // shirt/collar sliver
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.02),
    mat(outfit === 'casual' || outfit === 'apron' ? 0x55644b : 0xe9e6df));
  collar.position.set(0, 1.3 - drop, 0.14);
  g.add(collar);

  // arms with shoulder pivots so they can gesture/point
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.29, 1.32 - drop, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.56, 0.12), clothMat);
    arm.position.y = -0.26;
    arm.castShadow = true;
    shoulder.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skinMat);
    hand.position.y = -0.55;
    shoulder.add(hand);
    g.add(shoulder);
    parts[side === -1 ? 'armL' : 'armR'] = shoulder;
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 8), skinMat);
  neck.position.y = 1.44 - drop;
  g.add(neck);

  // head group
  const head = new THREE.Group();
  head.position.y = 1.63 - drop;
  g.add(head);
  parts.head = head;

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 12), skinMat);
  skull.castShadow = true;
  head.add(skull);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), mat(0x1c1713));
    eye.position.set(side * 0.058, 0.02, 0.145);
    head.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.013, 0.014), hairMat);
    brow.position.set(side * 0.058, 0.075, 0.15);
    head.add(brow);
    parts[side === -1 ? 'browL' : 'browR'] = brow;
  }

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.045, 0.03), skinMat);
  nose.position.set(0, -0.015, 0.16);
  head.add(nose);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.012), mat(0x6e3b30));
  mouth.position.set(0, -0.085, 0.15);
  head.add(mouth);
  parts.mouth = mouth;

  // hair
  if (hair !== 'bald') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.175, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat);
    cap.position.y = 0.012;
    head.add(cap);
    if (hair === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), hairMat);
      bun.position.set(0, 0.12, -0.14);
      head.add(bun);
    } else if (hair === 'long') {
      const fall = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.13, 0.34, 10), hairMat);
      fall.position.set(0, -0.12, -0.07);
      head.add(fall);
    } else if (hair === 'curly') {
      for (const [x, y, z] of [[-0.12, 0.1, 0.05], [0.12, 0.1, 0.05], [0, 0.16, -0.04]]) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), hairMat);
        puff.position.set(x, y, z);
        head.add(puff);
      }
    }
  }

  // robe shoulders for the judge
  if (outfit === 'robe') {
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.2, 0.32), clothMat);
    shoulders.position.y = 1.34 - drop;
    g.add(shoulders);
  }

  g.scale.setScalar(scale);

  const person = {
    group: g,
    parts,
    talking: false,
    mood: 'neutral', // neutral | stressed | down
    pointT: 0,       // objection point-pose timer
    phase: Math.random() * Math.PI * 2,
    baseHeadY: head.position.y,
  };
  person.update = (t, dt) => updatePerson(person, t, dt);
  return person;
}

function updatePerson(p, t, dt) {
  const { head, mouth, browL, browR, torso, armL, armR } = p.parts;
  const s = t + p.phase;

  // breathing
  torso.scale.y = 1 + Math.sin(s * 1.6) * 0.008;
  head.position.y = p.baseHeadY + Math.sin(s * 1.6) * 0.004;

  // mood baseline
  let headPitch = 0, browTilt = 0, slump = 0;
  if (p.mood === 'stressed') { headPitch = 0.08; browTilt = 0.28; slump = 0.03; }
  if (p.mood === 'down') { headPitch = 0.3; browTilt = 0.4; slump = 0.09; }
  torso.rotation.x = slump;
  browL.rotation.z = -browTilt;
  browR.rotation.z = browTilt;

  // talking
  if (p.talking) {
    mouth.scale.y = 1 + Math.abs(Math.sin(s * 13)) * 2.4;
    head.rotation.x = headPitch + Math.sin(s * 4.2) * 0.04;
    head.rotation.y = Math.sin(s * 2.1) * 0.06;
    armR.rotation.x = -0.25 + Math.sin(s * 3.1) * 0.12;
  } else {
    mouth.scale.y = 1;
    head.rotation.x += (headPitch - head.rotation.x) * Math.min(1, dt * 5);
    head.rotation.y += (0 - head.rotation.y) * Math.min(1, dt * 5);
    armR.rotation.x += (0 - armR.rotation.x) * Math.min(1, dt * 5);
  }
  armL.rotation.x += (0 - armL.rotation.x) * Math.min(1, dt * 5);

  // objection point: arm thrust forward-up, decays
  if (p.pointT > 0) {
    p.pointT -= dt;
    armR.rotation.x = -1.9;
    head.rotation.x = -0.12;
  }
}

// Small deterministic variety for jurors / gallery from a string id.
export function hashHue(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

const SKINS = ['#8d5a3b', '#c68863', '#e8b88f', '#6b4632', '#caa284', '#b97f5a'];
const HAIRS = ['short', 'long', 'bun', 'curly', 'bald'];
const HAIR_COLORS = ['#1f1a16', '#4d4339', '#6e6e72', '#3a3027', '#241d18', '#8a6a40'];

export function randomCivilian(id, seated = true) {
  const h = hashHue(id);
  return makePerson({
    skin: SKINS[h % SKINS.length],
    hair: HAIRS[(h >> 3) % HAIRS.length],
    hairColor: HAIR_COLORS[(h >> 6) % HAIR_COLORS.length],
    outfit: 'casual',
    outfitColor: new THREE.Color().setHSL(((h >> 9) % 360) / 360, 0.22, 0.32).getHex(),
    seated,
  });
}
