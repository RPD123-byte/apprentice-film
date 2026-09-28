// which faces cover screen point (x,y) at time t: node pick.mjs SETKEY t x y
import { SETS } from "/Users/computer/rootline/apprentice-film/src/shots/s15/sets.js";
import { viewOf } from "/Users/computer/rootline/apprentice-film/src/shots/s15/author.js";
const [key, t, x, y] = [process.argv[2], ...process.argv.slice(3).map(Number)];
const set = SETS.find((s) => s.key === key), faces = set.faces(), v = viewOf(set.cam(t));
const inside = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; } return c; };
const hits = [];
faces.forEach((f, i) => { const P = f.q.map((p) => v.project(p)); if (P.some((p) => p[2] < 0.02)) return; if (inside(P, x, y)) hits.push([P.reduce((a, p) => a + p[2], 0) / 4, i, f]); });
hits.sort((a, b) => a[0] - b[0]);
for (const [d, i, f] of hits.slice(0, 6)) console.log(d.toFixed(2), i, "n", f.n.map((a) => a.toFixed(2)).join(","), "alb", f.alb.toFixed(2), "q0", f.q[0].map((a) => a.toFixed(2)).join(","), "su", f.su.toFixed(2), "sv", f.sv.toFixed(2), f.src || "");
