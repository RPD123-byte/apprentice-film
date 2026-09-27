import { decodeInk, drawInk } from "../../src/shots/s18/inkdraw.js";
import { ROOM_A } from "../../src/shots/s18/data/roomA.js";
// frame number selects the part: 1 masses+specks, 2 dark strokes (on white), 3 bright strokes (on black)
export const shot = { draw(ctx, local, t) {
  const n = Math.round((t - 0.012) * 25), D = decodeInk(ROOM_A);
  if (n === 1) { D.d = []; D.b = []; D.o = []; ctx.fillStyle = "#000"; }
  if (n === 2) { D.m = []; D.s = []; D.b = []; D.o = []; ctx.fillStyle = "#fff"; }
  if (n === 3) { D.m = []; D.s = []; D.d = []; D.o = []; ctx.fillStyle = "#000"; }
  ctx.fillRect(0, 0, 2206, 946);
  drawInk(ctx, D, { wk: [0.85, 1] });
} };
