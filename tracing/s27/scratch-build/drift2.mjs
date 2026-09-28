import { hmul, hinv, happly, hquad } from "/Users/computer/rootline/apprentice-film/src/shots/s27/gl.js";
import { BASE_ALL, NOTEBOOK_K, PENCIL_K, MUG_A, MUG_B } from "/Users/computer/rootline/apprentice-film/src/shots/s27/data2.js";
function lerpRows(T, t) { if (t <= T[0][0]) return T[0].slice(1); if (t >= T[T.length-1][0]) return T[T.length-1].slice(1);
  let i = 1; while (i < T.length-1 && T[i][0] < t) i++; const a=T[i-1], b=T[i], u=(t-a[0])/(b[0]-a[0]); return a.slice(1).map((v,k)=>v+(b[k+1]-v)*u); }
const BW=32.4, BD=22.5;
const baseH = (t) => { const c = lerpRows(BASE_ALL, Math.max(119.6,t)); return hquad([[-BW/2,BD],[BW/2,BD],[BW/2,0],[-BW/2,0]], [[c[0],c[1]],[c[2],c[3]],[c[4],c[5]],[c[6],c[7]]]); };
for (const tr of [119.6, 125.0]) {
  const Hi = hinv(baseH(tr)); const n0 = lerpRows(NOTEBOOK_K, tr);
  const q = []; for (let k=0;k<8;k+=2) q.push(happly(Hi, n0[k], n0[k+1]));
  console.log('ref', tr, 'notebook in base cm', q.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' '));
  for (const t of [119.6,120.4,121.2,122.0,122.4,123.0,123.5,124.0,124.6,125.0,126.0,127.0,127.6,128.0,128.4,128.8,129.2]) {
    const Hb = baseH(t), n = lerpRows(NOTEBOOK_K, t);
    const d = q.map((p,i)=>{ const r = happly(Hb, p[0], p[1]); return Math.round(r[0]-n[i*2])+','+Math.round(r[1]-n[i*2+1]); });
    console.log('  ', t, d.join(' '));
  }
}
