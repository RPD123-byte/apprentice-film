// harness: n = 10000*mode + f. mode 1: the fly owl layer raw (unsoftened, grey base dropped) on black, 2: same on white,
// 3: plate only (bg + tipped keyboard)
import { drawOwlB, drawKeyboard, platesB, FLYK } from "./src/shots/s18/shotB.js";
export const shot = { draw(ctx, local, t, s, n) {
  const f = n % 10000, mode = Math.floor(n / 10000);
  ctx.fillStyle = mode === 2 ? "#fff" : "#000"; ctx.fillRect(0, 0, 2206, 946);
  if (mode === 3) { const P = platesB(); if (f <= 1417) ctx.drawImage(P.still, 0, 0); else { ctx.drawImage(P.bg, 0, 0); drawKeyboard(ctx, f); } return; }
  FLYK.raw = true; drawOwlB(ctx, f); FLYK.raw = false;
} };
