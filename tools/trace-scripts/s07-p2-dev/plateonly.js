// dev: paint only the s07 static plate (pre-grade checks)
import { paintTraced } from "/src/shots/s07/tracekit.js";
import * as PLATE from "/src/shots/s07/data/plate.js";
let p = null;
export const shot = { draw(ctx) { if (!p) p = paintTraced(PLATE, 2206, 946); ctx.drawImage(p, 0, 0); } };
