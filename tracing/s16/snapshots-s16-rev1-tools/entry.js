// s16 review harness (scratch, not part of the film): exact 25 fps frames through the real grade
import { shot } from "../../src/shots/s16.js";
import { shot as s15 } from "../../src/shots/s15.js";
import { createPost } from "../../src/lib/post.js";
const W = 2206, H = 946;
const out = document.getElementById("out");
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
const grade = createPost(out);
function frame(n) {
  const t = n / 25;
  const s = t < 45.72 ? s15 : shot, st = t < 45.72 ? 40.72 : 45.72;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  s.draw(ctx, t - st, t, s); ctx.restore();
  grade(paint, t, { fade: 1 });
  return out;
}
window.REV = { frame };
window.REVready = true;
