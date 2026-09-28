import { contentMap } from "../../../src/shots/s04/hatch.js";
import { HATCHFLOW } from "../../../src/shots/s04/hatchflow.js";
import { tkD1, tkD2 } from "../../../src/shots/s04/tkey.js";
const H = { d1: tkD1, d2: tkD2 };
const SPK = [[965, 222], [1172, 216], [1176, 562], [968, 568]];
const m7 = contentMap(577, HATCHFLOW, H), P = SPK.map(([x, y]) => m7(x, y));
for (const f of [557, 561, 563, 565, 569, 573, 575]) {
  const m = contentMap(f, HATCHFLOW, H); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let y = 0; y < 946; y += 4) for (let x = 0; x < 2206; x += 4) {
    const [cx, cy] = m(x, y); let q = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > cy) !== (yj > cy) && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi) q = !q; }
    if (q) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  console.log((f / 25).toFixed(2), "bbox", x0, y0, x1, y1);
}
