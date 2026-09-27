// s18 shot B (55.28-57.28, source frames 1382-1432): extreme close-up of the keys. Two plates, both ink drawings:
//   background (never moves): black wall, the lit slatted panel, the dark box, the striped box with its round knob
//   keyboard (tips away from 1418): knob row, black keys, lit white keys, dark front panel, the left cheek block
// and the owl: the rigid belly moved along TRACK_B, the far wing in its flap state, the tail under its own affine,
// per frame the legs / feet / near wing and the marks of the keys pressed under them; from 1417 the leaping and
// flying owl per frame, softened inside its own silhouette only (the source frames are motion-blurred there).
// Fix pass 4: the standing owl goes through its own softened layer; an underlay closes the belly / tail junction and
// the belly's cut edge fades out; the knob caps across the lit slats are drawn (with the haze zone left untoned); the
// slat panel's islands become speckle; missing key wedges fitted, bad key lines fixed; lifted feet and the sweeping
// near wing smeared per frame; the flying owl's grey rim becomes a soft ramp, with fitted short smears and the
// covert-feather hooks at 1425.
import { decodeInk, drawInk, softHalf, grey, ringsBBox, drawnCanvas, cpuCanvas } from "./inkdraw.js";
import { BG_B } from "./data/bgB.js";
import { KB_B } from "./data/kbB.js";
import { OWL_B } from "./data/owlB.js";
import { boilMap, boilTone, contentFrame, boilVariant } from "./boil.js";
import { hash } from "../../lib/rng.js";
import { taper } from "../../lib/ink.js";
import { sampleCurve } from "../../lib/paths.js";
import { applyTone } from "./tone.js";
import { softRect } from "./soft.js";
import { TONE_B } from "./data/toneB.js";
import { TONE_OWL_B } from "./data/toneOwlB.js";
import { CUP_TONE } from "./data/cupTone.js";
// fix pass 1b: the take-off frames' headphone cup (1421, 1422) gets its measured value correction (data/cupTone.js),
// applied in a scratch copy of its box so only that part of the layer is read back
function toneBox(layerCanvas, T) {
  // the blobs act out to 3 sigma (96 px) past the fitted box: applied over that whole reach, so no seam at the box edge
  const M = 96, x0 = Math.max(-LP, T.box[0] - M), y0 = Math.max(-LP, T.box[1] - M), x1 = Math.min(2206 + LP, T.box[2] + M), y1 = Math.min(946 + LP, T.box[3] + M);
  const w = x1 - x0, h = y1 - y0;
  if (!T._f) {
    // the gain field (the same formula as tone.js applyTone), computed once: a 1 x h probe canvas per row is not needed,
    // the blobs are evaluated directly at the pixel centres
    const L = new Float32Array(w * h), F = new Float32Array(w * h).fill(1);
    for (const [bx, by, sg, a] of T.blobs) {
      const x = bx - x0, y = by - y0, R = 3 * sg, k = -1 / (2 * sg * sg);
      const i0 = Math.max(0, Math.floor(x - R)), i1 = Math.min(w - 1, Math.ceil(x + R)), j0 = Math.max(0, Math.floor(y - R)), j1 = Math.min(h - 1, Math.ceil(y + R));
      for (let j = j0; j <= j1; j++) { const ey = (j + 0.5 - y) * (j + 0.5 - y); for (let i = i0; i <= i1; i++) { const ex = i + 0.5 - x, e = Math.exp(k * (ex * ex + ey)); if (a > 0) L[j * w + i] += a * e; else F[j * w + i] *= 1 + a * e; } }
    }
    for (let p = 0; p < w * h; p++) F[p] *= 1 + Math.min(1, L[p]);
    T._f = F;
  }
  const F = T._f, g = layerCanvas.getContext("2d", { willReadFrequently: true });
  const id = g.getImageData(x0 + LP, y0 + LP, w, h), d = id.data;
  for (let p = 0, q = 0; p < w * h; p++, q += 4) {
    const f = F[p];
    if (f === 1) continue;
    d[q] = Math.min(255, Math.round(d[q] * f)); d[q + 1] = Math.min(255, Math.round(d[q + 1] * f)); d[q + 2] = Math.min(255, Math.round(d[q + 2] * f));
  }
  g.putImageData(id, x0 + LP, y0 + LP);
}

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
// The rear knob row where it crosses the lit slats (x 1140-1515), measured on the median of 1382-1416: the slats end
// crisply at y ~415 on the knob row's dark body; two row-0 knob caps rise into them as dark domes (x 1251-1333, top
// y 376; x 1432-1507, top y 378), the first with its white rim highlight (x 1285-1325, y 388-393), the second a
// faint grey one (x 1462-1512, y 390-394). Plate coords (the keyboard's, before it tips).
const KNOB_ZONE = [1095, 340, 1515, 446];
function knobRow(g) {
  g.save();
  g.fillStyle = grey(3);
  g.beginPath(); g.moveTo(1095, 416); g.lineTo(1515, 418); g.lineTo(1515, 446); g.lineTo(1095, 446); g.closePath(); g.fill();
  // the domes' outlines where the lit slats show them (the slats' lower ends per column, median of 1395-1416)
  const dome = (P) => { g.beginPath(); g.moveTo(P[0][0], 446); g.lineTo(P[0][0], P[0][1]); const q = sampleCurve(P, 6); for (const [x, y] of q) g.lineTo(x, y); g.lineTo(P[P.length - 1][0], 446); g.closePath(); g.fill(); };
  dome([[1238, 400], [1244, 386], [1248, 381], [1254, 379.5], [1260, 377.5], [1266, 375], [1275, 373], [1300, 372.5], [1318, 373.5], [1326, 376], [1331, 383], [1333, 395]]);
  dome([[1425, 420], [1428, 406], [1430, 391], [1434, 383], [1438, 379], [1444, 376.5], [1460, 373], [1484, 370.5], [1500, 372], [1506, 378], [1508, 390]]);
  g.restore();
  // the rim highlights (fix pass 2 of review 2): curved streaks following the domes' tops, thickest right of centre,
  // tapering to soft ends (read on the median of 1395-1416: cap 1 peak rows 388-390 at x 1300, 392 at x 1325; cap 2
  // grey ~130, rows 392-396 over x 1465-1505), softened
  const k = cpuCanvas(300, 40), kg = k.getContext("2d");
  kg.translate(-1225, -370);
  const arc = (A, C, B, wm, v) => { const q = []; for (let i = 0; i <= 24; i++) { const t = i / 24, u = 1 - t; q.push([u * u * A[0] + 2 * u * t * C[0] + t * t * B[0], u * u * A[1] + 2 * u * t * C[1] + t * t * B[1]]); }
    taper(kg, q, (u) => wm * (0.2 + 0.8 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.05)), 0.7)), grey(v)); };
  arc([1283, 391.5], [1300, 385], [1328, 393.5], 4.6, 238);
  arc([1461, 395.5], [1484, 389], [1509, 396], 4.4, 128);
  softHalf(k, 1, 2);
  g.drawImage(k, 1225, 370);
}
// The slatted panel (x 1130-1520): in the source the dark slats are solid black with fine white specks along their
// edges; the trace left grey pockmark islands inside them and smooth edges. Dark pixels 3+ px from any lit pixel are
// dithered into fine speckle of the same mean; then seeded 1-2 px white specks are put 1-3 px inside the dark side of
// the lit/dark edges (about one per 6 px of edge). Once, on the plate's pixels, then softened half a pixel. Deterministic.
const SLATS = [1130, 0, 1520, 946];
export const SLATK = { rate: 1 / 6 };

function slatPanel(canvas, y1 = 946) {
  const [x0, y0, x1] = SLATS, w = x1 - x0, h = Math.min(y1, canvas.height) - y0;
  const g = canvas.getContext("2d", { willReadFrequently: true }), id = g.getImageData(x0, y0, w, h), d = id.data;
  // lit = the slats: connected areas brighter than 115 of at least 400 px (smaller bright bits are islands)
  const lit = new Uint8Array(w * h), seen = new Uint8Array(w * h), stack = new Int32Array(w * h);
  for (let p0 = 0; p0 < w * h; p0++) {
    if (seen[p0] || d[4 * p0] <= 115) continue;
    let top = 0, n = 0; const comp = []; stack[top++] = p0; seen[p0] = 1;
    while (top) { const p = stack[--top]; comp.push(p); n++; const i = p % w, j = (p - i) / w;
      for (const q of [i > 0 ? p - 1 : -1, i < w - 1 ? p + 1 : -1, j > 0 ? p - w : -1, j < h - 1 ? p + w : -1]) if (q >= 0 && !seen[q] && d[4 * q] > 115) { seen[q] = 1; stack[top++] = q; } }
    if (n >= 400) for (const p of comp) lit[p] = 1;
  }
  // distance (in px, chessboard, up to 3) to the nearest lit pixel
  const near = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (!lit[j * w + i]) continue;
    for (let dj = -3; dj <= 3; dj++) { const jj = j + dj; if (jj < 0 || jj >= h) continue; for (let di = -3; di <= 3; di++) { const ii = i + di; if (ii >= 0 && ii < w) near[jj * w + ii] = 1; } }
  }
  // the grey islands inside the dark slats become fine speckle of the same mean (the blurred value is the source's;
  // the flat grey blotches were not): each such pixel is black or a white speck, by a seeded threshold on its value
  for (let p = 0; p < w * h; p++) if (!near[p] && !lit[p]) {
    const v0 = d[4 * p]; if (v0 <= 12) continue;
    const i = p % w, j = (p - i) / w, v = hash(i + x0, j + y0, 5077) < (v0 - 8) / 212 ? 220 : 8;
    d[4 * p] = d[4 * p + 1] = d[4 * p + 2] = v;
  }
  const rate = SLATK.rate;
  const put = (i, j, v) => { if (i < 0 || j < 0 || i >= w || j >= h) return; const q = 4 * (j * w + i); if (lit[j * w + i]) return; d[q] = d[q + 1] = d[q + 2] = Math.max(d[q], v); };
  for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) {
    const p = j * w + i; if (lit[p]) continue;
    const L = lit[p - 1], R = lit[p + 1]; if (!(L || R) || (L && R)) continue;
    if (hash(i + x0, j + y0, 18042) > rate) continue;
    const dir = L ? 1 : -1, off = 1 + Math.floor(hash(i + x0, j + y0, 7) * 3), big = hash(j + y0, i + x0, 11) < 1 / 3;
    const v = 190 + Math.floor(hash(i + x0, j + y0, 13) * 50);
    put(i + dir * off, j, v); if (big) { put(i + dir * off, j + 1, v - 30); put(i + dir * (off + 1), j, v - 50); }
  }
  // a lit block the trace left at x 1459-1510, y 198-224 (the source is black there but for two thin lit lines)
  for (let j = 198; j < 224; j++) for (let i = 1459; i < 1510; i++) {
    const q = 4 * ((j - y0) * w + i - x0);
    if (i >= 1478 && i < 1494) { const u = (j - 197) / 28, a = 4 * ((197 - y0) * w + i - x0), b = 4 * ((225 - y0) * w + i - x0); d[q] = d[q + 1] = d[q + 2] = Math.round(d[a] * (1 - u) + d[b] * u); }   // the thin slat carries on
    else if (d[q] < 185) d[q] = d[q + 1] = d[q + 2] = Math.min(d[q], 10);
  }
  g.putImageData(id, x0, y0);
}
// copy zone [x0, y0, x1, y1] of src over dst, fading in over `feather` px at its top
function restoreZone(dst, src, [x0, y0, x1, y1], feather) {
  const g = dst.getContext("2d");
  g.save();
  g.drawImage(src, x0, y0 + feather, x1 - x0, y1 - y0 - feather, x0, y0 + feather, x1 - x0, y1 - y0 - feather);
  for (let i = 0; i < feather; i++) { g.globalAlpha = (i + 0.5) / feather; g.drawImage(src, x0, y0 + i, x1 - x0, 1, x0, y0 + i, x1 - x0, 1); }
  g.restore();
}
let L = null;
export function platesB() {
  if (L) return L;
  const bg = cpuCanvas(2206, 946);
  const bgc = bg.getContext("2d"); bgc.fillStyle = "#000"; bgc.fillRect(0, 0, 2206, 946);
  drawInk(bgc, decodeInk(BG_B), { wk: WK });
  softHalf(bg, 1);
  slatPanel(bg);
  softHalf(bg, 1, 1, [SLATS[0], SLATS[1], SLATS[2] - SLATS[0], SLATS[3] - SLATS[1]]);
  const bgRaw = cpuCanvas(2206, 946); bgRaw.getContext("2d").drawImage(bg, 0, 0);
  applyTone(bg, TONE_B.bg);   // the measured value-study correction (blurred values matched to the source plate)
  const KW = M + KB_R, KH = 946 + M;
  const kb = cpuCanvas(KW, KH);
  const kg = kb.getContext("2d");
  kg.save(); kg.translate(M, 0); kbMask(kg); kg.restore();
  drawInk(kg, decodeInk(KB_B), { wk: WK });
  softHalf(kb, 1);
  const kbRaw = cpuCanvas(KW, KH); kbRaw.getContext("2d").drawImage(kb, 0, 0);
  applyTone(kb, TONE_B.kb);   // the keyboard's own value-study correction (alpha untouched: it stays inside the keyboard)
  { const g = kb.getContext("2d"); g.save(); g.translate(M, 0); knobRow(g); g.restore(); }
  // until 1417 the keyboard does not move: background and keyboard as one opaque plate (one blit, no blending)
  const still = cpuCanvas(2206, 946);
  const sg = still.getContext("2d"); sg.drawImage(bgRaw, 0, 0); sg.drawImage(kbRaw, -M, 0);
  const stillRaw = cpuCanvas(2206, 946); stillRaw.getContext("2d").drawImage(still, 0, 0);
  applyTone(still, TONE_B.still);
  // the slats' lower ends: the fitted shade blobs straddling the slat / knob-row boundary left a soft black haze
  // there; that zone keeps its untoned drawing (feathered in over 14 px at the top), then the knob row is drawn on it
  restoreZone(still, stillRaw, KNOB_ZONE, 14);
  knobRow(sg);
  L = { bg, kb, still };
  return L;
}
let acc = null;
export function drawKeyboard(ctx, f) {
  const P = platesB(), tp = tipRow(f), bl = TIP_BLUR[f];
  if (bl) {
    if (!acc) acc = cpuCanvas(2206, 946);
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
// The wing's covert feathers at 1425 (held 1426): soft dark scallop arcs, read off the source frame (the traced ticks
// inside box are replaced): [x0, y0, cx, cy, x1, y1] quadratic arcs, drawn dark grey before the layer is softened.
const SCALLOPS = { 1425: { box: [20, 470, 150, 840], v: 150, w: 8.5, tipV: 120, a: 0.55,
  lines: [[[48, 548], [58, 528], [72, 515], [85, 512], [82, 530], [78, 550]],
    [[52, 612], [62, 592], [80, 580], [100, 578], [118, 590], [108, 615], [98, 640], [92, 660]],
    [[55, 712], [66, 695], [84, 683], [104, 683], [120, 695], [108, 725], [98, 750], [90, 775]],
    [[40, 822], [60, 812], [88, 818]]],
  tips: [[86, 516, 4], [121, 593, 4.5], [121, 697, 4.5], [88, 820, 4]] } };
// fix pass 2 (review 2): the hooks read as thin fishhook squiggles with dot ends; the source's coverts are soft rounded
// U-bands ~8-10 px wide, ~30-40 levels below the wing's white, their tips a little darker. Drawn as 8.5 px bands into a
// scratch canvas, softened (sigma 3), then laid on the wing.
let scC = null;
function scallops(g, S) {
  const [bx0, by0, bx1, by1] = S.box, w = bx1 - bx0 + 24, h = by1 - by0 + 24;
  if (!scC || scC.width < w || scC.height < h) scC = cpuCanvas(w, h);
  const c = scC.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.clearRect(0, 0, scC.width, scC.height);
  c.translate(12 - bx0, 12 - by0); c.lineCap = "round"; c.lineJoin = "round";
  for (const L2 of S.lines) {
    c.strokeStyle = grey(S.v); c.lineWidth = S.w; c.beginPath(); c.moveTo(L2[0][0], L2[0][1]);
    for (let i = 1; i < L2.length - 1; i++) { const mx = (L2[i][0] + L2[i + 1][0]) / 2, my = (L2[i][1] + L2[i + 1][1]) / 2; c.quadraticCurveTo(L2[i][0], L2[i][1], mx, my); }
    c.lineTo(L2[L2.length - 1][0], L2[L2.length - 1][1]); c.stroke();
  }
  c.fillStyle = grey(S.tipV);
  for (const [x, y, r] of S.tips) { c.beginPath(); c.ellipse(x, y, r, r * 1.4, -0.5, 0, 2 * Math.PI); c.fill(); }
  c.setTransform(1, 0, 0, 1, 0, 0);
  softRect(scC, w, h, 3);
  g.save(); g.globalAlpha = S.a; g.drawImage(scC, 0, 0, w, h, bx0 - 12, by0 - 12, w, h); g.restore();
}
// fix pass 4: per-frame directional blur of the flying owl [dx, dy, isotropic half-pixel passes], fitted on the source
// (fitflyblur: the owl layer's gradient structure tensor matched to the source's inside the owl, with the sigma-2 error
// not allowed to grow; a longer smear only made the error worse, so the fitted smears are short)
export const FLYK = { raw: false, dropGrey: true, litOnly: false, rampDark: false, shelf: null, ramp: 3, dir: { 1419: [-5.7, 5.7, 2], 1420: [-2.1, 7.7, 2], 1421: [-2.1, 7.7, 2], 1422: [-2.1, 7.7, 2], 1423: [-4.0, 6.9, 4], 1424: [0.0, 0.0, 8], 1425: [0.0, 0.0, 4], 1427: [0.0, 0.0, 4], 1429: [-5.7, 5.7, 4], 1430: [-6.9, 4.0, 4] } };
let acc2 = null, rampC = null;
// fix pass 2 (review 2): the take-off owl's edge had a ~10 px shelf at 50-60 outside the lit masses (a dark outline);
// the source's edge runs on down to black. The layer's dark values under FLYK.shelf[0] are pressed down by a power
// curve (v' = hi (v / hi)^g), in the owl's box, after the blur (alpha untouched).
function shelfCurve(c, x, y, w, h) {
  const sh = FLYK.shelf; if (!sh) return;
  const [hi, gm] = sh, lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = v < hi ? Math.round(hi * Math.pow(v / hi, gm)) : v;
  x = Math.max(0, Math.floor(x)); y = Math.max(0, Math.floor(y)); w = Math.min(c.width - x, Math.ceil(w)); h = Math.min(c.height - y, Math.ceil(h));
  const g = c.getContext("2d", { willReadFrequently: true }), id = g.getImageData(x, y, w, h), d = id.data;
  for (let p = 0; p < d.length; p += 4) { d[p] = lut[d[p]]; d[p + 1] = lut[d[p + 1]]; d[p + 2] = lut[d[p + 2]]; }
  g.putImageData(id, x, y);
}
export const FLY_SOFT = { 1417: 8, 1418: 8, 1419: 8, 1420: 8, 1421: 8, 1422: 8, 1423: 8, 1424: 8, 1425: 8, 1427: 8, 1429: 8, 1430: 8, 1432: 8 };
const FLY_HOLE = 150, FLY_SIG = 11, TAIL_X = 1560, HALO_A = 2500;
// a mass's value at the middle of its bounds (0..1)
function massValue(Mm) {
  const f = Mm.f; if (typeof f === "number") return f / 255;
  const q = f[0] === "r" ? f[3] : f; if (typeof q === "number") return q / 255;
  const b = ringsBBox(Mm.rings), x = (b[0] + b[2]) / 2, y = (b[1] + b[3]) / 2;
  return q[1] + q[2] * x + q[3] * y + (q.length > 4 ? q[4] * x * x + q[5] * x * y + q[6] * y * y : 0);
}
function widenBlobs(f) {
  if (!Array.isArray(f)) return;
  if (f[0] === "r") { widenBlobs(f[3]); return; }
  if (f[0] !== "qb") return;
  for (let b = 7; b < f.length; b += 4) { const s = f[b + 2]; if (s < FLY_SIG) { f[b + 3] *= (s / FLY_SIG) ** 2; f[b + 2] = FLY_SIG; } }
}
const ringArea = (r) => { let a = 0; for (let i = 0, n = r.length; i < n; i += 2) { const j = (i + 2) % n; a += r[i] * r[j + 1] - r[j] * r[i + 1]; } return a / 2; };
// (fix pass 2 of review 2 tried the review's restyling of the wedges: stripe spacing jittered +-25 % and widths +-30 %
// per band, the stripes converging 3-5 deg, the boundary feathered at sigma 1.5, the left 20 % at half contrast, the
// light gaps capped at 200. Every variant raised the error on the two long wedges (1384, 1400: sigma-6 in the wedge box
// 15.1 / 19.8 crisp -> 18.8 / 23.1 restyled; width jitter alone 15.8 / 21.1; feathering alone lightened them by 5-6
// levels), because the fitted phase, pitch and polygon are what line up with the source. The fitted crisp wedges stay.)
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
// Pressed-key stripe wedges the trace missed (fix pass 4): polygons read off 3x gridded source crops, stripe angle,
// pitch, phase, width and tones fitted inside them on the pre-grade frame (trace2/fit_bands.py). 1401 holds 1400.
const BANDS_FIX = {
  1383: [[[[998, 655], [1062, 677], [1067, 683], [1067, 727], [1060, 727], [998, 707]], 0.36, 10.5, 1.27, 7.25, 9, 147]],
  1394: [[[[998, 656], [1063, 678], [1067, 684], [1067, 728], [1060, 728], [998, 710]], 0.31, 8.25, 4.51, 5.38, 24, 163]],
  1384: [[[[1000, 641], [1197, 689], [1199, 736], [1060, 688], [1000, 662]], 0.3, 11.25, 1.57, 8.18, 10, 231]],
  1400: [[[[1003, 634], [1197, 683], [1199, 737], [1066, 694], [1003, 662]], 0.305, 11.375, 3.4, 8.23, 10, 229]],
};
// key-drop lines: the traced ones at y ~740 were 5-8 px wide where the source's are ~3; the two 30-px near-black
// bars (1383, 1394) were a mis-trace of the wedge (dropped); 1383's drop line is horizontal in the source (y 737)
const KLINE_W = 3.6;
function fixKlines(K) {
  const out = {};
  for (const [n, L] of Object.entries(K)) out[n] = L.filter((l) => l[4] <= 20).map((l) => [l[0], l[1], l[2], l[3], Math.min(l[4], KLINE_W), l[5]]);
  out[1383] = [[1062, 737, 926, 737, KLINE_W, 35]];
  return out;
}
let O = null, layer = null;
function owlData() {
  if (O) return O;
  const T = OWL_B;
  O = { belly: decodeInk(T.belly), tail: decodeInk(T.tail), wing: {}, parts: {}, keys: {}, fly: {}, tailA: T.tailA, state: T.state, bands: { ...(T.bands || {}) }, klines: fixKlines(T.klines || {}) };
  for (const [n, b] of Object.entries(BANDS_FIX)) O.bands[n] = [...(O.bands[n] || []), ...b];
  for (const [k, v] of Object.entries(T.wing)) O.wing[k] = v ? decodeInk(v) : null;
  // the belly was traced with frame 1382's tail beside it: the dark gaps between those tail feathers (right of the
  // belly, x > TAIL_X in belly coords) are the wall showing through, not the owl; carried along TRACK_B they would
  // cut black holes into the separately moving tail, so they are dropped (the plate shows there instead)
  O.belly.base = O.belly.base.filter((Mm) => ringsBBox(Mm.rings)[0] < TAIL_X);
  for (const k of ["parts", "keys", "fly"]) for (const [n, v] of Object.entries(T[k])) O[k][n] = decodeInk(v);
  // the per-frame parts were traced as what the frame adds to the rigid drawings, so they also caught the sliver of
  // belly between the belly's cut and the tail's cut edge (a white mass with a dark rim, read as a seam line); the
  // junction underlay paints that now, so every part mark lying inside the junction band above the underside goes
  for (const [n, D] of Object.entries(O.parts)) {
    const A = O.tailA[n], r = TRACK_B[Math.min(TRACK_B.length - 1, +n - 1382)];
    if (!A || !r) continue;
    const be = CUT + r[1], te = (y) => A[0][0] * 1540 + A[0][1] * y + A[0][2];
    const junc = (bb) => { if (bb[3] > 235) return false; const ym = (bb[1] + bb[3]) / 2, lo = Math.min(be, te(ym)) - 12, hi = Math.max(be, te(ym)) + 12; return bb[0] >= lo && bb[2] <= hi; };
    for (const L of ["base", "m", "s"]) D[L] = D[L].filter((Mm) => !junc(ringsBBox(Mm.rings)));
    for (const L of ["d", "b"]) D[L] = D[L].filter((s) => !junc([Math.min(...s.x), Math.min(...s.y), Math.max(...s.x), Math.max(...s.y)]));
  }
  // the leaping owl is traced from motion-blurred frames: the grain there leaves pin holes in its lit masses (dark
  // dots in rows along the edges, which the source does not have); holes under FLY_HOLE px are closed
  for (const D of Object.values(O.fly)) for (const Mm of D.m) Mm.rings = Mm.rings.filter((r, i) => i === 0 || Math.abs(ringArea(r)) >= FLY_HOLE);
  // ... and the shading blobs fitted to its motion streaks read as rows of beads: blobs narrower than FLY_SIG are
  // widened to it with the same integrated amount of light, so a row of them becomes a soft streak
  for (const D of Object.values(O.fly)) for (const Mm of [...D.m, ...D.base]) widenBlobs(Mm.f);
  return O;
}
const LP = 24;   // the flying owl's layer reaches LP px past the frame on every side (see below)
function owlLayer() {
  if (!layer) layer = cpuCanvas(2206 + 2 * LP, 946 + 2 * LP);
  const g = layer.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, layer.width, layer.height);
  g.setTransform(1, 0, 0, 1, LP, LP);
  return g;
}
// the owl runs off the frame edge: its edge rows / columns are repeated into the layer's margin, so the softening
// does not pull transparency in (which would darken the owl along the frame border)
function extendEdges(g) {
  const W = 2206, H = 946, c = layer;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  g.drawImage(c, LP, LP, 1, H, 0, LP, LP, H); g.drawImage(c, LP + W - 1, LP, 1, H, LP + W, LP, LP, H);
  g.drawImage(c, 0, LP, W + 2 * LP, 1, 0, 0, W + 2 * LP, LP); g.drawImage(c, 0, LP + H - 1, W + 2 * LP, 1, 0, LP + H, W + 2 * LP, LP);
  g.restore();
}
// The belly (traced up to belly x CUT) and the tail (traced from tail x 1540) are two drawings on two tracks, so
// between them a gap of up to 24 px opens on some frames (1383-1385, 1402, 1409, 1414...) and the black plate showed
// through as a stripe; where they overlap, the belly's cut edge left a thin seam. Measured belly white next to the cut:
// 244-251 (pre-grade). So: (1) the belly's last FADE px fade out (alpha ramp, once per cached boil variant), (2) an
// opaque underlay in the belly's white is painted between the tail's affine and the belly's track, from belly x
// CUT - 20 to tail x 1548 (covering the tail's cut edge too), down to the owl's underside at the junction.
const CUT = 1538, FADE = 14, JUNC_V = 247;
function fadeCut(dc) {
  const c = dc.c, g = c.getContext("2d", { willReadFrequently: true });
  const i0 = Math.max(0, Math.floor(CUT - FADE - dc.x)), i1 = Math.min(c.width, Math.ceil(CUT + 2 - dc.x));
  if (i1 <= i0) return;
  const id = g.getImageData(i0, 0, i1 - i0, c.height), dd = id.data, w = i1 - i0;
  for (let j = 0; j < c.height; j++) for (let i = 0; i < w; i++) {
    const bx = dc.x + i0 + i + 0.5, a = Math.max(0, Math.min(1, (CUT - bx) / FADE));
    dd[4 * (j * w + i) + 3] = Math.round(dd[4 * (j * w + i) + 3] * a);
  }
  g.putImageData(id, i0, 0);
}
function junction(ctx, A, r, o = 0) {
  const bel = (x, y) => [x + r[1], y + r[2] + RY0];
  const tl = (x, y) => [A[0][0] * x + A[0][1] * y + A[0][2], A[1][0] * x + A[1][1] * y + A[1][2]];
  const P = [bel(CUT - 20, -120), tl(1548, -120), tl(1548, 238), bel(CUT, 276), bel(CUT - 10, 285), bel(CUT - 20, 293)];
  ctx.setTransform(1, 0, 0, 1, o, o);
  ctx.fillStyle = grey(JUNC_V);
  ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath();
  ctx.fill("nonzero");
}
// softening of the standing owl's layer (half-pixel passes, sigma ~0.71 sqrt(n)) and the rows it covers
export const OWLB_SOFT = 2, OWLB_Y1 = 820;
// Lifted feet that are motion-blurred in the source (read off the frames: soft edges and streaks along the motion):
// their traced marks were drawn crisp, as posterized grey blobs. Per frame, [x0, y0, x1, y1, dx, dy]: the marks whose
// centre lies in the box are drawn into a scratch layer and smeared along (dx, dy) (9 exact shifted copies, then a
// sigma-1.2 softening).
// fix pass 2 (review 2): 1385, 1391 and 1400 (held 1401) added; an optional 7th value is the softening passes.
const PART_BLUR = {
  1387: [[1060, 395, 1160, 510, 12, 0]], 1392: [[820, 405, 1065, 530, 14, 0]], 1395: [[900, 410, 1045, 530, 0, 14]],
  1404: [[1025, 420, 1135, 530, 12, 0]], 1405: [[675, 410, 885, 535, 0, 14], [915, 415, 985, 515, 0, 12]],
  1385: [[1000, 290, 1250, 545, 0, 12, 6]], 1391: [[1150, 330, 1290, 525, 0, 10, 5]], 1400: [[1000, 300, 1220, 560, 0, 0, 8]],
};
let pbA = null, pbB = null, upC = null;
// The near wing's feather contours sweeping over the belly (the part marks above UP_Y) were traced as a grey band with
// a dark core; in the source they are soft dark lines with a soft shade beside them (the wing is motion-blurred). Their
// filled marks go through a scratch layer softened by UP_SIG, their centre-lines stay crisp over it.
// Per frame (read off the source: the near wing is soft only while it sweeps fast), sigma px; only marks left of the
// tail (x1 < belly track + 1450) are softened.
const UP_Y = 335, UP_SIG = { 1384: 2.2, 1394: 2.0, 1396: 1.4, 1400: 1.4, 1401: 1.4, 1404: 1.4, 1411: 3.4, 1415: 2.8, 1416: 2.8 };
function drawPartsSoftTop(g, pt, opts, k) {
  const sig = UP_SIG[k];
  if (!sig) return pt;
  if (!pt._up) {
    const r = TRACK_B[Math.min(TRACK_B.length - 1, k - 1382)], xr = r[1] + 1450;
    const top = (Mm) => { const b = ringsBBox(Mm.rings); return b[3] < UP_Y && b[2] < xr; }, E = [];
    // paint order as before: the other silhouettes first, then the soft top marks, then the other masses and strokes
    pt._up = { soft: { base: pt.base.filter(top), m: pt.m.filter(top), s: pt.s.filter(top), d: E, b: E, o: E },
      under: { base: pt.base.filter((Mm) => !top(Mm)), m: E, s: E, d: E, b: E, o: E },
      rest: { base: E, m: pt.m.filter((Mm) => !top(Mm)), s: pt.s.filter((Mm) => !top(Mm)), d: pt.d, b: pt.b, o: pt.o } };
    pt._up.any = pt._up.soft.base.length + pt._up.soft.m.length + pt._up.soft.s.length > 0;
  }
  if (pt._up.any) {
    drawInk(g, pt._up.under, { ...opts, cache: false });
    if (!pt._up.box) {
      let b = [Infinity, Infinity, -Infinity, -Infinity];
      for (const L2 of [pt._up.soft.base, pt._up.soft.m, pt._up.soft.s]) for (const Mm of L2) { const q = ringsBBox(Mm.rings); b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])]; }
      const m = Math.ceil(3 * sig) + 2, X0 = Math.floor(b[0]) - m, Y0 = Math.floor(b[1]) - m;
      pt._up.box = [X0, Y0, Math.ceil(b[2]) + m - X0, Math.ceil(b[3]) + m - Y0];
    }
    const [X0, Y0, w, h] = pt._up.box;
    if (!upC || upC.width < w || upC.height < h) upC = cpuCanvas(Math.max(w, upC ? upC.width : 0), Math.max(h, upC ? upC.height : 0));
    const u = upC.getContext("2d");
    u.setTransform(1, 0, 0, 1, 0, 0); u.clearRect(0, 0, upC.width, upC.height); u.translate(-X0, -Y0);
    drawInk(u, pt._up.soft, { ...opts, cache: false });
    u.setTransform(1, 0, 0, 1, 0, 0);
    softRect(upC, w, h, sig);
    const t = g.getTransform(); g.save(); g.setTransform(1, 0, 0, 1, t.e, t.f); g.drawImage(upC, 0, 0, w, h, X0, Y0, w, h); g.restore();
    return pt._up.rest;
  }
  return pt;
}
function drawParts(g, pt0, k, opts) {
  const boxes = PART_BLUR[k];
  const pt = drawPartsSoftTop(g, pt0, opts, k);
  if (!boxes) { drawInk(g, pt, { ...opts, cache: false }); return; }
  // crisp everywhere but in the boxes; in each box (grown 6 px, so the two overlap a little) smeared
  g.save(); g.beginPath(); g.rect(-4000, -4000, 9000, 9000);
  for (const [x0, y0, x1, y1] of boxes) g.rect(x0, y0, x1 - x0, y1 - y0);
  g.clip("evenodd"); drawInk(g, pt, { ...opts, cache: false }); g.restore();
  for (const [x0, y0, x1, y1, dx, dy, sp] of boxes) {
    const pad = 12, X0 = x0 - pad - Math.abs(dx), Y0 = y0 - pad - Math.abs(dy), w = x1 - x0 + 2 * (pad + Math.abs(dx)), h = y1 - y0 + 2 * (pad + Math.abs(dy));
    if (!pbA || pbA.width < w || pbA.height < h) { pbA = cpuCanvas(Math.max(w, pbA ? pbA.width : 0), Math.max(h, pbA ? pbA.height : 0)); pbB = cpuCanvas(pbA.width, pbA.height); }
    const a = pbA.getContext("2d"), b = pbB.getContext("2d");
    a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, pbA.width, pbA.height); a.translate(-X0, -Y0);
    a.save(); a.beginPath(); a.rect(x0 - 6, y0 - 6, x1 - x0 + 12, y1 - y0 + 12); a.clip();
    drawInk(a, pt, { ...opts, cache: false }); a.restore(); a.setTransform(1, 0, 0, 1, 0, 0);
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = "source-over"; b.globalAlpha = 1; b.clearRect(0, 0, pbB.width, pbB.height);
    b.globalCompositeOperation = "lighter"; b.globalAlpha = 1 / 9;
    for (let q = 0; q < 9; q++) { const u = q / 8 - 0.5; b.drawImage(pbA, u * dx, u * dy); }
    b.globalCompositeOperation = "source-over"; b.globalAlpha = 1;
    softHalf(pbB, 1, sp || 3, [0, 0, w, h]);
    g.drawImage(pbB, 0, 0, w, h, X0, Y0, w, h);
  }
}
export function drawOwlB(ctx, f) {
  const d = owlData(), k = HOLD[f] || f, cf = contentFrame(f);
  const opts = { map: boilMap(cf, BOIL), tone: boilTone(cf, TJIT), wk: WK_OWL };
  if (f <= 1416) {
    // the keys pressed down: the side wall of the neighbouring key shows as a wedge of parallel dark lines
    // (measured per frame: outline, line angle, pitch, phase, width and tones), then the key's dropped front lines
    // and the other key marks
    for (const b of d.bands[k] || []) drawBand(ctx, b);
    for (const [x0, y0, x1, y1, w, t] of d.klines[k] || []) { ctx.strokeStyle = grey(t); ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
    if (d.keys[k]) drawInk(ctx, d.keys[k], { wk: WK, cache: false });
    // the owl straight into the frame: the rigid parts in one of their pre-drawn boil variants (painted and
    // softened once each); the per-frame parts drawn as vectors, their shaded masses as the linear gradients of
    // their measured fields (canvas images that change every frame are what is slow in the renderer)
    const A = d.tailA[k];
    const v = boilVariant(cf), vopts = { map: boilMap(1000 + v, BOIL), tone: boilTone(1000 + v, TJIT), wk: WK_OWL };
    // the owl goes through its own layer (LP px margin), softened as a whole: the source's close-up owl is a soft,
    // near-camera drawing (gradient p99 inside the owl ~136 against ~178 drawn crisp; the keys stay crisp)
    const g = owlLayer(), o = LP;
    const rigid = (D, belly) => {
      const dc = drawnCanvas(D, v, vopts, 1);
      if (!dc) return;
      if (!dc.toned) { applyTone(dc.c, TONE_OWL_B, { dx: dc.x, dy: dc.y }); if (belly) fadeCut(dc); dc.toned = true; }   // the measured value study
      g.drawImage(dc.c, dc.x, dc.y);
    };
    // the tail moves under its own affine: turned images are slow to draw here, so it is drawn as vectors (its
    // shaded masses as linear gradients)
    if (A) { g.setTransform(A[0][0], A[1][0], A[0][1], A[1][1], A[0][2] + o, A[1][2] + o); drawInk(g, d.tail, opts); }
    const r = TRACK_B[Math.min(TRACK_B.length - 1, f - 1382)];
    if (A) junction(g, A, r, o);
    g.setTransform(1, 0, 0, 1, r[1] + o, r[2] + RY0 + o);
    rigid(d.belly, true);
    const w = d.wing[d.state[k]];
    if (w) rigid(w);
    g.setTransform(1, 0, 0, 1, o, o);
    const pt = d.parts[k];
    if (pt) drawParts(g, pt, k, opts);
    extendEdges(g);
    softHalf(layer, 1, OWLB_SOFT, [0, 0, layer.width, OWLB_Y1 + LP]);
    ctx.drawImage(layer, LP, LP, 2206, OWLB_Y1, 0, 0, 2206, OWLB_Y1);
    return;
  }
  // the leap and take-off: motion-blurred in the source, so this owl is drawn into a layer and softened inside its
  // own box only (the keyboard stays crisp under it)
  const fl = d.fly[k];
  if (!fl) return;
  const g = owlLayer();
  // the grey silhouette pieces round the lit masses (the traced plateau of the motion-blur ramp, 60-150) read as a
  // hard grey rim: dropped from 1419 on (the directional blur below makes the ramp)
  if (!fl._ng) {
    const sc = SCALLOPS[k], inSc = (st) => sc && Math.max(...st.x) < sc.box[2] && Math.min(...st.x) > sc.box[0] && Math.min(...st.y) > sc.box[1] && Math.max(...st.y) < sc.box[3];
    const isGrey = (Mm) => { const v = massValue(Mm); return v > 0.2 && v < 0.62; }, E = [];
    fl._ng = { ...fl, base: fl.base.filter((Mm) => !isGrey(Mm)), m: E, s: E, d: E, b: E, o: E };
    fl._gr = { base: fl.base.filter(isGrey), m: E, s: E, d: E, b: E, o: E };
    fl._top = { base: E, m: fl.m, s: fl.s, d: fl.d.filter((st) => !inSc(st)), b: fl.b, o: fl.o };
  }
  if (k >= 1419 && FLYK.dropGrey && FLYK.litOnly) {
    // fix pass 2 (review 2): the dark and grey silhouette pieces round the lit masses made a ~12 px shelf at 50-60 (a
    // dark outline round every feather); the source ramps smoothly from the lit mass to black. Only the lit pieces and
    // the strokes are drawn; the soft edge comes from the blur below (and the lit masses' feathered edge)
    if (!fl._lit) { const E = []; fl._lit = { base: fl.base.filter((Mm) => massValue(Mm) >= 0.62), m: E, s: E, d: E, b: E, o: E }; }
    drawInk(g, fl._lit, { ...opts, cache: false });
    drawInk(g, fl._top, { ...opts, cache: false });
  } else if (k >= 1419 && FLYK.dropGrey) {
    // the dark pieces, then the grey plateau pieces blurred into a soft ramp (at quarter resolution, sigma ~5 px),
    // then the lit masses and the strokes
    // (fix pass 2, review 2: with FLYK.rampDark the dark pieces go into the soft ramp too, so no flat dark shelf is
    // left round the lit masses)
    if (!fl._dk) { const E = []; fl._dk = { base: fl._ng.base.filter((Mm) => massValue(Mm) <= 0.2), m: E, s: E, d: E, b: E, o: E }; fl._lt = { base: fl._ng.base.filter((Mm) => massValue(Mm) > 0.2), m: E, s: E, d: E, b: E, o: E }; }
    if (!FLYK.rampDark) drawInk(g, fl._ng, { ...opts, cache: false });
    rampC = cpuCanvas(Math.ceil(layer.width / 4) + 2, Math.ceil(layer.height / 4) + 2);   // fresh each frame (a reused one left 1-level differences that depended on render order)
    const rg = rampC.getContext("2d");
    rg.setTransform(1, 0, 0, 1, 0, 0); rg.clearRect(0, 0, rampC.width, rampC.height); rg.setTransform(0.25, 0, 0, 0.25, LP / 4, LP / 4);
    if (FLYK.rampDark) drawInk(rg, fl._dk, { ...opts, cache: false });
    drawInk(rg, fl._gr, { ...opts, cache: false });
    softHalf(rampC, 1, FLYK.ramp);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "low"; g.drawImage(rampC, 0, 0, rampC.width * 4, rampC.height * 4); g.restore();
    if (FLYK.rampDark) drawInk(g, fl._lt, { ...opts, cache: false });
    drawInk(g, fl._top, { ...opts, cache: false });
  } else drawInk(g, fl, { ...opts, cache: false });
  if (SCALLOPS[k] && FLYK.dropGrey && !FLYK.noSc) scallops(g, SCALLOPS[k]);
  if (CUP_TONE[k]) toneBox(layer, CUP_TONE[k]);
  if (!fl._box) {   // the owl's box: every mark's bounds
    let b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const L2 of [fl.base, fl.m, fl.s]) for (const M2 of L2) { const q = ringsBBox(M2.rings); b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])]; }
    fl._box = b;
  }
  const bb = fl._box;
  const x0 = Math.max(0, Math.floor(bb[0]) - 6), y0 = Math.max(0, Math.floor(bb[1]) - 6), x1 = Math.min(2206, Math.ceil(bb[2]) + 6), y1 = Math.min(946, Math.ceil(bb[3]) + 6);
  extendEdges(g);
  if (FLYK.raw) { ctx.drawImage(layer, x0 + LP, y0 + LP, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); return; }
  const mb = FLYK.dir[k];
  if (mb && !mb[0] && !mb[1]) { softHalf(layer, 1, mb[2], [x0 + LP - 12, y0 + LP - 12, x1 - x0 + 24, y1 - y0 + 24]); if (k >= 1419) shelfCurve(layer, x0 + LP, y0 + LP, x1 - x0, y1 - y0); ctx.drawImage(layer, x0 + LP, y0 + LP, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); return; }
  if (mb) {
    // directional motion blur [dx, dy] (the exact average of 11 shifted copies), then an isotropic softening
    if (!acc2 || acc2.width !== layer.width || acc2.height !== layer.height) acc2 = cpuCanvas(layer.width, layer.height);
    const [mx, my, ps] = mb, a = acc2.getContext("2d"), N = Math.min(11, Math.max(3, Math.ceil(Math.hypot(mx, my) / 1.2)));
    const bx = x0 + LP - 12 - Math.ceil(Math.abs(mx) / 2), by = y0 + LP - 12 - Math.ceil(Math.abs(my) / 2);
    const bw = x1 - x0 + 24 + Math.ceil(Math.abs(mx)), bh = y1 - y0 + 24 + Math.ceil(Math.abs(my));
    a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = "source-over"; a.globalAlpha = 1; a.clearRect(bx, by, bw, bh);
    a.save(); a.beginPath(); a.rect(bx, by, bw, bh); a.clip();
    a.globalCompositeOperation = "lighter"; a.globalAlpha = 1 / N;
    for (let i = 0; i < N; i++) { const u = i / (N - 1) - 0.5; a.drawImage(layer, u * mx, u * my); }
    a.restore(); a.globalCompositeOperation = "source-over"; a.globalAlpha = 1;
    softHalf(acc2, 1, ps, [bx, by, bw, bh]);
    if (k >= 1419) shelfCurve(acc2, x0 + LP, y0 + LP, x1 - x0, y1 - y0);
    ctx.drawImage(acc2, x0 + LP, y0 + LP, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    return;
  }
  softHalf(layer, 1, FLY_SOFT[k] || 1, [x0 + LP - 12, y0 + LP - 12, x1 - x0 + 24, y1 - y0 + 24]);
  ctx.drawImage(layer, x0 + LP, y0 + LP, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
}
// fix pass 2 (review 2): on the close-up's first two frames the keys under and right of the foot lie in a deep shadow
// in the source (the key pressed down) that the plate does not have (render 8-10 levels too bright over the keys, up
// to 50 locally). Measured shade blobs (snapshots/s18-fix2-h/fitshade.py: tone.js form, shade only, blur 4, fitted
// on the graded frame in the boxes x 1150-1480 / 560-1050 / 1180-1640, y 520-740), applied to the plate only.
const SHADE_B = {
  1382: [[1375.5, 677.5, 24.0, -0.85], [1315.5, 644.5, 24.0, -0.85], [1389.5, 678.5, 24.0, -0.85], [1266.5, 645.5, 16.0, -0.8066], [1350.5, 652.5, 16.0, -0.85], [1403.5, 700.5, 10.0, -0.8418], [1297.5, 642.5, 10.0, -0.85], [1473.5, 730.5, 10.0, -0.3835], [1367.5, 624.5, 24.0, -0.85], [1168.5, 628.5, 24.0, -0.1894]],
  1383: [[961.5, 675.5, 24.0, -0.85], [876.5, 635.5, 24.0, -0.85], [960.5, 667.5, 24.0, -0.85], [735.5, 595.5, 24.0, -0.85], [832.5, 627.5, 16.0, -0.85], [917.5, 647.5, 16.0, -0.85], [990.5, 684.5, 16.0, -0.85], [703.5, 597.5, 10.0, -0.834], [758.5, 610.5, 10.0, -0.85], [853.5, 631.5, 10.0, -0.85],
    [1524.5, 609.5, 24.0, -0.85], [1414.5, 640.5, 24.0, -0.85], [1601.5, 625.5, 24.0, -0.85], [1247.5, 598.5, 24.0, -0.85], [1471.5, 598.5, 16.0, -0.85], [1323.5, 616.5, 24.0, -0.7765], [1205.5, 603.5, 10.0, -0.85], [1561.5, 628.5, 10.0, -0.85]],
};
let shC = null;
export function drawB(ctx, f) {
  const P = platesB();
  if (SHADE_B[f]) {
    // the plate into a scratch copy, shaded there (tone.js works on a canvas's own pixels), then drawn
    if (!shC) shC = cpuCanvas(2206, 946);
    const sg = shC.getContext("2d"); sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = "copy"; sg.drawImage(P.still, 0, 0); sg.globalCompositeOperation = "source-over";
    applyTone(shC, SHADE_B[f]);
    ctx.drawImage(shC, 0, 0);
  } else if (f <= 1417) ctx.drawImage(P.still, 0, 0);
  else { ctx.drawImage(P.bg, 0, 0); drawKeyboard(ctx, f); }
  drawOwlB(ctx, f);
}
export function releaseB() { shC = null; L = null; O = null; layer = null; acc = null; pbA = null; pbB = null; upC = null; acc2 = null; rampC = null; }
