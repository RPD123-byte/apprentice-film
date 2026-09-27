// s25 v2 — fix pass 2: the heads of the chaos owls, drawn by code. The measured chaos drawings (s25/v2/data) lost the
// head: their light areas (≥ 400 px²) missed the small white pieces between the headphone band, the cups and the face,
// so the dark hull showed through as a grey "mop" over the crown and the face lines were unreadable. Each chaos
// drawing now gets a head kit painted over it, placed from landmarks read off 2–4x grid crops of its source key frame
// (drawing px = frame px of that key frame):
//   clear   : regions of the drawing that are not owl (the mop above / beside the head) — erased, the page shows
//   head    : the head plumage outline, painted white with a soft grey edge (covers the garbled face lines)
//   spikes  : the white crown feathers that poke up under the band [x0, y0, x1, y1, tipX, tipY]
//   band    : the headphone band (polyline) and its width; far: the far cup (mostly hidden behind the head)
//   cup     : the near cup = the standing owl's near cup (head.js nearCup) moved to centre c, scaled s = [sx, sy],
//             rotated rot, mirrored when flip (cushion toward the head on the other side)
//   face    : left-eye centre, right-eye centre, beak tip -> the standing face (brows, eyes, beak) through the affine
//             these three points define;  bandage: centre, scale, rotation of the standing bandage
//   scis    : scissors pairs held in the wings (the parametric model of scis.js), e.g. the V-sign (101.52–101.64)
import { gray } from "./draw.js";
import { bandage, brows, eyes, beak, nearCup, CUP_C } from "./head.js";
import { blitScissors } from "./scis.js";

const FL = [[1007, 455], [1116, 450], [1037, 515]], BC = [1030, 388];

// affine [a, b, c, d, e, f] (x' = a x + c y + e, y' = b x + d y + f) mapping three points onto three points
export function affine3(P, Q) {
  const [[x1, y1], [x2, y2], [x3, y3]] = P;
  const det = x1 * (y2 - y3) - y1 * (x2 - x3) + (x2 * y3 - x3 * y2);
  const solve = (v1, v2, v3) => [
    (v1 * (y2 - y3) - y1 * (v2 - v3) + (v2 * y3 - v3 * y2)) / det,
    (x1 * (v2 - v3) - v1 * (x2 - x3) + (x2 * v3 - x3 * v2)) / det,
    (x1 * (y2 * v3 - y3 * v2) - y1 * (x2 * v3 - x3 * v2) + v1 * (x2 * y3 - x3 * y2)) / det,
  ];
  const [a, c, e] = solve(Q[0][0], Q[1][0], Q[2][0]), [b, d, f] = solve(Q[0][1], Q[1][1], Q[2][1]);
  return [a, b, c, d, e, f];
}

function smoothClosed(g, p) {
  const n = p.length, mx = (i) => (p[i % n][0] + p[(i + 1) % n][0]) / 2, my = (i) => (p[i % n][1] + p[(i + 1) % n][1]) / 2;
  g.moveTo(mx(0), my(0));
  for (let i = 1; i <= n; i++) g.quadraticCurveTo(p[i % n][0], p[i % n][1], mx(i), my(i));
  g.closePath();
}
function smoothOpen(g, p) {
  g.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length - 1; i++) g.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
  g.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
}
function centroid(p) { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; }

export const CHEAD = {
  dive: {
    clear: [[[676, 288], [872, 288], [864, 352], [852, 380], [838, 367], [814, 351], [787, 340], [757, 335], [727, 338], [707, 348], [697, 364], [676, 360]]],
    head: [[708, 378], [724, 355], [757, 345], [790, 350], [815, 366], [834, 390], [845, 418], [846, 448], [838, 472], [822, 492], [798, 505], [768, 508], [740, 498], [720, 478], [707, 452], [703, 420]],
    band: [[705, 400], [709, 365], [727, 348], [755, 342], [786, 349], [814, 367], [836, 390], [850, 418], [855, 452]], bw: 6,
    far: [853, 430, 7, 26, 0.1],
    cup: { c: [704, 432], s: [0.6, 0.54], rot: -0.12, flip: true },
    face: [[773, 452], [820, 448], [808, 485]], bandage: { c: [766, 398], s: 0.55, rot: 0.05 },
  },
  hov: {
    clear: [[[948, 286], [1000, 318], [1018, 307], [1050, 301], [1078, 305], [1097, 318], [1110, 340], [1118, 372], [1150, 372], [1150, 250], [1070, 250], [1062, 286], [1000, 286], [990, 300], [970, 300], [948, 286]]],
    head: [[972, 355], [995, 343], [1030, 338], [1065, 340], [1088, 352], [1098, 372], [1098, 402], [1090, 430], [1074, 452], [1048, 466], [1014, 468], [990, 458], [972, 437], [962, 410], [960, 385], [964, 366]],
    spikes: [[1022, 344, 1033, 342, 1028, 312], [1040, 342, 1052, 341, 1049, 309], [1058, 342, 1069, 344, 1071, 312]],
    band: [[993, 333], [1004, 318], [1020, 309], [1049, 304], [1076, 308], [1095, 321], [1107, 344], [1111, 376]], bw: 5,
    cup: { c: [1105, 407], s: [0.54, 0.5], rot: -0.05, flip: false },
    face: [[997, 401], [1038, 405], [1003, 428]], bandage: { c: [1005, 363], s: 0.46, rot: -0.1 },
  },
  hov2: {
    clear: [[[975, 350], [990, 334], [1010, 329], [1030, 324], [1060, 322], [1085, 330], [1100, 350], [1108, 376], [1160, 376], [1160, 300], [1060, 300], [1000, 318], [980, 330], [975, 350]]],
    head: [[982, 368], [998, 352], [1030, 347], [1062, 347], [1086, 356], [1096, 378], [1096, 406], [1090, 432], [1076, 452], [1050, 467], [1016, 469], [992, 459], [977, 440], [972, 412], [974, 386]],
    spikes: [[1025, 350, 1036, 349, 1034, 328], [1041, 349, 1052, 349, 1052, 325], [1057, 349, 1068, 351, 1071, 328]],
    band: [[988, 360], [998, 341], [1025, 327], [1059, 323], [1083, 330], [1100, 352], [1107, 378]], bw: 5,
    cup: { c: [1117, 413], s: [0.58, 0.55], rot: -0.05, flip: false },
    face: [[994, 427], [1047, 428], [1011, 459]], bandage: { c: [1007, 381], s: 0.53, rot: -0.05 },
  },
  vs2: {
    clear: [[[1850, 700], [1862, 690], [1880, 675], [1905, 667], [1934, 662], [1962, 668], [1983, 686], [1993, 712], [2060, 712], [2060, 620], [1850, 620], [1850, 700]]],
    head: [[1864, 718], [1880, 703], [1910, 698], [1945, 698], [1972, 706], [1982, 728], [1982, 760], [1976, 788], [1955, 802], [1918, 806], [1888, 800], [1866, 786], [1856, 758], [1857, 734]],
    spikes: [[1906, 700, 1916, 700, 1912, 674], [1921, 699, 1931, 699, 1930, 670], [1936, 699, 1946, 700, 1948, 672]],
    band: [[1861, 727], [1866, 704], [1880, 684], [1900, 670], [1934, 663], [1965, 670], [1984, 688], [1993, 716]], bw: 6,
    far: [1860, 745, 6, 22, 0.12],
    cup: { c: [1994, 755], s: [0.53, 0.55], rot: 0.0, flip: false },
    face: [[1884, 762], [1925, 761], [1900, 794]], bandage: { c: [1895, 720], s: 0.52, rot: 0 },
    // the V-sign: a pair held upright in each wing, blades open (3x grid crops of 102.60): left pivot (1760, 705), tips
    // (1737, 642) (1775, 643), rings round (1740, 747) (1770, 743); right pivot (2095, 698), tips (2072, 638) (2100, 635)
    scis: [{ P: [1760, 705], a: [-1.92, -1.33], s: 0.43, m: -1, rd: [-6, 4] }, { P: [2095, 698], a: [-1.94, -1.49], s: 0.42, m: -1, rd: [-4, 6] }],
  },
  vs3: {
    clear: [[[1785, 722], [1800, 706], [1830, 694], [1862, 690], [1893, 699], [1910, 720], [1990, 720], [1990, 660], [1780, 660], [1780, 722]]],
    head: [[1792, 740], [1808, 728], [1840, 724], [1875, 724], [1897, 732], [1902, 760], [1898, 795], [1884, 822], [1858, 836], [1826, 836], [1800, 822], [1786, 796], [1782, 766]],
    spikes: [[1826, 726, 1836, 726, 1833, 702], [1841, 725, 1851, 725, 1851, 699], [1856, 725, 1866, 726, 1869, 702]],
    band: [[1787, 744], [1792, 724], [1806, 710], [1829, 697], [1862, 692], [1892, 701], [1908, 722], [1912, 732]], bw: 6,
    cup: { c: [1917, 755], s: [0.52, 0.5], rot: 0.02, flip: false },
    face: [[1814, 803], [1860, 785], [1844, 825]], bandage: { c: [1821, 761], s: 0.48, rot: -0.25 },
  },
  dash84: {
    clear: [[[1532, 646], [1549, 628], [1584, 618], [1615, 624], [1636, 645], [1690, 645], [1690, 600], [1530, 600]]],
    head: [[1500, 668], [1526, 654], [1560, 645], [1598, 645], [1626, 656], [1640, 680], [1636, 708], [1618, 732], [1590, 748], [1556, 752], [1522, 744], [1500, 722], [1490, 695]],
    band: [[1528, 652], [1540, 634], [1562, 622], [1592, 619], [1618, 626], [1636, 644], [1642, 658]], bw: 5,
    cup: { c: [1654, 674], s: [0.5, 0.42], rot: 0.15, flip: false },
    face: [[1564, 720], [1602, 704], [1578, 745]], bandage: { c: [1570, 679], s: 0.45, rot: -0.35 },
  },
  eTR: {
    clear: [[[1650, 147], [1660, 133], [1685, 126], [1711, 127], [1725, 142], [1731, 160], [1795, 160], [1795, 72], [1650, 72]]],
    head: [[1651, 160], [1664, 148], [1690, 144], [1714, 147], [1724, 164], [1722, 190], [1712, 208], [1690, 215], [1668, 212], [1654, 200], [1648, 180]],
    spikes: [[1672, 146, 1680, 146, 1676, 128], [1684, 145, 1692, 145, 1692, 124], [1696, 145, 1704, 146, 1707, 127]],
    band: [[1651, 152], [1661, 134], [1685, 127], [1711, 128], [1725, 143], [1731, 162]], bw: 4,
    cup: { c: [1731, 182], s: [0.36, 0.37], rot: -0.05, flip: false },
    face: [[1664, 185], [1692, 184], [1673, 212]], bandage: { c: [1668, 165], s: 0.3, rot: 0 },
  },
  // the pop (103.00; drawing = frame 2576): only the face is redrawn (the band and cups of the drawing hold); a wink
  pop: {
    head: [[968, 420], [985, 382], [1020, 362], [1070, 357], [1120, 362], [1158, 380], [1176, 410], [1178, 460], [1170, 500], [1150, 524], [1100, 538], [1040, 540], [996, 528], [972, 504], [962, 465]],
    face: [[1007, 457], [1104, 451], [1039, 506]], wink: true, bandage: { c: [1032, 391], s: 0.9, rot: 0 },
    cup: { c: [1222, 438], s: [0.95, 1.2], rot: 0, flip: false },
  },
  eSt: {
    head: [[222, 608], [240, 598], [262, 598], [282, 606], [292, 624], [292, 650], [284, 668], [266, 678], [244, 678], [228, 668], [218, 648], [216, 626]],
    band: [[210, 626], [216, 606], [236, 592], [264, 590], [286, 602], [296, 624]], bw: 4,
    cup: { c: [207, 630], s: [0.3, 0.32], rot: 0.05, flip: true },
    face: [[246, 641], [275, 638], [263, 662]], bandage: { c: [266, 620], s: 0.3, rot: 0 },
  },
};

// paint the head kit of drawing `key` onto g (drawing px)
export function chaosHead(g, key) {
  const K = CHEAD[key];
  if (!K) return;
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  if (K.clear) {
    g.save(); g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000";
    for (const p of K.clear) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (const q of p.slice(1)) g.lineTo(q[0], q[1]); g.closePath(); g.fill(); }
    g.restore();
  }
  if (K.far) { const [x, y, rx, ry, v] = K.far; g.fillStyle = gray(v); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
  if (K.band) {
    g.strokeStyle = gray(0.08); g.lineWidth = K.bw * 1.3; g.beginPath(); smoothOpen(g, K.band); g.stroke();
    g.strokeStyle = gray(0.4, 0.8); g.lineWidth = Math.max(0.8, K.bw * 0.2); g.beginPath(); smoothOpen(g, K.band.map(([x, y]) => [x, y + K.bw * 0.22])); g.stroke();
  }
  // head plumage: white, darkening softly toward its edge, a soft grey edge line
  const [cx, cy] = centroid(K.head);
  let R = 0; for (const [x, y] of K.head) R = Math.max(R, Math.hypot(x - cx, y - cy));
  const gr = g.createRadialGradient(cx - R * 0.15, cy - R * 0.2, R * 0.1, cx, cy, R * 1.05);
  gr.addColorStop(0, gray(0.95)); gr.addColorStop(0.7, gray(0.91)); gr.addColorStop(1, gray(0.8));
  g.fillStyle = gr; g.beginPath(); smoothClosed(g, K.head); g.fill();
  // (the edge line fades out toward the neck, where the head runs into the body)
  const eg = g.createLinearGradient(0, cy - R, 0, cy + R * 0.55);
  eg.addColorStop(0, gray(0.28, 0.75)); eg.addColorStop(0.6, gray(0.3, 0.45)); eg.addColorStop(1, gray(0.3, 0));
  g.strokeStyle = eg; g.lineWidth = Math.max(1, R / 45); g.beginPath(); smoothClosed(g, K.head); g.stroke();
  for (const [x0, y0, x1, y1, tx, ty] of K.spikes || []) {
    g.fillStyle = gray(0.9); g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + tx) / 2 - 1, (y0 + ty) / 2, tx, ty); g.quadraticCurveTo((x1 + tx) / 2 + 1, (y1 + ty) / 2, x1, y1); g.closePath(); g.fill();
    g.strokeStyle = gray(0.3, 0.7); g.lineWidth = 0.9; g.stroke();
  }
  // face: the standing brows, eyes and beak through the landmark affine
  const m = affine3(FL, K.face);
  g.save(); g.transform(...m); brows(g);
  if (K.wink) {
    // left eye shut, right eye open (the split runs between the eyes, in the standing face's px)
    g.save(); g.beginPath(); g.rect(900, 380, 160, 120); g.clip(); eyes(g, "shut"); g.restore();
    g.save(); g.beginPath(); g.rect(1060, 380, 140, 120); g.clip(); eyes(g, "sly"); g.restore();
  } else eyes(g, "sly");
  beak(g); g.restore();
  if (K.bandage) {
    const { c, s, rot } = K.bandage;
    g.save(); g.translate(c[0], c[1]); g.rotate(rot); g.scale(s, s); g.translate(-BC[0], -BC[1]); bandage(g); g.restore();
  }
  if (K.cup) {
    const { c, s, rot, flip } = K.cup;
    g.save(); g.translate(c[0], c[1]); g.rotate(rot); g.scale(s[0] * (flip ? -1 : 1), s[1]); g.translate(-CUP_C[0], -CUP_C[1]); nearCup(g); g.restore();
  }
  for (const pl of K.scis || []) blitScissors(g, pl);
  g.restore();
}
