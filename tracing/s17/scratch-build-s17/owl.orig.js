// s17 owl: the owl inside the sōko illustration (47.84–53.24). Key poses measured on the source (page pixels),
// interpolated, and sampled on the source's drawing times (it animates on twos from ~49.3 s, on ones for the dash).
// Keys are written in PAGE PIXELS (= frame pixels once the pull-back has settled) and converted to owl units here.
import { mergePose } from "../../lib/owlInk.js";

// ---------------------------------------------------------------- pose interpolation
// numbers lerp, arrays of equal length lerp element-wise, objects key by key; anything else switches at u = 0.5.
export function mixPose(a, b, u) {
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((v, i) => mixPose(v, b[i], u));
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) o[k] = b[k]; else if (!(k in b)) o[k] = a[k]; else o[k] = mixPose(a[k], b[k], u);
    }
    return o;
  }
  return u < 0.5 ? a : b;
}

// eye look used here: the source's owl has round, thin-rimmed eyes with small pupils (no heavy lids)
const ROUND = { pupil: 0.3, lid: 0, curve: 0, slant: 0, lidW: 0.05, low: 0, ext: 0 };

// ---------------------------------------------------------------- key poses in page px
// head {x,y,r (px), yaw,pitch,roll}, body {x,y,a,b (px), rot}, tail {base,dir,len(px),n,spread,w(px)} | null,
// wings [{S,Wr,T (px), trail, len (px), n, m, ...}] (0 = the owl's left = viewer-right wing, 1 = viewer-left),
// feet [{x,y (px), rot, size (px), spread, curl}], eyes {r (px), spread, el, look}, beak {..., w,l in px}
const A = {
  root: [735, 505], s: 0.4,
  head: { x: 706.6, y: 458.9, r: 40.3, yaw: 0.866, pitch: 0, roll: -0.366, square: 2.1 },
  body: { x: 735, y: 500, a: 56, b: 44, rot: 0.15 },
  tail: { base: [737, 530], dir: [0.1, 1], len: 2, n: 5, spread: 0.8, w: 7 },
  wings: [
    { lead: [[745, 452], [753, 436], [775, 434], [796, 460]], tips: [[800, 484], [792, 484], [783, 479], [773, 473], [763, 467], [754, 461], [748, 456]] },
    { lead: [[695, 487], [670, 503], [648, 525], [630, 543]], tips: [[625, 548], [640, 547], [658, 545], [675, 540], [690, 535], [703, 530], [712, 525]] },
  ],
  // the feet hook over the desk's front edge: long pale toes curling down to y ~545 (source 48.7–50.4)
  feet: [
    { x: 776, y: 515, rot: 0.08, size: 28, fat: 0.24, toes: 3, spread: 0.42, curl: -0.22, seed: 2, leg: [-2, -6], claw: 0.16 },
    { x: 795, y: 518, rot: -1.5, size: 22, fat: 0.24, toes: 3, spread: 0.9, curl: 0.35, seed: 5, leg: [-10, -2], claw: 0.16 },
  ],
  order: ["farHP", "wing:0", "tail", "body", "wing:1", "head", "nearHP", "foot:0", "foot:1"],
  eyes: { r: 10.9, spread: 0.4, el: -0.18, look: [0.6, -0.6] },
  beak: { az: 0, el: -0.43, lift: 1.05, w: 9.6, l: 11.2, open: 0 },
  plaster: { az: 0.25, el: 0.93, w: 14.4, h: 4.4 },
  headphones: { yaw: 0.866, dx: 0, dy: 0.05, lift: 1.0, r: 17, bandR: 0.96, bandH: 1.24, tilt: 0.1, open: 0.9, cupEl: 0.0, w: 5.6 },
  tuft: { dx: -36, dy: -8, ang: 3.55, len: 13, n: 3, spread: 0.7 },
};
const B = mergePose(A, {
  head: { x: 706.6, y: 457.4, r: 39.7, yaw: 0.873, roll: -0.388 },
  headphones: { yaw: 0.873 },
  wings: [
    { lead: [[753, 445], [765, 424], [790, 422], [815, 428]], tips: [[822, 432], [818, 442], [811, 451], [802, 459], [792, 466], [782, 471], [772, 474]] },
    { lead: [[693, 487], [670, 495], [640, 507], [605, 523]], tips: [[597, 527], [605, 534], [620, 537], [637, 538], [660, 537], [685, 532], [700, 527]] },
  ],
  feet: [{ x: 775, y: 516, rot: 0.08, size: 28, fat: 0.24, toes: 3, spread: 0.42, curl: -0.22, seed: 2, leg: [-2, -6], claw: 0.16 }, { x: 796, y: 518, rot: -1.5, size: 22, fat: 0.24, toes: 3, spread: 0.9, curl: 0.35, seed: 5, leg: [-10, -2], claw: 0.16 }],
  eyes: { el: -0.17 },
  beak: { el: -0.5 },
});
const C = mergePose(B, {
  head: { x: 706.9, y: 454.2, r: 40.7, yaw: 0.816, roll: -0.437 },
  headphones: { yaw: 0.816 },
  body: { x: 740, y: 503, a: 56, b: 46, rot: 0.3 },
  tail: { base: [738, 533], dir: [0.1, 1], len: 22, n: 5, spread: 0.8, w: 8 },
  wings: [
    { lead: [[748, 460], [755, 425], [775, 402], [805, 384]], tips: [[809, 381], [815, 395], [810, 410], [808, 425], [803, 440], [795, 452], [785, 462]] },
    { lead: [[700, 485], [670, 482], [630, 485], [590, 492]], tips: [[575, 495], [583, 510], [600, 520], [620, 528], [640, 533], [662, 535], [685, 532]] },
  ],
  feet: [{ x: 773, y: 517, rot: 0.1, size: 27, fat: 0.24, toes: 3, spread: 0.45, curl: -0.2, seed: 2, leg: [-2, -6], claw: 0.16 }, { x: 796, y: 517, rot: -1.45, size: 22, fat: 0.24, toes: 3, spread: 0.9, curl: 0.35, seed: 5, leg: [-10, -2], claw: 0.16 }],
  eyes: { el: -0.15, look: [0.6, -0.5] },
  beak: { el: -0.57 },
});
const D = mergePose(C, {
  head: { x: 705.6, y: 451.2, r: 42.1, yaw: 0.793, roll: -0.387 },
  headphones: { yaw: 0.793 },
  body: { x: 740, y: 500, a: 52, b: 48, rot: 0.8 },
  tail: { base: [733, 532], dir: [0, 1], len: 36, n: 5, spread: 1.3, w: 8 },
  wings: [
    { lead: [[748, 465], [750, 430], [758, 398], [774, 358]], tips: [[779, 356], [795, 368], [802, 388], [802, 410], [800, 428], [793, 445], [783, 462]] },
    { lead: [[690, 480], [655, 468], [620, 458], [578, 446]], tips: [[572, 445], [572, 470], [588, 494], [606, 510], [632, 522], [660, 527], [690, 527]] },
  ],
  feet: [{ x: 762, y: 527, rot: 0.05, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 793, y: 520, rot: -1.6, size: 18, fat: 0.22, toes: 3, spread: 0.75, curl: 0.4, seed: 5, leg: [-12, -3] }],
  eyes: { r: 11, el: -0.09, look: [0.4, -0.2] },
  beak: { el: -0.44 },
});
const E = mergePose(D, {
  head: { x: 704.6, y: 441, r: 43.7, yaw: 0.62, roll: -0.395 },
  headphones: { yaw: 0.62 },
  body: { x: 742, y: 503, a: 50, b: 48, rot: 1.4 },
  tail: { base: [728, 530], dir: [0, 1], len: 40, n: 5, spread: 1.4, w: 9 },
  wings: [
    { lead: [[750, 470], [748, 430], [752, 390], [760, 346]], tips: [[763, 342], [780, 350], [795, 375], [801, 398], [801, 420], [795, 440], [785, 460]] },
    { lead: [[690, 476], [660, 460], [620, 442], [585, 420]], tips: [[580, 417], [574, 450], [582, 470], [600, 484], [620, 504], [645, 514], [675, 520]] },
  ],
  feet: [{ x: 755, y: 520, rot: 0, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 790, y: 510, rot: -1.3, size: 18, fat: 0.22, toes: 3, spread: 0.80, curl: 0.3, seed: 5, leg: [-12, -3] }],
  eyes: { r: 12, el: -0.09, look: [0.2, 0] },
  beak: { el: -0.52, open: 0.5 },
});
const F = mergePose(E, {
  head: { x: 707.2, y: 430.1, r: 43.3, yaw: 0.462, roll: -0.375 },
  headphones: { yaw: 0.462 },
  body: { x: 739, y: 498, a: 46, b: 47, rot: 1.5 },
  tail: { base: [722, 530], dir: [-0.1, 1], len: 40, n: 5, spread: 1.6, w: 9 },
  wings: [
    { lead: [[762, 468], [758, 420], [757, 385], [758, 338]], tips: [[758, 332], [777, 340], [792, 362], [802, 388], [803, 415], [795, 440], [785, 460]] },
    { lead: [[690, 470], [655, 450], [620, 428], [590, 405]], tips: [[583, 398], [573, 428], [582, 455], [600, 482], [622, 500], [650, 510], [682, 514]] },
  ],
  feet: [{ x: 752, y: 517, rot: 0, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 790, y: 507, rot: -1.25, size: 18, fat: 0.22, toes: 3, spread: 0.80, curl: 0.3, seed: 5, leg: [-12, -3] }],
  eyes: { r: 13.5, el: -0.09, look: [-0.15, 0] },
  beak: { el: -0.53, open: 0.6 },
});
const G = mergePose(F, {
  head: { x: 706.8, y: 415, r: 46, yaw: 0.446, roll: -0.257, pitch: 0.12 },
  headphones: { yaw: 0.446 },
  body: { x: 735, y: 485, a: 48, b: 46, rot: 1.5 },
  tail: { base: [718, 520], dir: [-0.1, 1], len: 40, n: 5, spread: 1.6, w: 10 },
  wings: [
    { lead: [[767, 455], [759, 420], [759, 370], [760, 327]], tips: [[760, 322], [777, 325], [793, 348], [803, 377], [805, 405], [800, 428], [790, 445]] },
    { lead: [[690, 460], [655, 440], [620, 415], [590, 380]], tips: [[585, 373], [575, 402], [580, 432], [596, 466], [618, 490], [648, 500], [680, 505]] },
  ],
  feet: [{ x: 740, y: 510, rot: 0, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 785, y: 495, rot: -1.3, size: 18, fat: 0.22, toes: 3, spread: 0.80, curl: 0.3, seed: 5, leg: [-12, -3] }],
  eyes: { r: 15.5, el: -0.075, look: [0, 0.1] },
  beak: { el: -0.52, open: 0.6 },
});

// ---------------------------------------------------------------- the launch (52.52–52.64, on ones)
const feetU = (d, g) => [
  { x: d[0], y: d[1], rot: d[2], size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] },
  { x: g[0], y: g[1], rot: g[2], size: 18, fat: 0.22, toes: 3, spread: 0.80, curl: 0.3, seed: 5, leg: [-12, -3] },
];
const L1 = mergePose(G, {
  head: { x: 713, y: 413, r: 47, yaw: 0.35, roll: -0.2, pitch: 0.05 },
  headphones: { yaw: 0.35 },
  body: { x: 742, y: 478, a: 48, b: 45, rot: 1.5 },
  tail: { base: [725, 512], dir: [-0.3, 1], len: 34, n: 5, spread: 1.4, w: 10 },
  wings: [
    { lead: [[765, 452], [757, 420], [755, 370], [756, 320]], tips: [[756, 315], [778, 321], [796, 344], [807, 373], [805, 405], [798, 430], [787, 452]] },
    { lead: [[690, 455], [655, 440], [620, 410], [595, 378]], tips: [[591, 385], [578, 410], [582, 435], [596, 460], [621, 472], [650, 490], [679, 498]] },
  ],
  feet: feetU([740, 512, 0], [785, 495, -1.3]),
  eyes: { r: 15, look: [-0.6, -0.6] },
});
const L2 = mergePose(L1, {
  head: { x: 727, y: 419, r: 48, yaw: 0.35, roll: 0.05, pitch: 0 },
  headphones: { yaw: 0.35 },
  body: { x: 752, y: 482, a: 48, b: 44, rot: 1.6 },
  tail: { base: [735, 512], dir: [-0.2, 1], len: 28, n: 5, spread: 1.3, w: 10 },
  wings: [
    { lead: [[776, 452], [768, 420], [765, 370], [764, 318]], tips: [[763, 313], [783, 322], [805, 355], [817, 391], [812, 420], [800, 440], [790, 455]] },
    { lead: [[700, 460], [665, 440], [630, 410], [612, 375]], tips: [[609, 383], [592, 410], [600, 439], [621, 464], [654, 483], [685, 501], [704, 512]] },
  ],
  feet: feetU([754, 518, 0.1], [800, 500, -1.2]),
  eyes: { r: 14, look: [-0.2, 0.05] },
});
const L3 = mergePose(L2, {
  head: { x: 742, y: 440, r: 47, yaw: 0.3, roll: 0.1, pitch: 0 },
  headphones: { yaw: 0.3 },
  body: { x: 750, y: 490, a: 44, b: 46, rot: 1.7 },
  tail: { base: [735, 522], dir: [-0.4, 1], len: 22, n: 5, spread: 1.3, w: 10 },
  wings: [
    { lead: [[778, 465], [774, 420], [772, 370], [772, 325]], tips: [[772, 321], [788, 333], [804, 366], [816, 405], [812, 434], [802, 450], [788, 462]] },
    { lead: [[715, 470], [680, 440], [650, 400], [622, 372]], tips: [[618, 383], [623, 414], [632, 453], [654, 482], [679, 498], [700, 511], [715, 518]] },
  ],
  feet: feetU([745, 522, 0.2], [790, 512, -1.3]),
  eyes: { r: 13, look: [-0.3, 0.1] },
});
// 52.64: the blurred turn over the mug. The source's body sits centred over the mug's left half (body centre ~x 790)
// with the owl in front of the mug, feet on the desk edge at x ~778 / 822.
const L4X = 20, sh4 = (p) => [p[0] + L4X, p[1]];
const L4 = mergePose(L3, {
  head: { x: 760 + L4X, y: 438, r: 47, yaw: 0.05, roll: 0.05 },
  headphones: { yaw: 0.05 },
  body: { x: 772 + L4X, y: 492, a: 62, b: 36, rot: 0.05 },
  tail: { base: sh4([835, 505]), dir: [1, 0.3], len: 14, n: 4, spread: 0.8, w: 10 },
  wings: [
    { lead: [[808, 452], [835, 432], [865, 415], [895, 405]].map(sh4), tips: [[898, 405], [890, 420], [880, 431], [868, 440], [855, 447], [840, 452], [825, 455]].map(sh4) },
    { lead: [[752, 462], [722, 452], [690, 445], [658, 440]].map(sh4), tips: [[655, 441], [662, 453], [672, 463], [684, 471], [698, 477], [712, 480], [726, 480]].map(sh4) },
  ],
  feet: feetU([778, 528, 0.1], [822, 526, -0.3]),
  eyes: { look: [0, 0.6], over: { lid: 0.62, lidW: 0.15 } },
  blur: [8, 1.5],
});

// ---------------------------------------------------------------- the dash to the left (52.68–53.24, on ones)
// Side view, head leading; wing states measured relative to the head centre (px).
const NEAR = {
  BMID: { lead: [[45, 8], [85, -2], [120, -12], [150, -20]], tips: [[153, -20], [150, -8], [142, 2], [132, 10], [118, 16], [100, 20], [82, 22]] },
  FWD: { lead: [[4, 28], [-28, 34], [-60, 40], [-92, 46]], tips: [[-98, 52], [-88, 60], [-74, 64], [-58, 66], [-42, 64], [-26, 60], [-10, 54]] },
  UP: { lead: [[56, 9], [62, -30], [72, -70], [82, -103]], tips: [[83, -107], [105, -90], [117, -67], [125, -40], [132, -15], [128, 2], [115, 10]] },
  BUP: { lead: [[45, 5], [75, -10], [105, -25], [132, -36]], tips: [[135, -37], [142, -24], [145, -10], [143, 5], [135, 15], [120, 20], [100, 22]] },
  BACK: { lead: [[45, 10], [90, 5], [130, 5], [165, 9]], tips: [[167, 11], [160, 18], [150, 22], [138, 25], [122, 27], [104, 27], [85, 26]] },
  DOWN: { lead: [[12, 30], [-12, 44], [-38, 56], [-60, 64]], tips: [[-64, 68], [-54, 76], [-42, 80], [-30, 80], [-18, 78], [-6, 72], [5, 64]] },
};
// Far wing, seen behind the head. The source shows it only as a short fan of 3-5 pointed feather tips: over the
// front of the crown when the wings are up (UP: tips ~head+(-32..+2, -94..-80), a fan ~35 px wide), or peeking
// out behind the far headphone cup (SPK: spikes to ~head+(50..72, -58..-40)). The arm itself is hidden by the head.
const FAR = {
  BACKF: { lead: [[45, 4], [90, -2], [130, -4], [165, -2]], tips: [[167, 0], [160, 8], [150, 13], [138, 16], [122, 18], [104, 18], [85, 17]] },
  UP: { lead: [[14, -30], [6, -40], [-4, -48], [-14, -54]], tips: [[-34, -84], [-26, -92], [-17, -95], [-8, -93], [0, -87], [7, -78]], sub: 0, cw: 0.2, fw: 0.9, rmax: 0.9 },
  SPK: { lead: [[36, -8], [42, -14], [48, -20], [53, -25]], tips: [[74, -40], [71, -50], [64, -57], [56, -58], [49, -54]], sub: 0, cw: 0.2, fw: 0.8, rmax: 0.9 },
  BK: { lead: [[40, 0], [62, 4], [86, 8], [112, 10]], tips: [[116, 10], [110, 15], [103, 17], [96, 18], [89, 18], [82, 17], [75, 16]] },
};
function flyKey(hx, hy, near, far, o = {}, ns = 0) {
  if (near === "DOWN") o = mergePose({
    body: { x: hx + 62, y: hy + 42, a: 60, b: 44, rot: 0.3 },
    feet: [
      { x: hx + 100, y: hy + 80, rot: -0.7, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 2, leg: [-6, -8] },
      { x: hx + 112, y: hy + 74, rot: -0.9, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 5, leg: [-6, -8] },
    ],
  }, o);
  const rel = (p) => [hx + p[0], hy + p[1]];
  const W = (w, sh = 0) => ({ ...w, lead: w.lead.map((p, i) => rel([p[0] + sh * (0.6 + 0.4 * i / (w.lead.length - 1)), p[1]])), tips: w.tips.map((p) => rel([p[0] + sh, p[1]])) });
  return mergePose({
    root: [hx + 62, hy + 30], s: 0.45,
    head: { x: hx, y: hy + 2, r: 40, sx: 1.08, yaw: -0.35, pitch: 0, roll: -0.29, square: 2.1 },
    body: { x: hx + 60, y: hy + 38, a: 58, b: 42, rot: 0.3 },
    tail: { base: rel([106, 56]), dir: [1, 0.55], len: 15, n: 4, spread: 0.7, w: 9 },
    wings: [W(FAR[far]), W(NEAR[near], ns)],
    feet: [
      { x: hx + 98, y: hy + 66, rot: -0.7, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 2, leg: [-6, -8] },
      { x: hx + 110, y: hy + 60, rot: -0.9, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 5, leg: [-6, -8] },
    ],
    order: ["farHP", "wing:0", "tail", "body", "foot:0", "foot:1", "head", "nearHP", "wing:1"],
    eyes: { r: 11, spread: 0.4, el: -0.15, look: [-0.8, 0.05] },
    beak: { az: 0, el: -0.45, lift: 1.05, w: 10, l: 11.5, open: 0.35 },
    plaster: { az: 0.1, el: 1.0, w: 15, h: 4.6 },
    headphones: { yaw: -0.35, dx: 0, dy: 0.0, lift: 1.0, r: 15, bandR: 1.0, bandH: 1.02, tilt: 0.1, open: 0.8, cupEl: 0.0, w: 5.5 },
    tuft: { dx: 44, dy: -22, ang: -0.45, len: 20, n: 5, spread: 1.5, w: 0.3 },
    blur: [4, 0],
  }, o);
}
// one drawing per frame: [time, head x, head y, near wing, far wing]
const FLY = [
  [52.68, 740, 443, "FWD", "BACKF", 0, 0, { head: { r: 46 }, body: { x: 800, y: 482, a: 80, b: 42, rot: 0.06 }, tail: { base: [868, 494], dir: [1, 0.2], len: 20 } }], [52.72, 705, 453, "DOWN", "BK"], [52.76, 677, 453, "BUP", "SPK"], [52.80, 647, 450, "UP", "UP"],
  [52.84, 612, 445, "BUP", "SPK"], [52.88, 590, 445, "DOWN", "BK", 0, 7], [52.92, 570, 447, "BUP", "SPK"], [52.96, 537, 449, "UP", "UP"],
  [53.00, 512, 448, "BUP", "SPK"], [53.04, 512, 448, "BUP", "SPK"], [53.08, 480, 447, "DOWN", "BK", 0, 7], [53.12, 452, 452, "BACK", "SPK", 0, 7],
  [53.16, 428, 450, "UP", "UP"], [53.20, 400, 452, "BMID", "SPK"],
];

// key poses: { t (film s), pose }
export const KEYS = [
  { t: 48.72, p: A },
  { t: 49.08, p: A },
  { t: 49.88, p: B, ease: (u) => u * u },
  { t: 50.40, p: C },
  { t: 50.88, p: D },
  { t: 51.36, p: E },
  { t: 51.80, p: F },
  { t: 52.44, p: G },
];
const ONES = [[52.52, L1], [52.56, L2], [52.60, L3], [52.64, L4], ...FLY.map(([t, x, y, n, f, ns, bl, o]) => [t, flyKey(x, y, n, f, { ...(o || {}), ...(bl ? { blur: [bl, 0] } : {}) }, ns || 0)])];

// The source's drawing times (frame diffs of the owl and the steam): the illustration is animated on twos from the
// cut (47.84, 47.92, ...), with three-frame holds at 49.52, 50.52 and 51.52, then on ones from 52.52 (53.04 repeats
// 53.00). The owl holds its first drawing until 49.12.
const DRAW = [];
for (let k = 0; ; k++) { const t = +(47.84 + 0.08 * k).toFixed(2); if (t > 49.53) break; DRAW.push(t); }
for (const [a, b] of [[49.64, 50.53], [50.64, 51.53], [51.64, 52.45]]) for (let t = a; t < b; t += 0.08) DRAW.push(+t.toFixed(2));
export function drawTick(t) {
  if (t >= 52.52 - 1e-6) return Math.abs(t - 53.04) < 0.01 ? 53.0 : t;
  let d = DRAW[0];
  for (const x of DRAW) if (x <= t + 1e-6) d = x;
  return d;
}
export function drawingTime(t) { const d = drawTick(t); return d < 49.12 - 1e-6 ? 48.72 : d; }
// the owl for film time t: a pose in owl units (placement in page px)
export function owlFrame(t) {
  if (t >= 52.52 - 1e-6) {
    let k = ONES[0][1];
    for (const [tt, p] of ONES) if (tt <= t + 1e-6) k = p;
    return toUnits(k);
  }
  return owlAt(drawingTime(t));
}

// ---------------------------------------------------------------- px -> owl units
export function toUnits(K) {
  const s = K.s, R = K.root, u = (p) => [(p[0] - R[0]) / s, (p[1] - R[1]) / s], d = (v) => v / s;
  const h = K.head, hr = d(h.r);
  const hc = u([h.x, h.y]);
  return {
    x: R[0], y: R[1], s, rot: K.rot || 0,
    light: [-0.55, -0.83],
    head: { x: hc[0], y: hc[1], rx: hr * (h.sx ?? 1), ry: hr, yaw: h.yaw, pitch: h.pitch || 0, roll: h.roll || 0, square: h.square ?? 2.1, jowl: 0.04 },
    body: K.body ? { x: u([K.body.x, K.body.y])[0], y: u([K.body.x, K.body.y])[1], a: d(K.body.a), b: d(K.body.b), rot: K.body.rot || 0, egg: K.body.egg || 0, sag: 0 } : null,
    tail: K.tail && K.tail.len > 3 ? { base: u(K.tail.base), dir: K.tail.dir, len: d(K.tail.len), n: K.tail.n, spread: K.tail.spread, w: d(K.tail.w) } : null,
    wings: K.wings.map((w) => ({ ...w, lead: w.lead.map(u), tips: w.tips.map(u) })),
    feet: K.feet.map((f) => ({ ...f, x: u([f.x, f.y])[0], y: u([f.x, f.y])[1], size: d(f.size), leg: f.leg ? [d(f.leg[0]), d(f.leg[1])] : null })),
    order: K.order,
    eyes: { state: "wide", r: d(K.eyes.r), spread: K.eyes.spread, el: K.eyes.el, look: K.eyes.look, over: { ...ROUND, ...(K.eyes.over || {}) }, left: K.eyes.left, right: K.eyes.right },
    beak: { ...K.beak, w: d(K.beak.w), l: d(K.beak.l) },
    plaster: { ...K.plaster, w: d(K.plaster.w), h: d(K.plaster.h) },
    headphones: { on: true, ...K.headphones, r: d(K.headphones.r), w: d(K.headphones.w) },
    tuft: K.tuft ? { ...K.tuft, dx: d(K.tuft.dx), dy: d(K.tuft.dy), len: d(K.tuft.len) } : null,
    disc: 1, blur: K.blur, flip: K.flip,
  };
}

// the owl at film time t (continuous; the caller quantises to the drawing times). Returns a pose in owl units.
export function owlAt(t) {
  const K = KEYS;
  let k;
  if (t <= K[0].t) k = K[0].p;
  else if (t >= K[K.length - 1].t) k = K[K.length - 1].p;
  else {
    for (let i = 1; i < K.length; i++) {
      if (t <= K[i].t) {
        const a = K[i - 1], b = K[i], u = (t - a.t) / (b.t - a.t);
        k = mixPose(a.p, b.p, b.ease ? b.ease(u) : u);
        break;
      }
    }
  }
  return toUnits(k);
}
