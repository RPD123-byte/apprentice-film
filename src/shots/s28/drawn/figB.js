// s28 orbit key B (fix 2): the designer as seen at 129.84, drawn in 129.84-frame px (shot.js carries it on with the
// measured key-B track through trackmap.js keyBMap). It is on screen 129.84-130.12, while the lid sweeps left across
// him, so it is drawn as the first of those frames shows him: the jaw, chin and mouth left of the lid, the black
// T-shirt under them, the big headphone cup, the collar flap, and his right hand draped over the sleeve cuff with four
// fingers hanging down-left. Coarse outlines (<= 40 vertices) were measured on 129.84 (fit.py: colour class inside a
// hand-placed region, outer contour, simplified) and cleaned by hand; every fold, lock, finger and feature is placed by
// hand from 25-50 px grids of that frame.
import { canvas, shape, ink, line, hatch, lin, rad, trace, clipTo, bb } from "./kit.js";
import { drawHair, massStrands, lock, HAIR_INK } from "./hairkit.js";
import { rng } from "../../../lib/rng.js";

const INK = "#241512";
const HOOD = "#a2a690", BEANIE = "#a9ac96", SKIN = "#e7bba2", SKIN_D = "#d99a86";

const HOOD_B = [[256, 818], [249, 745], [247, 680], [255, 610], [288, 540], [328, 470], [368, 420], [412, 380], [458, 334],
  [500, 296], [546, 258], [600, 241], [662, 243], [730, 255], [800, 268], [852, 286], [870, 300], [800, 352], [784, 384],
  [760, 450], [750, 498], [744, 530], [764, 520], [778, 540], [760, 598], [718, 668], [656, 669], [630, 668], [612, 720],
  [596, 780], [586, 843], [546, 843], [496, 848], [442, 832], [360, 838], [300, 840], [272, 832]];
const COLLAR = [[684, 491], [698, 463], [728, 441], [760, 424], [770, 468], [762, 501]];
const TEE = [[700, 470], [790, 440], [970, 420], [975, 760], [690, 760], [690, 600]];
const FOLDS = [
  [[450, 365], [490, 430], [510, 480]], [[535, 395], [570, 455], [600, 500], [630, 545]], [[580, 370], [610, 430], [640, 480]],
  [[660, 380], [680, 430], [670, 470]], [[705, 395], [700, 445]], [[445, 500], [510, 515], [550, 540], [590, 600]],
  [[330, 570], [390, 580], [470, 600]], [[325, 635], [380, 620], [440, 610], [510, 620]], [[340, 690], [405, 665], [465, 650]],
  [[380, 735], [445, 700], [490, 685]], [[610, 280], [630, 295], [730, 320], [805, 318]], [[300, 480], [340, 520], [352, 560]],
];
const CUFF_TOP = [[450, 645], [510, 640], [550, 645], [610, 655], [645, 665]];
const CUFF_FOLDS = [[[490, 700], [480, 770], [490, 830]], [[550, 670], [540, 745], [530, 820]], [[430, 660], [420, 740], [415, 815]]];

const FACE = [[850, 340], [900, 318], [960, 314], [1040, 320], [1120, 334], [1200, 360], [1262, 396], [1272, 445], [962, 448],
  [950, 480], [940, 525], [926, 575], [912, 604], [886, 613], [850, 600], [822, 577], [800, 552], [806, 500], [830, 430]];
const JAW = [[802, 552], [825, 578], [848, 596], [885, 611], [913, 604]];
const PHONES = { c: [813, 467], rx: 61, ry: 82, face: [788, 465, 36, 60], band: [[822, 392], [836, 340], [866, 292]] };

// hair: a coarse mass (129.84 dark hair with strands bridged, 37 vertices) + the right-side hair under the cuff, locks
const HAIR_M = [[1154, 313], [1072, 264], [999, 242], [964, 240], [947, 268], [866, 278], [846, 312], [829, 312], [805, 343],
  [800, 353], [793, 364], [806, 370], [790, 402], [812, 432], [805, 482], [818, 547], [839, 538], [862, 500], [872, 425],
  [885, 426], [892, 453], [902, 428], [919, 428], [947, 385], [953, 405], [975, 380], [981, 395], [1019, 345], [1029, 353],
  [1072, 347], [1095, 360], [1112, 342]];
const HAIR_R = [[1128, 316], [1180, 318], [1230, 350], [1262, 392], [1270, 414], [1160, 414], [1172, 382], [1150, 346]];
const LOCKS = [
  [[[905, 300], [890, 350], [880, 405], [884, 450]], 13], [[[935, 300], [930, 345], [948, 388]], 10],
  [[[960, 300], [968, 340], [976, 382]], 8], [[[1000, 300], [1010, 330], [1020, 348]], 8], [[[1040, 310], [1060, 330], [1070, 348]], 7],
  [[[1080, 318], [1095, 340], [1106, 362]], 7], [[[1100, 330], [1116, 368], [1134, 398]], 7], [[[1150, 330], [1160, 372], [1168, 410]], 10],
  [[[1190, 340], [1200, 378], [1208, 412]], 11], [[[1225, 360], [1236, 390], [1244, 414]], 9],
  [[[860, 330], [838, 400], [826, 470], [826, 540]], 12], [[[880, 360], [900, 420], [906, 480]], 8],
];
const PARTS = [{ pts: [[858, 350], [866, 372], [872, 392]], w: 8 }, { pts: [[935, 325], [942, 340], [950, 352]], w: 6 }];
const GUIDES = [[[1140, 305], [1060, 272], [980, 262], [900, 285], [840, 330]], [[1120, 320], [1040, 300], [960, 300], [880, 320]],
  [[860, 330], [838, 400], [826, 480]]];

const BEANIE_B = [[962, 240], [968, 253], [1019, 251], [1090, 272], [1150, 300], [1205, 350], [1255, 405], [1300, 412], [1341, 413],
  [1370, 402], [1380, 370], [1390, 320], [1392, 280], [1382, 245], [1360, 205], [1320, 160], [1270, 128], [1220, 114], [1170, 112],
  [1120, 120], [1075, 140], [1040, 170], [1005, 195], [980, 225]];
const RIM = [[962, 247], [1019, 251], [1090, 272], [1150, 300], [1205, 350], [1255, 405], [1300, 414], [1345, 414]];
const FOLDLINE = [[995, 200], [1060, 186], [1130, 195], [1190, 214], [1230, 240], [1270, 270], [1300, 305], [1330, 345], [1350, 385]];

const HAND = [[632, 672], [700, 680], [760, 686], [830, 684], [893, 676], [898, 730], [888, 786], [840, 791], [786, 797],
  [740, 810], [690, 826], [650, 831], [618, 836], [604, 818], [597, 790], [598, 760], [606, 728], [618, 698]];
const SPLITS = [[[762, 712], [700, 728], [655, 748], [612, 780]], [[765, 748], [705, 765], [665, 785], [612, 815]],
  [[775, 782], [715, 797], [670, 815], [640, 830]]];
const HAND_TOP = [[632, 672], [700, 680], [760, 688], [830, 686], [893, 677]];
const F1_TOP = [[760, 690], [700, 700], [645, 718], [610, 748], [596, 774]];
const HAND_LOW = [[618, 836], [650, 832], [690, 826], [740, 812], [790, 797], [884, 786]];
const NAILS = [[600, 772, 0.9, 6, 8], [603, 802, 0.8, 7, 9], [613, 826, 0.6, 8, 9], [646, 830, 0.3, 7, 6]];

function hoodie(g) {
  shape(g, HOOD_B, HOOD);
  g.save(); clipTo(g, HOOD_B);
  const [x0, y0, x1, y1] = bb(HOOD_B);
  // light from the upper left (the window), shade low right and in the cuff
  g.fillStyle = lin(g, 300, 260, 720, 760, [[0, "rgba(255,252,235,0.10)"], [0.45, "rgba(0,0,0,0)"], [1, "rgba(40,46,36,0.32)"]]);
  g.fillRect(x0 - 20, y0 - 20, x1 - x0 + 40, y1 - y0 + 40);
  shape(g, [...CUFF_TOP, [645, 700], [600, 846], [440, 846], [430, 650]], "rgba(80,88,70,0.16)");
  g.filter = "blur(6px)";
  for (const f of FOLDS) ink(g, f.map(([x, y]) => [x + 9, y + 2]), 14, "rgba(70,78,62,0.28)", { taper: 0.9 });
  g.filter = "none";
  const rf = rng(141);
  for (const f of FOLDS) for (let k = 0; k < 3; k++) ink(g, f.map(([x, y]) => [x + 5 + k * 4 + rf() * 2, y + rf() * 3]), 0.9, "rgba(40,48,35,0.3)", { taper: 0.95 });
  // fine hatching in the shaded parts: under the shoulder, the collar hollow, the elbow and the cuff
  hatch(g, null, { angle: 1.1, sp: 5, w: 0.9, color: "rgba(40,48,35,0.22)", seed: 143, len: 26, density: 0.7, bounds: [620, 480, 760, 660] });
  hatch(g, null, { angle: 1.0, sp: 5, w: 0.9, color: "rgba(40,48,35,0.2)", seed: 144, len: 22, density: 0.6, bounds: [255, 640, 420, 830] });
  g.restore();
  for (const f of FOLDS) ink(g, f, 1.8, "rgba(36,21,18,0.82)", { taper: 0.8 });
  ink(g, CUFF_TOP, 2.2, INK, { taper: 0.3 });
  for (const f of CUFF_FOLDS) ink(g, f, 1.5, "rgba(36,21,18,0.7)", { taper: 0.8 });
  // collar flap (a lighter fold, heavy outline)
  shape(g, COLLAR, "#b3b7a0");
  ink(g, [...COLLAR, COLLAR[0]], 2.2, INK, { taper: 0 });
  ink(g, HOOD_B, 2.8, INK, { closed: true, taper: 0 });
}
function hand(g) {
  shape(g, HAND, SKIN);
  g.save(); clipTo(g, HAND);
  g.fillStyle = lin(g, 0, 672, 0, 836, [[0, "rgba(255,242,230,0.28)"], [0.5, "rgba(220,150,130,0.1)"], [1, "rgba(200,110,95,0.4)"]]);
  g.fillRect(590, 660, 320, 190);
  for (const sp of SPLITS) ink(g, sp.map(([x, y]) => [x, y + 7]), 10, "rgba(200,110,95,0.28)", { taper: 0.6 });
  g.restore();
  for (const sp of SPLITS) ink(g, sp, (u) => 1.1 + 1.6 * u, INK, { taper: 0.2 });
  ink(g, F1_TOP, (u) => 1.3 + 1.2 * u, INK, { taper: 0.2 });
  for (const [x, y, a, rx, ry] of NAILS) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.ellipse(0, 0, rx, ry * 0.7, 0, 0, 6.3); g.fillStyle = "#f0d2c2"; g.fill(); g.lineWidth = 1.1; g.strokeStyle = "rgba(120,55,50,0.75)"; g.stroke();
    g.restore();
  }
  for (const c of [[[648, 722], [654, 730]], [[651, 742], [657, 750]], [[664, 768], [670, 776]], [[630, 803], [636, 811]], [[704, 800], [710, 806]], [[716, 795], [722, 801]]])
    ink(g, c, 1.2, "rgba(90,40,36,0.7)", { taper: 0.5 });
  for (const c of [[[715, 710], [760, 700], [805, 690]], [[745, 730], [780, 721], [815, 712]], [[770, 760], [805, 752], [840, 745]]])
    ink(g, c, 1, "rgba(160,85,75,0.45)", { taper: 0.9 });
  ink(g, HAND_TOP, 2.2, INK, { taper: 0.3 });
  ink(g, HAND_LOW, 2.4, INK, { taper: 0.3 });
  ink(g, [[632, 672], [618, 698], [606, 728], [598, 760]], 1.8, INK, { taper: 0.5 });
}
function face(g) {
  shape(g, FACE, SKIN);
  g.save(); clipTo(g, FACE);
  g.fillStyle = lin(g, 0, 320, 0, 620, [[0, "rgba(190,110,95,0.3)"], [0.3, "rgba(255,244,228,0.08)"], [1, "rgba(200,110,95,0.3)"]]);
  g.fillRect(790, 300, 490, 330);
  // shade on the cheek beside the cup and under the jaw; blush on the cheekbone
  g.fillStyle = lin(g, 860, 0, 930, 0, [[0, "rgba(170,85,75,0.35)"], [1, "rgba(170,85,75,0)"]]); g.fillRect(790, 420, 150, 200);
  g.fillStyle = rad(g, 1080, 392, 3, 34, [[0, "rgba(230,125,118,0.28)"], [1, "rgba(230,125,118,0)"]]); g.fillRect(1030, 350, 110, 80);
  const r = rng(151);
  for (let i = 0; i < 10; i++) { const y = 470 + i * 12 + r() * 4, x = 872 + r() * 8; line(g, [[x, y], [x + 16 + r() * 6, y + 12 + r() * 5]], 1, "rgba(110,45,40,0.5)"); }
  for (let i = 0; i < 6; i++) { const x = 1068 + i * 6 + r() * 2, y = 380 + i * 1.5; line(g, [[x, y], [x + 6, y + 14 + r() * 4]], 1, "rgba(150,60,55,0.4)"); }
  for (let i = 0; i < 7; i++) { const x = 860 + i * 6, y = 596 + i * 1.2; line(g, [[x, y], [x + 8, y + 10]], 1, "rgba(120,45,42,0.45)"); }
  g.restore();
  ink(g, JAW, 2.4, INK, { taper: 0.3 });
  ink(g, [[866, 588], [882, 594], [900, 597]], (u) => (u < 0.1 ? 2.6 : 1.9), "#3e1a18", { taper: 0.4 });
  // the visible eye (the right one is behind the lid): a sleepy half-open slit under a heavy lid, iris and catchlight
  const U = [[1022, 366], [1036, 372], [1050, 381], [1064, 390], [1079, 401]], Lo = [[1030, 377], [1043, 385], [1056, 392], [1068, 398], [1077, 402]];
  g.save(); g.beginPath(); trace(g, [...U, ...Lo.slice().reverse()], true, true); g.clip();
  g.fillStyle = "#e9d6cb"; g.fillRect(1015, 360, 70, 50);
  g.beginPath(); g.ellipse(1054, 388, 8, 6, 0.6, 0, 6.3); g.fillStyle = "#3a2018"; g.fill();
  g.beginPath(); g.arc(1051, 386, 1.4, 0, 6.3); g.fillStyle = "rgba(250,240,230,0.7)"; g.fill();
  g.restore();
  ink(g, U, (u) => 1.4 + 3.6 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.6), "#150b0b");
  ink(g, Lo, 1.1, "rgba(80,35,32,0.75)", { taper: 0.7 });
  for (const c of [[[1034, 356], [1056, 364], [1080, 378], [1098, 394]], [[1070, 400], [1086, 404]]]) ink(g, c, 1, "rgba(120,55,50,0.5)", { taper: 0.9 });
  lock(g, [[1089, 358], [1110, 374], [1133, 396]], 6);
}
function headphones(g) {
  const P = PHONES;
  ink(g, P.band, 10, "#1c1a19", { taper: 0.1 });
  g.save(); g.translate(P.c[0], P.c[1]); g.rotate(0.08);
  g.beginPath(); g.ellipse(0, 0, P.rx, P.ry, 0, 0, 6.3); g.fillStyle = "#2c2a28"; g.fill(); g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke();
  for (let a = -1.5; a < 1.55; a += 0.07) { const c = Math.cos(a), s = Math.sin(a); line(g, [[c * P.rx * 0.55, s * P.ry * 0.78], [c * P.rx * 0.95, s * P.ry * 0.96]], 1.3, "rgba(150,145,135,0.5)"); }
  g.restore();
  const [fx, fy, frx, fry] = P.face;
  g.save(); g.translate(fx, fy); g.rotate(0.08);
  g.beginPath(); g.ellipse(0, 0, frx, fry, 0, 0, 6.3); g.fillStyle = "#1a1817"; g.fill(); g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.ellipse(-2, 0, frx * 0.65, fry * 0.72, 0, 0, 6.3); g.fillStyle = "#383532"; g.fill();
  g.beginPath(); g.ellipse(-3, 0, frx * 0.38, fry * 0.48, 0, 0, 6.3); g.fillStyle = "#1c1a19"; g.fill();
  g.beginPath(); g.ellipse(-8, -8, frx * 0.3, fry * 0.45, 0, 0, 6.3); g.strokeStyle = "rgba(170,165,150,0.4)"; g.lineWidth = 2; g.stroke();
  g.restore();
}
function hair(g) {
  shape(g, HAIR_R, HAIR_INK);
  drawHair(g, { mass: HAIR_M, locks: LOCKS, partings: PARTS, guides: GUIDES, seed: 161, skin: "#e3b9a2" });
  massStrands(g, HAIR_R, [[[1130, 318], [1200, 340], [1250, 395]]], 163, { per: 8, spread: 18 });
}
function beanie(g) {
  const B = BEANIE_B, [bx0, by0, bx1, by1] = bb(B);
  shape(g, B, BEANIE);
  g.save(); clipTo(g, B);
  g.fillStyle = lin(g, bx0, by0, bx0 + (bx1 - bx0) * 0.6, by1, [[0, "rgba(60,65,55,0.3)"], [1, "rgba(60,65,55,0)"]]); g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
  hatch(g, null, { angle: 0.35, sp: 5, w: 1, color: "rgba(40,45,35,0.42)", seed: 171, len: 24, density: 0.85, bounds: [1000, 110, 1260, 230] });
  hatch(g, null, { angle: 2.0, sp: 6, w: 1, color: "rgba(40,45,35,0.32)", seed: 172, len: 20, density: 0.7, bounds: [1020, 140, 1240, 240] });
  // the cuff band between the rim and the fold line: ribs across it
  g.beginPath(); trace(g, [...RIM, ...FOLDLINE.slice().reverse()], true, true); g.fillStyle = "rgba(70,78,62,0.14)"; g.fill();
  const r = rng(173);
  for (let i = 0; i <= 44; i++) {
    const u = i / 44, a = at(RIM, u), b = at(FOLDLINE, u);
    line(g, [[a[0] + (b[0] - a[0]) * 0.08, a[1] + (b[1] - a[1]) * 0.08], [b[0] + (r() - 0.5) * 3, b[1]]], 0.9 + 0.5 * r(), "rgba(40,45,35,0.42)");
  }
  hatch(g, null, { angle: 1.9, sp: 3.5, w: 1.1, color: "rgba(40,45,35,0.45)", seed: 174, len: 36, density: 0.9, bounds: [1300, 250, 1400, 420] });
  g.restore();
  ink(g, FOLDLINE, 2.2, "rgba(36,21,18,0.85)", { taper: 0.4 });
  ink(g, RIM, 3.4, INK, { taper: 0.2 });
  ink(g, B, 2.6, INK, { closed: true });
}
// point at parameter u along a polyline (by vertex index, linear)
function at(P, u) {
  const n = P.length - 1, i = Math.min(n - 1, Math.floor(u * n)), f = u * n - i;
  return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f];
}

export function paintKeyB() {
  const c = canvas(2206, 946), g = c.getContext("2d");
  shape(g, TEE, "#120f10", { smooth: false });
  hoodie(g);
  hand(g);
  face(g);
  hair(g);
  headphones(g);
  beanie(g);
  return c;
}
