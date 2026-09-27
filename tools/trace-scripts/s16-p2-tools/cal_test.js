import { drawLevels, decode } from "/src/shots/s16/vec.js";
import * as C from "/snapshots/s16-p2-tools/cal_data.js";
export const shot = { draw(ctx, local, t) {
  const k = Math.round(t * 25) - 1000; const name = ["C0","C25","C40","C50"][k];
  ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle="#000"; ctx.fillRect(0,0,2206,946);
  drawLevels(ctx, decode(C[name]).L);
} };