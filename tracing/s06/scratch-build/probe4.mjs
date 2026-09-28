import { decodeR3 } from '/Users/computer/rootline/apprentice-film/src/shots/s06/face3.js';
import fs from 'fs';
const names=fs.readdirSync('/Users/computer/rootline/apprentice-film/src/shots/s06/data').filter(f=>f.startsWith('r3_')&&f!=='r3_comb.js').map(f=>f.slice(0,-3));
for (const nm of names){
  const {L}=await import(`/Users/computer/rootline/apprentice-film/src/shots/s06/data/${nm}.js`);
  if(!L) continue; decodeR3(L);
  const H={},V={};
  for (const key of ['ground','solids']) for (const [v,...rings] of (L[key]||[])) for (const r of rings){
    for(let i=0;i<r.length;i+=2){const j=(i+2)%r.length; const x0=r[i],y0=r[i+1],x1=r[j],y1=r[j+1];
      if(y1===y0 && Math.abs(x1-x0)>=8){const k=Math.round(y0); H[k]=(H[k]||0)+Math.abs(x1-x0);}
      if(x1===x0 && Math.abs(y1-y0)>=8){const k=Math.round(x0); V[k]=(V[k]||0)+Math.abs(y1-y0);} }
  }
  const th=Object.entries(H).filter(e=>e[1]>=80).sort((a,b)=>b[1]-a[1]).slice(0,6), tv=Object.entries(V).filter(e=>e[1]>=80).sort((a,b)=>b[1]-a[1]).slice(0,6);
  console.log(nm.padEnd(22),'box',JSON.stringify(L.box),'H rows',JSON.stringify(th),'V cols',JSON.stringify(tv));
}
