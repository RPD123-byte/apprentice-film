// list lit, large faces per take: id, best frame (largest on-screen area), mean value
const W=2206,H=946;
const clip=(P)=>{ // area of quad clipped to the frame (Sutherland-Hodgman)
  let poly=P;
  const edges=[[p=>p[0]>=0,(a,b)=>{const t=(0-a[0])/(b[0]-a[0]);return[0,a[1]+t*(b[1]-a[1])]}],[p=>p[0]<=W,(a,b)=>{const t=(W-a[0])/(b[0]-a[0]);return[W,a[1]+t*(b[1]-a[1])]}],[p=>p[1]>=0,(a,b)=>{const t=(0-a[1])/(b[1]-a[1]);return[a[0]+t*(b[0]-a[0]),0]}],[p=>p[1]<=H,(a,b)=>{const t=(H-a[1])/(b[1]-a[1]);return[a[0]+t*(b[0]-a[0]),H]}]];
  for(const [inside,isect] of edges){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];const ia=inside(a),ib=inside(b);if(ia){out.push(a);if(!ib)out.push(isect(a,b));}else if(ib)out.push(isect(a,b));}poly=out;if(!poly.length)return 0;}
  let A=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];A+=a[0]*b[1]-b[0]*a[1];}return Math.abs(A)/2;};
const out={};
for (const T of process.argv.slice(2)) {
  const D=(await import(`../../src/shots/s15/roto${T}.js`))[`ROTO_${T}`];
  const best={};
  for (const [f,rows] of Object.entries(D.frames)) for (const r of rows) {
    const P=[[r[1],r[2]],[r[3],r[4]],[r[5],r[6]],[r[7],r[8]]]; const A=clip(P); const v=(r[9]+r[10]+r[11]+r[12])/4;
    const o=D.faces[r[0]]||{}; if (o.style) continue;
    if(!best[r[0]]||A>best[r[0]].A) best[r[0]]={A,f:+f,v,P,n:0};
  }
  for (const [f,rows] of Object.entries(D.frames)) for (const r of rows) if(best[r[0]]) best[r[0]].n++;
  out[T]=best;
  const L=Object.entries(best).filter(([id,b])=>b.v>0.35&&b.A>15000).sort((a,b)=>b[1].A-a[1].A);
  console.log(T, L.length, L.map(([id,b])=>`${id}@${b.f}(${Math.round(b.A/1000)}k,${b.v.toFixed(2)},n${b.n})`).join(' '));
}
import fs from 'fs'; fs.writeFileSync(new URL('./facebest.json', import.meta.url), JSON.stringify(out));
