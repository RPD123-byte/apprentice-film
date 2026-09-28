// z-buffered flat preview of the s15 set at times t (half res): writes zr_<t>.raw (RGB) + prints JSON meta
import fs from "fs";
import { SETS, resolveT } from "/Users/computer/rootline/apprentice-film/src/shots/s15/sets.js";
import { viewOf } from "/Users/computer/rootline/apprentice-film/src/shots/s15/author.js";
const times = process.argv[2].split(",").map(Number);
const S = 0.5, W = Math.round(2206 * S), H = Math.round(946 * S);
const cache = new Map();
const setAt = (t) => { let s = SETS[0]; for (const x of SETS) if (t >= x.t0 - 1e-6) s = x; return s; };
for (const t0 of times) {
  const t = resolveT(t0), set = setAt(t);
  if (!cache.has(set.key)) cache.set(set.key, set.faces());
  const faces = cache.get(set.key);
  const v = viewOf(set.cam(t));
  const e = v.eye;
  const zb = new Float32Array(W * H).fill(1e9), rgb = new Uint8Array(W * H * 3), edge = new Uint8Array(W * H);
  // camera-space: project gives [sx, sy, depth]; clip triangles against near plane by subdividing crude: skip tris with any z<0.02 after splitting quads into a grid
  const tri = (A, B, C, col, fid) => {
    const minx = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]))), maxx = Math.min(W - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
    const miny = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]))), maxy = Math.min(H - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
    const d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
    if (Math.abs(d) < 1e-9) return;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5;
      const a = ((B[1] - C[1]) * (px - C[0]) + (C[0] - B[0]) * (py - C[1])) / d;
      const b = ((C[1] - A[1]) * (px - C[0]) + (A[0] - C[0]) * (py - C[1])) / d;
      const c = 1 - a - b;
      if (a < 0 || b < 0 || c < 0) continue;
      const iz = a / A[2] + b / B[2] + c / C[2];   // 1/z interpolates linearly in screen space
      const z = 1 / iz, k = y * W + x;
      if (z < zb[k]) { zb[k] = z; rgb[k * 3] = col[0]; rgb[k * 3 + 1] = col[1]; rgb[k * 3 + 2] = col[2]; edge[k] = (Math.min(a, b, c) < 0.0) ? 1 : 0; }
    }
  };
  let fid = 0;
  for (const f of faces) {
    fid++;
    const c = f.q.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    const dd = (c[0] - e[0]) * f.n[0] + (c[1] - e[1]) * f.n[1] + (c[2] - e[2]) * f.n[2];
    if (dd > 0 && f.style !== 1) continue;
    const dist = Math.hypot(c[0] - e[0], c[1] - e[1], c[2] - e[2]);
    const isFloor = f.n[1] > 0.5 && Math.max(...f.q.map((p) => p[1])) < 0.001;
    const kind = f.style === 1 ? [230, 80, 230] : f.n[1] > 0.5 ? (isFloor ? [110, 110, 110] : [80, 210, 80]) : Math.abs(f.n[2]) > 0.7 ? [40, 190, 250] : [70, 70, 235];
    const L = 1 / (1 + Math.pow(Math.max(dist - 0.25, 0) / 1.0, 2.6)) * Math.min(1.2, f.alb);
    const col = kind.map((x) => Math.min(255, Math.round(x * Math.max(0.1, L))));
    // subdivide the quad n x n so near-plane-crossing faces still draw their visible part
    const n = 8;
    const Q = (u, w) => [0, 1, 2].map((k) => f.q[0][k] * (1 - u) * (1 - w) + f.q[1][k] * u * (1 - w) + f.q[2][k] * u * w + f.q[3][k] * (1 - u) * w);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const P = [Q(i / n, j / n), Q((i + 1) / n, j / n), Q((i + 1) / n, (j + 1) / n), Q(i / n, (j + 1) / n)].map((p) => { const s = v.project(p); return [s[0] * S, s[1] * S, s[2]]; });
      if (P.some((p) => p[2] < 0.02)) continue;
      tri(P[0], P[1], P[2], col, fid); tri(P[0], P[2], P[3], col, fid);
    }
    // outline (face border), drawn later by python from polygons
  }
  // id-free edge map: depth discontinuities or colour changes
  for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) {
    const k = y * W + x;
    const dz = Math.abs(zb[k] - zb[k - 1]) + Math.abs(zb[k] - zb[k - W]);
    const dc = Math.abs(rgb[k * 3] - rgb[(k - 1) * 3]) + Math.abs(rgb[k * 3 + 2] - rgb[(k - 1) * 3 + 2]) + Math.abs(rgb[k * 3] - rgb[(k - W) * 3]) + Math.abs(rgb[k * 3 + 2] - rgb[(k - W) * 3 + 2]);
    edge[k] = (zb[k] < 5 && (dz > 0.02 * zb[k] || dc > 6)) ? 255 : 0;
  }
  fs.writeFileSync(`zr_${t0.toFixed(2)}.raw`, Buffer.concat([Buffer.from(rgb), Buffer.from(edge)]));
}
console.log(JSON.stringify({ W, H }));
