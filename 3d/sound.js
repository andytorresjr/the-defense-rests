// Tiny procedural WebAudio effects — no audio assets. The context unlocks on
// the first user gesture (browsers require it).
let ctx = null;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

document.addEventListener('pointerdown', () => { try { ac(); } catch { /* no audio */ } }, { once: true });

function env(node, t0, attack, decay, peak = 1) {
  node.gain.setValueAtTime(0.0001, t0);
  node.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

// Objection sting: a dramatic two-note brass-ish hit.
export function playSting() {
  try {
    const a = ac(), t = a.currentTime;
    for (const [freq, delay, dur] of [[196, 0, 0.5], [98, 0.02, 0.6], [233, 0.1, 0.45]]) {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(freq, t + delay);
      o.frequency.exponentialRampToValueAtTime(freq * 0.92, t + delay + dur);
      env(g, t + delay, 0.015, dur, 0.12);
      o.connect(g).connect(a.destination);
      o.start(t + delay); o.stop(t + delay + dur + 0.1);
    }
  } catch { /* audio unavailable */ }
}

// Gavel: filtered noise thump.
export function playGavel(knocks = 1) {
  try {
    const a = ac(), t = a.currentTime;
    for (let i = 0; i < knocks; i++) {
      const dur = 0.12;
      const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * (1 - j / data.length) ** 2;
      const src = a.createBufferSource();
      src.buffer = buf;
      const f = a.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 900;
      const g = a.createGain();
      env(g, t + i * 0.22, 0.005, dur, 0.35);
      src.connect(f).connect(g).connect(a.destination);
      src.start(t + i * 0.22);
    }
  } catch { /* audio unavailable */ }
}

// Verdict moment: low sustained drone swell.
export function playDrone() {
  try {
    const a = ac(), t = a.currentTime;
    for (const freq of [55, 82.4, 110]) {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      env(g, t, 1.4, 2.6, 0.06);
      o.connect(g).connect(a.destination);
      o.start(t); o.stop(t + 4.2);
    }
  } catch { /* audio unavailable */ }
}
