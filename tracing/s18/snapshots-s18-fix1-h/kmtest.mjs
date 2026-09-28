import { drawA, KM } from "./src/shots/s18/shotA.js";
export const shot = { draw(ctx, local, t, s, n) { const f = n % 10000; KM.mode = Math.floor(n / 10000); drawA(ctx, f); } };
