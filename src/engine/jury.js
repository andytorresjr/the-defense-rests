// The jury model: per-juror, per-issue beliefs recomputed from the trial record,
// and an element-mapped deliberation simulation that produces the verdict.
//
// Convention: belief value = how strongly the juror credits the PROSECUTION's
// position on that issue (0 = fully with the defense, 1 = fully with the State).

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Recompute every juror's beliefs from scratch: priors + every live record
// entry (weighted by source-witness credibility and channel receptivity)
// + accumulated non-record adjustments (closings, backfires, admonishments).
// Recomputing from scratch makes strikes and retroactive impeachment trivially correct.
export function recomputeBeliefs(state, caseData) {
  const FACTS = caseData.facts;
  for (const j of state.jury) {
    const b = { ...j.priors };
    for (const e of state.record) {
      const fact = FACTS[e.factId];
      if (!fact || !fact.w || e.mod <= 0) continue;
      const cred = e.source ? (state.witnesses[e.source]?.credibility ?? 1) : 1;
      for (const [iss, w] of Object.entries(fact.w)) {
        b[iss] = (b[iss] ?? 0.5) + w * cred * e.mod * (j.receptivity[fact.channel] ?? 1);
      }
    }
    for (const adj of j.adjustments) {
      b[adj.issue] = (b[adj.issue] ?? 0.5) + adj.delta;
    }
    // Juror annoyance (badgering, frivolous objections) bleeds against the defense.
    const pen = Math.max(0, j.annoyance - 2) * 0.012;
    for (const iss of Object.keys(b)) b[iss] = clamp(b[iss] + pen, 0.02, 0.98);
    j.beliefs = b;
  }
}

// Map the contested issues onto the legal elements of the charge, as declared
// by the case's verdictModel: `act` (did the defendant do the thing — a
// weighted blend of issues) and `mensRea` (the state-of-mind issue that
// separates the top charge from the lesser included).
export function elementBeliefs(juror, caseData) {
  const vm = caseData.verdictModel;
  let act = 0;
  for (const [iss, w] of Object.entries(vm.act)) act += (juror.beliefs[iss] ?? 0.5) * w;
  return { act, mensRea: juror.beliefs[vm.mensRea] ?? 0.5 };
}

// A juror's preferred verdict given current beliefs.
// act unproven -> NG. act + mensRea proven -> TOP charge.
// act proven, mensRea short of the (slightly lower) bar -> LESSER included.
export function jurorStance(juror, caseData, els) {
  const e = els || elementBeliefs(juror, caseData);
  const dt = juror.doubtThreshold;
  if (e.act < dt) return 'NG';
  if (e.mensRea >= dt - 0.02) return 'TOP';
  return 'LESSER';
}

const SEVERITY = { TOP: 3, LESSER: 2, NG: 1 };

// Simulate deliberation: initial ballot, then rounds of social influence in
// which minority jurors drift toward the majority proportionally to
// (1 - firmness). Unanimity -> verdict; a strong majority can flip soft
// holdouts at the end; otherwise the jury hangs.
export function deliberate(state, caseData, rng) {
  const room = state.jury.map(j => {
    const e = elementBeliefs(j, caseData);
    return { juror: j, act: e.act, mensRea: e.mensRea, dt: j.doubtThreshold, stance: jurorStance(j, caseData, e), flipped: false };
  });

  const ballots = [tally(room)];

  for (let round = 0; round < 8; round++) {
    const counts = tally(room);
    const majority = majorityStance(counts);
    if (counts[majority] === room.length) break;

    // Majority bloc means, used as the attractor.
    const bloc = room.filter(r => r.stance === majority);
    const mk = avg(bloc.map(r => r.act));
    const mm = avg(bloc.map(r => r.mensRea));

    for (const r of room) {
      if (r.stance === majority) continue;
      const marginPull = 1 + (counts[majority] - counts[r.stance]) / 12;
      const pull = (1 - r.juror.firmness) * 0.055 * marginPull;
      const jitter = (rng() - 0.5) * 0.01;
      r.act += (mk - r.act) * pull + jitter;
      r.mensRea += (mm - r.mensRea) * pull + jitter;
      // Normative pressure: a holdout's insistence on the margin erodes —
      // "is my doubt really reasonable?" — capped, and slower for firm jurors.
      const erosion = (1 - r.juror.firmness) * 0.018 * marginPull;
      r.dt = Math.max(r.juror.doubtThreshold - 0.085, r.dt - erosion);
      const next = stanceFromValues(r, r.act, r.mensRea);
      if (next !== r.stance) { r.stance = next; r.flipped = true; }
    }
    ballots.push(tally(room));
  }

  let counts = tally(room);
  let verdict;
  const maj = majorityStance(counts);
  if (counts[maj] === room.length) {
    verdict = maj;
  } else if (counts[maj] >= 10) {
    // Endgame: holdouts facing a 10+ majority cave probabilistically —
    // likelier when they are soft, barely past their own threshold, or
    // standing entirely alone against eleven.
    for (const r of room) {
      if (r.stance === maj) continue;
      const margin = Math.abs(r.act - r.dt);
      const lonely = (counts[maj] - 10) * 0.35;
      const caveChance = Math.max(0, Math.min(1, 0.55 * (1 - r.juror.firmness) + (0.06 - margin) * 6 + lonely));
      if (rng() < caveChance) { r.stance = maj; r.flipped = true; }
    }
    counts = tally(room);
    verdict = counts[maj] === room.length ? maj : 'HUNG';
    ballots.push(counts);
  } else {
    verdict = 'HUNG';
  }

  return { verdict, ballots, room };
}

function tally(room) {
  const c = { TOP: 0, LESSER: 0, NG: 0 };
  for (const r of room) c[r.stance]++;
  return c;
}

function majorityStance(counts) {
  return ['TOP', 'LESSER', 'NG'].sort((a, b) => counts[b] - counts[a] || SEVERITY[b] - SEVERITY[a])[0];
}

// roomEntry carries the (possibly eroded) working threshold `dt`.
function stanceFromValues(roomEntry, act, mensRea) {
  const dt = roomEntry.dt;
  if (act < dt) return 'NG';
  if (mensRea >= dt - 0.02) return 'TOP';
  return 'LESSER';
}

function avg(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }

// For the verdict breakdown screen: which record fact most drove this juror's
// position on the issue that decided their vote.
export function keyFactFor(state, caseData, roomEntry) {
  const j = roomEntry.juror;
  const b = j.beliefs;
  const vm = caseData.verdictModel;
  const actIssues = Object.keys(vm.act);
  let issue, towardProsecution;
  if (roomEntry.stance === 'NG') {
    issue = actIssues.slice().sort((x, y) => b[x] - b[y])[0];
    towardProsecution = false;
  } else if (roomEntry.stance === 'LESSER') {
    issue = vm.mensRea;
    towardProsecution = false;
  } else {
    issue = actIssues.concat(vm.mensRea).sort((x, y) => b[y] - b[x])[0];
    towardProsecution = true;
  }

  let best = null, bestMag = 0;
  for (const e of state.record) {
    const fact = caseData.facts[e.factId];
    if (!fact?.w?.[issue] || e.mod <= 0.3) continue;
    const cred = e.source ? (state.witnesses[e.source]?.credibility ?? 1) : 1;
    const contrib = fact.w[issue] * cred * e.mod * (j.receptivity[fact.channel] ?? 1);
    if (towardProsecution ? contrib > bestMag : contrib < -bestMag) {
      best = fact; bestMag = Math.abs(contrib);
    }
  }
  return { issue, fact: best };
}

// Aggregate means, used by the prosecutor AI, narrator cues, and debug overlay.
export function meanBeliefs(state) {
  const sums = {}, n = state.jury.length || 1;
  for (const j of state.jury) {
    for (const [iss, v] of Object.entries(j.beliefs)) sums[iss] = (sums[iss] ?? 0) + v;
  }
  const out = {};
  for (const [iss, s] of Object.entries(sums)) out[iss] = s / n;
  return out;
}
