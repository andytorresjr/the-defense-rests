// Floating DOM labels pinned to 3D heads — dark-glass name/occupation chips
// with a hover tooltip of voir dire quotes. One rAF loop projects every label
// through the CourtScene camera while any label exists; clicks route back to
// the sequence that owns the layer (e.g. striking a venire candidate).
import * as THREE from 'three';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class LabelLayer {
  constructor(courtScene) {
    this.scene3d = courtScene;
    this._labels = new Map(); // id -> { el (positioned wrapper), chip, getWorldPos, shown, left, top, xf }
    this._raf = 0;
    this._v = new THREE.Vector3(); // scratch projection vector

    // Sits under the dialogue box (z 7) and over the letterbox bars (z 5).
    // The container swallows no clicks; each label re-enables pointer events.
    this.root = document.createElement('div');
    this.root.className = 'v-labels';
    document.getElementById('screen-court').appendChild(this.root);

    this._tick = this._tick.bind(this);
  }

  add(id, getWorldPos, { title, sub, quotes = [], onClick = null }) {
    this.remove(id);

    // Wrapper takes the per-frame position; the inner chip takes hover/struck
    // styling so a moving anchor never flickers the :hover state.
    const el = document.createElement('div');
    el.className = 'v-label';

    const chip = document.createElement('div');
    chip.className = 'v-chip';

    const name = document.createElement('div');
    name.className = 'v-name';
    name.textContent = title;
    chip.appendChild(name);

    const occ = document.createElement('div');
    occ.className = 'v-sub';
    occ.textContent = sub;
    chip.appendChild(occ);

    if (quotes.length) {
      const tip = document.createElement('div');
      tip.className = 'v-quotes';
      for (const q of quotes) {
        const line = document.createElement('div');
        line.textContent = q; // case data quotes carry their own quote marks
        tip.appendChild(line);
      }
      chip.appendChild(tip);
    }

    if (onClick) chip.addEventListener('click', () => onClick(id));
    chip.addEventListener('animationend', () => chip.classList.remove('flash'));

    el.appendChild(chip);
    this.root.appendChild(el);
    this._labels.set(id, { el, chip, getWorldPos, shown: true, left: '', top: '', xf: '' });

    if (!this._raf) this._raf = requestAnimationFrame(this._tick);
  }

  setStruck(id, struck) {
    const L = this._labels.get(id);
    if (L) L.chip.classList.toggle('struck', !!struck);
  }

  // Brief red pulse — the People's strikes land without player input.
  flash(id) {
    const L = this._labels.get(id);
    if (!L) return;
    L.chip.classList.remove('flash');
    void L.chip.offsetWidth; // restart the animation if it was mid-flight
    L.chip.classList.add('flash');
  }

  remove(id) {
    const L = this._labels.get(id);
    if (!L) return;
    L.el.remove();
    this._labels.delete(id);
  }

  clear() {
    for (const L of this._labels.values()) L.el.remove();
    this._labels.clear();
  }

  dispose() {
    this.clear();
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    this.root.remove();
  }

  // ---------- projection loop ----------
  _tick() {
    if (!this._labels.size) { this._raf = 0; return; } // park until the next add()
    this._raf = requestAnimationFrame(this._tick);

    const cam = this.scene3d.camera;
    for (const L of this._labels.values()) {
      const v = this._v;
      if (!L.getWorldPos(v)) { this._show(L, false); continue; }

      // Distance drives the chip scale; measure before project() rewrites v.
      const dist = v.distanceTo(cam.position);
      v.project(cam);
      if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) {
        this._show(L, false);
        continue;
      }

      this._show(L, true);
      const left = ((v.x * 0.5 + 0.5) * 100).toFixed(2) + '%';
      const top = ((-v.y * 0.5 + 0.5) * 100).toFixed(2) + '%';
      const xf = `translate(-50%, -110%) scale(${clamp(10 / dist, 0.75, 1.25).toFixed(3)})`;
      if (left !== L.left) { L.left = left; L.el.style.left = left; }
      if (top !== L.top) { L.top = top; L.el.style.top = top; }
      if (xf !== L.xf) { L.xf = xf; L.el.style.transform = xf; }
    }
  }

  _show(L, on) {
    if (L.shown === on) return;
    L.shown = on;
    L.el.style.display = on ? '' : 'none';
  }
}
