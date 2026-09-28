import { drawB, FLYK } from "./src/shots/s18/shotB.js";
export const shot = { draw(ctx, local, t, s, n) { const m = Math.floor(n / 10000); if (m === 3) FLYK.noSc = true; if (m === 4) FLYK.ramp = 0; drawB(ctx, n % 10000); } };
