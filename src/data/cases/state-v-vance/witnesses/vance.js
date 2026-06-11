// Mara Vance — the defendant. Her "let it burn" remark is waiting for her on
// cross, and the prosecutor's timeline attack is survivable only if the panel
// log is already in evidence.

export default {
  id: 'vance',
  name: 'Mara Vance',
  role: 'The Defendant',
  side: 'defense',
  portrait: { skin: '#b97f5a', hair: 'bun', hairColor: '#241d18', outfit: 'suit', build: 'slim' },
  composure: 50, cooperativeness: 0.95, credibility: 0.75, sympathy: 0.7, crackFloor: 18,
  intro: 'The defense calls the defendant, Mara Vance.',

  playerDirect: {
    start: ['d2_v_account', 'd2_v_leading'],
    nodes: {
      d2_v_account: {
        text: 'Mara — that night. In your own words.',
        style: 'soft',
        answer: {
          text: 'I couldn’t sleep. The repossession notices said agents could enter "on or after the first" — that was two days away. So I drove down about 1:30, took the account books and my laptop, locked up, and left before 1:50. The kitchen was dark and dead when I turned the key. I was home by 2:15 when Ray called me about the smoke.',
          facts: ['f2_vance_account'],
        },
        unlocks: ['d2_v_coat', 'd2_v_money'],
      },
      d2_v_coat: {
        text: 'The hooded green coat.',
        style: 'probe',
        answer: { text: 'It rains on that dock three nights out of five. That coat lives on the hook by the back door — it’s the only one I keep there. Everyone’s seen me in it a thousand times.', facts: ['f2_vance_coat'] },
      },
      d2_v_money: {
        text: 'The State says this fire was money. Tell the jury the truth about the money.',
        style: 'probe',
        answer: {
          text: 'The truth is there is no money. Every insurance dollar goes straight to Coastal Savings — they hold the note. Burned, the Lantern pays my bank and leaves me ashes. Sold — and I had a buyer coming up from Portland in the spring — it paid the bank AND left me something. Fire was the only ending where I get nothing.',
          facts: ['f2_no_benefit'],
        },
      },
      d2_v_leading: {
        text: 'You never set that fire — did you, Mara?',
        style: 'probe',
        improper: 'leading',
        answer: null,
      },
    },
  },

  scriptedCross: [
    { id: 'v_x1', speaker: 'prosecutor', text: 'Ms. Vance. You told Tom Reiser — your fish supplier of nine years — quote: "I should let this place burn." Didn’t you?' },
    { id: 'v_x2', speaker: 'witness', text: 'I said it. Crying over payroll at one in the morning, I said it. People say things at the bottom.', facts: ['f2_vance_prior_statement'] },
    {
      id: 'v_x3', speaker: 'prosecutor', text: 'You were at that building at 1:40. The fire was born by 2:06. Walk me out of that arithmetic, Ms. Vance.',
      cond: { notFacts: ['f2_panel_log'] },
    },
    {
      id: 'v_x4', speaker: 'witness', text: 'I left at 1:50 and the kitchen was dark. I can’t explain the marshal’s patterns. I wasn’t there when it started. I don’t know how to make you believe me.',
      cond: { notFacts: ['f2_panel_log'] },
      facts: ['f2_vance_cold'],
    },
    {
      id: 'v_x5', speaker: 'prosecutor', text: 'You were at that building at 1:40, and the fire was born minutes later. Convenient timing, Ms. Vance.',
      cond: { facts: ['f2_panel_log'] },
    },
    {
      id: 'v_x6', speaker: 'witness', text: 'Your own exhibit answers that better than I can. 02:01 — fault, circuit four. I was on Harbor Road by then, driving home. The wiring did this. I’d been paying Ray Soltis to stop it.',
      cond: { facts: ['f2_panel_log'] },
      facts: ['f2_vance_held'],
    },
    {
      id: 'v_x7', speaker: 'prosecutor', text: 'You watched your life’s work rot for two years, and you decided the fire was cleaner. Admit it.',
      objection: { ground: 'argumentative', also: ['asked'] },
    },
    { id: 'v_x8', speaker: 'witness', text: 'No. That building has my mother’s name on the deed. I would have carried it on my back before I burned it.', facts: ['f2_vance_pressed'] },
    { id: 'v_x9', speaker: 'prosecutor', text: 'Nothing further, Your Honor.' },
  ],

  playerRedirect: {
    start: ['r2_v_statement', 'r2_v_insists'],
    nodes: {
      r2_v_statement: {
        text: 'Mara — the night you said that to Tom Reiser. Tell the jury about that night.',
        style: 'soft',
        requires: { facts: ['f2_vance_prior_statement'] },
        answer: {
          text: 'We’d just lost the Roundtree contract — a third of my winter. I was crying so hard Tom drove me home. You don’t burn a thing you cry over like that. You sell it. You bury it. You say goodbye to it properly.',
          facts: ['f2_explains_statement'],
        },
      },
      r2_v_insists: {
        text: 'One more time, for this jury. When you turned that key at 1:50 — what was behind you?',
        style: 'soft',
        requires: { facts: ['f2_vance_cold'] },
        answer: { text: 'A dark kitchen. A locked door. Twenty-two years of my family. That’s what was behind me.', facts: ['f2_vance_insists'] },
      },
    },
  },
};
