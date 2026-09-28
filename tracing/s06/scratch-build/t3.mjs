import { bandStrokes } from "/Users/computer/rootline/apprentice-film/src/shots/s06/kit.js";
const polys=[];
const g={ beginPath(){this.p=[]}, moveTo(x,y){this.p.push([x,y])}, lineTo(x,y){this.p.push([x,y])}, closePath(){}, fill(){polys.push([this.fs,this.p])}, set fillStyle(v){this.fs=v} };
const rim=[[788, 354], [815, 362], [850, 367], [885, 366], [915, 360], [942, 349]];
const bag=[[792, 368], [818, 376], [852, 377], [890, 386], [916, 383], [944, 364]];
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
bandStrokes(g, rim.map(([x, y]) => [x, y + 2]), bag, { n: 9, w: (u, f) => 1.7 - 0.6 * f, alpha: (u, f) => (0.5 + 0.3 * sm(0.4, 0.85, u)) * (1 - 0.6 * f), seg: [0.12, 0.35], gap: 0.08, seed: 45 });
console.log(polys.length);
for (const [fs,p] of polys){ const xs=p.map(q=>q[0]), ys=p.map(q=>q[1]); console.log(fs, Math.round(Math.min(...xs)),Math.round(Math.max(...xs)),Math.round(Math.min(...ys)),Math.round(Math.max(...ys))); }
