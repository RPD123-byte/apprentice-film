import { roomACanvas, drawOwlA } from "../../src/shots/s18/shotA.js";
import { decodeInk, drawInk, softHalf, fillCanvas } from "../../src/shots/s18/inkdraw.js";
import { OWL_A } from "../../src/shots/s18/data/owlA.js";
import { boilMap, boilTone } from "../../src/shots/s18/boil.js";
const T = (f, n = 3) => { const a = performance.now(); for (let i = 0; i < n; i++) f(); return (performance.now() - a) / n; };
let out = null;
export const shot = { draw(ctx) {
  if (out) { console.log(out); return; }
  const flush = () => ctx.getImageData(0, 0, 1, 1), r = {};
  roomACanvas(); drawOwlA(ctx, 1356); flush();
  r.plate = T(() => { ctx.drawImage(roomACanvas(), 0, 0); flush(); });
  r.owl = T(() => { drawOwlA(ctx, 1356); flush(); });
  r.owl2 = T(() => { drawOwlA(ctx, 1362); flush(); });
  const ph = decodeInk(OWL_A.phase.level), ft = decodeInk(OWL_A.feet["1356"]);
  const c = document.createElement("canvas"); c.width = 772; c.height = 672; const g = c.getContext("2d"); g.translate(-344, -44);
  const fc = fillCanvas(ph);
  r.fcblit = T(() => { g.drawImage(fc.c, fc.x, fc.y); ctx.drawImage(c, 0, 0); flush(); });
  const m = boilMap(1300, 0.8), tn = boilTone(1300, 0.08);
  r.strokes = T(() => { drawInk(g, ph, { fills: false, map: m, tone: tn }); ctx.drawImage(c, 0, 0); flush(); });
  r.strokesNoMap = T(() => { drawInk(g, ph, { fills: false }); ctx.drawImage(c, 0, 0); flush(); });
  r.feet = T(() => { drawInk(g, ft, { low: 4, cache: false, map: m }); ctx.drawImage(c, 0, 0); flush(); });
  r.soft = T(() => { softHalf(c, 1); ctx.drawImage(c, 0, 0); flush(); });
  r.blitsmall = T(() => { ctx.drawImage(c, 0, 0); flush(); });
  // raster micro-benchmarks
  r.rects = T(() => { for (let i = 0; i < 250; i++) { g.fillStyle = `rgb(${i},${i},${i})`; g.fillRect(400 + (i % 25) * 20, 100 + Math.floor(i / 25) * 20, 12, 3); } ctx.drawImage(c, 0, 0); flush(); });
  r.oneGroup = T(() => { g.beginPath(); for (const st of ph.d) { g.moveTo(st.x[0], st.y[0]); for (let i = 1; i < st.x.length; i++) g.lineTo(st.x[i], st.y[i] + st.w[i]); for (let i = st.x.length - 1; i >= 0; i--) g.lineTo(st.x[i], st.y[i]); g.closePath(); } g.fillStyle = "#444"; g.fill(); ctx.drawImage(c, 0, 0); flush(); });
  r.flushOnly = T(() => { flush(); });
  const t0 = performance.now(); for (let i = 0; i < 3; i++) drawInk(g, ph, { fills: false, map: m, tone: tn }); r.strokesNoFlush = (performance.now() - t0) / 3;
  r.n = [ph.d.length, ph.b.length, ft.m.length, ft.base.length, ft.d.length];
  out = JSON.stringify(r, (k, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v)); console.log(out);
} };
