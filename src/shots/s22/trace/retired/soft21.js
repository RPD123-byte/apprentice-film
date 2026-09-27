// s22's copy of src/shots/s21/soft.js (owned by the s21 agent; copied 2026-09-25T15:26), so that s22 draws the same bird as
// s21 across the 74.52 cut without depending on another shot's module. s22 changes are marked "(s22)".
// Soften a transparent sprite canvas in place: an exact, deterministic separable gaussian on PREMULTIPLIED
// colour (so the white owl's edges blur into transparency, not into black). The source's owl is soft (fine-band
// energy inside the owl ~0.74× ours before this pass, measured on 12 pairs over 69.48–74.48; s21 uses σ 0.6 px).
let BUF = null, TMP = null, K = null, KS = -1;
export function softenCanvas(c, sigma) {
  if (!(sigma > 0.05)) return c;
  const w = c.width, h = c.height, n = w * h * 4;
  const g = c.getContext("2d", { willReadFrequently: true });
  const id = g.getImageData(0, 0, w, h), d = id.data;
  if (!BUF || BUF.length < n) { BUF = new Float32Array(n); TMP = new Float32Array(n); }
  if (KS !== sigma) {
    const r = Math.max(1, Math.ceil(sigma * 3));
    K = new Float32Array(2 * r + 1);
    let s = 0; for (let i = -r; i <= r; i++) { K[i + r] = Math.exp(-0.5 * (i * i) / (sigma * sigma)); s += K[i + r]; }
    for (let i = 0; i < K.length; i++) K[i] /= s;
    KS = sigma;
  }
  const r = (K.length - 1) >> 1;
  for (let i = 0; i < n; i += 4) { const a = d[i + 3] / 255; BUF[i] = d[i] * a; BUF[i + 1] = d[i + 1] * a; BUF[i + 2] = d[i + 2] * a; BUF[i + 3] = d[i + 3]; }
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
      const lo = Math.max(-r, -x), hi = Math.min(r, w - 1 - x);
      for (let i = lo; i <= hi; i++) { const k = K[i + r], j = row + (x + i) * 4; a0 += BUF[j] * k; a1 += BUF[j + 1] * k; a2 += BUF[j + 2] * k; a3 += BUF[j + 3] * k; }
      const o = row + x * 4; TMP[o] = a0; TMP[o + 1] = a1; TMP[o + 2] = a2; TMP[o + 3] = a3;
    }
  }
  const W4 = w * 4;
  for (let y = 0; y < h; y++) {
    const lo = Math.max(-r, -y), hi = Math.min(r, h - 1 - y);
    for (let x = 0; x < w; x++) {
      let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
      const cc = x * 4;
      for (let i = lo; i <= hi; i++) { const k = K[i + r], j = (y + i) * W4 + cc; a0 += TMP[j] * k; a1 += TMP[j + 1] * k; a2 += TMP[j + 2] * k; a3 += TMP[j + 3] * k; }
      const o = y * W4 + cc;
      if (a3 > 0.5) { const inv = 255 / a3; d[o] = a0 * inv; d[o + 1] = a1 * inv; d[o + 2] = a2 * inv; d[o + 3] = a3; }
      else { d[o] = d[o + 1] = d[o + 2] = 0; d[o + 3] = a3; }
    }
  }
  g.putImageData(id, 0, 0);
  return c;
}
export function releaseSoft() { BUF = null; TMP = null; }
