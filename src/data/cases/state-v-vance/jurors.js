// Voir dire pool for State v. Vance: the same eighteen townspeople (it is a
// small harbor town), with priors remapped onto the arson case's issues and a
// few case-specific quotes. altCause starts high — jurors presume the fire
// marshal ruled the wiring out, until shown otherwise.
import { JUROR_POOL as BASE } from '../state-v-cross/jurors.js';

const basePriors = { origin: 0.5, presence: 0.5, intent: 0.5, device: 0.5, altCause: 0.75 };

// How each cast of mind comes into an arson case.
const ARCHETYPE_OFFSETS = {
  authority: { origin: 0.05, altCause: 0.06, intent: 0.03 },
  analyst: { altCause: -0.05, device: -0.02 },
  skeptic: { origin: -0.04, altCause: -0.08, presence: -0.03 },
  empath: { intent: -0.02 },
  follower: {},
};

const QUOTE_OVERRIDES = {
  j06: ['"I back the blue, I\'ll say that up front."', '"Somebody lit that fire. The marshal\'s job is knowing who."'],
  j15: ['"Thirty years transcribing trials. The defendant usually did it."', '"Insurance fires are the oldest story in the book."'],
  j16: ['"Old arson \'science\' has a documented exoneration record. Look up flashover."', '"Base rates matter. Priors matter. Sorry, I get excited."'],
};

export const JUROR_POOL = BASE.map(j => {
  const off = ARCHETYPE_OFFSETS[j.archetype] || {};
  const priors = { ...basePriors };
  for (const [iss, d] of Object.entries(off)) priors[iss] += d;
  return { ...j, priors, quotes: QUOTE_OVERRIDES[j.id] ?? j.quotes };
});
