// print settle displacement of a layer at points for frames: node sf.mjs layer x,y x,y ...
import { KS, FIELDS } from "../../src/shots/s05/data/settle.js";
import { decode } from "../../src/shots/s05/ink.js";
const [name, ...pts] = process.argv.slice(2);
const F = FIELDS[name];
for (let i = 0; i < KS.length; i++) {
  const a = decode(F.d[i]);
  const f = (x, y) => {
    let fx = (x - F.x0) / F.G, fy = (y - F.y0) / F.G;
    fx = Math.max(0, Math.min(F.nx - 1.0001, fx)); fy = Math.max(0, Math.min(F.ny - 1.0001, fy));
    const i0 = Math.floor(fx), j0 = Math.floor(fy), u = fx - i0, v = fy - j0;
    const n = (i, j, c) => a[(j * F.nx + i) * 2 + c] / 10;
    const l = (c) => (n(i0, j0, c) * (1 - u) + n(i0 + 1, j0, c) * u) * (1 - v) + (n(i0, j0 + 1, c) * (1 - u) + n(i0 + 1, j0 + 1, c) * u) * v;
    return [l(0).toFixed(1), l(1).toFixed(1)];
  };
  console.log(KS[i], pts.map((p) => { const [x, y] = p.split(",").map(Number); return p + ":" + f(x, y).join(","); }).join("  "));
}
