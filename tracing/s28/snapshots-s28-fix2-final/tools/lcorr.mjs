// key L orbit correction: per time, displacement (locked px) of anchors on the key's left/back outline onto the source's
// silhouette mapped back through the key-L track (intersection along the outline normal).
import fs from "fs";
const Q = JSON.parse(fs.readFileSync("snapshots/s28-fix2-work/backmapped.json", "utf8"));
const HOODTOP = [[507,506],[524,506],[554,472],[581,449],[600,426],[620,411],[627,403],[639,381],[650,370],[668,361],[690,332],[712,305],[764,271],[804,243],[838,233],[853,233],[879,236]];
const HL = JSON.parse(process.argv[2]);
const K = [...HOODTOP.slice().reverse(), ...HL.slice(1)];      // from the top right, down the back and the sleeve
// anchors every ~45 px of arc along K
const A = []; let acc = 0;
A.push({ p: K[0], i: 0 });
for (let i = 1; i < K.length; i++) {
  const [x0, y0] = K[i - 1], [x1, y1] = K[i]; const L = Math.hypot(x1 - x0, y1 - y0);
  let s = 45 - acc;
  while (s <= L) { const u = s / L; A.push({ p: [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u], d: [x1 - x0, y1 - y0] }); s += 45; }
  acc = (acc + L) % 45;
}
const C = [900, 620];
function isect(P, n, poly) {
  let best = null;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1], b = poly[i];
    const ex = b[0] - a[0], ey = b[1] - a[1];
    const den = n[0] * ey - n[1] * ex; if (Math.abs(den) < 1e-9) continue;
    const s = ((a[0] - P[0]) * ey - (a[1] - P[1]) * ex) / den;
    const u = ((a[0] - P[0]) * n[1] - (a[1] - P[1]) * n[0]) / den;
    if (u < 0 || u > 1 || Math.abs(s) > 160) continue;
    if (!best || Math.abs(s) < Math.abs(best)) best = s;
  }
  return best;
}
const out = {};
for (const t of Object.keys(Q)) {
  out[t] = A.map(({ p, d }) => {
    if (!d) return null;
    const L = Math.hypot(d[0], d[1]); let n = [-d[1] / L, d[0] / L];
    if ((p[0] - C[0]) * n[0] + (p[1] - C[1]) * n[1] < 0) n = [-n[0], -n[1]];
    const s = isect(p, n, Q[t]);
    return s === null ? null : [Math.round(n[0] * s), Math.round(n[1] * s)];
  });
}
console.log("anchors", JSON.stringify(A.map((a) => a.p.map(Math.round))));
for (const t in out) console.log(t, JSON.stringify(out[t]));
