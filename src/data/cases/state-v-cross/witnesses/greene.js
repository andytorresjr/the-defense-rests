// Tasha Greene — the State's eyewitness, and the heart of the identity issue.
// The 911 transcript is the impeachment crown jewel; pressing her too hard
// makes her cry and swings empath jurors against you.

export default {
  id: 'greene',
  name: 'Tasha Greene',
  role: 'Eyewitness',
  side: 'prosecution',
  portrait: { skin: '#8d5a3b', hair: 'curly', hairColor: '#1f1a16', outfit: 'casual', build: 'slim' },
  composure: 60, cooperativeness: 0.6, credibility: 0.85, sympathy: 0.85, crackFloor: 30,
  backfireLine: 'I’m telling you what I saw! Why is he doing this to me?',
  intro: 'The People call Tasha Greene.',

  cracks: [
    {
      id: 'g_doubt',
      threshold: 38,
      unlocks: ['x_g_crack'],
      cue: 'Greene’s hands tremble around a tissue. For the first time, she won’t look at the prosecutor.',
    },
  ],

  scriptedDirect: [
    { id: 'g_d1', speaker: 'prosecutor', text: 'Ms. Greene, where were you a little before 11:45 that night?' },
    { id: 'g_d2', speaker: 'witness', text: 'Walking my dog, on Delmore. Past the parking lot behind the Anchor.' },
    { id: 'g_d3', speaker: 'prosecutor', text: 'Tell the jury what you saw.' },
    { id: 'g_d4', speaker: 'witness', text: 'A man in a gray jacket, standing over somebody on the ground. The person on the ground wasn’t moving.', facts: ['f_greene_saw'] },
    { id: 'g_d5', speaker: 'prosecutor', text: 'Do you see that man in this courtroom?' },
    { id: 'g_d6', speaker: 'witness', text: 'Yes. Right there. The defendant.', facts: ['f_greene_id'] },
    { id: 'g_d7', speaker: 'prosecutor', text: 'And a week later, you identified him from a photo array?' },
    { id: 'g_d8', speaker: 'witness', text: 'I picked him right away. I didn’t even hesitate.' },
    {
      id: 'g_d9', speaker: 'prosecutor', text: 'Had you heard anything about the defendant and Mr. Webb before that night?',
      objection: { ground: 'hearsay' },
    },
    { id: 'g_d10', speaker: 'witness', text: 'My friend Dee told me Cross had threatened Marcus before. Everybody around there knew.', facts: ['f_greene_threat_hearsay'] },
    {
      id: 'g_d11', speaker: 'prosecutor', text: 'The man you saw — he’d been waiting for Mr. Webb, hadn’t he?',
      objection: { ground: 'speculation', also: ['leading'] },
    },
    { id: 'g_d12', speaker: 'witness', text: 'He looked like he’d been waiting for someone. Just… standing there.', facts: ['f_greene_waiting'] },
    { id: 'g_d13', speaker: 'prosecutor', text: 'Thank you, Ms. Greene.' },
  ],

  playerCross: {
    start: ['x_g_distance', 'x_g_drinks', 'x_g_evening', 'x_g_jacket'],
    nodes: {
      x_g_distance: {
        text: 'Ms. Greene, how far were you from the man you saw?',
        style: 'probe',
        answer: { text: 'Maybe… sixty feet? There was the one streetlamp by the dumpsters. The orange kind.', facts: ['f_greene_distance'] },
      },
      x_g_drinks: {
        text: 'You’d spent that evening at Reilly’s, down the block. How many drinks did you have?',
        style: 'probe',
        answer: { text: 'Four. Over the whole night! I was fine to walk my dog.', facts: ['f_greene_drinks'] },
      },
      x_g_evening: {
        text: 'Walk me through what you did the moment you saw him.',
        style: 'soft',
        answer: { text: 'I called 911. Right away. I was shaking so hard I almost dropped the phone.' },
        unlocks: ['x_g_911_hint'],
      },
      x_g_911_hint: {
        text: 'So everything you knew that night — fresh, before anyone showed you photos — is on that 911 recording?',
        style: 'probe',
        answer: { text: 'I… suppose it would be, yes.' },
        // The player should now PRESENT the 911 transcript (Court Record panel).
        unlocks: ['x_g_911'],
      },
      x_g_911: {
        text: 'Ms. Greene, reading from Defense Exhibit — your 911 call, 11:43 that night. You told the operator: "I couldn’t see his face." Didn’t you?',
        style: 'confront',
        requires: { evidenceAdmitted: ['ev_911'] },
        teaser: 'Confront her with the 911 call (requires the transcript in evidence)',
        pressure: -14,
        answer: {
          text: 'I— I was scared. I don’t remember saying that.',
          ifComposureBelow: { 40: 'Maybe I couldn’t. Not his face. The jacket — I knew the jacket. I know what I saw…' },
        },
        // Sourced to the document, not to her — impeaching her must not weaken it.
        factsUnsourced: ['f_911_no_face'],
        impeach: { vs: 'f_greene_id', amount: 0.25, cue: 'The courtroom is very quiet. Juror 2 looks from Greene to the defendant and back.' },
      },
      x_g_jacket: {
        text: 'When you picked Daniel Cross out of that array — was it his face you recognized, or the gray jacket?',
        style: 'probe',
        answer: { text: 'The jacket. And — him. Both. It happened so fast.' },
        unlocks: ['x_g_array'],
      },
      x_g_array: {
        text: 'About that array, Ms. Greene — Defense Exhibit. Six photographs. How many of those six men are wearing a gray jacket?',
        style: 'confront',
        requires: { evidenceAdmitted: ['ev_array'] },
        teaser: 'Confront her with the photo array (requires the array sheet in evidence)',
        pressure: -8,
        answer: { text: '…One. His.' },
        factsUnsourced: ['f_array_suggestive'],
        impeach: { vs: 'f_greene_id', amount: 0.1, cue: 'The statistics grad student in seat 11 exhales through his teeth.' },
      },
      x_g_pressure: {
        text: 'You wanted to help the police catch somebody so badly that you saw what they needed you to see — didn’t you, Ms. Greene?',
        style: 'press',
        pressure: -12,
        risk: { ground: 'argumentative', chance: 0.6, sustainChance: 0.65 },
        answer: { text: 'No! I told them what I saw. I’ve always told them what I saw.' },
        teaser: null,
      },
      x_g_crack: {
        text: 'Ms. Greene. Sitting here today, under oath — can you honestly tell this jury you saw Daniel Cross’s face that night?',
        style: 'confront',
        crack: true,
        answer: {
          text: '…Not his face. I never saw his face. The jacket — I was so sure about the jacket. I’m sorry. I’m so sorry.',
        },
        factsUnsourced: ['f_greene_recant'],
        impeach: { vs: 'f_greene_id', amount: 0.2, cue: 'The foreperson closes her notebook. Somewhere in the gallery, Webb’s sister begins to cry.' },
      },
    },
  },

  // The prosecutor rehabilitates her only if the identification was hurt.
  scriptedRedirect: [
    {
      id: 'g_r1', speaker: 'prosecutor', text: 'Ms. Greene — one question. Sitting here today: is the man you saw in that lot in this courtroom?',
      cond: { facts: ['f_911_no_face'], notFacts: ['f_greene_recant'] },
    },
    {
      id: 'g_r2', speaker: 'witness', text: 'Yes. I’m certain. It was him.',
      cond: { facts: ['f_911_no_face'], notFacts: ['f_greene_recant'] },
      facts: ['f_greene_certain'],
    },
  ],
};
