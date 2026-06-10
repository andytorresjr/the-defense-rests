// Jury selection: player strikes up to `strikes.player` candidates, the AI
// prosecutor strikes the most defense-leaning of those remaining, and the
// first 12 left in pool order are seated.
import { applyAction } from './state.js';

export function prosecutionStrikes(pool, remainingIds, n) {
  return pool
    .filter(j => remainingIds.includes(j.id))
    .sort((a, b) => b.defenseLean - a.defenseLean)
    .slice(0, n)
    .map(j => j.id);
}

export function seatJury(state, caseData, playerStrikeIds) {
  const pool = caseData.jurorPool;
  let remaining = pool.map(j => j.id).filter(id => !playerStrikeIds.includes(id));
  const aiStrikes = prosecutionStrikes(pool, remaining, caseData.strikes.prosecution);
  remaining = remaining.filter(id => !aiStrikes.includes(id));
  const seated = remaining.slice(0, 12).map(id => pool.find(j => j.id === id));
  applyAction(state, { type: 'SEAT_JURY', jurors: seated });
  applyAction(state, { type: 'LOG', entry: `Jury seated. Defense struck: ${playerStrikeIds.join(', ') || 'none'}. People struck: ${aiStrikes.join(', ')}.` });
  return { seated, aiStrikes };
}
