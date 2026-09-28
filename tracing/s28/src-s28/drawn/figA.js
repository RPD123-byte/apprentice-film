// s28 orbit key A (fix 2): the designer as seen at 129.32, drawn in 129.32-frame px (shot.js carries it on with the
// measured key-A track). On screen 129.32-129.80. Coarse outlines (<= 40 vertices) were measured on 129.32 (fit.py:
// colour class inside a hand-placed region, outer contour, simplified) and cleaned by hand; the face, every lock, finger,
// fold and feature is placed by hand from 25-50 px grids of that frame. The head lies on his right forearm, tilted about
// 45 deg (crown to the upper right), so the brows sit up-right of the closed eyes and the mouth runs diagonally.
import { canvas, shape, ink, line, hatch, lin, rad, trace, clipTo, bb } from "./kit.js";
import { massStrands, lock, lockShine, HAIR_INK } from "./hairkit.js";
import { owlPeek } from "./figK.js";
import { rng } from "../../../lib/rng.js";

const INK = "#241512";
const HOOD = "#a2a690", BEANIE = "#a9ac96", SKIN = "#e8bca2";

const HOOD_A = [[120, 822], [130, 780], [165, 720], [200, 660], [225, 590], [260, 510], [290, 455], [320, 382], [350, 336],
  [392, 295], [434, 264], [528, 257], [620, 262], [676, 269], [701, 288], [733, 278], [712, 312], [688, 343], [689, 381],
  [669, 391], [650, 450], [643, 511], [630, 530], [644, 551], [630, 610], [618, 654], [604, 664], [617, 676], [602, 849],
  [552, 845], [513, 866], [494, 856], [420, 868], [342, 876], [300, 862], [265, 860], [250, 806]];
const BACK_SH = [[120, 822], [130, 780], [165, 720], [200, 660], [225, 590], [260, 510], [290, 455], [270, 560], [258, 660],
  [252, 740], [250, 806]];
const R_SLEEVE = [[1180, 548], [1150, 570], [1120, 600], [1106, 630], [1135, 664], [1160, 730], [1200, 742], [1240, 735],
  [1246, 700], [1236, 640], [1226, 592], [1210, 560]];
const TEE = [[610, 540], [720, 545], [860, 600], [870, 690], [600, 700], [604, 610]];
const FOLDS = [
  [[330, 400], [370, 470], [395, 540]], [[420, 330], [455, 400], [475, 470], [490, 520]], [[500, 300], [540, 360], [560, 430]],
  [[560, 290], [600, 350], [615, 420], [610, 470]], [[300, 560], [360, 575], [420, 600], [470, 640]],
  [[290, 650], [350, 640], [420, 650], [480, 680]], [[300, 740], [370, 720], [440, 720], [500, 740]],
  [[390, 780], [450, 770], [510, 790]], [[430, 560], [480, 590], [520, 640], [540, 700]], [[600, 470], [620, 520], [612, 580]],
  [[270, 560], [258, 660], [252, 740]],
];
const CUFF = [[510, 640], [560, 630], [612, 645], [604, 700], [600, 850], [540, 848], [500, 800]];

// the face: skin under the hair (the hair draws its edge), measured contacts: jaw under the cup, chin, the cheek on the arm
const FACE = [[700, 470], [730, 430], [790, 368], [840, 330], [900, 314], [962, 314], [1022, 330], [1080, 368], [1130, 420],
  [1172, 482], [1192, 540], [1194, 600], [1120, 612], [1080, 598], [1050, 598], [1000, 612], [950, 622], [900, 628], [862, 626],
  [822, 608], [780, 612], [740, 602], [700, 566]];
const JAW = [[700, 566], [722, 588], [742, 601], [780, 612], [816, 610]];
const FACE_LOW = [[816, 608], [840, 618], [862, 626], [900, 628], [950, 620], [1000, 610], [1050, 597], [1080, 596]];
const EYE_L = [[920, 364], [934, 378], [947, 395], [962, 412], [978, 430]];
const EYE_R = [[1032, 492], [1046, 503], [1060, 514], [1074, 525], [1088, 535]];
const BROW_L = [[992, 356], [1004, 368], [1016, 382], [1027, 396]];
const BROW_R = [[1062, 458], [1076, 466], [1090, 474], [1102, 484]];
const NOSE = [[922, 515], [930, 532], [940, 542], [958, 546], [972, 536]];
const MOUTH = [[866, 526], [880, 545], [898, 562], [918, 578], [942, 591]];

// hair. Left: the mass over the hood, the temple and the forehead (129.32 dark hair with strands bridged, 39 vertices);
// the root band under the rim; locks hanging from the rim (fringe over the forehead, long locks down the right side
// of the face with skin between them, tips over the sleeve); strands along flow guides.
const HAIR_L = [[1036, 301], [994, 278], [859, 245], [842, 264], [810, 263], [813, 274], [792, 278], [775, 270], [778, 289],
  [730, 319], [710, 316], [691, 340], [690, 354], [709, 353], [702, 367], [691, 369], [702, 377], [699, 416], [705, 418],
  [715, 367], [733, 350], [737, 364], [725, 371], [722, 389], [764, 381], [737, 413], [782, 420], [791, 449], [802, 418],
  [809, 413], [819, 419], [850, 378], [851, 405], [880, 371], [881, 393], [919, 345], [951, 341], [962, 330], [1027, 330]];
const HAIR_ROOT = [[850, 250], [930, 256], [1031, 295], [1122, 378], [1161, 435], [1192, 490], [1215, 505], [1200, 520],
  [1170, 488], [1140, 450], [1100, 408], [1060, 372], [1010, 336], [950, 322], [900, 316], [862, 300]];
const LOCKS = [
  // fringe over the forehead (root at the rim; the head is tilted, so the tips fall down-left), thin wisps between
  [[[872, 258], [840, 305], [806, 350], [790, 372]], 12], [[[900, 262], [872, 320], [846, 375], [838, 402]], 13],
  [[[930, 268], [905, 330], [886, 390], [880, 416]], 12], [[[960, 276], [945, 330], [925, 376]], 10],
  [[[990, 286], [975, 330], [958, 362]], 8], [[[1020, 300], [1005, 335], [990, 362]], 7],
  [[[850, 300], [820, 340], [800, 362]], 4], [[[915, 300], [898, 345], [892, 374]], 4], [[[945, 300], [932, 340], [930, 370]], 3],
  [[[790, 265], [760, 262], [728, 270]], 3], [[[760, 285], [735, 292], [712, 306]], 3.5],
  // long locks down the right side of the face
  [[[1050, 330], [1036, 380], [1022, 432]], 12], [[[1072, 342], [1054, 396], [1036, 447]], 10], [[[1096, 358], [1084, 402], [1068, 440]], 9],
  [[[1112, 372], [1092, 420], [1060, 462]], 9], [[[1128, 388], [1116, 432], [1098, 464]], 8], [[[1142, 404], [1126, 454], [1104, 506]], 12],
  [[[1160, 424], [1140, 482], [1114, 532]], 11], [[[1176, 444], [1166, 502], [1142, 560], [1136, 602]], 13],
  [[[1196, 466], [1186, 522], [1166, 570], [1174, 608]], 12], [[[1214, 486], [1206, 534], [1196, 592]], 10],
  // a loose lock crossing the right cheek, and two over the hood
  [[[1040, 440], [1022, 470], [1002, 504]], 6], [[[770, 272], [740, 276], [706, 290]], 4], [[[748, 292], [724, 306], [700, 330]], 5],
];
const GUIDES_L = [[[1020, 300], [950, 280], [890, 280], [830, 290], [770, 300], [720, 330], [700, 380]], [[1000, 320], [940, 310], [880, 320], [830, 350], [800, 390], [790, 430]],
  [[860, 270], [800, 310], [760, 350], [740, 400]]];
const GUIDES_R = [[[880, 262], [980, 290], [1080, 350], [1170, 440], [1205, 505]]];

const PHONES = { c: [708, 490], rx: 62, ry: 75, face: [683, 500, 33, 50], band: [[722, 418], [736, 370], [756, 320]] };

const BEANIE_A = [[856, 236], [859, 252], [930, 256], [1031, 295], [1122, 378], [1161, 435], [1192, 490], [1215, 505], [1240, 498],
  [1258, 470], [1270, 420], [1283, 360], [1288, 300], [1280, 262], [1256, 225], [1215, 172], [1165, 138], [1110, 122], [1040, 120],
  [990, 128], [955, 150], [915, 180], [890, 210]];
const RIM = [[856, 248], [930, 256], [1031, 295], [1122, 378], [1161, 435], [1192, 490], [1215, 505]];
const FOLDLINE = [[893, 196], [950, 184], [1010, 180], [1100, 210], [1175, 260], [1215, 300], [1240, 330], [1262, 372], [1275, 410]];

// forearms: the right one under his face, running left to the draped hand; the left one below it, on the laptop
const ARM_UP = [[630, 680], [700, 665], [800, 655], [850, 640], [950, 615], [1050, 605], [1100, 610], [1125, 626], [1137, 670],
  [1131, 724], [1110, 750], [1050, 752], [950, 746], [900, 737], [860, 731], [810, 741], [750, 751], [700, 771], [668, 804],
  [648, 812], [632, 770], [628, 720]];
const ARM_LOW = [[668, 804], [700, 771], [750, 751], [810, 741], [860, 731], [900, 737], [950, 746], [1050, 752], [1100, 756],
  [1090, 772], [1076, 783], [884, 794], [850, 792], [787, 822], [705, 849], [629, 849], [640, 815]];
const HAND_FINGER = { up: [[725, 690], [690, 702], [662, 728], [648, 765], [648, 798], [656, 810]],
  lo: [[656, 810], [668, 806], [676, 780], [690, 752], [712, 734], [740, 724]], nail: [[648, 790], [662, 788], [666, 805], [652, 808]] };

function hoodie(g) {
  shape(g, HOOD_A, HOOD);
  g.save(); clipTo(g, HOOD_A);
  const [x0, y0, x1, y1] = bb(HOOD_A);
  g.fillStyle = lin(g, 300, 260, 700, 800, [[0, "rgba(255,252,235,0.1)"], [0.45, "rgba(0,0,0,0)"], [1, "rgba(40,46,36,0.3)"]]);
  g.fillRect(x0 - 20, y0 - 20, x1 - x0 + 40, y1 - y0 + 40);
  shape(g, BACK_SH, "rgba(50,60,52,0.22)");                        // the shaded back of the hoodie (left, over the chair)
  shape(g, CUFF, "rgba(80,88,70,0.16)");
  g.filter = "blur(6px)";
  for (const f of FOLDS) ink(g, f.map(([x, y]) => [x + 9, y + 2]), 14, "rgba(70,78,62,0.28)", { taper: 0.9 });
  g.filter = "none";
  const rf = rng(241);
  for (const f of FOLDS) for (let k = 0; k < 3; k++) ink(g, f.map(([x, y]) => [x + 5 + k * 4 + rf() * 2, y + rf() * 3]), 0.9, "rgba(40,48,35,0.3)", { taper: 0.95 });
  hatch(g, null, { angle: 1.1, sp: 5, w: 0.9, color: "rgba(40,48,35,0.22)", seed: 243, len: 26, density: 0.7, bounds: [560, 400, 700, 640] });
  hatch(g, null, { angle: 1.0, sp: 5, w: 0.9, color: "rgba(40,48,35,0.22)", seed: 244, len: 22, density: 0.6, bounds: [130, 560, 300, 830] });
  g.restore();
  for (const f of FOLDS) ink(g, f, 1.8, "rgba(36,21,18,0.82)", { taper: 0.8 });
  ink(g, [[510, 640], [560, 630], [612, 645]], 2.2, INK, { taper: 0.3 });
  ink(g, HOOD_A, 2.8, INK, { closed: true, taper: 0 });
}
function sleeveR(g) {
  shape(g, R_SLEEVE, HOOD);
  g.save(); clipTo(g, R_SLEEVE);
  g.fillStyle = lin(g, 1110, 560, 1240, 740, [[0, "rgba(255,252,235,0.08)"], [1, "rgba(40,46,36,0.3)"]]); g.fillRect(1100, 540, 150, 210);
  g.restore();
  for (const f of [[[1150, 600], [1175, 650], [1185, 710]], [[1200, 590], [1215, 640], [1220, 700]]]) ink(g, f, 1.5, "rgba(36,21,18,0.75)", { taper: 0.8 });
  ink(g, R_SLEEVE, 2.4, INK, { closed: true, taper: 0 });
}
function arms(g) {
  // left forearm (below), then the right forearm and the draped hand over it
  shape(g, ARM_LOW, SKIN);
  g.save(); clipTo(g, ARM_LOW);
  g.fillStyle = lin(g, 0, 735, 0, 850, [[0, "rgba(200,110,95,0.35)"], [0.4, "rgba(255,244,228,0.15)"], [1, "rgba(200,110,95,0.3)"]]); g.fillRect(620, 720, 500, 140);
  g.restore();
  ink(g, [[705, 849], [787, 822], [850, 792], [884, 794], [1076, 783], [1100, 758]], 2.4, INK, { taper: 0.3 });
  shape(g, ARM_UP, SKIN);
  g.save(); clipTo(g, ARM_UP);
  g.fillStyle = lin(g, 0, 610, 0, 755, [[0, "rgba(255,246,232,0.35)"], [0.55, "rgba(255,246,232,0.05)"], [1, "rgba(200,110,95,0.4)"]]); g.fillRect(620, 600, 530, 160);
  g.fillStyle = lin(g, 1060, 0, 1137, 0, [[0, "rgba(200,110,95,0)"], [1, "rgba(200,110,95,0.35)"]]); g.fillRect(1050, 600, 100, 160);
  const r = rng(251);
  for (let i = 0; i < 8; i++) { const y = 726 + i * 3 + r() * 2, x = 880 + r() * 120, L = 60 + r() * 120; ink(g, [[x, y], [x + L * 0.5, y + 1], [x + L, y + 2]], 0.9, "rgba(140,60,50,0.35)", { taper: 0.9 }); }
  g.restore();
  // the draped finger (index) with its nail; finger splits, knuckles and tendons on the back of the hand
  const F = HAND_FINGER, P = [...F.up, ...F.lo.slice(1)];
  shape(g, P, SKIN);
  shape(g, F.nail, "#f0d2c2");
  ink(g, [...F.nail, F.nail[0]], 1.1, "rgba(120,55,50,0.75)", { taper: 0 });
  ink(g, F.up, (u) => 1.4 + 1.2 * u, INK, { taper: 0.2 });
  ink(g, F.lo, (u) => 2.4 - 0.8 * u, INK, { taper: 0.2 });
  for (const s of [[[685, 682], [660, 690], [635, 700]], [[725, 690], [690, 700], [660, 712], [632, 725]], [[715, 720], [675, 740], [636, 760]]])
    ink(g, s, (u) => 1 + 1.4 * u, INK, { taper: 0.3 });
  for (const c of [[[640, 700], [646, 708]], [[650, 722], [656, 730]], [[664, 744], [670, 752]], [[672, 776], [678, 784]]]) ink(g, c, 1.2, "rgba(90,40,36,0.7)", { taper: 0.5 });
  for (const c of [[[700, 680], [740, 672], [780, 666]], [[710, 700], [760, 690], [800, 684]]]) ink(g, c, 1, "rgba(160,85,75,0.45)", { taper: 0.9 });
  ink(g, [[668, 806], [700, 771], [750, 751], [810, 741], [860, 731], [900, 737]], 2, INK, { taper: 0.3 });
  ink(g, [[630, 680], [700, 665], [800, 655], [850, 642]], 2.2, INK, { taper: 0.3 });
  ink(g, [[1050, 752], [1110, 750], [1131, 724], [1137, 670], [1125, 626]], 2.2, INK, { taper: 0.3 });
}
function face(g) {
  shape(g, FACE, SKIN);
  g.save(); clipTo(g, FACE);
  g.fillStyle = lin(g, 0, 310, 0, 630, [[0, "rgba(190,110,95,0.25)"], [0.3, "rgba(255,244,228,0.1)"], [1, "rgba(205,120,105,0.25)"]]); g.fillRect(690, 300, 520, 340);
  // shade on the cheek beside the cup, under the fringe and on the side of the nose; blush on both cheeks
  g.fillStyle = lin(g, 700, 0, 840, 0, [[0, "rgba(160,70,62,0.62)"], [0.55, "rgba(170,80,70,0.38)"], [1, "rgba(170,85,75,0)"]]); g.fillRect(690, 420, 160, 180);
  g.fillStyle = lin(g, 0, 330, 0, 420, [[0, "rgba(170,85,75,0.35)"], [1, "rgba(170,85,75,0)"]]); g.fillRect(850, 320, 200, 100);
  g.fillStyle = rad(g, 900, 470, 4, 40, [[0, "rgba(230,125,118,0.25)"], [1, "rgba(230,125,118,0)"]]); g.fillRect(850, 420, 100, 100);
  g.fillStyle = rad(g, 1030, 555, 4, 42, [[0, "rgba(230,125,118,0.25)"], [1, "rgba(230,125,118,0)"]]); g.fillRect(980, 500, 100, 100);
  g.fillStyle = rad(g, 955, 520, 2, 16, [[0, "rgba(255,246,236,0.5)"], [1, "rgba(255,246,236,0)"]]); g.fillRect(935, 500, 40, 40);
  const r = rng(261);
  const blush = (x0, y0, n, dx, dy, len, ang) => { for (let i = 0; i < n; i++) { const x = x0 + i * dx, y = y0 + i * dy, L = len * (0.7 + 0.5 * r()); line(g, [[x, y], [x + Math.cos(ang) * L, y + Math.sin(ang) * L]], 1 + 0.4 * r(), "rgba(150,60,55,0.42)"); } };
  blush(880, 445, 7, 5, 1.5, 18, 1.7); blush(1010, 540, 7, 5, 1.5, 16, 1.8);
  for (let i = 0; i < 9; i++) { const y = 480 + i * 12 + r() * 4, x = 716 + r() * 8; line(g, [[x, y], [x + 18 + r() * 6, y + 12 + r() * 5]], 1, "rgba(110,45,40,0.5)"); }
  for (let i = 0; i < 6; i++) { const x = 936 + i * 3, y = 450 + i * 12; line(g, [[x, y], [x + 10, y + 8]], 1, "rgba(150,70,60,0.35)"); }
  // lower-lip shadow
  g.fillStyle = rad(g, 888, 575, 2, 18, [[0, "rgba(200,95,95,0.35)"], [1, "rgba(200,95,95,0)"]]); g.fillRect(860, 550, 60, 50);
  g.restore();
  ink(g, JAW, 2.4, INK, { taper: 0.3 });
  ink(g, FACE_LOW, 2.2, INK, { taper: 0.3 });
  // closed eyes (heavy lash lines with short lashes), brows up-right of them, nose, a short closed smile
  for (const E of [EYE_L, EYE_R]) {
    ink(g, E, (u) => 1.4 + 4 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.6), "#150b0b");
    for (let i = 1; i < E.length; i++) { const [x, y] = E[i]; line(g, [[x, y], [x - 6, y + 5]], 1, "rgba(23,12,12,0.6)"); }
    ink(g, E.map(([x, y]) => [x + 9, y - 7]), 1, "rgba(120,55,50,0.45)", { taper: 0.9 });
  }
  ink(g, BROW_L, (u) => 5.5 * (0.4 + 0.8 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1))), "#1f1212");
  ink(g, BROW_R, (u) => 4.5 * (0.4 + 0.8 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1))), "#1f1212");
  ink(g, NOSE, (u) => 2.4 - 1.1 * u, "#5e2a26");
  ink(g, MOUTH, (u) => (u < 0.06 ? 2.8 : 2.0 - 0.6 * u), "#3e1a18", { taper: 0.3 });
}
function hair(g) {
  shape(g, HAIR_L, HAIR_INK);
  shape(g, HAIR_ROOT, HAIR_INK);
  for (const L of LOCKS) lock(g, L[0], L[1], HAIR_INK);
  massStrands(g, HAIR_L, GUIDES_L, 271, { per: 16, spread: 22 });
  massStrands(g, HAIR_ROOT, GUIDES_R, 272, { per: 14, spread: 10 });
  let s = 280;
  for (const L of LOCKS) if (L[1] >= 9) lockShine(g, L[0], L[1], s++, { n: L[1] >= 13 ? 3 : 2 });
}
function headphones(g) {
  const P = PHONES;
  ink(g, P.band, 10, "#1c1a19", { taper: 0.1 });
  g.save(); g.translate(P.c[0], P.c[1]); g.rotate(0.15);
  g.beginPath(); g.ellipse(0, 0, P.rx, P.ry, 0, 0, 6.3); g.fillStyle = "#2c2a28"; g.fill(); g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke();
  for (let a = -1.5; a < 1.55; a += 0.07) { const c = Math.cos(a), s = Math.sin(a); line(g, [[c * P.rx * 0.55, s * P.ry * 0.78], [c * P.rx * 0.95, s * P.ry * 0.96]], 1.3, "rgba(150,145,135,0.5)"); }
  g.restore();
  const [fx, fy, frx, fry] = P.face;
  g.save(); g.translate(fx, fy); g.rotate(0.15);
  g.beginPath(); g.ellipse(0, 0, frx, fry, 0, 0, 6.3); g.fillStyle = "#1a1817"; g.fill(); g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.ellipse(-2, 0, frx * 0.65, fry * 0.72, 0, 0, 6.3); g.fillStyle = "#383532"; g.fill();
  g.beginPath(); g.ellipse(-3, 0, frx * 0.38, fry * 0.48, 0, 0, 6.3); g.fillStyle = "#1c1a19"; g.fill();
  g.beginPath(); g.ellipse(-8, -8, frx * 0.3, fry * 0.45, 0, 0, 6.3); g.strokeStyle = "rgba(170,165,150,0.4)"; g.lineWidth = 2; g.stroke();
  g.restore();
}
const at = (P, u) => { const n = P.length - 1, i = Math.min(n - 1, Math.floor(u * n)), f = u * n - i; return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f]; };
function beanie(g) {
  const B = BEANIE_A, [bx0, by0, bx1, by1] = bb(B);
  shape(g, B, BEANIE);
  g.save(); clipTo(g, B);
  g.fillStyle = lin(g, bx0, by0, bx0 + (bx1 - bx0) * 0.6, by1, [[0, "rgba(60,65,55,0.3)"], [1, "rgba(60,65,55,0)"]]); g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
  hatch(g, null, { angle: 0.35, sp: 5, w: 1, color: "rgba(40,45,35,0.42)", seed: 291, len: 24, density: 0.85, bounds: [890, 120, 1130, 230] });
  hatch(g, null, { angle: 2.0, sp: 6, w: 1, color: "rgba(40,45,35,0.32)", seed: 292, len: 20, density: 0.7, bounds: [900, 140, 1120, 240] });
  g.beginPath(); trace(g, [...RIM, ...FOLDLINE.slice().reverse()], true, true); g.fillStyle = "rgba(70,78,62,0.14)"; g.fill();
  const r = rng(293);
  for (let i = 0; i <= 46; i++) {
    const u = i / 46, a = at(RIM, u), b = at(FOLDLINE, u);
    line(g, [[a[0] + (b[0] - a[0]) * 0.08, a[1] + (b[1] - a[1]) * 0.08], [b[0] + (r() - 0.5) * 3, b[1]]], 0.9 + 0.5 * r(), "rgba(40,45,35,0.42)");
  }
  hatch(g, null, { angle: 1.9, sp: 3.5, w: 1.1, color: "rgba(40,45,35,0.45)", seed: 294, len: 36, density: 0.9, bounds: [1220, 300, 1290, 510] });
  g.restore();
  ink(g, FOLDLINE, 2.2, "rgba(36,21,18,0.85)", { taper: 0.4 });
  ink(g, RIM, 3.4, INK, { taper: 0.2 });
  ink(g, B, 2.6, INK, { closed: true });
}

export function paintKeyA() {
  const c = canvas(2206, 946), g = c.getContext("2d");
  owlPeek(g, [1268, 585]);
  shape(g, TEE, "#120f10", { smooth: false });
  hoodie(g);
  sleeveR(g);
  arms(g);
  face(g);
  hair(g);
  headphones(g);
  beanie(g);
  return c;
}
