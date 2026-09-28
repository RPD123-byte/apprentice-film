import { drawA, KM } from "./src/shots/s18/shotA.js";
export const shot = { draw(ctx, local, t, s, n) { const f = n % 10000, m = Math.floor(n / 10000); KM.mode = 12; KM.only = ["P", "C"][m]; drawA(ctx, f); } };
