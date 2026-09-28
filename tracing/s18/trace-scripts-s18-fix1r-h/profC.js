import { decodeInk, fillCanvas } from "../../src/shots/s18/inkdraw.js";
import { OWL_B } from "../../src/shots/s18/data/owlB.js";
const T = (f, n = 5) => { const a = performance.now(); for (let i = 0; i < n; i++) f(); return (performance.now() - a) / n; };
let out = null;
export const shot = { draw(ctx) {
  if (out) { console.log(out); return; }
  const r = {}, flush = () => ctx.getImageData(0, 0, 1, 1);
  const wg = decodeInk(OWL_B.wing.down), fc = fillCanvas(wg, 4, 1);
  const cp = document.createElement("canvas"); cp.width = fc.c.width; cp.height = fc.c.height; cp.getContext("2d").drawImage(fc.c, 0, 0);
  const pl = document.createElement("canvas"); pl.width = fc.c.width; pl.height = fc.c.height; const pg = pl.getContext("2d"); pg.fillStyle = "#777"; pg.fillRect(0, 0, pl.width, pl.height);
  const id = fc.c.getContext("2d").getImageData(0, 0, fc.c.width, fc.c.height);
  const pu = document.createElement("canvas"); pu.width = fc.c.width; pu.height = fc.c.height; pu.getContext("2d").putImageData(id, 0, 0);
  for (const c of [fc.c, cp, pl, pu]) ctx.drawImage(c, 0, 0); flush();
  r.fillCanvas = T(() => { ctx.drawImage(fc.c, 100, 100); flush(); });
  r.copy = T(() => { ctx.drawImage(cp, 100, 100); flush(); });
  r.plain = T(() => { ctx.drawImage(pl, 100, 100); flush(); });
  r.putData = T(() => { ctx.drawImage(pu, 100, 100); flush(); });
  r.fillCanvasSub = T(() => { ctx.drawImage(fc.c, 100.5, 100.5); flush(); });
  r.flush = T(() => flush());
  r.size = [fc.c.width, fc.c.height];
  out = JSON.stringify(r, (k, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v)); console.log(out);
} };
