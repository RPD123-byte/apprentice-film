// s05 figure: the designer seen over his right shoulder — the knit beanie, black hair, his face in lost profile with
// the pencil between his teeth, the sweatshirt (a pale sleeve reaching for the trackpad, a screentoned back),
// the left sleeve coming in at the bottom, and the chair's bentwood rail.
import { INK, grey, rng, noise1, noise2, taper, poly, blob, ell, lin, rad, line, curve, stroke, inside, along, clearO, sampleCurve, smoothPath, PI } from "./kit.js";
import * as T from "./trace.js";
import { paintFace, FACE_MASK } from "./face.js";
import { paintBeanie, BEANIE_MASK } from "./beanie.js";

const INKD = "#0b0b0b";

// ---------------------------------------------------------------- sweatshirt
// the back of the sweatshirt below the collar and the upper arm (shoulder under the owl)
const BACK = [[1540, 640], [1560, 632], [1620, 620], [1700, 590], [1760, 588], [1830, 560], [1880, 520], [1900, 470], [1950, 473], [1985, 493], [2017, 533], [2043, 599], [2063, 666], [2077, 746], [2080, 826], [2082, 960], [1575, 960], [1556, 860], [1540, 780], [1550, 720], [1530, 690], [1515, 660]];
// the lit side of his torso below the arm (no screentone in the source)
const TORSO = [[1305, 778], [1340, 730], [1380, 706], [1430, 694], [1480, 690], [1520, 692], [1550, 720], [1540, 780], [1556, 860], [1575, 960], [1235, 960], [1270, 890], [1300, 840], [1330, 800]];
const ARM = [[1187, 627], [1250, 640], [1300, 644], [1350, 648], [1400, 652], [1450, 648], [1500, 640], [1470, 665], [1447, 690], [1420, 720], [1390, 760], [1353, 795], [1327, 781], [1273, 774], [1220, 772], [1193, 764], [1172, 745], [1163, 700], [1168, 655]];
const CUFF_R = [[1187, 627], [1215, 636], [1222, 690], [1222, 748], [1196, 730], [1176, 712], [1163, 680], [1168, 650]];

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

function paintShirt(P) {
  const o = P.o;
  // back: mid grey, a touch lighter toward the lit shoulder
  P.fill(poly(BACK), lin(1500, 600, 1900, 960, [[0, 0.7], [0.5, 0.62], [1, 0.54]]), 1.2, { style: 2 });
  dots(o, poly(BACK), 3.4, 0.85, "rgba(20,20,20,0.4)");
  // lit torso side: pale, with grey form strokes running up toward the shoulder
  P.fill(poly(TORSO), lin(1300, 950, 1540, 700, [[0, 0.58], [0.5, 0.6], [1, 0.66]]), -0.9, { style: 2 });
  {
    const rt = rng(307);
    o.save(); o.beginPath(); poly(TORSO)(o); o.clip();
    for (let i = 0; i < 60; i++) {
      const x = 1260 + rt() * 300, y = 720 + rt() * 240, L = 40 + rt() * 90;
      stroke(o, [[x, y], [x + L * 0.45, y - L * 0.7]], 3 + rt() * 6, `rgba(70,70,68,${(0.25 + 0.25 * rt()).toFixed(2)})`, 700 + i, 0.4);
    }
    for (let i = 0; i < 40; i++) {
      const x = 1280 + rt() * 280, y = 740 + rt() * 220, L = 20 + rt() * 50;
      stroke(o, [[x, y], [x + L * 0.4, y - L * 0.8]], 1.2 + rt(), `rgba(20,20,20,${(0.3 + 0.3 * rt()).toFixed(2)})`, 760 + i, 0.5);
    }
    o.restore();
  }
  curve(o, [[1300, 780], [1340, 730], [1380, 706], [1430, 694], [1480, 690], [1520, 694], [1550, 716]], 3.4, INKD, 357);   // under the arm
  curve(o, [[1236, 950], [1270, 890], [1300, 840], [1330, 800], [1350, 790]], 3, INKD, 358);                              // his side
  curve(o, [[1552, 718], [1542, 780], [1556, 860], [1572, 950]], 1.6, "rgba(20,20,20,0.6)", 359);
  // back seams and folds
  curve(o, [[1395, 890], [1500, 855], [1620, 815], [1760, 758], [1880, 700], [2000, 646], [2070, 616]], 2.2, "rgba(15,15,15,0.85)", 345);
  curve(o, [[1880, 710], [1905, 760], [1925, 830], [1935, 900], [1940, 960]], 2.4, "rgba(15,15,15,0.8)", 346);
  curve(o, [[1965, 660], [1985, 720], [2005, 800], [2020, 880]], 2, "rgba(15,15,15,0.7)", 347);
  curve(o, [[1560, 700], [1580, 760], [1596, 830], [1606, 900], [1612, 960]], 1.8, "rgba(15,15,15,0.55)", 348);
  curve(o, [[1480, 760], [1500, 820], [1512, 900]], 1.6, "rgba(15,15,15,0.5)", 349);
  const r = rng(301);
  for (let i = 0; i < 26; i++) {
    const x = 1300 + r() * 760, y = 700 + r() * 240;
    if (!inside(BACK, x, y)) continue;
    stroke(o, [[x, y], [x + 8 + r() * 10, y + 40 + r() * 40], [x + 14 + r() * 16, y + 90 + r() * 60]], 4 + r() * 8, "rgba(60,60,60,0.25)", 360 + i, 0.4);
  }
  // shoulder edge: lit rim against the dark
  curve(o, [[1900, 468], [1950, 475], [1985, 495], [2017, 533], [2043, 599], [2063, 666], [2077, 746], [2080, 826], [2082, 950]], 3.2, INKD, 350);
  curve(o, [[1905, 474], [1948, 481], [1980, 500], [2010, 537]], 3, "rgba(242,240,234,0.9)", 351);
  curve(o, [[1725, 600], [1787, 590], [1850, 560], [1882, 535], [1898, 490], [1902, 466]], 3, INKD, 352);
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
  P.fill(poly(T.CHAIR), lin(1900, 946, 2206, 760, [[0, 0.45], [1, 0.3]]), -0.55, { spacing: 0.14 });
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
// hair on his left of the face and over the brow; hair down the back of the neck (right of the owl)
export const HAIR_FRONT = [[1244, 180], [1246, 90], [1270, 40], [1300, 80], [1325, 113], [1353, 147], [1387, 180], [1420, 200], [1460, 213], [1470, 262], [1452, 300], [1436, 276], [1414, 258], [1390, 250], [1365, 240], [1340, 236], [1318, 238], [1312, 262], [1304, 290], [1292, 300], [1272, 268], [1254, 234]];
export const HAIR_BACK = [[1655, 230], [1707, 267], [1747, 287], [1807, 293], [1860, 280], [1893, 253], [1910, 300], [1912, 380], [1908, 440], [1900, 468], [1885, 520], [1850, 560], [1790, 590], [1735, 605], [1725, 560], [1715, 480], [1700, 400], [1680, 320]];
export const FACE = [[1318, 238], [1340, 236], [1365, 240], [1390, 250], [1414, 258], [1436, 276], [1446, 330], [1450, 400], [1455, 470], [1456, 526], [1400, 522], [1390, 500], [1380, 480], [1370, 453], [1360, 427], [1362, 415], [1378, 407], [1360, 398], [1348, 386], [1340, 368], [1326, 352], [1308, 342], [1295, 333], [1289, 322], [1294, 308], [1303, 298], [1310, 282], [1315, 260]];

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

function paintHead(P) {
  const o = P.o;
  // ---- hair down the back of the neck
  clearO(P, blob(HAIR_BACK));
  P.fill(blob(HAIR_BACK), 0.02, 1.4, { style: 2 });
  strandsIn(o, HAIR_BACK, 1700, 300, 1900, 420, 14, 422, { a: 0.25, wmax: 1.6 });
  strandsIn(o, HAIR_BACK, 1720, 450, 1890, 530, 46, 423, { a: 0.85, wmax: 2.6, L0: 40, L1: 110, sweep: -20 });
  // ---- the face and the hair on the face side (s05/face.js)
  paintFace(P);
}

function paintPencil(P) {
  const o = P.o;
  const top = [[1383, 398], [1204, 454]], bot = [[1387, 417], [1208, 471]];
  clearO(P, poly([top[0], top[1], [1167, 471], bot[1], bot[0]]));
  P.fill(poly([top[0], top[1], bot[1], bot[0]]), 0.56, -0.3, { style: 2 });
  line(o, [[1384, 404], [1206, 460]], 1.2, "rgba(40,40,40,0.6)", 470);
  line(o, top, 2, INKD, 471); line(o, bot, 2.2, INKD, 472);
  P.fill(poly([[1204, 454], [1167, 471], [1208, 471]]), 0.9, -0.3, { style: 2 });
  o.fillStyle = "#101010"; o.beginPath(); o.moveTo(1167, 471); o.lineTo(1182, 464); o.lineTo(1184, 471); o.closePath(); o.fill();
  line(o, [[1204, 454], [1167, 471], [1208, 471]], 1.8, INKD, 473);
  o.strokeStyle = "rgba(20,20,20,0.7)"; o.lineWidth = 1.2;
  o.beginPath(); o.moveTo(1204, 454); o.quadraticCurveTo(1200, 462, 1208, 471); o.stroke();
}

export function paintFigure(P) {
  paintChair(P);
  paintShirt(P);
  paintSleeveL(P);
  paintHead(P);
  paintBeanie(P);
  paintPencil(P);
}
export const FIG_MASK = [
  (c) => poly(BACK)(c),
  (c) => poly(TORSO)(c),
  (c) => blob(T.S_SLEEVE_L)(c),
  (c) => poly(T.CHAIR)(c),
  (c) => blob(HAIR_BACK)(c),
  ...FACE_MASK,
  ...BEANIE_MASK,
  (c) => poly([[1383, 396], [1204, 452], [1165, 472], [1208, 473], [1388, 419]])(c),
];
