import { shot as S } from "../../src/shots/s18.js";
import { platesB } from "../../src/shots/s18/shotB.js";
import { decodeInk, drawInk, softHalf } from "../../src/shots/s18/inkdraw.js";
import { OWL_B } from "../../src/shots/s18/data/owlB.js";
const T = (f) => { const a = performance.now(); f(); return performance.now() - a; };
let out = null;
export const shot = { draw(ctx) {
  if (out) { console.log(out); return; }
  const r = {};
  const flush = () => ctx.getImageData(0, 0, 1, 1);
  r.build = T(() => { platesB(); });
  const P = platesB();
  r.bg = T(() => { ctx.drawImage(P.bg, 0, 0); flush(); });
  r.kb = T(() => { ctx.drawImage(P.kb, -260, 0); flush(); });
  r.full1395a = T(() => { S.draw(ctx, 0, 1395 / 25 + 0.012); flush(); });
  r.full1395b = T(() => { S.draw(ctx, 0, 1395 / 25 + 0.012); flush(); });
  const L = document.createElement("canvas"); L.width = 2206; L.height = 946; const g = L.getContext("2d");
  r.clear = T(() => { g.clearRect(0, 0, 2206, 946); ctx.drawImage(L, 0, 0); flush(); });
  const bl = decodeInk(OWL_B.belly);
  drawInk(g, bl, {});
  r.belly = T(() => { drawInk(g, bl, {}); ctx.drawImage(L, 0, 0); flush(); });
  const pt = decodeInk(OWL_B.parts["1395"]);
  r.parts = T(() => { drawInk(g, pt, { cache: false }); ctx.drawImage(L, 0, 0); flush(); });
  r.soft = T(() => { softHalf(L, 1); ctx.drawImage(L, 0, 0); flush(); });
  r.drawL = T(() => { ctx.drawImage(L, 0, 0); flush(); });
  out = JSON.stringify(r, (k, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v));
  console.log(out);
} };
