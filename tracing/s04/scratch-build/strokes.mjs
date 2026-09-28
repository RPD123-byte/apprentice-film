import { decodeStrokes } from "/Users/computer/rootline/apprentice-film/src/shots/s04/tkey.js";
import { K2056 } from "/Users/computer/rootline/apprentice-film/src/shots/s04/tk/k2056.js";
const regions = { hoodL: [100, 480, 600, 800], hoodR: [1400, 560, 2000, 800], eyes: [700, 280, 1350, 400], face: [850, 400, 1300, 650], beanie: [550, 20, 1450, 280] };
const st = decodeStrokes(K2056.dark);
console.log("dark strokes", st.length, "bright", decodeStrokes(K2056.bright).length);
for (const [n, [x0, y0, x1, y1]] of Object.entries(regions)) {
  const sel = st.filter((s) => { const p = s.pts[Math.floor(s.pts.length / 2)]; return p[0] >= x0 && p[0] < x1 && p[1] >= y0 && p[1] < y1; });
  const L = sel.map((s) => { let l = 0; for (let i = 1; i < s.pts.length; i++) l += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]); return l; });
  const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(p * (b.length - 1))]?.toFixed(1); };
  const wm = sel.map((s) => s.w.reduce((a, b) => a + b, 0) / s.w.length), v = sel.map((s) => s.v);
  console.log(n, sel.length, "len q25/50/90", q(L, .25), q(L, .5), q(L, .9), "w", q(wm, .25), q(wm, .5), q(wm, .9), "v", q(v, .1), q(v, .5), q(v, .9));
}
