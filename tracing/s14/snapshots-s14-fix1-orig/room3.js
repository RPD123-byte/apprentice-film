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
function toneOf(name, P, dflt) {
  const T = TONE3[name];
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
export const INKW = { k: 0.62, a: 0.78 };
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

// ---------------------------------------------------------------- materials
const MAT = {
  dark: { v: 0.05, o: 0, edge: 0, fib: { sp: 6, seg: [20, 90], gap: [10, 60], w: [1, 3], a: [0.1, 0.4], light: 0.25, la: [0.03, 0.1] } },
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
  const t = toneOf(name, P, opt.v ?? m.v);
  let ang = opt.a ?? 90;
  if (opt.m === "floor") { const c = centroid(P); ang = Math.atan2(VP[1] - c[1], VP[0] - c[0]) / D2R; }
  // the marks follow the face's darkness: lit faces are clean washes, shadowed faces carry heavy dry-brush
  // streaks (and a plaid of hatching when deep); t.tex is the per-face gain fitted to the source's high-pass energy
  // streak opacities: fine dry-brush (texture gain) and broad drags (brush gain), heavier on shadowed faces
  const TL = tiles(), textured = !!m.fib && opt.fib !== 0;
  let af = textured ? 0.55 * cl((0.7 - t.v) / 0.45, 0.2, 1) * t.tex : 0;
  let ab = textured && opt.m !== "floor" ? 0.6 * cl((0.8 - t.v) / 0.5, 0.15, 1) * t.brush : 0;
  const al = textured ? 0.35 * Math.min(1.5, t.tex) * cl(t.v / 0.4, 0.3, 1) : 0;
  af = Math.min(0.9, af); ab = Math.min(0.9, ab);
  const dk = () => 1 - (1 - af * TL.fine.mean) * (1 - ab * TL.broad.mean);
  let lift = 1 / Math.max(0.2, 1 - dk() + al * TL.light.mean * 0.5);
  // (a bright face cannot be lifted past white: thin its marks until its mean is reachable)
  const vmax = t.v + Math.hypot(t.gx, t.gy) * 40;
  for (let it = 0; it < 6 && vmax * lift > 0.98 && lift > 1.0; it++) { af *= 0.6; ab *= 0.6; lift = 1 / Math.max(0.2, 1 - dk() + al * TL.light.mean * 0.5); }
  g.save();
  pathOf(g, P); g.clip();
  toneFill(g, P, t, lift); pathOf(g, P); g.fill();
  const sp = SPECIAL[opt.m];
  if (sp) sp(g, P, t, r, opt, sh);
  if (m.mottle && opt.mottle !== 0) mottle(g, P, r, (opt.mottle ?? 1) * m.mottle[0], m.mottle[1]);
  if (ab > 0) streakFill(g, P, "broad", ang, ab, false, 1 + 0.3 * r());
  if (af > 0) streakFill(g, P, "fine", ang, af, false, 0.8 + 0.4 * r());
  if (al > 0) streakFill(g, P, "light", ang, al, true, 0.9 + 0.3 * r());
  if (m.plaid && t.v < 0.34 && opt.plaid !== 0) {
    const k = cl((0.34 - t.v) / 0.2) * Math.min(2, t.tex);
    hatch(g, P, ang + 90, 4.2, 0.9, (0.22 * k).toFixed(3), r, 0.25);
    hatch(g, P, ang + 3, 5, 0.8, (0.14 * k).toFixed(3), r, 0.4);
  }
  const ed = opt.edge ?? m.edge;
  if (ed) edgeDark(g, P, ed[0], ed[1]);
  g.restore();
  const o = opt.o ?? m.o;
  if (o > 0) ink(g, P, o, (opt.oa ?? 0.85) * INKW.a);
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
    // planks radiating from a point low in the corridor: pale streaks on dark
    const [x0, y0, x1, y1] = bboxOf(P), V = [1135, 420];
    g.lineCap = "round";
    for (let i = 0; i < 900; i++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
      const dx = x - V[0], dy = y - V[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
      const L = (10 + 60 * r() * r()) * (l / 400);
      const al = 0.05 + 0.22 * r() * r();
      g.strokeStyle = r() < 0.75 ? `rgba(235,235,235,${al.toFixed(3)})` : `rgba(0,0,0,${(al * 1.5).toFixed(3)})`;
      g.lineWidth = (0.6 + 1.8 * r()) * (l / 500);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + ux * L, y + uy * L); g.stroke();
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
      g.fillStyle = gv(0.04); pathOf(g, q); g.fill();
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
    const [cx, cy, rx] = sh.e;
    g.lineCap = "round";
    for (let i = 0; i < 170; i++) {
      const a = r() * 2 * PI, r0 = 50 + r() * (rx - 58), len = 0.25 + 0.45 * r();
      const k = 0.5 + 0.5 * Math.cos(a - 0.7);            // 1 = lit lower right
      const dark = r() < 0.75 - 0.4 * k;
      g.strokeStyle = dark ? `rgba(0,0,0,${(0.08 + 0.22 * r()).toFixed(3)})` : `rgba(245,245,245,${(0.05 + 0.18 * r() * k).toFixed(3)})`;
      g.lineWidth = 2 + 5 * r();
      g.beginPath();
      for (let j = 0; j <= 8; j++) {
        const u = j / 8, aa = a + u * len, rr = r0 + u * 16;
        const x = cx + Math.cos(aa) * rr, y = cy + Math.sin(aa) * rr;
        if (j) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }
    g.save(); g.filter = "blur(6px)"; g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 16; g.beginPath(); g.arc(cx, cy, rx - 4, 0, 7); g.stroke(); g.restore();
  },
  cap(g, P, t, r, opt, sh) {
    const [cx, cy, rx, ry] = sh.e;
    g.save(); g.filter = "blur(3px)";
    g.fillStyle = "rgba(235,235,235,0.8)"; g.beginPath(); g.ellipse(cx + 9, cy - 18, 11, 8, -0.4, 0, 7); g.fill();
    g.fillStyle = "rgba(235,235,235,0.25)"; g.beginPath(); g.ellipse(cx + 16, cy + 18, 14, 9, 0.6, 0, 7); g.fill();
    g.restore();
  },
  lit(g, P) {
    const [x0, y0, x1, y1] = bboxOf(P);
    g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  },
  screen(g, P, t, r) {
    // the cracked laptop screen: a few thin pale crack lines from a point
    const [x0, y0, x1, y1] = bboxOf(P), c = [x0 + (x1 - x0) * 0.55, y0 + (y1 - y0) * 0.45];
    g.lineCap = "round";
    for (let i = 0; i < 9; i++) {
      const a = r() * 2 * PI, L = 20 + 50 * r();
      g.strokeStyle = `rgba(230,230,230,${(0.2 + 0.25 * r()).toFixed(2)})`; g.lineWidth = 0.8 + r();
      g.beginPath(); g.moveTo(c[0], c[1]);
      let x = c[0], y = c[1];
      for (let k = 0; k < 4; k++) { x += Math.cos(a + (r() - 0.5) * 0.8) * L / 4; y += Math.sin(a + (r() - 0.5) * 0.8) * L / 4; g.lineTo(x, y); }
      g.stroke();
    }
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
    const [x0, y0, x1, y1] = bboxOf(P);
    for (let x = x0; x < x1; x += 4 + 7 * r()) {
      const w = 2 + 5 * r();
      g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${(0.4 + 0.4 * r()).toFixed(2)})` : `rgba(220,220,220,${(0.08 + 0.15 * r()).toFixed(2)})`;
      g.fillRect(x, y0, w, y1 - y0);
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
  { name: "floor", rect: [-160, 640, 2370, 1010], sc: 1.5, plane: [0.000339, 0.002547, -1.3272], blurK: 0.35, dotK: 0.12, streakK: 0.45 },
  { name: "left", rect: [-160, -20, 1060, 1010], sc: 2, plane: [-0.000515, 0.000061, 1.3940], blurK: 0.2 },
  { name: "aside", rect: [1180, 120, 1345, 740], sc: 2, plane: [0, 0, 0.89], blurK: 0.5 },
  { name: "right", rect: [1100, -20, 2360, 740], sc: 2, plane: [0.000601, -0.000120, 0.2294], blurK: 0.6 },
  // the desk group (synth, under, deskBase, deskTop) moves about its own focus of expansion (s14.js DESK_C): its
  // plank measured edge by edge on every dolly frame (magnification 1.03 -> 6.0, w_eff 1.55-1.60, C x 1105, y 637 -> 600)
  { name: "synth", rect: [1600, 270, 2200, 560], sc: 2, plane: [0.000529, 0, 0.90], blurK: 0.8, desk: 1 },
  { name: "under", rect: [1236, 636, 2360, 1010], sc: 2, plane: [0.000567, 0, 0.8212], blurK: 0.8, desk: 1 },
  { name: "deskBase", rect: [1180, 590, 2360, 1010], sc: 2, plane: [0.000709, 0, 0.6449], blurK: 0.9, desk: 1 },
  // (the plank: w 1.60 at its left end, from its measured magnification at 40.52-40.60)
  { name: "deskTop", rect: [1136, 530, 2360, 616], sc: 2.5, plane: [0.000529, 0, 0.989], blurK: 1, slices: 24, desk: 1 },
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
    for (const [name, e] of byL[D.name] || []) drawItem(g, name, e);
    if (PAINT[D.name]) PAINT[D.name](g);
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
  right(g) {
    // the lamp's glow and the dust lit in it (sparkles), traced on the 40.00 grid
    g.save();
    g.globalCompositeOperation = "lighter";
    const G = g.createRadialGradient(1674, 410, 10, 1674, 410, 120);
    G.addColorStop(0, "rgba(255,255,255,0.35)"); G.addColorStop(0.4, "rgba(255,255,255,0.12)"); G.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = G; g.fillRect(1540, 280, 270, 260);
    const r = rng(771);
    for (let i = 0; i < 70; i++) {
      const x = 1540 + r() * 110, y = 300 + r() * 110, rr = 0.8 + 1.8 * r() * r();
      if (Math.hypot((x - 1600) / 70, (y - 350) / 60) > 1) continue;
      g.fillStyle = `rgba(255,255,255,${(0.3 + 0.6 * r()).toFixed(2)})`;
      g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
    }
    g.restore();
  },
};
