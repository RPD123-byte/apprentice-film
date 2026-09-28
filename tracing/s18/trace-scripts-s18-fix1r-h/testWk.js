import { decodeInk, drawInk, softHalf } from "../../src/shots/s18/inkdraw.js";
import { ROOM_A } from "../../src/shots/s18/data/roomA.js";
const V = [[0.85, 1], [0.92, 1], [0.78, 1], [0.85, 1.08], [0.85, 0.92], [0.78, 1.08]];
let D = null; const c = document.createElement("canvas"); c.width = 2206; c.height = 946;
export const shot = { draw(ctx, local, t) {
  const n = Math.round((t - 0.012) * 25), v = Math.floor(n / 10000);
  if (!D) D = decodeInk(ROOM_A);
  const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, 2206, 946);
  drawInk(g, D, { wk: V[v] }); softHalf(c, 1);
  ctx.drawImage(c, 0, 0);
} };
