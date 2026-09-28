import { shot } from "../../src/shots/s17.js";
const W = 2206, H = 946;
const paint = document.createElement("canvas"); paint.width = W; paint.height = H;
const g = paint.getContext("2d");
const out = [];
for (const t of window.LAB.times) {
  const a = performance.now();
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  g.save(); shot.draw(g, t - 47.84, t); g.restore();
  g.getImageData(0, 0, 1, 1);
  out.push(Math.round(performance.now() - a));
}
const pre = document.createElement("pre"); pre.id = "o"; pre.textContent = JSON.stringify(out); document.documentElement.appendChild(pre);
