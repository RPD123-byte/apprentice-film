// s20 (build 3): the owl, drawn with the shared B&W owl kit (owlInk.js) from poses fitted to the source, plus
// s20's own headphones (the source's big dark over-ear cups) and standing feet, drawn through the kit's `extra`
// hook. Placements are in setup-A frame coordinates (the shot draws the owl under the camera, as the source's
// setup B is the same drawing re-framed); hold measurements made on B2 frames are converted with the inverse B2
// affine (toA). Timing per source frame (fr = t·25) from the per-frame silhouette track
// (snapshots/s20-b3-study/owltrack.txt) and frame strips.
import { owlLayer, owlPose, mergePose, drawWing, LINE, gv } from "../../../lib/owlInk.js";
import { taper } from "../../../lib/ink.js";
import { sampleCurve } from "../../../lib/paths.js";
import { clamp, lerp } from "../../../lib/rng.js";

const TAU = Math.PI * 2;
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
  body: { x: 0, y: 6, a: 118, b: 146, rot: Math.PI / 2, egg: 0.16, sag: 0 },
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
  feet: bboxPts([[-60, 190], [70, 190], [33, -350]]),
});
const FRONT_X = (g) => {
  foot(g, { hip: [-47, 100], ankle: [-54, 152], dir: -0.25, spread: 1.4 });
  foot(g, { hip: [53, 104], ankle: [66, 146], dir: 0.55, spread: 1.3 });
  band(g, [[-111, -228], [-90, -300], [-20, -338], [60, -340], [140, -300], [173, -224]], 10);
  cupSide(g, -113, -190, 26, 58, -1); cupSide(g, 175, -186, 26, 58, 1);
};

// rear (63.36–63.60, fitted at 63.52): from behind, pushing the card with the raised right wing
const REAR = mergePose(BASE, {
  head: { x: 9, y: -187, rx: 107, ry: 92, yaw: Math.PI, roll: 0.03, square: 2.4, jowl: 0.45 },
  tufts: [{ at: -1.1, size: 30, width: 0.3, lean: -0.3, spikes: 2, fan: 0.4, curl: 0.2, seed: 8, valley: 0.55 }],
  body: { x: -8, y: 0, a: 136, b: 140, rot: Math.PI / 2, egg: 0.1, sag: 0 },
  eyes: { state: "glossy", r: 1, spread: 0.5, el: 0 },
  beak: { w: 0.01, l: 0.01, style: "shield" },
  disc: 0,
  bandage: { az: 3.53, el: 0.29, size: 51, rot: -0.8 },
  headphones: NOHP,
  wings: [
    { type: "spread", style: "layered", layer: "front", S: [60, -67], Wr: [166, -147], T: [273, -220], trail: [0.55, 0.85], len: 100, spread: 0.85, n: 8, m: 6, seed: 51 },
  ],
  tail: { base: [-150, 67], tip: [-253, 100], w: 22, n: 2 },
  feet: bboxPts([[-80, 170], [40, 175], [75, -330]]),
});
const REAR_X = (g) => {
  foot(g, { hip: [-70, 128], ankle: [-80, 150], dir: -1.3, size: 32, spread: 0.6 });
  foot(g, { hip: [30, 118], ankle: [33, 138], dir: 1.35, size: 32, spread: 0.6 });
  band(g, [[-98, -236], [-60, -292], [20, -322], [90, -310], [124, -264], [124, -244]], 12);
  cupRound(g, 120, -185, 58, { rx: 0.8 });
};

// flap (64.44–65.52, fitted at 64.80): profile facing left, eyes shut in effort, beating the scissors with its near
// wing; wing tip y per frame (frame px, measured on strips: up 553 / mid ~610 / low ~670; a 4-frame cycle from 64.68)
const FLAP = (tipY, tipX = 755, eyes = null, root = [975, 680]) => {
  const T = [(tipX - root[0]) / 0.75, (tipY - root[1]) / 0.75], S = [-33, -93];
  const Wr = [lerp(S[0], T[0], 0.45), lerp(S[1], T[1], 0.45) - 24];
  return mergePose(BASE, {
    head: { x: -63, y: -200, rx: 112, ry: 106, yaw: -1.15, roll: -0.14, square: 2.3, jowl: 0.2 },
    tufts: [{ at: 1.3, size: 48, width: 0.4, lean: 0.35, spikes: 3, fan: 0.8, curl: 0.2, seed: 7, valley: 0.55 }],
    body: { x: 0, y: -2, a: 133, b: 132, rot: Math.PI / 2, egg: 0.08, sag: 0 },
    eyes: eyes || { state: "shut", r: 28, spread: 0.5, el: -0.05 },
    beak: { el: -0.37, lift: 1.12, w: 26, l: 30, style: "shield" },
    disc: 0,
    bandage: { az: 1.15, el: 0.49, size: 46, rot: -0.9 },
    headphones: NOHP,
    wings: [],
    // the near wing is drawn over the face by FLAP_X (the kit paints the head over its front wings)
    flapWing: { type: "spread", style: "layered", layer: "front", S, Wr, T, trail: [0.15, 1], len: 150, secLen: 1.2, spread: 1.0, n: 8, m: 7, seed: 61 },
    tail: { base: [100, 0], tip: [185, 22], w: 22, n: 2 },
    feet: bboxPts([[-20, 190], [110, 195], [-27, -365], [T[0] - 140, T[1] - 40], [T[0] - 140, T[1] + 150]]),
  });
};
const FLAP_X = (g, geo, pose) => {
  if (pose && pose.flapWing) drawWing(g, pose.flapWing, { light: [-0.5, -0.86], detail: 0.8 });
  foot(g, { hip: [5, 112], ankle: [0, 140], dir: -1.35, spread: 0.45, size: 38 });
  foot(g, { hip: [100, 118], ankle: [113, 147], dir: -1.25, spread: 0.45, size: 38 });
  band(g, [[-5, -236], [-2, -292], [20, -326], [60, -324], [88, -290]], 14);
  cupRound(g, -5, -188, 50);
};

// stare (65.68–67.16, fitted at 66.20): profile facing left, glossy eye wide, staring at the clean scissors
const STARE = mergePose(BASE, {
  head: { x: -47, y: -210, rx: 124, ry: 112, yaw: -1.15, roll: 0, square: 2.3, jowl: 0.2 },
  tufts: [{ at: 1.25, size: 44, width: 0.4, lean: 0.3, spikes: 3, fan: 0.7, curl: 0.2, seed: 7, valley: 0.55 }],
  body: { x: 0, y: -26, a: 152, b: 165, rot: Math.PI / 2, egg: 0.1, sag: 0 },
  eyes: { state: "glossy", r: 29, spread: 0.5, el: -0.05, look: [-1, 0], over: { lookGain: 2, sx: 1 } },
  beak: { el: -0.37, lift: 1.1, w: 26, l: 30, style: "shield" },
  bandage: { az: 1.34, el: 1.0, size: 50, rot: -0.9 },
  headphones: NOHP,
  disc: 0,
  wings: [{ type: "folded", layer: "front", style: "scallop", S: [-30, -110], T: [168, 40], width: 50, back: 34, dir: 1, rows: 3 }],
  tail: { base: [120, 30], tip: [205, 50], w: 22, n: 2 },
  feet: bboxPts([[-110, 195], [40, 200], [-10, -390]]),
});
const STARE_X = (g) => {
  foot(g, { hip: [-60, 108], ankle: [-73, 140], dir: -1.35, spread: 0.45, size: 38 });
  foot(g, { hip: [5, 112], ankle: [0, 147], dir: -1.25, spread: 0.45, size: 38 });
  band(g, [[14, -262], [16, -318], [38, -350], [78, -346], [104, -312]], 14);
  cupRound(g, 12, -211, 58);
};

// hold (67.80–69.40, fitted on the B2 median): facing us, scowling grin, the scissors raised in its right wing
// (viewer's left), left wing on its hip. Units at s 0.85 (frame px).
// measured on the B2 median (frame px, converted to A units at root toA(1090, 640), s 0.869): head centre
// (1105, 455), half width 105, eyes (1015, 492) / (1105, 485), beak top (1047, 505), right cup (1205, 445) r 45,
// body centre (1075, 640) half width 115, bottom 760, ankles (1010, 760) / (1115, 765), hip wing shoulder (1160, 560)
// -> elbow (1230, 640) -> hand (1170, 700), raised wing shoulder (975, 560) -> elbow (930, 590) -> hand (890, 490)
const HOLD = mergePose(BASE, {
  head: { x: 17, y: -221, rx: 122, ry: 104, yaw: -0.2, roll: 0.02, square: 2.4, jowl: 0.3 },
  tufts: [{ at: -0.8, size: 34, width: 0.3, lean: 0.15, spikes: 2, fan: 0.4, curl: 0.2, seed: 3, valley: 0.55 }, { at: 0.82, size: 32, width: 0.3, lean: -0.2, spikes: 2, fan: 0.4, curl: 0.25, seed: 4, valley: 0.55 }],
  body: { x: -17, y: -6, a: 134, b: 150, rot: Math.PI / 2, egg: -0.08, sag: 0 },
  eyes: { state: "sly", r: 33, spread: 0.46, el: -0.4, look: [0.5, 0], over: { sx: 1.2, iris: 0.52, top: 0.42, bot: 0.36, tilt: 0.3, brow: 1.2, browSlant: 0.8, lookX: 0.35 } },
  beak: { el: -0.62, lift: 1.08, w: 33, l: 36, style: "grin", smirk: 1 },
  bandage: { az: -0.42, el: 0.5, size: 62, rot: -0.75 },
  headphones: NOHP,
  wings: [
    { type: "arm", style: "feathered", layer: "front", S: [82, -95], Wr: [162, 0], T: [93, 71], len: 40, fingers: [-0.3, 1], nf: 4 },
    { type: "arm", style: "feathered", layer: "front", S: [-110, -95], Wr: [-186, -60], T: [-232, -178], len: 40, fingers: [-0.6, -0.8], nf: 4 },
  ],
  tail: { base: [100, 80], tip: [200, 100], w: 20, n: 2 },
  feet: bboxPts([[-140, 200], [80, 215], [17, -360]]),
});
const HOLD_X = (g) => {
  foot(g, { hip: [-86, 110], ankle: [-93, 144], dir: -0.35, spread: 1.4, size: 40 });
  foot(g, { hip: [24, 115], ankle: [29, 150], dir: 0.35, spread: 1.3, size: 40 });
  band(g, [[-136, -250], [-100, -318], [0, -345], [100, -330], [140, -270]], 11);
  cupRound(g, 131, -233, 52, { rx: 0.72 }); cupSide(g, -140, -205, 20, 46, -1);
};

// the hold pose with the raised wing swinging (whirl frames): the right wing out as an arm toward the hand point
const HOLD_SWING = (hand) => mergePose(HOLD, { wings: [HOLD.wings[0], { type: "arm", style: "feathered", layer: "front", S: [-110, -94], Wr: [lerp(-110, hand[0], 0.5) - 30, lerp(-94, hand[1], 0.5)], T: hand, len: 36, fingers: [-0.5, -1], nf: 4 }] });
const REAR_SWING = mergePose(REAR, { wings: [{ type: "spread", style: "layered", layer: "front", S: [75, -63], Wr: [140, -150], T: [170, -250], trail: [0.7, 0.5], len: 60, spread: 0.6, n: 6, m: 5, seed: 52 }] });
const GRAB_EYES = { state: "glossy", r: 29, spread: 0.5, el: -0.05, look: [-1, 0], over: { lookGain: 2 } };
const GRAB_SCOWL = { state: "scowl", r: 28, spread: 0.5, el: -0.05, over: { lookX: -0.4 } };
// grab 67.20–67.36: [root x, wing tip x, tip y, eyes, lean]
const GRAB = new Map([[1680, [1110, 773, 582, GRAB_EYES, -0.12]], [1681, [1075, 713, 585, GRAB_EYES, -0.16]]]);
// 67.28–67.36: turned to face us (scowl), the raised wing reaching back to the scissors' shank: [root x (B2), hand (B2)]
const GRAB2 = new Map([[1682, [1010, [724, 423]]], [1683, [1000, [748, 365]]], [1684, [1000, [744, 410]]]]);
// whirl 67.40–67.76: [pose, root x (frame px), blur px, hand (units, hold pose)]
const WHIRL = new Map([
  [1685, ["hold", 1080, 2, [-180, -300]]], [1686, ["hold", 1095, 7, [-60, -330]]], [1687, ["hold", 1110, 8, [60, -300]]],
  [1688, ["rear", 1146, 3, null]], [1689, ["rear", 1150, 3, null]], [1690, ["rear", 1125, 5, null]],
  [1691, ["hold", 1100, 8, [-40, -330]]], [1692, ["hold", 1085, 7, [-150, -300]]], [1693, ["hold", 1092, 3, [-200, -220]]], [1694, ["hold", 1095, 1.5, [-215, -212]]],
]);

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
const TURN = new Map([[1591, ["rear", 1265]], [1592, ["rear3q", 1245]], [1593, ["sideR", 1212]], [1594, ["front", 1168]], [1595, ["front", 1162]], [1596, ["front", 1151]], [1597, ["front", 1148]]]);
const PREP = new Map([[1607, ["frontL", 1140]], [1608, ["spread", 1110]], [1609, ["flap", 1100]], [1610, ["flap", 1060]]]);
const BACK = new Map([[1639, 1030], [1640, 1075], [1641, 1155], [1642, 1180], [1643, 1193], [1644, 1198]]);
const REAR3Q = mergePose(REAR, { head: { yaw: Math.PI - 0.7 }, bandage: { az: 3.53 + 0.7 } });
const SIDER = mergePose(STARE, { eyes: { state: "shut" }, flip: true });
const FRONTL = mergePose(FRONT, { eyes: { look: [-1, 0.05] } });
const SPREAD = mergePose(FRONT, { eyes: { state: "shut" }, wings: [
  { type: "spread", style: "layered", layer: "back", S: [-90, -80], Wr: [-190, -60], T: [-290, -10], trail: [0.3, 1], len: 80, spread: 0.8, n: 7, m: 5, seed: 71 },
  { type: "spread", style: "layered", layer: "back", S: [110, -80], Wr: [200, -60], T: [290, -10], trail: [-0.3, 1], len: 80, spread: 0.8, n: 7, m: 5, seed: 73 }] });
function beat(fr) {
  if (fr <= 1590) { const [dx, dy] = REAR_DX.get(fr) || [0, 0]; return ["rear" + Math.min(fr, 1586), REAR, { x: 1275 + dx, y: 670 + dy, s: 0.75 }, REAR_X]; }
  if (TURN.has(fr)) {
    const [k, x] = TURN.get(fr);
    if (k === "rear") return ["rear1591", REAR, { x, y: 667, s: 0.75 }, REAR_X];
    if (k === "rear3q") return ["rear3q", REAR3Q, { x, y: 670, s: 0.75 }, REAR_X];
    if (k === "sideR") return ["sideR", SIDER, { x, y: 690, s: 0.72, flip: true }, STARE_X];
    return ["front" + fr, FRONT, { x, y: 672, s: 0.75 }, FRONT_X];
  }
  if (fr <= 1606) return ["front", FRONT, { x: 1146, y: 672, s: 0.75 }, FRONT_X];
  if (PREP.has(fr)) {
    const [k, x] = PREP.get(fr);
    if (k === "frontL") return ["frontL", FRONTL, { x, y: 672, s: 0.75 }, FRONT_X];
    if (k === "spread") return ["spread", SPREAD, { x, y: 672, s: 0.75 }, FRONT_X];
    return ["prep" + fr, FLAP(fr === 1609 ? 640 : 590, x - 220, null, [x, 680]), { x, y: 680, s: 0.75 }, FLAP_X];
  }
  if (fr <= 1638) return ["flap" + flapTip(fr), FLAP(flapTip(fr), 767, null, [1040, 680]), { x: 1040, y: 680, s: 0.75 }, FLAP_X];
  if (BACK.has(fr)) return ["back" + fr, STARE, { x: BACK.get(fr), y: 690, s: 0.77 }, STARE_X];
  if (fr <= 1679) return ["stare", STARE, { x: 1200, y: 690, s: 0.77 }, STARE_X];
  if (GRAB.has(fr)) { const [rx, tx, ty, ey, lean] = GRAB.get(fr); const [ax, ay] = toA(rx, 690); const [tax, tay] = toA(tx, ty); return ["grab" + fr, FLAP(tay, tax, ey, [ax, ay]), { x: ax, y: ay, s: 0.75, rot: lean }, FLAP_X]; }
  if (GRAB2.has(fr)) {
    const [rx, [hx, hy]] = GRAB2.get(fr), [ax, ay] = toA(rx, 700), [hax, hay] = toA(hx, hy);
    return ["grab" + fr, HOLD_SWING([(hax - ax) / HOLD_P.s, (hay - ay) / HOLD_P.s]), { ...HOLD_P, x: ax, y: ay }, HOLD_X];
  }
  if (WHIRL.has(fr)) {
    const [k, rx, blur, hand] = WHIRL.get(fr); const [ax, ay] = toA(rx, 680);
    if (k === "rear") return ["whirl" + fr, REAR_SWING, { x: ax, y: ay - 8, s: 0.8 }, REAR_X, blur];
    return ["whirl" + fr, HOLD_SWING(hand), { ...HOLD_P, x: ax }, HOLD_X, blur];
  }
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
  if (L.blur > 0) {
    // spinning: soft copies smeared sideways (the source's motion-blurred whirl frames), built once per drawing
    if (!L.smear) {
      const pad = Math.ceil(L.blur * 5), c = document.createElement("canvas");
      c.width = L.canvas.width + pad * 2; c.height = L.canvas.height + pad;
      const q = c.getContext("2d"); q.filter = `blur(${L.blur.toFixed(1)}px)`;
      for (let k = -2; k <= 2; k++) { q.globalAlpha = 0.28; q.drawImage(L.canvas, pad + k * L.blur * 1.6, pad / 2); }
      L.smear = { c, pad };
    }
    g.drawImage(L.smear.c, L.x - L.smear.pad, L.y - L.smear.pad / 2);
  } else g.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  return L;
}
export function releaseOwl() { cache.clear(); }
