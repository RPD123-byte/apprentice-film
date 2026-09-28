import { decodeInk, ringsBBox } from "/Users/computer/rootline/apprentice-film/src/shots/s18/inkdraw.js";
import { OWL_B } from "/Users/computer/rootline/apprentice-film/src/shots/s18/data/owlB.js";
for (const n of ["1419", "1420", "1421", "1423"]) {
  const D = decodeInk(OWL_B.fly[n]);
  const bb = (M) => ringsBBox(M.rings);
  const baseSmall = D.base.slice(1).map((M) => { const b = bb(M); return [Math.max(b[2] - b[0], b[3] - b[1]), M.f]; }).filter(([s]) => s < 12);
  const mSmall = D.m.map((M) => { const b = bb(M); return Math.max(b[2] - b[0], b[3] - b[1]); }).filter((s) => s < 12);
  const dlen = D.d.map((st) => { let L = 0; for (let i = 1; i < st.x.length; i++) L += Math.hypot(st.x[i] - st.x[i - 1], st.y[i] - st.y[i - 1]); return [L, st.tone, st.w[0]]; });
  console.log(n, "base0 f", JSON.stringify(D.base[0].f), "small base parts", baseSmall.length, JSON.stringify(baseSmall.slice(0, 6).map(([s, f]) => [s.toFixed(1), typeof f === "number" ? f : f[0]])),
    "small masses", mSmall.length, "short dark strokes (<6px)", dlen.filter(([L]) => L < 6).length, "of", dlen.length);
}
