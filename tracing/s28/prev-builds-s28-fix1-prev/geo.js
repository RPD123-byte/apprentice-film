// s28 geometry: the measured orbit camera, the room planes and plane-induced homographies between frames.
import { F, CX, CY, CAM } from "./measure.js";

const RAD = Math.PI / 180;
export const LOCK = 131.36;
export function camParams(t) {
  const k = Math.round((t - CAM[0][0]) * 25);
  if (k <= 0) return CAM[0].slice(1);
  if (k >= CAM.length - 1) return [0, 0, 0];
  return CAM[k].slice(1);
}
const mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const Ry = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
const Rx = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; };
export function camFrom(th, phi, pit) {
  th *= RAD; phi *= RAD; pit *= RAD;
  const Y = Ry(th);
  const C = [-Y[0][2], -Y[1][2], 1 - Y[2][2]];
  const R = mul(Rx(pit), Ry(-(th + phi)));
  return { R, C };
}
const camCache = new Map();
export function camAt(t) {
  const k = Math.round(t * 25);
  let c = camCache.get(k);
  if (!c) { c = camFrom(...camParams(k / 25)); camCache.set(k, c); }
  return c;
}
export function project(cam, X) {
  const d = [X[0] - cam.C[0], X[1] - cam.C[1], X[2] - cam.C[2]], R = cam.R;
  const q = [0, 1, 2].map((i) => R[i][0] * d[0] + R[i][1] * d[1] + R[i][2] * d[2]);
  return [F * q[0] / q[2] + CX, F * q[1] / q[2] + CY, q[2]];
}
export function hit(cam, u, v, plane) {
  const dc = [(u - CX) / F, (v - CY) / F, 1], R = cam.R;
  const dw = [0, 1, 2].map((j) => R[0][j] * dc[0] + R[1][j] * dc[1] + R[2][j] * dc[2]);
  const [n, dd] = plane;
  const s = (dd - (n[0] * cam.C[0] + n[1] * cam.C[1] + n[2] * cam.C[2])) / (n[0] * dw[0] + n[1] * dw[1] + n[2] * dw[2]);
  return [cam.C[0] + dw[0] * s, cam.C[1] + dw[1] * s, cam.C[2] + dw[2] * s];
}
function vplane(x, z, dx, dz) { const l = Math.hypot(dx, dz), n = [-dz / l, 0, dx / l]; return [n, n[0] * x + n[2] * z]; }
// Room planes (fitted to reconstructed track points in the earlier pass; checked this pass by plane-warping edges)
export const BACK = vplane(-0.515, 1.83, -0.802, -0.598);
export const RIGHT = vplane(0.663, 1.769, -0.202, 0.979);
const dn = Math.hypot(0.0036, 1, 0.1086);
export const DESK = [[-0.0036 / dn, 1 / dn, -0.1086 / dn], 0.025 / dn];
// a fronto-parallel plane at depth z of the locked camera
export const zplane = (z) => [[0, 0, 1], z];

// 3x3 homography from 4 point pairs
export function homog(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  // gaussian elimination
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) if (r !== c) {
      const f = A[r][c] / A[c][c];
      if (f) { for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
    }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}
export const happly = (Hm, x, y) => { const w = Hm[6] * x + Hm[7] * y + Hm[8]; return [(Hm[0] * x + Hm[1] * y + Hm[2]) / w, (Hm[3] * x + Hm[4] * y + Hm[5]) / w, w]; };
export const IDENT = [1, 0, 0, 0, 1, 0, 0, 0, 1];
// frame(t0) px on `plane` -> frame(t1) px
const hCache = new Map();
export function Hplane(t0, t1, plane, tag = "") {
  const key = `${Math.round(t0 * 25)}|${Math.round(t1 * 25)}|${tag || plane[1]}|${plane[0].join(",")}`;
  let Hm = hCache.get(key);
  if (Hm) return Hm;
  const c0 = camAt(t0), c1 = camAt(t1);
  const P = [[300, 250], [1900, 250], [1900, 750], [300, 750]];
  const Q = P.map(([u, v]) => project(c1, hit(c0, u, v, plane)));
  Hm = homog(P, Q.map((q) => [q[0], q[1]]));
  if (hCache.size > 4000) hCache.clear();
  hCache.set(key, Hm);
  return Hm;
}
