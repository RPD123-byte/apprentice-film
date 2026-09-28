import { hmul, hinv, happly } from "/Users/computer/rootline/apprentice-film/src/shots/s27/gl.js";
import { BG, BG_END } from "/Users/computer/rootline/apprentice-film/src/shots/s27/data.js";
import { BASE_ALL, NOTEBOOK_K } from "/Users/computer/rootline/apprentice-film/src/shots/s27/data2.js";
function lerpRows(T, t) { if (t <= T[0][0]) return T[0].slice(1); if (t >= T[T.length-1][0]) return T[T.length-1].slice(1);
  let i = 1; while (i < T.length-1 && T[i][0] < t) i++; const a=T[i-1], b=T[i], u=(t-a[0])/(b[0]-a[0]); return a.slice(1).map((v,k)=>v+(b[k+1]-v)*u); }
function wallH(t){ if (t<=126.6) return lerpRows(BG, Math.max(119.6,t)); const H0=lerpRows(BG,126.6); if (t<=127.6) return H0; const a=lerpRows(BG_END,t); return hmul([a[0],a[1],a[2],a[3],a[4],a[5],0,0,1],H0); }
const R = (tr) => { const Hr = hinv(wallH(tr)); const b0 = lerpRows(BASE_ALL, tr), n0 = lerpRows(NOTEBOOK_K, tr);
for (const t of [122.4,123.0,123.5,124.0,124.6,125.4,126.2,127.0,127.6,128.0,128.4,128.8,129.2]) {
  const M = hmul(wallH(t), Hr); const b = lerpRows(BASE_ALL, t), n = lerpRows(NOTEBOOK_K, t);
  const d = []; for (let k = 0; k < 8; k += 2) { const p = happly(M, b0[k], b0[k+1]); d.push(Math.round(p[0]-b[k]) + "," + Math.round(p[1]-b[k+1])); }
  const e = []; for (let k = 0; k < 8; k += 2) { const p = happly(M, n0[k], n0[k+1]); e.push(Math.round(p[0]-n[k]) + "," + Math.round(p[1]-n[k+1])); }
  console.log(tr, t, "base drift", d.join(" "), " notebook drift", e.join(" "));
} };
R(125.0); R(119.6);
