// The adaptive prosecutor. At phase boundaries she recomputes which contested
// issue the defense is winning hardest and shores it up; her aggression also
// scales how often she objects to the player's questions.
import { applyAction } from './state.js';
import { meanBeliefs } from './jury.js';

export function updateFocus(state, caseData) {
  if (!state.jury.length) return null;
  const means = meanBeliefs(state);
  // Lowest mean = the issue most eroded by the defense.
  const focus = caseData.issues.slice().sort((a, b) => (means[a] ?? 0.5) - (means[b] ?? 0.5))[0];
  const losing = Math.max(0, 0.55 - (means[focus] ?? 0.5));
  applyAction(state, { type: 'PROSECUTOR_ADJ', issueFocus: focus, aggression: losing * 0.6 });
  return focus;
}
