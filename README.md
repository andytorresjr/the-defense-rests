# The Defense Rests — *State v. Daniel Cross*

A courtroom trial game in the browser. You are defense counsel in cases that
can actually be won or lost — every input you make feeds a live model of
twelve jurors, a judge, and an adapting prosecutor.

**Two cases, selectable from the title screen:**

- ***State v. Daniel Cross*** — murder 2 (lesser: voluntary manslaughter). An
  eyewitness who never saw a face, a knife from a dumpster, and a bar camera
  whose clock is not what it seems.
- ***State v. Mara Vance*** — arson 1 (lesser: reckless burning). A drowning
  restaurant, a doubled policy, a fire marshal reading "pour patterns" from a
  forensic playbook modern science buried — and an alarm-panel log he never
  pulled.

**Two editions, one game:**

- **Classic 2D** (`/`) — illustrated visual-novel style, zero dependencies.
- **Cinematic 3D** (`/3d/`) — a Three.js courtroom shot like a prestige legal
  drama. A deterministic camera director runs a 30-shot library with real
  cinematography grammar: 180° line discipline, shot rotation so no angle
  repeats, over-the-shoulder coverage, reaction cutaways to the defendant and
  jurors, whip-cut objections, a gavel low-angle on rulings, a creeping ECU
  when a witness cracks, and a 20-second push-in on the defendant at the
  verdict. Every frame goes through a film pipeline — depth of field racked
  per shot, bloom, teal/amber grade, grain, vignette — with auto quality
  tiers for slower machines. The room is fully procedural PBR (oak, mahogany
  raised paneling, brass, late-afternoon sun pools), and the cast are
  articulated procedural humans with gaze tracking, blinks, jaw-synced
  speech, gestures, and moods. Every input is staged in-scene like an
  interactive film: jury selection plays over the actual venire seated in the
  gallery (hover a candidate's name plate to hear how they think, click to
  strike, and watch the People excuse theirs), openings and closings are
  argued from counsel table, the call-the-defendant decision is a conference
  at the defense table, and the foreperson reads the verdict while the camera
  holds on the defendant. Zero assets, zero build step. Same engine,
  same cases, same rules as the 2D edition.

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
- **Redirect.** After the prosecutor cross-examines your witness, the judge
  asks: "Any redirect, counsel?" Take it to repair what the cross broke
  (rehabilitation only unlocks where the cross actually drew blood) — or
  waive it. Re-asking settled questions invites asked-and-answered.
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
retroactive. The engine never references any case's specifics: each case
declares its contested issues, a `verdictModel` (how issues map onto the
act/mens-rea elements, and the verdict labels), its witnesses, exhibits,
juror pool, and trial plan. Add a folder under `src/data/cases/` and list it
in `src/data/cases/index.js` to add a case.

## Balance harness

```
node tools/simulate.js
```

Auto-plays the trial under four strategy profiles (200 seeds each). Current
distribution: perfect play → 100% not guilty; a hedged manslaughter strategy →
~75% manslaughter / ~25% hung; passive and self-destructive play → murder 2.
