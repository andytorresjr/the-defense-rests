// Courtroom controller: drives examinations on the court screen, wiring the
// engine (which owns all state changes) to the dialogue player, objection
// minigame, evidence panel, meters, and portraits.
import { applyAction } from '../engine/state.js';
import { resolveObjection } from '../engine/objections.js';
import { maybeAdmonish } from '../engine/judge.js';
import { resolveScript, landBeatFacts, availableQuestions, askQuestion } from '../engine/examination.js';
import { attemptAdmit, foundationHint } from '../engine/evidence.js';
import { meanBeliefs } from '../engine/jury.js';
import { ScriptPlayer } from './dialogue.js';
import { showSlam, pickGround, rulingBanner } from './objectionUI.js';
import { openCourtRecord } from './evidencePanel.js';
import { renderMeters, renderJuryStrip } from './meters.js';
import { mountPortrait, setExpression, expressionFor, FIXED_CHARACTERS } from './portraits.js';
import { on } from '../util/events.js';

export class Courtroom {
  constructor(state, caseData, settings, rng) {
    this.state = state;
    this.caseData = caseData;
    this.settings = settings;
    this.rng = rng;
    this.witnessData = null;
    this._lastKilling = null;

    this.els = {
      screen: document.getElementById('screen-court'),
      phaseLabel: document.getElementById('phase-label'),
      speaker: document.getElementById('speaker'),
      dtext: document.getElementById('dtext'),
      objectBtn: document.getElementById('objectBtn'),
      continueBtn: document.getElementById('continueBtn'),
      choices: document.getElementById('choices'),
      recordBtn: document.getElementById('recordBtn'),
      judge: document.getElementById('judge-portrait'),
      witness: document.getElementById('witness-portrait'),
      witnessPlate: document.getElementById('witness-plate'),
      prosecutor: document.getElementById('prosecutor-portrait'),
      defendant: document.getElementById('defendant-portrait'),
      stand: document.getElementById('stand'),
      toast: document.getElementById('cue-toast'),
    };

    this.player = new ScriptPlayer(
      { speakerEl: this.els.speaker, textEl: this.els.dtext, continueBtn: this.els.continueBtn },
      settings,
    );

    mountPortrait(this.els.judge, FIXED_CHARACTERS.judge.spec);
    mountPortrait(this.els.prosecutor, FIXED_CHARACTERS.prosecutor.spec);
    mountPortrait(this.els.defendant, caseData.defendant?.portrait ?? FIXED_CHARACTERS.defendant.spec);
    document.getElementById('case-title').textContent = caseData.title;
    const defPlate = document.querySelector('#def-table .plate');
    if (defPlate && caseData.defendant) defPlate.textContent = caseData.defendant.name.toUpperCase();

    this.els.objectBtn.addEventListener('click', () => this.player.requestObjection());
    this.els.recordBtn.addEventListener('click', async () => {
      if (this._recordOpen) return;
      this._recordOpen = true;
      this.player.pause();
      await openCourtRecord(this.state, this.caseData, {});
      this.player.resume();
      this._recordOpen = false;
    });

    on('state', () => this.refresh());
  }

  attachState(state) { this.state = state; this._lastKilling = null; }

  show() { this.els.screen.classList.add('active'); this.refresh(); }
  hide() { this.els.screen.classList.remove('active'); }

  setPhaseLabel(text) { this.els.phaseLabel.textContent = text; }

  refresh() {
    renderMeters(this.state, this.witnessData);
    renderJuryStrip(this.state);
    if (this.witnessData) {
      const wst = this.state.witnesses[this.witnessData.id];
      setExpression(this.els.witness, expressionFor(this.witnessData, wst));
    }
    // Jury-swing feedback: surfaced as a quiet narrator toast.
    if (this.state.jury.length) {
      const means = meanBeliefs(this.state);
      let act = 0;
      for (const [iss, w] of Object.entries(this.caseData.verdictModel.act)) act += (means[iss] ?? 0.5) * w;
      if (this._lastKilling != null && Math.abs(act - this._lastKilling) > 0.018) {
        this.toast(act > this._lastKilling
          ? 'The jury leans toward the State.'
          : 'Doubt spreads through the jury box.');
      }
      this._lastKilling = act;
    }
  }

  toast(text) {
    const el = this.els.toast;
    el.textContent = text;
    el.hidden = false;
    el.classList.remove('toast-anim');
    void el.offsetWidth;
    el.classList.add('toast-anim');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { el.hidden = true; }, 2600);
  }

  setWitness(witnessData) {
    this.witnessData = witnessData;
    if (witnessData) {
      mountPortrait(this.els.witness, witnessData.portrait);
      this.els.witnessPlate.textContent = `${witnessData.name} — ${witnessData.role}`;
      this.els.stand.classList.add('occupied');
    } else {
      this.els.witness.innerHTML = '';
      this.els.witnessPlate.textContent = '';
      this.els.stand.classList.remove('occupied');
    }
    this.refresh();
  }

  nameFor(beat) {
    switch (beat.speaker) {
      case 'prosecutor': return { name: FIXED_CHARACTERS.prosecutor.name, side: 'pros' };
      case 'witness': return { name: this.witnessData?.name ?? 'Witness', side: 'wit' };
      case 'judge': return { name: FIXED_CHARACTERS.judge.name, side: 'judge' };
      case 'player': return { name: 'You', side: 'def' };
      case 'narrator': return { name: '', side: 'narrator' };
      default: return { name: beat.speaker, side: '' };
    }
  }

  // Simple sequential beat playback (player-exam results, flavor lines).
  async playBeats(beats) {
    for (const beat of beats) {
      if (beat.kind === 'objection' && beat.speaker === 'prosecutor') {
        await showSlam('OBJECTION!', 'prosecutor');
      }
      await this.player.playBeat(beat, b => this.nameFor(b));
    }
  }

  async narrate(text) {
    await this.player.playBeat({ speaker: 'narrator', kind: 'cue', text }, b => this.nameFor(b));
  }

  // ---- scripted examination: the objection minigame ----
  async runScriptedExam(witnessData, beats) {
    if (!beats.length) return;
    this.els.objectBtn.hidden = false;
    this.els.choices.innerHTML = '';
    const state = this.state;

    await this.player.runScripted(beats, {
      nameFor: b => this.nameFor(b),
      onAnswerLand: (beat, mod) => landBeatFacts(state, beat, mod, witnessData.id),
      tryObjection: async (spec, timing) => {
        const ground = await pickGround();
        if (!ground) return null;
        await showSlam('OBJECTION!', 'player');
        const res = resolveObjection(state, spec, ground, timing);
        rulingBanner(res.sustained, res.text);
        const admonish = maybeAdmonish(state);
        if (admonish) await this.playBeats([{ speaker: 'judge', kind: 'ruling', text: admonish }]);
        return res;
      },
    });
    this.els.objectBtn.hidden = true;
  }

  // ---- the player's own examination: question tree + evidence ----
  async runPlayerExam(witnessData, tree, { modeLabel }) {
    const state = this.state;
    this.els.objectBtn.hidden = true;
    await this.narrate(modeLabel);

    for (;;) {
      const avail = availableQuestions(state, witnessData, tree);
      const choice = await this.presentChoices(avail, witnessData);
      if (choice.type === 'done') break;

      if (choice.type === 'present') {
        const res = attemptAdmit(state, this.caseData, choice.evId, witnessData.id);
        if (res.admitted) {
          await this.playBeats([
            { speaker: 'player', kind: 'q', text: `Your Honor, the defense moves to admit the ${res.def.name}.` },
            { speaker: 'judge', kind: 'ruling', text: `It will be received as ${res.exhibitNo}.` },
          ]);
        } else {
          await showSlam('OBJECTION!', 'prosecutor');
          await this.playBeats([
            { speaker: 'prosecutor', kind: 'objection', text: 'Objection — foundation.' },
            { speaker: 'judge', kind: 'ruling', text: 'Sustained.' },
          ]);
          this.toast(foundationHint(res.reason, res.def));
        }
        continue;
      }

      // A question.
      const result = askQuestion(state, this.caseData, witnessData, tree, choice.nodeId, this.rng);
      await this.playBeats(result.beats);
    }
    this.els.choices.innerHTML = '';
  }

  presentChoices(avail, witnessData) {
    const el = this.els.choices;
    return new Promise(resolve => {
      const styleChip = { soft: 'Ask', probe: 'Ask', press: 'Press', confront: 'Confront' };
      el.innerHTML = `
        ${avail.map(a => `
          <button class="choice ${a.enabled ? '' : 'locked'} style-${a.node.style}" data-id="${a.id}" ${a.enabled ? '' : 'disabled'}
            title="${a.enabled ? '' : 'Locked — you need something on the record or in evidence first.'}">
            <span class="chip">${styleChip[a.node.style] ?? 'Ask'}</span>
            <span>${a.enabled ? a.node.text : (a.node.teaser || a.node.text)}</span>
          </button>`).join('')}
        <button class="choice util" data-act="present"><span class="chip">Exhibit</span><span>Present evidence to the witness…</span></button>
        <button class="choice util" data-act="done"><span class="chip">End</span><span>No further questions, Your Honor.</span></button>
      `;
      el.querySelectorAll('button.choice:not(.locked)').forEach(b => b.addEventListener('click', async () => {
        if (b.dataset.act === 'done') { el.innerHTML = ''; resolve({ type: 'done' }); return; }
        if (b.dataset.act === 'present') {
          const evId = await openCourtRecord(this.state, this.caseData, { presentTo: witnessData.id });
          if (evId) { el.innerHTML = ''; resolve({ type: 'present', evId }); }
          return; // panel closed without presenting: keep choices up
        }
        el.innerHTML = '';
        resolve({ type: 'ask', nodeId: b.dataset.id });
      }));
    });
  }

  // ---- exhibit admission decisions (prosecution moves to admit) ----
  async runAdmission(items) {
    const state = this.state;
    for (const evId of items) {
      if (state.evidence[evId].admitted || state.evidence[evId].excluded) continue;
      const def = this.caseData.evidence[evId];
      await this.playBeats([
        { speaker: 'prosecutor', kind: 'q', text: `Your Honor, the People move to admit the ${def.name} into evidence.` },
        { speaker: 'judge', kind: 'ruling', text: 'Any objection from the defense?' },
      ]);

      const decision = await new Promise(resolve => {
        this.els.choices.innerHTML = `
          <button class="choice util" data-act="none"><span class="chip">Waive</span><span>No objection, Your Honor.</span></button>
          <button class="choice util danger" data-act="object"><span class="chip">Object</span><span>Objection…</span></button>`;
        this.els.choices.querySelectorAll('button').forEach(b =>
          b.addEventListener('click', () => { this.els.choices.innerHTML = ''; resolve(b.dataset.act); }));
      });

      if (decision === 'object') {
        const ground = await pickGround();
        if (ground) {
          await showSlam('OBJECTION!', 'player');
          const res = resolveObjection(state, def.admissionChallenge ?? null, ground, 'timely');
          rulingBanner(res.sustained, res.text);
          const admonish = maybeAdmonish(state);
          if (admonish) await this.playBeats([{ speaker: 'judge', kind: 'ruling', text: admonish }]);
          if (res.sustained) {
            applyAction(state, { type: 'EXCLUDE_EVIDENCE', id: evId });
            await this.playBeats([{ speaker: 'judge', kind: 'ruling', text: `The ${def.name} is excluded. The jury will give it no consideration.` }]);
            continue;
          }
        }
      }
      applyAction(state, { type: 'ADMIT_EVIDENCE', id: evId, via: def.foundationWitnesses[0] });
      await this.playBeats([{ speaker: 'judge', kind: 'ruling', text: `The ${def.name} is admitted as ${state.evidence[evId].exhibitNo}.` }]);
    }
  }

  // ---- full witness flow ----
  async runWitness(witnessData) {
    const state = this.state;
    applyAction(state, { type: 'CALL_WITNESS', id: witnessData.id, examMode: 'direct' });
    this.setWitness(witnessData);
    await this.narrate(witnessData.intro);

    if (witnessData.side === 'prosecution') {
      await this.narrate('Direct examination by the People. Watch for improper questions — and pick your moments.');
      await this.runScriptedExam(witnessData, resolveScript(state, witnessData.scriptedDirect));
      applyAction(state, { type: 'SET_EXAM_MODE', examMode: 'cross' });
      await this.runPlayerExam(witnessData, witnessData.playerCross, { modeLabel: 'Your witness, counsel. Cross-examination.' });
      const redirect = resolveScript(state, witnessData.scriptedRedirect);
      if (redirect.length) {
        await this.narrate('Redirect by the People.');
        await this.runScriptedExam(witnessData, redirect);
      }
    } else {
      await this.runPlayerExam(witnessData, witnessData.playerDirect, { modeLabel: 'Your witness. Direct examination — careful: you may not lead.' });
      applyAction(state, { type: 'SET_EXAM_MODE', examMode: 'cross' });
      await this.narrate('Cross-examination by the People. You may object to her questions.');
      await this.runScriptedExam(witnessData, resolveScript(state, witnessData.scriptedCross));

      // The option to redirect: rehabilitate your witness after the cross.
      if (witnessData.playerRedirect
        && availableQuestions(state, witnessData, witnessData.playerRedirect).some(a => a.enabled)) {
        await this.playBeats([{ speaker: 'judge', kind: 'ruling', text: 'Any redirect, counsel?' }]);
        const wants = await new Promise(resolve => {
          this.els.choices.innerHTML = `
            <button class="choice util" data-act="yes"><span class="chip">Redirect</span><span>Briefly, Your Honor.</span></button>
            <button class="choice util" data-act="no"><span class="chip">Waive</span><span>Nothing further, Your Honor.</span></button>`;
          this.els.choices.querySelectorAll('button').forEach(b =>
            b.addEventListener('click', () => { this.els.choices.innerHTML = ''; resolve(b.dataset.act === 'yes'); }));
        });
        if (wants) {
          applyAction(state, { type: 'SET_EXAM_MODE', examMode: 'redirect' });
          await this.runPlayerExam(witnessData, witnessData.playerRedirect,
            { modeLabel: 'Redirect examination. Repair the damage — briefly, and only where the cross drew blood.' });
        }
      }
    }

    applyAction(state, { type: 'EXCUSE_WITNESS', id: witnessData.id });
    await this.narrate(`${witnessData.name} is excused.`);
    this.setWitness(null);
  }
}
