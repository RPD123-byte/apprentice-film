// s14 round 3: the lit room (storage corridor of boxes and gear), drawn in Canvas2D as flat layers in R40
// coordinates (the 40.00 s source frame). Geometry: s14/geo3.js (traced on labelled grids of that frame). Tones:
// s14/tone3.js, one linear value gradient per face fitted to the source (trace3/tone3.py; pre-grade values).
// Every face is drawn as the source paints it: an ink-wash tone, dry-brush streaks along its grain, charcoal
// gathered at its edges, a dark ink contour. Each layer then rides its own inverse-depth plane in s14/gl3.js.
import { GEO } from "./geo3.js";
import { TONE3 } from "./tone3.js";
import { rng, hash } from "../../lib/rng.js";

const PI = Math.PI, D2R = PI / 180;
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const gv = (v, a = 1) => { const c = Math.round(cl(v) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a.toFixed(3)})`; };
const seedOf = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0; };

// ---------------------------------------------------------------- shapes
export function ptsOf(sh, n = 72) {
  if (Array.isArray(sh)) return sh;
  const [cx, cy, rx, ry, rot] = sh.e, c = Math.cos(rot), s = Math.sin(rot), out = [];
  for (let i = 0; i < n; i++) { const a = (2 * PI * i) / n, x = rx * Math.cos(a), y = ry * Math.sin(a); out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
}
const pathOf = (g, P, closed = true) => { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); if (closed) g.closePath(); };
function bboxOf(P) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; }
function centroid(P) { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; }
function area(P) { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; }
export function inPoly(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; }

// ---------------------------------------------------------------- tone: v(p) = v + gx (x - cx) + gy (y - cy)
function toneOf(name, P, dflt, fixed = false) {
  const T = fixed ? null : TONE3[name];
  const c = centroid(P);
  if (!T) return { v: dflt, gx: 0, gy: 0, c, tex: 1, brush: 1 };
  return { v: T[0], gx: T[1], gy: T[2], c: T.length > 4 ? [T[3], T[4]] : c, tex: T[5] ?? 1, brush: T[6] ?? 1 };
}
function toneFill(g, P, t, k = 1) {
  const gm = Math.hypot(t.gx, t.gy);
  if (gm < 1e-5) { g.fillStyle = gv(t.v * k); return; }
  const ux = t.gx / gm, uy = t.gy / gm;
  let lo = 1e9, hi = -1e9;
  for (const [x, y] of P) { const s = (x - t.c[0]) * ux + (y - t.c[1]) * uy; lo = Math.min(lo, s); hi = Math.max(hi, s); }
  const G = g.createLinearGradient(t.c[0] + ux * lo, t.c[1] + uy * lo, t.c[0] + ux * hi, t.c[1] + uy * hi);
  // several stops so the clamp at 0/1 lands where it should
  for (let i = 0; i <= 6; i++) { const f = i / 6, s = lo + (hi - lo) * f; G.addColorStop(f, gv((t.v + gm * s) * k)); }
  g.fillStyle = G;
}

// ---------------------------------------------------------------- marks
// a dry-brush streak: a slightly bent tapered line
function streak(g, x, y, ang, len, w, col, r) {
  const c = Math.cos(ang), s = Math.sin(ang), bend = (r() - 0.5) * 0.08 * len;
  const n = Math.max(3, Math.round(len / 6));
  g.strokeStyle = col;
  // tapered: three passes of decreasing width over shrinking spans
  for (const [f, k] of [[1, 0.45], [0.75, 0.8], [0.45, 1]]) {
    g.lineWidth = w * k;
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const u = (i / n - 0.5) * f, px = x + c * u * len - s * bend * (1 - 4 * u * u), py = y + s * u * len + c * bend * (1 - 4 * u * u);
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.stroke();
  }
}
// fibers: the dry-brush grain. Lanes across the face (spacing sp, perpendicular to the grain); along each lane,
// strokes of random length, gap, width and darkness, a few light ones. Returns nothing; its mean darkening is
// fiberDark(opts) (the face's base tone is lifted by it so the face keeps its fitted mean).
const FIB = { sp: 4, seg: [10, 60], gap: [4, 30], w: [0.7, 2.2], a: [0.1, 0.45], light: 0.18, la: [0.05, 0.2], wav: 0.6 };
export function fiberDark(o) {
  const f = { ...FIB, ...o };
  const seg = (f.seg[0] + f.seg[1]) / 2, gap = (f.gap[0] + f.gap[1]) / 2, w = (f.w[0] + f.w[1]) / 2, a = (f.a[0] + f.a[1]) / 2;
  const la = (f.la[0] + f.la[1]) / 2;
  return Math.min(0.85, (w / f.sp) * (seg / (seg + gap)) * ((1 - f.light) * a - f.light * la * 0.5));
}
function fibers(g, P, r, o) {
  const f = { ...FIB, ...o };
  const [x0, y0, x1, y1] = bboxOf(P);
  const a = (f.ang ?? 90) * D2R, c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 2;
  g.lineCap = "round";
  for (let o2 = -R; o2 <= R; o2 += f.sp * (0.7 + 0.6 * r())) {
    let u = -R - r() * f.seg[1];
    const lw = (r() - 0.5) * f.wav;          // this lane's small tilt
    while (u < R) {
      const L = f.seg[0] + (f.seg[1] - f.seg[0]) * r();
      const isL = r() < f.light;
      const al = isL ? f.la[0] + (f.la[1] - f.la[0]) * r() : f.a[0] + (f.a[1] - f.a[0]) * r() * r();
      const w = f.w[0] + (f.w[1] - f.w[0]) * r() * r();
      const px = cx + nx * o2 + c * u, py = cy + ny * o2 + s * u;
      const qx = px + c * L + nx * lw * L * 0.05, qy = py + s * L + ny * lw * L * 0.05;
      const col = isL ? "245,245,245" : "0,0,0";
      // soft: a wide faint pass and a narrow core, both tapering at the ends
      g.strokeStyle = `rgba(${col},${(al * 0.4).toFixed(3)})`; g.lineWidth = w * 1.8;
      g.beginPath(); g.moveTo(px + c * L * 0.08, py + s * L * 0.08); g.lineTo(qx - c * L * 0.08, qy - s * L * 0.08); g.stroke();
      g.strokeStyle = `rgba(${col},${al.toFixed(3)})`; g.lineWidth = w * 0.8;
      g.beginPath(); g.moveTo(px + c * L * 0.2, py + s * L * 0.2); g.lineTo(qx - c * L * 0.2, qy - s * L * 0.2); g.stroke();
      u += L + f.gap[0] + (f.gap[1] - f.gap[0]) * r();
    }
  }
}
// broad dry-brush streaks (the source's charcoal drags): wide soft strokes along the grain, mostly dark, a few light;
// k scales their opacity (per-face brush gain x the face's darkness)
const BR = { sp: 16, seg: [40, 170], gap: [20, 120], w: [3, 13], a: [0.12, 0.55], light: 0.22, la: [0.05, 0.22] };
export function brushDark(k, o = {}) {
  const f = { ...BR, ...o };
  const seg = (f.seg[0] + f.seg[1]) / 2, gap = (f.gap[0] + f.gap[1]) / 2, w = (f.w[0] + f.w[1]) / 2;
  const a = Math.min(0.95, k * (f.a[0] + f.a[1]) / 2), la = Math.min(0.9, k * (f.la[0] + f.la[1]) / 2);
  return Math.min(0.6, (w / f.sp) * (seg / (seg + gap)) * ((1 - f.light) * a - f.light * la * 0.6));
}
function brushes(g, P, r, k, o = {}) {
  const f = { ...BR, ...o };
  const [x0, y0, x1, y1] = bboxOf(P);
  const a = (f.ang ?? 90) * D2R, c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 2;
  g.lineCap = "round";
  for (let o2 = -R; o2 <= R; o2 += f.sp * (0.5 + r())) {
    let u = -R - r() * f.seg[1];
    while (u < R) {
      const L = f.seg[0] + (f.seg[1] - f.seg[0]) * r();
      const isL = r() < f.light;
      const al = Math.min(0.95, k * (isL ? f.la[0] + (f.la[1] - f.la[0]) * r() : f.a[0] + (f.a[1] - f.a[0]) * r()));
      const w = f.w[0] + (f.w[1] - f.w[0]) * r();
      const off = (r() - 0.5) * f.sp * 0.6;
      const px = cx + nx * (o2 + off) + c * u, py = cy + ny * (o2 + off) + s * u;
      const bend = (r() - 0.5) * 0.04 * L;
      const col = isL ? "240,240,240" : "0,0,0";
      // soft edges: three nested passes; the stroke thins toward its tail (dry brush)
      for (const [kw, ka, k0, k1] of [[1.5, 0.25, 0.02, 0.9], [1, 0.45, 0.06, 0.8], [0.55, 0.6, 0.1, 0.6]]) {
        g.strokeStyle = `rgba(${col},${(al * ka).toFixed(3)})`; g.lineWidth = w * kw;
        g.beginPath();
        g.moveTo(px + c * L * k0, py + s * L * k0);
        g.quadraticCurveTo(px + c * L * 0.5 + nx * bend, py + s * L * 0.5 + ny * bend, px + c * L * k1, py + s * L * k1);
        g.stroke();
      }
      u += L + f.gap[0] + (f.gap[1] - f.gap[0]) * r();
    }
  }
}
// charcoal streak tiles (round 3, pass 2): seamless 512 px tiles of anisotropic value noise, stretched along x
// (the grain), thresholded into soft streaks. Dark streaks in alpha (black), light streaks separately (white).
// Faces are filled with them through a rotated pattern, so the marks are continuous and irregular like dragged
// charcoal instead of discrete strokes. Stats (mean alpha) let the base tone be lifted to keep the fitted mean.
const TILE = 512;
let TILES = null;
function periodicNoise(r, nx, ny) {
  const g = new Float32Array(nx * ny); for (let i = 0; i < g.length; i++) g[i] = r();
  return (x, y) => {   // x in [0, nx), y in [0, ny), periodic
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const x0 = ((ix % nx) + nx) % nx, y0 = ((iy % ny) + ny) % ny, x1 = (x0 + 1) % nx, y1 = (y0 + 1) % ny;
    const a = g[y0 * nx + x0], b = g[y0 * nx + x1], c = g[y1 * nx + x0], d = g[y1 * nx + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
function makeTile(seed, octs, lo, hi) {
  // octs: [[cells along x, cells along y, weight], ...] (cells along y >> along x: streaks along x)
  const r = rng(seed), N = octs.map(([cx, cy]) => periodicNoise(r, cx, cy));
  const c = mk(TILE, TILE), g = c.getContext("2d"), im = g.createImageData(TILE, TILE), D = im.data;
  let sum = 0, wsum = 0; for (const o of octs) wsum += o[2];
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    let n = 0;
    for (let k = 0; k < octs.length; k++) n += N[k]((x / TILE) * octs[k][0], (y / TILE) * octs[k][1]) * octs[k][2];
    n /= wsum;
    const t = cl((n - lo) / (hi - lo)), a = t * t * (3 - 2 * t);
    const i = (y * TILE + x) * 4; D[i] = D[i + 1] = D[i + 2] = 0; D[i + 3] = Math.round(a * 255); sum += a;
  }
  g.putImageData(im, 0, 0);
  return { c, mean: sum / (TILE * TILE) };
}
function tiles() {
  if (TILES) return TILES;
  TILES = {
    // fine dry-brush: streaks ~40-120 px long, 1-3 px wide
    fine: makeTile(901, [[7, 170, 0.5], [14, 340, 0.3], [4, 90, 0.2]], 0.55, 0.8),
    // broad drags: 80-250 px long, 5-15 px wide, with gaps
    broad: makeTile(902, [[4, 70, 0.5], [8, 140, 0.3], [16, 280, 0.2]], 0.6, 0.85),
    // light streaks (scratched highlights)
    light: makeTile(903, [[5, 180, 0.6], [10, 360, 0.4]], 0.72, 0.9),
  };
  return TILES;
}
function streakFill(g, P, tile, ang, alpha, white = false, sc = 1) {
  if (alpha <= 0.003) return;
  const T = tiles()[tile];
  let src = T.c;
  if (white) {
    if (!T.w) { T.w = mk(TILE, TILE); const wg = T.w.getContext("2d"); wg.drawImage(T.c, 0, 0); wg.globalCompositeOperation = "source-in"; wg.fillStyle = "#f2f2f2"; wg.fillRect(0, 0, TILE, TILE); }
    src = T.w;
  }
  const pat = g.createPattern(src, "repeat");
  const c = centroid(P), a = ang * D2R;
  pat.setTransform(new DOMMatrix().translate(c[0], c[1]).rotate(ang).scale(sc, sc).translate(-c[0] * 0.37, -c[1] * 0.53));
  g.save(); g.globalAlpha = Math.min(1, alpha); g.fillStyle = pat; pathOf(g, P); g.fill(); g.restore();
}
// soft cloudy mottle: big blurred blobs of lighter/darker tone
function mottle(g, P, r, amt = 0.08, size = 40) {
  const [x0, y0, x1, y1] = bboxOf(P), A = area(P);
  const n = Math.max(2, Math.round(A / (size * size) * 1.2));
  g.save();
  g.filter = `blur(${(size * 0.35).toFixed(1)}px)`;
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), rr = size * (0.4 + 0.8 * r());
    g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${(amt * (0.5 + r())).toFixed(3)})` : `rgba(255,255,255,${(amt * 0.8 * (0.5 + r())).toFixed(3)})`;
    g.beginPath(); g.ellipse(x, y, rr, rr * (0.6 + 0.6 * r()), r() * PI, 0, 2 * PI); g.fill();
  }
  g.restore();
}
// the direction (deg) of a polygon's longest edge (scratchboard strokes follow it)
function longEdge(P) {
  let best = 0, ang = 90;
  for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (l > best) { best = l; ang = Math.atan2(q[1] - p[1], q[0] - p[0]) / D2R; }
  }
  return ang;
}
// irregular wash blotches (fix pass 2): soft-edged polygons of darker and lighter wash, a few per face
function blotches(g, P, r, amt) {
  const [x0, y0, x1, y1] = bboxOf(P), A = area(P);
  const n = Math.max(2, Math.round(A / 1400));
  g.save();
  for (let i = 0; i < n; i++) {
    const cx = x0 + r() * (x1 - x0), cy = y0 + r() * (y1 - y0), rr = 6 + 22 * r(), k = 5 + Math.floor(r() * 4);
    g.filter = `blur(${(2 + 5 * r()).toFixed(1)}px)`;
    const dark = r() < 0.65;
    g.fillStyle = dark ? `rgba(0,0,0,${(amt * (0.6 + 0.8 * r())).toFixed(3)})` : `rgba(250,250,245,${(amt * 0.7 * (0.5 + r())).toFixed(3)})`;
    g.beginPath();
    for (let j = 0; j < k; j++) {
      const a = (j / k) * 2 * PI + r() * 0.5, q = rr * (0.5 + 0.7 * r());
      const x = cx + Math.cos(a) * q * 1.3, y = cy + Math.sin(a) * q;
      if (j) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath(); g.fill();
  }
  g.restore();
}
// charcoal gathered along the inside of the edges
function edgeDark(g, P, wdt, a) {
  if (a <= 0) return;
  g.save();
  g.filter = `blur(${(wdt * 0.5).toFixed(1)}px)`;
  g.strokeStyle = `rgba(0,0,0,${a})`; g.lineWidth = wdt; g.lineJoin = "round";
  pathOf(g, P); g.stroke();
  g.restore();
}
// parallel pen hatching (shadows)
export function hatch(g, P, ang, sp, w, a, r, jit = 0.3) {
  const [x0, y0, x1, y1] = bboxOf(P);
  const c = Math.cos(ang * D2R), s = Math.sin(ang * D2R), nx = -s, ny = c;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
  g.strokeStyle = `rgba(0,0,0,${a})`; g.lineCap = "round";
  for (let o = -R; o <= R; o += sp * (0.8 + 0.4 * r())) {
    const l0 = -R + r() * R * jit, l1 = R - r() * R * jit;
    g.lineWidth = w * (0.6 + 0.8 * r());
    g.beginPath(); g.moveTo(cx + nx * o + c * l0, cy + ny * o + s * l0); g.lineTo(cx + nx * o + c * l1, cy + ny * o + s * l1); g.stroke();
  }
}
// hand cross-hatching (r3 fix 1): pen strokes in lanes across the face (spacing sp, perpendicular to ang), each
// lane broken into strokes of random length with small gaps, a slight bend, varying width and ink. Returns the mean
// darkening it adds (so the face's base tone can be lifted to keep its fitted mean).
export function xhatch(g, P, ang, sp, w, a, r, o = {}) {
  if (a <= 0.004) return 0;
  const [x0, y0, x1, y1] = bboxOf(P);
  const c = Math.cos(ang * D2R), s = Math.sin(ang * D2R), nx = -s, ny = c;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
  const seg = o.seg || [14, 46], gap = o.gap || [1.5, 9];
  g.lineCap = "round";
  const jt = o.jit ?? 0.25;
  for (let off = -R + r() * sp; off <= R; off += sp * (1 - jt + 2 * jt * r())) {
    let u = -R - r() * seg[1];
    while (u < R) {
      const L = seg[0] + (seg[1] - seg[0]) * r();
      const al = a * (0.45 + 0.75 * r());
      const bend = (r() - 0.5) * 0.06 * L, lw = w * (0.6 + 0.8 * r());
      const px = cx + nx * off + c * u, py = cy + ny * off + s * u;
      g.strokeStyle = `rgba(${o.col || "0,0,0"},${Math.min(1, al).toFixed(3)})`; g.lineWidth = lw;
      g.beginPath(); g.moveTo(px, py);
      g.quadraticCurveTo(px + c * L * 0.5 + nx * bend, py + s * L * 0.5 + ny * bend, px + c * L, py + s * L);
      g.stroke();
      u += L + gap[0] + (gap[1] - gap[0]) * r();
    }
  }
  const sm = (seg[0] + seg[1]) / 2, gm = (gap[0] + gap[1]) / 2;
  return Math.min(0.9, a * 0.85 * Math.min(1, w / sp) * (sm / (sm + gm)));
}
// stipple and a faint printed checker (the source's cardboard: soft washes, sparse dots, a worn check print)
function stipple(g, P, r, dens, a) {
  const [x0, y0, x1, y1] = bboxOf(P), n = Math.round(area(P) * dens);
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), rr = 0.5 + 1.1 * r() * r();
    g.fillStyle = r() < 0.8 ? `rgba(0,0,0,${(a * (0.4 + 0.6 * r())).toFixed(3)})` : `rgba(240,240,240,${(a * 0.6 * r()).toFixed(3)})`;
    g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
  }
}
function checker(g, P, r, cell, a, ang = 0) {
  const [x0, y0, x1, y1] = bboxOf(P), c = centroid(P);
  g.save(); g.translate(c[0], c[1]); g.rotate(ang * D2R);
  const R = Math.hypot(x1 - x0, y1 - y0) / 2 + cell;
  for (let y = -R; y < R; y += cell) for (let x = -R; x < R; x += cell) {
    const k = (Math.round((x + R) / cell) + Math.round((y + R) / cell)) & 1;
    if (!k) continue;
    g.fillStyle = `rgba(0,0,0,${(a * (0.5 + r())).toFixed(3)})`; g.fillRect(x, y, cell * 0.92, cell * 0.92);
  }
  g.restore();
}
// (r3 fix 1: frame means sat 2-3 luma under the source after the per-face fits: the ink contours a touch finer)
export const INKW = { k: 0.52, a: 0.68 };
// ink contour: dark line along the polygon (a soft wide pass under a crisp one)
export function ink(g, P, w, a = 0.9, closed = true) {
  if (w <= 0) return;
  g.save(); g.lineJoin = "round"; g.lineCap = "round";
  // (round 3 fit: the source's contours are finer than the first pass drew them; the edges of every face averaged
  // 44 luma against the source's 90 at 40.40)
  w *= INKW.k;
  g.strokeStyle = `rgba(0,0,0,${(a * 0.22).toFixed(3)})`; g.lineWidth = w * 1.6; pathOf(g, P, closed); g.stroke();
  g.strokeStyle = `rgba(0,0,0,${a.toFixed(3)})`; g.lineWidth = w; pathOf(g, P, closed); g.stroke();
  g.restore();
}

// (fix pass 2) look constants: wash blotches on light cardboard, the stacked boxes' dark seams
export const LOOK2 = { blot: 0.06, seam: 2, seamA: 0.8, edge: 0.25 };
// ---------------------------------------------------------------- materials
const MAT = {
  dark: { v: 0.05, o: 0, edge: 0, tmax: 1.2, bmax: 0.8, fib: { sp: 6, seg: [20, 90], gap: [10, 60], w: [1, 3], a: [0.1, 0.4], light: 0.25, la: [0.03, 0.1] } },
  card: { v: 0.45, o: 2.4, edge: [7, 0.24], plaid: 1, mottle: [0.08, 34], fib: { sp: 6, seg: [20, 110], gap: [6, 50], w: [1, 4], a: [0.1, 0.5], light: 0.15, la: [0.04, 0.14] } },
  wood: { v: 0.4, o: 2.2, edge: [5, 0.22], plaid: 1, mottle: [0.05, 30], fib: { sp: 3, seg: [20, 110], gap: [3, 25], w: [0.6, 2.2], a: [0.12, 0.6], light: 0.25, la: [0.08, 0.3] } },
  dev: { v: 0.7, o: 2.2, edge: [4, 0.25], mottle: [0.05, 24], fib: { sp: 6, seg: [6, 30], gap: [10, 50], w: [0.6, 1.6], a: [0.06, 0.25], light: 0.2, la: [0.05, 0.12] } },
  glass: { v: 0.03, o: 2.6, edge: 0 },
  stack: { v: 0.25, o: 1.6, edge: [5, 0.3] },
  books: { v: 0.15, o: 1.6, edge: [5, 0.3] },
  keys: { v: 0.85, o: 1.6, edge: 0 },
  ring: { v: 0.12, o: 2.6, edge: 0 },
  surround: { v: 0.06, o: 2.4, edge: 0 },
  cone: { v: 0.55, o: 2.8, edge: [8, 0.3] },
  cap: { v: 0.08, o: 2.4, edge: 0 },
  lit: { v: 0.95, o: 0, edge: 0 },
  screen: { v: 0.3, o: 1.6, edge: [6, 0.35], mottle: [0.08, 20] },
  ceil: { v: 0.1, o: 0, edge: 0 },
  floor: { v: 0.3, o: 0, edge: 0 },
  // (fix pass 2) the groovebox's knobs (dark, a lit rim on the lamp side) and pill buttons: fixed tones
  knob: { v: 0.1, o: 1.3, edge: 0, fixed: 1 },
  btn: { v: 0.45, o: 1.1, edge: 0, fixed: 1 },
};
// the corridor's vanishing point (floor rays, ceiling planks)
export const VP = [1104.5, 642.9];

function drawItem(g, name, e) {
  const [L, sh, opt = {}] = e;
  const m = MAT[opt.m] || MAT.card;
  const P = ptsOf(sh);
  const r = rng(seedOf(name));
  if (opt.open) { // ink line / cable
    if (opt.m === "cable") return cable(g, P, opt, r);
    if (opt.m === "hl") {
      g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.filter = "blur(1px)";
      g.strokeStyle = `rgba(236,236,236,${opt.al ?? 0.4})`; g.lineWidth = opt.w ?? 3; pathOf(g, P, false); g.stroke();
      g.restore();
      return;
    }
    ink(g, P, opt.w ?? 2, opt.al ?? 0.9, false);
    return;
  }
  const t = toneOf(name, P, opt.v ?? m.v, !!(opt.fix || m.fixed));
  let ang = opt.a ?? 90;
  if (opt.m === "floor") { const c = centroid(P); ang = Math.atan2(VP[1] - c[1], VP[0] - c[0]) / D2R; }
  // the marks follow the face's darkness: lit faces are clean washes, shadowed faces carry heavy dry-brush
  // streaks (and a plaid of hatching when deep); t.tex is the per-face gain fitted to the source's high-pass energy
  // streak opacities: fine dry-brush (texture gain) and broad drags (brush gain), heavier on shadowed faces
  const TL = tiles(), textured = !!m.fib && opt.fib !== 0;
  // (r3 fix 1: the fitted texture gains ran to their caps on dark backgrounds, where the source's energy is real
  // detail (cables, boards), and every face read as brushed metal; the streaks are thinned and capped, shadowed faces
  // get pen cross-hatching instead, cardboard gets soft washes with stipple)
  const tmax = opt.tmax ?? m.tmax ?? 4, bmax = opt.bmax ?? m.bmax ?? 5;
  const tex = Math.min(t.tex, tmax), brush = Math.min(t.brush, bmax);
  const kd = cl((0.5 - t.v) / 0.35);
  const card = opt.m === "card" || !opt.m;
  let af = textured ? 0.55 * cl((0.7 - t.v) / 0.45, 0.2, 1) * tex * (1 - 0.7 * kd) * (card ? 0.55 : 1) : 0;
  let ab = textured && opt.m !== "floor" ? 0.6 * cl((0.8 - t.v) / 0.5, 0.15, 1) * brush * (card ? 0.4 : 0.8) : 0;
  const al = textured ? 0.25 * Math.min(1.5, tex) * cl(t.v / 0.4, 0.3, 1) : 0;
  af = Math.min(0.9, af); ab = Math.min(0.9, ab);
  const xw = opt.xw ?? 0.9, xsp = opt.xsp ?? 3.6;
  // pen hatching: heavy on shadowed faces, a light single-direction layer on mid-toned cardboard and wood too (the
  // source hatches its lit box faces lightly as well)
  const km = cl((0.8 - t.v) / 0.4);
  // scratchboard (the look's rule: white line on deep black): the darkest faces print as near-black with pale pen
  // hatching carrying their tone, not as grey with black hatching (the dolly's darks sat at p10 10-12 vs 5)
  // (fix pass 2: review 2 found the shadowed faces' even two-direction pale mesh reading as a screen door and the
  // near-black fraction 0.08-0.10 against the source's 0.12-0.15: faces under ~0.35 are now a near-black base
  // (0.04-0.13) with sparse single-direction pale strokes along the face's long edge, spacing and length jittered per
  // face; the black hatching of mid faces is one family only)
  const sb = textured && opt.xh !== 0 ? cl((0.36 - t.v) / 0.1) : 0;
  const ah = textured && opt.xh !== 0 ? (1 - sb) * Math.min(0.8, 0.5 * kd * Math.min(2, tex) + (card || opt.m === "wood" ? 0.16 * km : 0)) : 0;
  const vb = 0.04 + 0.5 * Math.max(0, t.v - 0.12);
  const sbc = sb > 0 ? Math.max(0, t.v - vb) / (0.85 - vb) : 0;
  const SBK = 0.212;                         // pale stroke coverage per unit alpha (sp 4.2, w 1.3, seg 20-80, gap 4-20)
  const sba = sb * Math.min(1, sbc / SBK);
  const hd = (a) => Math.min(0.9, a * 0.85 * Math.min(1, xw / xsp) * (30 / 35.25));
  const stp = textured && card ? 0.3 * cl(1.2 - t.v) : 0;
  const dk = () => 1 - (1 - af * TL.fine.mean) * (1 - ab * TL.broad.mean) * (1 - hd(ah)) * (1 - stp * 0.012);
  let lift = 1 / Math.max(0.2, 1 - dk() + al * TL.light.mean * 0.5);
  if (sb > 0) lift = (1 - sb) * lift + sb * vb / Math.max(0.02, t.v);
  // (a bright face cannot be lifted past white: thin its marks until its mean is reachable)
  const vmax = t.v + Math.hypot(t.gx, t.gy) * 40;
  for (let it = 0; it < 6 && vmax * lift > 0.98 && lift > 1.0; it++) { af *= 0.6; ab *= 0.6; lift = 1 / Math.max(0.2, 1 - dk() + al * TL.light.mean * 0.5); }
  // light cardboard: irregular wash blotches and charcoal gathered along the edges (-0.15 within ~12 px)
  const lc = card && textured ? cl((t.v - 0.35) / 0.15) : 0;
  g.save();
  pathOf(g, P); g.clip();
  toneFill(g, P, t, lift * (1 + 0.1 * lc)); pathOf(g, P); g.fill();
  const sp = SPECIAL[opt.m];
  if (sp) sp(g, P, t, r, opt, sh);
  if (m.mottle && opt.mottle !== 0) mottle(g, P, r, (opt.mottle ?? 1) * m.mottle[0] * (1 + 0.4 * lc), m.mottle[1]);
  if (lc > 0 && LOOK2.blot > 0) blotches(g, P, r, LOOK2.blot * lc);
  if (ab > 0) streakFill(g, P, "broad", ang, ab, false, 1 + 0.3 * r());
  if (af > 0) streakFill(g, P, "fine", ang, af, false, 0.8 + 0.4 * r());
  if (al > 0) streakFill(g, P, "light", ang, al, true, 0.9 + 0.3 * r());
  if (opt.chk) checker(g, P, r, opt.chk, 0.05, opt.chka ?? 0);
  if (stp > 0) stipple(g, P, r, 0.012, stp);
  if (sba > 0.01) {
    const la = longEdge(P);
    xhatch(g, P, la, 4.2, 1.3, sba, r, { col: "225,225,220", seg: [20, 80], gap: [4, 20], jit: 0.3 });
  }
  if (ah > 0) xhatch(g, P, ang + (opt.ha ?? 10), xsp, xw, ah, r, { jit: 0.3 });
  if (lc > 0) edgeDark(g, P, 24, LOOK2.edge * lc);
  const ed = opt.edge ?? m.edge;
  if (ed) edgeDark(g, P, ed[0], ed[1]);
  g.restore();
  const o = opt.o ?? m.o;
  if (o > 0) ink(g, P, o, (opt.oa ?? 0.85) * INKW.a);
  // (fix pass 2) the dark seams between stacked boxes: every cardboard face carries a 3.5 px near-black outline, so
  // two boxes sharing an edge print a 3.5-5 px black gap as the source's do
  if (card && opt.seam !== 0 && !opt.open) {
    g.save(); g.lineJoin = "round"; g.strokeStyle = `rgba(0,0,0,${LOOK2.seamA})`; g.lineWidth = opt.seam ?? LOOK2.seam; pathOf(g, P); g.stroke(); g.restore();
  }
}
// Catmull-Rom through the points (cables are traced as a few points; drawn as smooth curves)
function smoothPts(P, n = 8) {
  if (P.length < 3) return P;
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(P[P.length - 1]);
  return out;
}
function cable(g, P0, opt, r) {
  const P = smoothPts(P0);
  const w = opt.w ?? 6;
  g.save(); g.lineJoin = "round"; g.lineCap = "round";
  g.strokeStyle = gv(0.02, 0.95); g.lineWidth = w; pathOf(g, P, false); g.stroke();
  g.strokeStyle = gv(opt.v ?? 0.35, 0.9); g.lineWidth = w * 0.55; pathOf(g, P, false); g.stroke();
  g.strokeStyle = gv(0.9, (opt.hi ?? 0.35)); g.lineWidth = w * 0.18;
  g.translate(-w * 0.12, -w * 0.12); pathOf(g, P, false); g.stroke();
  g.restore();
}
// material specials (inside the clip, after the base tone)
const SPECIAL = {
  ceil(g, P, t, r) {
    // (r3 fix 1) the ceiling planks: dense continuous dark lines converging on the corridor's end (measured on the
    // 40.00 frame: the structure-tensor directions meet at (1170, 440)), 4-8 px apart along the top edge, with a
    // slightly lighter seam every few lines; no pale streaks (they read as rain)
    const V = [1170, 440];
    g.lineCap = "round";
    const a0 = Math.atan2(-60 - V[1], 250 - V[0]), a1 = Math.atan2(-60 - V[1], 1990 - V[0]);
    let a = a0, k = 0;
    while (a < a1) {
      const rt = (-40 - V[1]) / Math.sin(a);            // distance to the top edge along this ray
      const sp = 4 + 4 * r();                            // px at the top edge
      a += sp / Math.max(200, rt);
      k++;
      const c = Math.cos(a), s = Math.sin(a);
      const seam = k % (5 + Math.floor(r() * 4)) === 0;
      // each line: a few long strokes from low in the ceiling to past the top edge
      let u = 200 + r() * 60;
      const uEnd = rt + 30;
      while (u < uEnd) {
        const L = 60 + 160 * r(), q = Math.min(uEnd, u + L);
        const w = (0.7 + 1.1 * r()) * (u / 450);
        if (seam) { g.strokeStyle = `rgba(200,200,200,${(0.06 + 0.08 * r()).toFixed(3)})`; g.lineWidth = w * 1.4; }
        else { g.strokeStyle = `rgba(0,0,0,${(0.3 + 0.35 * r()).toFixed(3)})`; g.lineWidth = w; }
        g.beginPath(); g.moveTo(V[0] + c * u, V[1] + s * u); g.lineTo(V[0] + c * q, V[1] + s * q); g.stroke();
        u = q + (r() < 0.3 ? 4 + 10 * r() : 0);
      }
    }
  },
  keys(g, P, t, r, opt) {
    // P = [top-left, top-right, bottom-right, bottom-left]; keys are strips across the long (top -> bottom) axis;
    // opt.bs: which side the black keys sit on ("l" = the p0-p3 edge), opt.n: white keys, opt.k0: first key's note
    const [p0, p1, p2, p3] = P, n = opt.n ?? 27, k0 = opt.k0 ?? 0, bl = opt.bs !== "r";
    const L = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    const at = (u, v) => L(L(p0, p3, v), L(p1, p2, v), u);   // u across, v along
    g.lineCap = "butt";
    for (let i = 1; i < n; i++) {
      const v = i / n, a = at(0, v), b = at(1, v);
      g.strokeStyle = "rgba(0,0,0,0.55)"; g.lineWidth = 0.9; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    const has = [1, 1, 0, 1, 1, 1, 0];     // a black key after C D F G A (not E, B)
    const bw = opt.bw ?? 0.6, bd = opt.bd ?? 0.62;
    for (let i = 0; i < n - 1; i++) {
      if (!has[(k0 + i) % 7]) continue;
      const vc = (i + 1) / n, hv = (bw * 0.5) / n;
      const u0 = bl ? 0 : 1 - bd, u1 = bl ? bd : 1;
      const q = [at(u0, vc - hv), at(u1, vc - hv), at(u1, vc + hv), at(u0, vc + hv)];
      g.fillStyle = gv(opt.bv ?? 0.08); pathOf(g, q); g.fill();
      const e0 = bl ? at(u1 - 0.08, vc - hv * 0.6) : at(u0 + 0.02, vc - hv * 0.6), e1 = bl ? at(u1 - 0.02, vc + hv * 0.6) : at(u0 + 0.08, vc + hv * 0.6);
      g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(Math.min(e0[0], e1[0]), Math.min(e0[1], e1[1]), Math.abs(e1[0] - e0[0]) + 0.5, Math.abs(e1[1] - e0[1]) + 0.5);
    }
  },
  ring(g, P, t, r, opt, sh) {
    const [cx, cy, rx, ry] = sh.e;
    // the flange's lit rim on the right, dark on the left
    g.save(); g.filter = "blur(3px)";
    g.strokeStyle = "rgba(235,235,235,0.55)"; g.lineWidth = 16; g.beginPath(); g.ellipse(cx, cy, rx - 9, ry - 9, 0, -1.25, 1.35); g.stroke();
    g.strokeStyle = "rgba(0,0,0,0.5)"; g.lineWidth = 14; g.beginPath(); g.ellipse(cx, cy, rx - 9, ry - 9, 0, 1.9, 4.4); g.stroke();
    g.restore();
    for (const [x, y] of [[158, 322], [355, 372], [342, 565], [133, 555]]) {
      g.fillStyle = gv(0.03); g.beginPath(); g.ellipse(x, y, 6, 5.5, 0, 0, 7); g.fill();
      g.fillStyle = "rgba(230,230,230,0.35)"; g.beginPath(); g.arc(x - 1.5, y - 1.5, 1.6, 0, 7); g.fill();
    }
  },
  surround(g, P, t, r, opt, sh) {
    const [cx, cy, rx, ry] = sh.e;
    g.save(); g.filter = "blur(2px)";
    g.strokeStyle = "rgba(230,230,230,0.3)"; g.lineWidth = 6; g.beginPath(); g.ellipse(cx + 2, cy + 2, rx - 10, ry - 10, 0, -0.6, 1.4); g.stroke();
    g.restore();
  },
  cone(g, P, t, r, opt, sh) {
    // soft swirl strokes round the dust cap (the source's cone reads as spun), darker on the shadowed upper left
    // (r3 fix 1: the round-3 swirl read as a vortex) concentric ring contours on the spun paper, soft radial shading
    // (dark round the dust cap and toward the rim, the lamp-side lower left lit), fine concentric spin marks
    const [cx, cy, rx] = sh.e;
    g.save();
    g.filter = "blur(7px)";
    g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 18; g.beginPath(); g.arc(cx - 16, cy - 7, 56, 0, 7); g.stroke();
    g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 16; g.beginPath(); g.arc(cx, cy, rx - 6, 0, 7); g.stroke();
    g.filter = "blur(14px)";
    g.fillStyle = "rgba(245,245,245,0.16)"; g.beginPath(); g.ellipse(cx - 55, cy + 45, 48, 34, -0.7, 0, 7); g.fill();
    g.fillStyle = "rgba(0,0,0,0.14)"; g.beginPath(); g.ellipse(cx + 50, cy - 55, 50, 30, -0.7, 0, 7); g.fill();
    g.restore();
    g.lineCap = "round";
    // spin marks: short concentric arcs
    for (let i = 0; i < 260; i++) {
      const a = r() * 2 * PI, rr = 58 + r() * (rx - 64), len = (8 + 26 * r()) / rr;
      const lit = 0.5 + 0.5 * Math.cos(a - 2.3);
      g.strokeStyle = r() < 0.6 ? `rgba(0,0,0,${(0.05 + 0.12 * r()).toFixed(3)})` : `rgba(245,245,245,${(0.04 + 0.12 * r() * lit).toFixed(3)})`;
      g.lineWidth = 0.8 + 1.6 * r();
      g.beginPath(); g.arc(cx, cy, rr, a, a + len); g.stroke();
    }
    // the ring contours (a dark line and its lit lower edge)
    for (const [rr, al] of [[60, 0.55], [74, 0.4], [88, 0.35], [101, 0.4], [111, 0.5]]) {
      g.strokeStyle = `rgba(0,0,0,${al})`; g.lineWidth = 1.6; g.beginPath(); g.ellipse(cx, cy, rr, rr * 0.985, 0, 0, 7); g.stroke();
      g.strokeStyle = `rgba(240,240,240,${(al * 0.35).toFixed(3)})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(cx + 0.8, cy + 1.6, rr, rr * 0.985, 0, 0.2, 2.9); g.stroke();
    }
  },
  cap(g, P, t, r, opt, sh) {
    const [cx, cy, rx, ry] = sh.e;
    g.save(); g.filter = "blur(3px)";
    g.fillStyle = "rgba(235,235,235,0.8)"; g.beginPath(); g.ellipse(cx + 9, cy - 18, 11, 8, -0.4, 0, 7); g.fill();
    g.fillStyle = "rgba(235,235,235,0.25)"; g.beginPath(); g.ellipse(cx + 16, cy + 18, 14, 9, 0.6, 0, 7); g.fill();
    g.restore();
  },
  knob(g, P, t, r, opt, sh) {
    // a dark knob seen at an angle: a 2 px lit rim on the lamp side (lower left), a darker cap, a pale pointer tick
    const [cx, cy, rx, ry, rot] = sh.e;
    g.save();
    g.strokeStyle = "rgba(225,225,220,0.75)"; g.lineWidth = opt.big ? 2.4 : 2;
    g.beginPath(); g.ellipse(cx, cy, rx - 1.2, ry - 1.2, rot, 1.6, 4.2); g.stroke();
    g.fillStyle = gv(0.04, 0.8); g.beginPath(); g.ellipse(cx + rx * 0.12, cy - ry * 0.1, rx * 0.62, ry * 0.62, rot, 0, 7); g.fill();
    g.strokeStyle = "rgba(200,200,195,0.45)"; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(cx + rx * 0.1, cy - ry * 0.15); g.lineTo(cx + rx * 0.35, cy - ry * 0.6); g.stroke();
    g.restore();
  },
  btn(g, P, t, r, opt, sh) {
    const [cx, cy, rx, ry, rot] = sh.e;
    g.fillStyle = "rgba(255,255,255,0.25)"; g.beginPath(); g.ellipse(cx - rx * 0.2, cy - ry * 0.25, rx * 0.55, ry * 0.4, rot, 0, 7); g.fill();
  },
  lit(g, P) {
    const [x0, y0, x1, y1] = bboxOf(P);
    g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  },
  screen(g, P, t, r) {
    // (fix pass 2: the cracked laptop screen as the source draws it: dark jagged crack lines (a web from an impact
    // point, with short cross-cracks) on a grey screen; the round-3 pale starburst read as lightning)
    const [x0, y0, x1, y1] = bboxOf(P), c = [x0 + (x1 - x0) * 0.42, y0 + (y1 - y0) * 0.5];
    g.save(); g.filter = "blur(10px)";
    g.fillStyle = "rgba(0,0,0,0.18)"; g.beginPath(); g.ellipse(x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.6, (x1 - x0) * 0.35, (y1 - y0) * 0.3, 0, 0, 7); g.fill();
    g.restore();
    g.lineCap = "round"; g.lineJoin = "round";
    const ends = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 2 * PI + (r() - 0.5) * 0.6, L = 35 + 45 * r();
      let x = c[0], y = c[1];
      g.strokeStyle = `rgba(20,20,20,${(0.7 + 0.25 * r()).toFixed(2)})`; g.lineWidth = 1.1 + 0.8 * r();
      g.beginPath(); g.moveTo(x, y);
      const pts = [];
      for (let k = 0; k < 5; k++) { x += Math.cos(a + (r() - 0.5) * 0.9) * L / 5; y += Math.sin(a + (r() - 0.5) * 0.9) * L / 5; g.lineTo(x, y); pts.push([x, y]); }
      g.stroke();
      ends.push(pts);
    }
    // short cross-cracks between neighbouring rays (the web)
    g.lineWidth = 0.9; g.strokeStyle = "rgba(20,20,20,0.6)";
    for (let i = 0; i < ends.length; i++) {
      const A = ends[i], B = ends[(i + 1) % ends.length], k = 1 + Math.floor(r() * 2);
      g.beginPath(); g.moveTo(A[k][0], A[k][1]); g.lineTo((A[k][0] + B[k][0]) / 2 + (r() - 0.5) * 6, (A[k][1] + B[k][1]) / 2 + (r() - 0.5) * 6); g.lineTo(B[k][0], B[k][1]); g.stroke();
    }
    // a thin pale glint along a few cracks
    g.strokeStyle = "rgba(230,230,225,0.22)"; g.lineWidth = 0.8;
    for (const pts of ends.slice(0, 3)) { g.beginPath(); g.moveTo(c[0] + 1, c[1] + 1); for (const q of pts) g.lineTo(q[0] + 1, q[1] + 1); g.stroke(); }
  },
  stack(g, P, t, r, opt) {
    const a = (opt.a ?? 0) * D2R, [x0, y0, x1, y1] = bboxOf(P);
    const c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
    for (let o = -R; o <= R; o += 5 + 3 * r()) {
      g.strokeStyle = `rgba(0,0,0,${(0.5 + 0.4 * r()).toFixed(2)})`; g.lineWidth = 1.2 + 1.6 * r();
      g.beginPath(); g.moveTo(cx + nx * o - c * R, cy + ny * o - s * R); g.lineTo(cx + nx * o + c * R, cy + ny * o + s * R); g.stroke();
      if (r() < 0.6) { g.strokeStyle = `rgba(230,230,230,${(0.1 + 0.15 * r()).toFixed(2)})`; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + nx * (o + 2) - c * R, cy + ny * (o + 2) - s * R); g.lineTo(cx + nx * (o + 2) + c * R, cy + ny * (o + 2) + s * R); g.stroke(); }
    }
  },
  books(g, P, t, r) {
    // (fix pass 2: irregular spines (3-8 px here, 6-14 px on screen once magnified), uneven heights, one or two
    // leaning; the round-3 even strips read as a barcode). The shelf's rows: the face's top, the two boards, its foot
    const [x0, y0, x1, y1] = bboxOf(P);
    const rows = [[262, 280], [324, 378], [422, 470]];      // [row top at x0, row foot at x0] (boards slope 0.6)
    const sl = 0.6;
    for (const [top, foot] of rows) {
      let x = x0 + 1;
      let lean = r() < 0.5 ? 1 + Math.floor(r() * 3) : -1;
      while (x < x1 - 2) {
        const w = 3 + 5 * r(), f = foot + sl * (x - x0), h = (foot - top) * (0.55 + 0.4 * r());
        const v = r();
        const col = v < 0.35 ? `rgba(0,0,0,${(0.5 + 0.4 * r()).toFixed(2)})` : v < 0.75 ? `rgba(120,120,115,${(0.35 + 0.3 * r()).toFixed(2)})` : `rgba(215,215,208,${(0.25 + 0.3 * r()).toFixed(2)})`;
        g.save(); g.translate(x, f);
        if (lean-- === 0) g.rotate(0.35 + 0.2 * r());
        g.transform(1, sl, 0, 1, 0, 0);
        g.fillStyle = col; g.fillRect(0, -h, w, h);
        g.strokeStyle = "rgba(0,0,0,0.7)"; g.lineWidth = 0.8; g.strokeRect(0, -h, w, h);
        if (w > 5 && r() < 0.5) { g.fillStyle = "rgba(230,230,225,0.3)"; g.fillRect(w * 0.3, -h * 0.7, w * 0.4, h * 0.12); }
        g.restore();
        x += w + (r() < 0.2 ? 1 + 2 * r() : 0.3);
      }
    }
  },
  glass(g, P, t, r) {
    const [x0, y0, x1, y1] = bboxOf(P);
    g.strokeStyle = "rgba(255,255,255,0.05)"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(x0 + (x1 - x0) * 0.1, y0 + (y1 - y0) * 0.2); g.lineTo(x0 + (x1 - x0) * 0.5, y0 + (y1 - y0) * 0.45); g.stroke();
  },
};

// ---------------------------------------------------------------- layers
// planes: w(u,v) = a*u + b*v + c (1 = the keyboard's depth). Round 3 re-measured them (trace3/jointfit.py): points
// on every layer tracked from 40.00 to 40.64 by chained scale-compensated template matching (~4400 observations)
// and fitted jointly with a small per-frame camera side-shift (s14.js EOFF); median error 2-5 px per layer. The
// synth keeps the round-2 plane (too few trackable points on it); the back and aside layers too.
export const LAYERS3 = [
  { name: "back", rect: [0, 0, 2206, 946], sc: 1, plane: [0, 0, 0.78], blurK: 0, bg: 0.012 },
  { name: "ceiling", rect: [300, -40, 1900, 200], sc: 1.5, plane: [0.000421, -0.001871, 0.5737], blurK: 0.3 },
  { name: "floor", rect: [-160, 640, 2370, 1010], sc: 1.5, plane: [0.000339, 0.002547, -1.3272], blurK: 0.3, dotK: 0.066, streakK: 0, soft: 14, gsmooth: 18 },
  { name: "left", rect: [-160, -20, 1060, 1010], sc: 2, plane: [-0.000515, 0.000061, 1.3940], blurK: 0.2 },
  // (fix pass 2) the keyboard leaning on the boxes: w = 1 (the dolly's unit)
  { name: "kbd", rect: [775, 400, 970, 775], sc: 2, plane: [0, 0, 1.0], blurK: 0.2 },
  { name: "aside", rect: [1180, 120, 1345, 740], sc: 2, plane: [0, 0, 0.89], blurK: 0.5 },
  { name: "right", rect: [1100, -20, 2360, 740], sc: 2, plane: [0.000601, -0.000120, 0.2294], blurK: 0.6 },
  // (fix pass 2) the boxes behind the desk's left end, revealed at 40.56-40.68 (the right wall's plane; s14.js adds a
  // small extra dolly at 40.64)
  { name: "late", rect: [1236, 550, 1520, 730], sc: 2, plane: [0.000601, -0.000120, 0.2294], blurK: 0.6 },
  // the desk group (synth, under, deskBase, deskTop) moves about its own focus of expansion (s14.js DESK_C): its
  // plank measured edge by edge on every dolly frame (magnification 1.03 -> 6.0, w_eff 1.55-1.60, C x 1105, y 637 -> 600)
  // (fix pass 2: the synth's plane re-measured: its knob and display regions tracked on 40.04-40.20 give w 1.62-1.72,
  // 1.65 at x 1810 and 1.70 at x 1935; the round-2 plane (1.86 there) moved it ~20-26 px too far right and up by 40.16)
  { name: "synth", rect: [1600, 270, 2200, 560], sc: 2, plane: [0.0004, 0, 0.926], blurK: 0.8, desk: 1 },
  { name: "under", rect: [1236, 636, 2360, 1010], sc: 2, plane: [0.000567, 0, 0.8212], blurK: 0.8, desk: 1 },
  { name: "deskBase", rect: [1180, 590, 2360, 1010], sc: 2, plane: [0.000709, 0, 0.6449], blurK: 0.9, desk: 1 },
  // (r3 fix 1) the front-left leg at the plank's depth (its edge tracked on 40.16-40.48: w 1.57-1.60)
  { name: "deskLeg", rect: [1180, 580, 1250, 880], sc: 2, plane: [0, 0, 1.59], blurK: 0.9, desk: 1 },
  // (the plank: w 1.60 at its left end, from its measured magnification at 40.52-40.60)
  { name: "deskTop", rect: [1136, 530, 2360, 626], sc: 2.5, plane: [0.000529, 0, 0.989], blurK: 1, slices: 24, desk: 1 },
];

// face-id map (round 3, pass 3): every closed face of a layer rasterised without antialiasing (scanline fill) into a
// byte map at the plate's resolution (id = 1 + its index among the layer's faces; later faces on top), so the
// compositor can re-tone each face per frame (s14.js faceGains, fitted by trace3/facegain.py)
function idMap(D, items, w, h) {
  const [x0, y0] = D.rect, sc = D.sc, M = new Uint8Array(w * h), ids = {};
  let n = 0;
  for (const [name, e] of items) {
    const [, sh, opt = {}] = e;
    if (opt.open) continue;
    n++; if (n > 255) break;
    ids[name] = n;
    const P = ptsOf(sh).map(([x, y]) => [(x - x0) * sc, (y - y0) * sc]);
    let ya = Infinity, yb = -Infinity; for (const p of P) { ya = Math.min(ya, p[1]); yb = Math.max(yb, p[1]); }
    for (let y = Math.max(0, Math.floor(ya)); y <= Math.min(h - 1, Math.ceil(yb)); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const a = P[i], b = P[j];
        if ((a[1] > yc) !== (b[1] > yc)) xs.push(a[0] + ((yc - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
      xs.sort((u, v) => u - v);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5));
        if (xb >= xa) M.fill(n, y * w + xa, y * w + xb + 1);
      }
    }
  }
  return { M, ids };
}
export function buildLayers3(only = null) {
  const byL = {};
  for (const [name, e] of Object.entries(GEO)) (byL[e[0]] = byL[e[0]] || []).push([name, e]);
  const out = [];
  for (const D of LAYERS3) {
    if (only && !only.includes(D.name)) continue;
    const [x0, y0, x1, y1] = D.rect;
    const cv = mk((x1 - x0) * D.sc, (y1 - y0) * D.sc), g = cv.getContext("2d");
    g.scale(D.sc, D.sc); g.translate(-x0, -y0);
    if (D.bg != null) { g.fillStyle = gv(D.bg); g.fillRect(x0, y0, x1 - x0, y1 - y0); }
    for (const [name, e] of byL[D.name] || []) if (!D.soft || !(e[2] || {}).open) drawItem(g, name, e);
    if (D.soft) {
      // (r3 fix 1) the floor's tone zones blended into one continuous wash before its hatching (their edges printed as
      // a grid of seams radiating from the vanishing point)
      const tv = mk(cv.width, cv.height), tg = tv.getContext("2d");
      tg.filter = `blur(${(D.soft * D.sc).toFixed(1)}px)`; tg.drawImage(cv, 0, 0);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "copy"; g.drawImage(tv, 0, 0); g.restore();
      tv.width = 1;
    }
    if (PAINT[D.name]) PAINT[D.name](g);
    if (D.soft) for (const [name, e] of byL[D.name] || []) if ((e[2] || {}).open) drawItem(g, name, e);
    // the source room is soft painted ink: soften the plate a little (0.6 R40 px)
    const sv = mk(cv.width, cv.height), sg = sv.getContext("2d");
    sg.filter = `blur(${(0.6 * D.sc).toFixed(2)}px)`; sg.drawImage(cv, 0, 0);
    cv.width = 1;
    const { M, ids } = idMap(D, byL[D.name] || [], sv.width, sv.height);
    out.push({ ...D, canvas: sv, idData: M, ids });
  }
  return out;
}
// per-layer code-drawn extras (drawn after the traced faces)
const PAINT = {
  floor(g) {
    // (r3 fix 1) the floor boards as the source draws them: calm pen cross-hatch, the strokes near horizontal with a
    // second family across them, heavier toward the walls, a few short dark drags; nothing radial to the dolly's
    // focus (the round-3 radial hatching read as speed lines)
    const F = [[1093, 645], [1116.5, 645], [3200, 1010], [-900, 1010]];
    const r = rng(4411);
    g.save(); pathOf(g, F); g.clip();
    const B = [[-160, 640], [2370, 640], [2370, 1010], [-160, 1010]];
    xhatch(g, B, -4, 3.4, 0.85, 0.22, r, { seg: [16, 60], gap: [2, 12] });
    xhatch(g, B, 31, 4.2, 0.8, 0.12, r, { seg: [10, 34], gap: [3, 14] });
    for (const [x0, x1] of [[-160, 560], [1640, 2370]]) {
      const Q = [[x0, 640], [x1, 640], [x1, 1010], [x0, 1010]];
      g.save(); pathOf(g, Q); g.clip();
      xhatch(g, Q, -12, 3.2, 0.9, 0.3, r, { seg: [12, 40], gap: [2, 8] });
      xhatch(g, Q, 58, 3.8, 0.8, 0.2, r, { seg: [10, 30], gap: [2, 10] });
      g.restore();
    }
    // (fix pass 2) the source's floor carries dark pen drags along the planks, converging on the corridor's end: short
    // (30-80 px at the front, shorter far off), 1-3 px wide, densest along the walls' feet and down the corridor's
    // middle where the owl hops (review 2: the wide horizontal smudges read as blots, the drags were missing)
    g.lineCap = "round";
    for (let i = 0; i < 2600; i++) {
      const y = 650 + 360 * Math.pow(r(), 0.8), x = -200 + r() * 2600;
      const depth = (y - 640) / 370;                                   // 0 far .. 1 front
      const xl = 1040 - (y - 735) * 2.0, xr = 1236 + (y - 640) * 1.1;  // the left wall's foot, the desk side
      if (x < xl - 40 || x > xr + 60) continue;
      const near = Math.max(cl(1 - Math.abs(x - xl) / 150), cl(1 - Math.abs(x - xr) / 150), 0.6 * cl(1 - Math.abs(x - 1080) / 170) * cl((y - 760) / 120));
      if (r() > 0.3 + 0.7 * near) continue;
      // (the source's drags rise toward the corridor on the sides (~25 deg at x 700) and lie flat down its middle)
      let ang = Math.atan((VP[1] - y) / (VP[0] - x || 1e-3));
      ang = Math.sign(ang) * Math.min(Math.abs(ang), 32 * D2R) * cl(Math.abs(x - VP[0]) / 260) + (r() - 0.5) * 0.12;
      const L = (30 + 50 * r()) * (0.35 + 0.65 * depth);
      const w = (1 + 2 * r() * r()) * (0.5 + 0.5 * depth), v = 0.2 + 0.15 * r();
      g.strokeStyle = gv(v, 0.35 + 0.4 * r()); g.lineWidth = w;
      const c = Math.cos(ang), sn = Math.sin(ang), bend = (r() - 0.5) * 0.08 * L;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + c * L * 0.5 - sn * bend, y + sn * L * 0.5 + c * bend, x + c * L, y + sn * L); g.stroke();
    }
    g.restore();
  },
  right(g) {
    // the lamp's glow and the dust lit in it (sparkles), traced on the 40.00 grid
    g.save();
    g.globalCompositeOperation = "lighter";
    const G = g.createRadialGradient(1674, 410, 10, 1674, 410, 120);
    G.addColorStop(0, "rgba(255,255,255,0.35)"); G.addColorStop(0.4, "rgba(255,255,255,0.12)"); G.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = G; g.fillRect(1540, 280, 270, 260);
    // (r3 fix 1) the lamp's wider spill over the bay, the laptop and the synth's lit end
    const G2 = g.createRadialGradient(1662, 380, 20, 1662, 380, 230);
    G2.addColorStop(0, "rgba(255,255,255,0.2)"); G2.addColorStop(0.5, "rgba(255,255,255,0.07)"); G2.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = G2; g.fillRect(1430, 150, 470, 460);
    // (fix pass 2) the dust in the lamp's light: soft glowing specks (1-3 px, blurred, alpha 0.4-0.8), not crisp dots
    const r = rng(771);
    for (let i = 0; i < 70; i++) {
      const x = 1540 + r() * 110, y = 300 + r() * 110, rr = 0.6 + 1.6 * r() * r();
      if (Math.hypot((x - 1600) / 70, (y - 350) / 60) > 1) continue;
      g.filter = `blur(${(0.5 + 0.7 * r()).toFixed(2)}px)`;
      g.fillStyle = `rgba(255,255,255,${(0.4 + 0.4 * r()).toFixed(2)})`;
      g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
    }
    g.filter = "none";
    g.restore();
  },
};
