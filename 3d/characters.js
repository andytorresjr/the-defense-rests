// Articulated stylized-realistic procedural humans for the 3D courtroom
// (design doc .design/characters.md). Each person is a jointed THREE.Group —
// hips/spine/shoulders/elbows/hips/knees plus an aimable head with jaw, eyes,
// lids and brows — built entirely from cached primitive geometry. Zero asset
// files, zero Math.random(): all variety derives from hashHue(id) and a
// golden-angle counter, so the same ids produce identical people every load.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- pure helpers ----------

// Small deterministic variety for jurors / gallery from a string id.
// (Kept verbatim — exported, and the master hash for every derived trait.)
export function hashHue(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

// Derive an independent [0,1) channel from the master hash + a salt.
function hVal(h, salt) {
  let x = (h ^ Math.imul(salt, 0x9E3779B1)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x85EBCA6B) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xC2B2AE35) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

const frac = (x) => x - Math.floor(x);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function smoothstep01(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
// Two detuned sines — cheap aperiodic-feeling idle noise.
const S2 = (x) => 0.6 * Math.sin(x) + 0.4 * Math.sin(2.33 * x + 1.3);
// Objection attack curve — slight overshoot at the top.
function easeOutBack(x) { const e = x - 1; return 1 + 2.7 * e * e * e + 1.7 * e * e; }

// ---------- palettes & constants ----------

const SKINS9 = ['#f4d5b8', '#ecc39a', '#e0ac80', '#c98e62', '#b87a50',
  '#9c6b46', '#7d5236', '#5d3a26', '#4a2e1e'];
const HAIR_COLORS8 = ['#1f1a16', '#241d18', '#3a3027', '#4d4339',
  '#8a6a40', '#6e3a22', '#2c2c34', '#553c2a'];
const GRAY_HAIR3 = ['#9a958c', '#c9c4ba', '#6e6e72'];
const CASUAL12 = ['#6b7d5e', '#5b6c8c', '#8c5b4a', '#7d6b8c', '#4a6b5e', '#8c7d4a',
  '#6e6e72', '#92675a', '#41597d', '#7a8c5b', '#8c4a55', '#5e5a4a'];
const TROUSERS5 = ['#23201c', '#2c2c34', '#3a3328', '#423c46', '#1f2630'];
const TIES6 = ['#7a2230', '#39516b', '#3a5a40', '#6b5520', '#50406b', '#233a52'];
const IRIS6 = ['#3b2a1e', '#2a1c12', '#5a4632', '#4f5c3a', '#44627a', '#36454f'];

const MALE_HAIR = ['short', 'crew', 'curly', 'afro', 'bald', 'balding', 'short', 'crew'];
const FEMALE_HAIR = ['long', 'bun', 'ponytail', 'curly', 'short', 'afro', 'long', 'bun'];
const HAIR_STYLES = new Set(['short', 'crew', 'balding', 'long', 'bun',
  'ponytail', 'curly', 'afro', 'bald']);

// Default jacket/torso color per outfit (null = casual hash palette).
const OUTFIT_DEFAULTS = {
  robe: 0x16161d, suit: 0x2b3447, defense: 0x32405e, prosecutor: 0x3d2330,
  detective: 0x4a4238, labcoat: 0xe8eaec, apron: null, casual: null,
};
// 'defense' is a suit; 'juror'/unknown fall back to casual.
function outfitKind(o) {
  if (o === 'defense') return 'suit';
  return OUTFIT_DEFAULTS[o] !== undefined ? o : 'casual';
}

// Build multipliers (§1): torso x/z scale, shoulder pivot x, limb radius, neck radius.
const BUILDS = {
  slim: { x: 0.91, z: 0.62, sx: 0.175, limb: 0.92, neck: 0.92 },
  average: { x: 1.00, z: 0.66, sx: 0.190, limb: 1.00, neck: 1.00 },
  broad: { x: 1.12, z: 0.72, sx: 0.210, limb: 1.10, neck: 1.10 },
};

// ---------- quality tier (module flags) ----------

let _quality = 'high';
let _lodWindow = 0.25; // background tick window; 0.4 s at medium/low

// ---------- material cache ----------

const _matCache = new Map();
const _clothMats = []; // every cloth material, so quality changes can toggle the bump
const _c = new THREE.Color(); // build-time scratch for derived colors

// One 64×64 mono-noise canvas shared as bumpMap by every cloth material (HIGH only).
let _fabricBump = null;
function getFabricBump() {
  if (!_fabricBump) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(64, 64);
    for (let i = 0; i < 64 * 64; i++) {
      const g = 128 + Math.round((hVal(i + 1, 0xF00D) - 0.5) * 36); // ±18 around 128
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    _fabricBump = new THREE.CanvasTexture(c);
    _fabricBump.wrapS = _fabricBump.wrapT = THREE.RepeatWrapping;
  }
  return _fabricBump;
}

// opts: { metalness, cloth (fabric bump at HIGH), ds (DoubleSide — open lathes) }
function getMat(color, roughness, opts = {}) {
  _c.set(color);
  const metalness = opts.metalness ?? 0;
  const flags = (opts.cloth ? 'c' : '') + (opts.ds ? 'd' : '');
  const key = _c.getHexString() + '|' + roughness + '|' + metalness + '|' + flags;
  let m = _matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: _c.clone(), roughness, metalness });
    if (opts.ds) m.side = THREE.DoubleSide;
    if (opts.cloth) {
      _clothMats.push(m);
      if (_quality === 'high') { m.bumpMap = getFabricBump(); m.bumpScale = 0.0015; }
    }
    _matCache.set(key, m);
  }
  return m;
}

// ---------- iris textures (MeshBasicMaterial so eyes read in shadow) ----------

const _irisMats = new Map();
function getIrisMat(hex) {
  let m = _irisMats.get(hex);
  if (!m) {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d');
    ctx.fillStyle = hex; // iris disc fills the whole circle UV
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#100c0a'; // pupil
    ctx.beginPath(); ctx.arc(16, 16, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; // glint
    ctx.beginPath(); ctx.arc(11, 11, 2.5, 0, Math.PI * 2); ctx.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    m = new THREE.MeshBasicMaterial({ map: tex });
    _irisMats.set(hex, m);
  }
  return m;
}

// ---------- geometry cache ----------

const _geoCache = new Map();
function getGeo(key, make) {
  let g = _geoCache.get(key);
  if (!g) { g = make(); _geoCache.set(key, g); }
  return g;
}

// Canonical primitives — per-part variety is mesh.scale, never new geometry.
const GEO = {
  pelvis: () => new THREE.SphereGeometry(0.16, 12, 8),
  upperArm: () => new THREE.CapsuleGeometry(0.042, 0.21, 4, 8),
  forearm: () => new THREE.CapsuleGeometry(0.036, 0.20, 4, 8),
  cuff: () => new THREE.CylinderGeometry(0.037, 0.037, 0.022, 10),
  thigh: () => new THREE.CapsuleGeometry(0.062, 0.30, 4, 8),
  shin: () => new THREE.CapsuleGeometry(0.048, 0.30, 4, 8),
  shoe: () => { const g = new THREE.CapsuleGeometry(0.042, 0.13, 4, 8); g.rotateX(Math.PI / 2); return g; },
  neck: () => new THREE.CylinderGeometry(0.045, 0.058, 0.09, 10),
  chin: () => new THREE.SphereGeometry(0.085, 14, 10),
  eyeWhite: () => new THREE.SphereGeometry(0.021, 10, 8),
  iris: () => new THREE.CircleGeometry(0.0092, 12),
  lid: () => new THREE.SphereGeometry(0.0235, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  brow: () => new THREE.BoxGeometry(0.052, 0.011, 0.014),
  upperLip: () => new THREE.BoxGeometry(0.052, 0.010, 0.014),
  lowerLip: () => new THREE.BoxGeometry(0.050, 0.012, 0.014),
  stubble: () => new THREE.SphereGeometry(0.088, 12, 8),
  mustache: () => new THREE.BoxGeometry(0.054, 0.014, 0.018),
  beard: () => new THREE.SphereGeometry(0.070, 10, 8),
  shirt: () => new THREE.BoxGeometry(0.10, 0.17, 0.008),
  collarTab: () => new THREE.BoxGeometry(0.022, 0.055, 0.006),
  bib: () => new THREE.BoxGeometry(0.16, 0.14, 0.014),
  apronPanel: () => new THREE.BoxGeometry(0.26, 0.30, 0.016),
  strap: () => { const g = new THREE.BoxGeometry(0.012, 0.012, 0.10); g.rotateX(0.5); return g; },
  crewneck: () => { const g = new THREE.TorusGeometry(0.062, 0.011, 6, 14); g.rotateX(1.45); return g; },
  openCollar: () => new THREE.BoxGeometry(0.05, 0.035, 0.012),
  necklace: () => { const g = new THREE.TorusGeometry(0.05, 0.004, 6, 16); g.rotateX(1.35); return g; },
  badge: () => new THREE.BoxGeometry(0.020, 0.026, 0.005),
};
const geo = (key) => getGeo(key, GEO[key]);

function latheGeo(pts) { // pts ascending in y → outward normals
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 14);
}

// Torso lathe (§2) — ONE geometry total; builds vary via mesh scale.
function torsoGeo() {
  return getGeo('torso', () => latheGeo([
    [0.150, -0.14], [0.162, -0.06], [0.148, 0.00], [0.160, 0.10], [0.178, 0.22],
    [0.172, 0.30], [0.150, 0.355], [0.095, 0.385], [0.060, 0.400],
  ]));
}

// Jacket skirt lathes, parented to hips ('suit' short / 'lab' long).
function skirtGeo(kind) {
  return getGeo('skirt:' + kind, () => latheGeo(kind === 'lab'
    ? [[0.190, -0.30], [0.180, -0.10], [0.165, 0.10]]
    : [[0.184, -0.14], [0.176, -0.02], [0.165, 0.10]]));
}

// Judge robe drape — separate standing/seated profiles.
function robeGeo(seated) {
  return getGeo(seated ? 'robe:sit' : 'robe:stand', () => latheGeo(seated
    ? [[0.31, -0.26], [0.28, -0.08], [0.24, 0.10], [0.20, 0.34]]
    : [[0.31, -0.84], [0.30, -0.55], [0.27, -0.10], [0.24, 0.10], [0.20, 0.34]]));
}

// Merged skull: cranium + cheeks + ears + nose. One geometry for everyone;
// face variety is head.scale.x jitter + feature colors.
function headBaseGeo() {
  return getGeo('headBase', () => {
    const parts = [];
    const cr = new THREE.SphereGeometry(0.105, 20, 14);
    cr.scale(1.0, 1.18, 1.08); cr.translate(0, 0.030, -0.005);
    parts.push(cr);
    for (const sd of [-1, 1]) {
      const cheek = new THREE.SphereGeometry(0.032, 8, 6);
      cheek.scale(1.2, 1.0, 0.9); cheek.translate(sd * 0.055, -0.018, 0.072);
      parts.push(cheek);
      const ear = new THREE.SphereGeometry(0.022, 8, 6);
      ear.scale(0.55, 1.15, 0.85); ear.translate(sd * 0.103, 0.005, -0.008);
      parts.push(ear);
    }
    const bridge = new THREE.BoxGeometry(0.020, 0.048, 0.022);
    bridge.rotateX(-0.35); bridge.translate(0, 0.012, 0.102);
    parts.push(bridge);
    const tip = new THREE.SphereGeometry(0.016, 8, 6);
    tip.scale(1.15, 0.95, 1.10); tip.translate(0, -0.012, 0.112);
    parts.push(tip);
    return mergeGeometries(parts);
  });
}

// One merged hair geometry per style (§3.7), baked in head space.
function hairGeo(style) {
  if (style === 'bald') return null;
  if (!HAIR_STYLES.has(style)) style = 'short';
  return getGeo('hair:' + style, () => {
    const parts = [];
    const cap = (r, ws, hs, thetaLen, sx, sy, sz, x, y, z) => {
      const g = new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, thetaLen);
      g.scale(sx, sy, sz); g.translate(x, y, z);
      parts.push(g);
    };
    switch (style) {
      case 'short':
        cap(0.112, 18, 12, 1.95, 1, 1, 1, 0, 0.035, -0.004);
        { const f = new THREE.BoxGeometry(0.055, 0.013, 0.016); // side-part fringe, hairline-high
          f.rotateZ(-0.12); f.translate(0.028, 0.102, 0.075); parts.push(f); }
        break;
      case 'crew':
        cap(0.110, 16, 10, 1.45, 1, 0.82, 1, 0, 0.045, -0.004);
        break;
      case 'balding': { // side/back band only
        const g = new THREE.SphereGeometry(0.113, 16, 8, 0, Math.PI * 2, 1.15, 0.95);
        g.translate(0, 0.030, -0.004); parts.push(g);
        break;
      }
      case 'long': {
        cap(0.113, 18, 12, 2.0, 1, 1, 1, 0, 0.034, -0.004);
        const fall = new THREE.CylinderGeometry(0.105, 0.085, 0.30, 12, 1, true);
        fall.translate(0, -0.10, -0.045); parts.push(fall);
        for (const sd of [-1, 1]) {
          const cu = new THREE.BoxGeometry(0.024, 0.20, 0.07);
          cu.translate(sd * 0.105, -0.045, 0.012); parts.push(cu);
        }
        break;
      }
      case 'bun': {
        cap(0.112, 18, 12, 1.95, 1, 1, 1, 0, 0.035, -0.004); // short cap, no fringe
        const b = new THREE.SphereGeometry(0.045, 10, 8);
        b.translate(0, 0.095, -0.108); parts.push(b);
        break;
      }
      case 'ponytail': {
        cap(0.110, 16, 10, 1.45, 1, 0.82, 1, 0, 0.045, -0.004); // crew cap
        const tl = new THREE.CapsuleGeometry(0.026, 0.14, 3, 8);
        tl.rotateX(0.55); tl.translate(0, -0.01, -0.135); parts.push(tl);
        break;
      }
      case 'curly': {
        const g = new THREE.SphereGeometry(0.115, 12, 8);
        g.scale(1.04, 0.95, 1.04); g.translate(0, 0.040, -0.005); parts.push(g);
        for (const [x, y, z] of [[-0.082, 0.095, 0.015], [0.082, 0.095, 0.015],
          [0, 0.130, -0.050], [0, 0.115, 0.060]]) {
          const pf = new THREE.SphereGeometry(0.048, 8, 6);
          pf.translate(x, y, z); parts.push(pf);
        }
        break;
      }
      case 'afro': {
        const g = new THREE.SphereGeometry(0.140, 14, 10);
        g.scale(1.06, 1.0, 1.0); g.translate(0, 0.060, -0.012); parts.push(g);
        break;
      }
    }
    return parts.length === 1 ? parts[0] : mergeGeometries(parts);
  });
}

// Hand: palm+fingers box plus a thumb capsule, merged per side.
function handGeo(side) { // side: -1 left, +1 right
  return getGeo('hand:' + (side < 0 ? 'L' : 'R'), () => {
    const palm = new THREE.BoxGeometry(0.064, 0.085, 0.026);
    palm.translate(0, -0.048, 0);
    const thumb = new THREE.CapsuleGeometry(0.012, 0.034, 3, 6);
    thumb.rotateZ(side * 0.85);
    thumb.translate(side * 0.034, -0.025, 0.012);
    return mergeGeometries([palm, thumb]);
  });
}

// Glasses: two torus rims + bridge + temples, merged.
function glassesGeo() {
  return getGeo('glasses', () => {
    const parts = [];
    for (const sd of [-1, 1]) {
      const rim = new THREE.TorusGeometry(0.0235, 0.0034, 6, 16);
      rim.translate(sd * 0.041, 0.020, 0.097); parts.push(rim);
      const temple = new THREE.BoxGeometry(0.0045, 0.0045, 0.090);
      temple.translate(sd * 0.100, 0.022, 0.052); parts.push(temple);
    }
    const bridge = new THREE.BoxGeometry(0.026, 0.0045, 0.0045);
    bridge.translate(0, 0.026, 0.099); parts.push(bridge);
    return mergeGeometries(parts);
  });
}

// Tie: knot + 4-sided tapered blade. Detective gets a loosened variant.
function tieGeo(loose) {
  return getGeo(loose ? 'tie:loose' : 'tie', () => {
    const knot = new THREE.BoxGeometry(0.034, 0.030, 0.018);
    knot.translate(0, loose ? 0.325 : 0.345, 0.118);
    const blade = new THREE.CylinderGeometry(0.012, 0.030, 0.235, 4);
    blade.rotateY(Math.PI / 4); // diamond cross-section
    blade.rotateX(0.07);
    if (loose) blade.rotateZ(0.08);
    blade.translate(0, 0.215, 0.122);
    return mergeGeometries([knot, blade]);
  });
}

// Jacket trim: two lapels + collar ('suit' wide / 'blazer' narrow).
function trimGeo(kind) {
  return getGeo('trim:' + kind, () => {
    const parts = [];
    const [lw, lh] = kind === 'blazer' ? [0.068, 0.14] : [0.085, 0.16];
    for (const sd of [-1, 1]) {
      const lap = new THREE.BoxGeometry(lw, lh, 0.012);
      lap.rotateZ(sd * 0.42); lap.rotateY(-sd * 0.28);
      lap.translate(sd * 0.052, 0.275, 0.118);
      parts.push(lap);
    }
    const collar = new THREE.BoxGeometry(0.13, 0.035, 0.10);
    collar.translate(0, 0.385, -0.040); parts.push(collar);
    return mergeGeometries(parts);
  });
}

// ---------- builders ----------

function mk(geometry, material, x, y, z, cast = false) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  return m;
}

// Group hierarchy of §1 with all body meshes. M: { skin, cloth, trouser, shoe },
// sleeveScale widens the robe sleeves.
function buildSkeleton(bd, M, sleeveScale) {
  const g = new THREE.Group();
  const parts = {};
  const casters = [];
  const r = bd.limb;

  const hips = new THREE.Group();
  hips.position.set(0, 0.96, 0);
  g.add(hips);
  parts.hips = hips;

  const pelvis = mk(geo('pelvis'), M.trouser, 0, -0.01, 0, true);
  pelvis.scale.set(1.05, 0.72, 0.78);
  hips.add(pelvis);
  parts.pelvis = pelvis;
  casters.push(pelvis);

  // legs
  for (const sd of [-1, 1]) {
    const S = sd < 0 ? 'L' : 'R';
    const hip = new THREE.Group();
    hip.position.set(sd * 0.095, -0.03, 0);
    hips.add(hip);
    parts['hip' + S] = hip;
    const thigh = mk(geo('thigh'), M.trouser, 0, -0.215, 0, true);
    thigh.scale.set(r, 1, r);
    hip.add(thigh);
    casters.push(thigh);
    const knee = new THREE.Group();
    knee.position.set(0, -0.43, 0);
    hip.add(knee);
    parts['knee' + S] = knee;
    const shin = mk(geo('shin'), M.trouser, 0, -0.21, 0, true);
    shin.scale.set(r, 1, r);
    knee.add(shin);
    casters.push(shin);
    const shoe = mk(geo('shoe'), M.shoe, 0, -0.46, 0.05);
    shoe.scale.set(1, 0.6, 1.1);
    knee.add(shoe);
    parts['foot' + S] = shoe;
  }

  // spine + torso
  const spine = new THREE.Group();
  spine.position.set(0, 0.12, 0);
  hips.add(spine);
  parts.spine = spine;
  const torso = mk(torsoGeo(), M.cloth, 0, 0, 0, true);
  torso.scale.set(bd.x, 1, bd.z); // breathing re-writes y/z from stored bases
  spine.add(torso);
  parts.torso = torso;
  casters.push(torso);

  // arms
  for (const sd of [-1, 1]) {
    const S = sd < 0 ? 'L' : 'R';
    const shoulder = new THREE.Group();
    shoulder.position.set(sd * bd.sx, 0.37, 0);
    spine.add(shoulder);
    parts['shoulder' + S] = shoulder;
    const upper = mk(geo('upperArm'), M.cloth, 0, -0.15, 0, true);
    upper.scale.set(r * sleeveScale, 1, r * sleeveScale);
    shoulder.add(upper);
    casters.push(upper);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.30, 0);
    shoulder.add(elbow);
    parts['elbow' + S] = elbow;
    const fore = mk(geo('forearm'), M.cloth, 0, -0.135, 0, true);
    fore.scale.set(r, 1, r);
    elbow.add(fore);
    casters.push(fore);
    const hand = new THREE.Group();
    hand.position.set(0, -0.27, 0);
    elbow.add(hand);
    parts['hand' + S] = hand;
    hand.add(mk(handGeo(sd), M.skin, 0, 0, 0));
  }

  // neck + head pivot
  const neck = new THREE.Group();
  neck.position.set(0, 0.40, 0);
  spine.add(neck);
  parts.neck = neck;
  const neckMesh = mk(geo('neck'), M.skin, 0, 0.045, 0);
  neckMesh.scale.set(bd.neck, 1, bd.neck);
  neck.add(neckMesh);
  const head = new THREE.Group();
  head.position.set(0, 0.155, 0.01); // world y 1.635 standing
  neck.add(head);
  parts.head = head;

  return { group: g, parts, casters };
}

// Face: skull, jaw, eyes+lids, brows, lips, hair, glasses, facial hair (§3).
function buildHead(parts, N, casters, traits) {
  const head = parts.head;
  head.scale.x = traits.faceW; // 0.96–1.05 face-width jitter

  const skinMat = getMat(N.skin, 0.55);
  const base = mk(headBaseGeo(), skinMat, 0, 0, 0, true);
  head.add(base);
  casters.push(base);

  // articulated jaw — rotation.x positive opens the mouth
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.025, -0.02);
  head.add(jaw);
  parts.jaw = jaw;
  const chin = mk(geo('chin'), skinMat, 0, -0.030, 0.040);
  chin.scale.set(0.92, 0.72, 0.95);
  jaw.add(chin);

  _c.copy(N.skin).offsetHSL(-0.02, 0.10, -0.13);
  const lipMat = getMat(_c, 0.5);
  const lipD = mk(geo('lowerLip'), lipMat, 0, -0.040, 0.112);
  jaw.add(lipD);
  parts.lipD = lipD;
  const lipU = mk(geo('upperLip'), lipMat, 0, -0.060, 0.096);
  head.add(lipU);
  parts.lipU = lipU;

  // aimable eyes + lids
  const whiteMat = getMat('#f2ece4', 0.30);
  const irisMat = getIrisMat(traits.iris);
  for (const sd of [-1, 1]) {
    const S = sd < 0 ? 'L' : 'R';
    const eye = new THREE.Group();
    eye.position.set(sd * 0.041, 0.020, 0.0945); // proud of the skull so the white reads
    head.add(eye);
    parts['eye' + S] = eye;
    eye.add(mk(geo('eyeWhite'), whiteMat, 0, 0, 0));
    eye.add(mk(geo('iris'), irisMat, 0, 0, 0.0196));
    const lid = new THREE.Group();
    lid.position.set(sd * 0.041, 0.020, 0.0945);
    head.add(lid);
    parts['lid' + S] = lid;
    // double-sided so the open shell's underside reads as skin, not a void;
    // parked fully back when open — the shell only shows mid-blink.
    lid.add(mk(geo('lid'), getMat(N.skin, 0.55, { ds: true }), 0, 0, 0));
    lid.rotation.x = -0.95; // open
  }

  // brows — hair color darkened ×0.7, outer ends slightly down
  _c.copy(N.hairColor).multiplyScalar(0.7);
  const browMat = getMat(_c, 0.85);
  for (const sd of [-1, 1]) {
    const brow = mk(geo('brow'), browMat, sd * 0.042, 0.058, 0.096);
    brow.rotation.z = sd * 0.10 * (sd < 0 ? 1 : 1) * (sd < 0 ? 1 : 1); // set below
    brow.rotation.z = sd < 0 ? -0.10 : 0.10;
    head.add(brow);
    parts[sd < 0 ? 'browL' : 'browR'] = brow;
  }

  // hair
  const hg = hairGeo(N.hair);
  if (hg) {
    const curlyish = N.hair === 'afro' || N.hair === 'curly';
    const hair = mk(hg, getMat(N.hairColor, curlyish ? 0.95 : 0.85), 0, 0, 0, true);
    head.add(hair);
    parts.hair = hair;
    casters.push(hair);
  } else parts.hair = null;

  if (traits.glasses) {
    head.add(mk(glassesGeo(), getMat('#2a2a2e', 0.35, { metalness: 0.6 }), 0, 0, 0));
  }

  if (traits.facialHair === 'stubble') {
    _c.copy(N.skin).lerp(N.hairColor, 0.55);
    const st = mk(geo('stubble'), getMat(_c, 0.8), 0, -0.052, 0.018);
    st.scale.set(0.96, 0.60, 0.92);
    head.add(st);
  } else if (traits.facialHair === 'mustache') {
    head.add(mk(geo('mustache'), getMat(N.hairColor, 0.85), 0, -0.048, 0.100));
  } else if (traits.facialHair === 'beard') {
    const bd2 = mk(geo('beard'), getMat(N.hairColor, 0.85), 0, -0.052, 0.030);
    bd2.scale.set(1.0, 0.80, 0.82);
    jaw.add(bd2); // moves with speech
  }
}

// Per-outfit chest pieces, drape and cuffs (§4). W = wardrobe plan.
function buildOutfit(parts, N, W, bd, h) {
  const sp = parts.spine, hips = parts.hips;

  const addSkirt = (geometry) => {
    const m = mk(geometry, getMat(W.torsoCol, W.rough, { cloth: true, ds: true }), 0, 0, 0, true);
    m.scale.set(bd.x, 1, bd.z + 0.06);
    hips.add(m);
    parts.skirt = m;
  };
  const addCuffs = (hex) => {
    const cm = getMat(hex, 0.55);
    for (const S of ['L', 'R']) {
      const cuff = mk(geo('cuff'), cm, 0, -0.255, 0);
      cuff.scale.set(bd.limb, 1, bd.limb);
      parts['elbow' + S].add(cuff);
    }
  };
  const addShirt = (hex) => sp.add(mk(geo('shirt'), getMat(hex, 0.7), 0, 0.295, 0.108));
  const addTrim = (kind) => sp.add(mk(trimGeo(kind), W.clothMat, 0, 0, 0));
  const tieMat = () => getMat(TIES6[Math.floor(hVal(h, 15) * 6)], 0.6);
  const gold = (rough, metal) => getMat('#b08d4f', rough, { metalness: metal });

  switch (W.kind) {
    case 'suit':
      addTrim('suit'); addShirt('#e9e6df');
      sp.add(mk(tieGeo(false), tieMat(), 0, 0, 0));
      addSkirt(skirtGeo('suit')); addCuffs('#e9e6df');
      break;
    case 'prosecutor':
      addTrim('blazer'); addShirt('#efe9ec'); // blouse, no tie
      addSkirt(skirtGeo('suit'));
      sp.add(mk(geo('necklace'), gold(0.35, 0.7), 0, 0.36, 0.05));
      break;
    case 'detective':
      addTrim('suit'); addShirt('#cfd2d6');
      sp.add(mk(tieGeo(true), tieMat(), 0, 0, 0)); // loosened
      sp.add(mk(geo('badge'), gold(0.3, 0.75), -0.07, 0.30, 0.118));
      addSkirt(skirtGeo('suit')); addCuffs('#cfd2d6');
      break;
    case 'labcoat':
      addTrim('blazer'); // small trim
      addShirt(CASUAL12[Math.floor(hVal(h, 10) * 12)]); // under-shirt by hash
      addSkirt(skirtGeo('lab')); addCuffs('#e9e6df');
      break;
    case 'robe': {
      addSkirt(robeGeo(N.seated)); // drape replaces skirt
      const tabMat = getMat('#fafafa', 0.6);
      for (const sd of [-1, 1]) {
        const tab = mk(geo('collarTab'), tabMat, sd * 0.016, 0.385, 0.112);
        tab.rotation.z = sd * 0.12;
        sp.add(tab);
      }
      break;
    }
    case 'apron': {
      const am = getMat('#3c332b', 0.88, { cloth: true });
      sp.add(mk(geo('bib'), am, 0, 0.24, 0.118));
      sp.add(mk(geo('apronPanel'), am, 0, 0.02, 0.128));
      for (const sd of [-1, 1]) sp.add(mk(geo('strap'), am, sd * 0.07, 0.34, 0.06));
      break;
    }
    case 'casual':
      if (W.cas < 0.40) { // crewneck in shirt color ×0.8
        _c.copy(W.torsoCol).multiplyScalar(0.8);
        sp.add(mk(geo('crewneck'), getMat(_c, 0.85), 0, 0.385, 0.01));
      } else if (W.cas < 0.75) { // open collar
        for (const sd of [-1, 1]) {
          const cl = mk(geo('openCollar'), W.clothMat, sd * 0.038, 0.375, 0.10);
          cl.rotation.z = sd * 0.5;
          sp.add(cl);
        }
      } // else sweater: bulkier torso, no collar (handled in the plan)
      break;
  }
}

// Resolve outfit class, colors and shared materials before building.
function planWardrobe(N, h) {
  const kind = outfitKind(N.outfit);
  const cas = hVal(h, 16); // casual collar/sweater variant channel
  const sweater = kind === 'casual' && cas >= 0.75;

  const defHex = OUTFIT_DEFAULTS[N.outfit] ?? OUTFIT_DEFAULTS[kind] ?? null;
  const torsoCol = new THREE.Color();
  if (N.outfitColor) torsoCol.copy(N.outfitColor);
  else if (defHex != null) torsoCol.set(defHex);
  else torsoCol.set(CASUAL12[Math.floor(hVal(h, 10) * 12)]);

  const rough = (kind === 'robe' || kind === 'labcoat') ? 0.92 : sweater ? 0.95 : 0.88;
  const clothMat = getMat(torsoCol, rough, { cloth: true });

  // trousers: suits darken the jacket; everyone else draws from the palette
  const formal = kind === 'suit' || kind === 'prosecutor' || kind === 'detective' || kind === 'robe';
  const trouserMat = formal
    ? getMat(_c.copy(torsoCol).multiplyScalar(0.8), 0.88, { cloth: true })
    : getMat(TROUSERS5[Math.floor(hVal(h, 11) * 5)], 0.88, { cloth: true });
  const shoeMat = formal ? getMat('#1a1612', 0.42) : getMat('#2e2a26', 0.6);

  return { kind, cas, sweater, torsoCol, rough, clothMat, trouserMat, shoeMat };
}

// ---------- poses (§5) — absolute-set via the _base snapshot ----------

// _base indices (flat Float32Array; animator writes base + offsets each frame)
const B_SPINE_X = 0, B_SL_X = 1, B_SL_Z = 2, B_SR_X = 3, B_SR_Z = 4,
  B_EL_X = 5, B_ER_X = 6, B_HIP_X = 7, B_HIP_Y = 8;

function applyBasePose(p) {
  const P = p.parts, seated = p.seated;
  const hipsY = seated ? 0.54 : 0.96; // seated drop of 0.42 → head at group-y + 1.215
  P.hips.position.set(0, hipsY, 0);
  P.hips.rotation.set(0, 0, 0);
  const spineX = (seated ? 0.06 : 0.02) + p._ageSlump;
  P.spine.rotation.set(spineX, 0, 0);
  const shX = seated ? -0.32 : 0.04;
  P.shoulderL.rotation.set(shX, 0, -0.08);
  P.shoulderR.rotation.set(shX, 0, 0.08);
  const elX = seated ? -0.62 : -0.12;
  P.elbowL.rotation.set(elX, 0, 0);
  P.elbowR.rotation.set(elX, 0, 0);
  if (seated) { // thighs near-horizontal, hands land on the lap
    P.hipL.rotation.set(-1.42, -0.06, 0);
    P.hipR.rotation.set(-1.42, 0.06, 0);
    P.kneeL.rotation.set(1.32, 0, 0);
    P.kneeR.rotation.set(1.32, 0, 0);
  } else {
    P.hipL.rotation.set(0, 0, 0);
    P.hipR.rotation.set(0, 0, 0);
    P.kneeL.rotation.set(0.04, 0, 0);
    P.kneeR.rotation.set(0.04, 0, 0);
  }
  const B = p._base;
  B[B_SPINE_X] = spineX;
  B[B_SL_X] = shX; B[B_SL_Z] = -0.08;
  B[B_SR_X] = shX; B[B_SR_Z] = 0.08;
  B[B_EL_X] = elX; B[B_ER_X] = elX;
  B[B_HIP_X] = 0; B[B_HIP_Y] = hipsY;
}

// ---------- makePerson ----------

let _goldenCounter = 0; // phase source for the id-less fixed cast

export function makePerson(spec = {}) {
  const N = {
    skin: new THREE.Color(spec.skin ?? '#c68863'),
    hair: spec.hair ?? 'short',
    hairColor: new THREE.Color(spec.hairColor ?? '#33291f'),
    outfit: typeof spec.outfit === 'string' ? spec.outfit : 'casual',
    outfitColor: spec.outfitColor != null ? new THREE.Color(spec.outfitColor) : null,
    seated: !!spec.seated,
    scale: spec.scale ?? 1,
    build: BUILDS[spec.build] ? spec.build : 'average',
    id: spec.id ?? null,
  };
  const bd = BUILDS[N.build];

  // Master hash: ids drive the §7.2 trait table; the id-less fixed cast still
  // needs deterministic wardrobe picks (tie/collar), so hash the spec colors.
  const h = hashHue(N.id ?? (N.outfit + ':' + N.skin.getHexString() + ':' + N.hairColor.getHexString()));

  // accessory/phase traits (salt 7..14) — only derived when an id is present
  const traits = { glasses: false, facialHair: 'none', iris: '#3b2a1e', faceW: 1 };
  let phase, older = false;
  if (N.id != null) {
    const male = hVal(h, 3) < 0.5;
    traits.glasses = hVal(h, 8) < 0.25;
    if (male && hVal(h, 9) < 0.30) {
      const r = hVal(h, 19);
      traits.facialHair = r < 0.5 ? 'stubble' : r < 0.75 ? 'mustache' : 'beard';
    }
    traits.iris = IRIS6[Math.floor(hVal(h, 12) * 6)];
    traits.faceW = 0.96 + 0.09 * hVal(h, 13);
    phase = hVal(h, 14) * Math.PI * 2;
    older = hVal(h, 7) > 0.72;
  } else {
    phase = (_goldenCounter++ * 2.399963) % (Math.PI * 2);
  }
  if (spec.glasses !== undefined) traits.glasses = !!spec.glasses;
  if (spec.facialHair !== undefined) traits.facialHair = spec.facialHair;
  if (spec.iris !== undefined) traits.iris = spec.iris;

  const W = planWardrobe(N, h);
  const M = {
    skin: getMat(N.skin, 0.55),
    cloth: W.clothMat,
    trouser: W.trouserMat,
    shoe: W.shoeMat,
  };
  const { group, parts, casters } = buildSkeleton(bd, M, W.kind === 'robe' ? 1.6 : 1);
  buildHead(parts, N, casters, traits);
  buildOutfit(parts, N, W, bd, h);
  if (parts.skirt) casters.push(parts.skirt);

  // legacy aliases — old code animated these names directly
  parts.armL = parts.shoulderL;
  parts.armR = parts.shoulderR;
  parts.mouth = parts.jaw;

  // torso base scales (breathing re-writes y/z absolutely each frame)
  const bulk = W.sweater ? 1.04 : 1;
  parts.torso.scale.set(bd.x * bulk, 1, bd.z * bulk);

  group.scale.setScalar(N.scale);

  const person = {
    group,
    parts,
    talking: false,
    mood: 'neutral', // neutral | stressed | down
    pointT: 0,       // objection point-pose timer (scene sets 1.6; we decay it)
    phase,
    baseHeadY: N.seated ? 1.215 : 1.635, // pre-group.scale head offset
    focused: true,   // scene-driven LOD flag
    seated: N.seated,
    spec: N,
    // animation state (all preallocated — updatePerson allocates nothing)
    _look: new THREE.Vector3(),
    _hasLook: false,
    _acc: 0,
    _talkAmt: 0, _gestAmt: 0, _stressAmt: 0, _downAmt: 0,
    _headYaw: 0, _headPitch: 0, _eyeYaw: 0, _eyePitch: 0, _pointAmt: 0,
    _base: new Float32Array(9),
    _tsy: 1, _tsz: bd.z * bulk,
    _ageSlump: older ? 0.04 : 0,
    _agePitch: older ? 0.03 : 0,
    _gestMul: older ? 0.7 : 1,
    blinkPeriod: 2.4 + 3.2 * frac(phase * 1.7),
  };
  person.lookAt = (v) => {
    if (v) { person._look.set(v.x, v.y, v.z); person._hasLook = true; }
    else person._hasLook = false;
  };
  person.setShadows = (on) => { for (const m of casters) m.castShadow = on; };
  person.update = (t, dt) => updatePerson(person, t, dt);

  applyBasePose(person);
  return person;
}

// ---------- per-frame animation (§6) — one hot function, zero allocations ----------

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

function updatePerson(p, t, dt) {
  // 1. LOD early-out: background people tick at 4 Hz (2.5 Hz at medium/low)
  let bg = false;
  if (!p.focused) {
    p._acc += dt;
    if (p._acc < _lodWindow) return;
    dt = p._acc; p._acc = 0; bg = true;
  }
  const P = p.parts, B = p._base, s = t + p.phase;

  // 2. mood envelopes
  const kM = 1 - Math.exp(-dt * 2.0);
  p._stressAmt += ((p.mood === 'stressed' ? 1 : 0) - p._stressAmt) * kM;
  p._downAmt += ((p.mood === 'down' ? 1 : 0) - p._downAmt) * kM;
  const st = p._stressAmt, dn = p._downAmt;

  // objection envelope — computed up front so gestures can defer to it;
  // attack overshoots via easeOutBack, then decays over ~1.1 s
  let pa = 0;
  if (p.pointT > 0) {
    p.pointT = Math.max(0, p.pointT - dt);
    const u = 1.6 - p.pointT;
    pa = u < 0.5 ? easeOutBack(u / 0.5) : smoothstep01(p.pointT / 1.1);
  }
  p._pointAmt = pa;

  // 3. breathing — faster/deeper when stressed; shoulders ride high
  const br = Math.sin(s * (1.4 + st * 0.9));
  const amp = 1 + st * 0.5;
  P.torso.scale.y = p._tsy * (1 + 0.012 * amp * br);
  P.torso.scale.z = p._tsz * (1 + 0.018 * amp * br);
  const lift = 0.012 * st;
  P.shoulderL.position.y = 0.37 + 0.005 * amp * br + lift;
  P.shoulderR.position.y = 0.37 + 0.005 * amp * br + lift;
  P.neck.position.y = 0.40 + 0.003 * br;

  // 4. posture/mood
  let spineX = B[B_SPINE_X] + 0.04 * st + 0.10 * dn;
  const moodPitch = 0.07 * st + 0.26 * dn + p._agePitch;
  const browY = 0.058 - 0.006 * dn;
  P.browL.position.y = browY;
  P.browR.position.y = browY;

  // 5/6. stance sway (standing) or micro-fidgets (seated, scaled by stress)
  let spineY = 0, spineZ = 0, idleYaw = 0;
  if (!p.seated) {
    P.hips.position.x = B[B_HIP_X] + 0.012 * S2(s * 0.31);
    P.hips.rotation.z = 0.020 * S2(s * 0.31 + 0.5);
    spineZ = -0.015 * S2(s * 0.31 + 0.5);
  } else {
    const f = 1 + st;
    P.hips.rotation.y = 0.045 * S2(s * 0.11) * f;
    spineY = 0.03 * S2(s * 0.07 + 4) * f;
    idleYaw = 0.06 * S2(s * 0.17 + 2) * f;
  }

  // 7. gaze — head takes 65% of the turn, eyes lead with the remainder.
  // Background people freeze their current gaze (no smoothing).
  if (!bg) {
    let ty = 0, tp = 0, hyT, hpT;
    if (p._hasLook) {
      // Head world position computed analytically: the scene only ever sets
      // group.position and group.rotation.y (uniform scale), and the head sits
      // on the group's local Y axis — so world head = position + (0, baseHeadY·scale, 0).
      const grp = p.group;
      _v1.set(grp.position.x, grp.position.y + p.baseHeadY * grp.scale.x, grp.position.z);
      _v2.subVectors(p._look, _v1);
      const ry = grp.rotation.y, cy = Math.cos(ry), sy = Math.sin(ry);
      const lx = _v2.x * cy - _v2.z * sy; // rotate into character space (-ry about Y)
      const lz = _v2.x * sy + _v2.z * cy;
      ty = Math.atan2(lx, lz); // 0 = straight ahead +z
      tp = -Math.atan2(_v2.y, Math.hypot(lx, lz));
      hyT = clamp(ty * 0.65, -0.6, 0.6);
      hpT = clamp(tp * 0.7, -0.35, 0.45);
    } else { // idle wander
      hyT = 0.05 * Math.sin(s * 0.23);
      hpT = 0;
    }
    const k35 = 1 - Math.exp(-dt * 3.5);
    p._headYaw += (hyT - p._headYaw) * k35;
    p._headPitch += (hpT - p._headPitch) * k35;
    const eyT = p._hasLook ? clamp(ty - p._headYaw, -0.35, 0.35) : 0;
    const epT = p._hasLook ? clamp(tp - p._headPitch, -0.35, 0.35) : 0;
    const k12 = 1 - Math.exp(-dt * 12);
    p._eyeYaw += (eyT - p._eyeYaw) * k12;
    p._eyePitch += (epT - p._eyePitch) * k12;
  }

  // arm channels start at the base pose every frame — absolute set, no drift
  let sLx = B[B_SL_X], sLz = B[B_SL_Z], sRx = B[B_SR_X], sRz = B[B_SR_Z];
  let eLx = B[B_EL_X], eRx = B[B_ER_X];

  // 8. talking performance
  const kT = 1 - Math.exp(-dt * (p.talking ? 6 : 4));
  p._talkAmt += ((p.talking ? 1 : 0) - p._talkAmt) * kT;
  const ta = p._talkAmt;
  // jaw syllables — kept even in the background path (three sines, reads at distance)
  const syl = Math.max(0, Math.sin(s * 11.5) + 0.3 * Math.sin(s * 19.1))
    * (0.55 + 0.45 * Math.sin(s * 2.7));
  P.jaw.rotation.x = (0.04 + 0.14 * Math.min(1, syl)) * ta;

  let talkNod = 0, talkYaw = 0, talkTilt = 0;
  p._gestAmt = 0;
  if (!bg && ta > 0.002) {
    talkNod = (0.05 * Math.sin(s * 1.9) + 0.03 * Math.sin(s * 4.3)) * ta;
    talkYaw = 0.05 * Math.sin(s * 0.9) * ta;
    talkTilt = 0.03 * Math.sin(s * 1.3) * ta;
    // alternating beat gestures: raise, hold while waving, return (period 2.1 s)
    const n = Math.floor(s / 2.1), u = s / 2.1 - n;
    const env = smoothstep01(u / 0.25) * (1 - smoothstep01((u - 0.70) / 0.30));
    const cyc = (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(n * 12.9898 + p.phase)))
      * p._gestMul * (p.seated ? 0.5 : 1); // seated: stay above the table line
    const g = env * cyc * ta * (1 - 0.7 * dn);
    p._gestAmt = g;
    const wave = -0.90 + 0.25 * Math.sin(s * 5.3); // forearm "making a point"
    if ((n & 1) === 0) { // right arm — yields to the objection point
      if (pa <= 0.2) { sRx -= 0.50 * g; eRx += wave * g; sRz -= 0.10 * g; }
    } else {
      sLx -= 0.50 * g; eLx += wave * g; sLz += 0.10 * g;
    }
  }

  // 9. listening idle — one slow nod every ~14 s
  let nodPitch = 0;
  if (!bg && !p.talking) {
    const nv = Math.max(0, Math.sin(s * 0.43));
    nodPitch = 0.06 * nv ** 6 * (1 - dn * 0.7);
  }

  // 10. blink scheduler (deterministic per character; 'down' = half-lidded)
  let lidX = -0.95 + 0.50 * dn;
  if (!(bg && _quality === 'low')) { // low tier: background lids stay open
    const local = (t + p.phase * 10) % p.blinkPeriod;
    const dur = p.focused ? 0.12 : 0.26; // wide window survives 4 Hz sampling
    if (local < dur) lidX += (1.05 - lidX) * Math.sin(Math.PI * local / dur);
  }
  P.lidL.rotation.x = lidX;
  P.lidR.rotation.x = lidX;

  // 11. objection point — lerp every channel toward the locked point pose
  if (pa > 0) {
    sRx += (-1.95 - sRx) * pa; // arm thrust forward-up
    sRz += (0.05 - sRz) * pa;
    eRx += (-0.06 - eRx) * pa; // elbow locked
    spineX += (0.14 - spineX) * pa;  // lean in
    spineY += (-0.15 - spineY) * pa; // right shoulder leads
    sLx += (0.04 - sLx) * pa; // left arm to standing rest
    sLz += (-0.08 - sLz) * pa;
    eLx += (-0.12 - eLx) * pa;
  }

  // 12. final absolute writes
  P.spine.rotation.x = spineX;
  P.spine.rotation.y = spineY;
  P.spine.rotation.z = spineZ;
  P.shoulderL.rotation.x = sLx; P.shoulderL.rotation.z = sLz;
  P.shoulderR.rotation.x = sRx; P.shoulderR.rotation.z = sRz;
  P.elbowL.rotation.x = eLx;
  P.elbowR.rotation.x = eRx;
  let hx = p._headPitch + moodPitch + talkNod + nodPitch;
  if (pa > 0) hx += (-0.10 - hx) * pa; // chin up
  P.head.rotation.x = hx;
  P.head.rotation.y = p._headYaw + idleYaw + talkYaw;
  P.head.rotation.z = talkTilt;
  P.eyeL.rotation.x = p._eyePitch; P.eyeL.rotation.y = p._eyeYaw;
  P.eyeR.rotation.x = p._eyePitch; P.eyeR.rotation.y = p._eyeYaw;
  P.browL.rotation.z = -0.10 - 0.20 * st - 0.28 * dn - 0.15 * pa; // knit / emphatic
  P.browR.rotation.z = 0.10 + 0.20 * st + 0.28 * dn + 0.15 * pa;
}

// ---------- civilians (§7.2 derivation table) ----------

export function randomCivilian(id, seated = true) {
  const h = hashHue(id);
  const r = (n) => hVal(h, n);
  const r2 = r(2);
  const male = r(3) < 0.5;
  let hairColor = HAIR_COLORS8[Math.floor(r(6) * 8)];
  if (r(7) > 0.72) hairColor = GRAY_HAIR3[Math.floor(r(17) * 3)]; // older: gray hair
  return makePerson({
    skin: SKINS9[Math.floor(r(4) * 9)],
    hair: (male ? MALE_HAIR : FEMALE_HAIR)[Math.floor(r(5) * 8)],
    hairColor,
    outfit: 'casual',
    outfitColor: CASUAL12[Math.floor(r(10) * 12)],
    build: r2 < 0.30 ? 'slim' : r2 < 0.75 ? 'average' : 'broad',
    seated,
    scale: 0.92 + 0.16 * r(1),
    id, // makePerson derives glasses/facial hair/iris/face width/phase itself
  });
}

// ---------- quality tiers (§8.5) ----------

export function setCharacterQuality(tier) {
  if (tier !== 'high' && tier !== 'medium' && tier !== 'low') return;
  _quality = tier;
  _lodWindow = tier === 'high' ? 0.25 : 0.4;
  const bump = tier === 'high' ? getFabricBump() : null;
  for (const m of _clothMats) {
    if (m.bumpMap !== bump) {
      m.bumpMap = bump;
      m.bumpScale = 0.0015;
      m.needsUpdate = true;
    }
  }
}
