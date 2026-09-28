// The pencil in his teeth, drawn per frame from hand-measured key positions (the LK tracks slide along it).
// M = where it passes the lips, T = sharpened end, E = eraser end; `vis` = which ends stick out.
// The look is s02's pencil (src/shots/s02/designer.js paintPencil: pale wood with facet lines and grain, a lighter
// cone with a dark lead, a scalloped paint edge, a ringed ferrule and a rounded eraser), generalised to any angle so
// the pencil continues unchanged across the 19.12 join and then turns with his head.
import { taper } from "../../lib/ink.js";
import { sampleCurve } from "../../lib/paths.js";
import { rng, clamp } from "../../lib/rng.js";

const PI = Math.PI;
const INKC = "#0b0b0b";
const gv = (v, a = 1) => { const c = Math.round(clamp(v) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };
function line(g, pts, w, color, { per = 6, end = 0.25, pow = 0.6 } = {}) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(g, q, (u) => w * (end + (1 - end) * Math.pow(Math.sin(PI * u), pow)), color);
}

// [t, Mx, My, Tx, Ty, Ex, Ey, showT, showE] (21.96–22.84 re-measured on gridded crops, snapshots/s04-fix1-study/pencil.jpg)
const K = [
  [20.84, 1052, 728, 707, 730, 1392, 727, 1, 1],
  [21.20, 1080, 723, 760, 716, 1400, 730, 1, 1],
  [21.44, 1110, 705, 810, 690, 1410, 720, 1, 1],
  [21.64, 1160, 684, 910, 652, 1412, 712, 1, 1],
  [21.80, 1180, 664, 980, 620, 1392, 700, 1, 1],
  [21.96, 1215, 632, 1060, 590, 1345, 695, 1, 1],
  [22.04, 1220, 630, 1105, 578, 1328, 683, 1, 1],
  [22.12, 1210, 610, 1128, 572, 1317, 667, 1, 1],
  [22.16, 1226, 600, 1180, 581, 1290, 675, 0, 1],
  [22.20, 1240, 590, 1240, 590, 1267, 683, 0, 1],
  [22.28, 1239, 589, 1239, 589, 1239, 667, 0, 1],
  [22.36, 1272, 589, 1200, 656, 1272, 589, 1, 0],
  [22.44, 1267, 567, 1172, 650, 1267, 567, 1, 0],
  [22.52, 1267, 533, 1156, 639, 1267, 533, 1, 0],
  [22.60, 1294, 505, 1139, 617, 1294, 505, 1, 0],
  [22.68, 1311, 489, 1139, 600, 1311, 489, 1, 0],
  [22.76, 1322, 472, 1128, 578, 1322, 472, 1, 0],
  [22.84, 1322, 461, 1128, 561, 1322, 461, 1, 0],
  [23.12, 1352, 438, 1165, 506, 1352, 438, 1, 0],
];
// its width across the lips (the source pencil narrows as the head turns away: 35 px at 20.4, ~26 at 21.64)
const WID = [[20.84, 35], [21.3, 32], [21.64, 27], [22.1, 25], [22.5, 22], [22.84, 20], [23.12, 20]];
export function pencilAt(t) {
  let i = 1; while (i < K.length - 1 && K[i][0] < t) i++;
  const a = K[i - 1], b = K[i];
  const f = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
  const v = (k) => a[k] + (b[k] - a[k]) * f;
  // an end only shows if it shows at both keys (it pops at the key where it appears)
  const pick = f < 0.5 ? a : b;
  let j = 1; while (j < WID.length - 1 && WID[j][0] < t) j++;
  const wa = WID[j - 1], wb = WID[j], wf = Math.max(0, Math.min(1, (t - wa[0]) / (wb[0] - wa[0])));
  return { M: [v(1), v(2)], T: [v(3), v(4)], E: [v(5), v(6)], showT: a[7] && b[7] ? 1 : pick[7], showE: a[8] && b[8] ? 1 : pick[8], width: wa[1] + (wb[1] - wa[1]) * wf };
}

// Draw the pencil in a local frame: x from `u0` to `u1` along the pencil (0 = the sharpened tip), y across (-w/2 ..
// w/2, -y is the lit top). Parts (s02 proportions at w = 35): cone 88, lead 28, ferrule 48, eraser 32 px.
function paintLocal(g, w, L, u0, u1, seed) {
  const k = w / 35, y0 = -w / 2, y1 = w / 2;
  const cone = 88 * k, lead = 28 * k, ferr = 48 * k, eras = 32 * k;
  const bodyA = cone, bodyB = L - ferr - eras;
  g.save();
  g.beginPath(); g.rect(u0, -w, u1 - u0, 2 * w); g.clip();
  // body: pale wood, faint grain, two facet lines
  const bA = Math.max(bodyA, u0), bB = Math.min(bodyB, u1);
  if (bB > bA) {
    g.beginPath(); g.rect(bA, y0, bB - bA, w);
    const bg = g.createLinearGradient(0, y0, 0, y1); bg.addColorStop(0, gv(0.93)); bg.addColorStop(0.35, gv(0.85)); bg.addColorStop(0.7, gv(0.7)); bg.addColorStop(1, gv(0.55));
    g.fillStyle = bg; g.fill();
    line(g, [[bA + 5, y0 + w * 0.31], [bB - 5, y0 + w * 0.29]], 1.2, gv(0.3, 0.6));
    line(g, [[bA + 5, y0 + w * 0.71], [bB - 5, y0 + w * 0.69]], 1.2, gv(0.25, 0.6));
    const r = rng(seed);
    for (let i = 0; i < 40; i++) { const x = bodyA + 25 * k + r() * (bodyB - bodyA - 50 * k), y = y0 + 4 * k + r() * (w - 8 * k); if (x > bA && x < bB) line(g, [[x, y], [x + (20 + r() * 40) * k, y + (r() - 0.5)]], 1, gv(0.3, 0.4)); }
    g.strokeStyle = INKC; g.lineWidth = 2.2; g.lineJoin = "round";
    g.beginPath(); g.moveTo(bA, y0); g.lineTo(bB, y0); g.moveTo(bA, y1); g.lineTo(bB, y1); g.stroke();
  }
  // the sharpened cone and the lead
  if (u0 < bodyA) {
    g.beginPath(); g.moveTo(cone, y0); g.lineTo(0, 0); g.lineTo(cone, y1); g.closePath();
    const cg = g.createLinearGradient(0, y0, 0, y1); cg.addColorStop(0, gv(0.92)); cg.addColorStop(1, gv(0.72));
    g.fillStyle = cg; g.fill();
    g.beginPath(); g.moveTo(lead, -6 * k); g.lineTo(0, 0); g.lineTo(lead, 7 * k); g.closePath(); g.fillStyle = gv(0.15); g.fill();
    g.strokeStyle = INKC; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cone, y0); for (let q = 0; q <= 4; q++) g.lineTo(q % 2 ? cone - 7 * k : cone + 1 * k, y0 + q * w / 4); g.stroke();
    g.lineWidth = 2.2; g.beginPath(); g.moveTo(cone, y0); g.lineTo(0, 0); g.lineTo(cone, y1); g.stroke();
  }
  // ferrule (ringed metal band) and the eraser
  if (u1 > bodyB) {
    g.beginPath(); g.rect(bodyB, y0 - 2 * k, ferr, w + 4 * k);
    const fg = g.createLinearGradient(0, y0 - 2, 0, y1 + 2); fg.addColorStop(0, gv(0.95)); fg.addColorStop(0.4, gv(0.75)); fg.addColorStop(0.8, gv(0.45)); fg.addColorStop(1, gv(0.6));
    g.fillStyle = fg; g.fill();
    for (const x of [6, 14, 32, 40]) line(g, [[bodyB + x * k, y0 - 1], [bodyB + x * k, y1 + 1]], 1.4, gv(0.15, 0.8));
    g.beginPath(); g.roundRect(bodyB + ferr, y0, eras, w, [0, 6 * k, 6 * k, 0]);
    const eg = g.createLinearGradient(0, y0, 0, y1); eg.addColorStop(0, gv(0.9)); eg.addColorStop(1, gv(0.62));
    g.fillStyle = eg; g.fill();
    g.strokeStyle = INKC; g.lineWidth = 2.2; g.lineJoin = "round";
    g.strokeRect(bodyB, y0 - 2 * k, ferr, w + 4 * k);
    g.beginPath(); g.roundRect(bodyB + ferr, y0, eras, w, [0, 6 * k, 6 * k, 0]); g.stroke();
  }
  g.restore();
}
// a local frame from the tip p0 toward the eraser end p1, the lit (-y) side kept toward screen-up
function frame(g, p0, p1) {
  const a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
  g.translate(p0[0], p0[1]); g.rotate(a);
  if (Math.cos(a) < 0) g.scale(1, -1);
}
export function drawPencil(g, P) {
  const w = P.width, full = 685 * w / 35;
  const d = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  if (P.showT && P.showE) {
    // the whole pencil from tip to eraser (its length follows the measured ends)
    g.save(); frame(g, P.T, P.E); paintLocal(g, w, d(P.T, P.E), 0, d(P.T, P.E), 401); g.restore();
  } else if (P.showT) {
    // only the sharpened half sticks out of the mouth (the rest points into the head)
    const L = d(P.T, P.M);
    if (L > 4) { g.save(); frame(g, P.T, P.M); paintLocal(g, w, full, 0, L, 401); g.restore(); }
  } else if (P.showE) {
    const L = d(P.M, P.E);
    if (L > 4) {
      // the eraser half: local frame from a virtual tip `full` px back along the pencil
      const ux = (P.E[0] - P.M[0]) / L, uy = (P.E[1] - P.M[1]) / L, T0 = [P.E[0] - ux * full, P.E[1] - uy * full];
      g.save(); frame(g, T0, P.E); paintLocal(g, w, full, full - L, full, 401); g.restore();
    }
  }
  g.restore();
}
