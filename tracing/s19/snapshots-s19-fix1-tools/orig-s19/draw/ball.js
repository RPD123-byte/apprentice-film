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
  const circle = (q) => q.arc(0, 0, R, 0, TAU);
  // the tail tuft (behind the ball) at +145°: four pointed feathers sticking out past the rim
  const ta = 145 * D;
  for (let k = 0; k < 5; k++) {
    const a = ta + (k - 2) * 0.14, L = 95 - Math.abs(k - 1.4) * 16;
    const dir = [Math.cos(a), Math.sin(a)], n = [-dir[1], dir[0]], root = [dir[0] * (R - 40), dir[1] * (R - 40)];
    const tip = V.add(root, V.add(V.mul(dir, L + 40), V.mul(n, 34)));
    const pts = [V.add(root, V.mul(n, -26)), V.add(V.mix(root, tip, 0.5), V.mul(n, -14)), tip, V.add(V.mix(root, tip, 0.55), V.mul(n, 18)), V.add(root, V.mul(n, 26))];
    const path = (q) => smoothPath(q, pts, true);
    plumage(g, path, { base: 0.93, shade: 0.74, depth: 10, blur: 5, light: [-0.4, -0.9] });
    ink(g, [pts[0], pts[1], pts[2]], 2.2, LINE, { end: 0.15 });
    ink(g, [pts[2], pts[3], pts[4]], 1.4, gv(0.25, 0.8), { end: 0.15 });
  }
  // the body sphere (tone is added frame-fixed by fixLayer; here only the rotating marks)
  g.fillStyle = gv(0.9); g.beginPath(); circle(g); g.fill();
  // feather strokes swirling round the ball (the source's scattered dashes)
  const r = rng(71);
  g.save(); g.beginPath(); circle(g); g.clip();
  for (let i = 0; i < 150; i++) {
    const rr = 30 + Math.sqrt(r()) * (R - 36), a = r() * TAU, p = [Math.cos(a) * rr, Math.sin(a) * rr];
    const d = [-Math.sin(a), Math.cos(a)];
    flick(g, p, V.rot(d, (r() - 0.5) * 0.5), 12 + r() * 18, 1.6 + r() * 1.0, gv(0.4, 0.35 + 0.35 * (rr / R)), 0.2);
  }
  g.restore();
  // the face at +x: two dizzy eyes side by side across the radius (a ring-and-dot eye and a curl), a small beak
  const eye1 = [80, 34], eye2 = [72, -36];
  g.lineCap = "round";
  g.fillStyle = gv(0.97); g.beginPath(); g.arc(eye1[0], eye1[1], 31, 0, TAU); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 4; g.beginPath(); g.arc(eye1[0], eye1[1], 27, 0, TAU); g.stroke();
  g.lineWidth = 2.6; g.beginPath(); g.arc(eye1[0], eye1[1], 14, 0, TAU); g.stroke();
  g.fillStyle = LINE; g.beginPath(); g.arc(eye1[0], eye1[1], 5.5, 0, TAU); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 4; g.beginPath();
  for (let k = 0; k <= 60; k++) { const a = -1.2 + k / 60 * Math.PI * 3.6, rr = 3 + k / 60 * 27; const x = eye2[0] + Math.cos(a) * rr, y = eye2[1] + Math.sin(a) * rr; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke();
  // soft rings of the facial disc round the eyes
  for (const [e, rr, a0, a1] of [[eye1, 42, -0.6, 2.4], [eye2, 42, -2.4, 0.6]]) { g.strokeStyle = gv(0.3, 0.75); g.lineWidth = 2.4; g.beginPath(); g.arc(e[0], e[1], rr, a0, a1); g.stroke(); }
  ink(g, [[30, -70], [18, 0], [34, 74]], 2.4, gv(0.3, 0.7), { end: 0.1 });
  // beak toward the rim between the eyes
  g.save(); g.translate(112, -2); g.rotate(Math.PI / 2 * -1);
  g.fillStyle = gv(0.86); g.beginPath(); g.moveTo(-10, 0); g.quadraticCurveTo(0, -4, 10, 0); g.quadraticCurveTo(4, 14, 0, 20); g.quadraticCurveTo(-4, 14, -10, 0); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 2; g.stroke(); g.restore();
  // the headphone band wrapped along the rim, centred at +80°, spanning ≈120°: a dark strap with pale edges
  const b0 = 18 * D, b1 = 142 * D, rin = R - 24, rout = R + 14;
  const band = (q) => { q.arc(0, 0, rout, b0, b1); q.arc(0, 0, rin, b1, b0, true); q.closePath(); };
  g.fillStyle = gv(0.26); g.beginPath(); band(g); g.fill();
  g.save(); g.beginPath(); band(g); g.clip();
  for (let k = 0; k <= 40; k++) { const a = b0 + (b1 - b0) * k / 40; g.strokeStyle = k % 2 ? gv(0.55, 0.7) : gv(0.12, 0.8); g.lineWidth = 2; g.beginPath(); g.moveTo(Math.cos(a) * rin, Math.sin(a) * rin); g.lineTo(Math.cos(a) * rout, Math.sin(a) * rout); g.stroke(); }
  g.fillStyle = gv(0.7, 0.9); g.beginPath(); g.arc(0, 0, rin + 6, b0, b1); g.arc(0, 0, rin + 2, b1, b0, true); g.closePath(); g.fill();
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = 3.2; g.beginPath(); band(g); g.stroke();
  // a cup at the band's lower end
  const ca = 132 * D, cr = R - 18;
  drawCup(g, { x: Math.cos(ca) * cr, y: Math.sin(ca) * cr, r: 34, rot: ca + Math.PI / 2, open: 0.5, side: 1 });
  // feet at −110°: two small three-toed feet sticking out past the rim
  for (const [da, sz, sd] of [[-122, 30, 3], [-96, 27, 7]]) {
    const a = da * D;
    drawFoot(g, { x: Math.cos(a) * (R - 6), y: Math.sin(a) * (R - 6), rot: a - Math.PI / 2, size: sz, mode: "dangle", toes: 3, spread: 0.9, seed: sd });
  }
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
  softShade(g, circle, (q) => q.ellipse(40, 80, R * 1.05, R * 0.8, -0.4, 0, TAU), 0.5, 0.4, 40);
  softShade(g, circle, (q) => { q.arc(0, 0, R + 30, 0, TAU); q.arc(-8, -10, R - 18, 0, TAU, true); }, 0.4, 0.5, 10);
  FIX = c;
  return FIX;
}
export function releaseBall() { ROT = null; FIX = null; BUF = null; }

// ---------------------------------------------------------------- draw at time t
let BUF = null;
export function drawBall(ctx, t) {
  const [cx, cy, fa, sx, sy] = ballState(t);
  const rl = rotLayer(), fx = fixLayer();
  if (!BUF) { BUF = document.createElement("canvas"); BUF.width = S; BUF.height = S; }
  const g = BUF.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.clearRect(0, 0, S, S);
  // rotational motion blur: the spin over a third of a frame (≈10°), averaged
  const N = 6, spin = 29 * D / 6, slide = 14;
  g.globalCompositeOperation = "lighter";
  for (let k = 0; k < N; k++) {
    g.globalAlpha = 1 / N;
    const f = k / (N - 1) - 0.5; g.setTransform(1, 0, 0, 1, S / 2 - slide * f, S / 2); g.rotate(fa * D + spin * f); g.drawImage(rl, -S / 2, -S / 2);
  }
  g.globalCompositeOperation = "source-atop"; g.globalAlpha = 1; g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(fx, 0, 0);
  // ink outline round the whole silhouette
  g.globalCompositeOperation = "destination-over";
  g.filter = "blur(1.5px)"; g.fillStyle = "#0e0d0c"; g.beginPath(); g.ellipse(S / 2, S / 2, R + 4 + slide / 2, R + 4, 0, 0, TAU); g.fill(); g.filter = "none";
  g.globalCompositeOperation = "source-over";
  ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, sy); ctx.drawImage(BUF, -S / 2, -S / 2); ctx.restore();
}
export function ballShadow(t) { const [cx, cy] = ballState(t); return { x: cx, y: Math.min(868, cy + BALL_R * 0.9), w: BALL_R * 0.55, a: 0.9 }; }
