// The 3D courtroom: room, furniture, cast, lighting, and the cinematic camera
// director that cuts between shots based on who is speaking.
import * as THREE from 'three';
import { makePerson, randomCivilian } from './characters.js';
import { playSting, playGavel } from './sound.js';

const WOOD_DARK = 0x3a2a18, WOOD = 0x5a4126, WOOD_LIGHT = 0x7a5a34;

function mat(color, rough = 0.8) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05 });
}

function box(w, h, d, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Named camera shots: [position, lookAt]
const SHOTS = {
  wide: [[0, 3.4, 11.5], [0, 1.6, -4]],
  judge: [[-0.6, 1.4, -2.2], [0, 3.1, -6.8]],
  witness: [[-2.0, 1.7, -2.3], [-3.7, 1.8, -4.9]],
  prosecutor: [[-1.4, 1.7, 0.4], [3.1, 1.55, 3.0]],
  defense: [[1.4, 1.7, 0.4], [-3.1, 1.55, 3.0]],
  jury: [[2.2, 1.8, 1.6], [7.2, 1.45, -2.4]],
  gallery: [[0, 2.2, 1.5], [0, 1.7, 9]],
};

export class CourtScene {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.65;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x171008);
    this.scene.fog = new THREE.Fog(0x171008, 18, 34);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    this._camPos = new THREE.Vector3(...SHOTS.wide[0]);
    this._camTarget = new THREE.Vector3(...SHOTS.wide[1]);
    this._wantPos = this._camPos.clone();
    this._wantTarget = this._camTarget.clone();
    this.orbit = true;
    this._orbitAngle = 0;

    this.people = [];
    this.witness = null;
    this.jurors = [];
    this._talker = null;

    this._buildRoom();
    this._buildCast();
    this._lights();

    this._clock = new THREE.Clock();
    const loop = () => {
      requestAnimationFrame(loop);
      this._tick();
    };
    this._resize();
    addEventListener('resize', () => this._resize());
    loop();
  }

  _resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- room ----------
  _buildRoom() {
    const S = this.scene;

    // floor: wood planks via procedural canvas texture
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#4a3522';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = `rgba(${20 + Math.random() * 30}, ${12 + Math.random() * 20}, 6, ${0.25 + Math.random() * 0.2})`;
      ctx.fillRect(0, i * 32, 256, 30);
    }
    const floorTex = new THREE.CanvasTexture(c);
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(7, 9);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 32),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = 3;
    floor.receiveShadow = true;
    S.add(floor);

    // walls + wainscot
    const wallMat = mat(0x6e6253, 0.95);
    const wainscotMat = mat(WOOD_DARK, 0.85);
    const back = box(26, 9, 0.4, wallMat, 0, 4.5, -9, S);
    back.receiveShadow = true;
    box(26, 2.6, 0.5, wainscotMat, 0, 1.3, -8.9, S);
    for (const side of [-1, 1]) {
      box(0.4, 9, 32, wallMat, side * 12, 4.5, 3, S);
      box(0.5, 2.6, 32, wainscotMat, side * 11.9, 1.3, 3, S);
    }
    // ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(26, 32), mat(0x2c2418, 1));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, 9, 3);
    S.add(ceil);

    // tall windows on the right wall with light shafts
    for (const z of [-4, 1, 6]) {
      box(0.2, 4.4, 1.8, new THREE.MeshStandardMaterial({
        color: 0xcfe0ee, emissive: 0x8fa8be, emissiveIntensity: 0.55, roughness: 1,
      }), 11.7, 4.4, z, S);
      const shaft = new THREE.Mesh(
        new THREE.PlaneGeometry(7, 3.6),
        new THREE.MeshBasicMaterial({
          color: 0xcfb98a, transparent: true, opacity: 0.05,
          side: THREE.DoubleSide, depthWrite: false,
        }));
      shaft.position.set(8, 3.4, z);
      shaft.rotation.set(0, 0.3, -0.5);
      S.add(shaft);
    }

    // judge bench (elevated, centered at back)
    const bench = new THREE.Group();
    box(5.4, 2.5, 1.8, mat(WOOD), 0, 1.25, 0, bench);
    box(5.8, 0.25, 2.1, mat(WOOD_LIGHT), 0, 2.6, 0, bench);
    box(1.6, 1.6, 0.1, mat(0xb08d4f, 0.4), 0, 1.5, 0.96, bench); // seal
    const sealRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 24), mat(0x8a6a30, 0.4));
    sealRing.position.set(0, 1.5, 1.02);
    bench.add(sealRing);
    box(7.5, 0.5, 3.2, mat(WOOD_DARK), 0, 0.25, -0.2, bench); // dais
    bench.position.set(0, 0, -6.6);
    this.scene.add(bench);

    // witness stand (left of bench)
    const stand = new THREE.Group();
    box(1.7, 1.15, 1.5, mat(WOOD), 0, 0.575, 0, stand);
    box(1.9, 0.15, 1.7, mat(WOOD_LIGHT), 0, 1.22, 0, stand);
    stand.position.set(-3.6, 0, -4.7);
    this.scene.add(stand);

    // jury box (right side): rail + two tiers
    const jbox = new THREE.Group();
    box(1.6, 1.0, 7.2, mat(WOOD), 0.2, 0.5, 0, jbox);
    box(1.8, 0.12, 7.4, mat(WOOD_LIGHT), 0.2, 1.06, 0, jbox);
    box(2.4, 0.3, 7.4, mat(WOOD_DARK), 1.6, 0.15, 0, jbox);
    jbox.position.set(7.2, 0, -2.4);
    this.scene.add(jbox);

    // counsel tables
    for (const side of [-1, 1]) {
      const t = new THREE.Group();
      box(2.6, 0.1, 1.2, mat(WOOD_LIGHT), 0, 0.78, 0, t);
      box(0.12, 0.78, 1.0, mat(WOOD), -1.15, 0.39, 0, t);
      box(0.12, 0.78, 1.0, mat(WOOD), 1.15, 0.39, 0, t);
      // papers
      box(0.5, 0.02, 0.36, mat(0xe9e4d4, 1), side * 0.4, 0.85, 0.1, t);
      t.position.set(side * 3.1, 0, 2.2);
      this.scene.add(t);
    }

    // gallery rail + benches
    box(14, 0.9, 0.15, mat(WOOD), 0, 0.45, 4.8, S);
    for (const z of [6.4, 8.0, 9.6]) {
      box(13, 0.45, 0.5, mat(WOOD_DARK), 0, 0.45, z, S);
      box(13, 0.7, 0.12, mat(WOOD_DARK), 0, 0.8, z + 0.3, S);
    }
  }

  // ---------- cast ----------
  _buildCast() {
    const add = (person, x, y, z, ry = 0) => {
      person.group.position.set(x, y, z);
      person.group.rotation.y = ry;
      this.scene.add(person.group);
      this.people.push(person);
      return person;
    };

    this.judge = add(makePerson({
      skin: '#a9765a', hair: 'short', hairColor: '#cfcac2', outfit: 'robe', seated: true,
    }), 0, 2.2, -7.1, 0);

    // Attorneys stand behind their tables, facing the bench (-z).
    this.prosecutor = add(makePerson({
      skin: '#e8b88f', hair: 'bun', hairColor: '#5a3825', outfit: 'prosecutor',
    }), 3.1, 0, 3.2, Math.PI);

    this.defenseAtty = add(makePerson({
      skin: '#9c6b4a', hair: 'short', hairColor: '#241d18', outfit: 'suit', outfitColor: 0x32405e,
    }), -3.1, 0, 3.2, Math.PI);

    this.defendant = add(makePerson({
      skin: '#caa284', hair: 'short', hairColor: '#4d4339', outfit: 'suit', seated: true,
    }), -4.1, 0.42, 2.6, Math.PI);

    // sparse gallery, facing the bench
    let gi = 0;
    for (const [x, z] of [[-4.5, 6.4], [2.5, 6.4], [5.5, 8.0], [-1.5, 9.6]]) {
      add(randomCivilian('gallery' + gi++), x, 0.45, z, Math.PI);
    }
  }

  setJury(jurors) {
    for (const p of this.jurors) {
      this.scene.remove(p.group);
      this.people.splice(this.people.indexOf(p), 1);
    }
    this.jurors = [];
    (jurors || []).forEach((j, i) => {
      const row = Math.floor(i / 6), col = i % 6;
      const p = randomCivilian(j.id + j.name);
      p.group.position.set(7.0 + row * 1.15, 0.5 + row * 0.28, -5.3 + col * 1.15);
      p.group.rotation.y = -Math.PI / 2.3;
      this.scene.add(p.group);
      this.people.push(p);
      this.jurors.push(p);
    });
  }

  seatWitness(portraitSpec) {
    if (this.witness) {
      this.scene.remove(this.witness.group);
      this.people.splice(this.people.indexOf(this.witness), 1);
      this.witness = null;
    }
    if (portraitSpec) {
      const p = makePerson({ ...portraitSpec, seated: true });
      p.group.position.set(-3.6, 0.75, -4.8);
      p.group.rotation.y = Math.PI * 0.12;
      this.scene.add(p.group);
      this.people.push(p);
      this.witness = p;
    }
  }

  setWitnessMood(mood) {
    if (this.witness) this.witness.mood = mood;
  }

  // ---------- lighting ----------
  _lights() {
    this.scene.add(new THREE.AmbientLight(0x9a8a70, 1.25));
    this.scene.add(new THREE.HemisphereLight(0xc8b898, 0x4a3a26, 0.7));

    const sun = new THREE.DirectionalLight(0xe8cf9e, 1.9);
    sun.position.set(10, 8, 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
    sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -6;
    this.scene.add(sun);

    const benchSpot = new THREE.SpotLight(0xffe2b0, 60, 18, 0.5, 0.5);
    benchSpot.position.set(0, 7.5, -3.5);
    benchSpot.target.position.set(0, 2, -6.6);
    this.scene.add(benchSpot, benchSpot.target);

    const standSpot = new THREE.SpotLight(0xffe8c4, 35, 14, 0.45, 0.6);
    standSpot.position.set(-3.5, 6.5, -1.5);
    standSpot.target.position.set(-3.6, 1.2, -4.7);
    this.scene.add(standSpot, standSpot.target);
  }

  // ---------- direction ----------
  setShot(name) {
    const shot = SHOTS[name] || SHOTS.wide;
    this._wantPos.set(...shot[0]);
    this._wantTarget.set(...shot[1]);
  }

  setOrbit(on) { this.orbit = on; }

  _setTalker(person) {
    if (this._talker && this._talker !== person) this._talker.talking = false;
    this._talker = person;
    if (person) person.talking = true;
  }

  // Called for every dialogue beat (via Courtroom3D.nameFor).
  onBeat(beat, side) {
    if (beat.kind === 'objection') {
      const who = beat.speaker === 'prosecutor' ? this.prosecutor : this.defenseAtty;
      who.pointT = 1.6;
      playSting();
    }
    if (beat.kind === 'ruling') playGavel();

    switch (side) {
      case 'wit': this._setTalker(this.witness); this.setShot('witness'); break;
      case 'pros': this._setTalker(this.prosecutor); this.setShot('prosecutor'); break;
      case 'def': this._setTalker(this.defenseAtty); this.setShot('defense'); break;
      case 'judge': this._setTalker(this.judge); this.setShot('judge'); break;
      case 'narrator':
        this._setTalker(null);
        this.setShot(beat.kind === 'cue' ? 'jury' : 'wide');
        break;
      default: this._setTalker(null); this.setShot('wide');
    }
  }

  playerObjects() {
    this.defenseAtty.pointT = 1.6;
    this.setShot('defense');
    playSting();
  }

  quiet() { this._setTalker(null); }

  // ---------- frame ----------
  _tick() {
    const dt = Math.min(0.05, this._clock.getDelta());
    const t = this._clock.elapsedTime;

    for (const p of this.people) p.update(t, dt);

    if (this.orbit) {
      this._orbitAngle += dt * 0.07;
      this._wantPos.set(Math.sin(this._orbitAngle) * 9.5, 3.4, 2 + Math.cos(this._orbitAngle) * 9.5);
      this._wantTarget.set(0, 1.7, -2);
    }

    // smooth cinematic transitions + a touch of handheld drift
    const k = 1 - Math.exp(-dt * (this.orbit ? 2.4 : 3.6));
    this._camPos.lerp(this._wantPos, k);
    this._camTarget.lerp(this._wantTarget, k);
    const driftX = Math.sin(t * 0.45) * 0.04, driftY = Math.sin(t * 0.6 + 1.7) * 0.03;
    this.camera.position.copy(this._camPos).add(new THREE.Vector3(driftX, driftY, 0));
    this.camera.lookAt(this._camTarget.x + driftX * 0.5, this._camTarget.y + driftY * 0.5, this._camTarget.z);

    this.renderer.render(this.scene, this.camera);
  }
}
