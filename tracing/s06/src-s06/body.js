// The hoodie (both shoulders, lit from the screen below) and the laptop lid across the bottom. Measured at 27.0 s.
import { taper } from "../../lib/ink.js";
import { sampleCurve, smoothPath } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
import { poly, gv, line, hatch, soft } from "./kit.js";

export const SLEEVE_L = [[16, 946], [46, 886], [90, 796], [112, 730], [124, 690], [150, 652], [200, 630], [250, 614], [300, 597], [350, 580], [400, 560], [450, 540], [500, 516], [545, 492], [550, 540], [557, 607], [563, 647], [583, 687], [613, 720], [647, 747], [680, 777], [712, 830], [712, 946]];
const TOP_L = [[124, 690], [150, 652], [200, 630], [250, 614], [300, 597], [350, 580], [400, 560], [450, 540], [500, 516], [545, 492]];
export const SHOULDER_R = [[1180, 946], [1236, 830], [1300, 740], [1360, 660], [1410, 600], [1440, 555], [1470, 510], [1500, 488], [1535, 476], [1552, 520], [1570, 560], [1640, 578], [1720, 590], [1800, 598], [1856, 612], [1902, 652], [1936, 712], [1962, 782], [1990, 862], [2032, 946]];
const TOP_R = [[1570, 560], [1640, 578], [1720, 590], [1800, 598], [1856, 612], [1902, 652], [1936, 712], [1962, 782], [1990, 862], [2032, 946]];

function folds(g, clipPts, box, list, seed) {
  const r = rng(seed);
  g.save(); g.beginPath(); poly(clipPts)(g); g.clip();
  for (const [pts, w, a] of list) line(g, pts, w, `rgba(25,25,25,${a})`, { a: 0.05, bias: 0.3 });
  g.restore();
}

// The fabric: near-white cloth hatched where it turns away from the screen light (shoulder tops, outer arm, the rise
// by the neck), with long fold strokes and seams inked on top.
const yOn = (P, x) => { for (let i = 0; i < P.length - 1; i++) { const [x0, y0] = P[i], [x1, y1] = P[i + 1]; if ((x - x0) * (x - x1) <= 0 && x0 !== x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return x < P[0][0] ? P[0][1] : P[P.length - 1][1]; };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const yOnX = (y) => { const P = TOP_R; for (let i = 0; i < P.length - 1; i++) { const [x0, y0] = P[i], [x1, y1] = P[i + 1]; if ((y - y0) * (y - y1) <= 0 && y0 !== y1) return x0 + (x1 - x0) * (y - y0) / (y1 - y0); } return y < P[0][1] ? P[0][0] : P[P.length - 1][0]; };

export function drawBody(g) {
  // left sleeve: near-white cloth, hatched where it turns away: along the shoulder top, and the outer arm
  g.fillStyle = gv(0.9); g.beginPath(); poly(SLEEVE_L)(g); g.fill();
  g.save(); g.beginPath(); poly(SLEEVE_L)(g); g.clip();
  const dL = (x, y) => y - yOn(TOP_L, Math.max(146, x));   // depth below the shoulder line
  soft(g, null, (c) => c.ellipse(50, 880, 90, 220, 0.3, 0, 7), "rgba(60,60,60,0.5)", 30);
  // the shoulder top: regular two-direction cross-hatching (source: a clean engraved cross-hatch, not a scribble)
  hatch(g, null, [100, 470, 560, 760], { dir: () => 1.12, dens: (x, y) => clamp01(1.5 - dL(x, y) / 70), sp: 4, len: 34, w: 1.9, color: "rgba(20,20,20,0.55)", seed: 71, jit: 0.12, lenJit: 0.25, bend: 0.02 });
  hatch(g, null, [100, 470, 560, 720], { dir: () => -0.25, dens: (x, y) => clamp01(1.4 - dL(x, y) / 50), sp: 4, len: 30, w: 1.6, color: "rgba(20,20,20,0.48)", seed: 72, jit: 0.12, lenJit: 0.25, bend: 0.02 });
  hatch(g, null, [0, 600, 720, 946], { dir: (x, y) => 1.18 + (x - 300) * 0.0003, dens: (x, y) => 0.12 + 0.4 * clamp01(1 - dL(x, y) / 220), sp: 4.5, len: 70, w: 1.5, color: "rgba(25,25,25,0.45)", seed: 73, lenJit: 0.6 });
  hatch(g, null, [0, 620, 260, 946], { dir: () => 1.28, dens: (x, y) => clamp01(1.1 - (x - (40 + (y - 620) * -0.1)) / 140), sp: 3.4, len: 60, w: 1.8, color: "rgba(20,20,20,0.6)", seed: 74 });
  g.restore();
  // right shoulder: the same, mirrored; the rise by the neck under the hair is in shade
  g.fillStyle = gv(0.91); g.beginPath(); poly(SHOULDER_R)(g); g.fill();
  g.save(); g.beginPath(); poly(SHOULDER_R)(g); g.clip();
  const dR = (x, y) => y - yOn(TOP_R, Math.min(2032, Math.max(1570, x)));
  // the owl's own shadow on the shoulder right under its body and feet
  soft(g, null, (c) => c.ellipse(1672, 592, 120, 20, 0.04, 0, 7), "rgba(40,40,40,0.35)", 8);
  hatch(g, (c) => c.ellipse(1672, 594, 125, 24, 0.04, 0, 7), [1540, 565, 1800, 622], { dir: () => 0.1, dens: () => 0.85, sp: 2.8, len: 30, w: 1.5, color: "rgba(18,18,18,0.55)", seed: 75, jit: 0.2 });
  // under the owl: a cast shadow hatched along the shoulder curve, fading down the fabric
  hatch(g, null, [1530, 540, 1830, 680], { dir: () => 0.12, dens: (x, y) => clamp01(1.25 - dR(x, y) / 60) * (0.6 + 0.4 * clamp01((1800 - x) / 120)), sp: 3.2, len: 34, w: 1.7, color: "rgba(22,22,22,0.55)", seed: 76, jit: 0.15, lenJit: 0.3, bend: 0.03 });
  hatch(g, null, [1540, 540, 2040, 760], { dir: () => 1.75, dens: (x, y) => clamp01(1.1 - dR(x, y) / 70), sp: 3.6, len: 30, w: 1.5, color: "rgba(22,22,22,0.45)", seed: 77, jit: 0.15, lenJit: 0.3 });
  // the outer upper arm turning away: a hatch band whose density rises toward the silhouette
  const edgeX = (y) => yOnX(y);
  hatch(g, null, [1760, 560, 2040, 946], { dir: () => 2.0, dens: (x, y) => 0.3 + 0.6 * clamp01((x - (edgeX(y) - 120)) / 110), sp: 3.2, len: 44, w: 1.6, color: "rgba(20,20,20,0.58)", seed: 80, jit: 0.2, lenJit: 0.4 });
  hatch(g, null, [1800, 600, 2040, 946], { dir: () => 2.55, dens: (x, y) => 0.8 * clamp01((x - (edgeX(y) - 70)) / 60), sp: 4, len: 36, w: 1.4, color: "rgba(20,20,20,0.45)", seed: 82, jit: 0.2, lenJit: 0.4 });
  hatch(g, null, [1180, 440, 2040, 946], { dir: (x) => 1.9 - (x - 1700) * 0.0003, dens: () => 0.14, sp: 4.5, len: 70, w: 1.5, color: "rgba(25,25,25,0.4)", seed: 78, lenJit: 0.6 });
  hatch(g, null, [1400, 460, 1600, 700], { dir: () => 1.25, dens: (x, y) => clamp01(1.3 - Math.hypot((x - 1490) / 90, (y - 520) / 110)), sp: 3.2, len: 36, w: 1.9, color: "rgba(20,20,20,0.62)", seed: 79 });
  g.restore();
  // long fold strokes running down from the shoulders
  const r = rng(74);
  const F = [];
  for (let i = 0; i < 30; i++) {
    const t = r(), k = Math.floor(t * (TOP_L.length - 1)), u = t * (TOP_L.length - 1) - k;
    const p = [TOP_L[k][0] + (TOP_L[k + 1][0] - TOP_L[k][0]) * u, TOP_L[k][1] + (TOP_L[k + 1][1] - TOP_L[k][1]) * u + 20 + r() * 50];
    const L = 90 + r() * 170, a = 1.2 + (r() - 0.5) * 0.4;
    F.push([[p, [p[0] + Math.cos(a) * L * 0.5 + 8, p[1] + Math.sin(a) * L * 0.5], [p[0] + Math.cos(a) * L + 10, p[1] + Math.sin(a) * L]], 1.1 + r() * 1.4, 0.3 + 0.35 * r()]);
  }
  folds(g, SLEEVE_L, null, F, 75);
  line(g, TOP_L, 2.2, "rgba(20,20,20,0.8)", { a: 0.4 });
  line(g, [[150, 700], [250, 662], [350, 628], [450, 590], [520, 560]], 2.2, "rgba(20,20,20,0.75)", { a: 0.2 });
  const F2 = [];
  const r2 = rng(80);
  for (let i = 0; i < 30; i++) {
    const t = r2(), k = Math.floor(t * (TOP_R.length - 1)), u = t * (TOP_R.length - 1) - k;
    const p = [TOP_R[k][0] + (TOP_R[k + 1][0] - TOP_R[k][0]) * u - 10, TOP_R[k][1] + (TOP_R[k + 1][1] - TOP_R[k][1]) * u + 20 + r2() * 40];
    const L = 90 + r2() * 170, a = 1.8 + (r2() - 0.5) * 0.35;
    F2.push([[p, [p[0] + Math.cos(a) * L * 0.5 - 6, p[1] + Math.sin(a) * L * 0.5], [p[0] + Math.cos(a) * L - 8, p[1] + Math.sin(a) * L]], 1.1 + r2() * 1.4, 0.28 + 0.3 * r2()]);
  }
  for (let i = 0; i < 14; i++) {
    const x = 1440 + r2() * 180, y = 500 + r2() * 140, L = 80 + r2() * 120, a = 1.9 + (r2() - 0.5) * 0.3;
    F2.push([[[x, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 1.1 + r2() * 1.2, 0.28 + 0.3 * r2()]);
  }
  folds(g, SHOULDER_R, null, F2, 81);
  line(g, TOP_R, 2.2, "rgba(20,20,20,0.8)", { a: 0.4 });
  // the shoulder seam curving over to the outer arm
  line(g, [[1620, 590], [1700, 606], [1790, 632], [1860, 668], [1905, 715], [1932, 770]], 1.9, "rgba(20,20,20,0.7)", { a: 0.15 });
}

// The laptop lid: black, a dark top edge line, then an engraved lit rim (source 27.0, x = 300-1800: dark edge at
// y 813-815, a bright band 816-827 of horizontal scratch highlights, a dark groove 828-829, a second lit line 830-832).
export function drawLaptop(g) {
  const top = 814, rad = 24;
  const L0 = 228, R0 = 1893, L1 = 243, R1 = 1878;
  const shape = (c) => {
    c.moveTo(L1, 946); c.lineTo(L0 + 1, top + rad); c.quadraticCurveTo(L0, top, L0 + rad, top);
    c.lineTo(R0 - rad, top); c.quadraticCurveTo(R0, top, R0 - 1, top + rad); c.lineTo(R1, 946); c.closePath();
  };
  g.fillStyle = "#050505"; g.beginPath(); shape(g); g.fill();
  g.save(); g.beginPath(); shape(g); g.clip();
  const r = rng(808);
  g.fillStyle = gv(0.6); g.fillRect(200, top + 2, 1720, 11);
  for (let i = 0; i < 70; i++) {
    const y = top + 2.5 + r() * 10, x = 220 + r() * 1650, L = 60 + r() * 420, v = r() < 0.75 ? 0.78 + 0.16 * r() : 0.38 + 0.15 * r();
    g.fillStyle = gv(v); g.fillRect(x, y, L, 0.8 + r() * 0.9);
  }
  g.fillStyle = gv(0.34); g.fillRect(200, top + 14, 1720, 1.6);
  g.fillStyle = gv(0.66); g.fillRect(200, top + 16.5, 1720, 2.4);
  for (let i = 0; i < 20; i++) { const x = 220 + r() * 1650, L = 40 + r() * 200; g.fillStyle = gv(0.8); g.fillRect(x, top + 16.8, L, 1); }
  const lg = g.createLinearGradient(0, top + 19, 0, top + 24);
  lg.addColorStop(0, gv(0.25)); lg.addColorStop(1, gv(0.03));
  g.fillStyle = lg; g.fillRect(200, top + 19, 1720, 5);
  // side rims
  g.strokeStyle = gv(0.14); g.lineWidth = 6;
  g.beginPath(); g.moveTo(L0 + 4, top + rad); g.lineTo(L1 + 3, 946); g.stroke();
  g.beginPath(); g.moveTo(R0 - 4, top + rad); g.lineTo(R1 - 3, 946); g.stroke();
  g.restore();
  g.strokeStyle = "#101010"; g.lineWidth = 2.5; g.beginPath(); shape(g); g.stroke();
}
