// s07 tone-to-line re-rendering (fix pass 3). The trace paints shading as smooth value zones (blurred quadratics); the
// drawing builds tone from lines. These helpers take a region of a finished traced layer, measure its own tone there
// (blurred), flatten it, and draw the same tone back as strokes, so the blurred value is kept and the texture reads as
// ink:
//   skinHatch  - dark hatching on light skin: short tapered strokes along the local form direction (the structure
//                tensor of the layer's own tone), width set by the tone deficit;
//   lineFill   - engraving on dark: continuous white lines in a fixed direction whose width follows the tone
//                (lit box faces);
//   stipple    - fine seeded dots/flecks on light (fluff, cloth).
// All positions come from integer hash noise in frame coordinates: deterministic, and static things never boil.
import { ctx2d, canvas, TINT } from "./tracekit.js";

const col = (v) => `rgb(${(v * 255 * TINT[0]).toFixed(1)},${(v * 255 * TINT[1]).toFixed(1)},${(v * 255 * TINT[2]).toFixed(1)})`;
export function hash01(x, y, salt) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(salt | 0, 144665)) >>> 0;
  h = Math.imul((h ^ (h >>> 13)) >>> 0, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) & 0xffff) / 65535;
}
// separable box blur, 3 passes (~gaussian), radius r
export function blurF(F, W, H, r) {
  if (r < 1) return F;
  const tmp = new Float32Array(Math.max(W, H)), n = 2 * r + 1;
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) {
      const o = y * W; let s = 0;
      for (let k = -r; k <= r; k++) s += F[o + Math.min(W - 1, Math.max(0, k))];
      for (let x = 0; x < W; x++) { tmp[x] = s / n; s += F[o + Math.min(W - 1, x + r + 1)] - F[o + Math.max(0, x - r)]; }
      for (let x = 0; x < W; x++) F[o + x] = tmp[x];
    }
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += F[Math.min(H - 1, Math.max(0, k)) * W + x];
      for (let y = 0; y < H; y++) { tmp[y] = s / n; s += F[Math.min(H - 1, y + r + 1) * W + x] - F[Math.max(0, y - r) * W + x]; }
      for (let y = 0; y < H; y++) F[y * W + x] = tmp[y];
    }
  }
  return F;
}
export function lumOf(d, n) { const L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = (d[4 * i] + d[4 * i + 1] + d[4 * i + 2]) / 765; return L; }
function alphaOf(c) { const d = ctx2d(c).getImageData(0, 0, c.width, c.height).data, n = c.width * c.height, A = new Float32Array(n); for (let i = 0; i < n; i++) A[i] = d[4 * i + 3] / 255; return A; }

// Form direction (radians, along the strokes) from the structure tensor of L: gradient at the pixel scale, tensor
// integrated over ~r px. Returns { ang, coh } per pixel.
function formField(L, W, H, r = 5) {
  const n = W * H, XX = new Float32Array(n), XY = new Float32Array(n), YY = new Float32Array(n);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, gx = (L[i + 1] - L[i - 1]) / 2, gy = (L[i + W] - L[i - W]) / 2;
    XX[i] = gx * gx; XY[i] = gx * gy; YY[i] = gy * gy;
  }
  blurF(XX, W, H, r); blurF(XY, W, H, r); blurF(YY, W, H, r);
  const ang = new Float32Array(n), coh = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = XX[i], b = XY[i], c = YY[i];
    ang[i] = 0.5 * Math.atan2(2 * b, a - c) + Math.PI / 2;   // gradient orientation + 90 deg = along the form lines
    const tr = a + c; coh[i] = tr > 1e-6 ? Math.sqrt((a - c) * (a - c) + 4 * b * b) / tr : 0;
  }
  return { ang, coh };
}

// Dark hatching on light skin. layer: CPU canvas (modified in place); mask: canvas whose alpha marks the skin;
// x0, y0: the layer's frame offset (hash coordinates). opts: light (flattened skin value), ink (stroke value), pitch,
// len, lo (values below lo are ink lines and are kept), def (default direction), seed.
export function skinHatch(layer, mask, x0, y0, { light = 0.93, ink = 0.36, pitch = 3.4, len = 7.5, lo = 0.46, def = 0.9, seed = 11, gain = 1 } = {}) {
  const W = layer.width, H = layer.height, n = W * H;
  const g = ctx2d(layer), im = g.getImageData(0, 0, W, H), d = im.data;
  const L = lumOf(d, n), M = alphaOf(mask);
  const Lb = blurF(Float32Array.from(L), W, H, 1);
  const T = blurF(Float32Array.from(L), W, H, 2);   // the tone the strokes must rebuild
  const F = formField(Lb, W, H, 5);
  // flatten the mid-tones of the skin to the light value; ink lines (below lo) and their soft edges are kept
  for (let i = 0; i < n; i++) {
    const m = M[i]; if (m <= 0) continue;
    const v = L[i]; if (v <= lo || v >= light) continue;   // never darken the highlights
    const k = m * Math.min(1, (v - lo) / 0.12);
    const nv = v + (light - v) * k;
    d[4 * i] = nv * 255 * TINT[0]; d[4 * i + 1] = nv * 255 * TINT[1]; d[4 * i + 2] = nv * 255 * TINT[2];
  }
  g.putImageData(im, 0, 0);
  // strokes on a jittered lattice
  g.save(); g.lineCap = "round"; g.strokeStyle = col(ink);
  const cell = pitch;
  for (let gy = 0; gy < H; gy += cell) for (let gx = 0; gx < W; gx += cell) {
    const hx = Math.round((gx + x0) / cell), hy = Math.round((gy + y0) / cell);
    const px = gx + (hash01(hx, hy, seed) - 0.5) * cell, py = gy + (hash01(hx, hy, seed + 1) - 0.5) * cell;
    const ix = Math.max(0, Math.min(W - 1, Math.round(px))), iy = Math.max(0, Math.min(H - 1, Math.round(py))), i = iy * W + ix;
    const m = M[i]; if (m < 0.5 || T[i] <= lo) continue;
    const def0 = light - T[i]; if (def0 < 0.03) continue;
    // coverage: a stroke of width w and length len per cell^2 darkens by w*len/cell^2*(light-ink)
    const w = Math.min(cell * 0.7, (gain * def0 * cell * cell) / (len * (light - ink)));
    if (w < 0.18) continue;
    const a = F.coh[i] > 0.25 ? F.ang[i] : def, ca = Math.cos(a), sa = Math.sin(a);
    const l = len * (0.75 + 0.5 * hash01(hx, hy, seed + 2));
    // tapered: three segments, thickest in the middle
    const P = (u) => [px + ca * u * l, py + sa * u * l];
    const seg = [[-0.5, -0.25, 0.55], [-0.25, 0.25, 1], [0.25, 0.5, 0.55]];
    for (const [u0, u1, k] of seg) { const [ax, ay] = P(u0), [bx, by] = P(u1); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineWidth = w * k * 1.25; g.stroke(); }
  }
  g.restore();
  // keep the result inside the skin only (outside it the layer is untouched): done by construction above
  return layer;
}

// Engraving: continuous lines along `ang` (radians) over a region, whose width follows the region's own tone T (the
// finished plate there, box-blurred `blur` px): w = pitch * (T - base) / (ink - base), so the blurred value is kept.
// Works both ways: white lines on a dark base (base < ink) and dark lines on a light base (base > ink).
//   dash [period, duty]: the lines break into dashes (width scaled by 1/duty to keep the tone);
//   streak [amp, period]: the width wanders along each line (drips), zero-mean;
//   keep(T) -> 0..1: a tone mask (e.g. only the lit part of a face; the dark laptop lid in front stays);
//   soft: blur (px) of the finished lines, for the print's softness.
// poly: frame px polygon.
export function lineFill(plate, poly, { ang = Math.PI / 2, pitch = 3.2, base = 0.04, ink = 0.95, seed = 5, gain = 1, wob = 0.35, blur = 2, dash = null, streak = null, keep = null, soft = 0 } = {}) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const bx0 = Math.floor(Math.min(...xs)) - 1, by0 = Math.floor(Math.min(...ys)) - 1, bx1 = Math.ceil(Math.max(...xs)) + 1, by1 = Math.ceil(Math.max(...ys)) + 1;
  const W = bx1 - bx0, H = by1 - by0, n = W * H;
  const pg = ctx2d(plate);
  const im = pg.getImageData(bx0, by0, W, H), L = lumOf(im.data, n);
  const T = blurF(L, W, H, blur);
  const C = canvas(W, H), g = ctx2d(C);
  g.translate(-bx0, -by0);
  g.save(); g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
  g.fillStyle = col(base); g.fillRect(bx0, by0, W, H);
  g.strokeStyle = col(ink); g.lineCap = "butt";
  const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;   // along (ca, sa), across (nx, ny)
  const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2, R = Math.hypot(W, H) / 2 + 4;
  const tv = (x, y) => { const ix = Math.round(x - bx0), iy = Math.round(y - by0); return ix < 0 || iy < 0 || ix >= W || iy >= H ? base : T[iy * W + ix]; };
  const duty = dash ? dash[1] : 1;
  for (let k = -Math.ceil(R / pitch); k <= Math.ceil(R / pitch); k++) {
    const off = k * pitch + (hash01(k, 3, seed) - 0.5) * pitch * 0.3, ph = hash01(k, 9, seed) * (dash ? dash[0] : 1);
    const step = 1;
    for (let u = -R; u <= R; u += step) {
      if (dash && ((u + ph) % dash[0] + dash[0]) % dash[0] > dash[0] * duty) continue;
      const wob2 = (hash01(k, Math.round(u / 6), seed + 1) - 0.5) * wob;
      const x = cx + nx * (off + wob2) + ca * u, y = cy + ny * (off + wob2) + sa * u;
      let w = (gain * (tv(x, y) - base) * pitch) / ((ink - base) * duty);
      if (streak) { const q = u / streak[1] + k * 7.13, i0 = Math.floor(q), f = q - i0, s0 = hash01(k, i0, seed + 2), s1 = hash01(k, i0 + 1, seed + 2); w *= 1 + streak[0] * 2 * (s0 + (s1 - s0) * f * f * (3 - 2 * f) - 0.5); }
      w = Math.max(0, Math.min(pitch * 0.95, w));
      if (w < 0.08) continue;
      g.beginPath(); g.moveTo(x - ca * 0.55, y - sa * 0.55); g.lineTo(x + ca * 0.55, y + sa * 0.55); g.lineWidth = w; g.stroke();
    }
  }
  g.restore();
  if (keep) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    const M = g.createImageData(W, H);
    for (let i = 0; i < n; i++) { M.data[4 * i + 3] = Math.round(255 * Math.max(0, Math.min(1, keep(T[i])))); }
    const Mc = canvas(W, H); ctx2d(Mc).putImageData(M, 0, 0);
    g.globalCompositeOperation = "destination-in"; g.drawImage(Mc, 0, 0); g.globalCompositeOperation = "source-over";
  }
  if (soft > 0) { const S = canvas(W, H), sg = ctx2d(S); sg.filter = `blur(${soft}px)`; sg.drawImage(C, 0, 0); sg.filter = "none"; pg.drawImage(S, bx0, by0); }
  else pg.drawImage(C, bx0, by0);
}

// Streaks on a lit face: the region's own tone, softened (box-blurred `blur` px: the slab edges go), plus a zero-mean
// pattern of soft lines along `ang` whose darkness wanders along each line (drips). amp sets the mid-scale energy
// (matched to the source's high-pass energy per face). The blurred value is unchanged.
export function streakFill(plate, poly, { ang = Math.PI / 2, pitch = 4.5, amp = 0.12, blur = 3, seed = 7, period = 14, keep = null, width = 0.32 } = {}) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const bx0 = Math.floor(Math.min(...xs)) - 1, by0 = Math.floor(Math.min(...ys)) - 1, bx1 = Math.ceil(Math.max(...xs)) + 1, by1 = Math.ceil(Math.max(...ys)) + 1;
  const W = bx1 - bx0, H = by1 - by0, n = W * H;
  const pg = ctx2d(plate);
  const im = pg.getImageData(bx0, by0, W, H), d = im.data, L = lumOf(d, n);
  const T = blurF(Float32Array.from(L), W, H, blur), T2 = blurF(Float32Array.from(L), W, H, 1);
  // polygon mask with a 2 px feather (rasterised)
  const Mc = canvas(W, H), mg = ctx2d(Mc);
  mg.translate(-bx0, -by0); mg.filter = "blur(1px)"; mg.beginPath(); poly.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y))); mg.closePath(); mg.fillStyle = "#fff"; mg.fill();
  const md = mg.getImageData(0, 0, W, H).data;
  const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
  // pattern: soft line bumps across, drip noise along; mean removed analytically per line
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, m = md[4 * i + 3] / 255; if (m <= 0) continue;
    const X = x + bx0, Y = y + by0, c = X * nx + Y * ny, a = X * ca + Y * sa;
    const q = c / pitch, k = Math.floor(q), f = q - k;
    const j = 0.5 + (hash01(k, 1, seed) - 0.5) * 0.4, wk = width * (0.7 + 0.6 * hash01(k, 2, seed));
    const z = (f - j) / wk, bump = Math.exp(-z * z);
    const t = a / period + hash01(k, 3, seed) * 10, i0 = Math.floor(t), fr = t - i0, s0 = hash01(k, i0, seed + 4), s1 = hash01(k, i0 + 1, seed + 4);
    const s = s0 + (s1 - s0) * fr * fr * (3 - 2 * fr);
    const P = bump * s - wk * 0.886;   // mean of the bump over one pitch is wk*sqrt(pi), of s 0.5
    let k2 = keep ? keep(T[i]) : 1; k2 *= m;
    const v = T[i] - amp * P / 0.25, o = T2[i] + (v - T2[i]) * k2;
    const L0 = L[i], dv = o - L0;
    d[4 * i] += dv * 255 * TINT[0]; d[4 * i + 1] += dv * 255 * TINT[1]; d[4 * i + 2] += dv * 255 * TINT[2];
  }
  pg.putImageData(im, bx0, by0);
}

// Smear a region along `ang` (a 1-D box blur of `len` px along the stroke direction, inside the feathered polygon):
// the traced tone keeps its measured streaks across the direction, while the slab edges and short fragments running
// across it soften away. dash [period, duty, depth]: the bright parts break into dashes (zero-mean modulation).
export function smearFill(plate, poly, { ang = Math.PI / 2, len = 9, dash = null, seed = 3, grain = 0 } = {}) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const pad = Math.ceil(len) + 2;
  const bx0 = Math.floor(Math.min(...xs)) - pad, by0 = Math.floor(Math.min(...ys)) - pad, bx1 = Math.ceil(Math.max(...xs)) + pad, by1 = Math.ceil(Math.max(...ys)) + pad;
  const W = bx1 - bx0, H = by1 - by0, n = W * H;
  const pg = ctx2d(plate);
  const im = pg.getImageData(bx0, by0, W, H), d = im.data, L = lumOf(d, n);
  const Mc = canvas(W, H), mg = ctx2d(Mc);
  mg.translate(-bx0, -by0); mg.filter = "blur(1px)"; mg.beginPath(); poly.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y))); mg.closePath(); mg.fillStyle = "#fff"; mg.fill();
  const md = mg.getImageData(0, 0, W, H).data;
  const ca = Math.cos(ang), sa = Math.sin(ang), N = Math.max(1, Math.round(len / 2));
  const at = (x, y) => { const ix = Math.max(0, Math.min(W - 1, Math.round(x))), iy = Math.max(0, Math.min(H - 1, Math.round(y))); return L[iy * W + ix]; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, m = md[4 * i + 3] / 255; if (m <= 0) continue;
    let s = 0; for (let k = -N; k <= N; k++) s += at(x + ca * k, y + sa * k);
    let v = s / (2 * N + 1);
    if (dash) {
      const X = x + bx0, Y = y + by0, a = X * ca + Y * sa, c = Math.round(-X * sa + Y * ca);
      const ph = hash01(c, 5, seed) * dash[0], on = (((a + ph) % dash[0]) + dash[0]) % dash[0] < dash[0] * dash[1];
      v *= on ? 1 + dash[2] * (1 - dash[1]) / dash[1] : 1 - dash[2];
    }
    if (grain) v += (hash01(x + bx0, y + by0, seed + 9) - 0.5) * grain * Math.min(1, 5 * v * (1 - v));
    const dv = (v - L[i]) * m;
    d[4 * i] += dv * 255 * TINT[0]; d[4 * i + 1] += dv * 255 * TINT[1]; d[4 * i + 2] += dv * 255 * TINT[2];
  }
  pg.putImageData(im, bx0, by0);
}
