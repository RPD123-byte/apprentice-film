// s01 figure: the designer seen from above and behind (white shirt, dark hood folds, knit beanie, black hair),
// his left hand on the keys, the chair back. The right hand is its own layer (hands.js).
// Plate coordinates (t=0 source frame). Silhouettes from per-row light/dark scans of the source
// (snapshots/s01-fix2-meas: arm edges every 10 px), folds from ridge maps (ridge.py -> r-armL.jpg, r-armR.jpg),
// the left hand from snapshots/s01-fix3-meas/z-lh-src.jpg. The beanie, hair and chair are in head.js.
import { INK, DARK, grey, rng, taper, poly, ell, lin, line, curve, stroke, sampleCurve } from "./kit.js";
import { Plate } from "./engrave.js";
import { HEAD, paintHead, paintHair, paintChair, CHAIR } from "./head.js";
import { FOLDS_L, FOLDS_R, BANDS_L, BANDS_R } from "./folds.js";
export { HEAD };

const PI = Math.PI;

// ---------- silhouettes ----------
// outer edges re-scanned per 10 px row on the source (first run of dark px outside the sleeve): the upper arms are
// 5-40 px fuller low down than the fix-2 trace (snapshots/s01-fix3-meas, scan in the fix-3 notes)
export const BODY = [
  [880, 858], [850, 850], [824, 850], [814, 842], [806, 832], [798, 822], [786, 812], [782, 802], [779, 792], [777, 782],
  [772, 772], [766, 762], [760, 752], [756, 742], [754, 732], [749, 722], [745, 712], [747, 700], [748, 688], [749, 674],
  [753, 660], [765, 648], [775, 637], [781, 625], [787, 612], [797, 598], [807, 585],
  [814, 572], [822, 552], [845, 522], [862, 505], [878, 492], [900, 487], [925, 489], [945, 497], [955, 508], [953, 522],
  [938, 537], [925, 556], [914, 569], [930, 567], [955, 566], [962, 560], [985, 538], [1020, 526], [1078, 520], [1110, 524],
  [1140, 538], [1160, 558], [1175, 577], [1186, 577], [1198, 575], [1210, 576], [1219, 577], [1221, 568], [1227, 556], [1237, 548], [1256, 541], [1276, 545], [1300, 566],
  [1328, 578], [1340, 588], [1353, 598], [1368, 607], [1380, 617], [1391, 628], [1403, 640], [1416, 651], [1428, 664],
  [1437, 677], [1446, 690], [1450, 705], [1449, 720], [1444, 730], [1441, 740], [1435, 750], [1430, 760], [1426, 770],
  [1422, 780], [1417, 790], [1407, 800], [1393, 810], [1384, 820], [1378, 830], [1370, 840], [1362, 848], [1340, 850],
  [1320, 856], [1260, 866], [1200, 878], [1150, 887], [1077, 892], [1000, 886], [940, 876], [900, 864],
];
const BI = (x, y) => BODY.findIndex((p) => p[0] === x && p[1] === y);
// traced at 5x (snapshots/s01-fix3-meas/z-lh-src.jpg, g-lh.jpg): the back of the hand up, fingers curled onto the keys
// pointing up and a little right; a gap between the index finger and the thumb shows the keys; the cuff covers the wrist
// fix pass 2r: re-traced at 6x (snapshots/s01-fix2r-meas/g-lh6.jpg): the fingers lean right and meet in a row of
// shallow notches along the top (tips at y 373-387), parted by dark separations running down-left; the index finger's
// underside and the thumb frame the gap onto the keys; the hand's left edge runs up from x ~882 at the cuff
export const LHAND = [
  [883, 491], [885, 468], [888, 450], [892, 435], [895, 415], [897.5, 403], [900, 398],
  [905, 395], [910, 393], [913, 396], [915, 394.5],
  [919, 389], [923, 385], [930, 381.5], [936, 380.5], [938, 380.5],
  [942, 378], [947, 376], [955, 373], [963, 372.5], [968, 374], [970, 377], [971, 380],
  [975, 384], [981, 382.5], [985, 383], [987.5, 386.5],
  [984.5, 390.5], [980, 394], [975, 401.5], [971.5, 410], [968.5, 423], [965, 436.5], [962.5, 450],
  [964.5, 452], [968, 442], [973, 432], [978, 425], [983, 421.5], [990, 420.5], [993, 422.5], [995.5, 425.5],
  [995.5, 432], [994, 440], [991.5, 448], [988, 457], [983, 467], [976.5, 475], [968, 483], [958, 490], [948, 495], [940, 500], [933, 508], [929, 513],
  [918, 504], [906, 495], [896, 491],
];

export const smoothOf = (pts) => (c) => { const q = sampleCurve(pts, 5, true); c.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) c.lineTo(q[i][0], q[i][1]); c.closePath(); };
const pathOf = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
export const LHAND_PATH = (c) => smoothOf(LHAND)(c);
// the figure layer's mask, as separate shapes (filled one by one so their windings never cancel)
export const FIG_MASKS = [
  (c) => { c.beginPath(); smoothOf(BODY)(c); },
  (c) => { c.beginPath(); c.ellipse(HEAD.x, HEAD.y, HEAD.rx + 1.4, HEAD.ry + 1.4, 0, 0, PI * 2); },
  (c) => { c.beginPath(); smoothOf(LHAND)(c); },
  (c) => { c.beginPath(); pathOf(CHAIR)(c); },
];

// ---------- the shirt ----------
// hood masses between the forearms and the head (measured per row: grey fabric, a black wedge where forearm,
// upper arm and hood meet), the elbow creases, fold strokes traced from the ridge maps
// hoods, re-measured per row/column on the source (fix pass 2b, snapshots/s01-fix2x-meas: gHL/gHR, scans): each a
// rounded grey pillow, hatched on its shaded side, with a thin black crevice against the forearm; right of the right
// hood a black pocket (columns 1270-1310: y 651-696 ... 693-699) inside a dark-grey crook of the arm
// fix pass 2r (4x grid g-hoodL.jpg): the hood's bottom is rounded (the back's fabric folds up over it); its left
// crevice is a solid black wedge widening downward (875-902 x 655-705), and a dark band runs between its right side
// and the head's contour
const HOOD_L = [[936, 584], [948, 586], [956, 592], [958, 604], [956, 625], [953, 648], [949, 672], [946, 692], [944, 706], [936, 716], [923, 722], [910, 720], [902, 711], [899, 695], [899, 670], [900, 640], [902, 615], [910, 596], [924, 587]];
const GAP_L = [[898, 598], [904, 606], [902, 630], [901, 655], [900, 690], [902, 710], [896, 716], [886, 712], [877, 700], [875, 682], [879, 662], [887, 638], [893, 614]];
const GAP_LR = [[954, 634], [957, 648], [955, 668], [951, 690], [947, 712], [941, 721], [938, 714], [942, 698], [945, 676], [948, 654]];
// black gaps between each forearm, the hood and the head (g-capL.jpg; the right one re-measured on gWr.jpg: y 577-596)
const CAP_L = [[912, 569], [930, 566], [976, 565], [986, 561], [978, 578], [968, 591], [958, 590], [940, 585], [926, 590], [914, 600], [905, 606], [902, 596], [907, 584]];
// fix pass 2r: the right one is an open wedge (no closed pill) that narrows to the right and runs into the hood's dark
// rim (c-wrist.jpg: 1185-1218 x 577-597, then along the hood's top edge to ~(1238,606))
const CAP_R = [[1184, 582], [1192, 577], [1204, 575.5], [1214, 576], [1220, 580], [1224, 588], [1229, 597], [1236, 606], [1244, 616], [1240, 620], [1231, 611], [1221, 603], [1210, 599], [1199, 597], [1189, 593]];
const HOOD_R = [[1199, 591], [1210, 594], [1220, 600], [1232, 609], [1244, 621], [1254, 633], [1264, 644], [1276, 651], [1286, 658], [1293, 668], [1296, 680], [1304, 690], [1313, 697], [1306, 705], [1296, 711], [1284, 717], [1270, 721], [1248, 722], [1226, 722], [1207, 720], [1203, 700], [1203, 660], [1201, 625]];
const POCKET_R = [[1262, 641], [1274, 646], [1286, 657], [1294, 672], [1303, 686], [1316, 697], [1308, 705], [1296, 711], [1283, 716], [1273, 715], [1268, 700], [1266, 672], [1263, 652]];
const ARM_L = [[756, 675], [758, 660], [775, 637], [787, 612], [807, 585], [822, 552], [845, 522], [862, 505], [900, 487], [945, 497], [953, 522], [927, 540], [905, 575], [890, 620], [882, 660], [884, 700], [890, 712], [860, 722], [820, 730], [775, 735], [765, 708]];
const ARM_R = [[1222, 562], [1256, 541], [1276, 545], [1300, 566], [1340, 588], [1380, 617], [1416, 651], [1437, 677], [1450, 705], [1440, 718], [1380, 718], [1330, 716], [1320, 700], [1300, 672], [1280, 648], [1256, 624], [1234, 604], [1222, 584]];

// soft grey on the cloth where it turns from the light: [polygon, darkness, blur px] (20 px block means of the source
// inside the sleeve mask: the upper arms' outer halves 115-175, the left elbow fold 185-200, the right elbow's outer
// side 160-200, the lower back beside the hair 185-215; the forearm tops stay near white, 240-250)
const SHADES = [
  [[[782, 742], [806, 736], [834, 756], [848, 792], [852, 846], [806, 848], [786, 806], [778, 770]], 0.34, 12],
  [[[760, 690], [776, 700], [790, 740], [784, 770], [766, 760], [758, 730]], 0.18, 10],
  [[[812, 618], [846, 620], [866, 646], [860, 668], [830, 664], [814, 642]], 0.16, 9],
  [[[882, 800], [940, 806], [950, 846], [884, 848]], 0.1, 12],
  [[[1308, 782], [1352, 772], [1384, 788], [1396, 846], [1322, 848]], 0.36, 12],
  [[[1296, 812], [1318, 800], [1330, 846], [1300, 848]], 0.18, 10],
  [[[1404, 700], [1440, 704], [1448, 736], [1424, 772], [1400, 762], [1392, 730]], 0.22, 10],
  [[[1200, 796], [1256, 800], [1262, 846], [1204, 848]], 0.14, 12],
  [[[1296, 650], [1330, 662], [1334, 690], [1312, 700], [1298, 682]], 0.14, 8],
  // the lower back just above the chair rail beside the hair (source 100-130 at x 980 and 1180, y 853-876)
  [[[944, 846], [1004, 852], [1006, 882], [946, 872]], 0.42, 6],
  [[[1150, 846], [1214, 840], [1226, 868], [1156, 884]], 0.42, 6],
];

function paintShirt(P) {
  const o = P.o, v = P.v;
  // the whole back, lit from the desk: white, a little greyer low down (flat: the texture is the brushwork below)
  P.fill(smoothOf(BODY), lin(0, 560, 0, 860, [[0, 0.97], [0.6, 0.95], [1, 0.9]]), PI / 2, { style: 2 });
  P.fill(smoothOf(ARM_L), lin(760, 700, 930, 510, [[0, 0.95], [0.5, 0.97], [1, 0.98]]), -0.95, { style: 2 });
  P.fill(smoothOf(ARM_R), lin(1440, 700, 1240, 560, [[0, 0.95], [0.5, 0.97], [1, 0.98]]), 0.66, { style: 2 });
  // soft shade on the undersides (value only, blurred so it falls off into the white)
  v.save(); v.beginPath(); smoothOf(BODY)(v); v.clip();
  for (const [pts, a, bl] of SHADES) { v.filter = `blur(${bl}px)`; v.fillStyle = `rgba(0,0,0,${a})`; v.beginPath(); smoothOf(pts)(v); v.fill(); }
  // soft grey bands brushed along the folds (measured, folds.js): value only, tapering at both ends
  v.filter = "blur(1.4px)"; v.lineCap = "round";
  for (const b of BANDS_L.concat(BANDS_R)) {
    const n = b.length / 4;
    for (let i = 0; i < n - 1; i++) {
      const u = (i + 0.5) / (n - 1), taperK = 0.35 + 0.65 * Math.pow(Math.sin(PI * u), 0.5);
      const val = (b[i * 4 + 3] + b[i * 4 + 7]) / 2;
      v.globalAlpha = 0.7; v.strokeStyle = grey(Math.min(1, (val + 8) / 255)); v.lineWidth = ((b[i * 4 + 2] + b[i * 4 + 6]) / 2) * taperK;
      v.beginPath(); v.moveTo(b[i * 4], b[i * 4 + 1]); v.lineTo(b[i * 4 + 4], b[i * 4 + 5]); v.stroke();
    }
  }
  v.globalAlpha = 1;
  v.filter = "none"; v.restore();

  // ---- hoods: grey knit pillows, engraved with fine lines (~3.6 px) running with the knit, darker toward the crevices
  P.fill(smoothOf(HOOD_L), lin(898, 0, 956, 0, [[0, 0.5], [0.4, 0.57], [0.75, 0.63], [1, 0.65]]), -0.92, { style: 2 });
  P.fill(smoothOf(HOOD_R), (g) => { const r = g.createLinearGradient(1205, 640, 1285, 690); r.addColorStop(0, grey(0.6)); r.addColorStop(0.45, grey(0.56)); r.addColorStop(0.8, grey(0.43)); r.addColorStop(1, grey(0.25)); return r; }, 0.42, { style: 2 });
  // soft knit mottling
  const r0 = rng(351);
  for (let i = 0; i < 26; i++) {
    const L = i < 12, cx = L ? 902 + r0() * 52 : 1206 + r0() * 70, cy = 592 + r0() * 124, rr = 5 + r0() * 9, a = 0.05 + r0() * 0.08, lite = r0() < 0.45;
    P.light(ell(cx, cy, rr, rr * 0.8, r0() * 3), (g) => { const gr = g.createRadialGradient(cx, cy, 0.5, cx, cy, rr); const c = lite ? "255,255,255" : "0,0,0"; gr.addColorStop(0, `rgba(${c},${a.toFixed(3)})`); gr.addColorStop(1, `rgba(${c},0)`); return gr; });
  }
  // the right hood's bottom falls into shadow; the crevices and the pocket are black with soft edges
  v.save(); v.beginPath(); smoothOf(HOOD_R)(v); v.clip(); v.filter = "blur(5px)"; v.fillStyle = "rgba(0,0,0,0.3)"; v.fillRect(1196, 704, 90, 30); v.restore();
  P.fill(smoothOf(CAP_L), 0.02, 0, { style: 2 });
  v.save(); v.filter = "blur(1.5px)"; v.fillStyle = grey(0.03); v.beginPath(); smoothOf(CAP_R)(v); v.fill(); v.restore();
  P.d.save(); P.d.beginPath(); smoothOf(CAP_R)(P.d); P.d.fillStyle = Plate.dirColor(0, 0.35, 2); P.d.fill(); P.d.restore();
  v.save(); v.filter = "blur(3.5px)"; v.fillStyle = grey(0.03);
  for (const q of [POCKET_R]) { v.beginPath(); smoothOf(q)(v); v.fill(); }
  v.restore();
  // the left crevices: solid black (a soft edge showed the white shirt through as a bright rim), 1 px softened
  v.save(); v.filter = "blur(0.8px)"; v.fillStyle = grey(0.015);
  for (const q of [GAP_L, GAP_LR]) { v.beginPath(); smoothOf(q)(v); v.fill(); }
  v.restore();
  for (const q of [GAP_LR]) { P.d.save(); P.d.beginPath(); smoothOf(q)(P.d); P.d.fillStyle = Plate.dirColor(1.5, 0.35, 2); P.d.fill(); P.d.restore(); }
  for (const q of [GAP_L, POCKET_R]) { P.d.save(); P.d.beginPath(); smoothOf(q)(P.d); P.d.fillStyle = Plate.dirColor(1.5, 0.35, 2); P.d.fill(); P.d.restore(); }
  // hatching (6x grids gHL/gHR6): a comb of parallel curved dark strokes ~3.8 px apart, each starting thick at the
  // crevice side and tapering out toward the lit side: the left hood's from its left edge up and to the right, the
  // right hood's from its edge by the pocket up and to the left, and flatter ones along its bottom
  const comb = (clip, edge, n, dir, len, bend, w, a, seed) => {
    const rh = rng(seed), q = sampleCurve(edge, 10);
    const cum = [0]; for (let i = 1; i < q.length; i++) cum.push(cum[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    const at = (d) => { let i = 1; while (i < q.length - 1 && cum[i] < d) i++; const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1); return [q[i - 1][0] + (q[i][0] - q[i - 1][0]) * f, q[i - 1][1] + (q[i][1] - q[i - 1][1]) * f]; };
    o.save(); o.beginPath(); smoothOf(clip)(o); o.clip();
    const ca = Math.cos(dir), sa = Math.sin(dir);
    for (let i = 0; i < n; i++) {
      const [bx, by] = at(cum[cum.length - 1] * (i + 0.3 + rh() * 0.4) / n);
      const L = len[0] + rh() * (len[1] - len[0]), pts = [];
      for (let k = 0; k <= 8; k++) { const u = k / 8, off = bend * Math.sin(PI * u); pts.push([bx + ca * L * u - sa * off, by + sa * L * u + ca * off]); }
      const ww = w * (0.8 + rh() * 0.4);
      taper(o, pts, (u) => ww * Math.min(1, u * 5 + 0.45) * (1 - Math.pow(u, 1.6)), `rgba(16,16,16,${(a * (0.85 + rh() * 0.2)).toFixed(2)})`);
    }
    o.restore();
  };
  comb(HOOD_L, [[905, 604], [903, 628], [902, 655], [901, 685], [903, 706], [910, 718]], 38, -0.92, [32, 56], 3.5, 2.8, 0.86, 1340);
  comb(HOOD_R, [[1242, 621], [1252, 633], [1261, 644], [1265, 662], [1265, 690], [1269, 714]], 32, PI + 0.42, [28, 48], -3.5, 2.8, 0.92, 1380);
  comb(HOOD_R, [[1208, 719], [1240, 721], [1268, 718]], 12, -0.3, [18, 32], -2, 1.7, 0.8, 1420);
  // the knit's grain: many short irregular ticks (dark and pale) over both hoods, no regular pattern
  {
    const rk = rng(1450);
    for (const [q, dir, n] of [[HOOD_L, -0.92, 520], [HOOD_R, 0.42, 620]]) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of q) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      o.save(); o.beginPath(); smoothOf(q)(o); o.clip(); o.beginPath(); o.rect(0, 0, 2206, 946); smoothOf(POCKET_R)(o); smoothOf(GAP_L)(o); o.clip("evenodd");
      for (let i = 0; i < n; i++) {
        const x = x0 + rk() * (x1 - x0), y = y0 + rk() * (y1 - y0), L = 2.5 + rk() * 4, a = dir + (rk() - 0.5) * 0.9, pale = rk() < 0.35;
        o.strokeStyle = pale ? `rgba(215,215,210,${(0.07 + rk() * 0.1).toFixed(2)})` : `rgba(12,12,12,${(0.22 + rk() * 0.3).toFixed(2)})`;
        o.lineWidth = 0.7 + rk() * 0.7; o.beginPath(); o.moveTo(x, y); o.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); o.stroke();
      }
      o.restore();
    }
  }
  // (fix pass 2r: the white rim stroke along the left hood is gone; the source's hood edge is dark)

  // ---- the cloth's folds, measured on the source (folds.js): grey brush strokes, pointed at both ends
  for (const f of FOLDS_L.concat(FOLDS_R)) {
    const [w, val] = f, pts = []; for (let i = 2; i < f.length; i += 2) pts.push([f[i], f[i + 1]]);
    if (pts.length < 2) continue;
    const g = Math.max(8, Math.round(val * 0.72 - 12));
    const q = pts.length > 2 ? sampleCurve(pts, 4) : pts;
    taper(o, q, (u) => 1.25 * w * (0.25 + 0.75 * Math.pow(Math.sin(PI * u), 0.55)), `rgba(${g},${g},${g},0.95)`);
  }

  // hood edges against the arms and the head
  curve(o, [[1216, 598], [1232, 609], [1244, 621], [1256, 634], [1268, 646], [1282, 654], [1292, 666], [1300, 684], [1314, 697]], 2.2, DARK, 474, { ends: 0.2 });
  curve(o, [[1207, 722], [1248, 724], [1272, 722], [1290, 715], [1312, 700]], 2, DARK, 475, { ends: 0.2 });
  curve(o, [[930, 520], [920, 550], [912, 572], [903, 592], [895, 606], [889, 625], [885, 650], [882, 680], [884, 706]], 2.2, DARK, 473, { ends: 0.2 });
  // the left hood's rounded bottom, and the back's fabric folding up over it (grey strokes, 900-960 x 715-740)
  curve(o, [[899, 704], [904, 715], [915, 722], [930, 724], [942, 718], [948, 708]], 2, DARK, 476, { ends: 0.2 });
  for (const [pts, w, g] of [[[[898, 736], [912, 726], [926, 721]], 2.6, 150], [[[906, 742], [922, 730], [940, 723]], 2.4, 140], [[[924, 744], [938, 732], [952, 722]], 2.2, 155], [[[940, 740], [950, 730], [958, 716]], 2, 145]])
    stroke(o, pts, w, `rgba(${g},${g},${g - 2},0.75)`, 1470 + pts[0][0], 0.45);
  // the right forearm's inner edge above the hood
  curve(o, [[1250, 542], [1236, 548], [1226, 558], [1220, 572], [1218, 588], [1214, 600]], 2.2, DARK, 477, { ends: 0.3 });
  // cuffs: the sleeve's hem crossing each wrist
  curve(o, [[880, 491], [897, 491], [906, 494], [918, 504], [929, 514], [935, 506], [946, 499], [957, 494]], 2.2, DARK, 460, { ends: 0.3 });
  curve(o, [[1218, 578], [1230, 555], [1244, 546], [1256, 541], [1272, 541], [1276, 548]], 2.2, DARK, 461, { ends: 0.3 });
  // outlines where the arms meet the dark floor (thin, mostly lost in the black)
  curve(o, BODY.slice(BI(850, 850), BI(822, 552) + 1), 2.4, DARK, 470, { ends: 0.2 });
  curve(o, BODY.slice(BI(1300, 566), BI(1340, 850) + 1), 2.4, DARK, 471, { ends: 0.2 });
}

// ---------- the left hand on the keys ----------
// Re-drawn in fix pass 2b from a 6x grid of the source (snapshots/s01-fix2x-meas/gLH.jpg): a slim, bony hand; each
// finger separated from the next by a dark line along its whole length (a dark wedge where the fingertips part,
// tapering back to the knuckles at y ~415-425), a thin grey-dark contour (1.3-1.9 px, not a black outline), knuckle
// bumps, 4 tendons fanning to the wrist, grey hatching down the outer side and above the cuff, a nail on the thumb.
function paintLeftHand(P) {
  const o = P.o;
  P.fill(smoothOf(LHAND), lin(900, 380, 980, 500, [[0, 0.99], [1, 0.96]]), 1.2, { style: 2 });
  P.light(smoothOf(LHAND), (g) => { const r = g.createLinearGradient(884, 0, 925, 0); r.addColorStop(0, "rgba(0,0,0,0.2)"); r.addColorStop(0.5, "rgba(0,0,0,0.08)"); r.addColorStop(1, "rgba(0,0,0,0)"); return r; });
  // soft grey over the knuckles and between the finger bases (the source's hand is inked, not a flat white glove)
  { const rs = rng(733); P.v.save(); P.v.beginPath(); smoothOf(LHAND)(P.v); P.v.clip(); P.v.filter = "blur(4px)";
    for (let i = 0; i < 14; i++) { const x = 896 + rs() * 64, y = 398 + rs() * 50, br = 4 + rs() * 7; P.v.fillStyle = `rgba(0,0,0,${(0.02 + rs() * 0.03).toFixed(3)})`; P.v.beginPath(); P.v.ellipse(x, y, br, br * 1.6, 0.35, 0, 7); P.v.fill(); }
    P.v.restore(); }
  P.light(smoothOf(LHAND), (g) => { const r = g.createLinearGradient(0, 470, 0, 505); r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(0,0,0,0.08)"); return r; });
  const r = rng(731);
  const INKH = (a) => `rgba(24,24,24,${a})`;
  // grey hatching: down the outer (little-finger) side, and dense above the cuff on the thumb side
  const gs = (pts, w, a, seed) => stroke(o, pts, w, `rgba(100,100,98,${Math.min(1, a * 1.3)})`, seed, 0.5);
  for (let i = 0; i < 16; i++) { const y = 425 + i * 4.8 + r() * 2.5, x = 888 + (y - 425) * -0.1 + r() * 2; gs([[x + 1, y], [x + 7 + r() * 7, y + 14 + r() * 8]], 0.8 + r() * 0.6, 0.35 + r() * 0.25, 740 + i); }
  for (let i = 0; i < 14; i++) { const x = 952 + i * 3 + r() * 2, y = 468 + r() * 10; gs([[x, y], [x - 5 - r() * 4, y + 12 + r() * 8]], 0.8 + r() * 0.5, 0.3 + r() * 0.25, 760 + i); }
  // finger separations: dark wedges where the fingertips part, running back to the knuckles
  const sep = (pts, w, seed) => { const q = sampleCurve(pts, 6); taper(o, q, (u) => w * Math.pow(1 - u, 0.7) + 0.35, INKH(0.95)); };
  // fix pass 2r: deeper, wider wedges (the source's curled fingers part in dark V's 3-5 px wide down to y ~415-425)
  sep([[914.5, 395], [911, 403], [908.5, 410], [906.5, 416]], 3.6, 701);
  sep([[937.5, 381], [934, 389], [931.5, 395], [928, 403], [925, 410], [922.5, 415]], 4.2, 702);
  sep([[970.5, 378.5], [964, 384], [958, 390], [952.5, 398], [948.5, 406], [945, 413]], 4.6, 703);
  // the index finger's underside running on into the edge of the palm beside the gap
  curve(o, [[986, 389], [980, 394], [975, 401.5], [971.5, 410], [968.5, 423], [965, 436.5], [963, 450]], 1.8, INKH(0.95), 704, { ends: 0.3 });
  // knuckles: short arcs across the finger bases (bumps), a crease at each middle joint
  const gr = (pts, w, a, seed) => stroke(o, pts, w, `rgba(70,70,68,${a})`, seed, 0.5);
  // second-knuckle bends (y ~400-410) and the knuckle row (y ~412-420), grey
  gr([[899, 418], [904, 414], [909, 415]], 1.3, 0.6, 711); gr([[914, 413], [920, 408], [926, 409]], 1.3, 0.62, 712);
  gr([[934, 408], [941, 403], [947, 404]], 1.3, 0.58, 713); gr([[952, 410], [958, 406], [963, 407]], 1.2, 0.52, 714);
  gr([[919, 398], [925, 395], [930, 396]], 1.1, 0.5, 715); gr([[944, 391], [951, 387], [957, 388]], 1.1, 0.5, 716); gr([[969, 393], [975, 390], [979, 391]], 1.0, 0.48, 717);
  gr([[903, 404], [908, 401]], 1.0, 0.45, 718);
  // tendons fanning back from the knuckles to the wrist
  const td = (pts, w, a, seed) => stroke(o, pts, w, `rgba(80,80,78,${Math.min(1, a * 1.5)})`, seed, 0.45, 8);
  td([[904, 424], [900, 444], [897, 466]], 1.1, 0.4, 719); td([[924, 418], [918, 442], [911, 468]], 1.3, 0.45, 720);
  td([[943, 418], [937, 444], [929, 470]], 1.3, 0.45, 721); td([[958, 421], [953, 445], [947, 470]], 1.2, 0.4, 722);
  td([[974, 452], [982, 440], [988, 430]], 1.0, 0.3, 723);
  // the back of the hand (fix pass 2r): 7 grey tendon strokes fanning from the knuckles toward the wrist and short
  // grey hatching across them (x 900-960, y 410-480; source ~0.75 in the strokes)
  for (const [pts, w, a] of [[[[907, 426], [903, 446], [900, 470]], 1.5, 0.55], [[[916, 424], [912, 446], [907, 472]], 1.3, 0.45], [[[927, 424], [921, 448], [914, 474]], 1.6, 0.55],
    [[[938, 424], [932, 448], [925, 474]], 1.3, 0.45], [[[948, 426], [942, 450], [935, 476]], 1.6, 0.55], [[[957, 428], [951, 452], [944, 478]], 1.2, 0.4], [[[963, 440], [958, 460], [952, 482]], 1.3, 0.45]])
    stroke(o, pts, w * 1.2, `rgba(90,90,88,${a})`, 770 + pts[0][0], 0.45, 8);
  { const rw = rng(785); for (let i = 0; i < 18; i++) { const x = 902 + rw() * 58, y = 398 + rw() * 26; stroke(o, [[x, y], [x - 2 + rw() * 2, y + 6 + rw() * 8]], 0.7 + rw() * 0.6, `rgba(95,95,93,${(0.25 + rw() * 0.3).toFixed(2)})`, 810 + i, 0.5); } }
  { const rh = rng(781); for (let i = 0; i < 26; i++) { const x = 898 + rh() * 60, y = 416 + rh() * 62; if (x > 962 && y < 450) continue; stroke(o, [[x, y], [x + 4 + rh() * 4, y + 2 + rh() * 3]], 0.8 + rh() * 0.7, `rgba(110,110,108,${(0.25 + rh() * 0.3).toFixed(2)})`, 790 + i, 0.5); } }
  // nails: the thumb's, and a sliver on the index tip
  o.save(); o.strokeStyle = "rgba(30,30,30,0.7)"; o.lineWidth = 0.9; o.fillStyle = "rgba(234,233,229,1)";
  o.beginPath(); o.ellipse(991, 425, 3.2, 2.3, 0.5, 0, PI * 2); o.fill(); o.stroke();
  o.beginPath(); o.ellipse(983, 386, 2.8, 1.7, -0.3, 0, PI * 2); o.fill(); o.stroke();
  o.restore();
  // contour: thin and grey-dark, a little heavier on the shadowed outer side, in pieces (the source's is broken)
  const q = LHAND.slice(0, LHAND.length - 3);
  const pieces = [[0, 8, 2.2], [7, 12, 2.1], [11, 17, 2.2], [16, 24, 2.3], [23, 28, 2.3], [27, 35, 1.8], [34, 43, 1.9], [42, q.length, 2.1]];
  for (const [i0, i1, w] of pieces) curve(o, q.slice(i0, i1), w, INKH(0.88), 720 + i0, { ends: 0.35, per: 5 });
  curve(o, [[872, 494], [884, 489.5], [897, 491], [906, 495], [918, 504], [929, 513], [934, 519]], 2.2, DARK, 723, { ends: 0.3 });
}

export function paintFigure(P) {
  paintShirt(P);
  paintHead(P);
  paintHair(P);
  paintLeftHand(P);
  paintChair(P);
}
