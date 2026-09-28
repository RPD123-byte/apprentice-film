// test module (harness only): n = 10000*mode + frame; mode 0 full, 1 plate only, 2 owl on black, 3 owl on white
import { roomACanvas, drawOwlA } from "./src/shots/s18/shotA.js";
import { platesB, drawOwlB, drawB, drawKeyboard } from "./src/shots/s18/shotB.js";
import { drawA } from "./src/shots/s18/shotA.js";
export const shot = {
  draw(ctx, local, t, s, n) {
    const mode = Math.floor(n / 10000), f = n % 10000;
    if (mode === 0) { if (f < 1382) drawA(ctx, f); else drawB(ctx, f); return; }
    if (mode === 7 || mode === 8) { if (mode === 8) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 2206, 946); } drawKeyboard(ctx, f); return; }
    if (mode === 3 || mode === 5) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 2206, 946); }
    if (mode === 4 || mode === 5) { const P = platesB(); ctx.drawImage(P.kb, -260, 0); return; }
    if (mode === 6) { const P = platesB(); ctx.drawImage(P.bg, 0, 0); return; }
    if (mode === 1) {
      if (f < 1382) { ctx.drawImage(roomACanvas(), 0, 0); return; }
      // plate for B: full draw minus owl is not separable here; draw the still or bg + keyboard via drawB with no owl
      const P = platesB(); if (f <= 1417) ctx.drawImage(P.still, 0, 0); else { ctx.drawImage(P.bg, 0, 0); drawKeyboard(ctx, f); } return;
    }
    if (f < 1382) drawOwlA(ctx, f); else drawOwlB(ctx, f);
  },
};
