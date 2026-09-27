// Owl close-up (32.60–33.60): the owl on his shoulder, the edge of his beanie, hair and cheek filling the left of
// frame, the dim room and a lit speaker behind on the right. The camera is locked off (camtrack on the room:
// s = 1.0000, drift < 1 px). The designer sways a few pixels while the owl holds perfectly still. His head
// (beanie, hair, cheek) and his shoulder move on two separate measured tracks. The owl is the exact drawing s12
// opens on (the cut at 33.60 only removes the room): it is taken from s12 itself, so the cut stays continuous
// whatever the owl kit or s12 do; if s12 cannot provide it, the kit's hero pose is drawn instead.
//
// Every position below was measured on the source (tools/grid.py, profiles and skeleton traces of frame 816).
import { W, H } from "../config.js";
import { Plate, grey } from "../lib/engrave.js";
import { taper } from "../lib/ink.js";
import { smoothPath, sampleCurve } from "../lib/paths.js";
import { rng, noise2, clamp } from "../lib/rng.js";
import { owlLayer, owlPose, HERO_PLACE } from "../lib/owlInk.js";
import { STRANDS } from "./s09/strands.js";

// s12 is loaded by the shot table before the first frame is rendered; a failed load leaves the kit fallback.
let S12 = null;
import("./s12.js").then((m) => { S12 = (m && m.shot) || null; }, () => { S12 = null; });

// ---------- measured sway (camtrack vs 32.60): [t, tx, ty, rot°] ----------
const SWAY_HEAD = [[32.6, 0, 0, 0], [32.72, 0, 0, 0], [32.76, -1.4, 1.2, -0.09], [32.8, -2.9, 1.6, -0.14], [32.84, -4.2, 2.4, -0.19], [32.88, -6.0, 3.0, -0.27], [32.92, -6.5, 2.8, -0.26], [32.96, -6.5, 2.6, -0.26], [33.0, -6.1, 2.8, -0.24], [33.04, -4.6, 2.1, -0.19], [33.08, -3.9, 2.1, -0.13], [33.12, -1.3, 0.8, -0.08], [33.16, 1.6, -0.1, 0.03], [33.2, 4.4, -0.9, 0.13], [33.24, 5.4, -1.3, 0.2], [33.28, 4.6, -0.9, 0.15], [33.32, 1.9, -0.1, 0.04], [33.36, -1.2, 0.6, -0.08], [33.4, -3.7, 1.4, -0.17], [33.44, -7.2, 2.0, -0.3], [33.48, -6.8, 2.0, -0.29], [33.52, -4.2, 1.6, -0.2], [33.56, -2.9, 0.8, -0.14], [33.6, -2.5, 0.6, -0.12]];
// the shoulder slab under the owl moves much less than the head: phase correlation inside the slab (700–870 × 800–940,
// 760–900 × 740–800 and 640–860 × 860–946, averaged; translation only)
const SWAY_SHOULDER = [[32.6, 0, 0, 0], [32.72, 0, 0, 0], [32.76, -0.4, -0.1, 0], [32.8, -1.0, -0.13, 0], [32.84, -1.0, -0.37, 0], [32.88, -1.43, -0.43, 0], [32.92, -1.63, -0.43, 0], [32.96, -1.67, -0.47, 0], [33.0, -1.63, -0.47, 0], [33.04, -1.23, -0.47, 0], [33.08, -1.2, -0.5, 0], [33.12, -0.33, -0.23, 0], [33.16, 0.67, -0.07, 0], [33.2, 1.3, 0.27, 0], [33.24, 1.47, 0.33, 0], [33.28, 1.3, 0.37, 0], [33.32, 0.53, -0.07, 0], [33.36, -0.33, -0.33, 0], [33.4, -1.0, -0.63, 0], [33.44, -1.73, -1.07, 0], [33.48, -1.63, -0.83, 0], [33.52, -0.7, -0.8, 0], [33.56, -0.5, -0.43, 0], [33.6, -0.4, -0.35, 0]];
function sway(tab, t) {
  if (t <= tab[0][0]) return tab[0].slice(1);
  for (let i = 1; i < tab.length; i++) if (t <= tab[i][0]) {
    const a = tab[i - 1], b = tab[i], f = (t - a[0]) / (b[0] - a[0]);
    return [1, 2, 3].map((k) => a[k] + (b[k] - a[k]) * f);
  }
  return tab[tab.length - 1].slice(1);
}

// ---------- helpers ----------
const M = 24;   // plates carry a margin so the sway never shows an edge
const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const blob = (pts) => (c) => smoothPath(c, pts, true);
const linear = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
const radial = (x, y, r0, r1, stops) => (g) => { const r = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
const ink = (a) => `rgba(242,240,234,${a})`;
const dark = (a) => `rgba(6,6,6,${a})`;
function line(o, pts, w, color, per = 6, end = 0.3) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(o, q, (u) => w * (end + (1 - end) * Math.pow(Math.sin(Math.PI * u), 0.5)), color);
}
// piecewise-linear lookup along a polyline sorted by coordinate k (0 = x, 1 = y)
function lookup(pts, v, k) {
  const a = k, b = 1 - k;
  if (v <= pts[0][a]) return pts[0][b];
  for (let i = 1; i < pts.length; i++) if (v <= pts[i][a]) { const p = pts[i - 1], q = pts[i]; return p[b] + (q[b] - p[b]) * (v - p[a]) / Math.max(1e-6, q[a] - p[a]); }
  return pts[pts.length - 1][b];
}
// a plate covering frame rect [x0,y0,x1,y1] (drawn in frame coordinates)
function plateAt(x0, y0, x1, y1) {
  const P = new Plate(x1 - x0, y1 - y0, 1);
  for (const g of [P.v, P.d, P.o]) g.translate(-x0, -y0);
  P.x0 = x0; P.y0 = y0;
  return P;
}
function inside(path, x, y) {
  if (!inside.g) inside.g = document.createElement("canvas").getContext("2d");
  const g = inside.g; g.beginPath(); path(g); return g.isPointInPath(x, y);
}

// print mesh: a soft 45° diamond grid (4.5 px cells, measured on the beanie), multiplied into a value map
let MESH = null;
function mesh(g) {
  if (!MESH) {
    MESH = document.createElement("canvas"); MESH.width = MESH.height = 9;
    const t = MESH.getContext("2d");
    t.fillStyle = "#fff"; t.fillRect(0, 0, 9, 9);
    t.strokeStyle = grey(0.5); t.lineWidth = 0.85;
    for (const k of [-9, -4.5, 0, 4.5, 9, 13.5]) {
      t.beginPath(); t.moveTo(k, 0); t.lineTo(k + 9, 9); t.stroke();
      t.beginPath(); t.moveTo(k + 9, 0); t.lineTo(k, 9); t.stroke();
    }
  }
  return g.createPattern(MESH, "repeat");
}

// ================================================================= the designer's head: beanie, hair, cheek
// beanie crown: right silhouette (top → bottom), the fold under it, the cuff (measured edges)
const CROWN_R = [[312, -40], [314, 0], [323, 15], [333, 30], [340, 50], [344, 80], [350, 100], [357, 120], [369, 135], [378, 150], [389, 165], [395, 180], [400, 197], [400, 225], [398, 245], [396, 256]];
const FOLD = [[-40, 289], [0, 287], [100, 283], [180, 276], [260, 268], [320, 260], [360, 256], [396, 256]];
const CROWN = [[-40, -40], ...CROWN_R, ...FOLD.slice(0, -1).reverse()];
const CUFF_R = [[396, 256], [414, 258], [430, 264], [440, 278], [445, 300], [447, 350], [452, 380], [458, 400], [465, 420], [472, 440], [476, 456], [472, 472], [462, 488], [446, 502], [428, 512]];
const CUFF_BOT = [[-40, 564], [0, 563], [40, 561], [100, 556], [140, 552], [200, 543], [260, 536], [300, 532], [340, 527], [400, 519], [428, 512]];
const CUFF = [...FOLD, ...CUFF_R.slice(1), ...CUFF_BOT.slice(0, -1).reverse()];
const crownXR = (y) => lookup(CROWN_R, y, 1);
const cuffXR = (y) => lookup(CUFF_R, y, 1);
const foldY = (x) => lookup(FOLD, x, 0);
const cuffBotY = (x) => lookup(CUFF_BOT, x, 0);

// hair mass (below the cuff, left of the shoulder slab) and the pale cheek with the lock tips cut into it
const HAIR = [...CUFF_BOT, [470, 512], [560, 516], [650, 524], [720, 545], [790, 600], [805, 700], [770, 722], [745, 745], [700, 800], [640, 870], [560, 946], [560, 990], [-40, 990]];
const CHEEK = [[-40, 698], [0, 705], [25, 760], [42, 784], [51, 808], [56, 832], [59, 856], [61, 867], [63, 856], [66, 832], [73, 808], [73, 784], [71, 752], [90, 784], [109, 808], [129, 832], [134, 856], [136, 880], [139, 901], [143, 880], [146, 852], [153, 842], [163, 856], [167, 880], [171, 904], [169, 946], [162, 990], [-40, 990]];
const NECK = [[180, 990], [190, 900], [205, 845], [228, 828], [262, 846], [292, 888], [305, 946], [300, 990]];

function knitRibs(o, shape, xr, y0, y1, fs, lean, yMid, seed) {
  const r = rng(seed);
  o.save(); o.beginPath(); poly(shape)(o); o.clip();
  for (const f of fs) {
    const pts = [];
    const ph = r() * 6;
    for (let y = y0; y <= y1 + 1; y += 10) pts.push([-30 + (xr(y) + 30) * f + lean * (y - yMid) * (1 - f) + Math.sin(y * 0.11 + ph) * 0.9, y]);
    const bold = f > 0.55;
    const w = bold ? 3.2 + 1.6 * r() : 1.9 + 0.8 * r();
    taper(o, pts, (u) => w * (0.8 + 0.2 * Math.sin(Math.PI * u * 3 + ph)), dark(bold ? 0.92 : 0.8));
  }
  o.restore();
}
function knitCourses(o, shape, topY, botY, n, x0, x1, fadeA, fadeB, bend, seed) {
  const r = rng(seed);
  o.save(); o.beginPath(); poly(shape)(o); o.clip();
  for (let k = 1; k < n; k++) {
    const v = (k + (r() - 0.5) * 0.25) / n;
    const pts = [];
    for (let x = x0; x <= x1; x += 8) pts.push([x, topY(x) + (botY(x) - topY(x)) * v + bend(x, v) + Math.sin(x * 0.2 + k) * 0.6]);
    const gr = o.createLinearGradient(fadeA, 0, fadeB, 0);
    gr.addColorStop(0, dark(0)); gr.addColorStop(1, dark(0.9));
    const w = 2.2 + 1.6 * r();
    taper(o, pts, (u) => w * (0.7 + 0.3 * Math.sin(u * 23 + k)), gr);
  }
  o.restore();
}

function paintBeanie(P) {
  const o = P.o;
  // value study: a light knit mesh, lit from the left, turning into shadow on the right
  // (values are pre-grade: the finish pass adds an S-curve and a vignette that takes ~25% off this corner)
  P.fill(poly(CROWN), linear(-40, 0, 400, 0, [[0, 0.97], [0.28, 0.97], [0.37, 0.9], [0.47, 0.8], [0.58, 0.74], [0.7, 0.66], [0.82, 0.58], [0.92, 0.52], [1, 0.46]]), 1.57, { style: 2 });
  P.fill(poly(CUFF), linear(-40, 0, 450, 0, [[0, 0.97], [0.35, 0.96], [0.43, 0.88], [0.53, 0.78], [0.6, 0.72], [0.73, 0.64], [0.9, 0.56], [1, 0.5]]), 1.57, { style: 2 });
  P.light(poly(CROWN), mesh, "multiply", 1);
  // the crown's lower edge overhangs the cuff and falls into shadow toward the fold (measured: ~40 px, darker to the right)
  for (let k = 0; k < 8; k++) P.light(poly([...FOLD.map(([x, y]) => [x, y - 44 + k * 5.5 - Math.max(0, x - 150) * 0.04]), ...FOLD.slice().reverse().map(([x, y]) => [x, y + 2])]), 0.88, "multiply", 1);
  P.light(poly(CUFF), mesh, "multiply", 1);
  // ribs: measured positions (crown y=80/150/220, cuff y=330/470) as fractions of the width, compressing toward the
  // turning edge; crown ribs lean right going down, cuff ribs lean left
  knitRibs(o, CROWN, crownXR, -40, 290, [0.09, 0.2, 0.31, 0.42, 0.53, 0.63, 0.7, 0.76, 0.81, 0.855, 0.895, 0.93, 0.96, 0.985], 0.17, 150, 5);
  knitRibs(o, CUFF, cuffXR, 250, 570, [0.1, 0.18, 0.26, 0.355, 0.44, 0.52, 0.6, 0.66, 0.7, 0.77, 0.81, 0.845, 0.88, 0.91, 0.94, 0.965, 0.985], -0.16, 400, 6);
  // courses: the dark horizontal grid, fading in toward the shadow side (~13 px apart, measured)
  knitCourses(o, CROWN, () => -40, foldY, 23, 100, 420, 120, 270, (x, v) => (x > 250 ? 12 * Math.pow((x - 250) / 150, 2) * (1 - v) : 0), 7);
  knitCourses(o, CUFF, foldY, cuffBotY, 20, 140, 460, 170, 300, () => 0, 8);
  // the fold between crown and cuff, the cuff's lower edge, a keyline on the turning edges
  line(o, FOLD, 5.5, "#060606", 6, 0.6);
  line(o, CUFF_BOT.slice().reverse(), 3, "#060606", 6, 0.6);
  line(o, CROWN_R.slice(1), 2.2, dark(0.9), 6, 0.6);
  line(o, CUFF_R, 2.4, dark(0.9), 6, 0.6);
}

// flow field of the hair, from the traced strands (inverse-distance weighted directions)
let SEGS = null;
function flowAt(x, y) {
  if (!SEGS) {
    SEGS = [];
    for (const [, , pts] of STRANDS) {
      const q = sampleCurve(pts, 3);
      for (let i = 0; i < q.length - 1; i++) {
        const dx = q[i + 1][0] - q[i][0], dy = q[i + 1][1] - q[i][1], d = Math.hypot(dx, dy) || 1;
        SEGS.push([(q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2, dx / d, dy / d]);
      }
    }
  }
  let sx = 0, sy = 0;
  for (const s of SEGS) { const q = (s[0] - x) * (s[0] - x) + (s[1] - y) * (s[1] - y) + 225, w = 1 / (q * Math.sqrt(q)); sx += s[2] * w; sy += s[3] * w; }
  const d = Math.hypot(sx, sy) || 1;
  return [sx / d, sy / d];
}
function streamline(x, y, L, step = 4) {
  const fw = [[x, y]], bw = [];
  let p = [x, y];
  for (let s = 0; s < L / 2; s += step) { const f = flowAt(p[0], p[1]); p = [p[0] + f[0] * step, p[1] + f[1] * step]; fw.push(p); }
  p = [x, y];
  for (let s = 0; s < L / 2; s += step) { const f = flowAt(p[0], p[1]); p = [p[0] - f[0] * step, p[1] - f[1] * step]; bw.push(p); }
  return [...bw.reverse(), ...fw];
}
// extend a traced strand at both ends by 12% of its length (the traces miss the faint tails)
function extend(pts, k = 0.12) {
  const a = pts[0], b = pts[1], c = pts[pts.length - 2], d = pts[pts.length - 1];
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const u = (p, q) => { const dx = p[0] - q[0], dy = p[1] - q[1], n = Math.hypot(dx, dy) || 1; return [dx / n, dy / n]; };
  const ua = u(a, b), ud = u(d, c);
  return [[a[0] + ua[0] * L * k, a[1] + ua[1] * L * k], ...pts, [d[0] + ud[0] * L * k, d[1] + ud[1] * L * k]];
}

function paintHair(P) {
  const o = P.o;
  // pale cheek (bottom left) with the black lock tips cut into it (pre-grade value: the vignette takes ~28% here),
  // a finer mesh where the hair shades it, a darker mesh on the neck under the hair
  P.fill(poly(CHEEK), linear(0, 700, 170, 946, [[0, 0.9], [0.5, 0.96], [1, 0.98]]), 1.2, { style: 2 });
  P.fill(poly([[71, 752], [90, 784], [109, 808], [100, 812], [82, 794], [73, 772]]), 0.62, 1.2, { style: 2 });
  P.light(poly([[71, 752], [90, 784], [109, 808], [100, 812], [82, 794], [73, 772]]), mesh, "multiply", 1);
  P.fill(poly(NECK), linear(200, 830, 280, 946, [[0, 0.16], [1, 0.3]]), 1.2, { style: 2 });
  P.light(poly(NECK), mesh, "multiply", 1);
  P.light(poly(NECK), mesh, "multiply", 0.6);
  // an earring hook on the cheek
  o.strokeStyle = "#141414"; o.lineWidth = 2.4; o.lineCap = "round";
  o.beginPath(); o.moveTo(95, 878); o.lineTo(96, 897); o.arc(90.5, 897, 5.5, 0, Math.PI * 0.95); o.stroke();

  // strands: clipped to the hair (not over the cuff, not over the cheek)
  o.save();
  o.beginPath(); poly(HAIR)(o); poly(CHEEK)(o); o.clip("evenodd");
  const r = rng(71);
  // dim strands along the flow, clumped into locks by a slow noise (sparse: the hair is mostly solid black)
  const hairPath = poly(HAIR), cheekPath = poly(CHEEK);
  for (let gy = 560; gy < 960; gy += 22) for (let gx = -30; gx < 800; gx += 22) {
    const x = gx + r() * 22, y = gy + r() * 22, L = 90 + r() * 170, a0 = r(), w0 = r();
    if (!inside(hairPath, x, y) || inside(cheekPath, x, y)) continue;
    if (x > 380 && r() < 0.85) continue;
    const n = noise2(x / 80, y / 60, 3);
    if (n < -0.1) continue;
    const q = streamline(x, y, L, 5);
    taper(o, sampleCurve(q.filter((_, i) => i % 3 === 0 || i === q.length - 1), 4), (u) => (0.7 + 0.7 * w0) * Math.pow(Math.sin(Math.PI * u), 0.7), ink(clamp((0.09 + 0.2 * a0) * (0.7 + n), 0, 0.45)));
  }
  // the locks falling over the neck (lower left): brighter strands dropping almost straight down (measured 70–95°)
  for (let i = 0; i < 28; i++) {
    const x = 150 + r() * 190, y = 750 + r() * 70, L = 100 + r() * 110, ww = 1 + 1.6 * r(), al = 0.4 + 0.45 * r();
    const ang = 1.3 + (r() - 0.35) * 0.4, bow = (r() - 0.5) * 16;
    if (inside(cheekPath, x, y)) continue;
    const d = [Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]];
    const q = sampleCurve([[x, y], [x + d[0] * L * 0.5 + n[0] * bow, y + d[1] * L * 0.5 + n[1] * bow], [x + d[0] * L, y + d[1] * L]], 10);
    taper(o, q, (u) => ww * Math.pow(Math.sin(Math.PI * u), 0.7), ink(al));
  }
  // the traced highlight strands: wide ones are lit locks (a soft sheen band under a bright core)
  for (const [b, w, pts] of STRANDS) {
    const q = sampleCurve(extend(pts), 6);
    const a = clamp((b - 30) / 180, 0.35, 1);
    if (w > 5.5) taper(o, q, (u) => w * 1.1 * Math.pow(Math.sin(Math.PI * u), 0.9), ink(0.14 * a));
    const ww = clamp(w * 0.42, 1, 3.2);
    taper(o, q, (u) => ww * Math.pow(Math.sin(Math.PI * u), 0.7), ink(a));
  }
  // the lit tips of a lock (a bright ragged patch, measured at 100–152 × 684–722)
  for (const [a, b2, w] of [[[100, 688], [126, 701], 3.5], [[110, 694], [151, 718], 3], [[104, 701], [134, 723], 2.6], [[120, 689], [152, 711], 2.4], [[98, 706], [126, 725], 2]])
    taper(o, [a, [(a[0] + b2[0]) / 2 + 1, (a[1] + b2[1]) / 2 - 1], b2], (u) => w * Math.pow(Math.sin(Math.PI * u), 0.6), ink(0.85));
  // fine flyaways curving right toward the owl
  const FLY = [
    [[462, 538], [530, 545], [600, 553], [670, 551], [724, 540]], [[496, 556], [566, 566], [636, 576], [702, 586]],
    [[520, 572], [588, 590], [650, 604], [720, 607]], [[544, 588], [598, 606], [640, 618], [676, 621]],
    [[450, 528], [518, 534], [580, 541], [604, 544]], [[566, 600], [612, 620], [652, 640], [692, 650]],
    [[600, 560], [650, 566], [700, 570], [744, 566]], [[430, 562], [480, 576], [528, 600], [566, 630]],
    [[610, 640], [640, 660], [662, 676]], [[576, 532], [640, 534], [700, 540], [748, 552]],
  ];
  FLY.forEach((pts, i) => taper(o, sampleCurve(pts, 8), (u) => (1 + 0.5 * ((i * 7) % 3) / 2) * Math.pow(Math.sin(Math.PI * u), 0.6), ink(0.35 + 0.3 * (((i * 5) % 4) / 3))));
  o.restore();
}

// ================================================================= the shoulder slab under the owl
// measured: top edge (column scans), left edge (row scans), the crease = the darkest line right of the lit plane
const SLAB_TOP = [[768, 718], [778, 711], [790, 708], [805, 716], [820, 729], [835, 742], [850, 757], [865, 767], [880, 775], [895, 781], [910, 786], [925, 793], [940, 799], [950, 803]];
const CREASE_L = [[950, 803], [948, 812], [943, 830], [930, 850], [917, 870], [904, 890], [890, 910], [877, 930], [868, 946], [850, 990]];
const CREASE_R = [[962, 812], [973, 830], [955, 842], [950, 856], [936, 872], [922, 892], [908, 912], [896, 932], [888, 946], [870, 990]];
const SLAB_LEFT = [[530, 990], [570, 946], [591, 920], [614, 890], [639, 860], [666, 830], [696, 800], [728, 770], [757, 740]];
const SLAB_L = [...SLAB_LEFT, ...SLAB_TOP, ...CREASE_L.slice(1)];
const SLAB_R = [[973, 830], [1030, 838], [1060, 848], [1150, 868], [1260, 882], [1380, 892], [1500, 902], [1560, 910], [1570, 990], ...CREASE_R.slice(2).reverse()];
const SLAB = [...SLAB_LEFT, ...SLAB_TOP, [962, 812], [973, 830], [1030, 838], [1060, 848], [1150, 868], [1260, 882], [1380, 892], [1500, 902], [1560, 910], [1570, 990]];
const CREASE = [...CREASE_L, ...CREASE_R.slice().reverse()];

function paintShoulder(P) {
  const o = P.o, r = rng(61);
  // right plane (under the owl's belly): mid-light, hatched along ~123° (structure tensor: 123–129°), shadowed under the owl
  P.fill(poly(SLAB_R), linear(0, 826, 0, 946, [[0, 0.36], [0.4, 0.58], [1, 0.8]]), 2.15, { style: 2 });
  P.fill(poly([[1415, 896], [1500, 902], [1560, 910], [1570, 990], [1395, 990]]), 0.08, 2.15, { style: 2 });
  P.light(poly(SLAB_R), mesh, "multiply", 0.5);
  P.light(poly([[973, 830], [1100, 856], [1300, 880], [1500, 902], [1500, 922], [1300, 900], [1100, 884], [960, 850]]), 0.3, "source-over", 0.5);
  // left plane: lit toward the lower left, darker under the top edge; grain and folds run down-left (~126°, measured)
  P.fill(poly(SLAB_L), linear(905, 775, 640, 946, [[0, 0.58], [0.3, 0.74], [0.62, 0.92], [1, 1]]), 2.2, { style: 2 });
  // under the top edge: a band of print mesh (the fabric seen edge-on)
  const band = [...SLAB_TOP, ...SLAB_TOP.map(([x, y]) => [x - 30, y + 40]).reverse()];
  P.light(poly(band), mesh, "multiply", 0.7);
  P.fill(poly(CREASE), 0.02, 0, { style: 2 });
  const d130 = [Math.cos(2.2), Math.sin(2.2)];
  o.save(); o.beginPath(); poly(SLAB_L)(o); o.clip();
  // fine grain lines (light hatching) over the whole plane
  for (let k = -60; k < 80; k++) {
    const x0 = 700 + k * 5.5 + r() * 2, y0 = 700 + (k * 5.5) * 0.35;
    const L = 120 + r() * 200, s0 = r() * 60;
    const A = [x0 + d130[0] * s0, y0 + d130[1] * s0], B = [A[0] + d130[0] * L, A[1] + d130[1] * L];
    taper(o, [A, [(A[0] + B[0]) / 2 + (r() - 0.5) * 2, (A[1] + B[1]) / 2], B], (u) => (0.7 + 0.5 * r()) * Math.sin(Math.PI * u), dark(0.08 + 0.1 * r()));
  }
  // folds: dark strokes leaving the top edge every ~11 px, running down-left and bowing a little
  const topQ = sampleCurve(SLAB_TOP.slice(3), 8);
  for (let i = 0; i < 16; i++) {
    const p0 = topQ[Math.min(topQ.length - 1, Math.floor(((i + 0.2 + r() * 0.6) / 16) * topQ.length))];
    const L = 100 + r() * 150, a = 2.2 + (r() - 0.5) * 0.14, bow = (r() - 0.4) * 14;
    const d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
    const s0 = [p0[0] - 2 + r() * 6, p0[1] + 6 + r() * 14];
    line(o, [s0, [s0[0] + d[0] * L * 0.5 + n[0] * bow, s0[1] + d[1] * L * 0.5 + n[1] * bow], [s0[0] + d[0] * L, s0[1] + d[1] * L]], 1.4 + r() * 1.6, dark(0.5 + 0.35 * r()), 8, 0.12);
  }
  // a few long, lighter folds reaching into the lit lower left
  for (let i = 0; i < 7; i++) {
    const x0 = 720 + r() * 190, y0 = 760 + (x0 - 720) * 0.3 + r() * 20, L = 150 + r() * 110, a = 2.25 + (r() - 0.5) * 0.1;
    line(o, [[x0, y0], [x0 + Math.cos(a) * L * 0.5 + 5, y0 + Math.sin(a) * L * 0.5], [x0 + Math.cos(a) * L, y0 + Math.sin(a) * L]], 1.2 + r() * 1.3, dark(0.25 + 0.15 * r()), 8, 0.12);
  }
  o.restore();
  // hatching on the right plane
  o.save(); o.beginPath(); poly(SLAB_R)(o); o.clip();
  const d135 = [Math.cos(2.15), Math.sin(2.15)];
  for (let k = 0; k < 150; k++) {
    const x0 = 900 + k * 4.6 + r() * 2, y0 = 824 + r() * 30, L = 40 + r() * 90;
    taper(o, [[x0, y0], [x0 + d135[0] * L, y0 + d135[1] * L]], (u) => (0.9 + 0.8 * r()) * Math.sin(Math.PI * u), dark(0.12 + 0.2 * r()));
  }
  o.restore();
  // lit edges
  line(o, [...SLAB_LEFT.slice(1), [768, 718]], 1.8, ink(0.55), 6, 0.4);
  line(o, SLAB_TOP, 1.3, ink(0.45), 6, 0.3);
}

// ================================================================= the room
// a carton face in the dark: flat dim value, bold irregular corrugation strokes (white), dark seams
function carton(P, quad, v, seed, { bright = 0.45, gap = 4.2, horiz = false, top = 0.35, seam = 0.5 } = {}) {
  const o = P.o, r = rng(seed);
  v += 0.015; bright *= 0.85;
  P.fill(poly(quad), v, horiz ? 0 : 1.5708, { style: 2 });
  const [a, b, c, d] = quad;   // a top-left, b top-right, c bottom-right, d bottom-left
  const mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  o.save(); o.beginPath(); poly(quad)(o); o.clip();
  const span = horiz ? Math.hypot(d[0] - a[0], d[1] - a[1]) : Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (let s = r() * gap * 0.5; s < span; s += gap * (0.7 + 0.6 * r())) {
    const t = s / span;
    const p = horiz ? mix(a, d, t) : mix(a, b, t), q = horiz ? mix(b, c, t) : mix(d, c, t);
    // break the stroke into one or two runs
    let u0 = r() * 0.15;
    while (u0 < 1) {
      const u1 = Math.min(1, u0 + 0.35 + r() * 0.8);
      const A = mix(p, q, u0), B = mix(p, q, u1), wob = (r() - 0.5) * 2;
      // corrugation: fine, dense, brighter toward the top of the face (light from above)
      if (r() > 0.12) { const ww = 0.8 + 1.1 * r(), al = Math.min(0.95, bright * (0.55 + 0.75 * r()) * (1.15 - 0.45 * u0)); taper(o, [A, [(A[0] + B[0]) / 2 + wob, (A[1] + B[1]) / 2], B], (u) => ww * (0.5 + 0.5 * Math.sin(Math.PI * u)), ink(al)); }
      u0 = u1 + 0.05 + r() * 0.2;
    }
  }
  if (seam > 0 && r() < 0.6) { const y = 0.35 + r() * 0.3; line(o, [mix(a, d, y), mix(b, c, y)], 2, dark(seam), 4, 0.8); }
  o.restore();
  line(o, [d, c], 2.4, dark(0.9), 4, 0.8);
  if (top > 0) { line(o, [a, b], 1.4, ink(top), 4, 0.5); line(o, [mix(a, d, 0.03), mix(b, c, 0.03)], 3.5, ink(top * 0.4), 4, 0.6); }
}
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

function paintRoom(P) {
  const o = P.o, r = rng(44);
  // dim clutter behind the stacks (flat, no hatching; the gaps above the rack and right of the column stay black)
  P.fill(poly([[1545, 340], [1570, 255], [1700, 236], [1850, 240], [1905, 330], [2060, 330], [2060, 900], [1545, 900]]), 0.055, 1.57, { style: 2 });
  // --- the carton column behind (continuous from the top of frame down to ~400) and its neighbours
  carton(P, rect(1545, 345, 1605, 462), 0.06, 30, { bright: 0.18, top: 0.1 });
  carton(P, rect(1560, 462, 1650, 760), 0.06, 31, { bright: 0.16, top: 0.12 });
  carton(P, rect(1905, 90, 2040, 215), 0.045, 32, { bright: 0.1, top: 0.14, seam: 0 });
  carton(P, rect(1826, 12, 1905, 132), 0.14, 1, { bright: 0.42 });
  P.fill(poly(rect(1858, 14, 1897, 42)), 0.03, 0, { style: 2 });
  carton(P, [[1780, 144], [1905, 134], [1905, 236], [1780, 236]], 0.15, 2, { bright: 0.45 });
  carton(P, rect(1860, 216, 1922, 392), 0.16, 3, { bright: 0.5 });
  // --- left stack
  carton(P, [[1575, 262], [1652, 258], [1652, 346], [1575, 346]], 0.14, 5, { bright: 0.5 });
  carton(P, [[1652, 240], [1705, 236], [1705, 338], [1652, 338]], 0.17, 6, { bright: 0.55 });
  carton(P, rect(1605, 334, 1678, 405), 0.12, 7, { bright: 0.42, horiz: true });
  carton(P, [[1575, 402], [1712, 398], [1712, 462], [1575, 462]], 0.14, 8, { bright: 0.48 });
  // --- right cartons (under the plant, lit), below them, a carton by the rack
  carton(P, [[1915, 366], [2046, 336], [2046, 472], [1915, 478]], 0.18, 9, { bright: 0.55 });
  carton(P, [[1905, 478], [2050, 472], [2050, 535], [1905, 535]], 0.13, 10, { bright: 0.42 });
  carton(P, rect(1800, 630, 1850, 722), 0.13, 11, { bright: 0.42 });
  // --- dim cartons filling the clutter between and below the stacks
  carton(P, rect(1650, 640, 1800, 760), 0.08, 33, { bright: 0.22, top: 0.12 });
  carton(P, rect(1650, 760, 1850, 900), 0.07, 34, { bright: 0.18, top: 0.1, horiz: true });
  carton(P, rect(1850, 600, 1940, 760), 0.08, 35, { bright: 0.22, top: 0.12 });
  carton(P, rect(1545, 760, 1650, 900), 0.07, 36, { bright: 0.18, top: 0.1 });
  carton(P, rect(1760, 470, 1800, 640), 0.08, 37, { bright: 0.2, top: 0.1 });
  carton(P, rect(1940, 535, 2050, 760), 0.08, 38, { bright: 0.26, top: 0.14 });
  // --- gear rack: perforated front, a dotted grid
  P.fill(poly(rect(1700, 240, 1800, 480)), 0.045, 0, { style: 2 });
  for (let y = 250; y < 476; y += 9) for (let x = 1706; x < 1796; x += 9) {
    if (r() < 0.12) continue;
    o.fillStyle = ink(0.16 + 0.18 * r()); o.beginPath(); o.arc(x + (y % 18 ? 0 : 4), y, 1.3, 0, 7); o.fill();
  }
  // --- cables hanging in loops from the top of the rack
  for (const pts of [
    [[1765, 236], [1768, 282], [1780, 322], [1797, 330], [1806, 290], [1808, 244]],
    [[1792, 238], [1800, 292], [1820, 342], [1836, 318], [1840, 260]],
    [[1816, 240], [1816, 300], [1828, 352], [1846, 386]],
    [[1752, 240], [1750, 300], [1758, 352], [1774, 384]],
    [[1780, 240], [1790, 270], [1810, 262], [1826, 236]],
  ]) line(o, pts, 1.6, ink(0.34), 10, 0.6);
  // --- small synth standing up, leaning ~8° right: knob panel over a strip of keys
  for (const g of [P.v, P.d, P.o]) { g.save(); g.translate(1685, 560); g.rotate(0.14); g.translate(-1685, -560); }
  P.fill(poly(rect(1632, 432, 1732, 662)), 0.08, 1.57, { style: 2 });
  o.strokeStyle = ink(0.3); o.lineWidth = 1.4;
  for (const [x, y] of [[1655, 452], [1682, 448], [1709, 454], [1660, 480], [1686, 477], [1712, 482]]) { o.beginPath(); o.arc(x, y, 7, 0, 7); o.stroke(); }
  o.strokeRect(1634, 434, 96, 226);
  for (let k = 0; k < 12; k++) {
    const y = 506 + k * 12;
    o.fillStyle = ink(0.22); o.fillRect(1664, y, 60, 10);
    o.fillStyle = "rgba(0,0,0,0.92)"; if (k % 7 !== 2 && k % 7 !== 6) o.fillRect(1694, y + 6, 30, 7);
  }
  for (const g of [P.v, P.d, P.o]) g.restore();
  // --- rack unit with handles
  P.fill(poly(rect(1800, 500, 1940, 600)), 0.06, 0, { style: 2 });
  o.strokeStyle = ink(0.26); o.lineWidth = 1.4; o.strokeRect(1810, 506, 120, 26); o.strokeRect(1810, 548, 120, 44); o.strokeRect(1858, 556, 26, 22);
  line(o, [[1814, 520], [1926, 520]], 2, ink(0.2), 4, 0.8);
  // --- desk surface at the bottom
  P.fill(poly([[1850, 762], [2050, 758], [2050, 900], [1850, 905]]), 0.07, 0, { style: 2 });
  for (let i = 0; i < 20; i++) { const y = 768 + i * 7; line(o, [[1856, y], [2046, y - 3]], 1.1, ink(0.05 + 0.08 * r()), 4, 0.6); }
  // --- the plant: a lit clump of ovate leaves over a round pot, a vine trailing down
  const leaf = (x, y, a, L, v) => {
    const c = Math.cos(a), s = Math.sin(a), n = [-s, c];
    const pts = [[x, y], [x + c * L * 0.35 + n[0] * L * 0.32, y + s * L * 0.35 + n[1] * L * 0.32], [x + c * L, y + s * L], [x + c * L * 0.35 - n[0] * L * 0.32, y + s * L * 0.35 - n[1] * L * 0.32]];
    P.fill(blob(pts), v, a, { style: 2 });
    o.strokeStyle = ink(0.2); o.lineWidth = 1.1; o.beginPath(); smoothPath(o, pts, true); o.stroke();
    line(o, [[x, y], [x + c * L * 0.8, y + s * L * 0.8]], 1, dark(0.6), 4, 0.5);
  };
  P.fill((c) => c.ellipse(2075, 288, 26, 24, 0, 0, 7), radial(2068, 280, 2, 26, [[0, 0.36], [0.7, 0.2], [1, 0.1]]), 0, { style: 2 });
  line(o, [[2052, 296], [2060, 308], [2080, 312], [2098, 300]], 1.4, ink(0.4), 6, 0.5);
  line(o, [[1962, 213], [2020, 216]], 1.6, ink(0.3), 4, 0.8);
  const lr = rng(52);
  for (let i = 0; i < 20; i++) {
    const a = lr() * Math.PI * 2, rr = Math.sqrt(lr());
    const x = 2042 + Math.cos(a) * rr * 52, y = 240 + Math.sin(a) * rr * 42;
    leaf(x, y, Math.atan2(y - 262, x - 2042) + (lr() - 0.5) * 1.2, 30 + lr() * 14, 0.12 + lr() * 0.08);
  }
  line(o, [[1996, 300], [1992, 340], [2004, 372], [2012, 404], [2006, 428]], 1.3, ink(0.3), 8, 0.5);
  for (const [x, y, a] of [[1994, 322, 2.6], [1990, 346, 0.5], [2012, 360, 0.3], [2000, 382, 2.8], [2026, 398, 0.2], [2010, 420, 2.4]]) leaf(x, y, a, 22 + 6 * lr(), 0.22 + 0.08 * lr());
  // --- the speaker: pale cabinet, bold white grain, two drivers
  const cab = [[2076, 382], [2206, 366], [2206, 946], [2026, 946]];
  P.fill(poly(cab), 0.1, 1.48, { style: 2 });
  o.save(); o.beginPath(); poly(cab)(o); o.clip();
  const slope = -50 / 564;   // the cabinet's lean (left edge 2076 → 2026 over 382 → 946)
  for (let x = 2079; x < 2250; x += 3 + r() * 3.5) {
    let y0 = 360 + r() * 20;
    while (y0 < 946) {
      const y1 = Math.min(950, y0 + 120 + r() * 420);
      const w = 1.8 + r() * 2.6;
      if (r() > 0.08) taper(o, [[x + slope * (y0 - 382), y0], [x + slope * ((y0 + y1) / 2 - 382) + (r() - 0.5) * 1.5, (y0 + y1) / 2], [x + slope * (y1 - 382), y1]], (u) => w * (0.5 + 0.5 * Math.sin(Math.PI * u)), ink(0.72 + 0.28 * r()));
      y0 = y1 + 4 + r() * 30;
    }
  }
  o.restore();
  // the cabinet's lower left falls into shadow
  o.save(); o.beginPath(); poly(cab)(o); o.clip();
  const sh = o.createLinearGradient(2030, 840, 2090, 930); sh.addColorStop(0, dark(0)); sh.addColorStop(1, dark(0.75));
  o.fillStyle = sh; o.fillRect(2020, 820, 120, 130); o.restore();
  line(o, [[2076, 382], [2026, 946]], 2.2, ink(0.9), 4, 0.8);
  line(o, [[2078, 382], [2206, 366]], 2.2, ink(0.85), 4, 0.8);
  line(o, [[2090, 388], [2042, 946]], 1.6, dark(0.7), 4, 0.8);
  const driver = (cx, cy, R, seed, lit = 1) => {
    const q = rng(seed);
    // drawn on the overlay so it covers the grain: dark body, a cone lit toward the lower right with print tone
    o.fillStyle = "#070707"; o.beginPath(); o.arc(cx, cy, R + 4, 0, 7); o.fill();
    const g = o.createRadialGradient(cx - R * 0.3, cy + R * 0.32, R * 0.05, cx - R * 0.1, cy + R * 0.1, R * 0.8);
    g.addColorStop(0, grey(0.78 * lit)); g.addColorStop(0.35, grey(0.62 * lit)); g.addColorStop(0.65, grey(0.2 * lit)); g.addColorStop(1, grey(0.06));
    o.fillStyle = g; o.beginPath(); o.arc(cx, cy, R * 0.84, 0, 7); o.fill();
    o.save(); o.globalCompositeOperation = "multiply"; o.globalAlpha = 0.6; o.fillStyle = mesh(o); o.beginPath(); o.arc(cx, cy, R * 0.84, 0, 7); o.fill(); o.restore();
    // bright metal mounting ring, a thin inner ring, dark keylines
    o.strokeStyle = ink(0.9); o.lineWidth = Math.max(4, R * 0.065); o.beginPath(); o.arc(cx, cy, R * 0.96, 0, 7); o.stroke();
    o.strokeStyle = ink(0.5); o.lineWidth = 1.6; o.beginPath(); o.arc(cx, cy, R * 0.88, 0, 7); o.stroke();
    o.strokeStyle = dark(0.95); o.lineWidth = 2; o.beginPath(); o.arc(cx, cy, R * 1.02, 0, 7); o.stroke();
    // concentric cone ridges, lit on the upper-left side
    for (const k of [0.8, 0.74, 0.68, 0.62, 0.56, 0.5, 0.44]) {
      const a0 = Math.PI * (0.62 + 0.1 * q()), a1 = Math.PI * (1.72 + 0.1 * q());
      o.strokeStyle = ink(0.4 + 0.3 * q()); o.lineWidth = 1.3 + q() * 1.4;
      o.beginPath(); o.arc(cx, cy, R * k, a0, a1); o.stroke();
    }
    // dust cap: dark dome with a small highlight, slightly up and left
    const dx = cx - R * 0.14, dy = cy - R * 0.1;
    const gc = o.createRadialGradient(dx - R * 0.08, dy - R * 0.1, 1, dx, dy, R * 0.32);
    gc.addColorStop(0, grey(0.45)); gc.addColorStop(0.5, grey(0.18)); gc.addColorStop(1, grey(0.05));
    o.fillStyle = gc; o.beginPath(); o.arc(dx, dy, R * 0.32, 0, 7); o.fill();
    o.fillStyle = ink(0.85); o.beginPath(); o.ellipse(dx - R * 0.1, dy - R * 0.12, R * 0.08, R * 0.1, -0.4, 0, 7); o.fill();
  };
  driver(2212, 520, 64, 81, 0.45);
  driver(2197, 773, 133, 82);
  o.fillStyle = "#101010"; o.beginPath(); o.arc(2100, 655, 4, 0, 7); o.fill();
  o.strokeStyle = ink(0.6); o.lineWidth = 1; o.stroke();
}

// ================================================================= build + draw
let cache = null;
function captureOwl() {
  // the owl exactly as s12 opens on it (s12 paints the owl alone onto a transparent frame)
  if (S12 && typeof S12.draw === "function") {
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d", { willReadFrequently: true });
    try { S12.draw(g, 0, 33.6, S12); } catch (e) { return null; }
    const clear = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]].every(([x, y]) => g.getImageData(x, y, 1, 1).data[3] === 0);
    if (clear) return { canvas: c, x: 0, y: 0, w: W, h: H };
  }
  return null;
}
function build() {
  if (cache) return cache;
  const R = new Plate(W, H, 1);
  paintRoom(R);
  const room = R.engrave({ spacing: 4.6, seed: 17, contrast: 1.0, ink: 1.0 });
  const HP = plateAt(-M, -M, 820, H + M);
  paintBeanie(HP); paintHair(HP);
  const head = HP.engrave({ spacing: 4.2, seed: 29, contrast: 1.0 });
  const SP = plateAt(540, 690, 1560, H + M);
  paintShoulder(SP);
  const shoulder = SP.engrave({ spacing: 4.4, seed: 31, contrast: 1.0 });
  // the shoulder is a cut-out: keep only its silhouette so it can move over the hair on its own track
  const sg = shoulder.getContext("2d");
  sg.save(); sg.translate(-SP.x0, -SP.y0); sg.globalCompositeOperation = "destination-in"; sg.fillStyle = "#fff"; sg.beginPath(); poly(SLAB)(sg); sg.fill(); sg.restore();
  const owl = captureOwl() || owlLayer({ ...HERO_PLACE, ...owlPose("sit3q"), clip: [0, 0, W, H] });
  cache = { room, head, shoulder, owl, hx: HP.x0, hy: HP.y0, sx: SP.x0, sy: SP.y0 };
  return cache;
}
function plate(ctx, img, x0, y0, tab, t) {
  const [tx, ty, rd] = sway(tab, t);
  ctx.save();
  ctx.translate(tx, ty); ctx.rotate((rd * Math.PI) / 180);
  ctx.drawImage(img, x0, y0);
  ctx.restore();
}

export const shot = {
  draw(ctx, local, t) {
    const L = build();
    ctx.drawImage(L.room, 0, 0);
    plate(ctx, L.head, L.hx, L.hy, SWAY_HEAD, t);
    plate(ctx, L.shoulder, L.sx, L.sy, SWAY_SHOULDER, t);
    ctx.drawImage(L.owl.canvas, L.owl.x, L.owl.y, L.owl.w, L.owl.h);
  },
  // the same finish as s12 (it measured the source's halation round this owl); keeps the owl's tone continuous at the cut
  grade(local, t) {
    let g = null;
    try { g = S12 && typeof S12.grade === "function" ? S12.grade(0, 33.6) : null; } catch (e) { g = null; }
    return g && typeof g === "object" ? g : {};
  },
  release() { cache = null; },
};
