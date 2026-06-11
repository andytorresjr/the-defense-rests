// Exhibits for State v. Mara Vance.

export const EVIDENCE = {
  ev2_gascan: {
    name: 'Melted gasoline can',
    side: 'prosecution',
    desc: 'The restaurant’s five-gallon can, recovered melted from the kitchen debris. The lab found no ignitable residue in the surrounding samples.',
    foundationWitnesses: ['hubbard'],
    foundationFacts: [],
    onAdmit: ['f2_gascan_admitted'],
    // Excludable as more prejudicial than probative — but only after the
    // defense has shown both the legitimate storage and the clean lab report.
    admissionChallenge: { ground: 'relevance', sustainedIf: { facts: ['f2_can_storage', 'f2_no_lab'] } },
  },
  ev2_memo: {
    name: 'Insurer fraud-indicators memo',
    side: 'prosecution',
    desc: 'Harbor Mutual’s internal memo flagging the claim: "policy increase + financial distress + rapid filing." An analyst’s checklist.',
    foundationWitnesses: ['ostrowski'],
    foundationFacts: [],
    onAdmit: ['f2_memo_admitted'],
    // Hearsay — excludable once it's been exposed as an opinion document.
    admissionChallenge: { ground: 'hearsay', sustainedIf: { facts: ['f2_memo_opinion'] } },
  },
  ev2_lender: {
    name: 'Refinance lender’s letter',
    side: 'defense',
    knownAtStart: true,
    desc: 'Coastal Savings’ refinance commitment letter, four months before the fire: increased fire coverage is REQUIRED as a condition of the loan.',
    foundationWitnesses: ['ostrowski'],
    foundationFacts: ['f2_ostrowski_file'],
    onAdmit: ['f2_lender_letter'],
  },
  ev2_workorder: {
    name: 'Electrical work order',
    side: 'defense',
    knownAtStart: true,
    desc: 'Signed work order, dated five weeks before the fire: "Rewire kitchen circuit 4 — breaker tripping, aluminum branch line. Deposit paid."',
    foundationWitnesses: ['soltis'],
    foundationFacts: ['f2_breaker_history'],
    onAdmit: ['f2_workorder'],
  },
  ev2_panel: {
    name: 'Alarm panel event log',
    side: 'defense',
    knownAtStart: false, // surfaced mid-trial by the investigator
    desc: 'Harbor Alarm’s certified panel log for the night of the fire. Two entries stand out: 02:01 FAULT CIRCUIT 4. 02:06 HEAT ALARM KITCHEN.',
    foundationWitnesses: ['soltis'],
    foundationFacts: ['f2_soltis_alarm'],
    onAdmit: ['f2_panel_log'],
  },
};
