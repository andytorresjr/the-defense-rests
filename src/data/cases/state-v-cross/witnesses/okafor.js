// Sam Okafor — bartender. Reluctant: he knows things he doesn't want to say
// out loud (Webb's "out back" dare, and Lenny). Pressing him cracks him.
// He is also the only foundation witness for the camera maintenance log —
// the case's buried timeline bomb.

export default {
  id: 'okafor',
  name: 'Sam Okafor',
  role: 'Bartender, the Anchor Bar',
  side: 'prosecution',
  portrait: { skin: '#5d3a26', hair: 'short', hairColor: '#141110', outfit: 'apron', build: 'broad' },
  composure: 70, cooperativeness: 0.35, credibility: 0.9, sympathy: 0.4, crackFloor: 18,
  intro: 'The People call Samuel Okafor.',

  cracks: [
    {
      id: 'o_truth',
      threshold: 48,
      unlocks: ['x_o_outback', 'x_o_lenny'],
      cue: 'Okafor glances at the gallery and wipes his palms on his jeans. Whatever he’s been holding, he’s tired of holding it.',
    },
  ],

  scriptedDirect: [
    { id: 'o_d1', speaker: 'prosecutor', text: 'Mr. Okafor, you were tending bar at the Anchor that night?' },
    { id: 'o_d2', speaker: 'witness', text: 'Yes ma’am. Busy night. I was behind the bar from six to close.' },
    { id: 'o_d3', speaker: 'prosecutor', text: 'Did you observe the defendant and Marcus Webb?' },
    { id: 'o_d4', speaker: 'witness', text: 'They got into it around eleven. About the money — the thirty grand. Loud enough that I started moving that way.', facts: ['f_argument'] },
    { id: 'o_d5', speaker: 'prosecutor', text: 'Did you hear the defendant say anything as he left?' },
    { id: 'o_d6', speaker: 'witness', text: 'He said, "you’ll regret this." Then he walked out.', facts: ['f_regret'] },
    { id: 'o_d7', speaker: 'prosecutor', text: 'When did each man leave?' },
    { id: 'o_d8', speaker: 'witness', text: 'Cross left first, alone. Marcus went out the back maybe ten minutes after.', facts: ['f_cross_left_first'] },
    {
      id: 'o_d9', speaker: 'prosecutor', text: 'Did Mr. Webb seem afraid of the defendant?',
      objection: { ground: 'speculation', also: ['leading'] },
    },
    { id: 'o_d10', speaker: 'witness', text: 'He seemed… on edge after the argument. Yeah. I’d say afraid.', facts: ['f_webb_afraid'] },
    { id: 'o_d11', speaker: 'prosecutor', text: 'Nothing further.' },
  ],

  playerCross: {
    start: ['x_o_regret', 'x_o_webb', 'x_o_camera'],
    nodes: {
      x_o_regret: {
        text: '"You’ll regret this." Mr. Okafor — you’ve heard men argue about money across that bar for years. Did you take it as a threat of violence?',
        style: 'probe',
        answer: { text: 'Honestly? No. Marcus laughed it off. People say that kind of thing about money all the time.', facts: ['f_regret_context'] },
      },
      x_o_webb: {
        text: 'What did Marcus Webb say back to him? You were right there.',
        style: 'probe',
        answer: { text: '…It was loud in there. I was working. I don’t remember exactly.' },
        unlocks: ['x_o_press1'],
      },
      x_o_press1: {
        text: 'You were three feet away, Mr. Okafor. You moved closer *because* of the argument. What did he say?',
        style: 'press',
        pressure: -12,
        answer: { text: 'Look — Marcus is dead. I don’t want to talk bad about the man.' },
        unlocks: ['x_o_press2'],
      },
      x_o_press2: {
        text: 'You liked Marcus. I understand. But you’re under oath, and a man’s life is in this room. What did Marcus Webb say?',
        style: 'press',
        pressure: -14,
        risk: { ground: 'asked', chance: 0.3, sustainChance: 0.3 },
        answer: { text: '…He was my friend, you understand? He just got like that sometimes.' },
      },
      x_o_outback: {
        text: 'Mr. Okafor. What were Marcus Webb’s last words to Daniel Cross?',
        style: 'confront',
        crack: true,
        answer: {
          text: 'He said… "I’ll be out back if you’ve got the guts." He was daring him. Marcus got like that when he was embarrassed about the money. He wanted the fight.',
          facts: ['f_outback'],
        },
      },
      x_o_lenny: {
        text: 'Was anyone else looking for Marcus Webb that night?',
        style: 'probe',
        crack: true,
        answer: {
          text: '…There was a guy. Lenny. Came in around 11:15 asking where Marcus was. Everybody knows what Lenny does.',
          facts: ['f_lenny'],
        },
        unlocks: ['x_o_lenny2'],
      },
      x_o_lenny2: {
        text: 'Tell the jury what Lenny does.',
        style: 'probe',
        answer: { text: 'He collects. Marcus owed his people real money — more than he owed anybody else. You don’t want Lenny asking where you are.', facts: ['f_lenny_debt'] },
      },
      x_o_camera: {
        text: 'One more subject. The camera over the back door — who maintains it?',
        style: 'soft',
        answer: { text: 'Me. I check it every month. Owner’s too cheap for a service contract.', facts: ['f_okafor_services_camera'] },
        // The player should now PRESENT the maintenance log through him.
      },
    },
  },

  scriptedRedirect: [
    {
      id: 'o_r1', speaker: 'prosecutor', text: 'Mr. Okafor — this "Lenny." Did you see him follow Mr. Webb out back? Did you see him so much as stand up?',
      cond: { facts: ['f_lenny'] },
    },
    {
      id: 'o_r2', speaker: 'witness', text: 'No. He had a beer and left out the front, far as I saw.',
      cond: { facts: ['f_lenny'] },
      facts: ['f_lenny_left_front'],
    },
  ],
};
