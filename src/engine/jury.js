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

// Map the contested issues onto the legal elements of the charge.
// Killing-by-defendant draws on identity/timeline/weapon/altSuspect;
// malice is the intent issue.
export function elementBeliefs(juror) {
  const b = juror.beliefs;
  return {
    killing: 0.45 * b.identity + 0.25 * b.timeline + 0.15 * b.weapon + 0.15 * b.altSuspect,
    malice: b.intent,
  };
}

// A juror's preferred verdict given current beliefs.
// killing unproven -> NG. killing proven + malice proven -> M2.
// killing proven, malice short of the (slightly lower) malice bar -> MANslaughter.
export function jurorStance(juror, els) {
  const e = els || elementBeliefs(juror);
  const dt = juror.doubtThreshold;
  if (e.killing < dt) return 'NG';
  if (e.malice >= dt - 0.05) return 'M2';
  return 'MAN';
}

const SEVERITY = { M2: 3, MAN: 2, NG: 1 };

// Simulate deliberation: initial ballot, then rounds of social influence in
// which minority jurors drift toward the majority proportionally to
// (1 - firmness). Unanimity -> verdict; a strong majority can flip soft
// holdouts at the end; otherwise the jury hangs.
export function deliberate(state, rng) {
  const room = state.jury.map(j => {
    const e = elementBeliefs(j);
    return { juror: j, killing: e.killing, malice: e.malice, dt: j.doubtThreshold, stance: jurorStance(j, e), flipped: false };
  });

  const ballots = [tally(room)];

  for (let round = 0; round < 8; round++) {
    const counts = tally(room);
    const majority = majorityStance(counts);
    if (counts[majority] === room.length) break;

    // Majority bloc means, used as the attractor.
    const bloc = room.filter(r => r.stance === majority);
    const mk = avg(bloc.map(r => r.killing));
    const mm = avg(bloc.map(r => r.malice));

    for (const r of room) {
      if (r.stance === majority) continue;
      const marginPull = 1 + (counts[majority] - counts[r.stance]) / 12;
      const pull = (1 - r.juror.firmness) * 0.055 * marginPull;
      const jitter = (rng() - 0.5) * 0.01;
      r.killing += (mk - r.killing) * pull + jitter;
      r.malice += (mm - r.malice) * pull + jitter;
      // Normative pressure: a holdout's insistence on the margin erodes —
      // "is my doubt really reasonable?" — capped, and slower for firm jurors.
      const erosion = (1 - r.juror.firmness) * 0.014 * marginPull;
      r.dt = Math.max(r.juror.doubtThreshold - 0.07, r.dt - erosion);
      const next = stanceFromValues(r, r.killing, r.malice);
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
    // likelier when they are soft or barely past their own threshold.
    for (const r of room) {
      if (r.stance === maj) continue;
      const margin = Math.abs(r.killing - r.dt);
      const caveChance = Math.max(0, Math.min(1, 0.55 * (1 - r.juror.firmness) + (0.06 - margin) * 6));
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
  const c = { M2: 0, MAN: 0, NG: 0 };
  for (const r of room) c[r.stance]++;
  return c;
}

function majorityStance(counts) {
  return ['M2', 'MAN', 'NG'].sort((a, b) => counts[b] - counts[a] || SEVERITY[b] - SEVERITY[a])[0];
}

// roomEntry carries the (possibly eroded) working threshold `dt`.
function stanceFromValues(roomEntry, killing, malice) {
  const dt = roomEntry.dt;
  if (killing < dt) return 'NG';
  if (malice >= dt - 0.05) return 'M2';
  return 'MAN';
}

function avg(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }

// For the verdict breakdown screen: which record fact most drove this juror's
// position on the issue that decided their vote.
export function keyFactFor(state, caseData, roomEntry) {
  const j = roomEntry.juror;
  const b = j.beliefs;
  const killingIssues = ['identity', 'timeline', 'weapon', 'altSuspect'];
  let issue, towardProsecution;
  if (roomEntry.stance === 'NG') {
    issue = killingIssues.sort((x, y) => b[x] - b[y])[0];
    towardProsecution = false;
  } else if (roomEntry.stance === 'MAN') {
    issue = 'intent';
    towardProsecution = false;
  } else {
    issue = killingIssues.concat('intent').sort((x, y) => b[y] - b[x])[0];
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
