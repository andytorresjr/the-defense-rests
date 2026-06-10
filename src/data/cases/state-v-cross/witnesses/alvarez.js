// Det. Raymond Alvarez — lead detective. The State's anchor witness.
// His direct is studded with objectionable moments (opinion, hearsay, leading),
// and his report contains the knife's chain-of-custody hole.

export default {
  id: 'alvarez',
  name: 'Det. Raymond Alvarez',
  role: 'Lead Detective',
  side: 'prosecution',
  portrait: { skin: '#c68863', hair: 'short', hairColor: '#3a3027', outfit: 'detective', build: 'broad' },
  composure: 85, cooperativeness: 0.3, credibility: 0.9, sympathy: 0.1, crackFloor: 10,
  intro: 'The People call Detective Raymond Alvarez.',

  scriptedDirect: [
    { id: 'a_d1', speaker: 'prosecutor', text: 'Detective, tell the jury how you came to this case.' },
    { id: 'a_d2', speaker: 'witness', text: 'Dispatch, 11:43 PM. Male down behind the Anchor Bar. Marcus Webb, single stab wound to the chest. He was gone before the ambulance arrived.', facts: ['f_scene'] },
    { id: 'a_d3', speaker: 'prosecutor', text: 'What did you learn about the defendant and the victim?' },
    { id: 'a_d4', speaker: 'witness', text: 'They were business partners until the shop went under. Webb owed Mr. Cross thirty thousand dollars. There was bad blood — everyone we spoke to knew about it.', facts: ['f_debt'] },
    { id: 'a_d5', speaker: 'prosecutor', text: 'Did you interview the defendant?' },
    { id: 'a_d6', speaker: 'witness', text: 'The next morning. He told us he left the bar at 11:30 and, quote, "walked straight home." Said he never went near that lot.', facts: ['f_denial'] },
    {
      id: 'a_d7', speaker: 'prosecutor', text: 'Did you believe him, Detective?',
      objection: { ground: 'speculation', also: ['argumentative'] },
    },
    { id: 'a_d8', speaker: 'witness', text: 'Not for a second. He was obviously lying.', facts: ['f_lying'] },
    { id: 'a_d9', speaker: 'prosecutor', text: 'Did you recover video from that night?' },
    { id: 'a_d10', speaker: 'witness', text: 'The bar’s exterior camera. At 11:42 PM it captures the defendant at the alley entrance to the lot. One minute before the 911 call.', facts: ['f_footage_1142'] },
    {
      id: 'a_d11', speaker: 'prosecutor', text: 'What did people at the bar tell you about the defendant and Mr. Webb?',
      objection: { ground: 'hearsay' },
    },
    { id: 'a_d12', speaker: 'witness', text: 'That Cross had threatened him before. More than once, the way they told it.', facts: ['f_threat_hearsay'] },
    { id: 'a_d13', speaker: 'prosecutor', text: 'When you arrested the defendant, did you notice anything about his appearance?' },
    { id: 'a_d14', speaker: 'witness', text: 'Fresh bruise, left cheekbone. He said he fell on some stairs.', facts: ['f_bruise_cheek'] },
    {
      id: 'a_d15', speaker: 'prosecutor', text: 'Detective — this was a planned ambush, wasn’t it?',
      objection: { ground: 'leading', also: ['speculation'] },
    },
    { id: 'a_d16', speaker: 'witness', text: 'That’s exactly how I read it. He knew Webb would come out the back, and he waited.', facts: ['f_ambush'] },
    { id: 'a_d17', speaker: 'prosecutor', text: 'Did you recover a weapon?' },
    { id: 'a_d18', speaker: 'witness', text: 'A folding knife, four-inch blade, consistent with the wound. Recovered at the scene.', facts: ['f_knife_scene'] },
    { id: 'a_d19', speaker: 'prosecutor', text: 'Thank you, Detective. Nothing further.' },
  ],

  playerCross: {
    start: ['x_a_knife', 'x_a_forensics', 'x_a_clock', 'x_a_invest'],
    nodes: {
      x_a_knife: {
        text: 'Detective, your report says the knife was "recovered at the scene." That isn’t true, is it?',
        style: 'confront',
        answer: {
          text: '…It was recovered in the course of the investigation. A citizen found it in a dumpster on Halsey Street. Two blocks away. Two days later.',
        },
        unlocks: ['x_a_prints'],
        impeach: { vs: 'f_knife_scene', amount: 0.1, cue: 'Juror 8 frowns and re-reads her notes. The prosecutor’s pen stops moving.' },
      },
      x_a_prints: {
        text: 'And on that knife — whose fingerprints did the lab find?',
        style: 'probe',
        answer: { text: 'No usable prints. No blood. It had rained.', facts: ['f_knife_gap'] },
      },
      x_a_forensics: {
        text: 'Did any physical evidence — blood, fibers, DNA — connect Daniel Cross to that lot or to Mr. Webb’s body?',
        style: 'probe',
        answer: { text: 'No forensic match was recovered, no. That’s not unusual outdoors.', facts: ['f_no_blood'] },
      },
      x_a_clock: {
        text: 'The camera timestamp — 11:42. Did you ever verify that camera’s clock against real time?',
        style: 'probe',
        answer: { text: 'We had no reason to doubt the equipment.', facts: ['f_timestamp_unverified'] },
        unlocks: ['x_a_clock2'],
      },
      x_a_clock2: {
        text: 'So if that clock were wrong, your whole timeline would be wrong with it. True?',
        style: 'press',
        risk: { ground: 'speculation', chance: 0.45, sustainChance: 0.4 },
        answer: { text: 'If the clock were wrong. It isn’t.' },
      },
      x_a_invest: {
        text: 'Walk me through the rest of your investigation, Detective. What other suspects did you develop?',
        style: 'probe',
        answer: { text: 'We developed our suspect quickly. The evidence pointed one way.' },
        unlocks: ['x_a_canvass', 'x_a_tunnel'],
      },
      x_a_canvass: {
        text: 'In plain terms: once you arrested Daniel Cross, you stopped looking at anyone else. Yes or no?',
        style: 'press',
        answer: { text: '…We didn’t pursue other individuals, no. We had our man.', facts: ['f_no_canvass'] },
      },
      x_a_tunnel: {
        text: 'You decided he was guilty the moment you saw that footage, and nothing was ever going to change your mind — was it, Detective?',
        style: 'press',
        risk: { ground: 'argumentative', chance: 0.75, sustainChance: 0.8 },
        answer: { text: 'I follow evidence, counselor. The evidence followed him.' },
      },
    },
  },

  scriptedRedirect: [
    {
      id: 'a_r1', speaker: 'prosecutor', text: 'Detective, briefly — wherever the knife was found, what matters about it?',
      cond: { facts: ['f_knife_gap'] },
    },
    {
      id: 'a_r2', speaker: 'witness', text: 'Blade profile is consistent with the wound, and it turned up on the most direct walking route away from that lot.',
      cond: { facts: ['f_knife_gap'] },
    },
  ],
};
