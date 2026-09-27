// Ink primitives for a scratchboard look: white marks pulled out of black.
// Every mark is seeded, so a static drawing never boils between frames.
import { rng, noise1 } from "./rng.js";

export const INK = "#f2f0ea";   // the "white" of the ink: warm, never pure
export const BLACK = "#050505";

// A variable-width line: pts [[x,y],...], width profile w(u) for u in [0,1].
export function taper(ctx, pts, w, color = INK) {
  if (pts.length < 2) return;
  const L = [], R = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const hw = (typeof w === "function" ? w(i / (n - 1)) : w) / 2;
    L.push([p[0] - dy * hw, p[1] + dx * hw]);
    R.push([p[0] + dy * hw, p[1] - dx * hw]);
  }
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// A swelling brush profile: thin at both ends, full in the middle.
export const swell = (w, bias = 0.5) => (u) => w * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 0.6) * (0.75 + 0.5 * (1 - Math.abs(u - bias)));

// Parallel hatching clipped to a path. tone 0 = no lines, 1 = solid.
// angle in radians, spacing in px. Lines jitter a little in angle and position and break into dashes.
export function hatch(ctx, clip, o) {
  const { angle = 0.7, spacing = 6, width = 1.2, tone = 0.5, seed = 1, color = INK, jitter = 0.35, broken = 0.15, bounds } = o;
  if (tone <= 0.001) return;
  const r = rng(seed);
  ctx.save();
  if (clip) { ctx.beginPath(); clip(ctx); ctx.clip(); }
  const [x0, y0, x1, y1] = bounds;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rad = Math.hypot(x1 - x0, y1 - y0) / 2 + spacing;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  const lw = width * (0.6 + 0.8 * tone);
  for (let s = -rad; s <= rad; s += spacing) {
    if (r() > Math.min(1, tone * 1.6)) continue;
    const off = s + (r() - 0.5) * spacing * jitter;
    const aj = angle + (r() - 0.5) * 0.06 * jitter;
    const c2 = Math.cos(aj), s2 = Math.sin(aj);
    const px = cx - sa * off, py = cy + ca * off;
    let t = -rad;
    while (t < rad) {
      const seg = rad * (0.3 + r() * 1.7);
      const t2 = Math.min(rad, t + seg);
      if (r() > broken) {
        ctx.lineWidth = lw * (0.7 + r() * 0.6);
        ctx.beginPath();
        ctx.moveTo(px + c2 * t, py + s2 * t);
        ctx.lineTo(px + c2 * t2, py + s2 * t2);
        ctx.stroke();
      }
      t = t2 + spacing * (0.5 + r() * 2);
    }
  }
  ctx.restore();
}

// A wobbling outline along a polyline (hand-inked edge).
export function wobble(ctx, pts, { width = 2, seed = 3, amp = 0.8, color = INK, closed = false } = {}) {
  const q = pts.map((p, i) => [p[0] + noise1(i * 0.37, seed) * amp, p[1] + noise1(i * 0.41, seed + 9) * amp]);
  if (closed) q.push(q[0]);
  taper(ctx, q, (u) => width * (0.65 + 0.35 * Math.sin(Math.PI * u)), color);
}
