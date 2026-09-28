// s16 review-2 harness (scratch, not part of the film): exact 25 fps frames through the real grade
import { shot } from "../../src/shots/s16.js";
import { shot as s15 } from "../../src/shots/s15.js";
import { shot as s17 } from "../../src/shots/s17.js";
import { createPost } from "../../src/lib/post.js";
const W = 2206, H = 946;
const out = document.getElementById("out");
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
const grade = createPost(out);
function pick(t) { return t < 45.72 - 1e-6 ? [s15, 40.72] : t < 47.84 - 1e-6 ? [shot, 45.72] : [s17, 47.84]; }
function frame(n, grain) {
  const t = n / 25;
  const [s, st] = pick(t);
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  s.draw(ctx, t - st, t); ctx.restore();
  grade(paint, t, grain ? {} : { grain: 0 });
  return out;
}
function raw(n) {
  const t = n / 25; const [s, st] = pick(t);
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  s.draw(ctx, t - st, t); ctx.restore(); return paint;
}
window.REV = { frame, raw };
window.REVready = true;
