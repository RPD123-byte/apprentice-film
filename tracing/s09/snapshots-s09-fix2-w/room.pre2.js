// s09 room: the dim clutter behind the owl (x 1530-2206) and the lit speaker, ENGRAVED like the rest of the film.
//
// The room is one Plate at 2x (static, cut once). Each object paints three things:
//   - coverage (the Plate's value map): how much of the surface the cut lines cover (line width / spacing),
//   - direction + spacing (the Plate's direction map): which way the knife runs (carton corrugation, key strips...),
//   - tone (a separate map, multiplied into the cut lines): how bright those lines are.
// Splitting coverage from tone is what lets a dim carton read as fat grey ridges with black gaps (the source)
// instead of hairlines of white. Contours, cables, jack holes and edges are drawn by hand on the Plate overlay
// (tapered, wobbling strokes). The speaker drivers are cut as concentric engraved rings (ringCut).
//
// Every object was placed on 2-4x crops of source frames 815-839 averaged, with a gamma-lifted copy for the dark
// parts. Tones are the POST-GRADE greys measured on the source (per object: mean, p90, bar peaks), converted with
// pre(), which inverts the finish pass's S-curve and vignette at the object's position (halation is not inverted).
import { W, H } from "../../config.js";
import { Plate, engraveCanvases, grey } from "../../lib/engrave.js";
import { rng, clamp, noise1, hash } from "../../lib/rng.js";
import { taper } from "../../lib/ink.js";
import { sampleCurve, smoothPath } from "../../lib/paths.js";

const Sc = (f) => 0.65 * f + 0.35 * f * f * (3 - 2 * f);
function vig(x, y) { const qx = 2 * x / W - 1, qy = 2 * y / H - 1; const r = Math.min(1, (qx * qx + qy * qy) / 2); return 1 - 0.38 * Math.pow(r, 1.15); }
// target post-grade grey (0..255) at (x,y) -> painted value 0..1
export function pre(o, x, y) {
  const t = clamp(o / 255 / vig(x, y), 0, 1);
  let lo = 0, hi = 1;
  for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (Sc(m) < t) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
export const col = (o, x, y, a = 1) => { const c = Math.round(pre(o, x, y) * 255); return `rgba(${c},${c},${c},${a})`; };
const mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
const cen = (pts) => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };
const dist = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
const polyFn = (pts) => (g) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
let WOBSEED = 1;
// a polygon whose straight edges are redrawn by hand: resampled every ~3 px and nudged along the normal
function wobbly(pts, amp = 0.7, seed = WOBSEED++) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], L = dist(a, b), n = Math.max(1, Math.round(L / 3));
    const nx = -(b[1] - a[1]) / (L || 1), ny = (b[0] - a[0]) / (L || 1);
    for (let k = 0; k < n; k++) { const t = k / n, e = k === 0 ? 0 : noise1(i * 7.3 + t * L * 0.25, seed) * amp; out.push([a[0] + (b[0] - a[0]) * t + nx * e, a[1] + (b[1] - a[1]) * t + ny * e]); }
  }
  return out;
}
const pathOf = (s) => (typeof s === "function" ? s : polyFn(s.length >= 3 && s.length <= 8 ? wobbly(s) : s));

// ------------------------------------------------------------------------------------------------ plate plumbing
const S0 = 4.4;                                                     // base engraving period (1x px)
const spFor = (p) => clamp((p / S0 - 0.55) / 1.35, 0, 1);           // period (1x px) -> direction-map spacing code
const INKL = 0.949;
const BLUR2 = 1.3;                                                  // softening blur at 2x (px)                                                 // the engraver's white
const tone = (pk, x, y) => clamp(pre(pk, x, y) / INKL, 0, 1);       // painted brightness of a line that should read pk

function makeRoom(x0) {
  const w = W - x0;
  const P = new Plate(w, H, 2);
  for (const g of [P.v, P.d, P.o]) g.translate(-x0, 0);
  const T = document.createElement("canvas"); T.width = w * 2; T.height = H * 2;
  const t = T.getContext("2d"); t.fillStyle = "#fff"; t.fillRect(0, 0, T.width, T.height); t.scale(2, 2); t.translate(-x0, 0);
  return { P, T, t, v: P.v, d: P.d, o: P.o, x0, w };
}
// gradient spec [A, B, [[s, k], ...]]; colour(k, point) -> css
function grad(g, [A, B, stops], colour) {
  const gr = g.createLinearGradient(A[0], A[1], B[0], B[1]);
  for (const [s, k] of stops) gr.addColorStop(s, colour(k, mix(A, B, s)));
  return gr;
}
// Paint one surface: coverage (cov or covG), direction (ang, per, style) and line tone (pk, optionally scaled by pkG)
function area(R, shape, o) {
  const path = pathOf(shape);
  const c = o.at || (Array.isArray(shape) ? cen(shape) : [0, 0]);
  const { v, d, t } = R;
  v.save(); v.beginPath(); path(v);
  v.fillStyle = o.covG ? grad(v, o.covG, (k) => grey(k)) : grey(o.cov ?? 0);
  v.fill(); v.restore();
  d.save(); d.beginPath(); path(d); d.fillStyle = Plate.dirColor(o.ang ?? Math.PI / 2, spFor(o.per || S0), o.style || 0); d.fill(); d.restore();
  if (o.pk !== undefined) {
    t.save(); t.beginPath(); path(t);
    t.fillStyle = o.pkG ? grad(t, o.pkG, (k, p) => grey(tone(o.pk * k, p[0], p[1]))) : grey(tone(o.pk, c[0], c[1]));
    t.fill(); t.restore();
  }
}
function mulOn(g, shape, style, clip = null) {
  g.save();
  if (clip) { g.beginPath(); pathOf(clip)(g); g.clip(); }
  g.globalCompositeOperation = "multiply"; g.beginPath(); pathOf(shape)(g); g.fillStyle = style; g.fill(); g.restore();
}
// black out (coverage 0) a region: things in front that are drawn only as overlay
function blank(R, shape) { R.v.save(); R.v.beginPath(); pathOf(shape)(R.v); R.v.fillStyle = "#000"; R.v.fill(); R.v.restore(); }

// A corrugated carton face, quad = [TL, TR, BR, BL]. dir "v": ridges run TL->BL; "h": TL->TR.
// Each ridge gets its own tone (the source's bars vary a lot), and the ridges end raggedly and rounded (coverage
// fades to nothing over a random length at the ends, some drip longer), as the source's hand-cut corrugation does.
function carton(R, quad, o) {
  const { cov = 0.5, pk = 90, per = 5.6, lit = [1, 0.75], seed = 1, amp = 0.45, endB = 9, endT = 3, drip = 0.15, dir = "v", covLit = null, wob = 0.35 } = o;
  const [a, b, c, d] = quad;
  const vdir = dir === "v";
  const along = vdir ? [(d[0] - a[0] + c[0] - b[0]) / 2, (d[1] - a[1] + c[1] - b[1]) / 2] : [(b[0] - a[0] + c[0] - d[0]) / 2, (b[1] - a[1] + c[1] - d[1]) / 2];
  const ang = o.ang ?? Math.atan2(along[1], along[0]);
  const top = vdir ? mix(a, b, 0.5) : mix(a, d, 0.5), bot = vdir ? mix(d, c, 0.5) : mix(b, c, 0.5);
  area(R, quad, { cov, pk, ang, per, pkG: [top, bot, [[0, lit[0]], [1, lit[1]]]], covG: covLit ? [top, bot, [[0, cov * covLit[0]], [1, cov * covLit[1]]]] : null });
  const r = rng(seed);
  const Pq = vdir ? (u, s) => mix(mix(a, b, u), mix(d, c, u), s) : (u, s) => mix(mix(a, d, u), mix(b, c, u), s);
  const Lw = vdir ? (dist(a, b) + dist(d, c)) / 2 : (dist(a, d) + dist(b, c)) / 2;
  const Lh = vdir ? (dist(a, d) + dist(b, c)) / 2 : (dist(a, b) + dist(d, c)) / 2;
  const q4 = (u0, u1, s0, s1) => [Pq(u0, s0), Pq(u1, s0), Pq(u1, s1), Pq(u0, s1)];
  let u = -0.01;
  while (u < 1) { const du = per * (0.5 + r()) / Lw; mulOn(R.t, q4(u, u + du, -0.02, 1.02), grey(1 - amp * r() * r() * 1.6), quad); u += du; }
  // every ridge has its own width, and hand-cut ridges swell and thin along their length
  u = -0.01;
  while (u < 1) { const du = per * (0.7 + 0.6 * r()) / Lw; mulOn(R.v, q4(u, u + du, -0.02, 1.02), grey(1 - 0.3 * r()), quad); u += du; }
  u = -0.01;
  while (u < 1) {
    const du = per * (0.4 + 0.5 * r()) / Lw;
    let s0 = -0.02;
    while (s0 < 1) { const ds = (10 + 30 * r()) / Lh; mulOn(R.v, q4(u, u + du, s0, s0 + ds), grey(1 - wob * r()), quad); s0 += ds; }
    u += du;
  }
  u = -0.01;
  while (u < 1) {
    const du = per * (0.3 + 0.3 * r()) / Lw;
    let e = endB * (0.4 + 1.2 * r()); if (r() < drip) e += endB * (1 + 2.5 * r());
    const fade = (s0, s1) => { const A = Pq(u + du / 2, s0), B = Pq(u + du / 2, s1); const gr = R.v.createLinearGradient(A[0], A[1], B[0], B[1]); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "#000"); mulOn(R.v, q4(u, u + du, s0, s1), gr, quad); };
    if (endB > 0) fade(1 - e / Lh, 1.02);
    if (endT > 0) fade((endT * (0.2 + 1.4 * r())) / Lh, -0.02);
    u += du;
  }
}

// ------------------------------------------------------------------------------------------------ hand strokes (overlay)
function resample(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = dist(a, b), n = Math.max(1, Math.round(L / step));
    for (let k = 1; k <= n; k++) out.push(mix(a, b, k / n));
  }
  return out;
}
function normals(q) {
  return q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; });
}
// a wobbling, swelling hand-inked line (no two alike); o = post-grade grey
function edge(R, pts, w, o, a = 1, seed = 1, amp = 0.55, curve = false) {
  const q = curve ? sampleCurve(pts, 6) : resample(pts, 2.5);
  const N = normals(q), n = q.length;
  const qq = q.map((p, i) => { const k = noise1(i * 0.33, seed) * amp; return [p[0] + N[i][0] * k, p[1] + N[i][1] * k]; });
  const [cx, cy] = cen(pts);
  taper(R.o, qq, (u) => w * (0.5 + 0.5 * clamp(0.55 + 0.7 * noise1(u * n * 0.16, seed + 5), 0, 1)) * Math.pow(clamp(Math.min(u, 1 - u) * 9, 0, 1), 0.6), col(o, cx, cy, a));
}
// a cable: a dark rope with a lit rim on the side toward the light (upper left) and a faint rim on the other side
const LIGHT = [-0.45, -0.89];
function cable(R, pts, w, o = 12, rim = 55, seed = 1) {
  const q = sampleCurve(pts, 7), N = normals(q), n = q.length;
  const [cx, cy] = cen(pts);
  taper(R.o, q, (u) => w * (0.7 + 0.3 * Math.pow(Math.sin(Math.PI * clamp(u)), 0.3)), col(o, cx, cy, 0.95));
  for (const side of [1, -1]) {
    for (let i = 0; i < n - 1; i += 4) {
      const j = Math.min(n - 1, i + 5);
      const nm = N[Math.min(n - 1, i + 2)], dt = side * (nm[0] * LIGHT[0] + nm[1] * LIGHT[1]);
      const lvl = dt > 0 ? rim * (0.55 + 0.45 * dt) : rim * 0.32;
      const seg = [];
      for (let k = i; k <= j; k++) { const wob = noise1(k * 0.4, seed + side) * 0.25; seg.push([q[k][0] + side * N[k][0] * (w * 0.36 + wob), q[k][1] + side * N[k][1] * (w * 0.36 + wob)]); }
      const ww = (dt > 0 ? 1.15 : 0.8) * (0.8 + 0.4 * hash(i, seed, side));
      taper(R.o, seg, (u) => ww * (0.6 + 0.4 * Math.sin(Math.PI * u)), col(lvl, q[i][0], q[i][1], 0.95));
    }
  }
}
// holes / jacks in a panel: irregular in place, size, tone; some are short ticks instead of dots
function jacks(R, x0, y0, x1, y1, pitch, lo, hi, on, seed, rad = 1.0, fall = null) {
  const r = rng(seed);
  for (let y = y0; y <= y1; y += pitch) for (let x = x0; x <= x1; x += pitch) {
    const h = r(), jx = (r() - 0.5) * pitch * 0.3, jy = (r() - 0.5) * pitch * 0.3, vv = r(), rr = rad * (0.6 + 0.8 * r()), tick = r() < 0.18;
    if (h > on) continue;
    const X = x + jx, Y = y + jy;
    let v = lo + (hi - lo) * vv * vv;
    if (fall) v *= fall(X, Y);
    if (v < 3) continue;
    R.o.fillStyle = col(v, X, Y, 0.95);
    R.o.beginPath();
    if (tick) R.o.ellipse(X, Y, rr * 0.7, rr * 1.9, 0.1, 0, 7); else R.o.ellipse(X, Y, rr, rr * 0.9, 0, 0, 7);
    R.o.fill();
  }
}

// ------------------------------------------------------------------------------------------------ ring engraving
// Engraved rings between two ellipses (a driver seen a little from the left): ring k runs along the ellipse
// interpolated between `outer` (t = 0) and `inner` (t = 1), [cx, cy, rx, ry]; `n` rings, jittered. At each angle the
// ring's width is sp * val(x, y, th, t): tone from line weight. Every ring has its own weight, a wobble in radius and
// breaks where the value drops. Drawn as tapered strokes onto g (the overlay) in tone lvl(x, y) (post-grade).
const lerpE = (A, B, t) => A.map((v, i) => v + (B[i] - v) * t);
function ringCut(g, { outer, inner, n, sp = 4.5, val, lvl, seed = 1, wob = 0.7, wj = 0.3, minW = 0.35, step = 2.2, alpha = 0.97, a0 = 0, a1 = Math.PI * 2 }) {
  const r = rng(seed);
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5 + (r() - 0.5) * 0.5) / n;
    const [cx, cy, rx, ry] = lerpE(outer, inner, t);
    const wk = 1 + (r() - 0.5) * 2 * wj, ph = r() * 50;
    const m = Math.max(24, Math.round(((a1 - a0) * (rx + ry) / 2) / step));
    let run = [], ws = [];
    const flush = () => {
      if (run.length > 2) {
        const [mx, my] = run[Math.floor(run.length / 2)];
        const wsc = ws.slice();
        taper(g, run, (u) => wsc[Math.min(wsc.length - 1, Math.round(u * (wsc.length - 1)))], col(lvl(mx, my), mx, my, alpha));
      }
      run = []; ws = [];
    };
    for (let i = 0; i <= m; i++) {
      const th = a0 + (i / m) * (a1 - a0);
      const e = noise1(th * (rx + ry) / 44 + ph, seed + k) * wob;
      const x = cx + Math.cos(th) * (rx + e), y = cy + Math.sin(th) * (ry + e);
      const brk = 0.75 + 0.5 * noise1(th * (rx + ry) / 60 + ph * 3, seed + 99 + k);
      const w = sp * clamp(val(x, y, th, t) * wk * brk, 0, 1);
      if (w < minW) { flush(); continue; }
      run.push([x, y]); ws.push(w);
    }
    flush();
  }
}
const ellPath = ([cx, cy, rx, ry]) => (g) => g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
function fillEll(g, E, css) { g.fillStyle = css; g.beginPath(); ellPath(E)(g); g.fill(); }

// ------------------------------------------------------------------------------------------------ the clutter
function farBack(R) {
  // the dark shelving behind the plant: a few faint edges survive the black
  edge(R, [[1916, 87], [1990, 89], [2046, 91]], 1.6, 22, 1, 3);
  edge(R, [[2040, 81], [2085, 81]], 1.2, 15, 1, 4);
  edge(R, [[1952, 218], [2010, 219], [2064, 221]], 1.6, 24, 1, 5);
  area(R, [[2002, 4], [2027, 4], [2027, 29], [2002, 29]], { cov: 0.35, pk: 30, ang: 1.5, per: 3 });
  area(R, [[2003, 99], [2040, 99], [2040, 141], [2003, 141]], { cov: 0.4, pk: 36, ang: 1.62, per: 3.2 });
  // a hanging cord (a dotted line) and a dim hanging planter
  const r = rng(7);
  for (let y = 22; y < 200; y += 4.6 + r()) { R.o.fillStyle = col(10 + 9 * r(), 2131, y, 0.9); R.o.beginPath(); R.o.ellipse(2131 + (r() - 0.5) * 0.6, y, 0.8, 1.5, 0, 0, 7); R.o.fill(); }
  area(R, [[2120, 205], [2150, 200], [2170, 222], [2166, 262], [2130, 270], [2112, 240]], { cov: 0.12, pk: 25, ang: 1.4, per: 3 });
}

function column(R) {
  // T1: the top carton (partly off the top of frame); lit on its upper left
  carton(R, [[1826, 33], [1908, 4], [1908, 92], [1826, 150]], { cov: 0.86, pk: 60, per: 5.4, lit: [1.05, 0.78], seed: 101, endB: 6 });
  area(R, [[1862, 2], [1890, 0], [1890, 33], [1862, 38]], { cov: 1, pk: 50, style: 2 });
  edge(R, [[1862, 38], [1890, 33]], 2.2, 4, 0.9, 104, 0.3);
  // T2 under it: a plain lighter panel on its upper left, the corrugation below, a dark diagonal seam on top
  carton(R, [[1780, 148], [1910, 90], [1910, 222], [1780, 247]], { cov: 0.82, pk: 60, per: 5.8, lit: [1, 0.8], seed: 102, endB: 16, drip: 0.3 });
  area(R, [[1783, 152], [1846, 124], [1848, 178], [1783, 202]], { cov: 0.9, pk: 44, ang: 1.6, per: 4.6, pkG: [[1790, 150], [1845, 190], [[0, 1.05], [1, 0.85]]] });
  area(R, [[1845, 121], [1870, 113], [1870, 152], [1845, 158]], { cov: 1, pk: 62, style: 2 });
  edge(R, [[1845, 158], [1870, 152]], 2, 4, 0.9, 105, 0.3);
  // T3: the lit tall carton right of the cables; its lower left is cut by a dark cable run
  carton(R, [[1867, 237], [1922, 222], [1922, 392], [1867, 392]], { cov: 0.74, pk: 104, per: 5.8, lit: [1.05, 0.72], seed: 103, endB: 12, drip: 0.35 });
  blank(R, [[1864, 300], [1873, 300], [1880, 350], [1893, 380], [1905, 398], [1864, 398]]);
}

function leftStack(R) {
  // A: top-left carton, face tilting up to the right; a dim label
  carton(R, [[1575, 272], [1706, 238], [1706, 318], [1575, 346]], { cov: 0.74, pk: 100, per: 5.9, lit: [1.05, 0.72], seed: 111, endB: 8 });
  area(R, [[1624, 258], [1652, 251], [1652, 288], [1624, 294]], { cov: 0.95, pk: 62, ang: 1.57, per: 5 });
  edge(R, [[1640, 296], [1672, 289], [1706, 281]], 2.2, 4, 0.85, 118, 0.4);
  // C: small dark box on the far left, framed by lit edges
  carton(R, [[1558, 349], [1594, 344], [1594, 421], [1558, 425]], { cov: 0.3, pk: 30, per: 6, seed: 112, endB: 6 });
  // B: the face turned toward the light: pale, with dark horizontal brush streaks
  const boxB = [[1607, 338], [1673, 320], [1673, 398], [1607, 410]];
  area(R, boxB, { cov: 1, pk: 78, style: 2, ang: -0.22, pkG: [[1607, 330], [1673, 400], [[0, 1.1], [1, 0.82]]] });
  { const q = rng(117); R.o.save(); R.o.beginPath(); polyFn(boxB)(R.o); R.o.clip();
    for (let i = 0; i < 40; i++) { const y = 332 + i * 2.1 + (q() - 0.5) * 3, x = 1603 + q() * 40, L = 16 + q() * 50, a = -0.22 + (q() - 0.5) * 0.14, w = 1 + q() * 2.8;
      const p0 = [x, y + (x - 1607) * -0.25], p1 = [p0[0] + Math.cos(a) * L, p0[1] + Math.sin(a) * L];
      taper(R.o, resample([p0, p1], 3), (u) => w * Math.pow(Math.sin(Math.PI * u), 0.4), col(6 + 16 * q(), x, y, 0.65 + 0.3 * q())); }
    R.o.restore(); }
  // D: the carton under them; its lid is a band of short ridges, the face below fades toward the bottom
  carton(R, [[1575, 430], [1712, 400], [1712, 525], [1575, 545]], { cov: 0.72, pk: 100, per: 5.8, lit: [1.05, 0.5], seed: 114, endB: 14, drip: 0.3 });
  carton(R, [[1618, 408], [1712, 390], [1712, 400], [1618, 419]], { cov: 0.74, pk: 90, per: 5.2, lit: [1, 0.9], seed: 115, endB: 2, endT: 1 });
  area(R, [[1610, 441], [1648, 433], [1648, 457], [1610, 465]], { cov: 1, pk: 40, style: 2 });
  // far-left carton edge behind the wing
  carton(R, [[1540, 425], [1575, 421], [1575, 540], [1540, 545]], { cov: 0.66, pk: 44, per: 5.8, seed: 116, endB: 10 });
}

function edgesLeft(R) {
  // lit, wobbling top edges of the carton faces (hand-drawn)
  edge(R, [[1576, 272], [1640, 255], [1706, 238]], 1.4, 92, 0.75, 21);
  edge(R, [[1577, 430], [1640, 416], [1712, 400]], 1.2, 70, 0.6, 22);
  edge(R, [[1618, 408], [1712, 390]], 1.2, 80, 0.7, 23);
  edge(R, [[1607, 339], [1673, 321]], 1.3, 95, 0.7, 24);
  edge(R, [[1607, 339], [1607, 409]], 1.1, 70, 0.6, 25);
  edge(R, [[1561, 352], [1562, 424]], 1.6, 60, 0.9, 26);
  edge(R, [[1561, 350], [1593, 345]], 1.3, 50, 0.9, 27);
  edge(R, [[1826, 34], [1908, 5]], 1.2, 58, 0.6, 28);
  edge(R, [[1867, 237], [1922, 222]], 1.3, 95, 0.65, 29);
  edge(R, [[1780, 148], [1845, 120], [1910, 91]], 2.6, 0, 0.9, 30, 0.4);     // T2's dark seam
  // the punched handle strip on T2's left
  const r = rng(31);
  for (let y = 165; y < 240; y += 4.6 + r()) { R.o.fillStyle = col(22 + 16 * r(), 1786, y, 0.9); R.o.beginPath(); R.o.ellipse(1786 + (r() - 0.5), y, 1.0, 1.4, 0, 0, 7); R.o.fill(); }
}

function gear(R) {
  // the patch-module panel: a dark faintly cross-hatched face with a sparse upper grid and a dense jack grid
  area(R, [[1706, 238], [1792, 236], [1794, 400], [1706, 400]], { cov: 0.06, pk: 26, ang: 0.05, per: 3.4, style: 1 });
  jacks(R, 1713, 246, 1764, 316, 5.6, 20, 62, 0.72, 121, 1.6);
  jacks(R, 1714, 324, 1788, 396, 4.4, 20, 72, 0.8, 122, 1.5, (x, y) => 0.55 + 0.6 * clamp((1788 - x) / 70));
  edge(R, [[1762, 262], [1764, 244], [1786, 240]], 1.3, 26, 1, 40, 0.3, true);
  edge(R, [[1708, 320], [1790, 318]], 1.1, 16, 1, 41);
  // below: more jacks, a row of short ridges, and a tangle of small parts (short bright diagonal ticks)
  area(R, [[1712, 398], [1862, 396], [1862, 502], [1712, 502]], { cov: 0.05, pk: 22, ang: 0.1, per: 3.4, style: 1 });
  jacks(R, 1716, 402, 1756, 496, 5.2, 12, 40, 0.55, 123, 1.3);
  carton(R, [[1750, 395], [1805, 394], [1805, 417], [1750, 418]], { cov: 0.68, pk: 40, per: 5, seed: 124, endB: 5, endT: 2 });
  const r = rng(125);
  for (let i = 0; i < 70; i++) {
    const x = 1790 + r() * 88, y = 402 + r() * 96, L = 4 + r() * 9, a = -1.05 + (r() - 0.5) * 0.5, w = 1.3 + r() * 1.1;
    const v = (18 + 40 * r()) * (0.5 + 0.7 * clamp((x - 1790) / 70)) * (r() < 0.15 ? 1.6 : 1);
    const p0 = [x, y], p1 = [x + Math.cos(a) * L, y + Math.sin(a) * L];
    taper(R.o, [p0, mix(p0, p1, 0.5), p1], (u) => w * Math.pow(Math.sin(Math.PI * u), 0.5), col(v, x, y, 0.9));
  }
  // cables hanging in loops in front of the panel: ropes with lit rims (traced on 4x crops)
  const C = [
    [[1768, 236], [1781, 250], [1786, 276], [1786, 304], [1791, 330], [1806, 342], [1823, 334], [1835, 308], [1841, 280], [1845, 256], [1850, 238]],
    [[1789, 244], [1795, 268], [1803, 288], [1814, 299]],
    [[1777, 300], [1783, 322], [1797, 334]],
    [[1843, 236], [1853, 238], [1857, 258], [1856, 280]],
    [[1861, 250], [1860, 282], [1853, 318], [1841, 350], [1828, 382], [1822, 398]],
    [[1836, 262], [1831, 298], [1823, 330], [1818, 354]],
    [[1812, 346], [1830, 368], [1842, 396]],
    [[1866, 346], [1872, 372], [1878, 394]],
    [[1808, 240], [1812, 262], [1818, 282]],
  ];
  C.forEach((pts, i) => cable(R, pts, 3.4 + (i % 3) * 0.5, 12, 88 - (i % 4) * 7, 130 + i));
  cable(R, [[1856, 404], [1876, 420], [1896, 438]], 2.4, 9, 40, 140);
}

function synth(R) {
  // a keyboard standing on end, leaning a little right; the owl's wing covers its lower left
  area(R, [[1647, 440], [1694, 432], [1690, 612], [1644, 616]], { cov: 0.3, pk: 42, ang: 1.6, per: 3.4, pkG: [[1670, 440], [1668, 612], [[0, 1], [1, 0.7]]] });
  const r = rng(51);
  for (let k = 0; k < 11; k++) { const y = 506 + k * 9 + (r() - 0.5), x = 1679 - (y - 506) * 0.02; R.o.fillStyle = col(46 + 16 * r(), x, y, 0.9); R.o.beginPath(); R.o.ellipse(x, y + 2, 1.9, 2.3, 0, 0, 7); R.o.fill(); }
  // knob panel: a dim face, a lit top edge fading right, a bright side strip; five knobs (dark caps, lit rims)
  area(R, [[1669, 431], [1740, 428], [1738, 493], [1667, 496]], { cov: 1, pk: 40, style: 2, pkG: [[1670, 435], [1738, 490], [[0, 1.15], [1, 0.8]]] });
  area(R, [[1738, 430], [1746, 430], [1744, 495], [1736, 495]], { cov: 0.9, pk: 100, ang: 1.62, per: 2.6 });
  edge(R, [[1690, 440], [1705, 439], [1718, 440]], 1.8, 80, 0.85, 52);
  for (const [x, y, s] of [[1677, 459, 0.9], [1702, 452, 1], [1723, 452, 1], [1701, 474, 1], [1722, 473, 1], [1681, 483, 0.85]]) {
    const q = rng(Math.round(x * 7 + y));
    R.o.strokeStyle = col(4, x, y, 0.95); R.o.lineWidth = 3.2 * s; R.o.beginPath(); R.o.ellipse(x, y, 5.6 * s, 5.2 * s, 0, 0, 7); R.o.stroke();
    const arc = []; for (let a = 0.85; a <= 1.95; a += 0.1) arc.push([x + Math.cos(Math.PI * a) * 6 * s, y + Math.sin(Math.PI * a) * 5.6 * s]);
    const kw = 1.1 + 0.8 * q(); taper(R.o, arc, (u) => kw * Math.sin(Math.PI * u), col(62 + 20 * q(), x, y, 0.9));
    R.o.fillStyle = col(18, x, y, 0.8); R.o.beginPath(); R.o.ellipse(x + 0.5, y + 0.5, 2.6 * s, 2.4 * s, 0, 0, 7); R.o.fill();
  }
  // the key strip: pale key strips (engraved along the keys), dark dividers, black keys on the left 55%
  const A = [1700, 497], B = [1737, 495], Cc = [1730, 653], D = [1690, 653];
  area(R, [A, B, Cc, D], { cov: 0.8, pk: 86, ang: 0.02, per: 2.8, pkG: [[1715, 500], [1712, 650], [[0, 1], [1, 0.72]]] });
  const nk = 15;
  for (let k = 1; k < nk; k++) edge(R, [mix(A, D, k / nk), mix(B, Cc, k / nk)], 1.3, 6, 0.9, 60 + k, 0.3);
  const blk = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12, 14];
  for (const k of blk) {
    const t = (k + 0.62) / nk, t2 = t + 0.045;
    const p = mix(A, D, t), qq = mix(A, D, t2), p2 = mix(p, mix(B, Cc, t), 0.54 + 0.04 * hash(k, 3)), q2 = mix(qq, mix(B, Cc, t2), 0.56 + 0.04 * hash(k, 4));
    R.o.fillStyle = col(5, p[0], p[1], 0.95); R.o.beginPath(); smoothPath(R.o, [p, mix(p, p2, 0.5), p2, q2, mix(qq, q2, 0.5), qq], true); R.o.fill();
  }
  blank(R, [[1737, 495], [1745, 495], [1738, 653], [1730, 653]]);
  edge(R, [[1745, 495], [1738, 653]], 1.3, 60, 0.8, 75);
}

function flightCase(R) {
  // a closed flight case in the dark: engraved metal rails and corner caps, a hinge, a latch (no outline boxes)
  area(R, [[1805, 508], [1925, 510], [1925, 525], [1805, 523]], { cov: 0.62, pk: 40, ang: 0.02, per: 2.42, pkG: [[1805, 515], [1925, 515], [[0, 1.05], [1, 0.8]]] });
  edge(R, [[1805, 509], [1865, 510], [1925, 511]], 1.4, 48, 0.9, 80);
  // left post: two rails, corner caps, a hinge
  area(R, [[1782, 505], [1801, 505], [1801, 640], [1782, 640]], { cov: 0.22, pk: 38, ang: 1.57, per: 3.4 });
  area(R, [[1781, 504], [1803, 504], [1803, 528], [1781, 528]], { cov: 0.6, pk: 46, ang: 1.57, per: 2.4 });
  area(R, [[1782, 556], [1801, 556], [1801, 591], [1782, 591]], { cov: 0.62, pk: 48, ang: 1.57, per: 2.4 });
  edge(R, [[1785, 528], [1785, 556]], 1.3, 40, 0.9, 81); edge(R, [[1797, 528], [1797, 556]], 1.1, 30, 0.9, 82);
  edge(R, [[1786, 596], [1786, 640]], 1.6, 42, 0.9, 83); edge(R, [[1797, 596], [1797, 640]], 1.3, 34, 0.9, 84);
  // middle rails
  area(R, [[1806, 560], [1881, 560], [1881, 569], [1806, 569]], { cov: 0.66, pk: 44, ang: 0.0, per: 2.42, pkG: [[1806, 565], [1881, 565], [[0, 1.05], [1, 0.8]]] });
  area(R, [[1806, 572], [1881, 572], [1881, 582], [1806, 582]], { cov: 0.62, pk: 40, ang: 0.0, per: 2.42, pkG: [[1806, 577], [1881, 577], [[0, 1.05], [1, 0.8]]] });
  // latch: a hand-inked frame with small engraved parts inside
  edge(R, [[1886, 555], [1911, 554], [1913, 580], [1911, 597], [1886, 598], [1884, 576], [1886, 556]], 1.8, 40, 0.9, 85, 0.5, true);
  area(R, [[1889, 560], [1904, 560], [1904, 571], [1889, 571]], { cov: 0.6, pk: 48, ang: 0, per: 2.4 });
  area(R, [[1890, 580], [1902, 580], [1902, 590], [1890, 590]], { cov: 0.55, pk: 40, ang: 0, per: 2.4 });
  // right: a Y-plug and the right post
  edge(R, [[1921, 531], [1928, 545], [1935, 531]], 1.6, 38, 0.9, 86, 0.3, true);
  edge(R, [[1928, 545], [1928, 557]], 1.5, 34, 0.9, 87);
  area(R, [[1934, 520], [1944, 520], [1944, 640], [1934, 640]], { cov: 0.22, pk: 34, ang: 1.57, per: 3.4 });
  edge(R, [[1916, 540], [1936, 518]], 1.6, 40, 0.9, 88);
  edge(R, [[1790, 634], [1942, 634]], 1.2, 18, 0.9, 89);
  cable(R, [[1920, 503], [1944, 516], [1956, 540], [1962, 575]], 2.6, 8, 38, 90);
}

function lowRoom(R) {
  // small corrugated carton under the case, a dim wire crate beside it (faint cross-hatch + a few dim holes)
  carton(R, [[1802, 638], [1840, 636], [1840, 742], [1802, 744]], { cov: 0.72, pk: 64, per: 5.6, seed: 131, lit: [1.05, 0.7], endB: 10, drip: 0.3 });
  area(R, [[1845, 642], [1952, 644], [1952, 760], [1845, 758]], { pk: 34, ang: 0.02, per: 7, covG: [[1900, 642], [1900, 760], [[0, 0.14], [1, 0.03]]] });
  jacks(R, 1850, 646, 1950, 700, 7, 14, 64, 0.62, 132, 1.5, (x, y) => 1 - 0.6 * clamp((y - 646) / 60));
  jacks(R, 1764, 646, 1798, 756, 8, 6, 20, 0.45, 133, 0.9);
  // the dark leaning bag at the right: brushy, lit only along its upper-left rim
  const bag = [[1956, 536], [2040, 528], [2044, 600], [2030, 640], [1962, 642], [1950, 596]];
  area(R, bag, { ang: 1.85, per: 4.2, pk: 70, covG: [[1975, 532], [2010, 640], [[0, 0.5], [0.45, 0.26], [1, 0.04]]] });
  edge(R, [[1952, 596], [1956, 560], [1962, 537], [2000, 531], [2040, 528]], 1.5, 55, 0.85, 91, 0.6, true);
  // ropes hanging below it (the source shows two lit loops)
  cable(R, [[1994, 760], [1991, 712], [1998, 664], [2020, 630], [2044, 618]], 2.6, 7, 42, 92);
  cable(R, [[2006, 760], [2005, 714], [2014, 672], [2044, 642]], 2.2, 6, 30, 93);
  // the desk: a lit front edge (a few tapered strokes) and a grille below (engraved rows broken into dashes)
  edge(R, [[1860, 763], [1900, 766], [1950, 773], [2000, 781], [2036, 789]], 2.6, 72, 0.95, 94, 0.5, true);
  edge(R, [[1866, 769], [1950, 779], [2034, 795]], 1.6, 44, 0.9, 95, 0.5, true);
  edge(R, [[1880, 774], [1940, 782], [2000, 790]], 1.1, 30, 0.8, 96, 0.5, true);
  edge(R, [[1872, 779], [1960, 790], [2030, 803]], 1.0, 22, 0.8, 97, 0.5, true);
  const gr = [[1866, 790], [2034, 806], [2034, 946], [1866, 946]];
  area(R, gr, { ang: 0.15, per: 8.2, pk: 130, covG: [[1866, 800], [2034, 880], [[0, 0.1], [0.5, 0.24], [1, 0.34]]], pkG: [[1866, 860], [2034, 860], [[0, 0.3], [0.5, 0.55], [1, 1.0]]] });
  mulOn(R.v, gr, (() => { const g = R.v.createLinearGradient(0, 860, 0, 946); g.addColorStop(0, "#fff"); g.addColorStop(0.3, "#ddd"); g.addColorStop(0.6, "#555"); g.addColorStop(0.85, "#111"); g.addColorStop(1, "#000"); return g; })());
  const r = rng(98);
  for (let x = 1868; x < 2036; x += 7.5 + r() * 4) {
    const w = 2.2 + r() * 2.2, s = 0.06 + (r() - 0.5) * 0.04;
    mulOn(R.v, [[x, 780], [x + w, 780], [x + w + s * 170, 950], [x + s * 170, 950]], "#000", gr);
  }
  // a dotted leg at the left end of the desk
  for (let y = 862; y < 946; y += 5 + r()) { R.o.fillStyle = col(18 + 14 * r(), 1795, y, 0.9); R.o.beginPath(); R.o.ellipse(1794.5 + (r() - 0.5), y, 1.4, 1.1, 0, 0, 7); R.o.fill(); }
}

function rightCartons(R) {
  // R1: the lit carton the plant stands on (a front face and a thin lid face), R2 below
  carton(R, [[1914, 368], [2064, 342], [2064, 470], [1914, 472]], { cov: 0.72, pk: 110, per: 5.8, lit: [1.05, 0.72], seed: 141, endB: 12, drip: 0.25 });
  area(R, [[1932, 352], [2064, 320], [2064, 342], [1914, 368]], { cov: 0.42, pk: 72, ang: -0.24, per: 3.4 });
  edge(R, [[1914, 368], [1990, 355], [2064, 342]], 1.4, 105, 0.75, 142);
  carton(R, [[1916, 474], [2050, 470], [2050, 532], [1916, 534]], { cov: 0.7, pk: 72, per: 6.0, lit: [1, 0.75], seed: 143, endB: 8 });
  edge(R, [[1916, 474], [2050, 470]], 1.2, 60, 0.7, 144);
}

function plant(R) {
  // a pothos in a round ribbed pot on R1: broad heart leaves of varied size and turn, each engraved along its veins
  // (lit half brighter than the shaded half), a dark midrib and a lit rim; the right of the clump is in shadow
  area(R, (g) => g.ellipse(2084, 296, 24, 24, 0, 0, 7), { cov: 0.42, pk: 72, ang: 1.62, per: 3.2, at: [2084, 296],
    covG: [[2084, 272], [2084, 320], [[0, 0.62], [0.5, 0.4], [1, 0.1]]], pkG: [[2066, 280], [2104, 312], [[0, 1.1], [1, 0.6]]] });
  const stems = [[[2080, 276], [2060, 245], [2044, 208]], [[2082, 276], [2098, 235], [2102, 198]], [[2074, 280], [2030, 250], [2010, 240]], [[2066, 284], [2030, 285], [1996, 282]],
    [[2004, 292], [2006, 330], [2016, 370], [2022, 410], [2024, 432]], [[2090, 278], [2120, 250], [2140, 240]]];
  for (const [i, st] of stems.entries()) edge(R, st, 1.3, 20, 1, 150 + i, 0.4, true);
  // leaves: [x, y (base), tip angle, length, lit level] (positions from blob detection on the averaged source)
  const L = [
    [2043, 214, -2.2, 26, 64], [2098, 206, -0.9, 27, 64], [2100, 222, 0.1, 22, 56], [2066, 224, -2.6, 18, 46],
    [2020, 240, 2.7, 28, 70], [2080, 240, 1.4, 34, 76], [2052, 264, 2.1, 25, 64], [2010, 278, 2.9, 27, 66],
    [2030, 286, 1.6, 23, 56], [1999, 305, 2.2, 23, 62], [2026, 320, 1.5, 25, 64], [1998, 342, 1.8, 27, 68],
    [2024, 352, 1.1, 27, 68], [2016, 384, 1.7, 20, 48], [2020, 404, 1.5, 18, 42], [1987, 290, 3.0, 20, 48],
    [2046, 238, -1.6, 18, 48], [2062, 252, -0.4, 16, 42], [2032, 196, -1.9, 20, 52],
    [2120, 236, 0.3, 22, 26], [2132, 254, 1.0, 22, 22], [2108, 260, 1.9, 20, 26], [2150, 232, -0.2, 20, 20], [2135, 208, -0.6, 18, 20],
    [2118, 278, 1.3, 18, 20], [2155, 262, 0.8, 18, 18],
  ];
  const leaves = [];
  L.forEach(([x, y, a0, len0, lv], i) => {
    const a = a0 + (hash(i, 11) - 0.5) * 0.7, len = len0 * (0.78 + 0.5 * hash(i, 12)), wid = 0.62 + 0.18 * hash(i, 13);
    const c = Math.cos(a), sn = Math.sin(a), n = [-sn, c];
    const P = (u, v) => [x + c * len * u + n[0] * len * v, y + sn * len * u + n[1] * len * v];
    // broad heart: shallow lobes at the stem, widest a third of the way out, a short point
    const half = (s) => [P(0.08, 0), P(-0.02, s * 0.2 * wid), P(0.12, s * 0.42 * wid), P(0.38, s * 0.47 * wid), P(0.68, s * 0.3 * wid), P(0.92, s * 0.08 * wid), P(1, 0)];
    // which half faces the light (upper left)?
    const litSide = (n[0] * LIGHT[0] + n[1] * LIGHT[1]) > 0 ? 1 : -1;
    for (const s of [1, -1]) {
      const pts = half(s);
      const vein = a + s * 0.75;
      const on = s === litSide;
      area(R, (g) => { g.moveTo(pts[0][0], pts[0][1]); smoothPath(g, pts, false); g.closePath(); }, { cov: 1, pk: on ? lv * 1.05 : lv * 0.5, ang: vein, style: 2, at: P(0.4, s * 0.2) });
    }
    leaves.push({ P, litSide, lv, wid, i });
  });
  for (const { P, litSide, lv, wid, i } of leaves) {
    edge(R, [P(0.06, 0), P(0.5, 0.01), P(0.95, 0)], 1.5, 3, 0.9, 160 + i, 0.2);
    const s = litSide;
    edge(R, [P(-0.02, s * 0.2 * wid), P(0.12, s * 0.42 * wid), P(0.38, s * 0.47 * wid), P(0.68, s * 0.3 * wid), P(0.92, s * 0.08 * wid)], 1.3, Math.min(130, lv * 1.9), 0.85, 190 + i, 0.3, true);
    edge(R, [P(0.12, -s * 0.42 * wid), P(0.38, -s * 0.47 * wid), P(0.68, -s * 0.3 * wid)], 0.8, 3, 0.7, 220 + i, 0.3, true);
    for (const [u, k] of [[0.3, 1], [0.55, 1], [0.3, -1], [0.55, -1]]) edge(R, [P(u, 0), P(u + 0.12, k * 0.16 * wid), P(u + 0.2, k * 0.3 * wid)], 0.7, 4, 0.45, 250 + i * 4 + u * 10 + k, 0.1, true);
  }
}

function speaker(R) {
  const r = rng(161);
  // measured on column profiles: the front's top edge descends to the right (the top is seen from above)
  const cab = [[2076, 383], [2120, 391], [2150, 400], [2206, 414], [2206, 946], [2026, 946]];
  // cabinet front: pale wood (a flat tone) cut by irregular dark grain grooves that swell and taper, a few broad
  // greyer brush streaks; everything leans with the cabinet (grooves ~1.2-2.6 px, 4-10 px apart on the source)
  const lean = Math.atan2(946 - 382, 2026 - 2076);
  area(R, cab, { cov: 1, pk: 200, ang: lean, style: 2 });
  const slope = -50 / 564;
  for (let x = 2030; x < 2215; x += 3 + r() * 7) {
    const y0 = 360 + r() * 300, L = 60 + r() * 360, w = 3 + r() * 6;
    const X = (y) => x + slope * (y - 382);
    if (r() < 0.45) mulOn(R.v, [[X(y0), y0], [X(y0) + w, y0], [X(y0 + L) + w, y0 + L], [X(y0 + L), y0 + L]], grey(0.62 + 0.3 * r()), cab);
  }
  const grooves = [];
  for (let x = 2028; x < 2215; x += 3.4 + r() * 3.4) {
    let y0 = 360 + r() * 40;
    while (y0 < 946) {
      const L = 70 + r() * 360, w = 1.4 + r() * 1.9, ph = r() * 6, amp = 0.4 + r() * 1.2;
      const pts = [];
      for (let k = 0; k <= 8; k++) { const y = Math.min(950, y0 + (L * k) / 8); pts.push([x + slope * (y - 382) + Math.sin(y * 0.018 + ph) * amp, y]); }
      grooves.push([pts, w, 0.8 + 0.2 * r()]);
      y0 += L + 4 + r() * 36;
    }
  }
  // shade: the top overhang, the strip between the drivers, the lower left and the bottom
  const shade = (pts, g) => mulOn(R.v, pts, g, cab);
  const lg = (x0, y0, x1, y1, a, b) => { const g = R.v.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, grey(a)); g.addColorStop(1, grey(b)); return g; };
  shade([[2020, 370], [2210, 370], [2210, 480], [2020, 480]], lg(0, 395, 0, 480, 0.42, 1));
  shade([[2110, 370], [2210, 370], [2210, 470], [2110, 470]], lg(2110, 0, 2206, 0, 1, 0.8));
  shade([[2120, 578], [2210, 578], [2210, 640], [2120, 640]], lg(0, 578, 0, 640, 0.75, 0.45));
  shade([[2020, 620], [2140, 620], [2140, 950], [2020, 950]], lg(2040, 700, 2075, 880, 1, 0.12));
  shade([[2020, 880], [2210, 880], [2210, 950], [2020, 950]], lg(0, 895, 0, 946, 1, 0.12));
  R.o.save(); R.o.beginPath(); polyFn(cab)(R.o); R.o.clip();
  for (const [pts, w, al] of grooves) { const [cx, cy] = cen(pts); taper(R.o, pts, (u) => w * Math.pow(Math.sin(Math.PI * u), 0.45), col(6, cx, cy, al)); }
  R.o.restore();
  // the top face: a lit wedge with grain running back to the upper right
  area(R, [[2076, 383], [2090, 375], [2150, 366], [2206, 356], [2206, 414], [2150, 400], [2120, 391]], { cov: 0.5, pk: 175, ang: -0.1, per: 6 });
  edge(R, [[2076, 383], [2051, 660], [2026, 946]], 2.4, 205, 0.9, 170, 0.5);
  edge(R, [[2078, 384], [2120, 392], [2150, 401], [2206, 414]], 2.4, 200, 0.9, 171, 0.5);
  edge(R, [[2078, 382], [2090, 375], [2150, 366], [2206, 357]], 1.3, 120, 0.8, 174, 0.5);
  edge(R, [[2090, 392], [2066, 660], [2042, 946]], 1.4, 8, 0.6, 172, 0.5);

  // the drivers (traced on 2.5-4x crops of the averaged source: frame outer / frame inner / cone edge / dust cap)
  // both drivers are strongly foreshortened (seen ~50 deg from the left): centred under their dust caps, not at the
  // frame edge (ellipses fitted to the surround's edge points on dark-run scans, checked by overlay)
  const TW = { fo: [2178, 527, 41, 64], fi: [2178, 527, 34, 55], co: [2178, 527, 28, 47], cap: [2178, 527, 14, 25] };
  const WF = { fo: [2157, 776, 99, 150], fi: [2155, 768, 82, 127], co: [2157, 772, 60, 108], cap: [2163, 765, 22, 36] };
  for (const D of [TW, WF]) { blank(R, ellPath([D.fo[0], D.fo[1], D.fo[2] + 2, D.fo[3] + 2])); fillEll(R.o, [D.fo[0], D.fo[1], D.fo[2] + 1.5, D.fo[3] + 1.5], "#000"); }
  // --- woofer. Frame: a lit metal band (brightest on the left, dimmer over the top), a dark outer lip, two
  // engraved grooves; surround black; cone: bold pale rings on the upper left, dark on the right, a flat lit facet
  // low on the left under the cap's shadow; the cap dark with a broad engraved highlight high on its left.
  {
    const { fo, fi, co, cap } = WF;
    // (measured round the ring: brightest on the left and upper left, dim on top right, dark low on the right)
    const ringLvl = (x, y) => {
      const th = Math.atan2((y - fo[1]) / fo[3], (x - fo[0]) / fo[2]);
      const k = [[-Math.PI, 180], [-2.4, 176], [-1.57, 150], [-0.8, 100], [0, 50], [0.8, 40], [1.57, 85], [2.4, 150], [Math.PI, 180]];
      for (let i = 1; i < k.length; i++) if (th <= k[i][0]) { const f = (th - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * f; }
      return 180;
    };
    ringCut(R.o, { outer: fo, inner: fi, n: 5, sp: 5.2, seed: 301, wob: 0.4, wj: 0.3, val: () => 0.68, lvl: ringLvl });
    ringCut(R.o, { outer: [fo[0], fo[1], fo[2] + 3, fo[3] + 3], inner: [fo[0], fo[1], fo[2] - 1, fo[3] - 1], n: 1, sp: 4.4, seed: 302, wob: 0.6, val: (x, y, th) => (Math.cos(th) < 0 ? 0.95 : 0.6), lvl: () => 2 });
    // upper cone: bold pale rings over the dark (upper-left half), faint on the right
    const capO = [cap[0], cap[1], cap[2] * 1.35, cap[3] * 1.2];
    ringCut(R.o, { outer: co, inner: [cap[0], cap[1], cap[2] * 1.18, cap[3] * 1.1], n: 17, sp: 4.6, seed: 303, wob: 1.3, wj: 0.55, step: 2, minW: 0.5,
      val: (x, y, th) => (y > 790 + (x - 2100) * 0.2 ? 0 : clamp(0.58 + 0.12 * Math.cos(th + 2.3), 0, 1)),
      lvl: (x, y) => 150 + 40 * clamp((2150 - x) / 50) });
    // the lit facet low in the cone (flat, two tones split on a diagonal), under the cap's shadow crescent
    const facet = [];
    for (let a = 2.95; a >= 1.6; a -= 0.05) facet.push([co[0] + Math.cos(a) * co[2], co[1] + Math.sin(a) * co[3]]);
    facet.push([2172, 872], [2186, 850], [2194, 826], [2196, 810], [2186, 808], [2160, 801], [2130, 795], [2104, 790]);
    R.o.save(); R.o.beginPath(); polyFn(facet)(R.o); R.o.clip();
    R.o.fillStyle = col(158, 2150, 835); R.o.fillRect(2090, 780, 120, 110);
    R.o.fillStyle = col(158, 2180, 860, 0.9); R.o.beginPath(); R.o.moveTo(2120, 885); R.o.lineTo(2206, 822); R.o.lineTo(2206, 890); R.o.closePath(); R.o.fill();
    ringCut(R.o, { outer: co, inner: capO, n: 9, sp: 2.2, seed: 304, wob: 0.8, wj: 0.5, val: () => 0.42, lvl: () => 120, alpha: 0.5 });
    R.o.restore();
    // radial dark spikes round the cap (right and below) and the cap's shadow crescent
    const q = rng(305);
    for (let i = 0; i < 16; i++) {
      const a = -0.9 + i * 0.16 + (q() - 0.5) * 0.08, r0 = 1.05 + 0.1 * q(), L = 10 + 16 * q();
      const p0 = [cap[0] + Math.cos(a) * cap[2] * r0, cap[1] + Math.sin(a) * cap[3] * r0], p1 = [p0[0] + Math.cos(a) * L, p0[1] + Math.sin(a) * L * 0.8];
      const sw = 2.5 + 2 * q(); taper(R.o, resample([p0, p1], 2), (u) => sw * (1 - u), col(3, p0[0], p0[1], 0.9));
    }
    R.o.fillStyle = col(2, 2185, 800); R.o.beginPath(); R.o.ellipse(cap[0] + 8, cap[1] + 9, cap[2] * 1.3, cap[3] * 1.08, -0.2, 0, 7); R.o.fill();
    // dust cap
    fillEll(R.o, [cap[0], cap[1], cap[2] * 1.12, cap[3] * 1.08], col(3, cap[0], cap[1]));
    fillEll(R.o, cap, col(12, cap[0], cap[1]));
    // the highlight: a broad lit patch high on the cap's left, cut by a few dark strokes running down it
    const hl = [[cap[0] - 11, cap[1] - 16], [cap[0] - 7, cap[1] - 28], [cap[0] + 1, cap[1] - 32], [cap[0] + 7, cap[1] - 25], [cap[0] + 7, cap[1] - 14], [cap[0] + 2, cap[1] - 8], [cap[0] - 6, cap[1] - 8]];
    R.o.fillStyle = col(188, cap[0] - 3, cap[1] - 20); R.o.beginPath(); smoothPath(R.o, hl, true); R.o.fill();
    for (let i = 0; i < 8; i++) { const x = cap[0] - 10 + i * 2.6 + q() * 1.5, y = cap[1] - 20 + q() * 10; const w = 1.2 + q(); taper(R.o, resample([[x, y], [x + 1 + q() * 2, y + 10 + q() * 10]], 2), (u) => w * Math.sin(Math.PI * u), col(10, x, y, 0.8)); }
    // a crack across the upper rings, the screw
    edge(R, [[2101, 746], [2112, 748], [2124, 752], [2137, 756]], 1.3, 2, 0.9, 306, 0.6);
  }
  // --- tweeter: a dark frame with a few lit rings at its top left, black surround, pale rings low on the cone's
  // left, a dark cap with a broad highlight high on its left
  {
    const { fo, fi, co, cap } = TW;
    ringCut(R.o, { outer: fo, inner: fi, n: 3, sp: 2.8, seed: 311, wob: 0.4, wj: 0.4,
      val: (x, y, th) => (Math.sin(th) < -0.25 && Math.cos(th) < 0.2 ? 0.75 : Math.cos(th) < -0.5 || Math.sin(th) > 0.6 ? 0.55 : 0.3), lvl: () => 140 });
    const capO = [cap[0], cap[1], cap[2] * 1.35, cap[3] * 1.2];
    ringCut(R.o, { outer: co, inner: capO, n: 7, sp: 4.2, seed: 312, wob: 0.8, wj: 0.45,
      val: (x, y, th) => (Math.sin(th) > 0.1 ? 0.7 + 0.25 * Math.sin(th) : Math.sin(th) < -0.4 && Math.cos(th) < -0.2 ? 0.3 : 0.08),
      lvl: (x, y) => (y > 535 ? 188 : 120) });
    fillEll(R.o, [cap[0], cap[1], cap[2] * 1.15, cap[3] * 1.1], col(3, cap[0], cap[1]));
    fillEll(R.o, cap, col(14, cap[0], cap[1]));
    const q = rng(313);
    for (let i = 0; i < 3; i++) {
      const rr = 0.35 + 0.2 * i, arc = [];
      for (let a = -2.8 + 0.12 * q(); a <= -0.9 - 0.1 * q(); a += 0.08) arc.push([cap[0] - 2 + Math.cos(a) * cap[2] * rr, cap[1] - 4 + Math.sin(a) * cap[3] * rr]);
      taper(R.o, arc, (u) => (4.2 - 0.8 * i) * Math.pow(Math.sin(Math.PI * u), 0.5), col(200 - 16 * i, cap[0] - 4, cap[1] - 12, 0.95));
    }
  }
  R.o.fillStyle = col(10, 2100, 655, 1); R.o.beginPath(); R.o.arc(2100, 655, 4, 0, 7); R.o.fill();
  edge(R, [[2096, 652], [2100, 651], [2104, 653]], 1.2, 120, 0.9, 173, 0.2);
}

// Build the whole room (x >= x0) and return it as a 1x canvas of width W - x0.
export function buildRoom(x0) {
  const R = makeRoom(x0);
  farBack(R);
  column(R);
  leftStack(R);
  gear(R);
  synth(R);
  flightCase(R);
  lowRoom(R);
  rightCartons(R);
  plant(R);
  speaker(R);
  edgesLeft(R);
  // cut, multiply the line tone in, then the hand-drawn overlay on top
  const cut = engraveCanvases(R.P.valC, R.P.dirC, { spacing: S0 * 2, seed: 17, contrast: 1 });
  const cg = cut.getContext("2d");
  cg.save(); cg.globalCompositeOperation = "multiply"; cg.drawImage(R.T, 0, 0); cg.restore();
  cg.drawImage(R.P.overC, 0, 0);
  // the source room is soft (its ridges are rounded bumps, not knife-edged lines): a light blur at 2x, then 2:1
  const soft = document.createElement("canvas"); soft.width = cut.width; soft.height = cut.height;
  const sg = soft.getContext("2d"); sg.filter = `blur(${BLUR2}px)`; sg.drawImage(cut, 0, 0); sg.filter = "none";
  const out = document.createElement("canvas"); out.width = R.w; out.height = H;
  const og = out.getContext("2d"); og.imageSmoothingEnabled = true; og.imageSmoothingQuality = "low";
  og.drawImage(soft, 0, 0, soft.width, soft.height, 0, 0, R.w, H);
  for (const c of [R.P.valC, R.P.dirC, R.P.overC, R.T, cut, soft]) { c.width = c.height = 1; }
  return out;
}
