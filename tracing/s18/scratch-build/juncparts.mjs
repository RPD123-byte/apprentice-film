import { OWL_B } from "/Users/computer/rootline/apprentice-film/src/shots/s18/data/owlB.js";
import { decodeInk, ringsBBox } from "/Users/computer/rootline/apprentice-film/src/shots/s18/inkdraw.js";
import fs from "fs";
const txt=fs.readFileSync("/Users/computer/rootline/apprentice-film/src/shots/s18/shotB.js","utf8");
const TR={}; for (const m of txt.split("export const TRACK_B")[1].split("];")[0].matchAll(/\[(\d{4}), (-?\d+), (-?\d+)\]/g)) TR[+m[1]]=[+m[2],+m[3]];
const sbb=(s)=>[Math.min(...s.x),Math.min(...s.y),Math.max(...s.x),Math.max(...s.y)];
for (const k of Object.keys(OWL_B.parts)) {
  const D=decodeInk(OWL_B.parts[k]); const A=OWL_B.tailA[k]; const dx=TR[k][0];
  if(!A) continue;
  const be=1538+dx; const te=(y)=>A[0][0]*1540+A[0][1]*y+A[0][2];
  const junc=(bb)=>{ if(bb[3]>300) return false; const ym=(bb[1]+bb[3])/2; const lo=Math.min(be,te(ym))-12, hi=Math.max(be,te(ym))+12; return bb[0]>=lo && bb[2]<=hi; };
  const out=[];
  for (const L of ["base","m","s"]) D[L].forEach((M,i)=>{const bb=ringsBBox(M.rings); if(junc(bb)) out.push(L+i+":"+bb.map(v=>v.toFixed(0)).join(","));});
  for (const L of ["d","b"]) D[L].forEach((s,i)=>{const bb=sbb(s); if(junc(bb)) out.push(L+i+":"+bb.map(v=>v.toFixed(0)).join(","));});
  console.log(k, "belly", be, "tail@0", te(0).toFixed(0), out.join(" "));
}
