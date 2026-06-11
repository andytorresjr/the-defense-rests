// Ray Soltis — handyman and the defense's building expert. He authenticates
// the work order and, crucially, the alarm panel log. The player's first
// direct examination of this trial: no leading.

export default {
  id: 'soltis',
  name: 'Ray Soltis',
  role: 'Building handyman',
  side: 'defense',
  portrait: { skin: '#c68863', hair: 'short', hairColor: '#6e6e72', outfit: 'apron', build: 'broad' },
  composure: 75, cooperativeness: 0.85, credibility: 0.9, sympathy: 0.4, crackFloor: 15,
  intro: 'The defense calls Raymond Soltis.',

  playerDirect: {
    start: ['d2_s_who', 'd2_s_leading', 'd2_s_breaker'],
    nodes: {
      d2_s_who: {
        text: 'Mr. Soltis, how do you know the Lantern?',
        style: 'soft',
        answer: { text: 'Twelve years of keeping it alive. Plumbing, electrical, the walk-in, the roof. I know that building better than my own house.' },
      },
      d2_s_leading: {
        text: 'That kitchen wiring was a fire waiting to happen — right, Mr. Soltis?',
        style: 'probe',
        improper: 'leading',
        answer: null,
      },
      d2_s_breaker: {
        text: 'Tell the jury about circuit four.',
        style: 'probe',
        answer: {
          text: 'Kitchen circuit. Breaker’d been tripping since spring — old aluminum branch line, and the junction box ran warm to the touch. I told Mara straight: this is how fires start. She didn’t argue. She told me to fix it.',
          facts: ['f2_breaker_history'],
        },
        unlocks: ['d2_s_wo', 'd2_s_battery', 'd2_s_alarm'],
      },
      d2_s_wo: {
        text: 'The work order in evidence — tell the jury what it is.',
        style: 'probe',
        requires: { evidenceAdmitted: ['ev2_workorder'] },
        teaser: 'Walk him through the work order (requires it in evidence)',
        answer: { text: 'Rewire circuit four, scheduled the second week of next month — soonest I could get the parts. She signed it and paid the deposit five weeks before the fire. It’s all dated.' },
      },
      d2_s_battery: {
        text: 'The smoke detector battery the marshal made so much of. What do you know about it?',
        style: 'probe',
        requires: { facts: ['f2_battery'] },
        answer: {
          text: 'I pulled that battery myself, back in March. Kitchen steam set the thing off every lunch rush — I was supposed to relocate the unit and never got to it. That one’s on me. Not her.',
          facts: ['f2_chirp'],
        },
      },
      d2_s_alarm: {
        text: 'Who services the Lantern’s alarm panel?',
        style: 'probe',
        answer: { text: 'I do. Harbor Alarm certifies it once a year; I run the monthly checks. Old panel, but it keeps honest logs.', facts: ['f2_soltis_alarm'] },
        // Now PRESENT the panel log through him.
        unlocks: ['d2_s_panel'],
      },
      d2_s_panel: {
        text: 'Mr. Soltis, read the jury the last two entries from the night of the fire.',
        style: 'probe',
        requires: { evidenceAdmitted: ['ev2_panel'] },
        teaser: 'Have him read the panel log to the jury (requires it in evidence)',
        answer: { text: '"02:01 — FAULT, CIRCUIT FOUR." Then: "02:06 — HEAT ALARM, KITCHEN." …The wiring faulted five minutes before the fire said hello. That’s the fire being born, right there on paper.' },
      },
    },
  },

  scriptedCross: [
    {
      id: 's_x1', speaker: 'prosecutor', text: 'Mr. Soltis. Twelve years of Ms. Vance’s invoices paying your bills — you’re here for a friend, aren’t you?',
      objection: { ground: 'argumentative' },
    },
    { id: 's_x2', speaker: 'witness', text: 'I’m here because I know that building.', facts: ['f2_soltis_bias'] },
    { id: 's_x3', speaker: 'prosecutor', text: 'You cannot tell this jury that your fault code CAUSED the fire. Can you?' },
    { id: 's_x4', speaker: 'witness', text: 'Can’t say caused. Can say it was there, and it came first.', facts: ['f2_soltis_limits'] },
    {
      id: 's_x5', speaker: 'prosecutor', text: 'And a fault can be MADE, can’t it — a nail across a circuit, an overloaded cord — by anyone who knows that panel as well as, say, you do? Or anyone you taught?',
      objection: { ground: 'speculation', also: ['argumentative'] },
    },
    { id: 's_x6', speaker: 'witness', text: '…That’s not what happened.', facts: ['f2_staged'] },
    { id: 's_x7', speaker: 'prosecutor', text: 'Nothing further.' },
  ],

  playerRedirect: {
    start: ['r2_s_dated'],
    nodes: {
      r2_s_dated: {
        text: 'Mr. Soltis — paid friend or not: the warnings, the work order. Did you write them before this fire, or after?',
        style: 'probe',
        requires: { anyFacts: ['f2_soltis_bias', 'f2_staged'] },
        answer: { text: 'Months before. Every page is dated and countersigned. Friendship doesn’t backdate paper.', facts: ['f2_soltis_dated'] },
      },
    },
  },
};
