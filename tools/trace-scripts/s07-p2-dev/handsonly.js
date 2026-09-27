// dev: paint only the s07 hands base layer (unwarped, unmasked) at its box (pre-grade checks)
import { paintTraced } from "/src/shots/s07/tracekit.js";
import * as HD from "/src/shots/s07/data/hands.js";
let p = null;
export const shot = { draw(ctx) { const [x0, y0, x1, y1] = HD.BOX; if (!p) p = paintTraced(HD, x1 - x0, y1 - y0, { x0, y0 }); ctx.drawImage(p, x0, y0); } };
