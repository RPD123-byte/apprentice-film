import { readInts, decodeLines } from "/Users/computer/rootline/apprentice-film/src/shots/s24/vec.js";
import { SC_F, LINES_F } from "/Users/computer/rootline/apprentice-film/src/shots/s24/dataF.js";
function bbox(data){ const out=[]; for(const [v,enc] of data.L){ let bb=[1e9,1e9,-1e9,-1e9], n=0; for(const s of enc.split(" ")){ if(!s) continue; const a=readInts(s); let x=a[0],y=a[1]; n++; const up=()=>{bb[0]=Math.min(bb[0],x/data.q);bb[1]=Math.min(bb[1],y/data.q);bb[2]=Math.max(bb[2],x/data.q);bb[3]=Math.max(bb[3],y/data.q);}; up(); for(let i=2;i+1<a.length;i+=2){x+=a[i];y+=a[i+1];up();} } out.push([v,n,bb.map(Math.round)]); } return out; }
for (const k of [23,24,25,30]) { const e=SC_F[k]; for (const g of ["A","B"]) { const r=e[g]; if(!r) continue; if(Array.isArray(r)) { console.log(k,g,"ref",r); continue;} console.log(k,g,JSON.stringify(bbox(r))); } }
const L=decodeLines(LINES_F[23]); const wide=L.filter(b=>b.w>12); console.log("k23 bars",L.length,"wide>12",wide.length, wide.slice(0,10).map(b=>[b.x0,b.y0,b.dx,b.dy,b.w].map(Math.round)));
const inM=L.filter(b=>b.y0<70||b.x0<140); console.log("k23 bars starting in margins",inM.length);
