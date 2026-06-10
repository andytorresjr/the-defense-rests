// State v. Daniel Cross — case assembly. The engine consumes this object;
// it never references this case's specifics directly. A second case is a
// second folder shaped like this one.
import { FACTS } from './facts.js';
import { EVIDENCE } from './evidence.js';
import { JUROR_POOL } from './jurors.js';
import * as ARGS from './arguments.js';
import alvarez from './witnesses/alvarez.js';
import greene from './witnesses/greene.js';
import soto from './witnesses/soto.js';
import okafor from './witnesses/okafor.js';
import cruz from './witnesses/cruz.js';
import daniel from './witnesses/daniel.js';

export const CASE = {
  id: 'state-v-cross',
  title: 'STATE v. DANIEL CROSS',
  tagline: 'One wound. One witness. One camera that cannot lie — unless it can.',
  charge: {
    name: 'Murder in the Second Degree',
    lesser: 'Voluntary Manslaughter',
    elementsBlurb: 'The State must prove beyond a reasonable doubt that Daniel Cross killed Marcus Webb, and that he did so with malice — not in a sudden quarrel.',
  },
  briefing: [
    'Marcus Webb, 41, was found stabbed once in the chest behind the Anchor Bar at 11:41 PM.',
    'Your client, Daniel Cross, argued with Webb that night over a $30,000 debt and told police he "walked straight home" at 11:30 — but the bar’s camera shows him at the alley entrance at 11:42.',
    'He swears he is innocent. He cannot explain the timestamp.',
    'Your file contains the 911 transcript of the State’s eyewitness and the photo array she was shown. Read everything. Trust nothing.',
  ],
  facts: FACTS,
  evidence: EVIDENCE,
  jurorPool: JUROR_POOL,
  strikes: { player: 3, prosecution: 3 },
  witnesses: [alvarez, greene, soto, okafor, cruz, daniel],

  arguments: ARGS,

  events: {
    investigatorNote: {
      title: 'A note from your investigator',
      text: 'Slipped to you during the recess — your investigator’s handwriting:\n\n"Anchor Bar camera gets serviced monthly by the BARTENDER. Pulled the maintenance log on subpoena — last three entries all say the same thing: SYSTEM CLOCK RUNS ~10 MIN AHEAD, never corrected. The log is in your file. He has to authenticate it. — R."',
      effects: [
        { type: 'LEARN_EVIDENCE', id: 'ev_maintlog' },
        { type: 'LOG', entry: 'Investigator note: camera maintenance log obtained.' },
      ],
    },
  },

  decisions: {
    callDefendant: {
      title: 'The defense’s last decision',
      prompt: 'Rosa Cruz has been excused. You have one witness left to consider: Daniel Cross himself.\n\nIf he testifies, the jury hears his story in his own voice — and the prosecutor gets him on cross, where his prior assault conviction comes in, and that camera timestamp will be waiting for him.\n\nIf he stays silent, the judge will instruct the jury to draw no inference. Most jurors follow that instruction. Most.',
      options: [
        { id: 'call', label: 'Call Daniel Cross to the stand', flag: { key: 'callDefendant', value: true } },
        { id: 'rest', label: 'The defense rests', flag: { key: 'callDefendant', value: false } },
      ],
    },
  },

  trialPlan: [
    { type: 'voirDire' },
    { type: 'openings' },
    { type: 'phaseBanner', phase: 'prosecutionCase', title: 'The People’s Case', sub: 'The State presents its witnesses. Listen. Object. Take everything apart on cross.' },
    { type: 'witness', id: 'alvarez' },
    { type: 'admission', items: ['ev_footage', 'ev_knife'] },
    { type: 'witness', id: 'greene' },
    { type: 'witness', id: 'soto' },
    { type: 'event', id: 'investigatorNote' },
    { type: 'witness', id: 'okafor' },
    { type: 'phaseBanner', phase: 'defenseCase', title: 'The People Rest', sub: 'Now it is your case. Direct examination has rules of its own: you may not lead your own witness.' },
    { type: 'witness', id: 'cruz' },
    { type: 'decision', id: 'callDefendant' },
    { type: 'witness', id: 'daniel', cond: { flags: { callDefendant: true } } },
    { type: 'noTestifyInstruction', cond: { flags: { callDefendant: false } } },
    { type: 'closings' },
    { type: 'deliberation' },
    { type: 'verdict' },
  ],
};
