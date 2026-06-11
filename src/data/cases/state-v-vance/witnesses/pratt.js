// Joel Pratt — the tenant who breathed the smoke. The jury's heart belongs to
// him. He is honest, vague, medicated — and badgering him is courtroom suicide.

export default {
  id: 'pratt',
  name: 'Joel Pratt',
  role: 'Upstairs tenant',
  side: 'prosecution',
  portrait: { skin: '#e8c49a', hair: 'curly', hairColor: '#8a6a40', outfit: 'casual', build: 'slim' },
  composure: 55, cooperativeness: 0.7, credibility: 0.85, sympathy: 0.9, crackFloor: 38,
  backfireLine: 'I almost died in that stairwell, and you’re — I’m sorry. I’m sorry. What do you want me to say?',
  intro: 'The People call Joel Pratt.',

  scriptedDirect: [
    { id: 'p_d1', speaker: 'prosecutor', text: 'Mr. Pratt, you lived above the Lantern?' },
    { id: 'p_d2', speaker: 'witness', text: 'Six years. Little apartment over the kitchen. You learn every sound that building makes.' },
    { id: 'p_d3', speaker: 'prosecutor', text: 'Tell the jury about that night.' },
    { id: 'p_d4', speaker: 'witness', text: 'I woke up coughing. Smoke through the floor vents — thick. I got down the fire stairs in my socks. They kept me at Mercy two nights.', facts: ['f2_pratt_injury'] },
    { id: 'p_d5', speaker: 'prosecutor', text: 'Before the smoke — did you hear anything?' },
    { id: 'p_d6', speaker: 'witness', text: 'Floorboards. In the restaurant under me, around two. Like somebody walking the kitchen.', facts: ['f2_pratt_noise'] },
    {
      id: 'p_d7', speaker: 'prosecutor', text: 'In the weeks before — did the defendant seem like a woman at the end of her rope?',
      objection: { ground: 'speculation', also: ['leading'] },
    },
    { id: 'p_d8', speaker: 'witness', text: 'She’d been acting desperate for weeks, yeah. Phone calls through the floor. Crying, some nights.', facts: ['f2_desperate'] },
    {
      // The self-harm trap: this question IS speculative — and the answer helps the defense.
      id: 'p_d9', speaker: 'prosecutor', text: 'Those footsteps, Mr. Pratt — could they have been Ms. Vance?',
      objection: { ground: 'speculation', selfHarm: true },
    },
    { id: 'p_d10', speaker: 'witness', text: 'I can’t say it was her. I can’t say it was anybody. Old building talks at night — could’ve been the pipes, honestly.', facts: ['f2_pratt_couldbe'] },
    { id: 'p_d11', speaker: 'prosecutor', text: 'Thank you, Joel.' },
  ],

  playerCross: {
    start: ['x2_p_meds', 'x2_p_creaks', 'x2_p_landlord', 'x2_p_press'],
    nodes: {
      x2_p_meds: {
        text: 'Mr. Pratt — and I’m glad you’re all right. That night, had you taken your prescribed sleep medication?',
        style: 'soft',
        answer: { text: 'Zolpidem, yeah. Doctor’s orders, every night. I sleep like the dead on it — usually.', facts: ['f2_pratt_meds'] },
      },
      x2_p_creaks: {
        text: 'Six years over that kitchen. Does the building make those walking sounds all by itself?',
        style: 'soft',
        answer: { text: 'All the time. Pipes knocking, the cooler compressor kicking, the tide working the pilings. Most nights I sleep through all of it.', facts: ['f2_pratt_creaks'] },
      },
      x2_p_landlord: {
        text: 'One more thing. What kind of landlord was Mara Vance to you?',
        style: 'soft',
        answer: { text: 'The good kind. Fixed things same week. When I got laid off she carried my rent two months and sent dinner up most nights. I don’t— I still can’t believe any of this.', facts: ['f2_pratt_kind'] },
      },
      x2_p_press: {
        text: 'The truth is you can’t know what you heard through a floor, on a sleeping pill, half-dreaming — can you?',
        style: 'press',
        pressure: -16,
        risk: { ground: 'argumentative', chance: 0.4, sustainChance: 0.5 },
        answer: { text: 'I know my own ceiling— floor. I know what I heard.' },
        unlocks: ['x2_p_press2'],
      },
      x2_p_press2: {
        // The badgering trap: his composure is gone, his sympathy is high.
        text: 'You heard pipes, Mr. Pratt. You heard a forty-year-old building. Admit that to this jury.',
        style: 'press',
        pressure: -14,
        answer: { text: 'I— I told you what I heard.' },
      },
    },
  },

  scriptedRedirect: [
    {
      id: 'p_r1', speaker: 'prosecutor', text: 'Joel — medicated or not. What woke you was real?',
      cond: { facts: ['f2_pratt_meds'] },
    },
    {
      id: 'p_r2', speaker: 'witness', text: 'The smoke was real. The sounds were real. I know what I heard.',
      cond: { facts: ['f2_pratt_meds'] },
      facts: ['f2_pratt_sure'],
    },
  ],
};
