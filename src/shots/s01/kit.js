// s01 drawing kit: small helpers shared by the room and figure plates (copied variants, see STYLE.md ownership).
import { taper, INK } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
import { grey } from "../../lib/engrave.js";

export { INK, grey, rng, taper, smoothPath, sampleCurve };
export const DARK = "#0d0d0d";

export const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
export const blob = (pts) => (c) => smoothPath(c, pts, true);
export const ell = (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
export const rect = (x, y, w, h) => (c) => c.rect(x, y, w, h);
export const rrect = (x, y, w, h, r) => (c) => c.roundRect(x, y, w, h, r);
export const lin = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
export const rad = (x, y, r0, r1, stops, x1 = x, y1 = y) => (g) => { const r = g.createRadialGradient(x1, y1, r0, x, y, r1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };

// A polyline, straight segments, jittered a hair, tapered at both ends.
export function line(o, pts, w, color = INK, seed = 1, ends = 0.45) {
  const r = rng(seed), q = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 7));
    for (let k = 0; k < n; k++) q.push([x0 + (x1 - x0) * (k / n) + (r() - 0.5) * 0.5, y0 + (y1 - y0) * (k / n) + (r() - 0.5) * 0.5]);
  }
  q.push(pts[pts.length - 1]);
  taper(o, q, (u) => w * (ends + (1 - ends) * Math.pow(Math.sin(Math.PI * u), 0.35)), color);
}
// A smooth (Catmull-Rom) curve, tapered; closed joins the ends.
export function curve(o, pts, w, color = INK, seed = 1, { closed = false, ends = 0.4, per = 7 } = {}) {
  const r = rng(seed);
  const q = sampleCurve(pts, per, closed).map(([x, y]) => [x + (r() - 0.5) * 0.4, y + (r() - 0.5) * 0.4]);
  taper(o, q, closed ? () => w : (u) => w * (ends + (1 - ends) * Math.pow(Math.sin(Math.PI * u), 0.4)), color);
}
// A brush stroke: pointed at both ends, fattest at `bias` (0..1 along the stroke).
export function stroke(o, pts, w, color, seed = 1, bias = 0.4, per = 6) {
  const r = rng(seed);
  const q = (pts.length > 2 ? sampleCurve(pts, per) : pts).map(([x, y]) => [x + (r() - 0.5) * 0.3, y + (r() - 0.5) * 0.3]);
  const warp = (u) => (u < bias ? (0.5 * u) / bias : 0.5 + (0.5 * (u - bias)) / (1 - bias));
  taper(o, q, (u) => w * Math.pow(Math.max(0, Math.sin(Math.PI * warp(u))), 0.7), color);
}
// Point-in-polygon (for masks / deterministic stroke scattering).
export function inside(pts, x, y) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// Bilinear point in a quad [TL, TR, BR, BL].
export const quadAt = (q, u, v) => {
  const a = [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u];
  const b = [q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u];
  return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v];
};
// Grain strokes across a quad: n strokes running from the u=0 edge... along `dir` ("u" runs TL->TR, "v" runs TL->BL).
export function grain(o, q, n, { dir = "v", w = 1.4, color = "rgba(10,10,10,0.8)", seed = 1, wav = 0.012, len = [0.5, 1], alpha = 1 } = {}) {
  const r = rng(seed);
  o.save(); o.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const s = (i + 0.2 + r() * 0.6) / n;
    const L = len[0] + r() * (len[1] - len[0]), a0 = r() * (1 - L), a1 = a0 + L;
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const tt = a0 + ((a1 - a0) * k) / 8, ss = s + Math.sin(tt * 9 + i) * wav * (0.5 + r());
      pts.push(dir === "v" ? quadAt(q, ss, tt) : quadAt(q, tt, ss));
    }
    taper(o, pts, (u) => w * (0.3 + r() * 0.2 + 0.7 * Math.sin(Math.PI * u)), color);
  }
  o.restore();
}
