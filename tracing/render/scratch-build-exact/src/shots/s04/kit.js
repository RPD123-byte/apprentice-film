// s04 drawing helpers for the designer key drawings (frame coordinates of each key's source frame).
import { Plate, grey } from "../../lib/engrave.js";
import { taper, INK } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

export { Plate, grey, taper, INK, smoothPath, sampleCurve, rng };
export const DARK = "#070707";
export const TAU = Math.PI * 2;

export const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
export const blob = (pts) => (c) => smoothPath(c, pts, true);
export const ell = (x, y, rx, ry, a = 0) => (c) => c.ellipse(x, y, rx, ry, a, 0, TAU);
export const linear = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
export const radial = (x, y, r0, r1, stops) => (g) => { const r = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };

// tapered ink through control points (Catmull-Rom); prof: 'mid' swells in the middle, 'root' starts full and tapers
export function ink(o, pts, w, color = DARK, prof = "mid", per = 6) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  const f = prof === "root" ? (u) => w * Math.pow(1 - u, 0.7) + 0.3
    : prof === "tip" ? (u) => w * Math.pow(u, 0.7) + 0.3
    : prof === "flat" ? () => w
    : (u) => w * (0.25 + 0.75 * Math.pow(Math.sin(Math.PI * u), 0.55));
  taper(o, q, f, color);
}
// a filled hair lock: a tapered black blade along a curve, width w at the root
export function lock(o, pts, w, color = DARK, pow = 0.8) {
  const q = sampleCurve(pts, 8);
  taper(o, q, (u) => w * Math.pow(1 - u, pow) + 0.4, color);
}
// highlight strands running along a curve (offset copies of it)
export function strands(o, pts, n, spread, w, color, seed, alpha = 0.85) {
  const r = rng(seed), q = sampleCurve(pts, 8);
  const nAt = (i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [-dy / d, dx / d]; };
  for (let k = 0; k < n; k++) {
    const off = (n === 1 ? 0 : k / (n - 1) - 0.5) * spread + (r() - 0.5) * spread * 0.3;
    const i0 = Math.floor(r() * q.length * 0.25), i1 = Math.min(q.length, i0 + Math.floor(q.length * (0.45 + 0.55 * r())));
    const sq = q.slice(i0, i1).map((p, j) => { const nn = nAt(i0 + j); const taperK = 1 - j / Math.max(1, i1 - i0) * 0.6; return [p[0] + nn[0] * off * taperK, p[1] + nn[1] * off * taperK]; });
    if (sq.length < 3) continue;
    const ww = w * (0.6 + 0.8 * r());
    o.save(); o.globalAlpha = alpha * (0.6 + 0.4 * r());
    taper(o, sq, (u) => ww * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.1)), 0.5) + 0.2, color);
    o.restore();
  }
}
// parallel hatch strokes inside a clip: angle, spacing, stroke length range, width, color
export function hatch(o, clip, bounds, { angle = 0.8, spacing = 7, len = [30, 80], w = 1.2, color = DARK, alpha = 0.8, seed = 1, jitter = 0.4, density = 1 } = {}) {
  const r = rng(seed);
  const [x0, y0, x1, y1] = bounds;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2;
  o.save(); if (clip) { o.beginPath(); clip(o); o.clip(); }
  o.globalAlpha = alpha;
  for (let s = -R; s <= R; s += spacing) {
    let t = -R + r() * len[1];
    while (t < R) {
      const L = len[0] + r() * (len[1] - len[0]);
      if (r() < density) {
        const off = s + (r() - 0.5) * spacing * jitter;
        const px = cx - sa * off + ca * t, py = cy + ca * off + sa * t;
        const qx = px + ca * L, qy = py + sa * L;
        const ww = w * (0.6 + 0.8 * r());
        taper(o, [[px, py], [(px + qx) / 2, (py + qy) / 2], [qx, qy]], (u) => ww * Math.pow(Math.sin(Math.PI * u), 0.6) + 0.15, color);
      }
      t += L + spacing * (0.5 + r() * 2);
    }
  }
  o.restore();
}
// strokes radiating from a curve in a direction (fabric folds, eye-bag hatching)
export function combStrokes(o, pts, { dir = [0, 1], len = [20, 50], step = 6, w = 1.2, color = DARK, alpha = 0.7, seed = 3, bend = 0.1 } = {}) {
  const r = rng(seed), q = sampleCurve(pts, 10);
  let acc = 0;
  for (let i = 1; i < q.length; i++) {
    acc += Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]);
    if (acc < step) continue;
    acc = 0;
    const p = q[i], L = len[0] + r() * (len[1] - len[0]);
    const d = typeof dir === "function" ? dir(p, i / q.length) : dir;
    const e = [p[0] + d[0] * L, p[1] + d[1] * L];
    const m = [(p[0] + e[0]) / 2 - d[1] * L * bend * (r() - 0.3), (p[1] + e[1]) / 2 + d[0] * L * bend * (r() - 0.3)];
    const ww = w * (0.6 + 0.8 * r());
    o.save(); o.globalAlpha = alpha * (0.6 + 0.4 * r());
    taper(o, [p, m, e], (u) => ww * Math.pow(1 - u, 0.8) + 0.2, color);
    o.restore();
  }
}
// short dots/ticks (stubble) in an ellipse
export function stubble(o, cx, cy, rx, ry, n, seed, { w = 1.3, len = 4, color = DARK, alpha = 0.55, ang = 1.4 } = {}) {
  const r = rng(seed);
  o.save();
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, rr = Math.sqrt(r());
    const x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr;
    const aa = ang + (r() - 0.5) * 0.8, L = len * (0.5 + r());
    o.globalAlpha = alpha * (0.4 + 0.6 * r());
    taper(o, [[x, y], [x + Math.cos(aa) * L / 2, y + Math.sin(aa) * L / 2], [x + Math.cos(aa) * L, y + Math.sin(aa) * L]], (u) => w * Math.sin(Math.PI * u) + 0.2, color);
  }
  o.restore();
}
// soft value shading painted straight into the plate's value map (blurred), keeping directions
export function softValue(P, path, value, blur, alpha = 1, op = "source-over") {
  const v = P.v;
  v.save(); v.globalCompositeOperation = op; v.globalAlpha = alpha; v.filter = `blur(${blur}px)`;
  v.beginPath(); path(v); v.fillStyle = typeof value === "number" ? grey(value) : value(v); v.fill();
  v.filter = "none"; v.restore();
}
// a teardrop sweat bead: outline with a highlight
export function sweat(o, x, y, s = 1, rot = 0) {
  o.save(); o.translate(x, y); o.rotate(rot); o.scale(s, s);
  o.fillStyle = "rgba(245,244,240,0.95)";
  o.beginPath(); o.moveTo(0, -12); o.bezierCurveTo(3, -4, 7, 2, 6, 7); o.bezierCurveTo(5, 12, -5, 12, -6, 7); o.bezierCurveTo(-7, 2, -3, -4, 0, -12); o.fill();
  o.strokeStyle = "#222"; o.lineWidth = 1.6; o.stroke();
  o.fillStyle = "rgba(40,40,40,0.5)"; o.beginPath(); o.ellipse(2.5, 6, 2, 3, 0.3, 0, TAU); o.fill();
  o.restore();
}
// Paint a plate with margin M and return it: paint(P) draws in frame coordinates.
export function makePlate(W, H, M, paint) {
  const P = new Plate(W + 2 * M, H + 2 * M, 1);
  for (const g of [P.v, P.d, P.o]) g.translate(M, M);
  paint(P);
  return P;
}
// cut out a silhouette (frame coords) from a canvas carrying margin M: everything outside becomes transparent
export function maskTo(canvas, M, pathFns, feather = 1.5, over = null) {
  const m = document.createElement("canvas"); m.width = canvas.width; m.height = canvas.height;
  const g = m.getContext("2d"); g.translate(M, M);
  g.filter = `blur(${feather}px)`; g.fillStyle = "#fff";
  for (const f of [].concat(pathFns)) { g.beginPath(); f(g); g.fill(); }
  g.filter = "none";
  // everything inked on the overlay counts as figure too (hair locks and their pointed tips)
  if (over) { g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(over, 0, 0); }
  const c = canvas.getContext("2d");
  c.save(); c.globalCompositeOperation = "destination-in"; c.drawImage(m, 0, 0); c.restore();
  return canvas;
}
