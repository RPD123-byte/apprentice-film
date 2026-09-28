import { createPost } from "./src/lib/post.js";
import { paintDesigner } from "./src/shots/s02/designer.js";
const W = 2206, H = 946;
const out = document.getElementById("out");
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
const grade = createPost(out);
function frame(t, graded = true) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const t0 = performance.now(); paintDesigner(ctx); const ms = performance.now() - t0;
  if (!graded) return { url: paint.toDataURL("image/png"), ms };
  grade(paint, t, { fade: 1 });
  return { url: out.toDataURL("image/png"), ms };
}
window.LAB = { frame }; window.LABready = true;
