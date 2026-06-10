// Trial director: walks the case's trialPlan step list. Steps may carry a
// `cond` (checkRequires schema) and are skipped when it fails — e.g. the
// defendant's testimony only happens if the player chose to call him.
import { checkRequires, applyAction } from './state.js';

export function currentStep(state, caseData) {
  const plan = caseData.trialPlan;
  let i = state.progress.step;
  while (i < plan.length && !checkRequires(state, plan[i].cond)) i++;
  if (i !== state.progress.step) applyAction(state, { type: 'SET_STEP', step: i });
  return i < plan.length ? plan[i] : null;
}

export function advance(state) {
  applyAction(state, { type: 'SET_STEP', step: state.progress.step + 1 });
}

export const PHASE_LABEL = {
  voirDire: 'Jury Selection',
  openings: 'Opening Statements',
  prosecutionCase: 'The People’s Case',
  defenseCase: 'The Defense Case',
  closings: 'Closing Arguments',
  deliberation: 'Deliberation',
  verdict: 'Verdict',
};
