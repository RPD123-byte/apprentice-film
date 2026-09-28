// s20 (build 3): the wide room, painted as one engraved plate in setup-A frame coordinates (locked-off camera,
// measured: camtrack s = 1.0000, no drift 63.12–66.84). Setup B views the same plate through a measured affine.
// Everything here is drawn from measurements (grid crops of owl-free medians of the source; see
// snapshots/s20-b3-tools/); no source pixels are used. Tones: plate values measured as blurred, un-graded means.
// Not in the plate (they move): the note card, the scissors, the owl, the dust.
import { Plate } from "../../../lib/engrave.js";
import { rng } from "../../../lib/rng.js";
import { poly, blob, circ, ell, line, seg, strokePath, wc, hatchIn, lerp2, bil, TAU } from "./util.js";

export const M = 44;                         // plate margin (setup B shows a little beyond the A frame)
// per-object tone gain (measured: blurred graded means of each region, source / render, snapshots/s20-b3-tools)
let GAIN = 1;
const WH = (v, a = 1) => wc(v * GAIN, a);     // warm ink white
const fillG = (P, path, v, ang, o) => P.fill(path, typeof v === "number" ? Math.min(1, v * GAIN) : v, ang, o);
const lightG = (P, path, v, op, a) => P.light(path, typeof v === "number" ? Math.min(1, v * GAIN) : v, op, a);
const K = (a = 1) => `rgba(0,0,0,${a})`;
const V = Math.PI / 2;                        // vertical strokes

const cs = (v) => { const c = Math.round(Math.min(1, v) * 255); return `rgb(${c},${c},${c})`; };
const lin = (g, x0, y0, x1, y1, stops, k) => { const q = g.createLinearGradient(x0, y0, x1, y1); for (const [t, v] of stops) q.addColorStop(t, cs(v * k)); return q; };
const grad = (x0, y0, x1, y1, stops) => { const k = GAIN; return (g) => lin(g, x0, y0, x1, y1, stops, k); };
const rad = (x, y, r0, r1, stops) => { const k = GAIN; return (g) => { const q = g.createRadialGradient(x, y, r0, x, y, r1); for (const [t, v] of stops) q.addColorStop(t, cs(v * k)); return q; }; };

// ------------------------------------------------------------------------------------------------ geometry
// the tall speaker (left of centre): front face, lit right side panel, drivers
export const SPK = {
  front: [[300, 46], [606, 44], [612, 905], [300, 946]],
  side: [[606, 44], [652, 40], [728, 150], [730, 862], [612, 905]],
  tw: [408, 183, 47], woof: [411, 411, 139], cap: [434, 416, 46], low: [505, 750, 90],
};
// the note card at rest (outer quad TL, TR, BR, BL; edges fitted on the source frame 65.48)
export const CARD_REST = [[1299.6, 255.3], [1510.8, 220.8], [1443.3, 793.0], [1222.9, 722.9]];

function paintBack(P) {
  // the far wall is black; a faint haze low in the centre gap
  fillG(P, poly([[860, 0], [1200, 0], [1200, 946], [860, 946]]), 0.0, V, { style: 2 });
}

// ------------------------------------------------------------------------------------------------ left group
function guitarCase(P) {
  const out = [[180, -10], [168, 60], [155, 150], [147, 232], [144, 262], [151, 300], [170, 336], [196, 372], [216, 412], [232, 470], [300, 470], [305, 330], [284, 296], [266, 262], [258, 230], [262, 150], [266, 60], [270, -10]];
  fillG(P, poly(out), grad(140, 0, 300, 0, [[0.03, 0.14], [0.19, 0.3], [0.31, 0.32], [0.44, 0.36], [0.56, 0.36], [0.69, 0.22], [0.81, 0.08]]), V + 0.05, { spacing: 0.28 });
  lightG(P, poly(out), grad(0, 0, 0, 470, [[0, 1], [0.45, 1], [0.58, 0.58], [0.8, 0.58], [1, 0.7]]), "multiply", 1);
  const o = P.o;
  // raised rims along both edges
  line(o, [[178, -5], [165, 70], [153, 160], [146, 240], [150, 298], [170, 334], [198, 372], [220, 420], [232, 470]], 4.5, WH(0.92));
  line(o, [[196, -5], [185, 70], [173, 160], [166, 240], [170, 292], [188, 326], [214, 360], [236, 405], [246, 450]], 2.6, WH(0.75));
  line(o, [[262, -5], [259, 80], [256, 160], [254, 230], [262, 262], [280, 292], [300, 318]], 3.4, WH(0.85));
  line(o, [[246, -5], [243, 80], [240, 160], [240, 230], [246, 262], [262, 292], [284, 322]], 2, WH(0.55));
  // latches
  for (const [x, y, w, h, r] of [[165, 158, 42, 48, -0.06], [184, -6, 46, 38, -0.06]]) {
    o.save(); o.translate(x + w / 2, y + h / 2); o.rotate(r);
    o.fillStyle = WH(0.6); o.fillRect(-w / 2, -h / 2, w, h);
    o.fillStyle = WH(0.9); o.fillRect(-w / 2 + 6, -h / 2 + 5, w - 12, h - 10);
    o.fillStyle = K(0.8); o.fillRect(-w / 2 + 9, -h / 2 + 9, 3, h - 18);
    o.strokeStyle = K(0.9); o.lineWidth = 2.5; o.strokeRect(-w / 2, -h / 2, w, h);
    o.restore();
  }
  // lattice of fine hatch where the case turns (the source's cross-hatched shading, 250–330)
  hatchIn(o, poly([[150, 250], [215, 250], [250, 330], [300, 380], [230, 400], [170, 330]]), [140, 240, 310, 410], 0.9, 7, 1.2, WH(0.35), { seed: 21 });
}

function booksOnTop(P) {
  fillG(P, poly([[282, -10], [610, -10], [606, 46], [300, 48], [282, 30]]), grad(0, 0, 0, 48, [[0, 0.3], [0.5, 0.36], [0.9, 0.34], [1, 0.2]]), 0.02, { spacing: 0.2 });
  const o = P.o;
  line(o, [[292, 14], [450, 12], [604, 10]], 2.2, WH(0.8));
  line(o, [[296, 32], [450, 30], [600, 29]], 2.6, WH(0.85));
  line(o, [[300, 46], [606, 44]], 3.5, WH(0.9));
  // the rounded spine end at the right
  o.save(); o.fillStyle = WH(0.8); o.beginPath(); o.ellipse(590, 22, 16, 22, 0, -V, V); o.lineTo(560, 44); o.lineTo(560, 0); o.closePath(); o.fill(); o.restore();
}

function speaker(P) {
  const { front, side, tw, woof, cap, low } = SPK;
  // front face: dark with vertical grain, a little lighter toward the lit right edge
  fillG(P, poly(front), grad(300, 0, 606, 0, [[0.06, 0.02], [0.19, 0.03], [0.31, 0.05], [0.44, 0.08], [0.56, 0.14], [0.69, 0.22], [0.81, 0.18], [0.94, 0.12]]), V, { spacing: 0.3 });
  // side panel: brightly lit, vertical grain, darker low down
  fillG(P, poly(side), grad(0, 50, 0, 900, [[0.05, 0.8], [0.15, 0.88], [0.25, 0.9], [0.45, 0.68], [0.55, 0.7], [0.65, 0.74], [0.75, 0.72], [0.85, 0.66], [0.95, 0.46]]), V, { spacing: 0.34 });
  lightG(P, poly(side), grad(606, 0, 730, 0, [[0.08, 0.6], [0.25, 1], [0.42, 0.9], [0.58, 0.86], [0.75, 0.76], [0.92, 0.47]]), "multiply", 1);
  const o = P.o;
  line(o, [[606, 44], [608, 400], [612, 905]], 4, K(0.9));
  line(o, [[612, 50], [615, 400], [619, 900]], 2.5, WH(0.8));
  line(o, [[652, 40], [728, 150]], 3, WH(0.85));
  line(o, [[728, 150], [730, 862]], 2.5, WH(0.7));
  line(o, [[300, 46], [300, 946]], 2.2, WH(0.55));
  // dark grain streaks on the side panel (the source's bold vertical knife marks)
  const r = rng(41);
  for (let i = 0; i < 26; i++) {
    const x = 618 + r() * 106, y0 = 90 + r() * 500, L = 60 + r() * 260;
    line(o, [[x, y0], [x + (r() - 0.5) * 3, y0 + L / 2], [x + (r() - 0.5) * 4, y0 + L]], 1.5 + r() * 3.5, K(0.55 + r() * 0.35), { end: 0.1 });
  }
  // tweeter: bright ring, dark dome, highlight
  const [tx, ty, tr] = tw;
  fillG(P, circ(tx, ty, tr), 0.08, 0, { style: 2 });
  strokePath(o, circ(tx, ty, tr - 2), 4, WH(0.6));
  strokePath(o, circ(tx, ty, tr * 0.72), 2.2, WH(0.6));
  o.save(); o.beginPath(); o.arc(tx, ty, tr * 0.7, 0, TAU); o.clip();
  for (let k = 0; k < 7; k++) strokePath(o, (g) => g.arc(tx - 4, ty - 3, tr * (0.3 + k * 0.06), Math.PI * 0.9, Math.PI * 1.75), 1.4, WH(0.45));
  o.restore();
  o.fillStyle = K(0.95); o.beginPath(); o.arc(tx + 3, ty + 1, tr * 0.34, 0, TAU); o.fill();
  o.fillStyle = WH(0.95); o.beginPath(); o.ellipse(tx + 6, ty - 6, 7, 5, -0.5, 0, TAU); o.fill();
  // woofer: surround ring, cone with concentric rings lit on the upper left, dust cap
  const [wx, wy, wr] = woof;
  fillG(P, circ(wx, wy, wr + 12), 0.06, 0, { style: 2 });
  // the lit part of the cone: a crescent upper-left
  lightG(P, (g) => { g.arc(wx, wy, wr * 0.9, 0, TAU); }, rad(wx - 55, wy + 75, 5, wr * 1.05, [[0, 1], [0.45, 0.9], [0.7, 0.4], [1, 0.02]]), "source-over", 1);
  strokePath(o, circ(wx, wy, wr + 6), 5, WH(0.5));
  strokePath(o, (g) => g.arc(wx, wy, wr + 6, Math.PI * 1.45, Math.PI * 1.95), 8, WH(0.95));
  strokePath(o, (g) => g.arc(wx, wy, wr + 6, Math.PI * 0.25, Math.PI * 0.45), 7, WH(0.8));
  strokePath(o, circ(wx, wy, wr - 6), 3, WH(0.7));
  strokePath(o, circ(wx, wy, wr - 16), 2, WH(0.5));
  o.save(); o.beginPath(); o.arc(wx, wy, wr - 18, 0, TAU); o.clip();
  const rr = rng(43);
  for (let k = 0; k < 20; k++) {
    const rk = cap[2] + 8 + k * ((wr - 24 - cap[2]) / 20);
    const a0 = Math.PI * (0.2 + rr() * 0.15), a1 = Math.PI * (1.15 + rr() * 0.2);
    strokePath(o, (g) => g.arc(wx + 2, wy + 1, rk, a0, a1), 1.1 + rr() * 1.2, WH(0.2 + 0.25 * (1 - k / 20)));
    strokePath(o, (g) => g.arc(wx + 2, wy + 1, rk, a1 + 0.3, a0 + TAU - 0.3), 1, WH(0.18));
  }
  o.restore();
  // dust cap: black dome with a hot highlight
  o.fillStyle = K(0.96); o.beginPath(); o.arc(cap[0], cap[1], cap[2], 0, TAU); o.fill();
  strokePath(o, circ(cap[0], cap[1], cap[2]), 2, WH(0.4));
  o.fillStyle = WH(0.9); o.beginPath(); o.ellipse(cap[0] + 4, cap[1] + 2, 9, 11, 0.6, 0, TAU); o.fill();
  // screw holes on the surround
  for (const a of [-0.55, 2.4]) { const x = wx + Math.cos(a) * (wr + 8), y = wy + Math.sin(a) * (wr + 8); o.fillStyle = K(0.9); o.beginPath(); o.arc(x, y, 5, 0, TAU); o.fill(); strokePath(o, circ(x, y, 5), 1.5, WH(0.6)); }
  // low driver (mostly behind the crate)
  const [lx, ly, lr] = low;
  fillG(P, circ(lx, ly, lr + 8), 0.05, 0, { style: 2 });
  strokePath(o, circ(lx, ly, lr + 4), 5, WH(0.75));
  strokePath(o, circ(lx, ly, lr - 10), 2, WH(0.45));
  for (let k = 0; k < 6; k++) strokePath(o, (g) => g.arc(lx, ly, lr * (0.35 + k * 0.1), Math.PI * 0.95, Math.PI * 1.6), 1.3, WH(0.3));
}

function plant(P) {
  // pot on the speaker's top right corner
  fillG(P, poly([[652, 40], [726, 40], [722, 108], [660, 108]]), grad(652, 0, 726, 0, [[0, 0.62], [0.5, 0.5], [1, 0.2]]), V, { spacing: 0.3 });
  const o = P.o;
  line(o, [[650, 42], [728, 40]], 5, WH(0.9));
  line(o, [[656, 52], [664, 108]], 2.5, WH(0.7));
  // heart-shaped leaves hanging down the right
  const leaves = [[700, 14, 22, 2.6], [738, 10, 20, 2.0], [774, 40, 22, 1.9], [750, 72, 21, 1.7], [784, 94, 20, 1.5], [758, 128, 22, 1.65], [790, 150, 19, 1.4], [764, 196, 20, 1.6], [792, 208, 18, 1.35], [782, 244, 19, 1.55], [658, 8, 20, 2.3], [726, 32, 16, 2.1]];
  for (const [x, y, s, a] of leaves) {
    const pts = []; for (let i = 0; i < 18; i++) { const t = (i / 18) * TAU; const r = s * (0.62 + 0.38 * Math.cos(t)) * (1 - 0.25 * Math.abs(Math.sin(t / 2))); pts.push([x + Math.cos(t + a) * r * 1.0, y + Math.sin(t + a) * r * 0.78]); }
    o.save(); o.translate(0, 0);
    o.beginPath(); o.moveTo(x, y);
    const tip = [x + Math.cos(a) * s * 1.35, y + Math.sin(a) * s * 1.35], n = [-Math.sin(a), Math.cos(a)];
    o.bezierCurveTo(x + n[0] * s * 0.9, y + n[1] * s * 0.9, tip[0] + n[0] * s * 0.5 - Math.cos(a) * s * 0.3, tip[1] + n[1] * s * 0.5 - Math.sin(a) * s * 0.3, tip[0], tip[1]);
    o.bezierCurveTo(tip[0] - n[0] * s * 0.5 - Math.cos(a) * s * 0.3, tip[1] - n[1] * s * 0.5 - Math.sin(a) * s * 0.3, x - n[0] * s * 0.9, y - n[1] * s * 0.9, x, y);
    o.fillStyle = WH(0.72); o.fill(); o.lineWidth = 2.4; o.strokeStyle = K(0.95); o.stroke();
    line(o, [[x, y], lerp2([x, y], tip, 0.5), tip], 1.4, K(0.8));
    o.restore();
  }
  line(o, [[738, 20], [750, 70], [758, 128], [766, 196], [782, 244]], 1.6, WH(0.6));
}

function rackAndBox(P) {
  // tall dark box behind the scissors, the rack unit with jacks, cables hanging from it
  fillG(P, poly([[728, 150], [872, 162], [874, 740], [730, 760]]), grad(728, 0, 874, 0, [[0.1, 0.3], [0.3, 0.11], [1, 0.1]]), V, { spacing: 0.3 });
  fillG(P, poly([[732, 268], [862, 280], [860, 372], [732, 366]]), grad(0, 268, 0, 372, [[0.17, 0.12], [0.5, 0.2], [0.83, 0.28]]), 0.08, { spacing: 0.25 });
  const o = P.o;
  strokePath(o, poly([[732, 268], [862, 280], [860, 372], [732, 366]]), 3, WH(0.8));
  for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
    const x = 758 + i * 21, y = 300 + row * 34 + i * 1.6;
    o.fillStyle = K(0.95); o.beginPath(); o.arc(x, y, 7, 0, TAU); o.fill();
    strokePath(o, circ(x, y, 7), 1.8, WH(0.75));
  }
  for (const [x, dx, y1] of [[772, 6, 700], [792, 12, 640], [812, 20, 720], [834, 10, 600]]) line(o, [[x, 370], [x + dx * 0.3, 450], [x + dx, y1]], 5, K(0.9), { end: 0.6 });
  for (const [x, dx, y1] of [[772, 6, 700], [792, 12, 640], [812, 20, 720], [834, 10, 600]]) line(o, [[x - 2, 372], [x + dx * 0.3 - 2, 450], [x + dx - 2, y1]], 1.6, WH(0.55), { end: 0.4 });
  line(o, [[728, 150], [872, 162]], 2.5, WH(0.5));
  line(o, [[872, 162], [874, 740]], 2, WH(0.3));
}

function crate(P) {
  // milk crate lower left: shadowed left face, lit front with a slotted handle band and diamond lattice
  fillG(P, poly([[-50, 520], [168, 530], [168, 990], [-50, 990]]), 0.03, 0.8, { spacing: 0.3 });
  fillG(P, poly([[168, 528], [456, 524], [456, 990], [168, 990]]), 0.06, V, { spacing: 0.3, style: 2 });
  const o = P.o;
  // rim and handle band
  o.save();
  o.fillStyle = WH(0.62); o.beginPath(); poly([[168, 530], [456, 526], [456, 548], [168, 553]])(o); o.fill();
  line(o, [[168, 531], [456, 526]], 3.5, WH(0.95));
  line(o, [[168, 553], [456, 548]], 2.5, K(0.9));
  // slots in the band
  o.fillStyle = (() => { const q = o.createLinearGradient(170, 0, 452, 0); for (const [t, v] of [[0.07, 0.38], [0.21, 0.27], [0.36, 0.44], [0.5, 0.6], [0.64, 0.53], [0.79, 0.29], [0.93, 0.37]]) q.addColorStop(t, WH(v)); return q; })(); o.beginPath(); poly([[172, 556], [452, 551], [452, 645], [172, 650]])(o); o.fill();
  hatchIn(o, poly([[250, 566], [398, 563], [398, 632], [250, 636]]), [248, 560, 400, 640], V, 7, 3.4, K(0.85), { seed: 31, broken: 0.02, jit: 0.1, lenMin: 2 });
  o.fillStyle = K(0.92);
  for (const [x0, x1] of [[184, 238], [410, 446]]) { o.beginPath(); o.roundRect(x0, 566, x1 - x0, 72, 8); o.fill(); }
  strokePath(o, (g) => g.roundRect(248, 562, 152, 76, 6), 3, WH(0.9));
  o.restore();
  // posts
  for (const [x0, x1] of [[168, 206], [404, 456]]) {
    o.fillStyle = WH(0.42); o.fillRect(x0, 650, x1 - x0, 340);
    hatchIn(o, poly([[x0, 650], [x1, 650], [x1, 990], [x0, 990]]), [x0, 650, x1, 990], V, 6, 2.6, K(0.8), { seed: x0, broken: 0.05, lenMin: 2 });
    line(o, [[x0 + 3, 650], [x0 + 3, 990]], 3, WH(0.9)); line(o, [[x1 - 3, 650], [x1 - 3, 990]], 2, K(0.9));
  }
  line(o, [[172, 650], [452, 646]], 3, WH(0.8));
  // diamond lattice on the front
  o.save(); o.beginPath(); o.rect(206, 652, 198, 340); o.clip();
  for (let k = -5; k < 6; k++) {
    const x = 214 + k * 64;
    seg(o, [x, 652], [x + 180, 990], 7, WH(0.5)); seg(o, [x + 180, 652], [x, 990], 7, WH(0.5));
    seg(o, [x + 3, 652], [x + 183, 990], 2, K(0.8));
  }
  o.restore();
  // faint lattice on the shadowed left face
  o.save(); o.beginPath(); o.rect(-50, 560, 218, 430); o.clip();
  for (let k = -8; k < 8; k++) { const x = k * 60; seg(o, [x, 560], [x + 220, 990], 3, WH(0.16)); seg(o, [x + 220, 560], [x, 990], 3, WH(0.12)); }
  o.restore();
  line(o, [[168, 530], [168, 990]], 2.5, WH(0.5));
}

function cables(P) {
  const o = P.o;
  // the coil lying on the crate: five thick rubber strands side by side (dark, a thin lit ridge along the top),
  // bending down over the crate's right end (measured on a 1.6x crop: strands at y 456 / 472 / 487 / 500 / 516)
  const strands = [456, 471, 486, 500, 515];
  strands.forEach((y, i) => {
    const L = [[18 + i * 4, y + 6], [90, y - 2], [200, y - 4 + i], [300, y + 1], [345 + i * 6, y + 14 + i * 4], [380 + i * 8, y + 38 + i * 6]];
    line(o, L, 22, K(0.97), { end: 0.85 });
    line(o, L.map(([x, yy]) => [x, yy - 6]), 6, WH(0.85 - i * 0.06), { end: 0.35, wob: 1.2, seed: 80 + i });
    line(o, L.map(([x, yy]) => [x, yy + 6]), 2.5, WH(0.4), { end: 0.3, wob: 1, seed: 90 + i });
  });
  line(o, [[18, 445], [120, 440], [260, 444], [330, 452]], 3, WH(0.55), { end: 0.3 });
  // ridges along the big cable that drops over the crate front
  const big = [[176, 474], [206, 487], [231, 525], [250, 587], [262, 650], [276, 740], [300, 830], [336, 910], [372, 990]];
  line(o, big, 24, K(0.96), { end: 0.9 });
  line(o, big.map(([x, y]) => [x - 7, y]), 4, WH(0.85), { end: 0.6 });
  const r = rng(51);
  const q = []; for (let i = 0; i < big.length - 1; i++) for (let k = 0; k < 10; k++) q.push(lerp2(big[i], big[i + 1], k / 10));
  for (let i = 0; i < q.length; i += 2) { const a = q[i], b = q[Math.min(q.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; seg(o, [a[0] + (dy / l) * 9, a[1] - (dx / l) * 9], [a[0] + (dy / l) * 3, a[1] - (dx / l) * 3], 2 + r(), WH(0.7)); }
  // a second cable down the crate's right post
  const c2 = [[346, 505], [368, 560], [384, 640], [400, 740], [420, 850], [440, 990]];
  line(o, c2, 12, K(0.95)); line(o, c2.map(([x, y]) => [x - 4, y]), 2.5, WH(0.7));
  // floor cables
  line(o, [[458, 790], [470, 836], [505, 872], [530, 910], [545, 990]], 9, WH(0.75), { end: 0.3 });
  line(o, [[462, 790], [474, 836], [509, 872], [534, 910], [549, 990]], 3, K(0.9));
  line(o, [[720, 858], [738, 880], [742, 915], [750, 990]], 8, WH(0.5), { end: 0.4 });
  for (let k = 0; k < 7; k++) seg(o, [740 + k * 0.5, 890 + k * 12], [741 + k * 0.5, 896 + k * 12], 4, WH(0.9));
  // cable loops by the keyboard (floor, right)
  line(o, [[1330, 930], [1350, 880], [1420, 845], [1500, 842], [1560, 850]], 6, WH(0.8), { end: 0.2 });
  line(o, [[1335, 932], [1352, 885], [1420, 852], [1500, 850]], 2.5, K(0.8));
  line(o, [[1410, 936], [1430, 895], [1510, 870], [1600, 866], [1640, 875]], 5, WH(0.75), { end: 0.2 });
  line(o, [[1320, 940], [1400, 945], [1480, 930]], 4, WH(0.4));
}

function sign(P) {
  const q = [[902, 28], [1126, 3], [1138, 100], [908, 137]];
  fillG(P, poly(q), 0.05, -0.11, { spacing: 0.3, style: 2 });
  const o = P.o;
  strokePath(o, poly(q), 3, WH(0.42));
  strokePath(o, poly([[912, 36], [1118, 12], [1129, 94], [916, 128]]), 1.2, WH(0.2));
  for (const [x, y] of [[912, 124], [1128, 92], [909, 40], [1120, 16]]) { strokePath(o, circ(x, y, 4), 1.6, WH(0.4)); }
  // hanging wire
  line(o, [[960, 22], [990, -2], [1000, -20]], 1.6, WH(0.3));
  line(o, [[1060, 10], [1030, -4], [1010, -20]], 1.6, WH(0.25));
  o.save(); o.translate(1020, 70); o.rotate(-0.112);
  o.fillStyle = WH(0.46); o.textAlign = "center"; o.textBaseline = "alphabetic";
  o.font = "400 30px 'Geist Mono'"; o.letterSpacing = "1px";
  o.fillText("MIXING.", -8, -14);
  o.fillText("DO NOT KNOCK.", 0, 22);
  o.letterSpacing = "0px";
  o.restore();
}

// ------------------------------------------------------------------------------------------------ right group
function boxesMid(P) {
  // left dim stack (x 1185–1300)
  fillG(P, poly([[1200, 130], [1252, 128], [1254, 276], [1200, 276]]), grad(0, 130, 0, 276, [[0.25, 0.1], [0.75, 0.2]]), V, { spacing: 0.3 });
  fillG(P, poly([[1186, 272], [1298, 268], [1298, 476], [1186, 480]]), grad(1186, 0, 1298, 0, [[0, 0.24], [0.6, 0.2], [1, 0.14]]), V, { spacing: 0.3 });
  fillG(P, poly([[1190, 474], [1256, 472], [1258, 640], [1190, 650]]), 0.28, V, { spacing: 0.3 });
  fillG(P, poly([[1150, 110], [1200, 110], [1200, 650], [1150, 650]]), 0.1, V, { spacing: 0.3 });
  const o = P.o;
  for (const L of [[[1200, 130], [1252, 128]], [[1186, 272], [1298, 268]], [[1190, 474], [1256, 472]]]) line(o, L, 3, WH(0.75));
  line(o, [[1186, 272], [1186, 480]], 2.5, WH(0.6)); line(o, [[1200, 130], [1200, 276]], 2, WH(0.5));
  line(o, [[1210, 380], [1236, 376]], 3, WH(0.6));
  // the dark monitor speaker (x 1296–1392, y 0–222)
  fillG(P, poly([[1296, -10], [1392, -10], [1392, 222], [1298, 226]]), grad(1296, 0, 1392, 0, [[0, 0.07], [0.7, 0.06], [1, 0.18]]), V, { spacing: 0.3 });
  strokePath(o, (g) => g.roundRect(1300, -20, 88, 244, 16), 3, WH(0.45));
  strokePath(o, circ(1340, 67, 31), 3.5, WH(0.42)); strokePath(o, circ(1340, 67, 20), 2, WH(0.35));
  o.fillStyle = K(0.95); o.beginPath(); o.arc(1340, 67, 12, 0, TAU); o.fill();
  o.fillStyle = WH(0.35); o.fillRect(1324, 118, 40, 42);
  for (let k = 0; k < 6; k++) seg(o, [1326, 122 + k * 7], [1362, 122 + k * 7], 2.2, K(0.9));
  // bright box behind the card (x 1350–1510): left face, top face (diagonal), torn flap
  fillG(P, poly([[1351, 196], [1511, 81], [1511, 620], [1351, 620]]), grad(0, 90, 0, 250, [[0.12, 0.53], [0.4, 0.55], [0.62, 0.66], [1, 0.62]]), V, { spacing: 0.34 });
  fillG(P, poly([[1392, -10], [1570, -10], [1570, 70], [1511, 81], [1392, 170]]), grad(1392, 0, 1570, 0, [[0.12, 0.63], [0.38, 0.7], [0.62, 0.73], [0.88, 0.63]]), V, { spacing: 0.34 });
  line(o, [[1351, 196], [1511, 81]], 4, K(0.95));
  line(o, [[1351, 200], [1511, 86]], 2, WH(0.9));
  line(o, [[1392, -10], [1392, 172]], 2.5, K(0.85));
  // torn flap edge
  line(o, [[1402, 206], [1414, 190], [1424, 210], [1440, 196], [1452, 214]], 2.2, K(0.9));
  line(o, [[1420, 188], [1422, 230]], 2, K(0.7));
  // big striped box right of it (x 1507–1780) and the one below
  fillG(P, poly([[1509, 80], [1785, 68], [1785, 418], [1509, 424]]), grad(1509, 0, 1785, 0, [[0.08, 0.4], [0.25, 0.27], [0.42, 0.21], [0.58, 0.23], [0.75, 0.16], [0.92, 0.07]]), V, { spacing: 0.6 });
  fillG(P, poly([[1509, 424], [1785, 418], [1790, 610], [1509, 616]]), grad(1509, 0, 1790, 0, [[0.1, 0.28], [0.3, 0.25], [0.5, 0.22], [0.7, 0.16], [0.9, 0.18]]), V, { spacing: 0.6 });
  fillG(P, poly([[1509, 66], [1780, 56], [1785, 68], [1509, 80]]), 0.7, 0, { spacing: 0.2 });
  line(o, [[1507, 80], [1785, 68]], 3.5, WH(0.9)); line(o, [[1509, 422], [1790, 416]], 5, WH(0.62)); line(o, [[1509, 432], [1790, 426]], 2, K(0.8));
  line(o, [[1509, 80], [1509, 620]], 3, WH(0.75));
  // bold dark knife strokes on the striped boxes
  const r = rng(61);
  for (let i = 0; i < 40; i++) { const x = 1515 + r() * 265, y0 = 86 + r() * 480, L = 40 + r() * 200; line(o, [[x, y0], [x + (r() - 0.5) * 4, Math.min(612, y0 + L)]], 2 + r() * 4, K(0.7 + r() * 0.3), { end: 0.15 }); }
  // top box row (x 1565–1780, y 0–56): dim
  fillG(P, poly([[1570, -10], [1790, -10], [1790, 56], [1570, 66]]), 0.18, V, { spacing: 0.4 });
  line(o, [[1570, -10], [1570, 68]], 2.5, WH(0.6));
}

function xStand(P) {
  const o = P.o;
  // four legs of the X stand (tubes), back pair first
  const legs = [[[1690, 275], [1860, 600]], [[1880, 250], [1720, 605]], [[1608, 257], [1803, 612]], [[1928, 203], [1692, 612]]];
  legs.forEach(([a, b], i) => { const back = i >= 2; seg(o, a, b, back ? 15 : 19, K(0.95)); seg(o, a, b, back ? 9 : 12, WH(back ? 0.5 : 0.78)); seg(o, [a[0] + 3, a[1]], [b[0] + 3, b[1]], 3, K(0.7)); seg(o, [a[0] - 3, a[1]], [b[0] - 3, b[1]], 2, WH(back ? 0.7 : 0.95)); });
  // hinge bolt at the crossing
  o.fillStyle = WH(0.7); o.beginPath(); o.ellipse(1782, 465, 12, 9, 0.5, 0, TAU); o.fill(); strokePath(o, (g) => g.ellipse(1782, 465, 12, 9, 0.5, 0, TAU), 2, K(0.9));
  // top arms with rubber end caps
  for (const [a, b] of [[[1580, 255], [1817, 299]], [[1775, 189], [1997, 257]]]) {
    seg(o, a, b, 30, K(0.95)); seg(o, a, b, 22, WH(0.55));
    seg(o, [a[0], a[1] - 5], [b[0], b[1] - 5], 4, WH(0.9)); seg(o, [a[0], a[1] + 7], [b[0], b[1] + 7], 3, K(0.6));
    o.save(); o.translate(a[0], a[1]); o.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
    o.fillStyle = WH(0.75); o.beginPath(); o.ellipse(0, 0, 10, 16, 0, 0, TAU); o.fill(); strokePath(o, (g) => g.ellipse(0, 0, 10, 16, 0, 0, TAU), 3, K(0.9));
    o.fillStyle = K(0.9); o.beginPath(); o.ellipse(0, 0, 4, 8, 0, 0, TAU); o.fill();
    o.fillStyle = WH(0.4); o.fillRect(12, -14, 40, 28); for (let k = 0; k < 6; k++) seg(o, [16 + k * 6, -13], [16 + k * 6, 13], 2, K(0.8));
    o.restore();
  }
}

function table(P) {
  // wooden bench far right: top, rails, bracket blocks with bolts, the front leg
  fillG(P, poly([[1790, 150], [2250, 140], [2250, 212], [1790, 214]]), grad(1790, 0, 2206, 0, [[0.12, 0.06], [0.38, 0.04], [0.62, 0.13], [0.88, 0.08]]), 0.02, { spacing: 0.3 });
  fillG(P, poly([[1780, 246], [2250, 240], [2250, 272], [1780, 282]]), grad(1780, 0, 2206, 0, [[0.12, 0.24], [0.38, 0.1], [0.62, 0.14], [0.88, 0.02]]), 0.02, { spacing: 0.3 });
  fillG(P, poly([[1780, 302], [2250, 300], [2250, 340], [1780, 340]]), grad(1780, 0, 2206, 0, [[0.12, 0.07], [0.38, 0.16], [0.88, 0.18]]), 0.0, { spacing: 0.3 });
  fillG(P, poly([[1992, 188], [2060, 186], [2062, 640], [1994, 640]]), grad(0, 380, 0, 640, [[0.17, 0.35], [0.5, 0.27], [0.83, 0.21]]), V, { spacing: 0.3 });
  fillG(P, poly([[2090, 150], [2250, 145], [2250, 184], [2090, 186]]), 0.1, 0, { spacing: 0.3 });
  const o = P.o;
  line(o, [[1790, 214], [2250, 210]], 3, WH(0.6)); line(o, [[1780, 302], [2250, 300]], 3.5, WH(0.8)); line(o, [[1780, 246], [2250, 240]], 2.5, WH(0.6));
  line(o, [[1994, 188], [1996, 640]], 3.5, WH(0.85)); line(o, [[2060, 186], [2062, 640]], 2.5, WH(0.5));
  // bracket blocks with bolts
  for (const [x, y] of [[1985, 304], [1985, 342]]) {
    o.fillStyle = WH(0.72); o.beginPath(); o.roundRect(x, y, 110, 36, 6); o.fill(); strokePath(o, (g) => g.roundRect(x, y, 110, 36, 6), 3, K(0.9));
    for (const bx of [x + 18, x + 54, x + 90]) { o.fillStyle = K(0.9); o.beginPath(); o.ellipse(bx, y + 18, 7, 9, 0, 0, TAU); o.fill(); strokePath(o, (g) => g.ellipse(bx, y + 18, 7, 9, 0, 0, TAU), 1.6, WH(0.8)); }
  }
  o.fillStyle = WH(0.7); o.beginPath(); o.roundRect(1985, 188, 110, 74, 8); o.fill(); strokePath(o, (g) => g.roundRect(1985, 188, 110, 74, 8), 3, K(0.9));
  hatchIn(o, (g) => g.roundRect(1985, 188, 110, 74, 8), [1985, 188, 2095, 262], V, 7, 2.5, K(0.6), { seed: 71 });
  // dark gear on the bench top, a lit top edge
  fillG(P, poly([[1790, 96], [1928, 78], [2250, 66], [2250, 150], [1790, 152]]), 0.06, 0, { style: 2 });
  line(o, [[1790, 96], [1928, 78], [2250, 66]], 2.5, WH(0.55));
  // dotted strip of gear on the bench top (a far keyboard's key tops)
  for (let k = 0; k < 20; k++) seg(o, [2100 + k * 7, 160], [2100 + k * 7, 170], 2, WH(0.5));
  line(o, [[2045, 150], [2250, 145]], 2, WH(0.45));
}

function keyboard(P) {
  // the synth: back edge, control strip (dark switch band + grey button panel), key bed (22 white keys in
  // perspective), front lip, right panel. Key bed quad from column scans of the owl-free median (white-key back
  // edge at the E-F / B-C gaps, key fronts along the bed); the 15 black-key front ends then land at v = 0.59 ± 0.01
  // and u (white-key units) 0.85 1.94 | 3.76 4.67 5.68 | 7.52 8.6 | 10.49 11.59 12.67 | 14.65 15.76 | 17.65 18.81 19.97
  const o = P.o;
  const BL = [1418, 674], BR = [2040, 735], FR = [2045, 898], FL = [1356, 766];
  // body: dark (flat), the end cheek at the left
  fillG(P, poly([[1440, 584], [2260, 632], [2260, 990], [2040, 990], [1350, 830], [1332, 770]]), 0.05, 0, { style: 2 });
  // control strip: grey button panel above the keys (dark switch band above it stays black)
  fillG(P, poly([[1446, 632], [2042, 668], [2040, 735], [1418, 674]]), grad(1446, 0, 2042, 0, [[0.1, 0.42], [0.3, 0.48], [0.5, 0.45], [0.7, 0.4], [0.9, 0.35]]), 0, { style: 2 });
  // right panel with knobs
  fillG(P, poly([[2046, 636], [2260, 642], [2260, 990], [2050, 990]]), grad(0, 640, 0, 946, [[0.12, 0.26], [0.38, 0.4], [0.62, 0.42], [0.88, 0.22]]), 0, { style: 2 });
  // outlines
  line(o, [[1440, 584], [1800, 606], [2260, 634]], 4, WH(0.9));
  line(o, [[1440, 584], [1332, 770], [1350, 830]], 4, WH(0.85));
  line(o, [[1452, 598], [1412, 676]], 2.5, WH(0.5));
  line(o, [[1350, 830], [1700, 895], [2060, 960]], 3.5, WH(0.55));
  line(o, [[1446, 632], [2042, 668]], 2.5, WH(0.6));
  line(o, [[2046, 636], [2050, 990]], 3, K(0.8)); line(o, [[2052, 638], [2056, 990]], 2, WH(0.7));
  // key bed: white keys (bright flat tone), the thin lit front faces below them
  fillG(P, poly([BL, BR, FR, FL]), 0.92, 0, { style: 2 });
  fillG(P, poly([FL, FR, [2045, 910], [1356, 778]]), 0.72, 0, { style: 2 });
  const at = (u, v) => bil(BL, BR, FR, FL, u, v);
  const N = 22;
  const AN = [[0, 0.22], [5.46, 5.68], [12.46, 12.67], [19.46, 19.97], [22, 22.3]];
  const map = (x) => { for (let i = 1; i < AN.length; i++) if (x <= AN[i][0]) { const [a0, b0] = AN[i - 1], [a1, b1] = AN[i]; return (b0 + (b1 - b0) * (x - a0) / (a1 - a0)) / N; } return 1; };
  for (let k = 0; k <= N; k++) { const u = map(k); if (u <= 0.005 || u >= 0.995) continue; line(o, [at(u, 0), at(u, 0.5), at(u, 1)], 2.2, K(0.85), { end: 0.6 }); line(o, [at(u, 1), at(u, 1.08)], 2, K(0.7)); }
  line(o, [FL, lerp2(FL, FR, 0.5), FR], 2.5, K(0.8));
  line(o, [BL, lerp2(BL, BR, 0.5), BR], 3, K(0.95));
  // black keys
  const BK = [0.85, 1.94, 3.76, 4.67, 5.68, 7.52, 8.6, 10.49, 11.59, 12.67, 14.65, 15.76, 17.65, 18.81, 19.97];
  for (const b of BK) {
    const u0 = (b - 0.3) / N, u1 = (b + 0.3) / N, v1 = 0.6;
    const q = [at(u0, -0.02), at(u1, -0.02), at(u1, v1), at(u0, v1)];
    o.fillStyle = K(0.97); o.beginPath(); poly(q)(o); o.fill();
    const f0 = at(u0 + 0.002, v1 - 0.08), f1 = at(u1 - 0.002, v1 - 0.08), f2 = at(u1 - 0.002, v1), f3 = at(u0 + 0.002, v1);
    o.fillStyle = WH(0.5); o.beginPath(); poly([f0, f1, f2, f3])(o); o.fill();
    line(o, [at(u0 + 0.004, 0.02), at(u0 + 0.004, v1 - 0.09)], 1.6, WH(0.45));
  }
  // switch band: a row of small lit toggles; the button panel: two rows of dark rounded buttons
  for (let i = 0; i < 18; i++) {
    const x = 1560 + i * 26, y = 600 + (x - 1440) * 0.062;
    if (x > 2030) break;
    seg(o, [x, y + 2], [x - 2, y + 16], 4, WH(0.85)); seg(o, [x + 3, y + 2], [x + 1, y + 16], 2, K(0.9));
  }
  const S = (u, v) => bil([1446, 632], [2042, 668], [2040, 735], [1418, 674], u, v);
  for (let i = 0; i < 16; i++) for (const v of [0.35, 0.7]) {
    const p = S(0.2 + i * 0.05, v);
    if (p[0] > 2030) continue;
    o.fillStyle = K(0.9); o.beginPath(); o.ellipse(p[0], p[1], 12, 5.5, 0.06, 0, TAU); o.fill();
    strokePath(o, (g) => g.ellipse(p[0], p[1], 12, 5.5, 0.06, 0, TAU), 1.6, WH(0.75));
  }
  for (const [x, y] of [[1470, 612], [1500, 615], [1532, 618]]) strokePath(o, (g) => g.arc(x, y, 12, Math.PI, TAU), 3, WH(0.8));
  // right panel buttons and knobs
  for (const [x, y] of [[2092, 690], [2092, 720], [2170, 694], [2172, 724]]) { o.fillStyle = K(0.9); o.beginPath(); o.roundRect(x - 22, y - 9, 44, 18, 8); o.fill(); strokePath(o, (g) => g.roundRect(x - 22, y - 9, 44, 18, 8), 2, WH(0.8)); }
  for (const [x, y] of [[2108, 780], [2186, 790], [2112, 842], [2190, 860]]) {
    o.fillStyle = K(0.95); o.beginPath(); o.ellipse(x, y + 6, 24, 20, 0, 0, TAU); o.fill();
    o.fillStyle = WH(0.72); o.beginPath(); o.ellipse(x, y - 2, 20, 16, 0, 0, TAU); o.fill();
    strokePath(o, (g) => g.ellipse(x, y - 2, 20, 16, 0, 0, TAU), 2.5, K(0.9));
    seg(o, [x - 4, y - 12], [x + 4, y + 2], 3, K(0.9));
  }
  for (let k = 0; k < 4; k++) seg(o, [2090 + k * 34, 650], [2090 + k * 34, 668], 3, WH(0.9));
}

// ------------------------------------------------------------------------------------------------ build
// tone gains per object: source / render blurred region means (first pass: case 0.73, speaker front 0.67, side
// panel 0.83, striped boxes 0.75, control strip 0.53, table 0.30, X stand 0.71, monitor 0.49, rack 0.40)
export const TONE = { boxes: 0.91, xstand: 0.95, table: 0.7, rack: 0.63, case: 0.97, books: 0.74, speaker: 0.95, plant: 1.01, crate: 1.09, cables: 0.9, sign: 0.54, keyboard: 1.02 };
// two plates: the room behind the card, and the synth in front of it (its lower-left end hides the card's corner)
export function buildRoom() {
  let P = new Plate(2206 + 2 * M, 946 + 2 * M, 1);
  for (const g of [P.v, P.d, P.o]) g.translate(M, M);
  const G = (k, f) => { GAIN = k; f(P); GAIN = 1; };
  paintBack(P);
  G(TONE.boxes, boxesMid); G(TONE.xstand, xStand); G(TONE.table, table);
  G(TONE.rack, rackAndBox); G(TONE.case, guitarCase); G(TONE.books, booksOnTop); G(TONE.speaker, speaker); G(TONE.plant, plant);
  G(TONE.crate, crate); G(TONE.cables, cables); G(TONE.sign, sign);
  const back = P.engrave({ spacing: 7.5, seed: 5, contrast: 1.1 });
  // front: the synth, cut out by its own silhouette
  P = new Plate(2206 + 2 * M, 946 + 2 * M, 1);
  for (const g of [P.v, P.d, P.o]) g.translate(M, M);
  GAIN = TONE.keyboard; keyboard(P); GAIN = 1;
  const front = P.engrave({ spacing: 7.5, seed: 6, contrast: 1.1 });
  const fg = front.getContext("2d");
  fg.save(); fg.globalCompositeOperation = "destination-in"; fg.translate(M, M);
  fg.beginPath(); KEYBOARD_SIL(fg); fg.fillStyle = "#fff"; fg.fill(); fg.restore();
  return { back, front };  // canvases (2206 + 2M) x (946 + 2M); frame (0,0) is at (M, M)
}
export const KEYBOARD_SIL = poly([[1438, 578], [2270, 626], [2270, 1000], [2040, 1000], [1346, 834], [1326, 770]]);
