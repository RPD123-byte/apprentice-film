import { decodeInk, drawInk } from "../../src/shots/s18/inkdraw.js";
import { OWL_B } from "../../src/shots/s18/data/owlB.js";
const T = (f, n = 3) => { const a = performance.now(); for (let i = 0; i < n; i++) f(); return (performance.now() - a) / n; };
let out = null;
export const shot = { draw(ctx) {
  if (out) { console.log(out); return; }
  const r = {}, flush = () => ctx.getImageData(0, 0, 1, 1);
  const L = document.createElement("canvas"); L.width = 2206; L.height = 946; const g = L.getContext("2d");
  const pt = decodeInk(OWL_B.parts["1395"]);
  // count what the batched fills do
  let nf = 0, nc = 0, big = [];
  const bb = (rs) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of rs) for (let i = 0; i < q.length; i += 2) { x0 = Math.min(x0, q[i]); x1 = Math.max(x1, q[i]); y0 = Math.min(y0, q[i + 1]); y1 = Math.max(y1, q[i + 1]); } return (x1 - x0) * (y1 - y0); };
  for (const L2 of [pt.base, pt.m, pt.s]) for (const M of L2) { if (typeof M.f !== "number" && bb(M.rings) >= 2500) big.push([L2 === pt.base ? "base" : L2 === pt.m ? "m" : "s", Math.round(bb(M.rings)), M.f[0], M.rings.length, M.rings.reduce((a, q) => a + q.length / 2, 0)]); }
  r.big = big;
  r.base0 = [pt.base[0].rings.length, pt.base[0].rings.reduce((a, q) => a + q.length / 2, 0)];
  r.fillsOnly = T(() => { drawInk(g, pt, { cache: false, low: 4, strokes: false }); ctx.drawImage(L, 0, 0); flush(); });
  const flat = { ...pt, m: pt.m.map((M) => ({ ...M, f: 128 })), base: pt.base.map((M) => ({ ...M, f: 20 })), s: pt.s.map((M) => ({ ...M, f: 60 })) };
  r.fillsFlat = T(() => { drawInk(g, flat, { cache: false, low: 4, strokes: false }); ctx.drawImage(L, 0, 0); flush(); });
  const onlyBase0 = { ...pt, m: [], s: [], base: pt.base.slice(0, 1) };
  r.base0only = T(() => { drawInk(g, onlyBase0, { cache: false, low: 4, strokes: false }); ctx.drawImage(L, 0, 0); flush(); });
  r.blit = T(() => { ctx.drawImage(L, 0, 0); flush(); });
  out = JSON.stringify(r, (k, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v)); console.log(out);
} };
