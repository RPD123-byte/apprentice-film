// s23 owl: the kit's owl (owlInk.js) for head, body, feet and face, with this shot's big feathered fan wings drawn
// here (the source's wings in this segment are long layered primaries, much bigger than the kit's paddle wings).
// All wing geometry is in owl units (root = middle of the body, y down, head vertical radius = 100).
import { owlLayer, owlPose, mergePose, gv, LINE, V, ink } from "../../lib/owlInk.js";
import { lerp, rng } from "../../lib/rng.js";

const TAU = Math.PI * 2;
// one long pointed feather from root along angle a (radians), length L, width w; `bend` curves it sideways
function featherPath(root, a, L, w, bend = 0) {
  const d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
  const P = (u, v) => [root[0] + d[0] * u * L + n[0] * (v * w + bend * L * u * u), root[1] + d[1] * u * L + n[1] * (v * w + bend * L * u * u)];
  return [P(0, -0.35), P(0.35, -0.5), P(0.75, -0.42), P(0.95, -0.14), P(1, 0.02), P(0.93, 0.2), P(0.7, 0.46), P(0.35, 0.5), P(0, 0.35)];
}
function smooth(g, pts) {
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  g.closePath();
}
// wing: { S, W, pa0, pa1 (primary fan angles, first = innermost), pL0, pL1 (lengths), n, sa (secondary angle), sL, m,
//         cover (covert band width), side (-1 viewer-left / +1 viewer-right), seed }
function fanWing(g, w, lw) {
  const r = rng(w.seed ?? 5);
  const n = w.n ?? 7, m = w.m ?? 5;
  const feathers = [];
  // secondaries along the arm (drawn first, behind)
  for (let i = 0; i < m; i++) {
    const f = (i + 0.5) / m;
    const root = [lerp(w.S[0], w.W[0], 0.1 + 0.85 * f), lerp(w.S[1], w.W[1], 0.1 + 0.85 * f)];
    feathers.push({ root, a: w.sa + (r() - 0.5) * 0.12 + (w.sfan ?? 0.25) * (f - 0.5) * (w.side ?? 1), L: w.sL * (0.8 + 0.25 * f) * (0.92 + 0.16 * r()), wd: w.sL * 0.34, bend: 0 });
  }
  // primaries from the hand, innermost first
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 1 : i / (n - 1);
    const root = [w.W[0] + (w.hand?.[0] ?? 0) * f, w.W[1] + (w.hand?.[1] ?? 0) * f];
    feathers.push({ root, a: lerp(w.pa0, w.pa1, f) + (r() - 0.5) * 0.05, L: lerp(w.pL0, w.pL1, Math.pow(f, 0.8)) * (0.94 + 0.12 * r()), wd: lerp(w.pL0, w.pL1, f) * 0.25, bend: (w.bend ?? 0.04) * (w.side ?? 1) });
  }
  g.save();
  g.lineJoin = "round"; g.lineCap = "round";
  for (const f of feathers) {
    const pts = featherPath(f.root, f.a, f.L, f.wd, f.bend);
    g.beginPath(); smooth(g, pts);
    const d = [Math.cos(f.a), Math.sin(f.a)];
    const gr = g.createLinearGradient(f.root[0], f.root[1], f.root[0] + d[0] * f.L, f.root[1] + d[1] * f.L);
    gr.addColorStop(0, gv(0.97)); gr.addColorStop(0.6, gv(0.93)); gr.addColorStop(1, gv(0.84));
    g.fillStyle = gr; g.fill();
    g.strokeStyle = gv(0.28, 0.8); g.lineWidth = lw * 1.0; g.stroke();
    // rachis and a couple of barb lines
    g.strokeStyle = gv(0.45, 0.55); g.lineWidth = lw * 0.6;
    g.beginPath(); g.moveTo(f.root[0] + d[0] * f.L * 0.1, f.root[1] + d[1] * f.L * 0.1); g.lineTo(f.root[0] + d[0] * f.L * 0.85, f.root[1] + d[1] * f.L * 0.85); g.stroke();
  }
  // covert band over the feather roots: a soft rounded shape along S → W with scalloped lower edge
  const cw = w.cover ?? 60;
  const lead = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; lead.push([lerp(w.S[0], w.W[0], u), lerp(w.S[1], w.W[1], u) - Math.sin(Math.PI * u) * (w.arch ?? 12)]); }
  const dn = [Math.cos(w.sa), Math.sin(w.sa)];
  const band = [...lead];
  for (let i = 10; i >= 0; i--) { const u = i / 10, k = cw * (0.65 + 0.35 * Math.sin(Math.PI * u)); band.push([lead[i][0] + dn[0] * k, lead[i][1] + dn[1] * k]); }
  g.beginPath(); smooth(g, band);
  g.fillStyle = gv(0.97); g.fill();
  g.strokeStyle = gv(0.25, 0.8); g.lineWidth = lw * 1.1; g.stroke();
  // scallops (small covert feather tips) across the band
  g.strokeStyle = gv(0.35, 0.6); g.lineWidth = lw * 0.8;
  for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) {
    const u = (i + 0.5 + row * 0.5) / 6.5, p = [lerp(w.S[0], w.W[0], u) + dn[0] * cw * (0.35 + 0.35 * row), lerp(w.S[1], w.W[1], u) + dn[1] * cw * (0.35 + 0.35 * row)];
    g.beginPath(); g.arc(p[0], p[1], cw * 0.2, Math.atan2(dn[1], dn[0]) - 1.2, Math.atan2(dn[1], dn[0]) + 1.2); g.stroke();
  }
  g.restore();
}

// Owl poses for this shot (kit pose + fan wings). Wing angles are radians in owl units (0 = +x, π/2 = down).
const D = Math.PI / 180;
// mirror a viewer-left wing to the viewer-right side
function mirror(w, over = {}) {
  const m = (p) => (p ? [-p[0], p[1]] : p);
  return { ...w, S: m(w.S), W: m(w.W), hand: m(w.hand), pa0: Math.PI - w.pa0, pa1: Math.PI - w.pa1, sa: Math.PI - w.sa, side: -(w.side ?? -1), seed: (w.seed ?? 5) + 1, ...over };
}
// left wing from degrees: primaries fan pa0..pa1 (deg, canvas: 180 = left, 270 = up), secondaries hang at sa
function LW(S, W, pa0, pa1, pL0, pL1, sa, sL, o = {}) {
  return { S, W, pa0: pa0 * D, pa1: pa1 * D, pL0, pL1, sa: sa * D, sL, n: o.n ?? 8, m: o.m ?? 5, hand: o.hand ?? [-30, -10], side: -1, cover: o.cover ?? 55, seed: o.seed ?? 3, bend: o.bend ?? 0.04, front: o.front };
}
// The source's owl in this shot: a compact pear body about as wide as the head, visible legs with big feet, very
// large feathered wings. Head centre at (0, -118) units; feet (ankles) ~ 200 units below the root.
const FEET = [{ x: -36, y: 126, rot: 0.12, size: 22, mode: "stand", leg: 24, seed: 2 }, { x: 38, y: 124, rot: -0.2, size: 22, mode: "stand", leg: 22, seed: 5 }];
const LONG_FEET = [{ x: -36, y: 176, rot: 0.12, size: 22, mode: "stand", leg: 40, seed: 2 }, { x: 40, y: 172, rot: -0.25, size: 22, mode: "stand", leg: 36, seed: 5 }];
const BASE = owlPose("frontStand", {
  head: { yaw: -0.3, roll: -0.04 },
  eyes: { state: "angry", look: [-0.15, 0.1] },
  headphones: { yaw: -0.3 },
  body: { x: 0, y: 36, a: 94, b: 118 },
  feet: FEET,
  beak: { w: 30, l: 40 },
});
const BLAZE = { state: "angry", brow: 1.25, slant: 0.5, lid: 0.3, pupil: 0.06 };
// a feathered wing bent like an arm, drawn over the face (the kit paints front wings under the head)
function armOver(g, S, Wr, T, len) {
  const pts = [S, Wr, T];
  const seg = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16, a = 1 - u;
    const q = u < 0.5 ? [lerp(S[0], Wr[0], u * 2), lerp(S[1], Wr[1], u * 2)] : [lerp(Wr[0], T[0], (u - 0.5) * 2), lerp(Wr[1], T[1], (u - 0.5) * 2)];
    seg.push(q);
  }
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  const path = () => { g.beginPath(); g.moveTo(seg[0][0], seg[0][1]); for (const q of seg.slice(1)) g.lineTo(q[0], q[1]); };
  path(); g.strokeStyle = gv(0.12, 0.9); g.lineWidth = len * 1.55; g.stroke();
  path(); g.strokeStyle = gv(0.94); g.lineWidth = len * 1.4; g.stroke();
  // feather tips at the hand
  const d = [T[0] - Wr[0], T[1] - Wr[1]], L = Math.hypot(d[0], d[1]), ux = d[0] / L, uy = d[1] / L;
  for (let k = -1; k <= 1; k++) {
    const a = Math.atan2(uy, ux) + k * 0.35, b = [T[0] - ux * len * 0.3, T[1] - uy * len * 0.3];
    const fp = featherPath(b, a, len * 1.3, len * 0.8);
    g.beginPath(); smooth(g, fp); g.fillStyle = gv(0.93); g.fill(); g.strokeStyle = gv(0.12, 0.85); g.lineWidth = 2; g.stroke();
  }
  // barb lines along the arm
  g.strokeStyle = gv(0.4, 0.5); g.lineWidth = 1.5;
  for (let i = 2; i < 15; i += 3) { const q = seg[i]; g.beginPath(); g.moveTo(q[0] - uy * len * 0.4, q[1] + ux * len * 0.4); g.lineTo(q[0] + ux * len * 0.3, q[1] + uy * len * 0.3); g.stroke(); }
  g.restore();
}
export const POSE = {
  // carrying a load on its head, wings raised in a V (84–88.3), face turned to our left; one eye squeezed shut
  carry: mergePose(BASE, { body: { y: 56, a: 104, b: 112 }, feet: LONG_FEET, head: { yaw: -0.45 }, headphones: { yaw: -0.45 }, eyes: { state: "angry", look: [-0.3, 0.1], right: { state: "closed" } } }),
  // pressing the banner flat, facing us (88.4–89.6)
  press: mergePose(BASE, { head: { yaw: 0, roll: 0 }, headphones: { yaw: 0 }, eyes: { state: "angry", look: [0, 0.1] } }),
  hop: mergePose(BASE, { head: { yaw: -0.1, roll: 0 }, headphones: { yaw: -0.1 }, eyes: { state: "angry", look: [0, 0.3] }, feet: [{ x: -30, y: 128, rot: 0.1, size: 20, mode: "dangle", leg: 20, seed: 2 }, { x: 30, y: 128, rot: -0.1, size: 20, mode: "dangle", leg: 20, seed: 5 }] }),
  // wiping its brow with the viewer-left wing, eyes shut; the other wing on the planted scissors (90.4–91.8)
  wipe: mergePose(BASE, {
    head: { yaw: -0.12, roll: -0.12 }, headphones: { yaw: -0.12 }, eyes: { state: "closed" },
    kitWings: [{ type: "arm", layer: "front", S: [100, 20], Wr: [160, 70], T: [205, 40], len: 34 }],
    over: (g) => armOver(g, [-95, 10], [-150, -110], [-10, -175], 34),
  }),
  // coiled crouch, wing tips clenched like fists (91.84–92.6)
  crouch: mergePose(BASE, {
    head: { yaw: 0, y: -100, roll: 0 }, headphones: { yaw: 0 }, body: { a: 88, b: 126, y: 44 }, eyes: { state: "angry", look: [0, 0.2], lid: 0.5 },
    kitWings: [
      { type: "arm", layer: "front", S: [-100, 20], Wr: [-190, 60], T: [-205, -10], len: 36 },
      { type: "arm", layer: "front", S: [100, 20], Wr: [190, 60], T: [205, -10], len: 36 },
    ],
  }),
  // powering up: yelling, eyes blazing, wings flung up and out (92.64–93.8)
  power: mergePose(BASE, { head: { yaw: -0.05, roll: 0.03 }, headphones: { yaw: -0.05 }, eyes: BLAZE, beak: { open: 0.9 } }),
  // reaching out to the left for the returning scissors (93.84–94.84)
  reach: mergePose(BASE, {
    head: { yaw: -0.18, roll: -0.05 }, headphones: { yaw: -0.18 }, eyes: { ...BLAZE, look: [-0.6, 0] }, beak: { open: 0.3 },
    kitWings: [{ type: "arm", layer: "front", S: [100, 10], Wr: [165, 60], T: [185, 0], len: 38 }],
  }),
  // a pair of scissors raised in each wing (94.88–95.92)
  two: mergePose(BASE, {
    head: { yaw: 0, roll: 0 }, headphones: { yaw: 0 }, eyes: { state: "angry", look: [0, 0.1] }, beak: { open: 0 },
    kitWings: [
      { type: "arm", layer: "front", S: [-100, 0], Wr: [-190, 20], T: [-215, -80], len: 34 },
      { type: "arm", layer: "front", S: [100, 0], Wr: [190, 20], T: [215, -100], len: 34 },
    ],
  }),
  // flying with the scissors (95.96–97.04)
  fly: mergePose(BASE, { head: { yaw: -0.3, roll: -0.15 }, headphones: { yaw: -0.3 }, eyes: { state: "angry", look: [-0.4, 0.1] }, beak: { open: 0.2 },
    feet: [{ x: -30, y: 125, rot: 0.5, size: 20, mode: "dangle", leg: 16, seed: 2 }, { x: 34, y: 120, rot: 0.3, size: 20, mode: "dangle", leg: 16, seed: 5 }] }),
};
// wing sets (all big: the source's wings span ~3× the head width); measured on 2× grids at 84.2, 88.8, 89.8, 93.2
const carryL = LW([-80, 10], [-235, -95], 150, 207, 130, 250, 120, 135, { hand: [-40, -25], seed: 3, n: 9, m: 6, cover: 85 });
export const WINGS = {
  carry: () => [carryL, mirror(carryL, { W: [215, -150], pa0: 25 * D, pa1: -48 * D, hand: [30, -40] })],
  press: () => { const l = LW([-85, 0], [-260, -20], 140, 188, 140, 300, 112, 120, { hand: [-50, 0], seed: 7, n: 9, m: 6, cover: 80 }); return [l, mirror(l)]; },
  // V up (take-off / landing)
  up: () => { const l = LW([-75, 0], [-200, -190], 195, 250, 130, 250, 150, 125, { hand: [-25, -40], seed: 9, n: 9, m: 6, cover: 80 }); return [l, mirror(l)]; },
  spread: () => { const l = LW([-85, 0], [-250, -40], 135, 195, 120, 280, 115, 115, { hand: [-45, -5], seed: 11, n: 9, m: 6, cover: 80 }); return [l, mirror(l)]; },
  half: () => { const l = LW([-85, 10], [-190, 10], 110, 160, 100, 190, 100, 100, { hand: [-35, 5], seed: 13, n: 8, m: 5, cover: 70 }); return [l, mirror(l)]; },
  power: () => { const l = LW([-85, -5], [-240, -170], 185, 245, 150, 300, 140, 140, { hand: [-35, -35], seed: 15, n: 10, m: 6, cover: 90 }); return [l, mirror(l, { pa1: -62 * D })]; },
  reach: () => [LW([-85, 0], [-270, -60], 165, 200, 130, 280, 150, 120, { hand: [-60, -10], seed: 17, n: 9, m: 6, cover: 80 })],
  fly: () => { const l = LW([-75, 0], [-230, -130], 180, 228, 130, 260, 140, 115, { hand: [-35, -25], seed: 19, n: 9, m: 6, cover: 80 }); return [l, mirror(l)]; },
};

// Build the owl (kit body/head/face, fan wings behind or in front) into its own canvas: { canvas, x, y, w, h, anchors }
// in frame px. key: cache the result (held poses); otherwise `slot` picks one of a few reusable scratch canvases.
const CACHE = new Map(), SCRATCH = [];
export function owlComp(pose, wings, x, y, s, { rot = 0, flip = false, res = 1.5, extra, props, key, slot = 0 } = {}) {
  if (key && CACHE.has(key)) return CACHE.get(key);
  const P = mergePose(pose, { wings: pose.kitWings || [] });
  if (!SCRATCH[slot]) SCRATCH[slot] = { a: document.createElement("canvas"), b: document.createElement("canvas") };
  const ex = pose.over ? (g, geo) => { pose.over(g, geo); if (extra) extra(g, geo); } : extra;
  const L = owlLayer({ ...P, x, y, s, rot, flip, res, canvas: key ? document.createElement("canvas") : SCRATCH[slot].a, tone: false, extra: ex });
  const ws = wings || [];
  if (!ws.length && !props) { const out = { ...L }; if (key) CACHE.set(key, out); return out; }
  const pad = 480 * s;
  const x0 = Math.floor(Math.min(L.x, x - pad)), y0 = Math.floor(Math.min(L.y, y - pad)), x1 = Math.ceil(Math.max(L.x + L.w, x + pad)), y1 = Math.ceil(Math.max(L.y + L.h, y + pad * 0.8));
  const c = key ? document.createElement("canvas") : SCRATCH[slot].b;
  const cw = Math.round((x1 - x0) * res), ch = Math.round((y1 - y0) * res);
  if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
  const g = c.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
  const paintWings = (list) => {
    if (!list.length) return;
    g.save();
    const co = Math.cos(rot), sn = Math.sin(rot), fl = flip ? -1 : 1;
    g.setTransform(res * s * fl * co, res * s * fl * sn, -res * s * sn, res * s * co, res * (x - x0), res * (y - y0));
    for (const w of list) fanWing(g, w, 1 / s);
    g.restore();
  };
  paintWings(ws.filter((w) => !w.front));
  g.drawImage(L.canvas, (L.x - x0) * res, (L.y - y0) * res, L.w * res, L.h * res);
  paintWings(ws.filter((w) => w.front));
  if (props) {
    g.save();
    const co = Math.cos(rot), sn = Math.sin(rot), fl = flip ? -1 : 1;
    g.setTransform(res * s * fl * co, res * s * fl * sn, -res * s * sn, res * s * co, res * (x - x0), res * (y - y0));
    props(g);
    g.restore();
  }
  const out = { canvas: c, x: x0, y: y0, w: x1 - x0, h: y1 - y0, anchors: L.anchors };
  if (key) CACHE.set(key, out);
  return out;
}
export function blitOwl(g, O, alpha = 1, dx = 0, dy = 0) {
  if (!O) return;
  g.save(); g.globalAlpha *= alpha; g.drawImage(O.canvas, O.x + dx, O.y + dy, O.w, O.h); g.restore();
}
export function releaseOwl23() { CACHE.clear(); SCRATCH.length = 0; }
