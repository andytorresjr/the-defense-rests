// Courtroom3D: the cinematic controller. Inherits ALL examination/objection/
// evidence flow from the 2D Courtroom and overrides only the presentation
// hooks — every dialogue beat passes through nameFor(), which is where the
// camera direction and character animation are driven from.
import { Courtroom } from '../src/ui/renderer.js';
import { expressionFor } from '../src/ui/portraits.js';

export class Courtroom3D extends Courtroom {
  constructor(state, caseData, settings, rng, courtScene) {
    super(state, caseData, settings, rng);
    this.scene3d = courtScene;
    this._jurySeated = false;
    if (caseData.defendant) this.scene3d.setDefendant(caseData.defendant.portrait);

    // The player's objection click gets a camera cut + point pose too.
    document.getElementById('objectBtn').addEventListener('click', () => {
      this.scene3d.playerObjects();
    });
  }

  show() {
    super.show();
    this.scene3d.setOrbit(false);
    this.scene3d.setShot('wide');
  }

  hide() {
    super.hide();
    this.scene3d.quiet();
    this.scene3d.setOrbit(true);
  }

  refresh() {
    super.refresh();
    if (!this._jurySeated && this.state.jury.length) {
      this.scene3d.setJury(this.state.jury);
      this._jurySeated = true;
    }
    if (this.witnessData) {
      const wst = this.state.witnesses[this.witnessData.id];
      const expr = expressionFor(this.witnessData, wst);
      this.scene3d.setWitnessMood(expr === 'neutral' ? 'neutral' : expr === 'stressed' ? 'stressed' : 'down');
    }
  }

  setWitness(witnessData) {
    super.setWitness(witnessData);
    this.scene3d.seatWitness(witnessData ? witnessData.portrait : null);
    if (witnessData) this.scene3d.setShot('witness');
  }

  // Called once per beat by every playback path in the parent class —
  // the single hook that makes the whole game cinematic.
  nameFor(beat) {
    const r = super.nameFor(beat);
    this.scene3d.onBeat(beat, r.side);
    return r;
  }
}
