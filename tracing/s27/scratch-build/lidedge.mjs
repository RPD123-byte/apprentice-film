// print the lid quad's corners per frame 128.44-129.28 (same interpolation as s27.js lidCorners)
import { SCREEN } from "/Users/computer/rootline/apprentice-film/src/shots/s27/data.js";
import { LID_END } from "/Users/computer/rootline/apprentice-film/src/shots/s27/data2.js";
import { happly } from "/Users/computer/rootline/apprentice-film/src/shots/s27/gl.js";
import * as LT from "/Users/computer/rootline/apprentice-film/src/shots/s27/laptop.js";
function seg(T, t) { let i = 1; while (i < T.length - 1 && T[i][0] < t) i++; return i; }
function crRows(T, t) { const n = T.length; if (t <= T[0][0]) return T[0].slice(1); if (t >= T[n - 1][0]) return T[n - 1].slice(1);
  const i = seg(T, t), p0 = T[Math.max(0, i - 2)], p1 = T[i - 1], p2 = T[i], p3 = T[Math.min(n - 1, i + 1)];
  const u = (t - p1[0]) / (p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
  return p1.slice(1).map((_, k0) => { const k = k0 + 1; return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3); }); }
const R = [[LT.LID.x0, LT.LID.y0], [LT.LID.x1, LT.LID.y0], [LT.LID.x1, LT.LID.y1], [LT.LID.x0, LT.LID.y1]];
function lc(t) { if (t <= 128.44) { const H = crRows(SCREEN, t); return R.map(([x, y]) => happly(H, x, y)); }
  if (t >= 128.8) { const c = crRows(LID_END, t); return [[c[0], c[1]], [c[2], c[3]], [c[4], c[5]], [c[6], c[7]]]; }
  const a = lc(128.44), b = lc(128.8), u = (t - 128.44) / 0.36; return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * u, p[1] + (b[i][1] - p[1]) * u]); }
const out = {};
for (let k = 0; k <= 21; k++) { const t = +(128.44 + 0.04 * k).toFixed(2); out[t.toFixed(2)] = lc(t).map((p) => p.map((v) => +v.toFixed(1))); }
console.log(JSON.stringify(out));
