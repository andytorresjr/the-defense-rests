// Cinematic post-processing: DOF -> bloom -> tonemap -> film grade, with three
// quality tiers (HIGH/MED/LOW) and an FPS governor that auto-demotes, persists
// the tier, and may re-promote once per session. The Director supplies smoothed
// focus values via setFocus(); this module owns the renderer's pixel ratio.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const STORE_KEY = 'tdr3d-quality';

// Display-referred grade (runs AFTER OutputPass): chromatic aberration,
// teal-shadow / warm-highlight split, filmic S-contrast, vignette, animated
// luma-weighted grain.
const GradeShader = {
  name: 'GradeShader',
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(1, 1) },
    grainAmp: { value: 0.035 },
    vigStrength: { value: 0.32 },
    aberration: { value: 0.0014 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float time; uniform vec2 resolution;
    uniform float grainAmp; uniform float vigStrength; uniform float aberration;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec2 fromC = uv - 0.5;
      float d2 = dot(fromC, fromC);                    // 0 center .. 0.5 corner
      // chromatic aberration, scaled by distance^2 so center stays clean
      vec2 ca = fromC * d2 * aberration * 40.0;
      vec3 c;
      c.r = texture2D(tDiffuse, uv + ca).r;
      c.g = texture2D(tDiffuse, uv).g;
      c.b = texture2D(tDiffuse, uv - ca).b;
      // teal-shadow / warm-highlight grade
      float luma = dot(c, vec3(0.299, 0.587, 0.114));
      float sh = 1.0 - smoothstep(0.0, 0.45, luma);    // shadow mask
      float hi = smoothstep(0.55, 1.0, luma);          // highlight mask
      c = mix(c, c * vec3(0.92, 1.02, 1.09), sh * 0.35);
      c = mix(c, c * vec3(1.06, 1.01, 0.94), hi * 0.30);
      // gentle filmic S-contrast, 15% blend
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.15);
      // vignette
      float vig = 1.0 - smoothstep(0.18, 0.52, d2) * vigStrength;
      c *= vig;
      // animated grain, luma-weighted (less in highlights)
      float n = hash(uv * resolution.xy * 0.5 + fract(time * 13.7) * 100.0);
      c += (n - 0.5) * grainAmp * (1.0 - luma * 0.6);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

// Governor constants.
const DEMOTE_FPS = 45;     // ema below this...
const DEMOTE_HOLD = 3;     // ...for this long => drop a tier
const GRACE = 3;           // ignore the governor after boot / any tier change
const PROMOTE_FPS = 57;    // ema above this...
const PROMOTE_HOLD = 5;    // ...for this long...
const PROMOTE_DELAY = 20;  // ...starting this long after a demote => re-raise once

export class CinematicPipeline {
  // Tiers: 0 HIGH (full chain), 1 MED (no bokeh, half-res bloom), 2 LOW (direct render).
  onTierChange = null; // callback(tier) — integrator wires shadow/character downgrades

  constructor(renderer, scene, camera, opts = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const size = renderer.getSize(new THREE.Vector2());
    this._w = Math.max(1, size.x);
    this._h = Math.max(1, size.y);
    this._focus = { f: 4.5, ap: 0.0025, mb: 0.008 }; // last setFocus values (survive rebuilds)
    this._time = 0;

    // governor state
    this._ema = 60;
    this._lowTime = 0;
    this._hiTime = 0;
    this._grace = GRACE;
    this._sessionT = 0;
    this._demoteAt = -1;
    this._promoteUsed = false;

    this.composer = null;
    this.bokeh = null;
    this.bloom = null;
    this.grade = null;

    const start = opts.startTier ?? this._loadTier();
    this._tier = Math.max(0, Math.min(2, start | 0));
    this._applyTier();
  }

  get tier() { return this._tier; }

  setTier(n) {
    n = Math.max(0, Math.min(2, n | 0));
    if (n === this._tier) return;
    this._tier = n;
    this._applyTier();
    this._grace = GRACE;
    this._lowTime = 0;
    this._hiTime = 0;
    try { localStorage.setItem(STORE_KEY, String(n)); } catch (e) { /* storage blocked */ }
    if (this.onTierChange) this.onTierChange(n);
  }

  setSize(w, h) {
    this._w = Math.max(1, w);
    this._h = Math.max(1, h);
    this._applySize();
  }

  // Raw per-frame focus drive (Director already smooths these).
  setFocus(focusDist, aperture, maxblur) {
    const f = this._focus;
    f.f = focusDist; f.ap = aperture; f.mb = maxblur;
    if (this.bokeh) {
      const u = this.bokeh.uniforms;
      u.focus.value = focusDist;
      u.aperture.value = aperture;
      u.maxblur.value = maxblur;
    }
  }

  render(dt) {
    this._time = (this._time + dt) % 1000; // wrapped: keeps grain hash precise
    this._sessionT += dt;
    this._govern(dt);
    if (this.composer) {
      this.grade.uniforms.time.value = this._time;
      this.composer.render(dt);
    } else {
      this.renderer.render(this.scene, this.camera); // LOW: renderer ACES tonemap still applies
    }
  }

  // ---------- tiers ----------
  _pixelRatio() {
    const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
    if (this._tier === 0) return Math.min(dpr, 2);
    if (this._tier === 1) return Math.min(dpr, 1.5);
    return Math.min(dpr, 1.25);
  }

  _applyTier() {
    this.renderer.setPixelRatio(this._pixelRatio());
    if (this._tier === 2) { this._disposeComposer(); return; }
    if (!this.composer) this._buildComposer();
    this.bokeh.enabled = this._tier === 0;
    this._applySize();
  }

  _applySize() {
    if (!this.composer) return;
    const pr = this._pixelRatio();
    this.composer.setPixelRatio(pr);
    this.composer.setSize(this._w, this._h); // feeds effective (device px) size to passes
    this.grade.uniforms.resolution.value.set(this._w * pr, this._h * pr);
    if (this._tier === 1) this.bloom.setSize((this._w * pr) / 2, (this._h * pr) / 2); // half-res bloom
  }

  // Chain: Render -> Bokeh -> Bloom -> Output -> Grade. DOF works on the raw HDR
  // frame; bloom (threshold 0.85, pre-tonemap) only picks up practicals/windows;
  // OutputPass tonemaps + sRGB; grade runs last in display space.
  _buildComposer() {
    const c = new EffectComposer(this.renderer);
    c.addPass(new RenderPass(this.scene, this.camera));
    this.bokeh = new BokehPass(this.scene, this.camera, {
      focus: this._focus.f, aperture: this._focus.ap, maxblur: this._focus.mb,
    });
    c.addPass(this.bokeh);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(this._w, this._h), 0.25, 0.55, 0.85);
    c.addPass(this.bloom);
    c.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    c.addPass(this.grade);
    this.grade.uniforms.time.value = this._time;
    this.composer = c;
  }

  _disposeComposer() {
    if (!this.composer) return;
    for (const p of this.composer.passes) p.dispose?.();
    this.composer.dispose?.();
    this.composer = this.bokeh = this.bloom = this.grade = null;
  }

  // ---------- governor ----------
  _govern(dt) {
    if (dt <= 0) return;
    this._ema = this._ema * 0.95 + (1 / dt) * 0.05;
    if (this._grace > 0) { this._grace -= dt; return; }

    // demote: 3s continuously under 45fps drops one tier
    if (this._ema < DEMOTE_FPS) {
      this._lowTime += dt;
      if (this._lowTime >= DEMOTE_HOLD && this._tier < 2) {
        this._demoteAt = this._sessionT;
        this.setTier(this._tier + 1);
      }
      return;
    }
    this._lowTime = 0;

    // one optional re-promote per session, 20s after a demote, 5s over 57fps
    if (this._promoteUsed || this._demoteAt < 0 || this._tier === 0) return;
    if (this._sessionT - this._demoteAt < PROMOTE_DELAY) return;
    if (this._ema > PROMOTE_FPS) {
      this._hiTime += dt;
      if (this._hiTime >= PROMOTE_HOLD) {
        this._promoteUsed = true;
        this.setTier(this._tier - 1);
      }
    } else {
      this._hiTime = 0;
    }
  }

  _loadTier() {
    try {
      const v = parseInt(localStorage.getItem(STORE_KEY), 10);
      if (v === 0 || v === 1 || v === 2) return v;
    } catch (e) { /* storage blocked */ }
    return 0;
  }
}
