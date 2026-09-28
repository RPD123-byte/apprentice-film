import { OWL_A } from "/Users/computer/rootline/apprentice-film/src/shots/s18/data/owlA.js";
import { decodeInk, ringsBBox } from "/Users/computer/rootline/apprentice-film/src/shots/s18/inkdraw.js";
const area=(r)=>{let a=0;for(let i=0,n=r.length;i<n;i+=2){const j=(i+2)%n;a+=r[i]*r[j+1]-r[j]*r[i+1];}return Math.abs(a/2);};
const fv=(f)=>typeof f==="number"?f/255:(f[0]==="r"?(typeof f[3]==="number"?f[3]/255:f[3][1]):f[1]);
console.log(Object.keys(OWL_A), Object.keys(OWL_A.phase), Object.keys(OWL_A.feet).join(","));
for (const k of [process.argv[2]||"1356"]) {
  const D=decodeInk(OWL_A.feet[k]);
  for (const L of ["base","m","s"]) for (const M of D[L]) { const bb=ringsBBox(M.rings); console.log(L, "area", area(M.rings[0]).toFixed(0), "holes", M.rings.length-1, "bb", bb.map(v=>v.toFixed(0)).join(" "), "f", JSON.stringify(M.f).slice(0,80)); }
  console.log("d", D.d.length, D.d.map(s=>s.tone+":"+s.x.length+":"+Math.max(...s.w).toFixed(1)).join(" "));
  console.log("b", D.b.length, D.b.map(s=>s.tone+":"+s.x.length).join(" "));
}
