// s19 owl, phase 1 (57.40–57.96): the owl tumbles in from the right edge rolled up into a ball and rolls left.
// Measured on the source frame by frame (snapshots/s19b-study/ballang.jpg, RANSAC circle fits to the owl's
// background-difference silhouette, corrected on 2x grids at 57.64 and 57.84): a ball of radius ≈154 px whose
// bottom rides the floor at y ≈ 855 (one squash on the bounce at 57.56), rolling counter-clockwise ≈ 29° a frame.
// The ball is rigid: its face (two dizzy spiral eyes) at angle φ, the headphone band centred ≈80° clockwise of
// the face along the rim, the tail tuft ≈145° round, the feet ≈110° the other way (read on every frame).
import { plumage, softShade, flick, ink, drawFoot, drawCup, screentone, setPPU, gv, LINE, V } from "../../../lib/owlInk.js";
import { taper } from "../../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { rng, clamp } from "../../../lib/rng.js";

const TAU = Math.PI * 2, D = Math.PI / 180;
export const BALL_R = 151;
// [t, cx, cy, face angle (deg, clockwise from +x, y down), sx, sy]  (frame px)
const TRACK = [
  [57.36, 2380, 700, 300, 1, 1],
  [57.40, 2330, 700, 280, 1, 1],
  [57.44, 2288, 700, 268, 1, 1],
  [57.48, 2213, 696, 258, 1, 1],
  [57.52, 2135, 695, 246, 1, 1],
  [57.56, 2062, 722, 213, 1.1, 0.9],
  [57.60, 1990, 705, 185, 1.02, 0.98],
  [57.64, 1918, 690, 158, 1, 1],
  [57.68, 1845, 688, 132, 1, 1],
  [57.72, 1780, 686, 98, 1, 1],
  [57.76, 1717, 690, 76, 1, 1],
  [57.80, 1676, 698, 56, 1, 1],
  [57.84, 1634, 696, 32, 1, 1],
  [57.88, 1565, 690, 6, 1, 1],
  [57.92, 1495, 704, -14, 1, 1],
  [57.96, 1450, 704, -30, 1, 1],
];
export function ballState(t) {
  const T = TRACK;
  if (t <= T[0][0]) return T[0].slice(1);
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) { const a = T[i - 1], b = T[i], u = (t - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u); }
  return T[T.length - 1].slice(1);
}

// ---------------------------------------------------------------- the rotating part (local: face toward +x)
let ROT = null, FIX = null;
const R = BALL_R, PAD = 90, S = 2 * (R + PAD);
function rotLayer() {
  if (ROT) return ROT;
  const c = document.createElement("canvas"); c.width = S; c.height = S;
  const g = c.getContext("2d");
  g.translate(S / 2, S / 2); setPPU(1);
  // (fix pass 4) a furry rim: the radius displaced ±4–6 px by a few harmonics and short tufts, not a hard disc
  const fur = (a) => R + 2.4 * Math.sin(a * 23 + 0.7) + 1.8 * Math.sin(a * 37 + 2.1) + 1.2 * Math.sin(a * 61 + 4.0);
  const circle = (q) => { for (let i = 0; i <= 180; i++) { const a = (i / 180) * TAU, rr = fur(a); if (i) q.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else q.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } q.closePath(); };
  // the body sphere (tone is added frame-fixed by fixLayer; here only the rotating marks)
  g.fillStyle = gv(0.9); g.beginPath(); circle(g); g.fill();
  { const rf = rng(73); for (let i = 0; i < 60; i++) { const a = rf() * TAU, rr = fur(a) - 2, d = [Math.cos(a), Math.sin(a)], tn = [-d[1], d[0]]; const p = V.mul(d, rr), tip = V.add(V.add(p, V.mul(d, 3 + 3 * rf())), V.mul(tn, (rf() - 0.5) * 6)); taper(g, [V.add(p, V.mul(d, -4)), tip], (u) => 5 * (1 - u), gv(0.9)); } }
  // feather strokes swirling round the ball (the source's scattered dashes)
  const r = rng(71);
  g.save(); g.beginPath(); circle(g); g.clip();
  for (let i = 0; i < 150; i++) {
    const rr = 30 + Math.sqrt(r()) * (R - 36), a = r() * TAU, p = [Math.cos(a) * rr, Math.sin(a) * rr];
    const d = [-Math.sin(a), Math.cos(a)];
    flick(g, p, V.rot(d, (r() - 0.5) * 0.5), 12 + r() * 18, 1.6 + r() * 1.0, gv(0.4, 0.35 + 0.35 * (rr / R)), 0.2);
  }
  g.restore();
  // the face at +x: two dizzy spiral eyes side by side (≈ 25 px), a pale disc round each
  g.lineCap = "round";
  // (fix pass 4: small, ≈ 20 px across, lower contrast; the source's eyes are small in the blurred ball)
  for (const [ex, ey, sd] of [[86, 28, 1], [80, -30, -1]]) {
    g.fillStyle = gv(0.95); g.beginPath(); g.arc(ex, ey, 15, 0, TAU); g.fill();
    g.strokeStyle = gv(0.3, 0.85); g.lineWidth = 2.2; g.beginPath();
    for (let k = 0; k <= 60; k++) { const a = sd * (-1.2 + k / 60 * Math.PI * 3.6), rr = 1.5 + k / 60 * 10.5; const x = ex + Math.cos(a) * rr, y = ey + Math.sin(a) * rr; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  ink(g, [[30, -70], [18, 0], [34, 74]], 2.0, gv(0.35, 0.6), { end: 0.1 });
  // beak toward the rim between the eyes
  g.save(); g.translate(112, -2); g.rotate(Math.PI / 2 * -1);
  g.fillStyle = gv(0.86); g.beginPath(); g.moveTo(-10, 0); g.quadraticCurveTo(0, -4, 10, 0); g.quadraticCurveTo(4, 14, 0, 20); g.quadraticCurveTo(-4, 14, -10, 0); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 2; g.stroke(); g.restore();
  // the headphone band wrapped along the rim, centred at +80°, spanning ≈120°: a dark padded strap ≈ 32 px wide with a
  // paler worn stripe and a bright edge (no comb ticks)
  const b0 = 18 * D, b1 = 142 * D, rin = R - 26, rout = R + 8;
  const band = (q) => { q.arc(0, 0, rout, b0, b1); q.arc(0, 0, rin, b1, b0, true); q.closePath(); };
  g.fillStyle = gv(0.14); g.beginPath(); band(g); g.fill();
  g.strokeStyle = gv(0.42, 0.9); g.lineWidth = 9; g.beginPath(); g.arc(0, 0, (rin + rout) / 2 - 2, b0 + 0.05, b1 - 0.05); g.stroke();
  g.strokeStyle = gv(0.6, 0.8); g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, (rin + rout) / 2 - 2, b0 + 0.05, b1 - 0.05); g.stroke();
  g.strokeStyle = gv(0.85, 0.85); g.lineWidth = 1.8; g.beginPath(); g.arc(0, 0, rout - 3, b0 + 0.04, b1 - 0.04); g.stroke();
  g.strokeStyle = LINE; g.lineWidth = 2.6; g.beginPath(); band(g); g.stroke();
  // a cup at the band's lower end
  const ca = 132 * D, cr = R - 18;
  drawCup(g, { x: Math.cos(ca) * cr, y: Math.sin(ca) * cr, r: 34, rot: ca + Math.PI / 2, open: 0.5, side: 1 });
  ROT = c;
  return ROT;
}
// frame-fixed tone over the ball: lit from the upper left, greyer low and to the right; the ink outline
function fixLayer() {
  if (FIX) return FIX;
  const c = document.createElement("canvas"); c.width = S; c.height = S;
  const g = c.getContext("2d");
  g.translate(S / 2, S / 2); setPPU(1);
  const circle = (q) => q.arc(0, 0, R, 0, TAU);
  // (fix pass 4: the shade side is hatched, curved strokes following the sphere, over a lighter soft grey; not a CG
  // radial gradient)
  softShade(g, circle, (q) => q.ellipse(40, 80, R * 1.05, R * 0.8, -0.4, 0, TAU), 0.62, 0.25, 40);
  softShade(g, circle, (q) => { q.arc(0, 0, R + 30, 0, TAU); q.arc(-8, -10, R - 18, 0, TAU, true); }, 0.55, 0.3, 10);
  { const rh = rng(79); g.save(); g.beginPath(); circle(g); g.clip();
    for (let i = 0; i < 70; i++) { const a = (-0.3 + 2.2 * rh()), rr = R * (0.55 + 0.45 * Math.sqrt(rh())), c0 = a - 0.18 - 0.1 * rh(), c1 = a + 0.18 + 0.1 * rh(); const pts = []; for (let k = 0; k <= 8; k++) { const q = c0 + (c1 - c0) * k / 8; pts.push([Math.cos(q) * rr, Math.sin(q) * rr]); } const dark = Math.max(0, Math.cos(a - 1.0)) * (rr / R); taper(g, pts, (u) => (0.8 + 1.0 * dark) * Math.sin(Math.PI * u), gv(0.35, 0.25 + 0.4 * dark)); }
    g.restore(); }
  FIX = c;
  return FIX;
}
// the tail tuft and the feet are drawn on their own layers (fix pass 3): the source does not keep them rigid with the
// face through the last frames of the roll, so each gets its own measured angle per frame (TUFT_A, FEET_DA)
let TUF = null, FT = null;
function tuftLayer() {
  if (TUF) return TUF;
  const c = document.createElement("canvas"); c.width = S; c.height = S;
  const g = c.getContext("2d");
  g.translate(S / 2, S / 2); setPPU(1);
  // the tail tuft (behind the ball) at +145°: one swept tuft of 4 soft tapered strands curling one way (fix pass 3:
  // the source shows a single feathery tuft, not a crown of spikes)
  const ta = 145 * D;
  for (let k = 3; k >= 0; k--) {
    const a = ta + (k - 1.5) * 0.085, L = 58 - Math.abs(k - 1) * 8;      // (fix pass 4: shorter: the silhouette top stays at y ≈ 495–520)
    const dir = [Math.cos(a), Math.sin(a)], n = [-dir[1], dir[0]], root = [dir[0] * (R - 30), dir[1] * (R - 30)];
    const P = (u) => V.add(V.add(root, V.mul(dir, (L + 30) * u)), V.mul(n, 30 * u * u));
    const Lp = [], Rp = [];
    for (let j = 0; j <= 12; j++) { const u = j / 12, p = P(u), q = P(Math.min(1, u + 0.04)), d = V.nrm(V.sub(q, p)), m = [-d[1], d[0]], hw = 22 * Math.pow(1 - u, 0.9) + 1; Lp.push(V.add(p, V.mul(m, hw))); Rp.push(V.sub(p, V.mul(m, hw))); }
    const pts = [...Lp, ...Rp.reverse()];
    const path = (q) => { q.moveTo(pts[0][0], pts[0][1]); for (const p of pts) q.lineTo(p[0], p[1]); q.closePath(); };
    plumage(g, path, { base: 0.93, shade: 0.74, depth: 8, blur: 5, light: [-0.4, -0.9] });
    ink(g, Lp.slice(2), 2.0, gv(0.16), { end: 0.1 });
    ink(g, [P(0.2), P(0.55), P(0.85)], 0.9, gv(0.45, 0.6), { end: 0.1 });
  }
  TUF = c;
  return TUF;
}
function feetLayer() {
  if (FT) return FT;
  const c = document.createElement("canvas"); c.width = S; c.height = S;
  const g = c.getContext("2d");
  g.translate(S / 2, S / 2); setPPU(1);
  // feet at −110°: two small three-toed feet on short legs sticking out past the rim (the source's feet poke out of
  // the tumbling ball)
  for (const [da, sd] of [[-124, 3], [-98, 7]]) {
    const a = da * D, out = [Math.cos(a), Math.sin(a)], tn = [-out[1], out[0]];
    const hip = V.mul(out, R - 14), ank = V.mul(out, R + 10);        // (fix pass 4: legs shorter, the feet hug the ball)
    taper(g, [hip, V.mix(hip, ank, 0.5), ank], () => 14, gv(0.1)); taper(g, [hip, V.mix(hip, ank, 0.5), ank], () => 9.5, gv(0.88));
    for (const [f, sp] of [[-1, 0.7], [0, 0], [1, 0.7]]) {
      const tip = V.add(V.add(ank, V.mul(out, 13 - 4 * Math.abs(f))), V.mul(tn, f * 13 * sp + f * 3));
      taper(g, [ank, V.mix(ank, tip, 0.5), tip], (u) => 11 - 4 * u, gv(0.1)); taper(g, [ank, V.mix(ank, tip, 0.5), tip], (u) => 7 - 3 * u, gv(0.9));
      const d = V.nrm(V.sub(tip, ank)); ink(g, [tip, V.add(tip, V.add(V.mul(d, 6), V.mul(tn, 3)))], 3.4, "#0b0a0a", { end: 0.1 });
    }
    void sd;
  }
  FT = c;
  return FT;
}
// the tuft's absolute angle (deg) where the source differs from face + 145° (read on the 57.52–57.92 crops,
// snapshots/s19-fix1-src/ball.jpg), and the feet's offset from their rigid angle
const TUFT_A = { "57.52": 250, "57.84": 334, "57.88": 302, "57.92": 268 };
const FEET_DA = { "57.84": -55, "57.88": -50, "57.92": -40 };
const keyAt = (tbl, t, dflt) => {
  const T = TRACK.map((r) => r[0]);
  const val = (i) => { const k = T[i].toFixed(2); return k in tbl ? tbl[k] : dflt(i); };
  if (t <= T[0]) return val(0);
  for (let i = 1; i < T.length; i++) if (t <= T[i] + 1e-6) {
    const a = val(i - 1); let b = val(i); while (b - a > 180) b -= 360; while (a - b > 180) b += 360;
    return a + (b - a) * (t - T[i - 1]) / (T[i] - T[i - 1]);
  }
  return val(T.length - 1);
};
export function releaseBall() { ROT = null; FIX = null; BUF = null; OB = null; TUF = null; FT = null; TB = null; }

// ---------------------------------------------------------------- draw at time t
let BUF = null, OB = null, TB = null;
export function drawBall(ctx, t) {
  const [cx, cy, fa, sx, sy] = ballState(t);
  const rl = rotLayer(), fx = fixLayer();
  if (!BUF) { BUF = document.createElement("canvas"); BUF.width = S; BUF.height = S; }
  const g = BUF.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.clearRect(0, 0, S, S);
  // rotational motion blur: the spin over a fifth of a frame (≈6°) and a 14 px slide, 16 samples averaged (a
  // continuous smear, no stroboscopic copies)
  const N = 16, spin = 29 * D / 5, slide = 14;
  const ta = keyAt(TUFT_A, t, (i) => TRACK[i][3] + 145), fd = keyAt(FEET_DA, t, () => 0);
  if (!TB) { TB = document.createElement("canvas"); TB.width = S; TB.height = S; }
  const tb = TB.getContext("2d"), tl = tuftLayer(), fl = feetLayer();
  tb.setTransform(1, 0, 0, 1, 0, 0); tb.globalAlpha = 1; tb.clearRect(0, 0, S, S);
  for (let k = 0; k < N; k++) {
    g.globalAlpha = 1 / (k + 1); tb.globalAlpha = 1 / (k + 1);
    const f = k / (N - 1) - 0.5; g.setTransform(1, 0, 0, 1, S / 2 - slide * f, S / 2); g.rotate(fa * D + spin * f); g.drawImage(rl, -S / 2, -S / 2);
    // tuft and feet in one composite per sample (drawn to a scratch, then averaged into TB)
    tb.setTransform(1, 0, 0, 1, S / 2 - slide * f, S / 2); tb.rotate((ta - 145) * D + spin * f); tb.drawImage(tl, -S / 2, -S / 2);
    tb.setTransform(1, 0, 0, 1, S / 2 - slide * f, S / 2); tb.rotate((fa + fd) * D + spin * f); tb.drawImage(fl, -S / 2, -S / 2);
  }
  g.globalCompositeOperation = "source-atop"; g.globalAlpha = 1; g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(fx, 0, 0);
  g.globalCompositeOperation = "destination-over"; g.drawImage(TB, 0, 0);
  // a thin ink outline round the whole silhouette (the alpha dilated 2 px, drawn behind; it never reaches past the
  // drawing's own edge by more than that)
  if (!OB) { OB = document.createElement("canvas"); OB.width = S; OB.height = S; }
  const o = OB.getContext("2d");
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = "source-over"; o.globalAlpha = 1; o.clearRect(0, 0, S, S);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; o.drawImage(BUF, Math.cos(a) * 1.6, Math.sin(a) * 1.6); }
  o.globalCompositeOperation = "source-in"; o.fillStyle = "#3a3936"; o.fillRect(0, 0, S, S);
  g.globalCompositeOperation = "destination-over"; g.drawImage(OB, 0, 0);
  g.globalCompositeOperation = "source-over";
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, sy); ctx.drawImage(BUF, -S / 2, -S / 2); ctx.restore();
}
export function ballShadow(t) { const [cx, cy] = ballState(t); return { x: cx, y: Math.min(868, cy + BALL_R * 0.9), w: BALL_R * 0.55, a: 0.9 }; }
