// dev: paint only an s07 hands layer (unwarped, unmasked) at its box (pre-grade checks); ?base=1 -> the B1_ layer
import { paintTraced } from "/src/shots/s07/tracekit.js";
import * as HD from "/src/shots/s07/data/hands.js";
const b1 = new URLSearchParams(location.search).get("base") === "1";
let p = null;
export const shot = { draw(ctx) {
  const [x0, y0, x1, y1] = HD.BOX;
  if (!p) {
    let D = HD;
    if (b1) { D = { BLUR: HD.BLUR }; for (const k of ["ZN", "ZP", "ZC", "BROAD", "SHAPES", "FINE", "CORR", "TEX"]) if (HD["B1_" + k]) D[k] = HD["B1_" + k]; }
    p = paintTraced(D, x1 - x0, y1 - y0, { x0, y0 });
  }
  ctx.drawImage(p, x0, y0);
} };
