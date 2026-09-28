// s25 chaos phase (100.48–103.08): the owl zips round the cracked page leaving echo copies, smoke, white slash
// ellipses and a storm of paper chips; the wipe that opens the shot; the negative flash frame; the burst before it
// lands; the landing dust. Everything in frame px, measured on the source (see fidelity/s25.md for the numbers).
import { owlLayer, owlPose, LINE, gv } from "../../lib/owlInk.js";
import { rng, clamp, lerp, smooth } from "../../lib/rng.js";
import { drawScissors } from "./scissors.js";

const TAU = Math.PI * 2;
const W = 2206, H = 946;

// ---------------------------------------------------------------- keyframe helpers
export function track(keys, t) {
  // keys: [[t, ...values]] linear
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0; while (keys[i + 1][0] < t) i++;
  const a = keys[i], b = keys[i + 1], u = (t - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, k) => (typeof v === "number" ? v + (b[k + 1] - v) * u : v));
}

// ---------------------------------------------------------------- owl sprites (kit poses, cached)
// Flying owls in the chaos: kit poses built once each and blitted with a transform.
const SPR_POSES = {
  // diving to screen right, head turned to us, wings swept back and up, scissors thrust forward in both wings
  dash: () => owlPose("fly", {
    head: { yaw: 0.22, roll: 0.12 },
    headphones: { yaw: 0.22 },
    eyes: { state: "angry", look: [0.4, 0.15] },
    beak: { open: 0.3 },
    body: { a: 112, b: 96, rot: Math.PI / 2 - 0.5 },
    wings: [
      { type: "spread", layer: "back", S: [-70, -50], Wr: [-210, -170], T: [-380, -250], trail: [0.55, 0.85], len: 95, spread: 1, n: 8 },
      { type: "spread", layer: "back", S: [60, -20], Wr: [-60, 70], T: [-260, 120], trail: [0.2, 1], len: 80, spread: 0.8, n: 7 },
    ],
    feet: [{ x: -60, y: 96, rot: 1.0, size: 14, mode: "dangle", seed: 2 }, { x: -20, y: 106, rot: 0.8, size: 14, mode: "dangle", seed: 5 }],
  }),
  // arms up in a V, scissors high in its right wing (101.52–101.84)
  vsign: () => owlPose("carry", {
    eyes: { state: "smug", look: [0.1, 0] },
    head: { pitch: 0, yaw: 0.05 },
    beak: { smirk: 1 },
    wings: [
      { type: "spread", layer: "back", S: [-80, -40], Wr: [-190, -120], T: [-250, -230], trail: [-0.8, 0.5], len: 60, spread: 0.7 },
      { type: "spread", layer: "back", S: [80, -40], Wr: [190, -120], T: [250, -230], trail: [0.8, 0.5], len: 60, spread: 0.7 },
    ],
  }),
  // hovering, wings up behind, scowling, scissors in both wings (101.92–102.64)
  hover: () => owlPose("startled", {
    eyes: { state: "angry", look: [-0.3, 0.2] },
    head: { yaw: -0.18, roll: -0.08 },
    headphones: { yaw: -0.18 },
    beak: { open: 0.15 },
    wings: [
      { type: "spread", layer: "back", S: [-80, -40], Wr: [-190, -150], T: [-250, -270], trail: [-0.2, 1], len: 70, spread: 0.8 },
      { type: "spread", layer: "back", S: [80, -40], Wr: [190, -150], T: [250, -270], trail: [0.2, 1], len: 70, spread: 0.8 },
    ],
    feet: [{ x: -34, y: 110, rot: 0.1, size: 15, mode: "dangle", seed: 2 }, { x: 34, y: 110, rot: -0.1, size: 15, mode: "dangle", seed: 5 }],
  }),
};
SPR_POSES.spread = () => owlPose("fly", {
  eyes: { state: "angry", look: [0.1, 0.1] }, beak: { open: 0.2 },
  wings: [
    { type: "spread", layer: "back", S: [-78, -46], Wr: [-230, -90], T: [-420, -60], trail: [0.15, 1], len: 95, spread: 1, n: 8 },
    { type: "spread", layer: "back", S: [78, -46], Wr: [230, -90], T: [420, -60], trail: [-0.15, 1], len: 95, spread: 1, n: 8 },
  ],
});
const SPR_SCISSORS = {
  dash: [{ x: 280, y: 10, ang: 0.45, L: 200, open: 0.45 }, { x: 250, y: 150, ang: 0.2, L: 210, open: 0.3 }],
  vsign: [{ x: 250, y: -250, ang: -1.45, L: 150, open: 0.55 }],
  hover: [{ x: -220, y: 60, ang: 2.5, L: 190, open: 0.3 }, { x: 230, y: -260, ang: -1.2, L: 170, open: 0.4 }],
  spread: [{ x: 300, y: 40, ang: 0.3, L: 200, open: 0.4 }],
};
let SPR = null;
export function sprite(key) {
  if (!SPR) SPR = new Map();
  if (!SPR.has(key)) {
    // the owl at s = 1 (1 px per owl unit), root at the canvas point (ox, oy); scissors drawn on top in owl units
    const L = owlLayer({ ...SPR_POSES[key](), x: 0, y: 0, s: 1, tone: false, detail: 0.8 });
    const pad = 280;
    const c = document.createElement("canvas"); c.width = Math.ceil(L.w + pad * 2); c.height = Math.ceil(L.h + pad * 2);
    const g = c.getContext("2d");
    const ox = pad - L.x, oy = pad - L.y;
    g.drawImage(L.canvas, pad, pad);
    g.save(); g.translate(ox, oy);
    for (const cc of SPR_SCISSORS[key]) drawScissors(g, { ...cc, lw: 3.4 });
    g.restore();
    SPR.set(key, { canvas: c, ox, oy });
  }
  return SPR.get(key);
}
// a softened copy of a sprite, built once at 1/4 resolution (blur in sprite px ≈ 4·b)
let SOFT = null;
function softSprite(key) {
  if (!SOFT) SOFT = new Map();
  if (!SOFT.has(key)) {
    const S = sprite(key), k = 4;
    const c = document.createElement("canvas"); c.width = Math.ceil(S.canvas.width / k); c.height = Math.ceil(S.canvas.height / k);
    const g = c.getContext("2d");
    g.filter = "blur(2px)"; g.drawImage(S.canvas, 0, 0, c.width, c.height); g.filter = "none";
    SOFT.set(key, { canvas: c, ox: S.ox / k, oy: S.oy / k, k });
  }
  return SOFT.get(key);
}
// a motion-streaked copy (1/4 resolution): the sprite smeared along angle `ang` (sprite coords) by ±len sprite px
let STREAK = null;
function streakSprite(key, ang, len) {
  if (!STREAK) STREAK = new Map();
  const id = key + ang + ":" + len;
  if (!STREAK.has(id)) {
    const S = sprite(key), k = 4, pad = Math.ceil(len / k) + 4;
    const c = document.createElement("canvas"); c.width = Math.ceil(S.canvas.width / k) + pad * 2; c.height = Math.ceil(S.canvas.height / k) + pad * 2;
    const g = c.getContext("2d");
    g.filter = "blur(1.5px)";
    const n = 14, dx = Math.cos(ang) * len / k, dy = Math.sin(ang) * len / k;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1) - 0.5;
      g.globalAlpha = 0.16;
      g.drawImage(S.canvas, pad + f * 2 * dx, pad + f * 2 * dy, S.canvas.width / k, S.canvas.height / k);
    }
    g.filter = "none"; g.globalAlpha = 1;
    STREAK.set(id, { canvas: c, ox: S.ox / k + pad, oy: S.oy / k + pad, k });
  }
  return STREAK.get(id);
}
export function drawStreak(g, key, { x, y, s, rot = 0, ang = 0, len = 120, alpha = 1 }) {
  const S = streakSprite(key, ang, len), k = S.k;
  g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.rotate(rot); g.scale(s * k, s * k);
  g.drawImage(S.canvas, -S.ox, -S.oy); g.restore();
}
// draw a sprite with its root at (x, y), scale s (frame px per owl unit), rotation, mirror, alpha; soft: use the
// pre-blurred copy (motion-blurred echoes and the burst) — no per-frame canvas filters (they cost seconds)
export function drawSprite(g, key, { x, y, s, rot = 0, flip = false, alpha = 1, soft = false }) {
  const S = soft ? softSprite(key) : sprite(key);
  const k = soft ? S.k : 1;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y); g.rotate(rot); g.scale((flip ? -s : s) * k, s * k);
  g.drawImage(S.canvas, -S.ox, -S.oy);
  g.restore();
}
export function releaseSprites() { SPR = null; SOFT = null; STREAK = null; PUFF = null; }

// ---------------------------------------------------------------- the main owl's path (measured blob centroids)
// [t, x, y, s, rot, pose, flip]
export const OWL_A = [
  // dash 100.48–101.48: root placed so the sprite's head sits on the source head (template track, scale, tilt)
  [100.48, 521, 283, 0.89, -0.12, "dash", 0], [100.52, 521, 283, 0.89, -0.12, "dash", 0], [100.56, 521, 283, 0.89, -0.12, "dash", 0],
  [100.60, 521, 283, 0.89, -0.12, "dash", 0], [100.64, 615, 377, 0.89, -0.12, "dash", 0], [100.68, 678, 444, 0.89, -0.12, "dash", 0],
  [100.72, 721, 486, 0.89, -0.12, "dash", 0], [100.76, 750, 516, 0.89, -0.12, "dash", 0], [100.80, 770, 536, 0.89, -0.12, "dash", 0],
  [100.84, 783, 549, 0.89, -0.12, "dash", 0], [100.88, 790, 556, 0.89, -0.12, "dash", 0], [100.92, 863, 593, 0.89, -0.12, "dash", 0],
  [100.96, 951, 637, 0.89, -0.12, "dash", 0], [101.00, 1047, 682, 0.89, -0.12, "dash", 0], [101.04, 1047, 682, 0.89, -0.12, "dash", 0],
  [101.08, 1170, 712, 0.80, -0.29, "dash", 0], [101.12, 1270, 754, 0.80, -0.29, "dash", 0], [101.16, 1371, 788, 0.80, -0.29, "dash", 0],
  [101.20, 1468, 820, 0.80, -0.29, "dash", 0], [101.24, 1583, 836, 0.80, -0.47, "dash", 0], [101.28, 1664, 845, 0.71, -0.47, "dash", 0],
  [101.32, 1728, 851, 0.71, -0.47, "dash", 0], [101.36, 1761, 855, 0.71, -0.47, "dash", 0], [101.40, 1775, 856, 0.71, -0.47, "dash", 0],
  [101.44, 1778, 855, 0.71, -0.47, "dash", 0], [101.48, 1790, 842, 0.71, -0.47, "dash", 0],
  [101.52, 1860, 745, 0.58, 0, "vsign", 0], [101.56, 1902, 750, 0.58, 0, "vsign", 0], [101.60, 1905, 752, 0.58, 0, "vsign", 0],
  [101.64, 1895, 758, 0.58, 0, "vsign", 0], [101.68, 1870, 767, 0.58, 0, "vsign", 0], [101.72, 1862, 769, 0.58, 0, "vsign", 0],
  [101.76, 1866, 774, 0.58, 0, "vsign", 0], [101.80, 1852, 770, 0.58, 0, "vsign", 0],
  [101.84, 1631, 742, 0.72, -0.35, "dash", 1], [101.88, 1363, 553, 0.72, -0.45, "dash", 1], [101.92, 1294, 440, 0.66, -0.3, "hover", 0],
  [101.96, 1205, 398, 0.66, -0.2, "hover", 0], [102.00, 1151, 398, 0.66, -0.12, "hover", 0], [102.04, 1150, 398, 0.66, -0.12, "hover", 0],
  [102.08, 1093, 420, 0.66, -0.06, "hover", 0], [102.12, 1014, 442, 0.66, 0, "hover", 0], [102.16, 1014, 497, 0.66, 0.05, "hover", 0],
  [102.20, 1022, 562, 0.66, 0.08, "hover", 0], [102.24, 1075, 641, 0.66, 0.1, "hover", 0], [102.28, 1138, 693, 0.66, 0.1, "hover", 0],
  [102.32, 1189, 699, 0.66, 0.08, "hover", 0], [102.36, 1072, 525, 0.66, 0.02, "hover", 0], [102.40, 1038, 491, 0.66, 0, "hover", 0],
  [102.48, 1022, 464, 0.66, -0.03, "hover", 0], [102.60, 1013, 454, 0.66, 0, "hover", 0],
];
function keyAt(keys, t) {
  let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= t + 1e-6) i++;
  return i;
}
function owlA(t) {
  const i = keyAt(OWL_A, t), k = OWL_A[i], n = OWL_A[Math.min(OWL_A.length - 1, i + 1)];
  // positions are per frame (the source animates on ones here); interpolate only within a pose
  const u = n[0] > k[0] && n[5] === k[5] ? clamp((t - k[0]) / (n[0] - k[0])) : 0;
  return { x: lerp(k[1], n[1], u), y: lerp(k[2], n[2], u), s: lerp(k[3], n[3], u), rot: lerp(k[4], n[4], u), pose: k[5], flip: !!k[6] };
}

// echo owls: semi-transparent copies that trail or dart round the page. [t0, t1, keys [t,x,y,s,rot], pose, flip, alpha]
const ECHOES = [
  { t0: 100.72, t1: 101.46, pose: "dash", flip: 1, a: 0.5, keys: [[100.72, 1880, 215, 0.46, -0.1], [101.0, 1770, 233, 0.46, -0.08], [101.44, 1703, 254, 0.46, -0.05]] },
  { t0: 100.66, t1: 101.34, pose: "dash", flip: 0, a: 0.55, keys: [[100.66, 236, 466, 0.5, 0.5], [100.84, 220, 600, 0.5, 0.35], [101.08, 110, 745, 0.48, 0.1], [101.32, 200, 760, 0.48, 0.05]] },
  { t0: 102.38, t1: 102.74, pose: "dash", flip: 0, a: 0.55, keys: [[102.38, 540, 225, 0.46, 0.2], [102.56, 457, 240, 0.46, 0.2], [102.6, 430, 236, 0.46, 0.25], [102.64, 566, 309, 0.5, 0.3], [102.68, 784, 345, 0.52, 0.35], [102.72, 918, 447, 0.55, 0.3]] },
  { t0: 102.38, t1: 102.74, pose: "dash", flip: 1, a: 0.55, keys: [[102.38, 1900, 205, 0.46, -0.2], [102.56, 1773, 280, 0.46, -0.25], [102.6, 1620, 369, 0.48, -0.3], [102.64, 1454, 433, 0.5, -0.3], [102.72, 1268, 529, 0.52, -0.3]] },
  { t0: 102.42, t1: 102.7, pose: "dash", flip: 1, a: 0.5, keys: [[102.42, 1740, 600, 0.44, -0.1], [102.56, 1824, 665, 0.44, -0.1], [102.64, 1647, 633, 0.46, -0.2], [102.7, 1400, 560, 0.5, -0.2]] },
  { t0: 102.42, t1: 102.7, pose: "dash", flip: 0, a: 0.5, keys: [[102.42, 98, 793, 0.44, 0.1], [102.5, 107, 736, 0.44, 0.1], [102.6, 492, 726, 0.46, -0.1], [102.66, 657, 641, 0.48, -0.2], [102.7, 800, 580, 0.5, -0.2]] },
];

// ---------------------------------------------------------------- smoke (soft white puffs along the paths)
let PUFF = null;
function puff() {
  if (PUFF) return PUFF;
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(196,196,194,0.85)"); gr.addColorStop(0.45, "rgba(170,170,168,0.42)"); gr.addColorStop(1, "rgba(150,150,150,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  PUFF = c; return c;
}
function smokeTrail(g, pathAt, t, t0, t1, { n = 14, span = 0.35, r0 = 40, r1 = 110, a = 0.55, seed = 1 } = {}) {
  // soft grey smoke left along the flight path: puffs stretched along the direction of travel
  const P = puff(), r = rng(seed);
  for (let i = 0; i < n; i++) {
    const age = (i / n) * span, tt = t - age;
    const jx = (r() - 0.5) * 40, jy = (r() - 0.5) * 40, kr = 0.8 + 0.4 * r(), ka = 0.6 + 0.4 * r();
    if (tt < t0 || tt > t1) continue;
    const p = pathAt(tt), q = pathAt(tt - 0.04);
    if (!p) continue;
    const f = age / span, rad = lerp(r0, r1, f) * kr;
    const ang = q ? Math.atan2(p.y - q.y, p.x - q.x) : 0, sp = q ? Math.min(3, 1 + Math.hypot(p.x - q.x, p.y - q.y) / 60) : 1;
    g.save();
    g.globalAlpha = a * (1 - f) * ka;
    g.translate(p.x + jx, p.y + jy); g.rotate(ang); g.scale(sp, 1 / Math.sqrt(sp));
    g.drawImage(P, -rad, -rad, rad * 2, rad * 2);
    g.restore();
  }
}

// ---------------------------------------------------------------- slash ellipses
// ellipse: centre, semi-axes (a along `ang`, b across), frame radians. Visible arcs are keyed by the frame points
// where they start and end (measured), converted to ellipse parameter angles.
const ELL = {
  E1: { cx: 777, cy: 440, a: 652, b: 350, ang: 0.248 },
  E2: { cx: 1503, cy: 552, a: 353, b: 193, ang: -0.515 },
  E3: { cx: 1097, cy: 427, a: 940, b: 364, ang: -0.004 },
  E3b: { cx: 1080, cy: 420, a: 850, b: 300, ang: -0.02 },
};
const par = (E, x, y) => { const dx = x - E.cx, dy = y - E.cy, c = Math.cos(-E.ang), s = Math.sin(-E.ang); return Math.atan2((dx * s + dy * c) / E.b, (dx * c - dy * s) / E.a); };
const ptE = (E, p) => { const c = Math.cos(E.ang), s = Math.sin(E.ang), u = Math.cos(p) * E.a, v = Math.sin(p) * E.b; return [E.cx + u * c - v * s, E.cy + u * s + v * c]; };
// arcs: [name, [t, from(x,y), to(x,y), dir(+1 ccw param), alpha]]
const ARCS = [
  ["E1", [[100.62, [330, 105], [300, 110], 1, 0], [100.66, [330, 105], [160, 250], 1, 0.8], [100.72, [330, 105], [350, 630], 1, 0.85], [100.84, [330, 105], [1000, 815], 1, 0.9],
    [101.0, [150, 300], [1100, 812], 1, 0.9], [101.08, [160, 400], [1150, 800], 1, 0.85], [101.2, [400, 650], [1150, 800], 1, 0.6], [101.3, [800, 790], [1150, 800], 1, 0]]],
  ["E2", [[100.76, [1180, 720], [1190, 690], -1, 0], [100.8, [1180, 720], [1500, 330], -1, 0.8], [100.84, [1180, 720], [1900, 330], -1, 0.9], [101.0, [1250, 780], [1800, 320], -1, 0.9],
    [101.08, [1300, 790], [1760, 330], -1, 0.85], [101.2, [1200, 650], [1760, 330], -1, 0.6], [101.3, [1500, 330], [1760, 330], -1, 0]]],
  ["E3", [[102.14, [700, 95], [720, 93], 1, 0], [102.18, [600, 110], [1600, 110], 1, 0.8], [102.24, [300, 250], [1900, 230], 1, 0.9], [102.32, [250, 600], [2030, 400], 1, 0.95],
    [102.44, [900, 790], [1700, 690], 1, 0.95], [102.64, [1000, 795], [1500, 760], 1, 0.9], [102.72, [1000, 795], [1500, 760], 1, 0]]],
  ["E3b", [[102.3, [300, 330], [320, 320], 1, 0], [102.36, [230, 380], [700, 150], 1, 0.6], [102.48, [220, 420], [800, 135], 1, 0.7], [102.64, [220, 420], [800, 135], 1, 0.6], [102.7, [220, 420], [800, 135], 1, 0]]],
];
function drawArc(g, E, p0, p1, alpha) {
  if (alpha <= 0.01) return;
  // param range from p0 going the short way that passes... use the measured order: sweep from p0 to p1 the long way
  // round when needed (the keys are chosen so the sweep follows the flight direction).
  let a0 = p0, a1 = p1;
  const n = 90, pts = [];
  // go from a0 toward a1 in the direction that matches the ellipse's drawn side (keys pick ccw/cw by `dir`)
  let d = a1 - a0;
  if (d < 0) d += TAU;
  for (let i = 0; i <= n; i++) pts.push(ptE(E, a0 + d * i / n));
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  // soft glow then a bright core, tapering at both ends
  for (const [w, col, al] of [[16, "rgba(210,210,208,1)", 0.18], [7, "rgba(236,236,232,1)", 0.85]]) {
    g.globalAlpha = alpha * al; g.strokeStyle = col;
    for (let i = 0; i < n; i++) {
      const u = i / n, taper = Math.min(1, Math.sin(Math.PI * u) * 3);
      g.lineWidth = w * (0.25 + 0.75 * taper);
      g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i + 1][0], pts[i + 1][1]); g.stroke();
    }
  }
  g.restore();
}
function arcs(g, t) {
  for (const [name, keys] of ARCS) {
    if (t < keys[0][0] || t > keys[keys.length - 1][0]) continue;
    const E = ELL[name];
    let i = 0; while (i < keys.length - 2 && keys[i + 1][0] <= t) i++;
    const a = keys[i], b = keys[i + 1], u = clamp((t - a[0]) / (b[0] - a[0]));
    const dir = a[3];
    // endpoints as param angles (unwrapped along dir)
    const pa0 = par(E, ...a[1]), pa1 = par(E, ...a[2]), pb0 = par(E, ...b[1]), pb1 = par(E, ...b[2]);
    const span = (p, q) => { let d = (q - p) * dir; while (d < 0) d += TAU; return d; };
    const s0 = lerp(0, span(pa0, pb0) > Math.PI ? span(pa0, pb0) - TAU : span(pa0, pb0), u);
    const start = pa0 + dir * s0;
    const lenA = span(pa0, pa1), lenB = span(pb0, pb1);
    const len = lerp(lenA, lenB, u);
    const alpha = lerp(a[4], b[4], u);
    if (dir > 0) drawArc(g, E, start, start + len, alpha);
    else drawArc(g, E, start - len, start, alpha);
  }
}

// ---------------------------------------------------------------- paper chips
// white rectangles with dark outlines, thrown out of the action; they tumble and drift outward.
const CHIPS = (() => {
  const r = rng(77), out = [];
  for (let i = 0; i < 230; i++) {
    const tb = 100.62 + r() * 2.36;
    // spawn near where the main owl is at birth
    out.push({ tb, life: 0.5 + r() * 0.9, ox: (r() - 0.5) * 420, oy: (r() - 0.5) * 340, vx: (r() - 0.5) * 1900, vy: (r() - 0.62) * 1400,
      w: 8 + r() * 10, h: 14 + r() * 14, rot: r() * TAU, spin: (r() - 0.5) * 14, flip: (r() - 0.5) * 18, v: 0.86 + r() * 0.12 });
  }
  // a second population that exists everywhere in the frame from 100.66 (the air is full of chips)
  for (let i = 0; i < 90; i++) {
    const tb = 100.64 + r() * 2.3;
    out.push({ tb, life: 0.6 + r() * 1.0, fx: r() * W, fy: r() * H, vx: (r() - 0.5) * 500, vy: (r() - 0.5) * 400,
      w: 8 + r() * 9, h: 13 + r() * 12, rot: r() * TAU, spin: (r() - 0.5) * 10, flip: (r() - 0.5) * 14, v: 0.84 + r() * 0.12 });
  }
  return out;
})();
export function chips(g, t) {
  for (const c of CHIPS) {
    const age = t - c.tb;
    if (age < 0 || age > c.life || t > 103.3) continue;
    let x, y;
    if (c.fx !== undefined) { x = c.fx + c.vx * age; y = c.fy + c.vy * age; }
    else { const o = owlA(c.tb); x = o.x + c.ox + c.vx * age * (1 - 0.35 * age); y = o.y + c.oy + c.vy * age * (1 - 0.35 * age) + 160 * age * age; }
    const fade = Math.min(1, (c.life - age) / 0.15) * Math.min(1, age / 0.04);
    g.save();
    g.globalAlpha = fade;
    g.translate(x, y); g.rotate(c.rot + c.spin * age); g.scale(Math.max(0.15, Math.abs(Math.cos(c.flip * age + c.rot))), 1);
    g.fillStyle = gv(c.v); g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    g.strokeStyle = gv(0.12, 0.9); g.lineWidth = 1.6; g.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);
    g.restore();
  }
}

// ---------------------------------------------------------------- the opening wipe and the s24 remnant
// White band sweeping down-right (measured: upper edge y = Y0 − 0.4275·x, Y0 = 884 at 100.48, +476 px per frame;
// 122 px thick). Returns the band's upper-edge offset at t.
export const bandY0 = (t) => 884 + (t - 100.48) * 25 * 476;
export const BAND_SLOPE = -0.4275, BAND_W = 122;
export function bandPath(g, y0, y1) { g.moveTo(-10, y0 + BAND_SLOPE * -10); g.lineTo(W + 10, y0 + BAND_SLOPE * (W + 10)); g.lineTo(W + 10, y1 + BAND_SLOPE * (W + 10)); g.lineTo(-10, y1 + BAND_SLOPE * -10); g.closePath(); }
// the tail of s24 below the band: speed lines on black and the charging owl with its scissors
export function s24Remnant(g, t) {
  g.fillStyle = "#050505"; g.fillRect(0, 0, W, H);
  const r = rng(24), ang = 0.52, dx = Math.cos(ang), dy = Math.sin(ang);
  g.lineCap = "round";
  for (let i = 0; i < 170; i++) {
    const x = r() * (W + 800) - 600, y = r() * (H + 400) - 300, L = 80 + r() * 380, w = 2 + r() * 6;
    const sh = ((t - 100.4) * 2600) % 900;
    const gr = g.createLinearGradient(x, y, x + dx * L, y + dy * L);
    gr.addColorStop(0, "rgba(230,230,228,0)"); gr.addColorStop(0.7, `rgba(235,235,232,${0.5 + r() * 0.5})`); gr.addColorStop(1, "rgba(240,240,238,0.9)");
    g.strokeStyle = gr; g.lineWidth = w;
    g.beginPath(); g.moveTo(x + dx * sh * 0.1, y + dy * sh * 0.1); g.lineTo(x + dx * (L + sh * 0.1), y + dy * (L + sh * 0.1)); g.stroke();
  }
  drawSprite(g, "dash", { x: 1180, y: 660, s: 1.3, rot: 0.1 });
}

// ---------------------------------------------------------------- the burst before landing (102.64–103.04)
function burst(g, t) {
  // measured frame by frame: 102.64 a vertical grey smear rises above the hovering owl while the echoes close in;
  // 102.68 five owls overlap at the centre; 102.72–102.88 one huge owl, wings spread on a diagonal (lower left →
  // upper right, ~2.3× the hover size) smeared by motion streaks, centre ≈ (1000, 400); 102.92–102.96 it dissolves
  // into a grey cloud at the top centre; 103.00 the owl pops out clean (drawn by the standing code).
  if (t < 102.7) {
    for (let k = 5; k >= 1; k--) drawSprite(g, "hover", { x: 1030, y: 454 - k * 60, s: 0.66 + 0.06 * k, alpha: 0.18, soft: true });
    drawStreak(g, "hover", { x: 1040, y: 290, s: 0.66, ang: Math.PI / 2, len: 380, alpha: 0.6 });
    drawSprite(g, "hover", { x: 1013, y: 454, s: 0.66 });
    return;
  }
  const u = clamp((t - 102.72) / 0.24);
  const a = t < 102.9 ? 1 : lerp(1, 0.45, (t - 102.9) / 0.08);
  const sc = lerp(1.15, 1.25, u);
  const cx = lerp(1000, 1040, u), cy = lerp(410, 360, u);
  // a faint larger ghost rising above (the grey cloud at the top of the frame in the source)
  for (let k = 3; k >= 1; k--) drawSprite(g, "spread", { x: cx + k * 10, y: cy - k * 60, s: sc * (1 + 0.12 * k), rot: -0.36, alpha: a * 0.14, soft: true });
  drawStreak(g, "spread", { x: cx, y: cy, s: sc, rot: -0.36, ang: 0, len: 60 + 140 * u, alpha: a * 0.7 });
  if (t < 102.92) drawSprite(g, "spread", { x: cx, y: cy, s: sc, rot: -0.36, alpha: 0.55 * a });
}

// ---------------------------------------------------------------- landing dust (103.08–103.7)
export function dust(g, t) {
  // measured: a low smoky band along the page floor, x ≈ 560–1560, y ≈ 800–930, densest round the feet at
  // 103.08–103.3, thinning out by ~103.6
  const u = (t - 103.06) / 0.62;
  if (u < 0 || u > 1) return;
  const P = puff(), r = rng(103);
  for (let i = 0; i < 70; i++) {
    const side = r() < 0.5 ? -1 : 1, d = Math.pow(r(), 0.8);
    const x = 1070 + side * d * 520 * (0.8 + 0.35 * u), y = 905 - r() * 95 * (1 - 0.6 * d) - 25 * u;
    const rad = 26 + 46 * r() + 30 * u;
    g.globalAlpha = 0.75 * (1 - u * u) * (0.4 + 0.6 * r()) * (1 - 0.45 * d);
    g.drawImage(P, x - rad * 1.5, y - rad * 0.8, rad * 3, rad * 1.6);
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- the whole chaos layer at t
export function chaos(g, t) {
  // smoke first (under the owls)
  smokeTrail(g, (tt) => (tt >= 100.48 && tt < 101.5 ? owlA(tt) : null), t, 100.5, 101.5, { n: 44, span: 0.75, r0: 70, r1: 210, a: 0.58, seed: 3 });
  smokeTrail(g, (tt) => (tt >= 101.82 && tt < 102.64 ? owlA(tt) : null), t, 101.82, 102.64, { n: 24, span: 0.4, r0: 50, r1: 140, a: 0.4, seed: 4 });
  for (const e of ECHOES) {
    if (t < e.t0 || t > e.t1) continue;
    smokeTrail(g, (tt) => (tt >= e.t0 ? (([x, y]) => ({ x, y }))(track(e.keys, tt)) : null), t, e.t0, e.t1, { n: 20, span: 0.35, r0: 45, r1: 120, a: 0.42, seed: 9 });
  }
  arcs(g, t);
  for (const e of ECHOES) {
    if (t < e.t0 || t > e.t1) continue;
    const [x, y, s, rot] = track(e.keys, t);
    const fade = Math.min(1, (t - e.t0) / 0.06, (e.t1 - t) / 0.06);
    drawSprite(g, e.pose, { x, y, s, rot, flip: !!e.flip, alpha: e.a * fade });
  }
  if (t < 102.64) {
    const o = owlA(t);
    drawSprite(g, o.pose, { x: o.x, y: o.y, s: o.s, rot: o.rot, flip: o.flip });
  } else if (t < 103.04) burst(g, t);
  chips(g, t);
}
