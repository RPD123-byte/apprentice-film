// s06 drawing helpers: tapered ink lines, hair ribbons, form-following hatching. All seeded (no boiling).
import { taper } from "../../lib/ink.js";
import { sampleCurve, smoothPath } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

export const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
export const blob = (pts) => (c) => smoothPath(c, pts, true);
export const gv = (v, a = 1) => { const c = Math.round(Math.max(0, Math.min(1, v)) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };

// A swelling ink line through control points: thin ends, full middle. `a` = end width fraction, `bias` shifts the peak.
export function line(g, pts, w, color, { per = 6, a = 0.25, pow = 0.6, bias = 0.5, tail = 1 } = {}) {
  if (pts.length < 2) return;
  const q = pts.length === 2 ? [pts[0], [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], pts[1]] : pts;
  const s = sampleCurve(q, per);
  taper(g, s, (u) => {
    const v = u < bias ? u / bias * 0.5 : 0.5 + (u - bias) / (1 - bias) * 0.5;
    const k = Math.pow(Math.sin(Math.PI * v), pow);
    return w * (a + (1 - a) * k) * (u > bias ? 1 - (1 - tail) * (u - bias) / (1 - bias) : 1);
  }, color);
}
// Width from w0 (start) to w1 (end) along the spine; `ease` bends the profile.
export function ribbon(g, pts, w0, w1, color, { per = 8, ease = 1 } = {}) {
  const s = sampleCurve(pts, per);
  taper(g, s, (u) => w0 + (w1 - w0) * Math.pow(u, ease), color);
}
// A ribbon that tapers at both ends (a hair lock or a fold), peak at `peak`.
export function lock(g, pts, w, color, { per = 8, peak = 0.3, end = 0.02, start = 0.35 } = {}) {
  const s = sampleCurve(pts, per);
  taper(g, s, (u) => (u < peak ? w * (start + (1 - start) * Math.sin((Math.PI / 2) * u / peak)) : w * (end + (1 - end) * Math.pow(Math.cos((Math.PI / 2) * (u - peak) / (1 - peak)), 0.9))), color);
}

// Hatching: short, slightly curved parallel strokes inside a clip. dir(x,y) -> angle (rad); dens(x,y) -> 0..1 (stroke
// kept with that probability, and its length scales with it). Strokes are placed on a jittered grid across the stroke
// direction so they read as rows of engraving, not noise.
export function hatch(g, clip, box, { dir = () => 0.8, dens = () => 1, sp = 5, len = 40, w = 1.1, color = "rgba(20,20,20,0.85)", seed = 1, bend = 0.08, jit = 0.35, lenJit = 0.5, taperEnd = 0.15 } = {}) {
  const r = rng(seed);
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + len;
  // rows run along the stroke direction at the box centre, stacked `sp` apart across it
  const a0 = dir(cx, cy), tx = Math.cos(a0), ty = Math.sin(a0), nx = -ty, ny = tx;
  g.save();
  if (clip) { g.beginPath(); clip(g); g.clip(); }
  g.fillStyle = color;
  let row = 0;
  for (let v = -R; v < R; v += sp, row++) {
    for (let u = -R + (row % 2) * len * 0.45; u < R; u += len * 0.9) {
      const uu = u + (r() - 0.5) * len * 0.5, vv = v + (r() - 0.5) * sp * jit;
      const px = cx + tx * uu + nx * vv, py = cy + ty * uu + ny * vv;
      if (px < x0 - len || px > x1 + len || py < y0 - len || py > y1 + len) { r(); r(); r(); r(); continue; }
      const d = dens(px, py);
      if (d <= 0 || r() > d) { r(); r(); r(); continue; }
      const a = dir(px, py) + (r() - 0.5) * 0.08;
      const L = len * (1 - lenJit * r()) * (0.5 + 0.5 * d);
      const ca = Math.cos(a), sa = Math.sin(a), b = (r() - 0.5) * 2 * bend * L;
      const pts = [[px - ca * L / 2, py - sa * L / 2], [px - sa * b, py + ca * b], [px + ca * L / 2, py + sa * L / 2]];
      const ww = w * (0.7 + 0.6 * r());
      taper(g, sampleCurve(pts, 4), (q) => ww * (taperEnd + (1 - taperEnd) * Math.pow(Math.sin(Math.PI * q), 0.7)), color);
    }
  }
  g.restore();
}

// Rows of strokes that leave a curve at an angle (lashes, brows, fringes). side = +1/-1 picks the normal.
export function comb(g, pts, { step = 4, len = 10, ang = 0, side = 1, w = 1.2, color = "#1a1a1a", seed = 3, lenJ = 0.5, per = 10, from = 0, to = 1 } = {}) {
  const r = rng(seed);
  const s = sampleCurve(pts, per);
  // arc-length param
  const acc = [0]; for (let i = 1; i < s.length; i++) acc.push(acc[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
  const T = acc[acc.length - 1];
  let j = 0;
  for (let d = from * T; d <= to * T; d += step * (0.7 + 0.6 * r())) {
    while (j < acc.length - 2 && acc[j + 1] < d) j++;
    const f = (d - acc[j]) / Math.max(1e-6, acc[j + 1] - acc[j]);
    const p = [s[j][0] + (s[j + 1][0] - s[j][0]) * f, s[j][1] + (s[j + 1][1] - s[j][1]) * f];
    let tx = s[j + 1][0] - s[j][0], ty = s[j + 1][1] - s[j][1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const nx = -ty * side, ny = tx * side;
    const u = d / T;
    const A = (typeof ang === "function" ? ang(u) : ang) + (r() - 0.5) * 0.15;
    const dx = nx * Math.cos(A) - ny * Math.sin(A), dy = nx * Math.sin(A) + ny * Math.cos(A);
    const L = (typeof len === "function" ? len(u) : len) * (1 - lenJ * r());
    const ww = (typeof w === "function" ? w(u) : w) * (0.7 + 0.6 * r());
    taper(g, [p, [p[0] + dx * L * 0.5 + tx * L * 0.05, p[1] + dy * L * 0.5 + ty * L * 0.05], [p[0] + dx * L, p[1] + dy * L]], (q) => ww * (1 - q * 0.9), color);
  }
}

// Scatter of short strokes in an ellipse (stubble, pores, knit flecks).
export function flecks(g, cx, cy, rx, ry, n, { ang = 1.4, angJ = 0.6, len = 7, w = 1.1, color = "rgba(30,30,30,0.7)", seed = 7, dens = () => 1 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r());
    const x = cx + Math.cos(a) * rx * rr, y = cy + Math.sin(a) * ry * rr;
    const k = r(); if (k > dens(x, y)) continue;
    const A = ang + (r() - 0.5) * angJ, L = len * (0.5 + r() * 0.8);
    taper(g, [[x, y], [x + Math.cos(A) * L * 0.5, y + Math.sin(A) * L * 0.5], [x + Math.cos(A) * L, y + Math.sin(A) * L]], (q) => w * (1 - q * 0.8), color);
  }
}

// Soft tone inside a clip: a blurred shape (value shading under the line work).
export function soft(g, clip, shape, color, blur) {
  g.save();
  if (clip) { g.beginPath(); clip(g); g.clip(); }
  g.filter = `blur(${blur}px)`;
  g.fillStyle = color; g.beginPath(); shape(g); g.fill();
  g.filter = "none";
  g.restore();
}

export function mk(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }

// A line whose width is given per control point (interpolated along the curve).
export function vline(g, pts, ws, color, per = 6) {
  const s = sampleCurve(pts, per);
  const n = ws.length;
  taper(g, s, (u) => { const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), k = f - i; return ws[i] + (ws[i + 1] - ws[i]) * k; }, color);
}
// Resample a curve to n points evenly spaced by arc length.
export function resampleCurve(P, n, per = 10) {
  const s = sampleCurve(P, per);
  const acc = [0]; for (let i = 1; i < s.length; i++) acc.push(acc[i - 1] + Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]));
  const T = acc[acc.length - 1], out = []; let j = 0;
  for (let k = 0; k < n; k++) { const d = (k / (n - 1)) * T; while (j < acc.length - 2 && acc[j + 1] < d) j++; const f = (d - acc[j]) / Math.max(1e-6, acc[j + 1] - acc[j]); out.push([s[j][0] + (s[j + 1][0] - s[j][0]) * f, s[j][1] + (s[j + 1][1] - s[j][1]) * f]); }
  return out;
}
// Strokes that follow a band between two curves A (f=0) and B (f=1): n rows, each broken into segments.
// alpha(u, f) and w(u, f) shape the tone; u runs 0..1 along the band.
export function bandStrokes(g, A, B, { n = 6, w = () => 1.2, alpha = () => 0.5, seg = [0.15, 0.4], gap = 0.25, seed = 1, jit = 1, color = "20,20,20", from = 0, to = 1 } = {}) {
  const r = rng(seed);
  const K = 60, a = resampleCurve(A, K), b = resampleCurve(B, K);
  for (let k = 0; k < n; k++) {
    const f = (k + 0.3 + 0.4 * r()) / n;
    let u = from + r() * seg[0] * 0.5 * (to - from);
    while (u < to) {
      const L = seg[0] + r() * (seg[1] - seg[0]);
      const u1 = Math.min(to, u + L);
      if (r() > gap) {
        const pts = [];
        const i0 = Math.round(u * (K - 1)), i1 = Math.round(u1 * (K - 1));
        const dj = (r() - 0.5) * jit * 2;
        for (let i = i0; i <= i1; i++) pts.push([a[i][0] + (b[i][0] - a[i][0]) * f, a[i][1] + (b[i][1] - a[i][1]) * f + dj]);
        if (pts.length >= 2) {
          const um = (u + u1) / 2, A0 = alpha(um, f), W0 = w(um, f);
          if (A0 > 0.01) taper(g, pts, (q) => W0 * (0.15 + 0.85 * Math.pow(Math.sin(Math.PI * q), 0.6)), `rgba(${color},${Math.min(1, A0)})`);
        }
      }
      u = u1 + r() * 0.04;
    }
  }
}
