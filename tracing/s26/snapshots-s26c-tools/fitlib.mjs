// Scratch fitting helpers (node): rasterise rig silhouettes at half resolution and score them against the source owl
// masks (snapshots/s26b-meas/fit/m/F.bin, 1103x473, 0..255) — measurement only.
import fs from "fs";
export const MW = 1103, MH = 473, SC = 0.5;
export function loadMask(F) {
  const p = `/Users/computer/rootline/apprentice-film/snapshots/s26b-meas/fit/m/${F}.bin`;
  if (!fs.existsSync(p)) return null;
  const b = fs.readFileSync(p), m = new Uint8Array(MW * MH);
  for (let i = 0; i < m.length; i++) m[i] = b[i] >= 128 ? 1 : 0;
  return m;
}
// union of polygons (frame px) → half-res mask; nonzero winding per polygon
export function raster(polys, out = new Uint8Array(MW * MH)) {
  out.fill(0);
  for (const P of polys) {
    if (!P || P.length < 3) continue;
    let y0 = Infinity, y1 = -Infinity;
    const Q = P.map(([x, y]) => { const q = [x * SC, y * SC]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; return q; });
    const ya = Math.max(0, Math.ceil(y0 - 0.5)), yb = Math.min(MH - 1, Math.floor(y1 - 0.5));
    const n = Q.length;
    for (let y = ya; y <= yb; y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < n; i++) {
        const a = Q[i], b = Q[(i + 1) % n];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
          const x = a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]);
          xs.push([x, b[1] > a[1] ? 1 : -1]);
        }
      }
      xs.sort((p, q) => p[0] - q[0]);
      let w = 0;
      for (let k = 0; k < xs.length - 1; k++) {
        w += xs[k][1];
        if (w !== 0) {
          const xa = Math.max(0, Math.ceil(xs[k][0] - 0.5)), xb = Math.min(MW - 1, Math.floor(xs[k + 1][0] - 0.5));
          const row = y * MW;
          for (let x = xa; x <= xb; x++) out[row + x] = 1;
        }
      }
    }
  }
  return out;
}
export function iou(a, b) {
  let I = 0, U = 0;
  for (let i = 0; i < a.length; i++) { const p = a[i], q = b[i]; I += p & q; U += p | q; }
  return U ? I / U : 0;
}
export function writePGM(path, m) {
  const hdr = Buffer.from(`P5 ${MW} ${MH} 255\n`), body = Buffer.alloc(MW * MH);
  for (let i = 0; i < m.length; i++) body[i] = m[i] ? 255 : 0;
  fs.writeFileSync(path, Buffer.concat([hdr, body]));
}
