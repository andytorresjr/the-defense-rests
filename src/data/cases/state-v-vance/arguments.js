// Openings and record-gated closing themes for State v. Vance.

export const PROSECUTION_OPENING = [
  'Ladies and gentlemen: at two in the morning, while Joel Pratt slept twelve feet above that kitchen, someone poured a fire into the Lantern. The State Fire Marshal will tell you what the floor itself says: poured patterns, two points of origin, a melted gasoline can — and a smoke detector with its battery removed.',
  'Three months earlier, the defendant doubled her insurance. Her business was drowning. And at 1:40 that morning — twenty minutes before the fire — a man who has known her for ten years watched Mara Vance at that building’s back door.',
  'Motive. Opportunity. And a building that was worth more to her dead than alive. We will ask you for the only verdict that evidence allows: guilty of arson in the first degree.',
];

export const DEFENSE_OPENINGS = [
  {
    id: 'open2_science',
    title: 'Folklore Forensics',
    blurb: 'Put the fire science itself on trial — pour patterns are a myth modern science buried.',
    text: 'The State’s whole case stands on burn marks read like tea leaves. Modern fire science — the standards the marshal has never been trained on — says an ordinary accidental fire paints those same patterns on its way out. Watch what survives when the folklore meets the laboratory.',
    deltas: { origin: -0.03, device: -0.01 },
  },
  {
    id: 'open2_motive',
    title: 'Desperation Is Not Gasoline',
    blurb: 'Concede she was drowning — and make the jury see motive is not the act.',
    text: 'Mara Vance was losing her restaurant. We won’t hide it; we’ll prove it. And then we’ll ask the question the State hopes you never ask: who actually gets the insurance money? Because it isn’t her. Desperation is not gasoline, and grief is not a crime.',
    deltas: { intent: -0.03 },
  },
  {
    id: 'open2_burden',
    title: 'Hold Them to the Burden',
    blurb: 'The classical defense opening: the burden never moves.',
    text: 'One thing only: make the State earn every link of its chain — the patterns, the can, the minutes between 1:40 and 2:06. Beyond a reasonable doubt is the highest burden the law knows. Keep it on that table.',
    deltas: { origin: -0.015, presence: -0.015, intent: -0.015 },
  },
];

export const CLOSING_THEMES = [
  {
    id: 'cl2_science',
    title: 'The floor never said arson',
    line: '"Pour patterns. Two origins. The marshal read those marks the way his trade read them thirty years ago — and the national standard he has never studied says flashover paints them in ordinary accidents. The floor never said arson. He did."',
    requires: { facts: ['f2_flashover'] },
    deltas: { origin: -0.07, device: -0.02 },
    hint: 'Requires the flashover science on the record.',
  },
  {
    id: 'cl2_lab',
    title: 'The lab found nothing',
    line: '"If gasoline was poured across that kitchen, where is it? The state’s own laboratory went looking — in every sample the marshal chose himself — and found none. Zero."',
    requires: { facts: ['f2_no_lab'] },
    deltas: { device: -0.06, origin: -0.03 },
    hint: 'Requires the clean lab report on the record.',
  },
  {
    id: 'cl2_panel',
    title: '02:01 — fault, circuit four',
    line: '"Two lines the marshal never bothered to read: 02:01, fault, circuit four. 02:06, heat alarm. The wiring he \'ruled out\' raised its hand five minutes before the fire — while Mara Vance was driving home."',
    requires: { evidenceAdmitted: ['ev2_panel'] },
    deltas: { altCause: -0.08, origin: -0.05 },
    hint: 'Requires the alarm panel log in evidence.',
  },
  {
    id: 'cl2_timing',
    title: 'Twenty-five minutes early',
    line: '"The State’s own witness puts her at that door at 1:40 — with a laptop bag, walking to her car, unhurried. Arsonists run from fires they light. They are not twenty-five minutes early and calmly gone."',
    requires: { facts: ['f2_carney_time'] },
    deltas: { presence: -0.06 },
    hint: 'Requires Carney’s timing pinned on the record.',
  },
  {
    id: 'cl2_lender',
    title: 'The bank wrote that policy',
    line: '"The sinister doubled policy? Read the letter. Her LENDER demanded it, in writing, as a condition of the refinance. The State built a motive out of a loan covenant."',
    requires: { facts: ['f2_lender_letter'] },
    deltas: { intent: -0.07 },
    hint: 'Requires the lender’s letter in evidence.',
  },
  {
    id: 'cl2_nobenefit',
    title: 'Ashes pay the bank',
    line: '"Follow the money to its actual end: every insurance dollar goes to Coastal Savings. Mara Vance gets nothing from ashes — she loses the building, the buyer she had coming in spring, and her mother’s name over the door."',
    requires: { facts: ['f2_no_benefit'] },
    deltas: { intent: -0.06 },
    hint: 'Requires her no-benefit testimony.',
  },
  {
    id: 'cl2_workorder',
    title: 'You don’t fix what you mean to burn',
    line: '"Five weeks before the fire she paid a deposit to REWIRE that kitchen. You do not schedule repairs on a building you intend to murder."',
    requires: { facts: ['f2_workorder'] },
    deltas: { intent: -0.05, altCause: -0.03 },
    hint: 'Requires the work order in evidence.',
  },
  {
    id: 'cl2_goodwoman',
    title: 'She loved that building',
    line: '"Mara Vance would no more burn the Lantern than burn her own name."',
    requires: {},
    deltas: { intent: -0.04 },
    contradictedIf: { facts: ['f2_vance_prior_statement'] },
    backfire: { intent: 0.05 },
    backfireLine: 'The prosecutor doesn’t even stand all the way up. "\'I should let this place burn.\' Her words, counsel. Not mine." You feel the room move.',
    hint: 'Dangerous if the jury heard the "let it burn" remark.',
  },
  {
    id: 'cl2_burden',
    title: 'The burden never moved',
    line: '"If you are still asking what really happened in that kitchen at two in the morning — that question is the verdict. It is called reasonable doubt, and it belongs to Mara Vance."',
    requires: {},
    deltas: { origin: -0.02, presence: -0.02, device: -0.02, altCause: -0.02 },
    hint: 'Always available.',
  },
];

export const PROSECUTION_CLOSINGS = {
  origin: {
    text: '"Counsel has lectured you about flashover. Here is what no textbook changes: a battery removed from a smoke detector, a can of gasoline where the fire was born, and a fire that began within minutes of the defendant leaving. Science explains marks. It does not explain luck like that."',
    deltas: { origin: 0.05, intent: 0.02 },
  },
  presence: {
    text: '"Ed Carney has known that woman ten years. Rain or no rain, coat or no coat — he watched Mara Vance at that door in the dead of night, and twenty minutes later the building was burning. You are allowed to believe your neighbors."',
    deltas: { presence: 0.05, origin: 0.02 },
  },
  intent: {
    text: '"Two missed loan payments. A doubled policy. \'I should let this place burn.\' The defense calls it grief. Juries are allowed to call it what it is: a plan, spoken out loud."',
    deltas: { intent: 0.05, origin: 0.02 },
  },
  device: {
    text: '"Forget the laboratory’s silence — rain and a fire hose wash a kitchen clean. The can was there. The patterns were there. The fire needed a parent, and it had one."',
    deltas: { device: 0.04, origin: 0.03 },
  },
  altCause: {
    text: '"A fault code on a forty-year-old panel — that is the whole electrical theory. Old buildings throw faults the way old men cough. The defense would have you acquit on a hiccup."',
    deltas: { altCause: 0.06, origin: 0.02 },
  },
};

export const NO_DEFENDANT_INSTRUCTION =
  'The defendant has an absolute constitutional right not to testify. You may draw no inference of any kind from her silence.';
