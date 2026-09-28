// s23 targeted fix (2026-09-27): the powered-up owl redrawn as the source draws it — an engraved white bird, not the
// kit's cartoon (review: "the owl (carry, slap, power-up) is a simpler cartoon"). Drawn by code in frame px with the
// s24 drawing kit (copied to s23/eng/): smooth outlines through hand-read landmarks, soft white plumage, tapered ink,
// lanceolate wing feathers with barbs, covert rows, fur tufts along a flow field, engraved headphone cups, talons.
// Landmarks were read off 2.4–3.2x ruler crops of the source frames named below (snapshots/end-s23-tfix-tools/r.py);
// nothing of the source is stored — only these coordinates.
//
// Two head / body drawings: P (the yell, 92.64–93.80; read on 2327) and R (93.84–95.92 reach / two pairs; read on
// 2360 and 2385 — the head ~9 px lower, beak closed). Wings per beat.
import { INK, curve, polyPath, smoothFn, inkLine, softFill, shade, featherPoly, band } from "./eng/art.js";
import { stroke, cup3, hookBeak, toe, fineHatch } from "./eng/art2.js";
import { tufts, ruff, blobTone, flowDir } from "./eng/engr.js";
import { taper } from "../../lib/ink.js";
import { rng } from "../../lib/rng.js";
import { drawBandage, setPPU, gv } from "../../lib/owlInk.js";
import { drawScissors } from "./props.js";
import { lobe } from "./eng/art2.js";

const TAU = Math.PI * 2;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
const nrm = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; }, perp = (a) => [-a[1], a[0]];
const T = (pts, d) => pts.map((p) => [p[0] + d[0], p[1] + d[1]]);

// ---------------------------------------------------------------- a flight feather (the source's wing style)
// white vane, a full thin ink outline (heavier on the lower / trailing edge), a grey shade along the root, fine barbs
function flight(g, r, t, w, o = {}) {
  const { bend = 0, ink = 1.9, barbN = 3, seed = 1, rootV = 0.8, v = 0.96, widest = 0.32, tipPow = 0.7, rootK = 0.7, lower = 1 } = o;
  const F = featherPoly(r, t, w, { bend, rootK, widest, tipPow, n: 22 });
  const path = polyPath(F.poly), R = rng(seed * 71 + 3);
  const gr = g.createLinearGradient(r[0], r[1], t[0], t[1]);
  gr.addColorStop(0, gv(rootV)); gr.addColorStop(0.35, gv(v)); gr.addColorStop(1, gv(v));
  g.fillStyle = gr; g.beginPath(); path(g); g.fill();
  // a soft grey shade along the lower edge (the feather curls away from the light)
  g.save(); g.beginPath(); path(g); g.clip();
  const lo = lower > 0 ? F.right : F.left;
  taper(g, lo, (u) => Math.max(0.5, w * 0.28 * Math.sin(Math.PI * Math.min(1, u * 1.3))), gv(0.72, 0.55));
  for (let i = 0; i < barbN; i++) {
    const off = ((i + 0.5) / barbN - 0.5) * 1.3, u0 = 0.05 + 0.15 * R(), u1 = 0.55 + 0.35 * R(), pts = [];
    for (let j = 0; j <= 8; j++) { const u = u0 + (u1 - u0) * j / 8, m = F.M(u), a = F.M(Math.max(0, u - 0.02)), b = F.M(Math.min(1, u + 0.02)), tn = perp(nrm(sub(b, a))); pts.push(add(m, mul(tn, off * F.hw(u)))); }
    taper(g, pts, (u) => Math.max(0.3, (0.6 + 0.5 * R()) * Math.pow(Math.sin(Math.PI * u), 0.7)), gv(0.5, 0.6));
  }
  g.restore();
  // ink: round the whole feather except the root, heavier along the lower edge
  const L = F.left, Rr = F.right, n = L.length - 1;
  const run = [...L.slice(Math.round(n * 0.12)), ...Rr.slice(Math.round(n * 0.12)).reverse()];
  const m = run.length;
  taper(g, run, (u) => { const side = u < 0.5 ? (lower > 0 ? 0.75 : 1.15) : (lower > 0 ? 1.15 : 0.75); return Math.max(0.5, ink * side * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, Math.max(0, u))))); }, INK);
  return F;
}
// a wing: feathers [root, tip, width] painted in order (later over earlier), then coverts (short rounded feathers over
// the roots) and the leading-edge ink
function wing(g, W) {
  const R = rng(W.seed || 5);
  (W.feathers || []).forEach(([r, t, w, bend = 0], i) => flight(g, r, t, w, { bend, seed: (W.seed || 5) * 13 + i, lower: W.lower ?? 1, ink: W.ink ?? 1.9 }));
  if (W.coverts) W.coverts.forEach(([r, t, w, bend = 0], i) => flight(g, r, t, w, { bend, seed: (W.seed || 5) * 17 + i, lower: W.lower ?? 1, widest: 0.5, tipPow: 0.45, rootK: 0.9, barbN: 2, ink: 1.6, rootV: 0.9 }));
  if (W.arm) {
    // the arm: a white mass over the roots, inked along its leading edge
    g.fillStyle = gv(0.95); g.beginPath(); smoothFn(W.arm)(g); g.fill();
    g.save(); g.beginPath(); smoothFn(W.arm)(g); g.clip();
    fineHatch(g, null, W.armBox, { dir: () => nrm(sub(W.lead[W.lead.length - 1], W.lead[0])), tone: () => 0.5, spacing: 5, len: [8, 16], w: [0.4, 0.9], color: gv(0.55, 0.5), seed: (W.seed || 5) + 40 });
    g.restore();
  }
  if (W.lead) stroke(g, W.lead, W.leadWs || [0.6, 2.2, 2.4, 1.6, 0.6]);
  R();
}

// ---------------------------------------------------------------- head and body
// R drawing (2360): outline through the crown under the band, down the right side behind the cup, round the body's
// bottom (565) and up the left side
const HB_R = {
  out: [[640, 426], [650, 411], [664, 405], [683, 403], [702, 404], [720, 408], [734, 415], [744, 428], [748, 446], [749, 466], [750, 488], [751, 508], [749, 528],
    [743, 546], [731, 559], [711, 565], [688, 565], [668, 559], [656, 549], [649, 532], [646, 510], [645, 489], [639, 470], [636, 448]],
  eyes: [
    // left eye: the heavy brow line along its top-inner side, the round lower lid
    { brow: [[649, 451], [661, 457], [672, 465]], browWs: [1.4, 3.6, 4.8, 3.4], lid: [[649, 452], [647, 462], [650, 471], [659, 477], [667, 475], [671, 470], [672, 465]] },
    { brow: [[687, 464], [699, 457], [711, 450]], browWs: [3.4, 4.8, 3.6, 1.4], lid: [[687, 464], [690, 472], [699, 477], [709, 476], [714, 469], [714, 459], [711, 450]] },
  ],
  beak: { upper: [[675, 477], [681, 474], [688, 476], [687, 483], [683, 490], [681, 493], [679, 488], [676, 482]], ridge: [[685, 477], [684, 484], [681, 491]] },
  bandage: { x: 660, y: 424, size: 34, rot: -0.45, cross: 1.45 },
  band: [[624, 462], [628, 432], [634, 408], [646, 392], [667, 382], [693, 379], [720, 383], [739, 395], [748, 412], [752, 432]],
  cupL: { c: [627, 449], rx: 5.5, ry: 23, rot: 0.04, d: [7, 0], back: 1, cs: 1.12, faceV: 0.5, sideV: 0.38, cushV: 0.22, rings: [0.4], pleats: 16, seed: 11, ink: 2.2 },
  cupR: { c: [753, 446], rx: 10.5, ry: 21, rot: -0.05, d: [-9, 0], back: 1, cs: 1.12, faceV: 0.62, sideV: 0.42, cushV: 0.2, rings: [0.3], pleats: 22, seed: 12, ink: 2.2 },
  tufts: [[[731, 404], [727, 418], [735, 419]], [[724, 400], [719, 414], [728, 413]]],
  legs: [
    { leg: [[665, 555], [661, 565], [657, 572]], w: 16, toes: [[[657, 572], [646, 576], [636, 579]], [[657, 573], [652, 579], [648, 584]], [[658, 573], [664, 579], [669, 583]]], back: [[662, 571], [672, 573]] },
    { leg: [[737, 553], [742, 562], [747, 569]], w: 16, toes: [[[748, 569], [744, 575], [743, 582]], [[749, 570], [757, 577], [765, 583]], [[750, 569], [764, 571], [779, 576]]], back: [[745, 567], [737, 572]] },
  ],
};
// P drawing (2327): the head ~9 px higher, stretched body, the yelling beak (upper mandible raised over a dark mouth)
const HB_P = {
  ...HB_R,
  out: [[641, 417], [651, 402], [665, 396], [684, 394], [703, 395], [721, 399], [735, 406], [745, 419], [749, 437], [750, 458], [752, 482], [760, 500], [758, 520], [753, 538],
    [743, 553], [724, 561], [700, 562], [678, 561], [663, 553], [654, 537], [649, 516], [647, 492], [642, 470], [638, 442]],
  eyes: [
    { brow: [[649, 440], [661, 447], [672, 456]], browWs: [1.4, 3.6, 4.8, 3.4], lid: [[649, 441], [647, 451], [650, 461], [658, 467], [666, 466], [671, 461], [672, 456]] },
    { brow: [[688, 456], [700, 450], [712, 443]], browWs: [3.4, 4.8, 3.6, 1.4], lid: [[688, 456], [692, 464], [701, 467.5], [711, 466], [716, 459], [716, 450], [712, 443]] },
  ],
  beak: null,
  yell: { upper: [[671, 465], [679, 461], [688, 463], [688, 469], [684, 474], [679, 477], [674, 472]], mouth: [[676, 472], [684, 470], [689, 478], [690, 489], [686, 498], [680, 498], [677, 489], [676, 479]], tongue: [[679, 488], [685, 486], [687, 494], [681, 496]] },
  bandage: { x: 661, y: 413, size: 34, rot: -0.45, cross: 1.45 },
  band: [[629, 414], [633, 396], [645, 381], [667, 372], [693, 369], [720, 373], [739, 385], [748, 400], [751, 414]],
  cupL: { ...HB_R.cupL, c: [630, 437] },
  cupR: { ...HB_R.cupR, c: [754, 434] },
  tufts: HB_R.tufts.map((t) => T(t, [1, -9])),
  legs: [
    { leg: [[666, 552], [661, 563], [657, 571]], w: 16, toes: [[[656, 571], [647, 573], [638, 576]], [[656, 572], [651, 577], [646, 581]], [[658, 572], [662, 577], [665, 581]]], back: [[662, 569], [671, 571]] },
    { leg: [[739, 552], [745, 562], [749, 569]], w: 16, toes: [[[749, 569], [746, 575], [745, 580]], [[750, 570], [756, 576], [761, 581]], [[751, 569], [762, 571], [771, 575]]], back: [[746, 566], [738, 570]] },
  ],
};

// T drawing (two pairs, read on 2385 / 2394 once the aura is gone): R's head on a wider, flatter-bottomed body
const HB_T = {
  ...HB_R,
  out: [[640, 426], [650, 411], [664, 405], [683, 403], [702, 404], [720, 408], [734, 415], [744, 428], [748, 446], [751, 466], [754, 490], [757, 503], [757, 517], [754, 534],
    [745, 549], [725, 556], [698, 559], [678, 558], [666, 555], [657, 549], [648, 537], [645, 519], [645, 499], [639, 470], [636, 448]],
  legs: [
    { leg: [[665, 552], [663, 562], [661, 569]], w: 16, toes: [[[660, 569], [650, 571], [639, 573]], [[661, 570], [654, 577], [647, 583]], [[662, 570], [666, 577], [669, 583]]], back: [[665, 567], [674, 569]] },
    { leg: [[738, 553], [743, 561], [747, 567]], w: 16, toes: [[[747, 567], [745, 575], [744, 582]], [[748, 568], [755, 576], [762, 583]], [[749, 567], [764, 571], [778, 577]]], back: [[744, 565], [736, 569]] },
  ],
};

function headBody(g, H) {
  const out = H.out, path = smoothFn(out);
  // legs first (the body's fluffy bottom covers their tops)
  for (const L of H.legs) {
    const q = curve(L.leg, false, 6);
    taper(g, q, (u) => L.w * (1 - 0.25 * u) + 3.6, INK); taper(g, q, (u) => L.w * (1 - 0.25 * u), gv(0.9));
    if (L.back) toe(g, L.back, 6, { claw: 6, curl: -1, ink: 1.6, tick: 5 });
    L.toes.forEach((t, i) => toe(g, t, 6.5, { claw: 7, curl: 1, ink: 1.6, tick: 5, seed: 3 + i, end: 0.7 }));
  }
  // plumage: soft white, a grey rim, shaded low and on the right
  softFill(g, path, { base: 1, rim: 0.86, light: [-0.4, -0.9], depth: 14, blur: 10 });
  shade(g, path, (q) => q.ellipse(735, 530, 30, 45, 0.3, 0, TAU), 0.66, 0.35, 14);
  shade(g, path, (q) => q.ellipse(700, 566, 60, 14, 0, 0, TAU), 0.6, 0.35, 10);
  // engraving: fur tufts following the body's round, gathering toward the edges
  const cx = 697, cy = 500;
  tufts(g, path, [630, 470, 765, 572], { dir: flowDir([0, 1], [[cx, cy, 90, "t", 0.7]]), tone: blobTone([[650, 520, 18, 40, 0.8], [745, 515, 18, 45, 0.9], [700, 560, 50, 12, 0.8], [700, 500, 40, 30, 0.12]], 0.05),
    cell: 13, n: [2, 4], len: [6, 13], gap: 2.4, w: [0.4, 0.9], v: [0.62, 0.42], alpha: 0.75, seed: 21 });
  // ink round the outline: a light grey line on the lit side (upper left), dark and heavier on the shadow side / bottom
  const q = curve(out, true, 8), n = q.length;
  let A = 0; for (let i = 0; i < n; i++) { const p = q[i], r = q[(i + 1) % n]; A += p[0] * r[1] - r[0] * p[1]; }
  const sh = q.map((p, i) => { const a = q[(i - 1 + n) % n], b = q[(i + 1) % n], t = nrm(sub(b, a)), o = A > 0 ? [t[1], -t[0]] : [-t[1], t[0]]; return Math.max(0, Math.min(1, 0.5 + 0.6 * o[1] + 0.35 * o[0])); });
  taper(g, [...q, q[0]], (u) => { const f = sh[Math.min(n - 1, Math.round(u * n))]; return 1.1 + 1.3 * f; }, gv(0.42, 0.9));
  taper(g, [...q, q[0]], (u) => { const f = sh[Math.min(n - 1, Math.round(u * n))]; return f > 0.55 ? 0.4 + 1.6 * (f - 0.55) / 0.45 : 0.01; }, INK);
  // feather notches along the lower body (short dark ticks up into the plumage)
  ruff(g, [[652, 540], [664, 556], [690, 564], [716, 564], [738, 553], [748, 536]], { step: 9, len: [4, 8], w: [0.6, 1.2], v: 0.2, alpha: 0.8, lean: 0.2, side: -1, seed: 31, skip: 0.2 });
  // ear tufts beside the band
  for (const t of H.tufts) { g.fillStyle = gv(0.95); g.beginPath(); smoothFn(t)(g); g.fill(); stroke(g, [t[1], t[0], t[2]], [0.6, 1.6, 0.6]); }
  // the face: a faint facial disc, eyes, beak
  // the facial disc: grey feather lines rising from between the eyes to the crown (a V), and the cheek ruffs under the eyes
  const fy = H === HB_P ? -9 : 0;
  stroke(g, T([[678, 460], [672, 440], [664, 425]], [0, fy]), [0.3, 1.1, 0.3], { color: gv(0.55, 0.75) });
  stroke(g, T([[684, 460], [694, 440], [706, 426]], [0, fy]), [0.3, 1.1, 0.3], { color: gv(0.55, 0.75) });
  stroke(g, T([[646, 472], [652, 482], [664, 488], [676, 490]], [0, fy]), [0.3, 1.1, 1.0, 0.3], { color: gv(0.5, 0.8) });
  stroke(g, T([[690, 490], [705, 489], [720, 483], [733, 473]], [0, fy]), [0.3, 1.1, 1.0, 0.3], { color: gv(0.5, 0.8) });
  ruff(g, T([[648, 474], [660, 486], [676, 491], [694, 491], [714, 487], [734, 474]], [0, fy]), { step: 6, len: [3, 7], w: [0.5, 0.9], v: 0.5, alpha: 0.7, lean: 0.3, side: 1, seed: 41, skip: 0.3 });
  for (const e of H.eyes) {
    const lid = e.lid;
    g.fillStyle = gv(0.99); g.beginPath(); smoothFn([...lid, ...e.brow.slice().reverse()])(g); g.fill();
    stroke(g, lid, [1.8, 3.0, 3.2, 3.0, 2.0]);
    stroke(g, e.brow, e.browWs);
  }
  if (H.beak) hookBeak(g, { upper: H.beak.upper, ridge: H.beak.ridge, ridgeWs: [0.5, 1.4, 0.8], ink: 1.8, v: 0.86, shade: [684, 484, 4, 8, 0.2] });
  if (H.yell) {
    const Y = H.yell;
    g.fillStyle = INK; g.beginPath(); smoothFn(Y.mouth)(g); g.fill();
    g.fillStyle = gv(0.45); g.beginPath(); smoothFn(Y.tongue)(g); g.fill();
    stroke(g, [[676, 490], [680, 497], [687, 496]], [1, 2.2, 1]);
    hookBeak(g, { upper: Y.upper, ink: 1.8, v: 0.9 });
  }
  setPPU(1); drawBandage(g, H.bandage);
  // headphones: the band over the crown, the far (left) cup edge-on, the near (right) cup
  cup3(g, H.cupL);
  band(g, H.band, { w: 5.5, v: 0.22, ridge: 0.66 });
  cup3(g, H.cupR);
}

// ---------------------------------------------------------------- wings per beat
// power (2327): both wings flung up and out; feathers [root, tip, width] from the bottom (secondaries, innermost) up
// to the longest primary, which is painted last (it lies over the others)
const PW_L = {
  seed: 3, lower: -1,
  feathers: [[[646, 494], [614, 508], 22], [[638, 488], [598, 503], 24], [[630, 482], [580, 495], 24], [[622, 475], [564, 486], 24], [[612, 467], [551, 473], 24],
    [[604, 459], [533, 454], 24, 0.03], [[597, 451], [520, 430], 24, 0.03], [[592, 444], [512, 402], 24, 0.04], [[588, 437], [516, 371], 22, 0.05]],
  coverts: [[[646, 484], [610, 482], 22], [[642, 477], [602, 468], 22], [[636, 470], [594, 454], 22], [[628, 463], [586, 441], 21], [[618, 456], [576, 427], 19]],
  lead: [[644, 476], [622, 458], [598, 440], [573, 422], [549, 407]], leadWs: [0.8, 2.4, 2.6, 2.0, 0.6],
};
const PW_R = {
  seed: 4, lower: 1,
  feathers: [[[751, 498], [778, 507], 22], [[758, 492], [793, 502], 24], [[766, 486], [814, 494], 24], [[774, 479], [824, 482], 24], [[782, 471], [840, 469], 24],
    [[789, 463], [865, 449], 24, -0.03], [[795, 456], [876, 422], 24, -0.03], [[799, 449], [883, 389], 24, -0.04], [[801, 442], [876, 362], 22, -0.05]],
  coverts: [[[752, 486], [786, 482], 22], [[757, 479], [797, 468], 22], [[763, 472], [806, 454], 22], [[770, 466], [813, 441], 21], [[778, 460], [821, 429], 19]],
  lead: [[759, 474], [782, 452], [801, 432], [826, 413], [850, 398]], leadWs: [0.8, 2.4, 2.6, 2.0, 0.6],
};

// reach (2360): the left wing stretched out flat to the left for the returning scissors — primaries pointing left
// (tips (460, 433) … (496, 514)), the secondaries' tips along its lower edge (y ≈ 523–534), a covert row inside; the
// right wing folded into a feathered fist at its chest (≈ (727–790, 470–526)) with three tucked feathers under it
const RW_L = {
  seed: 7, lower: 1,
  feathers: [[[640, 506], [631, 518], 20], [[632, 504], [615, 524], 22], [[622, 501], [599, 527], 22], [[612, 498], [587, 530], 22], [[602, 494], [573, 533], 22],
    [[592, 490], [559, 535], 22], [[582, 486], [543, 533], 22], [[572, 482], [524, 531], 22, 0.02], [[566, 478], [496, 514], 22, 0.03], [[562, 474], [474, 495], 22, 0.03],
    [[560, 470], [459, 468], 22, 0.02], [[560, 466], [460, 433], 21, -0.04]],
  coverts: [[[640, 486], [600, 507], 22], [[634, 480], [578, 502], 22], [[626, 475], [556, 497], 21], [[616, 470], [534, 492], 20], [[604, 466], [527, 475], 19], [[592, 462], [521, 457], 18]],
  lead: [[640, 472], [618, 466], [594, 460], [568, 455], [540, 452], [510, 446]], leadWs: [0.8, 2.4, 2.6, 2.2, 1.4, 0.5],
};
const FIST_R = { out: [[752, 471], [769, 473], [783, 483], [790, 497], [788, 508], [781, 518], [768, 526], [752, 527], [739, 523], [731, 515], [729, 504], [734, 494], [744, 489], [749, 482]],
  lobes: [[[735, 491], [744, 489], [752, 492], [751, 499], [742, 500], [735, 498]], [[729, 503], [740, 501], [750, 504], [749, 512], [737, 514], [730, 511]], [[733, 515], [745, 513], [757, 516], [755, 523], [742, 525], [734, 522]]],
  tucked: [[[750, 528], [779, 535], 10], [[748, 533], [775, 542], 9], [[746, 537], [768, 547], 8]] };
function fist(g, F) {
  for (const [r, t, w] of F.tucked) flight(g, r, t, w, { ink: 1.6, barbN: 1 });
  softFill(g, smoothFn(F.out), { base: 0.96, rim: 0.82, light: [-0.4, -0.9], depth: 8, blur: 6 });
  const q = curve(F.out, true, 8);
  taper(g, [...q, q[0]], () => 1.9, INK);
  fineHatch(g, smoothFn(F.out), [728, 470, 792, 528], { dir: () => [0.6, 0.8], tone: (p) => Math.max(0, (p[0] - 755) / 35), spacing: 3.5, len: [5, 11], w: [0.4, 0.8], color: gv(0.5, 0.6), seed: 61 });
  for (const l of F.lobes) lobe(g, l, { v: 0.95, rim: 0.8, ink: 1.8, depth: 3, blur: 2 });
}
// two pairs (2385): each wing a feathered hand round a pair's rings, the wing's feathers fanned below it
//   left pair: pivot (593, 448), blade tips (574, 395) / (608, 394); right pair: pivot (781, 427), tips (746, 378) / (778, 370)
// (2394: the left wing's feathers hang to x ≈ 610 at y ≈ 519; the right wing's to (792, 536), fanned up to the hand)
const TW_L = { seed: 9, lower: 1,
  feathers: [[[646, 500], [628, 522], 20], [[642, 497], [614, 519], 21], [[636, 494], [602, 512], 21], [[630, 492], [592, 504], 20], [[624, 490], [584, 496], 19]],
  coverts: [[[646, 490], [618, 506], 20], [[640, 486], [606, 496], 18]] };
const TW_R = { seed: 10, lower: -1,
  feathers: [[[752, 500], [772, 530], 20], [[756, 496], [792, 536], 22], [[762, 492], [804, 524], 21], [[768, 488], [812, 510], 20], [[774, 484], [818, 494], 18]],
  coverts: [[[754, 490], [782, 508], 20], [[760, 485], [794, 496], 18]] };
const HANDS = {
  L: { sc: { x: 593, y: 448, ang: -1.607, L: 54, open: 0.62, lw: 1.7 },
    out: [[572, 452], [586, 450], [597, 456], [618, 474], [627, 488], [624, 498], [608, 500], [590, 500], [576, 497], [571, 488], [570, 470]],
    lobes: [[[572, 453], [585, 452], [594, 457], [592, 465], [580, 467], [572, 463]], [[571, 472], [586, 471], [597, 476], [595, 485], [581, 488], [572, 484]], [[575, 489], [590, 488], [601, 492], [598, 499], [584, 500], [576, 497]]] },
  R: { sc: { x: 781, y: 427, ang: -1.915, L: 56, open: 0.57, lw: 1.7 },
    out: [[768, 458], [790, 456], [806, 446], [816, 448], [820, 462], [818, 478], [808, 489], [790, 491], [774, 486], [766, 474]],
    lobes: [[[803, 444], [815, 446], [820, 454], [812, 458], [803, 455]], [[806, 458], [818, 460], [820, 469], [811, 473], [804, 469]], [[801, 472], [814, 474], [815, 483], [805, 487], [798, 482]]] },
};
function hand(g, H) {
  softFill(g, smoothFn(H.out), { base: 0.96, rim: 0.8, light: [-0.4, -0.9], depth: 6, blur: 5 });
  const q = curve(H.out, true, 8); taper(g, [...q, q[0]], () => 1.7, INK);
  if (H.sc) drawScissors(g, H.sc);
  for (const l of H.lobes) lobe(g, l, { v: 0.95, rim: 0.8, ink: 1.8, depth: 3, blur: 2 });
}

// ---------------------------------------------------------------- the zip (95.96–97.04): two drawings alternating
// A (read on 2403, root = body centre (451, 166)): flying, head 3/4 to our left, the left pair raised in its left
// hand (pivot ≈ (318, 100), blades up-left to (296, 31) / (254, 77)), the right pair raised behind the head (pivot ≈
// (503, 26), blades up-left past the frame top), wing feathers hanging under the left arm, the right wing fanned out
// behind, tail feathers to the right, talons dangling. B (2404, root (450, 165)): lunging left, both pairs thrust
// forward nearly level (tips (247, 232) / (292, 243)), the right wing swept back, feet trailing.
function mass(g, out, o) {
  softFill(g, smoothFn(out), { base: 0.97, rim: 0.8, light: [-0.4, -0.9], depth: 12, blur: 9 });
  if (o.shade) shade(g, smoothFn(out), (q) => q.ellipse(o.shade[0], o.shade[1], o.shade[2], o.shade[3], 0.4, 0, TAU), 0.66, 0.4, 14);
  if (o.tone) tufts(g, smoothFn(out), o.box, { dir: flowDir([0.4, 1], []), tone: blobTone(o.tone, 0.05), cell: 13, n: [2, 4], len: [6, 13], gap: 2.4, w: [0.4, 0.9], v: [0.62, 0.42], alpha: 0.75, seed: o.seed || 7 });
  const q = curve(out, true, 8);
  taper(g, [...q, q[0]], () => o.ink ?? 1.5, gv(0.4, 0.9));
}
function zipHead(g, Z) {
  mass(g, Z.body, { shade: Z.shade, tone: Z.tone, box: Z.box, seed: Z.seed });
  if (Z.pre) Z.pre(g);
  mass(g, Z.head, { ink: 1.6 });
  // the facial disc: a grey line under the eyes
  stroke(g, Z.disc, [0.3, 1.0, 1.0, 0.3], { color: gv(0.5, 0.8) });
  for (const t of Z.tufts || []) { g.fillStyle = gv(0.95); g.beginPath(); smoothFn(t)(g); g.fill(); stroke(g, [t[1], t[0], t[2]], [0.6, 1.6, 0.6]); }
  for (const e of Z.eyes) {
    g.fillStyle = gv(0.99); g.beginPath(); smoothFn([...e.lid, ...e.brow.slice().reverse()])(g); g.fill();
    if (e.pupil) { g.save(); g.beginPath(); smoothFn([...e.lid, ...e.brow.slice().reverse()])(g); g.clip(); g.fillStyle = INK; g.beginPath(); g.ellipse(e.pupil[0], e.pupil[1], e.pupil[2], e.pupil[2], 0, 0, TAU); g.fill(); g.fillStyle = gv(0.97); g.beginPath(); g.arc(e.pupil[0] - 1, e.pupil[1] - 1.5, 1.2, 0, TAU); g.fill(); g.restore(); }
    stroke(g, e.lid, [1.2, 2.0, 2.2, 1.6, 1.0]);
    stroke(g, e.brow, e.browWs);
  }
  hookBeak(g, { upper: Z.beak, ink: 1.8, v: 0.86, gape: Z.gape || null });
  setPPU(1); drawBandage(g, Z.bandage);
  band(g, Z.band, { w: 5.5, v: 0.22, ridge: 0.66 });
  cup3(g, Z.cup);
}
function zipFeet(g, list) { for (const L of list) { const q = curve(L.leg, false, 6); taper(g, q, (u) => L.w * (1 - 0.25 * u) + 3.6, INK); taper(g, q, (u) => L.w * (1 - 0.25 * u), gv(0.9)); L.toes.forEach((t, i) => toe(g, t, 6, { claw: 7, curl: L.curl ?? 1, ink: 1.5, tick: 5, seed: 3 + i, end: 0.7 })); } }
const ZA = {
  root: [451, 166], box: [236, -12, 590, 248],
  head: [[358, 100], [362, 76], [378, 56], [402, 46], [428, 45], [452, 54], [468, 72], [474, 94], [470, 116], [456, 132], [434, 142], [408, 144], [384, 136], [366, 120]],
  body: [[384, 124], [420, 116], [470, 110], [503, 124], [517, 148], [509, 172], [488, 188], [462, 199], [436, 202], [406, 196], [386, 182], [376, 160]],
  disc: [[372, 128], [388, 136], [406, 140], [424, 138]],
  shade: [492, 172, 36, 34], tone: [[500, 160, 20, 40, 0.9], [440, 200, 50, 12, 0.8]], seed: 71,
  tufts: [[[380, 50], [373, 62], [385, 60]]],
  eyes: [
    { brow: [[372, 104], [385, 108], [398, 117]], browWs: [1.2, 3.2, 4.0, 2.6], lid: [[373, 106], [373, 116], [380, 124], [390, 125], [396, 121], [398, 117]], pupil: [387, 116, 3.4] },
    { brow: [[410, 112], [421, 104], [434, 99]], browWs: [2.6, 4.0, 3.2, 1.2], lid: [[410, 112], [413, 119], [421, 122], [430, 120], [435, 112], [434, 99]], pupil: [419, 112, 3.6] },
  ],
  beak: [[395, 126], [403, 124], [412, 128], [411, 137], [405, 145], [401, 146], [398, 138]], gape: [[401, 138], [408, 136], [410, 143], [403, 147]],
  bandage: { x: 400, y: 70, size: 30, rot: -0.3, cross: 1.45 },
  band: [[360, 116], [362, 90], [368, 68], [384, 50], [406, 38], [430, 34], [448, 42], [458, 56], [462, 70]],
  cup: { c: [471, 89], rx: 11, ry: 21, rot: -0.2, d: [-9, 2], back: 1, cs: 1.12, faceV: 0.6, sideV: 0.42, cushV: 0.2, rings: [0.3], pleats: 22, seed: 13, ink: 2.1 },
  // the right wing raised to the hand behind the head: covert rows up the arm (wingR2), its feathers fanned out to the right
  wingR2: { seed: 24, lower: -1, feathers: [], coverts: [[[488, 128], [500, 100], 22], [[494, 110], [508, 80], 22], [[500, 92], [514, 62], 20]] },
  armR: [[478, 110], [486, 80], [500, 58], [516, 50], [528, 60], [522, 84], [512, 112], [500, 136], [486, 134]],
  wingR: { seed: 21, lower: -1, feathers: [[[500, 150], [540, 168], 18], [[506, 136], [550, 154], 20], [[510, 120], [556, 132], 21], [[514, 104], [558, 108], 21], [[518, 88], [556, 84], 21], [[520, 74], [550, 62], 18]],
    coverts: [[[500, 128], [530, 136], 18], [[504, 112], [534, 114], 18], [[510, 96], [536, 94], 16]] },
  tail: [[[505, 176], [548, 170], 14], [[502, 184], [542, 186], 13]],
  scR: { x: 498, y: 26, ang: -2.61, L: 60, open: 0.6, lw: 1.8 },
  handR: { out: [[508, 30], [522, 26], [536, 32], [542, 46], [536, 60], [522, 64], [508, 58], [503, 44]],
    lobes: [[[510, 30], [524, 28], [532, 36], [523, 42], [511, 40]], [[508, 42], [523, 41], [532, 50], [522, 56], [510, 53]]] },
  // the left arm out to the hand at the left, its feathers hanging under it
  armL: [[344, 118], [364, 120], [388, 126], [410, 140], [410, 162], [392, 168], [366, 156], [346, 146]],
  wingL: { seed: 22, lower: 1, feathers: [[[404, 156], [396, 176], 18], [[394, 152], [376, 180], 19], [[382, 148], [354, 182], 19], [[370, 144], [332, 178], 19], [[358, 140], [313, 168], 18], [[348, 136], [300, 154], 16]],
    coverts: [[[404, 142], [382, 160], 20], [[390, 136], [364, 156], 20], [[376, 130], [350, 150], 19], [[362, 126], [340, 140], 18]] },
  scL: { x: 311, y: 101, ang: -2.26, L: 66, open: 0.96, lw: 1.8 },
  handL: { out: [[312, 112], [326, 108], [342, 114], [352, 126], [348, 140], [332, 146], [316, 142], [308, 128]],
    lobes: [[[313, 113], [327, 110], [336, 118], [327, 124], [315, 122]], [[311, 125], [327, 123], [339, 131], [329, 138], [314, 135]]] },
  feet: [{ leg: [[452, 196], [462, 208], [470, 216]], w: 13, toes: [[[470, 216], [462, 226], [456, 233]], [[471, 217], [472, 228], [472, 236]], [[472, 216], [480, 224], [487, 229]]] },
    { leg: [[500, 184], [522, 194], [540, 199]], w: 13, toes: [[[540, 199], [552, 192], [561, 189]], [[541, 200], [556, 202], [568, 205]], [[540, 201], [549, 210], [555, 216]]] }],
};
const ZB = {
  root: [450, 165], box: [226, -8, 590, 260],
  head: [[358, 104], [362, 80], [378, 60], [402, 50], [428, 49], [452, 58], [468, 76], [474, 98], [470, 120], [456, 136], [434, 146], [408, 148], [384, 140], [366, 124]],
  body: [[380, 130], [420, 124], [470, 118], [506, 132], [528, 156], [534, 182], [524, 206], [504, 224], [476, 236], [446, 238], [418, 230], [398, 212], [384, 186], [376, 158]],
  disc: [[372, 132], [388, 140], [406, 144], [424, 142]],
  shade: [508, 200, 36, 36], tone: [[520, 180, 20, 45, 0.9], [460, 234, 50, 12, 0.8]], seed: 72,
  tufts: [[[380, 54], [373, 66], [385, 64]]],
  eyes: [
    { brow: [[372, 106], [386, 110], [398, 118]], browWs: [1.2, 3.2, 4.0, 2.6], lid: [[373, 108], [374, 117], [381, 125], [391, 125], [397, 121], [398, 118]], pupil: [388, 116, 3.4] },
    { brow: [[408, 116], [420, 108], [433, 104]], browWs: [2.6, 4.0, 3.2, 1.2], lid: [[408, 116], [412, 121], [420, 122], [429, 119], [434, 112], [433, 104]], pupil: [419, 113, 3.6] },
  ],
  beak: [[393, 127], [402, 125], [412, 129], [411, 138], [405, 147], [400, 148], [396, 139]], gape: [[400, 139], [408, 137], [410, 145], [403, 149]],
  bandage: { x: 402, y: 74, size: 30, rot: -0.3, cross: 1.45 },
  band: [[357, 106], [360, 84], [368, 62], [386, 46], [404, 38], [430, 35], [450, 44], [460, 58], [463, 70]],
  cup: { c: [471, 91], rx: 11, ry: 23, rot: -0.15, d: [-9, 2], back: 1, cs: 1.12, faceV: 0.6, sideV: 0.42, cushV: 0.2, rings: [0.3], pleats: 22, seed: 14, ink: 2.1 },
  wingR: { seed: 23, lower: -1, feathers: [[[516, 180], [552, 180], 16], [[518, 170], [560, 166], 18], [[516, 160], [564, 152], 18], [[510, 150], [556, 138], 17]] },
  tail: [[[520, 208], [556, 210], 13]],
  sc: [{ x: 319, y: 217, ang: 2.943, L: 73, open: 0.12, lw: 1.8 }, { x: 370, y: 225, ang: 2.915, L: 80, open: 0.1, lw: 1.8 }],
  hands: [{ out: [[340, 198], [356, 192], [370, 198], [374, 212], [366, 224], [350, 226], [338, 216]], lobes: [[[340, 200], [354, 197], [362, 205], [352, 210], [341, 208]], [[339, 211], [354, 209], [363, 217], [352, 223], [341, 220]]] },
    { out: [[392, 206], [410, 200], [426, 206], [432, 220], [424, 232], [406, 234], [392, 224]], lobes: [[[393, 208], [408, 205], [417, 213], [406, 218], [394, 216]], [[392, 220], [408, 218], [418, 226], [406, 232], [394, 229]]] }],
  arms: [[[388, 158], [372, 180], [358, 200], 18], [[436, 176], [426, 194], [414, 210], 18]],
  feet: [{ leg: [[452, 232], [462, 236], [470, 236]], w: 12, toes: [[[468, 234], [462, 238], [455, 240]], [[470, 236], [478, 238], [484, 237]], [[470, 235], [477, 230], [482, 226]]] },
    { leg: [[522, 202], [538, 206], [548, 207]], w: 12, toes: [[[548, 206], [558, 200], [566, 196]], [[549, 208], [560, 210], [570, 213]], [[548, 209], [553, 215], [556, 219]]] }],
};
function armMass(g, out) { softFill(g, smoothFn(out), { base: 0.96, rim: 0.8, light: [-0.4, -0.9], depth: 8, blur: 6 }); const q = curve(out, true, 8); taper(g, [...q, q[0]], () => 1.6, gv(0.35, 0.9)); }
function zipA(g) {
  const Z = ZA;
  drawScissors(g, Z.scR);
  wing(g, Z.wingR);
  for (const [r, t, w] of Z.tail) flight(g, r, t, w, { ink: 1.6, barbN: 2 });
  zipFeet(g, Z.feet);
  zipHead(g, { ...Z, pre: (q) => { wing(q, Z.wingR2); hand(q, Z.handR); } });
  wing(g, Z.wingL);
  drawScissors(g, Z.scL); hand(g, Z.handL);
}
function zipB(g) {
  const Z = ZB;
  wing(g, Z.wingR);
  for (const [r, t, w] of Z.tail) flight(g, r, t, w, { ink: 1.6, barbN: 2 });
  zipFeet(g, Z.feet);
  zipHead(g, Z);
  for (const [a, b, c, w] of Z.arms) { const q = curve([a, b, c], false, 6); taper(g, q, () => w + 3, gv(0.3)); taper(g, q, () => w, gv(0.95)); ruff(g, [[a[0] - 8, a[1] + 6], [b[0] - 9, b[1] + 3], [c[0] - 8, c[1]]], { step: 6, len: [4, 8], w: [0.6, 1.1], v: 0.35, alpha: 0.8, side: 1, seed: 51 }); }
  for (const sc of Z.sc) drawScissors(g, sc);
  for (const h of Z.hands) hand(g, h);
}
// a zip drawing as a layer relative to its root (body centre), optionally mirrored about the root
export function zipLayer(name, flip = false) {
  const Z = name === "zipA" ? ZA : ZB, key = name + (flip ? ":f" : "");
  const base = layer(name, Z.box, name === "zipA" ? zipA : zipB);
  if (!flip) return { canvas: base.c, x: base.x - Z.root[0], y: base.y - Z.root[1], w: base.c.width, h: base.c.height };
  if (!LAYERS.has(key)) {
    const c = document.createElement("canvas"); c.width = base.c.width; c.height = base.c.height;
    const g = c.getContext("2d"); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(base.c, 0, 0);
    LAYERS.set(key, { c, x: 0, y: 0 });
  }
  const F = LAYERS.get(key), x0 = base.x - Z.root[0];
  return { canvas: F.c, x: -(x0 + base.c.width), y: base.y - Z.root[1], w: F.c.width, h: F.c.height };
}

// ---------------------------------------------------------------- the crouch (91.84–92.56, read on 2305) and the wipe
// (90.48–91.80, read on 2280), drawn like the power-up so the owl keeps one look through the beat
function eyesOf(g, eyes) {
  for (const e of eyes) {
    if (e.shut) { stroke(g, e.shut, [0.8, 2.2, 2.6, 1.6, 0.6]); continue; }
    const P = [...e.lid, ...e.brow.slice().reverse()];
    g.fillStyle = gv(0.99); g.beginPath(); smoothFn(P)(g); g.fill();
    if (e.pupil) { g.save(); g.beginPath(); smoothFn(P)(g); g.clip(); g.fillStyle = INK; g.beginPath(); g.ellipse(e.pupil[0], e.pupil[1], e.pupil[2], e.pupil[2], 0, 0, TAU); g.fill(); g.fillStyle = gv(0.97); g.beginPath(); g.arc(e.pupil[0] - 1, e.pupil[1] - 1.4, 1.1, 0, TAU); g.fill(); g.restore(); }
    stroke(g, e.lid, [1.2, 2.0, 2.2, 1.8, 1.2]);
    stroke(g, e.brow, e.browWs);
  }
}
function body2(g, B) {
  // a fluffy head+body mass: soft fill, fur tufts at the edges, a light contour, feather ruff along the fluffy parts
  const path = smoothFn(B.out);
  softFill(g, path, { base: 1, rim: 0.84, light: [-0.4, -0.9], depth: 16, blur: 14 });
  if (B.shade) shade(g, path, (q) => q.ellipse(B.shade[0], B.shade[1], B.shade[2], B.shade[3], 0.3, 0, TAU), 0.66, 0.35, 14);
  tufts(g, path, B.box, { dir: flowDir([0, 1], [[B.c[0], B.c[1], 80, "t", 0.7]]), tone: blobTone(B.tone, 0.05), cell: 13, n: [2, 4], len: [6, 13], gap: 2.4, w: [0.4, 0.9], v: [0.62, 0.42], alpha: 0.75, seed: B.seed || 5 });
  const q = curve(B.out, true, 8), n = q.length;
  let A = 0; for (let i = 0; i < n; i++) { const p = q[i], r = q[(i + 1) % n]; A += p[0] * r[1] - r[0] * p[1]; }
  const sh = q.map((p, i) => { const a = q[(i - 1 + n) % n], b = q[(i + 1) % n], t = nrm(sub(b, a)), o = A > 0 ? [t[1], -t[0]] : [-t[1], t[0]]; return Math.max(0, Math.min(1, 0.5 + 0.6 * o[1] + 0.35 * o[0])); });
  taper(g, [...q, q[0]], (u) => 0.6 + 0.9 * sh[Math.min(n - 1, Math.round(u * n))], gv(0.45, 0.8));
  // a fluffy edge: small white scallops bulging out of the contour, each with a fine grey rim (the source's plumage
  // silhouette is feathered, not a clean line)
  if (B.fluff !== false) {
    const rr = rng(B.seed || 5);
    let acc = 0;
    for (let i = 1; i < n; i++) {
      acc += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
      if (acc < 9) continue; acc = rr() * 3;
      const f = sh[i]; if (f < 0.4 || rr() < 0.45) continue;
      const t = nrm(sub(q[Math.min(n - 1, i + 1)], q[i - 1])), o = A > 0 ? [t[1], -t[0]] : [-t[1], t[0]], rad = 2 + 1.8 * rr(), c = add(q[i], mul(o, rad * 0.2));
      const a0 = Math.atan2(o[1], o[0]);
      g.fillStyle = gv(0.93); g.beginPath(); g.arc(c[0], c[1], rad, a0 - 1.6, a0 + 1.6); g.fill();
      g.strokeStyle = gv(0.42, 0.8); g.lineWidth = 0.7 + 0.6 * f; g.beginPath(); g.arc(c[0], c[1], rad, a0 - 1.2, a0 + 1.2); g.stroke();
    }
  }
  if (B.ruff) for (const r of B.ruff) ruff(g, r, { step: 7, len: [4, 9], w: [0.6, 1.2], v: 0.3, alpha: 0.8, lean: 0.25, side: -1, seed: 33, skip: 0.2 });
}
function face(g, F) {
  for (const t of F.tufts || []) { g.fillStyle = gv(0.95); g.beginPath(); smoothFn(t)(g); g.fill(); stroke(g, [t[1], t[0], t[2]], [0.6, 1.8, 0.6]); }
  if (F.disc) for (const d of F.disc) stroke(g, d, [0.3, 1.0, 1.0, 0.3], { color: gv(0.5, 0.8) });
  eyesOf(g, F.eyes);
  hookBeak(g, { upper: F.beak, ink: 1.8, v: 0.86, shade: F.beakShade || null });
  setPPU(1); drawBandage(g, F.bandage);
  if (F.cupL) cup3(g, F.cupL);
  band(g, F.band, { w: 5.5, v: 0.22, ridge: 0.66 });
  if (F.cupR) cup3(g, F.cupR);
}
// a folded wing bent at the elbow down to a feathered fist: a thick soft limb S → E → F, hanging feather tips along
// its lower edge, the fist a clump of three knuckle lobes
function limb(g, S, E, F, w, sd) {
  const q = curve([S, [(S[0] + E[0]) / 2, Math.min(S[1], E[1]) - 5], E, [(E[0] + F[0]) / 2 + sd * 5, (E[1] + F[1]) / 2], F], false, 6);
  taper(g, q, (u) => w * (1 - 0.3 * u) + 3, gv(0.35, 0.9)); taper(g, q, (u) => w * (1 - 0.3 * u), gv(0.95));
  const lo = q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], t = nrm(sub(b, a)), nn = perp(t), side = nn[1] > 0 ? 1 : -1; return add(p, mul(nn, side * w * 0.42)); });
  ruff(g, lo.slice(2, -3), { step: 6, len: [5, 10], w: [0.6, 1.2], v: 0.3, alpha: 0.85, lean: 0.2, side: 1, seed: 41 + sd });
}
function fistC(g, c, r, sd) {
  const lobes = [-1, 0, 1].map((k) => { const cx = c[0] - sd * r * 0.25, cy = c[1] + k * r * 0.55; const pts = []; for (let a = 0; a < 12; a++) { const t = a / 12 * TAU; pts.push([cx + Math.cos(t) * r * 0.62, cy + Math.sin(t) * r * 0.36]); } return pts; });
  const out = []; for (let a = 0; a < 18; a++) { const t = a / 18 * TAU; out.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r * 1.05]); }
  softFill(g, smoothFn(out), { base: 0.96, rim: 0.8, light: [-0.4, -0.9], depth: 5, blur: 4 });
  const q = curve(out, true, 6); taper(g, [...q, q[0]], () => 1.8, INK);
  for (const l of lobes) lobe(g, l, { v: 0.95, rim: 0.82, ink: 1.5, depth: 2, blur: 2 });
}
const CROUCH = {
  body: { out: [[642, 450], [662, 440], [688, 436], [714, 438], [732, 446], [745, 462], [751, 482], [751, 502], [747, 522], [745, 544], [737, 559], [716, 567], [694, 569], [672, 567], [655, 559], [646, 541], [643, 520], [638, 502], [634, 482], [636, 462]],
    box: [636, 432, 752, 572], c: [695, 510], shade: [730, 540, 26, 34], tone: [[650, 530, 16, 36, 0.8], [740, 525, 16, 38, 0.9], [695, 565, 50, 10, 0.8]], seed: 25,
    ruff: [[[648, 520], [652, 545], [664, 562], [690, 568], [716, 566], [736, 556], [744, 538]]] },
  face: {
    tufts: [[[650, 436], [645, 452], [658, 449]], [[734, 434], [727, 451], [739, 452]]],
    disc: [[[652, 508], [664, 516], [680, 520]], [[692, 520], [708, 516], [722, 508]]],
    eyes: [{ brow: [[653, 489], [666, 493], [679, 501]], browWs: [1.2, 3.6, 4.8, 3.4], lid: [[654, 491], [656, 499], [663, 505], [671, 506], [677, 503], [679, 501]], pupil: [668, 499, 3.4] },
      { brow: [[686, 501], [699, 494], [713, 488]], browWs: [3.4, 4.8, 3.6, 1.2], lid: [[686, 501], [690, 506], [699, 508], [707, 505], [712, 498], [713, 488]], pupil: [698, 500, 3.4] }],
    beak: [[677, 504], [684, 501], [691, 504], [690, 511], [686, 518], [682, 521], [679, 513]],
    bandage: { x: 666, y: 467, size: 32, rot: -0.85, cross: 1.5 },
    band: [[636, 488], [638, 468], [645, 452], [661, 436], [687, 427], [713, 428], [729, 440], [736, 456], [739, 468]],
    cupR: { c: [737, 478], rx: 10, ry: 19, rot: -0.05, d: [-9, 0], back: 1, cs: 1.12, faceV: 0.6, sideV: 0.42, cushV: 0.2, rings: [0.3], pleats: 20, seed: 16, ink: 2.1 },
  },
  legs: [{ leg: [[664, 560], [660, 568], [657, 573]], w: 15, toes: [[[657, 573], [648, 576], [640, 578]], [[657, 574], [652, 579], [648, 583]], [[658, 574], [664, 578], [668, 581]]] },
    { leg: [[731, 560], [735, 568], [738, 573]], w: 15, toes: [[[738, 573], [732, 578], [728, 582]], [[739, 574], [742, 579], [744, 584]], [[740, 573], [747, 577], [752, 580]]] }],
};
function crouchDraw(g) {
  const C = CROUCH;
  zipFeet(g, C.legs);
  body2(g, C.body);
  limb(g, [662, 500], [612, 499], [617, 526], 34, -1);
  limb(g, [728, 498], [782, 494], [780, 521], 34, 1);
  fistC(g, [617, 531], 16, -1); fistC(g, [780, 526], 16, 1);
  face(g, C.face);
}
const WIPE = {
  body: { out: [[662, 422], [680, 412], [702, 410], [720, 414], [731, 424], [736, 444], [737, 470], [736, 494], [734, 520], [726, 542], [713, 554], [694, 559], [672, 556], [656, 547], [646, 528], [642, 506], [642, 484], [648, 458], [654, 438]],
    box: [640, 404, 742, 562], c: [692, 490], shade: [724, 520, 22, 34], tone: [[652, 520, 14, 34, 0.8], [730, 515, 14, 36, 0.9], [692, 556, 44, 10, 0.8]], seed: 26,
    ruff: [[[651, 520], [656, 540], [672, 554], [694, 558], [714, 552], [728, 534]]] },
  face: {
    tufts: [[[664, 412], [660, 426], [671, 424]], [[722, 416], [716, 429], [727, 430]]],
    eyes: [{ shut: [[689, 452], [696, 455], [704, 455], [711, 451]] }],
    beak: [[669, 461], [676, 459], [683, 462], [682, 469], [678, 476], [675, 478], [672, 470]],
    bandage: { x: 688, y: 424, size: 30, rot: -0.6, cross: 1.45 },
    band: [[662, 426], [665, 414], [676, 405], [696, 400], [716, 403], [729, 414], [735, 428], [738, 440]],
    cupR: { c: [737, 450], rx: 10, ry: 17, rot: -0.1, d: [-8, 0], back: 1, cs: 1.12, faceV: 0.6, sideV: 0.42, cushV: 0.2, rings: [0.3], pleats: 20, seed: 17, ink: 2.1 },
  },
  // the left wing across the brow: a feathered limb from the shoulder up over the forehead, its feather tips at the right
  wing: { seed: 27, lower: 1, feathers: [[[636, 486], [628, 458], 24], [[640, 480], [640, 446], 26], [[646, 474], [656, 436], 26], [[652, 468], [674, 430], 24], [[658, 462], [690, 432], 22], [[664, 458], [694, 442], 18]],
    coverts: [[[638, 492], [630, 468], 26], [[644, 486], [644, 458], 24], [[652, 480], [662, 452], 22]] },
  sc: { x: 760, y: 530, ang: Math.PI / 2 + 0.05, L: 48, open: 0.08, lw: 1.6 },
  handR: { out: [[731, 482], [746, 478], [762, 482], [768, 492], [760, 500], [744, 501], [732, 496]],
    lobes: [[[744, 480], [756, 480], [764, 486], [756, 491], [746, 489]], [[748, 490], [760, 490], [767, 496], [758, 501], [749, 498]]] },
  tail: [[[656, 530], [636, 540], 14], [[660, 536], [644, 548], 12]],
  legs: [{ leg: [[664, 552], [662, 562], [661, 569]], w: 14, toes: [[[661, 569], [654, 574], [650, 578]], [[662, 570], [661, 576], [660, 580]], [[663, 569], [668, 574], [672, 577]]] },
    { leg: [[704, 555], [706, 562], [708, 566]], w: 14, toes: [[[708, 566], [700, 569], [692, 571]], [[709, 567], [712, 571], [716, 574]], [[710, 566], [716, 567], [721, 566]]] }],
};
function wipeDraw(g) {
  const W = WIPE;
  for (const [r, t, w] of W.tail) flight(g, r, t, w, { ink: 1.5, barbN: 1 });
  zipFeet(g, W.legs);
  drawScissors(g, W.sc);
  body2(g, W.body);
  face(g, W.face);
  wing(g, W.wing);
  hand(g, W.handR);
}
export function owlCrouchLayer() { return layer("crouch", [590, 420, 810, 600], crouchDraw); }
export function owlWipeLayer() { return layer("wipe", [610, 390, 790, 600], wipeDraw); }

// ---------------------------------------------------------------- the carries (84.12–88.32, read on 2112; root =
// the kit's body centre at 2112, (1371, 312)): walking with the load held up on raised wings, head 3/4 to our left,
// the right eye winking. Four foot drawings for the walk (on twos, as before), and two facing-us heads (the squeeze,
// both eyes shut, 87.68–87.72; glaring to our right, 88.08–88.32)
const CAR = {
  root: [1371, 312], box: [1196, 160, 1512, 366],
  body: { out: [[1318, 214], [1332, 206], [1350, 203], [1370, 204], [1388, 208], [1398, 218], [1404, 236], [1404, 258], [1404, 282], [1398, 312], [1386, 336], [1364, 346], [1342, 344], [1326, 332], [1314, 306], [1310, 282], [1308, 262], [1307, 244], [1310, 226]],
    box: [1300, 176, 1414, 350], c: [1360, 290], shade: [1396, 316, 18, 26], tone: [[1318, 300, 10, 30, 0.8], [1402, 300, 10, 30, 0.9], [1370, 344, 36, 8, 0.8]], seed: 61 },
  wingL: { seed: 62, lower: -1, feathers: [[[1318, 290], [1300, 318], 20], [[1316, 286], [1284, 306], 22], [[1320, 282], [1308, 302], 20], [[1314, 274], [1287, 292], 22], [[1308, 266], [1271, 275], 22], [[1300, 258], [1254, 258], 22], [[1292, 250], [1242, 242], 22],
      [[1286, 243], [1229, 221], 24], [[1282, 236], [1212, 195], 22], [[1286, 230], [1224, 190], 18]],
    coverts: [[[1326, 282], [1304, 282], 22], [[1324, 268], [1292, 262], 22], [[1318, 256], [1280, 246], 20], [[1310, 246], [1268, 228], 18], [[1302, 238], [1258, 212], 16]] },
  wingR: { seed: 63, lower: 1, feathers: [[[1400, 280], [1420, 300], 20], [[1404, 274], [1436, 292], 22], [[1400, 268], [1421, 283], 20], [[1406, 260], [1442, 279], 22], [[1412, 252], [1458, 267], 22], [[1418, 244], [1471, 250], 22], [[1424, 238], [1479, 229], 22],
      [[1430, 232], [1490, 204], 24], [[1434, 227], [1500, 180], 22], [[1432, 222], [1488, 176], 18]],
    coverts: [[[1396, 280], [1418, 280], 22], [[1398, 266], [1430, 262], 22], [[1404, 254], [1440, 244], 20], [[1412, 244], [1450, 226], 18], [[1420, 236], [1460, 208], 16]] },
  tail: [[[1398, 318], [1446, 330], 12], [[1396, 326], [1436, 338], 11]],
  side: {
    tufts: [[[1320, 204], [1316, 216], [1327, 213]], [[1390, 204], [1385, 215], [1395, 216]]],
    eyes: [{ brow: [[1317, 240], [1329, 243], [1342, 250]], browWs: [1, 2.8, 3.4, 2.2], lid: [[1320, 242], [1322, 250], [1328, 255], [1335, 255], [1340, 252], [1342, 250]], pupil: [1331, 250, 2.8] },
      { shut: [[1352, 249], [1360, 246], [1368, 245], [1375, 248]] }],
    extra: [[[1351, 241], [1362, 236], [1375, 239]]],
    beak: [[1335, 257], [1342, 255], [1350, 258], [1349, 265], [1344, 271], [1341, 273], [1338, 266]],
    bandage: { x: 1341, y: 219, size: 28, rot: -0.55, cross: 1.45 },
    band: [[1306, 252], [1307, 230], [1316, 206], [1338, 188], [1362, 183], [1384, 190], [1398, 206], [1403, 222]],
    cupL: { c: [1310, 240], rx: 4.5, ry: 15, rot: 0.05, d: [6, 0], back: 1, cs: 1.1, faceV: 0.5, sideV: 0.38, cushV: 0.2, rings: [0.35], pleats: 12, seed: 20, ink: 1.8 },
    cupR: { c: [1398, 241], rx: 9, ry: 20, rot: -0.05, d: [-8, 0], back: 1, cs: 1.12, faceV: 0.6, sideV: 0.42, cushV: 0.2, rings: [0.3], pleats: 18, seed: 18, ink: 1.9 },
  },
  front: {
    tufts: [[[1320, 204], [1316, 216], [1327, 213]], [[1390, 204], [1385, 215], [1395, 216]]],
    eyes: [{ brow: [[1325, 241], [1336, 244], [1347, 251]], browWs: [1, 2.8, 3.4, 2.2], lid: [[1327, 243], [1327, 251], [1332, 256], [1340, 256], [1345, 253], [1347, 251]], pupil: [1342, 250, 2.8] },
      { brow: [[1356, 251], [1367, 244], [1378, 241]], browWs: [2.2, 3.4, 2.8, 1], lid: [[1356, 251], [1360, 255], [1367, 257], [1374, 255], [1378, 250], [1378, 241]], pupil: [1373, 250, 2.8] }],
    beak: [[1344, 258], [1351, 256], [1358, 259], [1357, 266], [1353, 272], [1350, 274], [1347, 267]],
    bandage: { x: 1340, y: 219, size: 28, rot: -0.55, cross: 1.45 },
    band: [[1305, 250], [1307, 228], [1318, 205], [1340, 187], [1364, 184], [1386, 192], [1399, 208], [1403, 226]],
    cupL: { c: [1307, 240], rx: 6, ry: 17, rot: 0.05, d: [8, 0], back: 1, cs: 1.1, faceV: 0.55, sideV: 0.4, cushV: 0.2, rings: [0.35], pleats: 14, seed: 19, ink: 1.9 },
    cupR: { c: [1400, 240], rx: 7, ry: 18, rot: -0.05, d: [-8, 0], back: 1, cs: 1.12, faceV: 0.6, sideV: 0.42, cushV: 0.2, rings: [0.3], pleats: 18, seed: 18, ink: 1.9 },
  },
  // feet on the lip (y ≈ 355): legs apart (2112), right foot lifted, apart narrow, left foot lifted
  feet: [
    [{ leg: [[1342, 336], [1334, 346], [1328, 350]], w: 11, toes: [[[1328, 350], [1316, 351], [1305, 352]], [[1328, 351], [1322, 355], [1318, 357]], [[1329, 351], [1334, 355], [1338, 356]]] },
      { leg: [[1390, 336], [1402, 346], [1410, 350]], w: 11, toes: [[[1410, 350], [1405, 355], [1403, 358]], [[1411, 351], [1418, 356], [1422, 358]], [[1412, 350], [1422, 351], [1430, 353]]] }],
    [{ leg: [[1344, 336], [1340, 346], [1338, 351]], w: 11, toes: [[[1338, 351], [1328, 353], [1319, 355]], [[1338, 352], [1336, 356], [1334, 358]], [[1339, 352], [1345, 355], [1350, 356]]] },
      { leg: [[1388, 334], [1398, 338], [1408, 338]], w: 11, toes: [[[1408, 338], [1414, 344], [1418, 348]], [[1409, 339], [1419, 341], [1427, 344]], [[1409, 337], [1417, 334], [1424, 332]]] }],
    [{ leg: [[1344, 336], [1338, 346], [1334, 350]], w: 11, toes: [[[1334, 350], [1324, 352], [1314, 354]], [[1334, 351], [1330, 355], [1327, 357]], [[1335, 351], [1340, 355], [1345, 356]]] },
      { leg: [[1388, 336], [1396, 346], [1400, 351]], w: 11, toes: [[[1400, 351], [1396, 356], [1394, 358]], [[1401, 352], [1407, 356], [1412, 358]], [[1402, 351], [1411, 352], [1419, 354]]] }],
    [{ leg: [[1344, 334], [1334, 338], [1324, 340]], w: 11, toes: [[[1324, 340], [1314, 342], [1306, 346]], [[1324, 341], [1316, 347], [1312, 351]], [[1325, 340], [1320, 335], [1316, 332]]] },
      { leg: [[1390, 336], [1398, 346], [1402, 351]], w: 11, toes: [[[1402, 351], [1398, 356], [1396, 358]], [[1403, 352], [1409, 356], [1414, 358]], [[1404, 351], [1413, 352], [1421, 354]]] }],
  ],
};
function carryDraw(fi, head) {
  return (g) => {
    const C = CAR;
    for (const [r, t, w] of C.tail) flight(g, r, t, w, { ink: 1.4, barbN: 1 });
    zipFeet(g, C.feet[fi]);
    wing(g, { ...C.wingL, ink: 1.6, coverts: null }); wing(g, { ...C.wingR, ink: 1.6, coverts: null });
    body2(g, C.body);
    // the coverts lie over the shoulders (the source's raised wings are broad white masses joined to the body)
    wing(g, { seed: 64, lower: -1, ink: 1.5, feathers: [], coverts: C.wingL.coverts });
    wing(g, { seed: 65, lower: 1, ink: 1.5, feathers: [], coverts: C.wingR.coverts });
    const F = head === "front" || head === "sq" ? C.front : C.side;
    const Fx = head === "sq" ? { ...F, eyes: [{ shut: [[1328, 250], [1335, 253], [1342, 253], [1347, 250]] }, { shut: [[1357, 250], [1363, 253], [1370, 253], [1377, 250]] }] } : F;
    face(g, Fx);
    if (F.extra) for (const l of F.extra) stroke(g, l, [0.8, 2.4, 1.2]);
  };
}
// a carry drawing as a layer relative to its root, optionally mirrored about the root
export function carryLayer(fi = 0, head = "side", flip = false) {
  const key = `car${fi}${head}`;
  const base = layer(key, CAR.box, carryDraw(fi, head));
  const x0 = base.x - CAR.root[0], y0 = base.y - CAR.root[1];
  if (!flip) return { canvas: base.c, x: x0, y: y0, w: base.c.width, h: base.c.height };
  const fk = key + ":f";
  if (!LAYERS.has(fk)) { const c = document.createElement("canvas"); c.width = base.c.width; c.height = base.c.height; const q = c.getContext("2d"); q.translate(c.width, 0); q.scale(-1, 1); q.drawImage(base.c, 0, 0); LAYERS.set(fk, { c, x: 0, y: 0 }); }
  return { canvas: LAYERS.get(fk).c, x: -(x0 + base.c.width), y: y0, w: base.c.width, h: base.c.height };
}

// ---------------------------------------------------------------- the press (88.40–89.56, read on 2225; root = the kit's
// (721, 320)): facing us on the banner's lower edge, both wings spread level over it, glaring down with big pupils
const PRESS = {
  root: [721, 320], box: [550, 200, 905, 366],
  body: { out: [[688, 236], [704, 229], [722, 227], [742, 229], [756, 236], [764, 252], [765, 274], [762, 296], [760, 322], [752, 342], [735, 351], [716, 353], [698, 349], [687, 336], [683, 312], [680, 290], [678, 268], [680, 250]],
    box: [672, 222, 772, 358], c: [721, 300], shade: [754, 330, 16, 24], tone: [[684, 320, 10, 28, 0.8], [758, 318, 10, 28, 0.9], [720, 350, 36, 8, 0.8]], seed: 81 },
  face: {
    tufts: [[[690, 226], [686, 240], [697, 238]], [[756, 222], [750, 237], [762, 238]]],
    disc: [[[686, 290], [700, 297], [716, 299]], [[728, 299], [744, 296], [758, 289]]],
    eyes: [{ brow: [[699, 262], [711, 264], [723, 270]], browWs: [1, 3.0, 3.8, 2.6], lid: [[701, 265], [701, 274], [706, 281], [714, 283], [720, 279], [723, 270]], pupil: [714, 276, 4.6] },
      { brow: [[732, 270], [743, 263], [754, 260]], browWs: [2.6, 3.8, 3.0, 1], lid: [[732, 270], [735, 279], [742, 283], [749, 281], [753, 274], [754, 262]], pupil: [744, 276, 4.6] }],
    beak: [[720, 281], [727, 279], [734, 282], [733, 290], [729, 297], [726, 299], [723, 291]],
    bandage: { x: 714, y: 246, size: 26, rot: -0.75, cross: 1.5 },
    band: [[671, 258], [674, 238], [684, 222], [700, 213], [718, 210], [740, 213], [756, 225], [765, 240], [769, 256]],
    cupL: { c: [674, 267], rx: 7, ry: 16, rot: 0.05, d: [8, 0], back: 1, cs: 1.1, faceV: 0.5, sideV: 0.38, cushV: 0.2, rings: [0.35], pleats: 14, seed: 21, ink: 1.9 },
    cupR: { c: [770, 268], rx: 7, ry: 16, rot: -0.05, d: [-8, 0], back: 1, cs: 1.1, faceV: 0.55, sideV: 0.4, cushV: 0.2, rings: [0.3], pleats: 14, seed: 22, ink: 1.9 },
  },
  wingL: { seed: 83, lower: 1, feathers: [[[680, 312], [668, 328], 18], [[676, 306], [652, 330], 20], [[670, 302], [632, 327], 20], [[662, 298], [612, 320], 20], [[652, 294], [592, 312], 20],
      [[642, 290], [576, 300], 20], [[632, 286], [564, 288], 18], [[626, 282], [566, 276], 16]],
    coverts: [[[684, 296], [654, 304], 22], [[682, 288], [640, 294], 20], [[680, 282], [626, 284], 18], [[678, 278], [612, 278], 14]] },
  wingR: { seed: 84, lower: -1, feathers: [[[762, 312], [772, 326], 18], [[766, 306], [792, 328], 20], [[772, 302], [814, 327], 20], [[780, 298], [836, 322], 20], [[790, 294], [858, 316], 20],
      [[800, 290], [876, 306], 20], [[810, 286], [890, 296], 18], [[816, 282], [896, 286], 16]],
    coverts: [[[760, 296], [790, 304], 22], [[762, 288], [804, 294], 20], [[764, 282], [818, 284], 18], [[766, 278], [832, 278], 14]] },
  feet: [{ leg: [[700, 346], [696, 352], [694, 356]], w: 12, toes: [[[694, 356], [686, 358], [680, 359]], [[694, 357], [692, 360], [690, 362]], [[695, 357], [700, 359], [704, 360]]] },
    { leg: [[742, 346], [745, 352], [747, 356]], w: 12, toes: [[[747, 356], [740, 359], [736, 360]], [[748, 357], [750, 360], [752, 362]], [[748, 356], [755, 358], [761, 359]]] }],
};
function pressDraw(g) {
  const P = PRESS;
  zipFeet(g, P.feet);
  wing(g, { ...P.wingL, coverts: null, ink: 1.6 }); wing(g, { ...P.wingR, coverts: null, ink: 1.6 });
  body2(g, P.body);
  wing(g, { seed: 85, lower: 1, ink: 1.5, feathers: [], coverts: P.wingL.coverts });
  wing(g, { seed: 86, lower: -1, ink: 1.5, feathers: [], coverts: P.wingR.coverts });
  face(g, P.face);
}
export function pressLayer() {
  const base = layer("press", PRESS.box, pressDraw);
  return { canvas: base.c, x: base.x - PRESS.root[0], y: base.y - PRESS.root[1], w: base.c.width, h: base.c.height };
}

const LAYERS = new Map();
function layer(key, box, paint) {
  if (!LAYERS.has(key)) {
    const [x0, y0, x1, y1] = box, c = document.createElement("canvas"); c.width = x1 - x0; c.height = y1 - y0;
    const g = c.getContext("2d"); g.translate(-x0, -y0); g.lineJoin = "round"; g.lineCap = "round";
    paint(g);
    LAYERS.set(key, { c, x: x0, y: y0 });
  }
  return LAYERS.get(key);
}
export function owlPowerLayer() {
  return layer("power", [470, 330, 920, 600], (g) => { wing(g, PW_L); wing(g, PW_R); headBody(g, HB_P); });
}
export function owlReachLayer() {
  return layer("reach", [440, 360, 820, 600], (g) => { wing(g, RW_L); headBody(g, HB_R); fist(g, FIST_R); });
}
export function owlTwoLayer() {
  return layer("two", [540, 350, 840, 600], (g) => { wing(g, TW_L); wing(g, TW_R); headBody(g, HB_T); hand(g, HANDS.L); hand(g, HANDS.R); });
}
export function drawOwlE(g, name, dx = 0, dy = 0) {
  const L = name === "power" ? owlPowerLayer() : name === "reach" ? owlReachLayer() : name === "two" ? owlTwoLayer() : null;
  if (!L) return false;
  g.drawImage(L.c, L.x + dx, L.y + dy);
  return true;
}
export function releaseOwlE() { LAYERS.clear(); }
