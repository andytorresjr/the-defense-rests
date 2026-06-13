// Cinematic camera director: deterministic shot library, editing grammar, and
// camera-feel simulation (handheld, cut settles, push-ins, rack focus). tick()
// composes the frame but never touches the camera or renderer — scene.js owns
// both and copies the returned values. All variation derives from a per-trial
// beat counter and an integer hash: identical beat sequences ⇒ identical edits.
import * as THREE from 'three';

// ---------- deterministic variation machinery (§5) ----------
function hash(n) { return (Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function smooth(u) { return u * u * (3 - 2 * u); } // cubic in-out / smoothstep

// ---------- head anchors (world-space fallbacks; live people override) ----------
const ANCHOR = {
  judgeHead:     [0.00, 3.38, -7.10],
  witnessHead:   [-3.60, 1.96, -4.80],
  prosHead:      [3.10, 1.63, 3.20],
  defHead:       [-3.10, 1.63, 3.20],
  defendantHead: [-4.10, 1.65, 2.60],
  wellCenter:    [0.00, 1.20, -1.00],
  venireCenter:  [0.00, 1.50, 8.00],
  doorsVirtual:  [0.00, 1.70, 12.00],
  prosPaper:     [3.50, 0.86, 2.30],
  defPaper:      [-3.50, 0.86, 2.30],
  juryCenter:    [7.40, 1.80, -2.40],
  jurorNearest:  [7.00, 1.71, 0.45], // jurorHead(5): front row, col nearest camera
};

function jurorHead(i) { // i = 0..11; row 0 = front (x 7.0), row 1 = rear (x 8.15)
  const row = Math.floor(i / 6), col = i % 6;
  return [7.00 + row * 1.15, 1.71 + row * 0.28, -5.30 + col * 1.15];
}

// Which anchors resolve from live person heads (parts.head world position at cut time).
const ANCHOR_PERSON = {
  judgeHead: 'judge', witnessHead: 'witness', prosHead: 'prosecutor',
  defHead: 'defense', defendantHead: 'defendant',
};

// Solid volumes cameras must not enter (§1) — checked in dev mode.
const VOLUMES = [
  [-2.70, 2.70, 0, 2.73, -7.50, -5.70],   // judge bench body
  [-3.75, 3.75, 0, 0.50, -8.40, -5.20],   // bench dais
  [-4.45, -2.75, 0, 1.30, -5.45, -3.95],  // witness stand
  [6.60, 8.20, 0, 1.12, -6.00, 1.20],     // jury box rail
  [1.80, 4.40, 0, 0.83, 1.60, 2.80],      // prosecution table
  [-4.40, -1.80, 0, 0.83, 1.60, 2.80],    // defense table
  [-7.00, 7.00, 0, 0.90, 4.72, 4.88],     // gallery rail
  [-6.50, 6.50, 0, 1.15, 6.10, 10.00],    // gallery benches
];

// ---------- shot library (§4) ----------
// pos / lookAt: absolute room coords. move types: breathe, dolly, track, pan,
// creep, punch, orbit. hand: handheld intensity 0..1. focus: anchor for DOF.
// ap / mb: BokehPass aperture / maxblur. deck: 'E' | 'W' | null (neutral).
const SHOTS = {
  // --- witness coverage (§4.1) ---
  wit_cu_e: { // CU witness, prosecution exams. 3/4-front, eyes 65%, looks screen-left.
    pos: [-1.85, 1.88, -3.05], lookAt: [-3.60, 1.80, -4.80], fov: 24,
    move: { type: 'breathe', v: 0.06 }, hand: 0.30, focus: 'witnessHead', ap: 0.0035, mb: 0.008, deck: 'E',
  },
  wit_mcu_e: { // MCU witness + stand top, room context behind.
    pos: [-1.10, 1.86, -2.50], lookAt: [-3.60, 1.74, -4.80], fov: 30,
    move: { type: 'breathe', v: 0.07 }, hand: 0.35, focus: 'witnessHead', ap: 0.0025, mb: 0.006, deck: 'E',
  },
  wit_cu_w: { // CU witness, defense exams. Looks screen-right. d=2.79m.
    pos: [-5.60, 1.90, -2.85], lookAt: [-3.60, 1.78, -4.80], fov: 24,
    move: { type: 'breathe', v: 0.06 }, hand: 0.30, focus: 'witnessHead', ap: 0.0035, mb: 0.008, deck: 'W',
  },
  wit_mcu_w: {
    pos: [-6.10, 1.85, -2.00], lookAt: [-3.60, 1.70, -4.80], fov: 30,
    move: { type: 'breathe', v: 0.07 }, hand: 0.35, focus: 'witnessHead', ap: 0.0025, mb: 0.006, deck: 'W',
  },
  ots_wit_from_pros: { // witness over the prosecutor's defocused right shoulder, frame-left.
    pos: [3.94, 1.81, 3.67], lookAt: [-3.60, 1.58, -4.80], fov: 21,
    move: { type: 'breathe', v: 0.10 }, hand: 0.50, focus: 'witnessHead', ap: 0.0018, mb: 0.007, deck: 'E',
  },
  ots_wit_from_def: { // witness over defense counsel's left shoulder; shoulder frame-right.
    pos: [-3.39, 1.81, 4.07], lookAt: [-3.60, 1.66, -4.80], fov: 21,
    move: { type: 'breathe', v: 0.10 }, hand: 0.50, focus: 'witnessHead', ap: 0.0018, mb: 0.007, deck: 'W',
  },
  wit_ecu_crack_e: { // the "cracked witness" creep. Eyes 65%, background obliterated.
    pos: [-2.50, 1.92, -3.70], lookAt: [-3.60, 1.88, -4.80], fov: 19,
    move: { type: 'creep', v: 0.045 }, hand: 0.15, focus: 'witnessHead', ap: 0.0045, mb: 0.010, deck: 'E',
  },
  wit_ecu_crack_w: {
    pos: [-4.90, 1.92, -3.60], lookAt: [-3.60, 1.87, -4.80], fov: 19,
    move: { type: 'creep', v: 0.045 }, hand: 0.15, focus: 'witnessHead', ap: 0.0045, mb: 0.010, deck: 'W',
  },
  wit_wide_stand: { // geography refresher: witness + bench corner in one frame.
    pos: [2.80, 2.10, -0.90], lookAt: [-2.60, 1.70, -5.40], fov: 40,
    move: { type: 'breathe', v: 0.08 }, hand: 0.15, focus: 'witnessHead', ap: 0.0008, mb: 0.003, deck: 'E',
  },

  // --- examining counsel coverage (§4.2) ---
  pros_mcu: { // prosecutor question single from the well. Looks screen-right. Eyes 62%.
    pos: [2.05, 1.78, 0.55], lookAt: [3.10, 1.46, 3.20], fov: 28,
    move: { type: 'breathe', v: 0.06 }, hand: 0.35, focus: 'prosHead', ap: 0.0025, mb: 0.006, deck: 'E',
  },
  pros_cu: {
    pos: [2.45, 1.72, 1.45], lookAt: [3.10, 1.52, 3.20], fov: 24,
    move: { type: 'breathe', v: 0.05 }, hand: 0.30, focus: 'prosHead', ap: 0.0035, mb: 0.008, deck: 'E',
  },
  pros_track: { // the "prowl": lateral Steadicam slide across the well. ~14s, then holds.
    pos: [0.90, 1.74, 0.10], lookAt: [3.10, 1.48, 3.20], fov: 30,
    move: { type: 'track', from: [0.90, 1.74, 0.10], to: [2.20, 1.74, 1.00], v: 0.11 }, hand: 0.55,
    focus: 'prosHead', ap: 0.0020, mb: 0.006, deck: 'E',
  },
  ots_pros_from_wit: { // prosecutor down-the-axis over the witness's head silhouette.
    pos: [-4.42, 2.18, -5.78], lookAt: [3.10, 1.30, 3.20], fov: 21,
    move: { type: 'breathe', v: 0.10 }, hand: 0.45, focus: 'prosHead', ap: 0.0015, mb: 0.007, deck: 'E', onAxis: true,
  },
  def_mcu: { // defense single "dirtied" by the defendant's soft shoulder frame-right.
    pos: [-4.75, 1.76, 0.85], lookAt: [-3.10, 1.46, 3.20], fov: 28,
    move: { type: 'breathe', v: 0.06 }, hand: 0.35, focus: 'defHead', ap: 0.0025, mb: 0.006, deck: 'W',
  },
  def_cu: {
    pos: [-4.05, 1.72, 1.70], lookAt: [-3.10, 1.52, 3.20], fov: 24,
    move: { type: 'breathe', v: 0.05 }, hand: 0.30, focus: 'defHead', ap: 0.0035, mb: 0.008, deck: 'W',
  },
  def_track: {
    pos: [-5.60, 1.74, -0.30], lookAt: [-3.10, 1.48, 3.20], fov: 30,
    move: { type: 'track', from: [-5.60, 1.74, -0.30], to: [-4.60, 1.74, 0.80], v: 0.10 }, hand: 0.55,
    focus: 'defHead', ap: 0.0020, mb: 0.006, deck: 'W',
  },
  ots_def_from_wit: {
    pos: [-3.68, 2.20, -6.00], lookAt: [-3.10, 1.32, 3.20], fov: 21,
    move: { type: 'breathe', v: 0.10 }, hand: 0.45, focus: 'defHead', ap: 0.0015, mb: 0.007, deck: 'W', onAxis: true,
  },

  // --- judge (§4.3): locked off — institutional power reads as stillness ---
  judge_low_a: { // low angle from the well, camera-right of center. Face 59%.
    pos: [0.85, 1.42, -3.30], lookAt: [0.00, 3.18, -6.85], fov: 30,
    move: { type: 'breathe', v: 0.05 }, hand: 0.0, focus: 'judgeHead', ap: 0.0018, mb: 0.005, deck: null,
  },
  judge_low_b: { // mirror variant.
    pos: [-0.95, 1.45, -3.15], lookAt: [0.00, 3.18, -6.85], fov: 30,
    move: { type: 'breathe', v: 0.05 }, hand: 0.0, focus: 'judgeHead', ap: 0.0018, mb: 0.005, deck: null,
  },
  judge_gavel: { // ruling shot: harder, lower, tighter — gavel-level. Face 63%.
    // pos offset right + slightly up so the ray clears the bench-front seal disc.
    pos: [0.95, 1.50, -3.85], lookAt: [0.00, 3.18, -6.80], fov: 26,
    move: { type: 'breathe', v: 0.05 }, hand: 0.0, focus: 'judgeHead', ap: 0.0022, mb: 0.006, deck: null,
  },

  // --- defense table & defendant (§4.4) ---
  deftable_two: { // two-shot: attorney standing + defendant seated, faces ~60%.
    pos: [-2.00, 1.70, -0.20], lookAt: [-3.60, 1.45, 2.90], fov: 32,
    move: { type: 'breathe', v: 0.07 }, hand: 0.25, focus: 'defendantHead', ap: 0.0015, mb: 0.005, deck: null,
  },
  defendant_cu_a: { // reaction CU, 3/4 front-left. Eyes 62%. The money shot.
    pos: [-3.00, 1.66, 0.95], lookAt: [-4.10, 1.55, 2.60], fov: 24,
    move: { type: 'breathe', v: 0.05 }, hand: 0.30, focus: 'defendantHead', ap: 0.0035, mb: 0.008, deck: null,
  },
  defendant_cu_b: { // reverse-side variant, tighter.
    pos: [-5.15, 1.68, 1.10], lookAt: [-4.10, 1.56, 2.60], fov: 22,
    move: { type: 'breathe', v: 0.05 }, hand: 0.30, focus: 'defendantHead', ap: 0.0040, mb: 0.009, deck: null,
  },

  // --- jury (§4.5) ---
  jury_pan: { // the classic jury survey: fixed pos, lookAt pans down the box over 6s.
    pos: [2.60, 1.95, -2.00], lookAt: [7.40, 1.62, -5.00], fov: 34,
    move: { type: 'pan', toLookAt: [7.40, 1.72, 0.20], dur: 6.0 }, hand: 0.20,
    focus: 'juryCenter', ap: 0.0008, mb: 0.004, deck: null,
  },
  jury_rake: { // raking shot down the two rows; nearest juror sharp, rest fall soft.
    pos: [5.00, 1.85, 1.60], lookAt: [7.60, 1.70, -3.40], fov: 28,
    move: { type: 'breathe', v: 0.06 }, hand: 0.25, focus: 'jurorNearest', ap: 0.0025, mb: 0.007, deck: null,
  },
  // juror_cu is parametric — built at cut time per front-row column (§6.4).

  // --- wides, establishing, doors, inserts (§4.6) ---
  est_high: { // establishing crane wide from room-left rear; window shafts rake the frame.
    pos: [-7.50, 4.60, 8.50], lookAt: [0.50, 1.50, -4.50], fov: 50,
    move: { type: 'breathe', v: 0.12 }, hand: 0.10, focus: 'wellCenter', ap: 0.0004, mb: 0.002, deck: null,
  },
  est_high_w: { // mirror from room-right rear (over the gallery, jury side).
    pos: [7.50, 4.60, 8.50], lookAt: [-0.50, 1.50, -4.50], fov: 50,
    move: { type: 'breathe', v: 0.12 }, hand: 0.10, focus: 'wellCenter', ap: 0.0004, mb: 0.002, deck: null,
  },
  est_axial: { // one-point perspective down the center aisle onto the bench.
    pos: [0.00, 2.60, 10.50], lookAt: [0.00, 2.20, -6.60], fov: 46,
    move: { type: 'breathe', v: 0.15 }, hand: 0.05, focus: 'judgeHead', ap: 0.0003, mb: 0.002, deck: null,
  },
  gallery_wide: { // reverse: from beside the bench out over the gallery into the fog depth.
    pos: [0.60, 2.90, -4.60], lookAt: [0.00, 1.50, 8.00], fov: 44,
    move: { type: 'breathe', v: 0.08 }, hand: 0.10, focus: 'wellCenter', ap: 0.0004, mb: 0.002, deck: null,
  },
  venire: { // jury selection: the candidate panel seated in the gallery pews, from the bar rail.
    pos: [0.00, 2.55, 1.20], lookAt: [0.00, 1.35, 8.60], fov: 40,
    move: { type: 'breathe', v: 0.05 }, hand: 0.12, focus: 'venireCenter', ap: 0.0005, mb: 0.003, deck: null,
  },
  doors_wide: { // the entrance: rear aisle, walking-in feel, slow forward dolly.
    pos: [0.00, 1.90, 12.50], lookAt: [0.00, 1.70, 2.00], fov: 40,
    move: { type: 'dolly', from: [0.00, 1.90, 12.50], to: [0.00, 1.86, 10.20], dur: 9.0 }, hand: 0.40,
    focus: 'wellCenter', ap: 0.0005, mb: 0.003, deck: null,
  },
  insert_pros: { // "exhibit insert": high-tilt close on the prosecution table papers.
    pos: [2.55, 1.45, 1.15], lookAt: [3.50, 0.86, 2.30], fov: 22,
    move: { type: 'track', from: [2.55, 1.45, 1.15], to: [2.70, 1.43, 1.05], v: 0.03 }, hand: 0.20,
    focus: 'prosPaper', ap: 0.0060, mb: 0.012, deck: null,
  },
  insert_def: {
    pos: [-2.55, 1.45, 1.15], lookAt: [-3.50, 0.86, 2.30], fov: 22,
    move: { type: 'track', from: [-2.55, 1.45, 1.15], to: [-2.70, 1.43, 1.05], v: 0.03 }, hand: 0.20,
    focus: 'defPaper', ap: 0.0060, mb: 0.012, deck: null,
  },

  // --- sequence-only shots (§4.7) ---
  objection_pros: { // whip target when the prosecutor objects. Punch 23°→21° + shake.
    pos: [2.30, 1.70, 1.00], lookAt: [3.10, 1.52, 3.20], fov: 23,
    move: { type: 'punch', fovTo: 21, dur: 0.25 }, hand: 0.60, focus: 'prosHead', ap: 0.0035, mb: 0.008, deck: null,
  },
  objection_def: { // also used by the player's OBJECT button.
    pos: [-2.30, 1.70, 1.00], lookAt: [-3.10, 1.52, 3.20], fov: 23,
    move: { type: 'punch', fovTo: 21, dur: 0.25 }, hand: 0.60, focus: 'defHead', ap: 0.0035, mb: 0.008, deck: null,
  },
  stand_arrival: { // witness sworn in: Steadicam approach through the well to the stand.
    pos: [1.80, 1.78, 5.20], lookAt: [-3.60, 1.50, -4.70], fov: 34,
    move: { type: 'dolly', from: [1.80, 1.78, 5.20], to: [0.20, 1.74, -1.40], dur: 5.5 }, hand: 0.45,
    focus: 'witnessHead', ap: 0.0012, mb: 0.005, deck: null,
  },
  verdict_push: { // the long walk: slow push MS→CU on the defendant. Travel cap 2.0m.
    pos: [-1.70, 1.66, -0.60], lookAt: [-4.10, 1.50, 2.60], fov: 26,
    move: { type: 'creep', v: 0.10 }, hand: 0.12, focus: 'defendantHead', ap: 0.0030, mb: 0.008, deck: null,
    cap: 2.0,
  },
  orbit_idle: { // voir dire / title / hidden-courtroom backdrop. Slow crane orbit.
    lookAt: [0.00, 1.70, -2.00], fov: 45,
    move: { type: 'orbit' }, hand: 0.0, focus: 'wellCenter', ap: 0.0003, mb: 0.002, deck: null,
  },
};

// Legacy aliases (keep ?preview= and setShot working).
const ALIASES = {
  wide: 'est_high', judge: 'judge_low_a', witness: 'wit_mcu_e', prosecutor: 'pros_mcu',
  defense: 'def_mcu', jury: 'jury_pan', gallery: 'gallery_wide',
};

// Rotation lists (§6.2). Same shot never plays twice in a row for the same subject.
const LISTS = {
  'wit:E': ['wit_cu_e', 'wit_mcu_e', 'ots_wit_from_pros'],
  'wit:W': ['wit_cu_w', 'wit_mcu_w', 'ots_wit_from_def'],
  'q:pros': ['pros_mcu', 'ots_pros_from_wit', 'pros_track', 'pros_cu'],
  'q:def': ['def_mcu', 'ots_def_from_wit', 'def_track', 'def_cu'],
  'stmt:pros': ['pros_cu', 'pros_mcu'],
  'stmt:def': ['def_cu', 'def_mcu'],
  judge: ['judge_low_a', 'judge_low_b'],
  narrator: ['est_high', 'gallery_wide', 'wit_wide_stand'],
  cue: ['jury_pan', 'jury_rake'],
  defendantCut: ['defendant_cu_a', 'defendant_cu_b'],
};

// Idle backdrops per phase (§7.6).
const IDLE = {
  voirDire: 'orbit_idle', title: 'orbit_idle', orbit: 'orbit_idle',
  openings: 'doors_wide', peoplesCase: 'est_high', defenseCase: 'est_high_w',
  closings: 'gallery_wide', deliberation: 'jury_pan',
};

export class Director {
  constructor(opts = {}) {
    this.dev = !!opts.dev;
    this.apertureScale = opts.apertureScale ?? 1;

    // grammar state (§5)
    this.n = 0;
    this.counters = {};
    this.lastSide = null;
    this.consecWit = 0;
    this.lastWasCutaway = false;
    this.examiner = 'pros';
    this.forceWitCU = false;
    this.witnessMood = 'neutral';
    this.anchors = { judge: null, prosecutor: null, defense: null, defendant: null, witness: null, jurors: [] };

    // active shot state (anchors + move params resolved at cut time)
    this._shot = SHOTS.est_high;
    this._shotName = null;
    this._shotT = 0;
    this._trav = 0;
    this._orbitA = 0;
    this._cutPos = new THREE.Vector3();
    this._cutLook = new THREE.Vector3();
    this._pushDir = new THREE.Vector3();
    this._pushCap = 0;
    this._dollyFrom = new THREE.Vector3();
    this._dollyTo = new THREE.Vector3();
    this._trackFrom = new THREE.Vector3();
    this._trackDir = new THREE.Vector3();
    this._trackLen = 0;
    this._panFrom = new THREE.Vector3();
    this._panTo = new THREE.Vector3();
    this._focusPoint = new THREE.Vector3();
    this._phases = new Float64Array(6);

    // feel state: settle/shake impulse (§7.1/§8.2), ease-cut (§8.6), rack focus (§8.4)
    this._imp = { t: 9, amp: 0, tau: 0.07, dx: 0, dy: 0, roll: 0 };
    this._ease = { on: false, t: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 42 };
    this._focus = -1;
    this._aperture = -1;
    this._fovNow = 42;
    this._aspectComp = 1;
    this._verdictLock = false;
    this._hasFrame = false;
    this._warned = new Set();

    // reused output + scratch (zero per-frame allocations)
    this._out = {
      position: new THREE.Vector3(), lookAt: new THREE.Vector3(), fov: 42, roll: 0,
      dofFocus: 4, dofAperture: 0.0025, dofMaxblur: 0.008,
    };
    this._pos = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._tmp = new THREE.Vector3();

    if (this.dev) this._assertLibrary();
    this.cut('est_high');
  }

  get shotName() { return this._shotName; }

  // ---------- external state ----------
  setAnchors(map) {
    for (const k of ['judge', 'prosecutor', 'defense', 'defendant', 'witness', 'jurors']) {
      if (k in map) this.anchors[k] = map[k];
    }
  }

  setExaminer(side) {
    this.examiner = (side === 'def' || side === 'defense') ? 'def' : 'pros';
  }

  setWitnessMood(mood) { this.witnessMood = mood || 'neutral'; }

  setAspectComp(f) { this._aspectComp = f || 1; }

  // ---------- grammar (§6.3, exact order) ----------
  onBeat(beat, side, ctx = {}) {
    if (this._verdictLock) return this._shotName; // nothing preempts the verdict push
    this.n++;
    const h = hash(this.n);
    const kind = beat && beat.kind;

    // examiner inference (§6.1); ctx.examiner overrides when supplied
    if (kind === 'question' && (side === 'pros' || side === 'def')) this.examiner = side;
    if (ctx.examiner) this.examiner = (ctx.examiner === 'def' || ctx.examiner === 'defense') ? 'def' : 'pros';
    const deck = this.examiner === 'pros' ? 'E' : 'W';

    let name;
    if (ctx.shot && SHOTS[ctx.shot]) {
      // authored beat pins its own shot (cinematic sequences)
      name = this._apply(ctx.shot, SHOTS[ctx.shot], { allowEase: side === this.lastSide });
    } else if (kind === 'objection') {
      // 1. objection whip: by speaker; punch + impact shake (§7.1)
      name = this._objection(beat.speaker === 'prosecutor' ? 'pros' : 'def');
    } else if (kind === 'ruling') {
      // 2. ruling: gavel low angle; next witness beat is their reaction CU (§7.2)
      name = this._apply('judge_gavel', SHOTS.judge_gavel, {});
      this.forceWitCU = true;
      this.consecWit = 0;
    } else if (ctx.insert || ctx.admissionFirst) {
      // evidence admission, first beat: exhibit insert by examiner (§7.7)
      name = deck === 'E'
        ? this._apply('insert_pros', SHOTS.insert_pros, {})
        : this._apply('insert_def', SHOTS.insert_def, {});
    } else if (side === 'judge') {
      name = this._rotate('judge', side); // 3.
    } else if (side === 'narrator') {
      name = this._rotate(kind === 'cue' ? 'cue' : 'narrator', side); // 4.
    } else if (side === 'pros' || side === 'def') {
      // 5. questions from the examiner get exam coverage; everything else, statements
      const key = (kind === 'question' && side === this.examiner ? 'q:' : 'stmt:') + side;
      name = this._rotate(key, side);
      this.consecWit = 0;
    } else if (side === 'wit') {
      name = this._witnessBeat(h, deck, side); // 6.
    } else if (side === 'defendant') {
      name = this._rotate('defendantCut', side); // defendant speaks (table conferences)
    } else if (side === 'jury') {
      // the foreperson speaks for the panel
      name = this._apply('jury_rake', SHOTS.jury_rake, { allowEase: side === this.lastSide });
    } else {
      name = this._rotate('narrator', side); // unknown side → neutral coverage
    }

    this.lastSide = side;
    if (this.dev) console.log(`[director] #${this.n} ${side}/${kind || 'normal'} → ${name}`);
    return name;
  }

  _witnessBeat(h, deck, side) {
    if (this.forceWitCU) { // post-ruling reaction CU
      this.forceWitCU = false;
      this.consecWit = 1;
      const name = deck === 'E' ? 'wit_cu_e' : 'wit_cu_w';
      return this._apply(name, SHOTS[name], { allowEase: side === this.lastSide });
    }
    if (this.witnessMood === 'down') { // cracked witness: coverage collapses to the creep (§7.4)
      const name = deck === 'E' ? 'wit_ecu_crack_e' : 'wit_ecu_crack_w';
      return this._apply(name, SHOTS[name], { allowEase: side === this.lastSide });
    }
    this.consecWit++;
    // Reaction-cutaway rule: only during runs of witness speech, never on the first
    // answer beat after a question, never twice in a row. ~20% of eligible beats.
    if (this.consecWit >= 2 && !this.lastWasCutaway && h % 5 === 0) {
      this.lastWasCutaway = true;
      if (((h >> 4) % 2) === 0) return this._rotate('defendantCut', side); // defendant listening
      return this._jurorCU((h >> 7) % 6);                                  // front-row juror listening
    }
    this.lastWasCutaway = false;
    if (this.witnessMood === 'stressed' && h % 3 !== 0) { // stressed = stay tight
      const name = deck === 'E' ? 'wit_cu_e' : 'wit_cu_w';
      return this._apply(name, SHOTS[name], { allowEase: side === this.lastSide });
    }
    return this._rotate('wit:' + deck, side);
  }

  // Parametric juror CU (§6.4) — the one permitted cut-time allocation.
  _jurorCU(col) {
    const p = this._tmp;
    const person = this.anchors.jurors && this.anchors.jurors[col];
    if (person && person.parts && person.parts.head) person.parts.head.getWorldPosition(p);
    else p.fromArray(jurorHead(col));
    const shot = {
      pos: [p.x - 1.85, p.y + 0.06, p.z + 0.50], lookAt: [p.x, p.y - 0.10, p.z],
      fov: 24, move: { type: 'breathe', v: 0.04 }, hand: 0.25,
      focusPoint: [p.x, p.y, p.z], ap: 0.0035, mb: 0.008, deck: null,
    };
    return this._apply('juror_cu_' + col, shot, {});
  }

  // ---------- special sequences (§7) ----------
  special(name) {
    if (name === 'verdict') { // non-preemptable until idle()/cut() from a new phase (§7.5)
      this._verdictLock = false;
      const r = this._apply('verdict_push', SHOTS.verdict_push, {});
      this._verdictLock = true;
      return r;
    }
    if (this._verdictLock) return this._shotName;
    if (name === 'objection-pros') { this.n++; return this._objection('pros'); }
    if (name === 'objection-def') { this.n++; return this._objection('def'); }
    if (name === 'witness-arrival') { // §7.3 — beats preempt this dolly naturally
      this.examiner = 'pros';
      this.consecWit = 0;
      this.counters['wit:E'] = 0;
      this.counters['wit:W'] = 0;
      return this._apply('stand_arrival', SHOTS.stand_arrival, {});
    }
    return this._shotName;
  }

  _objection(side) {
    this.consecWit = 0;
    const name = side === 'pros' ? 'objection_pros' : 'objection_def';
    return this._apply(name, SHOTS[name], { impulse: 'objection' });
  }

  // Phase title cards / idle backdrops (§7.6). Replaces setOrbit(true).
  idle(phase) {
    if (phase === 'verdict') return this._verdictLock ? this._shotName : this.special('verdict');
    this._verdictLock = false;
    const name = IDLE[phase] || 'est_axial';
    return this._apply(name, SHOTS[name], {});
  }

  // Direct cut: library shot or legacy alias; unknown falls back to est_high.
  cut(name) {
    this._verdictLock = false;
    let key = ALIASES[name] || name;
    if (!SHOTS[key]) {
      if (!this._warned.has(name)) {
        this._warned.add(name);
        console.warn(`[director] unknown shot "${name}" — falling back to est_high`);
      }
      key = 'est_high';
    }
    return this._apply(key, SHOTS[key], {});
  }

  // ---------- cutting ----------
  _rotate(key, side) {
    const L = LISTS[key];
    const idx = this.counters[key] = (this.counters[key] ?? 0) + 1;
    let name = L[idx % L.length];
    if (name === this._shotName) name = L[(idx + 1) % L.length];
    return this._apply(name, SHOTS[name], { allowEase: side != null && side === this.lastSide });
  }

  _apply(name, shot, o = {}) {
    if (name === this._shotName) {
      // §8.5 continuity: same shot ⇒ keep move progress, skip the settle.
      // A repeated objection still jolts.
      if (o.impulse === 'objection') this._impulse(0.09, 0.05, 0.009);
      return name;
    }
    const prev = this._shot;

    // §6.5 ease eligibility: same speaker AND same deck AND same subject AND a short hop.
    let ease = false;
    if (o.allowEase && prev && this._hasFrame && shot.pos && shot.focus && shot.focus === prev.focus &&
        (shot.deck ?? null) === (prev.deck ?? null)) {
      this._tmp.fromArray(shot.pos);
      ease = this._tmp.distanceTo(this._out.position) < 1.4;
    }

    this._shot = shot;
    this._shotName = name;
    this._shotT = 0;
    this._trav = 0;

    const move = shot.move || {};
    if (move.type === 'orbit') {
      this._cutLook.fromArray(shot.lookAt); // pos is computed per frame
    } else {
      this._cutPos.fromArray(shot.pos);
      this._cutLook.fromArray(shot.lookAt);
    }

    // resolve the focus anchor once per cut (§8: anchors resolved at cut time)
    if (shot.focusPoint) this._focusPoint.fromArray(shot.focusPoint);
    else this._resolveAnchor(shot.focus || 'wellCenter', this._focusPoint);

    // move-specific setup
    if (move.type === 'breathe' || move.type === 'creep') {
      this._pushDir.subVectors(this._cutLook, this._cutPos).normalize();
      const d0 = this._cutPos.distanceTo(this._focusPoint);
      // travel cap (§4.7): never closer than 1.1m to a face; verdict_push overrides
      this._pushCap = shot.cap ?? Math.max(0, Math.min(0.55, 0.15 * d0, d0 - 1.1));
    } else if (move.type === 'dolly') {
      this._dollyFrom.fromArray(move.from);
      this._dollyTo.fromArray(move.to);
    } else if (move.type === 'track') {
      this._trackFrom.fromArray(move.from);
      this._trackDir.fromArray(move.to).sub(this._trackFrom);
      this._trackLen = this._trackDir.length();
      this._trackDir.normalize();
    } else if (move.type === 'pan') {
      this._panFrom.copy(this._cutLook);
      this._panTo.fromArray(move.toLookAt);
    }

    // handheld phases from the shot name (§8.1) — identical every playthrough
    let s = 0;
    for (let i = 0; i < name.length; i++) s += name.charCodeAt(i);
    let hh = hash(s);
    for (let i = 0; i < 6; i++) {
      hh = hash(hh + i + 1);
      this._phases[i] = (hh % 6283) / 1000;
    }

    if (ease) { // §8.6: blend from current rendered values; no settle at the end
      this._ease.on = true;
      this._ease.t = 0;
      this._ease.pos.copy(this._out.position);
      this._ease.look.copy(this._out.lookAt);
      this._ease.fov = this._fovNow;
    } else {
      this._ease.on = false;
      if (o.impulse === 'objection') this._impulse(0.09, 0.05, 0.009); // §7.1
      else this._impulse(0.020 + 0.025 * (shot.hand || 0), 0.07, 0);   // §8.2 cut settle
    }
    return name;
  }

  _impulse(amp, tau, roll) {
    const h = hash(this.n);
    const dx = (h & 255) / 255 - 0.5, dy = ((h >> 8) & 255) / 255 - 0.5;
    const len = Math.hypot(dx, dy) || 1;
    this._imp.t = 0;
    this._imp.amp = amp;
    this._imp.tau = tau;
    this._imp.roll = roll;
    this._imp.dx = dx / len;
    this._imp.dy = dy / len;
  }

  _resolveAnchor(name, out) {
    const a = this.anchors;
    let person = null;
    if (name === 'jurorNearest') person = a.jurors && a.jurors[5];
    else if (ANCHOR_PERSON[name]) person = a[ANCHOR_PERSON[name]];
    if (person && person.parts && person.parts.head) return person.parts.head.getWorldPosition(out);
    const c = ANCHOR[name] || ANCHOR.wellCenter;
    return out.set(c[0], c[1], c[2]);
  }

  // ---------- per-frame composition (§8) — zero allocations ----------
  tick(dt, t) {
    const shot = this._shot, move = shot.move || {}, out = this._out;
    const pos = this._pos, look = this._look;
    this._shotT += dt;
    let fov = shot.fov || 45;

    // base + move offset
    if (move.type === 'orbit') {
      this._orbitA += dt * 0.05;
      pos.set(Math.sin(this._orbitA) * 9.8, 3.2 + 0.5 * Math.sin(0.11 * t), 2 + Math.cos(this._orbitA) * 9.8);
      look.copy(this._cutLook);
    } else {
      pos.copy(this._cutPos);
      look.copy(this._cutLook);
      switch (move.type) {
        case 'breathe':
        case 'creep': { // §8.3: the frame lands for 0.4s, then leans in (0.6s velocity ramp)
          const u = clamp((this._shotT - 0.4) / 0.6, 0, 1);
          this._trav = Math.min(this._pushCap, this._trav + move.v * smooth(u) * dt);
          pos.addScaledVector(this._pushDir, this._trav);
          break;
        }
        case 'dolly': {
          const s = smooth(clamp(this._shotT / move.dur, 0, 1));
          pos.lerpVectors(this._dollyFrom, this._dollyTo, s);
          break;
        }
        case 'track': { // constant velocity after a 0.5s ramp, holds at the end
          const r = smooth(clamp(this._shotT / 0.5, 0, 1));
          this._trav = Math.min(this._trackLen, this._trav + move.v * r * dt);
          pos.copy(this._trackFrom).addScaledVector(this._trackDir, this._trav);
          break;
        }
        case 'pan': {
          const s = smooth(clamp(this._shotT / move.dur, 0, 1));
          look.lerpVectors(this._panFrom, this._panTo, s);
          break;
        }
        case 'punch': { // FOV ramp, ease-out quadratic (§7.1)
          const u = clamp(this._shotT / move.dur, 0, 1);
          fov = shot.fov + (move.fovTo - shot.fov) * (1 - (1 - u) * (1 - u));
          break;
        }
      }
    }

    // camera right axis for handheld + impulse (world-up assumed)
    this._fwd.subVectors(look, pos);
    this._right.set(-this._fwd.z, 0, this._fwd.x).normalize();

    // handheld (§8.1): three layered sines per axis, per-shot phases
    const hand = shot.hand || 0;
    if (hand > 0) {
      const A = 0.022 * hand, P = this._phases;
      const ox = A * (0.55 * Math.sin(1.1 * t + P[0]) + 0.30 * Math.sin(2.7 * t + P[1]) + 0.15 * Math.sin(5.3 * t + P[2]));
      const oy = A * (0.50 * Math.sin(1.4 * t + P[3]) + 0.35 * Math.sin(3.1 * t + P[4]) + 0.15 * Math.sin(6.1 * t + P[5]));
      pos.addScaledVector(this._right, ox);
      pos.y += oy;
      look.addScaledVector(this._right, 0.4 * ox);
      look.y += 0.4 * oy;
    }

    // settle / objection impulse (§7.1, §8.2): Rayleigh profile, dead by ~0.3s
    let roll = 0;
    const imp = this._imp;
    if (imp.t < 0.35) {
      imp.t += dt; // first rendered frame carries near-peak offset
      const a = imp.amp * (imp.t / imp.tau) * Math.exp(1 - imp.t / imp.tau);
      pos.addScaledVector(this._right, imp.dx * a);
      pos.y += imp.dy * a;
      if (imp.roll) roll = imp.roll * Math.exp(-imp.t / 0.05);
    }

    // ease-cut blend (§8.6): cubic in-out from the captured frame; handheld continues
    if (this._ease.on) {
      this._ease.t += dt;
      const s = smooth(clamp(this._ease.t / 0.7, 0, 1));
      out.position.lerpVectors(this._ease.pos, pos, s);
      out.lookAt.lerpVectors(this._ease.look, look, s);
      fov = this._ease.fov + (fov - this._ease.fov) * s;
      if (this._ease.t >= 0.7) this._ease.on = false;
    } else {
      out.position.copy(pos);
      out.lookAt.copy(look);
    }
    this._fovNow = fov;
    out.fov = fov * this._aspectComp; // §2 aspect compensation
    out.roll = roll;

    // rack focus (§8.4): target rides pushes/dollies; output smoothed τ=0.13s,
    // aperture τ=0.2s. maxblur snaps per shot.
    const fTarget = out.position.distanceTo(this._focusPoint);
    const aTarget = (shot.ap ?? 0.0025) * this.apertureScale;
    if (this._focus < 0) {
      this._focus = fTarget;
      this._aperture = aTarget;
    } else {
      this._focus += (fTarget - this._focus) * (1 - Math.exp(-dt / 0.13));
      this._aperture += (aTarget - this._aperture) * (1 - Math.exp(-dt / 0.2));
    }
    out.dofFocus = this._focus;
    out.dofAperture = this._aperture;
    out.dofMaxblur = shot.mb ?? 0.006;

    this._hasFrame = true;
    return out;
  }

  // ---------- dev assertions (§11) ----------
  _assertLibrary() {
    const FACE = { witnessHead: 1, prosHead: 1, defHead: 1, judgeHead: 1, defendantHead: 1 };
    for (const [name, s] of Object.entries(SHOTS)) {
      if (!s.pos) continue; // orbit_idle computes its position per frame
      const pts = [s.pos];
      if (s.move && s.move.to) pts.push(s.move.to);
      for (const p of pts) {
        const [x, y, z] = p;
        // 180° line decks (§3); on-axis reverses are exempt
        if (!s.onAxis) {
          if (s.deck === 'E' && !(8.0 * x - 6.7 * z - 3.36 > 0)) {
            console.error(`[director] DECK E violation in ${name}: (${x}, ${z})`);
          }
          if (s.deck === 'W' && !(8.0 * x - 0.5 * z + 26.4 < 0)) {
            console.error(`[director] DECK W violation in ${name}: (${x}, ${z})`);
          }
        }
        // camera must not sit inside furniture
        for (const v of VOLUMES) {
          if (x > v[0] && x < v[1] && y > v[2] && y < v[3] && z > v[4] && z < v[5]) {
            console.error(`[director] ${name} pos inside solid volume [${v}]`);
          }
        }
      }
      // face-line rule (§2): dialogue shots keep eyes at 58–68% of frame height
      if (FACE[s.focus] && s.fov < 36) {
        const head = ANCHOR[s.focus];
        const d = Math.hypot(s.pos[0] - head[0], s.pos[1] - head[1], s.pos[2] - head[2]);
        const frac = 0.5 + (head[1] - s.lookAt[1]) / (2 * d * Math.tan(s.fov * Math.PI / 360));
        if (frac < 0.56 || frac > 0.70) {
          console.error(`[director] faceFrac ${frac.toFixed(3)} out of [0.56, 0.70] in ${name}`);
        }
      }
    }
  }
}
