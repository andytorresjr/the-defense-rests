// Evidence admission: foundation rules. Exhibits must come in through a
// permitted foundation witness with the prerequisite facts established on
// the record, or the AI prosecutor's foundation objection is sustained.
import { applyAction, checkRequires } from './state.js';

export function canAdmit(state, caseData, evId, witnessId) {
  const def = caseData.evidence[evId];
  const ev = state.evidence[evId];
  if (!ev.known) return { ok: false, reason: 'unknown' };
  if (ev.admitted) return { ok: false, reason: 'alreadyAdmitted' };
  if (ev.excluded) return { ok: false, reason: 'excluded' };
  if (!def.foundationWitnesses.includes(witnessId)) return { ok: false, reason: 'wrongWitness' };
  if (!checkRequires(state, { facts: def.foundationFacts || [] })) return { ok: false, reason: 'noFoundation' };
  return { ok: true };
}

// Player moves to admit an exhibit through the witness on the stand.
export function attemptAdmit(state, caseData, evId, witnessId) {
  const def = caseData.evidence[evId];
  const check = canAdmit(state, caseData, evId, witnessId);
  if (check.ok) {
    applyAction(state, { type: 'ADMIT_EVIDENCE', id: evId, via: witnessId });
    applyAction(state, { type: 'LOG', entry: `${def.name} admitted via ${witnessId}.` });
    return { admitted: true, def, exhibitNo: state.evidence[evId].exhibitNo };
  }
  // Foundation objection from the prosecutor, sustained.
  applyAction(state, { type: 'ADJ_PLAYER', credibility: -5 });
  applyAction(state, { type: 'ADJ_JUDGE', patience: -2 });
  applyAction(state, { type: 'LOG', entry: `Foundation objection sustained: ${def.name} (${check.reason}).` });
  return { admitted: false, reason: check.reason, def };
}

export function foundationHint(reason, def) {
  switch (reason) {
    case 'wrongWitness': return 'This witness cannot authenticate that exhibit. Find the witness who can.';
    case 'noFoundation': return 'You have not laid the foundation yet — establish the witness’s connection to this exhibit first.';
    case 'unknown': return 'You do not have that.';
    case 'alreadyAdmitted': return 'Already in evidence.';
    case 'excluded': return 'The Court has excluded that exhibit.';
    default: return '';
  }
}

// Known-but-unadmitted defense exhibits the player could try to present right now.
export function presentableEvidence(state, caseData, witnessId) {
  return Object.entries(caseData.evidence)
    .filter(([id, def]) => def.side === 'defense' && state.evidence[id].known
      && !state.evidence[id].admitted && !state.evidence[id].excluded)
    .map(([id, def]) => ({ id, def, check: canAdmit(state, caseData, id, witnessId) }));
}
