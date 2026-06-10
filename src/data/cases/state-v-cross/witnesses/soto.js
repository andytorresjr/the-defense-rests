// Dr. Imani Soto — medical examiner. Double-edged: her struggle findings are
// manslaughter insurance for the defense but quietly corroborate that SOMEONE
// fought Webb face to face. Her direct contains a self-harm objection trap:
// "control rather than frenzy" is speculative — and objecting strikes an
// answer that actually helps the defense.

export default {
  id: 'soto',
  name: 'Dr. Imani Soto',
  role: 'Chief Medical Examiner',
  side: 'prosecution',
  portrait: { skin: '#6b4632', hair: 'bun', hairColor: '#241d18', outfit: 'labcoat', build: 'slim' },
  composure: 92, cooperativeness: 0.85, credibility: 1.0, sympathy: 0.2, crackFloor: 5,
  intro: 'The People call Dr. Imani Soto.',

  scriptedDirect: [
    { id: 's_d1', speaker: 'prosecutor', text: 'Doctor, you performed the autopsy on Marcus Webb. Your findings?' },
    { id: 's_d2', speaker: 'witness', text: 'Cause of death was a single stab wound to the chest, perforating the right ventricle. Death within minutes. Time of death between 11:30 and 11:50 PM.', facts: ['f_wound_single'] },
    {
      id: 's_d3', speaker: 'prosecutor', text: 'Does a single thrust tell you anything about the assailant’s state of mind?',
      objection: { ground: 'speculation', selfHarm: true },
    },
    { id: 's_d4', speaker: 'witness', text: 'Within limits. A single wound suggests control rather than frenzy — though I cannot rule out a struggle that ended in one motion. The body cannot tell me which.', facts: ['f_deliberate'] },
    {
      id: 's_d5', speaker: 'prosecutor', text: 'You’ve examined People’s 4, the knife. Could it have made this wound?',
      cond: { evidenceAdmitted: ['ev_knife'] },
    },
    {
      id: 's_d6', speaker: 'witness', text: 'The blade profile is consistent with the wound track, yes.',
      cond: { evidenceAdmitted: ['ev_knife'] },
      facts: ['f_soto_knife_consistent'],
    },
    { id: 's_d7', speaker: 'prosecutor', text: 'Thank you, Doctor.' },
  ],

  playerCross: {
    start: ['x_s_angle', 'x_s_knuckles', 'x_s_knife', 'x_s_time'],
    nodes: {
      x_s_angle: {
        text: 'Doctor, describe the wound track for the jury. What direction does it travel?',
        style: 'probe',
        answer: {
          text: 'Upward, at roughly thirty degrees. That geometry is most consistent with a face-to-face encounter at close quarters — an underhand thrust. It is difficult to reconcile with a blow delivered from behind, or from above a prone man.',
          facts: ['f_wound_upward'],
        },
      },
      x_s_knuckles: {
        text: 'Were there other injuries on Mr. Webb — injuries he inflicted, rather than received?',
        style: 'probe',
        answer: {
          text: 'Fresh contusions across the knuckles of his right hand. In my opinion, Mr. Webb struck someone — hard — shortly before he died.',
          facts: ['f_defensive_knuckles'],
        },
      },
      x_s_knife: {
        text: 'You said the knife is "consistent with" the wound. Can you tell this jury that knife — as opposed to any similar blade — caused it?',
        style: 'probe',
        answer: { text: 'No. "Consistent with" is the ceiling of what the science permits. Any blade of similar dimensions would present identically.', facts: ['f_knife_not_matched'] },
      },
      x_s_time: {
        text: 'Your time-of-death window — how precise is it, really?',
        style: 'soft',
        answer: { text: 'Eleven-thirty to eleven-fifty. Narrower than that would be storytelling, not medicine.' },
      },
    },
  },

  scriptedRedirect: [],
};
