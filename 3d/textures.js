// Procedural texture & material library for the 3D courtroom (design doc §1).
// Every map is painted into a 2D canvas with seeded randomness — no asset
// files, no Math.random(), fully deterministic across loads.
import * as THREE from 'three';

let _maxAniso = 8; // cached once in buildMaterials() from renderer caps

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const gray = (g) => `rgb(${g},${g},${g})`;

// ---------- core helpers ----------

// Deterministic PRNG. Every painter creates its own: const rnd = mulberry32(SEED);
export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// size: number (square) or [w,h]. painter(ctx, w, h) draws the image.
// opts: { srgb = true, repeat = [1,1], anisotropy = 8, filter }
export function makeCanvasTexture(size, painter, opts = {}) {
  const [w, h] = Array.isArray(size) ? size : [size, size];
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  painter(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...(opts.repeat ?? [1, 1]));
  tex.minFilter = opts.filter ?? THREE.LinearMipmapLinearFilter;
  tex.anisotropy = Math.min(opts.anisotropy ?? 8, _maxAniso);
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.canvas = c; // so roughnessFromCanvas / texVariant can reuse it
  return tex;
}

// ROUGHNESS-FROM-LUMINANCE: lighter albedo pixel => rougher (worn/dry),
// darker => glossier (varnish pools). invert=true flips it (marble veins).
export function roughnessFromCanvas(albedoTex, base, amp, invert = false, repeat = null) {
  const src = albedoTex.userData.canvas;
  const w = src.width, h = src.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    const v = invert ? (0.5 - lum) : (lum - 0.5);
    const g = Math.round(clamp(base + amp * v * 2, 0.05, 0.98) * 255);
    d[i] = d[i + 1] = d[i + 2] = g; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const r = repeat ?? [albedoTex.repeat.x, albedoTex.repeat.y];
  tex.repeat.set(r[0], r[1]);
  tex.anisotropy = Math.min(8, _maxAniso);
  tex.userData.canvas = c;
  return tex;
}

// Fresh CanvasTexture over an existing texture's canvas, new repeat.
function retex(srcTex, rx, ry) {
  const tex = new THREE.CanvasTexture(srcTex.userData.canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.anisotropy = srcTex.anisotropy;
  tex.colorSpace = srcTex.colorSpace;
  tex.userData.canvas = srcTex.userData.canvas;
  return tex;
}

// ---------- paint primitives ----------

// Horizontal / vertical grain streak with gentle sine wobble.
function hStreak(ctx, x0, y0, len, amp, wave) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let x = x0 + 6; x <= x0 + len; x += 6)
    ctx.lineTo(x, y0 + amp * Math.sin(((x - x0) / wave) * Math.PI * 2));
  ctx.stroke();
}
function vStreak(ctx, x0, y0, len, amp, wave) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let y = y0 + 6; y <= y0 + len; y += 6)
    ctx.lineTo(x0 + amp * Math.sin(((y - y0) / wave) * Math.PI * 2), y);
  ctx.stroke();
}

// Soft radial blob: rgb is "r,g,b", fades a -> 0 (same hue, avoids gray fringe).
function radial(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// Linear gradient strip c0 -> c1 (vertical or horizontal).
function fade(ctx, x, y, w, h, vertical, c0, c1) {
  const g = vertical
    ? ctx.createLinearGradient(0, y, 0, y + h)
    : ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}
function grayRamp(ctx, x, y, w, h, vertical, g0, g1) {
  fade(ctx, x, y, w, h, vertical, gray(g0), gray(g1));
}

function rrect(ctx, x, y, w, h, r) {
  if (w <= 0 || h <= 0) return;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

// ---------- §1.1 floorOak ----------
// Single seeded layout consumed by BOTH albedo and bump so plank seams,
// end joints and grain streaks stay pixel-aligned across maps.
function oakLayout() {
  const rnd = mulberry32(101);
  const rows = [];
  let y = 0;
  for (let r = 0; r < 12; r++) {
    const rh = r === 11 ? 89 : 85;
    const segs = [];
    let x = 0;
    while (x < 1024) {
      const len = 180 + rnd() * 240;
      segs.push({
        x, len: Math.min(len, 1024 - x),
        c: [
          Math.round(107 + (rnd() - 0.5) * 2 * 18),
          Math.round(74 + (rnd() - 0.5) * 2 * 13),
          Math.round(42 + (rnd() - 0.5) * 2 * 9),
        ],
        bo: (rnd() - 0.5) * 12, // per-plank bump offset ±6 gray
      });
      x += len;
    }
    const streaks = [];
    for (let i = 0; i < 55; i++) {
      streaks.push({
        x: rnd() * 1024, y: y + 4 + rnd() * (rh - 8),
        len: 120 + rnd() * 580, a: 0.04 + rnd() * 0.07,
      });
    }
    rows.push({ y, h: rh, segs, streaks });
    y += rh;
  }
  const sheens = [], blotches = [];
  for (let i = 0; i < 6; i++) sheens.push({ x: rnd() * 1024, y: rnd() * 1024, r: 200 + rnd() * 220 });
  for (let i = 0; i < 4; i++) blotches.push({ x: rnd() * 1024, y: rnd() * 1024, r: 200 + rnd() * 220 });
  return { rows, sheens, blotches };
}

function paintOakAlbedo(L) {
  return (ctx, w) => {
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(0, 0, w, w);
    for (const row of L.rows)
      for (const s of row.segs) {
        ctx.fillStyle = `rgb(${s.c[0]},${s.c[1]},${s.c[2]})`;
        ctx.fillRect(s.x, row.y, s.len, row.h);
      }
    ctx.lineWidth = 1;
    for (const row of L.rows)
      for (const st of row.streaks) {
        ctx.strokeStyle = `rgba(30,18,8,${st.a.toFixed(3)})`;
        hStreak(ctx, st.x, st.y, st.len, 1.5, 90);
      }
    ctx.fillStyle = '#27190d';
    for (const row of L.rows) {
      ctx.fillRect(0, row.y, w, 2); // row gap (y=0 covers wrap seam)
      for (const s of row.segs) ctx.fillRect(s.x - 1, row.y, 2, row.h); // end joints
    }
    for (const b of L.sheens) radial(ctx, b.x, b.y, b.r, '255,255,255', 0.030);
    for (const b of L.blotches) radial(ctx, b.x, b.y, b.r, '20,12,5', 0.05);
  };
}

function paintOakBump(L) {
  return (ctx, w) => {
    ctx.fillStyle = gray(128);
    ctx.fillRect(0, 0, w, w);
    for (const row of L.rows)
      for (const s of row.segs) {
        ctx.fillStyle = gray(clamp(Math.round(128 + s.bo), 0, 255));
        ctx.fillRect(s.x, row.y, s.len, row.h);
      }
    ctx.strokeStyle = 'rgba(116,116,116,0.5)';
    ctx.lineWidth = 1;
    for (const row of L.rows)
      for (const st of row.streaks) hStreak(ctx, st.x, st.y, st.len, 1.5, 90);
    ctx.fillStyle = gray(52);
    for (const row of L.rows) {
      ctx.fillRect(0, row.y - 1, w, 3);
      for (const s of row.segs) ctx.fillRect(s.x - 1.5, row.y, 3, row.h);
    }
  };
}

// ---------- §1.2 mahoganyPanel + §2.3 doorPanel ----------
// One raised-panel unit: stile grain, field, bevels (light from upper-left),
// outer groove, sheen. Wainscot tile = 1 unit (fieldH 332); door = 2 stacked
// units (fieldH 352) on a 512x1024 canvas.
function panelUnit(ctx, rnd, y0, unitH, fieldH) {
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = `rgba(20,10,5,${(0.05 + rnd() * 0.06).toFixed(3)})`;
    ctx.lineWidth = 1 + rnd();
    vStreak(ctx, rnd() * 512, y0, unitH, 2, 90);
  }
  const fy = y0 + 90;
  ctx.fillStyle = '#4a2a18';
  ctx.fillRect(90, fy, 332, fieldH);
  ctx.save();
  ctx.beginPath(); ctx.rect(90, fy, 332, fieldH); ctx.clip();
  ctx.strokeStyle = 'rgba(26,13,6,0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 60; i++) vStreak(ctx, 90 + rnd() * 332, fy, fieldH, 2, 90);
  ctx.restore();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#6e4426'; // lit top + left bevels
  ctx.fillRect(90, fy, 332, 14);
  ctx.fillRect(90, fy, 14, fieldH);
  ctx.fillStyle = '#1d0f08'; // shaded bottom + right
  ctx.fillRect(90, fy + fieldH - 14, 332, 14);
  ctx.fillRect(408, fy, 14, fieldH);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#170c06';
  ctx.lineWidth = 4;
  ctx.strokeRect(78, y0 + 78, 356, fieldH + 24);
  fade(ctx, 0, y0, 512, unitH * 0.4, true, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0)');
}

function paintPanel(ctx, w, h) {
  const rnd = mulberry32(202);
  ctx.fillStyle = '#3a2114';
  ctx.fillRect(0, 0, w, h);
  panelUnit(ctx, rnd, 0, 512, 332);
}

function paintDoor(ctx, w, h) {
  const rnd = mulberry32(204);
  ctx.fillStyle = '#3a2114';
  ctx.fillRect(0, 0, w, h);
  panelUnit(ctx, rnd, 0, 512, 352);    // field (90, 90, 332, 352)
  panelUnit(ctx, rnd, 450, 574, 352);  // field (90, 540, 332, 352)
}

// Bump shared by panel + door: raised field 178, 14px bevel ramps to 96,
// groove ring at 70. units = y offsets, fieldH = albedo field height.
function paintPanelBump(units, fieldH) {
  return (ctx, w, h) => {
    ctx.fillStyle = gray(128);
    ctx.fillRect(0, 0, w, h);
    for (const y0 of units) {
      const fx = 104, fy = y0 + 104, fw = 304, fh = fieldH - 28;
      ctx.fillStyle = gray(178);
      ctx.fillRect(fx, fy, fw, fh);
      grayRamp(ctx, fx, fy - 14, fw, 14, true, 96, 178);
      grayRamp(ctx, fx, fy + fh, fw, 14, true, 178, 96);
      grayRamp(ctx, fx - 14, fy, 14, fh, false, 96, 178);
      grayRamp(ctx, fx + fw, fy, 14, fh, false, 178, 96);
      ctx.strokeStyle = gray(70);
      ctx.lineWidth = 6;
      ctx.strokeRect(78, y0 + 78, 356, fieldH + 24);
    }
  };
}

// ---------- §1.3 mahoganyFlat / mahoganyGloss ----------
function flatLayout() {
  const rnd = mulberry32(203);
  const grain = [], bands = [];
  for (let i = 0; i < 110; i++)
    grain.push({ x: rnd() * 512, a: 0.05 + rnd() * 0.06, w: 1 + rnd() });
  for (let i = 0; i < 8; i++)
    bands.push({ x: rnd() * 512, w: 40 + rnd() * 50 });
  return { grain, bands };
}

function paintFlat(L) {
  return (ctx, w, h) => {
    ctx.fillStyle = '#46291a';
    ctx.fillRect(0, 0, w, h);
    for (const g of L.grain) {
      ctx.strokeStyle = `rgba(24,12,6,${g.a.toFixed(3)})`;
      ctx.lineWidth = g.w;
      vStreak(ctx, g.x, 0, h, 2, 90);
    }
    ctx.globalAlpha = 0.04;
    L.bands.forEach((b, i) => {
      ctx.fillStyle = i % 2 ? '#331d10' : '#5a3520';
      ctx.fillRect(b.x, 0, b.w, h);
    });
    ctx.globalAlpha = 1;
  };
}

function paintFlatBump(L) {
  return (ctx, w, h) => {
    ctx.fillStyle = gray(128);
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,120,120,0.6)';
    for (const g of L.grain) {
      ctx.lineWidth = g.w;
      vStreak(ctx, g.x, 0, h, 2, 90);
    }
  };
}

// ---------- §1.4 plasterWall ----------
function paintPlaster(ctx, w, h) {
  const rnd = mulberry32(301);
  ctx.fillStyle = '#b3a78f';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(255,250,238,${(0.020 + rnd() * 0.018).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, 2 + rnd() * 5, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(70,60,45,${(0.018 + rnd() * 0.015).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, 2 + rnd() * 5, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 10; i++)
    radial(ctx, rnd() * w, rnd() * h, 120 + rnd() * 140, i % 2 ? '60,52,40' : '255,248,232', 0.05);
  ctx.fillStyle = 'rgba(60,52,40,0.02)';
  for (let i = 0; i < 14; i++) ctx.fillRect(0, i * (h / 14), w, 18); // trowel banding
}

function paintPlasterBump(ctx, w, h) {
  const rnd = mulberry32(301);
  ctx.fillStyle = gray(128);
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = gray(Math.round(121 + rnd() * 14));
    ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
  }
}

// ---------- §1.6 cofferCeiling ----------
function paintCoffer(ctx, w, h) {
  const rnd = mulberry32(401);
  ctx.fillStyle = '#2c1d10';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(15,9,4,0.05)';
  for (let i = 0; i < 40; i++) {
    ctx.lineWidth = 1 + rnd();
    if (i % 2) hStreak(ctx, 0, rnd() * h, w, 1.5, 120);
    else vStreak(ctx, rnd() * w, 0, h, 1.5, 120);
  }
  ctx.fillStyle = '#a39780';
  ctx.fillRect(72, 72, 368, 368);
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(60,52,40,0.025)' : 'rgba(255,248,232,0.025)';
    ctx.beginPath();
    ctx.arc(72 + rnd() * 368, 72 + rnd() * 368, 2 + rnd() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const sh = 'rgba(20,14,8,0.45)', tr = 'rgba(20,14,8,0)';
  fade(ctx, 72, 72, 368, 26, true, sh, tr);   // inner shadow frame
  fade(ctx, 72, 414, 368, 26, true, tr, sh);
  fade(ctx, 72, 72, 26, 368, false, sh, tr);
  fade(ctx, 414, 72, 26, 368, false, tr, sh);
  ctx.strokeStyle = '#4a3017';
  ctx.lineWidth = 3;
  ctx.strokeRect(72, 72, 368, 368);
}

function paintCofferBump(ctx, w, h) {
  ctx.fillStyle = gray(210); // beams raised
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = gray(100);
  ctx.fillRect(72, 72, 368, 368);
  grayRamp(ctx, 72, 72, 368, 20, true, 210, 100);
  grayRamp(ctx, 72, 420, 368, 20, true, 100, 210);
  grayRamp(ctx, 72, 72, 20, 368, false, 210, 100);
  grayRamp(ctx, 420, 72, 20, 368, false, 100, 210);
}

// ---------- §1.7 carpet ----------
function paintCarpet(ctx, w, h) {
  const rnd = mulberry32(501);
  ctx.fillStyle = '#37474a';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 14000; i++) {
    const r = Math.round(55 + (rnd() - 0.5) * 24);
    const g = Math.round(71 + (rnd() - 0.5) * 24);
    const b = Math.round(74 + (rnd() - 0.5) * 24);
    ctx.fillStyle = `rgba(${r},${g},${b},0.5)`;
    ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2); // weave rows
  for (let i = 0; i < 6; i++)
    radial(ctx, rnd() * w, rnd() * h, 150 + rnd() * 150, '10,14,15', 0.04); // traffic wear
}

function paintCarpetBump(ctx, w, h) {
  const rnd = mulberry32(501);
  ctx.fillStyle = gray(128);
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 14000; i++) {
    ctx.fillStyle = gray(Math.round(120 + rnd() * 16));
    ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
  }
}

// ---------- §1.8 leatherDark / leatherGreen ----------
function leatherLayout(seed) {
  const rnd = mulberry32(seed);
  const mk = () => {
    const x0 = rnd() * 512, y0 = rnd() * 512;
    return {
      x0, y0,
      cx: x0 + (rnd() - 0.5) * 80, cy: y0 + (rnd() - 0.5) * 80,
      x1: x0 + (rnd() - 0.5) * 140, y1: y0 + (rnd() - 0.5) * 140,
    };
  };
  const wrinkles = [], highlights = [];
  for (let i = 0; i < 500; i++) wrinkles.push(mk());
  for (let i = 0; i < 500; i++) highlights.push(mk());
  return { wrinkles, highlights };
}

function qCurve(ctx, q) {
  ctx.beginPath();
  ctx.moveTo(q.x0, q.y0);
  ctx.quadraticCurveTo(q.cx, q.cy, q.x1, q.y1);
  ctx.stroke();
}

function paintLeather(L, fill, shadow, highlight) {
  return (ctx, w, h) => {
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = shadow;
    for (const q of L.wrinkles) qCurve(ctx, q);
    ctx.strokeStyle = highlight;
    for (const q of L.highlights) qCurve(ctx, q);
    radial(ctx, 256, 256, 300, '255,255,255', 0.05);
  };
}

function paintLeatherBump(L) {
  return (ctx, w, h) => {
    ctx.fillStyle = gray(128);
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = gray(110);
    for (const q of L.wrinkles) qCurve(ctx, q);
    ctx.strokeStyle = gray(142);
    for (const q of L.highlights) qCurve(ctx, q);
  };
}

// ---------- §1.9 brass roughness ----------
function paintBrassRough(ctx, w, h) {
  const rnd = mulberry32(701);
  ctx.fillStyle = gray(90); // ≈0.35 base roughness
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1200; i++) {
    const g = Math.round(60 + rnd() * 70);
    ctx.fillStyle = `rgba(${g},${g},${g},0.5)`;
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, 1 + rnd() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 8; i++) { // long soft smudges
    const x = rnd() * w, y = rnd() * h, ang = rnd() * Math.PI;
    const g = Math.round(90 + (rnd() - 0.5) * 40);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const lg = ctx.createLinearGradient(-110, 0, 110, 0);
    lg.addColorStop(0, `rgba(${g},${g},${g},0)`);
    lg.addColorStop(0.5, `rgba(${g},${g},${g},0.55)`);
    lg.addColorStop(1, `rgba(${g},${g},${g},0)`);
    ctx.fillStyle = lg;
    ctx.fillRect(-110, -16, 220, 32);
    ctx.restore();
  }
}

// ---------- §1.10 papers ----------
function paintPaperWhite(ctx, w, h) {
  const rnd = mulberry32(801);
  ctx.fillStyle = '#e9e4d4';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(154,143,120,0.06)'; // #9a8f78 fiber flecks
  for (let i = 0; i < 300; i++) ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
  ctx.fillStyle = 'rgba(120,120,120,0.07)';
  for (let y = 28; y < h; y += 28) ctx.fillRect(0, y, w, 1);
}

function paintManila(ctx, w, h) {
  const rnd = mulberry32(802);
  ctx.fillStyle = '#c9a86a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(138,108,58,0.05)'; // #8a6c3a fibers
  ctx.lineWidth = 1;
  for (let i = 0; i < 500; i++) {
    const x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI * 2, len = 2 + rnd() * 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  const dk = 'rgba(80,60,30,0.08)', tr = 'rgba(80,60,30,0)';
  fade(ctx, 0, 0, w, 12, true, dk, tr);
  fade(ctx, 0, h - 12, w, 12, true, tr, dk);
  fade(ctx, 0, 0, 12, h, false, dk, tr);
  fade(ctx, w - 12, 0, 12, h, false, tr, dk);
}

function paintLegalPad(ctx, w, h) {
  const rnd = mulberry32(803);
  ctx.fillStyle = '#e8d96a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(122,143,176,0.5)'; // #7a8fb0 rules
  for (let y = 16; y < h; y += 16) ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = 'rgba(176,48,48,0.5)'; // red margin
  ctx.fillRect(40, 0, 1, h);
  ctx.strokeStyle = 'rgba(58,63,85,0.35)'; // #3a3f55 scribbles, top half
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const y = 12 + Math.floor(rnd() * 7) * 16;
    hStreak(ctx, 50 + rnd() * 120, y, 30 + rnd() * 40, 2, 12);
  }
}

// ---------- §1.11 frostedGlass ----------
function paintFrostedGlass(ctx, w, h) {
  const rnd = mulberry32(901);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#dfe9f2');   // sky
  g.addColorStop(0.7, '#f2e4c4');
  g.addColorStop(1, '#f7d9a8');   // sun haze
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 2500; i++) ctx.fillRect(rnd() * w, rnd() * h, 1, 1);
  ctx.save(); // diagonal glare band, upper third
  ctx.translate(w / 2, h * 0.31);
  ctx.rotate(-Math.PI / 6);
  const gl = ctx.createLinearGradient(0, -45, 0, 45);
  gl.addColorStop(0, 'rgba(255,255,255,0)');
  gl.addColorStop(0.5, 'rgba(255,255,255,0.10)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl;
  ctx.fillRect(-w, -45, w * 2, 90);
  ctx.restore();
}

// ---------- §1.12 marble ----------
function veinChain(rnd, segs) {
  let x = rnd() * 512, y = rnd() * 512, ang = rnd() * Math.PI * 2;
  const chain = [];
  for (let k = 0; k < segs; k++) {
    ang += (rnd() - 0.5) * 1.1;
    const step = 150 + rnd() * 130;
    const nx = x + Math.cos(ang) * step, ny = y + Math.sin(ang) * step;
    chain.push({
      x0: x, y0: y,
      cx: (x + nx) / 2 + (rnd() - 0.5) * 90, cy: (y + ny) / 2 + (rnd() - 0.5) * 90,
      x1: nx, y1: ny,
    });
    x = nx; y = ny;
  }
  return chain;
}

function marbleLayout() {
  const rnd = mulberry32(1001);
  const main = [], fine = [], clouds = [];
  for (let i = 0; i < 22; i++)
    main.push({ chain: veinChain(rnd, 2 + Math.round(rnd())), w: 1 + rnd() * 2 });
  for (let i = 0; i < 60; i++)
    fine.push({ chain: veinChain(rnd, 1), w: 1 });
  for (let i = 0; i < 14; i++)
    clouds.push({ x: rnd() * 512, y: rnd() * 512, r: 60 + rnd() * 120 });
  return { main, fine, clouds };
}

function drawChain(ctx, chain) {
  ctx.beginPath();
  ctx.moveTo(chain[0].x0, chain[0].y0);
  for (const s of chain) ctx.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1);
  ctx.stroke();
}

function paintMarble(L) {
  return (ctx, w, h) => {
    ctx.fillStyle = '#cfc9bd';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(122,114,98,0.28)';
    for (const v of L.main) {
      ctx.lineWidth = v.w;
      drawChain(ctx, v.chain);
    }
    ctx.strokeStyle = 'rgba(122,114,98,0.10)';
    ctx.lineWidth = 1;
    for (const v of L.fine) drawChain(ctx, v.chain);
    L.clouds.forEach((c, i) =>
      radial(ctx, c.x, c.y, c.r, i % 2 ? '150,140,120' : '255,255,255', 0.05));
  };
}

function paintMarbleBump(L) {
  return (ctx, w, h) => {
    ctx.fillStyle = gray(128);
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = gray(120);
    for (const v of L.main) {
      ctx.lineWidth = v.w;
      drawChain(ctx, v.chain);
    }
  };
}

// ---------- §1.13 / §2.4 shaft + sun-pool gradients ----------
function paintShaft(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, 0); // fades along +x (shaft length)
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; // muntin gaps
  for (const x of [58, 122, 186]) ctx.fillRect(x, 0, 12, h);
}

function paintPool(ctx, w, h) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.transform(1, 0, -0.45, 1, 60, 0); // 25° shear — projected pane grid
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let col = 0; col < 2; col++)
    for (let row = 0; row < 4; row++) {
      const x = 50 + col * 80, y = 14 + row * 58;
      for (let f = 0; f < 6; f++) // 12px layered feather
        rrect(ctx, x + f * 2, y + f * 2, 60 - f * 4, 48 - f * 4, 6);
    }
}

// ---------- §2.9 flags ----------
function paintFlagUS(ctx, w, h) {
  const sh = h / 13;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 ? '#ece8e1' : '#b22234';
    ctx.fillRect(0, i * sh, w, sh + 1);
  }
  ctx.fillStyle = '#3c3b6e';
  ctx.fillRect(0, 0, 120, 110);
  ctx.fillStyle = '#ece8e1';
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 9; c++) ctx.fillRect(6 + c * 13.2, 8 + r * 18, 3, 3);
}

function paintFlagState(ctx, w, h) {
  ctx.fillStyle = '#1d3a6e';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#caa84f';
  ctx.beginPath(); ctx.arc(128, 128, 70, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#1d3a6e';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(128, 128, 54, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#1d3a6e'; // 4-point star
  ctx.beginPath();
  ctx.moveTo(128, 84);
  ctx.lineTo(138, 118); ctx.lineTo(172, 128); ctx.lineTo(138, 138);
  ctx.lineTo(128, 172); ctx.lineTo(118, 138); ctx.lineTo(84, 128); ctx.lineTo(118, 118);
  ctx.closePath();
  ctx.fill();
}

// ---------- material library ----------

// MeshStandardMaterial with library defaults (roughness 1 so maps drive it).
function std(p) {
  return new THREE.MeshStandardMaterial({ roughness: 1.0, metalness: 0.0, ...p });
}

// buildMaterials(renderer) -> MATS. Texture instances may share canvases;
// repeats are baked per the design doc. Call once after renderer creation.
export function buildMaterials(renderer) {
  _maxAniso = renderer.capabilities.getMaxAnisotropy();
  const M = {};

  // §1.1 oak floor (26x32 plane, 2m tile -> repeat 13,16)
  const oakL = oakLayout();
  const oakMap = makeCanvasTexture(1024, paintOakAlbedo(oakL), { repeat: [13, 16] });
  M.floorOak = std({
    map: oakMap,
    roughnessMap: roughnessFromCanvas(oakMap, 0.55, 0.18),
    bumpMap: makeCanvasTexture(1024, paintOakBump(oakL), { srgb: false, repeat: [13, 16] }),
    bumpScale: 0.02, envMapIntensity: 0.55,
  });

  // §1.2 raised panel tile + §1.2b wainscot repeat variants (shared canvases)
  const panelMap = makeCanvasTexture(512, paintPanel);
  const panelRough = roughnessFromCanvas(panelMap, 0.45, 0.15);
  const panelBump = makeCanvasTexture(512, paintPanelBump([0], 332), { srgb: false });
  M.mahoganyPanel = std({
    map: panelMap, roughnessMap: panelRough, bumpMap: panelBump,
    bumpScale: 0.035, envMapIntensity: 0.5,
  });
  const wains = (rx, ry) => std({
    map: retex(panelMap, rx, ry),
    roughnessMap: retex(panelRough, rx, ry),
    bumpMap: retex(panelBump, rx, ry),
    bumpScale: 0.035, envMapIntensity: 0.5,
  });
  M.wainscotBack = wains(22, 2);
  M.wainscotFront = wains(9.5, 2);
  M.wainscotSide = wains(27, 2);

  // §2.3 two-panel door (512x1024)
  const doorMap = makeCanvasTexture([512, 1024], paintDoor);
  M.doorPanel = std({
    map: doorMap,
    roughnessMap: roughnessFromCanvas(doorMap, 0.45, 0.15),
    bumpMap: makeCanvasTexture([512, 1024], paintPanelBump([0, 450], 352), { srgb: false }),
    bumpScale: 0.035, envMapIntensity: 0.5,
  });

  // §1.3 plain mahogany — flat + gloss share albedo/bump, differ in roughness
  const flatL = flatLayout();
  const flatMap = makeCanvasTexture(512, paintFlat(flatL));
  const flatBump = makeCanvasTexture(512, paintFlatBump(flatL), { srgb: false });
  M.mahoganyFlat = std({
    map: flatMap, roughnessMap: roughnessFromCanvas(flatMap, 0.42, 0.12),
    bumpMap: flatBump, bumpScale: 0.012, envMapIntensity: 0.5,
  });
  M.mahoganyGloss = std({
    map: flatMap, roughnessMap: roughnessFromCanvas(flatMap, 0.28, 0.10),
    bumpMap: flatBump, bumpScale: 0.012, envMapIntensity: 0.9,
  });

  // §1.4 plaster walls (back 13,4.5 / side 16,4.5 over shared canvases)
  const plasterMap = makeCanvasTexture(512, paintPlaster, { repeat: [13, 4.5] });
  const plasterBump = makeCanvasTexture(512, paintPlasterBump, { srgb: false, repeat: [13, 4.5] });
  M.plasterBack = std({
    map: plasterMap, bumpMap: plasterBump, bumpScale: 0.008,
    roughness: 0.93, envMapIntensity: 0.6,
  });
  M.plasterSide = std({
    map: retex(plasterMap, 16, 4.5), bumpMap: retex(plasterBump, 16, 4.5),
    bumpScale: 0.008, roughness: 0.93, envMapIntensity: 0.6,
  });

  // §1.5 trim — geometry does the work
  M.plasterTrim = std({ color: 0xc8bda6, roughness: 0.85, envMapIntensity: 0.6 });

  // §1.6 coffered ceiling
  M.cofferCeiling = std({
    map: makeCanvasTexture(512, paintCoffer, { repeat: [13, 16] }),
    bumpMap: makeCanvasTexture(512, paintCofferBump, { srgb: false, repeat: [13, 16] }),
    bumpScale: 0.06, roughness: 0.9, envMapIntensity: 0.45,
  });

  // §1.7 well carpet
  M.carpet = std({
    map: makeCanvasTexture(512, paintCarpet, { repeat: [10, 6.4] }),
    bumpMap: makeCanvasTexture(512, paintCarpetBump, { srgb: false, repeat: [10, 6.4] }),
    bumpScale: 0.006, roughness: 0.97, envMapIntensity: 0.35,
  });

  // §1.8 leather (dark seats / green table inlay)
  const leather = (seed, fill, shadow) => {
    const L = leatherLayout(seed);
    const map = makeCanvasTexture(512, paintLeather(L, fill, shadow, 'rgba(190,150,110,0.04)'));
    return std({
      map, roughnessMap: roughnessFromCanvas(map, 0.48, 0.14, true),
      bumpMap: makeCanvasTexture(512, paintLeatherBump(L), { srgb: false }),
      bumpScale: 0.01, envMapIntensity: 0.45,
    });
  };
  M.leatherDark = leather(601, '#33231a', 'rgba(12,7,4,0.07)');
  M.leatherGreen = leather(602, '#1f3a2a', 'rgba(8,16,10,0.07)');

  // §1.9 brass — roughness map breaks up env reflections
  M.brass = std({
    color: 0xb08d4f, metalness: 0.92,
    roughnessMap: makeCanvasTexture(256, paintBrassRough, { srgb: false }),
    envMapIntensity: 1.3,
  });

  // §1.10 papers
  M.paperWhite = std({ map: makeCanvasTexture(256, paintPaperWhite), roughness: 0.95, envMapIntensity: 0.5 });
  M.manila = std({ map: makeCanvasTexture(256, paintManila), roughness: 0.9, envMapIntensity: 0.5 });
  M.legalPad = std({ map: makeCanvasTexture(256, paintLegalPad), roughness: 0.95, envMapIntensity: 0.5 });

  // §1.11 window glass — one canvas as both map and emissiveMap; this blooms
  const glassTex = makeCanvasTexture(256, paintFrostedGlass);
  M.frostedGlass = std({
    map: glassTex, emissiveMap: glassTex, emissive: 0xffffff, emissiveIntensity: 1.7,
    roughness: 0.4, envMapIntensity: 1.0,
  });

  // §1.12 marble
  const mbL = marbleLayout();
  const mbMap = makeCanvasTexture(512, paintMarble(mbL));
  M.marble = std({
    map: mbMap, roughnessMap: roughnessFromCanvas(mbMap, 0.30, 0.10, true),
    bumpMap: makeCanvasTexture(512, paintMarbleBump(mbL), { srgb: false }),
    bumpScale: 0.004, envMapIntensity: 0.8,
  });

  // §1.13 misc flats
  M.blackMatte = std({ color: 0x1d1b18, roughness: 0.7, envMapIntensity: 0.5 });
  M.clearGlass = std({
    color: 0xcfe2e8, transparent: true, opacity: 0.32, roughness: 0.08,
    envMapIntensity: 1.2, depthWrite: false,
  });
  M.screenGlow = std({ color: 0x10141a, emissive: 0x9fb6cc, emissiveIntensity: 0.7, roughness: 0.4, envMapIntensity: 0.5 });
  M.exitSign = std({ color: 0x1a0505, emissive: 0xff3b30, emissiveIntensity: 2.4, roughness: 0.6, envMapIntensity: 0.5 });
  M.bulbWarm = new THREE.MeshBasicMaterial({ color: 0xffd9a0 }); // blooms regardless of lighting
  M.lampGreen = std({ color: 0x1f6b45, emissive: 0x2f8f5b, emissiveIntensity: 0.8, roughness: 0.3, envMapIntensity: 0.6 });
  M.shaftMat = new THREE.MeshBasicMaterial({
    map: makeCanvasTexture(256, paintShaft),
    blending: THREE.AdditiveBlending, transparent: true, opacity: 0.07,
    depthWrite: false, side: THREE.DoubleSide,
  });
  M.poolMat = new THREE.MeshBasicMaterial({
    map: makeCanvasTexture(256, paintPool),
    blending: THREE.AdditiveBlending, transparent: true, opacity: 0.16,
    depthWrite: false, side: THREE.DoubleSide,
  });

  // §2.9 flags
  M.flagUS = std({ map: makeCanvasTexture(256, paintFlagUS), roughness: 0.85, side: THREE.DoubleSide, envMapIntensity: 0.5 });
  M.flagState = std({ map: makeCanvasTexture(256, paintFlagState), roughness: 0.85, side: THREE.DoubleSide, envMapIntensity: 0.5 });

  return M;
}

// Cached material clone whose canvas-backed maps are fresh CanvasTexture
// instances over the same canvases with repeat (rx, ry) — for odd-sized props.
const _variantCache = new WeakMap();
export function texVariant(MATS, key, rx, ry) {
  let cache = _variantCache.get(MATS);
  if (!cache) _variantCache.set(MATS, cache = new Map());
  const id = `${key}|${rx}|${ry}`;
  let mat = cache.get(id);
  if (mat) return mat;
  const src = MATS[key];
  mat = src.clone();
  for (const slot of ['map', 'roughnessMap', 'bumpMap', 'emissiveMap']) {
    const t = src[slot];
    if (t && t.userData.canvas) mat[slot] = retex(t, rx, ry);
  }
  cache.set(id, mat);
  return mat;
}
