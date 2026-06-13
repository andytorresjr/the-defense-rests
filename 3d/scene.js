// The 3D courtroom orchestrator. Owns the renderer, camera, IBL and frame loop;
// the room and lighting rig come from props.js, the procedural cast from
// characters.js, every camera decision from the Director, and the graded
// post-processing chain from post.js.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makePerson, randomCivilian, setCharacterQuality } from './characters.js';
import { buildMaterials } from './textures.js';
import { buildCourtroom, buildLights } from './props.js';
import { Director } from './director.js';
import { CinematicPipeline } from './post.js';
import { playSting, playGavel } from './sound.js';

// Gallery sitters land on the pews (rows z 6.4 / 8.0 / 9.6, seats y 0.46,
// center aisle x -0.7..0.7 kept clear).
const GALLERY_SEATS = [
  [-4.6, 6.4], [-2.0, 6.4], [3.2, 6.4], [5.1, 6.4],
  [-5.2, 8.0], [1.6, 8.0], [4.3, 8.0],
  [-2.8, 9.6], [2.4, 9.6],
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class CourtScene {
  constructor(canvas) {
    const q = new URLSearchParams(location.search);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // pixelRatio is owned by the post pipeline (tier-dependent).

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0805);
    this.scene.fog = new THREE.Fog(0x1a120a, 26, 60);

    // IBL replaces all ambient light.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);

    const MATS = buildMaterials(this.renderer);
    buildCourtroom(this.scene, MATS);
    this.lights = buildLights(this.scene);

    this.people = [];
    this.galleryFolk = [];
    this.witness = null;
    this.jurors = [];
    this._talker = null;
    this._gaze = new THREE.Vector3();

    this._buildCast();

    this.director = new Director({
      dev: q.get('dev') != null,
      apertureScale: parseFloat(q.get('dof') || '') || 1,
    });
    this._syncAnchors();

    this.post = new CinematicPipeline(this.renderer, this.scene, this.camera);
    this.post.onTierChange = tier => this._applyTier(tier);
    this._applyTier(this.post.tier);

    this.director.idle('orbit');

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
    this.post.setSize(w, h);
    // Narrow windows widen the lens instead of cropping shoulders out of CUs.
    this.director.setAspectComp(clamp(1.5 / this.camera.aspect, 1, 1.35));
  }

  // Tier side effects the pipeline deliberately doesn't own: character LOD,
  // crowd washes, and the sun's shadow budget.
  _applyTier(tier) {
    setCharacterQuality(tier === 0 ? 'high' : tier === 1 ? 'medium' : 'low');
    const L = this.lights;
    if (L.juryWash) L.juryWash.visible = tier < 2;
    if (L.counselWash) L.counselWash.visible = tier < 2;
    const size = tier === 2 ? 1024 : 2048;
    if (L.sun && L.sun.shadow.mapSize.x !== size) {
      L.sun.shadow.mapSize.set(size, size);
      if (L.sun.shadow.map) { L.sun.shadow.map.dispose(); L.sun.shadow.map = null; }
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

    GALLERY_SEATS.forEach(([x, z], i) => {
      const p = add(randomCivilian('gallery' + i), x, 0.45, z, Math.PI);
      p.setShadows(false);
      p.focused = false;
      this.galleryFolk.push(p);
    });
  }

  _syncAnchors() {
    this.director.setAnchors({
      judge: this.judge, prosecutor: this.prosecutor, defense: this.defenseAtty,
      defendant: this.defendant, witness: this.witness, jurors: this.jurors,
    });
  }

  setDefendant(portraitSpec) {
    if (!portraitSpec) return;
    const pos = this.defendant.group.position.clone();
    const rot = this.defendant.group.rotation.y;
    this.scene.remove(this.defendant.group);
    this.people.splice(this.people.indexOf(this.defendant), 1);
    const p = makePerson({ ...portraitSpec, seated: true });
    p.group.position.copy(pos);
    p.group.rotation.y = rot;
    this.scene.add(p.group);
    this.people.push(p);
    this.defendant = p;
    this._syncAnchors();
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
      p.setShadows(false);
      p.focused = false;
      this.scene.add(p.group);
      this.people.push(p);
      this.jurors.push(p);
    });
    this._syncAnchors();
  }

  // ---------- voir dire: the candidate panel on the gallery pews ----------
  // Candidates use the same id hash as setJury, so a struck-or-sworn candidate
  // looks identical when they later appear in the box.
  seatVenire(pool) {
    this.clearVenire();
    for (const p of this.galleryFolk) p.group.visible = false;
    // House lights up over the gallery so the candidates' faces read.
    for (const pl of this.lights.pendantLights.slice(2)) pl.intensity = 52;
    const XS = [-5.4, -3.5, -1.6, 1.6, 3.5, 5.4];
    pool.forEach((j, i) => {
      const row = Math.floor(i / 6), col = i % 6;
      const p = randomCivilian(j.id + j.name);
      p.group.position.set(XS[col], 0.45, 6.4 + row * 1.6);
      p.group.rotation.y = Math.PI;
      p.setShadows(false);
      this.scene.add(p.group);
      this.people.push(p);
      this._venire.set(j.id, p);
    });
  }

  removeVenireMember(id) {
    const p = this._venire.get(id);
    if (!p) return;
    this.scene.remove(p.group);
    this.people.splice(this.people.indexOf(p), 1);
    this._venire.delete(id);
  }

  clearVenire() {
    if (!this._venire) this._venire = new Map();
    for (const p of this._venire.values()) {
      this.scene.remove(p.group);
      this.people.splice(this.people.indexOf(p), 1);
    }
    this._venire.clear();
    for (const p of this.galleryFolk) p.group.visible = true;
    for (const pl of this.lights.pendantLights.slice(2)) pl.intensity = 28;
  }

  // World position of a venire candidate's head (for the label layer).
  venireHeadPos(id, out) {
    const p = this._venire.get(id);
    return p ? this._headOf(p, out) : null;
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
    this._syncAnchors();
  }

  setWitnessMood(mood) {
    if (this.witness) this.witness.mood = mood;
    this.director.setWitnessMood(mood);
  }

  // ---------- direction ----------
  setShot(name) {
    this.director.cut(name);
    this._updateFocusFlags();
  }

  // Legacy shim: the Director's idle backdrops replaced the orbit flag.
  setOrbit(on) { if (on) this.director.idle('orbit'); }

  _headOf(person, out) {
    return person.parts.head.getWorldPosition(out);
  }

  _setTalker(person) {
    if (this._talker && this._talker !== person) this._talker.talking = false;
    this._talker = person;
    if (person) person.talking = true;
    this._aimGazes(person);
  }

  // Everyone watches the speaker; the speaker addresses a sensible listener.
  _aimGazes(speaker) {
    if (!speaker) return; // narrator beats: the room keeps watching the last speaker
    this._headOf(speaker, this._gaze);
    const principals = [this.judge, this.prosecutor, this.defenseAtty, this.defendant, this.witness];
    for (const p of principals) {
      if (p && p !== speaker) p.lookAt(this._gaze);
    }
    for (const p of this.jurors) if (p.focused) p.lookAt(this._gaze);

    // The speaker's own eyeline.
    let target = null;
    if (speaker === this.witness) {
      target = this.director.examiner === 'def' ? this.defenseAtty : this.prosecutor;
    } else if (speaker === this.prosecutor || speaker === this.defenseAtty) {
      target = this.witness || this.judge;
    } else if (speaker === this.judge) {
      target = this.witness || this.prosecutor;
    }
    if (target) speaker.lookAt(this._headOf(target, this._gaze));
  }

  // Called for every dialogue beat (via Courtroom3D.nameFor).
  onBeat(beat, side, ctx = {}) {
    if (beat.kind === 'objection') {
      const who = beat.speaker === 'prosecutor' ? this.prosecutor : this.defenseAtty;
      who.pointT = 1.6;
      playSting();
    }
    if (beat.kind === 'ruling') playGavel();

    const map = {
      wit: this.witness, pros: this.prosecutor, def: this.defenseAtty, judge: this.judge,
      defendant: this.defendant, jury: this.jurors[0] ?? null,
    };
    this._setTalker(map[side] ?? null);
    this.director.onBeat(beat, side, ctx);
    this._updateFocusFlags();
  }

  // Background characters animate at full rate only when the camera can see
  // them properly (jury/gallery/wide coverage).
  _updateFocusFlags() {
    const n = this.director.shotName || '';
    const wide = /^(jury|juror|est_|gallery|doors|orbit|stand_arrival)/.test(n);
    for (const p of this.jurors) p.focused = wide;
    for (const p of this.galleryFolk) p.focused = wide;
  }

  playerObjects() {
    this.defenseAtty.pointT = 1.6;
    this.director.special('objection-def');
    playSting();
  }

  quiet() {
    this._setTalker(null);
    for (const p of this.people) p.lookAt(null);
  }

  // ---------- frame ----------
  _tick() {
    const dt = Math.min(0.05, this._clock.getDelta());
    const t = this._clock.elapsedTime;

    for (const p of this.people) p.update(t, dt);

    const s = this.director.tick(dt, t);
    this.camera.position.copy(s.position);
    this.camera.lookAt(s.lookAt);
    if (s.roll) this.camera.rotateZ(s.roll);
    if (Math.abs(this.camera.fov - s.fov) > 0.01) {
      this.camera.fov = s.fov;
      this.camera.updateProjectionMatrix();
    }

    this.post.setFocus(s.dofFocus, s.dofAperture, s.dofMaxblur);
    this.post.render(dt);
  }
}
