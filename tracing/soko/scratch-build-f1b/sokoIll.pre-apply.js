// The sōko page's hero illustration: the designer at his desk inside a wall of gear, white ink on black.
// Page coordinates (2206 x 946 = the full-frame page at 48.8–53.2 s). Every object was placed from labelled
// 2–4x grids of the source; see docs/soko.md.
//
// The source picture is painterly scratchboard: cartons carry soft, irregular vertical brush stripes (~5 px
// period) that fade into black at their shadowed edges; the designer is softly shaded and glows in the laptop
// light. So this is painted stroke by stroke (seeded, static) rather than cut by the engraving shader.
//
//   sokoIllCanvas({ gaze, scale })  cached canvas, PAGE_W*scale x PAGE_H*scale, black background
//                                   gaze: "owl" (eyes to his right, at the owl: 47.84–53.24) | "down" (69.44+)
//   sokoIllSmall(ctx, w, h)         the illustration stretched onto a laptop page (s01/s05/s07)
import { taper } from "./ink.js";
import { smoothPath, sampleCurve } from "./paths.js";
import { rng, noise1, noise2 } from "./rng.js";

const PW = 2206, PH = 946;
const PI = Math.PI;
const BLK = "#040404";
const W1 = "rgba(236,235,230,0.95)";          // ink white

// ---------- small helpers ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const grey = (v, a = 1) => { const c = Math.round(clamp(v) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };
const P2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const bil = (q, u, v) => P2(P2(q[0], q[1], u), P2(q[3], q[2], u), v);
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const polyPath = (g, pts) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
const blobPath = (g, pts) => { g.beginPath(); smoothPath(g, pts, true); };

// An exact, deterministic gaussian blur of RGBA pixels in place (separable, zero outside the image). Canvas
// `filter: blur()` cannot be used here: on CPU-backed canvases Chrome skips blurs under ~0.8 px and quantizes the
// rest (measured), and on GPU canvases it is slow under software GL.
export function gaussBlurRGBA(d, w, h, sigma) {
  if (!(sigma > 0.05)) return d;
  const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float32Array(2 * r + 1);
  let sum = 0; for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-0.5 * (i * i) / (sigma * sigma)); sum += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
      const lo = Math.max(-r, -x), hi = Math.min(r, w - 1 - x);
      for (let i = lo; i <= hi; i++) { const kk = k[i + r], j = row + (x + i) * 4; a0 += d[j] * kk; a1 += d[j + 1] * kk; a2 += d[j + 2] * kk; a3 += d[j + 3] * kk; }
      const o = row + x * 4; tmp[o] = a0; tmp[o + 1] = a1; tmp[o + 2] = a2; tmp[o + 3] = a3;
    }
  }
  const W4 = w * 4;
  for (let y = 0; y < h; y++) {
    const lo = Math.max(-r, -y), hi = Math.min(r, h - 1 - y);
    for (let x = 0; x < w; x++) {
      let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
      const c = x * 4;
      for (let i = lo; i <= hi; i++) { const kk = k[i + r], j = (y + i) * W4 + c; a0 += tmp[j] * kk; a1 += tmp[j + 1] * kk; a2 += tmp[j + 2] * kk; a3 += tmp[j + 3] * kk; }
      const o = y * W4 + c; d[o] = a0; d[o + 1] = a1; d[o + 2] = a2; d[o + 3] = a3;
    }
  }
  return d;
}
// blur a whole canvas in place (its 2D context should be CPU-backed)
export function blurCanvas(c, sigma) {
  if (!(sigma > 0.05)) return c;
  const g = c.getContext("2d", { willReadFrequently: true });
  const id = g.getImageData(0, 0, c.width, c.height);
  gaussBlurRGBA(id.data, c.width, c.height, sigma);
  g.putImageData(id, 0, 0);
  return c;
}

// Blurred drawing without full-canvas filter layers: the shape is drawn into a small scratch canvas around its
// bounds, blurred there, and composited back (respecting the target's clip, alpha and composite mode).
let TA = null, TB = null;
function scratch(c, w, h) { if (!c || c.width < w || c.height < h) { c = document.createElement("canvas"); c.width = Math.max(w, c ? c.width : 0); c.height = Math.max(h, c ? c.height : 0); } return c; }
function blurDraw(g, bb, blur, draw) {
  const m = g.getTransform(), pad = blur * 3 + 2, xs = [], ys = [];
  for (const [x, y] of [[bb[0] - pad, bb[1] - pad], [bb[2] + pad, bb[1] - pad], [bb[0] - pad, bb[3] + pad], [bb[2] + pad, bb[3] + pad]]) { xs.push(m.a * x + m.c * y + m.e); ys.push(m.b * x + m.d * y + m.f); }
  const dx = Math.floor(Math.min(...xs)), dy = Math.floor(Math.min(...ys)), w = Math.ceil(Math.max(...xs)) - dx, h = Math.ceil(Math.max(...ys)) - dy;
  if (w <= 0 || h <= 0) return;
  TA = scratch(TA, w, h); TB = scratch(TB, w, h);
  const a = TA.getContext("2d", { willReadFrequently: true }), b = TB.getContext("2d", { willReadFrequently: true });
  a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, w, h); a.setTransform(m.a, m.b, m.c, m.d, m.e - dx, m.f - dy);
  draw(a);
  b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, w, h);
  const id = a.getImageData(0, 0, w, h); gaussBlurRGBA(id.data, w, h, blur * Math.hypot(m.a, m.b)); b.putImageData(id, 0, 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(TB, 0, 0, w, h, dx, dy, w, h); g.restore();
}
const bboxOf = (pts, pad = 0) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]; };
const E = (x, y, rx, ry, a = 0) => Object.assign((c) => c.ellipse(x, y, rx, ry, a, 0, PI * 2), { bb: [x - Math.max(rx, ry), y - Math.max(rx, ry), x + Math.max(rx, ry), y + Math.max(rx, ry)] });
const Rc = (x, y, w, h) => Object.assign((c) => c.rect(x, y, w, h), { bb: [x, y, x + w, y + h] });

// fill a polygon (occluding base)
function fillPoly(g, pts, color = BLK) { polyPath(g, pts); g.fillStyle = color; g.fill(); }
function fillBlob(g, pts, color = BLK) { blobPath(g, pts); g.fillStyle = color; g.fill(); }
function dot(g, x, y, r, color = W1) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, PI * 2); g.fill(); }
function ring(g, x, y, r, w, color = W1, a0 = 0, a1 = PI * 2) { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); }

// an inked line through points (polyline, lightly jittered), width w with a gentle swell
function ink(g, pts, w = 2, color = BLK, { closed = false, seed = 1, ends = 0.7, jit = 0.4 } = {}) {
  const r = rng(seed);
  const q = closed ? [...pts, pts[0]] : pts;
  const dense = [];
  for (let i = 0; i < q.length - 1; i++) {
    const [x0, y0] = q[i], [x1, y1] = q[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6));
    for (let k = 0; k < n; k++) dense.push([x0 + (x1 - x0) * (k / n) + (r() - 0.5) * jit, y0 + (y1 - y0) * (k / n) + (r() - 0.5) * jit]);
  }
  dense.push(q[q.length - 1]);
  taper(g, dense, (u) => w * (ends + (1 - ends) * Math.sin(PI * u)), color);
}
// a smooth inked curve (Catmull-Rom)
function curve(g, pts, w = 2, color = BLK, { closed = false, seed = 1, ends = 0.4, jit = 0.3 } = {}) {
  const r = rng(seed);
  const q = sampleCurve(pts, 8, closed).map(([x, y]) => [x + (r() - 0.5) * jit, y + (r() - 0.5) * jit]);
  taper(g, q, (u) => w * (ends + (1 - ends) * Math.pow(Math.sin(PI * u), 0.5)), color);
}

// ---------- the engraver: carved lines over a value study, evaluated per pixel ----------
// The source is scratchboard: parallel carved lines whose width AND brightness follow the light (thin grey lines
// in shadow, fat white lines that merge in the light), wandering a little, with soft edges and rare notches.
// tex() engraves one face: a shape, a value (0 black .. 1 white) and a line direction. The value is a number, a
// painter (vc, bb) => {} that paints a value study in page coordinates on a black scratch canvas, or a per-pixel
// function (o.vfn(x, y)). The mean brightness of the engraved face equals the value (width v^wExp, brightness
// v / width), so a painted value study can be matched to the source's blurred light directly.
const hI = (a, b, s) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
function vn2(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hI(ix, iy, s), b = hI(ix + 1, iy, s), c = hI(ix, iy + 1, s), d = hI(ix + 1, iy + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
// inverse bilinear map of p inside quad [TL, TR, BR, BL] -> [u, v] (u along TL->TR, v along TL->BL)
function invBil(px, py, q) {
  const [a, b, c, d] = q;
  const ex = b[0] - a[0], ey = b[1] - a[1], fx = d[0] - a[0], fy = d[1] - a[1];
  const gx = a[0] - b[0] + c[0] - d[0], gy = a[1] - b[1] + c[1] - d[1], hx = px - a[0], hy = py - a[1];
  const k2 = gx * fy - gy * fx, k1 = ex * fy - ey * fx + hx * gy - hy * gx, k0 = hx * ey - hy * ex;
  if (Math.abs(k2) < 1e-3) { const v = -k0 / k1; return [(hx - fx * v) / (ex + gx * v || 1e-6), v]; }
  let w = k1 * k1 - 4 * k0 * k2; if (w < 0) w = 0; w = Math.sqrt(w);
  const ik2 = 0.5 / k2; let v = (-k1 - w) * ik2, u = (hx - fx * v) / (ex + gx * v || 1e-6);
  if (u < -0.01 || u > 1.01 || v < -0.01 || v > 1.01) { v = (-k1 + w) * ik2; u = (hx - fx * v) / (ex + gx * v || 1e-6); }
  return [u, v];
}
let EM = null, EV = null, EO = null;
function scr2(c, w, h) { if (!c || c.width < w || c.height < h) { const n = document.createElement("canvas"); n.width = Math.max(w, c ? c.width : 0, 64); n.height = Math.max(h, c ? c.height : 0, 64); return n; } return c; }
const shapePath = (shape, smooth) => Array.isArray(shape)
  ? (smooth ? (c) => smoothPath(c, shape, true) : (c) => { c.moveTo(shape[0][0], shape[0][1]); for (let i = 1; i < shape.length; i++) c.lineTo(shape[i][0], shape[i][1]); c.closePath(); })
  : shape;
function tex(g, shape, val, ang, o = {}) {
  const { per = 5, wExp = 0.8, soft = 1, wav = 0.1, wavL = 10, wj = 0.22, lj = 0.12, brk = 0.3, brkL = 8, bg = 0.05, lum = 0.95, gain = 1, gamma = 1,
    seed = 1, alpha = 1, smooth = false, coord = null, vfn = null, maxW = 0.97, over = false } = o;
  const path = shapePath(shape, smooth);
  const bb = Array.isArray(shape) ? bboxOf(shape, 2) : shape.bb;
  const m = g.getTransform(), sx = m.a, sy = m.d;
  const X0 = Math.max(0, Math.floor(bb[0] * sx + m.e)), Y0 = Math.max(0, Math.floor(bb[1] * sy + m.f));
  const X1 = Math.min(g.canvas.width, Math.ceil(bb[2] * sx + m.e)), Y1 = Math.min(g.canvas.height, Math.ceil(bb[3] * sy + m.f));
  const w = X1 - X0, h = Y1 - Y0;
  if (w <= 0 || h <= 0) return;
  EM = scr2(EM, w, h); EO = scr2(EO, w, h);
  const mc = EM.getContext("2d", { willReadFrequently: true });
  mc.setTransform(1, 0, 0, 1, 0, 0); mc.clearRect(0, 0, w, h); mc.setTransform(sx, 0, 0, sy, m.e - X0, m.f - Y0);
  mc.beginPath(); path(mc); mc.fillStyle = "#fff"; mc.fill();
  const M = mc.getImageData(0, 0, w, h).data;
  let V = null;
  if (typeof val === "function") {
    EV = scr2(EV, w, h);
    const vc = EV.getContext("2d", { willReadFrequently: true });
    vc.setTransform(1, 0, 0, 1, 0, 0); vc.globalAlpha = 1; vc.globalCompositeOperation = "source-over"; vc.filter = "none";
    vc.fillStyle = "#000"; vc.fillRect(0, 0, w, h); vc.setTransform(sx, 0, 0, sy, m.e - X0, m.f - Y0);
    vc.save(); val(vc, bb); vc.restore();
    V = vc.getImageData(0, 0, w, h).data;
  }
  const vconst = typeof val === "number" ? val : 0;
  const oc = EO.getContext("2d", { willReadFrequently: true });
  const out = oc.createImageData(w, h), O = out.data;
  const ca = Math.cos(ang || 0), sa = Math.sin(ang || 0);
  const aa = Math.max(0.02, soft / (per * sx));
  const L255 = lum * 255;
  for (let j = 0; j < h; j++) {
    const py = (Y0 + j + 0.5 - m.f) / sy;
    for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4, ma = M[k + 3];
      if (!ma) continue;
      const px = (X0 + i + 0.5 - m.e) / sx;
      let v = vfn ? vfn(px, py) : V ? V[k] / 255 : vconst;
      v *= gain; if (gamma !== 1 && v > 0) v = Math.pow(v, gamma); if (v > 1) v = 1;
      let res = 0, cov = 0;
      if (v > 0.003) {
        let s, t;
        if (coord) { const r = coord(px, py); s = r[0]; t = r[1]; } else { s = -sa * px + ca * py; t = ca * px + sa * py; }
        let c = s / per;
        if (wav) c += wav * (vn2(t / (per * wavL), c * 0.3, seed) - 0.5) * 2;
        const row = Math.floor(c), rh = hI(row, 17, seed), rh2 = hI(row, 29, seed);
        let wv = Math.pow(v, wExp) * (1 + wj * (rh - 0.5) * 2);
        if (brk) { const bn = vn2(t / (per * brkL) + rh * 37, row * 1.7, seed + 3); wv *= 1 - brk * (1 - v) * sstep(0.55, 0.9, bn); }
        if (wv > maxW) wv = maxW;
        // exact box-filtered coverage of the pixel footprint [f-aa, f+aa] by the line [-wv, wv]
        const f = Math.abs(c - row - 0.5) * 2;
        const lo = Math.max(f - aa, -wv), hi = Math.min(f + aa, wv);
        cov = hi > lo ? (hi - lo) / (2 * aa) : 0;
        if (cov > 1) cov = 1;
        const b = Math.min(1, v / Math.max(0.03, wv)) * (1 - lj * rh2);
        res = over ? b : cov * b + (1 - cov) * bg * v;
      }
      const lv = res * L255;
      O[k] = lv; O[k + 1] = lv; O[k + 2] = lv;
      O[k + 3] = (over ? cov : 1) * ma * alpha;
    }
  }
  oc.putImageData(out, 0, 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(EO, 0, 0, w, h, X0, Y0, w, h); g.restore();
}
// Painterly fill: short tapered brush strokes laid along a direction field over a value study, each stroke as
// bright as the value under it, over a darker base (the value * base). For cloth, bags and worn surfaces, where
// the source paints with a brush rather than carving regular lines.
let BV = null;
function brush(g, shape, val, angF, o = {}) {
  const { len = 14, w = 2.2, gap = 2, seed = 1, jit = 0.25, base = 0.45, lj = 0.14, smooth = false, blur = 0, gain = 1 } = o;
  const path = shapePath(shape, smooth);
  const bb = Array.isArray(shape) ? bboxOf(shape, 2) : shape.bb;
  const X0 = Math.floor(bb[0]), Y0 = Math.floor(bb[1]), W = Math.ceil(bb[2]) - X0, H = Math.ceil(bb[3]) - Y0;
  if (W <= 0 || H <= 0) return;
  BV = scr2(BV, W, H);
  const vc = BV.getContext("2d", { willReadFrequently: true });
  vc.setTransform(1, 0, 0, 1, 0, 0); vc.globalAlpha = 1; vc.globalCompositeOperation = "source-over"; vc.filter = "none";
  vc.fillStyle = "#000"; vc.fillRect(0, 0, W, H); vc.translate(-X0, -Y0);
  vc.save(); if (typeof val === "number") { vc.fillStyle = grey(val); vc.fillRect(X0, Y0, W, H); } else val(vc, bb); vc.restore();
  const V = vc.getImageData(0, 0, W, H).data;
  const at = (x, y) => { const i = Math.min(W - 1, Math.max(0, Math.round(x - X0))), j = Math.min(H - 1, Math.max(0, Math.round(y - Y0))); return Math.min(1, V[(j * W + i) * 4] / 255 * gain); };
  const af = typeof angF === "number" ? () => angF : angF;
  g.save(); g.beginPath(); path(g); g.clip();
  // base: the value study, darkened
  g.save(); g.globalAlpha = 1; g.drawImage(BV, 0, 0, W, H, X0, Y0, W, H); g.fillStyle = `rgba(0,0,0,${1 - base})`; g.fillRect(X0, Y0, W, H); g.restore();
  const r = rng(seed);
  for (let y = Y0; y < Y0 + H; y += gap) {
    for (let x = X0 + r() * gap * 2; x < X0 + W; x += gap * (1.4 + r() * 0.8)) {
      const px = x + (r() - 0.5) * gap, py = y + (r() - 0.5) * gap;
      const v = at(px, py);
      if (v < 0.03) continue;
      const a = af(px, py) + (r() - 0.5) * jit, L = len * (0.55 + r() * 0.9), c = Math.cos(a) * L / 2, sn = Math.sin(a) * L / 2;
      const bend = (r() - 0.5) * L * 0.08, nx = -Math.sin(a) * bend, ny = Math.cos(a) * bend;
      const pts = [[px - c, py - sn], [px - c * 0.33 + nx, py - sn * 0.33 + ny], [px + c * 0.33 + nx, py + sn * 0.33 + ny], [px + c, py + sn]];
      const lv = clamp(Math.pow(v, 0.85) * (1 + lj * (r() - 0.5) * 2)), ww = w * (0.7 + r() * 0.6) * (0.55 + 0.45 * v);
      taper(g, pts, (u) => ww * Math.pow(Math.sin(PI * clamp(u, 0.02, 0.98)), 0.6), grey(lv));
    }
  }
  g.restore();
}

// value painter for a quad from a function of its local (u, v): used by stripes()
const quadFn = (q, fn) => (x, y) => { const [u, v] = invBil(x, y, q); return fn(clamp(u), clamp(v)); };

// Engrave a quad q = [TL, TR, BR, BL] with lines. dir "v": lines run TL->BL; "h": lines run TL->TR.
// cov(u, v) * lum is the value (mean brightness) at local (u, v). base: false engraves the lines only (over
// what is already there).
function stripes(g, q, { per = 6.2, cov = 0.5, lum = 0.92, seed = 1, dir = "v", jit = 0.3, brk = 0.5, wav = 0.5, lumJit = 0.22, base = true, wExp = 1 } = {}) {
  const [A, B, Cc, D] = q;
  const ang = dir === "v" ? Math.atan2(D[1] - A[1] + Cc[1] - B[1], D[0] - A[0] + Cc[0] - B[0]) : Math.atan2(B[1] - A[1] + Cc[1] - D[1], B[0] - A[0] + Cc[0] - D[0]);
  const cf = typeof cov === "number" ? () => cov : cov;
  tex(g, q, null, ang, { per, seed, vfn: quadFn(q, (u, v) => cf(u, v) * lum), lum: 1, brk: brk * 0.6, wav: 0.06 + wav * 0.12, wj: 0.12 + jit * 0.3, lj: lumJit * 0.6, over: !base, wExp, bg: 0.02 });
}
// ---------- streamline hatching over a painted value study ----------
// A value study is painted (soft brushes, gradients, blur) into VAL, a page-size greyscale canvas; hatch() then
// traces lines along an angle field through a clipped region and gives each point a width of per * value:
// white lines on black that merge in the light and thin out to nothing in shadow (scratchboard).
let VAL = null, VALD = null;
function valCtx() {
  if (!VAL) { VAL = document.createElement("canvas"); VAL.width = PW; VAL.height = PH; }
  VALD = null;
  const v = VAL.getContext("2d", { willReadFrequently: true });
  return v;
}
// read the value study over a box (hatch() calls this for its own bounds)
function valPrepare(x0, y0, x1, y1) {
  x0 = Math.max(0, Math.floor(x0) - 4); y0 = Math.max(0, Math.floor(y0) - 4); x1 = Math.min(PW, Math.ceil(x1) + 4); y1 = Math.min(PH, Math.ceil(y1) + 4);
  VALD = { x0, y0, w: x1 - x0, h: y1 - y0, d: VAL.getContext("2d", { willReadFrequently: true }).getImageData(x0, y0, x1 - x0, y1 - y0).data };
}
function valAt(x, y) {
  const D = VALD;
  const xi = Math.max(0, Math.min(D.w - 1, Math.round(x) - D.x0)), yi = Math.max(0, Math.min(D.h - 1, Math.round(y) - D.y0));
  return D.d[(yi * D.w + xi) * 4] / 255;
}
function hatch(g, clipPts, { ang, per = 4, lum = 0.95, seed = 1, step = 2.2, jit = 0.35, gamma = 1, wMax = 1.08, base = true, baseV = 0, smooth = true, lumJit = 0.18, inv = false, alpha = 1, brk = 0, wn = 0 } = {}) {
  const angF = typeof ang === "number" ? () => ang : ang;
  if (base) { if (smooth) fillBlob(g, clipPts, grey(baseV)); else fillPoly(g, clipPts, grey(baseV)); }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of clipPts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, a0 = angF(cx, cy), nx = -Math.sin(a0), ny = Math.cos(a0);
  const half = Math.hypot(x1 - x0, y1 - y0) / 2 + per;
  valPrepare(x0, y0, x1, y1);
  const r = rng(seed);
  g.save(); g.beginPath(); if (smooth) smoothPath(g, clipPts, true); else { g.moveTo(clipPts[0][0], clipPts[0][1]); for (const p of clipPts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); } g.clip();
  const inBox = (x, y) => x > x0 - 4 && x < x1 + 4 && y > y0 - 4 && y < y1 + 4;
  for (let s = -half; s <= half; s += per) {
    const off = s + (r() - 0.5) * per * jit;
    const sx = cx + nx * off, sy = cy + ny * off;
    const wMul = 0.85 + r() * 0.3, lm = lum * (1 - lumJit + lumJit * r());
    // trace both ways along the field
    const pts = [];
    for (const dir of [-1, 1]) {
      let x = sx, y = sy; const seg = [];
      for (let k = 0; k < 2000 && inBox(x, y); k++) { const a = angF(x, y); x += Math.cos(a) * step * dir; y += Math.sin(a) * step * dir; seg.push([x, y]); }
      if (dir < 0) pts.push(...seg.reverse(), [sx, sy]); else pts.push(...seg);
    }
    let run = [], ws = [];
    const flush = () => { if (run.length > 1) taper(g, run, (u) => ws[Math.min(ws.length - 1, Math.round(u * (ws.length - 1)))], grey(lm, alpha)); run = []; ws = []; };
    const ph = r() * 100, li = Math.round(s / per);
    for (let k = 0; k < pts.length; k++) {
      const [x, y] = pts[k];
      const vv = inv ? 1 - valAt(x, y) : valAt(x, y);
      let w = per * Math.min(wMax, Math.pow(vv, gamma) * wMul * (1 + wn * noise1(k * step / 14 + ph, li + seed)));
      // short breaks along the line, mostly in the mid-tones
      if (brk && vv < 0.92 && noise1(k * step / (per * 4) + ph * 2, li * 7 + seed) > 1 - brk * 1.3 * (1 - vv)) w = 0;
      if (w < 0.22) { flush(); continue; }
      run.push([x, y]); ws.push(w);
    }
    flush();
  }
  g.restore();
}
// An axial direction field that follows a set of guide curves (inverse-distance weighted tangents), sampled on a
// coarse grid over a box; returns ang(x, y).
function curveField(curves, [x0, y0, x1, y1], cell = 6, fallback = PI / 2) {
  const samples = [];
  for (const c of curves) {
    const q = sampleCurve(c, 6);
    for (let i = 0; i < q.length - 1; i++) { const dx = q[i + 1][0] - q[i][0], dy = q[i + 1][1] - q[i][1], a = Math.atan2(dy, dx); samples.push([q[i][0], q[i][1], Math.cos(2 * a), Math.sin(2 * a)]); }
  }
  const nx = Math.ceil((x1 - x0) / cell) + 1, ny = Math.ceil((y1 - y0) / cell) + 1, grid = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * cell, y = y0 + j * cell; let sc = 0, ss = 0;
    for (const [px, py, c2, s2] of samples) { const w = 1 / ((px - x) ** 2 + (py - y) ** 2 + 40); sc += c2 * w; ss += s2 * w; }
    grid[j * nx + i] = samples.length ? Math.atan2(ss, sc) / 2 : fallback;
  }
  return (x, y) => {
    const fi = clamp((x - x0) / cell, 0, nx - 1), fj = clamp((y - y0) / cell, 0, ny - 1), i = Math.round(fi), j = Math.round(fj);
    return grid[j * nx + i];
  };
}

// paint helpers for the value study
function vFill(v, pts, val, { blur = 0, smooth = true, alpha = 1 } = {}) {
  VALD = null;
  const draw = (c) => { c.beginPath(); if (smooth) smoothPath(c, pts, true); else { c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); } c.fillStyle = typeof val === "number" ? grey(val) : val; c.fill(); };
  v.save(); v.globalAlpha = alpha;
  if (blur) blurDraw(v, bboxOf(pts), blur, draw); else draw(v);
  v.restore();
}
function vLine(v, pts, w, val, blur = 0, alpha = 1) {
  VALD = null;
  const draw = (c) => curve(c, pts, w, grey(val), { seed: 5, ends: 0.25, jit: 0 });
  v.save(); v.globalAlpha = alpha;
  if (blur) blurDraw(v, bboxOf(pts, w), blur, draw); else draw(v);
  v.restore();
}

// coverage helpers: along v (top->bottom), along u, bilinear corners, and edge fade
const vg = (a, b, e = 1) => (u, v) => lerp(a, b, Math.pow(v, e));
const ug = (a, b, e = 1) => (u, v) => lerp(a, b, Math.pow(u, e));
const bl = (tl, tr, br, bl_) => (u, v) => lerp(lerp(tl, tr, u), lerp(bl_, br, u), v);
const fadeEdges = (f, top = 0.08, bot = 0.12, left = 0, right = 0) => (u, v) => f(u, v) * sstep(0, top, v) * (1 - sstep(1 - bot, 1, v)) * (left ? sstep(0, left, u) : 1) * (right ? 1 - sstep(1 - right, 1, u) : 1);
const mul = (f, k) => (u, v) => f(u, v) * k;

// a carton: face quads with stripes, black gaps between, a lit top edge
function carton(g, front, { cov, per = 5, lum = 0.92, seed = 1, side = null, sideCov = 0, top = null, topCov = 0.5, topLum = 0.85, rim = 0.5, dir = "v", brk = 0.5 } = {}) {
  if (top) stripes(g, top, { per: 3.2, cov: topCov, lum: topLum, seed: seed + 3, dir: "h", brk: 0.3, jit: 0.2 });
  if (side) { if (sideCov) stripes(g, side, { per, cov: sideCov, lum: lum * 0.8, seed: seed + 5, brk }); else fillPoly(g, side); }
  stripes(g, front, { per, cov, lum, seed, dir, brk });
  if (rim > 0) ink(g, [front[0], front[1]], 1.6, grey(0.9, rim), { seed: seed + 9 });
}

// ======================================================================================
// LEFT BACK: the wall of cartons behind the headline, the lit carton, the guitar case, plants
// ======================================================================================
function leftBack(g) {
  // tall back cartons behind the headline (dim), their bottoms meeting the cartons in front
  stripes(g, [[12, 150], [80, 150], [80, 250], [12, 246]], { cov: fadeEdges(bl(0.28, 0.4, 0.34, 0.22), 0.02, 0.02), lum: 0.62, seed: 11 });
  stripes(g, [[80, 150], [332, 150], [332, 318], [80, 305]], { cov: fadeEdges(bl(0.3, 0.42, 0.4, 0.3), 0.02, 0.02), lum: 0.62, seed: 12 });
  // small lit carton face at the far left
  stripes(g, [[18, 244], [84, 258], [84, 302], [16, 316]], { cov: fadeEdges(bl(0.7, 0.45, 0.3, 0.55), 0.06, 0.06), lum: 0.82, seed: 13 });
  ink(g, [[18, 244], [84, 258]], 1.6, BLK, { seed: 131 });
  // the broad dark carton below (dim grain), with a small lit panel on it
  stripes(g, [[16, 317], [219, 289], [219, 420], [14, 420]], { cov: fadeEdges(bl(0.22, 0.32, 0.26, 0.16), 0.04, 0.02), lum: 0.6, seed: 14 });
  ink(g, [[16, 317], [219, 289]], 1.8, BLK, { seed: 141 });
  stripes(g, [[100, 306], [136, 303], [136, 344], [100, 346]], { cov: fadeEdges(vg(0.7, 0.4), 0.05, 0.05), lum: 0.8, seed: 15 });
  ink(g, [[100, 346], [136, 344]], 1.3, grey(0.75), { seed: 151 });
  // sticker on the back carton
  ink(g, [[130, 281], [181, 278], [182, 298], [131, 300]], 1.3, "rgba(215,215,205,0.6)", { closed: true, seed: 16 });
  // the lit carton, tipped toward the light: bright at its top-left, fading down and right
  stripes(g, [[219, 289], [320, 319], [322, 400], [219, 400]], { cov: fadeEdges(bl(1.0, 0.8, 0.55, 0.85), 0.02, 0.0), lum: 0.96, seed: 17, per: 6.2 });
  ink(g, [[219, 289], [320, 319]], 2, BLK, { seed: 18 });
  // a dark hanging coil between the cartons and the plant
  curve(g, [[330, 232], [338, 280], [334, 330], [340, 380]], 3, "rgba(70,70,68,0.7)", { seed: 191 });
  g.strokeStyle = "rgba(90,90,88,0.6)"; g.lineWidth = 2; g.beginPath(); g.ellipse(352, 276, 14, 20, 0.3, 0.3, 4.6); g.stroke();
  // hanging vine from above, three leaves
  curve(g, [[414, 180], [410, 205], [404, 232], [410, 262], [410, 272]], 1.1, "rgba(150,150,145,0.55)", { seed: 19 });
  leaf(g, 402, 226, 1.62, 32, 0.74, 20); leaf(g, 428, 236, 1.5, 26, 0.7, 21); leaf(g, 412, 272, 1.55, 33, 0.78, 22);
}

// a pothos leaf: heart-shaped, pale, dark midrib; (x, y) is the stem end, ang points to the tip, s = length
function leaf(g, x, y, ang, s, v = 0.72, seed = 1) {
  const pts = [];
  for (let i = 0; i < 20; i++) {
    const t = (i / 20) * PI * 2;
    const lx = (1 - Math.cos(t)) * 0.5 * s;                                     // 0 at stem, s at tip
    const k = lx / s;
    const wdt = s * 0.36 * Math.sin(t) * (k < 0.25 ? 0.7 + k * 1.2 : 1 - 0.55 * Math.pow((k - 0.25) / 0.75, 1.6));
    pts.push([x + lx * Math.cos(ang) - wdt * Math.sin(ang), y + lx * Math.sin(ang) + wdt * Math.cos(ang)]);
  }
  blobPath(g, pts);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const gr = g.createLinearGradient(x + nx * s * 0.35, y + ny * s * 0.35, x - nx * s * 0.35, y - ny * s * 0.35);
  gr.addColorStop(0, grey(v * 0.45)); gr.addColorStop(0.45, grey(v)); gr.addColorStop(0.55, grey(v * 0.9)); gr.addColorStop(1, grey(v * 0.7));
  g.fillStyle = gr; g.fill();
  g.strokeStyle = "rgba(8,8,8,0.9)"; g.lineWidth = 1.2; g.stroke();
  const tip = [x + s * Math.cos(ang), y + s * Math.sin(ang)];
  curve(g, [[x, y], P2([x, y], tip, 0.5), P2([x, y], tip, 0.9)], Math.max(0.8, s * 0.05), "rgba(15,15,15,0.85)", { seed, ends: 0.3 });
  for (let k = 1; k <= 2; k++) for (const sd of [-1, 1]) {
    const a = P2([x, y], tip, 0.22 + k * 0.22), l = s * 0.2;
    ink(g, [a, [a[0] + Math.cos(ang + sd * 0.8) * l, a[1] + Math.sin(ang + sd * 0.8) * l]], 0.7, "rgba(20,20,20,0.55)", { seed: seed + k * 3 + sd });
  }
}

function guitarCase(g) {
  // a tall black hard case leaning left: dark front, a thick side with two lit edges, two latches
  const front = [[43, 400], [55, 389], [70, 384], [90, 383], [100, 390], [100, 447], [90, 547], [77, 650], [4, 652], [10, 540], [14, 503]];
  fillBlob(g, front, "#080808");
  stripes(g, [[40, 410], [98, 410], [80, 646], [8, 648]], { cov: fadeEdges(vg(0.22, 0.12), 0.05, 0.05, 0.15, 0.15), lum: 0.55, seed: 30, per: 6, base: false });
  curve(g, [[14, 503], [26, 450], [43, 400], [60, 386], [90, 383], [100, 392], [100, 447], [90, 547], [77, 650]], 2.2, "rgba(225,225,220,0.85)", { seed: 31, ends: 0.6 });
  const side = [[100, 390], [120, 394], [140, 400], [143, 447], [133, 547], [127, 650], [77, 650], [90, 547], [100, 447]];
  fillPoly(g, side, "#060606");
  curve(g, [[103, 393], [140, 400], [143, 447], [133, 547], [127, 648]], 2, "rgba(220,220,215,0.8)", { seed: 32 });
  ink(g, [[120, 397], [123, 450], [118, 550], [113, 650]], 2.4, "rgba(235,235,230,0.9)", { seed: 33 });
  ink(g, [[130, 400], [132, 450], [127, 550], [122, 650]], 1.8, "rgba(210,210,205,0.75)", { seed: 34 });
  for (const [x0, y0, x1, y1] of [[120, 428, 147, 455], [105, 572, 145, 602]]) {
    fillPoly(g, [[x0, y0], [x1, y0 + 2], [x1, y1], [x0, y1 - 1]], grey(0.78));
    ink(g, [[x0, y0], [x1, y0 + 2], [x1, y1], [x0, y1 - 1]], 1.6, BLK, { closed: true, seed: x0 });
    fillPoly(g, [[x0 + 6, y0 + 7], [x1 - 6, y0 + 8], [x1 - 6, y1 - 7], [x0 + 6, y1 - 7]], grey(0.3));
  }
  ink(g, [[143, 510], [143, 527]], 2, grey(0.8), { seed: 35 });
}

function plantLeft(g) {
  // a dark bowl behind, the pot, then the leaf mass trailing down the right side
  fillBlob(g, [[355, 390], [390, 380], [430, 384], [432, 400], [360, 402]], grey(0.12));
  const pot = [[435, 362], [488, 360], [484, 395], [440, 398]];
  polyPath(g, pot); const pg = g.createLinearGradient(435, 0, 488, 0); pg.addColorStop(0, grey(0.3)); pg.addColorStop(0.65, grey(0.78)); pg.addColorStop(1, grey(0.45)); g.fillStyle = pg; g.fill();
  ink(g, pot, 1.4, BLK, { closed: true, seed: 40 });
  g.fillStyle = grey(0.7); g.beginPath(); g.ellipse(461, 361, 28, 4, -0.03, 0, PI * 2); g.fill();
  const L = [
    [452, 345, -2.1, 26], [468, 342, -1.4, 26], [480, 345, -0.9, 24], [440, 350, -2.8, 26], [490, 350, -0.3, 24], [458, 352, -1.8, 22],
    [495, 336, -0.8, 25], [448, 328, -1.95, 22], [470, 330, -1.2, 22], [428, 342, 3.0, 22], [420, 356, 2.8, 18], [504, 348, 0.2, 24],
    [512, 362, 1.0, 22], [528, 360, 1.3, 22], [510, 400, 1.35, 24], [520, 422, 1.45, 24], [522, 446, 1.5, 21], [515, 466, 1.6, 18],
    [540, 392, 1.3, 26], [548, 428, 1.45, 24], [546, 452, 1.55, 20], [500, 322, -0.6, 22], [436, 318, -2.2, 22],
  ];
  L.forEach(([x, y, a, s], i) => leaf(g, x, y, a, s, 0.56 + (i % 4) * 0.06, 50 + i * 3));
  curve(g, [[488, 362], [514, 380], [528, 404], [530, 440], [520, 470]], 1.1, "rgba(160,160,155,0.6)", { seed: 49 });
}

function leftMid(g) {
  // small gear boxes behind the plant
  carton(g, [[367, 350], [405, 348], [406, 392], [368, 394]], { cov: fadeEdges(vg(0.35, 0.2)), lum: 0.65, seed: 60, rim: 0.3 });
  for (const x of [373, 386]) fillPoly(g, [[x, 352], [x + 8, 351], [x + 8, 359], [x, 360]], grey(0.85));
  // the tray lying on the stack (bright top, dark lip)
  const tray = [[228, 399], [360, 396], [374, 411], [248, 424]];
  stripes(g, tray, { dir: "h", per: 3, cov: bl(0.95, 0.95, 0.85, 0.85), lum: 0.96, seed: 61, brk: 0.2 });
  ink(g, tray, 1.8, BLK, { closed: true, seed: 62 });
  fillPoly(g, [[248, 424], [374, 411], [375, 421], [249, 434]], grey(0.3));
  // carton under the plant: a lit lid, a striped left half, a smooth right panel with dark windows
  stripes(g, [[374, 399], [500, 398], [503, 408], [375, 410]], { dir: "h", per: 3, cov: 0.8, lum: 0.92, seed: 63, brk: 0.2 });
  stripes(g, [[375, 410], [430, 409], [431, 482], [376, 484]], { cov: fadeEdges(bl(0.7, 0.6, 0.4, 0.45), 0.02, 0.05), lum: 0.9, seed: 64 });
  stripes(g, [[430, 409], [503, 408], [506, 480], [431, 482]], { cov: fadeEdges(bl(0.75, 0.7, 0.55, 0.6), 0.02, 0.05), lum: 0.88, seed: 641, per: 3.2, brk: 0.2 });
  fillPoly(g, [[431, 409], [452, 409], [452, 433], [431, 434]], "#050505");
  fillPoly(g, [[477, 410], [498, 410], [498, 432], [477, 432]], "#070707");
  ink(g, [[431, 409], [452, 409], [452, 433], [431, 434]], 1.2, "rgba(220,220,215,0.75)", { closed: true, seed: 65 });
  ink(g, [[452, 434], [452, 482]], 2, grey(0.95), { seed: 651 });
  // carton under the tray: bright grain, down to the keyboard
  // (a dark box on the left, its lit frame; the bright carton face on the right)
  stripes(g, [[243, 423], [297, 425], [297, 560], [243, 560]], { cov: fadeEdges(bl(0.12, 0.16, 0.1, 0.08), 0.03, 0.02), lum: 0.6, seed: 66 });
  ink(g, [[247, 432], [247, 500], [290, 500]], 1.6, grey(0.55), { seed: 661 });
  face(g, [[297, 425], [387, 423], [388, 560], [297, 560]], [0.88, 0.62, 0.45, 0.66], "v", { seed: 67 });
  ink(g, [[230, 423], [387, 422]], 1.6, BLK, { seed: 671 });
}

// the synth keyboard on a flight-case table, seen from the front-left; the knob module above it; cables.
// Measured at 2.5x (50 s).
function keyboardLeft(g) {
  // knob module: a dark side, a pale wooden front with a 3x7 grid of knobs, darker toward its lower right
  fillPoly(g, [[334, 474], [370, 470], [370, 560], [334, 560]], grey(0.04));
  ink(g, [[334, 474], [370, 470]], 1.3, grey(0.4), { seed: 701 });
  brush(g, [[370, 470], [508, 476], [508, 560], [370, 560]], (v) => { v.fillStyle = lg(v, 370, 470, 508, 560, [[0, 0.5], [0.6, 0.38], [1, 0.2]]); v.fillRect(368, 468, 142, 94); }, 0.05, { len: 18, w: 2, gap: 1.6, seed: 702, jit: 0.1, base: 0.8 });
  ink(g, [[370, 470], [508, 476], [508, 560], [370, 560]], 1.6, BLK, { closed: true, seed: 703 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
    const x = 394 + c * 16.5, y = 490 + r * 25 + c * 0.3;
    dot(g, x + 0.5, y + 1.5, 6.4, grey(0.02)); ring(g, x, y, 5, 1.2, grey(0.4, 0.9)); soft(g, E(x - 1, y - 1.5, 3, 2.4, 0), grey(0.5)); dot(g, x - 1.8, y - 2.4, 1.3, grey(0.95));
  }
  // cables from the bottom row, hanging down in loops
  for (const [x, dx, dy] of [[411, 8, 0], [429, 14, 10], [446, 22, -4], [477, 30, 6], [493, 10, 20]]) cable(g, [[x, 546], [x + 2, 562], [x + dx * 0.5, 594 + dy], [x + dx, 640 + dy], [x + dx + 6, 700]], 2.2, x, 0.6);
  // the keyboard: dark top panel with a knob row, the key bed, a dark lip, the big left cheek
  fillPoly(g, [[172, 558], [428, 556], [430, 600], [426, 626], [236, 626], [190, 624], [174, 602]], grey(0.03));
  face(g, [[174, 558], [428, 556], [428, 572], [236, 574]], [0.1, 0.18, 0.15, 0.14], "h", { per: 3, seed: 704 });
  for (let i = 0; i < 17; i++) { const x = 186 + i * 14.4, y = 569 - i * 0.1; fillPoly(g, [[x - 3.2, y - 7], [x + 3.2, y - 7], [x + 3.2, y + 2], [x - 3.2, y + 2]], grey(0.1)); ink(g, [[x - 2.2, y - 6], [x - 2.2, y + 1]], 1, grey(0.5, 0.7), { seed: 760 + i }); g.fillStyle = grey(0.75); g.beginPath(); g.ellipse(x, y - 7, 3.2, 1.3, 0, 0, PI * 2); g.fill(); }
  const K = [[236, 576], [424, 574], [424, 598], [238, 600]], at = (u, v) => bil(K, u, v), nw = 14;
  fillPoly(g, K, grey(0.03));
  for (let i = 0; i < nw; i++) {
    const u0 = (i + 0.08) / nw, u1 = (i + 0.92) / nw, lit = 0.62 + 0.3 * Math.sin(PI * clamp(i / nw * 1.1));
    soft(g, pth([at(u0, 0.05), at(u1, 0.05), at(u1, 1), at(u0, 1)], false), lg(g, 0, 574, 0, 598, [[0, grey(lit * 0.6)], [0.5, grey(lit)], [1, grey(lit * 0.95)]]));
  }
  for (let i = 0; i < nw - 1; i++) if ([0, 1, 3, 4, 5].includes((i + 2) % 7)) {
    const u = (i + 1) / nw, w = 0.3 / nw;
    fillPoly(g, [at(u - w, 0), at(u + w, 0), at(u + w, 0.6), at(u - w, 0.6)], grey(0.02));
    ink(g, [at(u - w * 0.7, 0.58), at(u + w * 0.7, 0.58)], 1.1, grey(0.55, 0.8), { seed: 720 + i });
  }
  face(g, [[240, 598], [424, 597], [424, 626], [236, 626]], [0.16, 0.26, 0.34, 0.08], "h", { per: 3, seed: 730 });
  ink(g, [[240, 598], [424, 597]], 1.2, grey(0.75, 0.8), { seed: 731 });
  face(g, [[172, 558], [238, 574], [240, 626], [190, 624]], [0.22, 0.25, 0.1, 0.02], "v", { per: 3.4, seed: 732 });
  ink(g, [[172, 558], [238, 574]], 1.4, grey(0.7), { seed: 733 });
  ink(g, [[172, 558], [176, 602], [190, 624]], 1.2, grey(0.45), { seed: 734 });
  // the control box at the keyboard's right end
  fillPoly(g, [[424, 585], [492, 583], [494, 624], [426, 626]], grey(0.05));
  ink(g, [[424, 585], [492, 583]], 1.4, grey(0.6), { seed: 735 });
  for (let i = 0; i < 4; i++) { dot(g, 437 + i * 16.5, 582, 3, grey(0.04)); dot(g, 437 + i * 16.5, 580.5, 1.8, grey(0.8)); }
  // the flight-case table: a lit rail, metal corner brackets, a lit leg
  face(g, [[146, 626], [488, 622], [490, 644], [146, 648]], [0.45, 0.8, 0.5, 0.3], "h", { per: 3.2, seed: 740, brk: 0.3 });
  ink(g, [[146, 626], [488, 622]], 1.3, grey(0.8), { seed: 741 });
  ink(g, [[146, 648], [490, 644]], 1.5, BLK, { seed: 742 });
  face(g, [[312, 648], [338, 648], [340, 826], [314, 826]], [0.8, 0.62, 0.45, 0.62], "v", { per: 3, seed: 743, brk: 0.25 });
  ink(g, [[338, 648], [340, 826]], 1.4, BLK, { seed: 744 });
  for (const [pts, bx, by] of [[[[298, 624], [352, 622], [354, 648], [340, 664], [318, 666], [300, 650]], 333, 638], [[[470, 622], [492, 621], [492, 660], [474, 658]], 484, 632]]) {
    soft(g, pth(pts, false), lg(g, pts[0][0], 622, pts[1][0], 664, [[0, 0.9], [1, 0.55]])); ink(g, pts, 1.5, BLK, { closed: true, seed: bx });
    dot(g, bx, by, 4.5, grey(0.07)); ring(g, bx, by, 4.5, 1.2, grey(0.5)); dot(g, bx - 1, by - 1, 1.4, grey(0.85));
  }
  fillPoly(g, [[146, 628], [164, 628], [164, 648], [146, 648]], grey(0.65));
  // cable loops round the keyboard's left end and down over the cartons
  curve(g, [[153, 534], [172, 540], [180, 560]], 2.4, "rgba(215,215,210,0.8)", { seed: 750 });
  cable(g, [[172, 652], [196, 660], [206, 690], [204, 722], [198, 746]], 3.4, 751, 0.8);
}
function face(g, q, [a, b, c, d], dir = "v", o = {}) { stripes(g, q, { cov: bl(a, b, c, d), lum: 1, dir, ...o }); }

function leftLow(g) {
  // upper carton: a dim side face on the left, a bright front
  face(g, [[14, 656], [72, 655], [72, 752], [14, 752]], [0.16, 0.18, 0.16, 0.12], "v", { seed: 800 });
  face(g, [[72, 655], [172, 655], [172, 752], [72, 752]], [0.66, 0.46, 0.42, 0.62], "v", { seed: 801 });
  ink(g, [[14, 656], [172, 655]], 1.8, grey(0.9), { seed: 802 });
  ink(g, [[72, 656], [72, 752]], 1.6, BLK, { seed: 803 });
  // a small device on top of it
  fillPoly(g, [[145, 648], [200, 650], [202, 680], [148, 678]], grey(0.2)); ink(g, [[145, 648], [200, 650]], 1.4, grey(0.8), { seed: 804 });
  // lower carton with a lifted flap
  face(g, [[14, 753], [75, 752], [75, 870], [14, 870]], [0.14, 0.16, 0.1, 0.1], "v", { seed: 804 });
  face(g, [[75, 752], [232, 752], [232, 870], [75, 870]], [0.5, 0.5, 0.36, 0.4], "v", { seed: 805 });
  ink(g, [[14, 753], [232, 752]], 1.8, grey(0.9), { seed: 806 });
  ink(g, [[75, 753], [75, 870]], 1.6, BLK, { seed: 807 });
  stripes(g, [[95, 745], [210, 744], [215, 754], [98, 755]], { dir: "h", per: 3, cov: 0.85, lum: 0.92, seed: 808 });
  // small boxes on the floor to its right
  fillPoly(g, [[250, 826], [290, 824], [291, 862], [251, 863]], grey(0.55)); ink(g, [[250, 826], [290, 824], [291, 862], [251, 863]], 1.3, BLK, { closed: true, seed: 809 });
  dot(g, 280, 815, 4, grey(0.75));
  // pedal: pale wooden box, four knobs on top, jacks in front
  stripes(g, [[272, 812], [366, 812], [368, 830], [270, 830]], { dir: "h", per: 3, cov: 0.8, lum: 0.9, seed: 810 });
  stripes(g, [[270, 830], [368, 830], [370, 862], [272, 862]], { dir: "h", per: 3, cov: 0.9, lum: 0.9, seed: 811 });
  ink(g, [[270, 830], [368, 830]], 1.4, BLK, { seed: 812 });
  for (const x of [281, 305, 320, 343]) { fillPoly(g, [[x - 6, 800], [x + 6, 800], [x + 6, 816], [x - 6, 816]], "#0b0b0b"); g.fillStyle = grey(0.85); g.beginPath(); g.ellipse(x, 800, 6, 2.4, 0, 0, PI * 2); g.fill(); }
  for (const x of [290, 306, 348, 362]) dot(g, x, 846, 3, "#111");
}

// a big pale box of records leaning at the left, the white amp in front of it with a black lid and a headphone
// band looped over it, thick black cables across (measured at 3x, 50 s)
function ampGroup(g) {
  // records box: a narrow darker left face, a bright front
  face(g, [[368, 708], [390, 708], [390, 845], [370, 845]], [0.55, 0.6, 0.45, 0.4], "v", { per: 3.4, seed: 820 });
  brush(g, [[390, 708], [447, 708], [447, 845], [390, 845]], (v) => { v.fillStyle = lg(v, 390, 0, 447, 0, [[0, 0.95], [0.7, 0.9], [1, 0.7]]); v.fillRect(388, 706, 62, 142); }, PI / 2, { len: 24, w: 2, gap: 1.6, seed: 821, jit: 0.06, base: 0.8 });
  ink(g, [[368, 708], [447, 708], [447, 845], [370, 845]], 1.5, BLK, { closed: true, seed: 822 });
  ink(g, [[390, 708], [390, 845]], 1.2, grey(0.3, 0.8), { seed: 823 });
  // amp: black lid with a pale top plate and a label; pale front with a logo and a slot; a line; the grained lower body
  fillPoly(g, [[437, 718], [590, 718], [592, 738], [440, 738]], grey(0.05));
  stripes(g, [[480, 709], [563, 709], [566, 720], [478, 721]], { dir: "h", per: 2.6, cov: 0.7, lum: 0.9, seed: 824 });
  fillPoly(g, [[500, 727], [517, 727], [517, 736], [500, 736]], grey(0.7));
  face(g, [[440, 738], [467, 738], [467, 847], [443, 847]], [0.6, 0.72, 0.6, 0.45], "v", { per: 3, seed: 825 });
  brush(g, [[467, 738], [590, 738], [590, 847], [467, 847]], (v) => { v.fillStyle = lg(v, 467, 738, 590, 847, [[0, 0.97], [0.6, 0.9], [1, 0.72]]); v.fillRect(465, 736, 128, 114); }, PI / 2, { len: 20, w: 2, gap: 1.5, seed: 826, jit: 0.08, base: 0.82 });
  ink(g, [[440, 738], [590, 738], [590, 847], [443, 847]], 1.5, BLK, { closed: true, seed: 827 });
  ink(g, [[467, 738], [467, 847]], 1.1, grey(0.35, 0.8), { seed: 828 });
  ink(g, [[443, 777], [590, 776]], 1.2, grey(0.3, 0.8), { seed: 829 });
  ink(g, [[474, 767], [480, 756], [486, 767]], 1.5, grey(0.2, 0.9), { seed: 830 }); ink(g, [[476, 763], [484, 763]], 1.1, grey(0.2, 0.9), { seed: 831 });
  fillPoly(g, [[560, 756], [583, 755], [583, 760], [560, 761]], grey(0.15));
  // the headphone band looped over the amp: a padded lit arc and a dark cup
  cable(g, [[532, 712], [538, 684], [556, 668], [584, 666], [606, 676], [616, 700], [620, 740], [612, 790], [602, 812]], 7, 832, 0.85);
  soft(g, E(540, 690, 9, 14, 0.3), grey(0.08)); ring(g, 540, 690, 8, 1.4, grey(0.5));
  // thick black cables across the boxes
  cable(g, [[372, 840], [410, 806], [456, 752], [490, 712], [512, 688]], 5.5, 834, 0.6);
  cable(g, [[470, 852], [520, 838], [570, 826], [620, 820], [690, 812]], 4.5, 836, 0.5);
}

// ======================================================================================
// LEFT-CENTRE: speaker with books, rack unit, crate with books, pedalboard, the DO NOT KNOCK plate
// ======================================================================================
function book(g, pts, { lum = 0.95, cov = 0.85, seed = 1, spine = 0.25, k = 1 } = {}) {
  // a closed book seen edge-on: page edges as fine horizontal lines, a darker spine end on the left
  stripes(g, pts, { dir: "h", per: 2.6, cov: (u, v) => k * cov * lerp(spine / cov, 1, sstep(0, 0.18, u)) * (1 - 0.25 * v), lum, seed, brk: 0.2, jit: 0.2, wav: 0.2 });
  ink(g, pts, 1.3, BLK, { closed: true, seed: seed + 1 });
}
function speakerL(g) {
  // books on top
  book(g, [[553, 447], [648, 445], [650, 461], [554, 462]], { seed: 1001, k: 0.75 });
  book(g, [[532, 461], [655, 459], [657, 476], [533, 477]], { seed: 1003, k: 0.8 });
  book(g, [[537, 476], [664, 475], [666, 490], [538, 491]], { seed: 1005, k: 0.75 });
  book(g, [[527, 490], [668, 489], [669, 503], [528, 504]], { seed: 1007, lum: 0.9, k: 0.7 });
  // cabinet: dark wooden front, a lit side with vertical grain, a thin lit top
  brush(g, [[521, 505], [633, 505], [633, 704], [521, 704]], (v) => { v.fillStyle = lg(v, 521, 0, 633, 0, [[0, 0.2], [0.5, 0.16], [1, 0.12]]); v.fillRect(520, 504, 115, 202); }, PI / 2,
    { len: 26, w: 2.2, gap: 2, seed: 1010, jit: 0.06, base: 0.6 });
  face(g, [[633, 505], [700, 511], [700, 628], [633, 628]], [0.62, 0.6, 0.5, 0.58], "v", { per: 4, seed: 1011, brk: 0.3 });
  stripes(g, [[521, 499], [633, 499], [700, 505], [633, 505]], { dir: "h", per: 2.6, cov: 0.7, lum: 0.9, seed: 1014 });
  ink(g, [[633, 505], [633, 704]], 1.5, BLK, { seed: 1012 });
  ink(g, [[521, 505], [633, 505], [700, 511]], 1.4, grey(0.75), { seed: 1013 });
  ink(g, [[521, 505], [521, 704]], 1.2, grey(0.35), { seed: 1015 });
  driver(g, 577, 540, 15, "tweeter");
  driver(g, 577, 613, 45, "woofer");
  // the tall rack unit beside it
  face(g, [[678, 447], [710, 447], [712, 515], [680, 515]], [0.45, 0.3, 0.3, 0.4], "v", { per: 3.4, seed: 1020 });
  ink(g, [[678, 447], [710, 447], [712, 515], [680, 515]], 1.4, BLK, { closed: true, seed: 1021 });
  for (const y of [470, 490]) { dot(g, 693, y, 4, "#0a0a0a"); ring(g, 693, y, 4.2, 1.2, grey(0.7)); }
}
function driver(g, cx, cy, r, kind) {
  if (kind === "woofer") {
    dot(g, cx, cy, r, grey(0.05));
    ring(g, cx, cy, r - 1.5, 2, grey(0.35));
    ring(g, cx, cy, r * 0.82, 3, grey(0.12));
    // the cone: pale, lit from the upper left, with fine radial streaks
    soft(g, E(cx, cy, r * 0.74, r * 0.74, 0), rg(g, cx - r * 0.2, cy - r * 0.25, r * 0.1, r * 0.8, [[0, 0.9], [0.55, 0.78], [1, 0.4]]));
    g.save(); g.beginPath(); g.arc(cx, cy, r * 0.74, 0, PI * 2); g.clip();
    const rr = rng(Math.round(cx * 7 + cy));
    for (let i = 0; i < 70; i++) { const a = rr() * PI * 2, l0 = r * (0.3 + rr() * 0.15), l1 = r * (0.55 + rr() * 0.2); ink(g, [[cx + Math.cos(a) * l0, cy + Math.sin(a) * l0], [cx + Math.cos(a) * l1, cy + Math.sin(a) * l1]], 1, grey(rr() < 0.5 ? 0.3 : 0.95, 0.35), { seed: 3000 + i }); }
    g.restore();
    dot(g, cx, cy, r * 0.3, grey(0.05));
    soft(g, E(cx - r * 0.08, cy - r * 0.1, r * 0.12, r * 0.09, 0), grey(0.35));
    ring(g, cx, cy, r * 0.74, 1.2, grey(0.25));
  } else {
    dot(g, cx, cy, r, grey(0.05));
    ring(g, cx, cy, r - 1, 1.4, grey(0.3));
    soft(g, E(cx, cy, r * 0.62, r * 0.62, 0), rg(g, cx - r * 0.25, cy - r * 0.25, 1, r * 0.7, [[0, 0.4], [1, 0.08]]));
    dot(g, cx - r * 0.12, cy - r * 0.15, r * 0.14, grey(0.9));
  }
}

function crateAndBooks(g) {
  // device and book pile on the crate
  book(g, [[635, 628], [765, 626], [766, 643], [636, 644]], { seed: 1101 });
  book(g, [[640, 643], [770, 642], [771, 665], [641, 666]], { seed: 1103 });
  book(g, [[640, 665], [760, 664], [761, 683], [641, 684]], { seed: 1105 });
  book(g, [[630, 683], [765, 682], [766, 700], [631, 701]], { seed: 1107, lum: 0.9 });
  fillPoly(g, [[675, 610], [760, 610], [761, 628], [676, 628]], grey(0.62));
  ink(g, [[675, 610], [760, 610], [761, 628], [676, 628]], 1.3, BLK, { closed: true, seed: 1109 });
  fillPoly(g, [[688, 615], [704, 615], [704, 623], [688, 623]], "#080808");
  for (let i = 0; i < 3; i++) dot(g, 691 + i * 5, 619, 1.2, grey(0.9));
  // milk crate: pale rim with handle slots, posts, a diamond lattice over black
  fillPoly(g, [[628, 700], [765, 700], [765, 815], [628, 815]], "#050505");
  stripes(g, [[628, 700], [765, 700], [765, 714], [628, 714]], { dir: "h", per: 2.8, cov: 0.8, lum: 0.9, seed: 1110, brk: 0.1 });
  for (const [x0, x1] of [[636, 656], [668, 700], [710, 740], [750, 760]]) fillPoly(g, [[x0, 702], [x1, 702], [x1, 711], [x0, 711]], "#070707");
  g.save(); g.beginPath(); g.rect(642, 714, 108, 90); g.clip();
  for (let i = -3; i < 7; i++) {
    ink(g, [[642 + i * 30, 804], [642 + i * 30 + 90, 714]], 2.2, grey(0.7), { seed: 1120 + i, jit: 0.2 });
    ink(g, [[642 + i * 30, 714], [642 + i * 30 + 90, 804]], 2.2, grey(0.7), { seed: 1140 + i, jit: 0.2 });
  }
  g.restore();
  fillBlob(g, [[676, 716], [720, 716], [724, 728], [672, 728]], "#040404");
  ink(g, [[676, 716], [720, 716], [724, 728], [672, 728]], 1.2, grey(0.7), { closed: true, seed: 1160 });
  for (const [x0, x1] of [[628, 642], [750, 765]]) stripes(g, [[x0, 714], [x1, 714], [x1, 815], [x0, 815]], { per: 3, cov: ug(0.85, 0.5), lum: 0.9, seed: 1161 + x0 });
  ink(g, [[628, 815], [765, 815]], 1.4, grey(0.5), { seed: 1165 });
  // a second crate behind, to the right (dark lattice)
  g.save(); g.beginPath(); g.rect(766, 700, 34, 110); g.clip();
  for (let i = 0; i < 4; i++) ink(g, [[766, 720 + i * 26], [800, 700 + i * 26]], 1.4, grey(0.35), { seed: 1170 + i });
  g.restore();
}
function pedalboard(g) {
  fillPoly(g, [[572, 830], [692, 828], [694, 870], [570, 872]], "#070707");
  ink(g, [[572, 832], [692, 830]], 2, grey(0.8), { seed: 1201 });
  ink(g, [[692, 830], [694, 870]], 1.4, grey(0.5), { seed: 1202 });
  for (let i = 0; i < 7; i++) { const x = 588 + i * 15; g.fillStyle = grey(0.82); g.beginPath(); g.ellipse(x, 826, 5, 2.4, 0, 0, PI * 2); g.fill(); }
  for (const [x, y] of [[640, 853], [700, 856], [730, 850]]) { dot(g, x, y, 3.5, grey(0.25)); ring(g, x, y, 3.8, 1, grey(0.7)); }
  // small pale pedals to its right
  for (const [x0, y0, w, h] of [[740, 806, 40, 26], [782, 810, 22, 22]]) { fillPoly(g, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], grey(0.78)); ink(g, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], 1.2, BLK, { closed: true, seed: x0 }); dot(g, x0 + 10, y0 + 8, 3, "#111"); }
}
function doNotKnock(g) {
  // a dark plate hung crooked on a string, dim grey lettering (partly behind the headline's T)
  const sgn = [[600, 194], [817, 171], [827, 270], [611, 293]];
  ink(g, [[622, 190], [706, 150], [800, 173]], 1.1, grey(0.3, 0.7), { seed: 1300 });
  fillPoly(g, sgn, "#070707");
  blurDraw(g, [590, 160, 840, 300], 0.6, (c) => {
    ink(c, sgn, 2.4, grey(0.62), { closed: true, seed: 1301 });
    c.save(); c.translate(611, 293); c.rotate(-0.106);
    for (const [x, y] of [[10, -12], [206, -12]]) ring(c, x, y, 3.3, 1.3, grey(0.6));
    c.font = "400 32px Geist"; c.fontStretch = "condensed"; c.fillStyle = grey(0.5); c.letterSpacing = "1px";
    c.save(); c.scale(0.74, 1.02); c.fillText("DO NOT KNOCK.", 17, -28); c.restore();
    c.font = "500 16px Geist"; c.fillStyle = grey(0.36, 0.7); c.fillText("MIXING.", 112, -76);
    c.letterSpacing = "0px"; c.fontStretch = "normal";
    c.restore();
  });
}

// ======================================================================================
// CENTRE: the desk, the designer, laptop, mug, lamp and the gear on the desk
// ======================================================================================
function wallLight(g) {
  // the lamp throws a pool of light on the wall below and left of its mouth: patterned wallpaper (swirls)
  // catching it, brightest by the mouth, fading out by x 1290 / y 440
  g.save();
  g.beginPath(); g.ellipse(1338, 388, 58, 58, 0, 0, PI * 2); g.clip();
  const r = rng(1401);
  for (let i = 0; i < 520; i++) {
    const a = r() * PI * 2, d = Math.sqrt(r()) * 60;
    const x = 1338 + Math.cos(a) * d, y = 388 + Math.sin(a) * d;
    const fall = clamp(1 - Math.hypot(x - 1350, y - 372) / 66);
    g.strokeStyle = grey(0.2 + 0.55 * fall, 0.2 + 0.6 * fall); g.lineWidth = 0.9 + fall * 0.6;
    const rr = 2 + r() * 3.5, a0 = r() * 6;
    g.beginPath(); g.arc(x, y, rr, a0, a0 + 3.2 + r() * 1.5); g.stroke();
  }
  g.restore();
}

function deskUnder(g) {
  // chair seat (dark slats) between his knees
  stripes(g, [[1030, 646], [1135, 646], [1138, 668], [1028, 668]], { per: 4, cov: 0.35, lum: 0.6, seed: 1410 });
  // left trestle: leg plank, a brace up to the top, a thin post behind, a foot bar
  stripes(g, [[823, 545], [845, 545], [838, 858], [813, 858]], { per: 3.2, cov: fadeEdges(ug(0.95, 0.4), 0, 0.03), lum: 0.93, seed: 1411, brk: 0.2 });
  ink(g, [[845, 545], [838, 858]], 1.4, BLK, { seed: 1412 });
  face(g, [[892, 560], [908, 560], [906, 840], [890, 840]], [0.3, 0.2, 0.12, 0.2], "v", { per: 3, seed: 1414 });
  face(g, [[848, 590], [890, 558], [896, 566], [852, 600]], [0.4, 0.3, 0.2, 0.3], "h", { per: 3, seed: 1416 });
  stripes(g, [[840, 800], [895, 800], [895, 812], [840, 812]], { dir: "h", per: 3, cov: 0.5, lum: 0.75, seed: 1415 });
  dot(g, 831, 614, 5.5, "#0c0c0c"); ring(g, 831, 614, 5.5, 1.4, grey(0.85)); dot(g, 831, 614, 2, grey(0.8));
  // right trestle: main leg, the long splayed plank, braces
  stripes(g, [[1298, 556], [1320, 556], [1280, 832], [1258, 830]], { dir: "v", per: 3.2, cov: fadeEdges(ug(0.9, 0.35), 0, 0.03), lum: 0.9, seed: 1420, brk: 0.2 });
  stripes(g, [[1342, 552], [1356, 552], [1350, 700], [1338, 700]], { per: 3.2, cov: 0.35, lum: 0.7, seed: 1421 });
  stripes(g, [[1395, 562], [1405, 556], [1436, 600], [1430, 608]], { dir: "h", per: 3, cov: 0.5, lum: 0.75, seed: 1422 });
  stripes(g, [[1433, 548], [1457, 548], [1465, 865], [1446, 865]], { per: 3.2, cov: fadeEdges(ug(0.95, 0.5), 0, 0.03), lum: 0.93, seed: 1423, brk: 0.2 });
  ink(g, [[1457, 548], [1465, 865]], 1.4, BLK, { seed: 1424 });
  dot(g, 1444, 617, 5.5, "#0c0c0c"); ring(g, 1444, 617, 5.5, 1.4, grey(0.85)); dot(g, 1444, 617, 2, grey(0.8));
}

// ---------- the designer ----------
function soft(g, path, fill, blur = 0, alpha = 1) {
  const draw = (c) => { c.beginPath(); path(c); c.fillStyle = fill; c.fill(); };
  g.save(); g.globalAlpha = alpha;
  if (blur && path.bb) blurDraw(g, path.bb, blur, draw);
  else if (blur) blurDraw(g, [0, 0, PW, PH], blur, draw); else draw(g);
  g.restore();
}
const pth = (pts, smooth = true) => Object.assign((g) => { if (smooth) smoothPath(g, pts, true); else { g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); } }, { bb: bboxOf(pts, 4) });
const lg = (g, x0, y0, x1, y1, stops) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, typeof v === "number" ? grey(v) : v)); return r; };
const rg = (g, x, y, r0, r1, stops, sy = 1) => { const r = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, v]) => r.addColorStop(o, typeof v === "number" ? grey(v) : v)); return r; };

// an engraved region whose lines follow an angle field ang(x, y) (slowly varying)
const fieldCoord = (angF) => (x, y) => { const a = angF(x, y), c = Math.cos(a), s = Math.sin(a); return [-s * x + c * y, c * x + s * y]; };

// The trousers: baggy grey cargo trousers. The thighs recede into the dark under the desk; the lower legs catch
// the laptop light in zig-zag fold ridges above the bunched hems; black creases. The silhouettes and the light
// masses were measured on value maps of the source (50 s); painted as a value study and brushed along the folds.
function pants(g) {
  const legs = [
    { pts: [[936, 552], [1000, 556], [1040, 558], [1034, 580], [1026, 610], [1030, 640], [1036, 670], [1042, 695], [1058, 722], [1060, 745], [1064, 768], [1060, 786], [1030, 792], [990, 790],
      [955, 786], [938, 776], [928, 750], [921, 725], [917, 690], [918, 640], [921, 600], [928, 572]], box: [912, 548, 1070, 796], seed: 1500,
      hi: [[[942, 640], [954, 671], [966, 684], [981, 707], [995, 715], [977, 737], [965, 749], [986, 761], [1005, 761], [1026, 770], [995, 749], [1015, 737], [1050, 730], [1057, 724],
        [1001, 655], [1019, 688], [1043, 721], [1021, 722], [1009, 719], [1020, 705], [975, 662], [967, 675]], [[1020, 750], [1041, 765], [1030, 772], [1037, 782], [1018, 782], [1049, 795], [1052, 777], [1056, 765], [1032, 747]], [[1005, 624], [1011, 638], [1020, 635], [1011, 622]]],
      folds: [[[930, 575], [950, 610], [972, 648], [992, 690]], [[962, 562], [984, 600], [1004, 634]], [[1000, 562], [1014, 590], [1022, 616]], [[925, 700], [940, 730], [952, 752]]],
      lo: [[[922, 600], [924, 650], [926, 700]], [[1002, 648], [986, 628], [968, 598]], [[996, 718], [1016, 730], [1040, 740]], [[960, 758], [990, 770], [1018, 778]], [[986, 700], [976, 718], [966, 736]]] },
    { pts: [[1158, 552], [1215, 552], [1265, 556], [1272, 585], [1280, 615], [1288, 640], [1286, 665], [1272, 690], [1262, 715], [1250, 740], [1254, 765], [1240, 786], [1200, 792], [1160, 792],
      [1124, 790], [1122, 770], [1130, 745], [1132, 722], [1150, 695], [1154, 670], [1160, 630], [1162, 595], [1162, 570]], box: [1116, 548, 1292, 796], seed: 1520,
      hi: [[[1220, 665], [1206, 683], [1193, 699], [1180, 724], [1161, 734], [1149, 750], [1134, 761], [1143, 765], [1167, 748], [1204, 742], [1231, 757], [1224, 767], [1251, 768], [1237, 720], [1233, 748], [1206, 734], [1218, 700]],
        [[1190, 656], [1178, 669], [1154, 703], [1152, 718], [1163, 718], [1187, 693], [1192, 665]], [[1242, 641], [1230, 667], [1228, 683], [1244, 695], [1266, 704], [1260, 687], [1242, 683]],
        [[1196, 608], [1182, 628], [1175, 633], [1188, 637], [1200, 613]], [[1250, 617], [1276, 645], [1278, 640], [1272, 632]], [[1174, 761], [1203, 769], [1212, 766], [1199, 761]]],
      folds: [[[1250, 566], [1232, 604], [1214, 640], [1196, 676]], [[1214, 560], [1196, 596], [1180, 630]], [[1180, 562], [1170, 590], [1164, 616]], [[1276, 690], [1262, 720], [1252, 746]]],
      lo: [[[1276, 600], [1284, 640], [1280, 670]], [[1170, 650], [1182, 628], [1196, 600]], [[1188, 730], [1170, 742], [1146, 752]], [[1150, 772], [1190, 776], [1226, 774]], [[1216, 700], [1224, 720], [1232, 738]]] },
  ];
  for (const leg of legs) {
    const f = curveField([...leg.folds, ...leg.lo, ...leg.hi.map((h) => h.slice(0, 3))], leg.box, 6);
    brush(g, leg.pts, (v) => {
      v.fillStyle = lg(v, 0, 548, 0, 796, [[0, 0.14], [0.25, 0.23], [0.55, 0.28], [1, 0.22]]); v.fillRect(leg.box[0] - 10, 540, 200, 262);
      for (const c of leg.folds) vLineC(v, c, 7, 0.45, 2.5);
      for (const h of leg.hi) { blurDraw(v, bboxOf(h, 8), 2.5, (c) => { c.beginPath(); smoothPath(c, h, true); c.fillStyle = grey(0.62); c.fill(); }); blurDraw(v, bboxOf(h, 4), 0.7, (c) => { c.beginPath(); smoothPath(c, h, true); c.fillStyle = grey(0.92); c.fill(); }); }
      for (const c of leg.lo) vLineC(v, c, 8, 0.03, 2.5);
    }, (x, y) => f(x, y), { len: 15, w: 2.3, gap: 1.6, seed: leg.seed + 1, jit: 0.3, base: 0.55 });
    for (const [i, c] of leg.lo.entries()) curve(g, c, 2, grey(0.02, 0.85), { seed: leg.seed + 10 + i, ends: 0.1 });
    for (const [i, h] of leg.hi.entries()) curve(g, h, 1.1, grey(0.03, 0.55), { closed: true, seed: leg.seed + 40 + i, ends: 0.6 });
    curve(g, leg.pts, 1.8, grey(0.02), { closed: true, seed: leg.seed + 30, ends: 0.9 });
  }
  // the cargo pocket on the right leg's outer side
  const flap = [[1242, 612], [1270, 606], [1284, 640], [1282, 690], [1268, 712], [1248, 700], [1240, 660]];
  curve(g, flap, 1.5, grey(0.03, 0.9), { closed: true, seed: 1540, ends: 0.9 });
  // the dark lap between the legs; the chair seat between his knees; its dark leg
  soft(g, pth([[1040, 552], [1160, 552], [1160, 600], [1150, 640], [1036, 640], [1030, 600]]), grey(0.03));
  stripes(g, [[1046, 652], [1138, 652], [1140, 671], [1044, 671]], { per: 3.4, cov: bl(0.42, 0.5, 0.3, 0.25), lum: 0.9, seed: 1541, dir: "h", brk: 0.2 });
  ink(g, [[1046, 652], [1138, 652]], 1.2, grey(0.7), { seed: 1542 });
  fillPoly(g, [[1078, 672], [1096, 672], [1094, 770], [1080, 770]], grey(0.05));
}
// a blurred value stroke along a smooth curve (value studies)
function vLineC(v, pts, w, val, blur) { blurDraw(v, bboxOf(pts, w), blur, (c) => curve(c, pts, w, grey(val), { seed: 5, ends: 0.3, jit: 0 })); }

// Hiking sneakers seen from the front, toes toward us (our left shoe's toe to the lower left, our right shoe's to
// the lower right): dark suede uppers, white laces tied in bows, a tongue with a pale tab, a pale rubber toe cap and
// a thick pale sole with dark lugs. Measured at 4x (50 s).
function shoes(g) {
  const S = [
    { up: [[945, 846], [939, 814], [950, 791], [970, 778], [1000, 773], [1030, 779], [1052, 795], [1063, 820], [1063, 846], [1030, 852], [990, 850]], tongue: [[972, 768], [1011, 767], [1013, 789], [970, 790]],
      toe: [[902, 850], [907, 833], [924, 823], [950, 821], [968, 825], [979, 838], [977, 853], [950, 858], [918, 858]],
      soleF: [[897, 852], [922, 848], [962, 852], [996, 853], [1001, 864], [998, 878], [960, 877], [920, 875], [899, 868]], soleS: [[994, 853], [1030, 848], [1063, 842], [1065, 860], [1060, 871], [1030, 873], [1000, 877]],
      lugF: [900, 998, 864, 877], lugS: [1004, 1060, 860, 871],
      bowL: [[986, 800], [966, 790], [950, 794], [960, 806], [984, 803]], bowR: [[990, 799], [1006, 789], [1022, 794], [1014, 808], [994, 803]], tails: [[[984, 804], [974, 814], [968, 822]], [[992, 804], [1000, 814], [1004, 824]]],
      cross: [[[952, 810], [976, 806], [1000, 810]], [[956, 818], [978, 814], [1004, 818]], [[962, 826], [982, 823], [1006, 826]]], lit: [0.34, 0.2], seed: 1560 },
    { up: [[1126, 844], [1124, 807], [1138, 787], [1162, 774], [1195, 772], [1225, 782], [1240, 802], [1243, 830], [1226, 840], [1180, 840]], tongue: [[1162, 768], [1200, 767], [1203, 790], [1160, 791]],
      toe: [[1174, 838], [1195, 831], [1225, 832], [1242, 840], [1249, 853], [1236, 861], [1200, 861], [1180, 853]],
      soleF: [[1148, 853], [1180, 857], [1246, 853], [1253, 863], [1250, 881], [1200, 883], [1160, 881], [1146, 867]], soleS: [[1117, 843], [1150, 849], [1152, 867], [1140, 869], [1118, 863]],
      lugF: [1150, 1250, 868, 881], lugS: [1120, 1150, 856, 867],
      bowL: [[1182, 802], [1164, 794], [1148, 800], [1158, 812], [1180, 806]], bowR: [[1188, 801], [1206, 792], [1226, 798], [1216, 812], [1192, 806]], tails: [[[1182, 806], [1172, 818], [1166, 828]], [[1190, 806], [1200, 818], [1206, 828]]],
      cross: [[[1148, 816], [1176, 812], [1204, 816]], [[1152, 824], [1180, 820], [1210, 824]], [[1158, 832], [1184, 829], [1214, 832]]], lit: [0.3, 0.18], seed: 1580 },
  ];
  for (const s of S) {
    const [x0, , x1] = bboxOf(s.up);
    const cx = (x0 + x1) / 2;
    brush(g, s.up, (v) => { v.fillStyle = lg(v, 0, 772, 0, 850, [[0, s.lit[0] + 0.1], [0.4, s.lit[0]], [1, s.lit[1]]]); v.fillRect(x0 - 5, 765, x1 - x0 + 10, 95); }, (x, y) => Math.atan2(y - 760, x - cx) + PI / 2,
      { len: 9, w: 2, gap: 1.5, seed: s.seed, smooth: true, jit: 0.5, base: 0.6 });
    curve(g, s.up, 1.6, grey(0.02), { closed: true, seed: s.seed + 1, ends: 0.9 });
    // the padded collar round the ankle catches a little light
    curve(g, s.up.slice(1, 7), 2, grey(0.55, 0.7), { seed: s.seed + 40, ends: 0.4 });
    // tongue and its tab
    fillBlob(g, s.tongue, grey(0.28)); curve(g, s.tongue, 1.2, grey(0.03), { closed: true, seed: s.seed + 2 });
    const tx = (s.tongue[0][0] + s.tongue[1][0]) / 2, ty = (s.tongue[0][1] + s.tongue[2][1]) / 2;
    fillBlob(g, [[tx - 9, ty - 6], [tx + 9, ty - 6], [tx + 9, ty + 2], [tx - 9, ty + 2]], grey(0.72));
    // laces
    const lw = grey(0.95);
    for (const c of s.cross) { curve(g, c, 3.8, grey(0.03), { seed: s.seed + 3 }); curve(g, c, 2.4, lw, { seed: s.seed + 4 }); }
    for (const c of [s.bowL, s.bowR]) { curve(g, c, 4, grey(0.03), { seed: s.seed + 5 }); curve(g, c, 2.6, lw, { seed: s.seed + 6 }); }
    for (const c of s.tails) { curve(g, c, 3.6, grey(0.03), { seed: s.seed + 7 }); curve(g, c, 2.3, lw, { seed: s.seed + 8 }); }
    // pale rubber: the side of the sole, the front of the sole, the toe cap
    for (const [q, a, b, ang, sd] of [[s.soleS, 0.72, 0.45, PI / 2, 9], [s.soleF, 0.95, 0.6, PI / 2, 10], [s.toe, 0.96, 0.66, 0.2, 11]]) {
      const bb = bboxOf(q);
      brush(g, q, (v) => { v.fillStyle = lg(v, 0, bb[1], 0, bb[3], [[0, a], [1, b]]); v.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); }, ang, { len: 8, w: 2.2, gap: 1.4, seed: s.seed + sd, smooth: true, jit: 0.4, base: 0.7 });
      curve(g, q, 1.4, grey(0.03), { closed: true, seed: s.seed + 20 + sd, ends: 0.9 });
    }
    for (const [lx0, lx1, ly0, ly1] of [s.lugF, s.lugS]) for (let i = 0, n = Math.round((lx1 - lx0) / 7); i <= n; i++) {
      const x = lerp(lx0 + 3, lx1 - 3, i / n); ink(g, [[x, ly0], [x, ly1]], 2.2, grey(0.05, 0.85), { seed: s.seed + 50 + i });
    }
  }
}
function torso(g) {
  // an open white shirt over a dark tee, glowing in the laptop light: brightest low on the chest, greyer at the
  // shoulders, crisp dark outline; collar flaps, shoulder seams, sleeve folds. Measured at 3x (50 s).
  const T = [[920, 525], [920, 480], [921, 452], [924, 432], [929, 412], [937, 395], [950, 381], [966, 371], [984, 365], [1002, 360], [1070, 356], [1134, 356],
    [1150, 362], [1167, 372], [1184, 384], [1198, 400], [1206, 418], [1212, 438], [1220, 455], [1231, 468], [1242, 481], [1248, 495], [1250, 510], [1250, 525]];
  fillBlob(g, T, grey(0.62));
  g.save(); g.beginPath(); smoothPath(g, T, true); g.clip();
  soft(g, pth(T), rg(g, 1070, 490, 20, 230, [[0, 0.98], [0.3, 0.95], [0.55, 0.88], [0.8, 0.78], [1, 0.68]]));
  soft(g, pth([[912, 440], [930, 400], [950, 384], [946, 430], [936, 480], [930, 530], [912, 530]]), grey(0.55), 8, 0.7);        // his right flank
  soft(g, pth([[1186, 396], [1212, 430], [1244, 482], [1254, 530], [1222, 530], [1200, 470], [1180, 420]]), grey(0.6), 8, 0.75); // his left side and sleeve
  // the dark tee in the collar's V, fading into the glow low on the chest
  const tee = [[1040, 372], [1100, 370], [1112, 400], [1104, 428], [1090, 446], [1072, 452], [1054, 444], [1040, 424], [1034, 398]];
  soft(g, pth(tee), lg(g, 0, 372, 0, 452, [[0, 0.72], [0.25, 0.97], [0.75, 0.97], [1, 0.84]]), 3);
  // collar flaps and the shirt's front edges
  soft(g, pth([[1004, 360], [1000, 392], [998, 420], [1014, 438], [1034, 420], [1040, 380]]), grey(0.9), 2, 0.8);
  soft(g, pth([[1134, 356], [1138, 392], [1136, 420], [1122, 440], [1106, 424], [1102, 380]]), grey(0.86), 2, 0.8);
  soft(g, pth([[960, 432], [1180, 432], [1180, 456], [960, 456]]), grey(0.7), 5, 0.75);                     // the chest just above the laptop lid
  // soft fold shadows: shoulder seams, sleeve creases, the chest
  const sf = [[[944, 398], [970, 386], [1000, 378]], [[1150, 372], [1172, 382], [1194, 398]], [[1160, 400], [1180, 424], [1200, 450]], [[1150, 420], [1168, 448], [1188, 474]],
    [[1196, 452], [1214, 470], [1232, 484]], [[1142, 452], [1160, 478], [1172, 500]], [[958, 410], [948, 436], [944, 466]], [[978, 400], [968, 426], [962, 450]],
    [[936, 450], [932, 488], [930, 520]], [[1118, 446], [1116, 480], [1114, 516]], [[1170, 468], [1196, 480], [1226, 490]]];
  for (const f of sf) blurDraw(g, bboxOf(f, 6), 2.4, (c) => curve(c, f, 5, grey(0.42, 0.55), { seed: 7, ends: 0.2, jit: 0 }));
  g.restore();
  // crisp lines: collar edges, placket, seams, folds (the source draws the shirt with many dark creases)
  for (const [f, s, a, w] of [[[[1004, 362], [1000, 392], [998, 420], [1014, 438]], 1620, 0.85, 1.6], [[[1014, 438], [1030, 424], [1038, 404]], 1621, 0.6, 1.2],
    [[[1134, 358], [1138, 392], [1136, 420], [1123, 440]], 1622, 0.85, 1.6], [[[1123, 440], [1110, 426], [1104, 404]], 1623, 0.55, 1.2], [[[1127, 440], [1118, 470], [1113, 490], [1108, 510]], 1624, 0.7, 1.4],
    [[[943, 398], [970, 388], [1000, 378]], 1625, 0.7, 1.4], [[[930, 423], [926, 438], [923, 452]], 1650, 0.6, 1.2], [[[967, 390], [975, 412], [983, 437]], 1651, 0.55, 1.1], [[[983, 400], [990, 412], [997, 423]], 1652, 0.5, 1],
    [[[1153, 380], [1168, 402], [1183, 423]], 1626, 0.7, 1.4], [[[1167, 407], [1180, 428], [1190, 450]], 1627, 0.7, 1.4], [[[1147, 437], [1160, 458], [1173, 480]], 1628, 0.65, 1.3],
    [[[1190, 457], [1205, 468], [1220, 480]], 1629, 0.7, 1.3], [[[1193, 417], [1202, 428], [1210, 440]], 1653, 0.6, 1.1], [[[1233, 480], [1210, 490], [1190, 497], [1170, 501], [1153, 503]], 1654, 0.6, 1.2],
    [[[1180, 394], [1194, 410], [1204, 428]], 1655, 0.45, 1], [[[1136, 470], [1146, 488], [1152, 500]], 1656, 0.45, 1], [[[950, 440], [946, 470], [944, 500]], 1657, 0.4, 1]]) curve(g, f, w, grey(0.18, a), { seed: s, ends: 0.25 });
  // greyer toward the outline: the shirt turns away from the light at its edges
  g.save(); g.beginPath(); smoothPath(g, T, true); g.clip();
  g.globalCompositeOperation = "multiply";
  g.lineJoin = "round"; for (const [w, a] of [[26, 0.1], [14, 0.12], [6, 0.15]]) { g.strokeStyle = grey(0.55, a * 2.2); g.lineWidth = w; g.beginPath(); smoothPath(g, T, true); g.stroke(); }
  g.restore();
  curve(g, T.slice(0, 10), 1.9, grey(0.1, 0.9), { seed: 1611, ends: 0.8 });
  curve(g, T.slice(12), 1.9, grey(0.1, 0.9), { seed: 1612, ends: 0.8 });
  // his left forearm lying forward on the desk from the elbow (x 1240) to the hand by the laptop (x 1136), fingers
  // toward the screen; the cuff; folds (measured at 4x)
  const fa = [[1236, 472], [1247, 488], [1236, 500], [1206, 506], [1182, 512], [1156, 518], [1138, 516], [1134, 507], [1150, 500], [1178, 494], [1208, 486]];
  soft(g, pth(fa), lg(g, 0, 472, 0, 518, [[0, 0.98], [1, 0.84]]));
  curve(g, [[1176, 494], [1204, 487], [1232, 476]], 1.4, grey(0.2, 0.75), { seed: 1640 });
  curve(g, [[1180, 511], [1206, 505], [1234, 499]], 1.2, grey(0.25, 0.6), { seed: 1641 });
  for (const [f, sd] of [[[[1188, 496], [1196, 502], [1200, 508]], 1642], [[[1212, 489], [1220, 494], [1224, 500]], 1643]]) curve(g, f, 1, grey(0.3, 0.6), { seed: sd });
  curve(g, [[1172, 496], [1174, 504], [1176, 513]], 1.6, grey(0.25, 0.7), { seed: 1644 });      // the cuff's edge
  for (const [f, sd] of [[[[1136, 507], [1146, 504], [1160, 503]], 1645], [[[1138, 512], [1150, 510], [1164, 509]], 1646], [[[1146, 516], [1156, 514], [1168, 514]], 1647]]) curve(g, f, 0.9, grey(0.3, 0.55), { seed: sd });
  soft(g, pth([[906, 522], [908, 500], [914, 489], [924, 487], [930, 496], [931, 522]]), grey(0.84));
  curve(g, [[908, 500], [914, 490], [924, 488]], 1.1, grey(0.2, 0.8), { seed: 1632 });
  // the halo of laptop light round him
  g.save(); g.globalCompositeOperation = "lighter";
  g.translate(1075, 440); g.scale(1, 110 / 190);
  const hr = g.createRadialGradient(0, 0, 0, 0, 0, 230); hr.addColorStop(0, grey(0.05)); hr.addColorStop(0.6, grey(0.03)); hr.addColorStop(1, grey(0));
  g.fillStyle = hr; g.beginPath(); g.arc(0, 0, 230, 0, PI * 2); g.fill();
  g.restore();
}

// headphones round his neck: two big cups hanging either side of the neck (x 1004-1050 and 1090-1140), grey
// shells with dark rims, ridged cushions turned toward the neck
function headphones(g) {
  // left cup: seen three-quarter, the flat grey shell toward us, cushion on the inner side
  g.save(); g.translate(1027, 402); g.rotate(-0.08);
  soft(g, E(0, 0, 23, 34.5, 0), grey(0.12));
  soft(g, E(-4, 0, 17, 31, 0), lg(g, -20, -30, 14, 30, [[0, 0.8], [0.45, 0.72], [1, 0.5]]));
  g.strokeStyle = grey(0.12); g.lineWidth = 1.8; g.beginPath(); g.ellipse(-4, 0, 17, 31, 0, 0, PI * 2); g.stroke();
  g.strokeStyle = grey(0.85, 0.6); g.lineWidth = 1.3; g.beginPath(); g.ellipse(-5, -1, 13.5, 26, 0, 2.1, 4.4); g.stroke();
  g.strokeStyle = grey(0.35, 0.5); g.lineWidth = 1; g.beginPath(); g.ellipse(-4, 0, 9, 18, 0, 0, PI * 2); g.stroke();
  g.beginPath(); g.ellipse(13, 1, 9, 32, 0, 0, PI * 2); g.fillStyle = grey(0.46); g.fill();
  for (let k = -12; k <= 12; k++) { const y = k * 2.5; ink(g, [[7.5, y], [18.5, y + 1]], 1.2, grey(0.75, 0.8), { seed: 1705 + k }); }
  g.restore();
  // right cup: more edge-on, cushion to the left, the shell's rings to the right
  g.save(); g.translate(1115, 392); g.rotate(0.05);
  soft(g, E(2, 0, 25, 37, 0), grey(0.14));
  soft(g, E(8, 0, 16, 33, 0), lg(g, 0, -30, 20, 30, [[0, 0.62], [1, 0.4]]));
  g.beginPath(); g.ellipse(-8, 1, 10, 32, 0, 0, PI * 2); g.fillStyle = grey(0.42); g.fill();
  for (let k = -12; k <= 12; k++) { const y = k * 2.5; ink(g, [[-16, y + 0.5], [-0.5, y]], 1.3, grey(0.8, 0.8), { seed: 1725 + k }); }
  for (const [rx, ry, v] of [[16, 34, 0.55], [12, 29, 0.32], [8, 23, 0.5]]) { g.strokeStyle = grey(v, 0.85); g.lineWidth = 1.5; g.beginPath(); g.ellipse(8, 0, rx, ry, 0, -1.4, 1.4); g.stroke(); }
  g.strokeStyle = grey(0.86, 0.8); g.lineWidth = 2; g.beginPath(); g.ellipse(2, 0, 25, 37, 0, -1.25, 1.25); g.stroke();
  g.restore();
}

// The designer's head: a long lean face bright in the laptop light, heavy tired eyes with dark bags, a small
// down-turned mouth, sweat beads; black shaggy hair falling from under a dark ribbed beanie with a deep cuff over
// the temples and ears. Measured on 4-8x grids and value profiles of the source at 50 s (gaze "owl": irises at
// the outer-left of both eyes) and of the framed page at 72 s (gaze "down": lids lower, irises centred low).
const strand = (g, pts, w0, w1, col, per = 8) => { const q = sampleCurve(pts, per); taper(g, q, (u) => lerp(w0, w1, u), col); };
function head(g, gaze) {
  const down = gaze !== "owl";
  const HK = grey(0.03);
  // neck: a thin shadow under the jaw, then lit by the screen
  const neck = [[1040, 358], [1104, 358], [1105, 380], [1110, 404], [1072, 414], [1034, 404], [1039, 380]];
  soft(g, pth(neck), lg(g, 0, 366, 0, 400, [[0, 0.3], [0.3, 0.5], [0.6, 0.8], [1, 0.95]]));
  soft(g, pth([[1088, 362], [1104, 362], [1108, 400], [1094, 402]]), grey(0.45), 5, 0.6);           // his left neck side, a little shaded
  soft(g, pth([[1040, 362], [1052, 362], [1050, 400], [1036, 402]]), grey(0.55), 5, 0.5);
  // face
  const F = [[1019, 262], [1020, 280], [1020, 300], [1020, 320], [1021, 336], [1026, 350], [1034, 362], [1048, 373], [1065, 378.5], [1075, 378.5], [1090, 373.5], [1105, 362],
    [1115, 350], [1121, 338], [1122, 320], [1122, 300], [1123, 280], [1124, 262], [1100, 246], [1045, 246]];
  fillBlob(g, F, grey(0.7));
  g.save(); g.beginPath(); smoothPath(g, F, true); g.clip();
  soft(g, pth(F), rg(g, 1071, 320, 10, 62, [[0, 0.96], [0.6, 0.93], [0.85, 0.84], [1, 0.7]]));
  g.lineJoin = "round";
  blurDraw(g, bboxOf(F, 10), 4, (c) => { c.beginPath(); smoothPath(c, F, true); c.strokeStyle = grey(0.62, 0.7); c.lineWidth = 9; c.stroke(); });   // the face turns away at its edges
  soft(g, pth([[1010, 248], [1140, 248], [1140, 266], [1010, 266]]), grey(0.38), 5, 0.9);             // the brim's shadow on the forehead
  soft(g, pth([[1014, 344], [1026, 348], [1036, 362], [1044, 378], [1026, 378], [1012, 360]]), grey(0.55), 3.5, 0.75);   // his right jaw, turning away
  soft(g, pth([[1128, 338], [1119, 346], [1110, 360], [1100, 378], [1118, 378], [1130, 356]]), grey(0.5), 3.5, 0.8);     // his left jaw
  // sockets: pale grey over the lids, darker bags under the eyes
  for (const [cx, cy] of [[1037, 284], [1101, 284]]) { soft(g, E(cx, cy, 19, 12, 0), grey(0.6), 3.5, 0.85); soft(g, E(cx, cy + 9, 15, 4.5, 0), grey(0.5), 2.5, 0.7); }
  soft(g, pth([[1060, 298], [1064, 300], [1061, 318], [1057, 326], [1056, 316]]), grey(0.66), 2.5, 0.7);  // the nose's left flank
  soft(g, pth([[1078, 300], [1083, 302], [1087, 322], [1084, 327], [1080, 318]]), grey(0.66), 2.5, 0.75);  // the nose's shaded side
  soft(g, E(1071, 332.5, 13, 2.6, 0), grey(0.62), 1.8, 0.7);                                             // under the nose
  soft(g, E(1071, 343, 13, 3, 0), grey(0.8), 2, 0.6);                                                    // the upper lip
  soft(g, E(1073, 357.5, 12, 2, 0), grey(0.64), 1.6, 0.75);                                              // the lower lip's shadow
  soft(g, pth([[1056, 330], [1052, 340], [1050, 348], [1054, 348], [1057, 336]]), grey(0.82), 2, 0.5);   // the smile crease
  g.restore();
  // jaw and chin contour
  curve(g, [[1021, 336], [1026, 350], [1034, 362], [1048, 373.5], [1065, 379], [1075, 379], [1090, 374], [1105, 362.5], [1115, 350.5], [1121, 338]], 1.3, grey(0.25, 0.6), { seed: 1710, ends: 0.3 });
  // eyes
  const EY = [
    { o: [1022.6, 285.4], i: [1052, 287], up: [[1030.8, 281.8], [1040.8, 281.2], [1048.3, 283]], lo: [[1024, 289], [1037, 290.5], [1049.5, 289]],
      iris: down ? [1038.8, 286.2] : [1029.8, 285.4], crease: [[1024, 278.5], [1035, 275.5], [1049, 277.5]], bag: [[1023, 291], [1037, 295.5], [1051, 291.5]], side: -1, seed: 1720, ir: 4.1, ik: 0.04 },
    { o: [1117.6, 285.6], i: [1085, 285.8], up: [[1112, 282], [1102, 280.6], [1092, 281.6]], lo: [[1115.8, 288.5], [1099.5, 290], [1087, 288.5]],
      iris: down ? [1104, 286.2] : [1094.5, 285.4], crease: [[1114, 278], [1100, 275.5], [1086, 280]], bag: [[1116, 291], [1100, 295.8], [1086, 291]], side: 1, seed: 1730, ir: 4.1, ik: 0.12 },
  ];
  for (const e of EY) {
    const lidDrop = down ? 2.4 : 0;
    const up = e.up.map(([x, y], k) => [x, y + lidDrop * (k === 1 ? 1 : 0.8)]);
    soft(g, pth([e.o, ...e.crease, e.i, ...[...up].reverse()]), grey(0.52), 1.2, 0.85);        // the heavy lid
    soft(g, pth([[e.bag[0][0], e.bag[0][1] - 2.5], [e.bag[1][0], e.bag[1][1] - 4.5], [e.bag[2][0], e.bag[2][1] - 2.5], ...[...e.bag].reverse().map(([x, y]) => [x, y + 2.2])]), grey(0.36), 1.4, 0.9);
    const eye = [e.o, ...up, e.i, ...[...e.lo].reverse()];
    fillBlob(g, eye, grey(0.72));
    g.save(); g.beginPath(); smoothPath(g, eye, true); g.clip();
    soft(g, E((e.o[0] + e.i[0]) / 2 + 3, 288, 10, 2.5, 0), grey(0.86), 2, 0.6);
    const [ix, iy] = e.iris;
    soft(g, E(ix, iy, e.ir, e.ir, 0), grey(0.16), 0.6); soft(g, E(ix, iy, e.ir * 0.65, e.ir * 0.65, 0), grey(e.ik), 0.5);
    dot(g, ix + 1.7, iy - 1.1, 1, grey(0.94));
    soft(g, pth([[e.o[0] - 2, 270], [e.i[0] + 2, 270], [e.i[0] + 2, up[1][1] + 2.2], [e.o[0] - 2, up[0][1] + 2.2]]), grey(0.2), 1.2, 0.7);  // the lid's shadow on the eyeball
    soft(g, E(e.o[0] - e.side * 3.5, e.o[1] + 1.5, 4, 3, 0), grey(0.22), 1.2, 0.8);                    // the dark outer corner
    soft(g, E(e.i[0] - e.side * -2, e.i[1], 3, 3, 0), grey(0.35), 1.5, 0.7);   // the inner corner
    g.restore();
    taper(g, sampleCurve([e.o, ...up, e.i], 6), (u) => (e.side < 0 ? lerp(3, 1.2, u) : lerp(1.2, 3, u)) * (0.6 + 0.4 * Math.sin(PI * u)), grey(0.03));

    curve(g, [[e.o[0], e.o[1] + 0.6], [e.o[0] - e.side * 0.2 + (e.i[0] - e.o[0]) * 0.1, e.o[1] - 1.4]], 1.7, grey(0.03), { seed: e.seed + 5 });
    curve(g, e.crease, 1.4, grey(0.18, 0.85), { seed: e.seed + 1, ends: 0.3 });
    curve(g, e.lo, 1, grey(0.22, 0.85), { seed: e.seed + 2, ends: 0.3 });
    curve(g, e.bag, 1.3, grey(0.18, 0.8), { seed: e.seed + 3, ends: 0.2 });
  }
  // brows (the left one mostly under the hair)
  blurDraw(g, [1024, 258, 1122, 276], 0.8, (c) => {
    curve(c, [[1030, 268.5], [1042, 266.4], [1055, 269.2]], 2.6, grey(0.1), { seed: 1740, ends: 0.25 });
    curve(c, [[1082, 268.2], [1092, 264.4], [1104, 263.6], [1115, 266.2]], 3.6, grey(0.08), { seed: 1741, ends: 0.3 });
  });
  // nose: the rounded tip, wings and nostrils
  blurDraw(g, [1052, 312, 1092, 336], 0.7, (c) => curve(c, [[1058.5, 320], [1059, 325], [1062, 328.5], [1066, 329.8], [1071.7, 330.6], [1077.5, 329.6], [1082, 328.4], [1085.5, 325], [1085.5, 320]], 1.2, grey(0.3, 0.7), { seed: 1743 }));
  soft(g, E(1063.5, 327.6, 2.5, 1.3, 0.3), grey(0.08), 0.6, 0.9); soft(g, E(1080.8, 327.6, 2.5, 1.3, -0.3), grey(0.08), 0.6, 0.9);

  // mouth: a small, tired, down-turned line
  blurDraw(g, [1044, 340, 1098, 356], 0.6, (c) => curve(c, [[1050, 349.5], [1058, 347.6], [1065, 347.2], [1070, 348], [1075, 347.3], [1082, 347.6], [1091.7, 350]], 2.2, grey(0.16), { seed: 1745, ends: 0.2 }));
  curve(g, [[1061, 342.4], [1071, 341.5], [1081, 342.4]], 0.9, grey(0.45, 0.4), { seed: 1746 });
  curve(g, [[1063, 356.2], [1073, 357.8], [1084, 356.2]], 1, grey(0.35, 0.55), { seed: 1747 });
  // side hair: shaggy locks over the temples, round the ears (their lit rims show between the locks) and down to
  // the jaw, pointed ends; a dark mass behind; a grey sheen along the locks. Measured at 4-6x (50 s).
  fillBlob(g, [[992, 262], [1012, 254], [1018, 266], [1016, 296], [1004, 300], [1004, 322], [1012, 330], [1016, 350], [1004, 362], [994, 352], [988, 320], [989, 285]], HK);
  fillBlob(g, [[1124, 252], [1146, 262], [1150, 285], [1151, 312], [1148, 334], [1140, 350], [1128, 344], [1130, 322], [1138, 318], [1136, 298], [1126, 294], [1124, 272]], HK);
  for (const [pts, seed] of [[[[1019, 304], [1012, 302], [1007, 308], [1008, 316], [1013, 321], [1019, 319]], 1690], [[[1123, 299], [1131, 298], [1137, 303], [1137, 312], [1132, 318], [1124, 316]], 1691]]) {
    soft(g, pth(pts), grey(0.24), 1);
    curve(g, pts.slice(1, 5), 1.1, grey(0.55, 0.7), { seed, ends: 0.3 });
  }
  const rh = rng(1905);
  const LK = [
    // his right side (our left): [root, mid, tip], root width
    [[996, 264], [991, 304], [993, 340], [996, 362], 10], [[1003, 266], [1000, 300], [1002, 334], [1006, 368], 9], [[1012, 262], [1016, 280], [1017, 298], 7],
    [[1008, 318], [1015, 338], [1022, 360], 8], [[1014, 322], [1022, 342], [1030, 358], 5], [[994, 330], [988, 350], [983, 366], 5], [[1000, 300], [998, 322], [1001, 344], 6],
    // his left side (our right)
    [[1146, 264], [1150, 300], [1149, 332], [1143, 354], 10], [[1140, 262], [1142, 295], [1140, 330], [1135, 356], 8], [[1130, 258], [1127, 280], [1125, 297], 6],
    [[1128, 318], [1124, 338], [1116, 354], 6], [[1135, 318], [1133, 340], [1128, 359], 6], [[1150, 290], [1156, 318], [1161, 344], 5], [[1142, 300], [1144, 324], [1141, 346], 5],
  ];
  for (const l of LK) { const w = l[l.length - 1], pts = l.slice(0, -1); strand(g, pts, w, 0.3, HK); strand(g, pts.map(([x, y], i) => [x + (i ? (rh() - 0.5) * 3 : 0), y]), w * 0.25, 0.1, grey(0.3, 0.5)); }
  for (const [side, x0, x1, y1] of [[-1, 990, 1018, 330], [1, 1124, 1150, 320]]) {
    for (let i = 0; i < 16; i++) {
      const x = lerp(x0, x1, rh()), y = 260 + rh() * (y1 - 275), len = 24 + rh() * 36, out = side * (1 + rh() * 6);
      strand(g, [[x, y], [x + out * 0.3, y + len * 0.5], [x + out, y + len]], 0.7 + rh() * 0.9, 0.15, grey(0.2 + rh() * 0.18, 0.6));
    }
  }
  // strands falling over the face's edges
  for (let i = 0; i < 14; i++) {
    const t = i / 13, yL = 270 + t * 70, yR = 266 + t * 72;
    const xl = lerp(1017, 1022, t) + rh() * 2, xr = lerp(1125, 1120, t) - rh() * 2;
    if (i % 2) strand(g, [[xl - 3, yL], [xl + rh() * 2, yL + 12], [xl + 1 + rh() * 3, yL + 20 + rh() * 8]], 1.2 + rh() * 1.2, 0.2, HK);
    else strand(g, [[xr + 3, yR], [xr - rh() * 2, yR + 12], [xr - 1 - rh() * 3, yR + 20 + rh() * 8]], 1.2 + rh() * 1.2, 0.2, HK);
  }
  // beanie: dark grey knit, fine ribs, a deep cuff with a dark fold
  const B = [[991, 284], [989, 262], [989, 240], [992, 218], [999, 197], [1010, 181], [1025, 169], [1045, 162], [1068, 159.5], [1090, 161.5], [1110, 168], [1126, 178], [1137, 193],
    [1143, 210], [1146, 230], [1147, 250], [1147, 270], [1142, 276], [1132, 264], [1112, 252], [1085, 245], [1060, 244], [1035, 247], [1015, 256], [1001, 272]];
  const fold = [[990, 223], [1015, 212], [1035, 206], [1067, 202], [1100, 205], [1125, 211], [1146, 222]];
  fillBlob(g, B, grey(0.2));
  g.save(); g.beginPath(); smoothPath(g, B, true); g.clip();
  soft(g, pth(B), rg(g, 1068, 196, 10, 95, [[0, 0.27], [0.5, 0.22], [0.8, 0.15], [1, 0.08]]));
  soft(g, pth([[985, 204], [1070, 196], [1150, 204], [1150, 222], [1070, 214], [985, 224]]), grey(0.3), 4, 0.6);     // the cuff's rolled top catches light
  soft(g, pth([[985, 250], [1070, 238], [1150, 250], [1150, 290], [985, 290]]), grey(0.12), 6, 0.6);                  // shade toward the brim
  const rb = rng(1750);
  for (let i = 0; i < 68; i++) {
    const x = 991 + i * 2.35 + rb() * 0.6, d = (x - 1068) / 80;
    curve(g, [[1068 + (x - 1068) * 0.5, 162 + d * d * 22], [1068 + (x - 1068) * 0.85, 184 + d * d * 14], [x, 204]], 0.7, grey(0.08, 0.14), { seed: 1751 + i, ends: 0.4 });
    ink(g, [[x, 214], [x + d * 2, 290]], 0.9, grey(rb() < 0.35 ? 0.3 : 0.06, 0.22), { seed: 1830 + i });
  }
  g.restore();
  curve(g, fold, 1.8, grey(0.04, 0.8), { seed: 1900, ends: 0.3 });
  curve(g, B, 1.2, grey(0.3, 0.6), { closed: true, seed: 1902, ends: 0.9 });
  // fringe (row-by-row value scans of the source, 50 s): hair covers the forehead to x 1039 (y 256) .. 1020 (y 290)
  // on his right and from x 1104 .. 1124 on his left; under the brim it is dark except two skin gaps (x 1047-1054,
  // 1082-1098); a narrow lock (5-7 px) curls from x 1066 (y 250) to 1052 (y 298) between the eyes
  const FR = [
    [[1010, 252], [1030, 245], [1046, 245], [1046, 250], [1040, 257], [1035, 263], [1030, 268], [1027, 273], [1024, 280], [1021, 288], [1020, 302], [1010, 302]],
    [[1099, 246], [1116, 247], [1136, 255], [1136, 302], [1124, 302], [1124, 290], [1120, 282], [1116, 274], [1112, 268], [1108, 262], [1104, 256], [1099, 251]],
    [[1046, 243], [1083, 242], [1082, 249], [1072, 252.5], [1062, 251.5], [1055, 252.5], [1046, 250]],
    [[1063.5, 248], [1062.5, 258], [1062.5, 266], [1061, 276], [1058, 284], [1055, 290], [1052, 298], [1053.5, 299], [1056.5, 292], [1059.5, 286], [1063.5, 280], [1067, 272], [1068.5, 262], [1069.5, 252], [1070.5, 246]],
  ];
  const L = [
    [[[1026, 248], [1031, 258], [1034, 266]], 5, 0.4], [[[1034, 247], [1038, 254], [1040, 259]], 4, 0.3], [[[1018, 250], [1024, 262], [1027, 274]], 5, 0.4],
    [[[1075, 248], [1075, 256], [1073, 263]], 4, 0.3], [[[1104, 250], [1108, 258], [1112, 266], [1115, 274]], 4, 0.4], [[[1112, 250], [1117, 260], [1120, 270], [1121, 282]], 5, 0.4],
  ];
  blurDraw(g, [1000, 236, 1142, 312], 0.45, (c) => {
    for (const f of FR) fillBlob(c, f, HK);
    for (const [pts, w0, w1] of L) strand(c, pts, w0, w1, HK);
    strand(c, [[1057, 250], [1056, 262], [1053, 272], [1050, 282]], 3, 0.5, grey(0.22));
  });
  for (const [pts, w0] of L) strand(g, pts.map(([x, y], i) => [x - 0.6, y + (i ? 0.5 : 0)]), w0 * 0.22, 0.1, grey(0.34, 0.5));
  for (const [x0, y0, x1, y1] of [[1014, 262, 1016, 286], [1066, 252, 1061, 280], [1064, 256, 1058, 286], [1128, 262, 1130, 296]]) strand(g, [[x0, y0], [(x0 + x1) / 2 + 1, (y0 + y1) / 2], [x1, y1]], 1, 0.2, grey(0.32, 0.5));
  // sweat beads
  for (const [x, y, r] of [[1047.5, 252.5, 1.5], [1089, 255, 1.5], [1040.5, 319, 1.4], [1106, 336, 1.6], [1084, 300.5, 1.1]]) {
    soft(g, E(x, y + 0.6, r * 0.8, r * 1.1, 0), grey(0.35), 0.5, 0.7); dot(g, x - 0.3, y, r * 0.35, grey(0.97, 0.9));
  }
}

function laptop(g) {
  const lid = [[914, 449], [1083, 449], [1112, 521], [898, 521]];
  fillPoly(g, lid, "#050505");
  ink(g, [[914, 449], [1083, 449]], 3.2, grey(0.95), { seed: 2001 });
  ink(g, [[1083, 449], [1112, 521]], 2.4, grey(0.92), { seed: 2002 });
  ink(g, [[914, 449], [898, 521]], 1.2, grey(0.5), { seed: 2003 });
  dot(g, 1010, 491, 9.5, grey(0.97));
}

function deskTop(g) {
  // the plank: a lit edge on top, long wood grain along its front, darker toward its ends, a dark underside
  const pl = [[772, 522], [1510, 521], [1514, 530], [1512, 543], [772, 544], [768, 533]];
  brush(g, pl, (v) => { v.fillStyle = lg(v, 770, 0, 1514, 0, [[0, 0.42], [0.2, 0.62], [0.5, 0.7], [0.8, 0.62], [1, 0.45]]); v.fillRect(766, 518, 752, 30);
    v.globalCompositeOperation = "multiply"; v.fillStyle = lg(v, 0, 521, 0, 544, [[0, grey(1)], [0.6, grey(0.9)], [1, grey(0.65)]]); v.fillRect(766, 518, 752, 30); }, 0.0,
    { len: 60, w: 2, gap: 1.4, seed: 2010, jit: 0.03, base: 0.5, gain: 0.9 });
  const r = rng(2014);
  for (let i = 0; i < 5; i++) { const x = 800 + r() * 690, y = 530 + r() * 10; soft(g, E(x, y, 4 + r() * 5, 1.2, 0), grey(0.2), 0.8, 0.5); }
  ink(g, [[772, 522], [1510, 521]], 1.6, grey(0.95), { seed: 2011 });
  ink(g, [[772, 544], [1512, 543]], 1.6, BLK, { seed: 2012 });
  fillPoly(g, [[772, 544], [1510, 543], [1508, 556], [774, 557]], "#040404");
}

function mug(g) {
  const body = [[818, 472], [870, 472], [866, 521], [822, 521]];
  soft(g, pth(body, false), lg(g, 818, 0, 870, 0, [[0, 0.6], [0.35, 0.97], [0.7, 0.93], [1, 0.7]]));
  for (let i = 0; i < 5; i++) ink(g, [[826 + i * 9, 478], [827 + i * 9, 516]], 1, grey(0.5, 0.35), { seed: 2020 + i });
  ink(g, [[818, 472], [822, 521], [866, 521], [870, 472]], 1.5, BLK, { seed: 2025 });
  g.fillStyle = grey(0.85); g.beginPath(); g.ellipse(844, 472, 26, 4.5, 0, 0, PI * 2); g.fill();
  g.fillStyle = grey(0.12); g.beginPath(); g.ellipse(844, 473, 22, 3, 0, 0, PI * 2); g.fill();
  g.lineCap = "round";
  for (const [x, s] of [[818, -1], [870, 1]]) {
    g.strokeStyle = grey(0.1); g.lineWidth = 6; g.beginPath(); g.ellipse(x, 500, 13, 14, 0, s < 0 ? PI * 0.5 : -PI * 0.5, s < 0 ? PI * 1.5 : PI * 0.5); g.stroke();
    g.strokeStyle = grey(0.9); g.lineWidth = 3.4; g.beginPath(); g.ellipse(x, 500, 13, 14, 0, s < 0 ? PI * 0.5 : -PI * 0.5, s < 0 ? PI * 1.5 : PI * 0.5); g.stroke();
  }
  // steam: two soft wavy strands
  for (const [pts, seed] of [[[[841, 469], [830, 451], [837, 434], [829, 417], [821, 400], [830, 383]], 2030], [[[844, 466], [839, 446], [846, 426], [836, 411], [837, 391], [850, 371]], 2031]]) {
    blurDraw(g, bboxOf(pts, 3), 0.7, (c) => curve(c, pts, 2.6, grey(0.8, 0.8), { seed, ends: 0.1 }));
  }
}

function lampAndGear(g) {
  // the arm: a dim vertical pole, two thin rods from the shade's joint down to the elbow nut, then down to the base
  for (const [a, b, w, v] of [[[1425, 335], [1422, 422], 1.4, 0.22], [[1432, 322], [1492, 388], 1.4, 0.3], [[1440, 318], [1498, 384], 1, 0.2], [[1488, 400], [1473, 432], 1.6, 0.28], [[1496, 402], [1480, 434], 1, 0.2]])
    ink(g, [a, b], w, grey(v), { seed: a[0] * 3 + a[1] });
  dot(g, 1494, 391, 8, grey(0.05)); ring(g, 1494, 391, 7, 1.4, grey(0.28)); dot(g, 1494, 391, 2.2, grey(0.35));
  dot(g, 1435, 318, 5, grey(0.08)); ring(g, 1435, 318, 5, 1.1, grey(0.25));
  // neck: a short cylinder angled up-right, with a lit stripe; the cap
  const neck = [[1385, 300], [1409, 284], [1420, 300], [1397, 314]];
  soft(g, pth(neck, false), lg(g, 1385, 284, 1420, 314, [[0, 0.5], [0.4, 0.85], [0.7, 0.35], [1, 0.12]]));
  curve(g, neck, 1.2, grey(0.03), { closed: true, seed: 2046, ends: 0.9 });
  fillPoly(g, [[1406, 285], [1418, 278], [1424, 287], [1412, 294]], grey(0.4));
  // shade: a dark bell, its mouth turned down-left toward the desk; the lit inside shows above the rim
  const rimC = [1361.5, 355], rimA = 0.588, rx = 45, ry = 9.5;
  const rimPt = (t) => [rimC[0] + Math.cos(t) * rx * Math.cos(rimA) - Math.sin(t) * ry * Math.sin(rimA), rimC[1] + Math.cos(t) * rx * Math.sin(rimA) + Math.sin(t) * ry * Math.cos(rimA)];
  const shade = [rimPt(PI), [1340, 318], [1362, 305], [1386, 300], [1400, 306], [1408, 318], [1410, 340], [1404, 362], rimPt(0)];
  soft(g, pth(shade), lg(g, 1330, 300, 1410, 380, [[0, 0.3], [0.35, 0.16], [1, 0.05]]));
  blurDraw(g, [1340, 300, 1405, 345], 2, (c) => curve(c, [[1352, 322], [1372, 311], [1394, 306]], 5, grey(0.75, 0.8), { seed: 2044, ends: 0.3 }));   // the specular streak
  curve(g, shade, 1.3, grey(0.02), { seed: 2045, ends: 0.8 });
  // the lit inside and the mouth
  g.save(); g.translate(rimC[0], rimC[1]); g.rotate(rimA);
  soft(g, E(3, -9, 34, 16, 0), grey(0.9), 3, 0.9);
  g.fillStyle = grey(0.97); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, PI * 2); g.fill();
  g.strokeStyle = grey(0.35); g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, PI * 2); g.stroke();
  g.strokeStyle = grey(0.55, 0.8); g.lineWidth = 1.2; g.beginPath(); g.ellipse(-4, -2, 13, 5, 0, 0.2, PI - 0.2); g.stroke();   // the socket's rim deep inside
  g.restore();
  // pencil cup: a ribbed metal tin, a lit stripe, pencils fanning out of it
  for (const [x0, y0, x1, y1] of [[1297, 452, 1291, 418], [1304, 452, 1300, 412], [1311, 452, 1311, 416], [1318, 452, 1322, 414], [1325, 452, 1333, 422], [1302, 452, 1286, 428]]) {
    ink(g, [[x0, y0], [x1, y1]], 2.8, grey(0.03), { seed: x1 * 7 }); ink(g, [[x0, y0], [x1, y1]], 1.8, grey(0.8), { seed: x1 * 7 + 1 });
  }
  const cup = [[1293, 452], [1332, 452], [1331, 500], [1294, 500]];
  tex(g, cup, (v) => { v.fillStyle = lg(v, 1293, 0, 1332, 0, [[0, 0.25], [0.35, 0.55], [0.5, 0.95], [0.62, 0.5], [1, 0.2]]); v.fillRect(1290, 450, 45, 52); }, 0, { per: 2.6, seed: 2050, wExp: 0.6, bg: 0.35 });
  ink(g, cup, 1.2, grey(0.03), { closed: true, seed: 2051 });
  g.fillStyle = grey(0.7); g.beginPath(); g.ellipse(1312.5, 452, 19.5, 3, 0, 0, PI * 2); g.fill();
  g.fillStyle = grey(0.1); g.beginPath(); g.ellipse(1312.5, 452.5, 16, 2, 0, 0, PI * 2); g.fill();
  // a tray under it
  stripes(g, [[1282, 500], [1340, 500], [1344, 516], [1280, 516]], { dir: "h", per: 3, cov: 0.6, lum: 0.85, seed: 2052 });
  // books under his hand
  book(g, [[1196, 490], [1262, 488], [1264, 505], [1197, 506]], { seed: 2060, k: 0.9 });
  book(g, [[1190, 505], [1270, 504], [1271, 521], [1191, 522]], { seed: 2062, k: 0.85 });
  // on the receiver: an open notebook with a curled page, flat books under it
  book(g, [[1352, 437], [1482, 434], [1484, 456], [1353, 458]], { seed: 2070, k: 0.8 });
  const nb = [[1356, 423], [1418, 420], [1434, 426], [1436, 437], [1356, 438]];
  tex(g, nb, (v) => { v.fillStyle = lg(v, 0, 420, 0, 438, [[0, 0.92], [1, 0.62]]); v.fillRect(1350, 418, 90, 22); }, 0, { per: 2.2, seed: 2071, smooth: false, wExp: 0.6, bg: 0.4 });
  curve(g, nb, 1.2, grey(0.03), { closed: true, seed: 2072, ends: 0.9 });
  curve(g, [[1400, 421], [1420, 418], [1432, 424]], 1.4, grey(0.9), { seed: 2073 });
  // the receiver: a dark wooden case, two rows on the front panel (knobs, a lit meter; jacks)
  const rx0 = 1355, rx1 = 1486, ry0 = 457, ry1 = 520;
  brush(g, [[rx0, ry0], [rx1, ry0], [rx1, ry1], [rx0, ry1]], (v) => { v.fillStyle = lg(v, rx0, 0, rx1, 0, [[0, 0.2], [0.5, 0.26], [1, 0.15]]); v.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0); }, PI / 2, { len: 10, w: 2, gap: 1.8, seed: 2074, jit: 0.2, base: 0.6 });
  ink(g, [[rx0, ry0], [rx1, ry0], [rx1, ry1], [rx0, ry1]], 1.4, grey(0.03), { closed: true, seed: 2075 });
  ink(g, [[rx0, ry0 + 1], [rx1, ry0 + 1]], 1.2, grey(0.8), { seed: 2076 });
  ink(g, [[rx0 + 2, 485], [rx1 - 2, 485]], 1.1, grey(0.45), { seed: 2077 });
  for (const [x, y, r, lit] of [[1368, 472, 6.5, 0.6], [1412, 475, 7.5, 0.95], [1436, 473, 6, 0.55]]) {
    dot(g, x, y, r, grey(0.05)); ring(g, x, y, r - 1, 1.4, grey(0.55)); soft(g, E(x - 1, y - 1.5, r * 0.55, r * 0.45, 0), grey(lit)); dot(g, x - 1.5, y - 2.5, 1.3, grey(0.95));
  }
  fillPoly(g, [[1373, 466], [1386, 466], [1386, 470], [1373, 470]], grey(0.6));
  fillPoly(g, [[1450, 467], [1476, 467], [1476, 483], [1450, 483]], grey(0.9)); fillPoly(g, [[1453, 470], [1473, 470], [1473, 480], [1453, 480]], grey(0.35));
  for (const x of [1366, 1388, 1411, 1436, 1466]) { dot(g, x, 503, 6.5, grey(0.04)); ring(g, x, 503, 6, 1.5, grey(0.6)); dot(g, x, 503, 2.5, grey(0.02)); }
}

// cables: black with a thin lit edge
function cable(g, pts, w = 5, seed = 1, lit = 0.75) {
  w *= 1.4;
  curve(g, pts, w, "#030303", { seed, ends: 0.85 });
  curve(g, pts.map(([x, y]) => [x - w * 0.22, y - w * 0.1]), Math.max(0.9, w * 0.2), grey(0.8, lit * 0.55), { seed: seed + 1, ends: 0.3 });
}
function cables(g) {
  // over the desk edge beside the laptop, down past his leg to the floor
  cable(g, [[918, 506], [912, 520], [908, 540], [904, 580], [898, 630], [886, 700], [862, 780], [842, 840], [832, 872]], 5.5, 2100);
  cable(g, [[926, 510], [938, 520], [948, 534], [950, 548], [940, 564], [926, 592], [914, 640], [904, 700], [886, 770], [856, 820], [812, 840], [768, 836]], 5, 2102);
  cable(g, [[926, 522], [934, 548], [952, 562]], 4, 2104);
  cable(g, [[841, 794], [822, 850], [785, 875], [740, 884]], 4, 2106, 0.6);
  // from the receiver jacks: a curtain of cables down to the floor
  for (const [pts, w, sd] of [
    [[[1367, 509], [1372, 560], [1380, 600], [1390, 700], [1410, 800], [1440, 870]], 4.6, 2112],
    [[[1388, 509], [1395, 560], [1418, 620], [1440, 690], [1462, 760], [1476, 850]], 4.4, 2114],
    [[[1414, 509], [1420, 560], [1430, 620], [1438, 700], [1446, 790], [1452, 860]], 4.2, 2116],
    [[[1435, 509], [1446, 560], [1470, 620], [1480, 700], [1490, 830], [1500, 870]], 4.4, 2118],
    [[[1466, 509], [1476, 560], [1486, 620], [1496, 700]], 4.2, 2120],
  ]) cable(g, pts, w, sd);
  // loops on the floor and around the speaker
  cable(g, [[1500, 782], [1560, 752], [1620, 748], [1700, 758], [1760, 786], [1800, 800]], 4, 2130, 0.6);
  cable(g, [[1280, 872], [1360, 884], [1440, 876], [1520, 888], [1600, 880], [1680, 890], [1760, 884]], 4.2, 2132, 0.5);
  cable(g, [[1300, 860], [1380, 868], [1460, 860], [1540, 872]], 3.6, 2134, 0.45);
  cable(g, [[520, 870], [600, 884], [680, 876], [760, 890], [840, 884], [900, 892]], 4.2, 2136, 0.5);
  cable(g, [[600, 690], [612, 740], [604, 790], [590, 830]], 9, 2138, 0.8);
  cable(g, [[420, 600], [440, 660], [470, 720], [500, 760], [530, 800], [560, 830]], 4, 2140);
  cable(g, [[445, 600], [480, 650], [520, 690], [556, 720], [590, 760]], 3.8, 2142);
  cable(g, [[477, 600], [500, 640], [530, 670], [560, 690]], 3.6, 2144);
  cable(g, [[1650, 740], [1700, 780], [1750, 800], [1800, 830]], 3.6, 2146, 0.5);
}

// ======================================================================================
// RIGHT-CENTRE: bench, right speaker
// ======================================================================================
function rightCentre(g) {
  // bench under the desk's right end
  stripes(g, [[1340, 703], [1520, 702], [1520, 712], [1340, 713]], { dir: "h", per: 2.8, cov: 0.9, lum: 0.9, seed: 2200 });
  stripes(g, [[1340, 713], [1520, 712], [1520, 728], [1340, 729]], { dir: "h", per: 3, cov: 0.55, lum: 0.75, seed: 2201 });
  stripes(g, [[1320, 742], [1525, 741], [1525, 768], [1320, 769]], { dir: "h", per: 3, cov: bl(0.8, 0.9, 0.6, 0.5), lum: 0.88, seed: 2202 });
  for (const x of [1360, 1510]) {
    stripes(g, [[x, 769], [x + 15, 769], [x + 15, 852], [x, 852]], { per: 3, cov: ug(0.9, 0.4), lum: 0.9, seed: 2203 + x });
    for (const y of [780, 840]) ink(g, [[x - 2, y], [x + 17, y]], 2, grey(0.85), { seed: y + x });
  }
  // right speaker: a lit top plate, a rounded cabinet of mid-grey wood with vertical grain, tweeter, woofer, a port
  const cab = [[1498, 576], [1608, 576], [1612, 590], [1612, 760], [1606, 770], [1500, 770], [1494, 760], [1494, 590]];
  brush(g, cab, (v) => { v.fillStyle = lg(v, 1494, 0, 1612, 0, [[0, 0.3], [0.45, 0.4], [1, 0.26]]); v.fillRect(1490, 572, 126, 202); }, PI / 2, { len: 22, w: 2.2, gap: 1.8, seed: 2211, jit: 0.08, base: 0.6 });
  curve(g, cab, 1.6, grey(0.02), { closed: true, seed: 2212, ends: 0.9 });
  face(g, [[1502, 553], [1596, 553], [1606, 576], [1496, 576]], [0.8, 0.75, 0.6, 0.62], "h", { per: 2.8, seed: 2210 });
  ink(g, [[1502, 553], [1596, 553]], 1.3, grey(0.9), { seed: 2213 });
  ink(g, [[1496, 576], [1606, 576]], 1.4, BLK, { seed: 2214 });
  driver(g, 1552, 612, 13, "tweeter");
  // woofer: dark outer ring, grey band, bright cone, dark cap
  dot(g, 1550, 686, 50, grey(0.05)); ring(g, 1550, 686, 48, 2, grey(0.3)); ring(g, 1550, 686, 38, 8, grey(0.28));
  soft(g, E(1550, 686, 33, 33, 0), rg(g, 1545, 680, 10, 34, [[0, 0.92], [0.6, 0.85], [1, 0.55]]));
  g.save(); g.beginPath(); g.arc(1550, 686, 33, 0, PI * 2); g.clip();
  const rw = rng(2215);
  for (let i = 0; i < 60; i++) { const a = rw() * PI * 2, l0 = 16 + rw() * 5, l1 = 26 + rw() * 7; ink(g, [[1550 + Math.cos(a) * l0, 686 + Math.sin(a) * l0], [1550 + Math.cos(a) * l1, 686 + Math.sin(a) * l1]], 1, grey(rw() < 0.5 ? 0.35 : 1, 0.35), { seed: 2216 + i }); }
  g.restore();
  dot(g, 1550, 686, 14, grey(0.04)); dot(g, 1549, 684, 1.6, grey(0.8)); ring(g, 1550, 686, 33, 1.2, grey(0.2));
  dot(g, 1551, 776, 20, grey(0.04)); ring(g, 1551, 776, 19, 1.4, grey(0.4));
}

// ======================================================================================
// RIGHT: cartons, cassette deck, the upright synth, rack frame, plant, backpack, magazines
// ======================================================================================
function darkBox(g, pts, edge = 0.35, seed = 1) {
  // a carton in shadow: near-black with faint grain and a dim lit top edge
  stripes(g, pts, { per: 6.2, cov: fadeEdges(bl(0.12, 0.08, 0.05, 0.08), 0.05, 0.05), lum: 0.5, seed });
  ink(g, [pts[0], pts[1]], 1.3, grey(0.6, edge), { seed: seed + 1 });
}
function rightBack(g) {
  // tall dim cartons behind the counter
  stripes(g, [[1822, 128], [1905, 118], [1905, 242], [1822, 246]], { per: 6.2, cov: fadeEdges(bl(0.35, 0.3, 0.3, 0.3), 0.02, 0.02), lum: 0.6, seed: 2300 });
  ink(g, [[2090, 95], [2165, 95], [2165, 215]], 1.2, grey(0.3), { seed: 2301 });
  // dark cartons to the right of the striped stack (behind the cables)
  darkBox(g, [[1722, 246], [1796, 250], [1798, 332], [1722, 332]], 0.4, 2302);
  darkBox(g, [[1688, 330], [1800, 334], [1802, 420], [1688, 420]], 0.3, 2303);
  darkBox(g, [[1726, 405], [1812, 413], [1812, 470], [1726, 470]], 0.7, 2304);
  stripes(g, [[1800, 415], [1845, 418], [1845, 450], [1800, 450]], { per: 4, cov: 0.55, lum: 0.8, seed: 2305 });
  // the stack: three striped cartons, fronts facing the centre
  const S = [
    [[[1586, 287], [1720, 250], [1721, 330], [1587, 358]], 0.95, 2310],
    [[[1619, 354], [1687, 331], [1687, 418], [1620, 428]], 0.92, 2311],
    [[[1588, 437], [1725, 406], [1726, 552], [1588, 560]], 0.9, 2312],
  ];
  for (const [q, v, seed] of S) {
    stripes(g, q, { per: 6.2, cov: fadeEdges(bl(v * 0.8, v * 0.68, v * 0.46, v * 0.56), 0.03, 0.03), lum: 0.92, seed });
    ink(g, [q[0], q[1]], 1.8, grey(0.92), { seed: seed + 1 });
  }
  // cassette deck on the stack's left edge
  fillPoly(g, [[1570, 360], [1604, 356], [1606, 450], [1572, 452]], grey(0.26));
  ink(g, [[1570, 360], [1604, 356], [1606, 450], [1572, 452]], 1.4, grey(0.8), { closed: true, seed: 2314 });
  dot(g, 1588, 408, 11, grey(0.12)); ring(g, 1588, 408, 11, 2, grey(0.85)); ring(g, 1588, 408, 6, 1.2, grey(0.6));
  // headphones lying on top of the stack, the band looping over into the cables
  for (const [cx, cy, rx, ry, a] of [[1650, 232, 20, 24, -0.2], [1695, 226, 17, 22, 0.25]]) {
    g.save(); g.translate(cx, cy); g.rotate(a);
    dot(g, 0, 0, rx, "#070707");
    for (let k = 0; k < 4; k++) { g.strokeStyle = grey(k % 2 ? 0.15 : 0.55); g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, 0, rx - k * 3, ry - k * 3.5, 0, 0, PI * 2); g.stroke(); }
    g.restore();
  }
  curve(g, [[1628, 236], [1640, 212], [1672, 205], [1712, 210], [1735, 228]], 4, grey(0.35), { seed: 2316 });
  // the cable mass hanging over the dark cartons
  const r = rng(2320);
  for (let i = 0; i < 12; i++) {
    const x0 = 1745 + r() * 100, y0 = 245 + r() * 20, dx = (r() - 0.3) * 60;
    cable(g, [[x0, y0], [x0 + dx * 0.3 + 10, y0 + 60 + r() * 20], [x0 + dx * 0.7, y0 + 120 + r() * 40], [x0 + dx, y0 + 170 + r() * 60]], 2.4 + r() * 1.6, 2321 + i, 0.55);
  }
  for (let i = 0; i < 3; i++) { g.strokeStyle = grey(0.45, 0.7); g.lineWidth = 2; g.beginPath(); g.ellipse(1800 + i * 10, 330, 34 - i * 6, 56 - i * 8, 0.2, 0.2, 5.8); g.stroke(); }
  ink(g, [[1780, 413], [1893, 413]], 1.4, grey(0.5), { seed: 2325 });
  // the tall lit carton under the counter
  stripes(g, [[1880, 245], [1937, 225], [1938, 405], [1881, 408]], { per: 6.2, cov: fadeEdges(bl(0.85, 0.75, 0.55, 0.6), 0.03, 0.02), lum: 0.93, seed: 2330 });
  ink(g, [[1880, 245], [1937, 225]], 1.6, grey(0.9), { seed: 2331 });
  // two striped cartons under the plant, stacked
  stripes(g, [[1932, 378], [2085, 330], [2086, 455], [1932, 487]], { per: 6.2, cov: fadeEdges(bl(0.95, 0.85, 0.72, 0.8), 0.02, 0.0), lum: 0.95, seed: 2332 });
  ink(g, [[1932, 378], [2085, 330]], 1.8, grey(0.92), { seed: 2333 });
  stripes(g, [[1932, 487], [2086, 455], [2087, 552], [1932, 556]], { per: 6.2, cov: fadeEdges(bl(0.85, 0.8, 0.6, 0.65), 0.02, 0.0), lum: 0.92, seed: 2334 });
  ink(g, [[1932, 487], [2086, 455]], 1.6, BLK, { seed: 2335 });
  fillPoly(g, [[1968, 356], [2010, 344], [2012, 356], [1970, 368]], grey(0.8));
  // dim bits right of them
  stripes(g, [[2105, 335], [2155, 335], [2155, 356], [2105, 356]], { per: 4, cov: 0.4, lum: 0.7, seed: 2336 });
  stripes(g, [[2130, 460], [2165, 460], [2165, 492], [2130, 492]], { per: 4, cov: 0.4, lum: 0.7, seed: 2337 });
  // plant: pot on a shelf plate, leaves, trailing vine
  ink(g, [[2060, 336], [2176, 334]], 2.4, grey(0.7), { seed: 2340 });
  const pot = [[2084, 288], [2150, 286], [2145, 332], [2090, 334]];
  stripes(g, pot, { dir: "h", per: 3.4, cov: (u, v) => lerp(0.4, 0.95, Math.sin(PI * clamp(u))), lum: 0.9, seed: 2341, brk: 0.2 });
  ink(g, pot, 1.4, BLK, { closed: true, seed: 2342 });
  const RL = [[2095, 280, -1.75, 30], [2118, 276, -1.3, 30], [2140, 280, -0.8, 30], [2078, 282, -2.2, 28], [2160, 288, -0.3, 26], [2066, 272, -2.7, 28],
    [2102, 262, -1.6, 28], [2130, 258, -1.1, 26], [2150, 250, -0.7, 26], [2080, 256, -2.1, 28], [2050, 262, -2.6, 26], [2168, 270, 0.1, 22],
    [2030, 285, 2.9, 26], [2010, 300, 2.6, 24], [2040, 300, 1.9, 24], [2112, 240, -1.5, 22], [2155, 305, 0.6, 24]];
  RL.forEach(([x, y, a, s], i) => leaf(g, x, y, a, s, 0.66 + (i % 3) * 0.08, 2350 + i * 3));
  curve(g, [[2046, 300], [2040, 340], [2046, 380], [2040, 420], [2046, 450]], 1.1, grey(0.5, 0.6), { seed: 2349 });
  [[2040, 318, 2.6, 22], [2046, 340, 1.0, 22], [2040, 362, 2.2, 22], [2046, 385, 1.2, 22], [2040, 408, 2.0, 20], [2046, 430, 1.4, 20]].forEach(([x, y, a, s], i) => leaf(g, x, y, a, s, 0.72, 2400 + i * 3));
}

// the upright synth: a keyboard standing on end, leaning back a little (top to the right)
function uprightSynth(g) {
  // knob device at far left of the stack
  fillPoly(g, [[1560, 440], [1590, 440], [1590, 550], [1560, 550]], grey(0.12));
  for (let i = 0; i < 4; i++) { dot(g, 1575, 455 + i * 24, 4, grey(0.08)); ring(g, 1575, 455 + i * 24, 4, 1.2, grey(0.7)); }
  // local frame: u across (0 left .. 1 right), v down (0 top .. 1 bottom); corners measured at 2.4x
  const TL = [1650, 488], TR = [1766, 445], BR = [1752, 760], BLc = [1632, 746];
  const Q = [TL, TR, BR, BLc], at = (u, v) => bil(Q, u, v);
  const quad = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  fillPoly(g, Q, "#060606");
  // jack column (dark), module strip (grey), keys, right rail
  for (let i = 0; i < 12; i++) { const [x, y] = at(0.1, 0.06 + i * 0.078); g.fillStyle = grey(0.88); g.beginPath(); g.ellipse(x, y, 4.5, 2.6, 0, 0, PI * 2); g.fill(); dot(g, x, y + 0.6, 1.4, grey(0.05)); }
  stripes(g, quad(0.2, 0.08, 0.42, 1), { per: 3.2, cov: 0.35, lum: 0.72, seed: 2502, brk: 0.2 });
  for (let i = 0; i < 16; i++) for (const uu of [0.26, 0.36]) { const [x, y] = at(uu, 0.1 + i * 0.056); dot(g, x, y, 2.8, grey(0.05)); ring(g, x, y, 3, 0.9, grey(0.7)); }
  // control head at the top: four big knobs on a grey plate
  stripes(g, quad(0.35, 0, 0.98, 0.2), { dir: "h", per: 3, cov: 0.4, lum: 0.75, seed: 2503, brk: 0.2 });
  for (const [uu, vv] of [[0.48, 0.07], [0.72, 0.05], [0.52, 0.15], [0.78, 0.13]]) { const [x, y] = at(uu, vv); dot(g, x, y, 7, grey(0.07)); ring(g, x, y, 7, 1.6, grey(0.85)); dot(g, x - 2, y - 2, 1.6, grey(0.9)); }
  // keys (on end): white bars across, black keys from the left
  const k0 = 0.2, k1 = 0.99, nk = 20;
  fillPoly(g, quad(0.46, k0, 0.9, k1), grey(0.95));
  for (let i = 0; i <= nk; i++) { const v = k0 + (k1 - k0) * (i / nk); ink(g, [at(0.46, v), at(0.9, v)], 1.1, grey(0.12), { seed: 2510 + i, jit: 0.1 }); }
  for (let i = 0; i < nk; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) { const v = k0 + (k1 - k0) * ((i + 0.7) / nk), h = (k1 - k0) * 0.6 / nk; fillPoly(g, quad(0.46, v, 0.68, v + h), "#060606"); }
  ink(g, [at(0.9, 0.2), at(0.9, 1)], 2.4, grey(0.55), { seed: 2540 });
  ink(g, [TR, BR], 2, grey(0.75), { seed: 2541 });
  ink(g, [TL, TR], 2, grey(0.8), { seed: 2542 });
  // floor gear in front of it
  fillPoly(g, [[1592, 762], [1662, 760], [1664, 800], [1594, 802]], grey(0.22)); ink(g, [[1592, 762], [1662, 760], [1664, 800], [1594, 802]], 1.2, grey(0.7), { closed: true, seed: 2543 });
  dot(g, 1620, 776, 8, grey(0.1)); ring(g, 1620, 776, 8, 1.4, grey(0.8));
  fillPoly(g, [[1618, 800], [1682, 798], [1684, 842], [1620, 844]], grey(0.8)); ink(g, [[1618, 800], [1682, 798], [1684, 842], [1620, 844]], 1.3, BLK, { closed: true, seed: 2544 });
  fillPoly(g, [[1632, 810], [1664, 809], [1664, 826], [1632, 827]], grey(0.2));
  stripes(g, [[1682, 792], [1722, 792], [1722, 842], [1682, 842]], { per: 4.5, cov: 0.8, lum: 0.9, seed: 2545 });
  stripes(g, [[1752, 830], [1778, 829], [1779, 860], [1753, 861]], { dir: "h", per: 3, cov: 0.9, lum: 0.95, seed: 2546 });
  dot(g, 1761, 846, 2.6, grey(0.05));
  stripes(g, [[1530, 862], [1600, 860], [1602, 878], [1532, 880]], { dir: "h", per: 3, cov: 0.9, lum: 0.9, seed: 2547 });
}

function metalBar(g, a, b, w, seed) {
  // a flight-case extrusion: a pale bar with a dark groove and a bright top edge
  ink(g, [a, b], w, grey(0.9), { seed, jit: 0.2, ends: 0.95 });
  const n = [-(b[1] - a[1]), b[0] - a[0]], l = Math.hypot(n[0], n[1]);
  const off = (k) => [[a[0] + (n[0] / l) * k, a[1] + (n[1] / l) * k], [b[0] + (n[0] / l) * k, b[1] + (n[1] / l) * k]];
  ink(g, off(-w * 0.28), w * 0.22, grey(1), { seed: seed + 1, jit: 0.2, ends: 0.95 });
  ink(g, off(w * 0.12), w * 0.12, grey(0.3), { seed: seed + 2, jit: 0.2, ends: 0.95 });
  ink(g, off(w * 0.42), w * 0.1, grey(0.2), { seed: seed + 3, jit: 0.2, ends: 0.95 });
}
function rightLow(g) {
  // lower striped carton behind the lid
  // the flight case: black body, pale metal rails, corner brackets, a handle and a latch
  const body = [[1797, 510], [1968, 516], [1992, 540], [1998, 600], [1990, 650], [1797, 654]];
  fillBlob(g, body, "#050505");
  curve(g, [[1968, 516], [1990, 536], [1998, 600], [1990, 650]], 2, grey(0.55), { seed: 2600 });
  metalBar(g, [1818, 530], [1952, 530], 11, 2601);
  metalBar(g, [1800, 586], [1964, 586], 20, 2602);
  metalBar(g, [1809, 526], [1809, 650], 18, 2603);
  metalBar(g, [1956, 530], [1956, 650], 14, 2604);
  fillPoly(g, [[1852, 513], [1920, 513], [1920, 523], [1852, 523]], grey(0.75)); ink(g, [[1852, 513], [1920, 513]], 1.2, grey(0.95), { seed: 2605 }); ink(g, [[1852, 523], [1920, 523]], 1.2, BLK, { seed: 2606 });
  for (const [x, y] of [[1812, 535], [1951, 538], [1812, 586], [1952, 586]]) { fillPoly(g, [[x - 12, y - 11], [x + 12, y - 11], [x + 12, y + 12], [x - 12, y + 12]], grey(0.72)); ink(g, [[x - 12, y - 11], [x + 12, y - 11], [x + 12, y + 12], [x - 12, y + 12]], 1.3, BLK, { closed: true, seed: x + y }); dot(g, x - 3, y - 3, 2.6, grey(0.1)); dot(g, x - 3.5, y - 3.5, 1, grey(0.9)); }
  fillPoly(g, [[1900, 568], [1932, 568], [1932, 614], [1900, 614]], grey(0.8)); ink(g, [[1900, 568], [1932, 568], [1932, 614], [1900, 614]], 1.6, BLK, { closed: true, seed: 2610 });
  fillPoly(g, [[1906, 576], [1926, 576], [1926, 606], [1906, 606]], grey(0.25)); fillPoly(g, [[1909, 590], [1923, 590], [1923, 600], [1909, 600]], grey(0.6));
  // the bright lid leaning on the carton, hatched diagonally
  const lid = [[1992, 553], [2085, 543], [2082, 630], [2000, 650]];
  brush(g, lid, (v) => { v.fillStyle = lg(v, 1992, 545, 2085, 650, [[0, 0.82], [0.6, 0.7], [1, 0.45]]); v.fillRect(1988, 540, 100, 114); }, 2.0, { len: 20, w: 2, gap: 1.6, seed: 2620, jit: 0.15, base: 0.55 });
  ink(g, lid, 1.4, BLK, { closed: true, seed: 2621 });
  ink(g, [lid[0], lid[1]], 1.2, grey(0.9), { seed: 2622 });
  // lower-left carton (lit toward its right)
  face(g, [[1776, 650], [1857, 650], [1858, 834], [1778, 836]], [0.45, 0.62, 0.5, 0.25], "v", { seed: 2630 });
  ink(g, [[1776, 650], [1857, 650]], 1.6, grey(0.9), { seed: 2631 });
  // magazines on the floor: a stack of eight, lit page edges at the front left
  for (let i = 0; i < 8; i++) {
    const y = 757 + i * 11.8, x0 = 1900 + ((i * 5) % 11), x1 = 2088 - ((i * 7) % 12);
    const k = 0.95 - i * 0.03;
    stripes(g, [[x0, y], [x1, y - 1], [x1 + 2, y + 10.5], [x0 + 1, y + 11.5]], { dir: "h", per: 2.4, cov: (u, v) => k * lerp(0.95, 0.35, sstep(0.25, 0.9, u)) * (1 - 0.35 * v), lum: 0.95, seed: 2640 + i * 2, brk: 0.3 });
    ink(g, [[x0, y], [x1, y - 1], [x1 + 2, y + 10.5], [x0 + 1, y + 11.5]], 1.1, BLK, { closed: true, seed: 2641 + i * 2 });
  }
  // backpack standing behind the magazines (x 2010-2178): its back toward us, two padded shoulder straps running
  // down from its rounded top, dim lit quilting between them (measured at 2x, 50 s)
  const bp = [[2010, 650], [2025, 626], [2050, 614], [2080, 614], [2110, 618], [2134, 630], [2156, 670], [2172, 730], [2178, 800], [2172, 835], [2140, 845], [2105, 850], [2075, 848], [2050, 830], [2030, 780], [2016, 720]];
  brush(g, bp, (v) => {
    v.fillStyle = lg(v, 2010, 0, 2178, 0, [[0, 0.08], [0.45, 0.14], [0.8, 0.2], [1, 0.1]]); v.fillRect(2006, 610, 176, 244);
    for (let i = 0; i < 7; i++) vLineC(v, [[2078, 660 + i * 26], [2112, 654 + i * 26], [2146, 662 + i * 26]], 3, 0.32, 1.5);
  }, 1.5, { len: 12, w: 2, gap: 1.6, seed: 2650, smooth: true, jit: 0.35, base: 0.55 });
  const strap = (L, R, seed, v0, v1) => {
    const shp = [...L, ...[...R].reverse()];
    brush(g, shp, (v) => { v.fillStyle = lg(v, 0, 612, 0, 850, [[0, v0], [1, v1]]); v.fillRect(2000, 606, 186, 250); }, 1.35, { len: 11, w: 2, gap: 1.4, seed, smooth: true, jit: 0.3, base: 0.6 });
    curve(g, L, 1.4, grey(0.02), { seed: seed + 1 }); curve(g, R, 1.4, grey(0.02), { seed: seed + 2 });
    const q = sampleCurve(L, 8), q2 = sampleCurve(R, 8);
    for (let i = 3; i < Math.min(q.length, q2.length) - 2; i += 5) ink(g, [P2(q[i], q2[i], 0.12), P2(q[i], q2[i], 0.88)], 1, grey(0.04, 0.8), { seed: seed + 10 + i });
    curve(g, q.map((p, i) => P2(p, q2[Math.min(i, q2.length - 1)], 0.2)), 1, grey(0.8, 0.6), { seed: seed + 3 });
  };
  strap([[2020, 650], [2040, 715], [2060, 790], [2075, 842]], [[2064, 636], [2072, 690], [2086, 750], [2100, 810], [2106, 846]], 2660, 0.5, 0.3);
  strap([[2104, 638], [2124, 690], [2140, 750], [2150, 810]], [[2108, 620], [2132, 632], [2156, 682], [2170, 740], [2176, 800]], 2670, 0.42, 0.26);
  curve(g, [[2012, 648], [2026, 626], [2050, 614], [2080, 614], [2110, 618], [2134, 630]], 1.6, grey(0.55, 0.8), { seed: 2672, ends: 0.6 });
  curve(g, bp.slice(0, 8), 1.2, grey(0.35, 0.6), { seed: 2690, ends: 0.8 });
  // small box, top right
  fillPoly(g, [[2130, 455], [2175, 455], [2175, 490], [2130, 490]], grey(0.2));
}

// ======================================================================================
// FLOOR
// ======================================================================================
function floor(g) {
  // dark boards seen in steep perspective: short lit streaks radiating from under the desk, brightest in a band at
  // y 875-915 and toward the middle, black below; cables lie in loops across it (the source, 50 s)
  const vx = 1075, vy = 700;
  tex(g, [[0, 850], [PW, 850], [PW, PH], [0, PH]], (v) => {
    v.fillStyle = lg(v, 0, 850, 0, PH, [[0, 0], [0.25, 0.03], [0.45, 0.14], [0.62, 0.16], [0.8, 0.08], [1, 0]]); v.fillRect(0, 850, PW, 96);
    v.globalCompositeOperation = "multiply";
    v.fillStyle = lg(v, 0, 0, PW, 0, [[0, grey(0.35)], [0.3, grey(0.8)], [0.5, grey(1)], [0.7, grey(0.8)], [1, grey(0.35)]]); v.fillRect(0, 850, PW, 96);
  }, 0, { per: 6.5, seed: 2701, wExp: 1.1, brk: 1.4, brkL: 2, wav: 0.05, bg: 0, coord: (x, y) => { const a = Math.atan2(x - vx, y - vy); return [a * 260, Math.hypot(x - vx, y - vy)]; } });
  // floor cables
  for (const [pts, w, sd] of [
    [[[140, 880], [260, 872], [380, 884], [470, 872], [560, 886]], 3.6, 2710], [[[520, 868], [600, 882], [680, 874], [760, 890], [840, 884], [900, 892]], 4, 2711],
    [[[600, 858], [650, 846], [700, 858], [690, 876], [640, 872], [620, 858]], 3, 2712], [[[1280, 872], [1360, 884], [1440, 876], [1520, 888], [1600, 880], [1680, 890], [1760, 884]], 4, 2713],
    [[[1300, 860], [1380, 868], [1460, 860], [1540, 872]], 3.4, 2714], [[[1560, 850], [1600, 864], [1660, 858], [1700, 870], [1780, 862], [1850, 874]], 3.4, 2715],
    [[[1720, 846], [1760, 858], [1800, 850], [1790, 866], [1750, 868]], 2.8, 2716], [[[380, 864], [420, 876], [480, 868], [520, 880]], 3, 2717], [[[1860, 866], [1930, 872], [2000, 866], [2080, 876]], 3, 2718],
  ]) cable(g, pts, w, sd, 0.6);
}

// The room's light: the gear around him is lit by the laptop and the lamp and falls off toward the edges of
// the page and into the floor. Multiplied over everything painted before the figure.
function roomLight(g) {
  const c = document.createElement("canvas"); c.width = Math.round(PW / 4); c.height = Math.round(PH / 4);
  const t = c.getContext("2d", { willReadFrequently: true });
  t.scale(0.25, 0.25);
  t.fillStyle = "#fff"; t.fillRect(0, 0, PW, PH);
  t.save(); t.translate(1000, 470); t.scale(1, 0.55);
  const r = t.createRadialGradient(0, 0, 0, 0, 0, 1150);
  r.addColorStop(0, grey(1)); r.addColorStop(0.36, grey(1)); r.addColorStop(0.66, grey(0.82)); r.addColorStop(0.88, grey(0.72)); r.addColorStop(1, grey(0.7));
  t.fillStyle = r; t.fillRect(-1300, -1800, 2600, 3600);
  t.restore();
  const b = t.createLinearGradient(0, 780, 0, 946); b.addColorStop(0, "rgba(0,0,0,0)"); b.addColorStop(1, "rgba(0,0,0,0.3)");
  t.fillStyle = b; t.fillRect(0, 780, PW, 166);
  g.save(); g.globalCompositeOperation = "multiply"; g.imageSmoothingQuality = "low"; g.drawImage(c, 0, 0, PW, PH); g.restore();
}

// ======================================================================================
export function paintSokoIll(g, { gaze = "owl" } = {}) {
  const steps = [
    () => wallLight(g),
    () => floor(g),
    () => rightBack(g),
    () => leftBack(g),
    () => leftMid(g),
    () => keyboardLeft(g),
    () => guitarCase(g),
    () => leftLow(g),
    () => plantLeft(g),
    () => speakerL(g),
    () => crateAndBooks(g),
    () => ampGroup(g),
    () => pedalboard(g),
    () => doNotKnock(g),
    () => uprightSynth(g),
    () => rightLow(g),
    () => rightCentre(g),
    () => deskUnder(g),
    () => pants(g),
    () => shoes(g),
    () => torso(g),
    () => head(g, gaze),
    () => headphones(g),
    () => laptop(g),
    () => deskTop(g),
    () => mug(g),
    () => lampAndGear(g),
    () => cables(g),
  ];
  g.fillStyle = "#000"; g.fillRect(0, 0, PW, PH);
  for (const f of steps) f();
}

// Cached illustration. scale supersamples (e.g. 1.5 for a push-in); the canvas is PAGE*scale.
const illCache = new Map();
export function sokoIllCanvas({ gaze = "owl", scale = 1 } = {}) {
  const key = `${gaze}:${scale}`;
  if (illCache.has(key)) return illCache.get(key);
  const c = document.createElement("canvas");
  c.width = Math.round(PW * scale); c.height = Math.round(PH * scale);
  // painted on a CPU-backed canvas: thousands of small strokes and local blurs rasterise far faster in software
  // than through a (possibly emulated) GPU, and the result is only read back once
  const g = c.getContext("2d", { willReadFrequently: true });
  g.scale(scale, scale);
  paintSokoIll(g, { gaze });
  // (softening happens once on the finished page, see SOKO_SOFT in sites.js)
  const out = c;
  out.__scale = scale;
  illCache.set(key, out);
  return out;
}
export function releaseSokoIll() { illCache.clear(); }

// The illustration on a laptop page (0–6 s): stretched to the screen like the source's laptop.
export function sokoIllSmall(ctx, w, h) {
  const c = sokoIllCanvas({ gaze: "down" });
  ctx.save();
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(c, 0, 0, c.width, c.height, 0, 0, w, h);
  ctx.restore();
}
