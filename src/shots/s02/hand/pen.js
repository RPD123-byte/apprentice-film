// s02 hand-drawing primitives: tapered pen strokes, field hatching and small raster helpers.
// Everything is seeded (rng / hash), so a drawing is identical every time it is built.
import { rng } from "../../../lib/rng.js";
import { sampleCurve, smoothPath } from "../../../lib/paths.js";

export const PI = Math.PI;
export const gv = (v, a = 1) => {
  const c = Math.round(Math.max(0, Math.min(1, v)) * 255);
  return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`;
};
export const PAPER = 0.962;       // the lit paper white of the source's figure (pre-grade 245/255)
export const INKV = 0.02;         // ink black

// every static layer is a CPU canvas: rasterizing thousands of small ink paths is far faster in software than through the
// (often software-emulated) GPU path in headless renders, and the layers are drawn, not animated
export const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); c.getContext("2d", { willReadFrequently: true }); return c; };

// closed / open path functions from point lists
export const poly = (pts) => (g) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
export const blob = (pts, tension = 0.5) => (g) => smoothPath(g, pts, true, tension);
export function fillPath(g, path, style, rule = "nonzero") { g.beginPath(); path(g); g.fillStyle = style; g.fill(rule); }
export function withClip(g, path, fn, rule = "nonzero") { g.save(); g.beginPath(); path(g); g.clip(rule); fn(); g.restore(); }

// variable-width ribbon along a polyline (w(u) = full width at u in 0..1)
export function ribbon(g, q, w, color) {
  if (q.length < 2) return;
  if (q.length < 6) {   // short strokes: resample so a tapered profile keeps its body
    const d = []; for (let i = 0; i < 7; i++) { const f = (i / 6) * (q.length - 1), k = Math.min(q.length - 2, Math.floor(f)), t = f - k; d.push([q[k][0] + (q[k + 1][0] - q[k][0]) * t, q[k][1] + (q[k + 1][1] - q[k][1]) * t]); }
    q = d;
  }
  const n = q.length;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const hw = (typeof w === "function" ? w(i / (n - 1)) : w) / 2;
    L.push([q[i][0] - dy * hw, q[i][1] + dx * hw]); R.push([q[i][0] + dy * hw, q[i][1] - dx * hw]);
  }
  g.beginPath(); g.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath(); g.fillStyle = color; g.fill();
}
// width profiles
export const P_SWELL = (w, end = 0.2, pow = 0.6) => (u) => w * (end + (1 - end) * Math.pow(Math.sin(PI * Math.min(1, Math.max(0, u))), pow));
export const P_HANG = (w, head = 0.1, pow = 0.9) => (u) => w * Math.min(1, 0.35 + u / head) * Math.pow(Math.max(0, 1 - u), pow);   // thick root, hair tip
export const P_TIP2 = (w, a = 0.25, b = 0.25) => (u) => w * Math.min(1, u / a, (1 - u) / b);                                        // flat middle, both ends pointed
// a pen line through control points
export function pen(g, pts, w, color, prof = null, per = 8) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  ribbon(g, q, prof ? prof : P_SWELL(w), color);
}

// integrate a stroke through a direction field from p for length L (px); returns points
export function trace(p, L, ang, step = 3, bend = 0, r = null) {
  const q = [[p[0], p[1]]]; let x = p[0], y = p[1], a = ang(x, y), k = bend;
  const n = Math.max(2, Math.round(L / step));
  for (let i = 0; i < n; i++) {
    const a2 = ang(x, y); a = a + angDiff(a2, a) * 0.6 + k; if (r) k += (r() - 0.5) * 0.01;
    x += Math.cos(a) * step; y += Math.sin(a) * step; q.push([x, y]);
  }
  return q;
}
const angDiff = (a, b) => { let d = a - b; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; return d; };

// field hatching inside a clip path.
//   cov(x,y): target ink coverage 0..1 (or dens(x,y): raw probability that a cell spawns a stroke);
//   ang(x,y) direction; len(x,y,r) length; wid(x,y,r) width; prof: width profile builder (w) => (u) => width
export function hatch(g, clip, box, o) {
  const { sp = 6, cov = null, dens = null, ang, len, wid, color = gv(INKV), seed = 1, prof = (w) => P_TIP2(w, 0.2, 0.35), bend = 0, step = 3, jit = 0.9, alpha = null, rule = "nonzero" } = o;
  const r = rng(seed);
  const [x0, y0, x1, y1] = box;
  g.save();
  if (clip) { g.beginPath(); clip(g); g.clip(rule); }
  for (let y = y0; y < y1; y += sp) for (let x = x0; x < x1; x += sp) {
    const px = x + (r() - 0.5) * sp * jit * 2, py = y + (r() - 0.5) * sp * jit * 2;
    const u = r();
    const L = len(px, py, r), w = wid(px, py, r), b = (r() - 0.5) * bend;
    const d = cov ? cov(px, py) * sp * sp / Math.max(1, L * w * 0.62) : dens(px, py);
    if (u >= d) continue;
    const q = trace([px, py], L, ang, step, b / Math.max(1, L / step));
    if (alpha) g.globalAlpha = alpha(px, py, r);
    ribbon(g, q, prof(w), color);
  }
  g.restore();
}
// comb hatching: strokes leaving a root curve at regular spacing (the source's fabric / fur strokes hang from edges)
//   root: points; sp: spacing along it; ang(x,y,u) direction; len(u, r) length; wid(u, r); keep(u, r) optional filter
export function comb(g, root, o) {
  const { sp = 5, ang, len, wid, color = gv(INKV), seed = 1, prof = (w) => P_HANG(w, 0.12, 1.1), bend = 0, step = 3, jit = 0.35, keep = null, off = 0 } = o;
  const r = rng(seed);
  const q = sampleCurve(root, 12);
  // arc-length walk
  const seg = []; let tot = 0;
  for (let i = 1; i < q.length; i++) { const d = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); seg.push(d); tot += d; }
  let s = sp * r(), i = 0, acc = 0;
  while (s < tot) {
    while (i < seg.length - 1 && acc + seg[i] < s) { acc += seg[i]; i++; }
    const t = (s - acc) / (seg[i] || 1), p = [q[i][0] + (q[i + 1][0] - q[i][0]) * t, q[i][1] + (q[i + 1][1] - q[i][1]) * t];
    const u = s / tot;
    const L = len(u, r), w = wid(u, r), b = (r() - 0.5) * bend;
    if (!keep || keep(u, r)) {
      const a0 = ang(p[0], p[1], u);
      const st = [p[0] + Math.cos(a0) * off, p[1] + Math.sin(a0) * off];
      ribbon(g, trace(st, L, (x, y) => ang(x, y, u), step, b / Math.max(1, L / step)), prof(w), color);
    }
    s += sp * (1 + (r() - 0.5) * 2 * jit);
  }
}

// ---- raster helpers: rasterize a path into a small mask and get distance-to-edge (px) lookups
export function distField(path, box, scale = 0.25, inside = true) {
  const [x0, y0, x1, y1] = box, w = Math.ceil((x1 - x0) * scale), h = Math.ceil((y1 - y0) * scale);
  const c = mk(w, h), g = c.getContext("2d");
  g.scale(scale, scale); g.translate(-x0, -y0); g.fillStyle = "#fff"; g.beginPath(); path(g); g.fill();
  const im = g.getImageData(0, 0, w, h).data;
  const INF = 1e9, D = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) D[i] = (im[i * 4] > 127) === inside ? INF : 0;
  // two-pass chamfer (3-4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let v = D[i]; if (!v) continue;
    if (x > 0) v = Math.min(v, D[i - 1] + 3); if (y > 0) { v = Math.min(v, D[i - w] + 3); if (x > 0) v = Math.min(v, D[i - w - 1] + 4); if (x < w - 1) v = Math.min(v, D[i - w + 1] + 4); }
    D[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; let v = D[i]; if (!v) continue;
    if (x < w - 1) v = Math.min(v, D[i + 1] + 3); if (y < h - 1) { v = Math.min(v, D[i + w] + 3); if (x < w - 1) v = Math.min(v, D[i + w + 1] + 4); if (x > 0) v = Math.min(v, D[i + w - 1] + 4); }
    D[i] = v;
  }
  const f = 1 / (3 * scale);
  return (x, y) => {
    const ix = Math.floor((x - x0) * scale), iy = Math.floor((y - y0) * scale);
    if (ix < 0 || iy < 0 || ix >= w || iy >= h) return 0;
    const v = D[iy * w + ix]; return v >= INF ? 1e6 : v * f;
  };
}
// a point-in-path tester (rasterized)
export function inside(path, box, scale = 0.5) {
  const [x0, y0, x1, y1] = box, w = Math.ceil((x1 - x0) * scale), h = Math.ceil((y1 - y0) * scale);
  const c = mk(w, h), g = c.getContext("2d");
  g.scale(scale, scale); g.translate(-x0, -y0); g.fillStyle = "#fff"; g.beginPath(); path(g); g.fill();
  const im = g.getImageData(0, 0, w, h).data;
  return (x, y) => { const ix = Math.floor((x - x0) * scale), iy = Math.floor((y - y0) * scale); return ix >= 0 && iy >= 0 && ix < w && iy < h && im[(iy * w + ix) * 4] > 127; };
}
export const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
