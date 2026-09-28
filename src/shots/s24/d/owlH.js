// s24 H beat (k54, k57–62): the owl holding up two pairs of scissors — the left wing thrust out with a pair upright in
// its fist (a glint on the tip), the right wing arched overhead holding the other pair by its loops. One held drawing
// (frame px at k57; k54 is the same drawing 0.33 px left and 0.45 px up — template match). Landmarks read off 1x–2x
// grids of the source. Drawn procedurally (s24/d/paint.js).
import { paintSpec } from "./paint.js";
import { H0, H1 } from "./silH.js";

// hand-read landmarks (frame px at k57), re-read off 2–3x grids of the source in fix pass 1
const EYE_R = { up: [[1192, 454], [1207, 434], [1227, 421], [1253, 407], [1281, 391]], lo: [[1197, 455], [1220, 459], [1241, 459], [1260, 452], [1270, 438], [1274, 418], [1279, 397]],
  pupil: [1229, 431], pr: [13.5, 13], cat: [1235, 423, 4], lidWs: [3, 7.5, 8, 6, 3, 1], loWs: [1, 2.4, 2.8, 2.6, 2.2, 1.4, 0.6] };
const EYE_L = { up: [[1062, 481], [1080, 475], [1100, 474], [1118, 478], [1134, 486]], lo: [[1070, 492], [1080, 503], [1093, 509], [1108, 511], [1123, 506], [1132, 496]],
  pupil: [1103, 484], pr: [11, 11], cat: [1108, 481, 3.5], lidWs: [2, 5, 6, 5.5, 2], loWs: [0.6, 1.8, 2.2, 2.2, 1.6, 0.6] };
// the scowl: the right brow runs up from the frown crease over the beak; the left brow slants down to it
const BROW_R = [[1187, 446], [1196, 428], [1207, 410], [1218, 392], [1231, 371]];
const CREASE = [[1152, 440], [1160, 447], [1171, 450], [1182, 447], [1189, 441]];
const BROW_L = [[1058, 440], [1082, 445], [1105, 453], [1127, 467]];
// fix pass 2 (re-read off a 4x grid of k58): shield-shaped upper mandible, hooked tip overhanging the small gape (a
// pale tongue in it), the heavy inner ridge, fine hatching on the shadow side (no smooth grey)
const BEAK = {
  upper: [[1143, 503], [1150, 491], [1170, 489], [1190, 492], [1203, 488], [1211, 494], [1209, 512], [1201, 532], [1192, 548], [1184, 560], [1180, 548], [1176, 544], [1168, 553], [1156, 543], [1146, 525]],
  gape: [[1169, 543], [1178, 533], [1188, 540], [1187, 557], [1180, 558], [1175, 551]],
  tongue: [[1172, 543], [1178, 539], [1181, 546], [1175, 549]], tongueV: 0.72,
  ridge: [[1202, 492], [1195, 506], [1189, 520], [1184, 533], [1181, 540]], ridgeWs: [2, 4.5, 5, 4.5, 2.5],
  lines: [[[1180, 497], [1174, 509], [1168, 521]], [[1186, 498], [1179, 512], [1173, 526]], [[1192, 500], [1185, 514], [1178, 530]], [[1161, 500], [1157, 512], [1155, 522]]],
  crease: [[1170, 503], [1166, 507], [1167, 512]], ink: 3 };
const BEAK_HATCH = [];
const HP = {
  band: [[1010, 420], [1016, 330], [1045, 255], [1095, 200], [1160, 168], [1230, 160], [1295, 178], [1340, 212], [1360, 240]],
  // the near cup (3/4 view, face plate toward the viewer's upper right) and the far cup nearly edge-on
  cupR: { c: [1412, 330], rx: 45, ry: 70, rot: -0.6, d: [-44, 24], back: 1.25, cs: 1.14, faceV: 0.5, sideV: 0.36, cushV: 0.1, rings: [0.2, 0.45], seed: 17 },
  cupL: { c: [1010, 478], rx: 12, ry: 62, rot: 0.06, d: [16, 0], back: 1, cs: 1.25, faceV: 0.16, sideV: 0.14, cushV: 0.1, rings: [0.45], hatch: 0.6, pleats: 22, seed: 18 },
  yoke: [[1338, 238], [1372, 222], [1398, 262], [1366, 280]],
};
// the upright pair: its loops sit on the fist (the top finger passes through the right loop)
// fix pass 2: blades re-measured by row scans of k57 (bright > 150 at y 170–340): the tips at (591, 152) / (634, 146),
// blades ≈ 28 px wide, the glint at (632, 150)
const SC_UP = { P: [564, 372], h: [{ T: [593, 152], hole: [470, 452, 62, 44, 8] }, { T: [630, 146], hole: [577, 492, 58, 48, -18] }], G: [[632, 150, 72], [613, 122, 5]] };
const SC_TOP = { P: [875, 199], h: [{ T: [662, 303], hole: [1045, 162, 50, 66, 30] }, { T: [686, 357], hole: [1010, 150, 30, 50, 10] }] };
const COV_ARM = [[649, 674], [703, 694], [753, 703], [810, 719], [867, 726], [917, 730], [974, 730], [1024, 723], [1074, 716]];
const COV_TOP = [[1110, 100], [1180, 110], [1260, 130], [1330, 160], [1395, 200]];
// the fist: four curled fingers stacked from the loops down (read off a 2x grid; lowest first so each finger laps
// the one below)
const FINGERS = [
  [[497, 652], [540, 648], [590, 646], [618, 640], [632, 655], [622, 684], [598, 700], [560, 707], [522, 703], [500, 690], [493, 670]],
  [[464, 604], [500, 600], [560, 598], [610, 594], [628, 604], [630, 625], [618, 642], [590, 651], [545, 656], [498, 652], [470, 636], [461, 620]],
  [[450, 540], [490, 530], [560, 528], [612, 522], [628, 540], [628, 566], [620, 586], [590, 597], [545, 602], [495, 598], [462, 588], [450, 566]],
  [[443, 498], [448, 468], [466, 451], [492, 447], [528, 459], [566, 474], [604, 487], [622, 502], [617, 520], [598, 529], [558, 535], [508, 536], [468, 531], [449, 520]],
];
const FEET = [
  { leg: [[1680, 690], [1697, 694], [1712, 699]], legW: 24, stub: [1714, 702, 16, 12, 0.3], toeK: 0.9,
    toes: [[[1712, 690], [1708, 680], [1706, 673]], [[1722, 708], [1752, 714], [1782, 718], [1810, 721]], [[1721, 719], [1752, 728], [1782, 737], [1810, 745]], [[1717, 727], [1745, 742], [1770, 756], [1795, 768]]],
    w: [13, 20, 20, 19], claws: [12, 19, 18, 17], curl: [-1, 1, 1, 1] },
  { leg: [[1614, 783], [1630, 788], [1645, 793]], legW: 22, stub: [1648, 797, 17, 13, 0.4], toeK: 0.8,
    toes: [[[1645, 783], [1642, 773], [1640, 765]], [[1657, 806], [1679, 826], [1700, 842], [1718, 851]], [[1653, 815], [1669, 840], [1686, 860], [1702, 871]], [[1648, 821], [1656, 845], [1665, 866], [1671, 879]]],
    w: [12, 19, 19, 18], claws: [11, 17, 17, 16], curl: [-1, 1, 1, 1] }];

// ending fix: primaries for the barbs (tips = the silhouette's tips): the arm-wing's hang from the arm, the top wing's
// radiate from behind the head
const ARM_P = [[565, 703], [724, 817], [870, 842], [973, 832], [1053, 808], [1119, 793], [1173, 777], [1217, 763]].map((t) => ({ t, r: [t[0] + 40, t[1] - 165] }));
const TOP_P = [[943, 69], [1016, 63], [1282, 69], [1494, 145], [1579, 220], [1600, 273], [1609, 330], [1618, 389], [1614, 445], [1598, 490]]
  .map((t) => { const R = [1300, 430], k = 0.55; return { t, r: [t[0] + (R[0] - t[0]) * k, t[1] + (R[1] - t[1]) * k] }; });

export const SPEC_H = { layers: [
  { type: "sil", ...H1, base: 0.93, rim: 0.82, depth: 10, blur: 10, ink: 2.4 },
  { type: "fine", clipPoly: H1.pts, dir: [1, 0.02], box: [1620, 600, 1840, 820], spacing: 4.5, len: [24, 70], w: [0.5, 1.0], v: 0.4, alpha: 0.7, seed: 31 },
  { type: "sil", ...H0, base: 0.965, rim: 0.88, depth: 34, blur: 24, ink: 3,
    shades: [[1530, 770, 170, 60, 0.1, 0.74, 0.35, 26], [1620, 650, 60, 110, 0, 0.76, 0.3, 24]],
    hatch: [{ mode: "dir", dir: [0.4, 0.92], box: [560, 560, 1250, 850], dens: 2, len: [18, 46], w: [0.7, 1.2], v: 0.5, alpha: 0.55, seed: 28 },
      { mode: "dir", dir: [0.92, 0.4], box: [1250, 150, 1620, 520], dens: 2, len: [18, 46], w: [0.7, 1.2], v: 0.5, alpha: 0.55, seed: 29 }] },
  // fine engraving on the belly (along the form) and round the face
  { type: "fine", clipPoly: H0.pts, center: [1450, 600], rx: 250, ry: 200, r0: 0.5, gain: 1.6, max: 0.9, twist: 0.3, box: [1150, 420, 1700, 830], spacing: 5, len: [8, 22], w: [0.5, 0.9], v: 0.58, alpha: 0.6, seed: 24 },
  { type: "fine", clipPoly: H0.pts, center: [1180, 440], rx: 175, ry: 160, r0: 0.72, gain: 2.5, max: 1, box: [1000, 480, 1350, 620], spacing: 6, len: [8, 18], w: [0.5, 0.9], v: 0.55, alpha: 0.55, seed: 27 },
  { type: "fine", clipPoly: H0.pts, dir: [1, 0], box: [1640, 610, 1840, 710], spacing: 4.5, len: [20, 60], w: [0.5, 1.0], v: 0.42, alpha: 0.7, seed: 30 },
  // ending fix — the engraving pass: barbs along the primaries of both wings, long strokes along the arm, fur tufts on
  // the body gathering under the chin and along the lower belly, the face ringed by short radial strokes
  { type: "barbs", list: ARM_P, n: 5, width: 34, from: [0.3, 0.5], to: [0.78, 0.94], w: [0.8, 1.4], v: 0.34, alpha: 0.85, seed: 481, clipPoly: H0.pts },
  { type: "barbs", list: TOP_P, n: 5, width: 32, from: [0.25, 0.45], to: [0.75, 0.93], w: [0.8, 1.4], v: 0.34, alpha: 0.85, seed: 482, clipPoly: H0.pts },
  { type: "tufts", clipPoly: H0.pts, box: [620, 570, 1260, 700], flow: [1, 0.04], seed: 483, blobs: [[900, 620, 300, 40, 0.6], [1150, 650, 90, 50, 0.5]], base: 0.05,
    cell: 24, n: [3, 6], len: [30, 60], gap: 4.0, bend: 0.05, w: [0.7, 1.2], v: [0.5, 0.38], alpha: 0.8 },
  { type: "contour", poly: H0.pts, box: [1240, 640, 1700, 860], rows: 10, gap: 6, dash: [25, 80], skip: [8, 30], fall: 0.85, w: [0.6, 1.3], v: 0.4, alpha: 0.8, seed: 487 },
  { type: "tufts", clipPoly: H0.pts, box: [1150, 380, 1700, 850], flow: [0.9, 0.42], seed: 484,
    blobs: [[1500, 790, 190, 50, 0.6], [1260, 640, 110, 45, 0.55], [1640, 600, 40, 130, 0.5], [1450, 650, 170, 110, 0.12]], base: 0.05,
    cell: 28, n: [3, 6], len: [22, 44], gap: 4.2, bend: 0.06, w: [0.7, 1.2], v: [0.55, 0.42], alpha: 0.75 },
  { type: "tufts", clipPoly: H0.pts, box: [1000, 300, 1400, 640], flow: [0.9, 0.42], centres: [[1170, 480, 200, "r", 1]], seed: 485,
    blobs: [[1050, 540, 50, 60, 0.6], [1160, 590, 110, 35, 0.6], [1300, 520, 50, 60, 0.5], [1150, 410, 70, 30, 0.35]], base: 0.03,
    cell: 20, n: [2, 5], len: [12, 26], gap: 3.4, bend: 0.1, w: [0.6, 1.1], v: [0.55, 0.4], alpha: 0.75 },
  { type: "tufts", clipPoly: H0.pts, box: [1000, 20, 1650, 420], flow: [-0.6, -0.8], centres: [[1300, 430, 600, "r", 1]], seed: 486,
    blobs: [[1350, 300, 200, 60, 0.45, 0.4], [1500, 380, 60, 90, 0.5]], base: 0.05, cell: 24, n: [3, 6], len: [26, 50], gap: 4.0, bend: 0.08, w: [0.7, 1.2], v: [0.5, 0.38], alpha: 0.8 },
  // the arm-wing: its upper edge along the arm, the primaries' separations, the covert row
  { type: "ink", pts: [[625, 585], [700, 595], [800, 604], [900, 612], [1000, 618]], w: 2.4, a: 0.3, b: 0.5, color: [0.25, 0.85] },
  { type: "notch", notch: [[562, 701], [656, 758], [755, 777], [857, 792], [953, 790], [1037, 780], [1099, 768], [1154, 756], [1199, 741]], dir: [0.3, -0.95], len: 75, w: 2.8, bend: -0.04 },
  { type: "coverts", tips: COV_ARM, dir: [-0.1, 1], w: 50, depth: 46, ink: 2.6, hatch: 3, clip: H0.pts, seed: 36 },
  // the wing behind the head: separations and coverts; the body line under the head
  { type: "notch", notch: [[1570, 482], [1579, 439], [1578, 385], [1572, 330], [1548, 272]], root: [1250, 380], len: 110, w: 2.8 },
  { type: "notch", notch: [[1526, 221], [1435, 156], [1350, 105], [1264, 67], [1168, 48]], dir: [-0.9, 0.44], len: 100, w: 2.8 },
  { type: "coverts", tips: COV_TOP, dir: [0.2, -0.98], w: 62, depth: 50, ink: 2.6, hatch: 3, clip: H0.pts, seed: 37 },
  { type: "ink", pts: [[1070, 550], [1110, 600], [1170, 650], [1230, 720], [1270, 760]], w: 2.6, a: 0.3, b: 0.4 },
  // tail separations and the talons
  { type: "notch", notch: [[1775, 735], [1785, 696], [1786, 656]], dir: [-1, 0], len: 100, w: 2.4 },
  { type: "feet2", list: FEET, leg: 20 },
  // the face
  // ending fix: the source's bandage — two equal plasters crossing in an X (read off a 3.5x grid of k58)
  { type: "bandX", a: [1095, 367, 114, 30, -54], b: [1096, 367, 100, 30, 37], dots: 22, seed: 83 },
  { type: "eye2", ...EYE_R }, { type: "eye2", ...EYE_L },
  { type: "stroke", pts: BROW_R, ws: [3, 5.5, 5, 4, 1.2] },
  { type: "stroke", pts: CREASE, ws: [1, 3.5, 4, 3, 1] },
  { type: "stroke", pts: BROW_L, ws: [1, 5, 6.5, 5.5] },
  { type: "hbeak", ...BEAK },
  ...BEAK_HATCH.map((pts) => ({ type: "stroke", pts, ws: [0.4, 1.3, 0.4], color: [0.35, 0.8] })),
  // the ear tufts: the left a white spike over the far cup, the right dark spikes under the band
  { type: "cup3", ...HP.cupL },
  { type: "band", pts: HP.band, w: 21 },
  { type: "tuft", pts: [[1004, 331], [1014, 352], [1028, 379], [1050, 352], [1072, 326], [1040, 322]], out: [0, 0.3], ink: 2.6, inner: 2, seed: 5 },
  { type: "stroke", pts: [[1240, 248], [1258, 251], [1275, 247]], ws: [1, 3, 2] },
  { type: "stroke", pts: [[1270, 282], [1285, 258], [1302, 220]], ws: [2, 3.5, 0.8] },
  { type: "stroke", pts: [[1303, 221], [1310, 245], [1318, 268]], ws: [0.8, 2, 1.5] },
  { type: "yoke", pts: HP.yoke, v: 0.42 },
  { type: "cup3", ...HP.cupR },
  // the scissors: the top pair held by its loops in the wing's hand, the upright pair in the fist
  { type: "scissors", ...SC_TOP, w: 42, ring: 12 },
  { type: "ink", pts: [[945, 100], [990, 86], [1040, 100], [1080, 140]], w: 3, a: 0.4, b: 0.3 },
  { type: "ink", pts: [[955, 225], [1005, 236], [1055, 226]], w: 3, a: 0.4, b: 0.3 },
  { type: "scissors", ...SC_UP, w: 40, bw: 46, ring: 11 },
  // the fist: four curled fingers over the loops (the top one through the right loop), fine strokes near the knuckles
  ...FINGERS.map((pts, i) => ({ type: "lobe", pts, ink: 3.2, rim: 0.72, depth: 10, blur: 7,
    strokes: [[[pts[0][0] + 14, pts[0][1] + 14], [pts[0][0] + 40, pts[0][1] + 10], [pts[0][0] + 70, pts[0][1] + 12]], [[pts[0][0] + 20, pts[0][1] + 26], [pts[0][0] + 50, pts[0][1] + 24], [pts[0][0] + 80, pts[0][1] + 27]]] })),
  { type: "stroke", pts: [[462, 607], [520, 609], [585, 607]], ws: [0.8, 2.6, 2.2, 0.6] },
  // ending fix: the fingers engraved along their length (the source's feathered fist)
  ...FINGERS.map((pts, i) => ({ type: "tufts", clipTo: pts, box: [440, 440, 640, 710], flow: [1, 0.03], seed: 490 + i, blobs: [[540, 600, 120, 120, 0.7]], base: 0.1,
    cell: 16, n: [2, 4], len: [22, 44], gap: 3.6, bend: 0.1, w: [0.6, 1.1], v: [0.5, 0.4], alpha: 0.8 })),
  // the front of the right loop over the top finger
  { type: "ringArc", c: [577, 492], rx: 35, ry: 30, rot: -0.3, a0: -0.9, a1: 1.3, w: 7 },
] };


let LAYER = null;
export function owlHLayer() {
  if (!LAYER) { LAYER = document.createElement("canvas"); LAYER.width = 2206; LAYER.height = 946; paintSpec(LAYER.getContext("2d", { willReadFrequently: true }), SPEC_H); }
  return LAYER;
}
export function releaseOwlH() { LAYER = null; }
