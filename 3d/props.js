// All static courtroom architecture, furniture and decor, plus the lighting
// rig. Static geometry is merged into one mesh per material wherever a group
// repeats (pews, balusters, pilasters, trim) to keep draw calls down.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeCanvasTexture, mulberry32, texVariant } from './textures.js';

const PI = Math.PI;

// ---------- merge helper ----------
// Collects transformed geometry clones and flushes them as ONE mesh.
class Merger {
  constructor(material) {
    this.material = material;
    this.geos = [];
  }
  add(geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.clone();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(m);
    this.geos.push(g);
    return this;
  }
  box(w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.add(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
  }
  cyl(rTop, rBot, h, x, y, z, rx = 0, ry = 0, rz = 0, segs = 16) {
    return this.add(new THREE.CylinderGeometry(rTop, rBot, h, segs), x, y, z, rx, ry, rz);
  }
  flush(parent, { cast = true, receive = true } = {}) {
    if (!this.geos.length) return null;
    const merged = mergeGeometries(this.geos, false);
    for (const g of this.geos) g.dispose();
    this.geos = [];
    const mesh = new THREE.Mesh(merged, this.material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  }
}

function box(w, h, d, material, x, y, z, parent, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

function flat(color, rough = 0.8, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, ...opts });
}

// ---------- the room ----------
export function buildCourtroom(scene, MATS) {
  buildShell(scene, MATS);
  buildWindows(scene, MATS);
  buildBench(scene, MATS);
  buildWitnessBox(scene, MATS);
  buildClerkReporter(scene, MATS);
  buildJuryBox(scene, MATS);
  buildCounselTables(scene, MATS);
  buildBarRail(scene, MATS);
  buildPews(scene, MATS);
  buildDoors(scene, MATS);
  buildDecor(scene, MATS);
}

// ----- floor, walls, ceiling, trim, pilasters -----
function buildShell(scene, MATS) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 32), MATS.floorOak);
  floor.rotation.x = -PI / 2;
  floor.position.set(0, 0, 3);
  floor.receiveShadow = true;
  scene.add(floor);

  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(15, 9.6), MATS.carpet);
  carpet.rotation.x = -PI / 2;
  carpet.position.set(0, 0.012, 0);
  carpet.receiveShadow = true;
  scene.add(carpet);
  box(15, 0.02, 0.05, MATS.brass, 0, 0.02, 4.8, scene, { cast: false });
  box(15, 0.02, 0.05, MATS.brass, 0, 0.02, -4.8, scene, { cast: false });

  // walls: sealed box; front (z=12) split around the door opening (3.2 x 3.4)
  box(26, 9, 0.4, MATS.plasterBack, 0, 4.5, -9, scene);
  box(11.4, 9, 0.4, texVariant(MATS, 'plasterBack', 5.7, 4.5), -7.3, 4.5, 12, scene);
  box(11.4, 9, 0.4, texVariant(MATS, 'plasterBack', 5.7, 4.5), 7.3, 4.5, 12, scene);
  box(3.2, 5.6, 0.4, texVariant(MATS, 'plasterBack', 1.6, 2.8), 0, 6.2, 12, scene);
  box(0.4, 9, 32, MATS.plasterSide, -12, 4.5, 3, scene);
  box(0.4, 9, 32, MATS.plasterSide, 12, 4.5, 3, scene);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(26, 32), MATS.cofferCeiling);
  ceil.rotation.x = PI / 2;
  ceil.position.set(0, 9, 3);
  scene.add(ceil);

  // wainscot
  box(26, 2.6, 0.18, MATS.wainscotBack, 0, 1.3, -8.78, scene);
  box(11.4, 2.6, 0.18, MATS.wainscotFront, -7.3, 1.3, 11.78, scene);
  box(11.4, 2.6, 0.18, MATS.wainscotFront, 7.3, 1.3, 11.78, scene);
  box(0.18, 2.6, 32, MATS.wainscotSide, -11.78, 1.3, 3, scene);
  box(0.18, 2.6, 32, MATS.wainscotSide, 11.78, 1.3, 3, scene);

  // chair rail (gloss) + baseboard, split around the doors on the front wall
  const rail = new Merger(MATS.mahoganyGloss);
  rail.box(26, 0.09, 0.05, 0, 2.62, -8.66)
    .box(11.4, 0.09, 0.05, -7.3, 2.62, 11.66)
    .box(11.4, 0.09, 0.05, 7.3, 2.62, 11.66)
    .box(0.05, 0.09, 32, -11.66, 2.62, 3)
    .box(0.05, 0.09, 32, 11.66, 2.62, 3);
  rail.flush(scene, { cast: false });

  const base = new Merger(flat(0x241509, 0.85));
  base.box(26, 0.18, 0.04, 0, 0.09, -8.76)
    .box(11.4, 0.18, 0.04, -7.3, 0.09, 11.76)
    .box(11.4, 0.18, 0.04, 7.3, 0.09, 11.76)
    .box(0.04, 0.18, 32, -11.76, 0.09, 3)
    .box(0.04, 0.18, 32, 11.76, 0.09, 3);
  base.flush(scene, { cast: false });

  // crown molding, two stacked plaster steps, all four walls
  const crown = new Merger(MATS.plasterTrim);
  for (const [w, d, x, z] of [[26, 0.12, 0, -8.74], [26, 0.12, 0, 11.74], [0.12, 32, -11.74, 3], [0.12, 32, 11.74, 3]]) {
    crown.box(w, 0.18, d, x, 8.52, z);
  }
  for (const [w, d, x, z] of [[26, 0.22, 0, -8.69], [26, 0.22, 0, 11.69], [0.22, 32, -11.69, 3], [0.22, 32, 11.69, 3]]) {
    crown.box(w, 0.3, d, x, 8.76, z);
  }
  crown.flush(scene, { cast: false });

  // pilasters: plaster shafts + capitals merged; marble bases merged
  const shafts = new Merger(MATS.plasterTrim);
  const bases = new Merger(MATS.marble);
  const pil = (x, z, side) => {
    // side walls: proud in x; back/front walls: proud in z
    const [w, d] = side === 'x' ? [0.25, 0.45] : [0.45, 0.25];
    shafts.box(w, 7.9, d, x, 4.5, z);
    shafts.box(side === 'x' ? 0.3 : 0.55, 0.28, side === 'x' ? 0.55 : 0.3, x, 8.55, z);
    bases.box(side === 'x' ? 0.32 : 0.6, 0.55, side === 'x' ? 0.6 : 0.32, x, 0.275, z);
  };
  for (const z of [-8, -4, 0, 4, 8]) pil(-11.72, z, 'x');
  for (const z of [-6.5, -1.5, 3.5, 8.5]) pil(11.72, z, 'x');
  for (const x of [-8, -4, 4, 8]) pil(x, -8.72, 'z');
  for (const x of [-8, -4, 4, 8]) pil(x, 11.72, 'z');
  shafts.flush(scene);
  bases.flush(scene);

  // HVAC vents
  const ventTex = makeCanvasTexture(128, (ctx, w, h) => {
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3c3c3c';
    ctx.lineWidth = 4;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(6, 10 + i * 11);
      ctx.lineTo(w - 6, 10 + i * 11);
      ctx.stroke();
    }
  });
  const ventMat = new THREE.MeshStandardMaterial({ map: ventTex, roughness: 0.7 });
  const vents = new Merger(ventMat);
  for (const [x, z] of [[-9, -8.74], [9, -8.74], [-9, 11.74], [9, 11.74]]) {
    vents.box(0.9, 0.5, 0.05, x, 8.2, z);
  }
  vents.flush(scene, { cast: false });
}

// ----- windows (+x wall): frames, muntins, glass, shafts, sun pools -----
function buildWindows(scene, MATS) {
  const frames = new Merger(MATS.mahoganyFlat);
  const sills = new Merger(MATS.marble);
  const glassGeos = new Merger(MATS.frostedGlass);

  for (const z of [-4, 1, 6]) {
    frames.box(0.42, 4.6, 0.14, 11.7, 4.5, z - 0.97)   // jambs (deep reveal)
      .box(0.42, 4.6, 0.14, 11.7, 4.5, z + 0.97)
      .box(0.42, 0.14, 2.08, 11.7, 6.87, z)            // head
      .box(0.08, 0.25, 2.0, 11.66, 1.98, z)            // apron
      .box(0.045, 4.5, 0.05, 11.7, 4.5, z)             // vertical muntin
      .box(0.05, 0.045, 1.7, 11.7, 3.35, z)            // horizontal muntins
      .box(0.05, 0.045, 1.7, 11.7, 4.5, z)
      .box(0.05, 0.045, 1.7, 11.7, 5.65, z);
    sills.box(0.5, 0.1, 2.3, 11.55, 2.15, z);
    glassGeos.add(new THREE.PlaneGeometry(1.7, 4.5), 11.92, 4.5, z, 0, -PI / 2, 0);
  }
  frames.flush(scene);
  sills.flush(scene, { cast: false });
  const glass = glassGeos.flush(scene, { cast: false, receive: false });
  glass.material = MATS.frostedGlass;

  // light shafts (additive cards) + sun pools on the floor
  for (const z of [-4, 1, 6]) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 3.8), MATS.shaftMat);
    a.position.set(8.2, 3.6, z + 0.3);
    a.rotation.set(0, 0.10, -0.42);
    a.renderOrder = 10;
    const b = a.clone();
    b.rotateX(0.6);
    scene.add(a, b);
  }
  for (const z of [-3.1, 1.9, 6.9]) {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.6), MATS.poolMat);
    pool.rotation.x = -PI / 2;
    pool.position.set(1.7, 0.013, z);
    pool.renderOrder = 9;
    scene.add(pool);
  }
}

// ----- judge bench -----
function buildBench(scene, MATS) {
  const g = new THREE.Group();
  g.position.set(0, 0, -6.6);
  scene.add(g);

  // Bench wall tops out at ~2.45 so the seated judge (head y ≈ 3.42) presides
  // OVER it — and stays visible from the well's low angles.
  box(8.2, 0.55, 3.6, MATS.mahoganyFlat, 0, 0.275, -0.2, g);       // dais
  box(2.4, 0.18, 0.5, MATS.mahoganyFlat, 0, 0.09, 1.75, g);        // step
  box(5.8, 1.65, 1.6, MATS.mahoganyFlat, 0, 1.375, 0, g);          // body (0.55..2.2)
  for (const x of [-2.1, -0.7, 0.7, 2.1]) {                        // front paneling
    box(1.38, 1.4, 0.07, MATS.mahoganyPanel, x, 1.4, 0.84, g);
  }
  for (const s of [-1, 1]) {                                       // side wings
    const wing = new THREE.Group();
    wing.position.set(s * 3.3, 0, 0.35);
    wing.rotation.y = -s * 0.42;
    g.add(wing);
    box(1.7, 1.5, 1.1, MATS.mahoganyFlat, 0, 1.45, 0, wing);
    box(1.0, 1.2, 0.06, MATS.mahoganyPanel, 0, 1.5, 0.58, wing);
  }
  box(6.3, 0.12, 2.0, MATS.mahoganyGloss, 0, 2.26, 0, g);          // top cap [chamfer]
  box(6.3, 0.15, 0.08, MATS.mahoganyGloss, 0, 2.37, 0.95, g);      // privacy lip

  // seal + ring
  const sealTex = makeSealTexture();
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 32),
    new THREE.MeshStandardMaterial({ map: sealTex, metalness: 0.6, roughness: 0.45 }));
  seal.rotation.x = PI / 2;
  seal.position.set(0, 1.4, 0.92);
  g.add(seal);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 8, 32), MATS.brass);
  ring.position.set(0, 1.4, 0.94);
  g.add(ring);

  // banker lamp
  const lamp = new THREE.Group();
  lamp.position.set(-1.7, 2.32, 0.4);
  g.add(lamp);
  const lbase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12), MATS.brass);
  lamp.add(lbase);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), MATS.brass);
  stem.position.y = 0.15;
  lamp.add(stem);
  const shade = new THREE.Mesh(new THREE.LatheGeometry(
    [[0, 0], [0.16, 0.02], [0.19, 0.10], [0.12, 0.16]].map(p => new THREE.Vector2(p[0], p[1])), 20),
    MATS.lampGreen);
  shade.position.y = 0.28;
  shade.rotation.x = -0.3;
  lamp.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), MATS.bulbWarm);
  bulb.position.y = 0.26;
  lamp.add(bulb);
  lamp.traverse(o => { o.castShadow = false; });

  addGooseneckMic(g, MATS, 0.45, 2.32, 0.55);

  // gavel + sound block + nameplate
  const gavel = new Merger(MATS.mahoganyGloss);
  gavel.cyl(0.075, 0.075, 0.03, 0.95, 2.345, 0.3)
    .cyl(0.045, 0.045, 0.13, 0.78, 2.375, 0.32, 0, 0, PI / 2)
    .cyl(0.016, 0.016, 0.24, 0.68, 2.36, 0.42, PI / 2, 0.6, 0);
  gavel.flush(g, { cast: false });

  const plateTex = makeCanvasTexture([256, 64], (ctx, w, h) => {
    ctx.fillStyle = '#7a5a28';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2a1c0c';
    ctx.font = 'bold 40px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HON. J. CALDWELL', w / 2, h / 2 + 2);
  });
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.03),
    new THREE.MeshStandardMaterial({ map: plateTex, metalness: 0.5, roughness: 0.4 }));
  plate.position.set(0, 2.42, 0.97);
  g.add(plate);

  // high-back judge chair rising behind the judge
  box(0.7, 1.1, 0.12, MATS.leatherDark, 0, 2.95, -0.95, g, { cast: false });
  box(0.5, 0.3, 0.1, MATS.leatherDark, 0, 3.55, -0.95, g, { cast: false });
}

function addGooseneckMic(parent, MATS, x, y, z) {
  const mic = new THREE.Group();
  mic.position.set(x, y, z);
  parent.add(mic);
  const mbase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 10), MATS.blackMatte);
  mic.add(mbase);
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, 0.18, 0.06), new THREE.Vector3(-0.02, 0.3, 0.12));
  const neck = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.012, 6), MATS.blackMatte);
  mic.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), MATS.blackMatte);
  head.position.set(-0.02, 0.3, 0.12);
  mic.add(head);
  mic.traverse(o => { o.castShadow = false; });
  return mic;
}

// ----- witness box (preserves witness seat: person group at (-3.6, 0.75, -4.8)) -----
function buildWitnessBox(scene, MATS) {
  const g = new THREE.Group();
  g.position.set(-3.6, 0, -4.7);
  scene.add(g);

  box(2.2, 0.3, 2.0, MATS.mahoganyFlat, 0, 0.15, 0, g);            // platform
  box(1.9, 1.05, 0.07, MATS.mahoganyPanel, 0, 0.82, 0.95, g);      // front panel
  box(0.07, 1.05, 1.8, MATS.mahoganyPanel, -0.95, 0.82, 0, g);     // side panels
  box(0.07, 1.05, 1.8, MATS.mahoganyPanel, 0.95, 0.82, 0, g);
  const cap = new Merger(MATS.mahoganyGloss);                      // cap rail (U)
  cap.box(2.1, 0.06, 0.16, 0, 1.38, 0.95)
    .box(0.16, 0.06, 1.9, -0.95, 1.38, 0)
    .box(0.16, 0.06, 1.9, 0.95, 1.38, 0);
  cap.flush(g, { cast: false });

  // leather armchair on the platform (seat top at world y 0.75)
  box(0.5, 0.12, 0.48, MATS.leatherDark, -0.05, 0.69, -0.1, g);
  const chairBack = box(0.5, 0.55, 0.1, MATS.leatherDark, -0.05, 1.0, -0.38, g);
  chairBack.rotation.x = -0.12;
  box(0.08, 0.25, 0.45, MATS.leatherDark, -0.34, 0.82, -0.1, g, { cast: false });
  box(0.08, 0.25, 0.45, MATS.leatherDark, 0.24, 0.82, -0.1, g, { cast: false });
  const legs = new Merger(MATS.mahoganyFlat);
  for (const [lx, lz] of [[-0.26, -0.3], [0.16, -0.3], [-0.26, 0.1], [0.16, 0.1]]) {
    legs.cyl(0.025, 0.025, 0.34, lx - 0.05, 0.47, lz, 0, 0, 0, 8);
  }
  legs.flush(g, { cast: false });

  addGooseneckMic(g, MATS, 0.6, 1.41, 0.8);
}

// ----- clerk desk + court reporter station -----
function buildClerkReporter(scene, MATS) {
  const clerk = new THREE.Group();
  clerk.position.set(2.6, 0, -5.4);
  clerk.rotation.y = -0.25;
  scene.add(clerk);
  box(1.7, 1.05, 0.85, MATS.mahoganyFlat, 0, 0.525, 0, clerk);
  box(1.55, 0.95, 0.06, MATS.mahoganyPanel, 0, 0.5, 0.45, clerk);
  box(1.8, 0.08, 0.95, MATS.mahoganyGloss, 0, 1.09, 0, clerk);
  for (let i = 0; i < 3; i++) {
    const sheet = box(0.3, 0.012, 0.4, MATS.paperWhite, -0.35, 1.14 + i * 0.013, 0, clerk, { cast: false });
    sheet.rotation.y = [0.06, -0.04, 0.1][i];
  }
  const stamp = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.07, 8), MATS.blackMatte);
  stamp.position.set(0.45, 1.17, 0.1);
  stamp.castShadow = false;
  clerk.add(stamp);
  box(0.5, 0.6, 0.12, MATS.leatherDark, 0, 0.7, -0.7, clerk, { cast: false }); // chair back

  const rep = new THREE.Group();
  rep.position.set(-1.5, 0, -3.3);
  rep.rotation.y = 0.35;
  scene.add(rep);
  box(0.85, 0.72, 0.55, MATS.mahoganyFlat, 0, 0.36, 0, rep);
  // stenotype on a splayed tripod, keys merged in
  const stenoTex = makeCanvasTexture(64, (ctx, w, h) => {
    ctx.fillStyle = '#1d1b18';
    ctx.fillRect(0, 0, w, h);
  });
  const steno = new THREE.Group();
  steno.position.set(0, 0.62, 0.32);
  rep.add(steno);
  const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.24),
    new THREE.MeshStandardMaterial({ map: stenoTex, roughness: 0.7 }));
  wedge.rotation.x = -0.25;
  steno.add(wedge);
  const keys = new Merger(flat(0x3a3f44, 0.6));
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 8; c++) {
      keys.box(0.02, 0.02, 0.02, -0.105 + c * 0.03, 0.06 - r * 0.012, 0.04 + r * 0.05);
    }
  }
  keys.flush(steno, { cast: false });
  const tripod = new Merger(MATS.blackMatte);
  for (const a of [0, 2.1, 4.2]) {
    tripod.cyl(0.012, 0.012, 0.55, Math.sin(a) * 0.1, -0.28, Math.cos(a) * 0.1, 0.2 * Math.cos(a), 0, 0.2 * Math.sin(a), 8);
  }
  tripod.flush(steno, { cast: false });
  box(0.5, 0.6, 0.12, MATS.leatherDark, 0, 0.7, -0.45, rep, { cast: false }); // chair back
}

// ----- jury box (preserves juror seats: (7.0/8.15, 0.5/0.78, -5.3 + col*1.15)) -----
function buildJuryBox(scene, MATS) {
  const g = new THREE.Group();
  g.position.set(7.2, 0, -2.4);
  scene.add(g);

  box(2.2, 0.30, 7.8, MATS.mahoganyFlat, 0, 0.15, 0, g);   // tier 1 (world x 6.1..8.3)
  box(1.4, 0.58, 7.8, MATS.mahoganyFlat, 1.5, 0.29, 0, g); // tier 2

  // 12 armchairs merged into one leather mesh (positions match juror cast coords)
  const chairs = new Merger(MATS.leatherDark);
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / 6), col = i % 6;
    const x = (row ? 8.15 : 7.0) - 7.2;
    const y = row ? 0.58 : 0.30;
    const z = -5.3 + col * 1.15 + 2.4;
    const ry = -PI / 2.3;
    chairs.box(0.52, 0.20, 0.5, x, y + 0.10, z, 0, ry, 0)
      .box(0.52, 0.6, 0.09, x + 0.22 * Math.cos(ry + PI / 2) * -1, y + 0.5, z - 0.22 * Math.sin(ry + PI / 2) * -1, -0.1, ry, 0)
      .box(0.07, 0.18, 0.4, x + 0.26 * Math.cos(ry), y + 0.29, z - 0.26 * Math.sin(ry), 0, ry, 0)
      .box(0.07, 0.18, 0.4, x - 0.26 * Math.cos(ry), y + 0.29, z + 0.26 * Math.sin(ry), 0, ry, 0);
  }
  chairs.flush(g, { cast: false });

  // front rail panels + caps
  const panels = new Merger(MATS.mahoganyPanel);
  for (let i = 0; i < 6; i++) {
    panels.box(0.07, 1.0, 1.27, -1.2, 0.62, -3.175 + i * 1.27);
  }
  panels.box(0.07, 1.0, 1.0, -0.65, 0.62, 3.75, 0, 0, 0); // side panel at the well end
  panels.flush(g);
  const caps = new Merger(MATS.mahoganyGloss);
  caps.box(0.18, 0.06, 7.6, -1.2, 1.16, 0)
    .box(0.18, 0.06, 1.1, -0.65, 1.16, 3.75);
  caps.flush(g, { cast: false });
}

// ----- counsel tables, chairs, props, flags -----
function buildCounselTables(scene, MATS) {
  for (const side of [-1, 1]) {
    const t = new THREE.Group();
    t.position.set(side * 3.1, 0, 2.2);
    scene.add(t);

    box(2.7, 0.07, 1.25, MATS.mahoganyGloss, 0, 0.765, 0, t);
    box(2.7, 0.02, 0.02, MATS.mahoganyGloss, 0, 0.81, -0.625, t, { cast: false }); // bullnose edge
    const inlay = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.85), MATS.leatherGreen);
    inlay.rotation.x = -PI / 2;
    inlay.position.set(0, 0.806, 0);
    t.add(inlay);
    const wood = new Merger(MATS.mahoganyFlat);
    for (const [lx, lz] of [[-1.25, -0.55], [1.25, -0.55], [-1.25, 0.55], [1.25, 0.55]]) {
      wood.box(0.09, 0.74, 0.09, lx, 0.37, lz);
    }
    wood.box(2.5, 0.12, 0.06, 0, 0.68, -0.55).box(2.5, 0.12, 0.06, 0, 0.68, 0.55);
    wood.flush(t);

    // chairs behind the table, facing the bench
    for (const cx of [-0.6, 0.6]) {
      box(0.5, 0.14, 0.48, MATS.leatherDark, cx, 0.35, 0.75, t, { cast: false });
      box(0.5, 0.5, 0.08, MATS.leatherDark, cx, 0.72, 0.97, t, { cast: false });
    }

    // tabletop dressing
    const pad = box(0.22, 0.006, 0.30, MATS.legalPad, -0.5, 0.815, 0.1, t, { cast: false });
    pad.rotation.y = 0.1;
    for (let i = 0; i < 3; i++) {
      const f = box(0.32, 0.008, 0.24, MATS.manila, 0.45, 0.812 + i * 0.01, -0.2, t, { cast: false });
      f.rotation.y = [0.05, -0.08, 0.12][i];
    }
    const carafe = new THREE.Mesh(new THREE.LatheGeometry(
      [[0.0, 0], [0.075, 0.01], [0.08, 0.10], [0.05, 0.17], [0.032, 0.20], [0.04, 0.235]]
        .map(p => new THREE.Vector2(p[0], p[1])), 16), MATS.clearGlass);
    carafe.position.set(0.95, 0.805, 0.35);
    carafe.castShadow = false;
    t.add(carafe);
    for (const gz of [0.22, 0.46]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.03, 0.095, 12), MATS.clearGlass);
      cup.position.set(1.12, 0.853, gz);
      cup.castShadow = false;
      t.add(cup);
    }
    if (side === 1) { // prosecution laptop
      const lap = new THREE.Group();
      lap.position.set(-0.35, 0.81, -0.1);
      lap.rotation.y = -2.8;
      t.add(lap);
      box(0.32, 0.014, 0.22, MATS.blackMatte, 0, 0.007, 0, lap, { cast: false });
      const lid = box(0.32, 0.21, 0.012, MATS.blackMatte, 0, 0.1, -0.13, lap, { cast: false });
      lid.rotation.x = -1.21 + PI / 2;
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.19), MATS.screenGlow);
      screen.position.set(0, 0.094, -0.122);
      screen.rotation.x = -1.21 + PI / 2;
      lap.add(screen);
    }
  }

  // defendant chair at (-4.1, 0, 2.6) — the defendant person sits at y 0.42
  const dc = new THREE.Group();
  dc.position.set(-4.1, 0, 2.6);
  scene.add(dc);
  box(0.5, 0.14, 0.48, MATS.leatherDark, 0, 0.35, 0, dc, { cast: false });
  box(0.5, 0.5, 0.08, MATS.leatherDark, 0, 0.72, 0.24, dc, { cast: false });
  const dlegs = new Merger(MATS.mahoganyFlat);
  for (const [lx, lz] of [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.2], [0.21, 0.2]]) {
    dlegs.cyl(0.02, 0.02, 0.28, lx, 0.14, lz, 0, 0, 0, 8);
  }
  dlegs.flush(dc, { cast: false });

  // flags flanking the bench: US (-x), state (+x)
  for (const side of [-1, 1]) {
    const f = new THREE.Group();
    f.position.set(side * 2.9, 0, -8.1);
    scene.add(f);
    const hardware = new Merger(MATS.brass);
    hardware.cyl(0.16, 0.16, 0.06, 0, 0.03, 0)
      .add(new THREE.SphereGeometry(0.05, 10, 8), 0, 3.42, 0)
      .add(new THREE.ConeGeometry(0.04, 0.12, 10), 0, 3.52, 0);
    hardware.flush(f, { cast: false });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 3.3, 10), MATS.mahoganyGloss);
    pole.position.y = 1.71;
    f.add(pole);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), MATS.brass);
    bar.position.set(0.12, 3.25, 0);
    bar.rotation.z = PI / 2;
    bar.castShadow = false;
    f.add(bar);
    const cloth = new THREE.PlaneGeometry(0.55, 1.0, 6, 10);
    const pos = cloth.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, 0.05 * Math.sin(pos.getY(i) * 7 + pos.getX(i) * 3));
    }
    cloth.computeVertexNormals();
    const flag = new THREE.Mesh(cloth, side === -1 ? MATS.flagUS : MATS.flagState);
    flag.position.set(0.16, 2.72, 0);
    f.add(flag);
  }
}

// ----- bar rail with swinging gate at z = 4.8 -----
function buildBarRail(scene, MATS) {
  const wood = new Merger(MATS.mahoganyGloss);
  const brassCaps = new Merger(MATS.brass);

  for (const s of [-1, 1]) {
    const x0 = s * 0.7, x1 = s * 7.0, cx = (x0 + x1) / 2, len = Math.abs(x1 - x0);
    wood.box(len, 0.12, 0.07, cx, 0.88, 4.8);   // top rail
    wood.box(len, 0.05, 0.05, cx, 0.45, 4.8);   // mid rail
    const count = Math.floor(len / 0.9);
    for (let i = 1; i <= count; i++) {
      const bx = x0 + s * i * 0.9;
      if (Math.abs(bx) < Math.abs(x1)) wood.cyl(0.03, 0.03, 0.86, bx, 0.43, 4.8, 0, 0, 0, 10);
    }
  }
  for (const nx of [-7.0, -0.7, 0.7, 7.0]) {    // newels + brass caps
    wood.box(0.09, 0.9, 0.09, nx, 0.45, 4.8);
    brassCaps.add(new THREE.SphereGeometry(0.055, 10, 8), nx, 0.95, 4.8);
  }
  wood.flush(scene);
  brassCaps.flush(scene, { cast: false });

  // gate: two slightly-ajar leaves
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.position.set(s * 0.66, 0, 4.8);
    leaf.rotation.y = s === -1 ? 0.18 : -0.12;
    scene.add(leaf);
    const lg = new Merger(MATS.mahoganyGloss);
    const inner = -s * 0.3;
    lg.box(0.05, 0.72, 0.05, 0, 0.36, 0)
      .box(0.05, 0.72, 0.05, inner * 2, 0.36, 0)
      .box(0.6, 0.05, 0.04, inner, 0.70, 0)
      .box(0.6, 0.05, 0.04, inner, 0.10, 0);
    for (let i = 1; i <= 3; i++) lg.cyl(0.02, 0.02, 0.55, -s * 0.15 * i, 0.4, 0, 0, 0, 0, 8);
    lg.flush(leaf, { cast: false });
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6), MATS.brass);
    hinge.position.set(0, 0.5, 0);
    hinge.castShadow = false;
    leaf.add(hinge);
  }
}

// ----- gallery pews (seats y 0.46 match sitter groups at y 0.45) -----
function buildPews(scene, MATS) {
  const wood = new Merger(MATS.mahoganyFlat);
  const gloss = new Merger(MATS.mahoganyGloss);
  for (const z of [6.4, 8.0, 9.6]) {
    for (const x of [-3.5, 3.5]) {
      wood.box(5.6, 0.08, 0.5, x, 0.42, z)                  // seat
        .box(5.6, 0.36, 0.05, x, 0.24, z - 0.25)            // skirt
        .box(5.6, 0.78, 0.07, x, 0.88, z + 0.30, -0.12)     // backrest
        .box(0.07, 0.95, 0.62, x - 2.8, 0.475, z + 0.05)    // end panels
        .box(0.07, 0.95, 0.62, x + 2.8, 0.475, z + 0.05);
      wood.cyl(0.05, 0.05, 0.07, x - 2.8, 0.99, z + 0.05, 0, 0, PI / 2, 8)
        .cyl(0.05, 0.05, 0.07, x + 2.8, 0.99, z + 0.05, 0, 0, PI / 2, 8);
      gloss.box(5.6, 0.05, 0.1, x, 1.275, z + 0.345, -0.12); // back cap [chamfer]
    }
  }
  wood.flush(scene);
  gloss.flush(scene, { cast: false });
}

// ----- entry doors (front wall, z = 12) -----
function buildDoors(scene, MATS) {
  const arch = new Merger(MATS.mahoganyFlat);
  arch.box(0.18, 3.4, 0.3, -1.62, 1.7, 11.8)
    .box(0.18, 3.4, 0.3, 1.62, 1.7, 11.8)
    .box(3.6, 0.22, 0.3, 0, 3.5, 11.8)
    .box(3.8, 0.1, 0.36, 0, 3.65, 11.8);
  arch.flush(scene);

  // left leaf slightly ajar on its hinge; right leaf closed
  const left = new THREE.Group();
  left.position.set(-1.53, 1.65, 11.85);
  left.rotation.y = 0.10;
  scene.add(left);
  const leftLeaf = box(1.5, 3.3, 0.09, MATS.doorPanel, 0.75, 0, 0, left);
  leftLeaf.castShadow = true;
  box(1.5, 3.3, 0.09, MATS.doorPanel, 0.78, 1.65, 11.85, scene);

  const hw = new Merger(MATS.brass);
  hw.box(0.12, 0.45, 0.01, 0.18, 1.5, 11.79)
    .cyl(0.02, 0.02, 0.35, 0.3, 1.5, 11.78, 0, 0, 0, 8);
  hw.flush(scene, { cast: false });
  const lhw = new Merger(MATS.brass);
  lhw.box(0.12, 0.45, 0.01, 1.32, -0.15, -0.06)
    .cyl(0.02, 0.02, 0.35, 1.2, -0.15, -0.07, 0, 0, 0, 8);
  lhw.flush(left, { cast: false });

  box(0.56, 0.2, 0.07, MATS.exitSign, 0, 3.85, 11.7, scene, { cast: false });
}

// ----- back-wall decor, clock, pendants, sconces -----
function buildDecor(scene, MATS) {
  // wall seal behind the judge
  const sealTex = makeSealTexture();
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.04, 32),
    new THREE.MeshStandardMaterial({ map: sealTex, metalness: 0.6, roughness: 0.45 }));
  seal.rotation.x = PI / 2;
  seal.position.set(0, 5.6, -8.76);
  seal.castShadow = false;
  scene.add(seal);
  const sealRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.04, 8, 32), MATS.brass);
  sealRing.position.set(0, 5.6, -8.74);
  sealRing.castShadow = false;
  scene.add(sealRing);

  // judicial portraits
  for (const [x, seed] of [[-6.1, 1301], [6.1, 1302]]) {
    const tex = makeCanvasTexture([256, 340], (ctx, w, h) => {
      const rnd = mulberry32(seed);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#2e2218');
      grad.addColorStop(1, '#171008');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(74,58,40,0.5)';
      ctx.beginPath(); ctx.ellipse(w / 2, h * 0.30, 28, 34, 0, 0, PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w / 2, h * 0.45, 90, 50, 0, 0, PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w / 2, h * 0.70, 110, 120, 0, 0, PI * 2); ctx.fill();
      const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.62);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
      void rnd;
    });
    const frame = new Merger(MATS.mahoganyGloss);
    frame.box(1.05, 0.06, 0.08, x, 4.9 + 0.645, -8.76)
      .box(1.05, 0.06, 0.08, x, 4.9 - 0.645, -8.76)
      .box(0.06, 1.35, 0.08, x - 0.495, 4.9, -8.76)
      .box(0.06, 1.35, 0.08, x + 0.495, 4.9, -8.76);
    frame.flush(scene, { cast: false });
    const canvasM = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    canvasM.position.set(x, 4.9, -8.75);
    canvasM.castShadow = false;
    scene.add(canvasM);
  }

  // wall clock over the doors (4:35, matching the late-afternoon sun)
  const clockTex = makeCanvasTexture(256, (ctx, w, h) => {
    ctx.fillStyle = '#e8e2d2';
    ctx.beginPath(); ctx.arc(128, 128, 124, 0, PI * 2); ctx.fill();
    ctx.strokeStyle = '#1d1b18';
    for (let i = 0; i < 60; i++) {
      const a = i * PI / 30, big = i % 5 === 0;
      ctx.lineWidth = big ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(128 + Math.sin(a) * (big ? 104 : 112), 128 - Math.cos(a) * (big ? 104 : 112));
      ctx.lineTo(128 + Math.sin(a) * 120, 128 - Math.cos(a) * 120);
      ctx.stroke();
    }
    ctx.fillStyle = '#1d1b18';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('12', 128, 38); ctx.fillText('3', 218, 128);
    ctx.fillText('6', 128, 218); ctx.fillText('9', 38, 128);
    const hand = (angle, len, width) => {
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(128, 128);
      ctx.lineTo(128 + Math.sin(angle) * len, 128 - Math.cos(angle) * len);
      ctx.stroke();
    };
    hand((4 + 35 / 60) / 12 * PI * 2, 62, 9);  // hour
    hand(35 / 60 * PI * 2, 100, 5);            // minute
  });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 24), MATS.blackMatte);
  rim.rotation.x = PI / 2;
  rim.position.set(0, 7.0, 11.72);
  rim.castShadow = false;
  scene.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.36, 32),
    new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.6 }));
  face.position.set(0, 7.0, 11.68);
  face.rotation.y = PI;
  face.castShadow = false;
  scene.add(face);

  // pendant dome chandeliers down the centerline
  const rods = new Merger(MATS.blackMatte);
  for (const z of [-5.5, -0.5, 4.5, 9.5]) {
    rods.cyl(0.02, 0.02, 1.7, 0, 8.15, z, 0, 0, 0, 8)
      .cyl(0.07, 0.07, 0.03, 0, 8.98, z, 0, 0, 0, 12);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 12, 0, PI * 2, 0, 1.25), MATS.brass);
    dome.position.set(0, 7.3, z);
    dome.castShadow = false;
    scene.add(dome);
    const liner = new THREE.Mesh(new THREE.SphereGeometry(0.52, 16, 10, 0, PI * 2, 0, 1.25),
      new THREE.MeshBasicMaterial({ color: 0xffe2b0, side: THREE.BackSide }));
    liner.position.set(0, 7.29, z);
    scene.add(liner);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), MATS.bulbWarm);
    bulb.position.set(0, 6.95, z);
    scene.add(bulb);
  }
  rods.flush(scene, { cast: false });

  // wall sconces: brass up-domes + faked up-light splash cards
  const glowTex = makeCanvasTexture(128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h * 0.8, 4, w / 2, h * 0.5, h * 0.6);
    g.addColorStop(0, 'rgba(255,222,170,1)');
    g.addColorStop(1, 'rgba(255,222,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const glowMat = new THREE.MeshBasicMaterial({
    map: glowTex, transparent: true, opacity: 0.10,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const brackets = new Merger(MATS.brass);
  for (const sx of [-1, 1]) {
    for (const z of [-6, -2, 2, 6, 10]) {
      const x = sx * 11.7;
      brackets.box(0.08, 0.18, 0.12, x, 5.6, z)
        .add(new THREE.SphereGeometry(0.16, 12, 6, 0, PI * 2, 0, PI / 2), x - sx * 0.1, 5.7, z, PI, 0, 0);
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), glowMat);
      card.position.set(x - sx * 0.04, 6.15, z);
      card.rotation.y = -sx * PI / 2;
      card.renderOrder = 8;
      scene.add(card);
    }
  }
  brackets.flush(scene, { cast: false });
}

// Embossed court seal face, shared by the bench front and the wall.
let _sealTex = null;
function makeSealTexture() {
  if (_sealTex) return _sealTex;
  _sealTex = makeCanvasTexture(512, (ctx, w, h) => {
    const R = w / 2;
    const grad = ctx.createRadialGradient(R, R, R * 0.1, R, R, R);
    grad.addColorStop(0, '#c9a25e');
    grad.addColorStop(1, '#8a6a30');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#6e5226';
    ctx.lineWidth = 6;
    for (const r of [0.92, 0.62]) {
      ctx.beginPath(); ctx.arc(R, R, R * r, 0, PI * 2); ctx.stroke();
    }
    ctx.lineWidth = 3;
    for (let i = 0; i < 60; i++) {
      const a = i * PI / 30;
      ctx.beginPath();
      ctx.moveTo(R + Math.sin(a) * R * 0.64, R - Math.cos(a) * R * 0.64);
      ctx.lineTo(R + Math.sin(a) * R * 0.90, R - Math.cos(a) * R * 0.90);
      ctx.stroke();
    }
    // five-point star
    ctx.fillStyle = '#8a6a30';
    ctx.strokeStyle = '#e0c084';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = i * PI / 5 - PI / 2, r = (i % 2 === 0 ? 0.42 : 0.18) * R;
      const px = R + Math.cos(a) * r, py = R + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6e5226';
    for (let i = 0; i < 16; i++) {
      const a = i * PI / 8;
      ctx.beginPath();
      ctx.arc(R + Math.sin(a) * R * 0.52, R - Math.cos(a) * R * 0.52, 5, 0, PI * 2);
      ctx.fill();
    }
  });
  return _sealTex;
}

// ---------- lighting rig (renderer/IBL/fog are owned by scene.js) ----------
export function buildLights(scene) {
  // key: late-afternoon sun raking through the +x windows
  const sun = new THREE.DirectionalLight(0xffd9a8, 3.0);
  sun.position.set(18, 9.5, -2);
  sun.target.position.set(-4, 0, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -15; sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 13; sun.shadow.camera.bottom = -9;
  sun.shadow.camera.near = 4; sun.shadow.camera.far = 50;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(sun, sun.target);

  // practicals (physical intensities, decay 2)
  const pendantLights = [];
  for (const z of [-5.5, -0.5, 4.5, 9.5]) {
    const p = new THREE.PointLight(0xffd9a0, 28, 9, 2);
    p.position.set(0, 6.9, z);
    scene.add(p);
    pendantLights.push(p);
  }
  const bankerLight = new THREE.PointLight(0xb8e6c0, 4, 2.5, 2);
  bankerLight.position.set(-1.7, 3.05, -6.2);
  scene.add(bankerLight);

  const spot = (color, intensity, dist, angle, penumbra, pos, target, shadows) => {
    const s = new THREE.SpotLight(color, intensity, dist, angle, penumbra, 1.9);
    s.position.set(...pos);
    s.target.position.set(...target);
    if (shadows) {
      s.castShadow = true;
      s.shadow.mapSize.set(1024, 1024);
      s.shadow.bias = -0.0003;
      s.shadow.normalBias = 0.02;
    }
    scene.add(s, s.target);
    return s;
  };
  const benchSpot = spot(0xffe2b0, 130, 16, 0.40, 0.65, [0, 7.6, -3.2], [0, 2.2, -6.6], true);
  const witnessSpot = spot(0xffe8c4, 85, 14, 0.36, 0.6, [-2.8, 6.9, -1.9], [-3.6, 1.4, -4.7], true);
  const juryWash = spot(0xfff3da, 60, 14, 0.55, 0.9, [3.8, 7.4, -2.4], [7.3, 1.2, -2.4], false);
  const counselWash = spot(0xffeccc, 55, 14, 0.70, 0.95, [0, 7.6, 1.0], [0, 0.9, 2.4], false);

  // cool sky / warm floor-bounce fill (IBL handles the rest)
  const hemi = new THREE.HemisphereLight(0x96aabf, 0x3e2e1d, 0.45);
  scene.add(hemi);

  return { sun, benchSpot, witnessSpot, juryWash, counselWash, pendantLights, hemi, bankerLight };
}
