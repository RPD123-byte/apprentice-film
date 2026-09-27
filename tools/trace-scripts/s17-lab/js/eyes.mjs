// print the eye placement (frame px) the renderer uses for the owl at film times
import { owlFrame } from "../../../src/shots/s17/owl.js";
import { headGeom } from "../../../src/lib/owlInk.js";
const ts = process.argv.slice(2).map(Number);
for (const t of ts) {
  const P = owlFrame(t); if (!P) { console.log(t, "none"); continue; }
  const H = headGeom(P.head), E = P.eyes, s = P.s;
  const toF = ([ux, uy]) => [P.x + s * ux, P.y + s * uy];
  const out = [-1, 1].map((sd) => {
    const q = H.P(sd * (E.spread ?? 0.4) + (E.az ?? 0), E.el ?? -0.1);
    const nz = Math.max(0.05, q.nz), r = (E.r ?? 27) * (1 - 0.3 * (1 - nz)), sx = 0.3 + 0.7 * nz;
    const f = toF([q.x, q.y]);
    return `(${f[0].toFixed(1)},${f[1].toFixed(1)}) r=(${(r * sx * s - 0.7).toFixed(1)},${(r * s - 0.7).toFixed(1)}) nz=${nz.toFixed(2)}`;
  });
  const bq = H.P(P.beak.az ?? 0, P.beak.el ?? -0.45, P.beak.lift ?? 1.05), b = toF([bq.x, bq.y]);
  console.log(t.toFixed(2), "L", out[0], " R", out[1], " beak", b.map((v) => v.toFixed(1)).join(","), "head", toF([P.head.x, P.head.y]).map((v) => v.toFixed(1)).join(","), "hr", (P.head.ry * s).toFixed(1));
}
