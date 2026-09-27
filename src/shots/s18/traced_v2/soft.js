// Deterministic separable gaussian blur of a canvas in place, on premultiplied colour (so transparent edges do not
// pull in black). sx / sy: sigma in px along x / y (0 = none).
function kernel(s) {
  const r = Math.max(1, Math.ceil(s * 3)), k = new Float32Array(2 * r + 1);
  let sum = 0; for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-0.5 * (i * i) / (s * s)); sum += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  return [k, r];
}
function pass(src, dst, w, h, s, horiz) {
  const [k, r] = kernel(s);
  const step = horiz ? 4 : w * 4, n = horiz ? w : h, m = horiz ? h : w;
  for (let j = 0; j < m; j++) {
    const base = horiz ? j * w * 4 : j * 4;
    for (let i = 0; i < n; i++) {
      let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
      const lo = Math.max(-r, -i), hi = Math.min(r, n - 1 - i);
      for (let q = lo; q <= hi; q++) { const kk = k[q + r], p = base + (i + q) * step; a0 += src[p] * kk; a1 += src[p + 1] * kk; a2 += src[p + 2] * kk; a3 += src[p + 3] * kk; }
      const o = base + i * step; dst[o] = a0; dst[o + 1] = a1; dst[o + 2] = a2; dst[o + 3] = a3;
    }
  }
}
export function softCanvas(c, sx, sy = sx) {
  if (!(sx > 0.05) && !(sy > 0.05)) return c;
  const g = c.getContext("2d", { willReadFrequently: true }), w = c.width, h = c.height;
  const id = g.getImageData(0, 0, w, h), d = id.data, N = w * h * 4;
  let A = new Float32Array(N), B = new Float32Array(N);
  for (let p = 0; p < N; p += 4) { const a = d[p + 3] / 255; A[p] = d[p] * a; A[p + 1] = d[p + 1] * a; A[p + 2] = d[p + 2] * a; A[p + 3] = d[p + 3]; }
  if (sx > 0.05) { pass(A, B, w, h, sx, true); [A, B] = [B, A]; }
  if (sy > 0.05) { pass(A, B, w, h, sy, false); [A, B] = [B, A]; }
  for (let p = 0; p < N; p += 4) { const a = A[p + 3]; const inv = a > 0.01 ? 255 / a : 0; d[p] = A[p] * inv; d[p + 1] = A[p + 1] * inv; d[p + 2] = A[p + 2] * inv; d[p + 3] = a; }
  g.putImageData(id, 0, 0);
  return c;
}
