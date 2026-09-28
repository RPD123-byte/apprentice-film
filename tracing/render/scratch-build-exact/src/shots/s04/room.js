// s04 room: the camera path (fitted to the source) and the 3D room it sees — laptop, speaker, desk, shelving,
// cartons. World units are cm, y up; the designer's head is at the origin facing +z (his left = +x).
//
// Camera keys: a joint least-squares fit (snapshots/s04-study/camfit.py) of camera pose per time + laptop and speaker
// poses to hand-measured source points (lid corners, lid edges, speaker front corners, a shelf post) with a weak
// head-position prior and a smoothness prior; residuals are mostly < 15 px (max ~30 px).
import { W, H } from "../../config.js";
import { rng } from "../../lib/rng.js";
import { Plate } from "../../lib/engrave.js";
import { drawSoko } from "../../lib/sites.js";

export const FOV = 20.355;
// [t, ex, ey, ez, yaw, pitch, roll]
const CAM = [
  [20.84, 24.915, 9.405, 96.764, 0.213, -0.134, 0.009],
  [20.92, 27.388, 9.856, 96.593, 0.252, -0.139, 0.001],
  [21.0, 29.997, 10.006, 95.987, 0.288, -0.142, -0.007],
  [21.08, 32.375, 9.678, 94.41, 0.328, -0.142, -0.011],
  [21.16, 35.673, 9.062, 92.111, 0.367, -0.139, 0.001],
  [21.24, 38.927, 8.376, 89.294, 0.414, -0.134, -0.002],
  [21.4, 45.918, 6.948, 81.585, 0.532, -0.118, -0.029],
  [21.64, 56.931, 4.423, 66.778, 0.793, -0.104, -0.056],
  [21.84, 63.411, 3.745, 57.319, 0.953, -0.095, -0.027],
  [22.24, 82.986, -2.326, 44.637, 1.186, -0.043, 0.012],
  [22.32, 83.985, -1.939, 33.817, 1.327, -0.056, 0.006],
  [22.4, 83.473, -1.265, 22.477, 1.473, -0.07, 0.011],
  [22.48, 82.388, 0.106, 10.376, 1.632, -0.093, 0.01],
  [22.56, 80.803, 2.588, -3.03, 1.79, -0.118, 0.001],
  [22.64, 79.049, 5.359, -15.376, 1.952, -0.15, 0.031],
  [22.72, 77.242, 8.598, -26.658, 2.08, -0.182, 0.019],
  [22.8, 76.222, 11.72, -36.632, 2.187, -0.209, 0.016],
  [22.88, 74.487, 13.556, -44.437, 2.26, -0.231, 0.024],
  [22.96, 72.284, 14.225, -49.383, 2.335, -0.239, 0.012],
  [23.04, 69.426, 13.692, -53.5, 2.393, -0.247, -0.005],
  [23.12, 66.445, 12.679, -56.936, 2.442, -0.238, -0.013],
];
function spline(tab, t) {
  const n = tab.length;
  if (t <= tab[0][0]) return tab[0].slice(1);
  if (t >= tab[n - 1][0]) return tab[n - 1].slice(1);
  let i = 1; while (tab[i][0] < t) i++;
  const p0 = tab[Math.max(0, i - 2)], p1 = tab[i - 1], p2 = tab[i], p3 = tab[Math.min(n - 1, i + 1)];
  const u = (t - p1[0]) / (p2[0] - p1[0]);
  // non-uniform Catmull-Rom tangents
  const out = [];
  for (let k = 1; k < p1.length; k++) {
    const m1 = (p2[k] - p0[k]) / Math.max(1e-6, p2[0] - p0[0]) * (p2[0] - p1[0]);
    const m2 = (p3[k] - p1[k]) / Math.max(1e-6, p3[0] - p1[0]) * (p2[0] - p1[0]);
    const u2 = u * u, u3 = u2 * u;
    out.push((2 * u3 - 3 * u2 + 1) * p1[k] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[k] + (u3 - u2) * m2);
  }
  return out;
}
export function camAt(t) {
  const [ex, ey, ez, yaw, pitch, roll] = spline(CAM, t);
  const f = [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
  let r = [f[1] * 0 - f[2] * 1, f[2] * 0 - f[0] * 0, f[0] * 1 - f[1] * 0];
  const rl = Math.hypot(r[0], r[1], r[2]); r = r.map((v) => v / rl);
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const R = r.map((v, i) => cr * v + sr * u[i]), U = u.map((v, i) => -sr * r[i] + cr * v);
  const k = (H / 2) / Math.tan((FOV * Math.PI) / 360);
  const E = [ex, ey, ez];
  return {
    E, f, r: R, u: U, k,
    project(p) {
      const d0 = p[0] - ex, d1 = p[1] - ey, d2 = p[2] - ez;
      const z = d0 * f[0] + d1 * f[1] + d2 * f[2];
      const zz = Math.max(z, 0.5);
      return [W / 2 + (d0 * R[0] + d1 * R[1] + d2 * R[2]) * k / zz, H / 2 - (d0 * U[0] + d1 * U[1] + d2 * U[2]) * k / zz, z];
    },
  };
}

// ---------------------------------------------------------------- scene
const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; };
const mv = (R, v) => [R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2], R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2], R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// laptop (fitted): hinge centre, yaw, lid tilt away from him; 31 x 21 cm lid
export const LAP = (() => {
  const Hc = [12.78, -23.73, 44.79], R = rotY(0.25), tilt = 0.27, LW = 31, LH = 21, D = 21.5;
  const ex = mv(R, [1, 0, 0]), ez = mv(R, [0, 0, 1]), up = add(mul([0, 1, 0], Math.cos(tilt)), mul(ez, Math.sin(tilt)));
  const hl = add(Hc, mul(ex, LW / 2)), hr = add(Hc, mul(ex, -LW / 2));
  const tl = add(hl, mul(up, LH)), tr = add(hr, mul(up, LH));
  const bl = add(hl, mul(ez, -D)), br = add(hr, mul(ez, -D));
  const lidN = [ez[0] * Math.cos(tilt) - 0, -Math.sin(tilt), ez[2] * Math.cos(tilt)]; // back-face normal (away from him)
  return { Hc, ex, ez, up, hl, hr, tl, tr, bl, br, LW, LH, D, lidN, thick: 0.7, base: 1.5 };
})();
// speaker (fitted): centre, yaw, 9.9 x 16.4 x 20 cm, front toward him
export const SPK = (() => {
  const c0 = [-24.86, -14.35, 55.03], R = rotY(-0.56), w = 9.92, h = 16.44, d = 12;
  // keep the fitted front face where it is (the fit used a 20 cm deep box): move the centre 4 cm toward the front
  const c = add(c0, mv(R, [0, 0, -4]));
  const P = (x, y, z) => add(c, mv(R, [x * w / 2, y * h / 2, z * d / 2]));
  return { c, R, w, h, d, P };
})();
export const DESK_Y = -25.3;

// boxes: [cx, cy, cz, w, h, d, yaw, value, seed] — cartons and shelving in the dark (placed by comparing renders)
const BOXES = [
  // shelving unit at his right front (post fitted at x -68.6, z 36.5), boards and stacked records
  [-68.6, -10, 36.5, 1.6, 90, 1.6, 0, 0.16, 1],
  [-68.6, -10, 96, 1.6, 90, 1.6, 0, 0.12, 2],
  [-86, 8, 66, 34, 1.4, 64, 0, 0.26, 3],
  [-86, 16, 60, 30, 14, 40, 0, 0.2, 4],
  [-86, -30, 66, 34, 1.4, 64, 0, 0.18, 5],
  [-92, -22, 50, 26, 14, 30, 0.1, 0.16, 6],
  // cartons on his right, behind the speaker line
  [-75, -8, -10, 36, 30, 34, 0.15, 0.2, 7],
  [-80, 22, -8, 32, 26, 30, -0.1, 0.17, 8],
  [-70, -40, 5, 40, 34, 36, 0.05, 0.14, 9],
  [-60, -12, -45, 34, 30, 30, 0.3, 0.16, 10],
  [-40, 20, -70, 40, 30, 30, 0.2, 0.12, 11],
  // cartons on the wall shelf in front of him (seen over the laptop at the end)
  [-10, 6, 108, 44, 22, 26, 0, 0.3, 12],
  [30, 10, 104, 30, 30, 26, 0.1, 0.28, 13],
  [60, -2, 100, 34, 36, 30, -0.1, 0.22, 14],
  [-45, -6, 96, 30, 30, 28, 0.2, 0.2, 15],
  [-8, 34, 110, 40, 26, 26, 0, 0.18, 16],
  [34, 38, 108, 30, 22, 26, 0, 0.16, 17],
  // the wall behind him (seen in the front view): dark racks
  [20, -10, -70, 150, 90, 8, 0, 0.03, 18],
  // cartons standing on the far side of the desk, behind the laptop and the speaker
  [-2, -12, 84, 38, 26, 22, 0.12, 0.34, 21],
  [30, -9, 80, 26, 32, 22, 0.2, 0.3, 22],
  [-46, -10, 82, 30, 30, 24, 0.05, 0.22, 23],
  [-80, -12, 70, 30, 26, 30, 0.0, 0.14, 24],
  // cartons on his left behind the owl side (seen at the end on the right)
  [70, -18, -30, 40, 36, 36, -0.2, 0.18, 19],
  [80, 20, -20, 34, 30, 34, 0.1, 0.14, 20],
];

function boxFaces(b) {
  const [cx, cy, cz, w, h, d, yaw, v, seed] = b;
  const R = rotY(yaw), c = [cx, cy, cz];
  const P = (x, y, z) => add(c, mv(R, [x * w / 2, y * h / 2, z * d / 2]));
  const n = (x, y, z) => mv(R, [x, y, z]);
  return [
    { q: [P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)], n: n(0, 0, 1) },
    { q: [P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1)], n: n(0, 0, -1) },
    { q: [P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1)], n: n(1, 0, 0) },
    { q: [P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1)], n: n(-1, 0, 0) },
    { q: [P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1)], n: n(0, 1, 0) },
  ].map((f, i) => ({ ...f, v, seed, grain: i === 4 ? "u" : "v" }));
}
// light: the lamp/screen glow over the desk between the laptop and the speaker; faces get a value from their normal
// and distance (the room stays deep black, as in the source: background mean 12–20/255, the desk pool 95–130)
const LAMP = [-8, 20, 42];
function shade(f) {
  const c = f.q.reduce((a, p) => add(a, mul(p, 0.25)), [0, 0, 0]);
  const L = [LAMP[0] - c[0], LAMP[1] - c[1], LAMP[2] - c[2]], ll = Math.hypot(...L);
  const lam = Math.max(0, (f.n[0] * L[0] + f.n[1] * L[1] + f.n[2] * L[2]) / ll);
  return f.v * (0.35 + 0.65 * lam) * Math.min(1.4, 70 / (ll + 20));
}

let ROOM = null;
function roomFaces() {
  if (ROOM) return ROOM;
  const faces = [];
  for (const b of BOXES) faces.push(...boxFaces(b));
  // speaker cabinet
  const S = SPK;
  const sp = [
    { q: [S.P(1, -1, -1), S.P(-1, -1, -1), S.P(-1, 1, -1), S.P(1, 1, -1)], n: mv(S.R, [0, 0, -1]), v: 0.16, kind: "spkFront", grain: "v" },
    { q: [S.P(1, -1, 1), S.P(1, -1, -1), S.P(1, 1, -1), S.P(1, 1, 1)], n: mv(S.R, [1, 0, 0]), v: 0.55, kind: "wood", grain: "v" },
    { q: [S.P(-1, -1, -1), S.P(-1, -1, 1), S.P(-1, 1, 1), S.P(-1, 1, -1)], n: mv(S.R, [-1, 0, 0]), v: 0.55, kind: "wood", grain: "v" },
    { q: [S.P(-1, 1, 1), S.P(1, 1, 1), S.P(1, 1, -1), S.P(-1, 1, -1)], n: mv(S.R, [0, 1, 0]), v: 0.4, grain: "u" },
  ];
  faces.push(...sp);
  // desk top and front edge
  faces.push({ q: [[-120, DESK_Y, 118], [80, DESK_Y, 118], [80, DESK_Y, 12], [-120, DESK_Y, 12]], n: [0, 1, 0], v: 1.0, kind: "desk", grain: "u" });
  faces.push({ q: [[-120, DESK_Y - 4, 12], [80, DESK_Y - 4, 12], [80, DESK_Y, 12], [-120, DESK_Y, 12]].reverse(), n: [0, 0, -1], v: 0.25, kind: "wood", grain: "u" });
  // walls (very dark)
  faces.push({ q: [[-160, -80, 125], [120, -80, 125], [120, 90, 125], [-160, 90, 125]].reverse(), n: [0, 0, -1], v: 0.025, grain: "v" });
  faces.push({ q: [[-125, -80, -120], [-125, -80, 125], [-125, 90, 125], [-125, 90, -120]].reverse(), n: [1, 0, 0], v: 0.025, grain: "v" });
  faces.push({ q: [[120, -80, -110], [-160, -80, -110], [-160, 90, -110], [120, 90, -110]].reverse(), n: [0, 0, 1], v: 0.025, grain: "v" });
  ROOM = faces;
  return faces;
}

// paint one face into the engraving plate: value from the light, knife direction along the face's grain
function paintFace(P, cam, f) {
  const Q = f.q.map((p) => cam.project(p));
  if (Q.some((p) => p[2] < 1)) return;
  const c = f.q.reduce((a, p) => add(a, mul(p, 0.25)), [0, 0, 0]);
  const toCam = [cam.E[0] - c[0], cam.E[1] - c[1], cam.E[2] - c[2]];
  if (f.n[0] * toCam[0] + f.n[1] * toCam[1] + f.n[2] * toCam[2] <= 0) return;
  const path = (g) => { g.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < 4; i++) g.lineTo(Q[i][0], Q[i][1]); g.closePath(); };
  const A = f.grain === "u" ? [Q[0], Q[1]] : [Q[0], Q[3]];
  const ang = Math.atan2(A[1][1] - A[0][1], A[1][0] - A[0][0]);
  if (f.kind === "desk") {
    // lit pool round the lamp point on the desk, falling off into the dark
    // measured (desk points unprojected at 22.48 and 23.04): lit from x -55 to -10, z 27-68, brightest near (-15, 45)
    const lc = cam.project([-22, DESK_Y, 44]), le = cam.project([-22 + 12, DESK_Y, 44]), lf = cam.project([-22, DESK_Y, 44 + 12]);
    const R = Math.max(30, 0.5 * (Math.hypot(le[0] - lc[0], le[1] - lc[1]) + Math.hypot(lf[0] - lc[0], lf[1] - lc[1])));
    P.fill(path, (g) => { const r = g.createRadialGradient(lc[0], lc[1], R * 0.05, lc[0], lc[1], R * 3); r.addColorStop(0, "rgb(230,230,230)"); r.addColorStop(0.33, "rgb(160,160,160)"); r.addColorStop(0.66, "rgb(55,55,55)"); r.addColorStop(1, "rgb(8,8,8)"); return r; }, ang, { spacing: 0.3, style: 0 });
    return;
  }
  const v = Math.max(0, Math.min(1, shade(f)));
  P.fill(path, v, ang, { spacing: f.kind === "wood" ? 0.3 : 0.42, style: 0 });
  P.o.strokeStyle = `rgba(230,228,222,${Math.min(0.5, 0.05 + v * 0.9)})`; P.o.lineWidth = 1.3; P.o.beginPath(); path(P.o); P.o.stroke();
}
function drawSpeakerFront(g, cam) {
  const S = SPK;
  const face = [S.P(1, -1, -1), S.P(-1, -1, -1), S.P(-1, 1, -1), S.P(1, 1, -1)];
  const P = face.map((p) => cam.project(p));
  if (P.some((p) => p[2] < 1)) return;
  const n = mv(S.R, [0, 0, -1]), c = S.c;
  if (n[0] * (cam.E[0] - c[0]) + n[2] * (cam.E[2] - c[2]) <= 0) return;
  // drivers: tweeter above a woofer; each a pale surround ring, a dark cone lit on its lower-left flank (the lamp
  // is low on the desk), and a small dust cap with a highlight — drawn in ink, not a shaded sphere
  const ringAt = (yy, rr, k) => { const q = []; for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; q.push(cam.project(S.P(Math.cos(a) * rr * k * S.h / S.w, yy + Math.sin(a) * rr * k, -1.01))); } return q; };
  const pathOf = (q) => { g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
  for (const [yy, rr] of [[0.52, 0.26], [-0.3, 0.42]]) {
    const outer = ringAt(yy, rr, 1), sur = ringAt(yy, rr, 0.86), cap = ringAt(yy - rr * 0.04, rr, 0.3);
    g.fillStyle = "#0b0b0b"; pathOf(outer); g.fill();
    g.strokeStyle = "rgba(210,210,205,0.75)"; g.lineWidth = 3.2; pathOf(outer); g.stroke();
    g.strokeStyle = "rgba(150,150,146,0.55)"; g.lineWidth = 2; pathOf(sur); g.stroke();
    // the cone: lit strokes on its lower-left flank, fanning from the cap to the surround
    g.save(); pathOf(sur); g.clip();
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.45 + 0.75 * i / (n - 1)), f = Math.sin(Math.PI * i / (n - 1));
      const p0 = cam.project(S.P(Math.cos(a) * rr * 0.32 * S.h / S.w, yy + Math.sin(a) * rr * 0.32, -1.01)), p1 = cam.project(S.P(Math.cos(a) * rr * 0.84 * S.h / S.w, yy + Math.sin(a) * rr * 0.84, -1.01));
      g.strokeStyle = `rgba(215,215,210,${(0.15 + 0.55 * f).toFixed(2)})`; g.lineWidth = 1.2 + 1.4 * f;
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
    }
    g.restore();
    g.fillStyle = "#1a1a1a"; pathOf(cap); g.fill();
    g.strokeStyle = "rgba(200,200,195,0.8)"; g.lineWidth = 1.8; pathOf(cap); g.stroke();
    const hc = cam.project(S.P(-rr * 0.08 * S.h / S.w, yy + rr * 0.06, -1.01));
    g.fillStyle = "rgba(240,240,235,0.85)"; g.beginPath(); g.arc(hc[0], hc[1], Math.max(1.5, Math.hypot(cap[0][0] - cap[16][0], cap[0][1] - cap[16][1]) * 0.12), 0, Math.PI * 2); g.fill();
  }
}

// ---------------------------------------------------------------- laptop
export function laptopQuads(cam) {
  const L = LAP;
  const pr = (p) => cam.project(p);
  return {
    lid: [L.tl, L.tr, L.hr, L.hl].map(pr),
    base: [L.hl, L.hr, L.br, L.bl].map(pr),
  };
}
// projective map of the unit square onto a quad (for the page on the screen)
function quadPt(q, u, v) { const a = lerp3(q[0], q[1], u), b = lerp3(q[3], q[2], u); return lerp3(a, b, v); }
function drawImageQuad(g, img, cam, q3, nx = 10, ny = 8) {
  const iw = img.width, ih = img.height;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const u0 = i / nx, u1 = (i + 1) / nx, v0 = j / ny, v1 = (j + 1) / ny;
    const p00 = cam.project(quadPt(q3, u0, v0)), p10 = cam.project(quadPt(q3, u1, v0)), p01 = cam.project(quadPt(q3, u0, v1)), p11 = cam.project(quadPt(q3, u1, v1));
    for (const [A, B, C, ua, va, ub, vb, uc, vc] of [[p00, p10, p01, u0, v0, u1, v0, u0, v1], [p11, p01, p10, u1, v1, u0, v1, u1, v0]]) {
      // affine from image triangle to screen triangle
      const x0 = ua * iw, y0 = va * ih, x1 = ub * iw, y1 = vb * ih, x2 = uc * iw, y2 = vc * ih;
      const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
      const a = ((B[0] - A[0]) * (y2 - y0) - (C[0] - A[0]) * (y1 - y0)) / den;
      const b = ((B[1] - A[1]) * (y2 - y0) - (C[1] - A[1]) * (y1 - y0)) / den;
      const c = ((C[0] - A[0]) * (x1 - x0) - (B[0] - A[0]) * (x2 - x0)) / den;
      const d = ((C[1] - A[1]) * (x1 - x0) - (B[1] - A[1]) * (x2 - x0)) / den;
      const e = A[0] - a * x0 - c * y0, f = A[1] - b * x0 - d * y0;
      g.save();
      g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.lineTo(C[0], C[1]); g.closePath();
      // grow the clip a hair to hide seams
      g.lineWidth = 1.2; g.strokeStyle = "rgba(0,0,0,0)";
      g.clip();
      g.setTransform(a, b, c, d, e, f);
      g.drawImage(img, 0, 0);
      g.restore();
    }
  }
}
// the laptop: back of the lid (dark, lit rim) when it faces the camera, else the screen with the page and the deck
let PAGE = null;
function laptopPage() {
  if (!PAGE) { PAGE = document.createElement("canvas"); PAGE.width = 1000; PAGE.height = 640; drawSoko(PAGE.getContext("2d"), 1000, 640); }
  return PAGE;
}
export function drawLaptop(g, cam, t = 99, page = laptopPage()) {
  const L = LAP;
  const P = (p) => cam.project(p);
  const lidC = lerp3(lerp3(L.tl, L.hr, 0.5), lerp3(L.tr, L.hl, 0.5), 0.5);
  const toCam = [cam.E[0] - lidC[0], cam.E[1] - lidC[1], cam.E[2] - lidC[2]];
  const backN = [L.ez[0] * Math.cos(0.27), -Math.sin(0.27), L.ez[2] * Math.cos(0.27)];
  const seesBack = backN[0] * toCam[0] + backN[1] * toCam[1] + backN[2] * toCam[2] > 0;
  const poly = (pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
  // base (deck) first
  const deck = [L.hl, L.hr, L.br, L.bl];
  const dP = deck.map(P);
  if (dP.every((p) => p[2] > 1)) {
    const up = cam.E[1] > L.Hc[1];
    if (up) {
      g.fillStyle = "#b9b8b3"; poly(dP); g.fill();
      // keys: a grid of dark caps
      g.fillStyle = "#1a1a1a";
      for (let j = 0; j < 6; j++) for (let i = 0; i < 14; i++) {
        const u0 = 0.07 + i * 0.062, v0 = 0.07 + j * 0.075;
        const q = [[u0, v0], [u0 + 0.052, v0], [u0 + 0.052, v0 + 0.062], [u0, v0 + 0.062]].map(([u, v]) => P(quadPt(deck, u, v)));
        poly(q); g.fill();
      }
      // trackpad
      g.strokeStyle = "rgba(60,60,60,0.8)"; g.lineWidth = 2;
      poly([[0.32, 0.6], [0.68, 0.6], [0.68, 0.94], [0.32, 0.94]].map(([u, v]) => P(quadPt(deck, u, v)))); g.stroke();
      g.strokeStyle = "rgba(30,30,30,0.9)"; g.lineWidth = 2.5; poly(dP); g.stroke();
    }
  }
  const lid = [L.tl, L.tr, L.hr, L.hl].map(P);
  if (lid.some((p) => p[2] < 1)) return;
  if (seesBack) {
    // the back of the lid in s02's style (its paintLaptop: black, a pale bevel band along the top edge with a thin dark
    // line in it, faint highlights); at the start of the arc the corners are pulled onto s02's lid (fading out by 21.2)
    const k = 1 - Math.max(0, Math.min(1, (t - 20.84) / 0.36));
    const q = lid.map((p) => [p[0], p[1]]);
    if (k > 0) { q[1][0] += LID_FIX.l[0] * k; q[1][1] += LID_FIX.l[1] * k; q[2][0] += LID_FIX.l[0] * k; q[2][1] += LID_FIX.l[1] * k; q[0][0] += LID_FIX.r[0] * k; q[0][1] += LID_FIX.r[1] * k; q[3][0] += LID_FIX.r[0] * k; q[3][1] += LID_FIX.r[1] * k; }
    lidBack02(g, q);
  } else {
    // screen side: bezel, lit display with the page
    g.fillStyle = "#0a0a0a"; poly(lid); g.fill();
    g.strokeStyle = "rgba(200,200,195,0.85)"; g.lineWidth = 3; poly(lid); g.stroke();
    const scr = [lerp3(lerp3(L.tl, L.tr, 0.035), lerp3(L.hl, L.hr, 0.035), 0.05), lerp3(lerp3(L.tl, L.tr, 0.965), lerp3(L.hl, L.hr, 0.965), 0.05),
      lerp3(lerp3(L.tl, L.tr, 0.965), lerp3(L.hl, L.hr, 0.965), 0.93), lerp3(lerp3(L.tl, L.tr, 0.035), lerp3(L.hl, L.hr, 0.035), 0.93)];
    if (page) { g.save(); g.globalAlpha = 0.82; g.filter = "blur(1.2px)"; drawImageQuad(g, page, cam, scr); g.restore(); }
  }
}

// s02's lid at the hold (world LAPTOP x 230–1888, top y 812, plus HOLD (-1.6, -1.1)) minus this lid's projection at
// 20.84: the screen-left (tr, hr) and screen-right (tl, hl) corner corrections
const LID_FIX = (() => {
  const c = camAt(20.84), L = LAP, P = (p) => c.project(p);
  const l = P(L.tr), r = P(L.tl);
  return { l: [228.4 - l[0], 810.9 - l[1]], r: [1886.4 - r[0], 810.9 - r[1]] };
})();
function lidBack02(g, q) {
  // q = [tl (screen-right top), tr (screen-left top), hr, hl]
  const A = q[1], B = q[0], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
  if (L < 2) return;
  const ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
  const gv = (v, a = 1) => { const c = Math.round(Math.max(0, Math.min(1, v)) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };
  g.save();
  g.beginPath(); g.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) g.lineTo(q[i][0], q[i][1]); g.closePath(); g.clip();
  g.transform(ux, uy, -uy, ux, A[0], A[1]);
  const r = 30, D = 3000;
  const shape = (c) => { c.moveTo(0, D); c.lineTo(0, r); c.quadraticCurveTo(0, 0, r, 0); c.lineTo(L - r, 0); c.quadraticCurveTo(L, 0, L, r); c.lineTo(L, D); c.closePath(); };
  g.beginPath(); shape(g); g.clip();
  g.fillStyle = "#040404"; g.fillRect(-10, -10, L + 20, D);
  g.fillStyle = gv(0.7); g.fillRect(8, 3, L - 16, 14);
  g.fillStyle = gv(0.3, 0.8); g.fillRect(8, 9, L - 16, 1.6);
  const rr = rng(501);
  g.lineCap = "round";
  for (let i = 0; i < 30; i++) {
    const x = 40 + rr() * (L - 80), y = 4 + rr() * 11, w = 30 + rr() * 90;
    g.strokeStyle = gv(0.95, 0.5); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.stroke();
  }
  g.strokeStyle = "#0b0b0b"; g.lineWidth = 3; g.beginPath(); g.moveTo(2, r + 10); g.lineTo(2, r * 0.4); g.quadraticCurveTo(2, 2, r * 0.4, 2); g.lineTo(L - r * 0.4, 2); g.quadraticCurveTo(L - 2, 2, L - 2, r * 0.4); g.lineTo(L - 2, r + 10); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- the backdrop behind him at the start of the arc
// s02's room plate as it stood at the hold, moved as the source's background moves: camtrack on the background left
// of his head gives +11 / +31 / +46 px (scale 0.995 / 0.990 / 0.982) at 20.92 / 21.00 / 21.08, after which the swing
// blurs it past tracking; the later values follow the camera's yaw rate. It fades out over 21.10–21.50 into the 3D
// room while the camera swings (the fitted 3D camera moves the far background far more than the source does).
const BDK = [[20.84, 0, 1], [20.92, 11, 0.995], [21.0, 31, 0.99], [21.08, 46, 0.982], [21.16, 64, 0.978], [21.24, 84, 0.974], [21.32, 106, 0.97], [21.4, 133, 0.966], [21.48, 164, 0.962], [21.56, 200, 0.958]];
export function drawBackdrop(g, cam, t, R, hold) {
  const a = 1 - Math.max(0, Math.min(1, (t - 21.1) / 0.4));
  if (a <= 0.01 || !R) return;
  let i = 1; while (i < BDK.length - 1 && BDK[i][0] < t) i++;
  const A = BDK[i - 1], B = BDK[i], f = Math.max(0, Math.min(1, (t - A[0]) / (B[0] - A[0])));
  const tx = A[1] + (B[1] - A[1]) * f, s = A[2] + (B[2] - A[2]) * f;
  const b = roomBlur(t);
  g.save(); g.globalAlpha = a; if (b > 0.4) g.filter = `blur(${b.toFixed(2)}px)`;
  g.translate(W / 2 + tx, H / 2); g.scale(s, s); g.translate(-W / 2, -H / 2);
  g.drawImage(R.c, R.x0 + hold[0], R.y0 + hold[1]);
  g.restore();
}

// ---------------------------------------------------------------- the room (everything but the laptop), engraved per frame
let PL = null, OUT = null;
export function drawRoom(g, cam, blur = 0, gain = 1) {
  if (!PL) { PL = new Plate(W, H, 1); OUT = document.createElement("canvas"); }
  PL.reset();
  const faces = roomFaces().map((f) => {
    const c = f.q.reduce((a, p) => add(a, mul(p, 0.25)), [0, 0, 0]);
    const d = [c[0] - cam.E[0], c[1] - cam.E[1], c[2] - cam.E[2]];
    return { f, depth: d[0] * cam.f[0] + d[1] * cam.f[1] + d[2] * cam.f[2] };
  }).sort((a, b) => b.depth - a.depth);
  for (const { f } of faces) {
    const Q = f.q.map((p) => cam.project(p));
    if (!Q.some((p) => p[2] < 1)) { PL.o.save(); PL.o.globalCompositeOperation = "destination-out"; PL.o.beginPath(); PL.o.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < 4; i++) PL.o.lineTo(Q[i][0], Q[i][1]); PL.o.closePath(); PL.o.fill(); PL.o.restore(); }
    paintFace(PL, cam, f);
    if (f.kind === "spkFront") drawSpeakerFront(PL.o, cam);
  }
  const cut = PL.engrave({ spacing: 4.6, seed: 13, contrast: 1.0 }, OUT);
  // the source room is motion-blurred while the camera swings: soften by the camera's angular speed
  const b = blur || 0, f = [];
  if (b > 0.4) f.push(`blur(${b.toFixed(2)}px)`);
  if (Math.abs(gain - 1) > 0.01) f.push(`brightness(${gain.toFixed(3)})`);
  if (f.length) { g.save(); g.filter = f.join(" "); g.drawImage(cut, 0, 0); g.restore(); }
  else g.drawImage(cut, 0, 0);
}
// the room's exposure along the arc: the source's background goes near black while the camera swings past his
// left side (top-left mean 6–9/255 at 21.56–22.12, render 12–23 before), then the lit shelving and speaker come in
// (27–32 on the left half at 22.28–22.36); a brightness gain on the engraved room, fitted to those means
const GAIN = [[21.3, 1], [21.5, 0.55], [21.8, 0.6], [21.95, 0.95], [22.14, 0.95], [22.26, 1.6], [22.4, 1.6], [22.52, 0.85], [22.84, 0.85]];
export function roomGain(t) {
  if (t <= GAIN[0][0]) return 1;
  for (let i = 1; i < GAIN.length; i++) if (t <= GAIN[i][0]) { const a = GAIN[i - 1], b = GAIN[i], f = (t - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * f; }
  return GAIN[GAIN.length - 1][1];
}
// camera swing speed (rad/s of yaw) -> blur px, as the source softens the room during the arc
export function roomBlur(t) {
  const a = spline(CAM, t - 0.02)[3], b = spline(CAM, t + 0.02)[3];
  return Math.min(5, Math.abs(b - a) / 0.04 * 2.6);
}
export function releaseRoom() { PL = null; OUT = null; PAGE = null; }
