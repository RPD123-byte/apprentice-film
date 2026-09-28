// Drawing helpers for s28 (the sunlit room). Plain Canvas2D; every random mark is seeded.
import { rng, noise2 } from "../../lib/rng.js";

export const INKC = "#1c0e0b";      // warm near-black ink (pre-grade)

export function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

// polygon path (straight edges)
export function poly(g, pts, close = true) {
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (close) g.closePath();
}
// Catmull-Rom path through points
export function spath(g, pts, closed = true, tension = 0.5) {
  const n = pts.length;
  if (n < 3) { poly(g, pts, closed); return; }
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  g.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  const k = tension / 3;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  if (closed) g.closePath();
}
export function fill(g, pts, col, smooth = false) {
  g.beginPath(); smooth ? spath(g, pts, true) : poly(g, pts, true); g.fillStyle = col; g.fill();
}
export function stroke(g, pts, col = INKC, lw = 2, { closed = false, smooth = false, cap = "round", alpha = 1 } = {}) {
  g.save(); g.globalAlpha *= alpha;
  g.beginPath(); smooth ? spath(g, pts, closed) : poly(g, pts, closed);
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = cap; g.lineJoin = "round"; g.stroke();
  g.restore();
}
export function shape(g, pts, fillCol, lw = 2.2, { smooth = false, ink = INKC } = {}) {
  g.beginPath(); smooth ? spath(g, pts, true) : poly(g, pts, true);
  if (fillCol) { g.fillStyle = fillCol; g.fill(); }
  if (lw) { g.strokeStyle = ink; g.lineWidth = lw; g.lineJoin = "round"; g.stroke(); }
}
export const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

// sample a Catmull-Rom curve densely
export function sample(pts, per = 8, closed = false) {
  const n = pts.length, out = [];
  if (n < 2) return pts.slice();
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(closed ? pts[0] : pts[n - 1]);
  return out;
}
// variable-width ink stroke along a (smoothed) polyline; w(u) or number; ends taper by `tip`
export function ink(g, pts, w = 2, col = INKC, { smooth = true, tip = 0.35, per = 6 } = {}) {
  const q = smooth && pts.length > 2 ? sample(pts, per) : pts;
  const n = q.length;
  if (n < 2) return;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = q[i], a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const u = i / (n - 1);
    const base = typeof w === "function" ? w(u) : w;
    const e = Math.min(1, Math.min(u, 1 - u) / Math.max(1e-3, tip));
    const hw = base * (tip > 0 ? 0.25 + 0.75 * Math.sqrt(e) : 1) / 2;
    L.push([p[0] - dy * hw, p[1] + dx * hw]); R.push([p[0] + dy * hw, p[1] - dx * hw]);
  }
  g.beginPath(); g.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) g.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath(); g.fillStyle = col; g.fill();
}

// parallel hatching inside the current clip region. angle radians; covers box [x0,y0,x1,y1].
export function hatch(g, box, { angle = Math.PI / 2, spacing = 5, lw = 1, col = INKC, seed = 1, jitter = 0.3, len = [0.6, 1.0], alpha = 1, taper = true, gap = 0 } = {}) {
  const r = rng(seed);
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rad = Math.hypot(x1 - x0, y1 - y0) / 2;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  g.save(); g.globalAlpha *= alpha; g.fillStyle = col; g.strokeStyle = col; g.lineCap = "round";
  for (let s = -rad; s <= rad; s += spacing) {
    if (gap && r() < gap) continue;
    const off = s + (r() - 0.5) * spacing * jitter;
    const px = cx - sa * off, py = cy + ca * off;
    const L = rad * (len[0] + (len[1] - len[0]) * r());
    const c0 = (r() - 0.5) * rad * (1 - len[0]);
    const a = [px + ca * (c0 - L), py + sa * (c0 - L)], b = [px + ca * (c0 + L), py + sa * (c0 + L)];
    const w = lw * (0.7 + 0.6 * r());
    if (taper) ink(g, [a, b], w, col, { smooth: false, tip: 0.3 });
    else { g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  }
  g.restore();
}
// hatching clipped to a polygon
export function hatchIn(g, pts, o = {}, smooth = false) {
  g.save(); g.beginPath(); smooth ? spath(g, pts, true) : poly(g, pts, true); g.clip();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  hatch(g, [x0 - 4, y0 - 4, x1 + 4, y1 + 4], o);
  g.restore();
}
// short hatch strokes placed along a guide line (a row of ticks), e.g. shading under an edge
export function ticks(g, a, b, { n = 20, len = 10, angle = Math.PI / 2, lw = 1, col = INKC, seed = 3, jitter = 0.4, alpha = 1 } = {}) {
  const r = rng(seed);
  g.save(); g.globalAlpha *= alpha;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5 + (r() - 0.5) * jitter) / n;
    const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
    const l = len * (0.6 + 0.8 * r());
    const an = angle + (r() - 0.5) * 0.2;
    ink(g, [[x, y], [x + Math.cos(an) * l, y + Math.sin(an) * l]], lw * (0.7 + 0.6 * r()), col, { smooth: false, tip: 0.5 });
  }
  g.restore();
}

export function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
export function rad(g, x, y, r0, r1, stops) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
// soft airbrushed blob (radial alpha) of a colour
export function blob(g, x, y, rx, ry, col, alpha = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(rx, ry);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.globalAlpha *= alpha; g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill();
  g.restore();
}

// Seeded paper grain tile (grey noise around 0.5) used in soft-light/overlay.
let grainC = null;
export function grainTile(size = 512, seed = 28) {
  if (grainC) return grainC;
  const c = canvas(size, size), g = c.getContext("2d");
  const im = g.createImageData(size, size), r = rng(seed);
  for (let i = 0; i < size * size; i++) {
    const x = i % size, y = (i / size) | 0;
    const v = 128 + (r() - 0.5) * 70 + noise2(x / 3.1, y / 3.1, seed) * 26 + noise2(x / 23, y / 23, seed + 5) * 10;
    const o = i * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = Math.max(0, Math.min(255, v)); im.data[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  grainC = c;
  return c;
}
export function grain(g, x0, y0, w, h, alpha = 0.25, op = "soft-light") {
  const t = grainTile();
  g.save(); g.globalCompositeOperation = op; g.globalAlpha = alpha;
  g.fillStyle = g.createPattern(t, "repeat"); g.fillRect(x0, y0, w, h);
  g.restore();
}
export const lerp2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
