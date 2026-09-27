// print the head rig (frame px) the renderer uses at film times: head top/right, band top, cups, beak, plaster
import { owlFrame } from "../../../src/shots/s17/owl.js";
import { headGeom, headphoneGeom } from "../../../src/lib/owlInk.js";
const f1 = (v) => v.toFixed(1);
for (const t of process.argv.slice(2).map(Number)) {
  const P = owlFrame(t), s = P.s, H = headGeom(P.head);
  const F = ([x, y]) => [P.x + s * x, P.y + s * y];
  const out = H.out.map(F);
  const top = out.reduce((a, b) => (b[1] < a[1] ? b : a)), right = out.reduce((a, b) => (b[0] > a[0] ? b : a)), left = out.reduce((a, b) => (b[0] < a[0] ? b : a));
  const hp = headphoneGeom(H, P.headphones), band = hp.band.map((b) => F(b.p));
  const btop = band.reduce((a, b) => (b[1] < a[1] ? b : a));
  const cups = hp.cups.map((c) => { const q = F([c.x, c.y]); return `(${f1(q[0])},${f1(q[1])} z${c.z.toFixed(2)} side${c.side})`; });
  const B = P.beak, bq = H.P(B.az ?? 0, B.el ?? -0.45, B.lift ?? 1.05), bb = F([bq.x, bq.y]);
  const pl = P.plaster, pq = H.P(pl.az ?? 0, pl.el ?? 0.9, 1.0), pp = F([pq.x, pq.y]);
  console.log(t.toFixed(2), "head c", F([P.head.x, P.head.y]).map(f1).join(","), "top", top.map(f1).join(","), "L", left.map(f1).join(","), "R", right.map(f1).join(","), "| band top", btop.map(f1).join(","), "ends", band[0].map(f1).join(","), band[band.length - 1].map(f1).join(","), "| cups", cups.join(" "), "r", f1(P.headphones.r * s), "| beak", bb.map(f1).join(","), "w", f1(B.w * s * 0.8), "l", f1(B.l * s * 0.8), "| plaster", pp.map(f1).join(","), f1(pl.w * s));
}
