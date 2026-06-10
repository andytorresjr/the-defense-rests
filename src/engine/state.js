// Central game state. EVERY mutation flows through applyAction() — no direct writes.
// DOM-free: runs in browser and under Node (tools/simulate.js).
import { emit } from '../util/events.js';
import { recomputeBeliefs } from './jury.js';

let activeCase = null;
export function setActiveCase(c) { activeCase = c; }
export function getActiveCase() { return activeCase; }

export function createGameState(caseData) {
  setActiveCase(caseData);
  const witnesses = {};
  for (const w of caseData.witnesses) {
    witnesses[w.id] = {
      called: false, onStand: false, excused: false,
      composure: w.composure, cooperativeness: w.cooperativeness,
      credibility: w.credibility,
      cracked: [], impeachedOn: [], asked: [],
    };
  }
  const evidence = {};
  for (const [id, ev] of Object.entries(caseData.evidence)) {
    evidence[id] = { known: !!ev.knownAtStart, admitted: false, excluded: false, admittedVia: null, exhibitNo: null };
  }
  return {
    caseId: caseData.id,
    phase: 'title',
    progress: { step: 0 },
    currentWitnessId: null,
    examMode: null,
    jury: [],
    judge: { patience: 80, standing: 50, admonished: false },
    witnesses,
    evidence,
    record: [],              // [{ factId, source, mod }]
    prosecutor: { aggression: 0.45, issueFocus: null, objectionsWon: 0, objectionsLost: 0 },
    player: { credibility: 50, objections: { raised: 0, sustained: 0, overruled: 0, late: 0 } },
    flags: {},
    transcript: [],
    nextExhibit: { prosecution: 1, defense: 1 },
  };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function onRecord(state, factId) {
  return state.record.some(e => e.factId === factId && e.mod > 0.3);
}

// Declarative condition checker used by question gating, beat conditions,
// closing-theme preconditions, and conditional objection rulings.
export function checkRequires(state, req) {
  if (!req) return true;
  if (req.evidenceAdmitted && !req.evidenceAdmitted.every(id => state.evidence[id]?.admitted)) return false;
  if (req.evidenceExcluded && !req.evidenceExcluded.every(id => state.evidence[id]?.excluded)) return false;
  if (req.evidenceKnown && !req.evidenceKnown.every(id => state.evidence[id]?.known)) return false;
  if (req.facts && !req.facts.every(f => onRecord(state, f))) return false;
  if (req.notFacts && req.notFacts.some(f => onRecord(state, f))) return false;
  if (req.anyFacts && !req.anyFacts.some(f => onRecord(state, f))) return false;
  if (req.flags && !Object.entries(req.flags).every(([k, v]) => state.flags[k] === v)) return false;
  return true;
}

export function applyAction(state, action) {
  const A = action;
  let dirty = false;
  switch (A.type) {
    case 'SEAT_JURY':
      state.jury = A.jurors.map(j => ({
        ...j,
        beliefs: { ...j.priors },
        adjustments: [],
        annoyance: 0,
      }));
      dirty = true;
      break;

    case 'SET_PHASE':
      state.phase = A.phase;
      break;

    case 'SET_STEP':
      state.progress.step = A.step;
      break;

    case 'CALL_WITNESS': {
      const w = state.witnesses[A.id];
      if (state.currentWitnessId) state.witnesses[state.currentWitnessId].onStand = false;
      w.called = true; w.onStand = true;
      state.currentWitnessId = A.id;
      state.examMode = A.examMode || null;
      break;
    }

    case 'SET_EXAM_MODE':
      state.examMode = A.examMode;
      break;

    case 'EXCUSE_WITNESS': {
      const w = state.witnesses[A.id];
      w.onStand = false; w.excused = true;
      if (state.currentWitnessId === A.id) state.currentWitnessId = null;
      state.examMode = null;
      break;
    }

    case 'ADD_FACT':
      state.record.push({ factId: A.factId, source: A.source ?? null, mod: A.mod ?? 1 });
      dirty = true;
      break;

    case 'STRIKE_FACT': {
      // Strikes the most recent record entry for this fact.
      for (let i = state.record.length - 1; i >= 0; i--) {
        if (state.record[i].factId === A.factId) { state.record[i].mod = A.retain ?? 0; break; }
      }
      dirty = true;
      break;
    }

    case 'ADJ_WITNESS': {
      const w = state.witnesses[A.id];
      if (A.composure != null) w.composure = clamp(w.composure + A.composure, 0, 100);
      if (A.credibility != null) { w.credibility = clamp(w.credibility + A.credibility, 0.15, 1.2); dirty = true; }
      if (A.addCracked) w.cracked.push(A.addCracked);
      if (A.addAsked) w.asked.push(A.addAsked);
      break;
    }

    case 'IMPEACH': {
      const w = state.witnesses[A.witnessId];
      w.credibility = clamp(w.credibility - A.amount, 0.15, 1.2);
      w.impeachedOn.push(A.vs ?? null);
      dirty = true;
      break;
    }

    case 'ADJ_JUDGE':
      if (A.patience != null) state.judge.patience = clamp(state.judge.patience + A.patience, 0, 100);
      if (A.standing != null) state.judge.standing = clamp(state.judge.standing + A.standing, 0, 100);
      if (A.admonished) state.judge.admonished = true;
      break;

    case 'ADJ_PLAYER':
      if (A.credibility != null) state.player.credibility = clamp(state.player.credibility + A.credibility, 0, 100);
      if (A.objection) state.player.objections[A.objection]++;
      break;

    case 'LEARN_EVIDENCE':
      state.evidence[A.id].known = true;
      break;

    case 'ADMIT_EVIDENCE': {
      const ev = state.evidence[A.id];
      const def = activeCase.evidence[A.id];
      ev.admitted = true;
      ev.admittedVia = A.via ?? null;
      ev.exhibitNo = `${def.side === 'prosecution' ? "People's" : 'Defense'} ${state.nextExhibit[def.side]++}`;
      for (const f of def.onAdmit || []) {
        state.record.push({ factId: f, source: A.via ?? null, mod: 1 });
      }
      dirty = true;
      break;
    }

    case 'EXCLUDE_EVIDENCE':
      state.evidence[A.id].excluded = true;
      break;

    case 'JUROR_ADJUST': {
      for (const j of state.jury) {
        if (A.filter?.archetype && j.archetype !== A.filter.archetype) continue;
        if (A.filter?.minReceptivity) {
          const [ch, min] = A.filter.minReceptivity;
          if ((j.receptivity[ch] ?? 1) < min) continue;
        }
        for (const [issue, d] of Object.entries(A.deltas || {})) {
          const scale = A.scaleBy ? (j.receptivity[A.scaleBy] ?? 1) : 1;
          j.adjustments.push({ issue, delta: d * scale, reason: A.reason || '' });
        }
        if (A.annoyance) j.annoyance += A.annoyance;
      }
      dirty = true;
      break;
    }

    case 'PROSECUTOR_ADJ':
      if (A.aggression != null) state.prosecutor.aggression = clamp(state.prosecutor.aggression + A.aggression, 0.15, 0.95);
      if (A.setAggression != null) state.prosecutor.aggression = clamp(A.setAggression, 0.15, 0.95);
      if (A.objectionsWon) state.prosecutor.objectionsWon += A.objectionsWon;
      if (A.objectionsLost) state.prosecutor.objectionsLost += A.objectionsLost;
      if (A.issueFocus !== undefined) state.prosecutor.issueFocus = A.issueFocus;
      break;

    case 'FLAG':
      state.flags[A.key] = A.value;
      break;

    case 'LOG':
      state.transcript.push(A.entry);
      break;

    default:
      throw new Error(`Unknown action: ${A.type}`);
  }

  if (dirty && state.jury.length) recomputeBeliefs(state, activeCase);
  emit('action', { state, action });
  emit('state', state);
  return state;
}

// ---- persistence ----
export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(json, caseData) {
  setActiveCase(caseData);
  const state = JSON.parse(json);
  if (state.jury.length) recomputeBeliefs(state, caseData);
  return state;
}
