// Examination engine: resolves scripted testimony (conditional beats),
// walks player question trees, applies witness pressure/crack mechanics,
// impeachment, and the AI prosecutor's objections to the player's questions.
// DOM-free — the real-time typewriter/clock lives in the UI layer.
import { applyAction, checkRequires } from './state.js';
import { groundLabel } from './objections.js';
import { rulingMood } from './judge.js';

// Filter a scripted beat list down to the beats whose conditions hold now.
export function resolveScript(state, beats) {
  return (beats || []).filter(b => checkRequires(state, b.cond)).map(b => ({ ...b }));
}

// Land a beat's facts on the record. mod < 1 means partially struck.
export function landBeatFacts(state, beat, mod = 1, defaultSource = null) {
  for (const f of beat.facts || []) {
    applyAction(state, { type: 'ADD_FACT', factId: f, source: beat.source ?? defaultSource, mod });
  }
}

// Composure cost of each questioning style.
const STYLE_PRESSURE = { soft: 0, probe: -4, press: -12, confront: -9 };

// Compute the question menu for the player's examination of `witnessData`.
// Nodes become visible when unlocked (start set, unlocks of asked nodes,
// crack rewards) and enabled when their `requires` are met.
export function availableQuestions(state, witnessData, tree) {
  const wst = state.witnesses[witnessData.id];
  const open = new Set(tree.start);
  for (const askedId of wst.asked) {
    for (const u of tree.nodes[askedId]?.unlocks || []) open.add(u);
  }
  for (const crackId of wst.cracked) {
    const crack = (witnessData.cracks || []).find(c => c.id === crackId);
    for (const u of crack?.unlocks || []) open.add(u);
  }
  const out = [];
  for (const id of open) {
    if (wst.asked.includes(id)) continue;
    const node = tree.nodes[id];
    if (!node) continue;
    const enabled = checkRequires(state, node.requires);
    if (!enabled && !node.teaser) continue; // hide locked nodes unless they advertise themselves
    out.push({ id, node, enabled });
  }
  return out;
}

// The player asks question `nodeId`. Applies ALL state effects and returns
// the beats to render plus what happened.
export function askQuestion(state, caseData, witnessData, tree, nodeId, rng) {
  const node = tree.nodes[nodeId];
  const wst = state.witnesses[witnessData.id];
  applyAction(state, { type: 'ADJ_WITNESS', id: witnessData.id, addAsked: nodeId });

  const beats = [{ speaker: 'player', kind: 'q', text: node.text }];
  const result = { beats, blocked: false, cracked: [], impeached: false, backfired: false };

  // 1) AI prosecutor objection to the player's question.
  const objection = prosecutorObjection(state, node, rng);
  if (objection) {
    beats.push({ speaker: 'prosecutor', kind: 'objection', text: `Objection, Your Honor — ${groundLabel(objection.ground).toLowerCase()}.` });
    if (objection.sustained) {
      beats.push({ speaker: 'judge', kind: 'ruling', text: sustainedAgainstPlayerText(state, objection.ground) });
      applyAction(state, { type: 'ADJ_PLAYER', credibility: -3 });
      applyAction(state, { type: 'ADJ_JUDGE', standing: -2 });
      result.blocked = true;
      return result;
    }
    beats.push({ speaker: 'judge', kind: 'ruling', text: 'Overruled. The witness may answer.' });
    applyAction(state, { type: 'ADJ_PLAYER', credibility: 1 });
  }

  // 2) Badgering backfire: pressing a sympathetic witness already at the floor.
  const pressing = node.style === 'press' || node.style === 'confront';
  if (pressing && wst.composure <= (witnessData.crackFloor ?? 25) && !node.crack && (witnessData.sympathy ?? 0) > 0.5) {
    beats.push({ speaker: 'witness', kind: 'a', text: witnessData.backfireLine || '…I’m sorry. I’m trying. I’m really trying.' });
    beats.push({ speaker: 'narrator', kind: 'cue', text: `${witnessData.name.split(' ').pop()} is in tears. Several jurors look at you, not the witness.` });
    beats.push({ speaker: 'prosecutor', kind: 'objection', text: 'Objection — argumentative. Counsel is badgering the witness.' });
    beats.push({ speaker: 'judge', kind: 'ruling', text: 'Sustained. Move on, counsel.' });
    applyAction(state, {
      type: 'JUROR_ADJUST', scaleBy: 'emotion',
      deltas: { identity: 0.035, intent: 0.025 },
      annoyance: 1, reason: `badgered ${witnessData.id}`,
    });
    applyAction(state, { type: 'ADJ_JUDGE', patience: -6 });
    applyAction(state, { type: 'ADJ_PLAYER', credibility: -4 });
    result.backfired = true;
    return result;
  }

  // 3) The answer (variant by composure / crack state).
  const ans = pickAnswer(node.answer, wst);
  if (ans.text) beats.push({ speaker: 'witness', kind: 'a', text: ans.text });

  // 4) Effects: composure, facts, impeachment, judge/etc.
  const pressure = (node.pressure ?? STYLE_PRESSURE[node.style] ?? 0);
  if (pressure) applyAction(state, { type: 'ADJ_WITNESS', id: witnessData.id, composure: pressure });

  for (const f of ans.facts || []) {
    applyAction(state, { type: 'ADD_FACT', factId: f, source: witnessData.id, mod: 1 });
  }
  for (const f of node.factsUnsourced || []) {
    applyAction(state, { type: 'ADD_FACT', factId: f, source: null, mod: 1 });
  }

  if (node.impeach) {
    applyAction(state, { type: 'IMPEACH', witnessId: witnessData.id, amount: node.impeach.amount, vs: node.impeach.vs });
    applyAction(state, { type: 'ADJ_WITNESS', id: witnessData.id, composure: -8 });
    beats.push({ speaker: 'narrator', kind: 'cue', text: node.impeach.cue || 'A ripple runs through the jury box. Two jurors write something down.' });
    result.impeached = true;
  }

  if (node.judge) applyAction(state, { type: 'ADJ_JUDGE', ...node.judge });
  if (node.jurorAdjust) applyAction(state, { type: 'JUROR_ADJUST', ...node.jurorAdjust });

  // 5) Crack check: did composure fall past a hidden threshold?
  for (const crack of witnessData.cracks || []) {
    if (wst.composure <= crack.threshold && !wst.cracked.includes(crack.id)) {
      applyAction(state, { type: 'ADJ_WITNESS', id: witnessData.id, addCracked: crack.id });
      beats.push({ speaker: 'narrator', kind: 'cue', text: crack.cue });
      result.cracked.push(crack.id);
    }
  }

  applyAction(state, { type: 'LOG', entry: `Q(${witnessData.id}): ${node.text}` });
  return result;
}

function pickAnswer(answer, wst) {
  if (!answer) return {};
  if (typeof answer === 'string') return { text: answer };
  // composure-variant answers: lowest threshold that composure has fallen under
  if (answer.ifComposureBelow) {
    const thresholds = Object.keys(answer.ifComposureBelow).map(Number).sort((a, b) => a - b);
    for (const t of thresholds) {
      if (wst.composure < t) {
        const v = answer.ifComposureBelow[t];
        return typeof v === 'string' ? { text: v, facts: answer.facts } : { facts: answer.facts, ...v };
      }
    }
  }
  return { text: answer.text, facts: answer.facts };
}

// Should the AI prosecutor object to this player question, and does it stick?
function prosecutorObjection(state, node, rng) {
  // `improper` marks a genuinely improper question (e.g. leading on direct):
  // the prosecutor always pounces and the judge always sustains.
  if (node.improper) return { ground: node.improper, sustained: true };
  if (node.risk && rng() < node.risk.chance * (0.5 + state.prosecutor.aggression)) {
    const sustainP = node.risk.sustainChance ?? 0.35;
    // The bench cuts a well-regarded advocate slack on borderline questions.
    const standingBonus = (state.judge.standing - 50) / 250;
    return { ground: node.risk.ground, sustained: rng() < sustainP - standingBonus };
  }
  return null;
}

function sustainedAgainstPlayerText(state, ground) {
  const mood = rulingMood(state);
  if (ground === 'leading') {
    return mood === 'even'
      ? 'Sustained. This is direct examination, counsel — you may not lead your own witness. Rephrase.'
      : 'Sustained. Don’t lead the witness.';
  }
  return mood === 'even' ? `Sustained as ${ground === 'asked' ? 'asked and answered' : ground}.` : 'Sustained.';
}
