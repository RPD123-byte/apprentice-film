// s05 drawn: the designer seen over his right shoulder (settled frame px, the second clip's drawing): the knit beanie,
// the black hair and its locks, his face in lost profile (the pencil between his teeth, stubble, sweat), the sweatshirt
// (back, collar, the right upper arm) and the bentwood chair rail. Outlines: control points read off 2-6x labelled grids;
// the profile and jaw are a measured silhouette (thresholded outline of the rest frame's skin, simplified to 2 px).
// Light: coarse fitted fields (./figvals.js, >= 40 px knots; ./hairvals.js, 32 px knots over the hair masses only).
// Knit, hair strands, stubble, folds and cloth tone are drawn.
// Fix pass 2: the face without the flat white look (eye shadow, cheek hatching, stubble stipple, a darker band under
// the jaw, closed lips on the pencil, one sweat drop by the eye and two small ones on the jaw), the hair as lit
// strands on black whose density follows the fitted light (no hard-edged curtain; the locks on the left bow round the
// speaker), the beanie as a knit crosshatch, the collar with spiky lock tips and a dark collar line, the shirt as a
// fine crosshatch tone with long fold lines (the fur strokes are gone), and the pencil re-measured (it sat ~7 px low).
import { hatchPaint, ink, fill, grey, lerp, clamp, sstep, rng, PI, taper, sampleCurve, smoothPath, polyPath, pageDev, scr, fbm, bboxOf, carve, hI } from "./kit.js";
import { FV } from "./figvals.js";
import { FVP } from "./figvalsP.js";
import { HAIRV } from "./hairvals.js";
import { fieldV } from "./desk.js";

const edge = (g, pts, w = 1.4, v = 0.85, seed = 1, o = {}) => ink(g, pts, w, grey(v, o.a ?? 1), { seed, ends: o.ends ?? 0.5, jit: o.jit ?? 0.3, closed: o.closed, smooth: o.smooth });
const dark = (g, pts, w = 1.6, seed = 1, o = {}) => ink(g, pts, w, o.c || "#050505", { seed, ends: o.ends ?? 0.6, jit: o.jit ?? 0.3, closed: o.closed, smooth: o.smooth ?? true });

// ---------------------------------------------------------------- geometry
// beanie: the fold between crown and cuff (left -> right) and the cuff's lower edge (left -> right)
const FOLD = [[1372, -10], [1396, 50], [1460, 79], [1546, 107], [1631, 129], [1717, 136], [1803, 129], [1860, 115], [1896, 100]];
const CUFF_BOT = [[1281, 38], [1296, 77], [1323, 108], [1350, 138], [1381, 165], [1415, 190], [1440, 215], [1470, 237], [1520, 245], [1580, 265], [1640, 284], [1700, 294], [1780, 286], [1830, 268], [1862, 240], [1882, 200], [1893, 154], [1897, 108], [1896, 77]];
const CUFF = [[1278, -130], [1372, -130], ...FOLD, ...CUFF_BOT.slice().reverse()];
const CROWN = [[1372, -130], [1880, -130], [1892, 46], [1896, 77], ...FOLD.slice().reverse()];
// hair: the black mass under the beanie, round the face and down to the collar (the face, owl, shirt go over it).
// (fix pass 2: its right edge stops at the shelf upright, x ~1935, as measured; the collar end is the shirt's top)
const HAIR = [[1278, 30], [1296, 77], [1323, 108], [1350, 138], [1381, 165], [1415, 190], [1440, 215], [1470, 237], [1520, 245], [1580, 265], [1640, 284], [1700, 294], [1780, 286], [1830, 268], [1862, 240], [1882, 200], [1893, 154], [1922, 205], [1934, 290], [1938, 380], [1942, 470], [1900, 478], [1860, 500], [1760, 505], [1690, 585], [1560, 632], [1470, 560], [1440, 520], [1400, 470], [1360, 400], [1320, 330], [1296, 250], [1284, 150]];
// the locks on the left of his face, bowing out round the speaker (measured: the dark mass's outline, fix pass 2)
const LOCKS = [[1283, 66], [1266, 84], [1253, 110], [1246, 140], [1244, 168], [1248, 198], [1257, 226], [1270, 250], [1286, 272], [1300, 292], [1313, 289], [1318, 272], [1324, 262], [1324, 235], [1318, 214], [1305, 193], [1300, 120], [1296, 74]];
// the fringe region over and round the face (hair between the skin, the headphone band and the cuff)
const FRINGE = [[1296, 74], [1330, 120], [1381, 165], [1415, 190], [1440, 215], [1470, 237], [1462, 300], [1440, 380], [1400, 380], [1330, 300], [1318, 214], [1305, 193], [1300, 120]];
const BEHIND = [[1664, 293], [1700, 285], [1933, 280], [1942, 470], [1900, 478], [1860, 500], [1760, 505], [1700, 450], [1666, 405]];
// the face (profile and jaw measured; the right side runs under the hair and the headphone cup)
// (measured: the skin's silhouette on the rest frame, thresholded at 0.42 of the pre-grade light and simplified to 2 px; the
// notches are the locks of hair that fall over his temple and cheek)
const FACE = [[1319, 220], [1324, 235], [1324, 263], [1318, 272], [1313, 289], [1303, 294], [1291, 318], [1291, 328], [1302, 340], [1313, 342], [1320, 339], [1323, 344], [1334, 350], [1338, 361], [1334, 382], [1343, 392], [1376, 402], [1377, 396], [1389, 407], [1395, 418], [1393, 422], [1385, 422], [1387, 417], [1382, 416], [1380, 422], [1369, 421], [1362, 424], [1359, 433], [1378, 451], [1379, 480], [1390, 499], [1401, 507], [1417, 509], [1421, 503], [1428, 502], [1431, 498], [1466, 492], [1470, 440], [1431, 436], [1419, 423], [1412, 398], [1416, 364], [1429, 343], [1431, 265], [1426, 264], [1424, 268], [1427, 287], [1424, 293], [1427, 327], [1424, 327], [1411, 312], [1406, 341], [1402, 348], [1386, 289], [1377, 311], [1374, 311], [1373, 262], [1368, 253], [1369, 249], [1346, 226], [1357, 245], [1353, 250], [1328, 220]];
const PROFILE = [[1301, 238], [1302, 262], [1303, 285], [1299, 296], [1290, 319], [1291, 329], [1301, 340], [1326, 345], [1334, 351], [1337, 358], [1334, 383], [1342, 392], [1356, 398]];
const JAW = [[1360, 426], [1360, 436], [1377, 450], [1379, 482], [1388, 497], [1399, 507], [1418, 510], [1434, 500], [1451, 500]];
// the sweatshirt: the back right of the armhole seam, the upper arm left of it. Fix pass 2: the collar (the back's top
// edge) raised to the measured shirt top (y ~455-470; the lock tips hang over it)
const BACK = [[1510, 640], [1560, 632], [1620, 620], [1690, 580], [1712, 520], [1735, 474], [1790, 470], [1840, 462], [1870, 452], [1900, 458], [1941, 466], [1972, 480], [2001, 512], [2040, 588], [2063, 666], [2077, 746], [2080, 826], [2082, 1090], [1620, 1090], [1611, 905], [1596, 864], [1558, 789], [1530, 757], [1505, 738], [1504, 700]];
const UARM = [[1341, 798], [1346, 794], [1357, 772], [1372, 752], [1390, 735], [1418, 700], [1440, 685], [1470, 668], [1501, 650], [1510, 640], [1504, 700], [1505, 738], [1530, 757], [1558, 789], [1596, 864], [1611, 905], [1620, 1090], [1240, 1090], [1245, 944], [1252, 918], [1259, 905], [1264, 896], [1273, 875], [1284, 864], [1319, 844], [1323, 835], [1337, 810]];
const SEAM = [[1600, 862], [1680, 828], [1745, 798], [1800, 772], [1847, 746], [1880, 726], [1908, 706], [1960, 672], [2045, 636]];
const CHAIR = [[1880, 1090], [1900, 946], [1990, 905], [2080, 855], [2150, 800], [2240, 740], [2340, 690], [2340, 760], [2240, 810], [2140, 862], [2060, 905], [1985, 946], [1960, 1090]];
// the pencil (measured at 25.00, column profiles: upper edge y = 427 - 0.32 (x - 1280), lower edge 21 px below; the
// cone's base at x ~1200, the graphite point at (1162, 476); it goes into his mouth at x ~1384)
export const PENCIL_POLY = [[1162, 476], [1202, 451], [1386, 393], [1388, 414], [1202, 473], [1168, 480]];

// ---------------------------------------------------------------- helpers
// resample a polyline to n points by arc length
function resample(P, n) {
  const d = [0];
  for (let i = 1; i < P.length; i++) d.push(d[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = d[d.length - 1], out = [];
  for (let k = 0; k < n; k++) {
    const s = (k / (n - 1)) * L; let i = 1; while (i < d.length - 1 && d[i] < s) i++;
    const t = (s - d[i - 1]) / Math.max(1e-6, d[i] - d[i - 1]);
    out.push([lerp(P[i - 1][0], P[i][0], t), lerp(P[i - 1][1], P[i][1], t)]);
  }
  return out;
}
// a smooth value painting of a region from a fitted field
function paintField(g, sh, vf, { mot = 0, motL = 20, seed = 1, smooth = false } = {}) {
  const bb = [Math.min(...sh.map((p) => p[0])), Math.min(...sh.map((p) => p[1])), Math.max(...sh.map((p) => p[0])), Math.max(...sh.map((p) => p[1]))];
  const D = pageDev(bb), c = scr("pf", D.w, D.h), cg = c.getContext("2d"), id = cg.createImageData(D.w, D.h), d = id.data;
  for (let j = 0; j < D.h; j++) for (let i = 0; i < D.w; i++) {
    const x = D.X0 + i + 0.5, y = D.Y0 + j + 0.5;
    let v = vf(x, y);
    if (mot) v *= 1 + mot * (fbm(x / motL, y / motL, seed, 3) - 0.5) * 2;
    v = clamp(v);
    const o = (j * D.w + i) * 4; d[o] = d[o + 1] = d[o + 2] = v * 255; d[o + 3] = 255;
  }
  cg.putImageData(id, 0, 0);
  g.save(); g.beginPath(); if (smooth) smoothPath(g, sh, true, 0.3); else polyPath(g, sh); g.clip(); g.drawImage(c, 0, 0, D.w, D.h, D.X0, D.Y0, D.w, D.h); g.restore();
}
// trace a curve of length L through (x0, y0) along the direction field flow(x, y) (radians, either sense)
function traceFlow(flow, x0, y0, L, step = 2) {
  const half = (sgn) => {
    const out = []; let x = x0, y = y0, pa = flow(x0, y0) + (sgn < 0 ? PI : 0);
    for (let t = 0; t < L / 2; t += step) {
      let a = flow(x, y); if (Math.cos(a - pa) < 0) a += PI; pa = a;
      x += Math.cos(a) * step; y += Math.sin(a) * step; out.push([x, y]);
    }
    return out;
  };
  return [...half(-1).reverse(), [x0, y0], ...half(1)];
}
// lit strands over black hair: tapered curves traced along flow, their number set so that the region's mean light
// follows vf (a coarse fitted field): expected coverage x brightness = v (the base under them is black)
function strands(g, poly, { flow, vf, L = [30, 90], w = [0.8, 2.2], lum = [0.45, 0.9], cell = 6, seed = 1, gain = 1, pow = 0.6 } = {}) {
  const bb = bboxOf(poly, 0), r = rng(seed);
  const Lm = (L[0] + L[1]) / 2, wm = (w[0] + w[1]) / 2, lm = (lum[0] + lum[1]) / 2;
  const per = (Lm * wm * 0.7) / (cell * cell) * lm;       // mean light one accepted seed adds per unit area
  g.save(); g.beginPath(); polyPath(g, poly); g.clip();
  for (let y = bb[1]; y < bb[3]; y += cell) for (let x = bb[0]; x < bb[2]; x += cell) {
    const px = x + r() * cell, py = y + r() * cell, q = r(), Ls = lerp(L[0], L[1], r()), ws = lerp(w[0], w[1], r()), ls = lerp(lum[0], lum[1], r()), ph = r();
    const v = vf(px, py) * gain;
    if (q > v / per) continue;
    const pts = traceFlow(flow, px, py, Ls, 2);
    taper(g, pts, (u) => ws * Math.pow(Math.sin(PI * clamp(u, 0.02, 0.98)), pow) * (0.75 + 0.25 * Math.sin(u * 9 + ph * 6)), grey(ls));
  }
  g.restore();
}
// a black lock hanging to a pointed tip: root [a, b] (its two corners), bowed through the midline toward tip
function lockTip(g, a, b, tip, bow = 0, color = "#040404") {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dx = tip[0] - m[0], dy = tip[1] - m[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const c1 = [lerp(a[0], tip[0], 0.55) + nx * bow, lerp(a[1], tip[1], 0.55) + ny * bow], c2 = [lerp(b[0], tip[0], 0.55) + nx * bow, lerp(b[1], tip[1], 0.55) + ny * bow];
  g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(c1[0], c1[1], tip[0], tip[1]); g.quadraticCurveTo(c2[0], c2[1], b[0], b[1]); g.closePath(); g.fillStyle = color; g.fill();
}
// the flow of his hair (radians, image y down): the locks on the left bow out round the speaker; over the face the
// fringe falls from the cuff down and a little right (measured strand directions: 69-76 deg left, ~85 deg by the ear);
// behind the owl the hair falls down-right (~71 deg)
function hairFlow(x, y) {
  if (x < 1300 && y < 300) {
    // the left locks: along the crescent (tangent of an arc about (1330, 170), radius ~80)
    const a = Math.atan2(y - 170, x - 1330);
    return a + PI / 2;
  }
  if (x < 1600) return lerp(1.2, 1.48, sstep(1330, 1430, x));
  return 1.24;
}

// ---------------------------------------------------------------- painters
export function paintFigure(g) {
  paintHair(g);
  paintBeanie(g);
  paintFace(g);
  paintShirt(g);
  paintHairTips(g);
  paintChair(g);
}

function paintHair(g) {
  fill(g, HAIR, "#040404");
  fill(g, LOCKS, "#040404");
  // the locks on the left: long lit strands bowing round the speaker (their light the fitted field's)
  strands(g, LOCKS, { flow: hairFlow, vf: fieldV(HAIRV.hairL), L: [60, 150], w: [1, 2.4], lum: [0.5, 0.95], cell: 5, seed: 402, pow: 0.5 });
  // the fringe round the face and by the ear
  strands(g, FRINGE, { flow: hairFlow, vf: fieldV(HAIRV.hairF), L: [40, 110], w: [1, 2.6], lum: [0.4, 0.85], cell: 5, seed: 404, pow: 0.5 });
  // behind the owl: nearly black, a few lit strands
  strands(g, BEHIND, { flow: hairFlow, vf: fieldV(HAIRV.hairR), L: [40, 100], w: [0.8, 1.8], lum: [0.4, 0.8], cell: 6, seed: 406, pow: 0.5 });
}

function paintBeanie(g) {
  // ---- the cuff: rib lines from the fold to the lower edge, course rows along it (knit), over a lifted base, the
  // strokes' coverage bringing it down to the fitted light
  const vC = fieldV(FV.cuff);
  const N = 90, T = resample(FOLD, N), Bt = resample(CUFF_BOT.slice(0, 17), N);
  const r = rng(412);
  const P = (s, t) => { const i = clamp(s, 0, 1) * (N - 1), i0 = Math.min(N - 2, Math.floor(i)), f = i - i0; const a = [lerp(T[i0][0], T[i0 + 1][0], f), lerp(T[i0][1], T[i0 + 1][1], f)], b = [lerp(Bt[i0][0], Bt[i0 + 1][0], f), lerp(Bt[i0][1], Bt[i0 + 1][1], f)]; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t) + Math.sin(t * PI) * 6]; };
  // base: the target light lifted by the expected coverage of the ribs and courses (about 45 % dark ink)
  paintField(g, CUFF, (x, y) => Math.min(0.95, vC(x, y) * 1.45 + 0.01), { mot: 0.1, motL: 10, seed: 411 });
  g.save(); g.beginPath(); polyPath(g, CUFF); g.clip();
  const nr = 84;
  for (let k = 0; k <= nr; k++) {
    const s = (k + (r() - 0.5) * 0.4) / nr, pts = [];
    for (let t = -0.06; t <= 1.1; t += 0.07) pts.push(P(s, t));
    const v = vC(pts[8][0], pts[8][1]);
    const wR = (2.2 + 1.6 * sstep(0.3, 0.8, s)) * (0.8 + 0.4 * (1 - v));
    taper(g, sampleCurve(pts.map(([x, y]) => [x + (r() - 0.5) * 1.4, y]), 3), (u) => wR * (0.8 + 0.3 * Math.sin(PI * u)), `rgba(6,6,6,${Math.min(1, 0.55 + 0.5 * (1 - v)).toFixed(2)})`);
  }
  // courses: short dark arcs between the ribs (a knit grid, ~5 px apart down the cuff)
  for (let j = 0; j < 22; j++) {
    const t = (j + 0.5) / 22;
    for (let k = 0; k < nr; k++) {
      const tj = t + (r() - 0.5) * 0.02, s0 = k / nr, s1 = (k + 1) / nr, a = P(s0 + 0.002, tj), b = P(s1 - 0.002, tj + (r() - 0.5) * 0.015), m = P((s0 + s1) / 2, tj + 0.012);
      const v = vC(m[0], m[1]);
      if (r() < 0.9 * v - 0.1) continue;
      taper(g, [a, m, b], (u) => (1 + 1.2 * (1 - v)) * (0.6 + 0.4 * Math.sin(PI * u)), `rgba(8,8,8,${Math.min(1, 0.35 + 0.6 * (1 - v)).toFixed(2)})`);
    }
  }
  g.restore();
  // ---- the crown (measured at 2.6x: its knit ribs run up from the fold, curving together toward the top of the head
  // up and to the left; a fine knit between them): long dark rib lines, then short knit ticks over a lifted base
  const vK = fieldV(FV.crown);
  const paperK = (x, y) => Math.min(0.95, vK(x, y) * 1.5 + 0.02);
  paintField(g, CROWN, paperK, { mot: 0.08, motL: 14, seed: 413 });
  g.save(); g.beginPath(); polyPath(g, CROWN); g.clip();
  const T2 = resample(FOLD, 80), AP = [1290, -330];
  for (let k = 0; k < 80; k++) {
    const [x, y] = T2[k], dx = AP[0] - x, dy = AP[1] - y, d = Math.hypot(dx, dy), v = vK(x, y - 30);
    const pts = []; for (let t = 0; t <= 1.001; t += 0.1) { const q = t * 0.75; pts.push([x + dx * q + Math.sin(PI * t) * 12 * (k / 80 - 0.3), y + dy * q]); }
    ink(g, pts, 1.3 + 0.9 * (1 - v) + r() * 0.5, `rgba(6,6,6,${(0.45 + 0.4 * (1 - v)).toFixed(2)})`, { smooth: true, seed: 480 + k, jit: 0.5, ends: 0.25 });
  }
  g.restore();
  // courses: rows parallel to the fold every ~6 px up the crown, broken into stitch-length pieces (a knit grid with the ribs)
  g.save(); g.beginPath(); polyPath(g, CROWN); g.clip();
  const T3 = resample(FOLD, 120);
  for (let j = 1; j < 40; j++) {
    const off = j * 6.2;
    for (let k = 0; k < 119; k += 1) {
      if (r() < 0.25) continue;
      const [x0, y0] = T3[k], [x1, y1] = T3[k + 1], sq = 0.55 + 0.45 * Math.sin(PI * k / 119);
      const a = [x0 - off * 0.35, y0 - off * sq], b = [x1 - off * 0.35, y1 - off * sq], v = vK(a[0], a[1]);
      ink(g, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 1], b], 0.9 + 0.8 * (1 - v), `rgba(8,8,8,${(0.3 + 0.5 * (1 - v)).toFixed(2)})`, { seed: 500 + j * 131 + k, jit: 0.3, ends: 0.4 });
    }
  }
  g.restore();
  // outlines: the fold's shadow line, the cuff's lower edge and the crown's silhouette
  dark(g, FOLD.slice(1), 3, 415);
  dark(g, CUFF_BOT.slice(0, 17), 2.6, 416);
  dark(g, [[1278, -10], [1281, 38], [1296, 77]], 2, 417);
}

function paintFace(g) {
  const vF = fieldV(FV.face);
  // the skin: the fitted light, lifted a little where the stubble strokes go over it
  const stubW = (x, y) => Math.max(sstep(1385, 1405, x) * sstep(452, 468, y), 0.6 * sstep(1338, 1345, x) * (1 - sstep(1385, 1395, x)) * sstep(360, 368, y) * (1 - sstep(392, 398, y)));
  paintField(g, FACE, (x, y) => vF(x, y) * (1 + 0.12 * stubW(x, y)), { mot: 0.03, motL: 10, seed: 421, smooth: true });
  const r = rng(422);
  g.save(); g.beginPath(); smoothPath(g, FACE, true, 0.3); g.clip();
  // the cheek's shading under the eye: a few strokes up and to the right (measured at 5x: x 1305-1325, y 298-322)
  for (let i = 0; i < 7; i++) {
    const x = 1306 + i * 2.8 + (r() - 0.5), y = 320 - i * 0.6 + (r() - 0.5) * 2, L = 16 + r() * 8;
    ink(g, [[x, y], [x + Math.cos(-0.95) * L, y + Math.sin(-0.95) * L]], 1.1 + r() * 0.4, `rgba(12,12,12,${(0.6 + r() * 0.25).toFixed(2)})`, { seed: 423 + i, ends: 0.2, jit: 0.2 });
  }
  // stubble on the upper lip (diagonal strokes down-right) and the chin (short strokes, near vertical)
  for (let i = 0; i < 16; i++) {
    const x = 1342 + r() * 38, y = 364 + r() * 26, L = 7 + r() * 8;
    ink(g, [[x, y], [x + Math.cos(0.75) * L, y + Math.sin(0.75) * L]], 1 + r() * 0.5, `rgba(12,12,12,${(0.45 + r() * 0.3).toFixed(2)})`, { seed: 440 + i, ends: 0.2, jit: 0.2 });
  }
  for (let i = 0; i < 46; i++) {
    const x = 1392 + r() * 64, y = 458 + r() * 44, L = 7 + r() * 9, a = 1.3 + (r() - 0.5) * 0.35;
    if (y > 507 - (x - 1392) * 0.05) continue;
    ink(g, [[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 1.1 + r() * 0.6, `rgba(12,12,12,${(0.5 + r() * 0.35).toFixed(2)})`, { seed: 470 + i, ends: 0.25, jit: 0.2 });
  }
  for (let i = 0; i < 6; i++) { const x = 1362 + i * 4 + r() * 2, y = 440 + r() * 6; ink(g, [[x, y], [x + 6, y + 5]], 1.2, "rgba(12,12,12,0.6)", { seed: 520 + i, ends: 0.2 }); }
  // fine skin grain (sparse dots) over the jaw
  for (let i = 0; i < 160; i++) { const x = 1380 + r() * 80, y = 400 + r() * 100, a = r(); if (r() > 0.5) continue; g.fillStyle = `rgba(20,20,20,${(0.25 + a * 0.3).toFixed(2)})`; g.beginPath(); g.arc(x, y, 0.6, 0, 2 * PI); g.fill(); }
  g.restore();
  // the profile and the jaw: dark ink, swelling at the nose and chin
  dark(g, PROFILE, 2, 425, { smooth: true });
  dark(g, JAW, 2.4, 426);
  // the nostril's shadow under the nose
  dark(g, [[1311, 340], [1319, 340.5], [1328, 343]], 2, 427, { ends: 0.3 });
  // fringe strands falling over the forehead and cheek (thin dark strokes on the skin, down and a little right)
  const FS = [[[1316, 196], [1322, 236], [1326, 270], [1330, 300], [1334, 340]], [[1340, 206], [1352, 240], [1362, 268], [1366, 290]], [[1366, 240], [1372, 270], [1376, 300], [1374, 330]], [[1396, 250], [1402, 290], [1406, 322], [1404, 350]], [[1412, 262], [1418, 300], [1420, 330]]];
  FS.forEach((pts, i) => taper(g, sampleCurve(pts, 6), (u) => (1.4 + 0.6 * (i % 2)) * Math.pow(1 - u, 0.7) + 0.2, "#060606"));
  // sweat: one drop by the eye, two small ones on the jaw
  drop(g, 1344, 283, 1);
  drop(g, 1411, 447, 0.7); drop(g, 1420, 444, 0.65);
}
function drop(g, x, y, s) {
  const pts = [[x, y - 9 * s], [x + 3.5 * s, y + 1 * s], [x, y + 4 * s], [x - 3.5 * s, y + 1 * s]];
  g.beginPath(); smoothPath(g, pts, true); g.fillStyle = grey(0.9); g.fill();
  ink(g, [[x + 3.5 * s, y + 1 * s], [x, y + 4.5 * s], [x - 3.5 * s, y + 1 * s], [x - 1 * s, y - 6 * s]], 1.3 * s + 0.2, "rgba(10,10,10,0.85)", { smooth: true, seed: Math.round(x + y), jit: 0, ends: 0.5 });
}

// a fine crosshatch tone laid over a region in place (45 / 135 deg, pitch px): the source's cloth reads as a halftone
// crosshatch at close range; the pattern's strength follows v(1 - v) (none in pure black or white)
function crossTone(g, sh, pitch = 3.5, amp = 0.06) {
  const bb = bboxOf(sh, 1), D = pageDev(bb);
  const c = g.canvas, cx = c.getContext("2d", { willReadFrequently: true }), m = g.getTransform();
  const X0 = Math.max(0, Math.floor(bb[0] + m.e)), Y0 = Math.max(0, Math.floor(bb[1] + m.f)), X1 = Math.min(c.width, Math.ceil(bb[2] + m.e)), Y1 = Math.min(c.height, Math.ceil(bb[3] + m.f));
  if (X1 <= X0 || Y1 <= Y0) return;
  const w = X1 - X0, h = Y1 - Y0;
  const mk = scr("ctm", w, h), mg = mk.getContext("2d", { willReadFrequently: true });
  mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, w, h); mg.setTransform(1, 0, 0, 1, m.e - X0, m.f - Y0); mg.beginPath(); polyPath(mg, sh); mg.fillStyle = "#fff"; mg.fill();
  const M = mg.getImageData(0, 0, w, h).data;
  const id = cx.getImageData(X0, Y0, w, h), d = id.data, k = (2 * PI) / (pitch * Math.SQRT2);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 4, a = M[o + 3];
    if (!a) continue;
    const X = X0 + i - m.e, Y = Y0 + j - m.f, v = d[o] / 255;
    const p1 = Math.cos(k * (X + Y)), p2 = Math.cos(k * (X - Y));
    const pat = (Math.min(p1, p2) + 0.2) * 0.9;
    const dv = amp * 4 * v * (1 - v) * pat * (a / 255) * 255;
    d[o] = clamp(d[o] + dv, 0, 255); d[o + 1] = clamp(d[o + 1] + dv, 0, 255); d[o + 2] = clamp(d[o + 2] + dv, 0, 255);
  }
  cx.putImageData(id, X0, Y0);
}

function paintShirt(g) {
  // ---- the back and the upper arm: the fitted light, a fine crosshatch tone, long fold lines
  const vB = fieldV(FV.back), vA = fieldV(FV.uarm);
  paintField(g, BACK, vB, { mot: 0.06, motL: 18, seed: 430 });
  paintField(g, UARM, vA, { mot: 0.06, motL: 22, seed: 431 });
  crossTone(g, BACK, 3.5, 0.07); crossTone(g, UARM, 3.5, 0.06);
  const r = rng(433);
  // the upper arm (the sleeve over the shoulder): long light strokes along the sleeve, soft darker streaks between
  g.save(); g.beginPath(); polyPath(g, UARM); g.clip();
  for (let i = 0; i < 70; i++) {
    const x = 1270 + r() * 330, y = 660 + r() * 280, L = 40 + r() * 60, a = -0.95 + (r() - 0.5) * 0.25, v = vA(x, y), hi = r() < 0.5;
    const pts = [[x, y], [x + Math.cos(a) * L * 0.5 + (r() - 0.5) * 4, y + Math.sin(a) * L * 0.5], [x + Math.cos(a) * L, y + Math.sin(a) * L]];
    ink(g, pts, hi ? 0.9 + r() * 0.8 : 0.8 + r() * 0.6, hi ? grey(Math.min(1, v * 1.35 + 0.12), 0.5) : `rgba(15,15,15,${(0.2 + 0.25 * (1 - v)).toFixed(2)})`, { smooth: true, seed: 1400 + i, ends: 0.1, jit: 0.3 });
  }
  g.restore();
  // the owl's shadow on the shirt under its tail and the shade along the collar under the hair
  g.save(); g.beginPath(); polyPath(g, BACK); g.clip();
  const rr = rng(436);
  for (let i = 0; i < 70; i++) { const x = 1580 + rr() * 170, y = 640 + rr() * 70, L = 10 + rr() * 26, a = 2.1 + (rr() - 0.5) * 0.4;
    ink(g, [[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 0.8 + rr() * 0.8, `rgba(10,10,10,${(0.3 + rr() * 0.35).toFixed(2)})`, { seed: 437 + i, ends: 0.2, jit: 0 }); }
  // the lit right shoulder: pale strokes along the curve of the shoulder
  for (let i = 0; i < 40; i++) {
    const t = rr(), x = lerp(1885, 2030, t) + (rr() - 0.5) * 20, y = lerp(478, 590, t * t) + rr() * 30, a = 0.75 + t * 0.6 + (rr() - 0.5) * 0.2, L = 30 + rr() * 40;
    ink(g, [[x, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 0.9 + rr() * 0.8, grey(0.88, 0.4), { smooth: true, seed: 1500 + i, ends: 0.1, jit: 0.2 });
  }
  g.restore();
  // fold lines (measured on the rest frame): down the back, round the armhole, across the shoulder blade
  const folds = [
    [[1905, 708], [1910, 740], [1916, 772], [1922, 804]], [[1962, 672], [1970, 712], [1978, 756], [1986, 800]],
    [[1822, 600], [1832, 640], [1843, 675], [1851, 700]], [[2010, 834], [1993, 759], [1968, 687], [1960, 673]],
    [[1603, 880], [1587, 843], [1559, 791], [1538, 765], [1525, 754]], [[2033, 857], [2023, 780]], [[1960, 895], [1947, 821]],
    [[1563, 930], [1573, 889], [1576, 851]], [[1617, 942], [1611, 906], [1603, 883]], [[1287, 930], [1289, 907], [1293, 905], [1320, 847]],
  ];
  folds.forEach((f, i) => dark(g, f, (i < 3 ? 2.6 : 1.8) + r() * 0.5, 434 + i, { ends: 0.25 }));
  dark(g, SEAM, 1.8, 440);
  // the shirt's outline: the right side (dark), the armhole seam, the collar under the hair (a 3 px dark line)
  dark(g, [[1972, 480], [2001, 512], [2040, 588], [2063, 666], [2077, 746], [2080, 826], [2082, 946]], 3, 441);
  dark(g, [[1504, 700], [1505, 738], [1530, 757], [1558, 789], [1596, 864], [1611, 905], [1620, 946]], 2.2, 442);
  dark(g, [[1245, 944], [1252, 918], [1264, 896], [1284, 864], [1319, 844], [1337, 810], [1357, 772], [1390, 735], [1418, 700], [1470, 668], [1510, 640]], 2.6, 443);
  dark(g, [[1712, 520], [1735, 476], [1790, 472], [1840, 464], [1870, 454], [1900, 460], [1941, 468], [1972, 482]], 3, 444, { ends: 0.7 });
  edge(g, [[1900, 463], [1941, 471], [1972, 486], [1998, 514]], 1.6, 0.9, 445);
}

// the hair's lock tips hanging over the collar (measured tip points: the dark mass's lower outline, fix pass 2)
function paintHairTips(g) {
  const TIPS = [[1724, 481], [1746, 492], [1768, 488], [1790, 500], [1804, 510], [1822, 484], [1842, 494], [1858, 482], [1874, 478], [1889, 462], [1912, 462], [1928, 460]];
  const r = rng(460);
  TIPS.forEach(([x, y], i) => {
    const w = 10 + r() * 8, top = 448 + r() * 6, lean = -6 - r() * 8;
    lockTip(g, [x + lean - w / 2, top], [x + lean + w / 2, top], [x, y], (r() - 0.5) * 4);
    // a thin lit strand along the lock
    ink(g, [[x + lean - 1, top + 2], [x + lean * 0.4, (top + y) / 2], [x - 1, y - 6]], 0.8, grey(0.55, 0.7), { smooth: true, seed: 470 + i, ends: 0.1, jit: 0.1 });
  });
}

function paintChair(g) {
  fill(g, CHAIR, grey(0.3));
  carve(g, CHAIR, { coord: (x, y) => { const a = -0.47; return [-Math.sin(a) * x + Math.cos(a) * y, Math.cos(a) * x + Math.sin(a) * y]; }, v: 0.42, per: 5, seed: 451, bg: 0.08, wav: 0.3, streak: 0.5, wExp: 0.9 });
  dark(g, [[1900, 946], [1990, 905], [2080, 855], [2150, 800], [2240, 740], [2340, 690]], 2.4, 452);
  dark(g, [[1985, 946], [2060, 905], [2140, 862], [2240, 810], [2340, 760]], 2.4, 453);
}

// ---------------------------------------------------------------- the pencil and the lips over it
export function paintPencil(g) {
  // body: six-sided, a lit top facet, a mid facet and a shaded lower facet
  const A0 = [1202, 451], A1 = [1386, 393], B0 = [1202, 473], B1 = [1388, 414];
  const L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const F = (t0, t1) => [L(A0, B0, t0), L(A1, B1, t0), L(A1, B1, t1), L(A0, B0, t1)];
  fill(g, F(0, 0.42), grey(0.86)); fill(g, F(0.42, 0.72), grey(0.62)); fill(g, F(0.72, 1), grey(0.4));
  carve(g, F(0.72, 1), { ang: -0.3, v: 0.4, per: 2.2, seed: 461, over: true, alpha: 0.4 });
  ink(g, [L(A0, B0, 0.42), L(A1, B1, 0.42)], 1.2, "rgba(10,10,10,0.7)", { seed: 466, jit: 0.1, ends: 0.8 });
  // the sharpened tip: bare wood in a cone with a scalloped base, the graphite point
  const cone = [A0, B0, [1176, 480], [1162, 476], [1172, 468]];
  fill(g, cone, grey(0.82));
  hatchPaint(g, cone, { vf: () => 0.74, ang: -0.35, per: 3, len: [5, 10], w: [0.5, 0.9], dk: 0.45, top: 0.9, seed: 462, base: false });
  fill(g, [[1160, 476], [1171, 470], [1175, 479], [1166, 481]], grey(0.08));
  dark(g, [A0, [1205, 457], [1200, 463], [1206, 468], B0], 1.4, 463, { smooth: false });
  dark(g, [[1162, 476], A0, A1], 1.5, 464, { smooth: false });
  dark(g, [[1166, 480], B0, B1], 1.8, 465, { smooth: false });
}
export function paintLips(g) {
  // closed lips on the pencil (measured at 6x): skin over the pencil's end, the upper lip's dark line with a small curl
  // at its corner, the mouth corner curving down past the pencil, a thin shadow under it on the lower lip
  fill(g, [[1344, 391], [1360, 397], [1376, 399], [1386, 402], [1393, 410], [1395, 424], [1388, 426], [1383, 406], [1372, 402], [1352, 401]], grey(0.7));
  fill(g, [[1360, 421], [1374, 419], [1386, 416], [1392, 420], [1390, 428], [1372, 428], [1362, 430]], grey(0.66));
  dark(g, [[1346, 397], [1358, 400], [1370, 400.5], [1381, 402]], 2.2, 471, { ends: 0.3 });
  dark(g, [[1367, 396], [1374, 395.5], [1380, 399]], 1.3, 472, { ends: 0.3 });
  taper(g, sampleCurve([[1381, 402], [1387, 407], [1390, 414], [1392, 421], [1392, 427]], 5), (u) => 2.6 * (1 - 0.6 * u), "#060606");
  dark(g, [[1362, 421.5], [1374, 420.5], [1386, 418]], 1.4, 473, { c: "rgba(10,10,10,0.75)", ends: 0.3 });
}
