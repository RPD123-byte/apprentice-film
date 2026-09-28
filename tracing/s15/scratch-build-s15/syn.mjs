// synthetic pair fits for the render geometry: visible surface samples (coarse z-buffer, lit range only, owl masked)
// projected at t and t+dt, similarity fit (robust).  usage: node syn.mjs T0 T1 STEP
import { SETS, resolveT } from "/Users/computer/rootline/apprentice-film/src/shots/s15/sets.js";
import { viewOf } from "/Users/computer/rootline/apprentice-film/src/shots/s15/author.js";
import { owlTrack } from "/Users/computer/rootline/apprentice-film/src/shots/s15/track.js";
const [T0, T1, ST] = process.argv.slice(2).map(Number);
const W = 2206, H = 946, R = 8, w = Math.ceil(W / R), h = Math.ceil(H / R);
const cache = new Map();
const setAt = (t) => { let s = SETS[0]; for (const x of SETS) if (t >= x.t0 - 1e-6) s = x; return s; };
function samples(set, t) {
  if (!cache.has(set.key)) cache.set(set.key, set.faces());
  const faces = cache.get(set.key);
  const v = viewOf(set.cam(t));
  const zb = new Float32Array(w * h).fill(1e9), pt = new Array(w * h);
  for (const f of faces) {
    const q = f.q;
    // subdivide face into a grid of points and splat (simple, dense enough)
    const P0 = v.project(q[0]), P1 = v.project(q[1]), P2 = v.project(q[2]), P3 = v.project(q[3]);
    if ([P0, P1, P2, P3].every((p) => p[2] < 0.03)) continue;
    const span = Math.max(Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), Math.hypot(P2[0] - P3[0], P2[1] - P3[1]), Math.hypot(P3[0] - P0[0], P3[1] - P0[1]), Math.hypot(P2[0] - P1[0], P2[1] - P1[1]));
    const n = Math.min(160, Math.max(2, Math.ceil(Math.min(span, 4000) / (R * 1.2))));
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const a = i / n, b = j / n;
      const p = [0, 1, 2].map((k) => q[0][k] * (1 - a) * (1 - b) + q[1][k] * a * (1 - b) + q[2][k] * a * b + q[3][k] * (1 - a) * b);
      const s = v.project(p);
      if (s[2] < 0.05) continue;
      const x = Math.floor(s[0] / R), y = Math.floor(s[1] / R);
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const d = Math.hypot(p[0] - v.eye[0], p[1] - v.eye[1], p[2] - v.eye[2]);
      if (d < zb[y * w + x]) { zb[y * w + x] = d; pt[y * w + x] = { p, d, fl: f.n[1] > 0.5 && p[1] < 0.01 }; }
    }
  }
  return { zb, pt, v };
}
function fit(A, B) {
  // similarity with rotation, robust trimmed LS
  let idx = A.map((_, i) => i);
  let M = null;
  for (let it = 0; it < 6; it++) {
    let mx = 0, my = 0, nx = 0, ny = 0;
    for (const i of idx) { mx += A[i][0]; my += A[i][1]; nx += B[i][0]; ny += B[i][1]; }
    mx /= idx.length; my /= idx.length; nx /= idx.length; ny /= idx.length;
    let sxx = 0, sxy = 0, ss = 0;
    for (const i of idx) { const ax = A[i][0] - mx, ay = A[i][1] - my, bx = B[i][0] - nx, by = B[i][1] - ny; sxx += ax * bx + ay * by; sxy += ax * by - ay * bx; ss += ax * ax + ay * ay; }
    const a = sxx / ss, b = sxy / ss;
    M = { a, b, tx: nx - (a * mx - b * my), ty: ny - (b * mx + a * my) };
    const res = A.map((p, i) => Math.hypot(M.a * p[0] - M.b * p[1] + M.tx - B[i][0], M.b * p[0] + M.a * p[1] + M.ty - B[i][1]));
    const sorted = [...res].sort((x, y) => x - y), thr = Math.max(3, sorted[Math.floor(sorted.length * 0.5)] * 1.5);
    idx = A.map((_, i) => i).filter((i) => res[i] < thr);
  }
  const s = Math.hypot(M.a, M.b), r = Math.atan2(M.b, M.a) * 180 / Math.PI;
  return { s, r, tx: M.tx, ty: M.ty, n: idx.length };
}
for (let t = T0; t < T1 - 1e-6; t += ST) {
  const ta = resolveT(+t.toFixed(2)), tb = resolveT(+(t + ST).toFixed(2));
  const set = setAt(ta), setb = setAt(tb);
  if (set !== setb) { console.log(`${t.toFixed(2)} set change ${set.key}->${setb.key}`); continue; }
  const { pt, v } = samples(set, ta);
  const vb = viewOf(set.cam(tb));
  const o = owlTrack(ta);
  const A = [], B = [];
  for (let k = 0; k < pt.length; k++) {
    const q = pt[k]; if (!q || q.d > 3.0) continue;
    const x = (k % w) * R, y = Math.floor(k / w) * R;
    if (Math.abs(x - o[1]) < o[3] * 0.8 && y > o[2] - o[4] * 1.2 && y < o[2] + o[4] * 1.1) continue;
    if (q.fl && (k % 3)) continue;   // the floor is weakly textured: fewer features
    const a = v.project(q.p), b = vb.project(q.p);
    if (b[2] < 0.05 || b[0] < 0 || b[0] > W || b[1] < 0 || b[1] > H) continue;
    A.push(a); B.push(b);
  }
  if (A.length < 20) { console.log(`${t.toFixed(2)} few`); continue; }
  const F = fit(A, B);
  const fp = Math.abs(1 - F.s) > 0.01 ? [F.tx / (1 - F.s), F.ty / (1 - F.s)] : [0, 0];
  console.log(`${t.toFixed(2)}->${(t + ST).toFixed(2)} R: ${F.s.toFixed(3)} rot${F.r >= 0 ? "+" : ""}${F.r.toFixed(2)} fp=(${fp[0].toFixed(0)},${fp[1].toFixed(0)}) n=${F.n}`);
}
