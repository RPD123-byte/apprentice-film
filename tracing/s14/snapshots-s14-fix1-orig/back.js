// s14 owl seen from behind: flying at the gap (38.52–39.96) and hopping down the corridor (40.00–40.68).
// Rebuilt from per-frame measurements of the source (thresholded owl blob; scratch tool owlpose2.py):
//   units: 1 unit = 1 frame px at the size of the 38.60 source frame (blob area 40486 px at luma > 150);
//   origin: x = the head's centre (median centre of the head's pixel runs 20–70 units below the top), y = the
//   blob's top. Each source frame gives the scale, that origin, both wing tips (the blob's extreme left/right
//   points), the lowest point (a foot) and the lower body's centre (-> the roll).
// Geometry (head, cups, band, body, tail, legs, the wing's feather fan) was traced from unit-grid resamplings of
// 38.68, 38.72, 38.76, 38.80, 39.24, 39.52, 39.72, 39.96, 40.04–40.52.
import { ink, gv, setPPU, softShade, plumageStrokes, contourStrokes } from "../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

const TAU = Math.PI * 2;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]), nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const rotAbout = (p, c, a) => { const s = Math.sin(a), k = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * k - y * s, c[1] + x * s + y * k]; };
const blob = (pts) => (c) => smoothPath(c, pts, true);

// per source frame: [t, headX, top, s, Lx, Ly, Rx, Ry, Bx, By, lowX, roll]  (tips/bottom in units from (headX, top));
// roll (rad, + clockwise) = in flight the mean of the cups' tilt and the lower body's offset, in the run mostly the latter
// run rows were measured at luma > 215 (the floor is lit); the lit owl passes that threshold almost whole, so their
// scale comes from the head's width (120 units, as in flight: 104 px at 40.00 against 105-107 px at 39.92-39.96)
export const BK = [
  [38.52, 751.0, 517, 1.045, -186, 61, 181, 119, 17, 279, -17, 0.138], [38.56, 775.0, 527, 1.022, -182, 55, 179, 105, -5, 294, -20, 0.141],
  [38.60, 805.0, 535, 1.000, -182, 57, 181, 115, -52, 267, -16, 0.134], [38.64, 831.0, 546, 0.984, -190, 71, 183, 131, -74, 283, -24, 0.161],
  [38.68, 852.0, 534, 0.981, -184, 63, 179, 118, 22, 273, -17, 0.134], [38.72, 870.0, 538, 0.979, -181, 56, 178, 107, -1, 297, -13, 0.124],
  [38.76, 902.5, 550, 0.953, -183, 62, 177, 108, -61, 279, -15, 0.131], [38.80, 921.0, 563, 0.942, -193, 78, 183, 125, -74, 282, -23, 0.154],
  [38.84, 938.5, 552, 0.944, -187, 62, 179, 115, 23, 271, -23, 0.157], [38.88, 954.0, 557, 0.944, -179, 56, 178, 99, 2, 296, -15, 0.120],
  [38.92, 970.5, 569, 0.927, -181, 61, 182, 97, -44, 272, -12, 0.100], [38.96, 988.8, 567, 0.928, -187, 84, 181, 119, -68, 288, -20, 0.134],
  [39.00, 988.8, 567, 0.928, -187, 84, 181, 119, -68, 288, -20, 0.134], [39.04, 1017.5, 573, 0.915, -180, 70, 180, 83, 15, 295, -5, 0.060],
  [39.08, 1017.5, 573, 0.915, -180, 70, 180, 83, 15, 295, -5, 0.063], [39.12, 1035.0, 582, 0.905, -177, 75, 183, 90, -31, 275, -5, 0.056],
  [39.16, 1049.0, 591, 0.894, -185, 97, 189, 104, -47, 285, -2, 0.036], [39.20, 1062.5, 579, 0.900, -181, 89, 187, 91, 51, 270, 0, 0.020],
  [39.24, 1076.0, 584, 0.897, -177, 77, 184, 70, 30, 292, 3, 0.003], [39.28, 1093.0, 590, 0.876, -175, 82, 186, 76, -13, 272, 5, -0.007],
  [39.32, 1110.5, 602, 0.872, -181, 110, 193, 93, -32, 288, -5, 0.014], [39.36, 1123.0, 587, 0.879, -177, 102, 189, 81, -27, 270, 1, -0.013],
  [39.40, 1132.5, 592, 0.872, -173, 89, 189, 60, 45, 295, 13, -0.056], [39.44, 1148.5, 595, 0.863, -167, 108, 191, 71, -5, 278, 16, -0.098],
  [39.48, 1156.0, 605, 0.861, -173, 123, 198, 81, -10, 290, 11, -0.098], [39.52, 1165.2, 594, 0.854, -171, 114, 192, 55, 47, 262, 15, -0.131],
  [39.56, 1168.0, 597, 0.857, -169, 110, 190, 51, 65, 288, 18, -0.137], [39.60, 1175.5, 605, 0.852, -166, 122, 193, 55, 17, 275, 25, -0.191],
  [39.64, 1173.5, 609, 0.848, -165, 131, 193, 51, 8, 288, 34, -0.234], [39.68, 1169.0, 608, 0.848, -163, 125, 189, 39, 74, 264, 34, -0.227],
  [39.72, 1155.5, 613, 0.846, -162, 130, 190, 41, 22, 260, 38, -0.253], [39.76, 1138.5, 614, 0.851, -162, 133, 190, 49, 15, 287, 36, -0.236],
  [39.80, 1119.0, 613, 0.854, -164, 124, 187, 40, 8, 261, 36, -0.205], [39.84, 1102.0, 619, 0.868, -162, 121, 186, 40, 80, 280, 33, -0.138],
  [39.88, 1068.5, 621, 0.865, -166, 127, 185, 49, 9, 286, 31, -0.110], [39.92, 1068.5, 621, 0.865, -166, 127, 185, 49, 9, 286, 31, -0.113],
  [39.96, 1052.5, 620, 0.869, -167, 116, 184, 46, -7, 267, 33, -0.113],
  [40.00, 1041.0, 623, 0.867, -167, 120, 184, 57, 43, 242, 19, -0.084], [40.04, 1030.5, 620, 0.864, -170, 109, 187, 70, 40, 244, 17, -0.069],
  [40.08, 1021.0, 619, 0.857, -179, 98, 188, 70, 36, 254, 2, 0.016], [40.12, 1014.5, 622, 0.861, -179, 105, 187, 79, 26, 249, 7, -0.008],
  [40.16, 1011.5, 617, 0.864, -180, 94, 187, 89, 22, 255, 1, 0.028], [40.20, 1015.0, 614, 0.880, -184, 50, 180, 109, -2, 247, -8, 0.089],
  [40.24, 1019.0, 605, 0.900, -182, 117, 177, 121, 18, 239, -14, 0.134], [40.28, 1025.0, 594, 0.907, -183, 53, 176, 119, 11, 256, -19, 0.161],
  [40.32, 1031.2, 594, 0.906, -186, 53, 175, 133, -23, 255, -22, 0.182], [40.36, 1040.5, 587, 0.908, -186, 55, 176, 142, 4, 249, -23, 0.191],
  [40.40, 1051.5, 578, 0.924, -187, 50, 172, 125, 1, 247, -25, 0.199], [40.44, 1064.0, 569, 0.927, -184, 44, 175, 138, -30, 259, -30, 0.219],
  [40.48, 1077.0, 568, 0.928, -187, 48, 174, 135, -32, 262, -28, 0.219], [40.52, 1093.0, 558, 0.944, -186, 51, 174, 150, -2, 246, -8, 0.116],
  [40.56, 1108.0, 551, 0.958, -185, 44, 171, 148, 0, 246, -22, 0.190], [40.60, 1125.0, 541, 0.963, -185, 48, 173, 139, -29, 260, -30, 0.224],
  [40.64, 1143.0, 543, 0.972, -187, 51, 172, 153, -31, 261, -29, 0.214], [40.68, 1143.0, 543, 0.972, -187, 51, 172, 153, -31, 261, -29, 0.214],
];
export const bkRow = (t) => { let r = BK[0]; for (const x of BK) if (x[0] <= t + 1e-4) r = x; return r; };

// ---------------------------------------------------------------- reference geometry (upright, roll 0)
const HC = [0, 58];                      // head centre (the roll pivot)
const HEAD = { rx: 62, ry: 58, n: 2.3 };
function headOutline(rx = HEAD.rx, ry = HEAD.ry, n = HEAD.n) {
  const pts = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU, c = Math.cos(a), s = Math.sin(a);
    // superellipse, a little fuller at the bottom where it runs into the body
    const k = s > 0 ? 1.08 : 1;
    pts.push([HC[0] + rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), HC[1] + ry * k * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]);
  }
  return pts;
}
const BODY = [[-47, 100], [-60, 130], [-68, 162], [-72, 195], [-68, 218], [-50, 230], [-20, 236], [12, 236], [38, 228], [56, 208], [62, 180], [60, 145], [54, 110]];
const TAIL = { base: [2, 206], tips: [[56, 181], [64, 194], [63, 208], [52, 221]] };
const SHOULDER = [[-56, 98], [50, 106]];
// the wing's feather fan in its own frame: u along shoulder -> tip, v toward the trailing edge (both in wing lengths)
// 4 primaries fanning from the wrist, 7 secondaries along the trailing edge (tips; roots; width in wing lengths)
// (fix pass 1: the source's wings carry fewer, longer feathers of varied length, not a regular sawtooth: 5 primaries
// and 4 broad secondaries)
// (the source's feathers are long and point out along the wing, their tips staggered along its lower edge: unit grids
// of 38.60/38.72/39.52)
const FAN = [[1.0, 0.0], [0.94, 0.11], [0.85, 0.2], [0.74, 0.27], [0.62, 0.32], [0.49, 0.36], [0.35, 0.38], [0.2, 0.37], [0.06, 0.33]];
const ROOT = [[0.34, 0.04], [0.3, 0.07], [0.26, 0.1], [0.22, 0.12], [0.18, 0.15], [0.12, 0.17], [0.06, 0.18], [0.0, 0.18], [-0.06, 0.16]];
const FW = [0.06, 0.07, 0.075, 0.08, 0.085, 0.09, 0.095, 0.1, 0.1];
// the wrist rides high: the leading edge arcs up between the shoulder and the (measured) tip, the wing rising in a
// shallow V from the body (fix pass 1; source 38.56-39.96)
const WRIST = 0;

function feather(g, a, b, w, { fill = 0.95, line = gv(0.5, 0.7), lineSide = 1, lw = 1.1 } = {}) {
  const d = nrm(sub(b, a)), n = [-d[1], d[0]], L = len(sub(b, a));
  const P = (u, v) => add(add(a, mul(d, u * L)), mul(n, v * w));
  const out = [P(0, -0.35), P(0.3, -0.5), P(0.62, -0.46), P(0.86, -0.24), P(1, 0), P(0.86, 0.24), P(0.62, 0.46), P(0.3, 0.5), P(0, 0.35)];
  g.fillStyle = gv(fill); g.beginPath(); smoothPath(g, out, true); g.fill();
  // the grey separation line along one edge, and a faint shaft
  const e = lineSide > 0 ? [P(0.12, 0.44), P(0.4, 0.5), P(0.66, 0.44), P(0.88, 0.22), P(1, 0)] : [P(0.12, -0.44), P(0.4, -0.5), P(0.66, -0.44), P(0.88, -0.22), P(1, 0)];
  ink(g, e, lw, line, { end: 0.15, bias: 0.4 });
}
// one wing: shoulder S, tip T (units), side -1 = frame left, +1 = frame right
function wing(g, S, T, side, seed) {
  const L = len(sub(T, S)), d = nrm(sub(T, S));
  // trailing side: the perpendicular that points down (+y)
  let n = [-d[1], d[0]]; if (n[1] < 0) n = mul(n, -1);
  const M = (u, v) => { const b = -WRIST * Math.pow(Math.sin(Math.PI * Math.max(0, Math.min(1, u))), 1.3) * Math.max(0, 1 - v / 0.5); return add(add(S, mul(d, u * L)), mul(n, (v + b) * L)); };
  const r = rng(seed);
  // silhouette under the feathers (fills the gaps between the roots)
  g.fillStyle = gv(0.94);
  g.beginPath(); smoothPath(g, [M(-0.08, 0.02), M(0.3, -0.04), M(0.7, -0.03), M(0.95, 0.02), M(0.7, 0.2), M(0.45, 0.26), M(0.2, 0.28), M(-0.05, 0.24)], true); g.fill();
  for (let i = FAN.length - 1; i >= 0; i--) {
    const tip = M(FAN[i][0] + (r() - 0.5) * 0.015, FAN[i][1] + (r() - 0.5) * 0.015), root = M(ROOT[i][0], ROOT[i][1]);
    feather(g, root, tip, L * FW[i], { fill: 0.955 - 0.012 * r(), line: gv(0.52, 0.7), lineSide: 1, lw: 1.1 });
  }
  // soft grey over the trailing half of the wing (the source's wings are shaded, not flat white)
  const wpath = (c) => smoothPath(c, [M(-0.08, 0.02), M(0.3, -0.04), M(0.7, -0.03), M(1.0, 0.0), M(0.8, 0.3), M(0.5, 0.42), M(0.2, 0.45), M(-0.05, 0.4)], true);
  softShade(g, wpath, (c) => { const q = M(0.3, 0.2); c.ellipse(q[0], q[1], L * 0.3, L * 0.07, Math.atan2(d[1], d[0]), 0, TAU); }, 0.88, 0.4, L * 0.05);
  // coverts over the feather roots: white along the leading edge, one scalloped row of small feathers at its edge
  const band = [M(-0.12, 0.02), M(0.2, -0.045), M(0.45, -0.04), M(0.6, -0.01), M(0.66, 0.06), M(0.5, 0.15), M(0.3, 0.2), M(0.1, 0.23), M(-0.1, 0.22)];
  g.fillStyle = gv(0.96); g.beginPath(); smoothPath(g, band, true); g.fill();
  const N = 7;
  for (let i = 0; i < N; i++) {
    const u0 = -0.06 + (0.7 * i) / N, u1 = -0.06 + (0.7 * (i + 1)) / N, vv = 0.21 - 0.2 * Math.max(0, (u0 - 0.1) / 0.55);
    ink(g, [M(u0, vv - 0.015), M((u0 + u1) / 2, vv + 0.03), M(u1, vv - 0.015 - 0.02)], 1.0, gv(0.55, 0.5), { end: 0.2 });
  }
  softShade(g, (c) => smoothPath(c, band, true), (c) => { const q = M(0.25, 0.2); c.ellipse(q[0], q[1], L * 0.3, L * 0.06, Math.atan2(d[1], d[0]), 0, TAU); }, 0.86, 0.45, L * 0.04);
  // leading edge: a hair of grey
  ink(g, sampleCurve([M(0.02, -0.01), M(0.35, -0.045), M(0.7, -0.035), M(0.98, 0.0)], 5), 0.9, gv(0.6, 0.35), { end: 0.2 });
}
// a leg seen from behind: feathered shank from the hip to the ankle, three pale toes with dark claws
function leg(g, hip, ankle, side, spread = 1, toeDir = null) {
  const d = nrm(sub(ankle, hip)), n = [-d[1], d[0]];
  // feathered thigh (a white bulge at the bottom of the body) and shank, a faint grey keyline on the outer side
  const th = add(hip, mul(d, 4));
  g.fillStyle = gv(0.94); g.beginPath(); g.ellipse(th[0], th[1], 17, 19, Math.atan2(d[1], d[0]) - Math.PI / 2, 0, TAU); g.fill();
  const mid = add(V2mix(hip, ankle, 0.55), mul(n, side * 1.5));
  ink(g, [hip, mid, ankle], 20, gv(0.32, 0.9), { end: 0.75, pow: 0.3 });
  ink(g, [hip, mid, ankle], 16.5, gv(0.93), { end: 0.75, pow: 0.3 });
  ink(g, [add(th, mul(n, side * 16)), add(V2mix(th, ankle, 0.5), mul(n, side * 8)), add(ankle, mul(n, side * 6))], 1.2, gv(0.5, 0.5), { end: 0.2 });
  const base = toeDir ?? Math.atan2(d[1], d[0]);
  for (let i = -1; i <= 1; i++) {
    const a = base + i * 0.42 * spread + side * 0.06, Lt = i === 0 ? 26 : 21;
    const u = [Math.cos(a), Math.sin(a)], e = add(ankle, mul(u, Lt)), m = add(add(ankle, mul(u, Lt * 0.55)), mul([-u[1], u[0]], i * 2));
    ink(g, [ankle, m, e], 9.6, gv(0.42, 0.85), { end: 0.6, pow: 0.3 });
    ink(g, [ankle, m, e], 7.6, gv(0.9), { end: 0.6, pow: 0.3 });
    // (fix pass 1: pale claws with only a fine dark tip, not black blobs)
    ink(g, [add(e, mul(u, -1)), add(e, mul(u, 6))], 3.2, gv(0.82), { end: 0.2 });
    ink(g, [add(e, mul(u, 4)), add(e, mul(u, 7))], 1.1, gv(0.15, 0.9), { end: 0.1 });
  }
  g.fillStyle = gv(0.91); g.beginPath(); g.ellipse(ankle[0], ankle[1], 10, 7.5, 0, 0, TAU); g.fill();
}
const V2mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// a headphone cup from behind: a dark shell, faintly ribbed, a lighter rim on its outer side, a dark keyline
function cup(g, c, rx, ry, rot, side) {
  const sh = (x) => x.ellipse(c[0], c[1], rx, ry, rot, 0, TAU);
  // (fix pass 1: the source's cups are solid dark, a lighter rim only on their outer edge)
  g.fillStyle = gv(0.12); g.beginPath(); sh(g); g.fill();
  g.save(); g.beginPath(); sh(g); g.clip();
  const R = rng(Math.round(c[0] * 7 + 3));
  for (let i = 0; i < 7; i++) {
    const f = -0.85 + (1.7 * i) / 6, x = c[0] + f * rx;
    const col = i % 2 ? gv(0.05, 0.45) : gv(0.3, 0.25);
    ink(g, [rotAbout([x, c[1] - ry], c, rot), rotAbout([x + f * rx * 0.2, c[1]], c, rot), rotAbout([x, c[1] + ry], c, rot)], 1.6 + R() * 1.2, col, { end: 0.3 });
  }
  // the lit rim on the outer side
  g.strokeStyle = gv(0.42, 0.7); g.lineWidth = rx * 0.22;
  g.beginPath(); g.ellipse(c[0] + side * rx * 0.55, c[1], rx * 0.62, ry * 0.9, rot, side > 0 ? -1.3 : Math.PI - 1.3, side > 0 ? 1.3 : Math.PI + 1.3); g.stroke();
  g.restore();
  g.strokeStyle = gv(0.07, 0.95); g.lineWidth = 2.0; g.beginPath(); sh(g); g.stroke();
}

// the whole bird for one pose. p: { roll, L:[x,y], R:[x,y], B:[x,y], cupL, cupR, run }
export function paintBack(g, p) {
  const roll = p.roll || 0;
  const R = (q) => rotAbout(q, HC, roll);
  const Rh = R;
  // legs (behind the body): the lowest foot reaches the measured bottom point, the other hangs at its rest height
  const hips = [R([-50, 214]), R([26, 218])];
  const lowSide = p.B[0] < -20 ? 0 : 1;
  const ankles = [0, 1].map((k) => {
    if (k === lowSide) return [p.B[0] + (k ? -4 : 4), p.B[1] - 31];
    const rest = R(k ? [22, p.run ? 214 : 240] : [-55, p.run ? 212 : 243]);
    return rest;
  });
  // body + thighs
  const body = BODY.map(R);
  g.fillStyle = gv(0.95); g.beginPath(); smoothPath(g, body, true); g.fill();
  const bodyPath = (c) => smoothPath(c, body, true);
  // soft grey on the belly's lower left and along the bottom, and under the wings (source: 0.75-0.85 there)
  softShade(g, bodyPath, (c) => { const q = R([-66, 212]); c.ellipse(q[0], q[1], 34, 56, roll, 0, TAU); }, 0.72, 0.75, 14);
  softShade(g, bodyPath, (c) => { const q = R([-10, 256]); c.ellipse(q[0], q[1], 80, 24, roll, 0, TAU); }, 0.74, 0.7, 12);
  softShade(g, bodyPath, (c) => { const q = R([50, 190]); c.ellipse(q[0], q[1], 22, 50, roll, 0, TAU); }, 0.82, 0.5, 12);
  softShade(g, bodyPath, (c) => { const q = R([0, 152]); c.ellipse(q[0], q[1], 70, 18, roll, 0, TAU); }, 0.84, 0.5, 12);
  ink(g, sampleCurve(body.slice(1, 9), 5), 1.3, gv(0.55, 0.45), { end: 0.3 });
  // fine plumage: soft grey stroke clusters combing down the back, longer strokes along the shaded left side
  plumageStrokes(g, bodyPath, [-70, 100, 62, 240], (q, r) => nrm([Math.sin(roll) + (r() - 0.5) * 0.4 + q[0] * 0.004, 1]), { density: 0.9, len: [8, 16], w: [0.6, 0.9], color: gv(0.55, 0.55), seed: 31 });
  contourStrokes(g, body, { light: [0.6, -0.8], thr: 0.05, step: 6, depth: 10, len: 18, w: 0.8, color: gv(0.45, 0.6), seed: 33 });
  if (p.feet) {
    // the run: both feet keyframed per source frame (ankle x, y, toe direction)
    const [l, r] = p.feet;
    leg(g, hips[0], [l[0], l[1]], -1, 1, l[2]); leg(g, hips[1], [r[0], r[1]], 1, 1, r[2]);
  } else { leg(g, hips[0], ankles[0], -1); leg(g, hips[1], ankles[1], 1); }
  // tail: a small fan of pointed feathers at the lower right of the body, dark-lined
  const tb = R(TAIL.base);
  TAIL.tips.forEach((t, i) => feather(g, add(tb, [i * 2, i * 3]), R(t), 13 - i, { fill: 0.94, line: gv(0.38, 0.85), lw: 1.3, lineSide: -1 }));
  // head, tuft
  const H = headOutline().map(Rh);
  g.fillStyle = gv(0.97); g.beginPath(); smoothPath(g, H, true); g.fill();
  plumageStrokes(g, blob(H), [-50, 10, 50, 110], (q, r) => nrm([(r() - 0.5) * 0.5 + q[0] * 0.006, 1]), { density: 0.6, len: [6, 12], w: [0.5, 0.8], color: gv(0.6, 0.5), seed: 35 });
  softShade(g, blob(H), (c) => { const q = Rh([10, 118]); c.ellipse(q[0], q[1], 60, 14, roll, 0, TAU); }, 0.86, 0.35, 10);
  for (const [a, b, w] of [[[-46, 22], [-58, 5], 9], [[-42, 20], [-48, 3], 8], [[-36, 18], [-38, 7], 6]]) feather(g, R(a), R(b), w, { fill: 0.96, line: gv(0.5, 0.6), lw: 1 });
  // headphones: band over the crown, cups on the sides (the one turned toward us wider)
  const cL = R([-77, 64]), cR = R([76, 64]);
  const band = [R([-74, 26]), R([-64, 0]), R([-35, -16]), R([0, -22]), R([35, -16]), R([64, 0]), R([74, 26])];
  const bq = sampleCurve(band, 6);
  ink(g, bq, 6.4, gv(0.06, 0.95), { end: 0.85, pow: 0.2 });
  ink(g, bq, 3.6, gv(0.26), { end: 0.8, pow: 0.2 });
  ink(g, bq.map(([x, y]) => [x, y - 1.6]), 1.1, gv(0.55, 0.7), { end: 0.4 });
  cup(g, add(cL, [p.yaw || 0, 0]), (p.cupL ?? 16) * (1 - 0.25 * (p.yaw || 0) / 12), 42, roll, -1);
  cup(g, add(cR, [p.yaw || 0, 0]), (p.cupR ?? 15) * (1 + 0.35 * (p.yaw || 0) / 12), 42, roll, 1);
  // wings last (over the body)
  wing(g, R(SHOULDER[0]), p.L, -1, 17);
  wing(g, R(SHOULDER[1]), p.R, 1, 23);
}

// roll from the lower body's measured centre (upright when it sits 3 units right of the head centre)
// run feet per source frame, units: [t, [left ankle x, y, toe dir], [right ...]] (read off unit grids of every run frame,
// rescaled x1.05 to the head-width scale of the run rows)
const RUNLEG = [
  [40.00, [-8, 252, 1.57], [65, 252, 1.57]], [40.04, [-26, 233, 2.3], [58, 252, 1.57]], [40.08, [-32, 231, 2.6], [44, 257, 1.6]],
  [40.12, [-32, 248, 1.6], [37, 233, 0.6]], [40.16, [-47, 236, 2.2], [37, 257, 1.6]], [40.20, [-63, 233, 2.5], [10, 247, 1.6]],
  [40.24, [-58, 252, 1.9], [23, 247, 1.4]], [40.28, [-58, 268, 1.7], [26, 244, 1.4]], [40.32, [-89, 220, 2.4], [-10, 262, 1.7]],
  [40.36, [-84, 247, 2.0], [-8, 244, 1.6]], [40.40, [-89, 260, 1.9], [0, 247, 1.5]], [40.44, [-84, 236, 2.2], [8, 265, 1.6]],
  [40.48, [-89, 215, 2.4], [-23, 265, 1.7]], [40.52, [-94, 239, 2.0], [-13, 244, 1.6]], [40.56, [-100, 262, 2.0], [-10, 247, 1.6]],
  [40.60, [-84, 257, 1.9], [-16, 268, 1.6]], [40.64, [-100, 218, 2.4], [-19, 268, 1.6]], [40.68, [-100, 218, 2.4], [-19, 268, 1.6]],
];
// fix pass 1: in flight both legs are keyframed per source frame too (ankle x, y, toe direction in units): blobs of the
// legs below the body (luma > 140, unit-grid resampling of every flight frame); the far leg alternates between hanging
// and tucked, so the lower body swings from side to side (review 1: 25-30 px off on the odd frames with a rest pose)
const FLYLEG = [
  [38.52, [-63.2, 244.7, 1.67], [8.9, 262.2, 1.1]], [38.56, [-58.8, 238.4, 1.14], [-1.7, 274.3, 1.74]],
  [38.6, [-60.3, 248.8, 1.14], [8.9, 242.0, 1.62]], [38.64, [-68.6, 264.1, 1.9], [14.2, 238.9, 2.75]],
  [38.68, [-62.4, 248.2, 1.7], [11.4, 257.7, 0.95]], [38.72, [-57.4, 239.5, 1.19], [0.4, 277.1, 1.69]],
  [38.76, [-57.8, 260.1, 1.68], [9.1, 240.4, 1.46]], [38.8, [-62.7, 265.2, 1.23], [8.4, 238.4, 0.48]],
  [38.84, [-61.5, 244.9, 1.65], [11.4, 255.7, 0.95]], [38.88, [-54.2, 239.7, 1.22], [3.9, 276.1, 1.67]],
  [38.92, [-53.8, 256.2, 1.0], [15.0, 241.4, 1.77]], [38.96, [-54.8, 270.6, 1.33], [19.2, 241.5, 2.61]],
  [39.0, [-54.7, 270.6, 1.33], [19.3, 241.6, 2.61]], [39.04, [-43.4, 239.6, 1.15], [16.1, 275.0, 1.63]],
  [39.08, [-43.4, 239.5, 1.15], [16.1, 275.0, 1.63]], [39.12, [-40.0, 256.7, 1.16], [24.0, 239.1, 1.47]],
  [39.16, [-42.3, 266.3, 1.76], [21.0, 237.0, 2.3]], [39.2, [-36.1, 249.0, 1.52], [37.4, 256.3, 0.82]],
  [39.24, [-34.2, 240.0, 1.03], [30.3, 273.0, 1.54]], [39.28, [-29.2, 253.0, 1.56], [36.3, 239.4, 1.59]],
  [39.32, [-29.6, 268.1, 1.69], [32.8, 237.0, 2.27]], [39.36, [-30.5, 250.3, 1.39], [49.9, 256.8, 0.79]],
  [39.4, [-26.7, 240.5, 0.93], [44.5, 275.1, 1.49]], [39.44, [-13.3, 261.3, 1.09], [56.0, 240.4, 2.44]],
  [39.48, [-24.3, 266.0, 1.61], [-8.3, 270.0, 1.61]], [39.52, [-11.6, 253.5, 1.79], [57.5, 246.0, 2.12]],
  [39.56, [-15.6, 241.2, 0.77], [61.7, 268.1, 1.45]], [39.6, [9.4, 261.7, 0.95], [71.6, 237.8, 2.55]],
  [39.64, [8.7, 269.0, 1.56], [66.6, 236.4, 1.93]], [39.68, [5.7, 241.6, 0.65], [82.6, 246.5, 1.96]],
  [39.72, [7.1, 242.8, 0.82], [84.9, 244.7, 2.27]], [39.76, [12.4, 268.2, 1.44], [70.7, 235.9, 2.0]],
  [39.8, [14.3, 251.7, 0.67], [81.2, 237.8, 2.32]], [39.84, [-0.2, 241.9, 0.74], [77.0, 260.2, 1.42]],
  [39.88, [8.2, 267.2, 1.43], [69.0, 236.6, 2.51]], [39.92, [8.6, 267.1, 1.45], [69.0, 236.6, 2.5]],
  [39.96, [-2.0, 248.6, 1.82], [73.3, 239.0, 2.41]],
];
export function poseAt(row) {
  let [t, , , , Lx, Ly, Rx, Ry, Bx, By, , roll] = row;
  const run = t >= 39.98;
  let feet = null;
  const T = run ? RUNLEG : FLYLEG;
  { let f = T[0]; for (const x of T) if (x[0] <= t + 1e-4) f = x; feet = [f[1], f[2]]; }
  // (run: the painted wing tips measured ~6 px inside the source's -> pushed out)
  const e = run ? 6 : 0;
  // (fix pass 1: in flight the painted lower body sat ~10 px left of the source's on every frame and the cups tilted
  // the wrong way: the measured roll overstates the lean by ~0.07 rad)
  if (!run) roll -= 0.07;
  // (fix pass 1: at 40.56-40.64 the source's head turns a little to its right: more of the right cup shows)
  const yaw = t >= 40.55 ? 12 : 0;
  return { roll, L: [Lx - e, Ly], R: [Rx + e, Ry], B: [Bx, By], run, feet, cupL: 16, cupR: 16, yaw };
}

export function backLayer2(row, res = 1) {
  // (flight: the painted bird measured 2% small against the source blob at the same s -> 1.02)
  const s = row[3] * (row[0] < 39.98 ? 1.02 : 1.0);
  const x0 = -240, y0 = -40, x1 = 240, y1 = 320;
  const c = document.createElement("canvas");
  c.width = Math.ceil((x1 - x0) * s * res); c.height = Math.ceil((y1 - y0) * s * res);
  const g = c.getContext("2d");
  g.setTransform(s * res, 0, 0, s * res, -x0 * s * res, -y0 * s * res);
  g.lineJoin = "round"; g.lineCap = "round";
  setPPU(s * res);
  paintBack(g, poseAt(row));
  setPPU(1);
  return { canvas: c, x: x0 * s, y: y0 * s, w: (x1 - x0) * s, h: (y1 - y0) * s };
}
