// s18 shot A plate (53.24–55.24): the synth corner from the illustration, locked off (camtrack: s = 1.0000,
// drift < 0.2 px). Every object was placed from 2x grids of the source background (the median of the shot's frames
// with the owl removed). Frame coordinates.
import { Plate } from "../../lib/engrave.js";
import { poly, blob, ell, rect, lin, rad, ink, blk, line, curve, stripes, quadAt, leaf, rng, INK, DARK, PI, taper, smoothPath } from "./kit.js";

const V = PI / 2;   // vertical stroke direction

// The keyboard, in frame coordinates. Black-key front ends were matched to the close-up (shot B) through
// B = 3.357 * A - 1662 (same keyboard, ~3.4x closer).
export const KEYS_A = {
  front: 638, back: 566, x0: 650, x1: 1226,
  gaps: [690, 733, 774, 816, 852, 898, 940, 979, 1017, 1060, 1104, 1147, 1188],
  blackEnds: [692, 793, 855, 928, 1011, 1064, 1138, 1210],
};

function box(P, q, v, { angle = V, spacing = 0.35, style = 0 } = {}) { P.fill(poly(q), v, angle, { spacing, style }); }

// knob on the mixer face: black disc, white reversed-C highlight
function knob(o, x, y, r, seed) {
  const rr = rng(seed);
  o.fillStyle = "#050505"; o.beginPath(); o.ellipse(x, y, r * 0.95, r * 1.08, 0, 0, 7); o.fill();
  o.strokeStyle = ink(0.28); o.lineWidth = 1.3; o.beginPath(); o.ellipse(x, y, r * 0.95, r * 1.08, 0, 1.7, 3.6); o.stroke();
  const pts = [];
  for (let i = 0; i <= 10; i++) { const a = -2.3 + i * 0.26; pts.push([x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.55]); }
  pts.push([x + r * 0.05, y + r * 0.35]);
  taper(o, pts, (u) => 3.2 * Math.pow(Math.sin(PI * u), 0.5) + 0.3, ink(0.92));
  o.fillStyle = ink(0.95); o.beginPath(); o.arc(x + r * 0.06 + (rr() - 0.5) * 2, y + r * 0.5, 1.8, 0, 7); o.fill();
}

// a thick cable: dark body with a pale rim line on the lit side
function cable(o, pts, w, seed, rim = 0.55) {
  curve(o, pts, w, "#050505", seed, { ends: 0.9 });
  const off = pts.map(([x, y]) => [x - w * 0.28, y]);
  curve(o, off, 1.6, ink(rim), seed + 1, { ends: 0.2 });
}

export function paintRoomA(P) {
  const o = P.o;
  const r = rng(181);

  // ---------------------------------------------------------------- far wall, top left: sparse lit stripes
  P.fill(rect(398, 0, 222, 138), 0.04, V, { spacing: 0.4 });
  stripes(o, [[398, -4], [620, -4], [620, 138], [398, 138]], 11, { w: [2.5, 6], color: ink(0.82), seed: 3, len: [0.55, 1], wav: 0.01 });
  stripes(o, [[540, -4], [615, -4], [615, 130], [540, 130]], 5, { w: [3, 7], color: ink(0.9), seed: 4, len: [0.7, 1] });

  // ---------------------------------------------------------------- box 1 (dark, light grain) under the lids
  const B1 = [[665, 98], [795, 96], [795, 246], [665, 246]];
  box(P, B1, 0.06);
  stripes(o, [[668, 104], [792, 102], [792, 246], [668, 246]], 12, { w: [1.5, 3.5], color: ink(0.62), seed: 5, len: [0.6, 1], wav: 0.008 });
  line(o, [[618, 90], [700, 89], [850, 87]], 3, ink(0.8), 6);
  line(o, [[615, 96], [660, 96]], 2, ink(0.5), 7);

  // ---------------------------------------------------------------- the lids stacked on top (thin boards)
  const board = [[610, 78], [655, 14], [762, 28], [940, 79], [932, 86], [612, 86]];
  box(P, board, 0.1, { angle: 0.25 });
  line(o, [[655, 16], [700, 22], [762, 30]], 3.2, ink(0.85), 8);
  line(o, [[612, 80], [760, 81], [932, 82]], 2.2, ink(0.35), 9);
  const lidTop = [[760, 30], [868, 1], [1074, 30], [938, 76]];
  P.fill(poly(lidTop), lin(760, 30, 1074, 30, [[0, 0.8], [1, 0.9]]), 0.24, { spacing: 0.15, style: 2 });
  stripes(o, [[760, 30], [868, 1], [1074, 30], [938, 76]], 9, { dir: "u", w: [1.2, 2.6], color: blk(0.75), seed: 10, len: [0.5, 0.95], wav: 0.01 });
  line(o, [[760, 31], [850, 55], [938, 77]], 3, ink(0.8), 11);
  line(o, [[938, 77], [1000, 55], [1074, 31]], 2.6, blk(0.9), 12);
  line(o, [[760, 30], [868, 2], [1074, 30]], 1.8, ink(0.7), 13);

  // ---------------------------------------------------------------- tall box behind (right of the lids)
  const TB = [[1050, -4], [1462, -4], [1462, 282], [1050, 282]];
  box(P, TB, 0.2);
  stripes(o, TB, 30, { w: [2, 6], color: ink(0.8), seed: 14, len: [0.5, 1], wav: 0.012, fill: 0.9 });
  // lit vertical edge strip
  P.fill(rect(1340, -4, 62, 286), 0.62, V, { spacing: 0.3 });
  stripes(o, [[1340, -4], [1402, -4], [1402, 282], [1340, 282]], 6, { w: [2, 4], color: blk(0.8), seed: 15, len: [0.6, 1] });
  // dark window with a lit frame, and a dark label to its right
  o.fillStyle = "#070707"; o.fillRect(1250, 47, 73, 88);
  o.strokeStyle = ink(0.8); o.lineWidth = 3; o.strokeRect(1247, 44, 79, 94);
  o.fillStyle = ink(0.55); o.fillRect(1256, 60, 60, 5); o.fillRect(1256, 118, 60, 4);
  o.fillStyle = "#080808"; o.fillRect(1404, 55, 54, 54);
  o.strokeStyle = ink(0.5); o.lineWidth = 2; o.strokeRect(1404, 55, 54, 54);
  // box to the far right of the lids (its stripes show above box 2)
  stripes(o, [[1052, 8], [1118, 8], [1118, 100], [1052, 100]], 5, { w: [3, 6], color: ink(0.85), seed: 16, len: [0.8, 1] });

  // ---------------------------------------------------------------- box 2 (lit face, dark grooves)
  const B2 = [[845, 97], [1110, 146], [1110, 280], [845, 280]];
  box(P, B2, 1.0, { spacing: 0.1, style: 2 });
  stripes(o, [[845, 97], [1110, 146], [1110, 280], [845, 280]], 22, { w: [1.2, 4.2], color: blk(0.9), seed: 17, len: [0.3, 0.9], wav: 0.006, taperEnds: 0.1 });
  const B2top = [[845, 97], [915, 86], [1072, 100], [1110, 146]];
  box(P, B2top, 0.5, { angle: 0.1 });
  stripes(o, B2top, 5, { dir: "u", w: [1.5, 3], color: blk(0.7), seed: 18 });
  line(o, [[845, 97], [1110, 146]], 2.6, blk(0.95), 19);
  line(o, [[845, 97], [845, 280]], 2.4, ink(0.7), 20);

  // ---------------------------------------------------------------- lit panel right of the mixer, behind the keys
  const RP = [[1440, 262], [1512, 262], [1512, 540], [1440, 540]];
  P.fill(poly(RP), 0.45, V, { spacing: 0.3 });
  stripes(o, RP, 7, { w: [2, 5], color: blk(0.85), seed: 21, len: [0.5, 1] });
  for (const [q, v, n, sd] of [
    [[[1432, 539], [1500, 539], [1500, 698], [1432, 698]], 0.95, 8, 22],
    [[[1355, 530], [1412, 530], [1412, 596], [1355, 596]], 0.95, 6, 23],
    [[[1239, 520], [1340, 520], [1340, 550], [1239, 550]], 0.8, 8, 24],
  ]) { P.fill(poly(q), v, V, { spacing: 0.1, style: 2 }); stripes(o, q, n, { w: [1.5, 4.5], color: blk(0.9), seed: sd, len: [0.5, 1] }); }

  // ---------------------------------------------------------------- plant: heart leaves hanging on a vine
  const leaves = [[1515, 14, 78, 1.75], [1546, 116, 55, 1.4], [1519, 192, 50, 1.62], [1620, -2, 44, 1.7], [1655, 28, 55, 1.62]];
  curve(o, [[1512, 0], [1525, 60], [1540, 110], [1530, 160], [1518, 190]], 2.2, ink(0.35), 22);
  curve(o, [[1640, 0], [1655, 26]], 2, ink(0.3), 23);
  for (const [x, y, L, a] of leaves) {
    const q = leaf(x, y, L, a, 0.66);
    P.fill(blob(q), 0.78, a, { spacing: 0.2, style: 2 });
    o.strokeStyle = ink(0.9); o.lineWidth = 1.6; o.beginPath(); smoothPath(o, q, true); o.stroke();
    const c = Math.cos(a), s = Math.sin(a);
    line(o, [[x + c * L * 0.05, y + s * L * 0.05], [x + c * L * 0.9, y + s * L * 0.9]], 2.2, "#0a0a0a", 24);
    for (let k = 1; k <= 3; k++) {
      const u = k * 0.22, px = x + c * L * u, py = y + s * L * u;
      for (const sd of [-1, 1]) line(o, [[px, py], [px + c * L * 0.14 - s * sd * L * 0.2, py + s * L * 0.14 + c * sd * L * 0.2]], 1.2, "rgba(10,10,10,0.8)", 25 + k);
    }
  }

  // ---------------------------------------------------------------- vent grille and rack on the far right
  P.fill(rect(1932, 72, 100, 102), 0.03, 0, { spacing: 0.4 });
  o.fillStyle = ink(0.75);
  for (let y = 78; y < 170; y += 9) for (let x = 1936; x < 2028; x += 9) { if (r() < 0.12) continue; o.fillRect(x + (y % 2) * 1, y, 5, 5.5); }
  // rack unit: pale frame, label panel, two knobs, an arched cable over the top
  const RK = [[2032, 166], [2110, 166], [2110, 690], [2032, 690]];
  box(P, RK, 0.14);
  line(o, [[2032, 166], [2032, 690]], 3.2, ink(0.85), 30);
  line(o, [[2052, 170], [2052, 690]], 2.2, ink(0.6), 31);
  o.strokeStyle = ink(0.75); o.lineWidth = 2.4; o.strokeRect(2058, 200, 44, 60);
  stripes(o, [[2060, 205], [2100, 205], [2100, 255], [2060, 255]], 6, { dir: "u", w: [2, 3], color: ink(0.7), seed: 32 });
  for (const [x, y] of [[2074, 308], [2074, 358]]) { o.fillStyle = "#060606"; o.beginPath(); o.ellipse(x, y, 11, 14, 0, 0, 7); o.fill(); o.strokeStyle = ink(0.85); o.lineWidth = 2.4; o.stroke(); }
  curve(o, [[2074, 190], [2082, 168], [2100, 160], [2118, 168], [2128, 200], [2130, 320], [2128, 520], [2126, 690]], 4.2, ink(0.7), 33);
  curve(o, [[2086, 196], [2096, 176], [2112, 174], [2120, 200], [2120, 400], [2118, 690]], 2, ink(0.45), 34);
  stripes(o, [[2060, 390], [2108, 390], [2108, 680], [2060, 680]], 5, { w: [2, 4], color: ink(0.55), seed: 35, len: [0.4, 1] });

  // ---------------------------------------------------------------- books on the speaker
  const books = [
    // [x0, y0, x1, y1, end x (fore-edge starts), yEnd0, yEnd1]
    [1586, 160, 1936, 224, 1820, 152, 218],
    [1562, 222, 1978, 282, 1830, 210, 276],
    [1555, 280, 1996, 346, 1850, 272, 340],
  ];
  books.forEach(([x0, y0, x1, y1, xe, e0, e1], i) => {
    const side = [[x0, y0 + 8], [xe, e0 + 6], [xe, e1 + 4], [x0, y1]];
    P.fill(poly(side), lin(x0, 0, xe, 0, [[0, 0.16], [1, 0.3]]), 0.02, { spacing: 0.3 });
    stripes(o, side, 9, { dir: "u", w: [1.6, 3.4], color: ink(0.85), seed: 40 + i, len: [0.5, 1], wav: 0.02 });
    const end = [[xe, e0 + 6], [x1, y0 + 2], [x1, y1 - 2], [xe, e1 + 4]];
    P.fill(poly(end), lin(xe, 0, x1, 0, [[0, 0.85], [1, 0.72]]), 0.05, { spacing: 0.2, style: 2 });
    stripes(o, end, 5, { dir: "u", w: [0.8, 1.6], color: blk(0.5), seed: 44 + i });
    line(o, [[x0, y1], [xe, e1 + 4], [x1, y1 - 2]], 2.4, "#080808", 47 + i);
    line(o, [[x0, y0 + 8], [xe, e0 + 6], [x1, y0 + 2]], 2, ink(0.8), 50 + i);
    line(o, [[xe, e0 + 6], [xe, e1 + 4]], 2.2, blk(0.9), 53 + i);
  });

  // ---------------------------------------------------------------- the speaker: dark front, lit side
  const SF = [[1536, 364], [1886, 347], [1886, 950], [1536, 950]];
  P.fill(poly(SF), lin(1536, 0, 1886, 0, [[0, 0.1], [0.5, 0.06], [1, 0.09]]), V, { spacing: 0.3 });
  stripes(o, SF, 40, { w: [0.7, 1.8], color: ink(0.35), seed: 60, len: [0.3, 0.9], wav: 0.004, fill: 0.5 });
  const SS = [[1886, 347], [2092, 384], [2092, 680], [1886, 680]];
  P.fill(poly(SS), lin(1886, 0, 2092, 0, [[0, 0.95], [0.6, 0.9], [1, 0.8]]), V, { spacing: 0.12, style: 2 });
  stripes(o, SS, 30, { w: [0.8, 2.6], color: blk(0.75), seed: 61, len: [0.4, 1], wav: 0.004 });
  const ST = [[1536, 364], [1556, 342], [1900, 330], [1996, 346], [2092, 384], [1886, 347]];
  box(P, ST, 0.45, { angle: 0.05 });
  line(o, [[1536, 364], [1886, 347], [2092, 384]], 2.6, ink(0.85), 62);
  line(o, [[1886, 347], [1886, 680]], 2.8, "#090909", 63);
  line(o, [[1538, 364], [1538, 946]], 2, ink(0.6), 64);
  // tweeter
  const [tx, ty] = [1705, 461];
  P.fill(ell(tx, ty, 46, 48), rad(tx, ty, 2, 48, [[0, 0.02], [0.45, 0.02], [0.55, 0.3], [0.8, 0.12], [1, 0.4]]), 0.8, { spacing: 0.1, style: 2 });
  o.strokeStyle = ink(0.8); o.lineWidth = 2.2; o.beginPath(); o.ellipse(tx, ty, 46, 48, 0, 0, 7); o.stroke();
  o.lineWidth = 1.4; o.strokeStyle = ink(0.5); o.beginPath(); o.ellipse(tx, ty, 34, 35, 0, 0, 7); o.stroke();
  o.fillStyle = ink(0.95); o.beginPath(); o.ellipse(tx + 8, ty - 7, 5, 4, 0, 0, 7); o.fill();
  // woofer (Hough on the source: centre 1707,677, R 138): black cone to r 45, bright surround to r 95 with dark
  // grooves, a dark ring, a dim outer band with pale ribs, a bright rim
  const [wx, wy, WR] = [1707, 677, 140];
  P.fill(ell(wx, wy, WR, WR), rad(wx, wy, 1, WR, [[0, 0.02], [0.3, 0.03], [0.36, 0.66], [0.66, 0.62], [0.7, 0.05], [0.78, 0.04], [0.8, 0.22], [0.93, 0.25], [0.95, 0.6], [1, 0.3]]), 0.8, { spacing: 0.1, style: 2 });
  o.save(); o.beginPath(); o.ellipse(wx, wy, WR * 0.66, WR * 0.66, 0, 0, 7); o.clip();
  for (let i = 0; i < 26; i++) {
    const a0 = (i / 26) * 2 * PI + r() * 0.1, a1 = a0 + 0.5 + r() * 0.5, rr = WR * (0.4 + 0.24 * r());
    const pts = []; for (let k = 0; k <= 8; k++) { const a = a0 + (a1 - a0) * k / 8; pts.push([wx + Math.cos(a) * rr, wy + Math.sin(a) * rr]); }
    curve(o, pts, 1.6 + r() * 2.2, blk(0.55 + 0.3 * r()), 70 + i, { ends: 0.1 });
  }
  o.restore();
  o.save(); o.beginPath(); o.ellipse(wx, wy, WR * 0.95, WR * 0.95, 0, 0, 7); o.clip();
  for (let i = 0; i < 64; i++) { const a = (i / 64) * 2 * PI + r() * 0.03; line(o, [[wx + Math.cos(a) * WR * 0.8, wy + Math.sin(a) * WR * 0.8], [wx + Math.cos(a) * WR * 0.93, wy + Math.sin(a) * WR * 0.93]], 1.4 + r(), ink(0.3 + 0.35 * r()), 100 + i); }
  o.restore();
  o.strokeStyle = ink(0.8); o.lineWidth = 3; o.beginPath(); o.ellipse(wx, wy, WR * 0.955, WR * 0.955, 0, 0, 7); o.stroke();
  o.fillStyle = ink(0.95); o.beginPath(); o.ellipse(wx - 10, wy - 16, 7, 6, 0, 0, 7); o.fill();
  o.fillStyle = "#070707"; o.beginPath(); o.ellipse(1827, 826, 11, 12, 0, 0, 7); o.fill(); o.strokeStyle = ink(0.7); o.lineWidth = 2; o.stroke();

  // ---------------------------------------------------------------- books lying bottom right, a small box on them
  const BX = [[2012, 676], [2206, 668], [2206, 744], [2012, 744]];
  P.fill(poly(BX), 0.45, 0, { spacing: 0.25 });
  stripes(o, BX, 5, { dir: "u", w: [2, 4], color: ink(0.8), seed: 97, len: [0.4, 0.9] });
  o.fillStyle = "#080808"; o.fillRect(2040, 700, 70, 24); o.strokeStyle = ink(0.7); o.lineWidth = 2; o.strokeRect(2040, 700, 70, 24);
  line(o, [[2012, 676], [2206, 668]], 2.4, ink(0.85), 100);
  const BR = [[1890, 744], [2206, 740], [2206, 950], [1890, 950]];
  P.fill(poly(BR), lin(0, 744, 0, 946, [[0, 0.62], [1, 0.5]]), 0.0, { spacing: 0.25 });
  for (let i = 0; i < 7; i++) {
    const y = 752 + i * 30 + r() * 6;
    line(o, [[1892, y], [2050, y - 2], [2206, y - 4]], 3 + r() * 2, "#080808", 80 + i);
    line(o, [[1900, y + 9], [2206, y + 5]], 2, ink(0.8), 90 + i);
  }
  stripes(o, BR, 20, { dir: "u", w: [1, 2], color: blk(0.6), seed: 98, len: [0.2, 0.6] });
  line(o, [[1890, 744], [1890, 946]], 2.4, ink(0.7), 99);
  box(P, [[1886, 680], [2012, 676], [2012, 744], [1886, 744]], 0.05, { angle: 0 });

  // ---------------------------------------------------------------- cable + plug under the speaker (bottom)
  curve(o, [[1560, 946], [1580, 890], [1640, 872], [1720, 880], [1800, 900], [1845, 946]], 22, "#101010", 101, { ends: 0.9 });
  curve(o, [[1566, 930], [1590, 882], [1650, 866], [1730, 874], [1805, 896], [1838, 940]], 3, ink(0.8), 102);
  box(P, [[1600, 880], [1670, 868], [1680, 946], [1606, 946]], 0.55, { angle: V });
  stripes(o, [[1600, 880], [1670, 868], [1680, 946], [1606, 946]], 6, { w: [2, 4], color: blk(0.8), seed: 103 });

  // ---------------------------------------------------------------- guitar case (left), leaning
  // black case: a bright double line along its left edge, a four-line rail down the middle (leaning at the top,
  // vertical below the lower latch), two lit buckles; measured line positions on the source background
  const edgeX = (y, k = 0) => 224 + k - 0.113 * (y - 20);
  const GC = [[edgeX(812), 812], [edgeX(-4), -4], [338, -4], [376, 14], [396, 60], [398, 812]];
  P.fill(poly(GC), 0.03, 1.48, { spacing: 0.4 });
  stripes(o, GC, 16, { w: [0.8, 1.8], color: ink(0.22), seed: 110, len: [0.3, 0.9], wav: 0.003, fill: 0.7 });
  line(o, [[edgeX(812), 812], [edgeX(400), 400], [edgeX(-4), -4]], 3.6, ink(0.9), 112);
  line(o, [[edgeX(812, 9), 812], [edgeX(400, 9), 400], [edgeX(-4, 9), -4]], 2.4, ink(0.75), 113);
  const railX = (y) => (y < 600 ? 300 - 0.06 * (y - 20) : 265.2 - 0.004 * (y - 600));
  for (const [dx, w, a] of [[0, 3.2, 0.9], [6, 2.2, 0.75], [19, 3.4, 0.9], [26, 2.2, 0.7]]) {
    const pts = []; for (let y = -4; y <= 812; y += 58) pts.push([railX(y) + dx, y]);
    line(o, pts, w, ink(a), 114 + dx);
  }
  line(o, [[338, -4], [376, 14], [396, 60], [398, 812]], 1.6, ink(0.35), 118);
  line(o, [[352, 350], [355, 420]], 3, ink(0.85), 120);
  // buckles: a bright rounded frame, a lit hatched plate inside
  for (const [x0, y0, x1, y1, s] of [[280, 104, 366, 190, 122], [236, 560, 356, 650, 126]]) {
    P.fill(rect(x0 + 6, y0 + 6, x1 - x0 - 12, y1 - y0 - 12), 0.75, V, { spacing: 0.25 });
    o.strokeStyle = ink(0.95); o.lineWidth = 7; o.beginPath(); o.roundRect(x0, y0, x1 - x0, y1 - y0, 12); o.stroke();
    o.strokeStyle = "#0a0a0a"; o.lineWidth = 2.4; o.beginPath(); o.roundRect(x0 + 12, y0 + 12, x1 - x0 - 24, y1 - y0 - 24, 6); o.stroke();
    stripes(o, [[x0 + 14, y0 + 14], [x1 - 14, y0 + 14], [x1 - 14, y1 - 14], [x0 + 14, y1 - 14]], 7, { w: [1.2, 2.4], color: blk(0.75), seed: s });
    o.fillStyle = "#0a0a0a"; o.fillRect(x1 - 30, y0 + 16, 12, y1 - y0 - 32);
  }
  // curve of another case at the top-left edge
  curve(o, [[0, 128], [14, 60], [44, -4]], 2.6, ink(0.75), 130);

  // ---------------------------------------------------------------- mixer: dark side box, lit front with knobs
  const MS = [[944, 268], [958, 254], [1098, 246], [1098, 502], [944, 512]];
  box(P, MS, 0.035, { spacing: 0.4 });
  line(o, [[944, 270], [958, 255], [1098, 247]], 2.2, ink(0.55), 140);
  line(o, [[1020, 290], [1020, 500]], 2.4, ink(0.55), 141);
  line(o, [[946, 272], [946, 510]], 1.6, ink(0.35), 142);
  box(P, [[1112, 200], [1168, 200], [1168, 247], [1112, 247]], 0.1);
  stripes(o, [[1112, 200], [1168, 200], [1168, 247], [1112, 247]], 5, { dir: "u", w: [1.5, 2.5], color: ink(0.6), seed: 143 });
  const MF = [[1097, 247], [1490, 297], [1487, 527], [1097, 500]];
  P.fill(poly(MF), lin(1097, 0, 1490, 0, [[0, 0.7], [1, 0.6]]), 0.1, { spacing: 0.15, style: 2 });
  stripes(o, MF, 34, { dir: "u", w: [0.8, 2.6], color: blk(0.8), seed: 144, len: [0.4, 1], wav: 0.01 });
  line(o, [[1097, 247], [1490, 297]], 2.4, ink(0.9), 145);
  line(o, [[1097, 247], [1097, 500]], 2.6, ink(0.85), 146);
  line(o, [[1097, 500], [1487, 527]], 2.6, "#080808", 147);
  line(o, [[1490, 297], [1487, 527]], 2.2, ink(0.55), 148);
  const us = [0.1, 0.23, 0.37, 0.5, 0.63, 0.755, 0.88], vs = [0.22, 0.52, 0.82];
  vs.forEach((v, j) => us.forEach((u, i) => { const [x, y] = quadAt(MF, u, v); knob(o, x, y, 17.5, 150 + j * 7 + i); }));
  // patch cables hanging from the bottom row
  for (const [i, dx, s] of [[1, 18, 170], [3, 26, 172], [5, 22, 174]]) {
    const [x, y] = quadAt(MF, us[i], 0.82);
    cable(o, [[x, y + 8], [x + dx * 0.4, y + 40], [x + dx, y + 80], [x + dx * 1.1, y + 120]], 12, s);
  }

  // ---------------------------------------------------------------- keyboard
  const K = KEYS_A;
  // back strip behind the keys and the knob row
  P.fill(rect(420, 508, 1030, 66), 0.03, 0, { spacing: 0.4 });
  const knobX = []; for (let x = 480; x < 1240; x += 62) knobX.push(x + (r() - 0.5) * 8);
  for (const x of knobX) {
    const y = 548 + (x - 480) * 0.004;
    o.fillStyle = "#050505"; o.fillRect(x - 11, y - 30, 22, 34);
    o.fillStyle = ink(0.8); o.beginPath(); o.ellipse(x, y - 30, 11, 3.5, 0, 0, 7); o.fill();
    for (const dx of [-5, 1, 6]) line(o, [[x + dx, y - 24], [x + dx, y - 6]], 1.6, ink(0.5 + 0.3 * r()), 200 + dx);
  }
  // key bed: lit tops
  const KB = [[622, K.back], [K.x1, K.back - 4], [K.x1, K.front], [650, K.front]];
  P.fill(poly(KB), 0.96, 0, { spacing: 0.1, style: 2 });
  // white-key gaps: vertical at the front, turning left at the top (the step where the black keys sit)
  for (const g of K.gaps) {
    line(o, [[g - 16, 596], [g - 4, 600], [g, 606], [g + 1, K.front - 1]], 2.2, "rgba(12,12,12,0.9)", 210 + g);
  }
  // black keys: dark blocks with rounded front ends, a lit top edge
  for (const e of K.blackEnds) {
    const q = [[e - 62, K.back - 2], [e - 12, K.back - 2], [e - 2, 586], [e, 598], [e - 6, 604], [e - 30, 604], [e - 44, 596], [e - 70, 584]];
    o.fillStyle = "#070707"; o.beginPath(); smoothPath(o, q, true); o.fill();
    line(o, [[e - 56, K.back + 1], [e - 14, K.back + 1]], 2, ink(0.55), 230 + e);
    // cast shadow down-left onto the next white key
    o.fillStyle = "rgba(8,8,8,0.55)"; o.beginPath(); o.moveTo(e - 44, 596); o.lineTo(e - 70, 584); o.lineTo(e - 86, 600); o.lineTo(e - 50, 606); o.closePath(); o.fill();
  }
  // keyboard front panel (dark wood, horizontal grain) and the base line
  const KF = [[650, K.front], [K.x1, K.front], [K.x1, 716], [650, 716]];
  P.fill(poly(KF), 0.06, 0, { spacing: 0.4 });
  stripes(o, KF, 12, { dir: "u", w: [1, 2.6], color: ink(0.45), seed: 240, len: [0.15, 0.6] });
  line(o, [[650, K.front + 1], [K.x1, K.front + 1]], 2.4, "#050505", 241);
  // left cheek block: lit top bevel, dark inner face, front face with light grain
  const CT = [[440, 520], [462, 520], [656, 590], [650, 606]];
  P.fill(poly(CT), 0.8, 0.35, { spacing: 0.2 });
  line(o, [[442, 521], [652, 598]], 2.4, ink(0.9), 250);
  box(P, [[430, 526], [650, 606], [650, 716], [430, 640]], 0.02);
  box(P, [[618, 600], [650, 606], [650, 718], [618, 712]], 0.1);
  stripes(o, [[620, 604], [648, 606], [648, 718], [620, 712]], 4, { w: [1.4, 3], color: ink(0.7), seed: 251 });
  line(o, [[402, 585], [604, 664]], 5, ink(0.8), 252);
  line(o, [[400, 592], [598, 670]], 1.6, ink(0.4), 253);
  // sequencer box at the right end of the keys
  box(P, [[1212, 560], [1430, 560], [1430, 720], [1212, 720]], 0.02, { angle: 0 });
  const SQ = [[1230, 607], [1435, 607], [1448, 620], [1448, 653], [1230, 653]];
  box(P, SQ, 0.3, { angle: 0, spacing: 0.3 });
  stripes(o, [[1230, 612], [1446, 612], [1446, 652], [1230, 652]], 7, { dir: "u", w: [1.2, 2.6], color: ink(0.6), seed: 260, len: [0.5, 1] });
  line(o, [[1230, 607], [1435, 607], [1448, 620]], 2.6, ink(0.9), 261);
  line(o, [[1230, 653], [1448, 653]], 2, blk(0.9), 259);
  // cables dropping behind the stand
  cable(o, [[1250, 700], [1215, 740], [1208, 820], [1216, 946]], 10, 262, 0.4);
  cable(o, [[1300, 700], [1270, 760], [1290, 860], [1300, 946]], 10, 264, 0.4);
  cable(o, [[1350, 690], [1330, 740], [1360, 840], [1392, 946]], 11, 266, 0.5);
  cable(o, [[1400, 690], [1392, 740], [1410, 820], [1415, 946]], 10, 268, 0.45);

  // ---------------------------------------------------------------- flight-case stand (front)
  const RL = [[362, 740], [860, 734], [860, 790], [362, 800]];
  P.fill(poly(RL), lin(0, 736, 0, 800, [[0, 0.32], [1, 0.18]]), 0.0, { spacing: 0.3 });
  stripes(o, RL, 7, { dir: "u", w: [1.5, 3.4], color: ink(0.7), seed: 270, len: [0.3, 0.9] });
  line(o, [[362, 741], [860, 734]], 3, ink(0.85), 271);
  const RR = [[985, 730], [1456, 726], [1456, 788], [985, 792]];
  P.fill(poly(RR), lin(985, 0, 1456, 0, [[0, 0.95], [1, 0.85]]), 0, { spacing: 0.15 });
  stripes(o, RR, 9, { dir: "u", w: [1, 2.4], color: blk(0.6), seed: 272, len: [0.2, 0.7] });
  line(o, [[985, 792], [1456, 788]], 2.4, "#060606", 273);
  // bolt at the left end
  o.fillStyle = ink(0.85); o.beginPath(); o.arc(386, 767, 10, 0, 7); o.fill(); o.fillStyle = "#0a0a0a"; o.beginPath(); o.arc(386, 767, 5, 0, 7); o.fill();
  // corner bracket + leg (centre)
  const CB = [[836, 752], [870, 716], [960, 718], [1006, 742], [1000, 806], [975, 842], [938, 832], [908, 812], [880, 812], [844, 800]];
  P.fill(poly(CB), 0.9, V, { spacing: 0.15, style: 2 });
  o.strokeStyle = "#0a0a0a"; o.lineWidth = 2.4; o.beginPath(); poly(CB)(o); o.stroke();
  for (const [x, y, R] of [[881, 758, 9], [960, 742, 11], [958, 764, 7]]) { o.fillStyle = "#0a0a0a"; o.beginPath(); o.arc(x, y, R, 0, 7); o.fill(); o.fillStyle = ink(0.9); o.beginPath(); o.arc(x - 1, y - 1, R * 0.45, 0, 7); o.fill(); }
  P.fill(rect(908, 812, 78, 140), lin(908, 0, 986, 0, [[0, 0.95], [1, 0.75]]), V, { spacing: 0.2 });
  stripes(o, [[908, 812], [986, 812], [986, 950], [908, 950]], 6, { w: [1.2, 3], color: blk(0.8), seed: 280, len: [0.5, 1] });
  line(o, [[986, 810], [986, 946]], 2.4, "#050505", 281);
  // right bracket + leg
  const CR = [[1398, 716], [1450, 712], [1462, 740], [1456, 806], [1418, 810], [1398, 790]];
  P.fill(poly(CR), 0.88, V, { spacing: 0.15, style: 2 });
  o.strokeStyle = "#0a0a0a"; o.lineWidth = 2.2; o.beginPath(); poly(CR)(o); o.stroke();
  o.fillStyle = "#0a0a0a"; o.beginPath(); o.arc(1430, 735, 9, 0, 7); o.fill(); o.fillStyle = ink(0.9); o.beginPath(); o.arc(1429, 734, 4, 0, 7); o.fill();
  P.fill(rect(1394, 806, 60, 146), lin(1394, 0, 1454, 0, [[0, 0.9], [1, 0.65]]), V, { spacing: 0.2 });
  stripes(o, [[1394, 806], [1454, 806], [1454, 950], [1394, 950]], 5, { w: [1.2, 3], color: blk(0.8), seed: 282 });

  // ---------------------------------------------------------------- bottom left: crate, arc, wedge
  const CR1 = [[128, 816], [440, 826], [440, 950], [128, 950]];
  P.fill(poly(CR1), 0.62, V, { spacing: 0.2 });
  stripes(o, CR1, 16, { w: [2.5, 7], color: blk(0.9), seed: 290, len: [0.6, 1] });
  line(o, [[128, 816], [440, 826]], 3, ink(0.9), 291);
  const CR0 = [[0, 800], [128, 806], [128, 950], [0, 950]];
  P.fill(poly(CR0), 0.28, V, { spacing: 0.3 });
  stripes(o, CR0, 6, { w: [2, 4], color: blk(0.8), seed: 292 });
  line(o, [[0, 800], [128, 806]], 2.2, ink(0.6), 293);
  curve(o, [[430, 812], [478, 840], [516, 880], [540, 946]], 3.2, ink(0.8), 294);
  curve(o, [[422, 822], [470, 850], [505, 890], [526, 946]], 1.6, ink(0.45), 295);
  const WG = [[468, 826], [532, 846], [530, 890], [480, 880]];
  P.fill(poly(WG), 0.55, V, { spacing: 0.2 });
  stripes(o, WG, 5, { w: [1.5, 3], color: blk(0.8), seed: 296 });
  // thin cable curling from the keyboard's left end
  curve(o, [[390, 442], [430, 452], [458, 476], [470, 508]], 2.6, ink(0.55), 297);
  // background verticals behind the keyboard's left end
  stripes(o, [[380, 440], [410, 440], [410, 700], [380, 700]], 3, { w: [1.2, 2.4], color: ink(0.4), seed: 298 });
}

let plate = null;
export function roomACanvas() {
  if (plate) return plate;
  const P = new Plate(2206, 946, 1);
  paintRoomA(P);
  plate = P.engrave({ spacing: 4.4, seed: 18, contrast: 1.05 });
  return plate;
}
export function releaseRoomA() { plate = null; }
