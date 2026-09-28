// s18 shot B (55.28-57.28, source frames 1382-1432): extreme close-up of the keys. Two plates, both ink drawings:
//   background (never moves): black wall, the lit slatted panel, the dark box, the striped box with its round knob
//   keyboard (tips away from 1418): knob row, black keys, lit white keys, dark front panel, the left cheek block
// and the owl: the rigid belly moved along TRACK_B, the far wing in its flap state, the tail under its own affine,
// per frame the legs / feet / near wing and the marks of the keys pressed under them; from 1417 the leaping and
// flying owl per frame, softened inside its own silhouette only (the source frames are motion-blurred there).
import { decodeInk, drawInk, softHalf, grey, fillCanvas, ringsBBox } from "./inkdraw.js";
import { BG_B } from "./data/bgB.js";
import { KB_B } from "./data/kbB.js";
import { OWL_B } from "./data/owlB.js";
import { boilMap, boilTone, contentFrame } from "./boil.js";

// Synth tipping away: plate -> frame affine per source frame [frame, a, b, c, d, e, f] (canvas setTransform order).
// Fitted by ECC of the keyboard plate against every source frame (owl masked), started from the frame-to-frame ORB
// chain; 1432 keeps the ORB value. Identity up to 1417.
export const TIP = [
  [1417, 1, 0, 0, 1, 0, 0],
  [1418, 1.00071, -0.00518, 0.00335, 1.00092, -5.4, 10.5],
  [1419, 0.99930, -0.03374, 0.03348, 1.00222, -30.6, 64.3],
  [1420, 0.99300, -0.10380, 0.10069, 1.00538, -78.2, 188.7],
  [1421, 0.98333, -0.18421, 0.17839, 0.99500, -134.5, 348.1],
  [1422, 0.97014, -0.24795, 0.23905, 0.98771, -175.3, 482.4],
  [1423, 0.96141, -0.30091, 0.29193, 0.97217, -216.0, 608.5],
  [1424, 0.94779, -0.34926, 0.33579, 0.96504, -241.6, 708.5],
  [1425, 0.93840, -0.37413, 0.36123, 0.95829, -257.7, 760.5],
  [1426, 0.93835, -0.37412, 0.36120, 0.95825, -257.6, 760.5],
  [1427, 0.93362, -0.38641, 0.37317, 0.95308, -268.9, 789.7],
  [1428, 0.92772, -0.40537, 0.39161, 0.94400, -286.0, 846.9],
  [1429, 0.91266, -0.44801, 0.43164, 0.93181, -310.1, 961.5],
  [1430, 0.88795, -0.50050, 0.48626, 0.90568, -338.0, 1112.5],
  [1431, 0.86042, -0.55878, 0.54459, 0.87701, -378.7, 1303.4],
  [1432, 0.82146, -0.59924, 0.59924, 0.82146, -405.8, 1520.0],
];
const tipRow = (f) => (f <= 1417 ? null : TIP[Math.min(TIP.length - 1, f - 1417)]);
// the pose at a fractional frame (linear between the measured rows)
function tipLerp(ff) {
  const i = Math.floor(ff), u = ff - i;
  const row = (k) => TIP[Math.max(0, Math.min(TIP.length - 1, k - 1417))];
  const a = row(i), b = row(i + 1);
  return a.map((v, k) => (k ? v + (b[k] - v) * u : v));
}
// the source keyboard is a little motion-blurred while it tips fastest (1420-1424; key-region gradient p99 364-406
// against 402-431 sharp, i.e. a blur of ~1.5-2 px): 5 poses spread over this fraction of the frame-to-frame change
// (~150 px a frame at the keys), centred on the measured pose
const TIP_BLUR = { 1420: 0.045, 1421: 0.04, 1422: 0.04, 1423: 0.035, 1424: 0.035 };
export const M = 260, KB_R = 3000;
const WK = 0.92;

// the keyboard's own black: its outline in canvas coords (knob caps + everything below), as measured for the plate
const KNOBS = [
  ...[110, 285, 495, 705, 900, 1100, 1300, 1525, 1665, 1800, 1950, 2100, 2260, 2420, 2580, 2740, 2900, 3060].map((x) => [x, 0]),
  ...[190, 385, 595, 805, 995, 1188, 1390, 1560, 1720, 1897, 2045, 2190, 2340, 2490, 2640, 2790, 2940].map((x) => [x, 1]),
];
const capY = (x, row) => (row ? 445 + 0.011 * (x - 385) : 366 + 0.012 * (x - 250));
const KNOB_W = [56, 58], KNOB_H = [92, 110];
function kbMask(g) {
  g.fillStyle = "#000";
  g.fillRect(-10, 440, KB_R + 10, 800);
  for (const [x, row] of KNOBS) { const w = KNOB_W[row], y = capY(x, row); g.beginPath(); g.roundRect(x - w / 2, y - 10, w, KNOB_H[row], 8); g.fill(); }
  g.beginPath(); g.moveTo(-10, 440); g.lineTo(165, 436); g.lineTo(505, 590); g.lineTo(505, 700); g.lineTo(-10, 700); g.closePath(); g.fill();
}
let L = null;
export function platesB() {
  if (L) return L;
  const bg = document.createElement("canvas"); bg.width = 2206; bg.height = 946;
  const bgc = bg.getContext("2d"); bgc.fillStyle = "#000"; bgc.fillRect(0, 0, 2206, 946);
  drawInk(bgc, decodeInk(BG_B), { wk: WK });
  softHalf(bg, 1);
  const KW = M + KB_R, KH = 946 + M;
  const kb = document.createElement("canvas"); kb.width = KW; kb.height = KH;
  const kg = kb.getContext("2d");
  kg.save(); kg.translate(M, 0); kbMask(kg); kg.restore();
  drawInk(kg, decodeInk(KB_B), { wk: WK });
  softHalf(kb, 1);
  L = { bg, kb };
  return L;
}
let acc = null;
function drawKeyboard(ctx, f) {
  const P = platesB(), tp = tipRow(f), bl = TIP_BLUR[f];
  if (bl) {
    if (!acc) { acc = document.createElement("canvas"); acc.width = 2206; acc.height = 946; }
    const g = acc.getContext("2d"), N = 5;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.clearRect(0, 0, 2206, 946);
    g.globalCompositeOperation = "lighter"; g.globalAlpha = 1 / N;
    for (let i = 0; i < N; i++) { const r = tipLerp(f + (i / (N - 1) - 0.5) * bl); g.setTransform(r[1], r[2], r[3], r[4], r[5], r[6]); g.drawImage(P.kb, -M, 0); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    ctx.drawImage(acc, 0, 0);
    return;
  }
  ctx.save();
  if (tp) ctx.transform(tp[1], tp[2], tp[3], tp[4], tp[5], tp[6]);
  ctx.drawImage(P.kb, -M, 0);
  ctx.restore();
}

// ---------------------------------------------------------------- the owl
// belly track: [frame, dx, dy] vs frame 1382 (template match per source frame); registered -> frame = + (dx, dy - 45)
export const TRACK_B = [
  [1382, 0, 0], [1383, -39, 1], [1384, -64, -3], [1385, -73, -8], [1386, -74, -1], [1387, -76, 4], [1388, -76, 2], [1389, -84, -4],
  [1390, -103, 2], [1391, -120, 2], [1392, -132, -6], [1393, -140, -12], [1394, -141, -3], [1395, -146, 5], [1396, -156, 3],
  [1397, -164, -3], [1398, -182, 7], [1399, -194, 12], [1400, -199, 8], [1401, -199, 8], [1402, -212, -6], [1403, -206, 12],
  [1404, -212, 26], [1405, -212, 30], [1406, -232, 24], [1407, -248, 28], [1408, -312, 24], [1409, -392, 18], [1410, -453, 3],
  [1411, -496, -8], [1412, -540, -21], [1413, -572, -30], [1414, -593, -40], [1415, -585, -29], [1416, -589, -32],
];
const RY0 = -45;
const HOLD = { 1401: 1400, 1426: 1425 };   // the source repeats one drawing every 25 frames
const BOIL = 0.8, TJIT = 0.08, WK_OWL = 0.85;
// extra softening of the flying owl per frame, fitted on the source (fitfly.py: blurred-2 MAE inside the owl's box);
// the drawing is measured on the lightly smoothed frame, so little is left: 1 = one half-pixel pass (sigma ~0.7),
// 2 = two passes (~1.0)
export const FLY_SOFT = { 1420: 2, 1421: 2, 1422: 2, 1423: 2, 1425: 2 };
function drawBand(g, [poly, ang, per, off, w, dark, paper]) {
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  let s0 = Infinity, s1 = -Infinity, t0 = Infinity, t1 = -Infinity;
  for (const [x, y] of poly) { const s = x * nx + y * ny, t = x * ux + y * uy; s0 = Math.min(s0, s); s1 = Math.max(s1, s); t0 = Math.min(t0, t); t1 = Math.max(t1, t); }
  g.save();
  g.beginPath(); g.moveTo(poly[0][0], poly[0][1]); for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]); g.closePath();
  g.fillStyle = grey(paper); g.fill(); g.clip();
  g.strokeStyle = grey(dark); g.lineWidth = w; g.lineCap = "butt";
  const k0 = Math.floor((s0 - off) / per) - 1, k1 = Math.ceil((s1 - off) / per) + 1;
  g.beginPath();
  for (let kk = k0; kk <= k1; kk++) {
    const s = off + kk * per, px = nx * s, py = ny * s;
    g.moveTo(px + ux * (t0 - 4), py + uy * (t0 - 4)); g.lineTo(px + ux * (t1 + 4), py + uy * (t1 + 4));
  }
  g.stroke();
  g.restore();
}
let O = null, layer = null;
function owlData() {
  if (O) return O;
  const T = OWL_B;
  O = { belly: decodeInk(T.belly), tail: decodeInk(T.tail), wing: {}, parts: {}, keys: {}, fly: {}, tailA: T.tailA, state: T.state, bands: T.bands || {}, klines: T.klines || {} };
  for (const [k, v] of Object.entries(T.wing)) O.wing[k] = v ? decodeInk(v) : null;
  for (const k of ["parts", "keys", "fly"]) for (const [n, v] of Object.entries(T[k])) O[k][n] = decodeInk(v);
  return O;
}
function owlLayer() {
  if (!layer) { layer = document.createElement("canvas"); layer.width = 2206; layer.height = 946; }
  const g = layer.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 2206, 946);
  return g;
}
function drawOwlB(ctx, f) {
  const d = owlData(), k = HOLD[f] || f, cf = contentFrame(f);
  const opts = { map: boilMap(cf, BOIL), tone: boilTone(cf, TJIT), wk: WK_OWL };
  if (f <= 1416) {
    // the keys pressed down: the side wall of the neighbouring key shows as a wedge of parallel dark lines
    // (measured per frame: outline, line angle, pitch, phase, width and tones), then the key's dropped front lines
    // and the other key marks
    for (const b of d.bands[k] || []) drawBand(ctx, b);
    for (const [x0, y0, x1, y1, w, t] of d.klines[k] || []) { ctx.strokeStyle = grey(t); ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
    if (d.keys[k]) drawInk(ctx, d.keys[k], { wk: WK, cache: false });
    // the owl straight into the frame: the rigid parts' fills are painted (and softened) once, their strokes are
    // redrawn every frame with the boil; the per-frame parts' shaded masses are the linear gradients of their
    // measured fields (canvas images that change every frame are what is slow in the renderer)
    const A = d.tailA[k];
    const rigid = (D) => { const fc = fillCanvas(D, 4, 1); if (fc) ctx.drawImage(fc.c, fc.x, fc.y); drawInk(ctx, D, { ...opts, fills: false }); };
    ctx.save();
    // the tail moves under its own affine: turned images are slow to draw here, so it is drawn as vectors (its
    // shaded masses as linear gradients)
    if (A) { ctx.setTransform(A[0][0], A[1][0], A[0][1], A[1][1], A[0][2], A[1][2]); drawInk(ctx, d.tail, { ...opts, low: "grad" }); }
    const r = TRACK_B[Math.min(TRACK_B.length - 1, f - 1382)];
    ctx.setTransform(1, 0, 0, 1, r[1], r[2] + RY0);
    rigid(d.belly);
    const w = d.wing[d.state[k]];
    if (w) rigid(w);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const pt = d.parts[k];
    if (pt) drawInk(ctx, pt, { ...opts, cache: false, low: "grad" });
    ctx.restore();
    return;
  }
  // the leap and take-off: motion-blurred in the source, so this owl is drawn into a layer and softened inside its
  // own box only (the keyboard stays crisp under it)
  const fl = d.fly[k];
  if (!fl) return;
  const g = owlLayer();
  drawInk(g, fl, { ...opts, cache: false, low: "grad" });
  const bb = fl._box || (fl._box = ringsBBox(fl.base.length ? fl.base[0].rings : fl.m[0].rings));
  const x0 = Math.max(0, Math.floor(bb[0]) - 6), y0 = Math.max(0, Math.floor(bb[1]) - 6), x1 = Math.min(2206, Math.ceil(bb[2]) + 6), y1 = Math.min(946, Math.ceil(bb[3]) + 6);
  softHalf(layer, 1, FLY_SOFT[k] || 1, [x0, y0, x1 - x0, y1 - y0]);
  ctx.drawImage(layer, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
}
export function drawB(ctx, f) {
  const P = platesB();
  ctx.drawImage(P.bg, 0, 0);
  drawKeyboard(ctx, f);
  drawOwlB(ctx, f);
}
export function releaseB() { L = null; O = null; layer = null; acc = null; }
