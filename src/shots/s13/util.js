// s13 shared drawing helpers (moved out of s13.js in fix pass 1b).
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
import { V } from "../../lib/owlInk.js";

const { add, sub, mul, nrm } = V;
export const TAU = Math.PI * 2;

// Closed/open curve through [x, y, sharp] points: Catmull-Rom, but a point flagged sharp becomes a corner
// (feather spikes on a ragged silhouette); flag 2 = a flame tip ([x, y, 2, bulge, hook]).
export function mixPath(c, pts, closed = true) {
  const n = pts.length, k = 1 / 6;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  c.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    if (p1[2] === 2 || p2[2] === 2) {
      const d = sub(p2, p1), L = Math.hypot(d[0], d[1]) || 1, out = [d[1] / L, -d[0] / L], m = V.mix(p1, p2, 0.5);
      const q = p2[2] === 2 ? add(m, mul(out, L * (p2[3] ?? 0.2))) : sub(m, mul(out, L * (p1[4] ?? 0.25)));
      c.quadraticCurveTo(q[0], q[1], p2[0], p2[1]);
      continue;
    }
    const c1 = p1[2] ? [p1[0] + (p2[0] - p1[0]) * 0.28, p1[1] + (p2[1] - p1[1]) * 0.28] : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = p2[2] ? [p2[0] - (p2[0] - p1[0]) * 0.28, p2[1] - (p2[1] - p1[1]) * 0.28] : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    c.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
  }
  if (closed) c.closePath();
}
export const shp = (pts) => (c) => mixPath(c, pts, true);
export const blob = (pts, t) => (c) => smoothPath(c, pts, true, t);
export function clipTo(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip("evenodd"); fn(); g.restore(); }
// rings path (flat x,y lists, even-odd)
export const ringsPath = (rings) => (c) => { for (const r of rings) { c.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) c.lineTo(r[i], r[i + 1]); c.closePath(); } };
export const polyPath = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
export const ell = (e, k = 1, dx = 0, dy = 0) => (c) => c.ellipse(e.x + dx, e.y + dy, e.rx * k, e.ry * k, e.rot || 0, 0, TAU);
// offset a sampled polyline sideways by o(u) px (left of travel for o > 0)
export function offsetLine(q, o) {
  return q.map(([x, y], i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], t = nrm(sub(b, a)), u = i / (q.length - 1), k = typeof o === "function" ? o(u) : o; return [x - t[1] * k, y + t[0] * k]; });
}
// point in polygon of [x, y] points
export function inside(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; }
  return c;
}
export { sampleCurve, smoothPath, rng };
// a soft-edged filled ellipse without a blur filter: a radial gradient in the ellipse's own (unit-circle) space whose
// edge falls off (smoothstep) over +-1.2 blur px (close to a gaussian-blurred ellipse, much cheaper on big shapes).
// v: value 0..1, a: alpha
export function softEll(g, cx, cy, rx, ry, rot, v, a, blur) {
  const r = Math.min(rx, ry), e0 = Math.max(0, 1 - (blur * 1.2) / r), e1 = 1 + (blur * 1.2) / r, cc = Math.round(Math.max(0, Math.min(1, v)) * 255);
  g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(rx, ry);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, e1);
  gr.addColorStop(0, `rgba(${cc},${cc},${cc},${a})`);
  for (let k = 0; k <= 6; k++) { const t = k / 6, x = e0 + (e1 - e0) * t, s = 1 - t * t * (3 - 2 * t); gr.addColorStop(x / e1, `rgba(${cc},${cc},${cc},${(a * s).toFixed(4)})`); }
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, e1, 0, Math.PI * 2); g.fill();
  g.restore();
}
