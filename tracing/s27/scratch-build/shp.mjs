import { BASE_ALL } from "/Users/computer/rootline/apprentice-film/src/shots/s27/data2.js";
import { OWL_SHADOW } from "/Users/computer/rootline/apprentice-film/src/shots/s27/data3.js";
import { hquad, happly } from "/Users/computer/rootline/apprentice-film/src/shots/s27/gl.js";
function seg(T, t) { let i = 1; while (i < T.length - 1 && T[i][0] < t) i++; return i; }
function crRows(T, t) { const n = T.length; if (t <= T[0][0]) return T[0].slice(1); if (t >= T[n - 1][0]) return T[n - 1].slice(1);
  const i = seg(T, t), p0 = T[Math.max(0, i - 2)], p1 = T[i - 1], p2 = T[i], p3 = T[Math.min(n - 1, i + 1)];
  const u = (t - p1[0]) / (p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
  return p1.slice(1).map((_, k0) => { const k = k0 + 1; return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3); }); }
const t = 127.32, BW = 32.4, BD = 22.5, c = crRows(BASE_ALL, t);
const H = hquad([[-BW/2, BD], [BW/2, BD], [BW/2, 0], [-BW/2, 0]], [[c[0], c[1]], [c[2], c[3]], [c[4], c[5]], [c[6], c[7]]]);
const p = OWL_SHADOW.find(r => Math.abs(r[0] - t) < 0.01)[1]; const o = [];
for (let k = 0; k < p.length; k += 2) o.push(happly(H, p[k] / 20, p[k + 1] / 20).map(v => Math.round(v)));
console.log(JSON.stringify(o));
