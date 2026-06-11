// Full-screen scenes outside the live courtroom: title, case briefing,
// voir dire, openings, events, decisions, closings, deliberation, verdict.
import { seatJury } from '../engine/voirdire.js';
import { applyOpening, availableThemes, applyClosingThemes, applyProsecutionClosing } from '../engine/closings.js';
import { keyFactFor } from '../engine/jury.js';
import { applyAction } from '../engine/state.js';

const root = () => document.getElementById('screen-generic');

function showScreen(html) {
  const el = root();
  el.innerHTML = html;
  el.classList.add('active');
  document.getElementById('screen-court').classList.remove('active');
  document.getElementById('screen-title').classList.remove('active');
  return el;
}

export function hideGeneric() {
  root().classList.remove('active');
  root().innerHTML = '';
}

function waitClick(el, selector) {
  return new Promise(resolve => {
    el.querySelectorAll(selector).forEach(b => b.addEventListener('click', () => resolve(b)));
  });
}

// ---------- title + case select ----------
export function showTitle(cases, { savedCase, settings, onSettingsChange }) {
  const el = document.getElementById('screen-title');
  el.innerHTML = `
    <div class="title-card">
      <div class="title-scales">⚖</div>
      <h1>THE DEFENSE RESTS</h1>
      <p class="tagline">Two cases. Twelve jurors each. The record you build is all there is.</p>
      <div class="title-buttons">
        <button id="btn-new" class="big-btn">New Trial</button>
        ${savedCase ? `<button id="btn-continue" class="big-btn ghost">Continue — ${savedCase.title}</button>` : ''}
      </div>
      <div id="case-select" class="case-select" hidden>
        ${cases.map(c => `
          <button class="theme-card case-card" data-id="${c.id}">
            <strong>${c.title}</strong>
            <em>${c.charge.name} · lesser included: ${c.charge.lesser}</em>
            <p>${c.tagline}</p>
          </button>`).join('')}
      </div>
      <div class="title-settings">
        <label><input type="checkbox" id="set-deliberate" ${settings.deliberateMode ? 'checked' : ''}>
          Deliberate Mode <span class="muted">(pause after every statement — no real-time pressure)</span></label>
        <label>Text speed
          <select id="set-speed">
            <option value="28" ${settings.textSpeed === 28 ? 'selected' : ''}>Slow</option>
            <option value="18" ${settings.textSpeed === 18 ? 'selected' : ''}>Normal</option>
            <option value="8" ${settings.textSpeed === 8 ? 'selected' : ''}>Fast</option>
          </select></label>
      </div>
      <p class="hint muted">During testimony, hit <b>OBJECT!</b> the moment a question is improper. Press <b>\`</b> anytime for the debug view.</p>
    </div>`;
  el.classList.add('active');
  document.getElementById('screen-generic').classList.remove('active');
  document.getElementById('screen-court').classList.remove('active');

  el.querySelector('#set-deliberate').addEventListener('change', e => onSettingsChange({ deliberateMode: e.target.checked }));
  el.querySelector('#set-speed').addEventListener('change', e => onSettingsChange({ textSpeed: Number(e.target.value) }));

  return new Promise(resolve => {
    el.querySelector('#btn-new').addEventListener('click', () => {
      const sel = el.querySelector('#case-select');
      sel.hidden = !sel.hidden;
    });
    el.querySelectorAll('.case-card').forEach(b => b.addEventListener('click', () => {
      el.classList.remove('active');
      resolve({ mode: 'new', caseId: b.dataset.id });
    }));
    el.querySelector('#btn-continue')?.addEventListener('click', () => {
      el.classList.remove('active');
      resolve({ mode: 'continue' });
    });
  });
}

// ---------- briefing ----------
export async function showBriefing(caseData) {
  const el = showScreen(`
    <div class="paper">
      <h2>CASE FILE — ${caseData.title}</h2>
      <h3>${caseData.charge.name} <span class="muted">(lesser included: ${caseData.charge.lesser})</span></h3>
      <p class="muted">${caseData.charge.elementsBlurb}</p>
      ${caseData.briefing.map(p => `<p>${p}</p>`).join('')}
      <button class="big-btn" data-go>Proceed to jury selection</button>
    </div>`);
  await waitClick(el, '[data-go]');
  hideGeneric();
}

// ---------- voir dire ----------
export async function runVoirDire(state, caseData) {
  const pool = caseData.jurorPool;
  const maxStrikes = caseData.strikes.player;
  const struck = new Set();

  const el = showScreen(`
    <div class="voirdire">
      <h2>Jury Selection</h2>
      <p>Eighteen candidates. You may strike <b>${maxStrikes}</b>. The People will strike ${caseData.strikes.prosecution} after you. The first twelve remaining are sworn. <span class="muted">Listen for how they think — receptive jurors decide cases.</span></p>
      <div class="juror-grid">
        ${pool.map(j => `
          <div class="juror-card" data-id="${j.id}">
            <strong>${j.name}</strong><em>${j.occupation}</em>
            ${j.quotes.map(q => `<p>${q}</p>`).join('')}
            <button class="strike-btn">Strike</button>
          </div>`).join('')}
      </div>
      <div class="voirdire-footer">
        <span id="strike-count">Strikes used: 0/${maxStrikes}</span>
        <button id="vd-confirm" class="big-btn">Accept the panel</button>
      </div>
    </div>`);

  el.querySelectorAll('.juror-card').forEach(card => {
    card.querySelector('.strike-btn').addEventListener('click', () => {
      const id = card.dataset.id;
      if (struck.has(id)) { struck.delete(id); card.classList.remove('struck'); card.querySelector('.strike-btn').textContent = 'Strike'; }
      else if (struck.size < maxStrikes) { struck.add(id); card.classList.add('struck'); card.querySelector('.strike-btn').textContent = 'Undo'; }
      el.querySelector('#strike-count').textContent = `Strikes used: ${struck.size}/${maxStrikes}`;
    });
  });

  await waitClick(el, '#vd-confirm');
  const { seated, aiStrikes } = seatJury(state, caseData, [...struck]);

  const el2 = showScreen(`
    <div class="paper">
      <h2>The panel is sworn</h2>
      <p>The People exercised strikes against: <b>${aiStrikes.map(id => pool.find(j => j.id === id).name).join(', ')}</b>.</p>
      <p>Seated: ${seated.map(j => j.name).join(' · ')}</p>
      <button class="big-btn" data-go>Proceed to opening statements</button>
    </div>`);
  await waitClick(el2, '[data-go]');
  hideGeneric();
}

// ---------- openings ----------
export async function runOpenings(state, caseData) {
  const el = showScreen(`
    <div class="paper">
      <h2>Opening Statements</h2>
      <h3>ADA Victoria Pierce, for the People:</h3>
      ${caseData.arguments.PROSECUTION_OPENING.map(p => `<blockquote>${p}</blockquote>`).join('')}
      <h3>Your opening. Choose the theory you will promise this jury:</h3>
      <div class="theme-list">
        ${caseData.arguments.DEFENSE_OPENINGS.map(o => `
          <button class="theme-card" data-id="${o.id}">
            <strong>${o.title}</strong>
            <em>${o.blurb}</em>
            <p>${o.text}</p>
          </button>`).join('')}
      </div>
    </div>`);
  const btn = await waitClick(el, '.theme-card');
  applyOpening(state, caseData, btn.dataset.id);
  hideGeneric();
}

// ---------- mid-trial event ----------
export async function showEvent(state, event) {
  for (const eff of event.effects) applyAction(state, eff);
  const el = showScreen(`
    <div class="paper note">
      <h2>${event.title}</h2>
      ${event.text.split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('')}
      <button class="big-btn" data-go>Back to the courtroom</button>
    </div>`);
  await waitClick(el, '[data-go]');
  hideGeneric();
}

// ---------- decision ----------
export async function runDecision(state, decision) {
  const el = showScreen(`
    <div class="paper">
      <h2>${decision.title}</h2>
      ${decision.prompt.split('\n').filter(Boolean).map(p => `<p>${p}</p>`).join('')}
      <div class="theme-list">
        ${decision.options.map(o => `<button class="theme-card" data-id="${o.id}"><strong>${o.label}</strong></button>`).join('')}
      </div>
    </div>`);
  const btn = await waitClick(el, '.theme-card');
  const opt = decision.options.find(o => o.id === btn.dataset.id);
  applyAction(state, { type: 'FLAG', key: opt.flag.key, value: opt.flag.value });
  hideGeneric();
}

export async function showInstruction(text) {
  const el = showScreen(`
    <div class="paper">
      <h2>The Court instructs the jury</h2>
      <blockquote>${text}</blockquote>
      <button class="big-btn" data-go>Continue</button>
    </div>`);
  await waitClick(el, '[data-go]');
  hideGeneric();
}

// ---------- closings ----------
export async function runClosings(state, caseData) {
  const themes = availableThemes(state, caseData);
  const picked = new Set();
  const MAX = 3;

  const el = showScreen(`
    <div class="paper">
      <h2>Closing Argument</h2>
      <p>Build your summation from the record <b>you actually made</b>. Choose up to ${MAX} themes. <span class="muted">Arguing past your evidence is how closings die.</span></p>
      <div class="theme-list">
        ${themes.map(({ theme: t, enabled, dangerous }) => `
          <button class="theme-card ${enabled ? '' : 'locked'} ${dangerous ? 'dangerous' : ''}" data-id="${t.id}" ${enabled ? '' : 'disabled'}>
            <strong>${t.title}</strong>
            <p>${enabled ? t.line : ''}</p>
            <em>${enabled ? (dangerous ? '⚠ The record may contradict this.' : '') : `Locked — ${t.hint}`}</em>
          </button>`).join('')}
      </div>
      <div class="voirdire-footer">
        <span id="pick-count">Chosen: 0/${MAX}</span>
        <button id="cl-confirm" class="big-btn" disabled>Deliver the closing</button>
      </div>
    </div>`);

  el.querySelectorAll('.theme-card:not(.locked)').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      if (picked.has(id)) { picked.delete(id); card.classList.remove('picked'); }
      else if (picked.size < MAX) { picked.add(id); card.classList.add('picked'); }
      el.querySelector('#pick-count').textContent = `Chosen: ${picked.size}/${MAX}`;
      el.querySelector('#cl-confirm').disabled = picked.size === 0;
    });
  });
  await waitClick(el, '#cl-confirm');

  const outcomes = applyClosingThemes(state, caseData, [...picked]);
  const pros = applyProsecutionClosing(state, caseData);

  const el2 = showScreen(`
    <div class="paper">
      <h2>Summations</h2>
      <h3>You, for the defense:</h3>
      ${outcomes.map(o => o.backfired
        ? `<blockquote class="backfired">${o.theme.line}</blockquote><p class="backfire-note">${o.theme.backfireLine}</p>`
        : `<blockquote>${o.theme.line}</blockquote>`).join('')}
      <h3>ADA Pierce, in rebuttal:</h3>
      <blockquote>${pros.closing.text}</blockquote>
      <button class="big-btn" data-go>The jury retires to deliberate</button>
    </div>`);
  await waitClick(el2, '[data-go]');
  hideGeneric();
}

// ---------- deliberation ----------
export async function runDeliberation(state, caseData, result) {
  const labels = caseData.verdictModel.verdicts;
  const el = showScreen(`
    <div class="paper deliberation">
      <h2>The jury is out</h2>
      <div id="ballot-area"></div>
      <button class="big-btn" data-go hidden>The jury has reached its result</button>
    </div>`);
  const area = el.querySelector('#ballot-area');
  for (let i = 0; i < result.ballots.length; i++) {
    const b = result.ballots[i];
    await new Promise(r => setTimeout(r, i === 0 ? 600 : 900));
    area.insertAdjacentHTML('beforeend', `
      <div class="ballot">
        <span class="muted">Ballot ${i + 1}</span>
        <span class="b-m2" style="flex:${b.TOP}">${b.TOP ? `${labels.TOP.short}: ${b.TOP}` : ''}</span>
        <span class="b-man" style="flex:${b.LESSER}">${b.LESSER ? `${labels.LESSER.short}: ${b.LESSER}` : ''}</span>
        <span class="b-ng" style="flex:${b.NG}">${b.NG ? `${labels.NG.short}: ${b.NG}` : ''}</span>
      </div>`);
  }
  const btn = el.querySelector('[data-go]');
  btn.hidden = false;
  await waitClick(el, '[data-go]');
  hideGeneric();
}

// ---------- verdict ----------
const STANCE_CLS = { TOP: 's-m2', LESSER: 's-man', NG: 's-ng' };

export async function showVerdict(state, caseData, result) {
  const v = caseData.verdictModel.verdicts[result.verdict];
  const labels = caseData.verdictModel.verdicts;
  const rows = result.room.map(r => {
    const kf = keyFactFor(state, caseData, r);
    const why = kf.fact ? `couldn’t get past: “${kf.fact.text}”` : 'went with the room';
    return `<li><b>${r.juror.name}</b> <span class="stance ${STANCE_CLS[r.stance]}">${labels[r.stance].short}</span>${r.flipped ? ' <em>(moved during deliberation)</em>' : ''}<br><span class="muted">${why}</span></li>`;
  }).join('');

  const el = showScreen(`
    <div class="paper verdict">
      <h2 class="verdict-head ${v.cls}">${v.label}</h2>
      <p class="epilogue">${v.epilogue}</p>
      <h3>Inside the jury room</h3>
      <ol class="juror-breakdown">${rows}</ol>
      <button class="big-btn" data-go>Play again</button>
    </div>`);
  await waitClick(el, '[data-go]');
  hideGeneric();
}
