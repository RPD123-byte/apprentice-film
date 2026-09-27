import { shot, __lab } from "./src/shots/s02/hand/shot.js";
const W = 2206, H = 946;
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
function frame(t) {
  __lab.only = { owlOnly: true, chars: true, room: false };
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  shot.draw(ctx, t - 6.04, t); ctx.restore();
  return { url: paint.toDataURL("image/png"), ms: 0 };
}
window.LAB = { frame, wt: (o) => __lab.wt(o) }; window.LABready = true;
