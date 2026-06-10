// Argument-phase logic shared by the UI and the simulator: opening statement
// effects, the record-gated closing builder, the prosecutor's adaptive
// closing, and the no-adverse-inference instruction (which some jurors
// quietly violate).
import { applyAction, checkRequires } from './state.js';
import { updateFocus } from './prosecutor.js';

export function applyOpening(state, caseData, openingId) {
  const opening = caseData.arguments.DEFENSE_OPENINGS.find(o => o.id === openingId);
  applyAction(state, { type: 'JUROR_ADJUST', deltas: opening.deltas, reason: `opening: ${opening.id}` });
  applyAction(state, { type: 'FLAG', key: 'opening', value: openingId });
  return opening;
}

export function availableThemes(state, caseData) {
  return caseData.arguments.CLOSING_THEMES.map(t => ({
    theme: t,
    enabled: checkRequires(state, t.requires),
    dangerous: t.contradictedIf ? checkRequires(state, t.contradictedIf) : false,
  }));
}

// Returns per-theme outcomes so the UI can dramatize a backfire.
export function applyClosingThemes(state, caseData, themeIds) {
  // A respected advocate's argument carries more weight with the jury.
  const credFactor = 0.6 + state.player.credibility / 125;
  const outcomes = [];
  for (const id of themeIds) {
    const t = caseData.arguments.CLOSING_THEMES.find(x => x.id === id);
    if (!t || !checkRequires(state, t.requires)) continue;
    if (t.contradictedIf && checkRequires(state, t.contradictedIf)) {
      applyAction(state, { type: 'JUROR_ADJUST', deltas: t.backfire, reason: `closing backfired: ${t.id}` });
      outcomes.push({ theme: t, backfired: true });
      continue;
    }
    const scaled = {};
    for (const [iss, d] of Object.entries(t.deltas)) scaled[iss] = d * credFactor;
    applyAction(state, { type: 'JUROR_ADJUST', deltas: scaled, reason: `closing: ${t.id}` });
    outcomes.push({ theme: t, backfired: false });
  }
  applyAction(state, { type: 'FLAG', key: 'closingThemes', value: themeIds });
  return outcomes;
}

export function applyProsecutionClosing(state, caseData) {
  const focus = updateFocus(state) || 'identity';
  const closing = caseData.arguments.PROSECUTION_CLOSINGS[focus];
  applyAction(state, { type: 'JUROR_ADJUST', deltas: closing.deltas, reason: `prosecution closing: ${focus}` });
  return { focus, closing };
}

// The judge instructs the jury to draw nothing from the defendant's silence.
// Authority-deferent jurors apply a small hidden penalty anyway.
export function applyNoTestifyInference(state) {
  applyAction(state, {
    type: 'JUROR_ADJUST',
    filter: { minReceptivity: ['police', 1.15] },
    deltas: { identity: 0.025, intent: 0.02 },
    reason: 'defendant did not testify (inference despite instruction)',
  });
}
