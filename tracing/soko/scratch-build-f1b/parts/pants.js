// an engraved region whose lines follow an angle field ang(x, y) (slowly varying)
const fieldCoord = (angF) => (x, y) => { const a = angF(x, y), c = Math.cos(a), s = Math.sin(a); return [-s * x + c * y, c * x + s * y]; };

// The trousers: baggy grey cargo trousers, long lit fold ridges and black creases, painted on a value study and
// engraved with short strokes that follow the folds. Measured at 2x (50 s).
function pants(g) {
  const legs = [
    { pts: [[935, 548], [1044, 548], [1052, 580], [1058, 620], [1062, 660], [1063, 700], [1060, 740], [1062, 772], [1040, 784], [990, 782], [948, 776], [940, 745], [932, 700], [928, 650], [930, 600]],
      box: [920, 545, 1070, 790], seed: 1500,
      hi: [[[936, 580], [950, 620], [968, 660], [990, 700], [1006, 722]], [[960, 562], [978, 600], [1000, 640], [1016, 670], [1026, 695]], [[980, 618], [1000, 652], [1020, 690], [1045, 730]],
        [[940, 688], [958, 708], [978, 730]], [[1030, 575], [1040, 610], [1048, 650]], [[955, 752], [990, 748], [1030, 758], [1052, 766]], [[1012, 560], [1022, 590], [1030, 620]]],
      lo: [[[928, 598], [931, 650], [936, 720]], [[990, 585], [1008, 630], [1030, 685]], [[1005, 730], [1030, 744], [1052, 756]], [[962, 640], [980, 676], [998, 712]], [[948, 735], [980, 742], [1010, 738]]] },
    { pts: [[1148, 550], [1256, 552], [1268, 590], [1278, 630], [1282, 670], [1276, 710], [1264, 744], [1252, 776], [1224, 786], [1170, 784], [1128, 778], [1126, 745], [1128, 700], [1134, 650], [1140, 600]],
      box: [1118, 548, 1290, 792], seed: 1520,
      hi: [[[1180, 585], [1170, 630], [1158, 675], [1140, 720]], [[1210, 575], [1198, 620], [1184, 665], [1170, 710]], [[1230, 620], [1218, 670], [1200, 730]], [[1250, 570], [1262, 610], [1268, 650]],
        [[1135, 752], [1180, 746], [1225, 755], [1245, 765]], [[1160, 560], [1152, 590], [1146, 620]]],
      lo: [[[1160, 595], [1146, 660], [1130, 730]], [[1200, 660], [1190, 700], [1180, 740]], [[1236, 600], [1250, 640], [1256, 690]], [[1150, 738], [1190, 742], [1230, 736]], [[1270, 620], [1276, 670], [1270, 710]]] },
  ];
  for (const leg of legs) {
    const f = curveField([...leg.hi, ...leg.lo], leg.box, 6);
    tex(g, leg.pts, (v) => {
      v.fillStyle = lg(v, 0, 548, 0, 790, [[0, 0.26], [0.2, 0.36], [0.6, 0.42], [1, 0.36]]); v.fillRect(leg.box[0] - 10, 540, 190, 260);
      for (const c of leg.hi) { vLineC(v, c, 12, 0.62, 4); vLineC(v, c, 5, 0.92, 1.8); }
      for (const c of leg.lo) vLineC(v, c, 9, 0.04, 2.5);
    }, 0, { per: 2.6, seed: leg.seed + 1, smooth: false, wExp: 0.72, bg: 0.18, brk: 0.35, brkL: 5, wav: 0.12, coord: fieldCoord((x, y) => f(x, y) + 0.12 * (vn2(x / 20, y / 20, leg.seed) - 0.5)) });
    for (const [i, c] of leg.lo.entries()) curve(g, c, 2.2, grey(0.02, 0.9), { seed: leg.seed + 10 + i, ends: 0.1 });
    curve(g, leg.pts, 1.8, grey(0.02), { closed: true, seed: leg.seed + 30, ends: 0.9 });
  }
  // the cargo pocket on the right leg's outer side
  const flap = [[1240, 612], [1270, 606], [1282, 640], [1280, 690], [1266, 716], [1246, 700], [1240, 660]];
  tex(g, flap, (v) => { v.fillStyle = lg(v, 1240, 606, 1282, 716, [[0, 0.7], [0.5, 0.5], [1, 0.28]]); v.fillRect(1230, 600, 60, 120); }, 1.7, { per: 2.8, seed: 1541, smooth: true, wExp: 0.72, bg: 0.18 });
  curve(g, flap, 1.6, grey(0.03), { closed: true, seed: 1540, ends: 0.9 });
  // the dark lap between the legs; the chair seat between his knees; its dark leg
  soft(g, pth([[1044, 548], [1150, 550], [1142, 600], [1126, 650], [1062, 650], [1056, 600]]), grey(0.04));
  stripes(g, [[1052, 652], [1136, 652], [1138, 672], [1050, 672]], { per: 3.4, cov: bl(0.5, 0.55, 0.35, 0.3), lum: 0.9, seed: 1541, dir: "h", brk: 0.2 });
  ink(g, [[1052, 652], [1136, 652]], 1.2, grey(0.75), { seed: 1542 });
  fillPoly(g, [[1078, 673], [1096, 673], [1094, 770], [1080, 770]], grey(0.06));
}
// a blurred value stroke along a smooth curve (value studies)
function vLineC(v, pts, w, val, blur) { blurDraw(v, bboxOf(pts, w), blur, (c) => curve(c, pts, w, grey(val), { seed: 5, ends: 0.3, jit: 0 })); }

// Hiking sneakers: dark suede uppers, white laces tied in bows, a tongue with a pale tab, a pale rubber toe cap and
// a thick pale sole with dark lugs. Our left shoe points down-left, our right shoe down-right. Measured at 2x.
function shoes(g) {
  const S = [
    { up: [[912, 842], [915, 812], [932, 792], [962, 782], [1000, 780], [1036, 786], [1056, 804], [1062, 840]], tongue: [[972, 768], [1012, 766], [1016, 792], [970, 794]],
      toe: [[900, 852], [906, 830], [926, 818], [956, 820], [972, 838], [958, 852]], sole: [[898, 848], [1062, 838], [1064, 864], [1052, 874], [990, 876], [904, 876], [896, 862]],
      bowL: [[986, 804], [966, 794], [948, 798], [958, 810], [982, 806]], bowR: [[990, 803], [1008, 792], [1026, 798], [1016, 812], [994, 806]], tails: [[[984, 807], [972, 820], [964, 830]], [[992, 807], [1004, 820], [1010, 832]]],
      cross: [[[944, 814], [968, 810], [992, 814]], [[950, 822], [972, 818], [996, 822]]], lx: 1, seed: 1560 },
    { up: [[1122, 842], [1124, 806], [1142, 790], [1172, 782], [1206, 782], [1230, 794], [1240, 814], [1244, 846]], tongue: [[1164, 768], [1204, 766], [1210, 792], [1160, 794]],
      toe: [[1250, 856], [1246, 832], [1226, 820], [1196, 822], [1184, 840], [1198, 854]], sole: [[1120, 846], [1252, 846], [1256, 866], [1246, 878], [1190, 882], [1128, 878], [1118, 864]],
      bowL: [[1180, 806], [1160, 796], [1142, 802], [1152, 814], [1176, 808]], bowR: [[1186, 805], [1204, 794], [1222, 800], [1212, 814], [1190, 808]], tails: [[[1180, 810], [1168, 824], [1160, 834]], [[1188, 810], [1200, 822], [1206, 834]]],
      cross: [[[1140, 818], [1164, 814], [1188, 818]], [[1146, 826], [1168, 822], [1192, 826]]], lx: -1, seed: 1580 },
  ];
  for (const s of S) {
    tex(g, s.up, (v) => { v.fillStyle = rg(v, (s.up[0][0] + s.up[7][0]) / 2, 790, 5, 80, [[0, 0.34], [0.6, 0.24], [1, 0.12]]); v.fillRect(880, 760, 400, 130); }, s.lx > 0 ? 2.0 : 1.14,
      { per: 2.4, seed: s.seed, smooth: true, wExp: 0.7, bg: 0.3, brk: 0.45, brkL: 3 });
    curve(g, s.up, 1.6, grey(0.02), { closed: true, seed: s.seed + 1, ends: 0.9 });
    // tongue and its tab
    fillBlob(g, s.tongue, grey(0.3)); curve(g, s.tongue, 1.2, grey(0.03), { closed: true, seed: s.seed + 2 });
    const [tx, ty] = [(s.tongue[0][0] + s.tongue[1][0]) / 2, (s.tongue[0][1] + s.tongue[2][1]) / 2];
    fillBlob(g, [[tx - 10, ty - 7], [tx + 10, ty - 7], [tx + 10, ty + 3], [tx - 10, ty + 3]], grey(0.7));
    // laces
    const lw = grey(0.95);
    for (const c of s.cross) { curve(g, c, 3.8, grey(0.03), { seed: s.seed + 3 }); curve(g, c, 2.4, lw, { seed: s.seed + 4 }); }
    for (const c of [s.bowL, s.bowR]) { curve(g, c, 4, grey(0.03), { seed: s.seed + 5 }); curve(g, c, 2.6, lw, { seed: s.seed + 6 }); }
    for (const c of s.tails) { curve(g, c, 3.6, grey(0.03), { seed: s.seed + 7 }); curve(g, c, 2.3, lw, { seed: s.seed + 8 }); }
    // toe cap
    tex(g, s.toe, (v) => { v.fillStyle = lg(v, s.toe[0][0], 820, s.toe[4][0], 852, [[0, 0.95], [1, 0.62]]); v.fillRect(880, 810, 400, 50); }, s.lx > 0 ? 0.3 : -0.3, { per: 2.4, seed: s.seed + 9, smooth: true, wExp: 0.7, bg: 0.3 });
    curve(g, s.toe, 1.4, grey(0.03), { closed: true, seed: s.seed + 10, ends: 0.9 });
    // sole with lugs
    tex(g, s.sole, (v) => { v.fillStyle = lg(v, 0, 842, 0, 880, [[0, 0.95], [0.5, 0.82], [1, 0.5]]); v.fillRect(880, 830, 400, 60); }, PI / 2, { per: 3, seed: s.seed + 11, wExp: 0.7, bg: 0.25 });
    ink(g, [s.sole[0], s.sole[1]], 1.8, grey(0.03), { seed: s.seed + 12 });
    const x0 = s.sole[0][0] + 6, x1 = s.sole[1][0] - 4;
    for (let i = 0; i < 14; i++) { const x = lerp(x0, x1, i / 13); ink(g, [[x, 864], [x + s.lx * -0.8, 877]], 2, grey(0.05, 0.85), { seed: s.seed + 14 + i }); }
    ink(g, s.sole, 1.4, grey(0.03), { closed: true, seed: s.seed + 30 });
  }
}
