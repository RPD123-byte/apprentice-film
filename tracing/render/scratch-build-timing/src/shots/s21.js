// s21 (69.44–74.52): the sōko page, shrunk onto the lit screen in the dark room. The owl walks in from the
// frame's left edge along the floor of the page carrying a huge pair of scissors over its shoulder, stops, looks up,
// crouches, flies up the left side of the page, lands on the header's top edge (under the rail) and starts cutting:
// a dashed line appears along the header's top edge behind the blades. Camera locked (camtrack s = 1.0000).
// All positions below are frame px measured on the source (template tracking of the head, head-centred unit grids,
// gridded zooms); see fidelity/s21.md. The owl itself is drawn by s21/owl.js.
import { drawFramedPage, sokoPageCanvas, FRAMED, releaseSoko } from "../lib/sites.js";
import { gv, LINE, V } from "../lib/owlInk.js";
import { lerp, smooth, clamp } from "../lib/rng.js";
import { owlSprite, mixPose, over } from "./s21/owl.js";

// ---------------------------------------------------------------- helpers
// keys: [[t, a, b, ...], ...] sorted by t; linear interpolation of every column
function interp(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const a = keys[i], b = keys[i + 1], u = (t - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u);
}
// smooth (cubic Hermite / Catmull-Rom) interpolation for paths
function spline(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(n - 1, i + 2)];
  const h = p2[0] - p1[0], u = (t - p1[0]) / h;
  const u2 = u * u, u3 = u2 * u;
  return p1.slice(1).map((v, k) => {
    const m1 = ((p2[k + 1] - p0[k + 1]) / Math.max(1e-6, p2[0] - p0[0])) * h;
    const m2 = ((p3[k + 1] - p1[k + 1]) / Math.max(1e-6, p3[0] - p1[0])) * h;
    return (2 * u3 - 3 * u2 + 1) * v + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[k + 1] + (u3 - u2) * m2;
  });
}
// pose keys: [[t, pose], ...] → blended pose (smoothstep between neighbours)
function poseAt(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, a] = keys[i], [tb, b] = keys[i + 1];
    if (t <= tb) return mixPose(a, b, smooth((t - ta) / (tb - ta)));
  }
  return keys[keys.length - 1][1];
}

// ---------------------------------------------------------------- scissors (frame px)
// Pivot at (x, y); the blades point along `ang` (L = pivot → tip), opened by `open`. The handles are not straight
// continuations of the blades: the two rings sit at measured offsets from the pivot in the scissors' own frame
// (u along the handle direction, v across it, both × L; source 70.40/71.20 while carried, 74.00 while cutting).
const RINGS_CARRY = [{ u: 0.52, v: -0.155, rx: 0.17, ry: 0.092, rot: -0.3 }, { u: 0.6, v: 0.03, rx: 0.165, ry: 0.1, rot: 0.02 }];
const RINGS_CUT = [{ u: 0.33, v: 0.08, rx: 0.16, ry: 0.105, rot: -0.95 }, { u: 0.35, v: -0.2, rx: 0.18, ry: 0.1, rot: 0.1 }];
function ringsOf(sc) {
  const k = sc.cut ?? 0;
  return RINGS_CARRY.map((r, i) => mixPose(r, RINGS_CUT[i], k));
}
function ringPos(sc, r) {
  const h = [-Math.cos(sc.ang), -Math.sin(sc.ang)], e2 = [-h[1], h[0]];
  return [sc.x + (h[0] * r.u + e2[0] * r.v) * sc.L, sc.y + (h[1] * r.u + e2[1] * r.v) * sc.L];
}
function drawBlade(g, x, y, a, L, k) {
  const c = Math.cos(a), s = Math.sin(a);
  const P = (u, v) => [x + c * u - s * v, y + s * u + c * v];
  const w0 = 0.07 * L, inner = -k;
  const blade = [P(-0.03 * L, -inner * w0 * 0.9), P(0.3 * L, -inner * w0 * 1.0), P(0.62 * L, -inner * w0 * 0.78), P(0.88 * L, -inner * w0 * 0.34), P(L, inner * w0 * 0.05),
    P(0.8 * L, inner * w0 * 0.3), P(0.45 * L, inner * w0 * 0.62), P(0.08 * L, inner * w0 * 0.85), P(-0.03 * L, inner * w0 * 0.85)];
  g.beginPath(); g.moveTo(blade[0][0], blade[0][1]); for (const p of blade.slice(1)) g.lineTo(p[0], p[1]); g.closePath();
  g.fillStyle = gv(0.88); g.fill(); g.lineWidth = 1.0; g.strokeStyle = gv(0.12, 0.85); g.stroke();
  g.lineWidth = Math.max(0.7, 0.012 * L); g.strokeStyle = gv(0.97, 0.9);
  g.beginPath(); const h0 = P(0.05 * L, -inner * w0 * 0.5), h1 = P(0.7 * L, -inner * w0 * 0.42), h2 = P(0.92 * L, -inner * w0 * 0.06); g.moveTo(h0[0], h0[1]); g.quadraticCurveTo(h1[0], h1[1], h2[0], h2[1]); g.stroke();
  g.lineWidth = Math.max(0.6, 0.008 * L); g.strokeStyle = gv(0.42, 0.8);
  g.beginPath(); const e0 = P(0.12 * L, inner * w0 * 0.42), e1 = P(0.85 * L, inner * w0 * 0.1); g.moveTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.stroke();
}
function drawHandle(g, sc, r) {
  const L = sc.L, rc = ringPos(sc, r), a = sc.ang + Math.PI;
  const rx = r.rx * L, ry = r.ry * L, rw = Math.max(1.6, 0.04 * L), ra = a + r.rot;
  // shank from the pivot to the near side of the ring
  const near = [rc[0] - Math.cos(ra) * rx * 0.85, rc[1] - Math.sin(ra) * rx * 0.85];
  g.lineCap = "round";
  g.strokeStyle = gv(0.12, 0.85); g.lineWidth = 0.068 * L + 2; g.beginPath(); g.moveTo(sc.x, sc.y); g.lineTo(near[0], near[1]); g.stroke();
  g.strokeStyle = gv(0.8); g.lineWidth = 0.068 * L; g.beginPath(); g.moveTo(sc.x, sc.y); g.lineTo(near[0], near[1]); g.stroke();
  g.save(); g.translate(rc[0], rc[1]); g.rotate(ra);
  g.lineWidth = rw + 2.2; g.strokeStyle = LINE; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = rw; g.strokeStyle = gv(0.8); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = Math.max(0.6, rw * 0.3); g.strokeStyle = gv(0.96, 0.9); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
  g.restore();
}
function drawScissors(g, sc) {
  const { x, y, ang, L, open = 0.1 } = sc;
  g.save(); g.lineJoin = "round";
  const R = ringsOf(sc);
  drawHandle(g, sc, R[1]);
  drawBlade(g, x, y, ang + open / 2, L, 1);
  drawHandle(g, sc, R[0]);
  drawBlade(g, x, y, ang - open / 2, L, -1);
  const r = Math.max(1.5, 0.028 * L);
  g.fillStyle = gv(0.88); g.strokeStyle = LINE; g.lineWidth = 1;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = gv(0.3); g.beginPath(); g.arc(x, y, r * 0.4, 0, Math.PI * 2); g.fill();
  g.restore();
}
// the two ring centres, frame px, upper first; the grip = between them
function ringCentres(sc) { return ringsOf(sc).map((r) => ringPos(sc, r)).sort((p, q) => p[1] - q[1]); }
function gripPoint(sc) { const [a, b] = ringCentres(sc); return V.mix(a, b, 0.5); }
function scissorsBox(sc) {
  const pts = [[sc.x, sc.y], [sc.x + Math.cos(sc.ang) * sc.L * 1.02, sc.y + Math.sin(sc.ang) * sc.L * 1.02], ...ringCentres(sc)];
  const m = sc.L * 0.24;
  return [Math.min(...pts.map((p) => p[0])) - m, Math.min(...pts.map((p) => p[1])) - m, Math.max(...pts.map((p) => p[0])) + m, Math.max(...pts.map((p) => p[1])) + m];
}

// ---------------------------------------------------------------- owl poses (s21/owl.js units: head r = 100,
// origin = head centre, facing right). Measured on head-centred unit grids of the source (70.44, 71.20, 71.92,
// 72.00, 72.12, 72.20, 72.44, 72.92, 74.00).
const FACE = {
  eye: { az: 0.5, el: -0.2, rx: 22, ry: 15, brow: 1.0, lidW: 0.24, look: [0.8, 0.15], pupil: 0.5, open: 0, outer: 0.3, inner: 0.1, vbrow: 1, tilt: 0.08 },
  beak: { el: -0.4, lift: 1.12, w: 24, l: 30 },
  phones: { cupAz: -0.05, cupEl: 0.1, r: 44, lit: 0, bandW: 13, bandLift: 1.1, bandTilt: 0.2 },
  bandage: { az: -1.1, el: 0.95, size: 34, rot: 0.3 },
};
// A) walking in (70.44): head 3/4 to the right, body behind and below it, the tail out to the lower left
const WALK = {
  ...FACE,
  head: { yaw: 0.9, nod: 0, roll: 0.05, r: 90, bump: 12 },
  body: { x: -45, y: 152, a: 135, b: 102, rot: 2.55, egg: 0.2 },
  tail: { base: [-150, 205], tip: [-275, 250], w: 34, n: 2 },
  grip: { S: [-115, 62], trail: [0.22, 0.97], len: 100, nP: 5, nS: 4, fan: 1.0, secL: 1.2, cov: 0.6, pw: 0.17, aim: "upper", off: [-15, 6] },
};
// looking up (71.20): more upright, the head tipped back, the eye rolled up (the brow stays angry)
const LOOK = over(WALK, {
  head: { yaw: 0.9, nod: -0.4, roll: -0.05 },
  body: { x: -15, y: 165, a: 128, b: 102, rot: 2.05, egg: 0.06 },
  tail: { base: [-118, 250], tip: [-205, 292], w: 42 },
  eye: { look: [0.2, -1], open: 1.2 },
  grip: { S: [-60, 110] },
});
// crouched for take-off (71.92): low and forward, the head down over the rings
const CROUCH = over(WALK, {
  head: { yaw: 0.95, nod: 0.25, roll: 0.08 },
  body: { x: -70, y: 165, a: 142, b: 116, rot: 2.75, egg: 0.06 },
  tail: { base: [-185, 225], tip: [-290, 255], w: 46 },
  grip: { S: [-95, 95] },
});
// B) flying: the body hangs under the head, legs dangle
const FLY = over(WALK, {
  head: { yaw: 0.9, nod: 0, roll: 0 },
  body: { x: -25, y: 160, a: 112, b: 96, rot: 1.95, egg: 0.14 },
  tail: { base: [-110, 268], tip: [-205, 312], w: 42, n: 3 },
  grip: null,
});
// C) on the header's top edge (74.00): hunched forward, the head rolled down over the blades, the back high
const TOP = {
  ...FACE,
  head: { yaw: 1.0, nod: 0.45, roll: 0.1, r: 95, bump: 12 },
  body: { x: -92, y: 116, a: 140, b: 124, rot: 2.52, egg: 0.1 },
  tail: { base: [-235, 185], tip: [-352, 196], w: 38, n: 2 },
  grip: { S: [-125, 45], trail: [0.55, 0.84], len: 100, nP: 6, nS: 4, fan: 0.7, secL: 1.2, cov: 0.6, pw: 0.18, aim: "grip", off: [-25, 0] },
  phones: { ...FACE.phones, lit: 1, r: 46, bandLift: 1.18, bandTilt: -0.1 },
  eye: { ...FACE.eye, look: [0.8, 0.3], tilt: -0.05 },
};
// spread wings in flight (near = viewer-left, over the body; far = viewer-right, behind it), blended
// DOWN (0) → LEVEL (0.35) → UP (1)
const W_UP = [
  { layer: "mid", S: [-80, 100], Wr: [-193, 22], T: [-284, -26], trail: [-0.55, 0.84], len: 135, nP: 7, nS: 5, fan: 0.9, tipX: 0.3, seed: 3 },
  { layer: "back", S: [70, 60], Wr: [152, 11], T: [214, -30], trail: [0.5, 0.87], len: 95, nP: 6, nS: 3, fan: 0.9, tipX: 0.3, seed: 7 },
];
const W_LEVEL = [
  { layer: "mid", S: [-80, 120], Wr: [-202, 96], T: [-302, 78], trail: [-0.15, 0.99], len: 133, nP: 7, nS: 5, fan: 0.9, tipX: 0.3, seed: 3 },
  { layer: "back", S: [70, 90], Wr: [168, 83], T: [246, 75], trail: [0.15, 0.99], len: 98, nP: 6, nS: 3, fan: 0.9, tipX: 0.3, seed: 7 },
];
const W_DOWN = [
  { layer: "mid", S: [-70, 150], Wr: [-174, 185], T: [-261, 220], trail: [0.35, 0.94], len: 126, nP: 7, nS: 5, fan: 0.9, tipX: 0.3, seed: 3 },
  { layer: "back", S: [70, 120], Wr: [168, 153], T: [250, 169], trail: [-0.25, 0.97], len: 98, nP: 6, nS: 3, fan: 0.9, tipX: 0.3, seed: 7 },
];
function wingsAt(uNear, uFar) {
  const at = (u, i) => (u < 0.35 ? mixPose(W_DOWN[i], W_LEVEL[i], u / 0.35) : mixPose(W_LEVEL[i], W_UP[i], (u - 0.35) / 0.65));
  return [at(uNear, 0), at(uFar, 1)];
}

// ---------------------------------------------------------------- measured motion (frame px)
// A) walk: the tracked head point moves at 246 px/s (template track 69.56–70.84, (205, 790) at 70.20), bobbing
// 2.5 px once per step (0.165 s). The head centre sits (+3, −1.5) px from the tracked point.
const WALK_HEAD = (t) => [205 + 246 * (Math.min(t, 70.845) - 70.2), 790 + 2.5 * Math.cos((2 * Math.PI * (t - 69.64)) / 0.165)];
// hold / look up / crouch (tracked head): [t, x, y]
const HOLD_HEAD = [[70.845, 364, 790], [70.92, 366, 787], [71.04, 365, 783], [71.64, 365, 783], [71.72, 377, 790], [71.8, 388, 796], [71.98, 390, 795]];
// scissors while walking/holding: [t, dx, dy (pivot − tracked head), ang − π, open, L]
const SC_WALK = [[69.44, -9, 15.5, 0.46, 0.18, 114], [70.8, -9.5, 16.5, 0.44, 0.18, 115], [70.92, -11, 19, 0.37, 0.18, 117], [71.04, -11, 20, 0.3, 0.2, 118], [71.64, -11, 20, 0.3, 0.2, 118],
  [71.76, -22, 18, 0.67, 0.2, 120], [71.98, -22, 18, 0.67, 0.2, 120]];
// B) flight: tracked head point (template track + the head-centre offset checked on 4x grids at 72.16 / 72.40)
const FLY_HEAD = [
  [71.98, 390, 795], [72.0, 395, 790], [72.04, 415, 729], [72.08, 426, 679], [72.12, 433, 632], [72.16, 427, 587], [72.2, 417, 547], [72.24, 399, 516],
  [72.28, 370, 479], [72.32, 336, 443], [72.36, 308, 411], [72.4, 282, 381], [72.44, 260, 344], [72.48, 238, 306], [72.52, 233, 253],
  [72.56, 230, 213], [72.6, 236, 153], [72.64, 230, 96], [72.68, 235, 63], [72.72, 237, 52], [72.76, 240, 44], [72.8, 237, 48], [72.84, 240, 50], [72.92, 240, 64], [73.0, 240, 76], [73.04, 244, 84],
];
// the head CENTRE in flight (template match of the head at 72.44, offset to the centre on unit grids at 72.12, 72.44,
// 72.60–72.84; 72.80 read by eye)
const FLY_CENTRE = [
  [71.98, 393, 793.5], [72.0, 390, 788], [72.04, 403, 736], [72.08, 417, 686], [72.12, 424, 635], [72.16, 420, 585], [72.2, 411, 544], [72.24, 393, 513],
  [72.28, 367, 478], [72.32, 331, 441], [72.36, 304, 410], [72.4, 279, 382], [72.44, 253, 349], [72.48, 233, 308], [72.52, 226, 261], [72.56, 220, 215],
  [72.6, 221, 157], [72.64, 222, 114], [72.68, 227, 79], [72.72, 231, 56], [72.76, 233, 40], [72.8, 236, 44], [72.84, 233, 38], [72.92, 243, 63], [73.0, 247, 74], [73.04, 250, 80],
];
// wing position per source frame, near (viewer-left) and far wing separately (1 = up in a V, 0.35 = level,
// 0 = down), read frame by frame 72.00–73.00 on head-centred crops
const WING_KEYS = [[71.96, 0.7, 0.8], [72.0, 0.7, 0.8], [72.04, 0.4, 0.6], [72.08, 0.3, 0.35], [72.12, 1, 1], [72.16, 0.22, 0.3], [72.2, 0.1, 0.2], [72.24, 0.05, 0.3],
  [72.28, 0.1, 0.7], [72.32, 0.6, 0.9], [72.36, 0.1, 0.3], [72.4, 0.25, 0.35], [72.44, 0.85, 1], [72.48, 0.1, 0.1], [72.52, 0.35, 0.35], [72.56, 1, 0.9],
  [72.6, 0.4, 0.35], [72.64, 0.25, 0.15], [72.68, 0.4, 0.4], [72.72, 0.9, 0.9], [72.76, 0.75, 0.6], [72.8, 0.35, 0.35], [72.84, 0.7, 0.7], [72.88, 0.9, 1],
  [72.92, 1, 1], [72.96, 0.95, 0.95], [73.0, 0.9, 0.8]];
// scissors in flight: [t, pivot x, pivot y, ang, open, L] — pivot and blade angle from a rotated-template search
// of the pivot (score 0.8–0.9, 72.00–72.76); blade length measured on a 3.2× crop at 72.44 (113 px); 72.80–73.00
// (the swing to vertical) read by eye
const SC_FLY = [[71.98, 368, 814, Math.PI + 0.72, 0.2, 118], [72.0, 376, 808, Math.PI + 0.64, 0.19, 116], [72.04, 392, 759, Math.PI + 0.58, 0.18, 115],
  [72.08, 406, 709, Math.PI + 0.53, 0.17, 115], [72.12, 414, 658, Math.PI + 0.47, 0.17, 115], [72.16, 412, 610, Math.PI + 0.39, 0.17, 114], [72.2, 405, 569, Math.PI + 0.34, 0.17, 114],
  [72.24, 386, 537, Math.PI + 0.31, 0.17, 114], [72.28, 362, 502, Math.PI + 0.28, 0.17, 114], [72.32, 324, 465, Math.PI + 0.29, 0.17, 114], [72.36, 301, 436, Math.PI + 0.3, 0.17, 114],
  [72.4, 272, 405, Math.PI + 0.34, 0.17, 113], [72.44, 245, 371, Math.PI + 0.39, 0.16, 113], [72.48, 225, 331, Math.PI + 0.4, 0.16, 113], [72.52, 217, 283, Math.PI + 0.45, 0.16, 113],
  [72.56, 209, 237, Math.PI + 0.53, 0.16, 113], [72.6, 209, 183, Math.PI + 0.58, 0.16, 112], [72.64, 210, 137, Math.PI + 0.62, 0.16, 112], [72.68, 214, 100, Math.PI + 0.62, 0.15, 112],
  [72.72, 219, 78, Math.PI + 0.6, 0.15, 111], [72.76, 222, 60, Math.PI + 0.62, 0.14, 110], [72.8, 230, 62, Math.PI + 0.9, 0.13, 108], [72.84, 250, 68, Math.PI + 1.2, 0.12, 106],
  [72.88, 276, 70, Math.PI + 1.45, 0.1, 104], [72.92, 296, 68, 1.5 * Math.PI, 0.1, 102], [72.96, 300, 72, 1.5 * Math.PI + 0.05, 0.1, 102], [73.0, 302, 100, 1.5 * Math.PI + 0.22, 0.12, 104]];
// C) on the top edge: the head centre = the near headphone cup + (20.5, 4) (template-tracked cup, 73.08–74.48; the
// cup holds y = 81 while it walks) [t, x, y]
const TOP_CENTRE = [[73.0, 247, 74], [73.08, 252, 90], [73.16, 252, 89], [73.2, 256.5, 86], [73.24, 264.5, 84], [73.28, 271.5, 84], [73.32, 276.5, 84], [73.36, 279.5, 85],
  [73.56, 282.5, 85], [73.6, 287.5, 85], [73.68, 296.5, 85], [73.76, 305.5, 85], [73.84, 315.5, 85], [73.92, 327.5, 85], [73.96, 327.5, 85], [74.0, 332.5, 85],
  [74.08, 343.5, 85], [74.16, 352.5, 85], [74.24, 363.5, 85], [74.32, 375.5, 85], [74.4, 388.5, 85], [74.48, 400.5, 85], [74.52, 406, 85]];
// (old head track, kept for the scissors keys below, which are relative to it)
const TOP_HEAD = [[73.0, 240, 76], [73.08, 248, 90], [73.2, 258, 92], [73.28, 275, 91], [73.36, 281, 89], [73.52, 283, 88], [73.72, 304, 88], [73.92, 332, 89], [74.2, 360, 92], [74.48, 406, 95], [74.52, 412, 95]];
// scissors on the top edge: [t, pivot x, pivot y, ang, L]
const SC_TOP = [[73.0, 302, 100, -1.35, 104], [73.04, 318, 99, -1.1, 104],
  // 73.08–73.32: pivot and blade angle from a rotated-template search (score 0.77–0.97)
  [73.08, 333, 94, -0.95, 103], [73.12, 335, 92, -0.9, 102], [73.16, 342, 95, -0.75, 101], [73.2, 351, 100, -0.5, 100], [73.24, 357, 118, -0.25, 97],
  [73.28, 361, 135, 0.05, 95], [73.32, 361, 147, 0.25, 95],
  // from 73.36: the pivot screw template-tracked frame by frame
  [73.36, 360, 151, 0.3, 95], [73.52, 358, 155, 0.3, 95], [73.6, 362, 156, 0.3, 95], [73.68, 374, 154, 0.33, 96], [73.8, 390, 151, 0.33, 97], [73.92, 406, 152, 0.34, 98],
  [74.0, 409, 153, 0.35, 100], [74.12, 422, 156, 0.33, 98], [74.2, 437, 153, 0.3, 97], [74.32, 456, 151, 0.28, 96], [74.44, 474, 153, 0.28, 96], [74.52, 478, 155, 0.28, 96]];

// ---------------------------------------------------------------- legs
// Walking on the floor: each foot is planted (fixed in the frame) for 64 % of a 0.33 s cycle, then swings forward
// with the toes lifted ~12 px (source 69.96–70.40: a planted foot runs from +6 to −45 px of the head x).
const GROUND = 883, STEP = 0.33, STANCE = 0.636, WALK_T0 = 69.97;
function walkFoot(t, k) {
  const ph = (((t - WALK_T0) / STEP + k * 0.5) % 1 + 1) % 1;
  if (ph < STANCE) return { dx: 6 - 246 * ph * STEP, lift: 0 };
  const u = (ph - STANCE) / (1 - STANCE);
  return { dx: -45.7 + 51.7 * smooth(u), lift: Math.sin(Math.PI * u) };
}

// feet on the header's top edge (frame x; lift 0..1), read frame by frame 73.04–74.48: after landing at ~200 / 265
// the owl steps off at 73.54; each foot swings ~0.1–0.2 s and lands ~75 px further on
const TOP_FEET = [
  [[73.0, 200, 0], [73.54, 200, 0], [73.61, 226, 1], [73.68, 252, 0], [74.06, 252, 0], [74.16, 292, 1], [74.26, 330, 0], [74.52, 330, 0]],
  [[73.0, 265, 0], [73.72, 265, 0], [73.81, 292, 1], [73.9, 318, 0], [74.22, 320, 0], [74.32, 358, 1], [74.42, 395, 0], [74.52, 395, 0]],
];

function owlState(t) {
  if (t < 71.98) {
    // A) walking in, stopping, looking up, crouching
    const walking = t < 70.845;
    const T = walking ? WALK_HEAD(t) : interp(HOLD_HEAD, t);
    const s = 0.30;
    const hx = T[0] + 3, hy = T[1] - 1.5;
    const lookUp = smooth((t - 70.96) / 0.12) * (1 - smooth((t - 71.66) / 0.1));
    const crouch = smooth((t - 71.66) / 0.2);
    let pose = mixPose(WALK, LOOK, lookUp);
    pose = mixPose(pose, CROUCH, crouch);
    const [dx, dy, a, open, L] = interp(SC_WALK, t);
    const sc = { x: T[0] + dx, y: T[1] + dy, ang: Math.PI + a, L, open, cut: 0 };
    // feet (frame px): planted-foot walk, then both feet set down side by side
    const hips = [[-85, 238], [-30, 245]];
    const feet = [0, 1].map((k) => {
      let fx, fy, lift = 0;
      if (walking) { const w = walkFoot(t, k); fx = T[0] + w.dx; fy = GROUND - 12 * w.lift; lift = w.lift; }
      else {
        const w = walkFoot(70.845, k), x0 = WALK_HEAD(70.845)[0] + w.dx;
        const target = 364 + (k ? -8 : 10), u = smooth((t - 70.845) / 0.12);
        fx = lerp(x0, target, u); fy = GROUND - 12 * Math.max(w.lift, 0) * (1 - u) - (k === 0 ? 10 * Math.sin(Math.PI * u) : 0);
        lift = w.lift * (1 - u);
      }
      return { hip: hips[k], foot: [(fx - hx) / s, (fy - hy) / s], lift, far: k === 1 };
    });
    pose = { ...pose, legs: feet.map((f) => ({ ...f, toe: 36, w: 16, thigh: 40 })) };
    return { pose, x: hx, y: hy, s, sc };
  }
  if (t < 73.02) {
    // B) take-off and flight up the left side
    const T = spline(FLY_HEAD, t);
    const s = lerp(0.3, 0.33, smooth((t - 72.0) / 0.9));
    const [hx, hy] = spline(FLY_CENTRE, t);
    const takeoff = smooth((t - 71.98) / 0.1);
    let pose = mixPose(over(CROUCH, { grip: null }), FLY, takeoff);
    // the head bobs toward profile at 72.84 (the cup slides to the middle of the head), then back
    const yaw = 0.9 + 0.35 * Math.sin(Math.PI * clamp((t - 72.78) / 0.14));
    pose = { ...pose, head: { ...pose.head, yaw }, wings: wingsAt(...interp(WING_KEYS, t)), phones: { ...pose.phones, lit: smooth((t - 72.84) / 0.08) } };
    const [px, py, a, open, L] = interp(SC_FLY, t);
    const sc = { x: px, y: py, ang: a, L, open, cut: 0 };
    const land = smooth((t - 72.84) / 0.14), ground = 1 - smooth((t - 71.99) / 0.07);
    const legs = [0, 1].map((k) => {
      const planted = [((364 + (k ? -8 : 10)) - hx) / s, (GROUND - hy) / s];
      const dangle = [lerp(k ? 20 : -90, k ? 65 : -120, land), lerp(lerp(385, 330, smooth((t - 72.3) / 0.3)), 350, land)];
      return { hip: [k ? -25 : -75, 245], foot: V.mix(dangle, planted, ground), toe: 34, w: 16, thigh: 40, lift: 0, curl: (1 - land) * (1 - ground), far: k === 1 };
    });
    pose.legs = legs;
    return { pose, x: hx, y: hy, s, sc };
  }
  // C) landed on the header's top edge; the scissors come down onto the line; it walks right, cutting
  const H0 = interp(TOP_CENTRE, t), H = [H0[0] - 3, H0[1]];
  const s = 0.34;
  const walking = t > 73.52;
  const settle = smooth((t - 73.02) / 0.3);
  let pose = mixPose(over(FLY, { grip: TOP.grip }), TOP, settle);
  pose = { ...pose, wings: [] };
  const [px, py, a, L] = interp(SC_TOP, t);
  const open = t > 73.5 ? 0.05 + 0.12 * (0.5 + 0.5 * Math.cos((2 * Math.PI * (t - 73.5)) / 0.24)) : lerp(0.1, 0.25, smooth((t - 73.1) / 0.15));
  // cutting, the rings sit closer to the pivot (≈ 38 px at 74.0) and read rounder than while carried
  const sc = { x: px, y: py, ang: a, L, open, cut: smooth((t - 73.1) / 0.26) };
  const legs = [0, 1].map((k) => {
    const [fx, lift] = interp(TOP_FEET[k], t);
    return { hip: [k ? -60 : -175, 235], foot: [(fx - H[0]) / s, (184 - 8 * lift - H[1]) / s], toe: 40, w: 17, thigh: 44, lift: lift * 0.6, far: k === 1 };
  });
  pose.legs = legs;
  return { pose, x: H[0], y: H[1], s, sc };
}

// ---------------------------------------------------------------- the dashed cut line along the header's top edge
// capsules 15 × 5 px every 20.67 px from x 192, centred on y 186 (measured 73.56–74.48); they appear from 73.56, whole,
// up to ~42 px behind the lower blade's tip
function drawDashes(g, t, sc) {
  if (t < 73.555) return;
  const tipX = sc.x + Math.cos(sc.ang) * sc.L;
  const front = tipX - 42;
  g.save();
  g.fillStyle = "#e9e9e4";
  for (let i = 0; ; i++) {
    const x0 = 192 + i * 20.67;
    if (x0 > front) break;
    g.beginPath(); g.roundRect(x0, 183.0, 14.5, 5, 2.5); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- the owl sprite (owl + scissors, one per frame)
let owlCanvas = null;
function buildOwl(st) {
  if (!owlCanvas) owlCanvas = document.createElement("canvas");
  let pose = st.pose;
  const wings = [...(pose.wings || [])];
  if (pose.grip) {
    // the near wing reaches forward and wraps its primaries round the scissors' grip
    const g = pose.grip;
    const rcs = ringCentres(st.sc);
    const gp = g.aim === "upper" ? rcs[0] : g.aim === "lower" ? rcs[1] : gripPoint(st.sc);
    // the outermost primary's tip lands on the aim point (+ off): pull the hand back by the feather length
    const aim = V.add([(gp[0] - st.x) / st.s, (gp[1] - st.y) / st.s], g.off || [0, 0]);
    const hand = V.nrm(V.sub(aim, g.S)), reach = g.len * (0.84 + (g.tipX ?? 0.25));
    const T = V.sub(aim, V.mul(hand, reach * 0.92));
    const Wr = V.add(V.mix(g.S, T, 0.55), [0, 6]);
    wings.push({ ...g, layer: "front", Wr, T });
  }
  pose = { ...pose, wings };
  return owlSprite(pose, { x: st.x, y: st.y, s: st.s, res: 2, canvas: owlCanvas, extent: scissorsBox(st.sc), mid: (g) => drawScissors(g, st.sc) });
}
let OWL_BRIGHT = 1;
// up in the top-left corner (72.7–73.0) the source's owl stays as bright as below (p50 ≈ 195) while the grade's
// vignette would darken ours by ~10 %; lift it back there (multiplicative, so the dark accents stay dark)
const blitOwl = (g, B) => {
  if (OWL_BRIGHT !== 1) g.filter = `brightness(${OWL_BRIGHT.toFixed(3)})`;
  g.drawImage(B.canvas, B.x, B.y, B.w, B.h);
  if (OWL_BRIGHT !== 1) g.filter = "none";
};

// ---------------------------------------------------------------- the owl's own light in the margins
// The source lights the room around the owl even where it stands outside the screen (the top margin at 72.6–74.5 is
// brighter around it than drawFramedPage's screen glow gives). Same recipe as sites.js addScreenGlow (8× shrink,
// blurred at 1/8 scale, ×4.5, capped at 120, added outside the screen through a σ10 mask), fed with only the owl's
// pixels outside the screen, and drawn UNDER the owl's outside copy.
let OG = null;
function blurGrey(src, w, h, sigma) {
  const n = 3, wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
  const wu = wl + 2, m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  let cur = Float32Array.from(src), tmp = new Float32Array(w * h);
  const box = (inp, out, r, horiz) => {
    const len = horiz ? w : h, lines = horiz ? h : w, stride = horiz ? 1 : w, k = 1 / (2 * r + 1);
    for (let l = 0; l < lines; l++) {
      const base = horiz ? l * w : l;
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += inp[base + Math.min(len - 1, Math.max(0, i)) * stride];
      for (let i = 0; i < len; i++) {
        out[base + i * stride] = acc * k;
        acc += inp[base + Math.min(len - 1, i + r + 1) * stride] - inp[base + Math.max(0, i - r) * stride];
      }
    }
  };
  for (let i = 0; i < n; i++) { const r = ((i < m ? wl : wu) - 1) / 2; box(cur, tmp, r, true); box(tmp, cur, r, false); }
  return cur;
}
function owlGlow(ctx, paint, gain, mixNear = 0.3) {
  const W = ctx.canvas.width, H = ctx.canvas.height, sw = Math.round(W / 8), sh = Math.round(H / 8);
  const S = FRAMED.screen, G = FRAMED.glowRect;
  if (!OG) {
    const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
    OG = { full: mk(W, H), h2: mk(Math.round(W / 2), Math.round(H / 2)), h4: mk(Math.round(W / 4), Math.round(H / 4)), small: mk(sw, sh), up: mk(W, H), mask: mk(W, H) };
    const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
    const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
    const fx = new Float32Array(W), fy = new Float32Array(H);
    for (let x = 0; x < W; x++) fx[x] = Phi((x + 0.5 - G.x0) / 10) - Phi((x + 0.5 - G.x1) / 10);
    for (let y = 0; y < H; y++) fy[y] = Phi((y + 0.5 - G.y0) / 10) - Phi((y + 0.5 - (G.y1 + 60)) / 10);
    const m = OG.mask.getContext("2d"), id = m.createImageData(W, H), d = id.data;
    for (let y = 0, i = 3; y < H; y++) for (let x = 0; x < W; x++, i += 4) d[i] = Math.round(255 * (1 - fx[x] * fy[y]));
    m.putImageData(id, 0, 0);
  }
  const f = OG.full.getContext("2d");
  f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, W, H);
  f.save(); f.beginPath(); f.rect(0, 0, W, H); f.rect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0); f.clip("evenodd"); paint(f); f.restore();
  const half = (dst, src) => { const g = dst.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, dst.width, dst.height); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "low"; g.drawImage(src, 0, 0, dst.width, dst.height); };
  half(OG.h2, OG.full); half(OG.h4, OG.h2);
  const sg = OG.small.getContext("2d", { willReadFrequently: true });
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, sw, sh); sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = "low"; sg.drawImage(OG.h4, 0, 0, sw, sh);
  const img = sg.getImageData(0, 0, sw, sh), d = img.data, grey = new Float32Array(sw * sh);
  let any = 0;
  for (let i = 0, j = 0; j < grey.length; i += 4, j++) { grey[j] = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * (d[i + 3] / 255); any += grey[j]; }
  if (any < 1) return;
  const a = blurGrey(grey, sw, sh, 7), b = blurGrey(grey, sw, sh, 26);
  for (let i = 0, j = 0; j < grey.length; i += 4, j++) { const v = Math.min(120, (mixNear * a[j] + (1 - mixNear) * b[j]) * 4.5 * gain); d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  sg.putImageData(img, 0, 0);
  const u = OG.up.getContext("2d");
  u.setTransform(1, 0, 0, 1, 0, 0); u.globalCompositeOperation = "copy"; u.imageSmoothingEnabled = true; u.imageSmoothingQuality = "low";
  u.drawImage(OG.small, 0, 0, W, H);
  u.globalCompositeOperation = "destination-in"; u.drawImage(OG.mask, 0, 0); u.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(OG.up, 0, 0); ctx.restore();
}

// the screen's border line and the left rivet (drawFramedPage's, drawn here so the owl can pass in front of them)
function drawBorder(ctx) {
  const S = FRAMED.screen;
  ctx.save();
  ctx.strokeStyle = "rgba(62,64,62,0.62)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(S.x0, S.y1 + 2); ctx.lineTo(S.x0, S.y0); ctx.lineTo(S.x1, S.y0); ctx.lineTo(S.x1, S.y1 + 2); ctx.stroke();
  ctx.restore();
}
function drawRivet(g) { g.fillStyle = "rgba(200,202,200,0.8)"; g.beginPath(); g.arc(147.5, 154.5, 3.3, 0, Math.PI * 2); g.fill(); }

// A static lift of the top-left and left margins. Through the whole shot the source's margins there are 4–9/255
// brighter than drawFramedPage's screen light gives (measured 70.4, 72.0, 72.6, 73.4, 74.2 at y 15/60/110 and
// x 30/100; the rest of the margins are within ±3). Pre-grade amounts: ~15 at x 400–650 along the top, falling to
// ~2 by x 1400 and toward the screen edge; ~6 down the left margin (fitted: residual within ±3 at 70.4–74.2 away
// from the owl). Only outside the screen (σ10 mask).
let LIFT = null;
function marginLift(W, H) {
  if (LIFT) return LIFT;
  const S = FRAMED.glowRect;
  const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
  LIFT = document.createElement("canvas"); LIFT.width = W; LIFT.height = H;
  const g = LIFT.getContext("2d"), id = g.createImageData(W, H), d = id.data;
  for (let y = 0; y < H; y++) {
    const inY = Phi((y + 0.5 - S.y0) / 10) - Phi((y + 0.5 - (S.y1 + 60)) / 10);
    const vTop = Math.max(0, Math.min(1, 1 - (y - 15) / 140));
    for (let x = 0; x < W; x++) {
      const inX = Phi((x + 0.5 - S.x0) / 10) - Phi((x + 0.5 - S.x1) / 10);
      const out = 1 - inX * inY;
      if (out < 0.004) continue;
      const top = 10 * Math.exp(-((x - 500) ** 2) / (2 * 330 * 330)) * vTop;
      const left = 6 * Math.max(0, 1 - Math.max(0, x - 30) / 115);
      const v = Math.min(255, (top + left) * out), i = (y * W + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = Math.round(v); d[i + 3] = 255;
    }
  }
  g.putImageData(id, 0, 0);
  return LIFT;
}

const GLOW = 1;
const OWL_GLOW = 0.4;
export const shot = {
  draw(ctx, local, t0) {
    // the owl moves on the source's 25 fps frames: between frames it holds the next one (the film renders at 25 fps,
    // so this only matters for off-grid previews, which then pair with the same source frame compare.sh shows)
    const t = Math.ceil(t0 * 25 - 1e-6) / 25;
    const page = sokoPageCanvas({ gaze: "down" });
    const st = owlState(t);
    const B = buildOwl(st);
    OWL_BRIGHT = 1 + 0.1 * smooth((t - 72.6) / 0.1) - 0.03 * smooth((t - 73.02) / 0.3);
    drawFramedPage(ctx, page, { glow: GLOW, border: false, over: (g) => { drawRivet(g); drawDashes(g, t, st.sc); blitOwl(g, B); } });
    drawBorder(ctx);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(marginLift(ctx.canvas.width, ctx.canvas.height), 0, 0); ctx.restore();
    // the extra light only where the owl is up at the top margin (the source shows none round it in the left margin)
    // (weaker while the spread wings are up in the corner, 72.7–72.95: there the source's halo is ~10 levels dimmer)
    const og = OWL_GLOW * smooth((600 - st.y) / 250) * (1 - 0.65 * smooth((t - 72.66) / 0.06) * (1 - smooth((t - 72.95) / 0.12)));
    if (og > 0.01) owlGlow(ctx, (g) => blitOwl(g, B), og);
    // the parts of the owl outside the screen (the frame's left margin, the top margin), over the border line and
    // the room light: clipped to everything but the screen shrunk by 2 px, so the border hairline is covered too
    const S = FRAMED.screen;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.rect(S.x0 + 2, S.y0 + 2, S.x1 - S.x0 - 4, S.y1 - S.y0 - 2); ctx.clip("evenodd");
    blitOwl(ctx, B);
    ctx.restore();
  },
  release() { owlCanvas = null; OG = null; LIFT = null; releaseSoko(); },
};
