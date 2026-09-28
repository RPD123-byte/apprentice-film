import { decodeInk, ringsBBox } from "/Users/computer/rootline/apprentice-film/src/shots/s18/inkdraw.js";
import { OWL_B } from "/Users/computer/rootline/apprentice-film/src/shots/s18/data/owlB.js";
for (const [n, v] of Object.entries(OWL_B.fly)) {
  const D = decodeInk(v);
  const area = (M) => { const b = ringsBBox(M.rings); return (b[2] - b[0]) * (b[3] - b[1]); };
  const val = (M) => typeof M.f === "number" ? M.f : (Array.isArray(M.f) ? M.f[0] : "?");
  const sp = D.s.map((M) => [area(M), val(M)]);
  const small = sp.filter(([a]) => a < 60);
  console.log(n, "base", D.base.length, "m", D.m.length, "s", D.s.length, "small<60", small.length, "d", D.d.length, "b", D.b.length, "o", D.o.length,
    "vals", small.slice(0, 8).map(([a, v]) => `${a.toFixed(0)}:${typeof v === "number" ? v.toFixed(0) : v}`).join(" "));
}
