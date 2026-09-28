// Fit the kit's sit3q preset to the measured s12 hero geometry (frame px at HERO_PLACE).
import * as K from "/Users/computer/rootline/apprentice-film/src/lib/owlInk.js";
import { GEO } from "/Users/computer/rootline/apprentice-film/src/shots/s12/geo.js";
const HP = K.HERO_PLACE;
const toF = ([x, y]) => [HP.x + HP.s * x, HP.y + HP.s * y];
const toU = ([x, y]) => [(x - HP.x) / HP.s, (y - HP.y) / HP.s];
function inPoly(p, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function bb(ps) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of ps.flat()) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return [x0, y0, x1, y1]; }
export function iou(A, B, step = 3) { // A, B: arrays of polygons (union)
  const [x0, y0, x1, y1] = bb([...A, ...B]); let i = 0, u = 0;
  for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) { const p = [x, y]; const a = A.some((P) => inPoly(p, P)), b = B.some((P) => inPoly(p, P)); if (a && b) i++; if (a || b) u++; }
  return u ? i / u : 0;
}
export function nm(f, x0, scale, iters = 300) { // Nelder-Mead
  const n = x0.length; let S = [x0.slice()]; for (let i = 0; i < n; i++) { const x = x0.slice(); x[i] += scale[i]; S.push(x); }
  let F = S.map(f);
  for (let it = 0; it < iters; it++) {
    const idx = F.map((v, i) => i).sort((a, b) => F[a] - F[b]); S = idx.map((i) => S[i]); F = idx.map((i) => F[i]);
    const c = Array(n).fill(0); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) c[j] += S[i][j] / n;
    const xr = c.map((v, j) => v + (v - S[n][j])), fr = f(xr);
    if (fr < F[0]) { const xe = c.map((v, j) => v + 2 * (v - S[n][j])), fe = f(xe); if (fe < fr) { S[n] = xe; F[n] = fe; } else { S[n] = xr; F[n] = fr; } }
    else if (fr < F[n - 1]) { S[n] = xr; F[n] = fr; }
    else { const xc = c.map((v, j) => v + 0.5 * (S[n][j] - v)), fc = f(xc); if (fc < F[n]) { S[n] = xc; F[n] = fc; } else { for (let i = 1; i <= n; i++) { S[i] = S[i].map((v, j) => S[0][j] + 0.5 * (v - S[0][j])); F[i] = f(S[i]); } } }
  }
  const i = F.indexOf(Math.min(...F)); return { x: S[i], f: F[i] };
}
export { K, GEO, toF, toU, inPoly };
