// s27 painting helpers: flat illustrated fills with soft shading and a warm ink keyline (the morning-room look).
import { rng } from "../../lib/rng.js";

export const INKC = "#4a3a34";      // keyline (pre-grade)
export const INKS = "rgba(74,58,52,0.55)";

export function canvas(w, h) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

export function path(g, pts, close = true) {
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  if (close) g.closePath();
}
// Catmull-Rom smooth path through points
export function spath(g, pts, close = true) {
  const n = pts.length, P = (i) => (close ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  g.moveTo(pts[0][0], pts[0][1]);
  const last = close ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), s = 1 / 6;
    g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * s, p1[1] + (p2[1] - p0[1]) * s, p2[0] - (p3[0] - p1[0]) * s, p2[1] - (p3[1] - p1[1]) * s, p2[0], p2[1]);
  }
  if (close) g.closePath();
}
export function fill(g, pts, col, { smooth = false } = {}) {
  g.beginPath(); (smooth ? spath : path)(g, pts); g.fillStyle = col; g.fill();
}
export function stroke(g, pts, lw = 2, col = INKC, { close = false, smooth = false, cap = "round" } = {}) {
  g.beginPath(); (smooth ? spath : path)(g, pts, close); g.lineWidth = lw; g.strokeStyle = col; g.lineCap = cap; g.lineJoin = "round"; g.stroke();
}
export function shape(g, pts, col, lw = 2, line = INKC, smooth = false) {
  g.beginPath(); (smooth ? spath : path)(g, pts);
  if (col) { g.fillStyle = col; g.fill(); }
  if (lw) { g.lineWidth = lw; g.strokeStyle = line; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
}
export function rect(g, x, y, w, h, col, lw = 2, line = INKC) { shape(g, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], col, lw, line); }
export function rrect(g, x, y, w, h, r, col, lw = 2, line = INKC) {
  g.beginPath(); g.roundRect(x, y, w, h, r);
  if (col) { g.fillStyle = col; g.fill(); }
  if (lw) { g.lineWidth = lw; g.strokeStyle = line; g.stroke(); }
}
export function ellipse(g, x, y, rx, ry, col, lw = 0, line = INKC, rot = 0) {
  g.beginPath(); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2);
  if (col) { g.fillStyle = col; g.fill(); }
  if (lw) { g.lineWidth = lw; g.strokeStyle = line; g.stroke(); }
}
export function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
export function rad(g, x, y, r, stops, x1 = x, y1 = y, r0 = 0) {
  const gr = g.createRadialGradient(x1, y1, r0, x, y, r);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  return gr;
}
// soft blob (airbrush), blurred by canvas filter
export function soft(g, fn, blur, alpha = 1) {
  g.save(); g.filter = `blur(${blur}px)`; g.globalAlpha = alpha; fn(g); g.restore();
}
// clip to a shape, run fn
export function clipped(g, pts, fn, smooth = false) {
  g.save(); g.beginPath(); (smooth ? spath : path)(g, pts); g.clip(); fn(g); g.restore();
}
// a leaf: pointed ellipse from base b toward tip direction
export function leaf(g, bx, by, ang, len, wid, col, lw = 1.6, line = INKC, vein = true) {
  const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
  const tip = [bx + c * len, by + s * len];
  const m1 = [bx + c * len * 0.45 + nx * wid, by + s * len * 0.45 + ny * wid], m2 = [bx + c * len * 0.45 - nx * wid, by + s * len * 0.45 - ny * wid];
  g.beginPath(); g.moveTo(bx, by);
  g.quadraticCurveTo(m1[0] + c * len * 0.1, m1[1] + s * len * 0.1, tip[0], tip[1]);
  g.quadraticCurveTo(m2[0] + c * len * 0.1, m2[1] + s * len * 0.1, bx, by);
  g.fillStyle = col; g.fill();
  if (lw) { g.lineWidth = lw; g.strokeStyle = line; g.lineJoin = "round"; g.stroke(); }
  if (vein) { g.beginPath(); g.moveTo(bx + c * len * 0.08, by + s * len * 0.08); g.lineTo(bx + c * len * 0.8, by + s * len * 0.8); g.lineWidth = lw * 0.6; g.strokeStyle = line; g.globalAlpha = 0.6; g.stroke(); g.globalAlpha = 1; }
}
// film-print speckle: fine seeded noise dots (the source's paper texture)
export function speckle(g, x, y, w, h, n, seed, col = "rgba(90,70,60,0.10)", r = 1.2) {
  const R = rng(seed); g.fillStyle = col;
  for (let i = 0; i < n; i++) { const px = x + R() * w, py = y + R() * h, rr = r * (0.4 + R()); g.fillRect(px, py, rr, rr); }
}
export function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t), gg = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t), bb = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `rgb(${r},${gg},${bb})`;
}
export function rgba(hex, a) { const p = parseInt(hex.slice(1), 16); return `rgba(${(p >> 16) & 255},${(p >> 8) & 255},${p & 255},${a})`; }
