// s05 drawn: the light correction. Each layer is multiplied once, when it is built, by a smooth gain field (./tonegrid.js:
// knots every 48 px, fitted so the whole drawing's blurred light matches the source's rest frame; the screen is left
// out). Like s02's fitted tone gaussians: low-frequency light only, the drawing itself is untouched.
import { TONE } from "./tonegrid.js";
export const TONE_ON = { v: true };
export function gainAt(x, y) {
  const { x0, y0, S, nx, ny, g } = TONE;
  let fx = (x - x0) / S, fy = (y - y0) / S;
  fx = Math.max(0, Math.min(nx - 1.0001, fx)); fy = Math.max(0, Math.min(ny - 1.0001, fy));
  const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, a = (ii, jj) => g[jj * nx + ii];
  return (a(i, j) * (1 - u) + a(i + 1, j) * u) * (1 - v) + (a(i, j + 1) * (1 - u) + a(i + 1, j + 1) * u) * v;
}
export function toneLayer(name, c, x0, y0) {
  if (!TONE_ON.v || !TONE.g.length) return;
  const g = c.getContext("2d", { willReadFrequently: true }), w = c.width, h = c.height;
  const id = g.getImageData(0, 0, w, h), d = id.data;
  // gains on a 4 px lattice, bilinear between (the field is smooth)
  const Q = 4, gw = Math.ceil(w / Q) + 1, gh = Math.ceil(h / Q) + 1, G = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) G[j * gw + i] = gainAt(x0 + i * Q, y0 + j * Q);
  for (let y = 0; y < h; y++) {
    const fy = y / Q, j = Math.floor(fy), v = fy - j;
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (!d[o + 3]) continue;
      const fx = x / Q, i = Math.floor(fx), u = fx - i, k = j * gw + i;
      const gg = (G[k] * (1 - u) + G[k + 1] * u) * (1 - v) + (G[k + gw] * (1 - u) + G[k + gw + 1] * u) * v;
      d[o] = Math.min(255, d[o] * gg); d[o + 1] = Math.min(255, d[o + 1] * gg); d[o + 2] = Math.min(255, d[o + 2] * gg);
    }
  }
  g.putImageData(id, 0, 0);
}
