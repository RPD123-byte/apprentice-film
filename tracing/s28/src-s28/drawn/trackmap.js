// s28: the measured figure motion of a key drawing (tracks.js) as a point map key px -> frame(t) px, and its inverse.
import { TRACKS } from "./tracks.js";
import { happly } from "./geo.js";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// homography + residual grid (bilinear), at the source frame nearest t (clamped to the measured range)
export function trackMap(key, t) {
  const T = TRACKS[key];
  if (!T.ts) T.ts = Object.keys(T.f).map(Number);
  let tt = Math.round(t * 25) / 25;
  tt = clamp(tt, Math.min(...T.ts), Math.max(...T.ts));
  const r = T.f[tt.toFixed(2)];
  const { x0, y0, w, h, nx, ny } = T.grid, D = r.D;
  return (x, y) => {
    const [X, Y] = happly(r.H, x, y);
    const u = clamp((x - x0) / w * (nx - 1), 0, nx - 1.0001), v = clamp((y - y0) / h * (ny - 1), 0, ny - 1.0001);
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    const at = (a, b, c) => D[(b * nx + a) * 2 + c];
    const d = (c) => (at(i, j, c) * (1 - fu) + at(i + 1, j, c) * fu) * (1 - fv) + (at(i, j + 1, c) * (1 - fu) + at(i + 1, j + 1, c) * fu) * fv;
    return [X + d(0), Y + d(1)];
  };
}
// inverse of a near-identity map by fixed-point iteration
export function invert(fn, x, y) {
  let px = x, py = y;
  for (let i = 0; i < 12; i++) { const [X, Y] = fn(px, py); px += x - X; py += y - Y; }
  return [px, py];
}
// key B is drawn in 129.84-frame px (fix 2); its track is measured from the 129.96 key: compose
export const KEYB_T = 129.84;
export function keyBMap(t) {
  const back = trackMap("B", KEYB_T), fwd = trackMap("B", t);
  return (x, y) => { const [u, v] = invert(back, x, y); return fwd(u, v); };
}
