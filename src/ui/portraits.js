// Parameterized flat-style SVG portraits with expression layers.
// A witness's composure drives their expression — the art is itself a meter.

const HAIR = {
  short(c) {
    return `<path d="M32 52 Q32 22 60 22 Q88 22 88 52 L88 44 Q88 30 60 30 Q32 30 32 44 Z" fill="${c}"/>
            <path d="M32 52 Q32 24 60 24 Q88 24 88 52 Q84 34 60 34 Q36 34 32 52Z" fill="${c}"/>`;
  },
  long(c) {
    return `<path d="M30 50 Q30 20 60 20 Q90 20 90 50 L92 96 L78 96 L80 52 Q72 34 60 34 Q48 34 40 52 L42 96 L28 96 Z" fill="${c}"/>`;
  },
  bun(c) {
    return `<circle cx="60" cy="20" r="10" fill="${c}"/>
            <path d="M32 50 Q32 22 60 22 Q88 22 88 50 Q82 32 60 32 Q38 32 32 50Z" fill="${c}"/>`;
  },
  curly(c) {
    return `<path d="M30 52 Q26 36 38 30 Q40 18 54 20 Q60 12 70 18 Q84 16 84 30 Q94 36 90 52 Q86 36 72 32 Q60 28 48 32 Q34 36 30 52Z" fill="${c}"/>
            <circle cx="34" cy="44" r="7" fill="${c}"/><circle cx="86" cy="44" r="7" fill="${c}"/>`;
  },
  bald() { return ''; },
};

const OUTFITS = {
  robe: `<path d="M14 140 Q18 100 38 94 L60 100 L82 94 Q102 100 106 140 Z" fill="#16161d"/>
         <path d="M52 98 L60 104 L68 98 L66 140 L54 140 Z" fill="#fafafa"/>`,
  suit: `<path d="M16 140 Q20 102 40 95 L60 102 L80 95 Q100 102 104 140 Z" fill="#2b3447"/>
         <path d="M52 99 L60 106 L68 99 L64 140 L56 140 Z" fill="#e8e6e0"/>
         <path d="M58 106 L62 106 L63 126 L60 130 L57 126 Z" fill="#7a2230"/>`,
  detective: `<path d="M16 140 Q20 102 40 95 L60 102 L80 95 Q100 102 104 140 Z" fill="#4a4238"/>
         <path d="M52 99 L60 106 L68 99 L64 140 L56 140 Z" fill="#cfd2d6"/>
         <path d="M58 106 L62 106 L63 124 L60 128 L57 124 Z" fill="#39516b"/>`,
  prosecutor: `<path d="M16 140 Q20 102 40 95 L60 102 L80 95 Q100 102 104 140 Z" fill="#3d2330"/>
         <path d="M50 99 L60 108 L70 99 L66 140 L54 140 Z" fill="#efe9ec"/>`,
  labcoat: `<path d="M14 140 Q18 100 40 94 L60 101 L80 94 Q102 100 106 140 Z" fill="#eef0f2"/>
         <path d="M54 98 L60 104 L66 98 L64 140 L56 140 Z" fill="#9fb3bd"/>
         <line x1="42" y1="104" x2="42" y2="140" stroke="#d4d9dd" stroke-width="2"/>
         <line x1="78" y1="104" x2="78" y2="140" stroke="#d4d9dd" stroke-width="2"/>`,
  apron: `<path d="M16 140 Q20 102 40 95 L60 102 L80 95 Q100 102 104 140 Z" fill="#5a6a76"/>
         <path d="M44 104 L76 104 L78 140 L42 140 Z" fill="#3c332b"/>
         <path d="M44 104 L40 96 M76 104 L80 96" stroke="#3c332b" stroke-width="4"/>`,
  casual: `<path d="M16 140 Q20 102 40 95 L60 102 L80 95 Q100 102 104 140 Z" fill="#6b7d5e"/>
         <path d="M50 98 Q60 108 70 98 L70 104 Q60 112 50 104 Z" fill="#55644b"/>`,
};

// Expression layers: brows, eyes, mouth per mood.
function face(skin) {
  const eye = (x, extra = '') => `<circle cx="${x}" cy="54" r="2.6" fill="#221c18" ${extra}/>`;
  return `
  <g class="expr expr-neutral">
    ${eye(49)}${eye(71)}
    <path d="M44 46 L55 46 M65 46 L76 46" stroke="#3a2f26" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M53 70 Q60 74 67 70" stroke="#7c4a3a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>
  <g class="expr expr-stressed">
    ${eye(49)}${eye(71)}
    <path d="M44 44 L55 47 M76 44 L65 47" stroke="#3a2f26" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M53 72 Q60 70 67 72" stroke="#7c4a3a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M40 60 Q42 63 40 66" stroke="${shade(skin)}" stroke-width="1.6" fill="none"/>
  </g>
  <g class="expr expr-angry">
    ${eye(49)}${eye(71)}
    <path d="M44 48 L55 44 M65 44 L76 48" stroke="#3a2f26" stroke-width="3" stroke-linecap="round"/>
    <path d="M52 73 Q60 69 68 73" stroke="#7c4a3a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  </g>
  <g class="expr expr-sad">
    <path d="M46 54 Q49 56 52 54" stroke="#221c18" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M68 54 Q71 56 74 54" stroke="#221c18" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M44 45 Q50 43 55 46 M76 45 Q70 43 65 46" stroke="#3a2f26" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <path d="M53 73 Q60 70 67 73" stroke="#7c4a3a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M73 60 L73 67" stroke="#7fa8c9" stroke-width="2.4" stroke-linecap="round"/>
  </g>`;
}

function shade(hex) {
  // crude darken for blush/contour strokes
  const n = parseInt(hex.slice(1), 16);
  const d = c => Math.max(0, c - 40).toString(16).padStart(2, '0');
  return `#${d((n >> 16) & 255)}${d((n >> 8) & 255)}${d(n & 255)}`;
}

export function makePortrait(spec) {
  const { skin = '#c68863', hair = 'short', hairColor = '#33291f', outfit = 'casual' } = spec || {};
  return `<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" class="portrait-svg">
    <ellipse cx="60" cy="136" rx="44" ry="6" fill="rgba(0,0,0,.25)"/>
    ${OUTFITS[outfit] || OUTFITS.casual}
    <rect x="52" y="80" width="16" height="18" rx="6" fill="${shade(skin)}"/>
    <circle cx="60" cy="55" r="27" fill="${skin}"/>
    <path d="M33 55 a4 7 0 0 0 0 1" fill="${skin}"/>
    <ellipse cx="33" cy="56" rx="4" ry="6" fill="${skin}"/>
    <ellipse cx="87" cy="56" rx="4" ry="6" fill="${skin}"/>
    <path d="M58 58 Q56 64 58 65 Q60 66 62 65" stroke="${shade(skin)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${(HAIR[hair] || HAIR.short)(hairColor)}
    ${face(skin)}
  </svg>`;
}

export function mountPortrait(el, spec, expr = 'neutral') {
  el.innerHTML = makePortrait(spec);
  el.dataset.expr = expr;
}

export function setExpression(el, expr) {
  el.dataset.expr = expr;
}

// Witness composure -> expression.
export function expressionFor(witnessData, wst) {
  if (wst.composure > 60) return 'neutral';
  if (wst.composure > 35) return 'stressed';
  return (witnessData.sympathy ?? 0) > 0.5 ? 'sad' : 'angry';
}

export const FIXED_CHARACTERS = {
  judge: { name: 'Hon. Marion Holt', spec: { skin: '#a9765a', hair: 'short', hairColor: '#cfcac2', outfit: 'robe' } },
  prosecutor: { name: 'ADA Victoria Pierce', spec: { skin: '#e8b88f', hair: 'bun', hairColor: '#5a3825', outfit: 'prosecutor' } },
  defendant: { name: 'Daniel Cross', spec: { skin: '#caa284', hair: 'short', hairColor: '#4d4339', outfit: 'suit' } },
};
