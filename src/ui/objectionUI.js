// Objection visuals: the full-screen slam, the grounds picker (untimed —
// the pressure is in spotting the moment, not in the legal reasoning),
// and ruling banners.
import { GROUNDS } from '../engine/objections.js';

const slamEl = () => document.getElementById('slam');

export function showSlam(text = 'OBJECTION!', who = 'player') {
  const el = slamEl();
  el.textContent = text;
  el.dataset.who = who;
  el.hidden = false;
  el.classList.remove('slam-anim');
  void el.offsetWidth; // restart animation
  el.classList.add('slam-anim');
  return new Promise(res => setTimeout(() => { el.hidden = true; res(); }, 900));
}

// Returns a groundId or null (withdrawn). Untimed; the trial clock is frozen.
export function pickGround() {
  return new Promise(resolve => {
    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal grounds-modal">
          <h3>On what grounds, counsel?</h3>
          <div class="grounds-list">
            ${GROUNDS.map(g => `
              <button class="ground-btn" data-id="${g.id}">
                <span class="ground-name">${g.label}</span>
                <span class="ground-tip">${g.tip}</span>
              </button>`).join('')}
          </div>
          <button class="ghost-btn" data-id="__withdraw">Withdraw the objection</button>
        </div>
      </div>`;
    root.hidden = false;
    root.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      root.hidden = true; root.innerHTML = '';
      resolve(b.dataset.id === '__withdraw' ? null : b.dataset.id);
    }));
  });
}

export function rulingBanner(sustained, text) {
  const el = document.getElementById('ruling-banner');
  el.textContent = text;
  el.dataset.ruling = sustained ? 'sustained' : 'overruled';
  el.hidden = false;
  el.classList.remove('ruling-anim');
  void el.offsetWidth;
  el.classList.add('ruling-anim');
  setTimeout(() => { el.hidden = true; }, 2400);
}
