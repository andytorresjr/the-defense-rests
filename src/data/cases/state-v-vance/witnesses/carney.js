// Ed Carney — dockworker, the presence witness. Honest, and that's the
// problem for the State: pinned down, his timing and details help the defense.

export default {
  id: 'carney',
  name: 'Ed Carney',
  role: 'Dockworker',
  side: 'prosecution',
  portrait: { skin: '#b97f5a', hair: 'bald', hairColor: '#6e6e72', outfit: 'casual', build: 'broad' },
  composure: 65, cooperativeness: 0.55, credibility: 0.85, sympathy: 0.3, crackFloor: 18,
  intro: 'The People call Edward Carney.',

  scriptedDirect: [
    { id: 'c_d1', speaker: 'prosecutor', text: 'Mr. Carney, where were you a little before two that morning?' },
    { id: 'c_d2', speaker: 'witness', text: 'On break at the container gate. Taking air by the fence — you can see the Lantern’s back lot from there.' },
    { id: 'c_d3', speaker: 'prosecutor', text: 'What did you see?' },
    { id: 'c_d4', speaker: 'witness', text: 'A woman in a hooded coat at the Lantern’s rear door.', facts: ['f2_carney_saw'] },
    { id: 'c_d5', speaker: 'prosecutor', text: 'Did you recognize her?' },
    { id: 'c_d6', speaker: 'witness', text: 'Mara Vance. I’ve known her ten years — she feeds half the night shift.', facts: ['f2_carney_id'] },
    {
      id: 'c_d7', speaker: 'prosecutor', text: 'She was sneaking, wasn’t she — trying not to be seen?',
      objection: { ground: 'leading', also: ['speculation'] },
    },
    { id: 'c_d8', speaker: 'witness', text: 'Looked that way to me. Hood up, keeping close to the building.', facts: ['f2_carney_sneak'] },
    { id: 'c_d9', speaker: 'prosecutor', text: 'Thank you, Mr. Carney.' },
  ],

  playerCross: {
    start: ['x2_c_conditions', 'x2_c_coat', 'x2_c_when', 'x2_c_drinking'],
    nodes: {
      x2_c_conditions: {
        text: 'Mr. Carney — that night. The weather, the light, the distance. Paint it honestly for the jury.',
        style: 'probe',
        answer: { text: 'Raining steady. Dark, except the dock floods behind me. From the fence to that door is… a hundred feet, maybe more.', facts: ['f2_carney_conditions'] },
      },
      x2_c_coat: {
        text: 'A hundred feet, in the rain, hood up. What did you actually recognize — her face, or that old green coat everyone on this dock knows?',
        style: 'probe',
        answer: { text: '…The coat, mostly. And the way she walks. I never said I saw her face.', facts: ['f2_carney_coat'] },
      },
      x2_c_when: {
        text: 'What time did you see her? Exactly.',
        style: 'probe',
        answer: { text: 'About 1:40. I can say that for sure — my break runs 1:35 to 1:45 and I’d just lit my smoke.', facts: ['f2_carney_time'] },
        unlocks: ['x2_c_leaving'],
      },
      x2_c_leaving: {
        text: 'And Mr. Carney — at 1:40, she wasn’t creeping TOWARD that building, was she? Tell the jury what the woman you saw was actually doing.',
        style: 'press',
        pressure: -10,
        answer: {
          text: '…Walking away from it. To her car. Had a bag over her shoulder — laptop bag, looked like. Wasn’t hurrying. Honestly it looked like any closing night I ever saw her have.',
          facts: ['f2_carney_bag'],
        },
      },
      x2_c_drinking: {
        text: 'Long shift, cold rain — there was something in that thermos besides coffee, wasn’t there?',
        style: 'press',
        risk: { ground: 'argumentative', chance: 0.7, sustainChance: 0.75 },
        answer: { text: 'No, sir. Coffee. I’m twelve years sober and I’d thank you not to.' },
        jurorAdjust: { scaleBy: 'emotion', deltas: { presence: 0.02 }, reason: 'insulted a sober witness' },
      },
    },
  },

  scriptedRedirect: [
    {
      id: 'c_r1', speaker: 'prosecutor', text: 'Mr. Carney — coat, walk, rain, whatever: was the woman at that door Mara Vance?',
      cond: { facts: ['f2_carney_coat'] },
    },
    {
      id: 'c_r2', speaker: 'witness', text: 'I believe it was her. I’d know her in a blackout.',
      cond: { facts: ['f2_carney_coat'] },
      facts: ['f2_carney_sure'],
    },
  ],
};
