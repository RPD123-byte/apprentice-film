// s07 owl, seen from behind on his right shoulder: the back of its round head (crossed bandage, a soft tuft of
// three or four feathers), the headphones (grey band with a slider and yoke, the near cup's engraved shell and its
// dark ribbed cushion toward the head, the far cup's rim on the right), a fluffy white back drawn with dense fine
// feather strokes that follow the form (radiating from the crown on the head, falling in arcs down the body), a
// ruff where head meets body, the folded wing's layered feathers with dark separations, the fan of primaries at the
// lower right, and toes gripping the sweater. Finished pixels (not engraved), built with the owl kit's line helpers
// (src/lib/owlInk.js). Frame coordinates, measured on the source at 29.6 s (2.4–4.5x crops,
// snapshots/s07-fix1-ref/owl_top|owl_bot|cup|claw.jpg).
import { plumage, softShade, ink, flick, setPPU, gv, LINE } from "../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { taper } from "../../lib/ink.js";
import { rng } from "../../lib/rng.js";

const TAU = Math.PI * 2;
const blob = (pts) => (c) => smoothPath(c, pts, true);
const nrm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
// one silhouette: the round head and the plumper body below it; a small notch on the right where they meet
export const OWL = [[1455, 400], [1458, 350], [1470, 305], [1486, 286], [1510, 273], [1540, 265], [1566, 260], [1584, 257], [1600, 259], [1612, 265],
  [1633, 277], [1653, 297], [1663, 323], [1667, 357], [1667, 390], [1672, 410], [1693, 430], [1712, 452], [1724, 492], [1731, 535],
  [1736, 574], [1746, 598], [1768, 628], [1772, 652], [1766, 674], [1748, 686], [1724, 694], [1700, 697], [1684, 686], [1664, 670], [1638, 658],
  [1604, 647], [1574, 638], [1522, 626], [1502, 603], [1482, 582], [1470, 551], [1462, 512], [1462, 466], [1459, 436]];
const inOwl = (x, y) => { let c = false; for (let i = 0, j = OWL.length - 1; i < OWL.length; j = i++) { const [xi, yi] = OWL[i], [xj, yj] = OWL[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const CROWN = [1582, 250];     // the feathers of the head radiate from here
const NECK_Y = (x) => 452 + 18 * Math.sin(Math.PI * Math.min(1, Math.max(0, (x - 1470) / 210)));  // the ruff line
// feather flow at a point: radial on the head, arcs falling down and out on the body
function flowAt(x, y) {
  const ny = NECK_Y(x);
  const h = nrm(x - CROWN[0], y - CROWN[1]);
  const b = nrm((x - 1590) * 0.0045 + 0.08, 1);
  const k = Math.min(1, Math.max(0, (y - ny + 16) / 32));
  return nrm(h[0] * (1 - k) + b[0] * k, h[1] * (1 - k) + b[1] * k);
}
// shade at a point (0 lit .. 1 deep): the screen lights the owl from the left; the right side, the underside of the
// head and the lower body fall into grey
function shadeAt(x, y) {
  const right = Math.max(0, (x - 1560) / 190), low = Math.max(0, (y - 520) / 180);
  const ny = NECK_Y(x), neck = Math.max(0, 1 - Math.abs(y - ny - 8) / 26) * 0.5;
  return Math.min(1, 0.12 + right * 0.7 + low * 0.35 + neck);
}

// wing feathers, back to front: [root, tip, width]. Secondaries lie diagonally across the back (upper-left to
// lower-right) and end in a scalloped edge near (1577–1615, 565–602); the primaries fan out at the lower right,
// tips measured at (1690,694) (1732,682) (1757,665) (1773,640).
const COVERTS = [[[1592, 462], [1668, 602], 24], [[1562, 470], [1636, 600], 24], [[1536, 488], [1606, 604], 22], [[1516, 512], [1580, 598], 18]];
const PRIMARIES = [[[1712, 584], [1776, 642], 20], [[1700, 588], [1764, 668], 22], [[1686, 592], [1740, 686], 22], [[1672, 598], [1712, 698], 21],
  [[1656, 604], [1688, 694], 19]];
const BAND = [[1446, 300], [1450, 268], [1462, 246], [1478, 231], [1500, 217], [1528, 207], [1562, 204], [1595, 210], [1620, 224], [1638, 246], [1648, 270],
  [1654, 296]];

// feather outline: a long narrow feather from root to tip, bowed, with a rounded-pointed tip
function featherPts(root, tip, w, bow = 0.25, sharp = 0.82) {
  const d = [tip[0] - root[0], tip[1] - root[1]], L = Math.hypot(d[0], d[1]), u = [d[0] / L, d[1] / L], n = [-u[1], u[0]];
  const P = (t, k) => { const wk = k * Math.min(1, 0.6 + t) * (t > sharp ? Math.pow(Math.max(0, (1 - t) / (1 - sharp)), 0.8) : 1); return [root[0] + d[0] * t + n[0] * (wk + w * bow * Math.sin(Math.PI * t)), root[1] + d[1] * t + n[1] * (wk + w * bow * Math.sin(Math.PI * t))]; };
  const Lp = [], Rp = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; Lp.push(P(t, w / 2)); Rp.push(P(t, -w / 2)); }
  return { Lp, Rp, P, u, n };
}
function fillPts(g, pts, style) { g.fillStyle = style; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); }
// one layered feather: the shadow it casts on the feather under it (the dark separation), a soft white vane with
// fine barbs, a heavy ink edge on its lower-left side and a light one on the other
function wingFeather(g, root, tip, w, r, { v = 0.86, shadow = 0.6, edge = 2.4, light = 1.2, barbs = 7, sharp = 0.82, soft = false } = {}) {
  const f = featherPts(root, tip, w, 0.25, sharp);
  // separation: a dark wedge just outside the lower-left edge, blurred a little
  g.save(); g.filter = "blur(2.2px)";
  const sh = f.Lp.map(([x, y], i) => [x + f.n[0] * 4 + f.u[0] * 3, y + f.n[1] * 4 + f.u[1] * 3]);
  fillPts(g, [...sh.slice(3), ...f.Lp.slice(3).reverse()], gv(0.1, shadow));
  g.restore();
  const body = [...f.Lp, ...f.Rp.slice().reverse()];
  const gr = g.createLinearGradient(f.Lp[8][0], f.Lp[8][1], f.Rp[8][0], f.Rp[8][1]);
  gr.addColorStop(0, gv(v - 0.1)); gr.addColorStop(0.45, gv(v)); gr.addColorStop(1, gv(v - 0.06));
  if (soft) {
    // a covert lying in the plumage: only its lower part stands out, its root melts into the body
    g.save(); const m = g.createLinearGradient(root[0], root[1], tip[0], tip[1]); m.addColorStop(0, "rgba(0,0,0,0)"); m.addColorStop(0.55, "rgba(0,0,0,1)");
    g.globalAlpha = 0.55; fillPts(g, body, gr); g.restore();
  } else fillPts(g, body, gr);
  // barbs: fine strokes off the shaft toward the edges, pointing to the tip
  for (let i = 0; i < barbs; i++) {
    const t = 0.25 + (i / barbs) * 0.65, side = i % 2 ? 1 : -1, p = f.P(t, 0);
    const dir = nrm(f.u[0] + f.n[0] * side * 0.8, f.u[1] + f.n[1] * side * 0.8);
    flick(g, p, dir, w * (0.35 + r() * 0.25), 0.8, gv(0.3, 0.35 + r() * 0.2), 0.1);
  }
  ink(g, [f.P(0.28, 0), f.P(0.6, 0), f.P(0.88, 0)], 0.8, gv(0.45, 0.35), { end: 0.2 });
  ink(g, f.Lp.slice(soft ? 7 : 4).filter((_, i) => i % 2 === 0).concat([f.Lp[16]]), edge, soft ? gv(0.1, 0.85) : LINE, { end: 0.15, bias: 0.7 });
  ink(g, f.Rp.slice(9).filter((_, i) => i % 2 === 0).concat([f.Rp[16]]), light, gv(0.2, 0.8), { end: 0.2, bias: 0.8 });
}

function paintBody(g) {
  const r = rng(3301);
  const light = [-0.8, -0.5];
  // plumage value study: bright core on the lit left, grey rim on the right and underneath (measured on blurred
  // samples: ~225 on the head's left, ~200 mid-back, ~150 at the right edge and toward the tail)
  plumage(g, blob(OWL), { base: 0.88, shade: 0.6, light, depth: 44, blur: 26 });
  softShade(g, blob(OWL), (c) => c.ellipse(1722, 560, 50, 150, -0.2, 0, TAU), 0.45, 0.45, 24);
  softShade(g, blob(OWL), (c) => c.ellipse(1660, 360, 26, 80, 0, 0, TAU), 0.55, 0.4, 16);
  softShade(g, blob(OWL), (c) => { const pts = []; for (let x = 1470; x <= 1690; x += 10) pts.push([x, NECK_Y(x) + 12]); smoothPath(c, [...pts, [1690, 500], [1470, 500]], true); }, 0.62, 0.3, 12);
  softShade(g, blob(OWL), (c) => c.ellipse(1560, 640, 120, 30, -0.1, 0, TAU), 0.5, 0.35, 16);
  // dense fine feather strokes over the whole bird, following the flow; more and darker in the shade
  g.save(); g.beginPath(); smoothPath(g, OWL, true); g.clip();
  for (let i = 0; i < 2600; i++) {
    const x = 1455 + r() * 320, y = 255 + r() * 445;
    if (!inOwl(x, y)) continue;
    const s = shadeAt(x, y);
    if (r() > 0.35 + 0.65 * s) continue;
    const d = flowAt(x, y), a = (r() - 0.5) * 0.35, c = Math.cos(a), sn = Math.sin(a);
    const dir = [d[0] * c - d[1] * sn, d[0] * sn + d[1] * c];
    flick(g, [x, y], dir, 5 + r() * 9 + s * 5, 0.55 + r() * 0.55, gv(0.3, 0.06 + 0.32 * s * (0.5 + r() * 0.5)), (r() - 0.5) * 0.3);
  }
  // soft white flicks on the lit side (the fluff catching light)
  for (let i = 0; i < 500; i++) {
    const x = 1460 + r() * 200, y = 260 + r() * 400;
    if (!inOwl(x, y) || shadeAt(x, y) > 0.45) continue;
    const d = flowAt(x, y);
    flick(g, [x, y], d, 6 + r() * 10, 0.9 + r() * 0.8, gv(0.99, 0.35 + r() * 0.3), (r() - 0.5) * 0.3);
  }
  // longer feather-group strokes: on the head fanning from the crown, on the body's left flank echoing the contour
  // (the source's layered flank lines), under the head along the ruff
  for (let i = 0; i < 70; i++) {
    const an = -0.1 + r() * 2.6, rr = 30 + r() * 150, x = CROWN[0] + Math.cos(an) * rr * 1.05, y = CROWN[1] + 10 + Math.sin(an) * rr * 0.95;
    if (!inOwl(x, y) || y > NECK_Y(x) - 6) continue;
    const d = flowAt(x, y), s = shadeAt(x, y);
    flick(g, [x, y], d, 12 + r() * 16, 0.8 + r() * 0.5, gv(0.3, 0.18 + 0.35 * s), (r() - 0.5) * 0.4);
  }
  for (const [pts, w, a] of [
    [[[1476, 470], [1478, 520], [1490, 562], [1512, 594], [1536, 612]], 1.4, 0.55],
    [[[1494, 474], [1496, 520], [1510, 560], [1532, 592], [1558, 610]], 1.2, 0.45],
    [[[1512, 486], [1518, 530], [1534, 566], [1552, 590]], 1.1, 0.4],
    [[[1470, 520], [1476, 556], [1492, 584]], 1.1, 0.4],
  ]) ink(g, pts, w, gv(0.25, a), { end: 0.1, bias: 0.4 });
  g.restore();
  // ruff: the head's round lower edge over the body, a soft row of downward flicks, faint on the lit left and
  // firmer on the right where the head overlaps the shoulder
  const ruff = []; for (let x = 1474; x <= 1684; x += 4) ruff.push([x, NECK_Y(x)]);
  ruff.forEach(([x, y], i) => {
    if (!inOwl(x, y + 6)) return;
    const d = flowAt(x, y + 20), k = Math.min(1, Math.max(0, (x - 1540) / 130));
    if (r() > 0.35 + 0.65 * k) return;
    flick(g, [x + (r() - 0.5) * 4, y - 6 + (r() - 0.5) * 8], d, 8 + r() * 12, 0.8 + r() * 0.7, gv(0.3, 0.12 + 0.4 * k * (0.5 + r() * 0.5)), (r() - 0.5) * 0.4);
  });
  ink(g, [[1600, NECK_Y(1600) - 4], [1630, NECK_Y(1630) - 6], [1655, NECK_Y(1655) - 10], [1672, 424]], 1.2, gv(0.25, 0.45), { end: 0.1, bias: 0.8 });
}

function paintWing(g) {
  const r = rng(3321);
  // the folded wing's coverts/secondaries, back (right) to front (left), then the lower edge of the body over their
  // roots; the primaries' fan at the lower right drawn first (under the secondaries)
  PRIMARIES.forEach(([root, tip, w]) => wingFeather(g, root, tip, w, r, { v: 0.84, shadow: 0.7, edge: 2.8, light: 1.6, barbs: 9, sharp: 0.6 }));
  COVERTS.forEach(([root, tip, w]) => wingFeather(g, root, tip, w, r, { v: 0.86, shadow: 0.12, edge: 1.5, light: 0.5, barbs: 8, sharp: 0.7, soft: true }));
  // the wing's leading edge and the long lines of the tertials above the coverts
  ink(g, [[1600, 470], [1630, 520], [1660, 566], [1686, 600], [1700, 612]], 1.6, gv(0.2, 0.75), { end: 0.1, bias: 0.4 });
  ink(g, [[1620, 480], [1650, 526], [1676, 568], [1698, 596]], 1.1, gv(0.25, 0.55), { end: 0.1 });
  ink(g, [[1566, 478], [1592, 512], [1614, 544], [1634, 580], [1646, 598]], 1.3, gv(0.2, 0.6), { end: 0.1 });
  // the belly's lower edge over the shoulder, heavy
  ink(g, [[1510, 612], [1546, 628], [1576, 638], [1604, 646], [1640, 654], [1664, 664]], 3, LINE, { end: 0.3 });
}

function paintContour(g) {
  const r = rng(3331);
  // body's lit left edge: a heavy line (as in the source), broken near the top into feather flicks
  ink(g, [[1462, 452], [1462, 480], [1462, 512], [1470, 551], [1482, 582], [1502, 603], [1524, 626]], 3.2, LINE, { end: 0.4 });
  // the right side of the body: heavy, from under the far cup down to the primaries
  ink(g, [[1672, 410], [1693, 430], [1712, 452], [1724, 492], [1731, 535], [1736, 574], [1746, 598], [1762, 620]], 2.8, LINE, { end: 0.3 });
  // the head's outline: soft, made of short overlapping feather flicks (fuzzy), darker on the shaded right
  const head = sampleCurve([[1486, 286], [1510, 273], [1540, 265], [1566, 260], [1584, 257], [1600, 259], [1612, 265], [1633, 277], [1653, 297], [1663, 323], [1667, 357], [1667, 390], [1672, 410]], 8);
  head.forEach((p, i) => {
    const q = head[Math.min(head.length - 1, i + 1)], tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.hypot(tx, ty) || 1;
    const u = i / head.length, dark = 0.25 + 0.6 * u;
    // flick from just outside the edge inward along the flow
    const d = flowAt(p[0], p[1]);
    if (r() < 0.9) flick(g, [p[0] - (ty / tl) * 1.5, p[1] + (tx / tl) * 1.5], nrm(d[0] + (ty / tl) * 0.6, d[1] - (tx / tl) * 0.6), 6 + r() * 8, 1 + r() * 0.6 + u * 0.8, gv(0.12, dark), (r() - 0.5) * 0.3);
    if (u > 0.55 && r() < 0.25) flick(g, [p[0] + (ty / tl) * 1, p[1] - (tx / tl) * 1], nrm((ty / tl) * -1 + d[0] * 0.8, (tx / tl) + d[1] * 0.8), 3 + r() * 4, 1, gv(0.85, 0.7), 0.2);
  });
  // the tuft: a soft flame of three feathers at the crown leaning right (tallest tip (1604,234)), white with a dark
  // separation on the right of each and fine barbs
  for (const [x, y, dx, dy, w, dk] of [[1574, 268, 8, -12, 14, 0.3], [1587, 267, 12, -20, 16, 0.45], [1598, 268, 8, -28, 15, 0.6]]) {
    const tip = [x + dx, y + dy], m = [x + dx * 0.5, y + dy * 0.55];
    const L = sampleCurve([[x - w / 2, y + 6], [m[0] - w * 0.42, m[1]], tip], 6), R = sampleCurve([tip, [m[0] + w * 0.38, m[1] + 3], [x + w / 2, y + 8]], 6);
    g.fillStyle = gv(0.88); g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (const p of [...L, ...R]) g.lineTo(p[0], p[1]); g.closePath(); g.fill();
    ink(g, R.slice(0, R.length - 2), 1.1, gv(0.2, dk), { end: 0.1, bias: 0.3 });
    ink(g, L.slice(1, L.length - 1), 0.9, gv(0.35, 0.35), { end: 0.1, bias: 0.6 });
    for (let k = 0; k < 4; k++) flick(g, [x - w * 0.2 + k * w * 0.12, y + 2], nrm(dx + (k - 1.5) * 2, dy), Math.hypot(dx, dy) * (0.5 + 0.1 * k), 0.7, gv(0.4, 0.3), 0.15);
  }
}

// toes gripping the sweater under the belly (measured: three knobby grey toe segments at (1507–1578, 619–648), a
// dark gap under them); the talons hook over the shoulder
function paintFoot(g) {
  const r = rng(3351);
  // one knobbly toe wrapped over the shoulder, three pads along it, a dark gap underneath, the talon at its tip
  const toe = sampleCurve([[1578, 646], [1556, 642], [1532, 636], [1512, 628], [1504, 634]], 8);
  const W = (u) => Math.min(14, 5 + 45 * u) - 4 * u + 2 * Math.sin(u * Math.PI * 3);
  g.save(); g.filter = "blur(2px)"; taper(g, toe.map(([x, y]) => [x + 1, y + 6]), (u) => W(u) * 0.9, gv(0.08, 0.75)); g.restore();
  const gr = g.createLinearGradient(0, 622, 0, 652); gr.addColorStop(0, gv(0.88)); gr.addColorStop(1, gv(0.55));
  taper(g, toe, W, gr);
  // outline and the pad creases
  const L = [], R = [];
  toe.forEach((p, i) => { const q = toe[Math.min(toe.length - 1, i + 1)], o = toe[Math.max(0, i - 1)], d = nrm(q[0] - o[0], q[1] - o[1]), w = W(i / (toe.length - 1)) / 2; L.push([p[0] - d[1] * w, p[1] + d[0] * w]); R.push([p[0] + d[1] * w, p[1] - d[0] * w]); });
  ink(g, L, 2, LINE, { end: 0.4 }); ink(g, R.slice(0, R.length - 3), 1.4, gv(0.15, 0.8), { end: 0.4 });
  for (const u of [0.3, 0.55, 0.78]) { const i = Math.round(u * (toe.length - 1)); ink(g, [L[i], toe[i], R[i]], 1.1, gv(0.25, 0.7), { end: 0.3 }); }
  const e = toe[toe.length - 1];
  ink(g, [[e[0] + 2, e[1] - 4], [e[0] - 5, e[1] + 2], [e[0] - 3, e[1] + 10], [e[0] + 2, e[1] + 14]], 2.6, LINE, { end: 0.05, bias: 0.25 });
  // belly feathers spilling over the toe
  for (let i = 0; i < 20; i++) { const x = 1508 + i * 3.6 + r() * 3, y = 618 + i * 1.2; flick(g, [x, y], [0.3, 1], 5 + r() * 6, 1.1, gv(0.95, 0.9), 0.1); }
}

// two plasters crossed on the back of its head (both long; the upper one carries the pad)
function plaster(g, cx, cy, len, wd, a, pad, seed) {
  const r = rng(seed);
  g.save(); g.translate(cx, cy); g.rotate(a);
  g.fillStyle = gv(0.9); g.beginPath(); g.roundRect(-len / 2, -wd / 2, len, wd, wd / 2); g.fill();
  g.fillStyle = gv(0.7, 0.35); g.fillRect(-len / 2 + wd / 2, wd * 0.15, len - wd, wd * 0.3);
  if (pad) {
    g.fillStyle = gv(0.84); g.beginPath(); g.roundRect(-wd * 0.75, -wd * 0.42, wd * 1.5, wd * 0.84, 3); g.fill();
    g.strokeStyle = gv(0.25, 0.8); g.lineWidth = 1.2; g.stroke();
    g.fillStyle = gv(0.35, 0.6); for (let i = 0; i < 10; i++) g.fillRect(-wd * 0.6 + r() * wd * 1.2, -wd * 0.3 + r() * wd * 0.6, 1.2, 1.2);
  }
  g.fillStyle = gv(0.3, 0.8);
  for (let i = 0; i < 8; i++) { const x = (-0.42 + (i % 4) * 0.08) * len * (i < 4 ? 1 : -1), y = (i % 2 ? 0.22 : -0.22) * wd; g.fillRect(x, y, 1.5, 1.5); }
  g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); g.roundRect(-len / 2, -wd / 2, len, wd, wd / 2); g.stroke();
  g.restore();
}
function paintBandage(g) {
  plaster(g, 1530, 321, 90, 20, 0.43, false, 3341);
  plaster(g, 1532, 320, 86, 21, -0.76, true, 3342);
}

// engraved concentric lines inside an ellipse ring (from k0 to k1 of its radii), arc a0..a1
function rings(g, x, y, rx, ry, rot, k0, k1, n, a0, a1, color, w, seed) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const k = k0 + (k1 - k0) * ((i + 0.5) / n), s = a0 + (r() - 0.5) * 0.3, e = a1 + (r() - 0.5) * 0.3;
    g.strokeStyle = color; g.lineWidth = w * (0.6 + r() * 0.8);
    g.beginPath(); g.ellipse(x, y, rx * k, ry * k, rot, s, e); g.stroke();
  }
}
// headphones (measured on the 3.6x crop): the band 10–12 px wide arcing over the crown; the slider block
// (1438–1461, 288–311) and the yoke arm down to the shell; the near cup's shell (x 1413–1497, y 347–458) with its
// back plate, and the dark ribbed cushion (value ≈0.12) showing on its right toward the head; the far cup's dark
// crescent behind the head's right edge
function paintPhones(g) {
  // band: dark keyline, grey face, a lighter stripe along the upper edge, engraved lengthwise lines
  const q = sampleCurve(BAND, 8);
  taper(g, q, () => 14, LINE);
  taper(g, q, () => 10, gv(0.62));
  taper(g, q.map(([x, y]) => [x - 1.2, y - 1.8]), () => 2.6, gv(0.92, 0.9));
  taper(g, q.map(([x, y]) => [x + 1.6, y + 2.4]), () => 1.1, gv(0.3, 0.7));
  // far cup behind the head: a dark ribbed crescent with a keyline
  g.save();
  g.lineWidth = 12; g.strokeStyle = "#0b0b0b"; g.beginPath(); g.ellipse(1668, 334, 18, 46, 0.05, -1.45, 1.55); g.stroke();
  g.lineWidth = 1.3; g.strokeStyle = gv(0.6, 0.8);
  for (let k = -1.25; k < 1.45; k += 0.16) { const x = 1668 + Math.cos(k) * 19, y = 334 + Math.sin(k) * 46; g.beginPath(); g.moveTo(x - 3.5, y); g.lineTo(x + 3, y + 1); g.stroke(); }
  g.lineWidth = 1.6; g.strokeStyle = LINE; g.beginPath(); g.ellipse(1668, 334, 26, 52, 0.05, -1.3, 1.4); g.stroke();
  g.restore();
  // yoke arm from the slider down round the shell's top-left
  ink(g, [[1452, 304], [1446, 322], [1438, 340], [1430, 356]], 13, LINE, { end: 0.9, pow: 0.2 });
  ink(g, [[1452, 304], [1446, 322], [1438, 340], [1430, 356]], 8.5, gv(0.7), { end: 0.9, pow: 0.2 });
  ink(g, [[1450, 306], [1443, 324], [1435, 342]], 2, gv(0.95, 0.9), { end: 0.5 });
  // slider block
  g.save(); g.translate(1450, 299); g.rotate(-0.2);
  const sg = g.createLinearGradient(-12, 0, 12, 0); sg.addColorStop(0, gv(0.88)); sg.addColorStop(1, gv(0.5));
  g.fillStyle = sg; g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); g.roundRect(-12, -11, 24, 22, 3); g.fill(); g.stroke();
  g.strokeStyle = gv(0.3, 0.6); g.lineWidth = 1; for (const yy of [-4, 3]) { g.beginPath(); g.moveTo(-10, yy); g.lineTo(10, yy + 0.5); g.stroke(); }
  g.restore();
  // cushion: dark ring toward the head with white rib ticks along its outer part
  const cx = 1476, cy = 393;
  g.fillStyle = "#121212"; g.beginPath(); g.ellipse(cx, cy, 36, 62, -0.08, 0, TAU); g.fill();
  const rr = rng(3361);
  g.lineCap = "round";
  for (let i = -15; i <= 15; i++) {
    const t = i / 16, a = t * 1.35, x0 = cx + Math.cos(a) * 22, y0 = cy + Math.sin(a) * 50;
    g.strokeStyle = gv(0.62 + rr() * 0.3, 0.9); g.lineWidth = 1.3 + rr() * 1.2;
    g.beginPath(); g.moveTo(x0 + 2, y0); g.lineTo(x0 + 9 + rr() * 5, y0 + 1.5); g.stroke();
  }
  rings(g, cx, cy, 36, 62, -0.08, 0.93, 0.98, 2, -1.3, 1.3, gv(0.55, 0.6), 1, 3362);
  g.strokeStyle = LINE; g.lineWidth = 2.4; g.beginPath(); g.ellipse(cx, cy, 36, 62, -0.08, 0, TAU); g.stroke();
  // shell rim: engraved grey band round the back plate (darker toward the cushion), then the back plate
  const sx = 1452, sy = 401;
  const shell = (c) => c.ellipse(sx, sy, 38, 56, -0.06, 0, TAU);
  const sgr = g.createLinearGradient(sx - 38, sy - 40, sx + 38, sy + 40); sgr.addColorStop(0, gv(0.66)); sgr.addColorStop(0.55, gv(0.45)); sgr.addColorStop(1, gv(0.24));
  g.fillStyle = sgr; g.beginPath(); shell(g); g.fill();
  g.save(); g.beginPath(); shell(g); g.clip();
  rings(g, sx, sy, 38, 56, -0.06, 0.72, 0.98, 7, -2.8, 2.6, gv(0.2, 0.45), 1, 3363);
  rings(g, sx, sy, 38, 56, -0.06, 0.74, 0.96, 3, 2.3, 3.8, gv(0.95, 0.4), 1, 3364);
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = 3; g.beginPath(); shell(g); g.stroke();
  // back plate: flat light grey, shaded to the lower right, engraved with fine concentric lines, a keyline
  const px = 1444, py = 404;
  const plate = (c) => c.ellipse(px, py, 25, 44, -0.06, 0, TAU);
  const pg = g.createLinearGradient(px - 25, py - 30, px + 25, py + 40); pg.addColorStop(0, gv(0.82)); pg.addColorStop(0.6, gv(0.64)); pg.addColorStop(1, gv(0.4));
  g.fillStyle = pg; g.beginPath(); plate(g); g.fill();
  g.save(); g.beginPath(); plate(g); g.clip();
  rings(g, px, py, 25, 44, -0.06, 0.25, 0.95, 9, -1.2, 1.9, gv(0.25, 0.3), 0.9, 3365);
  for (let i = 0; i < 14; i++) { const y = py - 36 + i * 5.5; g.strokeStyle = gv(0.3, 0.18); g.lineWidth = 0.8; g.beginPath(); g.moveTo(px - 26, y + 6); g.lineTo(px + 26, y - 6); g.stroke(); }
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); plate(g); g.stroke();
  // the rim's bright edge on the lit left
  g.strokeStyle = gv(0.95, 0.75); g.lineWidth = 1.5; g.beginPath(); g.ellipse(sx, sy, 34.5, 52.5, -0.06, 2.3, 3.7); g.stroke();
}

function paintOwl(g) {
  setPPU(1);
  paintBody(g);
  paintFoot(g);
  paintWing(g);
  paintContour(g);
  paintBandage(g);
  paintPhones(g);
}

let layer = null;
// The owl as a cached layer: { canvas, x, y }
export function owlBack() {
  if (layer) return layer;
  const x0 = 1380, y0 = 180, w = 420, h = 540;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.translate(-x0, -y0);
  paintOwl(g);
  layer = { canvas: c, x: x0, y: y0 };
  return layer;
}
export function releaseOwl() { layer = null; }
