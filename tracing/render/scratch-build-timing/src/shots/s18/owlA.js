// s18 shot A owl: the chubby side-on owl that lands on the synth and scurries left along the keys.
// The source draws it as one rigid figure (template-tracked head and body agree within 2 px) carried along a path,
// with a 4-frame wing cycle (level, up, level, down) on the source's own 24-fps drawings and the back foot lifting
// on the upstroke. Owl units: the kit's (root = middle of the body), placed at s = 1.16 px/unit.
// Layering (as in the source): far wing, feet, body + head (kit), near wing, head again (kit, head only) — so the
// near wing sits over the body but under the head and the headphone cup.
import { owlLayer, mergePose, POSES, plumage, ink, setPPU, gv, LINE, flick, V } from "../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

export const S_A = 1.16;
export const ROOT_A = [705, 465];   // frame position of the root at 54.24 (frame 1356)

// Head/body template offsets vs frame 1356, per source frame (template match on the source, see fidelity).
// [frame, dx, dy]
export const PATH_A = [
  [1331, 1224, -58], [1332, 1097, -43], [1333, 985, -39], [1334, 864, -32], [1335, 755, -21], [1336, 647, -7], [1337, 554, -4],
  [1338, 470, 0], [1339, 400, 4], [1340, 331, 4], [1341, 283, 1], [1342, 241, 4], [1343, 205, 2], [1344, 178, 5], [1345, 155, 2],
  [1346, 137, 4], [1347, 118, 0], [1348, 103, 4], [1349, 87, 1], [1350, 72, 2], [1351, 72, 2], [1352, 56, 1], [1353, 42, 4],
  [1354, 28, 1], [1355, 14, 2], [1356, 0, 0], [1357, -12, 4], [1358, -25, 0], [1359, -37, 3], [1360, -48, 1], [1361, -56, 4],
  [1362, -60, 0], [1363, -58, 4], [1364, -52, 3], [1365, -45, 3], [1366, -35, 1], [1367, -20, 4], [1368, -9, 2], [1369, -1, 2],
  [1370, 10, 0], [1371, 22, 3], [1372, 33, 2], [1373, 40, 2], [1374, 49, 0], [1375, 57, 4], [1376, 57, 4], [1377, 63, 3],
  [1378, 65, 0], [1379, 69, 2], [1380, 72, 4], [1381, 71, 1],
];

export const BASE_A = mergePose(POSES.sit3q, {
  light: [-0.8, -0.6],
  head: { x: -80, y: -103, rx: 93, ry: 97, yaw: -0.4, pitch: 0.05, roll: -0.08, square: 2.2, jowl: 0.08 },
  tufts: [{ at: 1.2, size: 46, width: 0.3, lean: 0.9, second: 0.65, curl: 0.3 }, { at: 1.5, size: 40, width: 0.3, lean: 1.0, second: 0.6, curl: 0.3 }],
  body: { x: 44, y: -28, a: 145, b: 84, rot: -0.03, egg: 0.08, sag: 0.12 },
  tail: { base: [158, -30], tip: [258, -45], w: 32, n: 3, spread: 0.12 },
  wings: [],
  feet: [],
  eyes: { state: "wide", r: 31, spread: 0.5, el: -0.15, look: [0.55, -0.5], over: { pupil: 0.26, lid: 0.1, lidW: 0.16, curve: 0.25, ringW: 2.4 }, left: { r: 21, sx: 0.8, pupil: 0.34, look: [0.6, -0.35] }, right: {} },
  beak: { el: -0.45, lift: 1.3, w: 32, l: 42, open: 0.5 },
  bandage: { az: 0.55, el: 0.76, size: 62, rot: 0.2, sy: 0.5 },
  headphones: { on: true, yaw: -0.41, dx: 0.14, dy: 0.0, lift: 1.05, r: 50, bandR: 1.05, bandH: 1.18, tilt: 0.1, open: 0.55, cupEl: 0.14, w: 15 },
});

// ---------------------------------------------------------------- wings (measured feather tips, owl units)
let FW = 1.45;   // feather width multiplier (flight feathers; coverts reset it)
const U = ([x, y], off = [0, 0]) => [(x - off[0] - ROOT_A[0]) / S_A, (y - off[1] - ROOT_A[1]) / S_A];
const WING = {
  level: {
    lead: [[728, 372], [800, 340], [880, 300], [977, 265]].map((p) => U(p)),
    feathers: [
      [[770, 392], [880, 402], 24], [[790, 377], [917, 381], 26], [[815, 362], [952, 347], 28], [[830, 347], [980, 305], 28], [[842, 332], [977, 265], 26],
    ].map(([a, b, w]) => [U(a), U(b), w]),
    coverts: { from: 0.12, to: 0.78, n: 7, len: 36, rows: 2 },
  },
  up: {
    lead: [[782, 342], [798, 290], [832, 222], [872, 150], [906, 92]].map((p) => U(p)),
    feathers: [
      [[828, 362], [880, 352], 20], [[834, 346], [906, 306], 24], [[836, 328], [936, 252], 26], [[834, 306], [952, 196], 28], [[828, 282], [946, 134], 28], [[818, 256], [906, 92], 26],
    ].map(([a, b, w]) => [U(a), U(b), w]),
    coverts: { from: 0.1, to: 0.75, n: 6, len: 40, rows: 2 },
  },
  down: {
    lead: [[745, 362], [700, 392], [660, 420], [608, 450], [520, 494], [398, 531]].map((p) => U(p)),
    feathers: [
      [[700, 404], [640, 560], 26], [[668, 424], [578, 556], 28], [[630, 442], [518, 511], 28], [[590, 460], [458, 521], 26], [[545, 478], [398, 531], 24],
    ].map(([a, b, w]) => [U(a), U(b), w]),
    coverts: { from: 0.05, to: 0.7, n: 7, len: 34, rows: 2 },
  },
  far: {
    // the far wing's primary tips standing up behind the crown on the upstroke (measured on 1355)
    lead: [[560, 262], [590, 258], [630, 262]].map((p) => U(p)),
    feathers: [[[566, 262], [563, 152], 15], [[586, 262], [580, 118], 18], [[606, 262], [600, 145], 17], [[626, 262], [622, 178], 12]].map(([a, b, w]) => [U(a), U(b), w]),
    coverts: null,
  },
};

function featherPts(root, tip, w, bend = 0.08) {
  w *= FW;
  const d = V.sub(tip, root), L = V.len(d), u = V.nrm(d), n = V.perp(u);
  const P = (a, b) => V.add(V.add(root, V.mul(u, a * L)), V.mul(n, b * w + bend * L * Math.sin(Math.PI * a)));
  return [P(0, -0.5), P(0.35, -0.56), P(0.72, -0.44), P(0.93, -0.2), P(1, 0.04), P(0.9, 0.3), P(0.62, 0.5), P(0.3, 0.52), P(0, 0.5)];
}
function paintWing(g, W, seed, light) {
  const r = rng(seed);
  // flight feathers, lowest first (the upper ones overlap them)
  W.feathers.forEach(([root, tip, w], i) => {
    const q = featherPts(root, tip, w, 0.05);
    plumage(g, (c) => smoothPath(c, q, true), { base: 0.97, shade: 0.8, light, depth: w * 0.4, blur: w * 0.2 });
    // dark outline down the lower edge and round the tip; a faint grey vane line
    ink(g, [q[3], q[4], q[5], q[6], q[7]], 1.5, LINE, { end: 0.15, bias: 0.25 });
    ink(g, [q[1], q[2], q[3]], 0.9, gv(0.3, 0.6), { end: 0.2 });
    const m0 = V.mix(root, tip, 0.25), m1 = V.mix(root, tip, 0.85);
    ink(g, [m0, V.mix(m0, m1, 0.5), m1], 0.7, gv(0.45, 0.45), { end: 0.1 });
    for (let k = 0; k < 3; k++) { const a = 0.35 + r() * 0.45, p = V.mix(root, tip, a), d = V.nrm(V.sub(tip, root)); flick(g, V.add(p, V.mul(V.perp(d), (r() - 0.3) * w * 0.4)), V.rot(d, 0.35), w * 0.45, 0.8, gv(0.4, 0.4), 0.1); }
  });
  // the arm: a soft band along the leading edge, then rows of short rounded coverts
  const lead = sampleCurve(W.lead, 8);
  const tipDir = V.nrm(V.sub(W.feathers[0][1], W.feathers[0][0]));
  if (W.coverts) {
    const band = [...lead];
    for (let i = lead.length - 1; i >= 0; i--) { const f = i / (lead.length - 1); band.push(V.add(lead[i], V.mul(tipDir, 26 * (1 - 0.6 * f)))); }
    plumage(g, (c) => smoothPath(c, band, true), { base: 0.97, shade: 0.84, light, depth: 10, blur: 5 });
    const { from, to, n, len, rows } = W.coverts;
    for (let row = rows - 1; row >= 0; row--) {
      for (let k = 0; k < n; k++) {
        const f = from + (to - from) * (k + 0.5 * row) / n, j = Math.min(lead.length - 1, Math.floor(f * (lead.length - 1)));
        const base = V.add(lead[j], V.mul(tipDir, 6 + row * 16)), tip = V.add(base, V.mul(V.rot(tipDir, -0.15), len * (0.7 + 0.2 * (1 - f))));
        const q = featherPts(base, tip, 17 - row * 2, 0.02);
        plumage(g, (c) => smoothPath(c, q, true), { base: 0.97, shade: 0.86, light, depth: 5, blur: 3 });
        ink(g, [q[3], q[4], q[5], q[6]], 1.1, gv(0.25, 0.75), { end: 0.2, bias: 0.3 });
      }
    }
  }
  ink(g, lead, 1.9, LINE, { end: 0.3 });
}

// ---------------------------------------------------------------- feet (units): pale scaly toes, dark hooked claws
function paintFoot(g, { hip, ankle, dir, curl = 0, len = 30, back = true, seed = 3 }) {
  const r = rng(seed);
  // leg: feathered at the top (hidden under the belly), scaly below
  const legN = V.perp(V.nrm(V.sub(ankle, hip)));
  const legQ = [V.add(hip, V.mul(legN, 8)), V.add(ankle, V.mul(legN, 5)), V.sub(ankle, V.mul(legN, 5)), V.sub(hip, V.mul(legN, 8))];
  g.fillStyle = gv(0.86); g.beginPath(); smoothPath(g, legQ, true); g.fill();
  ink(g, [legQ[0], legQ[1]], 1.2, LINE, { end: 0.5 }); ink(g, [legQ[3], legQ[2]], 1.2, LINE, { end: 0.5 });
  for (let k = 1; k < 4; k++) { const p = V.mix(hip, ankle, 0.35 + k * 0.16); ink(g, [V.add(p, V.mul(legN, 5)), V.sub(p, V.mul(legN, 5))], 0.7, gv(0.3, 0.6)); }
  const toes = back ? [-0.42, 0.0, 0.42, Math.PI] : [-0.42, 0.0, 0.42];
  for (const a of toes) {
    const isBack = a === Math.PI;
    const d0 = V.rot(dir, isBack ? Math.PI + 0.35 : a), L = (isBack ? 0.5 : a === 0 ? 1.1 : 0.9) * len;
    const c = curl * (isBack ? -1 : 1);
    const p1 = V.add(ankle, V.mul(d0, L * 0.5)), d1 = V.rot(d0, c * 0.9), p2 = V.add(p1, V.mul(d1, L * 0.5));
    const pts = sampleCurve([ankle, p1, p2], 5);
    g.lineCap = "round";
    // toe: dark keyline under a pale core, knuckle creases
    for (const [w, col] of [[12, LINE], [9.4, gv(0.88 - 0.04 * r())]]) {
      g.strokeStyle = col; g.lineWidth = w * (isBack ? 0.85 : 1); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.stroke();
    }
    for (const f of [0.45, 0.72]) { const j = Math.floor(f * (pts.length - 1)), p = pts[j], t = V.nrm(V.sub(pts[j + 1], pts[j - 1] || p)), n = V.perp(t); ink(g, [V.add(p, V.mul(n, 3)), V.sub(p, V.mul(n, 3))], 0.7, gv(0.3, 0.7)); }
    // claw: hooks down (toward the key) with a dark tip
    const e = pts[pts.length - 1], t = V.nrm(V.sub(e, pts[pts.length - 3])), hook = V.perp(t), sg = t[0] < 0 ? -1 : 1;
    const tip = V.add(V.add(e, V.mul(t, 7)), V.mul(hook, 5 * sg));
    const claw = [V.add(e, V.mul(hook, -3)), V.add(V.add(e, V.mul(t, 5)), V.mul(hook, -1.5 * sg)), tip, V.add(V.add(e, V.mul(t, 3)), V.mul(hook, 3 * sg)), V.add(e, V.mul(hook, 3))];
    g.fillStyle = gv(0.25); g.beginPath(); smoothPath(g, claw, true); g.fill();
    g.fillStyle = LINE; g.beginPath(); g.arc(tip[0], tip[1], 1.4, 0, 7); g.fill();
  }
}
const FEET = {
  stand: [
    { hip: [40, 78], ankle: [32, 100], dir: [-0.8, 0.6], len: 32, seed: 2 },
    { hip: [114, 72], ankle: [118, 94], dir: [-0.85, 0.52], len: 30, seed: 5 },
  ],
  lift: [
    { hip: [40, 78], ankle: [32, 100], dir: [-0.8, 0.6], len: 32, seed: 2 },
    { hip: [120, 38], ankle: [178, 62], dir: [0.3, 0.95], curl: 1.4, len: 26, back: false, seed: 5 },
  ],
  dangle: [
    { hip: [40, 45], ankle: [44, 92], dir: [0.1, 1], curl: 0.9, len: 24, back: false, seed: 2 },
    { hip: [100, 40], ankle: [108, 86], dir: [0.2, 1], curl: 0.9, len: 24, back: false, seed: 5 },
  ],
};

// ---------------------------------------------------------------- composite per state
// content frame (the source is 24-fps animation with one repeated frame every 25)
export const contentFrame = (f) => f - Math.floor((f - 1) / 25);
export function wingPhase(f) { return ["level", "up", "level", "down"][contentFrame(f) % 4]; }

let cache = null, body = null, head = null;
export function owlAState(f) {
  const ph = wingPhase(f);
  const flying = f < 1337;
  const feet = flying ? "dangle" : ph === "up" ? "lift" : "stand";
  return { wing: ph, feet, key: `${ph}-${feet}` };
}
function build(st) {
  const place = { x: ROOT_A[0], y: ROOT_A[1], s: S_A };
  if (!body) body = owlLayer({ ...BASE_A, ...place });
  if (!head) head = owlLayer({ ...mergePose(BASE_A, { body: null, tail: null }), ...place, clip: [body.x, body.y, body.x + body.w, body.y + body.h] });
  const M = 170;   // room for wings outside the body layer
  const x0 = body.x - M, y0 = body.y - M, w = body.w + 2 * M, h = body.h + 2 * M;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  const toUnits = () => { g.setTransform(S_A, 0, 0, S_A, ROOT_A[0] - x0, ROOT_A[1] - y0); setPPU(S_A); };
  const light = V.nrm([-0.8, -0.6]);
  toUnits();
  if (st.wing === "up") paintWing(g, WING.far, 31, light);
  for (const f of FEET[st.feet]) paintFoot(g, f);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(body.canvas, body.x - x0, body.y - y0);
  toUnits();
  paintWing(g, WING[st.wing], 37, light);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(head.canvas, head.x - x0, head.y - y0);
  setPPU(1);
  return { canvas: c, x: x0, y: y0, w, h };
}
export function owlALayer(st) {
  if (!cache) cache = new Map();
  if (!cache.has(st.key)) cache.set(st.key, build(st));
  return cache.get(st.key);
}
export function owlAOffset(f) {
  const i = Math.max(0, Math.min(PATH_A.length - 1, f - PATH_A[0][0]));
  return [PATH_A[i][1], PATH_A[i][2]];
}
export function releaseOwlA() { cache = null; body = null; head = null; }
