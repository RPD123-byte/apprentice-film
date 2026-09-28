import { screenAt } from "/src/shots/s07/screen.js";
import { purePageCanvas, PAGE_W, PAGE_H } from "/src/lib/pureimg.js";
const q = new URLSearchParams(location.search);
export const shot = { draw(ctx, local, t) {
  if (q.get("page") === "1") { const c = purePageCanvas(PAGE_W, PAGE_H, { ticketText: "", ticketCaret: false }); ctx.drawImage(c, 0, 0, 1600, 1000, 0, 0, 1600, 946 * 1600 / 1600); return; }
  const s = screenAt(t); ctx.drawImage(s.canvas, s.x, s.y);
} };
