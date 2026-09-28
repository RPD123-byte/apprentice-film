// s14 drawing kit: a copy of the s01 helpers (STYLE.md ownership: copy, never import other shots).
import { taper as taper0, INK } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
import { grey } from "../../lib/engrave.js";

export { INK, grey, rng, smoothPath, sampleCurve };

// fix pass (vector ink): a room layer's overlay context carries a recorder (ctx.__vec = []). Every tapered stroke
// drawn on it is recorded as a centre line (points, widths, luma, alpha) instead of being baked into the plate, and
// the compositor (s14/gl.js) re-strokes it every frame through the layer's dolly mapping, so the ink keeps a fine
// screen width while the camera closes in. VEC.kind: 0 = an ink line (its width grows only a little with the
// magnification), 1 = a solid thing (a cable: it scales with the surface). ctx.__clip (x, y) => bool clips the
// recorded points (the recorder cannot see canvas clip paths).
export const VEC = { kind: 0, wk: 1 };
function parseCol(c) {
  if (typeof c !== "string") return [0, 1];
  let m = c.match(/rgba?\(([^)]+)\)/);
  if (m) { const v = m[1].split(",").map(Number); return [(0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255, v.length > 3 ? v[3] : 1]; }
  m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) { const n = parseInt(m[1], 16); return [(0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255, 1]; }
  return [0, 1];
}
export function taper(o, pts, w, color = INK) {
  const rec = o && o.__vec;
  if (!rec) return taper0(o, pts, w, color);
  if (pts.length < 2) return;
  const [l, a0] = parseCol(color), a = a0 * (o.globalAlpha ?? 1);
  if (a <= 0.004) return;
  const n = pts.length, clip = o.__clip;
  let cur = null;
  const flush = () => { if (cur && cur.p.length >= 4) rec.push(cur); cur = null; };
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (clip && !clip(p[0], p[1])) { flush(); continue; }
    if (!cur) cur = { p: [], w: [], l, a, k: VEC.kind };
    cur.p.push(p[0], p[1]);
    cur.w.push(Math.max(0, (typeof w === "function" ? w(i / (n - 1)) : w)) * VEC.wk);
  }
  flush();
}
// bake recorded strokes back into a canvas (for the occlusion map)
export function bakeVec(o, vec) {
  for (const s of vec) {
    const pts = []; for (let i = 0; i < s.p.length; i += 2) pts.push([s.p[i], s.p[i + 1]]);
    const m = pts.length;
    const l = s.l >= 2 ? s.l - 2 : s.l;
    taper0(o, pts, (u) => s.w[Math.min(m - 1, Math.round(u * (m - 1)))], l > 0.5 ? `rgba(242,240,234,${s.a})` : `rgba(0,0,0,${s.a})`);
  }
}
export const DARK = "#0d0d0d";

export const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
export const blob = (pts) => (c) => smoothPath(c, pts, true);
export const ell = (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
export const rect = (x, y, w, h) => (c) => c.rect(x, y, w, h);
export const rrect = (x, y, w, h, r) => (c) => c.roundRect(x, y, w, h, r);
// G.k: a value gain applied to gradient stops while a fill is painted (s14 room tone corrections, room.js TONE)
export const G = { k: 1 };
export const lin = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v * G.k))); return r; };
export const rad = (x, y, r0, r1, stops, x1 = x, y1 = y) => (g) => { const r = g.createRadialGradient(x1, y1, r0, x, y, r1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v * G.k))); return r; };

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
