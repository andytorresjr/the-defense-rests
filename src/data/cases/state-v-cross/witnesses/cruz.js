// Rosa Cruz — the defendant's neighbor, the alibi witness. Honest but soft.
// This is the player's first DIRECT examination: leading questions get
// objected to and sustained. Her value depends almost entirely on whether
// the camera clock was corrected first.

export default {
  id: 'cruz',
  name: 'Rosa Cruz',
  role: 'Neighbor of the defendant',
  side: 'defense',
  portrait: { skin: '#b97f5a', hair: 'long', hairColor: '#6e6e72', outfit: 'casual', build: 'slim' },
  composure: 65, cooperativeness: 0.9, credibility: 0.8, sympathy: 0.7, crackFloor: 25,
  intro: 'The defense calls Rosa Cruz.',

  playerDirect: {
    start: ['d_c_who', 'd_c_leading', 'd_c_open'],
    nodes: {
      d_c_who: {
        text: 'Ms. Cruz, how do you know Daniel Cross?',
        style: 'soft',
        answer: { text: 'He’s lived across the hall for eight years. Quiet. Carries my groceries up. Everybody in the building knows Danny.' },
      },
      d_c_leading: {
        // The trap: leading on direct. Prosecutor objects, judge sustains, question wasted.
        text: 'You saw Daniel arrive home at 11:45 that night, didn’t you?',
        style: 'probe',
        improper: 'leading',
        answer: null,
      },
      d_c_open: {
        text: 'Directing your attention to the night of March 14th — what did you see?',
        style: 'probe',
        answer: {
          text: 'I was on the porch with my tea — I can’t sleep most nights. Danny came up the walk around quarter to twelve. Calm as anything. Said goodnight to me like always.',
          facts: ['f_cruz_1145'],
        },
        unlocks: ['d_c_walk', 'd_c_demeanor'],
      },
      d_c_walk: {
        text: 'Ms. Cruz, how long is the walk from the Anchor Bar to your building?',
        style: 'probe',
        requires: { evidenceAdmitted: ['ev_maintlog'], facts: ['f_cruz_1145'] },
        teaser: 'Tie her timing to the corrected camera clock (requires the maintenance log in evidence)',
        answer: {
          text: 'Twelve minutes, maybe thirteen. I’ve walked it my whole life.',
          facts: ['f_walk_fits'],
        },
      },
      d_c_demeanor: {
        text: 'How did he seem to you that night?',
        style: 'soft',
        answer: { text: 'Like Danny. Not out of breath. Not a mark on him that I saw. He had his hands in his pockets.' },
      },
    },
  },

  // Redirect: offered after the prosecutor's cross. Repair the damage — briefly.
  playerRedirect: {
    start: ['r_c_news', 'r_c_sure'],
    nodes: {
      r_c_news: {
        text: 'Ms. Cruz — the prosecutor says you never checked a clock. You mentioned the late news. Why does that fix the time in your mind?',
        style: 'probe',
        requires: { facts: ['f_cruz_noclock'] },
        answer: {
          text: 'The Channel 9 late news theme was coming through the Riveras’ window just as Danny reached the steps. That broadcast starts at 11:45. Sharp. Every night for thirty years. I suppose I did set my watch by it.',
          facts: ['f_cruz_news'],
        },
      },
      r_c_sure: {
        // Tempting but empty: re-asking the settled question invites asked-and-answered.
        text: 'And you remain certain it was Daniel you saw that night?',
        style: 'soft',
        risk: { ground: 'asked', chance: 0.65, sustainChance: 0.75 },
        answer: { text: 'Of course it was Danny. I’ve known him eight years.' },
      },
    },
  },

  // The prosecutor's cross — the player may object to HER questions now.
  scriptedCross: [
    { id: 'c_x1', speaker: 'prosecutor', text: 'Ms. Cruz. "Around quarter to twelve." You didn’t actually look at a clock, did you?' },
    { id: 'c_x2', speaker: 'witness', text: 'Well — no. But the late news was just starting through the window, and that’s—', facts: ['f_cruz_noclock'] },
    {
      id: 'c_x3', speaker: 'prosecutor', text: 'You’re fond of the defendant. You’d say just about anything to keep your nice quiet neighbor out of prison, wouldn’t you?',
      objection: { ground: 'argumentative' },
    },
    { id: 'c_x4', speaker: 'witness', text: 'I’m telling the truth. I know what I saw.', facts: ['f_cruz_bias'] },
    { id: 'c_x5', speaker: 'prosecutor', text: 'Nothing further.' },
  ],
};
