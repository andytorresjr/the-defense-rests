// Fire Marshal Dean Hubbard — the State's anchor. Thirty years of old-school
// fire reading; his certification quietly lapsed four years ago, and modern
// fire science (NFPA 921, flashover) is the wrecking ball waiting for him.

export default {
  id: 'hubbard',
  name: 'Marshal Dean Hubbard',
  role: 'County Fire Marshal',
  side: 'prosecution',
  portrait: { skin: '#d09a72', hair: 'short', hairColor: '#b8b2a8', outfit: 'detective', build: 'broad' },
  composure: 88, cooperativeness: 0.3, credibility: 0.95, sympathy: 0.1, crackFloor: 10,
  intro: 'The People call Fire Marshal Dean Hubbard.',

  scriptedDirect: [
    { id: 'h_d1', speaker: 'prosecutor', text: 'Marshal, tell the jury what you found at the Lantern.' },
    { id: 'h_d2', speaker: 'witness', text: 'Structure fire, called in at 2:10 AM. Origin in the kitchen. The upstairs tenant got out down the fire stairs — smoke inhalation, kept two nights at Mercy.', facts: ['f2_fire'] },
    { id: 'h_d3', speaker: 'prosecutor', text: 'What told you this was no accident?' },
    { id: 'h_d4', speaker: 'witness', text: 'The floor told me. Irregular pour patterns across the kitchen tile — the kind a poured liquid leaves when it burns.', facts: ['f2_pour'] },
    { id: 'h_d5', speaker: 'prosecutor', text: 'What else?' },
    { id: 'h_d6', speaker: 'witness', text: 'Deep burn-through low under the prep table. Fires burn up. When a floor burns like that, something fed it down there.', facts: ['f2_burnthrough'] },
    { id: 'h_d7', speaker: 'witness', text: 'And I marked two separate points of origin. Accidents start in one place. Set fires start where they’re set.', facts: ['f2_twoorigins'] },
    { id: 'h_d8', speaker: 'prosecutor', text: 'Did you recover anything from the debris?' },
    { id: 'h_d9', speaker: 'witness', text: 'A melted five-gallon gasoline can, in the kitchen. And the kitchen smoke detector — with no battery in it.', facts: ['f2_gascan_found', 'f2_battery'] },
    { id: 'h_d10', speaker: 'prosecutor', text: 'Did you consider accidental causes?' },
    { id: 'h_d11', speaker: 'witness', text: 'Considered and ruled out. Wiring, appliances, the lot. This fire was given to that building.', facts: ['f2_ruledout'] },
    {
      id: 'h_d12', speaker: 'prosecutor', text: 'What did people around the harbor tell you about the defendant?',
      objection: { ground: 'hearsay' },
    },
    { id: 'h_d13', speaker: 'witness', text: 'One of her suppliers told us she’d said she ought to just let the place burn.', facts: ['f2_threats'] },
    {
      id: 'h_d14', speaker: 'prosecutor', text: 'She set this fire for the insurance money — didn’t she, Marshal?',
      objection: { ground: 'leading', also: ['speculation'] },
    },
    { id: 'h_d15', speaker: 'witness', text: 'That’s my conclusion, yes.', facts: ['f2_setforinsurance'] },
    { id: 'h_d16', speaker: 'prosecutor', text: 'And your formal finding?' },
    { id: 'h_d17', speaker: 'witness', text: 'Incendiary fire. Intentionally set.', facts: ['f2_incendiary'] },
    { id: 'h_d18', speaker: 'prosecutor', text: 'Thank you, Marshal.' },
  ],

  playerCross: {
    start: ['x2_h_nfpa', 'x2_h_lab', 'x2_h_cert', 'x2_h_alarm', 'x2_h_tunnel'],
    nodes: {
      x2_h_nfpa: {
        text: 'Marshal — NFPA 921, the national standard for fire investigation. What does the current edition say about reading "pour patterns" in a room that reached flashover?',
        style: 'confront',
        answer: {
          text: '…It says post-flashover burning can produce irregular patterns. And multiple apparent origins. In accidental fires. That’s what the book says.',
          facts: ['f2_flashover'],
        },
        unlocks: ['x2_h_flashover2'],
      },
      x2_h_flashover2: {
        text: 'So every "signature" you read to this jury — the patterns, the burn-through, the two origins — an ordinary accidental fire that flashed over paints all of them. True?',
        style: 'press',
        risk: { ground: 'asked', chance: 0.35, sustainChance: 0.4 },
        answer: { text: 'It… can. Pattern evidence has to be read with experience. I read it with thirty years.' },
      },
      x2_h_lab: {
        text: 'You took debris samples from your "pour patterns" to the state laboratory. What ignitable-liquid residue did the lab find?',
        style: 'probe',
        answer: { text: '…None. The samples were rain-soaked by the time— None was identified.', facts: ['f2_no_lab'] },
        unlocks: ['x2_h_can'],
      },
      x2_h_can: {
        text: 'The melted can. Did you ever learn where that can was ordinarily kept?',
        style: 'probe',
        answer: { text: 'We later learned it was stored in the kitchen closet. For the storm generator. Had been for years.', facts: ['f2_can_storage'] },
      },
      x2_h_cert: {
        text: 'Marshal, your IAAI investigator certification — when did it lapse?',
        style: 'confront',
        answer: { text: '…Four years ago. The county stopped funding the renewals. My experience didn’t lapse with it.', facts: ['f2_cert_lapsed'] },
        impeach: { vs: 'f2_incendiary', amount: 0.2, cue: 'The chemistry teacher in seat five underlines something twice.' },
      },
      x2_h_alarm: {
        text: 'The Lantern’s alarm panel logs every fault and every alarm, time-stamped. Did you pull that data?',
        style: 'probe',
        answer: { text: 'No. We had our cause. I didn’t see the need.', facts: ['f2_no_test'] },
      },
      x2_h_tunnel: {
        text: 'You decided this was arson before the hoses were dry, and read every mark on that floor to match — didn’t you, Marshal?',
        style: 'press',
        risk: { ground: 'argumentative', chance: 0.75, sustainChance: 0.8 },
        answer: { text: 'I read fires, counselor. This one read easy.' },
      },
    },
  },

  scriptedRedirect: [
    {
      id: 'h_r1', speaker: 'prosecutor', text: 'Marshal — whatever the patterns prove or don’t: the missing battery and the gasoline can. Are they still sitting in that kitchen?',
      cond: { facts: ['f2_flashover'] },
    },
    {
      id: 'h_r2', speaker: 'witness', text: 'They are. Science can argue with marks. It can’t argue a battery back into a smoke detector.',
      cond: { facts: ['f2_flashover'] },
      facts: ['f2_h_redirect'],
    },
  ],
};
