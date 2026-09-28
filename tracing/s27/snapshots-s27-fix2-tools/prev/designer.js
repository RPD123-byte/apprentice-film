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
  skin: "#edc4aa", skinL: "#f3d2ba", skinSh: "#dfab98", skinD: "#cf9584", skinDD: "#a86c5e", blush: "rgba(226,140,132,0.5)",
  arm: "#f0cfac", armSh: "#e0b097",
  hair: "#0c0808", hairHi: "rgba(128,112,112,0.85)",
  hp: "#77706a", hpL: "#a59b92", hpD: "#4a4442", band: "#6e6866", bandL: "#958d88",
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
const SHIRT = [[572, 574], [600, 572], [622, 582], [634, 604], [628, 626], [602, 632], [576, 612]];
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
const HAIR = [[514, 290], [520, 268], [538, 254], [590, 243], [640, 240], [700, 238], [760, 246], [800, 258], [840, 275], [880, 300], [910, 322], [940, 350], [962, 385], [982, 430], [990, 470], [990, 510], [984, 545], [972, 575], [962, 595], [950, 604], [944, 590], [935, 572], [918, 560], [906, 548], [914, 528], [919, 505], [913, 482], [921, 470], [936, 446], [930, 430], [915, 424], [901, 412], [890, 396], [890, 376], [898, 355], [904, 338], [885, 336], [868, 340], [848, 349], [830, 340], [805, 333], [780, 334], [750, 337], [722, 341], [697, 348], [674, 357], [652, 364], [638, 364], [622, 362], [610, 378], [602, 394], [585, 396], [560, 396], [538, 398], [522, 396], [512, 340]];
// skin slivers of the left temple seen through the hair (h1.jpg: x 626–671, y 291–357, crossed by one lock)
const TEMPLE_A = [[628, 297], [650, 291], [668, 295], [646, 306], [629, 309]];
const TEMPLE_B = [[628, 330], [644, 326], [649, 338], [642, 352], [630, 350]];
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
  // down the shadowed far cheek between the cup and the face (t4.jpg: dark locks over x 600–626, y 400–580)
  [[[604, 420], [606, 480], [610, 540], [614, 578]], 9], [[[616, 430], [619, 500], [623, 560]], 7], [[[598, 450], [600, 510], [604, 556]], 6],
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
  // ---- his shadow on the desk under the arms (desk samples at 125.0: #bb9472 in shadow vs #d8bc90 lit)
  g.save(); g.filter = "blur(16px)";
  fillP(g, [[-80, 960], [120, 880], [380, 790], [560, 900], [700, 940], [840, 870], [960, 760], [1070, 720], [1080, 800], [900, 900], [760, 970], [-80, 970]], "rgba(110,62,38,0.32)");
  g.restore();
  // ---- jacket (one mass: back, upper arm, the folded sleeve on the desk, the sleeve round the head)
  fillS(g, JACKET, D.jacket);
  shade(g, JACKET, [[-80, 560], [80, 520], [200, 640], [260, 760], [200, 960], [-80, 990]], D.jacketD, 40);
  shade(g, JACKET, [[-80, 620], [140, 600], [300, 760], [260, 900], [100, 990], [-80, 990]], D.jacketDD, 40);
  shade(g, JACKET, [[-80, 700], [100, 680], [220, 800], [120, 960], [-80, 990]], "#4f574b", 36);
  shade(g, JACKET, [[150, 300], [330, 262], [460, 270], [440, 360], [260, 360], [160, 345]], D.jacketL, 18);
  shade(g, JACKET, [[340, 420], [440, 380], [520, 470], [560, 580], [500, 600], [400, 520]], "rgba(169,167,143,0.55)", 26);
  shade(g, JACKET, [[430, 280], [470, 270], [468, 440], [440, 470], [425, 360]], D.jacketLL, 10);
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
  shade(g, ARM, [[606, 632], [800, 600], [800, 640], [640, 648]], D.armSh, 10);                 // under the jaw
  shade(g, ARM, [[800, 676], [960, 690], [940, 715], [820, 700]], "rgba(200,140,125,0.7)", 8);   // between the hands
  shade(g, ARM, [[880, 600], [958, 612], [965, 660], [930, 640]], D.armSh, 12);                  // by the right sleeve
  shade(g, ARM, [[826, 735], [900, 745], [880, 760], [830, 752]], D.armSh, 8);
  // hand: finger / knuckle lines, the hand's lower contour, its right edge; the left hand's inner line and bottom
  ink(g, [[808, 641], [817, 653], [812, 666]], 2.2);
  ink(g, [[817, 653], [850, 666], [892, 671]], 2.4, "rgba(29,21,19,0.8)");
  ink(g, [[917, 641], [940, 645], [958, 649]], 1.4, "rgba(29,21,19,0.5)");
  ink(g, [[845, 628], [870, 634], [895, 634]], 1.2, "rgba(29,21,19,0.35)");
  ink(g, [[798, 674], [850, 682], [892, 687], [954, 692]], 3.4, INK, 0.5);
  ink(g, [[954, 692], [966, 670], [963, 638], [950, 618]], 2.6);
  ink(g, [[867, 703], [892, 712], [908, 724], [900, 745]], 2.2);
  ink(g, [[832, 746], [867, 733], [900, 720], [928, 713]], 2.6);
  ink(g, [[852, 752], [870, 748], [886, 742]], 1.6, "rgba(29,21,19,0.6)");
  // the left forearm's sleeve over the wrist and the hands
  fillS(g, SLEEVE_L, D.jacket);
  shade(g, SLEEVE_L, [[640, 700], [760, 690], [800, 740], [790, 830], [680, 840]], D.jacketL, 30);
  shade(g, SLEEVE_L, [[560, 700], [610, 690], [640, 800], [600, 860], [560, 840]], D.jacketD, 22);
  shade(g, SLEEVE_L, [[650, 650], [760, 662], [800, 690], [760, 700], [660, 690]], D.jacketL, 12);
  for (const f of [[[622, 640], [620, 700], [625, 760]], [[650, 655], [665, 690], [680, 720]], [[700, 662], [706, 710], [705, 760]], [[735, 700], [742, 730], [740, 760]],
    [[680, 820], [710, 800], [740, 790]], [[760, 690], [780, 740], [790, 800]]]) ink(g, f, 2.2, "rgba(29,21,19,0.8)", 0.15);
  ink(g, [[606, 628], [625, 625], [642, 637], [675, 649], [725, 654], [775, 666], [796, 678], [808, 695], [817, 716], [825, 745], [827, 778]], 3.0, INK, 0.5);

  // ---- face skin (drawn under the hair), the black shadow under the jaw left of it
  fillS(g, SHIRT, D.shirt);
  fillS(g, FACE, D.skin);
  // shadow side: the far cheek between the cup and the face contour, and a warm band under the hairline
  fillP(g, [[600, 448], [622, 452], [626, 500], [627, 571], [634, 596], [614, 590], [600, 560]], "#7e4d42");
  hatch(g, [[600, 448], [622, 452], [626, 500], [627, 571], [634, 596], [614, 590], [600, 560]], [596, 440, 640, 600], 1.35, 5, "rgba(25,12,10,0.7)", 1.6, 2713, 40, 0.9);
  shade(g, FACE, [[520, 330], [640, 300], [760, 330], [700, 380], [640, 420], [600, 452], [522, 450]], D.skinD, 14);
  shade(g, FACE, [[626, 420], [660, 410], [690, 470], [680, 560], [650, 600], [630, 580]], D.skinSh, 14);
  shade(g, FACE, [[700, 380], [760, 340], [800, 345], [790, 430], [740, 450], [700, 440]], D.blush, 14);    // under the upper eye
  shade(g, FACE, [[738, 498], [785, 496], [800, 540], [752, 548]], "rgba(226,140,132,0.35)", 8);                 // round the nose
  shade(g, FACE, [[855, 480], [915, 482], [918, 530], [880, 540], [850, 520]], D.blush, 10);                 // under the lower eye
  shade(g, FACE, [[860, 340], [900, 345], [900, 420], [860, 420]], D.skinSh, 10);                           // right temple
  shade(g, FACE, [[700, 590], [800, 575], [830, 588], [760, 600], [703, 606]], D.skinSh, 6);                // along the jaw
  // hatched shading: left cheek, under the upper eye, the right of the lower cheek, nose shade
  hatch(g, FACE, [626, 430, 690, 600], 1.15, 5, "rgba(150,80,70,0.45)", 1.0, 2711, 22, 0.8);
  ticks(g, [742, 380], [5, 2.5], [-6, 22], 7, 1.1, "rgba(160,70,70,0.45)");
  ticks(g, [890, 486], [4.5, 1.5], [-5, 20], 6, 1.1, "rgba(160,70,70,0.45)");
  ticks(g, [770, 486], [5, 1], [-5, 14], 5, 1.0, "rgba(160,70,70,0.35)");
  ticks(g, [686, 554], [5, 2], [8, 14], 5, 1.1, "rgba(140,60,60,0.45)");
  // ---- features: brows, closed eyes with lashes, nose, smile (t4, t7, t8.jpg)
  // upper (his right) eye: lash line, lashes, crease, brow
  ink(g, [[756, 356], [767, 377], [781, 398], [794, 414], [806, 426]], 10, INK, 0.15);
  for (const [a, b] of [[[764, 378], [754, 384]], [[770, 388], [760, 396]], [[778, 397], [769, 406]], [[787, 406], [780, 416]], [[796, 415], [791, 425]], [[803, 423], [800, 432]]]) ink(g, [a, b], 2.2);
  ink(g, [[748, 366], [753, 376], [758, 384]], 1.4, "rgba(29,21,19,0.6)");
  ink(g, [[782, 360], [791, 364], [799, 369]], 1.4, "rgba(29,21,19,0.5)");
  ink(g, [[821, 347], [835, 366], [847, 386], [859, 403]], 11, INK, 0.2);
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
  g.save(); g.filter = "blur(3px)"; g.fillStyle = "rgba(255,245,235,0.8)"; g.beginPath(); g.ellipse(783, 519, 7, 5, 0, 0, 7); g.fill(); g.restore();
  // smile, cheek line, cheek glint
  ink(g, [[677, 497], [686, 514], [703, 537], [720, 554], [737, 571], [756, 581]], 2.6);
  g.fillStyle = INK; g.beginPath(); g.ellipse(677, 497, 3, 4.5, -0.5, 0, 7); g.fill();
  ink(g, [[729, 548], [735, 556]], 1.6, "rgba(29,21,19,0.7)");
  g.save(); g.filter = "blur(2.5px)"; g.fillStyle = "rgba(255,245,235,0.7)"; g.beginPath(); g.ellipse(706, 566, 6, 4, 0.5, 0, 7); g.fill(); g.restore();
  // face contour (left cheek) and the jaw line resting on the wrist
  ink(g, FACE_L, 2.4, INK, 0.5);
  ink(g, JAW, 3.4, INK, 0.4);
  ink(g, [[626, 629], [650, 621], [674, 617], [720, 620]], 1.6, "rgba(29,21,19,0.6)");

  // ---- headphones: band down the collar (slider segments), then the cup (in front of the far cheek)
  fillS(g, BAND, D.band);
  shade(g, BAND, [[480, 270], [528, 270], [520, 440], [490, 450]], D.hp, 6);
  for (const y of [300, 335, 370, 400, 428]) ink(g, [[466, y + 4], [492, y], [524, y - 4]], 1.6);
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

  // ---- hair: the mass, the temple slivers, grey highlights, then the locks over the face
  fillS(g, HAIR, D.hair);
  fillP(g, TEMPLE_A, "#a86e62"); fillP(g, TEMPLE_B, "#b67c6c"); fillP(g, TRI_R, D.skinSh);
  for (const h of HAIR_HI) ink(g, h, 2.2, D.hairHi, 0.1);
  for (const [pts, w] of LOCKS) lock(g, pts, w);
  fillP(g, LOCK_1, D.hair); fillP(g, LOCK_2, D.hair);
  // thin grey highlights on the big locks
  ink(g, [[930, 440], [895, 446], [860, 456]], 1.6, D.hairHi, 0.1);
  ink(g, [[940, 548], [905, 558], [870, 570]], 1.5, D.hairHi, 0.1);

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

  // ---- outer contour ink (back, sleeve on the desk, the right sleeve)
  ink(g, BACK.slice(1), 3.6, INK, 0.7);
  ink(g, SLEEVE_LOW, 3.8, INK, 0.7);
  ink(g, HEM.slice(0, 5), 3.0, INK, 0.6);
  ink(g, SLEEVE_R.concat([[880, 718]]), 3.4, INK, 0.7);
  ink(g, [[944, 548], [958, 575], [966, 610], [968, 645], [962, 680], [946, 700], [920, 708]], 2.6, INK, 0.6);
  return c;
}
