import { shot } from "../../../src/shots/s15.js";
import { W, H } from "../../../src/config.js";
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const ctx = paint.getContext("2d");
window.S15 = {
  time(t) {
    const T = performance.now();
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    shot.draw(ctx, t - 40.72, t, shot);
    ctx.getImageData(0, 0, 1, 1);
    return performance.now() - T;
  },
};
window.S15ready = true;
