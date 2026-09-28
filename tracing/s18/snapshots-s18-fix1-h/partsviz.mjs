import { OWL_B } from "./src/shots/s18/data/owlB.js";
import { decodeInk, drawInk } from "./src/shots/s18/inkdraw.js";
export const shot = { draw(ctx, local, t, s, n) {
  const f = n % 10000, mode = Math.floor(n / 10000);
  ctx.fillStyle = "#3060a0"; ctx.fillRect(0, 0, 2206, 946);
  const D = decodeInk(mode === 1 ? OWL_B.belly : mode === 2 ? OWL_B.wing[OWL_B.state[f]] : OWL_B.parts[f]);
  if (mode === 1 || mode === 2) { const TR = {1416: [-589, -32]}; ctx.translate(TR[f][0], TR[f][1] - 45); }
  drawInk(ctx, D, {});
} };
