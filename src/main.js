// Boot + the trial loop: case select, then walk the chosen case's trialPlan,
// routing each step to the courtroom or a full-screen scene, autosaving at
// every step boundary.
import { CASES, caseById } from './data/cases/index.js';
import { createGameState, serialize, deserialize, applyAction } from './engine/state.js';
import { currentStep, advance } from './engine/phases.js';
import { updateFocus } from './engine/prosecutor.js';
import { deliberate } from './engine/jury.js';
import { applyNoTestifyInference } from './engine/closings.js';
import { makeRng } from './util/rng.js';
import { Courtroom } from './ui/renderer.js';
import * as screens from './ui/screens.js';
import { initDebug, setDebugState } from './ui/debug.js';

const SAVE_KEY = 'tdr-save-v1';
const SETTINGS_KEY = 'tdr-settings-v1';

const settings = Object.assign(
  { deliberateMode: false, textSpeed: 18 },
  JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'),
);
function saveSettings(patch) {
  Object.assign(settings, patch);
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let CASE = null;
let state = null;
let courtroom = null;
const rng = makeRng(Date.now() % 2147483647);

function autosave() {
  try { localStorage.setItem(SAVE_KEY, serialize(state)); } catch { /* storage full/blocked */ }
}
function clearSave() { localStorage.removeItem(SAVE_KEY); }

function peekSavedCase() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? caseById(JSON.parse(raw).caseId) : null;
  } catch { return null; }
}

async function boot() {
  const savedCase = peekSavedCase();
  const choice = await screens.showTitle(CASES, { savedCase, settings, onSettingsChange: saveSettings });

  if (choice.mode === 'continue' && savedCase) {
    CASE = savedCase;
    state = deserialize(localStorage.getItem(SAVE_KEY), CASE);
  } else {
    CASE = caseById(choice.caseId);
    state = createGameState(CASE);
    autosave();
  }

  courtroom = new Courtroom(state, CASE, settings, rng);
  initDebug(state, CASE);
  setDebugState(state);

  if (choice.mode !== 'continue') await screens.showBriefing(CASE);
  await trialLoop();
}

async function trialLoop() {
  for (;;) {
    const step = currentStep(state, CASE);
    if (!step) break;

    switch (step.type) {
      case 'voirDire':
        applyAction(state, { type: 'SET_PHASE', phase: 'voirDire' });
        await screens.runVoirDire(state, CASE);
        break;

      case 'openings':
        applyAction(state, { type: 'SET_PHASE', phase: 'openings' });
        await screens.runOpenings(state, CASE);
        break;

      case 'phaseBanner': {
        applyAction(state, { type: 'SET_PHASE', phase: step.phase });
        updateFocus(state, CASE);
        const el = document.getElementById('screen-generic');
        el.innerHTML = `<div class="paper banner"><h2>${step.title}</h2><p>${step.sub}</p><button class="big-btn" data-go>Continue</button></div>`;
        el.classList.add('active');
        document.getElementById('screen-court').classList.remove('active');
        await new Promise(res => el.querySelector('[data-go]').addEventListener('click', res));
        el.classList.remove('active'); el.innerHTML = '';
        break;
      }

      case 'witness': {
        courtroom.show();
        courtroom.setPhaseLabel(state.phase === 'defenseCase' ? 'The Defense Case' : 'The People’s Case');
        const w = CASE.witnesses.find(x => x.id === step.id);
        await courtroom.runWitness(w);
        break;
      }

      case 'admission':
        courtroom.show();
        await courtroom.runAdmission(step.items);
        break;

      case 'event':
        courtroom.hide();
        await screens.showEvent(state, CASE.events[step.id]);
        break;

      case 'decision':
        courtroom.hide();
        await screens.runDecision(state, CASE.decisions[step.id]);
        break;

      case 'noTestifyInstruction':
        applyNoTestifyInference(state);
        await screens.showInstruction(CASE.arguments.NO_DEFENDANT_INSTRUCTION);
        break;

      case 'closings':
        courtroom.hide();
        applyAction(state, { type: 'SET_PHASE', phase: 'closings' });
        await screens.runClosings(state, CASE);
        break;

      case 'deliberation': {
        applyAction(state, { type: 'SET_PHASE', phase: 'deliberation' });
        const result = deliberate(state, CASE, rng);
        // Stash a serializable copy so a refresh during the verdict can't
        // re-roll the jury.
        applyAction(state, { type: 'FLAG', key: 'verdictResult', value: resultToPlain(result) });
        await screens.runDeliberation(state, CASE, result);
        break;
      }

      case 'verdict': {
        applyAction(state, { type: 'SET_PHASE', phase: 'verdict' });
        const result = rebuildResult(state);
        await screens.showVerdict(state, CASE, result);
        clearSave();
        location.reload();
        return;
      }

      default:
        break;
    }

    advance(state);
    autosave();
  }
}

function resultToPlain(result) {
  return {
    verdict: result.verdict,
    ballots: result.ballots,
    room: result.room.map(r => ({ jurorId: r.juror.id, stance: r.stance, flipped: r.flipped, act: r.act, mensRea: r.mensRea, dt: r.dt })),
  };
}

function rebuildResult(state) {
  const plain = state.flags.verdictResult;
  return {
    verdict: plain.verdict,
    ballots: plain.ballots,
    room: plain.room.map(p => ({ ...p, juror: state.jury.find(j => j.id === p.jurorId) })),
  };
}

boot();
