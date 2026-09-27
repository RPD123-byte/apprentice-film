// s28 locked view: the designer asleep on his arms (131.36-136.00), drawn in locked-frame px.
// Outlines of the big regions are measured (figLdata.js); fills, shading, folds, hatching and the face are drawn here.
// Parts: body (hoodie, T-shirt, arms, hand), head (hair, face, beanie, headphones), eyes (animated), all cached.
import { canvas, shape, poly, ink, line, hatch, lin, rad, clipTo, trace, sample } from "./kit.js";
import { FIGL } from "./figLdata.js";
import { rng } from "../../../lib/rng.js";
import { drawHair, massStrands, lockTips, fineStrands, HAIR_INK } from "./hairkit.js";

const INK = "#241512", INKS = "rgba(36,21,18,0.55)", INKF = "rgba(36,21,18,0.3)";
const HOOD = "#a6ab93", HOOD_D = "#8c9180", HOOD_DD = "#6f7466", HOOD_SUN = "#c7bc9d";
const SKIN = "#e4b49c", SKIN_D = "#d99a84", SKIN_DD = "#c47f72", BLUSH = "rgba(226,120,120,0.35)";   // fix 2: warmer, ~4 L darker (face a* was 4 low)
const HAIR = "#0d0a0b";

// below (507,506) the outline continues under the lid (hidden when locked, seen in the orbit 130.16-130.6). Fix 2: the
// source's silhouette at 130.48 mapped back through the measured key-L motion (earlier frames get a measured correction
// in shot.js); it ends with the elbow resting on the desk (bunched sleeve, dark bottom contour at ~820 px) instead of
// running on down to the frame's bottom edge.
const HOOD_LEFT = [[507, 506], [505, 540], [503, 575], [500, 603], [492, 625], [484, 648], [474, 670], [464, 692], [456, 715],
  [446, 737], [439, 760], [437, 784], [446, 806], [466, 814], [490, 818], [520, 822], [560, 826]];
const HOOD_POLY = [...FIGL.hoodtop, [1060, 330], [1040, 420], [1010, 520], [992, 590], [978, 650], [970, 720], [930, 780], [880, 800],
  [872, 900], [760, 870], [640, 845], ...HOOD_LEFT.slice().reverse()];

// measured ink lines (snap.py on 131.60), hand-smoothed
const L = {
  seam: [[829, 290], [845, 285], [860, 286], [909, 298], [938, 304], [964, 316], [980, 319]],
  seam2: [[933, 302], [945, 312], [946, 330], [947, 342], [954, 356], [960, 362]],
  collar: [[889, 486], [898, 472], [920, 446], [940, 435], [962, 426], [985, 412], [998, 386], [1022, 370], [1034, 349], [1041, 326], [1048, 316]],
  flapLow: [[888, 482], [893, 491], [907, 496], [933, 500], [956, 508], [979, 515]],
  folds: [
    [[820, 257], [826, 290], [824, 350], [818, 410], [799, 492]],
    [[755, 356], [766, 394], [781, 470], [790, 491]],
    [[739, 381], [750, 430], [760, 490]],
    [[832, 458], [819, 485], [811, 498]],
    [[846, 433], [836, 456], [828, 480], [835, 492]],
    [[666, 362], [674, 380], [671, 392]],
    [[625, 448], [633, 461], [650, 480], [664, 502]],
    [[600, 470], [613, 481], [620, 493], [614, 505]],
  ],
  armTop: [[900, 724], [945, 719], [980, 715], [1040, 707], [1090, 700], [1140, 698], [1195, 700]],
  armBot: [[908, 840], [938, 827], [956, 817], [1030, 818], [1110, 828], [1195, 837], [1265, 843], [1280, 840]],
  sleeveL: [[1243, 694], [1257, 704], [1266, 716], [1278, 743], [1285, 771], [1288, 791], [1288, 820], [1286, 835]],
  sleeveF1: [[1310, 674], [1346, 690], [1365, 696], [1390, 712], [1400, 735], [1398, 765], [1395, 814], [1387, 846]],
  sleeveF2: [[1388, 681], [1405, 675], [1430, 680], [1472, 697], [1508, 724], [1522, 730]],
  sleeveBot: [[1268, 860], [1298, 866], [1344, 865], [1364, 869], [1394, 862], [1448, 861], [1484, 866], [1535, 844], [1560, 837]],
  handTop: [[1114, 663], [1144, 660], [1179, 661], [1198, 652], [1248, 645], [1282, 636], [1330, 634], [1378, 633], [1388, 637]],
  beanFold: [[1217, 197], [1241, 194], [1262, 193], [1306, 201], [1377, 234], [1420, 249], [1470, 291], [1502, 330], [1520, 361], [1534, 398], [1534, 423]],
  jaw: [[1058, 477], [1053, 496], [1047, 505], [1037, 539], [1039, 568], [1045, 580], [1064, 607], [1087, 619], [1095, 646], [1124, 661], [1146, 661]],
};
function hoodie(g) {
  // the elbow's cast shadow on the desk (seen in the orbit only; under the lid when locked)
  shape(g, [[432, 798], [452, 826], [520, 838], [600, 846], [650, 858], [600, 864], [500, 856], [440, 842], [420, 820]], "rgba(90,55,40,0.3)");
  const rs = rng(5);
  for (let i = 0; i < 12; i++) { const x = 440 + i * 16 + rs() * 5, y = 836 + rs() * 8; line(g, [[x, y], [x + 22, y + 10]], 1, "rgba(80,45,32,0.45)"); }
  shape(g, HOOD_POLY, HOOD);
  g.save(); clipTo(g, HOOD_POLY);
  g.fillStyle = lin(g, 640, 280, 880, 560, [[0, "rgba(255,255,240,0.10)"], [0.5, "rgba(0,0,0,0)"], [1, "rgba(40,45,35,0.30)"]]);
  g.fillRect(360, 160, 780, 800);                      // fix 2: the whole hood (it stopped at x 480, a hard edge in the orbit)
  // shaded underside of the shoulder (left, above the lid) and the collar hollow
  shape(g, [[520, 506], [560, 470], [610, 440], [660, 430], [720, 470], [740, 506]], "rgba(80,88,72,0.22)");
  shape(g, [[960, 330], [1050, 322], [1040, 420], [1000, 520], [965, 540]], "rgba(60,66,55,0.18)");
  // shade strokes that follow the cloth (only in the shaded parts: under the shoulder, in the collar hollow)
  const rh = rng(3);
  for (const [x0, y0, x1, y1, n] of [[560, 440, 640, 500, 7], [640, 430, 720, 495, 6], [900, 360, 950, 500, 7], [960, 350, 1030, 480, 6]]) {
    for (let i = 0; i < n; i++) {
      const u = i / Math.max(1, n - 1), x = x0 + (x1 - x0) * u + (rh() - 0.5) * 6, y = y0 + (rh() - 0.5) * 10;
      ink(g, [[x, y], [x + 6 + rh() * 6, y + (y1 - y0) * 0.5], [x + 10 + rh() * 10, y + (y1 - y0) * (0.8 + rh() * 0.3)]], 0.9 + rh() * 0.5, "rgba(40,48,35,0.28)", { taper: 0.9 });
    }
  }
  // (fix 2) fine cross-hatching in the shaded zones only: under the shoulder, the collar hollow, the back's lower fold
  hatch(g, [[520, 506], [560, 470], [610, 440], [660, 430], [720, 470], [740, 506]], { angle: 1.05, sp: 4.5, w: 0.8, color: "rgba(40,48,35,0.2)", seed: 301, len: 26, density: 0.75 });
  hatch(g, [[520, 506], [560, 470], [610, 440], [660, 430], [720, 470], [740, 506]], { angle: 2.3, sp: 6, w: 0.7, color: "rgba(40,48,35,0.14)", seed: 302, len: 20, density: 0.6 });
  hatch(g, [[960, 330], [1050, 322], [1040, 420], [1000, 520], [965, 540]], { angle: 1.25, sp: 4.5, w: 0.8, color: "rgba(40,48,35,0.2)", seed: 303, len: 30, density: 0.75 });
  hatch(g, [[780, 440], [860, 420], [880, 500], [800, 506]], { angle: 1.1, sp: 5, w: 0.8, color: "rgba(40,48,35,0.16)", seed: 304, len: 22, density: 0.6 });
  g.restore();
  // hood / collar flap (a slightly darker fold)
  shape(g, [...L.collar, [1050, 330], [1040, 430], [1000, 520], [979, 515], ...L.flapLow.slice().reverse()], "rgba(175,178,160,0.55)");
  ink(g, L.collar, 2.2, INK, { taper: 0.5 });
  ink(g, L.flapLow, 1.8, INK, { taper: 0.6 });
  ink(g, L.seam, 1.5, "rgba(36,21,18,0.8)", { taper: 0.7 });
  ink(g, L.seam2, 1.3, "rgba(36,21,18,0.7)", { taper: 0.7 });
  // fold troughs: a soft shade along the right side of each hanging fold
  g.save(); clipTo(g, HOOD_POLY); g.filter = "blur(6px)";
  for (const f of L.folds) ink(g, f.map(([x, y]) => [x + 9, y]), 14, "rgba(70,78,62,0.28)", { taper: 0.9 });
  g.restore();
  for (const f of L.folds) ink(g, f, 1.7, "rgba(36,21,18,0.8)", { taper: 0.85 });
  ink(g, FIGL.hoodtop, 2.8, INK, { taper: 0.2 });
  ink(g, HOOD_LEFT, 3, INK, { taper: 0.1 });
  ink(g, [[446, 806], [470, 790], [500, 776], [540, 772]], 1.5, "rgba(36,21,18,0.7)", { taper: 0.8 });   // the elbow's bunch fold
  for (const f of [[[470, 600], [520, 640], [560, 700]], [[445, 720], [500, 760], [540, 820]]]) ink(g, f, 1.6, "rgba(36,21,18,0.75)", { taper: 0.8 });
}
const TSHIRT_BASE = [[962, 650], [975, 600], [1005, 556], [1045, 535], [1080, 560], [1110, 640], [1128, 706], [1000, 716], [960, 720]];
function tshirt(g) {
  shape(g, TSHIRT_BASE, "#120f10");
  shape(g, FIGL.tshirt, "#120f10");
  g.save(); clipTo(g, FIGL.tshirt);
  g.fillStyle = "rgba(60,50,50,0.25)"; g.fillRect(900, 560, 60, 160);
  g.restore();
}
// fix 2: the hood over his right shoulder between the beanie's lower edge and the sleeve (131.60 grid: its outer contour
// runs (1510,520)-(1530,565)-(1545,605)-(1558,660)); it was missing, so the wall showed through there
const SHOULDER_R = [[1452, 600], [1476, 566], [1500, 540], [1512, 522], [1522, 540], [1532, 566], [1545, 605], [1558, 660], [1564, 700], [1450, 700]];
function sleeve(g) {
  shape(g, SHOULDER_R, HOOD);
  g.save(); clipTo(g, SHOULDER_R);
  g.fillStyle = lin(g, 1470, 540, 1560, 690, [[0, "rgba(40,45,35,0.25)"], [1, "rgba(40,45,35,0.05)"]]); g.fillRect(1440, 510, 140, 200);
  for (const f of [[[1492, 580], [1510, 620], [1520, 660]], [[1515, 560], [1532, 600], [1540, 640]]]) ink(g, f, 1.3, "rgba(36,21,18,0.6)", { taper: 0.8 });
  g.restore();
  ink(g, [[1510, 520], [1522, 540], [1532, 566], [1545, 605], [1558, 660], [1564, 700]], 2.6, INK, { taper: 0.2 });
  const S = [...FIGL.sleeve, [1290, 800], [1285, 720], [1330, 700], [1400, 690]];
  shape(g, S, "#b8b99e");
  g.save(); clipTo(g, S);
  // sunlit top/right, shade low left and along the bottom
  g.fillStyle = rad(g, 1535, 640, 20, 150, [[0, "rgba(200,180,150,0.55)"], [1, "rgba(200,180,150,0)"]]); g.fillRect(1280, 540, 320, 340);
  g.fillStyle = lin(g, 1300, 800, 1360, 875, [[0, "rgba(60,62,55,0.0)"], [1, "rgba(60,62,55,0.35)"]]); g.fillRect(1280, 700, 320, 180);
  // shade strokes following the sleeve's roll (lower band) and the fold on its right
  const rs = rng(9);
  for (let i = 0; i < 12; i++) {
    const x = 1300 + i * 19 + rs() * 8, y = 836 + rs() * 16;
    ink(g, [[x, y], [x + 14, y + 10 + rs() * 6], [x + 22, y + 22 + rs() * 6]], 0.9 + rs() * 0.5, "rgba(40,48,35,0.3)", { taper: 0.9 });
  }
  for (let i = 0; i < 6; i++) {
    const x = 1470 + i * 9 + rs() * 4, y = 720 + rs() * 20;
    ink(g, [[x, y], [x + 4, y + 50], [x + 2, y + 100 + rs() * 20]], 0.9, "rgba(40,48,35,0.25)", { taper: 0.9 });
  }
  g.restore();
  hatch(g, S, { angle: 1.15, sp: 4.5, w: 0.8, color: "rgba(40,48,35,0.18)", seed: 305, len: 24, density: 0.7, bounds: [1290, 800, 1560, 870] });
  hatch(g, S, { angle: 1.4, sp: 5, w: 0.8, color: "rgba(40,48,35,0.16)", seed: 306, len: 30, density: 0.6, bounds: [1440, 700, 1500, 860] });
  ink(g, L.sleeveL, 2.2, INK, { taper: 0.4 });
  ink(g, L.sleeveF1, 1.9, INK, { taper: 0.6 });
  ink(g, L.sleeveF2, 1.7, "rgba(36,21,18,0.85)", { taper: 0.7 });
  ink(g, [[1450, 740], [1470, 790], [1468, 850]], 1.4, "rgba(36,21,18,0.6)", { taper: 0.8 });
  ink(g, [[1495, 610], [1520, 640], [1545, 690]], 1.4, "rgba(36,21,18,0.6)", { taper: 0.8 });
  ink(g, FIGL.sleeve.slice(10), 2.8, INK, { taper: 0.15 });           // (fix 2: no contour across the top, where the shoulder runs on)
  ink(g, L.sleeveBot, 2.6, INK, { taper: 0.3 });
}
function forearm(g) {
  const A = [...L.armTop, [1270, 712], [1288, 790], [1282, 840], ...L.armBot.slice().reverse(), [880, 790]];
  shape(g, A, SKIN);
  g.save(); clipTo(g, A);
  g.fillStyle = lin(g, 0, 700, 0, 845, [[0, "rgba(255,248,236,0.4)"], [0.5, "rgba(255,248,236,0.1)"], [0.8, "rgba(205,120,105,0.3)"], [1, "rgba(190,100,90,0.5)"]]);
  g.fillRect(860, 690, 440, 160);
  const ra = rng(13);
  for (let i = 0; i < 9; i++) {
    const y = 806 + i * 3.6 + ra() * 2, x = 910 + ra() * 90, L = 120 + ra() * 180;
    ink(g, [[x, y], [x + L * 0.5, y + 1 + ra() * 2], [x + L, y + 2 + ra() * 3]], 0.9 + ra() * 0.5, "rgba(140,60,50,0.35)", { taper: 0.9 });
  }
  g.restore();
  ink(g, L.armTop, 2, INK, { taper: 0.3 });
  ink(g, L.armBot, 2.6, INK, { taper: 0.3 });
  ink(g, [[960, 800], [1010, 794], [1060, 796]], 1.1, "rgba(36,21,18,0.5)", { taper: 0.9 });
}
// his right hand draped over the left forearm, fingers to the right (outlines read off a 10 px grid of 131.60): the back
// of the hand, three fingers each with its own contour, nail and knuckle crease
const HAND_BACK = [[1100, 702], [1118, 676], [1160, 662], [1205, 656], [1250, 646], [1292, 635], [1332, 633], [1372, 640],
  [1400, 648], [1418, 656], [1404, 670], [1372, 668], [1346, 684], [1330, 694], [1296, 692], [1262, 694], [1232, 702],
  [1180, 707], [1130, 713]];
const FINGERS = [
  // [upper contour root -> tip, lower contour tip -> root, nail quad]
  { up: [[1262, 642], [1300, 636], [1340, 636], [1384, 644], [1418, 654], [1436, 663]], lo: [[1436, 663], [1428, 671], [1404, 672], [1366, 664], [1320, 660], [1276, 662]],
    nail: [[1412, 657], [1430, 661], [1428, 669], [1410, 667]] },
  { up: [[1250, 662], [1292, 664], [1336, 666], [1372, 668], [1398, 668]], lo: [[1398, 668], [1402, 676], [1392, 681], [1356, 684], [1312, 688], [1266, 690]],
    nail: [[1376, 668], [1396, 669], [1395, 678], [1377, 679]] },
  { up: [[1240, 680], [1276, 684], [1310, 684], [1334, 686]], lo: [[1334, 686], [1340, 692], [1330, 698], [1300, 700], [1262, 700]],
    nail: [[1312, 686], [1332, 687], [1331, 695], [1313, 696]] },
];
function hand(g) {
  shape(g, HAND_BACK, SKIN);
  g.save(); clipTo(g, HAND_BACK);
  g.fillStyle = lin(g, 0, 640, 0, 710, [[0, "rgba(255,240,228,0.25)"], [0.6, "rgba(220,150,130,0.15)"], [1, "rgba(200,110,95,0.45)"]]); g.fillRect(1090, 620, 360, 100);
  g.restore();
  ink(g, [[1100, 702], [1118, 676], [1160, 662], [1205, 656], [1250, 646], [1262, 642]], 2.2, INK, { taper: 0.4 });
  // fingers bottom-up, so each upper finger's contour lies over the one below
  for (let i = FINGERS.length - 1; i >= 0; i--) {
    const F = FINGERS[i], P = [...F.up, ...F.lo.slice(1)];
    shape(g, P, SKIN);
    g.save(); clipTo(g, P);
    g.fillStyle = lin(g, 0, F.up[2][1] - 4, 0, F.lo[3][1] + 2, [[0, "rgba(255,244,232,0.3)"], [0.5, "rgba(0,0,0,0)"], [1, "rgba(195,105,92,0.45)"]]);
    g.fillRect(1230, 620, 220, 100);
    g.restore();
    // nail: slightly lighter, pink-edged, with a dark rim toward the tip
    shape(g, F.nail, "#f0d2c2");
    ink(g, [...F.nail, F.nail[0]], 1.1, "rgba(120,55,50,0.7)", { taper: 0 });
    ink(g, F.up, (u) => 1.4 + 1.2 * u, INK, { taper: 0.2 });
    ink(g, F.lo, (u) => 2.4 - 0.8 * u, INK, { taper: 0.2 });
  }
  // knuckle creases and the tendons on the back of the hand
  for (const c of [[[1280, 640], [1288, 645], [1297, 646]], [[1300, 666], [1306, 671], [1313, 672]], [[1246, 668], [1252, 674]], [[1226, 684], [1234, 690]]])
    ink(g, c, 1.2, "rgba(90,40,36,0.7)", { taper: 0.6 });
  for (const c of [[[1150, 676], [1190, 668], [1232, 662]], [[1140, 692], [1185, 684], [1228, 680]]]) ink(g, c, 1, "rgba(160,85,75,0.4)", { taper: 0.9 });
}
function headphones(g) {
  // band (mostly hidden in the hair)
  ink(g, [[1030, 405], [1048, 355], [1080, 305]], 9, "#1c1a19", { taper: 0.1 });
  // cup side (ridged padding crescent) then the cup face (measured on the ink view: face ellipse ~ (979,478) 30x68)
  g.save(); g.translate(1008, 482); g.rotate(0.18);
  g.beginPath(); g.ellipse(0, 0, 50, 80, 0, 0, 6.3); g.fillStyle = "#2c2a28"; g.fill(); g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke();
  for (let a = -1.45; a < 1.5; a += 0.075) {
    const c = Math.cos(a), s2 = Math.sin(a);
    line(g, [[c * 30, s2 * 66], [c * 47, s2 * 77]], 1.3, "rgba(150,145,135,0.5)");
  }
  g.restore();
  g.save(); g.translate(979, 478); g.rotate(0.2);
  g.beginPath(); g.ellipse(0, 0, 31, 69, 0, 0, 6.3); g.fillStyle = "#1a1817"; g.fill(); g.lineWidth = 2.4; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.ellipse(-3, -2, 20, 52, 0, 0, 6.3); g.fillStyle = "#383532"; g.fill();
  g.beginPath(); g.ellipse(-3, -2, 11, 36, 0, 0, 6.3); g.fillStyle = "#1c1a19"; g.fill();
  g.beginPath(); g.ellipse(-8, -12, 9, 30, 0, 0, 6.3); g.strokeStyle = "rgba(170,165,150,0.4)"; g.lineWidth = 2; g.stroke();
  g.restore();
}
// the face, drawn on lines read off 20 px grids of 131.60. The skin runs on under the hair (the hair draws its edge).
const SKIN_FACE = [[1105, 380], [1150, 352], [1210, 340], [1280, 330], [1330, 345], [1380, 390], [1398, 450], [1402, 520],
  [1398, 580], [1370, 620], [1330, 640], [1260, 650], [1205, 656], [1160, 662], [1126, 654], [1100, 640], [1086, 600],
  [1082, 540], [1090, 460]];
// the neck below the jaw (left of the jaw lock), hatched, running into the black T-shirt
const NECK = [[1052, 506], [1030, 532], [1016, 558], [1022, 590], [1040, 610], [1062, 624], [1084, 634], [1100, 640],
  [1098, 590], [1092, 540], [1086, 500]];
function face(g) {
  shape(g, [[1070, 300], [1160, 268], [1300, 300], [1420, 400], [1480, 500], [1500, 600], [1440, 642], [1330, 648],
    [1160, 666], [1090, 632], [1040, 560], [1040, 420]], "#1a1212");
  // neck: pinker, in shade, with hatching running down its length
  shape(g, NECK, SKIN_D);
  g.save(); clipTo(g, NECK);
  g.fillStyle = lin(g, 1020, 520, 1100, 630, [[0, "rgba(150,70,62,0.35)"], [1, "rgba(150,70,62,0.1)"]]); g.fillRect(1000, 490, 110, 160);
  const rn = rng(41);
  for (let i = 0; i < 16; i++) {                         // diagonal shade hatching down the neck
    const x = 1026 + i * 4.8 + rn() * 3, y = 526 + rn() * 26 + i * 2;
    ink(g, [[x, y], [x + 8, y + 38 + rn() * 22], [x + 14, y + 66 + rn() * 18]], 1 + rn() * 0.6, "rgba(115,42,38,0.55)", { taper: 0.9 });
  }
  g.restore();
  ink(g, [[1050, 508], [1030, 532], [1016, 558], [1022, 590], [1042, 612], [1070, 628], [1100, 640]], 1.6, "rgba(36,21,18,0.75)", { taper: 0.5 });
  ink(g, [[1016, 566], [1026, 596], [1046, 616], [1074, 632], [1100, 642]], 2.6, "rgba(20,14,14,0.85)", { taper: 0.3 });   // T-shirt neckline
  // face skin
  shape(g, SKIN_FACE, SKIN);
  g.save(); clipTo(g, SKIN_FACE);
  // shade toward the jaw (left) and under the fringe; a faint warm flush on both cheeks
  g.fillStyle = lin(g, 1090, 560, 1135, 560, [[0, "rgba(200,120,100,0.28)"], [1, "rgba(200,120,100,0)"]]); g.fillRect(1080, 330, 120, 340);
  g.fillStyle = lin(g, 1200, 345, 1210, 385, [[0, "rgba(190,110,95,0.3)"], [1, "rgba(190,110,95,0)"]]); g.fillRect(1100, 330, 300, 80);
  g.fillStyle = rad(g, 1180, 450, 5, 40, [[0, "rgba(230,130,120,0.18)"], [1, "rgba(230,130,120,0)"]]); g.fillRect(1120, 400, 120, 110);
  g.fillStyle = rad(g, 1330, 575, 5, 42, [[0, "rgba(230,130,120,0.2)"], [1, "rgba(230,130,120,0)"]]); g.fillRect(1270, 520, 130, 110);
  g.fillStyle = rad(g, 1160, 600, 4, 30, [[0, "rgba(230,120,115,0.22)"], [1, "rgba(230,120,115,0)"]]); g.fillRect(1120, 560, 90, 90);
  // blush as short hatch strokes (cheek under the left eye, beside the nose, under the right eye)
  const blush = (x0, y0, n, dx, dy, len, ang, seed) => {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * dx + (r() - 0.5) * 2, y = y0 + i * dy + (r() - 0.5) * 2, L = len * (0.7 + 0.5 * r());
      line(g, [[x, y], [x + Math.cos(ang) * L, y + Math.sin(ang) * L]], 1 + 0.4 * r(), "rgba(150,60,55,0.42)");
    }
  };
  blush(1166, 424, 8, 4.2, 1.2, 22, 1.35, 17);
  blush(1242, 512, 9, 4.5, 2.5, 18, 2.1, 19);
  blush(1312, 562, 9, 5, 1.6, 16, 1.9, 21);
  // under-eye shading (soft, warm)
  ink(g, [[1216, 446], [1236, 456], [1256, 458]], 7, "rgba(190,105,95,0.28)", { taper: 0.9 });
  ink(g, [[1328, 552], [1350, 562], [1372, 562]], 7, "rgba(190,105,95,0.28)", { taper: 0.9 });
  // nose: soft light on the tip, shade under it; the bridge's shaded side runs up-right toward the right eye (hatched)
  g.fillStyle = rad(g, 1230, 540, 2, 13, [[0, "rgba(255,246,236,0.4)"], [1, "rgba(255,246,236,0)"]]); g.fillRect(1210, 522, 40, 36);
  ink(g, [[1204, 566], [1224, 574], [1246, 570]], 6, "rgba(185,100,90,0.3)", { taper: 0.9 });
  ink(g, [[1290, 462], [1272, 492], [1256, 520], [1248, 540]], 12, "rgba(180,95,85,0.22)", { taper: 0.8 });
  for (let i = 0; i < 7; i++) line(g, [[1258 + i * 4, 500 + i * 5], [1270 + i * 4, 510 + i * 5]], 1, "rgba(130,55,50,0.4)");
  g.restore();
  // nose (nostril line), mouth (one line, a short dimple mark), lower-lip shadow (short strokes, no fill)
  ink(g, [[1197, 534], [1203, 548], [1210, 557], [1226, 565], [1246, 561]], (u) => 2.4 - 1.2 * u, "#5e2a26");
  // the mouth: one line from its corner (a small dark point, no hook) down to the right
  ink(g, [[1135, 543], [1143, 555], [1156, 569], [1170, 582], [1185, 593], [1200, 604], [1217, 613], [1231, 620]], (u) => (u < 0.05 ? 3 : 2.1 - 0.5 * u), "#3e1a18", { taper: 0.2 });
  line(g, [[1186, 579], [1197, 585]], 1.2, "rgba(70,30,28,0.7)");
  for (let i = 0; i < 5; i++) {
    const x = 1150 + i * 7, y = 598 + i * 3.6;
    line(g, [[x, y], [x + 12, y + 7]], 1.1, "rgba(130,50,50,0.5)");
  }
  g.fillStyle = rad(g, 1168, 604, 2, 20, [[0, "rgba(215,110,110,0.3)"], [1, "rgba(215,110,110,0)"]]); g.fillRect(1140, 580, 60, 50);
  // the jaw lock's inner edge and the face's lower contour where the cheek rests on the hand
  ink(g, [[1099, 638], [1126, 652], [1172, 655], [1204, 650], [1240, 645]], 2.2, INK, { taper: 0.4 });
}
// eye openness: 1 = the sleepy half-open resting eyes, 0 = shut. Upper lid lines measured on 131.60; the opening is a
// narrow slit (about 8 px across at its widest, read off a 20 px grid) under a heavy dark upper lid.
const slit = (U, n, d) => U.map(([x, y], i) => { const w = Math.pow(Math.sin(Math.PI * i / (U.length - 1)), 0.7); return [x + n[0] * d * w, y + n[1] * d * w]; });
const EYE_U = [
  [[1188, 378], [1200, 388], [1215, 400], [1230, 414], [1243, 430], [1252, 446]],
  [[1316, 508], [1330, 516], [1345, 526], [1358, 536], [1370, 547], [1379, 558]],
];
const EYES = [
  { U: EYE_U[0], L: slit(EYE_U[0], [-0.72, 0.7], 8.5), iris: [1222, 409], ia: 0.78,
    brow: [[1256, 363], [1268, 376], [1280, 390], [1291, 405]], bw: 5.5 },
  { U: EYE_U[1], L: slit(EYE_U[1], [-0.62, 0.78], 8), iris: [1346, 532], ia: 0.66,
    brow: [[1306, 488], [1322, 482], [1342, 480], [1362, 484], [1382, 492]], bw: 4.5 },
];
for (const e of EYES) e.C = e.U.map((p, i) => [p[0] + (e.L[i][0] - p[0]) * 0.8, p[1] + (e.L[i][1] - p[1]) * 0.8]);
const lerpP = (A, B, u) => A.map((p, i) => [p[0] + (B[i][0] - p[0]) * u, p[1] + (B[i][1] - p[1]) * u]);
export function eyes(g, k) {
  for (const e of EYES) {
    ink(g, e.brow, (u) => e.bw * (0.35 + 0.9 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1))), "#1f1212");
    // lower-lid hatching (a few short strokes under the eye)
    const r0 = rng(91 + e.brow[0][0]), q0 = sample(e.L, false);
    for (let i = 3; i < q0.length - 3; i += 3) {
      const [x, y] = q0[i];
      line(g, [[x - 2, y + 5], [x - 5 - 3 * r0(), y + 11 + 4 * r0()]], 0.9, "rgba(120,55,50,0.45)");
    }
    const lid = lerpP(e.C, e.U, k);
    if (k > 0.04) {
      const open = [...lid, ...e.L.slice().reverse()];
      g.save(); g.beginPath(); trace(g, open, true, true); g.clip();
      g.fillStyle = "#e6cfc4"; g.fillRect(e.iris[0] - 50, e.iris[1] - 50, 100, 100);
      g.beginPath(); g.ellipse(e.iris[0], e.iris[1], 12, 9, e.ia, 0, 6.3); g.fillStyle = "#4a2c24"; g.fill();
      g.beginPath(); g.ellipse(e.iris[0], e.iris[1], 6, 5, e.ia, 0, 6.3); g.fillStyle = "#170c0a"; g.fill();
      g.beginPath(); g.arc(e.iris[0] - 3, e.iris[1] - 3, 1.4, 0, 6.3); g.fillStyle = `rgba(250,240,230,${0.55 * k})`; g.fill();
      // the lid's shadow on the eyeball
      ink(g, lid.map(([x, y]) => [x - 1, y + 3]), 4, "rgba(60,30,28,0.45)", { taper: 0.6 });
      g.restore();
      ink(g, e.L, 1.1, "rgba(80,35,32,0.7)", { taper: 0.8 });
    }
    // the heavy upper lid (4-5 px, thickest over the outer half) / the shut lid's lash line
    ink(g, lid, (u) => 1.2 + 3.6 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.6) * (0.75 + 0.25 * u), "#150b0b");
    if (k < 0.5) {
      const r = rng(71 + e.brow[0][0]);
      const q = sample(lid, false);
      for (let i = 2; i < q.length - 2; i += 3) {
        const [x, y] = q[i], [x2, y2] = q[i + 1];
        const dx = x2 - x, dy = y2 - y, d = Math.hypot(dx, dy) || 1;
        const nx = -dy / d, ny = dx / d;
        line(g, [[x, y], [x - nx * (5 + 3 * r()) - dx * 0.5, y - ny * (5 + 3 * r()) - dy * 0.5]], 1, `rgba(23,12,12,${0.7 * (1 - 2 * k)})`);
      }
    }
    // crease above the lid
    ink(g, e.U.map(([x, y]) => [x + 7, y - 9]), 1, "rgba(120,55,50,0.45)", { taper: 0.9 });
  }
}
// hair, drawn by hand (hairkit.js). Two coarse masses (outer outlines of the source's dark hair at 131.60 with the
// strands bridged, <= 40 vertices each: the band under the beanie's rim and down the left of the face; the right
// temple and the hair round the right cheek), then locks, skin partings and highlight strands placed by hand on
// positions read off 10-20 px grids.
const HAIR_MASS = [[1321, 319], [1288, 294], [1247, 274], [1154, 252], [1147, 256], [1140, 276], [1131, 283], [1096, 280],
  [1087, 288], [1067, 285], [1062, 291], [1064, 303], [1038, 326], [1039, 355], [1050, 364], [1043, 383], [1053, 404],
  [1062, 412], [1048, 508], [1054, 506], [1064, 480], [1070, 474], [1080, 480], [1081, 501], [1087, 501], [1093, 462],
  [1111, 419], [1122, 405], [1135, 399], [1176, 363], [1223, 350], [1249, 351], [1252, 358], [1257, 360], [1282, 344],
  [1295, 340], [1319, 324]];
const HAIR_MASS2 = [[1336, 334], [1308, 373], [1305, 394], [1294, 401], [1290, 448], [1304, 453], [1304, 470], [1336, 470],
  [1350, 465], [1348, 457], [1364, 428], [1377, 427], [1370, 473], [1398, 483], [1398, 596], [1343, 642], [1368, 636],
  [1420, 651], [1448, 615], [1474, 624], [1461, 608], [1467, 596], [1454, 584], [1474, 573], [1509, 532], [1499, 524],
  [1496, 507], [1475, 514], [1466, 510], [1472, 487], [1446, 467], [1434, 439], [1383, 375]];
const HAIR_LOCKS = [
  [[[1098, 452], [1090, 510], [1090, 570], [1100, 626]], 13],                    // down the left jaw
  [[[1300, 452], [1300, 490], [1304, 530]], 13],                                  // the long lock's tail by the right eye
  [[[1186, 358], [1170, 390], [1158, 422]], 12],                                  // fringe strands over the forehead
  [[[1164, 370], [1150, 402], [1143, 432]], 10],
  [[[1140, 394], [1130, 424], [1126, 448]], 8],
  [[[1210, 352], [1194, 380], [1180, 410]], 8],
  [[[1230, 350], [1222, 368], [1212, 382]], 6],
  [[[1348, 450], [1334, 484], [1318, 506]], 10],                                  // tips over the right brow
  [[[1376, 458], [1366, 494], [1356, 516]], 10],
  [[[1398, 478], [1390, 510], [1382, 542]], 9],
  [[[1100, 280], [1072, 278], [1046, 274]], 3.5],                                 // loose strands over the hood
  [[[1062, 296], [1044, 312], [1026, 334]], 4],
];
// skin showing between the locks of the right temple (tapered, root at the top)
const HAIR_PARTS = [
  { pts: [[1388, 380], [1383, 420], [1377, 464]], w: 10 },
  { pts: [[1362, 378], [1348, 412], [1331, 454]], w: 6 },
  { pts: [[1354, 382], [1340, 408], [1324, 440]], w: 4 },
  { pts: [[1346, 396], [1338, 414], [1332, 432]], w: 3 },
];
// flow guides for the shine inside the masses (root -> tip)
const HAIR_GUIDES = [
  [[1310, 318], [1250, 300], [1180, 300], [1120, 318], [1080, 350]],
  [[1300, 330], [1240, 325], [1180, 340], [1130, 380]],
  [[1150, 268], [1100, 292], [1070, 330], [1062, 390]],
  [[1080, 360], [1070, 420], [1062, 480]],
  [[1320, 340], [1308, 400], [1300, 460]],
  [[1400, 400], [1420, 460], [1430, 530], [1420, 600]],
  [[1440, 470], [1452, 530], [1445, 590]],
  [[1470, 520], [1440, 580], [1400, 620], [1360, 638]],
];
// fix 2: every lock's end breaks into 3-4 tapering tips; ~90 fine dark strands along the flow guides (wisps over the
// skin at the hair's edges); dark-brown highlight strands inside the masses (the source's shine is brown, not grey)
const WISP_GUIDES = [
  [[1130, 300], [1110, 340], [1096, 390], [1090, 440]], [[1180, 340], [1160, 380], [1146, 420], [1138, 452]],
  [[1220, 350], [1204, 382], [1190, 412]], [[1320, 330], [1310, 390], [1302, 440], [1302, 500]],
  [[1370, 380], [1360, 430], [1350, 480], [1340, 516]], [[1410, 420], [1400, 480], [1390, 540]],
  [[1440, 480], [1440, 540], [1420, 600], [1395, 630]], [[1080, 320], [1060, 380], [1052, 440], [1054, 500]],
  [[1100, 280], [1060, 282], [1030, 300]],
];
function hair(g) {
  shape(g, HAIR_MASS2, HAIR_INK);
  drawHair(g, { mass: HAIR_MASS, locks: HAIR_LOCKS, partings: HAIR_PARTS, guides: [], seed: 29, skin: "#e3b9a2", shine: false });
  let sd = 400;
  for (const [pts, w] of HAIR_LOCKS.slice(1)) if (w >= 8) lockTips(g, pts, w, sd++, { n: 3, spread: 0.14, reach: 0.18 });
  fineStrands(g, WISP_GUIDES, 90, 431, { spread: 16, lw: [0.7, 1.0] });
  massStrands(g, HAIR_MASS, HAIR_GUIDES.slice(0, 4), 29, { per: 8, spread: 24, col: "rgba(120,72,58,0.4)" });
  massStrands(g, HAIR_MASS2, HAIR_GUIDES.slice(4), 33, { per: 6, spread: 22, col: "rgba(120,72,58,0.4)" });
  massStrands(g, HAIR_MASS, HAIR_GUIDES.slice(0, 4), 37, { per: 6, spread: 24, col: "rgba(170,140,140,0.45)" });
}
function beanie(g) {
  const B = FIGL.beanie;
  shape(g, B, "#a9ad97");
  g.save(); clipTo(g, B);
  g.fillStyle = lin(g, 1200, 140, 1380, 300, [[0, "rgba(60,65,55,0.30)"], [1, "rgba(60,65,55,0)"]]); g.fillRect(1140, 110, 460, 480);
  g.fillStyle = lin(g, 1440, 300, 1590, 520, [[0, "rgba(60,65,55,0)"], [1, "rgba(60,65,55,0.25)"]]); g.fillRect(1140, 110, 460, 480);
  // crown hatching (upper left) and a soft light on the crown top
  hatch(g, B, { angle: 0.35, sp: 5, w: 1, color: "rgba(40,45,35,0.45)", seed: 31, len: 26, density: 0.85, bounds: [1160, 150, 1330, 240] });
  hatch(g, B, { angle: 2.0, sp: 6, w: 1, color: "rgba(40,45,35,0.35)", seed: 32, len: 20, density: 0.7, bounds: [1180, 180, 1330, 260] });
  // cuff ribbing: strokes across the band from the fold line toward the bottom edge
  const F = sample(L.beanFold, false);
  const r = rng(35);
  for (let i = 0; i < F.length; i += 2) {
    const [x, y] = F[i], [x2, y2] = F[Math.min(F.length - 1, i + 1)];
    const dx = x2 - x, dy = y2 - y, d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;      // toward the cuff (down-left)
    const len = 40 + 30 * r();
    line(g, [[x + nx * 4, y + ny * 4], [x + nx * len, y + ny * len]], 0.9 + 0.5 * r(), "rgba(40,45,35,0.32)");
  }
  hatch(g, B, { angle: 1.9, sp: 3.5, w: 1.1, color: "rgba(40,45,35,0.5)", seed: 33, len: 40, density: 0.95, bounds: [1440, 400, 1600, 590] });
  g.fillStyle = "rgba(50,55,45,0.18)"; g.beginPath(); g.moveTo(1440, 440); g.lineTo(1600, 380); g.lineTo(1600, 600); g.lineTo(1440, 600); g.fill();
  g.restore();
  ink(g, L.beanFold, 2.4, INK, { taper: 0.5 });
  ink(g, B, 2.8, INK, { closed: true, smooth: true });
}
function deskShadow(g) {
  shape(g, [[900, 838], [1000, 826], [1150, 836], [1290, 846], [1560, 842], [1590, 862], [1300, 872], [1050, 864], [900, 858]], "rgba(90,55,40,0.22)");
  // laptop base (keyboard deck) below the lid's right edge
  poly(g, [[900, 858], [1004, 857], [1014, 864], [1012, 872], [980, 946], [900, 946]], "#57524f");
  for (let y = 876; y < 946; y += 13) line(g, [[905, y], [990 - (y - 876) * 0.4, y]], 3, "rgba(25,22,22,0.6)");
  ink(g, [[900, 858], [1004, 857], [1014, 864], [1012, 872], [980, 946]], 2.2, INK, { smooth: false });
}
export function paintBodyL() {
  const c = canvas(2206, 946), g = c.getContext("2d");
  deskShadow(g); hoodie(g); sleeve(g); tshirt(g); forearm(g);
  return c;
}
export function paintFaceL() {
  const c = canvas(2206, 946), g = c.getContext("2d");
  face(g);
  return c;
}
export function paintHairL() {
  const c = canvas(2206, 946), g = c.getContext("2d");
  hair(g); beanie(g); headphones(g);
  return c;
}
export function paintHandL() {
  const c = canvas(2206, 946), g = c.getContext("2d");
  hand(g);
  return c;
}

export function paintFigL() { return { body: paintBodyL(), head: paintFaceL(), hair: paintHairL(), front: paintHandL() }; }
