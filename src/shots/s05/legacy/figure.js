// s05 figure: the designer seen over his right shoulder — the knit beanie, black hair, his face in lost profile with
// the pencil between his teeth, the sweatshirt (a pale sleeve reaching for the trackpad, a screentoned back),
// the left sleeve coming in at the bottom, and the chair's bentwood rail.
import { INK, grey, rng, noise1, noise2, taper, poly, blob, ell, lin, rad, line, curve, stroke, inside, along, clearO, sampleCurve, smoothPath, PI } from "../kit.js";
import * as T from "../trace.js";
import { paintFace, paintLips, FACE_MASK } from "./face.js";
import { paintBeanie, BEANIE_MASK } from "./beanie.js";

const INKD = "#0b0b0b";

// ---------------------------------------------------------------- sweatshirt
// Traced on the source at 25.00 from a skeleton of its ink lines (snapshots/s05-fix1-study/lines-back.jpg):
// the back of the sweatshirt (screentoned) right of the armhole seam, the upper arm (pale, soft fold streaks) left of
// it, the yoke seam, the vertical folds of the back, the fold hatching in the shade.
const BACK = [[1510, 640], [1560, 632], [1620, 620], [1690, 580], [1720, 530], [1760, 516], [1810, 516], [1850, 522], [1882, 505], [1900, 470], [1950, 473], [1985, 493], [2017, 533], [2043, 599], [2063, 666], [2077, 746], [2080, 826], [2082, 960], [1620, 960], [1611, 905], [1596, 864], [1558, 789], [1530, 757], [1505, 738], [1504, 700]];
// the upper arm: from the forearm's lower contour (C1) and the shoulder down to the bottom of the frame
const C1 = [[1341, 798], [1346, 794], [1357, 772], [1372, 752], [1390, 735], [1418, 700], [1440, 685], [1470, 668], [1501, 650], [1510, 640]];
const TORSO = [...C1, [1504, 700], [1505, 738], [1530, 757], [1558, 789], [1596, 864], [1611, 905], [1620, 960], [1240, 960], [1245, 944], [1252, 918], [1259, 905], [1264, 896], [1273, 875], [1284, 864], [1319, 844], [1323, 835], [1337, 810]];
const ARM = [[1187, 627], [1250, 640], [1300, 644], [1350, 648], [1400, 652], [1450, 648], [1500, 640], [1470, 665], [1447, 690], [1420, 720], [1390, 760], [1353, 795], [1327, 781], [1273, 774], [1220, 772], [1193, 764], [1172, 745], [1163, 700], [1168, 655]];
const CUFF_R = [[1187, 627], [1215, 636], [1222, 690], [1222, 748], [1196, 730], [1176, 712], [1163, 680], [1168, 650]];
const SEAM = [[1600, 862], [1680, 828], [1745, 798], [1800, 772], [1847, 746], [1880, 726], [1908, 706], [1960, 672], [2045, 636]];

function dots(o, clipFn, pitch, r, color, ang = 0.785) {
  o.save(); o.beginPath(); clipFn(o); o.clip();
  o.fillStyle = color;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let i = -170; i < 170; i++) for (let j = -170; j < 170; j++) {
    const x = 1650 + (i * ca - j * sa) * pitch, y = 700 + (i * sa + j * ca) * pitch;
    if (x < 1180 || x > 2100 || y < 440 || y > 960) continue;
    o.beginPath(); o.arc(x, y, r, 0, 7); o.fill();
  }
  o.restore();
}
// a fine fold-hatch stroke (3 points, tapered at both ends)
function fh(o, x, y, ang, L, w, color, bend = 0) {
  const c = Math.cos(ang), s = Math.sin(ang);
  taper(o, sampleCurve([[x, y], [x + c * L * 0.5 - s * bend, y + s * L * 0.5 + c * bend], [x + c * L, y + s * L]], 4), (u) => w * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.04))), 0.6), color);
}

function paintShirt(P) {
  const o = P.o, r = rng(301);
  // ---- the back: grey screentone (source 140–155 near the shoulder, 80–130 lower down), lighter toward the shoulder
  P.fill(poly(BACK), lin(1600, 660, 1900, 960, [[0, 0.74], [0.45, 0.7], [1, 0.58]]), 1.2, { style: 2 });
  P.light(poly([[1900, 650], [2080, 600], [2082, 960], [1900, 960]]), lin(1900, 0, 2080, 0, [[0, 0.62], [1, 0.46]]), "source-over", 0.6);
  P.light((c) => c.ellipse(2010, 590, 90, 140, -0.5, 0, 7), rad(2010, 590, 10, 140, [[0, 0.52], [1, 0.62]]), "source-over", 0.5);
  dots(o, poly(BACK), 3.4, 0.8, "rgba(20,20,20,0.3)");
  o.save(); o.beginPath(); poly(BACK)(o); o.clip();
  // the owl's shadow under its tail: fine dark strokes fanning down-left from the feathers
  for (let i = 0; i < 70; i++) { const x = 1560 + r() * 170, y = 640 + r() * 70; fh(o, x, y, 2.2 + (r() - 0.5) * 0.4, 16 + r() * 30, 1.0 + r() * 0.6, `rgba(15,15,15,${(0.35 + 0.35 * r()).toFixed(2)})`); }
  // dense fold hatching under the arm (1550–1700, 700–900): strokes running down the folds
  for (let i = 0; i < 150; i++) {
    const x = 1560 + r() * 150, y = 700 + r() * 220, d = Math.hypot(x - 1600, (y - 850) * 0.6) / 140;
    if (r() > 1.1 - d) continue;
    fh(o, x, y, 1.38 + (r() - 0.5) * 0.25, 20 + r() * 40, 0.9 + r() * 0.7, `rgba(15,15,15,${(0.25 + 0.3 * r()).toFixed(2)})`, (r() - 0.5) * 4);
  }
  // along the yoke seam and below it: short strokes hanging from the seam
  const sq = sampleCurve(SEAM, 10);
  sq.forEach((p, i) => { if (r() < 0.45) return; fh(o, p[0] + (r() - 0.5) * 6, p[1] + 2, 1.5 + (r() - 0.5) * 0.3, 18 + r() * 40, 0.9 + r() * 0.6, `rgba(15,15,15,${(0.25 + 0.3 * r()).toFixed(2)})`); });
  // the lower back and the side in shade: long vertical fold hatching, denser to the right
  for (let i = 0; i < 520; i++) {
    const x = 1620 + r() * 460, y = 760 + r() * 200, k = (x - 1620) / 460;
    if (r() > 0.25 + 0.75 * k || y < 700 + (2045 - x) * 0.15) continue;
    fh(o, x, y, 1.62 + (x - 1850) * 0.0006 + (r() - 0.5) * 0.12, 30 + r() * 60, 0.8 + r() * 0.7, `rgba(12,12,12,${(0.25 + 0.35 * r()).toFixed(2)})`, (r() - 0.5) * 3);
  }
  // the far shoulder turning away: curved fold hatching parallel to its contour (c-rr.jpg)
  const SH = [[1900, 474], [1950, 481], [1985, 500], [2017, 536], [2043, 600], [2063, 666], [2074, 730]];
  for (let k = 0; k < 26; k++) {
    const inset = 5 + k * 4.2 + (r() - 0.5) * 3, a0 = 0.15 + r() * 0.3, a1 = 0.75 + r() * 0.25;
    const q = sampleCurve(SH, 6), n = q.length, pts = [];
    for (let i = Math.floor(a0 * (n - 1)); i <= Math.floor(a1 * (n - 1)); i++) {
      const p0 = q[Math.max(0, i - 1)], p1 = q[Math.min(n - 1, i + 1)], dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
      pts.push([q[i][0] - (dy / l) * inset, q[i][1] + (dx / l) * inset]);
    }
    if (pts.length < 3) continue;
    taper(o, pts, (u) => (1.0 + 1.2 * r()) * Math.sin(Math.PI * u) * Math.max(0.2, 1 - k / 30), `rgba(12,12,12,${(0.3 + 0.35 * (1 - k / 26)).toFixed(2)})`);
  }
  // pale highlight streaks on the shoulder (t-backz.jpg)
  for (let i = 0; i < 8; i++) { const x = 1540 + r() * 60, y = 670 + r() * 70; stroke(o, [[x, y], [x + 22 + r() * 20, y - 8 - r() * 8]], 5 + r() * 5, "rgba(226,224,218,0.35)", 380 + i, 0.3); }
  o.restore();
  // ---- the upper arm: pale near the elbow, greyer lower down, long soft fold streaks rising to the right
  P.fill(poly(TORSO), lin(1380, 760, 1450, 960, [[0, 0.84], [0.5, 0.74], [1, 0.62]]), -0.9, { style: 2 });
  P.light(poly([[1500, 760], [1560, 790], [1600, 870], [1620, 960], [1480, 960], [1470, 860]]), 0.5, "source-over", 0.5);
  {
    const rt = rng(307);
    o.save(); o.beginPath(); poly(TORSO)(o); o.clip();
    for (let i = 0; i < 46; i++) {
      const x = 1250 + rt() * 330, y = 760 + rt() * 200, L = 50 + rt() * 110;
      stroke(o, [[x, y], [x + L * 0.5, y - L * 0.55], [x + L * 0.75, y - L * 0.95]], 4 + rt() * 7, `rgba(90,90,88,${(0.22 + 0.2 * rt()).toFixed(2)})`, 700 + i, 0.45);
    }
    for (let i = 0; i < 60; i++) {
      const x = 1270 + rt() * 320, y = 800 + rt() * 160, L = 20 + rt() * 50;
      fh(o, x, y, -1.05 + (rt() - 0.5) * 0.3, L, 1.0 + rt() * 0.7, `rgba(20,20,20,${(0.25 + 0.3 * rt()).toFixed(2)})`);
    }
    o.restore();
  }
  // ---- contours: the upper arm's front (C1), his side, the armhole seam, the yoke seam, the folds of the back
  curve(o, C1, 2.6, INKD, 357);
  curve(o, [[1245, 944], [1252, 918], [1259, 905], [1264, 896], [1273, 875], [1284, 864], [1319, 844], [1323, 835], [1337, 810], [1341, 798]], 2.8, INKD, 358);
  curve(o, [[1504, 700], [1505, 738], [1530, 757], [1558, 789], [1596, 864], [1611, 905], [1620, 950]], 2.0, INKD, 359);
  curve(o, SEAM, 1.6, "rgba(15,15,15,0.85)", 345);
  for (const [pts, w] of [[[[1911, 705], [1936, 776], [1948, 823], [1952, 832]], 2.4], [[[1959, 672], [1967, 685], [1992, 756], [2010, 837], [2017, 857], [2022, 871]], 2.2], [[[1886, 817], [1884, 857], [1879, 892], [1872, 915], [1861, 937]], 1.6], [[[1600, 877], [1604, 888], [1611, 905], [1617, 942]], 1.4], [[[1540, 862], [1537, 887], [1512, 940]], 1.4], [[[1875, 864], [1873, 883], [1867, 903], [1849, 940]], 1.3], [[[1576, 848], [1575, 876], [1564, 923]], 1.3], [[[1926, 808], [1929, 836], [1926, 882]], 1.2], [[[1999, 761], [2006, 785], [2018, 853]], 1.2]]) curve(o, pts, w, INKD, 346);
  // shoulder edge: lit rim against the dark
  curve(o, [[1900, 468], [1950, 475], [1985, 495], [2017, 533], [2043, 599], [2063, 666], [2077, 746], [2080, 826], [2082, 950]], 3.2, INKD, 350);
  curve(o, [[1905, 474], [1948, 481], [1980, 500], [2010, 537]], 3, "rgba(242,240,234,0.9)", 351);
  curve(o, [[1718, 536], [1760, 522], [1810, 522], [1850, 528], [1882, 510], [1898, 488], [1902, 466]], 2.4, INKD, 352);
}

function paintSleeveL(P) {
  const o = P.o;
  const S = T.S_SLEEVE_L;
  clearO(P, blob(S));
  P.fill(blob(S), lin(800, 820, 1050, 946, [[0, 0.78], [1, 0.68]]), 1.2, { style: 2 });
  curve(o, S.slice(0, 16), 3, INKD, 361);
  const r = rng(362);
  for (let i = 0; i < 9; i++) { const x = 830 + r() * 170, y = 850 + r() * 60; stroke(o, [[x, y], [x + 6, y + 30], [x + 10, y + 70]], 3 + r() * 4, "rgba(110,110,108,0.5)", 363 + i); }
  curve(o, [[905, 818], [930, 850], [960, 875]], 1.8, "rgba(20,20,20,0.6)", 370);
}


// ---------------------------------------------------------------- right forearm (its own layer: it slides with the hand)
// ARM_X runs on under the back (hidden there) so the sleeve can slide right without opening a gap at the fold.
const ARM_X = [[1187, 627], [1250, 640], [1300, 644], [1350, 648], [1400, 652], [1450, 648], [1500, 640], [1560, 632], [1580, 700], [1520, 770], [1430, 810], [1340, 790], [1300, 774], [1260, 762], [1220, 746], [1193, 728], [1172, 708], [1163, 680], [1168, 650]];
export function paintArm(P) {
  const o = P.o, r = rng(305);
  P.fill(poly(ARM_X), lin(1180, 640, 1480, 760, [[0, 0.8], [0.6, 0.77], [1, 0.72]]), 0.1, { style: 2 });
  const folds = [
    [[1235, 690], [1250, 715], [1262, 752]], [[1275, 668], [1290, 700], [1300, 740], [1318, 770]], [[1330, 666], [1340, 690], [1352, 725]],
    [[1392, 670], [1400, 700], [1405, 730]], [[1428, 668], [1440, 690]], [[1300, 655], [1320, 680]], [[1248, 655], [1262, 672]],
    [[1360, 700], [1374, 732], [1382, 760]], [[1206, 700], [1214, 735]],
  ];
  folds.forEach((f, i) => stroke(o, f, 5 + r() * 5, "rgba(120,120,118,0.55)", 310 + i, 0.4));
  folds.forEach((f, i) => stroke(o, f.map(([x, y]) => [x + 4, y + 2]), 1.6, "rgba(20,20,20,0.55)", 330 + i, 0.5));
  P.fill(blob(CUFF_R), lin(1165, 640, 1220, 760, [[0, 0.78], [1, 0.7]]), 1.5, { style: 2 });
  curve(o, [[1215, 636], [1222, 690], [1222, 746]], 2.2, INKD, 340);
  curve(o, [[1165, 660], [1166, 690], [1176, 712], [1196, 730], [1222, 748], [1262, 764], [1302, 776], [1340, 792]], 3, INKD, 341);
  // the underside of the forearm turns away from the screen: a grey band along the lower edge
  stroke(o, [[1180, 700], [1215, 728], [1262, 748], [1310, 762]], 18, "rgba(70,70,68,0.45)", 342, 0.5);
  curve(o, [[1187, 627], [1250, 640], [1300, 644], [1350, 648], [1400, 652], [1450, 648], [1500, 640]], 2.6, INKD, 342);
  curve(o, [[1168, 655], [1178, 634], [1187, 627]], 2.6, INKD, 343);
}
export const ARM_MASK = [(c) => poly(ARM_X)(c)];

// ---------------------------------------------------------------- chair rail
function paintChair(P) {
  const o = P.o;
  P.fill(poly(T.CHAIR), lin(1900, 946, 2206, 760, [[0, 0.52], [1, 0.36]]), -0.55, { spacing: 0.14 });
  const r = rng(381);
  for (let k = 0; k < 9; k++) {
    const f = (k + 0.5) / 9;
    const a = along([[1900, 946], [1990, 905], [2080, 855], [2150, 800], [2206, 752]], 5), b = along([[1985, 946], [2060, 905], [2140, 862], [2206, 818]], 5);
    const pts = a.map((p, i) => [p[0] + (b[i][0] - p[0]) * f, p[1] + (b[i][1] - p[1]) * f + (r() - 0.5) * 2]);
    curve(o, pts, 1.2 + r() * 1.6, "rgba(0,0,0,0.6)", 382 + k);
  }
  curve(o, [[1900, 946], [1990, 905], [2080, 855], [2150, 800], [2206, 752]], 2.4, "rgba(242,240,234,0.65)", 391);
  curve(o, [[1985, 946], [2060, 905], [2140, 862], [2206, 818]], 2.4, INKD, 392);
}

// ---------------------------------------------------------------- head
// hair down the back of the neck (right of the owl); the face and its hair are in face.js
export const HAIR_BACK = [[1655, 230], [1707, 267], [1747, 287], [1807, 293], [1860, 280], [1893, 253], [1910, 300], [1912, 380], [1908, 440], [1900, 468], [1882, 498], [1850, 514], [1810, 510], [1770, 506], [1742, 500], [1722, 488], [1712, 470], [1700, 400], [1680, 320]];

function strandsIn(o, shape, x0, y0, x1, y1, n, seed, { a = 0.8, wmax = 2.2, L0 = 60, L1 = 170, sweep = -14, color = INK } = {}) {
  const rr = rng(seed);
  o.save(); o.beginPath(); blob(shape)(o); o.clip();
  for (let i = 0; i < n; i++) {
    const f = rr(), sx = x0 + (x1 - x0) * f + (rr() - 0.5) * 20, sy = y0 + (y1 - y0) * f + (rr() - 0.5) * 16;
    const L = L0 + rr() * (L1 - L0), bend = (rr() - 0.5) * 24;
    const pts = [[sx, sy], [sx + sweep * 0.4 + bend * 0.3, sy + L * 0.45], [sx + sweep + bend, sy + L]];
    o.globalAlpha = a * (0.35 + rr() * 0.65);
    const w = wmax * (0.3 + rr() * 0.7);
    taper(o, sampleCurve(pts, 6), (u) => w * Math.pow(Math.sin(Math.PI * u), 0.7), color);
  }
  o.restore();
}

// under the owl (hidden at rest; shows during the settle, when the owl layer slides right of the figure): his neck
// in shadow below the jaw, and the top of his shoulder where the owl stands
const NECK = [[1400, 505], [1440, 494], [1480, 470], [1540, 462], [1620, 470], [1680, 500], [1712, 560], [1712, 610], [1600, 606], [1500, 604], [1462, 590], [1432, 556], [1410, 530]];
const SHOULDER = [[1440, 648], [1452, 616], [1500, 600], [1560, 602], [1620, 606], [1700, 592], [1712, 640], [1600, 646], [1500, 650]];
function paintHead(P) {
  const o = P.o;
  P.fill(poly(NECK), lin(1420, 500, 1560, 600, [[0, 0.1], [1, 0.04]]), 1.4, { style: 2 });
  P.fill(poly(SHOULDER), lin(1440, 600, 1700, 640, [[0, 0.8], [1, 0.66]]), -0.3, { style: 2 });
  curve(o, [[1452, 616], [1500, 600], [1560, 602], [1620, 606], [1700, 592]], 2.2, INKD, 441);
  // ---- hair down the back of the neck
  clearO(P, blob(HAIR_BACK));
  P.fill(blob(HAIR_BACK), 0.02, 1.4, { style: 2 });
  strandsIn(o, HAIR_BACK, 1700, 300, 1900, 420, 14, 422, { a: 0.25, wmax: 1.6 });
  strandsIn(o, HAIR_BACK, 1720, 420, 1890, 480, 20, 423, { a: 0.75, wmax: 2.2, L0: 40, L1: 90, sweep: -20 });
  // ragged dark tips of the hair hanging over the collar, a few lit
  { const rr = rng(424); for (let i = 0; i < 34; i++) { const x = 1722 + rr() * 170, y = 488 + rr() * 16, L = 18 + rr() * 50; taper(o, sampleCurve([[x, y - 6], [x - 3, y + L * 0.5], [x - 8 - rr() * 6, y + L]], 5), (u) => (2.2 + rr() * 1.5) * Math.pow(1 - u, 0.8), rr() < 0.25 ? "rgba(230,228,222,0.5)" : "#070707"); } }
  // ---- the face and the hair on the face side (s05/face.js)
  paintFace(P);
}

// the pencil between his teeth: a hexagonal stick (three facets: lit top, mid, grey lower) and a sharpened cone of
// pale wood with a dark graphite point. Edges from luminance runs on the source at 25.00 (x 1165–1330): top
// y = 440 - (x - 1240)/3, bottom y = 462 - (x - 1240)/3, facet lines ~6 and ~13 px below the top; the cone's base
// (scalloped) at x ~1203, its point at (1162, 475)
const PEN_TOP = (x) => 440 - (x - 1240) / 3, PEN_BOT = (x) => 462 - (x - 1240) / 3;
function paintPencil(P) {
  const o = P.o;
  const x0 = 1203, x1 = 1388;
  const body = [[x0, PEN_TOP(x0)], [x1, PEN_TOP(x1)], [x1, PEN_BOT(x1)], [x0, PEN_BOT(x0)]];
  const cone = [[x0, PEN_TOP(x0)], [1162, 475], [x0, PEN_BOT(x0)]];
  clearO(P, poly([[x0 - 2, PEN_TOP(x0) - 2], [x1, PEN_TOP(x1) - 2], [x1, PEN_BOT(x1) + 2], [x0 - 2, PEN_BOT(x0) + 2], [1158, 477]]));
  P.fill(poly(body), 0.62, -0.32, { style: 2 });
  // the three facets
  const f1 = (x) => PEN_TOP(x) + 6.5, f2 = (x) => PEN_TOP(x) + 13.5;
  P.fill(poly([[x0, PEN_TOP(x0)], [x1, PEN_TOP(x1)], [x1, f1(x1)], [x0, f1(x0)]]), 0.8, -0.32, { style: 2 });
  P.fill(poly([[x0, f2(x0)], [x1, f2(x1)], [x1, PEN_BOT(x1)], [x0, PEN_BOT(x0)]]), 0.46, -0.32, { style: 2 });
  line(o, [[x0, f1(x0)], [x1, f1(x1)]], 1.1, "rgba(30,30,30,0.7)", 470);
  line(o, [[x0, f2(x0)], [x1, f2(x1)]], 1.2, "rgba(30,30,30,0.8)", 474);
  line(o, [[x0, PEN_TOP(x0)], [x1, PEN_TOP(x1)]], 1.8, INKD, 471);
  line(o, [[x0, PEN_BOT(x0)], [x1, PEN_BOT(x1)]], 2.0, INKD, 472);
  // the sharpened cone: pale wood, scalloped base, dark graphite point
  P.fill(poly(cone), lin(1203, 460, 1162, 475, [[0, 0.86], [1, 0.74]]), -0.3, { style: 2 });
  o.fillStyle = "#101010"; o.beginPath(); o.moveTo(1162, 475); o.lineTo(1178, 467.5); o.lineTo(1180, 474.8); o.closePath(); o.fill();
  o.strokeStyle = "rgba(15,15,15,0.9)"; o.lineWidth = 1.5; o.lineJoin = "round";
  o.beginPath(); o.moveTo(x0, PEN_TOP(x0)); o.lineTo(1198, 457); o.lineTo(1204, 461); o.lineTo(1199, 466); o.lineTo(1205, 470); o.lineTo(x0, PEN_BOT(x0)); o.stroke();
  line(o, [[x0, PEN_TOP(x0)], [1162, 475], [x0, PEN_BOT(x0)]], 1.6, INKD, 473);
}

export function paintFigure(P) {
  paintChair(P);
  paintShirt(P);
  paintSleeveL(P);
  paintHead(P);
  paintBeanie(P);
  paintPencil(P);
  paintLips(P);
}
export const FIG_MASK = [
  (c) => poly(BACK)(c),
  (c) => poly(TORSO)(c),
  (c) => blob(T.S_SLEEVE_L)(c),
  (c) => poly(T.CHAIR)(c),
  (c) => blob(HAIR_BACK)(c),
  (c) => poly(NECK)(c),
  (c) => poly(SHOULDER)(c),
  ...FACE_MASK,
  ...BEANIE_MASK,
  (c) => poly([[1392, 390], [1203, 451], [1158, 477], [1203, 475], [1392, 413]])(c),
];
