// s24 page beats (k7–19): the framed sōko page (F1) with the colour banner (F2) in the header slot, the shard cut
// lines, the white slash arc, paper confetti, three owls and smoke. The owls are procedural drawings on measured
// silhouettes (silB.js); geometry numbers in pagegeo.js. k7 shows the same owls motion-smeared at their k7 places;
// k19 is the k18 frame whip-blurred with the white wash coming in.
import { drawFramedPage, sokoPageCanvas, framedTransform, HEADER, FRAMED } from "../../../lib/sites.js";
import { hippieBannerCanvas } from "../../../lib/hippie.js";
import { gv } from "../../../lib/owlInk.js";
import { blurCanvas } from "../../../lib/sokoIll.js";
import { rng } from "../../../lib/rng.js";
import { paintSpec } from "./paint.js";
import { drawScissors } from "./scissors.js";
import { smoothFn } from "./art.js";
import { B10, B20, B30 } from "./silB.js";
import { SHARD_SEGS, CONFETTI, HOLD, SMOKE_A, ARC } from "./pagegeo.js";

const W = 2206, H = 946;
const cv = (w = W, h = H) => { const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d", { willReadFrequently: true }); return c; };

// ---------------------------------------------------------------- the three owls (frame px, hold median place)
const SPEC_B1 = { layers: [
  // the second pair, held up behind the raised wing
  { type: "poly", pts: [[1398, 372], [1418, 364], [1470, 420], [1540, 512], [1520, 506], [1440, 430]], v: 0.9, ink: 3 },
  // fix pass 2: the right wing's lower half, in shade under the lit part: grey feathers pointing to the tip
  { type: "poly", smooth: true, pts: [[1250, 470], [1300, 448], [1380, 438], [1418, 462], [1430, 520], [1380, 532], [1320, 528], [1258, 512]], v: 0.58, ink: 0 },
  { type: "coverts", tips: [[1330, 500], [1370, 505], [1410, 506], [1432, 500], [1320, 470], [1360, 472], [1395, 470]], dir: [1, 0.12], w: 26, depth: 90, ink: 1.8, hatch: 3, hatchV: 0.4, v: 0.62, seed: 50, rev: true },
  // the whole figure (measured outline): soft white plumage, fine hatching along the form
  { type: "sil", ...B10, base: 0.96, rim: 0.82, depth: 20, blur: 14, ink: 2.2,
    shades: [[1200, 575, 170, 28, 0, 0.74, 0.45, 16], [1290, 560, 70, 40, 0.3, 0.72, 0.35, 16], [1120, 470, 40, 60, 0, 0.8, 0.3, 18]],
    hatch: [{ mode: "dir", dir: [-0.5, 0.86], box: [880, 430, 1060, 560], dens: 2.2, len: [14, 32], w: [0.6, 1.0], v: 0.5, alpha: 0.5, seed: 62 }] },
  // fix pass 2: the body's engraving follows its round form, the belly curves down under it (grey band + contour)
  { type: "fine", clipPoly: B10.pts, center: [1190, 470], rx: 150, ry: 110, r0: 0.55, gain: 1.8, max: 0.9, twist: 0.25, box: [1060, 440, 1340, 595], spacing: 4.5, len: [8, 20], w: [0.5, 0.9], v: 0.55, alpha: 0.55, seed: 63 },
  { type: "stroke", pts: [[1085, 560], [1140, 578], [1200, 587], [1262, 588], [1310, 580], [1338, 566]], ws: [0.5, 1.4, 1.8, 1.8, 1.4, 0.5], color: [0.35, 0.7] },
  // the right wing: three rows of long rounded feathers pointing to the tip (upper rows lit, lower rows in shade),
  // its leading edge, the long lowest feathers (tail) under it
  { type: "coverts", clip: B10.pts, tips: [[1415, 506], [1392, 515], [1440, 494]], dirs: [[1, 0.05], [1, 0.1], [1, 0]], w: 17, depth: 120, ink: 2.2, hatch: 3, hatchV: 0.5, v: 0.9, seed: 51, rev: true },
  { type: "coverts", clip: B10.pts, tips: [[1255, 462], [1290, 458], [1325, 456], [1360, 452], [1392, 446]], dirs: [[1, 0.35], [1, 0.3], [1, 0.25], [1, 0.2], [1, 0.15]], w: 26, depth: 90, ink: 2.2, hatch: 3, hatchV: 0.5, v: 0.88, seed: 52 },
  { type: "coverts", clip: B10.pts, tips: [[1245, 418], [1285, 414], [1325, 410], [1365, 408], [1405, 404], [1440, 400]], dirs: [[1, 0.3], [1, 0.26], [1, 0.22], [1, 0.18], [1, 0.14], [1, 0.1]], w: 28, depth: 95, ink: 2.2, hatch: 3, hatchV: 0.5, v: 0.93, seed: 53 },
  { type: "coverts", clip: B10.pts, tips: [[1240, 384], [1272, 376], [1305, 370], [1338, 366], [1372, 366], [1405, 368], [1438, 374], [1468, 384]], dirs: [[1, 0.4], [1, 0.36], [1, 0.3], [1, 0.26], [1, 0.22], [1, 0.3], [1, 0.4], [1, 0.5]], w: 26, depth: 70, ink: 2.2, hatch: 2, hatchV: 0.5, v: 0.95, seed: 54 },
  { type: "stroke", pts: [[1205, 380], [1250, 352], [1300, 336], [1360, 328], [1420, 334], [1460, 350]], ws: [0.6, 2.2, 2.6, 2.4, 1.8, 0.6] },
  // the left wing (behind the hand): long feathers streaming down-right from the arm, their tips hanging at y ≈ 560
  { type: "quills", clip: B10.pts, list: [{ r: [955, 445], t: [975, 562], w: 26, bend: 0.03 }, { r: [980, 455], t: [1000, 560], w: 26, bend: 0.03 }, { r: [1005, 470], t: [1030, 552], w: 24, bend: 0.02 },
    { r: [930, 450], t: [955, 548], w: 24, bend: 0.04 }], ink: 2.2, lines: 5, lineV: 0.45, lineLen: [0.5, 0.9], tipPow: 0.6, widest: 0.4, rootK: 0.9, seed: 55, order: "rev" },
  { type: "coverts", clip: B10.pts, tips: [[945, 470], [968, 482], [992, 492], [1015, 500]], dir: [0.35, 0.94], w: 24, depth: 50, ink: 2, hatch: 2, v: 0.93, seed: 56 },
  // the talons, tucked under the belly (read off a 4x grid): short thick toes, grey claws
  { type: "feet2", list: [
    { leg: [[1292, 578], [1300, 596]], legW: 20, toes: [[[1302, 600], [1322, 612], [1342, 624]], [[1300, 606], [1316, 620], [1332, 630]], [[1308, 596], [1316, 590]]], w: [15, 13, 9], claws: [11, 10, 6], curl: [1, 1, -1] },
    { leg: [[1360, 572], [1374, 588]], legW: 18, toes: [[[1378, 592], [1394, 600], [1404, 604]], [[1376, 598], [1390, 610], [1400, 616]], [[1378, 584], [1382, 576]]], w: [14, 12, 8], claws: [10, 9, 6], curl: [1, 1, -1] }], leg: 18 },
  // the head: the facial disc's contour down the left, grey shade on the right cheek, then the two long ear tufts
  // standing up behind the band and the small tufts at the crown's corners (fix pass 2)
  { type: "shade", clip: B10.pts, shape: [1140, 460, 30, 45, 0], v: 0.78, alpha: 0.4, blur: 12 },
  { type: "stroke", pts: [[1012, 366], [1002, 392], [996, 425], [998, 458], [1008, 485], [1024, 505]], ws: [0.6, 2, 2.4, 2.4, 2, 0.6] },
  { type: "tuft", pts: [[1043, 296], [1062, 318], [1076, 350], [1064, 352], [1050, 322]], out: [0, 1], ink: 1.8, inner: 1, v: 0.9, seed: 8 },
  { type: "tuft", pts: [[1083, 284], [1095, 310], [1105, 348], [1096, 350], [1085, 314]], out: [0, 1], ink: 1.8, inner: 1, v: 0.9, seed: 9 },
  { type: "tuft", pts: [[1006, 354], [1022, 360], [1030, 372], [1012, 376]], out: [0, 0.5], ink: 1.6, inner: 0, seed: 10 },
  { type: "tuft", pts: [[1150, 350], [1146, 368], [1128, 372], [1134, 360]], out: [0, 0.6], ink: 1.6, inner: 0, seed: 11 },
  ...[[[1126, 356], [1132, 364], [1136, 372]], [[1136, 354], [1141, 362], [1144, 370]]].map((pts) => ({ type: "stroke", pts, ws: [0.5, 2, 0.5] })),
  { type: "bandage", x: 1041, y: 383, size: 58, rot: -0.8, cross: 1.52, sx: 1, sy: 1.05 },
  // the scowl (read off a 6x grid): heavy brows angled down to the beak's bridge, lidded eyes, the open hooked beak
  { type: "eye2", up: [[1071, 437], [1085, 429], [1100, 425], [1114, 422]], lo: [[1073, 438], [1087, 440], [1099, 438], [1110, 428]], pupil: [1095, 430], pr: [5, 5], cat: [1097, 428, 1.4],
    lidWs: [2.5, 4.5, 4, 1.5], loWs: [0.6, 1.6, 1.4, 0.5] },
  { type: "eye2", up: [[1013, 430], [1025, 433], [1035, 437], [1041, 442]], lo: [[1018, 438], [1029, 442], [1039, 442]], pupil: [1033, 438], pr: [4, 4], cat: [1034, 436, 1.2],
    lidWs: [1.5, 3.5, 4, 2.5], loWs: [0.5, 1.2, 0.5] },
  { type: "stroke", pts: [[1058, 431], [1068, 424], [1082, 418], [1098, 414], [1116, 414]], ws: [7, 6.5, 5, 2.5, 1] },
  { type: "stroke", pts: [[1018, 412], [1030, 418], [1041, 426], [1049, 434]], ws: [1, 3.5, 6, 7] },
  { type: "stroke", pts: [[1054, 426], [1059, 430], [1062, 436]], ws: [0.5, 1.6, 0.5], color: [0.3, 0.8] },
  { type: "hbeak", upper: [[1041, 449], [1048, 443], [1058, 445], [1067, 448], [1073, 453], [1068, 458], [1060, 460], [1053, 465], [1050, 472], [1049, 479], [1044, 473], [1040, 462]],
    gape: [[1052, 465], [1060, 460], [1067, 458], [1064, 466], [1058, 474], [1051, 478]],
    lower: [[1053, 468], [1062, 462], [1067, 462], [1064, 471], [1057, 479], [1051, 480]], lowerV: 0.8, nostril: [1053, 452, 2.2, 1.4, 0.3], ink: 2 },
  ...[[[1066, 452], [1062, 457], [1057, 461]], [[1069, 455], [1064, 459]]].map((pts) => ({ type: "stroke", pts, ws: [0.3, 0.9, 0.3], color: [0.4, 0.8] })),
  // headphones
  { type: "band", pts: [[994, 420], [996, 372], [1012, 338], [1044, 316], [1086, 304], [1126, 309], [1156, 330], [1170, 362], [1172, 382]], w: 9 },
  { type: "cup3", c: [1182, 412], rx: 19, ry: 41, rot: -0.12, d: [-24, 2], back: 1.2, cs: 1.1, faceV: 0.44, sideV: 0.32, cushV: 0.1, rings: [0.25, 0.5], ink: 2.2, pleats: 24, seed: 73 },
  { type: "cup3", c: [992, 425], rx: 8, ry: 36, rot: 0.05, d: [10, 0], back: 1, cs: 1.2, faceV: 0.16, sideV: 0.14, cushV: 0.08, rings: [0.45], hatch: 0.5, pleats: 16, ink: 2, seed: 74 },
  // the big pair: blades out to the left; the wing's hand behind the rings, feather-fingers through both rings
  // (read off a 4x grid): through the upper ring a curled feather with its tip poking out left, through the lower a
  // fist of three lobes whose knuckles cover most of the hole (drawn after the rings), the rings' fronts over them
  { type: "poly", pts: [[905, 440], [950, 425], [1000, 430], [1010, 470], [985, 540], [950, 530], [930, 500], [915, 470]], v: 0.93, ink: 0 },
  { type: "scissors", P: [803, 472], h: [{ T: [628, 433], hole: [895, 431, 60, 32, -10] }, { T: [633, 522], hole: [901, 513, 70, 34, 4] }], w: 30, ring: 8 },
  { type: "lobe", pts: [[847, 435], [866, 427], [895, 423], [925, 428], [945, 440], [930, 448], [900, 447], [870, 442]], ink: 2.2, rim: 0.8, depth: 4, blur: 3, light: [0, -1],
    strokes: [[[875, 434], [900, 433], [925, 437]]] },
  { type: "ringArc", c: [895, 431], rx: 34, ry: 20, rot: -0.17, a0: 0.25, a1: 2.6, w: 5, v: 0.9 },
  { type: "lobe", pts: [[898, 489], [920, 486], [946, 490], [950, 497], [925, 497], [902, 495]], ink: 2, rim: 0.8, depth: 3, blur: 2, light: [0, -1] },
  { type: "lobe", pts: [[862, 508], [874, 498], [900, 495], [930, 494], [950, 499], [948, 510], [925, 516], [895, 518], [872, 516]], ink: 2.4, rim: 0.78, depth: 4, blur: 3, light: [0, -1],
    strokes: [[[880, 505], [905, 504], [930, 505]]] },
  { type: "lobe", pts: [[890, 518], [915, 515], [945, 512], [952, 522], [930, 528], [905, 528]], ink: 2.2, rim: 0.78, depth: 3, blur: 3, light: [0, -1] },
  { type: "ringArc", c: [901, 513], rx: 39, ry: 21, rot: 0.07, a0: 2.2, a1: 3.9, w: 5, v: 0.9 },
] };
// the two small owls, re-drawn in fix pass 1 with their faces, headphones, wings and props (read off 2–3x grids of k12;
// frame px at the hold median place)
const WISPS = [[[505, 268], [560, 240], [615, 210], [668, 172]], [[520, 282], [575, 258], [630, 228], [690, 196]], [[498, 250], [545, 222], [590, 196], [640, 170]], [[540, 292], [600, 270], [655, 245]]];
const SPEC_B2 = { layers: [
  { type: "fn", fn: (g) => {
    // grey smoke wisps trailing up-right from the wings
    g.save(); g.filter = "blur(4px)"; g.lineCap = "round";
    // a broad translucent haze trailing the wing over the rainbow (fix pass 2), then the wisps in it
    g.save(); g.filter = "blur(10px)"; g.fillStyle = gv(0.8, 0.3); g.beginPath(); g.moveTo(480, 300); g.bezierCurveTo(540, 250, 600, 225, 660, 205); g.lineTo(640, 180); g.bezierCurveTo(580, 195, 520, 215, 470, 240); g.closePath(); g.fill(); g.restore();
    WISPS.forEach((pts, i) => { g.strokeStyle = gv(0.66, 0.5 - i * 0.05); g.lineWidth = 14 - i * 2; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); });
    g.restore();
  } },
  { type: "sil", ...B20, base: 0.92, rim: 0.78, depth: 10, blur: 10, ink: 1.6,
    hatch: { mode: "dir", dir: [0.94, -0.34], box: [470, 200, 620, 380], dens: 3, len: [24, 60], w: [0.7, 1.4], v: 0.55, alpha: 0.55, seed: 64 } },
  // the wing's feathers streaming back (up-right): a row of long rounded feathers (fix pass 2), their edges
  { type: "coverts", clip: B20.pts, tips: [[590, 222], [585, 250], [575, 280], [560, 312], [540, 342], [515, 366]], dirs: [[1, -0.45], [1, -0.4], [1, -0.3], [1, -0.2], [1, -0.1], [1, 0]], w: 22, depth: 70, ink: 1.6, hatch: 2, hatchV: 0.5, v: 0.92, seed: 57 },
  { type: "coverts", clip: B20.pts, tips: [[540, 238], [530, 266], [515, 296], [495, 330], [470, 358]], dirs: [[1, -0.5], [1, -0.4], [1, -0.3], [1, -0.2], [1, 0]], w: 20, depth: 50, ink: 1.5, hatch: 2, hatchV: 0.5, v: 0.95, seed: 58 },
  // the small pair thrust forward, blades down-left
  { type: "scissors", P: [372, 340], h: [{ T: [323, 352], hole: [366, 318, 15, 20, 20] }, { T: [337, 384], hole: [386, 328, 13, 18, -10] }], w: 10, ring: 4 },
  // headphones, bandage, the angry face
  { type: "ink", pts: [[390, 283], [396, 259], [412, 245], [436, 240], [458, 248]], w: 6, a: 0.8, b: 0.8, color: [0.16] },
  { type: "cup3", c: [466, 279], rx: 11, ry: 24, rot: -0.1, d: [-8, 3], back: 1, cs: 1.1, faceV: 0.42, sideV: 0.3, cushV: 0.1, rings: [0.4], hatch: 0.6, pleats: 16, ink: 2, seed: 71 },
  { type: "bandage", x: 433, y: 266, size: 24, rot: -0.8, cross: 1.52, sx: 1, sy: 1.05 },
  { type: "eye2", up: [[394, 296], [400, 294], [407, 297]], lo: [[395, 299], [401, 303], [407, 300]], pupil: [402, 298], pr: [2.6, 2.6], lidWs: [1, 2, 1.5], loWs: [0.5, 1, 0.5] },
  { type: "eye2", up: [[417, 300], [426, 296], [436, 297]], lo: [[418, 302], [427, 306], [436, 301]], pupil: [425, 300], pr: [3, 3], lidWs: [1.5, 2.2, 1], loWs: [0.5, 1, 0.5] },
  { type: "stroke", pts: [[391, 288], [400, 291], [409, 297]], ws: [1, 3, 4] },
  { type: "stroke", pts: [[415, 298], [426, 291], [439, 287]], ws: [4, 3, 1] },
  { type: "hbeak", upper: [[405, 306], [413, 304], [419, 309], [417, 318], [411, 325], [407, 318], [404, 311]], ink: 1.8 },
] };
const SPEC_B3 = { layers: [
  // fix pass 2 (read off a 4x grid of k14): the lower body and belly down to the feet, the right wing reaching out
  // to the right, two small clawed feet, the small pair held blades-up in the raised wing
  { type: "poly", smooth: true, pts: [[1850, 700], [1900, 694], [1928, 712], [1932, 740], [1912, 758], [1880, 762], [1855, 748], [1846, 722]], v: 0.86, ink: 1.6 },
  { type: "coverts", tips: [[1942, 724], [1935, 712], [1926, 736]], dirs: [[1, 0.2], [1, 0], [1, 0.4]], w: 12, depth: 40, ink: 1.4, hatch: 1, v: 0.88, seed: 59 },
  { type: "feet2", list: [{ toes: [[[1922, 746], [1932, 752], [1940, 756]], [[1920, 750], [1928, 758], [1934, 764]]], w: [6, 5], claws: [5, 5], curl: [1, 1] },
    { toes: [[[1884, 756], [1890, 764], [1896, 768]], [[1880, 758], [1882, 766], [1885, 772]]], w: [6, 5], claws: [5, 4], curl: [1, 1] }] },
  { type: "sil", ...B30, base: 0.88, rim: 0.74, depth: 8, blur: 8, ink: 1.4,
    hatch: { mode: "dir", dir: [0.6, 0.8], box: [1820, 670, 1960, 760], dens: 3, len: [14, 34], w: [0.7, 1.3], v: 0.55, alpha: 0.5, seed: 65 } },
  // the wing flung up (the raised claw), its feathers spiking up-left
  { type: "poly", pts: [[1834, 662], [1812, 642], [1795, 614], [1800, 600], [1810, 612], [1812, 592], [1822, 609], [1828, 596], [1834, 620], [1846, 642]], v: 0.88, ink: 1.8 },
  { type: "scissors", P: [1812, 650], h: [{ T: [1802, 603], hole: [1804, 664, 9, 7, 20] }, { T: [1820, 601], hole: [1822, 666, 9, 7, -10] }], w: 10, ring: 4 },
  { type: "lobe", pts: [[1798, 660], [1812, 654], [1830, 658], [1836, 670], [1820, 676], [1802, 672]], ink: 1.4, rim: 0.78, depth: 2, blur: 2, light: [0, -1] },
  ...[[[1834, 660], [1826, 676], [1818, 692]], [[1838, 668], [1832, 686], [1826, 700]]].map((pts) => ({ type: "stroke", pts, ws: [0.5, 1.4, 0.5], color: [0.35, 0.8] })),
  // headphones, bandage, the angry face looking left
  { type: "ink", pts: [[1838, 630], [1852, 615], [1875, 610], [1898, 616], [1908, 632]], w: 5, a: 0.8, b: 0.8, color: [0.16] },
  { type: "cup3", c: [1906, 652], rx: 9, ry: 19, rot: -0.1, d: [-6, 2], back: 1, cs: 1.1, faceV: 0.4, sideV: 0.3, cushV: 0.1, rings: [0.4], hatch: 0.6, pleats: 14, ink: 1.8, seed: 72 },
  { type: "bandage", x: 1861, y: 646, size: 22, rot: -0.8, cross: 1.52, sx: 1, sy: 1.05 },
  { type: "eye2", up: [[1848, 660], [1856, 657], [1864, 660]], lo: [[1849, 663], [1856, 666], [1863, 663]], pupil: [1852, 661], pr: [2.5, 2.5], lidWs: [1, 2, 1.5], loWs: [0.5, 1, 0.5] },
  { type: "eye2", up: [[1872, 660], [1881, 656], [1890, 658]], lo: [[1873, 663], [1881, 667], [1889, 662]], pupil: [1877, 661], pr: [2.8, 2.8], lidWs: [1.5, 2.2, 1], loWs: [0.5, 1, 0.5] },
  { type: "stroke", pts: [[1845, 652], [1855, 655], [1865, 660]], ws: [1, 3, 4] },
  { type: "stroke", pts: [[1870, 659], [1881, 652], [1893, 649]], ws: [4, 3, 1] },
  { type: "hbeak", upper: [[1859, 666], [1867, 665], [1872, 671], [1869, 681], [1863, 686], [1859, 677]], ink: 1.6 },
  { type: "fn", fn: (g) => {
    // the loops' motion echo: dark holes in pale rims, trailing down-left
    const rings = [[1812, 729, 16, 6.5, -0.2], [1804, 755, 16, 6.5, -0.2], [1792, 780, 14, 6, -0.2], [1783, 800, 12, 5, -0.2]];
    rings.forEach(([x, y, a, b, r], i) => {
      g.save(); g.globalAlpha = 1 - i * 0.15;
      g.fillStyle = gv(0.84); g.beginPath(); g.ellipse(x, y, a + 5, b + 5, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = gv(0.08); g.beginPath(); g.ellipse(x, y, a, b, r, 0, Math.PI * 2); g.fill();
      g.restore();
    });
  } },
] };

let C = null;
function caches() { if (!C) C = {}; return C; }
function owlLayer(name) {
  const c = caches();
  if (!c[name]) {
    const L = cv(), g = L.getContext("2d");
    paintSpec(g, name === "B1" ? SPEC_B1 : name === "B2" ? SPEC_B2 : SPEC_B3);
    if (name !== "B1") blurCanvas(L, name === "B2" ? 0.8 : 0.8);   // the small owls are soft (motion) in the source
    c[name] = L;
  }
  return c[name];
}

// ---------------------------------------------------------------- page furniture
function drawShards(g, alpha = 1) {
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = `rgba(10,10,10,${0.55 * alpha})`; g.lineWidth = 4.6;
  g.beginPath(); for (const s of SHARD_SEGS) { g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); } g.stroke();
  g.strokeStyle = `rgba(246,246,242,${alpha})`; g.lineWidth = 2.4;
  g.beginPath(); for (const s of SHARD_SEGS) { g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); } g.stroke();
  g.restore();
}
function drawConfetti(g, fi) {
  const f = HOLD.f[fi];
  g.save();
  CONFETTI.forEach(([x, y, w, h, a], i) => {
    const D = HOLD.D[i] || [0, 0];
    g.save(); g.translate(x + D[0] * f, y + D[1] * f); g.rotate(a * Math.PI / 180);
    g.fillStyle = "rgb(236,236,232)"; g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = "rgba(20,20,20,0.9)"; g.lineWidth = 1.4; g.strokeRect(-w / 2, -h / 2, w, h);
    g.restore();
  });
  g.restore();
}
function drawArc(g) {
  const n = ARC.length, Lf = [], Rt = [];
  for (let i = 0; i < n; i++) {
    const a = ARC[Math.max(0, i - 1)], b = ARC[Math.min(n - 1, i + 1)], p = ARC[i];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d, w = p[2] / 2;
    Lf.push([p[0] + nx * w, p[1] + ny * w]); Rt.push([p[0] - nx * w, p[1] - ny * w]);
  }
  g.save(); g.fillStyle = gv(246 / 255);
  g.beginPath(); g.moveTo(Lf[0][0], Lf[0][1]); for (const p of Lf) g.lineTo(p[0], p[1]); for (let i = n - 1; i >= 0; i--) g.lineTo(Rt[i][0], Rt[i][1]); g.closePath(); g.fill();
  g.restore();
}
// smoke: soft grey puffs (seeded) — the big cloud behind the raised wing and the trail to the right of it
function smokeLayer() {
  const c = caches();
  if (!c.smoke) {
    const L = cv(Math.ceil(W / 4), Math.ceil(H / 4)), g = L.getContext("2d"), r = rng(77);
    g.scale(0.25, 0.25);
    const puffs = [[1480, 430, 120, 90, 0.12], [1600, 470, 140, 110, 0.3], [1720, 440, 120, 90, 0.3], [1560, 360, 110, 70, 0.15], [1400, 520, 90, 60, 0.15], [1560, 570, 120, 70, 0.5],
      [1820, 520, 100, 80, 0.26], [1680, 600, 110, 70, 0.22], [1300, 430, 80, 60, 0.2], [1880, 660, 90, 110, 0.3], [1950, 720, 80, 90, 0.25]];
    for (const [x, y, a, b, al] of puffs) {
      for (let i = 0; i < 6; i++) {
        const dx = (r() - 0.5) * a, dy = (r() - 0.5) * b, s = 0.4 + r() * 0.5;
        const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, a * s);
        gr.addColorStop(0, `rgba(215,215,212,${al * 0.3})`); gr.addColorStop(1, "rgba(215,215,212,0)");
        g.fillStyle = gr; g.beginPath(); g.ellipse(x + dx, y + dy, a * s, b * s, 0, 0, Math.PI * 2); g.fill();
      }
    }
    blurCanvas(L, 3);
    c.smoke = L;
  }
  return c.smoke;
}

// the framed page with everything static (banner, shards, arc) and, for the margin glow, the owls at their median
// place; `bare` = the same without owls (inside the screen the owls are drawn per frame at their slides)
function framedWith(over, glow = 1) {
  const c = cv(), g = c.getContext("2d");
  drawFramedPage(g, sokoPageCanvas({ gaze: "down" }), { glow, over: (q) => {
    q.save(); framedTransform(q); q.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h); q.restore();
    drawShards(q);
    if (over) over(q);
  } });
  return c;
}
function marginAdd(ctx, v) {
  // the room is lit a little more than the finish-pass glow gives (measured pre-grade at k7/k12: margins +7…+19)
  const S = FRAMED.screen;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(S.x0, S.y0, S.x1 - S.x0, H - S.y0); ctx.clip("evenodd");
  ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
const OWLS = ["B1", "B2", "B3"];
// motion trails left behind the owls (translucent, soft copies of each drawing offset back along its path; read off
// the k10–18 median against the clean page: the big owl's ghost ≈ 330 px to its right at ≈ 35 %, the small owl's
// wisps up-right, a haze left of the bottom-right owl)
const GHOST = [[1340, 342], [1450, 330], [1560, 335], [1680, 352], [1760, 400], [1772, 500], [1745, 590], [1650, 625], [1500, 628], [1400, 615], [1342, 570], [1332, 410]];
const GHOST_F = [[[1400, 360], [1480, 380], [1560, 420], [1620, 470]], [[1420, 420], [1500, 440], [1580, 480], [1640, 520]], [[1380, 480], [1460, 500], [1540, 530], [1600, 560]], [[1480, 345], [1560, 360], [1640, 395], [1690, 430]]];
const GHOST_IN = GHOST.map(([x, y]) => [1520 + (x - 1520) * 0.9, 460 + (y - 460) * 0.88]);
// the ghost's feathers: long quills from upper left to lower right, a covert row (frame px, read off a 2x grid of k14)
const GHOST_Q = [{ r: [1420, 350], t: [1640, 440], w: 44, bend: 0.03 }, { r: [1440, 390], t: [1690, 500], w: 48, bend: 0.03 }, { r: [1420, 430], t: [1650, 540], w: 46, bend: 0.02 }, { r: [1400, 470], t: [1600, 580], w: 44, bend: 0.02 }, { r: [1500, 340], t: [1700, 420], w: 40, bend: 0.03 }];
const GHOST_C = [[1470, 400], [1500, 440], [1520, 480], [1540, 520], [1530, 360]];
const TRAILS = { B1: [[200, 25, 0.1]], B2: [[60, -30, 0.1], [120, -60, 0.07], [180, -90, 0.04]], B3: [[-30, 50, 0.16], [-50, 110, 0.12]] };
function trailLayer() {
  const c = caches();
  if (!c.trail) {
    const L = cv(), g = L.getContext("2d");
    // the small owls' soft trails and the haze left of the bottom-right owl (blurred)
    for (const n of ["B2", "B3"]) for (const [dx, dy, a] of TRAILS[n]) { g.globalAlpha = a; g.drawImage(owlLayer(n), dx, dy); }
    g.globalAlpha = 1;
    g.fillStyle = "rgba(230,230,226,0.18)"; g.beginPath(); g.ellipse(1790, 760, 60, 95, 0.3, 0, Math.PI * 2); g.fill();
    blurCanvas(L, 5);
    // the big owl's ghost (fix pass 2): the source leaves a darker, translucent echo of its wing to the right — a
    // grey veil the page shows through, crossed by long feather shapes pointing down-right (outlined, not blurred),
    // plus a faint sharp copy of the drawing along the trail
    const G2 = cv(), g2 = G2.getContext("2d");
    g2.save(); g2.filter = "blur(10px)";
    { const gr = g2.createLinearGradient(0, 360, 0, 620); gr.addColorStop(0, gv(0.56, 0.55)); gr.addColorStop(0.3, gv(0.46, 0.55)); gr.addColorStop(0.75, gv(0.66, 0.62)); gr.addColorStop(1, gv(0.5, 0.45)); g2.fillStyle = gr; }
    g2.beginPath(); smoothFn(GHOST)(g2); g2.fill(); g2.restore();
    const F2 = cv(), f2 = F2.getContext("2d");
    paintSpec(f2, { layers: [
      { type: "quills", list: GHOST_Q, ink: 2, lines: 4, lineV: 0.3, lineLen: [0.4, 0.85], tipPow: 0.7, widest: 0.35, rootK: 0.8, v: 0.5, seed: 67 },
      { type: "coverts", tips: GHOST_C, dir: [0.87, 0.5], w: 30, depth: 60, ink: 1.8, hatch: 3, hatchV: 0.3, v: 0.46, seed: 68 },
      { type: "hatch", clip: GHOST_IN, mode: "dir", dir: [0.87, 0.5], box: [1320, 320, 1720, 600], dens: 2.2, len: [24, 70], w: [0.8, 1.4], v: 0.25, alpha: 0.5, seed: 69 },
    ] });
    g2.save(); g2.beginPath(); smoothFn(GHOST)(g2); g2.clip(); g2.globalAlpha = 0.55; g2.drawImage(F2, 0, 0); g2.restore();
    for (const [dx, dy, a] of TRAILS.B1) { g2.globalAlpha = a; g2.drawImage(owlLayer("B1"), dx, dy); }
    g2.globalAlpha = 1;
    blurCanvas(G2, 0.8);
    g.drawImage(G2, 0, 0);
    c.trail = L;
  }
  return c.trail;
}
function holdBase() {
  const c = caches();
  if (!c.hold) {
    const full = framedWith((q) => { drawArc(q); q.drawImage(smokeLayer(), 0, 0, W, H); q.drawImage(trailLayer(), 0, 0); for (const n of OWLS) q.drawImage(owlLayer(n), 0, 0); });
    const bare = framedWith((q) => { drawArc(q); q.drawImage(smokeLayer(), 0, 0, W, H); q.drawImage(trailLayer(), 0, 0); }, 0);
    const g = full.getContext("2d"), S = FRAMED.screen;
    g.save(); g.beginPath(); g.rect(S.x0, S.y0, S.x1 - S.x0, H - S.y0); g.clip(); g.drawImage(bare, 0, 0); g.restore();
    marginAdd(g, 12);
    c.hold = full;
  }
  return c.hold;
}
// k8–18
export function drawPageHold(ctx, k) {
  const i = Math.max(0, Math.min(10, k - 8));
  ctx.drawImage(holdBase(), 0, 0);
  const S = FRAMED.screen;
  ctx.save(); ctx.beginPath(); ctx.rect(S.x0, S.y0, S.x1 - S.x0, H - S.y0); ctx.clip();
  OWLS.forEach((n) => { const d = HOLD.owl[n][i]; ctx.drawImage(owlLayer(n), d[0], d[1]); });
  // the extra smoke of the first hold frames (additive, fading)
  const a = SMOKE_A[i];
  if (a > 0.01) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, a) * 0.6; ctx.drawImage(smokeLayer(), 0, 0, W, H); ctx.restore(); }
  ctx.restore();
  drawConfetti(ctx, i + 1);
}
// k7: the owls smeared along their motion (measured head places and smear directions / lengths)
const SMEAR = { B1: { dx: 1, dy: 0, len: 600, n: 18, at: [360, 30], s: 1.1, c: [1150, 460] }, B2: { dx: 1, dy: -0.215, len: 650, n: 16, at: [150, -110], s: 1.6, c: [470, 290] }, B3: { dx: 0, dy: 1, len: 200, n: 10, at: [-60, 70], s: 1, c: [1860, 690] } };
export function drawPageSmear(ctx) {
  const c = caches();
  if (!c.smear) {
    const sm = cv(), sg = sm.getContext("2d");
    for (const n of OWLS) {
      const s = SMEAR[n], L = owlLayer(n), u = [s.dx, s.dy], l = Math.hypot(u[0], u[1]);
      // fix pass 1: three times the copies at a fifth of the weight (fitted on k7) (sub-step spacing, so the smear reads as one
      // continuous streak instead of a row of stamps); the leading copy keeps its weight
      const N = s.n * 3;
      for (let j = N - 1; j >= 0; j--) {
        const t = j / (N - 1);
        sg.globalAlpha = j === 0 ? 0.75 : (0.2 * (1 - t) + 0.06) / 5 * (s.tail ?? 1);
        const ox = s.at[0] + u[0] / l * s.len * t, oy = s.at[1] + u[1] / l * s.len * t;
        sg.setTransform(s.s, 0, 0, s.s, s.c[0] * (1 - s.s) + ox, s.c[1] * (1 - s.s) + oy);
        sg.drawImage(L, 0, 0);
        sg.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
    // fix pass 2: the big pair's blades reach out ahead of the smeared owl (to x ≈ 963 at y 373–473 on the source),
    // smeared the same way: an extra layer, the existing smear stays where it was fitted
    for (let j = 23; j >= 0; j--) {
      const t = j / 23;
      sg.globalAlpha = j === 0 ? 0.6 : (0.2 * (1 - t) + 0.05) / 2;
      drawScissors(sg, { P: [1330 + 260 * t, 425], h: [{ T: [963 + 260 * t, 385], hole: [1410 + 260 * t, 395, 50, 26, -8] }, { T: [968 + 260 * t, 468], hole: [1415 + 260 * t, 462, 56, 26, 6] }], w: 30, ring: 8 });
    }
    sg.globalAlpha = 1;
    blurCanvas(sm, 4);
    const full = framedWith((q) => q.drawImage(sm, 0, 0));
    const g = full.getContext("2d"), S = FRAMED.screen;
    marginAdd(g, 12);
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0); g.clip("evenodd"); g.drawImage(sm, 0, 0); g.restore();
    drawConfetti(g, 0);
    c.smear = full;
  }
  ctx.drawImage(c.smear, 0, 0);
}
// k19: the k18 frame averaged along 45.5° over 100 px (fit on the source), white washing in from the top-left
function ramp(ctx, phiDeg, d0, w, v, invert = false) {
  const p = phiDeg * Math.PI / 180, c = Math.cos(p), sn = Math.sin(p);
  const g = ctx.createLinearGradient(c * (d0 - 6 * w), sn * (d0 - 6 * w), c * (d0 + 6 * w), sn * (d0 + 6 * w));
  for (let i = 0; i <= 24; i++) { const u = i / 24, d = (u - 0.5) * 12, a0 = 1 / (1 + Math.exp(d)), a = invert ? 1 - a0 : a0; g.addColorStop(u, `rgba(${v},${v},${v},${a.toFixed(4)})`); }
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
export { ramp };
export function drawPageWhip(ctx) {
  const c = caches();
  if (!c.whip) {
    const src = cv(); drawPageHold(src.getContext("2d"), 18);
    c.whip = cv();
    const g = c.whip.getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    const n = 24, ang = 45.5 * Math.PI / 180, len = 100;
    for (let i = 0; i < n; i++) { const f = i / (n - 1) - 0.5; g.globalAlpha = 1 / (i + 1); g.drawImage(src, Math.cos(ang) * len * f, Math.sin(ang) * len * f); }
    g.globalAlpha = 1;
    const S = FRAMED.screen;
    g.save(); g.beginPath(); g.rect(S.x0, S.y0, S.x1 - S.x0, H - S.y0); g.clip(); ramp(g, 66.6, 574.1, 54.9, 247); g.restore();
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(S.x0, S.y0, S.x1 - S.x0, H - S.y0); g.clip("evenodd"); ramp(g, 65.9, 652.2, 33.2, 255); g.restore();
  }
  ctx.drawImage(c.whip, 0, 0);
}
export function releasePage() { C = null; }
