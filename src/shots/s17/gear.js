// s17's repaints inside F1's sōko page (fix pass 1): which layers of F1's illustration this shot paints itself
// (REPAINT: instead of F1's layer; AFTER: over F1's layer, in its place in the stack) and the finishing pass over the
// whole illustration (finishIll). See s17/page.js (the page build) and s17/designer.js (the designer).
import { paintHead, paintTorso, paintHeadphones, paintBloom, paintBoots } from "./designer.js";
import { paintTrousers } from "./legs.js";
import {
  PI, clamp, lerp, sstep, grey, P2, S, carve, clothPaint, ink, curve, fill, dot, ring, sampleCurve, BL, UG, edge, dark, knob, cable, softEll, rng,
} from "./kit.js";

// ======================================================================================
// the cables over the desk's front edge: F1's, plus the tangle the source has under the right end of the desk
// (plate 48.8–50.4 at 1.4x: a dozen dark cables with grey highlights hanging in loops from the desk edge down across
// the trestle's legs to the floor, x 1340–1510), and two loops hanging over the edge at the left (x 900–965)
// ======================================================================================
function paintDeskCables(g) {
  cable(g, [[938, 525], [928, 560], [912, 640], [900, 740], [884, 820], [868, 860]], 4.2, 1000, 0.55);
  cable(g, [[955, 524], [952, 560], [930, 640], [904, 720], [880, 800], [850, 870]], 4.2, 1001, 0.5);
  cable(g, [[1296, 520], [1300, 560], [1296, 640], [1280, 720], [1266, 790], [1250, 860]], 3.8, 1002, 0.5);
  cable(g, [[1305, 520], [1312, 580], [1316, 660], [1330, 760], [1338, 850]], 3.6, 1003, 0.45);
  // (fix pass 2) the mixer's cables: pass 1's were thin straight lines from each jack to the floor plus a tangle of
  // thin loops ("string art", the reviewer); the plate (3x) has a few thick dark cables (4–5 px, a grey rim) hanging
  // from the jacks (x 1365–1465, y ~503) in sagging curves — two down and to the left past the trestle's brace, one
  // nearly straight down, two down and to the right behind the speaker — and a loop over the desk's edge at the left
  const r = rng(1900); void r;
  for (const [pts, w, lit] of [
    [[[1365, 506], [1362, 540], [1352, 580], [1334, 640], [1314, 700], [1302, 770], [1296, 860]], 4.6, 0.5],
    [[[1388, 506], [1386, 546], [1381, 600], [1378, 660], [1376, 720], [1371, 800], [1366, 870]], 4.4, 0.48],
    [[[1410, 506], [1403, 540], [1394, 575], [1392, 620], [1398, 680], [1404, 740]], 3.8, 0.42],
    [[[1440, 506], [1447, 540], [1457, 580], [1470, 640], [1482, 700], [1490, 780], [1494, 870]], 4.4, 0.48],
    [[[1465, 506], [1477, 530], [1491, 562], [1500, 600]], 3.8, 0.42],
    [[[1300, 516], [1318, 530], [1330, 552], [1324, 596], [1306, 628], [1292, 664]], 4.2, 0.5],
  ]) cable(g, pts, w, 1910 + pts[0][0], lit, { hw: 0.3 });
  for (const [pts, w] of [[[[906, 524], [900, 548], [912, 566], [930, 560], [938, 530]], 3.0], [[[944, 524], [940, 552], [952, 574], [968, 566], [966, 530]], 2.8]]) cable(g, pts, w, 1930 + pts[0][0], 0.45, { hw: 0.3 });
}

// ======================================================================================
// the right low gear: F1's rightLow (flight case, cartons, book, backpack, magazines, floor gear, cables), with the
// backpack repainted (fix pass 1): the source's backpack (plate at 2.2x) is a solid dark bag whose two padded straps
// carry thick lit rims (2–3 px, ~0.85) and a worn grey surface, not thin outlines round a hatched void
// ======================================================================================
function paintRightLow(g) {
  // the flight case right of the synth (measured at 3x): black, an aluminium frame — top rail, middle rail with a
  // butterfly latch and clamp blocks, corner brackets with bolts, posts — and a handle on top
  fill(g, [[1792, 510], [1970, 510], [1970, 763], [1792, 763]], "#040404");
  // aluminium bars: dark with a bright highlight streak along them and a thinner second one (measured at 3x)
  const bar = (q, dir, seed, v = 0.34) => {
    fill(g, q, grey(0.08));
    const [A, B, C, D] = q, h = dir === "h";
    const line = (t, w, val) => { const p0 = h ? P2(A, D, t) : P2(A, B, t), p1 = h ? P2(B, C, t) : P2(D, C, t); ink(g, [p0, p1], w, grey(val), { seed: seed + Math.round(t * 100), ends: 0.85, jit: 0.35 }); };
    // (fix pass 2) dimmer: the plate's bars read p90 ~109 graded, ours ~140
    line(0.32, h ? (D[1] - A[1]) * 0.28 : (B[0] - A[0]) * 0.28, v * 1.0); line(0.72, 1, v * 0.7); dark(g, q, 1, seed + 1, { closed: true });
  };
  bar([[1852, 512], [1919, 512], [1919, 522], [1852, 522]], "h", 1560, 0.55);
  bar([[1799, 525], [1965, 525], [1965, 539], [1799, 539]], "h", 1562);
  bar([[1792, 574], [1965, 574], [1965, 599], [1792, 599]], "h", 1564, 0.55);
  bar([[1799, 525], [1819, 525], [1819, 652], [1799, 652]], "v", 1566, 0.55);
  bar([[1945, 525], [1965, 525], [1965, 642], [1945, 642]], "v", 1568, 0.5);
  bar([[1954, 600], [1970, 600], [1970, 763], [1954, 763]], "v", 1569, 0.18);
  for (const [x0, y0, bx, by] of [[1799, 524, 1809, 532], [1942, 524, 1956, 532]]) { fill(g, [[x0, y0], [x0 + 26, y0], [x0 + 26, y0 + 8], [x0 + 8, y0 + 28], [x0, y0 + 28]], grey(0.42)); dark(g, [[x0, y0], [x0 + 26, y0], [x0 + 26, y0 + 8], [x0 + 8, y0 + 28], [x0, y0 + 28]], 1, x0, { closed: true }); dot(g, bx, by, 3, grey(0.1)); ring(g, bx, by, 3, 1, grey(0.7)); }
  for (const x0 of [1792, 1944]) { fill(g, [[x0, 571], [x0 + 30, 571], [x0 + 30, 603], [x0, 603]], grey(0.3)); carve(g, [[x0, 571], [x0 + 30, 571], [x0 + 30, 603], [x0, 603]], { ang: 0, v: 0.3, per: 3, seed: x0, over: true }); dark(g, [[x0, 571], [x0 + 30, 571], [x0 + 30, 603], [x0, 603]], 1.1, x0 + 2, { closed: true }); dot(g, x0 + 8, 580, 1.5, grey(0.8)); dot(g, x0 + 22, 594, 1.5, grey(0.8)); }
  fill(g, S([[1902, 569], [1932, 569], [1932, 615], [1902, 615]], false), grey(0.3));
  ink(g, [[1903, 570], [1931, 570], [1931, 614], [1903, 614]], 1.6, grey(0.75), { closed: true, seed: 1571 });
  carve(g, [[1908, 575], [1926, 575], [1926, 609], [1908, 609]], { ang: 0, v: 0.5, per: 3.4, seed: 1572 });
  // (fix pass 2) a dark cable arching over the case's top from its left and down its right side (plate at 3.5x)
  cable(g, [[1826, 506], [1850, 492], [1882, 486], [1918, 490], [1950, 504], [1974, 528], [1988, 562]], 4, 1559, 0.3, { hw: 0.28 });
  // the big lit carton in front of it (lower right) and a narrow lit carton at the flight case's right
  carve(g, null, { q: [[1776, 652], [1860, 648], [1860, 832], [1776, 832]], vq: (u, v) => lerp(0.22, 0.52, sstep(0.1, 0.9, u)) * lerp(1, 0.8, v), per: 4.4, seed: 1573 });
  edge(g, [[1776, 652], [1860, 648]], 1.2, 0.8, 1574);
  carve(g, null, { q: [[1830, 649], [1857, 649], [1857, 844], [1830, 844]], vq: UG(0.5, 0.35), per: 4, seed: 1575 });
  // a pale book standing on end against the flight case (front face lit, strokes slanting down-left, a thick dark
  // spine at its right), a dark box under it
  const bk = [[1991, 545], [2062, 541], [2066, 646], [1994, 648]];
  carve(g, bk, { ang: 1.95, vq: null, vf: (x, y) => lerp(0.66, 0.46, (y - 545) / 103), per: 3.2, seed: 1576, streak: 0.5, stL: 14, brk: 0.4, brkL: 12, wav: 0.1 });
  dark(g, bk, 1.3, 1577, { closed: true });
  fill(g, [[2062, 541], [2086, 551], [2084, 610], [2066, 620]], grey(0.08)); edge(g, [[2062, 541], [2086, 551]], 1.1, 0.6, 1578);
  carve(g, null, { q: [[1958, 650], [2000, 650], [2000, 758], [1958, 758]], v: 0.06, per: 4.6, seed: 1579 });
  const strap = (C, w, seed, v) => {
    const q = sampleCurve(C, 10), n = q.length, L = [], R = [];
    for (let i = 0; i < n; i++) { const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; L.push([q[i][0] - dy / d * w / 2, q[i][1] + dx / d * w / 2]); R.push([q[i][0] + dy / d * w / 2, q[i][1] - dx / d * w / 2]); }
    const poly = [...L, ...R.reverse()];
    fill(g, poly, grey(0.06));
    clothPaint(g, poly, { vp: (c) => { c.fillStyle = grey(v); c.fillRect(1990, 590, 200, 290); }, ang: 0.06, per: 2.6, seed, segL: [6, 20], gapL: [2, 6], hiP: 0.9, baseK: 0.5 });
    // (fix pass 2) the plate's straps (2.5x) are wide padded bands, ribbed across every ~26 px (grey rib lines with a
    // lit upper edge), their rims grey (~0.5), not pass 1's bright white rims (the reviewer: "an unfinished wireframe")
    ink(g, L, 1.8, grey(0.52, 0.9), { seed: seed + 1, ends: 0.45 }); ink(g, R.reverse(), 1.3, grey(0.38, 0.85), { seed: seed + 2, ends: 0.45 });
    let acc = 0;
    for (let i = 1; i < n; i++) {
      acc += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
      if (acc < 26) continue;
      acc = 0;
      const l = L[i], rr = R[n - 1 - i] || R[0];
      ink(g, [l, rr], 2.2, grey(0.04, 0.9), { seed: seed + i, ends: 0.6 });
      ink(g, [[l[0], l[1] - 2], [rr[0], rr[1] - 2]], 1.3, grey(0.46, 0.85), { seed: seed + i + 50, ends: 0.5 });
    }
    return q;
  };
  const body = [[2010, 700], [2022, 660], [2045, 636], [2080, 624], [2120, 624], [2155, 640], [2178, 680], [2192, 740], [2194, 800], [2190, 864], [2112, 868], [2050, 864], [2018, 830], [2008, 760]];
  fill(g, S(body, true), "#050505");
  clothPaint(g, S(body, true), { vp: (c) => { c.fillStyle = grey(0.1); c.fillRect(2010, 620, 180, 250); softEll(c, 2084, 750, 26, 90, 0.2, grey(0.26), 14); softEll(c, 2030, 780, 18, 60, 0, grey(0.18), 12); }, ang: 1.45, per: 3, seed: 1590, segL: [8, 26], hiP: 0.6, baseK: 0.6 });
  ink(g, [[2006, 780], [2006, 710], [2016, 664], [2038, 634], [2074, 620]], 1.4, grey(0.45, 0.9), { smooth: true, seed: 1589, ends: 0.3 });
  curve(g, [[2064, 632], [2080, 612], [2106, 610], [2120, 626]], 3.5, grey(0.05), { seed: 1588 }); curve(g, [[2066, 630], [2081, 613], [2105, 611], [2118, 624]], 1.4, grey(0.5), { seed: 1587 });
  for (const x of [2045, 2066, 2088]) ink(g, [[x, 650], [x + 4, 740], [x + 8, 860]], 1, grey(0.26, 0.8), { smooth: true, seed: x });
  // (fix pass 1) the straps' paths re-read on the plate at 2.2x: the front strap arches from low on the bag's left
  // (2028, 690) over its top (2072, 628) and runs down to the right to the floor at x ~2158; the rear strap behind it
  // from (2118, 625) down the bag's right side
  // (fix pass 2) the front strap re-read at 2.5x: one wide (~36 px) padded arch from the floor at the bag's left
  // (2024, 858) up over its top (2088, 624) and down its right to the floor at x ~2138; the rear strap narrower, dimmer
  strap([[2130, 628], [2152, 640], [2168, 668], [2178, 710], [2185, 770], [2188, 862]], 16, 1591, 0.12);
  const q1 = strap([[2024, 858], [2024, 770], [2028, 705], [2040, 664], [2060, 638], [2088, 624], [2108, 640], [2120, 680], [2127, 730], [2133, 790], [2138, 858]], 34, 1593, 0.2);
  ink(g, [[2060, 668], [2066, 720], [2070, 780]], 1.2, grey(0.34, 0.8), { smooth: true, seed: 1598 });
  for (const [x, y] of [[2121, 688], [2178, 702]]) { fill(g, [[x - 11, y - 9], [x + 11, y - 11], [x + 12, y + 9], [x - 10, y + 11]], grey(0.1)); ink(g, [[x - 11, y - 9], [x + 11, y - 11], [x + 12, y + 9], [x - 10, y + 11]], 1.4, grey(0.55), { closed: true, seed: x }); }
  ink(g, [[2134, 730], [2144, 800], [2150, 860]], 1.1, grey(0.32, 0.8), { smooth: true, seed: 1597 });
  // the magazine stack (x 1905–2085, y 757–855): lit fronts at the left, darker toward the right
  for (let i = 0; i < 6; i++) {
    const y = 758 + i * 16, x0 = 1905 + [8, 0, 6, 2, 8, 4][i], x1 = 2083 - [10, 4, 0, 8, 2, 6][i];
    carve(g, null, { q: [[x0, y], [x1, y - 1], [x1 + 1, y + 16], [x0 - 1, y + 16]], dir: "h", vq: (u, v) => lerp(0.4, 0.14, sstep(0.2, 0.55, u)) * lerp(1, 0.6, v) * (i === 0 ? 0.6 : 1), per: 2.6, seed: 1580 + i * 2, bg: 0.2, streak: 0.5, stL: 30 });
    dark(g, [[x0, y], [x1, y - 1]], 1.2, 1581 + i * 2);
  }
  // floor gear right of the speaker (measured at 3.4x): a dark rack device with a lit top edge, a small white box
  // with a knob, a grey box with a display window, a striped pale box, a pale pedal with a hole, a flat box
  fill(g, [[1638, 757], [1759, 757], [1759, 798], [1638, 798]], "#050505"); edge(g, [[1656, 759], [1733, 759]], 2, 0.8, 1597);
  for (const [x, y] of [[1712, 770], [1722, 780], [1730, 790]]) fill(g, [[x, y], [x + 10, y], [x + 10, y + 3], [x, y + 3]], grey(0.7));
  carve(g, null, { q: [[1603, 765], [1635, 765], [1635, 795], [1603, 795]], dir: "h", v: 0.72, per: 3, seed: 1598, bg: 0.5 }); knob(g, 1620, 776, 4, { lit: 0.5 });
  fill(g, [[1620, 798], [1682, 798], [1682, 853], [1620, 853]], grey(0.28)); carve(g, [[1620, 798], [1682, 798], [1682, 853], [1620, 853]], { ang: PI / 2, v: 0.5, per: 3.2, seed: 1599, over: true, alpha: 0.6 });
  fill(g, [[1629, 809], [1655, 809], [1655, 830], [1629, 830]], grey(0.08)); edge(g, [[1629, 809], [1655, 809], [1655, 830], [1629, 830]], 1.1, 0.7, 1600, { closed: true });
  for (let i = 0; i < 5; i++) knob(g, 1630 + i * 11, 843, 2.4, { lit: 0.5 });
  dark(g, [[1620, 798], [1682, 798], [1682, 853], [1620, 853]], 1.2, 1601, { closed: true });
  carve(g, null, { q: [[1682, 799], [1729, 799], [1729, 851], [1682, 851]], vq: (u, v) => lerp(0.42, 0.2, v), per: 3.6, seed: 1602, streak: 0.5 });
  carve(g, null, { q: [[1750, 824], [1774, 824], [1774, 859], [1750, 859]], v: 0.78, per: 3, seed: 1603, bg: 0.5 }); dot(g, 1761, 843, 3.5, grey(0.04));
  fill(g, [[1774, 824], [1835, 824], [1835, 859], [1774, 859]], grey(0.28)); fill(g, [[1786, 832], [1820, 832], [1820, 852], [1786, 852]], grey(0.08));
  dark(g, [[1750, 824], [1835, 824], [1835, 859], [1750, 859]], 1.2, 1604, { closed: true });
  carve(g, null, { q: [[1530, 855], [1622, 855], [1622, 878], [1530, 878]], dir: "h", vq: BL(0.7, 0.6, 0.45, 0.5), per: 2.8, seed: 1605 });
  dark(g, [[1530, 855], [1622, 855], [1622, 878], [1530, 878]], 1.2, 1606, { closed: true });
  // cables arching over the gear from the synth and the speaker to the floor
  cable(g, [[1560, 760], [1600, 745], [1660, 742], [1720, 760], [1780, 790], [1840, 812]], 4.2, 1607, 0.5);
  cable(g, [[1600, 760], [1640, 745], [1700, 745], [1750, 770], [1800, 820], [1820, 860]], 3.8, 1608, 0.5);
  cable(g, [[1540, 820], [1580, 790], [1640, 770], [1700, 772], [1760, 800]], 3.8, 1609, 0.45);
  cable(g, [[1480, 830], [1530, 800], [1570, 790], [1620, 790]], 3.4, 1610, 0.4);
}

// ======================================================================================
// the gear's engraving contrast (fix pass 1): F1's gear right and left of the desk is lower in contrast than the
// source (graded p95 20–25 lower, p50 3–10 higher on the plate): a tone curve on the illustration's pre-grade values
// there — the shadow floor pulled down, the strokes' brightness up ~10 % — outside the designer, desk and lamp
// ======================================================================================
// x0, y0, x1, y1, feather px, gamma, gain (graded p50 / p95 against the plate after: left 13 / 206 vs 15 / 212, right
// 11 / 180 vs 10 / 185 at 50.04; before: left 19 / 189, right 16 / 161)
const GEAR_REGIONS = [[0, 140, 610, 946, 60, 1.12, 1.15], [1480, 50, 2206, 946, 60, 1.18, 1.2]];
function gearCurve(v, gm, gn) { const x = clamp((v - 0.035) / 0.965); return clamp(Math.pow(x, gm) * gn); }
export function finishIll(g) {
  const W = g.canvas.width, H = g.canvas.height;
  const id = g.getImageData(0, 0, W, H), d = id.data;
  for (const [x0, y0, x1, y1, f, gm, gn] of GEAR_REGIONS) {
    const LUT = new Float32Array(256); for (let i = 0; i < 256; i++) LUT[i] = gearCurve(i / 255, gm, gn) * 255;
    for (let y = y0; y < Math.min(H, y1); y++) for (let x = x0; x < Math.min(W, x1); x++) {
      // feathered toward the centre of the page (x 610 / 1480), so no seam shows
      const k = x0 === 0 ? clamp((x1 - x) / f) : clamp((x - x0) / f);
      if (k <= 0) continue;
      const j = (y * W + x) * 4, v = d[j];
      const o = v + (LUT[v] - v) * k;
      d[j] = d[j + 1] = d[j + 2] = o;
    }
  }
  g.putImageData(id, 0, 0);
}

// ======================================================================================
// (fix pass 2) the amp and the pedals, over F1's recordsAmp / pedalboard
// ======================================================================================
// the amp's left side is a dark side panel, not pale front (plate rows at y 750–845: ~20–90 graded over x 438–468,
// the pale front starting at x ~470; F1's pale body ran from x 434); a thin lit edge at the front's corner
function ampFix(g) {
  const side = [[436, 737], [468, 739], [469, 847], [436, 847]];
  fill(g, side, grey(0.05));
  carve(g, null, { q: side, dir: "v", vq: (u, v) => lerp(0.1, 0.3, v) * lerp(0.8, 1.1, u), per: 3.4, seed: 470, streak: 0.5, bg: 0.3 });
  dark(g, [[468, 739], [469, 847]], 1.4, 471);
  edge(g, [[470.5, 742], [471.5, 845]], 1.0, 0.72, 472);
}
// the pedals (plate at 4x, graded p90 ~80 against F1's ~47): the board's lit front edge (y ~834, x 580–685), pale knob
// caps along its top, two pale-edged pedal boxes behind it, bright glints on the jacks and cables in front
function pedalFix(g) {
  edge(g, [[580, 835], [684, 833]], 2.2, 0.82, 480);
  ink(g, [[684, 833], [686, 846]], 1.4, grey(0.55), { seed: 481 });
  for (let i = 0; i < 7; i++) { const x = 594 + i * 13 + (i % 2) * 2, y = 826 - (i % 3); g.fillStyle = grey(0.72, 0.9); g.beginPath(); g.ellipse(x, y, 5, 2.2, -0.15, 0, PI * 2); g.fill(); }
  for (const q of [[[640, 804], [702, 802], [702, 824], [640, 826]], [[728, 806], [798, 804], [800, 828], [730, 830]]]) {
    fill(g, q, grey(0.12)); edge(g, [q[0], q[1]], 1.8, 0.78, q[0][0]); edge(g, [q[1], q[2]], 1.2, 0.5, q[0][0] + 1); dark(g, q, 1.1, q[0][0] + 2, { closed: true });
  }
  for (const [pts, w, v] of [[[[706, 858], [712, 852], [720, 852]], 2.2, 0.85], [[[736, 850], [742, 846], [748, 850]], 2.0, 0.8], [[[758, 862], [770, 858], [784, 860]], 1.8, 0.7], [[[694, 868], [700, 864]], 1.6, 0.7], [[[790, 866], [800, 862]], 1.6, 0.65]]) ink(g, pts, w, grey(v), { smooth: true, seed: pts[0][0], ends: 0.4 });
}

// (fix pass 2) the speaker right of the desk: F1's cabinet ran down to y 845 with a port at 766; the plate's cabinet
// ends at y ~790 (a lit lower lip; the woofer and tweeter centres within ~5 px of F1's), dark cables below it
function wooferS(g, cx, cy, R, seed = 1) {
  dot(g, cx, cy, R, grey(0.03));
  ring(g, cx, cy, R - 0.8, 1.4, grey(0.32)); ring(g, cx, cy, R * 0.86, 1.2, grey(0.25));
  const rc = R * 0.68;
  g.save(); g.beginPath(); g.arc(cx, cy, rc, 0, PI * 2); g.clip();
  const gr = g.createLinearGradient(cx + rc * 0.6, cy - rc * 0.7, cx - rc * 0.5, cy + rc * 0.6); gr.addColorStop(0, grey(0.3)); gr.addColorStop(0.45, grey(0.62)); gr.addColorStop(1, grey(0.95));
  g.fillStyle = gr; g.fillRect(cx - rc, cy - rc, 2 * rc, 2 * rc);
  const r = rng(seed);
  for (let i = 0; i < 46; i++) { const rr = rc * (0.45 + r() * 0.55), a0 = r() * PI * 2, da = 0.5 + r() * 1.2; g.strokeStyle = grey(r() < 0.5 ? 0.15 : 1, 0.25 + r() * 0.2); g.lineWidth = 0.8 + r(); g.beginPath(); g.arc(cx, cy, rr, a0, a0 + da); g.stroke(); }
  g.restore();
  ring(g, cx, cy, rc, 1.3, grey(0.1));
  g.strokeStyle = grey(0.55, 0.8); g.lineWidth = 1.4; g.beginPath(); g.arc(cx, cy, R * 0.78, 0.3, 1.2); g.stroke();
  dot(g, cx + R * 0.1, cy - 0.5, R * 0.28, grey(0.03));
  softEll(g, cx + R * 0.18, cy - R * 0.14, R * 0.06, R * 0.045, 0, grey(0.85), 0.8);
}
function paintSpeakerRight(g) {
  const book = (pts, v, seed) => { carve(g, null, { q: pts, dir: "h", vq: (u, vv) => lerp(0.3, v, sstep(0, 0.22, u)) * (1 - 0.25 * vv), per: 2.8, seed, bg: 0.3, streak: 0.3, wav: 0.3 }); dark(g, pts, 1.2, seed + 1, { closed: true }); };
  book([[1503, 551], [1599, 551], [1600, 565], [1503, 566]], 0.8, 1540);
  book([[1500, 565], [1602, 565], [1603, 576], [1500, 577]], 0.7, 1542);
  const cab = [[1491, 576], [1612, 576], [1612, 790], [1491, 790]];
  // below the cabinet: the plate is dark there (the layers behind drew a panel where F1's cabinet stood)
  fill(g, [[1491, 790], [1613, 790], [1613, 852], [1491, 852]], grey(0.02));
  fill(g, cab, grey(0.03));
  carve(g, null, { q: cab, dir: "v", vq: (u, v) => (0.24 + 0.05 * Math.sin(u * 11)) * lerp(1.15, 0.75, v) * lerp(1.1, 1.05, u), per: 3.4, seed: 1543, streak: 0.4, bg: 0.3 });
  edge(g, [[1491, 576], [1612, 576]], 1.4, 0.8, 1544); edge(g, [[1492, 577], [1492, 790]], 1.6, 0.7, 1545); dark(g, [[1612, 576], [1612, 790]], 1.4, 1546);
  edge(g, [[1494, 789], [1552, 791], [1610, 789]], 1.6, 0.62, 1547); dark(g, [[1491, 792], [1612, 792]], 1.6, 1548);
  dot(g, 1553, 612, 17, grey(0.03)); ring(g, 1553, 612, 16, 2, grey(0.4)); ring(g, 1553, 612, 10, 1.2, grey(0.18)); softEll(g, 1555, 608, 4, 3.2, 0, grey(0.8), 1.2);
  wooferS(g, 1551, 687, 48, 1547);
  dot(g, 1551, 760, 14, grey(0.03)); ring(g, 1551, 760, 13, 1.6, grey(0.35));
  for (const [pts, w, lit] of [[[[1500, 800], [1530, 812], [1566, 808], [1600, 820], [1620, 850]], 4.2, 0.45], [[[1496, 830], [1540, 846], [1590, 840], [1616, 866]], 3.8, 0.4]]) cable(g, pts, w, pts[0][1], lit, { hw: 0.3 });
}

// (fix pass 2) the patch cables plugged into the patchbay's bottom row of jacks (plate / 53.20 at 3x: a dark cable
// from each jack at y ~548, x 395–497, hanging in loops down over the keyboard's back to y ~600), 3 px, grey rim
function patchCables(g) {
  for (const [x, dx, sag, seed] of [[395, -6, 40, 1], [412, 8, 52, 2], [428, -4, 36, 3], [445, 10, 58, 4], [462, 4, 44, 5], [480, 12, 60, 6], [497, 6, 48, 7]]) {
    const y0 = 550;
    cable(g, [[x, y0], [x + dx * 0.3, y0 + sag * 0.45], [x + dx * 0.7, y0 + sag * 0.85], [x + dx, y0 + sag]], 3.2, 1990 + seed, 0.38, { hw: 0.3 });
    fill(g, [[x - 2.5, y0 - 3], [x + 2.5, y0 - 3], [x + 2.2, y0 + 5], [x - 2.2, y0 + 5]], grey(0.1));
    edge(g, [[x - 2.5, y0 - 3], [x - 2.2, y0 + 5]], 0.9, 0.5, 1980 + seed);
  }
}

export const REPAINT = { speakerRight: paintSpeakerRight, designerHead: paintHead, torso: paintTorso, headphones: paintHeadphones, trousers: paintTrousers, boots: paintBoots, deskCables: paintDeskCables, rightLow: paintRightLow };
export const AFTER = { designerHead: paintBloom, recordsAmp: ampFix, pedalboard: pedalFix, keyboardLeft: patchCables };
