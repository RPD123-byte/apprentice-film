// s05 drawn kit: drawing helpers for the hand-drawn s05 (fix pass 1d). Copied from F1's src/lib/sokoIll.js
// (helpers section: exact gaussian blur, blurDraw, value noise, carve, streams, brushFill, clothPaint, woodPaint,
// licPaint, ink, fills; small parts knob, cable, woofer, softLine, strand) so s05 can use them without editing the
// shared lib. Coordinates are whatever the context's transform says (s05 uses frame px of the settled camera).
import { taper } from "../../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";
export { taper, smoothPath, sampleCurve, rng };

const PI = Math.PI, TAU = PI * 2;
// a device box in page px for value studies painted in page coordinates (identity transform, not clipped to the frame:
// s05's layers reach past it for the camera settle)
function pageDev(bb) { const X0 = Math.floor(bb[0]), Y0 = Math.floor(bb[1]), X1 = Math.ceil(bb[2]), Y1 = Math.ceil(bb[3]); return { m: new DOMMatrix([1, 0, 0, 1, 0, 0]), X0, Y0, X1, Y1, w: X1 - X0, h: Y1 - Y0 }; }

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
    const D = pageDev(bb); const V = valueOf(D, vp, vblur);
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
  const D = pageDev(bb); const V = valueOf(D, vp, vblur);
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
  const D = pageDev(bb); const V = valueOf(D, vp, vblur);
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

// ======================================================================================
// drip(): a lit surface with dark drybrush streaks (s05 fix 1d, for the source's pale cardboard faces: a smooth grey
// face, a soft mottle, and sparse dark vertical streaks that start near the top edge and fade out downward, bunched
// where the face turns away from the light). Evaluated per pixel like carve(); coordinates as carve (o.q + dir, o.ang,
// or o.coord). The face's mean brightness is kept at the target value.
//   per: slot spacing px · dens: share of slots with a streak · w: [min, max] width px · len: [min, max] length (0..1
//   of the face) · b0: [min, max] start (0..1) · dk: [min, max] darkness · mot: mottle amount · motL: mottle scale px ·
//   wav: wander px over wavL px · soft: edge softness px · bias(u, v): extra streak density multiplier (0..2)
// ======================================================================================
function drip(g, sh, o = {}) {
  const { q = null, dir = "v", ang = PI / 2, coord = null, v = 0.5, vq = null, vf = null, per = 9, dens = 0.5, w = [1.2, 3.5],
    len = [0.2, 0.9], b0 = [0, 0.25], dk = [0.35, 0.8], mot = 0.12, motL = 18, wav = 2, wavL = 60, soft = 0.9, seed = 1, alpha = 1,
    bias = null, spots = 0, spotV = 1.25, gain = 1, taperT = 0.35 } = o;
  const shape = sh || q;
  const bb = shapeBB(shape, 1);
  const D = maskOf(g, shape, bb);
  if (!D) return;
  const { m, X0, Y0, w: Wd, h: Hd, M } = D, sc = m.a;
  let qa = 0, qb = 0;
  if (q) {
    const wid = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2, hei = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
    if (dir === "v") { qa = wid; qb = hei; } else { qa = hei; qb = wid; }
  }
  const ca = Math.cos(ang), sa = Math.sin(ang);
  // mean darkening of the streaks, to keep the face's mean at its value
  const mw = (w[0] + w[1]) / 2, ml = (len[0] + len[1]) / 2, md = (dk[0] + dk[1]) / 2;
  const comp = 1 / Math.max(0.4, 1 - dens * (mw * 0.75 / per) * ml * md * 0.7);
  const L = new Float32Array(Wd * Hd), A = new Float32Array(Wd * Hd);
  for (let j = 0; j < Hd; j++) {
    const py = (Y0 + j + 0.5 - m.f) / sc;
    for (let i = 0; i < Wd; i++) {
      const k = j * Wd + i, ma = M[k];
      if (!ma) continue;
      const px = (X0 + i + 0.5 - m.e) / sc;
      let a, b, uu = 0, vv = 0, bn = 0.5;
      if (q) { const r = invBil(px, py, q); uu = clamp(r[0]); vv = clamp(r[1]); if (dir === "v") { a = uu * qa; b = vv * qb; bn = vv; } else { a = vv * qa; b = uu * qb; bn = uu; } }
      else if (coord) { const r = coord(px, py); a = r[0]; b = r[1]; bn = r[2] ?? 0.5; }
      else { a = -sa * px + ca * py; b = ca * px + sa * py; }
      let val = vq ? vq(uu, vv) : vf ? vf(px, py) : v;
      val *= gain;
      let base = val * comp * (1 + mot * (fbm(px / motL, py / motL, seed + 3, 3) - 0.5) * 2);
      // streaks
      const aa = a + wav * (vn2(b / wavL, a / 90, seed + 7) - 0.5) * 2;
      const c = aa / per, k0 = Math.floor(c);
      let cov = 0, dd = 0;
      for (let kk = k0 - 1; kk <= k0 + 1; kk++) {
        const h1 = hI(kk, 11, seed), h2 = hI(kk, 23, seed), h3 = hI(kk, 37, seed), h4 = hI(kk, 53, seed), h5 = hI(kk, 71, seed);
        const bs = bias ? bias(clamp(kk * per / Math.max(1, qa || 1)), bn) : 1;
        if (h1 > dens * bs) continue;
        const cen = (kk + 0.2 + 0.6 * h2) * per, ww = lerp(w[0], w[1], h3) * (0.8 + 0.4 * vn2(b / 25, kk * 1.3, seed + 11));
        const st = lerp(b0[0], b0[1], h4), ln = lerp(len[0], len[1], h5), en = Math.min(1, st + ln);
        if (bn < st || bn > en) continue;
        const tt = (bn - st) / Math.max(1e-3, en - st);
        const fade = Math.pow(1 - tt, 0.7) * sstep(0, 0.05, tt);
        const wEff = ww * (1 - taperT * tt);
        const d = Math.abs(aa - cen);
        const pc = clamp((wEff / 2 - d) / soft + 0.5);
        const dkv = lerp(dk[0], dk[1], hI(kk, 91, seed)) * fade;
        if (pc * dkv > cov * dd) { cov = pc; dd = dkv; }
      }
      let res = base * (1 - cov * dd);
      if (spots) { const sp = vn2(px / 3.2, py / 3.2, seed + 17); if (sp > 1 - spots) res = Math.min(1, res * spotV); }
      L[k] = clamp(res);
      A[k] = (ma / 255) * alpha;
    }
  }
  writeBack(g, D, L, A);
}

// hatchPaint(): a lit surface drawn as a smooth value painting with dark pen hatching over it, the hatching denser
// where the surface is darker (s05 fix 1d: the desk top, the laptop's shaded sides, cloth in shadow). Mean kept at the
// target: the base is lifted by the strokes' expected coverage. vf(x, y) target value; ang number | (x, y) => angle;
// per: stroke spacing at full density (px); len: [min, max] stroke length; w: [min, max] width; dk: stroke darkness
// (0..1, alpha of near-black ink); top: value at and above which there is no hatching; gamma: density curve.
function hatchPaint(g, sh, { vf, paper = null, mix = 0, ang = 0, per = 5, len = [18, 60], w = [0.9, 1.8], dk = 0.85, top = 0.9, gamma = 1, seed = 1, jit = 0.18, bend = 0.08, blur = 0, alpha = 1, clip = true, base = true, vblur = 0, maxD = 1 } = {}) {
  const bb = shapeBB(sh, 2);
  const D = pageDev(bb);
  const angF = typeof ang === "number" ? () => ang : ang;
  const mw = (w[0] + w[1]) / 2;
  // with a paper field: the base is the paper, and the hatching darkens it to the target value (coverage 1 - v / paper)
  // (mix: that share of the darkening is smooth tone in the base, the rest is hatching)
  const baseP = (x, y, v) => { const p = paper(x, y); return p + (Math.min(p, v) - p) * mix; };
  const densP = (x, y, v) => { const p = baseP(x, y, v); return p > 0.02 ? Math.min(maxD, clamp((1 - v / p) * per / (mw * dk))) : 0; };
  const dens = (v) => Math.min(maxD, Math.pow(clamp((top - v) / Math.max(0.05, top)), gamma));
  // base
  if (base) {
    const c = scr("hpBase", D.w, D.h), cg = c.getContext("2d");
    const id = cg.createImageData(D.w, D.h), d = id.data;
    for (let j = 0; j < D.h; j++) for (let i = 0; i < D.w; i++) {
      const x = D.X0 + i + 0.5, y = D.Y0 + j + 0.5, v = vf(x, y);
      let b;
      if (paper) b = baseP(x, y, v); else { const cov = Math.min(0.85, dens(v) * mw / per) * dk; b = clamp(v / Math.max(0.15, 1 - cov)); }
      const o = (j * D.w + i) * 4;
      d[o] = d[o + 1] = d[o + 2] = b * 255; d[o + 3] = 255 * alpha;
    }
    cg.putImageData(id, 0, 0);
    g.save(); g.beginPath(); tracePath(g, sh); g.clip(); g.drawImage(c, 0, 0, D.w, D.h, D.X0, D.Y0, D.w, D.h); g.restore();
  }
  // strokes
  const r = rng(seed);
  const area = (bb[2] - bb[0]) * (bb[3] - bb[1]), Lm = (len[0] + len[1]) / 2, N = Math.round(area / (per * Lm) * 1.0);
  g.save(); if (clip) { g.beginPath(); tracePath(g, sh); g.clip(); }
  for (let n = 0; n < N; n++) {
    const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r()), p = r(), L = lerp(len[0], len[1], r()), ww = lerp(w[0], w[1], r()), b2 = (r() - 0.5) * 2, aj = (r() - 0.5) * 2 * jit;
    const v = vf(x, y);
    if (p > (paper ? densP(x, y, v) : dens(v))) continue;
    const a = angF(x, y) + aj, ca = Math.cos(a), sa = Math.sin(a), bx = -sa * b2 * L * bend, by = ca * b2 * L * bend;
    const pts = [[x - ca * L / 2, y - sa * L / 2], [x - ca * L / 6 + bx, y - sa * L / 6 + by], [x + ca * L / 6 + bx, y + sa * L / 6 + by], [x + ca * L / 2, y + sa * L / 2]];
    taper(g, sampleCurve(pts, 4), (u) => ww * Math.pow(Math.sin(PI * clamp(u, 0.02, 0.98)), 0.55), `rgba(6,6,6,${(dk * alpha).toFixed(3)})`);
  }
  g.restore();
}

// screentone(): the manga dot screen of the source's cloth (measured on the shirt: a 45 / 135 degree crosshatch, period
// 2.83 px, i.e. a pixel-aligned 4 px dot grid, ~2-3 levels of amplitude), laid over a region of a canvas in place. Its
// strength follows v(1 - v) (none in pure black or white). g: the context (its transform maps page -> device px 1:1 plus
// an offset); sh: the region; amp: peak amplitude (0..1).
function screentone(g, sh, amp = 0.02) {
  const bb = shapeBB(sh, 1), D = maskOf(g, sh, bb);
  if (!D) return;
  const c = g.canvas, cx = c.getContext("2d", { willReadFrequently: true });
  const id = cx.getImageData(D.X0, D.Y0, D.w, D.h), d = id.data;
  for (let j = 0; j < D.h; j++) for (let i = 0; i < D.w; i++) {
    const k = j * D.w + i, m = D.M[k];
    if (!m) continue;
    const o = k * 4, v = d[o] / 255, X = D.X0 + i - D.m.e, Y = D.Y0 + j - D.m.f;
    const pat = Math.cos((Math.PI / 2) * X) * Math.cos((Math.PI / 2) * Y);
    const dv = amp * 4 * v * (1 - v) * pat * (m / 255) * 255;
    d[o] = clamp(d[o] + dv, 0, 255); d[o + 1] = clamp(d[o + 1] + dv, 0, 255); d[o + 2] = clamp(d[o + 2] + dv, 0, 255);
  }
  cx.putImageData(id, D.X0, D.Y0);
}

export { screentone, hatchPaint, drip, PI, TAU, pageDev, clamp, lerp, sstep, grey, P2, bil, dist, polyPath, bboxOf, S, shapeBB, tracePath, ELL, RECT, scr, freeScratch, devBox, blurDraw,
  hI, vn2, fbm, invBil, maskOf, valueOf, writeBack, carve, streams, guideField, brushFill, clothPaint, woodPaint, licPaint, ink, curve, fill, fillSoft,
  dot, ring, lgrad, rgrad, BL, VG, UG, knob, cable, woofer, softLine, softEll, lock, strand };
