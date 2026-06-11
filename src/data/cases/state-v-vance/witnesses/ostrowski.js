// Gwen Ostrowski — insurance special investigator. Cool, professional, and
// the motive case rests on her. The refinance letter in your file unmakes it.

export default {
  id: 'ostrowski',
  name: 'Gwen Ostrowski',
  role: 'Insurance SIU Investigator',
  side: 'prosecution',
  portrait: { skin: '#e8b88f', hair: 'long', hairColor: '#3a3027', outfit: 'prosecutor', build: 'slim' },
  composure: 90, cooperativeness: 0.7, credibility: 0.95, sympathy: 0.15, crackFloor: 8,
  intro: 'The People call Gwen Ostrowski.',

  scriptedDirect: [
    { id: 'o_d1', speaker: 'prosecutor', text: 'Ms. Ostrowski, you investigated this claim for Harbor Mutual?' },
    { id: 'o_d2', speaker: 'witness', text: 'I lead the special investigations unit. The Lantern file landed on my desk the morning after the fire.' },
    { id: 'o_d3', speaker: 'prosecutor', text: 'What did the policy history show?' },
    { id: 'o_d4', speaker: 'witness', text: 'Fire coverage on the structure was doubled three months before the loss.', facts: ['f2_policy'] },
    { id: 'o_d5', speaker: 'prosecutor', text: 'And the business itself?' },
    { id: 'o_d6', speaker: 'witness', text: 'Distressed. Months behind with suppliers, two missed loan payments to Coastal Savings.', facts: ['f2_failing'] },
    { id: 'o_d7', speaker: 'prosecutor', text: 'When was the claim filed?' },
    { id: 'o_d8', speaker: 'witness', text: 'Within forty-eight hours of the fire.', facts: ['f2_fastclaim'] },
    {
      id: 'o_d9', speaker: 'prosecutor', text: 'A textbook fraud profile — isn’t it?',
      objection: { ground: 'leading', also: ['speculation'] },
    },
    { id: 'o_d10', speaker: 'witness', text: 'It checks the boxes we flag, yes.', facts: ['f2_textbook'] },
    { id: 'o_d11', speaker: 'prosecutor', text: 'Thank you.' },
  ],

  playerCross: {
    start: ['x2_o_file', 'x2_o_claim', 'x2_o_conduct', 'x2_o_memo'],
    nodes: {
      x2_o_file: {
        text: 'Ms. Ostrowski, you reviewed the complete underwriting file — including the refinance documents?',
        style: 'probe',
        answer: { text: 'Every page. That’s the job.', facts: ['f2_ostrowski_file'] },
        // Now PRESENT the lender's letter through her.
        unlocks: ['x2_o_lender'],
      },
      x2_o_lender: {
        text: 'Then read the jury the highlighted condition in Defense Exhibit — the Coastal Savings refinance letter.',
        style: 'confront',
        requires: { evidenceAdmitted: ['ev2_lender'] },
        teaser: 'Confront her with the lender’s letter (requires it in evidence)',
        answer: {
          text: '"Borrower shall increase fire and hazard coverage to full replacement value as a condition of closing." …The increase was a loan requirement. That’s accurate.',
        },
        impeach: { vs: 'f2_policy', amount: 0.15, cue: 'The insurance adjuster in seat eight sits back and folds his arms.' },
      },
      x2_o_claim: {
        text: 'The forty-eight-hour claim. Who actually filed it?',
        style: 'probe',
        answer: { text: 'Her broker. It’s automatic on any total loss. Most insureds never touch the paperwork.', facts: ['f2_broker'] },
      },
      x2_o_conduct: {
        text: 'And Ms. Vance herself — how did she behave with your unit?',
        style: 'probe',
        answer: { text: 'Cooperative. She volunteered her records, sat for two interviews without counsel, and offered in writing to delay any payout until this trial concluded.', facts: ['f2_cooperated'] },
      },
      x2_o_memo: {
        text: 'Your "fraud indicators" memo. Is that document a finding of fact — or an analyst’s checklist of suspicions?',
        style: 'probe',
        answer: { text: 'It’s an internal screening opinion. It opens an investigation; it doesn’t conclude one.', facts: ['f2_memo_opinion'] },
      },
    },
  },

  scriptedRedirect: [
    {
      id: 'o_r1', speaker: 'prosecutor', text: 'Briefly — the lender required "adequate" coverage. Who chose the actual number, Ms. Ostrowski?',
      cond: { facts: ['f2_lender_letter'] },
    },
    {
      id: 'o_r2', speaker: 'witness', text: 'The insured chooses within a range. Ms. Vance’s figure was at the top of it.',
      cond: { facts: ['f2_lender_letter'] },
      facts: ['f2_toprange'],
    },
  ],
};
