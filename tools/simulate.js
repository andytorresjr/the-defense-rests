// Balance simulator: auto-plays the full trial headlessly under four strategy
// profiles and prints the verdict distribution. Run: node tools/simulate.js
// Expected shape: perfect -> NG, hedge -> mostly MAN, passive -> M2/HUNG, sabotage -> M2.
import { CASE } from '../src/data/cases/state-v-cross/case.js';
import { createGameState, applyAction } from '../src/engine/state.js';
import { resolveObjection } from '../src/engine/objections.js';
import { resolveScript, landBeatFacts, availableQuestions, askQuestion } from '../src/engine/examination.js';
import { attemptAdmit } from '../src/engine/evidence.js';
import { seatJury } from '../src/engine/voirdire.js';
import { applyOpening, availableThemes, applyClosingThemes, applyProsecutionClosing, applyNoTestifyInference } from '../src/engine/closings.js';
import { updateFocus } from '../src/engine/prosecutor.js';
import { maybeAdmonish } from '../src/engine/judge.js';
import { deliberate, meanBeliefs, elementBeliefs } from '../src/engine/jury.js';
import { currentStep, advance } from '../src/engine/phases.js';
import { makeRng } from '../src/util/rng.js';

// ---------------- strategy profiles ----------------

const PROFILES = {
  perfect: {
    strikes: ['j01', 'j06', 'j15'],
    opening: 'open_wrongman',
    // Objects with the correct ground, timely — but never strikes testimony
    // that actually helps the defense (selfHarm beats).
    objection(spec) {
      if (!spec || spec.selfHarm) return null;
      return { ground: spec.ground, timing: 'timely' };
    },
    admission(evId, spec) { return evId === 'ev_knife' ? 'foundation' : null; },
    crossPlans: {
      alvarez: ['x_a_knife', 'x_a_prints', 'x_a_forensics', 'x_a_clock', 'x_a_invest', 'x_a_canvass'],
      greene: ['x_g_distance', 'x_g_drinks', 'x_g_evening', 'x_g_911_hint', 'PRESENT:ev_911', 'x_g_911', 'x_g_crack', 'x_g_jacket', 'PRESENT:ev_array', 'x_g_array'],
      soto: ['x_s_knife', 'x_s_time'], // pure-acquittal line: skip the struggle facts (they concede presence)
      okafor: ['x_o_regret', 'x_o_webb', 'x_o_press1', 'x_o_press2', 'x_o_outback', 'x_o_lenny', 'x_o_lenny2', 'x_o_camera', 'PRESENT:ev_maintlog'],
      cruz: ['d_c_who', 'd_c_open', 'd_c_walk', 'd_c_demeanor'],
      daniel: [],
    },
    callDefendant: false,
    closings: ['cl_clock', 'cl_face', 'cl_lenny'],
  },

  hedge: {
    strikes: ['j15'],
    opening: 'open_burden',
    // Catches only the obvious hearsay; misses opinion/leading/speculation.
    objection(spec) {
      if (!spec || spec.selfHarm) return null;
      return spec.ground === 'hearsay' ? { ground: 'hearsay', timing: 'timely' } : null;
    },
    admission() { return null; },
    crossPlans: {
      alvarez: ['x_a_forensics'],
      greene: [],
      soto: ['x_s_angle', 'x_s_knuckles', 'x_s_knife', 'x_s_time'],
      okafor: ['x_o_regret', 'x_o_webb', 'x_o_press1', 'x_o_press2', 'x_o_outback'],
      cruz: ['d_c_who', 'd_c_open', 'd_c_demeanor'],
      daniel: [],
    },
    callDefendant: false,
    closings: ['cl_invitation', 'cl_struggle', 'cl_burden'],
  },

  passive: {
    strikes: [],
    opening: 'open_burden',
    objection() { return null; },
    admission() { return null; },
    crossPlans: { alvarez: [], greene: [], soto: [], okafor: [], cruz: ['d_c_who', 'd_c_open'], daniel: [] },
    callDefendant: false,
    closings: ['cl_burden'],
  },

  sabotage: {
    strikes: [],
    opening: 'open_wrongman',
    // Objects loudly and wrongly at every opportunity.
    objection(spec) { return { ground: 'relevance', timing: 'timely' }; },
    cleanBeatObjectionEvery: 4,
    admission() { return 'relevance'; },
    crossPlans: {
      alvarez: ['x_a_tunnel'],
      greene: ['x_g_pressure'],
      soto: [],
      okafor: [],
      cruz: ['d_c_leading', 'd_c_open'],
      daniel: ['d_d_account'],
    },
    callDefendant: true,
    closings: ['cl_character', 'cl_burden'],
  },
};

// ---------------- headless trial runner ----------------

function runScriptedBeats(state, beats, witnessId, profile, rng, counters) {
  let cleanCount = 0;
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    let decision = null;
    if (b.objection) {
      decision = profile.objection(b.objection);
    } else if (profile.cleanBeatObjectionEvery && b.speaker === 'prosecutor') {
      if (++cleanCount % profile.cleanBeatObjectionEvery === 0) decision = profile.objection(null);
    }

    if (decision) {
      const res = resolveObjection(state, b.objection || null, decision.ground, decision.timing);
      maybeAdmonish(state);
      counters.objections++;
      if (res.sustained) {
        counters.sustained++;
        // Timely sustained objection: the paired answer never happens.
        if (!res.late && beats[i + 1]?.speaker === 'witness') { i++; continue; }
        if (res.late && beats[i + 1]?.speaker === 'witness') {
          landBeatFacts(state, beats[i + 1], 0.4, witnessId); i++; continue;
        }
      }
    }
    landBeatFacts(state, b, 1, witnessId);
  }
}

function runPlayerExam(state, witnessData, tree, plan, rng, counters) {
  for (const item of plan) {
    if (item.startsWith('PRESENT:')) {
      const evId = item.slice(8);
      const res = attemptAdmit(state, CASE, evId, witnessData.id);
      counters.presented++;
      if (!res.admitted) counters.presentFailed.push(`${witnessData.id}:${evId}:${res.reason}`);
      continue;
    }
    const avail = availableQuestions(state, witnessData, tree);
    const entry = avail.find(a => a.id === item);
    if (!entry || !entry.enabled) { counters.skippedQuestions.push(`${witnessData.id}:${item}`); continue; }
    askQuestion(state, CASE, witnessData, tree, item, rng);
    counters.questions++;
  }
}

function runWitness(state, w, profile, rng, counters) {
  applyAction(state, { type: 'CALL_WITNESS', id: w.id, examMode: 'direct' });
  if (w.side === 'prosecution') {
    runScriptedBeats(state, resolveScript(state, w.scriptedDirect), w.id, profile, rng, counters);
    applyAction(state, { type: 'SET_EXAM_MODE', examMode: 'cross' });
    runPlayerExam(state, w, w.playerCross, profile.crossPlans[w.id] || [], rng, counters);
    runScriptedBeats(state, resolveScript(state, w.scriptedRedirect), w.id, profile, rng, counters);
  } else {
    runPlayerExam(state, w, w.playerDirect, profile.crossPlans[w.id] || [], rng, counters);
    applyAction(state, { type: 'SET_EXAM_MODE', examMode: 'cross' });
    runScriptedBeats(state, resolveScript(state, w.scriptedCross), w.id, profile, rng, counters);
  }
  applyAction(state, { type: 'EXCUSE_WITNESS', id: w.id });
}

export function playTrial(profileName, seed) {
  const profile = PROFILES[profileName];
  const rng = makeRng(seed);
  const state = createGameState(CASE);
  const counters = { objections: 0, sustained: 0, questions: 0, presented: 0, presentFailed: [], skippedQuestions: [] };

  let guard = 0;
  for (;;) {
    if (++guard > 100) throw new Error('trial plan did not terminate');
    const step = currentStep(state, CASE);
    if (!step) break;
    switch (step.type) {
      case 'voirDire':
        seatJury(state, CASE, profile.strikes);
        break;
      case 'openings':
        applyOpening(state, CASE, profile.opening);
        break;
      case 'phaseBanner':
        applyAction(state, { type: 'SET_PHASE', phase: step.phase });
        updateFocus(state);
        break;
      case 'witness':
        runWitness(state, CASE.witnesses.find(w => w.id === step.id), profile, rng, counters);
        break;
      case 'admission':
        for (const evId of step.items) {
          if (state.evidence[evId].admitted || state.evidence[evId].excluded) continue;
          const def = CASE.evidence[evId];
          const ground = profile.admission(evId, def.admissionChallenge);
          if (ground) {
            const res = resolveObjection(state, def.admissionChallenge, ground, 'timely');
            maybeAdmonish(state);
            if (res.sustained) { applyAction(state, { type: 'EXCLUDE_EVIDENCE', id: evId }); continue; }
          }
          applyAction(state, { type: 'ADMIT_EVIDENCE', id: evId, via: def.foundationWitnesses[0] });
        }
        break;
      case 'event':
        for (const eff of CASE.events[step.id].effects) applyAction(state, eff);
        break;
      case 'decision': {
        const d = CASE.decisions[step.id];
        const choice = profile.callDefendant ? d.options[0] : d.options[1];
        applyAction(state, { type: 'FLAG', key: choice.flag.key, value: choice.flag.value });
        break;
      }
      case 'noTestifyInstruction':
        applyNoTestifyInference(state);
        break;
      case 'closings':
        applyClosingThemes(state, CASE, profile.closings);
        applyProsecutionClosing(state, CASE);
        break;
      case 'deliberation': {
        const result = deliberate(state, rng);
        return { result, state, counters };
      }
      default:
        break;
    }
    advance(state);
  }
  throw new Error('reached end of plan without deliberation');
}

// ---------------- report ----------------

function main() {
  const N = 200;
  console.log(`The Defense Rests — balance simulation (${N} seeds per profile)\n`);
  for (const name of Object.keys(PROFILES)) {
    const dist = { NG: 0, MAN: 0, M2: 0, HUNG: 0 };
    let sample = null;
    for (let seed = 1; seed <= N; seed++) {
      const { result, state, counters } = playTrial(name, seed);
      dist[result.verdict]++;
      if (seed === 1) sample = { state, counters, result };
    }
    const means = meanBeliefs(sample.state);
    const els = sample.state.jury.map(j => elementBeliefs(j));
    const mk = els.reduce((s, e) => s + e.killing, 0) / els.length;
    const mm = els.reduce((s, e) => s + e.malice, 0) / els.length;
    console.log(`${name.padEnd(9)} NG:${String(dist.NG).padStart(4)}  MAN:${String(dist.MAN).padStart(4)}  M2:${String(dist.M2).padStart(4)}  HUNG:${String(dist.HUNG).padStart(4)}`);
    console.log(`  beliefs  id:${means.identity.toFixed(2)} tl:${means.timeline.toFixed(2)} in:${means.intent.toFixed(2)} wp:${means.weapon.toFixed(2)} alt:${means.altSuspect.toFixed(2)}  | killing:${mk.toFixed(2)} malice:${mm.toFixed(2)}`);
    console.log(`  play     objections:${sample.counters.objections} sustained:${sample.counters.sustained} questions:${sample.counters.questions} presentFailed:[${sample.counters.presentFailed}] skipped:[${sample.counters.skippedQuestions}]`);
    console.log(`  judge    patience:${sample.state.judge.patience} standing:${sample.state.judge.standing} playerCred:${sample.state.player.credibility}\n`);
  }
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/simulate.js')) main();
