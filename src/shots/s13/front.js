// s13 fix pass 2: the front-facing headphones (poses D and E), authored.
// Geometry read on the source (D: median of 901-902; E: 912) from row / column profiles and zoomed frames:
//  - the band: a lit rail 7-10 px wide (screen ~125-155, pre ~0.5-0.6) with a brighter outer edge, a dark line and a
//    faint grey line inside it; tilted chrome slider blocks at both ends; the yoke strips down to the cups;
//  - each cup: a dark cushion against the head with pale crumple arcs (and a grey crumpled patch where lit), and the
//    shell as nested crescents bowing away from the head, bright chrome (screen 180-230) split by black lines,
//    dimming toward the bottom;
//  - under the right cup: a dark wedge hanging down-left with pale streaks in its top and dark strokes fanning to a point.
import { taper } from "../../lib/ink.js";
import { gv, LINE, ink, V } from "../../lib/owlInk.js";
import { brush, swellStroke } from "./brush.js";
import { clipTo, sampleCurve, smoothPath, offsetLine, rng } from "./util.js";

const { add, sub, mul, nrm, perp } = V;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const sn = (u, p = 0.5) => Math.pow(Math.sin(Math.PI * clamp01(u)), p);
const shift = (pts, o) => (o ? pts.map((p) => [p[0] + o[0], p[1] + o[1]]) : pts);

// ---------------------------------------------------------------- band
// B: { rail: centre line of the lit rail (right end -> left end), w, v, blocks: [[4 corners], ...], yokes: [[pts], ...] }
export function paintBand2(g, B) {
  const q = sampleCurve(B.rail, 6), w = B.w ?? 8.5, n = q.length;
  const ends = (u) => Math.min(1, u / 0.02, (1 - u) / 0.02);
  // (offsetLine(q, +d) is the outer side for a rail running right -> left over the head)
  taper(g, offsetLine(q, -w * 0.5 - 4), () => 9, LINE);                              // the band's dark inner face
  taper(g, q, (u) => (w + 3) * Math.max(0.5, ends(u)), LINE);                           // outline
  taper(g, q, (u) => w * Math.max(0.4, ends(u)), gv(B.v ?? 0.55));                      // the lit rail
  taper(g, offsetLine(q, w * 0.3), (u) => 2.6 * ends(u), gv(B.hi ?? 0.86, 0.95));       // chrome highlight, outer edge
  taper(g, offsetLine(q, -w * 0.38), (u) => 1.5 * ends(u), gv(0.1, 0.9));               // dark inner edge
  taper(g, offsetLine(q, -w * 0.5 - 2.5), (u) => 1.2 * ends(u), gv(0.32, 0.8));         // faint inner line
  for (const b of B.blocks || []) {
    const p = (c) => { c.moveTo(b[0][0], b[0][1]); for (const k of b.slice(1)) c.lineTo(k[0], k[1]); c.closePath(); };
    g.fillStyle = gv(0.84); g.beginPath(); p(g); g.fill();
    clipTo(g, p, () => {
      // a dark stripe along the block's long axis, a bright edge along the other side
      const a = V.mix(b[0], b[3], 0.3), c = V.mix(b[1], b[2], 0.3), d = V.mix(b[0], b[3], 0.75), e = V.mix(b[1], b[2], 0.75);
      g.strokeStyle = gv(0.25, 0.9); g.lineWidth = 3; g.beginPath(); g.moveTo(...V.mix(a, c, 0.1)); g.lineTo(...V.mix(a, c, 0.9)); g.stroke();
      g.strokeStyle = gv(0.97); g.lineWidth = 2; g.beginPath(); g.moveTo(...V.mix(d, e, 0.1)); g.lineTo(...V.mix(d, e, 0.9)); g.stroke();
    });
    g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); p(g); g.stroke();
  }
  for (const y of B.yokes || []) {
    const yq = sampleCurve(y.pts, 6), yw = y.w ?? 9;
    taper(g, yq, (u) => (yw + 3.5) * Math.max(0.6, Math.min(1, u / 0.05, (1 - u) / 0.05)), LINE);
    taper(g, yq, (u) => yw * Math.max(0.5, Math.min(1, u / 0.05, (1 - u) / 0.05)), gv(y.v ?? 0.8));
    taper(g, offsetLine(yq, y.side * yw * 0.25), (u) => yw * 0.3 * sn(u, 0.3), gv(0.97, 0.95));
    taper(g, offsetLine(yq, -y.side * yw * 0.3), (u) => 1.4 * sn(u, 0.3), gv(0.2, 0.8));
  }
}

// ---------------------------------------------------------------- cup
// C: { side (-1 left cup, 1 right cup), cush: outline, cushV, patch: [outline] | null, patchV, arcs: [[x0, x1, y, bow]...],
//      bands: outermost first, each { out: outer edge (top -> bottom), v, spec: [[inset px, width, value, u0, u1]...], dim },
//      spine: a line well inside the cushion that closes the band shapes, seed }
function bandPath(b, spine) {
  const pts = [...b.out, ...spine.slice().reverse()];
  return (c) => smoothPath(c, pts, true, 0.25);
}
export function paintCup2(g, C, o = null) {
  const r = rng(C.seed), s = C.side;
  if (C.shadeOut) { g.save(); g.filter = "blur(6px)"; ink(g, shift(C.shadeOut, o), 16, gv(0.72, 0.8), { end: 0.4 }); g.restore(); }
  if (C.under) taper(g, sampleCurve(shift(C.under, o), 6), (u) => 12 * sn(u, 0.4), gv(0.92));
  if (C.furFill) { g.save(); g.filter = "blur(2px)"; g.fillStyle = gv(0.93); g.beginPath(); smoothPath(g, shift(C.furFill, o), true, 0.3); g.fill(); g.restore(); }
  const cush = shift(C.cush, o), spine = shift(C.spine, o);
  for (let i = 0; i < C.bands.length; i++) {
    const b = { ...C.bands[i], out: shift(C.bands[i].out, o) }, p = bandPath(b, spine);
    let y0 = 1e9, y1 = -1e9; for (const q of b.out) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    g.fillStyle = gv(b.v); g.beginPath(); p(g); g.fill();
    clipTo(g, p, () => {
      // (measured) the chrome dims toward the bottom of each band (and a little at the top); the stripes stay on top
      if (b.dim) { const [f, a] = b.dim, yb = y0 + (y1 - y0) * f, gr = g.createLinearGradient(0, yb, 0, y1);
        gr.addColorStop(0, gv(0.05, 0)); gr.addColorStop(0.3, gv(0.05, a * 0.85)); gr.addColorStop(1, gv(0.05, a)); g.fillStyle = gr; g.fillRect(-9999, yb, 99999, y1 - yb + 20); }
      if (b.dimTop) { const [f, a] = b.dimTop, yb = y0 + (y1 - y0) * f, gr = g.createLinearGradient(0, y0 - 5, 0, yb);
        gr.addColorStop(0, gv(0.05, a)); gr.addColorStop(1, gv(0.05, 0)); g.fillStyle = gr; g.fillRect(-9999, y0 - 20, 99999, yb - y0 + 20); }
      const oq = sampleCurve(b.out, 8);
      for (const [d, w, v, u0 = 0, u1 = 1] of b.spec || []) {
        const lq = offsetLine(oq, s * d);
        const k0 = Math.floor(u0 * (lq.length - 1)), k1 = Math.ceil(u1 * (lq.length - 1));
        taper(g, lq.slice(k0, k1 + 1), (u) => w * sn(u, 0.35), gv(v, 0.95));
      }
    });
    // the black line between this band and the next one out
    const oq = sampleCurve(b.out, 8);
    taper(g, oq, (u) => (b.edge ?? 2.2) * (0.35 + 0.65 * sn(u, 0.3)), LINE);
  }
  // cushion
  const cp = (c) => smoothPath(c, cush, true, 0.3);
  g.fillStyle = gv(C.cushV ?? 0.1); g.beginPath(); cp(g); g.fill();
  clipTo(g, cp, () => {
    if (C.blobs) {
      const B = C.blobs, fr = shift([B.from], o)[0], to = shift([B.to], o)[0];
      for (let k = 0; k < B.n; k++) {
        const u = (k + 0.5) / B.n, c = add(V.mix(fr, to, u), [(r() - 0.5) * 5, (r() - 0.5) * 2]), w = B.w[0] + r() * (B.w[1] - B.w[0]), h = B.h[0] + r() * (B.h[1] - B.h[0]);
        const pts = []; for (let j = 0; j < 10; j++) { const a = (j / 10) * Math.PI * 2, k2 = 0.75 + r() * 0.4; pts.push([c[0] + Math.cos(a) * w * 0.5 * k2, c[1] + Math.sin(a) * h * 0.5 * k2 + (j % 2 ? 1.5 : -1.5) * Math.abs(Math.cos(a))]); }
        g.fillStyle = gv(B.v + (r() - 0.5) * 0.06); g.beginPath(); smoothPath(g, pts, true, 0.3); g.fill();
      }
    }
    if (C.patch) {
      const pp = (c) => smoothPath(c, shift(C.patch, o), true, 0.2);
      g.save(); g.filter = "blur(1.2px)"; g.fillStyle = gv(C.patchV ?? 0.5); g.beginPath(); pp(g); g.fill(); g.restore();
      // dark crumple folds cut into the patch (short wavy strokes across it)
      for (const f of C.folds || []) swellStroke(g, shift(f, o), 2.6 + r() * 1.5, gv(0.1, 0.9), { end: 0.2, pow: 0.5 });
    }
    for (const [x0, x1, y, bow, v = 0.62, w = 1.8] of C.arcs) {
      const a = [x0 + (o ? o[0] : 0), y + (o ? o[1] : 0)], b = [x1 + (o ? o[0] : 0), y + (o ? o[1] : 0) + (C.slope || 0) * (x1 - x0)];
      swellStroke(g, [a, add(V.mix(a, b, 0.5), [0, -bow]), b], w + r() * 0.8, gv(v + (r() - 0.5) * 0.08, 0.9), { end: 0.1, pow: 0.5 });
    }
  });
  g.strokeStyle = LINE; g.lineWidth = 2.6; g.beginPath(); cp(g); g.stroke();
  if (C.rimLight) swellStroke(g, shift(C.rimLight, o), 2.2, gv(0.8, 0.9), { end: 0.2 });
}

// ---------------------------------------------------------------- the shadow wedge under the right cup
export function underWedge(g, W, o = null) {
  const pts = shift(W.pts, o), p = (c) => smoothPath(c, pts, true, 0.2), r = rng(W.seed);
  g.save(); g.filter = "blur(1.5px)"; g.fillStyle = gv(W.v ?? 0.16); g.beginPath(); p(g); g.fill(); g.restore();
  clipTo(g, p, () => {
    // pale streaks across the top of the wedge (the cushion's underside catching light)
    for (const [a, b, c, v] of W.streaks) swellStroke(g, shift([a, b, c], o), 2.6 + r() * 1.2, gv(v, 0.95), { end: 0.15, pow: 0.5 });
    for (const L of W.darks || []) swellStroke(g, shift(L, o), 1.5, gv(0.1, 0.9), { end: 0.15 });
  });
  // dark strokes fanning down-left to the wedge's point
  const tip = shift([W.tip], o)[0];
  for (let i = 0; i < W.n; i++) {
    const u = (i + 0.5) / W.n, b = V.mix(shift([W.base[0]], o)[0], shift([W.base[1]], o)[0], u);
    const e = add(V.mix(b, tip, 0.75 + r() * 0.3), [(r() - 0.5) * 8, (r() - 0.5) * 6]);
    brush(g, [b, add(V.mix(b, e, 0.5), [(r() - 0.5) * 4, 2]), e], 1.3 + r() * 1.2, gv(0.05 + r() * 0.12, 0.9), { head: 0.15, pow: 0.8 });
  }
  for (const L of W.edges || []) swellStroke(g, shift(L, o), 1.8, gv(0.1, 0.9), { end: 0.2 });
  for (const L of W.fan || []) brush(g, shift(L, o), 1.6 + r() * 0.8, gv(0.15 + r() * 0.15, 0.9), { head: 0.15, pow: 0.8 });
}

// ---------------------------------------------------------------- pose D data (901-902)
export const BAND2_D = {
  rail: [[1410, 69], [1400, 61.5], [1380, 47.5], [1360, 36.5], [1340, 28], [1320, 20], [1300, 13.5], [1280, 10], [1260, 5], [1240, 3], [1210, 3], [1180, 3], [1150, 3.5], [1120, 6],
    [1100, 10], [1080, 15], [1060, 19], [1040, 26], [1020, 36], [1000, 48], [980, 60], [967, 70], [955, 80], [945, 90], [935, 100], [925, 110], [920, 116]],
  w: 8.5, v: 0.55, hi: 0.86,
  blocks: [[[912, 122], [931, 132], [919, 162], [900, 152]], [[1419, 88], [1428, 81], [1448, 104], [1440, 112]], [[1439, 116], [1447, 110], [1461, 125], [1453, 131]]],
  yokes: [{ pts: [[906, 164], [896, 179], [887, 196], [880, 216], [875, 240], [872, 262]], w: 9, v: 0.82, side: 1 },
    { pts: [[1457, 133], [1467, 143], [1477, 157], [1485, 172], [1492, 190]], w: 8, v: 0.8, side: -1 }],
};
// the left cup: cushion x 897-951 (y 222-466); shell crescents (outer edges at mid-height: A 885, B 865, C 845)
export const CUP2_DL = {
  side: -1, seed: 481, cushV: 0.075,
  cush: [[903, 232], [915, 224], [932, 221], [943, 224], [947, 236], [946, 300], [947, 370], [953, 405], [959, 425], [963, 447], [958, 458], [945, 460], [930, 457], [918, 452], [906, 445], [899, 432], [897, 400], [896, 330], [898, 262]],
  // a pale shoulder feather crossing under the cushion's bottom (source: (888, 433) down to (935, 477), ~12 px)
  under: [[884, 431], [904, 447], [924, 461], [946, 474]],
  // the fur right of the cushion is grey-hatched in the source (block means ~210 against the render's ~245)
  shadeOut: [[957, 330], [960, 400], [968, 470]],
  // the fur reaches the cushion's top-right edge (the head outline stops ~10 px short there): a pale fill under it
  furFill: [[955, 212], [962, 204], [970, 204], [970, 305], [947, 305], [947, 262], [951, 250]],
  spine: [[925, 240], [925, 350], [925, 450]],
  patch: [[902, 292], [912, 289], [921, 294], [929, 291], [933, 303], [927, 311], [934, 322], [929, 333], [933, 344], [922, 351], [911, 348], [903, 352], [899, 336], [903, 322], [899, 308]], patchV: 0.5,
  folds: [[[917, 297], [921, 304], [919, 312]], [[905, 316], [911, 320], [914, 327]], [[924, 326], [920, 334], [925, 341]], [[908, 338], [913, 342]]],
  arcs: [[906, 934, 240, 5], [905, 936, 252, 5], [904, 935, 264, 5], [905, 932, 276, 4.5], [906, 934, 287, 4], [906, 936, 362, 3.5, 0.5], [905, 938, 376, 3.5, 0.48], [906, 936, 392, 3, 0.44], [908, 932, 410, 3, 0.4]],
  bands: [
    { out: [[866, 281], [855, 287], [848, 305], [845, 330], [845, 360], [847, 388], [853, 404], [866, 413]], v: 0.34, spec: [[4, 3.6, 0.93, 0.05, 0.95], [11, 3, 0.8, 0.1, 0.5]], dim: [0.3, 0.95], edge: 3 },
    { out: [[887, 262], [874, 270], [867, 292], [865, 330], [865, 380], [868, 420], [876, 432], [889, 438]], v: 0.72, spec: [[5, 4.5, 0.97, 0.05, 0.95], [12, 4, 0.95, 0.08, 0.55]], dim: [0.42, 0.95], edge: 3.2 },
    { out: [[899, 240], [891, 250], [886, 280], [885, 340], [886, 410], [890, 438], [899, 447]], v: 0.38, spec: [[5, 1.6, 0.66, 0.05, 0.9]], dim: [0.45, 0.8], edge: 2.6 },
  ],
};
// the right cup: cushion from (1427, 178) to (1500, 360); shell crescents bowing right to x 1543 at y ~285
export const CUP2_DR = {
  side: 1, seed: 482, cushV: 0.1,
  cush: [[1430, 178], [1440, 170], [1458, 169], [1471, 176], [1480, 200], [1489, 240], [1496, 280], [1500, 320], [1500, 360], [1496, 380], [1482, 392], [1467, 390], [1462, 360], [1455, 320], [1448, 280], [1441, 240], [1434, 205]],
  spine: [[1452, 190], [1470, 290], [1480, 385]],
  // the crumpled lit column: a narrow run of grey blobs from (1458, 210) down to (1484, 302), dark folds between them
  blobs: { from: [1460, 214], to: [1484, 298], n: 7, w: [18, 26], h: [10, 13], v: 0.46 },
  arcs: [[1442, 1464, 190, 4, 0.66], [1444, 1468, 200, 4, 0.6], [1468, 1492, 322, 3, 0.55], [1470, 1494, 336, 3, 0.55], [1471, 1494, 350, 3, 0.5], [1472, 1492, 364, 2.5, 0.5]],
  rimLight: [[1433, 176], [1447, 171], [1462, 172]],
  bands: [
    { out: [[1498, 200], [1518, 205], [1533, 222], [1541, 252], [1543, 285], [1538, 312], [1527, 333], [1512, 348], [1497, 358]], v: 0.3, spec: [[3, 3, 0.95, 0.04, 0.85], [11, 10, 0.9, 0.1, 0.4]], dim: [0.55, 0.5], edge: 3 },
    { out: [[1482, 190], [1497, 202], [1510, 225], [1517, 255], [1521, 285], [1520, 318], [1513, 342], [1502, 357]], v: 0.5, spec: [[9, 13, 0.97, 0.08, 0.42], [6, 3, 0.8, 0.4, 0.85]], dim: [0.5, 0.55], edge: 3 },
    { out: [[1476, 186], [1484, 212], [1491, 240], [1500, 280], [1505, 320], [1503, 360]], v: 0.24, spec: [[2.5, 1.8, 0.8, 0.05, 0.8]], edge: 2.4 },
  ],
};
export const WEDGE_D = {
  seed: 486, v: 0.5,
  pts: [[1456, 394], [1500, 392], [1538, 395], [1512, 414], [1480, 434], [1462, 442], [1446, 440], [1447, 422], [1450, 408]],
  streaks: [[[1464, 399], [1496, 395], [1528, 398], 0.93], [[1461, 407], [1490, 403], [1516, 407], 0.9], [[1457, 415], [1482, 412], [1502, 416], 0.86], [[1453, 423], [1472, 421], [1490, 425], 0.8]],
  darks: [[[1462, 403], [1494, 399], [1522, 402]], [[1458, 411], [1486, 407], [1509, 411]], [[1455, 419], [1478, 417], [1496, 421]]],
  base: [[1446, 426], [1492, 428]], tip: [1420, 478], n: 11,
  edges: [[[1538, 395], [1510, 415], [1478, 436], [1446, 458], [1420, 478]]],
};

// ---------------------------------------------------------------- pose E (912): the D parts re-placed by per-part offsets
// measured by template matching 912 against 901-902 (left cup: cushion (-45, 4), shell (-15, -9); right cup: cushion
// (-34, -5), shell (-11, -10); wedge (-3, -2); band: left end (7, -13), crown (3, -2), right end (-17, 2))
const mv = (pts, o) => pts.map((p) => [p[0] + o[0], p[1] + o[1]]);
function cupE(C, oc, os) {
  return { ...C, cush: mv(C.cush, oc), spine: mv(C.spine, oc), patch: C.patch && mv(C.patch, oc), folds: C.folds && C.folds.map((f) => mv(f, oc)),
    blobs: C.blobs && { ...C.blobs, from: mv([C.blobs.from], oc)[0], to: mv([C.blobs.to], oc)[0] },
    arcs: C.arcs.map(([a, b, y, ...r]) => [a + oc[0], b + oc[0], y + oc[1], ...r]), rimLight: C.rimLight && mv(C.rimLight, oc),
    under: C.under && mv(C.under, oc), furFill: C.furFill && mv(C.furFill, oc), shadeOut: C.shadeOut && mv(C.shadeOut, oc),
    bands: C.bands.map((b) => ({ ...b, out: mv(b.out, os) })) };
}
// the E left cup is turned further away: rows on 912 put its shell at x 832-870 and a cushion only ~25 px wide
// (872-897) - the D cup squeezed horizontally, x' = 0.627 x + 302 (band C's outer edge 845 -> 832, the cushion's right
// edge 947 -> 896), and 5 px up
function squeeze(C, a, b, dy) {
  const f = (pts) => pts.map((p) => [a * p[0] + b, p[1] + dy]);
  return { ...C, cush: f(C.cush), spine: f(C.spine), patch: C.patch && f(C.patch), folds: C.folds && C.folds.map(f),
    arcs: C.arcs.map(([x0, x1, y, ...r]) => [a * x0 + b, a * x1 + b, y + dy, ...r]), under: C.under && f(C.under), furFill: null, shadeOut: C.shadeOut && f(C.shadeOut),
    bands: C.bands.map((B) => ({ ...B, out: f(B.out), spec: B.spec.map(([d, w, ...r]) => [d * a, w * Math.max(0.75, a), ...r]) })) };
}
export const CUP2_EL = squeeze(CUP2_DL, 0.627, 302, -5);
// the E right cup: cushion (-28, -5), shell (-11, -10); its innermost shell band shows between them - dark there (rows)
export const CUP2_ER = (() => { const C = cupE(CUP2_DR, [-28, -5], [-11, -10]); C.bands = C.bands.map((B, i) => (i === 2 ? { ...B, v: 0.08 } : B)); return C; })();
const bandOff = (x) => { const L = [7, -13], M = [3, -2], R = [-17, 2]; if (x < 1000) return L; if (x < 1050) { const t = (x - 1000) / 50; return [L[0] + (M[0] - L[0]) * t, L[1] + (M[1] - L[1]) * t]; } if (x <= 1300) return M; if (x < 1380) { const t = (x - 1300) / 80; return [M[0] + (R[0] - M[0]) * t, M[1] + (R[1] - M[1]) * t]; } return R; };
export const BAND2_E = { ...BAND2_D, rail: BAND2_D.rail.map(([x, y]) => { const o = bandOff(x); return [x + o[0], y + o[1]]; }),
  blocks: BAND2_D.blocks.map((b) => b.map(([x, y]) => { const o = bandOff(x); return [x + o[0], y + o[1]]; })),
  yokes: BAND2_D.yokes.map((y) => ({ ...y, pts: y.pts.map(([x, yy]) => { const o = x < 1000 ? [-15, -9] : [-11, -10]; return [x + o[0], yy + o[1]]; }) })) };
export const WEDGE_E = { ...WEDGE_D, pts: mv(WEDGE_D.pts, [-3, -2]), streaks: WEDGE_D.streaks.map(([a, b, c, v]) => [...mv([a, b, c], [-3, -2]), v]), darks: WEDGE_D.darks.map((d) => mv(d, [-3, -2])),
  base: mv(WEDGE_D.base, [-3, -2]), tip: [WEDGE_D.tip[0] - 3, WEDGE_D.tip[1] - 2], edges: WEDGE_D.edges.map((e) => mv(e, [-3, -2])) };

// ---------------------------------------------------------------- pose C: the same shadow wedge under the 3/4 cup (C hold,
// 4x zoom: the cushion's underside streaks at y 398-430 over x 1432-1520, dark strokes converging on (1418, 478), and
// long curved strokes fanning down-left off the cushion's lower-left rim)
export const WEDGE_C = {
  seed: 487, v: 0.5,
  pts: [[1440, 398], [1480, 395], [1522, 398], [1500, 418], [1470, 440], [1452, 450], [1436, 446], [1434, 426], [1436, 408]],
  streaks: [[[1446, 402], [1480, 398], [1515, 402], 0.93], [[1442, 410], [1472, 407], [1505, 412], 0.9], [[1438, 418], [1464, 416], [1492, 421], 0.85], [[1436, 426], [1456, 425], [1478, 430], 0.8]],
  darks: [[[1444, 406], [1476, 402], [1510, 406]], [[1440, 414], [1468, 411], [1498, 416]], [[1437, 422], [1460, 420], [1485, 425]]],
  base: [[1432, 428], [1476, 434]], tip: [1418, 478], n: 9,
  edges: [[[1522, 398], [1498, 419], [1466, 442], [1438, 462], [1418, 478]]],
  fan: [[[1428, 400], [1410, 420], [1396, 446]], [[1420, 402], [1402, 424], [1390, 452]], [[1436, 404], [1418, 428], [1404, 458]], [[1412, 398], [1396, 416], [1384, 440]], [[1444, 408], [1428, 434], [1414, 466]]],
};
