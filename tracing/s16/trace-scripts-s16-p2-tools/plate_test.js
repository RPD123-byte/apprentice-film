import { plateCanvas, drawIrises, M } from "/src/shots/s16/scene.js";
export const shot = {
  draw(ctx, local, t) {
    const F = Math.ceil(t * 25 - 0.01);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(plateCanvas(), -M, -M);
    drawIrises(ctx, F);
  },
};
