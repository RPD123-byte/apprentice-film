// s05 hands: the left hand curled on the keys, the right hand at the trackpad (index finger out on the pad, the thumb
// under it, the other three fingers curled under the palm). Each is its own small plate so it can shift per frame.
// Traced on the source at 24.80 s: outlines from luminance runs, every ink line from a skeleton of the source's dark
// lines (snapshots/s05-fix1-study/lines.py -> lines-rh.jpg, lines-lh.jpg) and 2.4–4x crops (t-rh.jpg, t-lhf.jpg).
import { rng, taper, poly, blob, lin, curve, stroke, inside, clearO, sampleCurve, PI } from "./kit.js";
import * as T from "./trace.js";

const INKD = "#0b0b0b";

export const LHAND_BOX = [560, 620, 340, 290];     // x, y, w, h (frame px) of the left hand's plate
export const RHAND_BOX = [820, 590, 400, 200];

// a tapered grey hatch stroke (3+ points so the taper has a body)
function hatchStroke(o, a, b, w, color, bend = 0) {
  const m = [(a[0] + b[0]) / 2 - (b[1] - a[1]) * bend, (a[1] + b[1]) / 2 + (b[0] - a[0]) * bend];
  taper(o, sampleCurve([a, m, b], 4), (u) => w * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.05))), 0.6), color);
}

// ---------------------------------------------------------------- left hand
// the fingers seen from the back, curled down onto the keys: index (F1) and middle (F2) show as knuckle mounds at
// the top, the ring finger (F3) curls down at the left, the little finger (F4) lies out to the left along the keys
const LH_GAP34 = [[633, 722], [648, 723], [664, 726], [680, 731], [688, 736], [676, 739], [656, 737], [640, 733], [631, 728]];
const LH_GAP23 = [[660, 676], [672, 680], [686, 688], [700, 695], [712, 701], [704, 703], [688, 697], [672, 689], [660, 682]];
const LH_GAP12 = [[713, 660], [720, 667], [732, 673], [748, 676], [756, 679], [744, 681], [728, 678], [716, 671]];
export function paintLeftHand(P) {
  const o = P.o, r = rng(501);
  const H = T.S_LHAND;
  // base: pale skin, the back of the hand a touch darker toward the wrist and the heel (source region mean ~135
  // over 600–720 x 720–800 with the finger gaps and keys)
  P.fill(blob(H), lin(640, 660, 860, 840, [[0, 0.8], [0.5, 0.78], [1, 0.72]]), 0.9, { style: 2 });
  // the heel and the undersides of the fingers turn from the screen: soft grey
  P.light(blob([[604, 752], [630, 759], [660, 768], [700, 786], [740, 806], [772, 828], [795, 850], [780, 855], [740, 826], [700, 803], [650, 782], [608, 765]]), 0.56, "source-over", 0.8);
  P.light(blob([[628, 700], [640, 714], [660, 722], [680, 728], [660, 732], [636, 728]]), 0.6, "source-over", 0.5);
  // the dark gaps between the fingers (keys show through)
  P.fill(blob(LH_GAP34), 0.05, 0, { style: 2 });
  for (const g of [LH_GAP23, LH_GAP12]) P.light(blob(g), 0.45, "source-over", 0.5);
  // finger outlines: each mound's top edge (fine), the creases under them (heavy, tapering)
  curve(o, [[716, 657], [728, 648], [744, 645], [760, 650], [772, 662]], 1.6, INKD, 511);                   // F1 top
  curve(o, [[664, 672], [672, 662], [688, 655], [704, 655], [716, 660]], 1.6, INKD, 512);                   // F2 top
  curve(o, [[632, 712], [631, 700], [638, 692], [652, 686], [662, 684]], 1.8, INKD, 513);                   // F3 left edge
  curve(o, [[598, 748], [604, 739], [616, 734], [632, 731], [648, 732]], 1.8, INKD, 514);                   // F4 top
  curve(o, [[713, 660], [722, 668], [736, 674], [752, 677], [760, 680]], 2.6, INKD, 515, { ends: 0.2 });    // F1 | F2
  curve(o, [[660, 677], [676, 683], [692, 691], [712, 701]], 2.6, INKD, 516, { ends: 0.2 });               // F2 | F3
  curve(o, [[632, 723], [650, 724], [668, 728], [686, 736]], 2.4, INKD, 517, { ends: 0.25 });              // F3 | F4
  // the nails of the curled ring finger and the little finger
  for (const [x, y, a] of [[636, 719, 0.9], [602, 744, 0.2]]) {
    o.save(); o.translate(x, y); o.rotate(a);
    o.fillStyle = "rgba(236,234,228,0.9)"; o.strokeStyle = "rgba(20,20,20,0.8)"; o.lineWidth = 1.1;
    o.beginPath(); o.ellipse(0, 0, 6, 3.6, 0, 0, 7); o.fill(); o.stroke(); o.restore();
  }
  // knuckle wrinkles
  for (const [pts, w] of [[[[733, 661], [740, 666], [749, 668]], 1.2], [[[745, 657], [752, 662]], 1.0], [[[688, 680], [696, 686], [704, 690]], 1.3], [[[686, 668], [694, 672]], 1.0], [[[644, 700], [650, 706], [652, 714]], 1.2], [[[616, 739], [620, 745]], 1.0]]) curve(o, pts, w, "rgba(24,24,24,0.7)", 520);
  // tendons and knuckle hatching on the back of the hand: grey strokes running from the wrist to the knuckles
  for (const [a, b] of [[[846, 790], [768, 672]], [[830, 800], [738, 676]], [[812, 806], [706, 690]], [[792, 812], [676, 712]], [[772, 812], [652, 742]]]) {
    for (let k = 0; k < 6; k++) {
      const f0 = 0.08 + r() * 0.55, f1 = Math.min(0.98, f0 + 0.12 + r() * 0.22), ox = (r() - 0.5) * 16, oy = (r() - 0.5) * 16;
      const p0 = [a[0] + (b[0] - a[0]) * f0 + ox, a[1] + (b[1] - a[1]) * f0 + oy], p1 = [a[0] + (b[0] - a[0]) * f1 + ox, a[1] + (b[1] - a[1]) * f1 + oy];
      hatchStroke(o, p0, p1, 1.4 + r() * 1.6, `rgba(70,70,68,${(0.3 + 0.25 * r()).toFixed(2)})`, (r() - 0.5) * 0.1);
    }
  }
  // a couple of veins
  curve(o, [[760, 706], [752, 716], [756, 728], [748, 740]], 1.1, "rgba(30,30,30,0.6)", 541);
  curve(o, [[722, 724], [716, 734], [722, 746]], 1.0, "rgba(30,30,30,0.5)", 542);
  // heel: short hatch strokes along the lower edge
  for (let i = 0; i < 22; i++) { const f = i / 21, x = 650 + f * 150, y = 770 + f * 74; hatchStroke(o, [x, y - 1], [x - 5, y - 14 - r() * 12], 1.3, "rgba(40,40,40,0.5)"); }
  // outline: right edge down to the sleeve, and the lower edge
  curve(o, [[771, 662], [789, 671], [806, 690], [822, 707], [843, 728], [856, 750], [864, 776], [870, 796], [880, 810]], 2.4, INKD, 556);
  curve(o, [[598, 750], [606, 755], [634, 756], [652, 764], [671, 772], [701, 800], [740, 812], [770, 832], [795, 852], [806, 872]], 2.6, INKD, 557);
}

// ---------------------------------------------------------------- right hand
// outline at 24.80 (luminance runs): the index finger's upper edge, the top of the hand, the cuff, the lower edge
// round the thumb back to the index fingertip
const RH = [[842, 709], [848, 700], [866, 689], [891, 679], [907, 671], [918, 662], [930, 650], [938, 636], [945, 626], [960, 621], [989, 612], [1010, 604], [1030, 600], [1046, 601], [1066, 609], [1085, 619], [1110, 628], [1149, 641], [1178, 647], [1172, 690], [1166, 728], [1150, 731], [1100, 739], [1065, 745], [1033, 746], [1007, 743], [981, 747], [943, 747], [931, 745], [916, 741], [905, 735], [893, 731], [879, 731], [866, 729], [852, 723], [843, 716]];
// the curled middle, ring and little fingers: a knuckle mass tucked under the palm (lines-rh L6, L7, L16, L20, L30)
const POCKET = [[938, 674], [945, 681], [961, 680], [987, 671], [997, 673], [1015, 682], [1019, 697], [1007, 706], [996, 708], [983, 712], [963, 711], [949, 701], [943, 687]];
export function paintRightHand(P) {
  const o = P.o, r = rng(551);
  P.fill(poly(RH), lin(900, 620, 1180, 740, [[0, 0.84], [0.6, 0.83], [1, 0.79]]), 0.1, { style: 2 });
  // the lower half of the back of the hand turns from the screen: a soft grey band above the lower edge
  P.light(poly([[960, 728], [1060, 724], [1160, 712], [1166, 728], [1100, 739], [1033, 746], [960, 747]]), 0.66, "source-over", 0.6);
  // ---- the curled fingers: three knuckle masses, dark creases between them, shading on their far side
  P.fill(poly(POCKET), 0.74, 0.3, { style: 2 });
  P.light(poly([[949, 701], [963, 711], [983, 712], [996, 708], [990, 697], [970, 694], [952, 690]]), 0.48, "source-over", 0.6);
  P.light(poly([[961, 681], [987, 672], [1000, 676], [990, 690], [970, 690]]), 0.84, "source-over", 0.7);
  curve(o, [[938, 674], [945, 681], [961, 680], [987, 671], [997, 673], [1015, 682], [1019, 697]], 2.0, INKD, 552);   // top of the knuckles
  curve(o, [[944, 682], [943, 690], [949, 701], [962, 711], [983, 712], [996, 708], [1007, 706], [1019, 699]], 2.2, INKD, 553);
  curve(o, [[977, 676], [979, 682], [977, 688], [966, 691]], 1.5, INKD, 554);                                          // crease between knuckles
  curve(o, [[979, 688], [990, 695], [996, 706]], 1.5, INKD, 555);
  curve(o, [[996, 690], [1004, 694], [1012, 700]], 1.2, "rgba(20,20,20,0.7)", 556);
  // hatching fanned round the knuckles (their far side, t-rh.jpg)
  for (let i = 0; i < 16; i++) { const a = -1.3 + i * 0.1 + (r() - 0.5) * 0.08, x = 1016 + Math.cos(a) * 6, y = 690 + Math.sin(a) * 18; hatchStroke(o, [x, y], [x + Math.cos(a) * (12 + r() * 10), y + Math.sin(a) * (12 + r() * 10)], 1.1, "rgba(40,40,40,0.55)"); }
  for (let i = 0; i < 10; i++) { const x = 956 + r() * 50, y = 666 + r() * 8; hatchStroke(o, [x, y], [x + 3, y - 10 - r() * 6], 1.0, "rgba(40,40,40,0.45)"); }
  // ---- the index finger: its lower edge over the thumb, the nail at the tip, knuckle wrinkles
  curve(o, [[939, 687], [925, 700], [913, 710], [898, 724], [891, 728], [879, 731]], 2.2, INKD, 571);
  o.save(); o.translate(856, 716); o.rotate(-0.45);
  o.fillStyle = "rgba(238,236,230,0.95)"; o.strokeStyle = "rgba(20,20,20,0.85)"; o.lineWidth = 1.3;
  o.beginPath(); o.ellipse(0, 0, 9, 5.5, 0, 0, 7); o.fill(); o.stroke(); o.restore();
  for (const pts of [[[893, 660], [906, 661], [912, 666]], [[912, 657], [918, 655], [926, 652]], [[902, 668], [910, 672]]]) curve(o, pts, 1.1, "rgba(24,24,24,0.7)", 572);
  hatchStroke(o, [868, 722], [896, 726], 3, "rgba(110,110,108,0.5)");
  // ---- the thumb: its top edge from the knuckles out to the tip, the nail
  curve(o, [[962, 711], [946, 715], [932, 723], [920, 728], [906, 732]], 1.9, INKD, 573);
  o.save(); o.translate(940, 732); o.rotate(0.05);
  o.fillStyle = "rgba(222,220,214,0.6)"; o.strokeStyle = "rgba(20,20,20,0.8)"; o.lineWidth = 1.2;
  o.beginPath(); o.roundRect(-10, -8, 20, 16, 5); o.fill(); o.stroke(); o.restore();
  curve(o, [[970, 723], [974, 732], [972, 740]], 1.1, "rgba(24,24,24,0.6)", 574);
  // ---- back of the hand: tendons from the knuckles toward the wrist, a vein, hatching along the lower edge
  for (const [a, b] of [[[990, 618], [1150, 650]], [[1000, 640], [1150, 672]], [[1012, 662], [1150, 694]], [[1030, 690], [1150, 712]]]) {
    for (let k = 0; k < 4; k++) {
      const f0 = 0.1 + r() * 0.5, f1 = Math.min(0.95, f0 + 0.15 + r() * 0.2), ox = (r() - 0.5) * 12, oy = (r() - 0.5) * 8;
      hatchStroke(o, [a[0] + (b[0] - a[0]) * f0 + ox, a[1] + (b[1] - a[1]) * f0 + oy], [a[0] + (b[0] - a[0]) * f1 + ox, a[1] + (b[1] - a[1]) * f1 + oy], 1.2 + r() * 1.4, `rgba(80,80,78,${(0.3 + 0.2 * r()).toFixed(2)})`);
    }
  }
  curve(o, [[1074, 669], [1079, 667], [1082, 672], [1078, 677], [1080, 682]], 1.2, "rgba(30,30,30,0.75)", 575);
  for (let i = 0; i < 26; i++) { const x = 975 + r() * 180, y = 728 + (x - 975) * -0.06 + r() * 10; hatchStroke(o, [x, y], [x + 4, y + 8 + r() * 6], 1.0, "rgba(40,40,40,0.5)"); }
  // ---- outline
  curve(o, [[842, 709], [848, 700], [866, 689], [891, 679], [907, 671], [918, 662], [930, 650], [938, 636], [945, 626], [960, 621], [989, 612], [1010, 604], [1030, 600], [1046, 601], [1066, 609], [1085, 619], [1110, 628], [1149, 641], [1176, 647]], 2.3, INKD, 593);
  curve(o, [[1164, 729], [1100, 739], [1065, 745], [1033, 746], [1007, 743], [981, 747], [943, 747], [931, 745], [916, 741], [905, 735], [893, 731], [879, 731], [866, 729], [852, 723], [843, 716], [842, 709]], 2.3, INKD, 594);
}

export const LHAND_MASK = [(c) => blob(T.S_LHAND)(c)];
export const RHAND_MASK = [(c) => poly(RH)(c)];
