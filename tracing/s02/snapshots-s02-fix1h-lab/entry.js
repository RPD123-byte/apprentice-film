// s02 r3 scratch lab (not part of the film): paints s02 frames at exact frame times, graded by the film's own post.js.
import { createPost } from "./src/lib/post.js";
import { shot } from "./src/shots/s02.js";
const W = 2206, H = 946;
const out = document.getElementById("out");
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
const grade = createPost(out);
function frame(t, graded = true) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none"; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const t0 = performance.now();
  shot.draw(ctx, t - 6.04, t);
  const ms = performance.now() - t0;
  ctx.restore();
  if (!graded) return { url: paint.toDataURL("image/png"), ms };
  grade(paint, t, { fade: 1, ...(shot.grade ? shot.grade(t - 6.04, t) : {}) });
  return { url: out.toDataURL("image/png"), ms };
}
window.LAB = { frame, shot, ctx, paint };
import { __lab } from "./src/shots/s02/hand/shot.js";
window.__labsoft = (a, k) => __lab.soft(a, k);
window.__labgain = (g) => { __lab.gain = g; };
window.LABready = true;
