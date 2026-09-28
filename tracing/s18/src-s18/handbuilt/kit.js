// s18 drawing kit: small helpers for the synth plates (copied/adapted from s01/kit.js — see STYLE.md ownership).
import { taper, INK } from "../../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";
import { grey } from "../../../lib/engrave.js";

export { INK, grey, rng, taper, smoothPath, sampleCurve };
export const DARK = "#060606";
export const PI = Math.PI;

export const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
export const blob = (pts) => (c) => smoothPath(c, pts, true);
export const ell = (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
export const rect = (x, y, w, h) => (c) => c.rect(x, y, w, h);
export const lin = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
export const rad = (x, y, r0, r1, stops) => (g) => { const r = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
export const ink = (a) => `rgba(242,240,234,${a})`;
export const blk = (a) => `rgba(4,4,4,${a})`;

// A polyline, jittered a hair, tapered at both ends.
export function line(o, pts, w, color = INK, seed = 1, ends = 0.45) {
  const r = rng(seed), q = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 7));
    for (let k = 0; k < n; k++) q.push([x0 + (x1 - x0) * (k / n) + (r() - 0.5) * 0.5, y0 + (y1 - y0) * (k / n) + (r() - 0.5) * 0.5]);
  }
  q.push(pts[pts.length - 1]);
  taper(o, q, (u) => w * (ends + (1 - ends) * Math.pow(Math.sin(Math.PI * u), 0.35)), color);
}
// A smooth curve, tapered; closed joins the ends.
export function curve(o, pts, w, color = INK, seed = 1, { closed = false, ends = 0.4, per = 7 } = {}) {
  const r = rng(seed);
  const q = sampleCurve(pts, per, closed).map(([x, y]) => [x + (r() - 0.5) * 0.4, y + (r() - 0.5) * 0.4]);
  taper(o, q, closed ? () => w : (u) => w * (ends + (1 - ends) * Math.pow(Math.sin(Math.PI * u), 0.4)), color);
}
// Bilinear point in a quad [TL, TR, BR, BL].
export const quadAt = (q, u, v) => {
  const a = [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u];
  const b = [q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u];
  return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v];
};
// Scratchboard stripes across a quad: n tapered strokes. dir "v" runs TL->BL (vertical grain), "u" runs TL->TR.
// w: [min,max] width; len: [min,max] fraction of the run; wav: waviness; fill: probability a slot gets a stroke.
export function stripes(o, q, n, { dir = "v", w = [1, 3], color = INK, seed = 1, wav = 0.006, len = [0.6, 1], alpha = 1, fill = 1, clip = true, taperEnds = 0.25, from = 0, to = 1 } = {}) {
  const r = rng(seed);
  o.save(); o.globalAlpha = alpha;
  if (clip) { o.beginPath(); poly(q)(o); o.clip(); }
  for (let i = 0; i < n; i++) {
    const s = from + (to - from) * ((i + 0.15 + r() * 0.7) / n);
    if (r() > fill) { r(); r(); r(); continue; }
    const L = len[0] + r() * (len[1] - len[0]), a0 = r() < 0.5 ? 0 : r() * (1 - L), a1 = Math.min(1.02, a0 + L);
    const ww = w[0] + r() * (w[1] - w[0]);
    const ph = r() * 6.28, pts = [];
    for (let k = 0; k <= 10; k++) {
      const tt = a0 - 0.01 + ((a1 - a0 + 0.02) * k) / 10, ss = s + Math.sin(tt * 7 + ph) * wav + (r() - 0.5) * wav * 0.3;
      pts.push(dir === "v" ? quadAt(q, ss, tt) : quadAt(q, tt, ss));
    }
    const te = taperEnds;
    taper(o, pts, (u) => ww * (te + (1 - te) * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 0.3)), color);
  }
  o.restore();
}
// Point-in-polygon.
export function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// Heart leaf (pointing along angle a from its stem point), as a point list.
export function leaf(x, y, L, a, wide = 0.62) {
  const c = Math.cos(a), s = Math.sin(a), P = (u, v) => [x + c * u * L - s * v * L, y + s * u * L + c * v * L];
  return [P(0, 0), P(0.02, -0.28 * wide), P(0.3, -0.5 * wide), P(0.62, -0.38 * wide), P(1, 0), P(0.62, 0.38 * wide), P(0.3, 0.5 * wide), P(0.02, 0.28 * wide)];
}
