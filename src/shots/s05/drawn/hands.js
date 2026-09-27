// s05 drawn: his hands and forearms (settled frame px). The left hand on the keys with its sleeve coming up from the
// bottom edge; the right hand on the trackpad (pose A: the rest frame 24.88–25.08, index finger on the pad, middle and
// ring curled under, thumb tucked) with its forearm in the pale sleeve. Pose B (25.48–26.68, and most of the shot) is
// the same hand slid right and up with the index finger and thumb a little more extended, drawn in pose B's own frame
// (the shot's HAND_RB / HAND_AB tracks move it). Outlines and the main inner lines are control points measured on the
// rest frame (ink centre-lines, simplified to ~1.5 px, joined by hand); light: coarse fitted fields (./handvals.js).
// Shading, knuckles, tendons, nails and the sleeve folds are drawn.
import { hatchPaint, ink, fill, fillSoft, dot, grey, lerp, clamp, rng, PI, TAU, ELL, taper, sampleCurve, smoothPath, polyPath, blurDraw, pageDev, scr, fbm } from "./kit.js";
import { HV } from "./handvals.js";
import { HVP } from "./handvalsP.js";
import { fieldV } from "./desk.js";

const dark = (g, pts, w = 1.6, seed = 1, o = {}) => ink(g, pts, w, o.c || "#070707", { seed, ends: o.ends ?? 0.45, jit: o.jit ?? 0.15, closed: o.closed, smooth: o.smooth ?? true });
const shade = (g, pts, w, a, seed) => ink(g, pts, w, `rgba(25,25,25,${a})`, { seed, ends: 0.1, jit: 0.2, smooth: true });

function paintField(g, sh, vf, { dx = 0, dy = 0, mot = 0.035, smooth = true, gain = 1 } = {}) {
  const xs = sh.map((p) => p[0]), ys = sh.map((p) => p[1]), bb = [Math.min(...xs) - 3, Math.min(...ys) - 3, Math.max(...xs) + 3, Math.max(...ys) + 3];
  const D = pageDev(bb), c = scr("hpf", D.w, D.h), cg = c.getContext("2d"), id = cg.createImageData(D.w, D.h), d = id.data;
  for (let j = 0; j < D.h; j++) for (let i = 0; i < D.w; i++) {
    const x = D.X0 + i + 0.5, y = D.Y0 + j + 0.5, v = clamp(gain * vf(x - dx, y - dy) * (1 + mot * (fbm(x / 8, y / 8, 91, 3) - 0.5) * 2));
    const o = (j * D.w + i) * 4; d[o] = d[o + 1] = d[o + 2] = v * 255; d[o + 3] = 255;
  }
  cg.putImageData(id, 0, 0);
  g.save(); g.beginPath(); if (smooth) smoothPath(g, sh, true, 0.3); else polyPath(g, sh); g.clip(); g.drawImage(c, 0, 0, D.w, D.h, D.X0, D.Y0, D.w, D.h); g.restore();
}
// a soft shadow painted inside the current clip
const shadow = (g, pts, a, blur) => blurDraw(g, [Math.min(...pts.map((p) => p[0])) - 2, Math.min(...pts.map((p) => p[1])) - 2, Math.max(...pts.map((p) => p[0])) + 2, Math.max(...pts.map((p) => p[1])) + 2], blur, (c) => { c.beginPath(); smoothPath(c, pts, true); c.fillStyle = `rgba(15,15,15,${a})`; c.fill(); });

// ---------------------------------------------------------------- left hand + sleeve
// Fix pass 2: the fingers are drawn as fingers (four curled over the key rows, dark gaps between them where the keys
// show), the hand's back is smooth skin with soft tendon streaks (the short hair-like strokes are gone), and the lit
// parts reach the source's near-white. Contours: ink centre-lines measured at 3x (control points).
const LH = [[600, 741], [597, 735], [604, 731], [626, 727], [634, 720], [632, 708], [638, 697], [648, 686], [662, 678], [680, 676], [700, 668], [722, 660], [727, 650], [737, 645], [748, 645], [756, 652], [766, 657], [791, 671], [803, 685], [820, 706], [846, 718], [859, 734], [864, 760], [868, 791], [876, 803], [853, 810], [826, 826], [808, 845], [798, 862], [780, 858], [769, 847], [755, 843], [726, 825], [700, 800], [671, 772], [645, 760], [620, 755], [607, 750]];
const LSLEEVE = [[797, 868], [804, 854], [808, 845], [830, 823], [856, 809], [876, 805], [900, 810], [920, 830], [950, 855], [1000, 885], [1060, 920], [1110, 960], [1110, 1000], [785, 1000], [790, 946]];
// the curled fingers (tip -> knuckle centre-lines) and their widths; the gaps between them
const LF = [
  [[[599, 742], [612, 738], [630, 734], [648, 726]], 16],       // index, pressing a key on the left
  [[[630, 718], [636, 704], [648, 690], [664, 682]], 18],       // middle
  [[[660, 677], [672, 668], [690, 660], [708, 662]], 18],       // ring
  [[[720, 664], [732, 654], [746, 650], [760, 658]], 16],       // little
];
export function paintLeftHand(g) {
  const vH = fieldV(HV.lh), pH = fieldV(HVP.lh, 1.04);
  paintField(g, LH, (x, y) => Math.min(0.95, vH(x, y) * 1.06), { mot: 0.02 });
  const r = rng(801);
  g.save(); g.beginPath(); smoothPath(g, LH, true, 0.3); g.clip();
  // the gaps between the curled fingers: dark (the keys and the shadow under the fingers)
  // (measured at 3x: index / middle (645, 733) - (690, 716), middle / ring (686, 686) - (711, 700), ring / little
  // (728, 667) - (746, 674))
  for (const [pts, w] of [[[[645, 734], [662, 728], [678, 721], [691, 715]], 9], [[[686, 686], [698, 692], [711, 700]], 5], [[[728, 667], [737, 670], [746, 674]], 5]]) taper(g, sampleCurve(pts, 5), (u) => w * Math.pow(Math.sin(PI * clamp(u, 0.05, 0.95)), 0.7), "rgba(8,8,8,0.92)");
  for (const [pts, i] of [[[[737, 681], [751, 688], [761, 709]], 0], [[[728, 690], [735, 704], [753, 719]], 1], [[[634, 709], [639, 713], [650, 713], [653, 716]], 2]]) ink(g, pts, 1.5, "rgba(15,15,15,0.75)", { smooth: true, seed: 845 + i, ends: 0.3 });
  // each finger: a lit top, a darker underside, a knuckle crease
  LF.forEach(([pts, w], i) => {
    const q = sampleCurve(pts, 6);
    taper(g, q.map(([x, y]) => [x + 1.5, y + w * 0.28]), (u) => w * 0.35, `rgba(30,30,30,0.35)`);
    taper(g, q.map(([x, y]) => [x - 1, y - w * 0.2]), (u) => w * 0.3 * Math.sin(PI * clamp(u, 0.1, 0.9)), grey(0.93, 0.6));
    const m = q[Math.floor(q.length * 0.55)];
    ink(g, [[m[0] - 3, m[1] - 4], [m[0], m[1]], [m[0] + 2, m[1] + 4]], 1.2, "rgba(15,15,15,0.7)", { smooth: true, seed: 805 + i, ends: 0.3 });
  });
  // shade down the little-finger side and under the knuckles (soft), tendons toward the knuckles (long soft streaks)
  blurDraw(g, [780, 690, 880, 810], 8, (c) => { c.fillStyle = "rgba(20,20,20,0.3)"; c.beginPath(); c.ellipse(842, 752, 22, 55, -0.35, 0, TAU); c.fill(); });
  blurDraw(g, [640, 740, 740, 830], 8, (c) => { c.fillStyle = "rgba(20,20,20,0.3)"; c.beginPath(); c.ellipse(690, 790, 40, 18, 0.7, 0, TAU); c.fill(); });
  for (let i = 0; i < 5; i++) { const x = 790 + i * 12, y = 812 - i * 6; shade(g, [[x, y], [x - 30, y - 55], [x - 55 - i * 4, y - 105]], 2 + r() * 1.2, 0.2, 810 + i); }
  g.restore();
  // outline (measured contours), the fingers' own contours
  dark(g, LH, 1.9, 820, { closed: true, ends: 0.9 });
  LF.forEach(([pts, w], i) => { const q = sampleCurve(pts, 6); dark(g, q.map(([x, y]) => [x, y + w * 0.48]), 1.4, 830 + i, { ends: 0.4, c: "rgba(8,8,8,0.85)" }); });
  dark(g, [[764, 655], [791, 671]], 1.6, 836); dark(g, [[747, 674], [737, 673], [717, 662]], 1.4, 837); dark(g, [[684, 686], [670, 678], [659, 676]], 1.4, 838); dark(g, [[628, 727], [597, 736]], 1.6, 839);
  // the sleeve: pale cloth with folds round the cuff (long hatched shadow on its right)
  const vS = fieldV(HV.lsleeve), pS = fieldV(HVP.lsleeve, 1.03);
  paintField(g, LSLEEVE, pS, { smooth: false });
  g.save(); g.beginPath(); polyPath(g, LSLEEVE); g.clip();
  hatchPaint(g, LSLEEVE, { vf: vS, paper: pS, mix: 0.55, ang: 1.25, per: 3, len: [40, 110], w: [0.7, 1.4], dk: 0.55, seed: 829, base: false, clip: false });
  for (let i = 0; i < 16; i++) { const x = 810 + r() * 250, y = 850 + r() * 100; shade(g, [[x, y], [x + 10, y + 25], [x + 14, y + 55 + r() * 25]], 1.2 + r() * 1.4, 0.3 + r() * 0.3, 830 + i); }
  g.restore();
  dark(g, [[798, 946], [798, 868], [826, 826], [853, 810], [875, 805], [900, 810], [920, 830], [950, 855], [1000, 885], [1060, 920], [1110, 960]], 2.4, 840, { ends: 0.8 });
}

// ---------------------------------------------------------------- right hand (pose A / B) and forearm
// Fix pass 2: the fingers re-measured on the rest frame at 2x (ink centre-lines) and the top edge checked with column
// profiles (the hand's outline runs (900, 684) - (940, 634) - (1000, 612) - (1100, 600) - (1180, 630); the lines below it
// are the knuckle ridge and a tendon; the palm's lower edge rises to the cuff: (1100, 739) - (1140, 711)): the index finger, the curled middle finger with its nail and the thumb are
// separate shapes with their own contours
const RH = [[862, 722], [872, 710], [886, 697], [900, 684], [920, 662], [940, 634], [960, 626], [980, 617], [1000, 612], [1020, 605], [1060, 607], [1100, 600], [1140, 614], [1160, 622], [1180, 630], [1190, 650], [1180, 672], [1160, 693], [1140, 711], [1120, 727], [1100, 739], [1060, 744], [1043, 746], [1001, 744], [985, 748], [940, 747], [930, 744], [925, 737], [926, 728], [936, 721], [948, 718], [960, 712], [948, 702], [943, 687], [925, 700], [910, 712], [894, 726], [872, 730]];
// pose B = pose A slid (+43, -17) with the index finger and thumb reaching ~18 px further along the pad
const POSE_B_SHIFT = [42.9, -17.0], FINGER_EXT = [18, -2];   // (HAND_R at 26.68: pose B sits (42.9, -17.0) from pose A)
function poseOf(P, pose) {
  if (pose !== "B") return P;
  return P.map(([x, y]) => { const w = clamp((960 - x) / 90); return [x + POSE_B_SHIFT[0] + FINGER_EXT[0] * w, y + POSE_B_SHIFT[1] + FINGER_EXT[1] * w]; });
}
export function paintRightHand(g, pose = "A") {
  const P = (pts) => poseOf(pts, pose);
  const sh = pose === "B" ? POSE_B_SHIFT : [0, 0];
  const vH = fieldV(HV.rh);
  const out = P(RH);
  paintField(g, out, (x, y) => Math.min(0.95, vH(x, y) * 1.07), { dx: sh[0], dy: sh[1], mot: 0.02 });
  const r = rng(851);
  g.save(); g.beginPath(); smoothPath(g, out, true, 0.3); g.clip();
  // shade: under the knuckles toward the palm edge, down the thumb's underside, round the curled finger
  blurDraw(g, [890, 640, 1240, 770], 7, (c) => {
    c.fillStyle = "rgba(20,20,20,0.18)"; c.beginPath(); smoothPath(c, P([[1000, 728], [1080, 722], [1150, 716], [1175, 728], [1150, 742], [1060, 748], [1000, 746]]), true); c.fill();
    c.fillStyle = "rgba(20,20,20,0.24)"; c.beginPath(); smoothPath(c, P([[940, 690], [962, 676], [1000, 672], [1022, 690], [1010, 712], [975, 716], [950, 710]]), true); c.fill();
  });
  // the curled middle finger: its nail (pale, outlined) with hatched shade on its far side (measured at 2x)
  g.beginPath(); smoothPath(g, P([[972, 676], [986, 671], [1002, 676], [1012, 690], [1006, 704], [992, 708], [978, 700]]), true); g.fillStyle = grey(0.66); g.fill();
  for (let i = 0; i < 9; i++) { const a = -0.9 + i * 0.2; const c = P([[996 + Math.cos(a) * 14, 690 + Math.sin(a) * 14], [996 + Math.cos(a) * 26, 690 + Math.sin(a) * 22]]); shade(g, c, 0.9, 0.45, 863 + i); }
  dark(g, P([[973, 676], [986, 671], [1002, 676], [1012, 690], [1006, 704], [994, 708]]), 1.4, 861);
  dark(g, P([[978, 690], [990, 686], [1004, 692]]), 1.1, 862, { c: "rgba(15,15,15,0.7)" });
  // tendons toward the knuckles, the sweat mark
  for (let i = 0; i < 4; i++) shade(g, P([[1150, 652 + i * 11], [1090, 644 + i * 10], [1030, 640 + i * 12]]), 1.8, 0.16, 870 + i);
  dark(g, P([[1067, 671], [1072, 668], [1074, 675], [1069, 681], [1071, 686]]), 1.1, 875, { c: "rgba(15,15,15,0.7)" });
  g.restore();
  // contours (measured): the index finger's lower edge up to its knuckle, the curled finger's edges, the thumb, the
  // knuckle ridge, the back of the hand
  dark(g, P([[865, 724], [872, 730], [894, 726], [917, 703], [940, 686]]), 1.8, 880);
  dark(g, P([[960, 710], [948, 702], [943, 687]]), 1.6, 881);
  dark(g, P([[994, 708], [982, 712], [963, 712]]), 1.6, 882);
  dark(g, P([[973, 676], [945, 681]]), 1.4, 883);
  dark(g, P([[1034, 628], [1014, 620], [1004, 620], [972, 636], [940, 651]]), 1.3, 884, { c: "rgba(12,12,12,0.75)" });
  dark(g, P([[1175, 646], [1148, 642], [1083, 620], [1058, 612]]), 1.2, 885, { c: "rgba(12,12,12,0.6)" });
  dark(g, P([[900, 684], [920, 662], [940, 634], [960, 626], [980, 617], [1000, 612], [1020, 605], [1060, 607], [1100, 600], [1140, 614], [1160, 622], [1180, 630]]), 1.9, 889);
  dark(g, P([[1043, 746], [1001, 744], [985, 748], [940, 747], [930, 744], [925, 737], [926, 728], [936, 721]]), 2, 886);
  dark(g, P([[864, 721], [899, 682]]), 1.8, 887);
  dark(g, P([[951, 740], [948, 723], [939, 722]]), 1.3, 888);
  // nails: index fingertip, thumb
  const nail = (x, y, a, rx, ry) => { const [X, Y] = P([[x, y]])[0]; g.save(); g.translate(X, Y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fillStyle = grey(0.88); g.fill(); g.strokeStyle = "rgba(10,10,10,0.85)"; g.lineWidth = 1.1; g.stroke(); g.restore(); };
  nail(874, 722, -0.8, 6, 4); nail(940, 732, 1.4, 8, 5);
  dark(g, P([[1164, 723], [1161, 715], [1164, 673], [1176, 649]]), 2.2, 891);
}
// (fix 1d: the forearm runs on under the upper arm (points 13-17), so no gap opens when it slides with the hand)
const ARM = [[1188, 634], [1203, 636], [1227, 640], [1262, 642], [1292, 634], [1302, 635], [1326, 643], [1356, 640], [1374, 641], [1388, 638], [1411, 642], [1450, 646], [1504, 642], [1560, 640], [1570, 700], [1500, 740], [1420, 790], [1370, 820], [1345, 795], [1300, 778], [1250, 773], [1210, 766], [1189, 751], [1174, 748], [1167, 738], [1164, 723], [1161, 712], [1162, 686], [1165, 670], [1176, 648]];
const ARM_B_SHIFT = [39.8, -4.7];   // (HAND_A at 26.68)
export function paintArm(g, pose = "A") {
  const sh = pose === "B" ? ARM_B_SHIFT : [0, 0];
  // pose B: the cuff end moves with the hand, the elbow end stays (the sleeve stretches)
  const out = ARM.map(([x, y]) => { const w = pose === "B" ? clamp((1480 - x) / 280) : 0; return [x + ARM_B_SHIFT[0] * w, y + ARM_B_SHIFT[1] * w]; });
  const vA = fieldV(HV.arm), pA = fieldV(HVP.arm, 1.03);
  paintField(g, out, pA, { dx: sh[0] * 0.6, dy: sh[1] * 0.6, smooth: false });
  const r = rng(901);
  g.save(); g.beginPath(); polyPath(g, out); g.clip(); g.translate(sh[0] * 0.6, sh[1] * 0.6);
  hatchPaint(g, ARM, { vf: vA, paper: pA, mix: 0.55, ang: -0.35, per: 3, len: [30, 90], w: [0.6, 1.3], dk: 0.5, seed: 902, base: false, clip: false });
  // cloth folds: long grey streaks along the forearm, short fold marks round the cuff, the measured fold lines
  for (let i = 0; i < 40; i++) { const x = 1190 + r() * 260, y = 650 + r() * 110; shade(g, [[x, y], [x + 25, y - 6 + r() * 4], [x + 50 + r() * 30, y - 10]], 1 + r() * 1.8, 0.18 + r() * 0.3, 910 + i); }
  for (let i = 0; i < 10; i++) { const x = 1175 + r() * 50, y = 650 + r() * 100; shade(g, [[x, y], [x + 6, y + 10], [x + 8, y + 22]], 1.2, 0.3, 940 + i); }
  for (const f of [[[1243, 733], [1241, 706], [1243, 679]], [[1269, 721], [1261, 708], [1254, 690]], [[1427, 716], [1438, 713], [1452, 714]], [[1440, 677], [1442, 672], [1457, 656]]]) dark(g, f, 1.3, 945 + f[0][0], { c: "rgba(15,15,15,0.75)" });
  g.restore();
  dark(g, out.slice(0, 13), 2.2, 950, { ends: 0.8 });
  dark(g, out.slice(21), 2.2, 952, { ends: 0.8 });
}
