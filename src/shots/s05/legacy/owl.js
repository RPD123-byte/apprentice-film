// s05 owl: on his right shoulder, seen from behind and a little to the side, facing the screen. The kit has no
// back view, so this painter builds one from the owl kit's parts (soft plumage fills, rim hatching, feather flicks,
// ink lines, a faint screentone) plus its own headphones and plasters traced for this angle. Frame coordinates
// (1 unit = 1 px), traced on the source at 25.00 s: the outline and every ink line inside it from a skeleton of the
// source's dark lines (snapshots/s05-fix1-study/lines.py -> lines-owl.jpg), the cup and band from 3.2x crops
// (t-cup.jpg, t-band.jpg), the tail fan from t-tail.jpg.
//  - one continuous fluffy mass: no crease between head and body; the head's plumage fades into the body's
//  - the folded wing: overlapping pointed feathers in two rows (tips at y ~570–605 and ~620–660), then the tail fan
//    of six pointed feathers radiating from ~(1690, 610) with tips from (1672, 654) round to (1770, 634)
//  - the near cup is dark metal (plate ~0.3–0.45 with one highlight), a black ribbed cushion, a thin dark band
import { plumage, softShade, rimHatch, edgeFlicks, ink, flick, screentone, setPPU, gv, LINE, V } from "../../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { taper } from "../../../lib/ink.js";
import { rng } from "../../../lib/rng.js";

export const OWL_BOX = [1370, 170, 420, 560];    // x, y, w, h of the owl layers (frame px)
const blob = (pts) => (c) => smoothPath(c, pts, true);
const polyP = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const LIGHT = [-0.62, -0.78];

// the head (its lower part runs on down over the body and is faded out there, so a head turn leaves no seam)
const HEAD = [[1460, 350], [1466, 312], [1480, 288], [1492, 279], [1511, 266], [1526, 261], [1545, 256], [1565, 253], [1582, 250], [1600, 257], [1614, 266], [1628, 272], [1645, 284], [1656, 298], [1663, 312], [1667, 334], [1669, 362], [1668, 395], [1667, 412], [1676, 434], [1692, 452], [1700, 474], [1660, 494], [1560, 500], [1480, 494], [1460, 470], [1457, 420], [1457, 385]];
const BODY = [[1462, 440], [1520, 428], [1600, 424], [1667, 414], [1673, 430], [1686, 443], [1700, 457], [1712, 479], [1720, 505], [1727, 530], [1734, 556], [1738, 578], [1742, 598], [1726, 614], [1700, 632], [1672, 648], [1640, 646], [1606, 642], [1578, 641], [1552, 633], [1530, 625], [1512, 620], [1500, 607], [1485, 589], [1472, 569], [1463, 548], [1458, 520], [1457, 490], [1459, 462]];
const TUFT = [[1570, 262], [1578, 248], [1586, 236], [1594, 229], [1597, 246], [1604, 256], [1612, 266]];

// the wing's upper row of feather tips (outer edge -> tip -> back along the next feather), from lines-owl L12, L8,
// L16, L6, L14 and the leading edge L32/L24
const ROW1 = [
  [[1476, 512], [1479, 540], [1488, 557], [1500, 570], [1497, 556]],
  [[1508, 553], [1523, 575], [1549, 600], [1564, 605], [1558, 590]],
  [[1533, 556], [1559, 588], [1587, 605], [1582, 592]],
  [[1567, 558], [1587, 580], [1614, 598], [1606, 578], [1598, 564]],
  [[1621, 553], [1640, 572], [1652, 582], [1648, 566], [1639, 550]],
];
// long feathers of the lower row and the tail fan: [root, tip, width, bend]
const FAN = [
  [[1722, 580], [1770, 634], 22, -0.1],
  [[1704, 592], [1771, 653], 26, -0.08],
  [[1690, 600], [1767, 680], 28, -0.05],
  [[1674, 606], [1737, 692], 29, 0.02],
  [[1652, 606], [1700, 699], 27, 0.08],
  [[1586, 590], [1673, 655], 26, 0.06],
  [[1552, 600], [1612, 647], 22, 0.1],
];

// a pointed feather: a leaf shape from root to tip, fuller near the root, with a slight bend
function featherPath(root, tip, w, bend) {
  const d = V.sub(tip, root), L = Math.hypot(d[0], d[1]), t = [d[0] / L, d[1] / L], n = [-t[1], t[0]];
  const at = (u, s) => [root[0] + d[0] * u + n[0] * (s + bend * L * Math.sin(Math.PI * u) * 0.5), root[1] + d[1] * u + n[1] * (s + bend * L * Math.sin(Math.PI * u) * 0.5)];
  const side = (s) => { const pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10, wd = (w / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.08)), 0.7) * (u > 0.75 ? 1 - (u - 0.75) * 2.2 : 1); pts.push(at(u, s * wd)); } return pts; };
  const a = side(1), b = side(-1).reverse();
  return { pts: [...a, tip, ...b], edgeA: a, edgeB: side(-1), spine: [at(0, 0), at(0.5, 0), tip] };
}

// a sticking plaster: a pale rounded strip with a soft grey band, perforation dots and a grey keyline (soft, like the
// source's, not a hard black outline)
function plaster(g, cx, cy, len, wd, ang, pad, seed) {
  const r = rng(seed);
  g.save(); g.translate(cx, cy); g.rotate(ang);
  g.fillStyle = gv(0.84); g.beginPath(); g.roundRect(-len / 2, -wd / 2, len, wd, wd / 2); g.fill();
  g.save(); g.clip(); g.fillStyle = gv(0.62, 0.3); g.fillRect(-len / 2, wd * 0.12, len, wd * 0.5); g.restore();
  if (pad) { g.fillStyle = gv(0.88); g.beginPath(); g.roundRect(-wd * 0.7, -wd * 0.42, wd * 1.4, wd * 0.84, 2.5); g.fill(); g.strokeStyle = gv(0.45, 0.7); g.lineWidth = 0.9; g.stroke(); }
  g.fillStyle = gv(0.4, 0.55);
  for (let i = 0; i < 22; i++) { const t = (r() - 0.5) * 0.86 * len; if (pad && Math.abs(t) < wd * 0.75) continue; g.beginPath(); g.arc(t, (r() - 0.5) * wd * 0.55, 0.75, 0, 7); g.fill(); }
  g.strokeStyle = gv(0.3, 0.9); g.lineWidth = 1.3; g.beginPath(); g.roundRect(-len / 2, -wd / 2, len, wd, wd / 2); g.stroke();
  g.restore();
}

// ---- the headphones (near side): band -> slider -> yoke arm -> the cup (plate, metal ring, cushion), dark metal
const BAND = [[1453, 288], [1457, 268], [1467, 248], [1484, 232], [1508, 218], [1536, 209], [1562, 206], [1590, 208], [1612, 216], [1631, 231], [1646, 250], [1656, 270], [1663, 292]];
function band(g, pts, w) {
  const q = sampleCurve(pts, 8);
  taper(g, q, () => w + 3, LINE);
  const gr = g.createLinearGradient(1480, 0, 1640, 0);
  gr.addColorStop(0, gv(0.46)); gr.addColorStop(0.45, gv(0.34)); gr.addColorStop(1, gv(0.1));
  taper(g, q, () => w - 1, gr);
  taper(g, q.map(([x, y]) => [x - 0.6, y - w * 0.22]), () => Math.max(1, w * 0.22), gv(0.72, 0.9));
  taper(g, q.map(([x, y]) => [x + 0.4, y + w * 0.3]), () => 1.2, gv(0.12, 0.8));
}
function nearCup(g) {
  // slider block and yoke arm
  g.save(); g.translate(1453, 296); g.rotate(-0.06);
  g.fillStyle = gv(0.5); g.strokeStyle = LINE; g.lineWidth = 2;
  g.beginPath(); g.roundRect(-14, -10, 28, 20, 4); g.fill(); g.stroke();
  g.fillStyle = gv(0.74, 0.8); g.fillRect(-10, -6, 6, 12);
  g.restore();
  g.save(); g.translate(1447, 340); g.rotate(-0.1);
  g.fillStyle = gv(0.46); g.strokeStyle = LINE; g.lineWidth = 2.2;
  g.beginPath(); g.roundRect(-13, -30, 26, 62, 9); g.fill(); g.stroke();
  g.fillStyle = gv(0.72, 0.7); g.beginPath(); g.roundRect(-9, -26, 6, 50, 3); g.fill();
  g.restore();
  // cushion: black, ribbed with pale ticks on its outer (right) side
  const cu = (c) => c.ellipse(1484, 394, 28, 58, -0.07, 0, 7);
  g.fillStyle = "#0d0d0d"; g.beginPath(); cu(g); g.fill();
  g.save(); g.beginPath(); cu(g); g.clip();
  for (let i = 0; i < 24; i++) {
    const a = -1.4 + i * 0.12, x = 1483 + Math.cos(a) * 20, y = 391 + Math.sin(a) * 49;
    g.strokeStyle = gv(0.55, 0.7); g.lineWidth = 2.2; g.beginPath(); g.moveTo(x - 2, y - 1); g.lineTo(x + 6, y + 1); g.stroke();
  }
  g.restore();
  g.strokeStyle = gv(0.3, 0.9); g.lineWidth = 1.2; g.beginPath(); g.ellipse(1483, 391, 24, 56, -0.07, -1.4, 1.5); g.stroke();
  // metal ring between the plate and the cushion
  g.strokeStyle = gv(0.34); g.lineWidth = 6; g.beginPath(); g.ellipse(1462, 396, 25, 52, -0.07, -1.6, 1.7); g.stroke();
  g.strokeStyle = LINE; g.lineWidth = 1.8; g.beginPath(); g.ellipse(1463, 396, 29, 56, -0.07, -1.6, 1.7); g.stroke();
  // plate: dark metal, one soft highlight on the left, a darker lower right, dark keyline
  const pl = (c) => c.ellipse(1440, 396, 26, 44, -0.06, 0, 7);
  const pg = g.createLinearGradient(1414, 0, 1466, 0);
  pg.addColorStop(0, gv(0.76)); pg.addColorStop(0.45, gv(0.6)); pg.addColorStop(1, gv(0.26));
  g.fillStyle = pg; g.beginPath(); pl(g); g.fill();
  g.save(); g.beginPath(); pl(g); g.clip();
  g.filter = "blur(5px)";
  g.fillStyle = gv(0.9, 0.7); g.beginPath(); g.ellipse(1428, 386, 6, 22, -0.1, 0, 7); g.fill();
  g.fillStyle = gv(0.16, 0.7); g.beginPath(); g.ellipse(1458, 426, 12, 22, -0.2, 0, 7); g.fill();
  g.filter = "none";
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = 2.0; g.beginPath(); pl(g); g.stroke();
  g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); g.ellipse(1483, 391, 28, 61, -0.07, -1.35, 1.75); g.stroke();
}

function paintBody(g) {
  setPPU(1);
  const r = rng(601);
  // ---- toes gripping his shoulder, mostly hidden under the belly feathers (dark)
  for (const [x, y, a] of [[1506, 624, 0.5], [1520, 628, 0.3], [1533, 630, 0.15]]) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = gv(0.28); g.beginPath(); g.ellipse(0, 3, 7, 4, 0, 0, 7); g.fill();
    g.fillStyle = LINE; g.beginPath(); g.moveTo(-5, 5); g.quadraticCurveTo(-2, 11, 3, 9); g.lineTo(-1, 6); g.closePath(); g.fill();
    g.restore();
  }
  // ---- body: soft white, a little greyer than the head (source 186 vs 204); the belly side (left) turns away
  const bp = blob(BODY);
  plumage(g, bp, { base: 0.78, shade: 0.56, depth: 36, blur: 16, light: LIGHT });
  softShade(g, bp, (c) => c.ellipse(1600, 640, 140, 26, 0.1, 0, 7), 0.52, 0.55, 12);
  softShade(g, bp, (c) => c.ellipse(1640, 600, 90, 40, 0.5, 0, 7), 0.6, 0.4, 14);          // the lower wing is greyer
  softShade(g, bp, (c) => c.ellipse(1725, 560, 22, 70, 0.1, 0, 7), 0.55, 0.45, 12);
  // ---- the folded wing: fine fur flicks down the back, then the rows of pointed feather tips
  g.save(); g.beginPath(); bp(g); g.clip();
  softShade(g, bp, (c) => c.ellipse(1462, 540, 18, 90, 0.05, 0, 7), 0.5, 0.5, 10);          // the belly edge turns away
  for (let i = 0; i < 420; i++) { const x = 1465 + r() * 270, y = 450 + r() * 190; flick(g, [x, y], V.nrm([0.3 + (r() - 0.5) * 0.5, 1]), 7 + r() * 14, 0.75, gv(0.36, 0.25 + 0.25 * r()), 0.08); }
  for (let i = 0; i < 260; i++) {
    const x = 1470 + r() * 260, y = 440 + r() * 200;
    const shade = Math.min(1, Math.max(0, (x - 1560) / 170 + (y - 500) / 300));
    if (r() > 0.25 + 0.6 * shade) continue;
    flick(g, [x, y], V.nrm([0.45 + (r() - 0.5) * 0.3, 1]), 10 + r() * 16, 0.8, gv(0.36, 0.25 + 0.3 * shade), 0.06);
  }
  // the long line of the wing's leading edge and the feather edges above the rows (L32, L24, L0 inner)
  ink(g, [[1590, 484], [1608, 499], [1624, 521], [1639, 550], [1648, 568]], 1.5, gv(0.18, 0.85), { end: 0.15 });
  ink(g, [[1604, 520], [1618, 536], [1628, 552]], 1.1, gv(0.25, 0.6), { end: 0.2 });
  ink(g, [[1660, 470], [1676, 500], [1690, 540], [1700, 580]], 1.0, gv(0.3, 0.45), { end: 0.2 });
  // row 1: long feathers lying down the wing: a fading grey upper run from near the ruff, then the dark pointed tip
  const UP = [[[1470, 470], [1474, 492]], [[1500, 474], [1504, 510], [1508, 553]], [[1522, 482], [1528, 520], [1533, 556]], [[1550, 490], [1558, 528], [1567, 558]], [[1596, 494], [1610, 524], [1621, 553]]];
  UP.forEach((pts, i) => ink(g, [...pts, ROW1[i][0]], 1.1, gv(0.3, 0.55), { end: 0.1, bias: 0.8 }));
  ROW1.forEach((pts, i) => {
    const q = sampleCurve(pts, 6);
    softShade(g, bp, (c) => { c.moveTo(q[0][0], q[0][1]); q.forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); }, 0.6, 0.35, 5);
    ink(g, pts.slice(0, pts.length - 1), 1.9, LINE, { end: 0.12, bias: 0.75 });
    ink(g, pts.slice(pts.length - 3), 1.2, LINE, { end: 0.1 });
    for (let k = 0; k < 5; k++) { const u = 0.2 + k * 0.13, p = q[Math.floor(u * (q.length - 1))]; flick(g, [p[0] - 10, p[1] - 12], V.nrm([0.7, 1]), 14 + r() * 8, 0.8, gv(0.35, 0.45), 0.05); }
  });
  // the lower row's edges running to the fan (L5, L19, L9)
  ink(g, [[1500, 569], [1521, 594], [1541, 609], [1561, 623], [1584, 634]], 1.8, LINE, { end: 0.15 });
  ink(g, [[1607, 574], [1625, 589], [1652, 606], [1666, 624], [1667, 634]], 1.6, LINE, { end: 0.15 });
  ink(g, [[1543, 611], [1574, 634], [1585, 650]], 1.6, LINE, { end: 0.15 });
  g.restore();
  // ---- the fan of long feathers: back to front
  for (let i = 0; i < FAN.length; i++) {
    const [root, tip, w, bend] = FAN[i], f = featherPath(root, tip, w, bend), fp = polyP(f.pts);
    plumage(g, fp, { base: 0.8, shade: 0.6, depth: 8, blur: 5, light: LIGHT });
    softShade(g, fp, (c) => c.ellipse(root[0], root[1], w * 1.2, w * 1.2, 0, 0, 7), 0.55, 0.45, 8);
    g.save(); g.beginPath(); fp(g); g.clip();
    for (let k = 0; k < 7; k++) { const u = 0.15 + k * 0.1, a = f.edgeA[Math.floor(u * 10)], b = f.spine[1]; ink(g, [a, [(a[0] + tip[0]) / 2, (a[1] + tip[1]) / 2]], 0.7, gv(0.35, 0.4), { end: 0.2 }); }
    ink(g, f.spine, 0.9, gv(0.3, 0.5), { end: 0.15 });
    g.restore();
    ink(g, [...f.edgeA.slice(2), tip, ...f.edgeB.slice(2).reverse()], 3.0, LINE, { end: 0.2, per: 2 });
  }
  // ---- rim hatching on the shadow side, fluffy edge flicks, the outline of the back
  rimHatch(g, BODY, { light: LIGHT, flow: [0.35, 1], len: 18, step: 3, w: 0.9, color: gv(0.3, 0.45), seed: 12, density: 0.8, bend: 0.5 });
  edgeFlicks(g, BODY, { step: 7, len: 10, w: 0.8, color: gv(0.42, 0.45), ang: 0.9, seed: 19 });
  ink(g, [[1671, 434], [1698, 459], [1712, 489], [1718, 510], [1725, 556], [1726, 584]], 2.2, LINE, { end: 0.2 });
  ink(g, [[1707, 454], [1718, 472], [1725, 497], [1731, 530], [1737, 576], [1742, 598]], 1.6, LINE, { end: 0.2 });
  ink(g, [[1466, 453], [1459, 478], [1458, 502], [1461, 530], [1466, 552], [1475, 572], [1486, 590], [1500, 605], [1512, 620], [1528, 626], [1552, 634], [1576, 640]], 1.8, gv(0.12, 0.9), { end: 0.2 });
}

// The head (with the headphones) is its own layer: it dips toward the screen and back at 25.8–26.3.
function paintHead(g) {
  setPPU(1);
  const r = rng(701);
  // ---- far headphone cup: its dark rim shows past the right of the head
  g.fillStyle = "#0c0c0c"; g.beginPath(); g.ellipse(1672, 332, 20, 48, 0.08, 0, 7); g.fill();
  g.strokeStyle = gv(0.42); g.lineWidth = 2; g.beginPath(); g.ellipse(1676, 332, 14, 40, 0.08, -1.1, 1.3); g.stroke();
  for (let i = 0; i < 9; i++) { const a = -1.0 + i * 0.26, x = 1676 + Math.cos(a) * 16, y = 332 + Math.sin(a) * 42; g.strokeStyle = gv(0.45, 0.6); g.lineWidth = 1.3; g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + 3, y); g.stroke(); }
  // ---- the band behind the crown
  band(g, BAND, 9);
  // ---- head plumage (one mass with the body: its lower part fades out over the body, see layer())
  const hp = blob(HEAD);
  plumage(g, blob(TUFT), { base: 0.88, shade: 0.7, depth: 5, blur: 3, light: LIGHT });
  for (const pts of [[[1580, 250], [1590, 236], [1595, 230]], [[1586, 256], [1594, 244], [1597, 236]], [[1596, 252], [1603, 244]]]) ink(g, pts, 1.0, gv(0.35, 0.8), { end: 0.1 });
  ink(g, [[1578, 247], [1586, 236], [1594, 229], [1597, 246], [1605, 256]], 1.3, LINE, { end: 0.15 });
  plumage(g, hp, { base: 0.8, shade: 0.56, depth: 34, blur: 16, light: LIGHT });
  softShade(g, hp, (c) => c.ellipse(1655, 390, 34, 70, 0, 0, 7), 0.58, 0.5, 16);       // the side turned from the screen
  softShade(g, hp, (c) => c.ellipse(1515, 400, 30, 60, 0, 0, 7), 0.64, 0.4, 14);       // under the cup
  // fine hatching on the head's shadowed lower right, fur flicks where the head fluffs out into the body
  g.save(); g.beginPath(); hp(g); g.clip();
  for (let i = 0; i < 70; i++) { const x = 1590 + r() * 80, y = 360 + r() * 90; flick(g, [x, y], V.nrm([0.3, 1]), 10 + r() * 12, 0.75, gv(0.4, 0.35), 0.05); }
  for (let i = 0; i < 160; i++) { const x = 1470 + r() * 195, y = 262 + r() * 180; flick(g, [x, y], V.nrm([0.2 + (r() - 0.5) * 0.6, 1]), 5 + r() * 9, 0.65, gv(0.45, 0.14 + 0.16 * r()), 0.1); }
  for (let i = 0; i < 90; i++) { const x = 1480 + r() * 200, y = 430 + r() * 45; flick(g, [x, y], V.nrm([0.25 + (r() - 0.5) * 0.4, 1]), 8 + r() * 12, 0.8, gv(0.42, 0.35), 0.1); }
  // the ruff where the head fluffs out over the body: a row of grey strokes pointing down-left (t-owltex.jpg)
  const ruff = sampleCurve([[1470, 452], [1500, 452], [1530, 449], [1560, 447], [1600, 440], [1632, 430], [1656, 418], [1668, 405]], 10);
  ruff.forEach((p, i) => { if (r() < 0.2) return; const L = 12 + r() * 16; flick(g, [p[0] + (r() - 0.5) * 6, p[1] - 8 - r() * 10], V.nrm([-0.35 + (r() - 0.5) * 0.3, 1]), L, 1.6 + r() * 0.8, gv(0.4, 0.45 + 0.25 * r()), 0.05); });
  for (let i = 0; i < 40; i++) { const p = [1628 + r() * 40, 350 + r() * 80]; flick(g, p, V.nrm([0.15, 1]), 12 + r() * 14, 1.3, gv(0.4, 0.45), 0.05); }
  g.restore();
  rimHatch(g, HEAD.slice(0, 18), { light: LIGHT, flow: [0.2, 1], len: 16, step: 2.6, w: 0.9, color: gv(0.32, 0.45), seed: 22, density: 0.85, thr: 0.1, closed: false });
  edgeFlicks(g, HEAD.slice(0, 18), { step: 9, len: 9, w: 0.8, color: gv(0.5, 0.35), ang: 1.1, seed: 23, closed: false });
  // the head's outline where it shows (under the band on the left, right of the tuft, the right side by the far cup)
  ink(g, [[1492, 279], [1511, 266], [1526, 261], [1545, 256]], 1.5, LINE, { end: 0.15 });
  ink(g, [[1602, 269], [1614, 273], [1628, 273], [1645, 285], [1656, 298], [1662, 310]], 1.5, LINE, { end: 0.15 });
  ink(g, [[1667, 361], [1668, 385], [1667, 400], [1666, 412]], 1.6, LINE, { end: 0.2 });
  // ---- the crossed plasters on the back of the head (strip 1: upper left -> lower right, strip 2 on top)
  plaster(g, 1533, 322, 82, 17, 0.4, false, 61);
  plaster(g, 1536, 323, 76, 16, -0.8, true, 62);
}
// in front of the head, drawn after its fade: the near end of the band, the slider and the near cup
function paintHeadFront(g) {
  band(g, BAND.slice(0, 5), 10);
  nearCup(g);
}

export const HEAD_PIVOT = [1680, 440];     // the head dips about the back of the neck
function layer(paint, fade, front) {
  const [x, y, w, h] = OWL_BOX;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.translate(-x, -y);
  paint(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  screentone(c, { pitch: 4.2, amp: 0.05 });
  if (fade) {
    // the head's plumage runs on down over the body: fade it out between y 440 and 492 (frame), except the cup
    g.globalCompositeOperation = "destination-in";
    const gr = g.createLinearGradient(0, 440 - y, 0, 492 - y);
    gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over";
  }
  if (front) { g.translate(-x, -y); front(g); g.setTransform(1, 0, 0, 1, 0, 0); }
  return c;
}
let L = null;
export function owlCanvases() {
  if (!L) L = { body: layer(paintBody, false), head: layer(paintHead, true, paintHeadFront) };
  return L;
}
export function releaseOwl() { L = null; }
