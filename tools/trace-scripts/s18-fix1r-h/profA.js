import { decodeInk, drawInk, softHalf } from "../../src/shots/s18/inkdraw.js";
import { OWL_A } from "../../src/shots/s18/data/owlA.js";
import { OWL_B } from "../../src/shots/s18/data/owlB.js";
import { boilMap, boilTone } from "../../src/shots/s18/boil.js";
const T = (f) => { const a = performance.now(); f(); return performance.now() - a; };
let out = null;
export const shot = { draw(ctx) {
  if (out) { console.log(out); return; }
  const r = {};
  const ph = decodeInk(OWL_A.phase.level), ft = decodeInk(OWL_A.feet["1356"]);
  const c = document.createElement("canvas"); c.width = 772; c.height = 672; const g = c.getContext("2d");
  g.translate(-344, -44);
  r.first = T(() => drawInk(g, ph, {}));
  r.plain = T(() => { for (let i = 0; i < 5; i++) drawInk(g, ph, {}); }) / 5;
  const m = boilMap(1300, 0.8), tn = boilTone(1300, 0.08);
  r.boil = T(() => { for (let i = 0; i < 5; i++) drawInk(g, ph, { map: m, tone: tn }); }) / 5;
  r.feet = T(() => { for (let i = 0; i < 5; i++) drawInk(g, ft, { cache: false }); }) / 5;
  r.soft = T(() => { for (let i = 0; i < 5; i++) softHalf(c, 1); }) / 5;
  const cw = document.createElement("canvas"); cw.width = 772; cw.height = 672; const gw = cw.getContext("2d", { willReadFrequently: true }); gw.translate(-344, -44);
  drawInk(gw, ph, {});
  r.wrf = T(() => { for (let i = 0; i < 5; i++) drawInk(gw, ph, {}); }) / 5;
  r.softwrf = T(() => { for (let i = 0; i < 5; i++) softHalf(cw, 1); }) / 5;
  // parts of B
  const pt = decodeInk(OWL_B.parts["1395"]), bl = decodeInk(OWL_B.belly);
  const cb = document.createElement("canvas"); cb.width = 2206; cb.height = 946; const gb = cb.getContext("2d");
  r.partsB = T(() => drawInk(gb, pt, { cache: false }));
  r.partsB2 = T(() => drawInk(gb, pt, { cache: false }));
  r.bellyFirst = T(() => drawInk(gb, bl, {}));
  r.belly = T(() => drawInk(gb, bl, { map: m, tone: tn }));
  r.softB = T(() => softHalf(cb, 1));
  r.counts = { phase: [ph.m.length, ph.d.length, ph.b.length, ph.s.length, ph.base.length], parts: [pt.m.length, pt.d.length, pt.b.length, pt.s.length, pt.base.length] };
  out = JSON.stringify(r, (k, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v));
  console.log(out);
} };
