// s01 figure: the designer seen from above and behind (white shirt, dark hood folds, knit beanie, black hair),
// his left hand on the keys, the chair back. The right hand is its own layer (hands.js).
// Plate coordinates (t=0 source frame). Silhouettes from per-row light/dark scans of the source
// (snapshots/s01-fix2-meas: arm edges every 10 px), folds from ridge maps (ridge.py -> r-armL.jpg, r-armR.jpg),
// the head from z-head.jpg, the left hand from r-lh.jpg / z-lh.jpg.
import { INK, DARK, grey, rng, taper, poly, ell, lin, line, curve, stroke, sampleCurve } from "./kit.js";

const PI = Math.PI;

// ---------- silhouettes ----------
export const BODY = [
  [870, 852], [856, 829], [838, 815], [820, 806], [811, 792], [799, 777], [789, 765], [779, 754], [773, 740], [769, 725],
  [765, 708], [757, 695], [756, 675], [758, 660], [765, 648], [775, 637], [781, 625], [787, 612], [797, 598], [807, 585],
  [814, 572], [822, 552], [845, 522], [862, 505], [878, 492], [900, 487], [925, 489], [945, 497], [955, 508], [953, 522],
  [938, 537], [925, 556], [912, 576], [930, 572], [955, 570], [960, 560], [985, 538], [1020, 526], [1078, 520], [1135, 526],
  [1172, 540], [1196, 568], [1205, 580], [1218, 570], [1222, 562], [1236, 549], [1256, 541], [1276, 545], [1300, 566],
  [1328, 578], [1340, 588], [1353, 598], [1368, 607], [1380, 617], [1391, 628], [1403, 640], [1416, 651], [1428, 664],
  [1437, 677], [1446, 690], [1450, 705], [1447, 718], [1441, 729], [1435, 741], [1428, 752], [1420, 764], [1410, 777],
  [1398, 790], [1384, 803], [1366, 816], [1346, 829], [1318, 852], [1200, 861], [1078, 865], [960, 861],
];
export const HEAD = { x: 1077, y: 677, rx: 129, ry: 157 };
const CROWN = [1077, 618];
export const LHAND = [
  [883, 494], [883, 470], [884, 442], [886, 421], [890, 406], [896, 396], [904, 391], [911, 392], [915, 398], [917, 414],
  [919, 398], [923, 383], [929, 374], [936, 370], [941, 373], [943, 381], [945, 398], [947, 380], [951, 369], [958, 364],
  [965, 365], [969, 370], [968, 379], [967, 398], [970, 386], [976, 379], [984, 379], [989, 384], [988, 393], [981, 404],
  [976, 415], [985, 415], [995, 417], [1003, 422], [1004, 432], [998, 441], [993, 451], [985, 465], [976, 477], [966, 489],
  [955, 497], [940, 504], [920, 506], [900, 503],
];
export const CHAIR = [[804, 848], [1380, 834], [1382, 872], [1360, 880], [1352, 946], [838, 946], [826, 884], [804, 876]];

export const smoothOf = (pts) => (c) => { const q = sampleCurve(pts, 5, true); c.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) c.lineTo(q[i][0], q[i][1]); c.closePath(); };
const pathOf = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
// the figure layer's mask, as separate shapes (filled one by one so their windings never cancel)
export const FIG_MASKS = [
  (c) => { c.beginPath(); smoothOf(BODY)(c); },
  (c) => { c.beginPath(); c.ellipse(HEAD.x, HEAD.y, HEAD.rx + 2.5, HEAD.ry + 2.5, 0, 0, PI * 2); },
  (c) => { c.beginPath(); smoothOf(LHAND)(c); },
  (c) => { c.beginPath(); pathOf(CHAIR)(c); },
];

// ---------- the shirt ----------
// hood masses between the forearms and the head (measured per row: grey fabric, a black wedge where forearm,
// upper arm and hood meet), the elbow creases, fold strokes traced from the ridge maps
const HOOD_L = [[905, 585], [928, 578], [948, 583], [950, 620], [947, 660], [950, 700], [953, 714], [925, 717], [903, 714], [902, 680], [903, 640], [906, 600]];
const WEDGE_L = [[886, 622], [897, 600], [904, 610], [902, 650], [901, 690], [898, 712], [888, 710], [884, 690], [884, 655]];
const HOOD_R = [[1204, 590], [1222, 583], [1234, 605], [1258, 625], [1276, 641], [1286, 656], [1270, 664], [1268, 690], [1276, 712], [1250, 722], [1208, 722], [1203, 690], [1206, 650], [1205, 615]];
const WEDGE_R = [[1272, 664], [1286, 660], [1297, 670], [1312, 688], [1318, 700], [1308, 710], [1292, 713], [1278, 708], [1273, 690]];
const ARM_L = [[756, 675], [758, 660], [775, 637], [787, 612], [807, 585], [822, 552], [845, 522], [862, 505], [900, 487], [945, 497], [953, 522], [927, 540], [905, 575], [890, 620], [882, 660], [884, 700], [890, 712], [860, 722], [820, 730], [775, 735], [765, 708]];
const ARM_R = [[1222, 562], [1256, 541], [1276, 545], [1300, 566], [1340, 588], [1380, 617], [1416, 651], [1437, 677], [1450, 705], [1440, 718], [1380, 718], [1330, 716], [1320, 700], [1300, 672], [1280, 648], [1256, 624], [1234, 604], [1222, 584]];

function paintShirt(P) {
  const o = P.o;
  // the whole back, lit from the desk: white, a little greyer low down (flat: the texture is the brushwork below)
  P.fill(smoothOf(BODY), lin(0, 560, 0, 860, [[0, 0.97], [0.6, 0.95], [1, 0.88]]), PI / 2, { style: 2 });
  P.fill(smoothOf(ARM_L), lin(760, 700, 930, 510, [[0, 0.93], [0.5, 0.97], [1, 0.98]]), -0.95, { style: 2 });
  P.fill(smoothOf(ARM_R), lin(1440, 700, 1240, 560, [[0, 0.93], [0.5, 0.97], [1, 0.98]]), 0.66, { style: 2 });
  // hatched shade along the outer edges of the arms (engraved lines running along the arm)
  const band = (edge, inset, v, ang, seed) => {
    const inner = edge.map(([x, y], i) => { const a = edge[Math.max(0, i - 1)], b = edge[Math.min(edge.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [x - (dy / L) * inset, y + (dx / L) * inset]; });
    P.fill(poly(edge.concat(inner.slice().reverse())), v, ang, { spacing: 0.28 });
  };
  band([[822, 552], [814, 572], [807, 585], [797, 598], [787, 612], [781, 625], [775, 637], [765, 648], [758, 660], [756, 675], [757, 695]], -16, lin(758, 0, 780, 0, [[0, 0.72], [1, 0.95]]), -1.1, 1);
  band([[757, 695], [765, 708], [769, 725], [773, 740], [779, 754], [789, 765], [799, 777], [811, 792], [820, 806], [838, 815]], -16, lin(765, 0, 792, 0, [[0, 0.72], [1, 0.95]]), 1.35, 2);
  band([[1300, 566], [1328, 578], [1353, 598], [1380, 617], [1403, 640], [1428, 664], [1446, 690], [1450, 705]], 16, lin(1450, 0, 1420, 0, [[0, 0.72], [1, 0.95]]), 0.7, 3);
  band([[1450, 705], [1447, 718], [1435, 741], [1420, 764], [1398, 790], [1384, 803], [1366, 816], [1346, 829]], 16, lin(1450, 0, 1415, 0, [[0, 0.72], [1, 0.95]]), 1.9, 4);
  // soft shade on the lower back either side of the nape
  P.light(ell(1000, 800, 80, 50), (g) => { const r = g.createRadialGradient(1000, 800, 5, 1000, 800, 80); r.addColorStop(0, "rgba(0,0,0,0.2)"); r.addColorStop(1, "rgba(0,0,0,0)"); return r; });
  P.light(ell(1160, 800, 80, 50), (g) => { const r = g.createRadialGradient(1160, 800, 5, 1160, 800, 80); r.addColorStop(0, "rgba(0,0,0,0.2)"); r.addColorStop(1, "rgba(0,0,0,0)"); return r; });

  // the hood masses: smooth mid-grey fabric (a rounded pillow each side), dark curved hatching on the shaded side
  P.fill(smoothOf(HOOD_L), lin(0, 580, 0, 716, [[0, 0.5], [0.5, 0.48], [1, 0.42]]), 1.2, { style: 2 });
  P.fill(smoothOf(HOOD_R), lin(1212, 605, 1292, 708, [[0, 0.58], [0.35, 0.5], [0.65, 0.3], [1, 0.12]]), 1.95, { style: 2 });
  const r0 = rng(351);
  for (const [cx, cy, rx, ry] of [[918, 612, 14, 22], [930, 690, 16, 14], [912, 655, 10, 22], [1222, 640, 14, 22], [1250, 692, 18, 14], [1215, 700, 12, 12], [1232, 612, 10, 12], [940, 620, 8, 16]]) {
    const a = 0.1 + r0() * 0.14, lighter = r0() < 0.4;
    P.light(ell(cx, cy, rx, ry, r0() * 3), (g) => { const r = g.createRadialGradient(cx, cy, 1, cx, cy, Math.max(rx, ry)); const c = lighter ? "255,255,255" : "0,0,0"; r.addColorStop(0, `rgba(${c},${a.toFixed(2)})`); r.addColorStop(1, `rgba(${c},0)`); return r; });
  }
  P.fill(smoothOf(WEDGE_L), 0.02, 1.5, { style: 2 });
  // where forearm, upper arm and hood meet: a soft black pocket (no hard-edged hole)
  P.fill(smoothOf(WEDGE_R), (g) => { const r = g.createRadialGradient(1298, 694, 2, 1294, 690, 32); r.addColorStop(0, grey(0.02)); r.addColorStop(0.7, grey(0.05)); r.addColorStop(1, grey(0.14)); return r; }, 1.5, { style: 2 });
  // hatching: curved dark strokes rising up-right, on the left half of the left hood and the lower right of the right one
  {
    const rh = rng(333);
    const hatchIn = (x0, x1, y0, y1, n, a0, curl, seed) => {
      for (let i = 0; i < n; i++) {
        const x = x0 + rh() * (x1 - x0), y = y0 + ((i + rh()) / n) * (y1 - y0), L = 16 + rh() * 26, a = a0 + (rh() - 0.5) * 0.3;
        const mx = x + Math.cos(a) * L * 0.5 + Math.sin(a) * curl, my = y + Math.sin(a) * L * 0.5 - Math.cos(a) * curl;
        stroke(o, [[x, y], [mx, my], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 1.3 + rh() * 1.3, `rgba(12,12,12,${(0.6 + rh() * 0.3).toFixed(2)})`, seed + i, 0.55);
      }
    };
    o.save(); o.beginPath(); smoothOf(HOOD_L)(o); o.clip();
    hatchIn(898, 935, 596, 718, 34, -1.0, 4, 1340);
    o.restore();
    o.save(); o.beginPath(); smoothOf(HOOD_R)(o); o.clip();
    hatchIn(1226, 1272, 628, 724, 32, -1.1, 4, 1380);
    hatchIn(1206, 1240, 600, 660, 10, -1.2, 3, 1420);
    o.restore();
  }

  // fabric texture on the sleeves: light grey brush strokes along the arm, bunched toward the outer edge
  const sleeve = (c0, c1, half, outer, n, seed, g0 = 110, g1 = 170) => {
    const rr = rng(seed), ax = c1[0] - c0[0], ay = c1[1] - c0[1], L = Math.hypot(ax, ay), ux = ax / L, uy = ay / L, nx = -uy * outer, ny = ux * outer;
    for (let i = 0; i < n; i++) {
      const t = 0.05 + rr() * 0.95, side = Math.pow(rr(), 0.7) * 2 - 1;
      const px = c0[0] + ax * t + nx * side * half, py = c0[1] + ay * t + ny * side * half;
      const len = 14 + rr() * 40, bend = (rr() - 0.5) * 6, a = (rr() - 0.5) * 0.35;
      const dx = ux * Math.cos(a) - uy * Math.sin(a), dy = uy * Math.cos(a) + ux * Math.sin(a);
      const g = Math.round(g0 + rr() * (g1 - g0)), al = (0.3 + rr() * 0.4) * (0.65 + 0.35 * Math.max(0, side));
      stroke(o, [[px - dx * len / 2, py - dy * len / 2], [px + nx * bend / half, py + ny * bend / half], [px + dx * len / 2, py + dy * len / 2]], 0.8 + rr() * 1.6, `rgba(${g},${g},${g - 2},${al.toFixed(2)})`, seed + i, 0.4);
    }
  };
  sleeve([905, 515], [768, 690], 42, 1, 120, 310, 90, 160);
  sleeve([1250, 565], [1440, 700], 45, -1, 120, 410, 90, 160);
  sleeve([790, 730], [840, 845], 45, 1, 70, 510, 100, 170);
  sleeve([1420, 730], [1360, 845], 50, -1, 70, 560, 100, 170);
  sleeve([1230, 740], [1300, 845], 45, 1, 26, 590, 130, 180);
  sleeve([930, 740], [880, 845], 40, -1, 20, 620, 130, 180);

  // dark inked fold lines (traced from the ridge maps): elbow creases, forearm undersides, the upper arms
  const fold = (pts, w, seed, a = 0.85) => stroke(o, pts, w, `rgba(16,16,16,${a})`, seed, 0.45, 7);
  const R = [
    // right elbow and forearm
    [[[1347, 655], [1360, 651], [1372, 649]], 2.4], [[[1366, 662], [1392, 658], [1413, 668], [1418, 673]], 3.2],
    [[[1353, 678], [1380, 674], [1402, 683]], 2.8], [[[1383, 686], [1402, 690], [1420, 696]], 2.6], [[[1371, 701], [1385, 706], [1398, 713]], 2.2],
    [[[1340, 659], [1332, 672], [1320, 700]], 2.6], [[[1303, 715], [1318, 716], [1334, 717]], 2.4], [[[1312, 717], [1336, 727], [1350, 738]], 2.6],
    [[[1341, 720], [1357, 731], [1370, 747]], 2.4], [[[1300, 600], [1322, 612], [1345, 628]], 1.8], [[[1262, 580], [1285, 588], [1305, 598]], 1.6],
    [[[1330, 640], [1352, 636], [1374, 640]], 1.8],
    // right upper arm
    [[[1316, 744], [1333, 774], [1340, 803]], 2.4], [[[1385, 768], [1380, 798], [1367, 835]], 2.6], [[[1403, 774], [1399, 791], [1388, 810]], 2.2],
    [[[1273, 803], [1290, 797], [1312, 793]], 2], [[[1222, 810], [1237, 813], [1252, 808]], 1.8], [[[1312, 792], [1322, 788], [1329, 779]], 1.8],
    // left elbow and forearm
    [[[808, 622], [826, 626], [846, 635]], 2.4], [[[851, 626], [858, 634], [863, 643]], 2], [[[816, 649], [831, 654], [842, 660]], 2.2],
    [[[778, 659], [802, 642], [818, 638], [846, 653], [856, 667]], 3], [[[824, 671], [841, 675], [858, 683]], 2.4], [[[767, 674], [790, 662], [809, 656], [836, 658]], 2.8],
    [[[766, 685], [778, 673], [795, 663]], 2.2], [[[780, 637], [792, 633], [802, 630]], 1.8], [[[790, 564], [804, 566], [815, 562]], 1.8],
    [[[882, 566], [884, 590], [893, 616]], 2.2], [[[866, 707], [877, 708], [888, 708]], 2.6], [[[820, 725], [845, 717], [868, 709]], 2.4],
    [[[853, 734], [866, 728], [879, 723]], 2.2], [[[840, 761], [850, 748], [872, 728]], 2.2], [[[811, 760], [815, 745], [819, 732]], 1.8],
    [[[842, 590], [862, 600], [878, 612]], 1.6],
    // left upper arm
    [[[766, 715], [767, 735], [767, 754]], 2], [[[784, 740], [783, 765], [788, 783]], 2.2], [[[771, 745], [774, 758], [776, 771]], 1.8],
    [[[836, 768], [828, 798], [832, 823]], 2.2], [[[814, 800], [822, 822], [828, 845]], 2], [[[800, 788], [808, 814], [820, 841]], 1.8], [[[785, 809], [792, 818], [802, 825]], 1.6],
  ];
  R.forEach(([pts, w], i) => fold(pts, w, 450 + i));
  // hood edges against the arms and the head
  curve(o, [[1222, 583], [1234, 605], [1258, 625], [1282, 645], [1297, 665], [1318, 685], [1326, 698]], 2.4, DARK, 474, { ends: 0.2 });
  curve(o, [[1208, 722], [1250, 721], [1290, 717], [1320, 712]], 2.2, DARK, 475, { ends: 0.2 });
  curve(o, [[927, 540], [912, 562], [903, 593], [892, 627], [883, 657], [880, 683], [888, 705]], 2.4, DARK, 473, { ends: 0.2 });
  curve(o, [[885, 712], [915, 716], [950, 716]], 2.2, DARK, 476, { ends: 0.2 });
  // cuffs: the sleeve's hem crossing each wrist
  curve(o, [[880, 491], [897, 491], [906, 494], [918, 504], [929, 514], [935, 506], [946, 499], [957, 494]], 2.2, DARK, 460, { ends: 0.3 });
  curve(o, [[1218, 578], [1230, 555], [1244, 546], [1256, 541], [1272, 541], [1276, 548]], 2.2, DARK, 461, { ends: 0.3 });
  // outlines where the arms meet the dark floor (thin, mostly lost in the black)
  curve(o, BODY.slice(0, 22), 2.2, DARK, 470, { ends: 0.2 });
  curve(o, BODY.slice(48), 2.2, DARK, 471, { ends: 0.2 });
}

// ---------- the head: knit beanie from above, crown at (1077,618) ----------
// Source (z-head.jpg): a white rim inside the dark contour across the top; dark ribs of uneven length and weight
// radiating from the crown over light-grey knit; lower down the ribs run as meridians crossed by knit rows,
// darker and mottled; the bottom (the folded cuff) nearly black; spiky black hair at the nape.
function paintHead(P) {
  const o = P.o, { x: cx, y: cy, rx, ry } = HEAD;
  const [kx, ky] = CROWN;
  const onHead = (x, y, k = 1) => ((x - cx) / (rx * k)) ** 2 + ((y - cy) / (ry * k)) ** 2 < 1;
  P.fill(ell(cx, cy, rx, ry), (g) => {
    const r = g.createLinearGradient(0, cy - ry, 0, cy + ry);
    for (const [y, v] of [[520, 0.6], [580, 0.56], [640, 0.58], [700, 0.56], [750, 0.44], [790, 0.32], [812, 0.22], [834, 0.14]]) r.addColorStop((y - (cy - ry)) / (2 * ry), grey(v));
    return r;
  }, 0, { style: 2 });
  // mottled darker patches, mostly lower left
  const rb = rng(512);
  for (const [bx, by, br, a] of [[1010, 720, 40, 0.26], [1035, 760, 34, 0.22], [990, 680, 26, 0.2], [1120, 745, 30, 0.16], [1060, 700, 24, 0.14]]) {
    P.light(ell(bx, by, br, br * 0.8, rb()), (g) => { const r = g.createRadialGradient(bx, by, 2, bx, by, br); r.addColorStop(0, `rgba(0,0,0,${a})`); r.addColorStop(1, "rgba(0,0,0,0)"); return r; });
  }
  const r = rng(501);
  const rimAt = (a) => { let t = 0, x = kx, y = ky; while (onHead(x, y, 0.985) && t < 420) { t += 1.5; x = kx + Math.cos(a) * t; y = ky + Math.sin(a) * t; } return t; };
  o.save();
  o.beginPath(); o.ellipse(cx, cy, rx - 1.5, ry - 1.5, 0, 0, PI * 2); o.clip();
  // white rim across the top (lit by the lamp and the screen), fading out down the sides
  o.save();
  o.beginPath(); o.ellipse(cx, cy, rx - 1.5, ry - 1.5, 0, 0, PI * 2); o.ellipse(cx, cy + 14, rx - 12, ry - 13, 0, 0, PI * 2, true); o.clip("evenodd");
  const wr = o.createLinearGradient(0, cy - ry, 0, cy - 10);
  wr.addColorStop(0, "rgba(248,247,243,1)"); wr.addColorStop(0.55, "rgba(248,247,243,0.9)"); wr.addColorStop(1, "rgba(248,247,243,0)");
  o.fillStyle = wr; o.fillRect(cx - rx, cy - ry, rx * 2, ry);
  o.restore();
  // knit rows: curved courses round the crown in the lower part (they cross the ribs into a grid), broken into
  // runs of a few stitches, darker and closer toward the cuff
  for (let k = 0; k < 20; k++) {
    const d = 84 + k * 6.3 + (r() - 0.5) * 2;
    let a = 0.28 + r() * 0.06;
    while (a < PI - 0.28) {
      const run = 0.06 + r() * 0.16, a1 = Math.min(PI - 0.28, a + run);
      const pts = [];
      for (let aa = a; aa <= a1 + 1e-6; aa += 0.02) { const t = rimAt(aa); if (d > t - 3) break; pts.push([kx + Math.cos(aa) * d, ky + Math.sin(aa) * d * 1.02 + (r() - 0.5) * 0.6]); }
      if (pts.length > 2) { o.globalAlpha = Math.min(0.9, 0.35 + r() * 0.25 + k * 0.022); taper(o, pts, (u) => (1.3 + r() * 0.5) * (0.4 + 0.6 * Math.sin(PI * u)), "#0b0b0b"); }
      a = a1 + 0.015 + r() * 0.05;
    }
  }
  o.globalAlpha = 1;
  // ribs: tapered dark lines from the crown, uneven in length and weight; some broken; fine over the lit top.
  // Half start at the crown, half further out (the knit's decreases), so the spacing stays ~5 px out to the rim.
  const rimW = (a) => (Math.sin(a) < 0 ? 14 * Math.pow(-Math.sin(a), 1.5) : 0);
  for (let i = 0; i < 228; i++) {
    const a = -PI + (i / 228) * PI * 2 + (r() - 0.5) * 0.06;
    const t = rimAt(a), sa = Math.sin(a), k = Math.max(0, Math.min(1, (sa + 0.7) / 1.2)), kk = k * k * (3 - 2 * k);
    const s0 = i % 2 ? 44 + r() * (sa > 0 ? 70 : 40) : 9 + r() * 28;
    const s1 = (t - rimW(a) * (0.7 + r() * 0.6)) * (sa < -0.3 ? 0.8 + r() * 0.28 : 0.9 + r() * 0.12);
    if (s1 - s0 < 10) continue;
    const w = (0.8 + 1.0 * kk) * (0.6 + r() * 0.8);
    const al = (0.6 + 0.35 * kk) * (0.75 + r() * 0.25);
    const segs = r() < 0.15 ? [[0, 0.42 + r() * 0.15], [0.6 + r() * 0.1, 1]] : [[0, 1]];
    for (const [u0, u1] of segs) {
      const pts = [];
      for (let j = 0; j <= 12; j++) {
        const s = s0 + (s1 - s0) * (u0 + ((u1 - u0) * j) / 12), bend = Math.sin((s / t) * PI) * 13 * Math.cos(a) * kk;
        pts.push([kx + Math.cos(a) * s + bend, ky + sa * s]);
      }
      taper(o, pts, (u) => w * (0.2 + 0.8 * Math.pow(Math.sin(PI * Math.min(1, 0.08 + u * 0.92)), 0.5)), `rgba(8,8,8,${al.toFixed(2)})`);
    }
  }
  // fine knit texture between the ribs: short dark ticks along the rib direction, denser lower down
  for (let i = 0; i < 900; i++) {
    const a = -PI + r() * PI * 2, t = rimAt(a), sd = 20 + r() * (t - 26);
    const sa = Math.sin(a), k = Math.max(0, Math.min(1, (sa + 0.7) / 1.2));
    if (r() > 0.35 + 0.65 * k) continue;
    const x = kx + Math.cos(a) * sd, y = ky + sa * sd, L = 3 + r() * 5;
    o.globalAlpha = 0.25 + r() * 0.35;
    taper(o, [[x, y], [x + Math.cos(a) * L, y + sa * L]], (u) => 1.1 * Math.sin(PI * u), "#0c0c0c");
  }
  o.globalAlpha = 1;
  // short dark hairs of the knit round the lit rim
  for (let i = 0; i < 80; i++) {
    const a = -PI + 0.12 + r() * (PI - 0.24), t = rimAt(a), s0 = t - 6 - r() * 24, L = 5 + r() * 14;
    const p0 = [kx + Math.cos(a) * s0, ky + Math.sin(a) * s0], p1 = [kx + Math.cos(a + (r() - 0.5) * 0.05) * (s0 + L), ky + Math.sin(a) * (s0 + L)];
    taper(o, [p0, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], p1], (u) => (0.9 + r() * 0.8) * Math.sin(PI * u), "rgba(20,20,20,0.7)");
  }
  // the folded cuff: below a curved fold line, a darker band of vertical ribs down to the edge (z-head.jpg)
  const foldY = (x) => 772 - 50 * ((x - cx) / rx) ** 2;
  const foldPts = []; for (let x = cx - rx; x <= cx + rx + 0.1; x += 6) foldPts.push([x, foldY(x)]);
  o.beginPath(); o.moveTo(foldPts[0][0], foldPts[0][1]); for (const p of foldPts) o.lineTo(p[0], p[1]);
  o.lineTo(cx + rx, cy + ry + 5); o.lineTo(cx - rx, cy + ry + 5); o.closePath();
  const cg = o.createLinearGradient(0, 730, 0, 834); cg.addColorStop(0, "rgba(104,104,101,0.97)"); cg.addColorStop(1, "rgba(58,58,56,0.98)");
  o.fillStyle = cg; o.fill();
  for (let x = cx - rx; x < cx + rx; x += 4.4 + r() * 1.2) {
    const yt = foldY(x) + 2, yb = 842;
    taper(o, [[x, yt], [x + 0.2, (yt + yb) / 2], [x + 0.4, yb]], (u) => (1.2 + r() * 0.5) * (0.5 + 0.5 * Math.sin(PI * u)), `rgba(5,5,5,${(0.6 + r() * 0.25).toFixed(2)})`);
    taper(o, [[x + 2.2, yt + 3], [x + 2.4, yb - 8]], (u) => 0.9 * Math.sin(PI * u), `rgba(160,160,156,${(0.14 + r() * 0.2).toFixed(2)})`);
  }
  curve(o, foldPts.map(([x, y]) => [x, y - 2.2]), 1.3, "rgba(205,205,200,0.45)", 522, { ends: 0.2 });
  curve(o, foldPts, 2.4, "rgba(8,8,8,0.95)", 523, { ends: 0.2 });
  o.restore();
  // contour
  o.save(); o.strokeStyle = DARK; o.lineWidth = 3.4; o.beginPath(); o.ellipse(cx, cy, rx, ry, 0, 0, PI * 2); o.stroke(); o.restore();
}

// ---------- hair: a black spiky mass at the nape under the cuff, a few tufts at the sides ----------
function paintHair(P) {
  const o = P.o;
  const r = rng(601);
  // everything here sits behind the beanie: clip the head out
  o.save();
  o.beginPath(); o.rect(900, 700, 360, 240); o.ellipse(HEAD.x, HEAD.y, HEAD.rx - 1, HEAD.ry - 1, 0, 0, PI * 2); o.clip("evenodd");
  o.save();
  o.fillStyle = "#040404";
  o.beginPath(); o.moveTo(988, 812); o.quadraticCurveTo(1078, 858, 1168, 812); o.lineTo(1163, 842); o.quadraticCurveTo(1078, 868, 993, 842); o.closePath(); o.fill();
  o.restore();
  const spike = (x, y, a, L, w, seed) => {
    const rr = rng(seed), b = a + (rr() - 0.5) * 0.3;
    const p1 = [x + Math.cos(a) * L * 0.5 + (rr() - 0.5) * 3, y + Math.sin(a) * L * 0.5], p2 = [x + Math.cos(b) * L, y + Math.sin(b) * L];
    taper(o, [[x, y], p1, p2], (u) => w * Math.pow(1 - u, 0.85), "#040404");
  };
  // nape: a fan of long overlapping spikes pointing down and out over the collar
  for (let i = 0; i < 58; i++) {
    const t = (i + r() * 0.8) / 58, x = 980 + t * 196, y = 822 + Math.sin(t * PI) * 18 + r() * 6;
    const a = PI / 2 + (t - 0.5) * 1.5 + (r() - 0.5) * 0.4;
    spike(x, y, a, 18 + r() * 34 * (0.6 + 0.4 * Math.sin(t * PI)), 4.5 + r() * 4.5, 610 + i);
  }
  o.restore();
}

// ---------- the left hand on the keys (traced: r-lh.jpg) ----------
function paintLeftHand(P) {
  const o = P.o;
  P.fill(smoothOf(LHAND), lin(890, 380, 990, 500, [[0, 0.99], [1, 0.94]]), 1.2, { style: 2 });
  P.light(smoothOf(LHAND), (g) => { const r = g.createLinearGradient(890, 0, 905, 0); r.addColorStop(0, "rgba(0,0,0,0.14)"); r.addColorStop(1, "rgba(0,0,0,0)"); return r; });
  // the web between the index finger and the thumb: a dark wedge
  o.save(); o.fillStyle = "#0b0b0b";
  o.beginPath(); o.moveTo(972, 414); o.quadraticCurveTo(972, 436, 962, 456); o.quadraticCurveTo(961, 432, 966, 416); o.closePath(); o.fill();
  o.restore();
  // finger separations running back from the notches
  curve(o, [[917, 412], [914, 424], [911, 438]], 1.9, DARK, 701, { ends: 0.15 });
  curve(o, [[945, 396], [941, 410], [935, 426], [931, 438]], 2, DARK, 702, { ends: 0.15 });
  curve(o, [[967, 396], [962, 410], [956, 424], [952, 436]], 1.9, DARK, 703, { ends: 0.15 });
  curve(o, [[896, 430], [904, 416], [911, 395]], 1.6, DARK, 704, { ends: 0.3 });
  // the thumb's inner edge
  curve(o, [[976, 426], [981, 422], [990, 419]], 1.4, DARK, 705, { ends: 0.3 });
  // nails
  o.save(); o.strokeStyle = "rgba(15,15,15,0.9)"; o.lineWidth = 1.1; o.fillStyle = "rgba(230,229,225,1)";
  for (const [x, y, a] of [[904, 396, -0.4], [933, 376, -0.3], [959, 369, -0.2], [981, 385, 0.2], [996, 426, 1.1]]) { o.beginPath(); o.ellipse(x, y, 4.8, 3, a, 0, PI * 2); o.fill(); o.stroke(); }
  o.restore();
  // knuckle creases and tendons toward the wrist
  const gr = (pts, w, a, seed) => stroke(o, pts, w, `rgba(80,80,78,${a})`, seed, 0.5);
  gr([[905, 418], [910, 416]], 1.2, 0.7, 711); gr([[925, 412], [931, 410]], 1.2, 0.7, 712); gr([[946, 410], [951, 410]], 1.2, 0.65, 713); gr([[967, 415], [971, 417]], 1.1, 0.6, 714);
  gr([[908, 440], [904, 458], [900, 478]], 1.4, 0.5, 715); gr([[928, 438], [923, 458], [920, 478]], 1.4, 0.5, 716); gr([[948, 438], [944, 456], [940, 474]], 1.3, 0.45, 717);
  gr([[912, 462], [915, 480]], 1.1, 0.35, 718); gr([[938, 470], [946, 486]], 1.1, 0.35, 719);
  curve(o, LHAND.slice(0, 40), 2.2, DARK, 720, { ends: 0.4 });
}

// ---------- chair ----------
// The back rail seen from above: a dark rounded frame with a thin lit rim along its top edge, over a dark mesh.
function paintChair(P) {
  const o = P.o;
  // the rail (measured: lit top edge 846 at the ends, ~857 at the centre; ~36 px of dark frame below it)
  const top = [[814, 850], [860, 853], [950, 858], [1030, 862], [1100, 863], [1200, 861], [1300, 855], [1368, 849]];
  const bot = top.map(([x, y]) => [x + (x < 1090 ? 3 : -3), y + 36]);
  const band = (A, B) => (c) => { const a = sampleCurve(A, 6), b = sampleCurve(B, 6).reverse(); c.moveTo(a[0][0], a[0][1]); for (const p of a.slice(1)) c.lineTo(p[0], p[1]); for (const p of b) c.lineTo(p[0], p[1]); c.closePath(); };
  // mesh back below the rail: dark, fine vertical lines catching a little light
  P.fill(poly([[826, 880], [1362, 876], [1352, 946], [838, 946]]), 0.1, PI / 2 + 0.02, { spacing: 0.2 });
  const r = rng(901);
  o.save(); o.globalAlpha = 0.3;
  for (let x = 845; x < 1350; x += 6 + r() * 4) line(o, [[x, 905], [x + (x - 1090) * 0.05, 946]], 0.9, "rgba(150,150,146,0.8)", 902 + Math.round(x));
  o.restore();
  // the rail: a dark rounded frame, only its upper edge lit
  P.fill(band(top, bot), lin(0, 846, 0, 894, [[0, 0.2], [0.4, 0.1], [1, 0.03]]), -0.02, { spacing: 0.24 });
  curve(o, top.map(([x, y]) => [x, y + 1.6]), 2.4, "rgba(242,240,234,0.95)", 910, { ends: 0.3 });
  curve(o, top.map(([x, y]) => [x, y + 5]), 1.2, "rgba(242,240,234,0.35)", 912, { ends: 0.3 });
  curve(o, top.map(([x, y]) => [x, y - 0.8]), 1.4, DARK, 911, { ends: 0.3 });
  // rounded ends
  for (const [x, y, a] of [[818, 864, 0.3], [1362, 862, -0.3]]) {
    P.fill(ell(x, y, 12, 18, a), 0.12, 0.3, { spacing: 0.3 });
    o.save(); o.globalAlpha = 0.85; o.strokeStyle = "rgba(240,238,232,0.9)"; o.lineWidth = 1.4; o.beginPath(); o.ellipse(x, y, 12, 18, a, PI * 1.1, PI * 1.75); o.stroke(); o.restore();
  }
}

export function paintFigure(P) {
  paintShirt(P);
  paintHead(P);
  paintHair(P);
  paintLeftHand(P);
  paintChair(P);
}
