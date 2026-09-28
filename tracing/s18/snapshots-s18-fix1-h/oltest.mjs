import { drawA, KM } from "./src/shots/s18/shotA.js";
let init = false;
export const shot = { draw(ctx, local, t, s, n) { if (!init) { const m = Math.floor(n / 10000); if (m === 1) KM.outline = false; if (m === 2) { KM.ow = 2.0; KM.ov = 60; } init = true; } drawA(ctx, n % 10000); } };
