// s21 (69.44–74.52): the sōko page, shrunk onto the lit screen in the dark room. The owl walks in from the
// frame's left edge along the floor of the page carrying a huge pair of scissors over its shoulder, stops, looks up,
// crouches, flies up the left side of the page, lands on the header's top edge (under the rail) and starts cutting:
// a dashed line appears along the header's top edge behind the blades. Camera locked (camtrack s = 1.0000).
// All positions below are frame px measured on the source (template tracking of the head, body-mask centroids,
// gridded zooms); see fidelity/s21.md.
import { drawFramedPage, sokoPageCanvas, FRAMED, releaseSoko } from "../lib/sites.js";
import { owlLayer, owlPose, mergePose, gv, LINE, V } from "../lib/owlInk.js";
import { lerp, smooth } from "../lib/rng.js";

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

// ---------------------------------------------------------------- scissors (frame px)
// Pivot at (x, y); blades point along `ang`; L = blade length (pivot → tip); open = angle between the blades.
function scissorsHalf(g, x, y, ang, L, open, k, ringK) {
  const a = ang + k * open / 2;
  const c = Math.cos(a), s = Math.sin(a);
  const P = (u, v) => [x + c * u - s * v, y + s * u + c * v];
  const w0 = 0.07 * L, inner = -k;
  const blade = [P(-0.03 * L, -inner * w0 * 0.9), P(0.3 * L, -inner * w0 * 1.0), P(0.62 * L, -inner * w0 * 0.78), P(0.88 * L, -inner * w0 * 0.34), P(L, inner * w0 * 0.05),
    P(0.8 * L, inner * w0 * 0.3), P(0.45 * L, inner * w0 * 0.62), P(0.08 * L, inner * w0 * 0.85), P(-0.03 * L, inner * w0 * 0.85)];
  const hw = 0.034 * L;
  const shank = [P(0.02 * L, -hw), P(-0.36 * L, -hw - k * 0.03 * L), P(-0.38 * L, hw - k * 0.03 * L), P(0.02 * L, hw)];
  const rc = P(-0.53 * L * ringK, -k * 0.075 * L);
  const rx = 0.17 * L * ringK, ry = 0.1 * L * ringK, rw = Math.max(1.6, 0.04 * L);
  g.lineJoin = "round";
  g.save();
  g.translate(rc[0], rc[1]); g.rotate(a + k * 0.1);
  g.lineWidth = rw + 2.2; g.strokeStyle = LINE; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = rw; g.strokeStyle = gv(0.8); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = Math.max(0.6, rw * 0.3); g.strokeStyle = gv(0.96, 0.9); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
  g.restore();
  const poly = (pts, fill) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = 1.0; g.strokeStyle = gv(0.12, 0.85); g.stroke(); };
  poly(shank, gv(0.78));
  poly(blade, gv(0.88));
  g.lineWidth = Math.max(0.7, 0.012 * L); g.strokeStyle = gv(0.97, 0.9);
  g.beginPath(); const h0 = P(0.05 * L, -inner * w0 * 0.5), h1 = P(0.7 * L, -inner * w0 * 0.42), h2 = P(0.92 * L, -inner * w0 * 0.06); g.moveTo(h0[0], h0[1]); g.quadraticCurveTo(h1[0], h1[1], h2[0], h2[1]); g.stroke();
  g.lineWidth = Math.max(0.6, 0.008 * L); g.strokeStyle = gv(0.42, 0.8);
  g.beginPath(); const e0 = P(0.12 * L, inner * w0 * 0.42), e1 = P(0.85 * L, inner * w0 * 0.1); g.moveTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.stroke();
}
function drawScissors(g, { x, y, ang, L, open = 0.1, top = 1, ring = 1 }) {
  g.save();
  scissorsHalf(g, x, y, ang, L, open, -top, ring);
  scissorsHalf(g, x, y, ang, L, open, top, ring);
  const r = Math.max(1.5, 0.028 * L);
  g.fillStyle = gv(0.88); g.strokeStyle = LINE; g.lineWidth = 1;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = gv(0.3); g.beginPath(); g.arc(x, y, r * 0.4, 0, Math.PI * 2); g.fill();
  g.restore();
}
// where the handles are held (between the rings), frame px
function gripPoint(sc) { return [sc.x - Math.cos(sc.ang) * sc.L * 0.5 * (sc.ring ?? 1), sc.y - Math.sin(sc.ang) * sc.L * 0.5 * (sc.ring ?? 1)]; }

// the wing tip closed round the handles (frame px): short feathers pointing along dir
function drawHand(g, p, dir, size) {
  const d = V.nrm(dir);
  g.save();
  g.lineJoin = "round";
  for (let k = -1; k <= 1; k++) {
    const dd = V.rot(d, k * 0.38), nn = V.perp(dd);
    const b = V.add(p, V.mul(V.perp(d), k * size * 0.2));
    const L = size * (1 - Math.abs(k) * 0.2);
    const tip = V.add(b, V.mul(dd, L));
    const m1 = V.add(V.add(b, V.mul(dd, L * 0.55)), V.mul(nn, -size * 0.2)), m2 = V.add(V.add(b, V.mul(dd, L * 0.55)), V.mul(nn, size * 0.2));
    const b1 = V.add(b, V.mul(nn, -size * 0.18)), b2 = V.add(b, V.mul(nn, size * 0.18));
    g.beginPath(); g.moveTo(b1[0], b1[1]); g.quadraticCurveTo(m1[0], m1[1], tip[0], tip[1]); g.quadraticCurveTo(m2[0], m2[1], b2[0], b2[1]); g.closePath();
    g.fillStyle = gv(0.9); g.fill(); g.lineWidth = 0.9; g.strokeStyle = LINE; g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- owl poses (owl units; head ry = 100)
// The owl stays near profile (head yaw ≈ 1: one eye, the near headphone cup on the back of the head) all through
// the shot. Its size grows as in the source: s = 0.28 walking, 0.30 flying, 0.35 on the top edge.
const PROFILE = owlPose("walk", {
  light: [-0.6, -0.8],
  head: { x: 36, y: -161, rx: 96, ry: 100, yaw: 1.05, pitch: 0, roll: 0.12, square: 2.0, jowl: 0.08 },
  tufts: [{ at: -0.42, size: 30, width: 0.24, lean: -0.3, second: 0.35, curl: 0.12 }],
  body: { x: 0, y: 4, a: 150, b: 126, rot: 2.5, egg: 0.1, sag: 0.08 },
  tail: { base: [-120, 50], tip: [-236, 89], w: 30, n: 2 },
  // the near wing reaches forward to the scissors' handles (its tip is aimed at the grip every frame)
  wings: [{ type: "folded", layer: "front", S: [-10, -60], T: [190, -20], width: 85, back: 26, dir: 1, grip: true }],
  feet: [],
  eyes: { state: "angry", r: 24, spread: 0.6, el: -0.05, look: [0.6, 0.25], over: { side: -1, lid: 0.3, slant: 0.9, brow: 1.3, pupil: 0.8 } },
  beak: { el: -0.3, lift: 1.3, w: 30, l: 46 },
  bandage: { az: -0.35, el: 0.9, size: 46, rot: -0.3 },
  headphones: { on: false },
  flow: [0.3, 1],
});
const WALK = PROFILE;
// B) flying: the body hangs under the head, wings spread, legs dangling
const FLY = mergePose(PROFILE, {
  head: { x: 62, y: -200 },
  body: { x: -5, y: 5, a: 165, b: 112, rot: 2.45, egg: 0.12 },
  tail: { base: [-60, 90], tip: [-125, 180], w: 26, n: 2 },
  wings: [],
});
// wing shapes for the flap (far wing = viewer-left, near wing = viewer-right), root-relative units; blended
// DOWN (0) → LEVEL (0.35) → UP (1)
const W_UP = [
  { type: "spread", layer: "back", S: [-20, -80], Wr: [-150, -240], T: [-290, -380], trail: [0.6, 0.8], len: 140, spread: 1, n: 7, m: 5 },
  { type: "spread", layer: "back", S: [50, -85], Wr: [150, -230], T: [270, -340], trail: [-0.4, 0.9], len: 115, spread: 1, n: 6, m: 4 },
];
const W_LEVEL = [
  { type: "spread", layer: "back", S: [-20, -70], Wr: [-200, -80], T: [-440, -40], trail: [0.3, 0.95], len: 145, spread: 1, n: 7, m: 5 },
  { type: "spread", layer: "back", S: [50, -70], Wr: [200, -90], T: [350, -80], trail: [-0.2, 0.98], len: 115, spread: 1, n: 6, m: 4 },
];
const W_DOWN = [
  { type: "spread", layer: "back", S: [-20, -60], Wr: [-200, 0], T: [-430, 110], trail: [0.5, 0.86], len: 140, spread: 1, n: 7, m: 5 },
  { type: "spread", layer: "back", S: [50, -60], Wr: [180, 0], T: [310, 90], trail: [-0.45, 0.9], len: 110, spread: 1, n: 6, m: 4 },
];
function wingsAt(u) {
  const [A, B, k] = u < 0.35 ? [W_DOWN, W_LEVEL, u / 0.35] : [W_LEVEL, W_UP, (u - 0.35) / 0.65];
  const m2 = (p, q) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
  return A.map((w, i) => ({ ...w, S: m2(w.S, B[i].S), Wr: m2(w.Wr, B[i].Wr), T: m2(w.T, B[i].T), trail: m2(w.trail, B[i].trail), len: lerp(w.len, B[i].len, k) }));
}
// C) on the header's top edge: bigger, squatter, head pushed forward over the scissors
const TOP = mergePose(PROFILE, {
  head: { x: 91, y: -143, yaw: 1.0 },
  body: { x: -5, y: -5, a: 178, b: 112, rot: 2.72, egg: 0.16 },
  tail: { base: [-130, 25], tip: [-245, 28], w: 36, n: 3 },
  wings: [{ type: "folded", layer: "front", S: [20, -55], T: [190, 10], width: 100, back: 30, dir: 1, grip: true }],
  eyes: { look: [0.8, 0.6] },
});

// ---------------------------------------------------------------- headphones, drawn over the head (owl units)
// The source's cup reads as a dark cushion ring round a grey plate (no halftone at this size), the band a thin dark
// arc from the cup over the crown.
function myPhones(g, geo, o = {}) {
  const H = geo.H, yaw = H.yaw;
  const c = H.P(-Math.PI / 2 + (o.cupAz ?? 0.08), o.cupEl ?? -0.08, 1.0);
  const r = (o.r ?? 0.36) * H.ry;
  // band: from the cup top over the crown toward the far ear
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24, az = -Math.PI / 2 + u * Math.PI, el = 0.25 + Math.sin(Math.PI * u) * (o.bandEl ?? 1.05);
    const q = H.P(az, el, o.bandLift ?? 1.07);
    if (q.nz > -0.35 || u < 0.3) pts.push([q.x, q.y]);
  }
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = LINE; g.lineWidth = r * 0.3; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  g.strokeStyle = gv(0.45); g.lineWidth = r * 0.14; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
  // cup: dark cushion ring, grey plate, pale metal rim highlight
  g.fillStyle = LINE; g.beginPath(); g.ellipse(c.x, c.y, r * 1.02, r * 1.08, H.roll, 0, Math.PI * 2); g.fill();
  g.fillStyle = gv(0.46); g.beginPath(); g.ellipse(c.x + r * 0.08, c.y, r * 0.78, r * 0.86, H.roll, 0, Math.PI * 2); g.fill();
  g.fillStyle = gv(0.6); g.beginPath(); g.ellipse(c.x + r * 0.12, c.y + r * 0.05, r * 0.5, r * 0.56, H.roll, 0, Math.PI * 2); g.fill();
  g.strokeStyle = gv(0.8, 0.9); g.lineWidth = r * 0.1; g.beginPath(); g.ellipse(c.x + r * 0.08, c.y, r * 0.86, r * 0.93, H.roll, Math.PI * 1.1, Math.PI * 1.75); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- legs (frame px), drawn under the body
function drawLeg(g, hip, foot, w, toe, facing = 1, curl = 0) {
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  const knee = [lerp(hip[0], foot[0], 0.5) + facing * w * 0.25, lerp(hip[1], foot[1], 0.5)];
  const stroke = (pts, lw, col) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); g.stroke(); };
  stroke([hip, knee, foot], w + 2, LINE);
  stroke([hip, knee, foot], w, gv(0.86));
  // toes: three forward, one back; curl > 0 hangs them down (flight)
  const toes = [[-0.35, 1], [0, 1.1], [0.35, 0.9], [Math.PI - 0.5, 0.55]];
  for (const [a0, k] of toes) {
    const a = (facing > 0 ? a0 : Math.PI - a0) + curl * facing;
    const e = [foot[0] + Math.cos(a) * toe * k, foot[1] + Math.sin(a) * toe * k * 0.45 + curl * toe * 0.5];
    const m = [lerp(foot[0], e[0], 0.5), lerp(foot[1], e[1], 0.5) - toe * 0.1];
    stroke([foot, m, e], w * 0.7 + 1.6, LINE);
    stroke([foot, m, e], w * 0.7, gv(0.88));
  }
  g.restore();
}

// ---------------------------------------------------------------- measured motion
// A) walk: the head moves at 246 px/s (template track 69.56–70.84, head centre (205, 790) at 70.20), bobbing 2.5 px
// once per step (0.165 s)
const WALK_HEAD = (t) => [205 + 246 * (Math.min(t, 70.845) - 70.2), 790 + 2.5 * Math.cos((2 * Math.PI * (t - 69.64)) / 0.165)];
// hold / look up / crouch (head centre): [t, x, y]
const HOLD_HEAD = [[70.845, 364, 790], [70.92, 366, 787], [71.04, 365, 783], [71.64, 365, 783], [71.72, 377, 790], [71.8, 388, 796], [71.98, 390, 795]];
// scissors while walking/holding: [t, dx, dy (pivot − head), ang − π, open, L]
const SC_WALK = [[69.44, -10, 18, 0.46, 0.17, 113], [70.8, -10, 18, 0.44, 0.17, 115], [70.92, -11, 19, 0.37, 0.18, 117], [71.04, -11, 20, 0.3, 0.2, 118], [71.64, -11, 20, 0.3, 0.2, 118],
  [71.76, -22, 18, 0.67, 0.2, 120], [71.98, -22, 18, 0.67, 0.2, 120]];
// B) flight: head centre (template track + the head-centre offset checked on 4x grids at 72.16 / 72.40)
const FLY_HEAD = [
  [71.98, 390, 795], [72.0, 395, 790], [72.04, 415, 729], [72.08, 426, 679], [72.12, 433, 632], [72.16, 427, 587], [72.2, 417, 547], [72.24, 399, 516],
  [72.28, 370, 479], [72.32, 336, 443], [72.36, 308, 411], [72.4, 282, 381], [72.44, 260, 344], [72.48, 238, 306], [72.52, 233, 253],
  [72.56, 230, 213], [72.6, 236, 153], [72.64, 230, 96], [72.68, 235, 63], [72.72, 237, 52], [72.76, 240, 44], [72.8, 237, 48], [72.84, 240, 50], [72.92, 240, 64], [73.0, 240, 76], [73.04, 244, 84],
];
// wing position per source frame (1 = up in a V, 0.35 = level, 0 = down), read frame by frame 72.00–73.00
const WING_KEYS = [[71.98, 0.9], [72.0, 1], [72.04, 0.3], [72.08, 0.35], [72.12, 1], [72.16, 0.4], [72.2, 0.2], [72.24, 0.35], [72.28, 0.35], [72.32, 1], [72.36, 0.3],
  [72.4, 0.35], [72.44, 1], [72.48, 0.2], [72.52, 0.3], [72.56, 1], [72.6, 0.35], [72.64, 0.3], [72.68, 0.45], [72.72, 1], [72.76, 0.8], [72.8, 0.35], [72.84, 0.9],
  [72.88, 1], [72.92, 1], [72.96, 0.9], [73.0, 0.8]];
// scissors in flight: [t, dx, dy (pivot − head), ang, open, L]
const SC_FLY = [[71.98, -22, 18, Math.PI + 0.67, 0.2, 120], [72.04, -18, 22, Math.PI + 0.55, 0.18, 125], [72.16, -12, 25, Math.PI + 0.45, 0.16, 130], [72.4, -8, 28, Math.PI + 0.4, 0.16, 135],
  [72.6, -8, 28, Math.PI + 0.5, 0.16, 125], [72.76, -6, 35, Math.PI + 0.55, 0.14, 115], [72.84, 10, 20, Math.PI + 1.2, 0.12, 105], [72.92, 52, 12, 1.5 * Math.PI, 0.1, 100], [73.0, 60, 30, 1.5 * Math.PI + 0.25, 0.14, 105]];
// C) on the top edge: head centre (from the near headphone cup, 2.2–4× grids) [t, x, y]
const TOP_HEAD = [[73.0, 240, 76], [73.08, 248, 90], [73.2, 258, 92], [73.28, 275, 91], [73.36, 281, 89], [73.52, 283, 88], [73.72, 304, 88], [73.92, 332, 89], [74.2, 360, 92], [74.48, 406, 95], [74.52, 412, 95]];
// scissors on the top edge: [t, pivot x, pivot y, ang, L]
const SC_TOP = [[73.0, 300, 106, -1.32, 105], [73.08, 328, 112, -1.05, 110], [73.2, 345, 112, -0.45, 100], [73.28, 378, 136, -0.03, 90], [73.36, 356, 150, 0.22, 95], [73.52, 360, 154, 0.28, 95],
  [73.72, 390, 158, 0.33, 91], [73.92, 417, 156, 0.33, 88], [74.2, 454, 156, 0.26, 86], [74.48, 489, 160, 0.28, 90], [74.52, 494, 160, 0.28, 90]];

function owlState(t) {
  if (t < 71.98) {
    // A) walking in, stopping, looking up, crouching
    const walking = t < 70.845;
    const H = walking ? WALK_HEAD(t) : interp(HOLD_HEAD, t);
    const s = 0.28;
    const lookUp = smooth((t - 70.96) / 0.12) * (1 - smooth((t - 71.66) / 0.1));
    const crouch = smooth((t - 71.66) / 0.14);
    const pose = mergePose(WALK, {
      head: { pitch: 0.15 * lookUp - 0.05 * crouch, roll: 0.12 - 0.2 * lookUp + 0.08 * crouch },
      eyes: { look: [lerp(0.9, 0.4, lookUp), lerp(0.1, -0.95, lookUp)], state: lookUp > 0.5 ? "stare" : "angry" },
      body: { rot: 2.5 - 0.35 * lookUp - 0.1 * crouch },
    });
    const [dx, dy, a, open, L] = interp(SC_WALK, t);
    const sc = { x: H[0] + dx, y: H[1] + dy, ang: Math.PI + a, L, open, top: 1, ring: 0.95 };
    const x = H[0] - WALK.head.x * s, y = H[1] - WALK.head.y * s;
    // legs: steps alternate every 0.165 s while walking
    const ph = (2 * Math.PI * (t - 69.64)) / 0.33, st = walking ? 1 : 0;
    const legs = [0, 1].map((k) => {
      const sw = Math.sin(ph + k * Math.PI) * st;
      const hip = [x + (k ? 6 : -10) * s * 3.2, y + 95 * s];
      const foot = [x + ((k ? 22 : -26) + 30 * sw) * s * 3.2 * 0.5 + (k ? 8 : -8), y + 170 * s - Math.max(0, Math.cos(ph + k * Math.PI)) * 4 * st];
      return { hip, foot };
    });
    return { pose, x, y, s, sc, handSize: 11, legs, legW: 5, toe: 8 };
  }
  if (t < 73.02) {
    // B) take-off and flight up the left side
    const H = spline(FLY_HEAD, t);
    const s = lerp(0.3, 0.33, smooth((t - 72.6) / 0.4));
    const wings = wingsAt(interp(WING_KEYS, t)[0]);
    // before landing it turns toward us (72.84–73.00: the cup moves to the middle of the head), then back to profile
    const yaw = 1.05 - 0.45 * smooth((t - 72.8) / 0.08);
    const pose = mergePose(FLY, { wings, head: { yaw } });
    const [dx, dy, a, open, L] = interp(SC_FLY, t);
    const sc = { x: H[0] + dx, y: H[1] + dy, ang: a, L, open, top: 1, ring: 0.95 };
    const x = H[0] - FLY.head.x * s, y = H[1] - FLY.head.y * s;
    const land = smooth((t - 72.84) / 0.12);
    const legs = [0, 1].map((k) => {
      const hip = [x + (k ? 12 : -28) * s, y + 85 * s];
      const foot = [hip[0] - 32 * s * (1 - land) + land * (k ? 30 : -30) * s, hip[1] + lerp(72, 95, land) * s];
      return { hip, foot };
    });
    return { pose, x, y, s, sc, handSize: 0, legs, legW: 5, toe: 7, curl: 1 - land };
  }
  // C) landed on the header's top edge; the scissors come down onto the line; it walks right, cutting
  const H = interp(TOP_HEAD, t);
  const s = 0.35;
  const walking = t > 73.52;
  const lean = smooth((t - 73.1) / 0.25);
  const head = { x: lerp(40, 91, lean), y: lerp(-170, -143, lean), yaw: lerp(0.6, 1.0, smooth((t - 73.0) / 0.12)), roll: lerp(0.05, 0.3, lean) };
  const pose = mergePose(TOP, { head });
  const x = H[0] - head.x * s, y = H[1] - head.y * s;
  const [px, py, a, L] = interp(SC_TOP, t);
  const open = t > 73.5 ? 0.05 + 0.12 * (0.5 + 0.5 * Math.cos((2 * Math.PI * (t - 73.5)) / 0.24)) : lerp(0.1, 0.25, smooth((t - 73.1) / 0.15));
  const sc = { x: px, y: py, ang: a, L, open, top: 1, ring: 0.9 };
  const ph = (2 * Math.PI * (t - 73.52)) / 0.34;
  const legs = [0, 1].map((k) => {
    const sw = walking ? Math.sin(ph + k * Math.PI) : 0;
    const hip = [x + (k ? 40 : -50) * s, y + 70 * s];
    const foot = [x + ((k ? 60 : -94) + 30 * sw) * s, 184 - (walking ? Math.max(0, Math.cos(ph + k * Math.PI)) * 3 : 0)];
    return { hip, foot };
  });
  return { pose, x, y, s, sc, handSize: 12, legs, legW: 6, toe: 9 };
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

let owlCanvas = null;
// build the owl layer once per frame (it is drawn up to three times: inside the screen, outside it, into the glow)
function buildOwl(st) {
  if (!owlCanvas) owlCanvas = document.createElement("canvas");
  const gp = gripPoint(st.sc);
  let pose = st.pose, hand = null;
  // aim the near wing's tip at the scissors' grip
  if (pose.wings && pose.wings.some((w) => w.grip)) {
    const T = [(gp[0] - st.x) / st.s, (gp[1] - st.y) / st.s];
    pose = { ...pose, wings: pose.wings.map((w) => {
      if (!w.grip) return w;
      hand = V.nrm(V.sub(T, w.S));
      return { ...w, T };
    }) };
  }
  const L = owlLayer({ ...pose, x: st.x, y: st.y, s: st.s, res: 2, detail: 0.6, canvas: owlCanvas, tone: false, extra: (gg, geo) => myPhones(gg, geo) });
  return { L, gp, hand };
}
function paintOwl(g, st, B) {
  for (const l of st.legs || []) drawLeg(g, l.hip, l.foot, st.legW, st.toe, 1, st.curl || 0);
  g.drawImage(B.L.canvas, B.L.x, B.L.y, B.L.w, B.L.h);
  drawScissors(g, st.sc);
  if (B.hand && st.handSize) drawHand(g, V.sub(B.gp, V.mul(B.hand, st.handSize * 0.5)), B.hand, st.handSize);
}

// ---------------------------------------------------------------- the owl's own light in the margins
// The source lights the room around the owl even where it stands outside the screen (the top margin at 72.6–74.5 is
// +25–35 brighter around it than drawFramedPage's screen glow gives). Same recipe as sites.js addScreenGlow
// (8× shrink, 0.6·σ7 + 0.4·σ26 at 1/8 scale, ×4.5, capped at 120, added outside the screen through a σ10 mask),
// fed with only the owl's pixels outside the screen.
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
function owlGlow(ctx, paint, gain) {
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
  for (let i = 0, j = 0; j < grey.length; i += 4, j++) { const v = Math.min(120, (0.6 * a[j] + 0.4 * b[j]) * 4.5 * gain); d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  sg.putImageData(img, 0, 0);
  const u = OG.up.getContext("2d");
  u.setTransform(1, 0, 0, 1, 0, 0); u.globalCompositeOperation = "copy"; u.imageSmoothingEnabled = true; u.imageSmoothingQuality = "low";
  u.drawImage(OG.small, 0, 0, W, H);
  u.globalCompositeOperation = "destination-in"; u.drawImage(OG.mask, 0, 0); u.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(OG.up, 0, 0); ctx.restore();
}

const GLOW = 1;
const OWL_GLOW = 0.55;
export const shot = {
  draw(ctx, local, t) {
    const page = sokoPageCanvas({ gaze: "down" });
    const st = owlState(t);
    const B = buildOwl(st);
    drawFramedPage(ctx, page, { glow: GLOW, over: (g) => { drawDashes(g, t, st.sc); paintOwl(g, st, B); } });
    // the parts of the owl outside the screen (the frame's left margin, the top margin) — drawn over the room light
    const S = FRAMED.screen;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.rect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0); ctx.clip("evenodd");
    paintOwl(ctx, st, B);
    ctx.restore();
    // the extra light only where the owl is up at the top margin (the source shows none round it in the left margin)
    const og = OWL_GLOW * smooth((600 - st.y) / 250);
    if (og > 0.01) owlGlow(ctx, (g) => paintOwl(g, st, B), og);
  },
  release() { owlCanvas = null; OG = null; releaseSoko(); },
};
