// Path helpers: smooth curves through points, and a cache for static drawings.
import { hatch, taper, INK } from "./ink.js";
import { rng } from "./rng.js";

// Catmull-Rom through points, as a Canvas path. closed: join the ends smoothly.
export function smoothPath(ctx, pts, closed = false, tension = 0.5) {
  const n = pts.length;
  if (n < 2) return;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  ctx.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const k = tension / 3;
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
  }
  if (closed) ctx.closePath();
}

// Sample a Catmull-Rom curve into a dense polyline (for tapered strokes along a curve).
export function sampleCurve(pts, per = 8, closed = false) {
  const n = pts.length, out = [];
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

// An inked curve through points with a swelling width.
export function inkCurve(ctx, pts, w = 2, color = INK, per = 8) {
  taper(ctx, sampleCurve(pts, per), (u) => w * (0.35 + 0.65 * Math.pow(Math.sin(Math.PI * u), 0.5)), color);
}

// Fill a smooth closed shape.
export function fillShape(ctx, pts, color) {
  ctx.beginPath(); smoothPath(ctx, pts, true); ctx.fillStyle = color; ctx.fill();
}

// Bounds of a point list.
export function bbox(pts, pad = 0) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}

// Hatch inside a smooth closed shape.
export function hatchShape(ctx, pts, o) {
  hatch(ctx, (c) => smoothPath(c, pts, true), { bounds: bbox(pts, 4), ...o });
}

// Radial strokes from a center, clipped to a shape (knit crowns, speaker cones, sunbursts).
export function radialHatch(ctx, clipFn, cx, cy, r0, r1, o = {}) {
  const { count = 120, width = 1.2, seed = 5, color = INK, alpha = 1, gap = 0.2 } = o;
  const r = rng(seed);
  ctx.save();
  if (clipFn) { ctx.beginPath(); clipFn(ctx); ctx.clip(); }
  ctx.strokeStyle = color; ctx.lineCap = "round"; ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    if (r() < gap) continue;
    const a = (i / count) * Math.PI * 2 + (r() - 0.5) * 0.03;
    const a0 = r0 + (r1 - r0) * r() * 0.3, a1 = r1 - (r1 - r0) * r() * 0.2;
    ctx.lineWidth = width * (0.6 + r() * 0.8);
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * a0, cy + Math.sin(a) * a0); ctx.lineTo(cx + Math.cos(a) * a1, cy + Math.sin(a) * a1); ctx.stroke();
  }
  ctx.restore();
}

// Cache a static drawing at a supersample factor. draw(ctx) paints in frame coordinates.
const caches = new Map();
export function cached(key, W, H, scale, draw) {
  let c = caches.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = Math.round(W * scale); c.height = Math.round(H * scale);
    const g = c.getContext("2d");
    g.scale(scale, scale);
    draw(g);
    c.__scale = scale;
    caches.set(key, c);
  }
  return c;
}
// Draw a cached layer back in frame coordinates under the current transform.
export function blit(ctx, c) {
  ctx.drawImage(c, 0, 0, c.width / c.__scale, c.height / c.__scale);
}
