// s19 back-view key poses, each measured on its own source frame (1x–2x gridded crops, frame px). All share one
// structure (back2.js) so neighbouring keys interpolate. Wings are fans: folded = feathers hanging down the flank.
const fold = (S, Wr, T, side, seed, o = {}) => ({
  layer: "front", open: 0, width: 36, S, Wr, T, dS: [0.25 * side, 1], dWr: [0.3 * side, 0.95], dT: [0.25 * side, 0.97],
  LP: [42, 34], LS: 44, nP: 4, nS: 3, wP: 0.5, wS: 0.55, cov: 0.9, bend: 0.05 * side, seed, ...o,
});
// an open wing drawn by the kit (back2.js kitWing): shoulder S, wrist Wr, tip T, feathers hanging toward trail
const kspread = (S, Wr, T, side, seed, o = {}) => ({ layer: "front", open: 1, kit: true, S, Wr, T, trail: [0.15 * side, 1], len: 95, n: 7, m: 5, spread: 1, fw: 1.1, cov: 2, seed, point: 0.55, secLen: 1, ...o });
const cup = (x, y, r, open, side, front = true, rot = 0) => ({ x, y, r, rot, open, side, front });
const foot = (x, y, size, leg, o = {}) => ({ x, y, size, leg, sy: 0.6, rot: 0, spread: 1.1, seed: 3, a: 1, ...o });

// SIT (58.80): sitting, back to us, head turned right to the card; the headphones knocked down round its neck
// (a dark strap from the left of the neck under the head and up into the near cup on the face side)
export const SIT = {
  head: { x: 940, y: 622, rx: 106, ry: 100, roll: 0, sq: 2.2 },
  crown: [960, 560],
  crest: { x: 872, y: 598, dir: Math.PI + 0.3, len: 66, w: 38, n: 5, fan: 0.6, curl: 0.12, a: 1 },
  body: { x: 986, y: 790, rx: 140, ry: 98, rot: 0, egg: 0.08 },
  tail: { base: [905, 860], tip: [830, 886], w: 34, n: 3 },
  wings: [
    fold([1040, 706], [1085, 772], [1108, 846], 1, 11),
    fold([852, 740], [846, 800], [850, 858], -1, 13, { LP: [30, 26], LS: 30 }),
  ],
  feet: [foot(1000, 872, 14, 0, { a: 0, seed: 2 }), foot(1138, 806, 20, 0, { rot: -1.75, seed: 5 })],
  band: { pts: [[840, 700], [890, 730], [945, 745], [995, 726], [1030, 695]], w: 20, dark: 1, front: true, arm: [[1030, 695], [1045, 668], [1058, 640]] },
  cups: [cup(840, 640, 40, 0.1, -1, false), cup(1052, 598, 54, 0.7, 1, true, 0.05)],
  bandage: { x: 976, y: 588, size: 62, rot: 0.45, sx: 1, sy: 0.95, a: 1 },
};
// STAND (60.60): standing, back to us, looking up at the card; headphones on: band over the crown, the near cup on
// the right (shell rx 45, ry 72), the far cup seen edge-on beside the head's left edge
export const STAND = {
  head: { x: 1126, y: 470, rx: 114, ry: 92, roll: 0, sq: 2.2 },
  crown: [1125, 400],
  crest: { x: 1052, y: 425, dir: Math.PI + 0.35, len: 70, w: 40, n: 5, fan: 0.6, curl: 0.12, a: 1 },
  body: { x: 1150, y: 690, rx: 150, ry: 124, rot: 0, egg: 0.1 },
  tail: { base: [1150, 790], tip: [1152, 828], w: 30, n: 3 },
  wings: [
    fold([1215, 600], [1250, 690], [1272, 782], 1, 11),
    fold([1032, 592], [1016, 684], [1032, 790], -1, 13),
  ],
  feet: [foot(1100, 816, 28, 14, { seed: 2 }), foot(1225, 812, 28, 14, { seed: 5 })],
  band: { pts: [[1020, 455], [1045, 385], [1140, 348], [1235, 368], [1262, 425]], w: 13, dark: 0, front: true, arm: [[1262, 425], [1262, 430], [1262, 435]] },
  cups: [cup(1022, 508, 58, 0.0, -1, true), cup(1238, 488, 64, 0.72, 1, true)],
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
  band: { pts: [[1440, 612], [1500, 640], [1545, 720], [1530, 800], [1480, 848]], w: 22, dark: 1, front: true, arm: [[1480, 848], [1470, 850], [1460, 852]] },
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
  band: { pts: [[1370, 602], [1440, 622], [1480, 700], [1470, 790], [1440, 842]], w: 22, dark: 1, front: true, arm: [[1440, 842], [1432, 846], [1424, 850]] },
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
  band: { pts: [[1300, 600], [1366, 626], [1400, 700], [1395, 790], [1360, 850]], w: 22, dark: 1, front: true, arm: [[1360, 850], [1352, 852], [1344, 854]] },
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
  band: { pts: [[1210, 612], [1276, 622], [1302, 700], [1300, 790], [1280, 846]], w: 22, dark: 1, front: true, arm: [[1280, 846], [1272, 848], [1264, 850]] },
  cups: [cup(1200, 612, 36, 0.1, -1, false), cup(1272, 846, 40, 0.3, 1, false, 3.0)],
  bandage: { ...hide, x: 1270, y: 740 },
};
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
  band: { pts: [[1000, 582], [1060, 612], [1110, 652], [1160, 692], [1190, 722]], w: 21, dark: 1, front: true, arm: [[1190, 722], [1194, 724], [1198, 726]] },
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
  band: { pts: [[930, 562], [1000, 620], [1090, 660], [1150, 676], [1168, 676]], w: 21, dark: 1, front: true, arm: [[1168, 676], [1172, 675], [1176, 674]] },
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
  band: { pts: [[935, 560], [975, 630], [1030, 660], [1090, 664], [1130, 650]], w: 21, dark: 1, front: true, arm: [[1130, 650], [1140, 645], [1150, 640]] },
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
  band: { pts: [[1030, 440], [1060, 370], [1160, 330], [1250, 360], [1290, 430]], w: 13, dark: 0, front: true, arm: [[1290, 430], [1290, 435], [1290, 440]] },
  cups: [cup(1035, 490, 65, 0.03, -1, true, 0.1), cup(1265, 495, 70, 0.7, 1, true, 0.1)],
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
  head: { x: hx, y: hy, rx: 122, ry: 92, roll: o.roll || 0, sq: 2.4 },
  crown: [hx, hy - 70],
  crest: { x: hx - 76, y: hy - 45, dir: Math.PI + 0.35, len: 68, w: 40, n: 5, fan: 0.6, curl: 0.12, a: 1 },
  body: { x: bx, y: by, rx: o.brx || 146, ry: o.bry || 126, rot: o.brot || 0, egg: 0.1 },
  tail: { base: [bx, by + 100], tip: [bx + 2, by + 138], w: 30, n: 3 },
  band: { pts: [[hx - 106, hy - 15], [hx - 80, hy - 85], [hx + 14, hy - 122], [hx + 109, hy - 102], [hx + 136, hy - 45]], w: 13, dark: 0, front: true, arm: [[hx + 136, hy - 45], [hx + 136, hy - 40], [hx + 136, hy - 35]] },
  cups: [cup(hx - 108, hy + 36, 58, 0.0, -1, true, o.roll || 0), cup(hx + 118, hy + 16, 64, 0.72, 1, true, o.roll || 0)],
  bandage: { x: hx + 44, y: hy - 8, size: 72, rot: -0.82, sx: 1, sy: 0.95, a: 1 },
  ...o.over,
});
// 61.08: stepping right, the wings starting to lift away from the flanks (motion-blurred in the source)
export const STEP = standBase(1172, 468, 1185, 690, { over: {
  wings: [fold2([1245, 610], [1300, 690], [1350, 770], 1, 11), fold2([1100, 610], [1050, 690], [1000, 740], -1, 13)],
  feet: [foot(1140, 818, 22, 14, { seed: 2 }), foot(1255, 818, 22, 14, { seed: 5 })],
} });
// 61.20: wings thrown open, rising a little
export const OPEN = standBase(1226, 472, 1232, 696, { over: {
  wings: [kspread([1310, 600], [1440, 572], [1600, 540], 1, 11, { len: 112, secLen: 1.1 }), kspread([1145, 600], [1040, 572], [970, 530], -1, 13, { len: 104, secLen: 1.1 })],
  feet: [foot(1180, 822, 22, 14, { seed: 2 }), foot(1300, 824, 22, 14, { seed: 5 })],
} });
// 61.36 (held 61.28–61.44): wings open wide, tips level with the head
export const SPREAD = standBase(1252, 470, 1262, 694, { over: {
  wings: [kspread([1335, 600], [1460, 560], [1575, 510], 1, 11, { len: 112, secLen: 1.1 }), kspread([1170, 600], [1070, 560], [1000, 525], -1, 13, { len: 104, secLen: 1.1 })],
  feet: [foot(1222, 820, 22, 14, { seed: 2 }), foot(1330, 820, 22, 14, { seed: 5 })],
} });
// the lift (61.52–62.28), each key read on a 0.8x grid of its source frame: head centre / radii, body centre / radii,
// each wing's shoulder, wrist and visible tip, the feet. A kit wing's feathers run past T by about its len, so T is
// set back from the measured tip along the hand.
const kw = (S, Wr, tip, len, side, seed, o = {}) => {
  const d = [tip[0] - Wr[0], tip[1] - Wr[1]], L = Math.hypot(d[0], d[1]) || 1, k = Math.min(0.85 * len, L * 0.6);
  return kspread(S, Wr, [tip[0] - d[0] / L * k, tip[1] - d[1] / L * k], side, seed, { len, secLen: 1.1, ...o });
};
const liftPose = ({ h, hr = [108, 90], b, br = [140, 128], wr, wl, feet, roll = 0, brot = 0 }) => {
  const [hx, hy] = h;
  return {
    ...standBase(hx, hy, b[0], b[1], { roll, brot, brx: br[0], bry: br[1] }),
    head: { x: hx, y: hy, rx: hr[0], ry: hr[1], roll, sq: 2.4 },
    crest: { x: hx - hr[0] * 0.66, y: hy - hr[1] * 0.5, dir: Math.PI + 0.35, len: 62, w: 36, n: 5, fan: 0.6, curl: 0.12, a: 1 },
    band: { pts: [[hx - hr[0] * 0.9, hy - 12], [hx - hr[0] * 0.7, hy - 78], [hx + 10, hy - 106], [hx + hr[0] * 0.92, hy - 88], [hx + hr[0] * 1.12, hy - 38]], w: 12, dark: 0, front: true, arm: [[hx + hr[0] * 1.12, hy - 38], [hx + hr[0] * 1.12, hy - 33], [hx + hr[0] * 1.12, hy - 28]] },
    cups: [cup(hx - hr[0] * 0.98, hy + 30, 54, 0.0, -1, true, roll), cup(hx + hr[0] * 1.08, hy + 14, 60, 0.72, 1, true, roll)],
    bandage: { x: hx + hr[0] * 0.38, y: hy - 6, size: 64, rot: -0.82, sx: 1, sy: 0.95, a: 1 },
    wings: [kw(...wr, 1, 11), kw(...wl, -1, 13)],
    feet: [foot(feet[0][0], feet[0][1], 24, 12, { seed: 2 }), foot(feet[1][0], feet[1][1], 24, 12, { seed: 5 })],
  };
};
export const LIFT1 = liftPose({ h: [1255, 455], b: [1270, 688], br: [136, 124], wr: [[1390, 600], [1520, 560], [1661, 455], 105], wl: [[1150, 610], [1060, 560], [992, 517], 100], feet: [[1198, 818], [1352, 818]] });          // 61.52
export const LIFT2 = liftPose({ h: [1250, 430], b: [1242, 680], br: [150, 126], wr: [[1380, 590], [1510, 530], [1647, 422], 108], wl: [[1120, 600], [1030, 560], [954, 516], 100], feet: [[1198, 816], [1348, 816]] });         // 61.64
export const LIFT3 = liftPose({ h: [1222, 415], b: [1236, 672], br: [135, 130], wr: [[1360, 580], [1460, 500], [1557, 400], 105], wl: [[1110, 590], [990, 520], [889, 456], 100], feet: [[1186, 818], [1364, 796]] });          // 61.76
export const LIFT4 = liftPose({ h: [1205, 405], b: [1235, 675], br: [144, 128], wr: [[1360, 570], [1450, 480], [1535, 365], 105], wl: [[1100, 580], [980, 520], [860, 477], 100], feet: [[1154, 808], [1366, 790]], roll: -0.04 });   // 61.92
export const LIFT5 = liftPose({ h: [1215, 402], b: [1250, 670], br: [150, 130], wr: [[1370, 570], [1470, 480], [1566, 398], 105], wl: [[1110, 580], [990, 510], [875, 467], 100], feet: [[1175, 812], [1380, 778]], roll: -0.03 });   // 62.04
export const LIFT6 = liftPose({ h: [1290, 387], b: [1295, 648], br: [150, 128], wr: [[1440, 550], [1540, 450], [1626, 342], 108], wl: [[1160, 570], [1030, 500], [895, 455], 104], feet: [[1188, 806], [1404, 782]], roll: 0.02 });   // 62.16
export const LIFT7 = liftPose({ h: [1350, 382], b: [1362, 645], br: [150, 124], wr: [[1500, 560], [1610, 490], [1712, 411], 108], wl: [[1230, 580], [1110, 520], [1000, 474], 104], feet: [[1238, 826], [1425, 826]], roll: 0.03 });   // 62.24
