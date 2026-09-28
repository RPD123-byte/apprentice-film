// s19 owl timeline. Every beat below was read off the source frame by frame (tools/strip.py at 0.04 s, gridded
// crops, background-difference tracking of the owl); positions are frame px of the owl's root (middle of the body).
//
//   57.40–57.96  tumbles in from the right edge rolled into a ball (dizzy spiral eyes), rolling left: the ball's
//                centre and spin are tabled per frame (TUMBLE)
//   57.96–58.44  lands face-down with its back to us, skids left on its belly (head right, tail up), a dust
//                cloud bursts at its head (58.16) and it pushes itself up into a sit (SKID)
//   58.44–59.56  sits with its back to us looking up at the card; the headphones have slipped round its neck
//   59.56–60.20  gets up: leans right, sweeps a wing down (dusting off), straightens, headphones back on top
//   60.20–61.04  stands looking up at the card
//   61.04–61.24  throws its wings open (motion-blurred) and steps right to the middle of the card
//   61.44–62.20  lifts the card (wings up), sways left then right with it
//   62.20–63.12  turns to three-quarter view, facing right, and carries the card off to the right
import { owlLayer, owlPose, setPPU, LINE, gv, plumage, rimHatch, regionFlicks, ink, drawFoot, drawBeak, drawBand, drawCup, drawBandage, screentone } from "../../lib/owlInk.js";
import { backOwlLayer, lerpPose, STAND, SIT, LEAN, LIE, SPREAD, SPREAD_UP, outlineLayer } from "./owl.js";
import { clamp, smooth } from "../../lib/rng.js";

const tab = (T, t) => {
  if (t <= T[0][0]) return T[0].slice(1);
  for (let i = 1; i < T.length; i++) if (t <= T[i][0]) { const a = T[i - 1], b = T[i], u = (t - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u); }
  return T[T.length - 1].slice(1);
};

// ---------------------------------------------------------------- the tumble (kit front pose, rolled)
// [t, x, y, rot°] ball centre and spin (face direction measured per frame: up at 57.56, left 57.60, lower-left
// 57.64–57.72, down 57.80); diameter ≈ 290 px.
const TUMBLE = [
  [57.36, 2380, 690, 50], [57.40, 2330, 690, 40], [57.44, 2250, 690, 25], [57.48, 2170, 690, 12], [57.52, 2080, 690, 5],
  [57.56, 2030, 722, 0], [57.60, 1965, 700, -80], [57.64, 1930, 686, -120], [57.68, 1860, 688, -135], [57.72, 1790, 692, -148],
  [57.76, 1712, 712, -162], [57.80, 1655, 712, -178], [57.84, 1605, 718, -195], [57.88, 1560, 726, -212], [57.92, 1490, 700, -228],
  [57.96, 1440, 700, -240],
];
// The ball: drawn from the kit's parts (the rig has no curled-up pose). A round white body (r 145 px) seen with the
// face on one side: dizzy spiral eyes, the beak, the headphone band wrapped round it with one cup, a wing edge
// and the feet tucked on the far side. Built once; the spin is a rotation of the cached layer.
let BALL = null;
function ballLayer() {
  if (BALL) return BALL;
  const R = 145, pad = 40, S = 2 * (R + pad);
  const c = document.createElement("canvas"); c.width = S; c.height = S;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.translate(S / 2, S / 2);
  setPPU(1);
  const circle = (q) => q.arc(0, 0, R, 0, Math.PI * 2);
  plumage(g, circle, { base: 0.97, shade: 0.72, light: [-0.4, -0.9], depth: 40, blur: 16 });
  rimHatch(g, sampleCircle(R), { light: [-0.4, -0.9], flow: [0.3, 1], len: 26, step: 2.6, w: 1.0, color: gv(0.3, 0.5), seed: 5, density: 1 });
  regionFlicks(g, 0, 0, R * 0.85, R * 0.85, 1.9, 160, 12, 7, { w: 0.9, color: gv(0.45, 0.35) });
  // wing edge sweeping round the lower right, feet tucked at the bottom right
  ink(g, [[R * 0.2, R * 0.2], [R * 0.62, R * 0.38], [R * 0.8, R * 0.05], [R * 0.72, -R * 0.35]], 2.4, LINE, { end: 0.1 });
  for (let k = 0; k < 4; k++) ink(g, [[R * (0.3 + k * 0.12), R * (0.3 - k * 0.05)], [R * (0.55 + k * 0.08), R * (0.2 - k * 0.12)]], 1.2, gv(0.3, 0.6), { end: 0.1 });
  drawFoot(g, { x: R * 0.55, y: R * 0.72, rot: -0.6, size: 18, mode: "dangle", seed: 2 });
  drawFoot(g, { x: R * 0.8, y: R * 0.45, rot: -1.0, size: 17, mode: "dangle", seed: 5 });
  // face: two spiral eyes and the beak, on the upper left of the ball
  for (const [x, y] of [[-58, -52], [8, -44]]) {
    g.fillStyle = gv(0.97); g.beginPath(); g.arc(x, y, 24, 0, Math.PI * 2); g.fill();
    g.strokeStyle = LINE; g.lineWidth = 3.2; g.lineCap = "round"; g.beginPath();
    for (let k = 0; k <= 48; k++) { const a = k / 48 * Math.PI * 5, r = 2 + k / 48 * 20; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (k) g.lineTo(px, py); else g.moveTo(px, py); }
    g.stroke();
    ink(g, [[x - 26, y - 20], [x, y - 32], [x + 24, y - 22]], 3, LINE, { end: 0.2 });
  }
  drawBeak(g, { x: -24, y: -26, w: 24, l: 30, rot: 0.1 });
  // the headphone band wrapped over the top-right, one cup on the right side
  const band = []; for (let k = 0; k <= 16; k++) { const a = -2.5 + k / 16 * 2.2; band.push([Math.cos(a) * (R + 4), Math.sin(a) * (R + 4)]); }
  drawBand(g, band, { w: 16, ends: [false, false], ribs: false });
  drawCup(g, { x: R * 0.72, y: -R * 0.7, r: 38, rot: 0.8, open: 0.6, side: 1 });
  drawBandage(g, { x: -70, y: -110, size: 44, rot: -0.5 });
  screentone(c, { pitch: 4.2 });
  outlineLayer(c, 2.6);
  BALL = { canvas: c, x: -S / 2, y: -S / 2, w: S, h: S };
  return BALL;
}
function sampleCircle(R) { const q = []; for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; q.push([Math.cos(a) * R, Math.sin(a) * R]); } return q; }
// Shutter: N spins/positions over the last quarter frame, averaged (premultiplied 'lighter' at 1/N) in a buffer.
let BUF = null;
function drawBall(ctx, t) {
  const L = ballLayer(), N = 5, B = 760;
  const [x0, y0] = tab(TUMBLE, t);
  if (!BUF) { BUF = document.createElement("canvas"); BUF.width = BUF.height = B; }
  const g = BUF.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.clearRect(0, 0, B, B);
  g.globalCompositeOperation = "lighter"; g.globalAlpha = 1 / N;
  for (let k = 0; k < N; k++) {
    const [x, y, r] = tab(TUMBLE, t - 0.01 * (k / (N - 1)));
    g.setTransform(1, 0, 0, 1, B / 2 + x - x0, B / 2 + y - y0); g.rotate(r * Math.PI / 180);
    g.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
  ctx.drawImage(BUF, x0 - B / 2, y0 - B / 2);
}

// ---------------------------------------------------------------- back view: land, skid, sit, get up, stand, spread
// [t, x, y, s, rot°, pose]: root position, scale, rotation; consecutive rows with different poses blend (lerpPose)
const P = { STAND, SIT, LEAN, LIE, SPREAD, SPREAD_UP };
const BACK = [
  [57.96, 1425, 700, 1.3, -45, "LIE"],
  [58.00, 1385, 716, 1.3, -18, "LIE"],
  [58.04, 1385, 716, 1.3, -18, "LIE"],
  [58.08, 1325, 736, 1.3, -4, "LIE"],
  [58.12, 1272, 746, 1.3, 0, "LIE"],
  [58.16, 1226, 752, 1.3, 0, "LIE"],
  [58.20, 1186, 756, 1.3, 0, "LIE"],
  [58.24, 1150, 758, 1.3, 0, "LIE"],
  [58.28, 1115, 758, 1.3, 0, "LIE"],
  [58.36, 1030, 766, 1.3, 0, "SIT"],
  [58.44, 965, 770, 1.3, 0, "SIT"],
  [59.56, 965, 770, 1.3, 0, "SIT"],
  [59.62, 985, 770, 1.3, 1, "SIT"],
  [59.76, 1075, 772, 1.3, 3, "LEAN"],
  [59.88, 1145, 768, 1.3, 4, "LEAN"],
  [60.00, 1190, 755, 1.3, 2, "LEAN"],
  [60.08, 1180, 715, 1.3, 1, "STAND"],
  [60.16, 1156, 690, 1.3, 0, "STAND"],
  [60.20, 1151, 686, 1.3, 0, "STAND"],
  [60.92, 1151, 686, 1.3, 0, "STAND"],
  [61.00, 1170, 687, 1.3, 0, "STAND"],
  [61.08, 1205, 688, 1.3, 0, "SPREAD"],
  [61.16, 1250, 690, 1.3, 0, "SPREAD"],
  [61.24, 1277, 690, 1.3, 0, "SPREAD"],
  [61.44, 1277, 690, 1.3, 0, "SPREAD"],
  // 61.48–62.24: x from template tracking of the head (root = head anchor - 3 px); the head rises 75–110 px as
  // it stretches up under the card (pose), the feet stay on the floor
  [61.48, 1266, 690, 1.3, 0, "SPREAD"],
  [61.52, 1249, 690, 1.3, 0, "SPREAD_UP"],
  [61.56, 1249, 690, 1.3, 0, "SPREAD_UP"],
  [61.60, 1236, 689, 1.3, 0, "SPREAD_UP"],
  [61.68, 1213, 687, 1.3, 1, "SPREAD_UP"],
  [61.76, 1197, 685, 1.3, 2, "SPREAD_UP"],
  [61.84, 1189, 684, 1.3, 2, "SPREAD_UP"],
  [62.00, 1185, 684, 1.3, 1, "SPREAD_UP"],
  [62.08, 1208, 676, 1.3, 2, "SPREAD_UP"],
  [62.16, 1259, 664, 1.3, 3, "SPREAD_UP"],
  [62.20, 1288, 664, 1.3, 3, "SPREAD_UP"],
  [62.24, 1326, 670, 1.3, 3, "SPREAD_UP"],
];
function backState(t) {
  const T = BACK;
  if (t <= T[0][0]) return { x: T[0][1], y: T[0][2], s: T[0][3], rot: T[0][4], pose: P[T[0][5]] };
  for (let i = 1; i < T.length; i++) if (t <= T[i][0]) {
    const a = T[i - 1], b = T[i], u = (t - a[0]) / (b[0] - a[0]), e = smooth(u);
    const pose = a[5] === b[5] ? P[a[5]] : lerpPose(P[a[5]], P[b[5]], e);
    return { x: a[1] + (b[1] - a[1]) * u, y: a[2] + (b[2] - a[2]) * u, s: a[3] + (b[3] - a[3]) * u, rot: a[4] + (b[4] - a[4]) * u, pose };
  }
  const z = T[T.length - 1];
  return { x: z[1], y: z[2], s: z[3], rot: z[4], pose: P[z[5]] };
}
// held back-view poses are cached (keyed by pose + scale); rotation and position are applied at draw time
const cache = new Map();
let DYN = null;
function backLayer(pose, key, s) {
  if (!key) { if (!DYN) DYN = document.createElement("canvas"); return backOwlLayer({ ...pose, x: 0, y: 0, s }, DYN); }
  const k = key + "@" + s.toFixed(3);
  if (!cache.has(k)) cache.set(k, backOwlLayer({ ...pose, x: 0, y: 0, s }));
  return cache.get(k);
}

// ---------------------------------------------------------------- three-quarter carry (kit rig)
// [t, x, y] root; head / wings measured at 62.28, 62.40, 62.56, 62.96
const CARRY = [
  // root x = measured headphone-cup x + 53 (the cup sits 53 px left of the root in this layer)
  [62.24, 1440, 655], [62.32, 1464, 655], [62.40, 1506, 655], [62.48, 1593, 655], [62.52, 1664, 655], [62.56, 1664, 655],
  [62.64, 1780, 655], [62.72, 1862, 655], [62.80, 1949, 655], [62.88, 2064, 655], [62.96, 2180, 650], [63.04, 2260, 650], [63.12, 2340, 650],
];
let SIDE = null;
function sideLayer() {
  if (SIDE) return SIDE;
  const pose = owlPose("walk", {
    head: { x: 10, y: -150, rx: 100, ry: 94, yaw: 1.1, roll: 0.02 },
    body: { x: 0, y: 0, a: 120, b: 108, rot: 1.75 },
    eyes: { state: "wide", look: [0.6, -0.2], r: 26 },
    beak: { el: -0.4, w: 26, l: 34 },
    headphones: { yaw: 1.1, lift: 1.08, bandH: 1.4, dy: -0.22 },
    tail: { base: [-60, 70], tip: [-150, 120], w: 26, n: 2 },
    wings: [
      { type: "spread", layer: "back", S: [-50, -60], Wr: [-170, -120], T: [-290, -158], trail: [0.3, 1], len: 84, spread: 0.9 },
      { type: "spread", layer: "back", S: [60, -40], Wr: [170, -120], T: [282, -200], trail: [-0.4, 1], len: 80, spread: 0.9 },
    ],
    feet: [{ x: -26, y: 116, rot: -0.3, size: 16, mode: "stand", leg: 22, seed: 2 }, { x: 44, y: 118, rot: -0.1, size: 16, mode: "stand", leg: 20, seed: 5 }],
  });
  const L = owlLayer({ ...pose, x: 0, y: 0, s: 1.25 });
  outlineLayer(L.canvas, 2.8);
  SIDE = L;
  return SIDE;
}

// ---------------------------------------------------------------- public
// Draw the owl at film time t. Returns the owl's floor contact (x, width) for the shadow, or null.
export function drawOwlAt(ctx, t) {
  if (t < 57.36) return null;
  if (t < 57.96) { drawBall(ctx, t); const [x] = tab(TUMBLE, t); return { x, y: 850, w: 240, a: 0.5 }; }
  if (t < 62.24) {
    const st = backState(t);
    const a = BACK.findIndex((r) => r[0] >= t);
    const row = BACK[Math.max(0, a)], prev = BACK[Math.max(0, a - 1)];
    const held = row && prev && row[5] === prev[5];
    const L = backLayer(st.pose, held ? row[5] : null, st.s);
    ctx.save();
    ctx.translate(st.x, st.y); ctx.rotate(st.rot * Math.PI / 180);
    ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
    ctx.restore();
    return { x: st.x, y: st.y + 140 * st.s, w: 300 * st.s / 1.3, a: 1 };
  }
  const [x, y] = tab(CARRY, t);
  const L = sideLayer();
  ctx.drawImage(L.canvas, x + L.x, y + L.y, L.w, L.h);
  return { x, y: 815, w: 280, a: 1 };
}
export function releaseOwl() { BALL = null; BUF = null; SIDE = null; DYN = null; cache.clear(); }

// ---------------------------------------------------------------- the dust cloud from the skid
// Bursts at the owl's head at 58.16 (≈ (1458, 823), small), full by 58.32 (x 1410–1610, y 690–845), holds, then the
// puffs shrink and drift up into wisps and are gone by 58.96.
const PUFFS = [[-70, 40, 38], [-30, 10, 46], [20, -28, 44], [62, 0, 40], [80, 42, 34], [20, 40, 42], [-40, 52, 30], [110, 30, 24], [-8, -55, 26]];
export function drawDust(ctx, t) {
  if (t < 58.14 || t > 58.98) return;
  const grow = smooth((t - 58.14) / 0.18), fade = clamp((t - 58.48) / 0.48);
  const cx = 1458 + (1510 - 1458) * grow, cy = 823 + (768 - 823) * grow + (-40) * fade * fade;
  const k = 0.35 + 0.65 * grow;
  ctx.save();
  const circles = PUFFS.map(([dx, dy, r], i) => {
    const shrink = clamp(1 - fade * (1.2 + 0.25 * ((i * 7) % 5)));
    return [cx + dx * k * (1 + 0.3 * fade), cy + dy * k - 30 * fade * ((i % 3) / 2), r * k * shrink];
  }).filter((c) => c[2] > 1);
  if (!circles.length) { ctx.restore(); return; }
  // outline first (fat dark), then the pale fill, then soft inner shading
  ctx.fillStyle = "#1a1818";
  for (const [x, y, r] of circles) { ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#d6d4ce";
  for (const [x, y, r] of circles) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.fillStyle = "rgba(245,243,238,0.9)";
  for (const [x, y, r] of circles) { ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.6, 0, 7); ctx.fill(); }
  ctx.strokeStyle = "rgba(60,58,56,0.6)"; ctx.lineWidth = 1.6;
  for (const [x, y, r] of circles) { ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0.3, 1.6); ctx.stroke(); }
  ctx.restore();
}

// Floor shadow under the owl (on the card-lit floor): measured dark pool under its feet, ≈ 200 x 60 px.
export function owlShadow(t) {
  if (t < 57.5) return null;
  if (t < 57.96) { const [x] = tab(TUMBLE, t); return { x, y: 862, w: 130, h: 26, a: 0.6 }; }
  if (t < 62.24) { const st = backState(t); return { x: st.x + 10, y: 858, w: 150, h: 34, a: t < 58.44 ? 0.6 : 0.95 }; }
  return null;
}
