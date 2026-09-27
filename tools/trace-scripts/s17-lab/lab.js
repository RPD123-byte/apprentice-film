import { drawOwlS17 } from "../../src/shots/s17/owlDraw.js";
import { owlFrame as owlAt } from "../../src/shots/s17/owl.js";
const L = window.LAB;
const [x0, y0, x1, y1] = L.crop, z = L.z, cw = Math.round((x1 - x0) * z), ch = Math.round((y1 - y0) * z);
const cols = L.cols, rows = Math.ceil(L.times.length / cols);
const cv = document.getElementById("c"); cv.width = cw * cols; cv.height = ch * rows;
const ctx = cv.getContext("2d");
ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cv.width, cv.height);
L.times.forEach((t, i) => {
  const c = i % cols, r = Math.floor(i / cols);
  ctx.save();
  ctx.beginPath(); ctx.rect(c * cw, r * ch, cw, ch); ctx.clip();
  const p = owlAt(t);
  drawOwlS17(ctx, { ...p, x: c * cw + (p.x - x0) * z, y: r * ch + (p.y - y0) * z, s: p.s * z, tone: L.tone ?? true });
  ctx.restore();
});
document.title = "done";
