// dump camera-space face polygons (near-clipped) of the s15 sets at times t -> JSON on stdout
import { SETS, resolveT } from "../../src/shots/s15/sets.js";
import { viewOf } from "../../src/shots/s15/author.js";
const times = process.argv[2].split(",").map(Number);
const only = process.argv[3] || null;   // optional set key to force
const cache = new Map();
const out = {};
for (const t0 of times) {
  const t = resolveT(Math.ceil(t0 * 25 - 1e-6) / 25);
  let set = SETS[0]; for (const x of SETS) if (t >= x.t0 - 1e-6) set = x;
  if (only) set = SETS.find((s) => s.key === only);
  if (!cache.has(set.key)) cache.set(set.key, set.faces());
  const stat = cache.get(set.key);
  const faces = stat.dyn ? stat.concat(stat.dyn(t)) : stat;
  const c = set.cam(t), v = viewOf(c);
  const polys = [];
  faces.forEach((f, id) => {
    // camera-space z via project (returns [sx, sy, z]); clip in 3D against z > 0.03
    let P = f.q.map((p) => ({ p, z: v.project(p)[2] }));
    const near = 0.03, clip = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      if (a.z >= near) clip.push(a.p);
      if ((a.z >= near) !== (b.z >= near)) { const s = (near - a.z) / (b.z - a.z); clip.push(a.p.map((x, k) => x + (b.p[k] - x) * s)); }
    }
    if (clip.length < 3) return;
    const S = clip.map((p) => v.project(p));
    // back-face cull (pictures are two-sided)
    const cc = f.q.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4, a[2] + p[2] / 4], [0, 0, 0]);
    const e = v.eye, dd = (cc[0] - e[0]) * f.n[0] + (cc[1] - e[1]) * f.n[1] + (cc[2] - e[2]) * f.n[2];
    if (dd > 0 && f.style !== 1) return;
    const kind = f.style === 1 ? "pic" : f.n[1] > 0.5 ? (f.ink === 0 ? "floor" : "top") : Math.abs(f.n[2]) > 0.7 ? "front" : "side";
    polys.push({ id, s: S.map((q) => [+q[0].toFixed(1), +q[1].toFixed(1), +q[2].toFixed(4)]), kind, alb: f.alb, kb: f.kb, fk: f.fk, q: f.q });
  });
  out[t0.toFixed(2)] = { set: set.key, t, eye: c.eye, yaw: c.yaw, pitch: c.pitch, roll: c.roll, polys };
}
process.stdout.write(JSON.stringify(out));
