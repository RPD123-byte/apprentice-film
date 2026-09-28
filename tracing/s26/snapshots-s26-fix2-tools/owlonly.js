// scratch shot for the s26c harness: the C/D owl alone on black (measurement renders, not part of the film)
import { drawOwlCD } from "/src/shots/s26/owlCD.js";
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
let L = null;
export const shot = {
  draw(ctx, local, t) {
    if (!L) L = mk(8, 8);
    const F = Math.round(t * 25);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 2206, 946);
    drawOwlCD(ctx, Math.max(2791, Math.min(2847, F)), { canvas: L });
  },
};
