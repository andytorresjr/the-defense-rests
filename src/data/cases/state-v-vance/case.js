// State v. Mara Vance — arson at the Lantern. Second case, same engine.
import { FACTS } from './facts.js';
import { EVIDENCE } from './evidence.js';
import { JUROR_POOL } from './jurors.js';
import * as ARGS from './arguments.js';
import hubbard from './witnesses/hubbard.js';
import carney from './witnesses/carney.js';
import pratt from './witnesses/pratt.js';
import ostrowski from './witnesses/ostrowski.js';
import soltis from './witnesses/soltis.js';
import vance from './witnesses/vance.js';

export const CASE = {
  id: 'state-v-vance',
  title: 'STATE v. MARA VANCE',
  tagline: 'A drowning restaurant. A doubled policy. A fire marshal who reads floors like scripture — from a book science buried.',
  charge: {
    name: 'Arson in the First Degree',
    lesser: 'Reckless Burning',
    elementsBlurb: 'The State must prove beyond a reasonable doubt that Mara Vance set the fire that consumed an occupied building, and that she did so intentionally — to defraud her insurer.',
  },
  issues: ['origin', 'presence', 'intent', 'device', 'altCause'],
  defendant: {
    name: 'Mara Vance',
    portrait: { skin: '#b97f5a', hair: 'bun', hairColor: '#241d18', outfit: 'suit' },
  },
  verdictModel: {
    act: { origin: 0.4, presence: 0.25, device: 0.1, altCause: 0.25 },
    mensRea: 'intent',
    verdicts: {
      TOP: {
        label: 'GUILTY — ARSON IN THE FIRST DEGREE', short: 'Arson 1', cls: 'v-m2',
        epilogue: 'Twelve to twenty years — Joel Pratt’s two nights at Mercy made it first degree. Mara Vance does not cry when they read it. She watches the window, where you can almost see the harbor, and says only: "Tell Ray to look after the panel at St. Brigid’s." The record you built is the record they judged.',
      },
      LESSER: {
        label: 'GUILTY — RECKLESS BURNING', short: 'Reckless', cls: 'v-man',
        epilogue: 'The jury would not call her a fraud — but they could not forgive the warnings she carried for months about that wiring while a man slept above it. Eighteen months, suspended after six. "I kept the building too long," she tells you on the steps. "That part they got right."',
      },
      NG: {
        label: 'NOT GUILTY', short: 'Not guilty', cls: 'v-ng',
        epilogue: 'It rains on the courthouse steps, which feels right. Harbor Mutual pays the lender, the lot is sold to the buyer from Portland, and the town slowly stops whispering. Months later a fire-science journal cites the Lantern as a flashover misread. Mara frames the alarm log entry — 02:01, FAULT, CIRCUIT 4 — and hangs it where the deed used to be.',
      },
      HUNG: {
        label: 'MISTRIAL — HUNG JURY', short: 'Hung', cls: 'v-hung',
        epilogue: 'Deadlocked, twice instructed, deadlocked again. Judge Holt declares a mistrial, and the District Attorney — eyeing the lab report and the panel log you forced into the light — quietly announces the State will "evaluate its options." Most everyone at the harbor knows what that means. It is not a win. It is close to one.',
      },
    },
  },
  briefing: [
    'The Lantern — your client’s harborside restaurant, her mother’s name on the deed — burned at two in the morning. The tenant upstairs got out through the smoke. That makes it arson in the first degree, if it was arson at all.',
    'The fire marshal says the floor shows pour patterns and two points of origin, and a melted gas can came out of the debris. Her insurance was doubled three months ago. A dockworker saw her at the back door at 1:40 AM.',
    'Mara says she went for the account books ahead of the repossession agents, locked a dark kitchen, and drove home. She also once told her fish supplier she "should let this place burn." You will hear about that.',
    'Your file holds the refinance lender’s letter and a signed electrical work order. Your investigator is still digging on the building’s alarm panel. Read everything. Trust nothing — especially thirty years of experience.',
  ],
  facts: FACTS,
  evidence: EVIDENCE,
  jurorPool: JUROR_POOL,
  strikes: { player: 3, prosecution: 3 },
  witnesses: [hubbard, carney, pratt, ostrowski, soltis, vance],
  arguments: ARGS,

  events: {
    panelLog: {
      title: 'A note from your investigator',
      text: 'Folded into your case file during the recess:\n\n"Harbor Alarm finally coughed up the certified PANEL LOG for the night of the fire. Two entries you will want to frame: 02:01 FAULT CIRCUIT 4. 02:06 HEAT ALARM KITCHEN. The marshal never requested this. Soltis services that panel — he can authenticate. — R."',
      effects: [
        { type: 'LEARN_EVIDENCE', id: 'ev2_panel' },
        { type: 'LOG', entry: 'Investigator note: alarm panel log obtained.' },
      ],
    },
  },

  decisions: {
    callDefendant: {
      title: 'The defense’s last decision',
      prompt: 'Ray Soltis has been excused. One witness remains to consider: Mara Vance herself.\n\nIf she testifies, the jury hears the money truth only she can tell — the insurance pays her lender, not her. But the prosecutor is holding the "I should let this place burn" remark, and she will swing it.\n\nIf Mara stays silent, the judge will instruct the jury to draw no inference. Most jurors follow that instruction. Most.',
      options: [
        { id: 'call', label: 'Call Mara Vance to the stand', flag: { key: 'callDefendant', value: true } },
        { id: 'rest', label: 'The defense rests', flag: { key: 'callDefendant', value: false } },
      ],
    },
  },

  trialPlan: [
    { type: 'voirDire' },
    { type: 'openings' },
    { type: 'phaseBanner', phase: 'prosecutionCase', title: 'The People’s Case', sub: 'The State builds its fire. Listen for folklore dressed as science — and pick your moments.' },
    { type: 'witness', id: 'hubbard' },
    { type: 'admission', items: ['ev2_gascan'] },
    { type: 'witness', id: 'carney' },
    { type: 'witness', id: 'pratt' },
    { type: 'witness', id: 'ostrowski' },
    { type: 'admission', items: ['ev2_memo'] },
    { type: 'phaseBanner', phase: 'defenseCase', title: 'The People Rest', sub: 'Your case now. Remember: on direct, you may not lead your own witness.' },
    { type: 'event', id: 'panelLog' },
    { type: 'witness', id: 'soltis' },
    { type: 'decision', id: 'callDefendant' },
    { type: 'witness', id: 'vance', cond: { flags: { callDefendant: true } } },
    { type: 'noTestifyInstruction', cond: { flags: { callDefendant: false } } },
    { type: 'closings' },
    { type: 'deliberation' },
    { type: 'verdict' },
  ],
};
