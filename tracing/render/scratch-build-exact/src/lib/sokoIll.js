// The sōko page's hero illustration: the designer at his desk inside a wall of gear, white ink on black.
// Page coordinates (2206 x 946 = the full-frame page at 48.8–53.2 s). Every object was placed from labelled
// 2–4x grids of the source; see docs/soko.md.
//
// The source picture is painterly scratchboard: cartons carry soft, irregular vertical brush stripes (~5 px
// period) that fade into black at their shadowed edges; the designer is softly shaded and glows in the laptop
// light. So this is painted stroke by stroke (seeded, static) rather than cut by the engraving shader.
//
//   sokoIllCanvas({ gaze, scale })  cached canvas, PAGE_W*scale x PAGE_H*scale, black background
//                                   gaze: "owl" (eyes to his right, at the owl: 47.84–53.24) | "down" (69.44+)
//   sokoIllSmall(ctx, w, h)         the illustration stretched onto a laptop page (s01/s05/s07)
import { taper } from "./ink.js";
import { smoothPath, sampleCurve } from "./paths.js";
import { rng, noise1, noise2 } from "./rng.js";

const PW = 2206, PH = 946;
const PI = Math.PI;
const BLK = "#040404";
const W1 = "rgba(236,235,230,0.95)";          // ink white

// ---------- small helpers ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const grey = (v, a = 1) => { const c = Math.round(clamp(v) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };
const P2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const bil = (q, u, v) => P2(P2(q[0], q[1], u), P2(q[3], q[2], u), v);
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const polyPath = (g, pts) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
const blobPath = (g, pts) => { g.beginPath(); smoothPath(g, pts, true); };

// Blurred drawing without full-canvas filter layers: the shape is drawn into a small scratch canvas around its
// bounds, blurred there, and composited back (respecting the target's clip, alpha and composite mode).
let TA = null, TB = null;
function scratch(c, w, h) { if (!c || c.width < w || c.height < h) { c = document.createElement("canvas"); c.width = Math.max(w, c ? c.width : 0); c.height = Math.max(h, c ? c.height : 0); } return c; }
function blurDraw(g, bb, blur, draw) {
  const m = g.getTransform(), pad = blur * 3 + 2, xs = [], ys = [];
  for (const [x, y] of [[bb[0] - pad, bb[1] - pad], [bb[2] + pad, bb[1] - pad], [bb[0] - pad, bb[3] + pad], [bb[2] + pad, bb[3] + pad]]) { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); }
  const dx = Math.floor(Math.min(...xs)), dy = Math.floor(Math.min(...ys)), w = Math.ceil(Math.max(...xs)) - dx, h = Math.ceil(Math.max(...ys)) - dy;
  if (w <= 0 || h <= 0) return;
  TA = scratch(TA, w, h); TB = scratch(TB, w, h);
  const a = TA.getContext("2d", { willReadFrequently: true }), b = TB.getContext("2d", { willReadFrequently: true });
  a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, w, h); a.setTransform(m.a, m.b, m.c, m.d, m.e - dx, m.f - dy);
  draw(a);
  b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, w, h);
  b.filter = `blur(${(blur * Math.hypot(m.a, m.b)).toFixed(2)}px)`; b.drawImage(TA, 0, 0, w, h, 0, 0, w, h); b.filter = "none";
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(TB, 0, 0, w, h, dx, dy, w, h); g.restore();
}
const bboxOf = (pts, pad = 0) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]; };
const E = (x, y, rx, ry, a = 0) => Object.assign((c) => c.ellipse(x, y, rx, ry, a, 0, PI * 2), { bb: [x - Math.max(rx, ry), y - Math.max(rx, ry), x + Math.max(rx, ry), y + Math.max(rx, ry)] });
const Rc = (x, y, w, h) => Object.assign((c) => c.rect(x, y, w, h), { bb: [x, y, x + w, y + h] });

// fill a polygon (occluding base)
function fillPoly(g, pts, color = BLK) { polyPath(g, pts); g.fillStyle = color; g.fill(); }
function fillBlob(g, pts, color = BLK) { blobPath(g, pts); g.fillStyle = color; g.fill(); }
function dot(g, x, y, r, color = W1) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill(); }
function ring(g, x, y, r, w, color = W1, a0 = 0, a1 = PI * 2) { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); }

// an inked line through points (polyline, lightly jittered), width w with a gentle swell
function ink(g, pts, w = 2, color = BLK, { closed = false, seed = 1, ends = 0.7, jit = 0.4 } = {}) {
  const r = rng(seed);
  const q = closed ? [...pts, pts[0]] : pts;
  const dense = [];
  for (let i = 0; i < q.length - 1; i++) {
    const [x0, y0] = q[i], [x1, y1] = q[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6));
    for (let k = 0; k < n; k++) dense.push([x0 + (x1 - x0) * (k / n) + (r() - 0.5) * jit, y0 + (y1 - y0) * (k / n) + (r() - 0.5) * jit]);
  }
  dense.push(q[q.length - 1]);
  taper(g, dense, (u) => w * (ends + (1 - ends) * Math.sin(PI * u)), color);
}
// a smooth inked curve (Catmull-Rom)
function curve(g, pts, w = 2, color = BLK, { closed = false, seed = 1, ends = 0.4, jit = 0.3 } = {}) {
  const r = rng(seed);
  const q = sampleCurve(pts, 8, closed).map(([x, y]) => [x + (r() - 0.5) * jit, y + (r() - 0.5) * jit]);
  taper(g, q, (u) => w * (ends + (1 - ends) * Math.pow(Math.sin(PI * u), 0.5)), color);
}

// ---------- the stripe painter ----------
// Paint soft brush stripes across a quad q = [TL, TR, BR, BL]. dir "v": strokes run TL->BL (spaced along the top
// edge); "h": strokes run TL->TR (spaced down the left edge). cov(u, v) in 0..1 is the local line coverage
// (0 = black, 1 = stripes merge to white); lum is the stroke brightness. Strokes wander, vary in weight and
// brightness, and break up in the mid-tones.
function stripes(g, q, { per = 5, cov = 0.5, lum = 0.92, seed = 1, dir = "v", jit = 0.3, brk = 0.5, wav = 0.5, lumJit = 0.22, base = true } = {}) {
  if (base) fillPoly(g, q);
  const r = rng(seed);
  const cf = typeof cov === "number" ? () => cov : cov;
  const [A, B, Cc, D] = dir === "v" ? q : [q[0], q[3], q[2], q[1]];   // spacing along A->B, strokes A->D
  const lenS = (dist(A, B) + dist(D, Cc)) / 2, lenT = (dist(A, D) + dist(B, Cc)) / 2;
  const n = Math.max(1, Math.round(lenS / per));
  const step = 2.5, m = Math.max(2, Math.ceil(lenT / step));
  g.save(); polyPath(g, q); g.clip();
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5 + (r() - 0.5) * jit) / n;
    const wMul = 0.78 + r() * 0.4, lm = lum * (1 - lumJit + lumJit * r()), ph = r() * 100, ph2 = r() * 100, ph3 = r() * 100;
    let seg = [], ws = [];
    const flush = () => {
      if (seg.length > 1) taper(g, seg, (s) => ws[Math.min(ws.length - 1, Math.round(s * (ws.length - 1)))], grey(lm));
      seg = []; ws = [];
    };
    for (let k = 0; k <= m; k++) {
      const t = k / m, L = t * lenT;
      const p0 = dir === "v" ? bil(q, u, t) : bil(q, t, u);
      // weight swells slowly along the stroke; rare breaks where the tone is middling
      const c = clamp(cf(u, t) * wMul * (1 + 0.28 * noise1(L / 34 + ph3, i + 3 * seed)));
      const b = noise1(L / (per * 5) + ph, i + seed);
      const gap = c < 0.9 && b > 1 - brk * 0.55 * (1 - c);
      const off = noise1(L / 26 + ph2, seed + 7) * wav;
      const nx = dir === "v" ? off : 0, ny = dir === "v" ? 0 : off;
      if (c < 0.04 || gap) { flush(); continue; }
      seg.push([p0[0] + nx, p0[1] + ny]); ws.push(Math.min(per * 1.05, per * c));
    }
    flush();
  }
  g.restore();
}
// ---------- streamline hatching over a painted value study ----------
// A value study is painted (soft brushes, gradients, blur) into VAL, a page-size greyscale canvas; hatch() then
// traces lines along an angle field through a clipped region and gives each point a width of per * value:
// white lines on black that merge in the light and thin out to nothing in shadow (scratchboard).
let VAL = null, VALD = null;
function valCtx() {
  if (!VAL) { VAL = document.createElement("canvas"); VAL.width = PW; VAL.height = PH; }
  VALD = null;
  const v = VAL.getContext("2d", { willReadFrequently: true });
  return v;
}
// read the value study over a box (hatch() calls this for its own bounds)
function valPrepare(x0, y0, x1, y1) {
  x0 = Math.max(0, Math.floor(x0) - 4); y0 = Math.max(0, Math.floor(y0) - 4); x1 = Math.min(PW, Math.ceil(x1) + 4); y1 = Math.min(PH, Math.ceil(y1) + 4);
  VALD = { x0, y0, w: x1 - x0, h: y1 - y0, d: VAL.getContext("2d", { willReadFrequently: true }).getImageData(x0, y0, x1 - x0, y1 - y0).data };
}
function valAt(x, y) {
  const D = VALD;
  const xi = Math.max(0, Math.min(D.w - 1, Math.round(x) - D.x0)), yi = Math.max(0, Math.min(D.h - 1, Math.round(y) - D.y0));
  return D.d[(yi * D.w + xi) * 4] / 255;
}
function hatch(g, clipPts, { ang, per = 4, lum = 0.95, seed = 1, step = 2.2, jit = 0.35, gamma = 1, wMax = 1.08, base = true, baseV = 0, smooth = true, lumJit = 0.18, inv = false, alpha = 1, brk = 0, wn = 0 } = {}) {
  const angF = typeof ang === "number" ? () => ang : ang;
  if (base) { if (smooth) fillBlob(g, clipPts, grey(baseV)); else fillPoly(g, clipPts, grey(baseV)); }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of clipPts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, a0 = angF(cx, cy), nx = -Math.sin(a0), ny = Math.cos(a0);
  const half = Math.hypot(x1 - x0, y1 - y0) / 2 + per;
  valPrepare(x0, y0, x1, y1);
  const r = rng(seed);
  g.save(); g.beginPath(); if (smooth) smoothPath(g, clipPts, true); else { g.moveTo(clipPts[0][0], clipPts[0][1]); for (const p of clipPts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); } g.clip();
  const inBox = (x, y) => x > x0 - 4 && x < x1 + 4 && y > y0 - 4 && y < y1 + 4;
  for (let s = -half; s <= half; s += per) {
    const off = s + (r() - 0.5) * per * jit;
    const sx = cx + nx * off, sy = cy + ny * off;
    const wMul = 0.85 + r() * 0.3, lm = lum * (1 - lumJit + lumJit * r());
    // trace both ways along the field
    const pts = [];
    for (const dir of [-1, 1]) {
      let x = sx, y = sy; const seg = [];
      for (let k = 0; k < 2000 && inBox(x, y); k++) { const a = angF(x, y); x += Math.cos(a) * step * dir; y += Math.sin(a) * step * dir; seg.push([x, y]); }
      if (dir < 0) pts.push(...seg.reverse(), [sx, sy]); else pts.push(...seg);
    }
    let run = [], ws = [];
    const flush = () => { if (run.length > 1) taper(g, run, (u) => ws[Math.min(ws.length - 1, Math.round(u * (ws.length - 1)))], grey(lm, alpha)); run = []; ws = []; };
    const ph = r() * 100, li = Math.round(s / per);
    for (let k = 0; k < pts.length; k++) {
      const [x, y] = pts[k];
      const vv = inv ? 1 - valAt(x, y) : valAt(x, y);
      let w = per * Math.min(wMax, Math.pow(vv, gamma) * wMul * (1 + wn * noise1(k * step / 14 + ph, li + seed)));
      // short breaks along the line, mostly in the mid-tones
      if (brk && vv < 0.92 && noise1(k * step / (per * 4) + ph * 2, li * 7 + seed) > 1 - brk * 1.3 * (1 - vv)) w = 0;
      if (w < 0.22) { flush(); continue; }
      run.push([x, y]); ws.push(w);
    }
    flush();
  }
  g.restore();
}
// An axial direction field that follows a set of guide curves (inverse-distance weighted tangents), sampled on a
// coarse grid over a box; returns ang(x, y).
function curveField(curves, [x0, y0, x1, y1], cell = 6, fallback = PI / 2) {
  const samples = [];
  for (const c of curves) {
    const q = sampleCurve(c, 6);
    for (let i = 0; i < q.length - 1; i++) { const dx = q[i + 1][0] - q[i][0], dy = q[i + 1][1] - q[i][1], a = Math.atan2(dy, dx); samples.push([q[i][0], q[i][1], Math.cos(2 * a), Math.sin(2 * a)]); }
  }
  const nx = Math.ceil((x1 - x0) / cell) + 1, ny = Math.ceil((y1 - y0) / cell) + 1, grid = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * cell, y = y0 + j * cell; let sc = 0, ss = 0;
    for (const [px, py, c2, s2] of samples) { const w = 1 / ((px - x) ** 2 + (py - y) ** 2 + 40); sc += c2 * w; ss += s2 * w; }
    grid[j * nx + i] = samples.length ? Math.atan2(ss, sc) / 2 : fallback;
  }
  return (x, y) => {
    const fi = clamp((x - x0) / cell, 0, nx - 1), fj = clamp((y - y0) / cell, 0, ny - 1), i = Math.round(fi), j = Math.round(fj);
    return grid[j * nx + i];
  };
}

// paint helpers for the value study
function vFill(v, pts, val, { blur = 0, smooth = true, alpha = 1 } = {}) {
  VALD = null;
  const draw = (c) => { c.beginPath(); if (smooth) smoothPath(c, pts, true); else { c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); } c.fillStyle = typeof val === "number" ? grey(val) : val; c.fill(); };
  v.save(); v.globalAlpha = alpha;
  if (blur) blurDraw(v, bboxOf(pts), blur, draw); else draw(v);
  v.restore();
}
function vLine(v, pts, w, val, blur = 0, alpha = 1) {
  VALD = null;
  const draw = (c) => curve(c, pts, w, grey(val), { seed: 5, ends: 0.25, jit: 0 });
  v.save(); v.globalAlpha = alpha;
  if (blur) blurDraw(v, bboxOf(pts, w), blur, draw); else draw(v);
  v.restore();
}

// coverage helpers: along v (top->bottom), along u, bilinear corners, and edge fade
const vg = (a, b, e = 1) => (u, v) => lerp(a, b, Math.pow(v, e));
const ug = (a, b, e = 1) => (u, v) => lerp(a, b, Math.pow(u, e));
const bl = (tl, tr, br, bl_) => (u, v) => lerp(lerp(tl, tr, u), lerp(bl_, br, u), v);
const fadeEdges = (f, top = 0.08, bot = 0.12, left = 0, right = 0) => (u, v) => f(u, v) * sstep(0, top, v) * (1 - sstep(1 - bot, 1, v)) * (left ? sstep(0, left, u) : 1) * (right ? 1 - sstep(1 - right, 1, u) : 1);
const mul = (f, k) => (u, v) => f(u, v) * k;

// a carton: face quads with stripes, black gaps between, a lit top edge
function carton(g, front, { cov, per = 5, lum = 0.92, seed = 1, side = null, sideCov = 0, top = null, topCov = 0.5, topLum = 0.85, rim = 0.5, dir = "v", brk = 0.5 } = {}) {
  if (top) stripes(g, top, { per: 3.2, cov: topCov, lum: topLum, seed: seed + 3, dir: "h", brk: 0.3, jit: 0.2 });
  if (side) { if (sideCov) stripes(g, side, { per, cov: sideCov, lum: lum * 0.8, seed: seed + 5, brk }); else fillPoly(g, side); }
  stripes(g, front, { per, cov, lum, seed, dir, brk });
  if (rim > 0) ink(g, [front[0], front[1]], 1.6, grey(0.9, rim), { seed: seed + 9 });
}

// ======================================================================================
// LEFT BACK: the wall of cartons behind the headline, the lit carton, the guitar case, plants
// ======================================================================================
function leftBack(g) {
  // tall back cartons behind the headline (dim), their bottoms meeting the cartons in front
  stripes(g, [[12, 150], [80, 150], [80, 250], [12, 246]], { cov: fadeEdges(bl(0.28, 0.4, 0.34, 0.22), 0.02, 0.02), lum: 0.62, seed: 11 });
  stripes(g, [[80, 150], [332, 150], [332, 318], [80, 305]], { cov: fadeEdges(bl(0.3, 0.42, 0.4, 0.3), 0.02, 0.02), lum: 0.62, seed: 12 });
  // small lit carton face at the far left
  stripes(g, [[18, 244], [84, 258], [84, 302], [16, 316]], { cov: fadeEdges(bl(0.7, 0.45, 0.3, 0.55), 0.06, 0.06), lum: 0.82, seed: 13 });
  ink(g, [[18, 244], [84, 258]], 1.6, BLK, { seed: 131 });
  // the broad dark carton below (dim grain), with a small lit panel on it
  stripes(g, [[16, 317], [219, 289], [219, 420], [14, 420]], { cov: fadeEdges(bl(0.22, 0.32, 0.26, 0.16), 0.04, 0.02), lum: 0.6, seed: 14 });
  ink(g, [[16, 317], [219, 289]], 1.8, BLK, { seed: 141 });
  stripes(g, [[100, 306], [136, 303], [136, 344], [100, 346]], { cov: fadeEdges(vg(0.7, 0.4), 0.05, 0.05), lum: 0.8, seed: 15 });
  ink(g, [[100, 346], [136, 344]], 1.3, grey(0.75), { seed: 151 });
  // sticker on the back carton
  ink(g, [[130, 281], [181, 278], [182, 298], [131, 300]], 1.3, "rgba(215,215,205,0.6)", { closed: true, seed: 16 });
  // the lit carton, tipped toward the light: bright at its top-left, fading down and right
  stripes(g, [[219, 289], [320, 319], [322, 400], [219, 400]], { cov: fadeEdges(bl(1.0, 0.8, 0.55, 0.85), 0.02, 0.0), lum: 0.96, seed: 17, per: 5.5 });
  ink(g, [[219, 289], [320, 319]], 2, BLK, { seed: 18 });
  // a dark hanging coil between the cartons and the plant
  curve(g, [[330, 232], [338, 280], [334, 330], [340, 380]], 3, "rgba(70,70,68,0.7)", { seed: 191 });
  g.strokeStyle = "rgba(90,90,88,0.6)"; g.lineWidth = 2; g.beginPath(); g.ellipse(352, 276, 14, 20, 0.3, 0.3, 4.6); g.stroke();
  // hanging vine from above, three leaves
  curve(g, [[414, 180], [410, 205], [404, 232], [410, 262], [410, 272]], 1.1, "rgba(150,150,145,0.55)", { seed: 19 });
  leaf(g, 402, 226, 1.62, 32, 0.74, 20); leaf(g, 428, 236, 1.5, 26, 0.7, 21); leaf(g, 412, 272, 1.55, 33, 0.78, 22);
}

// a pothos leaf: heart-shaped, pale, dark midrib; (x, y) is the stem end, ang points to the tip, s = length
function leaf(g, x, y, ang, s, v = 0.72, seed = 1) {
  const pts = [];
  for (let i = 0; i < 20; i++) {
    const t = (i / 20) * PI * 2;
    const lx = (1 - Math.cos(t)) * 0.5 * s;                                     // 0 at stem, s at tip
    const k = lx / s;
    const wdt = s * 0.36 * Math.sin(t) * (k < 0.25 ? 0.7 + k * 1.2 : 1 - 0.55 * Math.pow((k - 0.25) / 0.75, 1.6));
    pts.push([x + lx * Math.cos(ang) - wdt * Math.sin(ang), y + lx * Math.sin(ang) + wdt * Math.cos(ang)]);
  }
  blobPath(g, pts);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const gr = g.createLinearGradient(x + nx * s * 0.35, y + ny * s * 0.35, x - nx * s * 0.35, y - ny * s * 0.35);
  gr.addColorStop(0, grey(v * 0.45)); gr.addColorStop(0.45, grey(v)); gr.addColorStop(0.55, grey(v * 0.9)); gr.addColorStop(1, grey(v * 0.7));
  g.fillStyle = gr; g.fill();
  g.strokeStyle = "rgba(8,8,8,0.9)"; g.lineWidth = 1.2; g.stroke();
  const tip = [x + s * Math.cos(ang), y + s * Math.sin(ang)];
  curve(g, [[x, y], P2([x, y], tip, 0.5), P2([x, y], tip, 0.9)], Math.max(0.8, s * 0.05), "rgba(15,15,15,0.85)", { seed, ends: 0.3 });
  for (let k = 1; k <= 2; k++) for (const sd of [-1, 1]) {
    const a = P2([x, y], tip, 0.22 + k * 0.22), l = s * 0.2;
    ink(g, [a, [a[0] + Math.cos(ang + sd * 0.8) * l, a[1] + Math.sin(ang + sd * 0.8) * l]], 0.7, "rgba(20,20,20,0.55)", { seed: seed + k * 3 + sd });
  }
}

function guitarCase(g) {
  // a tall black hard case leaning left: dark front, a thick side with two lit edges, two latches
  const front = [[43, 400], [55, 389], [70, 384], [90, 383], [100, 390], [100, 447], [90, 547], [77, 650], [4, 652], [10, 540], [14, 503]];
  fillBlob(g, front, "#080808");
  stripes(g, [[40, 410], [98, 410], [80, 646], [8, 648]], { cov: fadeEdges(vg(0.22, 0.12), 0.05, 0.05, 0.15, 0.15), lum: 0.55, seed: 30, per: 6, base: false });
  curve(g, [[14, 503], [26, 450], [43, 400], [60, 386], [90, 383], [100, 392], [100, 447], [90, 547], [77, 650]], 2.2, "rgba(225,225,220,0.85)", { seed: 31, ends: 0.6 });
  const side = [[100, 390], [120, 394], [140, 400], [143, 447], [133, 547], [127, 650], [77, 650], [90, 547], [100, 447]];
  fillPoly(g, side, "#060606");
  curve(g, [[103, 393], [140, 400], [143, 447], [133, 547], [127, 648]], 2, "rgba(220,220,215,0.8)", { seed: 32 });
  ink(g, [[120, 397], [123, 450], [118, 550], [113, 650]], 2.4, "rgba(235,235,230,0.9)", { seed: 33 });
  ink(g, [[130, 400], [132, 450], [127, 550], [122, 650]], 1.8, "rgba(210,210,205,0.75)", { seed: 34 });
  for (const [x0, y0, x1, y1] of [[120, 428, 147, 455], [105, 572, 145, 602]]) {
    fillPoly(g, [[x0, y0], [x1, y0 + 2], [x1, y1], [x0, y1 - 1]], grey(0.78));
    ink(g, [[x0, y0], [x1, y0 + 2], [x1, y1], [x0, y1 - 1]], 1.6, BLK, { closed: true, seed: x0 });
    fillPoly(g, [[x0 + 6, y0 + 7], [x1 - 6, y0 + 8], [x1 - 6, y1 - 7], [x0 + 6, y1 - 7]], grey(0.3));
  }
  ink(g, [[143, 510], [143, 527]], 2, grey(0.8), { seed: 35 });
}

function plantLeft(g) {
  // a dark bowl behind, the pot, then the leaf mass trailing down the right side
  fillBlob(g, [[355, 390], [390, 380], [430, 384], [432, 400], [360, 402]], grey(0.12));
  const pot = [[435, 362], [488, 360], [484, 395], [440, 398]];
  polyPath(g, pot); const pg = g.createLinearGradient(435, 0, 488, 0); pg.addColorStop(0, grey(0.3)); pg.addColorStop(0.65, grey(0.78)); pg.addColorStop(1, grey(0.45)); g.fillStyle = pg; g.fill();
  ink(g, pot, 1.4, BLK, { closed: true, seed: 40 });
  g.fillStyle = grey(0.7); g.beginPath(); g.ellipse(461, 361, 28, 4, -0.03, 0, PI * 2); g.fill();
  const L = [
    [452, 345, -2.1, 26], [468, 342, -1.4, 26], [480, 345, -0.9, 24], [440, 350, -2.8, 26], [490, 350, -0.3, 24], [458, 352, -1.8, 22],
    [495, 336, -0.8, 25], [448, 328, -1.95, 22], [470, 330, -1.2, 22], [428, 342, 3.0, 22], [420, 356, 2.8, 18], [504, 348, 0.2, 24],
    [512, 362, 1.0, 22], [528, 360, 1.3, 22], [510, 400, 1.35, 24], [520, 422, 1.45, 24], [522, 446, 1.5, 21], [515, 466, 1.6, 18],
    [540, 392, 1.3, 26], [548, 428, 1.45, 24], [546, 452, 1.55, 20], [500, 322, -0.6, 22], [436, 318, -2.2, 22],
  ];
  L.forEach(([x, y, a, s], i) => leaf(g, x, y, a, s, 0.56 + (i % 4) * 0.06, 50 + i * 3));
  curve(g, [[488, 362], [514, 380], [528, 404], [530, 440], [520, 470]], 1.1, "rgba(160,160,155,0.6)", { seed: 49 });
}

function leftMid(g) {
  // small gear boxes behind the plant
  carton(g, [[367, 350], [405, 348], [406, 392], [368, 394]], { cov: fadeEdges(vg(0.35, 0.2)), lum: 0.65, seed: 60, rim: 0.3 });
  for (const x of [373, 386]) fillPoly(g, [[x, 352], [x + 8, 351], [x + 8, 359], [x, 360]], grey(0.85));
  // the tray lying on the stack (bright top, dark lip)
  const tray = [[228, 399], [360, 396], [374, 411], [248, 424]];
  stripes(g, tray, { dir: "h", per: 3, cov: bl(0.95, 0.95, 0.85, 0.85), lum: 0.96, seed: 61, brk: 0.2 });
  ink(g, tray, 1.8, BLK, { closed: true, seed: 62 });
  fillPoly(g, [[248, 424], [374, 411], [375, 421], [249, 434]], grey(0.3));
  // carton under the plant: a lit lid, a striped left half, a smooth right panel with dark windows
  stripes(g, [[374, 399], [500, 398], [503, 408], [375, 410]], { dir: "h", per: 3, cov: 0.8, lum: 0.92, seed: 63, brk: 0.2 });
  stripes(g, [[375, 410], [430, 409], [431, 482], [376, 484]], { cov: fadeEdges(bl(0.7, 0.6, 0.4, 0.45), 0.02, 0.05), lum: 0.9, seed: 64 });
  stripes(g, [[430, 409], [503, 408], [506, 480], [431, 482]], { cov: fadeEdges(bl(0.75, 0.7, 0.55, 0.6), 0.02, 0.05), lum: 0.88, seed: 641, per: 3.2, brk: 0.2 });
  fillPoly(g, [[431, 409], [452, 409], [452, 433], [431, 434]], "#050505");
  fillPoly(g, [[477, 410], [498, 410], [498, 432], [477, 432]], "#070707");
  ink(g, [[431, 409], [452, 409], [452, 433], [431, 434]], 1.2, "rgba(220,220,215,0.75)", { closed: true, seed: 65 });
  ink(g, [[452, 434], [452, 482]], 2, grey(0.95), { seed: 651 });
  // carton under the tray: bright grain, down to the keyboard
  // (a dark box on the left, its lit frame; the bright carton face on the right)
  stripes(g, [[243, 423], [297, 425], [297, 560], [243, 560]], { cov: fadeEdges(bl(0.12, 0.16, 0.1, 0.08), 0.03, 0.02), lum: 0.6, seed: 66 });
  ink(g, [[247, 432], [247, 500], [290, 500]], 1.6, grey(0.55), { seed: 661 });
  stripes(g, [[297, 425], [387, 423], [388, 560], [297, 560]], { cov: fadeEdges(bl(0.9, 0.8, 0.6, 0.7), 0.03, 0.02), lum: 0.95, seed: 67 });
  ink(g, [[230, 423], [387, 422]], 1.6, BLK, { seed: 671 });
}

// the keyboard on its X-stand, the knob module, the control box, cables
function keyboardLeft(g) {
  // knob module: a dark cheek, a pale panel with a 3x7 grid of knobs
  fillPoly(g, [[335, 472], [380, 472], [380, 560], [335, 560]], "#080808");
  ink(g, [[335, 472], [380, 472]], 1.4, grey(0.5), { seed: 701 });
  stripes(g, [[380, 472], [505, 480], [508, 560], [380, 560]], { dir: "h", per: 4, cov: bl(0.7, 0.62, 0.55, 0.62), lum: 0.78, seed: 702, brk: 0.15, jit: 0.4 });
  ink(g, [[380, 472], [505, 480], [508, 560], [380, 560]], 1.8, BLK, { closed: true, seed: 703 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
    const x = 395 + c * 16.3, y = 491.5 + r * 24.5 + c * 0.35;
    dot(g, x, y + 1, 6.2, "#050505"); ring(g, x, y, 5, 1.2, "rgba(150,150,145,0.8)"); dot(g, x - 1.5, y - 2, 1.4, "rgba(240,240,235,0.9)");
  }
  // cables from the bottom row, hanging down and right
  for (const [x, dx] of [[411, 8], [445, 12], [461, 20], [477, 30]]) curve(g, [[x, 544], [x + 2, 560], [x + dx * 0.5, 590], [x + dx, 640], [x + dx + 6, 700]], 2.6, "#030303", { seed: x, ends: 0.8 });
  // keyboard: dark top panel with a knob row, black keys, white keys
  fillPoly(g, [[147, 552], [422, 552], [424, 600], [150, 610]], "#060606");
  stripes(g, [[170, 552], [422, 552], [422, 572], [170, 572]], { dir: "h", per: 3.5, cov: 0.22, lum: 0.7, seed: 704 });
  for (let i = 0; i < 15; i++) { const x = 180 + i * 16.5; dot(g, x, 563, 3.4, "#0a0a0a"); dot(g, x, 561, 2.2, "rgba(225,225,220,0.85)"); }
  const kx0 = 172, kx1 = 422, nw = 22, kw = (kx1 - kx0) / nw;
  polyPath(g, [[kx0, 577], [kx1, 577], [kx1, 598], [kx0, 598]]);
  const kg = g.createLinearGradient(0, 577, 0, 598); kg.addColorStop(0, grey(0.97)); kg.addColorStop(1, grey(0.78)); g.fillStyle = kg; g.fill();
  for (let i = 0; i <= nw; i++) ink(g, [[kx0 + i * kw, 578], [kx0 + i * kw, 598]], 1.1, "rgba(20,20,20,0.9)", { seed: 710 + i, jit: 0.1 });
  for (let i = 0; i < nw; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) {
    const x = kx0 + (i + 1) * kw - kw * 0.32;
    fillPoly(g, [[x, 571], [x + kw * 0.64, 571], [x + kw * 0.64, 589], [x, 589]], "#070707");
    ink(g, [[x + 1, 572], [x + kw * 0.64 - 1, 572]], 1.4, "rgba(220,220,215,0.8)", { seed: 720 + i, jit: 0.1 });
  }
  ink(g, [[kx0, 598], [kx1, 598]], 1.6, BLK, { seed: 730 });
  fillPoly(g, [[150, 598], [424, 598], [424, 612], [152, 614]], grey(0.12));
  // the left cheek of the keyboard
  fillPoly(g, [[147, 552], [172, 552], [172, 600], [160, 612], [150, 606]], "#0b0b0b");
  ink(g, [[160, 580], [227, 607]], 2.2, grey(0.6), { seed: 731 });
  // control box at the keyboard's right end
  fillPoly(g, [[422, 585], [492, 583], [494, 624], [423, 626]], "#0c0c0c");
  ink(g, [[422, 585], [492, 583]], 1.6, grey(0.8), { seed: 732 });
  for (let i = 0; i < 4; i++) { dot(g, 437 + i * 16.5, 582, 3.2, "#0a0a0a"); dot(g, 437 + i * 16.5, 580.5, 2, grey(0.9)); }
  stripes(g, [[492, 560], [516, 560], [516, 622], [494, 622]], { cov: fadeEdges(vg(0.7, 0.5)), lum: 0.85, seed: 733 });
  // X-stand: the rail, hinge brackets, legs
  stripes(g, [[147, 624], [500, 621], [500, 641], [147, 646]], { dir: "h", per: 3.4, cov: bl(0.7, 0.95, 0.9, 0.6), lum: 0.95, seed: 740, brk: 0.25 });
  ink(g, [[147, 646], [500, 641]], 1.6, BLK, { seed: 741 });
  fillPoly(g, [[340, 645], [475, 642], [475, 760], [340, 760]], "#030303");
  for (const [x0, x1, y1, s] of [[323, 340, 822, 742], [475, 492, 780, 743]]) {
    stripes(g, [[x0, 642], [x1, 642], [x1, y1], [x0, y1]], { per: 3.4, cov: fadeEdges(ug(0.95, 0.45), 0, 0.06), lum: 0.93, seed: s, brk: 0.2 });
    ink(g, [[x1, 642], [x1, y1]], 1.4, BLK, { seed: s + 1 });
  }
  for (const [pts, bx, by] of [[[[296, 628], [352, 626], [352, 660], [330, 666], [300, 650]], 333, 641], [[[471, 623], [493, 622], [493, 660], [474, 658]], 486, 631]]) {
    fillPoly(g, pts, grey(0.85)); ink(g, pts, 1.6, BLK, { closed: true, seed: bx });
    dot(g, bx, by, 4.5, "#101010"); dot(g, bx - 1, by - 1, 1.6, grey(0.8));
  }
  // a hinge at the rail's left end
  fillPoly(g, [[147, 626], [165, 626], [165, 646], [147, 646]], grey(0.7));
  // cable loop from the keyboard down over the cartons
  curve(g, [[153, 534], [172, 540], [180, 560]], 2.4, "rgba(215,215,210,0.8)", { seed: 750 });
  curve(g, [[172, 652], [196, 660], [206, 690], [204, 722], [198, 746]], 3.4, "#040404", { seed: 751, ends: 0.9 });
  curve(g, [[171, 651], [195, 659], [205, 690], [203, 722], [197, 746]], 1.6, "rgba(220,220,215,0.85)", { seed: 752 });
}

function leftLow(g) {
  // upper carton: a dim side face on the left, a bright front
  stripes(g, [[14, 656], [72, 655], [72, 752], [14, 752]], { cov: fadeEdges(bl(0.5, 0.55, 0.45, 0.4), 0.02, 0.02), lum: 0.78, seed: 800 });
  stripes(g, [[72, 655], [172, 655], [172, 752], [72, 752]], { cov: fadeEdges(bl(0.95, 0.75, 0.6, 0.85), 0.02, 0.02), lum: 0.95, seed: 801 });
  ink(g, [[14, 656], [172, 655]], 1.8, grey(0.9), { seed: 802 });
  ink(g, [[72, 656], [72, 752]], 1.6, BLK, { seed: 803 });
  // a small device on top of it
  fillPoly(g, [[145, 648], [200, 650], [202, 680], [148, 678]], grey(0.2)); ink(g, [[145, 648], [200, 650]], 1.4, grey(0.8), { seed: 804 });
  // lower carton with a lifted flap
  stripes(g, [[14, 753], [232, 752], [232, 870], [14, 870]], { cov: fadeEdges((u, v) => (u < 0.28 ? 0.55 : 0.9) * lerp(1, 0.7, v), 0.02, 0.04), lum: 0.95, seed: 805 });
  ink(g, [[14, 753], [232, 752]], 1.8, grey(0.9), { seed: 806 });
  ink(g, [[75, 753], [75, 870]], 1.6, BLK, { seed: 807 });
  stripes(g, [[95, 745], [210, 744], [215, 754], [98, 755]], { dir: "h", per: 3, cov: 0.85, lum: 0.92, seed: 808 });
  // small boxes on the floor to its right
  fillPoly(g, [[250, 826], [290, 824], [291, 862], [251, 863]], grey(0.55)); ink(g, [[250, 826], [290, 824], [291, 862], [251, 863]], 1.3, BLK, { closed: true, seed: 809 });
  dot(g, 280, 815, 4, grey(0.75));
  // pedal: pale wooden box, four knobs on top, jacks in front
  stripes(g, [[272, 812], [366, 812], [368, 830], [270, 830]], { dir: "h", per: 3, cov: 0.8, lum: 0.9, seed: 810 });
  stripes(g, [[270, 830], [368, 830], [370, 862], [272, 862]], { dir: "h", per: 3, cov: 0.9, lum: 0.9, seed: 811 });
  ink(g, [[270, 830], [368, 830]], 1.4, BLK, { seed: 812 });
  for (const x of [281, 305, 320, 343]) { fillPoly(g, [[x - 6, 800], [x + 6, 800], [x + 6, 816], [x - 6, 816]], "#0b0b0b"); g.fillStyle = grey(0.85); g.beginPath(); g.ellipse(x, 800, 6, 2.4, 0, 0, PI * 2); g.fill(); }
  for (const x of [290, 306, 348, 362]) dot(g, x, 846, 3, "#111");
  // records leaning: a pale slab with a shadowed edge
  stripes(g, [[368, 712], [400, 710], [400, 846], [370, 846]], { cov: fadeEdges(ug(0.45, 0.7), 0.02, 0.02), lum: 0.85, seed: 820 });
  stripes(g, [[400, 710], [432, 712], [432, 845], [400, 846]], { cov: fadeEdges(vg(0.98, 0.8), 0.01, 0.02), lum: 0.97, seed: 821, per: 4 });
  ink(g, [[368, 712], [432, 712], [432, 845], [370, 846]], 1.6, BLK, { closed: true, seed: 822 });
  // amp: black top with a handle, white body, an emblem and a panel line
  fillPoly(g, [[440, 716], [584, 716], [584, 736], [440, 736]], "#070707");
  fillPoly(g, [[515, 724], [556, 724], [556, 736], [515, 736]], grey(0.75));
  stripes(g, [[432, 736], [584, 736], [584, 848], [432, 848]], { cov: fadeEdges(bl(0.97, 0.95, 0.85, 0.9), 0.0, 0.03), lum: 0.97, seed: 823, per: 3.4, brk: 0.15, lumJit: 0.12 });
  ink(g, [[432, 736], [584, 736]], 1.4, BLK, { seed: 824 });
  ink(g, [[433, 778], [584, 776]], 1.2, "rgba(40,40,40,0.7)", { seed: 825 });
  ink(g, [[470, 766], [475, 755], [481, 766]], 1.6, "rgba(30,30,30,0.9)", { seed: 826 });
  ink(g, [[472, 762], [479, 762]], 1.2, "rgba(30,30,30,0.9)", { seed: 827 });
  ink(g, [[432, 736], [432, 848]], 1.6, BLK, { seed: 828 });
  // a thick black cable across the amp
  curve(g, [[372, 834], [410, 800], [456, 742], [470, 712]], 6, "#030303", { seed: 829, ends: 0.9 });
  curve(g, [[371, 832], [409, 798], [455, 740], [469, 711]], 1.4, "rgba(210,210,205,0.7)", { seed: 830 });
  curve(g, [[470, 850], [520, 836], [562, 822]], 5, "#030303", { seed: 831, ends: 0.9 });
}

// ======================================================================================
// LEFT-CENTRE: speaker with books, rack unit, crate with books, pedalboard, the DO NOT KNOCK plate
// ======================================================================================
function book(g, pts, { lum = 0.95, cov = 0.85, seed = 1, spine = 0.25, k = 1 } = {}) {
  // a closed book seen edge-on: page edges as fine horizontal lines, a darker spine end on the left
  stripes(g, pts, { dir: "h", per: 2.6, cov: (u, v) => k * cov * lerp(spine / cov, 1, sstep(0, 0.18, u)) * (1 - 0.25 * v), lum, seed, brk: 0.2, jit: 0.2, wav: 0.2 });
  ink(g, pts, 1.3, BLK, { closed: true, seed: seed + 1 });
}
function speakerL(g) {
  // books on top
  book(g, [[555, 443], [650, 441], [652, 460], [556, 461]], { seed: 1001, k: 0.62 });
  book(g, [[530, 460], [655, 458], [657, 478], [531, 479]], { seed: 1003, k: 0.62 });
  book(g, [[535, 478], [665, 477], [666, 493], [536, 494]], { seed: 1005, k: 0.62 });
  book(g, [[525, 493], [670, 492], [671, 506], [526, 507]], { seed: 1007, lum: 0.9, k: 0.62 });
  // cabinet: dim grained front, bright grained side
  stripes(g, [[522, 506], [632, 506], [632, 704], [522, 704]], { per: 4.2, cov: fadeEdges(bl(0.15, 0.2, 0.12, 0.08), 0.02, 0.02), lum: 0.6, seed: 1010 });
  stripes(g, [[632, 506], [700, 512], [700, 612], [632, 612]], { per: 4.6, cov: fadeEdges(bl(0.9, 0.8, 0.7, 0.85), 0.02, 0.0), lum: 0.95, seed: 1011 });
  ink(g, [[632, 506], [632, 612]], 1.6, BLK, { seed: 1012 });
  ink(g, [[522, 506], [632, 506], [700, 512]], 1.8, grey(0.85), { seed: 1013 });
  driver(g, 578, 543, 20, "tweeter");
  driver(g, 578, 613, 46, "woofer");
  // the tall rack unit beside it
  stripes(g, [[678, 447], [710, 447], [712, 640], [680, 640]], { per: 3.4, cov: fadeEdges(ug(0.75, 0.35)), lum: 0.9, seed: 1020 });
  ink(g, [[678, 447], [710, 447], [712, 640], [680, 640]], 1.5, BLK, { closed: true, seed: 1021 });
  for (const y of [490, 506, 560, 600]) { dot(g, 692, y, 4, "#0a0a0a"); ring(g, 692, y, 4.2, 1.2, grey(0.85)); }
}
function driver(g, cx, cy, r, kind) {
  if (kind === "woofer") {
    dot(g, cx, cy, r, "#070707");
    ring(g, cx, cy, r - 1, 2, grey(0.75));
    ring(g, cx, cy, r * 0.86, 1.2, grey(0.35));
    const gr = g.createRadialGradient(cx - r * 0.12, cy - r * 0.15, r * 0.2, cx, cy, r * 0.78);
    gr.addColorStop(0, grey(0.98)); gr.addColorStop(0.7, grey(0.9)); gr.addColorStop(1, grey(0.55));
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * 0.76, 0, PI * 2); g.fill();
    for (let k = 0; k < 4; k++) ring(g, cx, cy, r * (0.42 + k * 0.09), 0.8, "rgba(60,60,60,0.35)");
    dot(g, cx, cy, r * 0.29, "#060606");
    dot(g, cx - r * 0.07, cy - r * 0.09, r * 0.05, grey(0.9));
  } else {
    dot(g, cx, cy, r, "#080808");
    ring(g, cx, cy, r - 1, 1.6, grey(0.7));
    const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r * 0.8);
    gr.addColorStop(0, grey(0.45)); gr.addColorStop(1, grey(0.08));
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * 0.75, 0, PI * 2); g.fill();
    dot(g, cx - r * 0.1, cy - r * 0.15, r * 0.14, grey(0.95));
  }
}
function crateAndBooks(g) {
  // device and book pile on the crate
  book(g, [[635, 628], [765, 626], [766, 643], [636, 644]], { seed: 1101 });
  book(g, [[640, 643], [770, 642], [771, 665], [641, 666]], { seed: 1103 });
  book(g, [[640, 665], [760, 664], [761, 683], [641, 684]], { seed: 1105 });
  book(g, [[630, 683], [765, 682], [766, 700], [631, 701]], { seed: 1107, lum: 0.9 });
  fillPoly(g, [[675, 610], [760, 610], [761, 628], [676, 628]], grey(0.62));
  ink(g, [[675, 610], [760, 610], [761, 628], [676, 628]], 1.3, BLK, { closed: true, seed: 1109 });
  fillPoly(g, [[688, 615], [704, 615], [704, 623], [688, 623]], "#080808");
  for (let i = 0; i < 3; i++) dot(g, 691 + i * 5, 619, 1.2, grey(0.9));
  // milk crate: pale rim with handle slots, posts, a diamond lattice over black
  fillPoly(g, [[628, 700], [765, 700], [765, 815], [628, 815]], "#050505");
  stripes(g, [[628, 700], [765, 700], [765, 714], [628, 714]], { dir: "h", per: 2.8, cov: 0.8, lum: 0.9, seed: 1110, brk: 0.1 });
  for (const [x0, x1] of [[636, 656], [668, 700], [710, 740], [750, 760]]) fillPoly(g, [[x0, 702], [x1, 702], [x1, 711], [x0, 711]], "#070707");
  g.save(); g.beginPath(); g.rect(642, 714, 108, 90); g.clip();
  for (let i = -3; i < 7; i++) {
    ink(g, [[642 + i * 30, 804], [642 + i * 30 + 90, 714]], 2.2, grey(0.7), { seed: 1120 + i, jit: 0.2 });
    ink(g, [[642 + i * 30, 714], [642 + i * 30 + 90, 804]], 2.2, grey(0.7), { seed: 1140 + i, jit: 0.2 });
  }
  g.restore();
  fillBlob(g, [[676, 716], [720, 716], [724, 728], [672, 728]], "#040404");
  ink(g, [[676, 716], [720, 716], [724, 728], [672, 728]], 1.2, grey(0.7), { closed: true, seed: 1160 });
  for (const [x0, x1] of [[628, 642], [750, 765]]) stripes(g, [[x0, 714], [x1, 714], [x1, 815], [x0, 815]], { per: 3, cov: ug(0.85, 0.5), lum: 0.9, seed: 1161 + x0 });
  ink(g, [[628, 815], [765, 815]], 1.4, grey(0.5), { seed: 1165 });
  // a second crate behind, to the right (dark lattice)
  g.save(); g.beginPath(); g.rect(766, 700, 34, 110); g.clip();
  for (let i = 0; i < 4; i++) ink(g, [[766, 720 + i * 26], [800, 700 + i * 26]], 1.4, grey(0.35), { seed: 1170 + i });
  g.restore();
}
function pedalboard(g) {
  fillPoly(g, [[572, 830], [692, 828], [694, 870], [570, 872]], "#070707");
  ink(g, [[572, 832], [692, 830]], 2, grey(0.8), { seed: 1201 });
  ink(g, [[692, 830], [694, 870]], 1.4, grey(0.5), { seed: 1202 });
  for (let i = 0; i < 7; i++) { const x = 588 + i * 15; g.fillStyle = grey(0.82); g.beginPath(); g.ellipse(x, 826, 5, 2.4, 0, 0, PI * 2); g.fill(); }
  for (const [x, y] of [[640, 853], [700, 856], [730, 850]]) { dot(g, x, y, 3.5, grey(0.25)); ring(g, x, y, 3.8, 1, grey(0.7)); }
  // small pale pedals to its right
  for (const [x0, y0, w, h] of [[740, 806, 40, 26], [782, 810, 22, 22]]) { fillPoly(g, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], grey(0.78)); ink(g, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], 1.2, BLK, { closed: true, seed: x0 }); dot(g, x0 + 10, y0 + 8, 3, "#111"); }
}
function doNotKnock(g) {
  const sgn = [[600, 194], [817, 171], [827, 270], [611, 293]];
  fillPoly(g, sgn, "#060606");
  ink(g, sgn, 2.6, grey(0.8), { closed: true, seed: 1301 });
  g.save();
  g.translate(611, 293); g.rotate(-0.106);
  for (const [x, y] of [[10, -12], [206, -12]]) ring(g, x, y, 3.3, 1.3, grey(0.78));
  g.font = "400 32px Geist"; g.fontStretch = "condensed"; g.fillStyle = grey(0.72); g.letterSpacing = "1px";
  g.save(); g.scale(0.74, 1.02); g.fillText("DO NOT KNOCK.", 17, -28); g.restore();
  g.font = "500 16px Geist"; g.fillStyle = grey(0.5, 0.55); g.fillText("MIXING.", 112, -76);
  g.letterSpacing = "0px"; g.fontStretch = "normal";
  g.restore();
}

// ======================================================================================
// CENTRE: the desk, the designer, laptop, mug, lamp and the gear on the desk
// ======================================================================================
function wallLight(g) {
  // the lamp throws a speckled pool of light on the wall (wallpaper swirls) below and left of its mouth
  g.save();
  g.beginPath(); g.ellipse(1330, 382, 42, 52, 0, 0, PI * 2); g.clip();
  const r = rng(1401);
  for (let i = 0; i < 300; i++) {
    const a = r() * PI * 2, d = Math.sqrt(r()) * 52;
    const x = 1330 + Math.cos(a) * d * 0.8, y = 382 + Math.sin(a) * d;
    const fall = clamp(1 - Math.hypot(x - 1345, y - 365) / 70);
    g.strokeStyle = grey(0.25 + 0.45 * fall, 0.15 + 0.55 * fall); g.lineWidth = 0.8 + fall * 0.5;
    g.beginPath(); g.arc(x, y, 1.8 + r() * 3.2, r() * 6, r() * 6 + 3.8); g.stroke();
  }
  g.restore();
}

function deskUnder(g) {
  // chair seat (dark slats) between his knees
  stripes(g, [[1030, 646], [1135, 646], [1138, 668], [1028, 668]], { per: 4, cov: 0.35, lum: 0.6, seed: 1410 });
  // left trestle: leg plank, a brace up to the top, a thin post behind, a foot bar
  stripes(g, [[823, 545], [845, 545], [838, 858], [813, 858]], { per: 3.2, cov: fadeEdges(ug(0.95, 0.4), 0, 0.03), lum: 0.93, seed: 1411, brk: 0.2 });
  ink(g, [[845, 545], [838, 858]], 1.4, BLK, { seed: 1412 });
  stripes(g, [[843, 574], [878, 546], [890, 548], [845, 590]], { dir: "h", per: 3, cov: 0.6, lum: 0.8, seed: 1413 });
  stripes(g, [[891, 588], [899, 588], [898, 800], [890, 800]], { per: 3, cov: 0.3, lum: 0.6, seed: 1414 });
  stripes(g, [[840, 800], [895, 800], [895, 812], [840, 812]], { dir: "h", per: 3, cov: 0.5, lum: 0.75, seed: 1415 });
  dot(g, 831, 614, 5.5, "#0c0c0c"); ring(g, 831, 614, 5.5, 1.4, grey(0.85)); dot(g, 831, 614, 2, grey(0.8));
  // right trestle: main leg, the long splayed plank, braces
  stripes(g, [[1298, 556], [1320, 556], [1280, 832], [1258, 830]], { dir: "v", per: 3.2, cov: fadeEdges(ug(0.9, 0.35), 0, 0.03), lum: 0.9, seed: 1420, brk: 0.2 });
  stripes(g, [[1342, 552], [1356, 552], [1350, 700], [1338, 700]], { per: 3.2, cov: 0.35, lum: 0.7, seed: 1421 });
  stripes(g, [[1395, 562], [1405, 556], [1436, 600], [1430, 608]], { dir: "h", per: 3, cov: 0.5, lum: 0.75, seed: 1422 });
  stripes(g, [[1433, 548], [1457, 548], [1465, 865], [1446, 865]], { per: 3.2, cov: fadeEdges(ug(0.95, 0.5), 0, 0.03), lum: 0.93, seed: 1423, brk: 0.2 });
  ink(g, [[1457, 548], [1465, 865]], 1.4, BLK, { seed: 1424 });
  dot(g, 1444, 617, 5.5, "#0c0c0c"); ring(g, 1444, 617, 5.5, 1.4, grey(0.85)); dot(g, 1444, 617, 2, grey(0.8));
}

// ---------- the designer ----------
function soft(g, path, fill, blur = 0, alpha = 1) {
  const draw = (c) => { c.beginPath(); path(c); c.fillStyle = fill; c.fill(); };
  g.save(); g.globalAlpha = alpha;
  if (blur && path.bb) blurDraw(g, path.bb, blur, draw);
  else { if (blur) g.filter = `blur(${blur}px)`; draw(g); }
  g.restore();
}
const pth = (pts, smooth = true) => Object.assign((g) => { if (smooth) smoothPath(g, pts, true); else { g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); } }, { bb: bboxOf(pts, 4) });
const lg = (g, x0, y0, x1, y1, stops) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, typeof v === "number" ? grey(v) : v)); return r; };
const rg = (g, x, y, r0, r1, stops, sy = 1) => { const r = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, v]) => r.addColorStop(o, typeof v === "number" ? grey(v) : v)); return r; };

// The trousers: one shape per leg; the value study carries the lit fold ridges and black creases, and the
// hatching follows the folds (a direction field built from the same fold curves).
function pants(g) {
  const v = valCtx();
  v.fillStyle = "#000"; v.fillRect(0, 0, PW, PH);
  const L = [[929, 548], [1030, 548], [1048, 600], [1056, 640], [1060, 706], [1066, 745], [1062, 772], [1020, 778], [975, 772], [935, 772], [928, 755], [924, 700], [926, 625]];
  const R = [[1135, 548], [1250, 550], [1272, 590], [1282, 630], [1285, 687], [1270, 735], [1256, 760], [1250, 772], [1210, 777], [1170, 772], [1131, 774], [1129, 762], [1135, 706], [1141, 625]];
  const legs = [
    { pts: L, box: [920, 550, 1070, 780], seed: 1500,
      hi: [[[940, 567], [952, 600], [967, 631], [982, 660], [995, 690], [1013, 731]], [[958, 558], [980, 590], [999, 617], [1014, 645], [1026, 672], [1045, 713]], [[933, 610], [935, 645], [940, 676], [948, 705], [958, 731]], [[995, 700], [1020, 705], [1045, 725]], [[1005, 570], [1015, 600], [1025, 630]]],
      lo: [[[972, 595], [988, 630], [1004, 667], [1015, 695], [1026, 722]], [[945, 676], [958, 705], [972, 731]], [[990, 560], [1000, 585]], [[1030, 640], [1040, 670], [1050, 700]]] },
    { pts: R, box: [1115, 555, 1290, 780], seed: 1520,
      hi: [[[1244, 576], [1226, 604], [1208, 631], [1195, 658], [1181, 685], [1154, 731]], [[1217, 567], [1204, 595], [1190, 622], [1176, 650], [1163, 676]], [[1276, 608], [1276, 640], [1272, 676], [1265, 705], [1254, 731]], [[1175, 700], [1160, 715], [1140, 730]]],
      lo: [[[1235, 590], [1226, 606], [1212, 631], [1199, 658], [1185, 690], [1172, 713]], [[1258, 640], [1252, 680], [1240, 715]], [[1200, 570], [1190, 590]]] },
  ];
  for (const leg of legs) {
    const r = rng(leg.seed);
    vFill(v, leg.pts, lg(v, 0, 556, 0, 775, [[0, 0.12], [0.25, 0.28], [0.75, 0.33], [1, 0.28]]), { smooth: false });
    v.save(); polyPath(v, leg.pts); v.clip();
    for (const f of leg.hi) { vLine(v, f, 11, 0.55, 4); vLine(v, f, 4, 0.9, 1.5); }
    for (const f of leg.lo) vLine(v, f, 8, 0.03, 2.5);
    // the hem: soft horizontal bunching
    const [bx0, , bx1] = leg.box;
    for (let i = 0; i < 4; i++) { const y = 740 + i * 9 + r() * 3; vLine(v, [[bx0, y + 3], [lerp(bx0, bx1, 0.3), y - 3], [lerp(bx0, bx1, 0.65), y + 3], [bx1, y - 2]], 4.5, i % 2 ? 0.92 : 0.06, 1.5); }
    v.restore();
    const fieldCurves = [...leg.hi, ...leg.lo];
    const f = curveField(fieldCurves, leg.box);
    hatch(g, leg.pts, { ang: (x, y) => f(x, y) + 0.1 * noise2(x / 24, y / 24, leg.seed), per: 2.6, seed: leg.seed + 1, smooth: false, baseV: 0.2, gamma: 1.15, brk: 0.15, wn: 0.5, lum: 0.88 });
    // crease ink and the outline
    for (const [i, c] of leg.lo.entries()) curve(g, c, 2.2, BLK, { seed: leg.seed + 10 + i, ends: 0.1 });
    curve(g, leg.pts, 1.6, BLK, { closed: true, seed: leg.seed + 30, ends: 0.9 });
  }
  // the cargo flap on the right leg
  const flap = [[1249, 567], [1276, 599], [1285, 640], [1281, 667], [1262, 655], [1252, 610]];
  vFill(v, flap, lg(v, 1249, 567, 1285, 667, [[0, 0.95], [1, 0.35]]), { smooth: false });
  hatch(g, flap, { ang: 1.75, per: 3.2, seed: 1541, smooth: false });
  ink(g, flap, 1.4, BLK, { closed: true, seed: 1540 });
  // the chair between his knees: striped seat front, a dark leg
  stripes(g, [[1040, 649], [1145, 649], [1145, 667], [1040, 667]], { per: 4.2, cov: 0.7, lum: 0.85, seed: 1541 });
  fillPoly(g, [[1072, 668], [1090, 668], [1088, 767], [1074, 767]], grey(0.08));
}

// a hiking sneaker seen three-quarter from the front; m = +1 for his right shoe (our left, toe to our left),
// -1 for his left (mirrored about cx). Coordinates are for the right shoe, measured at 5x.
function shoe(g, cx, m, k, seed) {
  const X = (x) => cx + (x - 982) * m * k;
  const P = (pts) => pts.map(([x, y]) => [X(x), y]);
  const v = valCtx();
  // dark upper
  const up = P([[931, 848], [934, 812], [955, 792], [990, 785], [1025, 789], [1050, 804], [1058, 845]]);
  vFill(v, up, rg(v, X(990), 800, 5, 70, [[0, 0.24], [1, 0.08]]));
  hatch(g, up, { ang: m > 0 ? 1.9 : PI - 1.9, per: 2.4, seed, lum: 0.8, baseV: 0.12, wn: 0.5 });
  curve(g, up, 1.6, BLK, { closed: true, seed: seed + 1, ends: 0.9 });
  // tongue with a pale pull tab
  fillBlob(g, P([[973, 771], [1007, 771], [1008, 790], [972, 790]]), grey(0.4));
  fillBlob(g, P([[982, 777], [1000, 777], [1000, 783], [982, 783]]), grey(0.9));
  // laces: the bow and the crossings
  const lw = grey(0.96);
  curve(g, P([[988, 800], [970, 792], [952, 795], [962, 806], [985, 803]]), 2.4, lw, { seed: seed + 2 });
  curve(g, P([[990, 800], [1005, 793], [1020, 800], [1012, 814], [992, 804]]), 2.4, lw, { seed: seed + 3 });
  curve(g, P([[986, 804], [975, 815], [966, 823]]), 2.2, lw, { seed: seed + 4 });
  curve(g, P([[990, 804], [1000, 818], [1004, 828]]), 2.2, lw, { seed: seed + 5 });
  for (let i = 0; i < 3; i++) curve(g, P([[944 + i * 4, 812 + i * 7], [965, 808 + i * 7], [990, 812 + i * 6]]), 2.2, lw, { seed: seed + 6 + i });
  // pale rubber toe cap
  const toe = P([[905, 853], [913, 830], [940, 820], [975, 822], [988, 842], [965, 852]]);
  vFill(v, toe, lg(v, X(905), 820, X(990), 850, [[0, 0.95], [1, 0.7]]));
  hatch(g, toe, { ang: m > 0 ? 0.35 : PI - 0.35, per: 2.2, seed: seed + 10, baseV: 0.3, lum: 0.9 });
  curve(g, toe, 1.4, BLK, { closed: true, seed: seed + 11, ends: 0.9 });
  // thick sole with lugs
  const sole = P([[900, 850], [1060, 843], [1063, 866], [1050, 874], [1000, 876], [905, 877], [897, 864]]);
  vFill(v, sole, lg(v, 0, 845, 0, 877, [[0, 0.9], [0.6, 0.75], [1, 0.45]]), { smooth: false });
  hatch(g, sole, { ang: PI / 2, per: 3.4, seed: seed + 12, smooth: false });
  ink(g, P([[901, 851], [1061, 845]]), 1.8, BLK, { seed: seed + 13 });
  for (let i = 0; i < 15; i++) { const x = lerp(906, 1056, i / 14); ink(g, P([[x, 866], [x, 877]]), 1.8, grey(0.05, 0.85), { seed: seed + 14 + i }); }
  ink(g, sole, 1.4, BLK, { closed: true, seed: seed + 30 });
  // the trouser hem falls over the top of the shoe
  const hem = P([[943, 757], [1062, 760], [1066, 800], [1040, 793], [1000, 786], [965, 780], [945, 772]]);
  vFill(v, hem, lg(v, 0, 757, 0, 800, [[0, 0.9], [0.5, 0.55], [1, 0.8]]));
  hatch(g, hem, { ang: m > 0 ? 0.5 : PI - 0.5, per: 2.6, seed: seed + 31, baseV: 0.2, wn: 0.5 });
  curve(g, hem, 1.4, BLK, { closed: true, seed: seed + 32, ends: 0.9 });
}

function torso(g) {
  // a pale open shirt over a tee, glowing in the laptop light: soft painted shading, a few inked folds
  const T = [[921, 525], [922, 470], [926, 446], [936, 418], [950, 399], [972, 386], [1000, 377], [1060, 373], [1127, 375], [1160, 381], [1190, 395], [1207, 414], [1216, 440], [1230, 461], [1242, 476], [1250, 492], [1250, 522]];
  fillBlob(g, T, grey(0.25));
  g.save(); g.beginPath(); smoothPath(g, T, true); g.clip();
  soft(g, pth(T), rg(g, 1065, 450, 15, 215, [[0, 0.97], [0.3, 0.88], [0.6, 0.72], [1, 0.5]]));
  soft(g, pth([[921, 430], [948, 398], [985, 390], [990, 440], [962, 520], [921, 520]]), grey(0.55), 12, 0.8);        // his right shoulder and sleeve, greyer
  soft(g, pth([[1175, 395], [1215, 420], [1252, 500], [1215, 522], [1180, 470]]), grey(0.6), 10, 0.8);   // his left side and sleeve
  soft(g, pth([[1150, 445], [1185, 455], [1200, 485], [1165, 488]]), grey(0.55), 7, 0.6);                // under the arm
  // soft grey folds
  const sf = [[[1004, 380], [1010, 405], [1020, 428], [1032, 440]], [[1130, 380], [1134, 408], [1140, 430], [1146, 446]], [[952, 425], [958, 460], [962, 500]],
    [[1180, 425], [1195, 455], [1206, 478]], [[1155, 455], [1168, 480], [1176, 505]], [[1212, 442], [1228, 468], [1242, 490]], [[938, 460], [944, 505]],
    [[1118, 470], [1142, 488], [1172, 498]], [[1210, 486], [1182, 494], [1152, 500]], [[1090, 460], [1105, 490], [1112, 515]]];
  for (const f of sf) blurDraw(g, bboxOf(f, 6), 2.2, (c) => curve(c, f, 4.5, grey(0.4, 0.75), { seed: 7, ends: 0.2, jit: 0 }));
  // the tee inside the open collar, a little brighter; the collar and placket edges
  soft(g, pth([[1036, 392], [1104, 392], [1100, 452], [1040, 452]]), grey(1), 6, 0.7);
  g.restore();
  curve(g, [[1036, 380], [1044, 405], [1054, 430]], 1.6, grey(0.25, 0.8), { seed: 1620 });
  curve(g, [[1102, 378], [1098, 402], [1090, 428]], 1.6, grey(0.25, 0.8), { seed: 1621 });
  const inkF = [[[1104, 378], [1112, 400], [1122, 425], [1130, 445]], [[1138, 420], [1148, 440], [1152, 452]], [[1000, 380], [1006, 402]], [[1180, 430], [1196, 460], [1206, 480]],
    [[1215, 445], [1232, 470], [1244, 490]], [[1150, 470], [1172, 482], [1192, 488]]];
  for (const [i, f] of inkF.entries()) curve(g, f, 1.3, grey(0.25, 0.75), { seed: 1610 + i, ends: 0.15 });
  // his left forearm along the desk to the books, the hand resting on them
  const arm = [[1112, 506], [1150, 494], [1195, 486], [1236, 480], [1250, 494], [1246, 522], [1112, 522]];
  soft(g, pth(arm, false), lg(g, 0, 482, 0, 522, [[0, 0.95], [1, 0.74]]));
  curve(g, [[1115, 506], [1150, 495], [1195, 487], [1236, 480]], 1.4, grey(0.25, 0.8), { seed: 1609 });
  curve(g, T.slice(0, -1), 2, grey(0.1), { seed: 1611, ends: 0.8 });
  // his right cuff peeking at the laptop's left bottom corner
  fillPoly(g, [[908, 520], [915, 494], [926, 487], [931, 520]], grey(0.86));
  // the halo of laptop light around him
  g.save(); g.globalCompositeOperation = "lighter";
  g.translate(1075, 440); g.scale(1, 110 / 190);
  const hr = g.createRadialGradient(0, 0, 0, 0, 0, 230); hr.addColorStop(0, grey(0.06)); hr.addColorStop(0.6, grey(0.035)); hr.addColorStop(1, grey(0));
  g.fillStyle = hr; g.beginPath(); g.arc(0, 0, 230, 0, PI * 2); g.fill();
  g.restore();
}

function head(g, gaze) {
  const down = gaze !== "owl";
  // neck: narrow, in shadow under the jaw, lit lower down
  soft(g, pth([[1048, 364], [1096, 364], [1099, 404], [1072, 414], [1045, 404]]), lg(g, 0, 364, 0, 412, [[0, 0.2], [0.45, 0.42], [1, 0.8]]));
  curve(g, [[1050, 372], [1048, 392], [1046, 404]], 1.2, grey(0.2, 0.7), { seed: 1699 });
  curve(g, [[1094, 372], [1096, 392], [1098, 404]], 1.2, grey(0.2, 0.7), { seed: 1698 });
  // headphones round the neck: tall cups seen edge-on, grooved rims, the band behind
  curve(g, [[1006, 386], [1030, 366], [1070, 360], [1110, 366], [1134, 386]], 4, grey(0.06), { seed: 1700 });
  for (const [cx, cy, a, sd] of [[1021, 404, 0.12, -1], [1115, 398, -0.12, 1]]) {
    g.save(); g.translate(cx, cy); g.rotate(a);
    soft(g, E(0, 0, 16, 31, 0), grey(0.05));
    for (let k = 0; k < 6; k++) { g.strokeStyle = grey(k % 2 ? 0.2 : 0.8, 0.9); g.lineWidth = 1.5; g.beginPath(); g.ellipse(sd * k * 0.8, 0, 14 - k * 2, 29 - k * 4, 0, 0, PI * 2); g.stroke(); }
    g.strokeStyle = grey(0.95); g.lineWidth = 2.2; g.beginPath(); g.ellipse(0, 0, 16, 31, 0, sd < 0 ? -2.4 : -0.7, sd < 0 ? 0.7 : 2.4); g.stroke();
    g.restore();
  }
  // hair behind the face: a black mass to about the jaw, ragged
  const hairBack = [[996, 262], [992, 296], [995, 330], [1003, 352], [1014, 362], [1026, 350], [1040, 320], [1070, 300], [1100, 320], [1114, 352], [1128, 364], [1140, 352], [1148, 326], [1150, 296], [1148, 264], [1070, 245]];
  fillBlob(g, hairBack, grey(0.02));
  // face: a longer, leaner face, pale in the laptop light
  const F = [[1016, 272], [1014, 300], [1017, 324], [1023, 343], [1034, 358], [1050, 369], [1066, 375], [1078, 376], [1092, 371], [1106, 360], [1117, 344], [1124, 324], [1127, 300], [1126, 272], [1070, 258]];
  fillBlob(g, F, grey(0.5));
  g.save(); g.beginPath(); smoothPath(g, F, true); g.clip();
  soft(g, pth(F), rg(g, 1066, 332, 6, 68, [[0, 0.98], [0.5, 0.94], [0.8, 0.84], [1, 0.66]]));
  soft(g, Rc(1000, 252, 150, 20), grey(0.45), 5, 0.85);                          // forehead in the hair's shadow
  soft(g, pth([[1104, 290], [1127, 286], [1128, 330], [1112, 352], [1104, 330]]), grey(0.5), 6, 0.8);   // his left cheek, in shade
  soft(g, pth([[1014, 296], [1026, 296], [1030, 340], [1020, 334]]), grey(0.62), 5, 0.7);               // his right cheek edge
  soft(g, pth([[1096, 318], [1112, 312], [1110, 346], [1098, 340]]), grey(0.68), 5, 0.6);               // under the cheekbone
  for (const x of [1037, 1101]) {
    soft(g, E(x, 283, 23, 10, 0), grey(0.56), 3.5, 0.75);   // socket
    soft(g, E(x, 296.5, 17, 4.6, 0), grey(0.28), 2.6, 0.8);   // dark tired bag
  }
  soft(g, pth([[1052, 298], [1059, 298], [1060, 322], [1053, 320]]), grey(0.7), 2.2, 0.6);   // left flank of the nose
  soft(g, pth([[1080, 300], [1087, 304], [1088, 326], [1080, 324]]), grey(0.6), 2.4, 0.75);  // right flank
  soft(g, E(1072, 334, 14, 3.4, 0), grey(0.5), 2, 0.85);        // under the nose
  soft(g, E(1073, 356, 16, 4, 0), grey(0.6), 2.2, 0.8);         // under the lower lip
  soft(g, E(1072, 377, 38, 8, 0), grey(0.42), 5, 0.85);         // under the jaw
  // pencil shading over it (dark lines where the value study is dark)
  const v = valCtx();
  v.fillStyle = "#fff"; v.fillRect(1000, 250, 140, 130);
  vFill(v, [[1104, 290], [1127, 286], [1128, 330], [1112, 352], [1104, 330]], 0.5, { blur: 5 });
  vFill(v, [[1014, 296], [1026, 296], [1030, 340], [1020, 334]], 0.6, { blur: 5 });
  vFill(v, [[1000, 250], [1140, 250], [1140, 272], [1000, 272]], 0.5, { blur: 5, smooth: false });
  vFill(v, [[1030, 360], [1112, 358], [1112, 380], [1030, 380]], 0.55, { blur: 4, smooth: false });
  hatch(g, F, { ang: 2.05, per: 2.2, seed: 1706, base: false, inv: true, lum: 0.2, alpha: 0.3, gamma: 1.5 });
  g.restore();
  curve(g, [[1015, 296], [1017, 324], [1023, 343], [1034, 358], [1050, 369], [1066, 375], [1078, 376], [1092, 371], [1106, 360], [1117, 344], [1124, 324], [1127, 300]], 1.2, grey(0.1), { seed: 1710, ends: 0.3 });
  // eyes: narrow, heavy-lidded, greyish whites; the irises to his right (at the owl) or down
  const eyes = [[1021, 1054, 1037, down ? 1038.5 : 1030.5, 1720, -1], [1085, 1119, 1101, down ? 1102 : 1094, 1730, 1]];
  for (const [x0, x1, cx, ix, seed, side] of eyes) {
    const lid = down ? 1.6 : 0;
    const eye = [[x0, 286], [cx - 9, 281 + lid], [cx + 7, 280.5 + lid], [x1, 285], [cx + 7, 290.5], [cx - 7, 291]];
    fillBlob(g, eye, grey(0.72));
    g.save(); g.beginPath(); smoothPath(g, eye, true); g.clip();
    soft(g, E(cx + 6, 287, 9, 3, 0), grey(0.8), 2, 0.7);                 // a little light on the white
    const iy = 285 + (down ? 1.6 : 0);
    dot(g, ix, iy, 6.6, grey(0.2)); dot(g, ix, iy, 4.6, grey(0.08)); dot(g, ix, iy, 2.4, grey(0));
    dot(g, ix - 1.8, iy - 2, 1.1, grey(0.9));
    soft(g, Rc(x0, 276, x1 - x0, 6.5 + lid), grey(0.1), 1.4, 0.9);     // the lid's shadow on the eye
    g.restore();
    curve(g, [[x0 - 3, 288], [cx - 10, 280.5 + lid], [cx + 6, 279.5 + lid], [x1 + 2.5, 285.5]], 3.4, grey(0.02), { seed, ends: 0.2 });   // upper lid
    const ox = side < 0 ? x0 : x1;
    for (let k = 0; k < 3; k++) ink(g, [[ox - side * k * 2.5 - side * 1, 286.5 - k * 1.8], [ox - side * k * 2.5 + side * 3.5, 283 - k * 2.2]], 0.9, grey(0.05, 0.85), { seed: seed + 10 + k });
    curve(g, [[x0 + 1, 276.5], [cx, 273.5], [x1 - 1, 277]], 1.1, grey(0.25, 0.8), { seed: seed + 1, ends: 0.3 });   // crease
    curve(g, [[x0 + 2.5, 290], [cx, 292], [x1 - 3, 289.5]], 1.1, grey(0.2, 0.85), { seed: seed + 2 });              // lower lid
    curve(g, [[x0 + 2, 295], [cx, 300], [x1 - 3, 295]], 1.2, grey(0.18, 0.7), { seed: seed + 3 });                  // bag line
  }
  // brows: dark, straight, the inner ends a little raised
  curve(g, [[1020, 270], [1036, 266], [1054, 267.5]], 3.2, grey(0.03), { seed: 1740, ends: 0.3 });
  curve(g, [[1083, 267], [1101, 265.5], [1119, 269.5]], 3.2, grey(0.03), { seed: 1741, ends: 0.3 });
  // nose: the bridge's left edge, a rounded tip, wings, nostrils
  curve(g, [[1057, 298], [1057, 310], [1058, 320]], 1, grey(0.3, 0.6), { seed: 1742 });
  curve(g, [[1059, 322], [1061, 328], [1066, 331], [1073, 331.5], [1079, 331], [1084, 328], [1086, 322]], 1.3, grey(0.22, 0.8), { seed: 1743 });
  soft(g, E(1065.5, 329, 2.4, 1.4, 0.2), grey(0.12), 0.6, 0.9); soft(g, E(1079.5, 329, 2.4, 1.4, -0.2), grey(0.12), 0.6, 0.9);
  curve(g, [[1083, 310], [1086, 322]], 1, grey(0.3, 0.7), { seed: 1744 });
  // mouth: a small, tired, down-turned line with a fuller lower lip
  curve(g, [[1051, 348.5], [1061, 346.8], [1072, 347.6], [1083, 346.8], [1095, 349.5]], 2, grey(0.08), { seed: 1745, ends: 0.25 });
  curve(g, [[1061, 343.3], [1072, 342.6], [1085, 343.3]], 0.9, grey(0.45, 0.5), { seed: 1746 });
  curve(g, [[1060, 356], [1073, 357.5], [1087, 356]], 1.1, grey(0.35, 0.7), { seed: 1747 });
  // sweat
  for (const [x, y, l] of [[1032, 314, 6], [1104, 332, 5], [1106, 321, 4], [1046, 261, 3], [1094, 258, 3]]) { ink(g, [[x, y], [x + 0.4, y + l]], 1.6, grey(0.25, 0.8), { seed: x }); dot(g, x + 0.4, y + l, 1.2, grey(0.95, 0.85)); }
  // beanie: dark grey knit, fine ribs, a deep folded cuff down over the ears
  const B = [[999, 272], [996, 244], [999, 212], [1009, 187], [1027, 170], [1052, 161], [1074, 159], [1096, 164], [1118, 178], [1134, 197], [1145, 222], [1149, 250], [1149, 275], [1146, 287], [1137, 275], [1124, 262], [1106, 253], [1081, 250], [1056, 252], [1031, 256], [1012, 262]];
  fillBlob(g, B, grey(0.2));
  g.save(); g.beginPath(); smoothPath(g, B, true); g.clip();
  soft(g, pth(B), rg(g, 1055, 175, 8, 125, [[0, 0.32], [0.5, 0.23], [1, 0.1]]));
  soft(g, pth([[1110, 170], [1150, 200], [1150, 290], [1120, 262], [1110, 220]]), grey(0.1), 12, 0.6);
  soft(g, pth([[994, 222], [1070, 214], [1150, 222], [1150, 240], [1070, 232], [994, 240]]), grey(0.33), 5, 0.6);   // the cuff's roll catches light
  const rb = rng(1750);
  for (let i = 0; i < 75; i++) {
    const x = 991 + i * 2.15 + rb() * 0.6, d = (x - 1070) / 80;
    const lite = rb() < 0.5;
    curve(g, [[1070 + (x - 1070) * 0.45, 158 + d * d * 26], [x, 207]], 0.8, grey(lite ? 0.5 : 0.08, 0.18), { seed: 1751 + i, ends: 0.4 });
    ink(g, [[x, 214], [x + d * 2, 292]], 0.85, grey(lite ? 0.48 : 0.08, 0.22), { seed: 1830 + i });
  }
  soft(g, pth([[990, 205], [1070, 199], [1152, 207], [1152, 215], [1070, 209], [990, 216]]), grey(0.04), 1.5, 0.9);  // the fold
  soft(g, pth([[990, 250], [1070, 240], [1152, 250], [1152, 295], [990, 295]]), grey(0.1), 8, 0.6);                // shade toward the brim
  g.restore();
  curve(g, [[996, 213], [1030, 207], [1068, 204.5], [1106, 206], [1146, 214]], 1.1, grey(0.45, 0.45), { seed: 1900 });
  curve(g, B, 1.2, grey(0.25, 0.8), { closed: true, seed: 1901, ends: 0.9 });
  // hair: a black fringe under the cuff with a ragged lower edge, strands falling over the brows and between
  // the eyes; short messy locks at the sides
  const strand = (pts, w, col) => { const q = sampleCurve(pts, 8); taper(g, q, (u) => w * Math.pow(1 - u, 0.85) + 0.3, col); };
  const rh = rng(1905);
  const fringe = [[1000, 256], [1030, 252], [1070, 249], [1110, 252], [1140, 260], [1142, 272], [1128, 276], [1120, 270], [1108, 278], [1098, 268], [1086, 274], [1076, 266],
    [1066, 276], [1058, 266], [1048, 274], [1040, 266], [1030, 276], [1020, 268], [1008, 280], [1000, 276]];
  fillBlob(g, fringe, grey(0.02));
  const locks = [
    [[1004, 262], [1008, 288], [1013, 312], [1012, 336], 10], [[1016, 262], [1022, 282], [1025, 300], 8], [[1027, 262], [1034, 276], [1038, 289], 7],
    [[1040, 260], [1047, 272], [1051, 284], 6], [[1050, 258], [1057, 276], [1056, 296], [1052, 308], 9], [[1062, 258], [1066, 274], [1064, 290], 6],
    [[1074, 258], [1082, 270], [1088, 280], 6], [[1088, 259], [1098, 270], [1104, 282], 6], [[1100, 262], [1111, 276], [1117, 292], 7], [[1113, 264], [1123, 283], [1127, 306], 9],
    [[1044, 260], [1040, 274], [1034, 283], 5], [[1068, 260], [1072, 280], [1070, 294], 4],
  ];
  for (const l of locks) { const w = l.pop(); strand(l, w, grey(0.02)); strand(l.map(([x, y], i) => [x + (rh() - 0.5) * 5 * i, y + (rh() - 0.3) * 3 * i]), w * 0.5, grey(0.02)); }
  for (const side of [-1, 1]) for (let i = 0; i < 14; i++) {
    const x = side < 0 ? 1008 - rh() * 10 : 1128 + rh() * 10, y = 262 + rh() * 40, len = 26 + rh() * 40, out = (rh() - 0.1) * 18;
    strand([[x, y], [x + side * out * 0.3, y + len * 0.5], [x + side * out, y + len]], 4 + rh() * 4, grey(0.02));
  }
  for (let i = 0; i < 24; i++) {
    const side = i % 2 ? 1 : -1, x = side < 0 ? 994 + rh() * 20 : 1128 + rh() * 20, y = 266 + rh() * 30;
    strand([[x, y], [x + side * 3, y + 20 + rh() * 12], [x + side * (6 + rh() * 10), y + 36 + rh() * 22]], 1 + rh() * 1.1, grey(0.3 + rh() * 0.25, 0.7));
  }
  for (let i = 0; i < 10; i++) { const x = 1012 + rh() * 115; strand([[x, 256], [x + (rh() - 0.5) * 8, 266 + rh() * 8]], 0.9, grey(0.35, 0.6)); }
}

function laptop(g) {
  const lid = [[914, 449], [1083, 449], [1112, 521], [898, 521]];
  fillPoly(g, lid, "#050505");
  ink(g, [[914, 449], [1083, 449]], 3.2, grey(0.95), { seed: 2001 });
  ink(g, [[1083, 449], [1112, 521]], 2.4, grey(0.92), { seed: 2002 });
  ink(g, [[914, 449], [898, 521]], 1.2, grey(0.5), { seed: 2003 });
  dot(g, 1010, 491, 9.5, grey(0.97));
}

function deskTop(g) {
  // the plank: lit long grain, darker ends, a dark underside
  stripes(g, [[770, 523], [1512, 522], [1512, 542], [770, 543]], { dir: "h", per: 3.2, cov: (u, v) => lerp(0.45, 0.8, Math.sin(PI * clamp(u * 1.1 - 0.05))) * (1 - 0.3 * v), lum: 0.9, seed: 2010, brk: 0.3, wav: 0.4 });
  ink(g, [[770, 523], [1512, 522]], 1.6, grey(0.97), { seed: 2011 });
  ink(g, [[770, 543], [1512, 542]], 1.6, BLK, { seed: 2012 });
  fillPoly(g, [[772, 544], [1510, 543], [1508, 556], [774, 557]], "#040404");
}

function mug(g) {
  const body = [[818, 472], [870, 472], [866, 521], [822, 521]];
  soft(g, pth(body, false), lg(g, 818, 0, 870, 0, [[0, 0.6], [0.35, 0.97], [0.7, 0.93], [1, 0.7]]));
  for (let i = 0; i < 5; i++) ink(g, [[826 + i * 9, 478], [827 + i * 9, 516]], 1, grey(0.5, 0.35), { seed: 2020 + i });
  ink(g, [[818, 472], [822, 521], [866, 521], [870, 472]], 1.5, BLK, { seed: 2025 });
  g.fillStyle = grey(0.85); g.beginPath(); g.ellipse(844, 472, 26, 4.5, 0, 0, PI * 2); g.fill();
  g.fillStyle = grey(0.12); g.beginPath(); g.ellipse(844, 473, 22, 3, 0, 0, PI * 2); g.fill();
  g.lineCap = "round";
  for (const [x, s] of [[818, -1], [870, 1]]) {
    g.strokeStyle = grey(0.1); g.lineWidth = 6; g.beginPath(); g.ellipse(x, 500, 13, 14, 0, s < 0 ? PI * 0.5 : -PI * 0.5, s < 0 ? PI * 1.5 : PI * 0.5); g.stroke();
    g.strokeStyle = grey(0.9); g.lineWidth = 3.4; g.beginPath(); g.ellipse(x, 500, 13, 14, 0, s < 0 ? PI * 0.5 : -PI * 0.5, s < 0 ? PI * 1.5 : PI * 0.5); g.stroke();
  }
  // steam: two soft wavy strands
  for (const [pts, seed] of [[[[841, 469], [830, 451], [837, 434], [829, 417], [821, 400], [830, 383]], 2030], [[[844, 466], [839, 446], [846, 426], [836, 411], [837, 391], [850, 371]], 2031]]) {
    blurDraw(g, bboxOf(pts, 3), 0.7, (c) => curve(c, pts, 2.6, grey(0.8, 0.8), { seed, ends: 0.1 }));
  }
}

function lampAndGear(g) {
  // arm: vertical post, parallel rods up to the elbow, the elbow knob
  ink(g, [[1426, 330], [1424, 424]], 2.2, grey(0.6), { seed: 2040 });
  ink(g, [[1433, 318], [1497, 388]], 2.6, grey(0.72), { seed: 2041 });
  ink(g, [[1440, 314], [1503, 382]], 1.6, grey(0.6), { seed: 2042 });
  ink(g, [[1495, 394], [1472, 440]], 2.4, grey(0.62), { seed: 2043 });
  dot(g, 1496, 392, 7, "#0b0b0b"); ring(g, 1496, 392, 6.5, 1.6, grey(0.85)); dot(g, 1496, 392, 2, grey(0.8));
  dot(g, 1434, 318, 4.5, grey(0.7));
  // shade: dark metal cone, a highlight along its top, the burning mouth
  const shade = [[1326, 329], [1358, 312], [1394, 293], [1419, 309], [1408, 339], [1397, 379]];
  soft(g, pth(shade, false), lg(g, 1330, 300, 1410, 370, [[0, 0.4], [0.45, 0.2], [1, 0.07]]));
  curve(g, [[1340, 322], [1372, 305], [1400, 296]], 2.2, grey(0.8, 0.7), { seed: 2044 });
  ink(g, shade, 1.4, BLK, { closed: true, seed: 2045 });
  fillPoly(g, [[1394, 282], [1422, 294], [1419, 310], [1392, 298]], grey(0.55));
  ink(g, [[1394, 282], [1422, 294], [1419, 310], [1392, 298]], 1.2, BLK, { closed: true, seed: 2046 });
  g.save(); g.translate(1361, 354); g.rotate(0.6);
  g.fillStyle = grey(0.98); g.beginPath(); g.ellipse(0, 0, 44, 15, 0, 0, PI * 2); g.fill();
  g.strokeStyle = grey(0.3); g.lineWidth = 1.4; g.beginPath(); g.ellipse(0, 0, 44, 15, 0, 0, PI * 2); g.stroke();
  g.fillStyle = grey(1); g.beginPath(); g.ellipse(6, 1, 22, 8, 0, 0, PI * 2); g.fill();
  g.restore();
  // pencil cup and pencils
  for (const [x0, y0, x1, y1] of [[1300, 455, 1293, 418], [1307, 455, 1306, 420], [1314, 455, 1318, 416], [1320, 455, 1330, 424], [1326, 455, 1338, 432], [1303, 455, 1290, 430]]) ink(g, [[x0, y0], [x1, y1]], 2.4, grey(0.85), { seed: x1 * 7 });
  const cup = [[1296, 453], [1331, 453], [1330, 500], [1297, 500]];
  stripes(g, cup, { dir: "h", per: 3, cov: (u, v) => lerp(0.5, 0.95, Math.sin(PI * clamp(u * 0.9 + 0.2))), lum: 0.9, seed: 2050, brk: 0.1 });
  ink(g, cup, 1.3, BLK, { closed: true, seed: 2051 });
  // books under his hand
  book(g, [[1236, 490], [1296, 488], [1297, 505], [1237, 506]], { seed: 2060 });
  book(g, [[1232, 505], [1300, 504], [1301, 521], [1233, 522]], { seed: 2062 });
  // the receiver, a flat device and a curled book on top
  book(g, [[1360, 424], [1430, 422], [1432, 440], [1361, 441]], { seed: 2070 });
  stripes(g, [[1348, 440], [1478, 438], [1480, 458], [1349, 459]], { dir: "h", per: 3, cov: 0.8, lum: 0.9, seed: 2072, brk: 0.2 });
  ink(g, [[1348, 440], [1478, 438], [1480, 458], [1349, 459]], 1.3, BLK, { closed: true, seed: 2073 });
  const rx = [[1353, 459], [1486, 457], [1488, 522], [1353, 523]];
  stripes(g, rx, { dir: "h", per: 3.4, cov: (u, v) => lerp(0.2, 0.1, u), lum: 0.55, seed: 2074, brk: 0.2 });
  ink(g, rx, 1.4, grey(0.85), { closed: true, seed: 2075 });
  ink(g, [[1353, 490], [1486, 489]], 1, grey(0.3), { seed: 2076 });
  for (const [x, r] of [[1365, 7], [1412, 8], [1435, 7]]) { dot(g, x, 473, r, grey(0.1)); ring(g, x, 473, r, 1.6, grey(0.9)); dot(g, x - 1.5, 471, 1.6, grey(0.9)); }
  fillPoly(g, [[1380, 468], [1396, 468], [1396, 478], [1380, 478]], grey(0.6));
  fillPoly(g, [[1455, 467], [1476, 467], [1476, 480], [1455, 480]], grey(0.85)); ink(g, [[1455, 467], [1476, 467], [1476, 480], [1455, 480]], 1.2, BLK, { closed: true, seed: 2077 });
  for (const x of [1367, 1388, 1414, 1435, 1466]) { dot(g, x, 503, 6, grey(0.06)); ring(g, x, 503, 6.5, 1.5, grey(0.85)); }
}

// cables: black with a thin lit edge
function cable(g, pts, w = 5, seed = 1, lit = 0.75) {
  w *= 1.45;
  curve(g, pts, w, "#030303", { seed, ends: 0.85 });
  curve(g, pts.map(([x, y]) => [x - w * 0.2, y - w * 0.1]), Math.max(1.2, w * 0.26), grey(0.88, lit), { seed: seed + 1, ends: 0.4 });
}
function cables(g) {
  // over the desk edge beside the laptop, down past his leg to the floor
  cable(g, [[922, 520], [912, 545], [904, 562], [900, 620], [897, 687], [879, 781], [854, 850], [826, 874], [790, 880]], 5.5, 2100);
  cable(g, [[944, 520], [936, 548], [928, 600], [920, 660], [912, 720], [900, 770], [884, 812], [860, 846]], 5, 2102);
  cable(g, [[926, 522], [934, 548], [952, 562]], 4, 2104);
  cable(g, [[841, 794], [822, 850], [785, 875], [740, 884]], 4, 2106, 0.6);
  // from the receiver jacks: a curtain of cables down to the floor
  for (const [pts, w, sd] of [
    [[[1325, 520], [1318, 580], [1305, 670], [1300, 760], [1310, 850], [1330, 880]], 4.6, 2110],
    [[[1367, 509], [1372, 560], [1380, 600], [1390, 700], [1410, 800], [1440, 870]], 4.6, 2112],
    [[[1388, 509], [1395, 560], [1418, 620], [1440, 690], [1462, 760], [1476, 850]], 4.4, 2114],
    [[[1414, 509], [1420, 560], [1430, 620], [1438, 700], [1446, 790], [1452, 860]], 4.2, 2116],
    [[[1435, 509], [1446, 560], [1470, 620], [1480, 700], [1490, 830], [1500, 870]], 4.4, 2118],
    [[[1466, 509], [1476, 560], [1486, 620], [1496, 700]], 4.2, 2120],
    [[[1300, 525], [1290, 600], [1270, 690], [1262, 760]], 4, 2122],
    [[[1250, 525], [1258, 580], [1262, 640]], 3.6, 2124],
  ]) cable(g, pts, w, sd);
  // loops on the floor and around the speaker
  cable(g, [[1500, 782], [1560, 752], [1620, 748], [1700, 758], [1760, 786], [1800, 800]], 4, 2130, 0.6);
  cable(g, [[1280, 872], [1360, 884], [1440, 876], [1520, 888], [1600, 880], [1680, 890], [1760, 884]], 4.2, 2132, 0.5);
  cable(g, [[1300, 860], [1380, 868], [1460, 860], [1540, 872]], 3.6, 2134, 0.45);
  cable(g, [[520, 870], [600, 884], [680, 876], [760, 890], [840, 884], [900, 892]], 4.2, 2136, 0.5);
  cable(g, [[600, 690], [612, 740], [604, 790], [590, 830]], 9, 2138, 0.8);
  cable(g, [[420, 600], [440, 660], [470, 720], [500, 760], [530, 800], [560, 830]], 4, 2140);
  cable(g, [[445, 600], [480, 650], [520, 690], [556, 720], [590, 760]], 3.8, 2142);
  cable(g, [[477, 600], [500, 640], [530, 670], [560, 690]], 3.6, 2144);
  cable(g, [[1650, 740], [1700, 780], [1750, 800], [1800, 830]], 3.6, 2146, 0.5);
}

// ======================================================================================
// RIGHT-CENTRE: bench, right speaker
// ======================================================================================
function rightCentre(g) {
  // bench under the desk's right end
  stripes(g, [[1340, 703], [1520, 702], [1520, 712], [1340, 713]], { dir: "h", per: 2.8, cov: 0.9, lum: 0.9, seed: 2200 });
  stripes(g, [[1340, 713], [1520, 712], [1520, 728], [1340, 729]], { dir: "h", per: 3, cov: 0.55, lum: 0.75, seed: 2201 });
  stripes(g, [[1320, 742], [1525, 741], [1525, 768], [1320, 769]], { dir: "h", per: 3, cov: bl(0.8, 0.9, 0.6, 0.5), lum: 0.88, seed: 2202 });
  for (const x of [1360, 1510]) {
    stripes(g, [[x, 769], [x + 15, 769], [x + 15, 852], [x, 852]], { per: 3, cov: ug(0.9, 0.4), lum: 0.9, seed: 2203 + x });
    for (const y of [780, 840]) ink(g, [[x - 2, y], [x + 17, y]], 2, grey(0.85), { seed: y + x });
  }
  // right speaker: top plate, grained front, drivers
  stripes(g, [[1494, 550], [1612, 550], [1612, 565], [1494, 565]], { dir: "h", per: 2.8, cov: 0.85, lum: 0.92, seed: 2210 });
  stripes(g, [[1494, 565], [1612, 565], [1612, 790], [1494, 790]], { per: 4.2, cov: fadeEdges(bl(0.6, 0.35, 0.25, 0.45), 0.01, 0.03), lum: 0.8, seed: 2211 });
  ink(g, [[1494, 550], [1612, 550], [1612, 790], [1494, 790]], 1.6, BLK, { closed: true, seed: 2212 });
  driver(g, 1553, 613, 15, "tweeter");
  driver(g, 1550, 688, 47, "woofer");
  dot(g, 1553, 770, 22, "#070707"); ring(g, 1553, 770, 22, 1.4, grey(0.5));
}

// ======================================================================================
// RIGHT: cartons, cassette deck, the upright synth, rack frame, plant, backpack, magazines
// ======================================================================================
function darkBox(g, pts, edge = 0.35, seed = 1) {
  // a carton in shadow: near-black with faint grain and a dim lit top edge
  stripes(g, pts, { per: 5, cov: fadeEdges(bl(0.12, 0.08, 0.05, 0.08), 0.05, 0.05), lum: 0.5, seed });
  ink(g, [pts[0], pts[1]], 1.3, grey(0.6, edge), { seed: seed + 1 });
}
function rightBack(g) {
  // tall dim cartons behind the counter
  stripes(g, [[1822, 128], [1905, 118], [1905, 242], [1822, 246]], { per: 5, cov: fadeEdges(bl(0.35, 0.3, 0.3, 0.3), 0.02, 0.02), lum: 0.6, seed: 2300 });
  ink(g, [[2090, 95], [2165, 95], [2165, 215]], 1.2, grey(0.3), { seed: 2301 });
  // dark cartons to the right of the striped stack (behind the cables)
  darkBox(g, [[1722, 246], [1796, 250], [1798, 332], [1722, 332]], 0.4, 2302);
  darkBox(g, [[1688, 330], [1800, 334], [1802, 420], [1688, 420]], 0.3, 2303);
  darkBox(g, [[1726, 405], [1812, 413], [1812, 470], [1726, 470]], 0.7, 2304);
  stripes(g, [[1800, 415], [1845, 418], [1845, 450], [1800, 450]], { per: 4, cov: 0.55, lum: 0.8, seed: 2305 });
  // the stack: three striped cartons, fronts facing the centre
  const S = [
    [[[1586, 287], [1720, 250], [1721, 330], [1587, 358]], 0.95, 2310],
    [[[1619, 354], [1687, 331], [1687, 418], [1620, 428]], 0.92, 2311],
    [[[1588, 437], [1725, 406], [1726, 552], [1588, 560]], 0.9, 2312],
  ];
  for (const [q, v, seed] of S) {
    stripes(g, q, { per: 5, cov: fadeEdges(bl(v * 0.8, v * 0.68, v * 0.46, v * 0.56), 0.03, 0.03), lum: 0.92, seed });
    ink(g, [q[0], q[1]], 1.8, grey(0.92), { seed: seed + 1 });
  }
  // cassette deck on the stack's left edge
  fillPoly(g, [[1570, 360], [1604, 356], [1606, 450], [1572, 452]], grey(0.26));
  ink(g, [[1570, 360], [1604, 356], [1606, 450], [1572, 452]], 1.4, grey(0.8), { closed: true, seed: 2314 });
  dot(g, 1588, 408, 11, grey(0.12)); ring(g, 1588, 408, 11, 2, grey(0.85)); ring(g, 1588, 408, 6, 1.2, grey(0.6));
  // headphones lying on top of the stack, the band looping over into the cables
  for (const [cx, cy, rx, ry, a] of [[1650, 232, 20, 24, -0.2], [1695, 226, 17, 22, 0.25]]) {
    g.save(); g.translate(cx, cy); g.rotate(a);
    dot(g, 0, 0, rx, "#070707");
    for (let k = 0; k < 4; k++) { g.strokeStyle = grey(k % 2 ? 0.15 : 0.55); g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, 0, rx - k * 3, ry - k * 3.5, 0, 0, PI * 2); g.stroke(); }
    g.restore();
  }
  curve(g, [[1628, 236], [1640, 212], [1672, 205], [1712, 210], [1735, 228]], 4, grey(0.35), { seed: 2316 });
  // the cable mass hanging over the dark cartons
  const r = rng(2320);
  for (let i = 0; i < 12; i++) {
    const x0 = 1745 + r() * 100, y0 = 245 + r() * 20, dx = (r() - 0.3) * 60;
    cable(g, [[x0, y0], [x0 + dx * 0.3 + 10, y0 + 60 + r() * 20], [x0 + dx * 0.7, y0 + 120 + r() * 40], [x0 + dx, y0 + 170 + r() * 60]], 2.4 + r() * 1.6, 2321 + i, 0.55);
  }
  for (let i = 0; i < 3; i++) { g.strokeStyle = grey(0.45, 0.7); g.lineWidth = 2; g.beginPath(); g.ellipse(1800 + i * 10, 330, 34 - i * 6, 56 - i * 8, 0.2, 0.2, 5.8); g.stroke(); }
  ink(g, [[1780, 413], [1893, 413]], 1.4, grey(0.5), { seed: 2325 });
  // the tall lit carton under the counter
  stripes(g, [[1880, 245], [1937, 225], [1938, 405], [1881, 408]], { per: 5, cov: fadeEdges(bl(0.85, 0.75, 0.55, 0.6), 0.03, 0.02), lum: 0.93, seed: 2330 });
  ink(g, [[1880, 245], [1937, 225]], 1.6, grey(0.9), { seed: 2331 });
  // two striped cartons under the plant, stacked
  stripes(g, [[1932, 378], [2085, 330], [2086, 455], [1932, 487]], { per: 5, cov: fadeEdges(bl(0.95, 0.85, 0.72, 0.8), 0.02, 0.0), lum: 0.95, seed: 2332 });
  ink(g, [[1932, 378], [2085, 330]], 1.8, grey(0.92), { seed: 2333 });
  stripes(g, [[1932, 487], [2086, 455], [2087, 552], [1932, 556]], { per: 5, cov: fadeEdges(bl(0.85, 0.8, 0.6, 0.65), 0.02, 0.0), lum: 0.92, seed: 2334 });
  ink(g, [[1932, 487], [2086, 455]], 1.6, BLK, { seed: 2335 });
  fillPoly(g, [[1968, 356], [2010, 344], [2012, 356], [1970, 368]], grey(0.8));
  // dim bits right of them
  stripes(g, [[2105, 335], [2155, 335], [2155, 356], [2105, 356]], { per: 4, cov: 0.4, lum: 0.7, seed: 2336 });
  stripes(g, [[2130, 460], [2165, 460], [2165, 492], [2130, 492]], { per: 4, cov: 0.4, lum: 0.7, seed: 2337 });
  // plant: pot on a shelf plate, leaves, trailing vine
  ink(g, [[2060, 336], [2176, 334]], 2.4, grey(0.7), { seed: 2340 });
  const pot = [[2084, 288], [2150, 286], [2145, 332], [2090, 334]];
  stripes(g, pot, { dir: "h", per: 3.4, cov: (u, v) => lerp(0.4, 0.95, Math.sin(PI * clamp(u))), lum: 0.9, seed: 2341, brk: 0.2 });
  ink(g, pot, 1.4, BLK, { closed: true, seed: 2342 });
  const RL = [[2095, 280, -1.75, 30], [2118, 276, -1.3, 30], [2140, 280, -0.8, 30], [2078, 282, -2.2, 28], [2160, 288, -0.3, 26], [2066, 272, -2.7, 28],
    [2102, 262, -1.6, 28], [2130, 258, -1.1, 26], [2150, 250, -0.7, 26], [2080, 256, -2.1, 28], [2050, 262, -2.6, 26], [2168, 270, 0.1, 22],
    [2030, 285, 2.9, 26], [2010, 300, 2.6, 24], [2040, 300, 1.9, 24], [2112, 240, -1.5, 22], [2155, 305, 0.6, 24]];
  RL.forEach(([x, y, a, s], i) => leaf(g, x, y, a, s, 0.66 + (i % 3) * 0.08, 2350 + i * 3));
  curve(g, [[2046, 300], [2040, 340], [2046, 380], [2040, 420], [2046, 450]], 1.1, grey(0.5, 0.6), { seed: 2349 });
  [[2040, 318, 2.6, 22], [2046, 340, 1.0, 22], [2040, 362, 2.2, 22], [2046, 385, 1.2, 22], [2040, 408, 2.0, 20], [2046, 430, 1.4, 20]].forEach(([x, y, a, s], i) => leaf(g, x, y, a, s, 0.72, 2400 + i * 3));
}

// the upright synth: a keyboard standing on end, leaning back a little (top to the right)
function uprightSynth(g) {
  // knob device at far left of the stack
  fillPoly(g, [[1560, 440], [1590, 440], [1590, 550], [1560, 550]], grey(0.12));
  for (let i = 0; i < 4; i++) { dot(g, 1575, 455 + i * 24, 4, grey(0.08)); ring(g, 1575, 455 + i * 24, 4, 1.2, grey(0.7)); }
  // local frame: u across (0 left .. 1 right), v down (0 top .. 1 bottom); corners measured at 2.4x
  const TL = [1650, 488], TR = [1766, 445], BR = [1752, 760], BLc = [1632, 746];
  const Q = [TL, TR, BR, BLc], at = (u, v) => bil(Q, u, v);
  const quad = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  fillPoly(g, Q, "#060606");
  // jack column (dark), module strip (grey), keys, right rail
  for (let i = 0; i < 12; i++) { const [x, y] = at(0.1, 0.06 + i * 0.078); g.fillStyle = grey(0.88); g.beginPath(); g.ellipse(x, y, 4.5, 2.6, 0, 0, PI * 2); g.fill(); dot(g, x, y + 0.6, 1.4, grey(0.05)); }
  stripes(g, quad(0.2, 0.08, 0.42, 1), { per: 3.2, cov: 0.35, lum: 0.72, seed: 2502, brk: 0.2 });
  for (let i = 0; i < 16; i++) for (const uu of [0.26, 0.36]) { const [x, y] = at(uu, 0.1 + i * 0.056); dot(g, x, y, 2.8, grey(0.05)); ring(g, x, y, 3, 0.9, grey(0.7)); }
  // control head at the top: four big knobs on a grey plate
  stripes(g, quad(0.35, 0, 0.98, 0.2), { dir: "h", per: 3, cov: 0.4, lum: 0.75, seed: 2503, brk: 0.2 });
  for (const [uu, vv] of [[0.48, 0.07], [0.72, 0.05], [0.52, 0.15], [0.78, 0.13]]) { const [x, y] = at(uu, vv); dot(g, x, y, 7, grey(0.07)); ring(g, x, y, 7, 1.6, grey(0.85)); dot(g, x - 2, y - 2, 1.6, grey(0.9)); }
  // keys (on end): white bars across, black keys from the left
  const k0 = 0.2, k1 = 0.99, nk = 20;
  fillPoly(g, quad(0.46, k0, 0.9, k1), grey(0.95));
  for (let i = 0; i <= nk; i++) { const v = k0 + (k1 - k0) * (i / nk); ink(g, [at(0.46, v), at(0.9, v)], 1.1, grey(0.12), { seed: 2510 + i, jit: 0.1 }); }
  for (let i = 0; i < nk; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) { const v = k0 + (k1 - k0) * ((i + 0.7) / nk), h = (k1 - k0) * 0.6 / nk; fillPoly(g, quad(0.46, v, 0.68, v + h), "#060606"); }
  ink(g, [at(0.9, 0.2), at(0.9, 1)], 2.4, grey(0.55), { seed: 2540 });
  ink(g, [TR, BR], 2, grey(0.75), { seed: 2541 });
  ink(g, [TL, TR], 2, grey(0.8), { seed: 2542 });
  // floor gear in front of it
  fillPoly(g, [[1592, 762], [1662, 760], [1664, 800], [1594, 802]], grey(0.22)); ink(g, [[1592, 762], [1662, 760], [1664, 800], [1594, 802]], 1.2, grey(0.7), { closed: true, seed: 2543 });
  dot(g, 1620, 776, 8, grey(0.1)); ring(g, 1620, 776, 8, 1.4, grey(0.8));
  fillPoly(g, [[1618, 800], [1682, 798], [1684, 842], [1620, 844]], grey(0.8)); ink(g, [[1618, 800], [1682, 798], [1684, 842], [1620, 844]], 1.3, BLK, { closed: true, seed: 2544 });
  fillPoly(g, [[1632, 810], [1664, 809], [1664, 826], [1632, 827]], grey(0.2));
  stripes(g, [[1682, 792], [1722, 792], [1722, 842], [1682, 842]], { per: 4.5, cov: 0.8, lum: 0.9, seed: 2545 });
  stripes(g, [[1752, 830], [1778, 829], [1779, 860], [1753, 861]], { dir: "h", per: 3, cov: 0.9, lum: 0.95, seed: 2546 });
  dot(g, 1761, 846, 2.6, grey(0.05));
  stripes(g, [[1530, 862], [1600, 860], [1602, 878], [1532, 880]], { dir: "h", per: 3, cov: 0.9, lum: 0.9, seed: 2547 });
}

function metalBar(g, a, b, w, seed) {
  // a flight-case extrusion: a pale bar with a dark groove and a bright top edge
  ink(g, [a, b], w, grey(0.9), { seed, jit: 0.2, ends: 0.95 });
  const n = [-(b[1] - a[1]), b[0] - a[0]], l = Math.hypot(n[0], n[1]);
  const off = (k) => [[a[0] + (n[0] / l) * k, a[1] + (n[1] / l) * k], [b[0] + (n[0] / l) * k, b[1] + (n[1] / l) * k]];
  ink(g, off(-w * 0.28), w * 0.22, grey(1), { seed: seed + 1, jit: 0.2, ends: 0.95 });
  ink(g, off(w * 0.12), w * 0.12, grey(0.3), { seed: seed + 2, jit: 0.2, ends: 0.95 });
  ink(g, off(w * 0.42), w * 0.1, grey(0.2), { seed: seed + 3, jit: 0.2, ends: 0.95 });
}
function rightLow(g) {
  // lower striped carton behind the lid
  // the flight case: black body, pale metal rails, corner brackets, a handle and a latch
  const body = [[1797, 510], [1968, 516], [1992, 540], [1998, 600], [1990, 650], [1797, 654]];
  fillBlob(g, body, "#050505");
  curve(g, [[1968, 516], [1990, 536], [1998, 600], [1990, 650]], 2, grey(0.55), { seed: 2600 });
  metalBar(g, [1800, 528], [1962, 535], 9, 2601);
  metalBar(g, [1800, 587], [1962, 590], 12, 2602);
  metalBar(g, [1807, 528], [1807, 652], 12, 2603);
  metalBar(g, [1958, 535], [1958, 648], 9, 2604);
  fillPoly(g, [[1850, 512], [1918, 513], [1918, 522], [1850, 521]], grey(0.7)); ink(g, [[1850, 512], [1918, 513]], 1.2, grey(0.95), { seed: 2605 });
  for (const [x, y] of [[1806, 530], [1960, 536]]) { fillPoly(g, [[x - 11, y - 10], [x + 11, y - 10], [x + 11, y + 12], [x - 11, y + 12]], grey(0.78)); ink(g, [[x - 11, y - 10], [x + 11, y - 10], [x + 11, y + 12], [x - 11, y + 12]], 1.2, BLK, { closed: true, seed: x }); dot(g, x, y + 1, 2.8, "#111"); }
  fillPoly(g, [[1900, 570], [1933, 570], [1933, 612], [1900, 612]], grey(0.82)); ink(g, [[1900, 570], [1933, 570], [1933, 612], [1900, 612]], 1.6, BLK, { closed: true, seed: 2610 });
  fillPoly(g, [[1907, 579], [1926, 579], [1926, 603], [1907, 603]], grey(0.3));
  // the bright lid leaning on the carton
  const lid = [[1990, 550], [2082, 545], [2078, 650], [1996, 652]];
  stripes(g, lid, { dir: "v", per: 3.5, cov: (u, v) => lerp(0.95, 0.72, v), lum: 0.97, seed: 2620, brk: 0.4 });
  ink(g, lid, 1.4, BLK, { closed: true, seed: 2621 });
  // lower-left carton (lit)
  stripes(g, [[1776, 652], [1858, 650], [1860, 830], [1778, 832]], { per: 5, cov: fadeEdges(bl(0.8, 0.62, 0.42, 0.58), 0.01, 0.02), lum: 0.92, seed: 2630 });
  ink(g, [[1776, 652], [1858, 650]], 1.6, grey(0.9), { seed: 2631 });
  // magazines on the floor
  for (let i = 0; i < 8; i++) {
    const y = 758 + i * 11.5, x0 = 1900 + (i % 3) * 5, x1 = 2090 - ((i * 7) % 4) * 4;
    book(g, [[x0, y], [x1, y - 1], [x1 + 2, y + 10], [x0 + 1, y + 11]], { seed: 2640 + i * 2, lum: 0.9 - i * 0.02 });
  }
  // backpack seen from its strap side: a dark rounded pack, two padded shoulder straps arching over it
  const bp = [[2022, 690], [2030, 650], [2052, 622], [2095, 610], [2135, 618], [2162, 648], [2176, 700], [2180, 770], [2172, 840], [2140, 862], [2062, 862], [2034, 836], [2024, 770]];
  fillBlob(g, bp, grey(0.06));
  g.save(); g.beginPath(); smoothPath(g, bp, true); g.clip();
  const rb = rng(2650);
  for (let i = 0; i < 140; i++) {
    const x = 2022 + rb() * 158, y = 612 + rb() * 250, len = 10 + rb() * 20, a = -0.15 + rb() * 0.3;
    const lit = clamp(1 - Math.abs(x - 2105) / 85) * 0.55 + 0.15;
    ink(g, [[x, y], [x + Math.cos(a) * len, y + Math.sin(a) * len]], 1.2 + rb() * 1.4, grey(0.12 + lit * 0.45, 0.6), { seed: 2651 + i, ends: 0.3 });
  }
  g.restore();
  const strap = (pts, w, seed) => {
    // a padded strap: lit ridge, stitched segments
    curve(g, pts, w, grey(0.1), { seed, ends: 0.9 });
    curve(g, pts.map(([x, y]) => [x - w * 0.18, y]), w * 0.5, grey(0.36), { seed: seed + 1, ends: 0.8 });
    curve(g, pts.map(([x, y]) => [x - w * 0.28, y]), w * 0.14, grey(0.8, 0.85), { seed: seed + 2, ends: 0.6 });
    const q = sampleCurve(pts, 8);
    for (let i = 4; i < q.length - 2; i += 6) { const [x, y] = q[i]; ink(g, [[x - w * 0.45, y], [x + w * 0.45, y + 2]], 1.2, grey(0.05, 0.9), { seed: seed + i }); }
  };
  strap([[2036, 700], [2040, 652], [2062, 630], [2090, 640], [2100, 700], [2104, 780], [2102, 850]], 22, 2660);
  strap([[2106, 640], [2120, 620], [2146, 628], [2160, 680], [2166, 760], [2160, 845]], 22, 2670);
  curve(g, bp, 1.8, grey(0.55), { closed: true, seed: 2680, ends: 0.8 });
  // small box, top right
  fillPoly(g, [[2130, 455], [2175, 455], [2175, 490], [2130, 490]], grey(0.3));
}

// ======================================================================================
// FLOOR
// ======================================================================================
function floor(g) {
  // dark boards in perspective, converging toward the desk; lit streaks near the middle
  const r = rng(2700);
  g.save(); g.beginPath(); g.rect(0, 856, PW, PH - 856); g.clip();
  for (let i = -40; i <= 40; i++) {
    const xt = 1080 + i * 24, xb = 1080 + i * 80;
    const a = clamp(0.42 - Math.abs(i) * 0.009) * (0.5 + r() * 0.7);
    ink(g, [[xt, 856], [xb, 946]], 1 + r() * 1.8, grey(0.6, a), { seed: 2701 + i, jit: 1 });
  }
  g.restore();
}

// The room's light: the gear around him is lit by the laptop and the lamp and falls off toward the edges of
// the page and into the floor. Multiplied over everything painted before the figure.
function roomLight(g) {
  const c = document.createElement("canvas"); c.width = Math.round(PW / 4); c.height = Math.round(PH / 4);
  const t = c.getContext("2d", { willReadFrequently: true });
  t.scale(0.25, 0.25);
  t.fillStyle = "#fff"; t.fillRect(0, 0, PW, PH);
  t.save(); t.translate(1000, 470); t.scale(1, 0.55);
  const r = t.createRadialGradient(0, 0, 0, 0, 0, 1150);
  r.addColorStop(0, grey(1)); r.addColorStop(0.36, grey(1)); r.addColorStop(0.66, grey(0.82)); r.addColorStop(0.88, grey(0.72)); r.addColorStop(1, grey(0.7));
  t.fillStyle = r; t.fillRect(-1300, -1800, 2600, 3600);
  t.restore();
  const b = t.createLinearGradient(0, 780, 0, 946); b.addColorStop(0, "rgba(0,0,0,0)"); b.addColorStop(1, "rgba(0,0,0,0.3)");
  t.fillStyle = b; t.fillRect(0, 780, PW, 166);
  g.save(); g.globalCompositeOperation = "multiply"; g.imageSmoothingQuality = "low"; g.drawImage(c, 0, 0, PW, PH); g.restore();
}

// ======================================================================================
export function paintSokoIll(g, { gaze = "owl" } = {}) {
  const steps = [
    () => wallLight(g),
    () => floor(g),
    () => rightBack(g),
    () => leftBack(g),
    () => leftMid(g),
    () => keyboardLeft(g),
    () => guitarCase(g),
    () => leftLow(g),
    () => plantLeft(g),
    () => speakerL(g),
    () => crateAndBooks(g),
    () => pedalboard(g),
    () => doNotKnock(g),
    () => uprightSynth(g),
    () => rightLow(g),
    () => rightCentre(g),
    () => deskUnder(g),
    () => roomLight(g),
    () => pants(g),
    () => shoe(g, 982, 1, 1, 1560),
    () => shoe(g, 1186, -1, 0.8, 1580),
    () => torso(g),
    () => head(g, gaze),
    () => laptop(g),
    () => deskTop(g),
    () => mug(g),
    () => lampAndGear(g),
    () => cables(g),
  ];
  g.fillStyle = "#000"; g.fillRect(0, 0, PW, PH);
  for (const f of steps) f();
}

// Cached illustration. scale supersamples (e.g. 1.5 for a push-in); the canvas is PAGE*scale.
const illCache = new Map();
export function sokoIllCanvas({ gaze = "owl", scale = 1 } = {}) {
  const key = `${gaze}:${scale}`;
  if (illCache.has(key)) return illCache.get(key);
  const c = document.createElement("canvas");
  c.width = Math.round(PW * scale); c.height = Math.round(PH * scale);
  // painted on a CPU-backed canvas: thousands of small strokes and local blurs rasterise far faster in software
  // than through a (possibly emulated) GPU, and the result is only read back once
  const g = c.getContext("2d", { willReadFrequently: true });
  g.scale(scale, scale);
  paintSokoIll(g, { gaze });
  // the source is soft: a half-pixel blur takes the digital edge off the strokes
  const out = document.createElement("canvas"); out.width = c.width; out.height = c.height;
  const og = out.getContext("2d", { willReadFrequently: true });
  og.filter = `blur(${(0.55 * scale).toFixed(2)}px)`; og.drawImage(c, 0, 0); og.filter = "none";
  out.__scale = scale;
  illCache.set(key, out);
  return out;
}
export function releaseSokoIll() { illCache.clear(); }

// The illustration on a laptop page (0–6 s): stretched to the screen like the source's laptop.
export function sokoIllSmall(ctx, w, h) {
  const c = sokoIllCanvas({ gaze: "down" });
  ctx.save();
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(c, 0, 0, c.width, c.height, 0, 0, w, h);
  ctx.restore();
}
