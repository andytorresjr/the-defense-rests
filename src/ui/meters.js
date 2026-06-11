// Status meters: judge patience, your standing with the bench, witness
// composure — plus the jury strip, a subtle per-juror read (cool = with the
// defense, warm = with the State).
import { elementBeliefs } from '../engine/jury.js';
import { patienceLabel } from '../engine/judge.js';
import { getActiveCase } from '../engine/state.js';

export function renderMeters(state, witnessData) {
  const el = document.getElementById('meters');
  const w = witnessData ? state.witnesses[witnessData.id] : null;
  el.innerHTML = `
    ${bar('Judge', state.judge.patience, patienceLabel(state))}
    ${bar('Standing', state.player.credibility, '')}
    ${w ? bar('Witness', w.composure, composureLabel(w.composure)) : '<div class="meter"></div>'}
  `;
}

function bar(label, value, note) {
  const hue = Math.round((value / 100) * 110); // red -> green
  return `<div class="meter">
    <span class="meter-label">${label}</span>
    <span class="meter-track"><span class="meter-fill" style="width:${value}%;background:hsl(${hue} 60% 45%)"></span></span>
    <span class="meter-note">${note}</span>
  </div>`;
}

function composureLabel(c) {
  if (c > 60) return 'Composed';
  if (c > 35) return 'Rattled';
  return 'Cracking';
}

export function renderJuryStrip(state) {
  const el = document.getElementById('jury-strip');
  if (!state.jury.length) { el.innerHTML = ''; return; }
  const caseData = getActiveCase();
  el.innerHTML = state.jury.map(j => {
    const k = elementBeliefs(j, caseData).act;
    // 210 (cool blue, defense) -> 8 (hot red, prosecution)
    const hue = Math.round(210 - k * 200);
    return `<span class="juror-dot" title="Juror: ${j.name}" style="background:hsl(${hue} 45% 52%)"></span>`;
  }).join('');
}
