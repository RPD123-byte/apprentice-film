// dump projected face outlines of the s15 set at times t (for a quick wireframe-over-source check)
import { SETS } from "../../../src/shots/s15/sets.js";
import { viewOf } from "../../../src/shots/s15/author.js";
const times = process.argv[2].split(",").map(Number);
const out = {};
const DUPS = [40.92, 41.68, 41.92, 42.68, 42.88, 43.68, 43.88, 44.68, 44.84, 45.68];
const cache = new Map();
for (let t of times) {
  for (const d of DUPS) if (Math.abs(t - d) < 0.005) t = t - 0.04;
  let set = SETS[0]; for (const x of SETS) if (t >= x.t0 - 1e-6) set = x;
  if (!cache.has(set.key)) { const src = SETS.find((s) => s.key === set.key && s.faces); cache.set(set.key, src.faces()); }
  const faces = cache.get(set.key);
  const v = viewOf(set.cam(t));
  const polys = [];
  for (const f of faces) {
    const P = f.q.map((p) => v.project(p));
    if (P.some((p) => p[2] < 0.05)) continue;
    // cull back faces
    const c = f.q.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    const e = v.eye; const dd = (c[0] - e[0]) * f.n[0] + (c[1] - e[1]) * f.n[1] + (c[2] - e[2]) * f.n[2];
    if (dd > 0 && f.style !== 1) continue;
    polys.push({ p: P.map((q) => [Math.round(q[0]), Math.round(q[1])]), z: Math.min(...P.map((q) => q[2])), k: f.style === 1 ? 1 : f.n[1] > 0.5 ? 2 : Math.abs(f.n[2]) > 0.7 ? 3 : 0 });
  }
  out[t.toFixed(2)] = { set: set.key, polys };
}
console.log(JSON.stringify(out));
