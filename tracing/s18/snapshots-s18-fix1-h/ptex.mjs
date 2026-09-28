import { roomACanvas, setPlateTex } from "./src/shots/s18/shotA.js";
let init = false;
export const shot = { draw(ctx, local, t, s, n) { if (!init) { setPlateTex(n >= 10000); init = true; } ctx.drawImage(roomACanvas(), 0, 0); } };
