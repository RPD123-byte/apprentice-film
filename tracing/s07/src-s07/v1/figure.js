// s07 figure plate: the designer seen from behind — sweater back, the right arm reaching to the keyboard, the left
// forearm rising from the bottom edge, the profile of his face, black hair and the knitted beanie. Hands are separate
// (hands.js, animated); the owl is drawn on top (owl.js).
// Frame coordinates measured on the source (29.6 s): grid crops snapshots/s07-ref/*.jpg; values from blurred samples.
import { poly, blob, lin, rad, line, curve, stroke, rng, taper, INK, grey, inside, erase, solid, soft, sampleCurve, smoothPath } from "./kit.js";

const PI = Math.PI;
const K = "#070707";
const inkA = (a) => `rgba(242,240,234,${a})`;
const blkA = (a) => `rgba(6,6,6,${a})`;
function clipTo(o, path, fn) { o.save(); o.beginPath(); path(o); o.clip(); fn(); o.restore(); }
// a soft band of value painted into the plate's value study along a curve (fold shade / highlight), clipped to path
function vband(P, path, pts, w, value, alpha, blur) {
  const v = P.v;
  v.save(); v.beginPath(); path(v); v.clip();
  v.filter = `blur(${blur}px)`; v.globalAlpha = alpha; v.strokeStyle = grey(value); v.lineWidth = w; v.lineCap = "round"; v.lineJoin = "round";
  v.beginPath(); smoothPath(v, pts, false); v.stroke();
  v.restore();
}

// ---------------------------------------------------------------- outlines
// the back: from under the owl to his right side (silhouette measured every 50 px), down past the chair rail
export const TORSO = [[1500, 640], [1520, 560], [1580, 520], [1660, 520], [1740, 536], [1820, 500], [1900, 456], [1944, 468], [1992, 496], [2026, 536],
  [2050, 588], [2066, 650], [2080, 712], [2089, 766], [2094, 820], [2096, 952], [1610, 952], [1604, 866], [1560, 760], [1502, 646]];
// the upper right arm hanging from the shoulder to the elbow (bottom), lit on its left
const UPPER_ARM = [[1500, 643], [1560, 760], [1604, 866], [1610, 952], [1236, 952], [1256, 922], [1276, 892], [1300, 864], [1326, 840], [1348, 784],
  [1370, 751], [1400, 711], [1440, 681], [1500, 651]];
// the right forearm (sleeve) from the elbow up to the cuff at the wrist
const FOREARM = [[1196, 641], [1250, 634], [1325, 639], [1400, 641], [1470, 642], [1502, 648], [1440, 681], [1400, 711], [1370, 751], [1348, 784],
  [1300, 771], [1250, 751], [1205, 741], [1190, 696]];
const SLEEVE_L = [[790, 952], [797, 886], [806, 846], [832, 819], [871, 802], [899, 805], [943, 847], [971, 869], [1010, 897], [1038, 919], [1072, 952]];
export const FACE = [[1318, 200], [1318, 232], [1317, 258], [1315, 284], [1313, 304], [1309, 322], [1304, 334], [1302, 341], [1306, 347], [1318, 351],
  [1328, 353], [1338, 358], [1343, 364], [1344, 378], [1346, 392], [1352, 400], [1358, 405], [1361, 412], [1362, 420], [1369, 430], [1377, 440], [1382, 450],
  [1384, 464], [1389, 476], [1398, 486], [1406, 496], [1422, 502], [1450, 504], [1476, 501], [1476, 240], [1420, 218], [1360, 196]];
const CROWN = [[1300, -4], [1908, -4], [1906, 90], [1880, 125], [1800, 142], [1700, 152], [1640, 148], [1560, 130], [1500, 112], [1440, 92], [1390, 72], [1345, 42]];
const CUFF = [[1282, -4], [1300, -4], [1345, 42], [1390, 72], [1440, 92], [1500, 112], [1560, 130], [1640, 148], [1700, 152], [1800, 142], [1880, 125],
  [1906, 90], [1910, 160], [1896, 214], [1862, 246], [1800, 272], [1740, 285], [1690, 287], [1640, 276], [1580, 256], [1520, 238], [1460, 222],
  [1406, 202], [1360, 180], [1326, 150], [1302, 110], [1284, 60]];

// ---------------------------------------------------------------- sweater
function paintBody(P) {
  const o = P.o, r = rng(311);
  // back: mid grey, a touch lighter under the owl, darker to his right side and toward the chair
  // (measured: a flat ~155/255 across the middle of the back, ~120 along the bottom and at his right side)
  // engraved, not flat: the back is cut as a fine cross-hatch (the source's print mesh) running with the folds
  // (≈−0.4 rad), the arms as lines along the sleeve axis; darker fold bands are painted into the value study so the
  // line widths swell and thin across each fold
  solid(P, poly(TORSO), (g) => { const q = g.createLinearGradient(1600, 600, 2080, 800); q.addColorStop(0, grey(0.74)); q.addColorStop(0.6, grey(0.71)); q.addColorStop(1, grey(0.6)); return q; }, -0.4, { style: 1, spacing: 0.16 });
  for (const [pts, w, v, a] of [
    [[[1905, 700], [1922, 745], [1940, 790], [1968, 880]], 26, 0.45, 0.7], [[[1962, 670], [1985, 730], [2002, 790], [2016, 850]], 22, 0.45, 0.65],
    [[[1840, 740], [1860, 800], [1880, 900]], 20, 0.55, 0.5], [[[1700, 640], [1730, 700], [1750, 780]], 18, 0.55, 0.45],
    [[[2040, 560], [2060, 640], [2078, 760], [2090, 900]], 30, 0.4, 0.7], [[[1620, 700], [1780, 660], [1900, 610]], 16, 0.95, 0.35],
  ]) vband(P, poly(TORSO), pts, w, v, a, 9);
  soft(P, poly(TORSO), 0.62);
  P.light(poly(TORSO), (g) => { const q = g.createLinearGradient(0, 820, 0, 952); q.addColorStop(0, "rgba(0,0,0,0)"); q.addColorStop(1, "rgba(0,0,0,0.08)"); return q; });
  P.light(poly([[2000, 500], [2096, 600], [2096, 952], [2000, 952]]), (g) => { const q = g.createLinearGradient(2000, 0, 2096, 0); q.addColorStop(0, "rgba(0,0,0,0)"); q.addColorStop(1, "rgba(0,0,0,0.25)"); return q; });
  // upper arm: bright on the left, falling to grey where it turns under
  solid(P, poly(UPPER_ARM), (g) => { const q = g.createLinearGradient(1380, 760, 1610, 900); q.addColorStop(0, grey(0.97)); q.addColorStop(0.55, grey(0.9)); q.addColorStop(1, grey(0.66)); return q; }, 2.25, { spacing: 0.26 });
  for (const [pts, w, v, a] of [
    [[[1484, 690], [1436, 760], [1398, 850], [1380, 946]], 20, 0.5, 0.75], [[[1540, 724], [1502, 804], [1474, 900], [1466, 946]], 18, 0.5, 0.7],
    [[[1584, 806], [1566, 880], [1560, 946]], 24, 0.42, 0.7], [[[1330, 860], [1300, 900], [1280, 946]], 16, 0.55, 0.6], [[[1420, 740], [1384, 820], [1346, 900]], 14, 1, 0.55],
    [[[1508, 760], [1470, 850], [1440, 946]], 12, 1, 0.5],
  ]) vband(P, poly(UPPER_ARM), pts, w, v, a, 8);
  soft(P, poly(UPPER_ARM), 0.68);
  solid(P, poly(FOREARM), (g) => { const q = g.createLinearGradient(1200, 650, 1500, 700); q.addColorStop(0, grey(0.97)); q.addColorStop(1, grey(0.9)); return q; }, 0.12, { spacing: 0.24 });
  for (const [pts, w, v, a] of [[[[1230, 700], [1300, 712], [1380, 700], [1460, 668]], 12, 0.7, 0.5], [[[1260, 660], [1340, 664], [1420, 660]], 10, 1, 0.5]]) vband(P, poly(FOREARM), pts, w, v, a, 7);
  soft(P, poly(FOREARM), 0.68);
  // the sleeve's underside turns away from the light (measured ~0.6 along its lower edge)
  P.light(poly(FOREARM), (g) => { const q = g.createLinearGradient(1250, 690, 1235, 760); q.addColorStop(0, "rgba(0,0,0,0)"); q.addColorStop(0.35, "rgba(0,0,0,0.12)"); q.addColorStop(1, "rgba(0,0,0,0.45)"); return q; });
  // fold contours: long thin pen lines following the folds of the arm and the back
  for (const [pts, w, a] of [
    [[[1488, 694], [1446, 758], [1410, 836], [1392, 920]], 1.4, 0.55], [[[1546, 728], [1510, 800], [1484, 880]], 1.3, 0.5],
    [[[1590, 812], [1572, 880], [1566, 940]], 1.5, 0.55], [[[1440, 690], [1400, 730], [1370, 790]], 1.2, 0.45],
    [[[1716, 640], [1740, 700], [1756, 770], [1764, 840]], 1.3, 0.5], [[[1846, 744], [1862, 804], [1878, 890]], 1.4, 0.55],
    [[[1640, 760], [1664, 830], [1676, 920]], 1.2, 0.45], [[[1780, 600], [1800, 680], [1812, 760]], 1.1, 0.4],
  ]) stroke(o, pts, w * 1.8, blkA(a), 3900 + pts[0][0], 0.4);
  // contours
  curve(o, [[1196, 641], [1250, 634], [1325, 639], [1400, 641], [1470, 642]], 2.6, K, 301);
  curve(o, [[1198, 642], [1189, 670], [1190, 700], [1205, 741]], 2.6, K, 302);
  curve(o, [[1205, 741], [1250, 751], [1300, 771], [1348, 784]], 2.4, K, 303);
  curve(o, [[1500, 651], [1440, 681], [1400, 711], [1370, 751], [1348, 784], [1326, 840], [1300, 864], [1276, 892], [1256, 922], [1236, 952]], 3.2, K, 304);
  curve(o, [[1500, 645], [1540, 720], [1575, 790], [1600, 862], [1608, 952]], 2.2, K, 308);
  curve(o, [[1900, 456], [1944, 468], [1992, 496], [2026, 536], [2050, 588], [2066, 650], [2080, 712], [2089, 766], [2094, 820], [2096, 952]], 3.2, K, 305);
  curve(o, [[1718, 578], [1760, 566], [1800, 548], [1846, 528], [1892, 505], [1938, 474]], 3, K, 306);
  curve(o, [[1600, 866], [1708, 812], [1790, 770], [1862, 735], [1930, 695], [2000, 651], [2046, 605]], 1.5, blkA(0.8), 307);
  // folds: long dark swelling strokes down the back
  stroke(o, [[1900, 705], [1920, 745], [1938, 782], [1969, 882]], 5, blkA(0.85), 312, 0.3);
  stroke(o, [[1962, 674], [1985, 730], [2000, 782], [2015, 835]], 4, blkA(0.8), 313, 0.3);
  stroke(o, [[1554, 766], [1575, 810], [1592, 851]], 3, blkA(0.6), 314, 0.4);
  // hatching: clusters of parallel strokes (the source's pen hatching) — dense down his right side and in the folds,
  // sparse in the lit middle of the back
  const cluster = (x, y, a, n, sp, L, w, al, seed) => {
    const rr = rng(seed), nx = Math.cos(a), ny = Math.sin(a);
    for (let k = 0; k < n; k++) {
      const x0 = x + k * sp * ny * -1 + (rr() - 0.5) * 2, y0 = y + k * sp * nx + (rr() - 0.5) * 3, l = L * (0.6 + rr() * 0.6);
      stroke(o, [[x0, y0], [x0 + nx * l * 0.5 + (rr() - 0.5) * 3, y0 + ny * l * 0.5], [x0 + nx * l, y0 + ny * l]], w * (0.6 + rr() * 0.7), blkA(al * (0.6 + rr() * 0.4)), seed * 7 + k, 0.35);
    }
  };
  // long cloth folds: curved strokes flowing down the back, denser and darker toward his right side
  for (let i = 0; i < 46; i++) {
    const x = 1640 + r() * 440, y = 560 + r() * 300;
    if (!inside(TORSO, x, y)) continue;
    const k = Math.min(1, Math.max(0, (x - 1680) / 380));
    if (r() > 0.3 + 0.7 * k) continue;
    const L = 70 + r() * 180, a = 1.5 + (x - 1850) * 0.0006 + (r() - 0.5) * 0.2, bend = (r() - 0.5) * 30;
    const p0 = [x, y], p2 = [x + Math.cos(a) * L, y + Math.sin(a) * L], p1 = [(p0[0] + p2[0]) / 2 + bend, (p0[1] + p2[1]) / 2];
    stroke(o, [p0, p1, p2], 1 + r() * 1.4 + k, blkA(0.25 + 0.45 * k * (0.5 + r() * 0.5)), 3300 + i, 0.3 + r() * 0.3);
    if (r() < 0.5) stroke(o, [[p0[0] + 4, p0[1] + 10], [p1[0] + 4, p1[1]], [p2[0] + 3, p2[1] - 20]], 0.9 + r() * 0.8, blkA(0.2 + 0.3 * k), 3400 + i, 0.4);
  }
  for (let i = 0; i < 40; i++) {
    const x = 1300 + r() * 310, y = 700 + r() * 250;
    if (!inside(UPPER_ARM, x, y)) continue;
    const k = Math.max(0, (x - 1440) / 170);
    if (r() > 0.15 + 0.7 * k) continue;
    const L = 50 + r() * 110, a = 1.15 + (r() - 0.5) * 0.3;
    stroke(o, [[x, y], [x + Math.cos(a) * L * 0.5 + 6, y + Math.sin(a) * L * 0.5], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 1 + r() * 1.2, blkA(0.22 + 0.4 * k), 3500 + i, 0.35);
  }
  // white highlight sweeps on the upper arm (the source's lit folds)
  for (let i = 0; i < 6; i++) {
    const x = 1360 + i * 22 + r() * 10, y = 730 + i * 18;
    stroke(o, [[x, y], [x + 30, y + 40 + r() * 20], [x + 44, y + 90]], 5 + r() * 4, inkA(0.35), 460 + i, 0.4);
  }
  // forearm sleeve folds (denser on the shaded underside)
  for (let i = 0; i < 60; i++) {
    const x = 1205 + r() * 200, y = 690 + r() * 80;
    if (!inside(FOREARM, x, y)) continue;
    stroke(o, [[x, y], [x + 8 + r() * 10, y + 16 + r() * 24]], 0.9 + r() * 1.1, blkA(0.2 + r() * 0.35), 470 + i, 0.4);
  }
  // collar rib band under the hair: darker grey
  const COLLAR = [[1700, 520], [1716, 498], [1790, 488], [1860, 468], [1900, 456], [1938, 474], [1892, 505], [1846, 528], [1800, 548], [1760, 566], [1718, 578], [1706, 560]];
  P.fill(poly(COLLAR), (g) => { const q = g.createLinearGradient(1720, 0, 1940, 0); q.addColorStop(0, grey(0.62)); q.addColorStop(0.4, grey(0.48)); q.addColorStop(1, grey(0.45)); return q; }, -0.18, { spacing: 0.3 });
  clipTo(o, poly(COLLAR), () => { for (let k = 0; k < 9; k++) curve(o, [[1700, 530 + k * 6], [1760, 522 + k * 5.5], [1830, 500 + k * 5], [1900, 470 + k * 4.5], [1950, 470 + k * 4]], 1.1, blkA(0.4 + 0.05 * k), 7100 + k, { ends: 0.2 }); });
  soft(P, poly(COLLAR), 0.4);
  // left forearm sleeve rising from the bottom edge
  solid(P, blob(SLEEVE_L), lin(800, 820, 1000, 946, [[0, 0.95], [1, 0.8]]), 1.1, { spacing: 0.26 });
  soft(P, blob(SLEEVE_L), 0.65);
  clipTo(o, blob(SLEEVE_L), () => { for (let i = 0; i < 26; i++) { const x = 800 + r() * 190, y = 830 + r() * 110; stroke(o, [[x, y], [x + 6 + r() * 8, y + 20 + r() * 30]], 1 + r() * 1.2, blkA(0.25 + r() * 0.4), 480 + i, 0.4); } });
  o.save(); o.strokeStyle = K; o.lineWidth = 2.6; o.beginPath(); smoothPath(o, SLEEVE_L, false); o.stroke(); o.restore();
}

// ---------------------------------------------------------------- face
// Profile traced row by row on the source (29.6 s, 4x crops snapshots/s07-fix1-ref/face2|mouth|hair.jpg): forehead
// behind the hair, nose tip (1303,341), the upper lip at x≈1344, a closed mouth (1358,404)→(1377,413), chin
// (1383,452)→(1390,482), the jaw running under the cup to the owl.
const lockTaper = (w) => (u) => w * Math.pow(Math.max(0, 1 - u), 0.85) * Math.min(1, 0.55 + u * 5);
function lock(o, pts, w, color = K, per = 8) { taper(o, sampleCurve(pts, per), lockTaper(w), color); }
function hatchLines(o, x, y, a, n, sp, L, w, color, seed, { jit = 0.4, curve: cv = 0 } = {}) {
  const r = rng(seed), c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;
  for (let k = 0; k < n; k++) {
    const off = k * sp + (r() - 0.5) * sp * jit, l = L * (0.6 + r() * 0.6), x0 = x + nx * off + c * (r() - 0.5) * L * 0.3, y0 = y + ny * off + s * (r() - 0.5) * L * 0.3;
    stroke(o, [[x0, y0], [x0 + c * l * 0.5 + nx * cv, y0 + s * l * 0.5 + ny * cv], [x0 + c * l, y0 + s * l]], w * (0.7 + r() * 0.6), color, seed * 13 + k, 0.35);
  }
}
function drop(o, x, y, s, seed) {
  // a sweat drop: an open teardrop outline with a bright body
  o.save(); o.translate(x, y); o.scale(s, s);
  o.fillStyle = inkA(0.95); o.beginPath(); o.moveTo(0, -8); o.quadraticCurveTo(4.6, 2, 0, 5.5); o.quadraticCurveTo(-4.6, 2, 0, -8); o.fill();
  o.restore();
  stroke(o, [[x - 2.2 * s, y - 3 * s], [x - 3.6 * s, y + 2 * s], [x, y + 5.6 * s], [x + 3.4 * s, y + 2.4 * s], [x + 2.4 * s, y - 1 * s]], 1.9 * s, K, seed, 0.55, 5);
}
function paintFace(P) {
  const o = P.o, r = rng(511);
  // skin: near-white, engraved with fine lines running down the face; darker under the cheekbone and on the jaw
  // that turns away toward the cup and the owl
  soft(P, blob(FACE), 0);
  solid(P, blob(FACE), lin(1300, 280, 1470, 470, [[0, 0.97], [0.55, 0.95], [1, 0.91]]), 1.25, { style: 2 });
  P.light(blob([[1420, 440], [1476, 430], [1476, 504], [1430, 504]]), 0.86, "darken", 0.7);
  // a faint paper grain of fine strokes down the face (the source's skin is not a flat mask)
  clipTo(o, blob(FACE), () => { for (let i = 0; i < 260; i++) { const x = 1305 + r() * 170, y = 200 + r() * 300; stroke(o, [[x, y], [x + 3 + r() * 3, y + 7 + r() * 8]], 0.7 + r() * 0.5, blkA(0.06 + r() * 0.08), 5000 + i, 0.4, 3); } });
  // profile: forehead, nose, the nostril wing and the line from it, upper lip, mouth, chin
  curve(o, [[1318, 232], [1317, 258], [1315, 284], [1313, 304], [1309, 322], [1304, 334], [1302, 341], [1306, 347], [1318, 351]], 2.4, K, 501);
  curve(o, [[1318, 351], [1328, 353], [1338, 358], [1343, 364], [1344, 378], [1346, 392], [1352, 400], [1358, 404]], 1.8, K, 502);
  stroke(o, [[1340, 336], [1341, 346], [1340, 357]], 1.6, blkA(0.8), 503, 0.5);
  stroke(o, [[1318, 350], [1326, 352], [1333, 356]], 1.5, blkA(0.7), 504, 0.5);
  // the mouth: closed, a short flat line turning down a little at the corner (concentration)
  stroke(o, [[1357, 404], [1364, 407], [1371, 410], [1377, 413], [1379, 417]], 2.3, K, 505, 0.3);
  curve(o, [[1361, 410], [1362, 420], [1369, 430], [1377, 440], [1382, 450], [1384, 464], [1389, 476], [1398, 486], [1405, 496]], 2, K, 506);
  // cheek: a small patch of fine hatching under the cheekbone, and a longer line from the nose wing
  hatchLines(o, 1321, 318, 1.05, 6, 3.2, 14, 1.1, blkA(0.45), 507);
  stroke(o, [[1332, 312], [1336, 326], [1339, 336]], 1.1, blkA(0.5), 508, 0.5);
  // stubble: short strokes over the upper lip, round the mouth and down the chin and jaw (denser low on the jaw)
  for (let i = 0; i < 900; i++) {
    const x = 1346 + r() * 128, y = 364 + r() * 140;
    if (!inside(FACE, x, y)) continue;
    const onLip = x < 1380 && y < 402, onJaw = y > 438;
    if (!onLip && !onJaw && r() > 0.2) continue;
    if (onJaw && r() > 0.6 + 0.4 * Math.min(1, (y - 438) / 30)) continue;
    const a = 1.05 + (r() - 0.5) * 0.5, l = 3 + r() * 6;
    stroke(o, [[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]], 0.9 + r() * 1, blkA(0.25 + r() * 0.4), 5100 + i, 0.4, 3);
  }
  // the stubbled chin and jaw read darker (measured ~170 against the cheek's ~235)
  P.light(blob([[1376, 440], [1400, 436], [1440, 446], [1476, 450], [1476, 506], [1410, 506], [1392, 486], [1384, 462]]), 0.88, "darken", 0.7);
  // beard shadow: fine near-vertical strokes packed along the jawline, thinning upward
  for (let i = 0; i < 1300; i++) {
    const x = 1376 + r() * 100, yb = x < 1406 ? 470 + (x - 1376) * 0.87 : 496 + (x - 1406) * 0.07, d = Math.pow(r(), 1.4) * 64, y = yb - d;
    if (!inside(FACE, x, y + 2)) continue;
    const a = 1.3 + (r() - 0.5) * 0.6, l = 5 + r() * 6, k = 1 - d / 64;
    stroke(o, [[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l]], 0.9 + r() * 0.9, blkA((0.2 + 0.5 * k) * (0.5 + 0.5 * r())), 5600 + i, 0.4, 3);
  }
  curve(o, [[1400, 490], [1422, 501], [1450, 503], [1476, 500]], 2, blkA(0.8), 5700, { ends: 0.3 });
  // shade under the jaw toward the owl: hatched
  hatchLines(o, 1412, 452, 1.2, 14, 3.6, 40, 1.2, blkA(0.35), 509, { curve: 3 });
  hatchLines(o, 1400, 346, 1.35, 8, 3.8, 30, 1.1, blkA(0.3), 510);
  // sweat drops (measured at (1349,285), (1391,385), (1418,440))
  drop(o, 1349, 286, 1, 511); drop(o, 1391, 386, 1.05, 512); drop(o, 1418, 440, 0.9, 513);
  stroke(o, [[1383, 352], [1386, 366], [1389, 378]], 1.2, blkA(0.55), 514, 0.4);
}

// ---------------------------------------------------------------- hair
// Black hair under the beanie's rolled cuff: a mass along the cuff and behind the face, from which locks of
// tapered strands fall over the forehead (skin shows between them from y≈250), ending at y 290–345; long locks on
// the left fall past the face with white-edged strands; the mass behind the owl spills over the collar.
const HAIR_L = [[1256, 40], [1282, 40], [1286, 130], [1298, 176], [1312, 204], [1318, 232], [1317, 262], [1314, 288], [1307, 304], [1297, 318],
  [1287, 310], [1277, 324], [1266, 306], [1258, 250], [1253, 150]];
// the band of hair along the cuff's underside (roots of the locks)
const HAIR_BAND = [[1284, 120], [1300, 150], [1330, 175], [1370, 200], [1420, 222], [1480, 240], [1480, 330], [1462, 322], [1450, 300], [1440, 270],
  [1420, 246], [1400, 236], [1370, 218], [1352, 206], [1334, 212], [1316, 212], [1298, 196]];
const HAIR_R = [[1600, 262], [1690, 287], [1800, 272], [1862, 246], [1896, 214], [1906, 300], [1904, 400], [1902, 446], [1880, 450], [1850, 462],
  [1820, 480], [1790, 488], [1760, 484], [1730, 478], [1706, 470], [1680, 420], [1650, 330]];
function strands(o, root, tip, n, { w = 1.6, seed = 1, spread = 12, alpha = 0.7, bend = 0.3, color = null }) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const dx = (r() - 0.5) * spread * 2, dy = (r() - 0.5) * spread;
    const a = [root[0] + dx, root[1] + dy], b = [tip[0] + dx * 1.4 + (r() - 0.5) * spread, tip[1] + (r() - 0.5) * spread * 1.5];
    const m = [(a[0] + b[0]) / 2 + (b[1] - a[1]) * bend * (0.5 + r()), (a[1] + b[1]) / 2 - (b[0] - a[0]) * bend * 0.2];
    stroke(o, [a, m, b], w * (0.6 + r() * 0.8), color || inkA(alpha * (0.5 + r() * 0.5)), seed * 100 + i, 0.4);
  }
}
// a clump of black strands: roots spread along [x0, x1] just under the cuff, converging toward `tip`
function clump(o, x0, x1, tip, n, w, seed, { conv = 0.75, jx = 6, jy = 14, bow = 0.12, root = (x) => lerpPts(LOW, x) + 8 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * ((i + 0.3 + r() * 0.4) / n), y = root(x);
    const tx = tip[0] + (x - (x0 + x1) / 2) * (1 - conv) + (r() - 0.5) * jx * 2, ty = tip[1] + (r() - 0.5) * jy * 2 - r() * r() * 30;
    const mx = (x + tx) / 2 + (ty - y) * bow * (0.6 + r() * 0.8), my = (y + ty) / 2;
    lock(o, [[x, y - 6], [mx, my], [tx, ty]], w * (0.45 + r() * 0.75));
  }
}
// a solid lock: black from its roots along the cuff (x0..x1) to a pointed tip, edges bowing by bowL / bowR px
function lockBody(o, x0, x1, tip, seed, { bowL = 4, bowR = -4 } = {}) {
  const r = rng(seed), y0 = lerpPts(LOW, x0) + 4, y1 = lerpPts(LOW, x1) + 4;
  const mL = [(x0 + tip[0]) / 2 - bowL, (y0 + tip[1]) / 2], mR = [(x1 + tip[0]) / 2 - bowR, (y1 + tip[1]) / 2];
  const L = sampleCurve([[x0, y0 - 10], [x0 + (mL[0] - x0) * 0.4, y0 + (mL[1] - y0) * 0.4], mL, tip], 8);
  const R = sampleCurve([tip, mR, [x1 + (mR[0] - x1) * 0.4, y1 + (mR[1] - y1) * 0.4], [x1, y1 - 10]], 8);
  o.fillStyle = K; o.beginPath(); o.moveTo(L[0][0], L[0][1]);
  for (const p of [...L, ...R]) o.lineTo(p[0] + (r() - 0.5) * 0.6, p[1]);
  o.closePath(); o.fill();
}
function paintHair(P) {
  const o = P.o;
  solid(P, blob(HAIR_L), 0.02, 0, { style: 2 });
  solid(P, poly(HAIR_BAND), 0.02, 0, { style: 2 });
  solid(P, blob(HAIR_R), 0.0, 0, { style: 2 });
  // locks over the forehead, traced on the 3.3x crop: solid black at the roots, splitting into pointed locks —
  // a thin one ending (1344,272), the big lock (1376,318), one at (1404,302), fine strands over the cheek stopping
  // at y≈345, one behind at (1446,330); strands split off their edges (≈50 strokes, 1.5–6 px)
  lockBody(o, 1310, 1326, [1344, 272], 628, { bowL: -2, bowR: -4 });
  lockBody(o, 1342, 1380, [1377, 318], 629, { bowL: -4, bowR: -8 });
  lockBody(o, 1378, 1430, [1405, 303], 630, { bowL: 0, bowR: -6 });
  lockBody(o, 1426, 1478, [1446, 332], 631, { bowL: 2, bowR: -4 });
  clump(o, 1290, 1320, [1322, 250], 4, 2.6, 626, { conv: 0.5 });
  clump(o, 1318, 1344, [1348, 284], 4, 2.4, 621, { conv: 0.6, jy: 8 });
  clump(o, 1338, 1384, [1373, 312], 9, 3.4, 622, { conv: 0.75, jx: 6, jy: 12 });
  clump(o, 1380, 1428, [1403, 298], 8, 3.8, 623, { conv: 0.65, jy: 10 });
  clump(o, 1398, 1440, [1413, 344], 7, 2.6, 624, { conv: 0.6, jy: 5 });
  clump(o, 1430, 1470, [1444, 326], 6, 3.6, 625, { conv: 0.5 });
  for (const [a, m, b, w] of [[[1352, 236], [1360, 262], [1362, 298], 2.2], [[1392, 244], [1390, 282], [1385, 324], 1.8], [[1410, 250], [1414, 294], [1420, 350], 1.5],
    [[1366, 240], [1372, 272], [1370, 304], 1.4], [[1334, 232], [1338, 252], [1339, 268], 1.6]]) lock(o, [a, m, b], w);
  // white strand edges inside the black (screen light catching the hair)
  strands(o, [1272, 60], [1286, 290], 9, { w: 1.7, seed: 601, spread: 9, alpha: 0.85, bend: -0.1 });
  strands(o, [1296, 150], [1304, 290], 4, { w: 1.3, seed: 602, spread: 6, alpha: 0.7, bend: -0.05 });
  strands(o, [1318, 150], [1348, 236], 6, { w: 1.2, seed: 603, spread: 10, alpha: 0.6, bend: 0.08 });
  strands(o, [1356, 200], [1372, 280], 3, { w: 1, seed: 609, spread: 8, alpha: 0.4, bend: 0.05 });
  strands(o, [1400, 222], [1406, 272], 3, { w: 1, seed: 607, spread: 8, alpha: 0.4, bend: 0.1 });
  strands(o, [1436, 246], [1450, 316], 5, { w: 1.1, seed: 608, spread: 10, alpha: 0.4, bend: 0.1 });
  // right side, behind the owl: grey strands in the black
  strands(o, [1868, 270], [1888, 450], 8, { w: 1.4, seed: 604, spread: 14, alpha: 0.4, bend: 0.1 });
  strands(o, [1800, 300], [1826, 480], 5, { w: 1.2, seed: 605, spread: 18, alpha: 0.28, bend: 0.1 });
  // the hair spilling over the collar behind the owl: shaggy pointed locks of uneven width (8–26 px at the root),
  // spacing and length (15–50 px), angle ±0.4 rad, so the black mass comes down irregularly to y≈520; thin strands
  // and a few ink-edged (white) strands between them
  const r = rng(606);
  let x = 1704;
  for (let i = 0; x < 1904; i++) {
    const w = 8 + r() * 18, yb = lerpPts(HAIR_R_LOW, x + w / 2) - 6, L = 15 + r() * 35 * (x < 1830 ? 1 : 0.6), a = 1.4 + (r() - 0.5) * 0.8;
    const tip = [x + w / 2 + Math.cos(a) * L, yb + Math.sin(a) * L], bow = (r() - 0.5) * 6;
    const Ls = sampleCurve([[x, yb - 4], [(x + tip[0]) / 2 + bow - 2, (yb + tip[1]) / 2], tip], 6), Rs = sampleCurve([tip, [(x + w + tip[0]) / 2 + bow + 2, (yb + tip[1]) / 2], [x + w, yb - 4]], 6);
    o.fillStyle = K; o.beginPath(); o.moveTo(Ls[0][0], Ls[0][1]); for (const p of [...Ls, ...Rs]) o.lineTo(p[0], p[1]); o.closePath(); o.fill();
    if (r() < 0.55) lock(o, [[x + w * 0.7, yb - 2], [x + w * 0.8 + Math.cos(a + 0.2) * L * 0.4, yb + L * 0.35], [x + w + Math.cos(a + 0.3) * L * 0.8, yb + Math.sin(a + 0.3) * L * 0.8]], 1.6 + r() * 1.6);
    if (r() < 0.4) stroke(o, [[x + w * 0.4, yb - 24], [x + w * 0.45, yb - 4], [x + w * 0.5 + (r() - 0.5) * 6, yb + L * 0.45]], 1 + r() * 0.6, inkA(0.4 + r() * 0.3), 6600 + i, 0.4);
    x += w * (0.55 + r() * 0.5);
  }
}
// the black mass's lower edge over the collar (uneven, reaching y≈520 in the middle)
const HAIR_R_LOW = [[1700, 478], [1730, 480], [1760, 486], [1790, 490], [1820, 482], [1850, 464], [1880, 452], [1905, 448]];

// ---------------------------------------------------------------- beanie
// Crown (above the fold) and cuff (the turned-up band), traced at 1.6x: a light grey knit with dark ink ribs on the
// lit left, turning into a dense dark knit grid on the shaded right. Flat tone + a fine print mesh + ink lines.
const FOLD = [[1300, -4], [1355, 20], [1399, 56], [1463, 95], [1558, 126], [1654, 150], [1749, 157], [1820, 148], [1862, 138], [1886, 120], [1900, 80]];
const LOW = [[1280, 0], [1278, 31], [1280, 69], [1297, 120], [1329, 165], [1367, 202], [1418, 230], [1480, 245], [1560, 256], [1635, 268], [1700, 290],
  [1760, 281], [1800, 267], [1845, 246], [1875, 204], [1884, 160], [1892, 110], [1900, 80]];
const lerpPts = (pts, x) => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i], f = (x - a[0]) / Math.max(1e-6, b[0] - a[0]); return a[1] + (b[1] - a[1]) * f; } return pts[pts.length - 1][1]; };
// clip a polygon to the half-plane x >= x0 (or x <= x0 with keepRight = false)
function clipX(pts, x0, keepRight = true) {
  const inS = (p) => (keepRight ? p[0] >= x0 : p[0] <= x0), out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    if (inS(a)) out.push(a);
    if (inS(a) !== inS(b)) { const t = (x0 - a[0]) / (b[0] - a[0]); out.push([x0, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
function paintBeanie(P) {
  const o = P.o;
  const r = rng(701);
  const crown = [[1296, -4], [1908, -4], ...FOLD.slice().reverse()];
  const cuff = [...FOLD, ...LOW.slice().reverse()];
  // value (measured on blurred samples, inverted through the grade): crown ~0.62 on the lit left falling to ~0.28 on
  // the right; the rolled cuff ~0.7 falling to ~0.24, darker along its rolled underside
  solid(P, poly(crown), (g) => { const q = g.createLinearGradient(1320, 0, 1906, 0); q.addColorStop(0, grey(0.86)); q.addColorStop(0.3, grey(0.58)); q.addColorStop(0.65, grey(0.34)); q.addColorStop(1, grey(0.14)); return q; }, 1.45, { style: 1, spacing: 0.16 });
  solid(P, poly(cuff), (g) => { const q = g.createLinearGradient(1290, 0, 1906, 0); q.addColorStop(0, grey(0.8)); q.addColorStop(0.25, grey(0.56)); q.addColorStop(0.55, grey(0.24)); q.addColorStop(1, grey(0.13)); return q; }, 0.9, { style: 1, spacing: 0.16 });
  // the cuff's right third: a knit of short ticks (stitches) instead of lines
  P.fill(poly(clipX(cuff, 1690)), (g) => { const q = g.createLinearGradient(1690, 0, 1906, 0); q.addColorStop(0, grey(0.24)); q.addColorStop(1, grey(0.15)); return q; }, 1.5, { style: 3, spacing: 0.3 });
  soft(P, poly(crown), 0.5); soft(P, poly(cuff), 0.55);
  // roll shading: the top of each roll catches light, its underside turns dark (12–18 px band above LOW)
  const along = (pts, dy) => pts.map(([x, y]) => [x, y + dy]);
  vband(P, poly(crown), along(FOLD, -14), 20, 0.16, 0.7, 6);
  vband(P, poly(crown), along(FOLD, -52), 30, 0.8, 0.45, 12);
  vband(P, poly(cuff), along(LOW, -9), 16, 0.1, 0.85, 4);
  vband(P, poly(cuff), along(FOLD, 24), 24, 0.85, 0.45, 10);
  // crown ribs: curved wales wrapping the dome, ~11 px apart, bowing with the head (leaning left as they rise)
  clipTo(o, poly(crown), () => {
    for (let i = 0; i < 36; i++) {
      const x0 = 1300 + i * 17.5 + r() * 4, y0 = lerpPts(FOLD, x0), u = (x0 - 1300) / 610;
      const lean = 18 + u * 26, bow = 6 + 6 * Math.sin(Math.PI * u);
      const pts = [[x0, y0 + 3], [x0 - lean * 0.35 - bow, y0 * 0.62 - 4], [x0 - lean * 0.75 - bow * 0.6, y0 * 0.25 - 6], [x0 - lean, -12]];
      stroke(o, pts, 1.6 + u * 1.4 + r() * 0.8, blkA(0.55 + 0.35 * u), 710 + i, 0.55);
    }
    // cross-hatching over the shaded right third of the crown
    for (let k = 0; k < 12; k++) {
      const pts = []; for (let x = 1690; x <= 1912; x += 24) pts.push([x, lerpPts(FOLD, x) * (1 - k / 11) - 10 * (k / 11) + (r() - 0.5) * 2]);
      curve(o, pts, 1.1, blkA(0.5), 760 + k, { ends: 0.2 });
    }
  });
  // cuff: wales (vertical ribs) ~10 px apart, bending with the roll; on the right they cross the courses as a knit
  clipTo(o, poly(cuff), () => {
    for (let i = 0; i < 36; i++) {
      const x = 1284 + i * 17.5 + r() * 4, u = (x - 1284) / 620, t0 = lerpPts(FOLD, x), t1 = lerpPts(LOW, x), m = (t0 + t1) / 2;
      stroke(o, [[x - 6, t0 - 6], [x + 2, m - (t1 - t0) * 0.2], [x + 4, m + (t1 - t0) * 0.2], [x - 2, t1 + 6]], 1.6 + u * 1.8 + r() * 0.6, blkA(0.5 + 0.4 * u), 800 + i, 0.5);
      if (u < 0.6) stroke(o, [[x + 3, t0 + 4], [x + 9, m], [x + 7, t1 - 4]], 2.5, inkA(0.14 + 0.12 * (1 - u)), 850 + i, 0.5);
    }
    // a few heavy fold strokes where the cuff creases
    for (const [a, b2, c, w] of [[[1330, 120], [1370, 150], [1420, 176], 3], [[1470, 150], [1540, 176], [1620, 196], 2.6], [[1600, 214], [1660, 232], [1720, 250], 2.4]]) stroke(o, [a, b2, c], w, blkA(0.6), 870 + a[0], 0.4);
    for (let k = 1; k < 12; k++) {
      const pts = [];
      for (let x = 1600; x <= 1920; x += 20) { const t = k / 12, f = lerpPts(FOLD, x), l = lerpPts(LOW, x); pts.push([x, f + (l - f) * (t + 0.08 * Math.sin(Math.PI * t)) + (r() - 0.5) * 1.5]); }
      taper(o, sampleCurve(pts, 5), (u) => 0.3 + 1.8 * u, blkA(0.75));
    }
    // bright stitch highlights on the dark right side of the cuff
    for (let i = 0; i < 300; i++) {
      const x = 1640 + r() * 270, y = 110 + r() * 180;
      if (!inside(cuff, x, y)) continue;
      o.fillStyle = inkA(0.1 + r() * 0.22); o.fillRect(x, y, 3 + r() * 3, 2 + r() * 1.5);
    }
  });
  curve(o, FOLD, 3, K, 790);
  curve(o, LOW, 2.8, K, 791);
  line(o, [[1281, 0], [1279, 50], [1296, 112]], 2, inkA(0.8), 792);
}

export function paintFigure(P) {
  paintBody(P);
  paintFace(P);
  paintHair(P);
  paintBeanie(P);
}
