// s18 hand-drawn parts (fix pass 4): pieces the traced ink drawings got wrong, redrawn by hand with Canvas2D paths from
// measurements taken on the source frames (coordinates read off zoomed, gridded source crops; no pixels).
//   - inpaintPoly: removes traced marks inside a polygon (a plane fitted to the light pixels round it, feathered)
//   - drawSoft: draws into a scratch layer, softens it, composites it
//   - beakA, outline: the shot-A owl's hooked beak and inked silhouette
//   - footRig / drawFoot / footMask: the owl's feet (planted, clenched, motion-blurred), from a few measured points
//   - engraveRegion: re-engraves a plate region as fine parallel lines keeping its local mean value
import { taper } from "../../lib/ink.js";
import { noise2, hash } from "../../lib/rng.js";
import { sampleCurve, smoothPath } from "../../lib/paths.js";
import { cpuCanvas } from "./inkdraw.js";

export const gv = (v, a = 1) => { const c = Math.max(0, Math.min(255, Math.round(v))); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };
const polyPath = (g, P) => { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); };

// Fill polygon P (coords of the canvas's content; the canvas origin is at (ox, oy)) with a smooth plane fitted to the
// light pixels just outside it (within pad px, value >= vmin, so neighbouring ink does not bleed in): the traced marks
// inside are gone and the surrounding shading carries through. Alpha inside is set opaque. Deterministic.
export function inpaintPoly(canvas, P, ox = 0, oy = 0, pad = 4, vmin = 150, feather = 3) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const X0 = Math.max(0, Math.floor(x0 - ox) - pad - 1), Y0 = Math.max(0, Math.floor(y0 - oy) - pad - 1);
  const X1 = Math.min(canvas.width, Math.ceil(x1 - ox) + pad + 2), Y1 = Math.min(canvas.height, Math.ceil(y1 - oy) + pad + 2);
  const w = X1 - X0, h = Y1 - Y0;
  if (w <= 0 || h <= 0) return;
  const mask = (grow, soft = 0) => {
    const m = cpuCanvas(w, h), mg = m.getContext("2d");
    mg.translate(-X0 - ox, -Y0 - oy); mg.fillStyle = "#fff"; mg.strokeStyle = "#fff"; polyPath(mg, P); mg.fill();
    if (grow) { mg.lineWidth = 2 * grow; mg.lineJoin = "round"; mg.stroke(); }
    if (soft) { mg.setTransform(1, 0, 0, 1, 0, 0); const t = cpuCanvas(w, h), tg = t.getContext("2d"); for (let k = 0; k < soft; k++) { tg.clearRect(0, 0, w, h); tg.drawImage(m, 0.5, 0.5); mg.clearRect(0, 0, w, h); mg.drawImage(t, -0.5, -0.5); } }
    return mg.getImageData(0, 0, w, h).data;
  };
  const Min = mask(0), Mout = mask(pad), Mf = feather ? mask(0, 2 * feather * feather) : Min;
  const g = canvas.getContext("2d", { willReadFrequently: true }), id = g.getImageData(X0, Y0, w, h), d = id.data;
  // least squares plane through the ring's light pixels
  let S = [0, 0, 0, 0, 0, 0, 0, 0, 0], n = 0; const bv = [0, 0, 0];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const p = 4 * (j * w + i);
    if (Min[p + 3] > 20 || Mout[p + 3] < 128 || d[p + 3] < 250 || d[p] < vmin) continue;
    const u = [1, i, j];
    for (let r = 0; r < 3; r++) { bv[r] += u[r] * d[p]; for (let c = 0; c < 3; c++) S[3 * r + c] += u[r] * u[c]; }
    n++;
  }
  let coef = [n ? bv[0] / n : 235, 0, 0];
  if (n > 12) {
    // solve S coef = bv (3x3, Cramer)
    const det3 = (m) => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
    const D = det3(S);
    if (Math.abs(D) > 1e-6) coef = [0, 1, 2].map((k) => { const m = S.slice(); for (let r = 0; r < 3; r++) m[3 * r + k] = bv[r]; return det3(m) / D; });
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const p = 4 * (j * w + i), a = Mf[p + 3] / 255;
    if (a <= 0) continue;
    const v = coef[0] + coef[1] * i + coef[2] * j;
    for (let c = 0; c < 3; c++) d[p + c] = Math.round(d[p + c] * (1 - a) + v * a);
    d[p + 3] = Math.round(d[p + 3] * (1 - a) + 255 * a);
  }
  g.putImageData(id, X0, Y0);
}

// Draw fn (in content coords) into a scratch canvas over box [x0, y0, x1, y1], soften it by `passes` half-pixel passes
// (sigma ~0.71 sqrt(passes)) and composite it onto canvas (whose origin is at (ox, oy)). The scratch is transparent
// round the marks, so no seam appears at the box edge.
export function drawSoft(canvas, ox, oy, box, fn, passes = 1, softHalf) {
  const X0 = Math.floor(box[0]) - 4, Y0 = Math.floor(box[1]) - 4, w = Math.ceil(box[2]) - X0 + 8, h = Math.ceil(box[3]) - Y0 + 8;
  const t = cpuCanvas(w, h), tg = t.getContext("2d");
  tg.translate(-X0, -Y0); fn(tg);
  if (passes > 0) softHalf(t, 1, passes);
  const g = canvas.getContext("2d");
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  g.drawImage(t, X0 - ox, Y0 - oy); g.restore();
}

// A tapered ink line through smoothed points; w0 / w1 the widths at the ends, wm in the middle.
export function line(g, pts, wm, v, { w0 = 0.5, w1 = 0.5, per = 6, alpha = 1 } = {}) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(g, q, (u) => wm * (u < 0.5 ? w0 + (1 - w0) * Math.sin(Math.PI * u) : w1 + (1 - w1) * Math.sin(Math.PI * u)), gv(v, alpha));
}

// ---------------------------------------------------------------- shot A beak
// Read off source frames 1356 and 1370 at 8x (registered = frame-1356 placement; identical within 1 px in all
// three wing-phase drawings): a hooked upper mandible, its left side curving down to the tip at (533, 421), a
// dark V-shaped open mouth under it (x 540-561, y 405-418), a pale lower mandible (bottom edge 540,425 -> 565,411),
// a nostril dot at (536, 391), grey shade on the mandible's right flank. The traced beak (a rounded outline round a
// large black mouth blob) and the stray dark line running from it down-left across the cheek are inpainted away.
export const BEAK_COVER = [[521, 377], [546, 375], [571, 397], [573, 419], [565, 434], [540, 434], [524, 432], [517, 424], [516, 400]];
export function beakA(g) {
  if (BEAK2) { beakA2(g); return; }
  // upper mandible (fill, then its grey flank), mouth wedge, lower mandible
  const up = [[533, 421], [529.5, 417], [526, 411], [524, 404], [524, 396], [526, 389], [530, 384.5], [535, 382.5], [540, 383], [546, 386], [552, 391.5], [557, 397.5], [561, 403], [564, 408], [559, 405.5], [552, 405], [545, 406], [540, 409], [536.5, 415]];
  g.save();
  g.fillStyle = gv(236); g.beginPath(); smoothPath(g, up, true); g.fill();
  g.clip();
  // the grey shade under the hook (registered source mean: 175-215 at x 540-555, y 395-400)
  const sh = g.createRadialGradient(551, 399, 1, 551, 399, 15);
  sh.addColorStop(0, gv(168, 0.95)); sh.addColorStop(0.6, gv(185, 0.6)); sh.addColorStop(1, gv(200, 0));
  g.fillStyle = sh; g.fillRect(533, 382, 34, 28);
  g.restore();
  const low = [[540, 425.5], [547, 425], [554, 423], [560, 420], [564, 416], [565, 411], [561, 408.5], [553, 413], [546, 418], [541, 422.5]];
  g.fillStyle = gv(196); g.beginPath(); smoothPath(g, low, true); g.fill();
  // the open mouth: a dark V, wide at the top (x 538-561 at y 405-410), its point at (541, 424)
  const mouth = [[538.5, 406.5], [546, 404.8], [553, 404.8], [561, 406.2], [556, 411], [549, 416.5], [542, 424], [538.5, 414]];
  g.fillStyle = gv(40); g.beginPath(); smoothPath(g, mouth, true); g.fill();
  // ink: the mandible's outer contour, its lower (mouth) edge, the lower mandible's edges, the nostril
  line(g, [[533, 421], [529.5, 417], [526, 411], [524, 404], [524, 396], [526, 389], [530, 384.5], [535, 382.5], [540, 383], [546, 386], [552, 391.5], [557, 397.5], [561, 403], [564, 408]], 2.9, 52, { w0: 0.55, w1: 0.7 });
  line(g, [[533.5, 421], [536.5, 415], [540, 409.5], [545, 406.2], [552, 405.2], [559, 405.6], [564, 408]], 2.3, 48, { w0: 0.6, w1: 0.6 });
  line(g, [[540, 425.5], [547, 425.2], [554, 423.2], [560, 420], [564, 416], [565.5, 411]], 2.1, 78, { w0: 0.8, w1: 0.3 });
  line(g, [[542, 422], [546, 418], [553, 413], [560.5, 408.5]], 1.6, 70, { w0: 0.4, w1: 0.5 });
  g.fillStyle = gv(125); g.beginPath(); g.ellipse(536, 391, 1.5, 1.3, 0, 0, 2 * Math.PI); g.fill();
}
// Fix pass 2 (review 2): the mouth was a filled grey quad and a solid black triangle, too heavy. Re-read on the median
// of the registered standing frames 1346-1381 (value table at 1 px): the hook's point at (531, 421); the mouth's dark gap
// is narrow (~70 at x 543-558, y 405-410, thinning to a dark stroke down to (547, 420)); left of it the chin is white,
// right of it the lower mandible is white turning grey (~165-175) at its right end (x 558-566, y 408-424); its bottom
// contour is a thin grey-dark line (~100) at y 426 from x 538, fading out to the right; the upper mandible's right edge
// is a thin mid-grey line (~145).
export const BEAK2 = true;
function beakA2(g) {
  const up = [[531, 421], [528.5, 417], [525.5, 411], [523.5, 404], [523.5, 396], [525.5, 389], [529.5, 384.5], [535, 382.5], [540, 383], [546, 386], [552, 391.5], [557, 397.5], [561, 403], [564, 407], [559, 405.2], [552, 404.8], [545, 405.6], [540, 408.5], [535.5, 414]];
  g.save();
  g.fillStyle = gv(238); g.beginPath(); smoothPath(g, up, true); g.fill();
  g.clip();
  // the flank shade under the hook's right side (source 173-198 over x 540-554, y 396-404)
  const sh = g.createRadialGradient(548, 401, 1, 548, 401, 15);
  sh.addColorStop(0, gv(168, 1)); sh.addColorStop(0.55, gv(182, 0.8)); sh.addColorStop(1, gv(200, 0));
  g.fillStyle = sh; g.fillRect(533, 382, 34, 28);
  g.restore();
  // the mouth: white patches either side of a dark crease, grey at its right end
  const low = [[537, 426], [545, 426.5], [553, 425], [559, 422], [564, 417], [566, 411], [563, 407.5], [556, 409.5], [549, 411], [543, 413], [538, 420]];
  g.save(); g.beginPath(); smoothPath(g, low, true);
  const lg = g.createLinearGradient(538, 416, 566, 416); lg.addColorStop(0, gv(226)); lg.addColorStop(0.45, gv(210)); lg.addColorStop(0.68, gv(160)); lg.addColorStop(1, gv(140));
  g.fillStyle = lg; g.fill(); g.restore();
  // the mouth's dark gap (x 544-558, y 404-410, ~70) and the crease down from it (x 546-550 to y 421)
  const gap = [[541, 406], [548, 403.2], [556, 403.6], [561.5, 406], [558, 409.8], [552.5, 411.4], [551, 414.5], [550.8, 422], [547.4, 422.5], [545.6, 415], [544.2, 411], [541, 409]];
  g.fillStyle = gv(34); g.beginPath(); smoothPath(g, gap, true); g.fill();
  // the lower-left corner of the mouth (grey-dark ~120-150 at x 540-544, y 419-425)
  const cg = g.createRadialGradient(541.5, 422.5, 0.5, 541.5, 422.5, 5); cg.addColorStop(0, gv(80, 0.95)); cg.addColorStop(1, gv(130, 0));
  g.fillStyle = cg; g.fillRect(535, 416, 13, 13);
  // ink: the upper mandible's outer contour (dark on the left, a thin mid-grey line on its right edge), its lower edge
  // from the hook up into the gap, the lower mandible's bottom contour, the nostril
  line(g, [[531, 421], [528.5, 417], [525.5, 411], [523.5, 404], [523.5, 396], [525.5, 389], [529.5, 384.5], [535, 382.5], [540, 383], [546, 386]], 2.7, 55, { w0: 0.55, w1: 0.8 });
  line(g, [[546, 386], [552, 391.5], [557, 397.5], [561, 403], [564, 407]], 2.0, 128, { w0: 0.8, w1: 0.6 });
  line(g, [[531.5, 421], [534.5, 416.5], [537.5, 411.5], [541, 407.5], [546, 405]], 2.4, 45, { w0: 0.6, w1: 0.9 });
  line(g, [[538.5, 425.5], [543, 426.4], [549, 426.2], [555, 424.8], [561, 421]], 3.0, 48, { w0: 0.8, w1: 0.3 });
  line(g, [[561, 407], [563.5, 413], [562.5, 419]], 2.0, 120, { w0: 0.6, w1: 0.4 });
  g.fillStyle = gv(130); g.beginPath(); g.ellipse(536, 391, 1.4, 1.2, 0, 0, 2 * Math.PI); g.fill();
}

// ---------------------------------------------------------------- inked silhouette
// A closed ring [x0, y0, x1, y1, ...] stroked as the owl's outline: ~2.6 px, near black (measured across the shot-A
// wing's leading edge against the slats: a 4-6 px dip to 50-100 in the graded source, i.e. a ~2.5 px ink line after the
// film's softening).
export function outline(g, ring, w = 2.6, v = 38) {
  g.beginPath(); g.moveTo(ring[0], ring[1]);
  for (let i = 2; i < ring.length; i += 2) g.lineTo(ring[i], ring[i + 1]);
  g.closePath();
  g.lineWidth = w; g.lineJoin = "round"; g.strokeStyle = gv(v); g.stroke();
}

// ---------------------------------------------------------------- owl feet rig
// A foot drawn from a few measured points (registered px):
//   a: ankle; h: leg top (under the belly) or null; toes: the front toes' tip points (planted feet, lying on the key,
//   drawn as slightly drooping tubes from the ankle to each tip); back: the back toe's tip or null;
//   or, for a lifted, clenched foot seen from the sole (a "C"): dir (deg, screen: 0 right, 90 down), len, curl 0..1,
//   palm +1 clockwise / -1; spread (deg).
//   tw: toe width at the root (px, default 11); lw: leg width (default 10); blur: [dx, dy] motion streak; soft: passes.
// Each toe is a tapered white tube with a dark contour (a wider dark tube under it), crease lines across it and a dark
// hooked claw; the leg a white tube with scale lines. Values as measured on the source's lit talons: white ~236,
// contour ~40, creases ~105, claws ~18.
const d2r = Math.PI / 180;
function arcPts(A, B, bend, n = 12) {
  // quadratic from A to B, the control point pushed off the chord by bend * |AB| (to the chord's right when bend > 0)
  const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
  const cx = mx - (dy / L) * bend * L, cy = my + (dx / L) * bend * L, out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * A[0] + 2 * u * t * cx + t * t * B[0], u * u * A[1] + 2 * u * t * cy + t * t * B[1]]); }
  return out;
}
function curlPts(A, th0, L, K, palm, n = 16) {
  const pts = [[A[0], A[1]]]; let x = A[0], y = A[1];
  for (let i = 1; i <= n; i++) { const s = i / n, th = th0 + palm * K * Math.pow(s, 1.4), ds = L / n; x += Math.cos(th) * ds; y += Math.sin(th) * ds; pts.push([x, y]); }
  return pts;
}
function tube(g, pts, w0, w1, fill, edge, ew = 2.4, knuckles = 0) {
  // knuckles: the toe's pads bulge (that many bumps along it); both ends are rounded
  const W = (u) => (w0 + (w1 - w0) * u) * (1 + (knuckles ? 0.13 * Math.abs(Math.sin(Math.PI * knuckles * u)) - 0.06 : 0));
  const cap = (w, col) => { for (const [p, u] of [[pts[0], 0], [pts[pts.length - 1], 1]]) { g.fillStyle = col; g.beginPath(); g.arc(p[0], p[1], w(u) / 2, 0, 2 * Math.PI); g.fill(); } };
  if (edge != null) { taper(g, pts, (u) => W(u) + ew, gv(edge)); cap((u) => W(u) + ew, gv(edge)); }
  taper(g, pts, W, gv(fill)); cap(W, gv(fill));
}
function across(g, pts, u, w, v, lw = 1) {
  const n = pts.length - 1, i = Math.max(1, Math.min(n - 1, Math.round(u * n))), p = pts[i], a = pts[i - 1], b = pts[i + 1];
  let tx = b[0] - a[0], ty = b[1] - a[1]; const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
  g.strokeStyle = gv(v); g.lineWidth = lw; g.lineCap = "round";
  g.beginPath(); g.moveTo(p[0] - ty * w * 0.4, p[1] + tx * w * 0.4); g.lineTo(p[0] + ty * w * 0.4, p[1] - tx * w * 0.4); g.stroke();
}
// a dark claw hooking on from the toe's end, bending toward the key (hook: +1 clockwise, -1 counter-clockwise)
function claw(g, pts, len, hook, w) {
  const n = pts.length - 1, e = pts[n], q = pts[Math.max(0, n - 2)];
  let th = Math.atan2(e[1] - q[1], e[0] - q[0]); const c = [[e[0] - Math.cos(th) * 2, e[1] - Math.sin(th) * 2]]; let x = e[0], y = e[1];
  c.push([x, y]);
  for (let i = 1; i <= 5; i++) { th += hook * 0.24; x += Math.cos(th) * len / 5; y += Math.sin(th) * len / 5; c.push([x, y]); }
  taper(g, c, (u) => w * (1 - 0.9 * u), gv(18));
}
export function footRig(g, F) {
  const tw = F.tw || (F.toes ? 12 : 15), lw = F.lw || 15;
  const toe = (p, w0, clawLen, hook) => {
    tube(g, p, w0, w0 * 0.6, 247, 26, F.rim ?? (F.toes ? 4.5 : 2.2), 3);
    claw(g, p, clawLen, hook, w0 * 0.55 + 0.8);
  };
  const A = F.a;
  // the hook turns the claw down onto the key: for a toe pointing left that is counter-clockwise
  const hookOf = (p) => { const e = p[p.length - 1]; return e[0] < A[0] ? -1 : 1; };
  if (F.back) { const p = arcPts(A, F.back, -0.12 * hookOf([F.back]), 8); toe(p, tw * 0.85, 6, hookOf(p)); }
  if (F.h) {
    const p = [F.h, [(F.h[0] + A[0]) / 2, (F.h[1] + A[1]) / 2], A];
    tube(g, p, lw, lw * 0.8, 247, 26, F.rim ?? 4.5);
  }
  if (F.toes) {
    // outer toes first, the middle one last (on top)
    // the measured tips sit a toe-width apart; spread them a little so each fat toe reads on its own
    const mx = F.toes.reduce((a, t) => a + t[0], 0) / F.toes.length, my = F.toes.reduce((a, t) => a + t[1], 0) / F.toes.length, SP = F.fan || 1.35;
    const tips = F.toes.map(([x, y]) => [mx + (x - mx) * SP, my + (y - my) * SP]);
    const T = tips.map((t) => arcPts(A, t, 0.08 * hookOf([t])));
    const order = T.length === 3 ? [0, 2, 1] : T.map((_, i) => i);
    for (const i of order) toe(T[i], tw, 7, hookOf(T[i]));
  } else if (F.len) {
    // a clenched foot: the outer toe longest, the inner ones shorter and curled tighter (nested, touching)
    const L = F.len, K = 0.35 + 3.2 * (F.curl || 0), palm = F.palm || 1, sp = (F.spread ?? 36) * d2r, th = F.dir * d2r;
    for (const [a, k, kc] of [[th + palm * sp / 2, 1, 1], [th, 0.8, 1.12], [th - palm * sp / 2, 0.6, 1.25]]) {
      const p = curlPts(A, a, k * L, K * kc, palm);
      toe(p, tw * (0.75 + 0.25 * k), 7, palm);
    }
  }
  // the ankle knuckle
  g.fillStyle = gv(247); g.beginPath(); g.arc(A[0], A[1], tw * 0.62, 0, 2 * Math.PI); g.fill();
}
// A foot into a scratch canvas, optionally motion-blurred along blur [dx, dy] (the average of 9 shifted copies, summed
// as premultiplied colour: exact), softened, then drawn onto g (whose transform is taken as is).
let _fs = null, _fb = null;
export function footBox(F) {
  const pts = [F.a, ...(F.h ? [F.h] : []), ...(F.toes || []), ...(F.back ? [F.back] : [])];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const r = F.len ? F.len * 1.1 + 12 : 16, bx = F.blur ? Math.abs(F.blur[0]) / 2 + 4 : 0, by = F.blur ? Math.abs(F.blur[1]) / 2 + 4 : 0;
  return [x0 - r - bx, y0 - r - by, x1 + r + bx, y1 + r + by];
}
export function drawFoot(g, F, softHalf) {
  const b = footBox(F), X0 = Math.floor(b[0]), Y0 = Math.floor(b[1]), w = Math.ceil(b[2]) - X0, h = Math.ceil(b[3]) - Y0;
  if (!_fs || _fs.width < w || _fs.height < h) { _fs = cpuCanvas(Math.max(w, _fs ? _fs.width : 0), Math.max(h, _fs ? _fs.height : 0)); _fb = cpuCanvas(_fs.width, _fs.height); }
  const s = _fs.getContext("2d"); s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, _fs.width, _fs.height);
  s.translate(-X0, -Y0); footRig(s, F); s.setTransform(1, 0, 0, 1, 0, 0);
  let out = _fs;
  if (F.blur) {
    const bg = _fb.getContext("2d"), N = 9, [bx, by] = F.blur;
    bg.setTransform(1, 0, 0, 1, 0, 0); bg.globalCompositeOperation = "source-over"; bg.globalAlpha = 1; bg.clearRect(0, 0, _fb.width, _fb.height);
    bg.globalCompositeOperation = "lighter"; bg.globalAlpha = 1 / N;
    for (let i = 0; i < N; i++) { const u = i / (N - 1) - 0.5; bg.drawImage(_fs, u * bx, u * by); }
    bg.globalCompositeOperation = "source-over"; bg.globalAlpha = 1;
    out = _fb;
  }
  softHalf(out, 1, F.soft || (F.blur ? 4 : 1), [0, 0, w, h]);
  g.drawImage(out, 0, 0, w, h, X0, Y0, w, h);
}
// The rig's footprint grown by grow px, as an opaque shape (for cutting the traced marks under / round the foot).
export function footMask(g, F, grow = 5) {
  const A = F.a, st = (pts, w) => { g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.stroke(); };
  g.strokeStyle = "#000"; g.fillStyle = "#000";
  const tw = (F.tw || (F.toes ? 12 : 15)) + 2 * grow, lw = (F.lw || 15) + 2 * grow;
  const bl = F.blur ? F.blur : [0, 0];
  for (const u of F.blur ? [-0.5, -0.25, 0, 0.25, 0.5] : [0]) {
    g.save(); g.translate(u * bl[0], u * bl[1]);
    if (F.h) st([F.h, A], lw);
    if (F.toes) { const mx = F.toes.reduce((a, t) => a + t[0], 0) / F.toes.length, my = F.toes.reduce((a, t) => a + t[1], 0) / F.toes.length, SP = F.fan || 1.35; for (const [x, y] of F.toes) { const t = [mx + (x - mx) * SP, my + (y - my) * SP]; st(arcPts(A, t, 0.08 * (t[0] < A[0] ? -1 : 1)), tw); } }
    if (F.back) st([A, F.back], tw);
    if (F.len) { const L = F.len, K = 0.35 + 3.2 * (F.curl || 0), palm = F.palm || 1, sp = (F.spread ?? 36) * d2r, th = F.dir * d2r; for (const [a, k, kc] of [[th + palm * sp / 2, 1, 1], [th, 0.8, 1.12], [th - palm * sp / 2, 0.6, 1.25]]) st(curlPts(A, a, k * L + 6, K * kc, palm), tw); }
    g.beginPath(); g.arc(A[0], A[1], tw * 0.7, 0, 2 * Math.PI); g.fill();
    g.restore();
  }
}

// ---------------------------------------------------------------- procedural engraving of plate textures
// Re-engraves a region of a finished plate as parallel fine lines whose local mean is the plate's own (blurred) value:
// v = M * (1 + amp * (cbar - cov)), where cov is the lines' pixel coverage and cbar its mean, so the blurred value
// (measured and tone-corrected) stays and the texture becomes dense fine engraving. poly: region (frame px); dir: "v"
// (vertical lines, x pitch) or "h"; pitch, w0..w1 line width range, wob wobble amplitude, brk break rate, seed.
// slope: the lines' slope (d across / d along); protect [lo, hi]: the effect fades in over that range of the local
// mean (so dark parts such as knobs keep their drawing).
export function engraveRegion(canvas, poly, { dir = "v", pitch = 5.5, w0 = 1, w1 = 2.2, amp = 1.3, wob = 1.1, brk = 0.12, seed = 1, blur = 4, slope = 0, protect = null } = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const X0 = Math.max(0, Math.floor(x0) - 2), Y0 = Math.max(0, Math.floor(y0) - 2), W = Math.min(canvas.width, Math.ceil(x1) + 3) - X0, H = Math.min(canvas.height, Math.ceil(y1) + 3) - Y0;
  const m = cpuCanvas(W, H), mg = m.getContext("2d"); mg.translate(-X0, -Y0); mg.fillStyle = "#fff"; polyPath(mg, poly); mg.fill();
  const M = mg.getImageData(0, 0, W, H).data;
  const g = canvas.getContext("2d", { willReadFrequently: true }), id = g.getImageData(X0, Y0, W, H), d = id.data;
  // the local mean: a box blur (two passes) of the plate inside the region only
  const V = new Float32Array(W * H), A = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) { const a = M[4 * p + 3] / 255; V[p] = d[4 * p] * a; A[p] = a; }
  const box = (F, r) => { const T = new Float32Array(W * H);
    for (let j = 0; j < H; j++) { let s = 0; for (let i = -r; i <= r; i++) s += F[j * W + Math.min(W - 1, Math.max(0, i))]; for (let i = 0; i < W; i++) { T[j * W + i] = s; s += F[j * W + Math.min(W - 1, i + r + 1)] - F[j * W + Math.max(0, i - r)]; } }
    const U = new Float32Array(W * H);
    for (let i = 0; i < W; i++) { let s = 0; for (let j = -r; j <= r; j++) s += T[Math.min(H - 1, Math.max(0, j)) * W + i]; for (let j = 0; j < H; j++) { U[j * W + i] = s; s += T[Math.min(H - 1, j + r + 1) * W + i] - T[Math.max(0, j - r) * W + i]; } }
    return U; };
  let Vb = box(box(V, blur), blur), Ab = box(box(A, blur), blur);
  // line coverage
  const along = dir === "v" ? H : W, across = dir === "v" ? W : H, off = dir === "v" ? X0 : Y0, offA = dir === "v" ? Y0 : X0;
  const cov = new Float32Array(W * H);
  const k0 = slope ? Math.floor(Math.min(0, -slope * along) / pitch) - 1 : -1, nL = Math.ceil((across + Math.abs(slope) * along) / pitch) + 2;
  for (let k = k0; k < nL; k++) {
    const c0 = k * pitch + (hash(k, seed, 1) - 0.5) * pitch * 0.35;
    for (let t = 0; t < along; t++) {
      const T = t + offA;
      if (noise2((k + seed * 13) * 3.1, T / 22, seed + 5) > 1 - 2 * brk) continue;   // a break in this line
      const c = c0 + slope * t + wob * noise2(k * 1.7 + seed, T / 40, seed + 9), w = w0 + (w1 - w0) * (0.5 + 0.5 * noise2(k * 2.3, T / 30, seed + 17));
      const a = c - w / 2, b = c + w / 2;
      for (let q = Math.max(0, Math.floor(a)); q <= Math.min(across - 1, Math.floor(b)); q++) {
        const ov = Math.max(0, Math.min(b, q + 1) - Math.max(a, q));
        const p = dir === "v" ? t * W + q : q * W + t;
        cov[p] = Math.min(1, cov[p] + ov);
      }
    }
  }
  // the coverage's own local mean (same blur), so breaks and width changes do not shift the blurred value
  const Cb = box(box(cov, blur), blur), Nb = box(box(new Float32Array(W * H).fill(1), blur), blur);
  for (let p = 0; p < W * H; p++) {
    let a = M[4 * p + 3] / 255; if (a <= 0) continue;
    const mean = Ab[p] > 1e-3 ? Vb[p] / Ab[p] : d[4 * p], cl = Cb[p] / Nb[p];
    if (protect) { const u = Math.max(0, Math.min(1, (mean - protect[0]) / (protect[1] - protect[0]))); a *= u * u * (3 - 2 * u); if (a <= 0) continue; }
    const v = Math.max(0, Math.min(255, mean * (1 + amp * (cl - cov[p]))));
    for (let c = 0; c < 3; c++) d[4 * p + c] = Math.round(d[4 * p + c] * (1 - a) + v * a);
  }
  g.putImageData(id, X0, Y0);
}

