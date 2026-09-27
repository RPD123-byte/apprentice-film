// s17 owl: the owl inside the sōko illustration (47.84–53.24). Key poses measured on the source (page pixels),
// interpolated, and sampled on the source's drawing times (it animates on twos from ~49.3 s, on ones for the dash).
// Keys are written in PAGE PIXELS (= frame pixels once the pull-back has settled) and converted to owl units here.
import { mergePose } from "../../lib/owlInk.js";
import { WINGS } from "./wing_data.js";
import { SIL } from "./sil_data.js";
import { SIL_FILL } from "./sil_fill.js";
import { SIL_FILL_DASH } from "./sil_fill_dash.js";

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
  head: { x: 711.6, y: 464.9, r: 40.3, yaw: 0.866, pitch: 0, roll: -0.366, square: 2.1 },
  body: { x: 735, y: 500, a: 56, b: 44, rot: 0.15 },
  tail: { base: [737, 530], dir: [0.1, 1], len: 2, n: 5, spread: 0.8, w: 7 },
  wings: [
    { lead: [[745, 452], [753, 436], [775, 434], [796, 460]], tips: [[800, 484], [792, 484], [783, 479], [773, 473], [763, 467], [754, 461], [748, 456]] },
    { lead: [[695, 487], [670, 503], [648, 525], [630, 543]], tips: [[625, 548], [640, 547], [658, 545], [675, 540], [690, 535], [703, 530], [712, 525]] },
  ],
  // the feet hook over the desk's front edge: long pale toes curling down to y ~545 (source 48.7–50.4)
  feet: [{ palm: [769, 533], heel: [772, 547], toes: [[763, 518], [770, 515], [777, 518]] }, { palm: [795, 520], heel: [800, 531], toes: [[797, 502], [803, 500], [809, 503]], leg: [782, 519] }],
  order: ["farHP", "wing:0", "tail", "body", "wing:1", "head", "nearHP", "foot:0", "foot:1"],
  eyes: { fix: [[722, 456.2, 10.5, 11.2, 727, 453, 2.3], [743, 451, 4, 10, 743.5, 451, 2.0]],  r: 10.9, spread: 0.4, el: -0.18, look: [0.6, -0.6] },
  plasterAt: [725, 426, 14, 4.2, 0.25],
  beak: { pos: [745, 462],  az: 0, el: -0.43, lift: 1.05, w: 9.6, l: 11.2, open: 0.5 },
  plaster: { az: 0.25, el: 0.93, w: 14.4, h: 4.4 },
  headphones: { nearAt: [683, 472], open: 1.0, r: 17, yaw: 0.866, dx: 0, dy: 0.05, lift: 1.0, bandR: 0.96, bandH: 1.31, tilt: 0.1, cupEl: 0.0, w: 5.6 },
  tuft: { dx: -36, dy: -8, ang: 3.55, len: 13, n: 3, spread: 0.7 },
};
const B = mergePose(A, {
  head: { x: 711.6, y: 463.4, r: 39.7, yaw: 0.873, roll: -0.388 },
  headphones: { nearAt: [683, 471.5], open: 1.0, r: 17, bandH: 1.3, yaw: 0.873 },
  wings: [
    { lead: [[753, 445], [765, 424], [790, 422], [815, 428]], tips: [[822, 432], [818, 442], [811, 451], [802, 459], [792, 466], [782, 471], [772, 474]] },
    { lead: [[693, 487], [670, 495], [640, 507], [605, 523]], tips: [[597, 527], [605, 534], [620, 537], [637, 538], [660, 537], [685, 532], [700, 527]] },
  ],
  feet: [{ palm: [768, 534], heel: [772, 548], toes: [[762, 520], [768, 517], [776, 519]] }, { palm: [795, 520], heel: [800, 531], toes: [[797, 503], [803, 500], [809, 503]], leg: [782, 519] }],
  eyes: { fix: [[721.6, 456.2, 10.4, 11.2, 726.6, 453.1, 2.3], [743, 450, 4.2, 9.8, 743.5, 449, 1.9]],  el: -0.17 },
  plasterAt: [725, 425.5, 14, 4.2, 0.25],
  beak: { pos: [745, 461.5],  el: -0.5 },
});
const C = mergePose(B, {
  head: { x: 709.9, y: 461.2, r: 40.7, yaw: 0.816, roll: -0.437 },
  headphones: { nearAt: [681, 469], open: 1.0, r: 17, farAt: [736, 451.6], bandH: 1.35, yaw: 0.816 },
  body: { x: 740, y: 503, a: 56, b: 46, rot: 0.3 },
  tail: { base: [738, 533], dir: [0.1, 1], len: 22, n: 5, spread: 0.8, w: 8 },
  wings: [
    { lead: [[748, 460], [755, 425], [775, 402], [805, 384]], tips: [[809, 381], [815, 395], [810, 410], [808, 425], [803, 440], [795, 452], [785, 462]] },
    { lead: [[700, 485], [670, 482], [630, 485], [590, 492]], tips: [[575, 495], [583, 510], [600, 520], [620, 528], [640, 533], [662, 535], [685, 532]] },
  ],
  feet: [{ palm: [764, 535], heel: [768, 549], toes: [[758, 521], [764, 515], [772, 518]] }, { palm: [796, 520], heel: [800, 531], toes: [[798, 503], [804, 500], [810, 503]], leg: [783, 519] }],
  eyes: { fix: [[720.2, 453.8, 10.2, 11.2, 725, 452.5, 2.3], [743, 445, 4.5, 9.5, 743.5, 443, 1.8]],  el: -0.15, look: [0.6, -0.5] },
  plasterAt: [724.5, 421, 18, 4.4, 0.15],
  beak: { pos: [743.5, 460],  el: -0.57 },
});
const D = mergePose(C, {
  head: { x: 707.6, y: 458.2, r: 42.1, yaw: 0.793, roll: -0.387 },
  headphones: { nearAt: [677, 465], open: 0.94, r: 17, farAt: [747, 444], bandH: 1.45, yaw: 0.793 },
  body: { x: 740, y: 500, a: 52, b: 48, rot: 0.8 },
  tail: { base: [733, 532], dir: [0, 1], len: 36, n: 5, spread: 1.3, w: 8 },
  wings: [
    { lead: [[748, 465], [750, 430], [758, 398], [774, 358]], tips: [[779, 356], [795, 368], [802, 388], [802, 410], [800, 428], [793, 445], [783, 462]] },
    { lead: [[690, 480], [655, 468], [620, 458], [578, 446]], tips: [[572, 445], [572, 470], [588, 494], [606, 510], [632, 522], [660, 527], [690, 527]] },
  ],
  feet: [{ palm: [759, 534], heel: [765, 548], toes: [[751, 522], [758, 517], [766, 520]] }, { palm: [797, 520], heel: [802, 531], toes: [[799, 503], [805, 500], [811, 503]], leg: [784, 518] }],
  eyes: { fix: [[716.5, 450, 11.5, 12, 719.8, 448.8, 2.8], [742, 444, 6, 12, 742, 439.8, 2.3]],  r: 11, el: -0.09, look: [0.4, -0.2] },
  plasterAt: [724, 417, 21, 4.6, 0.1],
  beak: { pos: [741, 455],  el: -0.44 },
});
const E = mergePose(D, {
  head: { x: 711.6, y: 447.0, r: 43.7, yaw: 0.62, roll: -0.395 },
  headphones: { nearAt: [670.5, 460.5], open: 1.0, r: 17.5, farAt: [745, 432], bandH: 1.39, yaw: 0.62 },
  body: { x: 742, y: 503, a: 50, b: 48, rot: 1.4 },
  tail: { base: [728, 530], dir: [0, 1], len: 40, n: 5, spread: 1.4, w: 9 },
  wings: [
    { lead: [[750, 470], [748, 430], [752, 390], [760, 346]], tips: [[763, 342], [780, 350], [795, 375], [801, 398], [801, 420], [795, 440], [785, 460]] },
    { lead: [[690, 476], [660, 460], [620, 442], [585, 420]], tips: [[580, 417], [574, 450], [582, 470], [600, 484], [620, 504], [645, 514], [675, 520]] },
  ],
  feet: [{ palm: [752, 533], heel: [758, 548], toes: [[746, 520], [754, 513], [762, 516]] }, { palm: [794, 517], heel: [800, 529], toes: [[798, 498], [806, 497], [810, 503]], leg: [780, 514] }],
  eyes: { fix: [[710.5, 441.7, 11.9, 12.5, 713, 440.4, 3.2], [740.7, 430.1, 7.8, 11.5, 740, 428.5, 2.8]],  r: 12, el: -0.09, look: [0.2, 0] },
  plasterAt: [724, 406.5, 23, 4.8, 0.12],
  beak: { pos: [737, 447.5],  el: -0.52, open: 0.85 },
});
const F = mergePose(E, {
  head: { x: 708.2, y: 436.1, r: 43.3, yaw: 0.462, roll: -0.375 },
  headphones: { nearAt: [671, 448.5], open: 0.8, r: 17.5, farAt: [747, 416], bandH: 1.35, yaw: 0.462 },
  body: { x: 739, y: 498, a: 46, b: 47, rot: 1.5 },
  tail: { base: [722, 530], dir: [-0.1, 1], len: 40, n: 5, spread: 1.6, w: 9 },
  wings: [
    { lead: [[762, 468], [758, 420], [757, 385], [758, 338]], tips: [[758, 332], [777, 340], [792, 362], [802, 388], [803, 415], [795, 440], [785, 460]] },
    { lead: [[690, 470], [655, 450], [620, 428], [590, 405]], tips: [[583, 398], [573, 428], [582, 455], [600, 482], [622, 500], [650, 510], [682, 514]] },
  ],
  feet: [{ palm: [748, 531], heel: [754, 546], toes: [[741, 520], [748, 514], [755, 516]] }, { palm: [792, 514], heel: [797, 524], toes: [[795, 497], [802, 494], [807, 498]], leg: [777, 510] }],
  eyes: { fix: [[707, 432.7, 13, 13.2, 708, 432, 3.8], [738, 420.5, 8, 11.5, 739.5, 420.5, 3.2]],  r: 13.5, el: -0.09, look: [-0.15, 0] },
  plasterAt: [719.5, 396.5, 21, 4.8, 0.0],
  beak: { pos: [733, 440],  el: -0.53, open: 0.9 },
});
const G = mergePose(F, {
  head: { x: 707.8, y: 426.0, r: 46, yaw: 0.446, roll: -0.257, pitch: 0.12 },
  headphones: { nearAt: [667.5, 432], open: 0.76, r: 19, farAt: [743, 412], bandH: 1.42, yaw: 0.446 },
  body: { x: 735, y: 485, a: 48, b: 46, rot: 1.5 },
  tail: { base: [718, 520], dir: [-0.1, 1], len: 40, n: 5, spread: 1.6, w: 10 },
  wings: [
    { lead: [[767, 455], [759, 420], [759, 370], [760, 327]], tips: [[760, 322], [777, 325], [793, 348], [803, 377], [805, 405], [800, 428], [790, 445]] },
    { lead: [[690, 460], [655, 440], [620, 415], [590, 380]], tips: [[585, 373], [575, 402], [580, 432], [596, 466], [618, 490], [648, 500], [680, 505]] },
  ],
  feet: [{ palm: [744, 522], heel: [748, 537], toes: [[733, 511], [742, 502], [752, 505]] }, { palm: [789, 507], heel: [795, 518], toes: [[790, 490], [798, 487], [805, 492]], leg: [774, 502] }],
  eyes: { fix: [[704, 419.5, 14, 14.5, 708.3, 418, 4.4], [738.3, 409.7, 8.3, 12.7, 740.8, 408.6, 3.8]],  r: 15.5, el: -0.075, look: [0, 0.1] },
  plasterAt: [720, 382, 21, 5, 0.05],
  beak: { pos: [731, 421],  el: -0.52, open: 0.95 },
});

// Registration against the source (render vs source, blurred MAE shift search over each wing's box after the
// restyle): small rigid corrections of the wings, page px.
function shiftWing(K, i, dx, dy) {
  const sh = (p) => [p[0] + dx, p[1] + dy];
  K.wings = K.wings.map((w, j) => (j === i ? { ...w, lead: w.lead.map(sh), tips: w.tips.map(sh) } : w));
}
shiftWing(D, 0, 1, 6); shiftWing(E, 0, 4, 3); shiftWing(F, 0, 2, 3); shiftWing(G, 0, 2, 1);
shiftWing(D, 1, 0, 3); shiftWing(E, 1, 0, 2); shiftWing(F, 1, 0, 3);

// ---------------------------------------------------------------- the launch (52.52–52.64, on ones)
const L1 = mergePose(G, {
  head: { x: 713, y: 413, r: 47, yaw: 0.35, roll: -0.2, pitch: 0.05 },
  headphones: { yaw: 0.35 },
  body: { x: 742, y: 478, a: 48, b: 45, rot: 1.5 },
  tail: { base: [725, 512], dir: [-0.3, 1], len: 34, n: 5, spread: 1.4, w: 10 },
  wings: [
    { lead: [[765, 452], [757, 420], [755, 370], [756, 320]], tips: [[756, 315], [778, 321], [796, 344], [807, 373], [805, 405], [798, 430], [787, 452]] },
    { lead: [[690, 455], [655, 440], [620, 410], [595, 378]], tips: [[591, 385], [578, 410], [582, 435], [596, 460], [621, 472], [650, 490], [679, 498]] },
  ],
  feet: [{ palm: [743, 522], heel: [749, 535], toes: [[735, 507], [742, 504], [752, 505]] }, { palm: [791, 504], heel: [795, 518], toes: [[797, 490], [803, 488], [809, 495]], leg: [782, 500] }],
  // measured on 8x grids of the source (52.52): eye rings, pupils, the beak's top (page px)
  // (fix pass 1, 10x) the far (right) eye sits ~5 px higher and taller; the pupils are larger (dark, ~4 px)
  // (fix pass 2) the near pupil sits low in the lower left of its ring (8x: ~2.5 px left, 1.5 px down of pass 1's); brow
  // arcs over both rings (browArcs, 52.52–52.60)
  eyes: { fix: [[705.5, 418.5, 12.5, 13.5, 705.5, 420, 4.2], [740, 407, 10.5, 12.3, 742, 410, 4.2]], r: 15, look: [-0.6, -0.6], over: { llw: 1.2 } },
  browArcs: 1,
  // (fix pass 1) the plaster rides the crown just under the band (source 52.52: x 712–735, y 378–385)
  plasterAt: [724, 381.5, 23, 4.6, 0.1],
  // (fix pass 1) the band hugs the crown (outer edge at y 363 over x 705) and the near cup sits at (672, 422)
  // (fix pass 2) smoothCup: the launch's side-on cup is smooth in the source (52.52–52.60 at 8x), not ribbed
  headphones: { farAt: null, nearAt: [672, 422], open: 0.9, r: 17, bandH: 1.06, smoothCup: true },
  // (fix pass 1) the launch bills (10x): small, grey, split open over a dark mouth
  beak: { pos: [733, 426], k: 0.8, fill: 0.66, olV: 0.36, olW: 1.0, mouthV: 0.2, open: 1 },
});
const L2 = mergePose(L1, {
  head: { x: 727, y: 419, r: 48, yaw: 0.35, roll: -0.18, pitch: 0 },
  headphones: { yaw: 0.35 },
  body: { x: 752, y: 482, a: 48, b: 44, rot: 1.6 },
  tail: { base: [735, 512], dir: [-0.2, 1], len: 28, n: 5, spread: 1.3, w: 10 },
  wings: [
    { lead: [[776, 452], [768, 420], [765, 370], [764, 318]], tips: [[763, 313], [783, 322], [805, 355], [817, 391], [812, 420], [800, 440], [790, 455]] },
    { lead: [[700, 460], [665, 440], [630, 410], [612, 375]], tips: [[609, 383], [592, 410], [600, 439], [621, 464], [654, 483], [685, 501], [704, 512]] },
  ],
  feet: [{ palm: [756, 522], heel: [756, 535], toes: [[751, 512], [755, 509], [760, 511]] }, { palm: [799, 507], heel: [802, 518], toes: [[803, 495], [810, 494], [815, 498]], leg: [788, 503] }],
  // (fix pass 1) 52.56 squints: the upper lids come down over the top half of both eyes, the pupils under them
  // (pass 4) re-read at 5x: no lids — squashed round eyes (the near one 23 x 18 px) under brow arcs
  // (fix pass 1, 10x) the far eye ~3 px higher and wider than tall; larger pupils
  eyes: { fix: [[718.5, 424.2, 11.5, 10.5, 719, 425, 4.0], [751, 411.8, 9.8, 9.5, 753, 416, 4.4]], r: 14, look: [-0.2, 0.05], over: { lid: 0, llw: 1.2 } },
  headphones: { yaw: 0.35, nearAt: [683, 432], bandH: 1.07 },
  plasterAt: [733, 387.5, 23, 4.6, 0.12],
  beak: { pos: [742, 430], k: 0.8, fill: 0.66, olV: 0.36, olW: 1.0, mouthV: 0.2, open: 1 },
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
  feet: [{ palm: [764, 532], heel: [764, 546], toes: [[760, 524], [765, 522], [771, 525]] }, { palm: [808, 514], heel: [810, 524], toes: [[818, 506], [824, 507], [829, 511]], leg: [796, 512] }],
  // (pass 4) re-read at 5x: open, smaller eyes, the near one squashed (21 x 16 px), no lids
  // (fix pass 1, 10x) the near eye ~2 px right and lower, both a little larger
  eyes: { fix: [[737.3, 443.2, 11.7, 10.3, 740, 446.5, 3.6], [770.6, 430.8, 10, 9.8, 769, 435, 3.8]], r: 13, look: [-0.3, 0.1], over: { lid: 0, llw: 1.2 } },
  headphones: { yaw: 0.3, nearAt: [702, 441], bandH: 1.23 },
  plasterAt: [757, 401.5, 24, 4.6, 0.18],
  beak: { pos: [759, 448], k: 0.8, fill: 0.66, olV: 0.36, olW: 1.0, mouthV: 0.2, open: 1 },
});
// 52.64: the blurred turn over the mug. The source's body sits centred over the mug's left half (body centre ~x 790)
// with the owl in front of the mug, feet on the desk edge at x ~778 / 822.
const L4X = 20, sh4 = (p) => [p[0] + L4X, p[1]];
const L4 = mergePose(L3, {
  // (fix pass 1) the source's 52.64 is a smeared downward turn: head centre ~(765, 440), face pitched down, eyes shut
  // (pass 4, 5x re-read) the head is seen from above as it tips forward: the band arcs over the crown from the near
  // cup (~(708, 448), left) to the far cup (~(803, 432)), the plaster pale on the crown (~(775, 412)), and the face
  // shows only low down: two half-shut eyes at ~(758, 463) and ~(779, 449) and a small beak under them; mild smear
  head: { x: 760, y: 438, r: 47, yaw: 0.05, roll: -0.25, pitch: 0.55 },
  headphones: { yaw: 0.05, nearAt: [708, 448], farAt: [803, 432] },
  body: { x: 772 + L4X, y: 492, a: 62, b: 36, rot: 0.05 },
  tail: { base: sh4([835, 505]), dir: [1, 0.3], len: 14, n: 4, spread: 0.8, w: 10 },
  wings: [
    { lead: [[808, 452], [835, 432], [865, 415], [895, 405]].map(sh4), tips: [[898, 405], [890, 420], [880, 431], [868, 440], [855, 447], [840, 452], [825, 455]].map(sh4) },
    { lead: [[752, 462], [722, 452], [690, 445], [658, 440]].map(sh4), tips: [[655, 441], [662, 453], [672, 463], [684, 471], [698, 477], [712, 480], [726, 480]].map(sh4) },
  ],
  feet: [{ palm: [782, 522], heel: [784, 533], toes: [[776, 512], [781, 510], [787, 512]] }, { palm: [818, 518], heel: [822, 528], toes: [[822, 506], [828, 506], [833, 510]], leg: [806, 515] }],
  eyes: { fix: [[758, 463, 7, 6, 759, 465, 2.5], [779, 449, 6.5, 7, 779, 451, 2.8]], look: [0, 0.6], over: { lid: 0.5, lidW: 0.15 } },
  plasterAt: [775, 412, 26, 6, -0.3],
  beak: { pos: [770, 462], open: 0.3 },
  blur: [6, 1],
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
    head: { x: hx - 4, y: hy + 3, r: 46, sx: 1.06, yaw: -0.35, pitch: 0, roll: -0.29, square: 2.1 },
    body: { x: hx + 60, y: hy + 38, a: 58, b: 42, rot: 0.3 },
    tail: { base: rel([106, 56]), dir: [1, 0.55], len: 15, n: 4, spread: 0.7, w: 9 },
    wings: [W(FAR[far]), W(NEAR[near], ns)],
    feet: [
      { x: hx + 98, y: hy + 66, rot: -0.7, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 2, leg: [-6, -8] },
      { x: hx + 110, y: hy + 60, rot: -0.9, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 5, leg: [-6, -8] },
    ],
    order: ["farHP", "wing:0", "tail", "body", "foot:0", "foot:1", "head", "nearHP", "wing:1"],
    eyes: { r: 11, spread: 0.4, el: -0.15, look: [-0.8, 0.05] },
    // (fix pass 1) the dash's bill (8x at 52.88 / 53.20): a small grey shape ~12 x 10 px with a dark open mouth, not
    // pass 4's pale cone with a dark keyline (the reviewer's "small pale bill" measured worse: owl σ1.5 +0.4 there)
    // (fix pass 2, 14x at 52.88 / 53.20) a little wider and darker: ~11 x 11 px, grey with a dark centre
    beak: { az: 0, el: -0.45, lift: 1.05, w: 12.5, l: 10.5, open: 0.85, k: 0.8, fill: 0.5, olV: 0.3, olW: 1.1, mouthV: 0.14 },
    plaster: { az: 0.1, el: 1.0, w: 15, h: 4.6 },
    headphones: { yaw: -0.35, dx: 0, dy: 0.0, lift: 1.0, r: 17, bandR: 1.0, bandH: 1.02, tilt: 0.1, open: 1.0, face: 1, farCup: false, cupEl: 0.0, w: 5.5 },
    tuft: { dx: 44, dy: -22, ang: -0.45, len: 20, n: 5, spread: 1.5, w: 0.3 },
    // (pass 4) the source's dash drawings are crisp in the face and wings (6x crops): a light 2 px smear only
    blur: [2, 0],
  }, o);
}
// one drawing per frame: [time, head x, head y, near wing, far wing]
const FLY = [
  [52.68, 740, 443, "FWD", "BACKF", 0, 0, { head: { r: 46 }, body: { x: 800, y: 482, a: 80, b: 42, rot: 0.06 }, tail: { base: [868, 494], dir: [1, 0.2], len: 20 } }], [52.72, 705, 453, "DOWN", "BK"], [52.76, 677, 453, "BUP", "SPK"], [52.80, 647, 450, "UP", "UP"],
  [52.84, 612, 445, "BUP", "SPK"], [52.88, 590, 445, "DOWN", "BK", 0, 3.5], [52.92, 570, 447, "BUP", "SPK"], [52.96, 537, 449, "UP", "UP"],
  [53.00, 512, 448, "BUP", "SPK"], [53.08, 480, 447, "DOWN", "BK", 0, 3.5], [53.12, 452, 452, "BACK", "SPK", 0, 3.5],
  [53.16, 428, 450, "UP", "UP"], [53.20, 400, 452, "BMID", "SPK"],
];

// Per-frame face measurements of the dash. (pass 4) Re-measured on 6x gridded crops of every dash frame: the near
// (viewer-right) eye ring [cx, cy, rx, ry] (outer edge of the grey ring; pass 3's table had it ~5 px too big and up to
// 9 px low), its pupil [x, y, r], the far eye's pupil [x, y] (a dark dot inside the face, ~27 px left of the near
// one), the beak's centre [x, y] (a small grey bill over a dark open mouth), the near cup's dark cushion ring
// [cx, cy, rx, ry] (face-on, taller than wide). Page px. (fix pass 2) band: the headphone band's centreline over the
// crown from the head's left (-168°) to its top right (-46°) about the head centre, every 8°: the crown profile of the
// source's traced silhouette of the drawing (sil_data.js; rays from the head centre, wing tips clipped by a running
// lower envelope, a robust quadratic in angle) pushed out 5 px — the band sits on the white head, outside the
// tracer's outline (snapshots/s17-fix2-lab/bandfit2.py). Coordinates only. (fix pass 2) The cups were re-read at 7–9x as
// ~30–33 px wide with centres 1–4 px further left (the reviewer: a 30 x 42 upright oval 5 px up-left); drawn so, the
// dash's owl σ1.5 went 20.00 -> 20.46 over eight frames, so pass 4's table is kept.
const DASH_FACE = {
  "52.68": { near: [742, 457.5, 10.5, 12], np: [737, 458, 3], far: [713, 463], beak: [725, 478], cup: [778, 448, 16.5, 20], farLid: 0.6 , band: [[690, 436], [695, 431], [700, 427], [705, 424], [710, 421], [714, 418], [719, 416], [723, 414], [728, 412], [732, 410], [737, 408], [743, 406], [750, 404], [757, 403], [765, 403], [774, 404]] },
  "52.72": { near: [705, 460, 11, 11.5], np: [698, 463, 3], far: [673, 467.5], beak: [688, 481], cup: [740, 447, 16.5, 20] , band: [[657, 447], [660, 441], [663, 436], [667, 431], [671, 427], [676, 423], [680, 420], [685, 417], [691, 415], [696, 413], [703, 411], [709, 411], [716, 410], [723, 411], [730, 413], [738, 415]] },
  "52.76": { near: [676, 462.5, 11.3, 12.5], np: [670, 466, 3], far: [642.5, 466.7], beak: [660, 482], cup: [710, 449, 16.5, 21] , band: [[623, 445], [627, 439], [632, 434], [637, 430], [642, 426], [647, 423], [652, 420], [657, 417], [663, 415], [668, 412], [675, 411], [681, 409], [689, 408], [697, 408], [705, 408], [714, 410]] },
  "52.80": { near: [646, 458, 10.8, 12.9], np: [641.7, 460, 3], far: [615, 462.5], beak: [628, 478], cup: [680, 448, 16.5, 19] , band: [[596, 443], [600, 437], [604, 432], [608, 428], [612, 423], [617, 420], [622, 416], [627, 413], [632, 411], [638, 408], [645, 407], [651, 405], [659, 405], [666, 405], [675, 406], [683, 408]] },
  "52.84": { near: [622, 455, 12, 12.2], np: [614, 457.5, 3.3], far: [590, 461], beak: [603, 476], cup: [656, 443, 16.5, 19] , band: [[573, 440], [575, 436], [577, 432], [580, 428], [583, 424], [586, 420], [590, 417], [594, 413], [599, 410], [604, 408], [610, 405], [616, 403], [623, 402], [630, 402], [638, 403], [647, 405]] },
  "52.88": { near: [594.5, 454, 11.5, 12], np: [587.5, 457, 3.3], far: [560, 459], beak: [576, 475], cup: [630, 442, 16.5, 19] , band: [[538, 438], [543, 432], [547, 427], [552, 423], [556, 419], [561, 416], [566, 413], [571, 410], [576, 408], [582, 406], [588, 404], [594, 402], [601, 402], [609, 401], [617, 402], [626, 404]] },
  "52.92": { near: [565, 457, 10.5, 12], np: [558, 457.5, 3.2], far: [532.5, 461.7], beak: [547, 478], cup: [601, 441, 18, 18.5] , band: [[514, 439], [519, 433], [524, 428], [529, 423], [534, 419], [539, 416], [544, 413], [550, 410], [556, 408], [561, 406], [568, 404], [574, 403], [582, 402], [589, 402], [598, 403], [607, 405]] },
  "52.96": { near: [537.5, 458, 10.8, 12], np: [531.7, 458, 3.2], far: [506.7, 462.5], beak: [521, 475], cup: [572, 442, 18, 18.5] , band: [[488, 442], [492, 437], [495, 432], [499, 427], [503, 423], [508, 420], [512, 416], [517, 414], [523, 411], [528, 409], [535, 407], [541, 406], [548, 406], [555, 406], [563, 407], [571, 410]] },
  "53.00": { near: [512, 457.5, 11.2, 12.5], np: [506, 459, 3.3], far: [482, 463.7], beak: [494, 478], cup: [549, 444, 19, 22] , band: [[470, 443], [470, 437], [472, 432], [474, 426], [477, 421], [480, 416], [485, 411], [490, 407], [496, 403], [503, 400], [510, 398], [517, 397], [525, 397], [534, 398], [542, 401], [550, 404]] },
  "53.08": { near: [481, 457, 11.2, 12], np: [476, 458, 3.3], far: [450, 461], beak: [463, 476], cup: [518, 444, 18.5, 21] , band: [[430, 440], [434, 435], [438, 430], [442, 426], [447, 422], [451, 418], [456, 415], [461, 413], [466, 410], [472, 409], [478, 407], [484, 406], [490, 406], [497, 407], [504, 408], [512, 410]] },
  "53.12": { near: [454, 460.5, 11.2, 12.5], np: [448.7, 462.5, 3.3], far: [421.7, 462.5], beak: [435, 482], cup: [493.5, 445, 18.5, 22.5] , band: [[407, 446], [409, 441], [411, 435], [414, 430], [418, 426], [422, 422], [427, 418], [432, 415], [438, 413], [444, 412], [450, 412], [456, 412], [462, 414], [467, 416], [473, 418], [478, 422]] },
  "53.16": { near: [427.5, 462.5, 11.5, 12.5], np: [421, 464, 3.3], far: [395, 467.5], beak: [413, 483], cup: [465, 451, 17.5, 21.5] , band: [[384, 444], [387, 439], [390, 435], [393, 430], [396, 426], [400, 423], [404, 419], [409, 416], [414, 414], [420, 411], [426, 409], [432, 408], [439, 408], [446, 408], [454, 409], [461, 412]] },
  "53.20": { near: [401, 465, 12, 12.2], np: [395, 468, 3.5], far: [370, 468.7], beak: [386, 484], cup: [438, 450, 17.5, 22] , band: [[357, 447], [360, 442], [363, 438], [367, 434], [370, 430], [374, 427], [378, 424], [382, 422], [387, 419], [392, 417], [397, 416], [403, 414], [409, 414], [416, 414], [423, 415], [430, 417]] },
};
function dashFace(t) {
  const m = DASH_FACE[t.toFixed(2)];
  if (!m) return {};
  const [nx, ny, nrx, nry] = m.near, [fx, fy] = m.far, [cx, cy, crx, cry] = m.cup;
  return {
    // the far eye: a small white eye mostly hidden by the turn of the face, its dark pupil showing
    eyes: { fix: [[fx + 1.5, fy, 4.8, 7, fx, fy, 2.9], [nx, ny, nrx, nry, ...m.np]], left: { ringA: 0.4, ...(m.farLid ? { lid: m.farLid } : {}) } },
    // the beak's centre -> its top (the bill is ~11 px tall when open)
    beak: { pos: [m.beak[0], m.beak[1] - 4] },
    // the plaster on the forehead: a pale strip ~26 x 7 px, tilted down to the right, centred (+2, -36.5) from the
    // near eye's centre (52.76 / 52.88 / 53.00 / 53.12 at 5x)
    plasterAt: [nx + 2, ny - 36.5, 26, 7, 0.25],
    // (fix pass 2) the band's centreline over the crown (band: page px, left end first), hugging the head
    headphones: { nearAt: [cx, cy], r: cry, faceW: crx / cry, cupRot: 0.29, bandPts: m.band || null },
    dashFace: 1,
  };
}

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
const ONES = [[52.52, L1], [52.56, L2], [52.60, L3], [52.64, L4], ...FLY.map(([t, x, y, n, f, ns, bl, o]) => [t, flyKey(x, y, n, f, mergePose(dashFace(t), { ...(o || {}), ...(bl ? { blur: [bl, 0] } : {}) }), ns || 0)])];
// (pass 4) 52.68: the near wing reaches forward under the face (its upper edge runs (690, 485) -> (750, 500) in the
// source); the model FWD wing sat ~12 px higher, over the beak
{ const K = ONES.find(([t]) => Math.abs(t - 52.68) < 1e-6)[1]; shiftWing(K, 1, 0, 12); }

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
// (pass 4) The source's line darkness drifts through the shot: its eye rings measure (graded minimum across the
// ring, median of 16 radial profiles) ~185 in the crouch, darkening to ~137 by 52.44, light again in the launch's
// motion (~205) and ~150–190 in the dash. RING[t] is the ring's pre-grade value that gives the source's minimum with
// our ring (calibrated against our own render at 0.34); it also scales the other keylines through P.ink.
const RING_RISE = [[48.8, 0.524], [49.28, 0.574], [49.6, 0.574], [49.92, 0.567], [50.24, 0.532], [50.56, 0.489], [50.88, 0.461],
  [51.2, 0.418], [51.52, 0.39], [51.84, 0.354], [52.16, 0.375], [52.44, 0.205]];
const RING_ONES = { "52.52": 0.361, "52.56": 0.716, "52.60": 0.659, "52.64": 0.5, "52.68": 0.574, "52.72": 0.553, "52.76": 0.546, "52.80": 0.347,
  "52.84": 0.475, "52.88": 0.454, "52.92": 0.468, "52.96": 0.34, "53.00": 0.439, "53.08": 0.489, "53.12": 0.283, "53.16": 0.29, "53.20": 0.305 };
function ringAt(d) {
  const o = RING_ONES[d.toFixed(2)];
  if (o != null) return o;
  const T = RING_RISE;
  if (d <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (d <= T[i][0] + 1e-6) { const [a, va] = T[i - 1], [b, vb] = T[i]; return va + (vb - va) * (d - a) / (b - a); }
  return T[T.length - 1][1];
}
function withInk(P, d) { const v = ringAt(d); P.ringV = v; P.ink = Math.max(0, Math.min(1.2, (0.574 - v) / (0.574 - 0.205))); return P; }
// the owl for film time t: a pose in owl units (placement in page px)
// the source's traced outer silhouette of this drawing (sil_data.js), in the pose's owl units: the shot clips its
// drawing of the body, head, wings and tail to it; near the mug (where the tracer cannot see the white owl over the
// white mug) the mug's box is added
const MUG = [805, 460, 884, 524];
function withSil(P, tick) {
  const S = SIL[tick.toFixed(2)];
  if (!S) return P;
  const u = (a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([(a[i] - P.x) / P.s, (a[i + 1] - P.y) / P.s]); return o; };
  P.silPoly = S.map(u);
  P.silTrace = P.silPoly.slice();
  const [x0, y0, x1, y1] = MUG;
  P.silPoly.push(u([x0, y0, x1, y0, x1, y1, x0, y1]));
  // (fix pass 1) the tracer's slit at the wing–body junction (51.12–52.44, ~(693, 500)): filled (sil_fill.js), in the
  // clip and the white underlay, with no keyline round it
  // (fix pass 2) and the tracer's split lines / slits inside the dash owl's head (sil_fill_dash.js): the page showed
  // through them as dark strokes down the face (53.04–53.12: x ~471 from the crown to the bill)
  const FL = SIL_FILL[tick.toFixed(2)] || SIL_FILL_DASH[tick.toFixed(2)];
  if (FL) { const f = FL.map(u); P.silPoly.push(...f); P.massExtra = [...(P.massExtra || []), ...f]; P.silFill = f; }
  // (fix pass 1) 52.68: the traced outline cuts the dash owl's face along the dark box behind it (x ~695); the
  // source's head disc (centre (735, 462), r 44, page px) joins the clip there so the face stays whole
  // (pass 4) the disc is pulled in to the source's face edge (x ~700 against the dark box, 5x at 52.68)
  const HU = { "52.68": [740, 459, 40] }[tick.toFixed(2)];
  if (HU) {
    const q = [];
    for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; q.push([HU[0] + Math.cos(a) * HU[2], HU[1] + Math.sin(a) * HU[2]]); }
    P.silPoly.push(u(q.flat()));
  }
  // (pass 4) the dash's traced outlines have holes where the source's cup ring is dark (below the tracer's
  // threshold); the page showed through them beside our cup: the cup's ellipse joins the clip and the white underlay.
  // (Filling the head too was tried and dropped: the slits there include the real black gap under the band.)
  const DF = DASH_FACE[tick.toFixed(2)];
  if (DF && P.head) {
    const H = P.head, ell = (cx, cy, rx, ry, rot) => { const q = []; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; q.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); } return q; };
    const [cx, cy, crx, cry] = DF.cup;
    const extra = [ell((cx - P.x) / P.s, (cy - P.y) / P.s, (crx + 1) / P.s, (cry + 1) / P.s, 0)];
    // (fix pass 2) the crown under the band: the tracer's outline runs 4–7 px under the band's centre with a jagged
    // black slit between (the source has a thin smooth gap there); a fan from the head's centre to the band's
    // centreline pulled in 8.5 px (~3.5 px inside the smooth crown profile the band was fitted to) joins the clip and
    // the white underlay: it fills only the deeper notches, leaving a ~4 px gap under the band (pulled in 5 px it cost
    // +1.0 owl σ1.5 at 52.68–53.12, at 8.5 px +0.3, against no fan)
    if (DF.band) {
      const hc = [P.head.x * P.s + P.x, P.head.y * P.s + P.y], fan = [hc];
      for (const b of DF.band) { const d = Math.hypot(b[0] - hc[0], b[1] - hc[1]) || 1, k = (d - 8.5) / d; fan.push([hc[0] + (b[0] - hc[0]) * k, hc[1] + (b[1] - hc[1]) * k]); }
      extra.push(u(fan.flat()));
      // the face (between and round the eyes, down to the bill): the keyline is not drawn inside it (the tracer split
      // the face along lines the source does not have)
      const [nx, ny, nrx, nry] = DF.near, [fx, fy] = DF.far, [bx, by] = DF.beak;
      P.keyCut = [u(fan.flat()), u([fx - 7, fy - 13, (fx + nx) / 2, ny - nry - 8, nx + nrx + 3, ny - nry - 4, nx + nrx + 4, ny + nry + 3, bx + 6, by + 8, bx - 6, by + 8, fx - 7, fy + 10].flat())];
    }
    P.silPoly.push(...extra);
    P.massExtra = [...(P.massExtra || []), ...extra];
  }
  return P;
}
export function owlFrame(t) {
  // 53.04 repeats the 53.00 drawing in the source (owl box change 1.3 = steam and grain): same pose, face and silhouette
  if (Math.abs(t - 53.04) < 0.01) t = 53.0;
  if (t >= 52.52 - 1e-6) {
    let k = ONES[0][1], kt = ONES[0][0];
    for (const [tt, p] of ONES) if (tt <= t + 1e-6) { k = p; kt = tt; }
    return withInk(withSil(toUnits(k), kt), kt);
  }
  const d = drawingTime(t), P = owlAt(d);
  // the traced wing outlines of this drawing (the crouched drawing held to 49.08 is traced at 48.80)
  const W = WINGS[(d < 49.1 ? 48.8 : d).toFixed(2)];
  if (W) {
    const u = (a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([(a[i] - P.x) / P.s, (a[i + 1] - P.y) / P.s]); return o; };
    P.wingPoly = [W.R ? u(W.R) : null, W.L ? u(W.L) : null];     // wing 0 = the owl's left (viewer-right), 1 = viewer-left
    // the far (raised) wing is in shade: measured interior means 213 / 217 / 230 against the near wing's 230 / 229 / 233
    // at 49.52 / 50.80 / 51.80 — a grey veil over it, lifting as it rises into the light
    // (fix pass 1: with the brighter feather fill and the darker feather lines, medians 226 / 247 / 244 at 50.04 /
    // 51.44 / 52.44 want the veil gone by ~51.3)
    const k = Math.max(0, Math.min(1, (d - 50.8) / 0.5));
    P.wingTone = [0.42 * (1 - k), 0];
    if (W.M) P.massPoly = u(W.M);
  }
  withSil(P, d < 49.1 ? 48.8 : d);
  // (pass 4) the traced silhouettes have thin slits where a grey feather line inside a wing touched the outline
  // (e.g. 51.64 at (627–662, 492–505)); the wing's own traced outline has none there, so it joins the clip
  if (P.silPoly && P.wingPoly) for (const w of P.wingPoly) if (w) P.silPoly.push(w);
  return withInk(P, d < 49.1 ? 48.8 : d);
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
    feet: K.feet.map((f) => (f.palm ? { palm: u(f.palm), heel: u(f.heel), toes: f.toes.map(u), leg: f.leg ? u(f.leg) : null, w: d(f.w ?? (f.leg ? 2.5 : 3.1)) }
      : { ...f, x: u([f.x, f.y])[0], y: u([f.x, f.y])[1], size: d(f.size), leg: f.leg ? [d(f.leg[0]), d(f.leg[1])] : null })),
    order: K.order,
    eyes: { fix: K.eyes.fix ? K.eyes.fix.map((e) => [...u([e[0], e[1]]), d(e[2]), d(e[3]), ...u([e[4], e[5]]), d(e[6])]) : null, state: "wide", r: d(K.eyes.r), spread: K.eyes.spread, el: K.eyes.el, look: K.eyes.look, over: { ...ROUND, ...(K.eyes.over || {}) }, left: K.eyes.left, right: K.eyes.right },
    beak: { ...K.beak, w: d(K.beak.w), l: d(K.beak.l), pos: K.beak.pos ? u(K.beak.pos) : null },
    plasterAt: K.plasterAt ? [...u([K.plasterAt[0], K.plasterAt[1]]), d(K.plasterAt[2]), d(K.plasterAt[3]), K.plasterAt[4]] : null,
    plaster: { ...K.plaster, w: d(K.plaster.w), h: d(K.plaster.h) },
    headphones: { on: true, ...K.headphones, r: d(K.headphones.r), w: d(K.headphones.w), farAt: K.headphones.farAt ? u(K.headphones.farAt) : null, nearAt: K.headphones.nearAt ? u(K.headphones.nearAt) : null, bandPts: K.headphones.bandPts ? K.headphones.bandPts.map(u) : null },
    tuft: K.tuft ? { ...K.tuft, dx: d(K.tuft.dx), dy: d(K.tuft.dy), len: d(K.tuft.len) } : null,
    disc: 1, blur: K.blur, flip: K.flip, dashFace: K.dashFace || 0, browArcs: K.browArcs || 0,
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
