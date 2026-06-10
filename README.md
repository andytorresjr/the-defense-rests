# The Defense Rests — *State v. Daniel Cross*

A courtroom trial game in the browser. You are defense counsel in a murder case
that can actually be won or lost — every input you make feeds a live model of
twelve jurors, a judge, and an adapting prosecutor.

## Run it

ES modules require a local server (they will not load from `file://`):

- **Double-click `serve.cmd`** — it starts a server and opens the game, or
- `python -m http.server 8123` then open <http://localhost:8123>, or
- `npx serve -l 8123 .`

No dependencies, no build step. Tested in Chrome/Edge.

## How to play

The trial follows real criminal procedure: **jury selection → openings →
the People's case → the defense case → closings → deliberation → verdict.**
Four verdicts are reachable: not guilty, voluntary manslaughter, murder 2, and
a hung jury — all computed from the record you actually build.

- **Objections.** While opposing counsel questions a witness, the red
  **OBJECT!** button is live. Hit it the moment a question is improper, then
  pick the ground (hearsay, leading, speculation, relevance, argumentative,
  asked & answered, foundation — each with a rule reminder). Object before the
  answer and the testimony never lands; object late and "the jury will
  disregard" only partly works; pick the wrong ground and your standing with
  judge and jury bleeds. Some objectionable answers *help* you — the skill
  includes knowing when to stay seated.
- **Cross-examination.** Choose questions; *Press* and *Confront* rattle a
  witness — crack one and hidden testimony comes out, but badger a sympathetic
  witness and the jury turns on you. Confrontations need a foundation: get the
  exhibit in first.
- **Evidence.** Open the **Court Record** to read exhibits and the facts on
  the record. Exhibits must be presented through the right witness after the
  groundwork is laid, or the foundation objection kills it. When the People
  move to admit *their* exhibits, you may object — if you've built the record
  for it.
- **Direct examination.** In the defense case you may not lead your own
  witness — the prosecutor is listening.
- **Closings.** Your summation is assembled from themes the record supports.
  Arguing past your evidence backfires.
- **The verdict is explained.** Juror by juror, with the fact each one
  couldn't get past.

**Deliberate Mode** (title screen) pauses after every statement — same game,
no real-time pressure. Press **`` ` ``** any time for the debug overlay
showing live juror beliefs, the judge, witnesses, and the record.
The game autosaves between trial segments.

## Project layout

```
src/engine/   case-agnostic trial engine (state, jury model, objections,
              evidence foundation, examinations, adaptive prosecutor, judge)
src/data/     the case: facts, exhibits, juror pool, arguments, witnesses
src/ui/       courtroom renderer, dialogue clock, screens, SVG portraits
tools/        simulate.js — headless balance simulator
```

All state changes flow through `applyAction()` in `src/engine/state.js`;
jury beliefs are recomputed from the record, so strikes and impeachment are
retroactive. The engine never references this case's specifics — add a new
folder under `src/data/cases/` to add a case.

## Balance harness

```
node tools/simulate.js
```

Auto-plays the trial under four strategy profiles (200 seeds each). Current
distribution: perfect play → 100% not guilty; a hedged manslaughter strategy →
~75% manslaughter / ~25% hung; passive and self-destructive play → murder 2.
