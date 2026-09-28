import { platesB } from "../../src/shots/s18/shotB.js";
import { decodeInk, drawInk, fillCanvas, grey } from "../../src/shots/s18/inkdraw.js";
import { OWL_B } from "../../src/shots/s18/data/owlB.js";
import { boilMap, boilTone } from "../../src/shots/s18/boil.js";
const T = (f, n = 3) => { const a = performance.now(); for (let i = 0; i < n; i++) f(); return (performance.now() - a) / n; };
let out = null;
export const shot = { draw(ctx) {
  if (out) { console.log(out); return; }
  const r = {}, flush = () => ctx.getImageData(0, 0, 1, 1);
  const P = platesB(); ctx.drawImage(P.bg, 0, 0); ctx.drawImage(P.kb, -260, 0); flush();
  r.flush = T(() => flush());
  r.bgkb = T(() => { ctx.drawImage(P.bg, 0, 0); ctx.drawImage(P.kb, -260, 0); flush(); });
  const m = boilMap(1300, 0.8), tn = boilTone(1300, 0.08), opts = { map: m, tone: tn, wk: 0.85 };
  const bl = decodeInk(OWL_B.belly), fc = fillCanvas(bl, 4, 1);
  ctx.setTransform(1, 0, 0, 1, -146, -40); ctx.drawImage(fc.c, fc.x, fc.y); flush();
  r.bellyFill = T(() => { ctx.drawImage(fc.c, fc.x, fc.y); flush(); });
  r.bellyStrokes = T(() => { drawInk(ctx, bl, { ...opts, fills: false }); flush(); });
  r.bellyStrokesNoBoil = T(() => { drawInk(ctx, bl, { wk: 0.85, fills: false }); flush(); });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const pt = decodeInk(OWL_B.parts["1395"]);
  r.partsFills = T(() => { drawInk(ctx, pt, { ...opts, cache: false, low: 4, strokes: false }); flush(); });
  r.partsGrad = T(() => { drawInk(ctx, pt, { ...opts, cache: false, low: "grad", strokes: false }); flush(); });
  r.partsUnion = T(() => { drawInk(ctx, pt, { ...opts, cache: false, low: { union: 4 }, strokes: false }); flush(); });
  const fl = decodeInk(OWL_B.fly["1420"]);
  r.flyUnion = T(() => { drawInk(ctx, fl, { ...opts, cache: false, low: { union: 3 }, strokes: false }); flush(); });
  r.flyGrad = T(() => { drawInk(ctx, fl, { ...opts, cache: false, low: "grad", strokes: false }); flush(); });
  r.partsStrokes = T(() => { drawInk(ctx, pt, { ...opts, cache: false, fills: false }); flush(); });
  const flat = { ...pt, m: pt.m.map((M) => ({ ...M, f: 128 })), base: pt.base.map((M) => ({ ...M, f: 20 })), s: pt.s.map((M) => ({ ...M, f: 60 })) };
  r.partsFlat = T(() => { drawInk(ctx, flat, { cache: false, low: 4, strokes: false }); flush(); });
  r.partsFlatNoLow = T(() => { drawInk(ctx, flat, { cache: false, strokes: false }); flush(); });
  // simple op costs
  r.fill1big = T(() => { ctx.fillStyle = "#555"; ctx.beginPath(); ctx.ellipse(1100, 470, 500, 300, 0, 0, 7); ctx.fill(); flush(); });
  r.fill100small = T(() => { for (let i = 0; i < 100; i++) { ctx.fillStyle = grey(i); ctx.beginPath(); ctx.ellipse(100 + i * 20, 300, 6, 6, 0, 0, 7); ctx.fill(); } flush(); });
  r.clip10 = T(() => { for (let i = 0; i < 10; i++) { ctx.save(); ctx.beginPath(); ctx.ellipse(200 + i * 180, 470, 80, 80, 0, 0, 7); ctx.clip(); ctx.fillRect(0, 0, 2206, 946); ctx.restore(); } flush(); });
  out = JSON.stringify(r, (k, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v)); console.log(out);
} };
