// s13 talons, fix pass 2 (authored): each toe is an outline through hand-read control points (8x zooms of the C hold,
// median of 891-898), with a knuckle notch where the pad meets the upper segment, a heavy separation line down its
// shadow side, 2-3 grey crease arcs, a few scale ticks low on it, and a pale hooked claw coming out of its tip (the
// claw's dark "cap" arc sits over the toe, its sides run down past the frame edge). The left foot's third toe shows
// its scaly underside (a grey zone of short dark strokes) and the pale rear toe to its right.
import { taper } from "../../lib/ink.js";
import { gv, LINE, ink, V } from "../../lib/owlInk.js";
import { brush, swellStroke } from "./brush.js";
import { clipTo, sampleCurve, smoothPath, rng } from "./util.js";

const { add, sub, mul, nrm, perp } = V;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// o: outline (closed, clockwise from the top-left); sep: the heavy dark line down the toe's right (shadow) side;
// cr: crease arcs (3 points each); claw: [cap apex, half width at the root, tip] (the tip lies below the frame edge);
// sh: soft shade along the right side (0 none); ticks: [from, to] points of the underside where scale ticks sit
export const TOES2 = [
  { id: "L1", top: 5, topW: 4, o: [[1167, 904], [1171, 897], [1178, 892], [1187, 889], [1195, 889], [1197, 895], [1192, 902], [1187, 911], [1186, 921], [1189, 930], [1195, 939], [1199, 950], [1180, 952], [1166, 950], [1164, 936], [1165, 920]],
    sep: [[1197, 890], [1192, 899], [1187, 908], [1185, 918], [1186, 927], [1191, 935], [1196, 942], [1199, 950]], sepW: 5,
    cr: [[[1170, 917], [1178, 916], [1185, 921]], [[1170, 928], [1180, 926], [1189, 931]]], claw: [[1189, 940], 8, [1186, 968]], sh: 0.7 },
  { id: "L2", top: 7, topW: 4.5, o: [[1198, 884], [1203, 875], [1211, 870], [1221, 868], [1231, 869], [1240, 873], [1245, 878], [1239, 886], [1233, 894], [1228, 904], [1226, 914], [1226, 923], [1229, 931], [1222, 935], [1214, 933], [1205, 928], [1194, 933], [1188, 928], [1186, 918], [1189, 907], [1193, 897]],
    sep: [[1246, 877], [1239, 886], [1233, 895], [1228, 905], [1226, 915], [1226, 924], [1229, 931], [1233, 935]], sepW: 5.5,
    cr: [[[1209, 873], [1222, 874], [1234, 881]], [[1199, 893], [1210, 891], [1220, 897]], [[1194, 901], [1203, 899], [1212, 903]]], claw: [[1204, 920], 9, [1212, 962]], sh: 0.72, ticks: [[1214, 926], [1226, 930]] },
  { id: "L3", top: 8, topW: 4, o: [[1240, 882], [1246, 873], [1253, 868], [1262, 866], [1272, 866], [1282, 869], [1291, 874], [1298, 881], [1301, 892], [1302, 906], [1300, 920], [1294, 931], [1276, 934], [1260, 932], [1250, 925], [1240, 921], [1232, 929], [1227, 921], [1228, 908], [1232, 896]],
    sep: [[1244, 876], [1238, 885], [1232, 895], [1228, 906], [1227, 917], [1230, 927], [1234, 933]], sepW: 4.5,
    cr: [[[1254, 868], [1266, 870], [1277, 877]], [[1246, 880], [1258, 880], [1268, 886]], [[1238, 890], [1250, 889], [1260, 894]]], claw: [[1246, 913], 9.5, [1253, 954]], sh: 0,
    scaly: [[1264, 899], [1277, 894], [1291, 895], [1300, 903], [1299, 918], [1292, 929], [1277, 932], [1265, 928], [1260, 913]] },
  { id: "R1", top: 8, topW: 5.5, o: [[1431, 889], [1434, 879], [1439, 871], [1446, 865], [1455, 862], [1465, 862], [1474, 865], [1483, 869], [1478, 877], [1472, 885], [1468, 894], [1466, 904], [1466, 914], [1467, 924], [1466, 931], [1458, 932], [1450, 927], [1440, 923], [1431, 927], [1426, 921], [1423, 912], [1423, 903], [1427, 895]],
    sep: [[1485, 868], [1478, 876], [1472, 885], [1468, 895], [1466, 905], [1466, 915], [1467, 925], [1468, 933]], sepW: 5.5,
    cr: [[[1449, 869], [1456, 871], [1462, 878]], [[1437, 886], [1446, 886], [1454, 890]], [[1430, 897], [1441, 897], [1451, 902]]], claw: [[1443, 917], 9, [1452, 966]], sh: 0.74, ticks: [[1452, 928], [1464, 931]] },
  { id: "R2", top: 9, topW: 6, o: [[1482, 870], [1488, 862], [1496, 857], [1505, 854], [1516, 854], [1526, 857], [1533, 863], [1537, 871], [1539, 882], [1537, 893], [1533, 905], [1530, 916], [1528, 927], [1526, 935], [1512, 935], [1500, 931], [1487, 916], [1476, 925], [1470, 930], [1467, 918], [1467, 905], [1469, 894], [1474, 884]],
    sep: [[1540, 882], [1537, 893], [1533, 905], [1530, 916], [1528, 927], [1527, 936]], sepW: 5,
    cr: [[[1500, 860], [1510, 861], [1518, 866]], [[1486, 883], [1497, 882], [1506, 890]], [[1480, 892], [1492, 891], [1502, 898]]], claw: [[1486, 914], 9.5, [1485, 960]], sh: 0,
    scaly: [[1508, 890], [1521, 885], [1534, 888], [1533, 906], [1529, 922], [1526, 934], [1514, 934], [1507, 924], [1507, 905]] },
  { id: "R3", top: 7, topW: 5, o: [[1536, 890], [1543, 882], [1552, 878], [1563, 877], [1572, 879], [1579, 885], [1583, 893], [1582, 903], [1578, 913], [1574, 923], [1570, 933], [1565, 941], [1557, 942], [1551, 933], [1543, 929], [1534, 934], [1530, 925], [1530, 912], [1532, 900]],
    sep: [[1583, 893], [1582, 904], [1578, 914], [1574, 924], [1570, 934], [1565, 942]], sepW: 3.5,
    cr: [[[1550, 903], [1560, 905], [1568, 912]], [[1545, 912], [1555, 913], [1563, 919]], [[1554, 884], [1563, 885], [1570, 891]]], claw: [[1543, 929], 9.5, [1542, 966]], sh: 0.74, ticks: [[1556, 936], [1566, 939]] },
];
// the rear toe of the left foot (pale, going right under the hem; a few dark strokes low on it)
// (its top runs right under the hem to a blunt tip at ~(1374, 893): the pale band the source shows at y 880-902, x 1300-1370)
const REAR = [[1296, 885], [1320, 881], [1345, 882], [1364, 885], [1375, 893], [1366, 899], [1346, 901], [1328, 906], [1328, 926], [1331, 952], [1300, 952], [1295, 934], [1301, 918], [1302, 902]];

// the claw: a pale hooked crescent from its cap (apex A, half width hw) down to the tip T; its outer (left) edge bows
// out, the inner edge less; a grey shade down its right side, a pale glint down its left, a 2 px dark outline
function clawPath(A, hw, T) {
  const d = nrm(sub(T, A)), n = perp(d), L = Math.hypot(T[0] - A[0], T[1] - A[1]);
  const l0 = add(add(A, mul(n, hw)), mul(d, hw * 0.75)), r0 = add(add(A, mul(n, -hw)), mul(d, hw * 0.75));
  // n points to the claw's left when it runs downward (d ~ [0, 1] -> n = [-1, 0])
  // (source 884, the feet lifted: the claw keeps its width to ~60 % of its length, the outer edge convex, the tip hooked)
  const lc1 = add(add(l0, mul(d, L * 0.42)), mul(n, L * 0.1)), lc2 = add(add(T, mul(d, -L * 0.3)), mul(n, L * 0.12)), rc = add(V.mix(r0, T, 0.55), mul(n, L * 0.05));
  const capL = add(A, mul(n, hw * 0.95)), capR = add(A, mul(n, -hw * 0.95));
  return {
    d, n, L, l0, r0,
    path: (c) => { c.moveTo(r0[0], r0[1]); c.bezierCurveTo(capR[0], capR[1] - hw * 0.3, capL[0], capL[1] - hw * 0.3, l0[0], l0[1]); c.bezierCurveTo(lc1[0], lc1[1], lc2[0], lc2[1], T[0], T[1]); c.quadraticCurveTo(rc[0], rc[1], r0[0], r0[1]); c.closePath(); },
    cap: [r0, add(capR, [0, -hw * 0.3]), add(capL, [0, -hw * 0.3]), l0],
  };
}
function paintClaw(g, [A, hw, T], seed) {
  const C = clawPath(A, hw, T), r = rng(seed);
  g.fillStyle = gv(0.9); g.beginPath(); C.path(g); g.fill();
  clipTo(g, C.path, () => {
    g.filter = "blur(2px)";
    ink(g, [V.mix(C.r0, T, 0.1), V.mix(C.r0, T, 0.5), V.mix(C.r0, T, 0.9)].map((p) => add(p, mul(C.n, 2))), hw * 0.7, gv(0.62, 0.85), { end: 0.4 });
    ink(g, [V.mix(C.l0, T, 0.15), V.mix(C.l0, T, 0.5), V.mix(C.l0, T, 0.85)].map((p) => add(p, mul(C.n, -hw * 0.45))), hw * 0.45, gv(0.97, 0.8), { end: 0.3 });
    g.filter = "none";
    // a fine growth line down the claw
    swellStroke(g, [V.mix(A, T, 0.25), add(V.mix(A, T, 0.55), mul(C.n, -1.5 - r())), V.mix(A, T, 0.9)], 0.9, gv(0.45, 0.7));
  });
  g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); C.path(g); g.stroke();
  // the cap: the heavy dark arc where the claw leaves the toe
  const q = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16, a = C.cap; q.push([(1 - t) ** 3 * a[0][0] + 3 * (1 - t) ** 2 * t * a[1][0] + 3 * (1 - t) * t * t * a[2][0] + t ** 3 * a[3][0], (1 - t) ** 3 * a[0][1] + 3 * (1 - t) ** 2 * t * a[1][1] + 3 * (1 - t) * t * t * a[2][1] + t ** 3 * a[3][1]]); }
  taper(g, q, (u) => 1.6 + 2.2 * Math.pow(Math.sin(Math.PI * u), 0.5), LINE);
}
// scaly underside: grey ground, short dark strokes slanting down-left in rows, pale ticks between
function paintScaly(g, pts, seed) {
  const p = (c) => smoothPath(c, pts, true, 0.3), r = rng(seed);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  g.save(); g.filter = "blur(2px)"; g.fillStyle = gv(0.6); g.beginPath(); p(g); g.fill(); g.filter = "none"; g.restore();
  clipTo(g, p, () => {
    for (let y = y0 + 3; y < y1; y += 6 + r() * 3) for (let x = x0 + r() * 5; x < x1; x += 7 + r() * 5) {
      const L = 6 + r() * 7;
      brush(g, [[x + L * 0.5, y - L * 0.35], [x, y], [x - L * 0.35, y + L * 0.5]], 1.3 + r() * 0.8, gv(0.08 + r() * 0.15, 0.9), { head: 0.3, pow: 0.7 });
      if (r() < 0.35) swellStroke(g, [[x + 3, y + 2], [x + 5, y + 4], [x + 6, y + 7]], 1.1, gv(0.75, 0.7));
    }
  });
}
export function paintFeet2(g, fp) {
  // the feathered mass behind the toes (the measured feet outline, above the toe tips): grey, hatched down-right
  g.save(); g.beginPath(); g.rect(1100, 780, 600, 110); g.clip();
  g.fillStyle = gv(0.74); g.beginPath(); fp(g); g.fill("evenodd");
  g.restore();
  // the rear toe (left foot)
  { const rp = (c) => smoothPath(c, REAR, true, 0.3); g.fillStyle = gv(0.8); g.beginPath(); rp(g); g.fill();
    clipTo(g, rp, () => { const r = rng(705); for (let i = 0; i < 7; i++) { const x = 1298 + r() * 26, y = 915 + r() * 28; brush(g, [[x + 6, y - 6], [x, y + 4]], 1.5, gv(0.2, 0.85)); } for (let i = 0; i < 12; i++) { const x = 1318 + r() * 52, y = 884 + r() * 10; brush(g, [[x, y - 4], [x + 3, y + 3], [x + 5, y + 9]], 1.4 + r(), gv(0.25 + r() * 0.2, 0.85)); } g.filter = "blur(4px)"; ink(g, [[1326, 900], [1329, 925], [1331, 950]], 8, gv(0.6, 0.8)); g.filter = "none"; });
    g.strokeStyle = LINE; g.lineWidth = 2.4; g.beginPath(); g.moveTo(1374, 895); g.quadraticCurveTo(1345, 901, 1328, 906); g.quadraticCurveTo(1329, 925, 1332, 950); g.stroke(); }
  for (const [i, T] of TOES2.entries()) {
    const r = rng(720 + i), op = (c) => smoothPath(c, T.o, true, 0.35);
    g.fillStyle = gv(0.93); g.beginPath(); op(g); g.fill();
    clipTo(g, op, () => {
      // light from the upper left: a soft grey down the right side, a whiter top-left
      if (T.sh) { g.filter = "blur(5px)"; ink(g, T.sep.map((p) => add(p, [-7, 0])), 11, gv(T.sh, 0.8), { end: 0.5 }); g.filter = "none"; }
      if (T.scaly) paintScaly(g, T.scaly, 740 + i);
      for (const c of T.cr) swellStroke(g, c, 1.9 + r() * 0.5, gv(0.3 + r() * 0.12, 0.9), { end: 0.15, pow: 0.5 });
      if (T.ticks) { const [a, b] = T.ticks; for (let k = 0; k < 6; k++) { const p = V.mix(a, b, (k + 0.5) / 6), q = add(p, [(r() - 0.5) * 3, -2 - r() * 4]); swellStroke(g, [q, add(q, [2, 1.5]), add(q, [4.5, 1])], 1, gv(0.3, 0.85)); } }
    });
    // outline: a fine dark line all round, the heavy separation line down the shadow side
    g.strokeStyle = LINE; g.lineWidth = 2.6; g.beginPath(); op(g); g.stroke();
    swellStroke(g, T.sep, T.sepW, LINE, { end: 0.35, pow: 0.5 });
    if (T.top) swellStroke(g, T.o.slice(1, T.top), T.topW || 5, LINE, { end: 0.3, pow: 0.4 });
    // the knuckle notch: a short dark tick into the outline where the pad meets the upper segment
    { const k = T.cr[T.cr.length - 1][0]; brush(g, [add(k, [-5, -1]), add(k, [1, 0.5])], 3, LINE, { head: 0.2, pow: 0.9 }); }
    paintClaw(g, T.claw, 760 + i);
  }
}
