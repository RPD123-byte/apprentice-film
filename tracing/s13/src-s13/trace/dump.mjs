// node src/shots/s13/trace/dump.mjs > geo.json — flattens s13's silhouette paths into polygons (frame px) for the
// measurement scripts. Not loaded by the film.
import { GEO } from "../../s13.js";
function rec() {
  const rings = []; let cur = null, last = [0, 0];
  const push = (p) => { cur.push([+p[0].toFixed(1), +p[1].toFixed(1)]); last = p; };
  return {
    rings,
    moveTo(x, y) { cur = []; rings.push(cur); push([x, y]); },
    lineTo(x, y) { push([x, y]); },
    closePath() {},
    bezierCurveTo(a, b, c, d, x, y) { const p0 = last; for (let i = 1; i <= 12; i++) { const t = i / 12, u = 1 - t; push([u * u * u * p0[0] + 3 * u * u * t * a + 3 * u * t * t * c + t * t * t * x, u * u * u * p0[1] + 3 * u * u * t * b + 3 * u * t * t * d + t * t * t * y]); } },
    quadraticCurveTo(a, b, x, y) { const p0 = last; for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t; push([u * u * p0[0] + 2 * u * t * a + t * t * x, u * u * p0[1] + 2 * u * t * b + t * t * y]); } },
    ellipse(cx, cy, rx, ry, rot, a0, a1) { cur = []; rings.push(cur); const c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i <= 64; i++) { const a = a0 + ((a1 - a0) * i) / 64, x = Math.cos(a) * rx, y = Math.sin(a) * ry; push([cx + x * c - y * s, cy + x * s + y * c]); } },
    arc(cx, cy, r, a0, a1) { this.ellipse(cx, cy, r, r, 0, a0, a1); },
  };
}
const out = {};
for (const [k, fn] of Object.entries(GEO.paths)) { const r = rec(); fn(r); out[k] = r.rings; }
out.EYE_L = GEO.EYE_L; out.EYE_R = GEO.EYE_R; out.TOES = GEO.TOES; out.FRONT_D = GEO.FRONT_D;
console.log(JSON.stringify(out));
