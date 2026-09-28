// s09 room: the dim clutter behind the owl (x 1540-2206) and the lit speaker. Drawn straight onto a 2D context
// (the caller gives a 2x-supersampled context in frame coordinates); nothing here is engraved by the shader.
//
// Every object was traced on the source (frames 815-839 averaged; tools/grid.py-style crops at 2-3x, a gamma-lifted copy
// to read the dark parts). Tones are given as the POST-GRADE grey measured on the source and converted with pre(), which
// inverts the finish pass's S-curve and vignette at the object's position (halation is not inverted).
import { W, H } from "../../config.js";
import { rng, clamp, noise1 } from "../../lib/rng.js";
import { taper } from "../../lib/ink.js";
import { sampleCurve, smoothPath } from "../../lib/paths.js";

const S = (f) => 0.65 * f + 0.35 * f * f * (3 - 2 * f);
function vig(x, y) { const qx = 2 * x / W - 1, qy = 2 * y / H - 1; const r = Math.min(1, (qx * qx + qy * qy) / 2); return 1 - 0.38 * Math.pow(r, 1.15); }
// target post-grade grey (0..255) at (x,y) -> painted value 0..1
export function pre(o, x, y) {
  const t = clamp(o / 255 / vig(x, y), 0, 1);
  let lo = 0, hi = 1;
  for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (S(m) < t) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
export const col = (o, x, y, a = 1) => { const c = Math.round(pre(o, x, y) * 255); return `rgba(${c},${c},${c},${a})`; };
const mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
const cen = (pts) => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };
function polyPath(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
function fillPoly(g, pts, o, a = 1) { const [x, y] = cen(pts); polyPath(g, pts); g.fillStyle = col(o, x, y, a); g.fill(); }
function seg(g, pts, w, o, a = 1, end = 0.5) {
  const q = pts.length > 2 ? sampleCurve(pts, 5) : pts;
  const [x, y] = cen(pts);
  taper(g, q, (u) => w * (end + (1 - end) * Math.pow(Math.sin(Math.PI * u), 0.4)), col(o, x, y, a));
}

// A corrugated carton face. quad = [TL, TR, BR, BL]. dir 'v': stripes run top edge -> bottom edge, spaced along the
// width; 'h': they run left -> right, spaced down the face. Each stripe is a lit ridge with its own weight and tone,
// brightest at its lit end (fade = how much it loses toward the other end), and it can break.
function corr(g, quad, o) {
  const { dir = "v", period = 4.4, hi = 100, base = 4, duty = 0.5, seed = 1, fade = 0.35, brk = 0.12, vary = 0.4, jit = 0.3, edge = 0, edgeA = 0.6 } = o;
  const r = rng(seed);
  const [a, b, c, d] = quad;
  const hiV = hi * 0.95;
  fillPoly(g, quad, base);
  const L = dir === "v" ? (Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - d[0], c[1] - d[1])) / 2
    : (Math.hypot(d[0] - a[0], d[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1])) / 2;
  const n = Math.max(1, Math.round(L / period));
  const P = dir === "v" ? (u, t) => mix(mix(a, b, u), mix(d, c, u), t) : (u, t) => mix(mix(a, d, u), mix(b, c, u), t);
  g.save(); polyPath(g, quad); g.clip();
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5 + (r() - 0.5) * jit) / n;
    const hw = (duty * (0.6 + 0.8 * r())) / n / 2;
    const m = 1 - vary + vary * 2 * r();
    // break into one or two runs
    const runs = [];
    if (r() < brk) { const s = 0.2 + r() * 0.6; runs.push([0, s - 0.03 - r() * 0.08], [s + 0.02, 1]); } else runs.push([-0.02, 1.02]);
    for (const [t0, t1] of runs) {
      const k = 7, Lp = [], Rp = [];
      for (let j = 0; j <= k; j++) {
        const t = t0 + (t1 - t0) * (j / k), wob = (r() - 0.5) * 0.25 / n;
        const w = hw * (0.75 + 0.25 * Math.sin(Math.PI * (j / k)));
        Lp.push(P(u - w + wob, t)); Rp.push(P(u + w + wob, t));
      }
      const pts = [...Lp, ...Rp.reverse()];
      const A = P(u, t0), B = P(u, t1);
      const gr = g.createLinearGradient(A[0], A[1], B[0], B[1]);
      const x = (A[0] + B[0]) / 2, y = (A[1] + B[1]) / 2;
      gr.addColorStop(0, col(hiV * m * (1 - fade * t0), x, y)); gr.addColorStop(1, col(hiV * m * (1 - fade * t1), x, y));
      polyPath(g, pts); g.fillStyle = gr; g.fill();
    }
  }
  g.restore();
  if (edge > 0) { seg(g, [a, b], 1.5, edge, edgeA, 0.9); seg(g, [b, c], 1.2, edge * 0.8, edgeA * 0.8, 0.9); seg(g, [a, d], 1.2, edge * 0.7, edgeA * 0.7, 0.9); }
}
// a flat label or tape patch on a face, with a darker lower edge
function label(g, quad, o, seed) {
  fillPoly(g, quad, o);
  seg(g, [quad[3], quad[2]], 1.6, 0, 0.8, 0.9);
  const r = rng(seed);
  g.save(); polyPath(g, quad); g.clip();
  for (let i = 0; i < 4; i++) { const t = 0.25 + i * 0.17 + r() * 0.05; seg(g, [mix(quad[0], quad[3], t), mix(mix(quad[0], quad[3], t), mix(quad[1], quad[2], t), 0.4 + r() * 0.4)], 1, o * 0.55, 0.7, 0.9); }
  g.restore();
}
// dot / jack grid
function dots(g, x0, y0, x1, y1, pitch, lo, hi, on, seed, rad = 1.0, skew = 0) {
  const r = rng(seed);
  for (let y = y0; y <= y1; y += pitch) for (let x = x0; x <= x1; x += pitch) {
    if (r() > on) { r(); continue; }
    const v = lo + (hi - lo) * r();
    g.fillStyle = col(v, x, y);
    const rr = rad * (0.7 + 0.6 * r());
    g.fillRect(x + skew * (y - y0) - rr, y - rr, rr * 2, rr * 2);
  }
}
function ring(g, x, y, R, o, w, a0 = 0, a1 = Math.PI * 2, alpha = 1) { g.strokeStyle = col(o, x, y, alpha); g.lineWidth = w; g.beginPath(); g.arc(x, y, R, a0, a1); g.stroke(); }

// ------------------------------------------------------------------------------------------------ the clutter
function farBack(g) {
  // the dark shelving behind the plant (only a few faint edges survive the black)
  seg(g, [[1916, 87], [1990, 89], [2046, 91]], 1.6, 24, 1, 0.8);
  seg(g, [[2040, 81], [2085, 81]], 1.2, 16, 1, 0.8);
  seg(g, [[1952, 218], [2010, 219], [2064, 221]], 1.6, 26, 1, 0.8);
  fillPoly(g, [[2002, 4], [2027, 4], [2027, 29], [2002, 29]], 12);
  fillPoly(g, [[2003, 99], [2040, 99], [2040, 141], [2003, 141]], 16);
  // a hanging cord and a dim hanging planter
  for (let y = 22; y < 200; y += 5) { g.fillStyle = col(10 + 8 * ((y * 7) % 3), 2131, y); g.fillRect(2130.2, y, 1.4, 2.6); }
  fillPoly(g, [[2120, 205], [2150, 200], [2170, 222], [2166, 262], [2130, 270], [2112, 240]], 5);
}

function column(g) {
  // T1: top carton (partly off the top of frame)
  corr(g, [[1826, 33], [1908, 4], [1908, 92], [1826, 150]], { hi: 58, base: 4, period: 4.6, seed: 101, fade: 0.25, duty: 0.45 });
  label(g, [[1862, 2], [1890, 0], [1890, 33], [1862, 38]], 38, 1);
  // T2 under it: its top edge is the dark diagonal seam
  corr(g, [[1780, 148], [1910, 90], [1910, 218], [1780, 247]], { hi: 62, base: 4, period: 4.4, seed: 102, fade: 0.2, duty: 0.45 });
  seg(g, [[1780, 148], [1910, 90]], 2.4, 0, 0.9, 1);
  label(g, [[1845, 121], [1870, 113], [1870, 152], [1845, 158]], 42, 2);
  // dotted edge of T2 on the left (a punched handle strip)
  for (let y = 165; y < 240; y += 5) { g.fillStyle = col(30, 1786, y); g.fillRect(1785, y, 2, 2.4); }
  // T3: the lit tall carton right of the cables; its lower left is cut by a dark cable run
  corr(g, [[1867, 237], [1922, 222], [1922, 392], [1867, 392]], { hi: 118, base: 5, period: 4.4, seed: 103, fade: 0.35, duty: 0.52 });
  fillPoly(g, [[1866, 300], [1874, 300], [1904, 396], [1866, 396]], 3);
  seg(g, [[1867, 237], [1922, 222]], 1.5, 90, 0.6, 0.9);
}

function leftStack(g) {
  // A: top-left carton, face tilting up to the right
  corr(g, [[1575, 272], [1706, 238], [1706, 318], [1575, 346]], { hi: 112, base: 5, period: 4.3, seed: 111, fade: 0.25, duty: 0.52, edge: 95, edgeA: 0.55 });
  label(g, [[1622, 260], [1650, 253], [1650, 290], [1622, 296]], 40, 3);
  // C: small dim box on the far left
  corr(g, [[1558, 349], [1594, 344], [1594, 421], [1558, 425]], { hi: 30, base: 6, period: 5, seed: 112, fade: 0.3, duty: 0.4 });
  seg(g, [[1561, 350], [1561, 424]], 1.6, 55, 1, 0.8); seg(g, [[1561, 350], [1593, 345]], 1.4, 45, 1, 0.8);
  // B: horizontally corrugated box, lit (a face turned toward the light)
  corr(g, [[1607, 338], [1673, 320], [1673, 398], [1607, 410]], { dir: "h", hi: 92, base: 38, period: 5.2, seed: 113, fade: 0.2, duty: 0.45, vary: 0.3, edge: 80, edgeA: 0.5 });
  // D: the carton under them (its top face is a thin lit band)
  corr(g, [[1575, 426], [1712, 396], [1712, 525], [1575, 545]], { hi: 128, base: 5, period: 4.3, seed: 114, fade: 0.55, duty: 0.52 });
  corr(g, [[1577, 421], [1708, 391], [1712, 396], [1575, 426]], { hi: 70, base: 20, period: 6, seed: 115, fade: 0, duty: 0.4 });
  seg(g, [[1577, 421], [1708, 391]], 1.5, 110, 0.6, 0.9);
  label(g, [[1610, 441], [1648, 433], [1648, 457], [1610, 465]], 36, 4);
  // far-left carton edges behind the wing
  corr(g, [[1540, 425], [1575, 421], [1575, 540], [1540, 545]], { hi: 40, base: 4, period: 5, seed: 116, fade: 0.4, duty: 0.4 });
}

function gear(g) {
  // the patch-module panel: dark, with a sparse upper grid and a dense jack grid (1712-1790 x 238-400)
  fillPoly(g, [[1706, 238], [1792, 236], [1794, 400], [1706, 400]], 2);
  dots(g, 1713, 246, 1764, 316, 5.6, 14, 32, 0.7, 121, 1.0);
  dots(g, 1714, 324, 1788, 396, 4.2, 18, 42, 0.85, 122, 0.95);
  g.save(); g.strokeStyle = col(26, 1775, 250); g.lineWidth = 1.4; g.beginPath(); g.moveTo(1762, 262); g.quadraticCurveTo(1764, 240, 1786, 240); g.stroke(); g.restore();
  seg(g, [[1708, 320], [1790, 318]], 1.2, 16, 1, 0.9);
  // lower module: scattered knobs, brighter to the right (1840-1880 x 405-470)
  fillPoly(g, [[1712, 398], [1862, 396], [1862, 502], [1712, 502]], 2);
  dots(g, 1716, 402, 1760, 496, 6.5, 12, 30, 0.55, 123, 1.0);
  dots(g, 1766, 404, 1832, 496, 7.5, 14, 38, 0.5, 124, 1.1);
  const r = rng(125);
  for (let i = 0; i < 26; i++) {
    const x = 1834 + r() * 44, y = 406 + r() * 64, v = 55 + 70 * r();
    g.fillStyle = col(v, x, y); g.beginPath(); g.ellipse(x, y, 1.3 + r(), 1.1 + r() * 0.8, -0.6, 0, 7); g.fill();
  }
  seg(g, [[1712, 399], [1860, 397]], 1.3, 24, 1, 0.9);
  // cables hanging in loops in front of the panel (bright, ~2.5 px)
  const C = [
    [[1773, 233], [1780, 248], [1787, 262], [1797, 287], [1810, 300], [1830, 293], [1843, 268], [1850, 240]],
    [[1780, 330], [1793, 338], [1813, 333], [1832, 317], [1843, 292], [1848, 262]],
    [[1810, 233], [1812, 252], [1816, 276], [1824, 300], [1831, 312]],
    [[1851, 237], [1844, 287], [1837, 330], [1828, 360], [1823, 388]],
    [[1860, 252], [1861, 290], [1858, 328], [1852, 356]],
    [[1792, 236], [1797, 262], [1808, 284], [1826, 290], [1840, 272]],
    [[1778, 236], [1776, 268], [1780, 300], [1790, 322], [1806, 330], [1822, 324]],
    [[1832, 238], [1838, 258], [1839, 280]],
  ];
  C.forEach((pts, i) => seg(g, pts, 2.0 + (i % 3) * 0.3, 46 + (i * 13) % 20, 0.95, 0.4));
  seg(g, [[1873, 400], [1893, 418], [1912, 435]], 1.8, 42, 1, 0.6);
}

function synth(g) {
  // a keyboard standing on end, leaning a little right; the owl's wing covers its lower left
  fillPoly(g, [[1647, 440], [1694, 432], [1690, 612], [1644, 616]], 10);
  for (let k = 0; k < 11; k++) { const y = 506 + k * 9, x = 1679 - (y - 506) * 0.02; g.fillStyle = col(52, x, y); g.fillRect(x - 1.8, y, 3.6, 4.2); }
  ring(g, 1677, 457, 5.5, 30, 1.3); ring(g, 1677, 480, 5.5, 28, 1.3);
  // knob panel with four knobs
  fillPoly(g, [[1693, 430], [1740, 428], [1738, 493], [1692, 495]], 52);
  for (const [x, y] of [[1705, 450], [1723, 449], [1703, 475], [1722, 473]]) {
    g.fillStyle = col(12, x, y); g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill();
    ring(g, x, y, 6.2, 95, 1.4, Math.PI * 0.9, Math.PI * 1.9); ring(g, x, y, 2.2, 40, 1.2);
  }
  fillPoly(g, [[1740, 428], [1748, 428], [1746, 493], [1738, 493]], 140);
  // the key strip: white keys with dark dividers, black keys on the left 55%
  const A = [1700, 497], B = [1737, 495], Cc = [1730, 653], D = [1690, 653];
  const keys = [A, B, Cc, D];
  polyPath(g, keys);
  const gr = g.createLinearGradient(0, 497, 0, 653); gr.addColorStop(0, col(118, 1715, 500)); gr.addColorStop(1, col(78, 1712, 650)); g.fillStyle = gr; g.fill();
  g.save(); polyPath(g, keys); g.clip();
  const nk = 15;
  for (let k = 1; k < nk; k++) seg(g, [mix(A, D, k / nk), mix(B, Cc, k / nk)], 1.2, 8, 0.9, 1);
  const blk = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12, 14];
  for (const k of blk) {
    const t = (k + 0.62) / nk, t2 = t + 0.045;
    const p = mix(A, D, t), q = mix(A, D, t2), p2 = mix(p, mix(B, Cc, t), 0.56), q2 = mix(q, mix(B, Cc, t2), 0.56);
    fillPoly(g, [p, p2, q2, q], 6);
  }
  g.restore();
  fillPoly(g, [[1737, 495], [1745, 495], [1738, 653], [1730, 653]], 8);
  seg(g, [[1745, 495], [1738, 653]], 1.2, 60, 0.8, 0.9);
}

function flightCase(g) {
  // a closed flight case: black body, dim metal lid rail, side rails, corner caps, hinge, latch
  fillPoly(g, [[1780, 505], [1946, 510], [1946, 637], [1780, 637]], 1);
  fillPoly(g, [[1805, 508], [1925, 510], [1925, 522], [1805, 521]], 36);
  seg(g, [[1805, 509], [1925, 511]], 1.6, 58, 1, 0.9);
  seg(g, [[1805, 521], [1925, 522]], 1.2, 22, 1, 0.9);
  // left frame: two rails, a corner cap and a hinge
  seg(g, [[1784, 510], [1784, 636]], 1.5, 34, 1, 0.9); seg(g, [[1800, 512], [1800, 636]], 1.3, 30, 1, 0.9);
  g.strokeStyle = col(44, 1790, 520); g.lineWidth = 1.5; g.strokeRect(1783, 508, 18, 22); g.strokeRect(1783, 558, 17, 26);
  fillPoly(g, [[1786, 564], [1797, 564], [1797, 578], [1786, 578]], 30);
  // middle rails
  seg(g, [[1807, 563], [1880, 563]], 2.6, 50, 1, 0.9); seg(g, [[1807, 577], [1880, 577]], 2.6, 44, 1, 0.9);
  seg(g, [[1807, 569], [1880, 570]], 1, 14, 1, 0.9);
  // latch
  g.save(); g.strokeStyle = col(58, 1897, 575); g.lineWidth = 2; g.beginPath();
  if (g.roundRect) g.roundRect(1883, 555, 29, 42, 5); else g.rect(1883, 555, 29, 42);
  g.stroke(); g.restore();
  fillPoly(g, [[1889, 561], [1903, 561], [1903, 571], [1889, 571]], 40);
  fillPoly(g, [[1890, 580], [1901, 580], [1901, 589], [1890, 589]], 34);
  seg(g, [[1916, 562], [1916, 590]], 1.6, 30, 1, 0.9);
  // right frame, corner brace
  seg(g, [[1921, 518], [1921, 632]], 1.5, 34, 1, 0.9); seg(g, [[1940, 520], [1941, 632]], 1.3, 28, 1, 0.9);
  seg(g, [[1916, 540], [1936, 518]], 2, 46, 1, 0.9);
  seg(g, [[1790, 634], [1942, 634]], 1.4, 20, 1, 0.9);
  // a cable arcing over the right end
  seg(g, [[1930, 500], [1948, 520], [1958, 548], [1964, 585]], 1.6, 30, 1, 0.6);
}

function lowRoom(g) {
  // small striped carton under the case, dim crates of wire mesh beside it
  corr(g, [[1802, 638], [1840, 636], [1840, 742], [1802, 744]], { hi: 68, base: 4, period: 4.6, seed: 131, fade: 0.3, duty: 0.5 });
  dots(g, 1846, 644, 1952, 758, 7, 8, 32, 0.8, 132, 1.0);
  for (let y = 650; y < 760; y += 14) seg(g, [[1846, y], [1952, y + 1]], 0.9, 8, 1, 1);
  dots(g, 1762, 646, 1798, 756, 8, 6, 22, 0.5, 133, 0.9);
  // the lit cloth/bag at the right
  const bag = [[1956, 536], [2040, 528], [2044, 600], [2030, 640], [1962, 642], [1950, 596]];
  fillPoly(g, bag, 30);
  g.save(); polyPath(g, bag); g.clip();
  const r = rng(134);
  // soft folds of cloth: dim ridges and darker hollows, no hard stripes
  for (let i = 0; i < 9; i++) {
    const x = 1958 + i * 9.5 + r() * 4;
    seg(g, [[x, 532], [x + 3 + r() * 6, 585], [x + r() * 10, 645]], 3 + r() * 4, i % 2 ? 12 : 44, 0.7, 0.3);
  }
  g.restore();
  // a round-backed thing below it (a drum / chair back): a dim rim arc
  g.save(); g.strokeStyle = col(40, 2010, 690); g.lineWidth = 2; g.beginPath();
  g.moveTo(1994, 760); g.bezierCurveTo(1990, 700, 2000, 640, 2044, 618); g.stroke();
  g.strokeStyle = col(22, 2010, 700); g.lineWidth = 1.4; g.beginPath(); g.moveTo(2006, 760); g.bezierCurveTo(2004, 706, 2014, 660, 2044, 640); g.stroke(); g.restore();
  // desk: a lit front edge and a mesh front with dotted rows
  seg(g, [[1860, 763], [1950, 772], [2036, 786]], 2.2, 72, 1, 0.8);
  seg(g, [[1862, 768], [2034, 792]], 1, 20, 1, 0.9);
  const rr = rng(135);
  for (let k = 0; k < 22; k++) {
    const y = 796 + k * 6.8, lvl = 18 + 34 * Math.exp(-Math.pow((y - 862) / 42, 2));
    for (let x = 1866 + (k % 2) * 3; x < 2030; x += 6.2) {
      if (rr() < 0.25) continue;
      const v = lvl * (0.5 + rr());
      g.fillStyle = col(v, x, y); g.fillRect(x, y + (x - 1866) * 0.1, 3.2, 1.8);
    }
  }
  // a dotted leg at the left end of the desk
  for (let y = 862; y < 946; y += 5) { g.fillStyle = col(26, 1795, y); g.fillRect(1793, y, 3, 2.4); }
}

function rightCartons(g) {
  // R1: the lit carton the plant stands on (front face and a thin top face)
  corr(g, [[1914, 368], [2064, 342], [2064, 470], [1914, 472]], { hi: 108, base: 5, period: 4.6, seed: 141, fade: 0.4, duty: 0.5 });
  corr(g, [[1932, 352], [2064, 320], [2064, 342], [1914, 368]], { hi: 30, base: 8, period: 9, seed: 142, fade: 0, duty: 0.25 });
  seg(g, [[1914, 368], [2064, 342]], 1.5, 100, 0.6, 0.9);
  // R2 below
  corr(g, [[1916, 474], [2050, 470], [2050, 532], [1916, 534]], { hi: 66, base: 4, period: 4.8, seed: 143, fade: 0.3, duty: 0.45 });
  seg(g, [[1916, 474], [2050, 470]], 1.3, 60, 0.7, 0.9);
}

function plant(g) {
  // a pothos in a dim round pot on R1: pointed heart-shaped leaves, dim fill, a paler rim on the lit (left) side,
  // dark midrib and veins; the right half of the clump is in shadow; a vine trails down to y~430
  const r = rng(151);
  g.save(); g.beginPath(); g.ellipse(2085, 296, 25, 25, 0, 0, 7); g.fillStyle = col(14, 2085, 296); g.fill(); g.clip();
  for (let i = 0; i < 11; i++) { const y = 278 + i * 3.8, hw = Math.sqrt(Math.max(0, 625 - (y - 296) * (y - 296))); seg(g, [[2085 - hw * 0.9 + r() * 4, y], [2085 + hw * (0.1 + 0.3 * r()), y + 1]], 1.1 + r() * 1.2, 40 + 22 * r(), 0.85, 0.3); }
  g.restore();
  // stems
  for (const st of [[[2080, 276], [2060, 245], [2044, 208]], [[2082, 276], [2098, 235], [2102, 198]], [[2074, 280], [2030, 250], [2010, 240]], [[2066, 284], [2030, 285], [1996, 282]],
    [[2004, 292], [2006, 330], [2016, 370], [2022, 410], [2024, 432]], [[2090, 278], [2120, 250], [2140, 240]]])
    seg(g, st, 1.2, 18, 1, 0.6);
  // leaves: [x, y (base), tip angle, length, fill, rim] (positions from blob detection on the averaged source)
  const L = [
    [2043, 214, -2.2, 26, 34, 70], [2098, 206, -0.9, 27, 34, 70], [2100, 222, 0.1, 22, 30, 62], [2066, 224, -2.6, 18, 24, 50],
    [2020, 240, 2.7, 28, 38, 76], [2080, 240, 1.4, 34, 42, 80], [2052, 264, 2.1, 25, 34, 70], [2010, 278, 2.9, 27, 36, 72],
    [2030, 286, 1.6, 23, 30, 62], [1999, 305, 2.2, 23, 34, 70], [2026, 320, 1.5, 25, 36, 72], [1998, 342, 1.8, 27, 38, 74],
    [2024, 352, 1.1, 27, 38, 74], [2016, 384, 1.7, 20, 26, 52], [2020, 404, 1.5, 18, 22, 46], [1987, 290, 3.0, 20, 26, 54],
    [2046, 238, -1.6, 18, 26, 54], [2062, 252, -0.4, 16, 22, 46], [2032, 196, -1.9, 20, 28, 58],
    // dim leaves in the shadowed right half, toward the hanging planter
    [2120, 236, 0.3, 22, 13, 28], [2132, 254, 1.0, 22, 11, 24], [2108, 260, 1.9, 20, 13, 28], [2150, 232, -0.2, 20, 10, 22], [2135, 208, -0.6, 18, 10, 22],
    [2118, 278, 1.3, 18, 10, 22], [2155, 262, 0.8, 18, 9, 20],
  ];
  for (const [x, y, a, len, f, rim] of L) {
    const c = Math.cos(a), sn = Math.sin(a), n = [-sn, c];
    const P = (u, v) => [x + c * len * u + n[0] * len * v, y + sn * len * u + n[1] * len * v];
    // pointed heart: two shallow lobes at the stem end, a long drawn-out tip
    const pts = [P(0.06, 0), P(-0.04, 0.24), P(0.14, 0.4), P(0.45, 0.33), P(0.78, 0.13), P(1, 0), P(0.78, -0.13), P(0.45, -0.33), P(0.14, -0.4), P(-0.04, -0.24)];
    g.beginPath(); smoothPath(g, pts, true); g.fillStyle = col(f, x, y); g.fill();
    // rim: brighter on the lit (left / upper) side of the leaf
    const lit = c < 0.3;
    g.beginPath(); smoothPath(g, pts, true); g.strokeStyle = col(rim, x, y, 0.7); g.lineWidth = 1.3; g.stroke();
    if (lit) seg(g, [P(0.0, 0.26), P(0.3, 0.38), P(0.7, 0.16)], 1.3, rim * 1.15, 0.8, 0.4);
    seg(g, [P(0.04, 0), P(0.5, 0.02), P(0.9, 0)], 1.2, 4, 0.85, 0.5);
    for (const u of [0.32, 0.56]) { seg(g, [P(u, 0), P(u + 0.14, 0.18)], 0.8, 6, 0.7, 0.5); seg(g, [P(u, 0), P(u + 0.14, -0.18)], 0.8, 6, 0.7, 0.5); }
  }
}

function speaker(g) {
  const r = rng(161);
  const cab = [[2076, 382], [2206, 366], [2206, 946], [2026, 946]];
  // front: mid-grey wood with pale grain streaks and dark streaks (measured: mean ~137, p10 ~45, p90 ~210)
  fillPoly(g, cab, 116);
  g.save(); polyPath(g, cab); g.clip();
  for (const [x, w, a] of [[2098, 14, 0.16], [2122, 8, 0.12], [2150, 18, 0.15], [2178, 10, 0.16], [2196, 12, 0.12]]) {
    const bg = g.createLinearGradient(x - w, 0, x + w, 0); bg.addColorStop(0, "rgba(0,0,0,0)"); bg.addColorStop(0.5, `rgba(0,0,0,${a})`); bg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = bg; g.fillRect(x - w - 40, 340, 2 * w + 80, 620);
  }
  const slope = -50 / 564;
  for (let x = 2079; x < 2250; x += 2.3 + r() * 2.4) {
    let y0 = 360 + r() * 20;
    while (y0 < 946) {
      const y1 = Math.min(950, y0 + 80 + r() * 360), dk = r() < 0.42;
      const w = dk ? 1.3 + r() * 2.2 : 1.4 + r() * 2.2;
      const xm = x + (r() - 0.5) * 1.8;
      const ph = r() * 6, amp = 0.6 + r() * 1.6, pts = [];
      for (let k = 0; k <= 6; k++) { const y = y0 + (y1 - y0) * k / 6; pts.push([x + slope * (y - 382) + Math.sin(y * 0.02 + ph) * amp + (k === 3 ? xm - x : 0), y]); }
      taper(g, pts, (u) => w * (0.45 + 0.55 * Math.sin(Math.PI * u)), dk ? col(10, x, (y0 + y1) / 2, 0.75 + 0.25 * r()) : col(232, x, (y0 + y1) / 2, 0.75 + 0.25 * r()));
      y0 = y1 + 3 + r() * 22;
    }
  }
  const sh = g.createLinearGradient(2030, 840, 2090, 930); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,0.8)");
  g.fillStyle = sh; g.fillRect(2020, 820, 120, 130);
  const sh2 = g.createLinearGradient(0, 880, 0, 946); sh2.addColorStop(0, "rgba(0,0,0,0)"); sh2.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = sh2; g.fillRect(2020, 880, 190, 70);
  // under the top edge the front is a little darker (the top overhangs)
  const sh3 = g.createLinearGradient(0, 380, 0, 470); sh3.addColorStop(0, "rgba(0,0,0,0.3)"); sh3.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = sh3; g.fillRect(2020, 360, 190, 110);
  g.restore();
  // top face: a lit wedge with grain running back toward the upper right
  const top = [[2076, 383], [2092, 373], [2206, 356], [2206, 366]];
  fillPoly(g, top, 50);
  g.save(); polyPath(g, top); g.clip();
  for (let k = 0; k < 34; k++) { const x = 2070 + k * 4.2 + r() * 2; seg(g, [[x, 386], [x + 26, 356]], 1.2 + r() * 1.3, 175 + 45 * r(), 0.9, 0.5); }
  g.restore();
  seg(g, [[2076, 383], [2026, 946]], 2.2, 200, 0.9, 0.8);
  seg(g, [[2078, 383], [2206, 366]], 2.2, 200, 0.85, 0.8);
  seg(g, [[2090, 390], [2042, 946]], 1.6, 10, 0.7, 0.8);

  // a driver seen a little from the left (measured on the source woofer): a grey outer frame ring with engraved
  // rings, a black surround, a grey cone with dark engraved ridges over its upper part, darker to the right, a lit
  // facet on its lower left, and a dark dust cap (a tall ellipse) left of centre
  const driver = (cx, cy, R, seed, o) => {
    const q = rng(seed);
    // seen at an angle: squeezed horizontally about its centre
    g.save(); g.translate(cx, cy); g.scale(o.sx || 1, 1); g.translate(-cx, -cy);
    g.fillStyle = col(o.frame, cx, cy); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
    for (const k of [0.97, 0.94, 0.91]) ring(g, cx, cy, R * k, 8, 1.2 + q(), 0, Math.PI * 2, 0.7);
    ring(g, cx, cy, R - 1, o.rim, 2);
    ring(g, cx, cy, R + 1.5, 2, 2.2);
    g.fillStyle = col(4, cx, cy); g.beginPath(); g.arc(cx, cy, R * o.sur, 0, 7); g.fill();
    const Rc = R * o.cone;
    g.save(); g.beginPath(); g.arc(cx, cy, Rc, 0, 7); g.clip();
    const lg = g.createLinearGradient(cx - Rc, cy - Rc * 0.3, cx + Rc, cy + Rc * 0.3);
    lg.addColorStop(0, col(o.c0, cx, cy)); lg.addColorStop(0.55, col(o.c1, cx, cy)); lg.addColorStop(1, col(o.c2, cx, cy));
    g.fillStyle = lg; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    // lit facet (lower left): a soft lit patch left of and below the cap
    if (o.facet) {
      const fx = cx + R * o.facet[0], fy = cy + R * o.facet[1], fr = R * o.facet[2];
      const fg = g.createRadialGradient(fx, fy, fr * 0.1, fx, fy, fr);
      fg.addColorStop(0, col(o.facetV, fx, fy)); fg.addColorStop(0.55, col(o.facetV * 0.92, fx, fy, 0.9)); fg.addColorStop(1, col(o.facetV * 0.7, fx, fy, 0));
      g.fillStyle = fg; g.fillRect(fx - fr, fy - fr, 2 * fr, 2 * fr);
    }
    // engraved ridges: bold pale arcs over the dark upper-left of the cone (the source's white ridge lines),
    // a few faint dark arcs across the lit lower part
    for (let i = 0; i < o.ridges; i++) {
      const k = 0.96 - i * (0.62 / o.ridges);
      ring(g, cx - R * 0.04, cy, Rc * k, 205, 1.3 + q() * 1.4, Math.PI * (0.8 + 0.12 * q()), Math.PI * (1.75 + 0.15 * q()), o.paleA * (0.55 + 0.45 * q()));
      if (o.lowArcs) ring(g, cx - R * 0.04, cy, Rc * (k - 0.01), 215, 1.4 + q() * 1.4, Math.PI * (0.45 + 0.1 * q()), Math.PI * (0.95 + 0.1 * q()), o.paleA * (0.6 + 0.4 * q()));
      if (q() < 0.5) ring(g, cx - R * 0.04, cy, Rc * (k - 0.02), 6, 1.0 + q(), Math.PI * (1.0 + 0.1 * q()), Math.PI * (1.9 + 0.1 * q()), 0.5);
      if (o.facet && q() < 0.4) ring(g, cx - R * 0.04, cy, Rc * k, 8, 0.9 + q() * 0.8, Math.PI * (0.25 + 0.05 * q()), Math.PI * (0.7 - 0.05 * q()), 0.25);
    }
    g.restore();
    ring(g, cx, cy, Rc, 5, 2.2);
    // dust cap
    const dx = cx + R * o.capDx, dy = cy + R * o.capDy, rx = R * o.capRx, ry = R * o.capRy;
    g.fillStyle = col(o.capV, dx, dy); g.beginPath(); g.ellipse(dx, dy, rx * 1.35, ry * 1.25, 0, 0, 7); g.fillStyle = col(4, dx, dy, 0.8); g.fill();
    const gd = g.createRadialGradient(dx - rx * 0.2, dy - ry * 0.45, 1, dx, dy, ry);
    gd.addColorStop(0, col(o.capHi, dx, dy)); gd.addColorStop(0.45, col(o.capV, dx, dy)); gd.addColorStop(1, col(6, dx, dy));
    g.fillStyle = gd; g.beginPath(); g.ellipse(dx, dy, rx, ry, 0, 0, 7); g.fill();
    g.fillStyle = col(o.capHi * 1.3, dx, dy, 0.8); g.beginPath(); g.ellipse(dx - rx * 0.1, dy - ry * 0.5, rx * 0.28, ry * 0.2, 0, 0, 7); g.fill();
    g.restore();
  };
  // tweeter (2196, 526) R 64 squeezed to 0.85 wide; woofer (2197, 773) R 150 (outer frame edges measured on the source)
  driver(2196, 526, 64, 81, { sx: 0.85, frame: 30, rim: 90, sur: 0.88, cone: 0.74, c0: 34, c1: 22, c2: 10, ridges: 5, paleA: 0.7, lowArcs: true, facet: null, capDx: -0.2, capDy: -0.05, capRx: 0.26, capRy: 0.34, capV: 40, capHi: 210 });
  driver(2197, 773, 150, 82, { frame: 118, rim: 175, sur: 0.9, cone: 0.78, c0: 50, c1: 38, c2: 24, ridges: 12, paleA: 0.85, facet: [-0.2, 0.43, 0.36], facetV: 182, capDx: -0.2, capDy: -0.05, capRx: 0.14, capRy: 0.2, capV: 40, capHi: 150 });
  g.fillStyle = col(10, 2100, 655); g.beginPath(); g.arc(2100, 655, 4, 0, 7); g.fill();
  ring(g, 2100, 655, 4, 120, 1);
}

// Paint the whole room (x >= ~1540) onto g (frame coordinates; black already cleared).
export function paintRoom(g) {
  g.save();
  farBack(g);
  column(g);
  leftStack(g);
  gear(g);
  synth(g);
  flightCase(g);
  lowRoom(g);
  rightCartons(g);
  plant(g);
  speaker(g);
  g.restore();
}
