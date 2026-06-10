// Objection resolution: the rules table for grounds, timing windows, and
// judge-state-dependent borderline calls. Used for the player's objections
// during opposing examinations and for exhibit-admission challenges.
import { applyAction, checkRequires } from './state.js';
import { rulingMood } from './judge.js';

export const GROUNDS = [
  { id: 'hearsay', label: 'Hearsay', tip: 'An out-of-court statement offered to prove the truth of the matter asserted.' },
  { id: 'leading', label: 'Leading', tip: 'Counsel is putting words in the witness’s mouth. Improper on direct examination.' },
  { id: 'speculation', label: 'Speculation', tip: 'Calls for a guess, or an opinion beyond the witness’s personal knowledge.' },
  { id: 'relevance', label: 'Relevance', tip: 'Does not tend to prove or disprove any fact that matters in this case.' },
  { id: 'argumentative', label: 'Argumentative', tip: 'Counsel is arguing with or badgering the witness rather than asking a question.' },
  { id: 'asked', label: 'Asked & Answered', tip: 'The question has already been asked and answered.' },
  { id: 'foundation', label: 'Foundation', tip: 'No basis laid — personal knowledge, authentication, or chain of custody is missing.' },
];

export function groundLabel(id) {
  return GROUNDS.find(g => g.id === id)?.label ?? id;
}

// spec: the objection spec attached to a testimony beat (or null for clean testimony).
//   { ground, also: [..], sustainedIf: {requires}, selfHarm?: true }
// timing: 'timely' (during the question) | 'late' (answer already out) .
// Returns a resolution; applies all state effects.
export function resolveObjection(state, spec, groundId, timing = 'timely') {
  applyAction(state, { type: 'ADJ_PLAYER', objection: 'raised' });

  let sustained = false;
  let borderline = false;
  if (spec) {
    const conditionOk = !spec.sustainedIf || checkRequires(state, spec.sustainedIf);
    if (groundId === spec.ground && conditionOk) {
      sustained = true;
    } else if (conditionOk && spec.also?.includes(groundId)
      && state.judge.standing >= 55 && state.judge.patience >= 45) {
      sustained = true;
      borderline = true;
    }
  }

  const mood = rulingMood(state);
  let text;

  if (sustained) {
    const late = timing === 'late';
    applyAction(state, { type: 'ADJ_PLAYER', credibility: late ? 2 : 3, objection: late ? 'late' : 'sustained' });
    applyAction(state, { type: 'PROSECUTOR_ADJ', objectionsLost: 1, aggression: 0.05 });
    text = late
      ? 'Sustained. The answer is stricken — the jury will disregard it.'
      : borderline
        ? 'I’ll allow the objection. Sustained.'
        : 'Sustained.';
    return { sustained: true, late, borderline, text };
  }

  // Overruled.
  applyAction(state, { type: 'ADJ_PLAYER', credibility: -4, objection: 'overruled' });
  applyAction(state, { type: 'ADJ_JUDGE', patience: -3, standing: -2 });
  applyAction(state, { type: 'PROSECUTOR_ADJ', objectionsWon: 1 });
  if (state.player.objections.overruled > 2) {
    applyAction(state, { type: 'JUROR_ADJUST', deltas: {}, annoyance: 1, reason: 'repeated overruled objections' });
  }

  if (!spec) {
    text = mood === 'even'
      ? 'Overruled. There is nothing objectionable in that question, counsel.'
      : mood === 'curt' ? 'Overruled.' : 'Overruled. Sit down, counsel.';
  } else if (spec.sustainedIf && groundId === spec.ground) {
    // Right instinct, but the predicate isn't on the record yet.
    text = mood === 'even'
      ? `Overruled — on this record, the ${groundLabel(groundId).toLowerCase()} objection is not supported.`
      : 'Overruled on this record.';
  } else {
    text = mood === 'even'
      ? `Overruled. That is not ${article(groundLabel(groundId))} ${groundLabel(groundId).toLowerCase()} problem` +
        (state.judge.patience > 65 ? ` — though counsel might listen more carefully to the question.` : '.')
      : 'Overruled.';
  }
  return { sustained: false, late: timing === 'late', borderline: false, text };
}

function article(word) { return /^[aeiou]/i.test(word) ? 'an' : 'a'; }
