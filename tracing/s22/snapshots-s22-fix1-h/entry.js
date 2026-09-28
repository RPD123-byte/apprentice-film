// s22 pass-4 scratch harness (not part of the film): paints s22 at time t and applies the film grade (post.js)
import { shot } from "./src/shots/s22.js";
import { createPost } from "./src/lib/post.js";
const W = 2206, H = 946;
const out = document.getElementById("out");
const grade = createPost(out);
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
window.R = (t, o = {}) => {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const T0 = performance.now();
  shot.draw(ctx, t - 74.52, t, shot);
  const ms = performance.now() - T0;
  ctx.restore();
  if (o.raw) return { url: paint.toDataURL("image/png"), ms };
  grade(paint, t, { fade: 1 });
  return { url: out.toDataURL("image/png"), ms };
};
window.S22 = shot;
window.ready = (async () => {
  await Promise.all(["900 100px Archivo", "400 20px Geist", "600 20px Geist", "500 20px 'Geist Mono'", "400 20px Fraunces", "700 20px Fraunces",
    "900 100px 'Fraunces Soft'", "800 40px Satoshi", "400 40px Shrikhand", "500 20px Poppins", "600 20px Poppins", "700 20px Poppins"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  return true;
})();
