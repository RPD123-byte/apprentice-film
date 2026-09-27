// s28 orbit: the designer's key drawings at 129.32 (A) and 129.96 (B), each in its own frame's px.
// Measured outlines (keysData.js) give the shapes; the fills, shading, hatching, fold lines, headphones, the owl's peek
// and the faces are drawn here.
import { canvas, shape, ink, line, hatch, lin, rad, trace, sample, clipTo, bb as bbox } from "./kit.js";
import { drawHair, massStrands, HAIR_INK } from "./hairkit.js";
import { KEYS } from "./keysData.js";
import { lidQuad } from "./lid.js";
import { rng } from "../../../lib/rng.js";

const INK = "#241512";
const HOOD = "#a2a690", HOOD_SH = "rgba(40,46,36,0.5)", BEANIE = "#a9ac96", SKIN = "#e9c2a8", HAIR = "#0e0a0a";

function ringsPath(g, R) {
  g.beginPath();
  for (const r of R) { g.moveTo(r[0][0], r[0][1]); for (let i = 1; i < r.length; i++) g.lineTo(r[i][0], r[i][1]); g.closePath(); }
}
const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
const asRings = (v) => (v && v.length && typeof v[0][0] === "number" ? [v] : v);
const outer = (R) => [R.reduce((b, r) => (area(r) > area(b) ? r : b), R[0])];

// per-key drawn details (frame px of the key), fold lines snapped to the ink (snap.py) or hand-placed
const DETAIL = {
  A: {
    folds: [[[409, 585], [463, 601], [490, 632], [506, 643]], [[334, 662], [394, 665], [444, 663], [509, 670]],
      [[512, 671], [530, 686], [526, 740], [515, 820], [508, 852]], [[534, 272], [551, 308], [567, 360], [580, 410], [574, 447], [550, 487], [536, 530]],
      [[330, 440], [350, 480], [371, 526]], [[402, 399], [418, 428], [431, 452], [449, 498]], [[295, 565], [355, 625], [374, 641]],
      [[254, 726], [294, 764], [323, 803]], [[427, 716], [451, 783], [469, 840]], [[597, 292], [642, 308], [678, 303], [696, 290]],
      [[555, 304], [594, 349], [608, 390], [620, 410], [615, 431]], [[1180, 640], [1200, 700], [1215, 740]]],
    cuff: [[409, 585], [506, 643], [512, 671], [526, 740], [508, 852], [330, 860], [300, 700], [334, 662]],
    phones: { c: [730, 476], rx: 42, ry: 86, rot: 0.2, band: [[730, 390], [722, 330], [745, 285]] },
    fingers: [[[560, 700], [600, 760], [610, 830]], [[600, 690], [650, 740], [660, 790]], [[660, 680], [700, 720], [712, 760]]],
    owl: [1268, 585],
    beanie: [[838, 232], [850, 195], [900, 168], [980, 148], [1060, 140], [1140, 145], [1200, 168], [1240, 210], [1262, 270], [1270, 340],
      [1268, 420], [1258, 490], [1245, 540], [1228, 562], [1206, 545], [1192, 490], [1170, 440], [1140, 395], [1100, 355], [1050, 318], [1000, 288], [950, 268], [900, 254], [850, 240]],
  },
  B: {
    folds: [[[490, 450], [515, 490], [540, 530]], [[550, 480], [570, 515], [590, 550]], [[420, 560], [470, 600], [520, 620]],
      [[330, 700], [380, 740], [430, 760]], [[560, 330], [600, 400], [620, 470]], [[700, 280], [720, 350], [730, 420]],
      [[640, 640], [650, 720], [640, 800]], [[480, 700], [500, 760], [505, 830]]],
    cuff: [[560, 640], [660, 650], [690, 700], [680, 850], [480, 855], [470, 700]],
    phones: { c: [820, 475], rx: 30, ry: 70, rot: 0.1, band: [[820, 405], [830, 330], [860, 280]] },
    fingers: [[[608, 790], [650, 770], [700, 752], [742, 742]], [[600, 815], [650, 800], [700, 786], [742, 776]], [[616, 840], [660, 828], [712, 815], [745, 808]]],
    owl: null,
    hand: [[648, 668], [700, 690], [745, 700], [778, 705], [750, 760], [745, 830], [700, 845], [640, 855], [600, 850], [585, 830], [598, 800], [610, 760], [625, 700]],
  },
};

// per-key head and hand, drawn by hand on positions read off 10-20 px grids of each key's own source frame:
// masses = coarse outer outlines of the dark hair with the strands bridged (<= 40 vertices each); every lock, parting,
// highlight strand, feature and finger is placed by hand.
const HEAD = {
  A: {
    masses: [
      [[1033, 331], [1009, 309], [862, 237], [853, 243], [844, 263], [811, 264], [808, 271], [798, 278], [767, 267], [751, 270],
        [749, 275], [752, 281], [740, 293], [746, 302], [745, 306], [721, 327], [722, 332], [738, 342], [746, 352], [779, 379],
        [790, 426], [793, 429], [806, 415], [818, 419], [831, 398], [842, 388], [848, 389], [853, 396], [868, 388], [883, 391],
        [898, 367], [920, 345], [933, 352], [973, 348], [981, 353], [987, 353], [1006, 345], [1013, 336], [1027, 337]],
      [[1062, 345], [1043, 366], [1044, 376], [1030, 398], [1019, 439], [1029, 441], [1036, 454], [1067, 461], [1095, 422],
        [1106, 426], [1099, 460], [1090, 468], [1102, 486], [1105, 533], [1081, 597], [1111, 611], [1123, 600], [1137, 608],
        [1149, 600], [1153, 581], [1164, 576], [1172, 586], [1159, 603], [1181, 614], [1190, 592], [1172, 574], [1164, 555],
        [1192, 536], [1195, 528], [1178, 511], [1182, 496], [1166, 453]],
    ],
    face: [[772, 430], [800, 380], [850, 340], [920, 322], [1000, 325], [1050, 350], [1100, 400], [1150, 460], [1185, 520],
      [1200, 600], [1160, 640], [1080, 650], [1000, 640], [960, 624], [880, 614], [800, 606], [772, 590], [762, 500]],
    chin: [[800, 606], [880, 614], [960, 624], [1000, 640]],
    locks: [
      [[[852, 300], [838, 352], [829, 404]], 14], [[[886, 306], [872, 352], [865, 398]], 11],
      [[[936, 336], [926, 368], [918, 396]], 7], [[[962, 340], [952, 368], [945, 392]], 6],
      [[[1000, 338], [1004, 384], [1011, 438]], 12], [[[1022, 352], [1026, 402], [1031, 450]], 8],
      [[[1090, 470], [1080, 520], [1070, 560]], 9], [[[1120, 560], [1100, 600], [1080, 622]], 10],
      [[[802, 392], [797, 450], [794, 520], [800, 600]], 14],
    ],
    parts: [{ pts: [[1118, 424], [1126, 470], [1133, 520]], w: 7 }, { pts: [[1150, 470], [1158, 518], [1164, 556]], w: 6 }],
    guides: [[[1005, 305], [930, 290], [860, 285], [800, 300], [755, 330]], [[1010, 325], [950, 318], [890, 322], [840, 345]],
      [[1070, 370], [1110, 430], [1150, 500], [1165, 580]], [[1110, 400], [1150, 460], [1178, 540]]],
    brows: [[[[925, 340], [950, 344], [975, 352], [992, 362]], 5], [[[1032, 440], [1055, 444], [1078, 452], [1098, 462]], 4.5]],
    blush: [[880, 424, 7, 4.5, 1.5, 18, 1.4], [985, 500, 7, 4.5, 2.5, 16, 2.0], [1044, 520, 7, 5, 1.5, 15, 1.8]],
    hand: { back: [[640, 690], [700, 668], [760, 665], [830, 672], [900, 690], [960, 700], [1000, 712], [1000, 748], [930, 730],
        [880, 735], [840, 738], [790, 752], [740, 756], [704, 758], [672, 746], [648, 722]],
      fingers: [
        { up: [[706, 728], [676, 734], [654, 754], [646, 784], [650, 806]], lo: [[650, 806], [662, 811], [672, 800], [676, 776], [690, 760], [712, 756]],
          nail: [[646, 788], [661, 786], [663, 803], [650, 806]] },
        { up: [[694, 704], [664, 710], [644, 722], [639, 738]], lo: [[639, 738], [651, 743], [672, 738], [700, 731]],
          nail: [[640, 723], [652, 721], [654, 736], [642, 738]] },
      ],
      creases: [[[680, 670], [700, 676], [720, 678]], [[842, 708], [862, 716], [884, 722]], [[662, 760], [668, 770]]],
      top: [[640, 690], [700, 668], [760, 665], [830, 672], [900, 690], [960, 700], [1000, 712]] },
    rim: [[850, 238], [900, 254], [950, 268], [1000, 288], [1050, 318], [1100, 355], [1140, 395], [1170, 440], [1192, 490], [1206, 545], [1216, 600]],
  },
  B: {
    masses: [
      [[1175, 311], [1146, 292], [1079, 263], [982, 262], [968, 270], [929, 267], [879, 284], [880, 294], [839, 332], [823, 360],
        [836, 370], [826, 401], [817, 405], [807, 400], [806, 404], [821, 417], [835, 414], [844, 424], [841, 387], [863, 348],
        [875, 341], [880, 349], [866, 384], [891, 389], [896, 396], [882, 409], [854, 400], [858, 422], [952, 423], [953, 412],
        [964, 396], [977, 401], [989, 394], [1004, 396], [1039, 349], [1062, 353], [1096, 348], [1111, 354], [1132, 337], [1160, 326]],
    ],
    face: [[900, 340], [960, 318], [1040, 316], [1120, 326], [1180, 356], [1222, 398], [1234, 440], [900, 440], [880, 400]],
    locks: [
      [[[980, 318], [982, 370], [986, 424]], 12], [[[1004, 340], [1004, 384], [1008, 424]], 8],
      [[[1140, 330], [1148, 380], [1152, 424]], 10], [[[1170, 336], [1180, 384], [1188, 424]], 12],
      [[[1200, 350], [1212, 392], [1222, 426]], 10], [[[1110, 340], [1116, 384], [1120, 424]], 6],
    ],
    parts: [{ pts: [[972, 330], [976, 370], [980, 402]], w: 7 }],
    guides: [[[1170, 300], [1100, 285], [1020, 280], [940, 290], [870, 320]], [[1150, 320], [1080, 305], [1000, 305], [920, 320], [860, 360]]],
    brows: [[[[1008, 344], [1030, 346], [1050, 352]], 4]],
    eyes: [[[1040, 364], [1056, 374], [1074, 386], [1092, 398], [1104, 408], [1112, 416]]],
    blush: [[1110, 378, 6, 4.5, 1.2, 14, 1.5]],
    hand: { back: [[612, 668], [700, 682], [788, 690], [790, 800], [760, 830], [700, 836], [640, 832], [600, 820], [585, 792], [598, 740]],
      fingers: [],
      splits: [[[788, 698], [720, 718], [660, 740], [616, 764]], [[788, 725], [720, 744], [660, 766], [610, 787]],
        [[782, 759], [720, 776], [660, 794], [616, 809]], [[771, 798], [720, 808], [670, 818], [632, 826]]],
      nails: [[606, 766, 0.4], [600, 789, 0.35], [606, 810, 0.3]],
      creases: [[[655, 732], [661, 740]], [[652, 756], [658, 764]], [[672, 780], [678, 788]], [[640, 820], [646, 828]]],
      top: [[612, 668], [700, 682], [788, 690]] },
    rim: [[990, 255], [1062, 277], [1122, 288], [1186, 296], [1246, 318], [1300, 345], [1349, 371], [1370, 414], [1390, 426]],
  },
};
function drawHand(g, Hd) {
  shape(g, Hd.back, SKIN);
  g.save(); clipTo(g, Hd.back);
  const [x0, y0, x1, y1] = bbox(Hd.back);
  g.fillStyle = lin(g, 0, y0, 0, y1, [[0, "rgba(255,242,230,0.25)"], [0.6, "rgba(220,150,130,0.12)"], [1, "rgba(200,110,95,0.4)"]]); g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (const sp of Hd.splits || []) ink(g, sp.map(([x, y]) => [x, y + 7]), 9, "rgba(200,110,95,0.3)", { taper: 0.6 });
  g.restore();
  for (let i = Hd.fingers.length - 1; i >= 0; i--) {
    const F = Hd.fingers[i], P = [...F.up, ...F.lo.slice(1)];
    shape(g, P, SKIN);
    shape(g, F.nail, "#f0d2c2");
    ink(g, [...F.nail, F.nail[0]], 1.1, "rgba(120,55,50,0.7)", { taper: 0 });
    ink(g, F.up, 2, INK, { taper: 0.3 });
    ink(g, F.lo, 2.2, INK, { taper: 0.3 });
  }
  for (const sp of Hd.splits || []) ink(g, sp, (u) => 1.2 + 1.4 * u, INK, { taper: 0.2 });
  for (const [x, y, a] of Hd.nails || []) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.ellipse(0, 0, 8, 5, 0, 0, 6.3); g.fillStyle = "#f0d2c2"; g.fill(); g.lineWidth = 1.1; g.strokeStyle = "rgba(120,55,50,0.7)"; g.stroke();
    g.restore();
  }
  for (const c of Hd.creases) ink(g, c, 1.2, "rgba(90,40,36,0.7)", { taper: 0.6 });
  ink(g, Hd.top, 2.2, INK, { taper: 0.3 });
  ink(g, [...Hd.back, Hd.back[0]], 1.4, "rgba(36,21,18,0.55)", { taper: 0 });
}
// the beanie's folded cuff: a band along its lower rim with ribs across it and a dark lower contour
function beanieCuff(g, B, rim, depth = 64) {
  const q = sample(rim, false), up = [];
  for (let i = 0; i < q.length; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    up.push([q[i][0] + dy * depth, q[i][1] - dx * depth]);            // toward the crown
  }
  g.save(); g.beginPath(); trace(g, B, true, true); g.clip();
  const band = [...q, ...up.slice().reverse()];
  g.beginPath(); trace(g, band, true, false); g.fillStyle = "rgba(70,78,62,0.16)"; g.fill();
  for (let i = 0; i < q.length; i += 3) line(g, [[q[i][0] + (up[i][0] - q[i][0]) * 0.08, q[i][1] + (up[i][1] - q[i][1]) * 0.08], [up[i][0], up[i][1]]], 1.1, "rgba(40,45,35,0.45)");
  g.restore();
  ink(g, up.filter((_, i) => i % 2 === 0), 2, "rgba(36,21,18,0.85)", { taper: 0.4, smooth: true });
  ink(g, rim, 3.4, INK, { taper: 0.2 });
}
function headphones(g, P) {
  ink(g, P.band, 9, "#1c1a19", { taper: 0.1 });
  g.save(); g.translate(P.c[0], P.c[1]); g.rotate(P.rot);
  g.beginPath(); g.ellipse(6, 0, P.rx, P.ry, 0, 0, 6.3); g.fillStyle = "#2c2a28"; g.fill(); g.lineWidth = 2.2; g.strokeStyle = INK; g.stroke();
  for (let a = -1.45; a < 1.5; a += 0.08) { const c = Math.cos(a), s = Math.sin(a); line(g, [[6 + c * P.rx * 0.6, s * P.ry * 0.82], [6 + c * P.rx * 0.95, s * P.ry * 0.96]], 1.2, "rgba(150,145,135,0.5)"); }
  g.beginPath(); g.ellipse(-4, 0, P.rx * 0.62, P.ry * 0.84, 0, 0, 6.3); g.fillStyle = "#1a1817"; g.fill(); g.stroke();
  g.beginPath(); g.ellipse(-6, -2, P.rx * 0.4, P.ry * 0.62, 0, 0, 6.3); g.fillStyle = "#383532"; g.fill();
  g.beginPath(); g.ellipse(-6, -2, P.rx * 0.22, P.ry * 0.42, 0, 0, 6.3); g.fillStyle = "#1c1a19"; g.fill();
  g.restore();
}
// the owl peeking out between the beanie and the lid (the user's white owl: round white head, dark eye, orange beak)
export function owlPeek(g, [x, y]) {
  g.save();
  const head = [[x - 32, y - 40], [x + 20, y - 52], [x + 45, y - 20], [x + 42, y + 45], [x - 10, y + 60], [x - 38, y + 30]];
  shape(g, head, "#f1ece2");
  g.fillStyle = rad(g, x + 10, y + 20, 5, 60, [[0, "rgba(0,0,0,0)"], [1, "rgba(150,135,120,0.35)"]]); g.beginPath(); trace(g, head, true, true); g.fill();
  ink(g, [...head, head[0]], 2, INK, { taper: 0 });
  g.beginPath(); g.arc(x, y - 8, 17, 0, 6.3); g.fillStyle = "#fbf8f2"; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.arc(x - 2, y - 7, 11, 0, 6.3); g.fillStyle = "#3a2418"; g.fill();
  g.beginPath(); g.arc(x - 2, y - 7, 6, 0, 6.3); g.fillStyle = "#0d0807"; g.fill();
  g.beginPath(); g.arc(x - 5, y - 11, 3, 0, 6.3); g.fillStyle = "#fff"; g.fill();
  shape(g, [[x - 30, y + 28], [x - 12, y + 22], [x - 18, y + 44]], "#e58a3c");
  ink(g, [[x - 30, y + 28], [x - 12, y + 22], [x - 18, y + 44], [x - 30, y + 28]], 1.5, INK, { taper: 0 });
  g.restore();
}

export function paintKey(id) {
  const K = KEYS[id], D = DETAIL[id], Hd = HEAD[id];
  const c = canvas(2206, 946), g = c.getContext("2d");
  const sil = K.sil, [x0, y0, x1, y1] = bbox(sil);
  if (D.owl) owlPeek(g, D.owl);
  // hoodie
  shape(g, sil, HOOD, { smooth: false });
  g.save(); g.beginPath(); trace(g, sil, true, false); g.clip();
  g.fillStyle = lin(g, x0, y0, x0 + (x1 - x0) * 0.15, y1, [[0, "rgba(255,252,235,0.08)"], [0.4, "rgba(0,0,0,0)"], [0.75, "rgba(40,46,36,0.3)"], [1, HOOD_SH]]);
  g.fillRect(x0 - 10, y0 - 10, x1 - x0 + 20, y1 - y0 + 20);
  // the rolled cuff (a little darker); shade strokes follow the folds (no uniform hatching)
  shape(g, D.cuff, "rgba(80,88,70,0.22)");
  ink(g, D.cuff.slice(0, 3), 1.8, "rgba(36,21,18,0.7)", { taper: 0.5 });
  g.filter = "blur(6px)";
  for (const f of D.folds) ink(g, f.map(([x, y]) => [x + 9, y]), 14, "rgba(70,78,62,0.3)", { taper: 0.9 });
  g.filter = "none";
  const rf = rng(41 + id.charCodeAt(0));
  for (const f of D.folds) for (let k = 0; k < 2; k++) ink(g, f.map(([x, y]) => [x + 5 + k * 5 + rf() * 2, y + rf() * 3]), 0.9, "rgba(40,48,35,0.3)", { taper: 0.95 });
  for (const f of D.folds) ink(g, f, 1.8, "rgba(36,21,18,0.82)", { taper: 0.8 });
  g.restore();
  // T-shirt / dark mass under the head
  if (K.dark && K.dark.length) shape(g, K.dark, HAIR_INK, { smooth: false });
  // forearm (coarse outline), lit on top and shaded along its lower edge
  const A = K.skinA;
  shape(g, A, SKIN, { smooth: false });
  g.save(); g.beginPath(); trace(g, A, true, false); g.clip();
  const [ax0, ay0, ax1, ay1] = bbox(A);
  g.fillStyle = lin(g, ax0, ay0, ax0, ay1, [[0, "rgba(255,244,228,0.25)"], [0.6, "rgba(0,0,0,0)"], [1, "rgba(200,110,95,0.4)"]]);
  g.fillRect(ax0, ay0, ax1 - ax0, ay1 - ay0);
  g.restore();
  ink(g, [...A, A[0]], 2, "rgba(36,21,18,0.8)", { smooth: false, taper: 0 });
  // face
  const Fp = Hd.face, [fx0, fy0, fx1, fy1] = bbox(Fp);
  shape(g, Fp, SKIN);
  g.save(); clipTo(g, Fp);
  g.fillStyle = lin(g, fx0, fy0, fx0, fy1, [[0, "rgba(190,110,95,0.28)"], [0.25, "rgba(255,244,228,0.1)"], [1, "rgba(200,110,95,0.25)"]]);
  g.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
  const r = rng(71 + id.charCodeAt(0));
  for (const [bx, by, n, dx, dy, len, ang] of Hd.blush) {
    g.fillStyle = rad(g, bx + n * dx / 2, by + n * dy / 2 + len / 2, 2, 30, [[0, "rgba(230,125,118,0.2)"], [1, "rgba(230,125,118,0)"]]); g.fillRect(bx - 40, by - 30, 110, 100);
    for (let i = 0; i < n; i++) { const x = bx + i * dx, y = by + i * dy, L = len * (0.7 + 0.5 * r()); line(g, [[x, y], [x + Math.cos(ang) * L, y + Math.sin(ang) * L]], 1 + 0.4 * r(), "rgba(150,60,55,0.42)"); }
  }
  g.restore();
  // features: closed lids with lashes, brows, nose, mouth
  const lids = Hd.eyes || [K.eyeL, K.eyeR].filter(Boolean);
  for (const L of lids) {
    ink(g, L, (u) => 1.4 + 4 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.6), "#150b0b");
    const q = sample(L, false), rl = rng(73 + L.length);
    for (let i = 1; i < q.length - 1; i += 2) {
      const [x, y] = q[i], [x2, y2] = q[i + 1]; const dx = x2 - x, dy = y2 - y, d = Math.hypot(dx, dy) || 1;
      line(g, [[x, y], [x - dy / d * (5 + 3 * rl()), y + dx / d * (5 + 3 * rl())]], 1, "rgba(23,12,12,0.6)");
    }
  }
  for (const [b, w] of Hd.brows) ink(g, b, (u) => w * (0.35 + 0.9 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1))), "#1f1212");
  if (K.nose && !Hd.eyes) ink(g, K.nose, (u) => 2.2 - u, "#5e2a26", { taper: 0.6 });
  if (K.mouth && !Hd.eyes) ink(g, K.mouth, (u) => (u < 0.08 ? 3 : 2.1), "#3e1a18");
  if (Hd.chin) {
    ink(g, Hd.chin, 2.2, INK, { taper: 0.3 });
    const rc = rng(5);                                   // shade hatching on the cheek beside the headphones
    for (let i = 0; i < 9; i++) { const y = 450 + i * 16 + rc() * 4; line(g, [[770 + rc() * 4, y], [790, y + 10 + rc() * 6]], 1, "rgba(110,45,40,0.5)"); }
  }
  // hand over the forearm
  drawHand(g, Hd.hand);
  // hair (hand-drawn: coarse masses, locks, partings, highlight strands)
  const nG = Hd.masses.length > 1 ? 2 : Hd.guides.length;
  for (const M of Hd.masses.slice(1)) { shape(g, M, HAIR_INK); massStrands(g, M, Hd.guides.slice(nG), 67 + id.charCodeAt(0), { per: 12, spread: 20 }); }
  drawHair(g, { mass: Hd.masses[0], locks: Hd.locks, partings: Hd.parts, guides: Hd.guides.slice(0, nG), seed: 61 + id.charCodeAt(0), skin: "#e3b9a2" });
  headphones(g, D.phones);
  // beanie over the hair: outline, crown shade, crown hatching, the folded cuff band
  const B = D.beanie || K.beanie, [bx0, by0, bx1, by1] = bbox(B);
  shape(g, B, BEANIE);
  g.save(); g.beginPath(); trace(g, B, true, true); g.clip();
  g.fillStyle = lin(g, bx0, by0, bx0 + (bx1 - bx0) * 0.5, by1, [[0, "rgba(60,65,55,0.28)"], [1, "rgba(60,65,55,0)"]]); g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
  hatch(g, null, { angle: 0.35, sp: 5, w: 1, color: "rgba(40,45,35,0.4)", seed: 51, len: 24, density: 0.8, bounds: [bx0, by0, bx0 + (bx1 - bx0) * 0.55, by0 + (by1 - by0) * 0.4] });
  g.restore();
  beanieCuff(g, B, Hd.rim);
  ink(g, B, 2.6, INK, { closed: true });
  ink(g, sil, 2.8, INK, { smooth: false, closed: true, taper: 0 });
  return c;
}
