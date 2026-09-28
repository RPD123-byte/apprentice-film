// scratch: draw only the C/D owl of the source frame at t (for overlays in python)
import { drawOwlCD } from "/src/shots/s26/owlCD.js";
export const shot = { draw(ctx, local, t) { const F = Math.round(t * 25); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 2206, 946); drawOwlCD(ctx, F); } };
