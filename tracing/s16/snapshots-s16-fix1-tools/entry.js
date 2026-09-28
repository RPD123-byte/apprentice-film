// s16 fix1 scratch harness entry (not part of the film): exact 25 fps frames, raw and through the real grade
import { shot } from "../../src/shots/s16.js";
import { createPost } from "../../src/lib/post.js";
import { TUNE as RTUNE, ENGRAVE } from "../../src/shots/s16/room.js";
import { TUNE as OTUNE, owlLayer } from "../../src/shots/s16/owl.js";
const W = 2206, H = 946;
const out = document.getElementById("out");
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
const grade = createPost(out);
function raw(n) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const t = n / 25;
  const s = shot, st = 45.72;
  ctx.save(); s.draw(ctx, t - st, t); ctx.restore();
  return paint;
}
window.S16H = {
  raw,
  graded(n, grain = true) { raw(n); grade(paint, n / 25, grain ? {} : { grain: 0 }); return out; },
  timeRaw(n) { const a = performance.now(); raw(n); return performance.now() - a; },
  set(v) { globalThis.__S16 = v; if (shot.release) shot.release(); },
  shot,
  ENGRAVE,
  owl(id) { return owlLayer(id).c; },
  tune(r, o) { Object.assign(RTUNE, r || {}); Object.assign(OTUNE, o || {}); if (shot.release) shot.release(); },
};
window.S16ready = Promise.resolve(true);
