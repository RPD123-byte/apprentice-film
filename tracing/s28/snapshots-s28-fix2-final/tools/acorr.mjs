// key A orbit correction: anchors on key A's left/back hood outline (129.32 px) and, per time, their displacement onto
// the source's silhouette mapped back through the key-A track (intersection along the outline normal).
import fs from "fs";
import { trackMap, invert } from "../../src/shots/s28/drawn/trackmap.js";
const lines = fs.readFileSync("snapshots/s28-fix2-work/srccontA.txt", "utf8").trim().split("\n");
const Q = {};
for (const ln of lines) {
  const i1 = ln.indexOf(" "), i2 = ln.indexOf(" ", i1 + 1); const t = ln.slice(0, i1); const P = JSON.parse(ln.slice(i2 + 1));
  const keep = [P[0]]; let bottom = false;
  for (let i = 1; i < P.length; i++) { const p = P[i]; if (p[1] > 800) bottom = true; if (bottom && p[1] < 790) break; keep.push(p); }
  const f = trackMap("A", +t);
  Q[t] = keep.map(([x, y]) => invert(f, x, y));
}
// key A's outline: the shoulder top from (733,278) leftwards, down the back/left side to the bottom
const K = [[733, 278], [701, 288], [676, 269], [620, 262], [528, 257], [434, 264], [392, 295], [350, 336], [320, 382], [290, 455],
  [260, 510], [225, 590], [200, 660], [165, 720], [130, 780], [120, 822], [250, 806], [265, 860], [300, 862], [342, 876], [420, 868]];
const A = []; let acc = 0;
for (let i = 1; i < K.length; i++) {
  const [x0, y0] = K[i - 1], [x1, y1] = K[i], L = Math.hypot(x1 - x0, y1 - y0);
  let s = 45 - acc;
  while (s <= L) { const u = s / L; A.push({ p: [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u], d: [x1 - x0, y1 - y0] }); s += 45; }
  acc = (acc + L) % 45;
}
const C = [520, 560];
function isect(P, n, poly) {
  let best = null;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1], b = poly[i], ex = b[0] - a[0], ey = b[1] - a[1], den = n[0] * ey - n[1] * ex;
    if (Math.abs(den) < 1e-9) continue;
    const s = ((a[0] - P[0]) * ey - (a[1] - P[1]) * ex) / den, u = ((a[0] - P[0]) * n[1] - (a[1] - P[1]) * n[0]) / den;
    if (u < 0 || u > 1 || Math.abs(s) > 120) continue;
    if (best === null || Math.abs(s) < Math.abs(best)) best = s;
  }
  return best;
}
console.log("anchors", JSON.stringify(A.map((a) => a.p.map(Math.round))));
for (const t in Q) {
  const D = A.map(({ p, d }) => {
    const L = Math.hypot(d[0], d[1]); let n = [-d[1] / L, d[0] / L];
    if ((p[0] - C[0]) * n[0] + (p[1] - C[1]) * n[1] < 0) n = [-n[0], -n[1]];
    const s = isect(p, n, Q[t]);
    return s === null ? null : [Math.round(n[0] * s), Math.round(n[1] * s)];
  });
  console.log(t, JSON.stringify(D));
}
