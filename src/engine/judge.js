// Judge model: patience and the player's standing with the bench color
// borderline rulings, the tone of explanations, and (rarely) a jury-visible
// admonishment that itself moves jurors.
import { applyAction } from './state.js';

export function rulingMood(state) {
  const p = state.judge.patience;
  if (p > 60) return 'even';
  if (p > 35) return 'curt';
  return 'hostile';
}

// Below patience 20 the judge admonishes counsel in front of the jury — once.
export function maybeAdmonish(state) {
  if (state.judge.patience >= 20 || state.judge.admonished) return null;
  applyAction(state, { type: 'ADJ_JUDGE', admonished: true });
  applyAction(state, {
    type: 'JUROR_ADJUST',
    deltas: { identity: 0.02, intent: 0.02 },
    annoyance: 1,
    reason: 'judge admonished defense counsel',
  });
  return 'Counsel, approach is not necessary — but this conduct is. The jury will note that the Court has cautioned the defense. Proceed properly.';
}

export function patienceLabel(state) {
  const p = state.judge.patience;
  if (p > 70) return 'Attentive';
  if (p > 45) return 'Patient';
  if (p > 25) return 'Strained';
  return 'Out of patience';
}
