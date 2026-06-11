// Fact registry for State v. Mara Vance (arson).
// Issues: origin (incendiary vs accidental), presence (was Vance there at
// ignition ~2:05 AM), intent (fraud — the mens rea), device (the gas can /
// accelerant theory), altCause (the electrical-fault alternative).
// POSITIVE weights push toward the prosecution; NEGATIVE toward the defense.

export const FACTS = {
  // ---- The fire & the investigation (Marshal Hubbard) ----
  f2_fire: {
    text: 'The Lantern burned shortly after 2 AM; the upstairs tenant escaped with smoke inhalation.',
    channel: 'police', w: { origin: 0.03, intent: 0.02 },
  },
  f2_pour: {
    text: 'Marshal Hubbard identified "pour patterns" on the kitchen floor — the signature, he says, of a poured liquid fire.',
    channel: 'police', w: { origin: 0.13, device: 0.05 },
  },
  f2_burnthrough: {
    text: 'Deep burn-through low on the floor under the prep table — fire burning at floor level.',
    channel: 'police', w: { origin: 0.09 },
  },
  f2_twoorigins: {
    text: 'The marshal identified two separate points of origin in the kitchen.',
    channel: 'police', w: { origin: 0.12 },
  },
  f2_gascan_found: {
    text: 'A melted gasoline can was recovered from the kitchen debris.',
    channel: 'police', w: { device: 0.12, origin: 0.04 },
  },
  f2_gascan_admitted: {
    text: 'The melted gas can is in evidence.',
    channel: 'docs', w: { device: 0.08 },
  },
  f2_battery: {
    text: 'The restaurant’s kitchen smoke detector was found with its battery missing.',
    channel: 'police', w: { origin: 0.07, intent: 0.07 },
  },
  f2_ruledout: {
    text: 'Marshal Hubbard testified he "ruled out" electrical causes.',
    channel: 'police', w: { altCause: 0.12 },
  },
  f2_incendiary: {
    text: 'The marshal’s formal conclusion: an incendiary fire, intentionally set.',
    channel: 'police', w: { origin: 0.08, intent: 0.04 },
  },
  f2_threats: {
    text: 'Hubbard relayed that a supplier said Vance told him she "ought to let the place burn." (hearsay)',
    channel: 'police', w: { intent: 0.08, origin: 0.04 },
  },
  f2_setforinsurance: {
    text: 'The marshal agreed the fire was "set for the insurance money." (led conclusion)',
    channel: 'police', w: { intent: 0.08 },
  },
  f2_h_redirect: {
    text: 'On redirect, Hubbard held his ground: whatever the patterns, the missing battery and the can remain.',
    channel: 'police', w: { origin: 0.04 },
  },

  // ---- Eyewitness (Ed Carney) ----
  f2_carney_saw: {
    text: 'Carney saw a woman in a hooded coat at the Lantern’s rear door around 1:40 AM.',
    channel: 'lay', w: { presence: 0.10 },
  },
  f2_carney_id: {
    text: 'Carney identified the woman as Mara Vance — "I’ve known her ten years."',
    channel: 'lay', w: { presence: 0.15 },
  },
  f2_carney_sneak: {
    text: 'Carney said she "looked like she was trying not to be seen." (speculation)',
    channel: 'lay', w: { presence: 0.05, intent: 0.04 },
  },
  f2_carney_conditions: {
    text: 'It was raining, dark, and Carney was roughly a hundred feet away.',
    channel: 'lay', w: { presence: -0.05 },
  },
  f2_carney_coat: {
    text: 'What Carney recognized was mostly the old green coat "everyone on the dock knows" — and her walk.',
    channel: 'lay', w: { presence: -0.06 },
  },
  f2_carney_time: {
    text: 'Carney’s sighting was at 1:40 — fixed by his 1:35–1:45 break — twenty-five minutes before the fire began.',
    channel: 'lay', w: { presence: -0.10 },
  },
  f2_carney_bag: {
    text: 'The woman Carney saw was walking to her car with a laptop bag, unhurried.',
    channel: 'lay', w: { presence: -0.07, origin: -0.04 },
  },
  f2_carney_sure: {
    text: 'On redirect, Carney repeated it: whoever she was walking to, it was Mara Vance at that door.',
    channel: 'lay', w: { presence: 0.04 },
  },

  // ---- The tenant (Joel Pratt) ----
  f2_pratt_injury: {
    text: 'Joel Pratt woke to smoke, escaped down the fire stairs, and spent two nights in the hospital.',
    channel: 'emotion', w: { intent: 0.05 },
  },
  f2_pratt_noise: {
    text: 'Pratt heard footsteps on the restaurant floorboards below him around 2 AM.',
    channel: 'lay', w: { presence: 0.09 },
  },
  f2_desperate: {
    text: 'Pratt said Vance had been "acting desperate for weeks." (speculation)',
    channel: 'lay', w: { intent: 0.07 },
  },
  f2_pratt_couldbe: {
    text: 'Pratt conceded the sounds could have been the old building itself — "it talks at night."',
    channel: 'lay', w: { presence: -0.04 },
  },
  f2_pratt_meds: {
    text: 'Pratt had taken his prescribed sleep medication that night.',
    channel: 'lay', w: { presence: -0.06 },
  },
  f2_pratt_creaks: {
    text: 'Six years above that kitchen: pipes, the cooler compressor — the building makes those sounds on its own.',
    channel: 'lay', w: { presence: -0.05 },
  },
  f2_pratt_kind: {
    text: 'Pratt — the man the fire hurt — called Vance a good landlord who brought him meals when he was laid off.',
    channel: 'emotion', w: { intent: -0.04 },
  },
  f2_pratt_sure: {
    text: 'On redirect, Pratt insisted: "The smoke was real. The sounds were real. I know what I heard."',
    channel: 'lay', w: { presence: 0.04 },
  },

  // ---- Insurance (Gwen Ostrowski) ----
  f2_failing: {
    text: 'The Lantern was failing: months behind with suppliers, two missed loan payments.',
    channel: 'docs', w: { intent: 0.08 },
  },
  f2_policy: {
    text: 'Vance’s fire coverage was doubled three months before the fire.',
    channel: 'docs', w: { intent: 0.10 },
  },
  f2_fastclaim: {
    text: 'The insurance claim was filed within 48 hours of the fire.',
    channel: 'docs', w: { intent: 0.06 },
  },
  f2_textbook: {
    text: 'Ostrowski agreed the case "checks the boxes" of a textbook fraud profile. (led conclusion)',
    channel: 'docs', w: { intent: 0.07 },
  },
  f2_memo_admitted: {
    text: 'The insurer’s internal fraud-indicators memo is in evidence.',
    channel: 'docs', w: { intent: 0.08 },
  },
  f2_ostrowski_file: {
    text: 'Ostrowski reviewed the complete underwriting and refinance file.',
    channel: 'docs', w: {},
  },
  f2_lender_letter: {
    text: 'The refinance lender’s letter required Vance to increase her coverage — the "suspicious" policy change was a loan condition.',
    channel: 'docs', w: { intent: -0.12 },
  },
  f2_broker: {
    text: 'The 48-hour claim was filed automatically by her broker — standard on any total loss.',
    channel: 'docs', w: { intent: -0.05 },
  },
  f2_cooperated: {
    text: 'Vance cooperated fully with the insurer and volunteered to delay any payout pending trial.',
    channel: 'lay', w: { intent: -0.06 },
  },
  f2_memo_opinion: {
    text: 'The fraud memo is an analyst’s screening checklist of suspicions — not a finding of fact.',
    channel: 'lay', w: { intent: -0.04 },
  },
  f2_toprange: {
    text: 'On redirect: the lender required "adequate" coverage — the amount Vance chose was at the top of the range.',
    channel: 'docs', w: { intent: 0.04 },
  },

  // ---- Fire science & the building (defense case) ----
  f2_flashover: {
    text: 'Under NFPA 921, post-flashover burning produces "pour patterns" and multiple apparent origins in ordinary accidental fires — the marshal’s signatures prove nothing by themselves.',
    channel: 'forensics', w: { origin: -0.14 },
  },
  f2_cert_lapsed: {
    text: 'Marshal Hubbard’s investigator certification lapsed four years ago; he has had no training on the current standards.',
    channel: 'docs', w: { origin: -0.06 },
  },
  f2_no_lab: {
    text: 'The state lab found NO ignitable-liquid residue in any of the marshal’s debris samples.',
    channel: 'forensics', w: { device: -0.12, origin: -0.06 },
  },
  f2_can_storage: {
    text: 'The melted gas can was the restaurant’s own — stored in the kitchen closet for the storm generator, as it had been for years.',
    channel: 'lay', w: { device: -0.10 },
  },
  f2_no_test: {
    text: 'The marshal never pulled the alarm panel’s fault log and never tested the kitchen circuit — he "didn’t see the need."',
    channel: 'police', w: { altCause: -0.08 },
  },
  f2_chirp: {
    text: 'The handyman pulled the smoke detector battery himself in March — kitchen steam set it off every lunch rush. "That’s on me, not her."',
    channel: 'lay', w: { origin: -0.05, intent: -0.05 },
  },
  f2_breaker_history: {
    text: 'Circuit four’s breaker had been tripping since spring — old aluminum wiring, warm at the junction box. Soltis warned Vance: "this is how fires start."',
    channel: 'lay', w: { altCause: -0.12 },
  },
  f2_workorder: {
    text: 'A signed work order, dated before the fire: rewire circuit four next month. Vance had already paid the deposit.',
    channel: 'docs', w: { intent: -0.09, altCause: -0.04 },
  },
  f2_panel_log: {
    text: 'The alarm panel log: 02:01 — FAULT, CIRCUIT 4. 02:06 — HEAT ALARM, KITCHEN. The wiring faulted five minutes before the fire announced itself.',
    channel: 'docs', w: { altCause: -0.16, origin: -0.09 },
  },
  f2_soltis_alarm: {
    text: 'Soltis personally services the Lantern’s alarm panel every month.',
    channel: 'lay', w: {},
  },
  f2_soltis_limits: {
    text: 'Soltis conceded he cannot say the fault CAUSED the fire — only that it was there, and it came first.',
    channel: 'lay', w: { altCause: 0.05 },
  },
  f2_soltis_bias: {
    text: 'The prosecutor painted Soltis as a paid friend of twelve years.',
    channel: 'lay', w: { altCause: 0.03 },
  },
  f2_staged: {
    text: 'The prosecutor’s suggestion lingered: an electrical fault can be staged by anyone who knows the panel.',
    channel: 'lay', w: { altCause: 0.06, origin: 0.04 },
  },
  f2_soltis_dated: {
    text: 'The warnings and the work order are all dated months before the fire. "Friendship doesn’t backdate paper."',
    channel: 'docs', w: { altCause: -0.04, intent: -0.03 },
  },

  // ---- The defendant ----
  f2_vance_account: {
    text: 'Vance’s account: she came by at 1:30 to take the books and laptop before repossession agents could, and left by 1:50.',
    channel: 'lay', w: { presence: -0.08, origin: -0.05, intent: -0.04 },
  },
  f2_vance_coat: {
    text: 'The hooded coat is the only coat she keeps at the dock. It was raining.',
    channel: 'lay', w: { presence: -0.03 },
  },
  f2_no_benefit: {
    text: 'The insurance proceeds go to the LENDER, not to Vance — she gains nothing from ashes, and she had a buyer coming in spring.',
    channel: 'lay', w: { intent: -0.08 },
  },
  f2_vance_prior_statement: {
    text: 'Vance admitted telling her supplier: "I should let this place burn."',
    channel: 'lay', w: { intent: 0.09, origin: 0.04 },
  },
  f2_vance_cold: {
    text: 'Confronted with the pour patterns and the timeline, Vance could only say: "I don’t know how to make you believe me."',
    channel: 'lay', w: { origin: 0.07, presence: 0.05 },
  },
  f2_vance_held: {
    text: 'Vance turned the prosecutor’s timeline back on her: the State’s own alarm log puts the fault at 2:01, when she was driving home.',
    channel: 'lay', w: { origin: -0.04 },
  },
  f2_vance_pressed: {
    text: 'The prosecutor’s accusation — "the fire was cleaner, admit it" — rang in the silence after her denial.',
    channel: 'emotion', w: { intent: 0.05, origin: 0.03 },
  },
  f2_explains_statement: {
    text: 'On redirect, Vance explained the "let it burn" remark: said through tears the night she lost the Roundtree contract. "You don’t burn a thing you cry over."',
    channel: 'emotion', w: { intent: -0.05 },
  },
  f2_vance_insists: {
    text: 'Given a last chance, Vance simply repeated it, quietly: she left at 1:50, and the building was dark behind her.',
    channel: 'emotion', w: { presence: -0.03 },
  },
};
