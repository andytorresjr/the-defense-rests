// The fact registry for State v. Daniel Cross.
// w: per-issue weights. POSITIVE pushes jurors toward the prosecution,
// NEGATIVE toward the defense. channel: which juror receptivity multiplier applies.
// Issues: identity, timeline, intent, weapon, altSuspect.
// (altSuspect = belief that there IS no alternative suspect; defense pulls it down.)

export const FACTS = {
  // ---- Scene & investigation (Det. Alvarez) ----
  f_scene: {
    text: 'Marcus Webb was found stabbed once in the chest behind the Anchor Bar at 11:41 PM.',
    channel: 'police', w: { weapon: 0.03, intent: 0.04 },
  },
  f_debt: {
    text: 'Webb owed the defendant $30,000 from their failed business.',
    channel: 'police', w: { intent: 0.08, identity: 0.05 },
  },
  f_denial: {
    text: 'Cross told police he left the bar at 11:30 and walked straight home, never entering the lot.',
    channel: 'police', w: { timeline: 0.05, identity: 0.04 },
  },
  f_footage_1142: {
    text: 'Bar camera footage shows Cross at the alley entrance to the lot, timestamped 11:42 PM.',
    channel: 'docs', w: { timeline: 0.14, identity: 0.10 },
  },
  f_bruise_cheek: {
    text: 'At his arrest, Cross had a fresh bruise on his left cheekbone.',
    channel: 'police', w: { identity: 0.06 },
  },
  f_lying: {
    text: 'Det. Alvarez told the jury the defendant was "obviously lying." (opinion)',
    channel: 'police', w: { identity: 0.07, timeline: 0.05 },
  },
  f_threat_hearsay: {
    text: 'Alvarez relayed that "people at the bar" said Cross had threatened Webb before. (hearsay)',
    channel: 'police', w: { intent: 0.08, identity: 0.05 },
  },
  f_ambush: {
    text: 'Alvarez agreed the killing was "clearly a planned ambush." (speculation)',
    channel: 'police', w: { intent: 0.09 },
  },
  f_knife_scene: {
    text: 'Alvarez testified the knife was "recovered at the scene."',
    channel: 'police', w: { weapon: 0.08 },
  },
  f_knife_admitted: {
    text: 'A folding knife consistent with the wound is in evidence.',
    channel: 'docs', w: { weapon: 0.10, intent: 0.04 },
  },
  f_footage_admitted: {
    text: 'The bar camera footage is in evidence.',
    channel: 'docs', w: { timeline: 0.05, identity: 0.03 },
  },
  // Defense attacks via Alvarez cross
  f_knife_gap: {
    text: 'The knife was actually found by a civilian in a dumpster two blocks away, two days later — no prints, no blood match.',
    channel: 'police', w: { weapon: -0.12 },
  },
  f_no_canvass: {
    text: 'Police never identified or pursued any other suspect, and stopped canvassing once Cross was arrested.',
    channel: 'police', w: { altSuspect: -0.07, identity: -0.04 },
  },
  f_no_blood: {
    text: 'No blood, fibers, or DNA connected Cross to the body or the lot.',
    channel: 'forensics', w: { identity: -0.09, weapon: -0.04 },
  },
  f_timestamp_unverified: {
    text: 'Det. Alvarez never verified the bar camera’s clock against real time.',
    channel: 'police', w: { timeline: -0.08 },
  },

  // ---- Eyewitness (Tasha Greene) ----
  f_greene_saw: {
    text: 'Greene saw a man in a gray jacket standing over Webb’s body in the lot.',
    channel: 'lay', w: { identity: 0.10 },
  },
  f_greene_id: {
    text: 'Greene identified Daniel Cross — from a photo array and again in court.',
    channel: 'lay', w: { identity: 0.14 },
  },
  f_greene_threat_hearsay: {
    text: 'Greene relayed that a friend told her Cross had threatened Webb. (hearsay)',
    channel: 'lay', w: { identity: 0.06, intent: 0.05 },
  },
  f_greene_waiting: {
    text: 'Greene said the man "looked like he\'d been waiting for someone." (speculation)',
    channel: 'lay', w: { intent: 0.07 },
  },
  f_greene_distance: {
    text: 'Greene was roughly sixty feet away, under a single sodium lamp.',
    channel: 'lay', w: { identity: -0.07 },
  },
  f_greene_drinks: {
    text: 'Greene had had four drinks over the course of that evening.',
    channel: 'lay', w: { identity: -0.06 },
  },
  f_911_no_face: {
    text: 'On her 911 call that night, Greene said: "I couldn\'t see his face."',
    channel: 'docs', w: { identity: -0.16 },
  },
  f_array_suggestive: {
    text: 'In the photo array, Cross’s photo was the only one showing a gray jacket.',
    channel: 'docs', w: { identity: -0.08 },
  },
  f_greene_certain: {
    text: 'On redirect, Greene reaffirmed she is "certain" of her identification today.',
    channel: 'lay', w: { identity: 0.05 },
  },

  // ---- Medical examiner (Dr. Soto) ----
  f_wound_single: {
    text: 'Death was caused by a single stab wound to the chest; death within minutes.',
    channel: 'forensics', w: { intent: 0.06, weapon: 0.05 },
  },
  f_deliberate: {
    text: 'Dr. Soto agreed a single thrust "suggests control rather than frenzy" — though she could not rule out a struggle that ended in one motion.',
    channel: 'forensics', w: { intent: -0.04 },
  },
  f_wound_upward: {
    text: 'The wound tracks upward — consistent with a face-to-face struggle at close quarters, not a blow from behind.',
    channel: 'forensics', w: { intent: -0.09 },
  },
  f_defensive_knuckles: {
    text: 'Webb had fresh bruising across his knuckles: he punched someone shortly before he died.',
    channel: 'forensics', w: { intent: -0.08, identity: 0.03 },
  },
  f_knife_not_matched: {
    text: 'Dr. Soto cannot say the recovered knife — as opposed to any similar blade — made the wound.',
    channel: 'forensics', w: { weapon: -0.08 },
  },

  // ---- Bartender (Sam Okafor) ----
  f_argument: {
    text: 'Cross and Webb argued loudly in the bar that evening over the money.',
    channel: 'lay', w: { intent: 0.07, identity: 0.04 },
  },
  f_regret: {
    text: 'Okafor heard Cross say "you\'ll regret this" as he walked out.',
    channel: 'lay', w: { intent: 0.09, identity: 0.05 },
  },
  f_cross_left_first: {
    text: 'Cross left the bar alone, roughly ten minutes before Webb went out the back.',
    channel: 'lay', w: { timeline: 0.04 },
  },
  f_outback: {
    text: 'Webb’s last words to Cross were: "I\'ll be out back if you\'ve got the guts." Webb expected a confrontation.',
    channel: 'lay', w: { intent: -0.12 },
  },
  f_lenny: {
    text: 'A debt collector known as "Lenny" was in the bar at 11:15 that night, asking where Webb was.',
    channel: 'lay', w: { altSuspect: -0.14, identity: -0.05 },
  },
  f_lenny_debt: {
    text: 'Webb owed serious money to the people Lenny collects for.',
    channel: 'lay', w: { altSuspect: -0.08 },
  },
  f_okafor_services_camera: {
    text: 'Okafor personally services the bar’s camera system every month.',
    channel: 'lay', w: {},
  },
  f_clock_fast: {
    text: 'The bar camera’s clock runs ten minutes fast — per the maintenance log, the "11:42" footage was really 11:32 PM.',
    channel: 'docs', w: { timeline: -0.20, identity: -0.08 },
  },

  // ---- Defense witnesses ----
  f_cruz_1145: {
    text: 'Rosa Cruz saw Cross arrive home around 11:45 PM, calm, in no hurry.',
    channel: 'lay', w: { timeline: -0.06 },
  },
  f_walk_fits: {
    text: 'With the camera clock corrected to 11:32, a twelve-minute walk puts Cross at his door at 11:44 — exactly when Cruz saw him.',
    channel: 'lay', w: { timeline: -0.12, identity: -0.05 },
  },
  f_cruz_noclock: {
    text: 'Cruz conceded she never looked at a clock — "around 11:45" is a guess.',
    channel: 'lay', w: { timeline: 0.05 },
  },
  f_cross_account: {
    text: 'Cross testified: he walked past the alley on his way home, never entered the lot, and never saw Webb again.',
    channel: 'lay', w: { identity: -0.08, timeline: -0.06, intent: -0.05 },
  },
  f_cross_stairs: {
    text: 'Cross says the bruise on his cheek came from a fall on his apartment stairs that week.',
    channel: 'lay', w: { identity: -0.03 },
  },
  f_cross_prior: {
    text: 'Cross has a prior misdemeanor assault conviction from nine years ago.',
    channel: 'lay', w: { intent: 0.07, identity: 0.04 },
  },
  f_cross_cold_footage: {
    text: 'On cross-examination, Cross could not explain why the camera shows him at the alley at "11:42."',
    channel: 'lay', w: { timeline: 0.12, identity: 0.08 },
  },
  f_cross_held_up: {
    text: 'Confronted with the corrected camera clock, the prosecutor’s timeline attack on Cross collapsed.',
    channel: 'lay', w: { timeline: -0.06 },
  },

  // ---- Facts surfaced by specific examination paths ----
  f_greene_recant: {
    text: 'Under cross-examination, Greene conceded she never saw the man’s face — only the gray jacket.',
    channel: 'lay', w: { identity: -0.13 },
  },
  f_soto_knife_consistent: {
    text: 'Dr. Soto found the recovered knife’s blade profile consistent with the fatal wound.',
    channel: 'forensics', w: { weapon: 0.05 },
  },
  f_webb_afraid: {
    text: 'Okafor said Webb seemed "afraid" of the defendant after the argument. (speculation)',
    channel: 'lay', w: { intent: 0.06, identity: 0.03 },
  },
  f_regret_context: {
    text: 'Okafor — who heard it — did not take "you\'ll regret this" as a threat of violence; Webb laughed it off.',
    channel: 'lay', w: { intent: -0.06 },
  },
  f_lenny_left_front: {
    text: 'Okafor never saw Lenny follow Webb out back; he left through the front.',
    channel: 'lay', w: { altSuspect: 0.05 },
  },
  f_cruz_bias: {
    text: 'The prosecutor painted Cruz as a loyal neighbor who would say anything for the defendant.',
    channel: 'lay', w: { timeline: 0.03 },
  },
  f_regret_explained: {
    text: 'Cross testified "you\'ll regret this" meant a lawsuit over the $30,000 — not violence.',
    channel: 'lay', w: { intent: -0.05 },
  },
  f_cross_waited: {
    text: 'The prosecutor\'s accusation — "you waited for him in the dark" — hung in the air over a flustered denial.',
    channel: 'emotion', w: { intent: 0.06, identity: 0.04 },
  },

  // ---- Redirect examination (rehabilitating your own witnesses) ----
  f_cruz_news: {
    text: 'Cruz anchored her timing to the Channel 9 late news theme — a broadcast that starts at 11:45 sharp, every night.',
    channel: 'lay', w: { timeline: -0.05 },
  },
  f_prior_context: {
    text: 'Cross pleaded guilty to the nine-year-old charge, paid, completed anger-management, and has stayed clean since.',
    channel: 'lay', w: { intent: -0.04 },
  },
  f_cross_insists: {
    text: 'Given a last chance on redirect, Cross simply repeated it, quieter: "I left at 11:30. I never went in that lot."',
    channel: 'emotion', w: { timeline: -0.03 },
  },
};
