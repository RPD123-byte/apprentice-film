// The sōko page's hero illustration: the designer at his desk inside a wall of gear, white ink on black.
// Page coordinates (2206 x 946 = the full-frame page at 48.8–53.2 s). F1 pass 3: redrawn object by object from
// labelled 3–8x crops of the source's owl-free plate (median of 48.6–50.4 s + 53.12–53.2 s for the owl's area),
// with the light of each surface measured on the plate with the film's grade undone (pre-grade values).
// Everything is drawn in code: paths, strokes and per-pixel carved lines; no image is loaded, no source pixel used.
//
//   sokoIllCanvas({ gaze, scale })  cached canvas, PAGE_W*scale x PAGE_H*scale, black background
//                                   gaze: "owl" (eyes hard to his right, at the owl: 47.84–53.24) | "down" (69.44+)
//   paintSokoIll(g, { gaze })       paint it into any context in page coordinates (uncached)
//   sokoIllSmall(ctx, w, h)         the illustration stretched onto a laptop page (s01/s05/s07)
//   gaussBlurRGBA / blurCanvas      exact deterministic gaussian blur (shared with other modules)
import { taper } from "./ink.js";
import { smoothPath, sampleCurve } from "./paths.js";
import { rng } from "./rng.js";

const PW = 2206, PH = 946;
const PI = Math.PI, TAU = PI * 2;

// ======================================================================================
// helpers
// ======================================================================================
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const grey = (v, a = 1) => { const c = Math.round(clamp(v) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };
const P2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const bil = (q, u, v) => P2(P2(q[0], q[1], u), P2(q[3], q[2], u), v);
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const polyPath = (g, pts) => { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
const bboxOf = (pts, pad = 0) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]; };
// a shape: a point list (polygon), {pts, smooth:true} (Catmull-Rom closed), or a path function with .bb
function S(pts, smooth = false) { return { pts, smooth }; }
function shapeBB(sh, pad = 2) { if (Array.isArray(sh)) return bboxOf(sh, pad); if (sh.pts) return bboxOf(sh.pts, pad + (sh.smooth ? 3 : 0)); return [sh.bb[0] - pad, sh.bb[1] - pad, sh.bb[2] + pad, sh.bb[3] + pad]; }
function tracePath(c, sh) {
  if (Array.isArray(sh)) polyPath(c, sh);
  else if (sh.pts) { if (sh.smooth) smoothPath(c, sh.pts, true); else polyPath(c, sh.pts); }
  else sh(c);
}
const ELL = (x, y, rx, ry, a = 0) => Object.assign((c) => c.ellipse(x, y, rx, ry, a, 0, TAU), { bb: [x - Math.max(rx, ry), y - Math.max(rx, ry), x + Math.max(rx, ry), y + Math.max(rx, ry)] });
const RECT = (x, y, w, h) => Object.assign((c) => c.rect(x, y, w, h), { bb: [x, y, x + w, y + h] });

// ======================================================================================
// blur (exported: other modules use it)
// ======================================================================================
// An exact, deterministic gaussian blur of RGBA pixels in place (separable, zero outside the image). Canvas
// `filter: blur()` is never used: on CPU-backed canvases Chrome skips blurs under ~0.8 px and quantizes the rest.
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
export function blurCanvas(c, sigma) {
  if (!(sigma > 0.05)) return c;
  const g = c.getContext("2d", { willReadFrequently: true });
  const id = g.getImageData(0, 0, c.width, c.height);
  gaussBlurRGBA(id.data, c.width, c.height, sigma);
  g.putImageData(id, 0, 0);
  return c;
}

// scratch canvases (grown on demand, reused)
const SCR = {};
function scr(name, w, h) {
  let c = SCR[name];
  if (!c || c.width < w || c.height < h) {
    const n = document.createElement("canvas"); n.width = Math.max(w, c ? c.width : 0, 64); n.height = Math.max(h, c ? c.height : 0, 64);
    SCR[name] = c = n;
  }
  return c;
}
function freeScratch() { for (const k of Object.keys(SCR)) { SCR[k].width = SCR[k].height = 0; delete SCR[k]; } }
// device-pixel box of a page-space bb under g's (scale + translate) transform
function devBox(g, bb) {
  const m = g.getTransform();
  const X0 = Math.max(0, Math.floor(bb[0] * m.a + m.e)), Y0 = Math.max(0, Math.floor(bb[1] * m.d + m.f));
  const X1 = Math.min(g.canvas.width, Math.ceil(bb[2] * m.a + m.e)), Y1 = Math.min(g.canvas.height, Math.ceil(bb[3] * m.d + m.f));
  return { m, X0, Y0, X1, Y1, w: X1 - X0, h: Y1 - Y0 };
}
// Blurred drawing: draw(c) into a scratch canvas round bb, blur it there (exact gaussian, page px), composite back
function blurDraw(g, bb, blur, draw, { op = "source-over", alpha = 1 } = {}) {
  const m = g.getTransform(), k = Math.hypot(m.a, m.b), pad = blur * 3 + 2;
  const D = devBox(g, [bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad]);
  if (D.w <= 0 || D.h <= 0) return;
  // large blurs are computed at reduced resolution (sigma 2.5 device px there) and drawn back smoothly scaled
  const sd = blur * k, f = sd > 5 ? Math.floor(sd / 2.5) : 1, w = Math.ceil(D.w / f), h = Math.ceil(D.h / f);
  const A = scr("bdA", w, h), a = A.getContext("2d", { willReadFrequently: true });
  a.setTransform(1, 0, 0, 1, 0, 0); a.globalAlpha = 1; a.globalCompositeOperation = "source-over"; a.clearRect(0, 0, w, h);
  a.setTransform(m.a / f, m.b / f, m.c / f, m.d / f, (m.e - D.X0) / f, (m.f - D.Y0) / f);
  draw(a);
  if (blur > 0.05) { const id = a.getImageData(0, 0, w, h); gaussBlurRGBA(id.data, w, h, sd / f); a.putImageData(id, 0, 0); }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = op; g.globalAlpha *= alpha; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(A, 0, 0, w, h, D.X0, D.Y0, w * f, h * f); g.restore();
}

// ======================================================================================
// noise
// ======================================================================================
const hI = (a, b, s) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
function vn2(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hI(ix, iy, s), b = hI(ix + 1, iy, s), c = hI(ix, iy + 1, s), d = hI(ix + 1, iy + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
// fractal value noise in [0,1]
const fbm = (x, y, s, oct = 3) => { let v = 0, a = 0.5, n = 0; for (let i = 0; i < oct; i++) { v += a * vn2(x, y, s + i * 17); n += a; x *= 2.03; y *= 2.03; a *= 0.5; } return v / n; };

// inverse bilinear map of p inside quad [TL, TR, BR, BL] -> [u, v]
function invBil(px, py, q) {
  const a = q[0], b = q[1], c = q[2], d = q[3];
  const ex = b[0] - a[0], ey = b[1] - a[1], fx = d[0] - a[0], fy = d[1] - a[1];
  const gx = a[0] - b[0] + c[0] - d[0], gy = a[1] - b[1] + c[1] - d[1], hx = px - a[0], hy = py - a[1];
  const k2 = gx * fy - gy * fx, k1 = ex * fy - ey * fx + hx * gy - hy * gx, k0 = hx * ey - hy * ex;
  if (Math.abs(k2) < 1e-3) { const v = -k0 / k1; return [(hx - fx * v) / (ex + gx * v || 1e-6), v]; }
  let w = k1 * k1 - 4 * k0 * k2; if (w < 0) w = 0; w = Math.sqrt(w);
  const ik2 = 0.5 / k2; let v = (-k1 - w) * ik2, u = (hx - fx * v) / (ex + gx * v || 1e-6);
  if (u < -0.05 || u > 1.05 || v < -0.05 || v > 1.05) { v = (-k1 + w) * ik2; u = (hx - fx * v) / (ex + gx * v || 1e-6); }
  return [u, v];
}

// ======================================================================================
// masks and value studies (device pixels)
// ======================================================================================
// rasterise a shape's coverage (0..255) over its device box
function maskOf(g, sh, bb) {
  const D = devBox(g, bb);
  if (D.w <= 0 || D.h <= 0) return null;
  const c = scr("mask", D.w, D.h), mc = c.getContext("2d", { willReadFrequently: true });
  mc.setTransform(1, 0, 0, 1, 0, 0); mc.globalAlpha = 1; mc.globalCompositeOperation = "source-over"; mc.clearRect(0, 0, D.w, D.h);
  mc.setTransform(D.m.a, 0, 0, D.m.d, D.m.e - D.X0, D.m.f - D.Y0);
  mc.beginPath(); tracePath(mc, sh); mc.fillStyle = "#fff"; mc.fill();
  const id = mc.getImageData(0, 0, D.w, D.h).data, M = new Uint8Array(D.w * D.h);
  for (let i = 0, j = 3; i < M.length; i++, j += 4) M[i] = id[j];
  D.M = M;
  return D;
}
// paint a value study (painter(vc) in page coordinates, black = 0) over a device box -> Float32 values
function valueOf(D, painter, blur = 0) {
  const c = scr("val", D.w, D.h), vc = c.getContext("2d", { willReadFrequently: true });
  vc.setTransform(1, 0, 0, 1, 0, 0); vc.globalAlpha = 1; vc.globalCompositeOperation = "source-over"; vc.fillStyle = "#000"; vc.fillRect(0, 0, D.w, D.h);
  vc.setTransform(D.m.a, 0, 0, D.m.d, D.m.e - D.X0, D.m.f - D.Y0);
  vc.save(); painter(vc); vc.restore();
  const id = vc.getImageData(0, 0, D.w, D.h);
  if (blur > 0) gaussBlurRGBA(id.data, D.w, D.h, blur * D.m.a);
  const d = id.data, V = new Float32Array(D.w * D.h);
  for (let i = 0, j = 0; i < V.length; i++, j += 4) V[i] = d[j] / 255;
  return V;
}
// write per-pixel results (value 0..1 and alpha 0..1 arrays) back over g
function writeBack(g, D, L, A) {
  const c = scr("out", D.w, D.h), oc = c.getContext("2d", { willReadFrequently: true });
  const out = oc.createImageData(D.w, D.h), O = out.data;
  for (let i = 0, j = 0; i < L.length; i++, j += 4) { const v = L[i] * 255; O[j] = v; O[j + 1] = v; O[j + 2] = v; O[j + 3] = A[i] * 255; }
  oc.putImageData(out, 0, 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, 0, 0, D.w, D.h, D.X0, D.Y0, D.w, D.h); g.restore();
}

// ======================================================================================
// carve(): scratchboard lines cut into a shape, evaluated per pixel
// ======================================================================================
// The source's environment is scratchboard: carved white lines on black, their width AND brightness following
// the light (thin grey lines in shadow, fat bright lines merging in the light), unevenly spaced, wandering and
// swelling a little along their length, breaking up in the mid-tones, soft-edged.
//   coordinates: o.q = quad [TL, TR, BR, BL] (lines run TL->BL for dir "v", TL->TR for dir "h", following the
//     quad's perspective), or o.ang (lines run along this angle), or o.coord(x, y) -> [across px, along px]
//   value (target mean brightness 0..1): o.v number | o.vq(u, v) (quad local) | o.vf(x, y) | o.vp painter(vc)
//   o.per period px · o.lum max brightness · o.wExp width exponent · o.jit spacing jitter (0..0.45 periods) ·
//   o.wj per-line width jitter · o.bj per-line brightness jitter · o.wav wander (periods) over o.wavL px ·
//   o.sw along-line swelling amount over o.swL px · o.brk breaks (mid-tones) over o.brkL px ·
//   o.streak bright/dim streaks along lines over o.stL px · o.bg dark base as a fraction of the value ·
//   o.soft edge softness (px) · o.alpha · o.over (lines only, no base: alpha = line coverage)
function carve(g, sh, o = {}) {
  const { q = null, dir = "v", ang = PI / 2, coord = null, v = 0.5, vq = null, vf = null, vp = null, vblur = 0,
    per = 5, lum = 0.97, wExp = 0.74, jit = 0.12, wj = 0.2, bj = 0.16, wav = 0.22, wavL = 45, sw = 0.15, swL = 30,
    brk = 0.25, brkL = 30, streak = 0.3, stL = 40, bg = 0.12, soft = 1.5, alpha = 1, over = false, seed = 1, maxCov = 0.94,
    gamma = 1, gain = 1, vmin = 0 } = o;
  const shape = sh || q;
  const bb = shapeBB(shape, 1);
  const D = maskOf(g, shape, bb);
  if (!D) return;
  const V = vp ? valueOf(D, vp, vblur) : null;
  const { m, X0, Y0, w, h, M } = D, sc = m.a;
  let qa = 0, qb = 0;
  if (q) {
    const wid = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2, hei = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
    if (dir === "v") { qa = wid; qb = hei; } else { qa = hei; qb = wid; }
  }
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const aa = Math.max(0.03, soft / (per * sc));
  const L = new Float32Array(w * h), A = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    const py = (Y0 + j + 0.5 - m.f) / sc;
    for (let i = 0; i < w; i++) {
      const k = j * w + i, ma = M[k];
      if (!ma) continue;
      const px = (X0 + i + 0.5 - m.e) / sc;
      let a, b, uu = 0, vv = 0;
      if (q) {
        const r = invBil(px, py, q); uu = clamp(r[0]); vv = clamp(r[1]);
        if (dir === "v") { a = uu * qa; b = vv * qb; } else { a = vv * qa; b = uu * qb; }
      } else if (coord) { const r = coord(px, py); a = r[0]; b = r[1]; }
      else { a = -sa * px + ca * py; b = ca * px + sa * py; }
      let val = V ? V[k] : vq ? vq(uu, vv) : vf ? vf(px, py) : v;
      val *= gain; if (gamma !== 1 && val > 0) val = Math.pow(val, gamma);
      if (val > 1) val = 1;
      let res = 0, cv = 0;
      if (val > 0.002) {
        let c = a / per;
        if (wav) c += wav * (vn2(c * 0.23, b / wavL, seed) - 0.5) * 2;
        const k0 = Math.floor(c);
        let best = 0, bestB = 0;
        for (let kk = k0 - 1; kk <= k0 + 1; kk++) {
          const h1 = hI(kk, 11, seed), h2 = hI(kk, 23, seed), h3 = hI(kk, 37, seed);
          const cen = kk + 0.5 + jit * (h1 - 0.5) * 2;
          const d = Math.abs(c - cen);
          if (d > 1.2) continue;
          const c0 = Math.min(maxCov, Math.pow(val, wExp - 0.25 * (1 - val))), b0 = val / c0;
          let cov = c0 * (1 + wj * (h2 - 0.5) * 2);
          if (sw) cov *= 1 + sw * (vn2(b / swL + h3 * 50, kk * 1.37, seed + 5) - 0.5) * 2;
          if (brk) { const bk = brk * (1 - val) * 1.6, bn = vn2(b / brkL + h1 * 31, kk * 2.1, seed + 9); cov *= (1 - bk * sstep(0.5, 0.82, bn)) / (1 - bk * 0.3); }
          if (cov <= 0.01) continue;
          if (cov > maxCov) cov = maxCov;
          const hw = cov / 2;
          const lo = Math.max(d - aa / 2, -hw), hi = Math.min(d + aa / 2, hw);
          let pc = hi > lo ? (hi - lo) / aa : 0; if (pc > 1) pc = 1;
          if (pc > best) {
            best = pc;
            let br = Math.min(lum, b0 * (1 + bj * (h3 - 0.5) * 2));
            if (streak) br *= 1 + streak * (vn2(b / stL + h2 * 19, kk * 0.7, seed + 13) - 0.5) * 2;
            bestB = br;
          }
        }
        cv = best;
        res = over ? bestB : best * bestB + (1 - best) * bg * val;
      }
      if (val < vmin) { res = Math.max(res, 0); }
      L[k] = res;
      A[k] = (over ? cv : 1) * (ma / 255) * alpha;
    }
  }
  writeBack(g, D, L, A);
}

// ======================================================================================
// strokes along a direction field (cloth folds, hair, grain that bends)
// ======================================================================================
// seeds lines across the clip region at spacing `per` and traces each along ang(x, y); the width at each point is
// per * value^wExp (from o.vf(x, y) or o.vp painted study), broken where the value is low; white-ish strokes.
function streams(g, sh, o = {}) {
  const { ang = PI / 2, per = 4, vf = null, vp = null, vblur = 0, lum = 0.95, wExp = 0.8, step = 2, jit = 0.3, lj = 0.15,
    seed = 1, wMin = 0.25, wMax = 1.0, brk = 0, brkL = 30, alpha = 1, color = null, clip = true } = o;
  const angF = typeof ang === "number" ? () => ang : ang;
  const bb = shapeBB(sh, 2);
  let vAt = vf;
  if (!vf && vp) {
    const g1 = { getTransform: () => new DOMMatrix([1, 0, 0, 1, 0, 0]), canvas: { width: PW, height: PH } };
    const D = devBox(g1, bb); const V = valueOf(D, vp, vblur);
    vAt = (x, y) => { const i = clamp(Math.round(x - D.X0), 0, D.w - 1), j = clamp(Math.round(y - D.Y0), 0, D.h - 1); return V[j * D.w + i]; };
  }
  const r = rng(seed);
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, a0 = angF(cx, cy), nx = -Math.sin(a0), ny = Math.cos(a0);
  const half = Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) / 2 + per;
  const inBox = (x, y) => x > bb[0] - 2 && x < bb[2] + 2 && y > bb[1] - 2 && y < bb[3] + 2;
  g.save();
  if (clip) { g.beginPath(); tracePath(g, sh); g.clip(); }
  for (let s = -half; s <= half; s += per) {
    const off = s + (r() - 0.5) * per * jit * 2;
    const sx = cx + nx * off, sy = cy + ny * off;
    const wMul = 0.8 + r() * 0.4, lm = lum * (1 - lj * r());
    const pts = [];
    for (const d of [-1, 1]) {
      let x = sx, y = sy; const seg = [];
      for (let k = 0; k < 3000 && inBox(x, y); k++) { const a = angF(x, y); x += Math.cos(a) * step * d; y += Math.sin(a) * step * d; seg.push([x, y]); }
      if (d < 0) pts.push(...seg.reverse(), [sx, sy]); else pts.push(...seg);
    }
    let run = [], ws = [];
    const flush = () => { if (run.length > 1) taper(g, run, (u) => ws[Math.min(ws.length - 1, Math.round(u * (ws.length - 1)))], color || grey(lm, alpha)); run = []; ws = []; };
    const ph = r() * 100;
    for (let k = 0; k < pts.length; k++) {
      const [x, y] = pts[k];
      const vv = vAt ? vAt(x, y) : 0.5;
      let wd = per * Math.min(wMax, Math.pow(Math.max(0, vv), wExp) * wMul);
      if (brk && vn2(k * step / brkL + ph, s * 0.37, seed) > 1 - brk * (1 - vv)) wd = 0;
      if (wd < wMin) { flush(); continue; }
      run.push([x, y]); ws.push(wd);
    }
    flush();
  }
  g.restore();
}

// ======================================================================================
// painterly strokes: short tapered brush strokes along a direction field over a painted value study
// ======================================================================================
// A direction field from guide curves (inverse-distance weighted tangents), sampled on a grid over a box.
function guideField(curves, [x0, y0, x1, y1], cell = 5, fallback = PI / 2) {
  const smp = [];
  for (const c of curves) {
    const q = sampleCurve(c, 6);
    for (let i = 0; i < q.length - 1; i++) { const a = Math.atan2(q[i + 1][1] - q[i][1], q[i + 1][0] - q[i][0]); smp.push([q[i][0], q[i][1], Math.cos(2 * a), Math.sin(2 * a)]); }
  }
  const nx = Math.ceil((x1 - x0) / cell) + 1, ny = Math.ceil((y1 - y0) / cell) + 1, G = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * cell, y = y0 + j * cell; let sc = 0, ss = 0;
    for (const [px, py, c2, s2] of smp) { const w = 1 / ((px - x) ** 2 + (py - y) ** 2 + 60) ** 1.5; sc += c2 * w; ss += s2 * w; }
    G[j * nx + i] = smp.length ? Math.atan2(ss, sc) / 2 : fallback;
  }
  return (x, y) => { const i = clamp(Math.round((x - x0) / cell), 0, nx - 1), j = clamp(Math.round((y - y0) / cell), 0, ny - 1); return G[j * nx + i]; };
}
// brushFill: base = the value study darkened by `base`; then strokes laid on a jittered grid (spacing gap), each
// len long along ang(x, y), as bright as the value under it pushed by `contrast` (lit strokes whiter, shadow
// strokes dimmer), width w (thinner in shadow).
function brushFill(g, sh, { vp, vblur = 0, ang = PI / 2, len = 12, w = 1.8, gap = 0, density = 0.6, seed = 1, base = 0.35, contrast = 1.3, jit = 0.25, lj = 0.3, dark = 0.12, min = 0.04, gain = 0 } = {}) {
  if (!gap) gap = Math.sqrt(len * 0.95 * w * 0.5 / density);
  const kGain = (gain || (1 - (1 - density) * base) / density) * 1.3;
  const bb = shapeBB(sh, 2);
  const g1 = { getTransform: () => new DOMMatrix([1, 0, 0, 1, 0, 0]), canvas: { width: PW, height: PH } };
  const D = devBox(g1, bb); const V = valueOf(D, vp, vblur);
  const at = (x, y) => { const i = clamp(Math.round(x - D.X0), 0, D.w - 1), j = clamp(Math.round(y - D.Y0), 0, D.h - 1); return V[j * D.w + i]; };
  const af = typeof ang === "number" ? () => ang : ang;
  g.save(); g.beginPath(); tracePath(g, sh); g.clip();
  // base (the value study, darkened)
  const c = scr("brushBase", D.w, D.h), cg = c.getContext("2d");
  const id = cg.createImageData(D.w, D.h);
  for (let i = 0, j = 0; i < V.length; i++, j += 4) { const v = V[i] * base * 255; id.data[j] = id.data[j + 1] = id.data[j + 2] = v; id.data[j + 3] = 255; }
  cg.putImageData(id, 0, 0);
  g.drawImage(c, 0, 0, D.w, D.h, D.X0, D.Y0, D.w, D.h);
  const r = rng(seed);
  for (let y = bb[1]; y < bb[3]; y += gap) {
    for (let x = bb[0] + r() * gap; x < bb[2]; x += gap * (0.8 + r() * 0.6)) {
      const px = x + (r() - 0.5) * gap, py = y + (r() - 0.5) * gap;
      const v = at(px, py);
      if (v < min) continue;
      const a = af(px, py) + (r() - 0.5) * jit, L = len * (0.5 + r() * 0.9), ca = Math.cos(a) * L / 2, sa = Math.sin(a) * L / 2;
      const bend = (r() - 0.5) * L * 0.1, nx = -Math.sin(a) * bend, ny = Math.cos(a) * bend;
      const pts = [[px - ca, py - sa], [px - ca * 0.33 + nx, py - sa * 0.33 + ny], [px + ca * 0.33 + nx, py + sa * 0.33 + ny], [px + ca, py + sa]];
      const vc = clamp(0.5 + (v - 0.5) * contrast, 0.02, 1), dk = dark * (1 - v);
      let lv = clamp(vc * kGain * (1 + lj * (r() - 0.5) * 2) / (1 - 0.75 * dk));
      if (dark && r() < dk) lv *= 0.25;
      const ww = w * (0.6 + r() * 0.6) * (0.5 + 0.5 * v);
      taper(g, pts, (u) => ww * Math.pow(Math.sin(PI * clamp(u, 0.03, 0.97)), 0.7), grey(lv));
    }
  }
  g.restore();
}

// painted cloth: a soft value painting (the study x baseK) with long thin highlight and shadow lines laid along the
// fold field in broken segments (the source's trousers, shirt and bags at 7x: a mid-grey painted ground, thin white
// strokes 1–1.5 px wide and 20–60 px long, darker streaks between, soft light patches)
function clothPaint(g, sh, { vp, vblur = 2, ang = PI / 2, per = 4.5, seed = 1, baseK = 0.78, segL = [14, 50], gapL = [3, 14], hiW = [0.8, 1.7], dkW = [0.7, 1.5], hiP = 0.75, step = 1.5, alpha = 1, base = true, hiK = 1.35, hiB = 0.18, dens = 1.3 } = {}) {
  const bb = shapeBB(sh, 2);
  const g1 = { getTransform: () => new DOMMatrix([1, 0, 0, 1, 0, 0]), canvas: { width: PW, height: PH } };
  const D = devBox(g1, bb); const V = valueOf(D, vp, vblur);
  const at = (x, y) => { const i = clamp(Math.round(x - D.X0), 0, D.w - 1), j = clamp(Math.round(y - D.Y0), 0, D.h - 1); return V[j * D.w + i]; };
  const angF = typeof ang === "number" ? () => ang : ang;
  g.save(); g.beginPath(); tracePath(g, sh); g.clip();
  const c = scr("clothBase", D.w, D.h), cg = c.getContext("2d");
  const id = cg.createImageData(D.w, D.h);
  for (let i = 0, j = 0; i < V.length; i++, j += 4) { const v = V[i] * baseK * 255; id.data[j] = id.data[j + 1] = id.data[j + 2] = v; id.data[j + 3] = 255 * alpha; }
  cg.putImageData(id, 0, 0);
  if (base) g.drawImage(c, 0, 0, D.w, D.h, D.X0, D.Y0, D.w, D.h);
  const r = rng(seed);
  const inBox = (x, y) => x > bb[0] - 2 && x < bb[2] + 2 && y > bb[1] - 2 && y < bb[3] + 2;
  const Lavg = (segL[0] + segL[1]) / 2, N = Math.round((bb[2] - bb[0]) * (bb[3] - bb[1]) / (per * Lavg) * dens);
  for (let n = 0; n < N; n++) {
    const sx = lerp(bb[0], bb[2], r()), sy = lerp(bb[1], bb[3], r());
    const v = at(sx, sy);
    if (v < 0.03) { r(); r(); r(); r(); continue; }
    const L = lerp(segL[0], segL[1], r()) / 2, seg = [];
    for (const d of [-1, 1]) {
      let x = sx, y = sy; const part = [];
      for (let t = 0; t < L && inBox(x, y); t += step) { const a = angF(x, y); x += Math.cos(a) * step * d; y += Math.sin(a) * step * d; part.push([x, y]); }
      if (d < 0) seg.push(...part.reverse(), [sx, sy]); else seg.push(...part);
    }
    if (seg.length < 3) { r(); r(); r(); continue; }
    const hi = r() < hiP * (0.35 + v);
    const ww = hi ? lerp(hiW[0], hiW[1], r()) * (0.6 + 0.6 * v) : lerp(dkW[0], dkW[1], r());
    const col = hi ? grey(clamp(v * hiK + hiB + (r() - 0.5) * 0.2), alpha) : grey(v * 0.25, 0.8 * alpha);
    taper(g, seg, (u) => ww * Math.pow(Math.sin(PI * clamp(u, 0.02, 0.98)), 0.5), col);
  }
  g.restore();
}

// painted wood / worn surfaces: a quad painted with a value from vq(u, v), then long thin grain strokes along `dir`
function woodPaint(g, q, vq, { dir = "v", seed = 1, per = 3.4, hiP = 0.55, segL = [16, 60], baseK = 0.85, wiggle = 0.06 } = {}) {
  const [A, B, C, D] = q;
  const ang0 = dir === "v" ? Math.atan2(D[1] - A[1] + C[1] - B[1], D[0] - A[0] + C[0] - B[0]) : Math.atan2(B[1] - A[1] + C[1] - D[1], B[0] - A[0] + C[0] - D[0]);
  const bb = bboxOf(q, 1);
  clothPaint(g, q, { vp: (v) => { const w = Math.ceil(bb[2] - bb[0]), h = Math.ceil(bb[3] - bb[1]); const id = v.createImageData(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const [u, vv] = invBil(bb[0] + i + 0.5, bb[1] + j + 0.5, q); const val = clamp(vq(clamp(u), clamp(vv))) * 255, k = (j * w + i) * 4; id.data[k] = id.data[k + 1] = id.data[k + 2] = val; id.data[k + 3] = 255; } const t = v.getTransform(); v.putImageData(id, Math.round(bb[0] * t.a + t.e), Math.round(bb[1] * t.d + t.f)); },
    vblur: 1, ang: (x, y) => ang0 + wiggle * Math.sin(x * 0.07 + y * 0.05), per, seed, baseK, hiP, segL, gapL: [3, 12], hiW: [0.7, 1.4], dkW: [0.6, 1.2] });
}

// Line-integral-convolution strokes: sparse seeded noise smeared along a direction field gives flowing streaks;
// they modulate a painted value study (mean-preserving): value + amp * sqrt(v(1-v)) * streak. For cloth and
// soft worn surfaces whose strokes bend with the folds (the source's trousers, bag, shirt).
function licPaint(g, sh, { vp, vblur = 2, ang = PI / 2, L = 14, density = 0.18, amp = 1.5, seed = 1, cell = 1.3, gamma = 1, alpha = 1 } = {}) {
  const bb = shapeBB(sh, 1);
  const D = maskOf(g, sh, bb);
  if (!D) return;
  const V = valueOf(D, vp, vblur);
  const { m, X0, Y0, w, h, M } = D, sc = m.a;
  const angF = typeof ang === "number" ? () => ang : ang;
  // direction per pixel (sampled on a 3 px device grid)
  const G = 3, gw = Math.ceil(w / G) + 1, gh = Math.ceil(h / G) + 1, DX = new Float32Array(gw * gh), DY = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const a = angF((X0 + i * G - m.e) / sc, (Y0 + j * G - m.f) / sc); DX[j * gw + i] = Math.cos(a); DY[j * gw + i] = Math.sin(a); }
  const dirAt = (x, y) => { const i = clamp(Math.round(x / G), 0, gw - 1), j = clamp(Math.round(y / G), 0, gh - 1), k = j * gw + i; return [DX[k], DY[k]]; };
  // sparse noise on a cell grid (device px * cell), bright dots of random strength
  const cs = cell * sc;
  const N = (x, y) => { const ci = Math.floor(x / cs), cj = Math.floor(y / cs), hh = hI(ci, cj, seed); return hh < density ? 0.4 + 0.6 * hI(ci, cj, seed + 7) : 0; };
  // integrate in page-px steps, on a grid of stride K device px (bilinear in between): cost independent of scale
  const K = Math.max(1, Math.floor(sc)), st = sc, gw2 = Math.ceil(w / K) + 1, gh2 = Math.ceil(h / K) + 1, TG = new Float32Array(gw2 * gh2);
  for (let jj = 0; jj < gh2; jj++) for (let ii = 0; ii < gw2; ii++) {
    const i = Math.min(w - 1, ii * K), j = Math.min(h - 1, jj * K);
    let acc = N(i, j), wsum = 1;
    for (const sg of [-1, 1]) {
      let x = i, y = j, [dx, dy] = dirAt(x, y), px = dx, py = dy;
      for (let t = 1; t <= L; t++) {
        [dx, dy] = dirAt(x, y); if (dx * px + dy * py < 0) { dx = -dx; dy = -dy; } px = dx; py = dy;
        x += dx * sg * st; y += dy * sg * st;
        if (x < 0 || y < 0 || x >= w || y >= h) break;
        const wt = 1 - t / (L + 1); acc += N(x, y) * wt; wsum += wt;
      }
    }
    TG[jj * gw2 + ii] = acc / wsum;
  }
  const T = new Float32Array(w * h);
  let sum = 0, sum2 = 0, cnt = 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i; if (!M[k]) continue;
    const fx = i / K, fy = j / K, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0, x1 = Math.min(gw2 - 1, x0 + 1), y1 = Math.min(gh2 - 1, y0 + 1);
    const tv = (TG[y0 * gw2 + x0] * (1 - ax) + TG[y0 * gw2 + x1] * ax) * (1 - ay) + (TG[y1 * gw2 + x0] * (1 - ax) + TG[y1 * gw2 + x1] * ax) * ay;
    T[k] = tv; sum += tv; sum2 += tv * tv; cnt++;
  }
  const mu = sum / Math.max(1, cnt), sd = Math.sqrt(Math.max(1e-6, sum2 / Math.max(1, cnt) - mu * mu));
  const Lo = new Float32Array(w * h), A = new Float32Array(w * h);
  for (let k = 0; k < w * h; k++) {
    if (!M[k]) continue;
    const v = V[k], z = (T[k] - mu) / sd;
    let o = v + amp * Math.sqrt(Math.max(0, v * (1 - v))) * 0.5 * z;
    o = clamp(o); if (gamma !== 1) o = Math.pow(o, gamma);
    Lo[k] = o; A[k] = (M[k] / 255) * alpha;
  }
  writeBack(g, D, Lo, A);
}

// ======================================================================================
// ink
// ======================================================================================
// an inked polyline with a gentle swell (w at the middle, w*ends at the ends), lightly jittered
function ink(g, pts, w = 2, color = "#050505", { closed = false, seed = 1, ends = 0.6, jit = 0.25, smooth = false } = {}) {
  const r = rng(seed);
  let q = smooth ? sampleCurve(pts, 8, closed) : closed ? [...pts, pts[0]] : pts;
  const dense = [];
  for (let i = 0; i < q.length - 1; i++) {
    const [x0, y0] = q[i], [x1, y1] = q[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 5));
    for (let k = 0; k < n; k++) dense.push([x0 + (x1 - x0) * (k / n) + (r() - 0.5) * jit, y0 + (y1 - y0) * (k / n) + (r() - 0.5) * jit]);
  }
  dense.push(q[q.length - 1]);
  taper(g, dense, (u) => w * (ends + (1 - ends) * Math.pow(Math.sin(PI * clamp(u)), 0.5)), color);
}
const curve = (g, pts, w, color, o = {}) => ink(g, pts, w, color, { ...o, smooth: true });
function fill(g, sh, color) { g.beginPath(); tracePath(g, sh); g.fillStyle = color; g.fill(); }
function fillSoft(g, sh, color, blur, alpha = 1) {
  if (!(blur > 0.05)) { g.save(); g.globalAlpha *= alpha; fill(g, sh, color); g.restore(); return; }
  blurDraw(g, shapeBB(sh, 0), blur, (c) => fill(c, sh, color), { alpha });
}
function dot(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function ring(g, x, y, r, w, color, a0 = 0, a1 = TAU) { g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); }
function lgrad(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const [t, v] of stops) gr.addColorStop(t, typeof v === "number" ? grey(v) : v); return gr; }
function rgrad(g, x, y, r0, r1, stops, x1 = x, y1 = y) { const gr = g.createRadialGradient(x, y, r0, x1, y1, r1); for (const [t, v] of stops) gr.addColorStop(t, typeof v === "number" ? grey(v) : v); return gr; }
// bilinear corner value painter helper for carve's vq
const BL = (tl, tr, br, bl_) => (u, v) => lerp(lerp(tl, tr, u), lerp(bl_, br, u), v);
const VG = (a, b, e = 1) => (u, v) => lerp(a, b, Math.pow(v, e));
const UG = (a, b, e = 1) => (u, v) => lerp(a, b, Math.pow(u, e));

// ======================================================================================
// THE ILLUSTRATION (objects are added below, back to front)
// ======================================================================================
const LAYERS = [];
// paint order (back to front)
export const SOKO_LAYERS = ["floor", "leftBack", "guitarCase", "leftMid", "knobModule", "keyboardLeft", "flightStand", "lowerCartons", "recordsAmp",
  "speakerLeft", "crateBooks", "pedalboard", "wallLight", "underDesk", "trestleBack", "trousers", "boots", "trestleFront", "torso",
  "designerHead", "headphones", "laptop", "deskPlank", "deskItems", "lamp", "deskCables", "doNotKnock", "rightBack", "rightMid", "uprightSynth", "speakerRight", "rightLow"];
// bounding boxes [x0, y0, x1, y1] (page px) of each layer painted alone (measured by painting it on a transparent
// ground); boxes overlap: layers occlude each other in SOKO_LAYERS order
export const SOKO_BOXES = {
  floor: [0, 864, 2206, 946],
  leftBack: [12, 150, 416, 546],
  guitarCase: [0, 380, 148, 670],
  leftMid: [228, 222, 560, 562],
  knobModule: [334, 470, 516, 642],
  keyboardLeft: [148, 530, 492, 624],
  flightStand: [144, 618, 496, 814],
  lowerCartons: [14, 644, 372, 868],
  recordsAmp: [368, 600, 642, 870],
  speakerLeft: [522, 444, 716, 706],
  crateBooks: [628, 606, 810, 810],
  pedalboard: [558, 808, 780, 902],
  wallLight: [1278, 336, 1392, 422],
  underDesk: [900, 560, 1512, 866],
  trestleBack: [862, 560, 1342, 840],
  trousers: [924, 548, 1292, 802],
  boots: [894, 768, 1250, 886],
  trestleFront: [810, 544, 1474, 866],
  torso: [908, 352, 1246, 524],
  designerHead: [982, 160, 1158, 430],
  headphones: [974, 344, 1170, 488],
  laptop: [912, 446, 1114, 522],
  deskPlank: [766, 522, 1512, 562],
  deskItems: [802, 358, 1488, 524],
  lamp: [1320, 280, 1502, 440],
  deskCables: [846, 500, 1500, 872],
  doNotKnock: [602, 152, 828, 298],
  rightBack: [1588, 60, 2190, 766],
  rightMid: [1488, 354, 1598, 542],
  uprightSynth: [1614, 442, 1800, 810],
  speakerRight: [1490, 550, 1614, 846],
  rightLow: [1478, 510, 2190, 880],
};
// The illustration is a stack of named object layers (SOKO_LAYERS, back to front). A shot can paint any subset:
//   only: [names]  just these layers      except: [names]  all but these      background: false  transparent ground
export function paintSokoIll(g, { gaze = "owl", only = null, except = null, background = true } = {}) {
  g.save();
  if (background) { g.fillStyle = "#000"; g.fillRect(0, 0, PW, PH); }
  const byName = new Map(LAYERS.map((f) => [f.name, f]));
  for (const name of SOKO_LAYERS) {
    if (only && !only.includes(name)) continue;
    if (except && except.includes(name)) continue;
    g.save(); byName.get(name)(g, { gaze }); g.restore();
  }
  g.restore();
}

const illCache = new Map();
// cached canvas PAGE_W*scale x PAGE_H*scale (page coordinates); the full illustration by default
export function sokoIllCanvas({ gaze = "owl", scale = 1, only = null, except = null, background = true } = {}) {
  const key = `${gaze}:${scale}:${only ? only.join(",") : "*"}:${except ? except.join(",") : ""}:${background}`;
  let c = illCache.get(key);
  if (!c) {
    c = document.createElement("canvas"); c.width = Math.round(PW * scale); c.height = Math.round(PH * scale);
    const g = c.getContext("2d", { willReadFrequently: true });
    g.scale(scale, scale);
    paintSokoIll(g, { gaze, only, except, background });
    freeScratch();
    c.__scale = scale; illCache.set(key, c);
  }
  return c;
}
// (canvases are dropped, not zeroed: a shot may still hold one while the timeline releases another)
export function releaseSokoIll() { illCache.clear(); freeScratch(); }
// the illustration (gaze "down", at the laptop) stretched onto a laptop page of w x h
export function sokoIllSmall(ctx, w, h) {
  const c = sokoIllCanvas({ gaze: "down", scale: 1 });
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"; ctx.drawImage(c, 0, 0, w, h); ctx.restore();
}

// ======================================================================================
// LEFT BACK: the wall of cartons behind the headline, the lit tipped carton, the guitar case (x 0–400, y 140–560)
// ======================================================================================
// a lit edge line along a box edge (white ink, soft)
const edge = (g, pts, w = 1.4, v = 0.85, seed = 1, o = {}) => ink(g, pts, w, grey(v, o.a ?? 1), { seed, ends: o.ends ?? 0.5, jit: o.jit ?? 0.3, closed: o.closed });
const dark = (g, pts, w = 1.6, seed = 1, o = {}) => ink(g, pts, w, o.c || "#050505", { seed, ends: o.ends ?? 0.6, jit: o.jit ?? 0.3, closed: o.closed });
LAYERS.push(function leftBack(g) {
  // the far-left column of stacked cartons (dim)
  carve(g, null, { q: [[12, 150], [37, 150], [37, 246], [12, 246]], v: 0.07, per: 5, seed: 101 });
  carve(g, null, { q: [[37, 150], [82, 150], [82, 250], [37, 250]], vq: BL(0.1, 0.22, 0.28, 0.12), per: 5, seed: 102 });
  // the big back carton behind the headline (lines lit toward its right)
  carve(g, null, { q: [[82, 150], [332, 150], [332, 318], [82, 305]], vq: (u, v) => lerp(0.03, 0.26, sstep(0.25, 0.65, u)) * lerp(0.75, 1.05, v) * (1 - 0.55 * sstep(0.72, 0.95, u)), per: 5.4, seed: 103 });
  // small lit face at the far left, tipped toward us
  carve(g, null, { q: [[19, 246], [84, 258], [84, 316], [17, 316]], vq: (u, v) => lerp(0.36, 0.1, sstep(0.55, 1, u)) * (1 + 0.35 * Math.exp(-((v - 0.55) ** 2) / 0.05)), per: 4.6, seed: 104, streak: 0.45 });
  dark(g, [[18, 246], [84, 258]], 1.8, 105);
  carve(g, null, { q: [[12, 316], [36, 314], [36, 440], [12, 440]], v: 0.08, per: 5, seed: 106 });
  // the wide dark carton (top edge rising to the right), a small lit panel, the label on the carton behind
  carve(g, null, { q: [[36, 313], [219, 291], [219, 440], [36, 440]], vq: (u, v) => 0.1 + 0.05 * Math.sin(u * 7 + 1), per: 5.2, seed: 107 });
  dark(g, [[36, 313], [219, 291]], 2, 108);
  edge(g, [[38, 315], [219, 293.5]], 1, 0.35, 109);
  carve(g, null, { q: [[97, 305], [136, 302], [136, 345], [97, 346]], v: 0.27, per: 4.4, seed: 110 });
  edge(g, [[98, 346], [136, 345]], 1.1, 0.6, 111);
  fill(g, [[131, 277], [181, 273], [182, 293], [132, 296]], "#060606");
  edge(g, [[131, 277], [181, 273], [182, 293], [132, 296]], 1.3, 0.75, 112, { closed: true });
  // the carton behind the lit one (x 190–330, y 225–300)
  carve(g, null, { q: [[190, 225], [330, 225], [330, 322], [190, 291]], vq: (u, v) => lerp(0.04, 0.26, sstep(0.05, 0.4, u)) * lerp(1, 0.7, sstep(0.7, 1, u)), per: 5.2, seed: 113 });
  // the lit tipped carton: very bright at its top left, a panel cut into its right half
  carve(g, null, { q: [[180, 291], [219, 291], [219, 440], [180, 440]], v: 0.1, per: 5, seed: 114 });
  carve(g, null, { q: [[219, 291], [322, 322], [327, 400], [219, 400]], vq: (u, v) => lerp(lerp(0.72, 0.42, sstep(0.15, 0.7, u)), lerp(0.82, 0.48, sstep(0.2, 0.8, u)), v) * lerp(0.75, 1, sstep(0, 0.25, v)), per: 5, seed: 115, streak: 0.25, stL: 60, sw: 0.1, brk: 0.15 });
  // the dark box below the lit carton (a panel outline in its face)
  carve(g, null, { q: [[180, 420], [298, 420], [298, 545], [180, 545]], v: 0.05, per: 5, seed: 1150 });
  edge(g, [[186, 432], [240, 430], [240, 530]], 1, 0.3, 1151);
  // hanging vine from the top edge (behind the headline's A): three leaves
  curve(g, [[414, 180], [410, 205], [404, 232], [410, 262], [410, 272]], 1.1, grey(0.4, 0.6), { seed: 1152 });
  dark(g, [[219, 291], [322, 322]], 2.2, 116);
  edge(g, [[219, 292.5], [322, 323.5]], 1.2, 0.7, 117);
  edge(g, [[219, 293], [219, 400]], 1.3, 0.9, 118);
  edge(g, [[275, 349], [303, 349], [303, 395]], 1, 0.7, 119);
  // the hanging cable coil (dark grey loops) and its drop
  g.save(); g.lineCap = "round";
  for (const [cx, cy, rx, ry, a, w, v] of [[352, 232, 22, 34, 0.25, 3.2, 0.2], [348, 250, 18, 30, -0.1, 2.6, 0.26], [357, 262, 24, 22, 0.4, 2.8, 0.18]]) {
    g.strokeStyle = "#000"; g.lineWidth = w + 2; g.beginPath(); g.ellipse(cx, cy, rx, ry, a, 0.2, 5.8); g.stroke();
    g.strokeStyle = grey(v); g.lineWidth = w; g.beginPath(); g.ellipse(cx, cy, rx, ry, a, 0.2, 5.8); g.stroke();
  }
  g.restore();
  curve(g, [[330, 200], [328, 260], [330, 330], [328, 400]], 3, grey(0.16), { seed: 120 });
  curve(g, [[329, 200], [327, 260], [329, 330], [327, 400]], 1, grey(0.36), { seed: 121 });
});

LAYERS.push(function guitarCase(g) {
  const front = [[14, 503], [22, 470], [32, 412], [40, 396], [52, 387], [70, 383], [90, 383], [99, 391], [99, 453], [95, 500], [89, 534], [82, 600], [76, 660], [4, 660], [8, 560]];
  fill(g, S(front, true), "#040404");
  // a faint sheen on the black shell, strongest toward its left edge
  g.save(); g.beginPath(); smoothPath(g, front, true); g.clip(); softLine(g, [[30, 420], [22, 480], [16, 560]], 10, grey(0.07), 6); softLine(g, [[60, 392], [88, 392]], 6, grey(0.06), 4); g.restore();
  const side = [[97, 386], [118, 390], [138, 400], [138, 450], [133, 540], [128, 660], [76, 660], [82, 600], [89, 534], [95, 500], [99, 453], [100, 393]];
  fill(g, side, "#060606");
  curve(g, [[13, 510], [24, 460], [36, 404], [46, 390], [58, 384], [90, 382], [99, 390], [100, 440], [97, 480], [90, 530], [84, 590], [79, 660]], 2.1, grey(0.86), { seed: 131, ends: 0.35 });
  curve(g, [[100, 389], [118, 393], [134, 400]], 1.4, grey(0.55), { seed: 132 });
  ink(g, [[125, 398], [127, 450], [122, 540], [117, 660]], 2.3, grey(0.9), { seed: 133, ends: 0.7 });
  ink(g, [[132, 401], [134, 450], [129, 540], [124, 660]], 1.8, grey(0.78), { seed: 134, ends: 0.7 });
  ink(g, [[137, 402], [138, 450], [134, 540], [129, 660]], 1.1, grey(0.35), { seed: 135 });
  // the latches
  for (const [x0, y0, x1, y1, sd] of [[120, 428, 146, 455, 136], [108, 574, 146, 600, 139]]) {
    const lt = [[x0, y0], [x1, y0 + 2], [x1, y1], [x0, y1 - 1]];
    fill(g, lt, "#080808");
    fill(g, [[x0 + 5, y0 + 6], [x1 - 5, y0 + 7], [x1 - 5, y1 - 6], [x0 + 5, y1 - 6]], grey(0.62));
    carve(g, [[x0 + 5, y0 + 6], [x1 - 5, y0 + 7], [x1 - 5, y1 - 6], [x0 + 5, y1 - 6]], { ang: PI / 2, v: 0.45, per: 2.4, seed: sd, over: true });
    ink(g, lt, 1.8, grey(0.88), { seed: sd + 1, closed: true });
  }
  ink(g, [[142, 509], [142, 527]], 1.8, grey(0.8), { seed: 138 });
});
// ---------- small parts ----------
// a round knob seen from the front: dark cap, a pale rim lit from the upper left, a highlight
function knob(g, x, y, r, { lit = 0.75, cap = 0.08, hl = 0.9, seed = 1 } = {}) {
  dot(g, x + r * 0.15, y + r * 0.25, r * 1.08, "rgba(0,0,0,0.85)");
  g.fillStyle = rgrad(g, x - r * 0.35, y - r * 0.4, r * 0.1, r * 1.05, [[0, grey(cap + 0.25)], [0.6, grey(cap)], [1, grey(cap * 0.6)]], x, y); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  ring(g, x, y, r - 0.4, Math.max(0.7, r * 0.18), grey(lit, 0.8), PI * 1.0, PI * 1.75);
  dot(g, x - r * 0.35, y - r * 0.38, Math.max(0.6, r * 0.2), grey(hl, 0.9));
}
// a black cable with a thin lit highlight along its upper side
function cable(g, pts, w = 4, seed = 1, lit = 0.6, { hw = 0.36, off = 0.3 } = {}) {
  const q = sampleCurve(pts, 10);
  taper(g, q, () => w + 1.2, "#000");
  taper(g, q, () => w, grey(0.045));
  if (lit > 0) {
    const n = q.length, hl = [];
    for (let i = 0; i < n; i++) { const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; let nx = -dy / d, ny = dx / d; if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; } hl.push([q[i][0] + nx * w * off, q[i][1] + ny * w * off]); }
    const r = rng(seed);
    const ph = r() * 10;
    taper(g, hl, (u) => w * hw * (0.55 + 0.45 * Math.abs(Math.sin(u * 3.1 + ph))), grey(Math.min(1, lit * 1.15), 0.9));
  }
}
// a pothos leaf: heart-shaped; (x, y) the stem end, ang toward the tip, s its length, v the lit half's value.
// Lit from the front-left: one half pale, the other a darker grey; a dark midrib, pale rim, a few veins.
function leaf(g, x, y, ang, s, v = 0.8, seed = 1, { dark = 0.45, lx = -0.6, ly = -0.8 } = {}) {
  v *= 0.85;
  // a pothos leaf (measured on the source's plants): a broad heart, widest at ~0.48 of its length, rounded lobes
  // reaching back past the stem, a curved tip; one half lit, the other a mid grey; dark keyline, midrib and veins
  const half = [[0.0, 0], [-0.08, 0.12], [-0.05, 0.26], [0.06, 0.38], [0.24, 0.42], [0.44, 0.39], [0.64, 0.28], [0.84, 0.13], [1, 0.02]];
  const bend = 0.06 * (hI(seed, 3, 5) - 0.5) * 2;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = ([u, w]) => { const ww = w + bend * u * u; return [x + u * s * ca - ww * s * sa, y + u * s * sa + ww * s * ca]; };
  const A = half.map(P), B = half.map(([u, w]) => P([u, -w]));
  const all = [...A, ...B.slice(1, -1).reverse()];
  const nA = [-sa, ca], aLit = nA[0] * lx + nA[1] * ly > 0;
  const tip = P([1, 0]);
  g.save();
  g.beginPath(); smoothPath(g, all, true); g.clip();
  g.fillStyle = grey(v * dark); g.fillRect(x - s * 1.3, y - s * 1.3, s * 2.6, s * 2.6);
  g.beginPath(); polyPath(g, [P([-0.3, 0]), ...(aLit ? A : B).slice(1, -1).map(([px, py]) => [px + (px - x) * 0.4, py + (py - y) * 0.4]), [tip[0] + s * 0.3 * ca, tip[1] + s * 0.3 * sa]]);
  g.fillStyle = lgrad(g, x, y, tip[0], tip[1], [[0, grey(v * 0.82)], [0.45, grey(v)], [1, grey(v * 0.9)]]); g.fill();
  g.restore();
  ink(g, all, Math.max(0.8, s * 0.045), "rgba(4,4,4,0.95)", { closed: true, seed, jit: 0.1, smooth: true });
  const mid = [P([0.02, 0]), P([0.5, bend * 0.25]), P([0.94, bend * 0.8])];
  ink(g, mid, Math.max(0.7, s * 0.05), "rgba(8,8,8,0.85)", { seed: seed + 1, ends: 0.3, smooth: true });
  for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) {
    const u = 0.2 + k * 0.22, a = P([u, bend * u * u]), l = s * (0.26 - k * 0.05);
    ink(g, [a, [a[0] + Math.cos(ang + sd * 0.95) * l, a[1] + Math.sin(ang + sd * 0.95) * l]], 0.65, "rgba(15,15,15,0.5)", { seed: seed + k * 3 + sd });
  }
}

// ======================================================================================
// LEFT MIDDLE: the tray on the stack, the cartons under it and under the plant, the plant, the knob module
// ======================================================================================
LAYERS.push(function leftMid(g) {
  // small gear boxes behind the plant (a wooden box, two small cylinders, a small cube)
  carve(g, null, { q: [[356, 378], [432, 378], [432, 398], [356, 398]], dir: "h", vq: BL(0.22, 0.25, 0.18, 0.16), per: 3.4, seed: 201 });
  edge(g, [[356, 378], [432, 378]], 1, 0.5, 202);
  for (const [x, y] of [[372, 352], [381, 352]]) { fill(g, [[x - 3, y], [x + 3, y], [x + 3, y + 7], [x - 3, y + 7]], grey(0.3)); dot(g, x, y, 3, grey(0.55)); }
  fill(g, [[392, 360], [409, 360], [409, 376], [392, 376]], grey(0.35)); edge(g, [[392, 360], [409, 360], [409, 376]], 1, 0.7, 203);
  // the dark lid under the tray, the dark box front (with a panel outline) and the bright carton face to its right
  fill(g, [[229, 405], [377, 408], [379, 425], [230, 426]], "#070707");
  edge(g, [[232, 416], [372, 419]], 1, 0.4, 204);
  carve(g, null, { q: [[242, 425], [298, 425], [298, 476], [242, 476]], v: 0.08, per: 5, seed: 205 });
  edge(g, [[245, 428], [245, 474], [290, 474]], 1, 0.45, 206);
  carve(g, null, { q: [[298, 424], [385, 424], [385, 562], [298, 562]], vq: (u, v) => lerp(0.82, 0.5, sstep(0.3, 1, u)) * lerp(1, 0.62, sstep(0.55, 1, v)), per: 4.6, seed: 207 });
  edge(g, [[298, 424], [298, 562]], 1.3, 0.85, 208);
  edge(g, [[298, 424.5], [385, 424.5]], 1.1, 0.75, 209);
  // the tray (a folder lying flat): lit top, dark front edge
  const tray = [[239, 401], [302, 393], [374, 404], [330, 419]];
  fill(g, tray, lgrad(g, 239, 395, 374, 419, [[0, 0.62], [0.4, 0.8], [1, 0.72]]));
  carve(g, tray, { ang: -0.05, v: 0.2, per: 4, seed: 210, lum: 0.9, over: true, alpha: 0.35 });
  softEll(g, 300, 408, 18, 4, 0.1, grey(0.4, 0.4), 3);
  fill(g, [[239, 401], [330, 419], [331, 423], [240, 405]], grey(0.15));
  dark(g, tray, 1.3, 211, { closed: true });
  // the carton under the plant: lit lid edge, a striped front with a window, a side panel
  carve(g, null, { q: [[395, 398], [467, 398], [467, 472], [395, 472]], vq: (u, v) => lerp(0.26, 0.33, u), per: 4.4, seed: 212 });
  carve(g, null, { q: [[467, 398], [500, 399], [500, 472], [467, 472]], vq: (u, v) => lerp(0.55, 0.35, u), per: 4, seed: 213 });
  edge(g, [[395, 397.5], [499, 398]], 1.4, 0.85, 214);
  edge(g, [[466.5, 398], [466.5, 472]], 1.6, 0.9, 215);
  fill(g, [[430, 408], [453, 408], [453, 436], [430, 436]], "#050505");
  edge(g, [[430, 408], [453, 408], [453, 436], [430, 436]], 1.1, 0.75, 216, { closed: true });
  edge(g, [[431, 421], [452, 421]], 1, 0.65, 217);
  fill(g, [[476, 410], [496, 411], [496, 477], [476, 476]], grey(0.12));
  fill(g, [[478, 430], [494, 430], [494, 474], [478, 474]], grey(0.3));
  edge(g, [[476, 410], [496, 411], [496, 477]], 1, 0.6, 218);
  // the plant: pot, rim, leaves
  const pot = [[432, 366], [486, 366], [483, 397], [436, 397]];
  fill(g, pot, grey(0.1));
  g.save(); g.beginPath(); polyPath(g, pot); g.clip();
  g.fillStyle = lgrad(g, 432, 0, 486, 0, [[0, 0.05], [0.3, 0.14], [0.62, 0.5], [0.8, 0.72], [0.92, 0.55], [1, 0.25]]); g.fillRect(430, 364, 58, 36);
  g.fillStyle = lgrad(g, 0, 366, 0, 397, [[0, "rgba(0,0,0,0)"], [0.7, "rgba(0,0,0,0.1)"], [1, "rgba(0,0,0,0.45)"]]); g.fillRect(430, 364, 58, 36);
  carve(g, pot, { ang: 0.02, v: 0.1, per: 3.2, seed: 219, over: true, alpha: 0.5 });
  g.restore();
  g.fillStyle = lgrad(g, 432, 0, 486, 0, [[0, 0.35], [0.6, 0.85], [1, 0.55]]); g.beginPath(); g.ellipse(459, 364, 27.5, 4.5, 0, 0, TAU); g.fill();
  dark(g, pot, 1.1, 220, { closed: true });
  const LV = [
    [458, 326, -2.75, 25], [482, 338, -2.4, 18], [516, 321, 3.05, 27], [430, 337, 2.75, 27], [454, 347, 1.95, 16], [470, 352, -2.3, 18],
    [486, 344, 1.7, 22], [505, 342, -0.5, 18], [520, 346, 0.6, 22], [446, 360, 1.6, 20], [423, 352, 3.0, 20], [412, 350, 2.5, 16],
    [502, 356, 1.4, 20], [528, 360, 1.3, 22], [542, 368, 1.05, 22], [514, 372, 1.5, 20], [516, 404, 1.35, 22], [537, 404, 1.3, 20],
    [528, 440, 1.45, 18], [520, 462, 1.5, 16], [550, 412, 1.4, 18], [470, 334, -1.6, 16], [440, 318, -2.1, 18],
  ];
  LV.forEach(([x, y, a, sz], i) => leaf(g, x, y, a, sz * 1.1, 0.92 - (i % 3) * 0.08, 230 + i * 3));
  curve(g, [[488, 366], [512, 380], [526, 404], [528, 440], [522, 470]], 1, grey(0.35, 0.7), { seed: 229 });
  leaf(g, 402, 226, 1.62, 30, 0.72, 1153); leaf(g, 428, 238, 1.5, 24, 0.66, 1154); leaf(g, 411, 270, 1.55, 31, 0.76, 1155);
});

LAYERS.push(function knobModule(g) {
  carve(g, null, { q: [[487, 562], [516, 562], [516, 642], [487, 642]], vq: (u, v) => lerp(0.62, 0.4, v), per: 4, seed: 249 });
  // dark side face with two grooves
  fill(g, S([[335, 480], [338, 475], [380, 472], [380, 556], [336, 561]], false), "#070707");
  edge(g, [[337, 476], [380, 472]], 1.1, 0.4, 251);
  ink(g, [[352, 478], [352, 559]], 1.2, grey(0.18), { seed: 252 }); ink(g, [[364, 476], [364, 558]], 1.2, grey(0.18), { seed: 253 });
  // the pale front, in perspective, with horizontal grain and two grooves
  const F = [[380, 472], [506, 486], [507, 561], [380, 555]];
  fill(g, F, grey(0.3));
  carve(g, null, { q: F, dir: "h", vq: (u, v) => lerp(0.44, 0.38, u) * lerp(1.05, 0.78, sstep(0.6, 1, v)), per: 2.8, seed: 254, bg: 0.55, lum: 0.9, wav: 0.3 });
  for (const v of [0.4, 0.7]) ink(g, [bil(F, 0, v), bil(F, 1, v)], 1.6, grey(0.1, 0.8), { seed: 255 + v * 10 });
  dark(g, F, 1.4, 257, { closed: true });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
    const u = (c + 0.62) / 7.4, v = [0.24, 0.55, 0.84][r];
    const [x, y] = bil(F, u, v);
    knob(g, x, y, 5.3, { seed: 260 + r * 7 + c, lit: 0.55, cap: 0.06 });
  }
  // patch cables from the bottom row, hanging down
  for (const [c, dx] of [[1, 6], [3, 12], [5, 8]]) {
    const [x, y] = bil(F, (c + 0.62) / 7.4, 0.86);
    cable(g, [[x, y], [x + 3, y + 8], [x + dx * 0.7, y + 22], [x + dx, y + 40], [x + dx + 2, y + 60]], 3.4, 270 + c, 0.45);
  }
});
// ======================================================================================
// LEFT LOW: the synth keyboard on its flight-case stand, the lower cartons, pedal, records box, amp, headphones
// ======================================================================================
LAYERS.push(function keyboardLeft(g) {
  // (measured at 5x) the synth keyboard seen from a low angle: knob caps standing along the back, the white key tops
  // receding (back edge y 566) to the key fronts (y 585–598), black keys lying on them as dark slabs, a dark
  // front lip, the big dark left cheek, a control box at the right end
  cable(g, [[150, 532], [168, 540], [178, 556]], 2.4, 300, 0.7);
  fill(g, [[168, 548], [430, 548], [432, 624], [168, 624]], "#050505");
  // white key tops plane and the key fronts
  const KT = [[214, 567], [382, 567], [402, 585], [238, 585]];
  fill(g, [[186, 566], [214, 567], [238, 585], [220, 585]], grey(0.6));
  fill(g, KT, lgrad(g, 0, 566, 0, 585, [[0, 0.55], [1, 0.9]]));
  const KF = [[238, 585], [402, 585], [402, 598], [238, 598]], nw = 14;
  fill(g, KF, grey(0.9));
  for (let i = 0; i <= nw; i++) {
    const u = i / nw, a = bil(KT, u, 0), b = bil(KT, u, 1);
    ink(g, [b, [b[0], 598]], 1.1, grey(0.35, 0.9), { seed: 320 + i });
    ink(g, [a, b], 0.7, grey(0.45, 0.5), { seed: 340 + i });
  }
  // black keys: slabs lying on the tops (back ~y 567 -> front ~y 583), with a lit top edge
  for (let i = 0; i < nw - 1; i++) if ([0, 1, 3, 4, 5].includes((i + 3) % 7)) {
    const u = (i + 1) / nw, w = 0.3 / nw;
    const q = [bil(KT, u - w, 0.3), bil(KT, u + w * 1.4, 0.3), bil(KT, u + w * 1.4, 0.92), bil(KT, u - w, 0.92)];
    fill(g, q, grey(0.04));
    ink(g, [q[0], q[1]], 1, grey(0.35, 0.8), { seed: 360 + i });
    ink(g, [q[3], q[2]], 1.1, grey(0.2, 0.9), { seed: 380 + i });
  }
  // knob caps along the back
  for (let i = 0; i < 14; i++) {
    const x = 222 + i * 12.8, y = 569;
    fill(g, [[x - 4.5, y - 11], [x + 4.5, y - 11], [x + 5, y + 6], [x - 5, y + 6]], grey(0.06));
    edge(g, [[x - 4, y - 8], [x - 4.5, y + 4]], 1, 0.3, 310 + i);
    g.fillStyle = grey(0.3); g.beginPath(); g.ellipse(x, y - 11, 4.5, 1.6, 0, 0, TAU); g.fill(); dot(g, x - 1.5, y - 11, 1, grey(0.85));
  }
  // dark front lip with faint horizontal grain
  carve(g, null, { q: [[238, 598], [430, 598], [430, 624], [238, 624]], dir: "h", v: 0.07, per: 3.2, seed: 400 });
  edge(g, [[238, 598.5], [402, 598.5]], 1, 0.5, 401);
  // the left cheek: a dark block whose top slopes down to the key bed, a lit edge
  const ch = [[166, 566], [176, 562], [238, 583], [240, 624], [166, 624]];
  fill(g, ch, "#060606");
  carve(g, [[176, 562], [238, 583], [238, 590], [174, 570]], { ang: 0.32, v: 0.14, per: 3, seed: 402 });
  edge(g, [[176, 563], [238, 584]], 1.6, 0.72, 403);
  edge(g, [[178, 574], [228, 604]], 1.4, 0.5, 404);
  edge(g, [[238, 585], [239, 622]], 1.2, 0.35, 405);
  // the control box at the right end
  carve(g, null, { q: [[402, 584], [490, 582], [492, 623], [404, 623]], dir: "h", vq: (u, v) => lerp(0.45, 0.12, sstep(0.05, 0.3, u)) * lerp(1, 0.8, v), per: 3, seed: 407 });
  edge(g, [[402, 584], [490, 582]], 1.2, 0.6, 406);
  for (let i = 0; i < 3; i++) { dot(g, 440 + i * 20, 598, 3, "#000"); ring(g, 440 + i * 20, 598, 3.2, 1, grey(0.4)); }
});

LAYERS.push(function flightStand(g) {
  // rail
  carve(g, null, { q: [[144, 626], [492, 622], [492, 646], [144, 648]], dir: "h", vq: (u) => lerp(0.1, 0.6, sstep(0.5, 0.56, u)) * lerp(1, 0.85, sstep(0.75, 1, u)), per: 3.4, seed: 350, streak: 0.4 });
  edge(g, [[144, 626], [492, 622]], 1.2, 0.8, 351);
  dark(g, [[144, 648], [492, 646]], 1.6, 352);
  // left leg (lit wood) and the right leg
  carve(g, null, { q: [[312, 646], [343, 646], [343, 813], [313, 813]], vq: (u, v) => lerp(0.18, 0.9, sstep(0, 0.75, u)) * lerp(1, 0.85, v), per: 3.6, seed: 353, streak: 0.4 });
  dark(g, [[343, 646], [343, 813]], 1.4, 354);
  carve(g, null, { q: [[483, 646], [495, 646], [495, 708], [483, 708]], vq: UG(0.6, 0.3), per: 3.2, seed: 355 });
  // corner brackets with bolts
  for (const [pts, bx, by] of [[[[320, 623], [366, 621], [366, 645], [356, 664], [330, 664], [320, 648]], 343, 637], [[[470, 621], [494, 620], [494, 660], [475, 656]], 484, 633]]) {
    fill(g, pts, lgrad(g, pts[0][0], 620, pts[1][0], 662, [[0, 0.95], [0.5, 0.75], [1, 0.5]]));
    dark(g, pts, 1.3, bx, { closed: true });
    dot(g, bx, by, 4.2, grey(0.06)); ring(g, bx, by, 4.2, 1.2, grey(0.5)); dot(g, bx - 1.2, by - 1.2, 1.3, grey(0.85));
  }
});

LAYERS.push(function lowerCartons(g) {
  // upper carton (left side dim, front lit at its left)
  carve(g, null, { q: [[15, 657], [75, 656], [75, 748], [15, 748]], vq: BL(0.08, 0.13, 0.14, 0.09), per: 5.2, seed: 401 });
  carve(g, null, { q: [[75, 656], [172, 658], [172, 748], [75, 748]], vq: (u, v) => lerp(0.62, 0.43, sstep(0, 0.3, u)), per: 4.8, seed: 402, streak: 0.25 });
  edge(g, [[15, 656.5], [172, 657.5]], 1.4, 0.8, 403);
  edge(g, [[75.5, 657], [75.5, 748]], 1.4, 0.85, 404);
  edge(g, [[172, 658], [172, 746]], 1.2, 0.55, 405);
  // a small dark device on top (the guitar case's foot overlaps it)
  fill(g, [[176, 645], [200, 647], [201, 668], [178, 666]], grey(0.3)); edge(g, [[176, 645], [200, 647], [201, 668]], 1.2, 0.7, 406);
  cable(g, [[176, 650], [192, 664], [200, 700], [196, 740], [186, 760]], 3.2, 420, 0.6);
  // lower carton, a lifted flap
  carve(g, null, { q: [[15, 752], [78, 752], [78, 868], [15, 868]], v: 0.08, per: 5.2, seed: 407 });
  carve(g, null, { q: [[78, 752], [232, 752], [232, 868], [78, 868]], vq: BL(0.38, 0.4, 0.33, 0.36), per: 4.8, seed: 408, streak: 0.25 });
  edge(g, [[15, 752], [232, 752]], 1.3, 0.8, 409);
  edge(g, [[78.5, 752], [78.5, 868]], 1.4, 0.8, 410);
  edge(g, [[232, 752], [232, 866]], 1.2, 0.6, 411);
  fill(g, [[108, 746], [212, 745], [214, 752], [110, 753]], grey(0.4)); edge(g, [[108, 746], [212, 745]], 1, 0.8, 412);
  fill(g, [[195, 838], [213, 838], [213, 851], [195, 851]], "#080808"); edge(g, [[195, 838], [213, 838], [213, 851], [195, 851]], 1, 0.6, 413, { closed: true });
  // the pedal: pale wooden box, four knobs, jacks
  const pt = [[255, 826], [368, 826], [370, 834], [253, 834]], pf = [[253, 834], [370, 834], [370, 862], [253, 862]];
  carve(g, null, { q: pt, dir: "h", v: 0.32, per: 2.8, seed: 414 });
  carve(g, null, { q: pf, dir: "h", vq: BL(0.55, 0.48, 0.4, 0.45), per: 3, seed: 415, bg: 0.4 });
  dark(g, [[253, 834], [370, 834]], 1.1, 416); dark(g, [...pt.slice(0, 2), [370, 862], [253, 862]], 1.3, 417, { closed: true });
  for (const [x, hh] of [[281, 13], [304, 12], [321, 13], [342, 14]]) {
    fill(g, [[x - 5.5, 828 - hh], [x + 5.5, 828 - hh], [x + 5.5, 829], [x - 5.5, 829]], grey(0.06));
    edge(g, [[x - 4, 828 - hh + 2], [x - 4, 828]], 1, 0.45, 418 + x);
    g.fillStyle = grey(0.5); g.beginPath(); g.ellipse(x, 828 - hh, 5.5, 2.2, 0, 0, TAU); g.fill();
  }
  for (const x of [290, 306, 348, 362]) { dot(g, x, 848, 2.6, "#050505"); ring(g, x, 848, 2.8, 0.8, grey(0.3)); }
});

LAYERS.push(function recordsAmp(g) {
  // (measured at 3x) the tall pale records box, the amp in front of it (a dark lid with a pale top and a silver
  // label; a pale body with a logo, a slot and a seam), the headphones draped over the amp's back, and three thick
  // cables hanging from the keyboard's control box down over them to the floor
  const box = [[369, 707], [439, 707], [439, 845], [371, 845]];
  woodPaint(g, box, (u, v) => lerp(0.42, 0.78, sstep(0.05, 0.4, u)) * lerp(1, 0.78, sstep(0.5, 1, v)), { dir: "v", seed: 450, per: 3.2, hiP: 0.7 });
  dark(g, box, 1.3, 451, { closed: true }); edge(g, [[370, 707], [439, 707]], 1.3, 0.85, 452);
  carve(g, null, { q: [[416, 738], [436, 738], [436, 845], [416, 845]], v: 0.12, per: 3.4, seed: 453 });
  // the amp
  const lid = [[437, 717], [584, 717], [586, 735], [436, 735]];
  fill(g, lid, grey(0.05));
  carve(g, null, { q: [[440, 716], [582, 716], [584, 722], [438, 722]], dir: "h", v: 0.55, per: 2.4, seed: 454 });
  fill(g, [[500, 728], [522, 728], [522, 734], [500, 734]], grey(0.62)); dot(g, 505, 731, 1.4, grey(0.1));
  const body = [[434, 735], [587, 735], [587, 847], [435, 847]];
  woodPaint(g, body, (u, v) => lerp(0.62, 0.86, sstep(0, 0.12, u)) * (v < 0.37 ? 1 : lerp(0.92, 0.78, (v - 0.37) / 0.63)), { dir: "v", seed: 455, per: 3, hiP: 0.75, baseK: 0.92 });
  dark(g, body, 1.3, 456, { closed: true });
  ink(g, [[436, 777], [586, 776]], 1.2, grey(0.25, 0.9), { seed: 457 });
  ink(g, [[470, 766], [475, 756], [481, 766]], 1.5, grey(0.2), { seed: 458 }); ink(g, [[471, 762], [480, 762]], 1.1, grey(0.2), { seed: 459 });
  fill(g, [[562, 756], [582, 755], [582, 760], [562, 761]], grey(0.15));
  // the headphones: a dark cup hooked on the amp's back, the pale padded band arching over and down its right
  fill(g, S([[524, 668], [540, 660], [552, 668], [548, 700], [530, 704], [522, 690]], true), grey(0.05));
  ink(g, [[528, 668], [540, 663], [548, 670]], 1.4, grey(0.7), { smooth: true, seed: 460 });
  const band = [[556, 690], [566, 676], [586, 671], [606, 676], [618, 694], [622, 730], [620, 770], [613, 798], [600, 812]];
  const bq = sampleCurve(band, 10);
  taper(g, bq, () => 18, "#040404");
  taper(g, bq, (u) => 15 - u * 3, lgrad(g, 556, 668, 620, 812, [[0, 0.7], [0.5, 0.84], [1, 0.62]]));
  taper(g, bq.map(([x, y]) => [x + 4, y - 2.5]), () => 3, grey(0.96, 0.85));
  taper(g, bq.map(([x, y]) => [x - 4.5, y + 3]), () => 1.6, grey(0.25, 0.9));
  // three cables from the control box jacks down over the stand and the amp
  cable(g, [[425, 608], [432, 640], [438, 690], [444, 730], [440, 770], [415, 812], [390, 836], [372, 850]], 4.6, 461, 0.6);
  cable(g, [[459, 602], [468, 630], [474, 670], [470, 720], [462, 760], [440, 800], [410, 830], [385, 845]], 4.4, 462, 0.55);
  cable(g, [[472, 602], [490, 624], [504, 650], [520, 670], [540, 690]], 4.2, 463, 0.55);
  // cables along the floor in front
  cable(g, [[382, 848], [430, 850], [480, 848], [540, 838], [584, 818], [606, 808]], 4, 464, 0.45);
  cable(g, [[400, 866], [460, 858], [540, 858], [600, 850], [640, 842]], 3.6, 465, 0.35);
});

// ======================================================================================
// LEFT CENTRE: the speaker with books on it, the rack unit, the crate with books, the pedalboard
// ======================================================================================
function book(g, pts, { v = 0.7, spine = 0.3, seed = 1 } = {}) {
  carve(g, null, { q: pts, dir: "h", vq: (u, vv) => lerp(spine, v, sstep(0, 0.22, u)) * (1 - 0.25 * vv), per: 2.8, seed, bg: 0.3, streak: 0.3, wav: 0.3 });
  dark(g, pts, 1.2, seed + 1, { closed: true });
}
// a woofer (measured at 6x): dark frame ring with grey rim lines, a dark surround, a cone lit bright on its left and
// bottom with swirling strokes, a dark dust cap set a little right of centre with a small highlight
function woofer(g, cx, cy, R, seed = 1) {
  dot(g, cx, cy, R, grey(0.03));
  ring(g, cx, cy, R - 0.8, 1.4, grey(0.32)); ring(g, cx, cy, R * 0.86, 1.2, grey(0.25));
  const rc = R * 0.68;
  g.save(); g.beginPath(); g.arc(cx, cy, rc, 0, TAU); g.clip();
  g.fillStyle = lgrad(g, cx + rc * 0.6, cy - rc * 0.7, cx - rc * 0.5, cy + rc * 0.6, [[0, 0.3], [0.45, 0.62], [1, 0.95]]); g.fillRect(cx - rc, cy - rc, 2 * rc, 2 * rc);
  const r = rng(seed);
  for (let i = 0; i < 46; i++) { const rr = rc * (0.45 + r() * 0.55), a0 = r() * TAU, da = 0.5 + r() * 1.2; g.strokeStyle = grey(r() < 0.5 ? 0.15 : 1, 0.25 + r() * 0.2); g.lineWidth = 0.8 + r(); g.beginPath(); g.arc(cx, cy, rr, a0, a0 + da); g.stroke(); }
  g.restore();
  ring(g, cx, cy, rc, 1.3, grey(0.1));
  g.strokeStyle = grey(0.55, 0.8); g.lineWidth = 1.4; g.beginPath(); g.arc(cx, cy, R * 0.78, 0.3, 1.2); g.stroke();
  const dx = R * 0.1;
  dot(g, cx + dx, cy - 0.5, R * 0.28, grey(0.03));
  fillSoft(g, ELL(cx + dx + R * 0.08, cy - R * 0.14, R * 0.06, R * 0.045), grey(0.85), 0.8);
}
LAYERS.push(function speakerLeft(g) {
  // the tall rack unit behind the speaker, with a handle
  fill(g, [[656, 452], [712, 448], [714, 616], [658, 618]], "#060606");
  carve(g, null, { q: [[658, 452], [712, 448], [714, 616], [658, 618]], vq: (u, v) => lerp(0.3, 0.12, u) * lerp(1, 0.6, v), per: 3.4, seed: 529 });
  edge(g, [[658, 452], [658, 616]], 1.4, 0.7, 530); edge(g, [[712, 450], [714, 614]], 1.2, 0.45, 531);
  cable(g, [[690, 455], [692, 448], [707, 448], [710, 460], [710, 500]], 3, 532, 0.7);
  for (const y of [470, 490]) { fill(g, [[664, y], [676, y], [676, y + 14], [664, y + 14]], grey(0.08)); edge(g, [[664, y], [676, y], [676, y + 14]], 1, 0.55, 533 + y); }
  knob(g, 694, 478, 3.5, { lit: 0.6 });
  // the book stack on top: front faces with page strokes, side faces slanting down to the right, brighter
  const stack = [[[543, 446], [620, 446], [620, 462], [541, 463]], [[537, 462], [622, 462], [622, 476], [536, 477]], [[537, 476], [617, 476], [617, 495], [536, 496]], [[529, 495], [620, 495], [620, 508], [528, 508]]];
  const sides = [[[620, 446], [644, 450], [660, 462], [620, 462]], [[622, 462], [648, 466], [668, 484], [622, 476]], [[617, 476], [645, 481], [668, 500], [617, 495]], [[620, 495], [645, 498], [667, 511], [620, 508]]];
  stack.forEach((q, i) => {
    carve(g, null, { q, dir: "h", vq: (u, v) => [0.36, 0.44, 0.4, 0.34][i] * (1 + 0.3 * Math.sin(u * 7 + i)), per: 2.6, seed: 501 + i, bg: 0.25, streak: 0.5, stL: 25, wav: 0.3 });
    dark(g, q, 1.2, 511 + i, { closed: true });
    carve(g, null, { q: sides[i], dir: "h", vq: () => [0.62, 0.72, 0.68, 0.72][i], per: 2.6, seed: 521 + i, bg: 0.3, streak: 0.4 });
    dark(g, sides[i], 1.1, 531 + i, { closed: true });
  });
  fillSoft(g, S([[560, 478], [574, 476], [578, 486], [562, 489]], true), grey(0.85), 1.2);
  // cabinet: dark wooden front with grain, lit side with vertical grain, a pale smudge on the front's top left
  woodPaint(g, [[522, 508], [631, 508], [631, 705], [522, 705]], (u, v) => (0.15 + 0.05 * Math.sin(u * 9)) * lerp(1.1, 0.85, v), { seed: 510 });
  carve(g, null, { q: [[631, 506], [698, 511], [698, 632], [631, 632]], vq: (u, v) => lerp(0.6, 0.5, u) * lerp(1, 0.8, sstep(0.7, 1, v)), per: 4.2, seed: 511, wav: 0.35 });
  edge(g, [[522, 508], [631, 507], [698, 511]], 1.3, 0.7, 512);
  dark(g, [[631, 507], [631, 705]], 1.6, 513);
  edge(g, [[523, 509], [523, 704]], 1, 0.35, 514);
  fillSoft(g, S([[552, 512], [566, 514], [562, 532], [555, 528]], true), grey(0.62), 2);
  // tweeter and woofer
  dot(g, 576, 543, 15, grey(0.03)); ring(g, 576, 543, 14, 1.8, grey(0.35)); ring(g, 576, 543, 9, 1.2, grey(0.2));
  fillSoft(g, ELL(578, 540, 3.5, 3), grey(0.75), 1.2);
  woofer(g, 574.3, 612.7, 44, 515);
  dot(g, 615, 660, 1.6, grey(0.5));
});

LAYERS.push(function crateBooks(g) {
  // device and book pile on the crate
  fill(g, [[673, 608], [752, 609], [753, 628], [674, 628]], grey(0.3));
  carve(g, null, { q: [[673, 608], [752, 609], [753, 628], [674, 628]], dir: "h", v: 0.4, per: 2.8, seed: 550 });
  dark(g, [[673, 608], [752, 609], [753, 628], [674, 628]], 1.2, 551, { closed: true });
  fill(g, [[679, 613], [696, 613], [696, 621], [679, 621]], "#040404"); for (let i = 0; i < 3; i++) dot(g, 683 + i * 5, 617, 1.2, grey(0.9));
  book(g, [[635, 628], [765, 627], [766, 643], [636, 643]], { v: 0.78, seed: 552 });
  book(g, [[640, 643], [770, 642], [771, 668], [641, 669]], { v: 0.72, seed: 554 });
  book(g, [[638, 668], [760, 667], [761, 687], [639, 688]], { v: 0.7, seed: 556 });
  // milk crate: pale rim with slots, posts, diamond lattice over black
  fill(g, [[629, 688], [766, 688], [766, 809], [629, 809]], "#040404");
  carve(g, null, { q: [[629, 688], [766, 688], [766, 713], [629, 713]], dir: "h", v: 0.35, per: 3, seed: 560 });
  for (const [x0, x1] of [[633, 645], [647, 673], [677, 711], [715, 744], [748, 761]]) { fill(g, [[x0, 693], [x1, 693], [x1, 708], [x0, 708]], grey(0.12)); carve(g, [[x0, 693], [x1, 693], [x1, 708], [x0, 708]], { ang: PI / 2, v: 0.2, per: 3, seed: 561 + x0, over: true }); edge(g, [[x0, 693], [x1, 693], [x1, 708], [x0, 708]], 1, 0.75, 562 + x0, { closed: true }); }
  g.save(); g.beginPath(); g.rect(646, 713, 100, 94); g.clip();
  for (let i = -3; i < 6; i++) {
    edge(g, [[646 + i * 29, 807], [646 + i * 29 + 94, 713]], 2, 0.72, 570 + i, { jit: 0.15 });
    edge(g, [[646 + i * 29, 713], [646 + i * 29 + 94, 807]], 2, 0.72, 590 + i, { jit: 0.15 });
  }
  g.restore();
  fill(g, [[671, 715], [716, 715], [718, 731], [669, 731]], "#040404"); edge(g, [[671, 715], [716, 715], [718, 731], [669, 731]], 1.1, 0.65, 600, { closed: true });
  for (const [x0, x1] of [[629, 646], [746, 766]]) carve(g, null, { q: [[x0, 713], [x1, 713], [x1, 809], [x0, 809]], vq: UG(0.62, 0.35), per: 3.2, seed: 601 + x0 });
  edge(g, [[629, 688], [766, 688], [766, 809]], 1.2, 0.8, 603); edge(g, [[629, 688], [629, 809]], 1.2, 0.8, 604);
  // a second crate behind, to the right (dark lattice)
  g.save(); g.beginPath(); g.rect(766, 700, 44, 110); g.clip();
  for (let i = 0; i < 4; i++) { ink(g, [[766, 730 + i * 28], [810, 700 + i * 28]], 1.4, grey(0.3), { seed: 610 + i }); ink(g, [[766, 700 + i * 28], [810, 730 + i * 28]], 1.4, grey(0.3), { seed: 620 + i }); }
  g.restore();
});

LAYERS.push(function pedalboard(g) {
  fill(g, [[569, 826], [773, 824], [775, 868], [567, 870]], "#060606");
  edge(g, [[569, 826], [773, 824]], 1.6, 0.7, 650);
  edge(g, [[773, 825], [775, 866]], 1.2, 0.45, 651);
  ink(g, [[682, 828], [684, 868]], 1.2, grey(0.25), { seed: 652 });
  for (let i = 0; i < 11; i++) { const x = 596 + i * 16, y = 818 + (i % 2); fill(g, [[x - 4, y], [x + 4, y], [x + 4, y + 8], [x - 4, y + 8]], grey(0.08)); g.fillStyle = grey(0.55); g.beginPath(); g.ellipse(x, y, 4, 1.8, 0, 0, TAU); g.fill(); }
  for (const [x, y] of [[584, 849], [663, 846]]) { dot(g, x, y, 2.4, grey(0.3)); }
  // small pale pedals to its right
  for (const [x0, y0, w, h] of [[742, 810, 36, 24]]) { carve(g, null, { q: [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], dir: "h", v: 0.45, per: 3, seed: x0 }); dark(g, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], 1.2, x0 + 1, { closed: true }); }
  // cables on the floor in front of it
  cable(g, [[560, 880], [600, 870], [650, 866], [700, 872], [760, 872]], 3.6, 660, 0.4);
  cable(g, [[610, 900], [660, 884], [700, 862], [720, 850], [735, 846]], 3.2, 661, 0.4);
});
// ======================================================================================
// THE DESIGNER — head (measured at 5–8x on the owl-free plate; pre-grade values sampled at landmarks)
// ======================================================================================
// soft painted stroke (a tapered line blurred)
function softLine(g, pts, w, color, blur = 1, o = {}) { blurDraw(g, bboxOf(pts, w + 2), blur, (c) => ink(c, pts, w, color, { smooth: true, jit: 0, ends: o.ends ?? 0.3, seed: o.seed ?? 1 })); }
function softEll(g, x, y, rx, ry, a, color, blur) { fillSoft(g, ELL(x, y, rx, ry, a), color, blur); }
// a hair lock: a tapered black wedge from a root segment [a, b] to a tip, gently curved through m
function lock(g, a, b, m, tip, color = "#030303") {
  g.beginPath(); g.moveTo(a[0], a[1]);
  g.quadraticCurveTo(m[0] - (b[0] - a[0]) * 0.35, m[1] - (b[1] - a[1]) * 0.35, tip[0], tip[1]);
  g.quadraticCurveTo(m[0] + (b[0] - a[0]) * 0.35, m[1] + (b[1] - a[1]) * 0.35, b[0], b[1]);
  g.closePath(); g.fillStyle = color; g.fill();
}
function strand(g, pts, w, v, a = 1, seed = 1) { ink(g, pts, w, grey(v, a), { smooth: true, ends: 0.1, jit: 0.1, seed }); }

const FACE = [[1019, 262], [1030, 252], [1050, 246], [1072, 244], [1095, 246], [1114, 252], [1124, 262], [1123.5, 290], [1123.2, 306], [1123.2, 322.5], [1121.2, 332.2], [1118, 339.5], [1109.2, 351.8], [1092.2, 370.2], [1086, 375.2], [1081.2, 377.2], [1068.2, 378], [1060.8, 375], [1033.5, 350.2], [1026.5, 342], [1022, 333.2], [1018.5, 303.5], [1018.5, 285]];

// skin grain: fine pencil hatching and stipple over a clipped area, darker where the painted light is lower
function skinGrain(g, clip, { seed = 1, n = 500, bb, ang = 1.2, a = 0.12 } = {}) {
  const r = rng(seed);
  g.save(); g.beginPath(); polyPath(g, clip); g.clip();
  for (let i = 0; i < n; i++) {
    const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r()), L = 2 + r() * 4, an = ang + (r() - 0.5) * 0.6;
    ink(g, [[x, y], [x + Math.cos(an) * L, y + Math.sin(an) * L]], 0.5 + r() * 0.5, grey(r() < 0.3 ? 1 : 0.25, a * (0.5 + r())), { seed: seed + i, ends: 0.2, jit: 0 });
  }
  g.restore();
}
function head(g, gaze) {
  // ---- hair behind: the black mass round the face, fuller at the sides, ending at the jaw ----
  const HAIR = [[996, 250], [991, 268], [990, 285], [992, 300], [994, 316], [997, 331], [1000, 346], [1004, 360], [1012, 369], [1024, 368], [1040, 372],
    [1060, 378], [1090, 376], [1106, 366], [1122, 357], [1136, 352], [1141, 340], [1144, 322], [1146, 302], [1147, 282], [1147, 262], [1146, 248]];
  fill(g, S(HAIR, true), "#030303");
  // ---- ears: lit slivers between the locks ----
  fill(g, S([[1004, 309], [1009, 305], [1015, 307], [1016, 316], [1011, 320], [1006, 317]], true), grey(0.48));
  softLine(g, [[1007, 309], [1012, 308], [1013, 314]], 1.2, grey(0.2), 0.5);
  fill(g, S([[1127, 306], [1133, 303], [1137, 307], [1136, 316], [1131, 319], [1127, 314]], true), grey(0.62));
  softLine(g, [[1131, 307], [1134, 310], [1132, 315]], 1.1, grey(0.3), 0.5);
  // ---- neck: shadowed under the jaw and at the sides, the throat lit by the screen ----
  const NECK = [[1036, 356], [1106, 356], [1108, 400], [1104, 426], [1040, 426], [1034, 400]];
  fill(g, S(NECK, true), grey(0.9));
  g.save(); g.beginPath(); smoothPath(g, NECK, true); g.clip();
  softEll(g, 1072, 412, 30, 26, 0, grey(0.88), 8); softEll(g, 1056, 396, 8, 16, 0, grey(0.8), 4);
  softEll(g, 1040, 366, 12, 12, 0, grey(0.22), 5); softEll(g, 1106, 364, 12, 14, 0, grey(0.16), 5);
  softLine(g, [[1046, 366], [1060, 375], [1084, 375], [1098, 366]], 4, grey(0.4, 0.8), 2);
  softLine(g, [[1050, 379], [1072, 381], [1094, 379]], 5, grey(0.34, 0.85), 2);
  g.restore();
  // ---- the face ----
  fill(g, S(FACE, false), grey(0.9));
  g.save(); g.beginPath(); polyPath(g, FACE); g.clip();
  // shadow of the beanie and hair over the forehead; the cheek edges; the jaw
  g.fillStyle = lgrad(g, 0, 244, 0, 284, [[0, 0.3], [0.3, 0.48], [0.7, 0.72], [1, 0.88]]); g.fillRect(1010, 240, 120, 44);
  softLine(g, [[1021, 318], [1025, 336], [1036, 352], [1052, 366], [1066, 378]], 4, grey(0.55, 0.7), 2);
  softLine(g, [[1124, 300], [1122, 322], [1116, 340], [1100, 360], [1082, 378]], 6, grey(0.5, 0.85), 3);
  softLine(g, [[1060, 376], [1072, 379], [1084, 376]], 10, grey(0.62, 0.7), 3);
  // eye sockets: dark tired bags under the eyes, shading at the inner corners by the nose, lids
  softEll(g, 1037, 291.5, 16, 5, 0.04, grey(0.34, 0.95), 2.2);
  softEll(g, 1101, 291, 16, 4.6, -0.03, grey(0.36, 0.8), 2.2);
  softEll(g, 1110, 294, 9, 5, 0.3, grey(0.42, 0.6), 3);
  softEll(g, 1030, 293, 8, 4, -0.3, grey(0.45, 0.55), 3);
  softEll(g, 1057, 287, 5, 8, 0, grey(0.45, 0.8), 2.5);
  softEll(g, 1083, 285, 5, 9, 0, grey(0.4, 0.8), 2.5);
  softEll(g, 1036, 274.5, 15, 2.2, 0, grey(0.48, 0.7), 1.4);
  softEll(g, 1099, 274, 15, 2.2, 0, grey(0.45, 0.7), 1.4);
  // nose: the bridge's shaded left side, shade under the tip and on the philtrum
  softLine(g, [[1063, 300], [1062.5, 310], [1062, 320]], 2.6, grey(0.74, 0.7), 1.4);
  softLine(g, [[1057, 306], [1058, 314], [1059, 321]], 1.6, grey(0.7, 0.7), 0.8);
  softLine(g, [[1080.5, 302], [1080.5, 312], [1081, 320]], 2.4, grey(0.76, 0.7), 1.4);
  softEll(g, 1072, 333, 10, 2.4, 0, grey(0.74, 0.6), 1.8);
  softEll(g, 1072, 340, 6, 2.5, 0, grey(0.8, 0.4), 1.5);
  // mouth: lower-lip shadow and the chin crease; stubble shade on the chin
  softEll(g, 1072, 358.5, 12, 2.6, 0, grey(0.62, 0.85), 1.6);

  // the cheekbone shadow under the left eye, the right cheek's hollow
  softLine(g, [[1026, 298], [1030, 312], [1036, 326]], 4, grey(0.72, 0.6), 2.5);
  softLine(g, [[1116, 300], [1113, 318], [1108, 334]], 4, grey(0.7, 0.6), 2.5);
  skinGrain(g, FACE, { seed: 720, n: 360, bb: [1018, 250, 1124, 345], a: 0.05 });
  g.restore();
  // ---- eyes ----
  const gz = gaze === "down" ? { L: [1037.5, 287.2], R: [1101, 287], lid: 1.6 } : { L: [1031, 285], R: [1094, 285], lid: 0 };
  const EYE = {
    L: { up: [[1022.4, 284.2], [1027, 281.6], [1033, 280.6], [1041, 280.9], [1048.4, 282.2], [1052.8, 284.8]], lo: [[1052.8, 284.8], [1047, 288.5], [1036, 289.4], [1026, 288], [1022.4, 284.2]], crease: [[1022.6, 278.4], [1029, 275.2], [1036, 274], [1044, 274.6], [1050.8, 277]], brow: [[1022, 269.5], [1030, 267.6], [1040, 266.6], [1048, 267], [1053, 268.4]] },
    R: { up: [[1084.4, 284.8], [1089, 281.8], [1096, 280.4], [1104, 280.4], [1111, 281.6], [1116.6, 285.2]], lo: [[1116.6, 285.2], [1110, 288.6], [1098, 289.2], [1089, 288.2], [1084.4, 284.8]], crease: [[1083, 276.6], [1090, 274.2], [1098, 273.4], [1106, 274], [1113.5, 277.8]], brow: [[1082.6, 267.8], [1090.7, 265.4], [1100.7, 264.8], [1109, 266], [1115.5, 269.4]] },
  };
  for (const k of ["L", "R"]) {
    const E = EYE[k], [ix, iy] = gz[k];
    const open = [...E.up, ...E.lo.slice(1, -1)];
    fill(g, S(open, true), grey(0.73));
    g.save(); g.beginPath(); smoothPath(g, open, true); g.clip();
    softEll(g, (E.up[0][0] + E.up[5][0]) / 2, E.up[2][1] + 1.2, 18, 2.4 + gz.lid, 0, grey(0.3, 0.9), 1.1);
    dot(g, ix, iy, 6.1, grey(0.14));
    ring(g, ix, iy, 5.6, 1.1, grey(0.04));
    dot(g, ix, iy, 2.8, grey(0.02));
    dot(g, ix + 2.2, iy - 1.6, 1.2, grey(0.96));
    softEll(g, ix + (k === "L" ? 9 : 9), iy + 1, 6, 2.5, 0, grey(0.85, 0.5), 1.2);
    g.restore();
    ink(g, E.up, 2.8 + gz.lid * 0.4, "#050505", { smooth: true, ends: 0.3, jit: 0.05, seed: 740 + k.charCodeAt(0) });
    ink(g, E.lo, 1.0, grey(0.25, 0.9), { smooth: true, ends: 0.3, jit: 0.05, seed: 742 });
    ink(g, E.crease, 1.2, grey(0.3, 0.8), { smooth: true, ends: 0.2, jit: 0.05, seed: 743 });
    ink(g, E.brow, 2.9, grey(0.1), { smooth: true, ends: 0.3, jit: 0.15, seed: 744 });
    ink(g, E.lo.map(([x, y]) => [x, y + 3.6]).slice(1, -1), 0.9, grey(0.35, 0.6), { smooth: true, ends: 0.2, seed: 745 });
  }
  // ---- nose lines, nostrils, mouth ----
  ink(g, [[1062, 314], [1060.4, 322.7], [1062, 326.4], [1066, 328.6]], 1.1, grey(0.42, 0.85), { smooth: true, ends: 0.2, seed: 750 });
  ink(g, [[1080.5, 312], [1083.3, 322.7], [1081.6, 327], [1078.5, 328.7]], 1.0, grey(0.45, 0.8), { smooth: true, ends: 0.2, seed: 751 });
  ink(g, [[1064.3, 328.5], [1072.7, 331.2], [1080.6, 328.8]], 1, grey(0.38, 0.85), { smooth: true, ends: 0.3, seed: 752 });
  fillSoft(g, ELL(1066.2, 328.2, 2.6, 1.2, 0.25), grey(0.32), 0.7); fillSoft(g, ELL(1078.8, 328.2, 2.6, 1.2, -0.25), grey(0.36), 0.7);
  ink(g, [[1061.5, 322], [1060.8, 326.5], [1063.5, 329.2]], 1, grey(0.35, 0.8), { smooth: true, ends: 0.3, seed: 756 });
  ink(g, [[1083.5, 321.5], [1084.4, 326], [1081.8, 329]], 1, grey(0.4, 0.8), { smooth: true, ends: 0.3, seed: 757 });
  ink(g, [[1051.5, 348.8], [1057, 347.4], [1065, 347.2], [1072.7, 348], [1080, 347.2], [1087, 347.4], [1093.8, 349.2]], 2.2, grey(0.3), { smooth: true, ends: 0.3, jit: 0.05, seed: 753 });
  ink(g, [[1058, 345], [1066, 343.4], [1072.7, 344.6], [1079, 343.4], [1087, 345]], 0.9, grey(0.5, 0.7), { smooth: true, ends: 0.2, seed: 758 });
  ink(g, [[1060, 356.8], [1072.7, 358.4], [1085, 356.8]], 1.4, grey(0.45, 0.75), { smooth: true, ends: 0.2, seed: 754 });
  // stubble under the lip and on the chin
  { g.save(); g.beginPath(); polyPath(g, FACE); g.clip(); softEll(g, 1072, 368, 20, 9, 0, grey(0.72, 0.35), 3);
    const rs = rng(759); for (let i = 0; i < 260; i++) { const x = 1048 + rs() * 50, y = 350 + rs() * 28; const d = ((x - 1072) / 25) ** 2 + ((y - 366) / 13) ** 2; if (d < 1 && !(y < 359 && Math.abs(x - 1072) < 15)) ink(g, [[x, y], [x + 0.6, y + 1.2]], 0.5, grey(0.4, 0.3), { seed: i }); }
    g.restore(); }
  ink(g, [[1066, 341], [1072, 343.4], [1078, 341]], 0.9, grey(0.58, 0.6), { smooth: true, ends: 0.2, seed: 755 });
  // ---- locks (measured at 8x): clumpy wet locks as tapered curves: [centreline, root width, tip width] ----
  fill(g, S([[994, 250], [1020, 244], [1072, 240], [1120, 243], [1146, 250], [1141, 257], [1100, 250], [1072, 249], [1040, 251], [1016, 259]], true), "#040404");
  const LOCKS = [
    // the big central lock sweeping down to the inner corner of the left eye, a thin strand beside it
    [[[1064, 243], [1063, 258], [1060, 274], [1056, 288], [1051, 302]], 26, 2.5], [[[1074, 245], [1071, 262], [1068, 280]], 7, 1],
    [[[1079, 245], [1081, 256], [1082, 267]], 3, 0.8], [[[1058, 246], [1054, 256], [1049, 266]], 7, 1.5],
    // left bangs and the temple locks
    [[[1038, 248], [1030, 257], [1024, 270], [1020, 291]], 16, 2.5], [[[1030, 250], [1018, 262], [1010, 282], [1006, 306]], 20, 3.5],
    [[[1016, 256], [1004, 270], [997, 290], [994, 320]], 18, 5], [[[1046, 248], [1040, 256], [1034, 263]], 8, 1.5], [[[1016, 288], [1014, 305], [1017, 322]], 6, 1.5],
    [[[1003, 300], [1008, 325], [1011, 348], [1016, 366]], 10, 3], [[[996, 320], [999, 340], [995, 356]], 8, 2],
    // right side
    [[[1103, 247], [1113, 257], [1120, 272], [1124, 297]], 14, 2.5], [[[1114, 249], [1127, 261], [1134, 280], [1136, 306]], 20, 3.5],
    [[[1126, 254], [1139, 268], [1144, 290], [1144, 322]], 16, 5], [[[1096, 247], [1101, 255], [1104, 262]], 6, 1.2], [[[1106, 250], [1112, 266], [1116, 281]], 3, 0.8],
    [[[1130, 300], [1134, 320], [1133, 340], [1128, 356]], 10, 3], [[[1142, 318], [1146, 336], [1150, 350]], 7, 1.5],
  ];
  const lockPts = [];
  for (const [C, w0, w1] of LOCKS) {
    const q = sampleCurve(C, 10);
    taper(g, q, (u) => lerp(w0, w1, Math.pow(u, 0.8)) * (1 + 0.12 * Math.sin(PI * u)), "#030303");
    lockPts.push([q, w0, w1]);
  }
  // strand lines inside each lock (grey, thin), the side-hair strands
  const r3 = rng(770);
  for (const [q, w0] of lockPts) {
    const n = Math.max(1, Math.round(w0 / 5));
    for (let k = 0; k < n; k++) {
      const off = (r3() - 0.5) * w0 * 0.5, st = [];
      for (let i = 0; i < q.length; i++) { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const f = off * (1 - i / q.length); st.push([q[i][0] - (b[1] - a[1]) / d * f, q[i][1] + (b[0] - a[0]) / d * f]); }
      ink(g, st.slice(0, Math.round(st.length * (0.6 + r3() * 0.35))), 0.55 + r3() * 0.5, grey(0.16 + r3() * 0.16, 0.9), { ends: 0.1, jit: 0.1, seed: 771 + k + Math.round(q[0][0]) });
    }
  }
  for (const [side, x0, x1] of [[-1, 993, 1016], [1, 1128, 1146]]) for (let i = 0; i < 12; i++) {
    const sx = lerp(x0, x1, r3()), sy = 262 + r3() * 40, ex = sx + side * (2 + r3() * 7), ey = sy + 30 + r3() * 50;
    ink(g, [[sx, sy], [lerp(sx, ex, 0.5), lerp(sy, ey, 0.5)], [ex, ey]], 0.5 + r3() * 0.5, grey(0.14 + r3() * 0.14, 0.9), { smooth: true, ends: 0.05, jit: 0.15, seed: 790 + i + (side > 0 ? 50 : 0) });
  }
  // ---- sweat drops ----
  for (const [x, y, s] of [[1032.7, 320, 1.1], [1111, 319, 1], [1107.7, 337.7, 0.9], [1081, 302, 0.9], [1057, 299, 0.8], [1054, 258, 1], [1087, 256, 1], [1098, 305, 0.8]]) {
    fill(g, S([[x, y - 3.8 * s], [x + 1.6 * s, y], [x, y + 1.6 * s], [x - 1.6 * s, y]], true), grey(0.55, 0.9));
    ink(g, [[x - 1.2 * s, y - 1.5 * s], [x - 1.4 * s, y + 0.6 * s], [x, y + 1.6 * s]], 0.6, grey(0.2, 0.8), { smooth: true, seed: 790 });
    dot(g, x + 0.3 * s, y + 0.2 * s, 0.45 * s, grey(0.95, 0.8));
  }
  // ---- the beanie ----
  const BEANIE = [[992, 284.8], [991.8, 277], [994.8, 263], [991.5, 254.2], [991.5, 248], [996.5, 228.5], [998.5, 213], [1017.2, 188.8], [1018.8, 179.8], [1053.8, 166.5], [1062.8, 161], [1070.5, 161], [1072.8, 162.5], [1108, 173], [1117.2, 178.5], [1124.2, 193.2], [1141.5, 219], [1139.8, 232], [1146.2, 245.8], [1144.2, 260.2], [1147.5, 281],
    [1144, 283], [1139, 274], [1134, 266], [1128, 258], [1110, 248], [1085, 243], [1060, 243], [1042, 246], [1020, 256], [1004, 268], [997, 280]];
  fill(g, S(BEANIE, true), grey(0.2));
  g.save(); g.beginPath(); smoothPath(g, BEANIE, true); g.clip();
  g.fillStyle = lgrad(g, 0, 160, 0, 285, [[0, 0.13], [0.2, 0.19], [0.36, 0.2], [0.4, 0.12], [0.44, 0.26], [0.75, 0.3], [0.9, 0.28], [1, 0.2]]); g.fillRect(985, 155, 170, 132);
  softEll(g, 1000, 245, 9, 34, 0, grey(0.12, 0.8), 6); softEll(g, 1144, 240, 7, 34, 0, grey(0.1, 0.8), 6);
  softEll(g, 1040, 190, 25, 12, -0.3, grey(0.23, 0.6), 8);
  // knit ribs: soft vertical ridges fanning with the dome, mottled
  carve(g, S(BEANIE, true), { coord: (x, y) => [(x - 1071) * (1 + (285 - y) * 0.0022), y], v: 0.26, per: 3.2, seed: 780, over: true, alpha: 0.32, lum: 0.45, brk: 0.3, wav: 0.2, soft: 1.8, streak: 0.5 });
  skinGrain(g, BEANIE, { seed: 781, n: 500, bb: [990, 160, 1148, 285], ang: PI / 2, a: 0.14 });
  g.restore();
  // the fold line of the cuff (a dark groove with a lit lip under it) and the rolled lower edge
  ink(g, [[998, 226], [1025, 212], [1050, 207], [1072, 206], [1100, 209], [1125, 216], [1141, 224]], 1.9, grey(0.06), { smooth: true, ends: 0.3, seed: 790 });
  ink(g, [[999, 229.5], [1025, 215.5], [1050, 210.8], [1072, 209.8], [1100, 212.8], [1125, 219.8], [1140, 227.5]], 1.2, grey(0.36, 0.7), { smooth: true, ends: 0.3, seed: 791 });
  ink(g, [[997, 279], [1004, 267], [1020, 255], [1042, 245.5], [1060, 242.6], [1085, 242.6], [1110, 246.6], [1128, 253.5], [1138, 263], [1143, 273]], 1.3, grey(0.36, 0.6), { smooth: true, ends: 0.3, seed: 792 });
}
LAYERS.push(function designerHead(g, o) { head(g, o.gaze); });
// ======================================================================================
// CENTRE: the lamp's light on the wall, under the desk, the trestles, the desk plank and what stands on it
// ======================================================================================
LAYERS.push(function wallLight(g) {
  // the pool of lamplight on the wall: a fine crumpled texture of tiny bright squiggles (rough plaster / patterned
  // paper) brightest at its centre (1335, 382), fading over ~60 px; drawn opaque so it never greys into a disc
  // iso-contours of a fractal noise, carved as thin lines: a lace of squiggles
  const cx = 1334, cy = 380;
  const fallF = (x, y) => Math.exp(-(((x - cx) / 44) ** 2 + ((y - cy) / 36) ** 2) * 1.2);
  carve(g, ELL(cx, cy + 4, 66, 54), { coord: (x, y) => [fbm(x / 6, y / 6, 905, 2) * 7, x + y], vf: (x, y) => 0.85 * fallF(x, y) * (0.75 + 0.5 * vn2(x / 9, y / 9, 906)), per: 1, jit: 0, wav: 0, sw: 0.3, swL: 6, brk: 0.5, brkL: 8, streak: 0.4, stL: 8, bg: 0, wExp: 1.7, soft: 1.2, lum: 0.95, seed: 907, over: true });
});

LAYERS.push(function underDesk(g) {
  // the dark back of the room under the desk: faint vertical lines
  // (the dark back of the room under the desk: a faint mottled tone, no lines)
  g.fillStyle = rgrad(g, 1140, 700, 60, 260, [[0, grey(0.03)], [1, grey(0)]], 1140, 700); g.fillRect(900, 560, 480, 290);
  // the stool: a lit seat edge, dark legs
  carve(g, null, { q: [[1045, 648], [1142, 648], [1142, 668], [1045, 668]], dir: "h", vq: (u, v) => lerp(0.22, 0.17, u) * lerp(1, 0.7, v), per: 3, seed: 911 });
  edge(g, [[1045, 648], [1142, 648]], 1.1, 0.45, 912);
  for (const [x0, x1] of [[1050, 1060], [1128, 1138]]) carve(g, null, { q: [[x0, 671], [x1, 671], [x1 + 3, 800], [x0 + 3, 800]], v: 0.1, per: 3, seed: 913 + x0 });
  carve(g, null, { q: [[1070, 600], [1120, 600], [1120, 651], [1070, 651]], v: 0.06, per: 4, seed: 915 });
  // the right bench beyond the trestle
  carve(g, null, { q: [[1341, 700], [1512, 700], [1512, 718], [1341, 718]], dir: "h", vq: (u) => lerp(0.05, 0.55, sstep(0.15, 0.55, u)) * lerp(1, 0.75, sstep(0.7, 1, u)), per: 3, seed: 916 });
  edge(g, [[1341, 700], [1512, 700]], 1.2, 0.8, 917);
  carve(g, null, { q: [[1341, 738], [1512, 738], [1512, 776], [1341, 776]], dir: "h", vq: (u, v) => lerp(0.12, 0.45, sstep(0.1, 0.5, u)) * lerp(1, 0.75, v), per: 3.2, seed: 918 });
  edge(g, [[1341, 738], [1512, 738]], 1.1, 0.7, 919);
  for (const [x0, x1] of [[1355, 1374], [1496, 1512]]) carve(g, null, { q: [[x0, 718], [x1, 718], [x1, 866], [x0, 866]], vq: UG(0.55, 0.25), per: 3, seed: 920 + x0 });
  fill(g, [[1360, 776], [1500, 776], [1500, 786], [1360, 786]], grey(0.05));
});

LAYERS.push(function trestleBack(g) {
  // the back diagonal legs (dim) and the slanted front leg on the right (lit)
  carve(g, null, { q: [[878, 560], [893, 560], [874, 840], [862, 840]], v: 0.12, per: 3.4, seed: 930 });
  carve(g, null, { q: [[1305, 562], [1322, 564], [1273, 826], [1258, 824]], vq: (u, v) => lerp(0.6, 0.3, u) * lerp(1, 0.75, v), per: 3.4, seed: 931, streak: 0.4 });
  dark(g, [[1322, 564], [1273, 826]], 1.3, 932);
  carve(g, null, { q: [[1330, 565], [1342, 566], [1318, 700], [1308, 698]], v: 0.18, per: 3, seed: 933 });
});

LAYERS.push(function trestleFront(g) {
  // left post, its brace and the low stretcher
  carve(g, null, { q: [[831, 544], [852, 544], [832, 866], [810, 866]], vq: (u, v) => lerp(0.5, 0.25, sstep(0.3, 1, u)) * (0.55 + 0.6 * Math.sin(PI * clamp(v * 1.1))), per: 3.6, seed: 940, streak: 0.4 });
  dark(g, [[852, 544], [832, 866]], 1.4, 941);
  carve(g, null, { q: [[846, 605], [893, 552], [900, 560], [850, 618]], dir: "h", vq: UG(0.3, 0.45), per: 3.2, seed: 942 });
  carve(g, null, { q: [[843, 800], [893, 800], [893, 811], [843, 811]], dir: "h", v: 0.4, per: 3, seed: 943 });
  // right post, its brace
  carve(g, null, { q: [[1436, 544], [1458, 544], [1473, 866], [1453, 866]], vq: (u, v) => lerp(0.55, 0.3, sstep(0.4, 1, u)) * (0.5 + 0.65 * Math.sin(PI * clamp(v * 1.1))), per: 3.6, seed: 944, streak: 0.4 });
  dark(g, [[1458, 544], [1473, 866]], 1.4, 945);
  carve(g, null, { q: [[1370, 546], [1380, 544], [1432, 600], [1430, 612]], dir: "h", v: 0.35, per: 3, seed: 946 });
  for (const [x, y] of [[840, 617], [1450, 614]]) { dot(g, x, y, 4.5, grey(0.05)); ring(g, x, y, 4.5, 1.3, grey(0.55)); dot(g, x - 1, y - 1, 1.4, grey(0.85)); }
});

LAYERS.push(function deskPlank(g) {
  // under-plank shadow (the apron)
  fill(g, [[767, 542], [1512, 542], [1512, 562], [767, 562]], "#050505");
  carve(g, null, { q: [[775, 543], [1505, 543], [1505, 560], [775, 560]], dir: "h", v: 0.07, per: 3.4, seed: 950 });
  // the plank's front: lit wood, long horizontal grain with knots
  carve(g, null, { q: [[768, 523], [1512, 523], [1512, 543], [767, 543]], dir: "h", vq: (u, v) => (0.5 - 0.1 * Math.sin(u * 18 + 1) * Math.sin(u * 7)) * lerp(1.05, 0.8, v) * (u > 0.12 && u < 0.2 ? 0.75 : 1), per: 2.6, seed: 951, streak: 0.45, stL: 40, wav: 0.4, wavL: 90 });
  edge(g, [[768, 523], [1512, 523]], 1.3, 0.85, 952);
  dark(g, [[767, 543], [1512, 543]], 1.3, 953);
  edge(g, [[768, 524], [767, 542]], 1.6, 0.8, 954); edge(g, [[1511, 524], [1511, 542]], 1.4, 0.7, 955);
});

LAYERS.push(function deskItems(g) {
  // ---- the mug and its steam ----
  const body = [[817, 473], [819, 471], [869, 471], [871, 473], [868, 521], [820, 521]];
  fill(g, body, lgrad(g, 817, 0, 871, 0, [[0, 0.45], [0.06, 0.35], [0.18, 0.5], [0.38, 0.88], [0.6, 0.95], [0.9, 0.9], [1, 0.72]]));
  g.save(); g.beginPath(); polyPath(g, body); g.clip(); softEll(g, 844, 516, 30, 6, 0, grey(0.5, 0.35), 3); g.restore();
  g.fillStyle = grey(0.95); g.beginPath(); g.ellipse(844, 472, 26.5, 2, 0, 0, TAU); g.fill();
  dark(g, body, 1.1, 960, { closed: true });
  g.lineCap = "round";
  ring(g, 871, 497, 12, 5.2, grey(0.03), -PI * 0.5, PI * 0.5); ring(g, 871, 497, 12, 3.2, grey(0.9), -PI * 0.5, PI * 0.5);
  ring(g, 817, 497, 11.5, 4, grey(0.03), PI * 0.5, PI * 1.5); ring(g, 817, 497, 11.5, 2, grey(0.35), PI * 0.5, PI * 1.5);
  for (const [pts, v] of [[[[839, 466], [843, 450], [835, 432], [840, 415], [856, 406], [858, 396], [849, 390]], 0.7], [[[833, 441], [824, 429], [827, 418], [843, 406], [844, 396], [834, 392], [819, 386], [818, 379], [826, 372]], 0.62], [[[830, 380], [835, 366], [846, 359]], 0.55]])
    softLine(g, pts, 1.6, grey(v), 0.5, { ends: 0.15 });
  // ---- the books left of the pencils ----
  book(g, [[1180, 489], [1265, 488], [1266, 505], [1181, 506]], { v: 0.85, spine: 0.4, seed: 961 });
  book(g, [[1178, 505], [1270, 504], [1270, 522], [1178, 522]], { v: 0.8, spine: 0.35, seed: 963 });
  // ---- pencil cup and pencils ----
  for (const [x0, y0, x1, y1, v] of [[1300, 452, 1291, 416, 0.8], [1306, 452, 1302, 420, 0.7], [1311, 452, 1310, 414, 0.85], [1316, 452, 1318, 418, 0.75], [1321, 452, 1328, 423, 0.8], [1325, 452, 1336, 428, 0.7]]) {
    ink(g, [[x0, y0], [x1, y1]], 2.8, "#050505", { seed: x0 });
    ink(g, [[x0, y0], [x1, y1]], 1.8, grey(v), { seed: x0 + 1, ends: 0.4 });
  }
  const cup = [[1294, 452], [1330, 452], [1330, 502], [1294, 502]];
  carve(g, null, { q: cup, dir: "h", vq: (u) => 0.1 + 0.48 * Math.exp(-(((u - 0.45) / 0.18) ** 2)), per: 2.6, seed: 965, streak: 0.4, stL: 10 });
  g.fillStyle = grey(0.55); g.beginPath(); g.ellipse(1312, 452, 18, 3, 0, 0, TAU); g.fill();
  g.fillStyle = grey(0.05); g.beginPath(); g.ellipse(1312, 452.5, 15.5, 2, 0, 0, TAU); g.fill();
  dark(g, cup, 1.1, 966, { closed: true });
  // ---- the receiver and the books on it ----
  book(g, [[1346, 442], [1484, 441], [1485, 457], [1347, 458]], { v: 0.5, seed: 970 });
  book(g, [[1436, 435], [1479, 434], [1480, 442], [1436, 443]], { v: 0.4, seed: 972 });
  const ob = [[1355, 423], [1400, 420], [1437, 425], [1436, 438], [1356, 440]];
  fill(g, ob, grey(0.6)); carve(g, ob, { ang: 0, v: 0.6, per: 2.6, seed: 974, bg: 0.7 }); dark(g, ob, 1.2, 975, { closed: true });
  ink(g, [[1400, 421], [1402, 438]], 1, grey(0.3), { seed: 976 });
  const RX = [[1355, 458], [1486, 458], [1486, 521], [1355, 521]];
  woodPaint(g, RX, (u, v) => lerp(0.3, 0.24, v) * (0.9 + 0.2 * Math.sin(u * 17)), { dir: "v", seed: 977 });
  dark(g, RX, 1.3, 978, { closed: true });
  edge(g, [[1356, 459], [1485, 459]], 1.2, 0.6, 979);
  for (const pts of [[[1357, 488], [1484, 488]], [[1400, 460], [1400, 488]], [[1422, 460], [1422, 520]]]) ink(g, pts, 1.1, grey(0.04), { seed: 980 });
  edge(g, [[1358, 461], [1399, 461], [1399, 487], [1358, 487]], 0.9, 0.35, 981, { closed: true });
  knob(g, 1366, 473.6, 7, { lit: 0.85, cap: 0.05 }); ring(g, 1366, 473.6, 7, 1.4, grey(0.8), 2.2, 5.4);
  fill(g, [[1376, 467], [1384, 467], [1384, 471], [1376, 471]], grey(0.85));
  fill(g, [[1389, 470], [1393, 475], [1389, 480], [1385, 475]], grey(0.45));
  dot(g, 1411, 476, 7.2, grey(0.05)); fill(g, ELL(1411.5, 476.5, 5.5, 5.5), rgrad(g, 1409, 474, 1, 6, [[0, 0.95], [1, 0.55]])); ring(g, 1411, 476, 7, 1, grey(0.4));
  knob(g, 1436, 473.6, 6.5, { lit: 0.7 }); ring(g, 1436, 473.6, 6.2, 1.2, grey(0.6), 0, TAU);
  fill(g, [[1450, 468], [1475, 468], [1475, 482], [1450, 482]], grey(0.12)); edge(g, [[1450, 468], [1475, 468], [1475, 482], [1450, 482]], 1.5, 0.82, 982, { closed: true });
  for (const x of [1366, 1389, 1437, 1466]) { dot(g, x, 501, 6.5, grey(0.02)); ring(g, x, 501, 6.2, 1.6, grey(0.7)); dot(g, x, 501, 3.5, grey(0.08)); }
  knob(g, 1412, 501, 5, { lit: 0.5 });
});

LAYERS.push(function lamp(g) {
  // the arm: two parallel rods from the head down to the elbow knob, the rod down behind the receiver
  for (const [a, b, w, v] of [[[1426, 302], [1494, 390], 3.4, 0.22], [[1430, 298], [1498, 384], 1.4, 0.55], [[1494, 394], [1486, 440], 3, 0.25], [[1426, 318], [1426, 440], 1.6, 0.3]]) {
    ink(g, [a, b], w + 1.5, "#030303", { seed: a[0] }); ink(g, [a, b], w, grey(v), { seed: a[0] + 1 });
  }
  dot(g, 1494, 394, 5.5, grey(0.06)); ring(g, 1494, 394, 5.5, 1.3, grey(0.55)); dot(g, 1493, 393, 1.5, grey(0.8));
  // the neck: a small tilted cylinder
  g.save(); g.translate(1408, 294); g.rotate(0.55);
  fill(g, [[-12, -8], [12, -8], [12, 8], [-12, 8]], grey(0.08));
  softLine(g, [[-10, -5], [10, -5]], 2.6, grey(0.85), 0.8); softLine(g, [[-10, 3], [10, 3]], 1.4, grey(0.4), 0.6);
  g.restore();
  // the shade: a metal dome, dark, with bright streaks running from the neck toward the mouth, a lit rim
  const dome = [[1324, 330], [1334, 318], [1350, 309], [1372, 302], [1395, 301], [1410, 309], [1418, 324], [1416, 346], [1408, 366], [1399, 380]];
  fill(g, S(dome, true), grey(0.07));
  g.save(); g.beginPath(); smoothPath(g, dome, true); g.clip();
  softLine(g, [[1392, 306], [1392, 330], [1388, 362]], 5, grey(0.85), 1.6);
  softLine(g, [[1356, 312], [1372, 318], [1384, 332], [1392, 348]], 16, grey(0.6, 0.85), 5);
  softLine(g, [[1380, 305], [1374, 328], [1366, 350]], 2.4, grey(0.45), 1);
  softLine(g, [[1405, 310], [1408, 335], [1402, 368]], 1.6, grey(0.35), 0.8);
  const r = rng(991);
  for (let i = 0; i < 14; i++) { const t = i / 13, sx = lerp(1340, 1410, t), sy = 318 - Math.sin(PI * t) * 12; softLine(g, [[sx, sy], [sx - 8 + t * 8, sy + 30]], 0.8, grey(0.22 + r() * 0.2, 0.8), 0.5); }
  g.restore();
  ink(g, dome, 1.2, grey(0.35, 0.8), { smooth: true, seed: 992, ends: 0.5 });
  // the mouth: a white-hot ellipse with the bulb's rim inside
  g.save(); g.translate(1361.5, 355); g.rotate(0.588);
  g.fillStyle = rgrad(g, 0, -2, 4, 46, [[0, 1], [0.8, 0.96], [1, 0.82]]); g.beginPath(); g.ellipse(0, 0, 45.5, 13, 0, 0, TAU); g.fill();
  g.strokeStyle = grey(0.3); g.lineWidth = 1.3; g.beginPath(); g.ellipse(-2, -3, 17, 6, 0, 0.2, PI - 0.2); g.stroke();
  g.strokeStyle = grey(0.55, 0.8); g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 0, 45.5, 13, 0, PI * 1.05, PI * 1.95); g.stroke();
  g.restore();
});

LAYERS.push(function deskCables(g) {
  // cables over the desk's front edge and down to the floor
  cable(g, [[938, 525], [928, 560], [912, 640], [900, 740], [884, 820], [868, 860]], 4.2, 1000, 0.55);
  cable(g, [[955, 524], [952, 560], [930, 640], [904, 720], [880, 800], [850, 870]], 4.2, 1001, 0.5);
  cable(g, [[1296, 520], [1300, 560], [1296, 640], [1280, 720], [1266, 790], [1250, 860]], 3.8, 1002, 0.5);
  cable(g, [[1305, 520], [1312, 580], [1316, 660], [1330, 760], [1338, 850]], 3.6, 1003, 0.45);
  for (const [x, dx] of [[1366, 6], [1389, 12], [1437, 22], [1466, 30]]) cable(g, [[x, 501], [x + 2, 520], [x + dx * 0.4, 600], [x + dx * 0.8, 720], [x + dx, 860]], 3.6, 1004 + x, 0.5);
});
// ======================================================================================
// THE DESIGNER — torso, headphones, laptop
// ======================================================================================
const SHIRT = [[1002, 359], [978, 369], [956, 383], [938, 399], [928, 413], [920, 433], [917, 460], [914, 522],
  [1150, 523], [1200, 521], [1238, 505], [1244, 488], [1241.5, 471.5], [1226.5, 454], [1216.5, 441.5], [1204, 402], [1190, 388],
  [1166, 375], [1138, 361], [1100, 352], [1040, 352]];
LAYERS.push(function torso(g) {
  fill(g, S(SHIRT, false), grey(0.9));
  g.save(); g.beginPath(); polyPath(g, SHIRT); g.clip();
  // light: the screen lights the chest from below; the arms turn away into shade at their outer edges
  softEll(g, 1072, 470, 110, 80, 0, grey(0.95), 14);
  softLine(g, [[930, 405], [922, 440], [918, 490]], 12, grey(0.58), 6);
  softLine(g, [[1204, 400], [1214, 432], [1224, 458]], 12, grey(0.42), 5);
  softLine(g, [[1236, 468], [1242, 490]], 8, grey(0.55, 0.8), 4);
  // the dark t-shirt between the lapels, lit grey by the laptop; the neck opening
  fill(g, S([[1040, 420], [1060, 428], [1090, 428], [1115, 422], [1127, 437], [1122, 470], [1112, 522], [1060, 522], [1050, 470]], false), grey(0.78));
  softLine(g, [[1020, 420], [1045, 428], [1075, 431], [1105, 428], [1126, 424]], 6, grey(0.56, 0.8), 2.5);
  // collar shadow under the hair
  softLine(g, [[1000, 360], [1020, 368], [1040, 372]], 8, grey(0.25), 4);
  softLine(g, [[1110, 362], [1130, 362], [1150, 366]], 8, grey(0.35, 0.8), 4);
  // fold strokes (grey pencil): the left shoulder seam and sleeve fold, the lapels, the right side's diagonal folds
  const F = [
    [[[938, 407], [960, 392], [980, 381], [994, 373]], 1.4, 0.6, 0.7], [[[940, 409], [962, 395], [982, 384], [996, 376]], 0.8, 0.72, 0.5],
    [[[938, 407], [943, 420], [948, 433]], 1.6, 0.62, 0.7],
    [[[1006, 383], [1001, 405], [996, 435]], 1.6, 0.5, 0.6], [[[996, 435], [1004, 440]], 1.4, 0.5, 0.6],
    [[[1122, 410], [1127, 437], [1146, 444]], 1.8, 0.45, 0.6], [[[1125, 440], [1134, 480], [1142, 521]], 1.4, 0.55, 0.7],
    [[[1175, 395], [1160, 430], [1150, 470], [1148, 500]], 3, 0.62, 1.4], [[[1190, 400], [1172, 440], [1160, 480]], 2.6, 0.6, 1.4],
    [[[1200, 430], [1182, 470], [1170, 500]], 2.4, 0.62, 1.3], [[[1210, 455], [1195, 480], [1180, 505]], 2, 0.6, 1.2],

    [[[1170, 372], [1185, 385], [1196, 392]], 1.4, 0.55, 0.8], [[[1140, 368], [1160, 375]], 1.2, 0.6, 0.8],
    [[[960, 400], [966, 430], [962, 470]], 1.6, 0.74, 1], [[[980, 395], [986, 420]], 1.4, 0.76, 1],
  ];
  for (const [pts, w, v, b] of F) softLine(g, pts, w * 0.8, grey(v * 0.85), Math.min(b, 0.7));
  // more fold lines measured on the plate's local-darkening map (thin, crisp pencil folds)
  for (const [pts, w, v] of [
    [[[1150, 368], [1172, 376], [1192, 388], [1204, 402]], 1.3, 0.5], [[[1204, 402], [1214, 425], [1222, 448], [1238, 470]], 1.2, 0.45],
    [[[1160, 430], [1170, 455], [1182, 480], [1192, 502]], 1.4, 0.5], [[[1180, 440], [1196, 458], [1214, 480]], 1.2, 0.52], [[[1170, 470], [1185, 474], [1210, 470]], 1.2, 0.55],
    [[[1140, 450], [1150, 470], [1160, 500]], 1.1, 0.55], [[[1190, 420], [1200, 440], [1205, 460]], 1, 0.58],
    [[[935, 402], [950, 392], [970, 380], [995, 370]], 1.2, 0.52], [[[946, 405], [950, 425], [953, 445]], 1.1, 0.55], [[[962, 398], [966, 420], [966, 442]], 1, 0.6],
    [[[1036, 428], [1060, 436], [1085, 437], [1110, 432]], 1.4, 0.45],
  ]) softLine(g, pts, w, grey(v), 0.5, { ends: 0.2 });
  // collar seams and lapel notches (grey pencil lines)
  for (const [pts, w, v] of [
    [[[941, 394], [960, 384], [980, 375], [996, 369]], 1.4, 0.5], [[[996, 419], [999, 428], [1001, 436]], 1.3, 0.45], [[[990, 405], [996, 419], [1006, 424]], 1.2, 0.5],
    [[[1139, 369], [1160, 377], [1180, 386], [1196, 394]], 1.4, 0.5], [[[1131, 439], [1140, 441], [1146, 444]], 1.3, 0.45], [[[1128, 410], [1131, 425], [1131, 439]], 1.2, 0.5],
  ]) softLine(g, pts, w, grey(v), 0.8);
  g.restore();
  ink(g, SHIRT.slice(0, 8), 1.3, grey(0.2, 0.8), { smooth: true, ends: 0.4, seed: 1100 });
  ink(g, SHIRT.slice(10, 19), 1.3, grey(0.25, 0.8), { smooth: true, ends: 0.4, seed: 1101 });
  // his left hand resting on the desk (fingers toward the laptop) and his right hand at the laptop's left
  const hand = [[1136, 521], [1138, 511], [1148, 505], [1162, 503], [1176, 506], [1184, 512], [1182, 521]];
  fill(g, S(hand, true), grey(0.86));
  softEll(g, 1160, 518, 20, 3, 0, grey(0.6, 0.6), 2);
  for (const x of [1144, 1152, 1160]) ink(g, [[x, 509], [x - 3, 520]], 0.8, grey(0.4, 0.8), { seed: x });
  ink(g, hand, 1, grey(0.3, 0.8), { smooth: true, seed: 1103 });
  fill(g, S([[909, 516], [914, 494], [922, 486], [933, 498], [930, 516]], true), grey(0.6));
  ink(g, [[912, 512], [921, 490], [932, 502]], 1, grey(0.2, 0.9), { smooth: true, seed: 1102 });
});

LAYERS.push(function headphones(g) {
  // (measured at 4–8x) round his neck: the left cup seen from its outer side (x 1004–1058, y 364–444): a shell with a
  // thick dark rim and an inner ring, the ribbed cushion torus behind it on the right; the right cup nearly edge-on
  // (x 1086–1139, y 361–429): shell face, ribbed cushion band, the yoke with two white rim arcs. Lit from below by
  // the laptop: their upper halves are in shade.
  blurDraw(g, [995, 345, 1150, 452], 0.55, (c) => {
    const E = (x, y, rx, ry, a, fill, stroke, lw) => { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } c.restore(); };
    // fork / band ends
    fill(c, S([[996, 354], [1022, 355], [1026, 372], [1014, 388], [1000, 386], [994, 370]], true), grey(0.05));
    ink(c, [[1122, 366], [1128, 353], [1136, 346]], 5, grey(0.06), { seed: 1111 });
    // left cup: cushion torus (dark, lit ribs on its right half)
    E(1041, 404, 17.5, 40, 0.06, grey(0.14), grey(0.04), 1.6);
    c.save(); c.translate(1041, 404); c.rotate(0.06);
    for (let i = 0; i < 26; i++) { const t = -PI * 0.5 + (i / 25) * PI; c.strokeStyle = grey(0.88, 0.9); c.lineWidth = 1.7; c.beginPath(); c.moveTo(Math.cos(t) * 10, Math.sin(t) * 30); c.lineTo(Math.cos(t) * 16.5, Math.sin(t) * 38.5); c.stroke(); }
    c.restore();
    // left cup: the shell
    E(1024, 407, 17.5, 37.5, 0.07, grey(0.05));
    c.save(); c.translate(1024, 407); c.rotate(0.07);
    c.fillStyle = lgrad(c, -10, -34, 10, 34, [[0, 0.42], [0.55, 0.62], [1, 0.82]]); c.beginPath(); c.ellipse(1, 0.5, 14, 34, 0, 0, TAU); c.fill();
    c.strokeStyle = grey(0.12); c.lineWidth = 1.3; c.beginPath(); c.ellipse(0, 2, 9.5, 24, 0, 0, TAU); c.stroke();
    c.fillStyle = lgrad(c, -8, -22, 8, 24, [[0, 0.75], [0.5, 0.95], [1, 0.9]]); c.beginPath(); c.ellipse(0, 2, 8.6, 23, 0, 0, TAU); c.fill();
    c.strokeStyle = grey(0.9); c.lineWidth = 1.5; c.beginPath(); c.ellipse(1, 0.5, 14, 34, 0, PI * 0.62, PI * 1.32); c.stroke();
    c.strokeStyle = grey(0.7, 0.8); c.lineWidth = 1; c.beginPath(); c.ellipse(0, 2, 8.6, 23, 0, PI * 1.1, PI * 1.6); c.stroke();
    c.restore();
    // right cup: shell face, ribbed cushion band, yoke with white rims
    E(1096, 395, 9.5, 34, 0, grey(0.05));
    E(1096.5, 395, 7.5, 32, 0, lgrad(c, 0, 363, 0, 427, [[0, 0.5], [1, 0.78]]));
    c.save(); c.beginPath(); c.ellipse(1112.5, 394.5, 9, 34, 0, 0, TAU); c.clip();
    c.fillStyle = grey(0.1); c.fillRect(1100, 358, 26, 74);
    for (let i = 0; i < 15; i++) { const y = 363 + i * 4.4; c.fillStyle = lgrad(c, 1104, 0, 1121, 0, [[0, 0.6], [0.5, 0.95], [1, 0.65]]); c.fillRect(1103, y, 19, 2.2); }
    c.restore();
    ink(c, [[1104, 361], [1103, 394], [1104, 428]], 1.2, grey(0.05), { smooth: true, seed: 1113 }); ink(c, [[1121, 360], [1122, 394], [1121, 427]], 1.2, grey(0.05), { smooth: true, seed: 1114 });
    fill(c, S([[1121, 360], [1131, 358], [1140, 374], [1140, 407], [1132, 424], [1122, 426]], true), grey(0.05));
    fill(c, S([[1124, 374], [1131, 373], [1132, 400], [1125, 401]], true), grey(0.72));
    ink(c, [[1124, 362], [1133, 378], [1134, 407], [1126, 422]], 1.2, grey(0.9), { smooth: true, seed: 1115 });
    ink(c, [[1130, 360], [1139, 378], [1139, 407], [1132, 422]], 1.1, grey(0.78), { smooth: true, seed: 1116 });
    c.globalCompositeOperation = "source-atop"; c.fillStyle = lgrad(c, 0, 362, 0, 418, [[0, "rgba(0,0,0,0.3)"], [1, "rgba(0,0,0,0)"]]); c.fillRect(995, 345, 155, 105); c.globalCompositeOperation = "source-over";
  });
  // the laptop's light washing over their lower halves and the chest
  blurDraw(g, [980, 390, 1170, 475], 10, (c) => { c.fillStyle = grey(0.93, 0.75); c.beginPath(); c.ellipse(1072, 447, 85, 24, 0, 0, TAU); c.fill(); });
});

LAYERS.push(function laptop(g) {
  const lid = [[914, 448], [1083, 448], [1112, 521], [914, 521]];
  fill(g, lid, "#020202");
  ink(g, [[914, 449], [1083, 448.5], [1112, 521]], 2.3, grey(0.88), { seed: 1120, ends: 0.8, jit: 0.1 });
  ink(g, [[914.5, 450], [914.5, 520]], 1, grey(0.35), { seed: 1121 });
  dot(g, 1010, 491, 9, grey(0.97));
});
// ======================================================================================
// THE DESIGNER — trousers (baggy cargo, grey, painted with fold strokes) and boots
// ======================================================================================
// Cloth as carved fold planes (the source's trousers at 3.3–7x: each fold plane is filled with long, straight,
// broken white strokes in one direction, their width following the light; dark creases between the planes).
// facets: { pts, ang, v | vq(u, v) over the facet's bbox, per }. Facets are clipped to the outline and softly
// overlap in paint order.
function facetCarve(g, outline, facets, { seed = 1, per = 3.6, creases = [], edgeV = 0.06 } = {}) {
  fill(g, S(outline, false), grey(0.04));
  g.save(); g.beginPath(); polyPath(g, outline); g.clip();
  facets.forEach((f, i) => {
    const bb = bboxOf(f.pts);
    const vf = f.vq ? (x, y) => f.vq((x - bb[0]) / (bb[2] - bb[0] || 1), (y - bb[1]) / (bb[3] - bb[1] || 1)) : null;
    carve(g, S(f.pts, !!f.smooth), { ang: f.ang, v: f.v ?? 0.5, vf, per: f.per || per, seed: seed + i * 13, wExp: 0.62, jit: 0.3, wj: 0.35, bj: 0.25,
      wav: 0.12, wavL: 60, sw: 0.45, swL: 14, brk: 0.55, brkL: 18, streak: 0.35, stL: 20, bg: 0.1, soft: 1.3, maxCov: 0.9 });
  });
  g.restore();
  for (const [pts, w] of creases) ink(g, pts, w, grey(0.03, 0.95), { smooth: true, ends: 0.15, jit: 0.25, seed: seed + Math.round(pts[0][0]) });
  ink(g, outline, 1.4, "#030303", { closed: true, seed: seed + 99, jit: 0.25 });
}
const LEGL = [[937, 553], [981, 551], [1014, 583], [1028, 619], [1036, 633], [1039, 683], [1061, 727], [1055, 750], [1066, 777], [1058, 797], [1030, 800], [990, 793], [955, 792], [944, 781], [947, 758], [931, 752], [925, 730], [926, 691], [930, 647], [931, 591], [933, 560]];
const LEGR = [[1170, 560], [1200, 555], [1227, 555], [1257, 560], [1274, 586], [1278, 610], [1289, 635], [1289, 690], [1269, 706], [1255, 712], [1251, 747], [1245, 768], [1230, 786], [1200, 794], [1150, 796], [1127, 790], [1124, 759], [1130, 729], [1142, 704], [1153, 665], [1160, 622]];
const LAP = [[1000, 550], [1178, 550], [1172, 590], [1160, 622], [1153, 648], [1100, 646], [1039, 650], [1028, 619], [1014, 583]];
LAYERS.push(function trousers(g) {
  const study = (base, polys, lines) => (v) => {
    v.fillStyle = grey(base); v.fillRect(900, 540, 420, 270);
    for (const [pts, val, b] of polys) fillSoft(v, S(pts, true), grey(val), (b ?? 3) * 0.5);
    for (const [pts, w, val, b] of lines) softLine(v, pts, w, grey(val), (b ?? 3) * 0.6);
  };
  const cloth = (outline, vp, guides, box, seed, creases) => {
    fill(g, S(outline, false), grey(0.05));
    const ang = guideField(guides, box, 4);
    // painted ground with a faint flowing texture, then long thin strokes along the folds (bright on the lit planes,
    // dark between), then the creases
    licPaint(g, S(outline, false), { vp, vblur: 1, ang, L: 30, density: 0.25, amp: 0.4, seed, cell: 4 });
    clothPaint(g, S(outline, false), { vp, vblur: 1, ang, per: 5, seed: seed + 1, base: false, segL: [14, 44], gapL: [3, 12], hiW: [1.3, 3], dkW: [1.1, 2.4], hiP: 0.55, hiK: 1.15, hiB: 0.1, dens: 1.0 });
    for (const [pts, w] of creases) { ink(g, pts, w * 1.5, grey(0.03, 0.9), { smooth: true, ends: 0.15, jit: 0.2, seed: seed + Math.round(pts[0][0]) }); ink(g, pts.map(([x, y]) => [x, y - w * 1.4]), w * 0.6, grey(0.85, 0.7), { smooth: true, ends: 0.2, jit: 0.2, seed: seed + 7 + Math.round(pts[0][0]) }); }
    ink(g, outline, 1.4, "#040404", { closed: true, seed: seed + 99, jit: 0.2 });
  };
  cloth(LAP, (v) => { v.fillStyle = grey(0.07); v.fillRect(995, 548, 190, 120); softLine(v, [[1060, 610], [1100, 630], [1150, 640]], 14, grey(0.22), 6); softLine(v, [[1100, 570], [1150, 600]], 10, grey(0.16), 5); },
    [[[1170, 560], [1120, 600], [1060, 640]], [[1030, 560], [1040, 600], [1050, 650]]], [990, 545, 1185, 670], 1200, []);
  cloth(LEGL, study(0.27, [
    [[[935, 628], [955, 632], [1000, 670], [1050, 716], [1052, 734], [1030, 740], [990, 712], [950, 668], [935, 650]], 0.66, 4],
    [[[962, 660], [990, 676], [1022, 706], [1010, 716], [985, 700], [966, 680]], 0.88, 2.5],
    [[[945, 745], [1005, 726], [1050, 722], [1052, 742], [1010, 750], [955, 762]], 0.8, 3],
    [[[1030, 752], [1048, 760], [1055, 790], [1040, 792], [1028, 770]], 0.78, 3],
    [[[955, 700], [985, 705], [982, 735], [958, 732]], 0.06, 3],
    [[[924, 560], [936, 560], [936, 700], [924, 700]], 0.12, 3],
    [[[1026, 600], [1040, 610], [1044, 690], [1032, 690]], 0.1, 3],
    [[[1000, 598], [1022, 596], [1026, 640], [1006, 648]], 0.46, 3],
  ], [
    [[[948, 575], [962, 600], [975, 625]], 9, 0.44], [[[975, 568], [992, 598], [1006, 625]], 8, 0.42], [[[1004, 585], [1016, 612]], 6, 0.38],
    [[[930, 740], [955, 752]], 10, 0.6], [[[945, 775], [990, 780], [1030, 790]], 8, 0.5], [[[950, 585], [958, 625]], 5, 0.12, 2],
  ]), [[[945, 565], [975, 610], [1005, 655], [1040, 705]], [[932, 600], [960, 650], [990, 700]], [[975, 560], [1000, 600], [1025, 640]], [[945, 725], [1000, 718], [1055, 728]], [[950, 752], [1000, 745], [1055, 742]], [[950, 780], [1000, 782], [1055, 790]]], [915, 545, 1075, 805], 1210,
    [[[[968, 700], [1000, 722], [1040, 735]], 1.4], [[[958, 742], [1000, 748], [1048, 750]], 1.8], [[[955, 772], [1000, 768], [1050, 770]], 1.3]]);
  // right leg: light structure read off the plate's sigma-3 level map (the shin plane is a bright triangle with
  // its apex at (1212, 678), a lit ridge runs down-left from the pocket, the cuff folds at y ~760)
  cloth(LEGR, study(0.38, [
    [[[1128, 668], [1150, 664], [1150, 720], [1128, 724]], 0.03, 4],
    [[[1150, 772], [1245, 770], [1240, 796], [1150, 798]], 0.3, 3],
  ], [
    // fold ridges read off the plate (sigma-3 values 0.6–0.9 on a 0.3–0.4 ground)
    [[[1180, 672], [1168, 690], [1158, 706]], 16, 0.78, 3], [[[1214, 684], [1204, 708], [1192, 728], [1180, 742]], 20, 0.95, 3],
    [[[1238, 648], [1246, 672], [1254, 690], [1262, 702]], 10, 0.78, 3], [[[1238, 730], [1242, 748], [1244, 762]], 10, 0.9, 3],
    [[[1162, 744], [1150, 752], [1140, 762]], 10, 0.72, 3], [[[1224, 744], [1218, 754]], 8, 0.65, 3], [[[1175, 640], [1188, 660], [1192, 672]], 10, 0.52, 3],
    [[[1188, 592], [1200, 608]], 12, 0.48, 4], [[[1226, 615], [1238, 628]], 10, 0.52, 3], [[[1256, 596], [1256, 700]], 4, 0.1, 2],
  ]), [[[1245, 575], [1215, 620], [1185, 665], [1150, 720]], [[1225, 600], [1200, 650], [1175, 700], [1150, 745]], [[1245, 640], [1225, 690], [1205, 740]], [[1140, 752], [1190, 748], [1245, 742]], [[1140, 780], [1195, 782], [1245, 778]], [[1262, 600], [1272, 650], [1280, 700]]], [1115, 545, 1300, 805], 1230,
    [[[[1256, 596], [1256, 650], [1244, 702]], 1.6], [[[1185, 760], [1212, 758], [1240, 762]], 1.8], [[[1160, 782], [1200, 778], [1235, 774]], 1.2], [[[1200, 662], [1180, 700], [1165, 725]], 1.3]]);
  edge(g, [[1254, 592], [1289, 628], [1290, 690], [1270, 705], [1256, 705]], 1.5, 0.8, 1250);
});

// the chunky boots (measured at 5x): a lit toe cap, a darker vamp and side, tongue with a tab, white lace bow and
// crossings, a pale lugged sole (serrated bottom edge, vertical grooves)
function soleLugs(g, top, bot, n, seed, v = 0.5) {
  // top: polyline of the rand's top edge; bot: y of the lug tips per x (function); a pale band with teeth
  const r = rng(seed), pts = [...top];
  const x0 = top[top.length - 1][0], x1 = top[0][0];
  for (let i = 0; i <= n * 2; i++) { const x = lerp(x0, x1, i / (n * 2)); pts.push([x, bot(x) - (i % 2 ? 0 : 3.5 + r() * 2)]); }
  fill(g, S(pts, false), grey(v));
  carve(g, S(pts, false), { ang: PI / 2 + 0.04, v: v * 0.85, per: 3.6, seed, bg: 0.15, wExp: 0.9, jit: 0.3, streak: 0.4, over: true, alpha: 0.9, lum: 1 });
  const rl = rng(seed + 3);
  for (let i = 1; i < n * 2; i += 2) { const x = lerp(x0, x1, i / (n * 2)) + (rl() - 0.5) * 2; ink(g, [[x, bot(x) - 6 - rl() * 6], [x + 0.5, bot(x)]], 1.3 + rl() * 0.8, grey(0.08, 0.9), { seed: seed + i }); }
  ink(g, pts, 1.3, "#040404", { closed: true, seed: seed + 50, jit: 0.2 });
  ink(g, top, 1.6, grey(0.97), { smooth: true, seed: seed + 51, ends: 0.5 });
}
function laceLine(g, pts, w = 2.2) { ink(g, pts, w + 1.8, "#040404", { smooth: true, seed: pts[0][0], ends: 0.7, jit: 0.1 }); ink(g, pts, w, grey(0.93), { smooth: true, seed: pts[0][0] + 1, ends: 0.55, jit: 0.1 }); }
LAYERS.push(function boots(g) {
  const paintPart = (pts, v, ang, seed, o = {}) => { fill(g, S(pts, o.smooth ?? true), grey(v * 0.5)); clothPaint(g, S(pts, o.smooth ?? true), { vp: (c) => { c.fillStyle = o.grad ? lgrad(c, ...o.grad, [[0, v * (o.k0 ?? 1.2)], [1, v * (o.k1 ?? 0.7)]]) : grey(v); c.fillRect(890, 750, 380, 150); }, ang, per: 3.2, seed, segL: [8, 22], gapL: [2, 6], hiW: [0.7, 1.3], baseK: 0.9 }); ink(g, pts, 1.2, "#040404", { closed: true, smooth: o.smooth ?? true, seed: seed + 1, jit: 0.2 }); };
  // ---- left boot ----
  paintPart([[933, 792], [985, 784], [1030, 790], [1052, 800], [1060, 822], [1060, 850], [1005, 856], [960, 850], [930, 830]], 0.28, 1.3, 1300);
  paintPart([[1004, 800], [1040, 796], [1058, 806], [1062, 850], [1008, 856]], 0.22, 1.2, 1302, { grad: [1004, 800, 1062, 856] });
  paintPart([[905, 847], [912, 833], [935, 827], [960, 829], [980, 839], [990, 857], [960, 861], [920, 861]], 0.72, 0.1, 1304, { grad: [905, 822, 990, 856], k0: 1.1, k1: 0.75 });
  paintPart([[974, 775], [990, 771], [1008, 773], [1010, 792], [976, 794]], 0.42, 0.05, 1306);
  fill(g, S([[981, 777], [994, 776], [995, 785], [981, 786]], true), grey(0.25)); ink(g, [[981, 777], [994, 776], [995, 785], [981, 786]], 1.1, grey(0.8), { closed: true, smooth: true, seed: 1308 });
  soleLugs(g, [[999, 851], [980, 847], [960, 845], [930, 845], [908, 851], [902, 861]], (x) => 877 + (x - 900) * 0.04, 9, 1310);
  soleLugs(g, [[1062, 849], [1040, 849], [1018, 853]], (x) => 872, 5, 1312, 0.56);
  softEll(g, 916, 864, 16, 13, 0, "rgba(8,8,8,0.8)", 4);
  for (const pts of [[[963, 800], [955, 796], [952, 802], [960, 808], [975, 804], [982, 796]], [[982, 796], [996, 792], [1012, 794], [1018, 800], [1008, 806], [992, 800]],
    [[950, 818], [965, 812], [990, 812]], [[955, 826], [975, 822], [1000, 820]], [[948, 810], [960, 822]], [[985, 800], [980, 812], [972, 826]], [[992, 802], [996, 814]]]) laceLine(g, pts);
  fill(g, [[984, 794], [990, 794], [990, 800], [984, 800]], grey(0.9));
  // ---- right boot ----
  paintPart([[1127, 800], [1165, 790], [1200, 790], [1230, 800], [1240, 830], [1195, 846], [1150, 848], [1126, 836]], 0.14, 1.6, 1320);
  paintPart([[1121, 790], [1165, 782], [1168, 800], [1126, 810]], 0.72, 0.1, 1322, { grad: [1121, 782, 1168, 810], k0: 1.15, k1: 0.8 });
  paintPart([[1205, 776], [1230, 790], [1238, 805], [1228, 808], [1205, 796]], 0.6, 1.0, 1324);
  paintPart([[1168, 851], [1190, 839], [1225, 839], [1243, 853], [1243, 863], [1170, 863]], 0.78, 0.05, 1326, { grad: [1168, 834, 1243, 858], k0: 1.1, k1: 0.8 });
  paintPart([[1164, 774], [1180, 769], [1198, 771], [1201, 792], [1165, 794]], 0.42, 0.05, 1328);
  fill(g, S([[1182, 777], [1193, 776], [1194, 783], [1182, 784]], true), grey(0.3)); ink(g, [[1182, 777], [1193, 776], [1194, 783], [1182, 784]], 1.1, grey(0.8), { closed: true, smooth: true, seed: 1330 });
  soleLugs(g, [[1247, 855], [1230, 861], [1200, 863], [1170, 863], [1150, 857], [1130, 851], [1117, 853]], (x) => x < 1150 ? 878 : 883, 11, 1332);
  softEll(g, 1136, 866, 20, 13, 0, "rgba(8,8,8,0.75)", 4);
  for (const pts of [[[1168, 800], [1158, 796], [1150, 800], [1152, 812], [1170, 806]], [[1190, 800], [1206, 794], [1222, 798], [1220, 808], [1205, 810], [1192, 802]],
    [[1150, 820], [1170, 814], [1196, 816]], [[1160, 830], [1185, 824], [1210, 826]], [[1178, 802], [1170, 816], [1160, 830]], [[1192, 804], [1200, 818], [1210, 830]], [[1172, 836], [1190, 832]]]) laceLine(g, pts);
  fill(g, [[1176, 797], [1183, 797], [1183, 803], [1176, 803]], grey(0.9));
});

// ======================================================================================
// RIGHT: the carton towers, headphones on top, the small monitor, the upright synth, the right speaker, flight
// case, backpack, magazines, plant, floor gear (measured on 2.1–3.5x tiles)
// ======================================================================================
LAYERS.push(function rightBack(g) {
  // tall back stack behind the counter (far right), its lit lower part
  carve(g, null, { q: [[1830, 60], [1899, 60], [1899, 225], [1830, 225]], vq: (u, v) => lerp(0.01, 0.09, v) * lerp(0.6, 1.2, u), per: 5, seed: 1400 });
  carve(g, null, { q: [[1876, 225], [1942, 225], [1942, 406], [1876, 406]], vq: (u, v) => lerp(0.2, 0.34, v) * lerp(0.7, 1.1, u), per: 4.6, seed: 1401 });
  carve(g, null, { q: [[1830, 225], [1876, 225], [1876, 406], [1830, 406]], v: 0.08, per: 5, seed: 1402 });
  // dark box behind the counter (outlined) and the dark face behind the plant
  fill(g, [[1899, 92], [2166, 92], [2166, 225], [1899, 225]], "#030303");
  edge(g, [[2100, 106], [2166, 106], [2166, 221]], 1, 0.3, 1403);
  edge(g, [[1942, 225], [2080, 225]], 1, 0.35, 1404);
  // the top carton with the headphones on it (measured at 3x): a lit striped front whose top edge rises to the
  // right, a dark right face
  const t1 = [[1600, 285], [1722, 251], [1722, 339], [1600, 350]];
  carve(g, null, { q: t1, vq: (u, v) => lerp(0.4, 0.33, u) * lerp(0.85, 1.05, v), per: 4.6, seed: 1405 });
  edge(g, [t1[0], t1[1]], 1.3, 0.8, 1406); edge(g, [t1[1], t1[2]], 1.2, 0.85, 1407);
  fill(g, [[1637, 290], [1662, 284], [1662, 306], [1637, 312]], grey(0.25));
  fill(g, [[1722, 251], [1795, 257], [1795, 339], [1722, 339]], "#060606"); edge(g, [[1722, 251], [1795, 257]], 1, 0.35, 1408);
  // headphones lying on the carton (measured at 6x): one cup seen from the side — a dark disc with a lit rim arc,
  // the ribbed cushion to its left (short white dashes), the band's lit arcs to the right, a cable beyond
  g.save(); g.translate(1678, 238);
  g.fillStyle = grey(0.03); g.beginPath(); g.ellipse(0, 0, 22, 23, 0, 0, TAU); g.fill();
  g.strokeStyle = grey(0.5); g.lineWidth = 1.8; g.beginPath(); g.ellipse(0, 0, 20, 21, 0, PI * 0.55, PI * 1.4); g.stroke();
  g.strokeStyle = grey(0.25); g.lineWidth = 1.2; g.beginPath(); g.ellipse(2, 0, 14, 16, 0, PI * 0.6, PI * 1.3); g.stroke();
  g.restore();
  fill(g, S([[1636, 222], [1660, 216], [1664, 258], [1640, 258]], true), grey(0.04));
  for (let i = 0; i < 7; i++) { const y = 225 + i * 4.6; ink(g, [[1646.5, y], [1650, y + 1]], 1.4, grey(0.75), { seed: 1411 + i }); }
  ink(g, [[1634, 252], [1632, 238], [1638, 226]], 1.2, grey(0.3, 0.9), { smooth: true, seed: 1418 });
  for (const [pts, v] of [[[[1702, 226], [1712, 216], [1730, 212], [1742, 216]], 0.4], [[[1704, 238], [1716, 228], [1734, 226]], 0.3], [[[1722, 252], [1732, 244], [1750, 240]], 0.28]])
    ink(g, pts, 1.4, grey(v, 0.9), { smooth: true, seed: pts[0][0] });
  ink(g, [[1745, 238], [1756, 234], [1770, 236]], 1.3, grey(0.32, 0.9), { smooth: true, seed: 1419 });
  // cables hanging over the dark faces in smooth loops (measured at 4x): thin dark tubes seen by a lit edge
  for (const [pts, w, v] of [
    [[[1788, 244], [1800, 290], [1812, 330], [1834, 348], [1852, 320], [1860, 280], [1876, 250]], 3.4, 0.5],
    [[[1800, 250], [1806, 298], [1822, 334], [1846, 342], [1858, 300], [1866, 262]], 3, 0.38],
    [[[1812, 246], [1830, 262], [1846, 300], [1848, 330]], 2.8, 0.34],
    [[[1882, 252], [1862, 300], [1846, 350], [1830, 386], [1818, 408]], 3.2, 0.5],
    [[[1812, 342], [1812, 372], [1812, 406]], 2.4, 0.45],
    [[[1792, 250], [1784, 290], [1786, 330], [1800, 346], [1812, 342]], 2.8, 0.3],
    [[[1840, 256], [1852, 300], [1874, 350], [1880, 400]], 2.8, 0.3],
  ]) cable(g, pts, w, Math.round(pts[0][0] + pts[0][1]), v, { hw: 0.4, off: 0.35 });
  // second carton (lit striped), its dark right face
  carve(g, null, { q: [[1620, 335], [1687, 331], [1687, 430], [1620, 432]], vq: (u, v) => 0.43, per: 4.4, seed: 1420 });
  fill(g, [[1687, 331], [1812, 331], [1812, 408], [1687, 408]], "#050505"); edge(g, [[1687, 331], [1812, 331]], 1, 0.35, 1421);
  edge(g, [[1620, 335], [1687, 331]], 1.2, 0.8, 1422);
  // third carton (lit, slanted top), dark right face with a grey panel
  const t3 = [[1589, 437], [1724, 407], [1724, 560], [1589, 560]];
  carve(g, null, { q: t3, vq: (u, v) => lerp(0.48, 0.42, u) * lerp(1, 0.8, v), per: 4.6, seed: 1423 });
  edge(g, [t3[0], t3[1]], 1.3, 0.8, 1424);
  fill(g, [[1724, 407], [1860, 407], [1860, 490], [1724, 490]], "#050505"); edge(g, [[1724, 407], [1860, 407]], 1, 0.4, 1425);
  fill(g, [[1805, 412], [1845, 412], [1845, 443], [1805, 443]], grey(0.28)); edge(g, [[1805, 412], [1845, 412], [1845, 443], [1805, 443]], 1, 0.5, 1426, { closed: true });
  // the carton between the speaker and the synth
  carve(g, null, { q: [[1603, 532], [1649, 532], [1649, 766], [1603, 766]], vq: VG(0.4, 0.06, 0.8), per: 4.2, seed: 1427 });
  // far right: the dark box, the lit carton fronts under the plant
  fill(g, [[1830, 410], [1904, 410], [1904, 449], [1830, 449]], "#050505"); edge(g, [[1830, 410], [1904, 410], [1904, 449]], 1, 0.4, 1436);
  const c4 = [[1933, 377], [2085, 332], [2085, 453], [1933, 453]];
  carve(g, null, { q: c4, vq: (u, v) => lerp(0.35, 0.4, u) * lerp(0.9, 1.1, v), per: 4.6, seed: 1437 });
  edge(g, [c4[0], c4[1]], 1.3, 0.8, 1438); edge(g, [c4[1], c4[2]], 1.2, 0.7, 1439);
  carve(g, null, { q: [[1933, 453], [2090, 453], [2090, 548], [1933, 548]], vq: VG(0.42, 0.34), per: 4.6, seed: 1440 });
  edge(g, [[1933, 453], [2090, 453]], 1.2, 0.8, 1441);
  fill(g, [[2109, 340], [2156, 340], [2156, 363], [2109, 363]], grey(0.12)); edge(g, [[2109, 340], [2156, 340], [2156, 363], [2109, 363]], 1, 0.35, 1442, { closed: true });
  fill(g, [[2128, 458], [2171, 458], [2171, 491], [2128, 491]], grey(0.1));
  // the right plant (measured at 3.4x): a pot on the carton's top (rim y 290), a mound of big pothos leaves above
  // it, a vine trailing down the lit carton's front
  const pot = [[2082, 282], [2168, 280], [2162, 330], [2088, 330]];
  fill(g, pot, grey(0.1)); g.save(); g.beginPath(); polyPath(g, pot); g.clip();
  g.fillStyle = lgrad(g, 2082, 0, 2168, 0, [[0, 0.1], [0.25, 0.38], [0.45, 0.5], [0.75, 0.25], [1, 0.08]]); g.fillRect(2080, 278, 90, 54);
  carve(g, pot, { ang: 0.03, v: 0.18, per: 3.4, seed: 1443, over: true, alpha: 0.7, streak: 0.6 }); g.restore(); dark(g, pot, 1.1, 1444, { closed: true });
  g.fillStyle = grey(0.35); g.beginPath(); g.ellipse(2125, 282, 43, 3.5, -0.02, 0, TAU); g.fill();
  edge(g, [[2085, 330.5], [2170, 330.5]], 1.2, 0.7, 1445);
  curve(g, [[2090, 288], [2060, 296], [2040, 330], [2042, 380], [2052, 440]], 1.1, grey(0.3, 0.7), { seed: 1449 });
  // leaves spread over and round the pot, most hanging tip-down (measured positions of the leaf blades), then the
  // vine's leaves down the carton
  const LV = [[2050, 225, 2.2, 26], [2083, 200, 1.9, 26], [2120, 198, 1.4, 24], [2156, 210, 1.1, 26], [2176, 236, 1.3, 24], [2112, 240, 1.62, 34],
    [2146, 246, 1.35, 30], [2070, 244, 1.9, 28], [2040, 252, 2.5, 26], [2092, 262, 1.75, 26], [2160, 276, 1.4, 22], [2030, 268, 2.1, 24],
    [2036, 300, 1.9, 28], [2058, 330, 1.6, 30], [2040, 360, 1.8, 30], [2062, 392, 1.45, 28], [2050, 422, 1.6, 22]];
  LV.forEach(([x, y, a, sz], i) => leaf(g, x, y, a, sz * 1.1, (y < 250 ? 0.62 : 0.8) - (i % 3) * 0.08, 1450 + i * 3));
});

LAYERS.push(function rightMid(g) {
  // the small tall monitor behind the lamp: dark cabinet, a white driver ring, rack devices below, a thin stand
  fill(g, [[1562, 359], [1596, 356], [1596, 542], [1562, 542]], "#060606");
  carve(g, [[1562, 359], [1596, 356], [1596, 455], [1562, 455]], { ang: PI / 2, v: 0.14, per: 3.4, seed: 1500, over: true });
  edge(g, [[1564, 360], [1564, 540]], 1.1, 0.5, 1501); edge(g, [[1562, 359], [1596, 356]], 1.1, 0.6, 1502);
  ring(g, 1587, 410, 8.5, 2.2, grey(0.8)); dot(g, 1587, 410, 6, grey(0.08));
  for (let i = 0; i < 4; i++) { const y = 462 + i * 20; ink(g, [[1564, y], [1594, y]], 1, grey(0.4, 0.8), { seed: 1503 + i }); for (let k = 0; k < 3; k++) dot(g, 1570 + k * 9, y + 9, 2, grey(0.6)); }
  ink(g, [[1539, 480], [1569, 369]], 2.2, grey(0.3), { seed: 1510 }); ink(g, [[1538, 481], [1568, 370]], 0.9, grey(0.6, 0.8), { seed: 1511 });
  // lamp's lower arm to its base on the right
  ink(g, [[1489, 412], [1505, 449]], 3, grey(0.2), { seed: 1512 });
});

LAYERS.push(function uprightSynth(g) {
  // the synth standing on end, its front turned a little toward us at the bottom: every part is placed in the face's
  // own (u, v) through the measured quad (top 1662,457 – 1756,444; bottom 1628,748 – 1756,748)
  const Q = [[1664, 457], [1757, 444], [1741, 752], [1641, 752]], at = (u, v) => bil(Q, u, v);
  const quad = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  fill(g, Q, "#050505");
  edge(g, [Q[0], Q[1]], 1.4, 0.75, 1520);
  // left column: small oval knobs; panel strip of jacks and small knobs
  for (let i = 0; i < 22; i++) { const [x, y] = at(0.09, 0.05 + i * 0.043); g.fillStyle = grey(0.85); g.beginPath(); g.ellipse(x, y, 3.3, 1.8, -0.2, 0, TAU); g.fill(); }
  const P2q = quad(0.2, 0.2, 0.48, 1);
  fill(g, P2q, grey(0.22)); carve(g, P2q, { ang: 0.1, v: 0.26, per: 2.8, seed: 1521, over: true });
  for (let i = 0; i < 17; i++) { const [x, y] = at(0.28, 0.24 + i * 0.045); knob(g, x, y, 3.2, { lit: 0.6 }); const [x2, y2] = at(0.4, 0.26 + i * 0.045); knob(g, x2, y2, 2.8, { lit: 0.5 }); }
  dark(g, [at(0.2, 0.2), at(0.2, 1)], 1.2, 1522); dark(g, [at(0.48, 0.2), at(0.48, 1)], 1.2, 1523);
  // top panels: two knob panels
  const pA = quad(0.2, 0.0, 0.48, 0.19), pB = quad(0.48, 0.0, 1, 0.2);
  fill(g, pA, grey(0.3)); carve(g, pA, { ang: 0.1, v: 0.3, per: 2.8, seed: 1524, over: true });
  fill(g, pB, grey(0.35)); carve(g, pB, { ang: 0.05, v: 0.35, per: 2.8, seed: 1525, over: true });
  for (const [u, v, r] of [[0.28, 0.05, 4], [0.4, 0.05, 4], [0.28, 0.13, 4], [0.4, 0.13, 4]]) { const [x, y] = at(u, v); knob(g, x, y, r, { lit: 0.6 }); }
  for (const [u, v] of [[0.6, 0.075], [0.82, 0.065], [0.56, 0.15], [0.78, 0.145]]) { const [x, y] = at(u, v); knob(g, x, y, 6, { lit: 0.8, cap: 0.05 }); ring(g, x, y, 6, 1, grey(0.7), 3.3, 5.5); }
  dark(g, pA, 1.2, 1526, { closed: true }); dark(g, pB, 1.2, 1527, { closed: true });
  // the keyboard: white keys as horizontal bars, black-key stubs from the left
  const nk = 22, K = quad(0.5, 0.21, 1, 1);
  fill(g, K, grey(0.04));
  for (let i = 0; i < nk; i++) { const v0 = 0.21 + (i + 0.08) / nk * 0.79, v1 = 0.21 + (i + 0.92) / nk * 0.79; const kv = lerp(1, 0.85, v0); fill(g, [at(0.52, v0), at(1, v0), at(1, v1), at(0.52, v1)], lgrad(g, 1700, 0, 1756, 0, [[0, 0.7 * kv], [0.5, 0.92 * kv], [1, 0.8 * kv]])); }
  for (let i = 0; i < nk - 1; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) { const vv = 0.21 + (i + 1) / nk * 0.79, w = 0.28 / nk * 0.79; fill(g, [at(0.5, vv - w), at(0.8, vv - w), at(0.8, vv + w), at(0.5, vv + w)], grey(0.03)); }
  // right cheek: a white edge, dark wood with a lit line
  carve(g, null, { q: [[1757, 444], [1799, 450], [1792, 760], [1741, 752]], v: 0.05, per: 4, seed: 1528 });
  edge(g, [[1757, 446], [1742, 750]], 2.4, 0.75, 1529); edge(g, [[1770, 450], [1760, 754]], 1.1, 0.4, 1530);
  // patch cables looping from the jacks down to the floor
  for (const [v, dx, sd] of [[0.55, -30, 1], [0.7, -50, 2], [0.82, -24, 3]]) { const [x, y] = at(0.3, v); cable(g, [[x, y], [x - 12, y + 20], [x + dx, y + 60], [x + dx - 10, y + 110]], 3, 1531 + sd, 0.45); }
});

LAYERS.push(function speakerRight(g) {
  // books on top
  book(g, [[1503, 551], [1599, 551], [1600, 565], [1503, 566]], { v: 0.8, seed: 1540 });
  book(g, [[1500, 565], [1602, 565], [1603, 576], [1500, 577]], { v: 0.7, seed: 1542 });
  // cabinet: wooden front with vertical grain, lit at its top-left and left edge
  woodPaint(g, [[1491, 576], [1612, 576], [1612, 845], [1491, 845]], (u, v) => (0.24 + 0.05 * Math.sin(u * 11)) * lerp(1.15, 0.75, v) * lerp(1.1, 1.05, u), { seed: 1543 });
  edge(g, [[1491, 576], [1612, 576]], 1.4, 0.8, 1544); edge(g, [[1492, 577], [1492, 845]], 1.6, 0.7, 1545); dark(g, [[1612, 576], [1612, 845]], 1.4, 1546);
  // tweeter, woofer, port
  dot(g, 1553, 612, 17, grey(0.03)); ring(g, 1553, 612, 16, 2, grey(0.4)); ring(g, 1553, 612, 10, 1.2, grey(0.18)); fillSoft(g, ELL(1555, 608, 4, 3.2), grey(0.8), 1.2);
  woofer(g, 1551, 687, 48, 1547);
  dot(g, 1551, 766, 18, grey(0.03)); ring(g, 1551, 766, 17, 1.6, grey(0.35));
});

LAYERS.push(function rightLow(g) {
  // the flight case right of the synth (measured at 3x): black, an aluminium frame — top rail, middle rail with a
  // butterfly latch and clamp blocks, corner brackets with bolts, posts — and a handle on top
  fill(g, [[1792, 510], [1970, 510], [1970, 763], [1792, 763]], "#040404");
  // aluminium bars: dark with a bright highlight streak along them and a thinner second one (measured at 3x)
  const bar = (q, dir, seed, v = 0.34) => {
    fill(g, q, grey(0.08));
    const [A, B, C, D] = q, h = dir === "h";
    const line = (t, w, val) => { const p0 = h ? P2(A, D, t) : P2(A, B, t), p1 = h ? P2(B, C, t) : P2(D, C, t); ink(g, [p0, p1], w, grey(val), { seed: seed + Math.round(t * 100), ends: 0.85, jit: 0.35 }); };
    line(0.32, h ? (D[1] - A[1]) * 0.28 : (B[0] - A[0]) * 0.28, v * 1.7); line(0.72, 1, v); dark(g, q, 1, seed + 1, { closed: true });
  };
  bar([[1852, 512], [1919, 512], [1919, 522], [1852, 522]], "h", 1560, 0.55);
  bar([[1799, 525], [1965, 525], [1965, 539], [1799, 539]], "h", 1562);
  bar([[1792, 574], [1965, 574], [1965, 599], [1792, 599]], "h", 1564, 0.55);
  bar([[1799, 525], [1819, 525], [1819, 652], [1799, 652]], "v", 1566, 0.55);
  bar([[1945, 525], [1965, 525], [1965, 642], [1945, 642]], "v", 1568, 0.5);
  bar([[1954, 600], [1970, 600], [1970, 763], [1954, 763]], "v", 1569, 0.18);
  for (const [x0, y0, bx, by] of [[1799, 524, 1809, 532], [1942, 524, 1956, 532]]) { fill(g, [[x0, y0], [x0 + 26, y0], [x0 + 26, y0 + 8], [x0 + 8, y0 + 28], [x0, y0 + 28]], grey(0.55)); dark(g, [[x0, y0], [x0 + 26, y0], [x0 + 26, y0 + 8], [x0 + 8, y0 + 28], [x0, y0 + 28]], 1, x0, { closed: true }); dot(g, bx, by, 3, grey(0.1)); ring(g, bx, by, 3, 1, grey(0.7)); }
  for (const x0 of [1792, 1944]) { fill(g, [[x0, 571], [x0 + 30, 571], [x0 + 30, 603], [x0, 603]], grey(0.3)); carve(g, [[x0, 571], [x0 + 30, 571], [x0 + 30, 603], [x0, 603]], { ang: 0, v: 0.3, per: 3, seed: x0, over: true }); dark(g, [[x0, 571], [x0 + 30, 571], [x0 + 30, 603], [x0, 603]], 1.1, x0 + 2, { closed: true }); dot(g, x0 + 8, 580, 1.5, grey(0.8)); dot(g, x0 + 22, 594, 1.5, grey(0.8)); }
  fill(g, S([[1902, 569], [1932, 569], [1932, 615], [1902, 615]], false), grey(0.3));
  ink(g, [[1903, 570], [1931, 570], [1931, 614], [1903, 614]], 1.6, grey(0.75), { closed: true, seed: 1571 });
  carve(g, [[1908, 575], [1926, 575], [1926, 609], [1908, 609]], { ang: 0, v: 0.5, per: 3.4, seed: 1572 });
  // the big lit carton in front of it (lower right) and a narrow lit carton at the flight case's right
  carve(g, null, { q: [[1776, 652], [1860, 648], [1860, 832], [1776, 832]], vq: (u, v) => lerp(0.22, 0.52, sstep(0.1, 0.9, u)) * lerp(1, 0.8, v), per: 4.4, seed: 1573 });
  edge(g, [[1776, 652], [1860, 648]], 1.2, 0.8, 1574);
  carve(g, null, { q: [[1830, 649], [1857, 649], [1857, 844], [1830, 844]], vq: UG(0.5, 0.35), per: 4, seed: 1575 });
  // a pale book standing on end against the flight case (front face lit, strokes slanting down-left, a thick dark
  // spine at its right), a dark box under it
  const bk = [[1991, 545], [2062, 541], [2066, 646], [1994, 648]];
  carve(g, bk, { ang: 1.95, vq: null, vf: (x, y) => lerp(0.66, 0.46, (y - 545) / 103), per: 3.2, seed: 1576, streak: 0.5, stL: 14, brk: 0.4, brkL: 12, wav: 0.1 });
  dark(g, bk, 1.3, 1577, { closed: true });
  fill(g, [[2062, 541], [2086, 551], [2084, 610], [2066, 620]], grey(0.08)); edge(g, [[2062, 541], [2086, 551]], 1.1, 0.6, 1578);
  carve(g, null, { q: [[1958, 650], [2000, 650], [2000, 758], [1958, 758]], v: 0.06, per: 4.6, seed: 1579 });
  // the backpack (x 2000–2180, y 610–866), seen from the side: two padded shoulder straps arching from the top left
  // down to the floor at the right, the dark bag between and behind them; straps carry cross stitching and lit edges
  const strap = (C, w, seed, v) => {
    const q = sampleCurve(C, 10), n = q.length, L = [], R = [];
    for (let i = 0; i < n; i++) { const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; L.push([q[i][0] - dy / d * w / 2, q[i][1] + dx / d * w / 2]); R.push([q[i][0] + dy / d * w / 2, q[i][1] - dx / d * w / 2]); }
    const poly = [...L, ...R.reverse()];
    fill(g, poly, grey(0.05));
    clothPaint(g, poly, { vp: (c) => { c.fillStyle = grey(v); c.fillRect(1990, 590, 200, 290); }, ang: 0.06, per: 2.6, seed, segL: [6, 20], gapL: [2, 6], hiP: 0.9, baseK: 0.35 });
    ink(g, L, 1.3, grey(0.7, 0.9), { seed: seed + 1, ends: 0.5 }); ink(g, R.reverse(), 1.1, grey(0.45, 0.8), { seed: seed + 2, ends: 0.5 });
    return q;
  };
  const body = [[2018, 668], [2030, 645], [2060, 628], [2100, 624], [2140, 636], [2168, 668], [2182, 730], [2183, 800], [2178, 864], [2112, 868], [2060, 862], [2030, 820], [2018, 740]];
  fill(g, S(body, true), "#050505");
  clothPaint(g, S(body, true), { vp: (c) => { c.fillStyle = grey(0.12); c.fillRect(2010, 620, 180, 250); softEll(c, 2150, 760, 25, 60, 0, grey(0.2), 12); softEll(c, 2040, 700, 16, 50, 0, grey(0.06), 10); }, ang: 0.06, per: 3, seed: 1590, segL: [8, 26], hiP: 0.8, baseK: 0.5 });
  ink(g, [[2020, 760], [2018, 700], [2030, 648], [2062, 628], [2102, 624]], 1.4, grey(0.55, 0.9), { smooth: true, seed: 1589, ends: 0.3 });
  // the carry handle on top
  curve(g, [[2064, 632], [2080, 612], [2106, 610], [2120, 626]], 3.5, grey(0.05), { seed: 1588 }); curve(g, [[2066, 630], [2081, 613], [2105, 611], [2118, 624]], 1.2, grey(0.5), { seed: 1587 });
  for (const x of [2045, 2066, 2088]) ink(g, [[x, 650], [x + 4, 740], [x + 8, 860]], 1, grey(0.22, 0.8), { smooth: true, seed: x });
  strap([[2112, 632], [2138, 636], [2156, 672], [2166, 740], [2172, 800], [2176, 862]], 20, 1591, 0.2);
  const q1 = strap([[2052, 640], [2076, 626], [2098, 634], [2110, 668], [2118, 730], [2126, 800], [2134, 862]], 24, 1593, 0.24);
  ink(g, [[2072, 660], [2078, 700], [2082, 760]], 1.3, grey(0.4, 0.8), { smooth: true, seed: 1598 });
  for (const [x, y] of [[2114, 690], [2160, 696]]) { fill(g, [[x - 11, y - 9], [x + 11, y - 11], [x + 12, y + 9], [x - 10, y + 11]], grey(0.1)); ink(g, [[x - 11, y - 9], [x + 11, y - 11], [x + 12, y + 9], [x - 10, y + 11]], 1.4, grey(0.55), { closed: true, seed: x }); }
  ink(g, [[2146, 720], [2148, 800], [2146, 860]], 1.2, grey(0.35, 0.8), { smooth: true, seed: 1597 });
  // the magazine stack (x 1905–2085, y 757–855): lit fronts at the left, darker toward the right
  for (let i = 0; i < 6; i++) {
    const y = 758 + i * 16, x0 = 1905 + [8, 0, 6, 2, 8, 4][i], x1 = 2083 - [10, 4, 0, 8, 2, 6][i];
    carve(g, null, { q: [[x0, y], [x1, y - 1], [x1 + 1, y + 16], [x0 - 1, y + 16]], dir: "h", vq: (u, v) => lerp(0.4, 0.14, sstep(0.2, 0.55, u)) * lerp(1, 0.6, v) * (i === 0 ? 0.6 : 1), per: 2.6, seed: 1580 + i * 2, bg: 0.2, streak: 0.5, stL: 30 });
    dark(g, [[x0, y], [x1, y - 1]], 1.2, 1581 + i * 2);
  }
  // floor gear right of the speaker (measured at 3.4x): a dark rack device with a lit top edge, a small white box
  // with a knob, a grey box with a display window, a striped pale box, a pale pedal with a hole, a flat box
  fill(g, [[1638, 757], [1759, 757], [1759, 798], [1638, 798]], "#050505"); edge(g, [[1656, 759], [1733, 759]], 2, 0.8, 1597);
  for (const [x, y] of [[1712, 770], [1722, 780], [1730, 790]]) fill(g, [[x, y], [x + 10, y], [x + 10, y + 3], [x, y + 3]], grey(0.7));
  carve(g, null, { q: [[1603, 765], [1635, 765], [1635, 795], [1603, 795]], dir: "h", v: 0.72, per: 3, seed: 1598, bg: 0.5 }); knob(g, 1620, 776, 4, { lit: 0.5 });
  fill(g, [[1620, 798], [1682, 798], [1682, 853], [1620, 853]], grey(0.28)); carve(g, [[1620, 798], [1682, 798], [1682, 853], [1620, 853]], { ang: PI / 2, v: 0.5, per: 3.2, seed: 1599, over: true, alpha: 0.6 });
  fill(g, [[1629, 809], [1655, 809], [1655, 830], [1629, 830]], grey(0.08)); edge(g, [[1629, 809], [1655, 809], [1655, 830], [1629, 830]], 1.1, 0.7, 1600, { closed: true });
  for (let i = 0; i < 5; i++) knob(g, 1630 + i * 11, 843, 2.4, { lit: 0.5 });
  dark(g, [[1620, 798], [1682, 798], [1682, 853], [1620, 853]], 1.2, 1601, { closed: true });
  carve(g, null, { q: [[1682, 799], [1729, 799], [1729, 851], [1682, 851]], vq: (u, v) => lerp(0.42, 0.2, v), per: 3.6, seed: 1602, streak: 0.5 });
  carve(g, null, { q: [[1750, 824], [1774, 824], [1774, 859], [1750, 859]], v: 0.78, per: 3, seed: 1603, bg: 0.5 }); dot(g, 1761, 843, 3.5, grey(0.04));
  fill(g, [[1774, 824], [1835, 824], [1835, 859], [1774, 859]], grey(0.28)); fill(g, [[1786, 832], [1820, 832], [1820, 852], [1786, 852]], grey(0.08));
  dark(g, [[1750, 824], [1835, 824], [1835, 859], [1750, 859]], 1.2, 1604, { closed: true });
  carve(g, null, { q: [[1530, 855], [1622, 855], [1622, 878], [1530, 878]], dir: "h", vq: BL(0.7, 0.6, 0.45, 0.5), per: 2.8, seed: 1605 });
  dark(g, [[1530, 855], [1622, 855], [1622, 878], [1530, 878]], 1.2, 1606, { closed: true });
  // cables arching over the gear from the synth and the speaker to the floor
  cable(g, [[1560, 760], [1600, 745], [1660, 742], [1720, 760], [1780, 790], [1840, 812]], 4.2, 1607, 0.5);
  cable(g, [[1600, 760], [1640, 745], [1700, 745], [1750, 770], [1800, 820], [1820, 860]], 3.8, 1608, 0.5);
  cable(g, [[1540, 820], [1580, 790], [1640, 770], [1700, 772], [1760, 800]], 3.8, 1609, 0.45);
  cable(g, [[1480, 830], [1530, 800], [1570, 790], [1620, 790]], 3.4, 1610, 0.4);
});

// ======================================================================================
// FLOOR: dark boards, faint seams and scratches running to a vanishing point above the desk
// ======================================================================================
LAYERS.push(function floor(g) {
  // the boards radiate to a vanishing point above the desk; measured row profile (pre-grade): a dark band under the
  // objects at y 880–895 (p98 0.12–0.16), the lit boards at y 900–930 (p90 0.10, p98 0.21), fading to the bottom
  const VX = 1100, VY = 640, r = rng(1700);
  const prof = (y) => y < 878 ? 0.5 : y < 896 ? lerp(0.5, 0.7, (y - 878) / 18) : y < 930 ? 1 : lerp(1, 0.55, (y - 930) / 16);
  g.save(); g.beginPath(); g.rect(0, 862, PW, PH - 862); g.clip();
  for (let i = 0; i < 420; i++) {
    const bx = lerp(-1400, 3600, (i + r() * 0.9) / 420), by = PH + 4;
    const dx = bx - VX, dy = by - VY, t0 = (864 + r() * 26 - VY) / dy;
    let t = t0;
    const lv = (0.12 + 0.28 * Math.pow(r(), 1.5)) * 1.3, wv = 0.6 + r() * 1.1;
    while (t < 1) {
      const L = 0.04 + r() * 0.22, t2 = Math.min(1, t + L);
      if (r() < 0.7) {
        const ym = VY + dy * (t + t2) / 2, near = Math.exp(-(((VX + dx * (t + t2) / 2) - 1120) ** 2) / (2 * 480 * 480));
        ink(g, [[VX + dx * t, VY + dy * t], [VX + dx * t2, VY + dy * t2]], wv, grey(lv * prof(ym) * (0.15 + 1.1 * near), 0.95), { seed: 1701 + i, ends: 0.25, jit: 0.2 });
      }
      t = t2 + 0.01 + r() * 0.08;
    }
  }
  g.restore();
  // cables snaking across the floor at the foot of the gear
  for (const [pts, w, v] of [
    [[[300, 872], [380, 866], [450, 876], [520, 868], [600, 880], [700, 872]], 3, 0.35], [[[640, 886], [720, 874], [790, 884], [860, 878]], 2.6, 0.3],
    [[[1270, 880], [1330, 870], [1400, 882], [1460, 874], [1540, 886], [1600, 876]], 3, 0.35], [[[1560, 866], [1640, 876], [1720, 868], [1800, 878], [1880, 870]], 2.6, 0.32],
    [[[860, 876], [880, 890], [920, 886]], 2.4, 0.3], [[[1250, 884], [1280, 874], [1310, 890]], 2.4, 0.3], [[[180, 876], [240, 884], [300, 876]], 2.4, 0.28],
  ]) cable(g, pts, w, pts[0][0], v);
});

// ======================================================================================
// the DO NOT KNOCK plate, hung crooked on a string (mostly behind the headline's "GHT")
// ======================================================================================
LAYERS.push(function doNotKnock(g) {
  const P = [[603, 186], [818, 164], [826, 271], [611, 293]];
  ink(g, [[606, 188], [663, 154], [815, 166]], 1.1, grey(0.28, 0.8), { seed: 1800 });
  dot(g, 663, 154, 1.8, grey(0.4));
  fill(g, P, "#060606");
  // the plate's thickness at the bottom, a double grey border
  fill(g, [[611, 293], [826, 271], [827, 275], [612, 297]], grey(0.36));
  ink(g, [...P, P[0]], 1.8, grey(0.55), { seed: 1801, ends: 0.8, jit: 0.2 });
  ink(g, [[607, 190], [815, 168], [822, 267], [614, 289], [607, 190]], 0.9, grey(0.3, 0.7), { seed: 1802, jit: 0.2 });
  ring(g, 620, 282, 2.8, 1.2, grey(0.62)); ring(g, 815, 259, 2.8, 1.2, grey(0.62));
  g.save(); g.translate(623, 266); g.rotate(-0.132);
  g.font = "400 30px Geist"; g.fillStyle = grey(0.5); g.letterSpacing = "1.5px";
  g.save(); g.scale(0.78, 1); g.fillText("DO NOT KNOCK.", 0, 0); g.restore();
  g.font = "500 17px Geist"; g.fillStyle = grey(0.3, 0.85); g.letterSpacing = "1px";
  g.save(); g.scale(0.8, 1); g.fillText("MIXING.", 48, -38); g.restore();
  g.letterSpacing = "0px";
  g.restore();
});
