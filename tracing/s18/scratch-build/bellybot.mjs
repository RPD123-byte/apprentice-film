import { OWL_A } from "/Users/computer/rootline/apprentice-film/src/shots/s18/data/owlA.js";
import { decodeInk } from "/Users/computer/rootline/apprentice-film/src/shots/s18/inkdraw.js";
for (const ph of ["level","up","down"]) {
  const D = decodeInk(OWL_A.phase[ph]); const r = D.base[0].rings[0];
  // bottom profile: for each x bin, max y of edge crossings
  const out=[];
  for (let x=560;x<=1000;x+=20){ let ys=[]; for(let i=0,n=r.length;i<n;i+=2){const j=(i+2)%n; const x0=r[i],x1=r[j]; if((x0<=x&&x1>x)||(x1<=x&&x0>x)){const u=(x-x0)/(x1-x0); ys.push(r[i+1]+u*(r[j+1]-r[i+1]));}} ys.sort((a,b)=>a-b); out.push(x+":"+ys.map(v=>v.toFixed(0)).join("/")); }
  console.log(ph, out.join(" "));
}
