// dump projected faces of the s15 set active at each time t (camera from the set's path, dups resolved as in s15.js)
import { SETS, resolveT } from "/Users/computer/rootline/apprentice-film/src/shots/s15/sets.js";
import { viewOf } from "/Users/computer/rootline/apprentice-film/src/shots/s15/author.js";
const times = process.argv[2].split(",").map(Number);
const out = {};
const cache = new Map();
for (const t0 of times) {
  const t = resolveT ? resolveT(t0) : t0;
  let set = SETS[0]; for (const x of SETS) if (t >= x.t0 - 1e-6) set = x;
  if (!cache.has(set.key)) cache.set(set.key, set.faces());
  const faces = cache.get(set.key);
  const v = viewOf(set.cam(t));
  const polys = [];
  for (const f of faces) {
    // clip against the near plane crudely: skip faces with any vertex behind
    const P = f.q.map((p) => v.project(p));
    if (P.some((p) => p[2] < 0.03)) continue;
    const c = f.q.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    const e = v.eye; const dd = (c[0] - e[0]) * f.n[0] + (c[1] - e[1]) * f.n[1] + (c[2] - e[2]) * f.n[2];
    if (dd > 0 && f.style !== 1) continue;
    const dist = Math.hypot(c[0] - e[0], c[1] - e[1], c[2] - e[2]);
    polys.push({ p: P.map((q) => [Math.round(q[0]), Math.round(q[1])]), z: dist, k: f.style === 1 ? 1 : f.n[1] > 0.5 ? 2 : Math.abs(f.n[2]) > 0.7 ? 3 : 0, a: f.alb, tag: f.tag || "", fl: f.n[1] > 0.5 && Math.max(...f.q.map((p) => p[1])) < 0.001 });
  }
  out[t0.toFixed(2)] = { set: set.key, polys };
}
console.log(JSON.stringify(out));
