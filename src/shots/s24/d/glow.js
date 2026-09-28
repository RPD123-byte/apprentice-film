// s24 (ending fix): a copy of sites.js's addScreenGlow (the finish pass's screen glow spilling into the margins), with
// one change: the two intermediate downsample canvases are cleared before each draw. In the lib they are not, so
// their edge pixels (drawn with partial coverage) keep the previous call's content, and the glow of a frame then
// depends on which frame was rendered before it (measured: ±1 level over ≈ 60 margin pixels at k90/k91 after k82).
// Everything else is the lib's code, unchanged.
import { FRAMED } from "../../../lib/sites.js";
let glowSmall = null, glowFull = null, glowMask = null, glowTmp = null, glowHalf = null;
export function addScreenGlowS24(ctx, gain = 1) {
  const S = FRAMED.glowRect, W = ctx.canvas.width, H = ctx.canvas.height;
  const sw = Math.floor(W / 8), sh = Math.floor(H / 8);
  if (!glowSmall) {
    glowSmall = document.createElement("canvas"); glowSmall.width = sw; glowSmall.height = sh;          // GPU: downsample
    glowTmp = document.createElement("canvas"); glowTmp.width = sw; glowTmp.height = sh;              // CPU: read/write
    glowFull = document.createElement("canvas"); glowFull.width = W; glowFull.height = H;
    // outside = 1 - GaussianBlur(inside, sigma 10), built analytically (the blur of a rectangle is separable), at
    // quarter resolution (it is smooth) and scaled up when used
    const MW = Math.ceil(W / 4), MH = Math.ceil(H / 4);
    glowMask = document.createElement("canvas"); glowMask.width = MW; glowMask.height = MH;
    const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
    const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
    const sig = 10, fx = new Float32Array(MW), fy = new Float32Array(MH);
    for (let x = 0; x < MW; x++) fx[x] = Phi((x * 4 + 2 - S.x0) / sig) - Phi((x * 4 + 2 - S.x1) / sig);
    for (let y = 0; y < MH; y++) fy[y] = Phi((y * 4 + 2 - S.y0) / sig) - Phi((y * 4 + 2 - (S.y1 + 60)) / sig);
    const m = glowMask.getContext("2d"), id = m.createImageData(MW, MH), d = id.data;
    for (let y = 0, i = 3; y < MH; y++) for (let x = 0; x < MW; x++, i += 4) d[i] = Math.round(255 * (1 - fx[x] * fy[y]));
    m.putImageData(id, 0, 0);
  }
  // 1) inside-only content, shrunk 8x by three bilinear halvings (cheap on any GPU, close to an area average)
  if (!glowHalf) { glowHalf = [2, 4].map((k) => { const c = document.createElement("canvas"); c.width = Math.round(W / k); c.height = Math.round(H / k); return c; }); }
  const [h2, h4] = glowHalf, y1 = Math.min(H, S.y1);
  const g2 = h2.getContext("2d"); g2.setTransform(1, 0, 0, 1, 0, 0); g2.fillStyle = "#000"; g2.fillRect(0, 0, h2.width, h2.height);
  g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = "low";
  g2.drawImage(ctx.canvas, S.x0, S.y0, S.x1 - S.x0, y1 - S.y0, S.x0 / 2, S.y0 / 2, (S.x1 - S.x0) / 2, (y1 - S.y0) / 2);
  const g4 = h4.getContext("2d"); g4.clearRect(0, 0, h4.width, h4.height); g4.imageSmoothingEnabled = true; g4.imageSmoothingQuality = "low"; g4.drawImage(h2, 0, 0, h4.width, h4.height);
  const sg = glowSmall.getContext("2d"); sg.clearRect(0, 0, sw, sh); sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = "low"; sg.drawImage(h4, 0, 0, sw, sh);
  const tg = glowTmp.getContext("2d", { willReadFrequently: true });
  tg.clearRect(0, 0, sw, sh); tg.drawImage(glowSmall, 0, 0);
  const src = tg.getImageData(0, 0, sw, sh);
  // 2) 0.6·blur(7) + 0.4·blur(26), x4.5, capped at 120 (gaussians approximated by three box passes)
  const a = gaussRGB(src.data, sw, sh, 7), b = gaussRGB(src.data, sw, sh, 26);
  const o = src.data;
  for (let i = 0; i < o.length; i += 4) {
    for (let k = 0; k < 3; k++) o[i + k] = Math.min(120, (0.6 * a[i + k] + 0.4 * b[i + k]) * 4.5 * gain);
    o[i + 3] = 255;
  }
  tg.putImageData(src, 0, 0);
  // 3) upsample, multiply by the outside mask, add
  const fg = glowFull.getContext("2d");
  fg.setTransform(1, 0, 0, 1, 0, 0); fg.globalCompositeOperation = "copy"; fg.imageSmoothingEnabled = true; fg.imageSmoothingQuality = "low";
  fg.drawImage(glowTmp, 0, 0, W, H);
  fg.globalCompositeOperation = "destination-in"; fg.imageSmoothingQuality = "medium"; fg.drawImage(glowMask, 0, 0, W, H);
  fg.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(glowFull, 0, 0); ctx.restore();
}

const GK = new Map();
function gaussKernel(sigma) {
  let k = GK.get(sigma);
  if (!k) {
    const r = Math.max(1, Math.round(sigma * 4)); k = new Float32Array(2 * r + 1); let sum = 0;
    for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-0.5 * (i * i) / (sigma * sigma)); sum += k[i + r]; }
    for (let i = 0; i < k.length; i++) k[i] /= sum;
    GK.set(sigma, k);
  }
  return k;
}
function reflect101(p, n) {
  if (n === 1) return 0;
  while (p < 0 || p >= n) p = p < 0 ? -p : 2 * (n - 1) - p;
  return p;
}
function gaussRGB(d, w, h, sigma) {
  const k = gaussKernel(sigma), r = (k.length - 1) / 2;
  const tmp = new Float32Array(w * h * 3), out = new Float32Array(w * h * 4);
  const ix = new Int32Array(w + 2 * r), iy = new Int32Array(h + 2 * r);
  for (let i = -r; i < w + r; i++) ix[i + r] = reflect101(i, w);
  for (let i = -r; i < h + r; i++) iy[i + r] = reflect101(i, h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let a0 = 0, a1 = 0, a2 = 0;
      for (let t = 0; t < k.length; t++) { const j = (row + ix[x + t]) * 4, kk = k[t]; a0 += d[j] * kk; a1 += d[j + 1] * kk; a2 += d[j + 2] * kk; }
      const o = (row + x) * 3; tmp[o] = a0; tmp[o + 1] = a1; tmp[o + 2] = a2;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a0 = 0, a1 = 0, a2 = 0;
      for (let t = 0; t < k.length; t++) { const j = (iy[y + t] * w + x) * 3, kk = k[t]; a0 += tmp[j] * kk; a1 += tmp[j + 1] * kk; a2 += tmp[j + 2] * kk; }
      const o = (y * w + x) * 4; out[o] = a0; out[o + 1] = a1; out[o + 2] = a2;
    }
  }
  return out;
}

