// desk ref px <-> frame px at film time t (replicates s27.js deskH/baseCorners); usage: node deskmap.mjs t x,y x,y ... [--inv]
import { hmul, hinv, happly, hquad } from "../../src/shots/s27/drawn/gl.js";
import { SCREEN, BASE_END } from "../../src/shots/s27/drawn/tracks.js";
import * as LT from "../../src/shots/s27/drawn/laptop.js";
import { BASE_FL, BASE_FR, BASE_BACK_PAGE } from "../../src/shots/s27/drawn/keys.js";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const I3 = [1,0,0,0,1,0,0,0,1], HOLD_END = 119.72;
function rowH(r) { return [r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], 1]; }
function trackAt(T, t) { const n=T.length; if (t<=T[0][0]) return rowH(T[0]); if (t>=T[n-1][0]) return rowH(T[n-1]);
  let i=0; while (i<n-2 && T[i+1][0]<t) i++; const a=T[i], b=T[i+1], u=clamp01((t-a[0])/(b[0]-a[0])); const o=[]; for (let k=0;k<8;k++) o.push(a[k+1]+(b[k+1]-a[k+1])*u); o.push(1); return o; }
function keyAt(K, t) { const n=K.length; if (t<=K[0][0]) return K[0].slice(1); if (t>=K[n-1][0]) return K[n-1].slice(1);
  let i=1; while (i<n-1 && K[i][0]<t) i++; const p1=K[i-1], p2=K[i], p0=K[Math.max(0,i-2)], p3=K[Math.min(n-1,i+1)];
  const d1=p2[0]-p1[0], d0=(p1[0]-p0[0])||d1, d2=(p3[0]-p2[0])||d1, u=(t-p1[0])/d1;
  const h00=2*u*u*u-3*u*u+1, h10=u*u*u-2*u*u+u, h01=-2*u*u*u+3*u*u, h11=u*u*u-u*u;
  return p1.slice(1).map((v,k0)=>{ const k=k0+1; const m1=(p0===p1?(p2[k]-p1[k])/d1:((p2[k]-p1[k])/d1+(p1[k]-p0[k])/d0)*0.5)*d1; const m2=(p3===p2?(p2[k]-p1[k])/d1:((p3[k]-p2[k])/d2+(p2[k]-p1[k])/d1)*0.5)*d1; return h00*v+h10*m1+h01*p2[k]+h11*m2; }); }
function linAt(K,t){const n=K.length; if(t<=K[0][0])return K[0].slice(1); if(t>=K[n-1][0])return K[n-1].slice(1); let i=1; while(i<n-1&&K[i][0]<t)i++; const a=K[i-1],b=K[i],u=(t-a[0])/(b[0]-a[0]); return a.slice(1).map((v,k)=>v+(b[k+1]-v)*u);}
let SH=null; function screenHold(){ if(!SH){ const rows=SCREEN.filter(r=>r[0]>=117.96&&r[0]<=119.64); SH=[1,2,3,4,5,6,7,8].map(k=>{const v=rows.map(r=>r[k]).sort((a,b)=>a-b); return v[v.length>>1];}); SH.push(1);} return SH; }
const screenH=(t)=>t<HOLD_END?screenHold():trackAt(SCREEN,t);
const BTEX=[[0,0],[LT.BASE_TW,0],[LT.BASE_TW,LT.BASE_TD],[0,LT.BASE_TD]];
function bcm(t){const S=screenH(t); return [happly(S,BASE_BACK_PAGE[0][0],BASE_BACK_PAGE[0][1]),happly(S,BASE_BACK_PAGE[1][0],BASE_BACK_PAGE[1][1]),keyAt(BASE_FR,t),keyAt(BASE_FL,t)];}
function baseCorners(t){ if(t<HOLD_END) return LT.BASE_CORNERS_REF; if(t<=127.6) return bcm(t); const B=bcm(127.6), D=trackAt(BASE_END,t); return B.map(([x,y])=>happly(D,x,y)); }
const baseRefInv=hinv(hquad(BTEX,LT.BASE_CORNERS_REF));
const DESK_FRONT=[[119.72,871],[120.0,872],[120.25,874],[120.5,876],[120.75,878],[121.0,881],[121.5,893],[121.75,900],[122.0,904],[122.25,907],[122.5,909],[123.0,912],[123.6,1010],[129.4,1010]];
export function deskH(t){ if(t<HOLD_END) return I3; const Q=baseCorners(t); const Hb=hmul(hquad(BTEX,Q),baseRefInv); const yF=linAt(DESK_FRONT,t)[0], R=LT.BASE_CORNERS_REF;
  const wAt=(x,y)=>Hb[6]*x+Hb[7]*y+Hb[8]; const L=happly(Hb,0,872), Rr=happly(Hb,2206,872);
  const xr=wAt(2206,872)>0.05?Math.min(Math.max(Rr[0],Q[2][0]+400),Q[2][0]+2400):Q[2][0]+1200;
  const xl=wAt(0,872)>0.05?Math.max(Math.min(L[0],Q[3][0]-400),Q[3][0]-2400):Q[3][0]-1200;
  const Hp=hquad([R[3],R[2],[2206,872],[0,872]],[Q[3],Q[2],[xr,yF],[xl,yF]]);
  const u=clamp01((t-123.0)/0.6); if(u<=0) return Hp; if(u>=1) return Hb;
  const A=[[700,700],[1500,700],[1500,850],[700,850]]; return hquad(A,A.map(([x,y])=>{const a=happly(Hp,x,y),b=happly(Hb,x,y); return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];})); }
if (process.argv[2]) {
  const t=+process.argv[2], inv=process.argv.includes('--inv'); const H=inv?hinv(deskH(t)):deskH(t);
  console.log(process.argv.slice(3).filter(a=>a!=='--inv').map(p=>{const [x,y]=p.split(',').map(Number); const q=happly(H,x,y); return `[${q[0].toFixed(0)}, ${q[1].toFixed(0)}]`;}).join(', '));
}
