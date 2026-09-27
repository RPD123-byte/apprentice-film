// s20 (build 3): the owl, drawn with the shared B&W owl kit (owlInk.js) from poses fitted to the source, plus
// s20's own headphones (the source's big dark over-ear cups) and standing feet, drawn through the kit's `extra`
// hook. Placements are in setup-A frame coordinates (the shot draws the owl under the camera, as the source's
// setup B is the same drawing re-framed); hold measurements made on B2 frames are converted with the inverse B2
// affine (toA). Timing per source frame (fr = t·25) from the per-frame silhouette track
// (snapshots/s20-b3-study/owltrack.txt) and frame strips.
import { owlLayer, owlPose, mergePose, drawWing, LINE, gv, bodyOutline, V } from "../../../lib/owlInk.js";
import { taper } from "../../../lib/ink.js";
import { sampleCurve } from "../../../lib/paths.js";
import { clamp, lerp } from "../../../lib/rng.js";
import { begin, cupGloss, bandArch, broadWing, shapeWing, plumageFill, fanTail, legFoot, bodyTicks, fluffEdge, profileBeak, featherWing, sideBand } from "./owlparts.js";

const TAU = Math.PI * 2;
const BO = (pose) => bodyOutline(pose.body);
export const toA = (x, y) => [(x + 7.95) / 0.991, (y - 1.1) / 0.9649];

// ------------------------------------------------------------------------------------------------ parts (owl units)
// standing leg + foot: thin leg, three forward toes fanned and a short back toe, pale with dark keylines, dark claws
function foot(g, { hip, ankle, dir = 0, size = 34, spread = 1.2, back = true }) {
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  const legQ = sampleCurve([hip, [(hip[0] + ankle[0]) / 2, (hip[1] + ankle[1]) / 2], ankle], 4);
  taper(g, legQ, () => size * 0.66, LINE);
  taper(g, legQ, () => size * 0.5, gv(0.87));
  // toes flat on the floor, seen from a little above: side toes fan out almost level, the middle one points at us
  // (foreshortened), a short back toe
  const toes = [[dir + Math.PI * 0.92, 0.36], [dir - spread, 0.95], [dir + spread, 0.95], [dir, 0.62]];
  toes.forEach(([a, len], i) => {
    if (i === 0 && !back) return;
    const L = size * len, d = [Math.sin(a), Math.cos(a)];
    const mid = [ankle[0] + d[0] * L * 0.55, ankle[1] + d[1] * L * 0.55 + size * 0.06];
    const tip = [ankle[0] + d[0] * L, ankle[1] + d[1] * L + size * 0.14];
    const q = sampleCurve([ankle, mid, tip], 5);
    taper(g, q, (u) => size * (0.46 - 0.12 * u), LINE);
    taper(g, q, (u) => size * (0.32 - 0.08 * u), gv(0.88));
    for (const f of [0.35, 0.65]) { const p = q[Math.floor((q.length - 1) * f)]; g.fillStyle = gv(0.35, 0.8); g.beginPath(); g.arc(p[0], p[1], size * 0.035, 0, TAU); g.fill(); }
    // claw: curving down and forward off the toe tip
    const cl = [tip[0] + d[0] * size * 0.22, tip[1] + d[1] * size * 0.1 + size * 0.2];
    taper(g, sampleCurve([tip, [tip[0] + d[0] * size * 0.2, tip[1] + d[1] * size * 0.12 + size * 0.04], cl], 4), (u) => size * 0.2 * (1 - u * 0.9), gv(0.1));
  });
  g.restore();
}
// the headband: a dark strip with a thin highlight and a ribbed slider near each end
function band(g, pts, w = 12) {
  const q = sampleCurve(pts, 8);
  taper(g, q, () => w * 1.15, LINE);
  taper(g, q, () => w * 0.72, gv(0.22));
  taper(g, q.map(([x, y]) => [x - w * 0.12, y - w * 0.12]), () => w * 0.16, gv(0.62, 0.9));
  for (const [a, b] of [[0.04, 0.2], [0.8, 0.96]]) {
    const sq = q.slice(Math.floor(q.length * a), Math.ceil(q.length * b));
    if (sq.length > 1) { taper(g, sq, () => w * 1.4, LINE); taper(g, sq, () => w * 1.05, gv(0.5)); }
  }
}
// a round over-ear cup seen from the side: dark shell rim, pleated cushion ring, grey brushed plate, logo slot
function cupRound(g, x, y, r, { rx = 1, rot = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(rx, 1);
  g.fillStyle = "#0b0b0b"; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.strokeStyle = gv(0.55); g.lineWidth = r * 0.05; g.beginPath(); g.arc(0, 0, r * 0.93, Math.PI * 0.95, Math.PI * 1.7); g.stroke();
  g.strokeStyle = gv(0.35); g.lineWidth = r * 0.035; g.beginPath(); g.arc(0, 0, r * 0.8, 0, TAU); g.stroke();
  const pl = g.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.05, 0, 0, r * 0.66);
  pl.addColorStop(0, gv(0.78)); pl.addColorStop(0.7, gv(0.55)); pl.addColorStop(1, gv(0.3));
  g.fillStyle = pl; g.beginPath(); g.arc(0, 0, r * 0.64, 0, TAU); g.fill();
  g.strokeStyle = LINE; g.lineWidth = r * 0.06; g.beginPath(); g.arc(0, 0, r * 0.64, 0, TAU); g.stroke();
  g.strokeStyle = gv(0.3, 0.6); g.lineWidth = r * 0.02;
  for (let k = 0; k < 9; k++) { const yy = -r * 0.5 + k * r * 0.12; g.beginPath(); g.moveTo(-r * 0.45, yy); g.lineTo(r * 0.3, yy + r * 0.05); g.stroke(); }
  g.fillStyle = LINE; g.fillRect(-r * 0.05, r * 0.05, r * 0.2, r * 0.07);
  g.restore();
}
// a cup seen edge-on (front views): a tall dark cushion + shell, ribbed highlights on the head side
function cupSide(g, x, y, rx, ry, side) {
  g.save(); g.translate(x, y);
  g.fillStyle = "#0b0b0b"; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
  g.strokeStyle = gv(0.6); g.lineWidth = rx * 0.1;
  for (let k = -7; k <= 7; k++) { const yy = k * ry * 0.12; const hw = Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2)) * rx; g.beginPath(); g.moveTo(-side * hw * 0.85, yy); g.lineTo(-side * hw * 0.2, yy + 1); g.stroke(); }
  g.strokeStyle = gv(0.45); g.lineWidth = rx * 0.12; g.beginPath(); g.ellipse(side * rx * 0.35, 0, rx * 0.5, ry * 0.9, 0, -Math.PI / 2, Math.PI / 2, side < 0); g.stroke();
  g.restore();
}

// ------------------------------------------------------------------------------------------------ poses
const BASE = owlPose("perch");
const NOHP = { on: false };
const bboxPts = (pts) => pts.map(([x, y]) => ({ x, y, size: 0.01, mode: "perch" }));

// front stand (63.84–64.24, fitted at 63.96): facing us beside the card, glossy eyes glancing right at it
const FRONT = mergePose(BASE, {
  head: { x: 29, y: -183, rx: 117, ry: 105, yaw: 0, roll: 0, square: 2.4, jowl: 0.25 },
  tufts: [{ at: 0.78, size: 26, width: 0.3, lean: -0.2, spikes: 2, fan: 0.4, curl: 0.2, seed: 4, valley: 0.55 }, { at: -0.8, size: 24, width: 0.28, lean: 0.2, spikes: 2, fan: 0.4, curl: 0.2, seed: 3, valley: 0.55 }],
  body: { x: 0, y: 6, a: 118, b: 146, rot: Math.PI / 2, egg: 0.16, sag: 0, edge: { step: 38, depth: 9, lean: 0.5, from: 0, to: 1, seed: 51, base: 0.6 } },
  eyes: { state: "glossy", r: 30, spread: 0.5, el: -0.02, look: [1, 0.05], over: { lookGain: 2.2, sx: 1 } },
  beak: { el: -0.37, lift: 1.1, w: 27, l: 29, style: "shield" },
  bandage: { az: -0.23, el: 0.85, size: 53, rot: -0.5 },
  sweat: { az: -0.86, el: -0.2, size: 10 },
  headphones: NOHP,
  wings: [
    { type: "folded", layer: "front", style: "scallop", S: [-80, -104], T: [-150, 72], width: 52, back: 36, dir: -1, rows: 3 },
    { type: "folded", layer: "front", style: "scallop", S: [127, -89], T: [140, 24], width: 16, back: 6, dir: 1, rows: 1 },
  ],
  tail: { base: [-127, 57], tip: [-193, 75], w: 20, n: 2 },
  feet: bboxPts([[-200, 190], [220, 190], [-200, -350], [220, -350]]),
});
// fix pass 1, re-measured on frame 1600 (64.00; root (1146, 672), s 0.75): cups edge-on (1041–1077, 483–576) /
// (1249–1295, 497–576), band (1063, 454) -> (1156, 405) -> (1266, 458), ankles (1104, 785) / (1172, 765)
const U4 = (X, Y) => [(X - 1146) / 0.75, (Y - 672) / 0.75];
const FRONT_X = (g, geo, pose) => {
  begin(geo);
  const H = geo.H;
  bodyTicks(g, pose.body, { head: H.out, side: [-0.55, 0.83], amount: 1, n: 180, shadeV: 0.7, shadeA: 0.5 });
  legFoot(g, { hip: U4(1106, 735), ankle: U4(1104, 785), toes: [[-24, 2], [2, 30], [30, 26]], back: [16, -14], size: 30, seed: 2, thigh: 0, behind: BO(pose) });
  legFoot(g, { hip: U4(1174, 728), ankle: U4(1172, 766), toes: [[-32, 10], [24, 16], [62, 2]], size: 30, seed: 5, thigh: 0, behind: BO(pose) });
  bandArch(g, pose.bandU || [U4(1063, 478), U4(1072, 440), U4(1110, 413), U4(1156, 405), U4(1205, 412), U4(1250, 440), U4(1266, 478)], { w: 15, behind: H.out });
  const cl = pose.cupL || [...U4(1057, 530), 0.26], cr = pose.cupR === undefined ? [...U4(1272, 537), 0.3] : pose.cupR;
  if (cl) cupGloss(g, { x: cl[0], y: cl[1], r: 62, face: cl[2], side: -1, yokeLen: 0.22, plate: 0.3 });
  if (cr) cupGloss(g, { x: cr[0], y: cr[1], r: 56, face: cr[2], side: 1, yokeLen: 0.22, plate: 0.3 });
};

// rear (63.36–63.60, fitted at 63.52): from behind, pushing the card with the raised right wing
const REAR = mergePose(BASE, {
  head: { x: 9, y: -187, rx: 107, ry: 92, yaw: Math.PI, roll: 0.03, square: 2.4, jowl: 0.45, edge: { step: 20, depth: 14, lean: 0.6, from: 0.72, to: 0.97, seed: 14, base: 0.6 } },
  tufts: [{ at: -1.1, size: 30, width: 0.3, lean: -0.3, spikes: 2, fan: 0.4, curl: 0.2, seed: 8, valley: 0.55 }],
  body: { x: -8, y: 0, a: 136, b: 140, rot: Math.PI / 2, egg: 0.1, sag: 0, edge: { step: 38, depth: 9, lean: 0.5, from: 0, to: 1, seed: 52, base: 0.6 } },
  eyes: { state: "glossy", r: 1, spread: 0.5, el: 0 },
  beak: { w: 0.01, l: 0.01, style: "shield" },
  disc: 0,
  bandage: { az: 3.27, el: 0.15, size: 50, rot: -0.8 },
  headphones: NOHP,
  wings: [],
  tail: null,
  feet: bboxPts([[-200, 190], [330, 190], [-200, -340], [330, -340]]),
});
// fix pass 1, re-measured on frame 1588 (63.52; root (1275, 670), s 0.75): near cup (1308–1381, 494–586), far cup
// edge-on (1173–1200, 501–571), band (1192, 486) (1215, 436) (1277, 421) (1338, 444) (1365, 490), tail fan
// (1131–1185, 682–728), feet (1162–1223, 767–778) / (1246–1300, 775–790), the raised wing pressed on the card to x 1490
const U5 = (X, Y) => [(X - 1275) / 0.75, (Y - 670) / 0.75];
const FE5 = (r, t, w, o = {}) => ({ root: U5(...r), tip: U5(...t), w: w / 0.75, ...o });
const REAR_WING = {
  // the raised wing laid up and right across the card (source 63.52: a broad feathered band from the shoulder at
  // (1330, 600) to the tip at (1492, 482), lower edge (1345, 668) -> (1460, 610))
  feathers: [FE5([1380, 630], [1420, 678], 26, { v: 0.92 }), FE5([1405, 612], [1452, 652], 26, { v: 0.92 }), FE5([1428, 592], [1474, 626], 24, { v: 0.92 }),
    FE5([1440, 570], [1497, 545], 28), FE5([1445, 545], [1506, 505], 30), FE5([1440, 520], [1500, 470], 30)],
  outline: [[1328, 562], [1380, 532], [1430, 506], [1470, 490], [1490, 486], [1482, 520], [1452, 560], [1420, 598], [1382, 638], [1348, 666], [1326, 640]].map(([x, y]) => U5(x, y)),
  lines: [[[1350, 600], [1395, 572], [1440, 545]].map(([x, y]) => U5(x, y)), [[1360, 630], [1405, 600], [1445, 575]].map(([x, y]) => U5(x, y))], heavy: [0, 4], shadow: 0.2,
};
const REAR_X = (g, geo, pose) => {
  begin(geo);
  const H = geo.H;
  fanTail(g, { base: U5(1185, 700), dir: [-0.9, 0.42], n: 6, len: 78, spread: 0.9, w: 26, behind: BO(pose) });
  bodyTicks(g, pose.body, { head: null, side: [-0.8, 0.6], amount: 1, n: 220, shadeV: 0.66, shadeA: 0.6 });
  legFoot(g, { hip: U5(1195, 735), ankle: U5(1192, 772), toes: [[-36, 6], [-14, 10], [30, 6]], size: 30, seed: 2, thigh: 0, behind: BO(pose) });
  legFoot(g, { hip: U5(1270, 740), ankle: U5(1269, 778), toes: [[-30, 12], [4, 16], [40, 8]], size: 30, seed: 5, thigh: 0, behind: BO(pose) });
  // fix pass 2: the raised wing is the one opaque feathered wing (featherWing) pressed on the card, feather tips along
  // the card edge (1400–1470, 470–590), shoulder (1335, 640) (source 63.52)
  if (!pose.noWing) {
    if (pose.rearWing) shapeWing(g, pose.rearWing);
    else featherWing(g, { S: U5(1328, 650), W: U5(1380, 590), T: U5(1450, 478), w: 66, trail: 1, n: 7, fan: 0.55, shrink: 0.3, pw: 0.66, seed: 27, hand: 0.3, shadow: 0.2 });
  }
  if (pose.whirlRear) {
    // the folded far wing down the flank (a teardrop of coverts with the primaries to the tail) and a second tail fan
    featherWing(g, { S: [-95, -95], W: [-120, 10], T: [-70, 150], w: 46, trail: 1, n: 5, fan: 0.35, shrink: 0.3, pw: 0.7, seed: 17, hand: 0.4, shadow: 0.15 });
    fanTail(g, { base: [60, 120], dir: [0.92, 0.3], n: 5, len: 110, spread: 0.6, w: 24, behind: BO(pose), seed: 21 });
  }
  bandArch(g, pose.bandU || [U5(1190, 500), U5(1200, 460), U5(1225, 432), U5(1277, 419), U5(1335, 440), U5(1360, 470), U5(1368, 500)], { w: 16, behind: H.out });
  if (pose.cupFar !== null) cupGloss(g, { x: U5(1187, 536)[0], y: U5(1187, 536)[1], r: 50, face: 0.16, side: -1, yokeLen: 0.2, plate: 0.3 });
  const cn = pose.cupNear || [...U5(1345, 540), 0.72];
  cupGloss(g, { x: cn[0], y: cn[1], r: 62, face: cn[2], side: 1, yokeLen: 0.25, plate: 0.34 });
};

// flap (64.44–65.52, fitted at 64.80): profile facing left, leaning in (rot -0.15), eyes shut in effort, beating
// the scissors with its near wing; wing tip y per frame (frame px, measured on strips: up 553 / mid ~610 / low ~670; a
// 4-frame cycle from 64.68). Fix pass 1: root x 1040 -> 990 and the lean, re-measured on frame 1620 (setup A frame px):
// cup centre (973, 544) r 47 px, band hook (925–970, 408–474), crest (1012–1094, 452–549), shut eye (860–881, 564),
// beak tip (838, 584), body right edge 1112, bottom 780, feet (940–1110, 790–826). The primaries are pointed.
const FLAP_ROT = -0.15;
const U3 = (X, Y, root = [990, 680]) => { const dx = (X - root[0]) / 0.75, dy = (Y - root[1]) / 0.75, c = Math.cos(-FLAP_ROT), s = Math.sin(-FLAP_ROT); return [dx * c - dy * s, dx * s + dy * c]; };
const U3v = (v) => { const c = Math.cos(-FLAP_ROT), s = Math.sin(-FLAP_ROT), dx = v[0] / 0.75, dy = v[1] / 0.75; return [dx * c - dy * s, dx * s + dy * c]; };
const FLAP = (tipY, tipX = 755, eyes = null, root = [990, 680], rot = FLAP_ROT) => {
  const d = [(tipX - root[0]) / 0.75, (tipY - root[1]) / 0.75], c = Math.cos(-rot), sn = Math.sin(-rot);
  const T = [d[0] * c - d[1] * sn, d[0] * sn + d[1] * c];
  // fix pass 2: the near wing as one feathered wing (featherWing), measured on 1.4x crops of 1615–1623: shoulder
  // (root + (-40, -50)) under the cheek, wrist half way, the outermost primary ending on the tip (x ~752; y cycles
  // 536 / 589 / 664), the feathers hanging down toward the trailing edge (y ~690–740 under the wing)
  const toU = (X, Y) => { const dx = (X - root[0]) / 0.75, dy = (Y - root[1]) / 0.75; return [dx * c - dy * sn, dx * sn + dy * c]; };
  const Sf = [root[0] - 75, root[1] - 68], Tf = [tipX, tipY], Wf = [lerp(Sf[0], Tf[0], 0.45), lerp(Sf[1], Tf[1], 0.45) - 12];
  const S = toU(...Sf), Wr = toU(...Wf);
  return mergePose(BASE, {
    grain: 3,
    head: { x: -63, y: -200, rx: 116, ry: 106, yaw: -1.15, roll: -0.05, square: 2.3, jowl: 0.2 },
    tufts: [],
    body: { x: 4, y: -34, a: 140, b: 136, rot: Math.PI / 2, egg: -0.04, sag: 0, edge: { step: 38, depth: 9, lean: 0.5, from: 0, to: 1, seed: 53, base: 0.6 } },
    eyes: eyes || { state: "shut", r: 28, spread: 0.5, el: -0.05, left: { off: [36, 0] }, right: { off: [36, 0] } },
    beak: { el: -0.37, lift: 1.0, w: 0.01, l: 0.01, style: "shield" },
    disc: 0,
    bandage: { az: 1.15, el: 0.49, size: 46, rot: -0.9 },
    headphones: NOHP,
    wings: [],
    // the near wing is drawn over the face by FLAP_X (the kit paints the head over its front wings)
    flapWing: { S, W: Wr, T, w: 78, trail: T[0] < S[0] ? -1 : 1, n: 9, fan: 0.75, shrink: 0.42, pw: 0.66, seed: 61, hand: 0.3, from: 0 },
    tail: null,
    feet: bboxPts([[-60, 230], [220, 230], [-80, -380], [180, -380], [T[0] - 160, T[1] - 60], [T[0] - 160, T[1] + 170]]),
  });
};
const FLAP_X = (g, geo, pose) => {
  begin(geo);
  const H = geo.H;
  fanTail(g, { base: U3(1085, 715), dir: U3v([1, 0.25]), n: 5, len: 95, spread: 0.5, w: 24, behind: bodyOutline(pose.body) });
  bodyTicks(g, pose.body, { head: H.out, side: [-0.2, 0.98], amount: 1, n: 190, shadeV: 0.68, shadeA: 0.55 });
  // fix pass 2: the crest as three short soft tufts (<= 35 px) instead of long thorns
  shapeWing(g, { feathers: [FE3([1000, 480], [1032, 468], 22, { lw: 0.9, rachis: false, point: 0.45, v: 0.93 }), FE3([1004, 500], [1038, 498], 22, { lw: 0.9, rachis: false, point: 0.45, v: 0.93 }), FE3([1002, 520], [1032, 530], 20, { lw: 0.9, rachis: false, point: 0.45, v: 0.9 })], shadow: 0 });
  legFoot(g, { hip: U3(978, 758), ankle: U3(972, 795), toes: [U3v([-30, 2]), U3v([-18, 12]), U3v([30, 10])], size: 36, seed: 2, thigh: 0, behind: BO(pose) });
  legFoot(g, { hip: U3(1082, 768), ankle: U3(1080, 808), toes: [U3v([-36, 12]), U3v([-6, 18]), U3v([30, 8])], size: 36, seed: 5, thigh: 0, behind: BO(pose) });
  profileBeak(g, { top: U3(866, 566), bot: U3(864, 592), tip: U3(837, 585) });
  if (pose && pose.flapWing) featherWing(g, pose.flapWing);
  const cp = U3(973, 544);
  sideBand(g, { cup: [cp[0] - 4, cp[1] - 56], up: 100, back: 62, dir: 1, w: 21, behind: H.out, front: 0.45 });
  cupGloss(g, { x: cp[0], y: cp[1], r: 62, face: 0.92, side: 1, yoke: false, plate: 0.52 });
};
const FE3 = (r, t, w, o = {}) => ({ root: U3(...r), tip: U3(...t), w: w / 0.75, ...o });

// stare (65.64–67.16): profile facing left, glossy eye wide, staring at the clean scissors. Fix pass 1: re-measured
// on source frame 1650 (66.00, setup A frame px; root (1145, 690), s 0.77; units U2): beak tip (1003, 548), eye
// (1068, 530), head 1030–1225 x 450–600, crest spikes (1215–1275, 465–545), cup centre (1148, 540) r 48 px, band a
// thick hook over the crown (1127–1172, 398–460), body 1025–1255, bottom 785, folded wing shoulder (1150, 612) -> tip
// (1332, 785), tail (1250–1335, 720–790), ankles (1115, 800) / (1172, 803)
const U2 = (X, Y) => [(X - 1145) / 0.77, (Y - 690) / 0.77];
const STARE = mergePose(BASE, {
  grain: 3,
  head: { x: -22, y: -208, rx: 128, ry: 102, yaw: -1.15, roll: 0, square: 2.3, jowl: 0.2 },
  tufts: [],
  body: { x: -8, y: -18, a: 144, b: 146, rot: Math.PI / 2, egg: -0.06, sag: 0, edge: { step: 38, depth: 9, lean: 0.5, from: 0, to: 1, seed: 54, base: 0.6 } },
  eyes: { state: "glossy", r: 30, spread: 0.5, el: 0.0, look: [-1, 0], over: { lookGain: 2, sx: 1 }, left: { off: [44, 0] }, right: { off: [44, 0] } },
  beak: { el: -0.24, lift: 1.0, w: 0.01, l: 0.01, style: "shield" },
  bandage: { az: 0.72, el: 0.9, size: 50, rot: -0.9 },
  headphones: NOHP,
  disc: 0,
  wings: [{ type: "folded", layer: "front", style: "scallop", S: U2(1140, 615), T: U2(1334, 786), width: 42, back: 26, dir: 1, rows: 3 }],
  tail: null,
  feet: bboxPts([[-160, 210], [260, 210], [-200, -400], [200, -400]]),
});
const STARE_X = (g, geo, pose) => {
  begin(geo);
  const H = geo.H;
  fanTail(g, { base: U2(1245, 728), dir: [0.85, 0.52], n: 5, len: 100, spread: 0.45, w: 24, behind: bodyOutline(pose.body) });
  bodyTicks(g, pose.body, { head: H.out, side: [-0.35, 0.94], amount: 1, n: 200, shadeV: 0.68, shadeA: 0.6 });
  // crest: spiky feathers off the back of the head
  // fix pass 2: three short soft tufts (source 66.02: soft crest at (1200–1260, 470–540)), <= 35 px
  shapeWing(g, { feathers: [FE2([1200, 494], [1234, 478], 24, { lw: 0.9, rachis: false, point: 0.45, v: 0.93 }), FE2([1204, 514], [1240, 510], 24, { lw: 0.9, rachis: false, point: 0.45, v: 0.93 }), FE2([1200, 534], [1232, 544], 22, { lw: 0.9, rachis: false, point: 0.45, v: 0.9 })], shadow: 0 });
  profileBeak(g, { top: U2(1036, 530), bot: U2(1034, 566), tip: U2(1002, 556) });
  legFoot(g, { hip: U2(1122, 765), ankle: U2(1115, 800), toes: [[-71, -4], [-64, 12], [-36, 16]], back: [42, 4], size: 34, seed: 2, thigh: 0, behind: BO(pose) });
  legFoot(g, { hip: U2(1178, 768), ankle: U2(1172, 803), toes: [[-61, 29], [-42, 40], [43, 9]], size: 34, seed: 5, thigh: 0, behind: BO(pose) });
  // fix pass 2: the band is one strip rising ~80 px from the cup's top rim, bending back ~60 px over the crown and
  // ending behind the head (source 66.02: rising at (1150–1185, 400–480)); no yoke stub
  const cp = pose.cupAt || U2(1148, 540);
  sideBand(g, { cup: [cp[0] - 28, cp[1] - 52], up: 82, back: 48, dir: 1, w: 21, behind: H.out, front: 0.45 });
  cupGloss(g, { x: cp[0], y: cp[1], r: 62, face: 0.92, side: 1, yoke: false, plate: 0.52 });
};
const FE2 = (r, t, w, o = {}) => ({ root: U2(...r), tip: U2(...t), w: w / 0.77, ...o });

// hold (67.80–69.40, fitted on the B2 median): facing us, scowling grin, the scissors raised in its right wing
// (viewer's left), left wing on its hip. Units at s 0.85 (frame px).
// measured on the B2 median (frame px, converted to A units at root toA(1090, 640), s 0.869): head centre
// (1105, 455), half width 105, eyes (1015, 492) / (1105, 485), beak top (1047, 505), right cup (1205, 445) r 45,
// body centre (1075, 640) half width 115, bottom 760, ankles (1010, 760) / (1115, 765), hip wing shoulder (1160, 560)
// -> elbow (1230, 640) -> hand (1170, 700), raised wing shoulder (975, 560) -> elbow (930, 590) -> hand (890, 490)
// fix pass 1: re-measured on source frame 1705 (68.20, B2 frame px; units = ((X - 1090) / 0.861, (Y - 640) / 0.8385)):
// tufts (981, 402) / (1175, 396), head top 410, eyes (1025, 489) / (1100, 483), beak (1053, 521), bandage (1028, 430),
// right cup (1153–1230, 423–517), left cup edge-on (953–984, 436–536), band (975, 433) (1000, 367) (1094, 333)
// (1175, 361) (1200, 405); body 988–1235, bottom 742; ankles (1073, 778) / (1167, 780); raised wing shoulder (994, 567)
// -> hand (912, 492) wrapping the shank, secondaries hanging to (956–1000, 549–630); hip wing shoulder (1200, 555)
// -> elbow (1256, 599) -> hand on the hip (1175, 642), primaries fanning to (1275, 705); tail (1200–1262, 692–730)
const U = (X, Y) => [(X - 1090) / 0.861, (Y - 640) / 0.8385];
const HOLD = mergePose(BASE, {
  grain: 3,
  head: { x: -12, y: -190, rx: 116, ry: 94, yaw: -0.2, roll: 0.02, square: 2.6, jowl: 0.3 },
  tufts: [{ at: -0.78, size: 58, width: 0.34, lean: 0.1, spikes: 3, fan: 0.5, curl: 0.15, seed: 3, valley: 0.55 }, { at: 0.8, size: 56, width: 0.34, lean: -0.15, spikes: 3, fan: 0.5, curl: 0.2, seed: 4, valley: 0.55 }],
  body: { x: 24, y: -10, a: 118, b: 140, rot: Math.PI / 2, egg: -0.1, sag: 0, edge: { step: 38, depth: 9, lean: 0.5, from: 0, to: 1, seed: 55, base: 0.6 } },
  // fix pass 2: eyes 20 px lower (source 1705: (1025, 489) / (1100, 483)), heavy-lidded squints (upper lid over the top
  // ~40%, thinner brows), the viewer-left eye narrower; bigger bandage (~50 x 45 px)
  eyes: { state: "sly", r: 31, spread: 0.39, el: 0.16, look: [0.5, 0], over: { sx: 1.2, iris: 0.52, top: 0.55, bot: 0.34, tilt: 0.25, brow: 0.55, browSlant: 0.7, lookX: 0.35 }, left: { off: [0, 24], sx: 1.05, top: 0.6 }, right: { off: [0, 22] } },
  beak: { el: -0.3, lift: 1.08, w: 33, l: 36, style: "grin", smirk: 1 },
  bandage: { az: -0.36, el: 0.74, size: 78, rot: -0.75 },
  headphones: NOHP,
  wings: [],
  tail: null,
  feet: bboxPts([[-240, 230], [220, 230], [-240, -380], [220, -380]]),
});
// hold wings, measured on 3x crops of frame 1705 (frame px -> U): the raised wing's hand is a mitten of three broad
// feathers gripping the shank, its secondaries hang below the forearm; the hip wing bulges out to the elbow and its
// primaries fan out to the right of the hand
const UL = (pts) => pts.map(([x, y]) => U(x, y));
const FE = (r, t, w, o = {}) => ({ root: U(...r), tip: U(...t), w: w / 0.85, ...o });
const HOLD_WING_R = {
  feathers: [FE([955, 580], [962, 652], 24, { v: 0.9, barbs: [0.3, 0.55] }), FE([972, 582], [982, 650], 24, { v: 0.9, barbs: [0.35, 0.6] }), FE([990, 580], [998, 640], 22, { v: 0.9 }),
    FE([905, 565], [952, 560], 24, { front: 1 }), FE([895, 552], [950, 536], 30, { front: 1 }), FE([884, 548], [902, 476], 38, { point: 0.6, front: 1 })],
  outline: UL([[1002, 552], [975, 546], [945, 548], [918, 552], [900, 560], [898, 575], [915, 582], [950, 586], [985, 590], [1004, 585]]),
  lines: [UL([[925, 570], [955, 566], [985, 572]])], heavy: [0, 5],
};
const HOLD_WING_L = {
  feathers: [FE([1195, 672], [1258, 712], 22, { v: 0.9 }), FE([1190, 668], [1236, 718], 20, { v: 0.88 }),
    FE([1212, 655], [1265, 668], 22), FE([1210, 645], [1277, 660], 24), FE([1215, 638], [1273, 640], 22)],
  outline: UL([[1172, 545], [1215, 540], [1242, 558], [1258, 583], [1265, 605], [1260, 625], [1246, 640], [1245, 662], [1212, 675], [1178, 675], [1160, 660], [1158, 642], [1175, 624], [1176, 612], [1162, 598], [1152, 583], [1156, 560]]),
  lines: [UL([[1162, 597], [1180, 606], [1195, 618]]), UL([[1200, 575], [1225, 590], [1240, 612]]), UL([[1185, 655], [1215, 652], [1240, 645]])],
  heavy: [1, 7], shadeAt: [...U(1200, 665), 40, 16],
};
const HOLD_X = (g, geo, pose) => {
  begin(geo);
  const H = geo.H;
  fanTail(g, { base: U(1195, 690), dir: [0.85, 0.5], n: 6, len: 88, spread: 0.8, w: 26, behind: bodyOutline(pose.body) });
  // chest: fills the notch between the cheek and the body's shoulder
  plumageFill(g, UL([[978, 526], [1022, 530], [1038, 546], [1078, 546], [1094, 530], [1172, 526], [1176, 620], [1100, 650], [992, 650], [978, 590]]));
  bodyTicks(g, pose.body, { head: H.out, side: [-0.5, 0.86], amount: 1, n: 380, shadeV: 0.66, shadeA: 0.7 });
  // fix pass 2: legs ~25 px thick and feathered, fuller scaly toes with ~10 px curved talons
  legFoot(g, { hip: U(1085, 725), ankle: U(1073, 778), toes: [[-58, 5], [-38, 27], [-6, 30]], back: [30, -2], size: 34, seed: 2, thigh: 0, behind: BO(pose), tars: 0.78, toeW: 0.3, talon: 0.9 });
  legFoot(g, { hip: U(1160, 730), ankle: U(1167, 780), toes: [[-20, 34], [12, 36], [52, 27]], back: [-32, 10], size: 34, seed: 5, thigh: 0, behind: BO(pose), tars: 0.78, toeW: 0.3, talon: 0.9 });
  // fix pass 2: both wings are the one feathered wing drawing (featherWing), placed on 1.5x crops of frame 1705:
  // the hip wing's elbow at (1250, 565) with its primaries fanned down-left to (1135–1200, 650–705); the raised wing
  // rising from the shoulder (985, 615) to the hand on the shank, its feather fingers over the grip (870–930, 470–530)
  if (pose.hipWing !== null) featherWing(g, pose.hipWing || { S: U(1188, 548), W: U(1252, 572), T: U(1150, 700), w: 52, trail: 1, n: 7, fan: 0.75, shrink: 0.4, pw: 0.62, seed: 31, hand: 0.25, shadow: 0.3 });
  if (pose.grabWing) featherWing(g, pose.grabWing);
  if (!pose.noRaised) {
    if (pose.raised) shapeWing(g, pose.raised);
    else {
      // the forearm rising from the shoulder to the grip, its feathers hanging down-left (source (900–990, 560–650))
      featherWing(g, { S: U(1000, 612), W: U(958, 548), T: U(900, 625), w: 50, trail: -1, n: 6, fan: 0.55, shrink: 0.35, pw: 0.66, seed: 33, hand: 0.25, shadow: 0.25, under: 0.7 });
      // the hand: a fluffy mitten round the shank (870–950, 470–565) with three feather fingers wrapping over it
      shapeWing(g, { outline: UL([[902, 468], [930, 474], [950, 496], [952, 528], [940, 556], [916, 568], [890, 562], [872, 542], [866, 512], [878, 486]]),
        feathers: [FE([936, 505], [874, 530], 24, { point: 0.55, front: 1, v: 0.95 }), FE([940, 522], [880, 552], 24, { point: 0.55, front: 1, v: 0.93 }), FE([940, 538], [892, 568], 22, { point: 0.55, front: 1, v: 0.9 })],
        lines: [UL([[900, 480], [925, 490], [944, 510]])], heavy: [6, 10], shadow: 0.2 });
    }
  }
  // headphones: band over the crown, edge-on left cup, 3/4 right cup
  bandArch(g, [U(972, 440), U(990, 380), U(1040, 342), U(1094, 333), U(1150, 345), U(1185, 375), U(1198, 420)], { w: 14, behind: H.out });
  cupGloss(g, { x: U(968, 486)[0], y: U(968, 486)[1], r: 60, face: 0.02, side: -1, yokeLen: 0.25 });
  cupGloss(g, { x: U(1192, 470)[0], y: U(1192, 470)[1], r: 56, face: 0.72, side: 1, yokeLen: 0.28, plate: 0.3 });
};

// ------------------------------------------------------------------------------------------------ grab + whirl (fix pass 1)
// B2 frame px -> units of a pose placed at B2 root rootB (scale sA in A units, rotation rot, optional flip)
const mkU = (rootB, sA, rot = 0, flip = false) => { const ra = toA(...rootB), c = Math.cos(-rot), sn = Math.sin(-rot); return (X, Y) => { const a = toA(X, Y), dx = (a[0] - ra[0]) / sA * (flip ? -1 : 1), dy = (a[1] - ra[1]) / sA; return [dx * c - dy * sn, dx * sn + dy * c]; }; };
// an outstretched wing from shoulder S to hand H (units): a soft arm, three fingers wrapping forward past the hand,
// three secondaries hanging below it
function armWing(S, H, { w = 30, fl = 70, down = [0, 1] } = {}) {
  const d = V.nrm([H[0] - S[0], H[1] - S[1]]), n = [-d[1], d[0]], L = Math.hypot(H[0] - S[0], H[1] - S[1]);
  const dn = (n[0] * down[0] + n[1] * down[1]) >= 0 ? n : [-n[0], -n[1]];          // the side the feathers hang
  const P = (u, k) => [S[0] + d[0] * L * u + dn[0] * k, S[1] + d[1] * L * u + dn[1] * k];
  const outline = [P(0, -w), P(0.35, -w * 0.9), P(0.7, -w * 0.78), P(1, -w * 0.7), P(1.08, 0), P(1, w * 0.7), P(0.7, w * 0.85), P(0.35, w * 1.0), P(0, w * 1.05)];
  const feathers = [];
  for (let k = 0; k < 3; k++) { const r = P(0.35 + k * 0.22, w * 0.5); feathers.push({ root: r, tip: [r[0] + dn[0] * w * 2.2 - d[0] * w * 0.4, r[1] + dn[1] * w * 2.2 - d[1] * w * 0.4], w: w * 0.75, v: 0.9 }); }
  for (let k = 0; k < 3; k++) { const r = P(0.9, (k - 1) * w * 0.55); feathers.push({ root: r, tip: [r[0] + d[0] * fl + dn[0] * (k - 1) * 12, r[1] + d[1] * fl + dn[1] * (k - 1) * 12], w: w * 0.8, front: 1 }); }
  return { outline, feathers, lines: [[P(0.15, 0), P(0.5, w * 0.1), P(0.85, 0)]], heavy: [0, 4] };
}
const HOLD_SA = 0.85 / 0.978;
// lunge 67.20–67.24 (1680–1681): the flap drawing leaning in, glossy eye on the scissors: [root x (B2), wing tip, eyes, lean]
const GRAB_EYES = { state: "glossy", r: 29, spread: 0.5, el: -0.05, look: [-1, 0], over: { lookGain: 2 }, left: { off: [36, 0] }, right: { off: [36, 0] } };
// fix pass 2: leaning forward (0.16–0.2 rad; less than the review's 0.45, which lowered the head below the source's),
// motion-blurred 2 px (source 1680–1681)
const GRAB = new Map([[1680, [1080, 768, 560, GRAB_EYES, -0.16, 686]], [1681, [1045, 713, 575, GRAB_EYES, -0.2, 686]]]);
// 67.28–67.36 (1682–1684, measured on 1.4x crops): crouched and leaning left, scowling, the right wing stretched out to
// the shank at the lean (1682), then pulled in and up (1683), the scissors lifted upright (1684): [root (B2), rot, hand (B2)]
// fix pass 2: a crouch leaning left (rot -0.3, head at ~(910, 480), body ~(840–1095, 500–775)), the wing a broad
// feathered wing wrapped round the shank; 1684 eyes squeezed shut and blurred 2.5 px
const GRAB2 = new Map([[1682, [[928, 645], -0.3, [735, 545]]], [1683, [[926, 645], -0.3, [752, 540]]], [1684, [[985, 640], -0.1, [770, 505]]]]);
function grabPose(fr) {
  const [root, rot, hand] = GRAB2.get(fr), u = mkU(root, HOLD_SA, rot);
  const H = u(...hand), S = U(994, 590), W = [lerp(S[0], H[0], 0.5), lerp(S[1], H[1], 0.5) - 25];
  return mergePose(HOLD, { eyes: fr === 1684 ? { state: "shut" } : { state: "scowl", over: { lookX: -0.45 } }, noRaised: true,
    grabWing: { S, W, T: [H[0] - 40, H[1] + 18], w: 88, trail: -1, n: 8, fan: 0.75, shrink: 0.35, pw: 0.62, seed: 41, hand: 0.3, shadow: 0.25 } });
}
// the whirl (1685–1694), orientation per frame as drawn in the source (1.25x crops): side view facing right with a
// scowl (1685–1687), rear views (1688–1691; the near cup at (1141, 444) / straight rear with both cups / 3/4 rear with
// the cup at (1119, 450)), side view facing left (1692), front (1693–1694). The wing and scissors are drawn by the shot
// as swept fans / smeared scissors; the owl stays sharp (blur <= 2 px). [kind, root (B2), scale (B2 px per unit), blur]
const SIDE_W = mergePose(STARE, { eyes: { state: "scowl", r: 30, spread: 0.5, el: 0.02, over: { lookX: -0.4 } } });
// fix pass 2: the blur and the fans are drawn by whirl.js; 1687 moved +30 px and leaning 0.1 rad into the card, 1691
// +15 / -12 px (bright-mass centroids vs the source), 1692's eye and cup pulled apart so the scowl shows; [.., rot]
const WHIRL = new Map([
  [1685, ["sideR", [1005, 610], 0.92, 0]], [1686, ["sideR", [1060, 606], 0.9, 0, 0.04]], [1687, ["sideR", [1110, 620], 0.88, 0, 0.1]],
  [1688, ["rearL", [1158, 626], 0.9, 0]], [1689, ["rearL", [1160, 626], 0.9, 0]], [1690, ["rear", [1152, 606], 0.9, 0]],
  [1691, ["rear3", [1138, 614], 0.9, 0]], [1692, ["sideL", [1156, 631], 0.87, 0]], [1693, ["hold", null, 0, 0]], [1694, ["hold", null, 0, 0]],
]);
const SIDE_L = mergePose(SIDE_W, { eyes: { left: { off: [20, -6] }, right: { off: [20, -6] } }, cupAt: U2(1172, 538) });
// rear views in the whirl: feathered head edge, a folded wing down the far flank and a fan tail (source 1688–1691)
const REAR_W = mergePose(REAR, { noWing: true, whirlRear: true, head: { edge: { step: 22, depth: 14, lean: 0.6, from: 0.3, to: 0.62, seed: 12, base: 0.6 } } });
function whirlPose(fr) {
  const [k, root, sB, blur, rot = 0] = WHIRL.get(fr);
  if (k === "hold") return [HOLD, HOLD_P, HOLD_X, blur];
  const [ax, ay] = toA(...root), sA = sB / 0.978;
  if (k === "sideR") return [SIDE_W, { x: ax, y: ay, s: sA, flip: true, rot }, STARE_X, blur];
  if (k === "sideL") return [SIDE_L, { x: ax, y: ay, s: sA }, STARE_X, blur];
  if (k === "rear") return [REAR_W, { x: ax, y: ay, s: sA }, REAR_X, blur];
  // flipped rear views: the near cup inside the head outline, the band from it over the crown, the far cup hidden
  const u = mkU(root, sA, 0, true), cup = k === "rearL" ? [1141, 444, 0.85] : [1119, 450, 0.95];
  const c = u(cup[0], cup[1]);
  return [mergePose(REAR_W, { cupFar: null, cupNear: [c[0], c[1], cup[2]], bandU: [[c[0], c[1] - 55], [c[0] - 10, c[1] - 105], [c[0] - 70, c[1] - 140], [c[0] - 140, c[1] - 120], [c[0] - 175, c[1] - 70]] }), { x: ax, y: ay, s: sA, flip: true }, REAR_X, blur];
}

// ------------------------------------------------------------------------------------------------ timeline
// flap wing tip y (frame px) for 64.44–64.64, then a 4-frame cycle up / mid / low / mid from 64.68
const FLAP_EARLY = new Map([[1611, 553], [1612, 553], [1613, 633], [1614, 620], [1615, 673], [1616, 607]]);
const CYCLE = [553, 610, 668, 612];
function flapTip(fr) { return FLAP_EARLY.get(fr) ?? CYCLE[((fr - 1617) % 4 + 4) % 4]; }

const HOLD_P = (() => { const [x, y] = toA(1090, 640); return { x, y, s: 0.85 / 0.978 }; })();
// one entry per drawing: [key, pose, placement, extra]
// frame -> root x (frame px) for the moves, from the silhouette-centroid track (render centroid offsets removed)
// rear-view head offset per frame (template match of the 63.52 head on each source frame; cc 0.84–1.0)
const REAR_DX = new Map([[1578, [-58, 0]], [1579, [-49, -1]], [1580, [-38, -1]], [1581, [-28, -1]], [1582, [-19, -3]], [1583, [-11, -4]], [1584, [-5, -2]], [1585, [-1, 0]]]);
// turn (fix pass 1, per source frame): rear / rear 3/4 with the wing still on the card, side view facing right,
// 3/4 front facing right (1594–1595), front from 1596
const TURN = new Map([[1591, ["rear", 1265]], [1592, ["rear3q", 1245]], [1593, ["sideR", 1218]], [1594, ["front3q", 1160]], [1595, ["front3q2", 1155]], [1596, ["front", 1151]], [1597, ["front", 1148]]]);
// run: looks left (1607), wings out, eyes open and set (1608), a hop with the wing up and back (1609, +12 px, blurred),
// the first beat (1610)
const PREP = new Map([[1607, ["frontL", 1140]], [1608, ["spread", 1110]], [1609, ["hop", 1080]], [1610, ["flap", 1040]]]);
// back-off: 1639 still beating, 1640 stepping back (wing lowered, blurred), then the stare pose sliding in to rest
// (cup x per frame 1082 / 1122 / 1140 / 1148 -> root x)
const BACK = new Map([[1641, 1079], [1642, 1119], [1643, 1137], [1644, 1145]]);
const REAR3Q = mergePose(REAR, { head: { yaw: Math.PI - 0.7 }, bandage: { az: 3.27 + 0.7 } });
const SIDER = mergePose(STARE, { eyes: { state: "shut" }, flip: true });
const FRONTL = mergePose(FRONT, { eyes: { look: [-1, 0.05] } });
const U4c = (X, Y) => [(X - 1146) / 0.75, (Y - 672) / 0.75];
const FRONT3Q = mergePose(FRONT, { head: { yaw: 0.38 }, eyes: { look: [1, 0.05] }, bandage: { az: -0.23 + 0.38 }, cupL: [...U4c(1136, 540), 0.62], cupR: null, bandU: [U4c(1140, 480), U4c(1150, 440), U4c(1190, 410), U4c(1240, 408), U4c(1280, 430)] });
const FRONT3Q2 = mergePose(FRONT, { head: { yaw: 0.2 }, eyes: { look: [1, 0.05] }, bandage: { az: -0.23 + 0.2 }, cupL: [...U4c(1100, 537), 0.45], cupR: [...U4c(1275, 537), 0.15] });
const SPREAD = mergePose(FRONT, { eyes: { state: "glossy", look: [-0.6, 0.1], over: { lookGain: 2 } }, wings: [
  { type: "spread", style: "layered", layer: "back", S: [-90, -80], Wr: [-190, -60], T: [-290, -10], trail: [0.3, 1], len: 80, spread: 0.8, n: 7, m: 5, seed: 71 },
  { type: "spread", style: "layered", layer: "back", S: [110, -80], Wr: [200, -60], T: [290, -10], trail: [-0.3, 1], len: 80, spread: 0.8, n: 7, m: 5, seed: 73 }] });
function beat(fr) {
  if (fr <= 1590) { const [dx, dy] = REAR_DX.get(fr) || [0, 0]; return ["rear" + Math.min(fr, 1586), REAR, { x: 1275 + dx, y: 670 + dy, s: 0.75 }, REAR_X]; }
  if (TURN.has(fr)) {
    const [k, x] = TURN.get(fr);
    if (k === "rear") return ["rear1591", REAR, { x, y: 667, s: 0.75 }, REAR_X];
    if (k === "rear3q") return ["rear3q", REAR3Q, { x, y: 670, s: 0.75 }, REAR_X];
    if (k === "sideR") return ["sideR", SIDER, { x, y: 690, s: 0.72, flip: true }, STARE_X];
    if (k === "front3q") return ["front3q", FRONT3Q, { x, y: 672, s: 0.75 }, FRONT_X];
    if (k === "front3q2") return ["front3q2", FRONT3Q2, { x, y: 672, s: 0.75 }, FRONT_X];
    return ["front" + fr, FRONT, { x, y: 672, s: 0.75 }, FRONT_X];
  }
  if (fr <= 1606) return ["front", FRONT, { x: 1146, y: 672, s: 0.75 }, FRONT_X];
  if (PREP.has(fr)) {
    const [k, x] = PREP.get(fr);
    if (k === "frontL") return ["frontL", FRONTL, { x, y: 672, s: 0.75 }, FRONT_X];
    if (k === "spread") return ["spread", SPREAD, { x, y: 672, s: 0.75 }, FRONT_X];
    // fix pass 2: 1609 leans forward-left (0.3 rad) with the wing spread to the left (tip ~(880, 650)), eyes shut
    if (k === "hop") return ["prep" + fr, FLAP(650, 880, null, [x, 668], -0.3), { x, y: 668, s: 0.75, rot: -0.3 }, FLAP_X, 1.5];
    return ["prep" + fr, FLAP(590, x - 230, null, [x, 680]), { x, y: 680, s: 0.75, rot: FLAP_ROT }, FLAP_X];
  }
  if (fr <= 1639) return ["flap" + flapTip(fr), FLAP(flapTip(fr), 750), { x: 990, y: 680, s: 0.75, rot: FLAP_ROT }, FLAP_X];
  if (fr === 1640) return ["back1640", FLAP(690, 850, null, [1035, 682]), { x: 1035, y: 682, s: 0.75, rot: FLAP_ROT / 2 }, FLAP_X, 2];
  if (BACK.has(fr)) return ["back" + fr, STARE, { x: BACK.get(fr), y: 690, s: 0.77 }, STARE_X];
  if (fr <= 1679) return ["stare", STARE, { x: 1145, y: 690, s: 0.77 }, STARE_X];
  if (GRAB.has(fr)) { const [rx, tx, ty, ey, lean, ry] = GRAB.get(fr); const [ax, ay] = toA(rx, ry); const [tax, tay] = toA(tx, ty); return ["grab" + fr, FLAP(tay, tax, ey, [ax, ay], lean), { x: ax, y: ay, s: 0.75, rot: lean }, FLAP_X, 2]; }
  if (GRAB2.has(fr)) {
    const [root, rot] = GRAB2.get(fr), [ax, ay] = toA(...root);
    return ["grab" + fr, grabPose(fr), { ...HOLD_P, x: ax, y: ay, rot }, HOLD_X, fr === 1684 ? 2.5 : 0];
  }
  if (WHIRL.has(fr)) { const [pose, place, X, blur] = whirlPose(fr); return [fr >= 1693 ? "hold" : "whirl" + fr, pose, place, X, blur]; }
  return ["hold", HOLD, HOLD_P, HOLD_X];
}

const cache = new Map();
export function owlAt(fr) {
  const [key, pose, place, extra, blur] = beat(fr);
  if (!cache.has(key)) { const L = owlLayer({ ...pose, ...place, extra: extra ? (g, geo) => extra(g, geo, pose) : undefined }); L.blur = blur || 0; cache.set(key, L); }
  return cache.get(key);
}
export function drawOwlAt(g, fr) {
  const L = owlAt(fr);
  if (!L) return L;
  // moving frames: a light blur (<= 2 px) of the whole drawing; the source keeps the turning owl readable
  const bl = L.blur;
  if (bl > 0) { g.save(); g.filter = `blur(${bl.toFixed(1)}px)`; g.drawImage(L.canvas, L.x, L.y, L.w, L.h); g.restore(); }
  else g.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  return L;
}
export function releaseOwl() { cache.clear(); }
