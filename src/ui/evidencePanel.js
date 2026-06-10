// The Court Record: exhibits (with status) and the facts actually on the
// record. In "present" mode (during the player's own examination) exhibits
// can be moved into evidence through the witness on the stand.
import { canAdmit } from '../engine/evidence.js';

export function openCourtRecord(state, caseData, opts = {}) {
  // opts.presentTo: witnessId when presenting is allowed.
  return new Promise(resolve => {
    const root = document.getElementById('modal-root');
    const exhibits = Object.entries(caseData.evidence)
      .filter(([id, def]) => state.evidence[id].known)
      .map(([id, def]) => {
        const ev = state.evidence[id];
        const status = ev.admitted ? `In evidence (${ev.exhibitNo})` : ev.excluded ? 'EXCLUDED' : 'In your file';
        const canPresent = opts.presentTo && def.side === 'defense' && !ev.admitted && !ev.excluded;
        return `
        <div class="exhibit ${ev.admitted ? 'admitted' : ''} ${ev.excluded ? 'excluded' : ''}">
          <div class="exhibit-head">
            <strong>${def.name}</strong>
            <span class="chip">${status}</span>
          </div>
          <p>${def.desc}</p>
          ${canPresent ? `<button class="present-btn" data-id="${id}">Present to the witness</button>` : ''}
        </div>`;
      }).join('') || '<p class="muted">Nothing in the file yet.</p>';

    const record = state.record.length
      ? state.record.map(e => {
        const fact = caseData.facts[e.factId];
        const src = e.source ? (caseData.witnesses.find(w => w.id === e.source)?.name ?? e.source) : 'Exhibit / record';
        const cls = e.mod <= 0 ? 'struck' : e.mod < 1 ? 'weakened' : '';
        return `<li class="${cls}"><span>${fact?.text ?? e.factId}</span><em>— ${src}${e.mod <= 0 ? ' (stricken)' : e.mod < 1 ? ' (struck; the jury heard it)' : ''}</em></li>`;
      }).join('')
      : '<li class="muted">Nothing on the record yet.</li>';

    const root2 = root;
    root2.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal record-modal">
          <div class="tabs">
            <button class="tab active" data-tab="exhibits">Exhibits</button>
            <button class="tab" data-tab="record">The Record</button>
          </div>
          <div class="tab-pane" id="pane-exhibits">${exhibits}</div>
          <div class="tab-pane" id="pane-record" hidden><ol class="record-list">${record}</ol></div>
          <button class="ghost-btn close-btn">Close</button>
        </div>
      </div>`;
    root2.hidden = false;

    root2.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      root2.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
      root2.querySelector('#pane-exhibits').hidden = t.dataset.tab !== 'exhibits';
      root2.querySelector('#pane-record').hidden = t.dataset.tab !== 'record';
    }));
    root2.querySelector('.close-btn').addEventListener('click', () => {
      root2.hidden = true; root2.innerHTML = '';
      resolve(null);
    });
    root2.querySelectorAll('.present-btn').forEach(b => b.addEventListener('click', () => {
      root2.hidden = true; root2.innerHTML = '';
      resolve(b.dataset.id);
    }));
  });
}
