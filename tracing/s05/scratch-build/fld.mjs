import { KS, FIELDS } from "/Users/computer/rootline/apprentice-film/src/shots/s05/data/settle.js";
import { decode } from "/Users/computer/rootline/apprentice-film/src/shots/s05/ink.js";
const LH_SET = [[23.12, -68.0, 84.0, 1.095, -2.8], [23.16, -55.3, 68.3, 1.080, -2.18], [23.20, -45.6, 55.2, 1.067, -1.59], [23.24, -36.7, 43.3, 1.047, -1.21], [23.28, -29.5, 33.8, 1.037, -0.91], [23.32, -20.8, 23.3, 1.024, -0.55], [23.36, -13.8, 15.4, 1.016, -0.38], [23.40, -8.6, 9.8, 1.009, -0.19], [23.44, -5.0, 6.2, 1.005, -0.13], [23.48, -2.0, 2.4, 1.0, -0.16], [23.52, -0.4, 0.5, 1.0, 0], [23.56, 0, 0, 1, 0]];
console.log(KS, Object.keys(FIELDS));
for (const name of ["desk"]) {
  const F = FIELDS[name];
  KS.forEach((k, i) => {
    const a = decode(F.d[i]); const { x0, y0, G, nx, ny } = F;
    const at = (x, y) => { const fx = Math.min(nx - 1.0001, Math.max(0, (x - x0) / G)), fy = Math.min(ny - 1.0001, Math.max(0, (y - y0) / G)); const i0 = Math.floor(fx), j0 = Math.floor(fy), u = fx - i0, v = fy - j0; const n = (i, j, c) => a[(j * nx + i) * 2 + c] / 10; const l = (c) => (n(i0, j0, c) * (1 - u) + n(i0 + 1, j0, c) * u) * (1 - v) + (n(i0, j0 + 1, c) * (1 - u) + n(i0 + 1, j0 + 1, c) * u) * v; return [l(0).toFixed(1), l(1).toFixed(1)]; };
    const lh = LH_SET.find((r) => Math.round(r[0] * 25) === k);
    // lh displacement of point p under similarity about C_L
    const C = [740, 755], p = [650, 740];
    let d = null;
    if (lh) { const [dx, dy, s, rot] = lh.slice(1), r = rot * Math.PI / 180; const qx = p[0] - C[0], qy = p[1] - C[1]; d = [(C[0] + dx + s * (qx * Math.cos(r) - qy * Math.sin(r)) - p[0]).toFixed(1), (C[1] + dy + s * (qx * Math.sin(r) + qy * Math.cos(r)) - p[1]).toFixed(1)]; }
    console.log(k, name, "desk@650,740", at(650, 740), "lh@650,740", d, "desk@740,755", at(740, 755));
  });
}
