import { SCREEN } from "/Users/computer/rootline/apprentice-film/src/shots/s27/data.js";
const ap = (H, x, y) => { const w = H[6]*x + H[7]*y + H[8]; return [(H[0]*x + H[1]*y + H[2]) / w, (H[3]*x + H[4]*y + H[5]) / w]; };
const rows = SCREEN.filter(r => r[0] >= 118 && r[0] <= 119.8);
const pts = rows.map(r => { const H = r.slice(1); return [ap(H, 0, 0), ap(H, 2206, 0), ap(H, 2206, 946), ap(H, 0, 946)]; });
for (let k = 0; k < 4; k++) {
  const xs = pts.map(p => p[k][0]), ys = pts.map(p => p[k][1]);
  const d = []; for (let i = 1; i < xs.length; i++) d.push(Math.hypot(xs[i]-xs[i-1], ys[i]-ys[i-1]));
  console.log('corner', k, 'x range', Math.min(...xs).toFixed(1), Math.max(...xs).toFixed(1), 'y range', Math.min(...ys).toFixed(1), Math.max(...ys).toFixed(1), 'max frame step', Math.max(...d).toFixed(2), 'mean step', (d.reduce((a,b)=>a+b,0)/d.length).toFixed(2));
}
