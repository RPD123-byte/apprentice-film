import { shot, __lab } from "./src/shots/s02/hand/shot.js";
import { DY } from "./src/shots/s02/hand/designer.js";
const W = 2206, H = 946;
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
function frame(t) {
  __lab.only = { desOnly: true, chars: true };
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  shot.draw(ctx, t - 6.04, t); ctx.restore();
  return { url: paint.toDataURL("image/png"), ms: 0 };
}
function alpha(look) {
  const D = __lab.des(look), c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const m = document.createElement("canvas"); m.width = D.width; m.height = D.height; const mg = m.getContext("2d");
  mg.drawImage(D, 0, 0); mg.globalCompositeOperation = "source-in"; mg.fillStyle = "#fff"; mg.fillRect(0, 0, m.width, m.height);
  g.drawImage(m, 0, -DY);
  return c.toDataURL("image/png");
}
window.LAB = { frame, alpha, desCanvas(look) { const D = __lab.des(look); return D.toDataURL("image/png"); }, desAlpha(look) { const D = __lab.des(look); const m = document.createElement("canvas"); m.width = D.width; m.height = D.height; const g = m.getContext("2d"); g.drawImage(D, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = "#fff"; g.fillRect(0, 0, m.width, m.height); return m.toDataURL("image/png"); }, prof() { globalThis.__NOTONE = true; const t0 = performance.now(); const D = __lab.des(false); const t1 = performance.now(); const g = D.getContext("2d"); g.getImageData(0, 0, 1, 1); const t2 = performance.now(); const c = document.createElement("canvas"); c.width = 10; c.height = 10; c.getContext("2d").drawImage(D, 0, 0, 10, 10); c.getContext("2d").getImageData(0, 0, 1, 1); return [t1 - t0, t2 - t1, performance.now() - t2]; } }; window.LABready = true;
