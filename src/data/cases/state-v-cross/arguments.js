// Openings and closings. Closing themes are GATED ON THE RECORD the player
// actually built — you can only argue the clock was wrong if the maintenance
// log came into evidence. Arguing a theme the record contradicts backfires.

export const PROSECUTION_OPENING = [
  'Ladies and gentlemen: this case is simple, and it is ugly. Marcus Webb humiliated Daniel Cross over thirty thousand dollars. That night, the defendant told him — in front of witnesses — "you\'ll regret this."',
  'Eleven minutes later, Marcus Webb was dying behind that bar, and the defendant — who swore to police he "walked straight home" — was captured on camera at the mouth of that lot at 11:42.',
  'The evidence will show motive, opportunity, and a lie. We will ask you to return the only verdict the evidence permits: guilty of murder in the second degree.',
];

export const DEFENSE_OPENINGS = [
  {
    id: 'open_wrongman',
    title: 'The Wrong Man',
    blurb: 'Attack the identification head-on. Promise the jury the eyewitness case will not survive scrutiny.',
    text: 'The State just promised you a camera and an eyewitness. Watch both promises carefully — because the witness who will sit in that chair could not see a face that night, and said so, that night, on a recorded line. Daniel Cross is the wrong man.',
    deltas: { identity: -0.03, altSuspect: -0.01 },
  },
  {
    id: 'open_rush',
    title: 'A Rush to Judgment',
    blurb: 'Put the investigation itself on trial: they picked a suspect first and stopped looking.',
    text: 'This investigation lasted exactly as long as it took to find a suspect with a grudge. Then it stopped. No other suspect was pursued. No forensics connect Daniel Cross to that lot. You will hear what the police did — and what they never bothered to do.',
    deltas: { altSuspect: -0.025, identity: -0.015, weapon: -0.01 },
  },
  {
    id: 'open_burden',
    title: 'Hold Them to the Burden',
    blurb: 'A quieter, classical defense opening: the burden of proof never moves.',
    text: 'I am going to ask one thing of you: make the State earn every word of its story. Daniel Cross does not have to prove anything to you. Beyond a reasonable doubt is the highest burden the law knows — keep it where it belongs, on that table.',
    deltas: { identity: -0.015, timeline: -0.015, intent: -0.015 },
  },
];

// requires: checkRequires schema. contradictedIf: if met, the theme BACKFIRES.
export const CLOSING_THEMES = [
  {
    id: 'cl_clock',
    title: 'The camera lied',
    line: '"The State\'s whole timeline hangs on a clock that its own maintenance log says runs ten minutes fast. At 11:42 on that screen, it was 11:32 in the real world — and Daniel Cross was walking home."',
    requires: { evidenceAdmitted: ['ev_maintlog'] },
    deltas: { timeline: -0.08, identity: -0.04 },
    hint: 'Requires the camera maintenance log in evidence.',
  },
  {
    id: 'cl_face',
    title: 'She never saw his face',
    line: '"Before the photo array, before the courtroom, before any of this — at 11:43 that night, Tasha Greene told the 911 operator the truth: I couldn\'t see his face."',
    requires: { facts: ['f_911_no_face'] },
    deltas: { identity: -0.07 },
    hint: 'Requires the 911 call on the record.',
  },
  {
    id: 'cl_array',
    title: 'A stacked deck',
    line: '"Six photos. One gray jacket. They didn\'t test her memory — they planted it."',
    requires: { facts: ['f_array_suggestive'] },
    deltas: { identity: -0.04 },
    hint: 'Requires the photo array problem on the record.',
  },
  {
    id: 'cl_knife',
    title: 'A knife from a dumpster',
    line: '"Two blocks away. Two days later. Found by a stranger. No prints, no blood. That isn\'t a murder weapon — that\'s a prop."',
    requires: { anyFacts: ['f_knife_gap', 'f_knife_not_matched'] },
    deltas: { weapon: -0.05 },
    hint: 'Requires attacking the knife’s chain of custody or match.',
  },
  {
    id: 'cl_lenny',
    title: 'Ask about Lenny',
    line: '"A professional collector was hunting Marcus Webb that same night, in that same bar — and the police never asked his name. You\'re allowed to ask why."',
    requires: { facts: ['f_lenny'] },
    deltas: { altSuspect: -0.07, identity: -0.02 },
    hint: 'Requires Lenny on the record.',
  },
  {
    id: 'cl_invitation',
    title: 'No ambush — an invitation',
    line: '"\'I\'ll be out back if you\'ve got the guts.\' Those are Marcus Webb\'s words. Whoever met him in that lot, Webb invited the fight — that is not lying in wait, and it is not malice."',
    requires: { facts: ['f_outback'] },
    deltas: { intent: -0.07 },
    hint: 'Requires Webb’s "out back" challenge on the record.',
  },
  {
    id: 'cl_struggle',
    title: 'A struggle, not an execution',
    line: '"An upward wound, face to face. Bruised knuckles on the victim\'s hands. The physical evidence describes two men fighting — not a killer waiting in the dark."',
    requires: { facts: ['f_wound_upward'] },
    deltas: { intent: -0.06 },
    hint: 'Requires the medical examiner’s struggle findings.',
  },
  {
    id: 'cl_alibi',
    title: 'The timeline closes',
    line: '"11:32 at the alley. A twelve-minute walk. At his door at 11:44 — exactly when his neighbor saw him, calm, in no hurry. Innocent men walk home at a walking pace."',
    requires: { facts: ['f_walk_fits'] },
    deltas: { timeline: -0.06, identity: -0.03 },
    hint: 'Requires both the corrected clock and Cruz’s timeline.',
  },
  {
    id: 'cl_character',
    title: 'Not a violent man',
    line: '"You\'ve watched Daniel Cross for days. Nothing in this man\'s life points to violence."',
    requires: {},
    deltas: { intent: -0.04 },
    contradictedIf: { facts: ['f_cross_prior'] },
    backfire: { intent: 0.05 },
    backfireLine: 'The prosecutor rises slowly. "Nothing… except the assault conviction counsel apparently hopes you\'ve forgotten." It lands like a slap.',
    hint: 'Dangerous if the jury heard about his record.',
  },
  {
    id: 'cl_burden',
    title: 'The burden never moved',
    line: '"If you are still asking yourselves what really happened that night — that question itself is the verdict. It is called reasonable doubt, and it belongs to Daniel Cross."',
    requires: {},
    deltas: { identity: -0.02, timeline: -0.02, weapon: -0.02, altSuspect: -0.02 },
    hint: 'Always available.',
  },
];

// The prosecutor's closing adapts to whichever issue the defense has hurt most.
export const PROSECUTION_CLOSINGS = {
  identity: {
    text: '"Counsel has worked very hard to make you doubt your own eyes. But Tasha Greene knew that jacket, knew that man — and the camera does not have opinions. Identification is not a guess here; it is corroborated."',
    deltas: { identity: 0.05, timeline: 0.02 },
  },
  timeline: {
    text: '"You\'ve heard a great deal about clocks. Here is what no clock changes: the defendant said he was never near that lot. He was. Whatever minute you put on it, that lie was told for a reason."',
    deltas: { timeline: 0.05, identity: 0.02 },
  },
  intent: {
    text: '"A struggle, counsel says. Then why did only one man bring a knife to it? You don\'t accidentally put four inches of steel through a chest. That is malice — by any clock, in any light."',
    deltas: { intent: 0.05, weapon: 0.02 },
  },
  weapon: {
    text: '"Forget the knife if you like — the wound is still there, and the man on the camera is still the defendant. The State does not need to hand you the blade to prove who used it."',
    deltas: { weapon: 0.04, identity: 0.03 },
  },
  altSuspect: {
    text: '"Lenny. A first name, a rumor, an empty chair. The defense would have you acquit a man caught on camera in favor of a ghost no one can describe. Verdicts are built on evidence, not ghosts."',
    deltas: { altSuspect: 0.06, identity: 0.02 },
  },
};

export const NO_DEFENDANT_INSTRUCTION =
  'The defendant has an absolute constitutional right not to testify. You may draw no inference of any kind from his silence.';
