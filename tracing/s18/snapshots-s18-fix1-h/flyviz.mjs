import { OWL_B } from "./src/shots/s18/data/owlB.js";
import { decodeInk, drawInk } from "./src/shots/s18/inkdraw.js";
// mode 0: base only, 1: base+m, 2: m only, 3: all (no soft)
export const shot = { draw(ctx, local, t, s, n) {
  const f = n % 10000, mode = Math.floor(n / 10000);
  ctx.fillStyle = "#204080"; ctx.fillRect(0, 0, 2206, 946);
  const D = decodeInk(OWL_B.fly[f]); const E = [];
  const sel = [{ ...D, m: E, s: E, d: E, b: E, o: E }, { ...D, s: E, d: E, b: E, o: E }, { ...D, base: E, s: E, d: E, b: E, o: E }, D][mode];
  drawInk(ctx, sel, {});
} };
