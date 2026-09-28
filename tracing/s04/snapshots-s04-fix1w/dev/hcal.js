// dev only: hatch calibration on uniform grey bands (raw paint)
import { hatcher } from "../../../src/shots/s04/hatch.js";
const q = new URLSearchParams(location.search);
const KO = JSON.parse(q.get("kopt") || "{}");
export const shot = { draw(ctx) {
  const W = 2206, H = 946, M = 0;
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  const vals = [80, 100, 120, 140, 160, 180, 200, 215];
  vals.forEach((v, i) => { g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, (i * H) / vals.length, W, H / vals.length + 1); });
  const nx = Math.floor(W / 24) + 2, ny = Math.floor(H / 24) + 2, data = new Uint8Array(nx * ny * 4);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i, th = (KO.th ?? 0.3) + 0.4 * Math.sin(i * 0.3) * (KO.var ?? 1);
    data[4 * k] = Math.round((Math.cos(2 * th) * 0.5 + 0.5) * 255); data[4 * k + 1] = Math.round((Math.sin(2 * th) * 0.5 + 0.5) * 255); data[4 * k + 2] = 255; data[4 * k + 3] = 0; }
  const h = hatcher().run(c, { nx, ny, step: 24, data }, M, { lo0: 0, lo1: 1, hi0: 254, hi1: 255, alphaK: 1, ...(KO.h || {}) });
  ctx.drawImage(c, 0, 0); ctx.drawImage(h, 0, 0);
} };
