import { decodeInk, drawInk, softHalf, ringsBBox } from "../../src/shots/s18/inkdraw.js";
import { OWL_B } from "../../src/shots/s18/data/owlB.js";
export const shot = { draw(ctx) {
  const fl = decodeInk(OWL_B.fly["1420"]);
  const L = document.createElement("canvas"); L.width = 2206; L.height = 946; const g = L.getContext("2d");
  drawInk(g, fl, { cache: false, low: "grad" });
  const a = g.getImageData(0, 0, 2206, 946).data; let n = 0; for (let i = 3; i < a.length; i += 4) if (a[i] > 0) n++;
  const bb = ringsBBox(fl.base[0].rings);
  console.log("DBG opaque px after draw", n, "bbox", JSON.stringify(bb.map(Math.round)), "base0 f", JSON.stringify(fl.base[0].f), "rings", fl.base[0].rings.length);
  softHalf(L, 1, 1, [bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]]);
  const b = g.getImageData(0, 0, 2206, 946).data; n = 0; for (let i = 3; i < b.length; i += 4) if (b[i] > 0) n++;
  console.log("DBG opaque px after soft", n);
  ctx.drawImage(L, 0, 0);
} };
