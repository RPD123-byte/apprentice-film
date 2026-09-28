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
// ending fix (re-read off 6x grids of k75): big round eyes — a heavy brow-lid wedge (≈ 17 px at its widest) over
// each, the pupil hanging from it, a heavy lower-lid ring round the white
const EYE_L = { up: [[1036, 521], [1060, 527], [1087, 533], [1110, 549], [1131, 566]], lo: [[1038, 523], [1044, 545], [1053, 563], [1070, 575], [1090, 579], [1112, 577], [1127, 572], [1131, 566]],
  pupil: [1101, 553], pr: [14, 13], cat: [1092, 551, 3.6, 2.6], lidWs: [0.1, 0.1, 0.1, 0.1], loWs: [2.4, 3.4, 4.4, 5, 5, 4.6, 3.6, 2] };
const EYE_R = { up: [[1177, 560], [1192, 553], [1207, 545], [1220, 535], [1233, 523]], lo: [[1177, 561], [1184, 568], [1195, 571], [1210, 573], [1223, 568], [1232, 557], [1236, 541], [1233, 523]],
  pupil: [1207, 555], pr: [11, 10], cat: [1201, 555, 3, 2.4], lidWs: [0.1, 0.1, 0.1, 0.1], loWs: [2, 3.8, 4.4, 4.6, 4.6, 4.2, 3.6, 2] };
// the heavy brow-lid wedges (the source's scowl) and the thin upper-lid crease at the left eye's outer corner
const BROW_L = [[1044, 496], [1062, 506], [1087, 522], [1112, 544], [1128, 556], [1150, 558]];
const BROW_R = [[1251, 505], [1238, 513], [1224, 525], [1210, 538], [1196, 550], [1184, 558], [1175, 563]];
const LID_L = [[1031, 518], [1050, 522], [1070, 527], [1088, 532]];
// fix pass 2 (re-read off a 4x grid of k75): the hooked upper mandible overhanging a narrow dark gape with the tongue
// in it, the pale lower mandible below, fine hatching (no smooth grey)
// ending fix (re-read off a 6x grid of k75): a taller hooked upper mandible (its culmen rises to y ≈ 581 between
// the brows), the hook at (1173, 655); the lower mandible ends left of the hook; the gape dark only along its edges
// with the grey tongue inside
const BEAK = {
  upper: [[1117, 603], [1130, 599], [1143, 596], [1150, 590], [1157, 584], [1167, 581], [1179, 582], [1187, 591], [1191, 605], [1192, 620], [1190, 635], [1184, 646], [1173, 655], [1167, 644], [1162, 631], [1157, 622], [1140, 613], [1124, 606]],
  lower: [[1119, 607], [1122, 620], [1128, 632], [1140, 645], [1150, 652], [1159, 655], [1156, 646], [1146, 636], [1134, 622], [1124, 610]], lowerV: 0.88,
  gape: [[1121, 605], [1140, 613], [1157, 622], [1162, 631], [1166, 644], [1171, 654], [1160, 653], [1154, 641], [1146, 629], [1132, 618], [1122, 610]],
  tongue: [[1129, 611], [1149, 620], [1157, 630], [1161, 644], [1157, 646], [1150, 637], [1139, 625], [1129, 615]], tongueV: 0.62,
  lines: [[[1180, 600], [1184, 618], [1182, 636]], [[1173, 598], [1176, 616], [1174, 634]], [[1166, 590], [1170, 604], [1169, 616]], [[1134, 601], [1142, 605], [1150, 611]]],
  crease: [[1159, 604], [1164, 599], [1171, 601]], ink: 3.2 };
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

// ending fix: primaries / tail feathers for the barbs (tips = the silhouettes' tips, shafts aimed at the wing roots)
const aim = (tips, R, k) => tips.map((t) => ({ t, r: [t[0] + (R[0] - t[0]) * k, t[1] + (R[1] - t[1]) * k] }));
const LOW_P = aim([[445, 409], [494, 410], [556, 432], [621, 428], [485, 547], [540, 653], [629, 741], [673, 798], [836, 857], [909, 866]], [930, 620], 0.62);
const TAIL_P = aim([[545, 10], [496, 74], [510, 142], [454, 229], [606, 47], [665, 87]], [730, 270], 0.6);
const UP_P = aim([[926, 99], [956, 147], [981, 192], [1027, 92], [1155, 122], [1266, 179]], [1250, 360], 0.6);

export const SPEC_J = { layers: [
  // body, tail, feet, lower wing and head (one silhouette); the crown and the cheek line are inked by hand below
  { type: "sil", ...J0, base: 0.97, rim: 0.93, depth: 34, blur: 24, ink: 3, inkSkip: [[960, 300, 1215, 368], [830, 530, 990, 700]],
    hatch: [{ center: [800, 320], rx: 230, ry: 160, r0: 0.55, gain: 1.8, box: [570, 170, 1020, 480], dens: 1.8, v: 0.42, seed: 12 },
      { mode: "dir", dir: [-0.9, -0.44], box: [440, 400, 1000, 880], dens: 2, len: [18, 46], w: [0.7, 1.2], v: 0.5, alpha: 0.55, seed: 18 },
      { mode: "dir", dir: [-0.78, -0.62], box: [440, 10, 760, 240], dens: 3, len: [20, 50], w: [0.7, 1.1], v: 0.45, alpha: 0.6, seed: 19 }] },
  // ending fix: the trailing foot drawn as a foot (the silhouette alone read as a white blob): scaled toes with hooked
  // claws, the hind toe and the feathered leg (read off a 3x grid of k75)
  { type: "feet2", leg: 20, list: [{ leg: [[500, 263], [526, 269], [552, 276]], legW: 24, stub: [542, 292, 24, 15, 0.35],
    toes: [[[500, 258], [495, 240], [490, 222]], [[495, 258], [475, 248], [455, 240]], [[492, 265], [468, 262], [442, 258]], [[492, 272], [470, 278], [452, 281]], [[548, 262], [553, 252], [557, 244]]],
    w: [14, 14, 13, 13, 11], claws: [15, 16, 14, 14, 11], curl: [-1, 1, 1, -1, 1] }] },
  { type: "fine", clipPoly: J0.pts, center: [1080, 500], rx: 180, ry: 170, r0: 0.72, gain: 2.5, max: 1, box: [860, 520, 1270, 690], spacing: 5, len: [8, 20], w: [0.5, 0.9], v: 0.55, alpha: 0.6, seed: 17 },
  // tail separations, lower-wing separations and its covert row, the wing's upper edge against the body
  { type: "notch", notch: [[546, 81], [517, 85], [610, 226], [613, 240], [699, 180], [696, 174], [604, 63]], dir: [0.6, 0.8], len: 90, w: 2.6 },
  { type: "notch", notch: [[616, 498], [568, 525], [585, 616], [631, 692], [699, 760], [738, 794], [790, 822], [849, 830], [917, 828]], root: [960, 560], len: 70, w: 2.8, bend: 0.04 },
  { type: "notch", notch: [[663, 417], [728, 425], [716, 434], [683, 441], [653, 456]], dir: [0.95, 0.3], len: 50, w: 2.4 },
  { type: "row", clip: J0.pts, tips: COV_LO, roots: [[760, 470], [840, 560], [920, 650], [990, 720]], w: [56, 46], side: "l", from: 0.4, hook: 0.35, seed: 41 },
  // ending fix — engraving: barbs along the lower wing's primaries and the tail feathers, fur tufts on the body and
  // a fan of long strokes at the lower wing's root (placed by comparing ink-density maps at k75)
  { type: "barbs", list: LOW_P, n: 5, width: 30, from: [0.25, 0.45], to: [0.75, 0.92], w: [0.8, 1.4], v: 0.34, alpha: 0.85, bias: 0.1, seed: 461, clipPoly: J0.pts },
  { type: "barbs", list: TAIL_P, n: 4, width: 26, from: [0.2, 0.4], to: [0.7, 0.9], w: [0.8, 1.4], v: 0.34, alpha: 0.85, seed: 462, clipPoly: J0.pts },
  { type: "contour", poly: J0.pts, box: [570, 190, 700, 470], rows: 11, gap: 6, dash: [25, 80], skip: [8, 30], fall: 0.86, w: [0.6, 1.3], v: 0.38, alpha: 0.8, seed: 467 },
  { type: "contour", poly: J0.pts, box: [700, 90, 1000, 230], rows: 5, gap: 7, dash: [25, 70], skip: [10, 40], fall: 0.75, w: [0.6, 1.1], v: 0.45, alpha: 0.75, seed: 468 },
  { type: "tufts", clipPoly: J0.pts, box: [440, 100, 1000, 560], flow: [0.8, 0.6], seed: 463,
    blobs: [[640, 170, 110, 45, 0.6, 0.5], [560, 330, 60, 90, 0.55], [800, 470, 90, 40, 0.45], [720, 330, 180, 110, 0.12]], base: 0.04,
    cell: 28, n: [3, 6], len: [22, 44], gap: 4.0, bend: 0.08, w: [0.7, 1.2], v: [0.55, 0.42], alpha: 0.75 },
  { type: "tufts", clipPoly: J0.pts, box: [440, 380, 1000, 880], flow: [-1, 0], centres: [[960, 620, 700, "r", 1]], seed: 464,
    blobs: [[560, 540, 90, 130, 0.55], [700, 760, 130, 60, 0.6], [880, 800, 70, 50, 0.5]], base: 0.05,
    cell: 22, n: [3, 6], len: [26, 54], gap: 4.0, bend: 0.08, w: [0.7, 1.2], v: [0.5, 0.38], alpha: 0.8 },
  { type: "ink", pts: [[660, 452], [730, 440], [800, 460], [850, 500], [880, 560], [920, 640], [966, 700]], w: 3, a: 0.4, b: 0.5 },
  // the wing's leading edge under the cheek (a tapered line, not the slit's outline)
  { type: "stroke", pts: [[840, 545], [844, 580], [853, 620], [872, 654], [902, 677], [940, 688], [985, 692]], ws: [0.8, 2.2, 3.4, 4.2, 3.6, 2.4, 0.8] },
  // the neck line and the head's lower outline over the body
  { type: "ink", pts: [[842, 551], [860, 610], [900, 650], [960, 675], [1040, 690], [1120, 682]], w: 2.2, a: 0.4, b: 0.4, color: [0.25, 0.9] },
  // upper wing
  { type: "sil", ...J1, base: 0.965, rim: 0.93, depth: 20, blur: 16, ink: 2.6,
    hatch: { mode: "dir", dir: [-0.85, -0.52], box: [920, 80, 1430, 460], dens: 2.2, len: [18, 46], w: [0.7, 1.2], v: 0.5, alpha: 0.55, seed: 20 } },
  { type: "notch", notch: [[1118, 157], [1059, 173], [1049, 207], [1017, 221], [986, 240], [1366, 291], [1310, 239], [1273, 207], [1210, 181]], root: [1330, 420], len: 70, w: 2.8, bend: 0.04, only: [0, 1, 2, 3, 4] },
  // ending fix: the upper covert row as the source's hooks — each covert's rounded tip points up-left, its long upper edge
  // runs back along the wing, the lower edge is hidden by the next (3.2x grid of k75)
  { type: "arches", tips: COV_UP, dir: [-0.9, -0.44], w: 21, la: 14, lb: 85, pow: 1.2, ink: 3.2, lines: 0, clipPoly: J1.pts, seed: 42 },
  { type: "barbs", list: UP_P, n: 5, width: 30, from: [0.25, 0.45], to: [0.75, 0.92], w: [0.8, 1.4], v: 0.34, alpha: 0.85, bias: -0.1, seed: 465, clipPoly: J1.pts },
  { type: "tufts", clipPoly: J1.pts, box: [1000, 180, 1440, 420], flow: [-0.8, -0.6], centres: [[1330, 400, 300, "r", 0.8]], seed: 466,
    blobs: [[1330, 330, 60, 50, 0.5], [1200, 250, 80, 40, 0.3]], base: 0.03, cell: 24, n: [3, 5], len: [22, 44], gap: 3.8, bend: 0.1, w: [0.6, 1.1], v: [0.55, 0.42], alpha: 0.75 },
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
  // ending fix — the facial disc: a ruff of fine strokes along the head's lower contour (leaning along it, into the
  // face) and the cheeks engraved round the face; the brow ridge and the crown lightly feathered (placed by comparing
  // ink-density maps of render and source at k75)
  { type: "ruff", pts: [[866, 548], [874, 590], [889, 628], [912, 657], [944, 677], [990, 690], [1040, 694], [1095, 690], [1140, 676]], step: 4.5, len: [10, 24], w: [0.6, 1.3], v: 0.3, alpha: 0.85, lean: 0.75, side: -1, seed: 451, skip: 0.1 },
  { type: "ruff", pts: [[880, 560], [890, 600], [905, 632], [930, 655], [965, 668], [1010, 676]], step: 7, len: [8, 18], w: [0.5, 1.1], v: 0.4, alpha: 0.75, lean: 0.9, side: -1, seed: 452, skip: 0.2 },
  { type: "tufts", clipPoly: J0.pts, box: [860, 330, 1260, 700], flow: [0.8, 0.6], centres: [[1110, 545, 190, "t", 0.9]], seed: 453,
    blobs: [[1000, 655, 150, 35, 0.75], [905, 600, 35, 70, 0.6], [1165, 600, 45, 30, 0.45], [1150, 505, 60, 25, 0.35], [1000, 500, 50, 60, 0.3], [1120, 380, 90, 35, 0.3]], base: 0.03,
    cell: 17, n: [2, 5], len: [12, 26], gap: 3.2, bend: 0.14, w: [0.6, 1.1], v: [0.52, 0.36], alpha: 0.8 },
  { type: "cup3", ...HP.cupR },
  // ending fix: the source's bandage — two equal plasters crossing in an X (read off a 4x grid of k75)
  { type: "bandX", a: [1075, 412, 104, 28, -31], b: [1069, 415, 106, 28, 38], dots: 22, seed: 82 },
  // the face: grey feathering above the brows, the eyes, the heavy brow-lids, the beak
  { type: "fine", clipPoly: J0.pts, dir: [0.5, 0.87], box: [1030, 470, 1160, 530], spacing: 6, len: [8, 18], w: [0.5, 1], v: 0.45, alpha: 0.6, seed: 22, tone: 0.8 },
  { type: "eye2", ...EYE_L }, { type: "eye2", ...EYE_R },
  { type: "stroke", pts: BROW_L, ws: [2, 12, 17, 13, 8, 2] },
  { type: "stroke", pts: LID_L, ws: [0.8, 2.6, 2.6, 1.6] },
  { type: "stroke", pts: BROW_R, ws: [2, 7, 11, 12, 11, 7, 2] },
  { type: "hbeak", ...BEAK },
  { type: "band", pts: HP.band, w: 16, v: 0.12, ridge: 0.5 },
  { type: "yoke", pts: HP.yoke, v: 0.42 },
  { type: "cup3", ...HP.cupL },
  // the upper pair and the hand's fingers round its loops
  { type: "scissors", ...SC_U, w: 38, bw: 62, ring: 12 },
  // the hand (ending fix, re-read off a 2.5x grid of k75): the wing's own silhouette (J1) ends in the hand — the wing tip
  // mass with a finger curling down through the left loop and the hand's heel into the right loop — so it is
  // repainted over the pair, confined to the hand, with fine strokes along the finger; one feather tip hangs below
  { type: "sil", ...J1, base: 0.95, rim: 0.82, depth: 14, blur: 10, ink: 2.4, clipRect: [1280, 336, 1450, 470] },
  { type: "tufts", clipPoly: J1.pts, clipRect: [1280, 336, 1450, 470], box: [1280, 330, 1450, 470], flow: [0.25, 1], seed: 441,
    blobs: [[1330, 420, 30, 40, 0.8], [1400, 380, 40, 30, 0.7], [1370, 350, 60, 25, 0.5]], base: 0.1, cell: 12, n: [3, 5], len: [16, 34], gap: 3.2, bend: 0.12, w: [0.6, 1.1], v: [0.5, 0.36], alpha: 0.8 },
  // the heel of the hand below the right loop: two feather-fingers curling down over the shanks (5x grid of k75)
  { type: "poly", pts: [[1350, 398], [1372, 401], [1392, 390], [1400, 362], [1418, 356], [1433, 370], [1435, 400], [1426, 424], [1424, 450], [1423, 480], [1415, 493], [1395, 491], [1375, 482], [1360, 470], [1351, 440]], v: 0.93, ink: 0, smooth: true,
    hatch: { mode: "dir", dir: [0.4, 0.92], box: [1345, 395, 1430, 495], dens: 14, len: [14, 30], w: [0.6, 1.0], v: 0.45, alpha: 0.75, seed: 442 } },
  { type: "stroke", pts: [[1355, 398], [1351, 420], [1352, 440], [1358, 460], [1368, 475], [1382, 483]], ws: [1, 3.2, 3.6, 3.4, 2.6, 1] },
  { type: "stroke", pts: [[1372, 404], [1385, 420], [1396, 440], [1400, 462], [1405, 482]], ws: [1, 3, 3.4, 3, 1.4] },
  { type: "stroke", pts: [[1382, 483], [1398, 490], [1416, 492]], ws: [1, 2.6, 1] },
  { type: "quills", list: [{ r: [1372, 470], t: [1348, 545], w: 22, bend: -0.06 }], ink: 2.2, lines: 4, lineV: 0.4, lineLen: [0.4, 0.85], tipPow: 0.6, widest: 0.35, rootK: 0.9, seed: 43 },
  { type: "ringArc", c: [1336, 442], rx: 35, ry: 38, rot: 0.17, a0: 0.35, a1: 2.7, w: 7, v: 0.9 },
  // the right loop filled by the hand: only its inner shadow shows, a dark crescent down its left side
  { type: "ringArc", c: [1423, 389], rx: 15, ry: 33, rot: 0.2, a0: 1.0, a1: 4.65, w: 7 },
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
