// The owl on the end card, in frame pixels (traced on the source at 138.0 s): a plump white owl in red headphones,
// a bandage on its crown, perched on the full stop with its left toes curled over the "t".
// Timeline (film time, read off the source frame by frame at 25 fps):
//   the lids come down 136.48-136.68 (sleepy, then slits), shut 136.72-136.92 (a curved lash line on a pale lid),
//   reopen 136.96-137.08, open with worried eyes from 137.12; 139.10-139.17 the bandage becomes a tan mark, 139.15-139.25
//   the face turns smug (heavy grey lids, the disc's top arcs pull down into brows, a diamond beak with a smirk), and the
//   head tilts ~3 deg to screen-left 139.07-139.48.
// Colours are pre-grade (post.js adds halation, the S-curve and the vignette); they were inverse-graded from the source.
import { clamp, lerp, smooth, span, rng } from "../../lib/rng.js";

const LINE = "#5a2018", EYE_LINE = "#5a1c1c", CREAM = "#f4e1c3", LID = "#d6c4b0", SHADOW = "#d0bca7";
const DISC = "rgba(108,98,88,0.85)";
const IRIS_TOP = "#2a1026", IRIS_BOT = "#6c2426", RING = "#dc8a6c", HL = "#fbf5ec";
const BEAK = "#df7c2c", BEAK_LT = "#ee9c3c", BEAK_SH = "#b85a28";
const CUP = "#cf3d26", CUP_CAP = "#d9542f", CUP_LINE = "#6a1a1c", CUP_HI = "#ee943e";
const TOE = "#eea052", CLAW = "#caa39b";
const FLICK = "rgba(116,102,90,0.5)";
const BAND = "#5a1c26";

// ---------- helpers ----------
// Catmull-Rom through pts; a point [x, y, 1] is a sharp corner.
function path(g, pts, close = true) {
  const n = pts.length, P = (i) => (close ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  g.moveTo(pts[0][0], pts[0][1]);
  const last = close ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), s = 1 / 6;
    const c1 = p1[2] ? [p1[0] + (p2[0] - p1[0]) / 3, p1[1] + (p2[1] - p1[1]) / 3] : [p1[0] + (p2[0] - p0[0]) * s, p1[1] + (p2[1] - p0[1]) * s];
    const c2 = p2[2] ? [p2[0] - (p2[0] - p1[0]) / 3, p2[1] - (p2[1] - p1[1]) / 3] : [p2[0] - (p3[0] - p1[0]) * s, p2[1] - (p3[1] - p1[1]) * s];
    g.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
  }
  if (close) g.closePath();
}
function shape(g, pts, fill, lw = 0, stroke = LINE) {
  g.beginPath(); path(g, pts);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.lineJoin = "round"; g.stroke(); }
}
function line(g, pts, lw, col = LINE) {
  g.beginPath(); path(g, pts, false); g.lineWidth = lw; g.strokeStyle = col; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
}
// sample an open Catmull-Rom curve
function sample(pts, per = 8) {
  const n = pts.length, P = (i) => pts[Math.max(0, Math.min(n - 1, i))], out = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[n - 1]);
  return out;
}
// a stroke whose width follows wf(u), u = 0..1 along it (brush strokes: brows, lashes, flicks)
function taper(g, pts, wf, col) {
  const s = sample(pts, 8), n = s.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = wf(i / (n - 1)) / 2;
    L.push([s[i][0] - dy * w, s[i][1] + dx * w]); R.push([s[i][0] + dy * w, s[i][1] - dx * w]);
  }
  g.beginPath();
  L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath(); g.fillStyle = col; g.fill();
}
// resample a polyline to n points evenly by arc length (for morphing between two strokes)
function resample(pts, n) {
  const s = sample(pts, 6), cum = [0];
  for (let i = 1; i < s.length; i++) cum.push(cum[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
  const out = [], T = cum[cum.length - 1];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const d = (T * k) / (n - 1);
    while (j < s.length - 2 && cum[j + 1] < d) j++;
    const u = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push([lerp(s[j][0], s[j + 1][0], u), lerp(s[j][1], s[j + 1][1], u)]);
  }
  return out;
}
const mixPts = (a, b, t) => a.map(([x, y], i) => [lerp(x, b[i][0], t), lerp(y, b[i][1], t)]);

// ---------- body (never moves) ----------
// silhouette from under the left cup, round the bottom, up to under the right cup (the neck is hidden by the head)
const BODY = [[1524, 330], [1515, 340], [1512.6, 350], [1512, 360], [1513, 371], [1517.5, 381], [1522, 392.5], [1527.5, 400],
  [1535, 406.5], [1546, 413.5], [1560, 419.5], [1575, 423.6], [1590, 425.6], [1605, 425.6], [1620, 424.6], [1631, 421.6],
  [1639, 418], [1645.5, 414], [1651, 409], [1656, 402.5], [1660.5, 395.5], [1663, 387.5], [1664.5, 377.5], [1664, 367.5],
  [1661.5, 357.5], [1658, 347.5], [1653, 338], [1650, 320], [1600, 300], [1536, 312]];
const BODY_OUT = 27; // the first 27 points are the visible outline
const WING_L = [[1515, 340], [1512.6, 350], [1512, 360], [1513, 371], [1517.5, 381], [1522, 392.5], [1527.5, 400],
  [1525, 394], [1523, 387.5], [1522.8, 377.5], [1524, 367.5], [1527, 359], [1530.5, 350], [1533, 342]];
const WING_R = [[1653, 338], [1658, 347.5], [1661.5, 357.5], [1664, 367.5], [1664.5, 377.5], [1663, 387.5], [1660.5, 395.5],
  [1656, 402.5], [1651, 409], [1645.5, 414], [1639, 418], [1634, 420.5], [1638, 415], [1642, 408.5], [1644.3, 400],
  [1645, 390], [1645.3, 379], [1645, 366], [1646, 352]];
// short fur strokes on the chest, traced
const FLICKS = [
  [[1545.5, 352], [1544.2, 356], [1546.3, 360.5]], [[1559, 363], [1560, 368], [1563, 371.5]], [[1572.5, 376], [1576, 381], [1579.8, 385]],
  [[1593.5, 386.7], [1598, 382.5], [1602, 381.5], [1606.7, 378.3]], [[1627.3, 364], [1626, 369], [1623.3, 373]], [[1629, 391], [1627.3, 394.5], [1626.2, 397]],
  [[1537.5, 381], [1542.5, 390], [1547.5, 397.5]],
];
function body(g) {
  g.beginPath(); path(g, BODY); g.fillStyle = CREAM; g.fill();
  g.save();
  g.beginPath(); path(g, BODY); g.clip();
  // soft grey form shade along the bottom of the belly
  const gr = g.createLinearGradient(0, 400, 0, 425);
  gr.addColorStop(0, "rgba(176,160,148,0)"); gr.addColorStop(0.45, "rgba(176,160,148,0.12)"); gr.addColorStop(0.75, "rgba(176,160,148,0.45)"); gr.addColorStop(1, "rgba(176,160,148,0.95)");
  g.fillStyle = gr; g.fillRect(1500, 400, 180, 30);
  // form shade on the body just inside each wing
  const fl = g.createLinearGradient(1521, 0, 1547, 0); fl.addColorStop(0, "rgba(170,152,140,0.5)"); fl.addColorStop(1, "rgba(170,152,140,0)");
  g.fillStyle = fl; g.fillRect(1515, 345, 34, 70);
  const fr = g.createLinearGradient(1647, 0, 1627, 0); fr.addColorStop(0, "rgba(170,152,140,0.2)"); fr.addColorStop(1, "rgba(170,152,140,0)");
  g.fillStyle = fr; g.fillRect(1625, 350, 25, 72);
  // folded wings down each side: grey-cream, darker toward the outer edge, feathered with a few long soft streaks
  g.save(); g.beginPath(); path(g, WING_L); g.clip();
  const wl = g.createLinearGradient(1512, 0, 1531, 0);
  wl.addColorStop(0, "#ad998e"); wl.addColorStop(0.6, "#bba99d"); wl.addColorStop(1, "#cdbcad");
  g.fillStyle = wl; g.fillRect(1500, 330, 40, 80);
  const wlv = g.createLinearGradient(0, 370, 0, 402); wlv.addColorStop(0, "rgba(120,100,96,0)"); wlv.addColorStop(1, "rgba(120,100,96,0.45)");
  g.fillStyle = wlv; g.fillRect(1500, 370, 40, 40);
  g.restore();
  g.save(); g.beginPath(); path(g, WING_R); g.clip();
  const wg = g.createLinearGradient(1666, 0, 1644, 0);
  wg.addColorStop(0, "#b3a194"); wg.addColorStop(0.55, "#c1b0a3"); wg.addColorStop(1, "#cfbeae");
  g.fillStyle = wg; g.fillRect(1640, 330, 30, 95);
  const wrv = g.createLinearGradient(0, 380, 0, 418); wrv.addColorStop(0, "rgba(120,100,96,0)"); wrv.addColorStop(1, "rgba(120,100,96,0.5)");
  g.fillStyle = wrv; g.fillRect(1636, 380, 34, 42);
  g.restore();
  for (const [pts, w, a] of [
    [[[1519, 345], [1516.5, 360], [1516.8, 375], [1519.5, 388]], 1.6, 0.34],
    [[[1526, 352], [1521.6, 364], [1520.6, 378]], 1.2, 0.3],
    [[[1655, 350], [1658.5, 362], [1659.5, 378], [1657.5, 392]], 1.6, 0.36],
    [[[1652, 366], [1653.2, 380], [1652.8, 394], [1650, 404]], 1.2, 0.3],
  ]) line(g, pts, w, `rgba(112,96,86,${a})`);
  g.restore();
  // wing front edges: thin darker lines
  line(g, [[1533, 342], [1530.5, 350], [1527, 359], [1524, 367.5], [1522.8, 377.5], [1523, 387.5], [1525, 394], [1527.5, 400]], 1.3, "rgba(104,80,70,0.62)");
  line(g, [[1645.5, 364], [1645.3, 379], [1645, 390], [1644.3, 400], [1642, 408.5], [1638, 415], [1633, 419.8]], 1.6, "rgba(92,58,48,0.8)");
  for (const f of FLICKS) taper(g, f, (u) => 0.5 + 1.1 * Math.sin(Math.PI * Math.min(1, u * 1.1)), FLICK);
  // outline: only round the visible edge
  g.beginPath(); path(g, BODY.slice(0, BODY_OUT), false);
  g.lineWidth = 2.1; g.strokeStyle = LINE; g.lineJoin = "round"; g.lineCap = "round"; g.stroke();
}

// ---------- feet ----------
function feet(g) {
  // left foot: three toe knuckles curled over the t's shoulder, dark claws hooking down behind it
  for (const [x, y, a, cw, cx2] of [[1534, 405.5, 0.5, 6, 0], [1542.2, 410.2, 0.55, 8, 3], [1551.8, 417, 0.7, 9, 5]]) {
    // a dark hooked claw under each toe (they hide the t's edge below the foot), with a pale glint
    taper(g, [[x - 0.5, y + 2], [x + 1.5 + cx2 * 0.5, y + 8], [x + 1 + cx2, y + 13], [x - 0.5 + cx2, y + 16.5]], (u) => cw * (1 - u) + 0.6, "#461420");
    line(g, [[x + 0.8, y + 6], [x + 1.4, y + 10], [x + 0.6, y + 13]], 1.1, "rgba(226,170,176,0.6)");
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.ellipse(0, 0, 5.2, 4.6, 0, 0, Math.PI * 2);
    g.fillStyle = "#e89250"; g.fill(); g.lineWidth = 1.3; g.strokeStyle = LINE; g.stroke();
    g.beginPath(); g.ellipse(0.6, -1.2, 2.2, 1.3, 0, 0, Math.PI * 2); g.fillStyle = "rgba(250,196,120,0.7)"; g.fill();
    g.restore();
  }
  // right foot: three toes hanging over the full stop: orange at the top, darker toward the claw, a dark keyline
  for (const [x, top, len] of [[1596, 424.5, 16.5], [1609.5, 424.5, 17], [1619.5, 424.5, 16]]) {
    const pts = [[x - 4.4, top + 5], [x - 3.2, top + 0.8], [x + 0.5, top - 0.6], [x + 3.9, top + 1.4], [x + 4.5, top + 6], [x + 3.2, top + len * 0.72], [x - 0.8, top + len, 1], [x - 4.2, top + len * 0.7]];
    g.save();
    g.beginPath(); path(g, pts);
    const tg = g.createLinearGradient(0, top, 0, top + len);
    tg.addColorStop(0, "#d27a46"); tg.addColorStop(0.35, "#c86c40"); tg.addColorStop(0.58, "#a24634"); tg.addColorStop(1, "#6a2424");
    g.fillStyle = tg; g.fill(); g.lineWidth = 1.5; g.strokeStyle = LINE; g.lineJoin = "round"; g.stroke();
    g.clip();
    g.beginPath(); g.moveTo(x - 1.5, top + len * 0.55); g.quadraticCurveTo(x - 0.6, top + len * 0.78, x - 1.2, top + len - 1.5); g.lineWidth = 1.2; g.strokeStyle = "rgba(240,196,186,0.7)"; g.stroke();
    g.beginPath(); g.ellipse(x + 0.6, top + 3.5, 2.2, 1.9, 0, 0, Math.PI * 2); g.fillStyle = "rgba(252,196,120,0.6)"; g.fill();
    g.restore();
  }
}

// ---------- head group (tilts when smug) ----------
// top and sides of the head; the ear tuft on the right is two feather points
const HEAD = [[1537, 334], [1533, 318], [1532.5, 300], [1534, 283], [1537.5, 270], [1542, 261.5], [1550, 254.8], [1559, 249],
  [1568, 245.7], [1580, 244], [1595, 244.4], [1606, 246.4], [1616, 249.6], [1626, 253.6], [1635, 257.3], [1641, 257.8, 1],
  [1650.5, 252.6], [1660, 247.6, 1], [1656, 257], [1651.5, 261.8, 1], [1658, 264.6, 1], [1650.5, 270], [1654.5, 281],
  [1656.5, 300], [1656.5, 320], [1654, 336], [1630, 347], [1592, 351], [1556, 347]];
const HEAD_OUT = [4, 26]; // dark-outlined span (top and right side; the right cup covers most of that side)

function headphones(g, back) {
  if (back === true) {
    // band: dark outer rail, red inner rail, light slider segments down each side
    g.lineCap = "butt";
    g.beginPath(); g.ellipse(1596, 287, 82, 84, 0, Math.PI * 1.06, Math.PI * 1.975); g.lineWidth = 7; g.strokeStyle = BAND; g.stroke();
    g.beginPath(); g.ellipse(1596, 287, 80.5, 82.5, 0, Math.PI * 1.07, Math.PI * 1.965); g.lineWidth = 2.6; g.strokeStyle = "#a8413a"; g.stroke();
    g.fillStyle = "#e9cbb8";
    for (const s of [-1, 1]) for (let k = 0; k < 5; k++) {
      const a = Math.PI * 1.5 + s * (0.86 + k * 0.075);
      const x = 1596 + Math.cos(a) * 82, y = 287 + Math.sin(a) * 84;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2); g.fillRect(-2.2, -1.3, 4.4, 2.6); g.restore();
    }
    return;
  }
  // each cup seen from the side: a tall cushion against the head, then the shell, then the outer cap, stepping out and
  // down in size; bright red with dark keylines and a lit stripe on the shell (traced at 138.0)
  const part = (pts, fill, lw = 1.9) => { g.beginPath(); path(g, pts); g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = CUP_LINE; g.lineJoin = "round"; g.stroke(); };
  if (back === "left") {
  // left cup (the head's edge overlaps its cushion: drawn before the head)
  part([[1506.5, 272], [1511, 271], [1511.5, 290], [1511, 309], [1505.5, 310.5], [1502, 303], [1501.6, 290], [1503, 279]], CUP_CAP);
  part([[1512.5, 269.5], [1520.5, 268.5], [1520.5, 300], [1520.5, 326], [1513.5, 326], [1510.8, 318], [1510.5, 296], [1511, 276]], CUP);
  g.save(); g.beginPath(); path(g, [[1512.4, 273], [1514.6, 273], [1514.4, 286], [1513.8, 300], [1512.2, 300], [1512, 286]]); g.fillStyle = CUP_HI; g.fill(); g.restore();
  line(g, [[1515.8, 272], [1515.6, 298], [1516, 324]], 1.1, "rgba(106,26,28,0.7)");
  line(g, [[1518.2, 270], [1518, 298], [1518.4, 325]], 1.1, "rgba(106,26,28,0.6)");
  part([[1522, 262], [1538.5, 261.3], [1537, 280], [1533.5, 300], [1532.8, 318], [1534.5, 331], [1524, 332], [1520, 325], [1519.5, 295], [1520, 270]], CUP, 2);
  g.save(); g.beginPath(); path(g, [[1522, 262], [1538.5, 261.3], [1537, 280], [1533.5, 300], [1532.8, 318], [1534.5, 331], [1524, 332], [1520, 325], [1519.5, 295], [1520, 270]]); g.clip();
  const cg = g.createLinearGradient(0, 262, 0, 332); cg.addColorStop(0, "rgba(120,30,34,0)"); cg.addColorStop(0.45, "rgba(120,30,34,0.25)"); cg.addColorStop(1, "rgba(110,40,44,0.55)");
  g.fillStyle = cg; g.fillRect(1515, 258, 30, 80); g.restore();
  line(g, [[1525.5, 267], [1525, 300], [1526, 327]], 1.2, "rgba(120,24,20,0.55)");
  line(g, [[1507.8, 274], [1507.2, 291], [1507.8, 307]], 1.0, "rgba(106,26,28,0.55)");
  // the cushion is in shadow toward the head
  g.save(); g.beginPath(); path(g, [[1522, 262], [1538.5, 261.3], [1537, 280], [1533.5, 300], [1532.8, 318], [1534.5, 331], [1524, 332], [1520, 325], [1519.5, 295], [1520, 270]]); g.clip();
  const sg = g.createLinearGradient(1521, 0, 1535, 0); sg.addColorStop(0, "rgba(90,20,26,0)"); sg.addColorStop(1, "rgba(90,20,26,0.4)");
  g.fillStyle = sg; g.fillRect(1515, 258, 30, 80); g.restore();
  return;
  }
  // right cup
  part([[1681, 289], [1685, 293], [1686.5, 306], [1685.5, 319], [1681, 325.5], [1679.5, 306]], CUP_CAP);
  part([[1671, 281], [1677.5, 281.5], [1680.8, 290], [1681.3, 307], [1680.5, 325], [1677, 333.5], [1670.5, 334], [1669.5, 306]], CUP);
  line(g, [[1675.5, 285], [1676.5, 307], [1675.5, 329]], 2.2, "rgba(236,120,64,0.55)");
  part([[1658.5, 275.5], [1666.5, 273.5], [1670.8, 277], [1671.8, 306], [1671, 336], [1667, 341.5], [1658, 341], [1655.5, 336], [1656.8, 320], [1657.2, 300], [1657, 285]], CUP, 2);
  line(g, [[1663, 279], [1664, 307], [1663, 336]], 1.3, "rgba(120,24,20,0.45)");
}

// ---------- eyes ----------
// Normal eyes (138.0): outline ellipses, the dark plum iris set toward the beak inside a salmon ring that is thin at the top
// and thicker at the bottom and outer side, a big and a small highlight. Smug eyes (139.8): wider, lower, a double ring.
const EYES = {
  n: [
    { cx: 1564.5, cy: 305.3, rx: 14.6, ry: 15.3, ix: 1.0, iy: -0.8, irx: 11, iry: 12, hl: [[-2.8, -5.3, 3.6, 3.6, 0], [6.5, 5, 2.2, 2.2, 0]] },
    { cx: 1620.0, cy: 311.5, rx: 15.0, ry: 15.5, ix: -1.5, iy: -0.5, irx: 11, iry: 11.6, hl: [[-4.5, -5.7, 3.8, 3.8, 0], [5, 6.5, 2.2, 2.2, 0]] },
  ],
  s: [
    { cx: 1555.5, cy: 307, rx: 16.5, ry: 16.3, ix: 1.0, iy: -0.5, irx: 10.6, iry: 9.8, hl: [[-5.5, -0.5, 4.0, 2.3, -0.25]] },
    { cx: 1612.6, cy: 307.6, rx: 17, ry: 16.6, ix: 1.3, iy: 0, irx: 12.3, iry: 10.5, hl: [[-5.6, 1.5, 4.0, 1.8, -0.08]] },
  ],
};
// smug upper lids (frame px): lash line and the grey shadow above it
const SMUG_LID = [
  { lash: [[1536, 300.5], [1546, 300], [1555, 301], [1564, 304], [1571, 307.4], [1572.8, 308.8]], sh: [1554.5, 302, 18, 17.5] },
  { lash: [[1595, 308.8], [1600, 305.6], [1606.7, 303.3], [1620.4, 302.4], [1632.2, 302.8], [1634.5, 302.4]], sh: [1613.5, 304, 18.5, 16.5] },
];
// blink lids, per source frame: the lid line's y at dx = -12, 0, +12 from each eye's centre (measured column by column)
const BLINK = [
  [136.44, null, null],
  [136.48, [300, 300, 305], [311, 310, 311]],
  [136.52, [301, 301, 305], [312, 310.5, 312]],
  [136.56, [301, 301, 305], [312, 310.5, 312]],
  [136.60, [304, 306, 309], [314, 314, 315]],
  [136.64, [308, 311, 313], [318, 319, 320]],
  [136.68, [308, 311, 313], [318, 319, 320]],
  [136.72, [312, 317, 316.5], [321, 324, 321]],
  [136.84, [312, 316.5, 316], [321, 323.5, 321]],
  [136.88, [311, 315.5, 316], [320, 323, 320]],
  [136.92, [310, 315, 315], [319, 322, 319]],
  [136.96, [303, 306, 310], [311, 311, 314]],
  [137.00, [303, 306, 309], [311, 311, 313]],
  [137.04, [298, 299, 304], [305, 304, 308]],
  [137.08, [296, 295, 302], [304, 302, 306]],
  [137.12, null, null],
];
function blinkAt(t, k) {
  if (t <= BLINK[0][0] || t >= BLINK[BLINK.length - 1][0]) return null;
  let i = 1; while (BLINK[i][0] < t) i++;
  const [ta, A] = [BLINK[i - 1][0], BLINK[i - 1][1 + k]], [tb, B] = [BLINK[i][0], BLINK[i][1 + k]];
  const u = (t - ta) / (tb - ta);
  const e = EYES.n[k], open = [e.cy - e.ry * 0.62 - 1, e.cy - e.ry - 1.5, e.cy - e.ry * 0.62 - 1];
  const a = A ?? open, b = B ?? open;
  return a.map((v, j) => lerp(v, b[j], u));
}
const lerpEye = (a, b, s) => {
  const o = {};
  for (const k of ["cx", "cy", "rx", "ry", "ix", "iy", "irx", "iry"]) o[k] = lerp(a[k], b[k], s);
  return o;
};

// one eye. E: geometry; lid: lid line y at dx = -12, 0, +12 (or null); smug: 0..1; outer: -1 (left eye) / +1 (right eye)
function eye(g, E, lid, smug, outer, hls, lidCol, lash) {
  const { cx, cy, rx, ry } = E;
  g.save();
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.clip();
  // the salmon ring; lighter and pinker in the smug eyes
  g.fillStyle = RING; g.fillRect(cx - rx - 2, cy - ry - 2, 2 * rx + 4, 2 * ry + 4);
  if (smug > 0.01) { g.globalAlpha = smug; g.fillStyle = "#f3b39e"; g.fillRect(cx - rx - 2, cy - ry - 2, 2 * rx + 4, 2 * ry + 4); g.globalAlpha = 1; }
  const icx = cx + E.ix, icy = cy + E.iy;
  if (smug > 0.01) {
    // smug: a second, thinner ring inside the salmon one
    g.globalAlpha = smug;
    g.beginPath(); g.ellipse(icx, icy, E.irx + 2.2, E.iry + 2.2, 0, 0, Math.PI * 2); g.lineWidth = 1.1; g.strokeStyle = "#7a2a26"; g.stroke();
    g.globalAlpha = 1;
  }
  const ig = g.createLinearGradient(0, icy - E.iry, 0, icy + E.iry);
  ig.addColorStop(0, IRIS_TOP); ig.addColorStop(0.55, "#33122a"); ig.addColorStop(1, IRIS_BOT);
  g.beginPath(); g.ellipse(icx, icy, E.irx, E.iry, 0, 0, Math.PI * 2); g.fillStyle = ig; g.fill();
  for (const [dx, dy, hx, hy, rot, a] of hls) {
    g.globalAlpha = a ?? 1;
    g.beginPath(); g.ellipse(cx + dx, cy + dy, hx, hy, rot, 0, Math.PI * 2); g.fillStyle = HL; g.fill();
  }
  g.globalAlpha = 1;
  g.restore();
  g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.lineWidth = 1.5; g.strokeStyle = EYE_LINE; g.stroke();
  // the dark top of the ring reads heavier than the bottom
  g.beginPath(); g.ellipse(cx, cy, rx + 0.4, ry + 0.4, 0, Math.PI * 1.12, Math.PI * 1.88); g.lineWidth = 0.8; g.stroke();
  // open eyes: a heavier upper lash line over the outer top of each ring (it thins out toward the inner side)
  if (smug < 0.99 && (!lid || lid[1] < cy - ry * 0.55)) {
    const [a0, a1, pk] = outer < 0 ? [2.9, 5.2, 3.75] : [4.25, 6.5, 5.5];
    const pts = [];
    for (let k = 0; k <= 16; k++) { const t = a0 + ((a1 - a0) * k) / 16; pts.push([cx + Math.cos(t) * (rx + 0.2), cy + Math.sin(t) * (ry + 0.2)]); }
    g.save(); g.globalAlpha = 1 - smug;
    taper(g, pts, (u) => { const t = a0 + (a1 - a0) * u; return 0.9 + 1.7 * Math.max(0, 1 - Math.abs(t - pk) / 1.1); }, EYE_LINE);
    g.restore();
  }
  if (!lid && !lash) return;
  // upper lid: everything above the lid line is pale lid (it hides the ring), with a dark lash line along its edge
  const pts = lash ?? (() => {
    // quadratic through the three measured heights, extended a little past the outer side
    const [a, b, c] = lid, q = (dx) => b + ((c - a) / 24) * dx + ((a + c - 2 * b) / 288) * dx * dx;
    const out = [];
    for (let dx = -rx - (outer < 0 ? 2.5 : 0); dx <= rx + (outer > 0 ? 2.5 : 0) + 0.01; dx += 2) out.push([cx + dx, q(dx)]);
    return out;
  })();
  // shut: the lash has reached the bottom of the eye, and the lid covers all of it (no ring below the lash)
  const shut = !lash && lid && lid[1] > cy + ry * 0.6;
  g.save();
  g.beginPath(); g.ellipse(cx, cy, rx + 1.4, ry + 1.4, 0, 0, Math.PI * 2); g.clip();
  if (shut) { g.fillStyle = lidCol; g.fillRect(cx - rx - 4, cy - ry - 4, 2 * rx + 8, 2 * ry + 8); }
  g.beginPath(); g.moveTo(cx - rx - 4, cy - ry - 4); g.lineTo(cx - rx - 4, pts[0][1]);
  for (const [x, y] of pts) g.lineTo(x, y);
  g.lineTo(cx + rx + 4, pts[pts.length - 1][1]); g.lineTo(cx + rx + 4, cy - ry - 4); g.closePath();
  g.fillStyle = lidCol; g.fill();
  g.restore();
  // lash: only where the lid edge is over the eye (plus the little outer overhang)
  const inside = pts.filter(([x, y]) => {
    const u = (x - cx) / (rx + 3), v = (y - cy) / (ry + 1.5);
    return u * u + v * v <= 1 || (Math.sign(x - cx) === outer && Math.abs(x - cx) <= rx + 3.5 && Math.abs(y - cy) < ry * 0.8);
  });
  if (inside.length > 1) {
    const w = lash ? 2.9 : 2.5;
    taper(g, inside, (u) => { const o = outer < 0 ? u : 1 - u; return w * (0.55 + 0.45 * Math.min(1, o * 3)) * (0.7 + 0.3 * Math.min(1, (1 - o) * 4)); }, EYE_LINE);
  }
}

// facial disc (grey): two arcs over the eyes meeting in a V above the beak, then down the sides to the beak
const DISC_TOP_L = [[1535.5, 293], [1538.5, 283.5], [1545, 276.5], [1555, 271.3], [1568, 271], [1579, 274.3], [1588.5, 281], [1595, 289]];
const DISC_TOP_R = [[1595, 289], [1599.5, 283], [1609, 278], [1623.5, 277], [1636, 280.3], [1645.5, 287], [1650, 297.5]];
const DISC_SIDE_L = [[1535.5, 293], [1533.7, 307], [1535.7, 320], [1541, 328.8], [1549.5, 335.6], [1563, 340.5], [1577, 341]];
const DISC_SIDE_R = [[1650, 297.5], [1650.6, 311], [1649, 325.7], [1645, 337], [1633, 344.5], [1614, 346], [1600, 343]];
// smug brows (frame px at 139.8): the top arcs pulled down at the inner ends into heavy brows -- a warm grey band
// with a dark lower edge; BROW_*_TOP is the band's upper edge
const BROW_L = [[1529.4, 285.1], [1535.3, 281.9], [1541.6, 279.6], [1550.7, 279.2], [1558.9, 280.5], [1566.2, 283.3], [1573.5, 287.4], [1580.7, 292.4]];
const BROW_R = [[1587.6, 288.7], [1591.5, 281.3], [1596, 276], [1606.7, 275.1], [1615.8, 275.1], [1624.9, 276.5], [1631.3, 279.2], [1636.7, 284.2], [1640.4, 289.6]];
const BROW_L_TOP = [[1531, 284.2], [1538, 279.2], [1546, 276.3], [1555, 275.8], [1564, 277.5], [1572, 282], [1579.5, 290.8]];
const BROW_R_TOP = [[1587.4, 288.4], [1589.6, 280], [1594.6, 273.6], [1605, 271.2], [1616, 271], [1626, 273], [1632.4, 276.8], [1636.4, 283.6]];
const SMUG_SIDE_L = [[1529.4, 285.1], [1529.5, 297], [1531, 312], [1536, 325], [1545, 333.5], [1557, 338.5]];
const SMUG_SIDE_R = [[1640.4, 289.6], [1643.8, 300], [1644.6, 314], [1641.5, 328], [1632, 338.5], [1612, 342.5]];

// beaks: the calm one is a small shield pointing down; the smug one a rounded diamond with the smirk through it
const BEAK_N = [[1582, 323.8], [1588.6, 321.2], [1596.2, 323.2], [1598.2, 329.5], [1594.5, 336.5], [1588.3, 346.6, 1], [1583.2, 337], [1580.5, 329.5]];
const BEAK_S = [[1582.5, 319.3], [1589.6, 324.3], [1593.4, 332, 1], [1589.3, 337.4], [1582.6, 341.5], [1576, 337.4], [1572.4, 332, 1], [1576, 324.3]];
const MOUTH_S = [[1572.4, 332], [1577.5, 334.2], [1583, 334.8], [1588.5, 334.2], [1593.4, 332]];
const SMIRK_L = [[1556.5, 327.4], [1560, 329.2], [1565, 330.4], [1572.4, 332]];
const SMIRK_R = [[1593.4, 332], [1597.5, 331.6], [1601.2, 330.4], [1602.4, 328.9]];

function beak(g, pts, a, smugBeak) {
  if (a < 0.01) return;
  g.save(); g.globalAlpha = a;
  g.beginPath(); path(g, pts); g.fillStyle = BEAK; g.fill();
  g.save(); g.clip();
  // lit on the upper right, shaded on the left
  const b = pts.reduce((m, [x, y]) => [Math.min(m[0], x), Math.min(m[1], y), Math.max(m[2], x), Math.max(m[3], y)], [1e9, 1e9, -1e9, -1e9]);
  const gr = g.createLinearGradient(b[0], b[1], b[2], b[3]);
  gr.addColorStop(0, "rgba(184,90,40,0.75)"); gr.addColorStop(0.45, "rgba(223,124,44,0)"); gr.addColorStop(0.7, "rgba(238,156,60,0.35)"); gr.addColorStop(1, "rgba(238,156,60,0)");
  g.fillStyle = gr; g.fillRect(b[0] - 2, b[1] - 2, b[2] - b[0] + 4, b[3] - b[1] + 4);
  if (smugBeak) { g.fillStyle = "rgba(170,76,34,0.45)"; g.fillRect(b[0] - 2, (b[1] + b[3]) / 2 + 2, b[2] - b[0] + 4, b[3] - b[1]); }
  g.restore();
  g.lineWidth = 1.7; g.strokeStyle = EYE_LINE; g.lineJoin = "round"; g.stroke();
  g.restore();
}

function face(g, t, smug, inv) {
  const invAll = (pts) => pts.map(([x, y]) => inv(x, y));
  // facial disc: the top arcs morph into the smug brows; the V fades as they part
  const n = 18;
  const topL = mixPts(resample(DISC_TOP_L, n), resample(invAll(BROW_L), n), smug);
  const topR = mixPts(resample(DISC_TOP_R, n), resample(invAll(BROW_R), n), smug);
  const sideL = mixPts(resample(DISC_SIDE_L, 12), resample(invAll(SMUG_SIDE_L), 12), smug);
  const sideR = mixPts(resample(DISC_SIDE_R, 12), resample(invAll(SMUG_SIDE_R), 12), smug);
  line(g, sideL, 2, DISC);
  line(g, sideR, 2, DISC);
  if (smug < 0.99) { g.save(); g.globalAlpha = 1 - smug; line(g, topL, 2, DISC); line(g, topR, 2, DISC); g.restore(); }
  // eyes
  const lids = [blinkAt(t, 0), blinkAt(t, 1)];
  for (let k = 0; k < 2; k++) {
    const N = EYES.n[k], S = EYES.s[k];
    const Sc = { ...S }; [Sc.cx, Sc.cy] = inv(S.cx, S.cy);
    const E = lerpEye(N, Sc, smug);
    const hls = smug < 0.5 ? N.hl : S.hl;
    const outer = k === 0 ? -1 : 1;
    let lash = null, lidCol = LID;
    if (smug > 0.01) {
      // grey lid shadow up toward the brow, then the heavy lid line
      const L = SMUG_LID[k], [sx, sy] = inv(L.sh[0], L.sh[1]);
      const sl = invAll(L.lash);
      const openLash = sl.map(([x]) => [x, E.cy - E.ry - 6]);
      lash = mixPts(openLash, sl, smug);
      g.save(); g.globalAlpha = smug;
      g.beginPath(); g.moveTo(lash[0][0] - 3, lash[0][1]);
      for (const [x, y] of lash) g.lineTo(x, y);
      g.lineTo(lash[lash.length - 1][0] + 3, lash[lash.length - 1][1]); g.lineTo(sx + 30, sy - 40); g.lineTo(sx - 30, sy - 40); g.closePath(); g.clip();
      g.beginPath(); g.ellipse(sx, sy, L.sh[2], L.sh[3], 0, 0, Math.PI * 2); g.fillStyle = SHADOW; g.fill();
      g.restore();
      lidCol = smug > 0.5 ? SHADOW : LID;
    }
    eye(g, E, smug > 0.01 ? null : lids[k], smug, outer, hls, lidCol, lash);
  }
  // worried eyes: a small lash flick rising from the inner top of each ring
  if (smug < 0.99) {
    // (the flicks are already gone at 139.12, a couple of frames before the smug face)
    const open = (k) => { const l = lids[k]; return (l ? clamp(1 - (l[1] - (EYES.n[k].cy - EYES.n[k].ry)) / 4) : 1) * (1 - span(t, 139.08, 139.12)); };
    g.save();
    g.globalAlpha = (1 - smug) * open(0); taper(g, [[1566.5, 291.2], [1571, 289], [1576.2, 287.4]], (u) => 2.1 * (1 - u) + 0.5, EYE_LINE);
    g.globalAlpha = (1 - smug) * open(1); taper(g, [[1622.3, 296.6], [1617.5, 293.8], [1613.4, 291.6]], (u) => 2.1 * (1 - u) + 0.5, EYE_LINE);
    g.restore();
  }
  // smug brows over the disc arcs
  if (smug > 0.01) {
    g.save(); g.globalAlpha = smug;
    for (const [low, top] of [[topL, invAll(BROW_L_TOP)], [topR, invAll(BROW_R_TOP)]]) {
      g.beginPath(); path(g, [...resample(top, 14), ...low.slice().reverse()]); g.fillStyle = "#bf9f92"; g.fill();
      line(g, resample(top, 14), 0.9, "rgba(120,86,76,0.55)");
    }
    taper(g, topL, (u) => 2.2 * (0.45 + 0.55 * Math.min(1, u * 5)) * (0.4 + 0.6 * Math.min(1, (1 - u) * 5)), "#6a3a30");
    taper(g, topR, (u) => (u < 0.22 ? lerp(3.2, 2.1, u / 0.22) : 2.1 * (0.4 + 0.6 * Math.min(1, (1 - u) * 3))), "#6a3a30");
    g.restore();
  }
  // beak
  if (smug < 0.5) beak(g, BEAK_N, 1, false);
  else {
    beak(g, invAll(BEAK_S), 1, true);
    g.save();
    line(g, invAll(MOUTH_S), 1.4, "rgba(120,40,24,0.8)");
    taper(g, invAll(SMIRK_L), (u) => 0.9 + 1.2 * Math.min(1, u * 2), EYE_LINE);
    taper(g, invAll(SMIRK_R), (u) => 2.1 - 1.3 * u, EYE_LINE);
    g.restore();
  }
}

function bandage(g, gone, inv) {
  if (gone < 0.99) {
    g.save(); g.globalAlpha = 1 - gone;
    // two crossed strips (the long one on top), a padded centre with dots
    for (const [cx, cy, rot, len] of [[1573.6, 256.2, 0.47, 36], [1570.3, 254.2, -0.345, 45.5]]) {
      g.save(); g.translate(cx, cy); g.rotate(rot);
      g.beginPath(); g.roundRect(-len / 2, -5, len, 10, 5); g.fillStyle = "#f0c7a8"; g.fill(); g.lineWidth = 1.6; g.strokeStyle = "#8a3a2c"; g.stroke();
      g.restore();
    }
    g.save(); g.translate(1571, 255.5); g.rotate(-0.345);
    g.beginPath(); g.roundRect(-6.5, -4.2, 13, 8.4, 2); g.fillStyle = "#e6ae8e"; g.fill();
    g.fillStyle = "rgba(160,90,70,0.55)";
    for (const [x, y] of [[-3.5, -1.8], [0, -1.8], [3.5, -1.8], [-3.5, 1.8], [0, 1.8], [3.5, 1.8]]) g.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
    g.restore();
    g.restore();
  }
  if (gone > 0.01) {
    // what is left: a blotchy tan mark where the strips were, and a scrap of the upper strip (frame px at 139.8)
    g.save(); g.globalAlpha = gone;
    const r = rng(77);
    g.fillStyle = "rgba(205,160,112,0.5)";
    for (let i = 0; i < 16; i++) {
      const [x, y] = inv(1546 + r() * 30, 252 + r() * 16);
      g.beginPath(); g.ellipse(x, y, 3.5 + r() * 4.5, 2.6 + r() * 3, r() * 3, 0, Math.PI * 2); g.fill();
    }
    const scrap = [[1557, 250.5], [1563, 246.5], [1571, 245.6], [1576.8, 247.4], [1575.5, 252.4], [1566, 253.8]].map(([x, y]) => inv(x, y));
    g.beginPath(); path(g, scrap); g.fillStyle = "rgba(236,190,160,0.8)"; g.fill();
    g.lineWidth = 1.3; g.strokeStyle = "rgba(130,58,42,0.75)"; g.stroke();
    g.restore();
  }
}

function head(g, t, smug, gone, inv) {
  headphones(g, true);
  headphones(g, "left");
  g.beginPath(); path(g, HEAD); g.fillStyle = CREAM; g.fill();
  // cool grey at the very sides of the head
  g.save(); g.beginPath(); path(g, HEAD); g.clip();
  const gr = g.createLinearGradient(1533, 0, 1655, 0);
  gr.addColorStop(0, "rgba(170,154,144,0.3)"); gr.addColorStop(0.12, "rgba(170,154,144,0)"); gr.addColorStop(0.9, "rgba(170,154,144,0)"); gr.addColorStop(1, "rgba(170,154,144,0.18)");
  g.fillStyle = gr; g.fillRect(1520, 240, 150, 115);
  g.restore();
  g.beginPath(); path(g, HEAD.slice(HEAD_OUT[0], HEAD_OUT[1]), false);
  g.lineWidth = 2; g.strokeStyle = LINE; g.lineJoin = "round"; g.lineCap = "round"; g.stroke();
  // where the head's edge crosses the left cushion it reads as a pale pink line
  line(g, HEAD.slice(0, 6), 1.6, "rgba(214,160,150,0.9)");
  // feather notches on the tuft and a couple of faint ticks on the crown
  line(g, [[1640, 262], [1647.5, 258.6], [1654, 256.6]], 1.1, "rgba(110,80,70,0.45)");
  line(g, [[1609.5, 263.5], [1612.5, 259.5]], 1.1, "rgba(120,104,92,0.35)");
  line(g, [[1614.5, 263], [1617.5, 259]], 1.1, "rgba(120,104,92,0.35)");
  face(g, t, smug, inv);
  bandage(g, gone, inv);
  headphones(g, false);
}

export function drawOwl(g, t) {
  // the bandage fades to a tan mark 139.10-139.17, the smug face comes in 139.15-139.25, the head tilt runs 139.07-139.48
  const gone = smooth(span(t, 139.1, 139.17));
  // smug, per source frame: none at 139.16, mostly in at 139.20, full from 139.24
  const smug = t <= 139.16 ? 0 : t <= 139.2 ? 0.7 * smooth((t - 139.16) / 0.04) : Math.min(1, 0.7 + 0.3 * (t - 139.2) / 0.04);
  const tilt = smooth(span(t, 139.07, 139.48));
  g.save();
  body(g);
  feet(g);
  g.save();
  // head tilt about the neck, measured: band (-12.6,-3.8), right cup (-8.6,-7.7) by 139.5
  const tx = 1590 - 5.3 * tilt, ty = 380 - 3.5 * tilt, ang = -0.05 * tilt, ca = Math.cos(ang), sa = Math.sin(ang);
  g.translate(tx, ty); g.rotate(ang); g.translate(-1590, -380);
  // frame -> head space, so features measured in the frame land where they were measured
  const inv = (x, y) => { const dx = x - tx, dy = y - ty; return [dx * ca + dy * sa + 1590, -dx * sa + dy * ca + 380]; };
  head(g, t, smug, gone, inv);
  g.restore();
  g.restore();
}
