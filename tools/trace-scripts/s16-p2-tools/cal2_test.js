import { drawStrokes, decode } from "/src/shots/s16/vec.js";
import { S } from "/snapshots/s16-p2-tools/cal2_data.js";
export const shot = { draw(ctx) { ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle="rgb(153,153,153)"; ctx.fillRect(0,0,2206,946); drawStrokes(ctx, decode(S).D, false); } };