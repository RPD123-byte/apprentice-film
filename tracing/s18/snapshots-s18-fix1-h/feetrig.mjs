// harness: draws FEET_A[f] rigs (registered coords) on black; n = frame
import { FEET_A } from "./src/shots/s18/data/feetA.js";
import { drawFoot } from "./src/shots/s18/handdraw.js";
import { softHalf } from "./src/shots/s18/inkdraw.js";
export const shot = { draw(ctx, local, t, s, n) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 2206, 946);
  for (const F of FEET_A[n] || []) drawFoot(ctx, F, softHalf);
} };
