// Balance simulator: auto-plays each case headlessly under four strategy
// profiles and prints the verdict distribution. Run: node tools/simulate.js
// Expected shape per case: perfect -> NG, hedge -> mostly LESSER,
// passive/sabotage -> TOP charge.
import { CASES } from '../src/data/cases/index.js';
import { createGameState, applyAction } from '../src/engine/state.js';
import { resolveObjection } from '../src/engine/objections.js';
import { resolveScript, landBeatFacts, availableQuestions, askQuestion } from '../src/engine/examination.js';
import { attemptAdmit } from '../src/engine/evidence.js';
import { seatJury } from '../src/engine/voirdire.js';
import { applyOpening, applyClosingThemes, applyProsecutionClosing, applyNoTestifyInference } from '../src/engine/closings.js';
import { updateFocus } from '../src/engine/prosecutor.js';
import { maybeAdmonish } from '../src/engine/judge.js';
import { deliberate, meanBeliefs, elementBeliefs } from '../src/engine/jury.js';
import { currentStep, advance } from '../src/engine/phases.js';
import { makeRng } from '../src/util/rng.js';

// ---------------- objection policies ----------------
const correctObjection = spec => (!spec || spec.selfHarm) ? null : { ground: spec.ground, timing: 'timely' };
const hearsayOnly = spec => (spec && !spec.selfHarm && spec.ground === 'hearsay') ? { ground: 'hearsay', timing: 'timely' } : null;
const groundSet = (...grounds) => spec =>
  (spec && !spec.selfHarm && grounds.includes(spec.ground)) ? { ground: spec.ground, timing: 'timely' } : null;
const never = () => null;
const alwaysWrong = () => ({ ground: 'relevance', timing: 'timely' });

// ---------------- strategy profiles, per case ----------------

const PROFILE_SETS = {
  'state-v-cross': {
    perfect: {
      strikes: ['j01', 'j06', 'j15'],
      opening: 'open_wrongman',
      objection: correctObjection,
      admission(evId) { return evId === 'ev_knife' ? 'foundation' : null; },
      crossPlans: {
        alvarez: ['x_a_knife', 'x_a_prints', 'x_a_forensics', 'x_a_clock', 'x_a_invest', 'x_a_canvass'],
        greene: ['x_g_distance', 'x_g_drinks', 'x_g_evening', 'x_g_911_hint', 'PRESENT:ev_911', 'x_g_911', 'x_g_crack', 'x_g_jacket', 'PRESENT:ev_array', 'x_g_array'],
        soto: ['x_s_knife', 'x_s_time'],
        okafor: ['x_o_regret', 'x_o_webb', 'x_o_press1', 'x_o_press2', 'x_o_outback', 'x_o_lenny', 'x_o_lenny2', 'x_o_camera', 'PRESENT:ev_maintlog'],
        cruz: ['d_c_who', 'd_c_open', 'd_c_walk', 'd_c_demeanor'],
        daniel: [],
      },
      redirectPlans: { cruz: ['r_c_news'] },
      callDefendant: false,
      closings: ['cl_clock', 'cl_face', 'cl_lenny'],
    },
    hedge: {
      strikes: ['j15'],
      opening: 'open_burden',
      objection: hearsayOnly,
      admission() { return null; },
      crossPlans: {
        alvarez: ['x_a_forensics'],
        greene: [],
        soto: ['x_s_angle', 'x_s_knuckles', 'x_s_knife', 'x_s_time'],
        okafor: ['x_o_regret', 'x_o_webb', 'x_o_press1', 'x_o_press2', 'x_o_outback'],
        cruz: ['d_c_who', 'd_c_open', 'd_c_demeanor'],
        daniel: [],
      },
      redirectPlans: { cruz: ['r_c_news'] },
      callDefendant: false,
      closings: ['cl_invitation', 'cl_struggle', 'cl_burden'],
    },
    passive: {
      strikes: [], opening: 'open_burden', objection: never, admission() { return null; },
      crossPlans: { alvarez: [], greene: [], soto: [], okafor: [], cruz: ['d_c_who', 'd_c_open'], daniel: [] },
      callDefendant: false, closings: ['cl_burden'],
    },
    sabotage: {
      strikes: [], opening: 'open_wrongman', objection: alwaysWrong, cleanBeatObjectionEvery: 4,
      admission() { return 'relevance'; },
      crossPlans: {
        alvarez: ['x_a_tunnel'], greene: ['x_g_pressure'], soto: [], okafor: [],
        cruz: ['d_c_leading', 'd_c_open'], daniel: ['d_d_account'],
      },
      redirectPlans: { cruz: ['r_c_sure'], daniel: ['r_d_prior'] },
      callDefendant: true, closings: ['cl_character', 'cl_burden'],
    },
  },

  'state-v-vance': {
    perfect: {
      strikes: ['j01', 'j06', 'j15'],
      opening: 'open2_science',
      objection: correctObjection,
      admission(evId) { return evId === 'ev2_gascan' ? 'relevance' : evId === 'ev2_memo' ? 'hearsay' : null; },
      crossPlans: {
        hubbard: ['x2_h_nfpa', 'x2_h_lab', 'x2_h_can', 'x2_h_cert', 'x2_h_alarm'],
        carney: ['x2_c_conditions', 'x2_c_coat', 'x2_c_when', 'x2_c_leaving'],
        pratt: ['x2_p_meds', 'x2_p_creaks', 'x2_p_landlord'],
        ostrowski: ['x2_o_file', 'PRESENT:ev2_lender', 'x2_o_lender', 'x2_o_claim', 'x2_o_conduct', 'x2_o_memo'],
        soltis: ['d2_s_who', 'd2_s_breaker', 'PRESENT:ev2_workorder', 'd2_s_wo', 'd2_s_battery', 'd2_s_alarm', 'PRESENT:ev2_panel', 'd2_s_panel'],
        vance: [],
      },
      callDefendant: false,
      closings: ['cl2_panel', 'cl2_science', 'cl2_lender'],
    },
    hedge: {
      // Concede the fire, gut the fraud: a pure mens-rea strategy —
      // including putting Vance on to tell the jury who the insurance pays.
      strikes: ['j15'],
      opening: 'open2_motive',
      objection: groundSet('hearsay', 'argumentative', 'speculation'),
      admission() { return null; },
      crossPlans: {
        hubbard: [],
        carney: [],
        pratt: ['x2_p_landlord'],
        ostrowski: ['x2_o_file', 'PRESENT:ev2_lender', 'x2_o_lender', 'x2_o_claim', 'x2_o_conduct', 'x2_o_memo'],
        soltis: ['d2_s_who', 'd2_s_breaker', 'd2_s_battery'],
        vance: ['d2_v_account', 'd2_v_money'],
      },
      redirectPlans: { vance: ['r2_v_statement', 'r2_v_insists'] },
      callDefendant: true,
      closings: ['cl2_lender', 'cl2_nobenefit', 'cl2_burden'],
    },
    passive: {
      strikes: [], opening: 'open2_burden', objection: never, admission() { return null; },
      crossPlans: { hubbard: [], carney: [], pratt: [], ostrowski: [], soltis: ['d2_s_who', 'd2_s_breaker'], vance: [] },
      callDefendant: false, closings: ['cl2_burden'],
    },
    sabotage: {
      strikes: [], opening: 'open2_science', objection: alwaysWrong, cleanBeatObjectionEvery: 4,
      admission() { return 'foundation'; },
      crossPlans: {
        hubbard: ['x2_h_tunnel'], carney: ['x2_c_drinking'],
        pratt: ['x2_p_press', 'x2_p_press2'],
        ostrowski: [], soltis: ['d2_s_leading', 'd2_s_breaker'], vance: ['d2_v_account'],
      },
      redirectPlans: { vance: ['r2_v_statement'] },
      callDefendant: true, closings: ['cl2_goodwoman', 'cl2_burden'],
    },
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
        if (!res.late && beats[i + 1]?.speaker === 'witness') { i++; continue; }
        if (res.late && beats[i + 1]?.speaker === 'witness') {
          landBeatFacts(state, beats[i + 1], 0.4, witnessId); i++; continue;
        }
      }
    }
    landBeatFacts(state, b, 1, witnessId);
  }
}

function runPlayerExam(state, caseData, witnessData, tree, plan, rng, counters) {
  for (const item of plan) {
    if (item.startsWith('PRESENT:')) {
      const evId = item.slice(8);
      const res = attemptAdmit(state, caseData, evId, witnessData.id);
      counters.presented++;
      if (!res.admitted) counters.presentFailed.push(`${witnessData.id}:${evId}:${res.reason}`);
      continue;
    }
    const avail = availableQuestions(state, witnessData, tree);
    const entry = avail.find(a => a.id === item);
    if (!entry || !entry.enabled) { counters.skippedQuestions.push(`${witnessData.id}:${item}`); continue; }
    askQuestion(state, caseData, witnessData, tree, item, rng);
    counters.questions++;
  }
}

function runWitness(state, caseData, w, profile, rng, counters) {
  applyAction(state, { type: 'CALL_WITNESS', id: w.id, examMode: 'direct' });
  if (w.side === 'prosecution') {
    runScriptedBeats(state, resolveScript(state, w.scriptedDirect), w.id, profile, rng, counters);
    applyAction(state, { type: 'SET_EXAM_MODE', examMode: 'cross' });
    runPlayerExam(state, caseData, w, w.playerCross, profile.crossPlans[w.id] || [], rng, counters);
    runScriptedBeats(state, resolveScript(state, w.scriptedRedirect), w.id, profile, rng, counters);
  } else {
    runPlayerExam(state, caseData, w, w.playerDirect, profile.crossPlans[w.id] || [], rng, counters);
    applyAction(state, { type: 'SET_EXAM_MODE', examMode: 'cross' });
    runScriptedBeats(state, resolveScript(state, w.scriptedCross), w.id, profile, rng, counters);
    const redirectPlan = profile.redirectPlans?.[w.id];
    if (redirectPlan?.length && w.playerRedirect) {
      applyAction(state, { type: 'SET_EXAM_MODE', examMode: 'redirect' });
      runPlayerExam(state, caseData, w, w.playerRedirect, redirectPlan, rng, counters);
    }
  }
  applyAction(state, { type: 'EXCUSE_WITNESS', id: w.id });
}

export function playTrial(caseData, profileName, seed) {
  const profile = PROFILE_SETS[caseData.id][profileName];
  const rng = makeRng(seed);
  const state = createGameState(caseData);
  const counters = { objections: 0, sustained: 0, questions: 0, presented: 0, presentFailed: [], skippedQuestions: [] };

  let guard = 0;
  for (;;) {
    if (++guard > 100) throw new Error('trial plan did not terminate');
    const step = currentStep(state, caseData);
    if (!step) break;
    switch (step.type) {
      case 'voirDire':
        seatJury(state, caseData, profile.strikes);
        break;
      case 'openings':
        applyOpening(state, caseData, profile.opening);
        break;
      case 'phaseBanner':
        applyAction(state, { type: 'SET_PHASE', phase: step.phase });
        updateFocus(state, caseData);
        break;
      case 'witness':
        runWitness(state, caseData, caseData.witnesses.find(w => w.id === step.id), profile, rng, counters);
        break;
      case 'admission':
        for (const evId of step.items) {
          if (state.evidence[evId].admitted || state.evidence[evId].excluded) continue;
          const def = caseData.evidence[evId];
          const ground = profile.admission(evId, def.admissionChallenge);
          if (ground) {
            const res = resolveObjection(state, def.admissionChallenge ?? null, ground, 'timely');
            maybeAdmonish(state);
            if (res.sustained) { applyAction(state, { type: 'EXCLUDE_EVIDENCE', id: evId }); continue; }
          }
          applyAction(state, { type: 'ADMIT_EVIDENCE', id: evId, via: def.foundationWitnesses[0] });
        }
        break;
      case 'event':
        for (const eff of caseData.events[step.id].effects) applyAction(state, eff);
        break;
      case 'decision': {
        const d = caseData.decisions[step.id];
        const choice = profile.callDefendant ? d.options[0] : d.options[1];
        applyAction(state, { type: 'FLAG', key: choice.flag.key, value: choice.flag.value });
        break;
      }
      case 'noTestifyInstruction':
        applyNoTestifyInference(state);
        break;
      case 'closings':
        applyClosingThemes(state, caseData, profile.closings);
        applyProsecutionClosing(state, caseData);
        break;
      case 'deliberation': {
        const result = deliberate(state, caseData, rng);
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
  for (const caseData of CASES) {
    console.log(`=== ${caseData.title} ===`);
    for (const name of Object.keys(PROFILE_SETS[caseData.id])) {
      const dist = { NG: 0, LESSER: 0, TOP: 0, HUNG: 0 };
      let sample = null;
      for (let seed = 1; seed <= N; seed++) {
        const { result, state, counters } = playTrial(caseData, name, seed);
        dist[result.verdict]++;
        if (seed === 1) sample = { state, counters };
      }
      const means = meanBeliefs(sample.state);
      const els = sample.state.jury.map(j => elementBeliefs(j, caseData));
      const ma = els.reduce((s, e) => s + e.act, 0) / els.length;
      const mm = els.reduce((s, e) => s + e.mensRea, 0) / els.length;
      const issueStr = caseData.issues.map(i => `${i.slice(0, 4)}:${(means[i] ?? 0.5).toFixed(2)}`).join(' ');
      console.log(`${name.padEnd(9)} NG:${String(dist.NG).padStart(4)}  LESSER:${String(dist.LESSER).padStart(4)}  TOP:${String(dist.TOP).padStart(4)}  HUNG:${String(dist.HUNG).padStart(4)}`);
      console.log(`  ${issueStr} | act:${ma.toFixed(2)} mensRea:${mm.toFixed(2)} | presentFailed:[${sample.counters.presentFailed}] skipped:[${sample.counters.skippedQuestions}]`);
    }
    console.log('');
  }
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/simulate.js')) main();
