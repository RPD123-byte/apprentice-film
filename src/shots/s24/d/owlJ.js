// s24 J beat (k68–91): the head-first dive to the lower right, a pair of scissors in each wing, glints on the tips.
// One held drawing (frame px at k70–81). Measured placement per frame (template match on the face against k75):
// k68–69 a small settle (the source's ECC fit: rotation −0.66° / −0.69° about the origin with a shift), k70–81 held,
// k82–91 drifting (+12.5, +10.1) px. Landmarks read off 1.2–2.2x grids of the source and of a line-reduced median of
// the aligned frames (a measuring aid only; nothing of it is stored). Drawn procedurally (s24/d/paint.js).
import { paintSpec } from "./paint.js";
import { J0, J1, J4 } from "./silJ.js";

export const J_ECC = { 68: [-0.661, -4.758, 12.382], 69: [-0.685, -5.025, 12.709] };
export const J_SHIFT = { 67: [3.9, 0.2], 82: [0.26, 0.11], 83: [1.8, 1.37], 84: [3.76, 2.92], 85: [4.72, 3.77], 86: [5.84, 4.69], 87: [7.97, 6.42], 88: [10.2, 8.23],
  89: [11.35, 9.11], 90: [12.52, 10.09], 91: [12.52, 10.09] };

// hand-read landmarks (frame px at k75), read off 1.6–3x grids of the source (fix pass 1)
const EYE_L = { up: [[1040, 524], [1070, 538], [1100, 552], [1125, 562], [1150, 552]], lo: [[1043, 527], [1046, 550], [1060, 570], [1080, 579], [1110, 580], [1130, 573], [1150, 553]],
  pupil: [1094, 558], pr: [8.5, 8.5], cat: [1097, 556, 2], lidWs: [0.1, 0.1, 0.1, 0.1], loWs: [1, 2.6, 3.4, 3.4, 3, 2.2, 0.8] };
const EYE_R = { up: [[1178, 561], [1200, 553], [1222, 542], [1236, 533]], lo: [[1180, 563], [1197, 577], [1223, 573], [1233, 553], [1236, 536]],
  pupil: [1203, 558], pr: [7, 7], cat: [1201, 555, 2.2], lidWs: [0.1, 0.1, 0.1, 0.1], loWs: [1, 3, 3, 2.4, 0.8] };
// the heavy brow-lids (one wedge each, the source's scowl), the fine inner corner
const BROW_L = [[1030, 516], [1055, 526], [1080, 538], [1100, 549], [1122, 561]];
const BROW_R = [[1175, 561], [1200, 552], [1222, 540], [1240, 520], [1252, 508]];
// fix pass 2 (re-read off a 4x grid of k75): the hooked upper mandible overhanging a narrow dark gape with the tongue
// in it, the pale lower mandible below, fine hatching (no smooth grey)
const BEAK = {
  upper: [[1120, 603], [1135, 598], [1150, 596], [1165, 595], [1178, 598], [1188, 612], [1192, 628], [1186, 645], [1176, 655], [1168, 660], [1165, 645], [1160, 630], [1148, 622], [1135, 613]],
  lower: [[1121, 610], [1130, 622], [1142, 636], [1154, 648], [1168, 660], [1160, 663], [1146, 655], [1132, 641], [1122, 623]], lowerV: 0.9,
  gape: [[1122, 607], [1140, 614], [1158, 624], [1166, 634], [1163, 643], [1152, 635], [1138, 623], [1126, 613]],
  tongue: [[1150, 630], [1160, 630], [1163, 639], [1157, 636]], tongueV: 0.35,
  lines: [[[1135, 601], [1143, 606], [1150, 612]], [[1143, 600], [1150, 605], [1157, 610]], [[1151, 599], [1157, 603], [1163, 607]], [[1178, 610], [1182, 625], [1180, 640]], [[1172, 612], [1175, 626], [1173, 640]]],
  crease: [[1166, 600], [1160, 603], [1160, 608]], ink: 3 };
const HP = {
  band: [[905, 398], [925, 322], [965, 280], [1015, 260], [1080, 253], [1150, 266], [1205, 296], [1238, 336], [1254, 392], [1262, 460]],
  cupL: { c: [884, 482], rx: 33, ry: 68, rot: 0.08, d: [40, 6], back: 1.3, cs: 1.14, faceV: 0.5, sideV: 0.38, cushV: 0.1, rings: [0.2, 0.42], seed: 11 },
  cupR: { c: [1266, 445], rx: 11, ry: 70, rot: 0.1, d: [-16, 0], back: 1, cs: 1.2, faceV: 0.34, sideV: 0.26, cushV: 0.08, rings: [0.4], hatch: 0.5, pleats: 20, seed: 12 },
  yoke: [[889, 383], [927, 378], [938, 420], [900, 428]],
};
// the crown: the head's smooth top contour (under the band) and the right ear tuft
const CROWN = [[975, 362], [992, 357], [1012, 351], [1050, 342], [1093, 337], [1100, 333], [1104, 339], [1147, 349], [1162, 351], [1178, 341], [1186, 330]];
// the two pairs: the upper hangs from the wing's hand (its loops in the fingers), the lower is held in the fist.
// Each half: the blade on one side of the pivot, its loop on the other.
const SC_U = { P: [1416, 512], h: [{ T: [1586, 690], hole: [1336, 442, 58, 64, 10] }, { T: [1482, 756], hole: [1420, 388, 26, 56, 15] }], G: [[1575, 617, 62]] };
const SC_L = { P: [1108, 800], h: [{ T: [1392, 858], hole: [975, 732, 50, 44, -20] }, { T: [1396, 745], hole: [1030, 800, 76, 36, 6] }], G: [[1325, 745, 64]] };
// the fist's fingers curl through the lower pair's loops (read off 2x grids of k75)
const FIST_F = [
  [[928, 700], [947, 700], [961, 724], [970, 760], [962, 776], [947, 768], [937, 738]],
  [[992, 815], [1014, 816], [1023, 840], [1014, 868], [999, 878], [989, 858], [992, 835]],
];
const WING_EDGES = [[[840, 780], [890, 805], [940, 830], [972, 850]], [[870, 830], [915, 850], [955, 876]], [[900, 715], [925, 755], [955, 780], [985, 792]]];
const FIST = [{ r: [872, 706], t: [968, 716], w: 26, bend: -0.05 }, { r: [872, 848], t: [970, 876], w: 26, bend: 0.04 }, { r: [866, 808], t: [986, 831], w: 30, bend: 0.03 }, { r: [866, 768], t: [982, 790], w: 30, bend: 0.02 }];
// covert rows (rounded tips)
const COV_UP = [[1096, 194], [1149, 188], [1196, 213], [1236, 213], [1267, 232], [1317, 247], [1355, 279]];
const COV_LO = [[605, 568], [624, 645], [666, 706], [712, 745], [766, 775], [820, 802], [881, 822]];

export const SPEC_J = { layers: [
  // body, tail, feet, lower wing and head (one silhouette); the crown and the cheek line are inked by hand below
  { type: "sil", ...J0, base: 0.96, rim: 0.8, depth: 34, blur: 24, ink: 3, inkSkip: [[960, 300, 1215, 368], [830, 530, 990, 700]],
    hatch: [{ center: [800, 320], rx: 230, ry: 160, r0: 0.55, gain: 1.8, box: [570, 170, 1020, 480], dens: 1.8, v: 0.42, seed: 12 },
      { mode: "dir", dir: [-0.9, -0.44], box: [440, 400, 1000, 880], dens: 2, len: [18, 46], w: [0.7, 1.2], v: 0.5, alpha: 0.55, seed: 18 },
      { mode: "dir", dir: [-0.78, -0.62], box: [440, 10, 760, 240], dens: 3, len: [20, 50], w: [0.7, 1.1], v: 0.45, alpha: 0.6, seed: 19 }] },
  { type: "fine", clipPoly: J0.pts, center: [1080, 500], rx: 180, ry: 170, r0: 0.72, gain: 2.5, max: 1, box: [860, 520, 1270, 690], spacing: 5, len: [8, 20], w: [0.5, 0.9], v: 0.55, alpha: 0.6, seed: 17 },
  // tail separations, lower-wing separations and its covert row, the wing's upper edge against the body
  { type: "notch", notch: [[546, 81], [517, 85], [610, 226], [613, 240], [699, 180], [696, 174], [604, 63]], dir: [0.6, 0.8], len: 90, w: 2.6 },
  { type: "notch", notch: [[616, 498], [568, 525], [585, 616], [631, 692], [699, 760], [738, 794], [790, 822], [849, 830], [917, 828]], root: [960, 560], len: 70, w: 2.8, bend: 0.04 },
  { type: "notch", notch: [[663, 417], [728, 425], [716, 434], [683, 441], [653, 456]], dir: [0.95, 0.3], len: 50, w: 2.4 },
  { type: "row", clip: J0.pts, tips: COV_LO, roots: [[760, 470], [840, 560], [920, 650], [990, 720]], w: [56, 46], side: "l", from: 0.4, hook: 0.35, seed: 41 },
  { type: "ink", pts: [[660, 452], [730, 440], [800, 460], [850, 500], [880, 560], [920, 640], [966, 700]], w: 3, a: 0.4, b: 0.5 },
  // the wing's leading edge under the cheek (a tapered line, not the slit's outline)
  { type: "stroke", pts: [[840, 545], [844, 580], [853, 620], [872, 654], [902, 677], [940, 688], [985, 692]], ws: [0.8, 2.2, 3.4, 4.2, 3.6, 2.4, 0.8] },
  // the neck line and the head's lower outline over the body
  { type: "ink", pts: [[842, 551], [860, 610], [900, 650], [960, 675], [1040, 690], [1120, 682]], w: 2.6, a: 0.4, b: 0.4 },
  // upper wing
  { type: "sil", ...J1, base: 0.95, rim: 0.82, depth: 20, blur: 16, ink: 2.6,
    hatch: { mode: "dir", dir: [-0.85, -0.52], box: [920, 80, 1430, 460], dens: 2.2, len: [18, 46], w: [0.7, 1.2], v: 0.5, alpha: 0.55, seed: 20 } },
  { type: "notch", notch: [[1118, 157], [1059, 173], [1049, 207], [1017, 221], [986, 240], [1366, 291], [1310, 239], [1273, 207], [1210, 181]], root: [1330, 420], len: 70, w: 2.8, bend: 0.04 },
  { type: "row", clip: J1.pts, tips: COV_UP, roots: [[1180, 300], [1290, 330], [1400, 390]], w: [56, 44], side: "r", from: 0.4, hook: 0.35, seed: 42 },
  // the wing's feathers seen between the band and the crown (white, no outline), the gap to the crown filled, then
  // one smooth crown contour with the right ear tuft
  { type: "poly", pts: J4.pts, v: 0.95, ink: 0 },
  { type: "poly", pts: [[1014, 300], [1049, 339], [1089, 339], [1097, 332], [1155, 352], [1180, 340], [1192, 320], [1197, 349], [1177, 360], [1131, 352], [1043, 348], [989, 364]], v: 0.95, ink: 0 },
  { type: "fine", clipPoly: J4.pts, dir: [0.55, 0.83], box: [1010, 270, 1200, 355], spacing: 5, len: [14, 30], w: [0.5, 1.0], v: 0.5, alpha: 0.6, seed: 21, tone: 0.8 },
  { type: "stroke", pts: [[1007, 300], [1025, 322], [1043, 340]], ws: [0.5, 2.4, 1.2] },
  { type: "stroke", pts: CROWN, ws: [1, 2.6, 3, 3, 2.8, 2.2, 2.6, 3, 2.6, 2, 1] },
  { type: "tuft", pts: [[1205, 292], [1202, 316], [1196, 342], [1182, 346], [1186, 316]], out: [0, 0.5], ink: 2.4, inner: 1, seed: 6 },
  { type: "tuft", pts: [[952, 318], [976, 330], [996, 348], [981, 357], [965, 345]], out: [0, 0.5], ink: 2.2, inner: 1, seed: 7 },
  { type: "stroke", pts: [[975, 362], [985, 356], [998, 355]], ws: [0.5, 2, 0.5] },
  { type: "cup3", ...HP.cupR },
  { type: "bandage", x: 1072, y: 412, size: 102, rot: 0.79, cross: 1.57, sx: 1, sy: 1.05 },
  // the face: grey feathering above the brows, the eyes, the heavy brow-lids, the beak
  { type: "fine", clipPoly: J0.pts, dir: [0.5, 0.87], box: [1030, 470, 1160, 530], spacing: 6, len: [8, 18], w: [0.5, 1], v: 0.45, alpha: 0.6, seed: 22, tone: 0.8 },
  { type: "eye2", ...EYE_L }, { type: "eye2", ...EYE_R },
  { type: "stroke", pts: BROW_L, ws: [1.5, 6, 9, 9.5, 6] },
  { type: "stroke", pts: [[1120, 560], [1137, 556], [1153, 550]], ws: [2.2, 1.8, 0.6] },
  { type: "stroke", pts: BROW_R, ws: [2, 7, 8.5, 5, 1] },
  { type: "hbeak", ...BEAK },
  { type: "band", pts: HP.band, w: 22, v: 0.26, ridge: 0.7 },
  { type: "yoke", pts: HP.yoke, v: 0.42 },
  { type: "cup3", ...HP.cupL },
  // the upper pair and the hand's fingers round its loops
  { type: "scissors", ...SC_U, w: 38, bw: 62, ring: 12 },
  // the hand (fix pass 2, re-read off a 2x grid of k75): the wing tip's mass above the loops, then four tapered
  // feather-fingers hanging down in front of the loops (the dark holes show either side of them), a feather tip below,
  // and the loops' lower rims passing in front of the fingers
  { type: "quills", list: [{ r: [1424, 360], t: [1433, 452], w: 22, bend: 0.08 }, { r: [1388, 370], t: [1393, 484], w: 28, bend: 0.05 }, { r: [1316, 368], t: [1326, 474], w: 28, bend: -0.06 },
    { r: [1352, 372], t: [1358, 494], w: 30, bend: 0.03 }, { r: [1366, 466], t: [1352, 548], w: 20, bend: -0.06 }], ink: 2.2, lines: 4, lineV: 0.4, lineLen: [0.4, 0.85], tipPow: 0.6, widest: 0.35, rootK: 0.9, seed: 43 },
  { type: "lobe", pts: [[1292, 382], [1300, 352], [1330, 336], [1380, 331], [1415, 345], [1438, 372], [1440, 398], [1420, 404], [1385, 400], [1350, 404], [1315, 408]], ink: 2.4, rim: 0.82, depth: 8, blur: 7, light: [-0.6, -0.8],
    strokes: [[[1310, 360], [1340, 352], [1370, 350]], [[1330, 380], [1360, 374], [1395, 372]]] },
  { type: "ringArc", c: [1336, 442], rx: 35, ry: 38, rot: 0.17, a0: 0.35, a1: 2.7, w: 7, v: 0.9 },
  { type: "ringArc", c: [1420, 388], rx: 19, ry: 34, rot: 0.26, a0: 0.2, a1: 2.2, w: 7, v: 0.9 },
  // the lower pair and the feathered fist over its loops
  { type: "scissors", ...SC_L, w: 38, bw: 64, ring: 12 },
  ...WING_EDGES.map((pts) => ({ type: "stroke", pts, ws: [0.6, 2.8, 3, 1] })),
  ...FIST_F.map((pts) => ({ type: "lobe", pts, ink: 3, rim: 0.74, depth: 7, blur: 5, light: [-0.6, -0.8] })),
  { type: "ringArc", c: [975, 732], rx: 32, ry: 28, rot: -0.35, a0: -0.6, a1: 1.6, w: 6 },
] };

let LAYER = null;
export function owlJLayer() {
  if (!LAYER) { LAYER = document.createElement("canvas"); LAYER.width = 2206; LAYER.height = 946; paintSpec(LAYER.getContext("2d", { willReadFrequently: true }), SPEC_J); }
  return LAYER;
}
export function releaseOwlJ() { LAYER = null; }
