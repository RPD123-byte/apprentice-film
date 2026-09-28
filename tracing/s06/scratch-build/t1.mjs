import { vline } from "/Users/computer/rootline/apprentice-film/src/shots/s06/kit.js";
const polys=[];
const g={ beginPath(){this.p=[]}, moveTo(x,y){this.p.push([x,y])}, lineTo(x,y){this.p.push([x,y])}, closePath(){}, fill(){polys.push(this.p)}, set fillStyle(v){} };
vline(g, [[1028, 90], [1010, 190], [997, 260], [985, 310]], [76, 46, 42, 36], "#000", 8);
const P=polys[0]; const n=P.length/2;
for (let i=0;i<n;i+=4){ const a=P[i], b=P[P.length-1-i]; console.log(a.map(Math.round), b.map(Math.round), Math.hypot(a[0]-b[0],a[1]-b[1]).toFixed(1)); }
