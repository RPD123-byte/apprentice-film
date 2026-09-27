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
import { backOwlLayer, lerpPose, STAND, SIT, SIT2, LEAN, LIE, SPREAD, SPREAD_UP, HEADSTAND, SWEEP, outlineLayer } from "./owl.js";
import { clamp, smooth } from "../../lib/rng.js";
import { drawCarry, releaseCarry } from "./carry.js";

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
// [t, x, y, s, rot°, pose]: root (= middle of the body) position, scale, rotation; consecutive rows with different
// poses blend (lerpPose). Positions are the body centres read off 1:1 gridded source frames (fidelity/s19.md).
const P = { STAND, SIT, SIT2, LEAN, LIE, SPREAD, SPREAD_UP, HEADSTAND, SWEEP };
const BACK = [
  // lands head-down (the source repeats 58.00 at 58.04), tips forward onto its belly by 58.12
  [57.96, 1415, 675, 1.3, 6, "HEADSTAND"],
  [58.00, 1400, 690, 1.3, 12, "HEADSTAND"],
  [58.04, 1400, 690, 1.3, 12, "HEADSTAND"],
  [58.12, 1165, 725, 1.3, 0, "LIE"],
  [58.16, 1125, 725, 1.3, 0, "LIE"],
  [58.20, 1085, 725, 1.3, 0, "LIE"],
  [58.24, 1060, 728, 1.3, 0, "LIE"],
  // pushes itself up into the sit
  [58.36, 985, 756, 1.3, 0, "SIT"],
  [58.44, 965, 760, 1.3, 0, "SIT"],
  [58.80, 965, 760, 1.3, 0, "SIT"],
  [59.16, 965, 760, 1.3, 0, "SIT2"],
  [59.56, 965, 760, 1.3, 0, "SIT2"],
  // gets up: bows forward to the right sweeping a wing along the floor, straightens with the head tilted, stands
  [59.62, 985, 752, 1.3, 1, "SIT2"],
  [59.76, 1060, 715, 1.3, 2, "LEAN"],
  [59.84, 1090, 710, 1.3, 2, "LEAN"],
  [59.92, 1112, 708, 1.3, 1, "LEAN"],
  [60.08, 1105, 685, 1.3, 0, "SWEEP"],
  [60.16, 1104, 683, 1.3, 0, "SWEEP"],
  [60.24, 1102, 680, 1.3, 0, "STAND"],
  [60.50, 1110, 680, 1.3, 0, "STAND"],
  [60.92, 1112, 680, 1.3, 0, "STAND"],
  // turns and steps right, the wings open 61.12–61.24
  [61.00, 1130, 682, 1.3, 0, "STAND"],
  [61.08, 1165, 685, 1.3, 0, "STAND"],
  [61.16, 1235, 688, 1.3, 0, "SPREAD"],
  [61.24, 1277, 690, 1.3, 0, "SPREAD"],
  [61.44, 1277, 690, 1.3, 0, "SPREAD"],
  // lifts the card, stretching up (the source repeats 61.56); sways left to 61.96 and back right
  [61.48, 1266, 690, 1.3, 0, "SPREAD"],
  [61.60, 1250, 680, 1.3, 0, "SPREAD_UP"],
  [61.68, 1246, 672, 1.3, 1, "SPREAD_UP"],
  [61.76, 1240, 666, 1.3, 2, "SPREAD_UP"],
  [61.84, 1235, 660, 1.3, 2, "SPREAD_UP"],
  [62.00, 1225, 665, 1.3, 1, "SPREAD_UP"],
  [62.08, 1256, 656, 1.3, 2, "SPREAD_UP"],
  [62.16, 1315, 640, 1.3, 3, "SPREAD_UP"],
  [62.20, 1345, 648, 1.3, 3, "SPREAD_UP"],
  [62.24, 1378, 655, 1.3, 3, "SPREAD_UP"],
  [62.28, 1405, 650, 1.3, 3, "SPREAD_UP"],
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

// ---------------------------------------------------------------- public
// Draw the owl at film time t. Returns the owl's floor contact (x, width) for the shadow, or null.
export function drawOwlAt(ctx, t) {
  if (t < 57.36) return null;
  if (t < 57.96) { drawBall(ctx, t); const [x] = tab(TUMBLE, t); return { x, y: 850, w: 240, a: 0.5 }; }
  if (t < 62.30) {
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
  return drawCarry(ctx, t);
}
export function releaseOwl() { BALL = null; BUF = null; DYN = null; cache.clear(); releaseCarry(); }

// ---------------------------------------------------------------- the dust cloud from the skid
// Outlines measured per source frame (s19/dustdata.js, 58.16–58.84: a puff at the owl's head at 58.16, a full cloud
// 58.32–58.44, breaking into curled wisps 58.56–58.76, the last bits at 58.84). Each piece: a pale fill, lighter at
// the top and greyer low down (measured graded fill ≈ 205–219 → 186 as it thins), a dark ink outline, and a couple of
// curl strokes inside the big pieces.
import { DUST } from "./dustdata.js";
export function drawDust(ctx, t) {
  const key = (Math.round(t * 25) / 25).toFixed(2), P = DUST[key];
  if (!P) return;
  const fade = clamp((t - 58.5) / 0.4);
  ctx.save();
  ctx.globalAlpha = t > 58.86 ? 0.55 : 1;           // the last wisps are faint (58.88–58.92)
  for (let i = 0; i < P.length; i++) {
    const a = P[i], path = new Path2D();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let k = 0; k < a.length; k += 2) { if (k) path.lineTo(a[k], a[k + 1]); else path.moveTo(a[k], a[k + 1]); x0 = Math.min(x0, a[k]); x1 = Math.max(x1, a[k]); y0 = Math.min(y0, a[k + 1]); y1 = Math.max(y1, a[k + 1]); }
    path.closePath();
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    const top = 0.94 - 0.05 * fade, bot = 0.8 - 0.05 * fade;
    g.addColorStop(0, `rgb(${Math.round(top * 255)},${Math.round(top * 255)},${Math.round(top * 250)})`);
    g.addColorStop(1, `rgb(${Math.round(bot * 255)},${Math.round(bot * 255)},${Math.round(bot * 250)})`);
    ctx.fillStyle = g; ctx.fill(path);
    ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(78,70,70,0.9)"; ctx.lineWidth = 2.2; ctx.stroke(path);
    // curls inside the big pieces
    const w = x1 - x0, h = y1 - y0;
    if (w > 80 && h > 60) {
      ctx.strokeStyle = "rgba(70,64,64,0.7)"; ctx.lineWidth = 1.8;
      for (const [fx, fy, r] of [[0.52, 0.55, 0.07], [0.72, 0.72, 0.06], [0.3, 0.78, 0.05]]) {
        ctx.beginPath(); ctx.arc(x0 + w * fx, y0 + h * fy, Math.min(w, h) * r * 2, 0.4, 3.6); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// Floor shadow under the owl (on the card-lit floor): measured dark pool under its feet, ≈ 200 x 60 px.
export function owlShadow(t) {
  if (t < 57.5) return null;
  if (t < 57.96) { const [x] = tab(TUMBLE, t); return { x, y: 862, w: 130, h: 26, a: 0.6 }; }
  if (t < 62.30) { const st = backState(t); return { x: st.x + 10, y: 858, w: 150, h: 34, a: t < 58.44 ? 0.6 : 0.95 }; }
  return null;
}
