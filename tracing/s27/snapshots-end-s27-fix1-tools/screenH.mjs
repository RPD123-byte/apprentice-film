import { SCREEN } from "/Users/computer/rootline/apprentice-film/src/shots/s27/data.js";
function seg(T, t) { let i = 1; while (i < T.length - 1 && T[i][0] < t) i++; return i; }
function crRows(T, t) { const n = T.length; if (t <= T[0][0]) return T[0].slice(1); if (t >= T[n - 1][0]) return T[n - 1].slice(1);
  const i = seg(T, t), p0 = T[Math.max(0, i - 2)], p1 = T[i - 1], p2 = T[i], p3 = T[Math.min(n - 1, i + 1)];
  const u = (t - p1[0]) / (p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
  return p1.slice(1).map((_, k0) => { const k = k0 + 1; return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3); }); }
const o = {}; for (const F of process.argv[2].split(",").map(Number)) o[F] = crRows(SCREEN, F / 25); console.log(JSON.stringify(o));