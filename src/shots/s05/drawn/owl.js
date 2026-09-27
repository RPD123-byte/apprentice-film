// s05 drawn: the owl on his right shoulder, seen from behind (settled frame px): a round pale head with a small tuft
// and an X of plaster, headphones (band over the head, the near cup on its left side, the far cup's rim peeping out),
// the soft body, the folded wing's layered feathers ending in long primaries, the tail at the bottom right, talons on
// the shoulder. Outline: measured silhouette (the rest frame's bright owl, simplified to 3 px); feather rows: control
// points read off 2x labelled grids; light: a coarse fitted field (./owlvals.js). Down, feathers, shading, headphone
// and plaster detail are drawn.
// Fix pass 2: head and body are one shape (no seam at the neck); the outline is broken every 8-10 px by short feather
// ticks and little tufts; 90 short curved feather strokes on the chest and back follow the form; the head's right side
// is hatched down to its measured shade; the wing is rows of pointed feathers whose primaries reach the measured tips
// (~(1776, 643)); the near cup's shell is darker with a lit rim.
import { ink, fill, dot, lgrad, grey, lerp, clamp, sstep, rng, PI, TAU, taper, sampleCurve, smoothPath, polyPath, blurDraw, pageDev, scr, fbm, hatchPaint } from "./kit.js";
import { OV } from "./owlvals.js";
import { fieldV } from "./desk.js";

const dark = (g, pts, w = 1.6, seed = 1, o = {}) => ink(g, pts, w, o.c || "#070707", { seed, ends: o.ends ?? 0.4, jit: o.jit ?? 0.15, closed: o.closed, smooth: o.smooth ?? true });
const soft = (g, pts, w, v, a, seed) => ink(g, pts, w, grey(v, a), { seed, ends: 0.1, jit: 0.2, smooth: true });

// the owl's outline, head and body in one (measured; its left side runs under the near cup)
const OWL = [[1462, 312], [1475, 296], [1491, 282], [1519, 268], [1561, 262], [1582, 252], [1593, 240], [1597, 262], [1612, 277], [1644, 304], [1660, 340], [1664, 370], [1660, 400], [1668, 414], [1696, 441], [1710, 470], [1718, 500], [1720, 545], [1716, 585], [1726, 604], [1750, 622], [1776, 643], [1756, 650], [1740, 654], [1728, 692], [1708, 688], [1698, 702], [1670, 683], [1654, 677], [1634, 679], [1619, 668], [1580, 661], [1535, 640], [1508, 612], [1481, 574], [1462, 532], [1458, 490], [1462, 462], [1455, 420], [1452, 370], [1455, 335]];
export const HEAD_C = [1568, 345];

function paintField(g, sh, vf) {
  const xs = sh.map((p) => p[0]), ys = sh.map((p) => p[1]), bb = [Math.min(...xs) - 3, Math.min(...ys) - 3, Math.max(...xs) + 3, Math.max(...ys) + 3];
  const D = pageDev(bb), c = scr("owlpf", D.w, D.h), cg = c.getContext("2d"), id = cg.createImageData(D.w, D.h), d = id.data;
  for (let j = 0; j < D.h; j++) for (let i = 0; i < D.w; i++) {
    const x = D.X0 + i + 0.5, y = D.Y0 + j + 0.5, v = clamp(vf(x, y) * (1 + 0.05 * (fbm(x / 6, y / 6, 71, 3) - 0.5)));
    const o = (j * D.w + i) * 4; d[o] = d[o + 1] = d[o + 2] = v * 255; d[o + 3] = 255;
  }
  cg.putImageData(id, 0, 0);
  g.save(); g.beginPath(); smoothPath(g, sh, true, 0.3); g.clip(); g.drawImage(c, 0, 0, D.w, D.h, D.X0, D.Y0, D.w, D.h); g.restore();
}
// a pointed feather from root a to tip b, width w (px): pale fill (v), a dark outline heavier on its lower edge, a soft
// shaft line and a shadow cast on the feather under it
function feather(g, a, b, w, v, seed, { bend = 0.08, outline = 1.6, shadow = 0.18 } = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const m = (t, s) => [a[0] + dx * t + nx * (s * w + bend * L * Math.sin(PI * t)), a[1] + dy * t + ny * (s * w + bend * L * Math.sin(PI * t))];
  const left = [m(0, -0.5), m(0.3, -0.5), m(0.62, -0.44), m(0.86, -0.24), b];
  const right = [m(0.86, 0.24), m(0.62, 0.48), m(0.3, 0.52), m(0, 0.5)];
  if (shadow) ink(g, [m(0.2, 0.9), m(0.55, 0.85), m(0.85, 0.45)], w * 0.5, `rgba(30,30,30,${shadow})`, { smooth: true, seed: seed + 7, jit: 0.1, ends: 0.3 });
  if (v != null) { g.beginPath(); smoothPath(g, [...left, ...right], true, 0.35); g.fillStyle = grey(v); g.fill(); }
  ink(g, [m(0.05, 0.52), m(0.3, 0.52), m(0.62, 0.48), m(0.86, 0.24), b], outline, "#080808", { smooth: true, seed, ends: 0.3, jit: 0.1 });
  ink(g, [m(0.35, -0.48), m(0.65, -0.43), m(0.87, -0.23), b], outline * 0.55, "rgba(10,10,10,0.7)", { smooth: true, seed: seed + 3, ends: 0.2, jit: 0.1 });
  soft(g, [m(0.12, 0.05), m(0.5, 0.08), m(0.82, 0.04)], 0.9, 0.35, 0.4, seed + 1);
}

export function paintOwl(g) {
  const vO = fieldV(OV.owl);
  const r = rng(601);
  // ---- the far headphone cup's rim (behind the head, right)
  g.save(); g.translate(1672, 350); g.rotate(0.06);
  g.fillStyle = grey(0.05); g.beginPath(); g.ellipse(0, 0, 14, 52, 0, 0, TAU); g.fill();
  g.strokeStyle = grey(0.42); g.lineWidth = 1.8; g.beginPath(); g.ellipse(3, 0, 10, 47, 0, -1.3, 1.3); g.stroke();
  g.restore();
  // ---- the bird: one soft shape, the fitted light (a hair brighter: the strokes over it darken it back)
  paintField(g, OWL, (x, y) => Math.min(0.97, vO(x, y) * 1.07));
  g.save(); g.beginPath(); smoothPath(g, OWL, true, 0.3); g.clip();
  // the head's shaded right side (measured ~0.45-0.55 of full light at x 1640-1665): soft shade, then fine hatching
  blurDraw(g, [1600, 250, 1680, 440], 10, (c) => { c.fillStyle = "rgba(15,15,15,0.28)"; c.beginPath(); c.ellipse(1664, 350, 26, 95, 0.05, 0, TAU); c.fill(); });
  hatchPaint(g, [[1612, 270], [1650, 290], [1672, 340], [1672, 420], [1640, 440], [1622, 380], [1618, 320]], { vf: (x, y) => lerp(0.75, 0.4, sstep(1618, 1664, x)), ang: 1.35, per: 3, len: [10, 24], w: [0.6, 1.0], dk: 0.6, top: 0.8, seed: 602, base: false });
  // the body's shade: its lower left (the chest turning under) and the lower right under the wing
  blurDraw(g, [1450, 520, 1560, 660], 12, (c) => { c.fillStyle = "rgba(15,15,15,0.35)"; c.beginPath(); c.ellipse(1480, 610, 40, 50, 0.5, 0, TAU); c.fill(); });
  blurDraw(g, [1660, 430, 1740, 620], 9, (c) => { c.fillStyle = "rgba(20,20,20,0.18)"; c.beginPath(); c.ellipse(1712, 520, 16, 90, -0.1, 0, TAU); c.fill(); });
  // down: short curved feather strokes following the form (down and outward from the crown; down the back)
  for (let i = 0; i < 95; i++) {
    const x = 1470 + r() * 250, y = 270 + r() * 360, v = vO(x, y);
    if (x > 1600 && y < 440 && x > 1660 - (y - 270) * 0.05) continue;
    const ang = y < 440 ? 1.2 + (x - 1560) * 0.006 : 1.5 + (x - 1600) * 0.004;
    const L = (y < 440 ? 8 : 12) + r() * 12, a = ang + (r() - 0.5) * 0.4, bw = (r() - 0.5) * 5;
    const p0 = [x, y], p2 = [x + Math.cos(a) * L, y + Math.sin(a) * L], p1 = [(p0[0] + p2[0]) / 2 - Math.sin(a) * bw, (p0[1] + p2[1]) / 2 + Math.cos(a) * bw];
    soft(g, [p0, p1, p2], 0.8 + r() * 0.7, 0.2, 0.2 + 0.3 * (1 - v), 610 + i);
  }
  // the folded wing: rows of pointed feathers, top rows short (coverts), the lowest long (primaries to the tips)
  // (measured on a 3x overlay: the primaries' tips at (1698, 697), (1737, 689), (1767, 679), (1767, 630); the lower
  // secondaries' at (1578, 641), (1632, 645), (1666, 655); the upper row's zigzag of tips at y ~592-607. Drawn from the
  // bottom row up: each row overlaps the one under it)
  const ROWS = [
    [[1640, 610], [1698, 697], 26], [[1670, 600], [1737, 689], 26], [[1700, 595], [1767, 679], 24], [[1712, 585], [1767, 630], 20],
    [[1500, 590], [1578, 641], 26], [[1545, 590], [1632, 645], 28], [[1590, 585], [1666, 655], 28],
    [[1500, 530], [1567, 602], 24], [[1535, 525], [1600, 607], 26], [[1570, 515], [1627, 592], 24], [[1600, 515], [1653, 602], 24], [[1635, 515], [1678, 600], 22],
  ];
  ROWS.forEach(([a, b, w], k) => feather(g, a, b, w, Math.min(0.95, vO((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) * (k < 4 ? 0.98 : 1.04)), 640 + k * 5, { outline: k < 4 ? 2.6 : k < 7 ? 2.2 : 1.6, shadow: k < 7 ? 0.25 : 0.15, bend: 0.05 }));
  // the coverts over the wing's shoulder: soft curved feather edges
  for (const [pts, i] of [[[[1492, 480], [1510, 520], [1540, 548]], 0], [[[1530, 470], [1552, 505], [1585, 530]], 1], [[[1575, 470], [1600, 500], [1628, 520]], 2], [[[1610, 480], [1636, 510], [1660, 525]], 3], [[[1508, 552], [1530, 585], [1553, 602]], 4]]) soft(g, pts, 1.3, 0.25, 0.45, 660 + i);
  g.restore();
  // ---- the fluffy outline: short dark ticks and tiny tufts breaking the contour every ~9 px
  const OUT = sampleCurve(OWL, 12, true);
  let acc = 0;
  for (let i = 1; i < OUT.length; i++) {
    const [x0, y0] = OUT[i - 1], [x1, y1] = OUT[i], d = Math.hypot(x1 - x0, y1 - y0);
    acc += d;
    if (acc < 9 + r() * 4) continue;
    acc = 0;
    if (x1 < 1515 && y1 > 325 && y1 < 460) continue;              // under the cup
    if (y1 > 575) continue;                                          // the wing's feathers carry their own outline
    const tx = (x1 - x0) / (d || 1), ty = (y1 - y0) / (d || 1), nx = ty, ny = -tx;   // outward normal (clockwise outline)
    const L = 5 + r() * 5, heavy = x1 > 1640;
    ink(g, [[x1 - nx * 1, y1 - ny * 1], [x1 + nx * L * 0.5 + tx * 2, y1 + ny * L * 0.5 + ty * 2], [x1 + nx * L * 0.2 + tx * L * 0.8, y1 + ny * L * 0.2 + ty * L * 0.8]], heavy ? 1.3 : 1.0, heavy ? "rgba(8,8,8,0.7)" : "rgba(15,15,15,0.45)", { smooth: true, seed: 700 + i, ends: 0.2, jit: 0.1 });
    if (!heavy) { const v = vO(x1, y1); g.fillStyle = grey(Math.min(0.95, v * 1.05)); g.beginPath(); g.moveTo(x1 - tx * 3, y1 - ty * 3); g.lineTo(x1 + nx * (3 + r() * 3), y1 + ny * (3 + r() * 3)); g.lineTo(x1 + tx * 3, y1 + ty * 3); g.closePath(); g.fill(); }
  }
  // outlines (dark, heavier on the shaded right side and under the wing)
  dark(g, [[1640, 300], [1658, 330], [1664, 368], [1660, 400], [1668, 414], [1696, 441], [1710, 470], [1718, 500], [1720, 545], [1716, 585]], 2.2, 710);
  dark(g, [[1462, 470], [1459, 500], [1463, 532], [1480, 572], [1506, 610], [1535, 638]], 1.8, 712);
  // the tuft on the crown: soft spikes
  for (const [x, y, a, L] of [[1580, 262, -1.25, 18], [1589, 258, -1.4, 22], [1598, 266, -1.75, 16]]) {
    const pts = [[x - 5, y + 5], [x + Math.cos(a) * L, y + Math.sin(a) * L], [x + 5, y + 5]];
    g.beginPath(); polyPath(g, pts); g.fillStyle = grey(0.82); g.fill();
    dark(g, [pts[0], pts[1], pts[2]], 1.1, 720 + x, { smooth: false, ends: 0.3 });
  }
  // talons on the shoulder
  for (const [x, y] of [[1508, 628], [1522, 634], [1536, 640]]) ink(g, [[x - 6, y - 10], [x - 2, y - 2], [x + 4, y + 4]], 3, grey(0.12), { seed: x, jit: 0, ends: 0.3, smooth: true });
  plaster(g);
  headphones(g);
}

// the plaster: an X of two rounded strips (2x3 perforation dots on each arm), a pad square in the middle
function strip(g, cx, cy, ang, L, W) {
  g.save(); g.translate(cx, cy); g.rotate(ang);
  g.beginPath(); g.roundRect(-L / 2, -W / 2, L, W, W / 2); g.fillStyle = grey(0.78); g.fill();
  g.lineWidth = 1.3; g.strokeStyle = "rgba(20,20,20,0.85)"; g.stroke();
  for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) for (let j = 0; j < 3; j++) { g.fillStyle = grey(0.35); g.beginPath(); g.arc(sx * (L * 0.34 + i * 6), (j - 1) * 4.5, 1.2, 0, TAU); g.fill(); }
  g.restore();
}
function plaster(g) {
  strip(g, 1531, 314, 0.5, 86, 20);
  strip(g, 1533, 314, -0.62, 82, 20);
  g.save(); g.translate(1532, 314); g.rotate(-0.06);
  g.beginPath(); g.roundRect(-11, -9, 22, 18, 3); g.fillStyle = grey(0.68); g.fill(); g.strokeStyle = "rgba(30,30,30,0.6)"; g.lineWidth = 1; g.stroke();
  g.restore();
}

function headphones(g) {
  // the padded band (measured cross-sections: ~30 px deep, a pale top face between dark edges), over the head
  const outer = [[1424, 362], [1422, 320], [1428, 285], [1447, 255], [1480, 230], [1550, 209], [1610, 210], [1650, 228], [1676, 262], [1688, 305]];
  const inner = [[1448, 362], [1446, 322], [1450, 290], [1466, 262], [1496, 248], [1552, 228], [1606, 229], [1642, 246], [1664, 276], [1674, 310]];
  g.beginPath(); smoothPath(g, [...outer, ...inner.slice().reverse()], true, 0.4); g.fillStyle = grey(0.4); g.fill();
  const mid = outer.map(([x, y], i) => [lerp(x, inner[i][0], 0.35), lerp(y, inner[i][1], 0.35)]);
  g.save(); g.beginPath(); smoothPath(g, [...outer, ...inner.slice().reverse()], true, 0.4); g.clip();
  ink(g, mid, 5, grey(0.72, 0.9), { smooth: true, seed: 705, jit: 0.2, ends: 0.3 });
  ink(g, mid.map(([x, y]) => [x + 1, y - 2]), 2.2, grey(0.95, 0.9), { smooth: true, seed: 706, jit: 0.2, ends: 0.2 });
  g.restore();
  ink(g, outer, 2.6, "#060606", { smooth: true, seed: 701, jit: 0.1, ends: 0.7 });
  ink(g, inner, 2.4, "#060606", { smooth: true, seed: 702, jit: 0.1, ends: 0.7 });
  // the yoke from the band down to the cup
  g.beginPath(); g.roundRect(1426, 300, 26, 62, 6); g.fillStyle = grey(0.55); g.fill(); g.strokeStyle = "#060606"; g.lineWidth = 2.2; g.stroke();
  ink(g, [[1433, 306], [1434, 356]], 1.8, grey(0.9, 0.8), { seed: 704, jit: 0 });
  // the near cup (measured: the dark cushion x 1456-1512, the shell's face x 1418-1456, y 330-455): the ribbed
  // cushion ring and, on its left, the shell (a darker grey, a lit rim and a highlight down its front)
  g.save(); g.translate(1464, 393); g.rotate(-0.08);
  g.fillStyle = "#050505"; g.beginPath(); g.ellipse(0, 0, 48, 62, 0, 0, TAU); g.fill();
  g.strokeStyle = grey(0.3); g.lineWidth = 1.3;
  for (let a = -1.35; a < 1.4; a += 0.13) { g.beginPath(); g.moveTo(Math.cos(a) * 32 + 6, Math.sin(a) * 46); g.lineTo(Math.cos(a) * 45, Math.sin(a) * 59); g.stroke(); }
  g.fillStyle = grey(0.2); g.beginPath(); g.ellipse(-10, 0, 30, 56, 0, 0, TAU); g.fill();
  g.fillStyle = lgrad(g, -44, -44, 0, 56, [[0, 0.62], [0.45, 0.4], [1, 0.2]]); g.beginPath(); g.ellipse(-26, 0, 20, 53, 0, 0, TAU); g.fill();
  g.strokeStyle = "#060606"; g.lineWidth = 2.2; g.beginPath(); g.ellipse(-26, 0, 20, 53, 0, 0, TAU); g.stroke();
  ink(g, [[-37, -34], [-42, 0], [-37, 34]], 2.4, grey(0.95, 0.85), { smooth: true, seed: 707, jit: 0, ends: 0.2 });
  g.strokeStyle = grey(0.7, 0.8); g.lineWidth = 1.4; g.beginPath(); g.ellipse(-26, 0, 17, 50, 0, -2.4, -0.6); g.stroke();
  g.lineWidth = 2.6; g.strokeStyle = "#060606"; g.beginPath(); g.ellipse(0, 0, 48, 62, 0, 0, TAU); g.stroke();
  g.restore();
}
