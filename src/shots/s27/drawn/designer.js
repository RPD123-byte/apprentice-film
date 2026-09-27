// s27 (drawn) — the designer asleep on his folded arms (the user's character), drawn in code.
// Reference pose = the held view at 125.0 s. Outline points were read by eye off 2–5x gridded crops of the source
// (snapshots/s27d-study, snapshots/s27-fix1-tools/{h*,t*}.jpg, frame px) and, for the hair, off a thresholded dark map
// of the same frame (mask125.jpg) — positions only. Fills are flat pre-grade colours matched to source samples through
// the film's grade, with painted shading, seeded hatching and tapered ink strokes authored here.
// The texture is drawn in frame px of the 125.0 s view (DES_BOX) and moved per frame by the measured mesh warp.
// Fix pass 1: the head was redrawn (hair mass + ~45 tapered locks instead of a hood, the face's left cheek and jaw line,
// a nose, no strands across the brows, hatched shading), the arm under his chin is now a wrist strip + a hand with
// finger lines, with the green left sleeve over it, and the beanie / jacket / headphone values were raised.
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";
import { canvas, inkLine } from "./draw.js";

export const DES_BOX = { x: -80, y: 40, w: 1210, h: 920, s: 1.25 };
const INK = "#1d1513";

const D = {
  jacket: "#868b7c", jacketL: "#a9a78f", jacketLL: "#b7b39b", jacketD: "#6f7567", jacketDD: "#5c6457",
  beanie: "#a3a38d", beanieL: "#b8b69f", beanieLL: "#cbc2aa", beanieD: "#8a8a77",
  skin: "#f0d0b5", skinL: "#f6e0c8", skinSh: "#e2b2a0", skinD: "#d39a88", skinDD: "#a86c5e", blush: "rgba(226,140,132,0.42)",
  arm: "#f0cfac", armSh: "#e0b097",
  hair: "#0c0808", hairHi: "rgba(128,112,112,0.85)",
  hp: "#5a5350", hpL: "#7f766f", hpD: "#48413e", band: "#45403e", bandL: "#5e5855",
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
// a hair lock: a tapered wedge along a smooth curve, root half-width w/2 falling to a point (power p)
function lock(g, pts, w, col = D.hair, p = 0.9) {
  const P = sampleCurve(pts, 6), n = P.length, L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const hw = w * 0.5 * Math.pow(1 - i / (n - 1), p);
    L.push([P[i][0] - dy * hw, P[i][1] + dx * hw]); Rr.push([P[i][0] + dy * hw, P[i][1] - dx * hw]);
  }
  g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (const q of L.slice(1)) g.lineTo(q[0], q[1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(Rr[i][0], Rr[i][1]); g.closePath(); g.fillStyle = col; g.fill();
}
// short parallel hatch strokes in a small patch (blush / shadow ticks): n strokes from `a` stepping by `st`, direction d
function ticks(g, a, st, d, n, w, col) {
  for (let k = 0; k < n; k++) {
    const x = a[0] + st[0] * k, y = a[1] + st[1] * k;
    ink(g, [[x, y], [x + d[0], y + d[1]]], w, col, 0.2);
  }
}

// ---------------------------------------------------------------- geometry (frame px @ 125.0 s)
// back / shoulder contour (snapped), collar top
const BACK = [[-80, 520], [3, 459], [23, 435], [41, 409], [60, 388], [78, 370], [99, 353], [120, 338], [141, 323], [160, 310], [179, 297], [198, 287], [229, 279], [259, 275], [288, 269], [309, 265], [322, 263], [339, 266], [360, 273], [380, 278], [400, 274], [422, 276], [438, 262], [455, 250], [480, 253], [502, 258], [516, 271]];
// the sleeve's lower contour on the desk, from its end back to the gap (right end re-read at 2.5x: the sleeve reaches
// x 826 at y 780, t9.jpg)
const SLEEVE_LOW = [[826, 760], [826, 785], [822, 812], [814, 830], [798, 845], [776, 857], [750, 865], [715, 873], [680, 882], [639, 895], [620, 896], [580, 890], [532, 880], [482, 867], [433, 829], [381, 789], [367, 780]];
const HEM = [[367, 780], [277, 816], [199, 860], [118, 902], [42, 945], [-80, 990]];
// the right sleeve round the right of his head (outer contour) and its cuff under the hands
const SLEEVE_R = [[940, 535], [962, 533], [994, 550], [1012, 581], [1027, 615], [1032, 650], [1024, 674], [1004, 700], [972, 716], [940, 716], [906, 706]];
const JACKET = BACK.concat([[560, 300], [600, 420], [620, 560], [640, 600], [800, 590]], SLEEVE_R, [[880, 720], [830, 740]], SLEEVE_LOW.slice(1), HEM.slice(1), [[-80, 990]]);
const GAP = [[290, 724], [330, 752], [367, 780], [277, 816], [200, 863], [236, 800]];
// the left forearm's sleeve over the wrist and hands (its top edge read at 2.4x, t6.jpg)
const SLEEVE_L = [[600, 622], [625, 624], [642, 637], [675, 649], [725, 654], [775, 666], [796, 678], [808, 695], [817, 716], [825, 745], [827, 778], [822, 812], [780, 850], [650, 860], [560, 800], [560, 680]];
// headphones: the band running down the collar (with slider segments), the cup on the neck
const BAND = [[470, 268], [500, 258], [528, 270], [532, 330], [522, 400], [512, 450], [490, 460], [468, 440], [462, 380], [462, 320]];
const CUP = [[505, 440], [530, 438], [559, 448], [583, 470], [597, 495], [603, 526], [585, 552], [571, 581], [548, 598], [519, 597], [491, 583], [473, 558], [464, 526], [464, 489], [485, 463]];
// black t-shirt / shadow under the jaw, left of the face (t4.jpg: x 574–626, y 577–623)
const SHIRT = [[562, 580], [590, 575], [616, 582], [640, 594], [654, 610], [650, 628], [620, 634], [588, 630], [562, 614]];
// beanie (outer contour + the snapped lower edge of the cuff), the crown/cuff fold (snapped)
const BEANIE_OUT = [[630, 248], [632, 231], [640, 217], [655, 202], [680, 180], [703, 168], [720, 160], [733, 141], [742, 112], [758, 99], [791, 90], [829, 89], [872, 95], [905, 113], [940, 133], [970, 156], [1000, 184], [1025, 212], [1047, 246], [1066, 285], [1075, 325], [1071, 365], [1061, 405], [1047, 442], [1026, 473], [1005, 499], [986, 512]];
const CUFF_LOW = [[990, 500], [990, 470], [982, 432], [962, 390], [940, 359], [920, 339], [900, 322], [880, 305], [840, 281], [800, 264], [760, 252], [720, 243], [680, 236], [650, 240], [636, 246]];
const BEANIE = BEANIE_OUT.concat(CUFF_LOW);
const FOLD = [[676, 184], [740, 167], [801, 174], [851, 187], [899, 207], [938, 228], [976, 260], [1010, 294], [1048, 328], [1062, 363]];
const CROWN = BEANIE_OUT.slice(4, 22).concat([[1062, 363]], FOLD.slice().reverse());

// --- the head (125.0 s): face skin under everything; its lower edge is the jaw line resting on the wrist
const FACE = [[522, 330], [545, 292], [600, 275], [680, 272], [760, 290], [860, 300], [935, 340], [955, 420], [950, 520], [935, 580], [900, 592], [850, 591], [800, 589], [760, 594], [703, 606], [650, 612], [636, 603], [627, 572], [626, 500], [622, 452], [600, 448], [562, 450], [532, 446], [520, 400]];
const JAW = [[622, 626], [650, 612], [703, 606], [760, 594], [800, 589], [830, 588]];
const FACE_L = [[626, 446], [626, 500], [627, 571], [634, 596], [650, 612]];   // left cheek contour (t4.jpg)
// the hair: one black mass under the cuff, from the spiky top-left over to the right side (mask125.jpg)
const HAIR = [[514, 290], [520, 268], [538, 254], [590, 243], [640, 240], [700, 238], [760, 246], [800, 258], [840, 275], [880, 300], [910, 322], [940, 350], [962, 385], [982, 430], [990, 470], [990, 510], [984, 545], [972, 575], [962, 595], [950, 604], [944, 590], [935, 572], [918, 560], [906, 548], [914, 528], [919, 505], [913, 482], [921, 470], [936, 446], [920, 436], [890, 432], [872, 418], [864, 400], [866, 376], [872, 354], [882, 338], [885, 336], [868, 340], [848, 349], [830, 340], [805, 333], [780, 334], [750, 337], [722, 341], [697, 348], [674, 357], [652, 364], [638, 364], [622, 362], [610, 378], [602, 394], [585, 396], [560, 396], [538, 398], [522, 396], [512, 340]];
// skin slivers of the left temple seen through the hair (h1.jpg: x 626–671, y 291–357, crossed by one lock)
const TEMPLE_A = [[627, 301], [648, 298], [674, 297], [654, 307], [631, 320]];
const TEMPLE_B = [[627, 339], [646, 335], [660, 344], [652, 356], [634, 358]];
// the skin triangle between the big lock and the right hair (t7.jpg)
const TRI_R = [[940, 424], [931, 450], [924, 478], [912, 470]];
// locks: [points root->tip, root width]
const LOCKS = [
  // spiky top-left (tips read at 3.5x, h1.jpg)
  [[[560, 262], [543, 248], [523, 232]], 11], [[[572, 272], [548, 262], [520, 250]], 10], [[[590, 260], [578, 250], [566, 240]], 8],
  [[[605, 252], [598, 244], [590, 236]], 7], [[[575, 280], [550, 272], [530, 268]], 9], [[[560, 300], [540, 290], [518, 288]], 8],
  // falling over the left forehead / cheek (upper-left group)
  [[[748, 336], [728, 352], [712, 372], [705, 386]], 8], [[[728, 340], [705, 362], [690, 382], [684, 396]], 10],
  [[[710, 344], [684, 370], [664, 398], [652, 428]], 15], [[[690, 350], [666, 378], [650, 410], [642, 440]], 11],
  [[[670, 356], [650, 384], [636, 418], [630, 446]], 10], [[[652, 362], [638, 388], [626, 420], [622, 440]], 8],
  [[[640, 362], [632, 390], [626, 408]], 6],
  // over the ear / side of the face (x 526–625, y 395–450)
  [[[604, 388], [594, 412], [588, 436]], 11], [[[588, 392], [574, 416], [566, 442]], 11], [[[566, 394], [555, 418], [548, 440]], 9],
  [[[546, 396], [538, 420], [534, 444]], 8], [[[530, 394], [526, 420], [527, 446]], 6], [[[616, 380], [611, 405], [608, 425]], 6],
  // across the temple slivers (one lock, h1.jpg y 312–325)
  [[[690, 312], [662, 316], [636, 320], [618, 322]], 9],
  // the forehead hairline: two short locks
  [[[872, 337], [858, 346], [846, 354]], 10], [[[812, 334], [804, 342], [798, 348]], 5],
  // the right side, hanging down past the face (root under the cuff)
  [[[905, 336], [893, 362], [889, 388], [896, 414]], 11], [[[925, 350], [912, 380], [906, 410], [915, 432]], 9],
  // the big lock sweeping left between the eyes (t7.jpg: 22 px thick at x 880, tip at (783, 472))
  [[[926, 452], [900, 454], [870, 458], [846, 464]], 5],
  // the lock under the lower eye (tip (797, 592))
  [[[930, 564], [900, 574], [872, 584], [850, 590]], 7],
  // hanging tips at the lower right
  [[[958, 560], [952, 588], [958, 614]], 11], [[[976, 560], [976, 592], [986, 618]], 8], [[[940, 570], [930, 596], [934, 612]], 9],
  [[[990, 520], [995, 556], [1004, 580]], 6],
];
// the two big locks as polygons (mask125.jpg): the one sweeping left between the eyes, the one under the lower eye
const LOCK_1 = [[782, 472], [810, 461], [840, 447], [866, 431], [886, 415], [904, 404], [925, 410], [936, 440], [915, 447], [880, 458], [840, 466], [805, 471]];
const LOCK_2 = [[795, 593], [830, 576], [868, 560], [903, 545], [935, 534], [962, 528], [964, 572], [930, 578], [900, 582], [868, 588], [838, 592], [810, 595]];
// grey highlights along the hair's flow (thin slits of lighter ink)
const HAIR_HI = [
  [[652, 268], [690, 256], [722, 250]], [[662, 282], [705, 268], [740, 262]], [[700, 296], [740, 282], [775, 276]], [[722, 312], [758, 298], [790, 290]],
  [[760, 312], [800, 300], [838, 298]], [[790, 322], [822, 314], [850, 314]], [[820, 300], [850, 296], [872, 302]], [[610, 290], [640, 280], [665, 276]],
  [[905, 402], [912, 440], [930, 470]], [[935, 400], [950, 440], [960, 480]], [[945, 470], [952, 510], [948, 545]], [[925, 485], [935, 520], [930, 548]],
  [[962, 430], [970, 470], [968, 510]], [[560, 330], [585, 320], [600, 318]], [[540, 350], [565, 344], [590, 342]],
];
// the wrist (under the jaw) and the right hand, then the left hand below it (t6.jpg, t9.jpg)
const ARM = [[606, 632], [640, 615], [700, 606], [760, 594], [800, 589], [850, 588], [900, 592], [940, 598], [958, 614], [967, 645], [962, 675], [952, 694], [936, 712], [926, 730], [908, 748], [880, 756], [850, 757], [826, 745], [812, 710], [796, 680], [740, 662], [680, 652], [630, 644]];

// ---------------------------------------------------------------- painting
export function paintDesigner() {
  const B = DES_BOX, c = canvas(B.w * B.s, B.h * B.s), g = c.getContext("2d");
  g.scale(B.s, B.s); g.translate(-B.x, -B.y);
  // (fix pass 2) no blurred shadow smear under the arms: the source's desk is lit there (190,152,110 at (560–760, 820–900))
  g.save(); g.filter = "blur(6px)";
  fillP(g, [[380, 792], [560, 890], [700, 930], [840, 866], [960, 758], [1000, 770], [860, 890], [720, 950], [380, 820]], "rgba(110,62,38,0.14)");
  g.restore();
  // the deep shade under the near sleeve's elbow (source 122,81,65 at (300–450, 780–900))
  g.save(); g.filter = "blur(12px)";
  fillP(g, [[200, 800], [370, 782], [440, 830], [480, 885], [300, 895], [180, 885]], "rgba(96,50,32,0.62)");   // (not below y ~900: source 150–159 luma there)
  g.restore();
  // ---- jacket (one mass: back, upper arm, the folded sleeve on the desk, the sleeve round the head)
  fillS(g, JACKET, D.jacket);
  shade(g, JACKET, [[-80, 560], [80, 520], [200, 640], [260, 760], [200, 960], [-80, 990]], D.jacketD, 40);
  shade(g, JACKET, [[-80, 620], [140, 600], [300, 760], [260, 900], [100, 990], [-80, 990]], D.jacketDD, 40);
  shade(g, JACKET, [[-80, 700], [100, 680], [220, 800], [120, 960], [-80, 990]], "#4f574b", 36);
  shade(g, JACKET, [[150, 300], [330, 262], [460, 270], [440, 360], [260, 360], [160, 345]], "rgba(169,167,143,0.5)", 18);
  shade(g, JACKET, [[340, 420], [440, 380], [520, 470], [560, 580], [500, 600], [400, 520]], "rgba(169,167,143,0.55)", 26);
  // (fix pass 2) values re-sampled at 125.0: the back and the upper arm's underside are darker (source 83–94 luma at
  // (0–250, 400–600), 83 at (300–450, 700–800)), the strip left of the headband is in shadow (112 at (400–460, 300–450)),
  // the sleeve above the elbow is lighter (158 at (500–600, 600–700))
  shade(g, JACKET, [[-80, 400], [260, 380], [330, 620], [300, 740], [-80, 760]], "rgba(80,88,74,0.75)", 40);
  shade(g, JACKET, [[280, 700], [460, 690], [470, 800], [300, 820]], "rgba(80,88,74,0.5)", 30);
  shade(g, JACKET, [[395, 290], [462, 282], [466, 450], [420, 462]], "rgba(70,74,64,0.6)", 14);
  shade(g, JACKET, [[480, 590], [600, 580], [630, 700], [520, 720]], "rgba(172,170,146,0.8)", 24);
  shade(g, JACKET, [[380, 740], [520, 700], [590, 800], [560, 880], [440, 850]], D.jacketD, 26);
  shade(g, JACKET, [[945, 560], [1010, 580], [1030, 650], [1000, 700], [960, 690]], D.jacketL, 14);
  hatch(g, JACKET, [-80, 250, 1040, 960], -0.35, 14, "rgba(40,48,38,0.16)", 1.1, 2701, 70, 0.5);
  // gap under the arm (the black t-shirt / shadow) with its two buttons above it on the placket
  fillS(g, GAP, D.shirt);
  // jacket ink: fold lines (read at 3x), placket, buttons
  const folds = [
    [[100, 470], [96, 530], [98, 600]], [[133, 613], [200, 660], [290, 723]], [[170, 550], [290, 600], [410, 653]], [[170, 505], [300, 505], [420, 500]],
    [[175, 530], [300, 532], [415, 528]], [[182, 298], [230, 300], [297, 305]], [[270, 320], [330, 338], [370, 357]], [[273, 427], [330, 433], [390, 455]],
    [[140, 403], [155, 380], [167, 353]], [[20, 700], [60, 660], [110, 650], [200, 660]], [[70, 770], [140, 720], [230, 690]],
    [[500, 705], [530, 670], [560, 640]], [[540, 760], [600, 740], [650, 780]], [[420, 690], [470, 720], [520, 760]],
    [[330, 360], [360, 420], [400, 470]], [[440, 470], [480, 540], [530, 600]],
  ];
  for (const f of folds) ink(g, f, 2.2, "rgba(29,21,19,0.8)", 0.15);
  ink(g, [[236, 800], [260, 770], [290, 724]], 2.4);
  for (const [bx, by] of [[253, 750], [197, 833]]) { g.beginPath(); g.ellipse(bx, by, 5, 9, 0.5, 0, 7); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke(); }

  // ---- the wrist under his jaw and the hands (skin), then the left sleeve over them
  fillS(g, ARM, D.arm);
  // (fix pass 2) the forearm and hands are shaded with hatching and a pink shadow band, as on the source (125.0 at
  // 3.6x, src_hand2.jpg): a band above the forearm's lower contour (800–950, 665–695), shade under the jaw, the left
  // hand's fingers under it with their separations and a pink shadow along its bottom
  g.save(); sp(g, ARM); g.clip(); g.filter = "blur(5px)";   // soft-edged, so the bands never read as flat patches
  fillP(g, [[780, 656], [840, 662], [900, 668], [945, 662], [962, 646], [966, 700], [900, 704], [840, 694], [780, 684]], "rgba(214,140,128,0.72)");
  fillP(g, [[606, 628], [700, 610], [800, 592], [805, 606], [700, 624], [615, 642]], "rgba(214,150,132,0.45)");
  fillP(g, [[812, 740], [860, 745], [905, 728], [930, 712], [936, 740], [900, 760], [840, 764]], "rgba(214,140,128,0.5)");
  g.filter = "none"; g.restore();
  hatch(g, ARM, [606, 612, 800, 652], -0.3, 5, "rgba(150,80,70,0.3)", 1.0, 2721, 24, 0.55);
  hatch(g, ARM, [800, 700, 930, 760], -0.3, 5, "rgba(150,80,70,0.3)", 1.0, 2723, 20, 0.55);
  hatch(g, ARM, [900, 610, 960, 670], 1.2, 6, "rgba(150,80,70,0.25)", 1.0, 2725, 18, 0.55);
  // knuckle creases (thin V ticks at the upper left of the hand), a crease under the cuff
  ink(g, [[812, 632], [806, 650], [800, 668], [790, 680]], 2.4, INK, 0.3);
  ink(g, [[820, 640], [818, 652]], 1.3, "rgba(29,21,19,0.7)", 0.3); ink(g, [[826, 636], [823, 650]], 1.3, "rgba(29,21,19,0.7)", 0.3);
  ink(g, [[808, 663], [822, 660], [836, 664]], 1.3, "rgba(29,21,19,0.6)", 0.3);
  ink(g, [[918, 648], [935, 652], [952, 655]], 1.3, "rgba(29,21,19,0.55)", 0.3);
  ink(g, [[925, 640], [940, 643]], 1.2, "rgba(29,21,19,0.45)", 0.3);
  // the forearm's lower contour (full ink), its right end into the cuff
  ink(g, [[780, 672], [800, 675], [840, 688], [880, 697], [910, 701], [940, 696], [962, 684]], 3.4, INK, 0.45);
  ink(g, [[962, 684], [970, 662], [966, 636], [954, 618]], 2.6);
  // the left hand under it: its left edge, the fingers' lower contour, two finger separations, the thumb
  ink(g, [[866, 700], [880, 716], [888, 734]], 1.8, "rgba(29,21,19,0.85)", 0.3);
  ink(g, [[902, 703], [910, 716], [913, 728]], 1.6, "rgba(29,21,19,0.8)", 0.3);
  ink(g, [[840, 758], [862, 744], [896, 738], [918, 716], [936, 706]], 3.0, INK, 0.4);
  ink(g, [[848, 740], [860, 724], [870, 712]], 1.6, "rgba(29,21,19,0.75)", 0.3);
  ink(g, [[815, 700], [824, 730], [832, 760]], 2.6, INK, 0.4);
  // the left forearm's sleeve over the wrist and the hands
  fillS(g, SLEEVE_L, D.jacket);
  shade(g, SLEEVE_L, [[640, 700], [760, 690], [800, 740], [790, 830], [680, 840]], D.jacketL, 30);
  shade(g, SLEEVE_L, [[560, 700], [610, 690], [640, 800], [600, 860], [560, 840]], D.jacketD, 22);
  shade(g, SLEEVE_L, [[650, 650], [760, 662], [800, 690], [760, 700], [660, 690]], D.jacketL, 12);
  for (const f of [[[622, 640], [620, 700], [625, 760]], [[650, 655], [665, 690], [680, 720]], [[700, 662], [706, 710], [705, 760]], [[735, 700], [742, 730], [740, 760]],
    [[680, 820], [710, 800], [740, 790]], [[760, 690], [780, 740], [790, 800]]]) ink(g, f, 2.2, "rgba(29,21,19,0.8)", 0.15);
  ink(g, [[606, 628], [625, 625], [642, 637], [675, 649], [725, 654], [775, 666], [796, 678], [808, 695], [817, 716], [825, 745], [827, 778]], 3.0, INK, 0.5);

  fillS(g, SHIRT, D.shirt);
  paintFace(g);
  paintPhones1(g);
  paintHair(g);
  paintBeanie1(g);
  // ---- outer contour ink (back, sleeve on the desk, the right sleeve)
  ink(g, BACK.slice(1), 3.6, INK, 0.7);
  ink(g, SLEEVE_LOW, 3.8, INK, 0.7);
  ink(g, HEM.slice(0, 5), 3.0, INK, 0.6);
  ink(g, SLEEVE_R.concat([[880, 718]]), 3.4, INK, 0.7);
  ink(g, [[944, 548], [958, 575], [966, 610], [968, 645], [962, 680], [946, 700], [920, 708]], 2.6, INK, 0.6);
  return c;
}
// the face (skin, shading, features) and the hair of the 125.0 s drawing; drawing 2 reuses them under a similarity
function paintFace(g) {
  // ---- face skin (drawn under the hair), the black shadow under the jaw left of it
  fillS(g, FACE, D.skin);
  // shadow side: the far cheek between the cup and the face contour, and a warm band under the hairline
  // (fix pass 2) the far cheek between the cup and the face contour: pink skin at the top (source 218,153,137 at
  // (612–625, 420–450)) darkening into shadowed skin (77,37,27 at (608–616, 480–540)) with two fine strands, not a bar
  {
    const STRIP = [[598, 440], [624, 446], [628, 500], [629, 571], [636, 598], [612, 592], [598, 560]];
    const sg = g.createLinearGradient(0, 440, 0, 500); sg.addColorStop(0, "#d99a88"); sg.addColorStop(0.45, "#a2604f"); sg.addColorStop(1, "#6c3528");
    fillP(g, STRIP, sg);
    hatch(g, STRIP, [596, 450, 632, 600], 1.45, 4, "rgba(40,16,12,0.3)", 1.0, 2713, 30, 0.7);
    ink(g, [[603, 452], [605, 500], [607, 548], [610, 584]], 1.8, "rgba(25,12,10,0.85)", 0.2);
    ink(g, [[616, 458], [619, 510], [622, 560]], 1.4, "rgba(25,12,10,0.7)", 0.2);
  }
  shade(g, FACE, [[520, 330], [640, 300], [760, 330], [700, 380], [640, 420], [600, 452], [522, 450]], D.skinD, 14);
  shade(g, FACE, [[626, 420], [660, 410], [690, 470], [680, 560], [650, 600], [630, 580]], D.skinSh, 14);
  shade(g, FACE, [[700, 380], [760, 340], [800, 345], [790, 430], [740, 450], [700, 440]], D.blush, 14);    // under the upper eye
  shade(g, FACE, [[738, 498], [785, 496], [800, 540], [752, 548]], "rgba(226,140,132,0.35)", 8);                 // round the nose
  shade(g, FACE, [[855, 480], [915, 482], [918, 530], [880, 540], [850, 520]], D.blush, 10);                 // under the lower eye
  shade(g, FACE, [[740, 450], [900, 440], [930, 560], [860, 590], [760, 590], [730, 520]], "rgba(222,150,130,0.3)", 24);
  shade(g, FACE, [[860, 340], [900, 345], [900, 420], [860, 420]], D.skinSh, 10);                           // right temple
  shade(g, FACE, [[700, 590], [800, 575], [830, 588], [760, 600], [703, 606]], D.skinSh, 6);                // along the jaw
  // hatched shading: left cheek, under the upper eye, the right of the lower cheek, nose shade
  hatch(g, FACE, [630, 440, 660, 590], 1.15, 7, "rgba(150,80,70,0.18)", 1.0, 2711, 20, 0.6);
  ticks(g, [742, 380], [5, 2.5], [-6, 22], 7, 1.1, "rgba(160,70,70,0.45)");
  ticks(g, [890, 486], [4.5, 1.5], [-5, 20], 6, 1.1, "rgba(160,70,70,0.45)");
  ticks(g, [770, 486], [5, 1], [-5, 14], 5, 1.0, "rgba(160,70,70,0.35)");
  ticks(g, [686, 554], [5, 2], [8, 14], 5, 1.1, "rgba(140,60,60,0.45)");
  // ---- features: brows, closed eyes with lashes, nose, smile (t4, t7, t8.jpg)
  // upper (his right) eye: lash line, lashes, crease, brow
  // (fix pass 2) the lid line sags (source 125.0: (757,360) (768,384) (781,401) (795,413) (808,425)) and tapers; fine lashes
  ink(g, [[757, 360], [765, 381], [778, 399], [793, 412], [808, 425]], 7.5, INK, 0.12);
  for (const [a, b] of [[[764, 382], [755, 387]], [[769, 390], [760, 396]], [[775, 397], [767, 404]], [[781, 402], [775, 411]], [[788, 407], [783, 416]], [[795, 413], [791, 422]], [[802, 419], [800, 428]]]) ink(g, [a, b], 1.4, "rgba(29,21,19,0.85)", 0.2);
  ink(g, [[748, 366], [753, 376], [758, 384]], 1.4, "rgba(29,21,19,0.6)");
  ink(g, [[782, 360], [791, 364], [799, 369]], 1.4, "rgba(29,21,19,0.5)");
  ink(g, [[823, 351], [838, 364], [850, 380], [859, 400]], 7.5, INK, 0.12);
  ink(g, [[814, 352], [828, 372], [838, 392]], 1.6, "rgba(29,21,19,0.6)");
  // lower (his left) eye: lash line, lashes, brow (ends at the hair, not across it)
  ink(g, [[840, 484], [857, 505], [874, 519], [890, 530]], 9, INK, 0.15);
  for (const [a, b] of [[[850, 500], [841, 507]], [[857, 508], [850, 517]], [[866, 515], [861, 525]], [[876, 521], [873, 532]], [[885, 527], [885, 537]]]) ink(g, [a, b], 2.0);
  ink(g, [[890, 459], [907, 464], [918, 472], [925, 481]], 9, INK, 0.25);
  ink(g, [[842, 474], [856, 480], [870, 486]], 1.3, "rgba(29,21,19,0.5)");
  // nose: the side line down from between the eyes, the tip and nostril, a glint
  ink(g, [[840, 470], [820, 487], [806, 505], [800, 526]], 1.5, "rgba(29,21,19,0.8)");
  ink(g, [[742, 503], [750, 517], [757, 532]], 2.0, "rgba(29,21,19,0.8)");
  ink(g, [[757, 534], [775, 538], [793, 533], [801, 524]], 2.6);
  g.save(); g.filter = "blur(3px)"; g.fillStyle = "rgba(255,245,235,0.3)"; g.beginPath(); g.ellipse(783, 519, 7, 5, 0, 0, 7); g.fill(); g.restore();
  // smile, cheek line, cheek glint
  ink(g, [[677, 497], [686, 514], [703, 537], [720, 554], [737, 571], [756, 581]], 2.6);
  g.fillStyle = INK; g.beginPath(); g.ellipse(677, 497, 3, 4.5, -0.5, 0, 7); g.fill();
  ink(g, [[729, 548], [735, 556]], 1.6, "rgba(29,21,19,0.7)");
  g.save(); g.filter = "blur(2.5px)"; g.fillStyle = "rgba(255,245,235,0.3)"; g.beginPath(); g.ellipse(706, 566, 6, 4, 0.5, 0, 7); g.fill(); g.restore();
  // face contour (left cheek) and the jaw line resting on the wrist
  ink(g, FACE_L, 2.4, INK, 0.5);
  ink(g, JAW, 3.4, INK, 0.4);
  ink(g, [[626, 629], [650, 621], [674, 617], [720, 620]], 1.6, "rgba(29,21,19,0.6)");

}
function paintPhones1(g) {
  // ---- headphones: band down the collar (slider segments), then the cup (in front of the far cheek)
  fillS(g, BAND, D.band);
  shade(g, BAND, [[488, 280], [522, 276], [516, 430], [494, 440]], "#57514e", 8);
  ink(g, [[468, 290], [465, 340], [466, 390], [472, 440]], 3, "#5e5855", 0.4);
  for (const y of [300, 340, 380]) ink(g, [[464, y + 3], [494, y], [528, y - 3]], 1.8, "rgba(20,15,15,0.8)", 0.6);
  ink(g, BAND.concat([BAND[0], BAND[1]]), 2.6, INK, 0.8);
  fillS(g, CUP, D.hp);
  g.save(); sp(g, CUP); g.clip();
  g.beginPath(); g.ellipse(540, 520, 50, 62, 0.1, 0, 7); g.fillStyle = D.hpD; g.fill();
  g.beginPath(); g.ellipse(540, 520, 50, 62, 0.1, 0, 7); g.lineWidth = 2.5; g.strokeStyle = "rgba(20,15,15,0.8)"; g.stroke();
  g.beginPath(); g.ellipse(546, 518, 56, 70, 0.1, -1.3, 0.9); g.lineWidth = 7; g.strokeStyle = D.hpL; g.stroke();
  g.beginPath(); g.ellipse(541, 520, 34, 42, 0.1, 0, 7); g.lineWidth = 2; g.strokeStyle = "rgba(150,140,135,0.7)"; g.stroke();
  for (let k = 0; k < 14; k++) { const a = -0.9 + k * 0.13; ink(g, [[540 + 54 * Math.cos(a), 520 + 66 * Math.sin(a)], [540 + 62 * Math.cos(a), 520 + 74 * Math.sin(a)]], 1.3, "rgba(20,15,15,0.6)"); }
  g.restore();
  ink(g, CUP.concat([CUP[0], CUP[1]]), 3.2, INK, 0.85);

}
function paintHair(g) {
  // ---- hair: the mass, the temple slivers, grey highlights, then the locks over the face
  fillS(g, HAIR, D.hair);
  g.save(); g.filter = "blur(0.8px)"; fillP(g, TEMPLE_A, "#a2695f"); fillP(g, TEMPLE_B, "#d49a88"); g.restore(); fillP(g, TRI_R, D.skinSh);
  for (const h of HAIR_HI) ink(g, h, 2.2, D.hairHi, 0.1);
  g.save(); g.filter = "blur(4px)"; fillP(g, [[528, 400], [606, 392], [610, 446], [560, 450], [528, 446]], "rgba(120,52,44,0.75)"); g.restore();
  for (const [pts, w] of LOCKS) lock(g, pts, w);
  fillP(g, LOCK_1, D.hair); fillP(g, LOCK_2, D.hair);
  // thin grey highlights on the big locks
  ink(g, [[930, 440], [895, 446], [860, 456]], 1.6, D.hairHi, 0.1);
  ink(g, [[940, 548], [905, 558], [870, 570]], 1.5, D.hairHi, 0.1);

}
function paintBeanie1(g) {
  // ---- beanie
  fillS(g, BEANIE, D.beanie);
  shade(g, BEANIE, [[920, 170], [1080, 250], [1080, 470], [990, 420]], D.beanieL, 24);
  shade(g, BEANIE, [[980, 260], [1070, 300], [1060, 420], [1010, 380]], D.beanieLL, 18);
  shade(g, BEANIE, [[640, 230], [760, 245], [900, 310], [990, 470], [960, 480], [880, 330], [760, 262], [640, 250]], D.beanieD, 10);   // under-edge of the cuff
  // knit: ribs across the cuff (normal to the fold, 2 px every ~9.5 px), hatching along the crown
  const F = sampleCurve(FOLD, 10), R = rng(2702);
  g.save(); sp(g, BEANIE); g.clip();
  for (let i = 1; i < F.length - 1; i++) {
    const a = F[i - 1], b = F[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L, len = 70 + 20 * R();
    ink(g, [[F[i][0] + nx * 3, F[i][1] + ny * 3], [F[i][0] + nx * len, F[i][1] + ny * len]], 2.0, "rgba(29,21,19,0.62)", 0.3);
  }
  g.restore();
  g.save(); sp(g, CROWN); g.clip();
  g.globalAlpha = 0.6; fillS(g, [[700, 110], [880, 95], [960, 170], [900, 215], [760, 190], [690, 185]], D.beanieD); g.globalAlpha = 1;
  for (let k = 0; k < 20; k++) {
    const u = k / 19;
    const P = FOLD.map((p) => [p[0] - 70 * u, p[1] - 90 * u]);
    ink(g, P, 1.2, `rgba(29,21,19,${0.28 + 0.18 * R()})`, 0.3);
  }
  g.restore();
  ink(g, FOLD, 3.2);
  ink(g, BEANIE_OUT, 3.8, INK, 0.7);
  ink(g, CUFF_LOW, 2.4, INK, 0.5);

}


// ================================================================ drawing 2: the end orbit (129.0 s view)
// (fix pass 2) The source redraws him as the camera comes round (127.9–128.3): the headphones sit ON his ear, a black
// t-shirt collar shows under his head, his right forearm lies across the desk under his chin with the hand and fingers
// at its left end, the other forearm below it, and his jacket shoulder stands up. Drawing 2 is drawn in frame px of the
// 129.0 s frame (DES2_BOX) and moved by the measured figure track (s27 figH). Outlines were read off 1.4–2.4x gridded
// crops of that frame and a coarse colour-class map of it (snapshots/s27-fix2-meas/e129_*.jpg, cls129.png; JAKCONT
// for the left contour) — positions only; fills, shading, hatching and ink are authored here. The face and hair are the
// 125.0 s drawing's, placed by a similarity fitted to seven face landmarks (eyes, brows, smile; residual <= 10 px).
export const DES2_BOX = { x: -120, y: 130, w: 1400, h: 840, s: 1.1 };
export const HEAD2_SIM = [1.0158, 0.1066, 53.44, -0.1066, 1.0158, 92.32];   // x' = a x + b y + c, y' = d x + e y + f

// the jacket mass: shoulder top (JAKCONT 129.0), back, hem on the desk, the folded near sleeve and its cuff, then up
// along the collar behind the headphone cup and the band
const J2 = [
  [700, 300], [664, 290], [640, 278], [600, 279], [560, 279], [530, 265], [497, 261], [420, 260], [346, 282], [285, 330],
  [240, 388], [205, 440], [173, 493], [146, 542], [123, 592], [100, 644], [68, 700], [20, 760], [-130, 780],
  [-130, 872], [100, 830], [190, 813], [274, 796], [298, 855], [375, 895], [453, 886], [508, 885], [550, 870], [575, 878], [648, 856],
  [662, 832], [667, 783], [660, 716], [646, 688], [625, 672], [600, 664], [585, 650], [592, 610], [600, 570], [590, 545],
  [582, 500], [592, 450], [610, 400], [632, 330], [660, 305],
];
// the hem line across the desk and the underside, darker lower-left back (source 67,73,62 at (60–250, 760–840))
const J2_HEM = [[12, 846], [100, 830], [190, 813], [274, 796]];
// the near (left) sleeve: its upper contour (elbow crease), the cuff's left edge
const J2_SLEEVE_TOP = [[270, 640], [330, 605], [400, 585], [470, 600], [520, 630], [556, 658]];
const J2_CUFF = [[563, 668], [566, 720], [566, 790], [560, 850]];
// the right sleeve beyond his head (source 183,180,150 at (1110–1200, 580–680))
const R2 = [[1096, 540], [1130, 530], [1170, 526], [1205, 548], [1228, 590], [1234, 640], [1222, 690], [1190, 716], [1140, 724], [1100, 716], [1086, 680], [1086, 600]];
// the black t-shirt collar under the head and cup (source 12,5,2 at (600–700, 580–640))
const SHIRT2 = [[585, 560], [640, 572], [700, 586], [760, 604], [806, 622], [800, 648], [740, 652], [680, 656], [630, 660], [592, 646], [580, 600]];
// forearm across the desk under the chin (right arm; hand + fingers at its left end), and the other forearm under it
// (re-read at 2–3x, e129_arms2.jpg / e129_hand.jpg): the top forearm's upper edge meets the jaw, its lower contour
// dips at the wrist crease (850, 712); the lower forearm runs from the cuff to the laptop, its bottom rising to the right
const ARM2A = [[606, 668], [640, 648], [690, 640], [790, 625], [890, 617], [990, 612], [1050, 610], [1075, 620], [1095, 660], [1100, 700], [1090, 722], [1040, 732], [990, 727], [940, 722], [880, 716], [850, 712], [830, 717], [805, 724], [740, 729], [700, 731], [673, 743], [650, 722], [620, 696]];
const ARM2A_LOW = [[673, 743], [700, 731], [740, 729], [805, 724], [830, 717], [850, 712], [880, 716], [940, 722], [990, 727], [1040, 732], [1090, 722]];
const ARM2B = [[668, 745], [740, 733], [805, 727], [880, 720], [990, 731], [1090, 726], [1102, 744], [1050, 751], [1000, 758], [950, 766], [900, 776], [850, 786], [800, 796], [750, 806], [690, 810], [668, 802]];
const ARM2B_LOW = [[668, 802], [690, 810], [750, 806], [800, 796], [850, 786], [900, 776], [950, 766], [1000, 758], [1050, 751], [1102, 744]];
// headphones on the ear: the cup (outer pad ellipse) and the band from the cup's top up over the crown
const CUP2 = { x: 642, y: 505, rx: 71, ry: 84, a: 0.12 };
const BAND2 = [[606, 440], [600, 400], [604, 350], [620, 312], [646, 286], [680, 268], [720, 258], [760, 252], [770, 282], [735, 290], [700, 300], [672, 318], [652, 350], [644, 400], [646, 440]];
// the beanie (outer contour, then the cuff's lower edge back along the hairline) and its crown/cuff fold
const BEANIE2_OUT = [[783, 241], [800, 215], [846, 182], [881, 175], [931, 168], [989, 163], [1060, 161], [1117, 164], [1153, 171], [1181, 193], [1203, 229], [1217, 264], [1225, 291], [1217, 336], [1200, 413], [1183, 469], [1167, 502], [1144, 524], [1124, 538]];
const CUFF2_LOW = [[1128, 536], [1117, 491], [1100, 447], [1078, 402], [1044, 358], [1011, 324], [967, 297], [911, 272], [839, 255], [790, 246]];
const FOLD2 = [[806, 230], [852, 214], [905, 205], [961, 197], [1011, 213], [1061, 240], [1100, 272], [1139, 312], [1172, 358], [1192, 405]];

export function paintDesigner2() {
  const B = DES2_BOX, c = canvas(B.w * B.s, B.h * B.s), g = c.getContext("2d");
  g.scale(B.s, B.s); g.translate(-B.x, -B.y);
  // ---- jacket: lit shoulder and upper arm (160,159,132), the back in shade (76,83,74), the near sleeve (130,130,110)
  fillS(g, J2, "#8e8f78");
  shade(g, J2, [[300, 290], [520, 270], [600, 330], [590, 560], [520, 620], [420, 560], [330, 420]], "#9a9a82", 30);
  shade(g, J2, [[380, 300], [500, 290], [560, 360], [540, 460], [450, 440], [400, 380]], "#a3a18a", 24);
  shade(g, J2, [[-130, 560], [150, 520], [260, 600], [290, 800], [200, 980], [-130, 980]], "#606a58", 40);
  shade(g, J2, [[120, 430], [220, 380], [300, 470], [300, 640], [220, 700], [150, 600]], "#6c7362", 36);
  shade(g, J2, [[-130, 760], [120, 740], [270, 800], [300, 980], [-130, 980]], "#56604e", 30);
  shade(g, J2, [[300, 640], [470, 610], [560, 680], [560, 860], [420, 890], [320, 840]], "#8e8e76", 30);
  shade(g, J2, [[430, 800], [560, 780], [650, 850], [560, 890], [450, 890]], "#707360", 20);
  shade(g, J2, [[230, 770], [420, 790], [520, 880], [380, 905], [260, 870]], "rgba(70,74,62,0.85)", 22);   // (source 86,83,74 at (250–400, 780–880))
  shade(g, J2, [[120, 520], [290, 520], [300, 700], [150, 720]], "rgba(70,78,66,0.5)", 30);
  shade(g, J2, [[560, 560], [620, 480], [660, 560], [620, 640], [580, 640]], "#5f6556", 18);
  hatch(g, J2, [-130, 260, 700, 980], -0.4, 7, "rgba(40,48,38,0.3)", 1.0, 2901, 40, 0.45);
  hatch(g, J2, [-130, 500, 300, 980], 1.1, 6, "rgba(30,36,28,0.3)", 1.0, 2903, 36, 0.5);
  // folds (read at 1.4x, e129_a.jpg): across the shoulder, down the back, the elbow crease, the sleeve's bunching
  const folds = [
    [[330, 300], [390, 290], [450, 300]], [[300, 340], [360, 350], [430, 380]], [[270, 380], [330, 400], [400, 440]],
    [[360, 440], [420, 470], [480, 520]], [[250, 470], [310, 520], [350, 590]], [[210, 560], [230, 640], [240, 720]],
    [[460, 400], [500, 450], [520, 520]], [[520, 330], [550, 420], [560, 500]], [[160, 640], [150, 700], [120, 770]],
    [[330, 520], [400, 540], [460, 580]], [[300, 700], [360, 680], [420, 690]], [[330, 760], [400, 740], [460, 760]],
    [[380, 820], [440, 800], [500, 820]], [[470, 650], [510, 700], [520, 760]], [[520, 780], [560, 800], [600, 800]],
  ];
  for (const f of folds) ink(g, f, 2.2, "rgba(29,21,19,0.75)", 0.15);
  ink(g, J2_SLEEVE_TOP, 2.8, INK, 0.4);
  ink(g, J2_CUFF, 2.6, INK, 0.4);
  ink(g, J2_HEM, 3.0, INK, 0.5);
  // ---- the right sleeve beyond his head
  fillS(g, R2, "#b6b394");
  shade(g, R2, [[1086, 600], [1140, 620], [1150, 720], [1086, 716]], "#9d9c80", 16);
  hatch(g, R2, [1080, 520, 1240, 730], -0.5, 7, "rgba(40,48,38,0.25)", 1.0, 2905, 30, 0.5);
  for (const f of [[[1150, 560], [1180, 600], [1190, 650]], [[1110, 580], [1130, 620], [1140, 680]]]) ink(g, f, 2.0, "rgba(29,21,19,0.7)", 0.2);
  ink(g, R2.slice(0, 10), 3.0, INK, 0.5);
  // ---- collar
  fillS(g, SHIRT2, D.shirt);
  // ---- the lower forearm and its hand, then the forearm under his chin with the hand and fingers
  const band = (pts, dy, col) => fillP(g, pts.concat(pts.slice().reverse().map(([x, y]) => [x, y + dy])), col);
  fillS(g, ARM2B, "#ecccad");
  g.save(); sp(g, ARM2B); g.clip(); g.filter = "blur(4px)";
  band(ARM2B_LOW, -16, "rgba(210,140,120,0.7)");
  band(ARM2A_LOW, 10, "rgba(210,140,120,0.45)");
  g.filter = "none"; g.restore();
  hatch(g, ARM2B, [660, 770, 1100, 810], -0.2, 4, "rgba(150,80,70,0.35)", 1.0, 2911, 22, 0.6);
  fillS(g, ARM2A, "#f0cdae");
  g.save(); sp(g, ARM2A); g.clip(); g.filter = "blur(4px)";
  band(ARM2A_LOW, -14, "rgba(210,135,118,0.7)");
  fillP(g, [[1040, 612], [1100, 626], [1104, 720], [1060, 700]], "rgba(214,150,132,0.4)");
  fillP(g, [[606, 668], [640, 650], [690, 642], [700, 660], [650, 676]], "rgba(214,150,132,0.4)");
  g.filter = "none"; g.restore();
  hatch(g, ARM2A, [680, 700, 1090, 730], -0.1, 4, "rgba(150,80,70,0.4)", 1.0, 2913, 22, 0.7);
  hatch(g, ARM2A, [1030, 630, 1100, 720], 1.2, 5, "rgba(150,80,70,0.3)", 1.0, 2915, 18, 0.7);
  // the top hand's fingers over the cuff (e129_hand.jpg): separations running up-right from the finger tips
  for (const f of [[[650, 663], [673, 653], [700, 648]], [[667, 681], [690, 672], [708, 667]], [[670, 710], [688, 700], [700, 692]], [[673, 740], [690, 728], [702, 720]]]) ink(g, f, 2.0, "rgba(29,21,19,0.9)", 0.3);
  for (const f of [[[690, 652], [712, 650], [733, 648]], [[733, 660], [760, 657]], [[708, 678], [718, 673]], [[830, 684], [842, 692], [855, 696]]]) ink(g, f, 1.3, "rgba(29,21,19,0.6)", 0.3);
  ink(g, [[606, 668], [640, 648], [690, 640], [790, 625]], 2.6, INK, 0.5);
  ink(g, [[606, 668], [614, 684], [632, 697], [650, 712], [673, 743]], 2.4, INK, 0.5);
  ink(g, [[1050, 610], [1075, 620], [1095, 660], [1100, 700], [1090, 722]], 2.8, INK, 0.5);
  // the lower hand's fingers at the cuff
  for (const f of [[[676, 760], [700, 752], [722, 748]], [[678, 782], [702, 774], [722, 770]], [[823, 773], [850, 763]]]) ink(g, f, 1.4, "rgba(29,21,19,0.7)", 0.3);
  ink(g, ARM2B_LOW, 3.0, INK, 0.5);
  ink(g, ARM2A_LOW, 3.2, INK, 0.45);
  ink(g, [[1000, 706], [1030, 709], [1060, 708]], 1.2, "rgba(29,21,19,0.45)", 0.3);
  // ---- the face and hair of the 125.0 s drawing, turned with the head
  g.save(); const S = HEAD2_SIM; g.transform(S[0], S[3], S[1], S[4], S[2], S[5]);
  paintFace(g);
  shade(g, FACE, [[640, 430], [760, 420], [940, 480], [950, 600], [800, 600], [660, 600]], "rgba(226,150,130,0.35)", 24);
  paintHair(g);
  g.restore();
  // ---- beanie
  const BEANIE2 = BEANIE2_OUT.concat(CUFF2_LOW);
  fillS(g, BEANIE2, D.beanie);
  shade(g, BEANIE2, [[1060, 180], [1230, 250], [1230, 470], [1130, 420]], D.beanieL, 24);
  shade(g, BEANIE2, [[1120, 260], [1220, 300], [1210, 430], [1160, 400]], D.beanieLL, 18);
  shade(g, BEANIE2, [[790, 240], [900, 262], [1010, 310], [1100, 440], [1120, 520], [1090, 520], [1000, 340], [900, 280], [790, 256]], D.beanieD, 10);
  {
    const F = sampleCurve(FOLD2, 10), R = rng(2952);
    g.save(); sp(g, BEANIE2); g.clip();
    for (let i = 1; i < F.length - 1; i++) {
      const a = F[i - 1], b = F[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      const nx = -dy / L, ny = dx / L, len = 70 + 20 * R();
      ink(g, [[F[i][0] + nx * 3, F[i][1] + ny * 3], [F[i][0] + nx * len, F[i][1] + ny * len]], 1.8, "rgba(29,21,19,0.55)", 0.3);
    }
    for (let k = 0; k < 16; k++) {
      const u = k / 15;
      ink(g, FOLD2.map((p) => [p[0] - 20 * u, p[1] - 40 * u]), 1.2, `rgba(29,21,19,${0.25 + 0.15 * R()})`, 0.3);
    }
    g.restore();
  }
  ink(g, FOLD2, 3.0);
  ink(g, BEANIE2_OUT, 3.8, INK, 0.7);
  ink(g, CUFF2_LOW, 2.4, INK, 0.5);
  // ---- headphones: the band over the crown (slider segments), the cup on the ear (dark pad ring, face, rings)
  fillS(g, BAND2, D.band);
  shade(g, BAND2, [[612, 440], [610, 360], [640, 300], [700, 272], [740, 266], [690, 300], [650, 360], [640, 440]], "#57514e", 6);
  for (const [a, b] of [[[600, 400], [646, 402]], [[604, 352], [650, 358]], [[622, 312], [664, 330]]]) ink(g, [a, b], 1.8, "rgba(20,15,15,0.85)", 0.6);
  ink(g, BAND2.concat([BAND2[0], BAND2[1]]), 2.6, INK, 0.8);
  const C2 = CUP2;
  g.save(); g.translate(C2.x, C2.y); g.rotate(C2.a);
  g.beginPath(); g.ellipse(0, 0, C2.rx, C2.ry, 0, 0, 7); g.fillStyle = "#3a3534"; g.fill();
  g.beginPath(); g.ellipse(8, 0, C2.rx * 0.72, C2.ry * 0.74, 0, 0, 7); g.fillStyle = "#524b48"; g.fill();
  g.beginPath(); g.ellipse(8, 0, C2.rx * 0.72, C2.ry * 0.74, 0, 0, 7); g.lineWidth = 2.4; g.strokeStyle = "rgba(20,15,15,0.85)"; g.stroke();
  g.beginPath(); g.ellipse(12, 0, C2.rx * 0.46, C2.ry * 0.5, 0, 0, 7); g.lineWidth = 2; g.strokeStyle = "rgba(20,15,15,0.7)"; g.stroke();
  g.beginPath(); g.ellipse(4, 0, C2.rx * 0.86, C2.ry * 0.88, 0, -1.2, 0.8); g.lineWidth = 5; g.strokeStyle = "rgba(140,130,125,0.55)"; g.stroke();
  g.beginPath(); g.ellipse(14, -6, C2.rx * 0.3, C2.ry * 0.3, 0, -1.4, 0.2); g.lineWidth = 3; g.strokeStyle = "rgba(160,150,145,0.5)"; g.stroke();
  g.beginPath(); g.ellipse(0, 0, C2.rx, C2.ry, 0, 0, 7); g.lineWidth = 3.2; g.strokeStyle = INK; g.stroke();
  g.restore();
  // ---- outer contour ink: shoulder and back, the near sleeve's bottom on the desk
  ink(g, J2.slice(0, 19), 3.6, INK, 0.7);
  ink(g, [[270, 800], [298, 855], [375, 895], [453, 886], [508, 885], [550, 870], [575, 878], [648, 856], [662, 832], [667, 783], [660, 716], [646, 688], [625, 672]], 3.6, INK, 0.6);
  return c;
}
