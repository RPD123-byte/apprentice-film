// s18 shot A plate (53.24–55.24): the synth corner from the illustration, locked off (camtrack: s = 1.0000,
// drift < 0.2 px). Every object was placed from 2x grids of the source background (the median of the shot's frames
// with the owl removed). Frame coordinates.
import { Plate } from "../../../lib/engrave.js";
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

// knob on the mixer face: a black dome with a small tapered white crescent at the upper right and a faint rim on
// the lower left (the source's knobs: no dot, no hook)
function knob(o, x, y, r, seed) {
  const rr = rng(seed);
  o.fillStyle = "#050505"; o.beginPath(); o.ellipse(x, y, r * 0.95, r * 1.08, 0, 0, 7); o.fill();
  o.strokeStyle = ink(0.22); o.lineWidth = 1.2; o.beginPath(); o.ellipse(x, y, r * 0.95, r * 1.08, 0, 1.9, 3.4); o.stroke();
  const pts = [], a0 = -1.6 + (rr() - 0.5) * 0.2, a1 = 0.1 + (rr() - 0.5) * 0.2;
  for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * i / 10; pts.push([x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.66]); }
  taper(o, pts, (u) => 3.4 * Math.pow(Math.sin(PI * u), 0.8) + 0.2, ink(0.93));
  o.fillStyle = ink(0.85); o.beginPath(); o.ellipse(x + r * 0.28, y - r * 0.42, 1.6, 1.3, 0, 0, 7); o.fill();
}

// a thick cable: dark body with a pale rim line on the lit side
function cable(o, pts, w, seed, rim = 0.55) {
  curve(o, pts, w + 3, "#0c0c0c", seed, { ends: 0.95 });
  curve(o, pts, w, "#050505", seed, { ends: 0.95 });
  const off = pts.map(([x, y], i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [x + (dy / L) * w * 0.3, y - (dx / L) * w * 0.3]; });
  curve(o, off, 2, ink(rim), seed + 1, { ends: 0.2 });
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
    P.fill(blob(q), 0.95, a, { spacing: 0.2, style: 2 });
    const c = Math.cos(a), s = Math.sin(a);
    // the right-hand half turned from the light: dark hatching across it
    o.save(); o.beginPath(); smoothPath(o, q, true); o.clip();
    for (let k = 0; k < 9; k++) {
      const u = 0.1 + k * 0.1, px = x + c * L * u, py = y + s * L * u, n = s > 0 ? 1 : -1;
      line(o, [[px + s * 2, py - c * 2], [px + c * L * 0.1 + s * L * 0.34 * n, py + s * L * 0.1 - c * L * 0.34 * n]], 2 + r() * 1.4, blk(0.85), 26 + k, 0.3);
    }
    o.restore();
    o.strokeStyle = ink(0.75); o.lineWidth = 1.2; o.beginPath(); smoothPath(o, q, true); o.stroke();
    line(o, [[x + c * L * 0.02, y + s * L * 0.02], [x + c * L * 0.92, y + s * L * 0.92]], 3, "#050505", 24);
    for (let k = 1; k <= 4; k++) {
      const u = k * 0.18, px = x + c * L * u, py = y + s * L * u;
      for (const sd of [-1, 1]) line(o, [[px, py], [px + c * L * 0.16 - s * sd * L * 0.24, py + s * L * 0.16 + c * sd * L * 0.24]], 1.8, "#070707", 25 + k);
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
  // seven thin books (read off the owl-free median): the long sides dark with ragged white streaks, the stack's
  // corner at x ~1815, the page ends bright with dark lines, each book a little longer than the one above
  const xL = [1592, 1582, 1562, 1575, 1566, 1560, 1552], xR = [1935, 1948, 1962, 1972, 1978, 1985, 1992];
  for (let i = 0; i < 7; i++) {
    const t = 158 + 27 * i + (i > 3 ? 2 : 0), h = 23 + (i % 3) * 2, xc = 1815 + (i % 2) * 6, dl = 10 - i * 0.6, dr = 8;
    const side = [[xL[i], t + dl], [xc, t], [xc, t + h], [xL[i], t + dl + h]];
    P.fill(poly(side), 0.08, 0.02, { spacing: 0.4 });
    stripes(o, side, 4, { dir: "u", w: [1.2, 3], color: ink(0.85), seed: 40 + i, len: [0.25, 0.85], wav: 0.03, taperEnds: 0.15, fill: 0.8 });
    const end = [[xc, t], [xR[i], t + dr], [xR[i], t + dr + h], [xc, t + h]];
    P.fill(poly(end), 0.9, 0.05, { spacing: 0.2, style: 2 });
    stripes(o, end, 4, { dir: "u", w: [0.8, 1.8], color: blk(0.75), seed: 44 + i, len: [0.4, 1], wav: 0.02 });
    // ragged white page edge along the top of the spine side, a dark gap under each book
    line(o, [[xL[i] + 4, t + dl + 1], [(xL[i] + xc) / 2, t + dl * 0.5], [xc, t + 1]], 2.2, ink(0.8), 50 + i, 0.2);
    line(o, [[xL[i], t + dl + h + 1], [xc, t + h + 1], [xR[i], t + dr + h + 1]], 3, "#050505", 47 + i);
    line(o, [[xc, t], [xc, t + h]], 1.8, blk(0.9), 53 + i);
  }

  // ---------------------------------------------------------------- the speaker: dark front, lit side
  const SF = [[1536, 364], [1886, 347], [1886, 950], [1536, 950]];
  P.fill(poly(SF), lin(1536, 0, 1886, 0, [[0, 0.1], [0.5, 0.06], [1, 0.09]]), V, { spacing: 0.3 });
  stripes(o, SF, 40, { w: [0.7, 1.8], color: ink(0.35), seed: 60, len: [0.3, 0.9], wav: 0.004, fill: 0.5 });
  const SS = [[1886, 347], [2092, 384], [2092, 680], [1886, 680]];
  P.fill(poly(SS), lin(1886, 0, 2092, 0, [[0, 0.9], [0.6, 0.86], [1, 0.76]]), V, { spacing: 0.12, style: 2 });
  stripes(o, SS, 34, { w: [1.4, 3.8], color: blk(0.88), seed: 61, len: [0.4, 1], wav: 0.006 });
  stripes(o, SS, 20, { w: [0.8, 1.6], color: blk(0.6), seed: 65, len: [0.2, 0.7], wav: 0.006 });
  const ST = [[1536, 364], [1556, 342], [1900, 330], [1996, 346], [2092, 384], [1886, 347]];
  box(P, ST, 0.45, { angle: 0.05 });
  line(o, [[1536, 364], [1886, 347], [2092, 384]], 2.6, ink(0.85), 62);
  line(o, [[1886, 347], [1886, 680]], 2.8, "#090909", 63);
  line(o, [[1538, 364], [1538, 946]], 2, ink(0.6), 64);
  // tweeter
  const [tx, ty] = [1705, 461];
  P.fill(ell(tx, ty, 46, 48), 0.02, 0.8, { spacing: 0.4 });
  for (let rr = 26; rr <= 44; rr += 3.2) {
    for (let a0 = r() * 0.4; a0 < 2 * PI; ) {
      const span = 0.4 + r() * 0.8, pts = [];
      for (let k = 0; k <= 8; k++) { const a = a0 + span * k / 8; pts.push([tx + Math.cos(a) * rr, ty + Math.sin(a) * rr * 1.04]); }
      const L = 0.5 + 0.5 * Math.cos(a0 + span / 2 - 2.36);
      if (r() < 0.3 + 0.6 * L) curve(o, pts, 0.8 + 2.2 * L, ink(0.5 + 0.4 * L), 300 + Math.floor(rr * 5 + a0 * 9), { ends: 0.2 });
      a0 += span + 0.05 + r() * 0.2;
    }
  }
  o.strokeStyle = ink(0.8); o.lineWidth = 2.2; o.beginPath(); o.ellipse(tx, ty, 46, 48, 0, 0, 7); o.stroke();
  o.fillStyle = ink(0.95); o.beginPath(); o.ellipse(tx + 8, ty - 7, 5, 4, 0, 0, 7); o.fill();
  // woofer (Hough on the source: centre 1707,677, R 138; radial profile of the owl-free median): black dust cap to
  // r 30 with a glint, the cone r 45-100 as concentric white strokes lit from the lower left (near solid there, thin
  // on black up and right), a black band, the outer surround r 112-135 with white radial hatching, a bright rim
  const [wx, wy, WR] = [1707, 677, 140];
  P.fill(ell(wx, wy, WR, WR), 0.02, 0.8, { spacing: 0.4 });
  const lit = (a) => 0.5 + 0.5 * Math.cos(a - 2.36);
  for (let rr = 46; rr <= 106; rr += 3.6) {
    for (let a0 = r() * 0.3; a0 < 2 * PI; ) {
      const span = 0.35 + r() * 0.7, pts = [];
      for (let k = 0; k <= 8; k++) { const a = a0 + span * k / 8; pts.push([wx + Math.cos(a) * rr, wy + Math.sin(a) * rr]); }
      const L = lit(a0 + span / 2), fade = rr > 96 ? Math.max(0, 1 - (rr - 96) / 10) * (L > 0.6 ? 1 : 0.3) : 1;
      if (fade > 0.05 && r() < 0.35 + 0.65 * L) curve(o, pts, (0.9 + 3.6 * Math.pow(L, 1.3)) * fade, ink(0.55 + 0.4 * L), 70 + Math.floor(rr * 7 + a0 * 10), { ends: 0.2 });
      a0 += span + 0.03 + r() * 0.12 * (1 - L);
    }
  }
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * 2 * PI + r() * 0.04, L = lit(a);
    line(o, [[wx + Math.cos(a) * WR * 0.8, wy + Math.sin(a) * WR * 0.8], [wx + Math.cos(a) * WR * (0.93 + 0.03 * r()), wy + Math.sin(a) * WR * (0.93 + 0.03 * r())]], 1.6 + 1.6 * r(), ink(0.4 + 0.45 * (1 - L) * r() + 0.15), 100 + i);
  }
  o.strokeStyle = ink(0.85); o.lineWidth = 2.6; o.beginPath(); o.arc(wx, wy, WR * 0.965, -2.6, 0.9); o.stroke();
  o.strokeStyle = ink(0.4); o.lineWidth = 1.6; o.beginPath(); o.arc(wx, wy, WR * 0.965, 0.9, 3.7); o.stroke();
  o.fillStyle = "#040404"; o.beginPath(); o.arc(wx + 12, wy + 2, 34, 0, 7); o.fill();
  o.strokeStyle = ink(0.35); o.lineWidth = 1.4; o.beginPath(); o.arc(wx + 12, wy + 2, 34, 1.6, 3.6); o.stroke();
  o.fillStyle = ink(0.95); o.beginPath(); o.ellipse(wx + 2, wy - 18, 5.5, 4.5, -0.4, 0, 7); o.fill();
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
  // the rail reads as one lit band: grey between its two bright outer lines
  { const q = []; for (let y = -4; y <= 812; y += 58) q.push([railX(y) + 4, y]); for (let y = 812; y >= -4; y -= 58) q.push([railX(y) + 23, y]); o.fillStyle = ink(0.32); o.beginPath(); poly(q)(o); o.fill(); }
  for (const [dx, w, a] of [[0, 6, 0.95], [8, 2.2, 0.6], [19, 3, 0.7], [27, 6, 0.92]]) {
    const pts = []; for (let y = -4; y <= 812; y += 58) pts.push([railX(y) + dx, y]);
    line(o, pts, w, ink(a), 114 + dx);
  }
  line(o, [[338, -4], [376, 14], [396, 60], [398, 812]], 1.6, ink(0.35), 118);
  // dense fine white hatching down the right side of the case
  stripes(o, [[332, 30], [398, 60], [398, 812], [326, 812]], 26, { w: [0.8, 2.2], color: ink(0.6), seed: 121, len: [0.3, 0.9], wav: 0.004, fill: 0.85 });
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
  P.fill(poly(MF), 0.93, 0.1, { spacing: 0.15, style: 2 });
  stripes(o, MF, 46, { dir: "u", w: [1.6, 3.6], color: blk(0.9), seed: 144, len: [0.5, 1], wav: 0.008, taperEnds: 0.3 });
  stripes(o, MF, 20, { dir: "u", w: [0.8, 1.6], color: blk(0.7), seed: 149, len: [0.2, 0.6], wav: 0.01 });
  line(o, [[1097, 247], [1490, 297]], 2.4, ink(0.9), 145);
  line(o, [[1097, 247], [1097, 500]], 2.6, ink(0.85), 146);
  line(o, [[1097, 500], [1487, 527]], 2.6, "#080808", 147);
  line(o, [[1490, 297], [1487, 527]], 2.2, ink(0.55), 148);
  const us = [0.1, 0.23, 0.37, 0.5, 0.63, 0.755, 0.88], vs = [0.22, 0.52, 0.82];
  vs.forEach((v, j) => us.forEach((u, i) => { const [x, y] = quadAt(MF, u, v); knob(o, x, y, 17.5, 150 + j * 7 + i); }));
  // patch cables hanging from the bottom row
  for (const [i, s] of [[1, 170], [3, 172], [5, 174]]) {
    const [x, y] = quadAt(MF, us[i], 0.82);
    cable(o, [[x - 2, y + 2], [x + 8, y - 12], [x + 22, y - 6], [x + 28, y + 30], [x + 30, y + 80], [x + 32, y + 150]], 19, s, 0.75);
  }

  // ---------------------------------------------------------------- keyboard
  const K = KEYS_A;
  // back strip behind the keys and the knob row
  P.fill(rect(420, 508, 1030, 66), 0.03, 0, { spacing: 0.4 });
  for (const [x, y0, y1, w] of [[868, 510, 540, 5], [884, 512, 538, 3], [1112, 512, 542, 5], [1130, 510, 540, 4], [650, 512, 532, 3]]) line(o, [[x, y0], [x + 1, y1]], w, ink(0.7), 199 + x);
  const kn = [
    ...[110, 285, 495, 705, 900, 1100, 1300, 1525, 1665, 1800, 1950, 2100, 2260].map((b) => [(b + 1662) / 3.357, 0]),
    ...[190, 385, 595, 805, 995, 1188, 1390, 1560, 1720, 1897, 2045, 2190].map((b) => [(b + 1662) / 3.357, 1]),
  ].sort((a, b) => a[1] - b[1]);
  for (const [x, row] of kn) {
    const yt = row ? 530 + (x - 550) * 0.02 : 510 + (x - 530) * 0.02, h = row ? 34 : 30, w = row ? 19 : 16;
    o.fillStyle = "#060606"; o.beginPath(); o.roundRect(x - w / 2, yt, w, h, 3); o.fill();
    o.fillStyle = "#101010"; o.beginPath(); o.ellipse(x, yt + 1, w / 2, 3, 0, 0, 7); o.fill();
    line(o, [[x - w / 2 + 1, yt + 3], [x - w / 2 + 1.5, yt + h - 6]], 1.5, ink(0.55 + 0.2 * r()), 200 + Math.round(x));
    o.strokeStyle = ink(0.45); o.lineWidth = 1.2; o.beginPath(); o.ellipse(x, yt + 1, w / 2, 3, 0, 2.2, 4.8); o.stroke();
    if (r() < 0.6) line(o, [[x + 2, yt + 9], [x + 2.5, yt + h - 8]], 1.4 + r(), ink(0.35 + 0.3 * r()), 201 + Math.round(x));
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
  box(P, SQ, 0.06, { angle: 0, spacing: 0.4 });
  stripes(o, [[1230, 612], [1446, 612], [1446, 652], [1230, 652]], 9, { dir: "u", w: [0.8, 1.8], color: ink(0.35), seed: 260, len: [0.3, 0.8] });
  line(o, [[1230, 607], [1435, 607], [1448, 620]], 2.6, ink(0.9), 261);
  line(o, [[1230, 653], [1448, 653]], 2, blk(0.9), 259);
  // cables dropping behind the stand
  cable(o, [[1262, 662], [1240, 690], [1226, 740], [1222, 820], [1232, 950]], 20, 262, 0.7);
  cable(o, [[1296, 705], [1312, 670], [1340, 654], [1366, 672], [1378, 740], [1383, 840], [1390, 950]], 21, 264, 0.75);
  cable(o, [[1358, 668], [1386, 652], [1410, 670], [1426, 730], [1440, 830], [1452, 950]], 19, 266, 0.7);
  cable(o, [[1206, 590], [1214, 620], [1250, 650], [1262, 662]], 18, 268, 0.6);

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
  P.fill(poly(CB), 0.97, V, { spacing: 0.15, style: 2 });
  stripes(o, [[900, 790], [1004, 760], [1000, 806], [975, 842], [938, 832], [908, 812]], 10, { dir: "u", w: [1.4, 3], color: blk(0.8), seed: 279, len: [0.3, 0.8], wav: 0.02 });
  stripes(o, [[960, 725], [1006, 742], [1004, 790], [968, 800]], 6, { w: [1.2, 2.4], color: blk(0.7), seed: 278, len: [0.4, 1] });
  o.strokeStyle = "#060606"; o.lineWidth = 3.4; o.beginPath(); poly(CB)(o); o.stroke();
  for (const [x, y, R] of [[881, 758, 9], [960, 742, 11], [958, 764, 7]]) { o.fillStyle = "#0a0a0a"; o.beginPath(); o.arc(x, y, R, 0, 7); o.fill(); o.fillStyle = ink(0.9); o.beginPath(); o.arc(x - 1, y - 1, R * 0.45, 0, 7); o.fill(); }
  P.fill(rect(908, 812, 78, 140), lin(908, 0, 986, 0, [[0, 0.95], [1, 0.75]]), V, { spacing: 0.2 });
  stripes(o, [[908, 812], [986, 812], [986, 950], [908, 950]], 6, { w: [1.2, 3], color: blk(0.8), seed: 280, len: [0.5, 1] });
  line(o, [[986, 810], [986, 946]], 2.4, "#050505", 281);
  // right bracket + leg
  const CR = [[1398, 716], [1450, 712], [1462, 740], [1456, 806], [1418, 810], [1398, 790]];
  P.fill(poly(CR), 0.96, V, { spacing: 0.15, style: 2 });
  stripes(o, [[1400, 770], [1458, 760], [1456, 806], [1418, 810], [1398, 790]], 6, { dir: "u", w: [1.2, 2.6], color: blk(0.8), seed: 283, len: [0.3, 0.8] });
  o.strokeStyle = "#060606"; o.lineWidth = 3; o.beginPath(); poly(CR)(o); o.stroke();
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
