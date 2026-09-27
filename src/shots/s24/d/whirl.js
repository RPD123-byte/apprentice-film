// s24 whirl (k63–66): four in-between drawings of the owl spinning a full turn, curled round its head. Each frame:
// its measured silhouettes (silW.js), the head as a ball in the middle, the headphone band as a dark ring round it,
// the cup, a few face marks (read off 0.9x grids of each frame), spiral feather flow. Drawn procedurally.
import { paintSpec } from "./paint.js";
import * as S from "./silW.js";
import { gv } from "../../../lib/owlInk.js";
import { rng } from "../../../lib/rng.js";
import { polyPath } from "./art.js";
import { stroke } from "./art2.js";

// the headphone band seen round the spinning head: a dark arc from a0 to a1 (degrees, clockwise from +x)
const ring = (cx, cy, r0, r1, v = 0.2, a0 = 0, a1 = 360) => ({ type: "fn", fn: (g) => {
  const A0 = a0 * Math.PI / 180, A1 = a1 * Math.PI / 180;
  g.fillStyle = gv(v); g.beginPath(); g.arc(cx, cy, r1, A0, A1); g.arc(cx, cy, r0, A1, A0, true); g.closePath(); g.fill();
  g.strokeStyle = gv(0.55, 0.8); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, (r0 + r1) / 2, A0 + 0.05, A1 - 0.05); g.stroke();
} });
const spiral = (c, seed, box) => ({ center: c, rx: 1, ry: 1, r0: -1e9, gain: 1, max: 0.75, box, dens: 1.8, len: [20, 50], w: [0.7, 1.2], v: 0.45, alpha: 0.55, seed });
const sil = (s, c, seed, extra = {}) => ({ type: "sil", ...s, base: 0.95, rim: 0.82, depth: 16, blur: 14, ink: 2.4, hatch: spiral(c, seed, bboxOf(s.pts)), ...extra });
const notch = (s, c, len = 50) => ({ type: "notch", notch: s.notch, root: c, len, w: 2.6, bend: 0.1 });
// the wing smeared round the spin: overlapping feather edges (short tapered arcs about the spin centre, seeded) and
// fine hatching along the spin (fix pass 1 — replaces the jagged 'finger' notches)
const featherArcs = (c, r0, r1, a0, a1, n, seed, clip) => ({ type: "fn", fn: (g) => {
  const r = rng(seed);
  g.save(); if (clip) { g.beginPath(); polyPath(clip)(g); g.clip(); }
  for (let i = 0; i < n; i++) {
    const R = r0 + (r1 - r0) * r(), A = (a0 + (a1 - a0) * r()) * Math.PI / 180, L = (0.12 + 0.18 * r()) * (Math.PI / 2), pts = [];
    for (let j = 0; j <= 8; j++) { const a = A + L * j / 8, rr = R - 10 * Math.sin(Math.PI * j / 8); pts.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr]); }
    stroke(g, pts, [0.4, 2.2 + r() * 1.4, 1.6, 0.4], { color: gv(0.12 + 0.25 * r(), 0.85) });
  }
  g.restore();
} });
const spinFine = (clip, c, seed) => ({ type: "fine", clipPoly: clip, center: c, twist: 0, box: bboxOf(clip), spacing: 4, len: [18, 44], w: [0.5, 1.0], v: 0.5, alpha: 0.6, seed });
function bboxOf(p) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of p) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; }

export const WHIRL = {
  63: { layers: [
    ring(1112, 410, 150, 205, 0.18, 150, 470),
    sil(S.W63_0, [1112, 410], 101), notch(S.W63_0, [1112, 410]),
    sil(S.W63_1, [1112, 410], 102, { base: 0.96, rim: 0.84, hatch: null }),
    sil(S.W63_2, [1112, 410], 103), sil(S.W63_3, [1112, 410], 104), sil(S.W63_4, [1112, 410], 105),
    { type: "cup", c: [1318, 405], rx: 30, ry: 72, rot: 0.05, cush: [-0.5, 0], hi: 0.4, plateV: 0.28, shellV: 0.2 },
    { type: "ink", pts: [[1022, 330], [1040, 340], [1052, 360], [1046, 378]], w: 3, a: 0.4, b: 0.3 },
    { type: "ink", pts: [[1060, 368], [1100, 372], [1140, 380]], w: 2.4, a: 0.3, b: 0.3 },
    { type: "ink", pts: [[1130, 440], [1150, 450], [1170, 445]], w: 2.4, a: 0.3, b: 0.3 },
    { type: "ink", pts: [[1040, 420], [1060, 445], [1062, 470]], w: 2.2, a: 0.3, b: 0.3, color: [0.35] },
    // the face seen upside down in the spin (fix pass 2, re-read off a 1.6x grid): an almond eye under a heavy lid at
    // the upper left, the long scowl, the hooked beak below it, the other eye a lidded curve at the right, the mouth
    { type: "eye2", up: [[1006, 352], [1014, 338], [1030, 335], [1045, 348]], lo: [[1008, 358], [1020, 372], [1036, 374], [1046, 356]], pupil: [1031, 356], pr: [5.5, 5.5], cat: [1033, 353, 1.6],
      lidWs: [2, 4.5, 4.5, 2], loWs: [0.6, 1.6, 1.6, 0.6] },
    { type: "stroke", pts: [[1054, 373], [1085, 360], [1116, 352], [1145, 356], [1166, 365], [1185, 386]], ws: [2, 5, 6, 5, 3.5, 1.2] },
    { type: "hbeak", upper: [[1006, 410], [1022, 404], [1038, 412], [1042, 432], [1034, 456], [1024, 470], [1018, 452], [1020, 432], [1010, 424]],
      gape: [[1010, 424], [1020, 432], [1018, 452], [1024, 470], [1010, 462], [1004, 440]], ink: 2.6 },
    { type: "stroke", pts: [[1162, 418], [1147, 430], [1141, 450], [1149, 468], [1168, 480]], ws: [1, 3, 3.5, 3, 1] },
    { type: "stroke", pts: [[1175, 410], [1200, 415], [1222, 432]], ws: [1, 3, 1.2] },
    { type: "stroke", pts: [[1170, 484], [1195, 494], [1222, 489]], ws: [1, 3, 1] },
  ] },
  64: { layers: [
    ring(1150, 485, 195, 240, 0.18, -85, 95),
    sil(S.W64_0, [1150, 485], 111, { hatch: null }), sil(S.W64_1, [1150, 485], 112, { ink: 1.6, hatch: null }),
    spinFine(S.W64_1.pts, [1150, 485], 113), featherArcs([1150, 485], 250, 560, 110, 250, 70, 114, S.W64_1.pts),
    // fix pass 2: the head's strokes follow the spin as short, gently curved arcs about far-off centres (not one
    // concentric 'record groove')
    { type: "fine", clipPoly: S.W64_0.pts, center: [1150, 1250], twist: 0, box: [980, 420, 1300, 660], spacing: 6, len: [10, 24], w: [0.5, 1.0], v: 0.5, alpha: 0.55, seed: 115, tone: 0.55 },
    { type: "fine", clipPoly: S.W64_0.pts, center: [400, 420], twist: 0, box: [950, 300, 1120, 520], spacing: 7, len: [10, 22], w: [0.5, 0.9], v: 0.5, alpha: 0.5, seed: 116, tone: 0.5 },
    { type: "shade", clip: S.W64_0.pts, shape: [1150, 485, 190, 190, 0], v: 0.97, alpha: 0.6, blur: 20 },
    { type: "cup", c: [1290, 410], rx: 42, ry: 105, rot: -0.15, cush: [-0.45, 0], hi: 0.4, plateV: 0.28, shellV: 0.2 },
    // the scowl (read off a 1.4x grid): a bulging eye under a heavy brow, the beak sketched at the left, gritted
    { type: "eye2", up: [[1044, 378], [1062, 371], [1082, 369], [1102, 372], [1123, 393]], lo: [[1046, 383], [1060, 402], [1080, 410], [1100, 410], [1120, 398]],
      pupil: [1068, 395], pr: [12, 12], cat: [1073, 389, 3.5], lidWs: [3, 6, 6, 5, 2], loWs: [1, 2.4, 2.8, 2.4, 1] },
    { type: "stroke", pts: [[994, 356], [1044, 348], [1094, 348], [1130, 362]], ws: [2, 6, 6, 3] },
    { type: "stroke", pts: [[1120, 400], [1137, 430], [1151, 447]], ws: [2, 2.6, 1] },
    // the gritted hooked beak at the left (fix pass 2): the upper mandible hooking down over a dark gape with tooth-like
    // ticks across it
    { type: "hbeak", upper: [[948, 332], [972, 322], [996, 336], [1006, 366], [1000, 398], [986, 428], [966, 446], [958, 430], [968, 404], [970, 376], [958, 352]],
      gape: [[958, 350], [972, 376], [970, 406], [958, 432], [942, 420], [944, 390], [942, 362]], ink: 3 },
    ...[[[944, 368], [956, 366], [968, 372]], [[943, 392], [956, 392], [969, 396]], [[945, 414], [955, 416], [963, 421]]].map((pts) => ({ type: "stroke", pts, ws: [1.2, 2, 1.2], color: [0.85] })),
    { type: "bandage", x: 1160, y: 560, size: 100, rot: 0.6, cross: 1.5, sx: 1, sy: 1.05 },
    // the jaw line under the bandage (the source's, shorter and higher than the old 'smile' arc) and the dark wedge at its end
    { type: "stroke", pts: [[1128, 602], [1175, 612], [1225, 606], [1262, 588]], ws: [0.8, 2.4, 3, 1.6] },
    { type: "poly", smooth: true, pts: [[1226, 584], [1256, 574], [1262, 590], [1240, 608]], v: 0.1, ink: 0 },
  ] },
  65: { layers: [
    ring(1065, 520, 190, 232, 0.18, -95, 85),
    sil(S.W65_0, [1065, 520], 121), notch(S.W65_0, [1065, 520]), sil(S.W65_1, [1065, 520], 122), notch(S.W65_1, [1065, 520]),
    sil(S.W65_2, [1065, 520], 123), sil(S.W65_3, [1065, 520], 124),
    { type: "shade", clip: S.W65_0.pts, shape: [1065, 520, 180, 180, 0], v: 0.97, alpha: 0.6, blur: 20 },
    { type: "cup", c: [1190, 345], rx: 38, ry: 92, rot: -1.2, cush: [-0.45, 0], hi: 0.4, plateV: 0.28, shellV: 0.2 },
    // the scowl, turned a quarter (read off a 1.5x grid): the lidded eye, the brow strokes, the hooked beak with its gape
    // fix pass 2 (1.3x grid): the eye narrowed under a heavy lid running up to the right, the pupil at its inner end
    { type: "eye2", up: [[1015, 488], [1035, 472], [1062, 463], [1090, 458], [1108, 454]], lo: [[1020, 494], [1042, 508], [1068, 508], [1094, 494], [1108, 458]],
      pupil: [1036, 492], pr: [10, 10], cat: [1040, 488, 3], lidWs: [2, 6.5, 7.5, 6, 2], loWs: [0.8, 2.2, 2.4, 1.8, 0.6] },
    { type: "stroke", pts: [[940, 467], [967, 480], [987, 500]], ws: [2, 5, 3] },
    { type: "stroke", pts: [[940, 494], [963, 500], [985, 512]], ws: [1.5, 4, 2] },
    { type: "hbeak", upper: [[980, 560], [1007, 553], [1027, 567], [1020, 600], [1010, 630], [1000, 613], [987, 587]], gape: [[994, 572], [1004, 568], [1010, 590], [1006, 618], [998, 600]], ink: 3 },
    { type: "bandage", x: 1203, y: 537, size: 92, rot: 0.8, cross: 1.5, sx: 1, sy: 1.05 },
  ] },
  66: { layers: [
    sil(S.W66_1, [1060, 480], 131), notch(S.W66_1, [1300, 420], 60),
    sil(S.W66_0, [1060, 480], 132), notch(S.W66_0, [900, 400], 60),
    sil(S.W66_3, [1060, 480], 133), sil(S.W66_2, [1060, 480], 134), sil(S.W66_4, [1060, 480], 135), sil(S.W66_5, [1060, 480], 136), sil(S.W66_7, [1060, 480], 137),
    { type: "band", pts: [[989, 333], [1030, 296], [1067, 278], [1110, 270], [1156, 272], [1210, 285], [1267, 311], [1300, 360], [1322, 422], [1318, 480], [1311, 522], [1289, 600]], w: 20 },
    { type: "cup", c: [963, 428], rx: 60, ry: 84, rot: 0.55, cush: [0.45, 0], hi: 0.45, plateV: 0.3, shellV: 0.2 },
    { type: "bandage", x: 1141, y: 433, size: 150, rot: 0.24, cross: 1.2, sx: 1, sy: 1.05 },
    // the scowl (read off a 2x grid): heavy wedge brows over lidded eyes, the hooked beak open
    { type: "eye2", up: [[1055, 520], [1080, 525], [1105, 545], [1125, 570], [1150, 597]], lo: [[1058, 526], [1060, 560], [1075, 585], [1100, 595], [1130, 597], [1150, 597]],
      pupil: [1104, 568], pr: [12, 12], cat: [1098, 560, 3.5], lidWs: [2, 3.5, 5, 6, 3], loWs: [1, 2.6, 3, 2.6, 1.6, 0.8] },
    { type: "stroke", pts: [[1080, 510], [1105, 550], [1130, 585], [1150, 597]], ws: [2, 9, 8, 2] },
    // fix pass 2 (2x grid): the right eye narrowed under its heavy lid, the pupil tucked up
    { type: "eye2", up: [[1172, 613], [1190, 606], [1212, 601], [1240, 588]], lo: [[1176, 618], [1192, 628], [1212, 630], [1232, 620], [1240, 594]],
      pupil: [1200, 617], pr: [7, 7], cat: [1202, 614, 2.2], lidWs: [3, 6.5, 7, 5, 2], loWs: [0.8, 2.2, 2.4, 1.8, 0.8] },
    { type: "hbeak", upper: [[1100, 648], [1118, 642], [1142, 646], [1158, 656], [1160, 675], [1150, 692], [1138, 702], [1134, 690], [1136, 672], [1124, 662], [1108, 660]],
      lower: [[1100, 652], [1106, 676], [1116, 696], [1130, 702], [1134, 692], [1120, 680], [1110, 664]], lowerV: 0.88,
      gape: [[1104, 656], [1116, 660], [1128, 668], [1133, 682], [1130, 694], [1118, 690], [1108, 674]], tongue: [[1112, 670], [1121, 672], [1125, 684], [1117, 687]], tongueV: 0.72,
      lines: [[[1146, 652], [1150, 666], [1148, 680]], [[1152, 656], [1155, 668], [1153, 682]]], ink: 3 },
    // the two pairs: the lower-left pair held by its loops (blades down-right), the right pair hanging by its loops
    // fix pass 2 (1.6x grids): both pairs gripped by the wings' feathered fists (three lobes over the rings), the
    // blades rotated to the source's angles (left pair down-right, right pair down / down-left), the glint re-placed
    { type: "scissors", P: [926, 791], h: [{ T: [992, 944], hole: [870, 690, 44, 70, 20] }, { T: [1045, 938], hole: [905, 740, 40, 64, -10] }], w: 30, bw: 44, ring: 11 },
    ...[[[830, 690], [860, 680], [900, 698], [906, 728], [880, 734], [845, 720]], [[824, 736], [860, 730], [898, 744], [902, 770], [870, 778], [834, 766]], [[838, 776], [872, 778], [902, 790], [896, 806], [862, 806], [842, 796]]]
      .map((pts) => ({ type: "lobe", pts, ink: 2.4, rim: 0.78, depth: 5, blur: 4, light: [-0.6, -0.8] })),
    { type: "scissors", P: [1394, 700], h: [{ T: [1298, 936], hole: [1350, 600, 40, 64, 20] }, { T: [1382, 942], hole: [1405, 610, 38, 60, -10] }], w: 30, bw: 44, ring: 11, G: [[1405, 893, 40]] },
    ...[[[1330, 590], [1362, 578], [1398, 590], [1402, 616], [1372, 624], [1338, 612]], [[1340, 622], [1375, 622], [1410, 632], [1412, 656], [1380, 662], [1346, 650]], [[1362, 656], [1392, 660], [1418, 670], [1412, 690], [1384, 690], [1364, 678]]]
      .map((pts) => ({ type: "lobe", pts, ink: 2.4, rim: 0.78, depth: 5, blur: 4, light: [-0.6, -0.8] })),
  ] },
};

const CACHE = {};
export function whirlLayer(k) {
  if (!CACHE[k]) { const c = document.createElement("canvas"); c.width = 2206; c.height = 946; paintSpec(c.getContext("2d", { willReadFrequently: true }), WHIRL[k]); CACHE[k] = c; }
  return CACHE[k];
}
export function releaseWhirl() { for (const k in CACHE) delete CACHE[k]; }
