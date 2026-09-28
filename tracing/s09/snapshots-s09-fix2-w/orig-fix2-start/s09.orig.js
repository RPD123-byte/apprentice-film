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
import { rng, hash, noise1, noise2, clamp } from "../lib/rng.js";
import { owlLayer, owlPose, HERO_PLACE } from "../lib/owlInk.js";
import { FLICKS } from "./s09/flicks.js";
import { CHEEK_T, SHIRT_T } from "./s09/cheek.js";
import { STRANDS } from "./s09/strands.js";
import { buildRoom, pre } from "./s09/room.js";

// s12 is loaded by the shot table before the first frame is rendered; a failed load leaves the kit fallback.
let S12 = null;
import("./s12.js").then((m) => { S12 = (m && m.shot) || null; }, () => { S12 = null; });

// ---------- measured sway vs 32.60: [t, tx, ty, rot°] (rotation about the frame origin, then translation) ----------
// Least-squares rigid fit, per source frame, to phase correlations of six regions of the head (beanie, crown, cuff,
// cheek, lower-left and right hair; s09/trace/fit_sway.py): residual 0.1-0.3 px rms. The beanie
// moves -5.2 px at 32.92 while the lower hair moves only -2.8 px: that difference is the rotation.
const SWAY_HEAD = [[32.6, 0, 0, 0], [32.72, 0, 0, 0], [32.76, -1.34, 0.98, -0.051], [32.8, -2.56, 1.43, -0.089], [32.84, -4.49, 2.14, -0.178], [32.88, -5.59, 2.54, -0.209], [32.92, -6.16, 2.65, -0.228], [32.96, -6.23, 2.58, -0.231], [33.0, -6.03, 2.49, -0.223], [33.04, -4.47, 1.9, -0.162], [33.08, -4.41, 1.88, -0.157], [33.12, -0.9, 0.55, -0.014], [33.16, 1.77, -0.42, 0.072], [33.2, 4.67, -1.43, 0.197], [33.24, 5.36, -1.52, 0.203], [33.28, 4.86, -1.36, 0.207], [33.32, 1.98, -0.5, 0.082], [33.36, -0.87, 0.49, -0.039], [33.4, -3.43, 1.33, -0.149], [33.44, -6.64, 2.34, -0.29], [33.48, -6.29, 2.06, -0.272], [33.52, -4.11, 1.37, -0.182], [33.56, -2.4, 0.89, -0.099], [33.6, -2.1, 0.8, -0.085]];
// the shoulder slab under the owl moves much less than the head: phase correlation on the slab's left plane (four
// windows in 600-900 x 740-946, clear of the owl; they agree within ~0.15 px), translation only
const SWAY_SHOULDER = [[32.6, 0, 0, 0], [32.72, 0, 0, 0], [32.76, -0.53, -0.11, 0], [32.8, -0.92, -0.14, 0], [32.84, -1.42, -0.23, 0], [32.88, -1.81, -0.31, 0], [32.92, -1.95, -0.42, 0], [32.96, -2.0, -0.44, 0], [33.0, -2.0, -0.45, 0], [33.04, -1.61, -0.45, 0], [33.08, -1.6, -0.47, 0], [33.12, -0.42, -0.26, 0], [33.16, 0.52, -0.06, 0], [33.2, 1.39, 0.14, 0], [33.24, 1.57, 0.34, 0], [33.28, 1.44, 0.22, 0], [33.32, 0.39, -0.09, 0], [33.36, -0.42, -0.43, 0], [33.4, -1.32, -0.63, 0], [33.44, -2.05, -1.05, 0], [33.48, -1.88, -1.03, 0], [33.52, -1.1, -0.76, 0], [33.56, -0.61, -0.5, 0], [33.6, -0.5, -0.45, 0]];
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
function screen(g, clip, box, { c = 2.9, r0 = 1.2, r1 = 1.75, v = 0.5, seed = 1, jit = 0.45, rad = null, soft = 1, square = false } = {}) {
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
    if (square) { p.rect(x - rr * 0.8, y - rr * 0.8, rr * 1.6, rr * 1.6); if (soft) Hh.rect(x - rr * 1.15, y - rr * 1.15, rr * 2.3, rr * 2.3); }
    else { p.moveTo(x + rr * 0.72, y); p.arc(x, y, rr * 0.72, 0, Math.PI * 2); if (soft) { Hh.moveTo(x + rr * 1.12, y); Hh.arc(x, y, rr * 1.12, 0, Math.PI * 2); } }
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
    for (const run of runs) {
      if (run.length < 2) continue;
      // dry brush: the rib skips along its length (1.5-3 px gaps every 15-45 px) and swells unevenly
      const dense = sampleCurve(run, 4);
      let i0 = 0;
      while (i0 < dense.length - 1) {
        const n = Math.max(2, Math.round((30 + 60 * r()) / 2.5)), i1 = Math.min(dense.length - 1, i0 + n);
        const ww = w * (0.8 + 0.35 * r());
        if (i1 - i0 >= 1) taper(o, dense.slice(i0, i1 + 1), (u) => ww * (0.75 + 0.25 * Math.sin(Math.PI * u)), dark(al * (0.85 + 0.15 * r())));
        i0 = i1 + (r() < 0.5 ? 1 : 0);
      }
    }
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
    const w0 = (2.0 + 1.3 * r()) * wk;
    const dense = sampleCurve(pts, 3);
    let i0 = 0;
    while (i0 < dense.length - 1) {
      const n = Math.max(2, Math.round((35 + 70 * r()) / 2.7)), i1 = Math.min(dense.length - 1, i0 + n);
      const mx = dense[Math.floor((i0 + i1) / 2)][0];
      const al = 0.92 * clamp((mx - fadeA) / (fadeB - fadeA), 0, 1);
      const ww = w0 * (0.6 + 0.8 * r());
      if (al > 0.06 && r() > 0.04) taper(o, dense.slice(i0, i1 + 1), (u) => ww * (0.7 + 0.3 * Math.sin(Math.PI * u)), dark(al * (0.8 + 0.2 * r())));
      i0 = i1 + (r() < 0.6 ? 0 : 1);
    }
  }
  o.restore();
}

// a silhouette polyline redrawn by hand: resampled every 3 px, x nudged +-1.5 px at a 7-10 px period
function knitEdge(pts, seed) {
  const q = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
    for (let k = 0; k < n; k++) q.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  q.push(pts[pts.length - 1]);
  return q.map(([x, y], i) => (i === 0 || i === q.length - 1 ? [x, y] : [x + 1.1 * noise1(y / 8.5, seed) + 0.5 * noise1(y / 3.2, seed + 1), y]));
}
function paintBeanie(P) {
  const o = P.o;
  const CROWNW = [[-40, -40], ...knitEdge(CROWN_R, 41), ...FOLD.slice(0, -1).reverse()];
  const CUFFW = [...FOLD, ...knitEdge(CUFF_R, 42).slice(1), ...CUFF_BOT.slice(0, -1).reverse()];
  // value study: a light knit, lit from the left, turning into shadow on the right. The field between the
  // print dots is bright (the source's lit knit reads ~195 between ~95 dots); on the shadow side the cells stay
  // fairly bright and the dark comes from heavier ribs and courses (pre-grade: the vignette takes ~25% here)
  P.fill(poly(CROWNW), linear(-40, 0, 400, 0, [[0, 0.93], [0.28, 0.93], [0.37, 0.9], [0.47, 0.82], [0.58, 0.76], [0.7, 0.69], [0.82, 0.62], [0.92, 0.55], [1, 0.49]]), 1.57, { style: 2 });
  P.fill(poly(CUFFW), linear(-40, 0, 450, 0, [[0, 0.9], [0.35, 0.9], [0.43, 0.86], [0.53, 0.79], [0.6, 0.73], [0.73, 0.63], [0.9, 0.53], [1, 0.46]]), 1.57, { style: 2 });
  // the cuff rolls under: its lower ~45 px darken to ~0.55 (source x=100: 168 -> 95 over y 510-550)
  for (let x = -40; x < 440; x += 16) {
    const yb = cuffBotY(x + 8);
    P.light(poly([[x, yb - 48], [x + 16.5, yb - 48], [x + 16.5, yb + 3], [x, yb + 3]]), (g) => { const gr = g.createLinearGradient(0, yb - 46, 0, yb); gr.addColorStop(0, grey(1)); gr.addColorStop(0.5, grey(0.8)); gr.addColorStop(1, grey(0.52)); return gr; }, "multiply", 1);
  }
  // lit knit rim just inside the turning edges
  P.light(poly(rimBand(CROWN_R.slice(4), 16)), linear(330, 0, 400, 0, [[0, 0.52], [1, 0.72]]), "lighten", 1);
  P.light(poly(rimBand(CUFF_R.slice(3, 11), 14)), linear(430, 0, 476, 0, [[0, 0.58], [1, 0.72]]), "lighten", 1);
  // the crown's lower edge overhangs the cuff and falls into shadow toward the fold (measured: ~40 px, darker to the right)
  for (let k = 0; k < 8; k++) P.light(poly([...FOLD.map(([x, y]) => [x, y - 44 + k * 5.5 - Math.max(0, x - 150) * 0.04]), ...FOLD.slice().reverse().map(([x, y]) => [x, y + 2])]), 0.92, "multiply", 1);
  // the print screen over both
  // (the source screen reads as a soft checker: square dark marks on the 45° lattice)
  screen(P.v, poly(CROWNW), [-40, -40, 420, 300], { seed: 3, square: true, r0: 0.9, r1: 1.7, v: 0.52, jit: 0.9 });
  screen(P.v, poly(CUFFW), [-40, 250, 490, 570], { seed: 4, square: true, r0: 0.9, r1: 1.7, v: 0.52, jit: 0.9 });
  // shading hatch where the knit turns away from the light (dark strokes running down-left, ~120°)
  hatchIn(o, poly(CROWNW), [80, -40, 420, 292], 2.1, 3.6, { len: [18, 56], w: [1.0, 1.7], a: [0.4, 0.68], seed: 21, alphaAt: (x, y) => clamp((x - 110) / 100, 0, 1) });
  hatchIn(o, poly(CUFFW), [150, 250, 490, 570], 2.1, 4.0, { len: [16, 48], w: [1.0, 1.6], a: [0.32, 0.56], seed: 22, alphaAt: (x, y) => clamp((x - 180) / 110, 0, 1) });
  // the overhang under the crown: dense dark courses in its shadow band
  const ovh = [...FOLD.map(([x, y]) => [x, y - 40 - Math.max(0, x - 150) * 0.04]), ...FOLD.slice().reverse().map(([x, y]) => [x, y + 2])];
  hatchIn(o, poly(ovh), [60, 200, 420, 292], -0.08, 4.2, { len: [30, 90], w: [1.0, 1.8], a: [0.3, 0.55], seed: 23, alphaAt: (x, y) => clamp((x - 80) / 120, 0, 1) * clamp((y - foldY(x) + 44) / 30, 0.2, 1) });
  // ribs: measured positions (crown y=80/150/220, cuff y=330/470) as fractions of the width, compressing toward the
  // turning edge; crown ribs lean right going down, cuff ribs lean left
  knitRibs(o, CROWNW, crownXR, -40, 290, [0.09, 0.2, 0.31, 0.42, 0.53, 0.63, 0.7, 0.76, 0.81, 0.855, 0.895, 0.93, 0.96, 0.985], 0.17, 150, 5);
  knitRibs(o, CUFFW, cuffXR, 250, 570, [0.1, 0.18, 0.26, 0.355, 0.44, 0.52, 0.6, 0.66, 0.7, 0.77, 0.81, 0.845, 0.88, 0.91, 0.94, 0.965, 0.985], -0.16, 400, 6);
  // courses: the dark horizontal grid, fading in toward the shadow side (~12.5 px apart, measured)
  knitCourses(o, CROWNW, () => -40, foldY, 25, 100, 420, 120, 270, (x, v) => (x > 250 ? 12 * Math.pow((x - 250) / 150, 2) * (1 - v) : 0), 7, 1.1);
  knitCourses(o, CUFFW, foldY, cuffBotY, 22, 140, 490, 170, 300, () => 0, 8, 1.1);
  // short vertical dark ticks just above the fold (the crown's knit bunching, x 150-390) and along the cuff's rolled edge
  const tr = rng(24);
  for (let i = 0; i < 32; i++) {
    const x = 150 + (i + tr()) * 7.5, y1 = foldY(x) - 2 - tr() * 3, L = 6 + tr() * 12, w = 1.2 + tr() * 1.3;
    taper(o, [[x, y1 - L], [x + 0.3, y1 - L / 2], [x + 0.5, y1]], (u) => w * Math.pow(Math.sin(Math.PI * clamp(u * 0.9 + 0.05)), 0.5), dark(0.45 + 0.35 * tr()));
  }
  for (let x = -30; x < 430; x += 3.5 + tr() * 3) {
    const y1 = cuffBotY(x) - 1 - tr() * 2, L = 8 + tr() * 12, w = 1.2 + tr() * 1.4;
    taper(o, [[x, y1 - L], [x + 0.3, y1 - L / 2], [x + 0.6, y1]], (u) => w * Math.pow(Math.sin(Math.PI * clamp(u * 0.9 + 0.05)), 0.5), dark(0.4 + 0.2 * tr()));
  }
  // the fold between crown and cuff, the cuff's lower edge, a keyline on the turning edges
  line(o, FOLD, 5.5, "#060606", 6, 0.6);
  line(o, CUFF_BOT.slice().reverse(), 3, "#060606", 6, 0.6);
  line(o, knitEdge(CROWN_R, 41).slice(1), 2.2, dark(0.9), 1, 0.6);
  line(o, knitEdge(CUFF_R, 42), 2.4, dark(0.9), 1, 0.6);
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
  P.fill(poly(NECK), linear(210, 820, 225, 946, [[0, 0.34], [0.35, 0.56], [1, 0.62]]), 1.2, { style: 2 });
  o.save(); o.beginPath(); poly(NECK)(o); o.clip();
  const nr = rng(12);
  for (const a of [1.2, 1.92]) {
    const d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
    let off = -118;
    while (off < 118) {
      const c = [220 + n[0] * off, 890 + n[1] * off];
      // each line of the net breaks into 20-50 px runs, 1.2-1.8 px wide
      let t = -115 + nr() * 10;
      while (t < 115) {
        const L = 20 + nr() * 30, w = 1.5 + nr() * 0.8, al = 0.5 + 0.2 * nr();
        const pts = []; for (let k = 0; k <= 6; k++) { const tt = t + L * k / 6; pts.push([c[0] + d[0] * tt, c[1] + d[1] * tt]); }
        taper(o, pts, (u) => w * (0.6 + 0.4 * Math.sin(Math.PI * u)), dark(al));
        t += L + 2 + nr() * 6;
      }
      off += 8.4 * (0.75 + 0.5 * nr());
    }
  }
  line(o, [[205, 812], [226, 856], [246, 905], [264, 946]], 3.2, dark(0.95), 6, 0.6);
  // black locks falling across the neck, pointed at their lower ends
  for (const [pts, w] of [[[[214, 822], [206, 880], [194, 946]], 6], [[[232, 852], [228, 900], [218, 950]], 5], [[[224, 866], [238, 908], [250, 950]], 4], [[[200, 856], [188, 902], [178, 946]], 6]])
    taper(o, sampleCurve(pts, 6), (u) => w * Math.pow(1 - u, 0.7), dark(0.97));
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
  const cloth = o.createLinearGradient(300, 0, 600, 0);
  cloth.addColorStop(0, ink(0.62)); cloth.addColorStop(0.3, ink(0.64)); cloth.addColorStop(0.43, ink(0.95)); cloth.addColorStop(0.57, ink(0.92)); cloth.addColorStop(0.68, ink(0.5)); cloth.addColorStop(1, ink(0.55));
  o.fillStyle = cloth; o.fillRect(300, 830, 340, 130);
  for (let x = 280; x < 640; x += 4.4 + sr() * 1.6) {
    const w = 1.4 + sr() * 0.8, al = 0.4 + 0.25 * sr();
    taper(o, [[x - 12, 880], [x, 915], [x + 12, 950]], w, dark(al));
  }
  o.restore();
  const inShirt = (x, y) => shirt.some((z) => inside(z, x, y));
  // the traced highlight flicks: crisp, pointed at both ends (no pasted sheen)
  for (const [fi, [v, w, pts]] of FLICKS.entries()) {
    if (fi === 31) continue;                          // a hooked flick over the shirt read as a stray white curl
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
  // broad soft strokes running down-right (~50°) over a dim sheen: the brightest part of the hair
  // (source: a cluster of elongated streaks along the lock, 81-160 x 667-729)
  const lr = rng(88);
  // two clumps of streaks (centred ~ (108, 692) and (137, 706)) that merge into bright masses
  for (let i = 0; i < 15; i++) {
    const a = 0.85 + lr() * 0.1, L = 30 + lr() * 30, w = 3 + lr() * 3;
    const cl = i % 2 ? [137, 706] : [108, 692];
    const x0 = cl[0] - Math.cos(a) * L * 0.5 + (lr() - 0.5) * 14, y0 = cl[1] - Math.sin(a) * L * 0.5 + (lr() - 0.5) * 10;
    const x1 = Math.min(160, x0 + Math.cos(a) * L), y1 = Math.min(729, y0 + Math.sin(a) * L);
    const bow = (lr() - 0.5) * 3, pts = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([x0 + (x1 - x0) * t - Math.sin(a) * bow * Math.sin(Math.PI * t), y0 + (y1 - y0) * t + Math.cos(a) * bow * Math.sin(Math.PI * t)]); }
    taper(o, pts, (u) => w * Math.pow(Math.sin(Math.PI * u), 0.7), ink(0.7 + 0.25 * lr()));
  }
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
  P.light(poly(SLAB_R), linear(1100, 0, 1300, 0, [[0, 1], [1, 0.8]]), "multiply", 1);
  // the band right under the belly is in the owl's shadow (x > 1050)
  P.light(poly([[1050, 846], [1150, 868], [1260, 882], [1380, 892], [1380, 916], [1260, 906], [1150, 894], [1050, 868]]), linear(1030, 0, 1120, 0, [[0, 1], [1, 0.72]]), "multiply", 1);
  // left plane: lit toward the lower left, darker under the top edge
  P.fill(poly(SLAB_L), linear(905, 775, 640, 946, [[0, 0.56], [0.3, 0.74], [0.62, 0.94], [1, 1]]), 2.2, { style: 2 });
  // the upper band of the left plane is dimmer than the lit lower left (source 700-820 x 770-840: mean 139)
  P.light(poly(SLAB_L), linear(0, 760, 0, 860, [[0, 0.85], [0.8, 0.85], [1, 1]]), "multiply", 1);
  P.fill(poly(CREASE), 0.02, 0, { style: 2 });
  // right of the crease a mid-dark shadow band ~28 px wide (source: y 880 x 914-946 reads 17-48; y 920 x 890-930 28-101)
  const crN = [0.84, 0.54];
  const band = [...CREASE_R.slice(1), ...CREASE_R.slice(1).reverse().map(([x, y]) => [x + crN[0] * 34, y + crN[1] * 34])];
  P.light(poly(band), (g) => { const A = [930, 874], B = [A[0] + crN[0] * 32, A[1] + crN[1] * 32]; const gr = g.createLinearGradient(A[0], A[1], B[0], B[1]); gr.addColorStop(0, grey(0.2)); gr.addColorStop(0.55, grey(0.55)); gr.addColorStop(1, grey(1)); return gr; }, "multiply", 1);
  // the right plane below y ~910 (x 930-1100) is lighter (source 180-215)
  P.light(poly(SLAB_R), (g) => { const gr = g.createLinearGradient(0, 895, 0, 925); gr.addColorStop(0, grey(0)); gr.addColorStop(1, grey(0.12)); return gr; }, "lighter", 1);
  // left plane texture: a fine woven grain over the whole plane (the source's canvas weave): fine strokes every
  // ~2.3 px at 2.2 rad, crossed by short ticks along the top edge's direction, both stronger under the top edge
  const clipL = poly(SLAB_L);
  const topDir = Math.atan2(803 - 718, 950 - 768);
  const dTop = (x, y) => y - lookup(SLAB_TOP, x, 0);   // depth under the top edge
  const depthW = (x, y) => clamp(1.15 - dTop(x, y) / 200, 0.45, 1);
  hatchIn(o, clipL, [540, 700, 960, 990], 2.2, 2.3, { len: [40, 160], w: [0.8, 1.2], a: [0.3, 0.45], seed: 62, alphaAt: (x, y) => depthW(x, y) * clamp((x - 560) / 80, 0, 1) });
  hatchIn(o, clipL, [540, 690, 960, 990], topDir, 3.2, { len: [6, 18], w: [0.8, 1.3], a: [0.22, 0.4], seed: 63, alphaAt: (x, y) => depthW(x, y) * clamp((x - 600) / 100, 0, 1) });
  hatchIn(o, clipL, [600, 690, 960, 946], topDir, 5.0, { len: [8, 26], w: [0.9, 1.5], a: [0.3, 0.5], seed: 64, alphaAt: (x, y) => clamp(1.1 - dTop(x, y) / 110, 0, 1) * clamp((x - 640) / 120, 0, 1) });
  // folds: dark strokes leaving the top edge every ~11 px, running down-left and bowing a little
  o.save(); o.beginPath(); clipL(o); o.clip();
  const topQ = sampleCurve(SLAB_TOP.slice(3), 8);
  for (let i = 0; i < 18; i++) {
    const p0 = topQ[Math.min(topQ.length - 1, Math.floor(((i + 0.2 + r() * 0.6) / 18) * topQ.length))];
    const L = 100 + r() * 150, a = 2.2 + (r() - 0.5) * 0.14, bow = (r() - 0.4) * 14;
    const d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
    const s0 = [p0[0] - 2 + r() * 6, p0[1] + 6 + r() * 14];
    line(o, [s0, [s0[0] + d[0] * L * 0.5 + n[0] * bow, s0[1] + d[1] * L * 0.5 + n[1] * bow], [s0[0] + d[0] * L, s0[1] + d[1] * L]], 1.0 + r() * 0.8, dark(0.35 + 0.25 * r()), 8, 0.12);
  }
  for (let i = 0; i < 9; i++) {
    const x0 = 720 + r() * 190, y0 = 760 + (x0 - 720) * 0.3 + r() * 20, L = 150 + r() * 110, a = 2.25 + (r() - 0.5) * 0.1;
    line(o, [[x0, y0], [x0 + Math.cos(a) * L * 0.5 + 5, y0 + Math.sin(a) * L * 0.5], [x0 + Math.cos(a) * L, y0 + Math.sin(a) * L]], 1.0 + r() * 1.0, dark(0.22 + 0.15 * r()), 8, 0.12);
  }
  // white highlight streaks toward the lit lower left
  for (let i = 0; i < 9; i++) {
    const x0 = 650 + r() * 150, y0 = 842 + r() * 60, L = 50 + r() * 90, a = 2.2 + (r() - 0.5) * 0.08;
    const hw = 2 + r() * 2.5, pts = []; for (let k = 0; k <= 8; k++) pts.push([x0 + Math.cos(a) * L * k / 8, y0 + Math.sin(a) * L * k / 8]);
    taper(o, pts, (u) => hw * Math.pow(Math.sin(Math.PI * u), 0.6), ink(0.55));
  }
  o.restore();
  // right plane: dense dark hatching, a cross-hatched patch by the crease, darker to the right
  const clipR = poly(SLAB_R);
  const shadeR = (x, y) => clamp(0.45 + (x - 1000) / 380, 0.4, 1.15) * clamp(1.15 - (y - 880) / 220, 0.7, 1.15) * (x < 1110 ? clamp(1 - (y - 900) / 40, 0.45, 1) : 1);
  const fineR = (x, y) => clamp(0.3 + (x - 1040) / 260, 0.25, 1.5);
  const bandW = (x, a, b) => clamp((x - a) / 30, 0, 1) * clamp((b - x) / 30, 0, 1);
  for (const [a, b, ang, sd] of [[930, 1130, 2.18, 65], [1100, 1250, 2.45, 69], [1220, 1600, 2.68, 71]]) {
    hatchIn(o, clipR, [a, 820, b, 990], ang, 3.0, { len: [30, 100], w: [0.9, 1.5], a: [0.3, 0.5], seed: sd + 100, alphaAt: (x, y) => fineR(x, y) * bandW(x, a, b) });
    hatchIn(o, clipR, [a, 820, b, 990], ang, 5.4, { len: [60, 180], w: a > 1000 ? [2.3, 3.8] : [1.8, 3.0], a: [0.7, 1.0], seed: sd, alphaAt: (x, y) => shadeR(x, y) * bandW(x, a, b), bow: 5 });
  }
  // the dark band right under the belly, with the bright holes of a mesh (1150-1300 x 872-912)
  const under = [[1140, 870], [1260, 884], [1320, 890], [1320, 912], [1260, 914], [1140, 892]];
  o.save(); o.beginPath(); poly(under)(o); o.clip();
  o.fillStyle = dark(0.8); o.fillRect(1130, 860, 200, 60);
  const hr = rng(72);
  for (let y = 884; y < 916; y += 4.6) for (let x = 1196 + ((y / 4.6) % 2) * 2.5; x < 1320; x += 6.5) { if (hr() < 0.25) continue; o.fillStyle = ink(0.45 + 0.35 * hr()); o.beginPath(); o.ellipse(x, y, 2.2, 1.3, -0.2, 0, 7); o.fill(); }
  o.restore();
  // a woven patch by the crease, feathered into the plane (no hard edge)
  const feather = (x, y) => clamp((x - 945) / 30, 0, 1) * clamp((1100 - x) / 30, 0, 1) * clamp((y - 835) / 30, 0, 1) * clamp((925 - y) / 30, 0, 1);
  hatchIn(o, clipR, [930, 825, 1110, 925], 0.2, 3.4, { len: [8, 24], w: [0.9, 1.3], a: [0.3, 0.5], seed: 66, alphaAt: feather });
  hatchIn(o, clipR, [930, 825, 1110, 925], 2.1, 3.0, { len: [10, 34], w: [0.9, 1.3], a: [0.28, 0.45], seed: 67, alphaAt: feather });
  // lit edges
  line(o, [...SLAB_LEFT.slice(1), [768, 718]], 1.8, ink(0.55), 6, 0.4);
  line(o, SLAB_TOP, 1.3, ink(0.45), 6, 0.3);
}

// ================================================================= build + draw
// Colour of a cached layer, fixed once at build. The engraver's white (#f2f0ea) is warm; the source is neutral with a
// faint green cast (measured G-B ~ +2, G-R ~ +1 post-grade on the head, +0.9 / +0.6 on the slab, +2.5 / +2.3 in the
// dark room). fn(r, g, b) -> [r, g, b] on unpremultiplied pixels.
function recolour(c, fn) {
  const g = c.getContext("2d", { willReadFrequently: true });
  const im = g.getImageData(0, 0, c.width, c.height), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const [r, gg, b] = fn(d[i], d[i + 1], d[i + 2]);
    d[i] = r; d[i + 1] = gg; d[i + 2] = b;
  }
  g.putImageData(im, 0, 0);
}
const neutral = (gain, dr, db) => (r, g, b) => { const G = g * gain, k = Math.min(1, G / 60); return [G - dr * k, G, G - db * k]; };
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
  // the room: static, one engraved plate at 2x, box-filtered to 1x once (s09/room.js)
  const room = buildRoom(ROOM_X);
  recolour(room, (r, g, b) => { const k = Math.min(1, g / 10) * (1 - g / 400); return [r, g + 3.5 * k, b]; });
  // the head and the shoulder: engraved at 2x
  const HP = plateAt(-M, -M, 840, H + M);
  paintBeanie(HP); paintHair(HP);
  const head = HP.engrave({ spacing: 4.2 * SS, seed: 29, contrast: 1.0 });
  recolour(head, neutral(0.99, 1.2, 2.2));
  const SP = plateAt(540, 690, 1580, H + M);
  paintShoulder(SP);
  const shoulder = SP.engrave({ spacing: 4.4 * SS, seed: 31, contrast: 1.0 });
  // the shoulder is a cut-out: keep only its silhouette so it can move over the hair on its own track
  const sg = shoulder.getContext("2d");
  sg.save(); sg.setTransform(SS, 0, 0, SS, -SP.x0 * SS, -SP.y0 * SS); sg.globalCompositeOperation = "destination-in"; sg.fillStyle = "#fff"; sg.beginPath(); poly(SLAB)(sg); sg.fill(); sg.restore();
  recolour(shoulder, neutral(0.992, 0.7, 1.0));
  const owl = captureOwl() || owlLayer({ ...HERO_PLACE, ...owlPose("sit3q"), clip: [0, 0, W, H] });
  cache = { room, head, shoulder, owl, hx: HP.x0, hy: HP.y0, sx: SP.x0, sy: SP.y0, tmp: {} };
  return cache;
}
// Composite a 2x layer with the sway (rotation th about the frame origin, then translation) without resampling it:
// the small rotation is split into two shears (x' = x - th*y, then y' = y + th*x'; the error is th^2 ~ 3e-5), and
// each shear is applied as whole-pixel shifts of bands of rows / columns of the 2x image. Every copy lands on
// integer 2x pixels, and the 2x image is then box-filtered 2:1 onto the frame at an integer position (an exact 0.5
// scale samples between 2x2 texels). So the print texture has the same sharpness at every phase of the sway, where
// a 1x plate drawn at fractional offsets went soft and shimmered. Positions are quantised to 0.5 px (error <= 0.25).
function plate2(ctx, L, key, img, x0, y0, box, tab, t, smear = false) {
  const [bx0, by0, bx1, by1] = box;
  const w2 = (bx1 - bx0) * SS, h2 = (by1 - by0) * SS, iw = img.width, ih = img.height;
  const [tx, ty, rd] = sway(tab, t);
  const th = (rd * Math.PI) / 180;
  let c = L.tmp[key], A = L.tmp[key + "A"];
  if (!c) { c = L.tmp[key] = document.createElement("canvas"); c.width = w2; c.height = h2; }
  if (!A) { A = L.tmp[key + "A"] = document.createElement("canvas"); A.width = w2; A.height = ih; }
  const ga = A.getContext("2d"), g = c.getContext("2d");
  for (const q of [ga, g]) { q.setTransform(1, 0, 0, 1, 0, 0); q.imageSmoothingEnabled = false; }
  ga.clearRect(0, 0, w2, ih); g.clearRect(0, 0, w2, h2);
  // pass 1: rows j of the image (frame y = y0 + j/2) shift by sx(j) device px
  const sx = (j) => Math.round(SS * (x0 - bx0) + SS * tx - SS * th * (y0 + (j + 0.5) / SS));
  for (let j0 = 0; j0 < ih;) {
    const s0 = sx(j0);
    let j1 = j0 + 1;
    while (j1 < ih && sx(j1) === s0) j1++;
    ga.drawImage(img, 0, j0, iw, j1 - j0, s0, j0, iw, j1 - j0);
    j0 = j1;
  }
  // pass 2: columns X of A (frame x = bx0 + X/2) shift by sy(X) device px
  const sy = (X) => Math.round(SS * (y0 - by0) + SS * ty + SS * th * (bx0 + (X + 0.5) / SS));
  for (let X0 = 0; X0 < w2;) {
    const s0 = sy(X0);
    let X1 = X0 + 1;
    while (X1 < w2 && sy(X1) === s0) X1++;
    g.drawImage(A, X0, 0, X1 - X0, ih, X0, s0, X1 - X0, ih);
    X0 = X1;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "low";
  // the source softens a little in the fastest sway (cuff HF 32.5 -> 27.5 at 33.12-33.36): when the head moves more
  // than ~2 px per frame, it is drawn twice, half a frame's travel apart (a short shutter smear)
  const v = smear ? sway(tab, t + 0.02)[0] - sway(tab, t - 0.02)[0] : 0;
  const k = clamp((Math.abs(v) - 1.8) / 1.0, 0, 1);
  if (k > 0) {
    const off = (k * v) / 10;                           // measured: the source's cuff HF drops only ~10% (27.6 -> ~25)
    ctx.drawImage(c, 0, 0, w2, h2, bx0 - off, by0, w2 / SS, h2 / SS);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(c, 0, 0, w2, h2, bx0 + off, by0, w2 / SS, h2 / SS);
  } else ctx.drawImage(c, 0, 0, w2, h2, bx0, by0, w2 / SS, h2 / SS);
  ctx.restore();
}

export const shot = {
  draw(ctx, local, t) {
    const L = build();
    ctx.drawImage(L.room, ROOM_X, 0);
    plate2(ctx, L, "head", L.head, L.hx, L.hy, HEAD_BOX, SWAY_HEAD, t, true);
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
