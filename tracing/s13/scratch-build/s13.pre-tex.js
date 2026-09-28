// Owl startled (35.36–36.92): a big close-up of the owl on black — saucer eyes with pin-prick pupils, a sweat drop,
// beak hanging open, one wing flung up and out to the right.
//
// Measured on the source (frame diffs + ORB tracking of head / wing / body / feet regions, 25 fps):
//   35.36–35.40  pose A: the far (viewer-left) wing raised as a long paddle behind the head, near wing rotated ~9° lower
//   35.44–35.48  pose B: far wing dropped to a small nub; near wing swung up
//   35.52–35.56  the owl settles: head +8 / +17 px, wing +6 / +16, body +6 / +12, feet +3.5 / +6.6 (y)
//   35.60–35.92  pose C held (head +30, wing +30 & rot +2.5°, body +20, feet +10 vs B) — the master drawing below
//   35.96–36.00  C with the head starting to turn: head (-10, +2.5) rot -1.1°
//   36.04–36.44  pose D: the head redrawn facing camera (headphone band arcing over the crown, both cups); body held
//   36.48        an in-between: D a little larger, pupils centred
//   36.52–36.88  back to C (head starts +4.8 px right and drifts home by 36.72)
// No camera move (feet and body track still to < 1 px). All geometry is authored in frame pixels for pose C and
// the other poses are C's part layers moved by the measured transforms (plus pose-specific drawings for A's raised
// wing and D's head).
import { plumage, softShade, rimHatch, edgeFlicks, featherRow, fringe, screentone, ink, flick, setPPU, drawBandage, gv, LINE, V } from "../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../lib/paths.js";
import { taper } from "../lib/ink.js";
import { rng } from "../lib/rng.js";

const TAU = Math.PI * 2;
const { add, sub, mul, nrm, perp } = V;

// ---------------------------------------------------------------- path helpers
// Closed/open curve through [x, y, sharp] points: Catmull-Rom, but a point flagged sharp becomes a corner
// (feather spikes on a ragged silhouette).
function mixPath(c, pts, closed = true) {
  const n = pts.length, k = 1 / 6;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  c.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = p1[2] ? [p1[0] + (p2[0] - p1[0]) * 0.28, p1[1] + (p2[1] - p1[1]) * 0.28] : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = p2[2] ? [p2[0] - (p2[0] - p1[0]) * 0.28, p2[1] - (p2[1] - p1[1]) * 0.28] : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    c.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
  }
  if (closed) c.closePath();
}
const shp = (pts) => (c) => mixPath(c, pts, true);
const blob = (pts) => (c) => smoothPath(c, pts, true);
function clipTo(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(); g.restore(); }
// a closed ring of varying width round an ellipse (eye rims)
function ring(g, cx, cy, rx, ry, rot, wf, color = LINE, n = 72) {
  const cr = Math.cos(rot), sr = Math.sin(rot);
  const O = [], I = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    const nx = Math.cos(a) * ry, ny = Math.sin(a) * rx, l = Math.hypot(nx, ny);
    const w = wf(a) / 2;
    const px = cx + x * cr - y * sr, py = cy + x * sr + y * cr;
    const ux = (nx / l) * cr - (ny / l) * sr, uy = (nx / l) * sr + (ny / l) * cr;
    O.push([px + ux * w, py + uy * w]); I.push([px - ux * w, py - uy * w]);
  }
  g.beginPath();
  g.moveTo(O[0][0], O[0][1]); for (const p of O) g.lineTo(p[0], p[1]); g.closePath();
  g.moveTo(I[n][0], I[n][1]); for (let i = n; i >= 0; i--) g.lineTo(I[i][0], I[i][1]); g.closePath();
  g.fillStyle = color; g.fill("nonzero");
}
// a thin dark keyline riding the silhouette (its outer half falls on black, its inner half darkens the rim)
function keyline(g, pts, w = 2.4, color = gv(0.2, 0.75)) {
  const q = pts.map((p) => [p[0], p[1]]);
  for (let i = 0; i < q.length - 1; i += 6) ink(g, q.slice(i, Math.min(q.length, i + 8)), w, color, { end: 0.3 });
}
// strokes scattered in a polygon region, all running roughly along `ang`
function fur(g, path, box, n, ang, len, seed, { w = 1.1, color = gv(0.4, 0.45), spread = 0.35, curve = 0.15 } = {}) {
  const r = rng(seed);
  clipTo(g, path, () => {
    for (let i = 0; i < n; i++) {
      const x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]);
      const a = ang + (r() - 0.5) * spread;
      flick(g, [x, y], [Math.cos(a), Math.sin(a)], len * (0.5 + r()), w * (0.6 + 0.8 * r()), color, (r() - 0.5) * curve * 2);
    }
  });
}
// ---------------------------------------------------------------- pose C geometry (frame px, measured at 35.80)
// head silhouette, going up the left side, over the crown (under the headphone band) and down behind the cup
const HEAD = [
  [905, 470], [899, 420], [896, 370], [892, 330], [887, 290], [884, 250], [885, 222], [893, 214, 1], [876, 180, 1], [902, 188], [895, 164, 1], [912, 174], [937, 146, 1],
  [940, 120], [944, 97, 1], [953, 104], [962, 66, 1], [972, 68], [1008, 12, 1], [1008, 52], [1018, 50, 1], [1030, 84], [1062, 76], [1098, 68, 1],
  [1112, 70], [1150, 58, 1], [1160, 66], [1196, 64], [1217, 63], [1240, 33, 1], [1252, 60], [1263, 58], [1293, 42, 1], [1300, 68], [1313, 72], [1347, 57, 1],
  [1352, 76], [1372, 72], [1405, 50], [1440, 30], [1467, 13, 1], [1450, 44], [1428, 80], [1410, 116], [1426, 148], [1432, 168], [1418, 200], [1424, 260], [1428, 330], [1446, 380],
  [1500, 410], [1520, 440], [1450, 480], [1340, 520], [1200, 548], [1060, 548], [960, 520],
];
const EYE_L = { x: 964, y: 332, rx: 46, ry: 69, rot: -0.1, wtop: 2.5, px: 964.5, py: 336.5, pr: 6, prx: 0.8, pry: 1.15, lash: [[1.9, 3.4, 9], [0.9, 1.8, 5]] };
const EYE_R = { x: 1177, y: 323, rx: 74.5, ry: 75, rot: 0.05, px: 1151, py: 329, pr: 9, lash: [[1.7, 2.9, 10], [-1.2, 0.3, 8]] };
// far wing nub peeking out left of the head
const NUB = [[905, 460], [884, 438], [860, 412], [838, 382], [822, 350], [815, 322], [818, 300], [834, 284], [858, 279], [886, 284], [900, 300], [915, 380]];
// body: chest down the left, belly along the bottom, the right flank under the wing
const BODY = [
  [900, 440], [930, 488, 1], [948, 482], [985, 520, 1], [1000, 516], [1032, 576, 1], [1038, 600], [1045, 623, 1], [1044, 640], [1059, 656, 1], [1062, 672], [1084, 718, 1],
  [1092, 702], [1118, 740], [1145, 774], [1180, 802], [1212, 825], [1250, 842], [1284, 856], [1316, 880], [1350, 890], [1395, 891], [1428, 878], [1470, 858], [1520, 852], [1570, 866], [1610, 884],
  [1640, 900], [1660, 850], [1640, 760], [1620, 680], [1600, 600], [1580, 480], [1540, 400], [1470, 368], [1380, 380], [1150, 380], [950, 380],
];
// tail feathers under the wing, reaching down-right out of frame
const TAIL = [[1560, 600], [1619, 622], [1652, 660], [1654, 686], [1681, 742], [1735, 810], [1789, 875], [1822, 946], [1700, 946], [1640, 900], [1600, 800], [1570, 700]];
// the near wing, flung up and out to the right
const WING = [
  [1520, 400], [1548, 350], [1588, 290], [1616, 262], [1654, 240, 1], [1648, 260], [1713, 251, 1], [1692, 268], [1760, 294], [1820, 322, 1], [1812, 330],
  [1870, 360], [1928, 397, 1], [1893, 396], [1935, 440], [1968, 474], [2000, 512], [2026, 552], [2046, 590], [2062, 632], [2078, 680], [2092, 722, 1],
  [2073, 716], [2040, 690, 1], [2035, 723, 1], [2000, 700], [1969, 688, 1], [1969, 703, 1], [1940, 696], [1905, 674], [1876, 654, 1], [1840, 640], [1826, 637, 1],
  [1810, 618], [1790, 630, 1], [1784, 654, 1], [1760, 646], [1735, 641, 1], [1735, 661, 1], [1710, 650], [1683, 638, 1], [1679, 657, 1], [1660, 654, 1], [1640, 640], [1600, 600], [1560, 520],
];
// ---------------------------------------------------------------- painters (pose C)
function paintNub(g) {
  const p = blob(NUB);
  plumage(g, p, { base: 0.84, shade: 0.52, light: [0.6, -0.3], depth: 16, blur: 8 });
  fur(g, p, [810, 276, 910, 460], 60, 1.15, 38, 131, { w: 1.2, color: gv(0.3, 0.55), spread: 0.2 });
  rimHatch(g, NUB, { light: [0.8, -0.2], flow: [0.5, 0.85], len: 16, step: 3, w: 1.2, color: gv(0.2, 0.6), seed: 132 });
  ink(g, [[905, 462], [870, 426], [838, 384], [818, 336], [822, 300], [846, 282]], 2.2, gv(0.15, 0.8), { end: 0.1 });
}
// pose A: the far wing raised as a long paddle behind the head
const RAISED = [[1050, 590], [1000, 560], [950, 534], [900, 496], [858, 452], [822, 404], [796, 364], [785, 340], [788, 322], [800, 311], [826, 308], [860, 312], [890, 320], [980, 420], [1040, 520]];
function paintRaised(g) {
  const p = blob(RAISED);
  plumage(g, p, { base: 0.8, shade: 0.6, light: [0.3, -0.9], depth: 14, blur: 8 });
  // long barbs running along the paddle
  fur(g, p, [780, 300, 1050, 590], 70, 0.78, 80, 141, { w: 1.9, color: gv(0.22, 0.7), spread: 0.1, curve: 0.04 });
  // pale rim along the lower edge
  ink(g, [[800, 350], [840, 420], [900, 482], [960, 522], [1030, 560]], 8, gv(0.95, 0.9), { end: 0.2 });
  ink(g, [[790, 344], [832, 420], [895, 490], [960, 532], [1040, 575]], 2.2, gv(0.15, 0.85), { end: 0.1 });
  ink(g, [[788, 322], [800, 311], [826, 308], [860, 312]], 1.6, gv(0.25, 0.7), { end: 0.2 });
}
// the tail: long feathers under the wing reaching down-right, dark between them (its own layer: it stays put
// while the body bobs)
function paintTail(g) {
  const tp = blob(TAIL);
  plumage(g, tp, { base: 0.86, shade: 0.56, light: [-0.8, -0.4], depth: 30, blur: 14 });
  clipTo(g, tp, () => {
    const r = rng(71);
    for (let i = 0; i < 12; i++) {
      const f = i / 11, root = [1570 + f * 80, 620 + f * 50], tip = [1690 + f * 140, 946 + f * 20];
      ink(g, [root, add(V.mix(root, tip, 0.5), [6, 0]), tip], 2 + r() * 1.5, gv(0.08, 0.85), { end: 0.1 });
      ink(g, [add(root, [10, 6]), add(V.mix(root, tip, 0.5), [18, 4]), add(tip, [12, 0])], 3, gv(0.95, 0.5), { end: 0.1 });
    }
    fur(g, tp, [1560, 600, 1830, 946], 320, 1.1, 42, 72, { w: 1.1, color: gv(0.15, 0.55), spread: 0.18 });
  });
}
function paintBody(g) {
  // belly
  const bp = shp(BODY);
  g.fillStyle = gv(0.84); g.beginPath(); bp(g); g.fill();
  clipTo(g, bp, () => {
    g.filter = "blur(44px)";
    g.fillStyle = gv(0.975); g.beginPath(); g.ellipse(1250, 590, 330, 250, 0.35, 0, TAU); g.fill();
    g.filter = "blur(30px)";
    g.fillStyle = gv(0.6, 0.55); g.beginPath(); g.ellipse(1470, 930, 250, 60, 0.05, 0, TAU); g.fill();
    g.fillStyle = gv(0.7, 0.4); g.beginPath(); g.ellipse(1640, 700, 60, 200, 0.2, 0, TAU); g.fill();
    g.filter = "none";
  });
  // chest and belly edge: fur strokes combing out to the ragged silhouette, darker low down
  keyline(g, sampleCurve(BODY.slice(0, 22), 4), 2.4);
  rimHatch(g, BODY.slice(0, 22), { light: [0.4, -0.9], flow: [-0.5, 1], len: 48, step: 5, w: 1.6, color: gv(0.3, 0.6), seed: 81, closed: false, thr: -0.2, density: 0.7 });
  fringe(g, BODY.slice(0, 22), { step: 26, len: 16, w: 7, color: gv(0.96), ang: 0.9, seed: 86, closed: false });
  fur(g, bp, [1000, 520, 1600, 880], 60, -2.0, 50, 83, { w: 1.6, color: gv(0.4, 0.5), spread: 0.35 });
  fur(g, bp, [1180, 780, 1640, 915], 110, -2.3, 44, 84, { w: 1.6, color: gv(0.28, 0.6), spread: 0.3 });
  fur(g, bp, [1540, 560, 1660, 900], 70, 1.9, 50, 85, { w: 1.5, color: gv(0.3, 0.55), spread: 0.3 });
  // the flank under the wing root: shaded, densely stroked
  softShade(g, bp, (c) => c.ellipse(1585, 530, 70, 130, 0.3, 0, TAU), 0.62, 0.7, 26);
  fur(g, bp, [1500, 420, 1640, 640], 120, 1.3, 42, 87, { w: 1.3, color: gv(0.2, 0.6), spread: 0.35 });
}
// the near wing: a light grey fan of long blade feathers under two rows of long coverts; the feathers read as
// thin dark edge lines (hooked at the covert tips), pale streaks along the vanes, and dark notches between the tips
const PRIM_LINES = [
  [[1905, 470], [1968, 590], [2035, 712]], [[1950, 490], [2010, 600], [2076, 712]], [[1880, 500], [1935, 600], [1992, 694]],
  [[1845, 520], [1900, 600], [1950, 676]], [[1800, 540], [1840, 600], [1878, 648]], [[1760, 555], [1785, 595], [1808, 632]],
  [[1712, 566], [1728, 610], [1742, 652]], [[1668, 580], [1678, 620], [1688, 652]], [[1930, 460], [2000, 560], [2060, 660]],
  [[1990, 560], [2030, 630], [2062, 690]], [[1860, 470], [1920, 560], [1972, 650]], [[1820, 490], [1870, 570], [1915, 640]],
];
const MARGINAL = [
  [[1617, 319], [1701, 344]], [[1651, 321], [1747, 357]], [[1697, 336], [1797, 377]], [[1755, 348], [1830, 386]], [[1817, 352], [1897, 382]],
  [[1612, 350], [1690, 382]], [[1660, 368], [1745, 405]], [[1600, 392], [1670, 420]], [[1640, 400], [1720, 438]], [[1590, 430], [1650, 460]],
];
// covert loops: [tip (lower-right end), length, half width, angle]
const LOOPS = [
  [[1934, 470], 150, 15, 0.72], [[1880, 440], 150, 15, 0.62], [[1820, 440], 160, 16, 0.6], [[1761, 448], 150, 15, 0.62], [[1700, 460], 130, 14, 0.7],
  [[1927, 501], 170, 18, 0.8], [[1860, 512], 175, 19, 0.74], [[1790, 528], 175, 19, 0.74], [[1730, 548], 165, 18, 0.8], [[1675, 566], 150, 17, 0.9],
];
function paintWing(g) {
  const wp = shp(WING);
  g.fillStyle = gv(0.86); g.beginPath(); wp(g); g.fill();
  clipTo(g, wp, () => {
    g.filter = "blur(30px)";
    g.fillStyle = gv(0.96, 0.8); g.beginPath(); g.ellipse(1720, 320, 180, 60, 0.45, 0, TAU); g.fill();
    g.fillStyle = gv(0.7, 0.7); g.beginPath(); g.ellipse(1570, 520, 60, 150, 0.25, 0, TAU); g.fill();
    g.filter = "blur(24px)";
    g.fillStyle = gv(0.74, 0.4); g.beginPath(); smoothPath(g, [[1660, 660], [1800, 650], [1950, 700], [2080, 740], [2080, 780], [1660, 720]], true); g.fill();
    g.filter = "none";
    const r = rng(261);
    // primaries: long blades, each with a pale stripe down the vane, a dark edge line and a finer second line
    PRIM_LINES.forEach((pts, i) => {
      const r2 = rng(270 + i);
      ink(g, pts.map(([x, y]) => [x - 14, y + 2]), 7 + r2() * 5, gv(0.97, 0.7), { end: 0.1 });
      ink(g, pts, 2.4 + r2() * 1.0, gv(0.1, 0.9), { end: 0.08, bias: 0.6 });
      ink(g, pts.map(([x, y]) => [x - 22 - r2() * 6, y + 6]), 1.2, gv(0.3, 0.6), { end: 0.1 });
    });
    // marginal coverts: rows of short strokes following the leading edge
    for (let k = 0; k < 4; k++) {
      const row = WING.slice(2, 16).map(([x, y]) => [x - 18 - k * 26, y + 26 + k * 30]);
      featherRow(g, row, { step: 9, len: 26, w: 1.5, color: gv(0.25, 0.65), ang: 0.35, seed: 262 + k, gap: 0.3 });
    }
    MARGINAL.forEach(([a, b]) => ink(g, [a, add(V.mix(a, b, 0.5), [0, 4]), b], 1.8, gv(0.2, 0.7), { end: 0.1, bias: 0.4 }));
    // covert loops: long narrow leaf outlines, the lower edge inked, the upper edge a fine grey line
    LOOPS.forEach(([tip, L, w, ang], i) => {
      const d = [Math.cos(ang), Math.sin(ang)], n = perp(d), S = sub(tip, mul(d, L));
      const P = (t, k) => add(add(S, mul(d, L * t)), mul(n, k * w));
      const shape = [P(0, -0.6), P(0.4, -1), P(0.85, -0.85), P(0.99, -0.2), P(0.99, 0.35), P(0.85, 0.9), P(0.4, 1), P(0, 0.6)];
      g.fillStyle = gv(0.9, 0.7); g.beginPath(); smoothPath(g, shape, true); g.fill();
      ink(g, [P(0.1, 0.75), P(0.5, 1.02), P(0.85, 0.9), P(0.99, 0.35), P(0.99, -0.2), P(0.9, -0.7)], 2.2, gv(0.1, 0.9), { end: 0.1, bias: 0.8 });
      ink(g, [P(0.05, -0.5), P(0.45, -0.98), P(0.82, -0.85)], 1.1, gv(0.35, 0.6), { end: 0.1 });
    });
    // the root of the wing against the body: fine dense strokes
    fur(g, wp, [1510, 380, 1660, 640], 240, 1.2, 40, 253, { w: 1.3, color: gv(0.2, 0.6), spread: 0.35 });
    fur(g, wp, [1660, 380, 1960, 520], 90, 0.7, 40, 254, { w: 1.2, color: gv(0.4, 0.45), spread: 0.2 });
  });
  keyline(g, sampleCurve(WING.slice(0, 46), 4), 2.6);
}
// talons: each toe is a big rounded knuckle, a smaller second joint below-left, and a long pale claw hooking
// down out of frame; heavy black outlines, black between the toes. The left foot shows its scaly back behind.
const TOES = [
  // [knuckle x, y, r, joint x, y, r, claw tip x, y]
  [1195, 897, 22, 1187, 914, 15, 1172, 952], [1240, 882, 25, 1230, 902, 16, 1212, 950],
  [1556, 896, 22, 1548, 914, 15, 1532, 952], [1458, 877, 24, 1450, 898, 16, 1433, 950], [1507, 866, 27, 1498, 891, 17, 1479, 950],
];
// below the frame edge in C: the far toes' claws curling under the perch (they come into view when the feet rise 15 px in A/B)
const UNDER = [[1182, 946, 1198, 972], [1236, 944, 1250, 970], [1446, 944, 1462, 972], [1494, 942, 1508, 970], [1546, 946, 1560, 972]];
function toe(g, [x1, y1, r1, x2, y2, r2, x3, y3], seed) {
  const r = rng(seed);
  // claw: a pale hooked blade from under the second joint to the tip
  const d = nrm(sub([x3, y3], [x2, y2])), n = perp(d);
  const claw = [add([x2, y2], mul(n, r2 * 1.2)), add(add([x2, y2], mul(d, r2 * 1.8)), mul(n, r2 * 0.95)), [x3, y3, 1], add(add([x2, y2], mul(d, r2 * 1.5)), mul(n, -r2 * 1.0)), add([x2, y2], mul(n, -r2 * 1.2))];
  g.fillStyle = gv(0.92); g.beginPath(); mixPath(g, claw, true); g.fill();
  clipTo(g, (c) => mixPath(c, claw, true), () => { g.filter = "blur(3px)"; g.fillStyle = gv(0.55, 0.6); g.beginPath(); g.ellipse(x2 - n[0] * r2 * 0.7 + d[0] * 18, y2 + d[1] * 18, r2 * 0.4, 26, 0, 0, TAU); g.fill(); g.filter = "none"; });
  g.strokeStyle = LINE; g.lineWidth = 2.4; g.beginPath(); mixPath(g, claw, true); g.stroke();
  // the two joints as one rounded body
  const body = (c) => {
    c.moveTo(x1 + r1, y1);
    c.arc(x1, y1, r1, 0, Math.PI, true);
    c.lineTo(x2 - r2, y2);
    c.arc(x2, y2, r2, Math.PI, 0, true);
    c.closePath();
  };
  g.fillStyle = gv(0.9); g.beginPath(); body(g); g.fill();
  clipTo(g, body, () => {
    g.filter = "blur(5px)";
    g.fillStyle = gv(0.55, 0.7); g.beginPath(); g.ellipse(x1 + r1 * 0.8, (y1 + y2) / 2 + 4, r1 * 0.35, r1 * 1.4, 0, 0, TAU); g.fill();
    g.fillStyle = gv(1, 0.9); g.beginPath(); g.ellipse(x1 - r1 * 0.3, y1 - r1 * 0.35, r1 * 0.45, r1 * 0.3, 0, 0, TAU); g.fill();
    g.filter = "none";
  });
  g.strokeStyle = LINE; g.lineWidth = 4.4; g.beginPath(); body(g); g.stroke();
  // joint creases
  ink(g, [[x2 - r2 * 0.9, y2 - r2 * 0.55], [x2 - r2 * 0.1, y2 - r2 * 0.95], [x2 + r2 * 0.9, y2 - r2 * 0.6]], 2.4, gv(0.18, 0.9), { end: 0.2 });
  ink(g, [[x1 - r1 * 0.6, y1 - r1 * 0.2], [x1, y1 - r1 * 0.45], [x1 + r1 * 0.55, y1 - r1 * 0.15]], 1.5, gv(0.4, 0.7), { end: 0.2 });
  ink(g, [[x1 - r1 * 0.5, y1 + r1 * 0.3], [x1 + r1 * 0.1, y1 + r1 * 0.1], [x1 + r1 * 0.6, y1 + r1 * 0.35]], 1.3, gv(0.4, 0.6), { end: 0.2 });
}
function paintFeet(g) {
  const r = rng(281);
  // feathered legs: dark hair strokes at the top of each foot
  for (const [x0, x1, y0] of [[1200, 1300, 846], [1440, 1580, 838]]) {
    for (let i = 0; i < 24; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * 30; flick(g, [x, y], nrm([0.3 + r() * 0.5, 1]), 18 + r() * 22, 1.4, gv(0.15, 0.75), 0.1); }
  }
  // the left foot's scaly back, reaching down-right behind the toes
  const back = [[1256, 874], [1296, 876], [1326, 904], [1346, 950], [1340, 975], [1276, 975], [1258, 910]];
  g.fillStyle = gv(0.5); g.beginPath(); smoothPath(g, back, true); g.fill();
  clipTo(g, (c) => smoothPath(c, back, true), () => {
    for (let i = 0; i < 26; i++) { const x = 1250 + r() * 110, y = 872 + r() * 76; ink(g, [[x, y], [x + 8, y + 3], [x + 16, y + 1]], 1.4, gv(0.15, 0.8), { end: 0.2 }); }
  });
  g.strokeStyle = LINE; g.lineWidth = 3.5; g.beginPath(); smoothPath(g, back, true); g.stroke();
  for (const [x0, y0, x1, y1] of UNDER) {
    const c = [[x0 - 10, y0 - 6], [x0 + 12, y0 - 4], [x1 + 4, y1 - 8], [x1, y1, 1], [x0 - 6, y0 + 12]];
    g.fillStyle = gv(0.88); g.beginPath(); mixPath(g, c, true); g.fill();
    g.strokeStyle = LINE; g.lineWidth = 2.6; g.beginPath(); mixPath(g, c, true); g.stroke();
  }
  TOES.forEach((t, i) => toe(g, t, 290 + i));
}
// ---- head, 3/4 (pose C)
const BAND_BACK = [[1088, 76], [1130, 38], [1190, 12], [1260, 0], [1330, -3], [1390, 5], [1432, 28], [1462, 62]];
function paintHead3q(g) {
  // the far run of the headband behind the crown: we see its inner face (a dark mesh strip) under a pale rim
  const bq = sampleCurve(BAND_BACK, 8);
  const inner = bq.map(([x, y], i) => { const a = bq[Math.max(0, i - 1)], b = bq[Math.min(bq.length - 1, i + 1)], n = nrm(perp(sub(b, a))); return [x + n[0] * 14, y + n[1] * 14]; });
  taper(g, inner, () => 26, LINE);
  taper(g, inner, () => 20, halftonePat(g, 3.4, 0.08, 0.42));
  taper(g, bq, () => 8, LINE);
  taper(g, bq, () => 5, gv(0.8));
  paintSlider3q(g);
  const hp = shp(HEAD);
  // plumage: glowing white, greyer along the crown
  g.fillStyle = gv(0.975); g.beginPath(); hp(g); g.fill();
  clipTo(g, hp, () => {
    g.filter = "blur(26px)";
    g.fillStyle = gv(0.76, 0.75); g.beginPath(); smoothPath(g, [[1000, 40], [1200, 30], [1470, 20], [1470, 120], [1250, 120], [1060, 150], [990, 120]], true); g.fill();
    g.fillStyle = gv(0.7, 0.55); g.beginPath(); g.ellipse(1400, 400, 90, 40, 0, 0, TAU); g.fill();
    g.fillStyle = gv(0.86, 0.5); g.beginPath(); g.ellipse(1060, 215, 60, 40, 0, 0, TAU); g.fill();
    g.filter = "none";
  });
  keyline(g, sampleCurve(HEAD.slice(0, 46), 4), 2.4);
  rimHatch(g, HEAD.slice(0, 46), { light: [0.3, 0.9], flow: [0.4, 1], len: 44, step: 5, w: 1.5, color: gv(0.3, 0.6), seed: 311, closed: false, thr: -0.4, density: 0.7 });
  // the left edge of the head: a ragged dark fur line that parts it from the wing behind
  { const r = rng(319); const edge = sampleCurve(HEAD.slice(0, 8).map((p) => [p[0], p[1]]), 6);
    for (let i = 0; i < edge.length - 1; i++) { const p = edge[i]; if (r() < 0.3) continue; flick(g, [p[0] + 3 + r() * 4, p[1]], nrm([-0.3 + r() * 0.2, r() < 0.5 ? 1 : -1]), 16 + r() * 22, 1.8, gv(0.12, 0.8), 0.15); } }
  // forehead: long diagonal strokes up to the crown
  fur(g, hp, [1060, 90, 1330, 240], 36, -0.7, 80, 313, { w: 1.8, color: gv(0.3, 0.65), spread: 0.2 });
  fur(g, hp, [1080, 50, 1420, 150], 40, -0.55, 60, 315, { w: 1.7, color: gv(0.25, 0.65), spread: 0.25 });
  fur(g, hp, [900, 150, 1010, 300], 20, -1.2, 44, 314, { w: 1.5, color: gv(0.35, 0.55), spread: 0.3 });
  fur(g, hp, [886, 200, 930, 480], 30, 1.75, 40, 316, { w: 1.5, color: gv(0.25, 0.55), spread: 0.3 });
  fur(g, hp, [900, 400, 1010, 500], 24, 2.0, 40, 317, { w: 1.4, color: gv(0.35, 0.55), spread: 0.4 });
  fur(g, hp, [1100, 440, 1420, 520], 30, 2.3, 44, 318, { w: 1.4, color: gv(0.4, 0.5), spread: 0.4 });
  // right tuft: strokes toward the tip
  clipTo(g, hp, () => { for (let k = 0; k < 7; k++) { const b = [1372 + k * 7, 132 - k * 5]; flick(g, b, nrm(sub([1465, 14], b)), 70 + k * 6, 1.4, gv(0.3, 0.6), 0.04); } });
  ink(g, [[1392, 46], [1420, 80], [1432, 140]], 2.0, gv(0.2, 0.7), { end: 0.1 });
  // facial disc: the V over the beak and the rims round the eyes
  featherRow(g, [[985, 222], [1010, 262], [1030, 300], [1040, 360]], { step: 3.5, len: 26, w: 1.2, color: gv(0.38, 0.6), ang: 2.6, seed: 321, gap: 0.1 });
  featherRow(g, [[1080, 238], [1060, 270], [1045, 320]], { step: 3.5, len: 24, w: 1.2, color: gv(0.38, 0.6), ang: -2.6, seed: 322, gap: 0.1 });
  featherRow(g, [[1090, 222], [1160, 208], [1240, 212], [1290, 232]], { step: 4, len: 26, w: 1.1, color: gv(0.4, 0.5), ang: -0.5, seed: 323, gap: 0.2 });
  featherRow(g, [[912, 250], [930, 238], [960, 230], [990, 236]], { step: 4, len: 18, w: 1.0, color: gv(0.4, 0.5), ang: 0.6, seed: 324, gap: 0.2 });
  featherRow(g, [[1100, 400], [1160, 420], [1230, 412], [1290, 380]], { step: 4, len: 22, w: 1.1, color: gv(0.4, 0.5), ang: -2.4, seed: 325, gap: 0.2 });
  featherRow(g, [[915, 400], [950, 420], [990, 418]], { step: 4, len: 18, w: 1.0, color: gv(0.4, 0.5), ang: -2.2, seed: 326, gap: 0.2 });
  // chin/cheek strokes under the beak
  fur(g, hp, [1060, 440, 1300, 530], 22, 2.2, 36, 327, { w: 1.4, color: gv(0.45, 0.5) });
  // under the cup: a shadow of dark feathery strokes
  for (let i = 0; i < 26; i++) { const r = rng(330 + i), x = 1395 + r() * 120, y = 392 + r() * 24; flick(g, [x, y], nrm([-0.4 + r() * 0.3, 1]), 30 + r() * 30, 1.6, gv(0.15, 0.7), 0.1); }
  paintEyes3q(g);
  paintBeak3q(g);
  plaster(g, [944, 150], [1094, 74], 30, false, 331); plaster(g, [982, 90], [1068, 152], 44, true, 332);
  // sweat drop
  const drop = [[1305, 238], [1310, 262], [1318, 284], [1316, 298], [1307, 302], [1299, 294], [1300, 276], [1304, 256]];
  g.fillStyle = gv(0.98); g.beginPath(); smoothPath(g, drop, true); g.fill();
  ink(g, [[1304, 238], [1300, 262], [1298, 288], [1306, 302], [1316, 296], [1318, 282]], 2.4, LINE, { end: 0.2, bias: 0.7 });
  ink(g, [[1306, 244], [1312, 268]], 1.0, gv(0.4, 0.6), { end: 0.2 });
  paintCup3q(g);
}
// a sticking plaster from a to b: pale strip, dark keyline, perforation dots near the ends, a padded middle
function plaster(g, a, b, w, pad, seed) {
  const d = sub(b, a), L = V.len(d), ang = Math.atan2(d[1], d[0]);
  g.save(); g.translate(a[0], a[1]); g.rotate(ang);
  const body = (c) => c.roundRect(0, -w / 2, L, w, w / 2);
  g.fillStyle = gv(0.9); g.beginPath(); body(g); g.fill();
  clipTo(g, body, () => { g.fillStyle = gv(0.7, 0.5); g.fillRect(0, w * 0.15, L, w * 0.5); });
  if (pad) {
    const pr = (c) => c.roundRect(L * 0.3, -w * 0.42, L * 0.4, w * 0.84, 4);
    g.fillStyle = gv(0.94); g.beginPath(); pr(g); g.fill();
    g.strokeStyle = gv(0.25, 0.8); g.lineWidth = 1.4; g.beginPath(); pr(g); g.stroke();
    g.fillStyle = gv(0.25, 0.8);
    const r = rng(seed); for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(L * (0.34 + r() * 0.32), w * (-0.3 + r() * 0.6), 1.3, 0, TAU); g.fill(); }
  }
  g.fillStyle = LINE;
  for (const e of [0.08, 0.82]) for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(L * (e + (i % 3) * 0.035), w * (i < 3 ? -0.2 : 0.2), 1.5, 0, TAU); g.fill(); }
  g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); body(g); g.stroke();
  g.restore();
}
function pupil(g, e) {
  g.strokeStyle = gv(0.1); g.lineWidth = 2;
  g.beginPath(); g.ellipse(e.px, e.py, e.pr * (e.prx ?? 1), e.pr * (e.pry ?? 1), 0, 0, TAU); g.stroke();
  g.fillStyle = LINE; g.beginPath(); g.arc(e.px, e.py + 0.5, e.pr * 0.42, 0, TAU); g.fill();
}
// a big startled eye: white, a hand-inked rim fuller along the bottom, fine grey lashes outside it
function eye(g, e, seed) {
  g.fillStyle = gv(0.99); g.beginPath(); g.ellipse(e.x, e.y, e.rx, e.ry, e.rot, 0, TAU); g.fill();
  const wtop = e.wtop ?? 0;
  ring(g, e.x, e.y, e.rx, e.ry, e.rot, (a) => 4.6 + 2.2 * Math.pow(Math.max(0, Math.sin(a)), 1.2) + 1.2 * Math.max(0, -Math.cos(a)) + wtop * Math.pow(Math.max(0, -Math.sin(a)), 2), gv(0.08));
  const r = rng(seed), cr = Math.cos(e.rot), sr = Math.sin(e.rot);
  const at = (a, k) => { const x = Math.cos(a) * e.rx * k, y = Math.sin(a) * e.ry * k; return [e.x + x * cr - y * sr, e.y + x * sr + y * cr]; };
  for (const [a0, a1, n] of e.lash) {
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * r(), k = 1.08 + r() * 0.1, span = 0.25 + r() * 0.35;
      ink(g, [at(a, k), at(a + span * 0.5, k + 0.02), at(a + span, k)], 1.0 + r() * 0.8, gv(0.4, 0.55), { end: 0.1 });
    }
  }
  pupil(g, e);
}
function paintEyes3q(g) { eye(g, EYE_L, 341); eye(g, EYE_R, 342); }
function paintBeak3q(g) {
  // upper mandible: a hooked blade pointing down-left, its root hidden in the facial feathers
  const up = [[1004, 406], [1030, 400], [1056, 406], [1070, 424], [1076, 444], [1070, 458], [1048, 463], [1040, 478], [1032, 493, 1], [1018, 470], [1008, 448], [1002, 428]];
  const p = shp(up);
  g.fillStyle = gv(0.8); g.beginPath(); p(g); g.fill();
  clipTo(g, p, () => {
    g.filter = "blur(8px)"; g.fillStyle = gv(0.95, 0.95); g.beginPath(); g.ellipse(1020, 430, 14, 30, 0.2, 0, TAU); g.fill();
    g.fillStyle = gv(0.55, 0.8); g.beginPath(); g.ellipse(1064, 446, 14, 20, 0.3, 0, TAU); g.fill(); g.filter = "none";
  });
  // the gape: dark, a grey tongue; the pale lower mandible below it
  g.fillStyle = "#141414"; g.beginPath(); smoothPath(g, [[1046, 462], [1080, 461], [1117, 466], [1108, 480], [1084, 491], [1058, 497], [1045, 484]], true); g.fill();
  g.fillStyle = gv(0.45); g.beginPath(); smoothPath(g, [[1062, 487], [1090, 479], [1108, 472], [1096, 485], [1070, 493]], true); g.fill();
  const lo = [[1050, 497], [1080, 491], [1106, 481], [1118, 470], [1112, 487], [1094, 501], [1068, 508], [1050, 508, 1], [1046, 501]];
  g.fillStyle = gv(0.86); g.beginPath(); mixPath(g, lo, true); g.fill();
  ink(g, [[1004, 406], [1001, 428], [1006, 450], [1017, 472], [1032, 493]], 3.2, LINE, { end: 0.3, bias: 0.6 });
  ink(g, [[1032, 493], [1040, 478], [1046, 464]], 2.4, LINE, { end: 0.3 });
  ink(g, [[1043, 463], [1080, 460], [1119, 466]], 3.4, LINE, { end: 0.2, bias: 0.3 });
  ink(g, [[1119, 469], [1100, 490], [1076, 506], [1050, 509], [1046, 500]], 2.4, LINE, { end: 0.2 });
  ink(g, [[1050, 497], [1080, 491], [1108, 480]], 1.4, gv(0.25, 0.8), { end: 0.2 });
  // the facial feathers overlap the root of the beak
  const r = rng(391);
  for (let i = 0; i < 34; i++) { const x = 998 + r() * 84, y = 378 + r() * 14; flick(g, [x, y], nrm([0.25 * (r() - 0.5), 1]), 22 + r() * 16, 3.2, gv(0.97), 0.1); }
  for (let i = 0; i < 16; i++) { const x = 1000 + r() * 80, y = 384 + r() * 12; flick(g, [x, y], nrm([0.3 * (r() - 0.5), 1]), 16 + r() * 14, 1.2, gv(0.4, 0.6), 0.1); }
  g.fillStyle = LINE; g.beginPath(); g.ellipse(1040, 421, 3.5, 3, 0, 0, TAU); g.fill();
}
// the near headphone cup, seen from the side: ribbed dark cushion against the head, brushed shell, mesh plate,
// a pale yoke bar down the front and the mesh slider running up to the band
function halftonePat(g, pitch = 4, dark = 0.1, light = 0.82) {
  const c = document.createElement("canvas"); c.width = c.height = pitch * 2;
  const d = c.getContext("2d");
  d.fillStyle = gv(light); d.fillRect(0, 0, pitch * 2, pitch * 2);
  d.fillStyle = gv(dark);
  for (const [px, py] of [[pitch * 0.5, pitch * 0.5], [pitch * 1.5, pitch * 1.5]]) { d.beginPath(); d.arc(px, py, pitch * 0.34, 0, TAU); d.fill(); }
  return g.createPattern(c, "repeat");
}
// slider / band strip rising from the cup out of frame (drawn before the head: the right tuft overlaps it)
function paintSlider3q(g) {
  // the band itself: a thin pale strip coming down from above, behind the tuft
  const bd = sampleCurve([[1392, -8], [1428, 22], [1456, 50], [1470, 72]], 8);
  taper(g, bd, () => 16, LINE);
  taper(g, bd, () => 10, gv(0.72));
  // the slider block: a dark-edged mesh arm running down to the cup
  const blk = [[1452, 52], [1488, 58], [1516, 120], [1534, 196], [1500, 212], [1478, 150], [1460, 100]];
  g.fillStyle = LINE; g.beginPath(); smoothPath(g, blk, true); g.fill();
  const inner = blk.map(([x, y]) => [1490 + (x - 1490) * 0.86, 132 + (y - 132) * 0.9]);
  g.fillStyle = halftonePat(g, 3, 0.06, 0.45); g.beginPath(); smoothPath(g, inner, true); g.fill();
  ink(g, [[1470, 62], [1500, 110], [1520, 190]], 2, gv(0.85, 0.8), { end: 0.3 });
}
function paintCup3q(g) {
  const ROT = -0.12;
  // cushion: black leather, a comb of pale ribs along its outer edge
  const cx = 1426, cy = 290;
  g.fillStyle = "#0b0b0b"; g.beginPath(); g.ellipse(cx, cy, 48, 108, ROT, 0, TAU); g.fill();
  const r = rng(351);
  clipTo(g, (c) => c.ellipse(cx, cy, 48, 108, ROT, 0, TAU), () => {
    g.save(); g.translate(cx, cy); g.rotate(ROT);
    for (let i = -24; i <= 24; i++) { const t = i / 24, y = t * 102, h = Math.sqrt(1 - t * t) * 46; g.strokeStyle = gv(0.55 + 0.35 * r(), 0.85); g.lineWidth = 1.5 + r() * 1.1; g.beginPath(); g.moveTo(-h * 0.98, y); g.lineTo(-h * (0.45 + 0.3 * r()), y + 2); g.stroke(); }
    g.restore();
  });
  // shell: brushed metal in concentric rings, bright on its left, dark on its right
  const sx = 1488, sy = 292;
  const shell = (c) => c.ellipse(sx, sy, 60, 102, ROT, 0, TAU);
  g.fillStyle = gv(0.42); g.beginPath(); shell(g); g.fill();
  clipTo(g, shell, () => {
    g.filter = "blur(6px)";
    g.fillStyle = gv(0.9, 0.9); g.beginPath(); g.ellipse(sx - 36, sy - 12, 12, 84, ROT, 0, TAU); g.fill();
    g.fillStyle = gv(0.12, 0.85); g.beginPath(); g.ellipse(sx + 50, sy + 18, 18, 92, ROT, 0, TAU); g.fill();
    g.filter = "none";
    for (let k = 0; k < 7; k++) { const f = 0.62 + k * 0.055; g.strokeStyle = gv(k % 2 ? 0.92 : 0.15, 0.65); g.lineWidth = 1.6; g.beginPath(); g.ellipse(sx - 6 * (1 - f), sy, 60 * f, 102 * f, ROT, 0, TAU); g.stroke(); }
  });
  g.strokeStyle = LINE; g.lineWidth = 3; g.beginPath(); shell(g); g.stroke();
  // plate: dark rim, dark mesh face
  const pl = (c, k = 0) => c.ellipse(1512, 284, 37 + k, 70 + k, ROT, 0, TAU);
  g.fillStyle = "#0c0c0c"; g.beginPath(); pl(g, 6); g.fill();
  g.fillStyle = halftonePat(g, 3, 0.1, 0.55); g.beginPath(); pl(g); g.fill();
  clipTo(g, pl, () => { g.filter = "blur(10px)"; g.fillStyle = "rgba(0,0,0,0.5)"; g.beginPath(); g.ellipse(1532, 320, 28, 52, ROT, 0, TAU); g.fill(); g.fillStyle = "rgba(255,255,255,0.25)"; g.beginPath(); g.ellipse(1498, 250, 16, 34, ROT, 0, TAU); g.fill(); g.filter = "none"; });
  // yoke: pale bar hooking over the top of the cup and down its front
  const yk = [[1462, 138], [1462, 170], [1462, 210], [1466, 260], [1476, 306]];
  ink(g, yk, 22, LINE, { end: 0.8, pow: 0.3 });
  ink(g, yk, 14, gv(0.88), { end: 0.8, pow: 0.3 });
  ink(g, yk.map(([x, y]) => [x + 4, y]), 3, gv(0.5, 0.7), { end: 0.4 });
}

// ---- head, facing camera (pose D, measured at 36.20; the 36.48 in-between is the same drawing re-parameterised)
const HEADF = [
  [958, 440], [950, 380], [950, 320], [956, 262], [972, 210], [1000, 164], [1040, 126], [1100, 96], [1170, 82], [1240, 84], [1300, 96], [1322, 100],
  [1352, 78, 1], [1360, 104], [1420, 58, 1], [1418, 110], [1410, 150], [1424, 220], [1428, 300], [1420, 380], [1400, 440], [1360, 500], [1250, 548], [1120, 550], [1010, 510],
];
const FRONT_D = {
  hx: (x) => x, face: [0, 0], beak: [0, 0], band: [0, 0], bandage: [0, 0], tuft: [0, 0],
  eyes: [{ x: 1109, y: 342, rx: 65.5, ry: 68.5, rot: 0, px: 1107, py: 341, pr: 8, lash: [[1.8, 3.2, 6], [0.4, 1.4, 5]] }, { x: 1336, y: 319, rx: 56.5, ry: 64.5, rot: 0.05, px: 1348, py: 318, pr: 7, lash: [[1.6, 2.8, 6], [-0.8, 0.5, 5]] }],
  cupL: { x0: 900, x1: 958, y0: 222, y1: 452, out: 848, sy0: 172, sy1: 432 },
  cupR: { x0: 1424, x1: 1496, y0: 168, y1: 388, out: 1548, sy0: 150, sy1: 364 },
};
// 36.48: the face swings back toward the three-quarter view — features ~70 px left, the right eye opening up
const FRONT_E = {
  hx: (x) => 1424 + (x - 1424) * 1.105, face: [-70, 2], beak: [-72, 2], band: [-18, 6], bandage: [-46, -6], tuft: [-12, 0],
  eyes: [{ x: 1035, y: 343, rx: 63.5, ry: 69.5, rot: -0.19, px: 1044, py: 344, pr: 8, lash: [[1.8, 3.2, 6], [0.4, 1.4, 5]] }, { x: 1277, y: 325, rx: 66.5, ry: 71.5, rot: 0.4, px: 1270, py: 328, pr: 7.5, lash: [[1.6, 2.8, 6], [-0.8, 0.5, 5]] }],
  cupL: { x0: 872, x1: 918, y0: 236, y1: 440, out: 828, sy0: 200, sy1: 420 },
  cupR: { x0: 1404, x1: 1478, y0: 166, y1: 398, out: 1532, sy0: 150, sy1: 380 },
};
const off = (pts, [dx, dy]) => pts.map((p) => [p[0] + dx, p[1] + dy, p[2]]);
function paintHeadFront(g, F = FRONT_D) {
  // band arcs over the crown from cup to cup: black, a pale highlight along it, slider blocks near the ends
  const band = off([[902, 170], [926, 112], [990, 58], [1090, 18], [1180, 5], [1280, 12], [1368, 40], [1418, 70], [1462, 118], [1478, 150]], F.band);
  const bq = sampleCurve(band, 10);
  taper(g, bq, () => 24, LINE);
  taper(g, bq.map(([x, y]) => [x, y - 3]), () => 5, gv(0.78, 0.95));
  taper(g, bq.slice(0, 12).map(([x, y]) => [x + 3, y + 2]), () => 10, gv(0.6, 0.9));
  taper(g, bq.slice(bq.length - 12).map(([x, y]) => [x - 3, y + 2]), () => 10, gv(0.6, 0.9));
  const H = HEADF.map((p) => [F.hx(p[0]), p[1], p[2]]);
  const hp = shp(H);
  g.fillStyle = gv(0.975); g.beginPath(); hp(g); g.fill();
  clipTo(g, hp, () => {
    g.filter = "blur(24px)";
    g.fillStyle = gv(0.84, 0.5); g.beginPath(); g.ellipse(1190, 86, 260, 50, 0, 0, TAU); g.fill();
    g.fillStyle = gv(0.75, 0.5); g.beginPath(); g.ellipse(F.hx(962), 330, 26, 150, 0, 0, TAU); g.fill();
    g.fillStyle = gv(0.75, 0.5); g.beginPath(); g.ellipse(1422, 300, 26, 150, 0, 0, TAU); g.fill();
    g.filter = "none";
  });
  edgeFlicks(g, H, { step: 7, len: 22, w: 1.0, color: gv(0.38, 0.45), ang: 0.5, seed: 402 });
  fur(g, hp, [980, 100, 1400, 230], 60, -0.9, 40, 403, { w: 1.1, color: gv(0.4, 0.4), spread: 0.4 });
  // tuft
  const tf = off([[1320, 104], [1352, 78, 1], [1360, 104], [1420, 58, 1], [1414, 120]], F.tuft);
  for (let k = 0; k < 6; k++) { const b = add([1330 + k * 12, 140 - k * 3], F.tuft); flick(g, b, nrm(sub(k < 3 ? tf[1] : tf[3], b)), 55 + k * 4, 1.3, gv(0.35, 0.55), 0.04); }
  // facial disc: brows meeting in a V over the beak, cheek rims
  const fo = (pts) => off(pts, F.face);
  featherRow(g, fo([[990, 246], [1060, 208], [1140, 200], [1215, 222]]), { step: 3.2, len: 32, w: 1.7, color: gv(0.32, 0.75), ang: 0.5, seed: 411, gap: 0.1 });
  featherRow(g, fo([[1215, 222], [1280, 200], [1360, 204], [1420, 236]]), { step: 3.2, len: 32, w: 1.7, color: gv(0.32, 0.75), ang: -0.5 + Math.PI, seed: 412, gap: 0.1 });
  ink(g, fo([[985, 250], [1040, 214], [1120, 200], [1180, 206], [1215, 224], [1250, 206], [1320, 198], [1390, 212], [1425, 240]]), 1.6, gv(0.45, 0.6), { end: 0.1 });
  featherRow(g, fo([[985, 262], [966, 330], [980, 410], [1030, 470]]), { step: 4, len: 26, w: 1.3, color: gv(0.4, 0.6), ang: -0.5, seed: 416, gap: 0.2 });
  featherRow(g, fo([[1418, 250], [1426, 320], [1410, 400], [1370, 460]]), { step: 4, len: 26, w: 1.3, color: gv(0.4, 0.6), ang: 0.5 + Math.PI, seed: 417, gap: 0.2 });
  featherRow(g, fo([[1212, 236], [1218, 300], [1226, 370]]), { step: 3.5, len: 20, w: 1.0, color: gv(0.45, 0.45), ang: 2.7, seed: 413, gap: 0.25 });
  featherRow(g, fo([[1010, 420], [1080, 450], [1170, 448]]), { step: 4, len: 22, w: 1.1, color: gv(0.45, 0.45), ang: -2.5, seed: 414, gap: 0.25 });
  featherRow(g, fo([[1290, 420], [1350, 432], [1410, 410]]), { step: 4, len: 22, w: 1.1, color: gv(0.45, 0.45), ang: -2.5, seed: 415, gap: 0.25 });
  eye(g, F.eyes[0], 421); eye(g, F.eyes[1], 422);
  // beak: small, pale, hooked, the mouth open on its left
  const bo = (pts) => off(pts, F.beak);
  const up = bo([[1227, 397], [1245, 390], [1265, 404], [1276, 425], [1277, 448], [1270, 470], [1255, 492, 1], [1236, 470], [1224, 455], [1208, 452], [1215, 428]]);
  g.fillStyle = gv(0.9); g.beginPath(); mixPath(g, up, true); g.fill();
  clipTo(g, (c) => mixPath(c, up, true), () => { g.filter = "blur(6px)"; g.fillStyle = gv(0.62, 0.7); const q = bo([[1262, 460]])[0]; g.beginPath(); g.ellipse(q[0], q[1], 10, 22, 0, 0, TAU); g.fill(); g.filter = "none"; });
  g.fillStyle = "#161616"; g.beginPath(); smoothPath(g, bo([[1200, 462], [1225, 452], [1250, 480], [1254, 490], [1224, 482], [1202, 470]]), true); g.fill();
  g.fillStyle = gv(0.7); g.beginPath(); smoothPath(g, bo([[1206, 470], [1228, 476], [1252, 492], [1226, 488]]), true); g.fill();
  ink(g, bo([[1245, 390], [1265, 404], [1276, 425], [1277, 448], [1270, 470], [1255, 493]]), 3.0, LINE, { end: 0.3 });
  ink(g, bo([[1198, 463], [1225, 452], [1243, 470], [1254, 490]]), 3.4, LINE, { end: 0.2, bias: 0.4 });
  ink(g, bo([[1200, 470], [1220, 487], [1256, 494]]), 2.4, LINE, { end: 0.2 });
  ink(g, bo([[1227, 397], [1215, 428], [1208, 450]]), 1.3, gv(0.45, 0.6), { end: 0.2 });
  { const q = bo([[1236, 419]])[0]; g.fillStyle = LINE; g.beginPath(); g.arc(q[0], q[1], 3.5, 0, TAU); g.fill(); }
  { const q = add([1094, 134], F.bandage); drawBandage(g, { x: q[0], y: q[1], size: 150, rot: -0.47, cross: 0.95 }); }
  paintCupF(g, F.cupL, -1, 461);
  paintCupF(g, F.cupR, 1, 462);
}
// a cup seen from the front: the black leather cushion against the head (grey rib highlights) and the metal
// shell beyond it, a crescent with bright rim streaks
function paintCupF(g, c, side, seed) {
  const r = rng(seed);
  const xIn = side < 0 ? c.x0 : c.x1, xMid = side < 0 ? c.x0 + 6 : c.x1 - 6, ym = (c.sy0 + c.sy1) / 2;
  const shell = [[xMid, c.sy0], [(xMid + c.out) / 2, c.sy0 + 18], [c.out, ym - 30], [c.out, ym + 30], [(xMid + c.out) / 2, c.sy1 - 14], [xMid, c.sy1]];
  g.fillStyle = gv(0.14); g.beginPath(); smoothPath(g, shell, true); g.fill();
  clipTo(g, (q) => smoothPath(q, shell, true), () => {
    for (let k = 0; k < 3; k++) {
      const f = 0.3 + k * 0.25, pts = shell.slice(0, 6).map(([x, y]) => [xMid + (x - xMid) * f, ym + (y - ym) * (0.96 - k * 0.05)]);
      ink(g, pts, k === 1 ? 5 : 2.4, gv(k === 1 ? 0.92 : 0.6, 0.9), { end: 0.2 });
    }
  });
  g.strokeStyle = LINE; g.lineWidth = 3; g.beginPath(); smoothPath(g, shell, true); g.stroke();
  const cw = c.x1 - c.x0, rr = Math.min(26, cw * 0.45);
  const pad = (q) => q.roundRect(c.x0, c.y0, cw, c.y1 - c.y0, rr);
  g.fillStyle = "#0b0b0b"; g.beginPath(); pad(g); g.fill();
  clipTo(g, pad, () => {
    // ribs: short pale crescents stacked down the pad, a brighter crumpled patch in the middle
    const n = Math.round((c.y1 - c.y0) / 17);
    for (let i = 0; i < n; i++) {
      const y = c.y0 + 12 + i * 17, x = c.x0 + cw * (0.3 + 0.2 * r());
      ink(g, [[x - cw * 0.3, y + 3], [x, y - 3], [x + cw * 0.35, y + 2]], 2.5 + r() * 3, gv(0.55 + 0.35 * r(), 0.85), { end: 0.2 });
    }
    g.filter = "blur(3px)";
    for (let i = 0; i < 7; i++) { const y = c.y0 + (c.y1 - c.y0) * (0.3 + 0.07 * i); g.fillStyle = gv(0.7 + 0.25 * r(), 0.9); g.beginPath(); g.ellipse(c.x0 + cw * (0.45 + 0.12 * (r() - 0.5)), y, cw * 0.22, 6, 0, 0, TAU); g.fill(); }
    g.fillStyle = gv(0.9, 0.5); g.beginPath(); g.ellipse(c.x0 + cw * (side < 0 ? 0.25 : 0.75), (c.y0 + c.y1) / 2, cw * 0.06, (c.y1 - c.y0) * 0.3, 0, 0, TAU); g.fill();
    g.filter = "none";
  });
  g.strokeStyle = LINE; g.lineWidth = 3; g.beginPath(); pad(g); g.stroke();
  ink(g, [[xIn - side * 3, c.y0 + 20], [xIn - side * 5, (c.y0 + c.y1) / 2], [xIn - side * 3, c.y1 - 20]], 2.5, gv(0.5, 0.7), { end: 0.2 });
}

// ---------------------------------------------------------------- layers + transforms
const LAYERS = {
  nub: [800, 270, 925, 470, paintNub],
  raised: [770, 290, 1070, 610, paintRaised],
  tail: [1540, 580, 1840, 946, paintTail],
  body: [880, 350, 1700, 946, paintBody],
  wing: [1500, 225, 2110, 740, paintWing],
  feet: [1140, 800, 1620, 990, paintFeet],
  head: [860, -60, 1600, 560, paintHead3q],
  headF: [800, -20, 1600, 560, (g) => paintHeadFront(g, FRONT_D)],
  headE: [780, -20, 1600, 560, (g) => paintHeadFront(g, FRONT_E)],
};
let cache = null;
function layer(k) {
  if (!cache) cache = {};
  if (!cache[k]) {
    const [x0, y0, x1, y1, paint] = LAYERS[k];
    const c = document.createElement("canvas"); c.width = x1 - x0; c.height = y1 - y0;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.translate(-x0, -y0); setPPU(1); g.lineCap = "round"; g.lineJoin = "round";
    paint(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
    screentone(c, { pitch: 4.2 });
    // the source's ink is soft-edged (a slightly soft print): bake a fine blur into every layer
    const soft = document.createElement("canvas"); soft.width = c.width; soft.height = c.height;
    const sg = soft.getContext("2d"); sg.filter = "blur(0.75px)"; sg.drawImage(c, 0, 0); sg.filter = "none";
    cache[k] = { canvas: soft, x: x0, y: y0 };
  }
  return cache[k];
}
// transform of a layer: move the region centre (cx, cy) by (dx, dy), rotate by r degrees and scale by s about it
const CEN = { tail: [1715, 783], head: [1190, 270], headF: [1190, 270], headE: [1190, 270], wing: [1860, 485], body: [1250, 650], feet: [1400, 883], nub: [905, 455], raised: [905, 455] };
const T0 = { dx: 0, dy: 0, r: 0, s: 1 };
// every pose is measured directly against C (ORB similarity per region, 35.80 -> t): dx, dy of the region centre,
// rotation in degrees, scale
const A = { tail: { dx: -2.1, dy: -9.5, r: 1.26, s: 1.002 }, head: { dx: -1.0, dy: -32.8, r: 0.33, s: 1 }, wing: { dx: 0.6, dy: 26.9, r: 10.5, s: 1.0 }, body: { dx: 4.7, dy: -26.4, r: 0.83, s: 1.036 }, feet: { dx: -2.3, dy: -15.1, r: 0.66, s: 0.993 } };
const B = { tail: { dx: -2.3, dy: 1.0, r: 3.38, s: 0.984 }, head: { dx: 1.5, dy: -29.8, r: 0.49, s: 1 }, wing: { dx: 1.0, dy: -32, r: -2.0, s: 1.01 }, body: { dx: 5.7, dy: -22.1, r: 1.26, s: 1.037 }, feet: { dx: -2.4, dy: -10.3, r: 0.7, s: 0.994 }, nub: { dx: 49, dy: -52, r: -10.6, s: 1.06 } };
const SETTLE = {
  888: { tail: { dx: -1.4, dy: -0.9, r: 1.81, s: 0.999 }, head: { dx: 0.8, dy: -21.7, r: 0.33, s: 1 }, wing: { dx: -2.5, dy: -28, r: -1.53, s: 1.014 }, body: { dx: 4, dy: -15.3, r: 1.27, s: 1.027 }, feet: { dx: -1.5, dy: -7.1, r: 0.47, s: 0.995 }, nub: { dx: 35.8, dy: -38, r: -7.7, s: 1.044 } },
  889: { tail: { dx: -0.1, dy: -1.8, r: 0.68, s: 1.014 }, head: { dx: 0.3, dy: -12.5, r: 0.16, s: 1 }, wing: { dx: -1.5, dy: -11, r: -0.73, s: 1.009 }, body: { dx: 2, dy: -9.4, r: 0.47, s: 1.013 }, feet: { dx: -0.9, dy: -3.7, r: 0.32, s: 0.996 }, nub: { dx: 5, dy: -6, r: -1.2, s: 1.01 } },
};
// head drift inside each pose (measured, px / degrees)
const DRIFT_D = { 901: 0, 902: 0, 903: 1.3, 904: 1.5, 905: 0.6, 906: -0.1, 907: -2.4, 908: -2.4, 909: -7, 910: -7.1, 911: -3.8 };
const WING_D = { 901: [0.5, 3.8, 0.52], 902: [0.5, 3.8, 0.52], 903: [1.9, 6.9, 0.93], 904: [1.8, 7.1, 0.92], 905: [1.6, 7.3, 0.86], 906: [1.1, 5.6, 0.81], 907: [0.1, 3.1, 0.47], 908: [0.6, 3.5, 0.58], 909: [-3, -3.6, -0.27], 910: [-3.5, -3.6, -0.37], 911: [-1.8, -2.3, -0.23], 912: [-1.5, -1.9, -0.21] };
const END_HEAD = { 913: [4.8, 1.3], 914: [4.7, 2.0], 915: [3.8, 1.7], 916: [2.1, 1.4], 917: [2.0, 1.3], 918: [0.9, 0.9], 919: [0.4, 0.7], 920: [0.5, 0.6], 921: [0.6, 0.8], 922: [0.3, 0.4] };
const END_WING = { 913: [2.5, 3.8, 0.35], 914: [2.4, 3.9, 0.35], 915: [2.3, 3.9, 0.34], 916: [1.2, 2.4, 0.14], 917: [1.4, 2.4, 0.23], 918: [0.6, 0.9, 0.08], 919: [0.1, 0.2, -0.07], 920: [0.1, 0.3, 0.02], 921: [0.2, 0.3, 0.05], 922: [0.4, 0.5, 0.05] };

function state(fi) {
  const st = { head: "head", far: "nub", T: { tail: T0, head: T0, wing: T0, body: T0, feet: T0, nub: T0, raised: T0 } };
  if (fi <= 885) { st.far = "raised"; st.T = { ...st.T, ...A }; }
  else if (fi <= 887) st.T = { ...st.T, ...B };
  else if (fi <= 889) st.T = { ...st.T, ...SETTLE[fi] };
  else if (fi <= 898) { /* C */ }
  else if (fi <= 900) st.T = { ...st.T, head: { dx: -10.1, dy: 2.6, r: -1.13, s: 1 }, wing: { dx: -4.1, dy: -6.0, r: -0.74, s: 1.001 }, body: { dx: -3, dy: 0.9, r: -0.81, s: 0.998 }, tail: { dx: -0.5, dy: -2.6, r: -0.54, s: 1.003 } };
  else if (fi <= 912) {
    st.head = "headF";
    const w = WING_D[fi] || [0, 0, 0];
    st.T = { ...st.T, head: { dx: DRIFT_D[fi] ?? 0, dy: 0, r: 0, s: 1 }, wing: { dx: w[0], dy: w[1], r: w[2], s: 1 } };
    if (fi === 912) { st.head = "headE"; st.T.head = T0; }
  } else {
    const h = END_HEAD[fi] || [0, 0], w = END_WING[fi] || [0, 0, 0];
    st.T = { ...st.T, head: { dx: h[0], dy: h[1], r: 0, s: 1 }, wing: { dx: w[0], dy: w[1], r: w[2], s: 1 } };
  }
  return st;
}
function blit(ctx, key, T, cenKey = key) {
  const L = layer(key), c = CEN[cenKey];
  ctx.save();
  ctx.translate(c[0] + T.dx, c[1] + T.dy); ctx.rotate((T.r * Math.PI) / 180); ctx.scale(T.s, T.s); ctx.translate(-c[0], -c[1]);
  ctx.drawImage(L.canvas, L.x, L.y);
  ctx.restore();
}

export const shot = {
  draw(ctx, local, t) {
    const fi = Math.round(t * 25 + 1e-6);
    const st = state(fi);
    blit(ctx, st.far, st.far === "raised" ? T0 : st.T.nub);
    blit(ctx, "tail", st.T.tail);
    blit(ctx, "body", st.T.body);
    blit(ctx, "wing", st.T.wing);
    blit(ctx, "feet", st.T.feet);
    blit(ctx, st.head, st.T.head);
  },
  release() { cache = null; },
};
