// s28 fix1: reduce the measured region outlines to coarse outlines (<= 40 vertices, outer ring only).
import fs from "fs";
const D = "/Users/computer/rootline/apprentice-film/src/shots/s28/drawn/";
const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
function dp(pts, eps, closed) {
  const keep = new Array(pts.length).fill(false);
  const seg = (a, b) => {
    let m = -1, mi = -1; const [x1, y1] = pts[a], [x2, y2] = pts[b]; const L = Math.hypot(x2 - x1, y2 - y1) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((x2 - x1) * (y1 - pts[i][1]) - (x1 - pts[i][0]) * (y2 - y1)) / L; if (d > m) { m = d; mi = i; } }
    if (m > eps) { keep[mi] = true; seg(a, mi); seg(mi, b); }
  };
  if (closed) { // split at the farthest point from p0
    let f = 0, fd = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; f = i; } }
    keep[0] = keep[f] = true; const P = [...pts, pts[0]]; pts = P; keep.push(true);
    seg(0, f); seg(f, P.length - 1); keep.pop(); pts = pts.slice(0, -1);
  } else { keep[0] = keep[pts.length - 1] = true; seg(0, pts.length - 1); }
  return pts.filter((_, i) => keep[i]);
}
function coarse(v, closed, max = 40) {
  const rings = v.length && typeof v[0][0] === "number" ? [v] : v;
  const R = rings.reduce((b, r) => (area(r) > area(b) ? r : b), rings[0]);
  if (R.length <= max) return R.map(([x, y]) => [Math.round(x), Math.round(y)]);
  let eps = 0.5, out = R;
  while (out.length > max) { out = dp(R, eps, closed); eps *= 1.25; }
  return out.map(([x, y]) => [Math.round(x), Math.round(y)]);
}
const lines = new Set(["eyeL", "eyeR", "mouth", "nose", "hoodtop"]);
const K = (await import(D + "keysData.js")).KEYS, L = (await import(D + "figLdata.js")).FIGL;
const outK = {}, outL = {}, rep = [];
for (const k in K) { outK[k] = {}; for (const n in K[k]) { const v = K[k][n]; if (typeof v === "number") { outK[k][n] = v; continue; } outK[k][n] = lines.has(n) ? v.map(([x, y]) => [Math.round(x), Math.round(y)]) : coarse(v, true); rep.push(`${k}.${n} -> ${outK[k][n].length}`); } }
for (const n in L) { const v = L[n]; outL[n] = n === "hoodtop" ? v.map(([x, y]) => [Math.round(x), Math.round(y)]) : coarse(v, true); rep.push(`L.${n} -> ${outL[n].length}`); }
const J = (o) => JSON.stringify(o);
let s = `// s28 orbit key drawings: coarse measured outlines (frame px of each key's own source frame), at most 40 vertices each.
// sil: the silhouette; skinF: the face's outer boundary; skinA: the forearm; dark: the hair / T-shirt mass; beanie;
// eyes/mouth/nose: short measured lines. Outlines only -- every fill, strand, fold, shade and hatch is drawn in figK.js.
// (fix pass 1: the earlier dense colour-class outlines, which kept the gaps between hair strands, were reduced to these
// coarse outer outlines; the inner hair structure is now drawn by hand.)
export const KEYS = {\n`;
for (const k in outK) { s += `  ${k}: {\n`; for (const n in outK[k]) s += `    ${n}: ${J(outK[k][n])},\n`; s += `  },\n`; }
s += `};\n`;
fs.writeFileSync(D + "keysData.js", s);
let t = `// s28 locked view: coarse measured outlines of the designer's main regions (frame px at 131.60), at most 40 vertices
// each (the outer boundary only). Fills, strands, shading and all inner detail are drawn in figL.js.
// (fix pass 1: the earlier dense colour-class outlines -- hair with the gaps between its strands -- were reduced to these.)
export const FIGL = {\n`;
for (const n in outL) t += `  ${n}: ${J(outL[n])},\n`;
t += `};\n`;
fs.writeFileSync(D + "figLdata.js", t);
console.log(rep.join("\n"));
