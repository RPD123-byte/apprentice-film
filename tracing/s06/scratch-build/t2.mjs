globalThis.document={createElement(){return {getContext(){return null}}}};
const polys=[];
const g={ beginPath(){this.p=[]}, moveTo(x,y){this.p.push([x,y])}, lineTo(x,y){this.p.push([x,y])}, closePath(){}, fill(){polys.push([this.fs,this.p])}, set fillStyle(v){this.fs=v}, get fillStyle(){return this.fs}, save(){}, restore(){}, clip(){}, rect(){}, ellipse(){}, arc(){}, bezierCurveTo(x1,y1,x2,y2,x,y){this.p.push([x,y])}, fillRect(){}, stroke(){}, set globalAlpha(v){}, set lineWidth(v){}, set strokeStyle(v){} };
const { drawHair } = await import("/Users/computer/rootline/apprentice-film/src/shots/s06/hair.js");
drawHair(g);
console.log(polys.length);
// find polys near (838,200)
let c=0;
for (const [fs,p] of polys){ const xs=p.map(q=>q[0]), ys=p.map(q=>q[1]); if (Math.min(...xs)<840 && Math.max(...xs)>836 && Math.min(...ys)<200 && Math.max(...ys)>200) { c++; if(c<12) console.log(fs, Math.round(Math.min(...xs)),Math.round(Math.max(...xs)),Math.round(Math.min(...ys)),Math.round(Math.max(...ys)), p.length);} }
