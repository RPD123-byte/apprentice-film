// Owl close-up (32.60–33.60): the owl on his shoulder, the edge of his beanie, hair and cheek filling the left of
// frame, the dim room and a lit speaker behind on the right. The camera is locked off (camtrack on the room:
// s = 1.0000, drift < 1 px). The designer sways a few pixels while the owl holds perfectly still. His head
// (beanie, hair, cheek) and his shoulder move on two separate measured tracks. The owl is the exact drawing s12
// opens on (the cut at 33.60 only removes the room): it is taken from s12 itself, so the cut stays continuous
// whatever the owl kit or s12 do; if s12 cannot provide it, the kit's hero pose is drawn instead.
//
// Every position below was measured on the source (tools/grid.py, profiles, contour and skeleton traces of frames
// 815-818; the tracers are in s09/trace/). The head and shoulder are engraved at 2x and composited through a 2x
// scratch canvas that is box-filtered down, so the fine knit/print texture keeps the same sharpness at every
// sub-pixel phase of the sway (a 1x plate drawn at fractional offsets goes soft and shimmers).
import { W, H } from "../config.js";
import { Plate, grey } from "../lib/engrave.js";
import { taper } from "../lib/ink.js";
import { sampleCurve } from "../lib/paths.js";
import { rng, hash, noise2, clamp } from "../lib/rng.js";
import { owlLayer, owlPose, HERO_PLACE } from "../lib/owlInk.js";
import { FLICKS } from "./s09/flicks.js";
import { CHEEK_T, SHIRT_T } from "./s09/cheek.js";
import { STRANDS } from "./s09/strands.js";
import { paintRoom, pre } from "./s09/room.js";

// s12 is loaded by the shot table before the first frame is rendered; a failed load leaves the kit fallback.
let S12 = null;
import("./s12.js").then((m) => { S12 = (m && m.shot) || null; }, () => { S12 = null; });

// ---------- measured sway (camtrack vs 32.60): [t, tx, ty, rot°] (rotation about the frame origin) ----------
// Checked by phase correlation per region: the beanie, cuff, cheek and lower hair move as this rigid motion
// predicts to within ~0.6 px (the beanie −5.2 px at 32.92, the lower hair only −2.8 px: that is the rotation).
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
const SS = 2;   // supersampling of the moving plates
const M = 24;   // plates carry a margin so the sway never shows an edge
const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const linear = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
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
// a plate covering frame rect [x0,y0,x1,y1] (drawn in frame coordinates), supersampled s×
function plateAt(x0, y0, x1, y1, s = SS) {
  const P = new Plate(x1 - x0, y1 - y0, s);
  for (const g of [P.v, P.d, P.o]) g.translate(-x0, -y0);
  P.x0 = x0; P.y0 = y0; P.s = s;
  return P;
}
function inside(path, x, y) {
  if (!inside.g) inside.g = document.createElement("canvas").getContext("2d");
  const g = inside.g; g.beginPath(); path(g); return g.isPointInPath(x, y);
}
// print screen: dark dots on a 45° lattice ((c,c),(c,-c) basis; c = 2.9 px gives the 4.1 px period along both
// diagonals measured by FFT on the source knit, cuff and crown), dot size jittered per dot; multiplied into a value map
function screen(g, clip, box, { c = 2.9, r0 = 1.2, r1 = 1.75, v = 0.5, seed = 1, jit = 0.45, rad = null, soft = 1 } = {}) {
  const [x0, y0, x1, y1] = box;
  g.save(); g.beginPath(); clip(g); g.clip();
  g.globalCompositeOperation = "multiply";
  const P = [new Path2D(), new Path2D(), new Path2D()], Hh = new Path2D();
  for (let j = Math.floor(y0 / c); j * c <= y1; j++) for (let i = Math.floor(x0 / c); i * c <= x1; i++) {
    if ((i + j) & 1) continue;
    const h1 = hash(i, j, seed), h2 = hash(j, i, seed + 7), h3 = hash(i + 91, j - 17, seed), h4 = hash(i - 5, j + 33, seed + 3);
    const x = i * c + (h1 - 0.5) * jit, y = j * c + (h2 - 0.5) * jit;
    const rr = rad ? rad(x, y, h3) : r0 + (r1 - r0) * h3;
    if (rr <= 0.05) continue;
    const p = P[Math.floor(h4 * 3)];
    p.moveTo(x + rr * 0.72, y); p.arc(x, y, rr * 0.72, 0, Math.PI * 2);
    if (soft) { Hh.moveTo(x + rr * 1.12, y); Hh.arc(x, y, rr * 1.12, 0, Math.PI * 2); }
  }
  // a pale halo round every dot (the source screen is soft), then the dark cores
  if (soft) { g.fillStyle = grey(0.8); g.fill(Hh); }
  P.forEach((p, k) => { g.fillStyle = grey(Math.min(1, (v + 0.08 * (k - 1)) / (soft ? 0.8 : 1))); g.fill(p); });
  g.restore();
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
// a band just inside a right silhouette (the lit knit rim)
const rimBand = (edge, w) => [...edge, ...edge.slice().reverse().map(([x, y]) => [x - w, y])];

// hair mass (below the cuff, left of the shoulder slab) and the pale cheek with the lock spikes cut into it (traced)
const HAIR = [...CUFF_BOT, [470, 512], [560, 516], [650, 524], [720, 545], [790, 600], [805, 700], [770, 722], [745, 745], [700, 800], [640, 870], [560, 946], [560, 990], [-40, 990]];
const CHEEK = [[-40, 704], [-40, 990], [172, 990], ...CHEEK_T.slice(2)];
// the lit neck under the hair (a narrow wedge, measured 205,812 → 185–262 at the frame bottom)
const NECK = [[205, 812], [214, 824], [226, 856], [240, 892], [252, 920], [263, 946], [266, 990], [170, 990], [174, 946], [184, 905], [196, 858]];

function knitRibs(o, shape, xr, y0, y1, fs, lean, yMid, seed) {
  const r = rng(seed);
  o.save(); o.beginPath(); poly(shape)(o); o.clip();
  for (const f of fs) {
    const pts = [];
    const ph = r() * 6;
    for (let y = y0; y <= y1 + 1; y += 10) pts.push([-30 + (xr(y) + 30) * f + lean * (y - yMid) * (1 - f) + Math.sin(y * 0.11 + ph) * 0.9, y]);
    const bold = f > 0.55;
    const w = bold ? 3.4 + 1.6 * r() : 2.4 + 1.0 * r();
    const al = bold ? 0.7 + 0.25 * r() : 0.4 + 0.45 * r();
    // some ribs break, and toward the turning edge some are doubled by a thinner line
    const cut = r() < 0.3 ? [0.2 + r() * 0.6, 0.04 + r() * 0.08] : null;
    const runs = cut ? [pts.slice(0, Math.floor(pts.length * cut[0])), pts.slice(Math.ceil(pts.length * (cut[0] + cut[1])))] : [pts];
    for (const run of runs) if (run.length > 1) taper(o, run, (u) => w * (0.75 + 0.25 * Math.sin(Math.PI * u * 3 + ph)), dark(al));
    if (f > 0.6 && r() < 0.45) taper(o, pts.map(([x, y]) => [x + 3.2, y]), (u) => w * 0.45 * Math.sin(Math.PI * u), dark(al * 0.7));
  }
  o.restore();
}
function knitCourses(o, shape, topY, botY, n, x0, x1, fadeA, fadeB, bend, seed, wk = 1) {
  const r = rng(seed);
  o.save(); o.beginPath(); poly(shape)(o); o.clip();
  for (let k = 1; k < n; k++) {
    const v = (k + (r() - 0.5) * 0.25) / n;
    const pts = [];
    for (let x = x0; x <= x1; x += 8) pts.push([x, topY(x) + (botY(x) - topY(x)) * v + bend(x, v) + Math.sin(x * 0.2 + k) * 0.6]);
    const gr = o.createLinearGradient(fadeA, 0, fadeB, 0);
    gr.addColorStop(0, dark(0)); gr.addColorStop(1, dark(0.92));
    const w = (2.6 + 1.6 * r()) * wk;
    taper(o, pts, (u) => w * (0.7 + 0.3 * Math.sin(u * 23 + k)), gr);
  }
  o.restore();
}

function paintBeanie(P) {
  const o = P.o;
  // value study: a light knit, lit from the left, turning into shadow on the right. The field between the
  // print dots is bright (the source's lit knit reads ~195 between ~95 dots); on the shadow side the cells stay
  // fairly bright and the dark comes from heavier ribs and courses (pre-grade: the vignette takes ~25% here)
  P.fill(poly(CROWN), linear(-40, 0, 400, 0, [[0, 0.93], [0.28, 0.93], [0.37, 0.88], [0.47, 0.79], [0.58, 0.72], [0.7, 0.65], [0.82, 0.58], [0.92, 0.52], [1, 0.47]]), 1.57, { style: 2 });
  P.fill(poly(CUFF), linear(-40, 0, 450, 0, [[0, 0.93], [0.35, 0.93], [0.43, 0.86], [0.53, 0.77], [0.6, 0.71], [0.73, 0.62], [0.9, 0.54], [1, 0.49]]), 1.57, { style: 2 });
  // lit knit rim just inside the turning edges
  P.light(poly(rimBand(CROWN_R.slice(4), 16)), linear(330, 0, 400, 0, [[0, 0.52], [1, 0.72]]), "lighten", 1);
  P.light(poly(rimBand(CUFF_R.slice(3, 11), 14)), linear(430, 0, 476, 0, [[0, 0.58], [1, 0.72]]), "lighten", 1);
  // the crown's lower edge overhangs the cuff and falls into shadow toward the fold (measured: ~40 px, darker to the right)
  for (let k = 0; k < 8; k++) P.light(poly([...FOLD.map(([x, y]) => [x, y - 44 + k * 5.5 - Math.max(0, x - 150) * 0.04]), ...FOLD.slice().reverse().map(([x, y]) => [x, y + 2])]), 0.88, "multiply", 1);
  // the print screen over both
  screen(P.v, poly(CROWN), [-40, -40, 420, 300], { seed: 3 });
  screen(P.v, poly(CUFF), [-40, 250, 490, 570], { seed: 4 });
  // ribs: measured positions (crown y=80/150/220, cuff y=330/470) as fractions of the width, compressing toward the
  // turning edge; crown ribs lean right going down, cuff ribs lean left
  knitRibs(o, CROWN, crownXR, -40, 290, [0.09, 0.2, 0.31, 0.42, 0.53, 0.63, 0.7, 0.76, 0.81, 0.855, 0.895, 0.93, 0.96, 0.985], 0.17, 150, 5);
  knitRibs(o, CUFF, cuffXR, 250, 570, [0.1, 0.18, 0.26, 0.355, 0.44, 0.52, 0.6, 0.66, 0.7, 0.77, 0.81, 0.845, 0.88, 0.91, 0.94, 0.965, 0.985], -0.16, 400, 6);
  // courses: the dark horizontal grid, fading in toward the shadow side (~12.5 px apart, measured)
  knitCourses(o, CROWN, () => -40, foldY, 25, 100, 420, 120, 270, (x, v) => (x > 250 ? 12 * Math.pow((x - 250) / 150, 2) * (1 - v) : 0), 7, 1.1);
  knitCourses(o, CUFF, foldY, cuffBotY, 22, 140, 490, 170, 300, () => 0, 8, 1.1);
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
// the slab's upper-left edge (hair to its left): x of the edge at height y
const slabEdgeX = (y) => (y < 740 ? 820 : lookup([[757, 740], [728, 770], [696, 800], [666, 830], [639, 860], [614, 890], [591, 920], [570, 946]].slice().reverse(), y, 1));

function paintHair(P) {
  const o = P.o;
  // pale cheek (bottom left) with the thin black lock spikes cut into it (traced contour; pre-grade value: the
  // vignette takes ~28% here), a light 45° print tone where the hair shades it
  P.fill(poly(CHEEK), linear(0, 700, 170, 946, [[0, 0.9], [0.5, 0.96], [1, 0.98]]), 1.2, { style: 2 });
  const shadeCheek = [[70, 756], [90, 786], [110, 809], [126, 822], [131, 846], [118, 836], [98, 818], [82, 798], [74, 778]];
  screen(P.v, poly(shadeCheek), [60, 740, 140, 860], { r0: 0.7, r1: 1.2, v: 0.55, seed: 9 });
  const shadeCheek2 = [[26, 752], [36, 770], [50, 806], [56, 836], [58, 870], [48, 846], [38, 812], [30, 786]];
  screen(P.v, poly(shadeCheek2), [20, 740, 70, 880], { r0: 0.6, r1: 1.0, v: 0.6, seed: 10 });
  // the lit neck: a narrow bright wedge crossed by a bold dark diamond net (lines at ~68° and ~124°, ~9 px apart)
  P.fill(poly(NECK), linear(210, 820, 225, 946, [[0, 0.45], [0.35, 0.74], [1, 0.8]]), 1.2, { style: 2 });
  o.save(); o.beginPath(); poly(NECK)(o); o.clip();
  const nr = rng(12);
  for (const a of [1.2, 1.92]) {
    const d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
    for (let k = -14; k <= 14; k++) {
      const c = [220 + n[0] * k * 8.4 + (nr() - 0.5) * 2, 890 + n[1] * k * 8.4];
      taper(o, [[c[0] - d[0] * 110, c[1] - d[1] * 110], [c[0] + d[0] * 110, c[1] + d[1] * 110]], 2.8 + nr() * 1.6, dark(0.8 + 0.15 * nr()));
    }
  }
  line(o, [[205, 812], [226, 856], [246, 905], [264, 946]], 3.2, dark(0.95), 6, 0.6);
  o.restore();
  // an earring hook on the cheek
  o.strokeStyle = "#141414"; o.lineWidth = 2.4; o.lineCap = "round";
  o.beginPath(); o.moveTo(95, 878); o.lineTo(96, 897); o.arc(90.5, 897, 5.5, 0, Math.PI * 0.95); o.stroke();

  // strands: clipped to the hair (not over the cuff, not over the cheek)
  o.save();
  o.beginPath(); poly(HAIR)(o); poly(CHEEK)(o); o.clip("evenodd");
  const r = rng(71);
  // a faint haze of dim strands along the flow (the source hair is almost solid black between the flicks)
  const hairPath = poly(HAIR), cheekPath = poly(CHEEK), neckPath = poly(NECK);
  for (let gy = 560; gy < 960; gy += 26) for (let gx = -30; gx < 800; gx += 26) {
    const x = gx + r() * 26, y = gy + r() * 26, L = 90 + r() * 150, a0 = r(), w0 = r();
    if (!inside(hairPath, x, y) || inside(cheekPath, x, y) || inside(neckPath, x, y)) continue;
    if (x > 380 && r() < 0.85) continue;
    const n = noise2(x / 80, y / 60, 3);
    if (n < -0.1) continue;
    const q = streamline(x, y, L, 5);
    taper(o, sampleCurve(q.filter((_, i) => i % 3 === 0 || i === q.length - 1), 4), (u) => (0.6 + 0.6 * w0) * Math.pow(Math.sin(Math.PI * u), 0.7), ink(clamp((0.03 + 0.08 * a0) * (0.7 + n), 0, 0.14)));
  }
  // the striped shirt showing between the black locks at the bottom edge (traced zones; stripes ~5 px apart)
  const shirt = SHIRT_T.map((z) => poly(z));
  o.save(); o.beginPath(); for (const z of shirt) z(o); o.clip();
  const sr = rng(13);
  for (let x = 300; x < 640; x += 4.4 + sr() * 1.6) {
    const x2 = x - 3 + sr() * 2, w = 1.8 + sr() * 1.4;
    taper(o, [[x + 2, 820], [x2, 950]], w, ink(0.62 + 0.3 * sr()));
  }
  o.restore();
  const inShirt = (x, y) => shirt.some((z) => inside(z, x, y));
  // the traced highlight flicks: crisp, pointed at both ends (no pasted sheen)
  for (const [v, w, pts] of FLICKS) {
    let cx = 0, cy = 0; for (const p of pts) { cx += p[0]; cy += p[1]; } cx /= pts.length; cy /= pts.length;
    if (cx > slabEdgeX(cy) - 4) continue;             // slab texture, not hair
    if (inside(neckPath, cx, cy)) continue;           // the neck net is drawn above
    if (cy > 860 && inShirt(cx, cy)) continue;        // the shirt stripes are drawn above
    const q = sampleCurve(pts, 4);
    const a = clamp(pre(v, cx, cy) * 1.12, 0.25, 1);
    const ww = clamp(w, 1.2, 4.5);
    taper(o, q, (u) => ww * Math.pow(Math.sin(Math.PI * clamp(u * 0.96 + 0.02)), 0.75), ink(a));
  }
  // bright strands falling past the neck (steep, slightly curved; measured 250-330 x 830-946)
  for (const [pts, w, a] of [[[[256, 846], [266, 880], [276, 912]], 2.4, 0.85], [[[262, 822], [272, 862], [282, 905], [288, 946]], 1.6, 0.7], [[[270, 810], [280, 850], [290, 900], [296, 946]], 1.4, 0.6], [[[318, 890], [322, 920], [324, 946]], 2.6, 0.85]])
    taper(o, sampleCurve(pts, 6), (u) => w * Math.pow(Math.sin(Math.PI * u), 0.7), ink(a));
  // the lit tips of a lock (a bright ragged patch, measured at 90-155 × 660-725)
  // broad soft strokes running down-right (~50°), the brightest part of the hair
  for (const [a, b2, w, al] of [[[100, 668], [140, 712], 8, 0.9], [[112, 664], [152, 706], 7, 0.85], [[96, 684], [128, 718], 6, 0.85], [[122, 676], [156, 716], 6, 0.9], [[106, 676], [146, 722], 5, 0.8], [[130, 662], [150, 690], 5, 0.8], [[92, 694], [118, 724], 4, 0.75]])
    taper(o, [a, [(a[0] + b2[0]) / 2 + 1, (a[1] + b2[1]) / 2 - 1], b2], (u) => w * Math.pow(Math.sin(Math.PI * u), 0.6), ink(al));
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

function hatchIn(o, clip, box, ang, gap, { len = [40, 120], w = [0.8, 1.6], a = [0.3, 0.6], color = dark, seed = 1, bow = 0, alphaAt = null }) {
  const r = rng(seed);
  const [x0, y0, x1, y1] = box, d = [Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]];
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2;
  o.save(); o.beginPath(); clip(o); o.clip();
  for (let s = -R; s <= R; s += gap * (0.75 + 0.5 * r())) {
    let t = -R - r() * len[1];
    while (t < R) {
      const L = len[0] + (len[1] - len[0]) * r(), g2 = r() * len[0] * 0.3;
      const A = [cx + n[0] * s + d[0] * t, cy + n[1] * s + d[1] * t], B = [A[0] + d[0] * L, A[1] + d[1] * L];
      const mid = [(A[0] + B[0]) / 2 + n[0] * bow * (r() - 0.5), (A[1] + B[1]) / 2 + n[1] * bow * (r() - 0.5)];
      let al = a[0] + (a[1] - a[0]) * r();
      if (alphaAt) al *= alphaAt(mid[0], mid[1]);
      if (al > 0.01) { const ww = w[0] + (w[1] - w[0]) * r(); taper(o, [A, mid, B], (u) => ww * Math.pow(Math.sin(Math.PI * u), 0.6), color(al)); }
      t += L + g2;
    }
  }
  o.restore();
}

function paintShoulder(P) {
  const o = P.o, r = rng(61);
  // right plane (under the owl's belly): lit near the crease and under the belly, hatched densely at ~135°
  // (FFT on the source: 129-153°), fading into the black toward its far end (x 1450-1560)
  P.fill(poly(SLAB_R), linear(0, 826, 0, 946, [[0, 0.74], [0.4, 0.76], [1, 0.82]]), 2.15, { style: 2 });
  P.light(poly(SLAB_R), linear(1370, 0, 1480, 0, [[0, 1], [1, 0]]), "multiply", 1);
  // the band right under the belly is in the owl's shadow (x > 1050)
  P.light(poly([[1050, 846], [1150, 868], [1260, 882], [1380, 892], [1380, 916], [1260, 906], [1150, 894], [1050, 868]]), linear(1030, 0, 1120, 0, [[0, 1], [1, 0.72]]), "multiply", 1);
  // left plane: lit toward the lower left, darker under the top edge
  P.fill(poly(SLAB_L), linear(905, 775, 640, 946, [[0, 0.62], [0.3, 0.78], [0.62, 0.94], [1, 1]]), 2.2, { style: 2 });
  P.fill(poly(CREASE), 0.02, 0, { style: 2 });
  // left plane texture: fine grain every ~2.8 px at 2.2 rad, a cross-hatched band under the top edge
  const clipL = poly(SLAB_L);
  hatchIn(o, clipL, [540, 700, 960, 990], 2.2, 2.8, { len: [60, 200], w: [0.7, 1.2], a: [0.1, 0.24], seed: 62, alphaAt: (x, y) => clamp(1.2 - (y - 760) / 180 - (820 - x) / 380, 0.12, 1) });
  const topDir = Math.atan2(803 - 718, 950 - 768);
  const dTop = (x, y) => y - lookup(SLAB_TOP, x, 0);   // depth under the top edge
  const weave = (x, y) => clamp(1.1 - dTop(x, y) / 130, 0, 1) * clamp((x - 640) / 120, 0, 1);
  hatchIn(o, clipL, [600, 690, 960, 946], topDir, 5.2, { len: [8, 26], w: [0.9, 1.6], a: [0.35, 0.6], seed: 63, alphaAt: weave });
  hatchIn(o, clipL, [600, 690, 960, 946], 2.0, 5.6, { len: [30, 90], w: [0.9, 1.5], a: [0.3, 0.5], seed: 64, alphaAt: weave });
  // folds: dark strokes leaving the top edge every ~11 px, running down-left and bowing a little
  o.save(); o.beginPath(); clipL(o); o.clip();
  const topQ = sampleCurve(SLAB_TOP.slice(3), 8);
  for (let i = 0; i < 18; i++) {
    const p0 = topQ[Math.min(topQ.length - 1, Math.floor(((i + 0.2 + r() * 0.6) / 18) * topQ.length))];
    const L = 100 + r() * 150, a = 2.2 + (r() - 0.5) * 0.14, bow = (r() - 0.4) * 14;
    const d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
    const s0 = [p0[0] - 2 + r() * 6, p0[1] + 6 + r() * 14];
    line(o, [s0, [s0[0] + d[0] * L * 0.5 + n[0] * bow, s0[1] + d[1] * L * 0.5 + n[1] * bow], [s0[0] + d[0] * L, s0[1] + d[1] * L]], 1.4 + r() * 1.6, dark(0.55 + 0.35 * r()), 8, 0.12);
  }
  for (let i = 0; i < 9; i++) {
    const x0 = 720 + r() * 190, y0 = 760 + (x0 - 720) * 0.3 + r() * 20, L = 150 + r() * 110, a = 2.25 + (r() - 0.5) * 0.1;
    line(o, [[x0, y0], [x0 + Math.cos(a) * L * 0.5 + 5, y0 + Math.sin(a) * L * 0.5], [x0 + Math.cos(a) * L, y0 + Math.sin(a) * L]], 1.2 + r() * 1.3, dark(0.3 + 0.2 * r()), 8, 0.12);
  }
  // white highlight streaks toward the lit lower left
  for (let i = 0; i < 9; i++) {
    const x0 = 650 + r() * 150, y0 = 842 + r() * 60, L = 50 + r() * 90, a = 2.2 + (r() - 0.5) * 0.08;
    taper(o, [[x0, y0], [x0 + Math.cos(a) * L, y0 + Math.sin(a) * L]], (u) => (2 + r() * 2.5) * Math.pow(Math.sin(Math.PI * u), 0.6), ink(0.75));
  }
  o.restore();
  // right plane: dense dark hatching, a cross-hatched patch by the crease, darker to the right
  const clipR = poly(SLAB_R);
  const shadeR = (x, y) => clamp(0.45 + (x - 1000) / 380, 0.4, 1.15) * clamp(1.15 - (y - 880) / 220, 0.7, 1.15);
  const fineR = (x, y) => clamp(0.3 + (x - 1040) / 260, 0.25, 1.5);
  const bandW = (x, a, b) => clamp((x - a) / 30, 0, 1) * clamp((b - x) / 30, 0, 1);
  for (const [a, b, ang, sd] of [[930, 1130, 2.18, 65], [1100, 1250, 2.45, 69], [1220, 1600, 2.68, 71]]) {
    hatchIn(o, clipR, [a, 820, b, 990], ang, 3.0, { len: [30, 100], w: [0.9, 1.5], a: [0.3, 0.5], seed: sd + 100, alphaAt: (x, y) => fineR(x, y) * bandW(x, a, b) });
    hatchIn(o, clipR, [a, 820, b, 990], ang, 5.6, { len: [60, 180], w: [1.8, 3.0], a: [0.65, 0.95], seed: sd, alphaAt: (x, y) => shadeR(x, y) * bandW(x, a, b), bow: 5 });
  }
  // the dark band right under the belly, with the bright holes of a mesh (1150-1300 x 872-912)
  const under = [[1140, 868], [1260, 881], [1320, 886], [1320, 902], [1260, 906], [1140, 890]];
  o.save(); o.beginPath(); poly(under)(o); o.clip();
  o.fillStyle = dark(0.8); o.fillRect(1130, 860, 200, 60);
  const hr = rng(72);
  for (let y = 876; y < 912; y += 4.6) for (let x = 1196 + ((y / 4.6) % 2) * 2.5; x < 1320; x += 6.5) { if (hr() < 0.25) continue; o.fillStyle = ink(0.45 + 0.35 * hr()); o.beginPath(); o.ellipse(x, y, 2.2, 1.3, -0.2, 0, 7); o.fill(); }
  o.restore();
  const crossP = [[962, 838], [1040, 842], [1030, 902], [944, 892]];
  hatchIn(o, poly(crossP), [930, 830, 1050, 910], 0.2, 4.6, { len: [20, 60], w: [1.0, 1.5], a: [0.4, 0.6], seed: 66 });
  hatchIn(o, poly(crossP), [930, 830, 1050, 910], 2.1, 4.6, { len: [20, 60], w: [1.0, 1.5], a: [0.35, 0.55], seed: 67 });
  // lit edges
  line(o, [...SLAB_LEFT.slice(1), [768, 718]], 1.8, ink(0.55), 6, 0.4);
  line(o, SLAB_TOP, 1.3, ink(0.45), 6, 0.3);
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
const ROOM_X = 1530;
const HEAD_BOX = [0, 0, 840, H], SHOULDER_BOX = [520, 680, 1600, H];
function build() {
  if (cache) return cache;
  // the room: static, drawn at 2x and box-filtered to 1x once
  const rw = W - ROOM_X;
  const R2 = document.createElement("canvas"); R2.width = rw * 2; R2.height = H * 2;
  const rg = R2.getContext("2d");
  rg.fillStyle = "#000"; rg.fillRect(0, 0, R2.width, R2.height);
  rg.setTransform(2, 0, 0, 2, -ROOM_X * 2, 0);
  paintRoom(rg);
  const room = document.createElement("canvas"); room.width = rw; room.height = H;
  const rm = room.getContext("2d"); rm.imageSmoothingEnabled = true; rm.imageSmoothingQuality = "low";
  rm.drawImage(R2, 0, 0, R2.width, R2.height, 0, 0, rw, H);
  R2.width = R2.height = 1;
  // the head and the shoulder: engraved at 2x
  const HP = plateAt(-M, -M, 840, H + M);
  paintBeanie(HP); paintHair(HP);
  const head = HP.engrave({ spacing: 4.2 * SS, seed: 29, contrast: 1.0 });
  const SP = plateAt(540, 690, 1580, H + M);
  paintShoulder(SP);
  const shoulder = SP.engrave({ spacing: 4.4 * SS, seed: 31, contrast: 1.0 });
  // the shoulder is a cut-out: keep only its silhouette so it can move over the hair on its own track
  const sg = shoulder.getContext("2d");
  sg.save(); sg.setTransform(SS, 0, 0, SS, -SP.x0 * SS, -SP.y0 * SS); sg.globalCompositeOperation = "destination-in"; sg.fillStyle = "#fff"; sg.beginPath(); poly(SLAB)(sg); sg.fill(); sg.restore();
  const owl = captureOwl() || owlLayer({ ...HERO_PLACE, ...owlPose("sit3q"), clip: [0, 0, W, H] });
  cache = { room, head, shoulder, owl, hx: HP.x0, hy: HP.y0, sx: SP.x0, sy: SP.y0, tmp: {} };
  return cache;
}
// Draw a 2x layer with the sway transform into a 2x scratch canvas, then box-filter it down 2:1 at an integer
// position (an exact 0.5 scale samples between 2x2 texels, i.e. a 2x2 box). The sub-pixel resampling blur then
// happens at 2x, where it is a quarter of a frame pixel at most, so sharpness holds as the sway crosses pixels.
function plate2(ctx, L, key, img, x0, y0, box, tab, t) {
  const [bx0, by0, bx1, by1] = box;
  const w2 = (bx1 - bx0) * SS, h2 = (by1 - by0) * SS;
  let c = L.tmp[key];
  if (!c) { c = L.tmp[key] = document.createElement("canvas"); c.width = w2; c.height = h2; }
  const g = c.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w2, h2);
  const [tx, ty, rd] = sway(tab, t);
  g.setTransform(SS, 0, 0, SS, -bx0 * SS, -by0 * SS);
  g.translate(tx, ty); g.rotate((rd * Math.PI) / 180);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "low";
  g.drawImage(img, x0, y0, img.width / SS, img.height / SS);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "low";
  ctx.drawImage(c, 0, 0, w2, h2, bx0, by0, w2 / SS, h2 / SS);
  ctx.restore();
}

export const shot = {
  draw(ctx, local, t) {
    const L = build();
    ctx.drawImage(L.room, ROOM_X, 0);
    plate2(ctx, L, "head", L.head, L.hx, L.hy, HEAD_BOX, SWAY_HEAD, t);
    plate2(ctx, L, "shoulder", L.shoulder, L.sx, L.sy, SHOULDER_BOX, SWAY_SHOULDER, t);
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
