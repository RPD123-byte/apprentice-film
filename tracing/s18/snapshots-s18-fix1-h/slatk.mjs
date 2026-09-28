import { drawB, SLATK } from "./src/shots/s18/shotB.js";
let init = false;
export const shot = { draw(ctx, local, t, s, n) { if (!init) { SLATK.rate = [1 / 6, 0, 1 / 12][Math.floor(n / 10000)]; init = true; } drawB(ctx, n % 10000); } };
