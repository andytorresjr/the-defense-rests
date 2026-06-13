// Cinematic in-scene replacements for the 2D paper screens: every player input
// plays out inside the 3D courtroom — voir dire with the venire seated in the
// gallery under floating name plates, and openings, decisions, events,
// closings and the verdict as directed dialogue sequences. Engine calls are
// identical to src/ui/screens.js; only the stagecraft differs.
import { applyAction } from '../src/engine/state.js';
import { seatJury } from '../src/engine/voirdire.js';
import { applyOpening, availableThemes, applyClosingThemes, applyProsecutionClosing } from '../src/engine/closings.js';
import { keyFactFor } from '../src/engine/jury.js';
import { LabelLayer } from './labels.js';
import { playDrone } from './sound.js';

// ---------- helpers ----------

// Paragraphs always split; long paragraphs pack whole sentences into chunks
// the dialogue box can carry (~200 chars).
function splitText(text) {
  const out = [];
  for (const para of String(text).split(/\n+/)) {
    const p = para.trim();
    if (!p) continue;
    if (p.length <= 200) { out.push(p); continue; }
    const sentences = p.match(/[^.!?…]+[.!?…]+["”']?\s*|[^.!?…]+$/g) || [p];
    let chunk = '';
    for (const s of sentences) {
      if (chunk && (chunk + s).length > 200) { out.push(chunk.trim()); chunk = ''; }
      chunk += s;
    }
    if (chunk.trim()) out.push(chunk.trim());
  }
  return out;
}

// Speak a block of text as sequential beats. opts: { kind, shot, shotAll, name }.
// The pinned shot rides only the first chunk unless shotAll — the grammar
// keeps coverage alive on the rest.
function say(courtroom, speaker, text, opts = {}) {
  const chunks = splitText(text);
  return courtroom.playBeats(chunks.map((c, i) => ({
    speaker,
    kind: opts.kind ?? 'a',
    text: c,
    shot: (i === 0 || opts.shotAll) ? opts.shot : undefined,
    name: opts.name,
  })));
}

function beat(courtroom, b) { return courtroom.playBeats([b]); }

// Single-select tray: items [{ id, chip, html, disabled, danger, title }].
function choose(courtroom, items) {
  const el = courtroom.els.choices;
  return new Promise(resolve => {
    el.innerHTML = items.map(it => `
      <button class="choice ${it.disabled ? 'locked' : ''} ${it.danger ? 'danger' : ''}"
        data-id="${it.id}" ${it.disabled ? 'disabled' : ''} title="${it.title ?? ''}">
        <span class="chip">${it.chip}</span><span>${it.html}</span>
      </button>`).join('');
    el.querySelectorAll('button.choice:not(.locked)').forEach(b =>
      b.addEventListener('click', () => { el.innerHTML = ''; resolve(b.dataset.id); }));
  });
}

// ---------- voir dire ----------
export async function runVoirDire3D(state, caseData, courtroom, scene) {
  const pool = caseData.jurorPool;
  const max = caseData.strikes.player;
  const struck = new Set();

  courtroom.show();
  courtroom.setPhaseLabel('JURY SELECTION');
  scene.director.cut('venire');
  scene.seatVenire(pool);

  await say(courtroom, 'judge',
    `Ladies and gentlemen, you have been called as the venire in the matter of ${caseData.title}. Counsel will now exercise their challenges.`,
    { shot: 'judge_low_a' });
  await beat(courtroom, {
    speaker: 'narrator', kind: 'cue', shot: 'venire',
    text: `Study the panel. Hover a name to hear how they think — click a name to strike. You have ${max}. Receptive jurors decide cases.`,
  });

  const layer = new LabelLayer(scene);
  const tray = courtroom.els.choices;
  const renderConfirm = () => {
    tray.innerHTML = `
      <button class="choice util" data-act="confirm">
        <span class="chip">Panel</span>
        <span>Accept the panel — strikes used ${struck.size}/${max}</span>
      </button>`;
  };

  const confirmed = new Promise(resolve => {
    tray.addEventListener('click', function onClick(e) {
      if (e.target.closest('[data-act="confirm"]')) {
        tray.removeEventListener('click', onClick);
        tray.innerHTML = '';
        resolve();
      }
    });
  });

  for (const j of pool) {
    layer.add(j.id, out => scene.venireHeadPos(j.id, out), {
      title: j.name,
      sub: j.occupation,
      quotes: j.quotes,
      onClick: id => {
        if (struck.has(id)) {
          struck.delete(id);
          layer.setStruck(id, false);
        } else if (struck.size < max) {
          struck.add(id);
          layer.setStruck(id, true);
        } else {
          courtroom.toast(`You have only ${max} strikes. Un-strike someone first.`);
        }
        renderConfirm();
      },
    });
  }
  renderConfirm();
  await confirmed;

  // Suppress the auto-seat in Courtroom3D.refresh — we stage it ourselves.
  courtroom._jurySeated = true;
  const { seated, aiStrikes } = seatJury(state, caseData, [...struck]);

  if (struck.size) {
    await beat(courtroom, { speaker: 'judge', kind: 'a', shot: 'venire', text: 'The defense’s challenges are noted. You are excused with the thanks of the court.' });
    for (const id of struck) {
      layer.remove(id);
      scene.removeVenireMember(id);
    }
  }

  for (const id of aiStrikes) {
    const name = pool.find(j => j.id === id)?.name ?? 'the juror';
    layer.flash(id);
    await beat(courtroom, { speaker: 'prosecutor', kind: 'a', shot: 'venire', text: `Your Honor, the People thank and excuse ${name}.` });
    layer.remove(id);
    scene.removeVenireMember(id);
  }

  // The unlucky remainder beyond the first twelve goes home quietly.
  const seatedIds = new Set(seated.map(j => j.id));
  for (const j of pool) {
    if (!seatedIds.has(j.id) && !struck.has(j.id) && !aiStrikes.includes(j.id)) {
      layer.remove(j.id);
      scene.removeVenireMember(j.id);
    }
  }

  await beat(courtroom, { speaker: 'judge', kind: 'ruling', shot: 'venire', text: 'The first twelve will be sworn. Ladies and gentlemen — you are the jury.' });

  layer.dispose();
  scene.clearVenire();
  scene.setJury(state.jury);
  scene.director.cut('jury_pan');
  await beat(courtroom, { speaker: 'judge', kind: 'a', shot: 'jury_pan', text: 'Please be seated. We will hear opening statements.' });
}

// ---------- openings ----------
export async function runOpenings3D(state, caseData, courtroom, scene) {
  courtroom.show();
  courtroom.setPhaseLabel('OPENING STATEMENTS');

  await beat(courtroom, { speaker: 'judge', kind: 'a', text: 'Ms. Pierce, you may open for the People.' });
  for (const para of caseData.arguments.PROSECUTION_OPENING) {
    await say(courtroom, 'prosecutor', para);
  }
  await beat(courtroom, { speaker: 'judge', kind: 'a', text: 'Counsel for the defense.' });
  await beat(courtroom, {
    speaker: 'narrator', kind: 'cue',
    text: 'Your opening. Choose the theory you will promise this jury — they will remember the promise.',
  });

  const id = await choose(courtroom, caseData.arguments.DEFENSE_OPENINGS.map(o => ({
    id: o.id, chip: 'Theory', html: `<b>${o.title}</b> — ${o.blurb}`,
  })));
  const opening = caseData.arguments.DEFENSE_OPENINGS.find(o => o.id === id);
  applyOpening(state, caseData, id);
  await say(courtroom, 'player', opening.text);
}

// ---------- mid-trial event ----------
export async function showEvent3D(state, event, courtroom, scene) {
  for (const eff of event.effects) applyAction(state, eff);
  courtroom.show();
  await beat(courtroom, { speaker: 'narrator', kind: 'cue', shot: 'insert_def', text: `${event.title}.` });
  await say(courtroom, 'narrator', event.text, { kind: 'cue', shot: 'insert_def', shotAll: true });
}

// ---------- decision ----------
export async function runDecision3D(state, decision, courtroom, scene) {
  courtroom.show();
  courtroom.setPhaseLabel('A DECISION');

  const chunks = splitText(decision.prompt);
  await courtroom.playBeats(chunks.map((c, i) => ({
    speaker: 'narrator', kind: 'cue', text: c,
    shot: i === chunks.length - 1 ? 'defendant_cu_a' : 'deftable_two',
  })));

  const id = await choose(courtroom, decision.options.map(o => ({
    id: o.id, chip: 'Decide', html: `<b>${o.label}</b>`,
  })));
  const opt = decision.options.find(o => o.id === id);
  applyAction(state, { type: 'FLAG', key: opt.flag.key, value: opt.flag.value });

  if (opt.flag.value) {
    await beat(courtroom, { speaker: 'player', kind: 'q', text: 'Your Honor, the defense calls the defendant.' });
  } else {
    await beat(courtroom, { speaker: 'player', kind: 'q', shot: 'def_cu', text: 'Your Honor — the defense rests.' });
  }
}

// ---------- jury instruction ----------
export async function showInstruction3D(text, courtroom, scene) {
  courtroom.show();
  await beat(courtroom, { speaker: 'judge', kind: 'a', text: 'Members of the jury, the Court instructs you:' });
  await say(courtroom, 'judge', text);
}

// ---------- closings ----------
export async function runClosings3D(state, caseData, courtroom, scene) {
  courtroom.show();
  courtroom.setPhaseLabel('CLOSING ARGUMENTS');

  await say(courtroom, 'judge',
    'Counsel may proceed with summations. Members of the jury — what the lawyers say now is argument, not evidence.');
  await beat(courtroom, {
    speaker: 'narrator', kind: 'cue',
    text: 'Build your summation from the record you actually made. Up to three themes — arguing past your evidence is how closings die.',
  });

  const themes = availableThemes(state, caseData);
  const picked = new Set();
  const MAX = 3;
  const tray = courtroom.els.choices;

  await new Promise(resolve => {
    tray.innerHTML = `
      ${themes.map(({ theme: t, enabled, dangerous }) => `
        <button class="choice ${enabled ? '' : 'locked'} ${dangerous ? 'danger' : ''}"
          data-id="${t.id}" ${enabled ? '' : 'disabled'}
          title="${enabled ? (dangerous ? 'The record may contradict this.' : '') : `Locked — ${t.hint}`}">
          <span class="chip">${enabled ? (dangerous ? '⚠ Theme' : 'Theme') : 'Locked'}</span>
          <span><b>${t.title}</b>${enabled ? ` — ${t.line}` : ` <em>(${t.hint})</em>`}</span>
        </button>`).join('')}
      <button class="choice util" data-act="deliver" disabled>
        <span class="chip">Close</span><span>Deliver the closing (0/${MAX})</span>
      </button>`;

    const deliverBtn = tray.querySelector('[data-act="deliver"]');
    tray.querySelectorAll('button.choice[data-id]:not(.locked)').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        if (picked.has(id)) { picked.delete(id); b.classList.remove('picked'); }
        else if (picked.size < MAX) { picked.add(id); b.classList.add('picked'); }
        deliverBtn.disabled = picked.size === 0;
        deliverBtn.querySelector('span:last-child').textContent = `Deliver the closing (${picked.size}/${MAX})`;
      });
    });
    deliverBtn.addEventListener('click', () => {
      if (!picked.size) return;
      tray.innerHTML = '';
      resolve();
    });
  });

  const outcomes = applyClosingThemes(state, caseData, [...picked]);
  for (const o of outcomes) {
    await say(courtroom, 'player', o.theme.line);
    if (o.backfired) {
      await beat(courtroom, { speaker: 'narrator', kind: 'cue', shot: 'jury_rake', text: o.theme.backfireLine });
    }
  }

  const pros = applyProsecutionClosing(state, caseData);
  await beat(courtroom, { speaker: 'judge', kind: 'a', text: 'Rebuttal, Ms. Pierce?' });
  await say(courtroom, 'prosecutor', pros.closing.text);
  await beat(courtroom, { speaker: 'judge', kind: 'ruling', text: 'Members of the jury, you may retire to deliberate.' });
}

// ---------- verdict ----------
const STANCE_CLS = { TOP: 's-m2', LESSER: 's-man', NG: 's-ng' };

export async function showVerdict3D(state, caseData, result, courtroom, scene) {
  courtroom.show();
  courtroom.setPhaseLabel('THE VERDICT');
  scene.director.cut('est_axial');

  const fore = state.jury[0];
  const v = caseData.verdictModel.verdicts[result.verdict];

  await beat(courtroom, { speaker: 'judge', kind: 'a', shot: 'deftable_two', text: 'Will the defendant please rise.' });
  await beat(courtroom, { speaker: 'judge', kind: 'a', text: 'Has the jury reached a verdict?' });

  if (result.verdict === 'HUNG') {
    await beat(courtroom, {
      speaker: 'foreperson', name: fore?.name, kind: 'a',
      text: 'Your Honor — we are unable to reach a unanimous verdict. We are deadlocked.',
    });
    await beat(courtroom, {
      speaker: 'judge', kind: 'ruling',
      text: 'Then I have no choice. I declare a mistrial. Ladies and gentlemen, you are discharged with the thanks of the court.',
    });
  } else {
    await beat(courtroom, { speaker: 'foreperson', name: fore?.name, kind: 'a', text: 'We have, Your Honor.' });
    playDrone();
    scene.director.special('verdict'); // the long locked push on the defendant
    const finding = result.verdict === 'TOP'
      ? 'Guilty as charged.'
      : result.verdict === 'LESSER'
        ? `Not guilty of ${caseData.charge.name}. Guilty of the lesser included offense of ${caseData.charge.lesser}.`
        : 'Not guilty.';
    await beat(courtroom, {
      speaker: 'foreperson', name: fore?.name, kind: 'a',
      text: `In the matter of ${caseData.title}, on the charge of ${caseData.charge.name}, we find the defendant — ${finding}`,
    });
    await beat(courtroom, {
      speaker: 'judge', kind: 'ruling',
      text: 'So say you all. Ladies and gentlemen of the jury, thank you for your service. We are adjourned.',
    });
  }

  // The post-trial breakdown stays a document — it is the game explaining the
  // verdict it computed, juror by juror.
  const labels = caseData.verdictModel.verdicts;
  const rows = result.room.map(r => {
    const kf = keyFactFor(state, caseData, r);
    const why = kf.fact ? `couldn’t get past: “${kf.fact.text}”` : 'went with the room';
    return `<li><b>${r.juror.name}</b> <span class="stance ${STANCE_CLS[r.stance]}">${labels[r.stance].short}</span>${r.flipped ? ' <em>(moved during deliberation)</em>' : ''}<br><span class="muted">${why}</span></li>`;
  }).join('');

  const el = document.getElementById('screen-generic');
  el.innerHTML = `
    <div class="paper verdict">
      <h2 class="verdict-head ${v.cls}">${v.label}</h2>
      <p class="epilogue">${v.epilogue}</p>
      <h3>Inside the jury room</h3>
      <ol class="juror-breakdown">${rows}</ol>
      <button class="big-btn" data-go>Play again</button>
    </div>`;
  el.classList.add('active');
  document.getElementById('screen-court').classList.remove('active');
  await new Promise(res => el.querySelector('[data-go]').addEventListener('click', res));
  el.classList.remove('active');
  el.innerHTML = '';
}
