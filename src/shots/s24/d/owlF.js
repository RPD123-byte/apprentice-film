// s24 F beat (k24–53): the angry owl flying up-left on the speed lines — one held drawing, translated per frame by
// the measured track (template match on the face, k40 = 0). PLATE coords = the k40 frame, extended to 2420 × 1110 so
// the parts that only show late in the move (belly, feet, wing tips) exist.
// Measured on the source: the silhouettes (silF.js: outline polygons + notches, from a line-free median of the 29
// aligned frames — a measuring aid, not stored), and hand-read landmarks off 1.6–2.6x grids (eyes, beak, bandage,
// headphones, blades, covert rows, the wing/body boundary). The drawing is procedural (paint.js / art.js).
import { paintSpec } from "./paint.js";
import { F0, F1, F2, F3 } from "./silF.js";

export const PLATE_W = 2420, PLATE_H = 1110;

// measured track: owl offset from its k40 place (frame px), k23 = k24 (template match, sub-pixel)
export const F_TRACK = { 23: [205.3, 152.2], 24: [205.3, 152.3], 25: [187.1, 138.5], 26: [177.8, 132.2], 27: [168.4, 125.3], 28: [149.8, 111.5],
  29: [131.1, 97.9], 30: [122.0, 91.2], 31: [122.0, 91.2], 32: [112.6, 84.0], 33: [93.7, 70.4], 34: [75.1, 56.3], 35: [65.8, 49.9], 36: [56.4, 42.3],
  37: [37.6, 28.0], 38: [18.8, 14.2], 39: [9.6, 7.2], 40: [0, 0], 41: [-18.8, -13.9], 42: [-37.3, -27.9], 43: [-46.4, -34.6], 44: [-56.1, -41.7],
  45: [-74.8, -56.4], 46: [-94.1, -70.9], 47: [-103.5, -78.3], 48: [-113.0, -86.0], 49: [-132.5, -101.1], 50: [-151.2, -116.6], 51: [-160.6, -123.6],
  52: [-170.2, -131.2], 53: [-188.2, -145.8] };

// hand-read landmarks (plate px = frame px at k40), read off 3–4x grids of the source (fix pass 1)
const EYE_R = { up: [[1399, 616], [1418, 598], [1440, 582], [1465, 566], [1488, 551]], lo: [[1407, 619], [1430, 623], [1455, 618], [1474, 605], [1484, 582], [1488, 555]],
  pupil: [1436, 597], pr: [12, 12], cat: [1442, 588, 4.2], lidWs: [4, 7.5, 6.5, 4, 1.5], loWs: [1, 2.8, 2.8, 2.4, 1.8, 0.8] };
const EYE_L = { up: [[1268, 643], [1290, 640], [1313, 642], [1340, 646]], lo: [[1290, 663], [1313, 668], [1337, 661]], pupil: [1312, 648], pr: [8.5, 8.5], cat: [1316, 643, 3],
  lidWs: [2, 4.8, 5, 3], loWs: [0.6, 2.4, 2.4, 0.8] };
const BROW_R = [[1364, 605], [1385, 603], [1400, 597], [1413, 578], [1428, 552], [1447, 524], [1466, 509]];
const BROW_L = [[1258, 602], [1290, 609], [1318, 620], [1335, 632]];
// fix pass 2 (re-read off a 4x grid of k40): the upper mandible a shield with its hooked tip overhanging a small
// dark gape, the left corner of the mouth beside it, a heavy inner ridge, the shadow side hatched (no smooth grey)
const BEAK = {
  upper: [[1352, 664], [1360, 651], [1378, 646], [1398, 646], [1410, 650], [1413, 664], [1411, 682], [1405, 698], [1397, 712], [1390, 721], [1386, 712], [1386, 700], [1380, 703], [1372, 712], [1364, 696], [1356, 680]],
  gape: [[1378, 704], [1386, 694], [1394, 700], [1392, 716], [1386, 718], [1382, 712]],
  tongue: [[1381, 704], [1386, 701], [1388, 707], [1384, 710]], tongueV: 0.75,
  ridge: [[1404, 654], [1401, 670], [1395, 686], [1388, 698]], ridgeWs: [2, 4.5, 5, 3],
  shade: [1405, 678, 6, 22, 0.1], crease: [[1377, 655], [1373, 660], [1374, 667]], ink: 3 };
const HP = {
  band: [[1210, 560], [1212, 470], [1232, 410], [1266, 368], [1310, 342], [1362, 326], [1420, 318], [1478, 316], [1525, 335], [1560, 370], [1580, 405]],
  // the right cup (3/4 view): face plate, depth toward the head, cushion behind (read off a 3x grid)
  cupR: { c: [1633, 479], rx: 37, ry: 56, rot: -0.22, d: [-52, 16], back: 1.22, cs: 1.2, faceV: 0.48, sideV: 0.38, cushV: 0.1, rings: [0.22, 0.5], seed: 7 },
  // the far cup, nearly edge-on at the left of the head
  cupL: { c: [1208, 628], rx: 11, ry: 62, rot: 0.08, d: [22, 0], back: 1, cs: 1.25, faceV: 0.4, sideV: 0.3, cushV: 0.1, rings: [0.45], hatch: 0.6, pleats: 22, seed: 8 },
  yoke: [[1556, 400], [1586, 391], [1602, 431], [1574, 446]],
};
const BLADES = [
  [[1250, 368], [1272, 355], [1384, 410], [1342, 432]],
  [[1328, 300], [1346, 295], [1366, 318], [1438, 405], [1390, 415]],
];
// covert hairpins: tips and the direction each points (read off a 2.2x grid of k40 and of k53 for the left wing)
const COV_R = [[1804, 362], [1849, 373], [1883, 441], [1876, 505], [1867, 555], [1845, 607], [1817, 648], [1781, 680]];
const COV_RD = [[-0.15, -1], [0.19, -0.98], [0.81, -0.58], [0.94, -0.35], [0.97, -0.25], [0.97, -0.25], [1, 0], [1, 0.1]];
const COV_L = [[1115, 773], [1119, 817], [1162, 855], [1219, 886], [1266, 905], [1303, 917], [1340, 927], [1378, 923], [1415, 917]];
const COV_LD = [[-1, -0.1], [-1, 0.1], [-0.95, 0.3], [-0.85, 0.5], [-0.6, 0.8], [-0.4, 0.9], [-0.3, 0.95], [-0.15, 1], [0, 1]];
// the tail (k53 grid + the track offset): two long feathers and two short ones under the feet
const TAIL = [{ r: [1776, 912], t: [1893, 941], w: 44, bend: 0.02 },
  { r: [1846, 844], t: [2026, 836], w: 46, bend: -0.02 }, { r: [1826, 800], t: [2028, 780], w: 52, bend: -0.03 }];
const FEET = [
  { leg: [[1852, 884], [1885, 890], [1918, 884]], legW: 34, stub: [1922, 887, 20, 15, 0.3], toeK: 0.8,
    toes: [[[1918, 874], [1914, 862], [1910, 852]], [[1930, 880], [1960, 885], [1990, 889], [2014, 891]], [[1930, 892], [1960, 906], [1990, 922], [2012, 931]], [[1926, 898], [1945, 918], [1962, 936], [1976, 946]]],
    w: [15, 24, 24, 22], claws: [14, 22, 22, 19], curl: [-1, 1, 1, 1] },
  { leg: [[1812, 960], [1850, 970], [1884, 974]], legW: 30, stub: [1888, 977, 19, 14, 0.4], toeK: 0.8,
    toes: [[[1880, 962], [1876, 952], [1872, 944]], [[1896, 982], [1925, 993], [1952, 1006], [1976, 1016]], [[1893, 990], [1915, 1011], [1934, 1030], [1946, 1041]], [[1887, 994], [1896, 1016], [1903, 1034], [1907, 1046]]],
    w: [14, 23, 23, 21], claws: [13, 21, 20, 18], curl: [-1, 1, 1, 1] }];

export const SPEC_F = { layers: [
  ...BLADES.map((pts) => ({ type: "poly", pts, v: 0.9, ink: 5, hatch: { mode: "dir", dir: [0.82, 0.57], box: [1180, 290, 1450, 440], dens: 3, len: [20, 50], w: [0.7, 1.1], v: 0.45, alpha: 0.6, seed: 91 } })),
  { type: "cup3", ...HP.cupL },
  // the left wing (behind the body): white, fine barbs along the primaries, separations, covert hairpins
  { type: "sil", ...F1, base: 0.95, rim: 0.86, depth: 20, blur: 16, ink: 2.4 },
  { type: "fine", clipPoly: F1.pts, dir: [-0.96, -0.28], box: [940, 700, 1470, 1000], spacing: 5, len: [20, 60], w: [0.5, 1.0], v: 0.52, alpha: 0.6, seed: 31, tone: 0.8 },
  { type: "fine", clipPoly: F1.pts, center: [1330, 760], rx: 200, ry: 120, r0: -2, gain: 1, max: 0.9, twist: -1.2, box: [1150, 700, 1470, 900], spacing: 3.2, len: [8, 20], w: [0.5, 0.9], v: 0.5, alpha: 0.65, seed: 33 },
  { type: "notch", notch: [[1058, 799], [1116, 858], [1145, 904], [1204, 934], [1252, 953], [1311, 954], [1357, 954], [1399, 948], [1430, 942], [1456, 930]], root: [1360, 800], len: 110, w: 2.8, bend: 0.05 },
  { type: "coverts", tips: COV_L, dirs: COV_LD, w: 19, depth: 80, ink: 2.6, hatch: 2, clip: F1.pts, seed: 34 },
  // tail feathers and the talons
  { type: "quills", list: TAIL, ink: 2.4, lines: 9, lineV: 0.42, lineLen: [0.6, 0.95], tipPow: 0.7, widest: 0.45, rootK: 0.95, seed: 32 },
  { type: "feet2", list: FEET, leg: 20 },
  // head, body and the raised wing (one silhouette)
  { type: "sil", ...F0, base: 0.96, rim: 0.82, depth: 40, blur: 26, ink: 3,
    shades: [[1560, 860, 230, 90, 0.35, 0.72, 0.35, 30], [1720, 800, 120, 150, 0.2, 0.75, 0.3, 30]] },
  // engraving on the body (fine, along the form) and in the shadow under the raised wing
  { type: "fine", clipPoly: F0.pts, center: [1600, 800], rx: 250, ry: 190, r0: 0.45, gain: 1.6, max: 0.9, twist: 0.35, box: [1330, 620, 1900, 1000], spacing: 5, len: [8, 22], w: [0.5, 0.9], v: 0.6, alpha: 0.6, seed: 5 },
  { type: "fine", clipPoly: F0.pts, center: [1420, 600], rx: 175, ry: 165, r0: 0.72, gain: 2.5, max: 1, box: [1250, 640, 1600, 800], spacing: 7, len: [8, 18], w: [0.5, 0.9], v: 0.6, alpha: 0.55, seed: 6 },
  // raised wing: fine barbs radiating along the primaries, separations, the lower edge, covert hairpins
  { type: "fine", clipPoly: F0.pts, center: [1700, 660], twist: -Math.PI / 2, box: [1680, 160, 2040, 720], spacing: 4.5, len: [20, 60], w: [0.5, 1.0], v: 0.5, alpha: 0.6, seed: 7, tone: 0.85 },
  { type: "ink", pts: [[1612, 596], [1640, 640], [1680, 684], [1735, 712], [1798, 724]], w: 3.2, a: 0.5, b: 0.6 },
  { type: "notch", notch: [[1802, 703], [1834, 677], [1875, 636], [1913, 583], [1950, 507], [1938, 445], [1919, 362], [1857, 329]], root: [1700, 600], len: 120, w: 2.8, bend: -0.05 },
  { type: "notch", notch: [[1759, 399]], root: [1700, 560], len: 70, w: 2.6 },
  { type: "coverts", tips: COV_R, dirs: COV_RD, w: 19, depth: 90, ink: 2.7, hatch: 2, clip: F0.pts, seed: 35 },
  { type: "fine", clipPoly: F0.pts, center: [1640, 740], twist: -Math.PI / 2 - 0.25, box: [1640, 440, 1800, 720], spacing: 3.5, len: [14, 34], w: [0.5, 1.0], v: 0.55, alpha: 0.7, seed: 8, tone: 0.8 },
  // the chin line under the face; the facial disc's fine strokes
  { type: "ink", pts: [[1268, 700], [1300, 735], [1340, 770], [1372, 800], [1408, 858]], w: 2.2, a: 0.2, b: 0.6, color: [0.3, 0.8] },
  { type: "stroke", pts: [[1330, 560], [1345, 580], [1352, 600]], ws: [0.4, 1.4, 0.4], color: [0.5, 0.7] },
  { type: "stroke", pts: [[1462, 520], [1490, 512], [1520, 514]], ws: [0.4, 1.6, 0.4], color: [0.45, 0.7] },
  { type: "stroke", pts: [[1470, 600], [1492, 590], [1505, 570]], ws: [0.4, 1.3, 0.4], color: [0.5, 0.7] },
  { type: "stroke", pts: [[1430, 632], [1460, 640], [1490, 630]], ws: [0.4, 1.3, 0.4], color: [0.5, 0.6] },
  // the tufts: the left one's inner lines, the right one's ink spikes under the band
  { type: "stroke", pts: [[1238, 545], [1228, 525], [1215, 503]], ws: [0.5, 1.6, 0.5], color: [0.45, 0.75] },
  { type: "stroke", pts: [[1250, 530], [1236, 515], [1220, 502]], ws: [0.5, 1.2, 0.4], color: [0.5, 0.6] },
  { type: "stroke", pts: [[1477, 445], [1494, 421], [1512, 395]], ws: [0.6, 3.2, 0.6] },
  { type: "stroke", pts: [[1506, 427], [1519, 413], [1532, 407]], ws: [0.5, 2.2, 0.5] },
  { type: "bandage", x: 1288, y: 536, size: 112, rot: -0.82, cross: 1.52, sx: 1, sy: 1.05 },
  { type: "eye2", ...EYE_R }, { type: "eye2", ...EYE_L },
  { type: "stroke", pts: BROW_R, ws: [0.8, 4.5, 7.5, 8.5, 7, 4, 1] },
  { type: "stroke", pts: BROW_L, ws: [1, 4, 7.5, 7] },
  { type: "hbeak", ...BEAK },
  { type: "ell", c: [1598, 490], rx: 80, ry: 74, rot: -0.3, v: 0.05, blur: 0 },
  { type: "band", pts: HP.band, w: 20 },
  // the left tuft stands in front of the band
  { type: "tuft", pts: [[1209, 497], [1251, 509], [1262, 532], [1246, 553], [1233, 548]], out: [0, 0.3], ink: 2.6, inner: 2, seed: 4 },
  { type: "yoke", pts: HP.yoke, v: 0.42 },
  { type: "cup3", ...HP.cupR },
] };

let LAYER = null;
export function owlFLayer() {
  if (!LAYER) {
    LAYER = document.createElement("canvas"); LAYER.width = PLATE_W; LAYER.height = PLATE_H;
    paintSpec(LAYER.getContext("2d", { willReadFrequently: true }), SPEC_F);
  }
  return LAYER;
}
export function releaseOwlF() { LAYER = null; }
