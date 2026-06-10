// Debug overlay (backtick to toggle): live jury beliefs, judge/prosecutor
// state, witness states, and the record. Proof that every input moves the model.
import { on } from '../util/events.js';
import { elementBeliefs } from '../engine/jury.js';

let state = null, caseData = null;

export function initDebug(s, c) {
  state = s; caseData = c;
  document.addEventListener('keydown', e => {
    if (e.key === '`') {
      const el = document.getElementById('debug-overlay');
      el.hidden = !el.hidden;
      if (!el.hidden) render();
    }
  });
  on('state', () => {
    const el = document.getElementById('debug-overlay');
    if (!el.hidden) render();
  });
}

export function setDebugState(s) { state = s; }

function render() {
  const el = document.getElementById('debug-overlay');
  if (!state) return;
  const jury = state.jury.length ? `
    <table>
      <tr><th>Juror</th><th>arch</th><th>id</th><th>tl</th><th>in</th><th>wp</th><th>alt</th><th>kill</th><th>dt</th></tr>
      ${state.jury.map(j => {
        const e = elementBeliefs(j);
        const b = j.beliefs;
        return `<tr><td>${j.name}</td><td>${j.archetype}</td>
          <td>${b.identity.toFixed(2)}</td><td>${b.timeline.toFixed(2)}</td><td>${b.intent.toFixed(2)}</td>
          <td>${b.weapon.toFixed(2)}</td><td>${b.altSuspect.toFixed(2)}</td>
          <td><b>${e.killing.toFixed(2)}</b></td><td>${j.doubtThreshold}</td></tr>`;
      }).join('')}
    </table>` : '<p>(no jury seated)</p>';

  const witnesses = Object.entries(state.witnesses).map(([id, w]) =>
    `<li>${id}: comp ${w.composure} cred ${w.credibility.toFixed(2)} cracked[${w.cracked}] impeached×${w.impeachedOn.length}</li>`).join('');

  const record = state.record.map(e =>
    `<li${e.mod < 1 ? ' style="opacity:.45;text-decoration:line-through"' : ''}>${e.factId} (${e.source ?? 'doc'}, ×${e.mod})</li>`).join('');

  el.innerHTML = `
    <h4>DEBUG — \` to close</h4>
    <p>step ${state.progress.step} | phase ${state.phase} | judge pat ${state.judge.patience} std ${state.judge.standing}
    | player cred ${state.player.credibility} | DA aggr ${state.prosecutor.aggression.toFixed(2)} focus ${state.prosecutor.issueFocus}</p>
    ${jury}
    <div class="debug-cols"><ul>${witnesses}</ul><ul>${record}</ul></div>`;
}
