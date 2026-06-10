// The real-time dialogue engine: typewriter beats on a pausable clock, with
// the objection window tracking. The skill is recognizing the objectionable
// moment while it's happening; picking the ground happens with time frozen.

export class ScriptPlayer {
  constructor({ speakerEl, textEl, continueBtn }, settings) {
    this.speakerEl = speakerEl;
    this.textEl = textEl;
    this.continueBtn = continueBtn;
    this.settings = settings;
    this._abort = null;
    this._paused = false;
    this._pauseWaiters = [];
    this.window = null; // { spec, stage: 'question' | 'answer' }
  }

  // ---- pausable clock primitives ----
  pause() { this._paused = true; }
  resume() {
    this._paused = false;
    for (const w of this._pauseWaiters.splice(0)) w();
  }
  _whileUnpaused() {
    if (!this._paused) return Promise.resolve();
    return new Promise(res => this._pauseWaiters.push(res));
  }

  async _type(text) {
    this.textEl.textContent = '';
    this.textEl.classList.add('typing');
    const speed = this.settings.textSpeed ?? 20;
    const aborted = () => this._abortFlag;
    for (let i = 0; i < text.length; i++) {
      await this._whileUnpaused();
      if (aborted()) break;
      this.textEl.textContent += text[i];
      await sleep(text[i] === ' ' ? speed * 0.6 : speed);
    }
    this.textEl.textContent = text;
    this.textEl.classList.remove('typing');
  }

  async _hold(text) {
    const ms = Math.min(4200, 700 + text.length * 13);
    const stepMs = 50;
    for (let t = 0; t < ms; t += stepMs) {
      await this._whileUnpaused();
      if (this._abortFlag) return;
      await sleep(stepMs);
    }
  }

  async _waitContinue() {
    this.continueBtn.hidden = false;
    await new Promise(res => {
      const fn = () => { this.continueBtn.removeEventListener('click', fn); res(); };
      this.continueBtn.addEventListener('click', fn);
      this._continueResolve = () => { this.continueBtn.removeEventListener('click', fn); res(); };
    });
    this.continueBtn.hidden = true;
  }

  skipCurrentBeat() {
    this._abortFlag = true;
    if (this._continueResolve) { this._continueResolve(); this._continueResolve = null; }
  }

  setSpeaker(name, side) {
    this.speakerEl.textContent = name;
    this.speakerEl.dataset.side = side || '';
  }

  // Render one beat (no objection machinery) — used for player exam results.
  async playBeat(beat, nameFor) {
    this._abortFlag = false;
    const { name, side } = nameFor(beat);
    this.setSpeaker(name, side);
    this.textEl.dataset.kind = beat.kind || '';
    await this._type(beat.text);
    if (this.settings.deliberateMode) await this._waitContinue();
    else await this._hold(beat.text);
  }

  /**
   * Play a scripted examination with the objection minigame.
   * handlers: {
   *   nameFor(beat) -> {name, side},
   *   onAnswerLand(beat, mod),      // commit an answer's facts (mod 0.4 = struck late)
   *   tryObjection: async (window, timing) -> { handled, sustained, late } | null
   * }
   * The OBJECT button calls player.requestObjection(); we resolve it between
   * clock ticks so the trial freezes during the grounds picker.
   */
  async runScripted(beats, handlers) {
    this._objectionRequested = false;
    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i];

      // Track the objection window.
      if (beat.objection) {
        this.window = { spec: beat.objection, qIndex: i, stage: 'question' };
      } else if (this.window && this.window.stage === 'question' && i === this.window.qIndex + 1 && beat.speaker === 'witness') {
        this.window.stage = 'answer';
      } else {
        this.window = null;
      }

      this._abortFlag = false;
      const { name, side } = handlers.nameFor(beat);
      this.setSpeaker(name, side);
      this.textEl.dataset.kind = beat.kind || '';

      let struckMod = null;
      this._beatDone = false;
      const typing = this._type(beat.text);

      // Poll for objection requests while the beat types/holds.
      const watcher = (async () => {
        while (!this._beatDone) {
          if (this._objectionRequested) {
            this._objectionRequested = false;
            this.pause();
            const timing = this.window
              ? (this.window.stage === 'question' ? 'timely' : 'late')
              : 'timely';
            const res = await handlers.tryObjection(this.window?.spec ?? null, timing);
            this.resume();
            if (res && res.sustained) {
              if (timing === 'timely') {
                // Question cut off: the paired answer never happens.
                this.skipCurrentBeat();
                this._skipNextAnswer = true;
              } else {
                // The jury heard it; strike at reduced effect.
                struckMod = 0.4;
                this.skipCurrentBeat();
              }
              this.window = null;
            }
          }
          await sleep(40);
        }
      })();

      await typing;
      if (!this._abortFlag) {
        if (this.settings.deliberateMode) await this._waitContinue();
        else await this._hold(beat.text);
      }
      this._beatDone = true;
      await watcher;

      // Commit answer facts.
      if (beat.speaker === 'witness') {
        if (struckMod != null) {
          handlers.onAnswerLand(beat, struckMod);
        } else if (this._skipNextAnswer) {
          this._skipNextAnswer = false;
          // shouldn't happen (we skip below), but guard anyway
        } else {
          handlers.onAnswerLand(beat, 1);
        }
      } else if (struckMod != null) {
        // late objection on a question beat with no separate answer
      }

      // A timely sustained objection skips the following answer beat.
      if (this._skipNextAnswer) {
        this._skipNextAnswer = false;
        if (beats[i + 1]?.speaker === 'witness') i++;
      }
    }
    this.window = null;
  }

  requestObjection() { this._objectionRequested = true; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
