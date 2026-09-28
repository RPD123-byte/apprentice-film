import { inkLayer, ORDER } from "./src/shots/s05/layers.js";
const NAMES = ["room", "desk", "lh", "rh", "rhB", "arm", "armB", "fig", "owl"];
export function drawInk(ctx, only = null) {
  ctx.fillStyle = only ? "#ff00ff" : "#000"; ctx.fillRect(0, 0, 2206, 946);
  for (const n of only ? [NAMES[only]] : ORDER) { const l = inkLayer(n); ctx.drawImage(l.c, l.x, l.y); }
}
