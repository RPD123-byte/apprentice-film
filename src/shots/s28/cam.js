// s28 camera: an orbit about a vertical axis through the pivot (0,0,1) of the final camera's frame, plus a small
// extra pan (phi) and tilt (pit). Measured: KLT tracks over 129.20–131.40 s, joint least-squares fit of the camera
// per frame and one depth per track (3047 tracks, median reprojection error 2.1 px). Holds on the source's duplicated
// frames (129.56 = 129.52, 130.56 = 130.52). Locked (identity) from 131.36 s.
// World = final camera frame: x right, y down, z forward. Screen: u = F*x/z + CX, v = F*y/z + CY.
export const F = 2650.890, CX = 1103, CY = 473;
// [t, theta, phi, pitch] in degrees, one row per source frame
export const CAM = [[129.20,45.392,10.786,0.396],[129.24,44.144,10.552,0.396],[129.28,42.915,10.321,0.387],[129.32,41.633,10.065,0.391],[129.36,40.413,9.817,0.398],[129.40,39.156,9.561,0.395],[129.44,37.928,9.311,0.383],[129.48,36.645,9.037,0.383],[129.52,35.397,8.768,0.378],[129.56,35.389,8.767,0.379],[129.60,34.136,8.496,0.376],[129.64,32.893,8.226,0.365],[129.68,31.597,7.937,0.361],[129.72,30.315,7.644,0.359],[129.76,29.071,7.366,0.361],[129.80,27.865,7.093,0.356],[129.84,26.620,6.804,0.351],[129.88,25.413,6.524,0.348],[129.92,24.183,6.243,0.345],[129.96,23.015,5.975,0.334],[130.00,21.801,5.694,0.326],[130.04,20.642,5.414,0.318],[130.08,19.483,5.139,0.309],[130.12,18.345,4.874,0.296],[130.16,17.158,4.596,0.281],[130.20,16.088,4.324,0.268],[130.24,14.975,4.056,0.256],[130.28,13.919,3.805,0.238],[130.32,12.817,3.547,0.219],[130.36,11.867,3.290,0.206],[130.40,10.897,3.046,0.196],[130.44,9.962,2.819,0.179],[130.48,8.989,2.579,0.162],[130.52,8.176,2.348,0.152],[130.56,8.177,2.347,0.152],[130.60,7.363,2.131,0.144],[130.64,6.563,1.938,0.116],[130.68,5.841,1.723,0.112],[130.72,5.154,1.530,0.104],[130.76,4.506,1.351,0.097],[130.80,3.910,1.196,0.077],[130.84,3.359,1.025,0.074],[130.88,2.851,0.878,0.068],[130.92,2.385,0.741,0.061],[130.96,1.976,0.626,0.043],[131.00,1.583,0.501,0.042],[131.04,1.228,0.394,0.039],[131.08,0.924,0.304,0.035],[131.12,0.682,0.233,0.024],[131.16,0.463,0.159,0.022],[131.20,0.283,0.100,0.020],[131.24,0.158,0.059,0.017],[131.28,0.078,0.031,0.016],[131.32,0.018,0.008,0.013],[131.36,0.000,0.000,0.000]];
const RAD = Math.PI / 180;
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
  const C = [-(Y[0][2] * 1), -(Y[1][2] * 1), 1 - Y[2][2] * 1];     // pivot + Ry(th)(0 - pivot), pivot = (0,0,1)
  const R = mul(Rx(pit), Ry(-(th + phi)));
  return { R, C, f: F, cx: CX, cy: CY };
}
export const camAt = (t) => camFrom(...camParams(t));
export function project(cam, X) {
  const d = [X[0] - cam.C[0], X[1] - cam.C[1], X[2] - cam.C[2]], R = cam.R;
  const q = [0, 1, 2].map((i) => R[i][0] * d[0] + R[i][1] * d[1] + R[i][2] * d[2]);
  return [cam.f * q[0] / q[2] + cam.cx, cam.f * q[1] / q[2] + cam.cy, q[2]];
}
// ray through a screen point of a camera, hit with plane n.X = d
export function hit(cam, u, v, plane) {
  const dc = [(u - cam.cx) / cam.f, (v - cam.cy) / cam.f, 1], R = cam.R;
  const dw = [0, 1, 2].map((j) => R[0][j] * dc[0] + R[1][j] * dc[1] + R[2][j] * dc[2]);     // R^T dc
  const [n, dd] = plane;
  const s = (dd - (n[0] * cam.C[0] + n[1] * cam.C[1] + n[2] * cam.C[2])) / (n[0] * dw[0] + n[1] * dw[1] + n[2] * dw[2]);
  return [cam.C[0] + dw[0] * s, cam.C[1] + dw[1] * s, cam.C[2] + dw[2] * s];
}
function vplane(x, z, dx, dz) { const l = Math.hypot(dx, dz), n = [-dz / l, 0, dx / l]; return [n, n[0] * x + n[2] * z]; }
// Room planes, fitted to the reconstructed track points (see fidelity/s28.md)
export const BACK = vplane(-0.515, 1.83, -0.802, -0.598);      // shelves / back wall, recedes to the right
export const RIGHT = vplane(0.663, 1.769, -0.202, 0.979);      // window wall, meets BACK at (0.496, 2.583)
const dn = Math.hypot(0.0036, 1, 0.1086);
export const DESK = [[-0.0036 / dn, 1 / dn, -0.1086 / dn], 0.025 / dn];   // Y = 0.025 + 0.0036 X + 0.1086 Z
