// Daniel Cross — the defendant. The game's biggest decision. His testimony
// opens the door to his prior conviction, and the prosecutor's footage attack
// is survivable ONLY if the camera clock correction is already in evidence.

export default {
  id: 'daniel',
  name: 'Daniel Cross',
  role: 'The Defendant',
  side: 'defense',
  portrait: { skin: '#caa284', hair: 'short', hairColor: '#4d4339', outfit: 'suit', build: 'slim' },
  composure: 55, cooperativeness: 0.95, credibility: 0.75, sympathy: 0.5, crackFloor: 20,
  intro: 'The defense calls the defendant, Daniel Cross.',

  playerDirect: {
    start: ['d_d_account', 'd_d_leading'],
    nodes: {
      d_d_account: {
        text: 'Daniel — in your own words. Tell the jury about that night.',
        style: 'soft',
        answer: {
          text: 'Marcus and I argued about the money, and I’m not proud of how it ended. I left around 11:30. I walked home the way I always walk — down Delmore, past the alley by the lot. Past it. I never went in. I never saw Marcus again.',
          facts: ['f_cross_account'],
        },
        unlocks: ['d_d_argument', 'd_d_bruise'],
      },
      d_d_argument: {
        text: '"You’ll regret this." What did you mean by that?',
        style: 'probe',
        answer: {
          text: 'That I was done. That I’d call a lawyer about the thirty grand instead of being his friend about it. I meant a lawsuit. I’d give every cent of it to have him back.',
          facts: ['f_regret_explained'],
        },
      },
      d_d_bruise: {
        text: 'The bruise on your cheek. Where did it come from?',
        style: 'probe',
        answer: {
          text: 'The stairwell light in our building had been out for a week. Tuesday I caught the edge of the landing in the dark. Ms. Cruz can tell you about that light.',
          facts: ['f_cross_stairs'],
        },
      },
      d_d_leading: {
        text: 'You never went into that lot — right, Daniel?',
        style: 'probe',
        improper: 'leading',
        answer: null,
      },
    },
  },

  scriptedCross: [
    { id: 'd_x1', speaker: 'prosecutor', text: 'Mr. Cross. You told Detective Alvarez you "walked straight home" and were never near that lot. The camera puts you at the mouth of it at 11:42. You lied, didn’t you?' },
    {
      id: 'd_x2', speaker: 'witness',
      text: 'I didn’t lie. I walked PAST the alley — that’s the way home. And that camera’s clock is ten minutes fast. Your own exhibit says so. I passed it at 11:32, and Marcus was still inside the bar.',
      cond: { facts: ['f_clock_fast'] },
      facts: ['f_cross_held_up'],
    },
    {
      id: 'd_x3', speaker: 'witness',
      text: 'I… it says 11:42, but that can’t be right. I left at 11:30. I don’t know why it says that. I don’t know what to tell you.',
      cond: { notFacts: ['f_clock_fast'] },
      facts: ['f_cross_cold_footage'],
    },
    { id: 'd_x4', speaker: 'prosecutor', text: 'And this isn’t the first time you’ve put your hands on a man, is it? You have a conviction for assault.' },
    { id: 'd_x5', speaker: 'witness', text: 'Nine years ago. A bar fight — I pleaded out, paid the fine, took the classes. I haven’t been in trouble since.', facts: ['f_cross_prior'] },
    {
      id: 'd_x6', speaker: 'prosecutor', text: 'You were so angry about that money that you waited for him in the dark, didn’t you, Mr. Cross?',
      objection: { ground: 'argumentative', also: ['asked'] },
    },
    { id: 'd_x7', speaker: 'witness', text: 'No. NO. I was angry about the money — I was never angry enough to hurt him. He was my best friend for fifteen years.', facts: ['f_cross_waited'] },
    { id: 'd_x8', speaker: 'prosecutor', text: 'Nothing further, Your Honor.' },
  ],
};
