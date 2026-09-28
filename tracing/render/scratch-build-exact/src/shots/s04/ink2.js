// s02-style ink helpers for the arc key drawings B–D (dark ink on white, drawn on a Canvas2D, like s02's designer):
// variants of the strokes in s02/designer.js (copied there: strand, line, hatch patches, comb rows, hair locks, the
// eye, the sweat bead) generalised with sizes and angles so one figure can be drawn from any of the arc's views.
import { taper } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng, clamp } from "../../lib/rng.js";

export const PI = Math.PI;
export const INKC = "#0b0b0b";
export const gv = (v, a = 1) => { const c = Math.round(clamp(v) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };
export const wv = (a) => `rgba(246,245,241,${a})`;
export const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
export const blob = (pts) => (c) => smoothPath(c, pts, true);
export function fillPath(g, path, style) { g.beginPath(); path(g); g.fillStyle = style; g.fill(); }
export function clipTo(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(); g.restore(); }
export const lin = (g, x0, y0, x1, y1, stops) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, gv(v))); return r; };

// a tapered ink stroke: full near the start, tapering to a hair
export function strand(g, pts, w, color, { per = 6, head = 0.12, pow = 0.8 } = {}) {
  const q = sampleCurve(pts, per);
  taper(g, q, (u) => w * Math.min(1, u / head + 0.25) * Math.pow(1 - u, pow), color);
}
// a swelling ink line (thin ends)
export function line(g, pts, w, color = INKC, { per = 6, end = 0.25, pow = 0.6 } = {}) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(g, q, (u) => w * (end + (1 - end) * Math.pow(Math.sin(PI * u), pow)), color);
}
// n short strokes scattered in an ellipse, all along a direction
export function hatchPatch(g, cx, cy, rx, ry, ang, n, len, w, color, seed, jit = 0.25) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    let x, y;
    do { x = r() * 2 - 1; y = r() * 2 - 1; } while (x * x + y * y > 1);
    const a = ang + (r() - 0.5) * jit, L = len * (0.6 + 0.8 * r());
    const px = cx + x * rx, py = cy + y * ry;
    strand(g, [[px, py], [px + Math.cos(a) * L * 0.5, py + Math.sin(a) * L * 0.5], [px + Math.cos(a) * L, py + Math.sin(a) * L]], w * (0.6 + 0.6 * r()), color, { per: 3, head: 0.3 });
  }
}
// hatching strokes inside a polygon (clipped), along an angle; density ~ strokes per 1000 px²
export function hatchIn(g, pts, ang, spacing, len, w, color, seed, { jit = 0.3, cross = null, fade = null } = {}) {
  const r = rng(seed);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  g.save(); g.beginPath(); smoothPath(g, pts, true); g.clip();
  for (const a of cross == null ? [ang] : [ang, cross]) {
    const ca = Math.cos(a), sa = Math.sin(a), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + len;
    for (let o = -R; o < R; o += spacing * (0.75 + 0.5 * r())) {
      let s = -R + r() * len;
      while (s < R) {
        const L = len * (0.5 + 0.8 * r());
        const px = cx - sa * o + ca * s, py = cy + ca * o + sa * s;
        const k = fade ? fade(px, py) : 1;
        if (k > 0.02 && r() < k) strand(g, [[px, py], [px + ca * L * 0.5 + (r() - 0.5) * 2, py + sa * L * 0.5], [px + ca * L, py + sa * L]], w * (0.6 + 0.6 * r()), color, { per: 3, head: 0.3 });
        s += L + spacing * (0.3 + r() * 1.2);
      }
    }
  }
  g.restore();
}
// parallel strokes that follow a guide curve (offset rows)
export function combRows(g, guide, rows, gap, len, ang, w, color, seed, { step = 7, jitter = 0.4, skip = 0.15 } = {}) {
  const r = rng(seed);
  const q = sampleCurve(guide, 12);
  for (let k = 0; k < rows; k++) {
    let acc = 0;
    for (let i = 1; i < q.length; i++) {
      const dx = q[i][0] - q[i - 1][0], dy = q[i][1] - q[i - 1][1], d = Math.hypot(dx, dy) || 1;
      acc += d;
      if (acc < step) continue;
      acc = 0;
      if (r() < skip) continue;
      const nx = -dy / d, ny = dx / d;
      const px = q[i][0] + nx * gap * k + (r() - 0.5) * step * jitter, py = q[i][1] + ny * gap * k + (r() - 0.5) * step * jitter;
      const a = Math.atan2(dy, dx) + ang + (r() - 0.5) * 0.2, L = len * (0.6 + 0.7 * r());
      strand(g, [[px, py], [px + Math.cos(a) * L * 0.5, py + Math.sin(a) * L * 0.5], [px + Math.cos(a) * L, py + Math.sin(a) * L]], w * (0.6 + 0.6 * r()), color, { per: 3, head: 0.25 });
    }
  }
}
// one lock of hair: a black blade along a centre curve, full at the root and pointed at the tip, with thin white
// partings along it (the ink's sheen)
export function lock(g, pts, w, seed, { part = 2, bias = 0, pow = 0.85 } = {}) {
  const q = sampleCurve(pts, 10);
  taper(g, q, (u) => w * Math.min(1, 0.55 + u * 4) * Math.pow(1 - u, pow), INKC);
  const r = rng(seed), n = q.length;
  for (let k = 0; k < part; k++) {
    const off = (r() - 0.5 + bias) * 0.7, i0 = Math.floor(n * (0.05 + 0.25 * r())), i1 = Math.floor(n * (0.55 + 0.4 * r()));
    const pp = [];
    for (let i = i0; i <= i1; i++) {
      const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const u = i / (n - 1), hw = w * 0.5 * Math.min(1, 0.55 + u * 4) * Math.pow(1 - u, pow);
      pp.push([q[i][0] - dy / d * off * hw * 2, q[i][1] + dx / d * off * hw * 2]);
    }
    if (pp.length > 2) taper(g, pp, (u) => (0.9 + 1.4 * r()) * Math.pow(Math.sin(PI * u), 0.7), wv(0.55 + 0.4 * r()));
  }
}
// flyaway strands from a region, hanging roughly along `dir`
export function flyaways(g, n, x0, x1, y0, y1, dir, lenR, seed, w = [1.5, 3.5]) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), L = lenR[0] + r() * (lenR[1] - lenR[0]);
    const a = dir + (r() - 0.5) * 0.5, b = (r() - 0.5) * 0.4;
    strand(g, [[x, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5], [x + Math.cos(a + b) * L, y + Math.sin(a + b) * L]], w[0] + r() * (w[1] - w[0]), INKC, { per: 6, head: 0.05 });
  }
}
// short dark ticks (stubble) in an ellipse
export function stubble(g, cx, cy, rx, ry, n, seed, { ang = PI / 2, alpha = 0.7 } = {}) {
  const rs = rng(seed);
  for (let i = 0; i < n; i++) {
    let x, y; do { x = rs() * 2 - 1; y = rs() * 2 - 1; } while (x * x + y * y > 1);
    const px = cx + x * rx, py = cy + y * ry, L = 5 + rs() * 7, a = ang + (rs() - 0.5) * 0.5;
    strand(g, [[px, py], [px + Math.cos(a) * L, py + Math.sin(a) * L]], 1.3 + rs() * 0.8, gv(0.08, alpha), { per: 2, head: 0.3 });
  }
}
// a sweat bead (s02's): pointed top, round belly, outline heavier on the lower right, a white glint
export function drop(g, x, y, s) {
  const h = 30 * s, w = 12 * s;
  g.beginPath();
  g.moveTo(x, y - h * 0.55);
  g.bezierCurveTo(x + w * 0.2, y - h * 0.1, x + w * 0.55, y + h * 0.05, x + w * 0.5, y + h * 0.25);
  g.bezierCurveTo(x + w * 0.45, y + h * 0.5, x - w * 0.45, y + h * 0.5, x - w * 0.5, y + h * 0.25);
  g.bezierCurveTo(x - w * 0.55, y + h * 0.05, x - w * 0.2, y - h * 0.1, x, y - h * 0.55);
  g.fillStyle = gv(0.9); g.fill();
  g.lineWidth = 1.6 * s + 0.6; g.strokeStyle = gv(0.1, 0.85); g.stroke();
  g.beginPath(); g.arc(x + w * 0.1, y + h * 0.28, w * 0.28, -0.2, PI * 0.9); g.lineWidth = 2.2 * s + 0.6; g.strokeStyle = INKC; g.stroke();
}
// the eye (s02's paintEye, with its size and look as parameters): E = { up: [...], lo: [...], c: [x, y], ir, side,
// sx (horizontal squash of the iris for a turned eye), lidW }
export function eye(g, E) {
  const { up, lo, c, ir = 28, side = 1, sx = 1 } = E;
  const pr = E.pr ?? ir * 0.2;
  const opening = (cc) => { const q = sampleCurve(up, 8); cc.moveTo(q[0][0], q[0][1]); for (const p of q) cc.lineTo(p[0], p[1]); const l = sampleCurve(lo, 8).reverse(); for (const p of l) cc.lineTo(p[0], p[1]); cc.closePath(); };
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of [...up, ...lo]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cy = (y0 + y1) / 2;
  g.save(); g.beginPath(); opening(g); g.clip();
  g.fillStyle = gv(0.97); g.fillRect(x0 - 10, y0 - 10, x1 - x0 + 20, y1 - y0 + 20);
  const sh = g.createLinearGradient(0, y0 - 5, 0, cy + 10); sh.addColorStop(0, gv(0.55, 0.55)); sh.addColorStop(1, gv(0.9, 0));
  g.fillStyle = sh; g.fillRect(x0 - 10, y0 - 10, x1 - x0 + 20, cy - y0 + 20);
  const rv = rng(E.seed ?? 601);
  for (let i = 0; i < 7; i++) {
    const left = rv() < 0.5, corner = left ? up[0] : up[up.length - 1], px = corner[0] + (left ? 1 : -1) * (6 + rv() * 16), py = cy + (rv() - 0.3) * 12;
    const a = (left ? 0 : PI) + (rv() - 0.5) * 1.2;
    line(g, [[px, py], [px + Math.cos(a) * 10, py + Math.sin(a) * 10 + (rv() - 0.5) * 5], [px + Math.cos(a) * 18, py + Math.sin(a) * 18]], 1.0, gv(0.3, 0.5));
  }
  // iris: pale grey with radial striations, a dark limbal ring, a black pupil and a small glint
  g.save(); g.translate(c[0], c[1]); g.scale(sx, 1);
  g.beginPath(); g.arc(0, 0, ir, 0, 2 * PI); g.fillStyle = gv(E.irisV ?? 0.8); g.fill();
  const rs = rng((E.seed ?? 601) + 10);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * 2 * PI + rs() * 0.05, r0 = pr + 3 + rs() * 3, r1 = ir * (0.72 + rs() * 0.25);
    line(g, [[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1]], 1.3, gv(0.2, 0.55));
  }
  g.beginPath(); g.arc(0, 0, ir - 2, 0, 2 * PI); g.lineWidth = Math.max(2.5, ir * 0.13); g.strokeStyle = INKC; g.stroke();
  g.beginPath(); g.arc(0, 0, ir * 0.55, 0, 2 * PI); g.lineWidth = 1; g.strokeStyle = gv(0.2, 0.4); g.stroke();
  g.beginPath(); g.arc(0, 0, pr, 0, 2 * PI); g.fillStyle = INKC; g.fill();
  g.beginPath(); g.arc(-pr * 0.9, -pr * 1.0, Math.max(1.6, pr * 0.45), 0, 2 * PI); g.fillStyle = gv(0.97); g.fill();
  g.restore();
  const ls = g.createLinearGradient(0, y0 - 4, 0, y0 + (y1 - y0) * 0.35); ls.addColorStop(0, gv(0.1, 0.5)); ls.addColorStop(1, gv(0.1, 0));
  g.fillStyle = ls; g.fillRect(x0 - 10, y0 - 10, x1 - x0 + 20, (y1 - y0) * 0.45 + 10);
  g.restore();
  // heavy upper lid, a heavy lower rim, a second lower lid line with lash ticks, the crease above
  line(g, up, E.lidW ?? 8, INKC, { end: 0.35, pow: 0.4 });
  line(g, lo, (E.lidW ?? 8) * 0.55, INKC, { end: 0.35, pow: 0.5 });
  const lo2 = lo.map((p, i) => [p[0], p[1] + 8 + 5 * Math.sin(PI * i / (lo.length - 1))]);
  line(g, lo2, 2.4, gv(0.08, 0.9), { end: 0.2 });
  const cr = up.map((p, i) => [p[0], p[1] - (E.crease ?? 20) - 7 * Math.sin(PI * i / (up.length - 1))]);
  line(g, cr, 2.0, gv(0.08, 0.8), { end: 0.1 });
  const q = sampleCurve(lo2, 6), rl = rng((E.seed ?? 601) + 20);
  for (let i = 2; i < q.length - 2; i += 2) { const p = q[i]; line(g, [[p[0], p[1] - 4], [p[0] + (rl() - 0.5) * 3, p[1] + 3]], 2.0, gv(0.08, 0.8)); }
}
// hatched socket shading round an eye: comb rows hanging under the lower lid, cross-hatch at the inner corner
export function socket(g, lo, inner, seed, { rows = 3, len = 24, dark = 0.5, blur = true } = {}) {
  if (blur) {
    g.save(); g.filter = "blur(10px)"; g.strokeStyle = gv(0.35, 0.35); g.lineWidth = 30; g.lineJoin = "round";
    const q = sampleCurve(lo, 6); g.beginPath(); g.moveTo(q[0][0], q[0][1] + 16); for (const p of q) g.lineTo(p[0], p[1] + 16); g.stroke(); g.restore();
  }
  combRows(g, lo.map(([x, y]) => [x, y + 12]), rows, 6, len, 1.4, 1.2, gv(0.05, dark), seed, { step: 3.6 });
  if (inner) {
    hatchPatch(g, inner[0], inner[1], inner[2], inner[3], 1.0, 36, 26, 1.1, gv(0.05, 0.5), seed + 1, 0.2);
    hatchPatch(g, inner[0], inner[1], inner[2], inner[3], 2.2, 28, 22, 1.0, gv(0.05, 0.45), seed + 2, 0.2);
  }
}
// brow: dense short hairs along a band
export function brow(g, pts, seed, lean, { n = 260, w = 2.2, spread = 16 } = {}) {
  const q = sampleCurve(pts, 16), rb = rng(seed);
  for (let i = 0; i < n; i++) {
    const p = q[Math.floor(rb() * q.length)], x = p[0] + (rb() - 0.5) * 6, y = p[1] + (rb() - 0.5) * spread, L = 12 + rb() * 14;
    const aa = lean + (rb() - 0.5) * 0.6;
    strand(g, [[x, y + 5], [x + Math.cos(aa) * L, y + 5 - Math.sin(Math.abs(aa)) * L * 0.4]], w + rb() * 1.4, INKC, { per: 2, head: 0.2 });
  }
}
// knit beanie in s02's manner: grey knit lit toward `litX`, ribs fanning from the brim toward a point O above the
// head, knit courses, cross-hatched patches and heavy edges. B = { outline, brim, fold?, litX, lit: [x0, x1], O }
export function beanie(g, B, seed) {
  const path = (c) => smoothPath(c, B.outline, true);
  const [xa, xb] = B.span;
  const stops = B.stops || [[0, 0.3], [0.14, 0.58], [0.35, 0.84], [0.55, 0.86], [0.75, 0.66], [0.9, 0.42], [1, 0.2]];
  fillPath(g, path, lin(g, xa, 0, xb, 0, stops));
  clipTo(g, path, () => {
    if (B.fold) { g.beginPath(); g.moveTo(xa - 100, -600); for (const p of B.fold) g.lineTo(p[0], p[1]); g.lineTo(xb + 100, -600); g.closePath(); g.fillStyle = gv(0.1, 0.3); g.fill(); }
    const r = rng(seed), O = B.O;
    const q = sampleCurve(B.brim, 20);
    const N = B.nRibs ?? Math.round((xb - xa) / 11);
    for (let i = 0; i <= N; i++) {
      const f = i / N, p = q[Math.round(f * (q.length - 1))];
      const pts = [];
      for (let k = 0; k <= 12; k++) { const u = k / 12 * 0.9; pts.push([p[0] + (O[0] - p[0]) * u + Math.sin(k * 1.9 + i * 0.7) * 1.4, p[1] + (O[1] - p[1]) * u]); }
      const edge = Math.min(1, Math.abs(p[0] - B.litX) / ((xb - xa) * 0.5));
      line(g, pts, 2.6 + 1.4 * edge, gv(0.04, 0.34 + 0.36 * edge), { end: 0.8 });
      if (edge < 0.8) line(g, pts.map(([px, py]) => [px + 4.5, py]), 1.8, gv(0.97, 0.3 * (1 - edge)), { end: 0.8 });
    }
    const rk = rng(seed + 5);
    let y0 = 1e9, y1 = -1e9; for (const [, y] of B.outline) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = y0; y < y1; y += 8) for (let x = xa; x < xb; x += 12) {
      if (rk() > (B.knit ?? 0.35)) continue;
      g.strokeStyle = gv(0.05, 0.25 + 0.25 * rk()); g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x - 4, y - 2); g.lineTo(x, y + 2.5); g.lineTo(x + 4, y - 2); g.stroke();
    }
    for (const [cx, cy, rx, ry, a, n] of B.patches || []) {
      hatchPatch(g, cx, cy, rx, ry, a, n, 30, 1.4, gv(0.03, 0.5), seed + cx, 0.2);
      hatchPatch(g, cx, cy, rx, ry, a + 1.3, Math.round(n * 0.7), 26, 1.2, gv(0.03, 0.45), seed + cy, 0.2);
    }
  });
  if (B.fold) line(g, B.fold, 5, INKC, { end: 0.5 });
  line(g, B.brim, 7, INKC, { end: 0.5 });
  if (B.edge) line(g, B.edge, 3, INKC, { end: 0.6, per: 10 });
}
