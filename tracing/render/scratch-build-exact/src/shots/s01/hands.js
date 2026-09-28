// s01 right hand: two traced poses, each its own small engraved layer (moved per frame by s01_birdseye.js).
// Traced in plate coordinates from ridge maps of the source (dark-line skeletons on 4x crops,
// snapshots/s01-fix2-meas/ridge.py -> r-rh1.jpg at t=0, r-rh2.jpg at t=3.96, and the 7x grids z-rh1e/z-rh2t/z-rh2r).
// Pose 1 (on the trackpad): three slim fingers with nails (index, middle, ring), the little finger curled at the
// top right, the thumb hidden under the lower edge. Pose 2 (on the keys, 3.80-4.08): four fingers fanned over
// the bottom rows, the thumb out to the lower left.
import { DARK, rng, taper, curve, stroke, lin, sampleCurve } from "./kit.js";

const PI = Math.PI;
const smoothOf = (pts) => (c) => { const q = sampleCurve(pts, 5, true); c.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) c.lineTo(q[i][0], q[i][1]); c.closePath(); };

// ---------------------------------------------------------------- pose 1
// clockwise from the ring finger's tip
export const RHAND = [
  [1076, 479], [1073.5, 473], [1075, 468], [1079, 465.5], [1083.5, 466.5],                       // ring tip
  [1081.5, 459], [1082, 454], [1085, 450.5], [1090, 449.5], [1095, 451], [1098.5, 454.5],         // middle tip
  [1101, 450.5], [1105, 448], [1111, 448.5], [1118, 451], [1128, 455.5], [1138, 459.5], [1148, 463], // index
  [1153, 462], [1158, 459.5], [1165, 458], [1172, 458], [1178, 460], [1183, 464], [1188, 471],   // curled little finger
  [1196, 479], [1206, 490], [1216, 501], [1225, 511], [1232, 518], [1239, 527], [1245, 534], [1252, 541],
  [1262, 552], [1264, 572], [1246, 590], [1215, 597], [1190, 592], [1179, 582],                   // under the cuff
  [1172, 569], [1164, 560], [1155, 550], [1145, 541], [1134, 532], [1125, 521], [1116, 511], [1106, 503],
  [1095, 496], [1085, 488], [1078, 483],
];
export function handMask(c) { c.beginPath(); smoothOf(RHAND)(c); }

// a nail: pale oval, dark rim, darker on the root side
function nail(o, x, y, rx, ry, a) {
  o.save();
  o.translate(x, y); o.rotate(a);
  o.fillStyle = "rgba(236,235,231,1)"; o.beginPath(); o.ellipse(0, 0, rx, ry, 0, 0, PI * 2); o.fill();
  o.strokeStyle = "rgba(18,18,18,0.9)"; o.lineWidth = 1.15; o.stroke();
  o.strokeStyle = "rgba(90,90,88,0.6)"; o.lineWidth = 0.9; o.beginPath(); o.ellipse(0.8, 0, rx * 0.72, ry * 0.62, 0, -1.2, 1.2); o.stroke();
  o.restore();
}
const grey = (a) => `rgba(78,78,76,${a})`;

export function paintRightHand(P) {
  const o = P.o;
  P.fill(smoothOf(RHAND), lin(1080, 455, 1240, 560, [[0, 0.99], [0.6, 0.97], [1, 0.93]]), 0.45, { style: 2 });
  // the thumb side turns away from the light; a little shade along each finger's lower edge
  P.light(smoothOf(RHAND), (g) => { const r = g.createLinearGradient(1150, 488, 1128, 530); r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(0.7, "rgba(0,0,0,0.06)"); r.addColorStop(1, "rgba(0,0,0,0.2)"); return r; });
  for (const [pts, w] of [[[[1086, 470], [1112, 482], [1140, 496]], 7], [[[1101, 458], [1128, 470], [1160, 486]], 6]]) {
    o.save(); o.globalAlpha = 0.16; taper(o, sampleCurve(pts, 6), (u) => w * Math.sin(PI * Math.min(1, u * 1.2)), "#3a3a38"); o.restore();
  }
  // finger separations: dark, tapering back toward the knuckles
  curve(o, [[1098.5, 454.5], [1104, 457.5], [1112, 461], [1122, 465.5], [1132, 470], [1142, 475], [1152, 480], [1160, 484.5], [1166, 488]], 1.9, DARK, 801, { ends: 0.15 });
  curve(o, [[1083.5, 466.5], [1092, 470], [1102, 475], [1113, 480.5], [1124, 486.5], [1135, 493], [1144, 498.5], [1150, 502]], 1.9, DARK, 802, { ends: 0.15 });
  // the curled little finger's lower edge
  curve(o, [[1149, 463], [1156, 466.5], [1164, 472], [1172, 477], [1181, 480.5]], 1.7, DARK, 803, { ends: 0.2 });
  // nails
  nail(o, 1106.5, 452, 4.8, 3, 0.42);
  nail(o, 1088.5, 455, 4.8, 3.1, 0.5);
  nail(o, 1079.5, 471, 4.6, 3, 0.62);
  // knuckle creases (short arcs across each finger at its base and middle joint)
  const crease = (pts, w, a, seed) => stroke(o, pts, w, grey(a), seed, 0.5);
  crease([[1141, 462], [1144, 465.5], [1146, 469]], 1.3, 0.75, 811);
  crease([[1126, 468], [1128, 472], [1129, 476]], 1.2, 0.7, 812);
  crease([[1112, 485], [1114, 489], [1116, 493]], 1.2, 0.65, 813);
  crease([[1119, 457], [1121, 461], [1121, 464]], 1.0, 0.55, 814);
  crease([[1104, 472], [1106, 476], [1106, 479]], 1.0, 0.5, 815);
  crease([[1162, 469], [1167, 472], [1170, 476]], 1.1, 0.55, 816);
  // tendons fanning from the knuckles to the wrist
  const tendon = (pts, w, a, seed) => stroke(o, pts, w, grey(a), seed, 0.45, 8);
  tendon([[1164, 488], [1176, 495], [1190, 505]], 1.4, 0.55, 821);
  tendon([[1182, 482], [1190, 489], [1197, 496]], 1.3, 0.6, 822);
  tendon([[1193, 483], [1198, 488], [1202, 493]], 1.1, 0.5, 823);
  tendon([[1147, 504], [1156, 509], [1164, 515]], 1.3, 0.55, 824);
  tendon([[1160, 506], [1190, 526], [1220, 546]], 1.3, 0.38, 825);
  tendon([[1176, 497], [1204, 516], [1232, 536]], 1.2, 0.34, 826);
  tendon([[1150, 520], [1175, 538], [1202, 556]], 1.2, 0.3, 827);
  tendon([[1196, 500], [1212, 511], [1226, 522]], 1.0, 0.3, 828);
  // outline (the part under the cuff is hidden by the sleeve)
  curve(o, RHAND.slice(0, 34), 2.3, DARK, 830, { ends: 0.5 });
  curve(o, RHAND.slice(38).concat([RHAND[0]]), 2.4, DARK, 831, { ends: 0.5 });
}

// the hand's soft shadow on the trackpad, just outside its lower edge (drawn into the room under the hand)
export function handShadow(o) {
  o.save();
  o.beginPath(); o.moveTo(1076, 482); o.lineTo(1106, 506); o.lineTo(1124, 522); o.lineTo(1118, 528); o.lineTo(1096, 512); o.lineTo(1074, 492); o.closePath();
  const g = o.createLinearGradient(1100, 500, 1090, 516); g.addColorStop(0, "rgba(40,40,40,0.28)"); g.addColorStop(1, "rgba(40,40,40,0)");
  o.fillStyle = g; o.fill();
  o.restore();
}

// ---------------------------------------------------------------- pose 2 (traced at 3.96)
export const RHAND2 = [
  [1109, 505], [1111, 498], [1117, 494], [1128, 494.5], [1140, 499], [1152, 507], [1163, 513.5], [1170, 516.5],   // thumb
  [1168, 506], [1161, 493], [1150, 481], [1139, 469], [1128, 458], [1118, 448],                                  // index lower edge
  [1111, 441], [1107.5, 433], [1108.5, 425], [1113, 420], [1119.5, 420.5], [1122, 423],                         // index tip
  [1119, 415], [1120.5, 406], [1127, 401.5], [1135, 401.5], [1140, 405.5], [1142.5, 409.5],                     // middle tip
  [1143, 403.5], [1149, 400.5], [1157, 401.5], [1163.5, 407], [1165, 414.5],                                   // ring tip
  [1175, 421], [1185, 428], [1191.5, 432], [1195, 429.5], [1203, 429], [1211, 431], [1216.5, 435],             // little finger
  [1223, 442], [1232, 458], [1242, 476], [1251, 494], [1259, 509], [1265, 518],                                // back of the hand
  [1278, 532], [1286, 560], [1268, 590], [1240, 600], [1205, 592],                                             // under the cuff
  [1188, 572], [1170, 554], [1155, 543], [1140, 532], [1128, 523], [1118, 514],                                // thumb lower edge
];
export function hand2Mask(c) { c.beginPath(); smoothOf(RHAND2)(c); }

export function paintRightHand2(P) {
  const o = P.o;
  P.fill(smoothOf(RHAND2), lin(1110, 405, 1260, 560, [[0, 0.99], [0.6, 0.97], [1, 0.93]]), 0.95, { style: 2 });
  P.light(smoothOf(RHAND2), (g) => { const r = g.createLinearGradient(1150, 470, 1120, 520); r.addColorStop(0, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(0,0,0,0.14)"); return r; });
  // soft shade along each finger's lower edge
  for (const [pts, w] of [[[[1128, 432], [1150, 452], [1172, 472]], 7], [[[1150, 418], [1172, 438], [1194, 458]], 7], [[[1195, 440], [1210, 456], [1224, 470]], 6], [[[1122, 450], [1140, 472], [1156, 496]], 6]]) {
    o.save(); o.globalAlpha = 0.15; taper(o, sampleCurve(pts, 6), (u) => w * Math.sin(PI * Math.min(1, u * 1.2)), "#3a3a38"); o.restore();
  }
  // finger separations
  curve(o, [[1122, 423], [1126, 428], [1140, 441], [1155, 454], [1168, 465], [1180, 474], [1188, 482]], 2.0, DARK, 851, { ends: 0.12 });
  curve(o, [[1142.5, 409.5], [1150, 420], [1165, 433], [1180, 446], [1190, 456], [1202, 464], [1210, 472]], 2.0, DARK, 852, { ends: 0.12 });
  curve(o, [[1191.5, 432], [1200, 442], [1208, 452], [1216, 459], [1222, 466], [1228, 476], [1233, 486]], 2.0, DARK, 853, { ends: 0.12 });
  // the web between thumb and index, the thumb's crease
  curve(o, [[1139, 469], [1141, 480], [1139, 494]], 1.4, DARK, 854, { ends: 0.2 });
  curve(o, [[1138, 497], [1150, 507], [1165, 514]], 1.3, DARK, 855, { ends: 0.3 });
  nail(o, 1116, 426.5, 5, 3.2, 1.0);
  nail(o, 1128, 407, 5, 3.3, 0.95);
  nail(o, 1150, 406, 5, 3.3, 0.75);
  nail(o, 1203, 433, 4.2, 2.6, 0.2);
  nail(o, 1119, 500, 4.8, 3.2, 0.35);
  const crease = (pts, w, a, seed) => stroke(o, pts, w, grey(a), seed, 0.5);
  crease([[1133, 446], [1137, 443], [1140, 439]], 1.2, 0.7, 861);
  crease([[1156, 431], [1160, 428], [1162, 424]], 1.2, 0.7, 862);
  crease([[1182, 437], [1185, 441]], 1.1, 0.6, 863);
  crease([[1148, 462], [1152, 459], [1156, 455]], 1.1, 0.55, 864);
  crease([[1170, 446], [1174, 443], [1177, 439]], 1.1, 0.55, 865);
  crease([[1204, 450], [1209, 448]], 1.0, 0.5, 866);
  // tendons from the knuckles toward the wrist
  const tendon = (pts, w, a, seed) => stroke(o, pts, w, grey(a), seed, 0.45, 8);
  tendon([[1178, 476], [1187, 483], [1193, 493]], 1.4, 0.6, 871);
  tendon([[1176, 487], [1182, 492], [1187, 496]], 1.2, 0.5, 872);
  tendon([[1196, 464], [1202, 468], [1208, 472]], 1.2, 0.5, 873);
  tendon([[1190, 490], [1210, 508], [1230, 528]], 1.3, 0.4, 874);
  tendon([[1205, 474], [1224, 494], [1244, 516]], 1.3, 0.38, 875);
  tendon([[1172, 496], [1190, 515], [1208, 534]], 1.2, 0.34, 876);
  tendon([[1215, 466], [1232, 486], [1250, 508]], 1.1, 0.3, 877);
  tendon([[1190, 542], [1195, 551]], 1.2, 0.5, 878);
  curve(o, RHAND2.slice(0, 45), 2.3, DARK, 880, { ends: 0.5 });
  curve(o, RHAND2.slice(49).concat([RHAND2[0]]), 2.4, DARK, 881, { ends: 0.5 });
}
