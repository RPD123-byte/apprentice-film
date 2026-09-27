// s19 back-view key poses, each measured on its own source frame (1x–2x gridded crops, frame px). All share one
// structure (back2.js) so neighbouring keys interpolate. Wings are fans: folded = feathers hanging down the flank.
const fold = (S, Wr, T, side, seed, o = {}) => ({
  layer: "front", open: 0, width: 36, S, Wr, T, dS: [0.25 * side, 1], dWr: [0.3 * side, 0.95], dT: [0.25 * side, 0.97],
  LP: [42, 34], LS: 44, nP: 4, nS: 3, wP: 0.5, wS: 0.55, cov: 0.9, bend: 0.05 * side, seed, ...o,
});
// an open wing drawn by the kit (back2.js kitWing): shoulder S, wrist Wr, tip T, feathers hanging toward trail
// (fix pass 4: point 0.3: rounder, overlapping feathers, not palm-frond spikes)
const kspread = (S, Wr, T, side, seed, o = {}) => ({ layer: "front", open: 1, kit: true, S, Wr, T, trail: [0.15 * side, 1], len: 95, n: 7, m: 5, spread: 1, fw: 1.1, cov: 2, seed, point: 0.3, secLen: 1, ...o });
const cup = (x, y, r, open, side, front = true, rot = 0) => ({ x, y, r, rot, open, side, front });
const foot = (x, y, size, leg, o = {}) => ({ x, y, size, leg, sy: 0.6, rot: 0, spread: 1.1, seed: 3, a: 1, ...o });

// SIT (58.80): sitting, back to us, head turned right to the card; the headphones knocked down round its neck
// (a dark strap from the left of the neck under the head and up into the near cup on the face side)
export const SIT = {
  head: { x: 940, y: 622, rx: 106, ry: 100, roll: 0, sq: 2.2 },
  crown: [960, 560],
  // (fix pass 3: a wispy tuft rising up-left off the crown, (930, 560) -> (855, 540) after the fit)
  // (fix pass 4: the crest is a bold swoosh sweeping up-left out past the head, (935, 570) -> (815, 545) in frame px)
  crest: { x: 938, y: 590, dir: Math.PI + 0.2, len: 104, w: 44, n: 5, fan: 0.45, curl: 0.16, a: 1 },
  body: { x: 986, y: 790, rx: 140, ry: 98, rot: 0, egg: 0.08 },
  tail: { base: [905, 860], tip: [830, 886], w: 34, n: 3 },
  wings: [
    fold([1040, 706], [1085, 772], [1108, 846], 1, 11),
    fold([852, 740], [846, 800], [850, 858], -1, 13, { LP: [30, 26], LS: 30 }),
  ],
  // (fix pass 4: the clawed right foot pokes out at the lower right (the source's 1225–1265 × 760–820, set against this
  // narrower body); the slider is a slim metal bar
  // ≈ 22 px wide running diagonally up into the cup, (1045, 705) -> (1105, 640))
  feet: [foot(1000, 872, 14, 0, { a: 0, seed: 2 }), foot(1168, 804, 22, 0, { rot: -2.0, seed: 5 })],
  band: { pts: [[836, 712], [890, 738], [945, 750], [995, 734], [1030, 708]], w: 32, dark: 1, front: true, armW: 0.7, arm: [[1030, 708], [1060, 676], [1090, 644]] },
  cups: [cup(840, 640, 40, 0.1, -1, false), cup(1052, 598, 54, 0.7, 1, true, 0.05)],
  bandage: { x: 976, y: 588, size: 62, rot: 0.45, sx: 1, sy: 0.95, a: 1 },
};
// STAND (60.60): standing, back to us, looking up at the card; headphones on: band over the crown, the near cup on
// the right (shell rx 45, ry 72), the far cup seen edge-on beside the head's left edge
export const STAND = {
  head: { x: 1128, y: 480, rx: 120, ry: 94, roll: 0, sq: 2.1 },
  crown: [1125, 410],
  // (fix pass 4: a bold crest sweeping out up-left past the head, (1100, 440) -> (1000, 410); the tail feathers flare
  // out low on the left, (1100, 770) -> (1010, 792))
  crest: { x: 1098, y: 444, dir: Math.PI + 0.3, len: 96, w: 44, n: 5, fan: 0.45, curl: 0.16, a: 1 },
  body: { x: 1150, y: 690, rx: 150, ry: 124, rot: 0, egg: 0.1 },
  tail: { base: [1090, 770], tip: [982, 802], w: 50, n: 3 },
  wings: [
    fold([1215, 600], [1250, 690], [1272, 782], 1, 11),
    fold([1032, 592], [1016, 684], [1032, 790], -1, 13),
  ],
  feet: [foot(1100, 816, 28, 14, { seed: 2 }), foot(1225, 812, 28, 14, { seed: 5 })],
  // (fix pass 3, 1:1 overlay at 60.60: the near cup sits ≈ 28 px further right and the far cup 12 px lower)
  band: { pts: [[1025, 452], [1045, 385], [1140, 346], [1238, 366], [1266, 437]], w: 17, dark: 0, front: true, arm: [[1266, 437], [1266, 442], [1266, 447]] },
  cups: [cup(1022, 520, 58, 0.0, -1, true), cup(1267, 505, 64, 0.72, 1, true)],
  bandage: { x: 1170, y: 462, size: 72, rot: -0.82, sx: 1, sy: 0.95, a: 1 },
};

// ---------------------------------------------------------------- the landing and the skid (58.00–58.36)
const fan = (S, Wr, T, side, seed, o = {}) => ({
  layer: "front", open: 1, width: 36, S, Wr, T, dS: [0.3 * side, 1], dWr: [0.6 * side, 0.8], dT: [0.9 * side, 0.3],
  LP: [70, 90], LS: 60, nP: 7, nS: 5, wP: 0.42, wS: 0.48, cov: 0.8, bend: 0.05 * side, seed, ...o,
});
const hide = { x: 0, y: 0, size: 0, rot: 0, sx: 1, sy: 1, a: 0 };
// LAND0 (58.00, held 58.04): landed head-down with its back to us: the rump a big round mass, the tail up at the
// top left, the head at the lower right wrapped by the dark strap
export const LAND0 = {
  head: { x: 1492, y: 742, rx: 72, ry: 98, roll: -0.3, sq: 2.2 },
  crown: [1520, 800],
  crest: { x: 1395, y: 566, dir: -1.1, len: 44, w: 24, n: 3, fan: 0.6, curl: 0.1, a: 1 },
  body: { x: 1350, y: 700, rx: 165, ry: 150, rot: 0, egg: -0.05 },
  tail: { base: [1238, 640], tip: [1212, 488], w: 50, n: 3 },
  wings: [fold([1470, 652], [1500, 720], [1500, 800], 1, 11), fold([1210, 690], [1200, 760], [1215, 805], -1, 13)],
  feet: [foot(1212, 776, 18, 0, { rot: 1.6, seed: 2 }), foot(1322, 846, 16, 0, { seed: 5 })],
  band: { pts: [[1440, 612], [1500, 640], [1545, 720], [1530, 800], [1480, 848]], w: 34, dark: 1, front: true, arm: [[1480, 848], [1470, 850], [1460, 852]] },
  cups: [cup(1430, 612, 36, 0.1, -1, false), cup(1468, 846, 40, 0.3, 1, false, 3.0)],
  bandage: { ...hide, x: 1500, y: 760 },
};
// LAND1 (58.08): tipping forward onto its belly, the tail swinging left
export const LAND1 = {
  ...LAND0,
  head: { x: 1428, y: 722, rx: 70, ry: 104, roll: -0.2, sq: 2.2 },
  crown: [1450, 790],
  crest: { x: 1300, y: 556, dir: -1.3, len: 40, w: 24, n: 3, fan: 0.6, curl: 0.1, a: 1 },
  body: { x: 1285, y: 702, rx: 190, ry: 146, rot: 0, egg: -0.05 },
  tail: { base: [1150, 622], tip: [1090, 556], w: 52, n: 3 },
  wings: [fold([1400, 640], [1440, 720], [1440, 800], 1, 11), fold([1110, 690], [1100, 760], [1120, 810], -1, 13)],
  feet: [foot(1222, 842, 16, 0, { seed: 2 }), foot(1330, 852, 16, 0, { seed: 5 })],
  band: { pts: [[1370, 602], [1440, 622], [1480, 700], [1470, 790], [1440, 842]], w: 34, dark: 1, front: true, arm: [[1440, 842], [1432, 846], [1424, 850]] },
  cups: [cup(1360, 604, 36, 0.1, -1, false), cup(1430, 842, 40, 0.3, 1, false, 3.0)],
  bandage: { ...hide, x: 1440, y: 740 },
};
// LIE (58.12, and LIE2 at 58.20): flat on its belly skidding left; tail feathers and wing tips splayed on the floor
export const LIE = {
  ...LAND1,
  head: { x: 1350, y: 722, rx: 66, ry: 114, roll: 0, sq: 2.2 },
  crown: [1380, 760],
  crest: { x: 1392, y: 668, dir: -0.35, len: 46, w: 24, n: 3, fan: 0.6, curl: 0.1, a: 1 },
  body: { x: 1250, y: 726, rx: 176, ry: 134, rot: 0, egg: 0 },
  tail: { base: [1102, 690], tip: [1000, 672], w: 60, n: 3 },
  wings: [fold([1320, 640], [1360, 720], [1360, 810], 1, 11), fold([1090, 740], [1070, 800], [1080, 840], -1, 13)],
  feet: [foot(1272, 860, 15, 0, { seed: 2 }), foot(1350, 856, 15, 0, { seed: 5 })],
  // (fix pass 3: the strap runs further back over the top: (1150, 568) -> (1230, 572) -> down the right side, after the fit)
  band: { pts: [[1153, 584], [1235, 588], [1306, 627], [1342, 719], [1332, 822]], w: 34, dark: 1, front: true, arm: [[1332, 822], [1326, 830], [1320, 838]] },
  cups: [cup(1290, 602, 36, 0.1, -1, false), cup(1350, 850, 40, 0.3, 1, false, 3.0)],
  bandage: { ...hide, x: 1360, y: 740 },
};
export const LIE2 = {
  ...LIE,
  head: { x: 1266, y: 722, rx: 62, ry: 110, roll: 0.05, sq: 2.2 },
  crown: [1290, 760],
  crest: { x: 1308, y: 640, dir: -0.6, len: 42, w: 24, n: 3, fan: 0.6, curl: 0.1, a: 1 },
  body: { x: 1155, y: 742, rx: 152, ry: 124, rot: 0, egg: 0 },
  tail: { base: [1020, 800], tip: [900, 816], w: 42, n: 3 },
  wings: [fold([1240, 650], [1280, 730], [1290, 820], 1, 11), fold([1030, 780], [980, 810], [930, 825], -1, 13)],
  feet: [foot(1190, 862, 15, 0, { seed: 2 }), foot(1270, 856, 15, 0, { seed: 5 })],
  band: { pts: [[1112, 598], [1217, 592], [1275, 650], [1291, 734], [1280, 829]], w: 34, dark: 1, front: true, arm: [[1280, 829], [1274, 836], [1268, 842]] },
  cups: [cup(1200, 612, 36, 0.1, -1, false), cup(1272, 846, 40, 0.3, 1, false, 3.0)],
  bandage: { ...hide, x: 1270, y: 740 },
};
// ---------------------------------------------------------------- the landing, re-measured (fix pass 4)
// Each key read on a 2x 50 px grid of its own source frame (snapshots/s19-fix2-g*.jpg), absolute frame px, no pose fit.
// The owl lands head-first: a round back to us, the tail tuft up at the top left, the head down on the floor at the
// right end with the dark band wrapped round the back of it as a C (its far end goes behind the round back: band.cut
// is the body mass that hides it). Then it tips forward onto its belly and skids left (58.08–58.24), the body a low
// loaf, the band still a C round the head at the right end, never an arch above the body.
const rs7 = (pts) => {           // resample a polyline to 7 points by arc length (keys interpolate point by point)
  const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const out = [];
  for (let k = 0; k < 7; k++) {
    const s = d[d.length - 1] * k / 6; let i = 1; while (i < d.length - 1 && d[i] < s) i++;
    const u = (s - d[i - 1]) / Math.max(1e-6, d[i] - d[i - 1]); out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]);
  }
  return out;
};
const landPose = ({ b, br, bk = null, egg = 0, h, hr, hroll = 0, hk = null, tail, band, bw = 30, cut, cup: cp, crest = null, feet = [], near = null }) => {
  const pts = rs7(band), e = pts[6], p5 = pts[5], L = Math.hypot(e[0] - p5[0], e[1] - p5[1]) || 1, dv = [(e[0] - p5[0]) / L, (e[1] - p5[1]) / L];
  const [bx, by] = b;
  return {
    head: { x: h[0], y: h[1], rx: hr[0], ry: hr[1], roll: hroll, sq: 2.2, ...(hk ? { k: hk } : {}) },
    crown: [h[0], h[1] + hr[1] * 0.4],
    crest: crest ? { x: crest[0], y: crest[1], dir: crest[2], len: crest[3], w: 22, n: 3, fan: 0.6, curl: 0.15, a: 1 } : { x: h[0], y: h[1] - hr[1] * 0.8, dir: -1.3, len: 30, w: 22, n: 3, fan: 0.6, curl: 0.15, a: 0 },
    body: { x: bx, y: by, rx: br[0], ry: br[1], rot: 0, egg, ...(bk ? { k: bk } : {}) },
    tail: { base: tail[0], tip: tail[1], w: tail[2], n: 3 },
    wings: near ? [near, fold([bx - br[0] * 0.8, by + 10], [bx - br[0] * 0.85, by + 70], [bx - br[0] * 0.75, by + 120], -1, 13)]
      : [fold([bx + br[0] * 0.55, by - br[1] * 0.35], [bx + br[0] * 0.7, by + br[1] * 0.1], [bx + br[0] * 0.62, by + br[1] * 0.6], 1, 11), fold([bx - br[0] * 0.8, by + 10], [bx - br[0] * 0.85, by + 70], [bx - br[0] * 0.75, by + 120], -1, 13)],
    feet: [0, 1].map((i) => feet[i] ? foot(feet[i][0], feet[i][1], 15, 0, { rot: feet[i][2] || 0, seed: 2 + 3 * i }) : foot(bx, by + br[1], 14, 0, { a: 0, seed: 2 + 3 * i })),
    band: { pts, w: bw, dark: 1, tone: 0.3, front: true, arm: [e, [e[0] + dv[0] * 5, e[1] + dv[1] * 5], [e[0] + dv[0] * 10, e[1] + dv[1] * 10]], cut: { x: cut[0], y: cut[1], rx: cut[2], ry: cut[3], rot: 0 } },
    cups: [cup(bx, by - br[1] * 0.5, 30, 0.1, -1, false), cup(cp[0], cp[1], cp[2], 0.25, 1, true, cp[3] || 2.6)],
    bandage: { ...hide, x: h[0], y: h[1] },
  };
};
// 58.00 (held 58.04): the round back, head down at the lower right inside the band's C
export const L00 = landPose({
  b: [1362, 694], br: [150, 150], h: [1482, 735], hr: [60, 95],
  tail: [[1252, 612], [1226, 480], 56],
  band: [[1452, 606], [1530, 615], [1552, 700], [1532, 775], [1482, 810], [1438, 830]], cut: [1350, 700, 140, 155],
  cup: [1452, 832, 26], feet: [[1215, 745, 1.6]],
});
// 57.96: still diving, the whole bird turned ≈ 18° further clockwise, a little further right (tail tuft up at the top
// centre (1300–1400, 460–600), band round the lower right from (1530, 625) to (1450, 845))
export const L96 = rotatePoseP(L00, 0.31, 70, -10);
// 58.08: tipping forward, the tail swinging left
export const L08 = landPose({
  b: [1298, 705], br: [150, 148], h: [1440, 705], hr: [56, 105],
  tail: [[1178, 650], [1098, 552], 56],
  band: [[1372, 604], [1430, 588], [1470, 610], [1490, 660], [1492, 725], [1480, 770], [1450, 800], [1425, 820]], cut: [1290, 705, 148, 150],
  cup: [1426, 832, 26], feet: [[1212, 830, 1.2]],
});
// 58.12: down on its belly, skidding left: a low loaf, the tail flat out behind
export const L12 = landPose({
  b: [1240, 712], br: [152, 138], h: [1405, 718], hr: [62, 118],
  tail: [[1112, 690], [1004, 674], 60],
  band: [[1296, 604], [1350, 578], [1400, 600], [1435, 675], [1430, 750], [1410, 800], [1390, 838]], cut: [1225, 712, 150, 140],
  cup: [1384, 818, 28], feet: [[1205, 838, 0.3]],
});
export const L16 = landPose({
  b: [1190, 725], br: [158, 125], h: [1362, 702], hr: [55, 106],
  tail: [[1058, 745], [966, 750], 60],
  band: [[1225, 610], [1280, 578], [1315, 585], [1345, 615], [1370, 660], [1382, 720], [1380, 775], [1370, 800]], cut: [1170, 725, 150, 135],
  cup: [1370, 790, 28], crest: [1385, 602, -0.9, 26], feet: [[1285, 838, 0.2]],
});
export const L20 = landPose({
  b: [1135, 728], br: [162, 125], h: [1318, 705], hr: [52, 112],
  tail: [[992, 760], [910, 772], 56],
  band: [[1160, 610], [1225, 582], [1280, 600], [1320, 650], [1345, 725], [1345, 800], [1330, 830]], cut: [1120, 728, 150, 135],
  cup: [1328, 812, 28], crest: [1322, 596, -1.0, 28],
});
export const L24 = landPose({
  b: [1060, 740], br: [165, 118], h: [1248, 682], hr: [55, 118],
  tail: [[908, 772], [846, 792], 50],
  band: [[1090, 610], [1125, 570], [1165, 575], [1205, 605], [1230, 650], [1245, 690], [1260, 730], [1275, 760]], cut: [1050, 740, 150, 140],
  cup: [1272, 748, 30, 2.2], crest: [1222, 562, -1.6, 34],
});
function rotatePoseP(p, ang, dx, dy) {
  // (a copy of back2.js rotatePose, kept here so the pose table has no import cycle)
  const o = JSON.parse(JSON.stringify(p));
  const C = [o.body.x, o.body.y], ca = Math.cos(ang), sa = Math.sin(ang);
  const R = (q) => [C[0] + ca * (q[0] - C[0]) - sa * (q[1] - C[1]) + dx, C[1] + sa * (q[0] - C[0]) + ca * (q[1] - C[1]) + dy];
  const RO = (q) => { const r = R([q.x, q.y]); q.x = r[0]; q.y = r[1]; };
  RO(o.head); o.head.roll = (o.head.roll || 0) + ang;
  RO(o.body); o.body.rot = (o.body.rot || 0) + ang;
  RO(o.crest); o.crest.dir += ang; RO(o.bandage); o.crown = R(o.crown);
  o.cups.forEach((q) => { RO(q); q.rot = (q.rot || 0) + ang; });
  o.feet.forEach((q) => { RO(q); q.rot = (q.rot || 0) + ang; });
  o.wings.forEach((w) => { for (const k of ["S", "Wr", "T"]) w[k] = R(w[k]); });
  o.tail.base = R(o.tail.base); o.tail.tip = R(o.tail.tip);
  o.band.pts = o.band.pts.map(R); o.band.arm = o.band.arm.map(R); RO(o.band.cut); o.band.cut.rot = (o.band.cut.rot || 0) + ang;
  return o;
}
// RISE (58.28): pushing up, leaning right, the head rolled over to the right; the right wing low along the floor
export const RISE = {
  ...SIT,
  head: { x: 1110, y: 640, rx: 100, ry: 95, roll: 0.5, sq: 2.2 },
  crown: [1130, 590],
  crest: { x: 1142, y: 548, dir: -1.2, len: 44, w: 24, n: 3, fan: 0.6, curl: 0.1, a: 1 },
  body: { x: 1060, y: 762, rx: 180, ry: 110, rot: 0.05, egg: 0 },
  tail: { base: [960, 848], tip: [872, 872], w: 40, n: 3 },
  wings: [fold([1150, 702], [1230, 790], [1275, 848], 1, 11), fold([880, 760], [870, 820], [880, 860], -1, 13)],
  feet: [foot(1000, 872, 14, 0, { a: 0, seed: 2 }), foot(1180, 860, 16, 0, { a: 0, seed: 5 })],
  band: { pts: [[1000, 582], [1060, 612], [1110, 652], [1160, 692], [1190, 722]], w: 30, dark: 1, front: true, arm: [[1190, 722], [1194, 724], [1198, 726]] },
  cups: [cup(980, 600, 36, 0.1, -1, false), cup(1196, 726, 45, 0.4, 1, true, 0.6)],
  bandage: { ...hide, x: 1150, y: 640 },
};
// RISE2 (58.36): nearly up, head turned right in profile, the strap crossing the back of the head
export const RISE2 = {
  ...SIT,
  head: { x: 1062, y: 622, rx: 105, ry: 100, roll: 0.25, sq: 2.2 },
  crown: [1060, 560],
  crest: { x: 1016, y: 544, dir: -1.9, len: 50, w: 26, n: 3, fan: 0.6, curl: 0.1, a: 1 },
  body: { x: 1040, y: 772, rx: 168, ry: 104, rot: 0, egg: 0.05 },
  tail: { base: [920, 850], tip: [840, 880], w: 38, n: 3 },
  wings: [fold([1150, 700], [1220, 790], [1260, 858], 1, 11), fold([875, 750], [866, 810], [872, 860], -1, 13)],
  feet: [foot(1000, 872, 14, 0, { a: 0, seed: 2 }), foot(1200, 850, 18, 0, { a: 0, seed: 5 })],
  band: { pts: [[930, 562], [1000, 620], [1090, 660], [1150, 676], [1168, 676]], w: 30, dark: 1, front: true, arm: [[1168, 676], [1172, 675], [1176, 674]] },
  cups: [cup(900, 600, 36, 0.1, -1, false), cup(1170, 672, 50, 0.6, 1, true, 0.2)],
  bandage: { x: 1120, y: 596, size: 50, rot: 0.3, sx: 0.8, sy: 0.95, a: 0.9 },
};

// ---------------------------------------------------------------- getting up and dusting off (59.64–60.12)
// the head rolls over to the right and bows; the headphones ride back up onto the head (far cup at the upper left,
// near cup low on the right); the right wing sweeps out along the floor and back
export const BOW1 = {
  ...SIT,
  head: { x: 1040, y: 600, rx: 100, ry: 100, roll: 0.3, sq: 2.2 },
  crown: [1040, 540],
  crest: { x: 990, y: 522, dir: -2.0, len: 50, w: 26, n: 3, fan: 0.6, curl: 0.1, a: 1 },
  body: { x: 1030, y: 770, rx: 170, ry: 105, rot: 0, egg: 0.05 },
  tail: { base: [920, 858], tip: [850, 884], w: 38, n: 3 },
  wings: [kspread([1110, 716], [1185, 780], [1262, 850], 1, 11, { trail: [-0.35, 0.94], len: 78, n: 6, m: 4 }), fold([870, 750], [862, 810], [868, 860], -1, 13)],
  band: { pts: [[935, 560], [975, 630], [1030, 660], [1090, 664], [1130, 650]], w: 30, dark: 1, front: true, arm: [[1130, 650], [1140, 645], [1150, 640]] },
  cups: [cup(930, 560, 40, 0.1, -1, false), cup(1155, 634, 55, 0.65, 1, true, 0.3)],
  bandage: { x: 1100, y: 565, size: 55, rot: 0.3, sx: 0.9, sy: 0.95, a: 0.8 },
};
export const BOW2 = {
  ...BOW1,
  head: { x: 1080, y: 620, rx: 105, ry: 100, roll: 0.6, sq: 2.2 },
  crown: [1100, 560],
  crest: { x: 1075, y: 522, dir: -1.6, len: 50, w: 26, n: 3, fan: 0.6, curl: 0.1, a: 1 },
  body: { x: 1060, y: 760, rx: 180, ry: 110, rot: 0, egg: 0.05 },
  wings: [kspread([1150, 730], [1240, 792], [1330, 866], 1, 11, { trail: [-0.3, 0.95], len: 84, n: 6, m: 4 }), fold([870, 750], [862, 810], [868, 860], -1, 13)],
  band: { pts: [[990, 555], [1030, 515], [1110, 505], [1170, 560], [1195, 630]], w: 18, dark: 0.3, front: true, arm: [[1195, 630], [1198, 640], [1200, 650]] },
  cups: [cup(985, 560, 45, 0.1, -1, false, 0.6), cup(1208, 681, 52, 0.6, 1, true, 0.6)],
  bandage: { ...hide, x: 1150, y: 620 },
};
export const BOW3 = {
  ...BOW2,
  head: { x: 1150, y: 640, rx: 115, ry: 105, roll: 0.8, sq: 2.2 },
  crown: [1190, 580],
  crest: { x: 1190, y: 518, dir: -1.2, len: 46, w: 26, n: 3, fan: 0.6, curl: 0.1, a: 1 },
  body: { x: 1080, y: 760, rx: 185, ry: 105, rot: 0, egg: 0.05 },
  wings: [kspread([1195, 745], [1290, 808], [1390, 876], 1, 11, { trail: [-0.25, 0.97], len: 88, n: 6, m: 4 }), fold([890, 740], [880, 800], [885, 855], -1, 13)],
  band: { pts: [[1056, 542], [1133, 498], [1244, 520], [1294, 609], [1270, 690]], w: 16, dark: 0, front: true, arm: [[1270, 690], [1268, 695], [1266, 700]] },
  cups: [cup(1052, 560, 48, 0.1, -1, true, 0.8), cup(1240, 717, 52, 0.6, 1, true, 0.8)],
  bandage: { x: 1228, y: 628, size: 45, rot: 0.4, sx: 0.9, sy: 0.9, a: 0.7 },
};
export const BOW4 = {
  ...BOW3,
  tail: { base: [960, 820], tip: [925, 842], w: 32, n: 3 },
  head: { x: 1250, y: 610, rx: 125, ry: 115, roll: 0.9, sq: 2.2 },
  crown: [1290, 560],
  crest: { x: 1236, y: 484, dir: -1.5, len: 44, w: 26, n: 3, fan: 0.6, curl: 0.1, a: 1 },
  body: { x: 1110, y: 740, rx: 180, ry: 112, rot: 0, egg: 0.05 },
  wings: [kspread([1240, 730], [1325, 800], [1405, 880], 1, 11, { trail: [-0.25, 0.97], len: 90, n: 6, m: 4 }), fold([930, 720], [920, 790], [930, 850], -1, 13)],
  feet: [foot(1040, 830, 18, 6, { seed: 2 }), foot(1110, 830, 18, 6, { seed: 5 })],
  band: { pts: [[1140, 505], [1230, 475], [1330, 490], [1380, 570], [1370, 650]], w: 16, dark: 0, front: true, arm: [[1370, 650], [1368, 656], [1366, 662]] },
  cups: [cup(1120, 535, 50, 0.1, -1, true, 0.9), cup(1285, 705, 52, 0.55, 1, true, 0.9)],
  bandage: { x: 1265, y: 612, size: 55, rot: 0.1, sx: 0.9, sy: 0.9, a: 0.7 },
};
export const UP1 = {
  ...BOW4,
  tail: { base: [985, 790], tip: [955, 812], w: 30, n: 3 },
  head: { x: 1260, y: 585, rx: 125, ry: 112, roll: 0.7, sq: 2.2 },
  crown: [1280, 520],
  crest: { x: 1245, y: 444, dir: -1.6, len: 46, w: 26, n: 3, fan: 0.6, curl: 0.1, a: 1 },
  body: { x: 1100, y: 704, rx: 170, ry: 120, rot: 0, egg: 0.08 },
  wings: [kspread([1190, 680], [1290, 770], [1410, 868], 1, 11, { trail: [-0.3, 0.95], len: 92, n: 6, m: 4 }), fold([960, 660], [945, 740], [955, 810], -1, 13)],
  feet: [foot(1040, 822, 20, 10, { seed: 2 }), foot(1110, 822, 20, 10, { seed: 5 })],
  band: { pts: [[1150, 482], [1300, 440], [1400, 520], [1420, 620], [1380, 660]], w: 15, dark: 0, front: true, arm: [[1380, 660], [1376, 663], [1372, 666]] },
  cups: [cup(1125, 550, 52, 0.1, -1, true, 0.7), cup(1330, 665, 55, 0.55, 1, true, 0.7)],
  bandage: { x: 1295, y: 588, size: 55, rot: 0.1, sx: 0.9, sy: 0.9, a: 0.8 },
};
export const UP2 = {
  ...UP1,
  tail: { base: [1060, 790], tip: [1050, 815], w: 30, n: 3 },
  head: { x: 1250, y: 490, rx: 125, ry: 100, roll: 0.35, sq: 2.2 },
  crown: [1240, 420],
  crest: { x: 1160, y: 412, dir: -2.2, len: 50, w: 28, n: 4, fan: 0.7, curl: 0.1, a: 1 },
  body: { x: 1170, y: 690, rx: 180, ry: 135, rot: 0, egg: 0.1 },
  wings: [kspread([1255, 645], [1340, 730], [1445, 835], 1, 11, { trail: [-0.3, 0.95], len: 92, n: 6, m: 4 }), fold([1020, 610], [1000, 700], [1015, 800], -1, 13)],
  feet: [foot(1090, 832, 22, 12, { seed: 2 }), foot(1165, 832, 22, 12, { seed: 5 })],
  band: { pts: [[1130, 450], [1170, 390], [1290, 360], [1360, 400], [1380, 480]], w: 14, dark: 0, front: true, arm: [[1380, 480], [1380, 486], [1380, 492]] },
  cups: [cup(1140, 500, 60, 0.05, -1, true, 0.35), cup(1330, 567, 62, 0.6, 1, true, 0.35)],
  bandage: { x: 1272, y: 495, size: 55, rot: 0.4, sx: 0.9, sy: 0.95, a: 0.9 },
};
export const UP3 = {
  ...STAND,
  head: { x: 1150, y: 470, rx: 118, ry: 92, roll: 0.1, sq: 2.2 },
  crown: [1150, 400],
  crest: { x: 1060, y: 420, dir: Math.PI + 0.3, len: 52, w: 30, n: 4, fan: 0.7, curl: 0.1, a: 1 },
  body: { x: 1165, y: 680, rx: 165, ry: 125, rot: 0, egg: 0.1 },
  wings: [kspread([1240, 625], [1318, 700], [1400, 785], 1, 11, { trail: [-0.3, 0.95], len: 88, n: 6, m: 4 }), fold([1030, 592], [1014, 684], [1030, 790], -1, 13)],
  feet: [foot(1092, 818, 22, 14, { seed: 2 }), foot(1186, 822, 22, 14, { seed: 5 })],
  band: { pts: [[1030, 446], [1060, 370], [1160, 330], [1255, 360], [1282, 440]], w: 14, dark: 0, front: true, arm: [[1282, 440], [1282, 445], [1282, 450]] },
  cups: [cup(1035, 502, 65, 0.03, -1, true, 0.1), cup(1278, 512, 70, 0.7, 1, true, 0.1)],
  bandage: { x: 1195, y: 465, size: 62, rot: -0.6, sx: 1, sy: 0.95, a: 1 },
};

// ---------------------------------------------------------------- stepping right, wings open, the lift (61.08–62.28)
// a spread wing: shoulder S, tip T (the leading edge runs S -> Wr -> T); feathers hang from it toward `down`
const spread = (S, T, side, seed, o = {}) => {
  const Wr = o.Wr || [S[0] + (T[0] - S[0]) * 0.45, S[1] + (T[1] - S[1]) * 0.45 - 12];
  const L = Math.hypot(T[0] - S[0], T[1] - S[1]);
  return {
    layer: "front", open: 1, width: 36, S, Wr, T,
    dS: [0.25 * side, 1], dWr: [0.75 * side, 0.66], dT: [0.97 * side, -0.1],
    LP: [L * 0.42, L * 0.5], LS: L * 0.36, nP: 8, nS: 6, wP: 0.4, wS: 0.45, cov: 0.85, bend: 0.03 * side, seed, ...o,
  };
};
const fold2 = (S, Wr, T, side, seed) => ({ ...fold(S, Wr, T, side, seed), open: 1, dS: [0.25 * side, 1], dWr: [0.35 * side, 0.94], dT: [0.3 * side, 0.95], LP: [52, 46], LS: 50, nP: 5, nS: 4 });
const standBase = (hx, hy, bx, by, o = {}) => ({
  ...STAND,
  head: { x: hx, y: hy, rx: 122, ry: 92, roll: o.roll || 0, sq: 2.1 },
  crown: [hx, hy - 70],
  crest: { x: hx - 76, y: hy - 45, dir: Math.PI + 0.35, len: 86, w: 44, n: 5, fan: 0.45, curl: 0.14, a: 1 },
  body: { x: bx, y: by, rx: o.brx || 146, ry: o.bry || 126, rot: o.brot || 0, egg: 0.1 },
  tail: { base: [bx - 60, by + 80], tip: [bx - 168, by + 112], w: 50, n: 3 },
  // (fix pass 3, overlay at 60.60: the near cup sits ≈ 27 px further right and 18 px lower, the far cup 14 px lower)
  band: { pts: [[hx - 106, hy - 2], [hx - 80, hy - 80], [hx + 14, hy - 122], [hx + 120, hy - 104], [hx + 154, hy - 38]], w: 17, dark: 0, front: true, arm: [[hx + 154, hy - 38], [hx + 154, hy - 33], [hx + 154, hy - 28]] },
  cups: [cup(hx - 108, hy + 50, 58, 0.0, -1, true, o.roll || 0), cup(hx + 145, hy + 35, 64, 0.72, 1, true, o.roll || 0)],
  bandage: { x: hx + 44, y: hy - 8, size: 72, rot: -0.82, sx: 1, sy: 0.95, a: 1 },
  ...o.over,
});
// 61.08: stepping right, the wings starting to lift away from the flanks (motion-blurred in the source)
// (fix pass 3: the wings are already coming away from the flanks, hanging open ≈ 50° down and out: source 61.08 shoulders
// (1090, 600) / (1290, 600), tips (990, 720) / (1420, 760); stored before the pose fit)
export const STEP = standBase(1172, 468, 1185, 690, { over: {
  wings: [kspread([1264, 610], [1325, 692], [1396, 773], 1, 11, { len: 70, trail: [-0.5, 0.87], n: 6, m: 4 }), kspread([1060, 610], [1009, 671], [958, 732], -1, 13, { len: 66, trail: [0.5, 0.87], n: 6, m: 4 })],
  feet: [foot(1140, 818, 22, 14, { seed: 2 }), foot(1255, 818, 22, 14, { seed: 5 })],
} });
// 61.20 (drawn at 61.12, fix pass 3): wings thrown out level, the right one drooping a little (source 61.12: tips at
// (880, 580) and (1580, 660), motion-blurred)
// (fix pass 4: the smear spans x 909–1556 at 61.12 and the right wing tilts up ≈ 8°: tips pulled in, shorter feathers)
export const OPEN = standBase(1226, 472, 1232, 696, { over: {
  wings: [kspread([1310, 610], [1420, 594], [1500, 566], 1, 11, { len: 92, secLen: 1.1, layer: "back" }), kspread([1145, 610], [1060, 600], [992, 590], -1, 13, { len: 90, secLen: 1.1, layer: "back" })],
  feet: [foot(1180, 822, 22, 14, { seed: 2 }), foot(1300, 824, 22, 14, { seed: 5 })],
} });
// 61.36 (held 61.16–61.44): wings open wide and raised ≈ 25–30° in a V (source tips (960, 530), (1620, 540))
export const SPREAD = standBase(1252, 470, 1262, 694, { over: {
  wings: [kspread([1335, 600], [1458, 552], [1568, 494], 1, 11, { len: 112, secLen: 1.1, layer: "back" }), kspread([1170, 600], [1072, 552], [1002, 500], -1, 13, { len: 104, secLen: 1.1, layer: "back" })],
  feet: [foot(1222, 820, 22, 14, { seed: 2 }), foot(1330, 820, 22, 14, { seed: 5 })],
} });
// 61.16 (fix pass 4, overlay): the wings are only coming up: the V ≈ 12° flatter than the held SPREAD (the right tip
// ≈ 45 px lower, the left ≈ 18 px lower)
export const SPREAD0 = standBase(1252, 470, 1262, 694, { over: {
  wings: [kspread([1335, 600], [1458, 580], [1568, 544], 1, 11, { len: 112, secLen: 1.1, layer: "back" }), kspread([1170, 600], [1072, 562], [1002, 518], -1, 13, { len: 104, secLen: 1.1, layer: "back" })],
  feet: [foot(1222, 820, 22, 14, { seed: 2 }), foot(1330, 820, 22, 14, { seed: 5 })],
} });
// the lift (61.52–62.28), each key read on a 0.8x grid of its source frame: head centre / radii, body centre / radii,
// each wing's shoulder, wrist and visible tip, the feet. A kit wing's feathers run past T by about its len, so T is
// set back from the measured tip along the hand.
const kw = (S, Wr, tip, len, side, seed, o = {}) => {
  o = { layer: "back", ...o };
  const d = [tip[0] - Wr[0], tip[1] - Wr[1]], L = Math.hypot(d[0], d[1]) || 1, k = Math.min(0.85 * len, L * 0.6);
  return kspread(S, Wr, [tip[0] - d[0] / L * k, tip[1] - d[1] / L * k], side, seed, { len, secLen: 1.1, ...o });
};
// yaw (0..1): the head starting to turn to its right before the carry (62.16–62.24, overlays): the cups close in
// (far cup ≈ +45 px, near cup ≈ -35 px at yaw 1) and the near cup turns toward profile
const liftPose = ({ h, hr = [108, 90], b, br = [140, 128], wr, wl, feet, roll = 0, brot = 0, rc = 30, yaw = 0, over = null }) => {
  const [hx, hy] = h, re = rc - 62;      // rc: the near cup's centre below the head's centre (it rises as the head tips back)
  // (fix pass 4, 1:1 crops at 62.16 / 62.24: as the head turns to its right the near cup stays on the head's right
  // edge (≈ hx + 1.0 rx), grows and shows more of its pale shell; the far cup slides onto the head's LEFT edge and
  // narrows, so the head no longer reads as a symmetric back view)
  const nx = hx + hr[0] * (1.08 - 0.08 * yaw) + 4 - 4 * yaw, fx = hx - hr[0] * (0.98 - 0.05 * yaw);
  return {
    ...standBase(hx, hy, b[0], b[1], { roll, brot, brx: br[0], bry: br[1] }),
    head: { x: hx, y: hy, rx: hr[0], ry: hr[1], roll, sq: 2.05 },
    crest: { x: hx - hr[0] * (0.7 + 0.15 * yaw), y: hy - hr[1] * (0.45 - 0.1 * yaw), dir: Math.PI + 0.12 - 0.08 * yaw, len: 78, w: 40, n: 5, fan: 0.6 - 0.2 * yaw, curl: 0.12, a: 1 },
    band: { pts: [[fx + 8, hy - 8 * yaw], [hx - hr[0] * 0.7 + 10 * yaw, hy - 74 - 6 * yaw], [hx + 10 + 15 * yaw, hy - 108], [nx - 20, hy - 90 + (re + 32) * 0.4], [nx + 2, hy + re]], w: 16 + yaw, dark: 0, front: true, arm: [[nx + 2, hy + re], [nx + 2, hy + re + 5], [nx + 2, hy + re + 10]] },
    cups: [cup(fx, hy + 42, 54 - 8 * yaw, 0.0, -1, true, roll), cup(nx, hy + rc, 60 + 5 * yaw, 0.72 + 0.12 * yaw, 1, true, roll)],
    bandage: { x: hx + hr[0] * (0.38 - 0.05 * yaw), y: hy - 6, size: 64 + 6 * yaw, rot: -0.82, sx: 1, sy: 0.95, a: 1 },
    wings: [kw(...wr, 1, 11), kw(...wl, -1, 13)],
    feet: [foot(feet[0][0], feet[0][1], 24, 12, { seed: 2 }), foot(feet[1][0], feet[1][1], 24, 12, { seed: 5 })],
    skirt: 1,
    ...over,
  };
};
// (fix pass 3: heads, bodies re-read on 1x 50 px grids of each frame (snapshots/s19-fix1-src/lift-*.jpg): the heads
// sit ≈ 30 px lower and are larger, the bodies are rounder and taller, overlapping the head's underside)
export const LIFT1 = liftPose({ h: [1250, 470], hr: [120, 92], b: [1255, 672], br: [128, 130], wr: [[1390, 600], [1520, 560], [1661, 455], 105], wl: [[1150, 610], [1060, 560], [992, 517], 100], feet: [[1198, 818], [1352, 818]] });          // 61.52
export const LIFT2 = liftPose({ h: [1235, 460], hr: [125, 100], b: [1250, 670], br: [140, 132], wr: [[1380, 590], [1510, 530], [1647, 422], 108], wl: [[1120, 600], [1030, 560], [954, 516], 100], feet: [[1198, 816], [1348, 816]] });         // 61.64
export const LIFT3 = liftPose({ rc: 6, brot: -0.05, h: [1210, 440], hr: [128, 100], b: [1236, 660], br: [160, 146], wr: [[1360, 580], [1460, 500], [1557, 400], 105], wl: [[1110, 590], [990, 520], [889, 456], 100], feet: [[1186, 818], [1364, 796]] });          // 61.76
export const LIFT4 = liftPose({ rc: 3, brot: -0.07, h: [1182, 437], hr: [125, 104], b: [1230, 658], br: [160, 154], wr: [[1360, 570], [1450, 480], [1535, 365], 105], wl: [[1100, 580], [980, 520], [860, 477], 100], feet: [[1154, 808], [1366, 790]], roll: -0.04 });   // 61.92
export const LIFT5 = liftPose({ rc: -10, brot: -0.03, h: [1195, 442], hr: [127, 103], b: [1234, 662], br: [158, 148], wr: [[1370, 570], [1470, 480], [1566, 398], 105], wl: [[1110, 580], [990, 510], [875, 467], 100], feet: [[1175, 812], [1380, 778]], roll: -0.03 });   // 62.04
export const LIFT6 = liftPose({ yaw: 0.45, rc: 4, brot: 0.08, h: [1270, 412], hr: [132, 106], b: [1295, 642], br: [146, 158], wr: [[1440, 550], [1540, 450], [1626, 342], 108], wl: [[1160, 570], [1030, 500], [895, 455], 104], feet: [[1188, 806], [1404, 782]], roll: 0.02 });   // 62.16
export const LIFT7 = liftPose({ yaw: 1, rc: 6, brot: 0.1, h: [1340, 415], hr: [140, 104], b: [1350, 642], br: [150, 164], wr: [[1500, 560], [1610, 490], [1712, 411], 108], wl: [[1230, 580], [1110, 520], [1000, 474], 104], feet: [[1238, 826], [1425, 826]], roll: 0.03 });   // 62.24
// 62.28 (fix pass 4, 2x grid of the source frame): still seen from behind, the head turned three-quarter to its right: the
// near cup has come round onto the back of the head (centre (1462, 432)), the far cup is gone behind the head, the crest
// sweeps out on the left; the face is still hidden (the carry drawing, face and eye, takes over at 62.32)
export const LIFT8 = liftPose({ yaw: 1.6, rc: 24, brot: 0.08, h: [1405, 410], hr: [146, 100], b: [1390, 642], br: [152, 150],
  wr: [[1520, 520], [1630, 450], [1745, 378], 108], wl: [[1305, 520], [1160, 470], [1002, 426], 104], feet: [[1300, 822], [1428, 826]], roll: 0.02,
  over: {
    cups: [cup(1290, 452, 40, 0.0, -1, false, 0.02), cup(1462, 432, 66, 0.95, 1, true, 0.02)],
    band: { pts: [[1292, 336], [1330, 296], [1395, 284], [1440, 310], [1458, 366]], w: 16, dark: 0, front: true, arm: [[1458, 366], [1458, 371], [1458, 376]] },
    crest: { x: 1290, y: 368, dir: Math.PI + 0.05, len: 64, w: 40, n: 4, fan: 0.35, curl: 0.12, a: 1 },
    bandage: { x: 1388, y: 402, size: 62, rot: -1.2, sx: 0.55, sy: 0.95, a: 0.9 },
  } });

// ---------------------------------------------------------------- legs and feet (59.84–62.24)
// Measured on 2x gridded crops of each key's own frame (snapshots/s19-fix1-src/legs2-*.jpg), absolute frame px, NOT
// moved by the pose fits: per leg [ankle x, ankle y (where the tarsus meets the toes), top y (where it leaves the
// feathers), toe reach left, toe reach right, raised (0 planted .. 1 lifted, toes hanging), alpha].
// The source's tarsi are ≈10–12 px wide and 30–45 px long; the toes spread flat left and right of the ankle, 60–110 px
// across, with dark hooked claws.
const leg = (x, y, top, l, r, raised = 0, a = 1) => [x, y, top, l, r, raised, a];
export const LEGS = {
  BOW3: [leg(1035, 815, 800, 30, 20, 0, 0), leg(1130, 826, 812, 20, 20, 0, 0)],          // 59.80: still hidden
  BOW4: [leg(1035, 815, 796, 42, 22), leg(1130, 826, 806, 20, 22)],                       // 59.88
  UP1: [leg(1045, 810, 774, 34, 34), leg(1150, 826, 792, 25, 72)],                        // 59.96
  UP2: [leg(1088, 820, 782, 28, 42), leg(1155, 832, 784, 25, 70)],                        // 60.04
  UP3: [leg(1088, 827, 796, 33, 37), leg(1170, 828, 798, 35, 60)],                        // 60.12
  STAND: [leg(1087, 829, 798, 37, 38), leg(1182, 829, 798, 32, 73)],                      // 60.60
  STEP: [leg(1235, 830, 800, 18, 22, 0, 0.9), leg(1210, 826, 790, 45, 45)],               // 61.08 (one foot behind the other)
  OPEN: [leg(1232, 830, 796, 16, 22, 0, 0.9), leg(1214, 822, 784, 32, 48)],               // 61.12
  SPREAD: [leg(1190, 820, 786, 25, 45), leg(1300, 826, 790, 22, 60)],
  SPREAD0: [leg(1190, 820, 786, 25, 45), leg(1300, 826, 790, 22, 60)],                     // 61.36 (held 61.16–61.44; re-read on a 1x grid, row dx -15)
  LIFT1: [leg(1190, 816, 790, 35, 40), leg(1328, 819, 790, 28, 77)],                      // 61.52
  LIFT2: [leg(1180, 826, 800, 30, 30), leg(1325, 823, 800, 25, 80)],                      // 61.64
  LIFT3: [leg(1180, 827, 812, 30, 35), leg(1338, 792, 768, 20, 70, 1)],                   // 61.76: right foot lifted
  LIFT4: [leg(1180, 827, 815, 35, 35), leg(1344, 782, 764, 15, 75, 1)],                   // 61.92
  LIFT5: [leg(1175, 827, 815, 40, 40), leg(1350, 776, 760, 15, 75, 1)],                   // 62.04
  LIFT6: [leg(1182, 815, 790, 35, 25), leg(1388, 776, 758, 20, 80, 1)],                   // 62.16
  LIFT7: [leg(1238, 823, 782, 15, 22), leg(1414, 827, 786, 40, 70)],                      // 62.24
  LIFT8: [leg(1300, 818, 786, 22, 22), leg(1425, 822, 786, 40, 64)],                      // 62.28 (fix pass 4)
};

// ---------------------------------------------------------------- the near wing laid forward on the floor (58.20–58.32)
// fix pass 3, read on 1x 50 px grids (snapshots/s19-fix1-src/land-*.jpg): as the owl skids on its belly its right wing
// trails forward along the floor under the head, feathers fanned down onto the boards. Absolute frame px, applied
// after the pose fits (owl.js), replacing the folded near wing.
const floorWing = (S, Wr, T, seed = 11) => fan(S, Wr, T, 1, seed, { dS: [0.35, 0.94], dWr: [0.55, 0.84], dT: [0.8, 0.6], LP: [62, 70], LS: 58, nP: 6, nS: 5, wP: 0.36, wS: 0.4, cov: 0.6 });
export const NEARWING = {
  LIE2: floorWing([1205, 728], [1262, 768], [1318, 806]),     // 58.20
  // (fix pass 4: re-read on 1.4x 50 px grids (snapshots/s19-fix2-wingg.jpg): a broad soft wing lying on the floor, its
  // leading edge on top from the shoulder to the tip, its trailing edge along the boards)
  L20: { layer: "front", floor: 1, lead: [[1170, 740], [1262, 772], [1335, 838]], trail: [[1130, 850], [1250, 852], [1335, 842]], seed: 19 },
  L24: { layer: "front", floor: 1, lead: [[1105, 742], [1210, 780], [1300, 842]], trail: [[1060, 850], [1200, 852], [1300, 846]], seed: 19 },
  RISE: { layer: "front", floor: 1, lead: [[1100, 748], [1205, 782], [1290, 845]], trail: [[1060, 852], [1190, 852], [1290, 849]], seed: 19 },
  RISE2: { layer: "front", floor: 1, lead: [[1105, 748], [1200, 780], [1268, 846]], trail: [[1060, 852], [1180, 852], [1268, 850]], seed: 19 },
};
