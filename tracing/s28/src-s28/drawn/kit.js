// s28 drawing kit: smooth paths, tapered ink, hatching, seeded texture. Everything is deterministic (seeded).
import { rng } from "../../../lib/rng.js";

export function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}
// points: [x, y] or [x, y, 1] (a sharp corner). Catmull-Rom through the points.
export function sample(pts, closed = false, per = 10) {
  const n = pts.length, out = [];
  if (n < 2) return pts.map((p) => [p[0], p[1]]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % n];
    const p0 = p1[2] ? p1 : closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)];
    const p3 = p2[2] ? p2 : closed ? pts[(i + 2) % n] : pts[Math.min(n - 1, i + 2)];
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const m = Math.max(2, Math.min(per * 4, Math.ceil(segLen / 4)));
    for (let k = 0; k < m; k++) {
      const u = k / m, u2 = u * u, u3 = u2 * u;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3),
      ]);
    }
  }
  if (!closed) out.push([pts[n - 1][0], pts[n - 1][1]]);
  return out;
}
export function trace(g, pts, closed = true, smooth = true) {
  const q = smooth ? sample(pts, closed) : pts;
  g.moveTo(q[0][0], q[0][1]);
  for (let i = 1; i < q.length; i++) g.lineTo(q[i][0], q[i][1]);
  if (closed) g.closePath();
}
export function shape(g, pts, fill, { smooth = true } = {}) {
  g.beginPath(); trace(g, pts, true, smooth); g.fillStyle = fill; g.fill();
}
export function poly(g, pts, fill) { shape(g, pts, fill, { smooth: false }); }
export function rect(g, x, y, w, h, fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); }
// tapered stroke along a (smoothed) polyline; w number or u => width
export function ink(g, pts, w = 2, color = "#2a1a16", { smooth = true, closed = false, taper = 0.35 } = {}) {
  let q = smooth ? sample(pts, closed) : pts.map((p) => [p[0], p[1]]);
  if (closed) q.push(q[0]);
  const n = q.length;
  if (n < 2) return;
  const wf = typeof w === "function" ? w : (u) => w * (closed ? 1 : (1 - taper) + taper * Math.pow(Math.sin(Math.PI * u), 0.5));
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
  const L = cum[n - 1] || 1;
  const A = [], B = [];
  for (let i = 0; i < n; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const hw = wf(cum[i] / L) / 2;
    A.push([q[i][0] - dy * hw, q[i][1] + dx * hw]); B.push([q[i][0] + dy * hw, q[i][1] - dx * hw]);
  }
  g.beginPath();
  g.moveTo(A[0][0], A[0][1]);
  for (let i = 1; i < n; i++) g.lineTo(A[i][0], A[i][1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(B[i][0], B[i][1]);
  g.closePath();
  g.fillStyle = color; g.fill();
}
// plain round stroke
export function line(g, pts, w, color, { smooth = false, closed = false, cap = "round" } = {}) {
  g.beginPath(); trace(g, pts, closed, smooth);
  g.lineWidth = w; g.strokeStyle = color; g.lineCap = cap; g.lineJoin = "round"; g.stroke();
}
// hatching clipped to a shape: parallel strokes at `angle`, `sp` apart, each `len` long (random 0.5-1.2) or full
export function hatch(g, clipPts, { angle = 0.6, sp = 5, w = 1, color = "rgba(40,26,22,0.6)", seed = 1, len = 0, jitter = 0.4, density = 1, bounds = null, smooth = true } = {}) {
  const r = rng(seed);
  g.save();
  if (clipPts) { g.beginPath(); trace(g, clipPts, true, smooth); g.clip(); }
  let [x0, y0, x1, y1] = bounds || bb(clipPts);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + sp;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  g.strokeStyle = color; g.lineCap = "round";
  for (let s = -R; s <= R; s += sp) {
    if (r() > density) continue;
    const off = s + (r() - 0.5) * sp * jitter;
    const px = cx - sa * off, py = cy + ca * off;
    if (len > 0) {
      let tt = -R + r() * len;
      while (tt < R) {
        const l = len * (0.5 + 0.7 * r());
        g.lineWidth = w * (0.6 + 0.8 * r());
        g.beginPath(); g.moveTo(px + ca * tt, py + sa * tt); g.lineTo(px + ca * (tt + l), py + sa * (tt + l)); g.stroke();
        tt += l + len * (0.3 + r() * 0.9);
      }
    } else {
      g.lineWidth = w * (0.7 + 0.6 * r());
      g.beginPath(); g.moveTo(px - ca * R, py - sa * R); g.lineTo(px + ca * R, py + sa * R); g.stroke();
    }
  }
  g.restore();
}
export function bb(pts, pad = 0) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}
export function clipTo(g, pts, smooth = true) { g.beginPath(); trace(g, pts, true, smooth); g.clip(); }
// linear gradient helper: stops [[u, color], ...]
export function lin(g, x0, y0, x1, y1, stops) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [u, c] of stops) gr.addColorStop(u, c);
  return gr;
}
export function rad(g, x, y, r0, r1, stops) {
  const gr = g.createRadialGradient(x, y, r0, x, y, r1);
  for (const [u, c] of stops) gr.addColorStop(u, c);
  return gr;
}
// seeded speckle (print/paper texture): n dots of radius r, colour c, inside bounds
export function speckle(g, [x0, y0, x1, y1], n, r, c, seed = 7) {
  const R = rng(seed);
  g.fillStyle = c;
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0), rr = r * (0.5 + R());
    g.beginPath(); g.arc(x, y, rr, 0, 6.2832); g.fill();
  }
}
// vertical wood slats/hatching lines between x0..x1, y from top(x) to bottom(x)
export function vlines(g, x0, x1, top, bot, { sp = 6, w = 1.2, color = "rgba(60,30,20,0.6)", seed = 3, jitter = 0.5, broken = 0 } = {}) {
  const R = rng(seed);
  g.strokeStyle = color; g.lineCap = "butt";
  for (let x = x0; x <= x1; x += sp * (0.6 + 0.8 * R())) {
    const xx = x + (R() - 0.5) * jitter;
    const a = typeof top === "function" ? top(xx) : top, b = typeof bot === "function" ? bot(xx) : bot;
    g.lineWidth = w * (0.6 + 0.8 * R());
    if (broken > 0) {
      let y = a;
      while (y < b) { const l = (b - a) * (0.15 + 0.5 * R()); if (R() > broken) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, Math.min(b, y + l)); g.stroke(); } y += l + (b - a) * 0.05 * R(); }
    } else { g.beginPath(); g.moveTo(xx, a); g.lineTo(xx, b); g.stroke(); }
  }
}
