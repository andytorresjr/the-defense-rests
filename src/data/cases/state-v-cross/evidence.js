// Exhibits. Foundation rules: an exhibit only comes in through one of its
// foundationWitnesses, after its foundationFacts are on the record.
// admissionChallenge: how the player may object when the PROSECUTION moves
// to admit (resolved through the standard objection rules table).

export const EVIDENCE = {
  ev_footage: {
    name: 'Bar camera footage',
    side: 'prosecution',
    desc: 'Grainy footage of a man the State says is Daniel Cross at the alley entrance. Timestamp: 11:42 PM.',
    foundationWitnesses: ['alvarez'],
    foundationFacts: [],
    onAdmit: ['f_footage_admitted'],
    // Solid foundation — objecting here is a lesson in discrimination.
    admissionChallenge: null,
  },
  ev_knife: {
    name: 'Folding knife',
    side: 'prosecution',
    desc: 'A folding knife with a 4-inch blade, consistent with the fatal wound. No prints. No blood.',
    foundationWitnesses: ['alvarez'],
    foundationFacts: [],
    onAdmit: ['f_knife_admitted'],
    // Excludable — but only if the chain-of-custody hole was exposed on cross first.
    admissionChallenge: { ground: 'foundation', sustainedIf: { facts: ['f_knife_gap'] } },
  },
  ev_911: {
    name: '911 call transcript',
    side: 'defense',
    knownAtStart: true,
    desc: 'Certified transcript of Tasha Greene’s 911 call, 11:43 PM. Includes the line: "I couldn’t see his face."',
    foundationWitnesses: ['greene'],
    foundationFacts: ['f_greene_saw'],
    onAdmit: [],
  },
  ev_array: {
    name: 'Photo array sheet',
    side: 'defense',
    knownAtStart: true,
    desc: 'The six-photo array shown to Greene a week after the killing. Only one photo shows a gray jacket: Daniel Cross’s.',
    foundationWitnesses: ['greene', 'alvarez'],
    foundationFacts: ['f_greene_id'],
    onAdmit: [],
  },
  ev_maintlog: {
    name: 'Camera maintenance log',
    side: 'defense',
    knownAtStart: false, // discovered mid-trial via the investigator's note
    desc: 'The Anchor Bar’s camera service log. The last three entries note: "system clock runs approx. 10 min ahead — not corrected."',
    foundationWitnesses: ['okafor'],
    foundationFacts: ['f_okafor_services_camera'],
    onAdmit: ['f_clock_fast'],
  },
};
