import { platesB, TRACK_B } from "../../src/shots/s18/shotB.js";
import { decodeInk, drawInk, fillCanvas, grey } from "../../src/shots/s18/inkdraw.js";
import { OWL_B } from "../../src/shots/s18/data/owlB.js";
import { boilMap, boilTone } from "../../src/shots/s18/boil.js";
let out = null, D = null;
export const shot = { draw(ctx) {
  if (out) { console.log(out); return; }
  const flush = () => ctx.getImageData(0, 0, 1, 1);
  if (!D) D = { belly: decodeInk(OWL_B.belly), tail: decodeInk(OWL_B.tail), wing: decodeInk(OWL_B.wing.down), parts: {} };
  const acc = {};
  const T = (k, f) => { const a = performance.now(); f(); flush(); acc[k] = (acc[k] || 0) + performance.now() - a; };
  const P = platesB(); flush();
  const frames = [1395, 1400, 1405, 1390, 1395, 1400, 1405, 1390];
  for (let pass = 0; pass < 2; pass++) { if (pass === 1) for (const k in acc) acc[k] = 0;
  for (const f of frames) {
    const m = boilMap(f, 0.8), tn = boilTone(f, 0.08), opts = { map: m, tone: tn, wk: 0.85 };
    T("bg", () => ctx.drawImage(P.bg, 0, 0));
    T("kb", () => ctx.drawImage(P.kb, -260, 0));
    const r = TRACK_B[f - 1382];
    T("tailFill", () => { const A = OWL_B.tailA[f]; ctx.save(); ctx.setTransform(A[0][0], A[1][0], A[0][1], A[1][1], A[0][2], A[1][2]); const fc = fillCanvas(D.tail, 4, 1); ctx.drawImage(fc.c, fc.x, fc.y); drawInk(ctx, D.tail, { ...opts, fills: false }); ctx.restore(); });
    T("bellyFill", () => { ctx.save(); ctx.setTransform(1, 0, 0, 1, r[1], r[2] - 45); const fc = fillCanvas(D.belly, 4, 1); ctx.drawImage(fc.c, fc.x, fc.y); ctx.restore(); });
    T("bellyStrokes", () => { ctx.save(); ctx.setTransform(1, 0, 0, 1, r[1], r[2] - 45); drawInk(ctx, D.belly, { ...opts, fills: false }); ctx.restore(); });
    T("wingFill", () => { ctx.save(); ctx.setTransform(1, 0, 0, 1, r[1], r[2] - 45); const fc = fillCanvas(D.wing, 4, 1); ctx.drawImage(fc.c, fc.x, fc.y); ctx.restore(); });
    T("wingStrokes", () => { ctx.save(); ctx.setTransform(1, 0, 0, 1, r[1], r[2] - 45); drawInk(ctx, D.wing, { ...opts, fills: false }); ctx.restore(); });
    T("tailStrokes", () => { const A = OWL_B.tailA[f]; ctx.save(); ctx.setTransform(A[0][0], A[1][0], A[0][1], A[1][1], A[0][2], A[1][2]); drawInk(ctx, D.tail, { ...opts, fills: false }); ctx.restore(); });
    T("wing", () => { ctx.save(); ctx.setTransform(1, 0, 0, 1, r[1], r[2] - 45); const fc = fillCanvas(D.wing, 4, 1); ctx.drawImage(fc.c, fc.x, fc.y); drawInk(ctx, D.wing, { ...opts, fills: false }); ctx.restore(); });
    const pt = D.parts[f] || (D.parts[f] = decodeInk(OWL_B.parts[f]));
    T("partsFills", () => drawInk(ctx, pt, { ...opts, cache: false, low: "grad", strokes: false }));
    T("partsStrokes", () => drawInk(ctx, pt, { ...opts, cache: false, fills: false }));
    T("empty", () => {});
  } }
  for (const k in acc) acc[k] = Math.round(acc[k] / frames.length);
  acc.sizes = [fillCanvas(D.belly).c.width, fillCanvas(D.belly).c.height, fillCanvas(D.wing).c.width, fillCanvas(D.wing).c.height, fillCanvas(D.tail).c.width, fillCanvas(D.tail).c.height, D.wing.d.length, D.wing.b.length, D.tail.d.length, D.wing.m.length, D.wing.base.length];
  out = JSON.stringify(acc); console.log(out);
} };
