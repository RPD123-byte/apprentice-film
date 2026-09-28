import { roomPlate, litFloor } from "./src/shots/s19/draw/room.js";
export function room(ctx, a = {}) {
  ctx.drawImage(roomPlate(), 0, 0);
  if (a.lit) { ctx.save(); ctx.globalCompositeOperation = "lighten"; ctx.drawImage(litFloor(), 0, 0); ctx.restore(); }
}
import { warpCardShutter } from "./src/shots/s19/card.js";
export function card(ctx, a = {}) { const c = warpCardShutter([a.t || 57.36], 2206, 946); ctx.drawImage(c.canvas, 0, 0, c.w, c.h, c.x, c.y, c.w, c.h); }
import { drawOwl19 } from "./src/shots/s19/draw/owl.js";
let OC = null;
export function owlc(a) {
  if (!OC) { OC = document.createElement("canvas"); OC.width = 2206; OC.height = 946; }
  const g = OC.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 2206, 946);
  drawOwl19(g, a.t); return OC;
}
import { owlShadow19 } from "./src/shots/s19/draw/owl.js";
export function shadowOf(a) { return owlShadow19(a.t); }
