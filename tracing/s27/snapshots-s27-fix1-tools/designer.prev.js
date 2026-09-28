// s27 (drawn) — the designer asleep on his folded arms (the user's character), drawn in code.
// Reference pose = the held view at 125.0 s. Outline points were read by eye off 2–3x gridded crops of the source
// (snapshots/s27d-study/m_q*.jpg, f_*.jpg; frame px) and, for the longer ink contours, snapped onto the nearest ink
// line (snapshots/s27d-tools/des_outlines.py) — positions only. Fills are flat pre-grade colours sampled on the
// source, with soft painted shading, seeded hatching and tapered ink strokes authored here.
// The texture is drawn in frame px of the 125.0 s view (DES_BOX) and moved per frame by the measured mesh warp.
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";
import { canvas, inkLine } from "./draw.js";

export const DES_BOX = { x: -80, y: 40, w: 1210, h: 920, s: 1.25 };
const INK = "#1d1513";

const D = {
  jacket: "#72766a", jacketL: "#a09d85", jacketLL: "#aeaa92", jacketD: "#61675b", jacketDD: "#525a50",
  beanie: "#7f7f6f", beanieL: "#a3a18c", beanieLL: "#c0b69e", beanieD: "#66645a",
  skin: "#edc4aa", skinL: "#f3d2ba", skinSh: "#dfab98", skinD: "#cf9584", blush: "rgba(226,150,140,0.55)",
  hair: "#0c0808",
  hp: "#48423f", hpL: "#8f867e", hpD: "#2b2626", band: "#5e5857", bandL: "#8a8380",
  shirt: "#0a0707",
};

function sp(g, pts, closed = true) { g.beginPath(); smoothPath(g, pts, closed); }
function fillS(g, pts, col) { sp(g, pts); g.fillStyle = col; g.fill(); }
function fillP(g, pts, col) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fillStyle = col; g.fill(); }
function ink(g, pts, w = 3, col = INK, taper = 0.3) { inkLine(g, pts, w, col, { taper, per: 8 }); }
// soft painted shading: `shape` filled with `col`, blurred, clipped to `clip`
function shade(g, clip, shape, col, blur = 10) {
  g.save(); sp(g, clip); g.clip();
  g.filter = `blur(${blur}px)`; fillS(g, shape, col); g.filter = "none";
  g.restore();
}
// seeded hatching clipped to a shape: short parallel strokes at `ang`, spacing `sp`
function hatch(g, clip, box, ang, spc, col, w, seed, len = 60, dens = 0.7) {
  const R = rng(seed);
  g.save(); sp(g, clip); g.clip();
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round";
  const [x0, y0, x1, y1] = box, ca = Math.cos(ang), sa = Math.sin(ang);
  for (let y = y0; y < y1; y += spc) for (let x = x0; x < x1; x += len * 1.3) {
    if (R() > dens) continue;
    const cx = x + R() * len, cy = y + (R() - 0.5) * spc, L = len * (0.4 + 0.6 * R());
    g.beginPath(); g.moveTo(cx - ca * L / 2, cy - sa * L / 2); g.lineTo(cx + ca * L / 2, cy + sa * L / 2); g.stroke();
  }
  g.restore();
}
// a black hair strand: tapered wedge along a curve (root width w)
function strand(g, pts, w, col = D.hair) {
  const P = sampleCurve(pts, 10), n = P.length, L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const u = i / (n - 1), hw = w * 0.5 * Math.pow(1 - u, 0.8) * (0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, u * 2)));
    L.push([P[i][0] - dy * hw, P[i][1] + dx * hw]); Rr.push([P[i][0] + dy * hw, P[i][1] - dx * hw]);
  }
  g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (const p of L.slice(1)) g.lineTo(p[0], p[1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(Rr[i][0], Rr[i][1]); g.closePath(); g.fillStyle = col; g.fill();
}

// ---------------------------------------------------------------- geometry (frame px @ 125.0 s)
// back / shoulder contour (snapped), collar top
const BACK = [[-80, 520], [3, 459], [23, 435], [41, 409], [60, 388], [78, 370], [99, 353], [120, 338], [141, 323], [160, 310], [179, 297], [198, 287], [229, 279], [259, 275], [288, 269], [309, 265], [322, 263], [339, 266], [360, 273], [380, 278], [400, 274], [422, 276], [438, 262], [455, 250], [480, 253], [502, 258], [516, 271]];
// the sleeve's lower contour on the desk (snapped), from its end back to the gap
const SLEEVE_LOW = [[766, 800], [766, 833], [745, 853], [715, 873], [680, 882], [639, 895], [620, 896], [580, 890], [532, 880], [482, 867], [433, 829], [381, 789], [367, 780]];
const HEM = [[367, 780], [277, 816], [199, 860], [118, 902], [42, 945], [-80, 990]];
const JACKET = BACK.concat([[560, 300], [600, 420], [620, 560], [640, 600], [800, 590], [940, 535], [962, 533], [994, 550], [1012, 581], [1027, 615], [1032, 650], [1022, 673], [1011, 687], [989, 705], [966, 712], [940, 716], [918, 713], [880, 740], [800, 770], [766, 800]], SLEEVE_LOW.slice(1), HEM.slice(1), [[-80, 990]]);
const GAP = [[290, 724], [330, 752], [367, 780], [277, 816], [200, 863], [236, 800]];
// headphones: the band running down the collar (with slider segments), the cup on the neck
const BAND = [[470, 268], [500, 258], [528, 270], [532, 330], [522, 400], [512, 450], [490, 460], [468, 440], [462, 380], [462, 320]];
const CUP = [[505, 440], [530, 438], [559, 448], [583, 470], [597, 495], [603, 526], [585, 552], [571, 581], [548, 598], [519, 597], [491, 583], [473, 558], [464, 526], [464, 489], [485, 463]];
// black t-shirt at the neck
const SHIRT = [[580, 560], [610, 556], [640, 585], [652, 610], [630, 622], [600, 610], [585, 590]];
// beanie (outer contour + the snapped lower edge of the cuff), the crown/cuff fold (snapped)
const BEANIE_OUT = [[630, 248], [632, 231], [640, 217], [655, 202], [680, 180], [703, 168], [720, 160], [733, 141], [742, 112], [758, 99], [791, 90], [829, 89], [872, 95], [905, 113], [940, 133], [970, 156], [1000, 184], [1025, 212], [1047, 246], [1066, 285], [1075, 325], [1071, 365], [1061, 405], [1047, 442], [1026, 473], [1005, 499], [986, 512]];
const CUFF_LOW = [[990, 500], [990, 470], [982, 432], [962, 390], [940, 359], [920, 339], [900, 322], [880, 305], [840, 281], [800, 264], [760, 252], [720, 243], [680, 236], [650, 240], [636, 246]];   // hair boundary: first 12-px dark run below the cuff, every 20–40 px
const BEANIE = BEANIE_OUT.concat(CUFF_LOW);
const FOLD = [[676, 184], [740, 167], [801, 174], [851, 187], [899, 207], [938, 228], [976, 260], [1010, 294], [1048, 328], [1062, 363]];
const CROWN = BEANIE_OUT.slice(4, 22).concat([[1062, 363]], FOLD.slice().reverse());
// hair: the black mass under the beanie (top-left spikes read at 2.8x), and the face skin laid over it
const HAIR = [[636, 246], [650, 240], [680, 236], [720, 243], [760, 252], [800, 264], [840, 281], [880, 305], [900, 322], [920, 339], [940, 359], [962, 390], [982, 432], [990, 470], [992, 500], [979, 525], [953, 550], [932, 575], [926, 600], [926, 540], [918, 470], [895, 420], [872, 380], [845, 352], [800, 338], [745, 332], [705, 336], [690, 360], [668, 385], [645, 420], [632, 460], [630, 520], [634, 600], [600, 560], [575, 480], [555, 430], [535, 390], [528, 330], [528, 300], [522, 262], [548, 272], [575, 252], [600, 246]];
const SPIKES = [[[560, 300], [540, 262], [523, 228]], [[575, 300], [552, 275], [533, 248]], [[600, 262], [588, 232], [572, 213]], [[610, 258], [585, 250], [560, 240]], [[545, 330], [520, 300], [505, 280]]];
const FACE = [[636, 600], [630, 520], [632, 460], [645, 420], [668, 385], [700, 348], [745, 332], [800, 338], [845, 352], [870, 380], [893, 422], [916, 470], [925, 530], [925, 600], [870, 612], [800, 612], [740, 612], [690, 608], [650, 604]];
const NECK_SKIN = [[525, 342], [560, 332], [600, 345], [626, 362], [630, 440], [600, 446], [560, 442], [532, 432]];   // ear/neck skin between band and face (2.4x crop)
const TEMPLE = [[640, 300], [662, 292], [690, 305], [700, 338], [672, 352], [648, 340]];
const EAR = [[600, 330], [640, 320], [660, 360], [650, 470], [632, 520], [610, 470], [598, 400]];
const CHEEK_R = [[925, 530], [945, 520], [958, 560], [952, 598], [925, 600]];
// strands over the face (root first): read at 2.4x
const STRANDS = [   // [root, mid, tip], root width — black locks over the face (read on a 2.4x grid, frame px)
  [[[692, 292], [668, 360], [654, 437]], 17], [[[660, 300], [646, 370], [637, 410]], 10], [[[640, 296], [634, 340], [631, 372]], 6],
  [[[740, 332], [768, 350], [786, 372]], 7], [[[790, 336], [812, 360], [822, 392]], 6],
  [[[948, 404], [892, 425], [800, 450]], 22], [[[925, 440], [900, 470], [880, 482]], 10],
  [[[928, 520], [880, 560], [812, 574]], 16], [[[928, 580], [890, 596], [850, 604]], 12], [[[924, 470], [915, 520], [905, 560]], 10],
  [[[600, 330], [592, 380], [588, 440]], 16], [[[620, 360], [616, 420], [612, 480]], 12],
];
// the arm under the head: forearm skin, right hand below it; the sleeve cuff wrapped round at the right
const FOREARM = [[640, 600], [700, 604], [760, 597], [800, 590], [860, 592], [905, 578], [940, 580], [965, 612], [968, 648], [955, 680], [920, 697], [880, 690], [840, 680], [800, 674], [760, 670], [700, 662], [650, 650]];
const HAND_R = [[800, 672], [860, 682], [920, 690], [950, 700], [955, 722], [930, 745], [880, 750], [840, 736], [806, 704]];

// ---------------------------------------------------------------- painting
export function paintDesigner() {
  const B = DES_BOX, c = canvas(B.w * B.s, B.h * B.s), g = c.getContext("2d");
  g.scale(B.s, B.s); g.translate(-B.x, -B.y);
  // ---- his shadow on the desk under the arms (desk samples at 125.0: #bb9472 in shadow vs #d8bc90 lit)
  g.save(); g.filter = "blur(16px)";
  fillP(g, [[-80, 960], [120, 880], [380, 790], [560, 900], [700, 940], [800, 850], [960, 735], [1070, 700], [1080, 800], [900, 900], [760, 970], [-80, 970]], "rgba(110,62,38,0.32)");
  g.restore();
  // ---- jacket (one mass: back, upper arm, the folded sleeve on the desk, the sleeve round the head)
  fillS(g, JACKET, D.jacket);
  shade(g, JACKET, [[-80, 470], [120, 420], [250, 560], [330, 720], [240, 960], [-80, 990]], D.jacketD, 40);
  shade(g, JACKET, [[-80, 700], [150, 640], [260, 800], [100, 990], [-80, 990]], D.jacketDD, 40);
  shade(g, JACKET, [[150, 300], [330, 262], [460, 270], [440, 360], [260, 360], [160, 345]], D.jacketL, 18);
  shade(g, JACKET, [[340, 420], [440, 380], [520, 470], [560, 580], [500, 600], [400, 520]], "rgba(160,157,133,0.55)", 26);
  shade(g, JACKET, [[430, 280], [470, 270], [468, 440], [440, 470], [425, 360]], D.jacketLL, 10);
  shade(g, JACKET, [[600, 660], [740, 660], [765, 760], [740, 850], [650, 860], [610, 760]], D.jacketL, 26);
  shade(g, JACKET, [[380, 740], [520, 700], [590, 800], [560, 880], [440, 850]], D.jacketD, 26);
  shade(g, JACKET, [[945, 560], [1010, 580], [1030, 650], [1000, 700], [960, 690]], D.jacketL, 14);
  hatch(g, JACKET, [-80, 250, 1040, 960], -0.35, 14, "rgba(40,48,38,0.18)", 1.1, 2701, 70, 0.5);
  // gap under the arm (the black t-shirt / shadow) with its two buttons above it on the placket
  fillS(g, GAP, D.shirt);
  // jacket ink: fold lines (read at 3x), placket, buttons
  const folds = [
    [[100, 470], [96, 530], [98, 600]], [[133, 613], [200, 660], [290, 723]], [[170, 550], [290, 600], [410, 653]], [[170, 505], [300, 505], [420, 500]],
    [[175, 530], [300, 532], [415, 528]], [[182, 298], [230, 300], [297, 305]], [[270, 320], [330, 338], [370, 357]], [[273, 427], [330, 433], [390, 455]],
    [[140, 403], [155, 380], [167, 353]], [[20, 700], [60, 660], [110, 650], [200, 660]], [[70, 770], [140, 720], [230, 690]],
    [[500, 705], [530, 670], [560, 640]], [[622, 640], [620, 700], [625, 760]], [[650, 655], [665, 690], [680, 720]], [[700, 660], [706, 710], [705, 760]],
    [[735, 700], [742, 730], [740, 760]], [[540, 760], [600, 740], [650, 780]], [[680, 820], [710, 800], [740, 790]], [[420, 690], [470, 720], [520, 760]],
    [[330, 360], [360, 420], [400, 470]], [[440, 470], [480, 540], [530, 600]],
  ];
  for (const f of folds) ink(g, f, 2.2, "rgba(29,21,19,0.8)", 0.15);
  ink(g, [[236, 800], [260, 770], [290, 724]], 2.4);
  for (const [bx, by] of [[253, 750], [197, 833]]) { g.beginPath(); g.ellipse(bx, by, 5, 9, 0.5, 0, 7); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke(); }
  // ---- headphones: band down the collar (slider segments), then the cup
  fillS(g, BAND, D.band);
  shade(g, BAND, [[480, 270], [528, 270], [520, 440], [490, 450]], D.hp, 6);
  for (const y of [300, 335, 370, 400, 428]) ink(g, [[466, y + 4], [492, y], [524, y - 4]], 1.6);
  ink(g, BAND.concat([BAND[0], BAND[1]]), 2.6, INK, 0.8);
  fillS(g, CUP, D.hp);
  g.save(); sp(g, CUP); g.clip();
  g.beginPath(); g.ellipse(525, 520, 50, 60, 0.15, 0, 7); g.fillStyle = D.hpD; g.fill();
  g.beginPath(); g.ellipse(525, 520, 50, 60, 0.15, 0, 7); g.lineWidth = 2.5; g.strokeStyle = "rgba(20,15,15,0.8)"; g.stroke();
  g.beginPath(); g.ellipse(533, 518, 58, 70, 0.15, -1.3, 0.9); g.lineWidth = 7; g.strokeStyle = D.hpL; g.stroke();
  g.beginPath(); g.ellipse(526, 520, 34, 42, 0.15, 0, 7); g.lineWidth = 2; g.strokeStyle = "rgba(150,140,135,0.7)"; g.stroke();
  g.restore();
  ink(g, CUP.concat([CUP[0], CUP[1]]), 3.2, INK, 0.85);
  // ---- neck: shirt
  fillS(g, SHIRT, D.shirt);
  // ---- hair mass, spikes
  fillS(g, HAIR, D.hair);
  for (const s of SPIKES) strand(g, s, 16);
  // ---- face skin

  // ear peeking between the band and the hair (small)
  fillS(g, [[560, 350], [590, 342], [612, 360], [610, 400], [590, 410], [566, 392]], D.skinSh);
  ink(g, [[566, 360], [590, 352], [606, 372], [600, 398]], 1.6, "rgba(29,21,19,0.7)");
  fillS(g, TEMPLE, D.skinSh);
  fillS(g, FACE, D.skin);
  shade(g, FACE, [[630, 380], [690, 350], [740, 360], [700, 430], [640, 470]], D.skinSh, 16);
  shade(g, FACE, [[700, 400], [760, 395], [770, 460], [705, 465]], D.blush, 12);
  shade(g, FACE, [[830, 520], [890, 520], [895, 575], [835, 580]], D.blush, 12);
  shade(g, FACE, [[660, 470], [760, 480], [790, 560], [690, 590]], D.skinL, 16);
  shade(g, FACE, [[840, 360], [905, 420], [900, 520], [860, 470]], D.skinD, 14);
  // blush hatching (short parallel strokes)
  for (const [bx, by] of [[725, 425], [860, 548]]) for (let k = 0; k < 6; k++) ink(g, [[bx + k * 5, by - 12 + k * 1.5], [bx + k * 5 - 6, by + 12 + k * 1.5]], 1.2, "rgba(170,70,70,0.3)", 0.4);
  // ---- features: brows, closed eyes with lashes, nose, smile, mole, chin line
  ink(g, [[816, 350], [843, 368], [868, 394]], 7, INK, 0.2);
  ink(g, [[886, 458], [904, 468], [921, 484]], 6, INK, 0.2);
  ink(g, [[750, 360], [768, 382], [785, 400], [802, 416]], 6.5, INK, 0.25); ink(g, [[748, 352], [770, 368], [792, 384]], 2, "rgba(29,21,19,0.55)");
  for (const [a, b] of [[[772, 390], [765, 399]], [[783, 400], [777, 409]], [[794, 409], [790, 419]]]) ink(g, [a, b], 1.6);
  ink(g, [[725, 372], [745, 398], [760, 420]], 1.4, "rgba(29,21,19,0.45)");
  ink(g, [[842, 483], [855, 502], [869, 517], [888, 528]], 6.5, INK, 0.25); ink(g, [[848, 474], [866, 488], [886, 500]], 2, "rgba(29,21,19,0.55)");
  for (const [a, b] of [[[858, 506], [852, 515]], [[870, 516], [866, 525]], [[881, 523], [879, 532]]]) ink(g, [a, b], 1.6);
  ink(g, [[744, 500], [751, 519], [759, 534]], 2.2, "rgba(29,21,19,0.75)");
  ink(g, [[759, 534], [774, 540], [797, 531]], 2.8);
  ink(g, [[785, 470], [800, 500], [806, 520]], 1.4, "rgba(29,21,19,0.35)");
  ink(g, [[680, 498], [688, 516], [703, 537], [720, 557], [740, 572], [757, 580]], 2.8);
  g.fillStyle = INK; g.beginPath(); g.ellipse(680, 497, 3, 5, -0.6, 0, 7); g.fill();
  ink(g, [[700, 555], [708, 568], [716, 578]], 1.6, "rgba(29,21,19,0.5)");
  // ---- strands over the face
  for (const [pts, w] of STRANDS) strand(g, pts, w);
  // ---- beanie
  fillS(g, BEANIE, D.beanie);
  shade(g, BEANIE, [[700, 90], [880, 80], [900, 200], [720, 250]], D.beanieD, 26);
  shade(g, BEANIE, [[920, 170], [1080, 250], [1080, 470], [990, 420]], D.beanieL, 24);
  shade(g, BEANIE, [[980, 260], [1070, 300], [1060, 420], [1010, 380]], D.beanieLL, 18);
  // knit: ribs across the cuff (normal to the fold), hatching along the crown
  const F = sampleCurve(FOLD, 10), R = rng(2702);
  g.save(); sp(g, BEANIE); g.clip();
  for (let i = 1; i < F.length - 1; i++) {
    const a = F[i - 1], b = F[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L, len = 70 + 20 * R();
    ink(g, [[F[i][0] + nx * 3, F[i][1] + ny * 3], [F[i][0] + nx * len, F[i][1] + ny * len]], 1.3, "rgba(29,21,19,0.5)", 0.3);
  }
  g.restore();
  g.save(); sp(g, CROWN); g.clip();
  for (let k = 0; k < 22; k++) {
    const u = k / 21;
    const off = (p) => [p[0] - 70 * u * 1.0, p[1] - 90 * u];
    const P = FOLD.map(off);
    ink(g, P, 1.2, `rgba(29,21,19,${0.28 + 0.2 * R()})`, 0.3);
  }
  g.restore();
  ink(g, FOLD, 3.2);
  ink(g, BEANIE_OUT, 3.8, INK, 0.7);
  ink(g, CUFF_LOW, 2.4, INK, 0.5);
  // ---- the arm under the head: sleeve cuff (green) is in the jacket; forearm skin, the right hand
  fillS(g, FOREARM, D.skin);
  shade(g, FOREARM, [[640, 640], [950, 640], [950, 705], [640, 690]], D.skinSh, 14);
  ink(g, [[639, 606], [680, 610], [720, 604], [760, 607], [800, 598]], 2.6);
  ink(g, [[799, 676], [830, 678], [862, 683], [899, 690], [919, 696]], 2.6);
  fillS(g, HAND_R, D.skinSh);
  ink(g, [[830, 700], [870, 712], [910, 716], [940, 726]], 2.2); ink(g, [[850, 732], [890, 740], [925, 738]], 2);
  ink(g, [[940, 580], [960, 610], [968, 640], [960, 670], [945, 685], [920, 697]], 2.8);
  // ---- outer contour ink (back, sleeve on the desk, cuff)
  ink(g, BACK.slice(1), 3.6, INK, 0.7);
  ink(g, SLEEVE_LOW, 3.8, INK, 0.7);
  ink(g, HEM.slice(0, 5), 3.0, INK, 0.6);
  ink(g, [[939, 539], [962, 533], [994, 550], [1012, 581], [1027, 615], [1032, 650], [1022, 673], [1011, 687], [989, 705], [966, 712], [940, 716], [918, 713]], 3.4, INK, 0.7);
  ink(g, [[766, 800], [764, 757], [752, 727], [736, 691], [707, 667], [679, 656], [646, 656], [628, 639], [615, 620]], 2.8, INK, 0.5);
  return c;
}
