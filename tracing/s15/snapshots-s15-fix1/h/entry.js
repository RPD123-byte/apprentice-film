// s15 scratch harness (not part of the film): render s15 frames + the global grade, no server (file://)
import { createPost } from "../../../src/lib/post.js";
import { shot } from "../../../src/shots/s15.js";
import { W, H } from "../../../src/config.js";
const out = document.getElementById("out");
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
const grade = createPost(out);
window.S15 = {
  render(t, raw) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    const T = performance.now();
    shot.draw(ctx, t - 40.72, t, shot);
    ctx.restore();
    window.__ms = performance.now() - T;
    if (raw) return paint.toDataURL("image/png");
    grade(paint, t, { fade: 1 });
    return out.toDataURL("image/png");
  },
};
window.S15ready = true;
