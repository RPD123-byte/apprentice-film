import { pageAt, warpPage } from "/src/shots/s07/screen.js";
const q = new URLSearchParams(location.search), step = Number(q.get("step") || 9);
export const shot = { draw(ctx, local, t) {
  const page = pageAt(t);
  if (step === 1) { ctx.drawImage(page, 0, 0); return; }
  const c = document.createElement("canvas"); c.width = 620; c.height = 520; const g = c.getContext("2d");
  g.translate(-300, -150); warpPage(g, page);
  if (step === 2) { ctx.drawImage(c, 300, 150); return; }
  const d = document.createElement("canvas"); d.width = 620; d.height = 520; const h = d.getContext("2d");
  h.filter = "blur(0.6px)"; h.drawImage(c, 0, 0); h.filter = "none";
  ctx.drawImage(d, 300, 150);
} };
