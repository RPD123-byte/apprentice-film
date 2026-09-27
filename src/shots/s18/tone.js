// Soft tone correction of a finished plate or drawing: the measured value study. Each blob [x, y, sigma, a] is a
// round gaussian g = exp(-d^2 / 2 sigma^2) of shade (a < 0) or light (a > 0), fitted greedily (trace2/fit_tone.py) so
// that the blurred values match the source's (owl-free plate, or registered owl mean). Both act in proportion to the
// value already there, so black stays black (no glow is added to the dark):
//   v' = v * (1 + min(1, sum of the light blobs' a g)) * product over the shade blobs of (1 + a g)
// Computed per pixel on the canvas's own data (exact and deterministic: no gradients, nothing left to the rasteriser);
// alpha is untouched, so a drawing with transparency keeps its outline. dx, dy: the canvas origin in the blobs' coords.
// Applied once to a cached canvas.
const R3 = 3;
export function applyTone(canvas, blobs, { dx = 0, dy = 0 } = {}) {
  if (!blobs || !blobs.length) return canvas;
  const W = canvas.width, H = canvas.height, g = canvas.getContext("2d", { willReadFrequently: true });
  const L = new Float32Array(W * H), F = new Float32Array(W * H).fill(1);
  let any = false;
  for (const [bx, by, s, a] of blobs) {
    const x = bx - dx, y = by - dy, R = R3 * s, k = -1 / (2 * s * s);
    // pixel (i, j) has its centre at (i + 0.5, j + 0.5)
    const i0 = Math.max(0, Math.floor(x - R)), i1 = Math.min(W - 1, Math.ceil(x + R));
    const j0 = Math.max(0, Math.floor(y - R)), j1 = Math.min(H - 1, Math.ceil(y + R));
    if (i1 < i0 || j1 < j0) continue;
    any = true;
    for (let j = j0; j <= j1; j++) {
      const ey = (j + 0.5 - y) * (j + 0.5 - y), row = j * W;
      for (let i = i0; i <= i1; i++) {
        const ex = i + 0.5 - x, e = Math.exp(k * (ex * ex + ey));
        if (a > 0) L[row + i] += a * e; else F[row + i] *= 1 + a * e;
      }
    }
  }
  if (!any) return canvas;
  const id = g.getImageData(0, 0, W, H), d = id.data;
  for (let p = 0, q = 0; p < W * H; p++, q += 4) {
    const f = (1 + Math.min(1, L[p])) * F[p];
    if (f === 1) continue;
    d[q] = Math.min(255, Math.round(d[q] * f)); d[q + 1] = Math.min(255, Math.round(d[q + 1] * f)); d[q + 2] = Math.min(255, Math.round(d[q + 2] * f));
  }
  g.putImageData(id, 0, 0);
  return canvas;
}
