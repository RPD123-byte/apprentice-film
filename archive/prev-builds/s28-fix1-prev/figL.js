// s28 locked view: the designer asleep on his arms (131.36-136.00), drawn in locked-frame px.
// Outlines of the big regions are measured (figLdata.js); fills, shading, folds, hatching and the face are drawn here.
// Parts: body (hoodie, T-shirt, arms, hand), head (hair, face, beanie, headphones), eyes (animated), all cached.
import { canvas, shape, poly, ink, line, hatch, lin, rad, clipTo, trace, sample } from "./kit.js";
import { FIGL } from "./figLdata.js";
import { rng } from "../../../lib/rng.js";

const INK = "#241512", INKS = "rgba(36,21,18,0.55)", INKF = "rgba(36,21,18,0.3)";
const HOOD = "#a6ab93", HOOD_D = "#8c9180", HOOD_DD = "#6f7466", HOOD_SUN = "#c7bc9d";
const SKIN = "#ebc6ab", SKIN_D = "#dea48f", SKIN_DD = "#c8857a", BLUSH = "rgba(226,120,120,0.35)";
const HAIR = "#0d0a0b";

// below (507,506) the outline continues under the lid (hidden when locked, seen in the orbit): the orbit's outline at
// 130.20 / 130.44 mapped back through the measured figure motion
const HOOD_LEFT = [[507, 506], [486, 540], [468, 580], [450, 630], [436, 690], [424, 750], [418, 820], [414, 946]];
const HOOD_POLY = [...FIGL.hoodtop, [1060, 330], [1040, 420], [1010, 520], [992, 590], [978, 650], [970, 720], [930, 780], [880, 800], [872, 946], ...HOOD_LEFT.slice().reverse()];

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
  shape(g, HOOD_POLY, HOOD);
  g.save(); clipTo(g, HOOD_POLY);
  g.fillStyle = lin(g, 640, 280, 880, 560, [[0, "rgba(255,255,240,0.10)"], [0.5, "rgba(0,0,0,0)"], [1, "rgba(40,45,35,0.30)"]]);
  g.fillRect(480, 220, 640, 740);
  // shaded underside of the shoulder (left, above the lid) and the collar hollow
  shape(g, [[520, 506], [560, 470], [610, 440], [660, 430], [720, 470], [740, 506]], "rgba(80,88,72,0.22)");
  shape(g, [[960, 330], [1050, 322], [1040, 420], [1000, 520], [965, 540]], "rgba(60,66,55,0.18)");
  hatch(g, HOOD_POLY, { angle: 1.3, sp: 8, w: 1, color: "rgba(40,48,35,0.22)", seed: 3, len: 34, density: 0.55, bounds: [520, 300, 900, 505] });
  hatch(g, HOOD_POLY, { angle: 1.1, sp: 6, w: 0.9, color: "rgba(40,48,35,0.3)", seed: 4, len: 26, density: 0.7, bounds: [880, 330, 1050, 520] });
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
  ink(g, HOOD_LEFT, 2.8, INK, { taper: 0.1 });
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
function sleeve(g) {
  const S = [...FIGL.sleeve, [1290, 800], [1285, 720], [1330, 700], [1400, 690]];
  shape(g, S, "#b8b99e");
  g.save(); clipTo(g, S);
  // sunlit top/right, shade low left and along the bottom
  g.fillStyle = rad(g, 1535, 640, 20, 150, [[0, "rgba(200,180,150,0.55)"], [1, "rgba(200,180,150,0)"]]); g.fillRect(1280, 540, 320, 340);
  g.fillStyle = lin(g, 1300, 800, 1360, 875, [[0, "rgba(60,62,55,0.0)"], [1, "rgba(60,62,55,0.35)"]]); g.fillRect(1280, 700, 320, 180);
  hatch(g, S, { angle: 0.4, sp: 5, w: 0.9, color: "rgba(40,48,35,0.32)", seed: 9, len: 26, density: 0.7, bounds: [1290, 770, 1520, 870] });
  hatch(g, S, { angle: 1.2, sp: 6, w: 0.9, color: "rgba(40,48,35,0.25)", seed: 10, len: 30, density: 0.6, bounds: [1400, 700, 1560, 840] });
  g.restore();
  ink(g, L.sleeveL, 2.2, INK, { taper: 0.4 });
  ink(g, L.sleeveF1, 1.9, INK, { taper: 0.6 });
  ink(g, L.sleeveF2, 1.7, "rgba(36,21,18,0.85)", { taper: 0.7 });
  ink(g, [[1450, 740], [1470, 790], [1468, 850]], 1.4, "rgba(36,21,18,0.6)", { taper: 0.8 });
  ink(g, [[1495, 610], [1520, 640], [1545, 690]], 1.4, "rgba(36,21,18,0.6)", { taper: 0.8 });
  ink(g, FIGL.sleeve, 2.8, INK, { taper: 0.15 });
  ink(g, L.sleeveBot, 2.6, INK, { taper: 0.3 });
}
function forearm(g) {
  const A = [...L.armTop, [1270, 712], [1288, 790], [1282, 840], ...L.armBot.slice().reverse(), [880, 790]];
  shape(g, A, SKIN);
  g.save(); clipTo(g, A);
  g.fillStyle = lin(g, 0, 700, 0, 845, [[0, "rgba(255,248,236,0.4)"], [0.5, "rgba(255,248,236,0.1)"], [0.8, "rgba(205,120,105,0.3)"], [1, "rgba(190,100,90,0.5)"]]);
  g.fillRect(860, 690, 440, 160);
  hatch(g, A, { angle: 0.04, sp: 4.5, w: 0.9, color: "rgba(120,50,40,0.4)", seed: 13, len: 50, density: 0.6, bounds: [900, 805, 1290, 842] });
  g.restore();
  ink(g, L.armTop, 2, INK, { taper: 0.3 });
  ink(g, L.armBot, 2.6, INK, { taper: 0.3 });
  ink(g, [[960, 800], [1010, 794], [1060, 796]], 1.1, "rgba(36,21,18,0.5)", { taper: 0.9 });
}
function hand(g) {
  shape(g, FIGL.hand, SKIN);
  g.save(); clipTo(g, FIGL.hand);
  g.fillStyle = lin(g, 0, 640, 0, 705, [[0, "rgba(220,150,130,0.25)"], [1, "rgba(200,110,95,0.5)"]]); g.fillRect(1100, 620, 350, 100);
  g.restore();
  ink(g, FIGL.hand, 1.4, "rgba(36,21,18,0.6)", { closed: true });
  ink(g, L.handTop, 2.2, INK, { taper: 0.4 });
  const fingers = [[[1248, 668], [1320, 664], [1392, 660], [1420, 664]], [[1252, 681], [1320, 679], [1375, 677]]];
  for (const f of fingers) ink(g, f, 1.3, "rgba(36,21,18,0.6)", { taper: 0.8 });
  for (const [x, y, a] of [[1414, 657, 0.1], [1384, 667, 0.05], [1316, 681, 0.1]]) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.ellipse(0, 0, 10, 5.5, 0, 0, 6.3); g.fillStyle = "#f3dccb"; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke();
    g.restore();
  }
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
const HEAD_BASE = [[1070, 300], [1160, 268], [1300, 300], [1420, 400], [1480, 500], [1500, 600], [1440, 642], [1330, 648], [1160, 666], [1090, 632], [1040, 560], [1040, 420]];
function face(g) {
  shape(g, HEAD_BASE, "#1a1212");
  // skin under the hair strands: the face, the right cheek and temple up to the beanie's rim (read off 131.60)
  shape(g, [[1150, 370], [1250, 335], [1330, 375], [1400, 445], [1440, 530], [1452, 610], [1400, 650], [1300, 655], [1160, 666], [1100, 640], [1060, 580], [1068, 470], [1105, 400]], "#e2b49e");
  const Fp = [...FIGL.face];
  shape(g, Fp, SKIN);
  g.save(); clipTo(g, Fp);
  // shading: shadow along the jaw (left) and under the hair, warm flush on the cheeks
  g.fillStyle = lin(g, 1035, 520, 1075, 560, [[0, "rgba(190,110,95,0.35)"], [1, "rgba(190,110,95,0)"]]); g.fillRect(1020, 330, 200, 340);
  g.fillStyle = rad(g, 1170, 590, 5, 45, [[0, "rgba(230,120,115,0.45)"], [1, "rgba(230,120,115,0)"]]); g.fillRect(1100, 530, 140, 120);
  g.fillStyle = rad(g, 1300, 540, 5, 50, [[0, "rgba(230,120,115,0.4)"], [1, "rgba(230,120,115,0)"]]); g.fillRect(1230, 470, 150, 150);
  g.fillStyle = rad(g, 1210, 420, 5, 60, [[0, "rgba(225,130,120,0.25)"], [1, "rgba(225,130,120,0)"]]); g.fillRect(1140, 350, 150, 150);
  g.fillStyle = rad(g, 1228, 545, 2, 14, [[0, "rgba(255,246,236,0.3)"], [1, "rgba(255,246,236,0)"]]); g.fillRect(1205, 515, 50, 50);
  // hatching under the eyes and along the jaw
  hatch(g, [[1160, 420], [1215, 440], [1240, 470], [1190, 475], [1150, 450]], { angle: -0.9, sp: 5, w: 0.9, color: "rgba(120,50,45,0.45)", seed: 17, len: 16 });
  hatch(g, [[1268, 520], [1300, 535], [1320, 570], [1290, 575], [1262, 550]], { angle: -0.8, sp: 5, w: 0.9, color: "rgba(120,50,45,0.45)", seed: 19, len: 14 });
  hatch(g, [[1045, 520], [1075, 520], [1100, 600], [1070, 620], [1050, 590]], { angle: 1.1, sp: 5, w: 0.9, color: "rgba(110,45,40,0.4)", seed: 23, len: 24 });
  g.restore();
  // nose (nostril line + soft tip), mouth (the smile, measured), lower lip shadow
  ink(g, [[1204, 543], [1208, 556], [1217, 561], [1228, 564], [1238, 560], [1245, 558]], 2.2, "#6a3530", { taper: 0.6 });
  ink(g, [[1250, 505], [1262, 520], [1268, 535]], 1, "rgba(120,60,55,0.45)", { taper: 0.9 });
  ink(g, [[1133, 540], [1140, 554], [1154, 568], [1170, 580], [1177, 588], [1193, 599], [1214, 614], [1228, 620]],
    (u) => (u < 0.08 ? 4.5 : 2.2 + 1.2 * u), "#4d2322");
  ink(g, [[1150, 596], [1162, 606], [1178, 614], [1190, 618]], 2.4, "rgba(120,50,50,0.5)", { taper: 0.8 });
  ink(g, [[1183, 578], [1195, 585]], 1.2, "rgba(80,35,35,0.6)");
  // jaw / cheek contour (left side of the face, against the hair and T-shirt)
  ink(g, L.jaw, 1.8, "rgba(36,21,18,0.8)", { taper: 0.6 });
}
// eye openness: 1 = the half-open resting eyes, 0 = shut. Lid lines measured (snap.py) on 131.60 (open) and 133.90 (shut).
const EYES = [
  { U: [[1188, 378], [1200, 388], [1215, 400], [1230, 414], [1243, 430], [1252, 446]],
    L: [[1197, 399], [1210, 412], [1225, 426], [1240, 440], [1250, 447]],
    C: [[1190, 387], [1203, 399], [1217, 413], [1231, 428], [1241, 441], [1246, 451]],
    hi: [[1206, 403], [1234, 426]], iris: [1221, 412], brow: [[1256, 363], [1268, 376], [1280, 390], [1291, 405]], bw: 5.5 },
  { U: [[1316, 508], [1330, 516], [1345, 526], [1358, 536], [1370, 547], [1379, 558]],
    L: [[1320, 521], [1333, 531], [1346, 540], [1358, 547], [1370, 554]],
    C: [[1310, 516], [1325, 528], [1340, 539], [1354, 549], [1366, 558], [1374, 566]],
    hi: [[1333, 518], [1352, 532]], iris: [1344, 529], brow: [[1300, 490], [1318, 479], [1340, 469], [1362, 466], [1383, 469], [1398, 474]], bw: 5 },
];
const lerpP = (A, B, u) => A.map((p, i) => [p[0] + (B[i][0] - p[0]) * u, p[1] + (B[i][1] - p[1]) * u]);
export function eyes(g, k) {
  for (const e of EYES) {
    ink(g, e.brow, (u) => e.bw * (0.35 + 0.9 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1))), "#1f1212");
    // eye bag / lower shading (warm)
    ink(g, e.L.map(([x, y]) => [x + 3, y + 9]), 6, "rgba(190,110,100,0.35)", { taper: 0.9 });
    const lid = lerpP(e.C, e.U, k);
    if (k > 0.04) {
      // the opening: iris under the upper lid, two small highlights
      const open = [...lid, ...e.L.slice().reverse()];
      g.save(); g.beginPath(); trace(g, open, true, true); g.clip();
      g.fillStyle = "#d9c0b4"; g.fillRect(e.iris[0] - 60, e.iris[1] - 60, 120, 120);
      g.beginPath(); g.ellipse(e.iris[0], e.iris[1], 26, 13, 0.72, 0, 6.3); g.fillStyle = "#3a2420"; g.fill();
      g.beginPath(); g.ellipse(e.iris[0], e.iris[1], 12, 8, 0.72, 0, 6.3); g.fillStyle = "#140b0a"; g.fill();
      for (const [x, y] of e.hi) { g.beginPath(); g.ellipse(x, y, 2.6 * k + 0.4, 1.6, 0.7, 0, 6.3); g.fillStyle = "rgba(255,252,245,0.9)"; g.fill(); }
      g.restore();
      ink(g, e.L, 1.2, "rgba(70,30,28,0.75)", { taper: 0.8 });
    }
    // upper lid (heavy, thickening toward the inner end) / the shut lid's lash line
    const wmax = 3.2 + 1.3 * k;
    ink(g, lid, (u) => 1.1 + wmax * Math.pow(u, 0.7) * (u > 0.88 ? (1 - u) * 8.3 : 1), "#170c0c");
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
function hair(g) {
  const rings = (g2) => { g2.beginPath(); for (const R of FIGL.hair) { g2.moveTo(R[0][0], R[0][1]); for (let i = 1; i < R.length; i++) g2.lineTo(R[i][0], R[i][1]); g2.closePath(); } };
  rings(g); g.fillStyle = HAIR; g.fill("evenodd");
  // strands: thin lighter streaks falling down-left from under the beanie (seeded)
  const r = rng(29);
  g.save(); rings(g); g.clip("evenodd");
  for (let i = 0; i < 90; i++) {
    const x = 1050 + r() * 450, y = 260 + r() * 360;
    const a = 1.82 + (r() - 0.5) * 0.5 - (x < 1150 ? 0.35 : 0), L = 25 + r() * 70;
    const w = 0.8 + r() * 1.4;
    ink(g, [[x, y], [x + Math.cos(a) * L * 0.5 + (r() - 0.5) * 6, y + Math.sin(a) * L * 0.5], [x + Math.cos(a) * L, y + Math.sin(a) * L]], w, `rgba(${95 + r() * 40},${80 + r() * 30},${80 + r() * 30},${0.35 + r() * 0.3})`, { taper: 0.9 });
  }
  g.restore();
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
