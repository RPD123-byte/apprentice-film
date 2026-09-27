// s17's own repaint of the designer inside the sōko page (fix pass 1). The page is F1's (sites.js / sokoIll.js); this
// shot builds it layer by layer (s17/page.js) and paints these layers itself instead of F1's: the head (hair, eyes,
// sweat, face shading), the headphones round his neck, the shirt with the laptop's light blooming on his face, neck
// and chest, the trousers and the boots. Measured on labelled 3–8x crops of the source's owl-free plate (median of
// 48.8–50.4 s), light matched on σ4 value maps; everything is drawn in code (paths, strokes, carved lines).
// Page coordinates. Helpers are s17/kit.js (a copy of F1's drawing helpers).
import {
  PI, TAU, clamp, lerp, grey, polyPath, bboxOf, S, ELL, blurDraw, carve, streams, guideField, clothPaint, licPaint, ink, fill, fillSoft,
  dot, ring, lgrad, softLine, softEll, skinGrain, taper, smoothPath, sampleCurve, rng, sstep, edge, dark,
} from "./kit.js";
import { HAIR_OVER } from "./hair_data.js";

// ======================================================================================
// the head
// ======================================================================================
// (fix pass 2) the reviewer's narrower jaw (5–6 px in on his left) was tried and measured worse: the plate's cheek there
// is lit up to x ~1118 (jaw box graded mean 113 against the plate's 138 with it)
const FACE = [[1019, 262], [1030, 252], [1050, 246], [1072, 244], [1095, 246], [1114, 252], [1124, 262], [1123.5, 290], [1123.2, 306], [1123.2, 322.5], [1121.2, 332.2], [1118, 339.5], [1109.2, 351.8], [1092.2, 370.2], [1086, 375.2], [1081.2, 377.2], [1068.2, 378], [1060.8, 375], [1033.5, 350.2], [1026.5, 342], [1022, 333.2], [1018.5, 303.5], [1018.5, 285]];
export const EYE = {
  // (fix pass 1) the openings are ~1.5 px taller than F1's (the source's upper lids arch to y ~279.5 / 278.5)
  // (fix pass 2, 8x on the plate) the lash lines sit ~3 px lower than pass 1's (y ~283 at the left eye's middle, ~282 at
  // the right's), under a heavy grey lid fold up to the crease; the lower lids ~1.5 px lower
  L: { up: [[1022.4, 287], [1027, 284], [1033, 282.6], [1041, 282.8], [1048.4, 284.2], [1052.8, 287.2]], lo: [[1052.8, 287.2], [1047, 291.2], [1036, 292.2], [1026, 290.8], [1022.4, 287]],
    crease: [[1022.6, 277.4], [1029, 274.4], [1036, 273.2], [1044, 273.8], [1050.8, 276.2]], brow: [[1024, 268.5], [1031, 266.4], [1040, 265.6], [1048, 266.2], [1054, 268.2]] },
  R: { up: [[1084.4, 287.2], [1089, 283.8], [1096, 282.2], [1104, 282.2], [1111, 283.4], [1116.6, 287.6]], lo: [[1116.6, 287.6], [1110, 291.4], [1098, 292], [1089, 291], [1084.4, 287.2]],
    crease: [[1083, 275.6], [1090, 273.2], [1098, 272.4], [1106, 273], [1113.5, 276.8]], brow: [[1083, 273.2], [1090.7, 269.4], [1100.7, 268], [1109, 268.8], [1116.5, 271.4]] },
};
// the irises (gaze "owl": hard to his right, toward the owl): F1's, re-checked on the plate (darkest point of each eye
// at σ2: (1030, 284) / (1094, 283))
const IRIS = { L: [1031.5, 287.2], R: [1093.8, 286.8] };

function strandsSide(g, roots, seed, { v0 = 0.02, hi = 0.3 } = {}) {
  // tapered hair strands: [root, mid, tip, width]; a near-black strand with a thin grey highlight along one side
  const r = rng(seed);
  for (const [a, m, b, w] of roots) {
    const q = sampleCurve([a, m, b], 8);
    taper(g, q, (u) => w * Math.pow(1 - u, 0.8) + 0.4, grey(v0 + r() * 0.03));
    if (r() < 0.7) {
      const off = (r() - 0.3) * w * 0.3, k = 0.45 + r() * 0.4;
      const hq = q.slice(0, Math.max(2, Math.round(q.length * k))).map((p, i, arr) => {
        const a2 = arr[Math.max(0, i - 1)], b2 = arr[Math.min(arr.length - 1, i + 1)], d = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) || 1;
        return [p[0] - (b2[1] - a2[1]) / d * off, p[1] + (b2[0] - a2[0]) / d * off];
      });
      taper(g, hq, (u) => (0.5 + r() * 0.5) * (1 - u), grey(hi * (0.6 + r() * 0.6), 0.85));
    }
  }
}

export function paintHead(g) {
  // ---- hair behind: two side masses round the face (the source's hair ends at the jaw, it does not hang to the
  //      shoulders and does not continue under the chin) ----
  const HL = [[998, 249], [991, 262], [988, 280], [988, 300], [990, 318], [993, 334], [997, 347], [1003, 357], [1011, 362], [1020, 356], [1025, 342], [1025, 318], [1022, 290], [1020, 266], [1012, 252]];
  const HR = [[1146, 248], [1149, 262], [1150.5, 282], [1150, 302], [1147, 321], [1143, 338], [1136, 350], [1127, 355], [1120, 348], [1118, 326], [1120, 300], [1123, 274], [1128, 255]];
  fill(g, S(HL, true), "#040404"); fill(g, S(HR, true), "#040404");
  // ---- ears ----
  fill(g, S([[1008, 308], [1012, 305], [1017, 307], [1018, 316], [1014, 322], [1010, 318]], true), grey(0.4));
  softLine(g, [[1010, 310], [1014, 309], [1015, 315]], 1.1, grey(0.22), 0.5);
  fill(g, S([[1126, 306], [1131, 303], [1135, 306], [1134, 315], [1130, 319], [1126, 314]], true), grey(0.46));
  softLine(g, [[1129, 307], [1132, 310], [1130, 315]], 1.0, grey(0.3), 0.5);
  // ---- neck: lit by the screen from below (the source's throat is bright: ~0.8 pre-grade), shade under the jaw ----
  const NECK = [[1038, 352], [1106, 352], [1110, 400], [1106, 430], [1040, 430], [1034, 400]];
  fill(g, S(NECK, true), grey(0.86));
  g.save(); g.beginPath(); smoothPath(g, NECK, true); g.clip();
  softEll(g, 1072, 418, 34, 24, 0, grey(0.95), 9);
  softEll(g, 1042, 366, 11, 13, 0, grey(0.3), 5); softEll(g, 1104, 364, 11, 14, 0, grey(0.24), 5);
  softLine(g, [[1048, 370], [1060, 377], [1084, 377], [1096, 370]], 4, grey(0.5, 0.75), 2.5);
  softLine(g, [[1052, 382], [1072, 384], [1092, 382]], 4, grey(0.55, 0.6), 2.5);
  g.restore();
  // ---- the face ----
  fill(g, S(FACE, false), grey(0.9));
  g.save(); g.beginPath(); polyPath(g, FACE); g.clip();
  // the beanie's and the bangs' shadow over the forehead
  g.fillStyle = lgrad(g, 0, 244, 0, 284, [[0, 0.3], [0.3, 0.5], [0.7, 0.74], [1, 0.9]]); g.fillRect(1010, 240, 120, 44);
  // (fix pass 1) the face is modelled, not flat: the left cheek darkens toward the hair (x < 1032), the right side of
  // the face is in shade (x > 1106), the jaw turns under into shade, a hollow under each cheekbone
  softLine(g, [[1019, 292], [1020, 318], [1025, 338], [1036, 353], [1050, 366], [1064, 377]], 4, grey(0.66, 0.45), 3);
  softLine(g, [[1125, 292], [1124, 318], [1120, 338], [1106, 356], [1088, 374]], 6, grey(0.62, 0.6), 4);
  softLine(g, [[1112, 302], [1113, 320], [1109, 338]], 6, grey(0.74, 0.45), 4);
  softLine(g, [[1058, 376], [1072, 379], [1086, 376]], 10, grey(0.66, 0.6), 3);
  // (fix pass 1) the jaw on his right (our left) turns into shade from under the ear to the chin; the upper face is a
  // little greyer than the laptop-lit lower face; fine pencil hatching in the shaded zones (the source's face is
  // shaded with fine lines, not smooth)
  softLine(g, [[1022, 322], [1030, 342], [1044, 358], [1060, 370]], 7, grey(0.62, 0.6), 4);
  g.fillStyle = lgrad(g, 0, 250, 0, 330, [[0, "rgba(0,0,0,0.1)"], [1, "rgba(0,0,0,0)"]]); g.fillRect(1010, 250, 120, 80);
  { const r = rng(861);
    for (const [bx, by, bw, bh, n, ang, a] of [[1020, 296, 16, 50, 18, 1.1, 0.12], [1104, 296, 18, 48, 18, 1.9, 0.14], [1030, 340, 40, 30, 20, 0.9, 0.16], [1026, 292, 28, 10, 10, 0.2, 0.16], [1090, 292, 28, 10, 10, 2.9, 0.16]]) {
      for (let i = 0; i < n; i++) { const x = bx + r() * bw, y = by + r() * bh, L = 3 + r() * 4, an = ang + (r() - 0.5) * 0.3;
        ink(g, [[x, y], [x + Math.cos(an) * L, y + Math.sin(an) * L]], 0.5 + r() * 0.3, grey(0.3, a * (0.6 + r() * 0.6)), { seed: 870 + i, ends: 0.2, jit: 0 }); }
    } }
  // eye sockets: dark tired bags under both eyes, grey at the inner corners and in the lid creases
  softEll(g, 1037, 294.5, 14, 4.4, 0.04, grey(0.42, 0.85), 2.4);
  softEll(g, 1101, 294, 14, 4.2, -0.03, grey(0.4, 0.85), 2.4);
  softEll(g, 1110, 297, 9, 5, 0.3, grey(0.44, 0.6), 3);
  softEll(g, 1028, 296, 8, 4, -0.3, grey(0.46, 0.55), 3);
  softEll(g, 1057, 287, 5, 9, 0, grey(0.46, 0.8), 2.5);
  softEll(g, 1082, 285, 5, 10, 0, grey(0.4, 0.85), 2.5);
  softEll(g, 1036, 273.5, 15, 2.6, 0, grey(0.5, 0.7), 1.4);
  softEll(g, 1099, 273, 15, 2.6, 0, grey(0.46, 0.7), 1.4);
  // nose: the bridge's shaded left side, shade under the tip
  softLine(g, [[1063, 300], [1062.5, 310], [1062, 320]], 2.6, grey(0.74, 0.7), 1.4);
  softLine(g, [[1057, 306], [1058, 314], [1059, 321]], 1.6, grey(0.7, 0.7), 0.8);
  softLine(g, [[1080.5, 302], [1080.5, 312], [1081, 320]], 2.4, grey(0.76, 0.7), 1.4);
  softEll(g, 1072, 334, 10, 2.4, 0, grey(0.72, 0.6), 1.8);
  softEll(g, 1072, 358.5, 12, 2.6, 0, grey(0.6, 0.85), 1.6);
  skinGrain(g, FACE, { seed: 720, n: 360, bb: [1018, 250, 1124, 345], a: 0.05 });
  // (fix pass 2) gaunt: a shadow under each cheekbone (the plate's cheek on his left reads ~0.55 there at σ2), fainter
  // on his right
  softEll(g, 1106, 318, 6, 12, 0.25, grey(0.6, 0.3), 4);
  g.restore();
  // (fix pass 2) the heavy lid folds: grey skin between the crease and the lash line
  g.save(); g.beginPath(); polyPath(g, FACE); g.clip();
  for (const k of ["L", "R"]) { const E = EYE[k]; fillSoft(g, S([...E.crease, ...E.up.slice().reverse()], true), grey(0.62, 0.55), 1.2); }
  g.restore();
  // ---- eyes: almond, heavy-lidded, grey whites, dark irises looking hard to his right ----
  for (const k of ["L", "R"]) {
    const E = EYE[k], [ix, iy] = IRIS[k];
    const open = [...E.up, ...E.lo.slice(1, -1)];
    fill(g, S(open, true), grey(0.8));
    g.save(); g.beginPath(); smoothPath(g, open, true); g.clip();
    // the upper lid's shadow across the top of the eye
    // (fix pass 2) the source's irises are smaller (~5 px radius) and the heavy upper lid covers the top ~40 % of the
    // opening, its shadow across the iris's top
    dot(g, ix, iy + 0.4, 5.2, grey(0.12));
    ring(g, ix, iy + 0.4, 4.8, 0.9, grey(0.04));
    dot(g, ix, iy + 0.4, 2.4, grey(0.02));
    dot(g, ix + 1.7, iy - 0.6, 0.8, grey(0.9));
    softEll(g, (E.up[0][0] + E.up[5][0]) / 2, E.up[2][1] + 2.6, 18, 3.4, 0, grey(0.2, 0.9), 1.0);
    softEll(g, ix + 10, iy + 1.2, 6, 2.4, 0, grey(0.82, 0.45), 1.2);
    g.restore();
    // (fix pass 1) the lids are drawn as thin dark lines (F1's were 2.8 px); the lid crease and the bag line thin grey
    ink(g, E.up, 3.0, "#060606", { smooth: true, ends: 0.35, jit: 0.05, seed: 740 + k.charCodeAt(0) });
    ink(g, E.lo, 0.9, grey(0.28, 0.9), { smooth: true, ends: 0.3, jit: 0.05, seed: 742 });
    ink(g, E.crease, 1.0, grey(0.26, 0.85), { smooth: true, ends: 0.2, jit: 0.05, seed: 743 });
    ink(g, E.brow, k === "R" ? 2.4 : 2.0, grey(k === "R" ? 0.07 : 0.12), { smooth: true, ends: 0.3, jit: 0.15, seed: 744 });
    ink(g, E.lo.map(([x, y]) => [x, y + 5.2]).slice(1, -1), 0.9, grey(0.34, 0.6), { smooth: true, ends: 0.2, seed: 745 });
  }
  // ---- nose lines, nostrils, mouth (F1's, measured) ----
  ink(g, [[1062, 314], [1060.4, 322.7], [1062, 326.4], [1066, 328.6]], 1.1, grey(0.42, 0.85), { smooth: true, ends: 0.2, seed: 750 });
  ink(g, [[1080.5, 312], [1083.3, 322.7], [1081.6, 327], [1078.5, 328.7]], 1.0, grey(0.45, 0.8), { smooth: true, ends: 0.2, seed: 751 });
  ink(g, [[1064.3, 328.5], [1072.7, 331.2], [1080.6, 328.8]], 1, grey(0.38, 0.85), { smooth: true, ends: 0.3, seed: 752 });
  fillSoft(g, ELL(1066.2, 328.2, 2.6, 1.2, 0.25), grey(0.32), 0.7); fillSoft(g, ELL(1078.8, 328.2, 2.6, 1.2, -0.25), grey(0.36), 0.7);
  ink(g, [[1051.5, 348.8], [1057, 347.4], [1065, 347.2], [1072.7, 348], [1080, 347.2], [1087, 347.4], [1093.8, 349.2]], 2.0, grey(0.32), { smooth: true, ends: 0.3, jit: 0.05, seed: 753 });
  ink(g, [[1058, 345], [1066, 343.4], [1072.7, 344.6], [1079, 343.4], [1087, 345]], 0.9, grey(0.5, 0.7), { smooth: true, ends: 0.2, seed: 758 });
  ink(g, [[1060, 356.8], [1072.7, 358.4], [1085, 356.8]], 1.4, grey(0.45, 0.75), { smooth: true, ends: 0.2, seed: 754 });
  { g.save(); g.beginPath(); polyPath(g, FACE); g.clip(); softEll(g, 1072, 368, 20, 9, 0, grey(0.7, 0.45), 3);
    const rs = rng(759); for (let i = 0; i < 260; i++) { const x = 1048 + rs() * 50, y = 350 + rs() * 28; const d = ((x - 1072) / 25) ** 2 + ((y - 366) / 13) ** 2; if (d < 1 && !(y < 359 && Math.abs(x - 1072) < 15)) ink(g, [[x, y], [x + 0.6, y + 1.2]], 0.5, grey(0.4, 0.3), { seed: i }); }
    g.restore(); }
  // ---- the hair over the face (fix pass 1): the source's bangs and side locks against the skin, traced as outlines
  //      (hair_data.js): the sweep over the left temple to the eye's outer corner, the central lock down between the
  //      eyes, the spiky strands down over the right brow; the hairline under the beanie ----
  fill(g, S([[994, 250], [1020, 244], [1072, 240], [1120, 243], [1146, 250], [1141, 256], [1100, 250], [1072, 249], [1040, 251], [1016, 258]], true), "#040404");
  const over = (c) => { for (const q of HAIR_OVER) { c.moveTo(q[0], q[1]); for (let i = 2; i < q.length; i += 2) c.lineTo(q[i], q[i + 1]); c.closePath(); } };
  blurDraw(g, [1000, 238, 1142, 376], 0.45, (c) => { c.beginPath(); over(c); c.fillStyle = "#040404"; c.fill(); });
  // greasy strand highlights inside the hair over the face: thin grey strokes along the flow (down, fanning outward)
  g.save(); g.beginPath(); over(g); g.clip();
  { const r = rng(801);
    for (let i = 0; i < 70; i++) {
      const x = 1004 + r() * 134, y = 246 + r() * 90, side = (x - 1071) / 67;
      const L = 8 + r() * 18, ang = PI / 2 + side * 0.55 + (r() - 0.5) * 0.35;
      const p0 = [x, y], p1 = [x + Math.cos(ang) * L * 0.5 + (r() - 0.5) * 2, y + Math.sin(ang) * L * 0.5], p2 = [x + Math.cos(ang) * L, y + Math.sin(ang) * L];
      ink(g, [p0, p1, p2], 0.6 + r() * 0.7, grey(0.2 + r() * 0.18, 0.8), { smooth: true, ends: 0.15, jit: 0.2, seed: 810 + i });
    } }
  g.restore();
  // the side hair's greasy highlights (the source's side hair is grey-black with visible strands, not a solid black)
  g.save(); g.beginPath(); smoothPath(g, [[998, 249], [991, 262], [986, 282], [985, 305], [987, 330], [992, 350], [1002, 364], [1016, 366], [1026, 350], [1026, 320], [1022, 290], [1018, 262], [1010, 250]], true);
  smoothPath(g, [[1146, 248], [1150, 262], [1153, 285], [1154, 310], [1150, 334], [1142, 352], [1128, 360], [1118, 350], [1117, 320], [1120, 290], [1124, 262], [1132, 250]], true); g.clip();
  { const r = rng(830);
    for (let i = 0; i < 90; i++) {
      const left = i % 2 === 0, x = left ? 986 + r() * 38 : 1117 + r() * 36, y = 256 + r() * 100;
      const L = 10 + r() * 22, ang = PI / 2 + (left ? 0.18 : -0.18) + (r() - 0.5) * 0.3;
      const p0 = [x, y], p2 = [x + Math.cos(ang) * L, y + Math.sin(ang) * L], p1 = [(p0[0] + p2[0]) / 2 + (r() - 0.5) * 3, (p0[1] + p2[1]) / 2];
      ink(g, [p0, p1, p2], 0.6 + r() * 0.8, grey(0.16 + r() * 0.2, 0.85), { smooth: true, ends: 0.15, jit: 0.2, seed: 840 + i });
    } }
  g.restore();
  // left side hair (x 988–1025): strands from the temple to the jaw, the outer ones flaring
  strandsSide(g, [
    [[1022, 256], [1016, 280], [1014, 306], 9], [[1016, 258], [1006, 284], [1000, 318], 10], [[1010, 262], [998, 290], [992, 322], 9],
    [[1004, 266], [993, 300], [989, 336], 8], [[1000, 280], [992, 316], [994, 350], 7], [[1006, 300], [1002, 330], [1004, 360], 7],
    [[1012, 312], [1009, 336], [1010, 362], 6], [[996, 300], [986, 324], [982, 346], 3.5],
    [[994, 330], [988, 350], [986, 366], 3], [[1008, 332], [1004, 352], [1000, 370], 3.5],
  ], 780, { hi: 0.34 });
  // right side hair (x 1118–1152)
  strandsSide(g, [
    [[1120, 256], [1126, 280], [1127, 304], 9], [[1127, 256], [1136, 282], [1141, 314], 10], [[1134, 260], [1144, 288], [1148, 322], 9],
    [[1140, 266], [1149, 298], [1150, 334], 8], [[1142, 290], [1147, 318], [1143, 348], 7], [[1136, 306], [1139, 330], [1134, 356], 6],
    [[1130, 318], [1132, 338], [1129, 358], 5], [[1146, 300], [1156, 322], [1158, 344], 3], [[1150, 330], [1155, 346], [1157, 360], 2.5],
  ], 790, { hi: 0.3 });
  // ---- sweat (fix pass 1): small teardrops with a thin grey edge and a pale body (not dark dots) ----
  for (const [x, y, s, a] of [[1032.5, 320.5, 1.0, 0.1], [1106.5, 338.5, 1.0, -0.1], [1082, 302.5, 0.8, 0.05], [1052.5, 300.5, 0.8, -0.05], [1114.5, 318.5, 0.8, 0.1]]) {
    g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
    const drop = [[0, -3.6], [1.3, -0.6], [1.6, 1.0], [0, 2.2], [-1.6, 1.0], [-1.3, -0.6]];
    fill(g, S(drop, true), grey(0.95));
    ink(g, [[-1.1, -1.8], [-1.7, 0.8], [-0.4, 2.1], [1.1, 1.6]], 0.7, grey(0.42, 0.9), { smooth: true, ends: 0.3, jit: 0, seed: 796 });
    dot(g, 0.4, -0.4, 0.5, grey(1, 0.9));
    g.restore();
  }
  // ---- the beanie (F1's, measured; a little darker: the source's knit measures ~5 lower) ----
  const BEANIE = [[992, 284.8], [991.8, 277], [994.8, 263], [991.5, 254.2], [991.5, 248], [996.5, 228.5], [998.5, 213], [1017.2, 188.8], [1018.8, 179.8], [1053.8, 166.5], [1062.8, 161], [1070.5, 161], [1072.8, 162.5], [1108, 173], [1117.2, 178.5], [1124.2, 193.2], [1141.5, 219], [1139.8, 232], [1146.2, 245.8], [1144.2, 260.2], [1147.5, 281],
    [1144, 283], [1139, 274], [1134, 266], [1128, 258], [1110, 248], [1085, 243], [1060, 243], [1042, 246], [1020, 256], [1004, 268], [997, 280]];
  fill(g, S(BEANIE, true), grey(0.18));
  g.save(); g.beginPath(); smoothPath(g, BEANIE, true); g.clip();
  g.fillStyle = lgrad(g, 0, 160, 0, 285, [[0, 0.11], [0.2, 0.17], [0.36, 0.18], [0.4, 0.1], [0.44, 0.23], [0.75, 0.27], [0.9, 0.25], [1, 0.18]]); g.fillRect(985, 155, 170, 132);
  softEll(g, 1000, 245, 9, 34, 0, grey(0.1, 0.8), 6); softEll(g, 1144, 240, 7, 34, 0, grey(0.08, 0.8), 6);
  softEll(g, 1040, 190, 25, 12, -0.3, grey(0.21, 0.6), 8);
  carve(g, S(BEANIE, true), { coord: (x, y) => [(x - 1071) * (1 + (285 - y) * 0.0022), y], v: 0.24, per: 3.2, seed: 780, over: true, alpha: 0.32, lum: 0.42, brk: 0.3, wav: 0.2, soft: 1.8, streak: 0.5 });
  skinGrain(g, BEANIE, { seed: 781, n: 500, bb: [990, 160, 1148, 285], ang: PI / 2, a: 0.14 });
  g.restore();
  ink(g, [[998, 226], [1025, 212], [1050, 207], [1072, 206], [1100, 209], [1125, 216], [1141, 224]], 1.9, grey(0.05), { smooth: true, ends: 0.3, seed: 790 });
  ink(g, [[999, 229.5], [1025, 215.5], [1050, 210.8], [1072, 209.8], [1100, 212.8], [1125, 219.8], [1140, 227.5]], 1.2, grey(0.33, 0.7), { smooth: true, ends: 0.3, seed: 791 });
  ink(g, [[997, 279], [1004, 267], [1020, 255], [1042, 245.5], [1060, 242.6], [1085, 242.6], [1110, 246.6], [1128, 253.5], [1138, 263], [1143, 273]], 1.3, grey(0.33, 0.6), { smooth: true, ends: 0.3, seed: 792 });
}

// ======================================================================================
// torso and headphones: F1's (sokoIll.js torso / headphones, measured), changed as noted (fix pass 1)
// ======================================================================================
// (fix pass 1) the left shoulder and arm 3–4 px in (the plate's σ1.5 iso-110 edge: 993 / 975 / 959 / 945 / 935 / 930 /
// 927 at y 365–425; F1's outline was 3–8 px outside it)
const SHIRT = [[1004, 359], [981, 369], [959, 383], [941, 399], [931, 413], [924, 433], [920, 460], [914, 522],
  [1150, 523], [1200, 521], [1240, 505], [1245, 488], [1240, 472], [1226, 455], [1216, 441], [1204, 401], [1190, 387],
  [1166, 375], [1138, 361], [1100, 352], [1040, 352]];
export function paintTorso(g) {
  // (fix pass 2) brighter: the plate's sleeves and chest reach ~250 graded (p90), ours 226–235
  fill(g, S(SHIRT, false), grey(0.965));
  g.save(); g.beginPath(); polyPath(g, SHIRT); g.clip();
  softEll(g, 1168, 440, 50, 55, 0.5, grey(1), 14);
  softEll(g, 955, 425, 36, 26, 0, grey(1), 10);
  // light: the screen lights the chest from below; the arms turn away into shade at their outer edges
  // (fix pass 1) the plate's shirt is brighter than F1's (240–250 graded on the left chest and the sleeve, against F1's
  // 200–220) and turns into shade only in a narrow band at the arms' outer edges
  softEll(g, 1072, 460, 130, 90, 0, grey(0.99), 16);
  // his right side (our right) past the collar is in soft shade with long folds (the plate's 1130–1180 x 440–500 reads
  // ~219 graded, p10 ~176)
  softEll(g, 1168, 468, 44, 42, 0.4, grey(0.8, 0.35), 12);
  softLine(g, [[932, 405], [925, 440], [920, 490]], 6, grey(0.78), 3);
  softLine(g, [[1204, 400], [1214, 432], [1222, 456]], 8, grey(0.62), 4);
  softLine(g, [[1236, 468], [1242, 490]], 6, grey(0.58, 0.8), 3);
  // the dark t-shirt between the lapels, lit grey by the laptop; the neck opening
  // (fix pass 2) fainter: at 48.8–50.4 the plate's chest between the cups reads near white (the T-shirt's V shows
  // mainly in the first frames)
  fillSoft(g, S([[1060, 404], [1090, 404], [1120, 410], [1128, 437], [1110, 446], [1080, 444], [1062, 430]], true), grey(0.7, 0.35), 4);
  softLine(g, [[1030, 422], [1050, 428], [1075, 431], [1105, 428], [1126, 424]], 4, grey(0.62, 0.6), 2.5);
  // collar shadow under the hair
  softLine(g, [[1000, 360], [1020, 368], [1040, 372]], 8, grey(0.25), 4);
  softLine(g, [[1110, 362], [1130, 362], [1150, 366]], 8, grey(0.35, 0.8), 4);
  // fold strokes (grey pencil): the left shoulder seam and sleeve fold, the lapels, the right side's diagonal folds
  const F = [
    [[[938, 407], [960, 392], [980, 381], [994, 373]], 1.4, 0.6, 0.7], [[[940, 409], [962, 395], [982, 384], [996, 376]], 0.8, 0.72, 0.5],
    [[[938, 407], [943, 420], [948, 433]], 1.6, 0.62, 0.7],
    [[[1006, 383], [1001, 405], [996, 435]], 1.6, 0.5, 0.6], [[[996, 435], [1004, 440]], 1.4, 0.5, 0.6],
    [[[1122, 410], [1127, 437], [1146, 444]], 1.8, 0.45, 0.6], [[[1125, 440], [1134, 480], [1142, 521]], 1.4, 0.55, 0.7],
    [[[1175, 395], [1160, 430], [1150, 470], [1148, 500]], 2.4, 0.6, 1.4], [[[1190, 400], [1172, 440], [1160, 480]], 2.2, 0.6, 1.4],
    [[[1200, 430], [1182, 470], [1170, 500]], 2, 0.62, 1.3], [[[1210, 455], [1195, 480], [1180, 505]], 1.8, 0.6, 1.2],

    [[[1170, 372], [1185, 385], [1196, 392]], 1.4, 0.55, 0.8], [[[1140, 368], [1160, 375]], 1.2, 0.6, 0.8],
    [[[960, 400], [966, 430], [962, 470]], 1.2, 0.86, 1], [[[980, 395], [986, 420]], 1.0, 0.88, 1],
  ];
  // (fix pass 1) the sleeve's folds are soft shaded creases in the source (7x), not crisp pencil scratches
  for (const [pts, w, v, b] of F) { const sleeve = pts[0][0] > 1140 && pts[0][1] > 390; softLine(g, pts, sleeve ? w * 1.2 : w * 0.8, grey(sleeve ? 0.84 : v * 0.85), sleeve ? 1.6 : Math.min(b, 0.7)); }
  // more fold lines measured on the plate's local-darkening map (thin, crisp pencil folds)
  for (const [pts, w, v] of [
    [[[1150, 368], [1172, 376], [1192, 388], [1204, 402]], 1.3, 0.5], [[[1204, 402], [1214, 425], [1222, 448], [1238, 470]], 1.2, 0.45],
    [[[1170, 470], [1185, 474], [1210, 470]], 1.1, 0.55],
    [[[1140, 450], [1150, 470], [1160, 500]], 1.0, 0.55], [[[1190, 420], [1200, 440], [1205, 460]], 1, 0.58],
    [[[935, 402], [950, 392], [970, 380], [995, 370]], 1.0, 0.7], [[[946, 405], [950, 425], [953, 445]], 0.9, 0.75],
    [[[1036, 428], [1060, 436], [1085, 437], [1110, 432]], 1.4, 0.45],
  ]) softLine(g, pts, w, grey(v), 0.5, { ends: 0.2 });
  // collar seams and lapel notches (grey pencil lines)
  for (const [pts, w, v] of [
    [[[941, 394], [960, 384], [980, 375], [996, 369]], 1.4, 0.5], [[[996, 419], [999, 428], [1001, 436]], 1.3, 0.45], [[[990, 405], [996, 419], [1006, 424]], 1.2, 0.5],
    [[[1139, 369], [1160, 377], [1180, 386], [1196, 394]], 1.4, 0.5], [[[1131, 439], [1140, 441], [1146, 444]], 1.3, 0.45], [[[1128, 410], [1131, 425], [1131, 439]], 1.2, 0.5],
  ]) softLine(g, pts, w, grey(v), 0.8);
  // (fix pass 2) crisp pencil folds over the soft shading, read off the plate at 4x (the reviewer: the shirt was "a
  // uniform glowing white blob", Laplacian detail 0.53–0.66 of the source's on the sleeves): the collar's edge and
  // the lapel notch on his left (our right), the shoulder seams, the sleeves' diagonal folds, the elbow's folds, the
  // shirt front's creases down to the desk
  for (const [pts, w, v] of [
    [[[1112, 372], [1118, 400], [1124, 425], [1128, 440], [1150, 446]], 1.4, 0.42], [[[1130, 442], [1136, 470], [1142, 500], [1146, 518]], 1.2, 0.52],
    [[[1150, 380], [1175, 390], [1196, 402]], 1.2, 0.5],
    [[[1188, 402], [1172, 425], [1160, 450]], 1.5, 0.5], [[[1202, 416], [1186, 440], [1176, 466]], 1.3, 0.55], [[[1178, 442], [1166, 470], [1160, 492]], 1.2, 0.58],
    [[[1200, 455], [1225, 470], [1246, 482]], 1.4, 0.48], [[[1194, 471], [1220, 483], [1242, 491]], 1.2, 0.52], [[[1214, 444], [1232, 462]], 1.1, 0.5],
    [[[1150, 470], [1160, 495], [1168, 516]], 1.4, 0.5], [[[1170, 476], [1186, 500], [1194, 514]], 1.2, 0.55], [[[1158, 404], [1150, 428]], 1.0, 0.6],
    [[[938, 404], [944, 420], [948, 436]], 1.0, 0.62], [[[962, 392], [972, 418], [980, 444]], 1.0, 0.66],
    [[[945, 392], [965, 385], [990, 378]], 1.1, 0.55], [[[928, 432], [940, 440]], 1.0, 0.6],
  ]) ink(g, pts, w * 1.5, grey(v * 0.8, 0.95), { smooth: true, ends: 0.25, jit: 0.15, seed: 1150 + Math.round(pts[0][0] + pts[0][1]) });
  g.restore();
  // (fix pass 2) the plate's shirt is near-white on its lit planes (p90 ~250 graded; ours ~236): a lift toward white
  // over the left shoulder, the chest and the sleeve, which leaves the fold lines' contrast mostly in place
  g.save(); g.beginPath(); polyPath(g, SHIRT); g.clip();
  blurDraw(g, [900, 350, 1270, 530], 14, (c) => { c.fillStyle = grey(0.2); for (const [x, y, rx, ry] of [[958, 425, 42, 30], [1170, 440, 48, 55], [1190, 490, 50, 22], [1080, 480, 110, 40]]) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); } }, { op: "screen" });
  g.restore();
  // (fix pass 2) the shoulders' outer edges turn into shade (plate: ~0.45–0.6 in a band 6–10 px inside the edge),
  // with a thin grey keyline along them
  g.save(); g.beginPath(); polyPath(g, SHIRT); g.clip();
  softLine(g, [[1182, 372], [1204, 396], [1215, 432], [1234, 466], [1244, 488]], 9, grey(0.5, 0.8), 3.5);
  g.restore();
  ink(g, [[1182, 372], [1204, 397], [1216, 438], [1236, 468], [1245, 490]], 2.2, grey(0.08, 0.9), { smooth: true, ends: 0.4, seed: 1160 });
  // (fix pass 2) the plate's shoulder is bright right up to a crisp dark ~3 px outline
  ink(g, SHIRT.slice(0, 8), 2.6, grey(0.06, 0.95), { smooth: true, ends: 0.5, seed: 1100 });
  ink(g, SHIRT.slice(10, 19), 1.3, grey(0.25, 0.8), { smooth: true, ends: 0.4, seed: 1101 });
  // his left hand resting on the desk (fingers toward the laptop) and his right hand at the laptop's left
  const hand = [[1136, 521], [1138, 511], [1148, 505], [1162, 503], [1176, 506], [1184, 512], [1182, 521]];
  fill(g, S(hand, true), grey(0.86));
  softEll(g, 1160, 518, 20, 3, 0, grey(0.6, 0.6), 2);
  for (const x of [1144, 1152, 1160]) ink(g, [[x, 509], [x - 3, 520]], 0.8, grey(0.4, 0.8), { seed: x });
  ink(g, hand, 1, grey(0.3, 0.8), { smooth: true, seed: 1103 });
  fill(g, S([[909, 516], [914, 494], [922, 486], [933, 498], [930, 516]], true), grey(0.6));
  ink(g, [[912, 512], [921, 490], [932, 502]], 1, grey(0.2, 0.9), { smooth: true, seed: 1102 });
}

export function paintHeadphones(g) {
  // (measured at 4–8x) round his neck: the left cup seen from its outer side (x 1004–1058, y 364–444): a shell with a
  // thick dark rim and an inner ring, the ribbed cushion torus behind it on the right; the right cup nearly edge-on
  // (x 1086–1139, y 361–429): shell face, ribbed cushion band, the yoke with two white rim arcs. Lit from below by
  // the laptop: their upper halves are in shade.
  blurDraw(g, [995, 345, 1150, 452], 0.55, (c) => {
    const E = (x, y, rx, ry, a, fill, stroke, lw) => { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } c.restore(); };
    // fork / band ends
    // (fix pass 1) the band's ends into the cups: grey bands with a lit edge (the plate at 7x), not black blobs
    ink(c, [[1003, 352], [1008, 366], [1013, 382]], 6, grey(0.1), { seed: 1110, smooth: true });
    ink(c, [[1005, 352], [1010, 366], [1015, 381]], 1.3, grey(0.62, 0.9), { seed: 1109, smooth: true });
    ink(c, [[1020, 354], [1024, 368], [1024, 380]], 4, grey(0.12), { seed: 1108, smooth: true });
    ink(c, [[1122, 366], [1128, 353], [1136, 346]], 5, grey(0.1), { seed: 1111 });
    ink(c, [[1123, 364], [1129, 352], [1136, 345]], 1.2, grey(0.6, 0.85), { seed: 1112 });
    // left cup: cushion torus (dark, lit ribs on its right half)
    E(1041, 404, 17.5, 40, 0.06, grey(0.22), grey(0.08), 1.4);
    c.save(); c.translate(1041, 404); c.rotate(0.06);
    for (let i = 0; i < 26; i++) { const t = -PI * 0.5 + (i / 25) * PI; c.strokeStyle = grey(0.62, 0.7); c.lineWidth = 1.3; c.beginPath(); c.moveTo(Math.cos(t) * 10, Math.sin(t) * 30); c.lineTo(Math.cos(t) * 16.5, Math.sin(t) * 38.5); c.stroke(); }
    c.restore();
    // left cup: the shell. (fix pass 1, plate at 7x) its face is a grey oval (~0.45–0.6, darker on top where the laptop's
    // light does not reach), a darker ring and a lighter inner plate — not F1's pale plate in a black ring
    E(1024, 407, 17.5, 37.5, 0.07, grey(0.14));
    c.save(); c.translate(1024, 407); c.rotate(0.07);
    c.fillStyle = lgrad(c, -10, -34, 10, 34, [[0, 0.24], [0.5, 0.42], [1, 0.6]]); c.beginPath(); c.ellipse(1, 0.5, 14, 34, 0, 0, TAU); c.fill();
    c.strokeStyle = grey(0.2); c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 2, 9.5, 24, 0, 0, TAU); c.stroke();
    c.fillStyle = lgrad(c, -8, -22, 8, 24, [[0, 0.4], [0.5, 0.58], [1, 0.7]]); c.beginPath(); c.ellipse(0, 2, 8.6, 23, 0, 0, TAU); c.fill();
    c.strokeStyle = grey(0.72); c.lineWidth = 1.2; c.beginPath(); c.ellipse(1, 0.5, 14, 34, 0, PI * 0.62, PI * 1.32); c.stroke();
    c.strokeStyle = grey(0.6, 0.8); c.lineWidth = 0.9; c.beginPath(); c.ellipse(0, 2, 8.6, 23, 0, PI * 1.1, PI * 1.6); c.stroke();
    c.restore();
    // right cup: shell face, ribbed cushion band, yoke with white rims
    E(1096, 395, 9.5, 34, 0, grey(0.05));
    E(1096.5, 395, 7.5, 32, 0, lgrad(c, 0, 363, 0, 427, [[0, 0.5], [1, 0.78]]));
    c.save(); c.beginPath(); c.ellipse(1112.5, 394.5, 9, 34, 0, 0, TAU); c.clip();
    c.fillStyle = grey(0.1); c.fillRect(1100, 358, 26, 74);
    for (let i = 0; i < 15; i++) { const y = 363 + i * 4.4; c.fillStyle = lgrad(c, 1104, 0, 1121, 0, [[0, 0.6], [0.5, 0.95], [1, 0.65]]); c.fillRect(1103, y, 19, 2.2); }
    c.restore();
    ink(c, [[1104, 361], [1103, 394], [1104, 428]], 1.2, grey(0.05), { smooth: true, seed: 1113 }); ink(c, [[1121, 360], [1122, 394], [1121, 427]], 1.2, grey(0.05), { smooth: true, seed: 1114 });
    fill(c, S([[1121, 360], [1131, 358], [1140, 374], [1140, 407], [1132, 424], [1122, 426]], true), grey(0.05));
    fill(c, S([[1124, 374], [1131, 373], [1132, 400], [1125, 401]], true), grey(0.72));
    ink(c, [[1124, 362], [1133, 378], [1134, 407], [1126, 422]], 1.2, grey(0.9), { smooth: true, seed: 1115 });
    ink(c, [[1130, 360], [1139, 378], [1139, 407], [1132, 422]], 1.1, grey(0.78), { smooth: true, seed: 1116 });
    c.globalCompositeOperation = "source-atop"; c.fillStyle = lgrad(c, 0, 362, 0, 418, [[0, "rgba(0,0,0,0.3)"], [1, "rgba(0,0,0,0)"]]); c.fillRect(995, 345, 155, 105); c.globalCompositeOperation = "source-over";
  });
  // the laptop's light washing over their lower halves and the chest
  blurDraw(g, [980, 390, 1170, 475], 10, (c) => { c.fillStyle = grey(0.93, 0.75); c.beginPath(); c.ellipse(1072, 447, 85, 24, 0, 0, TAU); c.fill(); });
}
// (fix pass 1) the laptop's light blooming on his face, neck and shoulders (source 48.8–50.4: chin +20, neck +40, the
// cups +28, chest +20 graded over F1's): a soft additive glow round (1065, 425), falling off over ~120 px, drawn over the
// torso, head and headphones and under the laptop's lid
export function paintBloom(g) {
  blurDraw(g, [930, 300, 1210, 520], 18, (c) => {
    const gr = c.createRadialGradient(1066, 428, 0, 1066, 428, 110);
    gr.addColorStop(0, "rgba(255,255,255,0.2)"); gr.addColorStop(0.45, "rgba(255,255,255,0.11)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gr; c.fillRect(930, 300, 280, 220);
  }, { op: "lighter" });
}

// ======================================================================================
// trousers and boots: F1's outlines, value studies and fold guides (sokoIll.js trousers / boots, measured), repainted as
// scratchboard engraving (fix pass 1)
// ======================================================================================
const LEGL = [[937, 553], [981, 551], [1014, 583], [1028, 619], [1036, 633], [1039, 683], [1061, 727], [1055, 750], [1066, 777], [1058, 797], [1030, 800], [990, 793], [955, 792], [944, 781], [947, 758], [931, 752], [925, 730], [926, 691], [930, 647], [931, 591], [933, 560]];
const LEGR = [[1170, 560], [1200, 555], [1227, 555], [1257, 560], [1274, 586], [1278, 610], [1289, 635], [1289, 690], [1269, 706], [1255, 712], [1251, 747], [1245, 768], [1230, 786], [1200, 794], [1150, 796], [1127, 790], [1124, 759], [1130, 729], [1142, 704], [1153, 665], [1160, 622]];
const LAP = [[1000, 550], [1178, 550], [1172, 590], [1160, 622], [1153, 648], [1100, 646], [1039, 650], [1028, 619], [1014, 583]];
export function paintTrousers(g) {
  const study = (base, polys, lines) => (v) => {
    v.fillStyle = grey(base); v.fillRect(900, 540, 420, 270);
    for (const [pts, val, b] of polys) fillSoft(v, S(pts, true), grey(val), (b ?? 3) * 0.5);
    for (const [pts, w, val, b] of lines) softLine(v, pts, w, grey(val), (b ?? 3) * 0.6);
  };
  const cloth = (outline, vp, guides, box, seed, creases) => {
    fill(g, S(outline, false), grey(0.03));
    const ang = guideField(guides, box, 4);
    // (fix pass 1) scratchboard, not a smooth painting: F1's value study is cut as crisp white lines along the folds
    // (the source's trousers at 3x: 1–2 px white strokes in parallel runs, black between, dark crevices), their width
    // and brightness following the study; a sparse set of brighter fold highlights on the lit planes; the creases
    const vq = (c) => { vp(c); c.globalCompositeOperation = "multiply"; c.fillStyle = grey(0.97); c.fillRect(890, 530, 430, 300); c.globalCompositeOperation = "source-over"; };
    licPaint(g, S(outline, false), { vp: vq, vblur: 1, ang, L: 20, density: 0.3, amp: 1.0, seed, cell: 1.8, gamma: 1.0 });
    clothPaint(g, S(outline, false), { vp: vq, vblur: 1, ang, per: 4, seed: seed + 1, base: false, segL: [14, 40], gapL: [3, 10], hiW: [0.7, 1.4], dkW: [1.0, 2.0], hiP: 0.55, hiK: 1.35, hiB: 0.1, dens: 1.2 });
    for (const [pts, w] of creases) { ink(g, pts, w * 1.5, grey(0.03, 0.9), { smooth: true, ends: 0.15, jit: 0.2, seed: seed + Math.round(pts[0][0]) }); ink(g, pts.map(([x, y]) => [x, y - w * 1.4]), w * 0.6, grey(0.85, 0.7), { smooth: true, ends: 0.2, jit: 0.2, seed: seed + 7 + Math.round(pts[0][0]) }); }
    ink(g, outline, 1.4, "#040404", { closed: true, seed: seed + 99, jit: 0.2 });
  };
  cloth(LAP, (v) => { v.fillStyle = grey(0.07); v.fillRect(995, 548, 190, 120); softLine(v, [[1060, 610], [1100, 630], [1150, 640]], 14, grey(0.22), 6); softLine(v, [[1100, 570], [1150, 600]], 10, grey(0.16), 5); },
    [[[1170, 560], [1120, 600], [1060, 640]], [[1030, 560], [1040, 600], [1050, 650]]], [990, 545, 1185, 670], 1200, []);
  cloth(LEGL, study(0.27, [
    [[[935, 628], [955, 632], [1000, 670], [1050, 716], [1052, 734], [1030, 740], [990, 712], [950, 668], [935, 650]], 0.66, 4],
    [[[962, 660], [990, 676], [1022, 706], [1010, 716], [985, 700], [966, 680]], 0.72, 2.5],
    [[[945, 745], [1005, 726], [1050, 722], [1052, 742], [1010, 750], [955, 762]], 0.8, 3],
    [[[1030, 752], [1048, 760], [1055, 790], [1040, 792], [1028, 770]], 0.78, 3],
    [[[955, 700], [985, 705], [982, 735], [958, 732]], 0.06, 3],
    [[[924, 560], [936, 560], [936, 700], [924, 700]], 0.12, 3],
    [[[1026, 600], [1040, 610], [1044, 690], [1032, 690]], 0.1, 3],
    [[[1000, 598], [1022, 596], [1026, 640], [1006, 648]], 0.46, 3],
  ], [
    [[[948, 575], [962, 600], [975, 625]], 9, 0.44], [[[975, 568], [992, 598], [1006, 625]], 8, 0.42], [[[1004, 585], [1016, 612]], 6, 0.38],
    [[[930, 740], [955, 752]], 10, 0.6], [[[945, 775], [990, 780], [1030, 790]], 8, 0.5], [[[950, 585], [958, 625]], 5, 0.12, 2],
  ]), [[[945, 565], [975, 610], [1005, 655], [1040, 705]], [[932, 600], [960, 650], [990, 700]], [[975, 560], [1000, 600], [1025, 640]], [[945, 725], [1000, 718], [1055, 728]], [[950, 752], [1000, 745], [1055, 742]], [[950, 780], [1000, 782], [1055, 790]]], [915, 545, 1075, 805], 1210,
    [[[[968, 700], [1000, 722], [1040, 735]], 1.4], [[[958, 742], [1000, 748], [1048, 750]], 1.8], [[[955, 772], [1000, 768], [1050, 770]], 1.3]]);
  // right leg: light structure read off the plate's sigma-3 level map (the shin plane is a bright triangle with
  // its apex at (1212, 678), a lit ridge runs down-left from the pocket, the cuff folds at y ~760)
  cloth(LEGR, study(0.38, [
    [[[1128, 668], [1150, 664], [1150, 720], [1128, 724]], 0.03, 4],
    [[[1150, 772], [1245, 770], [1240, 796], [1150, 798]], 0.3, 3],
  ], [
    // fold ridges read off the plate (sigma-3 values 0.6–0.9 on a 0.3–0.4 ground)
    [[[1180, 672], [1168, 690], [1158, 706]], 16, 0.78, 3], [[[1214, 684], [1204, 708], [1192, 728], [1180, 742]], 16, 0.86, 3],
    [[[1238, 648], [1246, 672], [1254, 690], [1262, 702]], 10, 0.78, 3], [[[1238, 730], [1242, 748], [1244, 762]], 10, 0.9, 3],
    [[[1162, 744], [1150, 752], [1140, 762]], 10, 0.72, 3], [[[1224, 744], [1218, 754]], 8, 0.65, 3], [[[1175, 640], [1188, 660], [1192, 672]], 10, 0.52, 3],
    [[[1188, 592], [1200, 608]], 12, 0.48, 4], [[[1226, 615], [1238, 628]], 10, 0.52, 3], [[[1256, 596], [1256, 700]], 4, 0.1, 2],
  ]), [[[1245, 575], [1215, 620], [1185, 665], [1150, 720]], [[1225, 600], [1200, 650], [1175, 700], [1150, 745]], [[1245, 640], [1225, 690], [1205, 740]], [[1140, 752], [1190, 748], [1245, 742]], [[1140, 780], [1195, 782], [1245, 778]], [[1262, 600], [1272, 650], [1280, 700]]], [1115, 545, 1300, 805], 1230,
    [[[[1256, 596], [1256, 650], [1244, 702]], 1.6], [[[1185, 760], [1212, 758], [1240, 762]], 1.8], [[[1160, 782], [1200, 778], [1235, 774]], 1.2], [[[1200, 662], [1180, 700], [1165, 725]], 1.3]]);
  edge(g, [[1254, 592], [1289, 628], [1290, 690], [1270, 705], [1256, 705]], 1.5, 0.8, 1250);
}
function soleLugs(g, top, bot, n, seed, v = 0.5) {
  // top: polyline of the rand's top edge; bot: y of the lug tips per x (function); a pale band with teeth
  const r = rng(seed), pts = [...top];
  const x0 = top[top.length - 1][0], x1 = top[0][0];
  for (let i = 0; i <= n * 2; i++) { const x = lerp(x0, x1, i / (n * 2)); pts.push([x, bot(x) - (i % 2 ? 0 : 3.5 + r() * 2)]); }
  fill(g, S(pts, false), grey(v));
  carve(g, S(pts, false), { ang: PI / 2 + 0.04, v: v * 0.85, per: 3.6, seed, bg: 0.15, wExp: 0.9, jit: 0.3, streak: 0.4, over: true, alpha: 0.9, lum: 1 });
  const rl = rng(seed + 3);
  for (let i = 1; i < n * 2; i += 2) { const x = lerp(x0, x1, i / (n * 2)) + (rl() - 0.5) * 2; ink(g, [[x, bot(x) - 6 - rl() * 6], [x + 0.5, bot(x)]], 1.3 + rl() * 0.8, grey(0.08, 0.9), { seed: seed + i }); }
  ink(g, pts, 1.3, "#040404", { closed: true, seed: seed + 50, jit: 0.2 });
  ink(g, top, 1.6, grey(0.97), { smooth: true, seed: seed + 51, ends: 0.5 });
}
function laceLine(g, pts, w = 2.2) { ink(g, pts, w + 1.8, "#040404", { smooth: true, seed: pts[0][0], ends: 0.7, jit: 0.1 }); ink(g, pts, w, grey(0.93), { smooth: true, seed: pts[0][0] + 1, ends: 0.55, jit: 0.1 }); }
export function paintBoots(g) {
  const paintPart = (pts, v, ang, seed, o = {}) => { fill(g, S(pts, o.smooth ?? true), grey(v * 0.5)); clothPaint(g, S(pts, o.smooth ?? true), { vp: (c) => { c.fillStyle = o.grad ? lgrad(c, ...o.grad, [[0, v * (o.k0 ?? 1.2)], [1, v * (o.k1 ?? 0.7)]]) : grey(v); c.fillRect(890, 750, 380, 150); }, ang, per: 3.2, seed, segL: [8, 22], gapL: [2, 6], hiW: [0.7, 1.3], baseK: 0.9 }); ink(g, pts, 1.2, "#040404", { closed: true, smooth: o.smooth ?? true, seed: seed + 1, jit: 0.2 }); };
  // ---- left boot ----
  paintPart([[933, 792], [985, 784], [1030, 790], [1052, 800], [1060, 822], [1060, 850], [1005, 856], [960, 850], [930, 830]], 0.28, 1.3, 1300);
  paintPart([[1004, 800], [1040, 796], [1058, 806], [1062, 850], [1008, 856]], 0.22, 1.2, 1302, { grad: [1004, 800, 1062, 856] });
  paintPart([[905, 847], [912, 833], [935, 827], [960, 829], [980, 839], [990, 857], [960, 861], [920, 861]], 0.6, 0.1, 1304, { grad: [905, 822, 990, 856], k0: 1.1, k1: 0.7 });
  ink(g, [[907, 842], [914, 832], [935, 827.5], [960, 829.5], [980, 839]], 1.6, grey(0.88), { smooth: true, ends: 0.4, seed: 1305 });
  paintPart([[974, 775], [990, 771], [1008, 773], [1010, 792], [976, 794]], 0.42, 0.05, 1306);
  fill(g, S([[981, 777], [994, 776], [995, 785], [981, 786]], true), grey(0.25)); ink(g, [[981, 777], [994, 776], [995, 785], [981, 786]], 1.1, grey(0.8), { closed: true, smooth: true, seed: 1308 });
  soleLugs(g, [[999, 851], [980, 847], [960, 845], [930, 845], [908, 851], [902, 861]], (x) => 877 + (x - 900) * 0.04, 9, 1310);
  soleLugs(g, [[1062, 849], [1040, 849], [1018, 853]], (x) => 872, 5, 1312, 0.56);
  softEll(g, 916, 864, 16, 13, 0, "rgba(8,8,8,0.8)", 4);
  for (const pts of [[[963, 800], [955, 796], [952, 802], [960, 808], [975, 804], [982, 796]], [[982, 796], [996, 792], [1012, 794], [1018, 800], [1008, 806], [992, 800]],
    [[950, 818], [965, 812], [990, 812]], [[955, 826], [975, 822], [1000, 820]], [[948, 810], [960, 822]], [[985, 800], [980, 812], [972, 826]], [[992, 802], [996, 814]]]) laceLine(g, pts);
  fill(g, [[984, 794], [990, 794], [990, 800], [984, 800]], grey(0.9));
  // ---- right boot ----
  paintPart([[1127, 800], [1165, 790], [1200, 790], [1230, 800], [1240, 830], [1195, 846], [1150, 848], [1126, 836]], 0.14, 1.6, 1320);
  paintPart([[1121, 790], [1165, 782], [1168, 800], [1126, 810]], 0.72, 0.1, 1322, { grad: [1121, 782, 1168, 810], k0: 1.15, k1: 0.8 });
  paintPart([[1205, 776], [1230, 790], [1238, 805], [1228, 808], [1205, 796]], 0.6, 1.0, 1324);
  paintPart([[1168, 851], [1190, 839], [1225, 839], [1243, 853], [1243, 863], [1170, 863]], 0.64, 0.05, 1326, { grad: [1168, 834, 1243, 858], k0: 1.1, k1: 0.75 });
  ink(g, [[1170, 849], [1190, 839.5], [1225, 839.5], [1242, 852]], 1.6, grey(0.88), { smooth: true, ends: 0.4, seed: 1327 });
  paintPart([[1164, 774], [1180, 769], [1198, 771], [1201, 792], [1165, 794]], 0.42, 0.05, 1328);
  fill(g, S([[1182, 777], [1193, 776], [1194, 783], [1182, 784]], true), grey(0.3)); ink(g, [[1182, 777], [1193, 776], [1194, 783], [1182, 784]], 1.1, grey(0.8), { closed: true, smooth: true, seed: 1330 });
  soleLugs(g, [[1247, 855], [1230, 861], [1200, 863], [1170, 863], [1150, 857], [1130, 851], [1117, 853]], (x) => x < 1150 ? 878 : 883, 11, 1332);
  softEll(g, 1136, 866, 20, 13, 0, "rgba(8,8,8,0.75)", 4);
  for (const pts of [[[1168, 800], [1158, 796], [1150, 800], [1152, 812], [1170, 806]], [[1190, 800], [1206, 794], [1222, 798], [1220, 808], [1205, 810], [1192, 802]],
    [[1150, 820], [1170, 814], [1196, 816]], [[1160, 830], [1185, 824], [1210, 826]], [[1178, 802], [1170, 816], [1160, 830]], [[1192, 804], [1200, 818], [1210, 830]], [[1172, 836], [1190, 832]]]) laceLine(g, pts);
  fill(g, [[1176, 797], [1183, 797], [1183, 803], [1176, 803]], grey(0.9));
  // (fix pass 1) the laces cross four or five times down the tongue (plate at 3x), not twice
  for (const [cx, y0, w, n] of [[978, 808, 44, 4], [1182, 812, 50, 4]]) {
    for (let i = 0; i < n; i++) { const y = y0 + i * 6.5, hw = w / 2 - i * 1.5; laceLine(g, [[cx - hw, y], [cx, y + 2.2], [cx + hw, y + 0.8]], 1.7); laceLine(g, [[cx - hw + 3, y + 3.5], [cx - 2, y + 1], [cx + hw - 2, y + 4]], 1.4); }
  }
}
